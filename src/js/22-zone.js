/* ═══════════════════════════════════════════════════════════════════
   HUB ZONE — cosa incontri lungo un percorso
   • Milano Area B e Area C: perimetri ricavati dai varchi (open data Comune
     di Milano, 2026), regole per alimentazione/Euro e orari, ticket Area C
   • Vignette: Svizzera, Austria, Slovenia (prezzi 2026)
   • Autovelox fissi segnalati su OpenStreetMap (Worker /api/autovelox)
   window.hubZone = { milano, vignette, autovelox, dentro }
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var POLY = {"B":[[45.48326,9.25881],[45.48699,9.24751],[45.49201,9.25303],[45.49605,9.23561],[45.51219,9.25629],[45.51876,9.24284],[45.52127,9.22701],[45.52152,9.22467],[45.52109,9.21437],[45.52553,9.20243],[45.5238,9.19227],[45.51377,9.18236],[45.52902,9.17867],[45.52246,9.17413],[45.5311,9.16225],[45.52129,9.15209],[45.52071,9.1464],[45.52096,9.13586],[45.5172,9.12024],[45.5113,9.12556],[45.51262,9.10491],[45.51234,9.09871],[45.5045,9.09526],[45.48427,9.14605],[45.49473,9.07598],[45.48962,9.07167],[45.47746,9.08572],[45.47264,9.0801],[45.45921,9.07527],[45.449,9.06723],[45.45256,9.10254],[45.45392,9.11618],[45.44727,9.12106],[45.44269,9.12431],[45.43819,9.12385],[45.42747,9.13933],[45.42631,9.16012],[45.41359,9.16496],[45.40266,9.17485],[45.41646,9.20572],[45.43263,9.20578],[45.43458,9.20971],[45.41466,9.2413],[45.43408,9.23544],[45.42961,9.24699],[45.43746,9.26614],[45.44425,9.26643],[45.46181,9.24469],[45.47142,9.26143]],"C":[[45.45229,9.19105],[45.4523,9.19892],[45.45256,9.20157],[45.4601,9.20607],[45.4624,9.20637],[45.47155,9.20504],[45.474,9.20451],[45.47946,9.1915],[45.48015,9.18653],[45.48052,9.18292],[45.47381,9.1701],[45.46942,9.16606],[45.46284,9.16529],[45.46032,9.16691],[45.45433,9.17628],[45.45321,9.17838],[45.45237,9.18865]]};
  function dentro(poly, p) {   // punto nel poligono [[lat,lng],…] (ray casting)
    var x = p.lng, y = p.lat, ins = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  function dist(a, b) {
    var R = Math.PI / 180, dLat = (b.lat - a.lat) * R, dLng = (b.lng - a.lng) * R;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(a.lat * R) * Math.cos(b.lat * R);
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  // Area B e C: lunedì-venerdì 7:30-19:30 (i festivi non sono contati qui)
  function attiva(ms) { var d = new Date(ms), g = d.getDay(), m = d.getHours() * 60 + d.getMinutes(); return g >= 1 && g <= 5 && m >= 450 && m < 1170; }

  // Divieti Area B (auto) in vigore alla data: benzina fino a Euro 3 (Euro 4 dal 1/10/2028),
  // diesel fino a Euro 5 (Euro 6 A-B-C dal 1/10/2028, Euro 6 D dal 1/10/2030)
  function divieto(v, ms) {
    if (!v || v.type === 'moto') return null;
    var a = v.alim || '', e = parseInt(v.euro, 10);
    if (a === 'elettrica') return { ok: true };
    if (!e) return { ok: null, txt: 'inserisci la classe Euro nel Garage per sapere se puoi entrare' };
    var diesel = /diesel/.test(a), y2028 = ms >= new Date('2028-10-01').getTime(), y2030 = ms >= new Date('2030-10-01').getTime();
    if (diesel) { if (e <= 5 || (e === 6 && y2030)) return { ok: false }; if (e === 6 && y2028) return { ok: null, txt: 'diesel Euro 6 A, B e C non entrano dal 1° ottobre 2028: verifica la sottoclasse sul libretto' }; }
    else if (e <= 3 || (e === 4 && y2028)) return { ok: false };
    var futuro = !diesel && e === 4 ? 'benzina Euro 4: vietata dal 1° ottobre 2028' : diesel && e === 6 ? 'diesel Euro 6: limiti in arrivo dal 2028' : '';
    return { ok: true, txt: futuro };
  }
  function nomeV(v) { return v.customName || ((v.marca || '') + ' ' + (v.modello || '')).trim(); }

  /* coords: [{lat,lng}] · tSec(i): secondi dalla partenza al punto i · dep: partenza (ms) */
  function milano(coords, tSec, dep, v) {
    var out = [], iB = -1, iC = -1;
    for (var i = 0; i < coords.length; i += 2) {
      var p = coords[i];
      if (p.lat < 45.38 || p.lat > 45.55 || p.lng < 9.04 || p.lng > 9.29) continue;
      if (iC < 0 && dentro(POLY.C, p)) iC = i;
      if (iB < 0 && dentro(POLY.B, p)) iB = i;
      if (iB >= 0 && iC >= 0) break;
    }
    if (iB < 0) return out;
    var tB = dep + tSec(iB) * 1000, D = divieto(v, tB), nome = v ? nomeV(v) : 'l\'auto';
    if (!attiva(tB)) out.push(['info', '🏙 Attraversi Area B alle ' + hhmm(tB) + ', fuori orario (attiva lun-ven 7:30-19:30): nessun limite.']);
    else if (D && D.ok === false) out.push(['bad', '🚫 Area B attiva alle ' + hhmm(tB) + ': ' + esc(nome) + ' (' + (v.alim || '') + ' Euro ' + v.euro + ') non può entrare. Multa circa 83 €; per entrare servono deroghe o Move-In.']);
    else if (D && D.ok === null) out.push(['warn', '🏙 Area B attiva alle ' + hhmm(tB) + ': ' + esc(D.txt) + '.']);
    else out.push(['ok', '🏙 Area B alle ' + hhmm(tB) + ': ' + esc(nome) + ' può entrare' + (D && D.txt ? ' (' + esc(D.txt) + ')' : '') + '.']);
    if (iC >= 0) {
      var tC = dep + tSec(iC) * 1000;
      if (!attiva(tC)) out.push(['info', '🎟 Area C alle ' + hhmm(tC) + ': fuori orario, ingresso libero.']);
      else if (D && D.ok === false) out.push(['bad', '🚫 Area C alle ' + hhmm(tC) + ': stesso divieto dell\'Area B, il ticket non basta.']);
      else {
        var a = v && v.alim || '', ibr = /ibrida|plugin/.test(a), co2 = v && v.co2;
        if (a === 'elettrica') out.push(['ok', '🎟 Area C alle ' + hhmm(tC) + ': gratis per le elettriche (targa da registrare).']);
        else if (ibr && co2 && co2 <= 100) out.push(['ok', '🎟 Area C alle ' + hhmm(tC) + ': gratis per le ibride fino a 100 g/km di CO₂ (la tua: ' + co2 + ' g/km, targa da registrare).']);
        else out.push(['warn', '🎟 Area C attiva alle ' + hhmm(tC) + ': ticket 7,50 € da attivare entro la mezzanotte del giorno dopo' + (ibr && !co2 ? ' (le ibride fino a 100 g/km di CO₂ entrano gratis: inserisci la CO₂ nel Garage)' : '') + '.']);
      }
    }
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── Vignette (auto fino a 3,5 t, prezzi 2026) ─────────────────── */
  var VIG = {
    CH: { paese: 'Svizzera', prezzi: 'solo annuale: 40 CHF (valida 14 mesi)', url: 'https://via.admin.ch/shop/dashboard' },
    AT: { paese: 'Austria', prezzi: '1 giorno 9,60 € · 10 giorni 12,80 € · 2 mesi 32,00 € · anno 106,80 €', url: 'https://shop.asfinag.at/it/' },
    SI: { paese: 'Slovenia', prezzi: '7 giorni 16,00 € · 1 mese 32,00 € · anno 117,50 €', url: 'https://evinjeta.dars.si/it' }
  };
  // paesi attraversati: solo i punti vicini ai confini nord ed est vengono controllati (Photon reverse)
  function vignette(coords) {
    var cum = [0]; for (var i = 1; i < coords.length; i++) cum.push(cum[i - 1] + dist(coords[i - 1], coords[i]));
    var smp = [], last = -99;
    for (var k = 0; k < coords.length; k++) {
      var p = coords[k];
      if (cum[k] - last < 20) continue;
      if (p.lat > 45.75 || p.lng > 13.25) { smp.push(p); last = cum[k]; }
    }
    smp = smp.slice(0, 18);
    if (!smp.length) return Promise.resolve([]);
    var trovati = {};
    return Promise.all(smp.map(function(p) {
      return fetch('https://photon.komoot.io/reverse?lat=' + p.lat.toFixed(4) + '&lon=' + p.lng.toFixed(4) + '&limit=1').then(function(r) { return r.json(); })
        .then(function(d) { var c = d.features && d.features[0] && d.features[0].properties && d.features[0].properties.countrycode; if (c) trovati[String(c).toUpperCase()] = 1; }).catch(function() {});
    })).then(function() { return Object.keys(trovati).filter(function(c) { return VIG[c]; }).map(function(c) { return Object.assign({ cc: c }, VIG[c]); }); });
  }

  /* ── Autovelox fissi (OpenStreetMap) ──────────────────────────── */
  function autovelox(coords) {
    var s = 90, w = 180, n = -90, e = -180;
    coords.forEach(function(p) { s = Math.min(s, p.lat); n = Math.max(n, p.lat); w = Math.min(w, p.lng); e = Math.max(e, p.lng); });
    s -= .01; w -= .01; n += .01; e += .01;
    if ((n - s) * (e - w) > 6) return Promise.reject(new Error('percorso troppo lungo per gli autovelox'));
    var base = typeof WORKER !== 'undefined' ? WORKER : 'https://osservaprezzi.gabrycois.workers.dev';
    return fetch(base + '/api/autovelox?s=' + s.toFixed(3) + '&w=' + w.toFixed(3) + '&n=' + n.toFixed(3) + '&e=' + e.toFixed(3)).then(function(r) {
      return r.json().then(function(j) { if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status); return j; });
    }).then(function(j) {
      var pts = []; for (var i = 0; i < coords.length; i += Math.max(1, Math.floor(coords.length / 3000))) pts.push(coords[i]);
      return (j.autovelox || []).filter(function(a) {
        for (var i = 0; i < pts.length; i++) if (Math.abs(pts[i].lat - a.lat) < .002 && dist(pts[i], a) < .06) return true;
        return false;
      });
    });
  }

  window.hubZone = { milano: milano, vignette: vignette, autovelox: autovelox, dentro: dentro, POLY: POLY, divieto: divieto };
})();
