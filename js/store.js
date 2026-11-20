import { COURSES } from "./content.js";
import { legs } from "./convo.js";
const PROGRESS_KEY = "lugha.progress.v1";
const OVERRIDES_KEY = "lugha.overrides.v1";
export const MAX_HEARTS = 5;
const HEART_REGEN_MS = 30 * 60 * 1000;
export function today(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function dayDiff(a, b) {
    const toUtc = (s) => {
        const [y, m, d] = s.split("-").map(Number);
        return Date.UTC(y, m - 1, d);
    };
    return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}
export function freshProgress() {
    return {
        version: 1,
        activeCourse: null,
        base: "en",
        xp: 0,
        dailyXp: {},
        streak: 0,
        lastActiveDay: null,
        hearts: MAX_HEARTS,
        heartsUpdated: Date.now(),
        completed: {},
        itemStats: {},
        dailyGoal: 20,
        settings: { speaking: true, voiceFallback: true, speakSnoozeUntil: 0 },
        tests: {},
        partial: {},
        updatedAt: 0,
    };
}
function safeGet(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function safeSet(key, value) {
    try {
        localStorage.setItem(key, value);
    }
    catch { /* storage unavailable */ }
}
let progress = load();
const listeners = new Set();
function load() {
    const raw = safeGet(PROGRESS_KEY);
    if (!raw)
        return freshProgress();
    try {
        const fresh = freshProgress();
        const p = { ...fresh, ...JSON.parse(raw) };
        p.settings = { ...fresh.settings, ...(p.settings ?? {}) };
        p.tests = p.tests ?? {};
        p.partial = p.partial ?? {};
        return p;
    }
    catch {
        return freshProgress();
    }
}
export function getProgress() {
    regenHearts();
    checkStreakBroken();
    return progress;
}
export function onProgressChange(fn) {
    listeners.add(fn);
}
export function saveProgress(p, notify = true) {
    progress = p;
    safeSet(PROGRESS_KEY, JSON.stringify(p));
    if (notify)
        listeners.forEach((fn) => fn());
}
function mutate(fn) {
    fn(progress);
    progress.updatedAt = Date.now();
    saveProgress(progress);
}
export function resetLocalProgress() {
    saveProgress(freshProgress());
}
// ---------- Hearts ----------
function regenHearts() {
    if (progress.hearts >= MAX_HEARTS) {
        progress.heartsUpdated = Date.now();
        return;
    }
    const elapsed = Date.now() - progress.heartsUpdated;
    const gained = Math.floor(elapsed / HEART_REGEN_MS);
    if (gained > 0) {
        progress.hearts = Math.min(MAX_HEARTS, progress.hearts + gained);
        progress.heartsUpdated += gained * HEART_REGEN_MS;
        safeSet(PROGRESS_KEY, JSON.stringify(progress));
    }
}
export function msToNextHeart() {
    if (progress.hearts >= MAX_HEARTS)
        return 0;
    return Math.max(0, HEART_REGEN_MS - (Date.now() - progress.heartsUpdated));
}
export function loseHeart() {
    mutate((p) => {
        if (p.hearts >= MAX_HEARTS)
            p.heartsUpdated = Date.now();
        p.hearts = Math.max(0, p.hearts - 1);
    });
}
export function gainHeart() {
    mutate((p) => { p.hearts = Math.min(MAX_HEARTS, p.hearts + 1); });
}
// ---------- Streak & XP ----------
function checkStreakBroken() {
    if (progress.lastActiveDay && dayDiff(progress.lastActiveDay, today()) > 1 && progress.streak !== 0) {
        progress.streak = 0;
        safeSet(PROGRESS_KEY, JSON.stringify(progress));
    }
}
export function addXp(amount) {
    mutate((p) => {
        const t = today();
        p.xp += amount;
        p.dailyXp[t] = (p.dailyXp[t] ?? 0) + amount;
        if (p.lastActiveDay !== t) {
            const gap = p.lastActiveDay ? dayDiff(p.lastActiveDay, t) : Infinity;
            p.streak = gap === 1 ? p.streak + 1 : 1;
            p.lastActiveDay = t;
        }
        // keep only the last 60 days of daily xp
        const keys = Object.keys(p.dailyXp).sort();
        while (keys.length > 60)
            delete p.dailyXp[keys.shift()];
    });
}
export function todayXp() {
    return progress.dailyXp[today()] ?? 0;
}
export function recordAnswer(itemId, correct) {
    const s = progress.itemStats[itemId] ?? { seen: 0, correct: 0, last: 0 };
    s.seen += 1;
    if (correct)
        s.correct += 1;
    s.last = Date.now();
    progress.itemStats[itemId] = s;
    // persisted with the next mutate (lesson end) to avoid excess writes
}
export function completeLesson(stepId) {
    mutate((p) => { p.completed[stepId] = (p.completed[stepId] ?? 0) + 1; delete p.partial[stepId]; });
}
export function setActiveCourse(code) {
    mutate((p) => { p.activeCourse = code; });
}
export function setBase(base) {
    mutate((p) => { p.base = base; });
}
export function setSetting(key, value) {
    mutate((p) => { p.settings[key] = value; });
}
/** "Can't speak now": skip speaking exercises for an hour. */
export function snoozeSpeaking() {
    setSetting("speakSnoozeUntil", Date.now() + 60 * 60 * 1000);
}
export function speakingActive() {
    return progress.settings.speaking && Date.now() > progress.settings.speakSnoozeUntil;
}
/** Record a unit test score; passing (80%+) counts every lesson in the unit as done. */
export function recordTest(unit, score) {
    const passed = score >= 80;
    mutate((p) => {
        p.tests[unit.id] = Math.max(p.tests[unit.id] ?? 0, score);
        if (passed)
            for (const l of unit.lessons)
                p.completed[l.id] = Math.max(p.completed[l.id] ?? 0, 1);
    });
    return passed;
}
export function setDailyGoal(goal) {
    mutate((p) => { p.dailyGoal = goal; });
}
// Merge local + cloud progress so nothing is lost when a device was offline.
export function mergeProgress(a, b) {
    const newer = a.updatedAt >= b.updatedAt ? a : b;
    const merged = { ...newer };
    merged.xp = Math.max(a.xp, b.xp);
    merged.dailyXp = { ...a.dailyXp };
    for (const [k, v] of Object.entries(b.dailyXp))
        merged.dailyXp[k] = Math.max(merged.dailyXp[k] ?? 0, v);
    merged.completed = { ...a.completed };
    for (const [k, v] of Object.entries(b.completed))
        merged.completed[k] = Math.max(merged.completed[k] ?? 0, v);
    merged.itemStats = { ...a.itemStats };
    for (const [k, v] of Object.entries(b.itemStats)) {
        const cur = merged.itemStats[k];
        merged.itemStats[k] = !cur || v.seen > cur.seen ? v : cur;
    }
    const aDay = a.lastActiveDay ?? "", bDay = b.lastActiveDay ?? "";
    if (aDay === bDay)
        merged.streak = Math.max(a.streak, b.streak);
    else {
        const later = aDay > bDay ? a : b;
        merged.streak = later.streak;
        merged.lastActiveDay = later.lastActiveDay;
    }
    merged.partial = { ...(newer.partial ?? {}) };
    merged.tests = { ...(a.tests ?? {}) };
    for (const [k, v] of Object.entries(b.tests ?? {}))
        merged.tests[k] = Math.max(merged.tests[k] ?? 0, v);
    merged.settings = { ...freshProgress().settings, ...(newer.settings ?? {}) };
    merged.updatedAt = Math.max(a.updatedAt, b.updatedAt);
    return merged;
}
// ---------- Content (bundled + reviewer overrides) ----------
let overrides = loadOverrides();
function loadOverrides() {
    try {
        return JSON.parse(safeGet(OVERRIDES_KEY) ?? "{}");
    }
    catch {
        return {};
    }
}
export function setOverrides(list) {
    overrides = {};
    for (const o of list)
        overrides[o.item_id] = o;
    safeSet(OVERRIDES_KEY, JSON.stringify(overrides));
}
export function upsertOverrideLocal(o) {
    overrides[o.item_id] = o;
    safeSet(OVERRIDES_KEY, JSON.stringify(overrides));
}
function applyOverride(item) {
    const o = overrides[item.id];
    if (!o)
        return item;
    return {
        ...item,
        target: o.target || item.target,
        english: o.english || item.english,
        swahili: o.swahili || item.swahili,
        note: o.note ?? item.note,
        audio: o.audio_url || item.audio,
        status: o.status,
        confidence: o.confidence,
    };
}
export function getCourses() {
    return COURSES.map((c) => ({
        ...c,
        units: c.units.map((u) => ({
            ...u,
            lessons: u.lessons.map((l) => ({ ...l, items: l.items.map(applyOverride) })),
        })),
    }));
}
export function getCourse(code) {
    return getCourses().find((c) => c.code === code);
}
export function allLessons(course) {
    return course.units.flatMap((u) => u.lessons);
}
export function allItems(course) {
    return allLessons(course).flatMap((l) => l.items);
}
export const talkId = (u) => `${u.id}-talk`;
/** Lessons, then the stop's conversation; after the last stop of a leg, the fireside conversation. */
export function steps(course) {
    const out = [];
    const legList = legs(course);
    for (const u of course.units) {
        for (const l of u.lessons)
            out.push({ id: l.id, kind: "lesson", unit: u, lesson: l });
        out.push({ id: talkId(u), kind: "talk", unit: u });
        const li = legList.findIndex((g) => g[g.length - 1] === u);
        if (li >= 0)
            out.push({ id: `${course.code}-leg${li + 1}`, kind: "leg", unit: u, leg: legList[li] });
    }
    return out;
}
export const isDone = (stepId) => (progress.completed[stepId] ?? 0) > 0;
export function isUnlocked(course, stepId) {
    const all = steps(course);
    const idx = all.findIndex((s) => s.id === stepId);
    if (idx <= 0)
        return true;
    return isDone(all[idx - 1].id);
}
/** Where the learner is: the first unfinished step, and how far through it they got. */
export function position(course) {
    const all = steps(course);
    const index = all.findIndex((s) => !isDone(s.id));
    const step = index >= 0 ? all[index] : undefined;
    return { index: index >= 0 ? index : all.length, step, fraction: step ? Math.min(0.95, progress.partial[step.id] ?? 0) : 0 };
}
export function setPartial(stepId, fraction) {
    if ((progress.partial[stepId] ?? 0) >= fraction)
        return;
    progress.partial[stepId] = fraction;
    progress.updatedAt = Date.now();
    saveProgress(progress, false);
}
export function unitDone(u) {
    return u.lessons.every((l) => isDone(l.id)) && isDone(talkId(u));
}
export function unitsDone(course) {
    return course.units.filter(unitDone).length;
}
export function findItem(course, id) {
    return allItems(course).find((i) => i.id === id);
}
export function courseCompletion(course) {
    const all = steps(course);
    return all.length ? all.filter((s) => isDone(s.id)).length / all.length : 0;
}
// Items the learner gets wrong most, for Practice mode
export function weakItems(course, n) {
    const seen = allItems(course).filter((i) => progress.itemStats[i.id]);
    seen.sort((x, y) => {
        const sx = progress.itemStats[x.id], sy = progress.itemStats[y.id];
        return sx.correct / sx.seen - sy.correct / sy.seen || sx.last - sy.last;
    });
    return seen.slice(0, n);
}
