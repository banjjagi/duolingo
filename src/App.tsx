import { useState, useEffect } from "react";
import { DECKS, wordsForDeck } from "./vocab";
import { loadProgress, saveProgress, resetProgress, type Progress } from "./srs";
import { signInWithGoogle, signOut, onAuthChange, loadFromCloud, saveToCloud } from "./cloud";
import Flashcards from "./components/Flashcards";
import Quiz from "./components/Quiz";
import Stats from "./components/Stats";

type Tab = "learn" | "quiz" | "stats";
type DeckSel = "all" | string;

export default function App() {
  const [tab, setTab]           = useState<Tab>("learn");
  const [deck, setDeck]         = useState<DeckSel>("all");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [user, setUser]         = useState<{ email?: string | null } | null>(null);
  const [syncing, setSyncing]   = useState(false);

  // ── Auth listener ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u as { email?: string | null } | null);
      if (u) {
        // Load cloud progress on sign-in; use it if it's not empty
        setSyncing(true);
        const cloud = await loadFromCloud();
        if (cloud && Object.keys(cloud.cards ?? {}).length > 0) {
          saveProgress(cloud);
          setProgress(cloud);
        }
        setSyncing(false);
      }
    });
    return unsub;
  }, []);

  // ── Progress update (local + cloud) ──────────────────────────
  function update(p: Progress) {
    saveProgress(p);
    setProgress(p);
    void saveToCloud(p); // fire-and-forget
  }

  function handleReset() {
    if (confirm("Reset all study progress? This cannot be undone.")) {
      const fresh = resetProgress();
      setProgress(fresh);
      void saveToCloud(fresh);
    }
  }

  const words = wordsForDeck(deck);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <h1>DET Vocab</h1>
          <span className="tagline">80 → 130</span>
        </div>
        <div className="topbar-right">
          {syncing && <span className="sync-badge">동기화 중…</span>}
          {user ? (
            <div className="user-info">
              <span className="user-email">{user.email?.split("@")[0]}</span>
              <button className="btn-ghost" onClick={() => void signOut()}>로그아웃</button>
            </div>
          ) : (
            <button className="btn-google" onClick={() => void signInWithGoogle()}>
              <svg width="16" height="16" viewBox="0 0 48 48" style={{marginRight:6}}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Google로 로그인
            </button>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === "learn" ? "active" : ""} onClick={() => setTab("learn")}>Flashcards</button>
        <button className={tab === "quiz"  ? "active" : ""} onClick={() => setTab("quiz")}>Quiz</button>
        <button className={tab === "stats" ? "active" : ""} onClick={() => setTab("stats")}>Stats</button>
      </nav>

      <div className="deck-row">
        <label>Deck:</label>
        <select value={deck} onChange={(e) => setDeck(e.target.value)}>
          <option value="all">All ({wordsForDeck("all").length})</option>
          {DECKS.map((d) => (
            <option key={d} value={d}>{d} ({wordsForDeck(d).length})</option>
          ))}
        </select>
      </div>

      <main className="content">
        {tab === "learn" && <Flashcards words={words} progress={progress} onGrade={update} />}
        {tab === "quiz"  && <Quiz       words={words} progress={progress} onGrade={update} />}
        {tab === "stats" && <Stats      words={words} progress={progress} onReset={handleReset} />}
      </main>
    </div>
  );
}
