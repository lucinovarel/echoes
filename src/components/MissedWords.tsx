"use client";

import { VocabWord } from "@/lib/types";
import { speakWord } from "@/lib/audio";

interface Props {
  words: VocabWord[];
}

export default function MissedWords({ words }: Props) {
  if (words.length === 0) return null;

  return (
    <div className="w-full max-w-sm mt-4">
      <p
        className="text-xs font-black uppercase tracking-widest mb-3"
        style={{ color: "var(--primary)" }}
      >
        Review these — {words.length} missed
      </p>
      <div className="flex flex-col gap-2">
        {words.map((w) => (
          <div
            key={w.id}
            className="p-3 flex items-start gap-3"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--border)",
              boxShadow: "2px 2px 0 var(--border)",
              borderRadius: "4px",
            }}
          >
            <button
              onClick={() => speakWord(w.word)}
              className="shrink-0 mt-0.5 text-sm"
              style={{
                background: "var(--primary)",
                border: "1.5px solid var(--border)",
                borderRadius: "3px",
                color: "#f8f3ea",
                padding: "2px 6px",
              }}
            >
              🔊
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-black" style={{ color: "var(--primary)" }}>
                  {w.word}
                </span>
                {w.phonetic && (
                  <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {w.phonetic}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                {w.meaning}
              </p>
              {w.translation && (
                <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--gold)" }}>
                  {w.translation}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
