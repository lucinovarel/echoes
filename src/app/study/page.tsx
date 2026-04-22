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
  const [grading, setGrading] = useState(false);

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
    if (!currentWord || phase !== "back" || grading) return;
    setGrading(true);

    const correct = quality >= 3;
    const xp = getXpForQuality(quality);

    const updates = calculateNextReview(currentWord, quality);
    const updated: VocabWord = {
      ...currentWord,
      ...updates,
      reviewCount: currentWord.reviewCount + 1,
      correctCount: currentWord.correctCount + (correct ? 1 : 0),
    };
    await updateWord(updated);

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

    setAnimClass(correct ? "correct-pulse" : "wrong-pulse shake");
    setTimeout(() => {
      setAnimClass("");
      setGrading(false);
      if (index + 1 < queue.length) {
        setIndex((i) => i + 1);
        setFlipped(false);
        setPhase("front");
      } else {
        setPhase("done");
      }
    }, 400);
  }

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
        <div className="text-center bounce-in w-full max-w-sm">
          <div className="text-7xl mb-4">
            {acc >= 80 ? "🏆" : acc >= 60 ? "👍" : "💪"}
          </div>
          <h2
            className="text-3xl font-black uppercase tracking-tight mb-2"
            style={{ color: "var(--text)" }}
          >
            Session Complete!
          </h2>
          <p className="mb-6 font-medium" style={{ color: "var(--muted)" }}>
            {sessionTotal === 0 ? "No cards were due." : `${sessionCorrect}/${sessionTotal} correct`}
          </p>

          {sessionTotal > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-xs">
              {[
                { val: sessionTotal, label: "Cards", color: "var(--accent)" },
                { val: `${acc}%`, label: "Accuracy", color: "var(--green)" },
                { val: `+${earnedXP}`, label: "XP", color: "var(--gold)" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="p-3 text-center"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--border)",
                    boxShadow: "3px 3px 0 var(--border)",
                    borderRadius: "4px",
                    transform: i === 1 ? "rotate(-0.5deg)" : "none",
                  }}
                >
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={loadQueue}
              className="w-full py-3 font-black uppercase tracking-wider"
              style={{
                background: "var(--primary)",
                border: "2px solid var(--border)",
                boxShadow: "4px 4px 0 var(--border)",
                borderRadius: "4px",
                color: "#f8f3ea",
              }}
            >
              Study Again
            </button>
            {!studyAll && (
              <button
                onClick={() => setStudyAll(true)}
                className="w-full py-3 font-bold uppercase tracking-wider"
                style={{
                  background: "var(--surface)",
                  border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)",
                  borderRadius: "4px",
                  color: "var(--text)",
                }}
              >
                Study All Words
              </button>
            )}
            <Link
              href="/"
              className="w-full py-3 font-bold uppercase tracking-wider text-center block"
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

  const progress = (index / queue.length) * 100;

  return (
    <div className="min-h-dvh flex flex-col pb-28" style={{ background: "var(--bg)" }}>
      {/* Top bar */}
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
            {index + 1} / {queue.length}
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
            style={{ width: `${progress}%`, background: "var(--primary)" }}
          />
        </div>
      </div>

      {/* Flip Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {currentWord && (
          <div className={`w-full max-w-sm ${animClass}`}>
            {/* SRS badge row */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className={`stamp ${getSrsColor(currentWord.srsLevel)}`}>
                {getSrsLabel(currentWord.srsLevel)}
              </span>
              {currentWord.tags && (
                <div className="flex gap-1">
                  {currentWord.tags.slice(0, 2).map((t) => (
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
            </div>

            <div className="flip-card w-full" style={{ height: "340px" }}>
              <div className={`flip-card-inner w-full h-full ${flipped ? "flipped" : ""}`}>
                {/* Front — cream paper */}
                <div
                  className="flip-card-front w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--border)",
                    boxShadow: "5px 5px 0 var(--border)",
                    borderRadius: "4px",
                  }}
                  onClick={handleFlip}
                >
                  <p className="text-xs font-black mb-6 uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    Tap to reveal
                  </p>
                  <h2 className="text-5xl font-black text-center mb-2 uppercase" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
                    {currentWord.word}
                  </h2>
                  {currentWord.phonetic && (
                    <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                      {currentWord.phonetic}
                    </p>
                  )}
                  <button
                    onClick={handleAudio}
                    className="mt-6 px-4 py-2 font-bold uppercase tracking-wider text-sm"
                    style={{
                      background: "var(--accent)",
                      border: "2px solid var(--border)",
                      boxShadow: "3px 3px 0 var(--border)",
                      borderRadius: "4px",
                      color: "#f8f3ea",
                    }}
                  >
                    🔊 Listen
                  </button>
                </div>

                {/* Back — navy paper */}
                <div
                  className="flip-card-back w-full h-full flex flex-col justify-between p-6"
                  style={{
                    background: "var(--accent)",
                    border: "2px solid var(--border)",
                    boxShadow: "5px 5px 0 var(--border)",
                    borderRadius: "4px",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black uppercase mb-1" style={{ color: "#f8f3ea", letterSpacing: "-0.01em" }}>
                        {currentWord.word}
                      </h3>
                      {currentWord.phonetic && (
                        <p className="text-xs font-medium mb-3" style={{ color: "rgba(248,243,234,0.6)" }}>
                          {currentWord.phonetic}
                        </p>
                      )}
                      <p className="text-base font-bold mb-1" style={{ color: "#f8f3ea" }}>{currentWord.meaning}</p>
                      {currentWord.translation && (
                        <p className="text-sm font-medium" style={{ color: "#f0b000" }}>{currentWord.translation}</p>
                      )}
                    </div>
                    <button
                      onClick={handleAudio}
                      className="p-2 ml-3"
                      style={{
                        background: "rgba(248,243,234,0.15)",
                        border: "1.5px solid rgba(248,243,234,0.4)",
                        borderRadius: "4px",
                      }}
                    >
                      🔊
                    </button>
                  </div>

                  {currentWord.example && (
                    <div
                      className="p-3 my-2"
                      style={{
                        background: "rgba(248,243,234,0.1)",
                        border: "1.5px solid rgba(248,243,234,0.25)",
                        borderRadius: "4px",
                      }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(248,243,234,0.5)" }}>
                        Example
                      </p>
                      <p className="text-sm italic" style={{ color: "#f8f3ea" }}>"{currentWord.example}"</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-black uppercase tracking-widest mb-2 text-center" style={{ color: "rgba(248,243,234,0.5)" }}>
                      How well did you know this?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { quality: 1, label: "Hard", bg: "#c41e2e" },
                        { quality: 3, label: "OK", bg: "#c48800" },
                        { quality: 5, label: "Easy", bg: "#2a6040" },
                      ].map((btn) => (
                        <button
                          key={btn.quality}
                          onClick={() => handleGrade(btn.quality)}
                          disabled={grading}
                          className="py-2.5 font-black uppercase tracking-wider text-sm"
                          style={{
                            background: btn.bg,
                            opacity: grading ? 0.5 : 1,
                            border: "2px solid #1a1008",
                            boxShadow: "2px 2px 0 #1a1008",
                            borderRadius: "4px",
                            color: "#f8f3ea",
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {phase === "front" && (
              <p className="text-center text-xs font-bold uppercase tracking-widest mt-4" style={{ color: "var(--muted)" }}>
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
