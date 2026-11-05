/* SpeedRead: офлайн-кеш. Нова версія потрапляє в кеш лише після «Оновити зараз» у застосунку. */
const CACHE = "speedread-app";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/sw.js")) return; // завжди з мережі
  if (url.pathname.endsWith("/manifest.webmanifest")) {   // маніфест — спершу з мережі
    e.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req, {ignoreSearch: true})));
    return; }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => req.mode === "navigate" ? caches.match("./index.html") : Response.error())));
});
self.addEventListener("message", e => {
  if (!e.data || e.data.type !== "update") return;
  const port = e.ports[0];
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => fetch(u, {cache: "reload"}).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); }))))
    .then(() => port && port.postMessage({ok: true})).catch(() => port && port.postMessage({ok: false})));
});
