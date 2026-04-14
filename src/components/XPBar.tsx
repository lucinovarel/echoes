"use client";

import { useGameStore } from "@/store/gameStore";
import { getXPForNextLevel } from "@/lib/achievements";

export default function XPBar() {
  const { xp, level } = useGameStore();
  const { currentLevelXP, nextLevelXP, progress } = getXPForNextLevel(xp);

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              color: "white",
            }}
          >
            LV {level}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {currentLevelXP} / {nextLevelXP} XP
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--gold)" }}>
          ⚡ {xp} total
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(progress * 100, 100)}%`,
            background: "linear-gradient(90deg, var(--primary), var(--accent))",
          }}
        />
      </div>
    </div>
  );
}
