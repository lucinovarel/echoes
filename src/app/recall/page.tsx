"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { getDueWords, updateWord } from "@/lib/db";
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
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addXP, recordReview, checkStreak, incrementDailyProgress } = useGameStore();

  useEffect(() => { buildSession(); }, []);

  async function buildSession() {
    setPhase("loading");
    const all = await getDueWords();
    if (all.length === 0) {
      setAllCaughtUp(true);
      setPhase("done");
      return;
    }
    setAllCaughtUp(false);
    const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, Math.min(20, all.length));
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
            {allCaughtUp ? "✅" : acc >= 80 ? "🧠" : acc >= 60 ? "⚡" : "💪"}
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: "var(--text)" }}>
            {allCaughtUp ? "All caught up!" : "Recall Complete!"}
          </h2>
          <p className="mb-6 font-medium" style={{ color: "var(--muted)" }}>
            {allCaughtUp
              ? "No words due right now. Come back later."
              : `${sessionCorrect}/${total} recalled correctly`}
          </p>

          {total > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { val: `${acc}%`, label: "Accuracy", color: "var(--text)" },
                { val: `+${earnedXP}`, label: "XP Earned", color: "var(--gold)" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="p-4"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--border)",
                    boxShadow: "3px 3px 0 var(--border)",
                    borderRadius: "4px",
                    transform: i === 1 ? "rotate(0.5deg)" : "rotate(-0.3deg)",
                  }}
                >
                  <div className="text-3xl font-black" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {!allCaughtUp && (
              <button
                onClick={buildSession}
                className="w-full py-3 font-black uppercase tracking-wider"
                style={{
                  background: "var(--green)",
                  border: "2px solid var(--border)",
                  boxShadow: "4px 4px 0 var(--border)",
                  borderRadius: "4px",
                  color: "#f8f3ea",
                }}
              >
                Practice Again
              </button>
            )}
            <Link
              href="/"
              className="block w-full py-3 font-bold uppercase tracking-wider text-center"
              style={{
                background: "var(--surface2)",
                border: "2px solid var(--border)",
                boxShadow: "3px 3px 0 var(--border)",
                borderRadius: "4px",
                color: "var(--muted)",
              }}
            >
              ← Back to Home
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
          <Link
            href="/"
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
          </Link>
          <div className="text-sm font-black" style={{ color: "var(--text)" }}>
            {index + 1} / {words.length}
          </div>
          <div
            className="px-3 py-1.5 text-sm font-black"
            style={{
              background: "var(--gold)",
              border: "2px solid var(--border)",
              boxShadow: "2px 2px 0 var(--border)",
              borderRadius: "4px",
              color: "var(--text)",
            }}
          >
            +{earnedXP} XP
          </div>
        </div>
        <div className="h-3 overflow-hidden" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "var(--green)" }}
          />
        </div>
      </div>

      {/* Content */}
      {current && (
        <div className="flex-1 flex flex-col px-4 py-4 gap-4">
          {/* Clue card */}
          <div
            className={`p-6 transition-all duration-300 ${
              phase === "result" ? (isCorrect ? "correct-pulse" : "wrong-pulse") : ""
            }`}
            style={{
              background: phase === "result"
                ? isCorrect ? "var(--green)" : "var(--primary)"
                : "var(--surface)",
              border: "2px solid var(--border)",
              boxShadow: "5px 5px 0 var(--border)",
              borderRadius: "4px",
            }}
          >
            <p className="text-xs font-black mb-3 uppercase tracking-widest" style={{ color: phase === "result" ? "rgba(248,243,234,0.6)" : "var(--muted)" }}>
              Type the word that means:
            </p>
            <p
              className="text-lg font-bold leading-snug mb-2"
              style={{ color: phase === "result" ? "#f8f3ea" : "var(--text)" }}
            >
              {current.meaning}
            </p>
            {current.translation && (
              <p className="text-sm font-medium" style={{ color: phase === "result" ? "rgba(248,243,234,0.75)" : "var(--gold)" }}>
                {current.translation}
              </p>
            )}
            {current.example && phase === "input" && hintsRevealed > 0 && (
              <p className="text-sm italic mt-2 font-medium" style={{ color: "var(--muted)" }}>
                "{current.example.replace(new RegExp(current.word, "gi"), "___")}"
              </p>
            )}

            {hintDisplay && phase === "input" && (
              <div className="mt-3 pt-3" style={{ borderTop: "1.5px solid var(--border)" }}>
                <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Hint:</p>
                <p className="text-2xl font-black tracking-widest" style={{ color: "var(--gold)" }}>
                  {hintDisplay}
                </p>
              </div>
            )}

            {phase === "result" && (
              <div className="mt-3 pt-3" style={{ borderTop: "1.5px solid rgba(248,243,234,0.3)" }}>
                {isCorrect ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <p className="font-black uppercase tracking-wide" style={{ color: "#f8f3ea" }}>
                      Correct! +{earnedIfCorrect} XP
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: "rgba(248,243,234,0.6)" }}>
                      The answer was:
                    </p>
                    <p className="text-2xl font-black uppercase" style={{ color: "#f8f3ea", letterSpacing: "-0.02em" }}>
                      {current.word}
                    </p>
                    {current.phonetic && (
                      <p className="text-sm mt-0.5 font-medium" style={{ color: "rgba(248,243,234,0.6)" }}>{current.phonetic}</p>
                    )}
                    {userInput.trim() && (
                      <p className="text-sm mt-1 font-medium" style={{ color: "rgba(248,243,234,0.75)" }}>
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
                className="flex items-center gap-2 px-4 py-3"
                style={{
                  background: "var(--surface)",
                  border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)",
                  borderRadius: "4px",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type the word..."
                  className="flex-1 bg-transparent text-lg outline-none font-bold"
                  style={{
                    color: "var(--text)",
                  }}
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
                  className="py-3 font-black text-sm uppercase tracking-wider"
                  style={{
                    background: hintsRevealed >= maxHints ? "var(--surface2)" : "var(--gold)",
                    border: "2px solid var(--border)",
                    boxShadow: hintsRevealed >= maxHints ? "none" : "3px 3px 0 var(--border)",
                    borderRadius: "4px",
                    color: hintsRevealed >= maxHints ? "var(--muted)" : "var(--text)",
                    opacity: hintsRevealed >= maxHints ? 0.5 : 1,
                  }}
                >
                  💡 Hint {hintsRevealed > 0 ? `(${hintsRevealed})` : "(-XP)"}
                </button>
                <button
                  onClick={handleSkip}
                  className="py-3 font-bold text-sm uppercase tracking-wider"
                  style={{
                    background: "var(--surface2)",
                    border: "2px solid var(--border)",
                    boxShadow: "3px 3px 0 var(--border)",
                    borderRadius: "4px",
                    color: "var(--muted)",
                  }}
                >
                  Skip →
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="w-full py-3.5 font-black uppercase tracking-wider text-base transition-all"
                style={{
                  background: userInput.trim() ? "var(--green)" : "var(--surface2)",
                  border: "2px solid var(--border)",
                  boxShadow: userInput.trim() ? "4px 4px 0 var(--border)" : "none",
                  borderRadius: "4px",
                  color: userInput.trim() ? "#f8f3ea" : "var(--muted)",
                  opacity: userInput.trim() ? 1 : 0.5,
                }}
              >
                Check Answer
              </button>

              <p className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Enter to check · Hints reduce XP to 10
              </p>
            </div>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3.5 font-black uppercase tracking-wider text-base"
              style={{
                background: "var(--green)",
                border: "2px solid var(--border)",
                boxShadow: "4px 4px 0 var(--border)",
                borderRadius: "4px",
                color: "#f8f3ea",
              }}
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
