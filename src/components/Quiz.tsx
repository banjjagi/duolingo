import { useEffect, useMemo, useState } from "react";
import type { Word } from "../vocab";
import { speak, ttsSupported } from "../tts";
import { grade, type Progress } from "../srs";

interface Props {
  words: Word[];
  progress: Progress;
  onGrade: (p: Progress) => void;
}

interface Question {
  word: Word;
  options: string[]; // meanings
  answer: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const QUIZ_LEN = 10;

function buildQuiz(words: Word[]): Question[] {
  const pool = shuffle(words);
  const picks = pool.slice(0, Math.min(QUIZ_LEN, pool.length));
  return picks.map((word) => {
    const distractors = shuffle(
      words.filter((w) => w.id !== word.id && w.meaning !== word.meaning)
    )
      .slice(0, 3)
      .map((w) => w.meaning);
    const options = shuffle([word.meaning, ...distractors]);
    return { word, options, answer: word.meaning };
  });
}

export default function Quiz({ words, progress, onGrade }: Props) {
  const canQuiz = words.length >= 4;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<Word[]>([]);

  function start() {
    setQuestions(buildQuiz(words));
    setIdx(0);
    setPicked(null);
    setScore(0);
    setWrong([]);
  }

  useEffect(() => {
    if (canQuiz) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const q = questions[idx];
  const finished = questions.length > 0 && idx >= questions.length;

  const accuracy = useMemo(
    () => (questions.length ? Math.round((score / questions.length) * 100) : 0),
    [score, questions.length]
  );

  if (!canQuiz) {
    return (
      <div className="empty">
        <h2>Need a few more words</h2>
        <p>A multiple-choice quiz needs at least 4 words in the deck.</p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="quiz-done">
        <h2>Score: {score} / {questions.length} ({accuracy}%)</h2>
        {wrong.length > 0 && (
          <div className="wrong-list">
            <h3>Review these:</h3>
            <ul>
              {wrong.map((w) => (
                <li key={w.id}>
                  <b>{w.word}</b> — {w.meaning}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button className="primary" onClick={start}>
          New quiz
        </button>
      </div>
    );
  }

  if (!q) return null;

  function choose(opt: string) {
    if (picked) return;
    setPicked(opt);
    const correct = opt === q.answer;
    if (correct) setScore((s) => s + 1);
    else setWrong((w) => [...w, q.word]);
    // feed result back into SRS: correct = good, wrong = again
    onGrade(grade(progress, q.word.id, correct ? 2 : 0));
  }

  return (
    <div className="quiz-wrap">
      <div className="flash-progress">
        Question {idx + 1} / {questions.length} · score {score}
      </div>

      <div className="quiz-prompt">
        <span className="quiz-word">{q.word.word}</span>
        {ttsSupported() && (
          <button className="speak-btn" onClick={() => speak(q.word.word)}>
            🔊
          </button>
        )}
        {q.word.ipa && <div className="card-ipa">{q.word.ipa}</div>}
      </div>

      <div className="options">
        {q.options.map((opt) => {
          let cls = "option";
          if (picked) {
            if (opt === q.answer) cls += " correct";
            else if (opt === picked) cls += " incorrect";
          }
          return (
            <button key={opt} className={cls} onClick={() => choose(opt)}>
              {opt}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="quiz-next">
          <div className="quiz-example">“{q.word.example}”</div>
          <button
            className="primary"
            onClick={() => {
              setPicked(null);
              setIdx((i) => i + 1);
            }}
          >
            {idx + 1 >= questions.length ? "See results" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
