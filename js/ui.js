// Small DOM helpers shared by the views.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function app() { return $("#app"); }
export function toast(msg, kind = "ok") {
    const t = document.createElement("div");
    t.className = `toast toast-${kind}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
}
export function playAudio(url) {
    if (!url)
        return;
    const a = new Audio(url);
    a.play().catch(() => toast("Couldn't play audio", "err"));
}
export function fmtDuration(ms) {
    const m = Math.ceil(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}
