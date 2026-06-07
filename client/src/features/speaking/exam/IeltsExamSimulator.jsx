import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { getStorageKeyForModule } from "../../../services/progressService";

/**
 * IELTS Speaking Exam Simulator
 *
 * Full 3-part IELTS Speaking test simulation:
 *
 *   Part 1 — Introduction & Interview   (~4-5 min, 8-12 short questions)
 *   Part 2 — Cue Card                    (1 min prep + 2 min uninterrupted speaking)
 *   Part 3 — Discussion                  (~4-5 min, 5-7 abstract questions tied to Part 2)
 *
 * Key behaviour:
 *  - Examiner asks ONE question at a time. The browser's SpeechSynthesis
 *    API is used to "speak" each question with no API/latency cost — but
 *    the question is also displayed visually for accessibility / fallback.
 *  - The candidate records each answer with MediaRecorder. On stop, the
 *    audio is sent to the server (/api/speaking/exam/transcribe) which
 *    runs Whisper and returns just the transcript. Scoring is deferred
 *    until the entire exam is finished.
 *  - Part 2 has explicit 60s preparation + 120s speaking timers. The
 *    examiner does NOT interrupt; recording auto-stops at 120s.
 *  - After Part 3 the full session payload is POSTed to
 *    /api/speaking/exam/score for the final 4-criterion IELTS band +
 *    strengths / weaknesses / suggestions / common grammar mistakes /
 *    vocabulary improvements / pronunciation advice.
 *  - The completed exam is saved to BOTH localStorage history (so the
 *    Dashboard updates immediately) and Firestore (done server-side).
 *
 * Existing OpenAI Realtime / Socket.IO / WebRTC voice infrastructure is
 * NOT touched — this exam mode is a standalone flow using Whisper +
 * GPT-4o for evaluation.
 */

const API_BASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    "https://ielts-coach-backend.onrender.com";

const PART2_PREP_SECONDS = 60;
const PART2_SPEAK_SECONDS = 120;
const PART1_MAX_ANSWER_SECONDS = 90;   // soft cap per question
const PART3_MAX_ANSWER_SECONDS = 90;   // soft cap per question

const PHASE = {
    IDLE: "idle",
    SETUP: "setup",
    INTRO: "intro",
    PART1: "part1",
    PART2_BRIEF: "part2-brief",
    PART2_PREP: "part2-prep",
    PART2_SPEAK: "part2-speak",
    PART2_DONE: "part2-done",
    PART3: "part3",
    SCORING: "scoring",
    COMPLETED: "completed",
    ERROR: "error",
};

function getStorageKey(userId) {
    return getStorageKeyForModule("speaking", userId) || "ielts-speaking-history";
}

function appendHistoryEntry(entry, userId) {
    if (typeof window === "undefined") return;
    try {
        const key = getStorageKey(userId);
        const raw = window.localStorage.getItem(key);
        const existing = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(existing) ? existing : [];
        const updated = [entry, ...list].slice(0, 20);
        window.localStorage.setItem(key, JSON.stringify(updated));
        window.dispatchEvent(new Event("progressUpdated"));
    } catch (err) {
        console.warn("[exam] Failed to append history:", err.message);
    }
}

function formatMMSS(totalSeconds) {
    const s = Math.max(0, totalSeconds | 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

/**
 * Speak a string with the browser's SpeechSynthesis API.
 * Promise resolves when the utterance finishes or is cancelled.
 */
function speakAsExaminer(text) {
    return new Promise((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            resolve();
            return;
        }
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.95;
            u.pitch = 1.0;
            u.volume = 1.0;
            // Pick a clear English voice if available
            const voices = window.speechSynthesis.getVoices();
            const preferred =
                voices.find((v) => /en-GB|British/i.test(v.lang + v.name)) ||
                voices.find((v) => /en-US|US/i.test(v.lang + v.name)) ||
                voices.find((v) => v.lang?.startsWith("en"));
            if (preferred) u.voice = preferred;
            u.onend = () => resolve();
            u.onerror = () => resolve();
            window.speechSynthesis.speak(u);
        } catch {
            resolve();
        }
    });
}

function stopExaminerVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
        window.speechSynthesis.cancel();
    } catch {}
}

export function IeltsExamSimulator({ onExit }) {
    const { user } = useAuth();

    // Exam structure
    const [exam, setExam] = useState(null); // { sessionId, topic, part1, part2, part3 }
    const [phase, setPhase] = useState(PHASE.IDLE);
    const [errorMessage, setErrorMessage] = useState(null);

    // Cursors
    const [part1Index, setPart1Index] = useState(0);
    const [part3Index, setPart3Index] = useState(0);

    // Per-part transcripts
    const [part1Answers, setPart1Answers] = useState([]); // [{ question, transcript, durationSec }]
    const [part2Answer, setPart2Answer] = useState(null); // { transcript, durationSec }
    const [part3Answers, setPart3Answers] = useState([]);
    const [part2Notes, setPart2Notes] = useState(""); // student's prep notes (local only)

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [micError, setMicError] = useState(null);
    const [examinerSpeaking, setExaminerSpeaking] = useState(false);

    // Timers
    const [speakingTimer, setSpeakingTimer] = useState(0);
    const [prepTimer, setPrepTimer] = useState(0);

    // Final results
    const [results, setResults] = useState(null);

    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingStartedAtRef = useRef(null);
    const speakingIntervalRef = useRef(null);
    const prepIntervalRef = useRef(null);
    const autoStopAtRef = useRef(null); // ms timestamp when current recording should auto-stop
    const phaseRef = useRef(PHASE.IDLE);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // ── Setup ────────────────────────────────────────────────────────────

    const setupExam = useCallback(async () => {
        setPhase(PHASE.SETUP);
        setErrorMessage(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/speaking/exam/setup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!data?.success) throw new Error(data?.error || "Failed to set up exam");
            setExam(data);
            setPhase(PHASE.INTRO);
        } catch (err) {
            console.error("[exam] setup failed:", err);
            setErrorMessage("Couldn't start the exam. Please check your connection and try again.");
            setPhase(PHASE.ERROR);
        }
    }, []);

    useEffect(() => {
        setupExam();
        // Trigger voice list to populate; some browsers need this nudge
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
                window.speechSynthesis.getVoices();
            } catch {}
        }
        return () => {
            stopExaminerVoice();
            clearAllTimers();
            stopRecordingHard();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Examiner narration helpers ───────────────────────────────────────

    const examinerSay = useCallback(async (text) => {
        if (!text) return;
        setExaminerSpeaking(true);
        await speakAsExaminer(text);
        setExaminerSpeaking(false);
    }, []);

    // ── Timer helpers ────────────────────────────────────────────────────

    const clearAllTimers = useCallback(() => {
        if (speakingIntervalRef.current) {
            clearInterval(speakingIntervalRef.current);
            speakingIntervalRef.current = null;
        }
        if (prepIntervalRef.current) {
            clearInterval(prepIntervalRef.current);
            prepIntervalRef.current = null;
        }
    }, []);

    const startSpeakingCountdown = useCallback((seconds) => {
        setSpeakingTimer(seconds);
        autoStopAtRef.current = Date.now() + seconds * 1000;
        if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = setInterval(() => {
            const remaining = Math.max(
                0,
                Math.round((autoStopAtRef.current - Date.now()) / 1000)
            );
            setSpeakingTimer(remaining);
            if (remaining <= 0) {
                clearInterval(speakingIntervalRef.current);
                speakingIntervalRef.current = null;
                stopRecording(); // soft stop on timer end
            }
        }, 250);
    }, []);

    const startPrepCountdown = useCallback((seconds, onEnd) => {
        setPrepTimer(seconds);
        const endAt = Date.now() + seconds * 1000;
        if (prepIntervalRef.current) clearInterval(prepIntervalRef.current);
        prepIntervalRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
            setPrepTimer(remaining);
            if (remaining <= 0) {
                clearInterval(prepIntervalRef.current);
                prepIntervalRef.current = null;
                onEnd?.();
            }
        }, 250);
    }, []);

    // ── Recording ────────────────────────────────────────────────────────

    const stopRecordingHard = useCallback(() => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
        } catch {}
        mediaRecorderRef.current = null;
    }, []);

    const startRecording = useCallback(
        async ({ maxSeconds, onComplete } = {}) => {
            setMicError(null);
            setLiveTranscript("");
            if (!navigator?.mediaDevices?.getUserMedia) {
                setMicError("Microphone is not available in this browser.");
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                audioChunksRef.current = [];
                recordingStartedAtRef.current = Date.now();

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                recorder.onstop = async () => {
                    const durationSec = Math.max(
                        0,
                        (Date.now() - (recordingStartedAtRef.current || Date.now())) / 1000
                    );
                    stream.getTracks().forEach((track) => track.stop());
                    const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                    audioChunksRef.current = [];
                    setIsRecording(false);
                    if (speakingIntervalRef.current) {
                        clearInterval(speakingIntervalRef.current);
                        speakingIntervalRef.current = null;
                    }

                    // Transcribe and report back
                    if (blob.size === 0) {
                        onComplete?.({ transcript: "", durationSec });
                        return;
                    }
                    setIsTranscribing(true);
                    try {
                        const formData = new FormData();
                        formData.append("audio", blob, "answer.webm");
                        const res = await fetch(`${API_BASE_URL}/api/speaking/exam/transcribe`, {
                            method: "POST",
                            body: formData,
                        });
                        const data = await res.json();
                        const transcript = (data?.transcript || "").trim();
                        setLiveTranscript(transcript);
                        onComplete?.({ transcript, durationSec });
                    } catch (err) {
                        console.error("[exam] transcribe failed:", err);
                        setMicError("Transcription failed. Please try this question again.");
                        onComplete?.({ transcript: "", durationSec });
                    } finally {
                        setIsTranscribing(false);
                    }
                };

                mediaRecorderRef.current = recorder;
                recorder.start();
                setIsRecording(true);
                if (maxSeconds) startSpeakingCountdown(maxSeconds);
            } catch (err) {
                console.error("[exam] mic access failed:", err);
                setMicError(
                    "Couldn't access your microphone. Please allow microphone permission and try again."
                );
            }
        },
        [startSpeakingCountdown]
    );

    const stopRecording = useCallback(() => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        } catch (err) {
            console.error("[exam] stop recording error:", err);
        }
    }, []);

    // ── Part flow handlers ───────────────────────────────────────────────

    const handleStartPart1 = useCallback(async () => {
        if (!exam) return;
        setPhase(PHASE.PART1);
        setPart1Index(0);
        await examinerSay(
            `Good afternoon. My name is Alex and I will be your IELTS examiner today. We will speak for about 11 to 14 minutes. Let's begin with some questions about yourself. ${exam.part1.questions[0]}`
        );
    }, [exam, examinerSay]);

    const handlePart1Answer = useCallback(
        async ({ transcript, durationSec }) => {
            if (!exam) return;
            const question = exam.part1.questions[part1Index];
            const nextAnswers = [
                ...part1Answers,
                { question, transcript, durationSec },
            ];
            setPart1Answers(nextAnswers);

            const nextIndex = part1Index + 1;
            if (nextIndex < exam.part1.questions.length) {
                setPart1Index(nextIndex);
                await examinerSay(exam.part1.questions[nextIndex]);
            } else {
                // Move to Part 2 brief
                setPhase(PHASE.PART2_BRIEF);
                await examinerSay(
                    `Thank you. We will now move on to Part 2. I'm going to give you a topic. You will have one minute to prepare, and then you should speak for one to two minutes. Here is your topic.`
                );
                await examinerSay(`${exam.part2.cueCard.title}. ${exam.part2.cueCard.finalPrompt}`);
                setPhase(PHASE.PART2_PREP);
                startPrepCountdown(PART2_PREP_SECONDS, () => {
                    // Auto-advance to speaking when prep ends
                    if (phaseRef.current === PHASE.PART2_PREP) {
                        beginPart2Speaking();
                    }
                });
            }
        },
        [exam, part1Index, part1Answers, examinerSay, startPrepCountdown]
        // beginPart2Speaking added below via ref
    );

    const beginPart2Speaking = useCallback(async () => {
        if (prepIntervalRef.current) {
            clearInterval(prepIntervalRef.current);
            prepIntervalRef.current = null;
        }
        setPhase(PHASE.PART2_SPEAK);
        await examinerSay(`Your preparation time is over. Please begin speaking. Remember, you should speak for up to two minutes. I will tell you when the time is up.`);
        startRecording({
            maxSeconds: PART2_SPEAK_SECONDS,
            onComplete: ({ transcript, durationSec }) => {
                setPart2Answer({ transcript, durationSec });
                setPhase(PHASE.PART2_DONE);
            },
        });
    }, [examinerSay, startRecording]);

    const handleStartPart3 = useCallback(async () => {
        if (!exam) return;
        setPhase(PHASE.PART3);
        setPart3Index(0);
        await examinerSay(
            `Thank you. We've been talking about ${exam.topic}. I'd like to discuss with you one or two more general questions related to this. ${exam.part3.questions[0]}`
        );
    }, [exam, examinerSay]);

    const handlePart3Answer = useCallback(
        async ({ transcript, durationSec }) => {
            if (!exam) return;
            const question = exam.part3.questions[part3Index];
            const nextAnswers = [
                ...part3Answers,
                { question, transcript, durationSec },
            ];
            setPart3Answers(nextAnswers);

            const nextIndex = part3Index + 1;
            if (nextIndex < exam.part3.questions.length) {
                setPart3Index(nextIndex);
                await examinerSay(exam.part3.questions[nextIndex]);
            } else {
                // End of exam → score
                await examinerSay(`Thank you. That is the end of the speaking test.`);
                await submitForScoring([...part1Answers], part2Answer, nextAnswers);
            }
        },
        [exam, part3Index, part3Answers, examinerSay, part1Answers, part2Answer]
        // submitForScoring added below
    );

    const submitForScoring = useCallback(
        async (p1, p2, p3) => {
            setPhase(PHASE.SCORING);
            try {
                const userId = user?.email || user?.id || null;
                const body = {
                    sessionId: exam?.sessionId,
                    userId,
                    topic: exam?.topic,
                    part1: { answers: p1 },
                    part2: { cueCard: exam?.part2?.cueCard, answer: p2 },
                    part3: { answers: p3 },
                };
                const res = await fetch(`${API_BASE_URL}/api/speaking/exam/score`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                if (!data?.success) throw new Error(data?.error || "Failed to score the exam");
                setResults(data);
                setPhase(PHASE.COMPLETED);

                // Save to localStorage history so dashboards update right away
                const historyEntry = {
                    id: Date.now(),
                    type: "ielts_exam",
                    sessionId: exam?.sessionId,
                    topic: exam?.topic,
                    bandScore: data.bandScore ?? null,
                    band: data.bandScore ?? null,
                    feedback: data.feedback,
                    scores: data.scores,
                    summary: data.summary,
                    durationSec: data.durationSec,
                    wordCount: data.wordCount,
                    submittedAt: new Date().toISOString(),
                };
                appendHistoryEntry(historyEntry, userId);
            } catch (err) {
                console.error("[exam] scoring failed:", err);
                setErrorMessage(
                    "Couldn't get your exam score. Please try again, your transcripts are still available."
                );
                setPhase(PHASE.ERROR);
            }
        },
        [exam, user]
    );

    // ── Convenience derived data ─────────────────────────────────────────

    const totalQuestionsAnswered = part1Answers.length + (part2Answer ? 1 : 0) + part3Answers.length;
    const totalExamQuestions = (exam?.part1?.questions?.length || 0) + 1 + (exam?.part3?.questions?.length || 0);

    const currentPartLabel = useMemo(() => {
        switch (phase) {
            case PHASE.INTRO:
            case PHASE.PART1:
                return "Part 1 — Introduction & Interview";
            case PHASE.PART2_BRIEF:
            case PHASE.PART2_PREP:
            case PHASE.PART2_SPEAK:
            case PHASE.PART2_DONE:
                return "Part 2 — Cue Card";
            case PHASE.PART3:
                return "Part 3 — Discussion";
            default:
                return "";
        }
    }, [phase]);

    const connectionStatus = (() => {
        if (phase === PHASE.SETUP) return { color: "amber", label: "Connecting…" };
        if (phase === PHASE.SCORING) return { color: "amber", label: "Scoring…" };
        if (phase === PHASE.ERROR) return { color: "rose", label: "Error" };
        return { color: "emerald", label: "Connected" };
    })();

    // ── Render ───────────────────────────────────────────────────────────

    if (phase === PHASE.SETUP || phase === PHASE.IDLE) {
        return (
            <ExamShell onExit={onExit} connectionStatus={connectionStatus}>
                <CenterMessage
                    icon="🎓"
                    title="Preparing your IELTS Speaking Exam"
                    description="Generating questions for Part 1, the cue card, and Part 3…"
                />
            </ExamShell>
        );
    }

    if (phase === PHASE.ERROR) {
        return (
            <ExamShell onExit={onExit} connectionStatus={connectionStatus}>
                <CenterMessage
                    icon="⚠️"
                    title="Something went wrong"
                    description={errorMessage || "Please try again."}
                    action={
                        <button
                            type="button"
                            onClick={setupExam}
                            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                        >
                            Try again
                        </button>
                    }
                />
            </ExamShell>
        );
    }

    if (phase === PHASE.INTRO) {
        return (
            <ExamShell
                onExit={onExit}
                connectionStatus={connectionStatus}
                partLabel={currentPartLabel}
                questionCounter={`0 / ${totalExamQuestions}`}
            >
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6 sm:p-8 space-y-4 text-center">
                    <div className="text-5xl">🎙️</div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        Welcome to your IELTS Speaking Test
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        This is a realistic simulation of the official IELTS Speaking exam. You will go
                        through three parts. The examiner will ask one question at a time. You will
                        record your answer; the timer auto-stops when needed. Please find a quiet
                        place and make sure your microphone is working.
                    </p>
                    <ul className="text-left text-sm text-slate-600 space-y-1 max-w-md mx-auto">
                        <li>• <strong>Part 1</strong> — {exam?.part1?.questions?.length || 8}-12 short questions (4-5 min)</li>
                        <li>• <strong>Part 2</strong> — Cue card with 1 min preparation + 2 min speaking</li>
                        <li>• <strong>Part 3</strong> — {exam?.part3?.questions?.length || 5}-7 discussion questions (4-5 min)</li>
                    </ul>
                    <button
                        type="button"
                        onClick={handleStartPart1}
                        className="mt-4 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow"
                    >
                        Start the exam
                    </button>
                </div>
            </ExamShell>
        );
    }

    if (phase === PHASE.PART1) {
        const question = exam.part1.questions[part1Index];
        return (
            <ExamShell
                onExit={onExit}
                connectionStatus={connectionStatus}
                partLabel={currentPartLabel}
                questionCounter={`Q ${part1Index + 1} / ${exam.part1.questions.length}`}
                examinerSpeaking={examinerSpeaking}
            >
                <QuestionStage
                    question={question}
                    isRecording={isRecording}
                    isTranscribing={isTranscribing}
                    liveTranscript={liveTranscript}
                    speakingTimer={speakingTimer}
                    micError={micError}
                    onStart={() =>
                        startRecording({
                            maxSeconds: PART1_MAX_ANSWER_SECONDS,
                            onComplete: handlePart1Answer,
                        })
                    }
                    onStop={stopRecording}
                />
            </ExamShell>
        );
    }

    if (phase === PHASE.PART2_BRIEF || phase === PHASE.PART2_PREP) {
        return (
            <ExamShell
                onExit={onExit}
                connectionStatus={connectionStatus}
                partLabel={currentPartLabel}
                questionCounter="Preparation"
                examinerSpeaking={examinerSpeaking}
            >
                <CueCard cueCard={exam.part2.cueCard} />
                <div className="max-w-3xl mx-auto mt-4 bg-white rounded-2xl shadow p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-semibold text-slate-700">📝 Preparation time</p>
                        <span className="text-2xl font-mono font-extrabold text-amber-600 tabular-nums">
                            {formatMMSS(prepTimer)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        You have 1 minute to prepare. Make notes below — they're private and will not be
                        scored. When the timer ends, you'll be asked to speak for up to 2 minutes.
                    </p>
                    <textarea
                        value={part2Notes}
                        onChange={(e) => setPart2Notes(e.target.value)}
                        placeholder="Jot down keywords, names, points to cover…"
                        className="w-full min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={beginPart2Speaking}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                        >
                            Skip prep and start speaking
                        </button>
                    </div>
                </div>
            </ExamShell>
        );
    }

    if (phase === PHASE.PART2_SPEAK) {
        return (
            <ExamShell
                onExit={onExit}
                connectionStatus={connectionStatus}
                partLabel={currentPartLabel}
                questionCounter="Speaking"
                examinerSpeaking={examinerSpeaking}
            >
                <CueCard cueCard={exam.part2.cueCard} compact />
                <div className="max-w-3xl mx-auto mt-4 bg-white rounded-2xl shadow p-5 sm:p-6 space-y-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Speaking time remaining</p>
                    <p className="text-5xl font-mono font-extrabold text-blue-700 tabular-nums">
                        {formatMMSS(speakingTimer)}
                    </p>
                    <p className="text-xs text-slate-500">
                        The examiner is listening. The recording will auto-stop at 2 minutes.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {isRecording ? (
                            <button
                                type="button"
                                onClick={stopRecording}
                                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
                            >
                                Finish answer early
                            </button>
                        ) : (
                            <span className="text-sm text-slate-500">{isTranscribing ? "Transcribing…" : "Waiting for microphone…"}</span>
                        )}
                    </div>
                    {micError && <p className="text-xs text-rose-600">{micError}</p>}
                </div>
            </ExamShell>
        );
    }

    if (phase === PHASE.PART2_DONE) {
        return (
            <ExamShell
                onExit={onExit}
                connectionStatus={connectionStatus}
                partLabel={currentPartLabel}
                questionCounter="Done"
                examinerSpeaking={examinerSpeaking}
            >
                <CueCard cueCard={exam.part2.cueCard} compact />
                <div className="max-w-3xl mx-auto mt-4 bg-white rounded-2xl shadow p-5 sm:p-6 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Your Part 2 response</p>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 max-h-48 overflow-y-auto">
                        {part2Answer?.transcript || "(no speech captured)"}
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleStartPart3}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                        >
                            Continue to Part 3 →
                        </button>
                    </div>
                </div>
            </ExamShell>
        );
    }

    if (phase === PHASE.PART3) {
        const question = exam.part3.questions[part3Index];
        return (
            <ExamShell
                onExit={onExit}
                connectionStatus={connectionStatus}
                partLabel={currentPartLabel}
                questionCounter={`Q ${part3Index + 1} / ${exam.part3.questions.length}`}
                examinerSpeaking={examinerSpeaking}
            >
                <QuestionStage
                    question={question}
                    isRecording={isRecording}
                    isTranscribing={isTranscribing}
                    liveTranscript={liveTranscript}
                    speakingTimer={speakingTimer}
                    micError={micError}
                    onStart={() =>
                        startRecording({
                            maxSeconds: PART3_MAX_ANSWER_SECONDS,
                            onComplete: handlePart3Answer,
                        })
                    }
                    onStop={stopRecording}
                />
            </ExamShell>
        );
    }

    if (phase === PHASE.SCORING) {
        return (
            <ExamShell onExit={onExit} connectionStatus={connectionStatus} partLabel="Scoring">
                <CenterMessage
                    icon="📊"
                    title="Scoring your exam"
                    description="Evaluating across Fluency, Lexical Resource, Grammar and Pronunciation…"
                />
            </ExamShell>
        );
    }

    if (phase === PHASE.COMPLETED) {
        return (
            <ExamShell onExit={onExit} connectionStatus={connectionStatus} partLabel="Completed">
                <ResultsScreen
                    results={results}
                    onRestart={() => {
                        setExam(null);
                        setPart1Answers([]);
                        setPart2Answer(null);
                        setPart3Answers([]);
                        setPart1Index(0);
                        setPart3Index(0);
                        setResults(null);
                        setPart2Notes("");
                        setupExam();
                    }}
                />
            </ExamShell>
        );
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_TEXT_CLASS = {
    amber: "text-amber-700",
    rose: "text-rose-700",
    emerald: "text-emerald-700",
};
const STATUS_DOT_CLASS = {
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    emerald: "bg-emerald-500",
};

function ExamShell({ children, onExit, connectionStatus, partLabel, questionCounter, examinerSpeaking }) {
    const textClass = STATUS_TEXT_CLASS[connectionStatus?.color] || "text-slate-700";
    const dotClass = STATUS_DOT_CLASS[connectionStatus?.color] || "bg-slate-500";
    return (
        <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    {partLabel && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {partLabel}
                        </span>
                    )}
                    {questionCounter && (
                        <span className="text-xs text-slate-500 font-mono">{questionCounter}</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {examinerSpeaking && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-blue-700">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Examiner speaking
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 text-xs ${textClass}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
                        {connectionStatus?.label}
                    </span>
                    {onExit && (
                        <button
                            type="button"
                            onClick={onExit}
                            className="text-xs text-slate-500 hover:text-slate-700 underline"
                        >
                            Exit exam
                        </button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

function CenterMessage({ icon, title, description, action }) {
    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 sm:p-8 text-center space-y-3">
            <div className="text-5xl">{icon}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h2>
            {description && <p className="text-sm text-slate-600">{description}</p>}
            {action}
        </div>
    );
}

function QuestionStage({
    question,
    isRecording,
    isTranscribing,
    liveTranscript,
    speakingTimer,
    micError,
    onStart,
    onStop,
}) {
    return (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-5 sm:p-6 space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                    Examiner
                </p>
                <p className="mt-1 text-base sm:text-lg text-slate-800 leading-relaxed">
                    {question}
                </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Live transcript
                    </p>
                    {isRecording && (
                        <span className="text-xs font-mono font-semibold text-rose-600 tabular-nums">
                            {formatMMSS(speakingTimer)} left
                        </span>
                    )}
                </div>
                <div className="min-h-[64px] text-sm text-slate-700 whitespace-pre-wrap">
                    {isTranscribing
                        ? "Transcribing your answer…"
                        : liveTranscript || (isRecording ? "Listening…" : "Press the mic to answer.")}
                </div>
            </div>

            {micError && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    {micError}
                </p>
            )}

            <div className="flex justify-center">
                {!isRecording ? (
                    <button
                        type="button"
                        onClick={onStart}
                        disabled={isTranscribing}
                        className="px-6 py-3 rounded-full bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                        🎙️ {isTranscribing ? "Processing…" : "Start answering"}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onStop}
                        className="px-6 py-3 rounded-full bg-rose-600 text-white font-semibold shadow hover:bg-rose-700 inline-flex items-center gap-2"
                    >
                        ⏹ Stop answer
                    </button>
                )}
            </div>
        </div>
    );
}

function CueCard({ cueCard, compact = false }) {
    return (
        <div className={`max-w-3xl mx-auto bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 shadow-sm p-5 sm:p-6 ${compact ? "" : "mt-0"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                Cue Card
            </p>
            <h3 className="mt-1 text-lg sm:text-xl font-bold text-slate-800">{cueCard?.title}</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 italic">You should say:</p>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
                {(cueCard?.points || []).map((p) => (
                    <li key={p}>• {p}</li>
                ))}
            </ul>
            {cueCard?.finalPrompt && (
                <p className="mt-2 text-sm text-slate-700">{cueCard.finalPrompt}</p>
            )}
        </div>
    );
}

function ResultsScreen({ results, onRestart }) {
    if (!results) return null;
    const { scores, bandScore, summary, feedback, capReasons, partTranscripts } = results;
    const bandDisplay = typeof bandScore === "number" ? bandScore.toFixed(1) : bandScore;

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            <div className="bg-white rounded-2xl shadow p-5 sm:p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2 text-center md:text-left">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Overall Band Score</p>
                    <p className="text-5xl font-extrabold text-emerald-600">{bandDisplay}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {results.wordCount} spoken words across {Math.round((results.durationSec || 0))}s
                    </p>
                </div>
                <div className="md:col-span-3 grid grid-cols-2 gap-2">
                    {[
                        { key: "fluency", label: "Fluency & Coherence" },
                        { key: "lexical", label: "Lexical Resource" },
                        { key: "grammar", label: "Grammatical Range & Accuracy" },
                        { key: "pronunciation", label: "Pronunciation" },
                    ].map((c) => (
                        <div key={c.key} className="rounded-xl border border-slate-200 p-3">
                            <p className="text-[11px] text-slate-500 uppercase tracking-wide">{c.label}</p>
                            <p className="text-xl font-bold text-slate-800">
                                {scores?.[c.key] != null ? Number(scores[c.key]).toFixed(1) : "—"}
                                <span className="text-xs text-slate-400 font-normal"> / 9</span>
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {summary?.reasonForScore && (
                <div className="bg-white rounded-2xl shadow p-5 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Why this score?
                    </p>
                    <p className="mt-1">{summary.reasonForScore}</p>
                    {capReasons?.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-amber-700">
                            {capReasons.map((r) => (
                                <li key={r}>⚠ {r}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResultCard title="Strengths" items={summary?.strengths} tone="emerald" />
                <ResultCard title="Weaknesses" items={summary?.weaknesses} tone="rose" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ResultCard title="Suggestions" items={summary?.suggestions} tone="sky" />
                <ResultCard title="Common Grammar Mistakes" items={summary?.commonGrammarMistakes} tone="violet" />
                <ResultCard title="Vocabulary Improvements" items={summary?.vocabularyImprovements} tone="amber" />
            </div>

            <ResultCard
                title="Pronunciation Advice"
                items={summary?.pronunciationAdvice}
                tone="indigo"
            />

            <div className="bg-white rounded-2xl shadow p-5 space-y-4">
                <p className="text-sm font-semibold text-slate-800">Per-question feedback</p>
                {Object.entries(feedback || {})
                    .filter(([k]) => k !== "bandScore")
                    .map(([k, text]) => (
                        <div key={k} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{k}</p>
                            <p className="text-sm text-slate-700 mt-1">{text}</p>
                        </div>
                    ))}
            </div>

            {Array.isArray(partTranscripts) && partTranscripts.length > 0 && (
                <div className="bg-white rounded-2xl shadow p-5">
                    <p className="text-sm font-semibold text-slate-800 mb-3">Your full transcript</p>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {partTranscripts.map((a, i) => (
                            <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                                <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                                    Part {a.part} · {Math.round(a.durationSec || 0)}s
                                </p>
                                <p className="text-xs font-semibold text-slate-700 mt-0.5">Q: {a.question}</p>
                                <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                                    {a.transcript || "(no speech)"}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onRestart}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
                >
                    Take another exam
                </button>
            </div>
        </div>
    );
}

function ResultCard({ title, items, tone }) {
    const ring = {
        emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
        rose: "border-rose-200 bg-rose-50/70 text-rose-900",
        sky: "border-sky-200 bg-sky-50/70 text-sky-900",
        violet: "border-violet-200 bg-violet-50/70 text-violet-900",
        amber: "border-amber-200 bg-amber-50/70 text-amber-900",
        indigo: "border-indigo-200 bg-indigo-50/70 text-indigo-900",
    }[tone] || "border-slate-200 bg-slate-50/70 text-slate-900";
    return (
        <div className={`rounded-2xl border ${ring} p-4`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
            {Array.isArray(items) && items.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                    {items.map((it, i) => (
                        <li key={i}>• {it}</li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-sm opacity-70">No specific items.</p>
            )}
        </div>
    );
}

export default IeltsExamSimulator;
