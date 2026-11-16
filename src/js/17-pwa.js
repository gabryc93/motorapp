/* ═══════════════════════════════════════════════════════════════════
   PWA — installazione e aggiornamenti
   Registra sw.js (solo su https o localhost). Quando su GitHub c'è una
   versione nuova, mostra "Aggiorna" invece di lasciare la vecchia in cache.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var ok = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!ok) return;

  function banner(reg) {
    if (document.getElementById('hub-update')) return;
    var el = document.createElement('div');
    el.id = 'hub-update'; el.className = 'hub-update'; el.setAttribute('role', 'status');
    el.innerHTML = '<span>È disponibile una nuova versione di AutoHub</span><button>Aggiorna</button>';
    el.querySelector('button').addEventListener('click', function() {
      if (reg.waiting) reg.waiting.postMessage('skipWaiting');
      else location.reload();
    });
    document.body.appendChild(el);
  }
  var reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (reloading) return; reloading = true; location.reload();
  });
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
      if (reg.waiting && navigator.serviceWorker.controller) banner(reg);
      reg.addEventListener('updatefound', function() {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function() {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) banner(reg);
        });
      });
      // controlla aggiornamenti quando l'app torna in primo piano
      document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') reg.update().catch(function() {}); });
    }).catch(function(e) { console.warn('[pwa] service worker non registrato:', e.message); });
  });
})();
