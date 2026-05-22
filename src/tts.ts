// Pronunciation via Free Dictionary API (real human voice MP3).
// Falls back to Web Speech API if no audio found.

const audioCache = new Map<string, string | null>();

async function fetchAudioUrl(word: string): Promise<string | null> {
  const key = word.toLowerCase().trim();
  if (audioCache.has(key)) return audioCache.get(key)!;

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`
    );
    if (!res.ok) { audioCache.set(key, null); return null; }
    const data = await res.json();
    const phonetics: { audio?: string }[] = data[0]?.phonetics ?? [];
    // prefer US pronunciation
    const us = phonetics.find((p) => p.audio?.includes("-us."));
    const any = phonetics.find((p) => p.audio);
    const url = us?.audio ?? any?.audio ?? null;
    audioCache.set(key, url ?? null);
    return url ?? null;
  } catch {
    audioCache.set(key, null);
    return null;
  }
}

// --- Web Speech API fallback ---
function speakFallback(text: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const v = en.find((v) => /us|united states/i.test(v.lang + v.name)) ?? en[0];
  if (v) u.voice = v;
  u.lang = v?.lang ?? "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// --- Main speak function ---
let currentAudio: HTMLAudioElement | null = null;

export async function speak(text: string): Promise<void> {
  // stop any currently playing audio
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

  const url = await fetchAudioUrl(text);
  if (url) {
    currentAudio = new Audio(url);
    currentAudio.play().catch(() => speakFallback(text));
  } else {
    speakFallback(text);
  }
}

export function ttsSupported(): boolean {
  return true; // always available (fetch + fallback)
}
