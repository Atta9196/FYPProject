const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

/**
 * POST /api/voice/session
 * Create a new Realtime API session for voice conversation
 */
router.post("/session", async (req, res) => {
  try {
    console.log("🎙️ Creating Realtime API session...");
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY not configured",
        success: false 
      });
    }

    // Create session using OpenAI Realtime API client with enhanced instructions
    // Using latest model for better real-time voice responses
    const session = await openai.realtime.sessions.create({
      model: "gpt-4o-realtime-preview-2024-12-17", // Latest model for better performance
      voice: "verse", // "verse" for natural voice, or "alloy", "ash", "ballad", "coral", "echo", "sage"
      modalities: ["text", "audio"], // Enable both text and audio for real-time voice
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
      },
      temperature: 0.8
    });

    console.log("✅ Realtime session created:", session.id);
    console.log("📋 Session object keys:", Object.keys(session));
    console.log("🔑 client_secret exists:", !!session.client_secret);
    console.log("🔑 client_secret type:", typeof session.client_secret);
    
    // Ensure client_secret is included in response
    const response = {
      ...session,
      success: true,
      message: "Session created successfully"
    };
    
    // Log the response structure for debugging
    if (session.client_secret) {
      console.log("✅ client_secret found in session");
    } else {
      console.warn("⚠️ client_secret not found in session object");
      console.log("📋 Full session object:", JSON.stringify(session, null, 2));
    }
    
    res.json(response);
    
  } catch (error) {
    console.error("❌ Error creating Realtime session:", error);
    res.status(500).json({
      error: "Failed to create Realtime session",
      message: error.message,
      success: false
    });
  }
});

/**
 * GET /api/voice/session/:sessionId
 * Get session details
 */
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await openai.realtime.sessions.retrieve(sessionId);
    
    res.json({
      ...session,
      success: true
    });
    
  } catch (error) {
    console.error("❌ Error retrieving session:", error);
    res.status(500).json({
      error: "Failed to retrieve session",
      message: error.message,
      success: false
    });
  }
});

/**
 * DELETE /api/voice/session/:sessionId
 * End/delete a session
 */
router.delete("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await openai.realtime.sessions.delete(sessionId);
    
    console.log("✅ Session deleted:", sessionId);
    
    res.json({
      success: true,
      message: "Session ended successfully"
    });
    
  } catch (error) {
    console.error("❌ Error deleting session:", error);
    res.status(500).json({
      error: "Failed to delete session",
      message: error.message,
      success: false
    });
  }
});

module.exports = router;

