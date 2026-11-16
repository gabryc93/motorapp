

/* ═══════════════════════════════════════════════════════════════════
   HUB WEATHER — meteo lungo un percorso (geocoding + OSRM + Open-Meteo)
   Pill-tab "azione": apre overlay direttamente
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function injectWeatherUI() {
    if (document.getElementById('wp-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'wp-overlay';
    ov.innerHTML =
      '<div class="wp-hdr">' +
        '<h2>METEO LUNGO IL PERCORSO<small>OpenStreetMap · Open-Meteo</small></h2>' +
        '<button class="gar-close" onclick="closeWeather()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="wp-body">' +
        '<div class="wp-form">' +
          '<div class="wp-field"><label>Partenza</label>' +
            '<input type="text" id="wp-from" placeholder="Es. Milano" autocomplete="off">' +
            '<button class="wp-locate" onclick="wpUseLocation()" title="Usa la mia posizione">📍</button>' +
          '</div>' +
          '<div class="wp-field"><label>Destinazione</label>' +
            '<input type="text" id="wp-to" placeholder="Es. Stelvio" autocomplete="off">' +
          '</div>' +
          '<div class="wp-field"><label>Partenza prevista</label>' +
            '<input type="datetime-local" id="wp-when">' +
          '</div>' +
          '<button class="wp-go" onclick="wpCompute()">Calcola meteo →</button>' +
        '</div>' +
        '<div class="wp-result" id="wp-result"></div>' +
      '</div>';
    document.body.appendChild(ov);

    // Default datetime: now rounded
    var now = new Date();
    now.setMinutes(0, 0, 0);
    var pad = function(n) { return n < 10 ? '0' + n : n; };
    var local = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) +
                'T' + pad(now.getHours()) + ':00';
    document.getElementById('wp-when').value = local;
  }

  window.openWeather = function() {
    injectWeatherUI();
    document.getElementById('wp-overlay').classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeWeather = function() {
    var ov = document.getElementById('wp-overlay');
    if (ov) ov.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  window.wpUseLocation = function() {
    if (!navigator.geolocation) { alert('GPS non disponibile.'); return; }
    var input = document.getElementById('wp-from');
    input.value = '⌖ Acquisizione GPS...';
    navigator.geolocation.getCurrentPosition(function(pos) {
      input.value = pos.coords.latitude.toFixed(4) + ',' + pos.coords.longitude.toFixed(4);
      input.dataset.lat = pos.coords.latitude;
      input.dataset.lng = pos.coords.longitude;
    }, function(err) {
      input.value = '';
      alert('GPS errore: ' + (err.message || err.code));
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  // Geocode using Nominatim (OSM)
  async function geocode(query) {
    // If query is "lat,lng" use it directly
    var m = query.trim().match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (m) return { lat: +m[1], lng: +m[2], display: query };
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it,fr,ch,at,si&q=' +
              encodeURIComponent(query);
    var r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('Geocoding HTTP ' + r.status);
    var data = await r.json();
    if (!data || !data.length) throw new Error('Località non trovata: ' + query);
    return { lat: +data[0].lat, lng: +data[0].lon, display: data[0].display_name };
  }

  // Get route from OSRM (public demo server)
  async function getRoute(from, to) {
    var url = 'https://router.project-osrm.org/route/v1/driving/' +
              from.lng + ',' + from.lat + ';' + to.lng + ',' + to.lat +
              '?overview=full&geometries=geojson';
    var r = await fetch(url);
    if (!r.ok) throw new Error('Routing HTTP ' + r.status);
    var data = await r.json();
    if (!data.routes || !data.routes.length) throw new Error('Nessun percorso trovato');
    var route = data.routes[0];
    return {
      coords: route.geometry.coordinates, // [[lng,lat], ...]
      distanceKm: route.distance / 1000,
      durationS: route.duration
    };
  }

  // Sample N points along the route at fractional positions
  function sampleRoute(coords, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var idx = Math.round(i / (n - 1) * (coords.length - 1));
      var c = coords[idx];
      out.push({ lat: c[1], lng: c[0], frac: i / (n - 1) });
    }
    return out;
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

  async function fetchWeatherAt(lat, lng, isoHour) {
    // Open-Meteo hourly forecast — pick the nearest hour
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) +
              '&longitude=' + lng.toFixed(4) +
              '&hourly=temperature_2m,precipitation,weathercode,wind_speed_10m' +
              '&forecast_days=3&timezone=auto';
    var r = await fetch(url);
    if (!r.ok) throw new Error('Meteo HTTP ' + r.status);
    var data = await r.json();
    var times = data.hourly.time;
    var idx = times.findIndex(function(t) { return t >= isoHour; });
    if (idx < 0) idx = 0;
    return {
      temperature: data.hourly.temperature_2m[idx],
      precipitation: data.hourly.precipitation[idx],
      code: data.hourly.weathercode[idx],
      wind: data.hourly.wind_speed_10m[idx],
      time: times[idx]
    };
  }

  window.wpCompute = async function() {
    var fromInput = document.getElementById('wp-from');
    var toInput = document.getElementById('wp-to');
    var whenInput = document.getElementById('wp-when');
    var result = document.getElementById('wp-result');

    var fromQ = fromInput.value.trim();
    var toQ   = toInput.value.trim();
    if (!fromQ || !toQ) { alert('Inserisci partenza e destinazione.'); return; }
    var whenStr = whenInput.value;
    if (!whenStr) { alert('Imposta orario partenza.'); return; }
    var whenDate = new Date(whenStr);

    result.innerHTML = '<div class="wp-loading">Acquisizione percorso e meteo…</div>';

    try {
      // 1. Geocode
      var from, to;
      if (fromInput.dataset.lat) from = { lat: +fromInput.dataset.lat, lng: +fromInput.dataset.lng, display: fromQ };
      else from = await geocode(fromQ);
      to = await geocode(toQ);

      // 2. Route
      var route = await getRoute(from, to);

      // 3. Sample 5 points
      var samples = sampleRoute(route.coords, 5);

      // 4. For each sample, compute estimated arrival time and fetch weather
      var promises = samples.map(function(s, i) {
        var passTimeMs = whenDate.getTime() + (route.durationS * 1000) * s.frac;
        var d = new Date(passTimeMs);
        var pad = function(n) { return n < 10 ? '0' + n : n; };
        var iso = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' +
                  pad(d.getHours()) + ':00';
        return fetchWeatherAt(s.lat, s.lng, iso).then(function(w) {
          return Object.assign({}, s, { weather: w, when: d });
        });
      });
      var weatherSamples = await Promise.all(promises);

      // 5. Render
      renderWeather(from, to, route, weatherSamples);
    } catch (e) {
      result.innerHTML = '<div class="wp-error">Errore: ' + escSafe(e.message || String(e)) + '</div>';
    }
  };

  function renderWeather(from, to, route, samples) {
    var totalH = route.durationS / 3600;
    var headHtml = '<div class="wp-route-info">' +
      '<div class="wp-route-row"><strong>' + escSafe(from.display.split(',')[0]) + '</strong> → <strong>' + escSafe(to.display.split(',')[0]) + '</strong></div>' +
      '<div class="wp-route-meta">' + route.distanceKm.toFixed(0) + ' km · ' +
        Math.floor(totalH) + 'h ' + Math.round((totalH % 1) * 60) + 'm</div>' +
    '</div>';

    // Decision card: auto vs moto
    var decisionHtml = buildDecisionCard(samples, route);

    // Find any rain/snow alert
    var hasRain = samples.some(function(s) { return s.weather.precipitation > 0.5; });
    var alertHtml = hasRain ? '<div class="wp-alert">⚠ Precipitazioni previste lungo il tragitto</div>' : '';

    var rowsHtml = samples.map(function(s, i) {
      var w = s.weather;
      var pad = function(n) { return n < 10 ? '0' + n : n; };
      var hh = pad(s.when.getHours()) + ':' + pad(s.when.getMinutes());
      var posLbl = i === 0 ? 'Partenza' : i === samples.length - 1 ? 'Arrivo' : Math.round(s.frac * 100) + '%';
      var precipBadge = w.precipitation > 0.5
        ? '<span class="wp-precip">💧 ' + w.precipitation.toFixed(1) + ' mm</span>'
        : '';
      return '<div class="wp-step">' +
        '<div class="wp-step-time">' +
          '<div class="wp-step-frac">' + posLbl + '</div>' +
          '<div class="wp-step-hh">' + hh + '</div>' +
        '</div>' +
        '<div class="wp-step-icon">' + weatherIcon(w.code) + '</div>' +
        '<div class="wp-step-info">' +
          '<div class="wp-step-temp">' + Math.round(w.temperature) + '°C</div>' +
          '<div class="wp-step-desc">' + weatherDesc(w.code) + ' · vento ' + Math.round(w.wind) + ' km/h</div>' +
          precipBadge +
        '</div>' +
      '</div>';
    }).join('');

    document.getElementById('wp-result').innerHTML =
      headHtml + decisionHtml + alertHtml +
      '<div class="wp-steps">' + rowsHtml + '</div>';
  }

  /* ── Auto vs Moto decision engine ────────────────────────────── */
  function buildDecisionCard(samples, route) {
    var motoScore = 0, autoScore = 0;
    var pros = [];

    var precips = samples.map(function(s) { return s.weather.precipitation || 0; });
    var temps   = samples.map(function(s) { return s.weather.temperature; });
    var winds   = samples.map(function(s) { return s.weather.wind || 0; });
    var maxRain = Math.max.apply(null, precips);
    var totalRain = precips.reduce(function(a, b) { return a + b; }, 0);
    var rainPointsLight = precips.filter(function(p) { return p > 0.1; }).length;
    var rainPointsHeavy = precips.filter(function(p) { return p > 0.5; }).length;
    var minTemp = Math.min.apply(null, temps);
    var maxTemp = Math.max.apply(null, temps);
    var maxWind = Math.max.apply(null, winds);
    var avgWind = winds.reduce(function(a, b) { return a + b; }, 0) / winds.length;
    var km = route.distanceKm;

    // ── Blocker: pioggia diffusa (≥2 punti) o forte (max>0.3mm), freddo, vento ──
    var hasBlocker = (rainPointsLight >= 2) || (maxRain > 0.3) || (minTemp < 5) || (maxWind > 30);

    // ── Pioggia (most important factor) ──
    if (maxRain > 3 || totalRain > 5) {
      autoScore += 9;
      pros.push({ side:'auto', icn:'🌧', txt:'Pioggia intensa prevista (max ' + maxRain.toFixed(1) + ' mm)' });
    } else if (rainPointsHeavy >= 1 || rainPointsLight >= 2) {
      autoScore += 7;
      pros.push({ side:'auto', icn:'💧', txt:'Pioggia in ' + rainPointsLight + '/' + samples.length + ' punti del tragitto' });
    } else if (maxRain > 0.1) {
      autoScore += 4;
      pros.push({ side:'auto', icn:'💧', txt:'Possibili gocce di pioggia' });
    } else {
      motoScore += 3;
      pros.push({ side:'moto', icn:'☀', txt:'Niente pioggia su tutto il tragitto' });
    }

    // ── Temperatura ──
    if (minTemp < 3) {
      autoScore += 6;
      pros.push({ side:'auto', icn:'🥶', txt:'Freddo intenso (min ' + Math.round(minTemp) + '°C)' });
    } else if (minTemp < 8) {
      autoScore += 4;
      pros.push({ side:'auto', icn:'❄', txt:'Freddo (min ' + Math.round(minTemp) + '°C), abbigliamento pesante' });
    } else if (maxTemp > 34) {
      autoScore += 3;
      pros.push({ side:'auto', icn:'🥵', txt:'Caldo estremo (' + Math.round(maxTemp) + '°C), casco pesante' });
    } else if (minTemp >= 14 && maxTemp <= 28 && !hasBlocker) {
      motoScore += 3;
      pros.push({ side:'moto', icn:'🌡', txt:'Temperatura ideale (' + Math.round(minTemp) + '-' + Math.round(maxTemp) + '°C)' });
    } else if (minTemp >= 10 && maxTemp <= 32 && !hasBlocker) {
      motoScore += 1;
      pros.push({ side:'moto', icn:'🌡', txt:'Temperatura accettabile' });
    }

    // ── Vento ──
    if (maxWind > 40) {
      autoScore += 7;
      pros.push({ side:'auto', icn:'💨', txt:'Vento forte (raffiche ' + Math.round(maxWind) + ' km/h)' });
    } else if (maxWind > 25) {
      autoScore += 4;
      pros.push({ side:'auto', icn:'🌬', txt:'Vento moderato-forte (' + Math.round(maxWind) + ' km/h)' });
    } else if (avgWind < 12 && !hasBlocker) {
      motoScore += 1;
      pros.push({ side:'moto', icn:'🍃', txt:'Aria calma' });
    }

    // ── Distanza (don't reward moto if blockers present) ──
    if (km > 400) {
      autoScore += 3;
      pros.push({ side:'auto', icn:'🛣', txt:'Tragitto molto lungo (' + Math.round(km) + ' km)' });
    } else if (km > 250) {
      autoScore += 1;
      pros.push({ side:'auto', icn:'🛣', txt:'Tragitto lungo (' + Math.round(km) + ' km)' });
    } else if (km >= 50 && km <= 200 && !hasBlocker) {
      motoScore += 2;
      pros.push({ side:'moto', icn:'🛤', txt:'Distanza ideale per la moto' });
    }

    // ── Verdict ──
    var diff = motoScore - autoScore;
    var verdict, color, sub;
    if (diff >= 4) {
      verdict = '🏍 PRENDI LA MOTO';
      color = 'moto';
      sub = 'Condizioni ottime per uscire in due ruote';
    } else if (diff >= 2) {
      verdict = '🏍 LEGGERMENTE PRO MOTO';
      color = 'moto';
      sub = 'Condizioni favorevoli ma non perfette';
    } else if (diff <= -4) {
      verdict = '🚗 MEGLIO L\'AUTO';
      color = 'auto';
      sub = 'Le condizioni non aiutano la moto oggi';
    } else if (diff <= -2) {
      verdict = '🚗 LEGGERMENTE PRO AUTO';
      color = 'auto';
      sub = 'Qualche fattore consiglia di stare in abitacolo';
    } else {
      verdict = '⚖ DECIDI TU';
      color = 'mixed';
      sub = 'Condizioni miste, scelta personale';
    }

    // ── Garage check ──
    var note = '';
    try {
      var g = (window.hubGarage && window.hubGarage.list) ? window.hubGarage.list() : [];
      var hasAuto = g.some(function(v) { return v.type === 'auto'; });
      var hasMoto = g.some(function(v) { return v.type === 'moto'; });
      if (g.length === 0) {
        note = 'Nessun veicolo in garage. Aggiungili per consigli più personalizzati.';
      } else if (color === 'moto' && !hasMoto) {
        note = 'Hai solo auto in garage — qui ti diciamo quale veicolo sarebbe meglio in queste condizioni.';
      } else if (color === 'auto' && !hasAuto) {
        note = 'Hai solo moto in garage — fai attenzione: le condizioni non sono ideali.';
      }
    } catch(_) {}

    var prosHtml = pros.map(function(p) {
      return '<div class="wp-decision-pro">' +
        '<span class="wp-decision-pro-icn">' + p.icn + '</span>' +
        '<span class="wp-decision-pro-side side-' + p.side + '">' + p.side + '</span>' +
        '<span>' + escSafe(p.txt) + '</span>' +
      '</div>';
    }).join('');

    var motoBarCls = motoScore > autoScore ? ' high-moto' : '';
    var autoBarCls = autoScore > motoScore ? ' high-auto' : '';

    return '<div class="wp-decision dec-' + color + '">' +
      '<div class="wp-decision-verdict">' + verdict + '</div>' +
      '<div class="wp-decision-sub">' + sub + '</div>' +
      '<div class="wp-decision-score">' +
        '<div class="wp-decision-bar' + motoBarCls + '">' +
          '<span class="wp-decision-bar-icn">🏍</span>' +
          '<span>Moto</span>' +
          '<span class="wp-decision-bar-val">+' + motoScore + '</span>' +
        '</div>' +
        '<div class="wp-decision-bar' + autoBarCls + '">' +
          '<span class="wp-decision-bar-icn">🚗</span>' +
          '<span>Auto</span>' +
          '<span class="wp-decision-bar-val">+' + autoScore + '</span>' +
        '</div>' +
      '</div>' +
      (pros.length ? '<div class="wp-decision-pros">' + prosHtml + '</div>' : '') +
      (note ? '<div class="wp-decision-note">ℹ ' + escSafe(note) + '</div>' : '') +
    '</div>';
  }
})();

