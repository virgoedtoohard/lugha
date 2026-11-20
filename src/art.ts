// Hand-drawn SVG art: calabash, hearth fire, beads, necklace, homestead, journey road.

export function calabash(level: number, max = 5, size = 22): string {
  const pct = Math.max(0, Math.min(1, level / max));
  const top = 30 - 22 * pct; // water surface y (body spans y 8..30)
  const id = "cb" + Math.random().toString(36).slice(2, 7);
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="M13 3h6v4c5 2 9 7 9 13a12 12 0 0 1-24 0c0-6 4-11 9-13z"/></clipPath></defs>
    <path d="M13 3h6v4c5 2 9 7 9 13a12 12 0 0 1-24 0c0-6 4-11 9-13z" fill="#E8C98A"/>
    <rect x="0" y="${top}" width="32" height="32" fill="#3A86C8" clip-path="url(#${id})"/>
    <path d="M13 3h6v4c5 2 9 7 9 13a12 12 0 0 1-24 0c0-6 4-11 9-13z" fill="none" stroke="#7A4E22" stroke-width="1.6"/>
    <rect x="12.5" y="1.5" width="7" height="3" rx="1" fill="#7A4E22"/>
  </svg>`;
}

export function hearth(lit: boolean, size = 22): string {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    ${lit ? `<path d="M16 3c2 5 7 7 7 13a7 7 0 0 1-14 0c0-3 2-5 3-6 0 3 1 4 2 4 0-4-1-7 2-11z" fill="#E8742B"/>
    <path d="M16 12c1 3 4 4 4 7a4 4 0 0 1-8 0c0-2 2-3 2-4 1 1 1 2 2 2 0-2-1-3 0-5z" fill="#F6C343"/>` : `<path d="M10 22c4-2 8-2 12 0" stroke="#9A8F80" stroke-width="2" fill="none" stroke-linecap="round"/>`}
    <ellipse cx="7" cy="26" rx="5" ry="3.5" fill="#6B5B4B"/><ellipse cx="25" cy="26" rx="5" ry="3.5" fill="#6B5B4B"/><ellipse cx="16" cy="28" rx="5" ry="3" fill="#80705F"/>
  </svg>`;
}

export function bead(color: string, size = 20): string {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="8" fill="${color}"/><circle cx="7" cy="7" r="2.4" fill="#fff" opacity=".45"/>
  </svg>`;
}

/** Necklace: one bead per lesson, coloured by unit; empty slots shown faint. */
export function necklace(slots: { color: string; filled: boolean }[]): string {
  const n = Math.max(slots.length, 1);
  const W = 320, H = 170, cx = W / 2, cy = 18, rx = 140, ry = 135;
  const beads = slots.map((s, i) => {
    const a = Math.PI * (0.06 + 0.88 * (n === 1 ? 0.5 : i / (n - 1)));
    const x = cx - rx * Math.cos(a), y = cy + ry * Math.sin(a) * 0.95;
    return s.filled
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${s.color}" stroke="#3B2A1E" stroke-width=".8"/><circle cx="${(x - 3).toFixed(1)}" cy="${(y - 3).toFixed(1)}" r="2.5" fill="#fff" opacity=".45"/>`
      : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="none" stroke="#C9B99E" stroke-width="1.5" stroke-dasharray="2 2"/>`;
  }).join("");
  return `<svg class="necklace" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bead necklace">
    <path d="M${cx - rx} ${cy} Q ${cx} ${cy + ry * 2.05} ${cx + rx} ${cy}" fill="none" stroke="#8B6B4A" stroke-width="1.5"/>
    ${beads}
  </svg>`;
}

/** Homestead that grows as units are completed (0–5+). */
export function boma(stage: number, fireLit: boolean): string {
  const hut = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-30" y="0" width="60" height="38" rx="4" fill="#B5733F"/><rect x="-30" y="0" width="60" height="38" rx="4" fill="url(#mud)" opacity=".5"/>
      <rect x="-8" y="12" width="16" height="26" rx="8" fill="#4A2F1D"/>
      <path d="M-42 4 L0 -36 L42 4 Z" fill="#C9A15A"/><path d="M-42 4 L0 -36 L42 4" fill="none" stroke="#8E6B33" stroke-width="2"/>
      <path d="M-30 -8 L0 -30 M-18 -2 L0 -24 M30 -8 L0 -30 M18 -2 L0 -24" stroke="#A88341" stroke-width="1.5"/>
    </g>`;
  const granary = (x: number, y: number) => `<g transform="translate(${x} ${y})">
      <rect x="-14" y="18" width="4" height="16" fill="#6B4A2F"/><rect x="10" y="18" width="4" height="16" fill="#6B4A2F"/>
      <rect x="-18" y="0" width="36" height="20" rx="10" fill="#A8693A"/>
      <path d="M-24 3 L0 -20 L24 3 Z" fill="#C9A15A"/>
    </g>`;
  const cow = (x: number, y: number, c: string) => `<g transform="translate(${x} ${y})">
      <rect x="-14" y="-8" width="26" height="13" rx="6" fill="${c}"/><rect x="10" y="-12" width="9" height="9" rx="3" fill="${c}"/>
      <path d="M11 -12 l-3 -4 M18 -12 l3 -4" stroke="#EDE6D6" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="-12" y="4" width="3" height="8" fill="${c}"/><rect x="6" y="4" width="3" height="8" fill="${c}"/>
    </g>`;
  const acacia = (x: number, y: number) => `<g transform="translate(${x} ${y})">
      <path d="M0 0 L0 -36 M0 -26 L-10 -40 M0 -30 L12 -42" stroke="#5A3E28" stroke-width="3" fill="none"/>
      <ellipse cx="0" cy="-46" rx="34" ry="9" fill="#5F8A3E"/>
    </g>`;
  const fence = `<ellipse cx="160" cy="168" rx="150" ry="34" fill="none" stroke="#7A5A3C" stroke-width="3" stroke-dasharray="3 5"/>`;
  const fire = `<g transform="translate(160 186)">${fireLit ? `<path d="M0 -18c2 6 7 8 7 13a7 7 0 0 1-14 0c0-3 2-5 3-6 0 3 1 4 2 4 0-4-1-7 2-11z" fill="#E8742B"/>` : ""}
      <ellipse cx="-9" cy="2" rx="5" ry="3" fill="#6B5B4B"/><ellipse cx="9" cy="2" rx="5" ry="3" fill="#6B5B4B"/><ellipse cx="0" cy="5" rx="5" ry="3" fill="#80705F"/></g>`;

  return `<svg class="boma" viewBox="0 0 320 220" role="img" aria-label="Your homestead">
    <defs><pattern id="mud" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#8E5530"/><circle cx="6" cy="6" r="1" fill="#C98955"/></pattern></defs>
    <rect width="320" height="220" fill="#F3E3C3"/>
    <circle cx="270" cy="40" r="20" fill="#F2B134" opacity=".9"/>
    <path d="M0 120 Q80 100 160 116 T320 112 V220 H0 Z" fill="#D9B77E"/>
    <path d="M0 150 Q100 136 200 148 T320 144 V220 H0 Z" fill="#C9A066"/>
    ${stage >= 4 ? acacia(40, 150) + acacia(285, 146) : ""}
    ${stage >= 5 ? fence : ""}
    ${stage >= 1 ? hut(150, 120) : ""}
    ${stage >= 4 ? hut(235, 132, 0.8) : ""}
    ${stage >= 2 ? granary(70, 140) : ""}
    ${stage >= 3 ? cow(110, 192, "#5A3B28") + cow(210, 196, "#EDE6D6") + cow(250, 186, "#2E2621") : ""}
    ${stage >= 5 ? fire : ""}
    ${stage === 0 ? `<g transform="translate(160 160)" opacity=".55"><path d="M-30 0 h60" stroke="#7A5A3C" stroke-width="3" stroke-dasharray="4 4"/><text x="0" y="-8" text-anchor="middle" font-size="12" fill="#5A4632">?</text></g>` : ""}
  </svg>`;
}

export const BOMA_PIECES = [
  { en: "your first hut", sw: "kibanda chako cha kwanza" },
  { en: "a granary", sw: "ghala" },
  { en: "a herd of cattle", sw: "kundi la ng'ombe" },
  { en: "a second hut and acacia trees", sw: "kibanda cha pili na miti ya mgunga" },
  { en: "a fence and the family hearth", sw: "ua na meko ya familia" },
];

/** Winding road through one unit's stops. Returns svg, node positions (percent) and a way
 *  to find any point between two nodes, so the guide can stand part-way along the road. */
export function road(count: number): { svg: string; pts: { x: number; y: number }[]; between: (k: number, f: number) => { x: number; y: number }; at: (v: number, backPx: number) => { x: number; y: number }; height: number } {
  const H = 110 * count + 100, W = 300;
  const pts = Array.from({ length: count }, (_, i) => ({ x: W / 2 + Math.sin(i * 1.3) * 80, y: 125 + i * 110 }));
  const stops = [{ x: W / 2, y: 0 }, ...pts, { x: W / 2, y: H }];
  let d = `M${W / 2} 0`;
  for (let j = 1; j < stops.length; j++) {
    const a = stops[j - 1], b = stops[j], my = (a.y + b.y) / 2;
    d += ` C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
  }
  // Point a fraction f of the way (by distance along the road) from node k to node k+1;
  // k = count-1 heads to the end of the road, k = -1 starts from the top.
  const cubic = (a: { x: number; y: number }, b: { x: number; y: number }, s: number) => {
    const my = (a.y + b.y) / 2, u = 1 - s;
    return {
      x: u * u * u * a.x + 3 * u * u * s * a.x + 3 * u * s * s * b.x + s * s * s * b.x,
      y: u * u * u * a.y + 3 * u * u * s * my + 3 * u * s * s * my + s * s * s * b.y,
    };
  };
  const between = (k: number, f: number) => {
    const a = stops[k + 1], b = stops[Math.min(k + 2, stops.length - 1)];
    const N = 40;
    const samples = Array.from({ length: N + 1 }, (_, i) => cubic(a, b, i / N));
    const lens = [0];
    for (let i = 1; i <= N; i++) lens.push(lens[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
    const want = Math.max(0, Math.min(1, f)) * lens[N];
    let i = 1;
    while (i < N && lens[i] < want) i++;
    const seg = lens[i] - lens[i - 1] || 1, q = (want - lens[i - 1]) / seg;
    const x = samples[i - 1].x + (samples[i].x - samples[i - 1].x) * q;
    const y = samples[i - 1].y + (samples[i].y - samples[i - 1].y) * q;
    return { x: (x / W) * 100, y: (y / H) * 100 };
  };
  // Whole road as a dense polyline, so a position can be stepped back by a fixed distance.
  const poly: { x: number; y: number }[] = [];
  const nodeLen: number[] = [];       // distance along the road at the top (-1), each node (0..), and the end
  let run = 0;
  for (let j = 1; j < stops.length; j++) {
    nodeLen.push(run);
    for (let i = j === 1 ? 0 : 1; i <= 40; i++) {
      const q = cubic(stops[j - 1], stops[j], i / 40);
      if (poly.length) run += Math.hypot(q.x - poly[poly.length - 1].x, q.y - poly[poly.length - 1].y);
      (q as any).d = run;
      poly.push(q);
    }
  }
  nodeLen.push(run);
  /** v in node units (node i at i, -1 = top of the road); stepped back along the road by backPx. */
  const at = (v: number, backPx: number) => {
    const k = Math.max(-1, Math.min(count, Math.floor(v)));
    const f = Math.max(0, Math.min(1, v - k));
    const a = nodeLen[k + 1], b = nodeLen[Math.min(k + 2, nodeLen.length - 1)];
    const want = Math.max(0, Math.min(run, a + (b - a) * f - backPx));
    let i = 1;
    while (i < poly.length - 1 && (poly[i] as any).d < want) i++;
    const p0 = poly[i - 1] as any, p1 = poly[i] as any;
    const q = (want - p0.d) / ((p1.d - p0.d) || 1);
    return { x: ((p0.x + (p1.x - p0.x) * q) / W) * 100, y: ((p0.y + (p1.y - p0.y) * q) / H) * 100 };
  };
  const svg = `<svg class="road" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="#D2B48A" stroke-width="26" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#B8946A" stroke-width="2" stroke-dasharray="1 9" stroke-linecap="round"/>
  </svg>`;
  return { svg, pts: pts.map((p) => ({ x: (p.x / W) * 100, y: (p.y / H) * 100 })), between, at, height: H };
}

/** Small thatched hut: the home button. */
export function hutIcon(size = 30): string {
  return `<svg class="ic hut" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <rect x="7" y="15" width="18" height="13" rx="2" fill="#B5733F" stroke="#2B1D14" stroke-width="1.4"/>
    <path d="M13 28v-6a3 3 0 0 1 6 0v6z" fill="#4A2F1D"/>
    <path d="M3 17 L16 4 L29 17 Z" fill="#D9AE5F" stroke="#2B1D14" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M9 13 L16 6 M12 15.5 L16 9 M23 13 L16 6 M20 15.5 L16 9" stroke="#A88341" stroke-width="1.1"/>
    <path d="M15 4.5 L16 1.8 L17 4.5" fill="none" stroke="#2B1D14" stroke-width="1.2"/>
  </svg>`;
}

/** Tiny bead string for the Boma tab. */
export function beadsIcon(size = 26): string {
  const cols = ["#B8322A", "#2456A4", "#E2A21B", "#3E7B3A", "#D9692B"];
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M3 6 Q16 34 29 6" fill="none" stroke="#C9B99E" stroke-width="1.2"/>
    ${[[5, 11], [9, 17], [16, 20], [23, 17], [27, 11]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${cols[i]}" stroke="#fff" stroke-width=".6"/>`).join("")}
  </svg>`;
}

// ---------- Walking guides in cultural dress ----------
// Stylised figures inspired by dress and objects strongly associated with each community.
// They are illustrations, not costumes of record: have community members review them.
const SKIN = "#5C3A21", SKIN_D = "#472C18", INK = "#2B1D14";

function body(opts: { top: string; bottom: string; legs?: string; arms?: string }): { back: string; front: string } {
  const legs = `<g class="leg leg-l"><rect x="23" y="70" width="6" height="22" rx="3" fill="${opts.legs ?? SKIN_D}"/><ellipse cx="25" cy="93" rx="5" ry="2.6" fill="${INK}"/></g>
    <g class="leg leg-r"><rect x="31" y="70" width="6" height="22" rx="3" fill="${opts.legs ?? SKIN}"/><ellipse cx="35" cy="93" rx="5" ry="2.6" fill="${INK}"/></g>`;
  return {
    back: legs,
    front: `${opts.bottom}${opts.top}
      <g class="arm arm-l"><rect x="13" y="38" width="6" height="24" rx="3" fill="${opts.arms ?? SKIN}"/></g>
      <rect x="27" y="26" width="6" height="7" fill="${SKIN}"/>
      <circle cx="30" cy="20" r="9.5" fill="${SKIN}"/>
      <circle cx="27" cy="19" r="1.1" fill="${INK}"/><circle cx="33" cy="19" r="1.1" fill="${INK}"/>
      <path d="M27 24 q3 2 6 0" stroke="${INK}" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  };
}

const beadRow = (cx: number, cy: number, r: number, cols: string[], n = 9) => Array.from({ length: n }, (_, i) => {
  const a = Math.PI * (0.15 + 0.7 * (i / (n - 1)));
  return `<circle cx="${(cx - r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a) * 0.7).toFixed(1)}" r="1.6" fill="${cols[i % cols.length]}"/>`;
}).join("");

const beadLine = (y: number, cols: string[], n = 7) =>
  Array.from({ length: n }, (_, i) => `<circle cx="${(21.5 + (17 * i) / (n - 1)).toFixed(1)}" cy="${y}" r="1.1" fill="${cols[i % cols.length]}"/>`).join("");

export const GUIDES: Record<string, { name: { en: string; sw: string }; note: { en: string; sw: string } }> = {
  kik: { name: { en: "Your Gĩkũyũ guide", sw: "Kiongozi wako wa Gĩkũyũ" }, note: { en: "Leather cape, beadwork and a woven kiondo basket", sw: "Joho la ngozi, shanga na kiondo kilichofumwa" } },
  luo: { name: { en: "Your Luo guide", sw: "Kiongozi wako wa Luo" }, note: { en: "Feathered headdress and the nyatiti lyre", sw: "Kofia ya manyoya na kinubi cha nyatiti" } },
  luy: { name: { en: "Your Luhya guide", sw: "Kiongozi wako wa Luhya" }, note: { en: "Dancing in bright colours with an isukuti drum", sw: "Mavazi ya rangi na ngoma ya isukuti" } },
  kam: { name: { en: "Your Kamba guide", sw: "Kiongozi wako wa Kamba" }, note: { en: "Beaded headband and a carved walking stick", sw: "Utepe wa shanga na fimbo iliyochongwa" } },
  kln: { name: { en: "Your Kalenjin guide", sw: "Kiongozi wako wa Kalenjin" }, note: { en: "Beaded leather cape and a sotet gourd for mursik", sw: "Joho la ngozi lenye shanga na kibuyu cha mursik" } },
};

export function guideFigure(guide: string, size = 64): string {
  let back = "", front = "", extraBack = "", extraFront = "";
  if (guide === "kik") {
    const b = body({
      top: `<path d="M17 33 Q30 28 43 33 L46 62 Q30 66 14 62 Z" fill="#9C5B2E"/>
            <path d="M18 60 v4 M22 61 v4 M26 62 v4 M30 62 v4 M34 62 v4 M38 61 v4 M42 60 v4" stroke="#6E3E1C" stroke-width="1.2"/>
            ${beadRow(30, 30, 8, ["#B8322A", "#EDE6D6", "#2456A4"], 11)}${beadRow(30, 33, 10, ["#E2A21B", "#B8322A"], 11)}`,
      bottom: `<path d="M19 60 L41 60 L43 74 L17 74 Z" fill="#7A4421"/>`,
    });
    back = b.back; front = b.front;
    // kiondo basket carried on the back, strap across the forehead
    extraBack = `<g transform="translate(40 30) rotate(12)"><path d="M0 0 h16 l-2 26 h-12 Z" fill="#C79A4B" stroke="${INK}" stroke-width="1"/>
      <path d="M1 7 h14 M1.5 13 h13 M2 19 h12" stroke="#B8322A" stroke-width="2"/><path d="M1 10 h14 M2 16 h12" stroke="#2E6B5E" stroke-width="1.4"/></g>`;
    extraFront = `<path d="M20.5 13 Q30 8.5 39.5 13" stroke="#8E6B33" stroke-width="3" fill="none"/>${beadLine(12, ["#B8322A", "#EDE6D6"], 7).replace(/cy="12"/g, 'cy="11.6"')}`;
  } else if (guide === "luo") {
    const b = body({
      top: `<path d="M17 33 Q30 29 43 33 L44 60 L16 60 Z" fill="#EDE6D6"/><path d="M17 33 Q30 29 43 33 L42 44 L18 44 Z" fill="#2A2320"/>
            <path d="M18 44 h24" stroke="#B8322A" stroke-width="2"/>`,
      bottom: `<path d="M17 58 L43 58 L45 74 L15 74 Z" fill="#B8322A"/><path d="M17 62 h26 M16 67 h28" stroke="#2A2320" stroke-width="1.4"/>`,
    });
    back = b.back; front = b.front;
    // feathered headdress
    extraFront = `${[-50, -30, -12, 6, 24, 42].map((a, i) => `<ellipse cx="30" cy="2" rx="3.2" ry="10" fill="${i % 2 ? "#F4F1EA" : "#1E1A17"}" stroke="${INK}" stroke-width=".5" transform="rotate(${a} 30 14)"/>`).join("")}
      <rect x="21" y="10" width="18" height="4" rx="2" fill="#B8322A"/>${beadLine(12, ["#EDE6D6", "#2456A4"], 7)}`;
    // nyatiti lyre held at the side
    extraBack = `<g transform="translate(-4 44) rotate(-10)"><path d="M2 0 L14 0 L12 28 L4 28 Z" fill="none" stroke="#7A4E22" stroke-width="2.4"/>
      <ellipse cx="8" cy="28" rx="7" ry="4" fill="#A8693A" stroke="${INK}" stroke-width=".8"/>
      <path d="M5 2 v24 M8 1 v25 M11 2 v24" stroke="#EDE6D6" stroke-width=".6"/></g>`;
  } else if (guide === "luy") {
    const b = body({
      top: `<path d="M16 33 Q30 28 44 33 L45 60 L15 60 Z" fill="#E2A21B"/>
            <path d="M16 40 h29 M15.5 47 h29.5 M15 54 h30" stroke="#B8322A" stroke-width="3"/>
            <path d="M22 33 l8 8 l8 -8" fill="none" stroke="#2456A4" stroke-width="2"/>`,
      bottom: `<path d="M17 58 L43 58 L44 74 L16 74 Z" fill="#2E2621"/>`,
    });
    back = b.back; front = b.front;
    extraFront = `<rect x="20" y="10" width="20" height="4" rx="2" fill="#B8322A"/><path d="M36 10 q4 -10 10 -12" stroke="#1E1A17" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M33 10 q2 -9 6 -12" stroke="#F4F1EA" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    // isukuti drum slung at the hip
    extraBack = `<g transform="translate(38 46) rotate(-25)"><rect x="0" y="0" width="10" height="30" rx="3" fill="#8E5530" stroke="${INK}" stroke-width="1"/>
      <ellipse cx="5" cy="0" rx="5" ry="2" fill="#EDE6D6" stroke="${INK}" stroke-width=".8"/><path d="M0 8 l10 6 M0 16 l10 6" stroke="#E2A21B" stroke-width="1"/></g>`;
  } else if (guide === "kam") {
    const b = body({
      top: `<path d="M17 33 Q30 28 43 33 L45 74 L15 74 Z" fill="#2456A4"/>
            <path d="M16 46 h28 M15.5 60 h29" stroke="#E2A21B" stroke-width="2.4"/>
            <circle cx="22" cy="53" r="2" fill="#E2A21B"/><circle cx="30" cy="53" r="2" fill="#E2A21B"/><circle cx="38" cy="53" r="2" fill="#E2A21B"/>
            ${beadRow(30, 30, 8, ["#B8322A", "#EDE6D6"], 11)}${beadRow(30, 33, 10, ["#B8322A", "#EDE6D6"], 11)}`,
      bottom: ``,
    });
    back = b.back; front = b.front;
    extraFront = `<rect x="20" y="10" width="20" height="4" rx="2" fill="#EDE6D6"/>${beadLine(12, ["#B8322A", "#2456A4", "#E2A21B"], 7)}`;
    // carved walking stick
    extraBack = `<g transform="translate(9 26)"><rect x="0" y="0" width="3" height="68" rx="1.5" fill="#7A4E22"/>
      <circle cx="1.5" cy="-1" r="3.5" fill="#5A3B28"/><path d="M0 10 h3 M0 14 h3 M0 18 h3" stroke="#E2A21B" stroke-width="1"/></g>`;
  } else {
    const b = body({
      top: `<path d="M15 33 Q30 27 45 33 L47 66 Q30 70 13 66 Z" fill="#8A5A32"/>
            ${[40, 47, 54, 61].map((y) => `<path d="M16 ${y} Q30 ${y + 3} 44 ${y}" stroke="${y % 2 ? "#EDE6D6" : "#B8322A"}" stroke-width="1.6" fill="none" stroke-dasharray="1.5 1.5"/>`).join("")}`,
      bottom: `<path d="M18 64 L42 64 L43 74 L17 74 Z" fill="#5A3B28"/>`,
    });
    back = b.back; front = b.front;
    // beaded ear ornaments
    extraFront = `<circle cx="20.5" cy="21" r="3" fill="none" stroke="#B8322A" stroke-width="1.6"/><circle cx="39.5" cy="21" r="3" fill="none" stroke="#2456A4" stroke-width="1.6"/>`;
    // sotet gourd for mursik, on a leather strap
    extraBack = `<path d="M24 32 Q34 44 44 50" stroke="#5A3B28" stroke-width="1.4" fill="none"/>
      <g transform="translate(42 44) rotate(-12)"><path d="M3 0 h4 v4 q5 4 5 14 q0 10 -7 10 q-7 0 -7 -10 q0 -10 5 -14 Z" fill="#C9A15A" stroke="${INK}" stroke-width="1"/>
      <path d="M0 14 h12" stroke="#B8322A" stroke-width="1.4"/><rect x="2.5" y="-3" width="5" height="3" rx="1" fill="#2A2320"/></g>`;
  }
  return `<svg class="guide-svg" width="${size}" height="${size * 1.6}" viewBox="-6 -10 72 106" aria-hidden="true">
    <ellipse cx="30" cy="94" rx="15" ry="3" fill="#000" opacity=".15"/>
    ${extraBack}${back}${front}${extraFront}
  </svg>`;
}

/** The Boma tab: a homestead. One big hut behind, two smaller huts in front on either side. */
export function bomaIcon(size = 30): string {
  const hut = (x: number, y: number, s: number, wall: string, roof: string) => `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-9" y="0" width="18" height="11" rx="1.5" fill="${wall}" stroke="#2B1D14" stroke-width="1.1"/>
      <path d="M-3 11v-5a3 3 0 0 1 6 0v5z" fill="#3A2416"/>
      <path d="M-13 2 L0 -12 L13 2 Z" fill="${roof}" stroke="#2B1D14" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M-7 -1 L0 -8 M7 -1 L0 -8" stroke="#A88341" stroke-width=".9"/>
    </g>`;
  return `<svg class="ic boma-ic" width="${size}" height="${size}" viewBox="0 0 40 34" aria-hidden="true">
    <ellipse cx="20" cy="31" rx="19" ry="2.6" fill="#C9A066" opacity=".9"/>
    ${hut(20, 12, 1.05, "#9A5F33", "#CFA455")}
    ${hut(8.5, 21.5, 0.7, "#B5733F", "#E8C27A")}
    ${hut(31.5, 21.5, 0.7, "#B5733F", "#E8C27A")}
  </svg>`;
}

// ---------- Node icons (drawn, so they look the same on every phone) ----------
const ico = (body: string, size = 26) => `<svg class="node-ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
export const checkIcon = () => ico(`<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`);
export const lockIcon = () => ico(`<rect x="5" y="11" width="14" height="10" rx="2.5" fill="#8C7B64"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#8C7B64" stroke-width="2.4"/><circle cx="12" cy="16" r="1.6" fill="#D9CDB8"/>`, 22);
export const chatIcon = () => ico(`<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z" fill="#fff" stroke="#2B1D14" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.6" cy="10" r="1.2" fill="#2B1D14"/><circle cx="12" cy="10" r="1.2" fill="#2B1D14"/><circle cx="15.4" cy="10" r="1.2" fill="#2B1D14"/>`, 28);
export const fireIcon = () => ico(`<path d="M12 2.5c1.6 4 6 5.6 6 10.7a6 6 0 0 1-12 0c0-2.6 1.6-4.2 2.5-5 0 2.4.8 3.4 1.8 3.4 0-3.3-.8-6 1.7-9.1z" fill="#F6C343" stroke="#2B1D14" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 11c.9 2.4 3 3.2 3 5.3a3 3 0 0 1-6 0c0-1.4.9-2.3 1.4-2.8.2 1.1.7 1.6 1.2 1.6 0-1.6-.5-2.6.4-4.1z" fill="#E8742B"/>`, 32);
export const flagIcon = () => ico(`<path d="M6 21V3.5" stroke="#2B1D14" stroke-width="2" stroke-linecap="round"/><path d="M6.5 4h12l-2.5 4 2.5 4h-12z" fill="#fff" stroke="#2B1D14" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 4v8M12 4v8M15 4v8" stroke="#2B1D14" stroke-width="1.2" stroke-dasharray="2 2"/>`, 24);
export const pinIcon = () => `<svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true"><path d="M11 27s9-9.4 9-16A9 9 0 0 0 2 11c0 6.6 9 16 9 16z" fill="#B8322A" stroke="#FDF4E3" stroke-width="1.6"/><circle cx="11" cy="11" r="3.4" fill="#FDF4E3"/></svg>`;

/** The Lugha logo: a red bead that is also a speech bubble. */
export function logoMark(size = 28): string {
  return `<svg class="ic logo-mark" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 16a40 40 0 1 1-21.6 73.6L18 102l7.4-22.8A40 40 0 0 1 60 16z" fill="#B8322A"/><circle cx="45" cy="40" r="10" fill="#FFFFFF" opacity=".42"/></svg>`;
}
