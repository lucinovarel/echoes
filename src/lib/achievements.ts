import { Achievement } from "./types";

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (state: {
    totalReviewed: number;
    totalCorrect: number;
    streak: number;
    xp: number;
    level: number;
    wordCount: number;
  }) => boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first_review",
    title: "First Steps",
    description: "Complete your first review",
    icon: "🌱",
    check: (s) => s.totalReviewed >= 1,
  },
  {
    id: "ten_reviews",
    title: "Getting Warmed Up",
    description: "Review 10 words",
    icon: "🔥",
    check: (s) => s.totalReviewed >= 10,
  },
  {
    id: "hundred_reviews",
    title: "Centurion",
    description: "Review 100 words",
    icon: "💯",
    check: (s) => s.totalReviewed >= 100,
  },
  {
    id: "streak_3",
    title: "Consistency",
    description: "Maintain a 3-day streak",
    icon: "📅",
    check: (s) => s.streak >= 3,
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "⚔️",
    check: (s) => s.streak >= 7,
  },
  {
    id: "streak_30",
    title: "Iron Will",
    description: "Maintain a 30-day streak",
    icon: "🏆",
    check: (s) => s.streak >= 30,
  },
  {
    id: "level_5",
    title: "Rising Scholar",
    description: "Reach level 5",
    icon: "📚",
    check: (s) => s.level >= 5,
  },
  {
    id: "level_10",
    title: "Word Master",
    description: "Reach level 10",
    icon: "🎓",
    check: (s) => s.level >= 10,
  },
  {
    id: "vocab_50",
    title: "Collector",
    description: "Add 50 words to your library",
    icon: "📖",
    check: (s) => s.wordCount >= 50,
  },
  {
    id: "accuracy_90",
    title: "Sharp Mind",
    description: "Maintain 90%+ accuracy over 20+ reviews",
    icon: "🎯",
    check: (s) =>
      s.totalReviewed >= 20 && s.totalCorrect / s.totalReviewed >= 0.9,
  },
];

export function checkNewAchievements(
  state: Parameters<AchievementDef["check"]>[0],
  existing: Achievement[]
): Achievement[] {
  const existingIds = new Set(existing.map((a) => a.id));
  const newOnes: Achievement[] = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (!existingIds.has(def.id) && def.check(state)) {
      newOnes.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  return newOnes;
}

export function getLevelFromXP(xp: number): number {
  // Each level requires progressively more XP
  // Level thresholds: 0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, ...
  let level = 1;
  let threshold = 100;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = Math.floor(threshold * 1.3);
  }
  return level;
}

export function getXPForNextLevel(currentXP: number): {
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
} {
  let level = 1;
  let threshold = 100;
  let accumulated = 0;
  let remaining = currentXP;

  while (remaining >= threshold) {
    remaining -= threshold;
    accumulated += threshold;
    level++;
    threshold = Math.floor(threshold * 1.3);
  }

  return {
    currentLevelXP: remaining,
    nextLevelXP: threshold,
    progress: remaining / threshold,
  };
}
