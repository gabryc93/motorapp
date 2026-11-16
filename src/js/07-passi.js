

/* ═══════════════════════════════════════════════════════════════════
   HUB PASSI — curated Italian mountain passes for motorcyclists
   Data: pre-loaded constant (no fetch). Weather: open-meteo on demand.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // Curated dataset — handpicked top passes for IT motorcyclists.
  // closedM/closedM = months range when typically closed (1=Jan ... 12=Dec); null = always open.
  var PASSES = [
    { id:'stelvio', name:'Passo dello Stelvio', region:'Lombardia / Trentino-AA', lat:46.5286, lng:10.4543, alt:2758, length:24, hairpins:48, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Il leggendario passo dei 48 tornanti, secondo passo asfaltato più alto delle Alpi. Versante tirolese più tecnico, lato Bormio più aperto. Aperto tipicamente da metà giugno a inizio novembre.' },
    { id:'gavia',   name:'Passo Gavia', region:'Lombardia', lat:46.3439, lng:10.4892, alt:2621, length:25, hairpins:34, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Stretto, selvaggio, indimenticabile. Asfalto irregolare in alcuni tratti, tornanti senza guardrail. Per piloti esperti che cercano emozioni vere.' },
    { id:'mortirolo', name:'Passo del Mortirolo', region:'Lombardia', lat:46.2336, lng:10.2932, alt:1852, length:12, hairpins:33, closed:[11,12,1,2,3,4], diff:'expert', desc:'Pendenze fino al 18%. Un mito del ciclismo, in moto è un susseguirsi di tornanti ravvicinati nel bosco. Asfalto rifatto recentemente.' },
    { id:'pordoi',  name:'Passo Pordoi', region:'Trentino-AA / Veneto', lat:46.4881, lng:11.8125, alt:2239, length:11, hairpins:33, closed:null, diff:'medium', desc:'Cuore delle Dolomiti, tornanti ampi e panorami incredibili sul Sella. Tappa obbligata del Sellaronda. Aperto quasi tutto l\'anno (con neve invernale).' },
    { id:'sella',   name:'Passo Sella', region:'Trentino-AA', lat:46.5093, lng:11.7570, alt:2244, length:11, hairpins:21, closed:null, diff:'medium', desc:'Spettacolo dolomitico puro: Sassolungo a destra, Sella a sinistra. Asfalto perfetto, traffico turistico in alta stagione.' },
    { id:'gardena', name:'Passo Gardena', region:'Trentino-AA', lat:46.5510, lng:11.7960, alt:2121, length:10, hairpins:13, closed:null, diff:'medium', desc:'Quarto passo del Sellaronda. Curve fluide e vista sul Sassolungo. Ottimo per moto turistiche.' },
    { id:'campolongo', name:'Passo Campolongo', region:'Trentino-AA / Veneto', lat:46.5247, lng:11.8770, alt:1875, length:6, hairpins:16, closed:null, diff:'easy', desc:'Il più dolce dei quattro passi del Sellaronda. Curve facili, ottimo per chi inizia con i passi alpini.' },
    { id:'falzarego', name:'Passo Falzarego', region:'Veneto', lat:46.5189, lng:12.0106, alt:2105, length:18, hairpins:24, closed:null, diff:'medium', desc:'Strada storica della Grande Guerra. Vista mozzafiato sulle Tofane. Combinabile col Passo Giau per un giro epico.' },
    { id:'giau',    name:'Passo Giau', region:'Veneto', lat:46.4850, lng:12.0567, alt:2236, length:9, hairpins:29, closed:[11,12,1,2,3,4], diff:'expert', desc:'Tornanti stretti e ravvicinati, panorama da cartolina. Considerato uno dei più belli delle Dolomiti. Asfalto stretto, attenzione al meteo.' },
    { id:'fedaia',  name:'Passo Fedaia', region:'Trentino-AA / Veneto', lat:46.4604, lng:11.8721, alt:2057, length:14, hairpins:8, closed:null, diff:'medium', desc:'Sotto il ghiacciaio della Marmolada. Pendenze impegnative, lago panoramico in vetta.' },
    { id:'bernina', name:'Passo del Bernina', region:'Svizzera (vicino Tirano)', lat:46.4101, lng:10.0289, alt:2328, length:35, hairpins:14, closed:null, diff:'easy', desc:'Versante svizzero ben asfaltato, paesaggio glaciale unico. Fattibile in giornata da Lombardia. Treno rosso del Bernina come bonus.' },
    { id:'spluga',  name:'Passo dello Spluga', region:'Lombardia / Svizzera', lat:46.5085, lng:9.3286, alt:2114, length:30, hairpins:36, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Tornanti vertiginosi del lato italiano (Pianazzo), galleria di Madesimo, paesaggio lunare verso il confine.' },
    { id:'sanbernardino', name:'Passo del San Bernardino', region:'Svizzera', lat:46.4973, lng:9.1715, alt:2065, length:17, hairpins:24, closed:[12,1,2,3,4], diff:'medium', desc:'Alternativa scenografica all\'autostrada A13. Tornanti regolari, asfalto svizzero impeccabile.' },
    { id:'gotthard',name:'Passo del San Gottardo (Tremola)', region:'Svizzera', lat:46.5589, lng:8.5618, alt:2106, length:13, hairpins:38, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'La Tremola: pavé storico, 38 tornanti su strada selciata. Esperienza unica al mondo, ma serve sensibilità.' },
    { id:'iseran',  name:'Col de l\'Iseran', region:'Francia (vicino Val d\'Isere)', lat:45.4178, lng:7.0291, alt:2770, length:48, hairpins:20, closed:[11,12,1,2,3,4,5,6], diff:'expert', desc:'Il passo asfaltato più alto delle Alpi. Strada strettissima, vento, isolamento. Solo luglio-settembre.' },
    { id:'galibier',name:'Col du Galibier', region:'Francia', lat:45.0644, lng:6.4091, alt:2642, length:23, hairpins:13, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Salita francese mitica del Tour de France. Combinato col Telegraphe sul versante nord per un giro lungo e gratificante.' },
    { id:'agnello', name:'Colle dell\'Agnello', region:'Piemonte / Francia', lat:44.6797, lng:6.9797, alt:2744, length:23, hairpins:25, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Terzo passo asfaltato più alto delle Alpi. Lato italiano (Casteldelfino) lungo e rilassato, lato francese ripido e tecnico.' },
    { id:'sommeiller', name:'Colle del Sommeiller', region:'Piemonte', lat:45.1444, lng:6.8861, alt:2993, length:18, hairpins:0, closed:[11,12,1,2,3,4,5,6,7], diff:'expert', desc:'Strada bianca, NON asfaltata. Punto più alto raggiungibile in moto in Italia. Solo per moto enduro o adventure. Ferragosto-settembre.' },
    { id:'mongenevre', name:'Colle del Monginevro', region:'Piemonte / Francia', lat:44.9314, lng:6.7234, alt:1850, length:8, hairpins:5, closed:null, diff:'easy', desc:'Passo aperto tutto l\'anno, transito facile. Buon punto di partenza per giri più impegnativi nel Briançonnais.' },
    { id:'tonale',  name:'Passo del Tonale', region:'Lombardia / Trentino-AA', lat:46.2606, lng:10.5856, alt:1883, length:15, hairpins:8, closed:null, diff:'easy', desc:'Largo, panoramico, sempre aperto. Collega Val Camonica e Val di Sole. Stazione sciistica attiva tutto l\'anno.' },
    { id:'mendola', name:'Passo della Mendola', region:'Trentino-AA', lat:46.4203, lng:11.1942, alt:1363, length:14, hairpins:18, closed:null, diff:'easy', desc:'Tra Bolzano e Trento, tornanti regolari nel bosco. Bel raccordo per chi va o torna dalle Dolomiti.' },
    { id:'rolle',   name:'Passo Rolle', region:'Trentino-AA', lat:46.2966, lng:11.7864, alt:1980, length:21, hairpins:18, closed:null, diff:'medium', desc:'Vista delle Pale di San Martino. Asfalto eccellente, curve scorrevoli. Spesso meno trafficato del Sellaronda.' },
    { id:'manghen', name:'Passo Manghen', region:'Trentino-AA', lat:46.1544, lng:11.4611, alt:2047, length:25, hairpins:32, closed:[12,1,2,3,4], diff:'medium', desc:'Strada poco frequentata, foreste e malghe. Piacere puro, soprattutto mid-week. Asfalto irregolare in alcuni tratti.' },
    { id:'bocca',   name:'Bocca della Selva', region:'Campania', lat:41.3489, lng:14.4819, alt:1393, length:15, hairpins:25, closed:null, diff:'medium', desc:'Appennino sannita, poco conosciuto fuori regione. Curve fluide, traffico minimo, asfalto recente. Ottimo per chi vive a sud.' },
    { id:'forcafarro', name:'Forca di Caruso', region:'Abruzzo', lat:42.0186, lng:13.4839, alt:1107, length:10, hairpins:14, closed:null, diff:'easy', desc:'Tra Marsica e Velino. Salita dolce, panorama sul Fucino, ideale per sgranchirsi a metà giornata.' },
    { id:'campoimperatore', name:'Campo Imperatore (Vado di Sole)', region:'Abruzzo', lat:42.4503, lng:13.5586, alt:2130, length:30, hairpins:40, closed:[12,1,2,3,4], diff:'medium', desc:'Il "piccolo Tibet" italiano. Altopiano lunare a 1800m, salita lunghissima da Fonte Cerreto. Vento e meteo da controllare.' }
  ];

  function isClosedNow(p) {
    if (!p.closed) return false;
    var m = (new Date().getMonth() + 1);
    return p.closed.indexOf(m) >= 0;
  }

  /* ── Live status engine (stagione + meteo cima) ─────────────── */
  // Cache shape: { ts: epochMs, data: { passId: {status, note} } }
  // status: 'open' | 'caution' | 'closed' | 'unknown'
  var STATUS_CACHE_KEY = 'hub_passi_status_v1';
  var STATUS_TTL_MS = 6 * 3600 * 1000; // 6h
  var _liveStatus = {}; // in-memory cache

  function loadCachedStatus() {
    try {
      var raw = JSON.parse(localStorage.getItem(STATUS_CACHE_KEY) || 'null');
      if (raw && (Date.now() - raw.ts) < STATUS_TTL_MS) {
        _liveStatus = raw.data || {};
        return true;
      }
    } catch(_) {}
    return false;
  }
  function saveCachedStatus() {
    try {
      localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: _liveStatus }));
    } catch(_) {}
  }

  // Combine seasonal + weather to compute final status for a single pass
  function computeStatus(p, w) {
    if (isClosedNow(p)) {
      return { status:'closed', note:'Chiuso (stagione)' };
    }
    if (!w) return { status:'open', note:'Aperto (verifica meteo)' };
    // w shape: { tMin, tMax, snowSum, rainSum, windMax }
    if (w.snowSum > 5) {
      return { status:'caution', note:'⚠ Neve recente, possibile chiusura' };
    }
    if (w.tMin < -2 && w.snowSum > 0.5) {
      return { status:'caution', note:'⚠ Gelo + neve, catene probabili' };
    }
    if (w.tMin < 0) {
      return { status:'caution', note:'⚠ Gelo possibile in cima' };
    }
    if (w.windMax > 60) {
      return { status:'caution', note:'⚠ Vento forte (' + Math.round(w.windMax) + ' km/h)' };
    }
    return { status:'open', note:'Aperto · meteo ok' };
  }

  // Open-Meteo batch fetch. Splits into chunks of 10 to avoid URL-length
  // and CORS issues on long lat/lng lists. Failures degrade to 'unknown'
  // status silently — no console.error spam.
  async function fetchPassiWeatherBatch(passi) {
    if (passi.length === 0) return {};
    var CHUNK = 10;
    var out = {};
    for (var i = 0; i < passi.length; i += CHUNK) {
      var chunk = passi.slice(i, i + CHUNK);
      var lats = chunk.map(function(p) { return p.lat.toFixed(4); }).join(',');
      var lngs = chunk.map(function(p) { return p.lng.toFixed(4); }).join(',');
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lats +
        '&longitude=' + lngs +
        '&daily=temperature_2m_min,temperature_2m_max,snowfall_sum,rain_sum,wind_speed_10m_max' +
        '&past_days=1&forecast_days=2&timezone=auto';
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function() { ctrl.abort(); }, 15000);
        var r = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) continue;  // skip this chunk, others may succeed
        var data = await r.json();
        var arr = Array.isArray(data) ? data : [data];
        arr.forEach(function(d, j) {
          var p = chunk[j];
          if (!d.daily) return;
          var tMin = Math.min.apply(null, d.daily.temperature_2m_min || [0]);
          var tMax = Math.max.apply(null, d.daily.temperature_2m_max || [0]);
          var snowSum = (d.daily.snowfall_sum || [0]).reduce(function(a, b) { return a + (b || 0); }, 0);
          var rainSum = (d.daily.rain_sum || [0]).reduce(function(a, b) { return a + (b || 0); }, 0);
          var windMax = Math.max.apply(null, d.daily.wind_speed_10m_max || [0]);
          out[p.id] = { tMin: tMin, tMax: tMax, snowSum: snowSum, rainSum: rainSum, windMax: windMax };
        });
      } catch(e) {
        // Network/timeout/CORS — silent fallback. Other chunks try anyway.
      }
    }
    return out;
  }

  // Refresh all passes (seasonally open) and update cache.
  // Returns when complete; renderList can be called immediately after.
  async function refreshAllStatuses() {
    var openPassi = PASSES.filter(function(p) { return !isClosedNow(p); });
    var closedPassi = PASSES.filter(function(p) { return isClosedNow(p); });

    // Mark closed-by-season immediately
    closedPassi.forEach(function(p) {
      _liveStatus[p.id] = { status:'closed', note:'Chiuso (stagione)' };
    });

    // Batch-fetch weather for open passes
    if (openPassi.length > 0) {
      var w = await fetchPassiWeatherBatch(openPassi);
      openPassi.forEach(function(p) {
        _liveStatus[p.id] = computeStatus(p, w[p.id]);
      });
    }
    saveCachedStatus();
  }

  // Public: trigger manual refresh
  window.psRefreshStatus = async function() {
    await refreshAllStatuses();
    if (typeof renderList === 'function') renderList();
  };
  function difficultyLabel(d) {
    return d === 'easy' ? 'Facile' : d === 'medium' ? 'Medio' : 'Esperto';
  }
  function formatPercent(p) {
    if (p.length && p.alt) {
      // Approximate average gradient (very rough): we don't have base altitude per pass.
      // Skip for cards; only show length+hairpins+alt.
    }
    return '';
  }

  /* ── UI INJECTION ───────────────────────────────────────────── */
  function injectPassiUI() {
    if (document.getElementById('ps-overlay')) return;

    // No launch button — Passi is reached only via the pill tab.

    var ov = document.createElement('div');
    ov.id = 'ps-overlay';
    ov.innerHTML =
      '<div class="ps-hdr">' +
        '<h2>PASSI & STRADE<small>Curato per motociclisti</small></h2>' +
        '<button class="gar-close" onclick="closePassi()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="ps-segctrl">' +
        '<button class="ps-seg on" data-mode="curated">Curati (' + PASSES.length + ')</button>' +
        '<button class="ps-seg" data-mode="nearby">📍 Vicini a me</button>' +
      '</div>' +
      '<div class="ps-filters" id="ps-filters"></div>' +
      '<div class="ps-nearby-bar" id="ps-nearby-bar" style="display:none">' +
        '<label>Raggio</label>' +
        '<select id="ps-nearby-radius">' +
          '<option value="5">5 km</option>' +
          '<option value="10" selected>10 km</option>' +
          '<option value="15">15 km</option>' +
          '<option value="25">25 km</option>' +
        '</select>' +
        '<button class="ps-nearby-go" id="ps-nearby-go" onclick="psNearbySearch()">Cerca</button>' +
      '</div>' +
      '<div class="ps-body" id="ps-body"></div>';
    document.body.appendChild(ov);

    var dm = document.createElement('div');
    dm.id = 'ps-detail';
    dm.onclick = function(e) { if (e.target === dm) closePassoDetail(); };
    dm.innerHTML = '<div class="ps-detail-card" id="ps-detail-card"></div>';
    document.body.appendChild(dm);
  }

  function statusFor(p) {
    return _liveStatus[p.id] || { status: isClosedNow(p) ? 'closed' : 'unknown', note: isClosedNow(p) ? 'Chiuso (stagione)' : 'Stato in aggiornamento…' };
  }

  /* ── State + filters ───────────────────────────────────────── */
  var _filter = 'all';
  function applyFilter(p) {
    if (_filter === 'all') return true;
    if (_filter === 'open') {
      var s = statusFor(p).status;
      return s === 'open' || s === 'caution';  // include "verifica catene" come usabile
    }
    if (_filter === 'easy' || _filter === 'medium' || _filter === 'expert') return p.diff === _filter;
    if (_filter === 'dolomiti') return /Trentino|Veneto/.test(p.region) && p.alt > 1800;
    if (_filter === 'alpi')     return /Lombardia|Piemonte|Trentino|Veneto|Svizzera|Francia/.test(p.region);
    if (_filter === 'appennino')return /Abruzzo|Campania|Lazio|Marche|Umbria|Toscana|Emilia/.test(p.region);
    return true;
  }

  function renderFilters() {
    var el = document.getElementById('ps-filters');
    if (!el) return;
    var defs = [
      { id:'all',       label:'Tutti' },
      { id:'open',      label:'Aperti ora' },
      { id:'dolomiti',  label:'Dolomiti' },
      { id:'alpi',      label:'Alpi' },
      { id:'appennino', label:'Appennini' },
      { id:'easy',      label:'Facili' },
      { id:'medium',    label:'Medi' },
      { id:'expert',    label:'Esperti' },
    ];
    el.innerHTML = defs.map(function(d) {
      return '<button class="ps-fbtn' + (d.id === _filter ? ' on' : '') + '" data-flt="' + d.id + '">' + d.label + '</button>';
    }).join('');
  }

  function renderList() {
    var body = document.getElementById('ps-body');
    if (!body) return;
    var rows = PASSES.filter(applyFilter);
    if (rows.length === 0) {
      body.innerHTML = '<div class="ps-empty">Nessun passo per il filtro selezionato.</div>';
      return;
    }
    // Sort by status (open > caution > unknown > closed), then altitude desc
    var statusRank = { open: 0, caution: 1, unknown: 2, closed: 3 };
    rows.sort(function(a, b) {
      var sa = statusRank[statusFor(a).status] || 2;
      var sb = statusRank[statusFor(b).status] || 2;
      if (sa !== sb) return sa - sb;
      return b.alt - a.alt;
    });
    body.innerHTML = rows.map(function(p) {
      var st = statusFor(p);
      var diff = difficultyLabel(p.diff);
      var statusLabel = st.status === 'open' ? '🟢 Aperto'
                      : st.status === 'caution' ? '🟡 Verifica'
                      : st.status === 'closed' ? '🔴 Chiuso'
                      : '⚪ Ignoto';
      return '<div class="ps-card" data-id="' + p.id + '">' +
        '<div class="ps-card-status status-' + st.status + '">' + statusLabel + '</div>' +
        '<div class="ps-card-name">' + escSafe(p.name) + '</div>' +
        '<div class="ps-card-region">' + escSafe(p.region) + '</div>' +
        '<div class="ps-card-status-note">' + escSafe(st.note) + '</div>' +
        '<div class="ps-card-stats">' +
          '<span><span class="ps-card-stat-lbl">ALT</span>' + p.alt + ' m</span>' +
          '<span><span class="ps-card-stat-lbl">LUNGH</span>' + p.length + ' km</span>' +
          '<span><span class="ps-card-stat-lbl">TORN</span>' + p.hairpins + '</span>' +
          '<span class="ps-card-diff">' + diff + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Public functions ──────────────────────────────────────── */
  window.openPassi = function() {
    injectPassiUI();
    document.getElementById('ps-overlay').classList.add('visible');
    renderFilters();
    // Load cached statuses; if cache expired, render placeholder + refresh in background
    var fresh = loadCachedStatus();
    renderList();
    if (!fresh) {
      refreshAllStatuses().then(function() {
        renderList();  // re-render with fresh statuses
      });
    }
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closePassi = function() {
    document.getElementById('ps-overlay').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closePassoDetail = function() {
    document.getElementById('ps-detail').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  /* ── Detail view ───────────────────────────────────────────── */
  function openDetail(passoId) {
    var p = PASSES.find(function(x) { return x.id === passoId; });
    if (!p) return;
    var closed = isClosedNow(p);
    var diff = difficultyLabel(p.diff);
    var card = document.getElementById('ps-detail-card');
    var closedMonths = p.closed ? p.closed.map(function(m) {
      return ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][m-1];
    }).join(', ') : 'Sempre aperto';

    card.innerHTML =
      '<div class="ps-detail-hdr">' +
        '<h3>' + escSafe(p.name) + '</h3>' +
        '<div class="ps-detail-hdr-region">' + escSafe(p.region) + '</div>' +
      '</div>' +
      '<div class="ps-detail-body">' +
        '<div class="ps-detail-grid">' +
          '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Altitudine</div><div class="ps-detail-cell-val">' + p.alt + ' m</div></div>' +
          '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Lunghezza</div><div class="ps-detail-cell-val">' + p.length + ' km</div></div>' +
          '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Tornanti</div><div class="ps-detail-cell-val">' + p.hairpins + '</div></div>' +
          '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Difficoltà</div><div class="ps-detail-cell-val">' + diff + '</div></div>' +
          '<div class="ps-detail-cell" style="grid-column:span 2"><div class="ps-detail-cell-lbl">Stato attuale</div><div class="ps-detail-cell-val" style="font-size:.85rem">' +
            (closed ? '⚠ Chiuso · ' : '✓ Aperto · ') + 'mesi chiusi: ' + closedMonths +
          '</div></div>' +
        '</div>' +
        '<div class="ps-detail-desc">' + escSafe(p.desc) + '</div>' +
        '<div class="ps-detail-weather" id="ps-detail-weather">' +
          '<div class="ps-detail-weather-loading">Carico meteo dal passo...</div>' +
        '</div>' +
      '</div>' +
      '<div class="ps-detail-actions">' +
        '<button class="ps-detail-close" onclick="closePassoDetail()">Chiudi</button>' +
        '<a class="ps-detail-maps" href="https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng + '&travelmode=driving" target="_blank" rel="noopener">📍 Apri in Maps</a>' +
      '</div>';

    document.getElementById('ps-detail').classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
    fetchPassoWeather(p);
  }

  function fetchPassoWeather(p) {
    var slot = document.getElementById('ps-detail-weather');
    if (!slot) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat.toFixed(4) +
              '&longitude=' + p.lng.toFixed(4) +
              '&current_weather=true&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto';
    fetch(url).then(function(r) { return r.json(); }).then(function(data) {
      var cw = data.current_weather;
      if (!cw) throw new Error('no current weather');
      var icon = weatherIcon(cw.weathercode);
      var desc = weatherDesc(cw.weathercode);
      var wind = cw.windspeed ? ' · vento ' + Math.round(cw.windspeed) + ' km/h' : '';
      slot.innerHTML =
        '<div class="ps-detail-weather-icon">' + icon + '</div>' +
        '<div class="ps-detail-weather-info">' +
          '<div class="ps-detail-weather-temp">' + Math.round(cw.temperature) + '°C</div>' +
          '<div class="ps-detail-weather-desc">' + desc + wind + ' · al passo ora</div>' +
        '</div>';
    }).catch(function() {
      slot.innerHTML = '<div class="ps-detail-weather-loading">Meteo non disponibile</div>';
    });
  }

  function weatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫';
    if (code <= 67) return '🌧';
    if (code <= 77) return '🌨';
    if (code <= 82) return '🌧';
    if (code <= 86) return '🌨';
    return '⛈';
  }
  function weatherDesc(code) {
    if (code === 0) return 'Sereno';
    if (code <= 3) return 'Nuvoloso';
    if (code <= 48) return 'Nebbia';
    if (code <= 67) return 'Pioggia';
    if (code <= 77) return 'Neve';
    if (code <= 82) return 'Rovesci';
    if (code <= 86) return 'Rovesci di neve';
    return 'Temporale';
  }

  /* ════════════════════════════════════════════════════════════════
     NEARBY ROADS ENGINE — Overpass + curvature scoring
     ════════════════════════════════════════════════════════════════ */
  var _nearbyMode = false;
  var _nearbyCache = {};   // key = `${lat3}_${lng3}_${radius}` → { ts, results }
  var NEARBY_CACHE_KEY = 'hub_nearby_v1';
  try {
    _nearbyCache = JSON.parse(localStorage.getItem(NEARBY_CACHE_KEY) || '{}');
  } catch(e) {}

  function setMode(mode) {
    var ov = document.getElementById('ps-overlay');
    if (!ov) return;
    _nearbyMode = (mode === 'nearby');
    ov.classList.toggle('ps-mode-nearby', _nearbyMode);
    document.querySelectorAll('.ps-seg').forEach(function(s) {
      s.classList.toggle('on', s.dataset.mode === mode);
    });
    document.getElementById('ps-nearby-bar').style.display = _nearbyMode ? 'flex' : 'none';
    if (_nearbyMode) {
      renderNearbyIntro();
    } else {
      renderFilters();
      renderList();
    }
  }

  function renderNearbyIntro() {
    var body = document.getElementById('ps-body');
    if (!body) return;
    body.innerHTML =
      '<div class="ps-empty">' +
        'Trova strade ad alta curvatura intorno a te.<br>' +
        'Scegli un raggio e tap su <strong>Cerca</strong>.' +
      '</div>' +
      '<div class="ps-nearby-disclaimer">' +
        'Dati strade da OpenStreetMap, calcolo curvatura locale. Niente account/API key. ' +
        'Risultati cached 10 minuti per zona. ' +
        'Niente filtro stagionale: in inverno strade alte potrebbero essere chiuse.' +
      '</div>';
  }

  function haversineKm(a, b) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * toRad;
    var dLng = (b[1] - a[1]) * toRad;
    var la1 = a[0] * toRad, la2 = b[0] * toRad;
    var x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(la1) * Math.cos(la2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function turnAngleDeg(a, b, c) {
    // bearing change at b, in degrees, absolute
    var toRad = Math.PI / 180, toDeg = 180 / Math.PI;
    function bearing(p, q) {
      var dLng = (q[1] - p[1]) * toRad;
      var la1 = p[0] * toRad, la2 = q[0] * toRad;
      var y = Math.sin(dLng) * Math.cos(la2);
      var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
      return Math.atan2(y, x) * toDeg;
    }
    var b1 = bearing(a, b), b2 = bearing(b, c);
    var diff = b2 - b1;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return Math.abs(diff);
  }

  function computeRoad(way, nodesById) {
    var coords = way.nodes.map(function(id) {
      var n = nodesById[id];
      return n ? [n.lat, n.lon] : null;
    }).filter(Boolean);
    if (coords.length < 4) return null;
    var lengthKm = 0;
    for (var i = 1; i < coords.length; i++) lengthKm += haversineKm(coords[i-1], coords[i]);
    if (lengthKm < 1.5) return null;

    var totalTurn = 0;
    var hairpinish = 0;
    for (var i = 1; i < coords.length - 1; i++) {
      var ang = turnAngleDeg(coords[i-1], coords[i], coords[i+1]);
      totalTurn += ang;
      if (ang > 60) hairpinish++;
    }
    var score = totalTurn / lengthKm; // °/km
    if (score < 40) return null;
    return {
      id: way.id,
      name: (way.tags && way.tags.name) || (way.tags && way.tags.ref) || 'Strada senza nome',
      ref:  way.tags && way.tags.ref,
      type: way.tags && way.tags.highway,
      coords: coords,
      lengthKm: lengthKm,
      totalTurn: totalTurn,
      score: score,
      hairpins: hairpinish,
      midpoint: coords[Math.floor(coords.length / 2)]
    };
  }

  // Overpass query: highways within radius + viewpoints/peaks for bonus
  function buildOverpassQuery(lat, lng, radiusKm) {
    var r = Math.round(radiusKm * 1000);
    return '[out:json][timeout:25];' +
      '(' +
        'way(around:' + r + ',' + lat + ',' + lng + ')' +
          '["highway"~"^(primary|secondary|tertiary|unclassified|residential)$"]' +
          '["surface"!="gravel"]["surface"!="dirt"]' +
          '["area"!="yes"]' +
          '["service"!~"."]' +
          ';' +
        'node(around:' + r + ',' + lat + ',' + lng + ')' +
          '["natural"="peak"];' +
        'node(around:' + r + ',' + lat + ',' + lng + ')' +
          '["tourism"="viewpoint"];' +
      ');' +
      'out body geom;';
  }

  async function fetchOverpass(lat, lng, radiusKm) {
    var key = lat.toFixed(3) + '_' + lng.toFixed(3) + '_' + radiusKm;
    var now = Date.now();
    var cached = _nearbyCache[key];
    if (cached && (now - cached.ts) < 10 * 60 * 1000) {
      return cached.data;
    }
    var endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.fr/api/interpreter'
    ];
    var query = buildOverpassQuery(lat, lng, radiusKm);
    var lastErr = null;
    for (var i = 0; i < endpoints.length; i++) {
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function() { ctrl.abort(); }, 30000);
        var r = await fetch(endpoints[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var data = await r.json();
        _nearbyCache[key] = { ts: now, data: data };
        try { localStorage.setItem(NEARBY_CACHE_KEY, JSON.stringify(_nearbyCache)); } catch(_) {}
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Tutti gli endpoint Overpass non disponibili');
  }

  function processOverpass(data, centerLat, centerLng) {
    if (!data || !data.elements) return { roads: [], pois: [] };
    // Build node map
    var nodesById = {};
    var pois = [];
    data.elements.forEach(function(el) {
      if (el.type === 'node') {
        nodesById[el.id] = { lat: el.lat, lon: el.lon };
        if (el.tags && (el.tags.natural === 'peak' || el.tags.tourism === 'viewpoint')) {
          pois.push({ lat: el.lat, lon: el.lon, kind: el.tags.natural || el.tags.tourism, name: el.tags.name });
        }
      } else if (el.type === 'way' && el.geometry && el.geometry.length) {
        // Overpass with "out body geom" embeds geometry per way; but we requested "out body geom"
        // which gives nodes ids, not geometry. We must request "out geom" to get coords inline.
        // Fallback: synthesize nodesById from el.geometry.
        el.nodes = el.nodes || el.geometry.map(function(_, i) { return el.id + '_' + i; });
        for (var i = 0; i < el.geometry.length; i++) {
          var nid = el.nodes[i];
          if (!nodesById[nid]) nodesById[nid] = { lat: el.geometry[i].lat, lon: el.geometry[i].lon };
        }
      }
    });

    var roads = [];
    data.elements.forEach(function(el) {
      if (el.type !== 'way') return;
      var road = computeRoad(el, nodesById);
      if (!road) return;
      // Bonus: ☆ if a POI is within 500m of any midway point
      road.scenicBonus = false;
      var mid = road.midpoint;
      for (var p = 0; p < pois.length; p++) {
        if (haversineKm(mid, [pois[p].lat, pois[p].lon]) < 0.5) {
          road.scenicBonus = true; break;
        }
      }
      roads.push(road);
    });
    roads.sort(function(a, b) { return b.score - a.score; });
    return { roads: roads.slice(0, 10), pois: pois };
  }

  // Mini-map SVG of road coords
  function roadSVG(coords, w, h) {
    if (!coords || coords.length < 2) return '';
    var lats = coords.map(function(c){return c[0];});
    var lngs = coords.map(function(c){return c[1];});
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
    var dLat = maxLat - minLat || 0.0005;
    var dLng = maxLng - minLng || 0.0005;
    var pad = 4;
    var path = coords.map(function(c, i) {
      var x = pad + (c[1] - minLng) / dLng * (w - 2*pad);
      var y = pad + (maxLat - c[0]) / dLat * (h - 2*pad);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path d="' + path + '" stroke="#c97fd4" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  }

  function renderNearbyResults(roads, lat, lng) {
    var body = document.getElementById('ps-body');
    if (!body) return;
    if (!roads || roads.length === 0) {
      body.innerHTML =
        '<div class="ps-empty">' +
          'Nessuna strada con curvatura significativa trovata in quest\'area.<br>' +
          'Prova ad aumentare il raggio.' +
        '</div>';
      return;
    }
    var html = roads.map(function(r) {
      var bonus = r.scenicBonus ? '<span class="psn-card-bonus">☆ panorami</span>' : '';
      var lat0 = r.midpoint[0], lng0 = r.midpoint[1];
      return '<div class="psn-card" data-lat="' + lat0 + '" data-lng="' + lng0 + '" data-name="' + escSafe(r.name) + '">' +
        '<div class="psn-card-map">' + roadSVG(r.coords, 72, 72) + '</div>' +
        '<div class="psn-card-info">' +
          '<div class="psn-card-name">' + escSafe(r.name) + bonus + '</div>' +
          '<div class="psn-card-stats">' +
            '<span class="psn-card-score">' + Math.round(r.score) + ' °/km</span>' +
            '<span><span class="psn-card-stat-lbl">LUNGH</span>' + r.lengthKm.toFixed(1) + ' km</span>' +
            '<span><span class="psn-card-stat-lbl">TORN</span>~' + r.hairpins + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    body.innerHTML = html;
  }

  window.psNearbySearch = async function() {
    if (!navigator.geolocation) {
      document.getElementById('ps-body').innerHTML = '<div class="ps-nearby-error">GPS non disponibile sul dispositivo.</div>';
      return;
    }
    var radius = parseFloat(document.getElementById('ps-nearby-radius').value) || 10;
    var btn = document.getElementById('ps-nearby-go');
    var body = document.getElementById('ps-body');
    btn.disabled = true;
    body.innerHTML = '<div class="ps-nearby-loading ps-nearby-spinner">Acquisizione posizione</div>';

    navigator.geolocation.getCurrentPosition(async function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      body.innerHTML = '<div class="ps-nearby-loading ps-nearby-spinner">Cerco strade entro ' + radius + ' km</div>';
      try {
        var raw = await fetchOverpass(lat, lng, radius);
        body.innerHTML = '<div class="ps-nearby-loading ps-nearby-spinner">Calcolo curvatura</div>';
        // Defer compute slightly to let the spinner render
        await new Promise(function(r) { setTimeout(r, 30); });
        var processed = processOverpass(raw, lat, lng);
        renderNearbyResults(processed.roads, lat, lng);
      } catch (e) {
        body.innerHTML = '<div class="ps-nearby-error">Errore: ' + escSafe(e.message || String(e)) +
          '<br><small>Overpass è gratis ma rate-limited. Riprova fra qualche minuto.</small></div>';
      } finally {
        btn.disabled = false;
      }
    }, function(err) {
      btn.disabled = false;
      body.innerHTML = '<div class="ps-nearby-error">GPS errore: ' + escSafe(err.message || ('code ' + err.code)) + '</div>';
    }, { enableHighAccuracy: true, timeout: 15000 });
  };

  /* ── Event delegation for cards + filters ──────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(injectPassiUI, 350);

    document.addEventListener('click', function(ev) {
      var card = ev.target.closest('#ps-body .ps-card');
      if (card) {
        openDetail(card.dataset.id);
        return;
      }
      var ncard = ev.target.closest('#ps-body .psn-card');
      if (ncard) {
        var lat = ncard.dataset.lat, lng = ncard.dataset.lng;
        var name = ncard.dataset.name || 'Strada';
        var url = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
        window.open(url, '_blank', 'noopener');
        return;
      }
      var fbtn = ev.target.closest('#ps-filters .ps-fbtn');
      if (fbtn) {
        _filter = fbtn.dataset.flt;
        renderFilters();
        renderList();
        return;
      }
      var seg = ev.target.closest('.ps-seg');
      if (seg) {
        setMode(seg.dataset.mode);
      }
    });
  });
})();

