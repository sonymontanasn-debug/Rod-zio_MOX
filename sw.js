// Rodízio RGdB - Service Worker v32
// Objetivo: sempre buscar a versão mais nova quando houver rede e manter fallback offline confiável.
const CACHE_PREFIX = 'rodizio-rgdb-';
const CACHE_NAME = CACHE_PREFIX + 'shell-20261019-v32';
const APP_SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;

  // HTML: network-first sem cache HTTP do navegador, para não ficar preso em versão antiga.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(async () => (await caches.match('./index.html')) || Response.error())
    );
    return;
  }

  // Arquivos estáticos: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(cached => {
      const refresh = fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
