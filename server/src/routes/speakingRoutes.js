const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an IELTS Speaking examiner creating Part 2 questions. Generate a realistic, engaging IELTS Speaking Part 2 question that follows the standard format. 

Requirements:
- Use the topic: ${randomTopic}
- Question type: ${randomType}
- Include specific points the candidate should cover
- Make it interesting and thought-provoking
- Ensure it's appropriate for IELTS level (B1-C2)
- Return ONLY the question text, no additional formatting or explanations

The question should be unique and not repetitive. Make it feel fresh and engaging.`
          },
          {
            role: "user",
            content: `Create a dynamic IELTS Speaking Part 2 question about ${randomTopic} with a ${randomType} focus. Make it engaging and original.`
          }
        ],
        max_tokens: 300,
        temperature: 0.9 // Higher temperature for more creativity
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
      const evaluation = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional IELTS Speaking examiner. Evaluate the following response according to IELTS criteria:

1. FLUENCY & COHERENCE (25%): Natural pace, hesitation, self-correction, logical flow
2. LEXICAL RESOURCE (25%): Vocabulary range, word choice, collocation, paraphrasing
3. GRAMMATICAL RANGE & ACCURACY (25%): Sentence variety, tense usage, error frequency
4. PRONUNCIATION (25%): Clarity, stress, intonation, accent intelligibility

Provide detailed feedback in this exact format:
FLUENCY: [score/10] - [detailed comment]
LEXICAL: [score/10] - [detailed comment]  
GRAMMAR: [score/10] - [detailed comment]
PRONUNCIATION: [score/10] - [detailed comment]
BAND SCORE: [overall band 6.0-9.0]

Be specific about strengths and areas for improvement.`
          },
          {
            role: "user",
            content: `Please evaluate this IELTS Speaking response:\n\n"${transcript}"`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional IELTS Speaking examiner conducting a real-time practice session. 

Your personality: Be ${randomStyle}

CRITICAL: You must LISTEN CAREFULLY to what the user says and respond DIRECTLY to their questions and statements. Understand the FULL meaning, not just keywords.

Your role:
- Create a natural, engaging conversation flow
- LISTEN to what the user actually says and respond to THAT
- Ask follow-up questions that are SPECIFIC to what they mentioned
- Reference specific details from their responses
- Provide gentle feedback when appropriate
- Mix Part 1 and Part 3 style questions naturally
- Be conversational and human-like, not robotic
- Show genuine interest by referencing what they actually said
- Adapt your questions based on their specific interests and background

Active Listening:
- Pay attention to the FULL meaning of what the user says
- If they ask a question, ANSWER IT directly
- If they share information, acknowledge the SPECIFIC information
- Remember details they mention and reference them later
- Show you understood by asking specific follow-up questions

Start with a warm, personalized greeting and ask an opening question that will help you understand the candidate better. Make it feel like a real IELTS interview.`
          },
          {
            role: "user",
            content: "Please start the IELTS speaking practice session with a dynamic, engaging opening."
          }
        ],
        max_tokens: 250,
        temperature: 0.8 // Higher temperature for more natural variation
      });

      const examinerMessage = initialMessage.choices[0].message.content.trim();
      
      res.json({
        sessionId: sessionId,
        message: examinerMessage,
        style: randomStyle,
        success: true
      });
      
    } catch (openaiError) {
      console.log("⚠️ OpenAI API failed for real-time start, using enhanced fallback:", openaiError.message);
      
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
      // Try OpenAI first with enhanced context awareness
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
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 250,
        temperature: 0.8 // Higher temperature for more natural variation
      });

      const examinerResponse = response.choices[0].message.content.trim();
      
      res.json({
        message: examinerResponse,
        success: true
      });
      
    } catch (openaiError) {
      console.log("⚠️ OpenAI API failed for continue conversation, using enhanced fallback:", openaiError.message);
      
      // Use enhanced fallback response
      const fallbackResponse = getFallbackResponse(userMessage, conversationHistory);
      
      res.json({
        message: fallbackResponse,
        success: true
      });
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
      // Try OpenAI first
      const summaryPrompt = `Based on this IELTS speaking practice conversation, provide a brief summary feedback focusing on:
      
      1. Overall performance
      2. Key strengths
      3. Areas for improvement
      4. Suggested band score (6.0-9.0)
      
      Conversation history: ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
      
      Provide concise, constructive feedback.`;
      
      const summary = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.5
      });

      const feedback = summary.choices[0].message.content.trim();
      
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

    // Create session using OpenAI Realtime API with latest model
    const session = await openai.realtime.sessions.create({
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
        threshold: 0.3,
        prefix_padding_ms: 300,
        silence_duration_ms: 1000 // Increased to 1 second for more patience
      }
    });

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
