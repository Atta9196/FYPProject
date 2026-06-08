export const TIMER_SECONDS = 60 * 60;
export const TOTAL_QUESTIONS = 40;

export const PASSAGE_ORDER = ["passage-1", "passage-2", "passage-3"];

export const QUESTION_TYPE_LABELS = {
  multiple: "Multiple Choice",
  "true-false-ng": "True / False / Not Given",
  "yes-no-ng": "Yes / No / Not Given",
  "match-heading": "Matching Headings",
  "matching-info": "Matching Information",
  "matching-features": "Matching Features",
  "sentence-completion": "Sentence Completion",
  "summary-completion": "Summary Completion",
  "short-answer": "Short Answer Questions",
};

export const READING_BAND_TABLE = [
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

export function readingScoreToBand(rawScore) {
  const safe = Math.max(0, Math.min(40, Math.round(Number(rawScore) || 0)));
  const entry = READING_BAND_TABLE.find((e) => safe >= e.min);
  return entry ? entry.band : 1.0;
}
