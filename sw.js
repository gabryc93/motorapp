/* AutoHub service worker — generato da build.py (non modificare sw.js nella radice)
   · Pagina: prima la rete, la copia in cache solo se sei offline
     (così ogni nuova versione caricata su GitHub arriva subito).
   · Dati veicoli db/*.json: dalla cache, aggiornati in background.
   · Librerie (Leaflet, MapLibre, font): dalla cache.
   · Prezzi, meteo, gare, mappe: sempre dalla rete, mai salvati. */
const BUILD = '2026-11-17-2121';
const CACHE = 'autohub-' + BUILD;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const LIBS = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('autohub-') && k !== CACHE && k !== 'autohub-db').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  // Pagina: rete prima
  if (req.mode === 'navigate' || (same && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  // Database veicoli: cache separata che sopravvive agli aggiornamenti, rinnovata in background
  if (same && /\/db\/[\w.-]+\.json$/.test(url.pathname)) {
    e.respondWith(caches.open('autohub-db').then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  // Icone e manifest
  if (same && /\/(icons\/|manifest\.webmanifest)/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // Librerie esterne con versione fissa: cache prima
  if (LIBS.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
  }
  // Tutto il resto (API, mappe, meteo): nessun intervento
});

// Tocco su una notifica (avvisi prezzo): apre l'app sui preferiti
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./#fuel');
  }));
});
