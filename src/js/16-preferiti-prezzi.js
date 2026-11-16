/* ═══════════════════════════════════════════════════════════════════
   PREFERITI CARBURANTI — prezzo aggiornato, storico e avvisi
   · All'apertura dell'app (al massimo una volta ogni 2 ore) chiede al Worker
     i prezzi attuali dei distributori preferiti (/api/impianti).
   · Aggiorna il prezzo del preferito e ne tiene uno storico (60 punti).
   · Se il prezzo scende sotto la soglia scelta: avviso in alto nella pagina
     Carburanti e, se l'hai permesso, una notifica.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';
  var STATE = 'hub_price_alerts_v1';    // { lastCheck, notified: { favId: prezzo } }
  var MIN_GAP = 2 * 3600 * 1000;
  var HIST_MAX = 60;

  function workerBase() {
    try { if (typeof WORKER === 'string' && WORKER) return WORKER; } catch (e) {}
    return window.WORKER || 'https://osservaprezzi.gabrycois.workers.dev';
  }
  function favs() { try { return typeof loadFavs === 'function' ? loadFavs() : JSON.parse(localStorage.getItem('opf_favs') || '[]'); } catch (e) { return []; } }
  function store(list) { if (typeof saveFavs === 'function') saveFavs(list); else localStorage.setItem('opf_favs', JSON.stringify(list)); }
  function state() { try { return JSON.parse(localStorage.getItem(STATE) || '{}'); } catch (e) { return {}; } }
  function setState(s) { try { localStorage.setItem(STATE, JSON.stringify(s)); } catch (e) {} }
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Il prezzo giusto per il preferito: stesso nome carburante e stessa modalità (self/servito)
  function pick(fav, prezzi) {
    var same = prezzi.filter(function(p) { return p.carb === fav.carburante && !!p.isSelf === !!fav.isSelf; });
    if (!same.length) same = prezzi.filter(function(p) { return p.carb === fav.carburante; });
    if (!same.length) return null;
    return same.sort(function(a, b) { return a.prezzo - b.prezzo; })[0];
  }

  function refresh(force) {
    var list = favs();
    if (!list.length) return Promise.resolve({ updated: 0 });
    var st = state();
    if (!force && st.lastCheck && Date.now() - st.lastCheck < MIN_GAP) { checkAlerts(list); return Promise.resolve({ updated: 0, skipped: true }); }
    var ids = list.map(function(f) { return f.id; }).filter(function(id) { return /^\d+$/.test(String(id)); }).slice(0, 50);
    return fetch(workerBase() + '/api/impianti?ids=' + ids.join(','))
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j) {
        var today = window.hubToday ? window.hubToday() : new Date().toISOString().slice(0, 10), n = 0;
        var fresh = favs();   // rilegge: l'utente potrebbe aver modificato i preferiti nel frattempo
        fresh.forEach(function(f) {
          var imp = j.impianti && j.impianti[f.id];
          if (!imp) return;
          var p = pick(f, imp.prezzi || []);
          if (!p) { f.missing = true; return; }
          f.missing = false;
          if (typeof f.prevPrezzo !== 'number' || f.prezzo !== p.prezzo) f.prevPrezzo = f.prezzo;
          f.prezzo = p.prezzo; f.dtComu = p.dtComu;
          f.hist = Array.isArray(f.hist) ? f.hist : [];
          var last = f.hist[f.hist.length - 1];
          if (last && last.d === today) last.p = p.prezzo; else f.hist.push({ d: today, p: p.prezzo });
          if (f.hist.length > HIST_MAX) f.hist = f.hist.slice(-HIST_MAX);
          n++;
        });
        store(fresh);
        st.lastCheck = Date.now(); setState(st);
        checkAlerts(fresh);
        if (document.getElementById('fav-view') && document.getElementById('fav-view').classList.contains('visible') && typeof renderFavView === 'function') renderFavView();
        return { updated: n };
      });
  }

  /* ── Avvisi ──────────────────────────────────────────────────────── */
  function checkAlerts(list) {
    var st = state(); st.notified = st.notified || {};
    var hits = list.filter(function(f) { return typeof f.alert === 'number' && typeof f.prezzo === 'number' && !f.missing && f.prezzo <= f.alert; });
    banner(hits);
    hits.forEach(function(f) {
      if (st.notified[f.id] === f.prezzo) return;   // già avvisato per questo prezzo
      st.notified[f.id] = f.prezzo;
      notify('⛽ ' + (f.customName || f.nome) + ': ' + f.prezzo.toFixed(3) + ' €',
        (f.carburante || '') + (f.isSelf ? ' self' : ' servito') + ' · sotto la tua soglia di ' + f.alert.toFixed(3) + ' €');
    });
    // chi è tornato sopra soglia potrà riavvisare
    Object.keys(st.notified).forEach(function(id) { if (!hits.some(function(f) { return String(f.id) === id; })) delete st.notified[id]; });
    setState(st);
  }
  function notify(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(function(reg) { reg.showNotification(title, { body: body, icon: './icons/icon-192.png', tag: 'prezzo-' + title }); });
      } else { new Notification(title, { body: body }); }
    } catch (e) {}
  }
  function banner(hits) {
    var el = document.getElementById('hub-price-alert');
    if (!hits.length) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'hub-price-alert';
      var main = document.querySelector('#hub-fuel #app main');
      if (!main) return;
      main.insertBefore(el, main.firstChild);
      el.addEventListener('click', function(e) {
        if (e.target.closest('[data-x]')) { el.remove(); return; }
        if (typeof openFavView === 'function') openFavView();
      });
    }
    el.className = 'hub-price-alert';
    el.innerHTML = '<span class="hpa-ico" aria-hidden="true">🔔</span><div><b>' +
      (hits.length === 1 ? h(hits[0].customName || hits[0].nome) + ' a ' + hits[0].prezzo.toFixed(3) + ' €' : hits.length + ' preferiti sotto la tua soglia') +
      '</b><small>' + (hits.length === 1 ? 'Sotto la soglia di ' + hits[0].alert.toFixed(3) + ' € · tocca per i preferiti' : 'Tocca per vederli') + '</small></div>' +
      '<button data-x aria-label="Chiudi avviso">×</button>';
  }

  /* ── Storico in miniatura (usato da renderFavView) ───────────────── */
  window.hubFavHistory = function(f) {
    var hist = Array.isArray(f.hist) ? f.hist : [];
    var out = '';
    if (typeof f.prevPrezzo === 'number' && typeof f.prezzo === 'number' && f.prevPrezzo !== f.prezzo) {
      var d = f.prezzo - f.prevPrezzo, up = d > 0;
      out += '<span class="fav-trend ' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + Math.abs(d).toFixed(3) + '</span>';
    }
    if (hist.length >= 2) {
      var ps = hist.map(function(x) { return x.p; }), mn = Math.min.apply(null, ps), mx = Math.max.apply(null, ps), W = 64, H = 18;
      var pts = ps.map(function(p, i) { return (i / (ps.length - 1) * W).toFixed(1) + ',' + (mx === mn ? H / 2 : (H - (p - mn) / (mx - mn) * H)).toFixed(1); }).join(' ');
      out += '<svg class="fav-spark" viewBox="-1 -1 ' + (W + 2) + ' ' + (H + 2) + '" width="' + W + '" height="' + H + '" role="img" aria-label="Andamento prezzo, ' + hist.length + ' rilevazioni"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    }
    if (typeof f.alert === 'number') out += '<span class="fav-alert-tag' + (f.prezzo <= f.alert ? ' hit' : '') + '">🔔 ≤ ' + f.alert.toFixed(3) + '</span>';
    if (f.missing) out += '<span class="fav-alert-tag">prezzo non più pubblicato</span>';
    return out ? '<div class="fav-hist">' + out + '</div>' : '';
  };
  // Soglia: letta/scritta dal modulo di modifica preferito
  window.hubFavAlertSet = function(id, val) {
    var list = favs(), f = list.filter(function(x) { return x.id === id; })[0];
    if (!f) return;
    var n = parseFloat(String(val || '').replace(',', '.'));
    if (isFinite(n) && n > 0.3 && n < 5) {
      f.alert = Math.round(n * 1000) / 1000;
      if ('Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) {} }
    } else delete f.alert;
    store(list);
    checkAlerts(list);
  };

  window.hubFavRefresh = refresh;
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() { refresh(false).catch(function(e) { console.warn('[preferiti] aggiornamento prezzi non riuscito:', e.message); }); }, 3000);
  });
})();
