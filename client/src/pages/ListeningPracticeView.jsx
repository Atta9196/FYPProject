import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";

const STORAGE_KEY = "ielts-listening-history";

function loadHistory() {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to parse listening history", error);
        return [];
    }
}

function saveHistory(entries) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const bandTable = [
    { min: 39, band: "9" },
    { min: 37, band: "8.5" },
    { min: 35, band: "8" },
    { min: 32, band: "7.5" },
    { min: 30, band: "7" },
    { min: 26, band: "6.5" },
    { min: 23, band: "6" },
    { min: 18, band: "5.5" },
    { min: 16, band: "5" },
    { min: 0, band: "4.5 or below" }
];

const defaultSectionState = (section) => ({
    phase: "idle",
    timeRemaining: section.durationSeconds,
    reviewRemaining: section.reviewSeconds,
    audioStarted: false,
    audioEnded: false,
    answers: {},
    submitted: false,
    score: 0,
    questionFeedback: {},
    bandEstimate: null
});

const normalizeAnswer = (value = "") =>
    value
        .toString()
        .trim()
        .replace(/[“”‘’]/g, "")
        .replace(/[.,!?]/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase();

const wordCount = (value = "") =>
    value
        .toString()
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

function getCorrectLabel(question) {
    if (question.type === "multiple" || question.type === "matching") {
        const option = question.options.find((option) => option.value === question.answer);
        return option ? `${option.value}. ${option.label}` : question.answer;
    }
    const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
    return answers[0];
}

function evaluateQuestion(question, rawAnswer) {
    const userAnswer = (rawAnswer ?? "").toString().trim();
    if (!userAnswer) {
        return {
            isCorrect: false,
            message: "No answer provided.",
            correctAnswer: getCorrectLabel(question),
            userAnswer: ""
        };
    }

    if (question.maxWords && wordCount(userAnswer) > question.maxWords) {
        return {
            isCorrect: false,
            message: `Exceeded word limit (maximum ${question.maxWords} word${question.maxWords > 1 ? "s" : ""}).`,
            correctAnswer: getCorrectLabel(question),
            userAnswer
        };
    }

    if (question.type === "multiple" || question.type === "matching") {
        const isCorrect = userAnswer === question.answer;
        return {
            isCorrect,
            message: isCorrect ? "Correct" : "Incorrect option selected.",
            correctAnswer: getCorrectLabel(question),
            userAnswer
        };
    }

    const acceptableAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
    const normalizedUser = normalizeAnswer(userAnswer);
    const isCorrect = acceptableAnswers.some((acceptable) => normalizeAnswer(acceptable) === normalizedUser);

    return {
        isCorrect,
        message: isCorrect ? "Correct" : "Answer does not match exactly.",
        correctAnswer: acceptableAnswers.join(" / "),
        userAnswer
    };
}

function evaluateSection(section, answers) {
    let correctCount = 0;
    const feedback = {};

    section.questions.forEach((question) => {
        const questionFeedback = evaluateQuestion(question, answers[question.id]);
        feedback[question.id] = questionFeedback;
        if (questionFeedback.isCorrect) {
            correctCount += 1;
        }
    });

    return { correctCount, feedback };
}

const getBandFromScore = (score) => {
    const bandEntry = bandTable.find((entry) => score >= entry.min);
    return bandEntry ? bandEntry.band : "N/A";
};

const phaseLabels = {
    idle: "Not started",
    playing: "In progress",
    "awaiting-audio": "Waiting for audio",
    "awaiting-timer": "Waiting for timer",
    review: "Review time",
    completed: "Completed"
};

export function ListeningPracticeView() {
    const [listeningSections, setListeningSections] = useState([]);
    const [totalListeningQuestions, setTotalListeningQuestions] = useState(40);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [sectionStates, setSectionStates] = useState({});
    const audioRefs = useRef({});

    // Load AI-generated listening test
    const loadAIGeneratedListening = useCallback(async () => {
        try {
            setGenerating(true);
            setErrorMessage(null);
            
            const response = await fetch('http://localhost:5000/api/listening/generate');
            const data = await response.json();
            
            if (data.success && data.sections) {
                const sections = data.sections;
                setListeningSections(sections);
                setTotalListeningQuestions(data.totalQuestions || 40);
                
                // Initialize section states
                const initialStates = sections.reduce((acc, section) => {
                    acc[section.id] = defaultSectionState(section);
                    return acc;
                }, {});
                setSectionStates(initialStates);
                
                // Set first section as active
                if (sections.length > 0) {
                    setActiveSectionId(sections[0].id);
                }
                
                // Reset test state - these don't exist in this component, removing
            } else {
                throw new Error(data.error || "Failed to generate listening test");
            }
        } catch (error) {
            console.error("Error loading AI listening test:", error);
            setErrorMessage("Failed to generate listening test. Please try again.");
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    }, []);

    // Load initial listening test on mount
    useEffect(() => {
        loadAIGeneratedListening();
    }, [loadAIGeneratedListening]);

    const activeSection = useMemo(
        () => listeningSections.find((section) => section.id === activeSectionId),
        [listeningSections, activeSectionId]
    );

    const overallStats = useMemo(() => {
        let answered = 0;
        let correct = 0;
        listeningSections.forEach((section) => {
            const state = sectionStates[section.id];
            answered += Object.values(state.answers).filter((value) => value !== undefined && value !== "").length;
            if (state.submitted) {
                correct += state.score;
            }
        });
        const band = getBandFromScore(correct);
        return { answered, correct, band };
    }, [sectionStates]);

    const updateSectionState = useCallback(
        (sectionId, updater) => {
            setSectionStates((prev) => ({
                ...prev,
                [sectionId]: {
                    ...prev[sectionId],
                    ...updater(prev[sectionId])
                }
            }));
        },
        [setSectionStates]
    );

    const handleAudioEnded = useCallback(
        (sectionId) => {
            updateSectionState(sectionId, (current) => {
                const nextState = {
                    ...current,
                    audioEnded: true
                };
                if (current.timeRemaining === 0) {
                    nextState.phase = "review";
                } else {
                    nextState.phase = "awaiting-timer";
                }
                return nextState;
            });
        },
        [updateSectionState]
    );

    const handlePlayAudio = useCallback(
        (sectionId) => {
            const audioElement = audioRefs.current[sectionId];
            const section = listeningSections.find((item) => item.id === sectionId);
            if (!audioElement || !section) return;

            updateSectionState(sectionId, (current) => {
                if (current.audioStarted) return current;
                return {
                    ...defaultSectionState(section),
                    phase: "playing",
                    audioStarted: true
                };
            });

            audioElement.currentTime = 0;
            audioElement.play().catch(() => {
                // Autoplay policies may block playback; keep state unchanged
            });
        },
        [updateSectionState]
    );

    const handleAnswerChange = useCallback((sectionId, questionId, value) => {
        setSectionStates((prev) => {
            const current = prev[sectionId];
            if (current.submitted) return prev;
            return {
                ...prev,
                [sectionId]: {
                    ...current,
                    answers: {
                        ...current.answers,
                        [questionId]: value
                    }
                }
            };
        });
    }, []);

    const handleSubmitSection = useCallback(
        (sectionId) => {
            const section = listeningSections.find((item) => item.id === sectionId);
            if (!section) return;
            setSectionStates((prev) => {
                const current = prev[sectionId];
                if (current.submitted) return prev;
                const { correctCount, feedback } = evaluateSection(section, current.answers);
                const updated = {
                    ...current,
                    phase: "completed",
                    reviewRemaining: 0,
                    submitted: true,
                    score: correctCount,
                    questionFeedback: feedback,
                    bandEstimate: getBandFromScore(
                        correctCount +
                            listeningSections
                                .filter((item) => item.id !== sectionId)
                                .reduce((sum, item) => sum + prev[item.id].score, 0)
                    )
                };
                const newState = {
                    ...prev,
                    [sectionId]: updated
                };

                // Check if all sections are completed and save to localStorage
                const allSectionsCompleted = listeningSections.every(
                    (s) => newState[s.id]?.submitted === true
                );

                if (allSectionsCompleted) {
                    // Calculate total score and band
                    const totalScore = listeningSections.reduce(
                        (sum, s) => sum + (newState[s.id]?.score || 0),
                        0
                    );
                    const finalBand = getBandFromScore(totalScore);

                    // Save to localStorage
                    const historyEntry = {
                        id: Date.now(),
                        totalScore,
                        totalQuestions: totalListeningQuestions,
                        band: parseFloat(finalBand) || 0,
                        sections: listeningSections.map((s) => ({
                            sectionId: s.id,
                            sectionTitle: s.title,
                            score: newState[s.id]?.score || 0,
                            totalQuestions: s.questions.length
                        })),
                        submittedAt: new Date().toISOString()
                    };

                    const existingHistory = loadHistory();
                    const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
                    saveHistory(updatedHistory);

                    // Dispatch event to update dashboards in real-time
                    window.dispatchEvent(new Event('progressUpdated'));
                }

                return newState;
            });
        },
        [setSectionStates, listeningSections, totalListeningQuestions]
    );

    useEffect(() => {
        const intervals = [];

        listeningSections.forEach((section) => {
            const state = sectionStates[section.id];

            if (state.phase === "playing" && state.timeRemaining > 0) {
                const intervalId = setInterval(() => {
                    setSectionStates((prev) => {
                        const current = prev[section.id];
                        if (current.phase !== "playing") return prev;
                        const nextTime = Math.max(current.timeRemaining - 1, 0);
                        const nextState = { ...current, timeRemaining: nextTime };
                        if (nextTime === 0) {
                            nextState.phase = current.audioEnded ? "review" : "awaiting-audio";
                        }
                        return {
                            ...prev,
                            [section.id]: nextState
                        };
                    });
                }, 1000);
                intervals.push(intervalId);
            }

            if (state.phase === "review" && state.reviewRemaining > 0) {
                const intervalId = setInterval(() => {
                    setSectionStates((prev) => {
                        const current = prev[section.id];
                        if (current.phase !== "review") return prev;
                        const nextReview = Math.max(current.reviewRemaining - 1, 0);
                        return {
                            ...prev,
                            [section.id]: {
                                ...current,
                                reviewRemaining: nextReview
                            }
                        };
                    });
                }, 1000);
                intervals.push(intervalId);
            }
        });

        return () => intervals.forEach(clearInterval);
    }, [sectionStates]);

    useEffect(() => {
        listeningSections.forEach((section) => {
            const state = sectionStates[section.id];

            if (state.phase === "awaiting-audio" && state.audioEnded) {
                updateSectionState(section.id, () => ({
                    phase: "review",
                    reviewRemaining: listeningSections.find((item) => item.id === section.id)?.reviewSeconds ?? 30
                }));
            }

            if (state.phase === "awaiting-timer" && state.timeRemaining === 0) {
                updateSectionState(section.id, () => ({
                    phase: "review",
                    reviewRemaining: listeningSections.find((item) => item.id === section.id)?.reviewSeconds ?? 30
                }));
            }

            if (state.phase === "review" && state.reviewRemaining === 0 && !state.submitted) {
                handleSubmitSection(section.id);
            }
        });
    }, [sectionStates, updateSectionState, handleSubmitSection]);

    if (loading || generating) {
        return (
            <AppLayout>
                <div className="p-6 md:p-10 lg:p-12 bg-gradient-to-br from-sky-50 via-white to-blue-50 min-h-screen flex items-center justify-center">
                    <Panel className="max-w-4xl mx-auto bg-white/90 backdrop-blur space-y-4 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                        <h1 className="text-3xl font-extrabold text-sky-700">Generating Listening Test</h1>
                        <p className="text-slate-600 text-sm md:text-base">
                            {generating ? "Creating AI-generated IELTS Listening test for you..." : "Loading..."}
                        </p>
                    </Panel>
                </div>
            </AppLayout>
        );
    }

    if (!activeSection || listeningSections.length === 0) {
        return (
            <AppLayout>
                <div className="p-6 md:p-10 lg:p-12 bg-gradient-to-br from-sky-50 via-white to-blue-50 min-h-screen">
                    <Panel className="max-w-4xl mx-auto bg-white/90 backdrop-blur space-y-4">
                        <h1 className="text-3xl font-extrabold text-sky-700 text-center">Listening Practice</h1>
                        <p className="text-slate-600 text-sm md:text-base text-center">
                            Failed to load listening test. Please try generating a new one.
                        </p>
                        {errorMessage && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {errorMessage}
                            </div>
                        )}
                        <div className="text-center">
                            <button
                                onClick={loadAIGeneratedListening}
                                disabled={generating}
                                className="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? "🔄 Generating..." : "✨ Generate New Test"}
                            </button>
                        </div>
                    </Panel>
                </div>
            </AppLayout>
        );
    }

    const activeState = sectionStates[activeSection.id];
    if (!activeState) {
        return (
            <AppLayout>
                <div className="p-6 md:p-10 lg:p-12 bg-gradient-to-br from-sky-50 via-white to-blue-50 min-h-screen flex items-center justify-center">
                    <Panel className="max-w-4xl mx-auto bg-white/90 backdrop-blur space-y-4 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                        <h1 className="text-3xl font-extrabold text-sky-700">Initializing Test</h1>
                        <p className="text-slate-600 text-sm md:text-base">Setting up listening test sections...</p>
                    </Panel>
                </div>
            </AppLayout>
        );
    }
    const playbackProgress =
        1 - activeState.timeRemaining / (activeSection.durationSeconds || 1);
    const reviewProgress =
        activeSection.reviewSeconds > 0
            ? 1 - activeState.reviewRemaining / activeSection.reviewSeconds
            : 1;
    const submitDisabled =
        activeState.submitted || (activeState.phase !== "review" && activeState.phase !== "completed");

    return (
        <AppLayout>
            <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-blue-50 min-h-screen">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-sky-700">Listening Practice</h1>
                        <p className="text-slate-600 mt-2">
                            Follow the official IELTS rules: single-play audio, strict timing, and automatic scoring.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={loadAIGeneratedListening}
                            disabled={generating}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? "🔄 Generating..." : "✨ Generate New Test"}
                        </button>
                        <a
                            href="/dashboard"
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                            ← Back to Dashboard
                        </a>
                    </div>
                </div>

                <Panel title="Practice Summary" className="bg-white/90 backdrop-blur rounded-2xl shadow-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SummaryItem label="Questions Answered" value={`${overallStats.answered} / ${totalListeningQuestions}`} />
                        <SummaryItem label="Correct Answers" value={`${overallStats.correct}`} />
                        <SummaryItem
                            label="Estimated Band"
                            value={overallStats.correct ? overallStats.band : "Complete test to calculate"}
                        />
                    </div>
                </Panel>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    <Panel title="Sections" className="bg-white/80 backdrop-blur rounded-2xl shadow-md space-y-4">
                        {listeningSections.map((section) => {
                            const state = sectionStates[section.id];
                            const isActive = section.id === activeSectionId;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                                        isActive
                                            ? "border-sky-500 bg-sky-50 shadow-sm"
                                            : "border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                                            <p className="text-xs text-slate-500">{section.questionRange}</p>
                                        </div>
                                        <StatusBadge phase={state.phase} submitted={state.submitted} />
                                    </div>
                                </button>
                            );
                        })}
                    </Panel>

                    <Panel
                        title={activeSection.title}
                        className="lg:col-span-2 bg-white/90 backdrop-blur rounded-2xl shadow-md space-y-6"
                    >
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-sky-700 uppercase tracking-wide">
                                {activeSection.context}
                            </p>
                            <p className="text-sm text-slate-600">
                                Audio length: {Math.round(activeSection.durationSeconds / 60)} minutes • Review window:{" "}
                                {activeSection.reviewSeconds} seconds
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handlePlayAudio(activeSection.id)}
                                    disabled={activeState.audioStarted}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                                        activeState.audioStarted
                                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                            : "bg-sky-600 text-white hover:bg-sky-700"
                                    }`}
                                >
                                    {activeState.audioStarted ? "Audio Locked" : "Play Audio (once)"}
                                </button>
                                <span className="text-xs text-slate-500">
                                    Audio can only be played once. It locks after playback ends.
                                </span>
                            </div>

                            <audio
                                ref={(element) => {
                                    if (element) {
                                        audioRefs.current[activeSection.id] = element;
                                    }
                                }}
                                src={activeSection.audioUrl}
                                preload="auto"
                                className="hidden"
                                onEnded={() => handleAudioEnded(activeSection.id)}
                            />

                            <TimerBar
                                label="Section timer"
                                progress={playbackProgress}
                                remaining={activeState.timeRemaining}
                                accent="bg-sky-500"
                            />

                            {activeState.phase === "review" || activeState.phase === "completed" ? (
                                <TimerBar
                                    label="Review window"
                                    progress={reviewProgress}
                                    remaining={activeState.reviewRemaining}
                                    accent="bg-emerald-500"
                                />
                            ) : (
                                <p className="text-xs text-slate-500">
                                    Review time unlocks after the recording finishes and the timer reaches zero.
                                </p>
                            )}
                        </div>

                        <div className="space-y-5">
                            {activeSection.questions.map((question) => {
                                const currentValue = activeState.answers[question.id] ?? "";
                                const feedback = activeState.questionFeedback[question.id];
                                return (
                                    <QuestionCard
                                        key={question.id}
                                        question={question}
                                        value={currentValue}
                                        disabled={activeState.submitted}
                                        onChange={(value) => handleAnswerChange(activeSection.id, question.id, value)}
                                        feedback={feedback}
                                        showFeedback={activeState.submitted}
                                    />
                                );
                            })}
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => handleSubmitSection(activeSection.id)}
                                disabled={submitDisabled}
                                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                                    submitDisabled
                                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                }`}
                            >
                                {activeState.submitted ? "Section Submitted" : "Submit Section"}
                            </button>
                            <div className="text-xs text-slate-500">
                                The system auto-submits when review time ends. You can submit early once review opens.
                            </div>
                        </div>

                        {activeState.submitted && (
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-700">
                                        Section score: {activeState.score} / {activeSection.questions.length}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Correct answers earn 1 mark each. Overall band converts after all sections.
                                    </p>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Feedback includes correct answers, your responses, and supporting notes.
                                </p>
                            </div>
                        )}
                    </Panel>
                </div>
            </div>
        </AppLayout>
    );
}

function TimerBar({ label, progress, remaining, accent }) {
    const percent = Math.min(Math.max(progress * 100, 0), 100);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase tracking-wide">
                <span>{label}</span>
                <span>
                    {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full ${accent}`} style={{ width: `${percent}%`, transition: "width 1s linear" }} />
            </div>
        </div>
    );
}

function SummaryItem({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-800">{value}</p>
        </div>
    );
}

function StatusBadge({ phase, submitted }) {
    const label = phaseLabels[phase] ?? "In progress";
    const color =
        submitted || phase === "completed"
            ? "bg-emerald-100 text-emerald-700"
            : phase === "playing"
            ? "bg-sky-100 text-sky-700"
            : phase === "review"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-600";
    return (
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>
            {submitted ? "Completed" : label}
        </span>
    );
}

function QuestionCard({ question, value, onChange, disabled, feedback, showFeedback }) {
    return (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white shadow-sm">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">
                        Q{question.id}. {question.prompt}
                    </p>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{question.type}</span>
                </div>
                {question.instructions && <p className="text-xs text-slate-500">{question.instructions}</p>}
            </div>

            <QuestionInput
                question={question}
                value={value}
                disabled={disabled}
                onChange={onChange}
            />

            {showFeedback && feedback && (
                <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                        feedback.isCorrect
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                >
                    <p className="font-semibold">{feedback.isCorrect ? "Correct" : "Incorrect"}</p>
                    {!feedback.isCorrect && (
                        <p className="mt-1">
                            Your answer:{" "}
                            <span className="font-medium">{feedback.userAnswer || "—"}</span>
                        </p>
                    )}
                    <p className="mt-1">
                        Correct answer: <span className="font-medium">{feedback.correctAnswer}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{question.feedback}</p>
                </div>
            )}
        </div>
    );
}

function QuestionInput({ question, value, onChange, disabled }) {
    if (question.type === "multiple" || question.type === "matching") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {question.options.map((option) => (
                    <label
                        key={option.value}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            value === option.value
                                ? "border-sky-400 bg-sky-50 text-sky-700"
                                : "border-slate-200 hover:bg-slate-50"
                        } ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                        <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option.value}
                            disabled={disabled}
                            checked={value === option.value}
                            onChange={(event) => onChange(event.target.value)}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="font-medium">{option.value}.</span>
                        <span>{option.label}</span>
                    </label>
                ))}
            </div>
        );
    }

    return (
        <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="Type your answer here"
        />
    );
}
