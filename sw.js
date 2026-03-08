const CACHE_NAME = 'adunata-genova-2026-v1';

// Risorse statiche da mettere in cache al momento dell'installazione
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// Install: mette in cache le risorse statiche
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: rimuove le vecchie cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first per le API Supabase, cache-first per le risorse statiche
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Lascia passare direttamente le richieste a Supabase e CDN esterni
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('sheetjs.com')
  ) {
    return;
  }

  // Cache-first per le risorse locali
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
