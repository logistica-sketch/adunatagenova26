const CACHE_NAME = 'adunata-genova-2026-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// Permette alla pagina di forzare l'attivazione del nuovo SW
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Install: precache risorse statiche — NON chiama skipWaiting così il banner viene mostrato
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: elimina tutte le cache vecchie e prende controllo subito
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first per index.html, cache-first per il resto
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

  const isHtmlRequest =
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    event.request.headers.get('accept')?.includes('text/html');

  if (isHtmlRequest) {
    // Network-first: prova sempre la rete, usa cache solo se offline
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
  } else {
    // Cache-first per risorse statiche (CSS, JS, immagini)
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
  }
});
