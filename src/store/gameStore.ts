"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GameState, Achievement } from "@/lib/types";
import {
  checkNewAchievements,
  getLevelFromXP,
} from "@/lib/achievements";

interface GameStore extends GameState {
  addXP: (amount: number, wordCount?: number) => Achievement[];
  recordReview: (correct: boolean, wordCount?: number) => Achievement[];
  checkStreak: () => void;
  incrementDailyProgress: () => void;
  setDailyGoal: (goal: number) => void;
  reset: () => void;
}

const today = () => new Date().toISOString().split("T")[0];

const initialState: GameState = {
  xp: 0,
  level: 1,
  streak: 0,
  lastStudyDate: null,
  totalReviewed: 0,
  totalCorrect: 0,
  achievements: [],
  dailyGoal: 10,
  dailyProgress: 0,
  dailyDate: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addXP: (amount: number, wordCount = 0) => {
        const state = get();
        const newXP = state.xp + amount;
        const newLevel = getLevelFromXP(newXP);
        const newAchievements = checkNewAchievements(
          {
            totalReviewed: state.totalReviewed,
            totalCorrect: state.totalCorrect,
            streak: state.streak,
            xp: newXP,
            level: newLevel,
            wordCount,
          },
          state.achievements
        );

        set({
          xp: newXP,
          level: newLevel,
          achievements: [...state.achievements, ...newAchievements],
        });

        return newAchievements;
      },

      recordReview: (correct: boolean, wordCount = 0) => {
        const state = get();
        const newTotalReviewed = state.totalReviewed + 1;
        const newTotalCorrect = state.totalCorrect + (correct ? 1 : 0);
        const newLevel = getLevelFromXP(state.xp);
        const newAchievements = checkNewAchievements(
          {
            totalReviewed: newTotalReviewed,
            totalCorrect: newTotalCorrect,
            streak: state.streak,
            xp: state.xp,
            level: newLevel,
            wordCount,
          },
          state.achievements
        );

        set({
          totalReviewed: newTotalReviewed,
          totalCorrect: newTotalCorrect,
          achievements: [...state.achievements, ...newAchievements],
        });

        return newAchievements;
      },

      checkStreak: () => {
        const state = get();
        const todayStr = today();
        const lastDate = state.lastStudyDate;

        if (lastDate === todayStr) return;

        if (lastDate) {
          const last = new Date(lastDate);
          const now = new Date(todayStr);
          const diffDays = Math.round(
            (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays === 1) {
            set({ streak: state.streak + 1, lastStudyDate: todayStr });
          } else if (diffDays > 1) {
            set({ streak: 1, lastStudyDate: todayStr });
          }
        } else {
          set({ streak: 1, lastStudyDate: todayStr });
        }
      },

      incrementDailyProgress: () => {
        const state = get();
        const todayStr = today();

        if (state.dailyDate !== todayStr) {
          set({ dailyProgress: 1, dailyDate: todayStr });
        } else {
          set({ dailyProgress: state.dailyProgress + 1 });
        }
      },

      setDailyGoal: (goal: number) => {
        set({ dailyGoal: goal });
      },

      reset: () => set(initialState),
    }),
    {
      name: "echoes-game",
    }
  )
);
