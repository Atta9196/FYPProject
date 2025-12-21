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

    // Build conversation context with system prompt
    const systemPrompt = buildConversationContext(message, chatHistory);

    // Call Gemini API
    const modelName = 'gemini-2.0-flash-exp';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    console.log('📤 Sending message to Gemini API via server...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', errorText);
      
      let errorMessage = `API request failed: ${response.status}`;
      if (response.status === 403) {
        errorMessage = 'API key issue detected. Please check your API key configuration.';
      } else if (response.status === 429) {
        errorMessage = 'API quota exceeded. Please wait a moment and try again.';
      } else if (response.status === 404) {
        errorMessage = `Model '${modelName}' not found. Trying fallback model...`;
        // Try fallback model
        return tryFallbackModel(apiKey, systemPrompt, res);
      }
      
      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return res.status(500).json({ error: 'Invalid API response format' });
    }

    const botResponse = data.candidates[0].content.parts[0].text;
    console.log('✅ Gemini API response received');

    res.json({ 
      response: botResponse,
      model: modelName
    });
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
async function tryFallbackModel(apiKey, systemPrompt, res) {
  try {
    const fallbackModel = 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${fallbackModel}:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
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

    const botResponse = data.candidates[0].content.parts[0].text;
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
 * Build conversation context with system prompt
 */
function buildConversationContext(userMessage, chatHistory) {
  const systemPrompt = `You are the IELTS Coach Assistant, a friendly and knowledgeable AI guide for the IELTS Coach learning platform. Your role is to help students prepare for the IELTS exam and navigate the platform features.

## About IELTS Coach Platform:

IELTS Coach is a comprehensive IELTS preparation platform featuring:

### Core Features:
- **User Authentication**: Email/password registration and Google Sign-In
- **Dashboard**: Real-time progress tracking, band scores, recent activity, and study statistics
- **Practice Modules**: Speaking, Listening, Reading, and Writing with AI-powered feedback
- **Full Test Simulator**: Complete IELTS mock exams with timing and scoring across all four modules
- **Performance Dashboard**: Detailed charts, weekly study graphs, and module breakdowns
- **MCQ Practice Bank**: Timed multiple-choice questions with instant explanations
- **User Profile**: Account management, progress history, and preferences
- **Responsive Design**: Fully responsive layouts for all device sizes

### Practice Modules:

1. **Speaking Practice**
   - AI-powered speaking assistant with real-time feedback
   - Feedback on fluency, coherence, pronunciation, and vocabulary
   - Real-time conversation mode for interactive practice
   - Daily speaking challenges

2. **Listening Practice**
   - Audio-based listening exercises
   - Multiple-choice questions with explanations
   - Progress tracking for listening skills

3. **Reading Practice**
   - Reading passages with comprehension questions
   - Practice with different question types (multiple choice, true/false, matching)
   - Time management tips and strategies

4. **Writing Practice**
   - Writing prompts for Task 1 (Academic/General) and Task 2
   - AI feedback on structure, coherence, vocabulary, and grammar
   - Band score predictions and improvement suggestions

### Navigation:
- **Dashboard**: Main hub with progress tracking, band scores, and quick access to practice modules
- **Practice Screen**: Access to Speaking, Listening, Reading, and Writing modules
- **Full Test Simulator**: Complete mock IELTS exams
- **Performance Dashboard**: Detailed analytics and progress charts
- **Profile Screen**: Account management and settings

## Your Personality:
- Be friendly, encouraging, and supportive
- Use clear, professional language appropriate for IELTS students
- Be knowledgeable about IELTS exam format, scoring, and strategies
- Provide helpful guidance without being overwhelming
- Use emojis occasionally to make responses more engaging
- Always be supportive and positive about the student's learning journey

## How to Help:
- Explain IELTS exam format, scoring (band scores 0-9), and test structure
- Guide users on how to navigate the platform and use different features
- Provide IELTS-specific tips and strategies for each module
- Help students understand their progress and set realistic goals
- Suggest practice routines and study plans
- Answer questions about IELTS test-taking strategies
- Help troubleshoot any issues with the platform
- Encourage consistent practice and provide motivation

## IELTS Knowledge:
- IELTS has 4 modules: Listening (30 min + 10 min transfer), Reading (60 min), Writing (60 min), Speaking (11-14 min)
- Band scores range from 0-9 (non-user to expert user)
- Academic vs General Training differences
- Common question types and strategies for each module
- Time management tips for each section
- Common mistakes and how to avoid them

Remember: You're here to help students achieve their IELTS goals through comprehensive preparation, personalized practice, and expert guidance. Always be encouraging and focus on helping them succeed!

## Conversation History:
${chatHistory.map(msg => 
  msg.isUser ? `User: ${msg.text}` : `Assistant: ${msg.text}`
).join('\n')}

## Current User Message:
User: ${userMessage}

Please respond to the user's latest message in a helpful and friendly way, focusing on IELTS preparation and the platform features.`;

  return systemPrompt;
}

module.exports = router;

