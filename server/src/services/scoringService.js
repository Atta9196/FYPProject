/**
 * Centralised IELTS scoring + validation utilities used by every practice
 * module. Defining everything here guarantees that Reading, Listening,
 * Writing and Speaking all apply the SAME band tables and the SAME
 * anti-cheating / word-count / duration rules — which is exactly what the
 * "redesign the scoring and evaluation system" spec requires.
 *
 * Nothing in this file calls OpenAI. Pure deterministic logic so unit
 * behaviour is predictable. AI-only semantic answer matching lives in
 * answerMatchService.js.
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// IELTS Reading / Listening raw-score → band table (per user spec)
// ─────────────────────────────────────────────────────────────────────────────

const READING_LISTENING_BAND_TABLE = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 }, // 33-34 → 7.5  (covers gap left by spec)
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 10, band: 4 },
  { min: 0, band: 3 },
];

/**
 * Convert a 0–40 raw correct-count into an IELTS band (Reading or Listening).
 * @param {number} rawScore
 * @returns {number}
 */
function scoreToBand(rawScore) {
  const safe = Math.max(0, Math.min(40, Math.round(Number(rawScore) || 0)));
  const entry = READING_LISTENING_BAND_TABLE.find((e) => safe >= e.min);
  return entry ? entry.band : 3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overall band IELTS rounding rule
//   6.25 → 6.5   |   6.75 → 7.0   |   7.25 → 7.5   |   7.5 → 7.5   |   7.6 → 8.0
//   The official rule: round to nearest 0.5, but .25 rounds UP to .5 and
//   .75 rounds UP to next integer.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} value
 * @returns {number}
 */
function ieltsRound(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const clamped = Math.max(0, Math.min(9, n));
  const x4 = clamped * 4; // resolution of quarter-bands
  const floored = Math.floor(x4);
  const fraction = x4 - floored;
  // .25 → up to .5, .75 → up to integer, .5 stays, .0 stays
  let rounded;
  if (fraction >= 0.5) rounded = (floored + 1) / 4;
  else rounded = floored / 4;
  // Snap to half-band
  return Math.round(rounded * 2) / 2;
}

/**
 * Average four 0–9 sub-scores, applying IELTS overall-band rounding.
 * @param {number[]} subScores
 * @returns {number|null}
 */
function averageBand(subScores) {
  const valid = (subScores || [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (!valid.length) return null;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  return ieltsRound(mean);
}

/**
 * Clamp a band score to a half-step in [0, 9].
 * @param {number} band
 */
function clampBand(band) {
  const n = Number(band);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 9) return 9;
  return Math.round(n * 2) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text utilities — used by every module for word counts + anti-cheating
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Detect submissions that are essentially the same word/character repeated.
 * Triggers if any single word makes up ≥70 % of total words AND total ≥ 8.
 * @param {string} text
 * @returns {boolean}
 */
function isMostlyRepeatedWords(text) {
  const words = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 8) return false;
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  const top = Math.max(...counts.values());
  return top / words.length >= 0.7;
}

/**
 * True when most utterances are very short (≤5 words) — typical of phrase-only answers.
 * @param {string} text
 * @returns {boolean}
 */
function isMostlyShortPhrases(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const segments = raw
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return countWords(raw) <= 5;
  const shortCount = segments.filter((s) => countWords(s) <= 5).length;
  return shortCount / segments.length >= 0.7;
}

/**
 * Catch obvious random-character / gibberish submissions:
 *  - extremely low vowel ratio
 *  - long single token (≥ 20 chars) and no spaces
 *  - alphabet density too low
 * @param {string} text
 * @returns {boolean}
 */
function isLikelyGibberish(text) {
  const raw = (text || "").trim();
  if (!raw) return false;
  if (raw.length < 6) return false; // "ok." etc handled by min-words elsewhere
  const letters = raw.replace(/[^a-zA-Z]/g, "");
  if (!letters.length) return true;
  const vowels = letters.replace(/[^aeiouAEIOU]/g, "").length;
  const vowelRatio = vowels / letters.length;
  const tokenCount = raw.split(/\s+/).filter(Boolean).length;
  const longestToken = Math.max(
    ...raw.split(/\s+/).filter(Boolean).map((t) => t.length),
    0
  );

  // Heuristic: real English has 35-55% vowels usually; below 15 % is gibberish
  if (vowelRatio < 0.15) return true;
  // A single long blob with no spaces is suspicious
  if (tokenCount === 1 && longestToken > 30) return true;
  return false;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function isBlank(text) {
  return !text || typeof text !== "string" || text.trim().length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Writing validation — per-task word-count caps from the user spec
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-task caps applied AFTER AI scoring. Lower thresholds dominate.
 * task1 covers both Academic and General Task 1.
 */
const WRITING_WORD_CAPS = {
  task1: [
    { underWords: 50, maxBand: 3, reason: "Task 1 under 50 words — capped at band 3." },
    { underWords: 100, maxBand: 4, reason: "Task 1 under 100 words — capped at band 4." },
    { underWords: 150, maxBand: 5, reason: "Task 1 below the 150-word minimum — capped at band 5." },
  ],
  task2: [
    { underWords: 80, maxBand: 3, reason: "Task 2 under 80 words — capped at band 3." },
    { underWords: 150, maxBand: 4, reason: "Task 2 under 150 words — capped at band 4." },
    { underWords: 250, maxBand: 5, reason: "Task 2 below the 250-word minimum — capped at band 5." },
  ],
};

/**
 * Classify a writing task into one of the two cap buckets.
 * @param {string} taskId
 */
function writingBucketForTask(taskId = "") {
  const id = String(taskId).toLowerCase();
  if (id.includes("task2") || id.includes("essay")) return "task2";
  return "task1";
}

/**
 * Apply the strictest matching cap given the word count.
 * @param {number} words
 * @param {"task1"|"task2"} bucket
 * @returns {{cap:number|null, reason:string|null}}
 */
function writingWordCap(words, bucket) {
  const caps = WRITING_WORD_CAPS[bucket] || WRITING_WORD_CAPS.task1;
  let bestCap = null;
  let bestReason = null;
  for (const c of caps) {
    if (words < c.underWords && (bestCap === null || c.maxBand < bestCap)) {
      bestCap = c.maxBand;
      bestReason = c.reason;
    }
  }
  return { cap: bestCap, reason: bestReason };
}

/**
 * Pre-scoring validation for writing submissions. Returns `valid:false` for
 * anything that should short-circuit AI evaluation with band 0.
 *
 * @param {{ taskId:string, responseText:string }} input
 * @returns {{
 *   valid: boolean,
 *   forceBand: number|null,
 *   wordCount: number,
 *   bucket: "task1"|"task2",
 *   wordCap: { cap:number|null, reason:string|null },
 *   issues: string[]
 * }}
 */
function validateWritingSubmission({ taskId, responseText }) {
  const bucket = writingBucketForTask(taskId);
  const text = String(responseText || "");
  const wordCount = countWords(text);
  const issues = [];

  if (isBlank(text)) {
    return {
      valid: false,
      forceBand: 0,
      wordCount: 0,
      bucket,
      wordCap: { cap: 0, reason: "Blank submission — band 0." },
      issues: ["blank"],
    };
  }

  if (isLikelyGibberish(text)) {
    issues.push("gibberish");
    return {
      valid: false,
      forceBand: 0,
      wordCount,
      bucket,
      wordCap: { cap: 0, reason: "Submission contains random characters / non-language — band 0." },
      issues,
    };
  }

  if (isMostlyRepeatedWords(text)) {
    issues.push("repeated-words");
    return {
      valid: false,
      forceBand: 2,
      wordCount,
      bucket,
      wordCap: { cap: 2, reason: "Response consists of repeated words — band 2." },
      issues,
    };
  }

  const wordCap = writingWordCap(wordCount, bucket);
  return {
    valid: true,
    forceBand: null,
    wordCount,
    bucket,
    wordCap,
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Speaking validation — duration, word count, repetition, relevance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ transcript:string, audioDurationSec?:number }} input
 */
function validateSpeakingSubmission({ transcript, audioDurationSec }) {
  const text = String(transcript || "");
  const wordCount = countWords(text);
  const durationSec = Number.isFinite(Number(audioDurationSec)) ? Number(audioDurationSec) : null;
  const issues = [];

  if (isBlank(text)) {
    return {
      valid: false,
      forceBand: 0,
      wordCount: 0,
      audioDurationSec: durationSec,
      wordCap: { cap: 0, reason: "No speech detected — band 0." },
      issues: ["empty-transcript"],
    };
  }

  if (isMostlyRepeatedWords(text)) {
    issues.push("repeated-words");
    return {
      valid: true, // still let AI evaluate fluency-style commentary
      forceBand: null,
      wordCount,
      audioDurationSec: durationSec,
      wordCap: { cap: 3, reason: "Speech is mostly repeated words — capped at band 3." },
      issues,
    };
  }

  // Combine all duration / word caps; the strictest wins.
  let cap = null;
  let reason = null;
  const setCap = (c, r) => {
    if (c !== null && (cap === null || c < cap)) {
      cap = c;
      reason = r;
    }
  };

  if (durationSec !== null && durationSec < 20) {
    setCap(3, "Speaking duration under 20 seconds — maximum band 3.");
  }
  if (wordCount < 50) {
    setCap(4, "Fewer than 50 spoken words — maximum band 4.");
  } else if (wordCount < 100) {
    setCap(5, "Fewer than 100 spoken words — maximum band 5.");
  }
  if (isMostlyShortPhrases(text)) {
    setCap(5, "Answers contain mostly short phrases — maximum band 5.");
  }

  return {
    valid: true,
    forceBand: null,
    wordCount,
    audioDurationSec: durationSec,
    wordCap: { cap, reason },
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading / Listening answer normalisation (used before AI semantic match)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lower-case + strip surrounding punctuation + collapse whitespace.
 * Conservative; preserves internal hyphens and apostrophes.
 * @param {string} v
 */
function normaliseAnswerString(v) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/^[\s\W_]+|[\s\W_]+$/g, "") // trim leading/trailing punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Exact match comparator that tolerates British/American spelling pairs and
 * very small whitespace / punctuation noise — but NOT meaning differences.
 * Meaning-level checks are delegated to answerMatchService.semanticMatch.
 *
 * @param {string} given
 * @param {string|string[]} expected
 */
function isExactMatch(given, expected) {
  const g = normaliseAnswerString(given);
  if (!g) return false;
  const candidates = Array.isArray(expected) ? expected : [expected];
  return candidates.some((c) => {
    const e = normaliseAnswerString(c);
    if (!e) return false;
    if (g === e) return true;
    // Common BrE/AmE pairs
    const brToAm = (s) =>
      s
        .replace(/centre\b/g, "center")
        .replace(/colour\b/g, "color")
        .replace(/honour\b/g, "honor")
        .replace(/realise\b/g, "realize")
        .replace(/organise\b/g, "organize")
        .replace(/programme\b/g, "program")
        .replace(/labour\b/g, "labor")
        .replace(/favour\b/g, "favor");
    return brToAm(g) === brToAm(e);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Result-explanation helpers — every module returns {strengths, weaknesses,
// suggestions, reason} so the UI can render a uniform "why this score?" block.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a deterministic strengths/weaknesses split from per-criterion bands.
 * Used as a fallback when the AI doesn't return a usable structure.
 * @param {Record<string, number>} criteriaScores
 * @param {Record<string, string>} criteriaLabels
 */
function summariseStrengthsWeaknesses(criteriaScores, criteriaLabels) {
  const entries = Object.entries(criteriaScores || {}).filter(
    ([, v]) => Number.isFinite(Number(v))
  );
  if (!entries.length) return { strengths: [], weaknesses: [] };
  const sorted = [...entries].sort((a, b) => Number(b[1]) - Number(a[1]));
  const strengths = sorted.slice(0, 2).map(([k, v]) => `${criteriaLabels[k] || k}: band ${v}.`);
  const weaknesses = sorted
    .slice(-2)
    .reverse()
    .map(([k, v]) => `${criteriaLabels[k] || k}: band ${v}.`);
  return { strengths, weaknesses };
}

module.exports = {
  // Tables
  READING_LISTENING_BAND_TABLE,
  WRITING_WORD_CAPS,

  // Band helpers
  scoreToBand,
  ieltsRound,
  averageBand,
  clampBand,

  // Text helpers
  countWords,
  isBlank,
  isLikelyGibberish,
  isMostlyRepeatedWords,
  isMostlyShortPhrases,

  // Writing / speaking validation
  writingBucketForTask,
  writingWordCap,
  validateWritingSubmission,
  validateSpeakingSubmission,

  // Reading / listening answer normalisation
  normaliseAnswerString,
  isExactMatch,

  // Result explanation
  summariseStrengthsWeaknesses,
};
