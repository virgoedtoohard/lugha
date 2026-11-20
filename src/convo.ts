// Builds conversations from course content:
//  - a short one at the end of every lesson
//  - a longer one at the end of every stop on the journey
//  - a fireside conversation at the end of each leg, covering everything so far
// Lines come from lesson items and authored scenes. Where a language has a phrase frame
// ("What is this?", "How many?") we use it; where it doesn't, the question is narrated in
// the learner's base language, so we never invent grammar we can't vouch for.

import { shuffle } from "./exercises.js";
import type { CastMember, Course, Exercise, Item, Lesson, Line, Turn, Unit } from "./types.js";

type T = { en: string; sw: string };
const tr = (en: string, sw: string): T => ({ en, sw });

const NUM_EN = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

const EMOJI: Record<string, string> = {
  water: "💧", food: "🍲", house: "🏠", cow: "🐄", milk: "🥛", ugali: "🍚", bananas: "🍌", meat: "🍖",
  maize: "🌽", fish: "🐟", "omena": "🐟", porridge: "🥣", money: "💵", market: "🧺", shop: "🏪", matatu: "🚐",
  home: "🏡", goat: "🐐", chicken: "🐔", dog: "🐕", cat: "🐈", elephant: "🐘", lion: "🦁", bird: "🐦",
  rain: "🌧️", sun: "☀️", moon: "🌙", fire: "🔥", tree: "🌳", river: "🏞️", hill: "⛰️", lake: "🌊",
  eyes: "👀", eye: "👁️", mouth: "👄", hand: "✋", leg: "🦵", ears: "👂", ear: "👂", nose: "👃", head: "🙆🏾",
  chair: "🪑",
};
const COUNTABLE = new Set(["house", "cow", "fish", "goat", "chicken", "dog", "cat", "elephant", "lion", "bird", "tree", "river", "hill", "lake", "eye", "ear", "hand", "leg", "head", "nose", "mouth", "chair", "shop", "market", "matatu"]);
const COUNT_THINGS = ["🥭", "🍌", "🥚", "🐔", "🌽"];

const head = (english: string) => english.toLowerCase().split(/[\s/(]/)[0];

function kindOf(i: Item): { kind: "count" | "what" | "teach"; cue?: string } {
  const e = head(i.english);
  const n = NUM_EN.indexOf(i.english.toLowerCase());
  if (n >= 0) {
    const thing = COUNT_THINGS[(i.id.length + n) % COUNT_THINGS.length];
    return { kind: "count", cue: thing.repeat(n + 1) };
  }
  if (EMOJI[e] && i.target.trim().split(/\s+/).length === 1) return { kind: "what", cue: EMOJI[e] };
  return { kind: "teach" };
}

/** A picture for a word, where one fits (🐐 for goat, 🍌🍌🍌 for three). */
export function cueFor(i: Item): string | undefined {
  return kindOf(i).cue;
}

export const lineOf = (i: Item): Line => ({ target: i.target, english: i.english, swahili: i.swahili, item: i });

const withArticle = (en: string) => {
  const w = head(en);
  return COUNTABLE.has(w) ? `${/^[aeiou]/.test(w) ? "an" : "a"} ${w}` : en.split(" / ")[0];
};

function options(answer: string, pool: string[], n = 2): string[] {
  const others = shuffle([...new Set(pool.filter((p) => p.toLowerCase() !== answer.toLowerCase()))]).slice(0, n);
  return shuffle([answer, ...others]);
}

const findIn = (course: Course, id?: string): Item | undefined =>
  id ? course.units.flatMap((u) => u.lessons.flatMap((l) => l.items)).find((i) => i.id === id) : undefined;

/** Turns that ask about one vocabulary item. */
function vocabTurns(course: Course, i: Item, asker: CastMember, pool: Item[]): Turn[] {
  const k = kindOf(i);
  const f = course.frames;
  const targets = pool.map((p) => p.target);

  if (k.kind === "count") {
    const nums = pool.filter((p) => NUM_EN.includes(p.english.toLowerCase())).map((p) => p.target);
    const ask: Turn = f.howMany
      ? { type: "say", who: asker.key, line: { ...f.howMany } }
      : { type: "narrate", text: tr(`${asker.name} asks how many there are.`, `${asker.name} anauliza ni ngapi.`) };
    return [ask, { type: "reply", cue: k.cue, answer: lineOf(i), options: options(i.target, nums.length > 2 ? nums : targets) }];
  }

  if (k.kind === "what") {
    const nouns = pool.filter((p) => kindOf(p).kind === "what");
    if (f.whatIs && f.itIs) {
      const it = f.itIs;
      const compose = (n: Item): Line => ({ target: it.prefix + n.target, english: it.en + withArticle(n.english), swahili: it.sw + n.swahili.split(" / ")[0], item: n });
      return [
        { type: "say", who: asker.key, line: { ...f.whatIs } },
        { type: "reply", cue: k.cue, answer: compose(i), options: options(compose(i).target, nouns.map((n) => compose(n).target)) },
      ];
    }
    return [
      { type: "narrate", cue: k.cue, text: tr(`${asker.name} points at it and asks what it's called.`, `${asker.name} anakionyesha na kuuliza kinaitwaje.`) },
      { type: "reply", cue: k.cue, answer: lineOf(i), options: options(i.target, nouns.length > 2 ? nouns.map((n) => n.target) : targets) },
    ];
  }

  // No picture for it: the character asks how to say it, in the learner's base language
  return [{
    type: "reply",
    prompt: tr(`${asker.name}: “How do you say ‘${i.english}’?”`, `${asker.name}: “Unasemaje ‘${i.swahili}’?”`),
    answer: lineOf(i),
    options: options(i.target, targets),
  }];
}

/** Turns from an authored lesson scene: every "you" line becomes a reply to choose. */
function sceneTurns(course: Course, lesson: Lesson, pool: Item[]): Turn[] {
  if (!lesson.scene) return [];
  const targets = pool.map((p) => p.target);
  return lesson.scene.lines.flatMap((l): Turn[] => {
    const item = findIn(course, l.item);
    if (!item) return [];
    return l.who === "you"
      ? [{ type: "reply", answer: lineOf(item), options: options(item.target, targets) }]
      : [{ type: "say", who: l.who, line: lineOf(item) }];
  });
}

type Theme = "greet" | "count" | "home" | "market" | "travel" | "family" | "nature" | "body";
function themeOf(u: Unit): Theme {
  const e = u.title.en.toLowerCase();
  if (e.includes("greet") || e.includes("first")) return "greet";
  if (e.includes("number")) return "count";
  if (e.includes("market")) return "market";
  if (e.includes("getting around")) return "travel";
  if (e === "family") return "family";
  if (e.includes("animal")) return "nature";
  if (e.includes("body")) return "body";
  return "home";
}

const SPEAKER: Record<Theme, string> = { greet: "elder", count: "seller", home: "elder", market: "seller", travel: "conductor", family: "friend", nature: "elder", body: "friend" };

function setting(theme: Theme, who: CastMember): T {
  const n = who.name;
  return ({
    greet: tr(`Visiting ${n}`, `Kumtembelea ${n}`),
    count: tr(`Counting at ${n}'s stall`, `Kuhesabu kwenye kibanda cha ${n}`),
    home: tr(`Helping ${n} around the home`, `Kumsaidia ${n} nyumbani`),
    market: tr(`Shopping with ${n}`, `Kununua bidhaa kwa ${n}`),
    travel: tr(`At the matatu stage with ${n}`, `Kwenye kituo cha matatu na ${n}`),
    family: tr(`Looking at family photos with ${n}`, `Kuangalia picha za familia na ${n}`),
    nature: tr(`A walk by the river with ${n}`, `Matembezi kando ya mto na ${n}`),
    body: tr(`Playing 'point to it' with ${n}`, `Kucheza 'onyesha' na ${n}`),
  } as Record<Theme, T>)[theme];
}

const castBy = (course: Course, key: string) => course.cast.find((c) => c.key === key) ?? course.cast[0];

function greetOpen(course: Course, who: CastMember, pool: Item[], asReply: boolean): Turn[] {
  const [q, a] = course.frames.greet ?? [];
  const qi = findIn(course, q), ai = findIn(course, a);
  if (!qi || !ai) return [];
  return asReply
    ? [{ type: "say", who: who.key, line: lineOf(qi) }, { type: "reply", answer: lineOf(ai), options: options(ai.target, pool.map((p) => p.target)) }]
    : [{ type: "say", who: who.key, line: lineOf(qi) }];
}

function closing(course: Course, who: CastMember, pool: Item[]): Turn[] {
  const thanks = findIn(course, course.frames.thanks), bye = findIn(course, course.frames.bye);
  const out: Turn[] = [];
  if (thanks) out.push({ type: "reply", prompt: tr("Thank them.", "Mshukuru."), answer: lineOf(thanks), options: options(thanks.target, pool.map((p) => p.target)) });
  if (bye) out.push({ type: "say", who: who.key, line: lineOf(bye) });
  return out;
}

const seenBefore = (course: Course, unit: Unit) => course.units.slice(0, course.units.indexOf(unit) + 1).flatMap((u) => u.lessons.flatMap((l) => l.items));

/** Everything taught up to and including this lesson (lessons unlock in order, so this is what the learner knows). */
export function learnedThrough(course: Course, lesson: Lesson): Item[] {
  const out: Item[] = [];
  for (const u of course.units) for (const l of u.lessons) { out.push(...l.items); if (l === lesson) return out; }
  return out;
}

/** Wrong-answer options come from learned words; pad from the course only if too few are known yet. */
export function withPadding(course: Course, learned: Item[], min = 6): Item[] {
  if (learned.length >= min) return learned;
  const extra = course.units.flatMap((u) => u.lessons.flatMap((l) => l.items)).filter((i) => !learned.includes(i));
  return [...learned, ...extra.slice(0, min - learned.length)];
}

export const wordKey = (w: string) => w.toLowerCase().replace(/[?!.,;:“”"]/g, "").trim();

/** Words the learner knows (from learned items) and meanings for the course's single words and phrase words. */
function vocabulary(course: Course, learned: Item[]): { known: string[]; glossary: Record<string, T> } {
  const known = new Set<string>();
  for (const i of learned) for (const w of i.target.split(/\s+/)) known.add(wordKey(w));
  const glossary: Record<string, T> = {};
  for (const i of course.units.flatMap((u) => u.lessons.flatMap((l) => l.items))) {
    const words = i.target.split(/\s+/);
    if (words.length === 1) glossary[wordKey(i.target)] ??= { en: i.english, sw: i.swahili };
  }
  for (const [w, g] of Object.entries(course.frames.glosses ?? {})) glossary[wordKey(w)] = g;
  return { known: [...known], glossary };
}

/** Short conversation that closes a lesson. */
export function miniConvo(course: Course, unit: Unit, lesson: Lesson): Exercise {
  const theme = themeOf(unit);
  const who = castBy(course, lesson.scene?.lines.find((l) => l.who !== "you")?.who ?? SPEAKER[theme]);
  const learned = learnedThrough(course, lesson);
  const pool = withPadding(course, learned);
  let turns: Turn[] = sceneTurns(course, lesson, pool);
  const scripted = new Set(lesson.scene?.lines.map((l) => l.item) ?? []);
  const vocab = shuffle(lesson.items.filter((i) => !scripted.has(i.id))).slice(0, lesson.scene ? 1 : 2);
  if (!lesson.scene && theme !== "greet") turns.push(...greetOpen(course, who, pool, false));
  for (const i of vocab) turns.push(...vocabTurns(course, i, who, pool));
  if (!turns.some((t) => t.type === "reply")) turns = vocabTurns(course, lesson.items[0], who, pool);
  return {
    kind: "convo", big: false, cast: course.cast, turns,
    title: tr("Conversation", "Mazungumzo"),
    setting: lesson.scene?.setting ?? setting(theme, who),
    ...vocabulary(course, learned),
  };
}

/** Longer conversation at the end of a stop, using everything from that stop. */
export function stopConvo(course: Course, unit: Unit): Exercise {
  const theme = themeOf(unit);
  const who = castBy(course, SPEAKER[theme]);
  const learned = seenBefore(course, unit);
  const pool = withPadding(course, learned);
  const unitItems = unit.lessons.flatMap((l) => l.items);
  const turns: Turn[] = [...greetOpen(course, who, pool, true)];
  const scripted = new Set(unit.lessons.flatMap((l) => l.scene?.lines.map((x) => x.item) ?? []));
  for (const l of unit.lessons) if (!repeatsGreeting(course, l)) turns.push(...sceneTurns(course, l, pool));
  const vocab = shuffle(unitItems.filter((i) => !scripted.has(i.id))).slice(0, 5);
  for (const i of vocab) turns.push(...vocabTurns(course, i, who, pool));
  turns.push(...closing(course, who, pool));
  return {
    kind: "convo", big: true, cast: course.cast, turns: dedupe(turns),
    title: tr(`Conversation at ${unit.place}`, `Mazungumzo ${unit.place}`),
    setting: setting(theme, who),
    ...vocabulary(course, learned),
  };
}

/** Fireside conversation at the end of a leg: covers every stop so far, more from this leg. */
export function legConvo(course: Course, legUnits: Unit[]): Exercise {
  const elder = castBy(course, "elder");
  const last = legUnits[legUnits.length - 1];
  const sofar = course.units.slice(0, course.units.indexOf(last) + 1);
  const pool = sofar.flatMap((u) => u.lessons.flatMap((l) => l.items));
  const turns: Turn[] = [
    { type: "narrate", text: tr(`Evening at ${last.place}. ${elder.name} has lit the fire and wants to hear about your journey.`, `Jioni huko ${last.place}. ${elder.name} amewasha moto na anataka kusikia kuhusu safari yako.`) },
    ...greetOpen(course, elder, pool, true),
  ];
  for (const u of sofar) {
    const inLeg = legUnits.includes(u);
    const scenes = u.lessons.filter((l) => l.scene);
    const fresh = scenes.filter((l) => !repeatsGreeting(course, l));
    const pickScene = fresh.length && Math.random() < 0.6 ? shuffle(fresh)[0] : null;
    if (pickScene) turns.push(...sceneTurns(course, pickScene, pool));
    const items = shuffle(u.lessons.flatMap((l) => l.items)).slice(0, inLeg ? 2 : 1);
    for (const i of items) turns.push(...vocabTurns(course, i, elder, pool));
  }
  turns.push(...closing(course, elder, pool));
  return {
    kind: "convo", big: true, cast: course.cast, turns: dedupe(turns),
    title: tr(`By the fire at ${last.place}`, `Kando ya moto ${last.place}`),
    setting: tr("Tell the story of your journey so far", "Simulia safari yako hadi sasa"),
    ...vocabulary(course, pool),
  };
}

/** A scene built around the course's greeting would repeat the conversation's opening. */
function repeatsGreeting(course: Course, l: Lesson): boolean {
  const g: string[] = course.frames.greet ? [...course.frames.greet] : [];
  return !!l.scene?.lines.some((x) => g.includes(x.item));
}

/** Drop a reply asked earlier in the same conversation, along with the lines that led up to it. */
function dedupe(turns: Turn[]): Turn[] {
  const seen = new Set<string>();
  const out: Turn[] = [];
  let lead: Turn[] = [];
  for (const t of turns) {
    if (t.type !== "reply") { lead.push(t); continue; }
    const k = t.answer.target + (t.cue ?? "");
    if (!seen.has(k)) { seen.add(k); out.push(...lead, t); }
    else out.push(...lead.filter((x) => x.type === "narrate" && !x.cue));
    lead = [];
  }
  return [...out, ...lead];
}

// ---------- Journey legs ----------
/** Units grouped into legs of about three stops; each leg ends with a fireside conversation. */
export function legs(course: Course): Unit[][] {
  const out: Unit[][] = [];
  const n = course.units.length;
  for (let i = 0; i < n; i += 3) out.push(course.units.slice(i, i + 3));
  // avoid a lonely one-stop final leg
  if (out.length > 1 && out[out.length - 1].length === 1) out[out.length - 2].push(...out.pop()!);
  return out;
}
