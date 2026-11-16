

/* ═══════════════════════════════════════════════════════════════════
   HUB HOME ADDON — must run AFTER fuel JS (decorates fuel functions)
   - replaces fullscreen loader with skeleton + inline error
   - adds hero card on home (favorite or CTA-empty state)
   - re-renders hero whenever favorites change
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // showLoader / hideLoader are kept as in the original fuel app —
  // we intentionally do NOT override them. The fullscreen loader is back.

  // Decorate startApp:
  //   - If we have cached medie → render instantly, skip loader entirely
  //   - Otherwise → call the ORIGINAL startApp flow (loader + fetch)
  var _origStartApp = window.startApp;
  window.startApp = function() {
    var cache = readMedieCache();

    if (cache && cache.data) {
      // Instant cached render — bypass the loader
      var loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';
      var app = document.getElementById('app');
      if (app) app.style.display = 'block';

      try {
        if (typeof renderMedie === 'function') renderMedie(cache.data);
      } catch(e) { console.error('[AutoHub] render from cache failed', e); }
      _renderHomeHero();

      // Background revalidation — silent
      _revalidateMedie(cache);
    } else {
      // No cache: original flow (fullscreen loader + first fetch)
      _renderHomeHero();
      if (typeof _origStartApp === 'function') return _origStartApp.apply(this, arguments);
      // Fallback: minimal first-time load
      var app2 = document.getElementById('app');
      if (app2) app2.style.display = 'block';
      if (typeof window.loadMedie === 'function') window.loadMedie();
    }
  };

  // Allow overriding WORKER URL via ?worker=... or localStorage('hub_worker')
  // Useful for testing or when deployed on a domain not in the Worker allowlist.
  try {
    var urlParams = new URLSearchParams(location.search);
    var workerOverride = urlParams.get('worker') || localStorage.getItem('hub_worker');
    if (workerOverride && typeof window.WORKER !== 'undefined') {
      window.WORKER = workerOverride;
      if (urlParams.get('worker')) localStorage.setItem('hub_worker', workerOverride);
      console.log('[AutoHub] WORKER overridden to:', workerOverride);
    }
  } catch(e) {}

  // Replace loadMedie with a stale-while-revalidate version:
  //   1. If we have a cached response, render it instantly (no skeleton)
  //   2. Try a fresh fetch with a 12s timeout (cold-start friendly)
  //   3. On success: update cache, render fresh data
  //   4. On failure: if we already showed cache, show small "stale" badge;
  //                  if we have NO cache, show full inline error
  var MEDIE_CACHE_KEY = 'hub_medie_cache_v1';
  var MEDIE_TIMEOUT_MS = 12000;

  function readMedieCache() {
    try {
      var raw = localStorage.getItem(MEDIE_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (obj && obj.data && typeof obj.ts === 'number') return obj;
      return null;
    } catch(e) { return null; }
  }
  function writeMedieCache(data) {
    try { localStorage.setItem(MEDIE_CACHE_KEY, JSON.stringify({ data: data, ts: Date.now() })); }
    catch(e) {}
  }
  function fmtAge(ms) {
    var m = Math.round(ms / 60000);
    if (m < 1)  return 'ora';
    if (m < 60) return m + ' min fa';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h fa';
    var d = Math.round(h / 24);
    return d + 'g fa';
  }

  // Persistent stale-data badge on the home (above medie cards)
  function showStaleBadge(ageMs, errMsg) {
    var slot = document.getElementById('home-error');
    if (!slot) return;
    slot.innerHTML =
      '⚠ <strong>Mostrando dati salvati</strong> (' + escSafe(fmtAge(ageMs)) + ') · ' +
      'aggiornamento fallito' + (errMsg ? ': ' + escSafe(errMsg) : '') +
      '<br><small>Tap per riprovare</small>';
    slot.style.display = 'block';
  }
  function showFullError(url, msg) {
    var slot = document.getElementById('home-error');
    if (!slot) return;
    slot.innerHTML =
      '<strong>Errore caricamento prezzi.</strong><br>' +
      'URL: <code style="font-size:.65rem">' + escSafe(url) + '</code><br>' +
      'Dettaglio: ' + escSafe(msg) + '<br>' +
      '<small>Tap qui per riprovare</small>';
    slot.style.display = 'block';
  }

  // loadMedie:
  //   - Called from initial load (when no cache) or via "Tap to retry"
  //   - Lets the original loader stay visible during fetch
  //   - On success: cache + render + hide loader + clear errors
  //   - On failure (no cache): show full diagnostic error
  //   - On failure (with cache): show stale-data badge, keep cached display
  window.loadMedie = async function() {
    var heroErr = document.getElementById('home-error');
    if (heroErr) heroErr.style.display = 'none';

    var workerUrl = (typeof WORKER !== 'undefined') ? WORKER : '';
    var fullUrl = workerUrl + '/api/medie';
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function() { if (ctrl) ctrl.abort(); }, MEDIE_TIMEOUT_MS);

    try {
      var res = await fetch(fullUrl, ctrl ? { signal: ctrl.signal } : {});
      clearTimeout(timer);
      if (!res.ok) {
        var body = '';
        try { body = (await res.text()).slice(0, 120); } catch(_) {}
        throw new Error('HTTP ' + res.status + (body ? ' · ' + body : ''));
      }
      var data = await res.json();
      writeMedieCache(data);
      if (typeof renderMedie === 'function') renderMedie(data);
      // Hide the original loader if it was showing
      var loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';
      var app = document.getElementById('app');
      if (app) app.style.display = 'block';
    } catch (e) {
      clearTimeout(timer);
      var msg = (e && e.name === 'AbortError')
        ? 'Timeout (' + Math.round(MEDIE_TIMEOUT_MS/1000) + 's) — il Worker non ha risposto'
        : (e && e.message) ? e.message : String(e);
      console.error('[AutoHub] loadMedie failed:', msg, '· URL:', fullUrl);

      var cache = readMedieCache();
      var loader = document.getElementById('loader');
      var app = document.getElementById('app');

      if (cache && cache.data) {
        // We have cache: hide loader, render cache, show stale badge
        if (loader) loader.style.display = 'none';
        if (app) app.style.display = 'block';
        try { if (typeof renderMedie === 'function') renderMedie(cache.data); } catch(_) {}
        showStaleBadge(Date.now() - cache.ts, msg);
      } else {
        // No cache: keep loader hidden, show full diagnostic
        if (loader) loader.style.display = 'none';
        if (app) app.style.display = 'block';
        showFullError(fullUrl, msg);
      }
    }
  };

  // Silent revalidation (used when we already showed cached data on startup)
  async function _revalidateMedie(currentCache) {
    var workerUrl = (typeof WORKER !== 'undefined') ? WORKER : '';
    var fullUrl = workerUrl + '/api/medie';
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function() { if (ctrl) ctrl.abort(); }, MEDIE_TIMEOUT_MS);

    try {
      var res = await fetch(fullUrl, ctrl ? { signal: ctrl.signal } : {});
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      writeMedieCache(data);
      if (typeof renderMedie === 'function') renderMedie(data);
    } catch (e) {
      clearTimeout(timer);
      // Silent: don't disturb the user with errors when cache was already shown.
      // BUT: if cached data is older than 24h, show a discreet stale notice.
      if (currentCache && (Date.now() - currentCache.ts) > 24 * 60 * 60 * 1000) {
        var msg = (e && e.name === 'AbortError') ? 'timeout' : (e && e.message) || 'errore';
        showStaleBadge(Date.now() - currentCache.ts, msg);
      }
      console.warn('[AutoHub] silent revalidate failed:', e);
    }
  }

  window._renderHomeHero = function() {
    var slot = document.getElementById('hero-slot');
    if (!slot) return;
    var favs = (typeof loadFavs === 'function') ? loadFavs() : [];

    if (favs.length > 0) {
      // Compact one-line row: ★ name … price → tap = open favorites list
      favs = favs.slice().sort(function(a, b) {
        var ta = (typeof a.savedAt === 'number') ? a.savedAt : (Date.parse(a.savedAt) || 0);
        var tb = (typeof b.savedAt === 'number') ? b.savedAt : (Date.parse(b.savedAt) || 0);
        return tb - ta;
      });
      var f = favs[0];
      var name = f.customName || f.nome || 'Distributore preferito';
      var unit = (String(f.carburante || '').toLowerCase().indexOf('metano') >= 0) ? 'kg' : 'lt';
      var price = (typeof f.prezzo === 'number' && !isNaN(f.prezzo)) ? f.prezzo.toFixed(3) : '—';
      var more = favs.length > 1
        ? '<span class="hero-fav-more">+' + (favs.length - 1) + '</span>'
        : '';

      slot.innerHTML =
        '<div class="hero-fav" onclick="openFavView()" role="button" aria-label="Apri preferiti">' +
          '<span class="hero-fav-star" aria-hidden="true">★</span>' +
          '<span class="hero-fav-name">' + escSafe(name) + '</span>' +
          more +
          '<span class="hero-fav-price">' + price +
            '<span class="hero-fav-unit">€/' + unit + '</span>' +
          '</span>' +
          '<span class="hero-fav-chev" aria-hidden="true">›</span>' +
        '</div>';
    } else {
      slot.innerHTML =
        '<div class="hero-empty">' +
          '<div class="hero-row">' +
            '<div class="hero-label"><span class="hero-icn">🎯</span>Trova il più conveniente</div>' +
          '</div>' +
          '<div class="hero-empty-text">Localizzati e scopri i distributori più economici vicino a te.</div>' +
          '<button class="hero-cta-btn" onclick="event.stopPropagation();openMapView()">📍 Apri la mappa</button>' +
        '</div>';
    }
  };

  // Re-render hero whenever favorites change
  if (typeof window.saveFavs === 'function') {
    var _origSaveFavs = window.saveFavs;
    window.saveFavs = function(favs) {
      var r = _origSaveFavs.apply(this, arguments);
      try { window._renderHomeHero(); } catch(e) {}
      return r;
    };
  }
})();

