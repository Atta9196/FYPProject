const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET /api/listening/generate
 * Generate a complete IELTS Listening test with 4 sections and questions using AI
 */
router.get("/generate", async (req, res) => {
  try {
    console.log("🎧 Generating AI-based IELTS Listening test...");

    const section1Topics = [
      "booking accommodation",
      "enrolling in a course",
      "joining a gym",
      "renting a car",
      "booking tickets for an event"
    ];

    const section2Topics = [
      "campus tour",
      "museum visit",
      "city guide",
      "library facilities",
      "sports center"
    ];

    const section3Topics = [
      "student presentation discussion",
      "research project planning",
      "assignment feedback",
      "course selection",
      "study group meeting"
    ];

    const section4Topics = [
      "lecture on environmental science",
      "lecture on history",
      "lecture on psychology",
      "lecture on technology",
      "lecture on business"
    ];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an IELTS Listening test creator. Generate a complete IELTS Listening test with 4 sections and 40 questions total.

Format your response as valid JSON with this exact structure:
{
  "sections": [
    {
      "id": 1,
      "title": "Section 1 • [Context]",
      "context": "[Description of conversation context]",
      "durationSeconds": 300,
      "reviewSeconds": 30,
      "questionRange": "Questions 1-10",
      "questions": [
        {
          "id": 1,
          "type": "multiple",
          "prompt": "[Question text]",
          "options": [
            {"value": "A", "label": "[Option A]"},
            {"value": "B", "label": "[Option B]"},
            {"value": "C", "label": "[Option C]"}
          ],
          "answer": "A",
          "explanation": "[Brief explanation]"
        },
        {
          "id": 2,
          "type": "fill",
          "prompt": "[Sentence with blank]",
          "instructions": "Write ONE WORD ONLY",
          "answer": ["answer1", "answer2"],
          "maxWords": 1,
          "explanation": "[Brief explanation]"
        },
        {
          "id": 3,
          "type": "form",
          "prompt": "[Form field]",
          "instructions": "Write ONE NUMBER",
          "answer": ["123", "one hundred twenty three"],
          "maxWords": 1,
          "explanation": "[Brief explanation]"
        }
      ]
    }
  ]
}

Requirements:
- Section 1: Everyday conversation (10 questions) - booking, enrollment, etc.
- Section 2: Monologue about facilities/services (10 questions)
- Section 3: Academic conversation between students/tutor (10 questions)
- Section 4: Academic lecture (10 questions)
- Mix question types: multiple choice, fill-in-blank, form completion
- All answers should be realistic and appropriate for IELTS level
- Section 1: Simple vocabulary, numbers, dates, names
- Section 2-4: Increasingly complex vocabulary and concepts
- Return ONLY valid JSON, no markdown formatting`
          },
          {
            role: "user",
            content: `Generate an IELTS Listening test with:
- Section 1: ${section1Topics[Math.floor(Math.random() * section1Topics.length)]}
- Section 2: ${section2Topics[Math.floor(Math.random() * section2Topics.length)]}
- Section 3: ${section3Topics[Math.floor(Math.random() * section3Topics.length)]}
- Section 4: ${section4Topics[Math.floor(Math.random() * section4Topics.length)]}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Clean up response (remove markdown code blocks if present)
      let jsonText = responseText;
      if (responseText.startsWith('```json')) {
        jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (responseText.startsWith('```')) {
        jsonText = responseText.replace(/```\n?/g, '').trim();
      }

      const listeningTest = JSON.parse(jsonText);
      
      // Add audio URLs (placeholder - in production, you'd generate or use TTS)
      listeningTest.sections.forEach((section, index) => {
        section.audioUrl = `https://cdn.pixabay.com/download/audio/2022/03/02/audio_b77a3e4f59.mp3?filename=airport-announcement-loop-15065.mp3`;
      });

      console.log("✅ AI Listening test generated successfully");
      
      res.json({
        success: true,
        sections: listeningTest.sections,
        totalQuestions: listeningTest.sections.reduce((sum, s) => sum + s.questions.length, 0)
      });

    } catch (openaiError) {
      console.error("❌ OpenAI API failed for listening generation:", openaiError);
      
      // Return fallback listening test
      const fallbackSections = [
        {
          id: 1,
          title: "Section 1 • Everyday Conversation",
          context: "Phone call about booking accommodation",
          audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/02/audio_b77a3e4f59.mp3?filename=airport-announcement-loop-15065.mp3",
          durationSeconds: 300,
          reviewSeconds: 30,
          questionRange: "Questions 1-10",
          questions: [
            {
              id: 1,
              type: "multiple",
              prompt: "What type of room does the caller want?",
              options: [
                { value: "A", label: "Single room" },
                { value: "B", label: "Double room" },
                { value: "C", label: "Suite" }
              ],
              answer: "B",
              explanation: "The caller requests a double room."
            },
            {
              id: 2,
              type: "fill",
              prompt: "Check-in date: ________ 15th",
              instructions: "Write ONE WORD ONLY",
              answer: ["march"],
              maxWords: 1,
              explanation: "The booking is for March 15th."
            }
          ]
        }
      ];

      res.json({
        success: true,
        sections: fallbackSections,
        totalQuestions: 10
      });
    }

  } catch (error) {
    console.error("❌ Error generating listening test:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate listening test",
      message: error.message
    });
  }
});

module.exports = router;

