"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllWords, deleteWord, addWords } from "@/lib/db";
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
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const all = await getAllWords();
    setWords(all.sort((a, b) => a.word.localeCompare(b.word)));
    setLoading(false);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items: unknown[] = Array.isArray(parsed) ? parsed : [];
      if (items.length === 0) throw new Error("File trống hoặc không hợp lệ");

      const now = new Date().toISOString();
      const imported = items
        .filter((item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).word === "string"
        )
        .map((item) => ({
          id: crypto.randomUUID(),
          word: item.word as string,
          phonetic: (item.phonetic as string | undefined) ?? undefined,
          meaning: (item.meaning as string | undefined) ?? "",
          translation: (item.translation as string | undefined) ?? undefined,
          example: (item.example as string | undefined) ?? undefined,
          tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
          srsLevel: 0,
          easeFactor: 2.5,
          interval: 1,
          nextReview: now,
          createdAt: now,
          reviewCount: 0,
          correctCount: 0,
        }));

      if (imported.length === 0) throw new Error("Không tìm thấy từ hợp lệ trong file");

      await addWords(imported);
      await load();
      setImportStatus({ type: "success", msg: `Đã import ${imported.length} từ thành công!` });
    } catch (err) {
      setImportStatus({ type: "error", msg: err instanceof Error ? err.message : "Lỗi không xác định" });
    }
    setTimeout(() => setImportStatus(null), 3000);
  }

  function handleExport() {
    const data = JSON.stringify(
      words.map(({ word, phonetic, meaning, translation, example, tags }) => ({
        word, phonetic, meaning, translation, example, tags,
      })),
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echoes-vocab-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      {/* Import toast */}
      {importStatus && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 text-sm font-bold uppercase tracking-wider"
          style={{
            background: importStatus.type === "success" ? "var(--green)" : "var(--primary)",
            border: "2px solid var(--border)",
            boxShadow: "3px 3px 0 var(--border)",
            borderRadius: "4px",
            color: "#f8f3ea",
          }}
        >
          {importStatus.msg}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-safe pt-4 pb-3" style={{ background: "var(--bg)", borderBottom: "2px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: "var(--text)" }}>
            My Words
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              {words.length} words
            </span>
            <label
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--border)",
                boxShadow: "2px 2px 0 var(--border)",
                borderRadius: "4px",
                color: "var(--text)",
              }}
            >
              Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black uppercase tracking-wider"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--border)",
                boxShadow: "2px 2px 0 var(--border)",
                borderRadius: "4px",
                color: "var(--text)",
              }}
            >
              Export
            </button>
            <Link
              href="/add"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black uppercase tracking-wider"
              style={{
                background: "var(--primary)",
                border: "2px solid var(--border)",
                boxShadow: "2px 2px 0 var(--border)",
                borderRadius: "4px",
                color: "#f8f3ea",
              }}
            >
              + Add
            </Link>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 mb-2"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            boxShadow: "2px 2px 0 var(--border)",
            borderRadius: "4px",
          }}
        >
          <span style={{ color: "var(--muted)" }}>🔍</span>
          <input
            type="text"
            placeholder="Search words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none font-medium"
            style={{ color: "var(--text)" }}
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
              className="shrink-0 px-3 py-1 text-xs font-black uppercase tracking-wider transition-all"
              style={{
                background: !selectedTag ? "var(--border)" : "var(--surface)",
                color: !selectedTag ? "#f8f3ea" : "var(--muted)",
                border: "2px solid var(--border)",
                borderRadius: "4px",
              }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className="shrink-0 px-3 py-1 text-xs font-black uppercase tracking-wider transition-all"
                style={{
                  background: selectedTag === tag ? "var(--accent)" : "var(--surface)",
                  color: selectedTag === tag ? "#f8f3ea" : "var(--muted)",
                  border: "2px solid var(--border)",
                  borderRadius: "4px",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Word List */}
      <div className="px-4 pt-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              {words.length === 0 ? "No words yet." : "No results found."}
            </p>
            {words.length === 0 && (
              <Link
                href="/add"
                className="mt-4 px-5 py-2.5 text-sm font-black uppercase tracking-wider"
                style={{
                  background: "var(--primary)",
                  border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)",
                  borderRadius: "4px",
                  color: "#f8f3ea",
                }}
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
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--border)",
                    boxShadow: "3px 3px 0 var(--border)",
                    borderRadius: "4px",
                  }}
                >
                  {/* Main row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : word.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black" style={{ color: "var(--text)" }}>{word.word}</span>
                        <span className={`stamp ${getSrsColor(word.srsLevel)}`}>
                          {getSrsLabel(word.srsLevel)}
                        </span>
                        {isDue && (
                          <span
                            className="stamp"
                            style={{ color: "var(--gold)", borderColor: "var(--gold)" }}
                          >
                            Due
                          </span>
                        )}
                      </div>
                      {word.phonetic && (
                        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{word.phonetic}</span>
                      )}
                      {!isExpanded && (
                        <p className="text-sm mt-0.5 truncate font-medium" style={{ color: "var(--muted)" }}>
                          {word.meaning}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); speakWord(word.word); }}
                        className="p-2 font-bold text-sm"
                        style={{
                          background: "var(--accent)",
                          border: "1.5px solid var(--border)",
                          borderRadius: "4px",
                          color: "#f8f3ea",
                        }}
                      >
                        🔊
                      </button>
                      <span
                        className="font-black text-xl"
                        style={{
                          color: "var(--muted)",
                          transform: isExpanded ? "rotate(90deg)" : "none",
                          transition: "transform 0.2s",
                          display: "inline-block",
                        }}
                      >
                        ›
                      </span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 slide-up"
                      style={{ borderTop: "2px solid var(--border)" }}
                    >
                      <div className="pt-3 space-y-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{word.meaning}</p>
                        {word.translation && (
                          <p className="text-sm font-medium" style={{ color: "var(--gold)" }}>{word.translation}</p>
                        )}
                        {word.example && (
                          <p className="text-sm italic font-medium" style={{ color: "var(--muted)" }}>
                            "{word.example}"
                          </p>
                        )}
                        {word.tags && word.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {word.tags.map((t) => (
                              <span
                                key={t}
                                className="stamp"
                                style={{ color: "var(--muted)", borderColor: "var(--muted)" }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3 text-xs font-bold uppercase tracking-wider pt-1" style={{ color: "var(--muted)" }}>
                          <span>Reviews: {word.reviewCount}</span>
                          {accuracy !== null && <span>Accuracy: {accuracy}%</span>}
                          <span>Level: {word.srsLevel}</span>
                        </div>

                        {/* Delete */}
                        {deleteConfirm === word.id ? (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleDelete(word.id)}
                              className="flex-1 py-2 text-sm font-black uppercase tracking-wider"
                              style={{
                                background: "var(--primary)",
                                border: "2px solid var(--border)",
                                boxShadow: "2px 2px 0 var(--border)",
                                borderRadius: "4px",
                                color: "#f8f3ea",
                              }}
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="flex-1 py-2 text-sm font-bold uppercase tracking-wider"
                              style={{
                                background: "var(--surface2)",
                                border: "2px solid var(--border)",
                                boxShadow: "2px 2px 0 var(--border)",
                                borderRadius: "4px",
                                color: "var(--muted)",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(word.id)}
                            className="mt-2 text-xs px-3 py-1.5 font-bold uppercase tracking-wider"
                            style={{
                              color: "var(--primary)",
                              background: "transparent",
                              border: "1.5px solid var(--primary)",
                              borderRadius: "4px",
                            }}
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
