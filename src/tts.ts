// Pronunciation via the Web Speech API (built into the browser).

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  cachedVoice =
    en.find((v) => /us|united states/i.test(v.lang + v.name)) ?? en[0] ?? null;
  return cachedVoice;
}

export function speak(text: string): void {
  if (!ttsSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickEnglishVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// voices load async in some browsers; refresh the cache when they arrive
if (ttsSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
    pickEnglishVoice();
  };
}
