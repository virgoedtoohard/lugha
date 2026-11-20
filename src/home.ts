// Landing page: what Lugha is, the languages, how learning works, and a clear way in.

import { bead, boma, calabash, hearth, logoMark, necklace } from "./art.js";
import * as audio from "./audio.js";
import { getLang, setLang } from "./i18n.js";
import { allItems, courseCompletion, getCourse, getCourses, getProgress, setBase } from "./store.js";
import type { BaseLang } from "./types.js";
import { $, $$, esc } from "./ui.js";

type T = { en: string; sw: string };
const X = (o: T) => o[getLang()];

const COPY = {
  start: { en: "Start learning, it's free", sw: "Anza kujifunza bure" },
  cont: { en: "Continue", sw: "Endelea" },
  seeLangs: { en: "See the languages", sw: "Angalia lugha" },
  signIn: { en: "Sign in", sw: "Ingia" },
  heroTitle: { en: "Learn the languages of home.", sw: "Jifunze lugha za nyumbani." },
  heroBody: {
    en: "Gĩkũyũ, Dholuo, Luhya, Kĩkamba and Kalenjin, a few minutes a day. Travel through the region, hear real words, speak them aloud and build your own boma as you go.",
    sw: "Gĩkũyũ, Dholuo, Luhya, Kĩkamba na Kalenjin, dakika chache kila siku. Safiri katika eneo, sikia maneno halisi, yatamke kwa sauti na ujenge boma lako unapoendelea.",
  },
  heroNote: { en: "Works on any phone. Learn through English or Kiswahili.", sw: "Inafanya kazi kwenye simu yoyote. Jifunze kwa Kiingereza au Kiswahili." },
  langsTitle: { en: "Five languages, and more varieties", sw: "Lugha tano, na lahaja zaidi" },
  langsBody: { en: "Tap a greeting to hear it. Luhya and Kalenjin include dialect courses.", sw: "Gusa salamu uisikie. Luhya na Kalenjin zina kozi za lahaja." },
  howTitle: { en: "How learning works", sw: "Jinsi unavyojifunza" },
  speakTitle: { en: "Hear it. Say it. Live it.", sw: "Sikia. Sema. Ishi." },
  speakBody: {
    en: "Every word can be heard aloud, slowly too. Lessons ask you to speak, and in tests you can answer out loud instead of typing. Story scenes put you in real moments: greeting your grandmother, bargaining at the market, catching a matatu.",
    sw: "Kila neno linaweza kusikika, hata polepole. Masomo yanakuomba uongee, na kwenye mitihani unaweza kujibu kwa sauti badala ya kuandika. Hadithi zinakuweka kwenye nyakati halisi: kumsalimia bibi, kupatana bei sokoni, kupanda matatu.",
  },
  whyTitle: { en: "Why it matters", sw: "Kwa nini ni muhimu" },
  whyBody: {
    en: "Many of us understand our parents' language but can't speak it, and many children growing up in towns never learn it at all. Lugha makes it easy to start, and keeps you coming back.",
    sw: "Wengi wetu tunaelewa lugha ya wazazi wetu lakini hatuwezi kuiongea, na watoto wengi wanaokua mijini hawaijifunzi kabisa. Lugha inafanya iwe rahisi kuanza, na inakufanya urudi.",
  },
  helpTitle: { en: "Speak one of these languages?", sw: "Unaongea mojawapo ya lugha hizi?" },
  helpBody: {
    en: "Every lesson is checked by native speakers before it's final. Reviewers correct words, add notes and record how words are said. Create an account and ask to join as a reviewer.",
    sw: "Kila somo hukaguliwa na wazawa wa lugha kabla ya kukamilika. Wakaguzi hurekebisha maneno, huongeza maelezo na hurekodi jinsi maneno yanavyotamkwa. Fungua akaunti na uombe kujiunga kama mkaguzi.",
  },
  helpCta: { en: "Create an account", sw: "Fungua akaunti" },
  faqTitle: { en: "Questions", sw: "Maswali" },
  install: { en: "Add Lugha to your home screen", sw: "Weka Lugha kwenye skrini yako" },
  footer: { en: "Lugha · Learn the languages of home", sw: "Lugha · Jifunze lugha za nyumbani" },
  learnUsing: { en: "Learn using", sw: "Jifunze kwa" },
  done: { en: "done", sw: "imekamilika" },
};

const STEPS: { art: () => string; title: T; body: T }[] = [
  {
    art: () => `<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M10 70 C40 70 30 20 60 20 S90 60 110 10" fill="none" stroke="#D2B48A" stroke-width="14" stroke-linecap="round"/><path d="M10 70 C40 70 30 20 60 20 S90 60 110 10" fill="none" stroke="#B8946A" stroke-width="2" stroke-dasharray="1 7"/><circle cx="60" cy="20" r="9" fill="#B8322A" stroke="#2B1D14" stroke-width="2"/><circle cx="104" cy="18" r="7" fill="#fff" stroke="#2B1D14" stroke-width="2"/></svg>`,
    title: { en: "Travel the journey", sw: "Safiri" },
    body: { en: "Each unit is a town on the road, from Nyeri to Nyandarua, or Kisumu to Rusinga Island.", sw: "Kila kitengo ni mji njiani, kutoka Nyeri hadi Nyandarua, au Kisumu hadi Kisiwa cha Rusinga." },
  },
  {
    art: () => necklace([
      { color: "#B8322A", filled: true }, { color: "#2456A4", filled: true }, { color: "#E2A21B", filled: true },
      { color: "#3E7B3A", filled: true }, { color: "#D9692B", filled: true }, { color: "#6A3D9A", filled: false }, { color: "#1F8A82", filled: false },
    ]),
    title: { en: "String your beads", sw: "Unganisha shanga" },
    body: { en: "Every lesson adds a bead to your necklace, in the colour of that stop.", sw: "Kila somo linaongeza shanga kwenye mkufu wako, kwa rangi ya kituo hicho." },
  },
  {
    art: () => `<div class="step-icons">${hearth(true, 54)}${calabash(4, 5, 54)}</div>`,
    title: { en: "Keep the fire burning", sw: "Weka moto uwake" },
    body: { en: "Learn every day to keep your hearth fire lit. A wrong answer spills a little water from your calabash, and you refill it at the river.", sw: "Jifunze kila siku ili moto wa meko uendelee kuwaka. Jibu lisilo sahihi humwaga maji kidogo kutoka kibuyu chako, nawe unakijaza mtoni." },
  },
  {
    art: () => boma(3, true),
    title: { en: "Build your boma", sw: "Jenga boma lako" },
    body: { en: "Finish a stop and your homestead grows: a hut, a granary, cattle, then a fenced boma with the family hearth.", sw: "Maliza kituo na boma lako linakua: kibanda, ghala, ng'ombe, kisha boma lenye ua na meko ya familia." },
  },
];

const FAQ: { q: T; a: T }[] = [
  { q: { en: "Is Lugha free?", sw: "Je, Lugha ni bure?" }, a: { en: "Yes. Lugha is free while we test it and grow the courses.", sw: "Ndiyo. Lugha ni bure tunapoijaribu na kukuza kozi." } },
  { q: { en: "Do I need to download anything?", sw: "Je, ninahitaji kupakua chochote?" }, a: { en: "No. It runs in your phone's browser. You can add it to your home screen, and it keeps working when your connection drops.", sw: "Hapana. Inaendeshwa kwenye kivinjari cha simu yako. Unaweza kuiweka kwenye skrini yako, na inaendelea kufanya kazi mtandao ukikatika." } },
  { q: { en: "Who writes the lessons?", sw: "Nani anaandika masomo?" }, a: { en: "Lessons start as drafts and are checked by native speakers of each language. Words still waiting for review are clearly marked.", sw: "Masomo huanza kama rasimu na hukaguliwa na wazawa wa kila lugha. Maneno yanayosubiri ukaguzi yamewekwa alama wazi." } },
  { q: { en: "Can I learn more than one language?", sw: "Je, naweza kujifunza zaidi ya lugha moja?" }, a: { en: "Yes. Switch any time. Your progress in each language is kept.", sw: "Ndiyo. Badilisha wakati wowote. Maendeleo yako katika kila lugha yanahifadhiwa." } },
];

// A greeting per language family to hear on the landing page.
const SAMPLES: { code: string; word: string }[] = [
  { code: "kik", word: "Wĩ mwega?" },
  { code: "luo", word: "Misawa" },
  { code: "luy", word: "Mulembe" },
  { code: "kam", word: "Wakya" },
  { code: "kln", word: "Chamgei" },
];

let installPrompt: any = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });

export function renderHome(root: HTMLElement, rerender: () => void): void {
  document.body.classList.add("on-home");
  const p = getProgress();
  const active = p.activeCourse ? getCourse(p.activeCourse) : undefined;
  const families = new Map<string, number>();
  for (const c of getCourses()) families.set(c.family, (families.get(c.family) ?? 0) + 1);

  root.innerHTML = `
  <div class="home">
    <header class="home-nav">
      <a class="brand" href="#/home" aria-label="Lugha home">${logoMark(30)}<span>lugha</span></a>
      <div class="home-nav-right">
        <div class="seg mini" role="group" aria-label="${X(COPY.learnUsing)}">
          <button class="${p.base === "en" ? "on" : ""}" data-base="en">EN</button>
          <button class="${p.base === "sw" ? "on" : ""}" data-base="sw">SW</button>
        </div>
        <a class="home-signin" href="#/boma">${X(COPY.signIn)}</a>
      </div>
    </header>
    <div class="beadband" aria-hidden="true"></div>

    <section class="hero">
      <div class="hero-text">
        <h1>${X(COPY.heroTitle)}</h1>
        <p class="hero-body">${X(COPY.heroBody)}</p>
        <div class="hero-cta">
          ${active
            ? `<a class="btn btn-primary btn-lg" href="#/safari">${X(COPY.cont)}: ${esc(active.nativeName)} →</a>`
            : `<a class="btn btn-primary btn-lg" href="#/courses">${X(COPY.start)} →</a>`}
          <a class="btn btn-lg" href="#langs" id="see-langs">${X(COPY.seeLangs)}</a>
        </div>
        <p class="muted small">${X(COPY.heroNote)}</p>
      </div>
      <div class="hero-art">
        ${boma(5, true)}
        <div class="hero-bubble b1"><span class="target-text">Mulembe!</span></div>
        <div class="hero-bubble b2"><span class="target-text">Misawa!</span></div>
        <div class="hero-bubble b3"><span class="target-text">Wĩ mwega?</span></div>
      </div>
    </section>

    <section class="home-sec" id="langs">
      <h2>${X(COPY.langsTitle)}</h2>
      <p class="muted">${X(COPY.langsBody)}</p>
      <div class="lang-grid">
        ${SAMPLES.map(({ code, word }) => {
          const c = getCourse(code)!;
          const pct = Math.round(courseCompletion(c) * 100);
          const n = families.get(c.family) ?? 1;
          return `<div class="lang-card">
            <span class="lang-native">${esc(c.family)}</span>
            <span class="lang-where">${esc(c.speakers.split("—").pop()!.trim())}</span>
            <button class="lang-hello target-text" data-code="${code}" data-word="${esc(word)}">🔊 ${esc(word)}</button>
            <span class="lang-meta">${n > 1 ? `${n} ${getLang() === "sw" ? "lahaja" : "varieties"} · ` : ""}${c.units.length} ${getLang() === "sw" ? "vituo" : "stops"}${pct ? ` · ${pct}% ${X(COPY.done)}` : ""}</span>
            <button class="btn btn-small lang-go" data-start="${code}">${getLang() === "sw" ? "Anza" : "Start"} →</button>
          </div>`;
        }).join("")}
      </div>
    </section>

    <section class="home-sec">
      <h2>${X(COPY.howTitle)}</h2>
      <div class="steps">
        ${STEPS.map((s, i) => `<div class="step">
          <div class="step-art">${s.art()}</div>
          <span class="step-n">${i + 1}</span>
          <h3>${X(s.title)}</h3>
          <p>${X(s.body)}</p>
        </div>`).join("")}
      </div>
    </section>

    <section class="home-sec speak-sec">
      <div class="speak-demo" aria-hidden="true">
        <div class="bubble-row"><span class="avatar">👵🏾</span><div class="bubble"><span class="who">Cũcũ Wairimu</span><span class="target-text">Ũhoro waku?</span></div></div>
        <div class="bubble-row mine"><div class="bubble"><span class="target-text">Ndĩ mwega</span></div></div>
        <div class="demo-mic"><svg viewBox="0 0 24 24" width="30" height="30"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
      </div>
      <div>
        <h2>${X(COPY.speakTitle)}</h2>
        <p>${X(COPY.speakBody)}</p>
      </div>
    </section>

    <section class="home-sec why">
      <h2>${X(COPY.whyTitle)}</h2>
      <p>${X(COPY.whyBody)}</p>
    </section>

    <section class="home-sec help">
      <h2>${X(COPY.helpTitle)}</h2>
      <p>${X(COPY.helpBody)}</p>
      <a class="btn" href="#/boma">${X(COPY.helpCta)} →</a>
    </section>

    <section class="home-sec">
      <h2>${X(COPY.faqTitle)}</h2>
      <div class="faq">${FAQ.map((f) => `<details><summary>${X(f.q)}</summary><p>${X(f.a)}</p></details>`).join("")}</div>
    </section>

    <section class="home-final">
      ${active
        ? `<a class="btn btn-primary btn-lg" href="#/safari">${X(COPY.cont)}: ${esc(active.nativeName)} →</a>`
        : `<a class="btn btn-primary btn-lg" href="#/courses">${X(COPY.start)} →</a>`}
      <button class="link" id="install" hidden>📲 ${X(COPY.install)}</button>
    </section>

    <footer class="home-foot">
      <div class="beadband" aria-hidden="true"></div>
      <p>${X(COPY.footer)}</p>
    </footer>
  </div>`;

  $$<HTMLButtonElement>("[data-base]", root).forEach((b) => b.addEventListener("click", () => {
    setBase(b.dataset.base as BaseLang);
    setLang(b.dataset.base as BaseLang);
    rerender();
  }));
  $("#see-langs", root).addEventListener("click", (e) => {
    e.preventDefault();
    $("#langs", root).scrollIntoView({ behavior: "smooth" });
  });
  $$<HTMLButtonElement>(".lang-hello", root).forEach((b) => b.addEventListener("click", () => {
    const c = getCourse(b.dataset.code!)!;
    const item = allItems(c).find((i) => i.target === b.dataset.word);
    if (item) void audio.play(item, c.code);
    b.classList.add("ping");
    setTimeout(() => b.classList.remove("ping"), 600);
  }));
  $$<HTMLButtonElement>("[data-start]", root).forEach((b) => b.addEventListener("click", () => {
    const code = b.dataset.start!;
    const fam = getCourse(code)!.family;
    // families with dialects go to the picker so the learner can choose a variety
    if ((families.get(fam) ?? 1) > 1) { location.hash = "#/courses"; return; }
    import("./store.js").then((s) => { s.setActiveCourse(code); location.hash = "#/safari"; });
  }));
  const inst = $<HTMLButtonElement>("#install", root);
  if (installPrompt) {
    inst.hidden = false;
    inst.addEventListener("click", async () => { await installPrompt.prompt(); installPrompt = null; inst.hidden = true; });
  }
}

export function leaveHome(): void { document.body.classList.remove("on-home"); }
