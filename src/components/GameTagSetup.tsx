"use client";

import { VocabWord } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

interface Props {
  allWords: VocabWord[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onStart: () => void;
  title: string;
  icon: string;
  wordFilter?: (w: VocabWord) => boolean;
}

export default function GameTagSetup({
  allWords,
  selectedTag,
  onSelectTag,
  onStart,
  title,
  icon,
  wordFilter,
}: Props) {
  const basePool = wordFilter ? allWords.filter(wordFilter) : allWords;
  const allTags = Array.from(new Set(basePool.flatMap((w) => w.tags ?? []))).sort();

  const countFor = (tag: string | null) =>
    tag ? basePool.filter((w) => w.tags?.includes(tag)).length : basePool.length;

  const available = countFor(selectedTag);

  return (
    <div className="min-h-dvh flex flex-col pb-28" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-safe pt-4 pb-2">
        <Link
          href="/"
          className="inline-flex px-3 py-1.5 font-bold text-sm uppercase tracking-wider"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "2px 2px 0 var(--border)",
            borderRadius: "4px",
            color: "var(--muted)",
          }}
        >
          ← Back
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 bounce-in">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">{icon}</div>
            <h1
              className="text-3xl font-black uppercase tracking-tight"
              style={{ color: "var(--text)", letterSpacing: "-0.02em" }}
            >
              {title}
            </h1>
            <p className="text-sm font-semibold mt-1" style={{ color: "var(--muted)" }}>
              {available} {available === 1 ? "word" : "words"} available
            </p>
          </div>

          {allTags.length > 0 && (
            <div className="mb-6">
              <p
                className="text-xs font-black uppercase tracking-widest mb-3"
                style={{ color: "var(--muted)" }}
              >
                Filter by tag
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onSelectTag(null)}
                  className="px-3 py-2 text-xs font-black uppercase tracking-wider transition-all"
                  style={{
                    background: !selectedTag ? "var(--accent)" : "var(--surface)",
                    border: "2px solid var(--border)",
                    boxShadow: !selectedTag ? "2px 2px 0 var(--border)" : "none",
                    borderRadius: "4px",
                    color: !selectedTag ? "#f8f3ea" : "var(--muted)",
                  }}
                >
                  All ({basePool.length})
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
                    className="px-3 py-2 text-xs font-black uppercase tracking-wider transition-all"
                    style={{
                      background: selectedTag === tag ? "var(--accent)" : "var(--surface)",
                      border: "2px solid var(--border)",
                      boxShadow: selectedTag === tag ? "2px 2px 0 var(--border)" : "none",
                      borderRadius: "4px",
                      color: selectedTag === tag ? "#f8f3ea" : "var(--muted)",
                    }}
                  >
                    {tag} ({countFor(tag)})
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onStart}
            disabled={available === 0}
            className="w-full py-4 font-black uppercase tracking-wider text-base"
            style={{
              background: available === 0 ? "var(--surface2)" : "var(--primary)",
              border: "2px solid var(--border)",
              boxShadow: available === 0 ? "none" : "4px 4px 0 var(--border)",
              borderRadius: "4px",
              color: available === 0 ? "var(--muted)" : "#f8f3ea",
              cursor: available === 0 ? "not-allowed" : "pointer",
            }}
          >
            {available === 0 ? "No words available" : "Start →"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
