import * as cloud from "./cloud.js";
import { generateLesson, generatePractice } from "./exercises.js";
import { startSession } from "./lesson.js";
import { renderReview } from "./review.js";
import {
  allItems, allLessons, courseCompletion, getCourse, getCourses, getProgress, isUnlocked, MAX_HEARTS,
  mergeProgress, msToNextHeart, onProgressChange, resetLocalProgress, saveProgress, setActiveCourse,
  setDailyGoal, setOverrides, todayXp, weakItems,
} from "./store.js";
import { $, $$, app, esc, fmtDuration, toast } from "./ui.js";

// ---------- Router ----------
function route(): void {
  const hash = location.hash.replace(/^#\/?/, "");
  const [view, arg] = hash.split("/");
  const p = getProgress();
  document.body.classList.remove("in-lesson");

  if (view === "lesson" && arg) return openLesson(arg);
  if (view === "practice") return openPractice();
  if (view === "courses" || (!p.activeCourse && view !== "profile" && view !== "review")) return page("courses", renderCourses);
  if (view === "profile") return page("profile", renderProfile);
  if (view === "review") return page("review", renderReview);
  return page("learn", renderLearn);
}

function page(tab: string, render: (root: HTMLElement) => void): void {
  const root = app();
  root.innerHTML = `${topBar()}<div id="view"></div>${bottomNav(tab)}`;
  render($("#view"));
}

function topBar(): string {
  const p = getProgress();
  const c = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  return `
  <header class="topbar">
    <a class="course-pill" href="#/courses" title="Change language">${c ? esc(c.nativeName) : "Choose a language"} ▾</a>
    <div class="top-stats">
      <span title="Day streak">🔥 ${p.streak}</span>
      <span title="Total XP">⚡ ${p.xp}</span>
      <span title="${p.hearts < MAX_HEARTS ? `Next heart in ${fmtDuration(msToNextHeart())}` : "Full hearts"}">❤️ ${p.hearts}</span>
    </div>
  </header>`;
}

function bottomNav(active: string): string {
  const u = cloud.currentUser();
  const tabs = [
    ["learn", "🏠", "Learn"],
    ["practice", "🎯", "Practice"],
    ["profile", "👤", "Profile"],
    ...(u && u.role !== "learner" ? [["review", "✍️", "Review"]] : []),
  ];
  return `<nav class="bottomnav">${tabs.map(([id, ic, label]) =>
    `<a href="#/${id}" class="${active === id ? "active" : ""}"><span>${ic}</span>${label}</a>`).join("")}</nav>`;
}

// ---------- Views ----------
function renderCourses(root: HTMLElement): void {
  const p = getProgress();
  root.innerHTML = `
  <section class="page">
    <h1>Which language do you want to learn?</h1>
    <p class="muted">Start with a few minutes a day. You can switch any time, and your progress in each language is kept.</p>
    <div class="course-grid">
      ${getCourses().map((c) => {
        const pct = Math.round(courseCompletion(c) * 100);
        return `<button class="course-card ${p.activeCourse === c.code ? "current" : ""}" data-code="${c.code}">
          <span class="course-native">${esc(c.nativeName)}</span>
          <span class="course-en">${esc(c.name)}</span>
          <span class="course-where">${esc(c.speakers)}</span>
          ${pct ? `<span class="bar small"><span class="bar-fill" style="width:${pct}%"></span></span>` : ""}
        </button>`;
      }).join("")}
    </div>
    <p class="muted small">All lessons are early drafts being checked by native speakers.</p>
  </section>`;
  $$<HTMLButtonElement>(".course-card").forEach((b) => b.addEventListener("click", () => {
    setActiveCourse(b.dataset.code!);
    location.hash = "#/learn";
  }));
}

function renderLearn(root: HTMLElement): void {
  const p = getProgress();
  const course = getCourse(p.activeCourse!)!;
  const goalPct = Math.min(100, Math.round((todayXp() / p.dailyGoal) * 100));
  const lessons = allLessons(course);
  const nextId = lessons.find((l) => !p.completed[l.id])?.id;

  root.innerHTML = `
  <section class="page">
    <div class="card goal">
      <div><b>Daily goal</b><span class="muted small"> ${todayXp()} / ${p.dailyGoal} XP</span></div>
      <div class="bar"><div class="bar-fill gold" style="width:${goalPct}%"></div></div>
    </div>
    ${course.units.map((u, ui) => `
      <div class="unit">
        <div class="unit-head"><span class="unit-icon">${u.icon}</span><div><span class="muted small">Unit ${ui + 1}</span><h2>${esc(u.title)}</h2></div></div>
        <div class="path">
          ${u.lessons.map((l, li) => {
            const done = (p.completed[l.id] ?? 0) > 0;
            const open = isUnlocked(course, l.id);
            const cls = done ? "done" : l.id === nextId ? "next" : open ? "open" : "locked";
            return `<a class="node ${cls}" style="--offset:${[0, 40, 0, -40][li % 4]}px" ${open ? `href="#/lesson/${l.id}"` : `aria-disabled="true"`}>
              <span class="node-dot">${done ? "✓" : open ? "★" : "🔒"}</span>
              <span class="node-label">${esc(l.title)}</span>
            </a>`;
          }).join("")}
        </div>
      </div>`).join("")}
    <div class="card dialect"><b>About this course:</b> ${esc(course.dialectNote)}</div>
  </section>`;
}

function renderProfile(root: HTMLElement): void {
  const p = getProgress();
  const u = cloud.currentUser();
  const configured = cloud.isConfigured() && cloud.isReady();
  const learned = Object.keys(p.itemStats).length;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { label: d.toLocaleDateString(undefined, { weekday: "narrow" }), xp: p.dailyXp[local] ?? 0 };
  });
  const maxXp = Math.max(p.dailyGoal, ...week.map((w) => w.xp));

  root.innerHTML = `
  <section class="page">
    <h1>${u ? esc(u.name) : "Your progress"}</h1>
    <div class="stats-row">
      <div class="stat"><span class="stat-n">🔥 ${p.streak}</span><span class="stat-l">Day streak</span></div>
      <div class="stat"><span class="stat-n">⚡ ${p.xp}</span><span class="stat-l">Total XP</span></div>
      <div class="stat"><span class="stat-n">📚 ${learned}</span><span class="stat-l">Words seen</span></div>
    </div>
    <div class="card">
      <b>This week</b>
      <div class="week">${week.map((w) => `<div class="wk"><div class="wk-bar" style="height:${Math.round((w.xp / maxXp) * 100)}%" title="${w.xp} XP"></div><span>${w.label}</span></div>`).join("")}</div>
    </div>
    <div class="card">
      <label class="row-label">Daily goal
        <select id="goal">${[10, 20, 30, 50].map((g) => `<option value="${g}" ${g === p.dailyGoal ? "selected" : ""}>${g} XP · ${{ 10: "Casual", 20: "Regular", 30: "Serious", 50: "Intense" }[g]}</option>`).join("")}</select>
      </label>
    </div>
    <div class="card" id="account">${accountBlock(configured, u)}</div>
  </section>`;

  $<HTMLSelectElement>("#goal").addEventListener("change", (e) => setDailyGoal(+(e.target as HTMLSelectElement).value));
  wireAccount();
}

function accountBlock(configured: boolean, u: cloud.CloudUser | null): string {
  if (!configured) {
    return `<b>Account</b><p class="muted">You're learning as a guest — progress is saved on this device only.${cloud.isConfigured() ? " (Couldn't reach the server — you may be offline.)" : ""}</p>
      <button class="btn btn-danger btn-small" id="reset">Reset progress on this device</button>`;
  }
  if (u) {
    return `<b>Account</b><p class="muted">Signed in as ${esc(u.email)}${u.role !== "learner" ? ` · <span class="chip chip-ok">${u.role}</span>` : ""}. Your progress syncs across devices.</p>
      <button class="btn" id="signout">Sign out</button>`;
  }
  return `<b>Save your progress</b>
    <p class="muted">Create a free account to keep your streak and continue on any device.</p>
    <form id="auth" class="auth">
      <input name="name" placeholder="Your name" autocomplete="name" class="signup-only">
      <input name="email" type="email" placeholder="Email" autocomplete="email" required>
      <input name="password" type="password" placeholder="Password (6+ characters)" minlength="6" autocomplete="current-password" required>
      <button class="btn btn-primary btn-wide" type="submit" id="auth-go">Create account</button>
      <button class="link" type="button" id="auth-toggle">I already have an account</button>
    </form>`;
}

function wireAccount(): void {
  $("#reset")?.addEventListener("click", () => {
    if (confirm("Reset all progress on this device?")) { resetLocalProgress(); route(); }
  });
  $("#signout")?.addEventListener("click", async () => { await cloud.signOut(); toast("Signed out"); route(); });
  const form = $<HTMLFormElement>("#auth");
  if (!form) return;
  let mode: "signup" | "signin" = "signup";
  $("#auth-toggle").addEventListener("click", () => {
    mode = mode === "signup" ? "signin" : "signup";
    form.classList.toggle("signin", mode === "signin");
    $("#auth-go").textContent = mode === "signup" ? "Create account" : "Sign in";
    $("#auth-toggle").textContent = mode === "signup" ? "I already have an account" : "Create a new account";
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email")), pw = String(fd.get("password")), name = String(fd.get("name") || "");
    try {
      if (mode === "signup") {
        const r = await cloud.signUp(email, pw, name);
        toast(r === "check-email" ? "Check your email to confirm your account" : "Welcome!");
      } else {
        await cloud.signIn(email, pw);
        toast("Signed in");
      }
    } catch (err) { toast((err as Error).message, "err"); }
  });
}

function openLesson(lessonId: string): void {
  const p = getProgress();
  const course = getCourse(p.activeCourse ?? "");
  const lesson = course && allLessons(course).find((l) => l.id === lessonId);
  if (!course || !lesson || !isUnlocked(course, lessonId)) { location.hash = "#/learn"; return; }
  document.body.classList.add("in-lesson");
  startSession({
    mode: "lesson",
    lessonId,
    title: lesson.title,
    exercises: generateLesson(lesson.items, allItems(course)),
    onExit: () => { location.hash = "#/learn"; route(); },
  });
}

function openPractice(): void {
  const p = getProgress();
  const course = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  if (!course) { location.hash = "#/courses"; return; }
  const weak = weakItems(course, 8);
  if (weak.length < 4) {
    page("practice", (root) => {
      root.innerHTML = `<section class="page"><h1>Practice</h1><div class="card"><p>Finish a lesson or two first — practice reviews the words you find hardest.</p><a class="btn btn-primary" href="#/learn">Go to lessons</a></div></section>`;
    });
    return;
  }
  document.body.classList.add("in-lesson");
  startSession({
    mode: "practice",
    title: `Practice · ${course.nativeName}`,
    exercises: generatePractice(weak, allItems(course)),
    onExit: () => { location.hash = "#/learn"; route(); },
  });
}

// ---------- Sync ----------
async function syncFromCloud(): Promise<void> {
  const remote = await cloud.pullProgress();
  const local = getProgress();
  const merged = remote ? mergeProgress(local, remote) : local;
  saveProgress(merged, false);
  await cloud.pushProgress(merged);
}

async function boot(): Promise<void> {
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
