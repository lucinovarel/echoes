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
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl achievement-pop"
        style={{
          background: "linear-gradient(135deg, #1e1b4b, #1e3a5f)",
          border: "1px solid rgba(168, 85, 247, 0.5)",
          minWidth: "280px",
          maxWidth: "340px",
        }}
      >
        <div className="text-3xl">{achievement.icon}</div>
        <div className="flex-1">
          <div className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
            Achievement Unlocked!
          </div>
          <div className="text-sm font-bold text-white">{achievement.title}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {achievement.description}
          </div>
        </div>
        <div className="text-purple-400">✓</div>
      </div>
    </div>
  );
}
