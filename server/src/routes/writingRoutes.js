const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const evaluationModel = process.env.OPENAI_EVAL_MODEL || "gpt-4o";

const openaiClient =
    process.env.OPENAI_API_KEY &&
    new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

const isNumber = (value) => typeof value === "number" && !Number.isNaN(value);

router.post("/evaluate", async (req, res) => {
    if (!openaiClient) {
        return res.status(500).json({
            error: "OpenAI API key not configured. Set OPENAI_API_KEY to enable writing evaluations."
        });
    }

    const {
        taskId,
        taskLabel,
        promptId,
        promptTitle,
        promptText,
        questionType,
        responseText,
        wordCount,
        minWords,
        allottedSeconds,
        timeRemainingSeconds,
        autoSubmitted
    } = req.body || {};

    if (!taskId || !responseText || typeof responseText !== "string") {
        return res.status(400).json({
            error: "Missing required fields. Provide taskId and responseText."
        });
    }

    const safeWordCount = Number.isFinite(wordCount) ? Number(wordCount) : countWords(responseText);
    const safeMinWords = Number.isFinite(minWords) ? Number(minWords) : taskId === "task2-essay" ? 250 : 150;
    const underWordLimit = safeWordCount < safeMinWords;

    const timerInfo = {
        allottedSeconds: Number.isFinite(allottedSeconds) ? Number(allottedSeconds) : null,
        timeRemainingSeconds: Number.isFinite(timeRemainingSeconds) ? Number(timeRemainingSeconds) : null,
        autoSubmitted: Boolean(autoSubmitted)
    };

    const systemPrompt = `You are an IELTS Writing examiner. Score strictly according to IELTS band descriptors.
Return JSON following this schema:
{
  "scores": {
    "task": number,  // band 1-9 (Task Achievement or Task Response)
    "coherence": number,  // band 1-9
    "lexical": number,  // band 1-9
    "grammar": number   // band 1-9
  },
  "overallBand": number, // arithmetic mean of the four scores rounded to nearest 0.5
  "feedback": {
    "task": string,
    "coherence": string,
    "lexical": string,
    "grammar": string,
    "overall": string
  },
  "suggestions": string[], // actionable bullet points
  "flags": {
    "on_topic": boolean,
    "structure_issue": boolean,
    "grammar_issue": boolean
  }
}`;

    const userPrompt = `Evaluate the following IELTS writing response.

Task: ${taskLabel || taskId}
Question type: ${questionType || "Unknown"}
Prompt title: ${promptTitle || promptId || "Prompt"}
Prompt text:
"""
${promptText || "Prompt text not supplied."}
"""

Candidate response (${safeWordCount} words):
"""
${responseText}
"""

Word requirement: minimum ${safeMinWords} words.

Provide concise, examiner-style feedback.`;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: evaluationModel,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            temperature: 0.3,
            max_tokens: 700
        });

        const content = completion?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("No content returned from OpenAI.");
        }

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (error) {
            throw new Error("Failed to parse evaluation response from GPT.");
        }

        const scores = {
            task: normalizeBand(parsed?.scores?.task),
            coherence: normalizeBand(parsed?.scores?.coherence),
            lexical: normalizeBand(parsed?.scores?.lexical),
            grammar: normalizeBand(parsed?.scores?.grammar)
        };

        const rawAverage = averageBands(scores);
        const overallBand = normalizeBand(parsed?.overallBand ?? rawAverage);

        const feedback = {
            task: parsed?.feedback?.task || "",
            coherence: parsed?.feedback?.coherence || "",
            lexical: parsed?.feedback?.lexical || "",
            grammar: parsed?.feedback?.grammar || "",
            overall: parsed?.feedback?.overall || ""
        };

        const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, 6) : [];

        const flags = {
            onTopic: parsed?.flags?.on_topic !== false,
            structureIssue: Boolean(parsed?.flags?.structure_issue),
            grammarIssue: Boolean(parsed?.flags?.grammar_issue)
        };

        const penalties = {};
        let adjustedBand = overallBand;

        if (underWordLimit) {
            penalties.wordCountCap = true;
            adjustedBand = Math.min(adjustedBand, 5);
        }

        if (!flags.onTopic) {
            penalties.offTopicCap = true;
            adjustedBand = Math.min(adjustedBand, 4);
        }

        if (flags.structureIssue) {
            penalties.structurePenalty = true;
            adjustedBand = Math.max(adjustedBand - 0.5, 0);
        }

        if (flags.grammarIssue) {
            penalties.grammarPenalty = true;
            adjustedBand = Math.max(adjustedBand - 0.5, 0);
        }

        const responsePayload = {
            taskId,
            promptId,
            wordCount: safeWordCount,
            minWords: safeMinWords,
            allottedSeconds: timerInfo.allottedSeconds,
            timeRemainingSeconds: timerInfo.timeRemainingSeconds,
            autoSubmitted: timerInfo.autoSubmitted,
            scores,
            overallBand: roundToHalf(adjustedBand),
            rawOverallBand: roundToHalf(overallBand),
            penalties,
            feedback,
            suggestions,
            flags
        };

        res.json(responsePayload);
    } catch (error) {
        console.error("❌ Writing evaluation failed:", error);
        res.status(500).json({
            error: "Failed to evaluate writing submission.",
            details: error.message
        });
    }
});

function countWords(text = "") {
    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

function normalizeBand(value) {
    const numeric = Number(value);
    if (!isNumber(numeric)) {
        return null;
    }
    if (numeric < 0) return 0;
    if (numeric > 9) return 9;
    return Math.round(numeric * 2) / 2;
}

function averageBands(scores = {}) {
    const values = Object.values(scores).filter(isNumber);
    if (!values.length) return null;
    const sum = values.reduce((acc, current) => acc + current, 0);
    return sum / values.length;
}

function roundToHalf(value) {
    if (!isNumber(value)) return null;
    return Math.round(value * 2) / 2;
}

module.exports = router;

