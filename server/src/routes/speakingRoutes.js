const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const router = express.Router();

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
 * Evaluate speaking performance using OpenAI Whisper + GPT
 */
router.post("/evaluate", upload.single("audio"), async (req, res) => {
  try {
    console.log("🎤 Starting speaking evaluation...");
    
    if (!req.file) {
      return res.status(400).json({ 
        error: "No audio file provided",
        success: false 
      });
    }

    const audioFilePath = req.file.path;
    console.log("📁 Audio file saved at:", audioFilePath);

    // Step 1: Transcribe audio using OpenAI Whisper
    console.log("🎧 Transcribing audio with Whisper...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
      language: "en"
    });

    const transcript = transcription.text;
    console.log("📝 Transcript:", transcript);

    // Step 2: Evaluate the response using GPT with comprehensive IELTS assessment
    console.log("🤖 Evaluating response with GPT...");
    
    // Fallback evaluation function
    const getFallbackEvaluation = (transcript) => {
      const wordCount = transcript.split(' ').length;
      const sentenceCount = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const avgWordsPerSentence = wordCount / sentenceCount;
      
      let fluencyScore, lexicalScore, grammarScore, pronunciationScore, bandScore;
      
      // Simple scoring based on transcript length and complexity
      if (wordCount >= 100) {
        fluencyScore = "8/10 - Good fluency with natural pace";
        lexicalScore = "7/10 - Good vocabulary range";
        grammarScore = "7/10 - Generally accurate grammar";
        pronunciationScore = "7/10 - Clear pronunciation";
        bandScore = "7.0";
      } else if (wordCount >= 50) {
        fluencyScore = "6/10 - Adequate fluency with some hesitation";
        lexicalScore = "6/10 - Adequate vocabulary range";
        grammarScore = "6/10 - Some grammatical errors but generally clear";
        pronunciationScore = "6/10 - Mostly clear pronunciation";
        bandScore = "6.0";
      } else {
        fluencyScore = "5/10 - Limited fluency with frequent hesitation";
        lexicalScore = "5/10 - Limited vocabulary range";
        grammarScore = "5/10 - Several grammatical errors";
        pronunciationScore = "5/10 - Some pronunciation issues";
        bandScore = "5.5";
      }
      
      return {
        fluency: fluencyScore,
        lexical: lexicalScore,
        grammar: grammarScore,
        pronunciation: pronunciationScore,
        bandScore: bandScore
      };
    };
    
    let feedback;
    
    try {
      // Use gpt-4o for evaluations - more accurate feedback worth the extra cost
      const evaluation = await openai.chat.completions.create({
        model: "gpt-4o", // More accurate for evaluations
        messages: [
          {
            role: "system",
            content: `IELTS examiner. Evaluate response by:
1. FLUENCY (25%): pace, hesitation, flow
2. LEXICAL (25%): vocabulary range, word choice
3. GRAMMAR (25%): sentence variety, accuracy
4. PRONUNCIATION (25%): clarity, stress, intonation

Format:
FLUENCY: [score/10] - [comment]
LEXICAL: [score/10] - [comment]
GRAMMAR: [score/10] - [comment]
PRONUNCIATION: [score/10] - [comment]
BAND SCORE: [6.0-9.0]`
          },
          {
            role: "user",
            content: `Evaluate: "${transcript}"`
          }
        ],
        max_tokens: 400, // Reduced from 500 - still comprehensive
        temperature: 0.2 // Lower for more consistent evaluations
      });

      const feedbackText = evaluation.choices[0].message.content.trim();
      console.log("📊 Evaluation feedback:", feedbackText);

      // Parse the feedback into structured format
      const lines = feedbackText.split('\n').filter(line => line.trim());
      feedback = {
        fluency: lines.find(line => line.startsWith('FLUENCY:'))?.replace('FLUENCY:', '').trim() || "No fluency feedback",
        lexical: lines.find(line => line.startsWith('LEXICAL:'))?.replace('LEXICAL:', '').trim() || "No lexical feedback",
        grammar: lines.find(line => line.startsWith('GRAMMAR:'))?.replace('GRAMMAR:', '').trim() || "No grammar feedback",
        pronunciation: lines.find(line => line.startsWith('PRONUNCIATION:'))?.replace('PRONUNCIATION:', '').trim() || "No pronunciation feedback",
        bandScore: lines.find(line => line.startsWith('BAND SCORE:'))?.replace('BAND SCORE:', '').trim() || "No band score"
      };
      
    } catch (openaiError) {
      console.log("⚠️ OpenAI API failed for evaluation, using fallback:", openaiError.message);
      
      // Use fallback evaluation
      feedback = getFallbackEvaluation(transcript);
      console.log("📊 Fallback evaluation:", feedback);
    }

    // Clean up the uploaded file
    fs.unlink(audioFilePath, (err) => {
      if (err) console.error("⚠️ Error deleting audio file:", err);
      else console.log("🗑️ Audio file cleaned up");
    });

    // Step 3: Save practice session to Firestore
    if (db) {
      try {
        const practiceSession = {
          userId: req.body.userId || 'anonymous',
          question: req.body.question || 'Unknown question',
          transcript: transcript,
          feedback: feedback,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: 'recorded_practice'
        };
        
        await db.collection('speaking_practice').add(practiceSession);
        console.log("💾 Practice session saved to Firestore");
      } catch (firestoreError) {
        console.error("⚠️ Error saving to Firestore:", firestoreError);
      }
    }
    
    console.log("✅ Evaluation completed successfully");
    
    res.json({
      transcript: transcript,
      feedback: feedback,
      success: true
    });

  } catch (error) {
    console.error("❌ Error evaluating speaking:", error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("⚠️ Error deleting audio file:", err);
      });
    }
    
    res.status(500).json({ 
      error: "Failed to evaluate speaking",
      message: error.message,
      success: false 
    });
  }
});

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
        ...conversationHistory.slice(-8), // Keep last 8 messages for better context
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
 * POST /api/speaking/realtime/end
 * End the real-time session and provide summary feedback
 */
router.post("/realtime/end", async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      console.error("❌ Request body is undefined");
      return res.status(400).json({
        error: "Request body is required",
        message: "Please send a JSON body with sessionId",
        success: false
      });
    }
    
    const { sessionId, conversationHistory = [], userId } = req.body;
    
    // Validate required fields
    if (!sessionId) {
      console.error("❌ sessionId is missing");
      return res.status(400).json({
        error: "sessionId is required",
        message: "Please provide a sessionId in the request body",
        success: false
      });
    }
    
    console.log("🏁 Ending real-time conversation session...");
    console.log("📋 Request body:", { sessionId, userId, conversationHistoryLength: conversationHistory?.length || 0 });
    
    // Fallback feedback templates
    const getFallbackFeedback = (conversationHistory) => {
      const userMessages = conversationHistory.filter(msg => msg.role === 'user');
      const messageCount = userMessages.length;
      
      let feedback = "Thank you for completing this IELTS speaking practice session!\n\n";
      
      if (messageCount >= 5) {
        feedback += "**Overall Performance:** You demonstrated good engagement throughout the conversation. ";
        feedback += "**Key Strengths:** You provided detailed responses and showed good communication skills. ";
        feedback += "**Areas for Improvement:** Try to expand your vocabulary and use more complex sentence structures. ";
        feedback += "**Estimated Band Score:** 6.5-7.0";
      } else if (messageCount >= 3) {
        feedback += "**Overall Performance:** You participated well in the conversation. ";
        feedback += "**Key Strengths:** You answered questions clearly and showed good understanding. ";
        feedback += "**Areas for Improvement:** Practice speaking for longer periods and develop more detailed responses. ";
        feedback += "**Estimated Band Score:** 6.0-6.5";
      } else {
        feedback += "**Overall Performance:** Good start to the conversation. ";
        feedback += "**Key Strengths:** You responded appropriately to questions. ";
        feedback += "**Areas for Improvement:** Try to provide longer, more detailed answers and practice speaking more fluently. ";
        feedback += "**Estimated Band Score:** 5.5-6.0";
      }
      
      feedback += "\n\nKeep practicing to improve your IELTS speaking skills!";
      return feedback;
    };
    
    try {
      // Try OpenAI first - use gpt-4o-mini for summaries (cost-effective)
      const conversationText = conversationHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`).join('\n'); // Only last 10 messages
      const summaryPrompt = `IELTS practice summary. Provide brief feedback:

1. Overall performance
2. Key strengths
3. Areas for improvement
4. Band score (6.0-9.0)

Conversation:
${conversationText}

Provide concise feedback.`;
      
      // Use streaming to ensure we capture the full response
      console.log("🔄 Generating summary with streaming to ensure full response...");
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for summaries
        messages: [
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        max_tokens: 600, // Increased to ensure full feedback is captured
        temperature: 0.4, // Lower for more consistent summaries
        stream: true // Use streaming to ensure full response
      });

      let fullFeedback = '';
      let tokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      
      // Collect all chunks
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullFeedback += content;
        }
        // Track token usage if available
        if (chunk.usage) {
          tokenUsage = chunk.usage;
        }
      }

      const feedback = fullFeedback.trim();
      
      // Log full feedback to verify it's complete
      console.log("📊 Full summary feedback received:", feedback);
      console.log("📊 Feedback length:", feedback.length, "characters");
      console.log("📊 Token usage:", tokenUsage);
      
      // Verify feedback is not empty
      if (!feedback || feedback.length === 0) {
        throw new Error("Empty feedback received from OpenAI");
      }
      
      // Check if feedback seems complete (ends with proper punctuation or is reasonably long)
      const lastChar = feedback.trim().slice(-1);
      const hasProperEnding = ['.', '!', '?'].includes(lastChar);
      if (!hasProperEnding && feedback.length < 100) {
        console.warn("⚠️ WARNING: Feedback may be incomplete - doesn't end with proper punctuation and is short");
      }
      
      console.log("✅ Summary feedback validated and ready to send");
      
      // Save session to Firestore
      if (db) {
        try {
          const sessionData = {
            userId: userId || 'anonymous',
            sessionId: sessionId,
            conversationHistory: conversationHistory,
            feedback: feedback,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'realtime_practice'
          };
          
          await db.collection('speaking_practice').add(sessionData);
          console.log("💾 Real-time session saved to Firestore");
        } catch (firestoreError) {
          console.error("⚠️ Error saving session to Firestore:", firestoreError);
        }
      }
      
      res.json({
        feedback: feedback,
        success: true
      });
      
    } catch (openaiError) {
      console.log("⚠️ OpenAI API failed for session end, using fallback:", openaiError.message);
      
      // Use fallback feedback
      const fallbackFeedback = getFallbackFeedback(conversationHistory);
      
      // Save session to Firestore with fallback feedback
      if (db) {
        try {
          const sessionData = {
            userId: userId || 'anonymous',
            sessionId: sessionId,
            conversationHistory: conversationHistory,
            feedback: fallbackFeedback,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: 'realtime_practice'
          };
          
          await db.collection('speaking_practice').add(sessionData);
          console.log("💾 Real-time session saved to Firestore with fallback feedback");
        } catch (firestoreError) {
          console.error("⚠️ Error saving session to Firestore:", firestoreError);
        }
      }
      
      res.json({
        feedback: fallbackFeedback,
        success: true
      });
    }
    
  } catch (error) {
    console.error("❌ Error ending session:", error);
    res.status(500).json({
      error: "Failed to end session",
      message: error.message,
      success: false
    });
  }
});

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
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5, // Higher threshold for better voice detection
          prefix_padding_ms: 300, // Capture context before user speaks
          silence_duration_ms: 800 // Shorter silence for faster turn-taking (more natural conversation)
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
