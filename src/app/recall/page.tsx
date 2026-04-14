"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { getAllWords, updateWord } from "@/lib/db";
import { calculateNextReview } from "@/lib/srs";
import { useGameStore } from "@/store/gameStore";
import { VocabWord, Achievement } from "@/lib/types";
import { speakWord } from "@/lib/audio";
import AchievementToast from "@/components/AchievementToast";
import BottomNav from "@/components/BottomNav";

type Phase = "loading" | "input" | "result" | "done";

export default function RecallPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [userInput, setUserInput] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addXP, recordReview, checkStreak, incrementDailyProgress } = useGameStore();

  useEffect(() => { buildSession(); }, []);

  async function buildSession() {
    setPhase("loading");
    const all = await getAllWords();
    if (all.length === 0) {
      setPhase("done");
      return;
    }
    const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, Math.min(10, all.length));
    setWords(shuffled);
    setIndex(0);
    setPhase("input");
    setSessionCorrect(0);
    setEarnedXP(0);
    setUserInput("");
    setHintsRevealed(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const current = words[index];

  function getHintDisplay(word: string, revealed: number): string {
    if (revealed === 0) return "";
    return word.slice(0, revealed) + "·".repeat(Math.max(0, word.length - revealed));
  }

  function handleHint() {
    if (!current) return;
    setHintsRevealed((prev) => Math.min(prev + 1, Math.floor(current.word.length / 2) + 1));
  }

  const handleSubmit = useCallback(async () => {
    if (!current || phase !== "input" || !userInput.trim()) return;

    const correct = userInput.trim().toLowerCase() === current.word.toLowerCase();
    setIsCorrect(correct);
    setPhase("result");
    speakWord(current.word);

    const xp = correct ? (hintsRevealed > 0 ? 10 : 20) : 2;

    const updates = calculateNextReview(current, correct ? 4 : 1);
    await updateWord({
      ...current,
      ...updates,
      reviewCount: current.reviewCount + 1,
      correctCount: current.correctCount + (correct ? 1 : 0),
    });

    checkStreak();
    incrementDailyProgress();
    const newAchievements = addXP(xp);
    recordReview(correct);

    setEarnedXP((prev) => prev + xp);
    if (correct) setSessionCorrect((prev) => prev + 1);
    if (newAchievements.length > 0) setPendingAchievement(newAchievements[0]);
  }, [current, phase, userInput, hintsRevealed, addXP, recordReview, checkStreak, incrementDailyProgress]);

  async function handleSkip() {
    if (!current || phase !== "input") return;
    setIsCorrect(false);
    setPhase("result");
    speakWord(current.word);

    const updates = calculateNextReview(current, 1);
    await updateWord({
      ...current,
      ...updates,
      reviewCount: current.reviewCount + 1,
    });

    checkStreak();
    incrementDailyProgress();
    addXP(2);
    recordReview(false);
    setEarnedXP((prev) => prev + 2);
  }

  function handleNext() {
    if (index + 1 < words.length) {
      setIndex((i) => i + 1);
      setPhase("input");
      setUserInput("");
      setHintsRevealed(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setPhase("done");
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === "input" && e.key === "Enter") handleSubmit();
      if (phase === "result" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleSubmit]);

  if (phase === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-4xl float">🧠</div>
      </div>
    );
  }

  if (phase === "done") {
    const total = words.length;
    const acc = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-28" style={{ background: "var(--bg)" }}>
        <div className="text-center bounce-in w-full max-w-sm">
          <div className="text-7xl mb-4">
            {total === 0 ? "📭" : acc >= 80 ? "🧠" : acc >= 60 ? "⚡" : "💪"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {total === 0 ? "No words yet!" : "Recall Complete!"}
          </h2>
          <p className="mb-6" style={{ color: "var(--muted)" }}>
            {total === 0
              ? "Add some words to start practicing."
              : `${sessionCorrect}/${total} recalled correctly`}
          </p>

          {total > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-3xl font-bold text-white">{acc}%</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Accuracy</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-3xl font-bold" style={{ color: "var(--gold)" }}>+{earnedXP}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>XP Earned</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {total === 0 ? (
              <Link
                href="/add"
                className="block w-full py-3 rounded-xl font-semibold text-center text-white"
                style={{ background: "var(--primary)" }}
              >
                Add Words
              </Link>
            ) : (
              <button
                onClick={buildSession}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                Practice Again
              </button>
            )}
            <Link
              href="/"
              className="block w-full py-3 rounded-xl font-semibold text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              Back to Home
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const progress = (index / words.length) * 100;
  const hintDisplay = current ? getHintDisplay(current.word, hintsRevealed) : "";
  const earnedIfCorrect = hintsRevealed > 0 ? 10 : 20;
  const maxHints = current ? Math.floor(current.word.length / 2) + 1 : 0;

  return (
    <div className="min-h-dvh flex flex-col pb-28" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-safe pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="p-2 rounded-xl" style={{ color: "var(--muted)" }}>
            ← Back
          </Link>
          <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            {index + 1} / {words.length}
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--gold)" }}>
            +{earnedXP} XP
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #10b981, #06b6d4)" }}
          />
        </div>
      </div>

      {/* Content */}
      {current && (
        <div className="flex-1 flex flex-col px-4 py-4 gap-4">
          {/* Clue card */}
          <div
            className={`rounded-3xl p-6 transition-all duration-300 ${
              phase === "result" ? (isCorrect ? "correct-pulse" : "wrong-pulse") : ""
            }`}
            style={{
              background:
                phase === "result"
                  ? isCorrect
                    ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))"
                    : "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))"
                  : "linear-gradient(135deg, var(--surface), var(--surface2))",
              border:
                phase === "result"
                  ? isCorrect
                    ? "1px solid rgba(16,185,129,0.4)"
                    : "1px solid rgba(239,68,68,0.4)"
                  : "1px solid var(--border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <p className="text-xs mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Type the word that means:
            </p>
            <p className="text-lg font-semibold text-white leading-snug mb-2">{current.meaning}</p>
            {current.translation && (
              <p className="text-sm" style={{ color: "#a78bfa" }}>{current.translation}</p>
            )}
            {current.example && phase === "input" && hintsRevealed > 0 && (
              <p className="text-sm italic mt-2" style={{ color: "var(--muted)" }}>
                "{current.example.replace(new RegExp(current.word, "gi"), "___")}"
              </p>
            )}

            {/* Hint letters */}
            {hintDisplay && phase === "input" && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>Hint:</p>
                <p className="text-2xl font-mono font-bold tracking-widest" style={{ color: "#f59e0b" }}>
                  {hintDisplay}
                </p>
              </div>
            )}

            {/* Result reveal */}
            {phase === "result" && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                {isCorrect ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <p className="font-semibold" style={{ color: "#10b981" }}>
                      Correct! +{earnedIfCorrect} XP
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>The answer was:</p>
                    <p className="text-2xl font-bold text-white">{current.word}</p>
                    {current.phonetic && (
                      <p className="text-sm mt-0.5" style={{ color: "var(--accent)" }}>{current.phonetic}</p>
                    )}
                    {userInput.trim() && (
                      <p className="text-sm mt-1" style={{ color: "#ef4444" }}>
                        You typed: "{userInput.trim()}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input area */}
          {phase === "input" ? (
            <div className="flex flex-col gap-3">
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type the word..."
                  className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-slate-500 font-medium"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                {userInput && (
                  <button onClick={() => setUserInput("")} style={{ color: "var(--muted)" }}>✕</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleHint}
                  disabled={hintsRevealed >= maxHints}
                  className="py-3 rounded-xl font-semibold text-sm"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    color: hintsRevealed >= maxHints ? "var(--muted)" : "#f59e0b",
                    opacity: hintsRevealed >= maxHints ? 0.4 : 1,
                  }}
                >
                  💡 Hint {hintsRevealed > 0 ? `(${hintsRevealed})` : "(-XP)"}
                </button>
                <button
                  onClick={handleSkip}
                  className="py-3 rounded-xl font-semibold text-sm"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  Skip →
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all"
                style={{
                  background: userInput.trim()
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "var(--border)",
                  opacity: userInput.trim() ? 1 : 0.5,
                }}
              >
                Check Answer
              </button>

              <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
                Enter to check · Hints reduce XP to 10
              </p>
            </div>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-base"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {index + 1 < words.length ? "Next →" : "See Results"}
            </button>
          )}
        </div>
      )}

      <AchievementToast achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />
      <BottomNav />
    </div>
  );
}
