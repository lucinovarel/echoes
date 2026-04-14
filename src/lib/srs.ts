import { VocabWord } from "./types";

// SM-2 Spaced Repetition Algorithm
// quality: 0-5 (0-1 = wrong, 2 = barely, 3 = correct, 4 = easy, 5 = perfect)

export function calculateNextReview(
  word: VocabWord,
  quality: number
): Pick<VocabWord, "srsLevel" | "easeFactor" | "interval" | "nextReview"> {
  let { srsLevel, easeFactor, interval } = word;

  if (quality < 3) {
    // Wrong answer: reset
    srsLevel = 0;
    interval = 1;
  } else {
    // Correct answer
    if (srsLevel === 0) {
      interval = 1;
    } else if (srsLevel === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    srsLevel += 1;
  }

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

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

export function isWordDue(word: VocabWord): boolean {
  return word.nextReview <= new Date().toISOString();
}

export function getSrsLabel(level: number): string {
  const labels = ["New", "Learning", "Review", "Familiar", "Known", "Mastered", "Expert"];
  return labels[Math.min(level, labels.length - 1)];
}

export function getSrsColor(level: number): string {
  const colors = [
    "bg-slate-500",
    "bg-blue-500",
    "bg-cyan-500",
    "bg-teal-500",
    "bg-green-500",
    "bg-emerald-600",
    "bg-purple-600",
  ];
  return colors[Math.min(level, colors.length - 1)];
}
