import { VocabWord } from "./types";

/**
 * Words that are due, low SRS level, or have poor accuracy get higher weight
 * so they appear more frequently in games. Easy/mastered words appear less often.
 */
function calcWeight(word: VocabWord): number {
  const now = new Date();
  const isDue = new Date(word.nextReview) <= now;

  // Higher level = lower weight. Level 0 → +10, level 6 → +1
  const levelBonus = Math.max(1, 7 - word.srsLevel) * 1.5;

  // Due words get a significant boost
  const dueBonus = isDue ? 5 : 0;

  // Poor accuracy = higher weight (only meaningful after a few reviews)
  const accuracy = word.reviewCount >= 3 ? word.correctCount / word.reviewCount : 0.5;
  const accuracyBonus = (1 - accuracy) * 4;

  // New words (never reviewed) get a small nudge so they get introduced
  const newBonus = word.reviewCount === 0 ? 2 : 0;

  return 1 + levelBonus + dueBonus + accuracyBonus + newBonus;
}

/**
 * Weighted random sample without replacement.
 * Returns `count` words — harder/due words are more likely to be picked.
 * Falls back to a plain shuffle if there aren't enough words.
 */
export function weightedSample<T extends VocabWord>(words: T[], count: number): T[] {
  if (words.length === 0) return [];
  if (words.length <= count) return [...words].sort(() => Math.random() - 0.5);

  const pool = words.map((w) => ({ word: w, weight: calcWeight(w) }));
  const result: T[] = [];

  for (let i = 0; i < count; i++) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = Math.random() * total;
    let picked = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) { picked = j; break; }
    }
    result.push(pool[picked].word);
    pool.splice(picked, 1);
  }

  // Final shuffle so the order itself doesn't reveal the weighting
  return result.sort(() => Math.random() - 0.5);
}
