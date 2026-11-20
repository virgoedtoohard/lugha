// Pronunciation audio. For each word, the best available source wins:
//   1. a native-speaker recording uploaded by a reviewer   (item.audio)
//   2. a generated voice file made by tools/generate_audio.py (audio/manifest.json)
//   3. the device's built-in Swahili voice, as an approximation (Bantu languages only)

import type { Item } from "./types.js";

interface ManifestEntry { file: string; text: string; model: string }
let manifest: Record<string, ManifestEntry> = {};
let current: HTMLAudioElement | null = null;

export type AudioSource = "recorded" | "generated" | "approx" | "none";

// Languages whose spelling a Swahili voice reads reasonably closely.
const BANTU = /^(kik|kam|luy)/;

let fallbackOn = true;
export function setFallback(on: boolean): void { fallbackOn = on; }

export async function loadManifest(): Promise<void> {
  try {
    const res = await fetch("audio/manifest.json", { cache: "no-cache" });
    if (res.ok) manifest = await res.json();
  } catch { /* no generated audio yet */ }
}

function swVoice(): SpeechSynthesisVoice | undefined {
  if (!("speechSynthesis" in window)) return undefined;
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => /^sw[-_]KE/i.test(v.lang)) ?? voices.find((v) => /^sw/i.test(v.lang));
}
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => { /* warm the voice list */ };

export function sourceFor(item: Item, courseCode: string): AudioSource {
  if (item.audio) return "recorded";
  const m = manifest[item.id];
  if (m && m.text === item.target) return "generated";
  if (fallbackOn && BANTU.test(courseCode) && swVoice()) return "approx";
  return "none";
}

export function hasAudio(item: Item, courseCode: string): boolean {
  return sourceFor(item, courseCode) !== "none";
}

export function play(item: Item, courseCode: string, slow = false): Promise<void> {
  stop();
  const src = sourceFor(item, courseCode);
  if (src === "recorded" || src === "generated") {
    const url = src === "recorded" ? item.audio! : manifest[item.id].file;
    const a = new Audio(url);
    a.playbackRate = slow ? 0.7 : 1;
    current = a;
    return new Promise((resolve) => {
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }
  if (src === "approx") {
    const u = new SpeechSynthesisUtterance(item.target);
    const v = swVoice()!;
    u.voice = v; u.lang = v.lang; u.rate = slow ? 0.55 : 0.85;
    return new Promise((resolve) => {
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }
  return Promise.resolve();
}

export function stop(): void {
  current?.pause();
  current = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

export function playUrl(url: string): void {
  stop();
  current = new Audio(url);
  current.play().catch(() => { /* ignore */ });
}
