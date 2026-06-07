const express = require("express");
const OpenAI = require("openai");
const crypto = require("crypto");

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for generated listening audio
const listeningAudioCache = new Map(); // key: `${testId}:${sectionId}` -> { buffer, createdAt }
const LISTENING_AUDIO_TTL_MS = 60 * 60 * 1000; // 1 hour
let listeningCleanupStarted = false;

// In-memory cache of listening test scripts so the audio endpoint can
// rebuild audio on demand when the buffer is missing (e.g. after a server
// restart). Populated by the generate route AND by the generation-cache
// route when it serves a cached listening test.
const listeningScriptCache = new Map(); // testId -> { sections, createdAt }
const LISTENING_SCRIPT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function makeAudioKey(testId, sectionId) {
  return `${testId}:${sectionId}`;
}

function getListeningAudio(testId, sectionId) {
  const key = makeAudioKey(testId, sectionId);
  const entry = listeningAudioCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > LISTENING_AUDIO_TTL_MS) {
    listeningAudioCache.delete(key);
    return null;
  }
  return entry.buffer;
}

function setListeningAudio(testId, sectionId, buffer) {
  const key = makeAudioKey(testId, sectionId);
  listeningAudioCache.set(key, { buffer, createdAt: Date.now() });
}

function startListeningCleanup() {
  if (listeningCleanupStarted) return;
  listeningCleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of listeningAudioCache.entries()) {
      if (now - entry.createdAt > LISTENING_AUDIO_TTL_MS) {
        listeningAudioCache.delete(key);
      }
    }
    for (const [key, entry] of listeningScriptCache.entries()) {
      if (now - entry.createdAt > LISTENING_SCRIPT_TTL_MS) {
        listeningScriptCache.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

startListeningCleanup();

/**
 * Remember the dialogue/listening scripts for a generated test so the audio
 * endpoint can rebuild missing audio later. Safe to call repeatedly.
 */
function registerCachedListeningTest(testData) {
  if (!testData || !testData.testId || !Array.isArray(testData.sections)) return;
  const sectionsWithScripts = testData.sections.filter(
    (s) => s && (Array.isArray(s.dialogueScript) || s.listeningScript)
  );
  if (!sectionsWithScripts.length) return;
  listeningScriptCache.set(testData.testId, {
    sections: testData.sections,
    createdAt: Date.now(),
  });
}

function getCachedSection(testId, sectionId) {
  const entry = listeningScriptCache.get(testId);
  if (!entry) return null;
  return (
    entry.sections.find(
      (s) => String(s.id) === String(sectionId)
    ) || null
  );
}

// OpenAI TTS allows max 4096 characters per request; use 4000 to be safe
const TTS_CHUNK_SIZE = 4000;

function chunkTextForTTS(text) {
  const str = (text || "").toString().trim();
  if (!str) return [];
  if (str.length <= TTS_CHUNK_SIZE) return [str];
  const chunks = [];
  let remaining = str;
  while (remaining.length > 0) {
    if (remaining.length <= TTS_CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.slice(0, TTS_CHUNK_SIZE);
    const lastSpace = slice.lastIndexOf(" ");
    const lastPeriod = slice.lastIndexOf(".");
    const splitAt = Math.max(lastSpace, lastPeriod);
    const chunk = splitAt > TTS_CHUNK_SIZE / 2 ? slice.slice(0, splitAt + 1) : slice;
    chunks.push(chunk.trim());
    remaining = remaining.slice(chunk.length).trim();
  }
  return chunks.filter(Boolean);
}

async function synthesizeSpeech(text, voice = "alloy") {
  const input = (text || "").toString().trim().slice(0, TTS_CHUNK_SIZE);
  if (!input) {
    throw new Error("Empty TTS input");
  }

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input,
  });

  return Buffer.from(await response.arrayBuffer());
}

/** Synthesize long text by chunking; returns single concatenated audio buffer. */
async function synthesizeLongText(text, voice = "alloy") {
  const chunks = chunkTextForTTS(text || "");
  if (!chunks.length) return null;
  const buffers = [];
  for (const chunk of chunks) {
    const buf = await synthesizeSpeech(chunk, voice);
    if (buf && buf.length) buffers.push(buf);
  }
  if (!buffers.length) return null;
  return buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
}

function buildSectionIntro(section, index) {
  const base =
    section && section.context
      ? `Section ${section.id}. You will hear audio related to ${section.context}. `
      : `Section ${section.id}. You will hear a recording. `;

  const lookQuestions =
    "First you have some time to look at the questions. Then the recording will be played once only.";

  return `${base}${lookQuestions}`;
}

async function generateDialogueAudio(dialogueScript, section, index) {
  if (!Array.isArray(dialogueScript) || !dialogueScript.length) return null;

  const MALE_VOICE = "onyx";
  const FEMALE_VOICE = "nova";
  const intro = buildSectionIntro(section, index);

  const buffers = [];

  for (let i = 0; i < dialogueScript.length; i++) {
    const turn = dialogueScript[i];
    if (!turn || !turn.text) continue;

    const speaker = (turn.speaker || "").toLowerCase();
    const voice =
      speaker.includes("female") ||
      speaker.includes("woman") ||
      speaker.includes("student2") ||
      speaker.includes("student 2")
        ? FEMALE_VOICE
        : MALE_VOICE;

    const text = i === 0 ? `${intro} ${turn.text}` : turn.text;
    const buf = await synthesizeLongText(text, voice);
    if (buf) buffers.push(buf);
  }

  if (!buffers.length) return null;
  return Buffer.concat(buffers);
}

async function generateMonologueAudio(listeningScript, section, index) {
  if (!listeningScript) return null;
  const intro = buildSectionIntro(section, index);
  const text = `${intro} ${listeningScript}`;
  return synthesizeLongText(text, "alloy");
}

/**
 * Map any AI-returned `type` string to one of three canonical values the
 * client UI knows how to render: "multiple" | "matching" | "fill".
 * The model often emits "multiple-choice", "mcq", "matching-information",
 * "note-completion", "sentence-completion", "map-labelling" etc. — without
 * this mapping those questions silently fall through to the plain text
 * input renderer so MCQs / matching dropdowns never appear in the UI.
 */
function canonicalizeType(rawType, hasOptions) {
  const t = String(rawType || "").toLowerCase().trim();
  if (!t) return hasOptions ? "multiple" : "fill";
  // map-labelling / diagram-labelling with options is matching in IELTS UI
  if (/match/.test(t)) return "matching";
  if (/multi|mcq|choice|choose/.test(t)) return "multiple";
  if (hasOptions && /(label|map|diagram)/.test(t)) return "matching";
  if (
    /fill|blank|complet|short|note|form|table|summary|flow|sentence|label|map|diagram/.test(
      t
    )
  ) {
    return hasOptions ? "multiple" : "fill";
  }
  return hasOptions ? "multiple" : "fill";
}

function normalizeQuestion(q, qi) {
  if (!q) return null;

  // Prefer explicit question prompt; if missing or too short, fall back to a safe default
  let rawPrompt = (q.prompt ?? q.text ?? q.question ?? "").toString().trim();
  if (!rawPrompt || rawPrompt.length < 2) {
    rawPrompt = "Complete the sentence";
  }

  const answer = q.answer;
  if (answer === undefined && q.correctAnswer === undefined) return null;
  const answerVal = answer !== undefined ? answer : q.correctAnswer;
  const options = Array.isArray(q.options)
    ? q.options
        .map((opt) => ({
          value: String(opt.value ?? opt.option ?? opt.id ?? ""),
          label: String(opt.label ?? opt.text ?? opt.option ?? opt.answer ?? ""),
        }))
        .filter((o) => o.value || o.label)
    : [];

  const hasOptions = options.length > 0;
  const canonicalType = canonicalizeType(q.type, hasOptions);

  return {
    ...q,
    id: typeof q.id === "number" ? q.id : qi + 1,
    type: canonicalType,
    prompt: rawPrompt,
    answer: Array.isArray(answerVal) ? answerVal[0] : answerVal,
    options: options.length ? options : q.options,
  };
}

function normalizeSections(raw) {
  if (!raw || !Array.isArray(raw.sections)) {
    throw new Error("Missing sections array in AI response");
  }

  const sections = raw.sections
    .map((section, index) => {
      if (!section) return null;

      const id =
        typeof section.id === "number"
          ? section.id
          : parseInt(section.id, 10) || index + 1;

      const allQuestions = Array.isArray(section.questions)
        ? section.questions
        : [];
      const questions = allQuestions
        .map((q, qi) => normalizeQuestion(q, qi))
        .filter((q) => q && q.prompt && q.prompt.length > 2 && (q.answer !== undefined || q.correctAnswer !== undefined));

      if (!questions.length) return null;

      // Soft validation: warn only so we still return 4 sections
      if (Array.isArray(section.dialogueScript) && section.dialogueScript.length < 10) {
        console.warn(`Section ${id}: dialogue has fewer than 10 turns`);
      }
      if (section.listeningScript) {
        const wordCount = section.listeningScript.split(/\s+/).filter(Boolean).length;
        if (wordCount < 300) {
          console.warn(`Section ${id}: lecture script has fewer than 300 words`);
        }
      }

      const durationSeconds =
        typeof section.durationSeconds === "number"
          ? section.durationSeconds
          : 300;
      const reviewSeconds = 30;

      const questionRange =
        typeof section.questionRange === "string"
          ? section.questionRange
          : `Questions ${index * 10 + 1}-${index * 10 + 10}`;

      // Sequential numbering 1-40: Section 1 → Q1–Q10, Section 2 → Q11–Q20, etc.
      const baseNumber = index * 10;
      const sequencedQuestions = questions.map((q, qi) => ({
        ...q,
        id: baseNumber + qi + 1,
        number: baseNumber + qi + 1,
      }));

      return {
        ...section,
        id,
        questions: sequencedQuestions,
        durationSeconds,
        reviewSeconds,
        questionRange,
      };
    })
    .filter(Boolean);

  if (!sections.length) {
    throw new Error("No valid sections after normalization");
  }

  return sections;
}

/**
 * Stream TTS audio for a generated listening section.
 *
 * If the buffer is missing from the in-memory cache (server restart, TTL
 * expiry, etc.) but we still have the script text registered via
 * registerCachedListeningTest, we lazily re-synthesise it from the same
 * script. This means the user's cached listening test stays usable across
 * server restarts without re-running the (expensive) content generation.
 */
router.get("/audio/:testId/:sectionId", async (req, res) => {
  try {
    const { testId, sectionId } = req.params;
    let buffer = getListeningAudio(testId, sectionId);

    if (!buffer) {
      const cachedSection = getCachedSection(testId, sectionId);
      if (cachedSection) {
        try {
          const sectionIndex = Math.max(0, parseInt(cachedSection.id, 10) - 1) || 0;
          let regen = null;
          if (
            Array.isArray(cachedSection.dialogueScript) &&
            cachedSection.dialogueScript.length
          ) {
            regen = await generateDialogueAudio(
              cachedSection.dialogueScript,
              cachedSection,
              sectionIndex
            );
          } else if (cachedSection.listeningScript) {
            regen = await generateMonologueAudio(
              cachedSection.listeningScript,
              cachedSection,
              sectionIndex
            );
          }
          if (regen) {
            setListeningAudio(testId, sectionId, regen);
            buffer = regen;
          }
        } catch (regenErr) {
          console.warn(
            `[listening] On-demand TTS rebuild failed for ${testId}/${sectionId}:`,
            regenErr.message
          );
        }
      }
    }

    if (!buffer) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      return res.status(404).send("Audio not found");
    }

    res.setHeader(
      "Access-Control-Allow-Origin",
      req.headers.origin || "*"
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    console.error("❌ Error serving listening audio:", err);
    res.status(500).send("Failed to load audio");
  }
});

/** Placeholder when no TTS available (e.g. fallback test). Returns short empty body so request doesn't 404. */
router.get("/placeholder-audio", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(Buffer.alloc(0));
});

// IELTS Listening raw score to band (40 questions)
const LISTENING_BAND_TABLE = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 32, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 0, band: 4.5 },
];

function scoreToBand(score) {
  const entry = LISTENING_BAND_TABLE.find((e) => score >= e.min);
  return entry ? entry.band : "4.5";
}

/**
 * POST /api/listening/evaluate
 * AI-based evaluation: returns band score and short feedback for dashboard integration.
 */
router.post("/evaluate", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Content-Type", "application/json");
  try {
    const { totalScore = 0, totalQuestions = 40, sectionScores = [] } = req.body || {};
    const bandScore = parseFloat(scoreToBand(Number(totalScore)));
    let feedback = `Listening: ${totalScore}/${totalQuestions} correct. Band ${bandScore}.`;

    if (process.env.OPENAI_API_KEY && sectionScores.length > 0) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 150,
          messages: [
            {
              role: "system",
              content:
                "You are an IELTS Listening assessor. In one short sentence (under 15 words), give a single encouraging or improvement tip based on the score. Do not repeat the band. Example: 'Good accuracy on Section 1; focus on note completion in Section 4.'",
            },
            {
              role: "user",
              content: `Raw score: ${totalScore}/${totalQuestions}. Band: ${bandScore}. Section scores: ${JSON.stringify(sectionScores)}. One short tip only.`,
            },
          ],
        });
        const tip = completion.choices[0]?.message?.content?.trim();
        if (tip) feedback = `Band ${bandScore}. ${tip}`;
      } catch (aiErr) {
        console.warn("Listening AI feedback failed, using default:", aiErr.message);
      }
    }

    return res.json({ success: true, bandScore, feedback });
  } catch (err) {
    console.error("❌ Listening evaluate error:", err);
    return res.status(500).json({ success: false, error: "Evaluation failed" });
  }
});

/**
 * GET /api/listening/generate
 * Generate a complete IELTS Listening test with 4 sections, 40 questions, and TTS audio.
 */
router.get("/generate", async (req, res) => {
  try {
    console.log("🎧 Generating AI-based IELTS Listening test with TTS...");

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    if (!process.env.OPENAI_API_KEY) {
      console.warn("⚠️ OPENAI_API_KEY missing, returning fallback listening test");
      return res.json(buildFallbackResponse(baseUrl));
    }

    const systemPrompt = `
You are a Cambridge IELTS Listening test designer. Your output must follow the real IELTS Listening exam format exactly.

GENERAL IELTS LISTENING STRUCTURE
- The listening test contains exactly 4 sections.
- Each section contains exactly 10 questions.
- Total questions must be 40.
- Difficulty must increase from Section 1 to Section 4.
- Audio plays only once.
- Each section lasts approximately 4–5 minutes (use durationSeconds: 300, reviewSeconds: 30).

REAL IELTS RULE (CRITICAL)
In the real IELTS Listening test, speakers do NOT read or mention the questions. They only speak naturally about a situation. Students listen and find the answers inside the conversation or lecture. Your script must be a complete scenario or conversation—never a list of short sentences that directly state answers.

DESIGN RULE (FOLLOW STRICTLY)
1. First write a FULL scenario or conversation (the script). The script must describe a complete situation—like a real phone call, tour, discussion, or lecture.
2. Only AFTER the full script is complete, generate the 10 questions for that section based on the information that appears naturally in the script.
Do NOT generate questions or answers first. Do NOT write the script as short answer-like sentences. The script must NOT mention questions; it only presents the scenario. Questions are shown to students separately.

SCRIPT MUST CONTAIN
- A complete scenario or conversation (full context, not just facts that answer questions).
- Natural spoken English: hesitations, reactions, follow-up comments.
- Contextual details and extra information (so the recording feels real, not a quiz).
- Filler phrases: "let me check that", "just a moment", "actually", "oh right", "I see", "hold on".
- Information for answers embedded naturally in the dialogue or lecture (e.g. rent mentioned in a full sentence: "It used to be £720 last year, but the rent is now £750 per month"—not "The rent is £750.").

SCRIPT MUST NOT
- Say "question 1", "question 2", or refer to any question.
- Say "choose A, B, or C" or "multiple choice" or "fill in the blank".
- Directly state answers like "the answer is" or "the correct answer is".
- Be a list of short sentences that each give one answer. Each turn or paragraph must sound like real speech with context and flow.

EXAMPLE OF CORRECT STYLE (conversation)
Woman: Hello, I'm calling about the apartment advertised online.
Man: Yes, it's a two-bedroom flat on Green Street near the university.
Woman: That sounds good. How much is the rent?
Man: It used to be £720 last year, but the rent is now £750 per month.
(Questions for students, written separately: e.g. "Where is the apartment located?" / "What is the rent per month?")

The script must feel like a real conversation or lecture, not a list of answers.

SECTION 1 – SOCIAL CONVERSATION
Speakers: Two people in a casual conversation. Write a FULL conversation (e.g. full phone call or face-to-face chat), not a list of answer-like lines.
Scenario examples: booking accommodation, renting an apartment, joining a gym, course registration, booking tickets, library membership.
Content must include (woven naturally into the conversation): names, phone numbers, addresses, dates, prices, spelling.
Use "dialogueScript": [ {"speaker":"male","text":"..."}, {"speaker":"female","text":"..."} ] with at least 12 turns. Each turn must sound like real speech with context.
Question types allowed: form completion, table completion, note completion, short answer questions, maximum 1 simple multiple choice.
Do NOT include: academic discussion, map labeling, matching opinions, choose-two questions.

SECTION 2 – PUBLIC INFORMATION MONOLOGUE
Speakers: One speaker giving information. Write a FULL monologue (e.g. complete tour or introduction), not a list of facts.
Scenario examples: museum tour, campus guide, city park information, library facilities, sports center introduction.
Use "listeningScript": one continuous paragraph (monologue) with natural flow and extra detail.
Question types allowed: map labeling, matching, multiple choice, note completion.
This section MUST include at least one map or location question.
Do NOT include: choose-two questions, academic debate.

SECTION 3 – ACADEMIC DISCUSSION
Speakers: 2 to 4 speakers (students and possibly a tutor). Write a FULL discussion with opinions and back-and-forth, not a list of answers.
Scenario examples: research project discussion, assignment planning, presentation preparation, study group discussion.
Use "dialogueScript" with at least 14 turns. Harder vocabulary and academic discussion. Each turn must feel like real dialogue.
Question types allowed: multiple choice, "choose TWO answers" questions, matching opinions, sentence completion.
Do NOT use dialogueScript for Section 4.

SECTION 4 – ACADEMIC LECTURE
Speakers: One lecturer speaking to students. Write a FULL lecture (continuous explanation with examples and context), not a list of bullet points.
Scenario examples: environmental science, history, psychology, technology, business lecture.
Use "listeningScript": one continuous paragraph (lecture) with natural academic flow.
Question types allowed: note completion, summary completion, flowchart completion, table completion.
Do NOT include: dialogue, map labeling, choose-two questions.

JSON "type" FIELD — STRICT VOCABULARY (CRITICAL)
For every question object, the "type" field MUST be EXACTLY one of these three lowercase strings — no variants, no hyphens, no prefixes:
  • "multiple"  → multiple-choice question. MUST include an "options" array of at least 3 entries shaped {"value":"A","label":"..."} and "answer" must equal one of those values ("A", "B", "C", ...).
  • "matching"  → matching question (including matching opinions and map / plan / diagram labelling). MUST include an "options" array and "answer" must equal one of the option values.
  • "fill"      → every form, note, table, summary, flowchart, sentence, or short-answer completion question. "answer" is a string (or array of acceptable strings).
Do NOT invent any other type string such as "multiple-choice", "mcq", "matching-information", "note-completion", "sentence-completion", "map-labelling", etc. Use only "multiple", "matching", or "fill".

REQUIRED QUESTION-TYPE MIX PER SECTION (CRITICAL — match the official IELTS pattern)
  • Section 1 (Q1–Q10):  8–10 "fill"; 0–2 "multiple"; 0 "matching".
  • Section 2 (Q11–Q20): 4–5 "multiple"; 3–4 "matching" (include at least one map / location labelling); 1–2 "fill".
  • Section 3 (Q21–Q30): 4–5 "multiple"; 2–3 "matching"; 2–3 "fill".
  • Section 4 (Q31–Q40): 8–10 "fill"; 0–2 "multiple"; 0 "matching".
The total of 40 questions must include AT LEAST 8 "multiple" and AT LEAST 5 "matching" questions across Sections 2 and 3 combined.

RETURN STRUCTURE (JSON only, no markdown)
Each section must contain: id, title, context, durationSeconds (300), reviewSeconds (30), questionRange, and either dialogueScript (S1, S3) or listeningScript (S2, S4), plus exactly 10 questions in "questions" array.
Each question: id, type, prompt, instructions (optional), options (for multiple choice/matching), answer, explanation (optional). For "fill" questions, always include "instructions" (e.g. "Write ONE WORD ONLY." or "Write NO MORE THAN TWO WORDS AND/OR A NUMBER.") and "maxWords" (1 or 2) so students know the word limit. For "multiple" and "matching" questions, ALWAYS include the "options" array.

{
  "sections": [
    { "id": 1, "title": "Section 1", "context": "short description", "dialogueScript": [ {"speaker":"male","text":"..."}, {"speaker":"female","text":"..."} ], "durationSeconds": 300, "reviewSeconds": 30, "questionRange": "Questions 1-10", "questions": [ ... 10 questions ... ] },
    { "id": 2, "title": "Section 2", "context": "short description", "listeningScript": "monologue text...", "durationSeconds": 300, "reviewSeconds": 30, "questionRange": "Questions 11-20", "questions": [ ... 10 questions ... ] },
    { "id": 3, "title": "Section 3", "context": "short description", "dialogueScript": [ ... ], "durationSeconds": 300, "reviewSeconds": 30, "questionRange": "Questions 21-30", "questions": [ ... 10 questions ... ] },
    { "id": 4, "title": "Section 4", "context": "short description", "listeningScript": "lecture text...", "durationSeconds": 300, "reviewSeconds": 30, "questionRange": "Questions 31-40", "questions": [ ... 10 questions ... ] }
  ]
}
`.trim();

    const userPrompt = `
Generate one complete IELTS Listening test that follows the real exam format exactly.
- Exactly 4 sections; exactly 10 questions per section; 40 questions total.
- Section 1: full social conversation (dialogueScript). Section 2: full public monologue (listeningScript), include at least one map/location question. Section 3: full academic discussion (dialogueScript), include "choose TWO" and matching opinions. Section 4: full academic lecture (listeningScript).
- For each section: first write a complete, realistic scenario (conversation or lecture) with natural speech, context, extra details, and filler phrases. Do not write short sentences that only state answers. Then create the 10 questions based on information that appears naturally in that script. Never mention questions or options in the script. Each script must be long enough for ~4–5 minutes of audio and must feel like a real recording.
- Question "type" field must be EXACTLY "multiple", "matching", or "fill" — no other strings.
- Per-section type mix (mandatory, matches the official IELTS exam):
    Section 1 → 8–10 "fill", 0–2 "multiple", 0 "matching".
    Section 2 → 4–5 "multiple", 3–4 "matching" (one MUST be a map/location label), 1–2 "fill".
    Section 3 → 4–5 "multiple", 2–3 "matching", 2–3 "fill".
    Section 4 → 8–10 "fill", 0–2 "multiple", 0 "matching".
- Across the whole test there must be AT LEAST 8 "multiple" and AT LEAST 5 "matching" questions. Do not return a test that is mostly "fill" — that is incorrect IELTS structure.
- Every "multiple" and "matching" question MUST include an "options" array of 3+ entries shaped {"value":"A","label":"..."} and an "answer" equal to one of the option values.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty AI response for listening test");
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("❌ Failed to parse listening JSON:", err);
      return res.json(buildFallbackResponse(baseUrl));
    }

    let sections = normalizeSections(parsed);
    const testId = crypto.randomBytes(8).toString("hex");

    // Generate audio per section; always cache something so GET /audio never 404s
    for (let index = 0; index < sections.length; index++) {
      const section = sections[index];
      const audioUrl = `${baseUrl}/api/listening/audio/${testId}/${section.id}`;
      section.audioUrl = audioUrl;

      try {
        let audioBuffer = null;
        if (Array.isArray(section.dialogueScript) && section.dialogueScript.length) {
          audioBuffer = await generateDialogueAudio(
            section.dialogueScript,
            section,
            index
          );
        } else if (section.listeningScript) {
          audioBuffer = await generateMonologueAudio(
            section.listeningScript,
            section,
            index
          );
        }

        if (audioBuffer) {
          setListeningAudio(testId, section.id, audioBuffer);
        } else {
          console.warn(`⚠️ No script for section ${section.id}, caching fallback TTS`);
          const fallbackBuf = await synthesizeSpeech(
            `Section ${section.id}. Audio for this section is not available. Please try generating the test again.`,
            "alloy"
          ).catch(() => null);
          if (fallbackBuf) {
            setListeningAudio(testId, section.id, fallbackBuf);
          }
        }
      } catch (ttsError) {
        console.error(`⚠️ TTS failed for section ${section.id}:`, ttsError);
        try {
          const fallbackBuf = await synthesizeSpeech(
            `Section ${section.id}. This section could not be generated. Please try again.`,
            "alloy"
          );
          if (fallbackBuf) setListeningAudio(testId, section.id, fallbackBuf);
        } catch (e) {
          console.warn("Fallback TTS also failed, section will 404");
        }
      }

    }

    const totalQuestions = sections.reduce(
      (sum, s) =>
        sum + (Array.isArray(s.questions) ? s.questions.length : 0),
      0
    );

    console.log("✅ AI Listening test generated successfully with TTS");

    // Keep the scripts so the generation cache (in Firestore) can later be
    // used to rebuild audio on demand. We send the same payload back to the
    // client; the client just doesn't render those fields.
    registerCachedListeningTest({ testId, sections });

    return res.json({
      success: true,
      testId,
      sections,
      totalQuestions,
    });
  } catch (error) {
    console.error("❌ Error generating listening test:", error);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return res.json(buildFallbackResponse(baseUrl));
  }
});

function buildFallbackResponse(baseUrl = "") {
  const fallbackSections = [
    {
      id: 1,
      title: "Section 1 • Everyday Conversation",
      context: "Phone call about booking accommodation",
      audioUrl: baseUrl
        ? `${baseUrl}/api/listening/placeholder-audio`
        : "/api/listening/placeholder-audio",
      durationSeconds: 300,
      reviewSeconds: 30,
      questionRange: "Questions 1-10",
      questions: [
        {
          id: 1,
          type: "multiple",
          prompt: "What type of room does the caller want?",
          options: [
            { value: "A", label: "Single room" },
            { value: "B", label: "Double room" },
            { value: "C", label: "Suite" },
          ],
          answer: "B",
          explanation: "The caller requests a double room.",
        },
        {
          id: 2,
          type: "fill",
          prompt: "Check-in date: ________ 15th",
          instructions: "Write ONE WORD ONLY",
          answer: ["march"],
          maxWords: 1,
          explanation: "The booking is for March 15th.",
        },
      ],
    },
  ];

  // simple silent audio or pre-generated file could be used; here we just omit caching

  return {
    success: true,
    testId: "fallback",
    sections: fallbackSections,
    totalQuestions: fallbackSections.reduce(
      (sum, s) =>
        sum + (Array.isArray(s.questions) ? s.questions.length : 0),
      0
    ),
  };
}

module.exports = router;
// Helpers used by the generation-cache route so cached listening tests can
// rebuild their audio without re-running content generation.
module.exports.registerCachedListeningTest = registerCachedListeningTest;
