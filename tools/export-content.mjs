// Writes tools/content.json (every word in every course) for the audio generator.
// Run after `tsc` so js/content.js is up to date:  node tools/export-content.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const { COURSES } = await import(new URL("../js/content.js", import.meta.url));

const out = COURSES.map((c) => ({
  code: c.code,
  name: c.family === c.nativeName ? c.nativeName : `${c.family} · ${c.nativeName}`,
  items: c.units.flatMap((u) => u.lessons.flatMap((l) => l.items.map((i) => ({ id: i.id, target: i.target })))),
}));

writeFileSync(join(here, "content.json"), JSON.stringify(out, null, 2));
console.log(`Wrote tools/content.json — ${out.reduce((n, c) => n + c.items.length, 0)} words in ${out.length} courses`);
