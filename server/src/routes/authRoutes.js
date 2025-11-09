const express = require('express');
const { handleRegister, handleLogin, handleGoogle, handleForgotPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/google', handleGoogle);
router.post('/forgot-password', handleForgotPassword);

// Issue ephemeral client secret for OpenAI Realtime API (browser WebRTC)
// Note: This endpoint is kept for backward compatibility
// The new implementation uses /api/voice/session which uses the OpenAI client properly
router.get('/realtime-token', async (req, res) => {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    // Use OpenAI client for better compatibility
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Create session using OpenAI Realtime API client
    const session = await openai.realtime.sessions.create({
      model: "gpt-4o-realtime-preview-2024-12-17", // Latest model
      voice: "verse", // Natural voice for IELTS practice
      modalities: ["text", "audio"], // Enable both text and audio
      temperature: 0.8,
      instructions: `You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session.

Personality:
- Warm, encouraging, genuinely interested
- Ask follow-up questions based on what the candidate JUST said
- Keep it conversational, not scripted
- Be patient and supportive - give users time to think and respond naturally

Conversation rules:
- ALWAYS start the conversation by greeting the user warmly and asking the first question immediately
- Always build your next question on the user's latest response
- Keep responses SHORT (1-2 sentences maximum) for faster conversation flow
- Use everyday language and reference their details when appropriate
- Respond quickly and naturally - don't overthink
- If you don't clearly understand, briefly clarify and ask a quick follow-up

Patience & Support:
- BE VERY PATIENT, especially with the first question - wait at least 8-10 seconds before saying anything
- NEVER say "you have not answered me", "you didn't answer", or any negative phrases about not responding
- If the user hasn't spoken after 8-10 seconds, gently encourage: "Take your time, there's no rush" or "Feel free to share your thoughts when you're ready"
- NEVER pressure or rush the user - this is practice, they need time to think
- Be supportive and encouraging, never accusatory

Goal:
- Simulate IELTS Parts 1 and 3 naturally with quick, natural responses.
- Be patient and supportive - give users time to think, especially at the start.`,
      turn_detection: {
        type: 'server_vad',
        threshold: 0.3,
        prefix_padding_ms: 300,
        silence_duration_ms: 1000 // Increased to 1 second for more patience
      }
    });

    return res.json(session);
  } catch (e) {
    console.error('❌ Error creating Realtime token:', e);
    return res.status(500).json({ error: 'Unexpected error', message: e.message });
  }
});

module.exports = router;


