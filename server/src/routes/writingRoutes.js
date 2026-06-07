const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const {
  validateWritingSubmission,
  countWords,
  averageBand,
  clampBand,
  summariseStrengthsWeaknesses,
} = require("../services/scoringService");

const evaluationModel = process.env.OPENAI_EVAL_MODEL || "gpt-4o";

const openaiClient =
    process.env.OPENAI_API_KEY &&
    new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

const CRITERIA_LABELS = {
    task: "Task Achievement / Response",
    coherence: "Coherence & Cohesion",
    lexical: "Lexical Resource",
    grammar: "Grammatical Range & Accuracy",
};

/**
 * POST /api/writing/evaluate
 *
 * Hybrid IELTS Writing scoring:
 *  1. Pre-AI validation (anti-cheating + word-count caps):
 *       - blank / gibberish / mostly-repeated-words → band 0–2, no AI call
 *       - per-task word-count caps (Task 1 < 100 → max band 4, < 50 → max 3;
 *         Task 2 < 250 → max 5, < 150 → max 4, < 80 → max 3)
 *  2. AI evaluation of the four official IELTS criteria when content is valid:
 *       Task Achievement / Coherence & Cohesion / Lexical Resource /
 *       Grammatical Range & Accuracy. AI also flags whether the response
 *       actually addresses the prompt.
 *  3. Overall band = arithmetic mean of the four sub-scores, rounded with
 *       the official IELTS rule (.25 → +0.25, .75 → +0.25). Then capped by
 *       any word-count or relevance rule that was triggered.
 *  4. Returns a uniform explanation block:
 *       { reasonForScore, strengths, weaknesses, suggestions }
 *     so the UI can show the candidate exactly why they received this band.
 */
router.post("/evaluate", async (req, res) => {
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

    if (!taskId || typeof responseText !== "string") {
        return res.status(400).json({
            error: "Missing required fields. Provide taskId and responseText."
        });
    }

    // ── Step 1: deterministic validation ────────────────────────────────────
    const validation = validateWritingSubmission({ taskId, responseText });
    const safeWordCount = Number.isFinite(wordCount) ? Number(wordCount) : validation.wordCount;

    // Short-circuit: blank / gibberish / repeated-words → no AI call
    if (!validation.valid) {
        const cap = Number(validation.wordCap.cap ?? 0);
        return res.json(buildShortCircuitResponse({
            taskId,
            promptId,
            wordCount: safeWordCount,
            minWords: safeMinWords(minWords, taskId),
            allottedSeconds,
            timeRemainingSeconds,
            autoSubmitted,
            band: cap,
            reason: validation.wordCap.reason,
            issues: validation.issues,
        }));
    }

    if (!openaiClient) {
        return res.status(500).json({
            error: "OpenAI API key not configured. Set OPENAI_API_KEY to enable writing evaluations."
        });
    }

    // ── Step 2: AI evaluation of the four IELTS criteria ────────────────────
    const systemPrompt = `You are a senior IELTS Writing examiner. Score strictly using the official IELTS public band descriptors.

Return ONLY a JSON object with this exact schema (no markdown, no commentary):
{
  "scores": {
    "task":      <number 0-9 in 0.5 steps>,   // Task Achievement / Task Response
    "coherence": <number 0-9 in 0.5 steps>,   // Coherence and Cohesion
    "lexical":   <number 0-9 in 0.5 steps>,   // Lexical Resource
    "grammar":   <number 0-9 in 0.5 steps>    // Grammatical Range and Accuracy
  },
  "feedback": {
    "task":      "<2-3 sentences: how well the response addresses the prompt>",
    "coherence": "<2-3 sentences: paragraphing, linking, progression>",
    "lexical":   "<2-3 sentences: vocabulary range / accuracy / collocation>",
    "grammar":   "<2-3 sentences: sentence variety / grammar accuracy>"
  },
  "strengths":   ["<short bullet>", "..."],   // 2-4 specific strengths
  "weaknesses":  ["<short bullet>", "..."],   // 2-4 specific weaknesses
  "suggestions": ["<short actionable tip>", "..."], // 3-5 concrete suggestions
  "flags": {
    "on_topic": <true if response addresses the prompt, false otherwise>,
    "off_topic_reason": "<short reason or empty string>",
    "structure_issue": <true if intro/body/conclusion are missing or unclear>,
    "grammar_issue":   <true if grammar errors are frequent enough to impede meaning>,
    "memorised":       <true if it looks like a pre-memorised template>
  }
}

Strict rules:
- Score Task Response based on whether ALL parts of the prompt are addressed and developed.
- Off-topic responses MUST NOT receive Task scores above 4.
- Frequent grammar errors that impede meaning MUST cap Grammar at 5 or below.
- Be objective and specific in feedback — reference what the candidate actually wrote.`;

    const userPrompt = `Evaluate this IELTS writing response.

Task:  ${taskLabel || taskId}
Type:  ${questionType || "Unknown"}
Title: ${promptTitle || promptId || "Prompt"}
Prompt:
"""
${promptText || "Prompt text not supplied."}
"""

Candidate response (${safeWordCount} words):
"""
${responseText}
"""

Minimum word requirement: ${safeMinWords(minWords, taskId)} words.

Return the JSON exactly per the schema.`;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: evaluationModel,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 900
        });

        const content = completion?.choices?.[0]?.message?.content;
        if (!content) throw new Error("No content returned from OpenAI.");

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            throw new Error("Failed to parse evaluation response from GPT.");
        }

        const scores = {
            task:      clampBand(parsed?.scores?.task),
            coherence: clampBand(parsed?.scores?.coherence),
            lexical:   clampBand(parsed?.scores?.lexical),
            grammar:   clampBand(parsed?.scores?.grammar),
        };

        const feedback = {
            task:      stringOr(parsed?.feedback?.task, ""),
            coherence: stringOr(parsed?.feedback?.coherence, ""),
            lexical:   stringOr(parsed?.feedback?.lexical, ""),
            grammar:   stringOr(parsed?.feedback?.grammar, ""),
            overall:   stringOr(parsed?.feedback?.overall, ""),
        };

        const flags = {
            onTopic:         parsed?.flags?.on_topic !== false,
            offTopicReason:  stringOr(parsed?.flags?.off_topic_reason, ""),
            structureIssue:  Boolean(parsed?.flags?.structure_issue),
            grammarIssue:    Boolean(parsed?.flags?.grammar_issue),
            memorised:       Boolean(parsed?.flags?.memorised),
        };

        // ── Step 3: average + apply caps (word count, off-topic, etc.) ──────
        const rawAverage = averageBand([scores.task, scores.coherence, scores.lexical, scores.grammar]);
        const rawOverallBand = clampBand(rawAverage);

        const penalties = {};
        let adjustedBand = rawOverallBand ?? 0;
        const capReasons = [];

        const wordCap = validation.wordCap.cap;
        if (wordCap !== null && wordCap !== undefined) {
            if (adjustedBand > wordCap) {
                adjustedBand = wordCap;
                penalties.wordCountCap = true;
                capReasons.push(validation.wordCap.reason);
            }
        }
        if (!flags.onTopic && adjustedBand > 4) {
            adjustedBand = 4;
            penalties.offTopicCap = true;
            capReasons.push(
                flags.offTopicReason ||
                "Response is off-topic — overall capped at band 4."
            );
        }
        if (flags.memorised && adjustedBand > 5) {
            adjustedBand = 5;
            penalties.memorisedCap = true;
            capReasons.push("Response looks memorised — overall capped at band 5.");
        }
        if (flags.structureIssue) {
            penalties.structurePenalty = true;
            adjustedBand = Math.max(0, adjustedBand - 0.5);
            capReasons.push("Missing or unclear introduction / body / conclusion — 0.5 deducted.");
        }
        if (flags.grammarIssue) {
            penalties.grammarPenalty = true;
            adjustedBand = Math.max(0, adjustedBand - 0.5);
            capReasons.push("Frequent grammar errors that impede meaning — 0.5 deducted.");
        }

        const overallBand = clampBand(adjustedBand);

        // ── Step 4: explanation block (strengths / weaknesses / suggestions)
        const aiStrengths = Array.isArray(parsed?.strengths)
            ? parsed.strengths.filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
            : [];
        const aiWeaknesses = Array.isArray(parsed?.weaknesses)
            ? parsed.weaknesses.filter((s) => typeof s === "string" && s.trim()).slice(0, 5)
            : [];
        const aiSuggestions = Array.isArray(parsed?.suggestions)
            ? parsed.suggestions.filter((s) => typeof s === "string" && s.trim()).slice(0, 6)
            : [];

        const fallback = summariseStrengthsWeaknesses(scores, CRITERIA_LABELS);
        const strengths = aiStrengths.length ? aiStrengths : fallback.strengths;
        const weaknesses = aiWeaknesses.length ? aiWeaknesses : fallback.weaknesses;
        const suggestions = aiSuggestions.length
            ? aiSuggestions
            : [
                "Add more topic-specific vocabulary and natural collocations.",
                "Use a wider range of grammar structures (conditionals, relative clauses).",
                "Always include a clear introduction, body paragraphs and conclusion.",
            ];

        const reasonForScore = buildWritingReason({
            overallBand,
            rawOverallBand,
            scores,
            penalties,
            capReasons,
            wordCount: safeWordCount,
        });

        const responsePayload = {
            taskId,
            promptId,
            module: "writing",
            wordCount: safeWordCount,
            minWords: safeMinWords(minWords, taskId),
            allottedSeconds: Number.isFinite(allottedSeconds) ? Number(allottedSeconds) : null,
            timeRemainingSeconds: Number.isFinite(timeRemainingSeconds) ? Number(timeRemainingSeconds) : null,
            autoSubmitted: Boolean(autoSubmitted),
            scores,
            overallBand,
            band: overallBand,
            bandScore: overallBand,
            rawOverallBand,
            penalties,
            capReasons,
            feedback,
            suggestions,
            flags,
            summary: {
                reasonForScore,
                strengths,
                weaknesses,
                suggestions,
            },
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

function safeMinWords(minWords, taskId) {
    if (Number.isFinite(minWords)) return Number(minWords);
    return String(taskId).toLowerCase().includes("task2") ? 250 : 150;
}

function stringOr(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildShortCircuitResponse({
    taskId,
    promptId,
    wordCount,
    minWords,
    allottedSeconds,
    timeRemainingSeconds,
    autoSubmitted,
    band,
    reason,
    issues,
}) {
    const zeroScores = { task: band, coherence: band, lexical: band, grammar: band };
    const issueFeedback = issues.includes("blank")
        ? "You did not submit any text. Please write a response before submitting."
        : issues.includes("gibberish")
            ? "Your response appears to contain random characters and cannot be assessed."
            : issues.includes("repeated-words")
                ? "Your response consists of the same word(s) repeated, which is not assessable as IELTS writing."
                : "Submission is not valid for IELTS assessment.";

    return {
        taskId,
        promptId,
        module: "writing",
        wordCount,
        minWords,
        allottedSeconds: Number.isFinite(allottedSeconds) ? Number(allottedSeconds) : null,
        timeRemainingSeconds: Number.isFinite(timeRemainingSeconds) ? Number(timeRemainingSeconds) : null,
        autoSubmitted: Boolean(autoSubmitted),
        scores: zeroScores,
        overallBand: band,
        band,
        bandScore: band,
        rawOverallBand: band,
        penalties: { invalidSubmission: true },
        capReasons: [reason || "Submission could not be assessed."],
        feedback: {
            task: issueFeedback,
            coherence: issueFeedback,
            lexical: issueFeedback,
            grammar: issueFeedback,
            overall: issueFeedback,
        },
        suggestions: [
            "Write a complete response that addresses every part of the prompt.",
            "Aim for at least the minimum word count (150 for Task 1, 250 for Task 2).",
            "Use real paragraphs with clear introduction, body and conclusion.",
        ],
        flags: {
            onTopic: false,
            structureIssue: true,
            grammarIssue: false,
            memorised: false,
        },
        summary: {
            reasonForScore: reason || "Submission could not be assessed.",
            strengths: [],
            weaknesses: [issueFeedback],
            suggestions: [
                "Write a complete response that addresses every part of the prompt.",
                "Aim for at least the minimum word count (150 for Task 1, 250 for Task 2).",
                "Use real paragraphs with clear introduction, body and conclusion.",
            ],
        },
    };
}

function buildWritingReason({ overallBand, rawOverallBand, scores, penalties, capReasons, wordCount }) {
    const parts = [];
    parts.push(
        `Overall band ${overallBand} from the average of Task ${scores.task ?? "-"}, ` +
        `Coherence ${scores.coherence ?? "-"}, Lexical ${scores.lexical ?? "-"}, ` +
        `Grammar ${scores.grammar ?? "-"} (raw average ${rawOverallBand ?? "-"}).`
    );
    if (typeof wordCount === "number") {
        parts.push(`Word count: ${wordCount}.`);
    }
    if (capReasons && capReasons.length) {
        parts.push(...capReasons);
    }
    if (!capReasons?.length && !Object.keys(penalties || {}).length) {
        parts.push("No penalties applied.");
    }
    return parts.join(" ");
}

module.exports = router;
