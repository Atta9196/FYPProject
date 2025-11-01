const express = require('express');
const { handleRegister, handleLogin, handleGoogle, handleForgotPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/google', handleGoogle);
router.post('/forgot-password', handleForgotPassword);

// Issue ephemeral client secret for OpenAI Realtime API (browser WebRTC)
router.get('/realtime-token', async (req, res) => {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    // Mint a short-lived session client secret
    // Note: In production, restrict origins and add auth.
    const fetch = (await import('node-fetch')).default;
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
        modalities: ['audio'],
        temperature: 0.8,
        instructions: `You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session.

Personality:
- Warm, encouraging, genuinely interested
- Ask follow-up questions based on what the candidate JUST said
- Keep it conversational, not scripted

Conversation rules:
- Always build your next question on the user's latest response
- Keep responses short (1-3 sentences) and specific
- Use everyday language and reference their details (places, people, preferences) when appropriate
- If you don't clearly understand, briefly clarify what you heard and ask a precise follow-up

Goal:
- Simulate IELTS Parts 1 and 3 naturally.`,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 5000
        }
      })
    });

    if (!r.ok) {
      const body = await r.text();
      return res.status(500).json({ error: 'Failed to create session', details: body });
    }

    const data = await r.json();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', message: e.message });
  }
});

module.exports = router;


