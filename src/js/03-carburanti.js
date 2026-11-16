

let WORKER = 'https://osservaprezzi.gabrycois.workers.dev';
let activeComune = null;
let activeProv = '';   // sigla provincia del comune attivo (distingue i comuni omonimi)
let activeFuel = 'Benzina';
let activeSelf = false;
let suggestTimer = null;
let _stationData = [];
let _mapStationById = {};
let _gpsLat = null, _gpsLng = null;

// ── Init ──────────────────────────────────────────────────────
function _fuelLazyInit() {
  startApp();
  document.getElementById('frow').style.display = 'flex';
  updateFavBtn();
  applyCardVisibility();
  updateTs();
  setInterval(updateTs, 30000);
  document.getElementById('qinput').addEventListener('input', onInput);
  document.getElementById('qinput').addEventListener('keydown', e => { if(e.key==='Enter'){ document.getElementById('sug').style.display='none'; doSearch(); } });
  document.addEventListener('click', e => { if(!e.target.closest('#sug') && !e.target.closest('#qinput')) document.getElementById('sug').style.display='none'; });
}
window._fuelLazyInit = _fuelLazyInit;

// ── Setup ─────────────────────────────────────────────────────
// ── App start ─────────────────────────────────────────────────
function startApp() {
  showLoader(true);
  document.getElementById('app').style.display = 'none';
  loadMedie();
}

function showLoader(show) {
  document.getElementById('loader').style.display = show ? 'flex' : 'none';
}

async function loadMedie() {
  document.getElementById('lerr').style.display = 'none';
  document.getElementById('lretry').style.display = 'none';
  setLd(10, 'Connessione al Worker…');
  try {
    setLd(40, 'Carico medie nazionali…');
    const data = await api('/api/medie');
    setLd(100, 'Pronto!');
    renderMedie(data);
    await sleep(250);
    showLoader(false);
    document.getElementById('app').style.display = 'block';
  } catch(e) {
    document.getElementById('lmsg').textContent = '';
    document.getElementById('lerr').textContent = 'Errore: ' + e.message;
    document.getElementById('lerr').style.display = 'block';
    document.getElementById('lretry').style.display = 'block';
  }
}

function setLd(pct, msg) {
  document.getElementById('lbar').style.width = pct + '%';
  document.getElementById('lmsg').textContent = msg;
}

// ── API ───────────────────────────────────────────────────────
async function api(path) {
  const res = await fetch(WORKER + path);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// ── Medie nazionali ───────────────────────────────────────────
function renderMedie(data) {
  if (data._cachedAt && data._nextUpdate) renderUpdateBar(data._cachedAt, data._nextUpdate, data._extractionDate);
  const map = { bz:'Benzina', go:'Diesel', gpl:'GPL', met:'Metano' };
  for (const [k, fuel] of Object.entries(map)) {
    const d = data[fuel] || {};
    const avg = document.getElementById('avg-' + k);
    // GPL e metano sono quasi solo "servito": senza prezzo self si mostra il servito invece di "n.d."
    const main = d.self || d.serv;
    avg.textContent = main ? main.toFixed(3) : 'n.d.';
    avg.classList.remove('flash'); void avg.offsetWidth; avg.classList.add('flash');
    document.getElementById('s-' + k).textContent = d.self  ? 'self '  + d.self.toFixed(3)  : 'self n.d.';
    document.getElementById('v-' + k).textContent = d.serv  ? 'serv. ' + d.serv.toFixed(3)  : 'serv. n.d.';
  }
}

// ── Autocomplete ──────────────────────────────────────────────
function onInput() {
  clearTimeout(suggestTimer);
  const q = document.getElementById('qinput').value.trim();
  if (q.length < 2) { document.getElementById('sug').style.display = 'none'; return; }
  // CAP: no autocomplete, just wait for search
  if (/^\d+$/.test(q)) {
    document.getElementById('sug').style.display = 'none';
    return;
  }
  suggestTimer = setTimeout(() => fetchSuggest(q), 280);
}

async function fetchSuggest(q) {
  try {
    const results = await api('/api/comuni?q=' + encodeURIComponent(q));
    const sug = document.getElementById('sug');
    if (!results.length) { sug.style.display = 'none'; return; }
    sug.innerHTML = '';
    results.forEach(r => {
      const div = document.createElement('div');
      div.className = 'sug-row';
      div.innerHTML = `<span>${capFn(r.nome)}</span><span class="sug-prov">${r.provincia} · ${r.count} imp.</span>`;
      div.onclick = () => {
        document.getElementById('qinput').value = capFn(r.nome);
        sug.style.display = 'none';
        activeComune = r.nome; activeProv = r.provincia || '';
        resetFilters();
        refetchStations();
      };
      sug.appendChild(div);
    });
    sug.style.display = 'block';
  } catch(e) {}
}

// ── Cerca ─────────────────────────────────────────────────────
async function doSearch() {
  clearGPSLocation();
  _gpsActive = false;
  _sortByDist = false;
  document.getElementById('sort-dist-btn').style.display = 'none';
  const q = document.getElementById('qinput').value.trim();
  if (!q) { document.getElementById('qinput').focus(); return; }

  // Detect CAP (5 digits)
  if (/^\d{5}$/.test(q)) {
    await searchByCAP(q);
    return;
  }

  const qu = q.toUpperCase();
  try {
    const res = await api('/api/comuni?q=' + encodeURIComponent(qu));
    if (res.length > 0) {
      const exact = res.find(r => r.nome === qu) || res[0];
      activeComune = exact.nome; activeProv = exact.provincia || '';
      document.getElementById('qinput').value = capFn(exact.nome);
      resetFilters();
      refetchStations();
    } else {
      setStatus('err', 'Comune non trovato');
      document.getElementById('fuel-results').innerHTML = `<div class="no-res">Nessun comune trovato per "${esc(capFn(qu))}"</div>`;
    }
  } catch(e) {
    setStatus('err', e.message);
  }
}

async function searchByCAP(cap_code) {
  setStatus('ld', 'Risolvo il CAP ' + cap_code + '…');
  document.getElementById('sbtn').disabled = true;
  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${cap_code}&country=Italy&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'it' } });
    if (!res.ok) throw new Error('Nominatim HTTP ' + res.status);
    const data = await res.json();
    if (!data.length) {
      setStatus('err', 'CAP non trovato');
      document.getElementById('fuel-results').innerHTML = `<div class="no-res">CAP ${cap_code} non trovato. Prova a inserire il nome del comune.</div>`;
      return;
    }
    // Extract comune from result
    const addr = data[0].address || {};
    const comuneName = (addr.village || addr.town || addr.city || addr.municipality || '').toUpperCase();
    if (!comuneName) throw new Error('Impossibile determinare il comune dal CAP');

    // Try to find in MIMIT index
    const res2 = await api('/api/comuni?q=' + encodeURIComponent(comuneName.slice(0, 6)));
    const match = res2.find(r => r.nome === comuneName) || res2[0];
    if (!match) {
      setStatus('err', 'Comune non trovato nel database MIMIT');
      document.getElementById('fuel-results').innerHTML = `<div class="no-res">CAP ${cap_code} corrisponde a <strong>${esc(capFn(comuneName))}</strong>, ma non è presente nel database MIMIT.</div>`;
      return;
    }
    activeComune = match.nome; activeProv = match.provincia || '';
    document.getElementById('qinput').value = capFn(match.nome) + ' (' + cap_code + ')';
    resetFilters();
    refetchStations();
  } catch(e) {
    setStatus('err', 'Errore CAP: ' + e.message);
  } finally {
    document.getElementById('sbtn').disabled = false;
  }
}

async function fetchStations() {
  if (!activeComune) return;
  document.getElementById('frow').style.display = 'flex';
  setStatus('ld', 'Cerco impianti a ' + capFn(activeComune) + '…');
  document.getElementById('sbtn').disabled = true;
  try {
    const url = `/api/cerca?comune=${encodeURIComponent(activeComune)}${activeProv ? '&provincia=' + encodeURIComponent(activeProv) : ''}&carburante=${encodeURIComponent(activeFuel)}&self=${activeSelf?1:0}`;
    const data = await api(url);
    renderStations(data);
    setStatus('ok', `${data.length} impianti trovati · ${capFn(activeComune)}`);
  } catch(e) {
    setStatus('err', 'Errore: ' + e.message);
  } finally {
    document.getElementById('sbtn').disabled = false;
  }
}

function renderStations(data) {
  const area = document.getElementById('fuel-results');
  if (!data.length) {
    area.innerHTML = `<div class="no-res">Nessun impianto trovato ${activeComune ? 'a ' + esc(capFn(activeComune)) : 'entro 10 km'} per ${esc(activeFuel)}${activeSelf?' self service':''}.</div>`;
    return;
  }
  _stationData = data;
  const minP = data[0].prezzo, maxP = data[data.length-1].prezzo;
  const unit = activeFuel === 'Metano' ? 'kg' : 'lt';
  let html = `<div class="res-hdr fi">
    <div class="res-title">${activeFuel} · ${activeComune ? capFn(activeComune) : "Vicino a te"}</div>
    <div class="res-sub">min <span style="color:var(--gn)">${minP.toFixed(3)}</span> — max <span style="color:var(--rd)">${maxP.toFixed(3)}</span></div>
  </div><div class="slist fi">`;
  data.forEach((s, i) => {
    const r = i+1, rc = r===1?'r1':r===2?'r2':r===3?'r3':'';
    const pc = s.prezzo <= minP*1.005 ? 'cheap' : s.prezzo >= maxP*0.995 ? 'dear' : '';
    html += `<div class="station" onclick="openModalIdx(${i})" style="cursor:pointer">
      <div class="st-rank ${rc}">${r}</div>
      <div class="st-info">
        <div class="st-name">${esc(s.nome)}</div>
        <div class="st-addr">${esc(s.indirizzo)}</div>
        <div class="st-tags">
          ${s.bandiera ? `<span class="st-tag">${esc(s.bandiera)}</span>` : ''}
          <span class="st-tag">${s.isSelf?'self':'servito'}</span>
        </div>
      </div>
      <div class="st-p">
        <div class="st-price ${pc}">${s.prezzo.toFixed(3)}</div>
        <div class="st-unit">€/${unit}</div>
        <div class="st-dt">${s.dtComu||''}</div>
        ${s.distanza!=null?`<div class="dist-badge">📍 ${s.distanza} km</div>`:''}
        <button class="fav-btn ${isFav(s.id)?'on':''}" onclick="event.stopPropagation();toggleFav(${i})" title="${isFav(s.id)?'Rimuovi':'Salva'}">${isFav(s.id)?'★ Salvato':'☆ Salva'}</button>
      </div>
    </div>`;
  });
  html += '</div>';
  if (data.length === 60) html += `<div style="font-size:.68rem;color:var(--mut);text-align:center;margin-top:-10px;margin-bottom:16px">Mostrati i 60 più economici</div>`;

  // ── Costo pieno dal veicolo attivo ──────────────────────────
  try {
    var v = window.hubGarage && window.hubGarage.active && window.hubGarage.active();
    var tank = v && (v.serbatoio || (v.type === 'moto' ? 18 : 50)); // litri
    if (v && tank && minP && activeFuel !== 'EV') {
      var pienoCheap = (minP * tank).toFixed(2);
      var pienoAvg   = ((minP + maxP) / 2 * tank).toFixed(2);
      var risparmio  = ((maxP - minP) * tank).toFixed(2);
      var vName = v.customName || ((v.marca || '') + ' ' + (v.modello || '')).trim() || 'il tuo veicolo';
      html += '<div class="pieno-card">' +
        '<div class="pieno-title">⛽ Costo pieno · ' + esc(vName) + '</div>' +
        '<div class="pieno-row">' +
          '<div class="pieno-cell">' +
            '<div class="pieno-val" style="color:var(--gn)">€' + pienoCheap + '</div>' +
            '<div class="pieno-lbl">più economica</div>' +
          '</div>' +
          '<div class="pieno-cell">' +
            '<div class="pieno-val">€' + pienoAvg + '</div>' +
            '<div class="pieno-lbl">prezzo medio</div>' +
          '</div>' +
          '<div class="pieno-cell">' +
            '<div class="pieno-val" style="color:#ffd699">€' + risparmio + '</div>' +
            '<div class="pieno-lbl">risparmio max</div>' +
          '</div>' +
        '</div>' +
        '<div class="pieno-sub">Calcolato su ' + tank + ' lt · <span class="pieno-edit" onclick="_hubOpenTankEdit()">modifica serbatoio</span></div>' +
      '</div>';
    }
  } catch(_e) {}

  area.innerHTML = html;
  buildBandieraFilter(data);
  renderFavSection();
}

// ── Filters ───────────────────────────────────────────────────
function setFuel(btn) {
  activeFuel = btn.dataset.f;
  document.querySelectorAll('.fb[data-f]').forEach(b => b.classList.toggle('on', b===btn));
  const evBox = document.getElementById('ev-results');
  evBox.classList.add('hidden');
  evBox.innerHTML = '';
  if (activeFuel === 'EV') {
    document.getElementById('fuel-results').innerHTML = '';
    const evBox = document.getElementById('ev-results');
    if (_gpsLat) {
      loadEVHome(_gpsLat, _gpsLng, 10);
    } else if (activeComune) {
      evBox.classList.remove('hidden');
      evBox.innerHTML = '<div style="color:var(--mut);font-size:.78rem;padding:12px 0;text-align:center">Carico colonnine...</div>';
      fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(activeComune) + '+Italia&format=json&limit=1')
        .then(r => r.json())
        .then(d => {
          if (d.length) loadEVHome(parseFloat(d[0].lat), parseFloat(d[0].lon), 10);
          else evBox.innerHTML = '<div style="color:var(--mut);font-size:.78rem;padding:12px 0;text-align:center">Comune non trovato.</div>';
        })
        .catch(() => evBox.innerHTML = '<div style="color:var(--rd);font-size:.78rem;padding:12px 0">Errore di rete.</div>');
    } else {
      evBox.classList.remove('hidden');
      evBox.innerHTML = '<div style="color:var(--mut);font-size:.78rem;padding:12px 0;text-align:center">Cerca prima un comune o usa il GPS, poi attiva &#9889; EV.</div>';
    }
  } else {
    refetchStations();
  }
}

// Rilancia l'ultima ricerca (per comune o GPS) con carburante/self correnti.
function refetchStations() {
  if (activeFuel === 'EV') {
    const evBtn = document.querySelector('.fb[data-f="EV"]');
    if (evBtn) { setFuel(evBtn); return; }
  }
  if (activeComune) fetchStations();
  else if (_gpsActive && _gpsLat != null) fetchNearby(_gpsLat, _gpsLng);
}

async function fetchNearby(lat, lng) {
  setStatus('ld', 'Cerco distributori vicino a te…');
  try {
    const url = `/api/vicini?lat=${lat}&lng=${lng}&carburante=${encodeURIComponent(activeFuel)}&self=${activeSelf?1:0}&raggio=10`;
    const data = await api(url);
    renderStations(data, { gps: true, lat, lng });
    setStatus('ok', `${data.length} impianti entro 10 km`);
  } catch(e) { setStatus('err', 'Errore: ' + e.message); }
}

function toggleSelf() {
  activeSelf = !activeSelf;
  const btn = document.getElementById('self-btn');
  btn.classList.toggle('on', activeSelf);
  btn.textContent = activeSelf ? '✓ Solo self' : 'Solo self';
  refetchStations();
}

// Azzera solo i filtri legati alla ricerca precedente (marchio, ordinamento).
// Carburante e "solo self" restano quelli scelti dall'utente o dal veicolo attivo.
function resetFilters() {
  activeBandiera = null;
  document.getElementById('brow').style.display = 'none';
  _sortByDist = false;
  const sdb = document.getElementById('sort-dist-btn');
  if (sdb) { sdb.classList.remove('on'); sdb.textContent = '↕ Distanza'; }
}

// ── Utils ─────────────────────────────────────────────────────
function setStatus(s, msg) {
  const d = document.getElementById('sdot');
  d.className = 'dot' + (s==='ld'?' ld':s==='ok'?' ok':s==='err'?' err':'');
  document.getElementById('stxt').textContent = msg;
}

function updateTs() {
  const n = new Date();
  document.getElementById('ts-badge').textContent =
    n.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
}

function capFn(s) { return s ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : ''; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }




// ── MAP VIEW ──────────────────────────────────────────────────
let _map = null;
let _mapMarkers = [];
let _mapFuel = 'Benzina';
let _mapSelf = true;
let _mapCenter = null;
let _userMarker = null;
let _mapInitialized = false;

function openMapView() {
  document.getElementById('map-view').classList.add('visible');
  document.body.style.overflow = 'hidden';
  initMapSearch();
  if (!_mapInitialized) {
    initMap();
    _mapInitialized = true;
  }
}

function closeMapView() {
  document.getElementById('map-view').classList.remove('visible');
  document.body.style.overflow = '';
}


// ── Map place search ──────────────────────────────────────────
let _mapSearchTimer = null;

function initMapSearch() {
  const inp = document.getElementById('map-search-input');
  if (!inp || inp._inited) return;
  inp._inited = true;

  inp.addEventListener('input', () => {
    clearTimeout(_mapSearchTimer);
    const q = inp.value.trim();
    const sug = document.getElementById('map-search-sug');
    if (q.length < 2) { sug.classList.add('hidden'); return; }
    _mapSearchTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) +
          '&format=json&limit=5&accept-language=it&countrycodes=it'
        );
        const data = await res.json();
        if (!data.length) { sug.classList.add('hidden'); return; }
        sug.innerHTML = '';
        data.forEach(r => {
          const parts = r.display_name.split(',');
          const div = document.createElement('div');
          div.className = 'map-sug-item';
          div.innerHTML = '<div>' + esc(parts[0]) + '</div><div class="map-sug-sub">' + esc(parts.slice(1,3).join(',')) + '</div>';
          div.addEventListener('click', () => {
            inp.value = parts[0];
            sug.classList.add('hidden');
            const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
            _mapCenter = { lat, lng };
            _map.setView([lat, lng], 14);
            loadMapStations();
          });
          sug.appendChild(div);
        });
        sug.classList.remove('hidden');
      } catch(e) {}
    }, 320);
  });

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { mapGoToPlace(); }
    if (e.key === 'Escape') { document.getElementById('map-search-sug').classList.add('hidden'); }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.map-search-bar')) {
      document.getElementById('map-search-sug').classList.add('hidden');
    }
  });
}

async function mapGoToPlace() {
  const q = document.getElementById('map-search-input').value.trim();
  if (!q) return;
  document.getElementById('map-search-sug').classList.add('hidden');
  setMapStatus('Cerco ' + q + '…');
  try {
    const res = await fetch(
      'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) +
      '&format=json&limit=1&accept-language=it&countrycodes=it'
    );
    const data = await res.json();
    if (!data.length) { setMapStatus('Posto non trovato'); return; }
    const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
    _mapCenter = { lat, lng };
    _map.setView([lat, lng], 14);
    loadMapStations();
    scheduleWeatherUpdate(lat, lng);
  } catch(e) { setMapStatus('Errore: ' + e.message); }
}


// ── Map weather widget ────────────────────────────────────────
let _weatherTimer = null;
let _weatherLat = null;
let _weatherLng = null;

// WMO weather code -> emoji + label
function wmoToIcon(code, isDay) {
  if (code === 0)              return { icon: isDay ? '☀️' : '🌙', label: 'Sereno' };
  if (code <= 2)               return { icon: isDay ? '🌤' : '☁️', label: 'Poco nuvoloso' };
  if (code === 3)              return { icon: '☁️', label: 'Nuvoloso' };
  if (code <= 49)              return { icon: '🌫', label: 'Nebbia' };
  if (code <= 55)              return { icon: '🌦', label: 'Pioggia leggera' };
  if (code <= 65)              return { icon: '🌧', label: 'Pioggia' };
  if (code <= 75)              return { icon: '🌨', label: 'Neve' };
  if (code <= 77)              return { icon: '❄️', label: 'Neve granulare' };
  if (code <= 82)              return { icon: '🌦', label: 'Rovesci' };
  if (code <= 86)              return { icon: '🌨', label: 'Rovesci neve' };
  if (code <= 99)              return { icon: '⛈', label: 'Temporale' };
  return { icon: '🌡', label: '' };
}

async function updateMapWeather(lat, lng) {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) +
      '&longitude=' + lng.toFixed(4) +
      '&current=temperature_2m,weather_code,is_day&timezone=auto&forecast_days=1'
    );
    if (!res.ok) return;
    const d = await res.json();
    const c = d.current;
    const { icon, label } = wmoToIcon(c.weather_code, c.is_day === 1);
    const temp = Math.round(c.temperature_2m);
    document.getElementById('map-weather-icon').textContent = icon;
    document.getElementById('map-weather-temp').textContent = temp + '°';
    document.getElementById('map-weather-desc').textContent = label;
    document.getElementById('map-weather').classList.add('visible');
  } catch(e) {}
}

function scheduleWeatherUpdate(lat, lng) {
  clearTimeout(_weatherTimer);
  _weatherLat = lat; _weatherLng = lng;
  _weatherTimer = setTimeout(() => updateMapWeather(lat, lng), 600);
}

/* ── Sfondo della mappa ────────────────────────────────────────────
   1. OpenFreeMap "dark" (vettoriale, gratis, senza chiave né registrazione).
      Serve MapLibre: viene scaricato solo la prima volta che apri la mappa.
   2. Se MapLibre non parte (niente WebGL o CDN irraggiungibile): OpenStreetMap
      scurito via CSS. Nota: OSM blocca le pagine aperte da file:// (manca il Referer).
   CARTO dal 25/09/2026 vuole una chiave: se ne hai una, mettila in CARTO_KEY
   e viene usata al posto di tutto il resto. */
const CARTO_KEY = '';
const OFM_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const MAPLIBRE_JS  = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css';
const MAPLIBRE_LEAFLET_JS = 'https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js';
const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function loadAsset(url, isCss) {
  return new Promise((resolve, reject) => {
    if (document.querySelector((isCss ? 'link[href="' : 'script[src="') + url + '"]')) return resolve();
    const el = document.createElement(isCss ? 'link' : 'script');
    if (isCss) { el.rel = 'stylesheet'; el.href = url; } else { el.src = url; }
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('non caricato: ' + url));
    document.head.appendChild(el);
  });
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

function addOsmFallback(map) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: OSM_ATTR, maxZoom: 19, className: 'tiles-dark',
  }).addTo(map);
}

async function addBasemap(map) {
  if (CARTO_KEY) {
    L.tileLayer('https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(CARTO_KEY), {
      attribution: OSM_ATTR + ' © <a href="https://carto.com/attributions">CARTO</a>', maxZoom: 19,
    }).addTo(map);
    return;
  }
  if (!hasWebGL()) { addOsmFallback(map); return; }
  try {
    await Promise.all([loadAsset(MAPLIBRE_CSS, true), loadAsset(MAPLIBRE_JS)]);
    await loadAsset(MAPLIBRE_LEAFLET_JS);
    if (!L.maplibreGL) throw new Error('plugin MapLibre-Leaflet assente');
    L.maplibreGL({ style: OFM_STYLE }).addTo(map);
    // Attribuzione obbligatoria per OpenFreeMap: il plugin non la passa a Leaflet, la aggiungiamo noi
    if (map.attributionControl) {
      map.attributionControl.addAttribution('<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTR);
    }
  } catch (e) {
    console.warn('[mappa] OpenFreeMap non disponibile, uso OSM:', e.message);
    addOsmFallback(map);
  }
}

function initMap() {
  _map = L.map('leaflet-map', {
    center: [41.9, 12.5], // Centro Italia
    zoom: 6,
    zoomControl: true,
  });

  addBasemap(_map);

  _map.on('moveend', () => {
    const z = _map.getZoom();
    document.getElementById('map-reload-btn').disabled = z < 13;
    const c = _map.getCenter();
    scheduleWeatherUpdate(c.lat, c.lng);
  });

  // Auto-locate on open
  mapLocateMe();
}

function setMapStatus(msg, hide = false) {
  const el = document.getElementById('map-status');
  el.textContent = msg;
  el.classList.toggle('hidden', hide);
}

function mapLocateMe() {
  const btn = document.getElementById('map-gps-btn');
  btn.textContent = '⏳ Localizzando…';
  btn.disabled = true;
  setMapStatus('Rilevo la tua posizione…');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      _mapCenter = { lat, lng };
      _map.setView([lat, lng], 15);
      scheduleWeatherUpdate(lat, lng);

      // User marker
      if (_userMarker) _userMarker.remove();
      _userMarker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#e8a030',
        color: '#0d0e0f',
        weight: 2,
        fillOpacity: 1,
      }).addTo(_map).bindPopup('<div class="map-popup"><div class="map-popup-name">📍 Sei qui</div></div>');

      btn.textContent = '📍 Localizzami';
      btn.disabled = false;
      loadMapStations();
    },
    err => {
      setMapStatus('Posizione non disponibile', false);
      btn.textContent = '📍 Localizzami';
      btn.disabled = false;
    },
    { timeout: 10000 }
  );
}

function setMapFuel(btn) {
  _mapFuel = btn.dataset.mf;
  document.querySelectorAll('[data-mf]').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  if (_mapFuel === 'EV') {
    _mapMarkers.forEach(m => m.remove());
    _mapMarkers = [];
    document.getElementById('map-brow').style.display = 'none';
    loadEVMap();
  } else {
    clearEVMapMarkers();
    if (_mapCenter) loadMapStations();
  }
}

function toggleMapSelf() {
  _mapSelf = !_mapSelf;
  const btn = document.getElementById('map-self-btn');
  // active = showing self (default); inactive = showing servito
  btn.classList.toggle('active', !_mapSelf);
  btn.textContent = _mapSelf ? 'Servito' : '✓ Servito';
  if (_mapCenter) loadMapStations();
}

async function loadMapStations() {
  if (!_mapCenter) { setMapStatus('Premi "Localizzami" per trovare la tua posizione'); return; }
  const center = _map.getCenter();
  const zoom = _map.getZoom();
  // Calculate radius from zoom level
  const radius = zoom >= 15 ? 3 : zoom >= 13 ? 8 : 15;

  setMapStatus(`Cerco ${_mapFuel} entro ${radius} km…`);
  try {
    // self=1 → only self; self=0 → all (filter servito client-side)
    const url = `/api/vicini?lat=${center.lat}&lng=${center.lng}&carburante=${encodeURIComponent(_mapFuel)}&self=${_mapSelf?1:0}&raggio=${radius}`;
    const data = await api(url);
    _mapBandiera = null; // reset filter on new load
    // When servito mode: exclude stations that only have self service
    const displayData = (!_mapSelf) ? data.filter(s => !s.isSelf) : data;
    renderMapBandieraFilter(displayData);
    renderMapMarkers(displayData, center.lat, center.lng);
    setMapStatus(`${data.length} impianti trovati`, data.length > 0);
    if (data.length === 0) setTimeout(() => setMapStatus('Nessun impianto trovato in questa area — prova ad allargare la mappa', false), 100);
  } catch(e) {
    setMapStatus('Errore: ' + e.message);
  }
}

function renderMapMarkers(stations, userLat, userLng) {
  _mapMarkers.forEach(m => m.remove());
  _mapMarkers = [];
  _mapStationById = {};
  if (!stations.length) return;
  // Filter valid stations with a numeric price
  const valid = stations.filter(s =>
    s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng) &&
    s.prezzo != null && !isNaN(s.prezzo)
  );
  if (!valid.length) return;
  const prices = valid.map(s => s.prezzo);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  valid.forEach(s => {
    _mapStationById[s.id] = s;
    const ratio = (maxP > minP) ? (s.prezzo - minP) / (maxP - minP) : 0.5;
    const color = ratio < 0.33 ? '#4caf7d' : ratio < 0.66 ? '#e8a030' : '#e05a4a';
    const unit = _mapFuel === 'Metano' ? 'kg' : 'lt';
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + s.lat + ',' + s.lng;
    const label = s.prezzo.toFixed(3);
    const icon = L.divIcon({
      className: '',
      html: '<div style="'
        + 'background:' + color + ';'
        + 'color:#fff;'
        + 'font-family:monospace;'
        + 'font-size:10px;'
        + 'font-weight:700;'
        + 'line-height:16px;'
        + 'height:16px;'
        + 'width:42px;'
        + 'text-align:center;'
        + 'border-radius:4px;'
        + 'box-shadow:0 1px 4px rgba(0,0,0,.6);'
        + 'border:1px solid rgba(255,255,255,.25);'
        + 'overflow:hidden;'
        + '">' + label + '</div>',
      iconSize: [42, 16],
      iconAnchor: [21, 8],
    });
    const el = document.createElement('div');
    el.className = 'map-popup';
    el.innerHTML = '<div class="map-popup-price">' + s.prezzo.toFixed(3) + '</div>'
      + '<div class="map-popup-unit">&#8364;/' + unit + ' &middot; ' + (s.isSelf ? 'self service' : 'servito') + '</div>'
      + '<div class="map-popup-name">' + esc(s.nome) + '</div>'
      + '<div class="map-popup-addr">' + esc(s.indirizzo) + '</div>'
      + (s.distanza != null ? '<div class="map-popup-dist">&#128205; ' + s.distanza + ' km da te</div>' : '')
      + '<div class="map-popup-tags">'
      + (s.bandiera ? '<span class="map-popup-tag">' + esc(s.bandiera) + '</span>' : '')
      + '<span class="map-popup-tag">' + esc(s.carburante||'') + '</span></div>'
      + '<div style="display:flex;gap:6px;margin-top:8px">'
      + '<a class="map-popup-btn" style="flex:1;text-align:center" href="' + mapsUrl + '" target="_blank">&#128205; Maps</a>'
      + '<button class="map-popup-btn" style="flex:1;background:var(--surf2);color:var(--tx);border:1px solid var(--brd2);cursor:pointer">&#128203; Scheda</button>'
      + '</div>';
    el.querySelector('button').addEventListener('click', (function(st) {
      return function() { _map.closePopup(); openModal(st); };
    })(s));
    const marker = L.marker([s.lat, s.lng], { icon })
      .addTo(_map).bindPopup(el, { maxWidth: 240 });
    _mapMarkers.push(marker);
  });
}


// ============================================================
// EV — Overpass API (OpenStreetMap, no key needed)
// ============================================================
let _evMapMarkers = [];
let _mapBandiera = null;

async function fetchEV(lat, lng, radiusKm) {
  const res = await fetch(WORKER + '/api/ev?lat=' + lat + '&lng=' + lng + '&raggio=' + Math.min(radiusKm, 8));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Errore ' + res.status);
  }
  return res.json();
}


// parseEV is now done server-side; client just receives clean objects
function parseEV(s) { return s; }



// ── HOME: show EV list when EV filter active ──────────────────
async function loadEVHome(lat, lng, radius) {
  const box = document.getElementById('ev-results');
  box.classList.remove('hidden');
  box.innerHTML = '<div style="color:var(--mut);font-size:.78rem;padding:12px 0;text-align:center">Carico colonnine...</div>';
  try {
    const nodes = await fetchEV(lat, lng, radius);
    if (!nodes.length) {
      box.innerHTML = '<div style="color:var(--mut);font-size:.78rem;padding:12px 0;text-align:center">Nessuna colonnina trovata nell\'area.</div>';
      return;
    }
    const stations = nodes.sort((a,b) => (a.distanza||999)-(b.distanza||999));
    let html = '<div class="res-hdr fi"><div class="res-title">&#9889; Colonnine elettriche</div>'
      + '<div class="res-sub">' + stations.length + ' trovate &middot; OpenStreetMap</div></div>';
    stations.forEach(s => {
      html += '<div class="ev-card" id="evc-' + s.id + '">'
        + '<div class="ev-icon">&#9889;</div>'
        + '<div><div class="ev-name">' + esc(s.nome) + '</div>'
        + '<div class="ev-addr">' + esc(s.indirizzo) + (s.comune ? ' &middot; ' + esc(s.comune) : '') + '</div>'
        + '<div class="ev-tags">'
        + (s.maxKW > 0 ? '<span class="ev-tag ' + (s.isFast ? 'fast' : '') + '">' + s.maxKW + ' kW</span>' : '')
        + s.types.map(t => '<span class="ev-tag">' + esc(t) + '</span>').join('')
        + '<span class="ev-tag">' + s.numPrese + ' prese</span>'
        + (s.operatore ? '<span class="ev-tag">' + esc(s.operatore) + '</span>' : '')
        + '</div></div>'
        + (s.distanza != null ? '<div><div class="ev-kw">' + s.distanza + '</div><div class="ev-kw-lbl">km</div></div>' : '<div></div>')
        + '</div>';
    });
    box.innerHTML = html;
    stations.forEach(s => {
      const el = document.getElementById('evc-' + s.id);
      if (el) el.addEventListener('click', () => openEVModal(s));
    });
  } catch(e) {
    box.innerHTML = '<div style="color:var(--rd);font-size:.78rem;padding:12px 0">Errore: ' + esc(e.message) + '</div>';
  }
}

// ── EV detail modal ────────────────────────────────────────────
function openEVModal(s) {
  document.getElementById('modal-nome').textContent = s.nome;
  document.getElementById('modal-prezzo').textContent = s.maxKW > 0 ? s.maxKW + ' kW' : '—';
  document.getElementById('modal-price-meta').textContent = s.isFast ? 'Ricarica rapida' : 'AC lenta';
  document.getElementById('modal-addr').textContent = [s.indirizzo, s.comune].filter(Boolean).join(', ') || 'Non disponibile';
  document.getElementById('modal-gestore').textContent = s.operatore || 'Non disponibile';
  document.getElementById('modal-mode').textContent = s.types.length ? s.types.join(', ') : 'Non specificato';
  const distRow = document.getElementById('modal-dist-row');
  if (s.dist != null && distRow) { distRow.style.display = ''; document.getElementById('modal-dist-val').textContent = s.dist + ' km da te'; }
  else if (distRow) distRow.style.display = 'none';
  document.getElementById('modal-dt').textContent = s.orario || (s.numPrese + ' prese');
  const coord = s.lat + ',' + s.lng;
  const addr = encodeURIComponent([s.nome, s.indirizzo, s.comune].filter(Boolean).join(', '));
  document.getElementById('btn-gmaps').href = 'https://www.google.com/maps/search/?api=1&query=' + coord;
  document.getElementById('btn-apple').href = 'https://maps.apple.com/?ll=' + coord + '&q=' + addr;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ── Map EV layer ───────────────────────────────────────────────

// ── Map bandiera filter ────────────────────────────────────────
function renderMapBandieraFilter(stations) {
  const brow = document.getElementById('map-brow');
  const brands = [...new Set(stations.map(s => s.bandiera).filter(Boolean))].sort();
  if (brands.length < 2) { brow.style.display = 'none'; return; }
  brow.innerHTML = '<span style="font-size:.62rem;color:var(--mut);align-self:center;margin-right:4px">Marca:</span>';
  // Reset button
  const all = document.createElement('button');
  all.className = 'bfb' + (!_mapBandiera ? ' on' : '');
  all.textContent = 'Tutte';
  all.onclick = () => { _mapBandiera = null; applyMapBandieraFilter(stations); document.querySelectorAll('#map-brow .bfb').forEach(b => b.classList.remove('on')); all.classList.add('on'); };
  brow.appendChild(all);
  brands.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'bfb' + (_mapBandiera === b ? ' on' : '');
    btn.textContent = b;
    btn.onclick = () => {
      _mapBandiera = _mapBandiera === b ? null : b;
      document.querySelectorAll('#map-brow .bfb').forEach(x => x.classList.remove('on'));
      (_mapBandiera ? btn : all).classList.add('on');
      applyMapBandieraFilter(stations);
    };
    brow.appendChild(btn);
  });
  brow.style.display = 'flex';
}

function applyMapBandieraFilter(stations) {
  _mapMarkers.forEach(m => m.remove());
  _mapMarkers = [];
  _mapStationById = {};
  const filtered = _mapBandiera ? stations.filter(s => s.bandiera === _mapBandiera) : stations;
  renderMapMarkers(filtered, _mapCenter?.lat, _mapCenter?.lng);
}

async function loadEVMap() {
  const center = _map.getCenter();
  const zoom = _map.getZoom();
  if (zoom < 11) {
    setMapStatus('Avvicinati sulla mappa per vedere le colonnine EV');
    return;
  }
  const radius = zoom >= 14 ? 5 : zoom >= 12 ? 6 : 6;
  setMapStatus('Carico colonnine EV...');
  try {
    const nodes = await fetchEV(center.lat, center.lng, radius);
    clearEVMapMarkers();
    nodes.forEach(s => {
      if (!s.lat || !s.lng || isNaN(s.lat) || isNaN(s.lng)) return;
      const bolts = s.maxKW >= 50 ? '⚡⚡⚡' : s.maxKW >= 22 ? '⚡⚡' : '⚡';
      const icon = L.divIcon({
        className: '',
        html: '<span style="font-size:14px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))">' + bolts + '</span>',
        iconSize: [14 * (s.maxKW >= 50 ? 3 : s.maxKW >= 22 ? 2 : 1), 16],
        iconAnchor: [7, 8],
      });
      const el = document.createElement('div');
      el.className = 'map-popup';
      el.innerHTML = '<div class="map-popup-price" style="color:#7dd4fc">' + (s.maxKW > 0 ? s.maxKW + ' kW' : '—') + '</div>'
        + '<div class="map-popup-unit">' + (s.isFast ? 'Ricarica rapida' : 'AC lenta') + ' &middot; ' + s.numPrese + ' prese</div>'
        + '<div class="map-popup-name">' + esc(s.nome) + '</div>'
        + '<div class="map-popup-addr">' + esc(s.indirizzo) + '</div>'
        + '<a class="map-popup-btn" style="display:block;margin-top:8px;text-align:center;background:rgba(125,212,252,.15);color:#7dd4fc;border:1px solid rgba(125,212,252,.3)" href="https://www.google.com/maps/search/?api=1&query=' + s.lat + ',' + s.lng + '" target="_blank">&#128205; Apri in Maps</a>';
      const m = L.marker([s.lat, s.lng], { icon }).addTo(_map).bindPopup(el, { maxWidth: 240 });
      _evMapMarkers.push(m);
    });
    setMapStatus(_evMapMarkers.length + ' colonnine EV', true);
  } catch(e) { setMapStatus('Errore EV: ' + e.message); }
}

function clearEVMapMarkers() {
  _evMapMarkers.forEach(m => m.remove());
  _evMapMarkers = [];
}

// ── Update bar & polling ───────────────────────────────────────
let _lastCachedAt = null;

function renderUpdateBar(cachedAt, nextUpdate, extractionDate) {
  _lastCachedAt = cachedAt;

  const next   = new Date(nextUpdate);
  const now    = new Date();
  const lastEl = document.getElementById('last-update');
  const nextEl = document.getElementById('next-update');

  // Show MIMIT extraction date (real data date), not worker cache time
  if (extractionDate) {
    const [y, m, d] = extractionDate.split('-');
    lastEl.textContent = `${d}/${m}/${y} · estrazione MIMIT`;
    // Check if extraction date is today
    const todayStr = window.hubToday(now);
    lastEl.className = 'update-val ' + (extractionDate === todayStr ? 'fresh' : 'stale');
  } else {
    const cached = new Date(cachedAt);
    const ageMin = Math.round((now - cached) / 60000);
    const dateStr = cached.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
    const timeStr = cached.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    lastEl.textContent = `${dateStr} ${timeStr}`;
    lastEl.className   = 'update-val ' + (ageMin < 240 ? 'fresh' : 'stale');
  }

  // Format next update
  const minsToNext = Math.round((next - now) / 60000);
  if (minsToNext <= 0) {
    nextEl.textContent = 'Disponibile ora';
    nextEl.className   = 'update-val fresh';
  } else {
    const h = Math.floor(minsToNext / 60), m = minsToNext % 60;
    nextEl.textContent = h > 0 ? `tra ${h}h ${m}min` : `tra ${m} min`;
    nextEl.className   = 'update-val';
  }

  // Update countdown every minute
  setTimeout(() => { if (_lastCachedAt === cachedAt) renderUpdateBar(cachedAt, nextUpdate); }, 60000);
}

async function checkForNewData() {
  if (!_lastCachedAt) return;
  try {
    const data = await api('/');
    if (data.cachedAt && data.cachedAt !== _lastCachedAt) {
      document.getElementById('new-data-banner').classList.remove('hidden');
    }
  } catch(e) {}
}

async function doRefresh() {
  document.getElementById('new-data-banner').classList.add('hidden');
  await loadMedie();
}

// Poll for new data every 15 minutes
setInterval(checkForNewData, 15 * 60 * 1000);


// ── Card visibility ────────────────────────────────────────────
const CARD_PREF_KEY = 'opf_hidden_cards';

function loadHiddenCards() {
  try { return JSON.parse(localStorage.getItem(CARD_PREF_KEY) || '[]'); } catch(e) { return []; }
}

function applyCardVisibility() {
  const hidden = loadHiddenCards();
  document.querySelectorAll('.card-toggle').forEach(btn => {
    const id = btn.dataset.card;
    const isHidden = hidden.includes(id);
    btn.classList.toggle('hidden-fuel', isHidden);
    const card = document.querySelector('.c-' + id);
    if (card) card.classList.toggle('card-hidden', isHidden);
  });
  // Collapse cards-grid if all hidden
  const grid = document.querySelector('.cards-grid');
  const allHidden = ['bz','go','gpl','met'].every(id => hidden.includes(id));
  if (grid) grid.style.marginBottom = allHidden ? '0' : '';
}

function fuelToggleCard(btn) {
  const id = btn.dataset.card;
  let hidden = loadHiddenCards();
  if (hidden.includes(id)) hidden = hidden.filter(h => h !== id);
  else hidden.push(id);
  localStorage.setItem(CARD_PREF_KEY, JSON.stringify(hidden));
  applyCardVisibility();
}


// ── GPS Location badge ────────────────────────────────────────
async function showGPSLocation(lat, lng) {
  const badge  = document.getElementById('gps-location');
  const name   = document.getElementById('gps-loc-name');
  const coords = document.getElementById('gps-loc-coords');

  // Show coords immediately
  coords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  name.textContent = 'Localizzazione in corso…';
  badge.classList.add('visible');

  // Reverse geocode via Nominatim (OpenStreetMap, gratuito)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=it`,
      { headers: { 'User-Agent': 'OsservaPrezziCarburanti/1.0' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const parts = [
      addr.village || addr.town || addr.city || addr.municipality || addr.county,
      addr.state_district || addr.province,
      addr.postcode,
    ].filter(Boolean);
    name.textContent = parts.length ? parts.join(' · ') : 'Posizione rilevata';
  } catch(e) {
    name.textContent = 'Posizione rilevata';
  }
}

function clearGPSLocation() {
  document.getElementById('gps-location').classList.remove('visible');
}

// ── GPS ────────────────────────────────────────────────────────
async function doGPS() {
  if (!navigator.geolocation) { setStatus('err', 'Geolocalizzazione non supportata'); return; }
  const btn = document.getElementById('gps-btn');
  btn.classList.add('active');
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Localizzazione…`;
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      document.getElementById('qinput').value = '';
      activeComune = null;
      _gpsActive = true;
      _sortByDist = false;
      document.getElementById('frow').style.display = 'flex';
      document.getElementById('sort-dist-btn').style.display = '';
      document.getElementById('sort-dist-btn').classList.remove('on');
      document.getElementById('sort-dist-btn').textContent = '↕ Distanza';
      resetFilters();
      showGPSLocation(lat, lng);
      _gpsLat = lat;
      _gpsLng = lng;
      if (activeFuel === 'EV') refetchStations();
      else await fetchNearby(lat, lng);
      btn.classList.remove('active');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7" stroke-dasharray="2 2" opacity=".4"/></svg> Vicino a me`;
    },
    err => {
      btn.classList.remove('active');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7" stroke-dasharray="2 2" opacity=".4"/></svg> Vicino a me`;
      setStatus('err', 'Posizione non disponibile — controlla i permessi');
    },
    { timeout: 10000 }
  );
}

// ── Bandiera filter ────────────────────────────────────────────
let activeBandiera = null;

function buildBandieraFilter(data) {
  const brands = [...new Set(data.map(s => s.bandiera).filter(Boolean))].sort();
  const brow = document.getElementById('brow');
  if (brands.length < 2) { brow.style.display = 'none'; return; }
  brow.innerHTML = `<span style="font-size:.65rem;color:var(--mut);align-self:center;margin-right:2px">Marca:</span>`;
  brands.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'bfb' + (activeBandiera === b ? ' on' : '');
    btn.textContent = b;
    btn.onclick = () => {
      activeBandiera = activeBandiera === b ? null : b;
      document.querySelectorAll('.bfb').forEach(x => x.classList.remove('on'));
      if (activeBandiera) btn.classList.add('on');
      applyBandieraFilter();
    };
    brow.appendChild(btn);
  });
  brow.style.display = 'flex';
}

function applyBandieraFilter() {
  const stations = document.querySelectorAll('.station');
  stations.forEach((el, i) => {
    const s = _stationData[i];
    const show = !activeBandiera || s.bandiera === activeBandiera;
    el.style.display = show ? '' : 'none';
  });
}

// ── Preferiti ──────────────────────────────────────────────────
function loadFavs() { try { return JSON.parse(localStorage.getItem('opf_favs') || '[]'); } catch(e) { return []; } }
function saveFavs(favs) { localStorage.setItem('opf_favs', JSON.stringify(favs)); }
function isFav(id) { return loadFavs().some(f => f.id === id); }
let _favSort = 'saved';
let _editingFavId = null;

function toggleFav(idx) {
  const s = _stationData[idx];
  let favs = loadFavs();
  const existing = favs.findIndex(f => f.id === s.id);
  if (existing >= 0) {
    favs.splice(existing, 1);
    saveFavs(favs);
  } else {
    favs.unshift({ ...s, savedAt: new Date().toISOString(), customName: '', note: '' });
    saveFavs(favs);
  }
  refreshFavStars();
  renderFavSection();
}

function refreshFavStars() {
  document.querySelectorAll('.fav-btn').forEach((btn, i) => {
    const s = _stationData[i];
    if (!s) return;
    const on = isFav(s.id);
    btn.textContent = on ? '★ Salvato' : '☆ Salva';
    btn.title = on ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti';
    btn.classList.toggle('on', on);
  });
}

function setSortFav(btn) {
  _favSort = btn.dataset.sort;
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function getSortedFavs() {
  let favs = loadFavs();
  if (_favSort === 'price') favs.sort((a,b) => a.prezzo - b.prezzo);
  else if (_favSort === 'name') favs.sort((a,b) => (a.customName||a.nome).localeCompare(b.customName||b.nome));
  return favs;
}

let _gpsActive = false;
let _sortByDist = false;

function toggleSortDist() {
  _sortByDist = !_sortByDist;
  const btn = document.getElementById('sort-dist-btn');
  btn.classList.toggle('on', _sortByDist);
  btn.textContent = _sortByDist ? '↕ Prezzo' : '↕ Distanza';
  if (_gpsActive && _stationData.length) {
    const sorted = _sortByDist
      ? [..._stationData].sort((a,b) => (a.distanza||999) - (b.distanza||999))
      : [..._stationData].sort((a,b) => a.prezzo - b.prezzo);
    _stationData = sorted;
    renderStations(sorted);
  }
}

function removeFavAndRefresh(id) {
  saveFavs(loadFavs().filter(f => f.id !== id));
  refreshFavStars();
}

function renderFavSection() {
  updateFavBtn();
  // No longer renders a separate section — favorites are shown via toggleFavFilter
  // Just update stars in current results
  refreshFavStars();
}

// ── Fav edit modal ─────────────────────────────────────────────
function openFavModal(id) {
  const fav = loadFavs().find(f => f.id === id);
  if (!fav) return;
  _editingFavId = id;
  document.getElementById('fav-edit-name').value = fav.customName || '';
  document.getElementById('fav-edit-note').value = fav.note || '';
  document.getElementById('fav-edit-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('fav-edit-name').focus(), 100);
}

function closeFavModal() {
  document.getElementById('fav-edit-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  _editingFavId = null;
}

function saveFavModal() {
  let favs = loadFavs();
  const i = favs.findIndex(f => f.id === _editingFavId);
  if (i >= 0) {
    favs[i].customName = document.getElementById('fav-edit-name').value.trim();
    favs[i].note       = document.getElementById('fav-edit-note').value.trim();
    saveFavs(favs);
  }
  closeFavModal();
  renderFavSection();
}

function deleteFavFromModal() {
  let favs = loadFavs();
  saveFavs(favs.filter(f => f.id !== _editingFavId));
  closeFavModal();
  refreshFavStars();
  renderFavSection();
}

// ── Modal ─────────────────────────────────────────────────────
function openModalIdx(i) {
  openModal(_stationData[i]);
}

function openModal(s) {
  document.getElementById('modal-nome').textContent = s.nome || 'Impianto ' + s.id;
  document.getElementById('modal-prezzo').textContent = s.prezzo.toFixed(3);
  const unit = s.carburante && s.carburante.toLowerCase().includes('metano') ? 'kg' : 'litro';
  document.getElementById('modal-price-meta').textContent = '€/' + unit + ' · ' + (s.isSelf ? 'self service' : 'servito');
  document.getElementById('modal-addr').textContent = [s.indirizzo, s.comune, s.provincia].filter(Boolean).join(', ');
  document.getElementById('modal-gestore').textContent = [s.gestore, s.bandiera].filter(Boolean).join(' · ') || 'Non disponibile';
  document.getElementById('modal-mode').textContent = s.isSelf ? 'Self service' : 'Servito';
  const distRow = document.getElementById('modal-dist-row');
  if (s.distanza != null && distRow) {
    distRow.style.display = '';
    document.getElementById('modal-dist-val').textContent = s.distanza + ' km da te';
  } else if (distRow) { distRow.style.display = 'none'; }
  document.getElementById('modal-dt').textContent = s.dtComu || 'Non disponibile';

  // Maps URLs
  const addr = encodeURIComponent([s.nome, s.indirizzo, s.comune].filter(Boolean).join(', '));
  const coord = (s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng))
    ? s.lat + ',' + s.lng : null;

  const gmaps = coord
    ? `https://www.google.com/maps/search/?api=1&query=${coord}`
    : `https://www.google.com/maps/search/?api=1&query=${addr}`;
  const apple = coord
    ? `https://maps.apple.com/?ll=${coord}&q=${addr}`
    : `https://maps.apple.com/?q=${addr}`;

  document.getElementById('btn-gmaps').href = gmaps;
  document.getElementById('btn-apple').href = apple;

  // Store current station for fav toggle
  _modalStation = s;
  updateModalFavBtn();

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

let _modalStation = null;


function shareStation() {
  if (!_modalStation) return;
  const s = _modalStation;
  const name = s.nome || 'Distributore';
  const addr = [s.indirizzo, s.comune].filter(Boolean).join(', ');
  const price = s.prezzo ? s.prezzo.toFixed(3) + ' €/L' : '';
  const coord = (s.lat && s.lng) ? s.lat + ',' + s.lng : null;
  const mapsUrl = coord
    ? 'https://www.google.com/maps/search/?api=1&query=' + coord
    : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name + ' ' + addr);
  const text = [name, addr, price ? '⛽ ' + price : ''].filter(Boolean).join('\n');
  if (navigator.share) {
    navigator.share({ title: name, text, url: mapsUrl }).catch(() => {});
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text + '\n' + mapsUrl).then(() => {
      const btn = document.getElementById('modal-share-btn');
      btn.textContent = '✓';
      setTimeout(() => { btn.innerHTML = '&#x1F4E4;'; }, 1500);
    }).catch(() => {});
  }
}

function updateModalFavBtn() {
  const btn = document.getElementById('modal-fav-btn');
  if (!btn || !_modalStation) return;
  const saved = isFav(_modalStation.id);
  btn.textContent = saved ? '★ Salvato nei preferiti' : '☆ Aggiungi ai preferiti';
  btn.classList.toggle('on', saved);
}

function toggleFavFromModal() {
  if (!_modalStation) return;
  const favs = loadFavs();
  const idx = favs.findIndex(f => f.id === _modalStation.id);
  if (idx >= 0) {
    saveFavs(favs.filter((_, i) => i !== idx));
  } else {
    saveFavs([...favs, { ..._modalStation, savedAt: Date.now() }]);
  }
  updateModalFavBtn();
  renderFavSection();
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// Close on ESC
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') { closeModal(); closeFavModal(); }
});
document.getElementById('fav-edit-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('fav-edit-overlay')) closeFavModal();
});
// ── Fav view ──────────────────────────────────────────────────
let _favViewSort = 'saved';
let _cmpFav = null;

function updateFavBtn() {
  const el = document.getElementById('fav-hdr-count');
  const n = loadFavs().length;
  if (el) el.textContent = n > 0 ? ' (' + n + ')' : '';
}

function openFavView() {
  document.getElementById('fav-view').classList.add('visible');
  document.body.style.overflow = 'hidden';
  renderFavView();
  // aggiorna i prezzi dei preferiti (al massimo ogni 2 ore) e ridisegna quando arrivano
  if (window.hubFavRefresh) window.hubFavRefresh(false).catch(function() {});
}

function closeFavView() {
  document.getElementById('fav-view').classList.remove('visible');
  document.body.style.overflow = '';
}

function setFavSort(btn) {
  _favViewSort = btn.dataset.sort;
  document.querySelectorAll('#fav-view .sort-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderFavView();
}

function getViewFavs() {
  let favs = loadFavs();
  if (_favViewSort === 'price') favs.sort((a, b) => a.prezzo - b.prezzo);
  else if (_favViewSort === 'name') favs.sort((a, b) => (a.customName || a.nome).localeCompare(b.customName || b.nome));
  return favs;
}

function renderFavView() {
  updateFavBtn();
  const area = document.getElementById('fav-view-body');
  if (!area) return;
  const favs = getViewFavs();
  if (!favs.length) {
    area.innerHTML = '<div class="no-res" style="margin-top:24px">Nessun preferito.<br><small style="color:var(--mut)">Cerca un distributore e tocca \u2606 Salva.</small></div>';
    return;
  }
  const sortRow = document.createElement('div');
  sortRow.className = 'fav-sort-row';
  sortRow.innerHTML = '<span class="fav-sort-label">Ordina:</span>'
    + [['saved','Aggiunti'],['price','Prezzo'],['name','Nome']].map(function(x) {
        return '<button class="sort-btn ' + (_favViewSort===x[0]?'on':'') + '" data-sort="' + x[0] + '" onclick="setFavSort(this)">' + x[1] + '</button>';
      }).join('');
  const list = document.createElement('div');
  list.className = 'slist';
  favs.forEach(function(s) {
    const name = s.customName || s.nome;
    const unit = (s.carburante || '').toLowerCase().indexOf('metano') >= 0 ? 'kg' : 'lt';
    const card = document.createElement('div');
    card.className = 'station';
    card.style.cursor = 'pointer';
    card.innerHTML = '<div class="st-rank" style="color:var(--am)">\u2605</div>'
      + '<div class="st-info"><div class="st-name">' + esc(name)
      + ' <button class="fav-edit-btn" data-eid="' + esc(s.id) + '" title="Modifica">\u270F</button></div>'
      + (s.note ? '<div class="fav-note">' + esc(s.note) + '</div>'
               : '<div class="st-addr">' + esc(s.indirizzo||'') + (s.comune ? ' \u00B7 ' + esc(s.comune) : '') + '</div>')
      + '<div class="st-tags">'
      + (s.bandiera ? '<span class="st-tag">' + esc(s.bandiera) + '</span>' : '')
      + '<span class="st-tag">' + (s.isSelf ? 'self' : 'servito') + '</span>'
      + (s.carburante ? '<span class="st-tag">' + esc(s.carburante) + '</span>' : '')
      + '</div></div>'
      + '<div class="st-p">'
      + '<div class="st-price">' + s.prezzo.toFixed(3) + '</div>'
      + '<div class="st-unit">\u20AC/' + unit + '</div>'
      + '<div class="st-dt">' + (s.dtComu||'') + '</div>'
      + (window.hubFavHistory ? window.hubFavHistory(s) : '')
      + '<button class="fav-btn" data-cmp="' + esc(s.id) + '" style="background:rgba(91,155,213,.15);color:var(--bl);border-color:rgba(91,155,213,.3);margin-top:3px;font-size:0.6rem;padding:2px 7px">\u2696 Confronta</button>'
      + '<button class="fav-btn on" data-rm="' + esc(s.id) + '" style="margin-top:3px">\u2715</button>'
      + '</div>';
    card.addEventListener('click', (function(fav) {
      return function(e) {
        var eid = e.target.closest('[data-eid]');
        var cmp = e.target.closest('[data-cmp]');
        var rm  = e.target.closest('[data-rm]');
        if (eid) { e.stopPropagation(); openFavEdit(eid.dataset.eid); return; }
        if (cmp) { e.stopPropagation(); openCmp(cmp.dataset.cmp); return; }
        if (rm)  { e.stopPropagation(); removeFavView(rm.dataset.rm); return; }
        openModal(fav);
      };
    })(s));
    list.appendChild(card);
  });
  area.innerHTML = '';
  area.appendChild(sortRow);
  area.appendChild(list);
}

function removeFavView(id) {
  saveFavs(loadFavs().filter(f => f.id !== id));
  renderFavSection();
  renderFavView();
}

// ── Fav edit modal ─────────────────────────────────────────────
function openFavEdit(id) {
  const fav = loadFavs().find(f => f.id === id);
  if (!fav) return;
  _editingFavId = id;
  document.getElementById('fov-name').value = fav.customName || '';
  document.getElementById('fov-note').value = fav.note || '';
  document.getElementById('fov-alert').value = typeof fav.alert === 'number' ? fav.alert.toFixed(3) : '';
  document.getElementById('fov-alert-now').textContent = 'Prezzo attuale: ' + (typeof fav.prezzo === 'number' ? fav.prezzo.toFixed(3) + ' €' : 'n.d.');
  document.getElementById('fov-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeFavEdit() {
  document.getElementById('fov-overlay').classList.add('hidden');
}

function saveFavEdit() {
  let favs = loadFavs();
  const i = favs.findIndex(f => f.id === _editingFavId);
  if (i >= 0) {
    favs[i].customName = document.getElementById('fov-name').value.trim();
    favs[i].note = document.getElementById('fov-note').value.trim();
    saveFavs(favs);
    if (window.hubFavAlertSet) window.hubFavAlertSet(_editingFavId, document.getElementById('fov-alert').value);
  }
  closeFavEdit();
  renderFavView();
}

function deleteFavEdit() {
  saveFavs(loadFavs().filter(f => f.id !== _editingFavId));
  closeFavEdit();
  renderFavSection();
  renderFavView();
}

// ── Confronto preferiti ────────────────────────────────────────
function saveCmpLiters(val) {
  try { localStorage.setItem('opf_cmp_liters', val); } catch(e) {}
}

function openCmp(id) {
  const fav = loadFavs().find(f => f.id === id);
  if (!fav) return;
  _cmpFav = fav;
  document.getElementById('cmp-subtitle').textContent =
    'Confronta "' + (fav.customName || fav.nome) + '" con i distributori nell\'area';
  document.getElementById('cmp-list').innerHTML = '';
  document.getElementById('btn-cmp-go').disabled = false;
  document.getElementById('btn-cmp-go').textContent = 'Confronta';
  // Restore saved liters
  try {
    const saved = localStorage.getItem('opf_cmp_liters');
    if (saved) {
      const sl = document.getElementById('cmp-liters');
      sl.value = saved;
      document.getElementById('cmp-liters-val').textContent = saved + ' L';
    }
  } catch(e) {}
  document.getElementById('cmp-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCmp() {
  document.getElementById('cmp-overlay').classList.add('hidden');
}

async function runCmp() {
  if (!_cmpFav) return;
  const s = _cmpFav;
  const radius = parseInt(document.getElementById('cmp-radius').value);
  const btn = document.getElementById('btn-cmp-go');
  const list = document.getElementById('cmp-list');
  btn.disabled = true;
  btn.textContent = '⏳ Cerco…';
  list.innerHTML = '<div style="color:var(--mut);font-size:.78rem;padding:8px 0">Carico distributori nelle vicinanze…</div>';

  try {
    if (!s.lat || !s.lng || isNaN(s.lat) || isNaN(s.lng))
      throw new Error('Coordinate non disponibili — aggiungi di nuovo questo preferito dai risultati GPS o per comune');

    const carb = s.carburante || 'Benzina';
    const liters = parseInt(document.getElementById('cmp-liters').value) || 50;
  const data = await api('/api/vicini?lat=' + s.lat + '&lng=' + s.lng
      + '&carburante=' + encodeURIComponent(carb)
      + '&self=0&raggio=' + radius);

    if (!data.length) {
      list.innerHTML = '<div style="color:var(--mut);font-size:.78rem;padding:8px 0">Nessun distributore trovato entro ' + radius + ' km.</div>';
      return;
    }

    data.sort((a, b) => a.prezzo - b.prezzo);
    const minP = data[0].prezzo;
    const unit = carb.toLowerCase().includes('metano') ? 'kg' : 'litro';

    // Fav reference card
    const favAboveMin = s.prezzo > minP;
    const litersLabel = liters + 'L';
    let html = '<div class="cmp-row cmp-fav">'
      + '<div class="cmp-rank" style="color:var(--am)">★</div>'
      + '<div><div class="cmp-name">' + esc(s.customName || s.nome) + '</div>'
      + '<div class="cmp-addr">' + esc(s.indirizzo || '') + '</div>'
      + '<span class="cmp-tag">Il tuo preferito</span></div>'
      + '<div><div class="cmp-price' + (s.prezzo <= minP ? ' best' : '') + '">' + s.prezzo.toFixed(3) + '</div>'
      + '<div style="font-size:.62rem;color:var(--mut)">€/' + unit + '</div>'
      + (favAboveMin ? '<div class="cmp-extra">+' + ((s.prezzo - minP) * liters).toFixed(2) + '\u20AC/' + litersLabel + '</div>' : '<div class="cmp-save">Il pi\u00F9 economico!</div>')
      + '</div></div>';

    // Top competitors (exclude fav itself)
    const others = data.filter(o => o.id !== s.id).slice(0, 5);
    others.forEach((o, i) => {
      const isBest = i === 0;
      const saves = s.prezzo > o.prezzo ? ((s.prezzo - o.prezzo) * liters).toFixed(2) : null;
      const costs = o.prezzo > s.prezzo ? ((o.prezzo - s.prezzo) * liters).toFixed(2) : null;
      html += '<div class="cmp-row' + (isBest ? ' cmp-best' : '') + '">'
        + '<div class="cmp-rank ' + (isBest ? 'r1' : '') + '">' + (i + 1) + '</div>'
        + '<div><div class="cmp-name">' + esc(o.nome) + '</div>'
        + '<div class="cmp-addr">' + esc(o.indirizzo) + '</div>'
        + (o.distanza != null ? '<div class="cmp-dist">📍 ' + o.distanza + ' km</div>' : '')
        + (o.bandiera ? '<div style="font-size:.6rem;color:var(--mut)">' + esc(o.bandiera) + ' · ' + (o.isSelf?'self':'servito') + '</div>' : '')
        + '</div>'
        + '<div><div class="cmp-price' + (isBest ? ' best' : '') + '">' + o.prezzo.toFixed(3) + '</div>'
        + '<div style="font-size:.62rem;color:var(--mut)">€/' + unit + '</div>'
        + (saves ? '<div class="cmp-save">risparmi ' + saves + '\u20AC/' + litersLabel + '</div>' : '')
        
        + '</div></div>';
    });

    // Summary
    if (favAboveMin) {
      html += '<div class="cmp-summary">&#128161; Andando al distributore pi\u00F9 economico risparmi <strong>' + ((s.prezzo - minP) * liters).toFixed(2) + '\u20AC</strong> ogni pieno da ' + litersLabel + '.</div>';
    } else {
      html += '<div class="cmp-summary">✅ Il tuo preferito è già il più economico nell\'area!</div>';
    }

    list.innerHTML = html;
  } catch(e) {
    list.innerHTML = '<div style="color:var(--rd);font-size:.78rem;padding:8px 0">' + esc(e.message) + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confronta';
  }
}



