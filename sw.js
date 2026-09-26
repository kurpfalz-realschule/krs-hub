// ═══════════════════════════════════════════════
// KRS Hub — Service Worker
// Version: siehe VERSION (identisch mit CONFIG.VERSION)
// Strategie: Network-First für HTML, Cache-First für CDN
// Offline-Fallback: caches.match('./offline.html') bei Navigations-Requests
// ═══════════════════════════════════════════════

const VERSION = '3.31.0'; // Ab jetzt identisch mit CONFIG.VERSION (index.html) — CI prüft Gleichheit
const CACHE_NAME = 'krs-hub-v' + VERSION;

// Lokale Assets (Cache-First nach erstem Load)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './krs-native.js',
  './tenant.js',
  './manifest.json',
  './logo-krs.png',
  './modules/connect.html',
  './modules/plan.html',
  './modules/buchung.html',
  './hilfe/index.html',
  './offline.html',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// CDN-Assets (Cache-First — ändern sich selten)
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.min.js'
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
    ).then(() => caches.open(CACHE_NAME)).then(cache =>
      // C1: Altlasten mit Query-String aus dem aktuellen Cache räumen
      cache.keys().then(reqs => Promise.all(reqs.filter(r => new URL(r.url).search !== '').map(r => cache.delete(r))))
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
  // C1 (3.29.0): Anfragen mit Query-String (z. B. Update-Check index.html?_=<ts>)
  // oder cache:'no-store' NICHT speichern — sonst wuchs der Cache täglich um
  // eine komplette index.html pro Prüfung.
  if (url.origin === self.location.origin) {
    const cacheable = event.request.method === 'GET' && url.search === '' && event.request.cache !== 'no-store';
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && cacheable) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request, { ignoreSearch: true }).then(cached => {
            if (cached) return cached;
            // Letzter Fallback bei Navigations-Requests: Offline-Seite statt Browser-Fehlerseite
            if (event.request.mode === 'navigate') return caches.match('./offline.html');
            return undefined;
          })
        )
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
