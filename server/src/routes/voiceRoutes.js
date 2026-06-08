const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { createRealtimeClientSecret } = require("../services/realtimeSessionService");

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Allow overriding OpenAI base URL via env (useful for proxied environments)
const OPENAI_BASE = (process.env.OPENAI_API_BASE || 'https://api.openai.com').replace(/\/$/, '');

async function fetchOpenAIRealtime(path, options) {
  const url = `${OPENAI_BASE}${path}`;
  console.log('➡️ Calling OpenAI Realtime URL:', url);
  console.log('➡️ Request options:', {
    method: options.method,
    headers: options.headers,
    // body omitted for brevity in logs if it's large
    bodyPresent: !!options.body,
  });

  const response = await fetch(url, options);
  let text = null;
  try {
    text = await response.text();
  } catch (e) {
    console.warn('⚠️ Failed to read response text', e);
  }

  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : text;
  } catch (e) {
    // keep raw text if not JSON
  }

  console.log('⬅️ OpenAI response status:', response.status);
  console.log('⬅️ OpenAI response body:', parsed);
  // Detect common case where the API key/account is not enabled for Realtime
  if (response.status === 404 && parsed && parsed.error && typeof parsed.error.message === 'string' && parsed.error.message.includes('Invalid URL')) {
    const err = new Error('OpenAI Realtime endpoint rejected the URL. Likely your API key/account is not enabled for Realtime.');
    err.name = 'OpenAIInvalidURLError';
    err.openai = parsed;
    err.status = response.status;
    throw err;
  }

  return { ok: response.ok, status: response.status, bodyText: text, body: parsed };
}

/**
 * POST /api/voice/session
 * Create a new Realtime API session for voice conversation
 */
router.post("/session", async (req, res) => {
  try {
    console.log("🎙️ Creating Realtime API session...");

    const session = await createRealtimeClientSecret();

    console.log("✅ Realtime session created:", session.id);

    res.json({
      ...session,
      message: "Session created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating Realtime session:", error);
    return res.status(error.status || 500).json({
      error: "Failed to create Realtime session",
      message: error.message,
      details: error.openai || null,
      success: false,
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
    
    const { ok, status, body } = await fetchOpenAIRealtime(`/v1/realtime/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    if (!ok) {
      throw new Error(`OpenAI API error: ${status} - ${JSON.stringify(body)}`);
    }

    const session = body;
    
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
    
    const { ok, status, body } = await fetchOpenAIRealtime(`/v1/realtime/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    if (!ok) {
      throw new Error(`OpenAI API error: ${status} - ${JSON.stringify(body)}`);
    }
    
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

/**
 * POST /api/voice/generate-audio
 * Generate an audio response from a text prompt using gpt-4o-audio-preview
 */
router.post("/generate-audio", async (req, res) => {
  try {
    console.log("🎵 Generating audio from text...");
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY not configured",
        success: false 
      });
    }

    const { prompt, voice = "alloy", format = "wav", store = true } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required",
        success: false
      });
    }

    // Generate an audio response to the given prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o-audio-preview",
      modalities: ["text", "audio"],
      audio: { voice, format },
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      store: store
    });

    console.log("✅ Audio generated successfully");
    console.log("📋 Response choice:", response.choices[0]);

    // Extract audio data if available
    const choice = response.choices[0];
    let audioData = null;
    let audioBase64 = null;

    if (choice.message.audio && choice.message.audio.data) {
      audioBase64 = choice.message.audio.data;
      // Convert base64 to buffer for file writing if needed
      audioData = Buffer.from(audioBase64, 'base64');
    }

    // Optionally save to file (you can remove this if not needed)
    const filename = `audio-${Date.now()}.${format}`;
    const uploadDir = path.join(__dirname, "..", "uploads");
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (audioData) {
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, audioData);
      console.log("💾 Audio file saved:", filePath);
    }

    res.json({
      success: true,
      message: choice.message.content || null,
      audio: audioBase64 ? {
        data: audioBase64,
        format: format,
        filename: filename
      } : null,
      choice: choice,
      store: store
    });

  } catch (error) {
    console.error("❌ Error generating audio:", error);
    res.status(500).json({
      error: "Failed to generate audio",
      message: error.message,
      success: false
    });
  }
});

/**
 * POST /api/voice/process-audio
 * Process an audio input and get a text/audio response using gpt-4o-audio-preview
 * Accepts: base64 audio string, audio file URL, or multipart file upload
 */
router.post("/process-audio", async (req, res) => {
  try {
    console.log("🎤 Processing audio input...");
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY not configured",
        success: false 
      });
    }

    const { audioBase64, audioUrl, textPrompt = "What is in this recording?", voice = "alloy", format = "wav", store = true } = req.body;

    let base64str = null;
    let audioFormat = format;

    // Handle different input methods
    if (audioBase64) {
      // Direct base64 string provided
      base64str = audioBase64;
      console.log("📥 Using base64 audio from request body");
    } else if (audioUrl) {
      // Fetch audio from URL and convert to base64
      console.log("🌐 Fetching audio from URL:", audioUrl);
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        return res.status(400).json({
          error: "Failed to fetch audio from URL",
          success: false
        });
      }
      const buffer = await audioResponse.arrayBuffer();
      base64str = Buffer.from(buffer).toString("base64");
      
      // Try to detect format from URL
      if (audioUrl.includes('.wav')) audioFormat = 'wav';
      else if (audioUrl.includes('.mp3')) audioFormat = 'mp3';
      else if (audioUrl.includes('.m4a')) audioFormat = 'm4a';
    } else {
      return res.status(400).json({
        error: "Either audioBase64 or audioUrl must be provided",
        success: false
      });
    }

    if (!base64str) {
      return res.status(400).json({
        error: "Failed to process audio input",
        success: false
      });
    }

    // Create chat completion with audio input
    const response = await openai.chat.completions.create({
      model: "gpt-4o-audio-preview",
      modalities: ["text", "audio"],
      audio: { voice, format: audioFormat },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            { type: "input_audio", input_audio: { data: base64str, format: audioFormat }}
          ]
        }
      ],
      store: store
    });

    console.log("✅ Audio processed successfully");
    console.log("📋 Response choice:", response.choices[0]);

    const choice = response.choices[0];
    let audioData = null;
    let audioBase64Response = null;

    // Extract audio response if available
    if (choice.message.audio && choice.message.audio.data) {
      audioBase64Response = choice.message.audio.data;
      audioData = Buffer.from(audioBase64Response, 'base64');
    }

    // Optionally save response audio to file
    let filename = null;
    if (audioData) {
      filename = `response-${Date.now()}.${audioFormat}`;
      const uploadDir = path.join(__dirname, "..", "uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, audioData);
      console.log("💾 Response audio file saved:", filePath);
    }

    res.json({
      success: true,
      message: choice.message.content || null,
      audio: audioBase64Response ? {
        data: audioBase64Response,
        format: audioFormat,
        filename: filename
      } : null,
      choice: choice,
      store: store
    });

  } catch (error) {
    console.error("❌ Error processing audio:", error);
    res.status(500).json({
      error: "Failed to process audio",
      message: error.message,
      success: false
    });
  }
});

module.exports = router;

