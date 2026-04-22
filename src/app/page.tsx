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
      <div className="px-4 pt-safe pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-4xl font-black tracking-tight uppercase"
              style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
            >
              Echoes
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Vocabulary Journal
            </p>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 streak-glow"
                style={{
                  background: "#c48800",
                  border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)",
                  borderRadius: "4px",
                }}
              >
                <span className="text-sm">🔥</span>
                <span className="font-black text-sm" style={{ color: "#1a1008" }}>{streak}</span>
              </div>
            )}
            <div
              className="px-3 py-1.5 text-sm font-black uppercase tracking-wider"
              style={{
                background: "var(--accent)",
                border: "2px solid var(--border)",
                boxShadow: "3px 3px 0 var(--border)",
                borderRadius: "4px",
                color: "#f8f3ea",
              }}
            >
              LV {level}
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div
          className="p-3"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "3px 3px 0 var(--border)",
            borderRadius: "4px",
          }}
        >
          <div className="flex justify-between text-xs font-bold mb-2" style={{ color: "var(--muted)" }}>
            <span className="uppercase tracking-wider">XP Progress</span>
            <span style={{ color: "var(--text)" }}>{currentLevelXP} / {nextLevelXP}</span>
          </div>
          <div className="h-3 overflow-hidden" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}>
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${progress * 100}%`,
                background: "var(--primary)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Daily Goal */}
      <div className="px-4 mb-4">
        <div
          className="p-4"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "4px 4px 0 var(--border)",
            borderRadius: "4px",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text)" }}>
              Daily Goal
            </span>
            <span
              className="text-sm font-black px-2 py-0.5"
              style={{
                background: currentDaily >= dailyGoal ? "var(--green)" : "var(--surface2)",
                color: currentDaily >= dailyGoal ? "#f8f3ea" : "var(--muted)",
                border: "1.5px solid var(--border)",
                borderRadius: "2px",
              }}
            >
              {currentDaily} / {dailyGoal}{currentDaily >= dailyGoal ? " ✓" : ""}
            </span>
          </div>
          <div className="h-4 overflow-hidden" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${dailyPct}%`,
                background: dailyPct >= 100 ? "var(--green)" : "var(--accent)",
              }}
            />
          </div>
          {dailyGoal <= 20 && (
            <div className="flex gap-1 mt-2">
              {Array.from({ length: Math.min(dailyGoal, 20) }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1"
                  style={{ background: i < currentDaily ? "var(--accent)" : "var(--surface2)", border: "1px solid var(--border)" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-4 gap-2 mb-4">
        {stats.map((s, idx) => (
          <div
            key={s.label}
            className="p-3 flex flex-col items-center"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--border)",
              boxShadow: `${idx % 2 === 0 ? "3px" : "4px"} ${idx % 2 === 0 ? "3px" : "4px"} 0 var(--border)`,
              borderRadius: "4px",
              transform: idx % 3 === 1 ? "rotate(-0.5deg)" : idx % 3 === 2 ? "rotate(0.5deg)" : "none",
            }}
          >
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-base font-black" style={{ color: "var(--text)" }}>{s.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="px-4 flex flex-col gap-3 mb-4">
        {dueCount > 0 ? (
          <Link href="/study">
            <div
              className="p-5 flex items-center justify-between float"
              style={{
                background: "var(--primary)",
                border: "2px solid var(--border)",
                boxShadow: "5px 5px 0 var(--border)",
                borderRadius: "4px",
              }}
            >
              <div>
                <div
                  className="font-black text-xl uppercase tracking-tight"
                  style={{ color: "#f8f3ea", letterSpacing: "-0.01em" }}
                >
                  Study Now
                </div>
                <div className="text-sm font-semibold" style={{ color: "rgba(248,243,234,0.75)" }}>
                  {dueCount} cards due for review
                </div>
              </div>
              <span className="text-5xl">🃏</span>
            </div>
          </Link>
        ) : (
          <div
            className="p-5 flex items-center justify-between"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--border)",
              boxShadow: "4px 4px 0 var(--border)",
              borderRadius: "4px",
            }}
          >
            <div>
              <div className="font-black text-xl uppercase tracking-tight" style={{ color: "var(--text)" }}>
                All Caught Up!
              </div>
              <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                No reviews due — check back later
              </div>
            </div>
            <span className="text-5xl">🎉</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/quiz", icon: "⚡", label: "Quick Quiz", bg: "var(--accent)" },
            { href: "/recall", icon: "🧠", label: "Word Recall", bg: "var(--green)" },
            { href: "/vocabulary", icon: "📖", label: "My Words", bg: "var(--surface2)" },
          ].map((item, i) => (
            <Link key={item.href} href={item.href}>
              <div
                className="p-4 flex flex-col items-center gap-2"
                style={{
                  background: item.bg,
                  border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)",
                  borderRadius: "4px",
                  transform: i === 1 ? "rotate(-0.5deg)" : "none",
                }}
              >
                <span className="text-3xl">{item.icon}</span>
                <span
                  className="text-xs font-black text-center uppercase tracking-wider"
                  style={{ color: item.bg === "var(--surface2)" ? "var(--text)" : "#f8f3ea" }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="px-4">
          <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
            Achievements ({achievements.length})
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {[...achievements].reverse().slice(0, 8).map((a, i) => (
              <div
                key={a.id}
                className="shrink-0 flex flex-col items-center gap-1 p-3"
                style={{
                  background: "var(--surface)",
                  border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)",
                  borderRadius: "4px",
                  minWidth: 72,
                  transform: i % 2 === 0 ? "rotate(-1deg)" : "rotate(0.8deg)",
                }}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[9px] font-bold text-center uppercase tracking-wider leading-tight" style={{ color: "var(--muted)" }}>
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
