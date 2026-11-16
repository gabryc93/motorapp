/* ═══════════════════════════════════════════════════════════════════
   DIARIO USCITE — importazione viaggi
   · Cronologia di Google Maps (Timeline.json esportato dal telefono):
     prende gli spostamenti in auto/moto con data, distanza e percorso.
   · Resoconto viaggi delle app delle auto (MyPeugeot, MyCitroën, MyOpel,
     Kia/Hyundai, FordPass…) in CSV, Excel o JSON: riconosce da solo le
     colonne (data, distanza, durata, consumo, litri, contachilometri),
     che si possono comunque correggere prima di importare.
   I viaggi finiscono in hub_rides_v1 (source: 'timeline' | 'import') e i
   consumi alimentano il riquadro Consumi (window.hubTripStats).
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';
  var RIDES = 'hub_rides_v1';
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem(RIDES) || '[]'); } catch (e) { return []; } }
  function save(a) { localStorage.setItem(RIDES, JSON.stringify(a)); }
  function uid() { return 'rd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function garage() { return window.hubGarage ? window.hubGarage.list() : []; }
  function vName(v) { return v ? (v.customName || [v.marca, v.modello].filter(Boolean).join(' ')) : 'Sconosciuto'; }

  /* ── Numeri, date e durate scritti in tanti modi ──────────────── */
  function num(x) {
    if (typeof x === 'number') return isFinite(x) ? x : null;
    var s = String(x == null ? '' : x).replace(/[^\d,.\-]/g, '');
    if (!s || s === '-' ) return null;
    if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.indexOf(',') >= 0) s = s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  function date(x) {
    if (x instanceof Date) return isNaN(x) ? null : x.getTime();
    if (typeof x === 'number') {
      if (x > 1e11) return x;                    // millisecondi
      if (x > 1e9) return x * 1000;              // secondi
      if (x > 20000 && x < 80000) return Math.round((x - 25569) * 86400000);   // data seriale Excel
      return null;
    }
    var s = String(x || '').trim();
    if (!s) return null;
    var m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/.exec(s);
    if (m) {
      var y = +m[3]; if (y < 100) y += 2000;
      return new Date(y, +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
    }
    var t = Date.parse(s);
    return isNaN(t) ? null : t;
  }
  function durMin(x) {
    if (typeof x === 'number') return x > 0 && x < 1 ? x * 1440 : x;   // Excel salva le ore come frazione di giorno
    var s = String(x || '').trim();
    var m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (m) return +m[1] * 60 + +m[2] + (+(m[3] || 0)) / 60;
    var hh = /(\d+)\s*h/.exec(s), mm = /(\d+)\s*(?:m|min)\b/.exec(s);
    if (hh || mm) return (hh ? +hh[1] * 60 : 0) + (mm ? +mm[1] : 0);
    return num(s);
  }
  function latLng(s) {
    if (!s) return null;
    if (typeof s === 'object' && s.latitudeE7 != null) return { lat: s.latitudeE7 / 1e7, lng: s.longitudeE7 / 1e7 };
    if (typeof s === 'object' && s.latE7 != null) return { lat: s.latE7 / 1e7, lng: s.lngE7 / 1e7 };
    var m = /(-?\d+(?:\.\d+)?)°?\s*,\s*(-?\d+(?:\.\d+)?)/.exec(String(s));
    return m ? { lat: +m[1], lng: +m[2] } : null;
  }
  function thin(points, max) {
    if (points.length <= max) return points;
    var out = [], step = (points.length - 1) / (max - 1);
    for (var i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
    return out;
  }
  function distKm(pts) {
    var d = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
      var q = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      d += 2 * R * Math.asin(Math.sqrt(q));
    }
    return d;
  }

  /* ── Google Maps: cronologia ──────────────────────────────────── */
  var DRIVE = /in_passenger_vehicle|in_vehicle|driving|in_car|motorcycling|in_taxi/;
  function timeline(j, opts) {
    var out = [], since = opts.since || 0;
    var keep = function(type) { return DRIVE.test(String(type || '').toLowerCase().replace(/\s+/g, '_')); };
    // Formato attuale (telefono, 2024+): semanticSegments, oppure array su iPhone
    var segs = Array.isArray(j) ? j : j.semanticSegments;
    if (Array.isArray(segs)) {
      var paths = [];
      segs.forEach(function(s) {
        var st = date(s.startTime), en = date(s.endTime);
        if (Array.isArray(s.timelinePath)) {
          s.timelinePath.forEach(function(p) {
            var ll = latLng(p.point), t = p.time ? date(p.time) : st + (num(p.durationMinutesOffsetFromStartTime) || 0) * 60000;
            if (ll && t) paths.push({ lat: ll.lat, lng: ll.lng, ts: t });
          });
        }
        var a = s.activity;
        if (!a || !st || st < since) return;
        var tc = a.topCandidate || {};
        if (!keep(tc.type)) return;
        out.push({ startTs: st, endTs: en || st, distanceKm: (num(a.distanceMeters) || 0) / 1000,
          a: latLng(a.start && (a.start.latLng || a.start)), b: latLng(a.end && (a.end.latLng || a.end)) });
      });
      paths.sort(function(x, y) { return x.ts - y.ts; });
      out.forEach(function(r) {
        var pts = paths.filter(function(p) { return p.ts >= r.startTs && p.ts <= r.endTs; });
        if (r.a) pts.unshift({ lat: r.a.lat, lng: r.a.lng, ts: r.startTs });
        if (r.b) pts.push({ lat: r.b.lat, lng: r.b.lng, ts: r.endTs });
        r.points = thin(pts, 120);
        if (!r.distanceKm && pts.length > 1) r.distanceKm = distKm(pts);
      });
      return out;
    }
    // Formato vecchio (Takeout, file mensili): timelineObjects[].activitySegment
    var objs = j.timelineObjects || [];
    objs.forEach(function(o) {
      var s = o.activitySegment;
      if (!s || !keep(s.activityType)) return;
      var d = s.duration || {}, st = date(d.startTimestamp || d.startTimestampMs && +d.startTimestampMs), en = date(d.endTimestamp || d.endTimestampMs && +d.endTimestampMs);
      if (!st || st < since) return;
      var raw = (s.simplifiedRawPath && s.simplifiedRawPath.points) || (s.waypointPath && s.waypointPath.waypoints) || [];
      var pts = raw.map(function(p) { var ll = latLng(p); return ll ? { lat: ll.lat, lng: ll.lng, ts: date(p.timestamp) || st } : null; }).filter(Boolean);
      var a = latLng(s.startLocation), b = latLng(s.endLocation);
      if (a) pts.unshift({ lat: a.lat, lng: a.lng, ts: st });
      if (b) pts.push({ lat: b.lat, lng: b.lng, ts: en || st });
      out.push({ startTs: st, endTs: en || st, distanceKm: (num(s.distance) || 0) / 1000 || distKm(pts), points: thin(pts, 120) });
    });
    return out;
  }
  function isTimeline(j) {
    if (j && (Array.isArray(j.semanticSegments) || Array.isArray(j.timelineObjects))) return true;
    return Array.isArray(j) && j.length > 0 && j[0] && (j[0].startTime !== undefined) && (j[0].activity || j[0].visit || j[0].timelinePath);
  }

  /* ── Tabelle (CSV / Excel / JSON delle app) ───────────────────── */
  function csv(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var sep = [';', '\t', ',', '|'].map(function(c) { return [c, first.split(c).length]; }).sort(function(a, b) { return b[1] - a[1]; })[0][0];
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function(r) { return r.some(function(x) { return String(x).trim(); }); });
  }
  // La riga di intestazione è la prima con almeno 3 celle di testo (alcune app mettono titolo e VIN sopra)
  function toTable(rows) {
    var hi = 0;
    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      var txt = rows[i].filter(function(c) { return typeof c === 'string' && /[a-zà-ü]/i.test(c); }).length;
      if (txt >= 3) { hi = i; break; }
    }
    var head = rows[hi].map(function(c, k) { return String(c || '').trim() || 'Colonna ' + (k + 1); });
    var body = rows.slice(hi + 1).map(function(r) { var o = {}; head.forEach(function(k, j) { o[k] = r[j]; }); return o; });
    return { head: head, rows: body };
  }
  function flatten(o, pre, out) {
    out = out || {};
    Object.keys(o || {}).forEach(function(k) {
      var v = o[k], key = pre ? pre + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
      else if (!Array.isArray(v)) out[key] = v;
    });
    return out;
  }
  // JSON generico: l'array di oggetti più lungo (es. .myp di MyPeugeot, export di altre app)
  function jsonTable(j) {
    var best = null;
    (function walk(x, depth) {
      if (depth > 5 || !x || typeof x !== 'object') return;
      if (Array.isArray(x)) {
        if (x.length && typeof x[0] === 'object' && !Array.isArray(x[0]) && (!best || x.length > best.length)) best = x;
        x.slice(0, 3).forEach(function(y) { walk(y, depth + 1); });
      } else Object.keys(x).forEach(function(k) { walk(x[k], depth + 1); });
    })(j, 0);
    if (!best) return null;
    var rows = best.map(function(o) { return flatten(o); }), head = [];
    rows.slice(0, 50).forEach(function(r) { Object.keys(r).forEach(function(k) { if (head.indexOf(k) < 0) head.push(k); }); });
    return { head: head, rows: rows };
  }

  var DT = /data|date|ora\b|orario|time|heure|datum|zeit/i;
  var ODO = /odomet|contachilom|[ck]ilometraggio|mileage|kilom[ée]trage|km.?stand/i, INI = /inizi|start|d[ée]but|begin|partenza|initial/i;
  // Campi riconosciuti e parole chiave delle intestazioni (IT / EN / FR / DE)
  var FIELDS = [
    { k: 'start',   nome: 'Data / ora inizio',          re: /^(data|date|datum)$|inizio|partenza.*(data|ora)|start.*(date|time)?|d[ée]part|d[ée]but|begin|^giorno|^day/i },
    { k: 'end',     nome: 'Data / ora fine',            re: /fine|arrivo.*(data|ora)|(data|ora).*arrivo|end.*(date|time)|arriv[ée]e.*(date|heure)|^fin\b|ende/i },
    { k: 'km',      nome: 'Distanza (km)',              re: /dist|percors|tragitto|trip.?km|strecke|^km$|kilom[eè]tres? parcour/i },
    { k: 'odoStart',nome: 'Contachilometri inizio',     re: { test: function(c) { return ODO.test(c) && INI.test(c); } } },
    { k: 'odoEnd',  nome: 'Contachilometri fine',       re: { test: function(c) { return ODO.test(c) && !INI.test(c); } } },
    { k: 'dur',     nome: 'Durata',                     re: /durat|duration|dur[ée]e|dauer|tempo/i },
    { k: 'cons',    nome: 'Consumo medio (l o kWh/100 km)', re: /consum|conso|verbrauch|l\/100|kwh\/100|fuel.?econ|efficien/i },
    { k: 'litri',   nome: 'Carburante usato (litri)',   re: /litri|litres?|liters?|carburante.*(usat|consumat)|fuel.?used|carburant.*consomm|kraftstoff/i },
    { k: 'vel',     nome: 'Velocità media',             re: /veloc|speed|vitesse|geschwind/i },
    { k: 'from',    nome: 'Partenza (luogo)',           re: { test: function(c) { return /partenza|origine|^from|start.*(addr|luogo|posiz|place|location)|adresse.*d[ée]part|^d[ée]part$/i.test(c) && !DT.test(c); } } },
    { k: 'to',      nome: 'Arrivo (luogo)',             re: { test: function(c) { return /arrivo|destinaz|^to$|end.*(addr|luogo|posiz|place|location)|adresse.*arriv|^arriv[ée]e$/i.test(c) && !DT.test(c); } } }
  ];
  function guess(head, rows) {
    var map = {}, used = {};
    // prima i campi più specifici, così "contachilometri" non finisce in "distanza"
    ['odoStart', 'odoEnd', 'litri', 'cons', 'vel', 'dur', 'from', 'to', 'end', 'start', 'km'].forEach(function(k) {
      var f = FIELDS.filter(function(x) { return x.k === k; })[0];
      var col = head.filter(function(c) { return !used[c] && f.re.test(c); })[0];
      if (col) { map[k] = col; used[col] = 1; }
    });
    // distanza non trovata ma c'è "km" in qualche intestazione libera
    if (!map.km) { var c = head.filter(function(x) { return !used[x] && /\bkm\b/i.test(x) && !/\/h|h\b/i.test(x); })[0]; if (c) map.km = c; }
    // data: una colonna i cui valori sembrano date
    if (!map.start) { var d = head.filter(function(x) { return !used[x] && rows.slice(0, 5).every(function(r) { return r[x] == null || r[x] === '' || date(r[x]); }) && rows.some(function(r) { return typeof r[x] !== 'number' && date(r[x]); }); })[0]; if (d) map.start = d; }
    return map;
  }
  function rowsToTrips(tab, map) {
    var out = [];
    tab.rows.forEach(function(r) {
      var st = map.start ? date(r[map.start]) : null;
      var km = map.km ? num(r[map.km]) : null;
      var o1 = map.odoStart ? num(r[map.odoStart]) : null, o2 = map.odoEnd ? num(r[map.odoEnd]) : null;
      if ((km == null || km <= 0) && o1 != null && o2 != null && o2 > o1) km = o2 - o1;
      if (!st || !km || km <= 0 || km > 5000) return;
      var en = map.end ? date(r[map.end]) : null;
      var dm = map.dur ? durMin(r[map.dur]) : null;
      if (!en && dm) en = st + dm * 60000;
      // l'ora di fine a volte è solo "hh:mm": la si attacca alla data di inizio
      if (!en && map.end && /^\d{1,2}:\d{2}/.test(String(r[map.end]))) { var p = String(r[map.end]).split(':'); var d0 = new Date(st); d0.setHours(+p[0], +p[1], 0, 0); en = d0.getTime(); if (en < st) en += 86400000; }
      var cons = map.cons ? num(r[map.cons]) : null, litri = map.litri ? num(r[map.litri]) : null;
      if (cons != null && (cons <= 0 || cons > 60)) cons = null;
      if (cons == null && litri && km) cons = litri / km * 100;
      if (litri == null && cons && km) litri = cons * km / 100;
      var ms = en && en > st ? en - st : 0, vel = map.vel ? num(r[map.vel]) : null;
      out.push({ startTs: st, endTs: en || st, elapsedMs: ms, distanceKm: km,
        avgKmh: vel || (ms ? km / (ms / 3600000) : 0), consumo: cons, litri: litri, odoEnd: o2,
        from: map.from ? String(r[map.from] || '').trim() : '', to: map.to ? String(r[map.to] || '').trim() : '' });
    });
    return out;
  }

  /* ── Lettura file ─────────────────────────────────────────────── */
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function(ok, ko) {
      var s = document.createElement('script'); s.src = XLSX_URL; s.async = true;
      s.onload = function() { ok(window.XLSX); }; s.onerror = function() { ko(new Error('Lettore Excel non raggiungibile (serve la connessione)')); };
      document.head.appendChild(s);
    });
  }
  function readFile(file) {
    var name = file.name.toLowerCase();
    if (/\.(xlsx|xls|ods)$/.test(name)) {
      return Promise.all([loadXLSX(), file.arrayBuffer()]).then(function(r) {
        var wb = r[0].read(r[1], { type: 'array', cellDates: true });
        var best = null;
        wb.SheetNames.forEach(function(n) {
          var rows = r[0].utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' });
          if (!best || rows.length > best.length) best = rows;
        });
        return { kind: 'table', tab: toTable(best || [[]]) };
      });
    }
    return file.text().then(function(t) {
      var s = t.trim();
      if (s[0] === '{' || s[0] === '[') {
        var j; try { j = JSON.parse(s); } catch (e) { throw new Error('Il file sembra JSON ma non si riesce a leggere'); }
        if (isTimeline(j)) return { kind: 'timeline', json: j };
        var tab = jsonTable(j);
        if (!tab) throw new Error('Nel file non ci sono elenchi di viaggi riconoscibili');
        return { kind: 'table', tab: tab };
      }
      return { kind: 'table', tab: toTable(csv(t)) };
    });
  }

  /* ── Salvataggio ──────────────────────────────────────────────── */
  function importTrips(trips, vehicleId, source) {
    var v = garage().filter(function(x) { return x.id === vehicleId; })[0];
    var all = load(), seen = {}, added = 0, dup = 0, maxOdo = 0;
    all.forEach(function(r) { seen[r.vehicleId + '|' + Math.round((r.startTs || 0) / 60000) + '|' + Math.round((r.distanceKm || 0) * 10)] = 1; });
    trips.forEach(function(t) {
      var key = vehicleId + '|' + Math.round(t.startTs / 60000) + '|' + Math.round(t.distanceKm * 10);
      if (seen[key]) { dup++; return; }
      seen[key] = 1; added++;
      if (t.odoEnd > maxOdo) maxOdo = t.odoEnd;
      var ms = t.elapsedMs || Math.max(0, (t.endTs || t.startTs) - t.startTs);
      all.push({
        id: uid(), source: source, vehicleId: vehicleId, vehicleName: vName(v), vehicleType: v ? v.type : null,
        startTs: t.startTs, endTs: t.endTs || t.startTs, elapsedMs: ms, distanceKm: Math.round(t.distanceKm * 100) / 100,
        avgKmh: t.avgKmh || (ms ? t.distanceKm / (ms / 3600000) : 0), maxKmh: 0,
        consumo: t.consumo != null ? Math.round(t.consumo * 100) / 100 : null,
        litri: t.litri != null ? Math.round(t.litri * 100) / 100 : null,
        odoEnd: t.odoEnd || null, from: t.from || '', to: t.to || '',
        points: t.points || [], title: t.from && t.to ? t.from + ' → ' + t.to : ''
      });
    });
    save(all);
    // contachilometri del veicolo aggiornato se il resoconto ne riporta uno più alto
    var kmAgg = false;
    if (v && maxOdo > (v.kmTot || 0) && window.hubGarage.update) { window.hubGarage.update(v.id, { kmTot: Math.round(maxOdo) }); kmAgg = true; }
    return { added: added, dup: dup, km: kmAgg ? Math.round(maxOdo) : null };
  }

  // Consumo dai viaggi importati, media pesata sui km (usata da Consumi)
  window.hubTripStats = function(vehicleId) {
    var km = 0, l = 0, n = 0, tot = 0, last = 0;
    load().forEach(function(r) {
      if (r.vehicleId !== vehicleId) return;
      tot += r.distanceKm || 0;
      if (r.consumo == null || !r.distanceKm) return;
      km += r.distanceKm; l += r.litri != null ? r.litri : r.consumo * r.distanceKm / 100; n++;
      last = Math.max(last, r.startTs || 0);
    });
    return { viaggi: n, km: km, kmTotali: tot, litri: l, consumo: km > 0 ? l / km * 100 : null, ultimo: last || null };
  };

  /* ── Interfaccia ──────────────────────────────────────────────── */
  var S = { file: null, data: null, map: {}, trips: [] };

  function sheet() {
    var el = document.getElementById('vi-sheet');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'vi-sheet'; el.className = 'vi-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'vi-title');
    el.addEventListener('click', function(e) { if (e.target === el) window.closeViaggiImport(); });
    el.innerHTML = '<div class="vi-card"><div class="vi-hdr"><h3 id="vi-title">Importa viaggi</h3>' +
      '<button class="gar-close" onclick="closeViaggiImport()">✕</button></div><div class="vi-body" id="vi-body"></div></div>';
    document.body.appendChild(el);
    return el;
  }
  function vehicleSelect() {
    var g = garage(), act = window.hubGarage && window.hubGarage.activeId && window.hubGarage.activeId();
    if (!g.length) return '<p class="vi-warn">Prima aggiungi un veicolo nel Garage.</p>';
    return '<label class="vi-lbl" for="vi-veh">Veicolo</label><select id="vi-veh" class="vi-in">' +
      g.map(function(v) { return '<option value="' + h(v.id) + '"' + (v.id === act ? ' selected' : '') + '>' + h(vName(v)) + '</option>'; }).join('') + '</select>';
  }
  function step1() {
    S = { file: null, data: null, map: {}, trips: [] };
    document.getElementById('vi-body').innerHTML =
      vehicleSelect() +
      '<label class="vi-drop" for="vi-file"><b>Scegli il file</b><span>Excel, CSV o JSON delle app auto · Timeline.json di Google Maps</span>' +
        '<input type="file" id="vi-file" accept=".json,.csv,.txt,.xlsx,.xls,.ods,.myp" onchange="_viFile(this.files[0])"></label>' +
      '<p class="vi-err" id="vi-err" role="alert"></p>' +
      '<details class="vi-help"><summary>Come esportare da Google Maps</summary>' +
        '<p>La cronologia ora resta sul telefono, quindi si esporta da lì: app <b>Google Maps</b> → foto del profilo → <b>Cronologia</b> → ⋮ → <b>Impostazioni e privacy</b> → <b>Esporta dati della cronologia</b>. Ottieni un file <i>Timeline.json</i>: caricalo qui.</p>' +
        '<p>Vengono presi solo gli spostamenti che Google ha classificato <i>in auto</i> o <i>in moto</i>. Google non sa con quale veicolo eri, quindi scegli il veicolo e il periodo.</p>' +
        '<p>Non è possibile leggere in diretta i percorsi impostati su Google Maps o Android Auto/CarPlay: Google non li rende disponibili ad altre app. Per registrare un giro mentre guidi usa <b>Ride</b>.</p></details>' +
      '<details class="vi-help"><summary>Come esportare da MyPeugeot e app simili</summary>' +
        '<p>Nell\'app <b>MyPeugeot</b> (e MyCitroën, MyOpel, MyDS): sezione <b>Viaggi</b> → seleziona i viaggi → <b>Esporta</b>. Carica qui il file ottenuto (Excel, CSV o il file .myp).</p>' +
        '<p>Va bene anche l\'export di altre app (FordPass, Kia/Hyundai, Toyota, BMW, Tesla e app OBD come Car Scanner o Torque): le colonne vengono riconosciute da sole e puoi correggerle prima di importare.</p></details>';
  }
  window._viFile = function(file) {
    if (!file) return;
    var err = document.getElementById('vi-err'); err.textContent = '';
    S.file = file;
    S.vehicle = (document.getElementById('vi-veh') || {}).value;
    document.getElementById('vi-body').insertAdjacentHTML('beforeend', '<p class="vi-wait" id="vi-wait">Leggo ' + h(file.name) + '…</p>');
    readFile(file).then(function(d) {
      S.data = d;
      if (d.kind === 'timeline') stepTimeline(); else { S.map = guess(d.tab.head, d.tab.rows); stepTable(); }
    }).catch(function(e) {
      var w = document.getElementById('vi-wait'); if (w) w.remove();
      document.getElementById('vi-err').textContent = e.message || String(e);
    });
  };
  function fmtD(ts) { var d = new Date(ts); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function preview(trips) {
    if (!trips.length) return '<p class="vi-warn">Nessun viaggio valido con questi criteri.</p>';
    var km = trips.reduce(function(s, t) { return s + t.distanceKm; }, 0), wc = trips.filter(function(t) { return t.consumo != null; });
    return '<p class="vi-sum"><b>' + trips.length + '</b> ' + (trips.length === 1 ? 'viaggio' : 'viaggi') + ' · <b>' + Math.round(km).toLocaleString('it-IT') + '</b> km' +
      (wc.length ? ' · consumo su ' + wc.length + ' viaggi' : '') + '</p>' +
      '<div class="vi-prev"><table><thead><tr><th>Inizio</th><th>Km</th><th>Durata</th><th>Consumo</th></tr></thead><tbody>' +
      trips.slice(0, 6).map(function(t) {
        var m = t.elapsedMs ? Math.round(t.elapsedMs / 60000) : 0;
        return '<tr><td>' + fmtD(t.startTs) + '</td><td>' + t.distanceKm.toFixed(1) + '</td><td>' + (m ? (m >= 60 ? Math.floor(m / 60) + 'h ' : '') + (m % 60) + 'm' : '—') + '</td><td>' + (t.consumo != null ? t.consumo.toFixed(1) : '—') + '</td></tr>';
      }).join('') + '</tbody></table>' + (trips.length > 6 ? '<small>… e altri ' + (trips.length - 6) + '</small>' : '') + '</div>';
  }
  function actions(n) {
    return '<div class="vi-act"><button type="button" class="vi-btn2" onclick="_viRestart()">Altro file</button>' +
      '<button type="button" class="vi-btn"' + (n ? '' : ' disabled') + ' onclick="_viSave()">' + (n ? 'Importa ' + n + (n === 1 ? ' viaggio' : ' viaggi') : 'Importa') + '</button></div>';
  }
  function stepTimeline() {
    var since = new Date(); since.setFullYear(since.getFullYear() - 1);
    var v = garage().filter(function(x) { return x.id === S.vehicle; })[0];
    if (v && v.specs && v.specs.acqDate) since = new Date(v.specs.acqDate);
    S.since = since.toISOString().slice(0, 10);
    renderTimeline();
  }
  function renderTimeline() {
    S.trips = timeline(S.data.json, { since: date(S.since + 'T00:00') }).filter(function(t) { return t.distanceKm >= (S.minKm || 1); });
    S.source = 'timeline';
    document.getElementById('vi-body').innerHTML =
      '<p class="vi-kind">📍 Cronologia di Google Maps</p>' +
      '<div class="vi-row"><div><label class="vi-lbl" for="vi-since">Dal giorno</label><input class="vi-in" type="date" id="vi-since" value="' + S.since + '" onchange="_viSince(this.value)"></div>' +
      '<div><label class="vi-lbl" for="vi-min">Scarta sotto i km</label><input class="vi-in" type="number" id="vi-min" min="0" step="0.5" value="' + (S.minKm || 1) + '" onchange="_viMin(this.value)"></div></div>' +
      '<p class="vi-note">Spostamenti in auto o moto secondo Google, senza consumi: quelli li calcola il riquadro Consumi dai rifornimenti. Controlla le date: se in quei giorni hai usato un altro mezzo, alzane la data di inizio.</p>' +
      preview(S.trips) + actions(S.trips.length);
  }
  window._viSince = function(v) { S.since = v; renderTimeline(); };
  window._viMin = function(v) { S.minKm = num(v) || 0; renderTimeline(); };
  function stepTable() {
    var tab = S.data.tab;
    S.trips = rowsToTrips(tab, S.map);
    S.source = 'import';
    var opts = function(k) {
      return '<option value="">— nessuna —</option>' + tab.head.map(function(c) { return '<option' + (S.map[k] === c ? ' selected' : '') + '>' + h(c) + '</option>'; }).join('');
    };
    var ok = S.map.start && (S.map.km || (S.map.odoStart && S.map.odoEnd));
    document.getElementById('vi-body').innerHTML =
      '<p class="vi-kind">📄 ' + h(S.file.name) + ' · ' + tab.rows.length + ' righe</p>' +
      (ok ? '' : '<p class="vi-warn">Servono almeno la data e la distanza (o i due contachilometri): indicale qui sotto.</p>') +
      '<details class="vi-map"' + (ok ? '' : ' open') + '><summary>Colonne riconosciute</summary>' +
        FIELDS.map(function(f) {
          return '<div class="vi-maprow"><label for="vi-m-' + f.k + '">' + f.nome + '</label><select id="vi-m-' + f.k + '" class="vi-in" onchange="_viMap(\'' + f.k + '\', this.value)">' + opts(f.k) + '</select></div>';
        }).join('') + '</details>' +
      preview(S.trips) +
      (S.trips.some(function(t) { return t.odoEnd; }) ? '<p class="vi-note">Il contachilometri del veicolo verrà aggiornato se il file ne riporta uno più alto.</p>' : '') +
      actions(S.trips.length);
  }
  window._viMap = function(k, col) { if (col) S.map[k] = col; else delete S.map[k]; stepTable(); };
  window._viRestart = function() { step1(); };
  window._viSave = function() {
    if (!S.trips.length || !S.vehicle) return;
    var r = importTrips(S.trips, S.vehicle, S.source);
    var ts = window.hubTripStats(S.vehicle);
    document.getElementById('vi-body').innerHTML =
      '<p class="vi-done">✓ ' + (r.added === 1 ? 'Importato <b>1</b> viaggio' : 'Importati <b>' + r.added + '</b> viaggi') + (r.dup ? ' · ' + r.dup + ' già presenti, saltati' : '') + '.</p>' +
      (ts.consumo != null ? '<p class="vi-sum">Consumo medio dai viaggi: <b>' + ts.consumo.toFixed(1) + '</b> su ' + Math.round(ts.km).toLocaleString('it-IT') + ' km. Lo trovi in Consumi e nel Costo di possesso.</p>' : '') +
      (r.km ? '<p class="vi-sum">Contachilometri aggiornato a <b>' + r.km.toLocaleString('it-IT') + ' km</b>.</p>' : '') +
      '<div class="vi-act"><button type="button" class="vi-btn2" onclick="_viRestart()">Importa un altro file</button><button type="button" class="vi-btn" onclick="closeViaggiImport()">Fatto</button></div>';
    if (window._hubRideLogRender) window._hubRideLogRender();
    if (window._hubRefreshRideLogBadge) window._hubRefreshRideLogBadge();
    if (window._hubRefreshFuelLogBadge) window._hubRefreshFuelLogBadge();
    if (window._hubRefreshTCOBadge) window._hubRefreshTCOBadge();
  };

  window.openViaggiImport = function() {
    var el = sheet(); step1(); el.classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeViaggiImport = function() {
    var el = document.getElementById('vi-sheet'); if (el) el.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  // per i test
  window._viInternals = { csv: csv, toTable: toTable, guess: guess, rowsToTrips: rowsToTrips, timeline: timeline, jsonTable: jsonTable, num: num, date: date, durMin: durMin };
})();
