

/* ═══════════════════════════════════════════════════════════════════
   HUB RIDE — fullscreen GPS tracker (speed/distance/time + GPX export)
   Uses watchPosition + Wake Lock + Haversine for distance.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  var watchId = null;
  var wakeLock = null;
  var state = 'idle'; // idle | recording | paused | finished
  var startTs = 0;
  var elapsedMs = 0;
  var distanceM = 0;
  var maxSpeed = 0;
  var sumSpeed = 0; var sumSpeedN = 0;
  var lastFix = null;
  var track = [];
  var tickInterval = null;

  // Performance mode state
  var rideMode = 'normal'; // 'normal' | 'p0-100' | 'p100-0' | 'p0-400'
  var perfStartTs = null;
  var perfStartSpeed = null;  // km/h at run start (for 100-0)
  var perfTriggered = false;
  var perfDistanceStart = 0;
  var perfMaxG = 0;

  // G-sensor state
  var gSensorActive = false;
  var gX = 0, gY = 0, gZ = 1;

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    return (h > 0 ? pad(h) + ':' : '') + pad(m) + ':' + pad(ss);
  }
  function haversine(a, b) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad;
    var dLng = (b.lng - a.lng) * toRad;
    var la1 = a.lat * toRad, la2 = b.lat * toRad;
    var x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(la1) * Math.cos(la2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function injectRideUI() {
    if (document.getElementById('rd-overlay')) return;

    // No launch button — Ride is reached only via the pill tab.

    var ov = document.createElement('div');
    ov.id = 'rd-overlay';
    ov.innerHTML =
      '<div class="rd-hdr">' +
        '<h2>RIDE MODE<small id="rd-veh">—</small></h2>' +
        '<button class="rd-close" onclick="closeRide()">✕ Esci</button>' +
      '</div>' +
      '<div class="rd-modebar">' +
        '<button class="rd-mode-btn on" data-mode="normal" onclick="rideSetMode(\'normal\')">Normale</button>' +
        '<button class="rd-mode-btn" data-mode="p0-100" onclick="rideSetMode(\'p0-100\')">0-100 km/h</button>' +
        '<button class="rd-mode-btn" data-mode="gmeter" onclick="rideToggleGMeter()" id="rd-gmeter-btn">G-meter</button>' +
      '</div>' +
      '<div class="rd-status" id="rd-status">In attesa</div>' +
      '<div class="rd-perf-modeline" id="rd-perf-modeline" style="display:none"></div>' +
      '<div id="rd-error-slot"></div>' +
      '<div class="rd-speedbox" id="rd-speedbox">' +
        '<div class="rd-speed-col">' +
          '<div class="rd-speed" id="rd-speed">0</div>' +
          '<div class="rd-speed-unit">km/h</div>' +
        '</div>' +
        '<div class="rd-gmeter" id="rd-gmeter" style="display:none">' +
          '<svg class="rd-gmeter-grid" viewBox="0 0 200 200">' +
            '<circle cx="100" cy="100" r="92" stroke="rgba(255,255,255,.1)" stroke-width="1" fill="none"/>' +
            '<circle cx="100" cy="100" r="62" stroke="rgba(255,255,255,.07)" stroke-width="1" fill="none"/>' +
            '<circle cx="100" cy="100" r="32" stroke="rgba(255,255,255,.07)" stroke-width="1" fill="none"/>' +
            '<line x1="100" y1="8" x2="100" y2="192" stroke="rgba(255,255,255,.06)" stroke-width="1"/>' +
            '<line x1="8" y1="100" x2="192" y2="100" stroke="rgba(255,255,255,.06)" stroke-width="1"/>' +
          '</svg>' +
          '<div class="rd-gmeter-dot" id="rd-gdot"></div>' +
          '<div class="rd-gmeter-label"><span class="rd-gmeter-val" id="rd-gval">0.0</span> G</div>' +
        '</div>' +
      '</div>' +
      '<div class="rd-stats">' +
        '<div class="rd-stat">' +
          '<div class="rd-stat-lbl">Tempo</div>' +
          '<div class="rd-stat-val" id="rd-time">00:00</div>' +
        '</div>' +
        '<div class="rd-stat">' +
          '<div class="rd-stat-lbl">Distanza</div>' +
          '<div class="rd-stat-val" id="rd-dist">0.0</div>' +
          '<div class="rd-stat-sub">km</div>' +
        '</div>' +
        '<div class="rd-stat">' +
          '<div class="rd-stat-lbl">Max</div>' +
          '<div class="rd-stat-val" id="rd-max">0</div>' +
          '<div class="rd-stat-sub">km/h</div>' +
        '</div>' +
      '</div>' +
      '<div class="rd-actions" id="rd-actions"></div>' +
      '<div class="rd-perf-result" id="rd-perf-result">' +
        '<div class="rd-perf-result-inner" id="rd-perf-result-inner"></div>' +
      '</div>';
    document.body.appendChild(ov);

    renderActions();
  }

  function renderActions() {
    var el = document.getElementById('rd-actions');
    if (!el) return;
    if (state === 'idle') {
      el.innerHTML = '<button class="rd-btn rd-btn-start" onclick="rideStart()">▶ Avvia</button>';
    } else if (state === 'recording') {
      el.innerHTML =
        '<button class="rd-btn rd-btn-pause" onclick="ridePause()">⏸ Pausa</button>' +
        '<button class="rd-btn rd-btn-stop" onclick="rideStop()">⏹ Termina</button>';
    } else if (state === 'paused') {
      el.innerHTML =
        '<button class="rd-btn rd-btn-start" onclick="rideStart()">▶ Riprendi</button>' +
        '<button class="rd-btn rd-btn-stop" onclick="rideStop()">⏹ Termina</button>';
    } else if (state === 'finished') {
      el.innerHTML =
        '<button class="rd-btn rd-btn-export" onclick="rideExport()">⬇ Esporta GPX</button>' +
        '<button class="rd-btn rd-btn-pause" onclick="rideReset()">↺ Nuova</button>';
    }
  }

  function setStatus(text, recording) {
    var el = document.getElementById('rd-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('recording', !!recording);
  }
  function showError(msg) {
    var slot = document.getElementById('rd-error-slot');
    if (!slot) return;
    slot.innerHTML = msg ? '<div class="rd-error">' + escSafe(msg) + '</div>' : '';
  }

  function tick() {
    if (state !== 'recording') return;
    var elapsed = elapsedMs + (Date.now() - startTs);
    document.getElementById('rd-time').textContent = fmtTime(elapsed);
  }

  // GPS warm-up: ignore the first few fixes while signal stabilizes
  var _gpsFixCount = 0;
  var _GPS_WARMUP = 3;
  var _MAX_REASONABLE_KMH = 320;  // cap (anything above is GPS glitch)

  function onPosition(pos) {
    if (state !== 'recording') return;
    var c = pos.coords;
    var now = pos.timestamp || Date.now();
    var fix = { lat: c.latitude, lng: c.longitude, ts: now, speed: c.speed, alt: c.altitude };
    _gpsFixCount++;

    // Compute candidate speed
    var kmh = 0;
    if (typeof c.speed === 'number' && c.speed >= 0 && !isNaN(c.speed)) {
      kmh = c.speed * 3.6;
    } else if (lastFix) {
      var dt = (now - lastFix.ts) / 1000;
      if (dt > 0) kmh = haversineKm(lastFix, fix) * 3600 / dt;
    }

    // ── Quality filters ──
    var poorAccuracy = !c.accuracy || c.accuracy > 30;       // m
    var isWarmup     = _gpsFixCount <= _GPS_WARMUP;
    var isInsane     = kmh > _MAX_REASONABLE_KMH;
    var isOutlier    = false;
    if (lastFix && typeof lastFix._kmh === 'number') {
      var deltaSec = Math.max(0.1, (now - lastFix.ts) / 1000);
      var deltaKmh = Math.abs(kmh - lastFix._kmh);
      // Reject jumps faster than ~30 km/h per second (~3g sustained: impossible)
      if (deltaKmh / deltaSec > 30) isOutlier = true;
    }

    // Distance: only count when accuracy is good, no warm-up, no outlier
    if (lastFix && !poorAccuracy && !isWarmup && !isOutlier) {
      var d = haversineKm(lastFix, fix) * 1000;
      // Tiny jitter when stationary: ignore
      if (d > 1.5) distanceM += d;
    }

    // Max-speed update: very strict — must pass all filters
    if (!poorAccuracy && !isWarmup && !isInsane && !isOutlier) {
      if (kmh > maxSpeed) maxSpeed = kmh;
      if (kmh > 1) { sumSpeed += kmh; sumSpeedN++; }
    }

    // Display: clamp insane values to 0 visually so user sees something sane
    var displayKmh = (isInsane || isOutlier) ? 0 : kmh;
    fix._kmh = kmh;  // store for next outlier comparison

    track.push(fix);
    lastFix = fix;

    document.getElementById('rd-speed').textContent = Math.round(displayKmh);
    document.getElementById('rd-dist').textContent = (distanceM / 1000).toFixed(1);
    document.getElementById('rd-max').textContent = Math.round(maxSpeed);

    // ── Performance mode detection ──
    if (rideMode !== 'normal') {
      detectPerf(displayKmh, now);
    }
  }

  function haversineKm(a, b) {
    var R = 6371, toRad = Math.PI / 180;
    var aLat = a.lat * toRad, bLat = b.lat * toRad;
    var dLat = (b.lat - a.lat) * toRad;
    var dLng = (b.lng - a.lng) * toRad;
    var x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(aLat) * Math.cos(bLat);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function detectPerf(kmh, now) {
    // 0-100 km/h: arm at standstill (kmh<2), trigger when motion starts (kmh>3),
    //             complete at kmh >= 100
    if (rideMode === 'p0-100') {
      if (!perfStartTs) {
        if (kmh < 2) {
          // armed, waiting for movement
          updatePerfModeLine('Pronti · attendo partenza');
        } else if (kmh > 3) {
          // trigger
          perfStartTs = now;
          perfDistanceStart = distanceM;
          perfMaxG = 0;
          updatePerfModeLine('REC · 0→100 in corso');
        }
      } else if (kmh >= 100) {
        var elapsed = (now - perfStartTs) / 1000;
        finishPerfRun({
          mode: 'p0-100',
          time: elapsed,
          distance: distanceM - perfDistanceStart,
          maxG: perfMaxG,
          peakKmh: maxSpeed
        });
      }
    }

    // 0-400m (¼ mile): arm at standstill, trigger on motion, complete at distance ≥ 402.34m
    if (rideMode === 'p0-400') {
      if (!perfStartTs) {
        if (kmh < 2) {
          updatePerfModeLine('Pronti · attendo partenza');
        } else if (kmh > 3) {
          perfStartTs = now;
          perfDistanceStart = distanceM;
          perfMaxG = 0;
          updatePerfModeLine('REC · ¼ miglio in corso');
        }
      } else {
        var dist = distanceM - perfDistanceStart;
        var quarterMile = 402.34; // m
        if (dist >= quarterMile) {
          finishPerfRun({
            mode: 'p0-400',
            time: (now - perfStartTs) / 1000,
            distance: dist,
            maxG: perfMaxG,
            peakKmh: maxSpeed
          });
        }
      }
    }

    // 100-0 km/h: arm above 100 km/h, trigger when speed starts dropping (decel),
    //             complete at kmh < 1
    if (rideMode === 'p100-0') {
      if (!perfStartTs) {
        if (kmh < 100) {
          updatePerfModeLine('Sali sopra 100 km/h…');
        } else {
          // armed; we trigger as soon as speed decreases
          if (perfStartSpeed === null) {
            perfStartSpeed = kmh;
            updatePerfModeLine('Pronto a 100+ · frena ora');
          } else if (kmh < perfStartSpeed - 1) {
            // started braking
            perfStartTs = now;
            perfDistanceStart = distanceM;
            perfMaxG = 0;
            updatePerfModeLine('REC · 100→0 in corso');
          } else {
            perfStartSpeed = kmh; // refresh peak
          }
        }
      } else if (kmh < 1) {
        finishPerfRun({
          mode: 'p100-0',
          time: (now - perfStartTs) / 1000,
          distance: distanceM - perfDistanceStart,
          maxG: perfMaxG,
          peakKmh: perfStartSpeed
        });
      }
    }
  }

  function updatePerfModeLine(text) {
    var el = document.getElementById('rd-perf-modeline');
    if (el) { el.style.display = 'block'; el.textContent = text; }
  }

  /* ── Performance result + best-times persistence ─────────────── */
  function finishPerfRun(result) {
    state = 'finished';
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    releaseWakeLock();
    elapsedMs += Date.now() - startTs;

    var v = window.hubGarage && window.hubGarage.active();
    // Persist best for this vehicle + mode
    var bestKey = 'hub_perf_best_v1';
    var allBest = {};
    try { allBest = JSON.parse(localStorage.getItem(bestKey) || '{}'); } catch(_) {}
    var vid = v ? v.id : '_no_vehicle';
    if (!allBest[vid]) allBest[vid] = {};
    var prev = allBest[vid][result.mode];
    var isNewBest = !prev || result.time < prev.time;
    if (isNewBest) {
      allBest[vid][result.mode] = {
        time: result.time, maxG: result.maxG, peakKmh: result.peakKmh,
        ts: Date.now(), distance: result.distance
      };
      try { localStorage.setItem(bestKey, JSON.stringify(allBest)); } catch(_) {}
    }
    showPerfResult(result, prev, isNewBest);
  }

  function modeLabel(mode) {
    return mode === 'p0-100' ? '0-100 km/h'
         : mode === 'p100-0' ? '100-0 km/h'
         : mode === 'p0-400' ? '0-400 m (¼ miglio)'
         : 'Performance';
  }

  function showPerfResult(result, prev, isNewBest) {
    var el = document.getElementById('rd-perf-result-inner');
    if (!el) return;
    var unitLabel = result.mode === 'p0-400' ? 'sec · ¼ miglio'
                  : result.mode === 'p100-0' ? 'sec · arresto'
                  : 'sec · 0→100';
    var bestHtml = '';
    if (isNewBest && prev) {
      bestHtml = '<div class="rd-perf-result-best">🏆 Nuovo best · prima ' + prev.time.toFixed(2) + ' s</div>';
    } else if (isNewBest) {
      bestHtml = '<div class="rd-perf-result-best">🏆 Primo tentativo registrato</div>';
    } else {
      bestHtml = '<div class="rd-perf-result-best rd-perf-result-best-old">Best precedente: ' + prev.time.toFixed(2) + ' s</div>';
    }

    var distM = (result.distance || 0).toFixed(1);
    var peakKmh = Math.round(result.peakKmh || 0);
    var maxG = (result.maxG || 0).toFixed(2);
    el.innerHTML =
      '<div class="rd-perf-result-title">' + modeLabel(result.mode) + '</div>' +
      '<div class="rd-perf-result-time">' + result.time.toFixed(2) + '</div>' +
      '<div class="rd-perf-result-unit">' + unitLabel + '</div>' +
      bestHtml +
      '<div class="rd-perf-result-grid">' +
        '<div class="rd-perf-result-cell"><div class="rd-perf-result-cell-lbl">Distanza</div><div class="rd-perf-result-cell-val">' + distM + ' m</div></div>' +
        '<div class="rd-perf-result-cell"><div class="rd-perf-result-cell-lbl">Picco</div><div class="rd-perf-result-cell-val">' + peakKmh + ' km/h</div></div>' +
        '<div class="rd-perf-result-cell"><div class="rd-perf-result-cell-lbl">Max G</div><div class="rd-perf-result-cell-val">' + maxG + ' G</div></div>' +
        '<div class="rd-perf-result-cell"><div class="rd-perf-result-cell-lbl">Modalità</div><div class="rd-perf-result-cell-val">' + modeLabel(result.mode) + '</div></div>' +
      '</div>' +
      '<div class="rd-perf-result-actions">' +
        '<button class="rd-perf-close" onclick="ridePerfClose()">Chiudi</button>' +
        '<button class="rd-perf-again" onclick="ridePerfAgain()">↻ Ancora</button>' +
      '</div>';
    document.getElementById('rd-perf-result').classList.add('visible');
  }

  window.ridePerfClose = function() {
    document.getElementById('rd-perf-result').classList.remove('visible');
    rideReset();
  };
  window.ridePerfAgain = function() {
    document.getElementById('rd-perf-result').classList.remove('visible');
    rideReset();
    setTimeout(function() { rideStart(); }, 100);
  };

  /* ── G-sensor ─────────────────────────────────────────────── */
  var _gCalibT0 = 0;          // timestamp first sample
  var _gCalibSamples = 0;
  var _gCalibSumX = 0;
  var _gCalibSumY = 0;
  var _gCalibX = 0, _gCalibY = 0;
  var _G_CALIB_MS = 1500;     // calibrazione per 1.5s

  function startGSensor() {
    if (gSensorActive) return;

    // Reset calibration
    _gCalibT0 = 0; _gCalibSamples = 0;
    _gCalibSumX = 0; _gCalibSumY = 0;
    _gCalibX = 0; _gCalibY = 0;
    gX = 0; gY = 0;

    function handler(ev) {
      // Prefer .acceleration (gravity already removed by OS); fallback to
      // .accelerationIncludingGravity with calibration offset.
      var raw = ev.acceleration || ev.accelerationIncludingGravity;
      if (!raw) return;
      var hasGravity = !ev.acceleration;  // we are using IncludingGravity

      var ax = (raw.x || 0) / 9.81;
      var ay = (raw.y || 0) / 9.81;

      // Calibration phase (only if we are reading IncludingGravity)
      if (hasGravity) {
        var nowT = Date.now();
        if (_gCalibT0 === 0) _gCalibT0 = nowT;
        if (nowT - _gCalibT0 < _G_CALIB_MS) {
          _gCalibSumX += ax;
          _gCalibSumY += ay;
          _gCalibSamples++;
          // During calibration, force display to 0
          var label0 = document.getElementById('rd-gval');
          if (label0) label0.textContent = 'cal…';
          return;
        } else if (_gCalibSamples > 0 && _gCalibX === 0 && _gCalibY === 0) {
          // First time we cross the threshold, lock the offsets
          _gCalibX = _gCalibSumX / _gCalibSamples;
          _gCalibY = _gCalibSumY / _gCalibSamples;
        }
        ax -= _gCalibX;
        ay -= _gCalibY;
      }

      // Low-pass smoothing
      gX = gX * 0.7 + ax * 0.3;
      gY = gY * 0.7 + ay * 0.3;

      var mag = Math.sqrt(gX * gX + gY * gY);
      // Cap insane values from noise
      if (mag > 3) mag = 3;
      if (state === 'recording' && mag > perfMaxG) perfMaxG = mag;

      var dot = document.getElementById('rd-gdot');
      var val = document.getElementById('rd-gval');
      if (dot) {
        var px = Math.max(-70, Math.min(70, -gX * 50));
        var py = Math.max(-70, Math.min(70,  gY * 50));
        dot.style.transform = 'translate(' + px + 'px, ' + py + 'px)';
      }
      if (val) val.textContent = mag.toFixed(2);
    }

    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(function(resp) {
        if (resp === 'granted') {
          window.addEventListener('devicemotion', handler);
          gSensorActive = true;
        }
      }).catch(function() { /* user denied */ });
    } else if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handler);
      gSensorActive = true;
    }
  }

  /* ── Mode switching ─────────────────────────────────────────── */
  window.rideToggleGMeter = function() {
    var el = document.getElementById('rd-gmeter');
    var box = document.getElementById('rd-speedbox');
    var btn = document.getElementById('rd-gmeter-btn');
    if (!el || !box || !btn) return;
    if (el.style.display === 'flex') {
      el.style.display = 'none';
      box.classList.remove('with-gmeter');
      btn.classList.remove('on');
    } else {
      startGSensor();
      el.style.display = 'flex';
      box.classList.add('with-gmeter');
      btn.classList.add('on');
    }
  };

  window.rideSetMode = function(mode) {
    if (state === 'recording') {
      alert('Ferma la registrazione prima di cambiare modalità.');
      return;
    }
    rideMode = mode;
    document.querySelectorAll('.rd-mode-btn').forEach(function(b) {
      b.classList.toggle('on', b.dataset.mode === mode);
    });
    if (mode === 'normal') {
      var ml = document.getElementById('rd-perf-modeline');
      if (ml) ml.style.display = 'none';
    } else {
      updatePerfModeLine(mode === 'p0-100' ? 'Tap Avvia → fermo da 0 km/h'
                       : mode === 'p100-0' ? 'Tap Avvia → sopra 100 km/h, poi frena'
                       : 'Tap Avvia → fermo, accelera al massimo');
    }
  };
  function onPositionError(err) {
    showError('GPS: ' + (err.message || err.code || 'errore') +
              ' · controlla che la geolocalizzazione sia attiva.');
  }

  async function acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch(e) { /* ignore */ }
  }
  function releaseWakeLock() {
    if (wakeLock) { try { wakeLock.release(); } catch(e) {} wakeLock = null; }
  }
  document.addEventListener('visibilitychange', function() {
    if (state === 'recording' && document.visibilityState === 'visible' && !wakeLock) {
      acquireWakeLock();
    }
  });

  /* ── Public ────────────────────────────────────────────────── */
  window.openRide = function() {
    injectRideUI();
    var v = window.hubGarage && window.hubGarage.active();
    document.getElementById('rd-veh').textContent = v
      ? (v.customName || (v.marca + ' ' + v.modello)) + ' · ' + (v.type === 'moto' ? 'Moto' : 'Auto')
      : 'Nessun veicolo attivo';
    document.getElementById('rd-overlay').classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeRide = function() {
    if (state === 'recording' || state === 'paused') {
      if (!confirm('Terminare la registrazione?')) return;
      rideStop();
    }
    document.getElementById('rd-overlay').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  window.rideStart = function() {
    if (!('geolocation' in navigator)) {
      showError('GPS non disponibile sul dispositivo.');
      return;
    }
    showError('');
    if (state === 'idle') {
      distanceM = 0; maxSpeed = 0; sumSpeed = 0; sumSpeedN = 0;
      elapsedMs = 0; track = []; lastFix = null;
      _gpsFixCount = 0;
      // Reset perf state
      perfStartTs = null;
      perfStartSpeed = null;
      perfTriggered = false;
      perfDistanceStart = 0;
      perfMaxG = 0;
    }
    startTs = Date.now();
    state = 'recording';
    setStatus('REC · GPS attivo', true);
    renderActions();
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });
    tickInterval = setInterval(tick, 250);
    acquireWakeLock();
  };
  window.ridePause = function() {
    if (state !== 'recording') return;
    elapsedMs += Date.now() - startTs;
    state = 'paused';
    setStatus('In pausa', false);
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    releaseWakeLock();
    renderActions();
  };
  window.rideStop = function() {
    if (state === 'recording') elapsedMs += Date.now() - startTs;
    state = 'finished';
    var totalKm = distanceM / 1000;
    var totalH = (elapsedMs / 1000) / 3600;
    var avgKmh = totalH > 0 ? totalKm / totalH : 0;
    setStatus('Ride completato · media ' + avgKmh.toFixed(1) + ' km/h', false);
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    releaseWakeLock();

    // Auto-save to ride diary if we have at least 1 km
    if (totalKm >= 1) {
      try {
        var v = window.hubGarage && window.hubGarage.active();
        var entry = {
          id: 'rd' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
          vehicleId: v ? v.id : null,
          vehicleName: v ? (v.customName || (v.marca + ' ' + v.modello)) : 'Sconosciuto',
          vehicleType: v ? v.type : null,
          startTs: track.length ? track[0].ts : Date.now() - elapsedMs,
          endTs: track.length ? track[track.length-1].ts : Date.now(),
          elapsedMs: elapsedMs,
          distanceKm: totalKm,
          maxKmh: maxSpeed,
          avgKmh: avgKmh,
          // Simplify track to ~80 points to keep storage light
          points: simplifyTrack(track, 80),
          title: ''
        };
        var all = [];
        try { all = JSON.parse(localStorage.getItem('hub_rides_v1') || '[]'); } catch(_) {}
        all.push(entry);
        localStorage.setItem('hub_rides_v1', JSON.stringify(all));
        setStatus('Ride salvata · media ' + avgKmh.toFixed(1) + ' km/h', false);
      } catch(e) { console.error('[AutoHub] ride save failed', e); }
    }

    renderActions();
  };

  function simplifyTrack(pts, maxN) {
    if (!pts || pts.length <= maxN) return pts.map(function(p) {
      return { lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5), ts: p.ts };
    });
    var step = Math.floor(pts.length / maxN);
    var out = [];
    for (var i = 0; i < pts.length; i += step) {
      var p = pts[i];
      out.push({ lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5), ts: p.ts });
    }
    // ensure last point included
    var last = pts[pts.length - 1];
    if (out.length === 0 || out[out.length-1].ts !== last.ts) {
      out.push({ lat: +last.lat.toFixed(5), lng: +last.lng.toFixed(5), ts: last.ts });
    }
    return out;
  }
  window.rideReset = function() {
    state = 'idle';
    elapsedMs = 0; distanceM = 0; maxSpeed = 0; sumSpeed = 0; sumSpeedN = 0;
    track = []; lastFix = null;
    perfStartTs = null; perfStartSpeed = null; perfTriggered = false;
    perfDistanceStart = 0; perfMaxG = 0;
    document.getElementById('rd-speed').textContent = '0';
    document.getElementById('rd-time').textContent  = '00:00';
    document.getElementById('rd-dist').textContent  = '0.0';
    document.getElementById('rd-max').textContent   = '0';
    setStatus('In attesa', false);
    showError('');
    var ml = document.getElementById('rd-perf-modeline');
    if (ml && rideMode !== 'normal') {
      // Restore the mode hint text
      rideSetMode(rideMode);
    } else if (ml) {
      ml.style.display = 'none';
    }
    renderActions();
  };

  window.rideExport = function() {
    if (track.length === 0) { alert('Nessun punto GPS registrato.'); return; }
    var v = window.hubGarage && window.hubGarage.active();
    var vehName = v ? (v.customName || (v.marca + ' ' + v.modello)) : 'AutoHub Ride';
    var startDate = new Date(track[0].ts).toISOString();
    var trkpts = track.map(function(p) {
      var t = new Date(p.ts).toISOString();
      var s = (p.speed != null && !isNaN(p.speed)) ? p.speed : '';
      var a = (p.alt != null && !isNaN(p.alt)) ? p.alt : '';
      var ext = '';
      if (s !== '') ext += '<extensions><speed>' + s + '</speed></extensions>';
      return '    <trkpt lat="' + p.lat.toFixed(6) + '" lon="' + p.lng.toFixed(6) + '">' +
        (a !== '' ? '<ele>' + a + '</ele>' : '') +
        '<time>' + t + '</time>' +
        ext +
      '</trkpt>';
    }).join('\n');
    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<gpx version="1.1" creator="AutoHub" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      '  <metadata><name>' + escSafe(vehName) + '</name><time>' + startDate + '</time></metadata>\n' +
      '  <trk><name>' + escSafe(vehName) + ' Ride</name><trkseg>\n' +
      trkpts + '\n' +
      '  </trkseg></trk>\n' +
      '</gpx>';

    var blob = new Blob([gpx], { type: 'application/gpx+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var stamp = new Date(track[0].ts).toISOString().replace(/[:.]/g, '-').slice(0, 16);
    a.download = 'autohub-ride-' + stamp + '.gpx';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  };

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(injectRideUI, 400);
  });
})();

