const express = require("express");
const { generateFullReadingTest } = require("../services/readingGenerationService");
const { scoreReadingObjective } = require("../services/readingScoringService");

const router = express.Router();

/**
 * GET /api/reading/generate
 * Generate a full IELTS Academic Reading test (3 passages, 40 questions) via AI.
 */
router.get("/generate", async (req, res) => {
  try {
    console.log("📚 Generating official-format IELTS Academic Reading test...");
    const readingSet = await generateFullReadingTest();
    console.log("✅ Reading test generated:", readingSet.id);
    return res.json({ success: true, readingSet });
  } catch (error) {
    console.error("❌ Reading generation failed:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate reading test. Please try again.",
      message: error.message,
    });
  }
});

/**
 * POST /api/reading/score
 * Objective answer-key scoring only (no subjective AI band assignment).
 */
router.post("/score", async (req, res) => {
  try {
    const { readingSet, answers, timeSpentSec } = req.body || {};
    if (!readingSet || !Array.isArray(readingSet.questions)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payload: readingSet.questions is required.",
      });
    }

    const result = scoreReadingObjective(readingSet, answers || {});

    return res.json({
      success: true,
      module: "reading",
      ...result,
      timeSpentSec: Number(timeSpentSec) || null,
    });
  } catch (err) {
    console.error("❌ Reading scoring failed:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to score reading submission.",
      details: err.message,
    });
  }
});

module.exports = router;
