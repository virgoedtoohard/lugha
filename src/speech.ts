// Speaking practice.
// No speech recogniser exists yet for Gĩkũyũ, Dholuo, Luhya, Kĩkamba or Kalenjin, so we
// listen with the Kiswahili (Kenya) recogniser and compare what it heard to the expected
// word with a forgiving similarity score. Where the browser has no recogniser at all,
// the learner records themselves, compares with the model audio and marks it themselves.

interface RecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null;
}

function Recognizer(): (new () => RecognitionLike) | undefined {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export const canRecognize = (): boolean => !!Recognizer();
export const canRecord = (): boolean => typeof navigator.mediaDevices?.getUserMedia === "function" && "MediaRecorder" in window;

/** Listen once; resolves with the recogniser's guesses (best first). */
export function listen(timeoutMs = 7000): { done: Promise<string[]>; stop: () => void } {
  const R = Recognizer();
  if (!R) return { done: Promise.reject(new Error("unsupported")), stop: () => {} };
  const r = new R();
  r.lang = "sw-KE";
  r.interimResults = false;
  r.maxAlternatives = 5;
  r.continuous = false;
  let heard: string[] = [];
  const done = new Promise<string[]>((resolve, reject) => {
    const timer = setTimeout(() => r.stop(), timeoutMs);
    r.onresult = (e: any) => {
      const res = e.results[0];
      heard = Array.from({ length: res.length }, (_, i) => String(res[i].transcript));
    };
    r.onerror = (e: any) => { clearTimeout(timer); if (e.error === "no-speech") resolve([]); else reject(new Error(e.error)); };
    r.onend = () => { clearTimeout(timer); resolve(heard); };
  });
  r.start();
  return { done, stop: () => r.stop() };
}

/** Record from the microphone until stop() is called. */
export async function record(): Promise<{ stop: () => Promise<string> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
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
export function normalizeSpoken(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/['’‘`]/g, "").replace(/[^a-z ]/g, " ")
    .replace(/(.)\1+/g, "$1")          // long vowels / doubled letters
    .replace(/\s+/g, " ").trim();
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** 0..1 similarity, ignoring spaces (recognisers often split or join words). */
export function similarity(heard: string, expected: string): number {
  const a = normalizeSpoken(heard).replace(/ /g, ""), b = normalizeSpoken(expected).replace(/ /g, "");
  if (!a || !b) return 0;
  return 1 - lev(a, b) / Math.max(a.length, b.length);
}

export function bestMatch(alternatives: string[], expected: string): { score: number; heard: string } {
  let best = { score: 0, heard: alternatives[0] ?? "" };
  for (const alt of alternatives) {
    const sc = similarity(alt, expected);
    if (sc > best.score) best = { score: sc, heard: alt };
  }
  return best;
}

/** Short words get a little more leeway: one wrong letter in "pi" is half the word. */
export function passes(score: number, expected: string): boolean {
  const len = normalizeSpoken(expected).replace(/ /g, "").length;
  return score >= (len <= 3 ? 0.5 : 0.6);
}
