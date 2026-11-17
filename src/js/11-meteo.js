/* ═══════════════════════════════════════════════════════════════════
   HUB METEO PERCORSO — meteo nel punto e nell'ora in cui ci passi
   Indirizzi: Photon (suggerimenti) → Nominatim · Percorso: OSRM (con
   tempi per tratto, tappa intermedia, "evita autostrade") · Meteo: una
   sola chiamata Open-Meteo per tutti i punti, 16 giorni, ora per ora.
   In più: orario migliore per partire, ritorno, passi chiusi sul
   percorso, buio, ghiaccio, raffiche, freddo percepito in moto, mappa.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function giorno(ms) { var d = new Date(ms), oggi = new Date(); oggi.setHours(0, 0, 0, 0); var g = Math.round((new Date(d).setHours(0, 0, 0, 0) - oggi) / 86400000);
    return g === 0 ? 'oggi' : g === 1 ? 'domani' : ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'][d.getDay()] + ' ' + d.getDate(); }
  function localInput(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dist(a, b) {
    var R = Math.PI / 180, dLat = (b.lat - a.lat) * R, dLng = (b.lng - a.lng) * R;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(a.lat * R) * Math.cos(b.lat * R);
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(x)));
  }

  var LAST = 'hub_meteo_last_v1', RECENT = 'hub_meteo_recenti_v1';
  var S = { data: null, map: null };   // ultimo calcolo: percorso + previsioni, per ricalcolare senza rete

  /* ── Interfaccia ─────────────────────────────────────────────── */
  function inject() {
    if ($('wp-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'wp-overlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'wp-title');
    ov.innerHTML =
      '<div class="wp-hdr"><h2 id="wp-title">METEO PERCORSO<small>OpenStreetMap · OSRM · Open-Meteo</small></h2>' +
        '<button class="gar-close" onclick="closeWeather()">✕ Chiudi</button></div>' +
      '<div class="wp-body">' +
        '<form class="wp-form" onsubmit="event.preventDefault();wpCompute()" autocomplete="off">' +
          '<div class="wp-veh" role="radiogroup" aria-label="Con cosa viaggi">' +
            '<button type="button" class="wp-vbtn" data-v="moto" onclick="wpVeicolo(\'moto\')">🏍 Moto</button>' +
            '<button type="button" class="wp-vbtn" data-v="auto" onclick="wpVeicolo(\'auto\')">🚗 Auto</button></div>' +
          campo('from', 'Partenza', 'Es. Milano', '<button type="button" class="wp-locate" onclick="wpUseLocation()" title="Usa la mia posizione" aria-label="Usa la mia posizione">📍</button>') +
          '<div class="wp-swaprow"><button type="button" class="wp-link" onclick="wpSwap()">⇅ Inverti</button><button type="button" class="wp-link" id="wp-via-add" onclick="wpVia(true)">+ Tappa intermedia</button></div>' +
          '<div id="wp-via-wrap" hidden>' + campo('via', 'Passando da', 'Es. Passo del Tonale', '<button type="button" class="wp-locate" onclick="wpVia(false)" aria-label="Togli la tappa">✕</button>') + '</div>' +
          campo('to', 'Destinazione', 'Es. Bormio') +
          '<div class="wp-chips" id="wp-chips"></div>' +
          '<div class="wp-row2">' +
            '<div class="wp-field"><label for="wp-when">Partenza</label><input type="datetime-local" id="wp-when"></div>' +
            '<div class="wp-field"><label for="wp-ret">Ritorno <span class="wp-opt">(facoltativo)</span></label><input type="datetime-local" id="wp-ret"></div>' +
          '</div>' +
          '<div class="wp-quick"><button type="button" class="wp-link" onclick="wpOra(0)">Adesso</button><button type="button" class="wp-link" onclick="wpOra(1)">Domani 9:00</button><button type="button" class="wp-link" onclick="wpOra(2)">Sabato 9:00</button>' +
            '<label class="wp-check"><input type="checkbox" id="wp-nomw"> Evita autostrade</label></div>' +
          '<p class="wp-err" id="wp-err" role="alert"></p>' +
          '<button class="wp-go" type="submit">Calcola meteo →</button>' +
        '</form>' +
        '<div class="wp-result" id="wp-result" aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(ov);
    ['from', 'via', 'to'].forEach(function(k) { suggest($('wp-' + k)); });
    restore();
  }
  function campo(k, lbl, ph, extra) {
    return '<div class="wp-field"><label for="wp-' + k + '">' + lbl + '</label><input type="text" id="wp-' + k + '" placeholder="' + ph + '" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false">' +
      (extra || '') + '<div class="wp-sug" id="wp-' + k + '-sug" role="listbox"></div></div>';
  }
  function restore() {
    var L = jget(LAST, null), v = window.hubGarage && window.hubGarage.active && window.hubGarage.active();
    S.veh = (L && L.veh) || (v && v.type === 'moto' ? 'moto' : v ? 'auto' : 'moto');
    if (L) {
      ['from', 'via', 'to'].forEach(function(k) { if (L[k]) setPlace($('wp-' + k), L[k]); });
      if (L.via) wpVia(true);
      $('wp-nomw').checked = !!L.nomw;
    }
    var now = new Date(); now.setMinutes(0, 0, 0); if (Date.now() - now > 15 * 60000) now.setHours(now.getHours() + 1);
    $('wp-when').value = localInput(now.getTime());
    wpVeicolo(S.veh); chips();
  }
  function setPlace(inp, p) {
    inp.value = p.name; inp.dataset.lat = p.lat; inp.dataset.lng = p.lng;
  }
  function getPlace(inp) {
    var v = inp.value.trim();
    if (!v) return null;
    if (inp.dataset.lat) return { name: v, lat: +inp.dataset.lat, lng: +inp.dataset.lng };
    return { name: v };
  }
  // scorciatoie: passi preferiti e ultime destinazioni
  function chips() {
    var el = $('wp-chips'); if (!el) return;
    var P = (window._psInternals && window._psInternals.PASSES) || [], fav = jget('hub_passi_fav_v1', []);
    var list = jget(RECENT, []).slice(0, 4).map(function(r) { return { name: r.name, lat: r.lat, lng: r.lng, ico: '🕘' }; });
    P.filter(function(p) { return fav.indexOf(p.id) >= 0; }).slice(0, 6).forEach(function(p) {
      if (!list.some(function(x) { return x.name === p.name; })) list.push({ name: p.name, lat: p.lat, lng: p.lng, ico: '⛰' });
    });
    S.chips = list;
    el.innerHTML = list.map(function(c, i) { return '<button type="button" class="wp-chip" onclick="wpChip(' + i + ')">' + c.ico + ' ' + esc(c.name) + '</button>'; }).join('');
  }
  window.wpChip = function(i) { var c = S.chips[i]; if (c) setPlace($('wp-to'), c); };
  window.wpVeicolo = function(v) {
    S.veh = v;
    document.querySelectorAll('.wp-vbtn').forEach(function(b) { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-checked', b.dataset.v === v); });
    if (S.data) render();
  };
  window.wpVia = function(on) {
    $('wp-via-wrap').hidden = !on; $('wp-via-add').hidden = on;
    if (!on) { var i = $('wp-via'); i.value = ''; delete i.dataset.lat; delete i.dataset.lng; }
    else setTimeout(function() { $('wp-via').focus(); }, 0);
  };
  window.wpSwap = function() {
    var a = $('wp-from'), b = $('wp-to'), pa = getPlace(a), pb = getPlace(b);
    [a, b].forEach(function(i) { i.value = ''; delete i.dataset.lat; delete i.dataset.lng; });
    if (pb) (pb.lat != null ? setPlace(a, pb) : (a.value = pb.name));
    if (pa) (pa.lat != null ? setPlace(b, pa) : (b.value = pa.name));
  };
  window.wpOra = function(k) {
    var d = new Date();
    if (k === 0) d.setSeconds(0, 0);
    else { if (k === 1) d.setDate(d.getDate() + 1); else d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); d.setHours(9, 0, 0, 0); }
    $('wp-when').value = localInput(d.getTime());
  };

  // Suggerimenti mentre scrivi (Photon, pensato per l'autocompletamento)
  function suggest(inp) {
    var box = $(inp.id + '-sug'), timer = null, items = [], sel = -1;
    var close = function() { box.innerHTML = ''; box.classList.remove('on'); inp.setAttribute('aria-expanded', 'false'); sel = -1; };
    var pick = function(i) { var it = items[i]; if (!it) return; setPlace(inp, it); close(); };
    inp.addEventListener('input', function() {
      delete inp.dataset.lat; delete inp.dataset.lng;
      clearTimeout(timer);
      var q = inp.value.trim();
      if (q.length < 3 || /^-?\d+\.\d+\s*,/.test(q)) return close();
      timer = setTimeout(function() {
        cerca(q, 5).then(function(r) {
          if (inp.value.trim() !== q) return;
          items = r; sel = -1;
          if (!r.length) return close();
          box.innerHTML = r.map(function(it, i) { return '<div class="wp-sug-i" role="option" data-i="' + i + '">' + esc(it.name) + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</div>'; }).join('');
          box.classList.add('on'); inp.setAttribute('aria-expanded', 'true');
        }).catch(close);
      }, 300);
    });
    box.addEventListener('mousedown', function(e) { var o = e.target.closest('.wp-sug-i'); if (o) { e.preventDefault(); pick(+o.dataset.i); } });
    inp.addEventListener('keydown', function(e) {
      if (!box.classList.contains('on')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        box.querySelectorAll('.wp-sug-i').forEach(function(o, i) { o.classList.toggle('sel', i === sel); }); }
      else if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); pick(sel); }
      else if (e.key === 'Escape') close();
    });
    inp.addEventListener('blur', function() { setTimeout(close, 150); });
  }
  function cerca(q, n) {
    return fetch('https://photon.komoot.io/api/?limit=' + n + '&lat=45.6&lon=10&q=' + encodeURIComponent(q)).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).then(function(d) {
      return (d.features || []).map(function(f) {
        var p = f.properties || {}, c = f.geometry.coordinates;
        var sub = [p.city !== p.name ? p.city : null, p.county, p.state, p.country !== 'Italia' && p.country !== 'Italy' ? p.country : null].filter(Boolean).filter(function(x, i, a) { return a.indexOf(x) === i; }).slice(0, 2).join(', ');
        return { name: p.name || p.city || q, sub: sub, lat: c[1], lng: c[0] };
      });
    });
  }
  // Coordinate di un luogo scritto a mano: Photon, poi Nominatim
  function geocode(p) {
    if (p.lat != null) return Promise.resolve(p);
    var m = p.name.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (m) return Promise.resolve({ name: p.name, lat: +m[1], lng: +m[2] });
    return cerca(p.name, 1).then(function(r) { if (r[0]) return { name: p.name, lat: r[0].lat, lng: r[0].lng }; throw new Error('vuoto'); }).catch(function() {
      return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(p.name), { headers: { Accept: 'application/json' } })
        .then(function(r) { return r.ok ? r.json() : []; }).then(function(d) {
          if (!d || !d.length) throw new Error('Località non trovata: ' + p.name);
          return { name: p.name, lat: +d[0].lat, lng: +d[0].lon };
        });
    });
  }

  window.wpUseLocation = function() {
    var inp = $('wp-from');
    if (!navigator.geolocation) { errore('GPS non disponibile.'); return; }
    inp.value = 'Cerco la posizione…';
    navigator.geolocation.getCurrentPosition(function(pos) {
      setPlace(inp, { name: 'La mia posizione', lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) });
    }, function(err) { inp.value = ''; errore('Posizione non disponibile: ' + (err.message || err.code)); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };
  function errore(t) { var e = $('wp-err'); if (e) e.textContent = t || ''; }

  window.openWeather = function() {
    inject(); chips();
    $('wp-overlay').classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeWeather = function() {
    var ov = $('wp-overlay'); if (ov) ov.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  // da altre sezioni (es. Passi): apre con la destinazione già scelta
  window.hubMeteoVerso = function(name, lat, lng) {
    openWeather(); setPlace($('wp-to'), { name: name, lat: lat, lng: lng });
    if (!$('wp-from').value) wpUseLocation();
  };

  /* ── Percorso ─────────────────────────────────────────────────── */
  function route(pts, nomw) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' + pts.map(function(p) { return p.lng.toFixed(5) + ',' + p.lat.toFixed(5); }).join(';') +
      '?overview=full&geometries=geojson&annotations=duration' + (nomw ? '&exclude=motorway' : '');
    return fetch(url).then(function(r) {
      if (!r.ok) { if (nomw) return route(pts, false).then(function(x) { x.nomwFail = true; return x; }); throw new Error('Percorso non disponibile (HTTP ' + r.status + ')'); }
      return r.json().then(function(d) {
        if (!d.routes || !d.routes.length) throw new Error('Nessun percorso stradale tra questi punti');
        var rt = d.routes[0], c = rt.geometry.coordinates.map(function(x) { return { lat: x[1], lng: x[0] }; });
        // tempo cumulato in ogni punto: dai tempi per tratto di OSRM, se combaciano con la geometria
        var cumD = [0]; for (var i = 1; i < c.length; i++) cumD.push(cumD[i - 1] + dist(c[i - 1], c[i]));
        var segs = []; (rt.legs || []).forEach(function(l, li) { var a = (l.annotation && l.annotation.duration) || []; segs = segs.concat(a); });
        var cumT;
        if (segs.length === c.length - 1) { cumT = [0]; segs.forEach(function(s, i) { cumT.push(cumT[i] + s); }); var k = rt.duration / (cumT[cumT.length - 1] || 1); cumT = cumT.map(function(t) { return t * k; }); }
        else { var D = cumD[cumD.length - 1] || 1; cumT = cumD.map(function(d) { return d / D * rt.duration; }); }
        return { coords: c, cumD: cumD, cumT: cumT, km: rt.distance / 1000, durS: rt.duration, nomw: nomw };
      });
    });
  }
  // punti a distanza regolare (ogni ~15-25 km, max 24) con il loro tempo dalla partenza
  function campiona(rt) {
    var n = Math.max(3, Math.min(24, Math.round(rt.km / 20) + 1)), out = [], j = 0, L = rt.cumD[rt.cumD.length - 1];
    for (var k = 0; k < n; k++) {
      var d = L * k / (n - 1);
      while (j < rt.cumD.length - 2 && rt.cumD[j + 1] < d) j++;
      var seg = rt.cumD[j + 1] - rt.cumD[j], u = seg > 0 ? Math.max(0, Math.min(1, (d - rt.cumD[j]) / seg)) : 0;
      var a = rt.coords[j], b = rt.coords[j + 1] || a;
      out.push({ lat: a.lat + (b.lat - a.lat) * u, lng: a.lng + (b.lng - a.lng) * u, km: d, t: rt.cumT[j] + (rt.cumT[j + 1] - rt.cumT[j] || 0) * u });
    }
    return out;
  }
  function previsioni(samples) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + samples.map(function(s) { return s.lat.toFixed(4); }).join(',') +
      '&longitude=' + samples.map(function(s) { return s.lng.toFixed(4); }).join(',') +
      '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,visibility,is_day,snowfall' +
      '&forecast_days=16&timeformat=unixtime&timezone=auto';
    return fetch(url).then(function(r) { if (!r.ok) throw new Error('Meteo non disponibile (HTTP ' + r.status + ')'); return r.json(); })
      .then(function(d) { return Array.isArray(d) ? d : [d]; });
  }
  // passi alpini a meno di 1 km dal percorso
  function passiSulPercorso(rt) {
    var P = (window._psInternals && window._psInternals.PASSES) || [], step = Math.max(1, Math.floor(rt.coords.length / 1500));
    return P.filter(function(p) {
      for (var i = 0; i < rt.coords.length; i += step) if (dist(p, rt.coords[i]) < 1) return true;
      return false;
    }).map(function(p) {
      var near = 0, best = 1e9;
      for (var i = 0; i < rt.coords.length; i += step) { var d = dist(p, rt.coords[i]); if (d < best) { best = d; near = i; } }
      return { p: p, t: rt.cumT[near] };
    });
  }

  window.wpCompute = function() {
    errore('');
    var from = getPlace($('wp-from')), to = getPlace($('wp-to')), via = $('wp-via-wrap').hidden ? null : getPlace($('wp-via'));
    if (!from || !to) { errore('Inserisci partenza e destinazione.'); return; }
    var dep = new Date($('wp-when').value).getTime();
    if (!dep) { errore('Imposta data e ora di partenza.'); return; }
    var ret = $('wp-ret').value ? new Date($('wp-ret').value).getTime() : null;
    var nomw = $('wp-nomw').checked;
    var res = $('wp-result');
    res.innerHTML = '<div class="wp-loading">Calcolo percorso e meteo…</div>';
    var luoghi = [from].concat(via ? [via] : []).concat([to]);
    Promise.all(luoghi.map(geocode)).then(function(pl) {
      return route(pl, nomw).then(function(rt) {
        var smp = campiona(rt);
        return previsioni(smp).then(function(fc) {
          S.data = { pl: pl, rt: rt, smp: smp, fc: fc, dep: dep, ret: ret, passi: passiSulPercorso(rt) }; S.pieno = null;
          jset(LAST, { from: pl[0], via: via ? pl[1] : null, to: pl[pl.length - 1], veh: S.veh, nomw: nomw });
          var rec = jget(RECENT, []).filter(function(r) { return r.name !== pl[pl.length - 1].name; });
          rec.unshift(pl[pl.length - 1]); jset(RECENT, rec.slice(0, 8)); chips();
          render();
        });
      });
    }).catch(function(e) { res.innerHTML = '<div class="wp-error">' + esc(e.message || String(e)) + '</div>'; });
  };

  /* ── Valutazione ──────────────────────────────────────────────── */
  // dato meteo del punto i all'istante ms (ora più vicina)
  function meteo(i, ms) {
    var f = S.data.fc[i], h = f && f.hourly; if (!h) return null;
    var k = Math.round((ms / 1000 - h.time[0]) / 3600);
    if (k < 0 || k >= h.time.length) return null;
    return { t: h.temperature_2m[k], mm: h.precipitation[k] || 0, prob: h.precipitation_probability ? h.precipitation_probability[k] : null, code: h.weather_code[k],
      wind: h.wind_speed_10m[k] || 0, gust: h.wind_gusts_10m ? h.wind_gusts_10m[k] || 0 : 0, vis: h.visibility ? h.visibility[k] : null,
      day: h.is_day ? h.is_day[k] : 1, snow: h.snowfall ? h.snowfall[k] || 0 : 0, alt: f.elevation };
  }
  // freddo percepito in sella (wind chill a 90 km/h, valido sotto i 10 °C)
  function percepita(t, v) { if (t > 10) return t; var V = Math.pow(v, .16); return 13.12 + .6215 * t - 11.37 * V + .3965 * t * V; }
  function livello(w, moto) {
    var neve = w.snow > 0 || (w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86;
    var why = [];
    if (w.code >= 95) why.push(['bad', 'temporale']);
    if (neve) why.push(['bad', 'neve']);
    if (w.mm >= 1) why.push(['bad', 'pioggia ' + w.mm.toFixed(1).replace('.', ',') + ' mm']);
    else if (w.mm >= .2) why.push(['warn', 'pioviggine']);
    else if (w.prob != null && w.prob >= 50) why.push(['warn', 'pioggia ' + w.prob + '%']);
    if (w.t <= 2 && (w.mm > 0 || neve)) why.push(['bad', 'rischio ghiaccio']);
    else if (w.t <= 1) why.push([moto ? 'bad' : 'warn', 'gelo']);
    else if (moto && w.t <= 7) why.push(['warn', 'freddo']);
    if (w.t >= 34) why.push(['warn', 'caldo']);
    if (w.gust >= 60) why.push(['bad', 'raffiche ' + Math.round(w.gust)]);
    else if (w.gust >= (moto ? 40 : 55)) why.push(['warn', 'raffiche ' + Math.round(w.gust)]);
    if (w.vis != null && w.vis < 1000) why.push([w.vis < 300 ? 'bad' : 'warn', 'nebbia']);
    if (moto && !w.day) why.push(['warn', 'buio']);
    var lv = why.some(function(x) { return x[0] === 'bad'; }) ? 'bad' : why.length ? 'warn' : 'ok';
    return { lv: lv, why: why.map(function(x) { return x[1]; }) };
  }
  // tutto il viaggio partendo a "dep" (rev = ritorno: punti al contrario)
  function viaggio(dep, rev) {
    var D = S.data, T = D.rt.durS * 1000, moto = S.veh === 'moto', rows = [], fuori = false;
    D.smp.forEach(function(s, i) {
      var idx = rev ? D.smp.length - 1 - i : i, sp = D.smp[idx], ms = dep + (rev ? T - sp.t * 1000 : sp.t * 1000);
      var w = meteo(idx, ms); if (!w) { fuori = true; return; }
      rows.push({ i: idx, s: sp, ms: ms, w: w, L: livello(w, moto), km: rev ? D.rt.km - sp.km : sp.km });
    });
    var score = rows.reduce(function(a, r) { return a + (r.L.lv === 'bad' ? 3 : r.L.lv === 'warn' ? 1 : 0) + Math.min(3, r.w.mm); }, 0);
    return { rows: rows, fuori: fuori, score: score / Math.max(1, rows.length) };
  }

  /* ── Risultato ───────────────────────────────────────────────── */
  var ICO = function(c, day) { return c === 0 ? (day ? '☀️' : '🌙') : c <= 2 ? (day ? '🌤' : '☁️') : c === 3 ? '☁️' : c <= 48 ? '🌫' : c <= 57 ? '🌦' : c <= 67 ? '🌧' : c <= 77 ? '🌨' : c <= 82 ? '🌧' : c <= 86 ? '🌨' : '⛈'; };
  var DESC = function(c) { return c === 0 ? 'Sereno' : c <= 2 ? 'Poco nuvoloso' : c === 3 ? 'Coperto' : c <= 48 ? 'Nebbia' : c <= 57 ? 'Pioviggine' : c <= 67 ? 'Pioggia' : c <= 77 ? 'Neve' : c <= 82 ? 'Rovesci' : c <= 86 ? 'Rovesci di neve' : 'Temporale'; };
  function render() {
    var D = S.data, rt = D.rt, moto = S.veh === 'moto', res = $('wp-result');
    var A = viaggio(D.dep, false), R = D.ret ? viaggio(D.ret, true) : null;
    var last = D.fc[0] && D.fc[0].hourly ? D.fc[0].hourly.time[D.fc[0].hourly.time.length - 1] * 1000 : 0;
    if (!A.rows.length) { res.innerHTML = '<div class="wp-error">Previsioni disponibili fino a ' + giorno(last) + ' ' + hhmm(last) + ': scegli una partenza più vicina.</div>'; return; }
    var mm = Math.round(rt.durS / 60), h = Math.floor(mm / 60), m = mm % 60, pl = D.pl;
    var gmaps = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + pl[0].lat + ',' + pl[0].lng + '&destination=' + pl[pl.length - 1].lat + ',' + pl[pl.length - 1].lng +
      (pl.length > 2 ? '&waypoints=' + pl[1].lat + ',' + pl[1].lng : '');
    var html = '<div class="wp-route-info"><div class="wp-route-row">' + pl.map(function(p) { return '<strong>' + esc(p.name.split(',')[0]) + '</strong>'; }).join(' → ') + '</div>' +
      '<div class="wp-route-meta">' + Math.round(rt.km) + ' km · ' + (h ? h + 'h ' : '') + m + 'm' + (rt.nomwFail ? ' · autostrade non escludibili su questo percorso' : rt.nomw ? ' · senza autostrade' : '') +
      ' · arrivo ' + hhmm(D.dep + rt.durS * 1000) + ' · <a href="' + gmaps + '" target="_blank" rel="noopener">Apri in Google Maps ↗</a></div></div>' +
      '<div class="wp-map" id="wp-map" aria-label="Mappa del percorso con il meteo"></div>';
    html += avvisi(A, R);
    html += decisione(A.rows, rt);
    html += quando();
    html += '<div id="wp-pieno">' + pienoBox() + '</div>';
    html += tappe('Andata · ' + giorno(D.dep) + ' ' + hhmm(D.dep), A, moto);
    if (R) html += R.rows.length ? tappe('Ritorno · ' + giorno(D.ret) + ' ' + hhmm(D.ret), R, moto) : '<div class="wp-alert">Ritorno oltre le previsioni disponibili.</div>';
    if (A.fuori) html += '<p class="wp-fine">Parte del viaggio è oltre le previsioni disponibili (fino a ' + giorno(last) + ').</p>';
    html += '<p class="wp-fine">Previsioni Open-Meteo per il punto e l\'ora in cui ci passi, alla quota del modello. Tempi di percorrenza da OSRM, senza traffico né soste.</p>';
    res.innerHTML = html;
    var bst = res.querySelector('.wp-hr.best'); if (bst) bst.parentNode.scrollLeft = bst.offsetLeft - bst.parentNode.offsetLeft - 60;
    mappa(A.rows);
  }
  function avvisi(A, R) {
    var D = S.data, moto = S.veh === 'moto', out = [];
    // passi chiusi nel mese del viaggio
    D.passi.forEach(function(x) {
      var mese = new Date(D.dep + x.t * 1000).getMonth() + 1;
      if (x.p.closed && x.p.closed.indexOf(mese) >= 0) out.push(['bad', '⛔ ' + esc(x.p.name) + ': ' + esc(window._psInternals.chiusoTxt(x.p).toLowerCase()) + '. Verifica l\'apertura prima di partire.']);
      else out.push(['info', '⛰ Passi sul percorso: ' + esc(x.p.name) + ' (' + x.p.alt + ' m)']);
    });
    var all = A.rows.concat(R ? R.rows : []);
    var trova = function(re) { return all.filter(function(r) { return r.L.why.some(function(w) { return re.test(w); }); }); };
    var ice = trova(/ghiaccio/); if (ice.length) out.push(['bad', '🧊 Rischio ghiaccio verso km ' + Math.round(ice[0].km) + ' (' + Math.round(ice[0].w.t) + '° con precipitazioni)']);
    var neve = trova(/neve/); if (neve.length) out.push(['bad', '🌨 Neve prevista verso km ' + Math.round(neve[0].km) + (neve[0].w.alt ? ' (' + Math.round(neve[0].w.alt) + ' m)' : '')]);
    var tst = trova(/temporale/); if (tst.length) out.push(['bad', '⛈ Temporali verso km ' + Math.round(tst[0].km) + ' alle ' + hhmm(tst[0].ms)]);
    var pioggia = all.filter(function(r) { return r.w.mm >= .2; });
    if (pioggia.length) out.push(['warn', '🌧 Pioggia in ' + pioggia.length + ' punti su ' + all.length + ' (max ' + Math.max.apply(null, pioggia.map(function(r) { return r.w.mm; })).toFixed(1).replace('.', ',') + ' mm/h)']);
    var fog = trova(/nebbia/); if (fog.length) out.push(['warn', '🌫 Nebbia verso km ' + Math.round(fog[0].km) + ' (visibilità ' + Math.round(fog[0].w.vis) + ' m)']);
    var gust = all.filter(function(r) { return r.w.gust >= 40; }).sort(function(a, b) { return b.w.gust - a.w.gust; });
    if (gust.length) out.push([gust[0].w.gust >= 60 ? 'bad' : 'warn', '💨 Raffiche fino a ' + Math.round(gust[0].w.gust) + ' km/h verso km ' + Math.round(gust[0].km)]);
    var buio = all.filter(function(r) { return !r.w.day; });
    if (buio.length) out.push([moto ? 'warn' : 'info', '🌙 ' + (buio.length === all.length ? 'Viaggio tutto col buio' : 'Parte del viaggio col buio (dalle ' + hhmm(buio[0].ms) + ')')]);
    if (moto) {
      var tMin = all.reduce(function(a, r) { return Math.min(a, r.w.t); }, 99), fr = all.filter(function(r) { return r.w.t === tMin; })[0];
      if (fr && tMin <= 10) out.push([tMin <= 4 ? 'warn' : 'info', '🥶 In sella a 90 km/h percepisci circa ' + Math.round(percepita(tMin, 90)) + '° (aria ' + Math.round(tMin) + '° verso km ' + Math.round(fr.km) + '): guanti invernali e sottocasco']);
    }
    if (!out.length) return '<div class="wp-ok">✓ Nessun avviso: viaggio asciutto e tranquillo</div>';
    return '<div class="wp-alerts">' + out.map(function(a) { return '<div class="wp-al wp-al-' + a[0] + '">' + a[1] + '</div>'; }).join('') + '</div>';
  }
  // striscia degli orari di partenza: colore = condizioni, il migliore evidenziato
  function quando() {
    var D = S.data, now = Date.now(), base = new Date(D.dep); base.setMinutes(0, 0, 0);
    var c = [];
    for (var k = -6; k <= 12; k++) {
      var t = base.getTime() + k * 3600000; if (t < now - 3600000) continue;
      var v = viaggio(t, false); if (v.fuori || !v.rows.length) continue;
      c.push({ t: t, s: v.score, sel: k === 0 && new Date(D.dep).getMinutes() === 0 });
    }
    if (c.length < 3) return '';
    var best = c.slice().sort(function(a, b) { return a.s - b.s || Math.abs(a.t - D.dep) - Math.abs(b.t - D.dep); })[0];
    var cur = viaggio(D.dep, false).score;
    var msg = best.s + .05 < cur ? 'Conviene partire alle <b>' + hhmm(best.t) + '</b>' + (giorno(best.t) !== giorno(D.dep) ? ' di ' + giorno(best.t) : '') : 'L\'orario scelto è già tra i migliori';
    return '<div class="wp-when"><div class="wp-when-h">Quando partire <span>' + msg + '</span></div><div class="wp-when-strip" role="group" aria-label="Orari di partenza">' +
      c.map(function(x) {
        var cl = x.s < .4 ? 'ok' : x.s < 1.5 ? 'warn' : 'bad';
        return '<button type="button" class="wp-hr wp-hr-' + cl + (x.t === best.t ? ' best' : '') + (x.sel ? ' sel' : '') + '" onclick="wpPartenza(' + x.t + ')" title="' + giorno(x.t) + ' ' + hhmm(x.t) + '">' + new Date(x.t).getHours() + '</button>';
      }).join('') + '</div></div>';
  }
  window.wpPartenza = function(t) { S.data.dep = t; $('wp-when').value = localInput(t); render(); };
  function tappe(titolo, V, moto) {
    var D = S.data;
    return '<div class="wp-sec">' + titolo + '</div><div class="wp-steps">' + V.rows.map(function(r, i) {
      var w = r.w, pass = D.passi.filter(function(x) { return dist(x.p, r.s) < 6; })[0];
      var lbl = i === 0 ? 'Partenza' : i === V.rows.length - 1 ? 'Arrivo' : 'km ' + Math.round(r.km);
      var feel = moto && w.t <= 10 ? ' · percepiti ' + Math.round(percepita(w.t, 90)) + '°' : '';
      return '<div class="wp-step wp-lv-' + r.L.lv + '">' +
        '<div class="wp-step-time"><div class="wp-step-frac">' + lbl + '</div><div class="wp-step-hh">' + hhmm(r.ms) + '</div></div>' +
        '<div class="wp-step-icon" aria-hidden="true">' + ICO(w.code, w.day) + '</div>' +
        '<div class="wp-step-info"><div class="wp-step-temp">' + Math.round(w.t) + '°C' + (w.alt != null ? '<small> · ' + Math.round(w.alt) + ' m</small>' : '') + (pass ? '<small class="wp-pass"> · ⛰ ' + esc(pass.p.name) + '</small>' : '') + '</div>' +
          '<div class="wp-step-desc">' + DESC(w.code) + feel + ' · vento ' + Math.round(w.wind) + (w.gust >= w.wind + 10 ? ' (raffiche ' + Math.round(w.gust) + ')' : '') + ' km/h</div>' +
          (w.mm >= .1 || (w.prob != null && w.prob >= 30) ? '<span class="wp-precip">💧 ' + (w.mm >= .1 ? w.mm.toFixed(1).replace('.', ',') + ' mm' : '') + (w.prob != null ? (w.mm >= .1 ? ' · ' : '') + w.prob + '%' : '') + '</span>' : '') +
          (r.L.why.filter(function(x) { return !/^pio/.test(x); }).length ? '<div class="wp-why">' + r.L.why.filter(function(x) { return !/^pio/.test(x); }).map(esc).join(' · ') + '</div>' : '') +
        '</div></div>';
    }).join('') + '</div>';
  }
  /* ── Pieno sul percorso: distributori a meno di 1,5 km dalla strada, i più convenienti ── */
  var CARB = ['Benzina', 'Diesel', 'GPL', 'Metano'];
  function carbVeicolo() {
    var v = window.hubGarage && window.hubGarage.active && window.hubGarage.active(), a = v && v.alim || '';
    return /diesel/.test(a) ? 'Diesel' : a === 'gpl' ? 'GPL' : a === 'metano' ? 'Metano' : 'Benzina';
  }
  function pienoBox() {
    var P = S.pieno;
    var form = '<div class="wp-pieno-f"><select id="wp-carb" aria-label="Carburante">' + CARB.map(function(c) { return '<option' + (c === (P && P.carb || carbVeicolo()) ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' +
      '<input type="number" id="wp-aut" min="10" max="2000" step="10" placeholder="Autonomia km" aria-label="Autonomia residua in km" value="' + (P && P.aut || '') + '">' +
      '<button type="button" class="wp-pieno-go" onclick="wpPieno()">Cerca</button></div>';
    var head = '<div class="wp-sec">⛽ Pieno sul percorso</div>';
    if (!P) return head + '<p class="wp-fine">I distributori più convenienti a meno di 1,5 km dalla strada (prezzi self di oggi). Con l\'autonomia indicata mostro solo quelli che raggiungi.</p>' + form;
    if (P.load) return head + form + '<div class="wp-loading">Cerco i distributori lungo la strada…</div>';
    if (P.err) return head + form + '<div class="wp-error">' + esc(P.err) + '</div>';
    if (!P.list.length) return head + form + '<p class="wp-fine">Nessun distributore ' + P.carb.toLowerCase() + ' a meno di 1,5 km dalla strada' + (P.aut ? ' entro ' + P.aut + ' km' : '') + '.</p>';
    var v = window.hubGarage && window.hubGarage.active && window.hubGarage.active(), serb = v && (v.serbatoio || (v.specs && v.specs.serbatoio_l)) || 40;
    var pl = S.data.pl, o = pl[0], d = pl[pl.length - 1];
    return head + form + '<p class="wp-fine">' + P.tot + ' distributori lungo la strada · prezzo medio ' + P.media.toFixed(3).replace('.', ',') + ' €/l</p>' +
      '<div class="wp-pieno-l">' + P.list.map(function(x, i) {
        var risp = (P.media - x.prezzo) * serb;
        var nav = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + o.lat + ',' + o.lng + '&destination=' + d.lat + ',' + d.lng + '&waypoints=' + x.lat + ',' + x.lng;
        return '<a class="wp-pieno-r" href="' + nav + '" target="_blank" rel="noopener"><span class="wp-pieno-n">' + (i + 1) + '</span><span class="wp-pieno-t"><b>' + esc(x.bandiera || x.nome) + '</b><small>km ' + Math.round(x.km) + ' · ' + esc(x.comune || x.indirizzo || '') + (x.off > .3 ? ' · ' + x.off.toFixed(1).replace('.', ',') + ' km dalla strada' : '') + '</small></span>' +
          '<span class="wp-pieno-p"><b>' + x.prezzo.toFixed(3).replace('.', ',') + '</b><small>' + (risp >= 1 ? '−' + Math.round(risp) + ' € sul pieno' : 'nella media') + '</small></span></a>';
      }).join('') + '</div><p class="wp-fine">Il risparmio è calcolato su un pieno da ' + Math.round(serb) + ' l rispetto alla media dei distributori sul percorso. Tocca un distributore per aggiungerlo come tappa in Google Maps.</p>';
  }
  window.wpPieno = function() {
    var D = S.data; if (!D) return;
    var carb = $('wp-carb').value, aut = parseFloat($('wp-aut').value) || null;
    S.pieno = { carb: carb, aut: aut, load: true }; $('wp-pieno').innerHTML = pienoBox();
    var c = D.rt.coords, cum = D.rt.cumD, L = cum[cum.length - 1], fino = aut ? Math.min(L, aut * 0.9) : L;
    // riquadri da ~20 km lungo la strada, con 2 km di margine
    var boxes = [];
    for (var k = 0; k < fino; k += 20) {
      var la1 = 90, la2 = -90, lo1 = 180, lo2 = -180;
      for (var i = 0; i < c.length; i++) if (cum[i] >= k && cum[i] <= Math.min(fino, k + 20)) { la1 = Math.min(la1, c[i].lat); la2 = Math.max(la2, c[i].lat); lo1 = Math.min(lo1, c[i].lng); lo2 = Math.max(lo2, c[i].lng); }
      if (la1 <= la2) boxes.push([la1 - .018, lo1 - .025, la2 + .018, lo2 + .025]);
    }
    // punti della strada ogni ~200 m per misurare la distanza dei distributori
    var pts = [], last = -1;
    for (var j = 0; j < c.length; j++) if (cum[j] - last >= 0.2 && cum[j] <= fino) { pts.push({ lat: c[j].lat, lng: c[j].lng, km: cum[j] }); last = cum[j]; }
    var seen = {}, found = [], q = boxes.slice();
    function prossimo() {
      var b = q.shift(); if (!b) return Promise.resolve();
      return fetch(WORKER + '/api/bbox?lat1=' + b[0].toFixed(4) + '&lng1=' + b[1].toFixed(4) + '&lat2=' + b[2].toFixed(4) + '&lng2=' + b[3].toFixed(4) + '&carburante=' + encodeURIComponent(carb) + '&self=1')
        .then(function(r) { return r.ok ? r.json() : []; }).then(function(list) {
          (Array.isArray(list) ? list : []).forEach(function(x) {
            if (seen[x.id] || !(x.prezzo > 0.3)) return; seen[x.id] = 1;
            var best = 1e9, km = 0;
            pts.forEach(function(p) { var dd = dist(p, x); if (dd < best) { best = dd; km = p.km; } });
            if (best <= 1.5) found.push(Object.assign({}, x, { off: best, km: km }));
          });
        }).catch(function() {}).then(prossimo);
    }
    Promise.all([prossimo(), prossimo(), prossimo()]).then(function() {
      if (!boxes.length) throw new Error('Percorso non valido');
      found.sort(function(a, b) { return a.prezzo - b.prezzo; });
      var media = found.length ? found.reduce(function(a, x) { return a + x.prezzo; }, 0) / found.length : 0;
      S.pieno = { carb: carb, aut: aut, list: found.slice(0, 5), tot: found.length, media: media };
      $('wp-pieno').innerHTML = pienoBox();
      if (S.map && typeof L !== 'undefined') S.pieno.list.forEach(function(x, i) {
        L.marker([x.lat, x.lng], { icon: L.divIcon({ className: 'wp-pieno-pin', html: '⛽' + (i + 1), iconSize: [34, 20] }) }).bindTooltip(x.prezzo.toFixed(3) + ' €/l').addTo(S.map);
      });
    }).catch(function(e) { S.pieno = { carb: carb, aut: aut, err: e.message || 'Distributori non disponibili' }; $('wp-pieno').innerHTML = pienoBox(); });
  };

  function mappa(rows) {
    if (S.map) { try { S.map.remove(); } catch (e) {} S.map = null; }
    var el = $('wp-map');
    if (typeof L === 'undefined' || !el) { if (el) el.remove(); return; }
    var c = S.data.rt.coords, m = L.map(el, { zoomControl: false, attributionControl: true });
    if (typeof addBasemap === 'function') addBasemap(m); else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m);
    var line = L.polyline(c.map(function(p) { return [p.lat, p.lng]; }), { color: '#5b9bd5', weight: 4, opacity: .9 }).addTo(m);
    var col = { ok: '#3fbf7f', warn: '#e8c547', bad: '#e5484d' };
    rows.forEach(function(r) {
      L.circleMarker([r.s.lat, r.s.lng], { radius: 7, color: '#111', weight: 2, fillColor: col[r.L.lv], fillOpacity: 1 })
        .bindTooltip(hhmm(r.ms) + ' · ' + Math.round(r.w.t) + '° ' + DESC(r.w.code) + (r.L.why.length ? ' · ' + r.L.why.join(', ') : '')).addTo(m);
    });
    m.fitBounds(line.getBounds(), { padding: [16, 16] });
    S.map = m;
  }

  /* ── Moto o auto? ────────────────────────────────────────────── */
  function decisione(rows, rt) {
    var mm = rows.map(function(r) { return r.w.mm; }), t = rows.map(function(r) { return r.w.t; }), g = rows.map(function(r) { return r.w.gust; });
    var maxMm = Math.max.apply(null, mm), totMm = mm.reduce(function(a, b) { return a + b; }, 0), wet = mm.filter(function(x) { return x >= .2; }).length;
    var prob = rows.map(function(r) { return r.w.prob || 0; }), maxProb = Math.max.apply(null, prob);
    var tMin = Math.min.apply(null, t), tMax = Math.max.apply(null, t), gMax = Math.max.apply(null, g), km = rt.km;
    var buio = rows.filter(function(r) { return !r.w.day; }).length;
    var moto = 0, auto = 0, pros = [];
    var add = function(side, n, icn, txt) { if (side === 'moto') moto += n; else auto += n; pros.push({ side: side, icn: icn, txt: txt }); };
    var blocco = wet >= 1 || maxProb >= 60 || tMin < 5 || gMax > 45;
    if (maxMm >= 3) add('auto', 9, '🌧', 'Pioggia intensa (fino a ' + maxMm.toFixed(1).replace('.', ',') + ' mm/h)');
    else if (totMm >= 5) add('auto', 8, '🌧', 'Pioggia su gran parte del tragitto (' + wet + ' punti su ' + rows.length + ')');
    else if (wet >= 2) add('auto', 7, '💧', 'Pioggia in ' + wet + ' punti su ' + rows.length);
    else if (wet === 1 || maxProb >= 60) add('auto', 4, '💧', wet ? 'Pioggia in un tratto' : 'Probabilità di pioggia fino al ' + maxProb + '%');
    else if (maxProb >= 30) add('auto', 1, '🌥', 'Qualche possibilità di pioggia (' + maxProb + '%)');
    else add('moto', 3, '☀', 'Asciutto su tutto il tragitto');
    if (tMin < 3) add('auto', 6, '🥶', 'Freddo intenso (min ' + Math.round(tMin) + '°, in sella ' + Math.round(percepita(tMin, 90)) + '°)');
    else if (tMin < 8) add('auto', 4, '❄', 'Freddo (min ' + Math.round(tMin) + '°): abbigliamento invernale');
    else if (tMax > 34) add('auto', 3, '🥵', 'Caldo forte (' + Math.round(tMax) + '°)');
    else if (tMin >= 14 && tMax <= 28 && !blocco) add('moto', 3, '🌡', 'Temperatura ideale (' + Math.round(tMin) + '–' + Math.round(tMax) + '°)');
    else if (tMin >= 10 && tMax <= 32 && !blocco) add('moto', 1, '🌡', 'Temperatura accettabile');
    if (gMax > 60) add('auto', 7, '💨', 'Raffiche forti (' + Math.round(gMax) + ' km/h)');
    else if (gMax > 40) add('auto', 4, '🌬', 'Raffiche fino a ' + Math.round(gMax) + ' km/h');
    else if (gMax < 25 && !blocco) add('moto', 1, '🍃', 'Vento debole');
    if (buio > rows.length / 2) add('auto', 2, '🌙', 'Gran parte del viaggio col buio');
    if (km > 400) add('auto', 3, '🛣', 'Tragitto molto lungo (' + Math.round(km) + ' km)');
    else if (km > 250) add('auto', 1, '🛣', 'Tragitto lungo (' + Math.round(km) + ' km)');
    else if (km >= 40 && km <= 220 && !blocco) add('moto', 2, '🛤', 'Distanza ideale per la moto');
    if (S.data.passi.length && !blocco) add('moto', 1, '⛰', 'Passi sul percorso');
    var d = moto - auto, v, c, sub;
    if (d >= 4) { v = '🏍 PRENDI LA MOTO'; c = 'moto'; sub = 'Condizioni ottime per le due ruote'; }
    else if (d >= 2) { v = '🏍 LEGGERMENTE PRO MOTO'; c = 'moto'; sub = 'Favorevole, ma non perfetto'; }
    else if (d <= -4) { v = '🚗 MEGLIO L\'AUTO'; c = 'auto'; sub = 'Le condizioni non aiutano la moto'; }
    else if (d <= -2) { v = '🚗 LEGGERMENTE PRO AUTO'; c = 'auto'; sub = 'Qualche fattore consiglia l\'abitacolo'; }
    else { v = '⚖ DECIDI TU'; c = 'mixed'; sub = 'Condizioni miste'; }
    return '<div class="wp-decision dec-' + c + '"><div class="wp-decision-verdict">' + v + '</div><div class="wp-decision-sub">' + sub + '</div>' +
      '<div class="wp-decision-score"><div class="wp-decision-bar' + (moto > auto ? ' high-moto' : '') + '"><span class="wp-decision-bar-icn">🏍</span><span>Moto</span><span class="wp-decision-bar-val">+' + moto + '</span></div>' +
      '<div class="wp-decision-bar' + (auto > moto ? ' high-auto' : '') + '"><span class="wp-decision-bar-icn">🚗</span><span>Auto</span><span class="wp-decision-bar-val">+' + auto + '</span></div></div>' +
      '<div class="wp-decision-pros">' + pros.map(function(p) { return '<div class="wp-decision-pro"><span class="wp-decision-pro-icn">' + p.icn + '</span><span class="wp-decision-pro-side side-' + p.side + '">' + p.side + '</span><span>' + esc(p.txt) + '</span></div>'; }).join('') + '</div></div>';
  }

  window._wpInternals = { campiona: campiona, livello: livello, percepita: percepita, state: function() { return S; } };
})();
