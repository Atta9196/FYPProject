const express = require('express');
const fetch = require('node-fetch');
const { handleRegister, handleLogin, handleGoogle, handleForgotPassword, handleChangePassword } = require('../controllers/authController');

const router = express.Router();

const OPENAI_BASE = (process.env.OPENAI_API_BASE || 'https://api.openai.com').replace(/\/$/, '');

async function fetchOpenAIRealtime(path, options) {
  const url = `${OPENAI_BASE}${path}`;
  console.log('➡️ Calling OpenAI Realtime URL:', url);
  console.log('➡️ Request options:', { method: options.method, headers: options.headers, bodyPresent: !!options.body });

  const response = await fetch(url, options);
  let text = null;
  try { text = await response.text(); } catch (e) { console.warn('⚠️ Failed to read response text', e); }
  let parsed = text;
  try { parsed = text ? JSON.parse(text) : text; } catch (e) { }
  console.log('⬅️ OpenAI response status:', response.status);
  console.log('⬅️ OpenAI response body:', parsed);
  if (response.status === 404 && parsed && parsed.error && typeof parsed.error.message === 'string' && parsed.error.message.includes('Invalid URL')) {
    const err = new Error('OpenAI Realtime endpoint rejected the URL. Likely your API key/account is not enabled for Realtime.');
    err.name = 'OpenAIInvalidURLError';
    err.openai = parsed;
    err.status = response.status;
    throw err;
  }

  return { ok: response.ok, status: response.status, bodyText: text, body: parsed };
}

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/google', handleGoogle);
router.post('/forgot-password', handleForgotPassword);
router.post('/change-password', handleChangePassword);

// Issue ephemeral client secret for OpenAI Realtime API (browser WebRTC)
// Note: This endpoint is kept for backward compatibility
// The new implementation uses /api/voice/session which uses the OpenAI client properly
router.get('/realtime-token', async (req, res) => {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    // Create session using OpenAI Realtime API via HTTP (SDK doesn't support realtime yet)
    const payload = {
      model: "gpt-4o-realtime-preview-2024-12-17", // Latest model
      voice: "verse", // Natural voice for IELTS practice
      modalities: ["text", "audio"], // Enable both text and audio
      temperature: 0.8,
      instructions: "You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session.",
    };

    const { ok, status, body } = await fetchOpenAIRealtime('/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!ok) {
      throw new Error(`OpenAI API error: ${status} - ${JSON.stringify(body)}`);
    }

    const session = body;
    return res.json(session);

  } catch (e) {
    console.error('❌ Error creating Realtime token:', e);
    if (e.name === 'OpenAIInvalidURLError') {
      return res.status(502).json({
        error: 'Realtime feature not available for API key',
        message: 'OpenAI returned "Invalid URL" for Realtime endpoint. Ensure your OpenAI API key/org has Realtime access or use a Realtime-enabled key.',
        details: e.openai || null
      });
    }
    return res.status(500).json({ error: 'Unexpected error', message: e.message });
  }
});

module.exports = router;