const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const {
  scoreToBand,
  isExactMatch,
  normaliseAnswerString,
  countWords,
} = require("../services/scoringService");
const { semanticMatchBatch } = require("../services/answerMatchService");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET /api/reading/generate
 * Generate a complete IELTS Reading test with passages and questions using AI
 */
router.get("/generate", async (req, res) => {
  try {
    console.log("📚 Generating AI-based IELTS Reading test...");

    const topics = [
      "sustainable architecture and green buildings",
      "urban farming and vertical agriculture",
      "renewable energy and solar technology",
      "artificial intelligence in healthcare",
      "ocean conservation and marine biology",
      "space exploration and Mars missions",
      "ancient civilizations and archaeology",
      "climate change and environmental science",
      "renewable transport and electric vehicles",
      "mental health and psychology",
      "renewable energy storage",
      "biodiversity and wildlife conservation",
      "digital transformation in education",
      "food security and agriculture",
      "renewable materials and recycling"
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an IELTS Reading test creator. Generate a complete IELTS Academic Reading test with 3 passages and 40 questions total.

Format your response as valid JSON with this exact structure:
{
  "id": "ai-reading-[timestamp]",
  "title": "Academic Reading Test - [Topic]",
  "level": "academic",
  "description": "Three passages about [topic]",
  "passages": [
    {
      "id": "passage-1",
      "label": "Passage 1",
      "title": "[Title]",
      "paragraphs": [
        {"id": "A", "text": "[Paragraph text - 3-4 sentences]"},
        {"id": "B", "text": "[Paragraph text - 3-4 sentences]"},
        {"id": "C", "text": "[Paragraph text - 3-4 sentences]"}
      ],
      "headingOptions": [
        {"value": "i", "label": "[Heading option]"},
        {"value": "ii", "label": "[Heading option]"},
        {"value": "iii", "label": "[Heading option]"},
        {"value": "iv", "label": "[Heading option]"}
      ]
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "match-heading",
      "passageId": "passage-1",
      "prompt": "[Question text]",
      "options": [{"value": "i", "label": "[Option]"}, ...],
      "answer": "i",
      "explanation": "[Brief explanation]"
    },
    {
      "id": "q2",
      "type": "true-false-ng",
      "passageId": "passage-1",
      "prompt": "[Statement]",
      "answer": "true",
      "explanation": "[Brief explanation]"
    },
    {
      "id": "q3",
      "type": "multiple",
      "passageId": "passage-1",
      "prompt": "[Question]",
      "options": [{"value": "A", "label": "[Option]"}, ...],
      "answer": "A",
      "explanation": "[Brief explanation]"
    },
    {
      "id": "q4",
      "type": "sentence-completion",
      "passageId": "passage-1",
      "prompt": "[Sentence with blank]",
      "instructions": "Write NO MORE THAN TWO WORDS",
      "answer": ["answer1", "answer2"],
      "maxWords": 2,
      "explanation": "[Brief explanation]"
    }
  ]
}

Requirements:
- 3 passages, each 3-4 paragraphs
- 40 questions total (13-14 per passage)
- Mix question types: match-heading, true-false-ng, multiple, sentence-completion, summary-completion
- All answers must be verifiable from the passages
- Academic level vocabulary and complexity
- Return ONLY valid JSON, no markdown formatting`
          },
          {
            role: "user",
            content: `Generate an IELTS Academic Reading test about: ${randomTopic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Clean up response (remove markdown code blocks if present)
      let jsonText = responseText;
      if (responseText.startsWith('```json')) {
        jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (responseText.startsWith('```')) {
        jsonText = responseText.replace(/```\n?/g, '').trim();
      }

      const readingSet = JSON.parse(jsonText);
      
      // Add timestamp-based ID if not present
      if (!readingSet.id) {
        readingSet.id = `ai-reading-${Date.now()}`;
      }

      console.log("✅ AI Reading test generated successfully");
      
      res.json({
        success: true,
        readingSet: readingSet
      });

    } catch (openaiError) {
      console.error("❌ OpenAI API failed for reading generation:", openaiError);
      
      // Return fallback reading set
      const fallbackSet = {
        id: `fallback-reading-${Date.now()}`,
        title: "Academic Reading Test - Environmental Science",
        level: "academic",
        description: "Three passages about environmental science and sustainability",
        passages: [
          {
            id: "passage-1",
            label: "Passage 1",
            title: "Climate Change and Renewable Energy",
            paragraphs: [
              {
                id: "A",
                text: "Climate change represents one of the most pressing challenges of our time. Scientists worldwide have documented rising global temperatures, melting ice caps, and increasingly frequent extreme weather events. The primary driver of these changes is the accumulation of greenhouse gases in the atmosphere, largely from human activities such as burning fossil fuels for energy."
              },
              {
                id: "B",
                text: "Renewable energy sources offer a promising solution to reduce carbon emissions. Solar and wind power have become increasingly cost-effective, with prices dropping significantly over the past decade. Many countries are investing heavily in renewable energy infrastructure, recognizing both environmental and economic benefits."
              },
              {
                id: "C",
                text: "However, the transition to renewable energy faces several challenges. Energy storage remains a critical issue, as solar and wind power are intermittent. Additionally, existing fossil fuel infrastructure represents significant investment that cannot be abandoned immediately. Policy makers must balance environmental goals with economic realities."
              }
            ],
            headingOptions: [
              { value: "i", label: "The causes and impacts of climate change" },
              { value: "ii", label: "Economic advantages of renewable energy" },
              { value: "iii", label: "Challenges in transitioning to clean energy" },
              { value: "iv", label: "Government policies on energy" }
            ]
          }
        ],
        questions: [
          {
            id: "q1",
            type: "match-heading",
            passageId: "passage-1",
            prompt: "Choose the correct heading for paragraph A",
            options: [
              { value: "i", label: "The causes and impacts of climate change" },
              { value: "ii", label: "Economic advantages of renewable energy" },
              { value: "iii", label: "Challenges in transitioning to clean energy" },
              { value: "iv", label: "Government policies on energy" }
            ],
            answer: "i",
            explanation: "Paragraph A discusses climate change causes and impacts."
          },
          {
            id: "q2",
            type: "true-false-ng",
            passageId: "passage-1",
            prompt: "Renewable energy prices have increased over the past decade.",
            answer: "false",
            explanation: "The passage states that prices have dropped significantly."
          }
        ]
      };

      res.json({
        success: true,
        readingSet: fallbackSet
      });
    }

  } catch (error) {
    console.error("❌ Error generating reading test:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate reading test",
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reading/score
//
// Answer-based IELTS Reading scoring.
//
// - MCQ / TF / matching → strict exact comparison against the AI-generated
//   answer key (no semantic check needed; only one canonical answer).
// - Fill / short-answer / sentence-completion / summary-completion → strict
//   exact comparison FIRST; any answer that doesn't exact-match gets sent in
//   a single batched OpenAI call that decides if the meaning is equivalent
//   per official Cambridge IELTS marking rules. Verdicts: correct | partial
//   | incorrect.
// - Final raw score → IELTS Reading band (0-9) via the official band table.
// - Returns per-question feedback + an explanation block (reasonForScore,
//   strengths, weaknesses, suggestions) so the UI can show the student
//   exactly why they got the band they got.
//
// AI is used ONLY for semantic matching of fill answers — never to assign a
// band score directly. The band always comes from the raw correct count.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/score", async (req, res) => {
  try {
    const { readingSet, answers } = req.body || {};
    if (!readingSet || !Array.isArray(readingSet.questions)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payload: readingSet.questions is required.",
      });
    }
    const safeAnswers = answers && typeof answers === "object" ? answers : {};

    // Build a flat list of {questionId, type, prompt, expected, given, options}
    // that we can score. summary-completion questions contain parts[]; each
    // part is treated as its own scoreable unit.
    const items = [];
    for (const question of readingSet.questions) {
      if (!question) continue;
      if (question.type === "summary-completion" && Array.isArray(question.parts)) {
        question.parts.forEach((part) => {
          items.push({
            id: part.id,
            qid: question.id,
            type: "fill",
            prompt: `${question.prompt || ""} (${part.label || ""})`.trim(),
            expected: part.answer,
            given: safeAnswers[part.id],
            options: null,
            maxWords: part.maxWords,
            explanation: part.explanation,
          });
        });
      } else {
        items.push({
          id: question.id,
          qid: question.id,
          type: question.type,
          prompt: question.prompt,
          expected: question.answer,
          given: safeAnswers[question.id],
          options: Array.isArray(question.options) ? question.options : null,
          maxWords: question.maxWords,
          explanation: question.explanation,
        });
      }
    }

    // First pass: strict comparisons (no AI needed)
    const feedback = {};
    const fillToCheck = [];

    for (const it of items) {
      const given = typeof it.given === "string" ? it.given.trim() : "";

      // Empty answer → always incorrect (no AI call needed)
      if (!given) {
        feedback[it.id] = {
          status: "incorrect",
          isCorrect: false,
          userAnswer: "",
          correctAnswer: formatExpected(it),
          reason: "No answer provided.",
          explanation: it.explanation || "",
        };
        continue;
      }

      // Word-limit violation → straight incorrect for fill types
      if (isFillType(it.type) && it.maxWords && countWords(given) > it.maxWords) {
        feedback[it.id] = {
          status: "incorrect",
          isCorrect: false,
          userAnswer: given,
          correctAnswer: formatExpected(it),
          reason: `Exceeded the ${it.maxWords}-word limit.`,
          explanation: it.explanation || "",
        };
        continue;
      }

      // MCQ / TF / matching → strict letter / token comparison only
      if (!isFillType(it.type)) {
        const isCorrect = compareChoice(given, it.expected);
        feedback[it.id] = {
          status: isCorrect ? "correct" : "incorrect",
          isCorrect,
          userAnswer: normaliseChoiceDisplay(given, it.options),
          correctAnswer: normaliseChoiceDisplay(it.expected, it.options),
          reason: isCorrect ? "Exact match." : "Incorrect option selected.",
          explanation: it.explanation || "",
        };
        continue;
      }

      // Fill-type → exact match first, then AI semantic check
      if (isExactMatch(given, it.expected)) {
        feedback[it.id] = {
          status: "correct",
          isCorrect: true,
          userAnswer: given,
          correctAnswer: formatExpected(it),
          reason: "Exact match.",
          explanation: it.explanation || "",
        };
        continue;
      }
      // Queue for AI semantic match
      fillToCheck.push(it);
    }

    // Second pass: batched semantic match for everything still unresolved
    if (fillToCheck.length) {
      const batchPayload = fillToCheck.map((it) => ({
        id: it.id,
        prompt: it.prompt,
        correctAnswer: it.expected,
        userAnswer: it.given,
      }));
      let verdicts = {};
      try {
        verdicts = await semanticMatchBatch(batchPayload);
      } catch (err) {
        console.warn("[reading/score] semantic match failed:", err.message);
      }
      for (const it of fillToCheck) {
        const v = verdicts[it.id];
        const verdict = v?.verdict || "incorrect";
        const reason = v?.reason || (verdict === "correct"
          ? "Accepted as equivalent meaning."
          : verdict === "partial"
            ? "Captures the right idea but lacks precision."
            : "Meaning does not match the expected answer.");
        feedback[it.id] = {
          status: verdict,
          isCorrect: verdict === "correct",
          isPartial: verdict === "partial",
          userAnswer: it.given,
          correctAnswer: formatExpected(it),
          reason,
          explanation: it.explanation || "",
        };
      }
    }

    // Tally
    const totalQuestions = items.length;
    let correctCount = 0;
    let partialCount = 0;
    let wrongCount = 0;
    for (const it of items) {
      const f = feedback[it.id];
      if (!f) continue;
      if (f.status === "correct") correctCount += 1;
      else if (f.status === "partial") partialCount += 1;
      else wrongCount += 1;
    }

    // For band conversion we treat partials as 0.5 of a correct answer,
    // then round to the nearest integer. This stays compatible with the
    // strict IELTS table (which uses whole-number correct counts) while
    // still rewarding partials slightly.
    const weightedScore = correctCount + partialCount * 0.5;
    const rawScoreForBand = Math.round(weightedScore);
    const band = scoreToBand(rawScoreForBand);
    const accuracyPercent = totalQuestions
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    const explanation = buildExplanation({
      module: "Reading",
      band,
      correctCount,
      partialCount,
      wrongCount,
      totalQuestions,
      feedback,
      items,
    });

    return res.json({
      success: true,
      module: "reading",
      band,
      bandScore: band, // alias kept for any existing client expecting bandScore
      rawScore: rawScoreForBand,
      correctCount,
      partialCount,
      wrongCount,
      totalQuestions,
      accuracyPercent,
      questionFeedback: feedback,
      summary: explanation,
    });
  } catch (err) {
    console.error("❌ Reading scoring failed:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to score reading submission.",
      details: err.message,
    });
  }
});

function isFillType(type) {
  return (
    type === "fill" ||
    type === "sentence-completion" ||
    type === "short-answer" ||
    type === "summary-completion"
  );
}

function compareChoice(given, expected) {
  const g = String(given || "").trim().toLowerCase();
  const e = String(expected || "").trim().toLowerCase();
  if (!g || !e) return false;
  // T/F/NG and Y/N/NG canonical forms
  const map = {
    t: "true",
    true: "true",
    f: "false",
    false: "false",
    ng: "not given",
    "not given": "not given",
    y: "yes",
    yes: "yes",
    n: "no",
    no: "no",
  };
  const ng = map[g] || g;
  const ne = map[e] || e;
  return ng === ne;
}

function normaliseChoiceDisplay(value, options) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (Array.isArray(options) && options.length) {
    const upper = trimmed.toUpperCase();
    const found = options.find((o) => String(o.value || "").toUpperCase() === upper);
    if (found) return `${found.value}. ${found.label}`;
  }
  return trimmed;
}

function formatExpected(item) {
  if (Array.isArray(item.expected)) {
    return item.expected.filter(Boolean).join(" / ");
  }
  if (item.options && (item.type === "multiple" || item.type === "matching" || item.type === "match-heading" || item.type === "matching-info")) {
    return normaliseChoiceDisplay(item.expected, item.options);
  }
  return item.expected == null ? "" : String(item.expected);
}

/**
 * Build a strengths / weaknesses / suggestions block by inspecting per-type
 * accuracy. Pure logic — no AI call so the response is fast and free.
 */
function buildExplanation({
  module,
  band,
  correctCount,
  partialCount,
  wrongCount,
  totalQuestions,
  feedback,
  items,
}) {
  const byType = {};
  for (const it of items) {
    const t = readableType(it.type);
    if (!byType[t]) byType[t] = { total: 0, correct: 0, partial: 0, wrong: 0 };
    byType[t].total += 1;
    const status = feedback[it.id]?.status || "incorrect";
    if (status === "correct") byType[t].correct += 1;
    else if (status === "partial") byType[t].partial += 1;
    else byType[t].wrong += 1;
  }

  const strengths = [];
  const weaknesses = [];
  Object.entries(byType).forEach(([type, s]) => {
    const ratio = s.total ? (s.correct + s.partial * 0.5) / s.total : 0;
    if (ratio >= 0.8) {
      strengths.push(`Strong on ${type} (${s.correct}/${s.total} correct).`);
    } else if (ratio <= 0.4) {
      weaknesses.push(`Weak on ${type} (${s.correct}/${s.total} correct).`);
    }
  });

  if (strengths.length === 0 && correctCount > 0) {
    strengths.push(`Got ${correctCount} of ${totalQuestions} questions correct.`);
  }
  if (weaknesses.length === 0 && wrongCount > 0) {
    weaknesses.push(`Missed ${wrongCount} of ${totalQuestions} questions.`);
  }

  const suggestions = [];
  if (wrongCount > totalQuestions / 2) {
    suggestions.push("Practise scanning for keywords before reading the full passage.");
    suggestions.push("Re-check the question instructions — especially word limits and answer format.");
  }
  if (partialCount > 0) {
    suggestions.push(
      "Aim for the exact wording or accepted synonyms — partial answers earn 0 in the real exam."
    );
  }
  if (byType["True / False / Not Given"] && byType["True / False / Not Given"].wrong > 1) {
    suggestions.push(
      "Revise the distinction between False (contradicted) and Not Given (no information)."
    );
  }
  if (byType["Match Heading"] && byType["Match Heading"].wrong > 1) {
    suggestions.push("For heading matching, focus on the main idea of each paragraph, not specific details.");
  }
  if (!suggestions.length) {
    suggestions.push("Keep practising under timed conditions to lock in this performance.");
  }

  return {
    reasonForScore: `Band ${band} from ${correctCount} correct + ${partialCount} partial out of ${totalQuestions}.`,
    strengths,
    weaknesses,
    suggestions,
    perTypeBreakdown: byType,
  };
}

function readableType(type) {
  switch (type) {
    case "multiple":
      return "Multiple Choice";
    case "true-false-ng":
      return "True / False / Not Given";
    case "yes-no-ng":
      return "Yes / No / Not Given";
    case "match-heading":
      return "Match Heading";
    case "matching-info":
      return "Matching Information";
    case "sentence-completion":
      return "Sentence Completion";
    case "summary-completion":
    case "fill":
      return "Fill in the Blank";
    case "short-answer":
      return "Short Answer";
    default:
      return type || "Question";
  }
}

module.exports = router;

