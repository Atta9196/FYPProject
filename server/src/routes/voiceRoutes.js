const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

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

    // Create session using OpenAI Realtime API via HTTP (SDK doesn't support realtime yet)
    // Using latest model for better real-time voice responses
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17", // Latest model for better performance
        voice: "verse", // "verse" for natural voice, or "alloy", "ash", "ballad", "coral", "echo", "sage"
        modalities: ["text", "audio"], // Enable both text and audio for real-time voice
        instructions: `You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session.

MANDATORY RULES - YOU MUST FOLLOW THESE:
1. READ AND UNDERSTAND THE USER'S ENTIRE RESPONSE BEFORE YOU REPLY
2. YOUR RESPONSE MUST DIRECTLY ADDRESS WHAT THE USER JUST SAID
3. NEVER IGNORE THE USER'S ANSWER OR GIVE A GENERIC RESPONSE
4. REFERENCE SPECIFIC DETAILS FROM THE USER'S RESPONSE IN YOUR REPLY
5. IF THE USER ASKS A QUESTION, YOU MUST ANSWER IT DIRECTLY
6. IF THE USER SHARES INFORMATION, ACKNOWLEDGE IT SPECIFICALLY AND BUILD ON IT

CRITICAL LISTENING REQUIREMENTS:
- Process the COMPLETE meaning of the user's response, not just keywords
- Understand the CONTEXT and INTENT behind what they're saying
- Identify what they're actually asking or telling you
- Extract specific details, names, places, opinions, or experiences they mention
- Recognize if they're asking for your opinion, clarification, or just sharing information

RESPONSE GENERATION PROCESS:
1. FIRST: Read and understand the user's complete response
2. SECOND: Identify the main points, questions, or information they shared
3. THIRD: Determine what they need from you (answer, follow-up, acknowledgment)
4. FOURTH: Craft a response that directly addresses their specific content
5. FIFTH: Include specific references to what they said to show you understood

EXAMPLE OF GOOD RESPONSES:
- User: "I work as a software engineer and I love coding."
- GOOD: "That's interesting! What kind of projects do you work on as a software engineer? What do you enjoy most about coding?"
- BAD: "Tell me about your job." (ignores what they just said)

- User: "Do you think technology makes life easier?"
- GOOD: "I think technology definitely makes many aspects of life easier, especially communication and access to information. What's your experience been?"
- BAD: "That's nice. Tell me more." (doesn't answer their question)

Personality:
- Warm, encouraging, genuinely interested in the candidate
- Show active listening by referencing SPECIFIC things they mentioned
- Ask intelligent follow-up questions that demonstrate you UNDERSTOOD their response
- Be conversational and natural, like talking to a friend who's also an examiner

Active Listening & Understanding:
- Pay attention to the FULL meaning of what the user says, not just individual words
- If they ask a question, ANSWER IT directly and clearly - don't deflect or ignore it
- If they share information, acknowledge it SPECIFICALLY and build on it naturally
- Remember details they mention (work, hobbies, experiences) and reference them later
- Show genuine curiosity about their responses by asking relevant follow-ups

Conversation Flow:
- ALWAYS start by greeting warmly and asking an engaging opening question immediately
- When the user responds, PROCESS their full answer completely before responding
- Build your next question/comment on what they ACTUALLY said, showing you understood
- If they ask "What do you think?" or similar, give your opinion naturally and directly
- If they share something interesting, show enthusiasm and ask for more details about THAT topic
- Keep responses concise (1-2 sentences) but meaningful and contextually relevant

Response Quality - CRITICAL:
- ALWAYS respond to the USER'S ACTUAL QUESTION or statement, never use a generic template
- If they ask about your opinion, give it naturally and directly
- If they share a story, acknowledge the SPECIFIC story and ask relevant follow-ups about it
- If they seem confused, clarify gently by addressing their specific confusion
- Show you're engaged by referencing SPECIFIC details from their responses
- NEVER give a response that could apply to any conversation - it must be specific to what they just said

Context Retention:
- Remember what the user has said throughout the conversation
- Reference previous topics they mentioned when relevant
- Build on the conversation thread naturally
- Don't ask questions about things they've already told you

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

FINAL REMINDER:
- You MUST understand what the user says before responding
- You MUST respond directly to their specific content
- You MUST show you understood by referencing their specific words or ideas
- You MUST answer their questions if they ask any
- You are having a REAL conversation - treat it as such.`,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5, // Higher threshold for better voice detection
          prefix_padding_ms: 300, // Capture context before user speaks
          silence_duration_ms: 800 // Shorter silence for faster turn-taking (more natural conversation)
        },
        temperature: 0.7 // Slightly lower for more focused, context-aware responses
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || errorData.error || "Unknown error"}`);
    }

    const session = await response.json();

    console.log("✅ Realtime session created:", session.id);
    console.log("📋 Session object keys:", Object.keys(session));
    console.log("🔑 client_secret exists:", !!session.client_secret);
    console.log("🔑 client_secret type:", typeof session.client_secret);
    
    // Log client_secret.value specifically
    if (session.client_secret) {
      if (session.client_secret.value) {
        console.log("✅ client_secret.value found:", session.client_secret.value.substring(0, 20) + "...");
      } else {
        console.warn("⚠️ client_secret exists but .value is missing");
        console.log("🔑 client_secret object:", JSON.stringify(session.client_secret, null, 2));
      }
    } else {
      console.warn("⚠️ client_secret not found in session object");
      console.log("📋 Full session object:", JSON.stringify(session, null, 2));
    }
    
    // Ensure client_secret is included in response and add model
    const responseData = {
      ...session,
      model: session.model || "gpt-4o-realtime-preview-2024-12-17", // Include model in response
      success: true,
      message: "Session created successfully"
    };
    
    res.json(responseData);
    
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
    
    const response = await fetch(`https://api.openai.com/v1/realtime/sessions/${sessionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || errorData.error || "Unknown error"}`);
    }

    const session = await response.json();
    
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
    
    const response = await fetch(`https://api.openai.com/v1/realtime/sessions/${sessionId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || errorData.error || "Unknown error"}`);
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

