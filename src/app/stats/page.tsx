"use client";

import { useEffect, useState } from "react";
import { getAllWords } from "@/lib/db";
import { useGameStore } from "@/store/gameStore";
import { getXPForNextLevel } from "@/lib/achievements";
import { VocabWord } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

interface SrsGroup {
  label: string;
  color: string;
  bg: string;
  count: number;
  levels: number[];
}

const SRS_GROUPS: Omit<SrsGroup, "count">[] = [
  { label: "New",      color: "#f0e8d0", bg: "#5a4e3a", levels: [0] },
  { label: "Learning", color: "#f0e8d0", bg: "#4a7bc8", levels: [1, 2] },
  { label: "Review",   color: "#141210", bg: "#d4a800", levels: [3] },
  { label: "Familiar", color: "#f0e8d0", bg: "#3a8050", levels: [4] },
  { label: "Known",    color: "#f0e8d0", bg: "#c41e2e", levels: [5] },
  { label: "Mastered", color: "#141210", bg: "#c4b896", levels: [6, 7, 8, 9, 10, 99] },
];

export default function StatsPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);

  const { xp, level, streak, totalReviewed, totalCorrect, dailyGoal, dailyProgress, dailyDate } =
    useGameStore();
  const { currentLevelXP, nextLevelXP, progress: xpProgress } = getXPForNextLevel(xp);

  useEffect(() => {
    getAllWords().then((all) => {
      setWords(all);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-4xl float">📊</div>
      </div>
    );
  }

  const now = new Date().toISOString();
  const dueCount = words.filter((w) => w.nextReview <= now).length;
  const accuracy =
    totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayProgress = dailyDate === todayStr ? dailyProgress : 0;

  const groups: SrsGroup[] = SRS_GROUPS.map((g) => ({
    ...g,
    count: words.filter((w) => g.levels.includes(Math.min(w.srsLevel, 99))).length,
  }));
  const maxCount = Math.max(...groups.map((g) => g.count), 1);

  const leeches = words.filter(
    (w) => w.reviewCount >= 8 && w.correctCount / w.reviewCount < 0.4
  );

  return (
    <div className="min-h-dvh pb-28" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-safe pt-6 pb-4">
        <h1
          className="text-3xl font-black uppercase tracking-tight"
          style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
        >
          Stats
        </h1>
        <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: "var(--muted)" }}>
          {words.length} words total · {dueCount} due now
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* XP / Level */}
        <div
          className="p-4"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "3px 3px 0 var(--border)",
            borderRadius: "4px",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Level {level}
              </p>
              <p className="text-2xl font-black" style={{ color: "var(--gold)" }}>
                {xp.toLocaleString()} XP
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase" style={{ color: "var(--muted)" }}>
                Next level
              </p>
              <p className="text-sm font-black" style={{ color: "var(--text)" }}>
                {(nextLevelXP - currentLevelXP).toLocaleString()} XP to go
              </p>
            </div>
          </div>
          <div
            className="h-3 overflow-hidden"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}
          >
            <div
              className="h-full transition-all"
              style={{ width: `${xpProgress * 100}%`, background: "var(--gold)" }}
            />
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { val: streak > 0 ? `🔥 ${streak}` : "0", label: "Day streak", color: "var(--gold)" },
            { val: `${accuracy}%`, label: "Accuracy", color: accuracy >= 80 ? "var(--green)" : accuracy >= 60 ? "var(--gold)" : "var(--primary)" },
            { val: totalReviewed.toLocaleString(), label: "Total reviews", color: "var(--accent)" },
            { val: dueCount, label: "Due now", color: dueCount > 0 ? "var(--primary)" : "var(--green)" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="p-4"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--border)",
                boxShadow: "3px 3px 0 var(--border)",
                borderRadius: "4px",
                transform: i % 2 === 1 ? "rotate(0.4deg)" : "rotate(-0.3deg)",
              }}
            >
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Daily goal */}
        <div
          className="p-4"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "3px 3px 0 var(--border)",
            borderRadius: "4px",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Daily goal
            </p>
            <p className="text-xs font-bold" style={{ color: "var(--text)" }}>
              {todayProgress} / {dailyGoal}
            </p>
          </div>
          <div
            className="h-3 overflow-hidden"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min((todayProgress / dailyGoal) * 100, 100)}%`,
                background: todayProgress >= dailyGoal ? "var(--green)" : "var(--accent)",
              }}
            />
          </div>
          {todayProgress >= dailyGoal && (
            <p className="text-xs font-black uppercase tracking-wider mt-2" style={{ color: "var(--green)" }}>
              ✓ Goal reached today!
            </p>
          )}
        </div>

        {/* SRS Distribution */}
        <div
          className="p-4"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "3px 3px 0 var(--border)",
            borderRadius: "4px",
          }}
        >
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>
            SRS distribution — {words.length} words
          </p>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="stamp"
                      style={{ background: g.bg, color: g.color, borderColor: g.bg }}
                    >
                      {g.label}
                    </span>
                  </div>
                  <span className="text-xs font-black" style={{ color: "var(--text)" }}>
                    {g.count}
                    <span className="font-medium ml-1" style={{ color: "var(--muted)" }}>
                      ({words.length > 0 ? Math.round((g.count / words.length) * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <div
                  className="h-4 overflow-hidden"
                  style={{
                    background: "var(--surface2)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(g.count / maxCount) * 100}%`,
                      background: g.bg,
                      minWidth: g.count > 0 ? "4px" : "0",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leeches */}
        {leeches.length > 0 && (
          <div
            className="p-4"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--primary)",
              boxShadow: "3px 3px 0 var(--primary)",
              borderRadius: "4px",
            }}
          >
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "var(--primary)" }}>
              ⚠ Leeches — {leeches.length} stubborn words
            </p>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>
              8+ reviews with accuracy below 40%
            </p>
            <div className="flex flex-col gap-2">
              {leeches.map((w) => {
                const acc = Math.round((w.correctCount / w.reviewCount) * 100);
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between px-3 py-2"
                    style={{
                      background: "var(--surface2)",
                      border: "1.5px solid var(--border)",
                      borderRadius: "3px",
                    }}
                  >
                    <div>
                      <span className="font-black text-sm" style={{ color: "var(--text)" }}>
                        {w.word}
                      </span>
                      <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                        {w.meaning}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs font-black" style={{ color: "var(--primary)" }}>
                        {acc}% accuracy
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {w.reviewCount} reviews
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
