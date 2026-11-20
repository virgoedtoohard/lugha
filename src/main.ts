import { bead, bomaIcon, safariIcon, riverIcon, boma, chatIcon, checkIcon, fireIcon, flagIcon, lockIcon, pinIcon, BOMA_PIECES, calabash, GUIDES, guideFigure, hearth, hutIcon, necklace, road } from "./art.js";
import { cueFor, learnedThrough, legConvo, miniConvo, stopConvo, withPadding } from "./convo.js";
import * as audio from "./audio.js";
import * as cloud from "./cloud.js";
import { generateLesson, generatePractice, generateTest, sceneExercise } from "./exercises.js";
import { getLang, L, setLang, t } from "./i18n.js";
import { startSession } from "./lesson.js";
import { leaveHome, renderHome } from "./home.js";
import { renderReview } from "./review.js";
import * as speech from "./speech.js";
import {
  allItems, allLessons, courseCompletion, findItem, getCourse, getCourses, getProgress, isUnlocked, MAX_HEARTS,
  mergeProgress, msToNextHeart, onProgressChange, resetLocalProgress, saveProgress, setActiveCourse, setBase,
  isDone as isDoneStep, position, setDailyGoal, setOverrides, setSetting, speakingActive, steps, todayXp, unitDone, unitsDone, weakItems,
} from "./store.js";
import type { BaseLang, Course, Item, Unit } from "./types.js";
import type { Step } from "./store.js";
import { $, $$, app, esc, fmtDuration, toast } from "./ui.js";

// ---------- Router ----------
const ALIAS: Record<string, string> = { learn: "safari", practice: "mtoni", kisima: "mtoni", well: "mtoni", river: "mtoni", profile: "boma" };

function route(): void {
  const hash = location.hash.replace(/^#\/?/, "");
  let [view, arg] = hash.split("/");
  view = ALIAS[view] ?? view;
  const p = getProgress();
  setLang(p.base);
  document.body.classList.remove("in-lesson");
  leaveHome();
  window.scrollTo(0, 0);

  // Everyone lands on the home page; returning learners get a "Continue" button there
  if (view === "home" || !view) return renderHome(app(), route);
  if (view === "lesson" && arg) return openLesson(arg);
  if (view === "test" && arg) return openTest(arg);
  if (view === "talk" && arg) return openTalk(arg);
  if (view === "mtoni" && arg === "go") return openPractice();
  if (view === "courses" || (!p.activeCourse && view !== "boma" && view !== "review")) return page("courses", renderCourses);
  if (view === "mtoni") return page("mtoni", renderRiver);
  if (view === "boma") return page("boma", renderBoma);
  if (view === "review") return page("review", renderReview);
  return page("safari", renderSafari);
}

function page(tab: string, render: (root: HTMLElement) => void): void {
  const root = app();
  root.innerHTML = `${topBar()}<div id="view"></div>${bottomNav(tab)}`;
  render($("#view"));
}

function topBar(): string {
  const p = getProgress();
  const c = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  const label = c ? (c.family === c.nativeName ? c.nativeName : `${c.nativeName}`) : t("chooseLang");
  return `
  <header class="topbar">
    <div class="top-left">
      <a class="top-brand" href="#/home" aria-label="${getLang() === "sw" ? "Nyumbani" : "Home"}" title="${getLang() === "sw" ? "Nyumbani" : "Home"}">${hutIcon(38, "#F4EBDD")}</a>
      <a class="course-pill" href="#/courses">${esc(label)} ▾</a>
    </div>
    <div class="top-stats">
      <span title="${t("fire")}">${hearth(p.streak > 0)} ${p.streak}</span>
      <span title="${t("totalBeads")}">${bead("#B8322A", 18)} ${p.xp}</span>
      <span title="${p.hearts < MAX_HEARTS ? t("nextSip", { t: fmtDuration(msToNextHeart()) }) : t("fullCalabash")}">${calabash(p.hearts)} ${p.hearts}</span>
    </div>
  </header>
  <div class="beadband" aria-hidden="true"></div>`;
}

function bottomNav(active: string): string {
  const u = cloud.currentUser();
  const tabs: [string, string, string][] = [
    ["safari", safariIcon(28), t("safari")],
    ["mtoni", riverIcon(28), t("river")],
    ["boma", bomaIcon(30), t("boma")],
    ...(u && u.role !== "learner" ? [["review", "✍🏾", t("review")] as [string, string, string]] : []),
  ];
  return `<nav class="bottomnav">${tabs.map(([id, ic, label]) =>
    `<a href="#/${id}" class="${active === id ? "active" : ""}"><span>${ic}</span>${label}</a>`).join("")}</nav>`;
}

// ---------- Course picker ----------
function baseToggle(): string {
  const b = getProgress().base;
  return `<div class="seg" role="group" aria-label="${t("iThinkIn")}">
    <span class="seg-label">${t("iThinkIn")}</span>
    <button class="${b === "en" ? "on" : ""}" data-base="en">English</button>
    <button class="${b === "sw" ? "on" : ""}" data-base="sw">Kiswahili</button>
  </div>`;
}

function wireBaseToggle(): void {
  $$<HTMLButtonElement>("[data-base]").forEach((b) => b.addEventListener("click", () => {
    setBase(b.dataset.base as BaseLang);
    route();
  }));
}

function renderCourses(root: HTMLElement): void {
  const p = getProgress();
  const families = new Map<string, Course[]>();
  for (const c of getCourses()) families.set(c.family, [...(families.get(c.family) ?? []), c]);

  root.innerHTML = `
  <section class="page">
    ${baseToggle()}
    <h1>${t("whichLang")}</h1>
    <p class="muted">${t("pickIntro")}</p>
    <div class="course-grid">
      ${[...families.entries()].map(([fam, list]) => {
        const first = list[0];
        const current = list.some((c) => c.code === p.activeCourse);
        if (list.length === 1) {
          const pct = Math.round(courseCompletion(first) * 100);
          return `<button class="course-card ${current ? "current" : ""}" data-code="${first.code}">
            <span class="course-native">${esc(first.nativeName)}</span>
            <span class="course-where">${esc(first.speakers)}</span>
            ${pct ? `<span class="mini-beads">${bead(first.units[0].bead, 14)} ${pct}%</span>` : ""}
          </button>`;
        }
        return `<div class="course-card family ${current ? "current" : ""}">
          <span class="course-native">${esc(fam)}</span>
          <span class="course-where">${esc(first.speakers)}</span>
          <span class="muted small">${t("varieties")}</span>
          <div class="variety-row">${list.map((c) =>
            `<button class="variety ${c.code === p.activeCourse ? "on" : ""}" data-code="${c.code}">${esc(c.name === "General" ? (getLang() === "sw" ? "Jumla" : "General") : c.nativeName)}</button>`).join("")}
          </div>
        </div>`;
      }).join("")}
    </div>
    <p class="muted small">${t("draftsNote")}</p>
  </section>`;
  wireBaseToggle();
  $$<HTMLButtonElement>("[data-code]").forEach((b) => b.addEventListener("click", () => {
    setActiveCourse(b.dataset.code!);
    location.hash = "#/safari";
  }));
}

// ---------- Safari (the journey) ----------
function renderSafari(root: HTMLElement): void {
  const p = getProgress();
  const course = getCourse(p.activeCourse!)!;
  const goalPct = Math.min(100, Math.round((todayXp() / p.dailyGoal) * 100));
  const all = steps(course);
  const here = position(course);
  const guide = GUIDES[course.guide];

  // Each stop's road: its lessons, its conversation, the town gate test, then (at the end of a leg) the fireside.
  type PathItem = { kind: "lesson" | "talk" | "leg" | "gate"; step?: Step };
  const pathOf = (u: Unit): PathItem[] => {
    const items: PathItem[] = [];
    for (const s of all.filter((x) => x.unit === u)) {
      items.push({ kind: s.kind, step: s });
      if (s.kind === "talk") items.push({ kind: "gate" });
    }
    return items;
  };

  // Where the guide stands, in "road position" units: node i is at i, half-way to the next is i + 0.5
  let walker: { unitId: string; v: number } | null = null;
  if (here.step) {
    const items = pathOf(here.step.unit);
    const ri = items.findIndex((x) => x.step?.id === here.step!.id);
    let rj = items.findIndex((x, i) => i > ri && x.kind !== "gate");
    if (rj < 0) rj = items.length;
    walker = { unitId: here.step.unit.id, v: ri + here.fraction * (rj - ri) };
  } else {
    const lastU = course.units[course.units.length - 1];
    walker = { unitId: lastU.id, v: pathOf(lastU).length - 1 + 0.7 };
  }
  const roads: Record<string, ReturnType<typeof road>> = {};

  root.innerHTML = `
  <section class="page safari">
    <div class="card goal">
      <div class="goal-head"><b>${t("todayBeads")}</b><span class="muted small">${todayXp()} / ${p.dailyGoal}</span></div>
      <div class="bar"><div class="bar-fill gold" style="width:${goalPct}%"></div></div>
    </div>
    <div class="journey-head">
      <div class="guide-badge">${guideFigure(course.guide, 34)}</div>
      <div>
        <h1 class="journey-title">${esc(course.nativeName)}${course.name !== course.nativeName && course.name !== "General" ? ` <span class="muted">· ${esc(course.name)}</span>` : ""}</h1>
        <p class="muted small">${esc(L(guide.name))} · ${esc(L(guide.note))}</p>
      </div>
    </div>
    ${course.units.map((u, ui) => {
      const items = pathOf(u);
      const r = road(items.length);
      roads[u.id] = r;
      const done = unitDone(u);
      const best = p.tests[u.id];
      const gateOpen = isUnlocked(course, u.lessons[0].id);
      return `
      <div class="stop">
        <div class="signpost" style="--bead:${u.bead}">
          <div class="post-pin">${pinIcon()}</div>
          <div><span class="post-place">${esc(u.place)}</span>
          <span class="post-unit">${t("unit")} ${ui + 1} · ${esc(L(u.title))}</span></div>
          ${done ? `<span class="post-done">${bead(u.bead, 22)}</span>` : ""}
        </div>
        <div class="route" data-unit="${u.id}" style="height:${r.height}px">
          ${r.svg}
          ${items.map((it, i) => {
            const pt = r.pts[i];
            if (it.kind === "gate") {
              const passed = best !== undefined && best >= 80;
              return `<a class="node k-gate ${passed ? "done" : gateOpen ? "open" : "locked"}" style="left:${pt.x}%;top:${pt.y}%;--bead:${u.bead}" ${gateOpen ? `href="#/test/${u.id}"` : `aria-disabled="true"`}>
                <span class="node-dot">${gateOpen ? flagIcon() : lockIcon()}</span>
                <span class="node-label">${t("gateTest")}${best !== undefined ? ` · ${best}%` : ""}</span>
              </a>`;
            }
            const s = it.step!;
            const isDone = isDoneStep(s.id);
            const open = isUnlocked(course, s.id);
            const cls = isDone ? "done" : s.id === here.step?.id ? "next" : open ? "open" : "locked";
            const icon = isDone ? checkIcon() : !open ? lockIcon() : s.kind === "talk" ? chatIcon() : s.kind === "leg" ? fireIcon() : `<span class="node-num">${u.lessons.indexOf(s.lesson!) + 1}</span>`;
            const label = s.kind === "lesson" ? L(s.lesson!.title) : s.kind === "talk" ? t("talkNode") : t("legNode");
            const href = s.kind === "lesson" ? `#/lesson/${s.id}` : `#/talk/${s.id}`;
            return `<a class="node k-${s.kind} ${cls}" style="left:${pt.x}%;top:${pt.y}%;--bead:${u.bead}" ${open ? `href="${href}"` : `aria-disabled="true"`}>
              <span class="node-dot">${icon}</span>
              <span class="node-label">${esc(label)}</span>
            </a>`;
          }).join("")}
          ${walker && walker.unitId === u.id ? `<div class="walker" id="walker" title="${t("youAreHere")}">${guideFigure(course.guide, 40)}<span class="here-tag">${t("youAreHere")}</span></div>` : ""}
        </div>
      </div>`;
    }).join("")}
    <div class="card">
      <b>${t("meet")}</b>
      <div class="cast">${course.cast.map((c) => `<div class="cast-m"><span class="avatar">${c.avatar}</span><b>${esc(c.name)}</b><span class="muted small">${esc(L(c.role))}</span></div>`).join("")}</div>
    </div>
    <div class="card dialect"><b>${t("aboutCourse")}:</b> ${esc(course.dialectNote)}</div>
  </section>`;

  if (walker) placeWalker(course.code, walker, roads[walker.unitId]);
}

/** Put the guide on the road; if they've moved on since last time, walk them there along the road. */
function placeWalker(code: string, w: { unitId: string; v: number }, r: ReturnType<typeof road>): void {
  const el = document.getElementById("walker");
  if (!el || !r) return;
  // Feet on the centre of the road. The guide stands just short of the stop they're about to do,
  // so its button stays visible, and walks forward as the stop is done.
  const LEAD_PX = 54;   // node radius plus a step, so the guide and their tag never cover the stop
  const set = (v: number) => {
    const pt = r.at(v, LEAD_PX);
    el.style.left = `${pt.x}%`;
    el.style.top = `${pt.y}%`;
  };
  const key = "lugha.walker2";
  let prev: { code: string; unitId: string; v: number } | null = null;
  try { prev = JSON.parse(sessionStorage.getItem(key) ?? "null"); } catch { /* ignore */ }
  try { sessionStorage.setItem(key, JSON.stringify({ code, ...w })); } catch { /* ignore */ }

  const to = w.v;
  let from = to;
  if (prev && prev.code === code) {
    if (prev.unitId === w.unitId && prev.v < to) from = prev.v;
    else if (prev.unitId !== w.unitId) from = -1;   // arriving at a new stop: walk in from the top
  }
  set(from);
  requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: from === to ? "auto" : "smooth" }));
  if (from === to) return;
  el.classList.add("walking");
  const dur = Math.min(2600, 700 + (to - from) * 800);
  const t0 = performance.now();
  const tick = (now: number) => {
    const q = Math.min(1, (now - t0) / dur);
    const e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
    set(from + (to - from) * e);
    if (q < 1) requestAnimationFrame(tick); else el.classList.remove("walking");
  };
  setTimeout(() => requestAnimationFrame(tick), 350);
}

// ---------- Mtoni (the river / practice) ----------
function renderRiver(root: HTMLElement): void {
  const p = getProgress();
  const course = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  const ready = course && weakItems(course, 8).length >= 4;
  root.innerHTML = `
  <section class="page river">
    <div class="river-art">
      <svg viewBox="0 0 220 140" aria-hidden="true">
        <path d="M0 52c40-10 70 6 110 0s70-16 110-6v94H0z" fill="#C9A066"/>
        <path d="M0 74c38-12 74 10 112 2s72-18 108-8v34c-36-8-70 10-108 16S38 104 0 114z" fill="#3A86C8"/>
        <path d="M18 88c14-4 26 2 40 0M92 98c16-5 30 1 46-2M150 82c12-3 24 0 36-2M44 106c12-3 22 1 34-1" fill="none" stroke="#BFE0F5" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M24 72c-2-14 1-26 5-34M30 72c1-12 5-20 10-26M190 64c-1-13 2-23 7-31M197 63c2-10 6-17 11-22" fill="none" stroke="#5E7A3A" stroke-width="2.6" stroke-linecap="round"/>
        <ellipse cx="172" cy="114" rx="14" ry="6" fill="#8E7A63"/><ellipse cx="44" cy="124" rx="10" ry="4.5" fill="#8E7A63"/>
        <g transform="translate(100 64)">${calabash(4, 5, 22).replace('class="ic"', "")}</g>
      </svg>
    </div>
    <h1>${t("wellTitle")}</h1>
    <p class="muted">${ready ? t("wellBody") : t("wellEmpty")}</p>
    <p class="water-line">${calabash(p.hearts, 5, 28)} ${p.hearts} / ${MAX_HEARTS}</p>
    ${ready ? `<a class="btn btn-primary btn-wide" href="#/mtoni/go">${t("startPractice")}</a>` : `<a class="btn btn-primary btn-wide" href="#/safari">${t("goLessons")}</a>`}
  </section>`;
}

// ---------- Boma (homestead / profile) ----------
function renderBoma(root: HTMLElement): void {
  const p = getProgress();
  const u = cloud.currentUser();
  const course = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  const stage = course ? unitsDone(course) : 0;
  const configured = cloud.isConfigured() && cloud.isReady();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { label: d.toLocaleDateString(getLang() === "sw" ? "sw-KE" : undefined, { weekday: "narrow" }), xp: p.dailyXp[k] ?? 0 };
  });
  const maxXp = Math.max(p.dailyGoal, ...week.map((w) => w.xp));
  const slots = course ? course.units.flatMap((un) => un.lessons.map((l) => ({ color: un.bead, filled: (p.completed[l.id] ?? 0) > 0 }))) : [];
  const built = BOMA_PIECES.slice(0, Math.min(stage, BOMA_PIECES.length)).map(L);

  root.innerHTML = `
  <section class="page">
    <h1>${u ? esc(u.name) : t("yourBoma")}</h1>
    <div class="card boma-card">
      ${boma(stage, p.streak > 0)}
      <p class="small">${built.length ? `${t("built")}: ${built.join(" · ")}` : t("bomaEmpty")}</p>
    </div>
    <div class="stats-row">
      <div class="stat"><span class="stat-n">${hearth(p.streak > 0, 24)} ${p.streak}</span><span class="stat-l">${t("fire")}</span></div>
      <div class="stat"><span class="stat-n">${bead("#B8322A", 18)} ${p.xp}</span><span class="stat-l">${t("totalBeads")}</span></div>
      <div class="stat"><span class="stat-n">${Object.keys(p.itemStats).length}</span><span class="stat-l">${t("wordsSeen")}</span></div>
    </div>
    ${course ? `<div class="card"><b>${t("necklace")}</b> <span class="muted small">· ${esc(course.nativeName)}</span>${necklace(slots)}</div>` : ""}
    <div class="card">
      <b>${t("thisWeek")}</b>
      <div class="week">${week.map((w) => `<div class="wk"><div class="wk-bar" style="height:${Math.round((w.xp / maxXp) * 100)}%" title="${w.xp}"></div><span>${w.label}</span></div>`).join("")}</div>
    </div>
    <div class="card settings">
      ${baseToggle()}
      ${toggleRow("speaking", t("speakingSetting"), p.settings.speaking)}
      ${toggleRow("voiceFallback", t("voiceSetting"), p.settings.voiceFallback)}
      <label class="row-label">${t("dailyGoal")}
        <select id="goal">${([[10, "casual"], [20, "regular"], [30, "serious"], [50, "intense"]] as const).map(([g, k]) =>
          `<option value="${g}" ${g === p.dailyGoal ? "selected" : ""}>${g} ${t("beadsEarned")} · ${t(k)}</option>`).join("")}</select>
      </label>
    </div>
    <div class="card" id="account">${accountBlock(configured, u)}</div>
  </section>`;

  wireBaseToggle();
  $$<HTMLInputElement>("[data-setting]").forEach((cb) => cb.addEventListener("change", () => {
    const key = cb.dataset.setting as "speaking" | "voiceFallback";
    setSetting(key, cb.checked);
    if (key === "voiceFallback") audio.setFallback(cb.checked);
    if (key === "speaking" && cb.checked) { setSetting("speakSnoozeUntil", 0); speech.resetRecogniser(); }
  }));
  $<HTMLSelectElement>("#goal").addEventListener("change", (e) => setDailyGoal(+(e.target as HTMLSelectElement).value));
  wireAccount();
}

function toggleRow(key: string, label: string, on: boolean): string {
  return `<label class="toggle-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${on ? "checked" : ""}><span class="switch" aria-hidden="true"></span></label>`;
}

function accountBlock(configured: boolean, u: cloud.CloudUser | null): string {
  if (!configured) {
    return `<b>${t("account")}</b><p class="muted">${t("guest")} ${cloud.isConfigured() ? t("offline") : ""}</p>
      <button class="btn btn-danger btn-small" id="reset">${t("reset")}</button>`;
  }
  if (u) {
    return `<b>${t("account")}</b><p class="muted">${t("signedIn", { e: esc(u.email) })}${u.role !== "learner" ? ` <span class="chip chip-ok">${u.role}</span>` : ""}</p>
      <button class="btn" id="signout">${t("signout")}</button>`;
  }
  return `<b>${t("saveProgress")}</b>
    <p class="muted">${t("saveBody")}</p>
    <form id="auth" class="auth">
      <input name="name" placeholder="${t("name")}" autocomplete="name" class="signup-only">
      <input name="email" type="email" placeholder="${t("email")}" autocomplete="email" required>
      <input name="password" type="password" placeholder="${t("password")}" minlength="6" autocomplete="current-password" required>
      <button class="btn btn-primary btn-wide" type="submit" id="auth-go">${t("createAcc")}</button>
      <button class="link" type="button" id="auth-toggle">${t("haveAcc")}</button>
    </form>`;
}

function wireAccount(): void {
  $("#reset")?.addEventListener("click", () => {
    if (confirm(t("reset") + "?")) { resetLocalProgress(); route(); }
  });
  $("#signout")?.addEventListener("click", async () => { await cloud.signOut(); route(); });
  const form = $<HTMLFormElement>("#auth");
  if (!form) return;
  let mode: "signup" | "signin" = "signup";
  $("#auth-toggle").addEventListener("click", () => {
    mode = mode === "signup" ? "signin" : "signup";
    form.classList.toggle("signin", mode === "signin");
    $("#auth-go").textContent = mode === "signup" ? t("createAcc") : t("signIn");
    $("#auth-toggle").textContent = mode === "signup" ? t("haveAcc") : t("newAcc");
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email")), pw = String(fd.get("password")), name = String(fd.get("name") || "");
    try {
      if (mode === "signup") {
        const r = await cloud.signUp(email, pw, name);
        toast(r === "check-email" ? "📧 ✓" : "✓");
      } else {
        await cloud.signIn(email, pw);
        toast("✓");
      }
    } catch (err) { toast((err as Error).message, "err"); }
  });
}

// ---------- Sessions ----------
function goSafari(): void {
  if (location.hash === "#/safari") route(); else location.hash = "#/safari";
}

function openLesson(lessonId: string): void {
  const p = getProgress();
  const course = getCourse(p.activeCourse ?? "");
  const u = course?.units.find((un) => un.lessons.some((l) => l.id === lessonId));
  const lesson = u?.lessons.find((l) => l.id === lessonId);
  if (!course || !u || !lesson || !isUnlocked(course, lessonId)) { location.hash = "#/safari"; return; }
  document.body.classList.add("in-lesson");
  // wrong-answer options come from words already learned (padded only at the very start)
  const pool = withPadding(course, learnedThrough(course, lesson), 8);
  const story = miniConvo(course, u, lesson);
  startSession({
    mode: "lesson", course, lessonId,
    title: `${u.place} · ${L(lesson.title)}`,
    bead: u.bead,
    exercises: generateLesson(lesson.items, pool, {
      story, speak: canSpeakNow(), realAudio: realAudio(course),
      isNew: (i) => !getProgress().itemStats[i.id], cue: cueFor,
    }),
    onExit: goSafari,
  });
}

const canSpeakNow = () => speakingActive() && (speech.canRecognize() || speech.canRecord());
const realAudio = (course: Course) => (i: Item) => { const src = audio.sourceFor(i, course.code); return src === "recorded" || src === "generated"; };

function openTalk(stepId: string): void {
  const p = getProgress();
  const course = getCourse(p.activeCourse ?? "");
  const st = course && steps(course).find((x) => x.id === stepId);
  if (!course || !st || st.kind === "lesson" || !isUnlocked(course, stepId)) { location.hash = "#/safari"; return; }
  document.body.classList.add("in-lesson");
  const ex = st.kind === "talk" ? stopConvo(course, st.unit) : legConvo(course, st.leg!);
  startSession({
    mode: "talk", course, lessonId: stepId, unit: st.unit,
    title: L((ex as { title: { en: string; sw: string } }).title),
    bead: st.unit.bead,
    exercises: [ex],
    award: st.kind === "leg" ? 30 : 20,
    onExit: goSafari,
  });
}

function openTest(unitId: string): void {
  const p = getProgress();
  const course = getCourse(p.activeCourse ?? "");
  const u = course?.units.find((un) => un.id === unitId);
  if (!course || !u || !isUnlocked(course, u.lessons[0].id)) { location.hash = "#/safari"; return; }
  page("safari", (root) => {
    root.innerHTML = `<section class="page gate-intro">
      <div class="gate-art">🏁</div>
      <h1>${t("gateTest")} · ${esc(u.place)}</h1>
      <p class="muted">${t("testIntro")}</p>
      ${speakingActive() && speech.canRecognize() ? `<p class="small">🎤 ${t("speakInstead")} ✓</p>` : ""}
      ${p.tests[u.id] !== undefined ? `<p class="small">${t("bestScore", { s: p.tests[u.id] })}</p>` : ""}
      <button class="btn btn-primary btn-wide" id="go">${t("startTest")}</button>
      <a class="btn btn-wide" href="#/safari">${t("backSafari")}</a>
    </section>`;
    $("#go").addEventListener("click", () => {
      document.body.classList.add("in-lesson");
      const items = u.lessons.flatMap((l) => l.items);
      startSession({
        mode: "test", course, unit: u,
        title: `${t("gateTest")} · ${u.place}`,
        bead: u.bead,
        exercises: generateTest(items, allItems(course), { speak: canSpeakNow(), realAudio: realAudio(course) }),
        onExit: goSafari,
      });
    });
  });
}

function openPractice(): void {
  const p = getProgress();
  const course = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  if (!course) { location.hash = "#/courses"; return; }
  const weak = weakItems(course, 8);
  if (weak.length < 4) { location.hash = "#/mtoni"; return; }
  document.body.classList.add("in-lesson");
  startSession({
    mode: "practice", course,
    title: `${t("wellTitle")} · ${course.nativeName}`,
    bead: "#2456A4",
    exercises: generatePractice(weak, allItems(course)),
    onExit: () => { location.hash = "#/mtoni"; route(); },
  });
}

// ---------- Sync & boot ----------
async function syncFromCloud(): Promise<void> {
  const remote = await cloud.pullProgress();
  const local = getProgress();
  const merged = remote ? mergeProgress(local, remote) : local;
  saveProgress(merged, false);
  await cloud.pushProgress(merged);
}

async function boot(): Promise<void> {
  setLang(getProgress().base);
  audio.setFallback(getProgress().settings.voiceFallback);
  await audio.loadManifest();
  window.addEventListener("hashchange", route);
  route();
  onProgressChange(() => cloud.pushProgressSoon(getProgress()));

  if (await cloud.initCloud()) {
    const overrides = await cloud.fetchOverrides();
    if (overrides) setOverrides(overrides);
    cloud.onAuthChange(async (u) => {
      if (u) await syncFromCloud();
      if (!document.body.classList.contains("in-lesson")) route();
    });
    if (cloud.currentUser()) await syncFromCloud();
    if (!document.body.classList.contains("in-lesson")) route();
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support optional */ });
  }
}

void boot();
