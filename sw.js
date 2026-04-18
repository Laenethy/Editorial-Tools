/* Editorial Tools — Service Worker */
const CACHE_NAME = 'editorial-tools-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png'
];

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll fails if ANY request fails; we use Promise.allSettled via individual adds
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation (so updates appear),
// cache-first for static assets (fonts, icons)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigation requests (HTML): network first, fall back to cache, fall back to root
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, resClone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Static same-origin assets: cache first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, resClone)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Cross-origin (fonts.googleapis / fonts.gstatic): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, resClone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
