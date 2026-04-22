"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllWords, updateWord } from "@/lib/db";
import { calculateNextReview } from "@/lib/srs";
import { weightedSample } from "@/lib/wordSelection";
import { useGameStore } from "@/store/gameStore";
import { VocabWord, Achievement } from "@/lib/types";
import { speakWord } from "@/lib/audio";
import AchievementToast from "@/components/AchievementToast";
import BottomNav from "@/components/BottomNav";

interface TranslateQuestion {
  word: VocabWord;
  options: string[];
  correctIndex: number;
}

type AnswerState = "idle" | "correct" | "wrong";

export default function TranslatePage() {
  const [questions, setQuestions] = useState<TranslateQuestion[]>([]);
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
  const [notEnough, setNotEnough] = useState(false);

  const { addXP, recordReview, checkStreak: checkGameStreak, incrementDailyProgress } = useGameStore();

  useEffect(() => {
    buildGame();
  }, []);

  async function buildGame() {
    setLoading(true);
    setNotEnough(false);
    const all = await getAllWords();
    const withTranslation = all.filter((w) => w.translation && w.translation.trim() !== "");

    if (withTranslation.length < 2) {
      setLoading(false);
      setNotEnough(true);
      setDone(true);
      return;
    }

    const selected = weightedSample(withTranslation, Math.min(10, withTranslation.length));

    const qs: TranslateQuestion[] = selected.map((word) => {
      const distractors = all
        .filter((w) => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((w) => w.word);

      const correctIndex = Math.floor(Math.random() * 4);
      const options = [...distractors];
      options.splice(correctIndex, 0, word.word);

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

    speakWord(current.word.word);

    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    setMaxStreak((prev) => Math.max(prev, newStreak));

    const baseXP = correct ? 15 : 2;
    const streakBonus = correct && newStreak >= 3 ? 5 : 0;
    const totalXP = baseXP + streakBonus;

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
        <div className="text-4xl float">🇻🇳</div>
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
            {notEnough ? "📝" : acc >= 80 ? "🏆" : acc >= 60 ? "⚡" : "💪"}
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: "var(--text)" }}>
            {notEnough ? "Cần thêm từ!" : "Hoàn thành!"}
          </h2>
          <p className="mb-6 font-medium" style={{ color: "var(--muted)" }}>
            {notEnough
              ? "Thêm ít nhất 2 từ có nghĩa tiếng Việt để chơi."
              : `${sessionCorrect}/${total} đúng`}
          </p>

          {!notEnough && total >= 2 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { val: `${acc}%`, label: "Độ chính xác", color: "var(--text)" },
                { val: `+${earnedXP}`, label: "XP kiếm được", color: "var(--gold)" },
                { val: sessionCorrect, label: "Câu đúng", color: "var(--green)" },
                { val: `🔥${maxStreak}`, label: "Chuỗi tốt nhất", color: "var(--primary)" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="p-4"
                  style={{
                    background: "var(--surface)",
                    border: "2px solid var(--border)",
                    boxShadow: "3px 3px 0 var(--border)",
                    borderRadius: "4px",
                    transform: i % 2 === 1 ? "rotate(0.5deg)" : "rotate(-0.3deg)",
                  }}
                >
                  <div className="text-3xl font-black" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {!notEnough && (
              <button
                onClick={buildGame}
                className="w-full py-3 font-black uppercase tracking-wider"
                style={{
                  background: "var(--accent)",
                  border: "2px solid var(--border)",
                  boxShadow: "4px 4px 0 var(--border)",
                  borderRadius: "4px",
                  color: "#f8f3ea",
                }}
              >
                Chơi lại
              </button>
            )}
            {notEnough && (
              <Link
                href="/add"
                className="block w-full py-3 font-black uppercase tracking-wider text-center"
                style={{
                  background: "var(--accent)",
                  border: "2px solid var(--border)",
                  boxShadow: "4px 4px 0 var(--border)",
                  borderRadius: "4px",
                  color: "#f8f3ea",
                }}
              >
                + Thêm từ mới
              </Link>
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
              ← Trang chủ
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
          <div className="flex items-center gap-3">
            {streak >= 2 && (
              <div
                className="flex items-center gap-1 px-2 py-1 font-black text-sm"
                style={{
                  background: "var(--gold)",
                  border: "2px solid var(--border)",
                  boxShadow: "2px 2px 0 var(--border)",
                  borderRadius: "4px",
                  color: "var(--text)",
                }}
              >
                🔥 {streak}
              </div>
            )}
            <div className="text-sm font-black" style={{ color: "var(--text)" }}>
              {index + 1}/{questions.length}
            </div>
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

      {/* Question */}
      {current && (
        <div className="flex-1 flex flex-col justify-between px-4 py-4">
          {/* Vietnamese word card */}
          <div
            className={`p-6 mb-6 text-center transition-all duration-300 ${
              answerState === "correct" ? "correct-pulse" : answerState === "wrong" ? "wrong-pulse" : ""
            }`}
            style={{
              background: answerState === "correct"
                ? "#2a6040"
                : answerState === "wrong"
                ? "var(--primary)"
                : "var(--surface)",
              border: "2px solid var(--border)",
              boxShadow: "5px 5px 0 var(--border)",
              borderRadius: "4px",
            }}
          >
            <p className="text-xs font-black mb-3 uppercase tracking-widest" style={{ color: answerState !== "idle" ? "rgba(248,243,234,0.6)" : "var(--muted)" }}>
              🇻🇳 Từ tiếng Anh của từ này là gì?
            </p>
            <h2
              className="text-4xl font-black mb-2"
              style={{
                color: answerState !== "idle" ? "#f8f3ea" : "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              {current.word.translation}
            </h2>
            {answerState !== "idle" && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="text-lg font-black" style={{ color: "#f8f3ea" }}>
                  → {current.word.word}
                </span>
                {current.word.phonetic && (
                  <span className="text-sm font-medium" style={{ color: "rgba(248,243,234,0.7)" }}>
                    {current.word.phonetic}
                  </span>
                )}
                <button
                  onClick={() => speakWord(current.word.word)}
                  className="px-2 py-1 text-xs font-bold uppercase"
                  style={{
                    background: "rgba(248,243,234,0.2)",
                    border: "1.5px solid rgba(248,243,234,0.4)",
                    borderRadius: "4px",
                    color: "#f8f3ea",
                  }}
                >
                  🔊
                </button>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {current.options.map((opt, i) => {
              let bg = "var(--surface)";
              let textColor = "var(--text)";
              let border = "2px solid var(--border)";
              let shadow = "3px 3px 0 var(--border)";

              if (answerState !== "idle") {
                if (i === current.correctIndex) {
                  bg = "#2a6040";
                  textColor = "#f8f3ea";
                  border = "2px solid var(--border)";
                } else if (i === selectedOption && i !== current.correctIndex) {
                  bg = "var(--primary)";
                  textColor = "#f8f3ea";
                  border = "2px solid var(--border)";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answerState !== "idle"}
                  className="w-full py-4 px-5 text-left font-bold transition-all duration-200 text-base"
                  style={{ background: bg, border, boxShadow: shadow, borderRadius: "4px", color: textColor }}
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 mr-3 font-black text-xs"
                    style={{
                      background: answerState !== "idle" && i === current.correctIndex
                        ? "rgba(248,243,234,0.3)"
                        : answerState !== "idle" && i === selectedOption
                        ? "rgba(248,243,234,0.3)"
                        : "var(--border)",
                      color: "#f8f3ea",
                      border: "1px solid var(--border)",
                      borderRadius: "2px",
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
