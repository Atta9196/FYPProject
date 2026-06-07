import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import { useAuth } from "../contexts/AuthContext";
import { getStorageKeyForModule } from "../services/progressService";
import {
    clearCachedGeneration,
    getCachedGeneration,
    saveCachedGeneration,
} from "../services/api/generationCacheApi";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — official IELTS Listening structure
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_TEST_SECONDS = 30 * 60; // 30-minute IELTS Listening
const SECTION_QUESTIONS_PER = 10;
const TOTAL_QUESTIONS = 40;

const TIMER_WARNINGS = [
    { atSeconds: 10 * 60, label: "10 minutes remaining", tone: "info" },
    { atSeconds: 5 * 60, label: "5 minutes remaining", tone: "warning" },
    { atSeconds: 60, label: "1 minute remaining", tone: "critical" },
];

// Each official IELTS section has a specific topic + a question-template hint.
// We use the hint to pick a presentation style; the actual question.type from
// the AI still drives input rendering (radio / dropdown / text).
const SECTION_BLUEPRINT = {
    1: {
        topic: "Daily Life Conversation",
        templateHint: "form",
        description: "Form / Note / Short-answer completion",
    },
    2: {
        topic: "Information Talk",
        templateHint: "monologue",
        description: "MCQs, Matching, Map / Plan labelling",
    },
    3: {
        topic: "Academic Discussion",
        templateHint: "discussion",
        description: "MCQs, Matching information, Sentence completion",
    },
    4: {
        topic: "Academic Lecture",
        templateHint: "notes",
        description: "Notes, Summary, Table completion",
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// History storage (unchanged — preserves existing dashboard integration)
// ─────────────────────────────────────────────────────────────────────────────

function getStorageKey(userId) {
    return getStorageKeyForModule("listening", userId) || "ielts-listening-history";
}

function loadHistory(userId) {
    if (typeof window === "undefined") return [];
    try {
        const key = getStorageKey(userId);
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to parse listening history", error);
        return [];
    }
}

function saveHistory(entries, userId) {
    if (typeof window === "undefined") return;
    const key = getStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(entries));
}

// ─────────────────────────────────────────────────────────────────────────────
// In-progress answer persistence (NEW — refresh-safe)
// ─────────────────────────────────────────────────────────────────────────────

function answersStorageKey(testId) {
    return `ielts-listening-answers-${testId || "pending"}`;
}

function loadPersistedAnswers(testId) {
    if (typeof window === "undefined" || !testId) return {};
    try {
        const raw = window.localStorage.getItem(answersStorageKey(testId));
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function persistAnswers(testId, answers) {
    if (typeof window === "undefined" || !testId) return;
    try {
        window.localStorage.setItem(
            answersStorageKey(testId),
            JSON.stringify(answers || {})
        );
    } catch {
        // localStorage quota or disabled — silently ignore
    }
}

function clearPersistedAnswers(testId) {
    if (typeof window === "undefined" || !testId) return;
    try {
        window.localStorage.removeItem(answersStorageKey(testId));
    } catch {
        // ignore
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// IELTS band table + scoring helpers (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────

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
    { min: 0, band: "4.5 or below" },
];

const getBandFromScore = (score) => {
    const bandEntry = bandTable.find((entry) => score >= entry.min);
    return bandEntry ? bandEntry.band : "N/A";
};

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

function getQuestionPrompt(question) {
    const p = question?.prompt ?? question?.text ?? question?.question ?? "";
    return typeof p === "string" ? p : String(p || "");
}

function normalizeOption(option) {
    if (!option || typeof option !== "object") return null;
    const value = String(option.value ?? option.option ?? option.id ?? "").trim();
    const label = String(option.label ?? option.text ?? option.option ?? option.answer ?? "").trim();
    return value || label ? { value: value || label, label: label || value } : null;
}

function getFillInstruction(question) {
    const rawAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
    const answers = rawAnswers
        .map((a) => (a == null ? "" : String(a).trim()))
        .filter((a) => a.length > 0);

    const tokenize = (val) => val.split(/\s+/).filter(Boolean);
    const isNumberToken = (t) => /^[0-9]+([.,][0-9]+)?$/.test(t.replace(/[^0-9.,]/g, ""));

    if (answers.length) {
        const tokensList = answers.map(tokenize);
        const allFirstNumeric = tokensList.every((tokens) => tokens.length && isNumberToken(tokens[0]));
        if (allFirstNumeric) return "Number only.";

        const lengths = tokensList.map((t) => t.length);
        const sameLength = lengths.every((len) => len === lengths[0]);
        if (sameLength) {
            const n = lengths[0];
            if (n === 1) return "One word only.";
            if (n === 2) return "Two words only.";
            if (n === 3) return "Three words only.";
            return `Exactly ${n} words.`;
        }
    }

    const maxWords = question.maxWords;
    if (maxWords === 1) return "One word only.";
    if (maxWords === 2) return "Two words only.";
    if (maxWords === 3) return "Up to three words.";
    if (typeof maxWords === "number" && maxWords > 0) return `Up to ${maxWords} words.`;

    return "Short answer.";
}

function getCorrectLabel(question) {
    if (question.type === "multiple" || question.type === "matching") {
        const opts = Array.isArray(question.options) ? question.options : [];
        const option = opts.map(normalizeOption).filter(Boolean).find((o) => o.value === question.answer);
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
            userAnswer: "",
        };
    }

    if (question.maxWords && wordCount(userAnswer) > question.maxWords) {
        return {
            isCorrect: false,
            message: `Exceeded word limit (maximum ${question.maxWords} word${question.maxWords > 1 ? "s" : ""}).`,
            correctAnswer: getCorrectLabel(question),
            userAnswer,
        };
    }

    if (question.type === "multiple" || question.type === "matching") {
        const isCorrect = userAnswer === question.answer;
        return {
            isCorrect,
            message: isCorrect ? "Correct" : "Incorrect option selected.",
            correctAnswer: getCorrectLabel(question),
            userAnswer,
        };
    }

    const acceptableAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
    const normalizedUser = normalizeAnswer(userAnswer);
    const isCorrect = acceptableAnswers.some((acceptable) => normalizeAnswer(acceptable) === normalizedUser);

    return {
        isCorrect,
        message: isCorrect ? "Correct" : "Answer does not match exactly.",
        correctAnswer: acceptableAnswers.join(" / "),
        userAnswer,
    };
}

function evaluateSection(section, answers) {
    let correctCount = 0;
    const feedback = {};
    section.questions.forEach((question) => {
        const result = evaluateQuestion(question, answers[question.id]);
        feedback[question.id] = result;
        if (result.isCorrect) correctCount += 1;
    });
    return { correctCount, feedback };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatMMSS(totalSeconds) {
    const safe = Math.max(0, totalSeconds | 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function countAnsweredInSection(section, answers) {
    if (!section?.questions) return 0;
    return section.questions.reduce((acc, q) => {
        const val = answers[q.id];
        return acc + (val !== undefined && String(val).trim() !== "" ? 1 : 0);
    }, 0);
}

function blueprintFor(sectionId) {
    return SECTION_BLUEPRINT[sectionId] || SECTION_BLUEPRINT[1];
}

/**
 * Map any AI-returned `question.type` string to one of the three canonical
 * values the UI renders: "multiple" | "matching" | "fill".
 *
 * Why: the OpenAI model sometimes emits variants like "multiple-choice",
 * "mcq", "matching-information", "note-completion", "sentence-completion",
 * etc. Without this mapping, anything that isn't exactly "multiple" or
 * "matching" falls through to the text-input renderer — so MCQs disappear
 * even though they were generated. This runs on every load (including for
 * already-cached tests) so it fixes both new and old generations.
 */
function canonicalizeQuestionType(rawType, hasOptions) {
    const t = String(rawType || "").toLowerCase().trim();
    if (!t) return hasOptions ? "multiple" : "fill";
    if (/match/.test(t)) return "matching";
    if (/multi|mcq|choice|choose/.test(t)) return "multiple";
    if (
        /fill|blank|complet|short|note|form|table|summary|flow|sentence|label|map|diagram/.test(
            t
        )
    ) {
        // Map labelling that uses A/B/C options is really a matching question
        if (hasOptions && /label|map|diagram|match/.test(t)) return "matching";
        return hasOptions ? "multiple" : "fill";
    }
    return hasOptions ? "multiple" : "fill";
}

function normalizeSectionsForUI(sections) {
    return (sections || []).map((section) => ({
        ...section,
        questions: (section.questions || []).map((q) => {
            const hasOptions = Array.isArray(q.options) && q.options.length > 0;
            return { ...q, type: canonicalizeQuestionType(q.type, hasOptions) };
        }),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────────────

export function ListeningPracticeView({ embedded = false, onReady }) {
    const { user } = useAuth();

    // Data
    const [listeningSections, setListeningSections] = useState([]);
    const [testId, setTestId] = useState(null);
    const [totalListeningQuestions, setTotalListeningQuestions] = useState(TOTAL_QUESTIONS);

    // Loading
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // Navigation
    const [activeSectionId, setActiveSectionId] = useState(null);

    // Unified answers map (questionId → value), persisted to localStorage
    const [allAnswers, setAllAnswers] = useState({});

    // Per-section audio meta (replay-locked)
    const [sectionAudio, setSectionAudio] = useState({}); // { sectionId: { started, ended, error } }
    const audioRefs = useRef({});

    // Single 30-minute test timer
    const [testPhase, setTestPhase] = useState("idle"); // 'idle' | 'running' | 'completed'
    const [timeRemaining, setTimeRemaining] = useState(TOTAL_TEST_SECONDS);
    const [activeWarning, setActiveWarning] = useState(null);
    const lastWarningAtRef = useRef(null);

    // Submission
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);

    const apiBase = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL
        : "https://ielts-coach-backend.onrender.com";

    // ── Loaders ──────────────────────────────────────────────────────────────

    const applyListeningPayload = useCallback((payload) => {
        const sections = normalizeSectionsForUI(payload?.sections || []);
        if (!sections.length) return false;

        setListeningSections(sections);
        setTestId(payload?.testId || null);
        setTotalListeningQuestions(payload?.totalQuestions || TOTAL_QUESTIONS);

        const audioInit = sections.reduce((acc, s) => {
            acc[s.id] = { started: false, ended: false, error: null };
            return acc;
        }, {});
        setSectionAudio(audioInit);
        setActiveSectionId(sections[0].id);

        // Restore persisted in-progress answers if they belong to this test
        const persisted = loadPersistedAnswers(payload?.testId);
        setAllAnswers(persisted || {});

        // Reset timer state for the new test
        setTimeRemaining(TOTAL_TEST_SECONDS);
        setTestPhase("idle");
        setResults(null);
        setActiveWarning(null);
        lastWarningAtRef.current = null;

        if (embedded && typeof onReady === "function") onReady();
        return true;
    }, [embedded, onReady]);

    const loadAIGeneratedListening = useCallback(async ({ force = false } = {}) => {
        try {
            setGenerating(true);
            setErrorMessage(null);

            if (!force) {
                const cached = await getCachedGeneration("listening");
                if (cached && applyListeningPayload(cached)) return;
            } else {
                await clearCachedGeneration("listening");
            }

            const response = await fetch(`${apiBase}/api/listening/generate`);
            const data = await response.json();

            if (data.success && data.sections) {
                applyListeningPayload(data);
                saveCachedGeneration("listening", {
                    success: true,
                    testId: data.testId,
                    sections: data.sections,
                    totalQuestions: data.totalQuestions || TOTAL_QUESTIONS,
                });
            } else {
                throw new Error(data.error || "Failed to generate listening test");
            }
        } catch (error) {
            console.error("Error loading AI listening test:", error);
            if (force) {
                try {
                    const fallback = await getCachedGeneration("listening");
                    if (fallback && applyListeningPayload(fallback)) {
                        setErrorMessage(
                            "Couldn't generate a new listening test. Restored your previous one."
                        );
                        return;
                    }
                } catch {}
            }
            setErrorMessage("Failed to generate listening test. Please try again.");
        } finally {
            setGenerating(false);
            setLoading(false);
        }
    }, [apiBase, applyListeningPayload]);

    useEffect(() => {
        loadAIGeneratedListening();
    }, [loadAIGeneratedListening]);

    // Active section reference
    const activeSection = useMemo(
        () => listeningSections.find((s) => s.id === activeSectionId),
        [listeningSections, activeSectionId]
    );

    // ── Answer handling ─────────────────────────────────────────────────────

    const handleAnswerChange = useCallback((questionId, value) => {
        setAllAnswers((prev) => {
            const next = { ...prev, [questionId]: value };
            return next;
        });
    }, []);

    // Persist on every change (refresh-safe)
    useEffect(() => {
        if (!testId) return;
        persistAnswers(testId, allAnswers);
    }, [allAnswers, testId]);

    // ── Audio handling (single play, mirrors previous behaviour) ────────────

    const handlePlayAudio = useCallback((sectionId) => {
        const audio = audioRefs.current[sectionId];
        const section = listeningSections.find((s) => s.id === sectionId);
        if (!audio || !section) return;
        const meta = sectionAudio[sectionId];
        if (meta?.started) return; // single-play lock

        // First audio play starts the 30-minute test timer
        if (testPhase === "idle") setTestPhase("running");

        try {
            audio.currentTime = 0;
            audio.load();
            audio
                .play()
                .then(() => {
                    setSectionAudio((prev) => ({
                        ...prev,
                        [sectionId]: { started: true, ended: false, error: null },
                    }));
                })
                .catch((err) => {
                    console.error("Listening audio play failed:", err);
                    setSectionAudio((prev) => ({
                        ...prev,
                        [sectionId]: {
                            started: false,
                            ended: false,
                            error: "Audio failed to play. Try again in a moment.",
                        },
                    }));
                });
        } catch (err) {
            console.error("Listening audio start error:", err);
        }
    }, [listeningSections, sectionAudio, testPhase]);

    const handleAudioEnded = useCallback((sectionId) => {
        setSectionAudio((prev) => ({
            ...prev,
            [sectionId]: { ...(prev[sectionId] || {}), ended: true },
        }));
    }, []);

    // ── Test timer ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (testPhase !== "running") return;
        if (timeRemaining <= 0) return;
        const id = setInterval(() => {
            setTimeRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(id);
    }, [testPhase, timeRemaining]);

    // Threshold warnings (each fires at most once per test)
    useEffect(() => {
        if (testPhase !== "running") return;
        const due = TIMER_WARNINGS.find(
            (w) => timeRemaining === w.atSeconds && lastWarningAtRef.current !== w.atSeconds
        );
        if (due) {
            lastWarningAtRef.current = due.atSeconds;
            setActiveWarning(due);
        }
    }, [timeRemaining, testPhase]);

    // Auto-dismiss warning toast
    useEffect(() => {
        if (!activeWarning) return;
        const id = setTimeout(() => setActiveWarning(null), 7000);
        return () => clearTimeout(id);
    }, [activeWarning]);

    // ── Submission (preserves existing scoring & dashboard wiring) ──────────

    const handleSubmitTest = useCallback(async (auto = false) => {
        if (submitting || results) return;
        if (!listeningSections.length) return;
        setSubmitting(true);

        try {
            // 1. Per-section scoring (unchanged logic)
            const sectionResults = listeningSections.map((section) => {
                const { correctCount, feedback } = evaluateSection(section, allAnswers);
                return {
                    sectionId: section.id,
                    sectionTitle: section.title,
                    score: correctCount,
                    totalQuestions: section.questions.length,
                    feedback,
                };
            });

            const totalScore = sectionResults.reduce((sum, r) => sum + r.score, 0);
            const totalQuestionsCount = listeningSections.reduce(
                (sum, s) => sum + (s.questions?.length || 0),
                0
            );

            // 2. Call existing AI evaluate endpoint (unchanged)
            let aiBand = null;
            let aiFeedback = null;
            try {
                const res = await fetch(`${apiBase}/api/listening/evaluate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        totalScore,
                        totalQuestions: totalQuestionsCount,
                        sectionScores: sectionResults.map((r) => ({
                            sectionId: r.sectionId,
                            score: r.score,
                            total: r.totalQuestions,
                        })),
                    }),
                });
                const data = await res.json();
                if (data?.success) {
                    if (typeof data.bandScore === "number") aiBand = data.bandScore;
                    if (data.feedback) aiFeedback = data.feedback;
                }
            } catch {
                // Network failure → fall back to local band table only
            }

            const finalBand =
                aiBand != null
                    ? aiBand
                    : parseFloat(getBandFromScore(totalScore)) || 0;

            const finalResults = {
                sections: sectionResults,
                totalScore,
                totalQuestions: totalQuestionsCount,
                band: finalBand,
                autoSubmitted: auto,
                feedback:
                    aiFeedback || `Score: ${totalScore}/${totalQuestionsCount}`,
                completedAt: new Date().toISOString(),
            };

            setResults(finalResults);
            setTestPhase("completed");

            // 3. Save to dashboard history (unchanged format / contract)
            const sectionsSummary = sectionResults.map((r) => ({
                sectionId: r.sectionId,
                sectionTitle: r.sectionTitle,
                score: r.score,
                totalQuestions: r.totalQuestions,
            }));
            const historyEntry = {
                id: Date.now(),
                module: "listening",
                totalScore,
                totalQuestions: totalQuestionsCount,
                band: finalBand,
                bandScore: finalBand,
                feedback: finalResults.feedback,
                sections: sectionsSummary,
                submittedAt: finalResults.completedAt,
            };
            const userId = user?.email || user?.id || null;
            const existingHistory = loadHistory(userId);
            const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
            saveHistory(updatedHistory, userId);
            window.dispatchEvent(new Event("progressUpdated"));

            // 4. Clear in-progress persisted answers for this test
            clearPersistedAnswers(testId);
        } finally {
            setSubmitting(false);
        }
    }, [submitting, results, listeningSections, allAnswers, apiBase, user, testId]);

    // Auto-submit when timer hits zero
    useEffect(() => {
        if (embedded) return; // Parent (FullTestSimulator) owns timing in embedded mode
        if (testPhase === "running" && timeRemaining === 0 && !submitting && !results) {
            handleSubmitTest(true);
        }
    }, [embedded, testPhase, timeRemaining, submitting, results, handleSubmitTest]);

    // ── Loading / empty states ──────────────────────────────────────────────

    if (loading || generating) {
        const loadingContent = (
            <div className="p-6 md:p-10 lg:p-12 bg-gradient-to-br from-sky-50 via-white to-blue-50 min-h-screen flex items-center justify-center">
                <Panel className="max-w-4xl mx-auto bg-white/90 backdrop-blur space-y-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4"></div>
                    <h1 className="text-3xl font-extrabold text-sky-700">Generating Listening Test</h1>
                    <p className="text-slate-600 text-sm md:text-base">
                        {generating
                            ? "Creating AI-generated IELTS Listening test for you..."
                            : "Loading..."}
                    </p>
                </Panel>
            </div>
        );
        return embedded ? loadingContent : <AppLayout>{loadingContent}</AppLayout>;
    }

    if (!activeSection || listeningSections.length === 0) {
        const errorContent = (
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
                            onClick={() => loadAIGeneratedListening({ force: true })}
                            disabled={generating}
                            className="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? "🔄 Generating..." : "✨ Generate New Test"}
                        </button>
                    </div>
                </Panel>
            </div>
        );
        return embedded ? errorContent : <AppLayout>{errorContent}</AppLayout>;
    }

    const activeAudio = sectionAudio[activeSection.id] || {
        started: false,
        ended: false,
        error: null,
    };

    const totalAnsweredCount = listeningSections.reduce(
        (sum, s) => sum + countAnsweredInSection(s, allAnswers),
        0
    );

    // ── Main view ────────────────────────────────────────────────────────────

    const mainContent = (
        <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-blue-50 min-h-screen">
            {!embedded && (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-sky-700 break-words">
                            IELTS Listening Test
                        </h1>
                        <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">
                            4 sections • 40 questions • 30 minutes • Audio plays once
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => loadAIGeneratedListening({ force: true })}
                            disabled={generating || testPhase === "running"}
                            className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {generating ? "🔄 Generating..." : "✨ Generate New Test"}
                        </button>
                        <a
                            href="/dashboard"
                            className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                        >
                            ← Back to Dashboard
                        </a>
                    </div>
                </div>
            )}

            {results ? (
                <ResultsView
                    results={results}
                    sections={listeningSections}
                    answers={allAnswers}
                    onRegenerate={() => loadAIGeneratedListening({ force: true })}
                />
            ) : (
                <>
                    {!embedded && (
                        <TestTimerBar
                            timeRemaining={timeRemaining}
                            totalSeconds={TOTAL_TEST_SECONDS}
                            phase={testPhase}
                            warning={activeWarning}
                            answeredCount={totalAnsweredCount}
                            totalQuestions={totalListeningQuestions}
                            onSubmit={() => handleSubmitTest(false)}
                            submitting={submitting}
                        />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 max-w-7xl mx-auto">
                        <SectionSidebar
                            sections={listeningSections}
                            activeId={activeSection.id}
                            onSelect={setActiveSectionId}
                            answers={allAnswers}
                            audio={sectionAudio}
                        />

                        <div className="lg:col-span-3 space-y-4">
                            <Panel
                                title={`${activeSection.title} — ${blueprintFor(activeSection.id).topic}`}
                                className="bg-white/90 backdrop-blur rounded-2xl shadow-md space-y-5"
                            >
                                <SectionMetaHeader section={activeSection} />

                                <AudioPlayerCard
                                    section={activeSection}
                                    audio={activeAudio}
                                    onPlay={() => handlePlayAudio(activeSection.id)}
                                    onEnded={() => handleAudioEnded(activeSection.id)}
                                    onError={(msg) =>
                                        setSectionAudio((prev) => ({
                                            ...prev,
                                            [activeSection.id]: {
                                                ...(prev[activeSection.id] || {}),
                                                error: msg,
                                                started: false,
                                            },
                                        }))
                                    }
                                    registerRef={(el) => {
                                        if (el) audioRefs.current[activeSection.id] = el;
                                    }}
                                />

                                <QuestionPalette
                                    sections={listeningSections}
                                    activeSectionId={activeSection.id}
                                    answers={allAnswers}
                                    onJumpToSection={(sid) => setActiveSectionId(sid)}
                                />

                                <SectionQuestions
                                    section={activeSection}
                                    answers={allAnswers}
                                    onChange={handleAnswerChange}
                                />

                                <SectionFooterNav
                                    sections={listeningSections}
                                    activeId={activeSection.id}
                                    onSelect={setActiveSectionId}
                                    onSubmit={() => handleSubmitTest(false)}
                                    submitting={submitting}
                                    embedded={embedded}
                                />
                            </Panel>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    return embedded ? mainContent : <AppLayout>{mainContent}</AppLayout>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (UI only)
// ─────────────────────────────────────────────────────────────────────────────

function TestTimerBar({
    timeRemaining,
    totalSeconds,
    phase,
    warning,
    answeredCount,
    totalQuestions,
    onSubmit,
    submitting,
}) {
    const elapsed = Math.max(0, totalSeconds - timeRemaining);
    const progress = Math.min(100, (elapsed / totalSeconds) * 100);
    const isCritical = timeRemaining <= 60;
    const isWarning = timeRemaining > 60 && timeRemaining <= 5 * 60;
    const isCaution = timeRemaining > 5 * 60 && timeRemaining <= 10 * 60;

    const timerColor = isCritical
        ? "text-red-600"
        : isWarning
        ? "text-orange-600"
        : isCaution
        ? "text-amber-600"
        : "text-slate-800";

    const barColor = isCritical
        ? "bg-red-500"
        : isWarning
        ? "bg-orange-500"
        : isCaution
        ? "bg-amber-500"
        : "bg-sky-500";

    return (
        <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 py-3 bg-white/85 backdrop-blur-md border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                            Time Remaining
                        </span>
                        <span
                            className={`text-2xl sm:text-3xl font-mono font-extrabold tabular-nums ${timerColor} ${
                                isCritical ? "animate-pulse" : ""
                            }`}
                        >
                            {formatMMSS(timeRemaining)}
                        </span>
                    </div>
                    <div className="hidden sm:block flex-1 min-w-[120px]">
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className={`h-full ${barColor} transition-[width] duration-700 ease-linear`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-xs text-slate-600">
                        <span className="font-semibold">{answeredCount}</span>
                        <span className="text-slate-400"> / {totalQuestions} answered</span>
                    </div>
                    {phase === "idle" && (
                        <span className="text-xs text-slate-500 italic">
                            Timer starts on first audio play
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {submitting ? "Submitting..." : "Submit Test"}
                    </button>
                </div>
            </div>

            {warning && (
                <div
                    className={`max-w-7xl mx-auto mt-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm ${
                        warning.tone === "critical"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : warning.tone === "warning"
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                    role="alert"
                >
                    ⏰ {warning.label}
                </div>
            )}
        </div>
    );
}

function SectionSidebar({ sections, activeId, onSelect, answers, audio }) {
    return (
        <Panel
            title="Sections"
            className="bg-white/85 backdrop-blur rounded-2xl shadow-md space-y-3"
        >
            {sections.map((section) => {
                const answered = countAnsweredInSection(section, answers);
                const total = section.questions?.length || 0;
                const isActive = section.id === activeId;
                const audioMeta = audio[section.id] || {};
                const audioDone = !!audioMeta.started;
                return (
                    <button
                        key={section.id}
                        type="button"
                        onClick={() => onSelect(section.id)}
                        className={`w-full text-left px-3 sm:px-4 py-3 rounded-xl border transition-all ${
                            isActive
                                ? "border-sky-500 bg-sky-50 shadow-sm"
                                : "border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                    {section.title}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                    {blueprintFor(section.id).topic}
                                </p>
                            </div>
                            <span
                                className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 ${
                                    audioDone
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-100 text-slate-500"
                                }`}
                                title={audioDone ? "Audio played" : "Audio not played"}
                            >
                                {audioDone ? "🔊" : "▶"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                    className={`h-full ${
                                        answered === total
                                            ? "bg-emerald-500"
                                            : "bg-sky-500"
                                    }`}
                                    style={{ width: `${total ? (answered / total) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="text-[11px] text-slate-600 tabular-nums">
                                {answered}/{total}
                            </span>
                        </div>
                    </button>
                );
            })}
            <div className="pt-1 text-[11px] text-slate-500 px-1">
                Answers are saved automatically. Refresh-safe until you submit.
            </div>
        </Panel>
    );
}

function SectionMetaHeader({ section }) {
    const bp = blueprintFor(section.id);
    return (
        <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">
                {bp.topic}
            </p>
            <p className="text-sm text-slate-600">{bp.description}</p>
            <p className="text-xs text-slate-500">
                Audio length: ~{Math.round((section.durationSeconds || 300) / 60)} minutes •{" "}
                {section.context || "Listen carefully"}
            </p>
        </div>
    );
}

function AudioPlayerCard({ section, audio, onPlay, onEnded, onError, registerRef }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <button
                    type="button"
                    onClick={onPlay}
                    disabled={audio.started}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors w-full sm:w-auto ${
                        audio.started
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-sky-600 text-white hover:bg-sky-700"
                    }`}
                >
                    {audio.started ? "🔒 Audio Locked" : "▶ Play Audio (once)"}
                </button>
                <p className="text-xs text-slate-500">
                    Audio can only be played once. Replay is disabled — listen carefully.
                </p>
            </div>
            {audio.error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                    {audio.error}
                </p>
            )}
            <audio
                ref={registerRef}
                src={section.audioUrl}
                preload="auto"
                className="hidden"
                onEnded={onEnded}
                onError={(e) => {
                    const msg = e?.target?.error?.message || "Audio failed to load";
                    console.error("Listening audio load error:", msg);
                    onError("Audio failed to load. Check your connection and try again.");
                }}
            />
        </div>
    );
}

function QuestionPalette({ sections, activeSectionId, answers, onJumpToSection }) {
    // Build a flat list of all questions with metadata
    const items = [];
    sections.forEach((section) => {
        (section.questions || []).forEach((q) => {
            items.push({
                qid: q.id,
                number: q.number ?? q.id,
                sectionId: section.id,
                answered:
                    answers[q.id] !== undefined && String(answers[q.id]).trim() !== "",
            });
        });
    });
    items.sort((a, b) => a.number - b.number);

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Question Navigator
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <LegendDot color="bg-slate-200 border-slate-300" label="Not answered" />
                    <LegendDot color="bg-emerald-500 border-emerald-600" label="Answered" />
                    <LegendDot color="bg-sky-500 border-sky-600" label="Current section" />
                </div>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
                {items.map((it) => {
                    const inActiveSection = it.sectionId === activeSectionId;
                    let cls = "bg-slate-200 text-slate-600 border-slate-300";
                    if (it.answered) cls = "bg-emerald-500 text-white border-emerald-600";
                    if (inActiveSection && !it.answered) cls = "bg-sky-500 text-white border-sky-600";
                    if (inActiveSection && it.answered) cls = "bg-emerald-500 text-white border-emerald-600 ring-2 ring-sky-400";
                    return (
                        <button
                            key={it.qid}
                            type="button"
                            onClick={() => onJumpToSection(it.sectionId)}
                            title={`Question ${it.number} (Section ${it.sectionId})`}
                            className={`h-8 w-full rounded-md border text-[11px] font-semibold transition-all hover:opacity-90 ${cls}`}
                        >
                            {it.number}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function LegendDot({ color, label }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded border ${color}`} />
            <span>{label}</span>
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section question templates
// ─────────────────────────────────────────────────────────────────────────────

function SectionQuestions({ section, answers, onChange }) {
    const blueprint = blueprintFor(section.id);
    const questions = section.questions || [];

    if (!questions.length) {
        return (
            <p className="text-sm text-slate-500 italic">
                No questions available for this section.
            </p>
        );
    }

    // Section 1 → form-completion style for fill-type questions
    if (blueprint.templateHint === "form") {
        return (
            <FormCompletionTemplate
                questions={questions}
                answers={answers}
                onChange={onChange}
            />
        );
    }

    // Section 4 → notes / table / summary style
    if (blueprint.templateHint === "notes") {
        return (
            <NotesCompletionTemplate
                questions={questions}
                answers={answers}
                onChange={onChange}
                lectureTitle={section.title}
            />
        );
    }

    // Section 2 & 3 → mixed (MCQ + matching dropdowns + sentence completion)
    return (
        <MixedTemplate questions={questions} answers={answers} onChange={onChange} />
    );
}

function QuestionNumberBadge({ number }) {
    return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-xs font-bold shrink-0">
            {number}
        </span>
    );
}

// ──── Section 1: Form Completion ─────────────────────────────────────────────

function FormCompletionTemplate({ questions, answers, onChange }) {
    return (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/50 to-white p-4 sm:p-5 shadow-inner">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <p className="text-sm font-semibold text-sky-800">📝 Complete the form</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Listen and fill in each blank with the missing information.
                    </p>
                </div>
                <span className="text-[11px] text-slate-500 italic">
                    Follow the word-limit hints under each field.
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {questions.map((question) => {
                    const value = answers[question.id] ?? "";
                    const number = question.number ?? question.id;
                    const hint = getFillInstruction(question);

                    if (question.type === "multiple" || question.type === "matching") {
                        return (
                            <div
                                key={question.id}
                                className="md:col-span-2 rounded-xl border border-slate-200 bg-white/80 p-3 sm:p-4 space-y-2"
                            >
                                <div className="flex items-start gap-2">
                                    <QuestionNumberBadge number={number} />
                                    <p className="text-sm text-slate-800">
                                        {getQuestionPrompt(question)}
                                    </p>
                                </div>
                                <QuestionInput
                                    question={question}
                                    value={value}
                                    onChange={(v) => onChange(question.id, v)}
                                    layout="inline"
                                />
                            </div>
                        );
                    }

                    return (
                        <div
                            key={question.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-3 shadow-sm space-y-2"
                        >
                            <div className="flex items-center gap-2">
                                <QuestionNumberBadge number={number} />
                                <label
                                    htmlFor={`q-${question.id}`}
                                    className="text-sm font-medium text-slate-700 truncate"
                                >
                                    {getQuestionPrompt(question)}
                                </label>
                            </div>
                            <input
                                id={`q-${question.id}`}
                                type="text"
                                value={value}
                                onChange={(e) => onChange(question.id, e.target.value)}
                                placeholder="Your answer"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                            />
                            <p className="text-[11px] text-slate-500">{hint}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ──── Section 4: Notes / Table / Summary Completion ─────────────────────────

function NotesCompletionTemplate({ questions, answers, onChange, lectureTitle }) {
    return (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white p-4 sm:p-5 shadow-inner">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <p className="text-sm font-semibold text-indigo-800">
                        📒 Complete the lecture notes
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {lectureTitle}: Fill in the missing notes / summary / table entries as
                        you listen.
                    </p>
                </div>
                <span className="text-[11px] text-slate-500 italic">
                    Word-limit hints appear under each blank.
                </span>
            </div>
            <ol className="space-y-2 sm:space-y-3">
                {questions.map((question) => {
                    const value = answers[question.id] ?? "";
                    const number = question.number ?? question.id;
                    const hint = getFillInstruction(question);

                    if (question.type === "multiple" || question.type === "matching") {
                        return (
                            <li
                                key={question.id}
                                className="rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-3 shadow-sm space-y-2"
                            >
                                <div className="flex items-start gap-2">
                                    <QuestionNumberBadge number={number} />
                                    <p className="text-sm text-slate-800">
                                        {getQuestionPrompt(question)}
                                    </p>
                                </div>
                                <QuestionInput
                                    question={question}
                                    value={value}
                                    onChange={(v) => onChange(question.id, v)}
                                />
                            </li>
                        );
                    }

                    return (
                        <li
                            key={question.id}
                            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 sm:px-4 py-3 shadow-sm"
                        >
                            <QuestionNumberBadge number={number} />
                            <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-sm text-slate-800 leading-relaxed">
                                    {getQuestionPrompt(question)}
                                </p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <input
                                        type="text"
                                        value={value}
                                        onChange={(e) => onChange(question.id, e.target.value)}
                                        placeholder="Your note"
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                    />
                                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                        {hint}
                                    </span>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

// ──── Sections 2 & 3: Mixed (MCQ / Matching dropdown / Sentence Completion) ──

function MixedTemplate({ questions, answers, onChange }) {
    return (
        <ol className="space-y-3 sm:space-y-4">
            {questions.map((question) => {
                const value = answers[question.id] ?? "";
                const number = question.number ?? question.id;
                return (
                    <li
                        key={question.id}
                        className="rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-sm space-y-3"
                    >
                        <div className="flex items-start gap-2">
                            <QuestionNumberBadge number={number} />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 leading-snug">
                                    {getQuestionPrompt(question)}
                                </p>
                                {question.instructions && (
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        {question.instructions}
                                    </p>
                                )}
                            </div>
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">
                                {labelForType(question.type)}
                            </span>
                        </div>
                        <QuestionInput
                            question={question}
                            value={value}
                            onChange={(v) => onChange(question.id, v)}
                        />
                    </li>
                );
            })}
        </ol>
    );
}

function labelForType(type) {
    switch (type) {
        case "multiple":
            return "MCQ";
        case "matching":
            return "Matching";
        case "fill":
            return "Sentence completion";
        default:
            return type || "Question";
    }
}

// ──── Unified input renderer used by all templates ──────────────────────────

function QuestionInput({ question, value, onChange, layout = "block" }) {
    const options = Array.isArray(question.options)
        ? question.options.map(normalizeOption).filter(Boolean)
        : [];

    // Matching → dropdown (per IELTS official format)
    if (question.type === "matching" && options.length > 0) {
        return (
            <div className={layout === "inline" ? "max-w-md" : ""}>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
                >
                    <option value="">— Choose —</option>
                    {options.map((opt, idx) => (
                        <option key={`${opt.value}-${idx}`} value={opt.value}>
                            {opt.value}. {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    // Multiple choice → radio buttons
    if (question.type === "multiple" && options.length > 0) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {options.map((option, idx) => (
                    <label
                        key={`${option.value}-${idx}`}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors cursor-pointer ${
                            value === option.value
                                ? "border-sky-400 bg-sky-50 text-sky-700"
                                : "border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                        <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option.value}
                            checked={value === option.value}
                            onChange={(e) => onChange(e.target.value)}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="font-medium">{option.value}.</span>
                        <span className="truncate">{option.label}</span>
                    </label>
                ))}
            </div>
        );
    }

    // Sentence completion / fill / short answer → text input
    const hint = getFillInstruction(question);
    return (
        <div className="space-y-1.5">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Your answer"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none"
            />
            <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
    );
}

// ──── Section footer navigation (Prev / Next / Submit) ──────────────────────

function SectionFooterNav({ sections, activeId, onSelect, onSubmit, submitting, embedded }) {
    const idx = sections.findIndex((s) => s.id === activeId);
    const prev = idx > 0 ? sections[idx - 1] : null;
    const next = idx >= 0 && idx < sections.length - 1 ? sections[idx + 1] : null;
    return (
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100">
            <button
                type="button"
                onClick={() => prev && onSelect(prev.id)}
                disabled={!prev}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                ← Previous section
            </button>
            <div className="flex items-center gap-2">
                {!embedded && (
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {submitting ? "Submitting..." : "Submit Test"}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => next && onSelect(next.id)}
                    disabled={!next}
                    className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Next section →
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results view
// ─────────────────────────────────────────────────────────────────────────────

function ResultsView({ results, sections, answers, onRegenerate }) {
    const totalPercent = Math.round((results.totalScore / Math.max(1, results.totalQuestions)) * 100);
    const bandDisplay = typeof results.band === "number" ? results.band.toFixed(1) : results.band;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <Panel className="bg-gradient-to-br from-sky-50 to-white border border-sky-100 rounded-2xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <ScoreStat
                        label="Overall Score"
                        value={`${results.totalScore} / ${results.totalQuestions}`}
                        sub={`${totalPercent}%`}
                        tone="sky"
                    />
                    <ScoreStat
                        label="Estimated IELTS Band"
                        value={bandDisplay}
                        sub="Listening band"
                        tone="emerald"
                    />
                    <ScoreStat
                        label="Status"
                        value={results.autoSubmitted ? "Auto-submitted" : "Submitted"}
                        sub={new Date(results.completedAt).toLocaleString()}
                        tone="slate"
                    />
                </div>
                {results.feedback && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                        💡 {results.feedback}
                    </div>
                )}
            </Panel>

            <Panel
                title="Section-wise breakdown"
                className="bg-white/90 backdrop-blur rounded-2xl shadow-md"
            >
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-2">Section</th>
                                <th className="px-4 py-2">Topic</th>
                                <th className="px-4 py-2">Score</th>
                                <th className="px-4 py-2">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.sections.map((r) => {
                                const bp = blueprintFor(r.sectionId);
                                const pct = Math.round((r.score / Math.max(1, r.totalQuestions)) * 100);
                                return (
                                    <tr key={r.sectionId} className="hover:bg-sky-50/40">
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            {r.sectionTitle}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{bp.topic}</td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {r.score} / {r.totalQuestions}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                        className={`h-full ${
                                                            pct >= 75
                                                                ? "bg-emerald-500"
                                                                : pct >= 50
                                                                ? "bg-amber-500"
                                                                : "bg-rose-500"
                                                        }`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-600 tabular-nums">
                                                    {pct}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <Panel
                title="Review answers"
                className="bg-white/90 backdrop-blur rounded-2xl shadow-md space-y-4"
            >
                {sections.map((section) => {
                    const sr = results.sections.find((r) => r.sectionId === section.id);
                    const feedback = sr?.feedback || {};
                    return (
                        <div key={section.id} className="space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <p className="text-sm font-semibold text-slate-800">
                                    {section.title} — {blueprintFor(section.id).topic}
                                </p>
                                <span className="text-xs text-slate-500">
                                    {sr ? `${sr.score} / ${sr.totalQuestions}` : ""}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(section.questions || []).map((q) => {
                                    const fb = feedback[q.id] || {
                                        isCorrect: false,
                                        userAnswer: answers[q.id] || "",
                                        correctAnswer: getCorrectLabel(q),
                                    };
                                    return (
                                        <div
                                            key={q.id}
                                            className={`rounded-lg border p-3 text-xs ${
                                                fb.isCorrect
                                                    ? "border-emerald-200 bg-emerald-50"
                                                    : "border-rose-200 bg-rose-50"
                                            }`}
                                        >
                                            <p className="font-semibold text-slate-800">
                                                Q{q.number ?? q.id}. {getQuestionPrompt(q)}
                                            </p>
                                            <p className="mt-1 text-slate-700">
                                                Your answer:{" "}
                                                <span className="font-medium">
                                                    {fb.userAnswer || "—"}
                                                </span>
                                            </p>
                                            {!fb.isCorrect && (
                                                <p className="mt-0.5 text-slate-700">
                                                    Correct:{" "}
                                                    <span className="font-medium">
                                                        {fb.correctAnswer}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </Panel>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                    href="/dashboard"
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    ← Back to Dashboard
                </a>
                <button
                    type="button"
                    onClick={onRegenerate}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                >
                    ✨ Generate New Test
                </button>
            </div>
        </div>
    );
}

function ScoreStat({ label, value, sub, tone = "sky" }) {
    const palette = {
        sky: "from-sky-50 to-white text-sky-700",
        emerald: "from-emerald-50 to-white text-emerald-700",
        slate: "from-slate-50 to-white text-slate-700",
    }[tone];
    return (
        <div
            className={`rounded-xl border border-slate-200 bg-gradient-to-br ${palette} p-4 shadow-sm`}
        >
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
    );
}
