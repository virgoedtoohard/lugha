import { getLang } from "./i18n.js";
import type { CastMember, Exercise, Item, Scene } from "./types.js";

/** The item's meaning in the learner's base language. */
export const meaning = (i: Item): string => (getLang() === "sw" ? i.swahili || i.english : i.english);

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

function distractors(item: Item, pool: Item[], get: (i: Item) => string, n: number): string[] {
  const others = uniqueBy(pool.filter((p) => p.id !== item.id && get(p).toLowerCase() !== get(item).toLowerCase()), get);
  return shuffle(others).slice(0, n).map(get);
}

const target = (i: Item) => i.target;
const isPhrase = (s: string) => s.trim().split(/\s+/).length > 1;

function choose(item: Item, pool: Item[], direction: "to-base" | "to-target"): Exercise {
  const get = direction === "to-base" ? meaning : target;
  const answer = get(item);
  return {
    kind: "choose", item, direction,
    prompt: direction === "to-base" ? item.target : meaning(item),
    answer,
    options: shuffle([answer, ...distractors(item, pool, get, 3)]),
  };
}

export function tokens(s: string): string[] {
  return s.replace(/[?!.,]/g, "").trim().split(/\s+/).filter(Boolean);
}

function build(item: Item, pool: Item[]): Exercise {
  const words = tokens(item.target);
  const extra = shuffle(pool.filter((p) => p.id !== item.id).flatMap((p) => tokens(p.target)))
    .filter((w) => !words.some((x) => x.toLowerCase() === w.toLowerCase()));
  const bank = shuffle([...words, ...uniqueBy(extra, (w) => w).slice(0, Math.max(2, 6 - words.length))]);
  return { kind: "build", item, bank };
}

export function sceneExercise(scene: Scene, cast: CastMember[], find: (id: string) => Item | undefined, pool: Item[]): Exercise | null {
  const lines = scene.lines.map((l) => ({ who: l.who, item: find(l.item) })).filter((l): l is { who: string; item: Item } => !!l.item);
  const last = lines[lines.length - 1];
  if (!last || last.who !== "you") return null;
  return {
    kind: "scene", scene, cast,
    lines: lines.slice(0, -1),
    answer: last.item,
    options: shuffle([last.item.target, ...distractors(last.item, pool, target, 2)]),
  };
}

export interface GenOpts {
  story?: Exercise | null;
  isNew?: (i: Item) => boolean;          // never studied before: teach it first
  cue?: (i: Item) => string | undefined; // a picture for the study card
  speak?: boolean;                       // include "say it aloud" exercises
  realAudio?: (i: Item) => boolean;      // a recording or generated voice exists
}

const listen = (it: Item, pool: Item[]): Exercise =>
  ({ kind: "listen", item: it, options: shuffle([it.target, ...distractors(it, pool, target, 3)]) });

/** Build one lesson: STUDY new words (two at a time, each followed by a quick check),
 *  then mixed QUESTIONS, then the closing CONVERSATION. */
export function generateLesson(items: Item[], pool: Item[], opts: GenOpts = {}): Exercise[] {
  const { story, speak = false, realAudio = () => false, isNew = () => true, cue = () => undefined } = opts;

  // 1. Study: new words are taught before anything asks about them
  const fresh = items.filter(isNew);
  const known = items.filter((i) => !isNew(i));
  const study: Exercise[] = [];
  for (let c = 0; c < fresh.length; c += 2) {
    const chunk = fresh.slice(c, c + 2);
    for (const it of chunk) study.push({ kind: "teach", item: it, cue: cue(it) });
    for (const it of shuffle(chunk)) study.push(choose(it, pool, "to-base"));   // quick check on what was just taught
  }
  // words met in an earlier visit get a quick reminder question instead of a card
  for (const it of known) study.push(choose(it, pool, "to-base"));

  // 2. Questions: recall in different ways
  const later: Exercise[] = [];
  for (const [i, it] of items.entries()) {
    if (realAudio(it) && i % 2 === 1) later.push(listen(it, pool));
    else if (isPhrase(it.target)) later.push(build(it, pool));
    else if (i % 2 === 0) later.push({ kind: "type", item: it });
    else later.push(choose(it, pool, "to-target"));
  }
  const matchItems = uniqueBy(uniqueBy(shuffle(items), meaning), target).slice(0, 4);
  if (matchItems.length >= 3) later.push({ kind: "match", items: matchItems });
  let questions = shuffle(later).slice(0, Math.max(5, 9 - Math.floor(items.length / 2)));
  if (speak) {
    // Two "say it aloud" turns, favouring short words, easiest for the recogniser
    const picks = shuffle(items).sort((a, b) => a.target.length - b.target.length).slice(0, 2);
    for (const it of picks) questions.splice(1 + Math.floor(Math.random() * questions.length), 0, { kind: "speak", item: it });
  }

  // 3. Conversation closes the lesson
  return [...study, ...questions, ...(story ? [story] : [])];
}

/** Unit test: 10 recall questions across the whole unit, no introductions. */
export function generateTest(items: Item[], pool: Item[], opts: GenOpts = {}): Exercise[] {
  const { speak = false, realAudio = () => false } = opts;
  const picks = shuffle(items).slice(0, 10);
  const qs: Exercise[] = picks.map((it, i) => {
    if (speak && i < 2) return { kind: "speak", item: it } as Exercise;
    if (realAudio(it) && i % 4 === 3) return listen(it, pool);
    if (isPhrase(it.target)) return build(it, pool);
    if (i % 3 === 0) return choose(it, pool, "to-base");
    return i % 2 ? ({ kind: "type", item: it } as Exercise) : choose(it, pool, "to-target");
  });
  return shuffle(qs);
}

/** Practice session from weak items: straight to recall. */
export function generatePractice(items: Item[], pool: Item[]): Exercise[] {
  return shuffle(items).map((it, i) =>
    isPhrase(it.target) ? build(it, pool) : i % 2 ? ({ kind: "type", item: it } as Exercise) : choose(it, pool, "to-target"),
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
