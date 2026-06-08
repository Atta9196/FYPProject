"use strict";

const { readingScoreToBand } = require("../constants/ieltsReadingExam");

function normaliseText(value = "") {
  return String(value)
    .trim()
    .replace(/[""'']/g, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function standardiseTfNg(value = "") {
  const n = normaliseText(value);
  if (["t", "true"].includes(n)) return "true";
  if (["f", "false"].includes(n)) return "false";
  if (["ng", "not given", "notgiven"].includes(n)) return "not given";
  if (["y", "yes"].includes(n)) return "yes";
  if (["n", "no"].includes(n)) return "no";
  return n;
}

function countWords(value = "") {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function formatExpected(item) {
  if (Array.isArray(item.expected)) {
    return item.expected.filter(Boolean).join(" / ");
  }
  if (item.options?.length) {
    const upper = String(item.expected || "").trim().toUpperCase();
    const found = item.options.find(
      (o) => String(o.value || "").toUpperCase() === upper
    );
    if (found) return `${found.value}. ${found.label}`;
  }
  return item.expected == null ? "" : String(item.expected);
}

function isFillType(type) {
  return ["sentence-completion", "short-answer", "summary-completion", "fill"].includes(
    type
  );
}

function compareChoice(given, expected) {
  const g = standardiseTfNg(given);
  const e = standardiseTfNg(expected);
  if (!g || !e) return false;
  return g === e;
}

function compareFill(given, expected) {
  const user = normaliseText(given);
  if (!user) return false;
  const acceptable = Array.isArray(expected) ? expected : [expected];
  return acceptable.some((a) => normaliseText(a) === user);
}

function flattenQuestions(readingSet) {
  const items = [];
  for (const question of readingSet.questions || []) {
    if (question.type === "summary-completion" && Array.isArray(question.parts)) {
      question.parts.forEach((part) => {
        items.push({
          id: part.id,
          number: part.number,
          type: "summary-completion",
          prompt: part.prompt || question.prompt,
          expected: part.answer,
          options: null,
          maxWords: part.maxWords,
          explanation: part.explanation || question.explanation,
          reference: part.reference || question.reference,
          questionType: "summary-completion",
        });
      });
    } else {
      items.push({
        id: question.id,
        number: question.number,
        type: question.type,
        prompt: question.prompt,
        expected: question.answer,
        options: question.options || null,
        maxWords: question.maxWords,
        explanation: question.explanation,
        reference: question.reference,
        questionType: question.type,
      });
    }
  }
  return items.sort((a, b) => (a.number || 0) - (b.number || 0));
}

function scoreReadingObjective(readingSet, answers = {}) {
  const items = flattenQuestions(readingSet);
  const questionFeedback = {};
  let correctCount = 0;

  for (const item of items) {
    const given = typeof answers[item.id] === "string" ? answers[item.id].trim() : "";
    let isCorrect = false;
    let reason = "Incorrect.";

    if (!given) {
      reason = "No answer provided.";
    } else if (isFillType(item.type) && item.maxWords && countWords(given) > item.maxWords) {
      reason = `Exceeded ${item.maxWords}-word limit.`;
    } else if (isFillType(item.type)) {
      isCorrect = compareFill(given, item.expected);
      reason = isCorrect ? "Exact match." : "Answer does not match.";
    } else {
      isCorrect = compareChoice(given, item.expected);
      reason = isCorrect ? "Correct option." : "Incorrect option.";
    }

    if (isCorrect) correctCount += 1;

    questionFeedback[item.id] = {
      number: item.number,
      status: isCorrect ? "correct" : "incorrect",
      isCorrect,
      userAnswer: given,
      correctAnswer: formatExpected(item),
      explanation: item.explanation || "",
      reference: item.reference || "",
      reason,
      questionType: item.questionType,
      prompt: item.prompt,
    };
  }

  const totalQuestions = items.length;
  const wrongCount = totalQuestions - correctCount;
  const band = readingScoreToBand(correctCount);
  const accuracyPercent = totalQuestions
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  const byType = {};
  items.forEach((item) => {
    const t = item.questionType || item.type;
    if (!byType[t]) byType[t] = { total: 0, correct: 0, wrong: 0 };
    byType[t].total += 1;
    if (questionFeedback[item.id]?.isCorrect) byType[t].correct += 1;
    else byType[t].wrong += 1;
  });

  const strongQuestionTypes = Object.entries(byType)
    .filter(([, s]) => s.total && s.correct / s.total >= 0.7)
    .map(([type]) => type);
  const weakQuestionTypes = Object.entries(byType)
    .filter(([, s]) => s.total && s.correct / s.total < 0.5)
    .map(([type]) => type);

  return {
    correctCount,
    wrongCount,
    totalQuestions,
    rawScore: correctCount,
    band,
    bandScore: band,
    accuracyPercent,
    questionFeedback,
    byType,
    strongQuestionTypes,
    weakQuestionTypes,
    items,
  };
}

module.exports = {
  scoreReadingObjective,
  flattenQuestions,
};
