// Offline support: app shell is cached; lesson audio is cached as it's played.
const CACHE = "lugha-v3";
const SHELL = [
  "./", "index.html", "styles.css", "config.js", "manifest.webmanifest", "icon.svg",
  "js/main.js", "js/art.js", "js/i18n.js", "js/audio.js", "js/speech.js", "js/cloud.js", "js/content.js", "js/exercises.js", "js/lesson.js",
  "js/review.js", "js/store.js", "js/types.js", "js/ui.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API / auth calls
  if (url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/v1/")) return;
  const isAudio = url.pathname.includes("/storage/v1/object/public/audio/");
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !isAudio && !url.hostname.includes("jsdelivr")) return;

  // Network first for our own files (so updates show up), cache fallback when offline.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html"))),
  );
});
