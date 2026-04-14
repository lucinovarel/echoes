"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAllWords, getDueWords, updateWord } from "@/lib/db";
import { calculateNextReview, getXpForQuality, getSrsLabel, getSrsColor } from "@/lib/srs";
import { useGameStore } from "@/store/gameStore";
import { VocabWord, Achievement } from "@/lib/types";
import { speakWord } from "@/lib/audio";
import AchievementToast from "@/components/AchievementToast";
import BottomNav from "@/components/BottomNav";

type Phase = "loading" | "front" | "back" | "done";

export default function StudyPage() {
  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [flipped, setFlipped] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const [animClass, setAnimClass] = useState("");
  const [studyAll, setStudyAll] = useState(false);

  const { addXP, recordReview, checkStreak, incrementDailyProgress } = useGameStore();

  useEffect(() => {
    loadQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyAll]);

  async function loadQueue() {
    setPhase("loading");
    let words: VocabWord[];
    if (studyAll) {
      words = await getAllWords();
    } else {
      words = await getDueWords();
    }
    // Shuffle
    const shuffled = words.sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setIndex(0);
    setPhase(shuffled.length > 0 ? "front" : "done");
    setFlipped(false);
  }

  const currentWord = queue[index];

  const handleFlip = useCallback(() => {
    if (phase !== "front") return;
    setFlipped(true);
    setPhase("back");
    if (currentWord) speakWord(currentWord.word);
  }, [phase, currentWord]);

  const handleAudio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentWord) speakWord(currentWord.word);
  }, [currentWord]);

  async function handleGrade(quality: number) {
    if (!currentWord) return;

    const correct = quality >= 3;
    const xp = getXpForQuality(quality);

    // Update SRS
    const updates = calculateNextReview(currentWord, quality);
    const updated: VocabWord = {
      ...currentWord,
      ...updates,
      reviewCount: currentWord.reviewCount + 1,
      correctCount: currentWord.correctCount + (correct ? 1 : 0),
    };
    await updateWord(updated);

    // Update game state
    checkStreak();
    incrementDailyProgress();
    const newAchievements = addXP(xp);
    recordReview(correct);

    setEarnedXP((prev) => prev + xp);
    setSessionTotal((prev) => prev + 1);
    if (correct) setSessionCorrect((prev) => prev + 1);

    if (newAchievements.length > 0) {
      setPendingAchievement(newAchievements[0]);
    }

    // Animate and advance
    setAnimClass(correct ? "correct-pulse" : "wrong-pulse shake");
    setTimeout(() => {
      setAnimClass("");
      if (index + 1 < queue.length) {
        setIndex((i) => i + 1);
        setFlipped(false);
        setPhase("front");
      } else {
        setPhase("done");
      }
    }, 400);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        if (phase === "front") handleFlip();
      }
      if (phase === "back") {
        if (e.key === "1") handleGrade(1);
        if (e.key === "2") handleGrade(3);
        if (e.key === "3") handleGrade(5);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleFlip]);

  if (phase === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-4xl float">🃏</div>
      </div>
    );
  }

  if (phase === "done") {
    const acc = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-28" style={{ background: "var(--bg)" }}>
        <div className="text-center bounce-in">
          <div className="text-7xl mb-4">
            {acc >= 80 ? "🏆" : acc >= 60 ? "👍" : "💪"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
          <p style={{ color: "var(--muted)" }} className="mb-6">
            {sessionTotal === 0 ? "No cards were due." : `${sessionCorrect}/${sessionTotal} correct`}
          </p>

          {sessionTotal > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-xs">
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xl font-bold text-white">{sessionTotal}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Cards</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xl font-bold" style={{ color: "#10b981" }}>{acc}%</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Accuracy</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xl font-bold" style={{ color: "var(--gold)" }}>+{earnedXP}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>XP</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={loadQueue}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              Study Again
            </button>
            {!studyAll && (
              <button
                onClick={() => setStudyAll(true)}
                className="w-full py-3 rounded-xl font-semibold"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                Study All Words
              </button>
            )}
            <Link href="/" className="w-full py-3 rounded-xl font-semibold text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              Back to Home
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const progress = ((index) / queue.length) * 100;

  return (
    <div className="min-h-dvh flex flex-col pb-28" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
      <div className="px-4 pt-safe pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="p-2 rounded-xl" style={{ color: "var(--muted)" }}>
            ← Back
          </Link>
          <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            {index + 1} / {queue.length}
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--gold)" }}>
            +{earnedXP} XP
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #06b6d4)" }}
          />
        </div>
      </div>

      {/* Flip Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {currentWord && (
          <div className={`w-full max-w-sm ${animClass}`}>
            {/* SRS badge */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full text-white ${getSrsColor(currentWord.srsLevel)}`}
              >
                {getSrsLabel(currentWord.srsLevel)}
              </span>
              {currentWord.tags && (
                <div className="flex gap-1">
                  {currentWord.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--muted)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flip-card w-full" style={{ height: "340px" }}>
              <div className={`flip-card-inner w-full h-full ${flipped ? "flipped" : ""}`}>
                {/* Front */}
                <div
                  className="flip-card-front w-full h-full rounded-3xl flex flex-col items-center justify-center p-6 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, var(--surface), var(--surface2))",
                    border: "1px solid var(--border)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  }}
                  onClick={handleFlip}
                >
                  <p className="text-xs mb-6 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Tap to reveal
                  </p>
                  <h2 className="text-4xl font-bold text-white text-center mb-2">
                    {currentWord.word}
                  </h2>
                  {currentWord.phonetic && (
                    <p className="text-sm" style={{ color: "var(--accent)" }}>
                      {currentWord.phonetic}
                    </p>
                  )}
                  <button
                    onClick={handleAudio}
                    className="mt-6 p-3 rounded-full"
                    style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)" }}
                  >
                    <span className="text-xl">🔊</span>
                  </button>
                </div>

                {/* Back */}
                <div
                  className="flip-card-back w-full h-full rounded-3xl flex flex-col justify-between p-6"
                  style={{
                    background: "linear-gradient(135deg, #1e1b4b, #1e3a5f)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">{currentWord.word}</h3>
                      {currentWord.phonetic && (
                        <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>{currentWord.phonetic}</p>
                      )}
                      <p className="text-base text-white font-medium mb-1">{currentWord.meaning}</p>
                      {currentWord.translation && (
                        <p className="text-sm" style={{ color: "#a78bfa" }}>{currentWord.translation}</p>
                      )}
                    </div>
                    <button
                      onClick={handleAudio}
                      className="p-2 rounded-full ml-3"
                      style={{ background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.3)" }}
                    >
                      🔊
                    </button>
                  </div>

                  {currentWord.example && (
                    <div
                      className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>Example</p>
                      <p className="text-sm text-white italic">"{currentWord.example}"</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs mb-2 text-center" style={{ color: "var(--muted)" }}>
                      How well did you know this?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleGrade(1)}
                        className="py-2.5 rounded-xl font-semibold text-sm text-white"
                        style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.4)" }}
                      >
                        ❌ Hard
                      </button>
                      <button
                        onClick={() => handleGrade(3)}
                        className="py-2.5 rounded-xl font-semibold text-sm text-white"
                        style={{ background: "rgba(245,158,11,0.25)", border: "1px solid rgba(245,158,11,0.4)" }}
                      >
                        🤔 OK
                      </button>
                      <button
                        onClick={() => handleGrade(5)}
                        className="py-2.5 rounded-xl font-semibold text-sm text-white"
                        style={{ background: "rgba(16,185,129,0.25)", border: "1px solid rgba(16,185,129,0.4)" }}
                      >
                        ✅ Easy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {phase === "front" && (
              <p className="text-center text-xs mt-4" style={{ color: "var(--muted)" }}>
                Tap card or press Space to flip
              </p>
            )}
          </div>
        )}
      </div>

      <AchievementToast achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />
      <BottomNav />
    </div>
  );
}
