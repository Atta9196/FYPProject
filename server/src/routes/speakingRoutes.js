const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const {
  validateSpeakingSubmission,
  averageBand,
  clampBand,
  countWords,
  summariseStrengthsWeaknesses,
} = require("../services/scoringService");

const router = express.Router();

const SPEAKING_CRITERIA_LABELS = {
  fluency: "Fluency & Coherence",
  lexical: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
  pronunciation: "Pronunciation",
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Firestore
let db;
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  db = admin.firestore();
  console.log("✅ Firestore initialized successfully");
} catch (error) {
  console.error("❌ Firestore initialization failed:", error);
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, `audio-${uniqueSuffix}.webm`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'audio/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

/**
 * GET /api/speaking/question
 * Generate a dynamic IELTS Speaking Part 2 question using OpenAI with enhanced variety
 */
router.get("/question", async (req, res) => {
  try {
    console.log("🎯 Generating dynamic IELTS Speaking Part 2 question...");
    
    // Enhanced fallback questions with more variety
    const fallbackQuestions = [
      {
        question: "Describe a memorable journey you have taken. You should say where you went, how you traveled, what you saw and did, and explain why it was memorable.",
        topic: "travel and tourism"
      },
      {
        question: "Talk about a person who has influenced you. You should say who this person is, how you know them, what they have done, and explain why they have influenced you.",
        topic: "family and relationships"
      },
      {
        question: "Describe a book you have read recently. You should say what the book is about, when you read it, and explain why you liked or disliked it.",
        topic: "entertainment and media"
      },
      {
        question: "Describe a piece of technology that you find useful. You should say what it is, how you use it, and explain why you find it useful.",
        topic: "technology and innovation"
      },
      {
        question: "Talk about a hobby or activity you enjoy. You should say what it is, how often you do it, and explain why you enjoy it.",
        topic: "sports and recreation"
      },
      {
        question: "Describe a place you would like to visit. You should say where it is, what you know about it, and explain why you would like to go there.",
        topic: "travel and tourism"
      },
      {
        question: "Talk about a skill you would like to learn. You should say what it is, why you want to learn it, and explain how you would go about learning it.",
        topic: "education and learning"
      },
      {
        question: "Describe a time when you helped someone. You should say who you helped, what you did, and explain how you felt about helping them.",
        topic: "family and relationships"
      },
      {
        question: "Talk about a change you would like to make in your life. You should say what change you would make, why you want to make it, and explain how it would affect your life.",
        topic: "health and lifestyle"
      },
      {
        question: "Describe a festival or celebration in your country. You should say when it is celebrated, what people do, and explain why it is important to you.",
        topic: "culture and traditions"
      },
      {
        question: "Talk about a difficult decision you had to make. You should say what the decision was, what options you considered, and explain how you made your choice.",
        topic: "personal experiences"
      },
      {
        question: "Describe a piece of art or music that you like. You should say what it is, where you first saw or heard it, and explain why you like it.",
        topic: "arts and culture"
      },
      {
        question: "Talk about a time when you had to work in a team. You should say what the task was, who you worked with, and explain how well the team worked together.",
        topic: "work and career"
      },
      {
        question: "Describe a place where you like to spend time outdoors. You should say where it is, what you do there, and explain why you enjoy spending time there.",
        topic: "environment and nature"
      },
      {
        question: "Talk about a goal you have achieved. You should say what the goal was, how you achieved it, and explain how you felt when you reached it.",
        topic: "personal achievements"
      }
    ];
    
    // Try OpenAI first with enhanced prompt for more variety
    try {
      const questionTypes = [
        "personal experience",
        "future plans", 
        "past event",
        "hypothetical situation",
        "comparison",
        "problem-solving",
        "opinion-based",
        "descriptive"
      ];
      
      const topics = [
        "education and learning",
        "travel and tourism", 
        "technology and innovation",
        "culture and traditions",
        "work and career",
        "environment and nature",
        "health and lifestyle",
        "entertainment and media",
        "family and relationships",
        "sports and recreation",
        "arts and culture",
        "personal achievements",
        "social issues",
        "food and cooking",
        "fashion and style"
      ];
      
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for question generation
        messages: [
          {
            role: "system",
            content: `IELTS examiner. Create Part 2 question.

Topic: ${randomTopic}
Type: ${randomType}

Requirements:
- Include points to cover
- IELTS level (B1-C2)
- Return ONLY question text, no formatting`
          },
          {
            role: "user",
            content: `Create Part 2 question: ${randomTopic} (${randomType})`
          }
        ],
        max_tokens: 200, // Reduced from 300 - questions don't need that many tokens
        temperature: 0.8 // Slightly lower for more consistent quality
      });

      const question = completion.choices[0].message.content.trim();
      
      console.log("✅ Generated dynamic AI question:", question);
      
      res.json({ 
        question: question,
        topic: randomTopic,
        type: randomType,
        success: true 
      });
      
    } catch (openaiError) {
      console.log("⚠️ OpenAI API failed, using enhanced fallback questions:", openaiError.message);
      
      // Use enhanced fallback questions
      const randomIndex = Math.floor(Math.random() * fallbackQuestions.length);
      const selectedQuestion = fallbackQuestions[randomIndex];
      
      console.log("✅ Using enhanced fallback question:", selectedQuestion.question);
      
      res.json({ 
        question: selectedQuestion.question,
        topic: selectedQuestion.topic,
        type: "fallback",
        success: true 
      });
    }
    
  } catch (error) {
    console.error("❌ Error generating question:", error);
    res.status(500).json({ 
      error: "Failed to generate question",
      message: error.message,
      success: false 
    });
  }
});

/**
 * POST /api/speaking/evaluate
 *
 * Hybrid IELTS Speaking scoring:
 *  1. Transcribe with Whisper.
 *  2. Pre-AI validation (anti-cheating + duration / length caps):
 *       - empty transcript / no audio → band 0
 *       - duration < 20s             → max band 3
 *       - words < 30                 → max band 3.5
 *       - words < 60                 → max band 4.5
 *       - response is mostly repeated words → max band 3
 *  3. AI evaluation of the four official IELTS criteria (Fluency,
 *     Lexical, Grammar, Pronunciation) PLUS a relevance check against the
 *     question. If the AI judges the answer unrelated to the question,
 *     overall band is capped at 4.
 *  4. Overall band = average of the four criteria, rounded with the IELTS
 *     0.25/0.75 rule, then capped by any rules that triggered.
 *  5. Returns a uniform explanation block:
 *       { reasonForScore, strengths, weaknesses, suggestions }
 *
 * Accepts these optional form fields alongside the audio file:
 *   - question:         the prompt the candidate was answering
 *   - audioDurationSec: client-measured duration in seconds (for the < 20s cap)
 *   - userId:           saved on the Firestore record
 */
router.post("/evaluate", upload.single("audio"), async (req, res) => {
  try {
    console.log("🎤 Starting speaking evaluation...");

    if (!req.file) {
      return res.status(400).json({
        error: "No audio file provided",
        success: false,
      });
    }

    const audioFilePath = req.file.path;
    console.log("📁 Audio file saved at:", audioFilePath);

    // ── Step 1: transcribe ────────────────────────────────────────────────
    console.log("🎧 Transcribing audio with Whisper...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      language: "en",
    });

    const transcript = (transcription.text || "").trim();
    const transcribedWords = countWords(transcript);
    console.log("📝 Transcript:", transcript, "| words:", transcribedWords);

    const question = req.body?.question ? String(req.body.question).trim() : "";
    const audioDurationSec = Number.isFinite(Number(req.body?.audioDurationSec))
      ? Number(req.body.audioDurationSec)
      : null;

    // ── Step 2: deterministic validation ──────────────────────────────────
    const validation = validateSpeakingSubmission({
      transcript,
      audioDurationSec,
    });

    // Empty transcript / no audio → short-circuit with band 0 (no AI call)
    if (!validation.valid) {
      fs.unlink(audioFilePath, (err) => {
        if (err) console.error("⚠️ Error deleting file:", err);
      });
      const payload = buildSpeakingShortCircuit({
        transcript,
        question,
        wordCount: validation.wordCount,
        audioDurationSec,
        band: Number(validation.wordCap.cap ?? 0),
        reason: validation.wordCap.reason || "No speech detected.",
        issues: validation.issues,
      });
      return res.status(200).json(payload);
    }

    // ── Step 3: AI evaluation of the four criteria + relevance ────────────
    let aiResult;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content: `You are a senior IELTS Speaking examiner. Score the candidate using the official IELTS Speaking band descriptors based ONLY on the transcript (you cannot hear the audio).

Return ONLY a JSON object with this exact schema (no markdown, no extra commentary):
{
  "scores": {
    "fluency":       <number 0-9 in 0.5 steps>,   // Fluency & Coherence
    "lexical":       <number 0-9 in 0.5 steps>,   // Lexical Resource
    "grammar":       <number 0-9 in 0.5 steps>,   // Grammatical Range & Accuracy
    "pronunciation": <number 0-9 in 0.5 steps>    // Pronunciation (estimated from transcript clarity, since audio is not available)
  },
  "feedback": {
    "fluency":       "<1-2 sentences>",
    "lexical":       "<1-2 sentences>",
    "grammar":       "<1-2 sentences>",
    "pronunciation": "<1-2 sentences>"
  },
  "strengths":   ["<short bullet>", "..."],   // 2-3 specific strengths
  "weaknesses":  ["<short bullet>", "..."],   // 2-3 specific weaknesses
  "suggestions": ["<short actionable tip>", "..."], // 3-5 concrete tips
  "flags": {
    "relevant":         <true if the response actually addresses the question, false otherwise>,
    "relevance_reason": "<short reason or empty string>",
    "meaningful":       <true if the response demonstrates meaningful communication; false if it is just words without content>,
    "sufficient":       <true if there is enough content to assess IELTS criteria; false if too short>
  }
}

Strict rules:
- If the response is OFF-TOPIC, set relevant=false and DO NOT give Fluency above 5 or Lexical above 5.
- If the response is on-topic but extremely short/limited, lower Lexical and Grammar accordingly.
- If the response is mostly memorised template, lower Lexical.
- Be specific in feedback — reference what the candidate actually said.`,
          },
          {
            role: "user",
            content: question
              ? `Question: ${question}\n\nCandidate transcript (${transcribedWords} words):\n"""${transcript}"""\n\nReturn the JSON.`
              : `Candidate transcript (${transcribedWords} words):\n"""${transcript}"""\n\nReturn the JSON.`,
          },
        ],
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty AI response for speaking evaluation");
      try {
        aiResult = JSON.parse(content);
      } catch (e) {
        throw new Error("Failed to parse speaking evaluation JSON");
      }
    } catch (openaiError) {
      console.error("⚠️ OpenAI API failed for evaluation:", openaiError.message);
      fs.unlink(audioFilePath, (err) => {
        if (err) console.error("⚠️ Error deleting file:", err);
      });
      return res.status(503).json({
        success: false,
        error: "AI evaluation is temporarily unavailable. Please try again.",
        noSpeech: false,
      });
    }

    const scores = {
      fluency:       clampBand(aiResult?.scores?.fluency),
      lexical:       clampBand(aiResult?.scores?.lexical),
      grammar:       clampBand(aiResult?.scores?.grammar),
      pronunciation: clampBand(aiResult?.scores?.pronunciation),
    };

    const flags = {
      relevant:        aiResult?.flags?.relevant !== false,
      relevanceReason: typeof aiResult?.flags?.relevance_reason === "string"
        ? aiResult.flags.relevance_reason.trim()
        : "",
      meaningful:      aiResult?.flags?.meaningful !== false,
      sufficient:      aiResult?.flags?.sufficient !== false,
    };

    // ── Step 4: average + apply caps ──────────────────────────────────────
    const rawAverage = averageBand([
      scores.fluency,
      scores.lexical,
      scores.grammar,
      scores.pronunciation,
    ]);
    const rawOverallBand = clampBand(rawAverage);
    let adjustedBand = rawOverallBand ?? 0;

    const penalties = {};
    const capReasons = [];

    const wordCap = validation.wordCap.cap;
    if (wordCap !== null && wordCap !== undefined) {
      if (adjustedBand > wordCap) {
        adjustedBand = wordCap;
        penalties.lengthCap = true;
        capReasons.push(validation.wordCap.reason);
      }
    }

    if (!flags.relevant && adjustedBand > 4) {
      adjustedBand = 4;
      penalties.unrelatedCap = true;
      capReasons.push(
        flags.relevanceReason
          ? `Response is off-topic: ${flags.relevanceReason} (capped at band 4).`
          : "Response is off-topic — overall capped at band 4."
      );
    }

    if (!flags.meaningful && adjustedBand > 3.5) {
      adjustedBand = 3.5;
      penalties.notMeaningful = true;
      capReasons.push("Response lacks meaningful communication — capped at band 3.5.");
    }

    const overallBand = clampBand(adjustedBand);

    // Build legacy `feedback` object the existing UI already renders
    const fluencyText = stringOrSpeaking(aiResult?.feedback?.fluency, "No fluency feedback");
    const lexicalText = stringOrSpeaking(aiResult?.feedback?.lexical, "No lexical feedback");
    const grammarText = stringOrSpeaking(aiResult?.feedback?.grammar, "No grammar feedback");
    const pronunciationText = stringOrSpeaking(
      aiResult?.feedback?.pronunciation,
      "Pronunciation cannot be fully assessed from text alone."
    );

    const legacyFeedback = {
      fluency: `${scores.fluency ?? "-"} / 9 - ${fluencyText}`,
      lexical: `${scores.lexical ?? "-"} / 9 - ${lexicalText}`,
      grammar: `${scores.grammar ?? "-"} / 9 - ${grammarText}`,
      pronunciation: `${scores.pronunciation ?? "-"} / 9 - ${pronunciationText}`,
      bandScore: overallBand,
    };

    const aiStrengths = Array.isArray(aiResult?.strengths)
      ? aiResult.strengths.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : [];
    const aiWeaknesses = Array.isArray(aiResult?.weaknesses)
      ? aiResult.weaknesses.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : [];
    const aiSuggestions = Array.isArray(aiResult?.suggestions)
      ? aiResult.suggestions.filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
      : [];

    const fallback = summariseStrengthsWeaknesses(scores, SPEAKING_CRITERIA_LABELS);
    const strengths = aiStrengths.length ? aiStrengths : fallback.strengths;
    const weaknesses = aiWeaknesses.length ? aiWeaknesses : fallback.weaknesses;
    const suggestions = aiSuggestions.length
      ? aiSuggestions
      : [
          "Use a wider range of linking expressions to improve coherence.",
          "Stretch sentences with relative clauses or conditional structures.",
          "Practise idiomatic vocabulary and topic-specific collocations.",
        ];

    const reasonForScore = buildSpeakingReason({
      overallBand,
      rawOverallBand,
      scores,
      capReasons,
      wordCount: transcribedWords,
      durationSec: audioDurationSec,
    });

    // Clean up the uploaded file
    fs.unlink(audioFilePath, (err) => {
      if (err) console.error("⚠️ Error deleting audio file:", err);
      else console.log("🗑️ Audio file cleaned up");
    });

    // ── Step 5: persist + respond ─────────────────────────────────────────
    if (db) {
      try {
        await db.collection("speaking_practice").add({
          userId: req.body?.userId || "anonymous",
          question: question || "Unknown question",
          transcript,
          feedback: legacyFeedback,
          scores,
          overallBand,
          penalties,
          capReasons,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: "recorded_practice",
        });
      } catch (firestoreError) {
        console.error("⚠️ Error saving to Firestore:", firestoreError);
      }
    }

    console.log("✅ Evaluation completed successfully");
    return res.json({
      success: true,
      module: "speaking",
      transcript,
      audioDurationSec,
      wordCount: transcribedWords,
      scores,
      feedback: legacyFeedback,
      bandScore: overallBand,
      band: overallBand,
      overallBand,
      rawOverallBand,
      penalties,
      capReasons,
      flags,
      summary: {
        reasonForScore,
        strengths,
        weaknesses,
        suggestions,
      },
    });
  } catch (error) {
    console.error("❌ Error evaluating speaking:", error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("⚠️ Error deleting audio file:", err);
      });
    }

    res.status(500).json({
      error: "Failed to evaluate speaking",
      message: error.message,
      success: false,
    });
  }
});

function stringOrSpeaking(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildSpeakingShortCircuit({
  transcript,
  question,
  wordCount,
  audioDurationSec,
  band,
  reason,
  issues,
}) {
  const noSpeech = issues?.includes("empty-transcript");
  const zeroBlock = `${band ?? 0} / 9 - ${reason || "Not enough content to assess."}`;
  return {
    success: true,
    module: "speaking",
    transcript: transcript || "(no speech detected)",
    audioDurationSec,
    wordCount,
    noSpeech: !!noSpeech,
    message: noSpeech ? "No speech detected. Please record your response and try again." : reason,
    scores: { fluency: band, lexical: band, grammar: band, pronunciation: band },
    feedback: noSpeech
      ? null
      : {
          fluency: zeroBlock,
          lexical: zeroBlock,
          grammar: zeroBlock,
          pronunciation: zeroBlock,
          bandScore: band,
        },
    bandScore: noSpeech ? null : band,
    band: noSpeech ? null : band,
    overallBand: noSpeech ? null : band,
    penalties: { invalidSubmission: true },
    capReasons: [reason || "Submission could not be assessed."],
    flags: { relevant: false, meaningful: false, sufficient: false },
    summary: {
      reasonForScore: reason || "Submission could not be assessed.",
      strengths: [],
      weaknesses: [reason || "Not enough speech to evaluate."],
      suggestions: [
        "Speak for at least 30–60 seconds to give the examiner enough to assess.",
        "Address every part of the question with examples.",
        "Vary your sentence structures and topic-specific vocabulary.",
      ],
    },
  };
}

function buildSpeakingReason({ overallBand, rawOverallBand, scores, capReasons, wordCount, durationSec }) {
  const parts = [];
  parts.push(
    `Overall band ${overallBand} from Fluency ${scores.fluency ?? "-"}, ` +
    `Lexical ${scores.lexical ?? "-"}, Grammar ${scores.grammar ?? "-"}, ` +
    `Pronunciation ${scores.pronunciation ?? "-"} (raw average ${rawOverallBand ?? "-"}).`
  );
  if (typeof wordCount === "number") {
    parts.push(`Spoken words: ${wordCount}.`);
  }
  if (durationSec !== null && durationSec !== undefined) {
    parts.push(`Speech duration: ${Math.round(durationSec)}s.`);
  }
  if (capReasons && capReasons.length) parts.push(...capReasons);
  if (!capReasons?.length) parts.push("No penalties applied.");
  return parts.join(" ");
}

/**
 * POST /api/speaking/realtime/start
 * Start a dynamic real-time conversation session with enhanced AI interaction
 */
router.post("/realtime/start", async (req, res) => {
  try {
    console.log("🎙️ Starting dynamic real-time conversation session...");
    console.log("📋 Request body:", req.body);
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced fallback messages with more variety
    const fallbackMessages = [
      "Hello! Welcome to your IELTS speaking practice session. I'm your examiner today. Let's start with something simple - could you tell me a little bit about yourself? What do you do for work or study?",
      "Good to meet you! I'm here to help you practice for your IELTS speaking test. To begin, could you tell me about your hometown? What's it like living there?",
      "Welcome! I'm excited to practice with you today. Let's start with an easy question - what do you like to do in your free time? Do you have any hobbies or interests?",
      "Hello there! I'm your IELTS examiner for today's practice session. Let's begin with a simple question - could you describe your typical day? What do you usually do from morning to evening?",
      "Hi! Great to have you here for some IELTS speaking practice. Let's start with something personal - could you tell me about a place you've visited recently? What did you like about it?",
      "Welcome! I'm looking forward to our practice session today. Let's start with a warm-up question - what's your favorite type of music or movie? Why do you enjoy it?",
      "Hello! I'm your IELTS examiner. Let's begin our practice session. Could you tell me about a skill you've learned recently? How did you go about learning it?",
      "Good to see you! Let's start our IELTS speaking practice. I'd like to know - what's something you're looking forward to in the near future? Why is it important to you?"
    ];
    
    try {
      // Try OpenAI first with enhanced prompt for more dynamic conversation
      const conversationStyles = [
        "warm and encouraging",
        "professional and focused", 
        "casual and friendly",
        "enthusiastic and supportive",
        "calm and reassuring"
      ];
      
      const randomStyle = conversationStyles[Math.floor(Math.random() * conversationStyles.length)];
      
      const initialMessage = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for conversations
        messages: [
          {
            role: "system",
            content: `IELTS examiner. Style: ${randomStyle}

CRITICAL: Listen carefully and respond directly to what user says.

Rules:
- Respond to user's actual words, not generic templates
- Ask specific follow-ups based on their response
- Reference specific details they mention
- Mix Part 1 & 3 questions naturally
- Be conversational, not robotic

Start with warm greeting + opening question.`
          },
          {
            role: "user",
            content: "Start IELTS practice with engaging opening."
          }
        ],
        max_tokens: 150, // Reduced from 250 - greeting should be concise
        temperature: 0.7 // Slightly lower for more focused responses
      });

      const examinerMessage = initialMessage.choices[0].message.content.trim();
      
      res.json({
        sessionId: sessionId,
        message: examinerMessage,
        style: randomStyle,
        success: true
      });
      
    } catch (openaiError) {
      console.error("❌ OpenAI API failed for real-time start!");
      console.error("❌ Error details:", {
        message: openaiError.message,
        status: openaiError.status,
        code: openaiError.code,
        type: openaiError.type,
        response: openaiError.response?.data || 'No response data'
      });
      console.log("⚠️ Using enhanced fallback response");
      
      // Use enhanced fallback message
      const randomIndex = Math.floor(Math.random() * fallbackMessages.length);
      const fallbackMessage = fallbackMessages[randomIndex];
      
      res.json({
        sessionId: sessionId,
        message: fallbackMessage,
        style: "fallback",
        success: true
      });
    }
    
  } catch (error) {
    console.error("❌ Error starting real-time session:", error);
    res.status(500).json({
      error: "Failed to start real-time session",
      message: error.message,
      success: false
    });
  }
});

/**
 * POST /api/speaking/realtime/continue
 * Continue the dynamic real-time conversation with enhanced AI interaction
 */
router.post("/realtime/continue", async (req, res) => {
  try {
    // Debug logging
    console.log("📥 Received request:");
    console.log("  - Method:", req.method);
    console.log("  - URL:", req.url);
    console.log("  - Headers:", JSON.stringify(req.headers, null, 2));
    console.log("  - Content-Type:", req.headers['content-type']);
    console.log("  - Body type:", typeof req.body);
    console.log("  - Body:", req.body);
    console.log("  - Body keys:", req.body ? Object.keys(req.body) : "N/A");
    
    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error("❌ Request body is undefined or empty");
      console.error("  - Content-Type header:", req.headers['content-type']);
      console.error("  - Raw body:", req.body);
      return res.status(400).json({
        error: "Request body is required",
        message: "Please send a JSON body with sessionId and userMessage. Make sure Content-Type: application/json header is set and body is raw JSON.",
        debug: {
          contentType: req.headers['content-type'],
          bodyType: typeof req.body,
          bodyExists: !!req.body
        },
        success: false
      });
    }
    
    const { sessionId, userMessage, conversationHistory = [] } = req.body;
    
    // Validate required fields
    if (!sessionId) {
      console.error("❌ sessionId is missing");
      return res.status(400).json({
        error: "sessionId is required",
        message: "Please provide a sessionId in the request body",
        success: false
      });
    }
    
    if (!userMessage) {
      console.error("❌ userMessage is missing");
      return res.status(400).json({
        error: "userMessage is required",
        message: "Please provide a userMessage in the request body",
        success: false
      });
    }
    
    console.log("💬 Continuing dynamic real-time conversation...");
    console.log("📋 Request body:", { sessionId, userMessage, conversationHistoryLength: conversationHistory?.length || 0 });
    
    // Enhanced fallback responses with more variety and context awareness
    const getFallbackResponse = (userMessage, conversationHistory) => {
      const lowerMessage = userMessage.toLowerCase();
      const recentTopics = conversationHistory.slice(-4).map(msg => msg.content.toLowerCase()).join(' ');
      
      // Context-aware responses
      if (lowerMessage.includes('work') || lowerMessage.includes('job') || lowerMessage.includes('career')) {
        const responses = [
          "That's interesting! Tell me more about your work. What do you enjoy most about your job?",
          "How fascinating! What's the most challenging aspect of your work?",
          "That sounds rewarding! How did you get into that field?",
          "Great! What skills do you think are most important for your job?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (lowerMessage.includes('study') || lowerMessage.includes('school') || lowerMessage.includes('university')) {
        const responses = [
          "Great! What are you studying? What do you like about your course?",
          "That's wonderful! What's the most interesting thing you've learned recently?",
          "How exciting! What do you plan to do after you finish your studies?",
          "That sounds challenging! What's your favorite subject?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (lowerMessage.includes('hobby') || lowerMessage.includes('interest') || lowerMessage.includes('free time')) {
        const responses = [
          "That sounds fascinating! How did you get interested in that? What do you enjoy most about it?",
          "How wonderful! How long have you been doing that?",
          "That's impressive! What's the most challenging part?",
          "Great! Would you recommend it to others? Why?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (lowerMessage.includes('travel') || lowerMessage.includes('visit') || lowerMessage.includes('trip')) {
        const responses = [
          "How wonderful! Traveling is such a great experience. What was the most memorable part of that trip?",
          "That sounds amazing! What did you learn from that experience?",
          "How exciting! Where would you like to go next?",
          "That's fantastic! What was the most surprising thing about that place?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (lowerMessage.includes('family') || lowerMessage.includes('friend') || lowerMessage.includes('relationship')) {
        const responses = [
          "That's lovely! Family and friends are so important. Can you tell me more about that?",
          "How wonderful! What do you value most about those relationships?",
          "That's beautiful! How do you maintain those connections?",
          "Great! What's the best advice you've received from them?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (lowerMessage.includes('food') || lowerMessage.includes('eat') || lowerMessage.includes('cook')) {
        const responses = [
          "Food is such an important part of culture! What's your favorite dish? Why do you like it?",
          "That sounds delicious! Do you enjoy cooking? What's your specialty?",
          "How interesting! What's the most unusual food you've tried?",
          "Great! What's your favorite type of cuisine?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (lowerMessage.includes('music') || lowerMessage.includes('movie') || lowerMessage.includes('book')) {
        const responses = [
          "That's a great choice! What do you like about it? Would you recommend it to others?",
          "How interesting! What draws you to that type of entertainment?",
          "That sounds wonderful! What's your all-time favorite?",
          "Great! How do you usually discover new things to enjoy?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else if (lowerMessage.includes('sport') || lowerMessage.includes('exercise') || lowerMessage.includes('fitness')) {
        const responses = [
          "Excellent! Staying active is so important. What do you enjoy most about that activity?",
          "That's fantastic! How often do you do that?",
          "How motivating! What benefits have you noticed?",
          "Great! What advice would you give to someone starting out?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      } else {
        // Dynamic follow-up questions based on conversation context
        const contextualQuestions = [
          "That's very interesting! Can you tell me more about that?",
          "I see! What do you like most about that?",
          "How fascinating! What made you choose that?",
          "That sounds great! How long have you been doing that?",
          "Interesting! What do you find most challenging about that?",
          "That's wonderful! What would you recommend to someone who wants to try that?",
          "How nice! What's the best part about that experience?",
          "That's impressive! How did you get started with that?",
          "That's amazing! What's next for you in that area?",
          "How exciting! What's your favorite memory related to that?",
          "That's inspiring! What advice would you give to others?",
          "How interesting! What surprised you most about that?"
        ];
        return contextualQuestions[Math.floor(Math.random() * contextualQuestions.length)];
      }
    };
    
    try {
      // Try OpenAI first with enhanced context awareness and STREAMING enabled
      // Normalize client history roles to OpenAI roles
      const normalizedHistory = (Array.isArray(conversationHistory) ? conversationHistory : [])
        .slice(-8)
        .map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant', // map 'examiner' -> 'assistant'
          content: String(msg.content || '').trim(),
        }))
        .filter((m) => m.content.length > 0);

      const messages = [
        {
          role: "system",
          content: `You are a professional IELTS Speaking examiner conducting a dynamic practice session. 

CRITICAL: You must READ and UNDERSTAND what the user actually said, then respond SPECIFICALLY to their message. Do NOT use generic phrases like "That's interesting! Can you tell me more about that?" 

Your role:
- READ the user's message carefully and understand what they actually said
- Respond DIRECTLY to what they mentioned - reference specific details from their answer
- If they mentioned a job, hobby, place, or experience, ask about THAT specific thing
- If they asked a question, ANSWER IT directly
- If they shared information, acknowledge the SPECIFIC information they shared
- Show you understood by referencing what they actually said
- Ask follow-up questions that are SPECIFIC to their response, not generic
- Be conversational, engaging, and human-like
- Keep responses concise but meaningful (1-2 sentences max)

Examples of GOOD responses:
- User: "I work as a software engineer" → "That's great! What programming languages do you use most often in your work?"
- User: "I like playing football" → "Football is exciting! Do you play in a team or just for fun? What position do you play?"
- User: "I visited Paris last year" → "Paris is beautiful! What was your favorite part of the trip? Did you visit the Eiffel Tower?"

Examples of BAD responses (DO NOT USE):
- "That's very interesting! Can you tell me more about that?" (too generic)
- "That's wonderful! What would you recommend?" (doesn't reference what they said)
- "How fascinating! What made you choose that?" (generic, doesn't show understanding)

Guidelines:
- ALWAYS reference specific things the user mentioned
- Show you READ and UNDERSTOOD their message
- Ask SPECIFIC follow-up questions based on what they said
- If they mentioned a place, ask about that place specifically
- If they mentioned a job, ask about that job specifically
- If they mentioned a hobby, ask about that hobby specifically
- Keep the tone encouraging and supportive
- Make the conversation feel natural and flowing`
        },
        ...normalizedHistory, // Keep last messages with correct roles for better context
        {
          role: "user",
          content: userMessage
        }
      ];
      
      // Enable streaming for realtime responses
      console.log('🔄 Starting streaming response for realtime/continue...');
      
      // Set headers for Server-Sent Events (SSE) streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for conversations
        messages: messages,
        max_tokens: 150, // Reduced from 250 - responses should be concise (1-2 sentences)
        temperature: 0.7, // Slightly lower for more focused responses
        stream: true // Enable streaming for realtime responses
      });

      let fullResponse = '';
      
      // Stream chunks to client in realtime
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          // Send each chunk as it arrives
          res.write(`data: ${JSON.stringify({ chunk: content, isComplete: false })}\n\n`);
        }
      }
      
      // Send final complete message
      const examinerResponse = fullResponse.trim();
      res.write(`data: ${JSON.stringify({ message: examinerResponse, success: true, isComplete: true })}\n\n`);
      res.end();
      
    } catch (openaiError) {
      console.error("❌ OpenAI API failed for continue conversation!");
      console.error("❌ Error details:", {
        message: openaiError.message,
        status: openaiError.status,
        code: openaiError.code,
        type: openaiError.type,
        response: openaiError.response?.data || 'No response data'
      });
      console.log("⚠️ Using enhanced fallback response");
      
      // Use enhanced fallback response - also send as SSE for consistency
      const fallbackResponse = getFallbackResponse(userMessage, conversationHistory);
      
      // If headers were already set for SSE, use SSE format
      if (res.getHeader('Content-Type') === 'text/event-stream') {
        res.write(`data: ${JSON.stringify({ message: fallbackResponse, success: true, isComplete: true, fallback: true })}\n\n`);
        res.end();
      } else {
        // Fallback to JSON if SSE headers weren't set
        res.json({
          message: fallbackResponse,
          success: true
        });
      }
    }
    
  } catch (error) {
    console.error("❌ Error continuing conversation:", error);
    res.status(500).json({
      error: "Failed to continue conversation",
      message: error.message,
      success: false
    });
  }
});

/**
 * Helper: extract numeric band score from feedback text or fall back to heuristic.
 */
function extractBandScoreFromFeedback(feedback, userMessageCount = 0) {
  if (typeof feedback === "string") {
    const match =
      feedback.match(/band\s*score[^0-9]*([0-9](?:\.[0-9])?)/i) ||
      feedback.match(/band[^0-9]*([0-9](?:\.[0-9])?)/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (!Number.isNaN(val) && val >= 0 && val <= 9) return val;
    }
  }
  // Simple heuristic based on how much the student spoke
  if (userMessageCount >= 7) return 7.0;
  if (userMessageCount >= 5) return 6.5;
  if (userMessageCount >= 3) return 6.0;
  return 5.5;
}

/**
 * POST /api/speaking/realtime/end
 * End the real-time session and provide summary feedback + numeric bandScore
 */
router.post("/realtime/end", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: "Request body is required",
      });
    }

    const {
      sessionId,
      conversationHistory = [],
      userId,
      userSpeakingDurationSec,
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "sessionId is required",
      });
    }

    console.log("🏁 Ending realtime session for scoring:", {
      sessionId,
      userId,
      messages: conversationHistory.length,
      userDuration: userSpeakingDurationSec,
    });

    // ── Build the candidate-only transcript and conversation Q/A pairs ──
    const userMessages = conversationHistory.filter((m) => m && m.role === "user" && typeof m.content === "string");
    const totalTranscript = userMessages.map((m) => (m.content || "").trim()).filter(Boolean).join(" ");
    const totalWordCount = countWords(totalTranscript);
    const totalDurationSec = Number.isFinite(Number(userSpeakingDurationSec))
      ? Math.max(0, Number(userSpeakingDurationSec))
      : 0;

    // Reconstruct examiner → candidate pairs so the AI can judge relevance
    const pairs = [];
    let pendingQ = null;
    conversationHistory.forEach((m) => {
      if (!m || typeof m.content !== "string") return;
      if (m.role === "examiner") pendingQ = m.content.trim();
      else if (m.role === "user") {
        pairs.push({
          question: pendingQ || "(open conversation)",
          answer: (m.content || "").trim(),
        });
        pendingQ = null;
      }
    });

    const persist = (payload) => {
      if (!db) return payload;
      const safeScores = payload.scores || null;
      db.collection("speaking_practice")
        .add({
          userId: userId || "anonymous",
          sessionId,
          conversationHistory,
          feedback: payload.feedback || null,
          bandScore: payload.bandScore ?? null,
          scores: safeScores,
          summary: payload.summary || null,
          wordCount: payload.wordCount ?? null,
          durationSec: payload.durationSec ?? null,
          penalties: payload.penalties || {},
          capReasons: payload.capReasons || [],
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: "realtime_practice",
        })
        .catch((err) => console.error("⚠️ Firestore save failed:", err));
      return payload;
    };

    // ── 1) Deterministic validation across the whole session ───────────
    // This is where the old "2 words → band 7" cheat is killed: empty,
    // gibberish, repeated-words, very short, very brief speech all get
    // hard caps BEFORE any AI scoring runs.
    const validation = validateSpeakingSubmission({
      transcript: totalTranscript,
      audioDurationSec: totalDurationSec,
    });

    if (!validation.valid) {
      const cap = Number(validation.wordCap.cap ?? 0);
      const payload = {
        success: true,
        sessionId,
        module: "speaking-realtime",
        transcript: totalTranscript,
        wordCount: totalWordCount,
        durationSec: totalDurationSec,
        scores: { fluency: cap, lexical: cap, grammar: cap, pronunciation: cap },
        bandScore: cap,
        band: cap,
        overallBand: cap,
        penalties: { invalidSubmission: true },
        capReasons: [validation.wordCap.reason || "Session could not be assessed."],
        flags: { relevant: false, meaningful: false, sufficient: false },
        feedback: {
          fluency: `${cap} / 9 - No usable speech detected.`,
          lexical: `${cap} / 9 - No usable speech detected.`,
          grammar: `${cap} / 9 - No usable speech detected.`,
          pronunciation: `${cap} / 9 - No usable speech detected.`,
          bandScore: cap,
        },
        summary: {
          reasonForScore: validation.wordCap.reason || "Session could not be assessed.",
          strengths: [],
          weaknesses: ["No assessable speech recorded during the session."],
          suggestions: [
            "Make sure your microphone works and you speak for at least 30-60 seconds per question.",
            "Answer the examiner's question with at least 2-3 full sentences.",
            "Avoid one-word answers — explain your reason with examples.",
          ],
          commonGrammarMistakes: [],
          vocabularyImprovements: [],
          pronunciationAdvice: [],
        },
      };
      return res.json(persist(payload));
    }

    // ── 2) AI scoring across the 4 IELTS criteria ──────────────────────
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY not configured",
      });
    }

    const transcriptForAI = pairs
      .map((p, i) => `Q${i + 1}: ${p.question}\nA${i + 1}: ${p.answer || "(no answer)"}`)
      .join("\n\n");

    const systemPrompt = `You are a strict, fair IELTS Speaking examiner scoring a candidate based ONLY on the transcript of a real-time conversation. Use the official IELTS band descriptors. Return ONLY JSON — no markdown, no commentary.

JSON SCHEMA:
{
  "scores": {
    "fluency":       <0-9 in 0.5 steps>,
    "lexical":       <0-9 in 0.5 steps>,
    "grammar":       <0-9 in 0.5 steps>,
    "pronunciation": <0-9 in 0.5 steps>
  },
  "feedback": {
    "fluency":       "<1-2 sentences>",
    "lexical":       "<1-2 sentences>",
    "grammar":       "<1-2 sentences>",
    "pronunciation": "<1-2 sentences>"
  },
  "strengths":   ["<2-3 specific strengths>"],
  "weaknesses":  ["<2-3 specific weaknesses>"],
  "suggestions": ["<3-5 concrete suggestions>"],
  "commonGrammarMistakes":   ["<2-4 specific grammar errors the candidate made>"],
  "vocabularyImprovements":  ["<2-4 vocabulary upgrades tied to what they said>"],
  "pronunciationAdvice":     ["<2-3 generic pronunciation tips>"],
  "flags": {
    "relevant":         <true if answers actually addressed the examiner's questions>,
    "relevance_reason": "<short reason or empty>",
    "meaningful":       <true if the responses are meaningful>,
    "sufficient":       <true if there is enough content to assess fairly>
  }
}

STRICT RULES — these prevent unfair high bands:
- One/two-word answers, partial sentences, or off-topic replies CANNOT score above band 4 on Fluency or Lexical.
- If the candidate spoke fewer than ~30 total words, ALL four scores must be ≤ 4.
- If answers don't address the questions, set relevant=false and keep Fluency/Lexical ≤ 4.
- Pronunciation must be conservative (no audio is available) — cap at 7 unless the transcript reads as perfectly fluent native English.
- Reference SPECIFIC things the candidate actually said; never write generic templates.`;

    const userPrompt = `Candidate-only word count: ${totalWordCount}.
Candidate-only speaking duration: ${Math.round(totalDurationSec)}s.

REALTIME SESSION TRANSCRIPT
===========================
${transcriptForAI || "(no transcript)"}

Return the JSON exactly per the schema. Be strict.`;

    let aiResult;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const content = completion.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty AI scoring response");
      aiResult = JSON.parse(content);
    } catch (aiErr) {
      console.error("❌ Realtime AI scoring failed:", aiErr);
      return res.status(503).json({
        success: false,
        error: "AI evaluation is temporarily unavailable. Please try again.",
      });
    }

    // ── 3) Apply post-AI IELTS caps ────────────────────────────────────
    const scores = {
      fluency:       clampBand(aiResult?.scores?.fluency),
      lexical:       clampBand(aiResult?.scores?.lexical),
      grammar:       clampBand(aiResult?.scores?.grammar),
      pronunciation: clampBand(aiResult?.scores?.pronunciation),
    };

    const flags = {
      relevant:        aiResult?.flags?.relevant !== false,
      relevanceReason: typeof aiResult?.flags?.relevance_reason === "string"
        ? aiResult.flags.relevance_reason.trim()
        : "",
      meaningful:      aiResult?.flags?.meaningful !== false,
      sufficient:      aiResult?.flags?.sufficient !== false,
    };

    const rawAverage = averageBand([
      scores.fluency,
      scores.lexical,
      scores.grammar,
      scores.pronunciation,
    ]);
    let adjustedBand = clampBand(rawAverage) ?? 0;
    const penalties = {};
    const capReasons = [];

    const wordCap = validation.wordCap.cap;
    if (wordCap !== null && wordCap !== undefined && adjustedBand > wordCap) {
      adjustedBand = wordCap;
      penalties.lengthCap = true;
      capReasons.push(validation.wordCap.reason);
    }
    if (!flags.relevant && adjustedBand > 4) {
      adjustedBand = 4;
      penalties.unrelatedCap = true;
      capReasons.push(
        flags.relevanceReason
          ? `Answers were off-topic: ${flags.relevanceReason} (capped at band 4).`
          : "Answers were off-topic — overall capped at band 4."
      );
    }
    if (!flags.meaningful && adjustedBand > 3.5) {
      adjustedBand = 3.5;
      penalties.notMeaningful = true;
      capReasons.push("Responses lacked meaningful communication — capped at band 3.5.");
    }

    const overallBand = clampBand(adjustedBand);

    const fluencyText = stringOrSpeaking(aiResult?.feedback?.fluency, "No fluency feedback");
    const lexicalText = stringOrSpeaking(aiResult?.feedback?.lexical, "No lexical feedback");
    const grammarText = stringOrSpeaking(aiResult?.feedback?.grammar, "No grammar feedback");
    const pronunciationText = stringOrSpeaking(
      aiResult?.feedback?.pronunciation,
      "Pronunciation cannot be fully assessed from text alone."
    );
    const feedback = {
      fluency: `${scores.fluency ?? "-"} / 9 - ${fluencyText}`,
      lexical: `${scores.lexical ?? "-"} / 9 - ${lexicalText}`,
      grammar: `${scores.grammar ?? "-"} / 9 - ${grammarText}`,
      pronunciation: `${scores.pronunciation ?? "-"} / 9 - ${pronunciationText}`,
      bandScore: overallBand,
    };

    const fallback = summariseStrengthsWeaknesses(scores, SPEAKING_CRITERIA_LABELS);
    const strengths = Array.isArray(aiResult?.strengths) && aiResult.strengths.length
      ? aiResult.strengths.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : fallback.strengths;
    const weaknesses = Array.isArray(aiResult?.weaknesses) && aiResult.weaknesses.length
      ? aiResult.weaknesses.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : fallback.weaknesses;
    const suggestions = Array.isArray(aiResult?.suggestions) && aiResult.suggestions.length
      ? aiResult.suggestions.filter((s) => typeof s === "string" && s.trim()).slice(0, 6)
      : [
          "Develop each answer with 2-3 supporting sentences and a concrete example.",
          "Add linking words: however, on the other hand, for example.",
          "Use a wider range of grammar: conditionals, relative clauses, passives.",
        ];
    const commonGrammarMistakes = Array.isArray(aiResult?.commonGrammarMistakes)
      ? aiResult.commonGrammarMistakes.filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
      : [];
    const vocabularyImprovements = Array.isArray(aiResult?.vocabularyImprovements)
      ? aiResult.vocabularyImprovements.filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
      : [];
    const pronunciationAdvice = Array.isArray(aiResult?.pronunciationAdvice)
      ? aiResult.pronunciationAdvice.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : [];

    const parts = [];
    parts.push(
      `Overall band ${overallBand} from Fluency ${scores.fluency ?? "-"}, ` +
      `Lexical ${scores.lexical ?? "-"}, Grammar ${scores.grammar ?? "-"}, ` +
      `Pronunciation ${scores.pronunciation ?? "-"} (raw average ${clampBand(rawAverage) ?? "-"}).`
    );
    parts.push(`Total spoken words: ${totalWordCount}.`);
    parts.push(`Total speaking duration: ${Math.round(totalDurationSec)}s.`);
    if (capReasons.length) parts.push(...capReasons);
    if (!capReasons.length) parts.push("No penalties applied.");
    const reasonForScore = parts.join(" ");

    const payload = {
      success: true,
      sessionId,
      module: "speaking-realtime",
      transcript: totalTranscript,
      wordCount: totalWordCount,
      durationSec: totalDurationSec,
      scores,
      bandScore: overallBand,
      band: overallBand,
      overallBand,
      rawOverallBand: clampBand(rawAverage),
      penalties,
      capReasons,
      flags,
      feedback,
      summary: {
        reasonForScore,
        strengths,
        weaknesses,
        suggestions,
        commonGrammarMistakes,
        vocabularyImprovements,
        pronunciationAdvice,
      },
    };

    return res.json(persist(payload));
  } catch (error) {
    console.error("❌ Realtime session scoring crashed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to score the realtime session.",
      message: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IELTS Speaking Exam Simulation
//
// Three new endpoints power a realistic IELTS Speaking test:
//
//   POST /api/speaking/exam/setup
//      → Generates a complete exam structure (Part 1: 8-12 introduction
//        questions, Part 2: cue card with bullets, Part 3: 5-8 discussion
//        questions linked to the cue card topic). One AI call produces the
//        whole exam so latency between parts stays low and costs predictable.
//
//   POST /api/speaking/exam/transcribe   (multipart audio)
//      → Whisper-only transcription for a single answer. No scoring. Returns
//        { transcript, wordCount }. Called once per question/part.
//
//   POST /api/speaking/exam/score
//      → Final exam evaluation using the shared scoringService:
//        per-criterion bands (Fluency/Lexical/Grammar/Pronunciation),
//        duration/word/relevance/repetition caps applied, overall IELTS
//        band with proper .25/.75 rounding, strengths/weaknesses/suggestions
//        block plus targeted grammar / vocabulary / pronunciation advice.
//
// Existing routes (/question, /evaluate, /realtime/*, /history) are
// untouched so the Record + Text + Voice modes keep working unchanged.
// ─────────────────────────────────────────────────────────────────────────────

router.post("/exam/setup", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY not configured",
      });
    }

    const sessionId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const systemPrompt = `You are a professional IELTS Speaking examiner generating a COMPLETE Speaking test that mirrors the real Cambridge IELTS Speaking exam exactly. Return ONLY valid JSON — no commentary, no markdown.

REAL IELTS STRUCTURE
- Part 1 (Introduction & Interview, 4-5 min): 8-12 short personal questions on 2-3 familiar topics (hometown, work/study, hobbies, family, daily life, food, travel, etc.). Start with 2 fixed-style questions: introducing themselves + where they live. Then cover 2-3 topic blocks of 3-4 questions each.
- Part 2 (Cue Card, 3-4 min): a single cue card on a person / place / event / object / experience. Cue card title MUST be in the form "Describe ...". Include EXACTLY 3-4 "You should say" bullet points and one final prompt sentence ("and explain why ...").
- Part 3 (Discussion, 4-5 min): 5-7 abstract discussion questions DIRECTLY linked to the cue card topic (broader, more analytical — comparisons, future trends, societal impact, opinions). They must clearly relate to the cue card topic.

OUTPUT JSON SCHEMA (use these exact keys):
{
  "topic": "<one short phrase describing the overall thematic area>",
  "part1": {
    "questions": [
      "What is your full name?",
      "Where are you from?",
      "<8-10 more Part 1 questions>"
    ]
  },
  "part2": {
    "cueCard": {
      "title": "Describe ...",
      "points": ["<point 1>", "<point 2>", "<point 3>", "<optional point 4>"],
      "finalPrompt": "and explain why ..."
    }
  },
  "part3": {
    "questions": [
      "<question 1>",
      "<5-6 more abstract discussion questions related to the cue card topic>"
    ]
  }
}

Rules:
- Part 1 must contain BETWEEN 8 AND 12 questions, all short, conversational, present-tense focused.
- Part 2 cue card MUST be a "Describe …" prompt with 3-4 bullets and a final "and explain …" sentence.
- Part 3 must contain BETWEEN 5 AND 7 questions, all clearly tied to the cue card topic.
- Questions must be natural spoken English. No question may begin with "Why don't you tell me…" or other filler.
- Do NOT include answers, hints, or any examiner commentary.`;

    const userPrompt = `Generate one complete IELTS Speaking test. Pick a fresh, varied topic (avoid the most overused topics like "your hometown" as the cue card — that can appear in Part 1 instead). Return JSON only.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response for exam setup");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Failed to parse exam setup JSON");
    }

    const exam = normaliseExamPayload(parsed);

    return res.json({
      success: true,
      sessionId,
      ...exam,
    });
  } catch (error) {
    console.error("❌ Exam setup failed:", error);
    // Always return a usable fallback so the user is never stuck on a blank
    // exam screen if OpenAI is having a bad minute.
    return res.json({
      success: true,
      sessionId: `exam_${Date.now()}_fallback`,
      ...buildExamFallback(),
      fallback: true,
    });
  }
});

router.post("/exam/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No audio file provided" });
  }
  const audioFilePath = req.file.path;
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      language: "en",
    });

    const transcript = (transcription.text || "").trim();
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;

    fs.unlink(audioFilePath, (err) => {
      if (err) console.error("⚠️ Error deleting exam audio file:", err);
    });

    return res.json({
      success: true,
      transcript,
      wordCount,
    });
  } catch (err) {
    console.error("❌ Exam transcription failed:", err);
    if (fs.existsSync(audioFilePath)) {
      fs.unlink(audioFilePath, () => {});
    }
    return res.status(500).json({
      success: false,
      error: "Failed to transcribe audio.",
      details: err.message,
    });
  }
});

router.post("/exam/score", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY not configured",
      });
    }

    const {
      sessionId,
      userId,
      topic,
      part1,
      part2,
      part3,
    } = req.body || {};

    // Build the combined transcript and combined metrics
    const combinedAnswers = [];
    const part1Answers = Array.isArray(part1?.answers) ? part1.answers : [];
    const part2Answer = part2?.answer || null;
    const part3Answers = Array.isArray(part3?.answers) ? part3.answers : [];

    part1Answers.forEach((a, i) => {
      combinedAnswers.push({
        part: 1,
        index: i,
        question: a?.question || "",
        transcript: String(a?.transcript || "").trim(),
        durationSec: Number(a?.durationSec) || 0,
      });
    });

    if (part2Answer) {
      combinedAnswers.push({
        part: 2,
        index: 0,
        question: part2?.cueCard?.title || "Cue card",
        transcript: String(part2Answer.transcript || "").trim(),
        durationSec: Number(part2Answer.durationSec) || 0,
      });
    }

    part3Answers.forEach((a, i) => {
      combinedAnswers.push({
        part: 3,
        index: i,
        question: a?.question || "",
        transcript: String(a?.transcript || "").trim(),
        durationSec: Number(a?.durationSec) || 0,
      });
    });

    const totalTranscript = combinedAnswers
      .map((a) => a.transcript)
      .filter(Boolean)
      .join(" ");
    const totalWordCount = countWords(totalTranscript);
    const totalDurationSec = combinedAnswers.reduce((sum, a) => sum + (a.durationSec || 0), 0);

    // Deterministic validation across the ENTIRE exam (not just one segment)
    const validation = validateSpeakingSubmission({
      transcript: totalTranscript,
      audioDurationSec: totalDurationSec,
    });

    // Blank / no-speech across the whole exam → band 0, no AI call
    if (!validation.valid) {
      const cap = Number(validation.wordCap.cap ?? 0);
      const payload = {
        success: true,
        sessionId,
        module: "speaking-exam",
        transcript: totalTranscript,
        wordCount: totalWordCount,
        durationSec: totalDurationSec,
        scores: { fluency: cap, lexical: cap, grammar: cap, pronunciation: cap },
        bandScore: cap,
        band: cap,
        overallBand: cap,
        penalties: { invalidSubmission: true },
        capReasons: [validation.wordCap.reason || "Exam could not be assessed."],
        flags: { relevant: false, meaningful: false, sufficient: false },
        feedback: {
          fluency: `${cap} / 9 - No usable speech.`,
          lexical: `${cap} / 9 - No usable speech.`,
          grammar: `${cap} / 9 - No usable speech.`,
          pronunciation: `${cap} / 9 - No usable speech.`,
          bandScore: cap,
        },
        partTranscripts: combinedAnswers,
        summary: {
          reasonForScore: validation.wordCap.reason || "Exam could not be assessed.",
          strengths: [],
          weaknesses: ["No assessable speech recorded for the exam."],
          suggestions: [
            "Make sure the microphone is permitted and working before starting.",
            "Speak for at least 30–60 seconds per question.",
            "Address every part of each question with concrete examples.",
          ],
          commonGrammarMistakes: [],
          vocabularyImprovements: [],
          pronunciationAdvice: [],
        },
      };
      return res.json(persistAndReturnExamResult(payload, sessionId, userId, combinedAnswers, topic));
    }

    // AI examination across the entire exam transcript
    const systemPrompt = `You are a senior IELTS Speaking examiner. The candidate has just completed a FULL 3-part IELTS Speaking test. Score them strictly using the official IELTS Speaking band descriptors based ONLY on the combined transcript.

Return ONLY JSON with this exact schema (no markdown, no commentary):
{
  "scores": {
    "fluency":       <0-9 in 0.5 steps>,
    "lexical":       <0-9 in 0.5 steps>,
    "grammar":       <0-9 in 0.5 steps>,
    "pronunciation": <0-9 in 0.5 steps>
  },
  "feedback": {
    "fluency":       "<1-2 sentences>",
    "lexical":       "<1-2 sentences>",
    "grammar":       "<1-2 sentences>",
    "pronunciation": "<1-2 sentences>"
  },
  "strengths":   ["<2-3 specific strengths>"],
  "weaknesses":  ["<2-3 specific weaknesses>"],
  "suggestions": ["<3-5 concrete suggestions>"],
  "commonGrammarMistakes":   ["<2-4 specific grammar errors the candidate made>"],
  "vocabularyImprovements":  ["<2-4 vocabulary upgrade suggestions tied to the topic>"],
  "pronunciationAdvice":     ["<2-3 generic pronunciation tips based on likely L2 features>"],
  "flags": {
    "relevant":         <true if answers actually addressed the questions>,
    "relevance_reason": "<short reason or empty>",
    "meaningful":       <true if the response is meaningful>,
    "sufficient":       <true if there is enough content for IELTS assessment>
  }
}

Strict rules:
- If responses are OFF-TOPIC, set relevant=false and DO NOT give Fluency or Lexical above 5.
- If the candidate gives only one-word or very short answers throughout, lower Fluency, Lexical and Grammar accordingly.
- Reference SPECIFIC things the candidate actually said in strengths/weaknesses/suggestions; do not write generic templates.
- Pronunciation must be estimated conservatively (you cannot hear audio); base it on punctuation/transcription clarity and avoid giving above 7 from text alone unless transcript is perfectly fluent.`;

    const transcriptForAI = combinedAnswers
      .map((a) => `[Part ${a.part}] Q: ${a.question}\nA (${a.durationSec | 0}s): ${a.transcript || "(no answer)"}`)
      .join("\n\n");

    const userPrompt = `Topic theme: ${topic || "general"}.

FULL EXAM TRANSCRIPT
====================
${transcriptForAI}

Total spoken words: ${totalWordCount}.
Total speaking duration: ${Math.round(totalDurationSec)}s.

Return the JSON exactly per the schema. Be strict.`;

    let aiResult;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const content = completion.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty AI response for exam scoring");
      aiResult = JSON.parse(content);
    } catch (err) {
      console.error("❌ Exam AI scoring failed:", err);
      return res.status(503).json({
        success: false,
        error: "AI evaluation is temporarily unavailable. Please try again.",
      });
    }

    const scores = {
      fluency:       clampBand(aiResult?.scores?.fluency),
      lexical:       clampBand(aiResult?.scores?.lexical),
      grammar:       clampBand(aiResult?.scores?.grammar),
      pronunciation: clampBand(aiResult?.scores?.pronunciation),
    };

    const flags = {
      relevant:        aiResult?.flags?.relevant !== false,
      relevanceReason: typeof aiResult?.flags?.relevance_reason === "string"
        ? aiResult.flags.relevance_reason.trim()
        : "",
      meaningful:      aiResult?.flags?.meaningful !== false,
      sufficient:      aiResult?.flags?.sufficient !== false,
    };

    const rawAverage = averageBand([
      scores.fluency,
      scores.lexical,
      scores.grammar,
      scores.pronunciation,
    ]);
    let adjustedBand = clampBand(rawAverage) ?? 0;
    const penalties = {};
    const capReasons = [];

    const wordCap = validation.wordCap.cap;
    if (wordCap !== null && wordCap !== undefined && adjustedBand > wordCap) {
      adjustedBand = wordCap;
      penalties.lengthCap = true;
      capReasons.push(validation.wordCap.reason);
    }
    if (!flags.relevant && adjustedBand > 4) {
      adjustedBand = 4;
      penalties.unrelatedCap = true;
      capReasons.push(
        flags.relevanceReason
          ? `Answers were off-topic: ${flags.relevanceReason} (capped at band 4).`
          : "Answers were off-topic — overall capped at band 4."
      );
    }
    if (!flags.meaningful && adjustedBand > 3.5) {
      adjustedBand = 3.5;
      penalties.notMeaningful = true;
      capReasons.push("Responses lacked meaningful communication — capped at band 3.5.");
    }

    const overallBand = clampBand(adjustedBand);

    const fluencyText = stringOrSpeaking(aiResult?.feedback?.fluency, "No fluency feedback");
    const lexicalText = stringOrSpeaking(aiResult?.feedback?.lexical, "No lexical feedback");
    const grammarText = stringOrSpeaking(aiResult?.feedback?.grammar, "No grammar feedback");
    const pronunciationText = stringOrSpeaking(
      aiResult?.feedback?.pronunciation,
      "Pronunciation cannot be fully assessed from text alone."
    );

    const feedback = {
      fluency: `${scores.fluency ?? "-"} / 9 - ${fluencyText}`,
      lexical: `${scores.lexical ?? "-"} / 9 - ${lexicalText}`,
      grammar: `${scores.grammar ?? "-"} / 9 - ${grammarText}`,
      pronunciation: `${scores.pronunciation ?? "-"} / 9 - ${pronunciationText}`,
      bandScore: overallBand,
    };

    const fallback = summariseStrengthsWeaknesses(scores, SPEAKING_CRITERIA_LABELS);
    const strengths = Array.isArray(aiResult?.strengths) && aiResult.strengths.length
      ? aiResult.strengths.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : fallback.strengths;
    const weaknesses = Array.isArray(aiResult?.weaknesses) && aiResult.weaknesses.length
      ? aiResult.weaknesses.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : fallback.weaknesses;
    const suggestions = Array.isArray(aiResult?.suggestions) && aiResult.suggestions.length
      ? aiResult.suggestions.filter((s) => typeof s === "string" && s.trim()).slice(0, 6)
      : [
          "Develop each answer with 2-3 supporting sentences and concrete examples.",
          "Add more linking expressions: however, on the other hand, in addition.",
          "Use a wider range of grammar (conditionals, relative clauses, passive voice).",
        ];
    const commonGrammarMistakes = Array.isArray(aiResult?.commonGrammarMistakes)
      ? aiResult.commonGrammarMistakes.filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
      : [];
    const vocabularyImprovements = Array.isArray(aiResult?.vocabularyImprovements)
      ? aiResult.vocabularyImprovements.filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
      : [];
    const pronunciationAdvice = Array.isArray(aiResult?.pronunciationAdvice)
      ? aiResult.pronunciationAdvice.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
      : [];

    const reasonForScore = buildExamReason({
      overallBand,
      rawOverallBand: clampBand(rawAverage),
      scores,
      capReasons,
      wordCount: totalWordCount,
      durationSec: totalDurationSec,
    });

    const payload = {
      success: true,
      sessionId,
      module: "speaking-exam",
      transcript: totalTranscript,
      wordCount: totalWordCount,
      durationSec: totalDurationSec,
      scores,
      bandScore: overallBand,
      band: overallBand,
      overallBand,
      rawOverallBand: clampBand(rawAverage),
      penalties,
      capReasons,
      flags,
      feedback,
      partTranscripts: combinedAnswers,
      summary: {
        reasonForScore,
        strengths,
        weaknesses,
        suggestions,
        commonGrammarMistakes,
        vocabularyImprovements,
        pronunciationAdvice,
      },
    };

    return res.json(persistAndReturnExamResult(payload, sessionId, userId, combinedAnswers, topic));
  } catch (error) {
    console.error("❌ Exam score failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to score exam.",
      message: error.message,
    });
  }
});

function persistAndReturnExamResult(payload, sessionId, userId, combinedAnswers, topic) {
  if (db) {
    db.collection("speaking_practice")
      .add({
        userId: userId || "anonymous",
        sessionId,
        type: "ielts_exam",
        topic: topic || null,
        bandScore: payload.bandScore ?? null,
        scores: payload.scores || null,
        feedback: payload.feedback || null,
        summary: payload.summary || null,
        partTranscripts: combinedAnswers,
        wordCount: payload.wordCount ?? null,
        durationSec: payload.durationSec ?? null,
        penalties: payload.penalties || {},
        capReasons: payload.capReasons || [],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch((err) => console.error("⚠️ Error saving exam to Firestore:", err));
  }
  return payload;
}

function normaliseExamPayload(parsed) {
  const part1Questions = Array.isArray(parsed?.part1?.questions)
    ? parsed.part1.questions.filter((q) => typeof q === "string" && q.trim()).map((q) => q.trim())
    : [];
  let part3Questions = Array.isArray(parsed?.part3?.questions)
    ? parsed.part3.questions.filter((q) => typeof q === "string" && q.trim()).map((q) => q.trim())
    : [];

  // Enforce official counts (clip / pad)
  let safePart1 = part1Questions.slice(0, 12);
  if (safePart1.length < 8) {
    const filler = [
      "Do you enjoy spending time with your family?",
      "Tell me about a hobby you enjoy.",
      "Do you prefer mornings or evenings? Why?",
      "What kind of food do you like?",
    ];
    while (safePart1.length < 8 && filler.length) safePart1.push(filler.shift());
  }
  let safePart3 = part3Questions.slice(0, 7);
  if (safePart3.length < 5) {
    const filler = [
      "How is this topic changing in modern society?",
      "Do you think young people view this differently from older generations?",
      "What role does education play in this area?",
      "How might this be different in the future?",
    ];
    while (safePart3.length < 5 && filler.length) safePart3.push(filler.shift());
  }

  const cue = parsed?.part2?.cueCard || {};
  const cueCard = {
    title: typeof cue.title === "string" && cue.title.trim() ? cue.title.trim() : "Describe a person who has inspired you",
    points: Array.isArray(cue.points)
      ? cue.points.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim()).slice(0, 4)
      : ["who the person is", "how you know them", "what they have done"],
    finalPrompt: typeof cue.finalPrompt === "string" && cue.finalPrompt.trim()
      ? cue.finalPrompt.trim()
      : "and explain why they have inspired you.",
  };
  if (cueCard.points.length < 3) {
    cueCard.points = ["who the person is", "how you know them", "what they have done"];
  }

  return {
    topic: typeof parsed?.topic === "string" && parsed.topic.trim() ? parsed.topic.trim() : "general IELTS topic",
    part1: { questions: safePart1 },
    part2: { cueCard },
    part3: { questions: safePart3 },
  };
}

function buildExamFallback() {
  return {
    topic: "people who inspire us",
    part1: {
      questions: [
        "Could you tell me your full name, please?",
        "Where are you from?",
        "Do you work or are you a student?",
        "What do you enjoy most about your work or studies?",
        "Let's talk about hobbies. What do you like to do in your free time?",
        "Do you prefer indoor or outdoor activities? Why?",
        "Now let's talk about food. What kind of food do you usually eat at home?",
        "Do you like cooking? Why or why not?",
      ],
    },
    part2: {
      cueCard: {
        title: "Describe a person who has inspired you",
        points: [
          "who the person is",
          "how you know them",
          "what they have done",
        ],
        finalPrompt: "and explain why this person has inspired you.",
      },
    },
    part3: {
      questions: [
        "Why do you think some people become role models for others?",
        "How have the qualities people admire changed over the years?",
        "Do you think young people today have fewer role models than in the past?",
        "What role do parents play in inspiring children?",
        "How important is it for famous people to act as role models?",
        "Do you think schools should teach children about inspirational figures? Why?",
      ],
    },
  };
}

function buildExamReason({ overallBand, rawOverallBand, scores, capReasons, wordCount, durationSec }) {
  const parts = [];
  parts.push(
    `Overall band ${overallBand} from Fluency ${scores.fluency ?? "-"}, ` +
    `Lexical ${scores.lexical ?? "-"}, Grammar ${scores.grammar ?? "-"}, ` +
    `Pronunciation ${scores.pronunciation ?? "-"} (raw average ${rawOverallBand ?? "-"}).`
  );
  parts.push(`Total spoken words across the exam: ${wordCount}.`);
  parts.push(`Total speaking time: ${Math.round(durationSec || 0)}s.`);
  if (capReasons && capReasons.length) parts.push(...capReasons);
  if (!capReasons?.length) parts.push("No penalties applied.");
  return parts.join(" ");
}

/**
 * GET /api/speaking/history/:userId
 * Get practice history for a user
 */
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!db) {
      return res.status(500).json({
        error: "Database not available",
        success: false
      });
    }
    
    const historySnapshot = await db.collection('speaking_practice')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    const history = [];
    historySnapshot.forEach(doc => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      history: history,
      success: true
    });
    
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    res.status(500).json({
      error: "Failed to fetch history",
      message: error.message,
      success: false
    });
  }
});

/**
 * GET /api/speaking/realtime/token
 * Create a Realtime API session token for real-time voice conversation
 * This is the main endpoint for real-time voice responses
 */
router.get("/realtime/token", async (req, res) => {
  try {
    console.log("🎙️ Creating Realtime API token for real-time voice conversation...");
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY not configured",
        success: false 
      });
    }

    // Create session using OpenAI Realtime API via HTTP (SDK doesn't support realtime yet)
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17", // Latest model for best performance
        voice: "verse", // Natural voice for IELTS practice
        modalities: ["text", "audio"], // Enable both text and audio for real-time voice
        temperature: 0.8,
        instructions: `You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session.

CRITICAL: You must LISTEN CAREFULLY to what the user says and respond DIRECTLY to their questions and statements. Understand the context and meaning, not just keywords.

Personality:
- Warm, encouraging, genuinely interested in the candidate
- Show that you're actively listening by referencing specific things they mentioned
- Ask intelligent follow-up questions that demonstrate understanding
- Be conversational and natural, like talking to a friend who's also an examiner

Active Listening & Understanding:
- Pay attention to the FULL meaning of what the user says, not just individual words
- If they ask a question, ANSWER IT directly and clearly
- If they share information, acknowledge it and build on it naturally
- Remember details they mention (work, hobbies, experiences) and reference them later
- Show genuine curiosity about their responses

Conversation Flow:
- ALWAYS start by greeting warmly and asking an engaging opening question immediately
- When the user responds, LISTEN to their full answer before responding
- Build your next question/comment on what they ACTUALLY said, showing you understood
- If they ask "What do you think?" or similar, give your opinion naturally
- If they share something interesting, show enthusiasm and ask for more details
- Keep responses concise (1-2 sentences) but meaningful and contextually relevant

Response Quality:
- Respond to the USER'S ACTUAL QUESTION or statement, not a generic template
- If they ask about your opinion, give it naturally
- If they share a story, acknowledge it and ask relevant follow-ups
- If they seem confused, clarify gently
- Show you're engaged by referencing specific details from their responses

IELTS Practice Focus:
- Mix Part 1 style questions (personal info, daily life) naturally
- Gradually introduce Part 3 style questions (opinions, comparisons, abstract topics)
- Provide gentle, constructive feedback when appropriate
- Keep the conversation flowing naturally like a real IELTS interview

Proactive Engagement & Patience:
- BE PATIENT, especially with the first question - wait at least 8-10 seconds before prompting
- NEVER say "you have not answered me" or "you didn't answer" - this is negative and discouraging
- If there's silence after asking a question, wait patiently (8-10 seconds minimum)
- After waiting, if still no response, gently encourage: "Take your time, there's no rush" or "Feel free to share your thoughts when you're ready"
- If the user seems hesitant, be supportive: "Take your time, I'm here to help you practice" or "No pressure, just speak naturally"
- NEVER pressure the user or make them feel bad for not responding immediately
- Keep the energy positive, supportive, and encouraging throughout
- Remember: This is practice - the user may need time to think, especially at the start

Remember: You're having a REAL conversation. Be patient, encouraging, and supportive. Never rush or pressure the user.`,
        // Also transcribe candidate audio so the client gets a live user
        // transcript (drives the boxed feedback at the end).
        input_audio_transcription: { model: "whisper-1" },
        // Keep examiner replies short and natural (~1-2 sentences).
        max_response_output_tokens: 120,
        // Server-side VAD: a real examiner waits ~2s of silence before
        // taking a turn so the candidate can finish their thought.
        //   - threshold 0.5  → OpenAI default; lower than this misses quiet
        //                      speakers and we end up with "0 spoken words".
        //   - prefix_padding 500ms → capture the first syllable of the first
        //                            word, otherwise quick starts get clipped.
        //   - silence_duration 2000ms → patient turn-taking.
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 500,
          silence_duration_ms: 2000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || errorData.error || "Unknown error"}`);
    }

    const session = await response.json();

    console.log("✅ Realtime token created:", session.id);
    console.log("🔑 client_secret exists:", !!session.client_secret);
    
    res.json({
      ...session,
      success: true,
      message: "Realtime token created successfully"
    });
    
  } catch (error) {
    console.error("❌ Error creating Realtime token:", error);
    res.status(500).json({
      error: "Failed to create Realtime token",
      message: error.message,
      success: false
    });
  }
});

module.exports = router;