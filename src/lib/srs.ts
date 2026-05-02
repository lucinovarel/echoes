import { VocabWord } from "./types";

// SM-2 Spaced Repetition Algorithm
// quality: 0-5 (0-1 = wrong, 2 = barely, 3 = correct, 4 = easy, 5 = perfect)

// Intraday learning steps (in minutes) before graduating to day-based SRS.
// srsLevel 0 → wrong: 1 min | correct: step[0] (10 min)
// srsLevel 1 → wrong: 1 min | correct: step[1] (60 min)
// srsLevel 2 → wrong: 1 min | correct: graduates to 1-day interval
const LEARNING_STEPS_MINUTES = [10, 60];

export function calculateNextReview(
  word: VocabWord,
  quality: number
): Pick<VocabWord, "srsLevel" | "easeFactor" | "interval" | "nextReview"> {
  let { srsLevel, easeFactor, interval } = word;

  const nextReview = new Date();
  const isLearning = srsLevel < LEARNING_STEPS_MINUTES.length + 1;

  if (quality < 3) {
    // Wrong answer: stay in learning, review again in 1 minute
    srsLevel = 0;
    interval = 1;
    nextReview.setMinutes(nextReview.getMinutes() + 1);
  } else if (isLearning) {
    if (quality >= 4) {
      // Easy in learning phase: skip remaining steps, graduate immediately
      srsLevel = LEARNING_STEPS_MINUTES.length + 1;
      interval = 1;
      nextReview.setDate(nextReview.getDate() + interval);
    } else {
      // Still in learning phase: use intraday steps
      const stepMinutes = LEARNING_STEPS_MINUTES[srsLevel] ?? null;
      srsLevel += 1;
      if (stepMinutes !== null) {
        // Not graduated yet: next step in minutes
        interval = 1;
        nextReview.setMinutes(nextReview.getMinutes() + stepMinutes);
      } else {
        // Just graduated: first real interval = 1 day
        interval = 1;
        nextReview.setDate(nextReview.getDate() + interval);
      }
    }
  } else {
    // Graduated — normal day-based SRS
    if (srsLevel === LEARNING_STEPS_MINUTES.length + 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    srsLevel += 1;
    nextReview.setDate(nextReview.getDate() + interval);
  }

  // Update ease factor (only meaningful after graduating)
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  return {
    srsLevel,
    easeFactor,
    interval,
    nextReview: nextReview.toISOString(),
  };
}

export function getXpForQuality(quality: number): number {
  if (quality >= 4) return 20;
  if (quality >= 3) return 10;
  return 2; // tried but wrong still gets some XP
}

export function getSrsLabel(level: number): string {
  // Levels 0-2 are learning phase (intraday steps), 3+ are graduated SRS
  if (level === 0) return "New";
  if (level === 1) return "Learning";
  if (level === 2) return "Learning";
  const graduatedLabels = ["Review", "Familiar", "Known", "Mastered", "Expert"];
  return graduatedLabels[Math.min(level - 3, graduatedLabels.length - 1)];
}

export function getSrsColor(level: number): string {
  const colors = [
    "srs-new",
    "srs-learning",
    "srs-learning",
    "srs-review",
    "srs-familiar",
    "srs-known",
    "srs-mastered",
  ];
  return colors[Math.min(level, colors.length - 1)];
}
