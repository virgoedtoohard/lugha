export type Confidence = "low" | "medium" | "high";
export type ReviewStatus = "draft" | "reviewed";

export interface Item {
  id: string;
  target: string;       // word or phrase in the Kenyan language
  english: string;
  note?: string;        // usage / cultural note shown after answering
  audio?: string;       // public URL of a native-speaker recording
  status: ReviewStatus;
  confidence: Confidence;
}

export interface Lesson {
  id: string;
  title: string;
  items: Item[];
}

export interface Unit {
  id: string;
  title: string;
  icon: string;
  lessons: Lesson[];
}

export interface Course {
  code: string;
  name: string;         // English name
  nativeName: string;
  speakers: string;     // short description of where it's spoken
  dialectNote: string;
  units: Unit[];
}

export type Exercise =
  | { kind: "choose"; item: Item; prompt: string; options: string[]; answer: string; direction: "to-en" | "to-target" }
  | { kind: "match"; items: Item[] }
  | { kind: "build"; item: Item; bank: string[] }
  | { kind: "type"; item: Item }
  | { kind: "listen"; item: Item; options: string[] };

export interface ItemStat {
  seen: number;
  correct: number;
  last: number;         // epoch ms
}

export interface Progress {
  version: 1;
  activeCourse: string | null;
  xp: number;
  dailyXp: Record<string, number>;      // "YYYY-MM-DD" -> xp earned that day
  streak: number;
  lastActiveDay: string | null;
  hearts: number;
  heartsUpdated: number;                // epoch ms of last heart regen tick
  completed: Record<string, number>;    // lessonId -> times completed
  itemStats: Record<string, ItemStat>;
  dailyGoal: number;
  updatedAt: number;
}

export interface ContentOverride {
  item_id: string;
  course_code: string;
  target: string | null;
  english: string | null;
  note: string | null;
  audio_url: string | null;
  status: ReviewStatus;
  confidence: Confidence;
  updated_at?: string;
}
