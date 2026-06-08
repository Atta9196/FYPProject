"use strict";

const ACADEMIC_TOPICS = [
  "sustainable architecture and green buildings",
  "urban farming and vertical agriculture",
  "renewable energy and solar technology",
  "artificial intelligence in healthcare",
  "ocean conservation and marine biology",
  "space exploration and Mars missions",
  "ancient civilizations and archaeology",
  "climate change and environmental science",
  "renewable transport and hydrogen technology",
  "cognitive psychology and memory research",
  "renewable energy storage systems",
  "biodiversity and wildlife conservation",
  "digital transformation in education",
  "food security and global agriculture",
  "biodegradable materials and recycling innovation",
];

const PASSAGE_SPECS = [
  {
    id: "passage-1",
    label: "Passage 1",
    startNumber: 1,
    endNumber: 13,
    questionCount: 13,
    wordMin: 700,
    wordMax: 900,
    types: ["match-heading", "true-false-ng", "sentence-completion"],
    typeHint:
      "Include roughly 4 Matching Headings, 5 True/False/Not Given, and 4 Sentence Completion questions.",
  },
  {
    id: "passage-2",
    label: "Passage 2",
    startNumber: 14,
    endNumber: 26,
    questionCount: 13,
    wordMin: 800,
    wordMax: 1000,
    types: ["multiple", "matching-info", "short-answer"],
    typeHint:
      "Include roughly 4 Multiple Choice, 5 Matching Information, and 4 Short Answer questions.",
  },
  {
    id: "passage-3",
    label: "Passage 3",
    startNumber: 27,
    endNumber: 40,
    questionCount: 14,
    wordMin: 900,
    wordMax: 1100,
    types: ["yes-no-ng", "summary-completion", "matching-features"],
    typeHint:
      "Include roughly 5 Yes/No/Not Given, 5 Summary Completion blanks (as one summary-completion question with 5 parts), and 4 Matching Features questions.",
  },
];

/** Official raw-score → band (Reading Academic, 40 items) */
const READING_BAND_TABLE = [
  { min: 39, band: 9.0 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8.0 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7.0 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6.0 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5.0 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4.0 },
  { min: 8, band: 3.5 },
  { min: 6, band: 3.0 },
  { min: 4, band: 2.5 },
  { min: 2, band: 2.0 },
  { min: 0, band: 1.0 },
];

function readingScoreToBand(rawScore) {
  const safe = Math.max(0, Math.min(40, Math.round(Number(rawScore) || 0)));
  const entry = READING_BAND_TABLE.find((e) => safe >= e.min);
  return entry ? entry.band : 1.0;
}

module.exports = {
  ACADEMIC_TOPICS,
  PASSAGE_SPECS,
  READING_BAND_TABLE,
  readingScoreToBand,
};
