/* ═══════════════════════════════════════════════════════════════════
   HUB OGGI — prima schermata: cosa serve sapere prima di prendere l'auto
   • Da fare: scadenze (bollo, RCA, revisione, tagliando) e manutenzioni
   • Meteo per guidare: oggi e i 3 giorni dopo (ghiaccio, neve, nebbia, raffiche)
   • Pieno o ricarica del veicolo attivo · ultima uscita · scorciatoie
   Posizione: hub_oggi_pos_v1 · meteo in cache 1 ora (hub_oggi_meteo_v1)
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  var POS = 'hub_oggi_pos_v1', MET = 'hub_oggi_meteo_v1';
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function vName(v) { return v.customName || ((v.marca || '') + ' ' + (v.modello || '')).trim(); }
  function garage() { return window.hubGarage ? window.hubGarage.list() : []; }
  function eur(n, d) { return n.toFixed(d == null ? 2 : d).replace('.', ','); }

  /* ── Da fare ───────────────────────────────────────────────────── */
  function daFare() {
    var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
    var out = [];
    garage().forEach(function(v) {
      [['scadBollo', 'Bollo'], ['scadRca', 'Assicurazione'], ['scadRev', 'Revisione'], ['scadTagliando', 'Tagliando']].forEach(function(x) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v[x[0]] || '')) return;
        var g = Math.round((new Date(v[x[0]] + 'T00:00:00') - oggi) / 86400000);
        if (g <= 30) out.push({ v: v, nome: x[1], giorni: g, data: v[x[0]], tipo: 'scad' });
      });
      var gav = window.hubGommeAvviso ? window.hubGommeAvviso(v) : null;
      if (gav) out.push({ v: v, nome: /invernali/.test(gav) ? 'Monta le gomme invernali' : 'Monta le gomme estive', giorni: /invernali/.test(gav) ? 0 : 10, quando: /invernali/.test(gav) ? 'obbligo in corso' : 'cambio stagione', tipo: 'gomme', icon: '⚫' });
      (window.hubMaintScad ? window.hubMaintScad(v) : []).forEach(function(m) {
        var g = m.daysRem != null ? m.daysRem : null, scad = m.status === 'crit';
        var quando = m.kmRem != null && (g == null || m.kmRem / 40 < g) ? (m.kmRem < 0 ? 'superato di ' + Math.abs(m.kmRem).toLocaleString('it-IT') + ' km' : 'tra ' + m.kmRem.toLocaleString('it-IT') + ' km') : null;
        out.push({ v: v, nome: m.name, giorni: scad ? -1 : g != null ? g : 30, quando: quando, tipo: 'mt', icon: m.icon });
      });
    });
    var pat = window.hubPatenteScad ? window.hubPatenteScad() : null;
    if (pat && garage()[0]) out.push({ v: garage()[0], nome: 'Patente', giorni: pat.giorni, data: pat.data, tipo: 'doc', icon: '🪪', nascondiAuto: true });
    (window.hubRichiamiDaFare ? window.hubRichiamiDaFare() : []).forEach(function(x) {
      out.push({ v: x.v, nome: x.st === 'tua' ? 'Richiamo ufficiale da fare' : 'Richiamo da verificare', giorni: x.st === 'tua' ? -1 : 20, quando: x.st === 'tua' ? 'gratis in officina' : 'controlla il telaio', tipo: 'ric', icon: '🛡' });
    });
    return out.sort(function(a, b) { return a.giorni - b.giorni; });
  }
  function renderDaFare() {
    var list = daFare(), molti = garage().length > 1;
    if (!garage().length) return card('🚗 Il tuo garage', '<p class="og-p">Aggiungi la tua auto per vedere qui scadenze, manutenzioni e quanto ti costa il pieno.</p><button class="og-btn" onclick="hubGo(\'garage\')">Apri il Garage</button>');
    if (!list.length) return card('✓ Da fare', '<p class="og-p og-ok">Nessuna scadenza nei prossimi 30 giorni.</p>', 'og-c-ok');
    return card('Da fare', list.slice(0, 6).map(function(x) {
      var cls = x.giorni < 0 ? 'crit' : x.giorni <= 7 ? 'warn' : 'soon';
      var q = x.quando || (x.giorni < 0 ? 'scaduto da ' + Math.abs(x.giorni) + (Math.abs(x.giorni) === 1 ? ' giorno' : ' giorni') : x.giorni === 0 ? 'oggi' : x.giorni === 1 ? 'domani' : 'tra ' + x.giorni + ' giorni');
      return '<button type="button" class="og-todo og-' + cls + '" onclick="ogApri(\'' + x.tipo + '\',\'' + esc(x.v.id) + '\')">' +
        '<span class="og-dot" aria-hidden="true"></span><span class="og-todo-t">' + (x.icon ? x.icon + ' ' : '') + esc(x.nome) + (molti && !x.nascondiAuto ? '<small>' + esc(vName(x.v)) + '</small>' : '') + '</span>' +
        '<span class="og-todo-q">' + esc(q) + '</span></button>';
    }).join('') + (list.length > 6 ? '<p class="og-p og-small">e altre ' + (list.length - 6) + '</p>' : ''), list.some(function(x) { return x.giorni < 0; }) ? 'og-c-crit' : '');
  }
  window.ogApri = function(tipo, vid) {
    if (window.hubGarage) window.hubGarage.setActive(vid);
    hubGo('garage');
    setTimeout(function() {
      if (tipo === 'doc' && window.openDocumenti) { window.openDocumenti(); return; }
      if (tipo === 'ric' && window.openRichiami) { window.openRichiami(); return; }
      if ((tipo === 'mt' || tipo === 'gomme') && window.openMaint) { if (tipo === 'gomme' && window.mtTab) window.mtTab('gomme'); else if (window.mtTab) window.mtTab('int'); window.openMaint(); }
      else if (window.openGarageEdit) window.openGarageEdit(vid);
    }, 250);
  };

  /* ── Meteo per guidare ─────────────────────────────────────────── */
  var meteoStato = '';
  function meteo() {
    var pos = jget(POS, null);
    if (!pos) return Promise.resolve(null);
    var c = jget(MET, null);
    if (c && c.lat === pos.lat && c.lng === pos.lng && Date.now() - c.ts < 3600000) return Promise.resolve(c);
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + pos.lat + '&longitude=' + pos.lng +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,snowfall_sum,sunrise,sunset' +
      '&hourly=visibility,temperature_2m,precipitation&forecast_days=4&timezone=auto';
    return fetch(url).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function(d) {
      var out = { ts: Date.now(), lat: pos.lat, lng: pos.lng, d: d };
      jset(MET, out); return out;
    });
  }
  function giornoMeteo(d, i) {
    var D = d.daily, H = d.hourly, day = D.time[i];
    var tmin = D.temperature_2m_min[i], tmax = D.temperature_2m_max[i], mm = D.precipitation_sum[i] || 0, prob = D.precipitation_probability_max ? D.precipitation_probability_max[i] : null;
    var gust = D.wind_gusts_10m_max ? D.wind_gusts_10m_max[i] || 0 : 0, neve = D.snowfall_sum ? D.snowfall_sum[i] || 0 : 0, code = D.weather_code[i];
    // nebbia e ghiaccio nelle ore in cui si guida (6-22)
    var visMin = null, gelo = false;
    H.time.forEach(function(t, k) {
      if (t.slice(0, 10) !== day) return;
      var h = +t.slice(11, 13);
      if (h < 6 || h > 22) return;
      if (H.visibility && H.visibility[k] != null) visMin = visMin == null ? H.visibility[k] : Math.min(visMin, H.visibility[k]);
      if (H.temperature_2m[k] <= 1 && ((H.precipitation && H.precipitation[k] > 0) || mm > 0)) gelo = true;
    });
    var av = [];
    if (neve > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86) av.push(['bad', '❄ neve']);
    if (gelo) av.push(['bad', '🧊 ghiaccio']);
    else if (tmin <= 0) av.push(['warn', '🧊 gelo al mattino']);
    if (code >= 95) av.push(['bad', '⛈ temporali']);
    if (mm >= 5) av.push(['warn', '🌧 ' + Math.round(mm) + ' mm']);
    else if (mm >= 0.5 || (prob != null && prob >= 60)) av.push(['warn', '🌦 pioggia']);
    if (visMin != null && visMin < 1000) av.push([visMin < 300 ? 'bad' : 'warn', '🌫 nebbia']);
    if (gust >= 60) av.push(['bad', '💨 raffiche ' + Math.round(gust)]);
    else if (gust >= 45) av.push(['warn', '💨 vento']);
    var lv = av.some(function(a) { return a[0] === 'bad'; }) ? 'bad' : av.length ? 'warn' : 'ok';
    var dt = new Date(day + 'T12:00:00');
    return { lbl: i === 0 ? 'Oggi' : i === 1 ? 'Domani' : GIORNI[dt.getDay()].slice(0, 3) + ' ' + dt.getDate(), code: code, tmin: tmin, tmax: tmax, av: av, lv: lv };
  }
  var ICO = function(c) { return c === 0 ? '☀️' : c <= 2 ? '🌤' : c === 3 ? '☁️' : c <= 48 ? '🌫' : c <= 57 ? '🌦' : c <= 67 ? '🌧' : c <= 77 ? '🌨' : c <= 82 ? '🌧' : c <= 86 ? '🌨' : '⛈'; };
  function renderMeteo(M) {
    var pos = jget(POS, null);
    if (!pos) return card('🌦 Meteo per guidare', '<p class="og-p">Mostro pioggia, ghiaccio, nebbia e vento di oggi e dei prossimi giorni dove ti trovi.</p><button class="og-btn" onclick="ogPosizione()">📍 Usa la mia posizione</button>' + (meteoStato ? '<p class="og-p og-err">' + esc(meteoStato) + '</p>' : ''));
    if (!M) return card('🌦 Meteo per guidare', '<p class="og-p og-small">' + (meteoStato ? esc(meteoStato) : 'Carico il meteo…') + '</p>');
    var g = [0, 1, 2, 3].map(function(i) { return giornoMeteo(M.d, i); }), o = g[0];
    var frase = o.lv === 'ok' ? 'Strade asciutte, nessun avviso.' : o.av.map(function(a) { return a[1].replace(/^\S+ /, ''); }).join(', ').replace(/^./, function(c) { return c.toUpperCase(); }) + '.';
    var mese = new Date().getMonth() + 1, giorno = new Date().getDate();
    var inverno = (mese === 11 && giorno >= 15) || mese === 12 || mese <= 3 || (mese === 4 && giorno <= 15);
    return card('🌦 Meteo per guidare <small>' + esc(pos.nome || 'qui') + ' · <button type="button" class="og-link" onclick="ogPosizione()">aggiorna</button></small>',
      '<div class="og-today og-lv-' + o.lv + '"><span class="og-big">' + ICO(o.code) + '</span><div><b>' + Math.round(o.tmin) + '° / ' + Math.round(o.tmax) + '°</b><p>' + esc(frase) + '</p></div></div>' +
      '<div class="og-days">' + g.slice(1).map(function(x) {
        return '<div class="og-day og-lv-' + x.lv + '"><small>' + esc(x.lbl) + '</small><span>' + ICO(x.code) + '</span><b>' + Math.round(x.tmin) + '° / ' + Math.round(x.tmax) + '°</b>' +
          '<i>' + (x.av.length ? esc(x.av.map(function(a) { return a[1]; }).slice(0, 2).join(' ')) : 'ok') + '</i></div>';
      }).join('') + '</div>' +
      (inverno ? '<p class="og-p og-small">Fino al 15 aprile su molte strade servono gomme invernali o catene a bordo.</p>' : ''));
  }
  window.ogPosizione = function() {
    if (!navigator.geolocation) { meteoStato = 'Posizione non disponibile su questo dispositivo.'; render(); return; }
    meteoStato = 'Cerco la posizione…'; render();
    navigator.geolocation.getCurrentPosition(function(p) {
      var pos = { lat: +p.coords.latitude.toFixed(2), lng: +p.coords.longitude.toFixed(2), nome: '' };   // ~1 km: basta per il meteo
      jset(POS, pos); meteoStato = '';
      fetch('https://photon.komoot.io/reverse?lat=' + pos.lat + '&lon=' + pos.lng + '&limit=1').then(function(r) { return r.json(); }).then(function(d) {
        var pr = d.features && d.features[0] && d.features[0].properties;
        if (pr) { pos.nome = pr.city || pr.town || pr.village || pr.name || ''; jset(POS, pos); render(); }
      }).catch(function() {});
      render();
    }, function(e) { meteoStato = 'Posizione non concessa: ' + (e.message || e.code); render(); }, { timeout: 10000, maximumAge: 600000 });
  };

  /* ── Pieno o ricarica ──────────────────────────────────────────── */
  function renderEnergia() {
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) return '';
    var E = window.hubEnergia ? window.hubEnergia(v) : null, P = window.hubFuelLog ? window.hubFuelLog.ricPref() : { casa: .2, colonnina: .7, consEv: 17 };
    if (v.alim === 'plugin' || v.alim === 'elettrica') {
      return card('🔌 Energia · ' + esc(vName(v)),
        (E ? '<div class="og-kpis"><div><small>In elettrico</small><b>' + Math.round(E.quotaEv * 100) + '%</b></div><div><small>Ogni 100 km</small><b>' + eur(E.eurKm * 100) + ' €</b></div><div><small>Ricarica a casa</small><b>' + eur(P.consEv * P.casa) + ' €</b><small>per 100 km</small></div></div>'
           : '<p class="og-p">Registra rifornimenti e ricariche con i km: ti dico quanta strada fai in elettrico e quanto ti costa. A casa 100 km costano circa ' + eur(P.consEv * P.casa) + ' €, in colonnina ' + eur(P.consEv * P.colonnina) + ' €.</p>') +
        '<div class="og-row"><button class="og-btn" onclick="hubGo(\'garage\');setTimeout(function(){openFuelLogEdit(null)},250)">+ Ricarica o pieno</button><button class="og-btn og-ghost" onclick="hubGo(\'fuel\')">Distributori</button></div>');
    }
    var fuel = /diesel/.test(v.alim || '') ? 'Diesel' : v.alim === 'gpl' ? 'GPL' : v.alim === 'metano' ? 'Metano' : 'Benzina';
    var m = window.hubMedie || jget('hub_medie_v1', null), d = m && m[fuel], prezzo = d ? (d.self || d.serv) : null;
    var favs = typeof window.loadFavs === 'function' ? window.loadFavs() : [];
    var fav = favs.filter(function(f) { return String(f.carburante || '').toLowerCase().indexOf(fuel.toLowerCase()) >= 0 && typeof f.prezzo === 'number'; })[0];
    var serb = v.serbatoio || (v.specs && v.specs.serbatoio_l) || null;
    var p = fav ? fav.prezzo : prezzo;
    if (!p) return '';
    return card('⛽ ' + fuel + ' · ' + esc(vName(v)),
      '<div class="og-kpis"><div><small>' + (fav ? esc(fav.customName || fav.nome || 'Preferito') : 'Media nazionale self') + '</small><b>' + p.toFixed(3).replace('.', ',') + ' €/l</b></div>' +
      (serb ? '<div><small>Pieno da ' + Math.round(serb) + ' l</small><b>≈ ' + Math.round(serb * p) + ' €</b></div>' : '') + '</div>' +
      '<div class="og-row"><button class="og-btn" onclick="hubGo(\'fuel\')">Distributori vicini</button></div>');
  }

  /* ── Ultima uscita ─────────────────────────────────────────────── */
  function renderUscita() {
    var rides = jget('hub_rides_v1', []);
    if (!rides.length) return '';
    var r = rides.slice().sort(function(a, b) { return (b.startTs || 0) - (a.startTs || 0); })[0];
    var m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    var mese = rides.filter(function(x) { return (x.startTs || 0) >= m0.getTime(); }).reduce(function(a, x) { return a + (x.distanceKm || 0); }, 0);
    var d = new Date(r.startTs);
    return card('🏁 Ultima uscita',
      '<button type="button" class="og-ride" onclick="openRideLog();setTimeout(function(){hubRideLogOpen(\'' + esc(r.id) + '\')},150)"><b>' + esc(r.title || (d.getDate() + ' ' + MESI[d.getMonth()])) + '</b>' +
      '<span>' + (r.distanceKm || 0).toFixed(0) + ' km' + (r.passi && r.passi.length ? ' · ⛰ ' + esc(r.passi.slice(0, 2).join(', ')) : '') + '</span></button>' +
      '<p class="og-p og-small">Questo mese: ' + Math.round(mese).toLocaleString('it-IT') + ' km</p>');
  }

  /* ── Backup automatico ─────────────────────────────────────────── */
  function renderBackup() {
    if (!garage().length) return '';
    var c = jget('hub_cloud_v1', null);
    if (!c || !c.code) return card('💾 Backup', '<p class="og-p">I tuoi dati sono solo su questo telefono. Con il backup cloud cifrato si salvano da soli (all\'apertura ogni 12 ore e quando chiudi l\'app): ti basta conservare un codice.</p><button class="og-btn og-ghost" onclick="hubBackupOpen()">Attiva il backup automatico</button>');
    var g = c.lastAt ? Math.floor((Date.now() - c.lastAt) / 86400000) : null;
    if (g == null || g >= 7) return card('💾 Backup', '<p class="og-p og-err">' + (g == null ? 'Nessun backup ancora salvato.' : 'Ultimo backup ' + g + ' giorni fa: forse non riesce a partire.') + '</p><button class="og-btn og-ghost" onclick="hubBackupOpen()">Salva ora</button>', 'og-c-crit');
    return '';
  }

  function card(t, body, cls) { return '<section class="og-card ' + (cls || '') + '"><h2 class="og-h">' + t + '</h2>' + body + '</section>'; }

  var _M = null;
  function render() {
    var root = $('oggi-root'); if (!root) return;
    var now = new Date(), v = window.hubGarage && window.hubGarage.active(), g = garage();
    var h = now.getHours(), saluto = h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    root.innerHTML =
      '<header class="og-hdr"><h1>' + saluto + '</h1><small>' + GIORNI[now.getDay()] + ' ' + now.getDate() + ' ' + MESI[now.getMonth()] + '</small>' +
        (g.length > 1 ? '<div class="og-veh" role="group" aria-label="Veicolo attivo">' + g.map(function(x) {
          return '<button type="button" class="' + (v && v.id === x.id ? 'on' : '') + '" onclick="ogVeicolo(\'' + esc(x.id) + '\')">' + (x.type === 'moto' ? '🏍 ' : '🚗 ') + esc(vName(x)) + '</button>';
        }).join('') + '</div>' : '') + '</header>' +
      renderDaFare() + renderMeteo(_M) + renderEnergia() + renderUscita() + renderBackup() +
      card('Strumenti', '<div class="og-tools">' +
        '<button onclick="openGiro()"><span>🗺</span>Giro della domenica</button>' +
        '<button onclick="hubGo(\'meteo\')"><span>🌦</span>Meteo percorso</button>' +
        '<button onclick="hubGo(\'ride\')"><span>🏁</span>Ride</button>' +
        '<button onclick="hubGo(\'passi\')"><span>⛰</span>Passi e strade</button></div>');
  }
  window.ogVeicolo = function(id) { if (window.hubGarage) window.hubGarage.setActive(id); if (window._hubRefreshGarageBadge) window._hubRefreshGarageBadge(); render(); };
  window.oggiInit = function() {
    render();
    // richiami ufficiali (cache 1 giorno per modello): aggiorna Da fare se ce ne sono
    if (window.hubRichiamiAggiorna) window.hubRichiamiAggiorna().then(function() { render(); });
    // prezzi medi del giorno, se la sezione Carburanti non li ha ancora caricati
    if (!window.hubMedie && !jget('hub_medie_v1', null) && typeof WORKER !== 'undefined') {
      fetch(WORKER + '/api/medie').then(function(r) { return r.ok ? r.json() : null; }).then(function(d) { if (d && d.Benzina) { window.hubMedie = d; render(); } }).catch(function() {});
    }
    if (jget(POS, null)) meteo().then(function(M) { _M = M; meteoStato = ''; render(); }).catch(function(e) { meteoStato = 'Meteo non disponibile ora (' + e.message + ').'; render(); });
  };
  // dopo aver scelto la posizione, ricarica il meteo
  var _origPos = window.ogPosizione;
  window.ogPosizione = function() {
    _origPos();
    var t0 = Date.now(), iv = setInterval(function() {
      var p = jget(POS, null);
      if (p && (!_M || _M.lat !== p.lat || _M.lng !== p.lng)) { clearInterval(iv); window.oggiInit(); }
      else if (Date.now() - t0 > 15000) clearInterval(iv);
    }, 400);
  };
  window._oggiInternals = { daFare: daFare, giornoMeteo: giornoMeteo, render: render };
})();
