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
const tr = (en, sw) => ({ en, sw });
function lesson(id, title, rows, scene) {
    return {
        id,
        title,
        scene,
        items: rows.map(([target, english, swahili, confidence, note], i) => ({
            id: `${id}-${i + 1}`, target, english, swahili, confidence, note, status: "draft",
        })),
    };
}
function unit(id, title, place, bead, lessons) {
    return { id, title, place, bead, lessons };
}
function scene(setting, ...lines) {
    return { setting, lines: lines.map(([who, item]) => ({ who, item })) };
}
function cast(elder, friend, seller, conductor, elderRole = tr("Grandmother", "Bibi")) {
    return [
        { key: "elder", name: elder[0], role: elderRole, avatar: elder[1] },
        { key: "friend", name: friend, role: tr("Friend", "Rafiki"), avatar: "🧑🏾" },
        { key: "seller", name: seller, role: tr("Market seller", "Muuzaji sokoni"), avatar: "👩🏾‍🌾" },
        { key: "conductor", name: conductor, role: tr("Matatu conductor", "Kondakta wa matatu"), avatar: "👨🏾" },
    ];
}
const SW_NUM = ["moja", "mbili", "tatu", "nne", "tano", "sita", "saba", "nane", "tisa", "kumi"];
const EN_NUM = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
function numbers(prefix, words, conf, notes = {}) {
    const row = (w, i) => [w, EN_NUM[i], SW_NUM[i], conf, notes[i]];
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
const kikuyu = {
    code: "kik", family: "Gĩkũyũ", name: "Kikuyu", nativeName: "Gĩkũyũ",
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
        unit("kik-u2", U.numbers, "Murang'a", BLUE, numbers("kik-u2", ["ĩmwe", "igĩrĩ", "ithatũ", "inya", "ithano", "ithathatũ", "mũgwanja", "inyanya", "kenda", "ikũmi"], "high")),
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
const luo = {
    code: "luo", family: "Dholuo", name: "Luo", nativeName: "Dholuo",
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
        unit("luo-u2", U.numbers, "Siaya", BLUE, numbers("luo-u2", ["achiel", "ariyo", "adek", "ang'wen", "abich", "auchiel", "abiriyo", "aboro", "ochiko", "apar"], "high")),
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
const kamba = {
    code: "kam", family: "Kĩkamba", name: "Kamba", nativeName: "Kĩkamba",
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
        unit("kam-u2", U.numbers, "Kitui", BLUE, numbers("kam-u2", ["ĩmwe", "ilĩ", "itatũ", "ina", "itano", "thanthatũ", "mũonza", "nyaanya", "kenda", "ĩkũmi"], "medium")),
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
const kalenjinGeneral = {
    code: "kln", family: "Kalenjin", name: "General", nativeName: "Kalenjin",
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
        unit("kln-u2", U.numbers, "Kapsabet", BLUE, numbers("kln-u2", ["agenge", "aeng'", "somok", "angwan", "mut", "lo", "tisap", "sisit", "sogol", "taman"], "medium")),
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
const kipsigis = {
    code: "kln-sgc", family: "Kalenjin", name: "Kipsigis", nativeName: "Kipsigis",
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
        unit("kln-sgc-u2", U.numbers, "Litein", BLUE, numbers("kln-sgc-u2", ["agenge", "aeng'", "somok", "angwan", "mut", "lo", "tisap", "sisit", "sogol", "taman"], "medium")),
        unit("kln-sgc-u3", U.home, "Bomet", GREEN, [
            lesson("kln-sgc-u3-l1", U.everyday, [
                ["bek", "water", "maji", "high"], ["chego", "milk", "maziwa", "high"],
                ["kimnyet", "ugali", "ugali", "high"], ["lakwet", "child", "mtoto", "medium"],
                ["chito", "person", "mtu", "medium"], ["kaa", "home", "nyumbani", "medium"],
            ]),
        ]),
    ],
};
const nandi = {
    code: "kln-niq", family: "Kalenjin", name: "Nandi", nativeName: "Naandi",
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
        unit("kln-niq-u2", U.numbers, "Nandi Hills", BLUE, numbers("kln-niq-u2", ["akenge", "aeng'", "somok", "angwan", "mut", "lo", "tisap", "sisit", "sokol", "taman"], "medium")),
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
const luhyaGeneral = {
    code: "luy", family: "Luhya", name: "General", nativeName: "Oluluhya",
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
        unit("luy-u2", U.numbers, "Vihiga", BLUE, numbers("luy-u2", ["ndala", "tsibili", "tsitaru", "tsine", "tsirano", "sita", "saba", "munane", "tisa", "ikhumi"], "low")),
        unit("luy-u3", U.home, "Busia", GREEN, [
            lesson("luy-u3-l1", U.everyday, [
                ["omundu", "person", "mtu", "medium"], ["omwana", "child", "mtoto", "medium"],
                ["eng'ombe", "cow", "ng'ombe", "medium"], ["inzu", "house", "nyumba", "low", "Varies strongly by dialect."],
                ["amatsi", "water", "maji", "low", "Varies strongly by dialect."],
            ]),
        ]),
        unit("luy-u4", U.market, "Mumias", YELLOW, [
            lesson("luy-u4-l1", U.food, [
                ["obusuma", "ugali", "ugali", "high"], ["amabere", "milk", "maziwa", "medium"],
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
const bukusu = {
    code: "luy-bxk", family: "Luhya", name: "Bukusu", nativeName: "Lubukusu",
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
        unit("luy-bxk-u2", U.numbers, "Webuye", BLUE, numbers("luy-bxk-u2", ["ndala", "chibili", "chitaru", "chinne", "chirano", "sita", "saba", "munane", "tisa", "likhumi"], "medium", { 0: "Also 'silala'.", 8: "Also 'nasienda'.", 9: "Sources differ: 'likhumi' / 'kamakhumi'." })),
        unit("luy-bxk-u3", U.people, "Kimilili", GREEN, [
            lesson("luy-bxk-u3-l1", U.people, [
                ["omundu", "person", "mtu", "medium"], ["omukhana", "girl", "msichana", "medium"],
                ["omusakhulu", "elder (old man)", "mzee", "medium"], ["maayi", "mother", "mama", "medium"],
                ["engo", "house / home", "nyumba", "medium"], ["Wele", "God", "Mungu", "medium"],
            ]),
        ]),
    ],
};
const maragoli = {
    code: "luy-rag", family: "Luhya", name: "Maragoli", nativeName: "Lulogooli",
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
        unit("luy-rag-u2", U.numbers, "Chavakali", BLUE, numbers("luy-rag-u2", ["ndala", "zivili", "zidaru", "zine", "zitano", "sita", "saba", "munane", "kenda", "ikumi"], "low")),
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
const nyore = {
    code: "luy-nyd", family: "Luhya", name: "Nyore", nativeName: "Olunyole",
    speakers: "Luanda and Emuhaya, Vihiga County",
    dialectNote: "Very little Olunyole is published online. This starter course needs a Nyore reviewer to grow it.",
    cast: cast(["Guku Anyango", "👵🏾"], "Omondi", "Mama Khayanga", "Ominde", tr("Grandparent", "Babu au bibi")),
    units: [
        unit("luy-nyd-u1", tr("First words", "Maneno ya kwanza"), "Luanda", RED, [
            lesson("luy-nyd-u1-l1", tr("First words", "Maneno ya kwanza"), [
                ["Mulembe", "Hello (peace)", "Salamu (amani)", "medium", "Shared across Luhya varieties."],
                ["ise", "I / me", "mimi", "medium"],
                ["amang'ana", "words", "maneno", "medium"],
                ["indebe", "chair", "kiti", "medium"],
            ]),
        ]),
    ],
};
export const COURSES = [kikuyu, luo, luhyaGeneral, bukusu, maragoli, nyore, kamba, kalenjinGeneral, kipsigis, nandi];
