// Neshimot service worker — network-first, so updates always arrive; cache is the offline fallback.
const CACHE = 'neshimot-v2';
const CORE = [
  '/',
  '/he',
  '/css/styles.css',
  '/js/app.js',
  '/js/data.js',
  '/js/data.he.js',
  '/js/i18n.js',
  '/js/audio.js',
  '/js/session.js',
  '/js/graphs.js',
  '/js/scenery.js',
  '/img/bti-mark.png',
  '/img/bti-logo.png',
  '/icon.svg',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req, { ignoreSearch: sameOrigin })
          .then((r) => r || (req.mode === 'navigate' ? caches.match(url.pathname.startsWith('/he') ? '/he' : '/') : undefined))
      )
  );
});
