"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { addWord, addWords } from "@/lib/db";
import { VocabWord } from "@/lib/types";
import BottomNav from "@/components/BottomNav";
import { speakWord } from "@/lib/audio";

const AI_PROMPT = `Please format the following vocabulary words into a JSON array. Each word should have this exact structure:

[
  {
    "word": "example",
    "phonetic": "/ɪɡˈzæm.pəl/",
    "meaning": "a thing characteristic of its kind or illustrating a general rule",
    "translation": "ví dụ",
    "example": "This painting is a fine example of his early work.",
    "tags": ["noun", "intermediate"]
  }
]

Rules:
- "phonetic": IPA pronunciation (leave empty string "" if unsure)
- "meaning": definition in English
- "translation": Vietnamese translation
- "example": a natural example sentence using the word
- "tags": array of relevant tags like part of speech (noun/verb/adjective/adverb) and level (beginner/intermediate/advanced)

Here are my words:
[PASTE YOUR WORDS HERE]`;

function makeNewWord(): VocabWord {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    word: "",
    phonetic: "",
    meaning: "",
    translation: "",
    example: "",
    tags: [],
    srsLevel: 0,
    easeFactor: 2.5,
    interval: 1,
    nextReview: now,
    createdAt: now,
    reviewCount: 0,
    correctCount: 0,
  };
}

type Tab = "single" | "bulk";

export default function AddPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("single");

  // Single word form
  const [form, setForm] = useState<Omit<VocabWord, "id" | "srsLevel" | "easeFactor" | "interval" | "nextReview" | "createdAt" | "reviewCount" | "correctCount">>({
    word: "",
    phonetic: "",
    meaning: "",
    translation: "",
    example: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState("");

  // Bulk import
  const [jsonInput, setJsonInput] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState(0);
  const [copied, setCopied] = useState(false);

  function handleFormChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSingleError("");
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !form.tags?.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...(prev.tags ?? []), t] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags?.filter((t) => t !== tag) }));
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.word.trim()) { setSingleError("Word is required"); return; }
    if (!form.meaning.trim()) { setSingleError("Meaning is required"); return; }

    setSingleLoading(true);
    const now = new Date().toISOString();
    const word: VocabWord = {
      ...form,
      id: uuidv4(),
      word: form.word.trim(),
      srsLevel: 0,
      easeFactor: 2.5,
      interval: 1,
      nextReview: now,
      createdAt: now,
      reviewCount: 0,
      correctCount: 0,
    };

    await addWord(word);
    setSingleLoading(false);
    router.push("/vocabulary");
  }

  async function handleBulkImport() {
    setBulkError("");
    setBulkSuccess(0);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput.trim());
    } catch {
      setBulkError("Invalid JSON. Please check the format.");
      return;
    }

    if (!Array.isArray(parsed)) {
      setBulkError("Expected a JSON array [ ... ]");
      return;
    }

    const now = new Date().toISOString();
    const words: VocabWord[] = [];

    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const obj = item as Record<string, unknown>;
      if (typeof obj.word !== "string" || !obj.word.trim()) continue;
      if (typeof obj.meaning !== "string" || !obj.meaning.trim()) continue;

      words.push({
        id: uuidv4(),
        word: String(obj.word).trim(),
        phonetic: typeof obj.phonetic === "string" ? obj.phonetic : "",
        meaning: String(obj.meaning).trim(),
        translation: typeof obj.translation === "string" ? obj.translation : "",
        example: typeof obj.example === "string" ? obj.example : "",
        tags: Array.isArray(obj.tags)
          ? obj.tags.filter((t): t is string => typeof t === "string")
          : [],
        srsLevel: 0,
        easeFactor: 2.5,
        interval: 1,
        nextReview: now,
        createdAt: now,
        reviewCount: 0,
        correctCount: 0,
      });
    }

    if (words.length === 0) {
      setBulkError("No valid words found. Check that each item has 'word' and 'meaning'.");
      return;
    }

    setBulkLoading(true);
    await addWords(words);
    setBulkLoading(false);
    setBulkSuccess(words.length);
    setJsonInput("");

    setTimeout(() => router.push("/vocabulary"), 1500);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-dvh pb-28" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-safe pt-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} style={{ color: "var(--muted)" }}>← Back</button>
          <h1 className="text-xl font-bold text-white">Add Words</h1>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden p-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <button
            onClick={() => setTab("single")}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === "single" ? "var(--primary)" : "transparent",
              color: tab === "single" ? "white" : "var(--muted)",
            }}
          >
            Single Word
          </button>
          <button
            onClick={() => setTab("bulk")}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === "bulk" ? "var(--primary)" : "transparent",
              color: tab === "bulk" ? "white" : "var(--muted)",
            }}
          >
            Bulk Import (AI)
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* Single Word Form */}
        {tab === "single" && (
          <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
            {/* Word */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted)" }}>
                Word *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ephemeral"
                  value={form.word}
                  onChange={(e) => handleFormChange("word", e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-white outline-none text-base"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                />
                {form.word && (
                  <button
                    type="button"
                    onClick={() => speakWord(form.word)}
                    className="px-3 rounded-xl"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    🔊
                  </button>
                )}
              </div>
            </div>

            {/* Phonetic */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted)" }}>
                Phonetic (IPA)
              </label>
              <input
                type="text"
                placeholder="e.g. /ɪˈfem.ər.əl/"
                value={form.phonetic}
                onChange={(e) => handleFormChange("phonetic", e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              />
            </div>

            {/* Meaning */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted)" }}>
                Meaning (English) *
              </label>
              <input
                type="text"
                placeholder="e.g. lasting for a very short time"
                value={form.meaning}
                onChange={(e) => handleFormChange("meaning", e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              />
            </div>

            {/* Translation */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted)" }}>
                Translation (Vietnamese)
              </label>
              <input
                type="text"
                placeholder="e.g. thoáng qua, ngắn ngủi"
                value={form.translation}
                onChange={(e) => handleFormChange("translation", e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              />
            </div>

            {/* Example */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted)" }}>
                Example Sentence
              </label>
              <textarea
                placeholder="e.g. The ephemeral beauty of cherry blossoms..."
                value={form.example}
                onChange={(e) => handleFormChange("example", e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-white outline-none resize-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted)" }}>
                Tags
              </label>
              <div className="flex gap-2 flex-wrap mb-2">
                {form.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: "var(--primary)", color: "white" }}
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 opacity-70">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add tag... (e.g. noun, advanced)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                    if (e.key === ",") { e.preventDefault(); addTag(tagInput); }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white outline-none text-sm"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
                >
                  Add
                </button>
              </div>
              {/* Quick tags */}
              <div className="flex gap-1.5 flex-wrap mt-2">
                {["noun", "verb", "adjective", "adverb", "beginner", "intermediate", "advanced"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    disabled={form.tags?.includes(t)}
                    className="text-xs px-2 py-1 rounded-full transition-opacity"
                    style={{
                      background: "var(--border)",
                      color: form.tags?.includes(t) ? "var(--muted)" : "var(--text)",
                      opacity: form.tags?.includes(t) ? 0.4 : 1,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {singleError && (
              <p className="text-sm" style={{ color: "#ef4444" }}>{singleError}</p>
            )}

            <button
              type="submit"
              disabled={singleLoading}
              className="w-full py-4 rounded-xl font-bold text-white text-base"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                opacity: singleLoading ? 0.7 : 1,
              }}
            >
              {singleLoading ? "Saving..." : "Save Word"}
            </button>
          </form>
        )}

        {/* Bulk Import */}
        {tab === "bulk" && (
          <div className="flex flex-col gap-4">
            {/* AI Prompt Box */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-white">Use AI to Format</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Copy this prompt and paste into ChatGPT / Claude
                  </p>
                </div>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: copied ? "rgba(16,185,129,0.2)" : "var(--primary)",
                    color: copied ? "#10b981" : "white",
                    border: copied ? "1px solid #10b981" : "none",
                  }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Prompt"}
                </button>
              </div>
              <div
                className="rounded-xl p-3 font-mono text-xs leading-relaxed overflow-hidden"
                style={{ background: "rgba(0,0,0,0.3)", color: "#94a3b8", maxHeight: 120 }}
              >
                {AI_PROMPT.split("\n").slice(0, 6).join("\n")}
                <span style={{ color: "var(--muted)" }}>...</span>
              </div>
            </div>

            {/* Steps */}
            <div
              className="rounded-2xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>How it works</p>
              <ol className="space-y-1.5">
                {[
                  "Copy the AI prompt above",
                  'Go to ChatGPT or Claude, paste and add your words',
                  "Copy the JSON output",
                  "Paste it in the box below",
                  "Click Import!",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text)" }}>
                    <span
                      className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                      style={{ background: "var(--primary)", color: "white" }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* JSON Input */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--muted)" }}>
                Paste JSON here
              </label>
              <textarea
                placeholder={`[\n  {\n    "word": "example",\n    "meaning": "a representative sample",\n    ...\n  }\n]`}
                value={jsonInput}
                onChange={(e) => { setJsonInput(e.target.value); setBulkError(""); setBulkSuccess(0); }}
                rows={8}
                className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none resize-none"
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${bulkError ? "#ef4444" : "var(--border)"}`,
                  color: "var(--text)",
                }}
              />
              {bulkError && (
                <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{bulkError}</p>
              )}
              {bulkSuccess > 0 && (
                <p className="mt-1 text-xs" style={{ color: "#10b981" }}>
                  ✓ Successfully imported {bulkSuccess} words! Redirecting...
                </p>
              )}
            </div>

            <button
              onClick={handleBulkImport}
              disabled={bulkLoading || !jsonInput.trim()}
              className="w-full py-4 rounded-xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #06b6d4, #0284c7)",
                opacity: bulkLoading || !jsonInput.trim() ? 0.5 : 1,
              }}
            >
              {bulkLoading ? "Importing..." : "Import Words"}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
