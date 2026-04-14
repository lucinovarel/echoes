"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllWords, deleteWord } from "@/lib/db";
import { getSrsLabel, getSrsColor } from "@/lib/srs";
import { speakWord } from "@/lib/audio";
import { VocabWord } from "@/lib/types";
import BottomNav from "@/components/BottomNav";

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const all = await getAllWords();
    setWords(all.sort((a, b) => a.word.localeCompare(b.word)));
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await deleteWord(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
    setDeleteConfirm(null);
    setExpandedId(null);
  }

  const allTags = Array.from(new Set(words.flatMap((w) => w.tags ?? [])));

  const filtered = words.filter((w) => {
    const matchSearch =
      !search ||
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaning.toLowerCase().includes(search.toLowerCase()) ||
      (w.translation?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchTag = !selectedTag || (w.tags?.includes(selectedTag) ?? false);
    return matchSearch && matchTag;
  });

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-4xl float">📚</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-safe pt-4 pb-3" style={{ background: "var(--bg)" }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">My Words</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--muted)" }}>{words.length} words</span>
            <Link
              href="/add"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              + Add
            </Link>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--muted)" }}>🔍</span>
          <input
            type="text"
            placeholder="Search words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-slate-500"
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: "var(--muted)" }}>✕</button>
          )}
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setSelectedTag(null)}
              className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: !selectedTag ? "var(--primary)" : "var(--surface)",
                color: !selectedTag ? "white" : "var(--muted)",
                border: !selectedTag ? "none" : "1px solid var(--border)",
              }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: selectedTag === tag ? "var(--accent)" : "var(--surface)",
                  color: selectedTag === tag ? "white" : "var(--muted)",
                  border: selectedTag === tag ? "none" : "1px solid var(--border)",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Word List */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {words.length === 0 ? "No words yet." : "No results found."}
            </p>
            {words.length === 0 && (
              <Link
                href="/add"
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--primary)" }}
              >
                Add Your First Word
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((word) => {
              const isExpanded = expandedId === word.id;
              const isDue = word.nextReview <= new Date().toISOString();
              const accuracy = word.reviewCount > 0
                ? Math.round((word.correctCount / word.reviewCount) * 100)
                : null;

              return (
                <div
                  key={word.id}
                  className="rounded-2xl overflow-hidden transition-all duration-200"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {/* Main row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : word.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{word.word}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${getSrsColor(word.srsLevel)}`}>
                          {getSrsLabel(word.srsLevel)}
                        </span>
                        {isDue && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                            Due
                          </span>
                        )}
                      </div>
                      {word.phonetic && (
                        <span className="text-xs" style={{ color: "var(--accent)" }}>{word.phonetic}</span>
                      )}
                      {!isExpanded && (
                        <p className="text-sm mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                          {word.meaning}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); speakWord(word.word); }}
                        className="p-2 rounded-full"
                        style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
                      >
                        🔊
                      </button>
                      <span style={{ color: "var(--muted)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                        ›
                      </span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 slide-up" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="pt-3 space-y-2">
                        <p className="text-sm text-white">{word.meaning}</p>
                        {word.translation && (
                          <p className="text-sm" style={{ color: "#a78bfa" }}>{word.translation}</p>
                        )}
                        {word.example && (
                          <p className="text-sm italic" style={{ color: "var(--muted)" }}>
                            "{word.example}"
                          </p>
                        )}
                        {word.tags && word.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {word.tags.map((t) => (
                              <span
                                key={t}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "var(--border)", color: "var(--muted)" }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3 text-xs pt-1" style={{ color: "var(--muted)" }}>
                          <span>Reviews: {word.reviewCount}</span>
                          {accuracy !== null && <span>Accuracy: {accuracy}%</span>}
                          <span>Level: {word.srsLevel}</span>
                        </div>

                        {/* Delete */}
                        {deleteConfirm === word.id ? (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleDelete(word.id)}
                              className="flex-1 py-2 rounded-xl text-sm font-semibold"
                              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid #ef4444", color: "#ef4444" }}
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="flex-1 py-2 rounded-xl text-sm font-semibold"
                              style={{ background: "var(--border)", color: "var(--muted)" }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(word.id)}
                            className="mt-2 text-xs px-3 py-1.5 rounded-lg"
                            style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}
                          >
                            Delete word
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
