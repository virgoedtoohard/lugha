// Pronunciation audio. For each line, the best available source wins:
//   1. a native-speaker recording uploaded by a reviewer   (item.audio)
//   2. a generated voice file made by tools/generate_audio.py (audio/manifest.json)
//   3. the device's built-in Kiswahili voice, as an approximation (if switched on)
//
// Each character speaks in a voice that suits them: the grandmother slower and
// lower, the matatu conductor deeper, the young friend a little brighter.
let manifest = {};
let current = null;
const listeners = new Set();
let fallbackOn = true;
export function setFallback(on) { fallbackOn = on; }
export function onSpeaking(fn) { listeners.add(fn); }
const emit = (v) => listeners.forEach((fn) => fn(v));
export async function loadManifest() {
    try {
        const res = await fetch("audio/manifest.json", { cache: "no-cache" });
        if (res.ok)
            manifest = await res.json();
    }
    catch { /* no generated audio yet */ }
}
// ---------- Voices ----------
const NARRATOR = { gender: "f", age: "adult" };
/** How each kind of speaker sounds: speed and pitch, for files and for the device voice. */
function tone(v) {
    if (v.age === "old")
        return { fileRate: 0.9, rate: 0.78, pitch: v.gender === "f" ? 0.95 : 0.7 };
    if (v.age === "young")
        return { fileRate: 1.06, rate: 0.95, pitch: v.gender === "f" ? 1.35 : 1.15 };
    return v.gender === "m" ? { fileRate: 0.92, rate: 0.9, pitch: 0.75 } : { fileRate: 1.03, rate: 0.88, pitch: 1.15 };
}
// Known Kiswahili voice names, so a woman's line goes to a woman's voice where the device has both.
const FEMALE = /zuri|rehema|imani|female|woman|sw-ke-standard-a|sw-tz-standard-a/i;
const MALE = /rafiki|daudi|male|man|standard-b/i;
function swVoices() {
    if (!("speechSynthesis" in window))
        return [];
    const all = speechSynthesis.getVoices().filter((v) => /^sw/i.test(v.lang));
    return all.sort((a, b) => Number(/KE/i.test(b.lang)) - Number(/KE/i.test(a.lang)));
}
if ("speechSynthesis" in window)
    speechSynthesis.onvoiceschanged = () => { };
function voiceFor(v) {
    const voices = swVoices();
    const want = v.gender === "m" ? MALE : FEMALE;
    return voices.find((x) => want.test(x.name) && !(v.gender === "m" ? FEMALE : MALE).test(x.name)) ?? voices[0];
}
export const deviceVoiceAvailable = () => swVoices().length > 0;
// ---------- Sources ----------
export function sourceFor(item, _courseCode) {
    if (item?.audio)
        return "recorded";
    const m = item && manifest[item.id];
    if (item && m && m.text === item.target)
        return "generated";
    if (fallbackOn && deviceVoiceAvailable())
        return "approx";
    return "none";
}
export function hasAudio(item, courseCode) {
    return sourceFor(item, courseCode) !== "none";
}
/** Speak a lesson word or a whole line. `text` covers composed lines that have no item of their own. */
export function play(item, courseCode, slow = false, voice = NARRATOR, text) {
    stop();
    const src = sourceFor(item, courseCode);
    const tn = tone(voice);
    if (src === "recorded" || src === "generated") {
        const a = new Audio(src === "recorded" ? item.audio : manifest[item.id].file);
        // Changing speed without keeping pitch shifts the voice deeper or brighter for each speaker.
        a.preservesPitch = false;
        a.mozPreservesPitch = false;
        a.webkitPreservesPitch = false;
        a.playbackRate = tn.fileRate * (slow ? 0.75 : 1);
        current = a;
        emit(true);
        return new Promise((resolve) => {
            const done = () => { emit(false); resolve(); };
            a.onended = done;
            a.onerror = done;
            a.play().catch(done);
        });
    }
    if (src === "approx") {
        const u = new SpeechSynthesisUtterance(text ?? item?.target ?? "");
        const v = voiceFor(voice);
        if (v) {
            u.voice = v;
            u.lang = v.lang;
        }
        else
            u.lang = "sw-KE";
        u.rate = tn.rate * (slow ? 0.7 : 1);
        u.pitch = tn.pitch;
        emit(true);
        return new Promise((resolve) => {
            const done = () => { emit(false); resolve(); };
            u.onend = done;
            u.onerror = done;
            speechSynthesis.speak(u);
            setTimeout(done, 8000); // never hang a conversation on a stuck voice
        });
    }
    return Promise.resolve();
}
export function stop() {
    current?.pause();
    current = null;
    if ("speechSynthesis" in window)
        speechSynthesis.cancel();
    emit(false);
}
export function playUrl(url) {
    stop();
    current = new Audio(url);
    current.play().catch(() => { });
}
