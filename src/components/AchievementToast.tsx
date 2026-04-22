"use client";

import { useEffect, useState } from "react";
import { Achievement } from "@/lib/types";

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export default function AchievementToast({ achievement, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 achievement-pop"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--border)",
          boxShadow: "4px 4px 0 var(--border)",
          borderRadius: "4px",
          minWidth: "280px",
          maxWidth: "340px",
          transform: "rotate(-1.5deg)",
        }}
      >
        <div className="text-3xl">{achievement.icon}</div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
            Achievement Unlocked!
          </div>
          <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{achievement.title}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {achievement.description}
          </div>
        </div>
        <div
          className="w-6 h-6 flex items-center justify-center font-bold text-sm"
          style={{
            background: "var(--green)",
            color: "#f8f3ea",
            border: "1.5px solid var(--border)",
            borderRadius: "2px",
          }}
        >
          ✓
        </div>
      </div>
    </div>
  );
}
