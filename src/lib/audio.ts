"use client";

export function speakWord(
  text: string,
  lang: string = "en-US",
  rate: number = 0.9
): void {
  if (typeof window === "undefined") return;
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Prefer a native voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith(lang.split("-")[0]) && v.localService
  );
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

export function isAudioSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
