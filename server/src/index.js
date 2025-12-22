const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

// ✅ Load .env immediately at startup (absolute path to server/.env)
const envPath = path.join(__dirname, "..", ".env");
console.log('📁 Loading .env from:', envPath);
console.log('📁 __dirname:', __dirname);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
} else {
  console.log('✅ .env file loaded successfully');
  console.log('🔑 GEMINI_API_KEY loaded:', Boolean(process.env.GEMINI_API_KEY));
  console.log('🔑 GOOGLE_API_KEY loaded:', Boolean(process.env.GOOGLE_API_KEY));
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '10mb' })); // Increase limit for larger payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Support URL-encoded bodies

// Debug middleware to log all incoming requests
app.use((req, res, next) => {
  if (req.path.includes('/realtime/continue') || req.path.includes('/realtime/start') || req.path.includes('/realtime/end')) {
    console.log('🔍 Request Debug Middleware:');
    console.log('  - Method:', req.method);
    console.log('  - Path:', req.path);
    console.log('  - Full URL:', req.url);
    console.log('  - Content-Type:', req.headers['content-type']);
    console.log('  - Body exists:', !!req.body);
    console.log('  - Body type:', typeof req.body);
    if (req.body) {
      console.log('  - Body keys:', Object.keys(req.body));
      console.log('  - Body content:', JSON.stringify(req.body, null, 2));
    } else {
      console.log('  - ⚠️ Body is undefined or empty');
    }
  }
  next();
});

// Debug logs at startup
console.log("==== Loaded ENV values at startup ====");
console.log("ENV PATH:", envPath);
console.log("JWT_SECRET set:", Boolean(process.env.JWT_SECRET));
console.log("FIREBASE_WEB_API_KEY set:", Boolean(process.env.FIREBASE_WEB_API_KEY));
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || "<missing>");
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL || "<missing>");
console.log("Private Key Exists:", Boolean(process.env.FIREBASE_PRIVATE_KEY));
console.log("OPENAI_API_KEY set:", Boolean(process.env.OPENAI_API_KEY));
console.log("======================================");

// ✅ Health route
app.get("/health", (_req, res) => {
    console.log(">>> HEALTH CHECK ROUTE IS RUNNING <<<");
  
    res.json({
      status: "ok",
      env: {
        jwtSecret: Boolean(process.env.JWT_SECRET),
        firebaseWebApiKey: Boolean(process.env.FIREBASE_WEB_API_KEY),
        openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
        openaiApiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + "..." : "not set",
        firebaseAdmin: {
          projectId: Boolean(process.env.FIREBASE_PROJECT_ID),
          clientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
          privateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
        },
      },
    });
  });

// ✅ Test OpenAI API endpoint
app.get("/test-openai", async (_req, res) => {
  try {
    console.log("🧪 Testing OpenAI API...");
    console.log("🔑 API Key exists:", Boolean(process.env.OPENAI_API_KEY));
    console.log("🔑 API Key prefix:", process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + "..." : "not set");
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY not configured",
        message: "Please set OPENAI_API_KEY in your .env file"
      });
    }

    // Test a simple API call
    const testResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Say 'Hello, API test successful!' in one sentence."
        }
      ],
      max_tokens: 50
    });

    const message = testResponse.choices[0].message.content;
    const usage = testResponse.usage;

    console.log("✅ OpenAI API test successful!");
    console.log("📊 Usage:", JSON.stringify(usage, null, 2));

    res.json({
      success: true,
      message: message,
      usage: usage,
      apiKeyConfigured: true,
      apiKeyPrefix: process.env.OPENAI_API_KEY.substring(0, 7) + "..."
    });
  } catch (error) {
    console.error("❌ OpenAI API test failed:", error);
    console.error("❌ Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });

    res.status(500).json({
      success: false,
      error: "OpenAI API test failed",
      message: error.message,
      details: {
        status: error.status,
        code: error.code,
        type: error.type
      },
      apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
      apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + "..." : "not set"
    });
  }
});
  
// Example: auth routes (keep your existing)
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Speaking practice routes
const speakingRoutes = require("./routes/speakingRoutes");
app.use("/api/speaking", speakingRoutes);

// Voice/Realtime API routes
const voiceRoutes = require("./routes/voiceRoutes");
app.use("/api/voice", voiceRoutes);

// Writing evaluation routes
const writingRoutes = require("./routes/writingRoutes");
app.use("/api/writing", writingRoutes);

// Reading practice routes
const readingRoutes = require("./routes/readingRoutes");
app.use("/api/reading", readingRoutes);

// Listening practice routes
const listeningRoutes = require("./routes/listeningRoutes");
app.use("/api/listening", listeningRoutes);

// Chatbot routes (Gemini API)
const chatbotRoutes = require("./routes/chatbotRoutes");
app.use("/api/chatbot", chatbotRoutes);

// Import OpenAI for voice conversation
const OpenAI = require('openai');
const fs = require('fs');

// Initialize OpenAI client with validation
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ WARNING: OPENAI_API_KEY is not set in environment variables!");
  console.error("❌ OpenAI features will not work. Please set OPENAI_API_KEY in your .env file.");
} else {
  console.log("✅ OpenAI API Key configured");
  console.log("🔑 API Key prefix:", process.env.OPENAI_API_KEY.substring(0, 7) + "...");
  
  // Validate API key format
  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.warn("⚠️ WARNING: API key doesn't start with 'sk-'. This might be incorrect.");
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store conversation sessions
const conversationSessions = new Map();

// Store accumulated audio chunks for streaming sessions
const streamingAudioChunks = new Map(); // sessionId -> { chunks: [], timeout: null, lastChunkTime: null }

// Ensure uploads directory exists before writing temp audio files
function ensureUploadsDir() {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return uploadsDir;
  } catch (e) {
    console.error('❌ Failed to ensure uploads directory:', e);
    return null;
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Handle voice conversation
  socket.on('voice-conversation', async (data) => {
    try {
      console.log('🎙️ Voice conversation request:', data.type);
      
      if (data.type === 'start') {
        // Initialize conversation with dynamic AI-generated greeting
        const sessionId = `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          const greeting = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective for conversations
            messages: [
              {
                role: "system",
                content: `IELTS examiner. Natural conversation practice.

Personality: Warm, encouraging, genuinely interested.

Rules:
- Ask follow-ups based on responses
- Mix Part 1 & 3 questions naturally
- Be conversational, not robotic
- Be patient and supportive

Start with warm greeting + opening question.`
              },
              {
                role: "user",
                content: "Start IELTS practice with engaging opening."
              }
            ],
            max_tokens: 150, // Reduced from 200 - greeting should be concise
            temperature: 0.7 // Slightly lower for more focused responses
          });

          const greetingMessage = greeting.choices[0].message.content.trim();
          
          // Store session with enhanced context
          conversationSessions.set(sessionId, {
            history: [{ role: 'examiner', content: greetingMessage }],
            socketId: socket.id,
            conversationContext: {
              topicsDiscussed: [],
              candidateInterests: [],
              strengths: [],
              areasToExplore: []
            }
          });

          // Generate speech for the greeting
          console.log('🎵 Generating speech for greeting:', greetingMessage);
          const speechResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: greetingMessage,
            response_format: "mp3"
          });

          const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
          const audioBase64 = audioBuffer.toString('base64');
          console.log('🎵 Generated audio buffer size:', audioBuffer.length, 'bytes');

          socket.emit('voice-response', {
            type: 'session-started',
            sessionId: sessionId,
            message: greetingMessage,
            audioData: audioBase64
          });
          
        } catch (openaiError) {
          console.log('⚠️ OpenAI API failed, using enhanced fallback greeting:', openaiError.message);
          
          const fallbackGreetings = [
            "Hello! I'm really excited to practice with you today. Let's start with something simple - could you tell me a little bit about yourself? What do you do for work or study?",
            "Hi there! I'm your IELTS examiner for today's practice session. I'd love to get to know you better - could you tell me about your hometown? What's it like living there?",
            "Welcome! I'm looking forward to our conversation today. Let's begin with an easy question - what do you like to do in your free time? Do you have any hobbies or interests?",
            "Good to meet you! I'm here to help you practice for your IELTS speaking test. To start, could you describe your typical day? What do you usually do from morning to evening?",
            "Hello! Great to have you here for some IELTS speaking practice. Let's start with something personal - could you tell me about a place you've visited recently? What did you like about it?"
          ];
          
          const fallbackGreeting = fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)];
          
          conversationSessions.set(sessionId, {
            history: [{ role: 'examiner', content: fallbackGreeting }],
            socketId: socket.id,
            conversationContext: {
              topicsDiscussed: [],
              candidateInterests: [],
              strengths: [],
              areasToExplore: []
            }
          });

          socket.emit('voice-response', {
            type: 'session-started',
            sessionId: sessionId,
            message: fallbackGreeting,
            audioData: null
          });
        }
        
      } else if (data.type === 'streaming-audio') {
        // Accumulate streaming audio chunks and process when silence is detected
        const sessionId = data.sessionId;
        if (!sessionId) {
          console.error('❌ No session ID in streaming audio');
          socket.emit('voice-error', { message: 'No session ID provided' });
          return;
        }
        
        if (!data.audioData) {
          console.error('❌ No audio data in streaming audio chunk');
          return;
        }
        
        console.log(`🎵 Received streaming audio chunk for session ${sessionId} (${data.audioData.length} chars base64)...`);
        
        // Initialize chunk accumulator if not exists
        if (!streamingAudioChunks.has(sessionId)) {
          streamingAudioChunks.set(sessionId, {
            chunks: [],
            timeout: null,
            lastChunkTime: Date.now()
          });
        }
        
        const chunkAccumulator = streamingAudioChunks.get(sessionId);
        
        // Add chunk to accumulator
        chunkAccumulator.chunks.push(Buffer.from(data.audioData, 'base64'));
        chunkAccumulator.lastChunkTime = Date.now();
        
        console.log(`📦 Accumulated ${chunkAccumulator.chunks.length} chunks for session ${sessionId}`);
        
        // Clear existing timeout
        if (chunkAccumulator.timeout) {
          clearTimeout(chunkAccumulator.timeout);
        }
        
        // Process accumulated chunks after 500ms of silence (no new chunks) - faster response
        chunkAccumulator.timeout = setTimeout(async () => {
          try {
            // Get a snapshot of chunks to process (copy array to avoid race conditions)
            const chunksToProcess = [...chunkAccumulator.chunks];
            
            if (chunksToProcess.length === 0) {
              console.log('⚠️ No chunks to process');
              return;
            }
            
            const totalSize = chunksToProcess.reduce((sum, c) => sum + c.length, 0);
            console.log(`🎵 Processing ${chunksToProcess.length} accumulated chunks (${totalSize} bytes)...`);
            
            // Check if we have enough audio to process (at least 1KB for transcription)
            if (totalSize < 1024) {
              console.log(`⚠️ Audio too small to process (${totalSize} bytes < 1KB), waiting for more chunks...`);
              // Don't clear chunks, wait for more
              return;
            }
            
            // Clear chunks for next accumulation BEFORE processing
            chunkAccumulator.chunks = [];
            
            // Combine all chunks into one buffer
            const combinedBuffer = Buffer.concat(chunksToProcess);
            
            const uploadsDir = ensureUploadsDir();
            if (!uploadsDir) throw new Error('Uploads directory unavailable');
            const tempFilePath = path.join(uploadsDir, `streaming_audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`);
            
            // Save combined audio to temporary file
            fs.writeFileSync(tempFilePath, combinedBuffer);
            
            console.log(`📝 Transcribing audio (${combinedBuffer.length} bytes)...`);
            
            // Transcribe audio using Whisper
            const transcription = await openai.audio.transcriptions.create({
              file: fs.createReadStream(tempFilePath),
              model: "whisper-1",
              language: "en"
            });

            const userMessage = transcription.text.trim();
            console.log('📝 User said (streaming):', userMessage);
            
            // Skip if transcription is empty or too short
            if (!userMessage || userMessage.length < 2) {
              console.log('⚠️ Transcription too short or empty, skipping response');
              fs.unlinkSync(tempFilePath);
              
              // Send acknowledgment to client that audio was processed but no response needed
              socket.emit('voice-response', {
                type: 'streaming-response',
                message: 'I heard you, but couldn\'t make out what you said. Could you please speak again?',
                audioData: null,
                userTranscript: '[Unclear audio]',
                fallback: true
              });
              return;
            }

            // Get conversation history and context
            const session = conversationSessions.get(sessionId);
            if (!session) {
              console.error('❌ Session not found:', sessionId);
              fs.unlinkSync(tempFilePath);
              return;
            }

            // Add user message to history
            session.history.push({ role: 'user', content: userMessage });

            // Update conversation context based on user response
            updateConversationContext(session, userMessage);

            console.log('🤖 Generating AI response...');
            
            // Generate quick AI response for streaming
            const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective for conversations
            messages: [
              {
                role: "system",
                content: `IELTS examiner. Real-time streaming conversation.

CRITICAL: Read and understand user's message, respond specifically.

Personality: Warm, encouraging, genuinely interested.

Active Listening:
- Read message carefully, understand what they said
- Respond directly to what they mentioned
- Reference specific details from their answer
- Remember details and reference them later

Context:
- Topics: ${session.conversationContext.topicsDiscussed.join(', ') || 'None'}
- Interests: ${session.conversationContext.candidateInterests.join(', ') || 'None'}
- Strengths: ${session.conversationContext.strengths.join(', ') || 'None'}

Guidelines:
- Keep responses SHORT (1-2 sentences) but meaningful
- ALWAYS reference specific things user mentioned
- Ask SPECIFIC follow-up questions
- Be patient and supportive

Remember: Real conversation. Respond specifically to what they said.`
              },
              ...session.history.slice(-5), // Reduced from 6 to save tokens
              {
                role: "user",
                content: userMessage
              }
            ],
            max_tokens: 120, // Slightly increased from 100 for better quality
            temperature: 0.7 // Slightly lower for more focused responses
          });

            const aiMessage = aiResponse.choices[0].message.content.trim();
            console.log('✅ AI response generated:', aiMessage);
            
            // Add AI response to history
            session.history.push({ role: 'examiner', content: aiMessage });

            // Generate speech for AI response
            console.log('🎵 Generating speech for AI response...');
            const speechResponse = await openai.audio.speech.create({
              model: "tts-1",
              voice: "alloy",
              input: aiMessage,
              response_format: "mp3"
            });

            const aiAudioBuffer = Buffer.from(await speechResponse.arrayBuffer());
            const aiAudioBase64 = aiAudioBuffer.toString('base64');
            console.log('✅ Generated AI audio buffer size:', aiAudioBuffer.length, 'bytes');

            // Clean up temporary file
            fs.unlinkSync(tempFilePath);

            console.log('📤 Sending response to client...');
            socket.emit('voice-response', {
              type: 'streaming-response',
              message: aiMessage,
              audioData: aiAudioBase64,
              userTranscript: userMessage,
              fallback: false
            });
            
            console.log('✅ Response sent successfully');
            
          } catch (openaiError) {
            console.error('❌ Error processing streaming audio:', openaiError);
            
            // Clean up temp file if it exists
            try {
              if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
            } catch (e) {
              console.warn('⚠️ Error cleaning up temp file:', e);
            }
            
            // Enhanced fallback responses based on conversation context
            const session = conversationSessions.get(sessionId);
            if (!session) {
              console.error('❌ Session not found for fallback');
              return;
            }
            
            const fallbackResponse = getContextualFallbackResponse(session);
          
            // Try to generate TTS for fallback response
            let fallbackAudio = null;
            try {
              const fallbackSpeech = await openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: fallbackResponse,
                response_format: "mp3"
              });
              const fallbackAudioBuffer = Buffer.from(await fallbackSpeech.arrayBuffer());
              fallbackAudio = fallbackAudioBuffer.toString('base64');
              console.log('✅ Generated fallback audio for streaming response');
            } catch (ttsError) {
              console.warn('⚠️ Could not generate TTS for fallback, client will use browser TTS:', ttsError.message);
            }
            
            socket.emit('voice-response', {
              type: 'streaming-response',
              message: fallbackResponse,
              audioData: fallbackAudio, // Try to include audio even in fallback
              userTranscript: '[Audio processed]',
              fallback: true
            });
          }
        }, 500); // Wait 500ms after last chunk before processing - faster response
        
      } else if (data.type === 'audio-chunk') {
        // Process audio chunk and respond with dynamic AI
        console.log('🎵 Processing audio chunk...');
        
        try {
          // Convert base64 audio to buffer
          const audioBuffer = Buffer.from(data.audioData, 'base64');
          const uploadsDir = ensureUploadsDir();
          if (!uploadsDir) throw new Error('Uploads directory unavailable');
          const tempFilePath = path.join(uploadsDir, `temp_audio_${Date.now()}.webm`);
          
          // Save audio to temporary file
          fs.writeFileSync(tempFilePath, audioBuffer);
          
          // Transcribe audio using Whisper
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
            language: "en"
          });

          const userMessage = transcription.text;
          console.log('📝 User said:', userMessage);

          // Get conversation history and context
          const session = conversationSessions.get(data.sessionId);
          if (!session) {
            throw new Error('Session not found');
          }

          // Add user message to history
          session.history.push({ role: 'user', content: userMessage });

          // Update conversation context based on user response
          updateConversationContext(session, userMessage);

          // Generate dynamic AI response based on context with STREAMING enabled
          console.log('🔄 Starting streaming AI response...');
          let aiMessage = '';
          let fullMessage = '';
          
          const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective for conversations
            messages: [
              {
                role: "system",
                content: `IELTS examiner. Natural conversation practice.

CRITICAL: Listen carefully and respond directly to user's words.

Personality: Warm, encouraging, genuinely interested.

Active Listening:
- Pay attention to FULL meaning, not just keywords
- Answer questions directly
- Acknowledge and build on their information
- Remember details and reference them later

Context:
- Topics: ${session.conversationContext.topicsDiscussed.join(', ') || 'None'}
- Interests: ${session.conversationContext.candidateInterests.join(', ') || 'None'}
- Strengths: ${session.conversationContext.strengths.join(', ') || 'None'}

Guidelines:
- Respond to what they ACTUALLY said
- Build on their specific responses
- Keep responses concise (1-2 sentences)
- Be patient and supportive

Remember: Real conversation. Be patient, encouraging, supportive.`
              },
              ...session.history.slice(-6), // Reduced from 8 to save tokens
              {
                role: "user",
                content: userMessage
              }
            ],
            max_tokens: 150, // Reduced from 250 - responses should be concise
            temperature: 0.7, // Slightly lower for more focused responses
            stream: true // Enable streaming for realtime responses
          });

          // Stream chunks to client in realtime
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullMessage += content;
              // Emit each chunk as it arrives for realtime display
              socket.emit('voice-response', {
                type: 'streaming-chunk',
                chunk: content,
                userTranscript: userMessage,
                isComplete: false
              });
            }
          }

          aiMessage = fullMessage.trim();
          console.log('✅ Streaming complete. Full message:', aiMessage);
          
          // Add AI response to history
          session.history.push({ role: 'examiner', content: aiMessage });

          // Generate speech for AI response
          console.log('🎵 Generating speech for AI response:', aiMessage);
          const speechResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: aiMessage,
            response_format: "mp3"
          });

          const aiAudioBuffer = Buffer.from(await speechResponse.arrayBuffer());
          const aiAudioBase64 = aiAudioBuffer.toString('base64');
          console.log('🎵 Generated AI audio buffer size:', aiAudioBuffer.length, 'bytes');

          // Clean up temporary file
          fs.unlinkSync(tempFilePath);

          // Emit final complete response with audio
          socket.emit('voice-response', {
            type: 'streaming-response',
            message: aiMessage,
            audioData: aiAudioBase64,
            userTranscript: userMessage,
            fallback: false
          });
          
        } catch (openaiError) {
          console.error('❌ OpenAI API failed for audio processing!');
          console.error('❌ Error details:', {
            message: openaiError.message,
            status: openaiError.status,
            code: openaiError.code,
            type: openaiError.type,
            response: openaiError.response?.data || 'No response data'
          });
          console.log('⚠️ Using enhanced fallback response');
          
          // Enhanced fallback responses based on conversation context
          const session = conversationSessions.get(data.sessionId);
          const fallbackResponse = getContextualFallbackResponse(session);
          
          // Try to generate TTS for fallback response
          let fallbackAudio = null;
          try {
            const fallbackSpeech = await openai.audio.speech.create({
              model: "tts-1",
              voice: "alloy",
              input: fallbackResponse,
              response_format: "mp3"
            });
            const fallbackAudioBuffer = Buffer.from(await fallbackSpeech.arrayBuffer());
            fallbackAudio = fallbackAudioBuffer.toString('base64');
            console.log('✅ Generated fallback audio for AI response');
          } catch (ttsError) {
            console.warn('⚠️ Could not generate TTS for fallback, client will use browser TTS:', ttsError.message);
          }
          
          socket.emit('voice-response', {
            type: 'ai-response',
            message: fallbackResponse,
            audioData: fallbackAudio, // Try to include audio even in fallback
            userTranscript: '[Audio processed]',
            fallback: true
          });
        }
        
      } else if (data.type === 'end') {
        // End conversation with comprehensive AI-generated summary
        console.log('🏁 Ending conversation session...');
        
        const session = conversationSessions.get(data.sessionId);
        if (session) {
          try {
            const summaryPrompt = `Based on this IELTS speaking practice conversation, provide a comprehensive summary feedback focusing on:

1. Overall performance and engagement
2. Key strengths observed
3. Areas for improvement
4. Suggested band score (6.0-9.0)
5. Specific recommendations for improvement

Conversation history: ${session.history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Conversation context:
- Topics discussed: ${session.conversationContext.topicsDiscussed.join(', ')}
- Candidate interests: ${session.conversationContext.candidateInterests.join(', ')}
- Strengths observed: ${session.conversationContext.strengths.join(', ')}

Provide detailed, constructive feedback that feels personal and encouraging.`;
            
            // Use streaming to ensure we capture the full response
            console.log('🔄 Generating summary with streaming to ensure full response...');
            const stream = await openai.chat.completions.create({
              model: "gpt-4o-mini", // Cost-effective for summaries
              messages: [
                {
                  role: "user",
                  content: summaryPrompt
                }
              ],
              max_tokens: 700, // Increased to ensure full feedback is captured
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
            console.log('📊 Full summary feedback received:', feedback);
            console.log('📊 Feedback length:', feedback.length, 'characters');
            console.log('📊 Token usage:', tokenUsage);
            
            // Verify feedback is not empty
            if (!feedback || feedback.length === 0) {
              throw new Error('Empty feedback received from OpenAI');
            }
            
            // Check if feedback seems complete (ends with proper punctuation or is reasonably long)
            const lastChar = feedback.trim().slice(-1);
            const hasProperEnding = ['.', '!', '?'].includes(lastChar);
            if (!hasProperEnding && feedback.length < 100) {
              console.warn('⚠️ WARNING: Feedback may be incomplete - doesn\'t end with proper punctuation and is short');
            }
            
            console.log('✅ Summary feedback validated and ready to send');
            
            // Generate speech for feedback
            console.log('🎵 Generating speech for feedback (length:', feedback.length, 'chars)...');
            const speechResponse = await openai.audio.speech.create({
              model: "tts-1",
              voice: "alloy",
              input: feedback,
              response_format: "mp3"
            });

            const feedbackAudioBuffer = Buffer.from(await speechResponse.arrayBuffer());
            const feedbackAudioBase64 = feedbackAudioBuffer.toString('base64');
            console.log('🎵 Generated feedback audio buffer size:', feedbackAudioBuffer.length, 'bytes');

            socket.emit('voice-response', {
              type: 'session-ended',
              feedback: feedback,
              audioData: feedbackAudioBase64
            });
            
          } catch (openaiError) {
            console.log('⚠️ OpenAI API failed for session end, using enhanced fallback:', openaiError.message);
            
            const fallbackFeedback = "Thank you for the practice session! You showed good communication skills and engaged well with the questions. Keep practicing to improve your IELTS speaking performance. Focus on expanding your vocabulary and speaking more fluently.";
            
            socket.emit('voice-response', {
              type: 'session-ended',
              feedback: fallbackFeedback,
              audioData: null
            });
          }
          
          // Clean up session
          conversationSessions.delete(data.sessionId);
        }
      }
    } catch (error) {
      console.error('❌ Voice conversation error:', error);
      socket.emit('voice-error', { message: 'Failed to process voice conversation' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    
    // Clean up any sessions for this socket
    for (const [sessionId, session] of conversationSessions.entries()) {
      if (session.socketId === socket.id) {
        conversationSessions.delete(sessionId);
      }
    }
  });
});

// Helper function to update conversation context
function updateConversationContext(session, userMessage) {
  const message = userMessage.toLowerCase();
  
  // Extract topics and interests
  const topics = ['work', 'study', 'hobby', 'travel', 'family', 'food', 'music', 'sport', 'book', 'movie', 'technology', 'education'];
  const interests = ['like', 'enjoy', 'love', 'favorite', 'interested', 'passion'];
  
  topics.forEach(topic => {
    if (message.includes(topic) && !session.conversationContext.topicsDiscussed.includes(topic)) {
      session.conversationContext.topicsDiscussed.push(topic);
    }
  });
  
  interests.forEach(interest => {
    if (message.includes(interest)) {
      // Extract what they're interested in
      const words = message.split(' ');
      const interestIndex = words.findIndex(word => word.includes(interest));
      if (interestIndex > 0) {
        const interestTopic = words[interestIndex - 1];
        if (!session.conversationContext.candidateInterests.includes(interestTopic)) {
          session.conversationContext.candidateInterests.push(interestTopic);
        }
      }
    }
  });
  
  // Identify strengths
  if (message.includes('fluent') || message.includes('confident') || message.includes('clear')) {
    session.conversationContext.strengths.push('fluency');
  }
  if (message.includes('vocabulary') || message.includes('words') || message.includes('express')) {
    session.conversationContext.strengths.push('vocabulary');
  }
}

// Helper function to get contextual fallback responses
function getContextualFallbackResponse(session) {
  const contextualResponses = {
    work: [
      "That's really interesting! Tell me more about your work. What do you enjoy most about it?",
      "How fascinating! What's the most challenging aspect of your job?",
      "That sounds rewarding! How did you get into that field?"
    ],
    study: [
      "Great! What are you studying? What do you like about your course?",
      "That's wonderful! What's the most interesting thing you've learned recently?",
      "How exciting! What do you plan to do after you finish your studies?"
    ],
    hobby: [
      "That sounds fascinating! How did you get interested in that? What do you enjoy most about it?",
      "How wonderful! How long have you been doing that?",
      "That's impressive! What's the most challenging part?"
    ],
    travel: [
      "How wonderful! Traveling is such a great experience. What was the most memorable part of that trip?",
      "That sounds amazing! What did you learn from that experience?",
      "How exciting! Where would you like to go next?"
    ],
    family: [
      "That's lovely! Family and friends are so important. Can you tell me more about that?",
      "How wonderful! What do you value most about those relationships?",
      "That's beautiful! How do you maintain those connections?"
    ],
    food: [
      "Food is such an important part of culture! What's your favorite dish? Why do you like it?",
      "That sounds delicious! Do you enjoy cooking? What's your specialty?",
      "How interesting! What's the most unusual food you've tried?"
    ],
    music: [
      "That's a great choice! What do you like about it? Would you recommend it to others?",
      "How interesting! What draws you to that type of music?",
      "That sounds wonderful! What's your all-time favorite song?"
    ],
    sport: [
      "Excellent! Staying active is so important. What do you enjoy most about that activity?",
      "That's fantastic! How often do you do that?",
      "How motivating! What benefits have you noticed?"
    ]
  };
  
  // Find the most relevant topic
  const lastTopic = session.conversationContext.topicsDiscussed[session.conversationContext.topicsDiscussed.length - 1];
  
  if (lastTopic && contextualResponses[lastTopic]) {
    const responses = contextualResponses[lastTopic];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Default responses
  const defaultResponses = [
    "That's very interesting! Can you tell me more about that?",
    "I see! What do you like most about that?",
    "How fascinating! What made you choose that?",
    "That sounds great! How long have you been doing that?",
    "Interesting! What do you find most challenging about that?",
    "That's wonderful! What's the best part about that experience?",
    "How nice! What would you recommend to someone who wants to try that?",
    "That's impressive! How did you get started with that?",
    "That's amazing! What's next for you in that area?",
    "How exciting! What's your favorite memory related to that?",
    "That's inspiring! What advice would you give to others?",
    "How interesting! What surprised you most about that?"
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time voice conversations`);
});