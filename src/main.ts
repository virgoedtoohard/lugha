import { bead, boma, BOMA_PIECES, calabash, hearth, necklace, road } from "./art.js";
import * as cloud from "./cloud.js";
import { generateLesson, generatePractice, sceneExercise } from "./exercises.js";
import { getLang, L, setLang, t } from "./i18n.js";
import { startSession } from "./lesson.js";
import { renderReview } from "./review.js";
import {
  allItems, allLessons, courseCompletion, findItem, getCourse, getCourses, getProgress, isUnlocked, MAX_HEARTS,
  mergeProgress, msToNextHeart, onProgressChange, resetLocalProgress, saveProgress, setActiveCourse, setBase,
  setDailyGoal, setOverrides, todayXp, unitDone, unitsDone, weakItems,
} from "./store.js";
import type { BaseLang, Course } from "./types.js";
import { $, $$, app, esc, fmtDuration, toast } from "./ui.js";

// ---------- Router ----------
const ALIAS: Record<string, string> = { learn: "safari", practice: "kisima", profile: "boma" };

function route(): void {
  const hash = location.hash.replace(/^#\/?/, "");
  let [view, arg] = hash.split("/");
  view = ALIAS[view] ?? view;
  const p = getProgress();
  setLang(p.base);
  document.body.classList.remove("in-lesson");

  if (view === "lesson" && arg) return openLesson(arg);
  if (view === "kisima" && arg === "go") return openPractice();
  if (view === "courses" || (!p.activeCourse && view !== "boma" && view !== "review")) return page("courses", renderCourses);
  if (view === "kisima") return page("kisima", renderWell);
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
    <a class="course-pill" href="#/courses">${esc(label)} ▾</a>
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
    ["safari", "🧭", t("safari")],
    ["kisima", "🪣", t("kisima")],
    ["boma", "🛖", t("boma")],
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
  const nextId = allLessons(course).find((l) => !p.completed[l.id])?.id;

  root.innerHTML = `
  <section class="page safari">
    <div class="card goal">
      <div class="goal-head"><b>${t("todayBeads")}</b><span class="muted small">${todayXp()} / ${p.dailyGoal}</span></div>
      <div class="bar"><div class="bar-fill gold" style="width:${goalPct}%"></div></div>
    </div>
    <h1 class="journey-title">${esc(course.nativeName)}${course.name !== course.nativeName && course.name !== "General" ? ` <span class="muted">· ${esc(course.name)}</span>` : ""}</h1>
    <p class="muted small">${esc(course.speakers)}</p>
    ${course.units.map((u, ui) => {
      const r = road(u.lessons.length);
      const done = unitDone(u);
      return `
      <div class="stop">
        <div class="signpost" style="--bead:${u.bead}">
          <div class="post-pin">📍</div>
          <div><span class="post-place">${esc(u.place)}</span>
          <span class="post-unit">${t("unit")} ${ui + 1} · ${esc(L(u.title))}</span></div>
          ${done ? `<span class="post-done">${bead(u.bead, 22)}</span>` : ""}
        </div>
        <div class="route" style="height:${110 * u.lessons.length + 30}px">
          ${r.svg}
          ${u.lessons.map((l, li) => {
            const isDone = (p.completed[l.id] ?? 0) > 0;
            const open = isUnlocked(course, l.id);
            const cls = isDone ? "done" : l.id === nextId ? "next" : open ? "open" : "locked";
            const pt = r.pts[li];
            return `<a class="node ${cls}" style="left:${pt.x}%;top:${pt.y}%;--bead:${u.bead}" ${open ? `href="#/lesson/${l.id}"` : `aria-disabled="true"`}>
              <span class="node-dot">${isDone ? "✓" : open ? (l.scene ? "📖" : li + 1) : "🔒"}</span>
              <span class="node-label">${esc(L(l.title))}</span>
            </a>`;
          }).join("")}
        </div>
      </div>`;
    }).join("")}
    <div class="card">
      <b>${t("meet")}</b>
      <div class="cast">${course.cast.map((c) => `<div class="cast-m"><span class="avatar">${c.avatar}</span><b>${esc(c.name)}</b><span class="muted small">${esc(L(c.role))}</span></div>`).join("")}</div>
    </div>
    <div class="card dialect"><b>${t("aboutCourse")}:</b> ${esc(course.dialectNote)}</div>
  </section>`;
}

// ---------- Kisima (the well / practice) ----------
function renderWell(root: HTMLElement): void {
  const p = getProgress();
  const course = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  const ready = course && weakItems(course, 8).length >= 4;
  root.innerHTML = `
  <section class="page well">
    <div class="well-art">
      <svg viewBox="0 0 200 140" aria-hidden="true">
        <ellipse cx="100" cy="120" rx="80" ry="12" fill="#C9A066"/>
        <rect x="50" y="62" width="100" height="56" rx="8" fill="#8E7A63"/>
        <path d="M50 76h100M50 92h100M50 108h100M75 62v56M100 62v56M125 62v56" stroke="#6E5D4A" stroke-width="2"/>
        <ellipse cx="100" cy="62" rx="50" ry="10" fill="#3A86C8"/>
        <path d="M58 62V20h84v42" fill="none" stroke="#5A3E28" stroke-width="5"/>
        <path d="M100 20v24" stroke="#7A5A3C" stroke-width="2"/>
        <g transform="translate(92 42)">${calabash(4, 5, 16).replace('class="ic"', "")}</g>
      </svg>
    </div>
    <h1>${t("wellTitle")}</h1>
    <p class="muted">${ready ? t("wellBody") : t("wellEmpty")}</p>
    <p class="water-line">${calabash(p.hearts, 5, 28)} ${p.hearts} / ${MAX_HEARTS}</p>
    ${ready ? `<a class="btn btn-primary btn-wide" href="#/kisima/go">${t("startPractice")}</a>` : `<a class="btn btn-primary btn-wide" href="#/safari">${t("goLessons")}</a>`}
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
      <label class="row-label">${t("dailyGoal")}
        <select id="goal">${([[10, "casual"], [20, "regular"], [30, "serious"], [50, "intense"]] as const).map(([g, k]) =>
          `<option value="${g}" ${g === p.dailyGoal ? "selected" : ""}>${g} ${t("beadsEarned")} · ${t(k)}</option>`).join("")}</select>
      </label>
    </div>
    <div class="card" id="account">${accountBlock(configured, u)}</div>
  </section>`;

  wireBaseToggle();
  $<HTMLSelectElement>("#goal").addEventListener("change", (e) => setDailyGoal(+(e.target as HTMLSelectElement).value));
  wireAccount();
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
function openLesson(lessonId: string): void {
  const p = getProgress();
  const course = getCourse(p.activeCourse ?? "");
  const u = course?.units.find((un) => un.lessons.some((l) => l.id === lessonId));
  const lesson = u?.lessons.find((l) => l.id === lessonId);
  if (!course || !u || !lesson || !isUnlocked(course, lessonId)) { location.hash = "#/safari"; return; }
  document.body.classList.add("in-lesson");
  const pool = allItems(course);
  const story = lesson.scene ? sceneExercise(lesson.scene, course.cast, (id) => findItem(course, id), [...lesson.items, ...pool]) : null;
  startSession({
    mode: "lesson", course, lessonId,
    title: `${u.place} · ${L(lesson.title)}`,
    bead: u.bead,
    exercises: generateLesson(lesson.items, pool, story),
    onExit: () => { location.hash = "#/safari"; route(); },
  });
}

function openPractice(): void {
  const p = getProgress();
  const course = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  if (!course) { location.hash = "#/courses"; return; }
  const weak = weakItems(course, 8);
  if (weak.length < 4) { location.hash = "#/kisima"; return; }
  document.body.classList.add("in-lesson");
  startSession({
    mode: "practice", course,
    title: `${t("wellTitle")} · ${course.nativeName}`,
    bead: "#2456A4",
    exercises: generatePractice(weak, allItems(course)),
    onExit: () => { location.hash = "#/kisima"; route(); },
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
