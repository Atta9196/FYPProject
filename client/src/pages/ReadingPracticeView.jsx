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
import {
    TIMER_SECONDS,
    PASSAGE_ORDER,
    QUESTION_TYPE_LABELS,
} from "../features/reading/readingConstants";
import { scoreReadingObjective, getQuestionsForPassage } from "../features/reading/readingScoring";
import {
    loadReadingSession,
    saveReadingSession,
    clearReadingSession,
} from "../features/reading/readingSessionStorage";

const API_BASE_URL =
    import.meta.env?.VITE_API_BASE_URL || "https://ielts-coach-backend.onrender.com";

function getStorageKey(userId) {
    return getStorageKeyForModule("reading", userId) || "ielts-reading-history";
}

function loadHistory(userId) {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(getStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveHistory(entries, userId) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(entries));
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function TimerBar({ remaining, status }) {
    const pct = Math.round((remaining / TIMER_SECONDS) * 100);
    const urgent = remaining <= 300;
    return (
        <div className={`sticky top-0 z-30 border-b ${urgent ? "border-rose-300 bg-rose-50" : "border-amber-200 bg-white/95"} backdrop-blur px-4 py-3 shadow-sm`}>
            <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">IELTS Academic Reading</p>
                    <p className="text-sm font-semibold text-slate-800">60 minutes · 40 questions · 3 passages</p>
                </div>
                <div className={`text-2xl font-mono font-bold ${urgent ? "text-rose-700" : "text-amber-700"}`}>
                    {formatTime(remaining)}
                </div>
                <div className="w-full sm:w-48 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                        className={`h-full transition-all ${urgent ? "bg-rose-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <span className="text-xs font-medium text-slate-600">
                    {status === "running" ? "In progress" : status === "completed" ? "Completed" : "Ready"}
                </span>
            </div>
        </div>
    );
}

function QuestionField({ question, passage, answers, onChange, disabled, feedback }) {
    const options =
        question.type === "match-heading" && passage?.headingOptions?.length
            ? passage.headingOptions
            : question.type === "matching-features" && passage?.featureOptions?.length
            ? passage.featureOptions
            : question.options || [];

    const choiceTypes = [
        "multiple",
        "match-heading",
        "matching-info",
        "matching-features",
        "true-false-ng",
        "yes-no-ng",
    ];

    if (question.type === "summary-completion" && question.parts?.length) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-slate-700">{question.prompt}</p>
                {question.instructions && (
                    <p className="text-xs font-medium text-amber-700">{question.instructions}</p>
                )}
                {question.parts.map((part) => (
                    <div key={part.id} className="space-y-1">
                        <label className="text-sm font-semibold text-slate-800">
                            {part.number}. {part.prompt}
                        </label>
                        <input
                            type="text"
                            value={answers[part.id] ?? ""}
                            onChange={(e) => onChange(part.id, e.target.value)}
                            disabled={disabled}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-slate-100"
                            placeholder={part.maxWords ? `Max ${part.maxWords} word(s)` : "Your answer"}
                        />
                        {feedback?.[part.id] && (
                            <ReviewLine feedback={feedback[part.id]} />
                        )}
                    </div>
                ))}
            </div>
        );
    }

    const fb = feedback?.[question.id];

    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">
                {question.number}. {question.prompt}
            </p>
            {question.instructions && (
                <p className="text-xs font-medium text-amber-700">{question.instructions}</p>
            )}
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
                {QUESTION_TYPE_LABELS[question.type] || question.type}
            </p>

            {choiceTypes.includes(question.type) ? (
                <div className="space-y-2">
                    {(question.type === "true-false-ng"
                        ? [
                              { value: "true", label: "TRUE" },
                              { value: "false", label: "FALSE" },
                              { value: "not given", label: "NOT GIVEN" },
                          ]
                        : question.type === "yes-no-ng"
                        ? [
                              { value: "yes", label: "YES" },
                              { value: "no", label: "NO" },
                              { value: "not given", label: "NOT GIVEN" },
                          ]
                        : options
                    ).map((opt) => (
                        <label
                            key={opt.value}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                                answers[question.id] === opt.value
                                    ? "border-amber-400 bg-amber-50"
                                    : "border-slate-200 hover:bg-slate-50"
                            } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            <input
                                type="radio"
                                name={question.id}
                                value={opt.value}
                                checked={answers[question.id] === opt.value}
                                onChange={(e) => onChange(question.id, e.target.value)}
                                disabled={disabled}
                                className="text-amber-600"
                            />
                            <span className="font-semibold text-slate-700">{opt.value}.</span>
                            <span className="text-slate-600">{opt.label}</span>
                        </label>
                    ))}
                </div>
            ) : (
                <input
                    type="text"
                    value={answers[question.id] ?? ""}
                    onChange={(e) => onChange(question.id, e.target.value)}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-slate-100"
                    placeholder={question.maxWords ? `Max ${question.maxWords} word(s)` : "Your answer"}
                />
            )}
            {fb && <ReviewLine feedback={fb} />}
        </div>
    );
}

function ReviewLine({ feedback }) {
    return (
        <div
            className={`rounded-lg border px-3 py-2 text-xs ${
                feedback.isCorrect
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
        >
            <p className="font-semibold">{feedback.isCorrect ? "Correct" : "Incorrect"}</p>
            <p>Your answer: {feedback.userAnswer || "—"}</p>
            <p>Correct answer: {feedback.correctAnswer}</p>
            {feedback.reference && <p className="mt-1 italic">Reference: “{feedback.reference}”</p>}
            {feedback.explanation && <p className="mt-1">{feedback.explanation}</p>}
        </div>
    );
}

export function ReadingPracticeView({ embedded = false, onReady }) {
    const { user } = useAuth();
    const userId = user?.email || user?.id || null;

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activeSet, setActiveSet] = useState(null);
    const [activePassageId, setActivePassageId] = useState("passage-1");
    const [answers, setAnswers] = useState({});
    const [timerStatus, setTimerStatus] = useState("idle");
    const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
    const [timeSpentSec, setTimeSpentSec] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [history, setHistory] = useState(() => loadHistory(userId));
    const [view, setView] = useState("exam");

    const timerStartedRef = useRef(null);

    useEffect(() => {
        setHistory(loadHistory(userId));
    }, [userId]);

    const applyReadingSet = useCallback(
        (readingSet, restoreSession = null) => {
            setActiveSet(readingSet);
            setActivePassageId(restoreSession?.activePassageId || "passage-1");
            setAnswers(restoreSession?.answers || {});
            setTimeRemaining(restoreSession?.timeRemaining ?? TIMER_SECONDS);
            setTimeSpentSec(restoreSession?.timeSpentSec || 0);
            setTimerStatus(restoreSession?.timerStatus || "idle");
            setSubmitted(false);
            setSubmitting(false);
            setResults(null);
            setView("exam");
            setErrorMessage(null);
            timerStartedRef.current = restoreSession?.timerStartedAt || null;
            if (embedded && typeof onReady === "function") onReady();
        },
        [embedded, onReady]
    );

    const loadAIGeneratedReading = useCallback(
        async ({ force = false } = {}) => {
            try {
                setGenerating(true);
                setErrorMessage(null);

                if (!force) {
                    const cached = await getCachedGeneration("reading");
                    if (cached?.readingSet) {
                        const session = loadReadingSession(userId);
                        const restore =
                            session?.setId === cached.readingSet.id ? session : null;
                        applyReadingSet(cached.readingSet, restore);
                        return;
                    }
                } else {
                    await clearCachedGeneration("reading");
                    clearReadingSession(userId);
                }

                const response = await fetch(`${API_BASE_URL}/api/reading/generate`);
                const data = await response.json();

                if (data.success && data.readingSet) {
                    applyReadingSet(data.readingSet);
                    saveCachedGeneration("reading", { readingSet: data.readingSet });
                } else {
                    throw new Error(data.error || "Failed to generate reading test");
                }
            } catch (error) {
                console.error("Reading generation error:", error);
                if (force) {
                    const fallback = await getCachedGeneration("reading");
                    if (fallback?.readingSet) {
                        applyReadingSet(fallback.readingSet);
                        setErrorMessage("Could not generate a new test. Showing your previous test.");
                        return;
                    }
                }
                setErrorMessage("Failed to generate reading test. Please try again.");
            } finally {
                setGenerating(false);
                setLoading(false);
            }
        },
        [applyReadingSet, userId]
    );

    useEffect(() => {
        loadAIGeneratedReading();
    }, [loadAIGeneratedReading]);

    // Timer tick
    useEffect(() => {
        if (timerStatus !== "running") return;
        const interval = setInterval(() => {
            setTimeRemaining((prev) => Math.max(0, prev - 1));
            setTimeSpentSec((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timerStatus]);

    useEffect(() => {
        if (timerStatus === "running" && timeRemaining === 0) {
            setTimerStatus("timesup");
        }
    }, [timerStatus, timeRemaining]);

    // Persist session while exam in progress
    useEffect(() => {
        if (!activeSet || submitted) return;
        saveReadingSession(userId, {
            setId: activeSet.id,
            answers,
            activePassageId,
            timeRemaining,
            timeSpentSec,
            timerStatus,
            timerStartedAt: timerStartedRef.current,
        });
    }, [activeSet, answers, activePassageId, timeRemaining, timeSpentSec, timerStatus, submitted, userId]);

    const handleStart = () => {
        if (!activeSet || timerStatus === "running") return;
        setTimerStatus("running");
        timerStartedRef.current = Date.now();
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const persistHistory = useCallback(
        (entry) => {
            setHistory((prev) => {
                const next = [entry, ...prev].slice(0, 20);
                saveHistory(next, userId);
                window.dispatchEvent(new Event("progressUpdated"));
                return next;
            });
        },
        [userId]
    );

    const handleSubmit = useCallback(
        async (auto = false) => {
            if (submitted || submitting || !activeSet) return;
            setSubmitting(true);
            setErrorMessage(null);

            try {
                const spent = TIMER_SECONDS - timeRemaining;
                let evaluation = scoreReadingObjective(activeSet, answers);

                try {
                    const response = await fetch(`${API_BASE_URL}/api/reading/score`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            readingSet: activeSet,
                            answers,
                            timeSpentSec: spent,
                        }),
                    });
                    if (response.ok) {
                        const server = await response.json();
                        if (server?.success) evaluation = { ...evaluation, ...server };
                    }
                } catch (err) {
                    console.warn("Server scoring unavailable, using local scoring", err);
                }

                setResults({ ...evaluation, autoSubmitted: auto, timeSpentSec: spent });
                setSubmitted(true);
                setTimerStatus("completed");
                setView("results");
                clearReadingSession(userId);

                persistHistory({
                    id: Date.now(),
                    setId: activeSet.id,
                    title: activeSet.title,
                    correctCount: evaluation.correctCount,
                    wrongCount: evaluation.wrongCount,
                    totalQuestions: evaluation.totalQuestions,
                    band: evaluation.band,
                    bandScore: evaluation.band,
                    accuracyPercent: evaluation.accuracyPercent,
                    timeSpentSec: spent,
                    weakQuestionTypes: evaluation.weakQuestionTypes || [],
                    strongQuestionTypes: evaluation.strongQuestionTypes || [],
                    submittedAt: new Date().toISOString(),
                    autoSubmitted: auto,
                });
            } catch (err) {
                console.error(err);
                setErrorMessage("Unable to score your test. Please try again.");
            } finally {
                setSubmitting(false);
            }
        },
        [submitted, submitting, activeSet, answers, timeRemaining, userId, persistHistory]
    );

    useEffect(() => {
        if (timerStatus === "timesup" && !submitted && !submitting) {
            handleSubmit(true);
        }
    }, [timerStatus, submitted, submitting, handleSubmit]);

    const activePassage = useMemo(
        () => activeSet?.passages?.find((p) => p.id === activePassageId),
        [activeSet, activePassageId]
    );

    const passageQuestions = useMemo(
        () => (activeSet ? getQuestionsForPassage(activeSet, activePassageId) : []),
        [activeSet, activePassageId]
    );

    const passageIndex = PASSAGE_ORDER.indexOf(activePassageId);

    const answeredCount = useMemo(() => {
        if (!activeSet) return 0;
        const evalPreview = scoreReadingObjective(activeSet, answers);
        return Object.values(answers).filter((v) => String(v || "").trim()).length;
    }, [activeSet, answers]);

    if (!activeSet) {
        const loadingContent = (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-6">
                <Panel className="max-w-lg text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto" />
                    <h1 className="text-2xl font-bold text-amber-700">Generating Reading Test</h1>
                    <p className="text-slate-600 text-sm">
                        {generating
                            ? "AI is building your official-format Academic Reading test (3 passages, 40 questions)..."
                            : "Loading..."}
                    </p>
                    {errorMessage && <p className="text-rose-600 text-sm">{errorMessage}</p>}
                    <button
                        type="button"
                        onClick={() => loadAIGeneratedReading({ force: true })}
                        className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
                    >
                        Retry Generation
                    </button>
                </Panel>
            </div>
        );
        return embedded ? loadingContent : <AppLayout>{loadingContent}</AppLayout>;
    }

    if (view === "results" && results) {
        const reviewItems = results.items || scoreReadingObjective(activeSet, answers).items;
        const feedback = results.questionFeedback || {};

        const resultsContent = (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-4 md:p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-extrabold text-amber-700">Reading Test Results</h1>
                        <p className="text-slate-600">{activeSet.title}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { label: "Correct", value: results.correctCount, tone: "emerald" },
                            { label: "Incorrect", value: results.wrongCount, tone: "rose" },
                            { label: "IELTS Band", value: results.band, tone: "amber" },
                            { label: "Accuracy", value: `${results.accuracyPercent}%`, tone: "blue" },
                            { label: "Time Used", value: formatTime(results.timeSpentSec || 0), tone: "slate" },
                            { label: "Total Questions", value: results.totalQuestions, tone: "slate" },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
                            >
                                <p className="text-xs uppercase text-slate-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {(results.strongQuestionTypes?.length > 0 || results.weakQuestionTypes?.length > 0) && (
                        <Panel title="Question Type Analysis" className="bg-white/90">
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="font-semibold text-emerald-700 mb-2">Strong areas</p>
                                    <ul className="list-disc pl-5 text-slate-700 space-y-1">
                                        {(results.strongQuestionTypes || []).map((t) => (
                                            <li key={t}>{QUESTION_TYPE_LABELS[t] || t}</li>
                                        ))}
                                        {!results.strongQuestionTypes?.length && <li>—</li>}
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-semibold text-rose-700 mb-2">Weak areas</p>
                                    <ul className="list-disc pl-5 text-slate-700 space-y-1">
                                        {(results.weakQuestionTypes || []).map((t) => (
                                            <li key={t}>{QUESTION_TYPE_LABELS[t] || t}</li>
                                        ))}
                                        {!results.weakQuestionTypes?.length && <li>—</li>}
                                    </ul>
                                </div>
                            </div>
                        </Panel>
                    )}

                    <Panel title="Question-by-Question Review" className="bg-white/90">
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {reviewItems.map((item) => {
                                const fb = feedback[item.id];
                                return (
                                    <div
                                        key={item.id}
                                        className={`rounded-lg border p-4 ${
                                            fb?.isCorrect
                                                ? "border-emerald-200 bg-emerald-50/50"
                                                : "border-rose-200 bg-rose-50/50"
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-slate-800">
                                            Q{item.number}. {item.prompt}
                                        </p>
                                        <p className="text-[10px] uppercase text-slate-400 mt-1">
                                            {QUESTION_TYPE_LABELS[item.questionType] || item.questionType}
                                        </p>
                                        {fb && <ReviewLine feedback={fb} />}
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>

                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            type="button"
                            onClick={() => loadAIGeneratedReading({ force: true })}
                            disabled={generating}
                            className="px-5 py-2.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50"
                        >
                            {generating ? "Generating..." : "New AI Test"}
                        </button>
                        {!embedded && (
                            <a
                                href="/dashboard"
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                            >
                                Back to Dashboard
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
        return embedded ? resultsContent : <AppLayout>{resultsContent}</AppLayout>;
    }

    const examContent = (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 flex flex-col">
            <TimerBar remaining={timeRemaining} status={timerStatus} />

            {!embedded && (
                <div className="px-4 py-3 max-w-[1600px] mx-auto w-full flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-amber-700">IELTS Academic Reading</h1>
                        <p className="text-sm text-slate-600">{activeSet.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {timerStatus !== "running" && (
                            <button
                                type="button"
                                onClick={handleStart}
                                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
                            >
                                Start 60-Minute Timer
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => loadAIGeneratedReading({ force: true })}
                            disabled={generating || timerStatus === "running"}
                            className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 disabled:opacity-50"
                        >
                            {generating ? "Generating..." : "New Test"}
                        </button>
                        {!embedded && (
                            <a
                                href="/dashboard"
                                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
                            >
                                Dashboard
                            </a>
                        )}
                    </div>
                </div>
            )}

            {errorMessage && (
                <div className="mx-4 max-w-[1600px] lg:mx-auto w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                    {errorMessage}
                </div>
            )}

            {/* Passage tabs */}
            <div className="px-4 max-w-[1600px] mx-auto w-full flex gap-2 border-b border-slate-200 pb-0">
                {PASSAGE_ORDER.map((pid, idx) => {
                    const passage = activeSet.passages.find((p) => p.id === pid);
                    return (
                        <button
                            key={pid}
                            type="button"
                            onClick={() => setActivePassageId(pid)}
                            className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                                activePassageId === pid
                                    ? "border-amber-600 text-amber-700 bg-white"
                                    : "border-transparent text-slate-500 hover:text-amber-600"
                            }`}
                        >
                            {passage?.label || `Passage ${idx + 1}`}
                        </button>
                    );
                })}
                <span className="ml-auto self-center text-xs text-slate-500">
                    {answeredCount} answers entered
                </span>
            </div>

            {/* Split exam layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-[1600px] mx-auto w-full min-h-0">
                {/* Left: Passage */}
                <div className="border-r border-slate-200 bg-amber-50/40 overflow-y-auto max-h-[calc(100vh-220px)] p-5">
                    {activePassage && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-amber-600">
                                    {activePassage.label}
                                </p>
                                <h2 className="text-lg font-bold text-amber-900">{activePassage.title}</h2>
                            </div>
                            <div className="space-y-3 text-sm leading-relaxed text-slate-800">
                                {activePassage.paragraphs?.map((para) => (
                                    <p key={para.id}>
                                        <span className="font-bold text-amber-700 mr-1">{para.id}</span>
                                        {para.text}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Questions */}
                <div className="bg-white overflow-y-auto max-h-[calc(100vh-220px)] p-5 space-y-6">
                    {passageQuestions.map((question) => (
                        <div
                            key={question.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <QuestionField
                                question={question}
                                passage={activePassage}
                                answers={answers}
                                onChange={handleAnswerChange}
                                disabled={submitted}
                                feedback={null}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom navigation */}
            <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-4 shadow-lg">
                <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={passageIndex <= 0}
                        onClick={() => setActivePassageId(PASSAGE_ORDER[passageIndex - 1])}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                        ← Previous Passage
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                        Passage {passageIndex + 1} of 3 · Questions{" "}
                        {passageIndex === 0 ? "1–13" : passageIndex === 1 ? "14–26" : "27–40"}
                    </p>
                    <div className="flex gap-2">
                        {passageIndex < PASSAGE_ORDER.length - 1 && (
                            <button
                                type="button"
                                onClick={() => setActivePassageId(PASSAGE_ORDER[passageIndex + 1])}
                                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900"
                            >
                                Next Passage →
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleSubmit(false)}
                            disabled={submitted || submitting}
                            className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {submitting ? "Submitting..." : "Submit Test"}
                        </button>
                    </div>
                </div>
            </div>

            {!embedded && history.length > 0 && (
                <div className="p-4 max-w-[1600px] mx-auto w-full pb-8">
                    <Panel title="Recent Attempts" className="bg-white/80">
                        <div className="overflow-x-auto text-sm">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="text-left text-xs uppercase text-slate-500 border-b">
                                        <th className="py-2 pr-4">Date</th>
                                        <th className="py-2 pr-4">Band</th>
                                        <th className="py-2 pr-4">Score</th>
                                        <th className="py-2 pr-4">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.slice(0, 5).map((h) => (
                                        <tr key={h.id} className="border-b border-slate-100">
                                            <td className="py-2 pr-4 text-slate-600">
                                                {new Date(h.submittedAt).toLocaleString()}
                                            </td>
                                            <td className="py-2 pr-4 font-semibold text-amber-700">{h.band}</td>
                                            <td className="py-2 pr-4">
                                                {h.correctCount}/{h.totalQuestions}
                                            </td>
                                            <td className="py-2 pr-4">{formatTime(h.timeSpentSec || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </div>
            )}
        </div>
    );

    return embedded ? examContent : <AppLayout>{examContent}</AppLayout>;
}
