import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import {
    academicTask1Prompts,
    generalTask1Prompts,
    getRandomPrompt,
    task2EssayPrompts,
    writingTaskConfigs
} from "../data/writingPrompts";
import { evaluateWritingSubmission } from "../services/api/writingService";

const STORAGE_KEY = "ielts-writing-history";

const criteriaDescriptions = [
    {
        key: "task",
        label: "Task Achievement / Response",
        description: "Addresses all parts of the question with clear purpose and main ideas.",
        icon: "🎯"
    },
    {
        key: "coherence",
        label: "Coherence & Cohesion",
        description: "Logical organisation, clear paragraphing, and effective linking devices.",
        icon: "🧩"
    },
    {
        key: "lexical",
        label: "Lexical Resource",
        description: "Range and accuracy of vocabulary, collocations, and tone.",
        icon: "🗂️"
    },
    {
        key: "grammar",
        label: "Grammatical Range & Accuracy",
        description: "Control of grammar structures, sentence variety, and minimal errors.",
        icon: "✍️"
    }
];

const historyLimit = 20;

const penaltyMessages = {
    wordCountCap: "Overall band capped at 5 due to being under the minimum word count.",
    offTopicCap: "Overall band capped at 4 because the response is off-topic.",
    structurePenalty: "Band reduced for missing introduction, conclusion, or unclear paragraphs.",
    grammarPenalty: "Band reduced for frequent grammar or spelling mistakes."
};

const questionPools = {
    "task1-academic": academicTask1Prompts,
    "task1-general": generalTask1Prompts,
    "task2-essay": task2EssayPrompts
};

function loadHistory() {
    if (typeof window === "undefined") {
        return [];
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (error) {
        console.warn("Failed to parse writing history", error);
        return [];
    }
}

function saveHistory(entries) {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function countWords(value = "") {
    if (!value) return 0;
    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

function formatSeconds(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function WritingPracticeView({ embedded = false }) {
    const [activeTaskId, setActiveTaskId] = useState("task1-academic");
    const [currentPrompt, setCurrentPrompt] = useState(() => getRandomPrompt("task1-academic"));
    const [sessionStatus, setSessionStatus] = useState("idle"); // idle | running | time-up | completed
    const [timeRemaining, setTimeRemaining] = useState(writingTaskConfigs["task1-academic"].durationSeconds);
    const [responseText, setResponseText] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [autoSubmitted, setAutoSubmitted] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [history, setHistory] = useState(() => loadHistory());
    const [pasteAttemptsBlocked, setPasteAttemptsBlocked] = useState(0);

    const config = writingTaskConfigs[activeTaskId];

    const wordCount = useMemo(() => countWords(responseText), [responseText]);

    useEffect(() => {
        if (sessionStatus !== "running") {
            return;
        }
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionStatus]);

    useEffect(() => {
        if (sessionStatus === "running" && timeRemaining === 0) {
            setSessionStatus("time-up");
        }
    }, [sessionStatus, timeRemaining]);

    const persistHistoryEntry = useCallback((entry) => {
        setHistory((prev) => {
            const next = [entry, ...prev].slice(0, historyLimit);
            saveHistory(next);
            // Dispatch event to update dashboards in real-time
            window.dispatchEvent(new Event('progressUpdated'));
            return next;
        });
    }, []);

    const resetSession = useCallback(
        (taskId, promptOverride) => {
            const nextPrompt = promptOverride || getRandomPrompt(taskId);
            setActiveTaskId(taskId);
            setCurrentPrompt(nextPrompt);
            setSessionStatus("idle");
            setTimeRemaining(writingTaskConfigs[taskId].durationSeconds);
            setResponseText("");
            setSubmitted(false);
            setSubmitting(false);
            setAutoSubmitted(false);
            setEvaluation(null);
            setErrorMessage(null);
            setWarnings([]);
            setPasteAttemptsBlocked(0);
        },
        []
    );

    const handleSelectTask = useCallback(
        (taskId) => {
            resetSession(taskId);
        },
        [resetSession]
    );

    const handleRefreshPrompt = useCallback(() => {
        resetSession(activeTaskId, getRandomPrompt(activeTaskId));
    }, [activeTaskId, resetSession]);

    const handleStartSession = useCallback(() => {
        if (sessionStatus === "running") return;
        setSessionStatus("running");
        setTimeRemaining(writingTaskConfigs[activeTaskId].durationSeconds);
        setSubmitted(false);
        setAutoSubmitted(false);
        setEvaluation(null);
        setWarnings([]);
        setErrorMessage(null);
    }, [sessionStatus, activeTaskId]);

    const handleSubmit = useCallback(
        async (auto = false) => {
            if (submitting || submitted) return;
            if (!responseText.trim()) {
                setErrorMessage("Please write your response before submitting.");
                return;
            }

            setSubmitting(true);
            setAutoSubmitted(auto);
            setErrorMessage(null);
            setWarnings([]);

            const wordCountNow = countWords(responseText);
            const underWordLimit = wordCountNow < config.minWords;

            const payload = {
                taskId: activeTaskId,
                taskLabel: config.label,
                promptId: currentPrompt?.id,
                promptTitle: currentPrompt?.title,
                promptText: currentPrompt?.prompt,
                questionType: currentPrompt?.questionType,
                responseText,
                wordCount: wordCountNow,
                minWords: config.minWords,
                allottedSeconds: config.durationSeconds,
                timeRemainingSeconds: timeRemaining,
                autoSubmitted: auto
            };

            try {
                const result = await evaluateWritingSubmission(payload);
                const penaltyFlags = result?.penalties || {};

                const derivedWarnings = [];
                if (underWordLimit) {
                    derivedWarnings.push("You are below the minimum word count. IELTS examiners penalise this heavily.");
                }
                Object.entries(penaltyFlags).forEach(([key, active]) => {
                    if (active && penaltyMessages[key]) {
                        derivedWarnings.push(penaltyMessages[key]);
                    }
                });

                setEvaluation(result);
                setSessionStatus("completed");
                setSubmitted(true);
                setWarnings(derivedWarnings);

                const historyEntry = {
                    id: Date.now(),
                    taskId: activeTaskId,
                    promptId: currentPrompt?.id,
                    promptTitle: currentPrompt?.title,
                    wordCount: wordCountNow,
                    overallBand: result?.overallBand ?? result?.summary?.overallBand ?? null,
                    scores: result?.scores || {},
                    submittedAt: new Date().toISOString(),
                    autoSubmitted: auto,
                    penalties: penaltyFlags
                };
                persistHistoryEntry(historyEntry);
            } catch (error) {
                console.error("Failed to evaluate writing submission", error);
                setErrorMessage(error.message || "Unable to evaluate your writing right now. Please try again.");
            } finally {
                setSubmitting(false);
            }
        },
        [
            submitting,
            submitted,
            responseText,
            config,
            activeTaskId,
            currentPrompt,
            timeRemaining,
            persistHistoryEntry
        ]
    );

    useEffect(() => {
        if (sessionStatus === "time-up" && !submitted && !submitting) {
            handleSubmit(true);
        }
    }, [sessionStatus, submitted, submitting, handleSubmit]);

    const handlePreventPaste = useCallback((event) => {
        event.preventDefault();
        setPasteAttemptsBlocked((prev) => prev + 1);
    }, []);

    const progressPercent = useMemo(() => {
        const total = config.durationSeconds;
        return ((total - timeRemaining) / total) * 100;
    }, [config.durationSeconds, timeRemaining]);

    const taskPool = questionPools[activeTaskId] || [];

    const mainContent = (
        <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-violet-50 via-white to-purple-50 min-h-screen">
            {!embedded && (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-violet-700">Writing Practice</h1>
                        <p className="text-slate-600 mt-2">
                            Complete IELTS-style tasks with strict timing, word-count checks, and AI scoring feedback.
                        </p>
                    </div>
                    <a
                        href="/dashboard"
                        className="self-start md:self-auto px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                        ← Back to Dashboard
                    </a>
                </div>
            )}

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    <Panel
                        title="Task Selection"
                        className="xl:col-span-1 bg-white/80 backdrop-blur rounded-2xl shadow-md space-y-4"
                    >
                        <div className="space-y-3">
                            {Object.values(writingTaskConfigs).map((task) => (
                                <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => handleSelectTask(task.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                                        task.id === activeTaskId
                                            ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <p className="text-sm font-semibold">{task.label}</p>
                                    <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                                </button>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                            <h3 className="text-sm font-semibold text-violet-700">Need a different prompt?</h3>
                            <p className="text-xs text-slate-500 mt-2">
                                We randomise prompts to cover different IELTS question types. Refresh to get a new prompt within the same task.
                            </p>
                            <button
                                type="button"
                                onClick={handleRefreshPrompt}
                                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                            >
                                🔄 New Prompt
                            </button>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-700">Practice tips</h3>
                            <ul className="space-y-2 text-xs text-slate-500">
                                <li>• Plan for 2–3 minutes before you start writing.</li>
                                <li>• Aim for clear paragraphs: intro, body, conclusion.</li>
                                <li>• Use a range of linking words and topic-specific vocabulary.</li>
                                <li>• Proofread in the final minute for grammar and spelling.</li>
                            </ul>
                        </div>
                    </Panel>

                    <Panel
                        title={currentPrompt?.title || config.label}
                        className="xl:col-span-3 bg-white/80 backdrop-blur rounded-2xl shadow-md space-y-6"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <TimerBadge
                                label="Time allocation"
                                value={`${Math.round(config.durationSeconds / 60)} minutes`}
                                icon="⏱️"
                            />
                            <TimerBadge
                                label="Minimum words"
                                value={`${config.minWords} words`}
                                icon="📝"
                            />
                            <TimerBadge
                                label="Question type"
                                value={currentPrompt?.questionType || "IELTS Writing"}
                                icon="🧠"
                            />
                        </div>

                        <div className="rounded-2xl border border-violet-200/70 bg-violet-50/70 p-5 space-y-3">
                            <p className="text-sm text-violet-700 font-semibold uppercase tracking-wide">Prompt</p>
                            <p className="text-slate-700 text-sm leading-relaxed">{currentPrompt?.prompt}</p>
                            {currentPrompt?.bandTips?.length ? (
                                <div className="rounded-xl border border-violet-200 bg-white/70 p-4">
                                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Band 7+ Tips</p>
                                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                                        {currentPrompt.bandTips.map((tip) => (
                                            <li key={tip}>• {tip}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
                                        <span>{sessionStatus === "running" ? "🟢 In progress" : submitted ? "✅ Completed" : "🟣 Ready"}</span>
                                        <span>•</span>
                                        <span>{formatSeconds(timeRemaining)}</span>
                                    </div>
                                    <div className="h-2 w-32 rounded-full bg-slate-200 overflow-hidden">
                                        <div
                                            className="h-full bg-violet-500 transition-[width] duration-300 ease-linear"
                                            style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleStartSession}
                                        disabled={sessionStatus === "running"}
                                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                            sessionStatus === "running"
                                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                                : "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                                        }`}
                                    >
                                        {sessionStatus === "running" ? "Timer Running" : "Start Timer"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => resetSession(activeTaskId, currentPrompt)}
                                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Reset Attempt
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={responseText}
                                    onChange={(event) => setResponseText(event.target.value)}
                                    onPaste={handlePreventPaste}
                                    disabled={submitted}
                                    placeholder="Start writing your response here. Copy-paste is disabled to encourage original writing."
                                    className="min-h-[280px] w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 text-sm leading-relaxed text-slate-700 shadow-inner focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:bg-slate-100 disabled:text-slate-500"
                                />
                                <div className="absolute bottom-3 right-4 flex items-center gap-3 text-xs text-slate-500">
                                    <span>Words: {wordCount}</span>
                                    <span>|</span>
                                    <span>{config.minWords} required</span>
                                </div>
                            </div>

                            {pasteAttemptsBlocked > 0 ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                    Copy-paste is disabled in practice mode to support original writing. Attempts blocked: {pasteAttemptsBlocked}.
                                </div>
                            ) : null}

                            {warnings.length > 0 ? (
                                <div className="space-y-3">
                                    {warnings.map((warning) => (
                                        <div
                                            key={warning}
                                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
                                        >
                                            {warning}
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {errorMessage ? (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    {errorMessage}
                                </div>
                            ) : null}

                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitted || submitting}
                                    className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
                                        submitted || submitting
                                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                    }`}
                                >
                                    {submitted ? "Submitted" : submitting ? "Evaluating..." : "Submit for Feedback"}
                                </button>
                                <p className="text-xs text-slate-500">
                                    Under official rules, Task 1 has 20 minutes and Task 2 has 40 minutes. The timer auto-locks when time expires.
                                </p>
                            </div>
                        </div>

                        {evaluation ? (
                            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/70 p-5">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">AI Evaluation</h3>
                                        <p className="text-xs text-slate-500">
                                            Powered by GPT-4o • Scores aligned with IELTS examiner criteria.
                                        </p>
                                    </div>
                                    <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                                        Overall Band: {evaluation?.overallBand ?? "—"}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                    {criteriaDescriptions.map((criterion) => (
                                        <CriteriaCard
                                            key={criterion.key}
                                            icon={criterion.icon}
                                            label={criterion.label}
                                            description={criterion.description}
                                            score={evaluation?.scores?.[criterion.key]}
                                        />
                                    ))}
                                </div>

                                {evaluation?.feedback ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(evaluation.feedback).map(([section, text]) => (
                                            <div
                                                key={section}
                                                className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700"
                                            >
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    {section.replace(/([A-Z])/g, " $1")}
                                                </p>
                                                <p className="mt-2 text-sm leading-relaxed">{text}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                {evaluation?.suggestions?.length ? (
                                    <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                                            Improvement Suggestions
                                        </p>
                                        <ul className="mt-2 space-y-2 text-sm text-slate-700">
                                            {evaluation.suggestions.map((tip) => (
                                                <li key={tip}>• {tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span>Submitted {autoSubmitted ? "(auto-submit on timer)" : ""}</span>
                                    <span>•</span>
                                    <span>{wordCount} words</span>
                                    <span>•</span>
                                    <span>{taskPool.length} prompts available in this category</span>
                                </div>
                            </div>
                        ) : null}
                    </Panel>
                </div>

                <Panel
                    title="Writing Progress"
                    className="max-w-7xl mx-auto bg-white/80 backdrop-blur rounded-2xl shadow-md space-y-6"
                >
                    {history.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-600">
                            Your future attempts will appear here with band scores and feedback summaries.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Task</th>
                                        <th className="px-4 py-3">Prompt</th>
                                        <th className="px-4 py-3">Words</th>
                                        <th className="px-4 py-3">Overall Band</th>
                                        <th className="px-4 py-3">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map((entry) => (
                                        <tr key={entry.id} className="bg-white/70 hover:bg-violet-50/60 transition-colors">
                                            <td className="px-4 py-3 text-slate-600">
                                                {new Date(entry.submittedAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {writingTaskConfigs[entry.taskId]?.label || entry.taskId}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{entry.promptTitle || "Prompt"}</td>
                                            <td className="px-4 py-3 text-slate-600">{entry.wordCount}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    {entry.overallBand ?? "—"}
                                                    {entry.autoSubmitted ? <span className="text-[10px] text-emerald-600">AUTO</span> : null}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {Object.entries(entry.penalties || {})
                                                    .filter(([, isActive]) => isActive)
                                                    .map(([key]) => penaltyMessages[key])
                                                    .join(" • ") || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>
    );

    return embedded ? mainContent : <AppLayout>{mainContent}</AppLayout>;
}

function TimerBadge({ label, value, icon }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-700">{value}</p>
                </div>
            </div>
        </div>
    );
}

function CriteriaCard({ icon, label, description, score }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <span>{icon}</span>
                    <span>{label}</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {score ?? "—"}
                </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
    );
}
