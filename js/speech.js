// Speaking practice.
// No speech recogniser exists yet for Gĩkũyũ, Dholuo, Luhya, Kĩkamba or Kalenjin, so we
// listen with the Kiswahili (Kenya) recogniser and compare what it heard to the expected
// word with a forgiving similarity score. Where the browser has no recogniser at all,
// the learner records themselves, compares with the model audio and marks it themselves.
function Recognizer() {
    const w = window;
    return w.SpeechRecognition || w.webkitSpeechRecognition;
}
// Phones fail in ways desktops don't: an iPhone home-screen app may refuse recognition outright,
// and some Android phones have no Kiswahili recogniser. Once a phone has refused for a reason
// that won't change, remember it and use record-and-compare instead.
const BROKEN_KEY = "lugha.recogniser";
const HARD = new Set(["service-not-allowed", "language-not-supported", "unsupported"]);
// A refusal is remembered for a day, not forever: browsers and phone settings change.
const BROKEN_FOR_MS = 24 * 60 * 60 * 1000;
function brokenReason() {
    try {
        const raw = localStorage.getItem(BROKEN_KEY);
        if (!raw)
            return null;
        const [reason, at] = raw.split("|");
        if (!at || Date.now() - Number(at) > BROKEN_FOR_MS) {
            localStorage.removeItem(BROKEN_KEY);
            return null;
        }
        return reason;
    }
    catch {
        return null;
    }
}
export function markBroken(reason) {
    try {
        localStorage.setItem(BROKEN_KEY, `${reason}|${Date.now()}`);
    }
    catch { /* ignore */ }
}
export function resetRecogniser() {
    try {
        localStorage.removeItem(BROKEN_KEY);
    }
    catch { /* ignore */ }
}
export const canRecognize = () => !!Recognizer() && !brokenReason();
export const canRecord = () => typeof navigator.mediaDevices?.getUserMedia === "function" && "MediaRecorder" in window;
export const isHardError = (code) => HARD.has(code);
/** Recogniser languages to try, best first. Many phones have no Kiswahili recogniser; an
 *  English one still writes down roughly what it heard, which is enough to compare spellings. */
const LANGS = ["sw-KE", "sw-TZ", "sw", "en-KE", "en-GB", "en-US"];
/** Listen once; resolves with the recogniser's guesses (best first). Rejects with the error code. */
export function listen(timeoutMs = 7000) {
    const R = Recognizer();
    if (!R)
        return { done: Promise.reject(new Error("unsupported")), stop: () => { } };
    let active = null;
    const attempt = (langIndex) => new Promise((resolve, reject) => {
        const r = new R();
        active = r;
        r.lang = LANGS[langIndex];
        r.interimResults = false;
        r.maxAlternatives = 5;
        r.continuous = false;
        let heard = [];
        let settled = false;
        const finish = (fn) => { if (!settled) {
            settled = true;
            clearTimeout(timer);
            fn();
        } };
        const timer = setTimeout(() => { try {
            r.stop();
        }
        catch { /* ignore */ } }, timeoutMs);
        r.onresult = (e) => {
            // some phones deliver several result events; take the last final one
            const res = e.results[e.results.length - 1] ?? e.results[0];
            heard = Array.from({ length: res.length }, (_, i) => String(res[i].transcript));
        };
        r.onerror = (e) => finish(() => {
            const code = String(e.error || "error");
            if (code === "no-speech" || code === "aborted")
                resolve([]);
            else if (code === "language-not-supported" && langIndex + 1 < LANGS.length)
                attempt(langIndex + 1).then(resolve, reject);
            else
                reject(new Error(code));
        });
        r.onend = () => finish(() => resolve(heard));
        try {
            r.start();
        }
        catch (err) {
            finish(() => reject(new Error("start-failed")));
        }
    });
    return { done: attempt(0), stop: () => { try {
            active?.stop();
        }
        catch { /* ignore */ } } };
}
/** One tap: record, stop by itself once the learner has spoken and gone quiet (or after maxMs),
 *  and report how much voice was in the take. Used where the browser can't recognise speech. */
export async function recordTake(maxMs = 6000, onLevel) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = Ctx ? new Ctx() : null;
    const analyser = ctx?.createAnalyser();
    if (ctx && analyser) {
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
    }
    const buf = new Float32Array(1024);
    let noise = 0.01, voiced = 0, peak = 0, heardVoice = false, quietFor = 0, frames = 0;
    const STEP = 50;
    rec.start();
    await new Promise((resolve) => {
        const started = Date.now();
        const tick = setInterval(() => {
            frames++;
            let rms = 0;
            if (analyser) {
                analyser.getFloatTimeDomainData(buf);
                for (const v of buf)
                    rms += v * v;
                rms = Math.sqrt(rms / buf.length);
            }
            if (frames <= 4)
                noise = Math.max(noise, rms * 1.5); // the first moment sets the room's noise level
            const isVoice = analyser ? rms > Math.max(0.02, noise * 2.2) : true;
            peak = Math.max(peak, rms);
            onLevel?.(Math.min(1, rms * 8));
            if (isVoice && frames > 4) {
                voiced += STEP;
                heardVoice = true;
                quietFor = 0;
            }
            else
                quietFor += STEP;
            const elapsed = Date.now() - started;
            if (elapsed >= maxMs || (heardVoice && quietFor >= 1100) || (!heardVoice && elapsed >= 4500)) {
                clearInterval(tick);
                resolve();
            }
        }, STEP);
    });
    const url = await new Promise((resolve) => {
        rec.onstop = () => resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" })));
        rec.stop();
    });
    stream.getTracks().forEach((t) => t.stop());
    void ctx?.close();
    return { url, voicedSec: voiced / 1000, peak };
}
/** Rough syllable count: vowel groups. Used to judge whether a take is about the right length. */
export function syllables(word) {
    return Math.max(1, (normalizeSpoken(word).match(/[aeiou]+/g) ?? []).length);
}
/** Judge a take with no recogniser: was there a voice, and was it about as long as the word? */
export function judgeTake(take, expected) {
    if (take.voicedSec < 0.15)
        return "silent";
    const n = syllables(expected);
    if (take.voicedSec < Math.min(0.25, 0.09 * n))
        return "short";
    if (take.voicedSec > 1.2 + 0.55 * n)
        return "long";
    return "ok";
}
/** Record from the microphone until stop() is called. */
export async function record() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.start();
    return {
        stop: () => new Promise((resolve) => {
            rec.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" })));
            };
            rec.stop();
        }),
    };
}
// ---------- Scoring ----------
export function normalizeSpoken(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/['’‘`]/g, "").replace(/[^a-z ]/g, " ")
        .replace(/(.)\1+/g, "$1") // long vowels / doubled letters
        .replace(/\s+/g, " ").trim();
}
function lev(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++)
        dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
}
/** 0..1 similarity, ignoring spaces (recognisers often split or join words). */
export function similarity(heard, expected) {
    const a = normalizeSpoken(heard).replace(/ /g, ""), b = normalizeSpoken(expected).replace(/ /g, "");
    if (!a || !b)
        return 0;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
}
export function bestMatch(alternatives, expected) {
    let best = { score: 0, heard: alternatives[0] ?? "" };
    for (const alt of alternatives) {
        const sc = similarity(alt, expected);
        if (sc > best.score)
            best = { score: sc, heard: alt };
    }
    return best;
}
/** Short words get a little more leeway: one wrong letter in "pi" is half the word. */
export function passes(score, expected) {
    const len = normalizeSpoken(expected).replace(/ /g, "").length;
    return score >= (len <= 3 ? 0.5 : 0.6);
}
