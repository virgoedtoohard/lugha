import { COURSES } from "./content.js";
import type { BaseLang, ContentOverride, Course, Item, Lesson, Progress, Unit } from "./types.js";

const PROGRESS_KEY = "lugha.progress.v1";
const OVERRIDES_KEY = "lugha.overrides.v1";

export const MAX_HEARTS = 5;
const HEART_REGEN_MS = 30 * 60 * 1000;

export function today(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

export function freshProgress(): Progress {
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
    updatedAt: 0,
  };
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

let progress: Progress = load();
const listeners = new Set<() => void>();

function load(): Progress {
  const raw = safeGet(PROGRESS_KEY);
  if (!raw) return freshProgress();
  try {
    return { ...freshProgress(), ...JSON.parse(raw) } as Progress;
  } catch {
    return freshProgress();
  }
}

export function getProgress(): Progress {
  regenHearts();
  checkStreakBroken();
  return progress;
}

export function onProgressChange(fn: () => void): void {
  listeners.add(fn);
}

export function saveProgress(p: Progress, notify = true): void {
  progress = p;
  safeSet(PROGRESS_KEY, JSON.stringify(p));
  if (notify) listeners.forEach((fn) => fn());
}

function mutate(fn: (p: Progress) => void): void {
  fn(progress);
  progress.updatedAt = Date.now();
  saveProgress(progress);
}

export function resetLocalProgress(): void {
  saveProgress(freshProgress());
}

// ---------- Hearts ----------
function regenHearts(): void {
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

export function msToNextHeart(): number {
  if (progress.hearts >= MAX_HEARTS) return 0;
  return Math.max(0, HEART_REGEN_MS - (Date.now() - progress.heartsUpdated));
}

export function loseHeart(): void {
  mutate((p) => {
    if (p.hearts >= MAX_HEARTS) p.heartsUpdated = Date.now();
    p.hearts = Math.max(0, p.hearts - 1);
  });
}

export function gainHeart(): void {
  mutate((p) => { p.hearts = Math.min(MAX_HEARTS, p.hearts + 1); });
}

// ---------- Streak & XP ----------
function checkStreakBroken(): void {
  if (progress.lastActiveDay && dayDiff(progress.lastActiveDay, today()) > 1 && progress.streak !== 0) {
    progress.streak = 0;
    safeSet(PROGRESS_KEY, JSON.stringify(progress));
  }
}

export function addXp(amount: number): void {
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
    while (keys.length > 60) delete p.dailyXp[keys.shift()!];
  });
}

export function todayXp(): number {
  return progress.dailyXp[today()] ?? 0;
}

export function recordAnswer(itemId: string, correct: boolean): void {
  const s = progress.itemStats[itemId] ?? { seen: 0, correct: 0, last: 0 };
  s.seen += 1;
  if (correct) s.correct += 1;
  s.last = Date.now();
  progress.itemStats[itemId] = s;
  // persisted with the next mutate (lesson end) to avoid excess writes
}

export function completeLesson(lessonId: string): void {
  mutate((p) => { p.completed[lessonId] = (p.completed[lessonId] ?? 0) + 1; });
}

export function setActiveCourse(code: string | null): void {
  mutate((p) => { p.activeCourse = code; });
}

export function setBase(base: BaseLang): void {
  mutate((p) => { p.base = base; });
}

export function setDailyGoal(goal: number): void {
  mutate((p) => { p.dailyGoal = goal; });
}

// Merge local + cloud progress so nothing is lost when a device was offline.
export function mergeProgress(a: Progress, b: Progress): Progress {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const merged: Progress = { ...newer };
  merged.xp = Math.max(a.xp, b.xp);
  merged.dailyXp = { ...a.dailyXp };
  for (const [k, v] of Object.entries(b.dailyXp)) merged.dailyXp[k] = Math.max(merged.dailyXp[k] ?? 0, v);
  merged.completed = { ...a.completed };
  for (const [k, v] of Object.entries(b.completed)) merged.completed[k] = Math.max(merged.completed[k] ?? 0, v);
  merged.itemStats = { ...a.itemStats };
  for (const [k, v] of Object.entries(b.itemStats)) {
    const cur = merged.itemStats[k];
    merged.itemStats[k] = !cur || v.seen > cur.seen ? v : cur;
  }
  const aDay = a.lastActiveDay ?? "", bDay = b.lastActiveDay ?? "";
  if (aDay === bDay) merged.streak = Math.max(a.streak, b.streak);
  else { const later = aDay > bDay ? a : b; merged.streak = later.streak; merged.lastActiveDay = later.lastActiveDay; }
  merged.updatedAt = Math.max(a.updatedAt, b.updatedAt);
  return merged;
}

// ---------- Content (bundled + reviewer overrides) ----------
let overrides: Record<string, ContentOverride> = loadOverrides();

function loadOverrides(): Record<string, ContentOverride> {
  try { return JSON.parse(safeGet(OVERRIDES_KEY) ?? "{}"); } catch { return {}; }
}

export function setOverrides(list: ContentOverride[]): void {
  overrides = {};
  for (const o of list) overrides[o.item_id] = o;
  safeSet(OVERRIDES_KEY, JSON.stringify(overrides));
}

export function upsertOverrideLocal(o: ContentOverride): void {
  overrides[o.item_id] = o;
  safeSet(OVERRIDES_KEY, JSON.stringify(overrides));
}

function applyOverride(item: Item): Item {
  const o = overrides[item.id];
  if (!o) return item;
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

export function getCourses(): Course[] {
  return COURSES.map((c) => ({
    ...c,
    units: c.units.map((u) => ({
      ...u,
      lessons: u.lessons.map((l) => ({ ...l, items: l.items.map(applyOverride) })),
    })),
  }));
}

export function getCourse(code: string): Course | undefined {
  return getCourses().find((c) => c.code === code);
}

export function allLessons(course: Course): Lesson[] {
  return course.units.flatMap((u) => u.lessons);
}

export function allItems(course: Course): Item[] {
  return allLessons(course).flatMap((l) => l.items);
}

export function isUnlocked(course: Course, lessonId: string): boolean {
  const lessons = allLessons(course);
  const idx = lessons.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true;
  return (progress.completed[lessons[idx - 1].id] ?? 0) > 0;
}

export function unitDone(u: Unit): boolean {
  return u.lessons.every((l) => (progress.completed[l.id] ?? 0) > 0);
}

export function unitsDone(course: Course): number {
  return course.units.filter(unitDone).length;
}

export function findItem(course: Course, id: string): Item | undefined {
  return allItems(course).find((i) => i.id === id);
}

export function courseCompletion(course: Course): number {
  const lessons = allLessons(course);
  const done = lessons.filter((l) => (progress.completed[l.id] ?? 0) > 0).length;
  return lessons.length ? done / lessons.length : 0;
}

// Items the learner gets wrong most, for Practice mode
export function weakItems(course: Course, n: number): Item[] {
  const seen = allItems(course).filter((i) => progress.itemStats[i.id]);
  seen.sort((x, y) => {
    const sx = progress.itemStats[x.id], sy = progress.itemStats[y.id];
    return sx.correct / sx.seen - sy.correct / sy.seen || sx.last - sy.last;
  });
  return seen.slice(0, n);
}
