import { useEffect, useMemo, useState } from "react";
import type { Word } from "../vocab";
import { speak, ttsSupported } from "../tts";
import { dueQueue, grade, type Progress } from "../srs";

interface Props {
  words: Word[];
  progress: Progress;
  onGrade: (p: Progress) => void;
}

const GRADES = [
  { g: 0, label: "Again", cls: "g-again" },
  { g: 1, label: "Hard", cls: "g-hard" },
  { g: 2, label: "Good", cls: "g-good" },
  { g: 3, label: "Easy", cls: "g-easy" },
];

export default function Flashcards({ words, progress, onGrade }: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, Word>();
    words.forEach((w) => m.set(w.id, w));
    return m;
  }, [words]);

  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  // build the queue once per deck change
  useEffect(() => {
    setQueue(dueQueue(progress, words.map((w) => w.id)));
    setRevealed(false);
    setDone(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const currentId = queue[0];
  const current = currentId ? byId.get(currentId) : undefined;

  function handleGrade(g: number) {
    if (!current) return;
    const next = grade(progress, current.id, g);
    onGrade(next);
    setQueue((q) => {
      const rest = q.slice(1);
      // "Again" → requeue near the end of this session
      return g === 0 ? [...rest, current.id] : rest;
    });
    setRevealed(false);
    setDone((d) => (g === 0 ? d : d + 1));
  }

  if (!current) {
    return (
      <div className="empty">
        <h2>🎉 All caught up!</h2>
        <p>No cards due in this deck right now. Come back later or switch decks.</p>
        <p className="muted">Reviewed {done} cards this session.</p>
      </div>
    );
  }

  return (
    <div className="flash-wrap">
      <div className="flash-progress">
        {done} done · {queue.length} left in session
      </div>

      <div className="card" onClick={() => setRevealed(true)}>
        <div className="card-deck">{current.deck}</div>
        <div className="card-word">
          {current.word}
          {ttsSupported() && (
            <button
              className="speak-btn"
              title="Play pronunciation"
              onClick={(e) => {
                e.stopPropagation();
                speak(current.word);
              }}
            >
              🔊
            </button>
          )}
        </div>
        {current.ipa && <div className="card-ipa">{current.ipa}</div>}

        {!revealed ? (
          <button className="reveal-btn" onClick={() => setRevealed(true)}>
            Show meaning
          </button>
        ) : (
          <div className="card-back">
            <div className="card-meaning">{current.meaning}</div>
            <div className="card-example">
              “{current.example}”
              {ttsSupported() && (
                <button
                  className="speak-btn small"
                  title="Play example"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(current.example);
                  }}
                >
                  🔊
                </button>
              )}
            </div>
            {current.synonyms && (
              <div className="card-syn">≈ {current.synonyms}</div>
            )}
          </div>
        )}
      </div>

      {revealed && (
        <div className="grade-row">
          {GRADES.map((x) => (
            <button
              key={x.g}
              className={`grade ${x.cls}`}
              onClick={() => handleGrade(x.g)}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
