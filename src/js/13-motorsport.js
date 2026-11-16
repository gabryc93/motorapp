

/* ═══════════════════════════════════════════════════════════════════
   HUB MOTORSPORT & TRACK DAY
   Dataset curato 2026: F1, MotoGP, WSBK, WRC + circuiti italiani
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Calendar 2026 (curated). Dates are race-day; "weekend" implies Fri-Sun typically.
  // category: 'f1' | 'mgp' | 'sbk' | 'wrc'
  var RACES = [
    // F1 2026 — 22 GP (Bahrain e Arabia Saudita cancellati per guerra in Iran)
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
    { cat:'f1', date:'2026-10-11', name:'GP di Singapore', circuit:'Marina Bay', country:'Singapore' },
    { cat:'f1', date:'2026-10-25', name:'GP degli Stati Uniti', circuit:'COTA', country:'USA' },
    { cat:'f1', date:'2026-11-01', name:'GP del Messico', circuit:'Città del Messico', country:'Messico' },
    { cat:'f1', date:'2026-11-08', name:'GP del Brasile', circuit:'Interlagos', country:'Brasile' },
    { cat:'f1', date:'2026-11-21', name:'GP di Las Vegas', circuit:'Las Vegas', country:'USA' },
    { cat:'f1', date:'2026-11-29', name:'GP del Qatar', circuit:'Lusail', country:'Qatar' },
    { cat:'f1', date:'2026-12-06', name:'GP di Abu Dhabi', circuit:'Yas Marina', country:'EAU' },
    // MotoGP 2026 — 22 GP (Qatar spostato da aprile a novembre per conflitto Golfo)
    { cat:'mgp', date:'2026-03-01', name:'GP della Thailandia', circuit:'Chang Circuit Buriram', country:'Thailandia' },
    { cat:'mgp', date:'2026-03-22', name:'GP del Brasile', circuit:'Goiania', country:'Brasile' },
    { cat:'mgp', date:'2026-03-31', name:'GP degli Stati Uniti', circuit:'COTA', country:'USA' },
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
    { cat:'mgp', date:'2026-11-22', name:'GP del Qatar', circuit:'Losail', country:'Qatar' },
    { cat:'mgp', date:'2026-11-29', name:'GP del Portogallo', circuit:'Portimão', country:'Portogallo' },
    { cat:'mgp', date:'2026-12-06', name:'GP di Valencia', circuit:'Ricardo Tormo', country:'Spagna' },
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

  // Track days curated for IT circuits.
  // type: 'auto' | 'moto' | 'mix'
  var TRACKDAYS = [
    { date:'2026-05-12', circuit:'Mugello', type:'mix', name:'Open day Mugello',
      cost:'~250 €', org:'Auto Club Mugello', url:'https://www.mugellocircuit.com/' },
    { date:'2026-05-19', circuit:'Misano', type:'moto', name:'Track day Misano (moto)',
      cost:'~180 €', org:'Misano Track Day', url:'https://www.misanocircuit.com/' },
    { date:'2026-05-26', circuit:'Vallelunga', type:'auto', name:'Track day Vallelunga (auto)',
      cost:'~220 €', org:'Vallelunga', url:'https://www.vallelunga.it/' },
    { date:'2026-06-02', circuit:'Cremona', type:'moto', name:'Track day Cremona Circuit',
      cost:'~150 €', org:'Cremona Circuit', url:'https://www.cremonacircuit.com/' },
    { date:'2026-06-09', circuit:'Monza', type:'auto', name:'Open Pirelli Monza',
      cost:'~350 €', org:'Pirelli', url:'https://www.monzanet.it/' },
    { date:'2026-06-16', circuit:'Imola', type:'mix', name:'Track day Imola',
      cost:'~280 €', org:'Imola Circuit', url:'https://www.autodromoimola.it/' },
    { date:'2026-06-23', circuit:'Modena', type:'moto', name:'Track day Modena (moto)',
      cost:'~140 €', org:'Modena Autodromo', url:'https://www.autodromodimodena.it/' },
    { date:'2026-06-30', circuit:'Adria', type:'auto', name:'Track day Adria International',
      cost:'~190 €', org:'Adria Raceway', url:'https://www.adriaraceway.com/' },
    { date:'2026-07-07', circuit:'Mugello', type:'moto', name:'Track day Mugello (moto)',
      cost:'~270 €', org:'Mugello', url:'https://www.mugellocircuit.com/' },
    { date:'2026-07-14', circuit:'Magione', type:'mix', name:'Track day Magione',
      cost:'~130 €', org:'Magione', url:'https://www.autodromomagione.com/' },
    { date:'2026-08-04', circuit:'Misano', type:'auto', name:'Track day Misano (auto)',
      cost:'~210 €', org:'Misano', url:'https://www.misanocircuit.com/' },
    { date:'2026-09-08', circuit:'Vallelunga', type:'mix', name:'Open day Vallelunga',
      cost:'~230 €', org:'Vallelunga', url:'https://www.vallelunga.it/' },
    { date:'2026-09-15', circuit:'Cremona', type:'auto', name:'Track day Cremona (auto)',
      cost:'~170 €', org:'Cremona', url:'https://www.cremonacircuit.com/' },
    { date:'2026-09-22', circuit:'Imola', type:'moto', name:'Track day Imola (moto)',
      cost:'~260 €', org:'Imola', url:'https://www.autodromoimola.it/' },
    { date:'2026-10-13', circuit:'Mugello', type:'auto', name:'Coppa Italia Mugello',
      cost:'~290 €', org:'Mugello', url:'https://www.mugellocircuit.com/' },
    { date:'2026-10-20', circuit:'Misano', type:'mix', name:'World Ducati Week (Misano)',
      cost:'da 80 €', org:'Ducati', url:'https://www.misanocircuit.com/' },
    { date:'2026-11-03', circuit:'Adria', type:'moto', name:'Chiusura stagione Adria',
      cost:'~160 €', org:'Adria', url:'https://www.adriaraceway.com/' }
  ];

  var CAT_LABELS = { f1: 'F1', mgp: 'MotoGP', sbk: 'WSBK', wrc: 'WRC' };
  var TYPE_LABELS = { auto: 'Auto', moto: 'Moto', mix: 'Mixed' };
  var MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

  function injectMSUI() {
    if (document.getElementById('ms-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'ms-overlay';
    ov.innerHTML =
      '<div class="ms-hdr">' +
        '<h2>MOTORSPORT &amp; PISTA<small>Calendari 2026 · Dataset curato</small></h2>' +
        '<button class="gar-close" onclick="closeMotorsport()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="ms-segctrl">' +
        '<button class="ms-seg on" data-tab="races">🏁 Motorsport</button>' +
        '<button class="ms-seg" data-tab="track">🏎 Track day Italia</button>' +
      '</div>' +
      '<div class="ms-body" id="ms-body"></div>';
    document.body.appendChild(ov);

    document.getElementById('ms-overlay').addEventListener('click', function(ev) {
      var seg = ev.target.closest('.ms-seg');
      if (seg) {
        _msTab = seg.dataset.tab;
        _msFilter = 'all';  // reset on tab change (filters differ between tabs)
        document.querySelectorAll('.ms-seg').forEach(function(s) {
          s.classList.toggle('on', s.dataset.tab === _msTab);
        });
        renderMS();
        return;
      }
      var fb = ev.target.closest('.ms-fbtn');
      if (fb) {
        _msFilter = fb.dataset.flt;
        renderMS();
        return;
      }
      var trackCard = ev.target.closest('.ms-card.track');
      if (trackCard && trackCard.dataset.url) {
        window.open(trackCard.dataset.url, '_blank', 'noopener');
      }
    });
  }

  var _msTab = 'races';
  var _msFilter = 'all';

  window.openMotorsport = function() {
    injectMSUI();
    _msFilter = 'all';  // also reset on each open
    document.getElementById('ms-overlay').classList.add('visible');
    renderMS();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeMotorsport = function() {
    document.getElementById('ms-overlay').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  function renderMS() {
    var body = document.getElementById('ms-body');
    if (!body) return;
    if (_msTab === 'races') renderRaces(body);
    else renderTrackDays(body);
  }

  function renderRaces(body) {
    var today = new Date(); today.setHours(0,0,0,0);
    var filtered = RACES.filter(function(r) {
      if (_msFilter === 'all') return true;
      return r.cat === _msFilter;
    });

    // Filters
    var fltDefs = [
      { id:'all', label:'Tutti' },
      { id:'f1',  label:'F1' },
      { id:'mgp', label:'MotoGP' },
      { id:'sbk', label:'WSBK' },
      { id:'wrc', label:'WRC' }
    ];
    var html = '<div class="ms-filter-row">' + fltDefs.map(function(f) {
      return '<button class="ms-fbtn' + (f.id === _msFilter ? ' on' : '') + '" data-flt="' + f.id + '">' + f.label + '</button>';
    }).join('') + '</div>';

    // Split future / past
    var future = filtered.filter(function(r) { return new Date(r.date) >= today; });
    var past   = filtered.filter(function(r) { return new Date(r.date) <  today; });
    future.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    past.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    if (future.length === 0 && past.length === 0) {
      html += '<div class="ms-empty">Nessuna gara per questo filtro.</div>';
      body.innerHTML = html;
      return;
    }

    function renderRow(r, isNext, isPast) {
      var d = new Date(r.date);
      var dayN = d.getDate();
      var month = MONTHS_IT[d.getMonth()];
      var diff = Math.round((d - today) / 86400000);
      var cd = '';
      if (isPast) {
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val">—</div><div class="ms-card-countdown-lbl">passato</div></div>';
      } else if (diff === 0) {
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val" style="color:#ff8a82">OGGI</div><div class="ms-card-countdown-lbl">live</div></div>';
      } else if (diff <= 31) {
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val">' + diff + '</div><div class="ms-card-countdown-lbl">' + (diff === 1 ? 'giorno' : 'giorni') + '</div></div>';
      } else {
        var weeks = Math.round(diff / 7);
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val">' + weeks + '</div><div class="ms-card-countdown-lbl">settim.</div></div>';
      }
      return '<div class="ms-card' + (isNext ? ' next' : '') + (isPast ? ' past' : '') + '">' +
        '<div class="ms-card-date"><div class="ms-card-day">' + dayN + '</div><div class="ms-card-month">' + month + '</div></div>' +
        '<div class="ms-card-info">' +
          '<div class="ms-card-name">' + escSafe(r.name) + '</div>' +
          '<div class="ms-card-circuit">' + escSafe(r.circuit) + ' · ' + escSafe(r.country) + '</div>' +
          '<div class="ms-card-tags">' +
            '<span class="ms-card-tag cat-' + r.cat + '">' + CAT_LABELS[r.cat] + '</span>' +
          '</div>' +
        '</div>' +
        cd +
      '</div>';
    }

    if (future.length > 0) {
      html += '<div class="ms-section-title">Prossime gare (' + future.length + ')</div>';
      html += renderRow(future[0], true, false);
      for (var i = 1; i < future.length; i++) html += renderRow(future[i], false, false);
    }
    if (past.length > 0) {
      html += '<div class="ms-section-title">Già disputate (' + past.length + ')</div>';
      // Show only last 5 past races
      past.slice(0, 5).forEach(function(r) { html += renderRow(r, false, true); });
    }

    body.innerHTML = html;
  }

  function renderTrackDays(body) {
    var today = new Date(); today.setHours(0,0,0,0);
    var filtered = TRACKDAYS.filter(function(t) {
      if (_msFilter === 'all') return true;
      return t.type === _msFilter;
    });

    var fltDefs = [
      { id:'all',  label:'Tutti' },
      { id:'auto', label:'Auto' },
      { id:'moto', label:'Moto' },
      { id:'mix',  label:'Mixed' }
    ];
    var html = '<div class="ms-filter-row">' + fltDefs.map(function(f) {
      return '<button class="ms-fbtn' + (f.id === _msFilter ? ' on' : '') + '" data-flt="' + f.id + '">' + f.label + '</button>';
    }).join('') + '</div>';

    var future = filtered.filter(function(t) { return new Date(t.date) >= today; });
    var past   = filtered.filter(function(t) { return new Date(t.date) <  today; });
    future.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    past.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    if (future.length === 0 && past.length === 0) {
      html += '<div class="ms-empty">Nessun track day disponibile.</div>';
      body.innerHTML = html;
      return;
    }

    function renderRow(t, isNext, isPast) {
      var d = new Date(t.date);
      var dayN = d.getDate();
      var month = MONTHS_IT[d.getMonth()];
      var diff = Math.round((d - today) / 86400000);
      var cd = '';
      if (isPast) {
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val">—</div><div class="ms-card-countdown-lbl">passato</div></div>';
      } else if (diff === 0) {
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val" style="color:#ff8a82">OGGI</div><div class="ms-card-countdown-lbl">live</div></div>';
      } else if (diff <= 31) {
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val">' + diff + '</div><div class="ms-card-countdown-lbl">' + (diff === 1 ? 'giorno' : 'giorni') + '</div></div>';
      } else {
        var weeks = Math.round(diff / 7);
        cd = '<div class="ms-card-countdown"><div class="ms-card-countdown-val">' + weeks + '</div><div class="ms-card-countdown-lbl">settim.</div></div>';
      }
      return '<div class="ms-card track' + (isNext ? ' next' : '') + (isPast ? ' past' : '') + '" data-url="' + escSafe(t.url || '') + '">' +
        '<div class="ms-card-date"><div class="ms-card-day">' + dayN + '</div><div class="ms-card-month">' + month + '</div></div>' +
        '<div class="ms-card-info">' +
          '<div class="ms-card-name">' + escSafe(t.name) + '</div>' +
          '<div class="ms-card-circuit">' + escSafe(t.circuit) + ' · ' + escSafe(t.cost) + ' · ' + escSafe(t.org) + '</div>' +
          '<div class="ms-card-tags">' +
            '<span class="ms-card-tag cat-' + t.type + '">' + TYPE_LABELS[t.type] + '</span>' +
          '</div>' +
        '</div>' +
        cd +
      '</div>';
    }

    if (future.length > 0) {
      html += '<div class="ms-section-title">Prossimi (' + future.length + ')</div>';
      html += renderRow(future[0], true, false);
      for (var i = 1; i < future.length; i++) html += renderRow(future[i], false, false);
    }
    if (past.length > 0) {
      html += '<div class="ms-section-title">Già passati</div>';
      past.slice(0, 3).forEach(function(t) { html += renderRow(t, false, true); });
    }

    body.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(injectMSUI, 600);
  });
})();

