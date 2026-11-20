// Small DOM helpers shared by the views.

export const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T =>
  root.querySelector(sel) as T;

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll(sel)) as T[];

export function app(): HTMLElement { return $("#app"); }

export function toast(msg: string, kind: "ok" | "err" = "ok"): void {
  const t = document.createElement("div");
  t.className = `toast toast-${kind}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
}

export function playAudio(url?: string): void {
  if (!url) return;
  const a = new Audio(url);
  a.play().catch(() => toast("Couldn't play audio", "err"));
}

export function fmtDuration(ms: number): string {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}
