/* Editorial Tools — Service Worker v3 (cache-busting) */
// This version immediately clears ALL old caches and takes control.
const CACHE_NAME = 'editorial-tools-v3';

self.addEventListener('install', (event) => {
  // Skip waiting immediately so this SW activates right away
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Delete ALL caches (v1, v2, anything old)
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
     .then(() => {
       // Force all open clients to reload
       return self.clients.matchAll({ type: 'window' });
     }).then((clients) => {
       clients.forEach((client) => client.navigate(client.url));
     })
  );
});

// Network-first for everything — no caching until stable
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
