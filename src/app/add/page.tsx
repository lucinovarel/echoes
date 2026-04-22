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

type Tab = "single" | "bulk";

const inputStyle = {
  background: "var(--surface)",
  border: "2px solid var(--border)",
  boxShadow: "2px 2px 0 var(--border)",
  borderRadius: "4px",
  color: "var(--text)",
};

export default function AddPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("single");

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
      <div className="px-4 pt-safe pt-4 pb-4" style={{ borderBottom: "2px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 font-bold text-sm uppercase tracking-wider"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--border)",
              boxShadow: "2px 2px 0 var(--border)",
              borderRadius: "4px",
              color: "var(--muted)",
            }}
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: "var(--text)" }}>
            Add Words
          </h1>
        </div>

        {/* Tabs */}
        <div
          className="flex p-1 gap-1"
          style={{
            background: "var(--surface2)",
            border: "2px solid var(--border)",
            borderRadius: "4px",
          }}
        >
          {(["single", "bulk"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-sm font-black uppercase tracking-wider transition-all"
              style={{
                background: tab === t ? "var(--border)" : "transparent",
                color: tab === t ? "#f8f3ea" : "var(--muted)",
                borderRadius: "2px",
              }}
            >
              {t === "single" ? "Single Word" : "Bulk Import (AI)"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Single Word Form */}
        {tab === "single" && (
          <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
            {[
              { key: "word", label: "Word *", placeholder: "e.g. ephemeral", withAudio: true },
              { key: "phonetic", label: "Phonetic (IPA)", placeholder: "e.g. /ɪˈfem.ər.əl/", withAudio: false },
              { key: "meaning", label: "Meaning (English) *", placeholder: "e.g. lasting for a very short time", withAudio: false },
              { key: "translation", label: "Translation (Vietnamese)", placeholder: "e.g. thoáng qua, ngắn ngủi", withAudio: false },
            ].map(({ key, label, placeholder, withAudio }) => (
              <div key={key}>
                <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: "var(--muted)" }}>
                  {label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => handleFormChange(key, e.target.value)}
                    className="flex-1 px-4 py-3 outline-none text-base font-medium"
                    style={inputStyle}
                  />
                  {withAudio && form.word && (
                    <button
                      type="button"
                      onClick={() => speakWord(form.word)}
                      className="px-3 font-bold"
                      style={{
                        background: "var(--accent)",
                        border: "2px solid var(--border)",
                        boxShadow: "2px 2px 0 var(--border)",
                        borderRadius: "4px",
                        color: "#f8f3ea",
                      }}
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Example */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: "var(--muted)" }}>
                Example Sentence
              </label>
              <textarea
                placeholder="e.g. The ephemeral beauty of cherry blossoms..."
                value={form.example}
                onChange={(e) => handleFormChange("example", e.target.value)}
                rows={2}
                className="w-full px-4 py-3 outline-none resize-none font-medium"
                style={inputStyle}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: "var(--muted)" }}>
                Tags
              </label>
              <div className="flex gap-2 flex-wrap mb-2">
                {form.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-black uppercase tracking-wider"
                    style={{
                      background: "var(--primary)",
                      color: "#f8f3ea",
                      border: "1.5px solid var(--border)",
                      borderRadius: "4px",
                    }}
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
                  className="flex-1 px-4 py-2.5 outline-none text-sm font-medium"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="px-4 py-2.5 text-sm font-black uppercase tracking-wider"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--border)",
                    boxShadow: "2px 2px 0 var(--border)",
                    borderRadius: "4px",
                    color: "var(--text)",
                  }}
                >
                  Add
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {["noun", "verb", "adjective", "adverb", "beginner", "intermediate", "advanced"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    disabled={form.tags?.includes(t)}
                    className="text-xs px-2 py-1 font-bold uppercase tracking-wider transition-opacity stamp"
                    style={{
                      color: form.tags?.includes(t) ? "var(--muted)" : "var(--text)",
                      borderColor: form.tags?.includes(t) ? "var(--muted)" : "var(--text)",
                      opacity: form.tags?.includes(t) ? 0.4 : 1,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {singleError && (
              <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>{singleError}</p>
            )}

            <button
              type="submit"
              disabled={singleLoading}
              className="w-full py-4 font-black uppercase tracking-wider text-base"
              style={{
                background: "var(--primary)",
                border: "2px solid var(--border)",
                boxShadow: "4px 4px 0 var(--border)",
                borderRadius: "4px",
                color: "#f8f3ea",
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
              className="p-4"
              style={{
                background: "var(--accent)",
                border: "2px solid var(--border)",
                boxShadow: "4px 4px 0 var(--border)",
                borderRadius: "4px",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide" style={{ color: "#f8f3ea" }}>Use AI to Format</p>
                  <p className="text-xs font-medium" style={{ color: "rgba(248,243,234,0.65)" }}>
                    Copy this prompt → paste into ChatGPT / Claude
                  </p>
                </div>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all"
                  style={{
                    background: copied ? "var(--green)" : "var(--gold)",
                    border: "2px solid var(--border)",
                    boxShadow: "2px 2px 0 var(--border)",
                    borderRadius: "4px",
                    color: copied ? "#f8f3ea" : "var(--text)",
                  }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Prompt"}
                </button>
              </div>
              <div
                className="p-3 font-mono text-xs leading-relaxed overflow-hidden"
                style={{
                  background: "rgba(26,16,8,0.4)",
                  color: "rgba(248,243,234,0.7)",
                  borderRadius: "4px",
                  maxHeight: 100,
                }}
              >
                {AI_PROMPT.split("\n").slice(0, 6).join("\n")}
                <span style={{ color: "rgba(248,243,234,0.4)" }}>...</span>
              </div>
            </div>

            {/* Steps */}
            <div
              className="p-4"
              style={{
                background: "var(--surface)",
                border: "2px solid var(--border)",
                boxShadow: "3px 3px 0 var(--border)",
                borderRadius: "4px",
              }}
            >
              <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>How it works</p>
              <ol className="space-y-2">
                {[
                  "Copy the AI prompt above",
                  "Go to ChatGPT or Claude, paste and add your words",
                  "Copy the JSON output",
                  "Paste it in the box below",
                  "Click Import!",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium" style={{ color: "var(--text)" }}>
                    <span
                      className="shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-black mt-0.5"
                      style={{
                        background: "var(--primary)",
                        color: "#f8f3ea",
                        border: "1.5px solid var(--border)",
                        borderRadius: "2px",
                      }}
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
              <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: "var(--muted)" }}>
                Paste JSON here
              </label>
              <textarea
                placeholder={`[\n  {\n    "word": "example",\n    "meaning": "a representative sample",\n    ...\n  }\n]`}
                value={jsonInput}
                onChange={(e) => { setJsonInput(e.target.value); setBulkError(""); setBulkSuccess(0); }}
                rows={8}
                className="w-full px-4 py-3 text-sm font-mono outline-none resize-none"
                style={{
                  ...inputStyle,
                  border: `2px solid ${bulkError ? "var(--primary)" : "var(--border)"}`,
                }}
              />
              {bulkError && (
                <p className="mt-1 text-xs font-bold" style={{ color: "var(--primary)" }}>{bulkError}</p>
              )}
              {bulkSuccess > 0 && (
                <p className="mt-1 text-xs font-bold" style={{ color: "var(--green)" }}>
                  ✓ Successfully imported {bulkSuccess} words! Redirecting...
                </p>
              )}
            </div>

            <button
              onClick={handleBulkImport}
              disabled={bulkLoading || !jsonInput.trim()}
              className="w-full py-4 font-black uppercase tracking-wider"
              style={{
                background: "var(--accent)",
                border: "2px solid var(--border)",
                boxShadow: "4px 4px 0 var(--border)",
                borderRadius: "4px",
                color: "#f8f3ea",
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
