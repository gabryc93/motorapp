/* ═══════════════════════════════════════════════════════════════════
   HUB RIDE ANALISI — calcoli comuni a Ride e Diario uscite
   window.hubRideAnalisi = { dist, semplifica, velocita, curve, dislivello,
     passi, costo, profiloSVG, mappa, fmtLap }
   Punti traccia: { lat, lng, ts, v (km/h, facoltativo), a (m, facoltativo) }
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var G = 9.81, RAD = Math.PI / 180;

  function dist(a, b) {
    var dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD);
    return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  // coordinate piane locali in metri (x = est, y = nord) attorno a un'origine
  function xy(o, p) { return { x: (p.lng - o.lng) * RAD * 6371000 * Math.cos(o.lat * RAD), y: (p.lat - o.lat) * RAD * 6371000 }; }

  // Velocità di ogni punto: quella del GPS se c'è, altrimenti dai vicini
  function velocita(pts) {
    return pts.map(function(p, i) {
      if (p.v != null && !isNaN(p.v)) return p.v;
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var dt = ((b.ts || 0) - (a.ts || 0)) / 1000;
      return dt > 0 ? dist(a, b) / dt * 3.6 : 0;
    });
  }

  // Douglas-Peucker con tolleranza crescente fino a stare sotto maxN punti
  function semplifica(pts, maxN) {
    if (!pts || pts.length <= maxN) return (pts || []).map(pack);
    var tol = 2, keep;
    do {
      keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
      var stack = [[0, pts.length - 1]];
      while (stack.length) {
        var s = stack.pop(), i0 = s[0], i1 = s[1], o = pts[i0], B = xy(o, pts[i1]), L2 = B.x * B.x + B.y * B.y, best = -1, bi = -1;
        for (var i = i0 + 1; i < i1; i++) {
          var P = xy(o, pts[i]), d;
          if (!L2) d = Math.hypot(P.x, P.y);
          else { var t = Math.max(0, Math.min(1, (P.x * B.x + P.y * B.y) / L2)); d = Math.hypot(P.x - t * B.x, P.y - t * B.y); }
          if (d > best) { best = d; bi = i; }
        }
        if (best > tol) { keep[bi] = 1; stack.push([i0, bi], [bi, i1]); }
      }
      var n = 0; for (var k = 0; k < keep.length; k++) n += keep[k];
      tol *= 1.6;
    } while (n > maxN);
    return pts.filter(function(_, i) { return keep[i]; }).map(pack);
  }
  function pack(p) {
    var o = { lat: +(+p.lat).toFixed(5), lng: +(+p.lng).toFixed(5), ts: p.ts };
    var v = p.v != null ? p.v : p.kmh;
    if (v != null && !isNaN(v)) o.v = Math.round(v);
    var a = p.a != null ? p.a : p.alt;
    if (a != null && !isNaN(a)) o.a = Math.round(a);
    return o;
  }

  // Curve: raggio dal cerchio per tre punti (distanti almeno 15 m) e velocità.
  // Piega teorica della moto = atan(v² / (R·g)), accelerazione laterale = v² / R.
  // È quella "fisica" della curva: la piega reale cambia con la posizione del pilota.
  function curve(pts) {
    var out = { leanSx: 0, leanDx: 0, gLat: 0, serie: [] };
    if (!pts || pts.length < 3) return out;
    var vel = velocita(pts), raw = [];
    for (var i = 1; i < pts.length - 1; i++) {
      var j = i - 1, k = i + 1;
      while (j > 0 && dist(pts[j], pts[i]) < 15) j--;
      while (k < pts.length - 1 && dist(pts[i], pts[k]) < 15) k++;
      var p0 = pts[j], p1 = pts[i], p2 = pts[k];
      if (dist(p0, p1) < 15 || dist(p1, p2) < 15 || (p2.ts - p0.ts) > 9000 || (p2.ts - p0.ts) <= 0) { raw.push(null); continue; }
      var A = xy(p1, p0), C = xy(p1, p2);
      var a = Math.hypot(A.x, A.y), c = Math.hypot(C.x, C.y), b = Math.hypot(C.x - A.x, C.y - A.y);
      var cross = (0 - A.x) * (C.y - 0) - (0 - A.y) * (C.x - 0);  // (p1-p0) × (p2-p1)
      var area2 = Math.abs(cross);
      if (area2 < 1e-6) { raw.push(0); continue; }
      var R = a * b * c / (2 * area2), v = vel[i] / 3.6;
      if (R < 8 || vel[i] < 25) { raw.push(0); continue; }
      var acc = v * v / R;
      raw.push((cross > 0 ? 1 : -1) * acc);   // + = sinistra
    }
    // mediana su 3 valori: un singolo punto GPS storto non fa record
    for (var m = 0; m < raw.length; m++) {
      var w = [raw[m - 1], raw[m], raw[m + 1]].filter(function(x) { return x != null; });
      if (w.length < 3) { out.serie.push(0); continue; }
      w.sort(function(x, y) { return x - y; });
      var accLat = w[1], lean = Math.min(58, Math.atan(Math.abs(accLat) / G) / RAD), g = Math.min(1.5, Math.abs(accLat) / G);
      out.serie.push(accLat > 0 ? lean : -lean);
      if (accLat > 0 && lean > out.leanSx) out.leanSx = lean;
      if (accLat < 0 && lean > out.leanDx) out.leanDx = lean;
      if (g > out.gLat) out.gLat = g;
    }
    out.leanSx = Math.round(out.leanSx); out.leanDx = Math.round(out.leanDx); out.gLat = Math.round(out.gLat * 100) / 100;
    return out;
  }

  // Dislivello con isteresi di 5 m: il rumore della quota GPS non si somma
  function dislivello(pts) {
    var alt = (pts || []).map(function(p) { return p.a != null ? p.a : p.alt; }).filter(function(a) { return a != null && !isNaN(a); });
    if (alt.length < 5 || alt.length < pts.length / 2) return null;
    var su = 0, giu = 0, ref = alt[0], min = alt[0], max = alt[0];
    alt.forEach(function(a) {
      if (a < min) min = a; if (a > max) max = a;
      if (a - ref >= 5) { su += a - ref; ref = a; } else if (ref - a >= 5) { giu += ref - a; ref = a; }
    });
    return { su: Math.round(su), giu: Math.round(giu), min: Math.round(min), max: Math.round(max) };
  }

  // Passi attraversati: entro 400 m da un punto della traccia
  function passi(pts) {
    var P = window._psInternals && window._psInternals.PASSES;
    if (!P || !pts || !pts.length) return [];
    var lats = pts.map(function(p) { return p.lat; }), lngs = pts.map(function(p) { return p.lng; });
    var b = { s: Math.min.apply(null, lats) - .01, n: Math.max.apply(null, lats) + .01, w: Math.min.apply(null, lngs) - .015, e: Math.max.apply(null, lngs) + .015 };
    return P.filter(function(p) {
      if (p.lat < b.s || p.lat > b.n || p.lng < b.w || p.lng > b.e) return false;
      for (var i = 0; i < pts.length; i++) if (dist(p, pts[i]) < 400) return true;
      return false;
    }).map(function(p) { return { id: p.id, name: p.name, alt: p.alt }; });
  }

  // Costo carburante stimato: consumo medio del veicolo × prezzo al litro
  function costo(vehicleId, km) {
    if (!vehicleId || !km || typeof window.hubConsumoPrezzo !== 'function') return null;
    var v = window.hubGarage && window.hubGarage.list().filter(function(x) { return x.id === vehicleId; })[0];
    // plug-in ed elettriche: costo reale dell'energia al km (carburante + ricariche)
    var E = v && window.hubEnergia && window.hubEnergia(v);
    if (E) return { litri: null, eur: km * E.eurKm, cons: null, prezzo: null, eurKm: E.eurKm, src: 'costo medio dell\'energia (rifornimenti e ricariche)' };
    var cp = v && window.hubConsumoPrezzo(v);
    if (!cp) return null;
    var litri = km * cp.cons / 100;
    return { litri: litri, eur: litri * cp.eur, cons: cp.cons, prezzo: cp.eur, src: cp.src };
  }

  function fmtLap(ms) {
    if (ms == null) return '—';
    var s = ms / 1000, m = Math.floor(s / 60), r = s - m * 60;
    return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2);
  }

  // Profilo: quota (area) e velocità (linea) sulla distanza
  function profiloSVG(pts, w, h) {
    if (!pts || pts.length < 3) return '';
    var vel = velocita(pts), d = [0];
    for (var i = 1; i < pts.length; i++) d.push(d[i - 1] + dist(pts[i - 1], pts[i]));
    var D = d[d.length - 1] || 1, vMax = Math.max.apply(null, vel.concat([1]));
    var alt = pts.map(function(p) { return p.a; }), hasAlt = alt.filter(function(a) { return a != null; }).length > pts.length / 2;
    var X = function(i) { return (d[i] / D * w).toFixed(1); };
    var out = '<svg class="rda-prof" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Profilo di quota e velocità">';
    if (hasAlt) {
      var av = alt.filter(function(a) { return a != null; }), aMin = Math.min.apply(null, av), aMax = Math.max.apply(null, av), aR = Math.max(30, aMax - aMin);
      var last = av[0], path = 'M0 ' + h;
      pts.forEach(function(p, i) { if (p.a != null) last = p.a; path += ' L' + X(i) + ' ' + (h - 4 - (last - aMin) / aR * (h * .75)).toFixed(1); });
      out += '<path d="' + path + ' L' + w + ' ' + h + 'Z" fill="rgba(140,160,190,.25)" stroke="rgba(140,160,190,.6)" stroke-width="1"/>';
    }
    out += '<polyline fill="none" stroke="#ff5a28" stroke-width="1.6" stroke-linejoin="round" points="' +
      vel.map(function(v, i) { return X(i) + ',' + (h - 4 - v / vMax * (h - 10)).toFixed(1); }).join(' ') + '"/></svg>';
    return out;
  }

  // Mappa Leaflet con la traccia colorata per velocità
  var COL = [[50, '#3fbf7f'], [90, '#e8c547'], [130, '#ff8a3d'], [1e9, '#e5484d']];
  function colore(v) { for (var i = 0; i < COL.length; i++) if (v < COL[i][0]) return COL[i][1]; return COL[3][1]; }
  function mappa(el, pts) {
    if (typeof L === 'undefined' || !el || !pts || pts.length < 2) return null;
    var m = L.map(el, { zoomControl: false, attributionControl: true });
    if (typeof addBasemap === 'function') addBasemap(m); else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m);
    var vel = velocita(pts);
    for (var i = 1; i < pts.length; i++) {
      L.polyline([[pts[i - 1].lat, pts[i - 1].lng], [pts[i].lat, pts[i].lng]], { color: colore((vel[i - 1] + vel[i]) / 2), weight: 4, opacity: .95 }).addTo(m);
    }
    L.circleMarker([pts[0].lat, pts[0].lng], { radius: 5, color: '#111', fillColor: '#6dd9a3', fillOpacity: 1, weight: 2 }).addTo(m);
    var e = pts[pts.length - 1];
    L.circleMarker([e.lat, e.lng], { radius: 5, color: '#111', fillColor: '#ff8a82', fillOpacity: 1, weight: 2 }).addTo(m);
    m.fitBounds(L.latLngBounds(pts.map(function(p) { return [p.lat, p.lng]; })), { padding: [14, 14] });
    return m;
  }

  window.hubRideAnalisi = { dist: dist, xy: xy, semplifica: semplifica, velocita: velocita, curve: curve, dislivello: dislivello,
    passi: passi, costo: costo, profiloSVG: profiloSVG, mappa: mappa, colore: colore, fmtLap: fmtLap };
})();
