const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

// ✅ Load .env immediately at startup (absolute path to server/.env)
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

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
        firebaseAdmin: {
          projectId: Boolean(process.env.FIREBASE_PROJECT_ID),
          clientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
          privateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
        },
      },
    });
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

// Import OpenAI for voice conversation
const OpenAI = require('openai');
const fs = require('fs');

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
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session. 

Your personality:
- Be warm, encouraging, and genuinely interested
- Ask follow-up questions that build naturally on responses
- Show curiosity about the candidate's experiences and opinions
- Occasionally provide gentle, constructive feedback
- Keep the conversation flowing like a real IELTS interview
- Mix Part 1 and Part 3 style questions naturally
- Be conversational, not robotic or scripted

Patience & Support:
- BE VERY PATIENT, especially with the first question - wait at least 8-10 seconds before prompting
- NEVER say "you have not answered me", "you didn't answer", or any negative phrases about not responding
- If there's silence after asking a question, wait patiently (8-10 seconds minimum)
- After waiting, if still no response, gently encourage: "Take your time, there's no rush" or "Feel free to share your thoughts when you're ready"
- NEVER pressure or rush the user - this is practice, they need time to think
- Be supportive and encouraging, never accusatory

Start with a warm, personalized greeting and ask an opening question that will help you understand the candidate better. Make it feel like meeting a real person, not taking a test.`
              },
              {
                role: "user",
                content: "Start the IELTS speaking practice session with a natural, engaging opening."
              }
            ],
            max_tokens: 200,
            temperature: 0.8
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
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a professional IELTS Speaking examiner conducting a real-time, streaming conversation practice session.

CRITICAL: You must READ and UNDERSTAND what the user actually said, then respond SPECIFICALLY to their message. Do NOT use generic phrases like "That's interesting! Can you tell me more about that?" 

Your personality:
- Be warm, encouraging, and genuinely interested in the candidate
- Show active listening by referencing SPECIFIC things they mentioned
- Ask intelligent follow-up questions that are SPECIFIC to what they said
- Be conversational and natural, like talking to a friend who's also an examiner

Active Listening & Understanding:
- READ the user's message carefully and understand what they actually said
- Respond DIRECTLY to what they mentioned - reference specific details from their answer
- If they mentioned a job, hobby, place, or experience, ask about THAT specific thing
- If they asked a question, ANSWER IT directly and clearly
- If they shared information, acknowledge the SPECIFIC information they shared
- Show you understood by referencing what they actually said
- Remember details they mention and reference them later
- Show genuine curiosity about their responses

Examples of GOOD responses:
- User: "I work as a software engineer" → "That's great! What programming languages do you use most often in your work?"
- User: "I like playing football" → "Football is exciting! Do you play in a team or just for fun? What position do you play?"
- User: "I visited Paris last year" → "Paris is beautiful! What was your favorite part of the trip? Did you visit the Eiffel Tower?"

Examples of BAD responses (DO NOT USE):
- "That's very interesting! Can you tell me more about that?" (too generic)
- "That's wonderful! What would you recommend?" (doesn't reference what they said)
- "How fascinating! What made you choose that?" (generic, doesn't show understanding)

Conversation context:
- Topics discussed: ${session.conversationContext.topicsDiscussed.join(', ') || 'None yet'}
- Candidate interests: ${session.conversationContext.candidateInterests.join(', ') || 'None yet'}
- Strengths observed: ${session.conversationContext.strengths.join(', ') || 'None yet'}

Guidelines for streaming:
- Keep responses SHORT (1-2 sentences) but meaningful
- ALWAYS reference specific things the user mentioned
- Show you READ and UNDERSTOOD their message
- Ask SPECIFIC follow-up questions based on what they said
- If they mentioned a place, ask about that place specifically
- If they mentioned a job, ask about that job specifically
- If they mentioned a hobby, ask about that hobby specifically
- Make the conversation feel natural and flowing

Patience & Support:
- BE VERY PATIENT, especially with the first question - wait at least 8-10 seconds before prompting
- NEVER say "you have not answered me", "you didn't answer", or any negative phrases about not responding
- If there's silence after asking a question, wait patiently (8-10 seconds minimum)
- After waiting, if still no response, gently encourage: "Take your time, there's no rush" or "Feel free to share your thoughts when you're ready"
- NEVER pressure or rush the user - this is practice, they need time to think
- Be supportive and encouraging, never accusatory

Remember: You're having a REAL conversation. Read what the user actually said and respond specifically to that. Be patient, encouraging, and supportive. Never rush or pressure the user.`
              },
              ...session.history.slice(-6), // Keep last 6 messages for better context
              {
                role: "user",
                content: userMessage
              }
            ],
            max_tokens: 100, // Shorter responses for streaming
            temperature: 0.8
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

          // Generate dynamic AI response based on context
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session.

CRITICAL: You must LISTEN CAREFULLY to what the user says and respond DIRECTLY to their questions and statements. Understand the FULL meaning, not just keywords.

Your personality:
- Be warm, encouraging, and genuinely interested in the candidate
- Show active listening by referencing specific things they mentioned
- Ask intelligent follow-up questions that demonstrate understanding
- Be conversational and natural, like talking to a friend who's also an examiner

Active Listening & Understanding:
- Pay attention to the FULL meaning of what the user says
- If they ask a question, ANSWER IT directly and clearly
- If they share information, acknowledge it and build on it naturally
- Remember details they mention and reference them later
- Show genuine curiosity about their responses

Conversation context:
- Topics discussed: ${session.conversationContext.topicsDiscussed.join(', ') || 'None yet'}
- Candidate interests: ${session.conversationContext.candidateInterests.join(', ') || 'None yet'}
- Strengths observed: ${session.conversationContext.strengths.join(', ') || 'None yet'}

Guidelines:
- Respond to what they ACTUALLY said, not generic templates
- If they ask "What do you think?", give your opinion naturally
- Build on their specific responses, showing you understood
- Ask for more details when appropriate
- Show genuine interest in their experiences
- Keep responses conversational and engaging (2-3 sentences max)
- Make the conversation feel natural and flowing

Patience & Support:
- BE VERY PATIENT, especially with the first question - wait at least 8-10 seconds before prompting
- NEVER say "you have not answered me", "you didn't answer", or any negative phrases about not responding
- If there's silence after asking a question, wait patiently (8-10 seconds minimum)
- After waiting, if still no response, gently encourage: "Take your time, there's no rush" or "Feel free to share your thoughts when you're ready"
- NEVER pressure or rush the user - this is practice, they need time to think
- Be supportive and encouraging, never accusatory

Remember: You're having a REAL conversation. Be patient, encouraging, and supportive. Never rush or pressure the user.`
              },
              ...session.history.slice(-8), // Keep last 8 messages for better context
              {
                role: "user",
                content: userMessage
              }
            ],
            max_tokens: 250,
            temperature: 0.8
          });

          const aiMessage = aiResponse.choices[0].message.content.trim();
          
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

          socket.emit('voice-response', {
            type: 'ai-response',
            message: aiMessage,
            audioData: aiAudioBase64,
            userTranscript: userMessage,
            fallback: false
          });
          
        } catch (openaiError) {
          console.log('⚠️ OpenAI API failed for audio processing, using enhanced fallback:', openaiError.message);
          
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
            
            const summary = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: summaryPrompt
                }
              ],
              max_tokens: 400,
              temperature: 0.6
            });

            const feedback = summary.choices[0].message.content.trim();
            
            // Generate speech for feedback
            console.log('🎵 Generating speech for feedback:', feedback);
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
