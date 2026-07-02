/* HandyScan PWA — Service Worker v1.5 */
const CACHE = 'handyscan-v6';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/vendor/xlsx.full.min.js',
  './js/data.js',
  './js/customers.js',
  './js/appointments.js',
  './js/recall.js',
  './js/demo.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('cloudflare') || url.hostname.includes('googleapis')) {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }))
      .catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
  );
});
