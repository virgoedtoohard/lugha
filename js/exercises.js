import { getLang } from "./i18n.js";
/** The item's meaning in the learner's base language. */
export const meaning = (i) => (getLang() === "sw" ? i.swahili || i.english : i.english);
export function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function uniqueBy(arr, key) {
    const seen = new Set();
    return arr.filter((x) => {
        const k = key(x).toLowerCase();
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
function distractors(item, pool, get, n) {
    const others = uniqueBy(pool.filter((p) => p.id !== item.id && get(p).toLowerCase() !== get(item).toLowerCase()), get);
    return shuffle(others).slice(0, n).map(get);
}
const target = (i) => i.target;
const isPhrase = (s) => s.trim().split(/\s+/).length > 1;
function choose(item, pool, direction) {
    const get = direction === "to-base" ? meaning : target;
    const answer = get(item);
    return {
        kind: "choose", item, direction,
        prompt: direction === "to-base" ? item.target : meaning(item),
        answer,
        options: shuffle([answer, ...distractors(item, pool, get, 3)]),
    };
}
export function tokens(s) {
    return s.replace(/[?!.,]/g, "").trim().split(/\s+/).filter(Boolean);
}
function build(item, pool) {
    const words = tokens(item.target);
    const extra = shuffle(pool.filter((p) => p.id !== item.id).flatMap((p) => tokens(p.target)))
        .filter((w) => !words.some((x) => x.toLowerCase() === w.toLowerCase()));
    const bank = shuffle([...words, ...uniqueBy(extra, (w) => w).slice(0, Math.max(2, 6 - words.length))]);
    return { kind: "build", item, bank };
}
export function sceneExercise(scene, cast, find, pool) {
    const lines = scene.lines.map((l) => ({ who: l.who, item: find(l.item) })).filter((l) => !!l.item);
    const last = lines[lines.length - 1];
    if (!last || last.who !== "you")
        return null;
    return {
        kind: "scene", scene, cast,
        lines: lines.slice(0, -1),
        answer: last.item,
        options: shuffle([last.item.target, ...distractors(last.item, pool, target, 2)]),
    };
}
const listen = (it, pool) => ({ kind: "listen", item: it, options: shuffle([it.target, ...distractors(it, pool, target, 3)]) });
/** Build the exercise queue for one lesson. `pool` supplies wrong-answer options. */
export function generateLesson(items, pool, opts = {}) {
    const { story, speak = false, realAudio = () => false } = opts;
    const intro = items.map((it) => choose(it, pool, "to-base"));
    const later = [];
    for (const [i, it] of items.entries()) {
        if (realAudio(it) && i % 2 === 1)
            later.push(listen(it, pool));
        else if (isPhrase(it.target))
            later.push(build(it, pool));
        else if (i % 2 === 0)
            later.push({ kind: "type", item: it });
        else
            later.push(choose(it, pool, "to-target"));
    }
    const matchItems = uniqueBy(uniqueBy(shuffle(items), meaning), target).slice(0, 4);
    if (matchItems.length >= 3)
        later.splice(Math.floor(later.length / 2), 0, { kind: "match", items: matchItems });
    if (speak) {
        // Two "say it aloud" turns, favouring short words — easiest for the recogniser
        const picks = shuffle(items).sort((a, b) => a.target.length - b.target.length).slice(0, 2);
        for (const it of picks)
            later.splice(Math.floor(Math.random() * (later.length + 1)), 0, { kind: "speak", item: it });
    }
    const queue = [...intro, ...later.length ? shuffle(later) : []].slice(0, story ? 15 : 16);
    if (story)
        queue.push(story); // the story scene closes the lesson
    return queue;
}
/** Unit test: 10 recall questions across the whole unit, no introductions. */
export function generateTest(items, pool, opts = {}) {
    const { speak = false, realAudio = () => false } = opts;
    const picks = shuffle(items).slice(0, 10);
    const qs = picks.map((it, i) => {
        if (speak && i < 2)
            return { kind: "speak", item: it };
        if (realAudio(it) && i % 4 === 3)
            return listen(it, pool);
        if (isPhrase(it.target))
            return build(it, pool);
        if (i % 3 === 0)
            return choose(it, pool, "to-base");
        return i % 2 ? { kind: "type", item: it } : choose(it, pool, "to-target");
    });
    return shuffle(qs);
}
/** Practice session from weak items: straight to recall. */
export function generatePractice(items, pool) {
    return shuffle(items).map((it, i) => isPhrase(it.target) ? build(it, pool) : i % 2 ? { kind: "type", item: it } : choose(it, pool, "to-target"));
}
// ---------- Answer checking ----------
const stripMarks = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const clean = (s) => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[?!.,]/g, "").replace(/\s+/g, " ").trim();
export function checkTyped(input, expected) {
    const a = clean(input), b = clean(expected);
    if (a === b)
        return "exact";
    if (stripMarks(a) === stripMarks(b))
        return "accents";
    return "wrong";
}
