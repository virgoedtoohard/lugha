import { bead, calabash, hearth } from "./art.js";
import { checkTyped, meaning, shuffle, tokens } from "./exercises.js";
import { L, t } from "./i18n.js";
import { addXp, completeLesson, gainHeart, getProgress, loseHeart, MAX_HEARTS, msToNextHeart, recordAnswer, saveProgress } from "./store.js";
import { $, $$, app, esc, fmtDuration, playAudio } from "./ui.js";
let s = null;
export function startSession(opts) {
    if (opts.mode === "lesson" && getProgress().hearts <= 0) {
        emptyCalabash(opts.onExit);
        return;
    }
    s = { ...opts, queue: opts.exercises.slice(), pos: 0, total: opts.exercises.length, mistakes: 0, retried: new Set(), started: Date.now() };
    renderExercise();
}
function draftChip(items) {
    const drafts = items.filter((i) => i.status === "draft");
    if (!drafts.length)
        return "";
    const low = drafts.some((i) => i.confidence === "low");
    return `<span class="chip ${low ? "chip-warn" : ""}" title="${t("draftTip")}">${low ? t("draftLow") : t("draft")}</span>`;
}
/** Progress shown as beads being threaded onto a string. */
function beadString() {
    const n = Math.min(s.total, 16);
    const done = Math.round((s.pos / s.total) * n);
    return `<div class="thread" aria-label="${s.pos} / ${s.total}">${Array.from({ length: n }, (_, i) => `<span class="tb ${i < done ? "on" : ""}" style="--c:${s.bead}"></span>`).join("")}</div>`;
}
function shell(inner, items) {
    const p = getProgress();
    return `
  <div class="lesson">
    <header class="lesson-top">
      <button class="icon-btn" id="quit" aria-label="${t("leave")}">✕</button>
      ${beadString()}
      ${s.mode === "lesson" ? `<span class="water" title="${t("calabash")}">${calabash(p.hearts)} ${p.hearts}</span>` : `<span class="water">🪣</span>`}
    </header>
    <main class="lesson-body">
      ${draftChip(items)}
      ${inner}
    </main>
    <footer class="lesson-foot" id="foot">
      <button class="btn btn-primary btn-wide" id="check" disabled>${t("check")}</button>
    </footer>
  </div>`;
}
const optBtn = (o, i, isTarget) => `<button class="opt ${isTarget ? "target-text" : ""}" data-v="${esc(o)}"><kbd>${i + 1}</kbd>${esc(o)}</button>`;
function renderExercise() {
    if (!s)
        return;
    if (s.pos >= s.queue.length) {
        finish();
        return;
    }
    const ex = s.queue[s.pos];
    const root = app();
    switch (ex.kind) {
        case "choose": {
            const toBase = ex.direction === "to-base";
            root.innerHTML = shell(`
        <h2 class="ex-title">${toBase ? t("whatMeans") : t("howSay")}</h2>
        <div class="prompt">
          ${toBase && ex.item.audio ? `<button class="speak" id="speak" aria-label="Play">🔊</button>` : ""}
          <span class="${toBase ? "target-text" : ""}">${esc(ex.prompt)}</span>
        </div>
        <div class="options">${ex.options.map((o, i) => optBtn(o, i, !toBase)).join("")}</div>
      `, [ex.item]);
            selectable(ex.answer, ex.item);
            $("#speak")?.addEventListener("click", () => playAudio(ex.item.audio));
            if (toBase)
                playAudio(ex.item.audio);
            break;
        }
        case "listen": {
            root.innerHTML = shell(`
        <h2 class="ex-title">${t("hear")}</h2>
        <div class="prompt center"><button class="speak speak-big" id="speak" aria-label="Play">🔊</button></div>
        <div class="options">${ex.options.map((o, i) => optBtn(o, i, true)).join("")}</div>
      `, [ex.item]);
            selectable(ex.item.target, ex.item);
            $("#speak").addEventListener("click", () => playAudio(ex.item.audio));
            playAudio(ex.item.audio);
            break;
        }
        case "scene": {
            const who = (k) => ex.cast.find((c) => c.key === k);
            root.innerHTML = shell(`
        <div class="scene-tag">📖 ${t("story")} · ${esc(L(ex.scene.setting))}</div>
        <div class="chat">
          ${ex.lines.map((l) => {
                const c = who(l.who);
                const mine = l.who === "you";
                return `<div class="bubble-row ${mine ? "mine" : ""}">
              ${mine ? "" : `<span class="avatar" title="${esc(c ? `${c.name} · ${L(c.role)}` : "")}">${c?.avatar ?? "🙂"}</span>`}
              <div class="bubble">${mine ? "" : `<span class="who">${esc(c?.name ?? "")}</span>`}
                <span class="target-text">${esc(l.item.target)}</span>
                <button class="peek" data-m="${esc(meaning(l.item))}">${esc(meaning(l.item))}</button>
              </div></div>`;
            }).join("")}
          <div class="bubble-row mine"><div class="bubble ghost">…</div></div>
        </div>
        <h2 class="ex-title small-title">${t("whatReply")}</h2>
        <div class="options">${ex.options.map((o, i) => optBtn(o, i, true)).join("")}</div>
      `, [ex.answer, ...ex.lines.map((l) => l.item)]);
            selectable(ex.answer.target, ex.answer);
            $$(".peek").forEach((b) => b.addEventListener("click", () => b.classList.toggle("shown")));
            break;
        }
        case "type": {
            root.innerHTML = shell(`
        <h2 class="ex-title">${t("typeIn")} ${esc(s.course.nativeName)}</h2>
        <div class="prompt">${esc(meaning(ex.item))}</div>
        <input class="type-input target-text" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" />
        <p class="hint">${t("accentsHint")}</p>
      `, [ex.item]);
            const input = $("#answer");
            const check = $("#check");
            input.focus();
            input.addEventListener("input", () => { check.disabled = !input.value.trim(); });
            input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim())
                check.click(); });
            check.addEventListener("click", () => {
                const v = checkTyped(input.value, ex.item.target);
                input.disabled = true;
                answer(v !== "wrong", ex.item, v === "accents" ? `${t("watchAccents")} <b class="target-text">${esc(ex.item.target)}</b>` : undefined);
            });
            break;
        }
        case "build": {
            root.innerHTML = shell(`
        <h2 class="ex-title">${t("buildTitle")}</h2>
        <div class="prompt">${esc(meaning(ex.item))}</div>
        <div class="build-answer" id="built"></div>
        <div class="bank" id="bank">${ex.bank.map((w, i) => `<button class="word target-text" data-i="${i}">${esc(w)}</button>`).join("")}</div>
      `, [ex.item]);
            const built = [];
            const check = $("#check");
            const draw = () => {
                $("#built").innerHTML = built.map((i) => `<button class="word target-text" data-i="${i}">${esc(ex.bank[i])}</button>`).join("");
                $$("#bank .word").forEach((b) => { b.classList.toggle("used", built.includes(+b.dataset.i)); });
                $$("#built .word").forEach((b) => b.addEventListener("click", () => { built.splice(built.indexOf(+b.dataset.i), 1); draw(); }));
                check.disabled = !built.length;
            };
            $$("#bank .word").forEach((b) => b.addEventListener("click", () => {
                const i = +b.dataset.i;
                if (!built.includes(i)) {
                    built.push(i);
                    draw();
                }
            }));
            check.addEventListener("click", () => {
                const said = built.map((i) => ex.bank[i]).join(" ");
                answer(checkTyped(said, tokens(ex.item.target).join(" ")) !== "wrong", ex.item);
            });
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
            let picked = null;
            let matched = 0, slips = 0;
            $$(".tile").forEach((b) => b.addEventListener("click", () => {
                if (b.classList.contains("done"))
                    return;
                const item = ex.items.find((i) => i.id === b.dataset.id);
                if (b.dataset.side === "l")
                    playAudio(item?.audio);
                if (!picked || picked.dataset.side === b.dataset.side) {
                    picked?.classList.remove("sel");
                    picked = b;
                    b.classList.add("sel");
                    return;
                }
                if (picked.dataset.id === b.dataset.id) {
                    picked.classList.remove("sel");
                    picked.classList.add("done");
                    b.classList.add("done");
                    matched++;
                    if (item)
                        recordAnswer(item.id, true);
                    if (matched === ex.items.length)
                        setTimeout(() => answer(true, ex.items[0], slips ? `${slips} ×` : undefined, true), 250);
                }
                else {
                    slips++;
                    const a = picked, c = b;
                    a.classList.add("bad");
                    c.classList.add("bad");
                    setTimeout(() => { a.classList.remove("bad", "sel"); c.classList.remove("bad"); }, 450);
                }
                picked = null;
            }));
            break;
        }
    }
    $("#quit").addEventListener("click", confirmQuit);
}
function confirmQuit() {
    const foot = $("#foot");
    foot.className = "lesson-foot";
    foot.innerHTML = `<div class="quit-row"><span>${t("quitQ")}</span>
    <button class="btn" id="stay">${t("keepGoing")}</button><button class="btn btn-danger" id="leave">${t("leave")}</button></div>`;
    $("#stay").addEventListener("click", () => renderExercise());
    $("#leave").addEventListener("click", () => { const exit = s?.onExit; s = null; saveProgress(getProgress()); exit?.(); });
}
function selectable(correct, item) {
    let chosen = null;
    const opts = $$(".opt");
    const check = $("#check");
    opts.forEach((b) => b.addEventListener("click", () => {
        opts.forEach((o) => o.classList.remove("sel"));
        b.classList.add("sel");
        chosen = b.dataset.v;
        check.disabled = false;
    }));
    const keyHandler = (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= opts.length)
            opts[n - 1].click();
        if (e.key === "Enter" && chosen)
            check.click();
    };
    document.addEventListener("keydown", keyHandler);
    check.addEventListener("click", () => {
        document.removeEventListener("keydown", keyHandler);
        opts.forEach((o) => {
            o.disabled = true;
            if (o.dataset.v === correct)
                o.classList.add("right");
            else if (o.dataset.v === chosen)
                o.classList.add("wrong");
        });
        answer(chosen === correct, item);
    });
}
function answer(correct, item, extra, skipRecord = false) {
    if (!s)
        return;
    const ex = s.queue[s.pos];
    if (!skipRecord)
        recordAnswer(item.id, correct);
    if (!correct) {
        s.mistakes++;
        if (s.mode === "lesson")
            loseHeart();
        if (!s.retried.has(ex)) {
            s.retried.add(ex);
            s.queue.push(ex);
            s.total++;
        }
    }
    const foot = $("#foot");
    foot.className = `lesson-foot ${correct ? "good" : "bad"}`;
    const solution = ex.kind === "match" ? "" :
        `<div class="solution">${correct ? "" : t("correctAns")} <b class="target-text">${esc(item.target)}</b> = ${esc(meaning(item))}</div>`;
    foot.innerHTML = `
    <div class="feedback">
      <div class="fb-head">${correct ? `${bead(s.bead, 22)} ${t("nice")}` : `💧 ${t("notQuite")}`}</div>
      ${solution}
      ${extra ? `<div class="fb-extra">${extra}</div>` : ""}
      ${item.note && ex.kind !== "match" ? `<div class="fb-note">💡 ${esc(item.note)}</div>` : ""}
    </div>
    <button class="btn ${correct ? "btn-primary" : "btn-danger"} btn-wide" id="next">${t("cont")}</button>`;
    const next = $("#next");
    next.focus();
    const go = () => {
        document.removeEventListener("keydown", onKey);
        if (!s)
            return;
        if (s.mode === "lesson" && getProgress().hearts <= 0) {
            const exit = s.onExit;
            s = null;
            emptyCalabash(exit);
            return;
        }
        s.pos++;
        renderExercise();
    };
    const onKey = (e) => { if (e.key === "Enter") {
        e.preventDefault();
        go();
    } };
    setTimeout(() => document.addEventListener("keydown", onKey), 50);
    next.addEventListener("click", go);
}
function finish() {
    if (!s)
        return;
    const sess = s;
    s = null;
    const accuracy = Math.round((Math.max(0, sess.total - sess.mistakes) / sess.total) * 100);
    const perfect = sess.mistakes === 0;
    const beads = sess.mode === "lesson" ? 10 + (perfect ? 5 : 0) : 5;
    if (sess.mode === "lesson" && sess.lessonId)
        completeLesson(sess.lessonId);
    if (sess.mode === "practice" && getProgress().hearts < MAX_HEARTS)
        gainHeart();
    addXp(beads);
    const secs = Math.round((Date.now() - sess.started) / 1000);
    const p = getProgress();
    app().innerHTML = `
    <div class="done-screen">
      <div class="done-art">${bead(sess.bead, 64)}</div>
      <h1>${sess.mode === "lesson" ? t("lessonDone") : t("practiceDone")}</h1>
      <p class="muted">${esc(sess.title)}</p>
      <div class="stats-row">
        <div class="stat"><span class="stat-n">+${beads}</span><span class="stat-l">${t("beadsEarned")}</span></div>
        <div class="stat"><span class="stat-n">${accuracy}%</span><span class="stat-l">${t("accuracy")}</span></div>
        <div class="stat"><span class="stat-n">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}</span><span class="stat-l">${t("time")}</span></div>
      </div>
      <p class="streak-line">${hearth(true, 26)} ${t("fireKept", { n: p.streak, d: p.streak === 1 ? t("day") : t("days") })}${sess.mode === "practice" ? ` · 💧 +1 ${t("refill")}` : ""}</p>
      <button class="btn btn-primary btn-wide" id="cont">${t("cont")}</button>
    </div>`;
    $("#cont").addEventListener("click", sess.onExit);
}
function emptyCalabash(onExit) {
    app().innerHTML = `
    <div class="done-screen">
      <div class="done-art">${calabash(0, 5, 80)}</div>
      <h1>${t("emptyTitle")}</h1>
      <p class="muted">${t("emptyBody", { t: fmtDuration(msToNextHeart()) })}</p>
      <a class="btn btn-primary btn-wide" href="#/kisima">${t("goWell")}</a>
      <button class="btn btn-wide" id="back">${t("backSafari")}</button>
    </div>`;
    $("#back").addEventListener("click", onExit);
}
