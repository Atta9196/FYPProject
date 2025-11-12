import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import {
    getRandomReadingSet,
    readingBandTable,
    readingPassageSets
} from "../data/readingPassages";

const STORAGE_KEY = "ielts-reading-history";
const TIMER_SECONDS = 60 * 60;
const HIGHLIGHT_LIMIT = 20;

const questionTypeLabels = {
    multiple: "Multiple Choice",
    "true-false-ng": "True / False / Not Given",
    "yes-no-ng": "Yes / No / Not Given",
    "match-heading": "Match Heading",
    "matching-info": "Matching Information",
    "sentence-completion": "Sentence Completion",
    "summary-completion": "Summary Completion",
    "short-answer": "Short Answer"
};

function loadHistory() {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to parse reading history", error);
        return [];
    }
}

function saveHistory(entries) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

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

function standardizeChoice(value = "") {
    const normalized = normalizeAnswer(value);
    if (["t", "true"].includes(normalized)) return "true";
    if (["f", "false"].includes(normalized)) return "false";
    if (["notgiven", "not given", "ng"].includes(normalized)) return "not given";
    if (["y", "yes"].includes(normalized)) return "yes";
    if (["n", "no"].includes(normalized)) return "no";
    return normalized;
}

function calculateBand(score) {
    const bandEntry = readingBandTable.find((entry) => score >= entry.min);
    return bandEntry ? bandEntry.band : "N/A";
}

function evaluateMultiple(question, rawAnswer) {
    const userAnswer = rawAnswer ? rawAnswer.toString().trim().toUpperCase() : "";
    const correct = question.answer?.toString().trim().toUpperCase();
    const isCorrect = userAnswer === correct;
    const selectedOption = question.options?.find((option) => option.value === correct);
    return {
        isCorrect,
        message: isCorrect ? "Correct" : "Incorrect option selected.",
        userAnswer,
        correctAnswer: selectedOption ? `${selectedOption.value}. ${selectedOption.label}` : correct || "",
        explanation: question.explanation || ""
    };
}

function evaluateTrueFalse(question, rawAnswer) {
    const userAnswer = standardizeChoice(rawAnswer);
    if (!userAnswer) {
        return {
            isCorrect: false,
            message: "No answer provided.",
            userAnswer: "",
            correctAnswer: question.answer,
            explanation: question.explanation || ""
        };
    }
    const correctAnswer = standardizeChoice(question.answer);
    const isCorrect = userAnswer === correctAnswer;
    return {
        isCorrect,
        message: isCorrect ? "Correct" : "Check the statement against the passage.",
        userAnswer,
        correctAnswer,
        explanation: question.explanation || ""
    };
}

function evaluateMatching(question, rawAnswer) {
    const userAnswer = rawAnswer ? rawAnswer.toString().trim().toUpperCase() : "";
    const correctAnswer = question.answer?.toString().trim().toUpperCase();
    const isCorrect = userAnswer === correctAnswer;
    let correctLabel = correctAnswer;
    const optionsList = question.options || [];
    const option = optionsList.find((item) => item.value.toString().toUpperCase() === correctAnswer);
    if (option) {
        correctLabel = `${option.value}. ${option.label}`;
    }
    return {
        isCorrect,
        message: isCorrect ? "Correct" : "Incorrect match.",
        userAnswer,
        correctAnswer: correctLabel,
        explanation: question.explanation || ""
    };
}

function evaluateFill(question, rawAnswer) {
    const userAnswer = rawAnswer ? rawAnswer.toString().trim() : "";
    if (!userAnswer) {
        return {
            isCorrect: false,
            message: "No answer provided.",
            userAnswer: "",
            correctAnswer: Array.isArray(question.answer) ? question.answer[0] : question.answer,
            explanation: question.explanation || ""
        };
    }

    if (question.maxWords && wordCount(userAnswer) > question.maxWords) {
        return {
            isCorrect: false,
            message: `Exceeded word limit (maximum ${question.maxWords} word${question.maxWords > 1 ? "s" : ""}).`,
            userAnswer,
            correctAnswer: Array.isArray(question.answer) ? question.answer[0] : question.answer,
            explanation: question.explanation || ""
        };
    }

    const normalizedUser = normalizeAnswer(userAnswer);
    const acceptableAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
    const isCorrect = acceptableAnswers.some((acceptable) => normalizeAnswer(acceptable) === normalizedUser);

    return {
        isCorrect,
        message: isCorrect ? "Correct" : "The wording does not match exactly.",
        userAnswer,
        correctAnswer: acceptableAnswers.join(" / "),
        explanation: question.explanation || ""
    };
}

function evaluateQuestion(question, answers) {
    switch (question.type) {
        case "multiple":
            return evaluateMultiple(question, answers[question.id]);
        case "true-false-ng":
        case "yes-no-ng":
            return evaluateTrueFalse(question, answers[question.id]);
        case "match-heading":
        case "matching-info":
            return evaluateMatching(question, answers[question.id]);
        case "sentence-completion":
        case "short-answer":
            return evaluateFill(question, answers[question.id]);
        case "summary-completion": {
            const results = {};
            let correct = 0;
            question.parts?.forEach((part) => {
                const partResult = evaluateFill(part, answers[part.id]);
                results[part.id] = partResult;
                if (partResult.isCorrect) {
                    correct += 1;
                }
            });
            return { results, correctCount: correct };
        }
        default:
            return {
                isCorrect: false,
                message: "Unsupported question type.",
                userAnswer: answers[question.id] || "",
                correctAnswer: Array.isArray(question.answer) ? question.answer[0] : question.answer
            };
    }
}

function evaluateReadingSet(readingSet, answers) {
    let correctCount = 0;
    let totalQuestions = 0;
    const questionFeedback = {};

    readingSet.questions.forEach((question) => {
        if (question.type === "summary-completion") {
            const result = evaluateQuestion(question, answers);
            question.parts?.forEach((part) => {
                const partFeedback = result.results?.[part.id] || {
                    isCorrect: false,
                    message: "No answer provided.",
                    userAnswer: "",
                    correctAnswer: Array.isArray(part.answer) ? part.answer[0] : part.answer,
                    explanation: part.explanation || ""
                };
                questionFeedback[part.id] = {
                    ...partFeedback,
                    prompt: `${question.prompt} (${part.label})`
                };
                totalQuestions += 1;
                if (partFeedback.isCorrect) {
                    correctCount += 1;
                }
            });
        } else {
            const feedback = evaluateQuestion(question, answers);
            questionFeedback[question.id] = feedback;
            totalQuestions += 1;
            if (feedback.isCorrect) {
                correctCount += 1;
            }
        }
    });

    const scaledScore = Math.round((correctCount / totalQuestions) * 40);
    const band = calculateBand(scaledScore);

    return {
        correctCount,
        totalQuestions,
        scaledScore,
        band,
        questionFeedback
    };
}

function TimerDisplay({ status, remaining }) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            <span>{status === "running" ? "🟢 In Progress" : status === "completed" ? "✅ Completed" : "🟠 Ready"}</span>
            <span>•</span>
            <span>
                {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
        </div>
    );
}

function HighlightList({ highlights, onUpdateNote, onRemove }) {
    if (highlights.length === 0) {
        return (
            <p className="text-xs text-slate-500">
                Select text inside the passage and click “Add Highlight” to track key ideas. You can annotate each highlight with a note.
            </p>
        );
    }

    return (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {highlights.map((highlight) => (
                <div key={highlight.id} className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-700 leading-snug">“{highlight.text}”</p>
                    <textarea
                        value={highlight.note}
                        onChange={(event) => onUpdateNote(highlight.id, event.target.value)}
                        placeholder="Add note (optional)"
                        className="w-full rounded-lg border border-amber-200 bg-white/90 px-2 py-1 text-xs text-slate-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{new Date(highlight.createdAt).toLocaleTimeString()}</span>
                        <button
                            type="button"
                            onClick={() => onRemove(highlight.id)}
                            className="text-amber-700 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ReadingPracticeView() {
    const availableSets = Array.isArray(readingPassageSets) ? readingPassageSets : [];
    const hasReadingSets = availableSets.length > 0;
    const [selectedSetId, setSelectedSetId] = useState(() => (hasReadingSets ? availableSets[0].id : null));
    const [activeSet, setActiveSet] = useState(() => (hasReadingSets ? availableSets[0] : null));
    const [mode, setMode] = useState("practice"); // practice | exam
    const [timerStatus, setTimerStatus] = useState("idle"); // idle | running | completed | timesup
    const [timeRemaining, setTimeRemaining] = useState(TIMER_SECONDS);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [history, setHistory] = useState(() => loadHistory());
    const [highlights, setHighlights] = useState([]);
    const [highlightError, setHighlightError] = useState(null);
    const [showDetailedResults, setShowDetailedResults] = useState(true);

    const passageRef = useRef(null);

    useEffect(() => {
        if (!hasReadingSets) {
            setActiveSet(null);
            return;
        }

        console.log("ReadingPracticeView init:", {
            availableSetsLength: availableSets.length,
            firstSetId: availableSets[0]?.id,
            selectedSetId
        });

        if (!selectedSetId) {
            const fallback = availableSets[0];
            setSelectedSetId(fallback?.id ?? null);
            setActiveSet(fallback ?? null);
            return;
        }

        const found = availableSets.find((set) => set.id === selectedSetId);
        if (found) {
            setActiveSet(found);
        } else {
            const fallback = availableSets[0] ?? null;
            setSelectedSetId(fallback?.id ?? null);
            setActiveSet(fallback);
        }
    }, [availableSets, hasReadingSets, selectedSetId]);

    useEffect(() => {
        if (timerStatus !== "running") {
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
    }, [timerStatus]);

    useEffect(() => {
        if (timerStatus === "running" && timeRemaining === 0) {
            setTimerStatus("timesup");
        }
    }, [timerStatus, timeRemaining]);

    useEffect(() => {
        if (timerStatus === "timesup" && !submitted && !submitting) {
            handleSubmit(true);
        }
    }, [timerStatus, submitted, submitting, handleSubmit]);

    useEffect(() => {
        setShowDetailedResults(mode === "practice");
    }, [mode]);

    const handleSelectSet = useCallback(
        (setId) => {
            if (!setId) return;
            setSelectedSetId(setId);
            const selected = availableSets.find((set) => set.id === setId);
            if (selected) {
                setActiveSet(selected);
            }
            setTimerStatus("idle");
            setTimeRemaining(TIMER_SECONDS);
            setAnswers({});
            setSubmitted(false);
            setSubmitting(false);
            setResults(null);
            setErrorMessage(null);
            setHighlights([]);
        },
        [availableSets]
    );

    const handleRandomSet = useCallback(() => {
        const random = getRandomReadingSet();
        if (random?.id) {
            handleSelectSet(random.id);
        }
    }, [handleSelectSet]);

    const handleModeChange = useCallback((value) => {
        setMode(value);
    }, []);

    const handleStartTest = useCallback(() => {
        if (timerStatus === "running" || !activeSet) return;
        setTimerStatus("running");
        setTimeRemaining(TIMER_SECONDS);
        setSubmitted(false);
        setSubmitting(false);
        setResults(null);
        setErrorMessage(null);
    }, [timerStatus]);

    const handleAnswerChange = useCallback((questionId, value) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: value
        }));
    }, []);

    const persistHistory = useCallback((entry) => {
        setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 20);
            saveHistory(next);
            return next;
        });
    }, []);

    const handleSubmit = useCallback(
        (auto = false) => {
            if (submitted || submitting) return;
            setSubmitting(true);
            setErrorMessage(null);

            try {
                if (!activeSet) {
                    throw new Error("No reading set selected.");
                }
                const evaluation = evaluateReadingSet(activeSet, answers);
                setResults({
                    ...evaluation,
                    autoSubmitted: auto,
                    mode
                });
                setSubmitted(true);
                setTimerStatus("completed");

                persistHistory({
                    id: Date.now(),
                    setId: activeSet.id,
                    title: activeSet.title,
                    mode,
                    correctCount: evaluation.correctCount,
                    totalQuestions: evaluation.totalQuestions,
                    scaledScore: evaluation.scaledScore,
                    band: evaluation.band,
                    submittedAt: new Date().toISOString(),
                    autoSubmitted: auto,
                    timeRemaining
                });
            } catch (error) {
                console.error("Failed to evaluate reading set", error);
                setErrorMessage("Unable to evaluate answers right now. Please try again.");
            } finally {
                setSubmitting(false);
            }
        },
        [submitted, submitting, activeSet, answers, mode, persistHistory, timeRemaining]
    );

    const handleAddHighlight = useCallback(() => {
        setHighlightError(null);
        if (!passageRef.current) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            setHighlightError("Select text within the passage first.");
            return;
        }
        const text = selection.toString().trim();
        if (!text) {
            setHighlightError("Select a portion of text to highlight.");
            return;
        }
        const range = selection.getRangeAt(0);
        if (!passageRef.current.contains(range.commonAncestorContainer)) {
            setHighlightError("Highlights must be created from the passage content.");
            return;
        }
        if (highlights.length >= HIGHLIGHT_LIMIT) {
            setHighlightError("Highlight limit reached. Remove an existing highlight to add more.");
            return;
        }
        const highlight = {
            id: `highlight_${Date.now()}`,
            text,
            note: "",
            createdAt: Date.now()
        };
        setHighlights((prev) => [highlight, ...prev]);
        selection.removeAllRanges();
    }, [highlights.length]);

    const handleUpdateHighlightNote = useCallback((highlightId, note) => {
        setHighlights((prev) =>
            prev.map((highlight) => (highlight.id === highlightId ? { ...highlight, note } : highlight))
        );
    }, []);

    const handleRemoveHighlight = useCallback((highlightId) => {
        setHighlights((prev) => prev.filter((highlight) => highlight.id !== highlightId));
    }, []);

    const totalQuestions = useMemo(() => {
        if (!activeSet) return 0;
        return activeSet.questions.reduce((count, question) => {
            if (question.type === "summary-completion") {
                return count + (question.parts?.length || 0);
            }
            return count + 1;
        }, 0);
    }, [activeSet]);

    const questionFeedback = results?.questionFeedback || {};

    const renderOptions = (question) => {
        if (!activeSet) return [];
        if (question.type === "match-heading" && question.optionsSource) {
            const passage = activeSet.passages.find((p) => p.id === question.optionsSource);
            if (passage?.headingOptions) {
                return passage.headingOptions;
            }
        }
        return question.options || [];
    };

    if (!hasReadingSets || !activeSet) {
        return (
            <AppLayout>
                <div className="p-6 md:p-10 lg:p-12 bg-gradient-to-br from-amber-50 via-white to-yellow-50 min-h-screen">
                    <Panel className="max-w-4xl mx-auto bg-white/90 backdrop-blur space-y-4">
                        <h1 className="text-3xl font-extrabold text-amber-700 text-center">Reading Practice</h1>
                        <p className="text-slate-600 text-sm md:text-base text-center">
                            Reading materials failed to load. Please refresh the page. If the issue persists, ensure that the reading
                            dataset is bundled correctly.
                        </p>
                        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left text-xs text-amber-700 space-y-2">
                            <p className="font-semibold uppercase tracking-wide">Debug Information</p>
                            <p>availableSets length: {availableSets.length}</p>
                            <p>hasReadingSets: {String(hasReadingSets)}</p>
                            <p>selectedSetId: {selectedSetId ?? "null"}</p>
                            <p>activeSet: {activeSet ? activeSet.id : "null"}</p>
                        </div>
                    </Panel>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-amber-50 via-white to-yellow-50 min-h-screen">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-amber-700">Reading Practice</h1>
                        <p className="text-slate-600 mt-2">
                            Simulate IELTS Reading with a strict 60-minute timer, question variety, automatic scoring, and review tools.
                        </p>
                    </div>
                    <a
                        href="/dashboard"
                        className="self-start md:self-auto px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                        ← Back to Dashboard
                    </a>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    <Panel title="Test Controls" className="space-y-5 bg-white/80 backdrop-blur rounded-2xl shadow-md">
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Select Set</p>
                            <div className="space-y-2">
                                {availableSets.map((set) => (
                                    <button
                                        key={set.id}
                                        type="button"
                                        onClick={() => handleSelectSet(set.id)}
                                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                                            set.id === activeSet.id
                                                ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span className="font-semibold">{set.title}</span>
                                        <span className="block text-xs text-slate-500 mt-1">{set.description}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleRandomSet}
                                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
                            >
                                🔀 Random Set
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Mode</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleModeChange("practice")}
                                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                                        mode === "practice"
                                            ? "bg-emerald-600 text-white shadow-sm"
                                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    Practice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleModeChange("exam")}
                                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                                        mode === "exam"
                                            ? "bg-slate-800 text-white shadow-sm"
                                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    Exam
                            </button>
                            </div>
                            <p className="text-xs text-slate-500">
                                Practice mode unlocks explanations after submission. Exam mode hides feedback until you finish.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Highlights & Notes</p>
                            <HighlightList
                                highlights={highlights}
                                onUpdateNote={handleUpdateHighlightNote}
                                onRemove={handleRemoveHighlight}
                            />
                            {highlightError ? (
                                <p className="text-[11px] text-rose-600">{highlightError}</p>
                            ) : null}
                            <button
                                type="button"
                                onClick={handleAddHighlight}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                            >
                                ✏️ Add Highlight
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Timing Guidance</p>
                            <ul className="space-y-1 text-xs text-slate-500">
                                <li>• Total time: 60 minutes</li>
                                <li>• No extra transfer time — answers lock at 00:00</li>
                                <li>• Each question is worth one mark</li>
                                <li>• Aim for ~20 minutes per passage</li>
                            </ul>
                        </div>
                    </Panel>

                    <Panel
                        title={activeSet.title}
                        className="xl:col-span-3 space-y-6 bg-white/85 backdrop-blur rounded-2xl shadow-md"
                    >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <TimerDisplay status={timerStatus} remaining={timeRemaining} />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleStartTest}
                                    disabled={timerStatus === "running"}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                        timerStatus === "running"
                                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                            : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                                    }`}
                                >
                                    {timerStatus === "running" ? "Timer Running" : "Start 60-minute Timer"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectSet(activeSet.id)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Reset Attempt
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDetailedResults((prev) => !prev)}
                                    disabled={!results || mode === "practice"}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                        !results || mode === "practice"
                                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                            : showDetailedResults
                                            ? "bg-slate-800 text-white hover:bg-slate-900"
                                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    {showDetailedResults ? "Hide Review" : "Reveal Answers"}
                                </button>
                            </div>
                        </div>

                        {errorMessage ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {errorMessage}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div ref={passageRef} className="space-y-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                                {activeSet.passages.map((passage) => (
                                    <div key={passage.id} className="space-y-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-amber-600">{passage.label}</p>
                                            <h3 className="text-lg font-semibold text-amber-800">{passage.title}</h3>
                                        </div>
                                        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
                                            {passage.paragraphs.map((paragraph) => (
                                                <p key={paragraph.id}>
                                                    <span className="font-semibold text-amber-700">{paragraph.id}</span> {paragraph.text}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white/80 p-5">
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                    Questions ({totalQuestions} items)
                                </p>
                                <div className="space-y-4">
                                    {activeSet.questions.map((question, index) => {
                                        if (question.type === "summary-completion") {
                                            return (
                                                <div key={question.id} className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3 shadow-sm">
                                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                Q{index + 1}. {question.prompt}
                                                            </p>
                                                            {question.instructions ? (
                                                                <p className="text-xs text-slate-500 mt-1">{question.instructions}</p>
                                                            ) : null}
                                                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                                                {questionTypeLabels[question.type]}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {question.parts?.map((part, partIndex) => {
                                                            const feedback = questionFeedback[part.id];
                                                            return (
                                                                <div key={part.id} className="space-y-2">
                                                                    <label className="text-xs font-semibold text-slate-600">
                                                                        {part.label} ({question.prompt.split(".")[0]} — blank {partIndex + 1})
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={answers[part.id] ?? ""}
                                                                        onChange={(event) => handleAnswerChange(part.id, event.target.value)}
                                                                        disabled={submitted}
                                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                                                                        placeholder="Type your answer"
                                                                    />
                                                                    {showDetailedResults && submitted && feedback ? (
                                                                        <QuestionFeedback feedback={feedback} />
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const feedback = questionFeedback[question.id];
                                        const options = renderOptions(question);

                                        return (
                                            <div key={question.id} className="rounded-xl border border-slate-200 bg-white/90 p-4 space-y-3 shadow-sm">
                                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            Q{index + 1}. {question.prompt}
                                                        </p>
                                                        {question.instructions ? (
                                                            <p className="text-xs text-slate-500 mt-1">{question.instructions}</p>
                                                        ) : null}
                                                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                                            {questionTypeLabels[question.type] || "Question"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {["multiple", "match-heading", "matching-info"].includes(question.type) ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {options.map((option) => (
                                                            <label
                                                                key={option.value}
                                                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                                                    answers[question.id] === option.value
                                                                        ? "border-amber-400 bg-amber-50 text-amber-700"
                                                                        : "border-slate-200 hover:bg-slate-50"
                                                                } ${submitted ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={question.id}
                                                                    value={option.value}
                                                                    disabled={submitted}
                                                                    checked={answers[question.id] === option.value}
                                                                    onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                                                                    className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                                                                />
                                                                <span className="font-semibold text-slate-700">{option.value}.</span>
                                                                <span className="text-slate-600">{option.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={answers[question.id] ?? ""}
                                                        onChange={(event) => handleAnswerChange(question.id, event.target.value)}
                                                        disabled={submitted}
                                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-amber-500 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                                                        placeholder="Type your answer"
                                                    />
                                                )}

                                                {showDetailedResults && submitted && feedback ? (
                                                    <QuestionFeedback feedback={feedback} />
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>

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
                                        {submitted ? "Submitted" : submitting ? "Evaluating..." : "Submit Answers"}
                                    </button>
                                    <p className="text-xs text-slate-500">
                                        IELTS Reading has no extra transfer time — answers auto-submit when the timer reaches zero.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {results ? (
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/85 p-5">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">Test Summary</h3>
                                        <p className="text-xs text-slate-500">
                                            Mode: {mode === "practice" ? "Practice (feedback unlocked)" : "Exam (feedback restricted)"}
                                        </p>
                                    </div>
                                    <div className="inline-flex items-center gap-3">
                                        <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                                            Correct: {results.correctCount} / {results.totalQuestions}
                                        </span>
                                        <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                                            Scaled: {results.scaledScore} / 40
                                        </span>
                                        <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                                            Band: {results.band}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {results.autoSubmitted
                                        ? "Auto-submitted when the timer expired."
                                        : "Submitted manually before time elapsed."}{" "}
                                    {mode === "exam" && !showDetailedResults
                                        ? "Review remains hidden — use the 'Reveal Answers' button to inspect feedback."
                                        : ""}
                                </p>
                            </div>
                        ) : null}
                    </Panel>
                </div>

                <Panel
                    title="Reading Progress"
                    className="max-w-7xl mx-auto space-y-6 bg-white/80 backdrop-blur rounded-2xl shadow-md"
                >
                    {history.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-600">
                            Complete a reading attempt to start tracking your progress over time.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Set</th>
                                        <th className="px-4 py-3">Mode</th>
                                        <th className="px-4 py-3">Correct</th>
                                        <th className="px-4 py-3">Scaled Score</th>
                                        <th className="px-4 py-3">Band</th>
                                        <th className="px-4 py-3">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map((entry) => (
                                        <tr key={entry.id} className="bg-white/70 hover:bg-amber-50/60 transition-colors">
                                            <td className="px-4 py-3 text-slate-600">
                                                {new Date(entry.submittedAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{entry.title}</td>
                                            <td className="px-4 py-3 text-slate-600 capitalize">{entry.mode}</td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {entry.correctCount}/{entry.totalQuestions}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{entry.scaledScore}/40</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    {entry.band}
                                                    {entry.autoSubmitted ? <span className="text-[10px] text-emerald-600">AUTO</span> : null}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {entry.mode === "exam" ? "Exam mode attempt" : "Practice review completed"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>
        </AppLayout>
    );
}

function QuestionFeedback({ feedback }) {
    if (!feedback) return null;
    return (
        <div
            className={`rounded-lg border px-3 py-2 text-xs ${
                feedback.isCorrect
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
        >
            <p className="font-semibold">{feedback.isCorrect ? "Correct" : "Incorrect"}</p>
            {!feedback.isCorrect && feedback.userAnswer ? (
                <p className="mt-1 text-slate-700">
                    Your answer: <span className="font-medium">{feedback.userAnswer}</span>
                </p>
            ) : null}
            <p className="mt-1 text-slate-700">
                Correct answer: <span className="font-medium">{feedback.correctAnswer}</span>
            </p>
            {feedback.explanation ? (
                <p className="mt-1 text-slate-600">{feedback.explanation}</p>
            ) : null}
        </div>
    );
}
