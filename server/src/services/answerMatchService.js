/**
 * Semantic answer matching for IELTS Reading and Listening.
 *
 * For MCQ / TF / matching questions we ALWAYS use exact-string matching
 * (a strict examiner-style check) — those question types have a single
 * canonical answer letter so semantic checks are not needed.
 *
 * For fill-in-the-blank / short-answer / sentence-completion, the official
 * IELTS mark scheme accepts answers that mean the same thing even if the
 * wording differs slightly ("public transport" vs "public transportation",
 * "city centre" vs "city center", etc).
 *
 * This service:
 *   1. Receives a batch of {questionId, prompt, correctAnswer, userAnswer}
 *   2. Returns a verdict per question: "correct" | "partial" | "incorrect"
 *      + a short reason.
 *
 * Batching is critical — sending one OpenAI call per question would be slow
 * and expensive. We batch up to 40 questions into a single JSON call.
 */

"use strict";

const OpenAI = require("openai");

let openai = null;
function getClient() {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) return null;
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const BATCH_SIZE = 40;
const MODEL = process.env.OPENAI_MATCH_MODEL || "gpt-4o-mini";

/**
 * @param {Array<{ id:string|number, prompt?:string, correctAnswer:string|string[], userAnswer:string }>} items
 * @returns {Promise<Record<string|number, { verdict:'correct'|'partial'|'incorrect', reason?:string }>>}
 */
async function semanticMatchBatch(items) {
  const client = getClient();
  if (!client || !Array.isArray(items) || !items.length) {
    return {};
  }

  // Slice into chunks just in case the caller passes a huge batch
  const result = {};
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE);
    try {
      const sliceResult = await callSemanticMatch(client, slice);
      Object.assign(result, sliceResult);
    } catch (err) {
      console.warn(
        "[answerMatchService] Semantic match batch failed, treating as incorrect:",
        err.message
      );
      // Conservative fallback — anything we couldn't verify stays incorrect
      slice.forEach((it) => {
        if (!(it.id in result)) {
          result[it.id] = { verdict: "incorrect", reason: "Could not verify match." };
        }
      });
    }
  }
  return result;
}

async function callSemanticMatch(client, items) {
  const compact = items.map((it) => ({
    id: it.id,
    prompt: typeof it.prompt === "string" ? it.prompt.slice(0, 300) : undefined,
    correct: Array.isArray(it.correctAnswer)
      ? it.correctAnswer.slice(0, 4).map((a) => String(a))
      : String(it.correctAnswer || ""),
    given: String(it.userAnswer || ""),
  }));

  const systemPrompt = `You are an IELTS Reading/Listening answer-key checker. For each item, decide whether the student's "given" answer is acceptable for the "correct" answer using OFFICIAL Cambridge IELTS marking rules.

ACCEPT (verdict="correct") when:
- The given answer means EXACTLY the same as the correct answer.
- Spelling variants only (British / American) e.g. "centre" vs "center".
- Singular/plural and minor capitalization differences.
- Synonymous nouns / phrasings where IELTS conventionally accepts both (e.g. "public transport" = "public transportation"; "automobile" = "car").
- Different grammatical form of the same root that doesn't change meaning ("rapidly" vs "rapid").

PARTIAL (verdict="partial") when:
- The answer captures the right concept but with a meaningful loss of precision.
- Use sparingly. IELTS is strict — most answers are either correct or incorrect. Default to incorrect when unsure.

REJECT (verdict="incorrect") when:
- Wrong meaning, wrong number, wrong fact.
- Different concept even if topically related.
- Empty or gibberish.
- Exceeds the implied word limit (if obvious from the prompt).

Be strict. IELTS examiners do NOT accept loose paraphrases or "good enough" answers. If meaning is not equivalent, mark incorrect.

Return ONLY valid JSON of this exact shape — no commentary:
{ "results": [ { "id": <id>, "verdict": "correct" | "partial" | "incorrect", "reason": "<short reason ≤ 12 words>" } ] }`;

  const userPrompt = `Check the following ${compact.length} answers:\n\n${JSON.stringify(compact, null, 0)}`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 1500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty semantic-match response");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error("Failed to parse semantic-match JSON");
  }

  const out = {};
  const list = Array.isArray(parsed?.results) ? parsed.results : [];
  for (const r of list) {
    if (r && (r.id !== undefined)) {
      const verdict =
        r.verdict === "correct" || r.verdict === "partial" ? r.verdict : "incorrect";
      out[r.id] = {
        verdict,
        reason: typeof r.reason === "string" ? r.reason.slice(0, 140) : undefined,
      };
    }
  }
  return out;
}

module.exports = {
  semanticMatchBatch,
};
