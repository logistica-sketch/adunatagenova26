// ── Aggiorna questo valore ad ogni deploy ─────────────────────
const CACHE_NAME = 'adunata-20260428-1000';

// Host esterni da non intercettare mai
const BYPASS = [
  'supabase.co', 'supabase.io',
  'googleapis.com', 'gstatic.com',
  'jsdelivr.net', 'sheetjs.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com', 'fonts.gstatic.com',
];

// ── Install: precache + attivazione immediata ──────────────────
self.addEventListener('install', event => {
  self.skipWaiting(); // attiva subito, senza aspettare che le tab vecchie si chiudano
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/', '/index.html']))
  );
});

// ── Activate: cancella TUTTE le cache precedenti ───────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Message: skip waiting su richiesta della pagina ───────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch: Network First per tutto ────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (BYPASS.some(h => url.hostname.includes(h))) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok && response.type === 'basic') {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
  );
});
