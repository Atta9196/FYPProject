"use strict";

const OpenAI = require("openai");
const { ACADEMIC_TOPICS, PASSAGE_SPECS } = require("../constants/ieltsReadingExam");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cleanJson(text) {
  let jsonText = String(text || "").trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/```\n?/g, "").trim();
  }
  return jsonText;
}

function countScorableUnits(questions) {
  let count = 0;
  for (const q of questions || []) {
    if (q.type === "summary-completion" && Array.isArray(q.parts)) {
      count += q.parts.length;
    } else {
      count += 1;
    }
  }
  return count;
}

function buildPassagePrompt(spec, topic) {
  return `Generate ONE IELTS Academic Reading passage with exactly ${spec.questionCount} questions numbered ${spec.startNumber} to ${spec.endNumber}.

Topic context (same test theme): ${topic}
Passage id: "${spec.id}"
Target length: ${spec.wordMin}-${spec.wordMax} words total across all paragraphs.
Allowed question types ONLY: ${spec.types.join(", ")}.
${spec.typeHint}

Return ONLY valid JSON (no markdown):
{
  "passage": {
    "id": "${spec.id}",
    "label": "${spec.label}",
    "title": "Academic title",
    "paragraphs": [
      { "id": "A", "text": "Full paragraph text..." },
      { "id": "B", "text": "..." }
    ],
    "headingOptions": [{ "value": "i", "label": "..." }],
    "featureOptions": [{ "value": "A", "label": "Person or feature name" }]
  },
  "questions": [
    {
      "id": "q${spec.startNumber}",
      "number": ${spec.startNumber},
      "passageId": "${spec.id}",
      "type": "match-heading",
      "prompt": "Choose the correct heading for paragraph B",
      "options": [{ "value": "i", "label": "..." }],
      "answer": "ii",
      "explanation": "Why this is correct",
      "reference": "Exact sentence from passage supporting the answer"
    },
    {
      "id": "q${spec.startNumber + 1}",
      "number": ${spec.startNumber + 1},
      "passageId": "${spec.id}",
      "type": "true-false-ng",
      "prompt": "Statement to evaluate",
      "answer": "true",
      "explanation": "...",
      "reference": "..."
    },
    {
      "id": "q${spec.startNumber + 2}",
      "number": ${spec.startNumber + 2},
      "passageId": "${spec.id}",
      "type": "sentence-completion",
      "prompt": "Complete: The researchers discovered ______",
      "instructions": "NO MORE THAN TWO WORDS",
      "maxWords": 2,
      "answer": ["carbon dioxide"],
      "explanation": "...",
      "reference": "..."
    },
    {
      "id": "q32",
      "number": 32,
      "passageId": "passage-3",
      "type": "summary-completion",
      "prompt": "Complete the summary below using NO MORE THAN TWO WORDS from the passage.",
      "instructions": "NO MORE THAN TWO WORDS",
      "parts": [
        {
          "id": "q32",
          "number": 32,
          "label": "32",
          "prompt": "Early experiments focused on ______",
          "maxWords": 2,
          "answer": ["marine algae"],
          "explanation": "...",
          "reference": "..."
        }
      ]
    },
    {
      "id": "q36",
      "number": 36,
      "passageId": "passage-3",
      "type": "matching-features",
      "prompt": "Which feature matches the statement?",
      "options": [{ "value": "A", "label": "Dr Smith" }],
      "answer": "B",
      "explanation": "...",
      "reference": "..."
    }
  ]
}

Rules:
- Every question number from ${spec.startNumber} to ${spec.endNumber} must appear exactly once (summary-completion parts each have their own number).
- Answers must be objectively verifiable from the passage text.
- Include reference sentence for every scorable item.
- Academic vocabulary and realistic IELTS style.
- For match-heading / matching-info / matching-features include options array.
- For true-false-ng answers use: true | false | not given
- For yes-no-ng answers use: yes | no | not given
- Do NOT include questions outside the number range.`;
}

async function generatePassage(spec, topic, attempt = 1) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert IELTS Academic Reading test writer. Output strict JSON only.",
      },
      { role: "user", content: buildPassagePrompt(spec, topic) },
    ],
    temperature: 0.65,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(cleanJson(completion.choices[0].message.content));
  if (!parsed.passage || !Array.isArray(parsed.questions)) {
    throw new Error(`Invalid passage payload for ${spec.id}`);
  }

  parsed.passage.id = spec.id;
  parsed.passage.label = spec.label;

  const unitCount = countScorableUnits(parsed.questions);
  if (unitCount !== spec.questionCount) {
    if (attempt < 2) {
      return generatePassage(spec, topic, attempt + 1);
    }
    throw new Error(
      `${spec.id}: expected ${spec.questionCount} scorable items, got ${unitCount}`
    );
  }

  return parsed;
}

async function generateFullReadingTest() {
  const topic =
    ACADEMIC_TOPICS[Math.floor(Math.random() * ACADEMIC_TOPICS.length)];
  const passages = [];
  const questions = [];

  for (const spec of PASSAGE_SPECS) {
    const result = await generatePassage(spec, topic);
    passages.push(result.passage);
    questions.push(...result.questions);
  }

  questions.sort((a, b) => (a.number || 0) - (b.number || 0));

  const readingSet = {
    id: `ai-reading-${Date.now()}`,
    title: `IELTS Academic Reading — ${topic}`,
    level: "academic",
    description: `Official-format Academic Reading: 3 passages, 40 questions, 60 minutes. Theme: ${topic}.`,
    format: "ielts-academic-reading",
    totalQuestions: 40,
    totalTimeSec: 3600,
    passages,
    questions,
  };

  return readingSet;
}

module.exports = {
  generateFullReadingTest,
  countScorableUnits,
};
