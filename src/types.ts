export type Confidence = "low" | "medium" | "high";
export type ReviewStatus = "draft" | "reviewed";
export type BaseLang = "en" | "sw";

export interface Item {
  id: string;
  target: string;       // word or phrase in the Kenyan language
  english: string;
  swahili: string;
  note?: string;        // usage / cultural note shown after answering
  audio?: string;       // public URL of a native-speaker recording
  status: ReviewStatus;
  confidence: Confidence;
}

export interface VoiceProfile { gender: "f" | "m"; age: "young" | "adult" | "old" }

export interface CastMember {
  key: string;
  name: string;
  role: { en: string; sw: string };
  avatar: string;       // emoji
  voice: VoiceProfile;  // how their lines sound when played
}

/** A short conversation that ends with the learner choosing the right reply. */
export interface Scene {
  setting: { en: string; sw: string };
  lines: { who: string; item: string }[];   // who = cast key or "you"; item = item id
}

export interface Lesson {
  id: string;
  title: { en: string; sw: string };
  items: Item[];
  scene?: Scene;
}

export interface Unit {
  id: string;
  title: { en: string; sw: string };
  place: string;        // stop on the journey through the region
  bead: string;         // bead colour for this unit
  lessons: Lesson[];
}

/** Short phrases used to build conversations. Missing frames fall back to narration. */
export interface Frames {
  whatIs?: Phrase;                   // "What is this?"
  itIs?: { prefix: string; en: string; sw: string };   // "It is ___" → prefix + noun
  howMany?: Phrase;                  // "How many?"
  glosses?: Record<string, { en: string; sw: string }>;   // meanings of single words used in the phrases above
  thanks?: string;                   // item id
  bye?: string;                      // item id
  greet?: [question: string, answer: string];   // item ids
}

export interface Phrase { target: string; english: string; swahili: string; confidence: Confidence }

export type Guide = "kik" | "luo" | "luy" | "kam" | "kln";

export interface Course {
  code: string;
  guide: Guide;                      // walking figure on the journey
  frames: Frames;
  family: string;       // groups varieties in the picker, e.g. "Luhya"
  name: string;         // English name, e.g. "Bukusu"
  nativeName: string;
  speakers: string;
  dialectNote: string;
  cast: CastMember[];
  units: Unit[];
}

export type Exercise =
  | { kind: "choose"; item: Item; prompt: string; options: string[]; answer: string; direction: "to-base" | "to-target" }
  | { kind: "match"; items: Item[] }
  | { kind: "build"; item: Item; bank: string[] }
  | { kind: "type"; item: Item }
  | { kind: "listen"; item: Item; options: string[] }
  | { kind: "speak"; item: Item }
  | { kind: "scene"; scene: Scene; cast: CastMember[]; lines: { who: string; item: Item }[]; answer: Item; options: string[] }
  | { kind: "convo"; title: { en: string; sw: string }; setting: { en: string; sw: string }; cast: CastMember[]; turns: Turn[]; big: boolean;
      known: string[]; glossary: Record<string, { en: string; sw: string }> };

/** One line in a conversation. `item` is either a real lesson item or a composed phrase. */
export interface Line { target: string; english: string; swahili: string; item?: Item }

export type Turn =
  | { type: "say"; who: string; line: Line }                      // a character speaks
  | { type: "narrate"; text: { en: string; sw: string }; cue?: string }
  | { type: "reply"; cue?: string; prompt?: { en: string; sw: string }; answer: Line; options: string[] };

export interface ItemStat {
  seen: number;
  correct: number;
  last: number;
}

export interface Progress {
  version: 1;
  activeCourse: string | null;
  base: BaseLang;
  xp: number;                           // shown to learners as shanga (beads)
  dailyXp: Record<string, number>;
  streak: number;                       // days the hearth fire has been kept burning
  lastActiveDay: string | null;
  hearts: number;                       // sips of water in the calabash
  heartsUpdated: number;
  completed: Record<string, number>;
  itemStats: Record<string, ItemStat>;
  dailyGoal: number;
  settings: { speaking: boolean; voiceFallback: boolean; speakSnoozeUntil: number };
  tests: Record<string, number>;        // unitId -> best test score (0..100)
  partial: Record<string, number>;      // stepId -> fraction of an unfinished lesson/conversation (0..1)
  updatedAt: number;
}

export interface ContentOverride {
  item_id: string;
  course_code: string;
  target: string | null;
  english: string | null;
  swahili?: string | null;
  note: string | null;
  audio_url: string | null;
  status: ReviewStatus;
  confidence: Confidence;
  updated_at?: string;
}
