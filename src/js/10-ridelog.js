

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
        '<h2>DIARIO USCITE<small>Ride registrate e viaggi importati</small></h2>' +
        '<div class="rdl-hdr-act"><button class="rdl-import" type="button" onclick="openViaggiImport()" aria-label="Importa viaggi">⬆ Importa</button>' +
        '<button class="gar-close" onclick="closeRideLog()">✕ Chiudi</button></div>' +
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

  var _filtro = 'tutti', _dmap = null;
  function rec(label, val, sub) { return '<div class="rdl-rec"><div class="rdl-summary-lbl">' + label + '</div><div class="rdl-rec-val">' + val + '</div>' + (sub ? '<div class="rdl-rec-sub">' + escSafe(sub) + '</div>' : '') + '</div>'; }
  window.rideLogFiltro = function(v) { _filtro = v; renderRideLog(); };

  function renderRideLog() {
    var body = document.getElementById('rdl-body');
    if (!body) return;
    var tutte = loadAll();
    if (tutte.length === 0) {
      body.innerHTML = '<div class="rdl-empty">Nessuna uscita registrata.<br>Avvia una Ride per registrare la prossima, oppure importa i viaggi da Google Maps o dall\'app della tua auto (MyPeugeot e simili).' +
        '<br><button class="rdl-import" type="button" onclick="openViaggiImport()">⬆ Importa viaggi</button></div>';
      return;
    }
    // filtro per veicolo
    var veh = {};
    tutte.forEach(function(r) { if (r.vehicleId) veh[r.vehicleId] = r.vehicleName || r.vehicleId; });
    if (_filtro !== 'tutti' && !veh[_filtro]) _filtro = 'tutti';
    var all = _filtro === 'tutti' ? tutte : tutte.filter(function(r) { return r.vehicleId === _filtro; });
    var html = Object.keys(veh).length > 1 ? '<div class="rdl-filtri" role="group" aria-label="Filtra per veicolo">' +
      '<button type="button" class="rdl-chip' + (_filtro === 'tutti' ? ' on' : '') + '" onclick="rideLogFiltro(\'tutti\')">Tutti</button>' +
      Object.keys(veh).map(function(id) { return '<button type="button" class="rdl-chip' + (_filtro === id ? ' on' : '') + '" onclick="rideLogFiltro(\'' + escSafe(id) + '\')">' + escSafe(veh[id]) + '</button>'; }).join('') + '</div>' : '';

    // riepilogo
    var totalKm = all.reduce(function(s, r) { return s + (r.distanceKm || 0); }, 0);
    var totalH = all.reduce(function(s, r) { return s + (r.movingMs || r.elapsedMs || 0); }, 0) / 3600000;
    var cKm = 0, cL = 0;
    all.forEach(function(r) { if (r.consumo != null && r.distanceKm) { cKm += r.distanceKm; cL += r.litri != null ? r.litri : r.consumo * r.distanceKm / 100; } });
    var m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    var meseKm = all.filter(function(r) { return (r.startTs || 0) >= m0.getTime(); }).reduce(function(s, r) { return s + (r.distanceKm || 0); }, 0);
    html += '<div class="rdl-stats-summary">' +
      '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Uscite</div><div class="rdl-summary-val">' + all.length + '</div></div>' +
      '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Km totali</div><div class="rdl-summary-val">' + Math.round(totalKm).toLocaleString('it-IT') + '</div></div>' +
      '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Questo mese</div><div class="rdl-summary-val">' + Math.round(meseKm).toLocaleString('it-IT') + '<small> km</small></div></div>' +
      (cKm ? '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Consumo</div><div class="rdl-summary-val">' + (cL / cKm * 100).toFixed(1) + '<small> l/100</small></div></div>'
           : '<div class="rdl-summary-cell"><div class="rdl-summary-lbl">Tempo</div><div class="rdl-summary-val">' + Math.round(totalH * 10) / 10 + 'h</div></div>') +
    '</div>';

    // record personali (solo uscite registrate con Ride)
    var rides = all.filter(function(r) { return !r.source; });
    var top = function(k) { return rides.filter(function(r) { return r[k] > 0; }).sort(function(a, b) { return b[k] - a[k]; })[0]; };
    var lunga = top('distanceKm'), veloce = top('maxKmh'), salita = top('salita');
    var piega = rides.filter(function(r) { return r.vehicleType === 'moto' && (r.leanSx || r.leanDx); }).sort(function(a, b) { return Math.max(b.leanSx || 0, b.leanDx || 0) - Math.max(a.leanSx || 0, a.leanDx || 0); })[0];
    var glat = rides.filter(function(r) { return r.vehicleType !== 'moto' && r.gLat > 0; }).sort(function(a, b) { return b.gLat - a.gLat; })[0];
    var passi = {}; rides.forEach(function(r) { (r.passi || []).forEach(function(n) { passi[n] = 1; }); });
    var recs = (lunga ? rec('Uscita più lunga', lunga.distanceKm.toFixed(0) + ' km', fmtDate(lunga.startTs)) : '') +
      (veloce ? rec('Velocità max', Math.round(veloce.maxKmh) + ' km/h', fmtDate(veloce.startTs)) : '') +
      (piega ? rec('Piega max', Math.max(piega.leanSx || 0, piega.leanDx || 0) + '°', fmtDate(piega.startTs)) : '') +
      (glat ? rec('G laterale max', glat.gLat.toFixed(2), fmtDate(glat.startTs)) : '') +
      (salita ? rec('Più dislivello', salita.salita.toLocaleString('it-IT') + ' m', fmtDate(salita.startTs)) : '') +
      (Object.keys(passi).length ? rec('Passi scalati', Object.keys(passi).length, Object.keys(passi).slice(0, 3).join(', ') + (Object.keys(passi).length > 3 ? '…' : '')) : '');
    if (recs) html += '<details class="rdl-recs" open><summary>Record</summary><div class="rdl-recs-grid">' + recs + '</div></details>';

    var sorted = all.slice().sort(function(a, b) { return (b.startTs || 0) - (a.startTs || 0); });
    html += sorted.map(function(r) {
      var title = r.title || ((r.source ? 'Viaggio ' : r.laps ? 'Pista ' : 'Ride ') + fmtDate(r.startTs));
      var color = r.vehicleType === 'moto' ? '#ff5a28' : '#5b9bd5';
      var third = r.consumo != null ? '<span class="rdl-card-stat-lbl">CONS</span>' + r.consumo.toFixed(1) + ' l/100' :
        r.laps ? '<span class="rdl-card-stat-lbl">BEST</span>' + window.hubRideAnalisi.fmtLap(Math.min.apply(null, r.laps)) :
        r.maxKmh ? '<span class="rdl-card-stat-lbl">MAX</span>' + Math.round(r.maxKmh) + ' km/h' : '';
      return '<div class="rdl-card" data-id="' + r.id + '" role="button" tabindex="0">' +
        '<div class="rdl-card-map">' + trackSVG(r.points, 70, 70, color) + '</div>' +
        '<div class="rdl-card-info">' +
          '<div class="rdl-card-title">' + escSafe(title) + '</div>' +
          '<div class="rdl-card-veh">' + escSafe(r.vehicleName || '—') + ' · ' + fmtDate(r.startTs) + (r.source === 'timeline' ? ' · Google Maps' : r.source === 'import' ? ' · importato' : '') + '</div>' +
          '<div class="rdl-card-stats">' +
            '<span class="rdl-card-stat"><span class="rdl-card-stat-lbl">DIST</span>' + (r.distanceKm || 0).toFixed(1) + ' km</span>' +
            ((r.movingMs || r.elapsedMs) ? '<span class="rdl-card-stat"><span class="rdl-card-stat-lbl">DUR</span>' + fmtDuration(r.movingMs || r.elapsedMs) + '</span>' : '') +
            (third ? '<span class="rdl-card-stat">' + third + '</span>' : '') +
          '</div>' +
          (r.passi && r.passi.length ? '<div class="rdl-card-passi">⛰ ' + escSafe(r.passi.join(' · ')) + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    body.innerHTML = html;
  }

  /* ── Detail ──────────────────────────────────────────────────── */
  function openDetail(rideId) {
    injectRideLogUI();
    var r = loadAll().find(function(x) { return x.id === rideId; });
    if (!r) return;
    var RA = window.hubRideAnalisi;
    var card = document.getElementById('rdl-detail-card');
    var title = r.title || ((r.source ? 'Viaggio ' : r.laps ? 'Pista ' : 'Ride ') + fmtDate(r.startTs));
    var color = r.vehicleType === 'moto' ? '#ff5a28' : '#5b9bd5';
    var cellD = function(l, v, wide) { return '<div class="rdl-detail-cell"' + (wide ? ' style="grid-column:1/-1"' : '') + '><div class="rdl-detail-cell-lbl">' + l + '</div><div class="rdl-detail-cell-val">' + v + '</div></div>'; };
    // per le uscite vecchie i dati mancanti si calcolano dalla traccia salvata
    var pts = r.points || [], cv = (r.leanSx == null && r.gLat == null && pts.length > 2 && !r.source) ? RA.curve(pts) : { leanSx: r.leanSx, leanDx: r.leanDx, gLat: r.gLat };
    var costo = r.consumo != null ? null : RA.costo(r.vehicleId, r.distanceKm);
    var hasMap = pts.length >= 2 && typeof L !== 'undefined';
    var bst = r.laps && r.laps.length ? Math.min.apply(null, r.laps) : null;
    var prof = !r.source ? RA.profiloSVG(pts, 600, 90) : '';
    var mov = r.movingMs || r.elapsedMs || 0;
    card.innerHTML =
      '<div class="rdl-detail-hdr">' +
        '<h3>' + escSafe(title) + '</h3>' +
        '<small>' + escSafe(r.vehicleName || '—') + ' · ' + fmtDate(r.startTs) + '</small>' +
      '</div>' +
      '<div class="rdl-detail-body">' +
        (hasMap ? '<div class="rdl-detail-map rdl-detail-lmap" id="rdl-lmap"></div><div class="rda-legend"><span style="--c:#3fbf7f">&lt;50</span><span style="--c:#e8c547">50-90</span><span style="--c:#ff8a3d">90-130</span><span style="--c:#e5484d">130+ km/h</span></div>'
                : '<div class="rdl-detail-map">' + trackSVG(pts, 600, 200, color) + '</div>') +
        (prof ? '<div class="rda-prof-wrap">' + prof + '<div class="rda-prof-lbl"><span class="sp">— velocità</span>' + (r.salita != null ? '<span class="al">▲ quota</span>' : '') + '</div></div>' : '') +
        '<div class="rdl-rename-row">' +
          '<input type="text" id="rdl-rename" maxlength="60" placeholder="Titolo (es. Stelvio con Marco)" value="' + escSafe(r.title || '') + '" aria-label="Titolo dell\'uscita">' +
          '<button class="rdl-act-export" onclick="rideLogRename(\'' + r.id + '\')">Salva</button>' +
        '</div>' +
        '<div class="rdl-detail-grid">' +
          cellD('Distanza', (r.distanceKm || 0).toFixed(1) + ' km') +
          cellD(r.movingMs ? 'In movimento' : 'Durata', fmtDuration(mov) + (r.movingMs && r.elapsedMs > r.movingMs + 60000 ? ' <small>/ ' + fmtDuration(r.elapsedMs) + ' tot</small>' : '')) +
          cellD('Media', (r.avgKmh || 0).toFixed(1) + ' km/h') +
          (r.consumo != null ? cellD('Consumo', r.consumo.toFixed(1) + ' l/100 km' + (r.litri ? ' · ' + r.litri.toFixed(1) + ' l' : '')) : cellD('Velocità max', r.maxKmh ? Math.round(r.maxKmh) + ' km/h' : '—')) +
          (r.salita != null ? cellD('Dislivello', '▲ ' + r.salita.toLocaleString('it-IT') + ' m · ▼ ' + (r.discesa || 0).toLocaleString('it-IT') + ' m') : '') +
          (r.altMax != null ? cellD('Quota max', r.altMax.toLocaleString('it-IT') + ' m') : '') +
          (r.vehicleType === 'moto' && (cv.leanSx || cv.leanDx) ? cellD('Piega max', '◀ ' + (cv.leanSx || 0) + '° · ' + (cv.leanDx || 0) + '° ▶') : '') +
          (r.vehicleType !== 'moto' && cv.gLat ? cellD('G laterale max', cv.gLat.toFixed(2) + ' g') : '') +
          (costo ? cellD(costo.litri != null ? 'Carburante' : 'Energia', '≈ ' + costo.eur.toFixed(2).replace('.', ',') + ' €' + (costo.litri != null ? ' · ' + costo.litri.toFixed(1).replace('.', ',') + ' l' : '')) : '') +
          (r.from || r.to ? cellD('Percorso', escSafe((r.from || '?') + ' → ' + (r.to || '?')), true) : '') +
          (r.passi && r.passi.length ? cellD('Passi', escSafe(r.passi.join(' · ')), true) : '') +
        '</div>' +
        (r.laps && r.laps.length ? '<div class="rdl-laps"><div class="rdl-detail-cell-lbl">Giri · migliore ' + RA.fmtLap(bst) + '</div>' +
          r.laps.map(function(l, i) { return '<span class="' + (l === bst ? 'best' : '') + '">' + (i + 1) + '. ' + RA.fmtLap(l) + (l !== bst ? ' <i>+' + ((l - bst) / 1000).toFixed(2) + '</i>' : '') + '</span>'; }).join('') + '</div>' : '') +
        ((cv.leanSx || cv.leanDx || cv.gLat) ? '<p class="rdl-note">' + (r.vehicleType === 'moto' ? 'Piega' : 'G laterale') + ' calcolata da velocità e raggio delle curve sulla traccia GPS: è un valore teorico, utile per confrontare le uscite tra loro.</p>' : '') +
        (costo ? '<p class="rdl-note">' + (costo.cons != null ? 'Carburante stimato con ' + costo.cons.toFixed(1).replace('.', ',') + ' l/100 km a ' + costo.prezzo.toFixed(3).replace('.', ',') + ' €/l (' + escSafe(costo.src) + ').' : 'Stima con ' + (costo.eurKm * 100).toFixed(2).replace('.', ',') + ' € ogni 100 km: ' + escSafe(costo.src) + '.') + '</p>' : '') +
      '</div>' +
      '<div class="rdl-detail-actions">' +
        '<button class="rdl-act-close" onclick="closeRideLogDetail()">Chiudi</button>' +
        (pts.length ? '<button class="rdl-act-export" onclick="rideLogExportGPX(\'' + r.id + '\')">⬇ GPX</button>' : '') +
        '<button class="rdl-act-del" onclick="rideLogDelete(\'' + r.id + '\')">🗑 Elimina</button>' +
      '</div>';
    document.getElementById('rdl-detail').classList.add('visible');
    if (_dmap) { try { _dmap.remove(); } catch (e) {} _dmap = null; }
    if (hasMap) setTimeout(function() { _dmap = RA.mappa(document.getElementById('rdl-lmap'), pts); }, 30);
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  }
  window.hubRideLogOpen = openDetail;

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
      return '    <trkpt lat="' + p.lat + '" lon="' + p.lng + '">' + (p.a != null ? '<ele>' + p.a + '</ele>' : '') + '<time>' + t + '</time></trkpt>';
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
  window._hubRideLogRender = renderRideLog;

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
    document.addEventListener('keydown', function(ev) {
      var card = ev.target.closest && ev.target.closest('#rdl-body .rdl-card');
      if (card && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openDetail(card.dataset.id); }
    });
  });
})();

