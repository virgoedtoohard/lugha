import { checkTyped, shuffle, tokens } from "./exercises.js";
import { addXp, completeLesson, gainHeart, getProgress, loseHeart, MAX_HEARTS, msToNextHeart, recordAnswer, saveProgress } from "./store.js";
import { $, $$, app, esc, fmtDuration, playAudio } from "./ui.js";
let s = null;
export function startSession(opts) {
    if (opts.mode === "lesson" && getProgress().hearts <= 0) {
        outOfHearts(opts.onExit);
        return;
    }
    s = {
        ...opts,
        queue: opts.exercises.slice(),
        pos: 0,
        total: opts.exercises.length,
        mistakes: 0,
        retried: new Set(),
        started: Date.now(),
    };
    renderExercise();
}
function draftChip(items) {
    const drafts = items.filter((i) => i.status === "draft");
    if (!drafts.length)
        return "";
    const low = drafts.some((i) => i.confidence === "low");
    return `<span class="chip ${low ? "chip-warn" : ""}" title="This content hasn't been checked by a native speaker yet">${low ? "Draft · low confidence" : "Draft · awaiting review"}</span>`;
}
function shell(inner, items) {
    const p = getProgress();
    const pct = Math.round((s.pos / s.total) * 100);
    return `
  <div class="lesson">
    <header class="lesson-top">
      <button class="icon-btn" id="quit" aria-label="Quit lesson">✕</button>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      ${s.mode === "lesson" ? `<span class="hearts" aria-label="${p.hearts} hearts">❤️ ${p.hearts}</span>` : `<span class="hearts">🎯</span>`}
    </header>
    <main class="lesson-body">
      ${draftChip(items)}
      ${inner}
    </main>
    <footer class="lesson-foot" id="foot">
      <button class="btn btn-primary btn-wide" id="check" disabled>Check</button>
    </footer>
  </div>`;
}
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
            const heading = ex.direction === "to-en" ? "What does this mean?" : "How do you say this?";
            root.innerHTML = shell(`
        <h2 class="ex-title">${heading}</h2>
        <div class="prompt">
          ${ex.direction === "to-en" && ex.item.audio ? `<button class="speak" id="speak" aria-label="Play audio">🔊</button>` : ""}
          <span class="${ex.direction === "to-en" ? "target-text" : ""}">${esc(ex.prompt)}</span>
        </div>
        <div class="options">${ex.options.map((o, i) => `<button class="opt ${ex.direction === "to-target" ? "target-text" : ""}" data-v="${esc(o)}"><kbd>${i + 1}</kbd>${esc(o)}</button>`).join("")}</div>
      `, [ex.item]);
            selectable(ex.answer, ex.item);
            $("#speak")?.addEventListener("click", () => playAudio(ex.item.audio));
            if (ex.direction === "to-en")
                playAudio(ex.item.audio);
            break;
        }
        case "listen": {
            root.innerHTML = shell(`
        <h2 class="ex-title">What do you hear?</h2>
        <div class="prompt"><button class="speak speak-big" id="speak" aria-label="Play audio">🔊</button></div>
        <div class="options">${ex.options.map((o, i) => `<button class="opt target-text" data-v="${esc(o)}"><kbd>${i + 1}</kbd>${esc(o)}</button>`).join("")}</div>
      `, [ex.item]);
            selectable(ex.item.target, ex.item);
            $("#speak").addEventListener("click", () => playAudio(ex.item.audio));
            playAudio(ex.item.audio);
            break;
        }
        case "type": {
            root.innerHTML = shell(`
        <h2 class="ex-title">Type this in ${esc(courseName())}</h2>
        <div class="prompt">${esc(ex.item.english)}</div>
        <input class="type-input target-text" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer" />
        <p class="hint">Accent marks like ĩ and ũ count, but we'll go easy if you miss them.</p>
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
                answer(v !== "wrong", ex.item, v === "accents" ? `Watch the accents: <b class="target-text">${esc(ex.item.target)}</b>` : undefined);
            });
            break;
        }
        case "build": {
            root.innerHTML = shell(`
        <h2 class="ex-title">Translate this sentence</h2>
        <div class="prompt">${esc(ex.item.english)}</div>
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
                const v = checkTyped(said, tokens(ex.item.target).join(" "));
                answer(v !== "wrong", ex.item);
            });
            break;
        }
        case "match": {
            const left = shuffle(ex.items), right = shuffle(ex.items);
            root.innerHTML = shell(`
        <h2 class="ex-title">Tap the matching pairs</h2>
        <div class="match">
          <div class="col">${left.map((it) => `<button class="opt tile target-text" data-id="${it.id}" data-side="l">${esc(it.target)}</button>`).join("")}</div>
          <div class="col">${right.map((it) => `<button class="opt tile" data-id="${it.id}" data-side="r">${esc(it.english)}</button>`).join("")}</div>
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
                    if (matched === ex.items.length) {
                        $("#check").disabled = false;
                        setTimeout(() => answer(true, ex.items[0], slips ? `${slips} slip${slips > 1 ? "s" : ""} — keep practising these.` : undefined, true), 250);
                    }
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
    foot.innerHTML = `<div class="quit-row"><span>Quit? Progress in this lesson will be lost.</span>
    <button class="btn" id="stay">Keep going</button><button class="btn btn-danger" id="leave">Quit</button></div>`;
    $("#stay").addEventListener("click", () => renderExercise());
    $("#leave").addEventListener("click", () => { const exit = s?.onExit; s = null; saveProgress(getProgress()); exit?.(); });
}
function courseName() {
    const code = getProgress().activeCourse;
    return { kik: "Gĩkũyũ", luo: "Dholuo", luy: "Luhya", kam: "Kĩkamba", kln: "Kalenjin" }[code ?? ""] ?? "the language";
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
    const solution = ex.kind === "match" ? "" : `<div class="solution">${correct ? "" : "Correct answer:"} <b class="target-text">${esc(item.target)}</b> = ${esc(item.english)}</div>`;
    foot.innerHTML = `
    <div class="feedback">
      <div class="fb-head">${correct ? "✓ Nice!" : "✗ Not quite"}</div>
      ${solution}
      ${extra ? `<div class="fb-extra">${extra}</div>` : ""}
      ${item.note && ex.kind !== "match" ? `<div class="fb-note">💡 ${esc(item.note)}</div>` : ""}
    </div>
    <button class="btn ${correct ? "btn-primary" : "btn-danger"} btn-wide" id="next">Continue</button>`;
    const next = $("#next");
    next.focus();
    const go = () => {
        document.removeEventListener("keydown", onKey);
        if (!s)
            return;
        if (s.mode === "lesson" && getProgress().hearts <= 0) {
            const exit = s.onExit;
            s = null;
            outOfHearts(exit);
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
    const xp = sess.mode === "lesson" ? 10 + (perfect ? 5 : 0) : 5;
    if (sess.mode === "lesson" && sess.lessonId)
        completeLesson(sess.lessonId);
    if (sess.mode === "practice" && getProgress().hearts < MAX_HEARTS)
        gainHeart();
    addXp(xp);
    const secs = Math.round((Date.now() - sess.started) / 1000);
    const p = getProgress();
    app().innerHTML = `
    <div class="done-screen">
      <div class="done-badge">${perfect ? "🌟" : "🎉"}</div>
      <h1>${sess.mode === "lesson" ? "Lesson complete!" : "Practice complete!"}</h1>
      <p class="muted">${esc(sess.title)}</p>
      <div class="stats-row">
        <div class="stat"><span class="stat-n">+${xp}</span><span class="stat-l">XP</span></div>
        <div class="stat"><span class="stat-n">${accuracy}%</span><span class="stat-l">Accuracy</span></div>
        <div class="stat"><span class="stat-n">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}</span><span class="stat-l">Time</span></div>
      </div>
      <p class="streak-line">🔥 ${p.streak}-day streak${sess.mode === "practice" ? " · ❤️ +1 heart" : ""}</p>
      <button class="btn btn-primary btn-wide" id="cont">Continue</button>
    </div>`;
    $("#cont").addEventListener("click", sess.onExit);
}
function outOfHearts(onExit) {
    app().innerHTML = `
    <div class="done-screen">
      <div class="done-badge">💔</div>
      <h1>Out of hearts</h1>
      <p class="muted">Next heart in ${fmtDuration(msToNextHeart())}. Practise words you've already learned to earn one back now.</p>
      <a class="btn btn-primary btn-wide" href="#/practice">Practise to earn a heart</a>
      <button class="btn btn-wide" id="back">Back to lessons</button>
    </div>`;
    $("#back").addEventListener("click", onExit);
}
