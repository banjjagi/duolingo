// Lightweight SM-2-style spaced repetition, persisted to localStorage.

export interface CardState {
  id: string;
  reps: number; // successful reviews in a row
  ease: number; // ease factor
  intervalDays: number;
  due: number; // epoch ms when next due
  lastGrade: number; // 0..3
  reviews: number; // total reviews ever
  correct: number; // total correct ever
}

export interface Progress {
  cards: Record<string, CardState>;
  streak: number;
  lastStudyDay: string | null; // YYYY-MM-DD
}

const KEY = "det-vocab-progress-v1";
const DAY = 24 * 60 * 60 * 1000;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {
    /* ignore */
  }
  return { cards: {}, streak: 0, lastStudyDay: null };
}

export function saveProgress(p: Progress): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function getCard(p: Progress, id: string): CardState {
  return (
    p.cards[id] ?? {
      id,
      reps: 0,
      ease: 2.5,
      intervalDays: 0,
      due: 0,
      lastGrade: 0,
      reviews: 0,
      correct: 0,
    }
  );
}

// grade: 0 = again, 1 = hard, 2 = good, 3 = easy
export function grade(p: Progress, id: string, g: number): Progress {
  const c = { ...getCard(p, id) };
  c.reviews += 1;
  if (g >= 2) c.correct += 1;
  c.lastGrade = g;

  if (g === 0) {
    c.reps = 0;
    c.intervalDays = 0; // due again immediately this session
  } else {
    c.reps += 1;
    c.ease = Math.max(1.3, c.ease + (0.1 - (3 - g) * (0.08 + (3 - g) * 0.02)));
    if (c.reps === 1) c.intervalDays = g === 3 ? 3 : 1;
    else if (c.reps === 2) c.intervalDays = 6;
    else c.intervalDays = Math.round(c.intervalDays * c.ease);
  }
  c.due = Date.now() + c.intervalDays * DAY;

  const cards = { ...p.cards, [id]: c };

  // streak handling
  const today = todayStr();
  let streak = p.streak;
  let lastStudyDay = p.lastStudyDay;
  if (lastStudyDay !== today) {
    const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
    streak = lastStudyDay === yesterday ? streak + 1 : 1;
    lastStudyDay = today;
  }

  return { cards, streak, lastStudyDay };
}

export function dueQueue(p: Progress, ids: string[]): string[] {
  const now = Date.now();
  const known = ids.filter((id) => p.cards[id]);
  const newOnes = ids.filter((id) => !p.cards[id]);
  const due = known.filter((id) => getCard(p, id).due <= now);
  // due cards first (soonest due), then unseen cards
  due.sort((a, b) => getCard(p, a).due - getCard(p, b).due);
  return [...due, ...newOnes];
}

export interface Stats {
  total: number;
  seen: number;
  learned: number; // reps >= 2
  mastered: number; // reps >= 4
  due: number;
  reviews: number;
  accuracy: number; // 0..1
}

export function computeStats(p: Progress, ids: string[]): Stats {
  const now = Date.now();
  let seen = 0,
    learned = 0,
    mastered = 0,
    due = 0,
    reviews = 0,
    correct = 0;
  for (const id of ids) {
    const c = p.cards[id];
    if (!c) continue;
    seen += 1;
    reviews += c.reviews;
    correct += c.correct;
    if (c.reps >= 2) learned += 1;
    if (c.reps >= 4) mastered += 1;
    if (c.due <= now) due += 1;
  }
  return {
    total: ids.length,
    seen,
    learned,
    mastered,
    due: due + (ids.length - seen),
    reviews,
    accuracy: reviews ? correct / reviews : 0,
  };
}

export function resetProgress(): Progress {
  const fresh: Progress = { cards: {}, streak: 0, lastStudyDay: null };
  saveProgress(fresh);
  return fresh;
}
