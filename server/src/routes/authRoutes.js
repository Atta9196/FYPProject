const express = require('express');
const { handleRegister, handleLogin, handleGoogle, handleForgotPassword, handleChangePassword } = require('../controllers/authController');
const { createRealtimeClientSecret } = require('../services/realtimeSessionService');

const router = express.Router();

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
    const session = await createRealtimeClientSecret();
    return res.json(session);
  } catch (e) {
    console.error('❌ Error creating Realtime token:', e);
    return res.status(e.status || 500).json({
      error: 'Failed to create Realtime token',
      message: e.message,
      details: e.openai || null,
    });
  }
});

module.exports = router;