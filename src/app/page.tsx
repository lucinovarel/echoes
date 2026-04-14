"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { getXPForNextLevel } from "@/lib/achievements";
import BottomNav from "@/components/BottomNav";
import { getAllWords, addWords, getDueWords } from "@/lib/db";
import { SEED_WORDS } from "@/lib/seedData";
import { VocabWord } from "@/lib/types";

export default function HomePage() {
  const {
    xp, level, streak, totalReviewed, totalCorrect,
    dailyGoal, dailyProgress, dailyDate, achievements, checkStreak,
  } = useGameStore();
  const [wordCount, setWordCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const { currentLevelXP, nextLevelXP, progress } = getXPForNextLevel(xp);

  const todayStr = new Date().toISOString().split("T")[0];
  const currentDaily = dailyDate === todayStr ? dailyProgress : 0;
  const dailyPct = Math.min((currentDaily / dailyGoal) * 100, 100);
  const accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

  useEffect(() => {
    checkStreak();
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    const all: VocabWord[] = await getAllWords();
    if (all.length === 0) {
      await addWords(SEED_WORDS);
      setWordCount(SEED_WORDS.length);
      setDueCount(SEED_WORDS.length);
    } else {
      setWordCount(all.length);
      const due = await getDueWords();
      setDueCount(due.length);
    }
  }

  const stats = [
    { label: "Words", value: wordCount, icon: "📚" },
    { label: "Due", value: dueCount, icon: "⏰" },
    { label: "Reviewed", value: totalReviewed, icon: "✅" },
    { label: "Accuracy", value: `${accuracy}%`, icon: "🎯" },
  ];

  return (
    <div className="min-h-dvh pb-28" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-safe pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Echoes</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Your vocab journey</p>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full streak-glow"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.4)",
                }}
              >
                <span>🔥</span>
                <span className="font-bold text-amber-400 text-sm">{streak}</span>
              </div>
            )}
            <div
              className="px-3 py-1.5 rounded-full text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.15))",
                border: "1px solid rgba(124,58,237,0.4)",
                color: "#a78bfa",
              }}
            >
              LV {level}
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-1">
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
            <span>{currentLevelXP} / {nextLevelXP} XP</span>
            <span style={{ color: "var(--gold)" }}>⚡ {xp} total</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Daily Goal */}
      <div className="px-4 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Daily Goal</span>
            <span className="text-sm font-medium" style={{ color: currentDaily >= dailyGoal ? "#10b981" : "var(--muted)" }}>
              {currentDaily} / {dailyGoal}{currentDaily >= dailyGoal ? " 🎉" : ""}
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${dailyPct}%`,
                background: dailyPct >= 100
                  ? "linear-gradient(90deg, #10b981, #059669)"
                  : "linear-gradient(90deg, #7c3aed, #a855f7)",
              }}
            />
          </div>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: Math.min(dailyGoal, 20) }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{ background: i < currentDaily ? "#a78bfa" : "var(--border)" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-4 gap-2 mb-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 flex flex-col items-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-base font-bold text-white leading-tight">{s.value}</div>
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="px-4 flex flex-col gap-3 mb-4">
        {dueCount > 0 ? (
          <Link href="/study">
            <div
              className="rounded-2xl p-5 flex items-center justify-between float"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
              }}
            >
              <div>
                <div className="text-white font-bold text-xl">Study Now</div>
                <div className="text-purple-200 text-sm">{dueCount} cards due for review</div>
              </div>
              <span className="text-5xl">🃏</span>
            </div>
          </Link>
        ) : (
          <div
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div>
              <div className="text-white font-bold text-xl">All Caught Up!</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>No reviews due — check back later</div>
            </div>
            <span className="text-5xl">🎉</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Link href="/quiz">
            <div
              className="rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{
                background: "rgba(6,182,212,0.08)",
                border: "1px solid rgba(6,182,212,0.3)",
              }}
            >
              <span className="text-3xl">⚡</span>
              <span className="text-xs font-semibold text-center" style={{ color: "#22d3ee" }}>Quick Quiz</span>
            </div>
          </Link>
          <Link href="/recall">
            <div
              className="rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <span className="text-3xl">🧠</span>
              <span className="text-xs font-semibold text-center" style={{ color: "#34d399" }}>Word Recall</span>
            </div>
          </Link>
          <Link href="/vocabulary">
            <div
              className="rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              <span className="text-3xl">📖</span>
              <span className="text-xs font-semibold text-center" style={{ color: "#a78bfa" }}>My Words</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Achievements ({achievements.length})
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {[...achievements].reverse().slice(0, 8).map((a) => (
              <div
                key={a.id}
                className="shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  minWidth: 72,
                }}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[10px] text-center leading-tight" style={{ color: "var(--muted)" }}>
                  {a.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
