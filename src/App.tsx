import { useState } from "react";
import { DECKS, wordsForDeck } from "./vocab";
import { loadProgress, saveProgress, resetProgress, type Progress } from "./srs";
import Flashcards from "./components/Flashcards";
import Quiz from "./components/Quiz";
import Stats from "./components/Stats";

type Tab = "learn" | "quiz" | "stats";
type DeckSel = "all" | string;

export default function App() {
  const [tab, setTab] = useState<Tab>("learn");
  const [deck, setDeck] = useState<DeckSel>("all");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  const words = wordsForDeck(deck);

  function update(p: Progress) {
    saveProgress(p);
    setProgress(p);
  }

  function handleReset() {
    if (confirm("Reset all study progress? This cannot be undone.")) {
      setProgress(resetProgress());
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>DET Vocab</h1>
        <span className="tagline">80 → 130</span>
      </header>

      <nav className="tabs">
        <button className={tab === "learn" ? "active" : ""} onClick={() => setTab("learn")}>
          Flashcards
        </button>
        <button className={tab === "quiz" ? "active" : ""} onClick={() => setTab("quiz")}>
          Quiz
        </button>
        <button className={tab === "stats" ? "active" : ""} onClick={() => setTab("stats")}>
          Stats
        </button>
      </nav>

      <div className="deck-row">
        <label>Deck:</label>
        <select value={deck} onChange={(e) => setDeck(e.target.value)}>
          <option value="all">All ({wordsForDeck("all").length})</option>
          {DECKS.map((d) => (
            <option key={d} value={d}>
              {d} ({wordsForDeck(d).length})
            </option>
          ))}
        </select>
      </div>

      <main className="content">
        {tab === "learn" && (
          <Flashcards words={words} progress={progress} onGrade={update} />
        )}
        {tab === "quiz" && (
          <Quiz words={words} progress={progress} onGrade={update} />
        )}
        {tab === "stats" && (
          <Stats words={words} progress={progress} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
