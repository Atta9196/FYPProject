const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET /api/reading/generate
 * Generate a complete IELTS Reading test with passages and questions using AI
 */
router.get("/generate", async (req, res) => {
  try {
    console.log("📚 Generating AI-based IELTS Reading test...");

    const topics = [
      "sustainable architecture and green buildings",
      "urban farming and vertical agriculture",
      "renewable energy and solar technology",
      "artificial intelligence in healthcare",
      "ocean conservation and marine biology",
      "space exploration and Mars missions",
      "ancient civilizations and archaeology",
      "climate change and environmental science",
      "renewable transport and electric vehicles",
      "mental health and psychology",
      "renewable energy storage",
      "biodiversity and wildlife conservation",
      "digital transformation in education",
      "food security and agriculture",
      "renewable materials and recycling"
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an IELTS Reading test creator. Generate a complete IELTS Academic Reading test with 3 passages and 40 questions total.

Format your response as valid JSON with this exact structure:
{
  "id": "ai-reading-[timestamp]",
  "title": "Academic Reading Test - [Topic]",
  "level": "academic",
  "description": "Three passages about [topic]",
  "passages": [
    {
      "id": "passage-1",
      "label": "Passage 1",
      "title": "[Title]",
      "paragraphs": [
        {"id": "A", "text": "[Paragraph text - 3-4 sentences]"},
        {"id": "B", "text": "[Paragraph text - 3-4 sentences]"},
        {"id": "C", "text": "[Paragraph text - 3-4 sentences]"}
      ],
      "headingOptions": [
        {"value": "i", "label": "[Heading option]"},
        {"value": "ii", "label": "[Heading option]"},
        {"value": "iii", "label": "[Heading option]"},
        {"value": "iv", "label": "[Heading option]"}
      ]
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "match-heading",
      "passageId": "passage-1",
      "prompt": "[Question text]",
      "options": [{"value": "i", "label": "[Option]"}, ...],
      "answer": "i",
      "explanation": "[Brief explanation]"
    },
    {
      "id": "q2",
      "type": "true-false-ng",
      "passageId": "passage-1",
      "prompt": "[Statement]",
      "answer": "true",
      "explanation": "[Brief explanation]"
    },
    {
      "id": "q3",
      "type": "multiple",
      "passageId": "passage-1",
      "prompt": "[Question]",
      "options": [{"value": "A", "label": "[Option]"}, ...],
      "answer": "A",
      "explanation": "[Brief explanation]"
    },
    {
      "id": "q4",
      "type": "sentence-completion",
      "passageId": "passage-1",
      "prompt": "[Sentence with blank]",
      "instructions": "Write NO MORE THAN TWO WORDS",
      "answer": ["answer1", "answer2"],
      "maxWords": 2,
      "explanation": "[Brief explanation]"
    }
  ]
}

Requirements:
- 3 passages, each 3-4 paragraphs
- 40 questions total (13-14 per passage)
- Mix question types: match-heading, true-false-ng, multiple, sentence-completion, summary-completion
- All answers must be verifiable from the passages
- Academic level vocabulary and complexity
- Return ONLY valid JSON, no markdown formatting`
          },
          {
            role: "user",
            content: `Generate an IELTS Academic Reading test about: ${randomTopic}`
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

      const readingSet = JSON.parse(jsonText);
      
      // Add timestamp-based ID if not present
      if (!readingSet.id) {
        readingSet.id = `ai-reading-${Date.now()}`;
      }

      console.log("✅ AI Reading test generated successfully");
      
      res.json({
        success: true,
        readingSet: readingSet
      });

    } catch (openaiError) {
      console.error("❌ OpenAI API failed for reading generation:", openaiError);
      
      // Return fallback reading set
      const fallbackSet = {
        id: `fallback-reading-${Date.now()}`,
        title: "Academic Reading Test - Environmental Science",
        level: "academic",
        description: "Three passages about environmental science and sustainability",
        passages: [
          {
            id: "passage-1",
            label: "Passage 1",
            title: "Climate Change and Renewable Energy",
            paragraphs: [
              {
                id: "A",
                text: "Climate change represents one of the most pressing challenges of our time. Scientists worldwide have documented rising global temperatures, melting ice caps, and increasingly frequent extreme weather events. The primary driver of these changes is the accumulation of greenhouse gases in the atmosphere, largely from human activities such as burning fossil fuels for energy."
              },
              {
                id: "B",
                text: "Renewable energy sources offer a promising solution to reduce carbon emissions. Solar and wind power have become increasingly cost-effective, with prices dropping significantly over the past decade. Many countries are investing heavily in renewable energy infrastructure, recognizing both environmental and economic benefits."
              },
              {
                id: "C",
                text: "However, the transition to renewable energy faces several challenges. Energy storage remains a critical issue, as solar and wind power are intermittent. Additionally, existing fossil fuel infrastructure represents significant investment that cannot be abandoned immediately. Policy makers must balance environmental goals with economic realities."
              }
            ],
            headingOptions: [
              { value: "i", label: "The causes and impacts of climate change" },
              { value: "ii", label: "Economic advantages of renewable energy" },
              { value: "iii", label: "Challenges in transitioning to clean energy" },
              { value: "iv", label: "Government policies on energy" }
            ]
          }
        ],
        questions: [
          {
            id: "q1",
            type: "match-heading",
            passageId: "passage-1",
            prompt: "Choose the correct heading for paragraph A",
            options: [
              { value: "i", label: "The causes and impacts of climate change" },
              { value: "ii", label: "Economic advantages of renewable energy" },
              { value: "iii", label: "Challenges in transitioning to clean energy" },
              { value: "iv", label: "Government policies on energy" }
            ],
            answer: "i",
            explanation: "Paragraph A discusses climate change causes and impacts."
          },
          {
            id: "q2",
            type: "true-false-ng",
            passageId: "passage-1",
            prompt: "Renewable energy prices have increased over the past decade.",
            answer: "false",
            explanation: "The passage states that prices have dropped significantly."
          }
        ]
      };

      res.json({
        success: true,
        readingSet: fallbackSet
      });
    }

  } catch (error) {
    console.error("❌ Error generating reading test:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate reading test",
      message: error.message
    });
  }
});

module.exports = router;

