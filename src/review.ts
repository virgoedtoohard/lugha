// Reviewer panel: native speakers correct draft items, set confidence, and record audio.

import { currentUser, isConfigured, isReady, saveOverride, uploadAudio } from "./cloud.js";
import { allItems, getCourse, getCourses, upsertOverrideLocal } from "./store.js";
import type { Confidence, ContentOverride, Item, ReviewStatus } from "./types.js";
import { $, $$, esc, toast } from "./ui.js";

let courseCode = "kik";
let filter: "all" | "draft" | "low" | "reviewed" = "draft";

export function renderReview(root: HTMLElement): void {
  const u = currentUser();
  if (!isConfigured() || !isReady()) {
    root.innerHTML = `<section class="page"><h1>Review content</h1>
      <div class="card"><p>The review panel needs accounts switched on. Add your Supabase URL and anon key to <code>config.js</code> (see README), then sign in with a reviewer account.</p></div></section>`;
    return;
  }
  if (!u) {
    root.innerHTML = `<section class="page"><h1>Review content</h1><div class="card"><p>Sign in with a reviewer account to edit lessons.</p><a class="btn btn-primary" href="#/profile">Sign in</a></div></section>`;
    return;
  }
  if (u.role === "learner") {
    root.innerHTML = `<section class="page"><h1>Review content</h1><div class="card"><p>Your account (${esc(u.email)}) is a learner account. An admin can make you a reviewer — see “Make someone a reviewer” in the README.</p></div></section>`;
    return;
  }

  const courses = getCourses();
  const course = getCourse(courseCode) ?? courses[0];
  const items = allItems(course).filter((i) =>
    filter === "all" ? true : filter === "draft" ? i.status === "draft" : filter === "reviewed" ? i.status === "reviewed" : i.confidence === "low");
  const total = allItems(course).length;
  const reviewed = allItems(course).filter((i) => i.status === "reviewed").length;

  root.innerHTML = `
  <section class="page review">
    <h1>Review content</h1>
    <p class="muted">Correct each word or phrase, record how a native speaker says it, then mark it reviewed. Learners see your changes straight away.</p>
    <div class="review-controls">
      <select id="rv-course">${courses.map((c) => `<option value="${c.code}" ${c.code === course.code ? "selected" : ""}>${esc(c.family)}${c.family !== c.nativeName ? ` · ${esc(c.name === "General" ? "General" : c.nativeName)}` : ""}</option>`).join("")}</select>
      <select id="rv-filter">
        ${(["draft", "low", "reviewed", "all"] as const).map((f) => `<option value="${f}" ${f === filter ? "selected" : ""}>${{ draft: "Needs review", low: "Low confidence", reviewed: "Reviewed", all: "All items" }[f]}</option>`).join("")}
      </select>
      <button class="btn" id="rv-export">Export JSON</button>
    </div>
    <div class="card dialect"><b>Dialect note:</b> ${esc(course.dialectNote)}</div>
    <div class="bar small"><div class="bar-fill" style="width:${total ? (reviewed / total) * 100 : 0}%"></div></div>
    <p class="muted small">${reviewed} of ${total} items reviewed</p>
    <div id="rv-list">${items.length ? items.map(itemCard).join("") : `<p class="muted">Nothing here — try another filter.</p>`}</div>
  </section>`;

  $<HTMLSelectElement>("#rv-course").addEventListener("change", (e) => { courseCode = (e.target as HTMLSelectElement).value; renderReview(root); });
  $<HTMLSelectElement>("#rv-filter").addEventListener("change", (e) => { filter = (e.target as HTMLSelectElement).value as typeof filter; renderReview(root); });
  $("#rv-export").addEventListener("click", () => exportCourse(course.code));
  $$<HTMLElement>(".rv-item").forEach((card) => wireCard(card, course.code, root));
}

function itemCard(i: Item): string {
  return `
  <div class="card rv-item" data-id="${i.id}">
    <div class="rv-head"><code>${i.id}</code><span class="chip ${i.status === "reviewed" ? "chip-ok" : i.confidence === "low" ? "chip-warn" : ""}">${i.status} · ${i.confidence}</span></div>
    <label>Word / phrase<input name="target" class="target-text" value="${esc(i.target)}"></label>
    <label>English<input name="english" value="${esc(i.english)}"></label>
    <label>Kiswahili<input name="swahili" value="${esc(i.swahili)}"></label>
    <label>Note for learners (optional)<input name="note" value="${esc(i.note ?? "")}"></label>
    <div class="rv-row">
      <label>Confidence<select name="confidence">${(["low", "medium", "high"] as Confidence[]).map((c) => `<option ${c === i.confidence ? "selected" : ""}>${c}</option>`).join("")}</select></label>
      <label>Status<select name="status">${(["draft", "reviewed"] as ReviewStatus[]).map((c) => `<option ${c === i.status ? "selected" : ""}>${c}</option>`).join("")}</select></label>
    </div>
    <div class="rv-audio">
      ${i.audio ? `<audio controls src="${esc(i.audio)}"></audio>` : `<span class="muted small">No audio yet</span>`}
      <button class="btn btn-small" data-act="rec">🎙️ Record</button>
      <label class="btn btn-small">⬆️ Upload<input type="file" accept="audio/*" hidden data-act="file"></label>
    </div>
    <button class="btn btn-primary" data-act="save">Save</button>
  </div>`;
}

function wireCard(card: HTMLElement, course: string, root: HTMLElement): void {
  const id = card.dataset.id!;
  let audioUrl: string | null = card.querySelector("audio")?.getAttribute("src") ?? null;
  let recorder: MediaRecorder | null = null;

  const setAudio = async (blob: Blob) => {
    try {
      toast("Uploading audio…");
      audioUrl = await uploadAudio(id, blob);
      const box = card.querySelector(".rv-audio")!;
      box.querySelector("audio, span")?.replaceWith(Object.assign(document.createElement("audio"), { controls: true, src: audioUrl }));
      toast("Audio uploaded — remember to Save");
    } catch (e) { toast((e as Error).message, "err"); }
  };

  card.querySelector<HTMLButtonElement>('[data-act="rec"]')!.addEventListener("click", async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    if (recorder && recorder.state === "recording") { recorder.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => chunks.push(ev.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        btn.textContent = "🎙️ Record";
        void setAudio(new Blob(chunks, { type: recorder!.mimeType || "audio/webm" }));
      };
      recorder.start();
      btn.textContent = "⏹ Stop";
    } catch { toast("Microphone not available", "err"); }
  });

  card.querySelector<HTMLInputElement>('[data-act="file"]')!.addEventListener("change", (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) void setAudio(f);
  });

  card.querySelector<HTMLButtonElement>('[data-act="save"]')!.addEventListener("click", async () => {
    const val = (n: string) => (card.querySelector(`[name="${n}"]`) as HTMLInputElement).value.trim();
    const o: ContentOverride = {
      item_id: id,
      course_code: course,
      target: val("target") || null,
      english: val("english") || null,
      swahili: val("swahili") || null,
      note: val("note") || null,
      audio_url: audioUrl,
      status: val("status") as ReviewStatus,
      confidence: val("confidence") as Confidence,
    };
    try {
      await saveOverride(o);
      upsertOverrideLocal(o);
      toast("Saved");
      renderReview(root);
    } catch (e) { toast((e as Error).message, "err"); }
  });
}

function exportCourse(code: string): void {
  const course = getCourse(code);
  if (!course) return;
  const blob = new Blob([JSON.stringify(course, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${code}-course.json` });
  a.click();
  URL.revokeObjectURL(a.href);
}
