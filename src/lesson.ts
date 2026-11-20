import { bead, calabash, hearth } from "./art.js";
import * as audio from "./audio.js";
import { checkTyped, meaning, shuffle, tokens } from "./exercises.js";
import { L, t } from "./i18n.js";
import * as speech from "./speech.js";
import {
  addXp, completeLesson, gainHeart, getProgress, loseHeart, MAX_HEARTS, msToNextHeart, recordAnswer, recordTest,
  saveProgress, setPartial, snoozeSpeaking, speakingActive,
} from "./store.js";
import type { CastMember, Course, Exercise, Item, Line, Turn, Unit, VoiceProfile } from "./types.js";
import { $, $$, app, esc, fmtDuration, toast } from "./ui.js";

type Mode = "lesson" | "practice" | "test" | "talk";

interface Session {
  mode: Mode;
  course: Course;
  unit?: Unit;
  lessonId?: string;
  title: string;
  bead: string;
  queue: Exercise[];
  pos: number;
  total: number;
  questions: number;     // original number of questions (for test scoring)
  mistakes: number;
  correct: number;
  retried: Set<Exercise>;
  started: number;
  sub: number;           // progress through a conversation exercise (0..1)
  award: number;         // beads for finishing a conversation session
  onExit: () => void;
}

let s: Session | null = null;

export function startSession(opts: { mode: Mode; course: Course; unit?: Unit; lessonId?: string; title: string; bead: string; exercises: Exercise[]; award?: number; onExit: () => void }): void {
  if (opts.mode === "lesson" && getProgress().hearts <= 0) { emptyCalabash(opts.onExit); return; }
  const usable = opts.exercises.filter((e) => e.kind !== "speak" || speech.canRecognize() || speech.canRecord());
  s = { ...opts, queue: usable, pos: 0, total: usable.length, questions: usable.length, mistakes: 0, correct: 0, retried: new Set(), started: Date.now(), sub: 0, award: opts.award ?? 0 };
  renderExercise();
}

// ---------- helpers ----------
const code = () => s!.course.code;
const playItem = (it: Item, slow = false) => audio.play(it, code(), slow);

// ---------- Tap a line to hear it, in that speaker's voice ----------
const YOU: VoiceProfile = { gender: "f", age: "adult" };
const voiceOf = (cast: CastMember[], key: string): VoiceProfile => key === "you" ? YOU : cast.find((c) => c.key === key)?.voice ?? YOU;

/** A spoken line: the words are a button; tapping plays them in the speaker's voice. */
function lineButton(text: string, canPlay: boolean): string {
  return canPlay
    ? `<button class="say-line target-text" aria-label="${esc(t("playSound"))}: ${esc(text)}"><span>${esc(text)}</span><svg class="say-ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>`
    : `<span class="target-text bubble-line">${esc(text)}</span>`;
}

/** A conversation line: tap the line to hear it; words not learned yet are dotted, tap one for its meaning. */
function convoLine(l: Line, canPlay: boolean, known: Set<string>, glossary: Record<string, { en: string; sw: string }>): string {
  const words = l.target.split(/\s+/).map((w) => {
    const k = convoWordKey(w);
    if (!k || known.has(k)) return `<span class="w">${esc(w)}</span>`;
    const g = glossary[k];
    const meaning = g ? L(g) : t("partOf", { p: lineMeaning(l) });
    return `<button class="w new-word" data-gloss="${esc(meaning)}" aria-label="${esc(w)}: ${esc(meaning)}">${esc(w)}</button>`;
  }).join(" ");
  const icon = `<svg class="say-ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  return `<span class="say-line target-text${canPlay ? " playable" : ""}">${words}${canPlay ? `<button class="say-btn" aria-label="${esc(t("playSound"))}: ${esc(l.target)}">${icon}</button>` : ""}</span>`;
}
const convoWordKey = (w: string) => w.toLowerCase().replace(/[?!.,;:“”"]/g, "").trim();

function showGloss(btn: HTMLElement): void {
  document.querySelectorAll(".gloss-pop").forEach((g) => g.remove());
  const pop = document.createElement("span");
  pop.className = "gloss-pop";
  pop.setAttribute("role", "status");
  pop.innerHTML = `<b>${esc(btn.textContent ?? "")}</b> · ${esc(btn.dataset.gloss ?? "")}`;
  // show it under the line, so the sentence itself doesn't reflow
  const line = btn.closest(".say-line");
  (line ?? btn).after(pop);
  setTimeout(() => pop.remove(), 4000);
}

async function speakIn(el: Element | null, item: Item | undefined, text: string, voice: VoiceProfile): Promise<void> {
  document.querySelectorAll(".bubble.speaking").forEach((b) => b.classList.remove("speaking"));
  const bubbleEl = el?.closest(".bubble");
  bubbleEl?.classList.add("speaking");
  await audio.play(item, code(), false, voice, text);
  bubbleEl?.classList.remove("speaking");
}
const speakerBtn = (it: Item, id = "speak") =>
  audio.hasAudio(it, code()) ? `<button class="speak" id="${id}" aria-label="${t("playSound")}" title="${audio.sourceFor(it, code()) === "approx" ? t("approxNote") : t("playSound")}">🔊</button>` : "";

function draftChip(items: Item[]): string {
  const drafts = items.filter((i) => i.status === "draft");
  if (!drafts.length) return "";
  const low = drafts.some((i) => i.confidence === "low");
  return `<span class="chip ${low ? "chip-warn" : ""}" title="${t("draftTip")}">${low ? t("draftLow") : t("draft")}</span>`;
}

function approxChip(items: Item[]): string {
  return items.some((i) => audio.sourceFor(i, code()) === "approx") ? `<span class="chip chip-voice" title="${t("approxNote")}">🔈 ${t("approxNote").split(".")[0]}</span>` : "";
}

/** Progress shown as beads being threaded onto a string. */
function beadString(): string {
  const n = Math.min(Math.max(s!.total, s!.mode === "talk" ? 10 : 1), 16);
  const done = Math.round(((s!.pos + s!.sub) / s!.total) * n);
  return `<div class="thread" aria-label="${s!.pos} / ${s!.total}">${Array.from({ length: n }, (_, i) =>
    `<span class="tb ${i < done ? "on" : ""}" style="--c:${s!.bead}"></span>`).join("")}</div>`;
}

function shell(inner: string, items: Item[], canSpeakAnswer = false): string {
  const p = getProgress();
  const right = s!.mode === "lesson" ? `<span class="water" title="${t("calabash")}">${calabash(p.hearts)} ${p.hearts}</span>`
    : s!.mode === "test" ? `<span class="water">🏁</span>` : s!.mode === "talk" ? `<span class="water">💬</span>` : `<span class="water">🪣</span>`;
  const micOffer = canSpeakAnswer && speakingActive() && speech.canRecognize()
    ? `<button class="mic-offer" id="mic-offer">🎤 ${t("speakInstead")}</button>` : "";
  return `
  <div class="lesson">
    <header class="lesson-top">
      <button class="icon-btn" id="quit" aria-label="${t("leave")}">✕</button>
      ${beadString()}
      ${right}
    </header>
    <main class="lesson-body">
      <div class="chips">${draftChip(items)}${approxChip(items)}</div>
      ${inner}
      ${micOffer}
      <div id="spoken" class="spoken" hidden></div>
    </main>
    <footer class="lesson-foot" id="foot">
      <button class="btn btn-primary btn-wide" id="check" disabled>${t("check")}</button>
    </footer>
  </div>`;
}

const optBtn = (o: string, i: number, isTarget: boolean) =>
  `<button class="opt ${isTarget ? "target-text" : ""}" data-v="${esc(o)}"><kbd>${i + 1}</kbd>${esc(o)}</button>`;

// ---------- rendering ----------
function renderExercise(): void {
  if (!s) return;
  if (s.pos >= s.queue.length) { finish(); return; }
  audio.stop();
  const ex = s.queue[s.pos];
  const root = app();
  switch (ex.kind) {
    case "choose": {
      const toBase = ex.direction === "to-base";
      root.innerHTML = shell(`
        <h2 class="ex-title">${toBase ? t("whatMeans") : t("howSay")}</h2>
        <div class="prompt">
          ${toBase ? speakerBtn(ex.item) : ""}
          <span class="${toBase ? "target-text" : ""}">${esc(ex.prompt)}</span>
        </div>
        <div class="options">${ex.options.map((o, i) => optBtn(o, i, !toBase)).join("")}</div>
      `, [ex.item], !toBase);
      selectable(ex.answer, ex.item);
      $("#speak")?.addEventListener("click", () => playItem(ex.item));
      if (toBase) void playItem(ex.item);
      if (!toBase) offerSpokenAnswer(ex.item);
      break;
    }
    case "listen": {
      root.innerHTML = shell(`
        <h2 class="ex-title">${t("hear")}</h2>
        <div class="prompt center">
          <button class="speak speak-big" id="speak" aria-label="${t("playSound")}">🔊</button>
          <button class="speak speak-slow" id="slow" aria-label="${t("listenSlow")}">🐢</button>
        </div>
        <div class="options">${ex.options.map((o, i) => optBtn(o, i, true)).join("")}</div>
      `, [ex.item]);
      selectable(ex.item.target, ex.item);
      $("#speak").addEventListener("click", () => playItem(ex.item));
      $("#slow").addEventListener("click", () => playItem(ex.item, true));
      void playItem(ex.item);
      break;
    }
    case "speak": {
      renderSpeak(ex.item);
      break;
    }
    case "convo": {
      renderConvo(ex);
      break;
    }
    case "teach": {
      renderTeach(ex.item, ex.cue);
      break;
    }
    case "scene": {
      const who = (k: string) => ex.cast.find((c) => c.key === k);
      root.innerHTML = shell(`
        <div class="scene-tag">📖 ${t("story")} · ${esc(L(ex.scene.setting))}</div>
        <div class="chat">
          ${ex.lines.map((l, i) => {
            const c = who(l.who);
            const mine = l.who === "you";
            return `<div class="bubble-row ${mine ? "mine" : ""}">
              ${mine ? "" : `<span class="avatar" title="${esc(c ? `${c.name} · ${L(c.role)}` : "")}">${c?.avatar ?? "🙂"}</span>`}
              <div class="bubble">${mine ? "" : `<span class="who">${esc(c?.name ?? "")}</span>`}
                <span data-line="${i}">${lineButton(l.item.target, audio.hasAudio(l.item, code()))}</span>
                <button class="peek">${esc(meaning(l.item))}</button>
              </div></div>`;
          }).join("")}
          <div class="bubble-row mine"><div class="bubble ghost">…</div></div>
        </div>
        <h2 class="ex-title small-title">${t("whatReply")}</h2>
        <div class="options">${ex.options.map((o, i) => optBtn(o, i, true)).join("")}</div>
      `, [ex.answer, ...ex.lines.map((l) => l.item)], true);
      selectable(ex.answer.target, ex.answer);
      $$<HTMLButtonElement>(".peek").forEach((b) => b.addEventListener("click", () => b.classList.toggle("shown")));
      $$<HTMLElement>("[data-line] .say-line").forEach((b) => b.addEventListener("click", () => {
        const l = ex.lines[+(b.parentElement as HTMLElement).dataset.line!];
        void speakIn(b, l.item, l.item.target, voiceOf(ex.cast, l.who));
      }));
      // Play the conversation aloud, line by line, each in its speaker's voice
      void (async () => {
        const rows = $$<HTMLElement>("[data-line]");
        for (const [i, l] of ex.lines.entries()) { if (s?.queue[s.pos] !== ex) return; await speakIn(rows[i], l.item, l.item.target, voiceOf(ex.cast, l.who)); }
      })();
      offerSpokenAnswer(ex.answer);
      break;
    }
    case "type": {
      root.innerHTML = shell(`
        <h2 class="ex-title">${t("typeIn")} ${esc(s.course.nativeName)}</h2>
        <div class="prompt">${esc(meaning(ex.item))}</div>
        <input class="type-input target-text" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" />
        <p class="hint">${t("accentsHint")}</p>
      `, [ex.item], true);
      const input = $<HTMLInputElement>("#answer");
      const check = $<HTMLButtonElement>("#check");
      input.focus();
      input.addEventListener("input", () => { check.disabled = !input.value.trim(); });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) check.click(); });
      check.addEventListener("click", () => {
        const v = checkTyped(input.value, ex.item.target);
        input.disabled = true;
        answer(v !== "wrong", ex.item, v === "accents" ? `${t("watchAccents")} <b class="target-text">${esc(ex.item.target)}</b>` : undefined);
      });
      offerSpokenAnswer(ex.item);
      break;
    }
    case "build": {
      root.innerHTML = shell(`
        <h2 class="ex-title">${t("buildTitle")}</h2>
        <div class="prompt">${esc(meaning(ex.item))}</div>
        <div class="build-answer" id="built"></div>
        <div class="bank" id="bank">${ex.bank.map((w, i) => `<button class="word target-text" data-i="${i}">${esc(w)}</button>`).join("")}</div>
      `, [ex.item], true);
      const built: number[] = [];
      const check = $<HTMLButtonElement>("#check");
      const draw = () => {
        $("#built").innerHTML = built.map((i) => `<button class="word target-text" data-i="${i}">${esc(ex.bank[i])}</button>`).join("");
        $$<HTMLButtonElement>("#bank .word").forEach((b) => { b.classList.toggle("used", built.includes(+b.dataset.i!)); });
        $$<HTMLButtonElement>("#built .word").forEach((b) => b.addEventListener("click", () => { built.splice(built.indexOf(+b.dataset.i!), 1); draw(); }));
        check.disabled = !built.length;
      };
      $$<HTMLButtonElement>("#bank .word").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.i!;
        if (!built.includes(i)) { built.push(i); draw(); }
      }));
      check.addEventListener("click", () => {
        const said = built.map((i) => ex.bank[i]).join(" ");
        answer(checkTyped(said, tokens(ex.item.target).join(" ")) !== "wrong", ex.item);
      });
      offerSpokenAnswer(ex.item);
      break;
    }
    case "match": {
      const left = shuffle(ex.items), right = shuffle(ex.items);
      root.innerHTML = shell(`
        <h2 class="ex-title">${t("matchTitle")}</h2>
        <div class="match">
          <div class="col">${left.map((it) => `<button class="opt tile target-text" data-id="${it.id}" data-side="l">${esc(it.target)}</button>`).join("")}</div>
          <div class="col">${right.map((it) => `<button class="opt tile" data-id="${it.id}" data-side="r">${esc(meaning(it))}</button>`).join("")}</div>
        </div>
      `, ex.items);
      let picked: HTMLButtonElement | null = null;
      let matched = 0, slips = 0;
      $$<HTMLButtonElement>(".tile").forEach((b) => b.addEventListener("click", () => {
        if (b.classList.contains("done")) return;
        const item = ex.items.find((i) => i.id === b.dataset.id);
        if (b.dataset.side === "l" && item) void playItem(item);
        if (!picked || picked.dataset.side === b.dataset.side) {
          picked?.classList.remove("sel");
          picked = b; b.classList.add("sel");
          return;
        }
        if (picked.dataset.id === b.dataset.id) {
          picked.classList.remove("sel");
          picked.classList.add("done"); b.classList.add("done");
          matched++;
          if (item) recordAnswer(item.id, true);
          if (matched === ex.items.length) setTimeout(() => answer(true, ex.items[0], slips ? `${slips} ×` : undefined, { skipRecord: true }), 250);
        } else {
          slips++;
          const a = picked, c = b;
          a.classList.add("bad"); c.classList.add("bad");
          setTimeout(() => { a.classList.remove("bad", "sel"); c.classList.remove("bad"); }, 450);
        }
        picked = null;
      }));
      break;
    }
  }
  $("#quit").addEventListener("click", confirmQuit);
}

// ---------- studying a new word ----------
function renderTeach(item: Item, cue?: string): void {
  const phrase = item.target.trim().split(/\s+/).length > 1;
  const canPlay = audio.hasAudio(item, code());
  app().innerHTML = shell(`
    <div class="teach">
      <span class="chip chip-new">${phrase ? t("newPhrase") : t("newWord")}</span>
      ${cue ? `<div class="teach-cue" aria-hidden="true">${cue}</div>` : ""}
      <div class="teach-word">
        <span class="target-text">${esc(item.target)}</span>
        ${canPlay ? `<div class="teach-play"><button class="speak" id="speak" aria-label="${t("playSound")}">🔊</button><button class="speak speak-slow" id="slow" aria-label="${t("listenSlow")}">🐢</button></div>` : ""}
      </div>
      <div class="teach-mean">${esc(meaning(item))}</div>
      ${item.note ? `<p class="teach-note">💡 ${esc(item.note)}</p>` : ""}
      ${canPlay ? `<p class="hint">${t("studyHint")}</p>` : ""}
    </div>
  `, [item]);
  const foot = $("#foot");
  foot.innerHTML = `<button class="btn btn-primary btn-wide" id="got">${t("gotIt")} →</button>`;
  $("#speak")?.addEventListener("click", () => playItem(item));
  $("#slow")?.addEventListener("click", () => playItem(item, true));
  void playItem(item);
  const next = () => { document.removeEventListener("keydown", onKey); if (!s) return; s.pos++; savePartial(); renderExercise(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); next(); } };
  setTimeout(() => document.addEventListener("keydown", onKey), 50);
  $("#got").addEventListener("click", next);
  $("#got").focus();
  $("#quit").addEventListener("click", confirmQuit);
}

// ---------- speaking ----------
/** Turn a recogniser error into a plain message; remember phones that can't recognise speech at all. */
function micMessage(err: unknown): { text: string; hard: boolean } {
  const code = (err as Error)?.message ?? "error";
  if (code === "not-allowed") return { text: t("micBlocked"), hard: false };
  if (code === "network") return { text: t("srNetwork"), hard: false };
  if (code === "audio-capture") return { text: t("srNoMic"), hard: false };
  if (speech.isHardError(code)) { speech.markBroken(code); return { text: t("srUnavailable"), hard: true }; }
  if (code === "start-failed") return { text: t("tryAgain"), hard: false };
  return { text: t("srFailed", { e: code }), hard: false };
}

function micButton(label: string): string {
  return `<button class="mic" id="mic" aria-label="${esc(label)}"><svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>`;
}

function renderSpeak(item: Item): void {
  const recognise = speech.canRecognize();
  app().innerHTML = shell(`
    <h2 class="ex-title">${t("sayThis")}</h2>
    <div class="prompt say">
      ${speakerBtn(item)}
      ${audio.hasAudio(item, code()) ? `<button class="speak speak-slow" id="slow" aria-label="${t("listenSlow")}">🐢</button>` : ""}
      <div><span class="target-text say-word">${esc(item.target)}</span><span class="say-mean">${esc(meaning(item))}</span></div>
    </div>
    <div class="mic-zone">
      ${micButton(t("tapMic"))}
      <p class="mic-status" id="mic-status">${recognise ? t("tapMic") : t("recordTap")}</p>
      <div id="compare"></div>
    </div>
  `, [item]);
  $("#speak")?.addEventListener("click", () => playItem(item));
  $("#slow")?.addEventListener("click", () => playItem(item, true));
  void playItem(item);

  // Footer: "Can't speak now" instead of Check
  const foot = $("#foot");
  foot.innerHTML = `<button class="btn btn-wide btn-ghost" id="cant">${t("cantSpeak")}</button>`;
  $("#cant").addEventListener("click", () => {
    snoozeSpeaking();
    toast(t("snoozed"));
    // drop the remaining speaking turns from this session
    s!.queue = s!.queue.filter((e, i) => i <= s!.pos || e.kind !== "speak");
    s!.total = s!.queue.length;
    s!.pos++;
    renderExercise();
  });

  const status = $("#mic-status");
  const mic = $<HTMLButtonElement>("#mic");
  let attempts = 0;

  if (recognise) {
    mic.addEventListener("click", async () => {
      if (mic.classList.contains("live")) return;
      audio.stop();
      mic.classList.add("live");
      status.textContent = t("listening");
      try {
        const heard = await speech.listen().done;
        mic.classList.remove("live");
        attempts++;
        if (!heard.length) { status.textContent = t("heardNothing"); return; }
        const best = speech.bestMatch(heard, item.target);
        // score straight away; a missed word is retried later and costs no water,
        // because the recogniser only knows Kiswahili and English
        status.textContent = "";
        if (speech.passes(best.score, item.target)) answer(true, item, `🎤 ${t("weHeard", { h: esc(best.heard) })}`);
        else answer(false, item, `🎤 ${t("weHeard", { h: esc(best.heard) })} · ${t("notTheWord")}`, { noHeart: true });
      } catch (e) {
        mic.classList.remove("live");
        const m = micMessage(e);
        status.textContent = m.text;
        // this phone can't check speech: switch this turn to record-and-compare
        if (m.hard && speech.canRecord()) setTimeout(() => { if (s?.queue[s.pos]?.kind === "speak") renderSpeak(item); }, 1800);
        else if (m.hard) showSelfCheck(item, false);
      }
    });
  } else {
    // No recogniser on this phone: one tap records, it stops by itself, and the take is scored at once
    mic.addEventListener("click", async () => {
      if (mic.classList.contains("live")) return;
      audio.stop();
      mic.classList.add("live");
      status.textContent = t("sayingNow");
      try {
        const take = await speech.recordTake(6000, (lv) => mic.style.setProperty("--lv", String(lv)));
        mic.classList.remove("live");
        const verdict = speech.judgeTake(take, item.target);
        if (verdict === "silent") { status.textContent = t("heardNothing"); return; }
        status.textContent = "";
        const replay = `<div class="compare-row">
          <button class="btn btn-small" id="play-mine">▶ ${t("yours")}</button>
          <button class="btn btn-small" id="play-model">▶ ${t("model")}</button></div>`;
        if (verdict === "ok") answer(true, item, `🎤 ${t("voiceChecked")}${replay}`);
        else answer(false, item, `🎤 ${t(verdict === "short" ? "tooShort" : "tooLong")}${replay}`, { noHeart: true });
        $("#play-mine")?.addEventListener("click", () => audio.playUrl(take.url));
        $("#play-model")?.addEventListener("click", () => playItem(item));
      } catch {
        mic.classList.remove("live");
        status.textContent = t("micBlocked");
      }
    });
  }
}

/** Buttons for the learner to judge themselves (no recogniser, or recogniser unsure). */
function showSelfCheck(item: Item, includeNotYet: boolean): void {
  const foot = $("#foot");
  foot.innerHTML = `<div class="self-check">
      <button class="btn btn-primary" id="said-right">✓ ${t("saidRight")}</button>
      ${includeNotYet ? `<button class="btn" id="not-yet">${t("notYet")}</button>` : ""}
    </div>
    <button class="link" id="cant">${t("cantSpeak")}</button>`;
  $("#said-right").addEventListener("click", () => answer(true, item));
  $("#not-yet")?.addEventListener("click", () => skipSpeak(item));
  $("#cant").addEventListener("click", () => { snoozeSpeaking(); toast(t("snoozed")); skipSpeak(item); });
}

/** A speaking turn that didn't work out: no penalty, move on. */
function skipSpeak(item: Item): void {
  const foot = $("#foot");
  foot.className = "lesson-foot";
  foot.innerHTML = `<div class="feedback"><div class="fb-head">🗣️ ${t("keepPractising")}</div>
    <div class="solution"><b class="target-text">${esc(item.target)}</b> = ${esc(meaning(item))}</div></div>
    <button class="btn btn-primary btn-wide" id="next">${t("cont")}</button>`;
  $("#next").addEventListener("click", () => { if (!s) return; s.pos++; renderExercise(); });
}

/** On recall questions: let the learner say the answer instead of tapping or typing it. */
function offerSpokenAnswer(expected: Item): void {
  const btn = $<HTMLButtonElement>("#mic-offer");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const box = $("#spoken");
    box.hidden = false;
    btn.disabled = true;
    box.innerHTML = `<div class="mic-zone inline">${micButton(t("tapMic"))}<p class="mic-status" id="sp-status">${t("listening")}</p>
      <button class="link" id="back-tap">${t("typeInstead")}</button></div>`;
    $("#back-tap").addEventListener("click", () => { box.hidden = true; btn.disabled = false; });
    const mic = $<HTMLButtonElement>("#mic");
    const run = async () => {
      mic.classList.add("live");
      $("#sp-status").textContent = t("listening");
      try {
        const heard = await speech.listen().done;
        mic.classList.remove("live");
        if (!heard.length) { $("#sp-status").textContent = t("heardNothing"); return; }
        const best = speech.bestMatch(heard, expected.target);
        $$<HTMLButtonElement>(".opt, .word, #answer, #check").forEach((b) => { (b as HTMLButtonElement).disabled = true; });
        box.hidden = true;
        if (speech.passes(best.score, expected.target)) answer(true, expected, `🎤 ${t("weHeard", { h: esc(best.heard) })}`);
        else answer(false, expected, `🎤 ${t("weHeard", { h: esc(best.heard) })} · ${t("notTheWord")}`, { noHeart: true });
      } catch (e) {
        mic.classList.remove("live");
        const m = micMessage(e);
        $("#sp-status").textContent = m.text;
        if (m.hard) { btn.hidden = true; setTimeout(() => { box.hidden = true; }, 2500); }
      }
    };
    mic.addEventListener("click", () => { if (!mic.classList.contains("live")) void run(); });
    void run();
  });
}

// ---------- conversations ----------
const lineMeaning = (l: Line) => (getLangSafe() === "sw" ? l.swahili || l.english : l.english);
function getLangSafe(): string { return document.documentElement.lang === "sw" ? "sw" : "en"; }

function savePartial(): void {
  if (!s || !s.lessonId || (s.mode !== "lesson" && s.mode !== "talk")) return;
  setPartial(s.lessonId, Math.min(0.99, (s.pos + s.sub) / Math.max(1, s.total)));
}

function refreshThread(): void {
  const th = document.querySelector(".thread");
  if (th) th.outerHTML = beadString();
}

function playLine(l: Line, voice: VoiceProfile = YOU, el?: Element | null): Promise<void> {
  return speakIn(el ?? null, l.item, l.target, voice);
}

function hasNewWords(ex: Extract<Exercise, { kind: "convo" }>): boolean {
  const known = new Set(ex.known);
  return ex.turns.some((x) => {
    const l = x.type === "say" ? x.line : x.type === "reply" ? x.answer : null;
    return !!l && l.target.split(/\s+/).some((w) => convoWordKey(w) && !known.has(convoWordKey(w)));
  });
}

function renderConvo(ex: Extract<Exercise, { kind: "convo" }>): void {
  const who = (k: string) => ex.cast.find((c) => c.key === k);
  const replies = ex.turns.filter((x) => x.type === "reply").length;
  let ti = 0, answered = 0;
  const lineItems = ex.turns.flatMap((x) => x.type === "say" ? (x.line.item ? [x.line.item] : []) : x.type === "reply" && x.answer.item ? [x.answer.item] : []);
  app().innerHTML = shell(`
    <div class="scene-tag">${ex.big ? "🔥" : "💬"} ${esc(L(ex.title))} · ${esc(L(ex.setting))}</div>
    <p class="hear-hint">${lineItems.some((i) => audio.hasAudio(i, code())) || audio.hasAudio(undefined, code()) ? `🔈 ${t("tapToHear")}` : t("noVoice")}${hasNewWords(ex) ? ` · <span class="new-hint">${t("tapNewWord")}</span>` : ""}</p>
    <div class="chat convo" id="chat"></div>
    <div id="reply"></div>
  `, lineItems);
  const chat = $("#chat");
  const foot = $("#foot");
  foot.innerHTML = "";

  const bubble = (html: string, mine = false, k?: string) => {
    const c = k ? who(k) : undefined;
    const row = document.createElement("div");
    row.className = `bubble-row ${mine ? "mine" : ""} pop`;
    row.innerHTML = `${!mine && c ? `<span class="avatar" title="${esc(`${c.name} · ${L(c.role)}`)}">${c.avatar}</span>` : ""}<div class="bubble">${!mine && c ? `<span class="who">${esc(c.name)}</span>` : ""}${html}</div>`;
    chat.appendChild(row);
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return row;
  };
  const known = new Set(ex.known);
  const sayHtml = (l: Line) => `${convoLine(l, audio.hasAudio(l.item, code()), known, ex.glossary)}<button class="peek">${esc(lineMeaning(l))}</button>`;
  const wire = (row: HTMLElement, l: Line, voice: VoiceProfile) => {
    const line = row.querySelector<HTMLElement>(".say-line");
    line?.addEventListener("click", (e) => {
      const nw = (e.target as HTMLElement).closest<HTMLElement>(".new-word");
      if (nw) { e.stopPropagation(); showGloss(nw); return; }
      if (line.classList.contains("playable")) void playLine(l, voice, row);
    });
    row.querySelector(".peek")?.addEventListener("click", (e) => (e.currentTarget as HTMLElement).classList.toggle("shown"));
  };

  const next = async (): Promise<void> => {
    if (!s || s.queue[s.pos] !== ex) return;
    if (ti >= ex.turns.length) return done();
    const turn = ex.turns[ti];
    if (turn.type === "say") {
      const row = bubble(sayHtml(turn.line), false, turn.who);
      const v = voiceOf(ex.cast, turn.who);
      wire(row, turn.line, v);
      ti++;
      await Promise.race([playLine(turn.line, v, row), new Promise((r) => setTimeout(r, 4000))]);
      await new Promise((r) => setTimeout(r, 350));
      return next();
    }
    if (turn.type === "narrate") {
      const row = document.createElement("div");
      row.className = "narration pop";
      row.innerHTML = `${turn.cue ? `<span class="cue">${turn.cue}</span>` : ""}<span>${esc(L(turn.text))}</span>`;
      chat.appendChild(row);
      ti++;
      await new Promise((r) => setTimeout(r, 700));
      return next();
    }
    askReply(turn);
  };

  const askReply = (turn: Extract<Turn, { type: "reply" }>) => {
    if ((window as any).__LUGHA_TEST__) (window as any).__answer = turn.answer.target;
    const box = $("#reply");
    box.innerHTML = `
      ${turn.cue || turn.prompt ? `<div class="reply-cue">${turn.cue ? `<span class="cue big">${turn.cue}</span>` : ""}${turn.prompt ? `<span>${esc(L(turn.prompt))}</span>` : ""}</div>` : ""}
      <h2 class="ex-title small-title">${t("whatReply")}</h2>
      <div class="options">${turn.options.map((o, i) => optBtn(o, i, true)).join("")}</div>
      ${speakingActive() && speech.canRecognize() ? `<button class="mic-offer" id="convo-mic">🎤 ${t("speakInstead")}</button><p class="mic-status small" id="convo-mic-status"></p>` : ""}`;
    foot.className = "lesson-foot";
    foot.innerHTML = `<button class="btn btn-primary btn-wide" id="check" disabled>${t("check")}</button>`;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    let chosen: string | null = null;
    const opts = $$<HTMLButtonElement>("#reply .opt");
    const check = $<HTMLButtonElement>("#check");
    opts.forEach((b) => b.addEventListener("click", () => {
      opts.forEach((o) => o.classList.remove("sel"));
      b.classList.add("sel"); chosen = b.dataset.v!; check.disabled = false;
    }));
    const resolve = (ok: boolean, heard?: string, spoken = false) => {
      opts.forEach((o) => { o.disabled = true; });
      if (turn.answer.item) recordAnswer(turn.answer.item.id, ok);
      answered++;
      s!.sub = answered / replies;
      refreshThread();
      savePartial();
      const row = bubble(sayHtml(turn.answer), true);
      wire(row, turn.answer, YOU);
      if (!ok) row.querySelector(".bubble")!.classList.add("corrected");
      void playLine(turn.answer, YOU, row);
      // keep the question in the transcript, so the conversation reads well afterwards
      if (turn.prompt || turn.cue) {
        const ctx = document.createElement("div");
        ctx.className = "narration";
        ctx.innerHTML = `${turn.cue ? `<span class="cue">${turn.cue}</span>` : ""}${turn.prompt ? `<span>${esc(L(turn.prompt))}</span>` : ""}`;
        chat.insertBefore(ctx, row);
      }
      box.innerHTML = "";
      if (ok) {
        s!.correct++;
        foot.className = "lesson-foot good slim";
        foot.innerHTML = `<div class="fb-head">${bead(s!.bead, 20)} ${t("nice")}${heard ? ` <span class="muted small">🎤 ${esc(heard)}</span>` : ""}</div>`;
        ti++;
        setTimeout(() => { void next(); }, 900);
      } else {
        s!.mistakes++;
        if (s!.mode === "lesson" && !spoken) loseHeart();
        foot.className = "lesson-foot bad";
        foot.innerHTML = `<div class="feedback"><div class="fb-head">💧 ${t("notQuite")}</div>
          <div class="solution">${t("correctAns")} <b class="target-text">${esc(turn.answer.target)}</b> = ${esc(lineMeaning(turn.answer))}</div></div>
          <button class="btn btn-danger btn-wide" id="next">${t("cont")}</button>`;
        $("#next").addEventListener("click", () => {
          if (s?.mode === "lesson" && getProgress().hearts <= 0) { const exit = s.onExit; s = null; emptyCalabash(exit); return; }
          ti++; void next();
        });
      }
    };
    check.addEventListener("click", () => resolve(chosen === turn.answer.target));
    $("#convo-mic")?.addEventListener("click", async () => {
      const st = $("#convo-mic-status");
      st.textContent = t("listening");
      try {
        const heard = await speech.listen().done;
        if (!heard.length) { st.textContent = t("heardNothing"); return; }
        const best = speech.bestMatch(heard, turn.answer.target);
        resolve(speech.passes(best.score, turn.answer.target), best.heard, true);
      } catch (e) {
        const m = micMessage(e);
        st.textContent = m.text;
        if (m.hard) $("#convo-mic")?.setAttribute("hidden", "");
      }
    });
  };

  const done = () => {
    s!.sub = 0;
    foot.className = "lesson-foot good";
    foot.innerHTML = `<button class="btn btn-primary btn-wide" id="next">${t("cont")}</button>`;
    $("#next").addEventListener("click", () => { if (!s) return; s.pos++; savePartial(); renderExercise(); });
  };

  $("#quit").addEventListener("click", confirmQuit);
  void next();
}

// ---------- flow ----------
function confirmQuit(): void {
  audio.stop();
  const foot = $("#foot");
  foot.className = "lesson-foot";
  foot.innerHTML = `<div class="quit-row"><span>${t("quitQ")}</span>
    <button class="btn" id="stay">${t("keepGoing")}</button><button class="btn btn-danger" id="leave">${t("leave")}</button></div>`;
  $("#stay").addEventListener("click", () => renderExercise());
  $("#leave").addEventListener("click", () => { const exit = s?.onExit; s = null; saveProgress(getProgress()); exit?.(); });
}

function selectable(correct: string, item: Item): void {
  let chosen: string | null = null;
  const opts = $$<HTMLButtonElement>(".options .opt");
  const check = $<HTMLButtonElement>("#check");
  opts.forEach((b) => b.addEventListener("click", () => {
    opts.forEach((o) => o.classList.remove("sel"));
    b.classList.add("sel");
    chosen = b.dataset.v!;
    check.disabled = false;
  }));
  const keyHandler = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    const n = Number(e.key);
    if (n >= 1 && n <= opts.length) opts[n - 1].click();
    if (e.key === "Enter" && chosen) check.click();
  };
  document.addEventListener("keydown", keyHandler);
  check.addEventListener("click", () => {
    document.removeEventListener("keydown", keyHandler);
    opts.forEach((o) => {
      o.disabled = true;
      if (o.dataset.v === correct) o.classList.add("right");
      else if (o.dataset.v === chosen) o.classList.add("wrong");
    });
    answer(chosen === correct, item);
  });
}

function answer(correct: boolean, item: Item, extra?: string, opt: { skipRecord?: boolean; noHeart?: boolean } = {}): void {
  if (!s) return;
  const ex = s.queue[s.pos];
  if (!opt.skipRecord) recordAnswer(item.id, correct);
  if (correct) s.correct++;
  else {
    s.mistakes++;
    if (s.mode === "lesson" && !opt.noHeart) loseHeart();
    if (s.mode !== "test" && !s.retried.has(ex)) { s.retried.add(ex); s.queue.push(ex); s.total++; }
  }
  $("#mic-offer")?.setAttribute("disabled", "");
  const foot = $("#foot");
  foot.className = `lesson-foot ${correct ? "good" : "bad"}`;
  const solution = ex.kind === "match" ? "" :
    `<div class="solution">${correct ? "" : t("correctAns")} <b class="target-text">${esc(item.target)}</b> = ${esc(meaning(item))}
     ${audio.hasAudio(item, code()) ? `<button class="mini-speak" id="fb-speak" aria-label="${t("playSound")}">🔊</button>` : ""}</div>`;
  foot.innerHTML = `
    <div class="feedback">
      <div class="fb-head">${correct ? `${bead(s.bead, 22)} ${t("nice")}` : `💧 ${t("notQuite")}`}</div>
      ${solution}
      ${extra ? `<div class="fb-extra">${extra}</div>` : ""}
      ${item.note && ex.kind !== "match" ? `<div class="fb-note">💡 ${esc(item.note)}</div>` : ""}
    </div>
    <button class="btn ${correct ? "btn-primary" : "btn-danger"} btn-wide" id="next">${t("cont")}</button>`;
  $("#fb-speak")?.addEventListener("click", () => playItem(item));
  if (!correct && ex.kind !== "match") void playItem(item);
  const next = $<HTMLButtonElement>("#next");
  next.focus();
  const go = () => {
    document.removeEventListener("keydown", onKey);
    if (!s) return;
    if (s.mode === "lesson" && getProgress().hearts <= 0) { const exit = s.onExit; s = null; emptyCalabash(exit); return; }
    s.pos++;
    savePartial();
    renderExercise();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); go(); } };
  setTimeout(() => document.addEventListener("keydown", onKey), 50);
  next.addEventListener("click", go);
}

function finish(): void {
  if (!s) return;
  const sess = s;
  s = null;
  audio.stop();
  const secs = Math.round((Date.now() - sess.started) / 1000);
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  if (sess.mode === "test" && sess.unit) {
    const score = Math.round((sess.correct / Math.max(1, sess.questions)) * 100);
    const passed = recordTest(sess.unit, score);
    if (passed) addXp(20);
    app().innerHTML = `
      <div class="done-screen">
        <div class="done-art gate ${passed ? "open" : ""}">${passed ? "🏁" : "🚧"}</div>
        <h1>${passed ? t("testPassed") : t("testFailed")}</h1>
        <p class="muted">${esc(sess.title)}</p>
        <div class="stats-row">
          <div class="stat"><span class="stat-n">${score}%</span><span class="stat-l">${t("accuracy")}</span></div>
          <div class="stat"><span class="stat-n">${passed ? "+20" : "0"}</span><span class="stat-l">${t("beadsEarned")}</span></div>
          <div class="stat"><span class="stat-n">${time}</span><span class="stat-l">${t("time")}</span></div>
        </div>
        ${passed ? "" : `<p class="muted">${t("needScore")}</p>`}
        <button class="btn btn-primary btn-wide" id="cont">${t("cont")}</button>
      </div>`;
    $("#cont").addEventListener("click", sess.onExit);
    return;
  }

  if (sess.mode === "talk") {
    if (sess.lessonId) completeLesson(sess.lessonId);
    addXp(sess.award);
    const p = getProgress();
    app().innerHTML = `
      <div class="done-screen">
        <div class="done-art">💬</div>
        <h1>${t("talkDone")}</h1>
        <p class="muted">${esc(sess.title)}</p>
        <div class="stats-row">
          <div class="stat"><span class="stat-n">+${sess.award}</span><span class="stat-l">${t("beadsEarned")}</span></div>
          <div class="stat"><span class="stat-n">${sess.correct}/${sess.correct + sess.mistakes}</span><span class="stat-l">${t("accuracy")}</span></div>
          <div class="stat"><span class="stat-n">${time}</span><span class="stat-l">${t("time")}</span></div>
        </div>
        <p class="streak-line">${hearth(true, 26)} ${t("fireKept", { n: p.streak, d: p.streak === 1 ? t("day") : t("days") })}</p>
        <button class="btn btn-primary btn-wide" id="cont">${t("cont")}</button>
      </div>`;
    $("#cont").addEventListener("click", sess.onExit);
    return;
  }

  const asked = sess.queue.filter((e) => e.kind !== "teach").length;
  const accuracy = Math.round((Math.max(0, asked - sess.mistakes) / Math.max(1, asked)) * 100);
  const perfect = sess.mistakes === 0;
  const beads = sess.mode === "lesson" ? 10 + (perfect ? 5 : 0) : 5;
  if (sess.mode === "lesson" && sess.lessonId) completeLesson(sess.lessonId);
  if (sess.mode === "practice" && getProgress().hearts < MAX_HEARTS) gainHeart();
  addXp(beads);
  const p = getProgress();
  app().innerHTML = `
    <div class="done-screen">
      <div class="done-art">${bead(sess.bead, 64)}</div>
      <h1>${sess.mode === "lesson" ? t("lessonDone") : t("practiceDone")}</h1>
      <p class="muted">${esc(sess.title)}</p>
      <div class="stats-row">
        <div class="stat"><span class="stat-n">+${beads}</span><span class="stat-l">${t("beadsEarned")}</span></div>
        <div class="stat"><span class="stat-n">${accuracy}%</span><span class="stat-l">${t("accuracy")}</span></div>
        <div class="stat"><span class="stat-n">${time}</span><span class="stat-l">${t("time")}</span></div>
      </div>
      <p class="streak-line">${hearth(true, 26)} ${t("fireKept", { n: p.streak, d: p.streak === 1 ? t("day") : t("days") })}${sess.mode === "practice" ? ` · 💧 +1 ${t("refill")}` : ""}</p>
      <button class="btn btn-primary btn-wide" id="cont">${t("cont")}</button>
    </div>`;
  $("#cont").addEventListener("click", sess.onExit);
}

function emptyCalabash(onExit: () => void): void {
  app().innerHTML = `
    <div class="done-screen">
      <div class="done-art">${calabash(0, 5, 80)}</div>
      <h1>${t("emptyTitle")}</h1>
      <p class="muted">${t("emptyBody", { t: fmtDuration(msToNextHeart()) })}</p>
      <a class="btn btn-primary btn-wide" href="#/mtoni">${t("goWell")}</a>
      <button class="btn btn-wide" id="back">${t("backSafari")}</button>
    </div>`;
  $("#back").addEventListener("click", onExit);
}
