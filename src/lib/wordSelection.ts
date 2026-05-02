import { VocabWord } from "./types";

// Higher = harder to recall. Used for weighted sampling of non-due words
// and for sorting sessions ascending (easy → hard) per retrieval practice research.
function difficultyScore(word: VocabWord): number {
  const accuracy = word.reviewCount >= 3 ? word.correctCount / word.reviewCount : 0.5;
  const levelPenalty = Math.max(0, 6 - word.srsLevel) * 1.2;
  const accuracyPenalty = (1 - accuracy) * 4;
  const newBonus = word.reviewCount === 0 ? 2 : 0;
  return levelPenalty + accuracyPenalty + newBonus;
}

function weightedSample<T extends VocabWord>(words: T[], count: number): T[] {
  if (words.length === 0) return [];
  if (words.length <= count) return [...words];

  const pool = words.map((w) => ({ word: w, weight: 1 + difficultyScore(w) }));
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

  return result;
}

/**
 * Build a session that mirrors the SRS schedule + research-backed composition:
 *
 * 1. Due words always come first (they need review right now — SRS contract).
 * 2. Remaining slots fill with non-due words via weighted sampling
 *    (harder/less-known words chosen over mastered ones).
 * 3. Session is sorted easy→hard (ascending difficulty retrieval practice, ACRP)
 *    so learners build confidence early then face the real challenge at the end.
 *    Research shows ACRP produces ~30% better long-term retention vs random order.
 *
 * An optional `filter` narrows which words can be the "correct answer"
 * (e.g. only words with a Vietnamese translation for the translate game).
 */
export function buildSessionWords<T extends VocabWord>(
  allWords: T[],
  count: number,
  filter?: (w: T) => boolean
): T[] {
  const pool = filter ? allWords.filter(filter) : allWords;
  if (pool.length === 0) return [];

  const now = new Date();
  // Words reviewed in the last 2 hours are excluded from filler to prevent
  // re-appearing before their scheduled step (e.g. a 10-min learning card
  // shouldn't fill a slot when the due pool is small).
  const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const due = pool.filter((w) => new Date(w.nextReview) <= now);
  const notDue = pool.filter(
    (w) => new Date(w.nextReview) > twoHoursAhead
  );

  // Take due words first (shuffled so order within due set is random)
  const dueSelected = due.sort(() => Math.random() - 0.5).slice(0, count);

  // Fill remaining slots with weighted sample of non-due words
  const remaining = count - dueSelected.length;
  const filler = remaining > 0 ? weightedSample(notDue, remaining) : [];

  const session = [...dueSelected, ...filler];

  // Sort ascending by difficulty: easy (high srsLevel, high accuracy) → hard
  // This matches ACRP research — confidence-building warmup before hard words
  session.sort((a, b) => difficultyScore(a) - difficultyScore(b));

  return session;
}
