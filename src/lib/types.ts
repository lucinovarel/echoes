export interface VocabWord {
  id: string;
  word: string;
  phonetic?: string;
  meaning: string;
  translation?: string;
  example?: string;
  tags?: string[];
  // SRS fields
  srsLevel: number; // 0-6
  easeFactor: number; // default 2.5
  interval: number; // days until next review
  nextReview: string; // ISO date string
  createdAt: string;
  reviewCount: number;
  correctCount: number;
}

export interface GameState {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string | null;
  totalReviewed: number;
  totalCorrect: number;
  achievements: Achievement[];
  dailyGoal: number;
  dailyProgress: number;
  dailyDate: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export type StudyMode = "flashcard" | "quiz";

export interface QuizQuestion {
  word: VocabWord;
  options: string[];
  correctIndex: number;
}
