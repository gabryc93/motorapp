/* ═════════════════════════════════════════════════════════════════
   HUB MOTORSPORT & TRACK DAY
   F1 e MotoGP live (calendario, risultati, classifiche); WSBK, WRC e
   track day da dati inseriti a mano. Le liste sotto fanno da riserva offline.
   ═════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Calendar 2026 (curated). Dates are race-day; "weekend" implies Fri-Sun typically.
  // category: 'f1' | 'mgp' | 'sbk' | 'wrc'
  var RACES = [
    // F1 2026 — 23 GP; riserva offline, i dati live arrivano da Jolpica (verificato il 16/11/2026)
    { cat:'f1', date:'2026-03-08', name:"GP d'Australia", circuit:'Albert Park', country:'Australia' },
    { cat:'f1', date:'2026-03-15', name:'GP di Cina', circuit:'Shanghai', country:'Cina' },
    { cat:'f1', date:'2026-03-29', name:'GP del Giappone', circuit:'Suzuka', country:'Giappone' },
    { cat:'f1', date:'2026-05-03', name:'GP di Miami', circuit:'Miami', country:'USA' },
    { cat:'f1', date:'2026-05-24', name:'GP del Canada', circuit:'Gilles-Villeneuve', country:'Canada' },
    { cat:'f1', date:'2026-06-07', name:'GP di Monaco', circuit:'Monte Carlo', country:'Monaco' },
    { cat:'f1', date:'2026-06-14', name:'GP di Barcellona-Catalogna', circuit:'Circuit de Catalunya', country:'Spagna' },
    { cat:'f1', date:'2026-06-28', name:"GP d'Austria", circuit:'Red Bull Ring', country:'Austria' },
    { cat:'f1', date:'2026-07-05', name:'GP di Gran Bretagna', circuit:'Silverstone', country:'UK' },
    { cat:'f1', date:'2026-07-19', name:'GP del Belgio', circuit:'Spa-Francorchamps', country:'Belgio' },
    { cat:'f1', date:'2026-07-26', name:"GP d'Ungheria", circuit:'Hungaroring', country:'Ungheria' },
    { cat:'f1', date:'2026-08-23', name:"GP d'Olanda", circuit:'Zandvoort', country:'Olanda' },
    { cat:'f1', date:'2026-09-06', name:"GP d'Italia", circuit:'Monza', country:'Italia' },
    { cat:'f1', date:'2026-09-13', name:'GP di Madrid', circuit:'IFEMA Madrid', country:'Spagna' },
    { cat:'f1', date:'2026-09-26', name:"GP dell'Azerbaigian", circuit:'Baku', country:'Azerbaigian' },
    { cat:'f1', date:'2026-10-04', name:'GP del Bahrain (a Sepang)', circuit:'Sepang', country:'Malesia' },
    { cat:'f1', date:'2026-10-11', name:'GP di Singapore', circuit:'Marina Bay', country:'Singapore' },
    { cat:'f1', date:'2026-10-25', name:'GP degli Stati Uniti', circuit:'COTA', country:'USA' },
    { cat:'f1', date:'2026-11-01', name:'GP del Messico', circuit:'Città del Messico', country:'Messico' },
    { cat:'f1', date:'2026-11-08', name:'GP del Brasile', circuit:'Interlagos', country:'Brasile' },
    { cat:'f1', date:'2026-11-22', name:'GP di Las Vegas', circuit:'Las Vegas', country:'USA' },
    { cat:'f1', date:'2026-11-29', name:'GP del Qatar', circuit:'Lusail', country:'Qatar' },
    { cat:'f1', date:'2026-12-06', name:'GP di Abu Dhabi', circuit:'Yas Marina', country:'EAU' },
    // MotoGP 2026 — 22 GP, date verificate sull'API ufficiale motogp.com il 16/11/2026
    { cat:'mgp', date:'2026-03-01', name:'GP della Thailandia', circuit:'Chang Circuit Buriram', country:'Thailandia' },
    { cat:'mgp', date:'2026-03-22', name:'GP del Brasile', circuit:'Goiania', country:'Brasile' },
    { cat:'mgp', date:'2026-03-29', name:'GP degli Stati Uniti', circuit:'COTA', country:'USA' },
    { cat:'mgp', date:'2026-04-26', name:'GP di Spagna', circuit:'Jerez', country:'Spagna' },
    { cat:'mgp', date:'2026-05-10', name:'GP di Francia', circuit:'Le Mans', country:'Francia' },
    { cat:'mgp', date:'2026-05-17', name:'GP di Catalogna', circuit:'Circuit de Catalunya', country:'Spagna' },
    { cat:'mgp', date:'2026-05-31', name:"GP d'Italia", circuit:'Mugello', country:'Italia' },
    { cat:'mgp', date:'2026-06-07', name:"GP d'Ungheria", circuit:'Balaton Park', country:'Ungheria' },
    { cat:'mgp', date:'2026-06-21', name:'GP di Repubblica Ceca', circuit:'Brno', country:'Repubblica Ceca' },
    { cat:'mgp', date:'2026-06-28', name:"GP d'Olanda", circuit:'Assen', country:'Olanda' },
    { cat:'mgp', date:'2026-07-12', name:'GP di Germania', circuit:'Sachsenring', country:'Germania' },
    { cat:'mgp', date:'2026-08-09', name:'GP di Gran Bretagna', circuit:'Silverstone', country:'UK' },
    { cat:'mgp', date:'2026-08-30', name:'GP di Aragona', circuit:'MotorLand', country:'Spagna' },
    { cat:'mgp', date:'2026-09-13', name:'GP di San Marino', circuit:'Misano', country:'Italia' },
    { cat:'mgp', date:'2026-09-20', name:"GP d'Austria", circuit:'Red Bull Ring', country:'Austria' },
    { cat:'mgp', date:'2026-10-04', name:'GP del Giappone', circuit:'Motegi', country:'Giappone' },
    { cat:'mgp', date:'2026-10-11', name:"GP d'Indonesia", circuit:'Mandalika', country:'Indonesia' },
    { cat:'mgp', date:'2026-10-25', name:"GP d'Australia", circuit:'Phillip Island', country:'Australia' },
    { cat:'mgp', date:'2026-11-01', name:'GP della Malesia', circuit:'Sepang', country:'Malesia' },
    { cat:'mgp', date:'2026-11-08', name:'GP del Qatar', circuit:'Lusail', country:'Qatar' },
    { cat:'mgp', date:'2026-11-22', name:'GP del Portogallo', circuit:'Portimão', country:'Portogallo' },
    { cat:'mgp', date:'2026-11-29', name:'GP di Valencia', circuit:'Ricardo Tormo', country:'Spagna' },
    // WSBK 2026 — 12 round
    { cat:'sbk', date:'2026-02-22', name:'Round Australia', circuit:'Phillip Island', country:'Australia' },
    { cat:'sbk', date:'2026-03-29', name:'Round Portogallo', circuit:'Algarve (Portimão)', country:'Portogallo' },
    { cat:'sbk', date:'2026-04-19', name:'Round Olanda', circuit:'Assen', country:'Olanda' },
    { cat:'sbk', date:'2026-05-03', name:'Round Ungheria', circuit:'Balaton Park', country:'Ungheria' },
    { cat:'sbk', date:'2026-05-17', name:'Round Repubblica Ceca', circuit:'Most', country:'Repubblica Ceca' },
    { cat:'sbk', date:'2026-05-31', name:'Round Aragona', circuit:'MotorLand', country:'Spagna' },
    { cat:'sbk', date:'2026-06-14', name:'Round San Marino', circuit:'Misano', country:'Italia' },
    { cat:'sbk', date:'2026-07-12', name:'Round Donington', circuit:'Donington Park', country:'UK' },
    { cat:'sbk', date:'2026-09-06', name:'Round Francia', circuit:'Magny-Cours', country:'Francia' },
    { cat:'sbk', date:'2026-09-27', name:'Round Italia', circuit:'Cremona Circuit', country:'Italia' },
    { cat:'sbk', date:'2026-10-11', name:'Round Estoril', circuit:'Estoril', country:'Portogallo' },
    { cat:'sbk', date:'2026-10-18', name:'Round Spagna', circuit:'Jerez', country:'Spagna' },
    // WRC 2026 — 14 round
    { cat:'wrc', date:'2026-01-25', name:'Rallye Monte-Carlo', circuit:'Monte Carlo', country:'Monaco' },
    { cat:'wrc', date:'2026-02-15', name:'Rally di Svezia', circuit:'Umeå', country:'Svezia' },
    { cat:'wrc', date:'2026-03-15', name:'Safari Rally Kenya', circuit:'Naivasha', country:'Kenya' },
    { cat:'wrc', date:'2026-04-12', name:'Rally di Croazia', circuit:'Zagabria', country:'Croazia' },
    { cat:'wrc', date:'2026-04-26', name:'Rally Isole Canarie', circuit:'Las Palmas', country:'Spagna' },
    { cat:'wrc', date:'2026-05-10', name:'Rally del Portogallo', circuit:'Matosinhos', country:'Portogallo' },
    { cat:'wrc', date:'2026-05-31', name:'Rally del Giappone', circuit:'Aichi', country:'Giappone' },
    { cat:'wrc', date:'2026-06-28', name:'Acropolis Rally Grecia', circuit:'Atene', country:'Grecia' },
    { cat:'wrc', date:'2026-07-19', name:"Rally d'Estonia", circuit:'Tartu', country:'Estonia' },
    { cat:'wrc', date:'2026-08-02', name:'Rally di Finlandia', circuit:'Jyväskylä', country:'Finlandia' },
    { cat:'wrc', date:'2026-08-30', name:'Rally del Paraguay', circuit:'Asunción', country:'Paraguay' },
    { cat:'wrc', date:'2026-09-13', name:'Rally del Cile', circuit:'Concepción', country:'Cile' },
    { cat:'wrc', date:'2026-10-04', name:"Rally d'Italia Sardegna", circuit:'Alghero', country:'Italia' },
    { cat:'wrc', date:'2026-11-14', name:"Rally d'Arabia Saudita", circuit:'Jeddah', country:'Arabia Saudita' }
  ];

  // Circuiti italiani. Niente date: quelle inserite a mano erano inventate o superate.
  // url = sito ufficiale verificato; se assente si apre la ricerca del calendario.
  // lat/lng approssimativi, servono solo per la distanza indicativa.
  var CIRCUITS = [
    { name:'Autodromo di Monza', city:'Monza (MB)', type:'mix', lat:45.62, lng:9.28, url:'https://www.monzanet.it/' },
    { name:'Cremona Circuit', city:'San Martino del Lago (CR)', type:'mix', lat:45.07, lng:10.31, url:'https://cremonacircuit.it/' },
    { name:'Autodromo di Franciacorta', city:'Castrezzato (BS)', type:'mix', lat:45.51, lng:9.98 },
    { name:'Autodromo Riccardo Paletti', city:"Varano de' Melegari (PR)", type:'mix', lat:44.68, lng:10.02, url:'https://www.autodromovarano.it/' },
    { name:'Autodromo di Modena', city:'Marzaglia (MO)', type:'mix', lat:44.62, lng:10.83, url:'https://www.autodromodimodena.it/' },
    { name:'Autodromo Enzo e Dino Ferrari', city:'Imola (BO)', type:'mix', lat:44.34, lng:11.71, url:'https://www.autodromoimola.it/' },
    { name:'Adria International Raceway', city:'Adria (RO)', type:'mix', lat:45.05, lng:12.15 },
    { name:'Misano World Circuit', city:'Misano Adriatico (RN)', type:'mix', lat:43.96, lng:12.68, url:'https://www.misanocircuit.com/' },
    { name:'Autodromo del Mugello', city:'Scarperia (FI)', type:'mix', lat:43.99, lng:11.37, url:'https://www.mugellocircuit.com/' },
    { name:"Autodromo dell'Umbria", city:'Magione (PG)', type:'mix', lat:43.14, lng:12.24 },
    { name:'Autodromo di Vallelunga', city:'Campagnano di Roma (RM)', type:'mix', lat:42.16, lng:12.37, url:'https://www.vallelunga.it/' }
  ];
  var TRACKDAYS = [];   // compatibilità: non più usato


  /* ════════════════════════════════════════════════════════════════
     DATI LIVE
     · F1     → api.jolpi.ca (Ergast), chiamata diretta dal browser
     · MotoGP → API ufficiale pulselive, tramite il Worker (/api/motogp)
       perché l'API non permette chiamate dirette dal browser (CORS)
     · WSBK / WRC / track day → dati inseriti a mano qui sopra
     Le risposte restano in cache (localStorage) per non ripetere le chiamate.
     ════════════════════════════════════════════════════════════════ */
  var SEASON = 2026;
  var JOLPICA = 'https://api.jolpi.ca/ergast/f1/' + SEASON;
  function workerBase() {
    try { if (typeof WORKER === 'string' && WORKER) return WORKER; } catch (e) {}
    return window.WORKER || 'https://osservaprezzi.gabrycois.workers.dev';
  }
  var CACHE_KEY = 'hub_ms_cache_v1';
  var _cache = (function() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; } })();
  function saveCache() {
    try {
      var keys = Object.keys(_cache);
      if (keys.length > 120) keys.sort(function(a, b) { return _cache[a].t - _cache[b].t; }).slice(0, keys.length - 120).forEach(function(k) { delete _cache[k]; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(_cache));
    } catch (e) {}
  }
  // ttl in minuti. Se la rete fallisce si usa la copia scaduta, se c'è.
  function getJSON(url, ttl) {
    var c = _cache[url];
    if (c && Date.now() - c.t < ttl * 60000) return Promise.resolve(c.d);
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function() { ctrl.abort(); }, 12000) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(d) {
      clearTimeout(timer);
      _cache[url] = { t: Date.now(), d: d }; saveCache();
      return d;
    }).catch(function(e) {
      clearTimeout(timer);
      if (c) return c.d;
      throw e;
    });
  }
  function mgp(path, params, ttl) {
    var q = 'path=' + encodeURIComponent(path) + (params ? '&' + params : '');
    return getJSON(workerBase() + '/api/motogp?' + q, ttl);
  }

  /* ── Calendari live (sostituiscono quelli inseriti a mano) ───────── */
  var _live = { f1: null, mgp: null };   // array di gare, o null se non disponibili
  var _liveState = { f1: 'idle', mgp: 'idle' };

  function itName(dateStr, cat, fallback) {
    // Riusa il nome italiano della lista locale se la data coincide (±2 giorni)
    var t = new Date(dateStr + 'T12:00:00').getTime();
    for (var i = 0; i < RACES.length; i++) {
      var r = RACES[i];
      if (r.cat === cat && Math.abs(new Date(r.date + 'T12:00:00').getTime() - t) <= 2 * 86400000) return r;
    }
    return { name: fallback, circuit: '', country: '' };
  }
  function titleCase(s) {
    return String(s || '').toLowerCase().replace(/(^|\s|-)(\p{L})/gu, function(m, a, b) { return a + b.toUpperCase(); });
  }

  var F1_STATUS = { Finished: 'Arrivato', Collision: 'Collisione', Accident: 'Incidente', Retired: 'Ritirato', Engine: 'Motore',
    Gearbox: 'Cambio', Hydraulics: 'Idraulica', Brakes: 'Freni', Suspension: 'Sospensioni', 'Power Unit': 'Power unit',
    Disqualified: 'Squalificato', 'Did not start': 'Non partito', Withdrew: 'Ritirato', 'Collision damage': 'Danni da collisione',
    Spun: 'Testacoda', 'Spun off': 'Testacoda', 'Puncture': 'Foratura', 'Electrical': 'Impianto elettrico', 'Overheating': 'Surriscaldamento' };
  function f1Status(st) {
    st = String(st || '');
    var m = /^\+(\d+) Laps?$/.exec(st);
    if (m) return '+' + m[1] + (m[1] === '1' ? ' giro' : ' giri');
    return F1_STATUS[st] || st;
  }
  var F1_IT = { 'Bahrain Grand Prix in Malaysia': 'GP del Bahrain (a Sepang)' };
  function loadF1Schedule() {
    if (_liveState.f1 === 'loading' || _liveState.f1 === 'ok') return;
    _liveState.f1 = 'loading';
    getJSON(JOLPICA + '.json', 360).then(function(j) {
      var races = j.MRData.RaceTable.Races;
      _live.f1 = races.map(function(r) {
        var loc = F1_IT[r.raceName] ? { name: F1_IT[r.raceName] } : itName(r.date, 'f1', r.raceName);
        return {
          cat: 'f1', live: true, date: r.date, time: r.time || '', round: r.round,
          name: loc.name === r.raceName ? r.raceName.replace('Grand Prix', 'GP') : loc.name,
          circuit: r.Circuit.circuitName, country: (r.Circuit.Location || {}).country || loc.country,
          sessions: f1Sessions(r), sprint: !!r.Sprint
        };
      });
      _liveState.f1 = 'ok';
      renderMS();
    }).catch(function() { _liveState.f1 = 'err'; renderMS(); });
  }
  function f1Sessions(r) {
    var map = [['FirstPractice', 'Libere 1'], ['SecondPractice', 'Libere 2'], ['ThirdPractice', 'Libere 3'],
               ['SprintQualifying', 'Qualifiche Sprint'], ['Sprint', 'Sprint'], ['Qualifying', 'Qualifiche']];
    var out = [];
    map.forEach(function(m) { if (r[m[0]] && r[m[0]].date) out.push({ label: m[1], iso: r[m[0]].date + 'T' + (r[m[0]].time || '00:00:00Z') }); });
    out.push({ label: 'Gara', iso: r.date + 'T' + (r.time || '00:00:00Z') });
    return out.sort(function(a, b) { return new Date(a.iso) - new Date(b.iso); });
  }

  var _mgpSeason = null;
  function mgpSeasonId() {
    if (_mgpSeason) return Promise.resolve(_mgpSeason);
    return mgp('seasons', '', 1440).then(function(list) {
      var s = list.filter(function(x) { return x.year === SEASON; })[0];
      if (!s) throw new Error('stagione non trovata');
      _mgpSeason = s.id; return s.id;
    });
  }
  // Nomi italiani dei GP MotoGP per sigla evento (l'API li dà in inglese)
  var MGP_STATUS = { OUTSTND: 'Non classificato', NOTSTARTED: 'Non partito', NOTFINISHFIRST: 'Ritirato', DSQ: 'Squalificato', INSTND: '' };
  var MGP_IT = {
    THA: 'GP della Thailandia', BRA: 'GP del Brasile', USA: 'GP degli Stati Uniti', ARG: "GP d'Argentina", QAT: 'GP del Qatar',
    SPA: 'GP di Spagna', FRA: 'GP di Francia', CAT: 'GP di Catalogna', ITA: "GP d'Italia", HUN: "GP d'Ungheria",
    CZE: 'GP di Repubblica Ceca', NED: "GP d'Olanda", GER: 'GP di Germania', GBR: 'GP di Gran Bretagna', ARA: 'GP di Aragona',
    RSM: 'GP di San Marino', AUT: "GP d'Austria", JPN: 'GP del Giappone', INA: "GP d'Indonesia", AUS: "GP d'Australia",
    MAL: 'GP della Malesia', POR: 'GP del Portogallo', VAL: 'GP di Valencia', KAZ: 'GP del Kazakistan', IND: "GP dell'India"
  };
  // L'API MotoGP rifiuta le richieste che arrivano dai server (anche dal Worker) e non
  // permette quelle dirette dal browser: i dati live non sono raggiungibili. Si usa il
  // calendario salvato qui sopra e, per i risultati, il link al sito ufficiale.
  var MGP_LIVE = false;
  function loadMgpSchedule() {
    if (!MGP_LIVE) { _liveState.mgp = 'off'; return; }
    if (_liveState.mgp === 'loading' || _liveState.mgp === 'ok') return;
    _liveState.mgp = 'loading';
    mgpSeasonId().then(function(sid) {
      return Promise.all([
        mgp('events', 'seasonUuid=' + sid + '&isFinished=true', 60),
        mgp('events', 'seasonUuid=' + sid + '&isFinished=false', 360)
      ]);
    }).then(function(res) {
      var all = res[0].concat(res[1]).filter(function(e) { return !e.test; });
      _live.mgp = all.map(function(e) {
        // Nome dalla sigla; altrimenti quello inglese (l'abbinamento per data con la lista locale
        // sbaglia quando il calendario è cambiato, es. Qatar spostato)
        var loc = { name: MGP_IT[e.short_name] || titleCase(e.name).replace('Grand Prix', 'GP'), country: '' };
        return {
          cat: 'mgp', live: true, date: e.date_end, dateStart: e.date_start, id: e.id,
          name: loc.name, finished: e.status === 'FINISHED',
          circuit: (e.circuit && e.circuit.name) || loc.circuit, country: loc.country || (e.country && e.country.name) || ''
        };
      });
      _liveState.mgp = 'ok';
      renderMS();
    }).catch(function() { _liveState.mgp = 'err'; renderMS(); });
  }
  function allRaces() {
    var out = [];
    ['f1', 'mgp'].forEach(function(c) {
      if (_live[c]) out = out.concat(_live[c]);
      else out = out.concat(RACES.filter(function(r) { return r.cat === c; }));
    });
    return out.concat(RACES.filter(function(r) { return r.cat === 'sbk' || r.cat === 'wrc'; }));
  }

  /* ── UI ──────────────────────────────────────────────────────────── */
  /* ── Preferiti (piloti e squadre) ────────────────────────────────── */
  var PREFS = 'hub_ms_prefs_v1';
  function prefs() { try { var p = JSON.parse(localStorage.getItem(PREFS) || '{}'); p.fav = p.fav || []; return p; } catch (e) { return { fav: [] }; } }
  function isFavName(n) { return n && prefs().fav.indexOf(n) >= 0; }
  function toggleFavName(n) {
    var p = prefs(), i = p.fav.indexOf(n);
    if (i >= 0) p.fav.splice(i, 1); else p.fav.push(n);
    try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) {}
  }

  var CAT_LABELS = { f1: 'F1', mgp: 'MotoGP', sbk: 'WSBK', wrc: 'WRC' };
  var TYPE_LABELS = { auto: 'Auto', moto: 'Moto', mix: 'Mixed' };
  var MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  var OFFICIAL = {
    sbk: 'https://www.worldsbk.com/en/results-and-standings',
    wrc: 'https://www.wrc.com/en/results/',
    f1: 'https://www.formula1.com/en/results/' + SEASON + '/races',
    mgp: 'https://www.motogp.com/en/gp-results'
  };
  function localDate(d) {   // "2026-03-08" → Date a mezzogiorno locale (evita lo slittamento UTC)
    return new Date(d + 'T12:00:00');
  }
  function fmtSession(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function injectMSUI() {
    if (document.getElementById('ms-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'ms-overlay';
    ov.innerHTML =
      '<div class="ms-hdr">' +
        '<h2>MOTORSPORT &amp; PISTA<small id="ms-sub">Stagione ' + SEASON + '</small></h2>' +
        '<button class="gar-close" onclick="closeMotorsport()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="ms-segctrl">' +
        '<button class="ms-seg on" data-tab="races">🏁 Gare</button>' +
        '<button class="ms-seg" data-tab="standings">🏆 Classifiche</button>' +
        '<button class="ms-seg" data-tab="track">🏎 Circuiti</button>' +
      '</div>' +
      '<div class="ms-body" id="ms-body"></div>' +
      '<div id="ms-detail" class="ms-detail" role="dialog" aria-label="Dettaglio gara">' +
        '<div class="ms-hdr"><h2 id="ms-d-title">Gara<small id="ms-d-sub"></small></h2>' +
        '<button class="gar-close" data-act="close-detail">← Indietro</button></div>' +
        '<div class="ms-body" id="ms-d-body"></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', onClick);
  }
  var _msTab = 'races';
  var _msFilter = 'all';
  var _stCat = 'f1d';

  function onClick(ev) {
    var t;
    if ((t = ev.target.closest('[data-act="close-detail"]'))) { closeDetail(); return; }
    if ((t = ev.target.closest('.ms-seg'))) {
      _msTab = t.dataset.tab; _msFilter = 'all';
      document.querySelectorAll('.ms-seg').forEach(function(s) { s.classList.toggle('on', s.dataset.tab === _msTab); });
      renderMS(); return;
    }
    if ((t = ev.target.closest('[data-fav]'))) { toggleFavName(t.dataset.fav); if (_dRace) renderDetail(); else renderMS(); return; }
    if ((t = ev.target.closest('[data-act="ics"]'))) { exportWeekend(); return; }
    // Prima i pulsanti specifici: hanno anche la classe .ms-fbtn (solo per lo stile)
    if ((t = ev.target.closest('.ms-stbtn'))) { _stCat = t.dataset.st; renderMS(); return; }
    if ((t = ev.target.closest('.ms-dtab'))) { _dTab = t.dataset.t; renderDetail(); return; }
    if ((t = ev.target.closest('.ms-dcls'))) { _dClass = t.dataset.c; _dTab = 'RAC'; renderDetail(); return; }
    if ((t = ev.target.closest('.ms-fbtn[data-flt]'))) { _msFilter = t.dataset.flt; renderMS(); return; }
    if ((t = ev.target.closest('.ms-card[data-i]'))) { openDetail(_shown[+t.dataset.i]); return; }
  }
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var d = document.getElementById('ms-detail');
    if (d && d.classList.contains('visible')) closeDetail();
  });

  window.openMotorsport = function() {
    injectMSUI();
    _msFilter = 'all';
    document.getElementById('ms-overlay').classList.add('visible');
    closeDetail();
    loadF1Schedule(); loadMgpSchedule();
    renderMS();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeMotorsport = function() {
    var ov = document.getElementById('ms-overlay');
    if (ov) ov.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  function renderMS() {
    var body = document.getElementById('ms-body');
    if (!body || !document.getElementById('ms-overlay').classList.contains('visible')) return;
    if (_msTab === 'races') renderRaces(body);
    else if (_msTab === 'standings') renderStandings(body);
    else renderTrackDays(body);
  }

  function countdown(d, today, isPast) {
    var diff = Math.round((d - today) / 86400000);
    var v, l, style = '';
    if (isPast) { v = '✓'; l = 'risultati'; }
    else if (diff <= 0) { v = 'OGGI'; l = 'live'; style = ' style="color:#ff8a82"'; }
    else if (diff <= 31) { v = diff; l = diff === 1 ? 'giorno' : 'giorni'; }
    else { v = Math.round(diff / 7); l = 'settim.'; }
    return '<div class="ms-card-countdown"><div class="ms-card-countdown-val"' + style + '>' + v + '</div><div class="ms-card-countdown-lbl">' + l + '</div></div>';
  }

  var _shown = [];
  function renderRaces(body) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var list = allRaces().filter(function(r) { return _msFilter === 'all' || r.cat === _msFilter; });
    var fltDefs = [['all', 'Tutti'], ['f1', 'F1'], ['mgp', 'MotoGP'], ['sbk', 'WSBK'], ['wrc', 'WRC']];
    var html = '<div class="ms-filter-row">' + fltDefs.map(function(f) {
      return '<button class="ms-fbtn' + (f[0] === _msFilter ? ' on' : '') + '" data-flt="' + f[0] + '">' + f[1] + '</button>';
    }).join('') + '</div>';
    html += sourceNote();
    var future = list.filter(function(r) { return localDate(r.date) >= today; }).sort(function(a, b) { return localDate(a.date) - localDate(b.date); });
    var past = list.filter(function(r) { return localDate(r.date) < today; }).sort(function(a, b) { return localDate(b.date) - localDate(a.date); });
    _shown = [];
    function row(r, isNext, isPast) {
      var i = _shown.push(r) - 1, d = localDate(r.date);
      var tap = (r.cat === 'f1' || (r.cat === 'mgp' && r.id)) ? (isPast ? 'Tocca per i risultati' : 'Tocca per gli orari') : 'Tocca per il sito ufficiale';
      return '<button type="button" class="ms-card' + (isNext ? ' next' : '') + (isPast ? ' past' : '') + '" data-i="' + i + '">' +
        '<div class="ms-card-date"><div class="ms-card-day">' + d.getDate() + '</div><div class="ms-card-month">' + MONTHS_IT[d.getMonth()] + '</div></div>' +
        '<div class="ms-card-info">' +
          '<div class="ms-card-name">' + escSafe(r.name) + '</div>' +
          '<div class="ms-card-circuit">' + escSafe([r.circuit, r.country].filter(Boolean).join(' · ')) + '</div>' +
          '<div class="ms-card-tags"><span class="ms-card-tag cat-' + r.cat + '">' + CAT_LABELS[r.cat] + '</span>' +
            (r.round ? '<span class="ms-card-tag">Round ' + r.round + '</span>' : '') +
            (r.sprint ? '<span class="ms-card-tag">Sprint</span>' : '') +
            '<span class="ms-card-hint">' + tap + ' ›</span></div>' +
        '</div>' + countdown(d, today, isPast) + '</button>';
    }
    if (!future.length && !past.length) { body.innerHTML = html + '<div class="ms-empty">Nessuna gara per questo filtro.</div>'; return; }
    if (future.length) {
      html += '<div class="ms-section-title">Prossime gare (' + future.length + ')</div>';
      future.forEach(function(r, k) { html += row(r, k === 0, false); });
    }
    if (past.length) {
      html += '<div class="ms-section-title">Già disputate (' + past.length + ')</div>';
      past.forEach(function(r) { html += row(r, false, true); });
    }
    body.innerHTML = html;
  }
  function sourceNote() {
    var p = [];
    var s = { ok: 'dati ufficiali live', loading: 'carico…', err: 'offline: calendario salvato nell\'app', idle: '', off: 'calendario salvato, risultati sul sito ufficiale' };
    if (_msFilter === 'all' || _msFilter === 'f1') p.push('F1: ' + s[_liveState.f1]);
    if (_msFilter === 'all' || _msFilter === 'mgp') p.push('MotoGP: ' + s[_liveState.mgp]);
    if (_msFilter === 'all' || _msFilter === 'sbk' || _msFilter === 'wrc') p.push('WSBK/WRC: calendario inserito a mano');
    return '<div class="ms-src">' + p.map(escSafe).join(' · ') + '</div>';
  }

  /* ── Dettaglio gara ──────────────────────────────────────────────── */
  var _dRace = null, _dTab = 'RAC', _dClass = 'MotoGP', _dReq = 0;
  function openDetail(r) {
    if (!r) return;
    if (r.cat === 'sbk' || r.cat === 'wrc' || (r.cat === 'mgp' && !r.id)) { window.open(OFFICIAL[r.cat], '_blank', 'noopener'); return; }
    _dRace = r; _dClass = 'MotoGP';
    var past = localDate(r.date) < new Date(new Date().setHours(0, 0, 0, 0));
    _dTab = past ? 'RAC' : 'ORARI';
    document.getElementById('ms-d-title').firstChild.textContent = r.name;
    document.getElementById('ms-d-sub').textContent = [CAT_LABELS[r.cat], r.round ? 'Round ' + r.round : '', r.circuit].filter(Boolean).join(' · ');
    document.getElementById('ms-detail').classList.add('visible');
    renderDetail();
  }
  function closeDetail() {
    var d = document.getElementById('ms-detail');
    if (d) d.classList.remove('visible');
    _dRace = null;
  }
  var _sessForIcs = [];
  function icsBtn() { return '<button class="ms-ics" data-act="ics">📅 Aggiungi il weekend al calendario</button>'; }
  function exportWeekend() {
    var r = _dRace;
    if (!r || !_sessForIcs.length || !window.hubICS) return;
    var ev = _sessForIcs.map(function(s) {
      var start = new Date(s.iso), race = /gara/i.test(s.label);
      return { uid: (r.cat + '-' + (r.round || r.id || r.date) + '-' + s.label).replace(/\s+/g, '_'),
        title: CAT_LABELS[r.cat] + ' · ' + s.label + ' · ' + r.name, start: start.toISOString(),
        end: new Date(start.getTime() + (race ? 120 : 60) * 60000).toISOString(),
        location: [r.circuit, r.country].filter(Boolean).join(', '), alarms: race ? [60, 15] : [15] };
    });
    window.hubICS(ev, (CAT_LABELS[r.cat] + '-' + r.name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics');
  }
  function tabsHtml(tabs) {
    return '<div class="ms-filter-row">' + tabs.map(function(t) {
      return '<button class="ms-fbtn ms-dtab' + (t[0] === _dTab ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  function loading(msg) { return '<div class="ms-empty">' + (msg || 'Carico i risultati…') + '</div>'; }
  function errBox(msg, cat) {
    return '<div class="ms-empty">' + escSafe(msg) + '<br><a class="ms-link" target="_blank" rel="noopener" href="' + OFFICIAL[cat] + '">Risultati sul sito ufficiale ↗</a></div>';
  }
  function renderDetail() {
    var body = document.getElementById('ms-d-body');
    if (!body || !_dRace) return;
    var req = ++_dReq;
    var put = function(h) { if (req === _dReq) body.innerHTML = h; };
    if (_dRace.cat === 'f1') renderF1Detail(_dRace, put);
    else renderMgpDetail(_dRace, put);
    body.scrollTop = 0;
  }

  function resultTable(rows, opts) {
    if (!rows.length) return '<div class="ms-empty">' + (opts.empty || 'Nessun risultato disponibile.') + '</div>';
    return '<table class="ms-res"><thead><tr><th>Pos</th><th>Pilota</th><th>' + (opts.col3 || 'Tempo') + '</th>' + (opts.points ? '<th>Pt</th>' : '') + '</tr></thead><tbody>' +
      rows.map(function(r) {
        var fk = r.favKey || r.name, fav = isFavName(fk) || (r.team && isFavName(r.team));
        return '<tr class="' + (r.pos <= 3 ? 'pod pod' + r.pos : '') + (r.out ? ' out' : '') + (fav ? ' fav' : '') + '"><td class="pos">' + escSafe(r.posText || r.pos || '—') + '</td>' +
          '<td><b>' + escSafe(r.name) + (r.flag ? ' <span class="ms-fl" title="Giro più veloce">⏱</span>' : '') +
          (opts.star ? ' <button class="ms-star' + (isFavName(fk) ? ' on' : '') + '" data-fav="' + escSafe(fk) + '" aria-label="Preferito">' + (isFavName(fk) ? '★' : '☆') + '</button>' : '') +
          '</b><small>' + escSafe(r.team || '') + (r.grid != null ? ' · griglia ' + escSafe(r.grid) : '') + '</small></td>' +
          '<td class="tm">' + escSafe(r.time || '') + '</td>' + (opts.points ? '<td class="pt">' + escSafe(r.points || '') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>';
  }
  function podium(rows) {
    var top = rows.slice(0, 3);
    if (top.length < 3) return '';
    return '<div class="ms-podium">' + [1, 0, 2].map(function(i) {
      var r = top[i];
      return '<div class="ms-pod p' + (i + 1) + '"><span>' + (i + 1) + '</span><b>' + escSafe(r.short || r.name) + '</b><small>' + escSafe(r.team || '') + '</small></div>';
    }).join('') + '</div>';
  }

  // F1 ─ risultati gara, qualifiche, sprint, orari
  function renderF1Detail(r, put) {
    var past = localDate(r.date) < new Date(new Date().setHours(0, 0, 0, 0));
    var tabs = [];
    if (past) tabs.push(['RAC', 'Gara']);
    if (r.sprint && past) tabs.push(['SPR', 'Sprint']);
    if (past) tabs.push(['Q', 'Qualifiche']);
    tabs.push(['ORARI', 'Orari weekend']);
    var head = tabsHtml(tabs);
    if (!r.round && _dTab !== 'ORARI') { put(head + errBox('Risultati non disponibili senza connessione.', 'f1')); return; }
    if (_dTab === 'ORARI') {
      put(head + (r.sessions ? '<div class="ms-sched">' + r.sessions.map(function(s) {
        return '<div class="ms-sess' + (s.label === 'Gara' ? ' race' : '') + '"><span>' + s.label + '</span><b>' + fmtSession(s.iso) + '</b></div>';
      }).join('') + '</div>' + icsBtn() + '<p class="ms-note">Orari nel fuso del tuo dispositivo.</p>' : errBox('Orari non disponibili offline.', 'f1')));
      _sessForIcs = (r.sessions || []).map(function(s) { return { label: s.label, iso: s.iso }; });
      return;
    }
    put(head + loading());
    var ep = { RAC: 'results', SPR: 'sprint', Q: 'qualifying' }[_dTab];
    getJSON(JOLPICA + '/' + r.round + '/' + ep + '.json', 1440).then(function(j) {
      var race = j.MRData.RaceTable.Races[0];
      if (!race) { put(head + '<div class="ms-empty">Risultati non ancora pubblicati.</div>'); return; }
      var rows;
      if (_dTab === 'Q') {
        rows = race.QualifyingResults.map(function(q) {
          return { pos: +q.position, name: q.Driver.givenName + ' ' + q.Driver.familyName, short: q.Driver.familyName, team: q.Constructor.name, time: q.Q3 || q.Q2 || q.Q1 || '' };
        });
        put(head + podium(rows) + resultTable(rows, { col3: 'Miglior tempo' }) + '<p class="ms-note">Tempo della sessione più avanzata raggiunta (Q3, Q2 o Q1).</p>');
        return;
      }
      var list = _dTab === 'SPR' ? race.SprintResults : race.Results;
      rows = (list || []).map(function(x) {
        var finished = x.Time && x.Time.time;
        return {
          pos: +x.position, posText: /^\d+$/.test(x.positionText) ? x.positionText : 'RIT',
          name: x.Driver.givenName + ' ' + x.Driver.familyName, short: x.Driver.familyName, team: x.Constructor.name,
          time: finished ? x.Time.time : f1Status(x.status), points: x.points, grid: x.grid,
          flag: x.FastestLap && x.FastestLap.rank === '1', out: !/^\d+$/.test(x.positionText)
        };
      });
      put(head + podium(rows) + resultTable(rows, { points: true, col3: 'Tempo / distacco' }) +
        '<p class="ms-note">⏱ giro più veloce · Fonte: Jolpica (Ergast)</p>');
    }).catch(function() { put(head + errBox('Non riesco a scaricare i risultati.', 'f1')); });
  }

  // MotoGP ─ classe (MotoGP/Moto2/Moto3) × sessione (Gara, Sprint, Qualifiche, Orari)
  function renderMgpDetail(r, put) {
    var past = r.finished || localDate(r.date) < new Date(new Date().setHours(0, 0, 0, 0));
    var cls = '<div class="ms-filter-row ms-cls">' + ['MotoGP', 'Moto2', 'Moto3'].map(function(c) {
      return '<button class="ms-fbtn ms-dcls' + (c === _dClass ? ' on' : '') + '" data-c="' + c + '">' + c + '</button>';
    }).join('') + '</div>';
    var tabs = [];
    if (past) { tabs.push(['RAC', 'Gara']); if (_dClass === 'MotoGP') tabs.push(['SPR', 'Sprint']); tabs.push(['Q', 'Qualifiche']); }
    tabs.push(['ORARI', 'Orari']);
    if (!past && _dTab !== 'ORARI') _dTab = 'ORARI';
    if (_dClass !== 'MotoGP' && _dTab === 'SPR') _dTab = 'RAC';
    var head = cls + tabsHtml(tabs);
    if (!r.id) { put(head + errBox('Dati live MotoGP non disponibili: serve il Worker aggiornato.', 'mgp')); return; }
    put(head + loading());
    mgp('categories', 'eventUuid=' + r.id, 1440).then(function(cats) {
      var cat = cats.filter(function(c) { return c.name.replace(/\W/g, '').toLowerCase().indexOf(_dClass.toLowerCase()) === 0; })[0];
      if (!cat) throw new Error('classe non trovata');
      return mgp('sessions', 'eventUuid=' + r.id + '&categoryUuid=' + cat.id, past ? 1440 : 60);
    }).then(function(sess) {
      if (_dTab === 'ORARI') {
        var names = { FP: 'Libere', PR: 'Practice', Q: 'Qualifiche', SPR: 'Sprint', WUP: 'Warm Up', RAC: 'Gara' };
        put(head + (sess.length ? '<div class="ms-sched">' + sess.map(function(s) {
          return '<div class="ms-sess' + (s.type === 'RAC' ? ' race' : '') + '"><span>' + (names[s.type] || s.type) + (s.number ? ' ' + s.number : '') + '</span><b>' + fmtSession(s.date) + '</b></div>';
        }).join('') + '</div>' + icsBtn() + '<p class="ms-note">Orari nel fuso del tuo dispositivo.</p>' : '<div class="ms-empty">Orari non ancora pubblicati.</div>'));
        _sessForIcs = sess.map(function(s) { return { label: (names[s.type] || s.type) + (s.number ? ' ' + s.number : ''), iso: s.date }; });
        return;
      }
      var pick = _dTab === 'Q'
        ? sess.filter(function(s) { return s.type === 'Q' && s.number === 2; })[0] || sess.filter(function(s) { return s.type === 'Q'; }).pop()
        : sess.filter(function(s) { return s.type === _dTab; })[0];
      if (!pick) { put(head + '<div class="ms-empty">Sessione non disputata o non disponibile.</div>'); return; }
      return mgp('session/' + pick.id + '/classification', 'test=false', 1440).then(function(c) {
        var rows = (c.classification || []).map(function(x) {
          var ok = x.position != null;
          var gap = x.gap && x.gap.first && x.gap.first !== '0.000' ? '+' + x.gap.first : '';
          if (x.gap && x.gap.lap && x.gap.lap !== '0') gap = '+' + x.gap.lap + (x.gap.lap === '1' ? ' giro' : ' giri');
          return {
            pos: x.position, posText: ok ? String(x.position) : 'RIT',
            name: (x.rider.number ? '#' + x.rider.number + ' ' : '') + x.rider.full_name, favKey: x.rider.full_name,
            short: x.rider.full_name.split(' ').slice(-1)[0], team: (x.team && x.team.name) || (x.constructor && x.constructor.name) || '',
            time: !ok ? (MGP_STATUS[x.status] || 'Ritirato') : (x.position === 1 ? (x.time || x.best_lap && x.best_lap.time || '') : (gap || (x.best_lap && x.best_lap.time) || '')),
            points: x.points != null ? String(x.points) : '', out: !ok
          };
        });
        put(head + podium(rows) + resultTable(rows, { points: _dTab !== 'Q', col3: _dTab === 'Q' ? 'Tempo / distacco' : 'Tempo / distacco' }) +
          '<p class="ms-note">' + (_dTab === 'Q' ? 'Classifica della Q2. ' : '') + 'Fonte: MotoGP.com</p>');
      });
    }).catch(function() { put(head + errBox('Non riesco a scaricare i dati MotoGP.', 'mgp')); });
  }

  /* ── Classifiche ─────────────────────────────────────────────────── */
  function renderStandings(body) {
    var defs = MGP_LIVE ? [['f1d', 'F1 piloti'], ['f1c', 'F1 costruttori'], ['mgpd', 'MotoGP piloti']] : [['f1d', 'F1 piloti'], ['f1c', 'F1 costruttori']];
    if (!MGP_LIVE && _stCat === 'mgpd') _stCat = 'f1d';
    var head = '<div class="ms-filter-row">' + defs.map(function(d) {
      return '<button class="ms-fbtn ms-stbtn' + (d[0] === _stCat ? ' on' : '') + '" data-st="' + d[0] + '">' + d[1] + '</button>';
    }).join('') + '</div>';
    body.innerHTML = head + loading('Carico la classifica…');
    var req = ++_dReq, put = function(h) { if (req === _dReq && _msTab === 'standings') body.innerHTML = head + h; };
    var p;
    if (_stCat === 'f1d') {
      p = getJSON(JOLPICA + '/driverstandings.json', 180).then(function(j) {
        var L = j.MRData.StandingsTable.StandingsLists[0];
        return { round: L && L.round, rows: (L ? L.DriverStandings : []).map(function(d) {
          return { pos: +d.position, name: d.Driver.givenName + ' ' + d.Driver.familyName, short: d.Driver.familyName,
            favKey: d.Driver.givenName + ' ' + d.Driver.familyName, team: (d.Constructors[0] || {}).name, time: d.wins + (d.wins === '1' ? ' vittoria' : ' vittorie'), points: d.points };
        }) };
      });
    } else if (_stCat === 'f1c') {
      p = getJSON(JOLPICA + '/constructorstandings.json', 180).then(function(j) {
        var L = j.MRData.StandingsTable.StandingsLists[0];
        return { round: L && L.round, rows: (L ? L.ConstructorStandings : []).map(function(d) {
          return { pos: +d.position, name: d.Constructor.name, short: d.Constructor.name, team: d.Constructor.nationality,
            time: d.wins + (d.wins === '1' ? ' vittoria' : ' vittorie'), points: d.points };
        }) };
      });
    } else {
      p = mgpSeasonId().then(function(sid) {
        return mgp('events', 'seasonUuid=' + sid + '&isFinished=true', 60).then(function(evs) {
          var ev = evs.filter(function(e) { return !e.test; })[0];
          return mgp('categories', 'eventUuid=' + ev.id, 1440);
        }).then(function(cats) {
          var cat = cats.filter(function(c) { return /^motogp/i.test(c.name.replace(/\W/g, '')); })[0];
          return mgp('standings', 'seasonUuid=' + sid + '&categoryUuid=' + cat.id, 180);
        });
      }).then(function(st) {
        return { rows: (st.classification || []).map(function(d) {
          return { pos: d.position, name: (d.rider.number ? '#' + d.rider.number + ' ' : '') + d.rider.full_name, short: d.rider.full_name.split(' ').slice(-1)[0], favKey: d.rider.full_name,
            team: (d.team && d.team.name) || '', time: (d.race_wins || 0) + ' vitt. · ' + (d.sprint_wins || 0) + ' sprint', points: String(d.points) };
        }) };
      });
    }
    p.then(function(res) {
      var mine = res.rows.filter(function(r) { return isFavName(r.favKey || r.name); });
      var favBox = mine.length ? '<div class="ms-myfav">' + mine.map(function(r) {
        return '<div><span>' + r.pos + '°</span><b>' + escSafe(r.short || r.name) + '</b><small>' + escSafe(r.points) + ' pt</small></div>';
      }).join('') + '</div>' : '<p class="ms-note">Tocca ☆ accanto a un nome per seguirlo: verrà evidenziato in classifiche e risultati.</p>';
      put(favBox + podium(res.rows) + resultTable(res.rows, { points: true, col3: 'Vittorie', star: true }) +
        '<p class="ms-note">' + (res.round ? 'Dopo il round ' + res.round + ' · ' : '') + 'Fonte: ' + (_stCat === 'mgpd' ? 'MotoGP.com' : 'Jolpica (Ergast)') + '</p>' +
        (MGP_LIVE ? '' : '<p class="ms-note"><a class="ms-link" target="_blank" rel="noopener" href="https://www.motogp.com/en/world-standing">Classifica MotoGP sul sito ufficiale ↗</a></p>'));
    }).catch(function() { put(errBox('Classifica non disponibile in questo momento.', _stCat === 'mgpd' ? 'mgp' : 'f1')); });
  }

  /* ── Circuiti e track day ────────────────────────────────────────── */
  function kmFrom(lat, lng, c) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (c.lat - lat) * toR, dLng = (c.lng - lng) * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat * toR) * Math.cos(c.lat * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function renderTrackDays(body) {
    // Distanza in linea d'aria dall'ultima posizione GPS usata in Carburanti, altrimenti da Milano
    var here = { lat: 45.4642, lng: 9.19, label: 'Milano' };
    try { if (typeof _gpsLat === 'number' && typeof _gpsLng === 'number') here = { lat: _gpsLat, lng: _gpsLng, label: 'te' }; } catch (e) {}
    var list = CIRCUITS.map(function(c) { return Object.assign({ km: kmFrom(here.lat, here.lng, c) }, c); })
      .sort(function(a, b) { return a.km - b.km; });
    var html = '<div class="ms-src">I calendari dei turni liberi cambiano spesso: qui trovi i circuiti, ordinati per distanza da ' + escSafe(here.label) +
      ', con il link al calendario ufficiale. Le date non sono più inserite a mano perché diventavano vecchie o sbagliate.</div>';
    html += '<div class="ms-section-title">Circuiti (' + list.length + ')</div>';
    html += list.map(function(c) {
      var url = c.url || ('https://www.google.com/search?q=' + encodeURIComponent(c.name + ' calendario turni liberi ' + new Date().getFullYear()));
      return '<a class="ms-card track ms-circ" target="_blank" rel="noopener" href="' + escSafe(url) + '">' +
        '<div class="ms-card-date"><div class="ms-card-day">' + Math.round(c.km) + '</div><div class="ms-card-month">km</div></div>' +
        '<div class="ms-card-info"><div class="ms-card-name">' + escSafe(c.name) + '</div>' +
          '<div class="ms-card-circuit">' + escSafe(c.city) + '</div>' +
          '<div class="ms-card-tags"><span class="ms-card-tag cat-mix">Auto e moto</span>' +
          '<span class="ms-card-hint">' + (c.url ? 'Calendario sul sito ufficiale' : 'Cerca il calendario') + ' ↗</span></div>' +
        '</div></a>';
    }).join('');
    html += '<p class="ms-note">Distanze in linea d\'aria, indicative.</p>';
    body.innerHTML = html;
  }

  window.hubMotorsport = { _getJSON: getJSON, _live: _live };
  document.addEventListener('DOMContentLoaded', function() { setTimeout(injectMSUI, 600); });
})();
