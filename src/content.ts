// Course content.
// EVERY item ships as status "draft": a starting point for native-speaker reviewers,
// not finished teaching material. Reviewers correct items in the in-app Review panel;
// their edits are stored in Supabase and override what's here.
//
// IDs are positional (lessonId-index). To keep reviewer edits attached to the right
// word, only ever APPEND rows to a lesson — don't reorder or delete.
//
// Sources used besides general knowledge (all need checking by native speakers):
//  - Maragoli phrases: lughayangu.com "Common Kimaragoli phrases" (crowd-sourced)
//  - Bukusu numbers & words: lughayangu.com "Numbers in Bukusu", Bukusu word list
//  - Luo greetings/numbers: Wikivoyage Luo phrasebook
//  - Kalenjin "Kitachin", "Ata?": Omniglot Tugen phrases
//  - Nyore words: Wikipedia Luhya comparative table
//  - Nyore (Olunyole): single words matched to their verses in Ebaibo Inzienukhu
//    (Bible Society of Kenya, 2019, bible.com version 2882), e.g. GEN 1, 7:12, 15:5, 37:9,
//    EXO 9:3, MAT 2:11, 5:13-15, 7:24, 8:13, JHN 4:11, 6:51, LUK 5:4, 12:28, 15:7. No verses are copied.
//  - Wanga (Oluwanga): Anangwe & Marlo, Luwanga–English Dictionary, draft of 2008
//    (re-translation of Appleby's 1943 Luhya–English Vocabulary, recorded by a native speaker)

import type { CastMember, Confidence, Course, Lesson, Scene, Unit } from "./types.js";

type Row = [target: string, english: string, swahili: string, confidence: Confidence, note?: string];
type T = { en: string; sw: string };

const tr = (en: string, sw: string): T => ({ en, sw });

function lesson(id: string, title: T, rows: Row[], scene?: Scene): Lesson {
  return {
    id,
    title,
    scene,
    items: rows.map(([target, english, swahili, confidence, note], i) => ({
      id: `${id}-${i + 1}`, target, english, swahili, confidence, note, status: "draft",
    })),
  };
}

function unit(id: string, title: T, place: string, bead: string, lessons: Lesson[]): Unit {
  return { id, title, place, bead, lessons };
}

function scene(setting: T, ...lines: [who: string, item: string][]): Scene {
  return { setting, lines: lines.map(([who, item]) => ({ who, item })) };
}

function cast(elder: [string, string], friend: string, seller: string, conductor: string, elderRole = tr("Grandmother", "Bibi")): CastMember[] {
  return [
    { key: "elder", name: elder[0], role: elderRole, avatar: elder[1], voice: { gender: "f", age: "old" } },
    { key: "friend", name: friend, role: tr("Friend", "Rafiki"), avatar: "🧑🏾", voice: { gender: "m", age: "young" } },
    { key: "seller", name: seller, role: tr("Market seller", "Muuzaji sokoni"), avatar: "👩🏾‍🌾", voice: { gender: "f", age: "adult" } },
    { key: "conductor", name: conductor, role: tr("Matatu conductor", "Kondakta wa matatu"), avatar: "👨🏾", voice: { gender: "m", age: "adult" } },
  ];
}

const SW_NUM = ["moja", "mbili", "tatu", "nne", "tano", "sita", "saba", "nane", "tisa", "kumi"];
const EN_NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function numbers(prefix: string, words: string[], conf: Confidence, notes: Record<number, string> = {}): Lesson[] {
  const row = (w: string, i: number): Row => [w, EN_NUM[i], SW_NUM[i], conf, notes[i]];
  return [
    lesson(`${prefix}-l1`, tr("One to five", "Moja hadi tano"), words.slice(0, 5).map((w, i) => row(w, i))),
    lesson(`${prefix}-l2`, tr("Six to ten", "Sita hadi kumi"), words.slice(5, 10).map((w, i) => row(w, i + 5))),
  ];
}

// Bead colours (Kenyan beadwork palette)
const RED = "#B8322A", BLUE = "#2456A4", GREEN = "#3E7B3A", YELLOW = "#E2A21B", ORANGE = "#D9692B";
const PURPLE = "#6A3D9A", TEAL = "#1F8A82", BLACK = "#2A2320";

const U = {
  greet: tr("Greetings", "Salamu"),
  hello: tr("Saying hello", "Kusalimiana"),
  intro: tr("Introductions", "Kujitambulisha"),
  numbers: tr("Numbers", "Nambari"),
  home: tr("Home & family", "Nyumbani na familia"),
  aroundHome: tr("Around the home", "Nyumbani"),
  people: tr("People", "Watu"),
  market: tr("At the market", "Sokoni"),
  food: tr("Food", "Vyakula"),
  buying: tr("Buying", "Kununua"),
  travel: tr("Getting around", "Kusafiri"),
  whereTo: tr("Where to?", "Unaenda wapi?"),
  time: tr("Today & tomorrow", "Leo na kesho"),
  everyday: tr("Everyday words", "Maneno ya kila siku"),
  family: tr("Family", "Familia"),
  relatives: tr("Relatives", "Jamaa"),
  menWomen: tr("Men, women & children", "Wanaume, wanawake na watoto"),
  nature: tr("Animals & nature", "Wanyama na mazingira"),
  animals: tr("Animals", "Wanyama"),
  land: tr("Sky, land & water", "Anga, ardhi na maji"),
  body: tr("The body", "Mwili"),
  bodyParts: tr("Head to toe", "Kichwa hadi mguu"),
};

const S = {
  visitElder: tr("Visiting grandmother at home", "Kumtembelea bibi nyumbani"),
  newFriend: tr("Meeting a new friend", "Kukutana na rafiki mpya"),
  stall: tr("At the market stall", "Kwenye kibanda sokoni"),
  stage: tr("At the matatu stage", "Kwenye kituo cha matatu"),
  photos: tr("Looking at family photos", "Kuangalia picha za familia"),
};

// ───────────────────────── Gĩkũyũ ─────────────────────────
const kikuyu: Course = {
  code: "kik", guide: "kik",
  frames: { whatIs: { target: "Kĩu nĩ kĩĩ?", english: "What is that?", swahili: "Hicho ni nini?", confidence: "medium" }, itIs: { prefix: "Nĩ ", en: "It's ", sw: "Ni " }, howMany: { target: "Nĩ ciigana?", english: "How many are there?", swahili: "Ni ngapi?", confidence: "medium" }, thanks: "kik-u1-l1-4", bye: "kik-u1-l2-5", greet: ["kik-u1-l1-1", "kik-u1-l1-2"],
    glosses: { "kĩu": { en: "that", sw: "hicho" }, "nĩ": { en: "is / it is", sw: "ni" }, "kĩĩ": { en: "what", sw: "nini" }, "ciigana": { en: "how many", sw: "ngapi" } } },
  family: "Gĩkũyũ", name: "Kikuyu", nativeName: "Gĩkũyũ",
  speakers: "Central Kenya — Nyeri, Murang'a, Kiambu, Kirinyaga, Nyandarua",
  dialectNote: "Uses general Gĩkũyũ spelling with tilde vowels (ĩ, ũ).",
  cast: cast(["Cũcũ Wairimu", "👵🏾"], "Kamau", "Mama Njeri", "Mwangi"),
  units: [
    unit("kik-u1", U.greet, "Nyeri", RED, [
      lesson("kik-u1-l1", U.hello, [
        ["Wĩ mwega?", "Are you well?", "Uko salama?", "high", "A common everyday greeting."],
        ["Ndĩ mwega", "I am well", "Niko salama", "high"],
        ["Ũhoro waku?", "How are you?", "Habari yako?", "high", "Literally 'your news?'"],
        ["Nĩ wega", "Thank you", "Asante", "high", "Also means 'it is good'."],
      ], scene(S.visitElder, ["elder", "kik-u1-l1-3"], ["elder", "kik-u1-l1-1"], ["you", "kik-u1-l1-2"])),
      lesson("kik-u1-l2", U.intro, [
        ["Ĩĩ", "Yes", "Ndiyo", "high"],
        ["Aca", "No", "Hapana", "medium", "Also written 'Aaca'."],
        ["Wĩtagwo atĩa?", "What is your name?", "Unaitwa nani?", "high"],
        ["Njĩtagwo Wanjiku", "My name is Wanjiku", "Ninaitwa Wanjiku", "high"],
        ["Thiĩ na wega", "Go well", "Nenda salama", "medium", "Said to someone leaving."],
        ["Tigwo na wega", "Stay well", "Kaa salama", "medium", "Said by the person leaving."],
      ], scene(S.newFriend, ["friend", "kik-u1-l2-3"], ["you", "kik-u1-l2-4"])),
    ]),
    unit("kik-u2", U.numbers, "Murang'a", BLUE,
      numbers("kik-u2", ["ĩmwe", "igĩrĩ", "ithatũ", "inya", "ithano", "ithathatũ", "mũgwanja", "inyanya", "kenda", "ikũmi"], "high")),
    unit("kik-u3", U.home, "Kirinyaga", GREEN, [
      lesson("kik-u3-l1", U.aroundHome, [
        ["maaĩ", "water", "maji", "high"], ["irio", "food", "chakula", "high"],
        ["nyũmba", "house", "nyumba", "high"], ["ng'ombe", "cow", "ng'ombe", "high"],
      ]),
      lesson("kik-u3-l2", U.people, [
        ["mũndũ", "person", "mtu", "high"], ["mwana", "child", "mtoto", "high"],
        ["maitũ", "my mother", "mama yangu", "medium", "Literally 'our mother'."], ["baba", "father", "baba", "medium"],
        ["ũka", "come", "njoo", "high"], ["thiĩ", "go", "nenda", "high"],
      ]),
    ]),
    unit("kik-u4", U.market, "Kiambu", YELLOW, [
      lesson("kik-u4-l1", U.food, [
        ["ngima", "ugali", "ugali", "high"], ["iria", "milk", "maziwa", "high"],
        ["marigũ", "bananas", "ndizi", "high"], ["nyama", "meat", "nyama", "high"],
        ["mbembe", "maize", "mahindi", "high"],
      ]),
      lesson("kik-u4-l2", U.buying, [
        ["thoko", "market", "soko", "high"], ["mbeca", "money", "pesa", "high"],
        ["Nĩ mbeca cigana?", "How much is it?", "Ni pesa ngapi?", "medium"],
        ["Nĩngwenda iria", "I want milk", "Nataka maziwa", "medium"],
      ], scene(S.stall, ["seller", "kik-u1-l1-3"], ["you", "kik-u1-l1-2"], ["you", "kik-u4-l2-4"])),
    ]),
    unit("kik-u5", U.travel, "Nyandarua", ORANGE, [
      lesson("kik-u5-l1", U.whereTo, [
        ["Ũrathiĩ kũ?", "Where are you going?", "Unaenda wapi?", "medium"],
        ["Ndĩrathiĩ mũciĩ", "I am going home", "Ninaenda nyumbani", "medium"],
        ["mũciĩ", "home", "nyumbani", "high"],
        ["matatũ", "matatu", "matatu", "high", "Shared minibus taxi."],
      ], scene(S.stage, ["conductor", "kik-u5-l1-1"], ["you", "kik-u5-l1-2"])),
      lesson("kik-u5-l2", U.time, [
        ["ũmũthĩ", "today", "leo", "high"], ["rũciũ", "tomorrow", "kesho", "high"],
        ["ira", "yesterday", "jana", "high"], ["Ũka gũkũ", "Come here", "Njoo hapa", "medium"],
      ]),
    ]),
    unit("kik-u6", U.family, "Thika", PURPLE, [
      lesson("kik-u6-l1", U.relatives, [
        ["cũcũ", "grandmother", "bibi", "high"],
        ["guka", "grandfather", "babu", "high"],
        ["mũrũ wa maitũ", "my brother", "kaka yangu", "high", "Literally 'son of my mother'."],
        ["mwarĩ wa maitũ", "my sister", "dada yangu", "high", "Literally 'daughter of my mother'."],
        ["Ũyũ nũũ?", "Who is this?", "Huyu ni nani?", "medium"],
        ["Ũyũ nĩ guka", "This is grandfather", "Huyu ni babu", "medium"],
      ], scene(S.photos, ["friend", "kik-u6-l1-5"], ["you", "kik-u6-l1-6"])),
      lesson("kik-u6-l2", U.menWomen, [
        ["mũtumia", "woman / wife", "mwanamke / mke", "high"],
        ["mũthuuri", "man / husband", "mwanamume / mume", "high", "Also used for a respected elder."],
        ["kahĩĩ", "boy", "mvulana", "high"],
        ["kairĩtu", "girl", "msichana", "high"],
        ["andũ", "people", "watu", "high"],
      ]),
    ]),
    unit("kik-u7", U.nature, "Nanyuki", TEAL, [
      lesson("kik-u7-l1", U.animals, [
        ["mbũri", "goat", "mbuzi", "high"], ["ngũkũ", "chicken", "kuku", "high"],
        ["ngui", "dog", "mbwa", "high"], ["nyau", "cat", "paka", "medium"],
        ["njogu", "elephant", "tembo", "high"], ["mũrũthi", "lion", "simba", "high"],
        ["nyoni", "bird", "ndege", "high"],
      ]),
      lesson("kik-u7-l2", U.land, [
        ["mbura", "rain", "mvua", "high"], ["riũa", "sun", "jua", "high"],
        ["mwaki", "fire", "moto", "high"], ["mũtĩ", "tree", "mti", "high"],
        ["rũũĩ", "river", "mto", "high"],
        ["kĩrĩma", "hill / mountain", "mlima", "high", "Mount Kenya is Kĩrĩnyaga."],
      ]),
    ]),
    unit("kik-u8", U.body, "Karatina", BLACK, [
      lesson("kik-u8-l1", U.bodyParts, [
        ["mũtwe", "head", "kichwa", "high"], ["maitho", "eyes", "macho", "high"],
        ["kanua", "mouth", "mdomo", "high"], ["guoko", "hand / arm", "mkono", "high"],
        ["kũgũrũ", "leg / foot", "mguu", "high"], ["matũ", "ears", "masikio", "high"],
        ["nyũũru", "nose", "pua", "medium"],
      ]),
    ]),
  ],
};

// ───────────────────────── Dholuo ─────────────────────────
const luo: Course = {
  code: "luo", guide: "luo",
  frames: { whatIs: { target: "Mano en ang'o?", english: "What is this?", swahili: "Hiki ni nini?", confidence: "medium" }, itIs: { prefix: "En ", en: "It's ", sw: "Ni " }, howMany: { target: "Gin adi?", english: "How many are there?", swahili: "Ni ngapi?", confidence: "medium" }, thanks: "luo-u1-l1-4", bye: "luo-u1-l2-5", greet: ["luo-u1-l1-2", "luo-u1-l1-3"],
    glosses: { "mano": { en: "this", sw: "hiki" }, "en": { en: "is / it is", sw: "ni" }, "ang'o": { en: "what", sw: "nini" }, "gin": { en: "they are", sw: "ni" }, "adi": { en: "how many", sw: "ngapi" } } },
  family: "Dholuo", name: "Luo", nativeName: "Dholuo",
  speakers: "Around Lake Victoria — Kisumu, Siaya, Homa Bay, Migori",
  dialectNote: "Dholuo is tonal; written forms here don't mark tone, so native audio matters a lot.",
  cast: cast(["Dani Akoth", "👵🏾"], "Otieno", "Mama Atieno", "Ochieng'"),
  units: [
    unit("luo-u1", U.greet, "Kisumu", RED, [
      lesson("luo-u1-l1", U.hello, [
        ["Misawa", "Hello", "Hujambo", "high"],
        ["Idhi nade?", "How are you?", "Habari yako?", "high", "Literally 'how are you going?'"],
        ["Adhi maber", "I am fine", "Niko salama", "high"],
        ["Erokamano", "Thank you", "Asante", "high"],
        ["Erokamano ahinya", "Thank you very much", "Asante sana", "high"],
      ], scene(S.visitElder, ["elder", "luo-u1-l1-1"], ["elder", "luo-u1-l1-2"], ["you", "luo-u1-l1-3"])),
      lesson("luo-u1-l2", U.intro, [
        ["Ee", "Yes", "Ndiyo", "high"],
        ["Ooyo", "No", "Hapana", "medium"],
        ["Nyingi ng'a?", "What is your name?", "Unaitwa nani?", "medium"],
        ["Nyinga Akinyi", "My name is Akinyi", "Ninaitwa Akinyi", "medium"],
        ["Oriti", "Goodbye", "Kwaheri", "high", "Said to one person."],
        ["Oyawore", "Good morning", "Habari ya asubuhi", "medium", "Also written 'Oyawre'."],
        ["Oimore", "Good evening", "Habari ya jioni", "medium"],
      ], scene(S.newFriend, ["friend", "luo-u1-l2-3"], ["you", "luo-u1-l2-4"])),
    ]),
    unit("luo-u2", U.numbers, "Siaya", BLUE,
      numbers("luo-u2", ["achiel", "ariyo", "adek", "ang'wen", "abich", "auchiel", "abiriyo", "aboro", "ochiko", "apar"], "high")),
    unit("luo-u3", U.home, "Homa Bay", GREEN, [
      lesson("luo-u3-l1", U.aroundHome, [
        ["pi", "water", "maji", "high"], ["chiemo", "food", "chakula", "high"],
        ["ot", "house", "nyumba", "high"], ["dhiang'", "cow", "ng'ombe", "high"], ["rech", "fish", "samaki", "high"],
      ]),
      lesson("luo-u3-l2", U.people, [
        ["dhano", "person", "mtu", "medium"], ["nyathi", "child", "mtoto", "high"],
        ["mama", "mother", "mama", "medium"], ["baba", "father", "baba", "medium"],
        ["bi", "come", "njoo", "medium"], ["dhi", "go", "nenda", "medium"],
      ]),
    ]),
    unit("luo-u4", U.market, "Migori", YELLOW, [
      lesson("luo-u4-l1", U.food, [
        ["kuon", "ugali", "ugali", "high"], ["chak", "milk", "maziwa", "high"],
        ["rabolo", "bananas", "ndizi", "medium"], ["ring'o", "meat", "nyama", "high"],
        ["omena", "omena (small fish)", "dagaa", "high", "Small lake fish, dried then fried or stewed."],
      ]),
      lesson("luo-u4-l2", U.buying, [
        ["chiro", "market", "soko", "high"], ["pesa", "money", "pesa", "high"],
        ["Nengo en adi?", "How much is it?", "Bei ni ngapi?", "medium"],
        ["Adwaro chak", "I want milk", "Nataka maziwa", "medium"],
      ], scene(S.stall, ["seller", "luo-u1-l1-2"], ["you", "luo-u1-l1-3"], ["you", "luo-u4-l2-3"])),
    ]),
    unit("luo-u5", U.travel, "Rusinga Island", ORANGE, [
      lesson("luo-u5-l1", U.whereTo, [
        ["Idhi kanye?", "Where are you going?", "Unaenda wapi?", "high"],
        ["Adhi dala", "I am going home", "Ninaenda nyumbani", "high"],
        ["dala", "home (homestead)", "nyumbani", "high"],
        ["matatu", "matatu", "matatu", "high", "Shared minibus taxi."],
      ], scene(S.stage, ["conductor", "luo-u5-l1-1"], ["you", "luo-u5-l1-2"])),
      lesson("luo-u5-l2", U.time, [
        ["kawuono", "today", "leo", "high"], ["kiny", "tomorrow", "kesho", "high"],
        ["nyoro", "yesterday", "jana", "high"], ["Bi ka", "Come here", "Njoo hapa", "medium"],
      ]),
    ]),
    unit("luo-u6", U.family, "Bondo", PURPLE, [
      lesson("luo-u6-l1", U.relatives, [
        ["dani", "grandmother", "bibi", "high"],
        ["kwaro", "my grandfather", "babu yangu", "high"],
        ["owadwa", "my brother", "kaka yangu", "high"],
        ["nyamera", "my sister", "dada yangu", "high"],
        ["Ma en ng'a?", "Who is this?", "Huyu ni nani?", "medium"],
        ["Ma en kwara", "This is my grandfather", "Huyu ni babu yangu", "medium"],
      ], scene(S.photos, ["friend", "luo-u6-l1-5"], ["you", "luo-u6-l1-6"])),
      lesson("luo-u6-l2", U.menWomen, [
        ["dhako", "woman", "mwanamke", "high"], ["dichwo", "man", "mwanamume", "high"],
        ["wuowi", "boy", "mvulana", "high"], ["nyako", "girl", "msichana", "high"],
        ["ji", "people", "watu", "medium"],
      ]),
    ]),
    unit("luo-u7", U.nature, "Kendu Bay", TEAL, [
      lesson("luo-u7-l1", U.animals, [
        ["diel", "goat", "mbuzi", "high"], ["gweno", "chicken", "kuku", "high"],
        ["guok", "dog", "mbwa", "high"], ["paka", "cat", "paka", "high"],
        ["liech", "elephant", "tembo", "high"], ["sibuor", "lion", "simba", "high"],
        ["winyo", "bird", "ndege", "high"],
      ]),
      lesson("luo-u7-l2", U.land, [
        ["koth", "rain", "mvua", "high"], ["chieng'", "sun / day", "jua / siku", "high"],
        ["mach", "fire", "moto", "high"], ["yath", "tree", "mti", "high"],
        ["aora", "river", "mto", "high"], ["got", "hill / mountain", "mlima", "high"],
        ["nam", "lake", "ziwa", "high", "Lake Victoria is Nam Lolwe."],
      ]),
    ]),
    unit("luo-u8", U.body, "Ahero", BLACK, [
      lesson("luo-u8-l1", U.bodyParts, [
        ["wich", "head", "kichwa", "high"], ["wang'", "eye", "jicho", "high"],
        ["dhok", "mouth", "mdomo", "high"], ["lwedo", "hand", "mkono", "high"],
        ["tiendo", "leg / foot", "mguu", "high"], ["it", "ear", "sikio", "high"],
        ["um", "nose", "pua", "high"],
      ]),
    ]),
  ],
};

// ───────────────────────── Kĩkamba ─────────────────────────
const kamba: Course = {
  code: "kam", guide: "kam",
  frames: { whatIs: { target: "Kĩĩ nĩ kyaũ?", english: "What is this?", swahili: "Hiki ni nini?", confidence: "low" }, itIs: { prefix: "Nĩ ", en: "It's ", sw: "Ni " }, howMany: { target: "Nĩ syĩana?", english: "How many are there?", swahili: "Ni ngapi?", confidence: "low" }, thanks: "kam-u1-l1-5", greet: ["kam-u1-l1-3", "kam-u1-l1-4"],
    glosses: { "nĩ": { en: "is / it is", sw: "ni" } } },
  family: "Kĩkamba", name: "Kamba", nativeName: "Kĩkamba",
  speakers: "Eastern Kenya — Machakos, Makueni, Kitui",
  dialectNote: "Uses common Machakos-area spelling.",
  cast: cast(["Susu Mwikali", "👵🏾"], "Musyoka", "Mama Mwende", "Mutua"),
  units: [
    unit("kam-u1", U.greet, "Machakos", RED, [
      lesson("kam-u1-l1", U.hello, [
        ["Wakya", "Hello / Good morning", "Hujambo", "medium"],
        ["Nesa", "Fine / well", "Nzuri", "high"],
        ["Ũvoo waku?", "How are you?", "Habari yako?", "medium", "Literally 'your news?'"],
        ["Nĩ nesa", "It is fine", "Ni nzuri", "medium"],
        ["Nĩ ngatho", "Thank you", "Asante", "medium"],
      ], scene(S.visitElder, ["elder", "kam-u1-l1-1"], ["elder", "kam-u1-l1-3"], ["you", "kam-u1-l1-4"])),
      lesson("kam-u1-l2", U.intro, [
        ["Ĩĩ", "Yes", "Ndiyo", "medium"],
        ["Wĩtawa ata?", "What is your name?", "Unaitwa nani?", "medium"],
        ["Nĩtawa Mwikali", "My name is Mwikali", "Ninaitwa Mwikali", "medium"],
        ["mũndũ", "person", "mtu", "high"],
      ], scene(S.newFriend, ["friend", "kam-u1-l2-2"], ["you", "kam-u1-l2-3"])),
    ]),
    unit("kam-u2", U.numbers, "Kitui", BLUE,
      numbers("kam-u2", ["ĩmwe", "ilĩ", "itatũ", "ina", "itano", "thanthatũ", "mũonza", "nyaanya", "kenda", "ĩkũmi"], "medium")),
    unit("kam-u3", U.home, "Makueni", GREEN, [
      lesson("kam-u3-l1", U.everyday, [
        ["kĩw'ũ", "water", "maji", "medium"], ["lĩu", "food", "chakula", "medium"],
        ["nyũmba", "house", "nyumba", "high"], ["ng'ombe", "cow", "ng'ombe", "high"], ["mwana", "child", "mtoto", "high"],
      ]),
    ]),
    unit("kam-u4", U.market, "Mwingi", YELLOW, [
      lesson("kam-u4-l1", U.food, [
        ["ũsima", "ugali", "ugali", "high"], ["iia", "milk", "maziwa", "medium"],
        ["maiu", "bananas", "ndizi", "high"], ["nyama", "meat", "nyama", "high"], ["ũsuu", "porridge", "uji", "high"],
      ]),
      lesson("kam-u4-l2", U.buying, [
        ["mbesa", "money", "pesa", "medium"], ["ndũka", "shop", "duka", "medium"],
        ["Nĩ mbesa yĩana?", "How much is it?", "Ni pesa ngapi?", "low"],
        ["Nĩkwenda iia", "I want milk", "Nataka maziwa", "low"],
      ], scene(S.stall, ["seller", "kam-u1-l1-3"], ["you", "kam-u1-l1-4"], ["you", "kam-u4-l2-4"])),
    ]),
    unit("kam-u5", U.travel, "Kibwezi", ORANGE, [
      lesson("kam-u5-l1", U.whereTo, [
        ["Ũthi va?", "Where are you going?", "Unaenda wapi?", "medium"],
        ["mũsyĩ", "home", "nyumbani", "high"],
        ["matatũ", "matatu", "matatu", "high", "Shared minibus taxi."],
        ["Ũka vaa", "Come here", "Njoo hapa", "medium"],
      ]),
    ]),
    unit("kam-u6", U.family, "Kangundo", PURPLE, [
      lesson("kam-u6-l1", U.menWomen, [
        ["susu", "grandmother", "bibi", "medium"], ["umau", "grandfather", "babu", "medium"],
        ["mũndũ mũka", "woman", "mwanamke", "medium"], ["mũndũ mũũme", "man", "mwanamume", "medium"],
        ["kavĩsĩ", "boy", "mvulana", "medium"], ["kelĩtu", "girl", "msichana", "medium"],
      ]),
    ]),
    unit("kam-u7", U.nature, "Tala", TEAL, [
      lesson("kam-u7-l1", U.animals, [
        ["mbũi", "goat", "mbuzi", "high"], ["ngũkũ", "chicken", "kuku", "high"],
        ["ngitĩ", "dog", "mbwa", "high"], ["nzou", "elephant", "tembo", "high"],
        ["mũnyambũ", "lion", "simba", "medium"], ["nyũnyi", "bird", "ndege", "medium"],
      ]),
      lesson("kam-u7-l2", U.land, [
        ["mbua", "rain", "mvua", "high"], ["syũa", "sun", "jua", "high"],
        ["mwaki", "fire", "moto", "high"], ["mũtĩ", "tree", "mti", "high"],
        ["ũsĩ", "river", "mto", "high"], ["kĩĩma", "hill", "kilima", "medium"],
      ]),
    ]),
    unit("kam-u8", U.body, "Wote", BLACK, [
      lesson("kam-u8-l1", U.bodyParts, [
        ["mũtwe", "head", "kichwa", "high"], ["metho", "eyes", "macho", "high"],
        ["kanywa", "mouth", "mdomo", "medium"], ["kwoko", "hand / arm", "mkono", "medium"],
        ["kũũ", "leg / foot", "mguu", "medium"], ["matũ", "ears", "masikio", "medium"],
      ]),
    ]),
  ],
};

// ───────────────────────── Kalenjin ─────────────────────────
const kalenjinGeneral: Course = {
  code: "kln", guide: "kln",
  frames: { howMany: { target: "Ata?", english: "How many?", swahili: "Ngapi?", confidence: "medium" }, thanks: "kln-u1-l1-3", greet: ["kln-u1-l1-1", "kln-u1-l1-2"] },
  family: "Kalenjin", name: "General", nativeName: "Kalenjin",
  speakers: "Rift Valley — Uasin Gishu, Nandi, Kericho, Bomet, Elgeyo-Marakwet, Baringo",
  dialectNote: "Words widely shared across Kalenjin varieties. For variety-specific lessons choose Kipsigis or Nandi.",
  cast: cast(["Kogo Chebet", "👵🏾"], "Kiprono", "Mama Chepkoech", "Kipchumba"),
  units: [
    unit("kln-u1", U.greet, "Eldoret", RED, [
      lesson("kln-u1-l1", U.hello, [
        ["Chamgei", "Hello", "Hujambo", "high"],
        ["Chamgei mising", "Hello (very warmly)", "Hujambo sana", "medium", "'Mising' means 'very / a lot'."],
        ["Kongoi", "Thank you", "Asante", "high"],
        ["Kongoi mising", "Thank you very much", "Asante sana", "high"],
        ["Kitachin", "You're welcome / Welcome", "Karibu", "medium", "Recorded in Tugen sources; confirm for other varieties."],
      ], scene(S.visitElder, ["elder", "kln-u1-l1-1"], ["you", "kln-u1-l1-2"])),
    ]),
    unit("kln-u2", U.numbers, "Kapsabet", BLUE,
      numbers("kln-u2", ["agenge", "aeng'", "somok", "angwan", "mut", "lo", "tisap", "sisit", "sogol", "taman"], "medium")),
    unit("kln-u3", U.home, "Iten", GREEN, [
      lesson("kln-u3-l1", U.everyday, [
        ["bek", "water", "maji", "high"], ["chego", "milk", "maziwa", "high"],
        ["kot", "house", "nyumba", "medium"], ["tany", "cow", "ng'ombe", "medium"],
        ["lakwet", "child", "mtoto", "medium"], ["chito", "person", "mtu", "medium"],
      ]),
    ]),
    unit("kln-u4", U.market, "Kericho", YELLOW, [
      lesson("kln-u4-l1", U.buying, [
        ["kimnyet", "ugali", "ugali", "high"], ["amitwogik", "food", "chakula", "medium"],
        ["rabisiek", "money", "pesa", "medium"],
        ["Ata?", "How much?", "Bei gani?", "medium", "Recorded in Tugen sources."],
        ["Amache chego", "I want milk", "Nataka maziwa", "medium"],
      ], scene(S.stall, ["seller", "kln-u1-l1-1"], ["you", "kln-u1-l1-2"], ["you", "kln-u4-l1-5"])),
    ]),
    unit("kln-u5", U.travel, "Bomet", ORANGE, [
      lesson("kln-u5-l1", U.whereTo, [
        ["Ibe ano?", "Where are you going?", "Unaenda wapi?", "low"],
        ["Abe kaa", "I am going home", "Ninaenda nyumbani", "low"],
        ["kaa", "home", "nyumbani", "medium"],
        ["mutai", "tomorrow", "kesho", "medium"],
        ["Nyoo", "Come", "Njoo", "medium"],
      ], scene(S.stage, ["conductor", "kln-u5-l1-1"], ["you", "kln-u5-l1-2"])),
    ]),
    unit("kln-u6", U.family, "Kabarnet", PURPLE, [
      lesson("kln-u6-l1", U.relatives, [
        ["kogo", "grandmother", "bibi", "high"], ["kugo", "grandfather", "babu", "medium"],
        ["kamet", "mother", "mama", "high"], ["korgo", "woman / wife", "mwanamke / mke", "medium"],
        ["chepto", "girl", "msichana", "medium"], ["werit", "boy", "mvulana", "medium"],
      ]),
    ]),
    unit("kln-u7", U.nature, "Eldama Ravine", TEAL, [
      lesson("kln-u7-l1", U.animals, [
        ["artet", "goat", "mbuzi", "medium"], ["ingokiet", "chicken", "kuku", "medium"],
        ["ngetundo", "lion", "simba", "medium"], ["beliot", "elephant", "tembo", "medium"],
        ["tarit", "bird", "ndege", "medium"],
      ]),
      lesson("kln-u7-l2", U.land, [
        ["asista", "sun", "jua", "high"], ["arawet", "moon / month", "mwezi", "high"],
        ["ketit", "tree", "mti", "medium"], ["tulwet", "hill / mountain", "mlima", "medium"],
        ["maat", "fire", "moto", "medium"], ["robta", "rain", "mvua", "low"],
      ]),
    ]),
    unit("kln-u8", U.body, "Kaptagat", BLACK, [
      lesson("kln-u8-l1", U.bodyParts, [
        ["metit", "head", "kichwa", "medium"], ["konda", "eye", "jicho", "medium"],
        ["kutit", "mouth", "mdomo", "medium"], ["eunet", "hand", "mkono", "medium"],
        ["kelda", "leg / foot", "mguu", "low"],
      ]),
    ]),
  ],
};

const kipsigis: Course = {
  code: "kln-sgc", guide: "kln",
  frames: { howMany: { target: "Ata?", english: "How many?", swahili: "Ngapi?", confidence: "medium" }, thanks: "kln-sgc-u1-l1-3", greet: ["kln-sgc-u1-l1-1", "kln-sgc-u1-l1-2"] },
  family: "Kalenjin", name: "Kipsigis", nativeName: "Kipsigis",
  speakers: "Kericho and Bomet — the largest Kalenjin group",
  dialectNote: "Kipsigis spelling. Kipsigis has long and short vowels (written doubled), which audio will make clear.",
  cast: cast(["Kogo Chepng'eno", "👵🏾"], "Kiprotich", "Mama Chelangat", "Kibet"),
  units: [
    unit("kln-sgc-u1", U.greet, "Kericho", RED, [
      lesson("kln-sgc-u1-l1", U.hello, [
        ["Chamgei", "Hello", "Hujambo", "high"],
        ["Chamgei mising", "Hello (very warmly)", "Hujambo sana", "medium"],
        ["Kongoi", "Thank you", "Asante", "high"],
        ["Kitachin", "Welcome / you're welcome", "Karibu", "medium"],
      ], scene(S.visitElder, ["elder", "kln-sgc-u1-l1-1"], ["you", "kln-sgc-u1-l1-2"])),
    ]),
    unit("kln-sgc-u2", U.numbers, "Litein", BLUE,
      numbers("kln-sgc-u2", ["agenge", "aeng'", "somok", "angwan", "mut", "lo", "tisap", "sisit", "sogol", "taman"], "medium")),
    unit("kln-sgc-u3", U.home, "Bomet", GREEN, [
      lesson("kln-sgc-u3-l1", U.everyday, [
        ["bek", "water", "maji", "high"], ["chego", "milk", "maziwa", "high"],
        ["kimnyet", "ugali", "ugali", "high"], ["lakwet", "child", "mtoto", "medium"],
        ["chito", "person", "mtu", "medium"], ["kaa", "home", "nyumbani", "medium"],
      ]),
    ]),
  ],
};

const nandi: Course = {
  code: "kln-niq", guide: "kln",
  frames: { thanks: "kln-niq-u1-l1-2", greet: ["kln-niq-u1-l1-1", "kln-niq-u1-l1-1"] },
  family: "Kalenjin", name: "Nandi", nativeName: "Naandi",
  speakers: "Nandi and Uasin Gishu",
  dialectNote: "Nandi spelling often writes k where Kipsigis writes g (akenge / agenge).",
  cast: cast(["Kogo Jeptoo", "👵🏾"], "Kipkemboi", "Mama Jepkosgei", "Kiptanui"),
  units: [
    unit("kln-niq-u1", U.greet, "Kapsabet", RED, [
      lesson("kln-niq-u1-l1", U.hello, [
        ["Chamge", "Hello", "Hujambo", "medium"],
        ["Kongoi", "Thank you", "Asante", "high"],
        ["Kongoi mising", "Thank you very much", "Asante sana", "medium"],
        ["Kitachin", "Welcome / you're welcome", "Karibu", "low"],
      ], scene(S.visitElder, ["elder", "kln-niq-u1-l1-1"], ["you", "kln-niq-u1-l1-1"])),
    ]),
    unit("kln-niq-u2", U.numbers, "Nandi Hills", BLUE,
      numbers("kln-niq-u2", ["akenge", "aeng'", "somok", "angwan", "mut", "lo", "tisap", "sisit", "sokol", "taman"], "medium")),
    unit("kln-niq-u3", U.home, "Eldoret", GREEN, [
      lesson("kln-niq-u3-l1", U.everyday, [
        ["peek", "water", "maji", "medium"], ["chego", "milk", "maziwa", "high"],
        ["kimnyet", "ugali", "ugali", "high"], ["laakwet", "child", "mtoto", "medium"],
        ["chiito", "person", "mtu", "medium"],
      ]),
    ]),
  ],
};

// ───────────────────────── Luhya ─────────────────────────
const luhyaGeneral: Course = {
  code: "luy", guide: "luy",
  frames: { greet: ["luy-u1-l1-1", "luy-u1-l1-1"] },
  family: "Luhya", name: "General", nativeName: "Oluluhya",
  speakers: "Western Kenya — Kakamega, Bungoma, Vihiga, Busia",
  dialectNote: "Words heard across many Luhya varieties. For dialect-specific lessons choose Bukusu, Maragoli or Nyore.",
  cast: cast(["Guku Nafula", "👵🏾"], "Wafula", "Mama Nekesa", "Barasa", tr("Grandparent", "Babu au bibi")),
  units: [
    unit("luy-u1", U.greet, "Kakamega", RED, [
      lesson("luy-u1-l1", U.hello, [
        ["Mulembe", "Hello (peace)", "Salamu (amani)", "high", "Understood across most Luhya varieties."],
        ["Ee", "Yes", "Ndiyo", "medium"],
        ["Mama", "Mother", "Mama", "medium"],
        ["Papa", "Father", "Baba", "medium"],
      ]),
    ]),
    unit("luy-u2", U.numbers, "Vihiga", BLUE,
      numbers("luy-u2", ["ndala", "tsibili", "tsitaru", "tsine", "tsirano", "sita", "saba", "munane", "tisa", "ikhumi"], "low")),
    unit("luy-u3", U.home, "Busia", GREEN, [
      lesson("luy-u3-l1", U.everyday, [
        ["omundu", "person", "mtu", "medium"], ["omwana", "child", "mtoto", "medium"],
        ["eng'ombe", "cow", "ng'ombe", "medium"], ["inzu", "house", "nyumba", "medium", "Wanga form; varies by dialect."],
        ["amatsi", "water", "maji", "medium", "Wanga form; varies by dialect."],
      ]),
    ]),
    unit("luy-u4", U.market, "Mumias", YELLOW, [
      lesson("luy-u4-l1", U.food, [
        ["obusuma", "ugali", "ugali", "high"], ["amabeere", "milk", "maziwa", "medium", "In Wanga, 'amabere' with a short vowel means millet."],
        ["enyama", "meat", "nyama", "medium"], ["tsisendi", "money", "pesa", "low", "Varies by dialect."],
      ]),
    ]),
    unit("luy-u5", U.family, "Butere", PURPLE, [
      lesson("luy-u5-l1", U.menWomen, [
        ["guku", "grandparent", "babu / bibi", "medium"], ["mayi", "mother", "mama", "medium"],
        ["omukhasi", "woman / wife", "mwanamke / mke", "medium"], ["omusatsa", "man / husband", "mwanamume / mume", "medium"],
        ["omusiani", "boy", "mvulana", "medium"], ["omukhana", "girl", "msichana", "medium"],
      ]),
    ]),
    unit("luy-u6", U.nature, "Malava", TEAL, [
      lesson("luy-u6-l1", U.animals, [
        ["imbusi", "goat", "mbuzi", "medium"], ["ingokho", "chicken", "kuku", "medium"],
        ["imbwa", "dog", "mbwa", "medium"], ["inzofu", "elephant", "tembo", "low"],
      ]),
      lesson("luy-u6-l2", U.land, [
        ["ifula", "rain", "mvua", "medium"], ["lijuba", "sun", "jua", "medium"],
        ["omuliro", "fire", "moto", "medium"], ["omusala", "tree", "mti", "medium"],
      ]),
    ]),
  ],
};

const bukusu: Course = {
  code: "luy-bxk", guide: "luy",
  frames: { thanks: "luy-bxk-u1-l1-4", greet: ["luy-bxk-u1-l1-2", "luy-bxk-u1-l1-3"] },
  family: "Luhya", name: "Bukusu", nativeName: "Lubukusu",
  speakers: "Bungoma and Trans Nzoia — the largest Luhya group",
  dialectNote: "Numbers and words from community word lists; greetings partly from Lugisu, Bukusu's sister variety. All need a Bukusu reviewer.",
  cast: cast(["Guku Nasimiyu", "👵🏾"], "Wanjala", "Mama Nekesa", "Simiyu", tr("Grandparent", "Babu au bibi")),
  units: [
    unit("luy-bxk-u1", U.greet, "Bungoma", RED, [
      lesson("luy-bxk-u1-l1", U.hello, [
        ["Mulembe", "Hello (peace)", "Salamu (amani)", "high"],
        ["Oriena?", "How are you?", "Habari yako?", "low"],
        ["Ndi bulayi", "I am fine", "Niko salama", "low"],
        ["Wanyala", "Thank you", "Asante", "low", "Recorded in Lugisu; confirm for Lubukusu."],
      ], scene(S.visitElder, ["elder", "luy-bxk-u1-l1-1"], ["elder", "luy-bxk-u1-l1-2"], ["you", "luy-bxk-u1-l1-3"])),
    ]),
    unit("luy-bxk-u2", U.numbers, "Webuye", BLUE,
      numbers("luy-bxk-u2", ["ndala", "chibili", "chitaru", "chinne", "chirano", "sita", "saba", "munane", "tisa", "likhumi"], "medium",
        { 0: "Also 'silala'.", 8: "Also 'nasienda'.", 9: "Sources differ: 'likhumi' / 'kamakhumi'." })),
    unit("luy-bxk-u3", U.people, "Kimilili", GREEN, [
      lesson("luy-bxk-u3-l1", U.people, [
        ["omundu", "person", "mtu", "medium"], ["omukhana", "girl", "msichana", "medium"],
        ["omusakhulu", "elder (old man)", "mzee", "medium"], ["maayi", "mother", "mama", "medium"],
        ["engo", "house / home", "nyumba", "medium"], ["Wele", "God", "Mungu", "medium"],
      ]),
    ]),
  ],
};

const maragoli: Course = {
  code: "luy-rag", guide: "luy",
  frames: { thanks: "luy-rag-u1-l1-4", bye: "luy-rag-u1-l2-3", greet: ["luy-rag-u1-l1-2", "luy-rag-u1-l1-3"] },
  family: "Luhya", name: "Maragoli", nativeName: "Lulogooli",
  speakers: "Vihiga County",
  dialectNote: "Phrases from community-contributed lists; numbers are low-confidence drafts. Needs a Maragoli reviewer.",
  cast: cast(["Guku Mideva", "👵🏾"], "Kavai", "Mama Ambasa", "Mudeizi", tr("Grandparent", "Babu au bibi")),
  units: [
    unit("luy-rag-u1", U.greet, "Mbale", RED, [
      lesson("luy-rag-u1-l1", U.hello, [
        ["Milembe", "Hello", "Hujambo", "medium"],
        ["Uve ndi?", "How are you?", "Habari yako?", "medium"],
        ["Ndi mulamu", "I am fine", "Niko salama", "medium"],
        ["Sandidhe", "Thank you", "Asante", "medium"],
      ], scene(S.visitElder, ["elder", "luy-rag-u1-l1-1"], ["elder", "luy-rag-u1-l1-2"], ["you", "luy-rag-u1-l1-3"])),
      lesson("luy-rag-u1-l2", tr("Morning to evening", "Asubuhi hadi jioni"), [
        ["Bushiere", "Good morning", "Habari ya asubuhi", "medium"],
        ["Bwakira", "Good evening", "Habari ya jioni", "medium"],
        ["Kulolane", "See you (goodbye)", "Tuonane", "medium"],
        ["Manyi daa", "I don't know", "Sijui", "medium"],
      ]),
    ]),
    unit("luy-rag-u2", U.numbers, "Chavakali", BLUE,
      numbers("luy-rag-u2", ["ndala", "zivili", "zidaru", "zine", "zitano", "sita", "saba", "munane", "kenda", "ikumi"], "low")),
    unit("luy-rag-u3", U.everyday, "Majengo", GREEN, [
      lesson("luy-rag-u3-l1", U.everyday, [
        ["omwana", "child", "mtoto", "medium"], ["matsi", "water", "maji", "medium"],
        ["guku", "grandparent", "babu / bibi", "medium"],
        ["Amba hanu", "Come here", "Njoo hapa", "medium"],
        ["Nthidha yengo", "I am going home", "Ninaenda nyumbani", "medium"],
      ]),
    ]),
  ],
};

const nyore: Course = {
  code: "luy-nyd", guide: "luy",
  frames: { greet: ["luy-nyd-u1-l1-1", "luy-nyd-u1-l1-1"] },
  family: "Luhya", name: "Nyore", nativeName: "Olunyole",
  speakers: "Luanda and Emuhaya, Vihiga County",
  dialectNote: "Most words here were read off the Olunyole Bible, Ebaibo Inzienukhu (Bible Society of Kenya, 2019), by matching each word to its verse. Only single words are used, never verses. A Nyore reviewer should still check them.",
  cast: cast(["Guku Anyango", "👵🏾"], "Omondi", "Mama Khayanga", "Ominde", tr("Grandparent", "Babu au bibi")),
  units: [
    unit("luy-nyd-u1", tr("First words", "Maneno ya kwanza"), "Luanda", RED, [
      lesson("luy-nyd-u1-l1", tr("First words", "Maneno ya kwanza"), [
        ["Mulembe", "Hello (peace)", "Salamu (amani)", "medium", "Shared across Luhya varieties."],
        ["ise", "I / me", "mimi", "high"],
        ["amang'ana", "words / matters", "maneno / mambo", "high"],
        ["indebe", "chair", "kiti", "medium"],
      ]),
      lesson("luy-nyd-u1-l2", tr("Short sayings", "Misemo mifupi"), [
        ["Oraria tawe", "Don't be afraid", "Usiogope", "high", "Genesis 15:1."],
        ["Tsia ingo", "Go home", "Nenda nyumbani", "high", "Matthew 8:13 has 'Tsia ingo uwo', go to your home."],
        ["tawe", "not / no", "si / hapana", "high", "Comes at the end of the sentence."],
        ["hano", "here", "hapa", "high"],
        ["luno", "now", "sasa", "medium"],
        ["Omwami", "Sir / Lord", "Bwana", "high", "A polite way to address a man (John 4:11)."],
      ]),
    ]),
    unit("luy-nyd-u2", U.people, "Emuhaya", BLUE, [
      lesson("luy-nyd-u2-l1", U.people, [
        ["omundu", "person", "mtu", "high"], ["abandu", "people", "watu", "high"],
        ["omusaatsa", "man", "mwanamume", "high"], ["omukhasi", "woman", "mwanamke", "high"],
        ["omwana", "child", "mtoto", "high"], ["Papa", "father", "baba", "high"],
      ]),
      lesson("luy-nyd-u2-l2", U.numbers, [
        ["ndala", "one", "moja", "high"],
        ["b'bili", "two", "mbili", "medium", "The start of the word changes with the noun counted."],
        ["likhumi", "ten", "kumi", "high"],
        ["likhumi nandala", "eleven", "kumi na moja", "high", "Ten and one (Genesis 37:9)."],
        ["amakhumi kane", "forty", "arobaini", "high", "Four tens (Genesis 7:12)."],
      ]),
    ]),
    unit("luy-nyd-u3", U.home, "Esibuye", GREEN, [
      lesson("luy-nyd-u3-l1", U.aroundHome, [
        ["inyumba", "house", "nyumba", "high"], ["ingo", "home", "nyumbani", "high"],
        ["esitaho", "well", "kisima", "high"], ["etaya", "lamp", "taa", "high"],
        ["injila", "road / way", "njia", "high"], ["litaala", "town", "mji", "high"],
      ]),
      lesson("luy-nyd-u3-l2", U.food, [
        ["amaatsi", "water", "maji", "high"], ["omukaati", "bread", "mkate", "high"],
        ["inyama", "meat", "nyama", "high"], ["omunyu", "salt", "chumvi", "high"],
        ["tsisuche", "fish (many)", "samaki", "medium", "Genesis 1:28 spells it tsisutse."],
      ]),
    ]),
    unit("luy-nyd-u4", U.animals, "Emusire", YELLOW, [
      lesson("luy-nyd-u4-l1", U.animals, [
        ["ing'ombe", "cow", "ng'ombe", "medium", "The Bible has the plural, tsing'ombe."],
        ["imbusi", "goat", "mbuzi", "medium", "The Bible has the plural, tsimbusi."],
        ["likondi", "sheep", "kondoo", "medium", "The Bible has the plural, makondi."],
        ["ipunda", "donkey", "punda", "medium", "The Bible has the plural, tsipunda."],
        ["linyonyi", "bird", "ndege", "high"], ["esolo", "animal", "mnyama", "high"],
      ]),
    ]),
    unit("luy-nyd-u5", U.nature, "Wekhomo", TEAL, [
      lesson("luy-nyd-u5-l1", tr("The sky", "Angani"), [
        ["eliuba", "sun", "jua", "high"], ["omwesi", "moon", "mwezi", "high"],
        ["tsinyininyini", "stars", "nyota", "high"], ["ifula", "rain", "mvua", "high"],
        ["likulu", "sky", "anga", "high"], ["obulafu", "light", "mwanga", "high"],
      ]),
      lesson("luy-nyd-u5-l2", U.land, [
        ["inyanza", "lake", "ziwa", "high"], ["esikulu", "hill", "kilima", "medium"],
        ["omusaala", "tree", "mti", "medium", "Plural: emisaala."],
        ["obunyasi", "grass", "nyasi", "high"], ["olwanda", "rock", "mwamba", "medium"],
        ["omuyeka", "wind", "upepo", "medium"],
      ]),
    ]),
    unit("luy-nyd-u6", U.time, "Ebusiratsi", PURPLE, [
      lesson("luy-nyd-u6-l1", U.time, [
        ["om'basu", "day (daytime)", "mchana", "high"], ["obutukhu", "night", "usiku", "high"],
        ["amatukhu", "days", "siku", "high"], ["mukamba", "tomorrow", "kesho", "high"],
        ["esiilima", "darkness", "giza", "medium"],
      ]),
      lesson("luy-nyd-u6-l2", U.body, [
        ["omurwe", "head", "kichwa", "high"], ["omubili", "body", "mwili", "high"],
        ["omwoyo", "heart", "moyo", "medium", "Plural: emioyo."],
        ["obulamu", "life", "uzima", "high"], ["obusangali", "joy", "furaha", "high"],
      ]),
    ]),
  ],
};


const wanga: Course = {
  code: "luy-wan", guide: "luy",
  frames: { thanks: "luy-wan-u1-l1-4", bye: "luy-wan-u1-l2-1", greet: ["luy-wan-u1-l1-1", "luy-wan-u1-l1-1"] },
  family: "Luhya", name: "Wanga", nativeName: "Oluwanga",
  speakers: "Mumias and Matungu, Kakamega County",
  dialectNote: "Words from the Luwanga–English Dictionary by Alfred Anangwe and Michael Marlo (UCLA, 2008 draft), recorded by a native speaker. Its spelling doesn't mark tone or long vowels.",
  cast: cast(["Kukhu Nafula", "👵🏾"], "Wanyama", "Mama Atsieno", "Shikuku"),
  units: [
    unit("luy-wan-u1", U.greet, "Mumias", RED, [
      lesson("luy-wan-u1-l1", U.hello, [
        ["Mulembe", "Hello (peace)", "Salamu (amani)", "high", "The usual greeting. Literally 'peace'."],
        ["Bushere!", "Good morning!", "Habari ya asubuhi!", "high"],
        ["Bwirire!", "Good evening!", "Habari ya jioni!", "high"],
        ["Oryo", "Thank you", "Asante", "high"],
      ], scene(S.visitElder, ["elder", "luy-wan-u1-l1-2"], ["you", "luy-wan-u1-l1-2"])),
      lesson("luy-wan-u1-l2", tr("Asking after people", "Kuuliza hali"), [
        ["Olindwe", "Goodbye", "Kwaheri", "high", "Literally 'may you be kept'. To several people: Mulindwe."],
        ["Obewo", "Bye for now", "Tutaonana", "high", "Literally 'may you be there'."],
        ["Basunga shina?", "How are they? (your family)", "Hawajambo?", "high"],
        ["Tawe", "No / nothing", "Hapana / hakuna", "high", "Also the reply to 'Basunga shina?': nothing is wrong."],
      ], scene(S.visitElder, ["elder", "luy-wan-u1-l2-3"], ["you", "luy-wan-u1-l2-4"])),
    ]),
    unit("luy-wan-u2", U.numbers, "Matungu", BLUE,
      numbers("luy-wan-u2", ["ndala", "tsibiri", "tsitaru", "tsine", "tsirano", "tsirano na ndala", "musafu", "munane", "shenda", "ikhumi"], "high",
        { 5: "Literally 'five and one'. Not listed in the dictionary; built the way it gives nine ('five and four').", 6: "'Saba' (from Kiswahili) is also common.", 8: "'Tisa' is also common.", 9: "'Ikhumi na ndala' is eleven." })),
    unit("luy-wan-u3", U.home, "Shianda", GREEN, [
      lesson("luy-wan-u3-l1", U.aroundHome, [
        ["amatsi", "water", "maji", "high"], ["ebilibwa", "food", "chakula", "high"],
        ["inzu", "house", "nyumba", "high"], ["ing'ombe", "cow", "ng'ombe", "high"],
        ["imbusi", "goat", "mbuzi", "high"], ["ingokho", "chicken", "kuku", "high"],
      ]),
      lesson("luy-wan-u3-l2", U.people, [
        ["omundu", "person", "mtu", "high"], ["omwana", "child", "mtoto", "high"],
        ["mama", "mother", "mama", "high"], ["papa", "father", "baba", "high"],
        ["kukhu", "grandmother", "bibi", "high"], ["kuka", "grandfather", "babu", "high"],
      ]),
    ]),
    unit("luy-wan-u4", U.market, "Ekero", YELLOW, [
      lesson("luy-wan-u4-l1", U.food, [
        ["obusuma", "ugali", "ugali", "high", "Stiff porridge of maize or millet flour."],
        ["amabeere", "milk", "maziwa", "high", "Careful: 'amabere' with a short vowel means millet."],
        ["inyama", "meat", "nyama", "high"], ["amatuma", "maize", "mahindi", "high"],
        ["inyeni", "fish", "samaki", "high"], ["amakanda", "beans", "maharagwe", "high"],
      ]),
      lesson("luy-wan-u4-l2", tr("At the market", "Sokoni"), [
        ["eshiiro", "market", "soko", "high"], ["amapesa", "money", "pesa", "high"],
        ["omulina", "friend", "rafiki", "high"], ["omukhulundu", "elder", "mzee", "high"],
      ]),
    ]),
    unit("luy-wan-u5", U.family, "Khalaba", PURPLE, [
      lesson("luy-wan-u5-l1", U.menWomen, [
        ["omusatsa", "man", "mwanamume", "high"],
        ["omukhasi", "woman / wife", "mwanamke / mke", "high", "Used of a married woman."],
        ["omusiani", "boy / son", "mvulana / mwana", "high"],
        ["omukhana", "girl / daughter", "msichana / binti", "high"],
      ]),
    ]),
    unit("luy-wan-u6", U.nature, "Bulimbo", TEAL, [
      lesson("luy-wan-u6-l1", U.animals, [
        ["imbwa", "dog", "mbwa", "high"], ["lipaka", "cat", "paka", "high"],
        ["inzofu", "elephant", "tembo", "high"], ["italanyi", "lion", "simba", "high"],
        ["liyoni", "bird", "ndege", "high"], ["likondi", "sheep", "kondoo", "high"],
      ]),
      lesson("luy-wan-u6-l2", U.land, [
        ["ifula", "rain", "mvua", "high"], ["eliuba", "sun", "jua", "high"],
        ["omuliro", "fire", "moto", "high"], ["omuchera", "river", "mto", "high"],
        ["eshikulu", "hill", "kilima", "high"],
      ]),
      lesson("luy-wan-u6-l3", U.time, [
        ["lero", "today", "leo", "high"], ["mukamba", "tomorrow / morning", "kesho / asubuhi", "high"],
        ["olwabere", "yesterday", "jana", "high"],
      ]),
    ]),
    unit("luy-wan-u7", U.body, "Lureko", BLACK, [
      lesson("luy-wan-u7-l1", U.bodyParts, [
        ["omurwe", "head", "kichwa", "high"], ["imoni", "eye", "jicho", "high"],
        ["omunwa", "mouth", "mdomo", "high"], ["omukhono", "hand / arm", "mkono", "high"],
        ["eshilemje", "leg / foot", "mguu", "high"], ["eshirwi", "ear", "sikio", "high"],
        ["amolu", "nose", "pua", "high"],
      ]),
    ]),
  ],
};

export const COURSES: Course[] = [kikuyu, luo, luhyaGeneral, bukusu, maragoli, wanga, nyore, kamba, kalenjinGeneral, kipsigis, nandi];
