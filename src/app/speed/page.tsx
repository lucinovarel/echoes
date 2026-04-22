"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getAllWords, updateWord } from "@/lib/db";
import { calculateNextReview } from "@/lib/srs";
import { buildSessionWords } from "@/lib/wordSelection";
import { useGameStore } from "@/store/gameStore";
import { VocabWord, Achievement } from "@/lib/types";
import { speakWord } from "@/lib/audio";
import AchievementToast from "@/components/AchievementToast";
import BottomNav from "@/components/BottomNav";

interface SpeedQuestion {
  word: VocabWord;
  options: string[];
  correctIndex: number;
}

type AnswerState = "idle" | "correct" | "wrong" | "timeout";

const TIME_LIMIT = 5;

export default function SpeedPage() {
  const [questions, setQuestions] = useState<SpeedQuestion[]>([]);
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
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { addXP, recordReview, checkStreak: checkGameStreak, incrementDailyProgress } = useGameStore();

  useEffect(() => { buildGame(); }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer() {
    clearTimer();
    setTimeLeft(TIME_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => clearTimer();
  }, []);

  async function buildGame() {
    clearTimer();
    setLoading(true);
    const all = await getAllWords();
    if (all.length < 2) {
      setLoading(false);
      setDone(true);
      return;
    }

    const selected = buildSessionWords(all, 12);

    const qs: SpeedQuestion[] = selected.map((word) => {
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

  // Start timer when a new question appears
  useEffect(() => {
    if (!loading && !done && questions.length > 0 && answerState === "idle") {
      startTimer();
    }
    return () => clearTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, done]);

  const current = questions[index];

  async function resolveAnswer(optionIndex: number | null, timedOut: boolean) {
    clearTimer();
    const correct = !timedOut && optionIndex === current?.correctIndex;
    const state: AnswerState = timedOut ? "timeout" : correct ? "correct" : "wrong";

    setSelectedOption(optionIndex);
    setAnswerState(state);

    if (!timedOut) speakWord(current.word.word);

    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    setMaxStreak((prev) => Math.max(prev, newStreak));

    const baseXP = correct ? 20 : 2;
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
    if (newAchievements.length > 0) setPendingAchievement(newAchievements[0]);

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex((i) => i + 1);
        setAnswerState("idle");
        setSelectedOption(null);
      } else {
        setDone(true);
      }
    }, 1000);
  }

  function handleAnswer(optionIndex: number) {
    if (answerState !== "idle" || !current) return;
    resolveAnswer(optionIndex, false);
  }

  function handleTimeout() {
    if (answerState !== "idle") return;
    resolveAnswer(null, true);
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-4xl float">⏱️</div>
      </div>
    );
  }

  if (done) {
    const total = questions.length;
    const acc = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-28" style={{ background: "var(--bg)" }}>
        <div className="text-center bounce-in w-full max-w-sm">
          <div className="text-7xl mb-4">{total < 2 ? "📚" : acc >= 80 ? "⚡" : acc >= 60 ? "🎯" : "💪"}</div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: "var(--text)" }}>
            {total < 2 ? "Cần thêm từ!" : "Speed Round!"}
          </h2>
          <p className="mb-6 font-medium" style={{ color: "var(--muted)" }}>
            {total < 2 ? "Thêm ít nhất 2 từ để chơi." : `${sessionCorrect}/${total} đúng`}
          </p>

          {total >= 2 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { val: `${acc}%`, label: "Độ chính xác", color: "var(--text)" },
                { val: `+${earnedXP}`, label: "XP kiếm được", color: "var(--gold)" },
                { val: sessionCorrect, label: "Câu đúng", color: "var(--green)" },
                { val: `🔥${maxStreak}`, label: "Chuỗi tốt nhất", color: "var(--primary)" },
              ].map((s, i) => (
                <div key={s.label} className="p-4" style={{
                  background: "var(--surface)", border: "2px solid var(--border)",
                  boxShadow: "3px 3px 0 var(--border)", borderRadius: "4px",
                  transform: i % 2 === 1 ? "rotate(0.5deg)" : "rotate(-0.3deg)",
                }}>
                  <div className="text-3xl font-black" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={buildGame} className="w-full py-3 font-black uppercase tracking-wider" style={{
              background: "var(--primary)", border: "2px solid var(--border)",
              boxShadow: "4px 4px 0 var(--border)", borderRadius: "4px", color: "#f8f3ea",
            }}>
              Thử lại
            </button>
            <Link href="/" className="block w-full py-3 font-bold uppercase tracking-wider text-center" style={{
              background: "var(--surface2)", border: "2px solid var(--border)",
              boxShadow: "3px 3px 0 var(--border)", borderRadius: "4px", color: "var(--muted)",
            }}>
              ← Trang chủ
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft <= 2 ? "var(--primary)" : timeLeft <= 3 ? "var(--gold)" : "var(--green)";
  const progress = (index / questions.length) * 100;

  return (
    <div className="min-h-dvh flex flex-col pb-28" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-safe pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="px-3 py-1.5 font-bold text-sm uppercase tracking-wider" style={{
            background: "var(--surface)", border: "2px solid var(--border)",
            boxShadow: "2px 2px 0 var(--border)", borderRadius: "4px", color: "var(--muted)",
          }}>
            ← Back
          </Link>
          <div className="flex items-center gap-3">
            {streak >= 2 && (
              <div className="flex items-center gap-1 px-2 py-1 font-black text-sm" style={{
                background: "var(--gold)", border: "2px solid var(--border)",
                boxShadow: "2px 2px 0 var(--border)", borderRadius: "4px", color: "var(--text)",
              }}>
                🔥 {streak}
              </div>
            )}
            <div className="text-sm font-black" style={{ color: "var(--text)" }}>
              {index + 1}/{questions.length}
            </div>
          </div>
          <div className="px-3 py-1.5 text-sm font-black" style={{
            background: "var(--gold)", border: "2px solid var(--border)",
            boxShadow: "2px 2px 0 var(--border)", borderRadius: "4px", color: "var(--text)",
          }}>
            +{earnedXP} XP
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 overflow-hidden mb-2" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}>
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "var(--accent)" }} />
        </div>

        {/* Timer bar */}
        <div className="h-4 overflow-hidden" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}>
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{ width: `${timerPct}%`, background: timerColor }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>⏱️ Speed</span>
          <span className="text-sm font-black" style={{ color: timerColor }}>{timeLeft}s</span>
        </div>
      </div>

      {current && (
        <div className="flex-1 flex flex-col justify-between px-4 py-2">
          <div
            className={`p-6 mb-4 text-center transition-all duration-300 ${
              answerState === "correct" ? "correct-pulse" : answerState === "wrong" || answerState === "timeout" ? "wrong-pulse" : ""
            }`}
            style={{
              background: answerState === "correct" ? "#2a6040"
                : answerState === "wrong" || answerState === "timeout" ? "var(--primary)"
                : "var(--surface)",
              border: "2px solid var(--border)", boxShadow: "5px 5px 0 var(--border)", borderRadius: "4px",
            }}
          >
            <p className="text-xs font-black mb-3 uppercase tracking-widest" style={{
              color: answerState !== "idle" ? "rgba(248,243,234,0.6)" : "var(--muted)",
            }}>
              {answerState === "timeout" ? "⏰ Hết giờ!" : "Nghĩa của từ này là gì?"}
            </p>
            <h2 className="text-4xl font-black mb-2 uppercase" style={{
              color: answerState !== "idle" ? "#f8f3ea" : "var(--text)",
              letterSpacing: "-0.02em",
            }}>
              {current.word.word}
            </h2>
            {current.word.phonetic && (
              <p className="text-sm font-medium" style={{ color: answerState !== "idle" ? "rgba(248,243,234,0.6)" : "var(--muted)" }}>
                {current.word.phonetic}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {current.options.map((opt, i) => {
              let bg = "var(--surface)";
              let textColor = "var(--text)";

              if (answerState !== "idle") {
                if (i === current.correctIndex) { bg = "#2a6040"; textColor = "#f8f3ea"; }
                else if (i === selectedOption) { bg = "var(--primary)"; textColor = "#f8f3ea"; }
              }

              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={answerState !== "idle"}
                  className="w-full py-3 px-5 text-left font-bold transition-all duration-200 text-sm leading-snug"
                  style={{ background: bg, border: "2px solid var(--border)", boxShadow: "3px 3px 0 var(--border)", borderRadius: "4px", color: textColor }}
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 mr-3 font-black text-xs" style={{
                    background: answerState !== "idle" && (i === current.correctIndex || i === selectedOption)
                      ? "rgba(248,243,234,0.3)" : "var(--border)",
                    color: "#f8f3ea", border: "1px solid var(--border)", borderRadius: "2px",
                  }}>
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
