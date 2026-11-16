

/* ═══════════════════════════════════════════════════════════════════
   HUB RIDELOG — diary of past rides (auto-saved on rideStop)
   Data: hub_rides_v1
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function loadAll() {
    try { return JSON.parse(localStorage.getItem('hub_rides_v1') || '[]'); }
    catch(e) { return []; }
  }
  function saveAll(a) {
    try { localStorage.setItem('hub_rides_v1', JSON.stringify(a)); } catch(e) {}
  }

  /* ── Mini-map SVG generator from track points ───────────────── */
  function trackSVG(points, w, h, color) {
    if (!points || points.length < 2) {
      return '<svg viewBox="0 0 ' + w + ' ' + h + '"><line x1="' + (w/2) + '" y1="' + (h*0.3) + '" x2="' + (w/2) + '" y2="' + (h*0.7) + '" stroke="rgba(255,255,255,.2)" stroke-width="2"/></svg>';
    }
    var lats = points.map(function(p){return p.lat;});
    var lngs = points.map(function(p){return p.lng;});
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
    var dLat = maxLat - minLat || 0.001;
    var dLng = maxLng - minLng || 0.001;
    var pad = 4;
    var path = points.map(function(p, i) {
      var x = pad + (p.lng - minLng) / dLng * (w - 2*pad);
      // Note: SVG y is inverted (lat ↑ = y ↓)
      var y = pad + (maxLat - p.lat) / dLat * (h - 2*pad);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
    var c = color || '#ff5a28';
    var startX = pad + (points[0].lng - minLng) / dLng * (w - 2*pad);
    var startY = pad + (maxLat - points[0].lat) / dLat * (h - 2*pad);
    var endP = points[points.length - 1];
    var endX = pad + (endP.lng - minLng) / dLng * (w - 2*pad);
    var endY = pad + (maxLat - endP.lat) / dLat * (h - 2*pad);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path d="' + path + '" stroke="' + c + '" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + startX.toFixed(1) + '" cy="' + startY.toFixed(1) + '" r="2.5" fill="#6dd9a3"/>' +
      '<circle cx="' + endX.toFixed(1) + '" cy="' + endY.toFixed(1) + '" r="2.5" fill="#ff8a82"/>' +
    '</svg>';
  }

  function fmtDuration(ms) {
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    return m + 'm';
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth()+1)).slice(-2) + '/' + d.getFullYear();
  }

  function injectRideLogUI() {
    if (document.getElementById('rdl-overlay')) return;

    var slot = document.getElementById('garage-launch-slot');
    if (slot) {
      var b = document.createElement('button');
      b.id = 'rdl-launch-btn';
      b.className = 'rdl-launch';
      b.type = 'button';
      b.innerHTML =
        '<span class="rdl-launch-icon">📓</span>' +
        '<span class="rdl-launch-text">Diario uscite</span>' +
        '<span class="rdl-launch-stat" id="rdl-launch-stat">—</span>';
      b.onclick = window.openRideLog;
      slot.appendChild(b);
    }

    var ov = document.createElement('div');
    ov.id = 'rdl-overlay';
    ov.innerHTML =
      '<div class="rdl-hdr">' +
        '<h2>DIARIO USCITE<small>Ride completate · auto-salvate</small></h2>' +
        '<button class="gar-close" onclick="closeRideLog()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="rdl-body" id="rdl-body"></div>';
    document.body.appendChild(ov);

    var dm = document.createElement('div');
    dm.id = 'rdl-detail';
    dm.onclick = function(e) { if (e.target === dm) closeRideLogDetail(); };
    dm.innerHTML = '<div class="rdl-detail-card" id="rdl-detail-card"></div>';
    document.body.appendChild(dm);
  }

  /* ── Public ─────────────────────────────────────────────────── */
  window.openRideLog = function() {
    injectRideLogUI();
    document.getElementById('rdl-overlay').classList.add('visible');
    renderRideLog();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeRideLog = function() {
    document.getElementById('rdl-overlay').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeRideLogDetail = function() {
    document.getElementById('rdl-detail').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  function renderRideLog() {
    var body = document.getElementById('rdl-body');
    if (!body) return;
    var all = loadAll();
    if (all.length === 0) {
      body.innerHTML = '<div class="rdl-empty">Nessuna uscita registrata.<br>Avvia una Ride dalla tab 🏁 per registrare la prossima.</div>';
      return;
    }

    // Summary stats
    var totalKm = all.reduce(function(s, r) { return s + (r.distanceKm || 0); }, 0);
    var totalH = all.reduce(function(s, r) { return s + (r.elapsedMs || 0); }, 0) / 3600000;
    var maxKmh = all.reduce(function(s, r) { return Math.max(s, r.maxKmh || 0); }, 0);

    var html = '<div class="rdl-stats-summary">' +
      '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Uscite</div><div class="rdl-summary-val">' + all.length + '</div></div>' +
      '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Km totali</div><div class="rdl-summary-val">' + Math.round(totalKm).toLocaleString('it-IT') + '</div></div>' +
      '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Tempo</div><div class="rdl-summary-val">' + Math.round(totalH * 10) / 10 + 'h</div></div>' +
    '</div>';

    var sorted = all.slice().sort(function(a, b) { return (b.startTs || 0) - (a.startTs || 0); });
    html += sorted.map(function(r) {
      var title = r.title || ('Ride ' + fmtDate(r.startTs));
      var color = r.vehicleType === 'moto' ? '#ff5a28' : '#5b9bd5';
      return '<div class="rdl-card" data-id="' + r.id + '">' +
        '<div class="rdl-card-map">' + trackSVG(r.points, 70, 70, color) + '</div>' +
        '<div class="rdl-card-info">' +
          '<div class="rdl-card-title">' + escSafe(title) + '</div>' +
          '<div class="rdl-card-veh">' + escSafe(r.vehicleName || '—') + ' · ' + fmtDate(r.startTs) + '</div>' +
          '<div class="rdl-card-stats">' +
            '<span class="rdl-card-stat"><span class="rdl-card-stat-lbl">DIST</span>' + (r.distanceKm || 0).toFixed(1) + ' km</span>' +
            '<span class="rdl-card-stat"><span class="rdl-card-stat-lbl">DUR</span>' + fmtDuration(r.elapsedMs || 0) + '</span>' +
            '<span class="rdl-card-stat"><span class="rdl-card-stat-lbl">MAX</span>' + Math.round(r.maxKmh || 0) + ' km/h</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    body.innerHTML = html;
  }

  /* ── Detail ──────────────────────────────────────────────────── */
  function openDetail(rideId) {
    var r = loadAll().find(function(x) { return x.id === rideId; });
    if (!r) return;
    var card = document.getElementById('rdl-detail-card');
    var title = r.title || ('Ride ' + fmtDate(r.startTs));
    var color = r.vehicleType === 'moto' ? '#ff5a28' : '#5b9bd5';
    card.innerHTML =
      '<div class="rdl-detail-hdr">' +
        '<h3>' + escSafe(title) + '</h3>' +
        '<small>' + escSafe(r.vehicleName || '—') + ' · ' + fmtDate(r.startTs) + '</small>' +
      '</div>' +
      '<div class="rdl-detail-body">' +
        '<div class="rdl-detail-map">' + trackSVG(r.points, 600, 200, color) + '</div>' +
        '<div class="rdl-rename-row">' +
          '<input type="text" id="rdl-rename" maxlength="60" placeholder="Titolo (es. Stelvio con Marco)" value="' + escSafe(r.title || '') + '">' +
          '<button class="rdl-act-export" onclick="rideLogRename(\'' + r.id + '\')">Salva</button>' +
        '</div>' +
        '<div class="rdl-detail-grid">' +
          '<div class="rdl-detail-cell"><div class="rdl-detail-cell-lbl">Distanza</div><div class="rdl-detail-cell-val">' + (r.distanceKm || 0).toFixed(2) + ' km</div></div>' +
          '<div class="rdl-detail-cell"><div class="rdl-detail-cell-lbl">Durata</div><div class="rdl-detail-cell-val">' + fmtDuration(r.elapsedMs || 0) + '</div></div>' +
          '<div class="rdl-detail-cell"><div class="rdl-detail-cell-lbl">Velocità media</div><div class="rdl-detail-cell-val">' + (r.avgKmh || 0).toFixed(1) + ' km/h</div></div>' +
          '<div class="rdl-detail-cell"><div class="rdl-detail-cell-lbl">Velocità max</div><div class="rdl-detail-cell-val">' + Math.round(r.maxKmh || 0) + ' km/h</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="rdl-detail-actions">' +
        '<button class="rdl-act-close" onclick="closeRideLogDetail()">Chiudi</button>' +
        '<button class="rdl-act-export" onclick="rideLogExportGPX(\'' + r.id + '\')">⬇ GPX</button>' +
        '<button class="rdl-act-del" onclick="rideLogDelete(\'' + r.id + '\')">🗑 Elimina</button>' +
      '</div>';
    document.getElementById('rdl-detail').classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  }

  window.rideLogRename = function(id) {
    var input = document.getElementById('rdl-rename');
    var newTitle = input ? input.value.trim() : '';
    var all = loadAll();
    var i = all.findIndex(function(x) { return x.id === id; });
    if (i >= 0) {
      all[i].title = newTitle;
      saveAll(all);
      renderRideLog();
      closeRideLogDetail();
    }
  };
  window.rideLogDelete = function(id) {
    if (!confirm('Eliminare questa uscita dal diario?')) return;
    var all = loadAll().filter(function(x) { return x.id !== id; });
    saveAll(all);
    closeRideLogDetail();
    renderRideLog();
    refreshRideLogBadge();
  };
  window.rideLogExportGPX = function(id) {
    var r = loadAll().find(function(x) { return x.id === id; });
    if (!r || !r.points || r.points.length === 0) { alert('Nessun punto GPS.'); return; }
    var trkpts = r.points.map(function(p) {
      var t = new Date(p.ts).toISOString();
      return '    <trkpt lat="' + p.lat + '" lon="' + p.lng + '"><time>' + t + '</time></trkpt>';
    }).join('\n');
    var name = r.title || ('Ride ' + fmtDate(r.startTs));
    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<gpx version="1.1" creator="AutoHub" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      '  <metadata><name>' + escSafe(name) + '</name><time>' + new Date(r.startTs).toISOString() + '</time></metadata>\n' +
      '  <trk><name>' + escSafe(name) + '</name><trkseg>\n' +
      trkpts + '\n' +
      '  </trkseg></trk>\n' +
      '</gpx>';
    var blob = new Blob([gpx], { type: 'application/gpx+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'autohub-' + name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.gpx';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      try { URL.revokeObjectURL(url); } catch(_) {}
      a.remove();
    }, 100);
  };

  function refreshRideLogBadge() {
    var b = document.getElementById('rdl-launch-stat');
    if (!b) return;
    var n = loadAll().length;
    b.textContent = n === 0 ? 'Vuoto' : n + (n === 1 ? ' uscita' : ' uscite');
  }
  window._hubRefreshRideLogBadge = refreshRideLogBadge;

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      injectRideLogUI();
      refreshRideLogBadge();
    }, 500);

    // Delegate clicks on cards
    document.addEventListener('click', function(ev) {
      var card = ev.target.closest('#rdl-body .rdl-card');
      if (card) openDetail(card.dataset.id);
    });
  });
})();

