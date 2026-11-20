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

/** Winding road through one unit's lessons. Returns svg + node positions (percent). */
export function road(count: number): { svg: string; pts: { x: number; y: number }[] } {
  const H = 110 * count + 30, W = 300;
  const pts = Array.from({ length: count }, (_, i) => ({ x: W / 2 + Math.sin(i * 1.3) * 80, y: 55 + i * 110 }));
  let d = `M${W / 2} 0`;
  let prev = { x: W / 2, y: 0 };
  for (const p of [...pts, { x: W / 2, y: H }]) {
    const my = (prev.y + p.y) / 2;
    d += ` C${prev.x} ${my} ${p.x} ${my} ${p.x} ${p.y}`;
    prev = p;
  }
  const svg = `<svg class="road" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="#D2B48A" stroke-width="26" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#B8946A" stroke-width="2" stroke-dasharray="1 9" stroke-linecap="round"/>
  </svg>`;
  return { svg, pts: pts.map((p) => ({ x: (p.x / W) * 100, y: (p.y / H) * 100 })) };
}
