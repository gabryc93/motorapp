/* ═══════════════════════════════════════════════════════════════════
   HUB GIRO — "Giro della domenica": anelli in auto della durata scelta
   1. 8 direzioni attorno alla partenza: quota e rilievo dei punti di ogni
      triangolo (Open-Meteo elevation, una chiamata) → dove ci sono colline
   2. Con "Passi": anelli che passano da un passo aperto raggiungibile
   3. Percorso OSRM senza autostrade, ricalibrato sulla durata
   4. Per ogni proposta: curve (°/km), dislivello, passi, meteo all'ora
      di passaggio; mappa, Google Maps e GPX
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var RAD = Math.PI / 180, PREF = 'hub_giro_pref_v1';
  var DIR = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ovest', 'Ovest', 'Nord-Ovest'];
  var COL = ['#ff7a45', '#5b9bd5', '#c97fd4'];
  function dist(a, b) {
    var dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD);
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function dest(p, brg, km) {   // punto a "km" in direzione "brg" (gradi)
    var d = km / 6371, b = brg * RAD, la = p.lat * RAD, lo = p.lng * RAD;
    var la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    var lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    return { lat: +(la2 / RAD).toFixed(5), lng: +(lo2 / RAD).toFixed(5) };
  }
  function bearing(a, b) {
    var y = Math.sin((b.lng - a.lng) * RAD) * Math.cos(b.lat * RAD);
    var x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lng - a.lng) * RAD);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  var S = { ore: 3, stile: 'curve', quando: 'oggi', ora: '09:00', res: null, map: null };

  /* ── Interfaccia ──────────────────────────────────────────────── */
  function inject() {
    if ($('gi-overlay')) return;
    var p = jget(PREF, {}); if (p.ore) S.ore = p.ore; if (p.stile) S.stile = p.stile;
    var ov = document.createElement('div');
    ov.id = 'gi-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'gi-title');
    ov.innerHTML =
      '<div class="wp-hdr"><h2 id="gi-title">GIRO DELLA DOMENICA<small>Anelli in auto su strade belle, senza autostrade</small></h2>' +
        '<button class="gar-close" onclick="closeGiro()">✕ Chiudi</button></div>' +
      '<div class="wp-body"><form class="wp-form" onsubmit="event.preventDefault();giroCalcola()" autocomplete="off">' +
        '<div class="wp-field"><label for="gi-from">Partenza</label><input type="text" id="gi-from" placeholder="La mia posizione"><button type="button" class="wp-locate" onclick="giroQui()" aria-label="Usa la mia posizione">📍</button></div>' +
        '<div class="gi-lbl">Quanto vuoi guidare</div><div class="gi-chips" id="gi-ore">' + [1.5, 2, 3, 4, 5].map(function(h) {
          return '<button type="button" data-v="' + h + '" onclick="giroSet(\'ore\',' + h + ')">' + (h === 1.5 ? '1h30' : h + ' ore') + '</button>'; }).join('') + '</div>' +
        '<div class="gi-lbl">Che strade</div><div class="gi-chips" id="gi-stile">' +
          '<button type="button" data-v="curve" onclick="giroSet(\'stile\',\'curve\')">〰 Curve e colline</button>' +
          '<button type="button" data-v="passi" onclick="giroSet(\'stile\',\'passi\')">⛰ Con un passo</button></div>' +
        '<div class="gi-lbl">Quando</div><div class="gi-chips" id="gi-quando">' + [['oggi', 'Oggi'], ['domani', 'Domani'], ['sabato', 'Sabato'], ['domenica', 'Domenica']].map(function(q) {
          return '<button type="button" data-v="' + q[0] + '" onclick="giroSet(\'quando\',\'' + q[0] + '\')">' + q[1] + '</button>'; }).join('') +
          '<input type="time" id="gi-ora" value="09:00" aria-label="Ora di partenza"></div>' +
        '<p class="wp-err" id="gi-err" role="alert"></p>' +
        '<button class="wp-go" type="submit">Proponi 3 giri →</button>' +
      '</form><div class="wp-result" id="gi-result" aria-live="polite"></div></div>';
    document.body.appendChild(ov);
    var pos = jget('hub_oggi_pos_v1', null); if (pos && pos.nome) $('gi-from').placeholder = pos.nome + ' (la tua posizione)';
    ['ore', 'stile', 'quando'].forEach(function(k) { segna(k); });
  }
  function segna(k) { document.querySelectorAll('#gi-' + k + ' button').forEach(function(b) { b.classList.toggle('on', String(S[k]) === b.dataset.v); }); }
  window.giroSet = function(k, v) {
    S[k] = v; segna(k);
    if (k !== 'quando') jset(PREF, { ore: S.ore, stile: S.stile });
    if (k === 'quando' && v === 'oggi') { var d = new Date(Date.now() + 30 * 60000); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); $('gi-ora').value = pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  };
  window.openGiro = function() {
    inject(); $('gi-overlay').classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeGiro = function() {
    var o = $('gi-overlay'); if (o) o.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  function errore(t) { $('gi-err').textContent = t || ''; }
  window.giroQui = function() {
    if (!navigator.geolocation) { errore('Posizione non disponibile.'); return; }
    navigator.geolocation.getCurrentPosition(function(p) {
      var inp = $('gi-from'); inp.value = 'La mia posizione'; inp.dataset.lat = p.coords.latitude.toFixed(4); inp.dataset.lng = p.coords.longitude.toFixed(4);
    }, function(e) { errore('Posizione non concessa: ' + (e.message || e.code)); }, { timeout: 10000, maximumAge: 300000 });
  };
  function partenza() {
    var inp = $('gi-from'), t = inp.value.trim();
    if (inp.dataset.lat && (t === '' || t === 'La mia posizione')) return Promise.resolve({ lat: +inp.dataset.lat, lng: +inp.dataset.lng, name: 'La mia posizione' });
    if (!t) {
      var pos = jget('hub_oggi_pos_v1', null);
      if (pos) return Promise.resolve({ lat: pos.lat, lng: pos.lng, name: pos.nome || 'La mia posizione' });
      return new Promise(function(ok, ko) {
        if (!navigator.geolocation) return ko(new Error('Scrivi da dove parti.'));
        navigator.geolocation.getCurrentPosition(function(p) { ok({ lat: p.coords.latitude, lng: p.coords.longitude, name: 'La mia posizione' }); }, function() { ko(new Error('Scrivi da dove parti o consenti la posizione.')); }, { timeout: 10000 });
      });
    }
    return fetch('https://photon.komoot.io/api/?limit=1&lat=45.6&lon=10&q=' + encodeURIComponent(t)).then(function(r) { return r.json(); }).then(function(d) {
      var f = d.features && d.features[0]; if (!f) throw new Error('Località non trovata: ' + t);
      return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: t };
    });
  }
  function quandoMs() {
    var d = new Date(), hm = ($('gi-ora').value || '09:00').split(':');
    if (S.quando === 'domani') d.setDate(d.getDate() + 1);
    if (S.quando === 'sabato') d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    if (S.quando === 'domenica') d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    d.setHours(+hm[0], +hm[1] || 0, 0, 0);
    return d.getTime();
  }

  /* ── Candidati ────────────────────────────────────────────────── */
  // triangolo partenza → W1 → W2 → partenza; con fattore strada 1,3 il giro è ~3,7 volte d
  function triangolo(s, brg, d) { return [dest(s, brg - 25, d), dest(s, brg + 25, d)]; }
  function elevazioni(points) {
    var url = 'https://api.open-meteo.com/v1/elevation?latitude=' + points.map(function(p) { return p.lat.toFixed(4); }).join(',') + '&longitude=' + points.map(function(p) { return p.lng.toFixed(4); }).join(',');
    return fetch(url).then(function(r) { if (!r.ok) throw new Error('quote non disponibili'); return r.json(); }).then(function(d) { return d.elevation || []; });
  }
  function candidati(s, ore, when) {
    var L = 55 * ore, d = L / 3.7, mese = new Date(when).getMonth() + 1, out = [];
    // passi aperti nel mese, raggiungibili nell'anello
    if (S.stile === 'passi') {
      var P = (window._psInternals && window._psInternals.PASSES) || [];
      P.filter(function(p) { var k = dist(s, p); return k > 15 && k <= L / 2.7 && !(window._psInternals.chiusoIl ? window._psInternals.chiusoIl(p, when) : p.closed && p.closed.indexOf(mese) >= 0); })
        .sort(function(a, b) { return b.alt - a.alt; }).slice(0, 3).forEach(function(p) {
          var b = bearing(s, p), k = dist(s, p);
          out.push({ tipo: 'passo', passo: p, brg: b, wp: [{ lat: p.lat, lng: p.lng }, dest(s, b + 40, k * 0.75)], score: 100 + p.alt / 100 });
        });
    }
    // 8 direzioni: 4 punti per triangolo (2 vertici + 2 punti a metà lato), quota e rilievo
    var pts = [];
    for (var i = 0; i < 8; i++) {
      var w = triangolo(s, i * 45, d);
      pts.push(w[0], w[1], dest(s, i * 45 - 25, d / 2), dest(s, i * 45 + 25, d / 2));
    }
    return elevazioni(pts).then(function(el) {
      for (var i = 0; i < 8; i++) {
        var e = el.slice(i * 4, i * 4 + 4);
        if (e.length < 4) continue;
        var mare = e.filter(function(x) { return x <= 1; }).length;   // punti in mare: direzione da scartare
        var rilievo = Math.max.apply(null, e) - Math.min.apply(null, e), media = e.reduce(function(a, b) { return a + b; }, 0) / 4;
        out.push({ tipo: 'dir', brg: i * 45, wp: triangolo(s, i * 45, d), score: rilievo * 0.06 + media * 0.02 - mare * 40, quota: Math.round(media) });
      }
      // le 3 migliori, non troppo simili tra loro (almeno 70° di differenza)
      out.sort(function(a, b) { return b.score - a.score; });
      var scelti = [];
      out.forEach(function(c) { if (scelti.length < 3 && scelti.every(function(x) { var db = Math.abs(((x.brg - c.brg) + 540) % 360 - 180); return db >= 70; })) scelti.push(c); });
      return { lista: scelti, L: L, nessunPasso: S.stile === 'passi' && !out.some(function(c) { return c.tipo === 'passo'; }) };
    });
  }

  /* ── Percorso ─────────────────────────────────────────────────── */
  function osrm(pts) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' + pts.map(function(p) { return p.lng.toFixed(5) + ',' + p.lat.toFixed(5); }).join(';') + '?overview=full&geometries=geojson&exclude=motorway';
    return fetch(url).then(function(r) {
      if (!r.ok) return fetch(url.replace('&exclude=motorway', '')).then(function(r2) { if (!r2.ok) throw new Error('percorso non disponibile'); return r2.json(); });
      return r.json();
    }).then(function(d) {
      if (!d.routes || !d.routes[0]) throw new Error('nessun percorso');
      var r = d.routes[0];
      return { coords: r.geometry.coordinates.map(function(c) { return { lat: c[1], lng: c[0] }; }), km: r.distance / 1000, s: r.duration };
    });
  }
  function giro(s, c, target) {
    return osrm([s].concat(c.wp, [s])).then(function(r) {
      if (c.tipo === 'passo' || Math.abs(r.s - target) / target < 0.25) return r;
      // troppo lungo o troppo corto: si scala la distanza dei vertici e si riprova una volta
      var k = Math.max(0.5, Math.min(1.6, target / r.s));
      c.wp = triangolo(s, c.brg, dist(s, c.wp[0]) * k);
      return osrm([s].concat(c.wp, [s]));
    });
  }
  // curve: somma dei cambi di direzione ogni 25 m, in gradi per km
  function curve(coords) {
    var pts = [coords[0]], acc = 0;
    for (var i = 1; i < coords.length; i++) { acc += dist(coords[i - 1], coords[i]); if (acc >= 0.025) { pts.push(coords[i]); acc = 0; } }
    var tot = 0, km = 0;
    for (var j = 2; j < pts.length; j++) {
      var a = bearing(pts[j - 2], pts[j - 1]), b = bearing(pts[j - 1], pts[j]), dd = Math.abs(((b - a) + 540) % 360 - 180);
      if (dd > 3 && dd < 150) tot += dd;
      km += dist(pts[j - 1], pts[j]);
    }
    return km ? tot / km : 0;
  }
  function campiona(coords, n) {
    var cum = [0]; for (var i = 1; i < coords.length; i++) cum.push(cum[i - 1] + dist(coords[i - 1], coords[i]));
    var L = cum[cum.length - 1], out = [], j = 0;
    for (var k = 0; k < n; k++) { var t = L * k / (n - 1); while (j < cum.length - 2 && cum[j + 1] < t) j++; out.push({ lat: coords[j].lat, lng: coords[j].lng, f: L ? t / L : 0 }); }
    return out;
  }
  function meteo(punti, when, durS) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + punti.map(function(p) { return p.lat.toFixed(3); }).join(',') + '&longitude=' + punti.map(function(p) { return p.lng.toFixed(3); }).join(',') +
      '&hourly=temperature_2m,precipitation,weather_code,visibility&forecast_days=16&timeformat=unixtime&timezone=auto';
    return fetch(url).then(function(r) { if (!r.ok) throw new Error('meteo'); return r.json(); }).then(function(d) {
      d = Array.isArray(d) ? d : [d];
      var av = {}, tmin = 99, tmax = -99, ok = 0;
      punti.forEach(function(p, i) {
        var h = d[i] && d[i].hourly; if (!h) return;
        var k = Math.round(((when + p.f * durS * 1000) / 1000 - h.time[0]) / 3600); if (k < 0 || k >= h.time.length) return;
        ok++;
        var t = h.temperature_2m[k], mm = h.precipitation[k] || 0, c = h.weather_code[k], vis = h.visibility ? h.visibility[k] : null;
        tmin = Math.min(tmin, t); tmax = Math.max(tmax, t);
        if ((c >= 71 && c <= 77) || c === 85 || c === 86) av['❄ neve'] = 1;
        if (t <= 1 && mm > 0) av['🧊 ghiaccio'] = 1;
        if (c >= 95) av['⛈ temporali'] = 1;
        if (mm >= 0.3) av['🌧 pioggia'] = 1;
        if (vis != null && vis < 1000) av['🌫 nebbia'] = 1;
      });
      return ok ? { av: Object.keys(av), tmin: tmin, tmax: tmax } : null;
    }).catch(function() { return null; });
  }
  function nome(p) {
    return fetch('https://photon.komoot.io/reverse?lat=' + p.lat + '&lon=' + p.lng + '&limit=1').then(function(r) { return r.json(); }).then(function(d) {
      var pr = d.features && d.features[0] && d.features[0].properties; return pr ? (pr.city || pr.town || pr.village || pr.name || '') : '';
    }).catch(function() { return ''; });
  }

  window.giroCalcola = function() {
    errore('');
    var res = $('gi-result'), when = quandoMs(), target = S.ore * 3600;
    if (when < Date.now() - 30 * 60000) { errore('L\'orario di partenza è già passato.'); return; }
    res.innerHTML = '<div class="wp-loading">Cerco le direzioni con più colline e curve…</div>';
    partenza().then(function(s) {
      return candidati(s, S.ore, when).then(function(C) {
        if (!C.lista.length) throw new Error('Nessuna direzione utile intorno alla partenza.');
        res.innerHTML = '<div class="wp-loading">Calcolo i percorsi…</div>';
        return Promise.all(C.lista.map(function(c) {
          return giro(s, c, target).then(function(r) {
            var smp = campiona(r.coords, 30);
            return Promise.all([elevazioni(smp).catch(function() { return []; }), meteo(campiona(r.coords, 5), when, r.s), nome(c.wp[0])]).then(function(x) {
              var el = x[0], su = 0, ref = el[0];
              el.forEach(function(e) { if (e - ref >= 10) { su += e - ref; ref = e; } else if (ref - e >= 10) ref = e; });
              var P = (window._psInternals && window._psInternals.PASSES) || [];
              var passi = P.filter(function(p) { return r.coords.some(function(q, i) { return i % 5 === 0 && dist(p, q) < 1; }); });
              return { c: c, r: r, curve: curve(r.coords), salita: Math.round(su), qMax: el.length ? Math.round(Math.max.apply(null, el)) : null, meteo: x[1], verso: x[2], passi: passi };
            });
          }).catch(function(e) { return { c: c, err: e.message }; });
        })).then(function(G) {
          G = G.filter(function(g) { return g.r; });
          if (!G.length) throw new Error('Il servizio dei percorsi non risponde: riprova tra poco.');
          G.sort(function(a, b) { return (b.c.tipo === 'passo') - (a.c.tipo === 'passo') || b.curve - a.curve; });
          S.res = { s: s, G: G, when: when, nessunPasso: C.nessunPasso };
          render();
        });
      });
    }).catch(function(e) { res.innerHTML = '<div class="wp-error">' + esc(e.message || String(e)) + '</div>'; });
  };

  /* ── Risultato ────────────────────────────────────────────────── */
  function pallini(c) { var n = c < 40 ? 1 : c < 70 ? 2 : c < 110 ? 3 : c < 160 ? 4 : 5; return '●●●●●'.slice(0, n) + '<span>' + '●●●●●'.slice(n) + '</span>'; }
  function render() {
    var R = S.res, res = $('gi-result');
    var html = (R.nessunPasso ? '<div class="wp-al wp-al-info">⛰ Nessun passo aperto raggiungibile in ' + (S.ore === 1.5 ? '1h30' : S.ore + ' ore') + ' da qui in questo periodo: ti propongo i giri con più colline.</div>' : '') +
      '<div class="wp-map gi-map" id="gi-map" aria-label="Mappa dei giri proposti"></div>';
    html += R.G.map(function(g, i) {
      var mm = Math.round(g.r.s / 60), h = Math.floor(mm / 60), m = mm % 60;
      var titolo = g.c.tipo === 'passo' ? 'Via ' + g.c.passo.name : 'Verso ' + DIR[Math.round(g.c.brg / 45) % 8] + (g.verso ? ' · ' + g.verso : '');
      var mt = g.meteo ? (g.meteo.av.length ? '<span class="gi-bad">' + esc(g.meteo.av.join(' · ')) + '</span>' : '<span class="gi-good">asciutto</span>') + ' · ' + Math.round(g.meteo.tmin) + '–' + Math.round(g.meteo.tmax) + '°' : 'meteo non disponibile';
      return '<div class="gi-card" style="--c:' + COL[i] + '"><div class="gi-card-h"><b>' + esc(titolo) + '</b><span>' + Math.round(g.r.km) + ' km · ' + (h ? h + 'h ' : '') + m + 'm</span></div>' +
        '<div class="gi-meta"><span>Curve <i class="gi-dots">' + pallini(g.curve) + '</i></span><span>▲ ' + g.salita.toLocaleString('it-IT') + ' m' + (g.qMax ? ' · max ' + g.qMax.toLocaleString('it-IT') + ' m' : '') + '</span></div>' +
        (g.passi.length ? '<div class="gi-passi">⛰ ' + esc(g.passi.map(function(p) { return p.name; }).join(' · ')) + '</div>' : '') +
        '<div class="gi-meteo">' + hhmm(R.when) + ' → ' + hhmm(R.when + g.r.s * 1000) + ' · ' + mt + '</div>' +
        '<div class="gi-zone" id="gi-zone-' + i + '"></div>' +
        '<div class="gi-act"><a class="gi-btn" href="' + gmaps(R.s, g) + '" target="_blank" rel="noopener">Apri in Google Maps ↗</a><button type="button" class="gi-btn gi-ghost" onclick="giroGpx(' + i + ')">⬇ GPX</button></div></div>';
    }).join('');
    html += '<p class="wp-fine">Giri calcolati senza autostrade su OpenStreetMap (OSRM); le curve si misurano sul tracciato, i tempi non contano traffico e soste. Controlla sempre chiusure e meteo prima di partire.</p>';
    res.innerHTML = html;
    mappa();
    zone();
  }
  // Area B/C, vignette e autovelox per ogni giro (in background)
  function zone() {
    if (!window.hubZone) return;
    var R = S.res, v = window.hubGarage && window.hubGarage.active && window.hubGarage.active();
    R.G.forEach(function(g, i) {
      var righe = window.hubZone.milano(g.r.coords, function(k) { return k / Math.max(1, g.r.coords.length - 1) * g.r.s; }, R.when, v).map(function(a) { return a[1]; });
      var pinta = function() { var el = $('gi-zone-' + i); if (el && S.res === R) el.innerHTML = righe.map(function(t) { return '<div>' + t + '</div>'; }).join(''); };
      pinta();
      window.hubZone.vignette(g.r.coords).then(function(L) { L.forEach(function(x) { righe.push('🛣 ' + x.paese + ': vignetta solo sulle autostrade'); }); pinta(); });
      window.hubZone.autovelox(g.r.coords).then(function(L) {
        righe.push(L.length ? '📷 ' + L.length + ' autovelox fissi segnalati' : '📷 nessun autovelox fisso segnalato'); pinta();
        if (S.map && window.L) L.forEach(function(a) { window.L.marker([a.lat, a.lng], { icon: window.L.divIcon({ className: 'wp-velox-pin', html: '📷' + (a.max ? '<b>' + a.max + '</b>' : ''), iconSize: [40, 20] }) }).addTo(S.map); });
      }).catch(function() {});
    });
  }
  function gmaps(s, g) {
    return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + s.lat + ',' + s.lng + '&destination=' + s.lat + ',' + s.lng +
      '&waypoints=' + g.c.wp.map(function(w) { return w.lat + ',' + w.lng; }).join('%7C');
  }
  window.giroGpx = function(i) {
    var g = S.res.G[i], name = 'AutoHub giro ' + (i + 1);
    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AutoHub" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>' + esc(name) + '</name><trkseg>\n' +
      g.r.coords.map(function(p) { return '<trkpt lat="' + p.lat.toFixed(6) + '" lon="' + p.lng.toFixed(6) + '"/>'; }).join('\n') + '\n</trkseg></trk></gpx>';
    var url = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' })), a = document.createElement('a');
    a.href = url; a.download = 'autohub-giro-' + (i + 1) + '.gpx'; document.body.appendChild(a); a.click();
    setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 100);
  };
  function mappa() {
    if (S.map) { try { S.map.remove(); } catch (e) {} S.map = null; }
    var el = $('gi-map'); if (typeof L === 'undefined' || !el) { if (el) el.remove(); return; }
    var m = L.map(el, { zoomControl: false });
    if (typeof addBasemap === 'function') addBasemap(m); else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m);
    var all = [];
    S.res.G.forEach(function(g, i) {
      var ll = g.r.coords.map(function(p) { return [p.lat, p.lng]; }); all = all.concat(ll);
      L.polyline(ll, { color: COL[i], weight: 4, opacity: .9 }).addTo(m);
    });
    L.circleMarker([S.res.s.lat, S.res.s.lng], { radius: 6, color: '#111', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(m);
    m.fitBounds(L.latLngBounds(all), { padding: [14, 14] });
    S.map = m;
  }

  window._giInternals = { curve: curve, dest: dest, candidati: candidati, state: function() { return S; } };
})();
