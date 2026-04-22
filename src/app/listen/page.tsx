"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAllWords, updateWord } from "@/lib/db";
import { calculateNextReview } from "@/lib/srs";
import { useGameStore } from "@/store/gameStore";
import { VocabWord, Achievement } from "@/lib/types";
import { speakWord } from "@/lib/audio";
import AchievementToast from "@/components/AchievementToast";
import BottomNav from "@/components/BottomNav";

interface ListenQuestion {
  word: VocabWord;
  options: string[];
  correctIndex: number;
}

type AnswerState = "idle" | "correct" | "wrong";

export default function ListenPage() {
  const [questions, setQuestions] = useState<ListenQuestion[]>([]);
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
  const [isPlaying, setIsPlaying] = useState(false);

  const { addXP, recordReview, checkStreak: checkGameStreak, incrementDailyProgress } = useGameStore();

  useEffect(() => { buildGame(); }, []);

  async function buildGame() {
    setLoading(true);
    const all = await getAllWords();
    if (all.length < 2) {
      setLoading(false);
      setDone(true);
      return;
    }

    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, all.length));

    const qs: ListenQuestion[] = selected.map((word) => {
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

  const playCurrentWord = useCallback((word: string) => {
    setIsPlaying(true);
    speakWord(word);
    // SpeechSynthesis doesn't have a reliable onend cross-browser, approximate with timeout
    setTimeout(() => setIsPlaying(false), 1800);
  }, []);

  // Auto-play when question changes
  useEffect(() => {
    if (!loading && !done && questions[index]) {
      const timer = setTimeout(() => playCurrentWord(questions[index].word.word), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, done, questions]);

  const current = questions[index];

  async function handleAnswer(optionIndex: number) {
    if (answerState !== "idle" || !current) return;

    setSelectedOption(optionIndex);
    const correct = optionIndex === current.correctIndex;
    setAnswerState(correct ? "correct" : "wrong");

    if (!correct) speakWord(current.word.word);

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
    }, 1200);
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-4xl float">🔊</div>
      </div>
    );
  }

  if (done) {
    const total = questions.length;
    const acc = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 pb-28" style={{ background: "var(--bg)" }}>
        <div className="text-center bounce-in w-full max-w-sm">
          <div className="text-7xl mb-4">{total < 2 ? "📚" : acc >= 80 ? "👂" : acc >= 60 ? "⚡" : "💪"}</div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: "var(--text)" }}>
            {total < 2 ? "Cần thêm từ!" : "Nghe xong rồi!"}
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
              background: "var(--accent)", border: "2px solid var(--border)",
              boxShadow: "4px 4px 0 var(--border)", borderRadius: "4px", color: "#f8f3ea",
            }}>
              Chơi lại
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
        <div className="h-3 overflow-hidden" style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "2px" }}>
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "var(--accent)" }} />
        </div>
      </div>

      {current && (
        <div className="flex-1 flex flex-col justify-between px-4 py-4">
          {/* Audio card */}
          <div
            className={`p-8 mb-6 flex flex-col items-center justify-center transition-all duration-300 ${
              answerState === "correct" ? "correct-pulse" : answerState === "wrong" ? "wrong-pulse" : ""
            }`}
            style={{
              background: answerState === "correct" ? "#2a6040"
                : answerState === "wrong" ? "var(--primary)"
                : "var(--surface)",
              border: "2px solid var(--border)", boxShadow: "5px 5px 0 var(--border)", borderRadius: "4px",
              minHeight: 160,
            }}
          >
            <p className="text-xs font-black mb-5 uppercase tracking-widest" style={{ color: answerState !== "idle" ? "rgba(248,243,234,0.6)" : "var(--muted)" }}>
              👂 Từ tiếng Anh nào vừa phát âm?
            </p>

            <button
              onClick={() => playCurrentWord(current.word.word)}
              disabled={isPlaying}
              className="flex flex-col items-center gap-2 transition-all duration-200"
              style={{ opacity: isPlaying ? 0.6 : 1 }}
            >
              <div
                className="w-20 h-20 flex items-center justify-center"
                style={{
                  background: answerState !== "idle" ? "rgba(248,243,234,0.2)" : "var(--accent)",
                  border: "3px solid var(--border)",
                  boxShadow: isPlaying ? "0 0 0 4px rgba(139,90,43,0.3)" : "4px 4px 0 var(--border)",
                  borderRadius: "50%",
                  fontSize: "2.5rem",
                  transition: "all 0.2s",
                  transform: isPlaying ? "scale(1.08)" : "scale(1)",
                }}
              >
                {isPlaying ? "🔈" : "🔊"}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: answerState !== "idle" ? "rgba(248,243,234,0.7)" : "var(--muted)" }}>
                {isPlaying ? "Đang phát..." : "Nhấn để nghe lại"}
              </span>
            </button>

            {answerState !== "idle" && (
              <div className="mt-4 text-center">
                <span className="text-2xl font-black" style={{ color: "#f8f3ea" }}>{current.word.word}</span>
                {current.word.phonetic && (
                  <span className="block text-sm font-medium mt-1" style={{ color: "rgba(248,243,234,0.7)" }}>{current.word.phonetic}</span>
                )}
                {current.word.translation && (
                  <span className="block text-sm mt-1" style={{ color: "rgba(248,243,234,0.6)" }}>🇻🇳 {current.word.translation}</span>
                )}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {current.options.map((opt, i) => {
              let bg = "var(--surface)";
              let textColor = "var(--text)";

              if (answerState !== "idle") {
                if (i === current.correctIndex) { bg = "#2a6040"; textColor = "#f8f3ea"; }
                else if (i === selectedOption) { bg = "var(--primary)"; textColor = "#f8f3ea"; }
              }

              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={answerState !== "idle"}
                  className="py-4 px-3 font-bold transition-all duration-200 text-sm text-center"
                  style={{ background: bg, border: "2px solid var(--border)", boxShadow: "3px 3px 0 var(--border)", borderRadius: "4px", color: textColor }}
                >
                  <span className="block font-black text-xs mb-1 opacity-60">{["A", "B", "C", "D"][i]}</span>
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
