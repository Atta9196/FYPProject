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
app.use(express.json());

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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Handle voice conversation
  socket.on('voice-conversation', async (data) => {
    try {
      console.log('🎙️ Voice conversation request:', data.type);
      
      if (data.type === 'start') {
        // Initialize conversation
        const sessionId = `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        socket.emit('voice-response', {
          type: 'session-started',
          sessionId: sessionId,
          message: "Hello! I'm your IELTS examiner. Let's start with a simple question - could you tell me a little bit about yourself? What do you do for work or study?"
        });
      } else if (data.type === 'audio-chunk') {
        // Process audio chunk and respond
        console.log('🎵 Processing audio chunk...');
        
        // Simulate AI response (in real implementation, you'd process the audio)
        const responses = [
          "That's very interesting! Can you tell me more about that?",
          "I see! What do you like most about that?",
          "How fascinating! What made you choose that?",
          "That sounds great! How long have you been doing that?",
          "Interesting! What do you find most challenging about that?"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        socket.emit('voice-response', {
          type: 'ai-response',
          message: randomResponse,
          audioUrl: null // In real implementation, this would be the AI's voice response
        });
      } else if (data.type === 'end') {
        // End conversation
        socket.emit('voice-response', {
          type: 'session-ended',
          feedback: "Thank you for the practice session! You showed good communication skills. Keep practicing to improve your IELTS speaking performance."
        });
      }
    } catch (error) {
      console.error('❌ Voice conversation error:', error);
      socket.emit('voice-error', { message: 'Failed to process voice conversation' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time voice conversations`);
});
