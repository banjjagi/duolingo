// TTS strategy:
//   single word  → Free Dictionary API (real human MP3)
//   sentence     → Web Speech API with best available voice

// ── Free Dictionary API (words only) ──────────────────────────
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
    const us  = phonetics.find((p) => p.audio?.includes("-us."));
    const any = phonetics.find((p) => p.audio);
    const url = us?.audio ?? any?.audio ?? null;
    audioCache.set(key, url ?? null);
    return url ?? null;
  } catch {
    audioCache.set(key, null);
    return null;
  }
}

// ── Web Speech API (sentences & fallback) ────────────────────
// Voice priority: Google US > Microsoft > Apple en-US > any en-US > any en
const VOICE_PRIORITY = [
  /google us english/i,
  /microsoft.*natural/i,
  /microsoft.*zira/i,
  /samantha/i,
  /karen/i,
  /en.?us/i,
];

let _voiceCache: SpeechSynthesisVoice | null | undefined;

function getBestVoice(): SpeechSynthesisVoice | null {
  if (_voiceCache !== undefined) return _voiceCache;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  for (const pattern of VOICE_PRIORITY) {
    const match = en.find((v) => pattern.test(v.name + " " + v.lang));
    if (match) { _voiceCache = match; return match; }
  }
  _voiceCache = en[0] ?? null;
  return _voiceCache;
}

function speakWithWebSpeech(text: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = getBestVoice();
  if (v) u.voice = v;
  u.lang  = v?.lang ?? "en-US";
  u.rate  = 0.88;   // slightly slower → clearer
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    _voiceCache = undefined;
    getBestVoice();
  };
}

// ── Main entry point ─────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;

export async function speak(text: string): Promise<void> {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

  const isSentence = text.trim().includes(" ");

  if (!isSentence) {
    // single word → try human MP3 first
    const url = await fetchAudioUrl(text.trim());
    if (url) {
      currentAudio = new Audio(url);
      currentAudio.play().catch(() => speakWithWebSpeech(text));
      return;
    }
  }

  // sentence or word not found → Web Speech with best voice
  speakWithWebSpeech(text);
}

export function ttsSupported(): boolean {
  return true;
}
