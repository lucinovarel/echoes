"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllWords, updateWord } from "@/lib/db";
import { calculateNextReview } from "@/lib/srs";
import { useGameStore } from "@/store/gameStore";
import { VocabWord, Achievement } from "@/lib/types";
import { speakWord } from "@/lib/audio";
import AchievementToast from "@/components/AchievementToast";
import BottomNav from "@/components/BottomNav";

interface QuizQuestion {
  word: VocabWord;
  options: string[];
  correctIndex: number;
}

type AnswerState = "idle" | "correct" | "wrong";

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const [done, setDone] = useState(false);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const { addXP, recordReview, checkStreak: checkGameStreak, incrementDailyProgress } = useGameStore();

  useEffect(() => {
    buildQuiz();
  }, []);

  async function buildQuiz() {
    setLoading(true);
    const all = await getAllWords();
    if (all.length < 2) {
      setLoading(false);
      setDone(true);
      return;
    }

    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, all.length));

    const qs: QuizQuestion[] = selected.map((word) => {
      const distractors = all
        .filter((w) => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.meaning);

      const correctIndex = Math.floor(Math.random() * 4);
      const options = [...distractors];
      options.splice(correctIndex, 0, word.meaning);

      return { word, options, correctIndex };
    });

    setQuestions(qs);
    setIndex(0);
    setDone(false);
    setSessionCorrect(0);
    setEarnedXP(0);
    setStreak(0);
    setMaxStreak(0);
    setAnswerState("idle");
    setSelectedOption(null);
    setLoading(false);
  }

  const current = questions[index];

  async function handleAnswer(optionIndex: number) {
    if (answerState !== "idle" || !current) return;

    setSelectedOption(optionIndex);
    const correct = optionIndex === current.correctIndex;
    setAnswerState(correct ? "correct" : "wrong");

    // Speak the word
    speakWord(current.word.word);

    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    setMaxStreak((prev) => Math.max(prev, newStreak));

    // XP: base + streak bonus
    const baseXP = correct ? 15 : 2;
    const streakBonus = correct && newStreak >= 3 ? 5 : 0;
    const totalXP = baseXP + streakBonus;

    // Update SRS
    const updates = calculateNextReview(current.word, correct ? 4 : 1);
    await updateWord({
      ...current.word,
      ...updates,
      reviewCount: current.word.reviewCount + 1,
      correctCount: current.word.correctCount + (correct ? 1 : 0),
    });

    checkGameStreak();
    incrementDailyProgress();
    const newAchievements = addXP(totalXP);
    recordReview(correct);

    setEarnedXP((prev) => prev + totalXP);
    if (correct) setSessionCorrect((prev) => prev + 1);

    if (newAchievements.length > 0) {
      setPendingAchievement(newAchievements[0]);
    }

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex((i) => i + 1);
        setAnswerState("idle");
        setSelectedOption(null);
      } else {
        setDone(true);
      }
    }, 1200);
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-4xl float">⚡</div>
      </div>
    );
  }

  if (done) {
    const total = questions.length;
    const acc = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-28" style={{ background: "var(--bg)" }}>
        <div className="text-center bounce-in w-full max-w-sm">
          <div className="text-7xl mb-4">
            {acc >= 80 ? "🏆" : acc >= 60 ? "⚡" : "💪"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Quiz Complete!</h2>
          <p className="mb-6" style={{ color: "var(--muted)" }}>
            {total < 2 ? "Add more words to start quizzing!" : `${sessionCorrect}/${total} correct`}
          </p>

          {total >= 2 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-3xl font-bold text-white">{acc}%</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Accuracy</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-3xl font-bold" style={{ color: "var(--gold)" }}>+{earnedXP}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>XP Earned</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-3xl font-bold" style={{ color: "#10b981" }}>{sessionCorrect}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Correct</div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-3xl font-bold" style={{ color: "#f59e0b" }}>🔥{maxStreak}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>Best Streak</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={buildQuiz}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #06b6d4, #0284c7)" }}
            >
              Play Again
            </button>
            <Link href="/" className="block w-full py-3 rounded-xl font-semibold text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              Back to Home
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const progress = (index / questions.length) * 100;

  return (
    <div className="min-h-dvh flex flex-col pb-28" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-safe pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="p-2 rounded-xl" style={{ color: "var(--muted)" }}>
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            {streak >= 2 && (
              <div className="flex items-center gap-1 text-sm font-bold text-amber-400">
                🔥 {streak}
              </div>
            )}
            <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              {index + 1}/{questions.length}
            </div>
          </div>
          <div className="text-sm font-medium" style={{ color: "var(--gold)" }}>
            +{earnedXP} XP
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #06b6d4, #7c3aed)" }}
          />
        </div>
      </div>

      {/* Question */}
      {current && (
        <div className="flex-1 flex flex-col justify-between px-4 py-4">
          {/* Word card */}
          <div
            className={`rounded-3xl p-6 mb-6 text-center transition-all duration-300 ${
              answerState === "correct" ? "correct-pulse" : answerState === "wrong" ? "wrong-pulse" : ""
            }`}
            style={{
              background: answerState === "correct"
                ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))"
                : answerState === "wrong"
                ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))"
                : "linear-gradient(135deg, var(--surface), var(--surface2))",
              border: answerState === "correct"
                ? "1px solid rgba(16,185,129,0.4)"
                : answerState === "wrong"
                ? "1px solid rgba(239,68,68,0.4)"
                : "1px solid var(--border)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <p className="text-xs mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              What does this mean?
            </p>
            <h2 className="text-4xl font-bold text-white mb-2">{current.word.word}</h2>
            {current.word.phonetic && (
              <p className="text-sm mb-4" style={{ color: "var(--accent)" }}>{current.word.phonetic}</p>
            )}
            <button
              onClick={() => speakWord(current.word.word)}
              className="p-2 rounded-full"
              style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              🔊
            </button>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {current.options.map((opt, i) => {
              let style: React.CSSProperties = {
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              };

              if (answerState !== "idle") {
                if (i === current.correctIndex) {
                  style = {
                    background: "rgba(16,185,129,0.2)",
                    border: "2px solid #10b981",
                    color: "white",
                  };
                } else if (i === selectedOption && i !== current.correctIndex) {
                  style = {
                    background: "rgba(239,68,68,0.2)",
                    border: "2px solid #ef4444",
                    color: "white",
                  };
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answerState !== "idle"}
                  className="w-full py-4 px-5 rounded-2xl text-left font-medium transition-all duration-200 text-sm leading-snug"
                  style={style}
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3"
                    style={{
                      background: answerState !== "idle" && i === current.correctIndex
                        ? "#10b981"
                        : answerState !== "idle" && i === selectedOption
                        ? "#ef4444"
                        : "var(--border)",
                      color: "white",
                    }}
                  >
                    {["A", "B", "C", "D"][i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AchievementToast achievement={pendingAchievement} onDismiss={() => setPendingAchievement(null)} />
      <BottomNav />
    </div>
  );
}
