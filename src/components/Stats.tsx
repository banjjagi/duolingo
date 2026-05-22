import type { Word } from "../vocab";
import { computeStats, type Progress } from "../srs";

interface Props {
  words: Word[];
  progress: Progress;
  onReset: () => void;
}

function Bar({ value, total, label, cls }: { value: number; total: number; label: string; cls: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="stat-bar">
      <div className="stat-bar-head">
        <span>{label}</span>
        <span>
          {value} / {total} ({pct}%)
        </span>
      </div>
      <div className="stat-bar-track">
        <div className={`stat-bar-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Stats({ words, progress, onReset }: Props) {
  const ids = words.map((w) => w.id);
  const s = computeStats(progress, ids);

  return (
    <div className="stats-wrap">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-num">🔥 {progress.streak}</div>
          <div className="stat-label">day streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{s.seen}</div>
          <div className="stat-label">words started</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{s.mastered}</div>
          <div className="stat-label">mastered</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{Math.round(s.accuracy * 100)}%</div>
          <div className="stat-label">accuracy</div>
        </div>
      </div>

      <div className="stat-bars">
        <Bar value={s.seen} total={s.total} label="Started" cls="b-seen" />
        <Bar value={s.learned} total={s.total} label="Learned (2+ reps)" cls="b-learned" />
        <Bar value={s.mastered} total={s.total} label="Mastered (4+ reps)" cls="b-mastered" />
      </div>

      <p className="muted">
        {s.due} card{s.due === 1 ? "" : "s"} due for review · {s.reviews} total reviews
      </p>

      <button className="danger" onClick={onReset}>
        Reset all progress
      </button>
    </div>
  );
}
