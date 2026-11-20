import type { Exercise, Item } from "./types.js";

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = key(x).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function distractors(item: Item, pool: Item[], field: "target" | "english", n: number): string[] {
  const others = uniqueBy(
    pool.filter((p) => p.id !== item.id && p[field].toLowerCase() !== item[field].toLowerCase()),
    (p) => p[field],
  );
  return shuffle(others).slice(0, n).map((p) => p[field]);
}

const isPhrase = (s: string) => s.trim().split(/\s+/).length > 1;

function choose(item: Item, pool: Item[], direction: "to-en" | "to-target"): Exercise {
  const field = direction === "to-en" ? "english" : "target";
  const answer = item[field];
  return {
    kind: "choose",
    item,
    direction,
    prompt: direction === "to-en" ? item.target : item.english,
    answer,
    options: shuffle([answer, ...distractors(item, pool, field, 3)]),
  };
}

function build(item: Item, pool: Item[]): Exercise {
  const words = tokens(item.target);
  const extra = shuffle(pool.filter((p) => p.id !== item.id).flatMap((p) => tokens(p.target)))
    .filter((w) => !words.some((x) => x.toLowerCase() === w.toLowerCase()));
  const bank = shuffle([...words, ...uniqueBy(extra, (w) => w).slice(0, Math.max(2, 6 - words.length))]);
  return { kind: "build", item, bank };
}

export function tokens(s: string): string[] {
  return s.replace(/[?!.,]/g, "").trim().split(/\s+/).filter(Boolean);
}

/** Build the exercise queue for one lesson. `pool` supplies wrong-answer options. */
export function generateLesson(items: Item[], pool: Item[]): Exercise[] {
  const intro = items.map((it) => choose(it, pool, "to-en"));
  const later: Exercise[] = [];

  for (const [i, it] of items.entries()) {
    if (it.audio) later.push({ kind: "listen", item: it, options: shuffle([it.target, ...distractors(it, pool, "target", 3)]) });
    else if (isPhrase(it.target)) later.push(build(it, pool));
    else if (i % 2 === 0) later.push({ kind: "type", item: it });
    else later.push(choose(it, pool, "to-target"));
  }

  const matchItems = uniqueBy(uniqueBy(shuffle(items), (x) => x.english), (x) => x.target).slice(0, 4);
  if (matchItems.length >= 3) later.splice(Math.floor(later.length / 2), 0, { kind: "match", items: matchItems });

  return [...intro, ...shuffle(later)].slice(0, 14);
}

/** Practice session from weak items: no intro step, straight to recall. */
export function generatePractice(items: Item[], pool: Item[]): Exercise[] {
  return shuffle(items).map((it, i) =>
    isPhrase(it.target) ? build(it, pool) : i % 2 ? { kind: "type", item: it } as Exercise : choose(it, pool, "to-target"),
  );
}

// ---------- Answer checking ----------
const stripMarks = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const clean = (s: string) =>
  s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[?!.,]/g, "").replace(/\s+/g, " ").trim();

export type Verdict = "exact" | "accents" | "wrong";

export function checkTyped(input: string, expected: string): Verdict {
  const a = clean(input), b = clean(expected);
  if (a === b) return "exact";
  if (stripMarks(a) === stripMarks(b)) return "accents";
  return "wrong";
}
