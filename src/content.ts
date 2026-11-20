// Starter course content.
// EVERY item ships as status "draft". It is a starting point for native-speaker
// reviewers, not finished teaching material. Reviewers correct items in the
// in-app Review panel; their edits are stored in Supabase and override what's here.
//
// IDs are positional (lessonId-index). To keep reviewer edits attached to the
// right word, only ever APPEND new rows to a lesson — don't reorder or delete.

import type { Confidence, Course, Lesson, Unit } from "./types.js";

type Row = [target: string, english: string, confidence: Confidence, note?: string];

function lesson(id: string, title: string, rows: Row[]): Lesson {
  return {
    id,
    title,
    items: rows.map(([target, english, confidence, note], i) => ({
      id: `${id}-${i + 1}`,
      target,
      english,
      confidence,
      note,
      status: "draft",
    })),
  };
}

function unit(id: string, title: string, icon: string, lessons: Lesson[]): Unit {
  return { id, title, icon, lessons };
}

const kikuyu: Course = {
  code: "kik",
  name: "Kikuyu",
  nativeName: "Gĩkũyũ",
  speakers: "Central Kenya — Kiambu, Murang'a, Nyeri, Kirinyaga, Nyandarua",
  dialectNote: "Draft content uses general Gĩkũyũ spelling with tilde vowels (ĩ, ũ).",
  units: [
    unit("kik-u1", "Greetings", "👋", [
      lesson("kik-u1-l1", "Saying hello", [
        ["Wĩ mwega?", "Are you well?", "high", "A common everyday greeting."],
        ["Ndĩ mwega", "I am well", "high"],
        ["Ũhoro waku?", "How are you?", "high", "Literally 'your news?'"],
        ["Nĩ wega", "Thank you", "high", "Also means 'it is good'."],
      ]),
      lesson("kik-u1-l2", "Introductions", [
        ["Ĩĩ", "Yes", "high"],
        ["Aca", "No", "medium", "Also written 'Aaca'."],
        ["Wĩtagwo atĩa?", "What is your name?", "high"],
        ["Njĩtagwo Wanjiku", "My name is Wanjiku", "high"],
        ["Thiĩ na wega", "Go well", "medium", "Said to someone leaving."],
        ["Tigwo na wega", "Stay well", "medium", "Said by the person leaving."],
      ]),
    ]),
    unit("kik-u2", "Numbers", "🔢", [
      lesson("kik-u2-l1", "One to five", [
        ["ĩmwe", "one", "high"], ["igĩrĩ", "two", "high"], ["ithatũ", "three", "high"],
        ["inya", "four", "high"], ["ithano", "five", "high"],
      ]),
      lesson("kik-u2-l2", "Six to ten", [
        ["ithathatũ", "six", "high"], ["mũgwanja", "seven", "high"], ["inyanya", "eight", "high"],
        ["kenda", "nine", "high"], ["ikũmi", "ten", "high"],
      ]),
    ]),
    unit("kik-u3", "Home & family", "🏠", [
      lesson("kik-u3-l1", "Around the home", [
        ["maaĩ", "water", "high"], ["irio", "food", "high"],
        ["nyũmba", "house", "high"], ["ng'ombe", "cow", "high"],
      ]),
      lesson("kik-u3-l2", "People", [
        ["mũndũ", "person", "high"], ["mwana", "child", "high"],
        ["maitũ", "my mother", "medium", "Literally 'our mother'."], ["baba", "father", "medium"],
        ["ũka", "come", "high"], ["thiĩ", "go", "high"],
      ]),
    ]),
  ],
};

const luo: Course = {
  code: "luo",
  name: "Luo",
  nativeName: "Dholuo",
  speakers: "Western Kenya around Lake Victoria — Kisumu, Siaya, Homa Bay, Migori",
  dialectNote: "Dholuo is tonal; written forms here don't mark tone, so native audio matters a lot.",
  units: [
    unit("luo-u1", "Greetings", "👋", [
      lesson("luo-u1-l1", "Saying hello", [
        ["Misawa", "Hello", "high"],
        ["Idhi nade?", "How are you?", "high", "Literally 'how are you going?'"],
        ["Adhi maber", "I am fine", "high"],
        ["Erokamano", "Thank you", "high"],
        ["Erokamano ahinya", "Thank you very much", "high"],
      ]),
      lesson("luo-u1-l2", "Introductions", [
        ["Ee", "Yes", "high"],
        ["Ooyo", "No", "medium"],
        ["Nyingi ng'a?", "What is your name?", "medium"],
        ["Nyinga Akinyi", "My name is Akinyi", "medium"],
        ["Oriti", "Goodbye", "high", "Said to one person."],
        ["Oyawore", "Good morning", "medium"],
      ]),
    ]),
    unit("luo-u2", "Numbers", "🔢", [
      lesson("luo-u2-l1", "One to five", [
        ["achiel", "one", "high"], ["ariyo", "two", "high"], ["adek", "three", "high"],
        ["ang'wen", "four", "high"], ["abich", "five", "high"],
      ]),
      lesson("luo-u2-l2", "Six to ten", [
        ["auchiel", "six", "high"], ["abiriyo", "seven", "high"], ["aboro", "eight", "high"],
        ["ochiko", "nine", "high"], ["apar", "ten", "high"],
      ]),
    ]),
    unit("luo-u3", "Home & family", "🏠", [
      lesson("luo-u3-l1", "Around the home", [
        ["pi", "water", "high"], ["chiemo", "food", "high"],
        ["ot", "house", "high"], ["dhiang'", "cow", "high"], ["rech", "fish", "high"],
      ]),
      lesson("luo-u3-l2", "People", [
        ["dhano", "person", "medium"], ["nyathi", "child", "high"],
        ["mama", "mother", "medium"], ["baba", "father", "medium"],
        ["bi", "come", "medium"], ["dhi", "go", "medium"],
      ]),
    ]),
  ],
};

const luhya: Course = {
  code: "luy",
  name: "Luhya",
  nativeName: "Oluluhya",
  speakers: "Western Kenya — Kakamega, Bungoma, Vihiga, Busia",
  dialectNote:
    "Luhya is a cluster of ~18 dialects (Bukusu, Maragoli, Idakho, Wanga, Marama…). Choose one dialect to launch with — these drafts are low-confidence and need a dialect reviewer.",
  units: [
    unit("luy-u1", "Greetings", "👋", [
      lesson("luy-u1-l1", "Saying hello", [
        ["Mulembe", "Hello (peace)", "high", "Understood across most Luhya dialects."],
        ["Ee", "Yes", "medium"],
        ["Mama", "Mother", "medium"],
        ["Papa", "Father", "medium"],
      ]),
    ]),
    unit("luy-u2", "Numbers", "🔢", [
      lesson("luy-u2-l1", "One to five", [
        ["ndala", "one", "low"], ["tsibili", "two", "low"], ["tsitaru", "three", "low"],
        ["tsine", "four", "low"], ["tsirano", "five", "low"],
      ]),
      lesson("luy-u2-l2", "Six to ten", [
        ["sita", "six", "low"], ["saba", "seven", "low"], ["munane", "eight", "low"],
        ["tisa", "nine", "low"], ["ikhumi", "ten", "low"],
      ]),
    ]),
    unit("luy-u3", "Home & family", "🏠", [
      lesson("luy-u3-l1", "Everyday words", [
        ["omundu", "person", "medium"], ["omwana", "child", "medium"],
        ["eng'ombe", "cow", "medium"], ["inzu", "house", "low", "Varies strongly by dialect."],
        ["amatsi", "water", "low", "Varies strongly by dialect."],
      ]),
    ]),
  ],
};

const kamba: Course = {
  code: "kam",
  name: "Kamba",
  nativeName: "Kĩkamba",
  speakers: "Eastern Kenya — Machakos, Makueni, Kitui",
  dialectNote: "Draft content uses common Machakos-area spelling.",
  units: [
    unit("kam-u1", "Greetings", "👋", [
      lesson("kam-u1-l1", "Saying hello", [
        ["Wakya", "Hello / Good morning", "medium"],
        ["Nesa", "Fine / well", "high"],
        ["Ũvoo waku?", "How are you?", "medium", "Literally 'your news?'"],
        ["Nĩ nesa", "It is fine", "medium"],
        ["Nĩ ngatho", "Thank you", "medium"],
      ]),
      lesson("kam-u1-l2", "Introductions", [
        ["Ĩĩ", "Yes", "medium"],
        ["Wĩtawa ata?", "What is your name?", "medium"],
        ["Nĩtawa Mwikali", "My name is Mwikali", "medium"],
        ["mũndũ", "person", "high"],
      ]),
    ]),
    unit("kam-u2", "Numbers", "🔢", [
      lesson("kam-u2-l1", "One to five", [
        ["ĩmwe", "one", "medium"], ["ilĩ", "two", "medium"], ["itatũ", "three", "medium"],
        ["ina", "four", "medium"], ["itano", "five", "medium"],
      ]),
      lesson("kam-u2-l2", "Six to ten", [
        ["thanthatũ", "six", "medium"], ["mũonza", "seven", "medium"], ["nyaanya", "eight", "medium"],
        ["kenda", "nine", "medium"], ["ĩkũmi", "ten", "medium"],
      ]),
    ]),
    unit("kam-u3", "Home & family", "🏠", [
      lesson("kam-u3-l1", "Everyday words", [
        ["kĩw'ũ", "water", "medium"], ["lĩu", "food", "medium"],
        ["nyũmba", "house", "high"], ["ng'ombe", "cow", "high"], ["mwana", "child", "high"],
      ]),
    ]),
  ],
};

const kalenjin: Course = {
  code: "kln",
  name: "Kalenjin",
  nativeName: "Kalenjin",
  speakers: "Rift Valley — Uasin Gishu, Nandi, Kericho, Bomet, Baringo, Elgeyo-Marakwet",
  dialectNote:
    "Kalenjin covers several closely related languages (Kipsigis, Nandi, Keiyo, Tugen…). Drafts lean Kipsigis/Nandi — confirm which to launch with.",
  units: [
    unit("kln-u1", "Greetings", "👋", [
      lesson("kln-u1-l1", "Saying hello", [
        ["Chamgei", "Hello", "high"],
        ["Chamgei mising", "Hello (very warmly)", "medium", "'Mising' means 'very / a lot'."],
        ["Kongoi", "Thank you", "high"],
        ["Kongoi mising", "Thank you very much", "high"],
      ]),
    ]),
    unit("kln-u2", "Numbers", "🔢", [
      lesson("kln-u2-l1", "One to five", [
        ["agenge", "one", "medium"], ["aeng'", "two", "medium"], ["somok", "three", "medium"],
        ["angwan", "four", "medium"], ["mut", "five", "medium"],
      ]),
      lesson("kln-u2-l2", "Six to ten", [
        ["lo", "six", "medium"], ["tisap", "seven", "medium"], ["sisit", "eight", "medium"],
        ["sogol", "nine", "medium"], ["taman", "ten", "medium"],
      ]),
    ]),
    unit("kln-u3", "Home & family", "🏠", [
      lesson("kln-u3-l1", "Everyday words", [
        ["bek", "water", "high"], ["chego", "milk", "high"],
        ["kot", "house", "medium"], ["tany", "cow", "medium"],
        ["lakwet", "child", "medium"], ["chito", "person", "medium"],
      ]),
    ]),
  ],
};

export const COURSES: Course[] = [kikuyu, luo, luhya, kamba, kalenjin];
