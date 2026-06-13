// ═══════════════════════════════════════════════
// KRS Hub — Service Worker
// Version: 1.0.0
// Strategie: Network-First für HTML, Cache-First für CDN
// ═══════════════════════════════════════════════

const VERSION = '1.1.0';
const CACHE_NAME = 'krs-hub-v' + VERSION;

// Lokale Assets (Cache-First nach erstem Load)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo-krs.png',
  './modules/connect.html',
  './modules/plan.html',
  './modules/buchung.html'
];

// CDN-Assets (Cache-First — ändern sich selten)
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ── Install ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // CDN-Assets vorladen (Fehler ignorieren falls offline)
      const cdnPromises = CDN_ASSETS.map(url =>
        cache.add(url).catch(() => console.log('SW: CDN cache miss:', url))
      );
      return Promise.all([
        cache.addAll(LOCAL_ASSETS),
        ...cdnPromises
      ]);
    })
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch Strategy ───────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase API: Network-only (Realtime, Auth)
  if (url.hostname.includes('supabase')) return;

  // Google Apps Script: Network-only
  if (url.hostname.includes('script.google.com')) return;

  // CDN: Cache-First
  if (url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('esm.sh')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // Lokale Assets: Network-First (immer frisch, Fallback auf Cache)
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});

// ── Update Notification ──────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
