const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

/**
 * POST /api/chatbot/message
 * Send a message to Gemini API and get response
 */
router.post('/message', async (req, res) => {
  try {
    const { message, chatHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    console.log('🔑 Checking Gemini API key...');
    console.log('   GEMINI_API_KEY exists:', Boolean(process.env.GEMINI_API_KEY));
    console.log('   GOOGLE_API_KEY exists:', Boolean(process.env.GOOGLE_API_KEY));
    console.log('   API key found:', Boolean(apiKey));
    if (apiKey) {
      console.log('   API key prefix:', apiKey.substring(0, 10) + '...');
      console.log('   API key length:', apiKey.length);
    }
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ Gemini API key not found in server .env file');
      console.error('   Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOGLE')).join(', '));
      return res.status(500).json({ 
        error: 'Gemini API key not configured on server. Please add GEMINI_API_KEY to server/.env file.' 
      });
    }

    // Build system instruction + multi-turn conversation contents
    const systemInstruction = buildSystemInstruction();
    const contents = buildContents(message, chatHistory);

    // Decide how long the answer should be based on the user's question
    const { maxOutputTokens, lengthHint } = decideAnswerBudget(message);

    // Append a per-turn length hint to the latest user message so Gemini respects it
    if (contents.length > 0) {
      const last = contents[contents.length - 1];
      if (last.role === 'user' && Array.isArray(last.parts) && last.parts[0]?.text) {
        last.parts[0].text = `${last.parts[0].text}\n\n[Answer style: ${lengthHint}. Give ONLY the exact answer to this question. No greetings, no filler, no repeating the question.]`;
      }
    }

    // Call Gemini API - Using gemini-2.5-flash (tested and working)
    const modelName = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens,
      },
    };

    console.log(`📤 Sending message to Gemini API (${modelName})...`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          return res.status(500).json({ error: 'Invalid API response format' });
        }

        const rawResponse = data.candidates[0].content.parts[0].text || '';
        const botResponse = cleanResponse(rawResponse);
        console.log(`✅ Gemini API response received (${modelName})`);

        return res.json({
          response: botResponse,
          model: modelName
        });
      } else {
        const errorText = await response.text();
        console.error(`❌ Gemini API Error: ${response.status}`);
        console.error(`   Error: ${errorText.substring(0, 200)}`);
        
        let errorMessage = `API request failed: ${response.status}`;
        if (response.status === 403) {
          errorMessage = 'API key issue detected. Please check your API key configuration.';
        } else if (response.status === 429) {
          errorMessage = 'API quota exceeded. Please wait a moment and try again.';
        } else if (response.status === 404) {
          errorMessage = `Model '${modelName}' not found. Please check the model name.`;
        }
        
        return res.status(response.status).json({ error: errorMessage });
      }
    } catch (error) {
      console.error('❌ Chatbot route error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  } catch (error) {
    console.error('❌ Chatbot route error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * Try fallback model if primary model fails
 */
async function tryFallbackModel(apiKey, contents, res, maxOutputTokens = 220) {
  try {
    const fallbackModel = 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${fallbackModel}:generateContent?key=${apiKey}`;

    const requestBody = {
      systemInstruction: {
        role: 'system',
        parts: [{ text: buildSystemInstruction() }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.9,
        maxOutputTokens,
      },
    };

    console.log('📤 Trying fallback model:', fallbackModel);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Fallback model also failed: ${response.status}`,
        details: errorText.substring(0, 200)
      });
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return res.status(500).json({ error: 'Invalid API response format from fallback model' });
    }

    const botResponse = cleanResponse(data.candidates[0].content.parts[0].text || '');
    console.log('✅ Fallback model response received');

    res.json({
      response: botResponse,
      model: fallbackModel
    });
  } catch (error) {
    console.error('❌ Fallback model error:', error);
    res.status(500).json({ 
      error: 'Both models failed',
      message: error.message 
    });
  }
}

/**
 * Concise, strict system instruction. Tells Gemini to answer EXACTLY what was asked.
 */
function buildSystemInstruction() {
  return `You are "IELTS Coach Assistant", an expert IELTS tutor inside the IELTS Coach web app.

ANSWERING RULES (must follow):
1. Answer ONLY what the user asked. Do not add unrelated info, intros, or sign-offs.
2. Be direct and concrete. Give the exact answer first; add brief detail only if essential.
3. Match the length to the question:
   - Yes/no or factual → 1 short sentence.
   - "What is / define / meaning" → 1–2 sentences.
   - "How to / steps / strategy" → max 5 short bullet points.
   - "Explain / why" → max 3 short sentences.
   - "List" → bullets, max 6 items, no extra prose.
4. Never repeat the question. Never say "Great question", "Sure!", "Of course", "I hope this helps", etc.
5. No emojis unless the user uses them first.
6. Use plain text. Only use markdown bullets/bold when it clearly helps readability.
7. If the question is unclear, ask ONE short clarifying question instead of guessing.
8. If the question is outside IELTS or this platform, say briefly that you only help with IELTS / IELTS Coach.
9. Do not invent platform features. Known sections: Dashboard, Speaking, Listening, Reading, Writing, MCQ, Full Test Simulator, Performance, Profile, Support.

IELTS FACTS YOU CAN USE:
- 4 modules: Listening (~30 min + 10 min transfer), Reading (60 min), Writing (60 min), Speaking (11–14 min).
- Band scores: 0–9 (half bands allowed).
- Two versions: Academic and General Training.
- Writing has Task 1 and Task 2; Speaking has Parts 1, 2, 3.

Always prioritize accuracy and brevity over friendliness.`;
}

/**
 * Convert the client chat history + current message into Gemini's multi-turn `contents` format.
 * Keeps only the last few turns to stay focused and reduce drift.
 */
function buildContents(userMessage, chatHistory) {
  const MAX_TURNS = 6;
  const trimmed = Array.isArray(chatHistory) ? chatHistory.slice(-MAX_TURNS) : [];

  const contents = trimmed
    .filter((m) => m && typeof m.text === 'string' && m.text.trim() !== '')
    .map((m) => ({
      role: m.isUser ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  return contents;
}

/**
 * Pick a token budget + length hint based on the question shape.
 */
function decideAnswerBudget(message) {
  const text = (message || '').toLowerCase().trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Yes/no or very short factual
  if (/^(is|are|do|does|did|can|could|should|will|would|has|have)\b/.test(text) && wordCount <= 12) {
    return { maxOutputTokens: 80, lengthHint: '1 short sentence' };
  }

  // Definitions / what-is
  if (/^(what is|what's|define|meaning of|who is)\b/.test(text)) {
    return { maxOutputTokens: 140, lengthHint: '1–2 short sentences' };
  }

  // Lists
  if (/\b(list|types of|examples of|name (some|a few))\b/.test(text)) {
    return { maxOutputTokens: 260, lengthHint: 'a short bulleted list (max 6 items)' };
  }

  // How-to / steps / strategy
  if (/\b(how (do|to|can|should)|steps|strategy|tips|guide|improve)\b/.test(text)) {
    return { maxOutputTokens: 320, lengthHint: 'max 5 short bullet points' };
  }

  // Explanations
  if (/^(why|explain|describe|tell me about)\b/.test(text)) {
    return { maxOutputTokens: 260, lengthHint: 'max 3 short sentences' };
  }

  // Default: short and focused
  return { maxOutputTokens: 220, lengthHint: 'a short focused answer (2–3 sentences max)' };
}

/**
 * Strip common filler/preamble Gemini sometimes adds.
 */
function cleanResponse(text) {
  if (!text) return '';
  let out = text.trim();

  const fillerPatterns = [
    /^(sure|of course|certainly|absolutely|great question|good question|happy to help|no problem)[!,. ]*/i,
    /^(here'?s|here is) (the|a|an|your) (answer|response|info|information|breakdown)[:,. ]*/i,
    /^okay[!,. ]+/i,
    /^well[,!.]+\s*/i,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const re of fillerPatterns) {
      const next = out.replace(re, '').trim();
      if (next !== out) {
        out = next;
        changed = true;
      }
    }
  }

  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

module.exports = router;