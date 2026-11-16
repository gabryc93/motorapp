/* ═══════════════════════════════════════════════════════════════════
   HUB RIDE — registratore GPS a schermo intero
   Modalità: Giro (uscita libera) · Prestazioni (0-100, 0-200, 80-120,
   100-0, 0-400 m) · Pista (cronometro giri con traguardo GPS).
   Pausa automatica da fermo, recupero dopo un crash della pagina,
   piega/G laterale dalla traccia, HUD a specchio per il parabrezza.
   Dati: hub_rides_v1 (diario), hub_perf_runs_v1 (tempi), hub_ride_lines_v1
   (traguardi), hub_ride_live_v1 (uscita in corso).
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function A() { return window.hubRideAnalisi; }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function veicolo() { return window.hubGarage && window.hubGarage.active ? window.hubGarage.active() : null; }
  function vName(v) { return v ? (v.customName || ((v.marca || '') + ' ' + (v.modello || '')).trim()) : 'Sconosciuto'; }
  function $(id) { return document.getElementById(id); }

  var RIDES = 'hub_rides_v1', RUNS = 'hub_perf_runs_v1', BEST_OLD = 'hub_perf_best_v1', LINES = 'hub_ride_lines_v1', LIVE = 'hub_ride_live_v1', PREF = 'hub_ride_pref_v1';
  var PERF = {
    'p0-100':  { nome: '0-100 km/h',  tipo: 'acc',     a: 100 },
    'p0-200':  { nome: '0-200 km/h',  tipo: 'acc',     a: 200 },
    'p80-120': { nome: '80-120 km/h', tipo: 'ripresa', da: 80, a: 120 },
    'p100-0':  { nome: '100-0 km/h',  tipo: 'frenata', da: 100 },
    'p0-400':  { nome: '0-400 m',     tipo: 'dist',    m: 400 }
  };
  var MAX_KMH = 330, WARMUP = 2, STILL_MS = 20000;

  var pref = jget(PREF, {});
  var S = { state: 'idle', mode: pref.mode || 'giro', perf: PERF[pref.perf] ? pref.perf : 'p0-100', hud: false };
  var R = null;        // uscita in corso
  var P = null;        // prova prestazioni in corso
  var watchId = null, tickT = null, wakeLock = null, lastSave = 0;
  var noGps = false;   // test: niente watchPosition

  function nuovaUscita() {
    return { startTs: Date.now(), segStart: Date.now(), elapsedMs: 0, movingMs: 0, distanceM: 0, maxKmh: 0, track: [],
      last: null, fixes: 0, stillSince: null, laps: [], lapT0: null, line: null, vid: (veicolo() || {}).id || null };
  }
  function savePref() { jset(PREF, { mode: S.mode, perf: S.perf }); }

  /* ── Interfaccia ─────────────────────────────────────────────── */
  function inject() {
    if ($('rd-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'rd-overlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modalità Ride');
    ov.innerHTML =
      '<div class="rd-hdr"><h2>RIDE<small id="rd-veh">—</small></h2>' +
        '<div class="rd-hdr-act"><button class="rd-close" type="button" onclick="rideHud()" title="Velocità a specchio da riflettere sul parabrezza">HUD</button>' +
        '<button class="rd-close" type="button" onclick="closeRide()">✕ Esci</button></div></div>' +
      '<div class="rd-modebar" role="tablist">' +
        '<button class="rd-mode-btn" data-mode="giro" onclick="rideSetMode(\'giro\')">Giro</button>' +
        '<button class="rd-mode-btn" data-mode="perf" onclick="rideSetMode(\'perf\')">Prestazioni</button>' +
        '<button class="rd-mode-btn" data-mode="pista" onclick="rideSetMode(\'pista\')">Pista</button>' +
        '<button class="rd-mode-btn" id="rd-gmeter-btn" onclick="rideToggleGMeter()" aria-pressed="false">G-meter</button>' +
      '</div>' +
      '<div class="rd-perfbar" id="rd-perfbar">' + Object.keys(PERF).map(function(k) {
        return '<button type="button" class="rd-chip" data-perf="' + k + '" onclick="rideSetPerf(\'' + k + '\')">' + PERF[k].nome + '</button>';
      }).join('') + '<button type="button" class="rd-chip rd-chip-ghost" onclick="rideStorico()">⏱ Tempi</button></div>' +
      '<div class="rd-status" id="rd-status">In attesa</div>' +
      '<div class="rd-gps" id="rd-gps">GPS —</div>' +
      '<div class="rd-perf-modeline" id="rd-perf-modeline" style="display:none"></div>' +
      '<div id="rd-error-slot"></div>' +
      '<div class="rd-lap" id="rd-lap" style="display:none"></div>' +
      '<div class="rd-speedbox" id="rd-speedbox" onclick="if(document.getElementById(\'rd-overlay\').classList.contains(\'rd-hud\'))rideHud()">' +
        '<div class="rd-speed-col"><div class="rd-speed" id="rd-speed">0</div><div class="rd-speed-unit">km/h</div>' +
          '<div class="rd-sub" id="rd-sub"></div></div>' +
        '<div class="rd-gmeter" id="rd-gmeter" style="display:none">' +
          '<svg class="rd-gmeter-grid" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" stroke="rgba(255,255,255,.1)" fill="none"/>' +
          '<circle cx="100" cy="100" r="62" stroke="rgba(255,255,255,.07)" fill="none"/><circle cx="100" cy="100" r="32" stroke="rgba(255,255,255,.07)" fill="none"/>' +
          '<line x1="100" y1="8" x2="100" y2="192" stroke="rgba(255,255,255,.06)"/><line x1="8" y1="100" x2="192" y2="100" stroke="rgba(255,255,255,.06)"/></svg>' +
          '<div class="rd-gmeter-dot" id="rd-gdot"></div><div class="rd-gmeter-label"><span class="rd-gmeter-val" id="rd-gval">0.0</span> G</div></div>' +
      '</div>' +
      '<div class="rd-stats">' +
        cell('Tempo', 'rd-time', '00:00', '<span id="rd-tot">in movimento</span>') + cell('Distanza', 'rd-dist', '0.0', 'km') +
        cell('Media', 'rd-avg', '0', 'km/h') + cell('Max', 'rd-max', '0', 'km/h') +
      '</div>' +
      '<div class="rd-actions" id="rd-actions"></div>' +
      '<div class="rd-perf-result" id="rd-perf-result"><div class="rd-perf-result-inner" id="rd-perf-result-inner"></div></div>';
    document.body.appendChild(ov);
    applyMode(); renderActions();
  }
  function cell(lbl, id, val, sub) {
    return '<div class="rd-stat"><div class="rd-stat-lbl">' + lbl + '</div><div class="rd-stat-val" id="' + id + '">' + val + '</div><div class="rd-stat-sub">' + sub + '</div></div>';
  }
  function renderActions() {
    var el = $('rd-actions'); if (!el) return;
    var pista = S.mode === 'pista' && (S.state === 'recording') ? '<button class="rd-btn rd-btn-line" onclick="rideLinea()">🏁 Traguardo qui</button>' : '';
    el.innerHTML = S.state === 'idle' ? '<button class="rd-btn rd-btn-start" onclick="rideStart()">▶ Avvia</button>'
      : S.state === 'recording' ? pista + '<button class="rd-btn rd-btn-pause" onclick="ridePause()">⏸ Pausa</button><button class="rd-btn rd-btn-stop" onclick="rideStop()">⏹ Termina</button>'
      : S.state === 'paused' ? '<button class="rd-btn rd-btn-start" onclick="rideStart()">▶ Riprendi</button><button class="rd-btn rd-btn-stop" onclick="rideStop()">⏹ Termina</button>'
      : '<button class="rd-btn rd-btn-export" onclick="rideExport()">⬇ GPX</button>' + (S.savedId ? '<button class="rd-btn rd-btn-pause" onclick="hubRideLogOpen(\'' + S.savedId + '\')">📊 Riepilogo</button>' : '') +
        '<button class="rd-btn rd-btn-pause" onclick="rideReset()">↺ Nuova</button>';
  }
  function setStatus(t, rec) { var el = $('rd-status'); if (el) { el.textContent = t; el.classList.toggle('recording', !!rec); } }
  function showError(html) { var s = $('rd-error-slot'); if (s) s.innerHTML = html ? '<div class="rd-error">' + html + '</div>' : ''; }
  function modeLine(t) { var el = $('rd-perf-modeline'); if (el) { el.style.display = t ? 'block' : 'none'; el.textContent = t || ''; } }
  function applyMode() {
    document.querySelectorAll('.rd-mode-btn[data-mode]').forEach(function(b) { b.classList.toggle('on', b.dataset.mode === S.mode); b.setAttribute('aria-selected', b.dataset.mode === S.mode); });
    document.querySelectorAll('.rd-chip[data-perf]').forEach(function(b) { b.classList.toggle('on', b.dataset.perf === S.perf); });
    var pb = $('rd-perfbar'); if (pb) pb.style.display = S.mode === 'perf' ? 'flex' : 'none';
    var lap = $('rd-lap'); if (lap) lap.style.display = S.mode === 'pista' ? 'block' : 'none';
    if (S.mode === 'perf') { if (!P || P.mode !== S.perf) perfReset(); hintPerf(); }
    else modeLine(S.mode === 'pista' ? (R && R.line ? '' : 'Avvia, poi tocca “Traguardo qui” passando sulla linea del traguardo') : '');
    renderLap(); renderActions();
  }

  /* ── GPS ─────────────────────────────────────────────────────── */
  function onPosition(pos) {
    if (S.state !== 'recording' || !R) return;
    var c = pos.coords, now = pos.timestamp || Date.now();
    var f = { lat: c.latitude, lng: c.longitude, ts: now, alt: c.altitude, acc: c.accuracy, hdg: c.heading };
    R.fixes++;
    var last = R.last, dt = last ? (now - last.ts) / 1000 : 0;
    if (last && dt <= 0) return;
    var kmh = 0;
    if (typeof c.speed === 'number' && c.speed >= 0 && !isNaN(c.speed)) kmh = c.speed * 3.6;
    else if (last && dt > 0) kmh = A().dist(last, f) / dt * 3.6;
    f.kmh = kmh;
    var poor = !c.accuracy || c.accuracy > 30, warm = R.fixes <= WARMUP, insane = kmh > MAX_KMH;
    var outlier = last && last.kmh != null && dt > 0 && Math.abs(kmh - last.kmh) / Math.max(.1, dt) > 35;   // > 3,5 g: impossibile
    var good = !poor && !warm && !insane && !outlier;
    if (good && last && (f.hdg == null || isNaN(f.hdg))) f.hdg = bearing(last, f);
    if (last && good) {
      var d = A().dist(last, f);
      if (d > 1.5 && kmh >= 2) R.distanceM += d;
      if (kmh >= 3 && dt < 10) R.movingMs += dt * 1000;
      if (kmh > R.maxKmh) R.maxKmh = kmh;
    }
    // pausa automatica: fermi da 20 s il tempo in movimento non corre e la traccia non cresce
    if (kmh < 3) { if (!R.stillSince) R.stillSince = now; } else R.stillSince = null;
    var fermo = R.stillSince && now - R.stillSince > STILL_MS;
    setStatus(fermo ? 'Fermo · pausa automatica' : 'REC · GPS attivo', !fermo);
    if (good && !(kmh < 1 && R.track.length && A().dist(R.track[R.track.length - 1], f) < 5)) R.track.push(f);
    if (!insane && !outlier) {
      if (S.mode === 'perf' && last) perfStep(last, f);
      if (S.mode === 'pista' && last && good) lapStep(last, f);
    }
    if (good || !last) R.last = f;
    render(insane || outlier ? 0 : kmh, f);
    if (now - lastSave > 15000) saveLive();
  }
  function bearing(a, b) {
    var p = A().xy(a, b); var h = Math.atan2(p.x, p.y) * 180 / Math.PI; return (h + 360) % 360;
  }
  function render(kmh, f) {
    $('rd-speed').textContent = Math.round(kmh);
    $('rd-dist').textContent = (R.distanceM / 1000).toFixed(R.distanceM < 100000 ? 1 : 0);
    $('rd-max').textContent = Math.round(R.maxKmh);
    $('rd-avg').textContent = R.movingMs > 30000 ? Math.round(R.distanceM / 1000 / (R.movingMs / 3600000)) : '0';
    var g = $('rd-gps'), acc = f && f.acc;
    if (g && acc != null) {
      g.textContent = 'GPS ±' + Math.round(acc) + ' m';
      g.className = 'rd-gps ' + (acc <= 8 ? 'ok' : acc <= 20 ? 'mid' : 'bad');
    }
    // riga sotto la velocità: quota, direzione, piega teorica (moto) o G laterale (auto)
    var sub = [], v = veicolo();
    if (f && f.alt != null && !isNaN(f.alt)) sub.push('⛰ ' + Math.round(f.alt) + ' m');
    if (f && f.hdg != null && !isNaN(f.hdg) && kmh > 5) sub.push(['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(f.hdg / 45) % 8]);
    if (R.track.length > 4) {
      var cv = A().curve(R.track.slice(-8).map(function(p) { return { lat: p.lat, lng: p.lng, ts: p.ts, v: p.kmh }; }));
      var s = cv.serie.length ? cv.serie[cv.serie.length - 1] : 0;
      if (v && v.type === 'moto') { if (Math.abs(s) >= 5) sub.push('piega ' + (s > 0 ? '◀ ' : '') + Math.round(Math.abs(s)) + '°' + (s < 0 ? ' ▶' : '')); }
      else if (Math.abs(s) >= 5) sub.push('G lat ' + Math.tan(Math.abs(s) * Math.PI / 180).toFixed(2));
    }
    $('rd-sub').textContent = sub.join(' · ');
    renderLap();
  }
  function tick() {
    if (S.state !== 'recording' || !R) return;
    var tot = R.elapsedMs + (Date.now() - R.segStart);
    $('rd-time').textContent = fmtTime(R.movingMs || 0);
    $('rd-tot').textContent = 'totale ' + fmtTime(tot);
    if (S.mode === 'pista') renderLap();
  }
  function fmtTime(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    var p = function(n) { return n < 10 ? '0' + n : '' + n; };
    return (h ? p(h) + ':' : '') + p(m) + ':' + p(ss);
  }

  /* ── Prestazioni ─────────────────────────────────────────────── */
  function perfReset() { P = { mode: S.perf, fase: 'attesa', t0: 0, dist: 0, alt0: null, accSum: 0, n: 0, maxG: 0, dtSum: 0 }; }
  function hintPerf() {
    if (S.mode !== 'perf') return;
    var c = PERF[S.perf];
    if (S.state !== 'recording') { modeLine(c.tipo === 'frenata' ? 'Avvia, porta la velocità sopra 100 e frena a fondo' : c.tipo === 'ripresa' ? 'Avvia, scendi sotto 80 e accelera a fondo fino a 120' : 'Avvia da fermo: il tempo parte appena ti muovi'); return; }
    var t = { attesa: c.tipo === 'frenata' ? 'Porta la velocità sopra 100 km/h' : c.tipo === 'ripresa' ? 'Scendi sotto 78 km/h' : 'Fermati del tutto per armare',
      pronto: c.tipo === 'frenata' ? 'Pronto · frena a fondo quando vuoi' : c.tipo === 'ripresa' ? 'Pronto · accelera a fondo' : 'Pronto · parti quando vuoi',
      corsa: 'REC · ' + c.nome + ' in corso', partito: 'REC · ' + c.nome + ' in corso' }[P.fase];
    modeLine(t);
  }
  // istante in cui la velocità passa per "v" tra due letture (interpolazione lineare)
  function tCross(a, b, v) {
    if (b.kmh === a.kmh) return b.ts;
    var u = (v - a.kmh) / (b.kmh - a.kmh); return a.ts + Math.max(0, Math.min(1, u)) * (b.ts - a.ts);
  }
  function perfStep(a, b) {
    if (!P || P.mode !== S.perf) perfReset();
    var c = PERF[S.perf], dt = (b.ts - a.ts) / 1000, was = P.fase;
    if (dt > 3) { if (P.fase === 'corsa') { perfReset(); modeLine('Segnale GPS perso: prova annullata'); } return; }
    if (was === 'corsa') { P.dist += (a.kmh + b.kmh) / 2 / 3.6 * dt; P.accSum += b.acc || 0; P.n++; P.dtSum += dt; }
    var start = function(t0, vFrom) {
      P.fase = 'corsa'; P.t0 = t0; P.alt0 = a.alt; P.maxG = 0; P.n = 1; P.accSum = b.acc || 0; P.dtSum = (b.ts - t0) / 1000;
      P.dist = (vFrom + b.kmh) / 2 / 3.6 * (b.ts - t0) / 1000; P.vMax = b.kmh;
    };
    if (P.fase === 'corsa' && b.kmh > (P.vMax || 0)) P.vMax = b.kmh;
    if (c.tipo === 'acc' || c.tipo === 'dist') {
      if (P.fase === 'attesa') { if (b.kmh < 1) P.fase = 'pronto'; }
      else if (P.fase === 'pronto') { if (b.kmh >= 1.5) { P.fase = 'partito'; P.a0 = a; } }
      else if (P.fase === 'partito') {
        // partenza: con un'ultima lettura da fermo anche di un secondo prima, il via vero si
        // ricava all'indietro dalle prime due letture in movimento (accelerazione costante)
        if (b.kmh < 1) { P.fase = 'pronto'; }
        else {
          var sl = (b.kmh - a.kmh) / (b.ts - a.ts), t0 = sl > 0 ? a.ts - a.kmh / sl : tCross(P.a0, a, 0.5);
          t0 = Math.max(P.a0.ts, Math.min(a.ts, t0));
          P.fase = 'corsa'; P.t0 = t0; P.alt0 = P.a0.alt; P.maxG = 0; P.n = 2; P.accSum = (a.acc || 0) + (b.acc || 0); P.dtSum = (b.ts - t0) / 1000; P.vMax = b.kmh;
          P.dist = a.kmh / 2 / 3.6 * (a.ts - t0) / 1000 + (a.kmh + b.kmh) / 2 / 3.6 * dt;
        }
      }
      if (P.fase !== 'corsa') { /* in attesa della partenza */ }
      else if (b.kmh < 1) { P.fase = 'pronto'; }
      else if (c.tipo === 'acc' && b.kmh >= c.a) { var te = tCross(a, b, c.a); return perfFine(te, b, a); }
      else if (c.tipo === 'dist' && P.dist >= c.m) {
        var dPrev = P.dist - (a.kmh + b.kmh) / 2 / 3.6 * dt, u = (c.m - dPrev) / Math.max(.01, P.dist - dPrev);
        var tf = a.ts + Math.max(0, Math.min(1, u)) * (b.ts - a.ts);
        P.dist = c.m; P.trap = a.kmh + (b.kmh - a.kmh) * u;
        return perfFine(tf, b, a);
      }
    } else if (c.tipo === 'ripresa') {
      if (P.fase === 'attesa') { if (b.kmh < c.da - 2) P.fase = 'pronto'; }
      else if (P.fase === 'pronto') { if (a.kmh < c.da && b.kmh >= c.da) start(tCross(a, b, c.da), c.da); }
      else if (b.kmh >= c.a) return perfFine(tCross(a, b, c.a), b, a);
      else if (b.kmh < c.da - 3) P.fase = 'pronto';
    } else if (c.tipo === 'frenata') {
      if (P.fase === 'attesa') { if (b.kmh >= c.da + 2) P.fase = 'pronto'; }
      else if (P.fase === 'pronto') { if (a.kmh >= c.da && b.kmh < c.da) start(tCross(a, b, c.da), c.da); else if (b.kmh < c.da - 5) P.fase = 'attesa'; }
      else if (b.kmh <= 1) return perfFine(tCross(a, b, 0.5), b, a);
      else if (b.kmh > a.kmh + 4) { P.fase = 'attesa'; modeLine('Hai riaccelerato: prova annullata'); return; }
    }
    if (P.fase !== was) hintPerf();
  }
  function perfFine(tEnd, b, a) {
    var c = PERF[S.perf], time = (tEnd - P.t0) / 1000;
    var slope = P.alt0 != null && b.alt != null && P.dist > 20 ? (b.alt - P.alt0) / P.dist * 100 : null;
    var acc = P.n ? P.accSum / P.n : null, hz = P.n && P.dtSum ? P.n / P.dtSum : null;
    var note = [];
    if (slope != null && Math.abs(slope) > 2) note.push('pendenza ' + slope.toFixed(1).replace('.', ',') + '%');
    if (acc != null && acc > 10) note.push('GPS poco preciso (±' + Math.round(acc) + ' m)');
    var run = { id: 'pr' + Date.now().toString(36), vid: (veicolo() || {}).id || '_nessuno', mode: S.perf, time: Math.round(time * 100) / 100,
      dist: Math.round(P.dist * 10) / 10, trap: P.trap != null ? Math.round(P.trap) : null, vMax: Math.round(P.vMax || b.kmh), slope: slope != null ? Math.round(slope * 10) / 10 : null,
      acc: acc != null ? Math.round(acc) : null, hz: hz ? Math.round(hz * 10) / 10 : null, maxG: Math.round(P.maxG * 100) / 100, ts: Date.now(), valido: !note.length, note: note.join(' · ') };
    var runs = loadRuns(), prev = best(runs, run.vid, run.mode);
    runs.push(run); if (runs.length > 300) runs = runs.slice(-300); jset(RUNS, runs);
    showPerfResult(run, prev);
    perfReset(); hintPerf();
  }
  function loadRuns() {
    var runs = jget(RUNS, null);
    if (!runs) {   // tempi migliori della versione precedente
      runs = []; var old = jget(BEST_OLD, {});
      Object.keys(old).forEach(function(vid) { Object.keys(old[vid]).forEach(function(m) { var o = old[vid][m]; runs.push({ id: 'old' + vid + m, vid: vid, mode: m === 'p0-400' ? 'p0-400' : m, time: o.time, dist: o.distance, maxG: o.maxG, vMax: o.peakKmh, ts: o.ts, valido: true, note: '' }); }); });
      jset(RUNS, runs);
    }
    return runs;
  }
  function best(runs, vid, mode) {
    return runs.filter(function(r) { return r.vid === vid && r.mode === mode && r.valido; }).sort(function(a, b) { return a.time - b.time; })[0] || null;
  }
  function showPerfResult(run, prev) {
    var c = PERF[run.mode], el = $('rd-perf-result-inner'); if (!el) return;
    var bestHtml = !run.valido ? '<div class="rd-perf-result-best rd-perf-result-best-old">Non vale come record: ' + esc(run.note) + '</div>'
      : !prev ? '<div class="rd-perf-result-best">🏆 Primo tempo valido registrato</div>'
      : run.time < prev.time ? '<div class="rd-perf-result-best">🏆 Nuovo record · prima ' + prev.time.toFixed(2) + ' s (−' + (prev.time - run.time).toFixed(2) + ')</div>'
      : '<div class="rd-perf-result-best rd-perf-result-best-old">Record: ' + prev.time.toFixed(2) + ' s (+' + (run.time - prev.time).toFixed(2) + ')</div>';
    var cellR = function(l, v) { return '<div class="rd-perf-result-cell"><div class="rd-perf-result-cell-lbl">' + l + '</div><div class="rd-perf-result-cell-val">' + v + '</div></div>'; };
    el.innerHTML = '<div class="rd-perf-result-title">' + c.nome + '</div>' +
      '<div class="rd-perf-result-time">' + run.time.toFixed(2) + '</div><div class="rd-perf-result-unit">secondi</div>' + bestHtml +
      '<div class="rd-perf-result-grid">' +
        cellR(c.tipo === 'frenata' ? 'Spazio di arresto' : 'Distanza', run.dist.toFixed(1).replace('.', ',') + ' m') +
        cellR(c.tipo === 'dist' ? 'Velocità d\'uscita' : 'Velocità max', (run.trap || run.vMax) + ' km/h') +
        cellR('Pendenza', run.slope != null ? run.slope.toFixed(1).replace('.', ',') + '%' : '—') +
        cellR('GPS', (run.acc != null ? '±' + run.acc + ' m' : '—') + (run.hz ? ' · ' + run.hz.toString().replace('.', ',') + ' Hz' : '')) +
        (run.maxG ? cellR('Max G', run.maxG.toFixed(2)) : '') +
      '</div>' +
      (run.hz && run.hz < 2 ? '<p class="rd-perf-note">Il GPS del telefono aggiorna ' + (run.hz < 1.5 ? 'una volta' : 'due volte') + ' al secondo: il tempo è interpolato, conta ±0,2 s. Per confronti seri ripeti nei due sensi di marcia e fai la media.</p>' : '') +
      '<div class="rd-perf-result-actions"><button class="rd-perf-close" onclick="rideStorico()">⏱ Tempi</button><button class="rd-perf-again" onclick="ridePerfClose()">↻ Ancora</button></div>';
    $('rd-perf-result').classList.add('visible');
  }
  window.ridePerfClose = function() { $('rd-perf-result').classList.remove('visible'); };
  window.ridePerfAgain = window.ridePerfClose;
  window.rideStorico = function() {
    var v = veicolo(), vid = v ? v.id : '_nessuno', runs = loadRuns().filter(function(r) { return r.vid === vid; });
    var html = '<div class="rd-perf-result-title">Tempi · ' + esc(v ? vName(v) : 'nessun veicolo') + '</div>';
    var any = false;
    Object.keys(PERF).forEach(function(m) {
      var list = runs.filter(function(r) { return r.mode === m; }).sort(function(a, b) { return b.ts - a.ts; });
      if (!list.length) return; any = true;
      var b = best(runs, vid, m);
      html += '<div class="rd-hist"><div class="rd-hist-h">' + PERF[m].nome + (b ? '<b>' + b.time.toFixed(2) + ' s</b>' : '') + '</div>' +
        list.slice(0, 6).map(function(r) {
          var d = new Date(r.ts);
          return '<div class="rd-hist-r' + (b && r.id === b.id ? ' best' : '') + (r.valido ? '' : ' nv') + '"><span>' + ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '</span><span>' + r.time.toFixed(2) + ' s</span><span>' + (r.valido ? (r.dist ? r.dist.toFixed(0) + ' m' : '') : esc(r.note || 'non valido')) + '</span></div>';
        }).join('') + '</div>';
    });
    if (!any) html += '<p class="rd-perf-note">Nessun tempo ancora. Scegli una prova, tocca Avvia e segui le indicazioni.</p>';
    html += '<p class="rd-perf-note">Fai le prove solo su strade chiuse al traffico o in pista. Il record conta solo i tempi validi (pendenza entro 2%, GPS entro ±10 m).</p>' +
      '<div class="rd-perf-result-actions"><button class="rd-perf-again" onclick="ridePerfClose()">Chiudi</button></div>';
    $('rd-perf-result-inner').innerHTML = html;
    $('rd-perf-result').classList.add('visible');
  };

  /* ── Pista: traguardo e giri ─────────────────────────────────── */
  function lineEnds(L) {
    var h = L.hdg * Math.PI / 180, px = Math.cos(h), py = -Math.sin(h);   // perpendicolare alla direzione
    return { o: L, a: { x: px * 25, y: py * 25 }, b: { x: -px * 25, y: -py * 25 }, dx: Math.sin(h), dy: Math.cos(h) };
  }
  function lapStep(a, b) {
    if (!R.line) {   // traguardo salvato vicino?
      var near = jget(LINES, []).filter(function(L) { return A().dist(L, b) < 1500; })[0];
      if (near) { R.line = near; modeLine('Traguardo salvato trovato: ' + (near.nome || 'pista')); } else return;
    }
    var E = lineEnds(R.line), p = A().xy(R.line, a), q = A().xy(R.line, b);
    var r = { x: q.x - p.x, y: q.y - p.y }, s = { x: E.b.x - E.a.x, y: E.b.y - E.a.y };
    var den = r.x * s.y - r.y * s.x; if (Math.abs(den) < 1e-9) return;
    var t = ((E.a.x - p.x) * s.y - (E.a.y - p.y) * s.x) / den, u = ((E.a.x - p.x) * r.y - (E.a.y - p.y) * r.x) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return;
    if (r.x * E.dx + r.y * E.dy <= 0) return;   // attraversata contromano
    var tc = a.ts + t * (b.ts - a.ts);
    if (R.lapT0 != null) {
      var lap = tc - R.lapT0;
      if (lap < 15000) return;
      R.laps.push(Math.round(lap));
      var bst = Math.min.apply(null, R.laps);
      modeLine(lap === bst && R.laps.length > 1 ? '🟣 Giro più veloce!' : 'Giro ' + R.laps.length + ': ' + A().fmtLap(lap));
    } else modeLine('Via! Giro 1');
    R.lapT0 = tc;
    renderLap();
  }
  window.rideLinea = function() {
    if (!R || !R.last || !(R.last.kmh > 8)) { showError('Segna il traguardo mentre ci passi sopra in movimento: serve la direzione di marcia.'); return; }
    showError('');
    var L = { lat: R.last.lat, lng: R.last.lng, hdg: R.last.hdg != null ? R.last.hdg : 0, ts: Date.now(), nome: '' };
    var lines = jget(LINES, []).filter(function(x) { return A().dist(x, L) > 1500; });
    lines.unshift(L); jset(LINES, lines.slice(0, 30));
    R.line = L; R.lapT0 = R.last.ts; R.laps = [];
    modeLine('Traguardo segnato · Giro 1');
    renderLap();
  };
  function renderLap() {
    var el = $('rd-lap'); if (!el || S.mode !== 'pista') return;
    if (!R || R.lapT0 == null) { el.innerHTML = '<div class="rd-lap-cur">--:--.--</div><div class="rd-lap-row">Nessun giro</div>'; return; }
    var cur = Date.now() - R.lapT0, laps = R.laps, bst = laps.length ? Math.min.apply(null, laps) : null, last = laps[laps.length - 1];
    var delta = last != null && bst != null && laps.length > 1 ? last - bst : null;
    el.innerHTML = '<div class="rd-lap-n">GIRO ' + (laps.length + 1) + '</div><div class="rd-lap-cur">' + A().fmtLap(cur) + '</div>' +
      '<div class="rd-lap-row"><span>Ultimo <b>' + A().fmtLap(last) + '</b>' + (delta != null ? ' <i class="' + (delta <= 0 ? 'up' : 'dn') + '">' + (delta <= 0 ? '' : '+') + (delta / 1000).toFixed(2) + '</i>' : '') + '</span>' +
      '<span>Migliore <b class="best">' + A().fmtLap(bst) + '</b></span></div>' +
      (laps.length ? '<div class="rd-lap-list">' + laps.map(function(l, i) { return '<span' + (l === bst ? ' class="best"' : '') + '>' + (i + 1) + '. ' + A().fmtLap(l) + '</span>'; }).reverse().slice(0, 8).join('') + '</div>' : '');
  }

  /* ── G-meter ─────────────────────────────────────────────────── */
  var gOn = false, gX = 0, gY = 0, cal = { t0: 0, n: 0, sx: 0, sy: 0, x: null, y: null };
  function onMotion(ev) {
    var raw = ev.acceleration && ev.acceleration.x != null ? ev.acceleration : ev.accelerationIncludingGravity;
    if (!raw) return;
    var grav = raw === ev.accelerationIncludingGravity, ax = (raw.x || 0) / 9.81, ay = (raw.y || 0) / 9.81;
    if (grav) {
      var t = Date.now(); if (!cal.t0) cal.t0 = t;
      if (cal.x == null) { if (t - cal.t0 < 1500) { cal.sx += ax; cal.sy += ay; cal.n++; var lv = $('rd-gval'); if (lv) lv.textContent = 'cal…'; return; } cal.x = cal.n ? cal.sx / cal.n : 0; cal.y = cal.n ? cal.sy / cal.n : 0; }
      ax -= cal.x; ay -= cal.y;
    }
    gX = gX * .7 + ax * .3; gY = gY * .7 + ay * .3;
    var mag = Math.min(3, Math.sqrt(gX * gX + gY * gY));
    if (P && P.fase === 'corsa' && mag > P.maxG) P.maxG = mag;
    var dot = $('rd-gdot'), val = $('rd-gval');
    if (dot) dot.style.transform = 'translate(' + Math.max(-70, Math.min(70, -gX * 50)) + 'px,' + Math.max(-70, Math.min(70, gY * 50)) + 'px)';
    if (val) val.textContent = mag.toFixed(2);
  }
  function startG() {
    if (gOn) return;
    cal = { t0: 0, n: 0, sx: 0, sy: 0, x: null, y: null };
    var go = function() { window.addEventListener('devicemotion', onMotion); gOn = true; };
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(function(r) { if (r === 'granted') go(); }).catch(function() {});
    } else if ('DeviceMotionEvent' in window) go();
  }
  window.rideToggleGMeter = function() {
    var el = $('rd-gmeter'), box = $('rd-speedbox'), btn = $('rd-gmeter-btn'); if (!el) return;
    var on = el.style.display !== 'flex';
    if (on) startG();
    el.style.display = on ? 'flex' : 'none'; box.classList.toggle('with-gmeter', on); btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on);
  };

  /* ── Modalità ────────────────────────────────────────────────── */
  window.rideSetMode = function(m) {
    if (S.state === 'recording' && m !== S.mode && (m === 'pista' || S.mode === 'pista')) { showError('Termina la registrazione per passare dalla pista alla strada.'); return; }
    S.mode = m; savePref(); showError(''); applyMode();
  };
  window.rideSetPerf = function(k) { S.perf = k; savePref(); perfReset(); applyMode(); };
  window.rideHud = function() {
    var ov = $('rd-overlay'), on = !ov.classList.contains('rd-hud');
    ov.classList.toggle('rd-hud', on);
    if (on) showError('');
  };

  /* ── Wake lock ───────────────────────────────────────────────── */
  function lockOn() { try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(function(w) { wakeLock = w; }).catch(function() {}); } catch (e) {} }
  function lockOff() { if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; } }
  document.addEventListener('visibilitychange', function() {
    if (S.state !== 'recording') return;
    if (document.visibilityState === 'visible') { if (!wakeLock) lockOn(); }
    else saveLive();   // il telefono può chiudere la pagina: salva subito
  });

  /* ── Uscita interrotta: salvataggio continuo e recupero ───────── */
  function saveLive() {
    if (!R) return; lastSave = Date.now();
    jset(LIVE, { savedTs: Date.now(), vid: R.vid, mode: S.mode, startTs: R.startTs, elapsedMs: R.elapsedMs + (S.state === 'recording' ? Date.now() - R.segStart : 0),
      movingMs: R.movingMs, distanceM: R.distanceM, maxKmh: R.maxKmh, laps: R.laps, track: A().semplifica(R.track, 800) });
  }
  function checkLive() {
    var L = jget(LIVE, null);
    if (!L || S.state !== 'idle') return;
    if (!L.track || L.distanceM < 500 || Date.now() - L.savedTs > 14 * 86400000) { localStorage.removeItem(LIVE); return; }
    var d = new Date(L.startTs);
    showError('Uscita interrotta del ' + ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + ' (' + (L.distanceM / 1000).toFixed(1).replace('.', ',') + ' km). ' +
      '<span class="rd-err-act"><button type="button" onclick="rideRecupera(true)">Salva nel diario</button><button type="button" onclick="rideRecupera(false)">Scarta</button></span>');
  }
  window.rideRecupera = function(salva) {
    var L = jget(LIVE, null); localStorage.removeItem(LIVE); showError('');
    if (!salva || !L) return;
    var id = salvaUscita({ vid: L.vid, startTs: L.startTs, elapsedMs: L.elapsedMs, movingMs: L.movingMs, distanceM: L.distanceM, maxKmh: L.maxKmh, laps: L.laps || [],
      track: L.track.map(function(p) { return { lat: p.lat, lng: p.lng, ts: p.ts, kmh: p.v, alt: p.a }; }) });
    if (id && window.hubRideLogOpen) window.hubRideLogOpen(id);
  };

  /* ── Salvataggio nel diario ──────────────────────────────────── */
  function salvaUscita(rec) {
    var km = rec.distanceM / 1000;
    if (km < 1 && !(rec.laps && rec.laps.length)) return null;
    var v = window.hubGarage && rec.vid ? window.hubGarage.list().filter(function(x) { return x.id === rec.vid; })[0] : null;
    var pts = rec.track.map(function(p) { return { lat: p.lat, lng: p.lng, ts: p.ts, v: p.kmh, a: p.alt }; });
    var cv = A().curve(pts), dl = A().dislivello(pts), ps = A().passi(pts);
    var mov = rec.movingMs || rec.elapsedMs;
    var entry = {
      id: 'rd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      vehicleId: v ? v.id : rec.vid, vehicleName: vName(v), vehicleType: v ? v.type : null,
      startTs: pts.length ? pts[0].ts : rec.startTs, endTs: pts.length ? pts[pts.length - 1].ts : Date.now(),
      elapsedMs: rec.elapsedMs, movingMs: mov, distanceKm: Math.round(km * 100) / 100,
      maxKmh: Math.round(rec.maxKmh), avgKmh: mov > 0 ? km / (mov / 3600000) : 0,
      leanSx: cv.leanSx, leanDx: cv.leanDx, gLat: cv.gLat,
      salita: dl ? dl.su : null, discesa: dl ? dl.giu : null, altMax: dl ? dl.max : null,
      passi: ps.map(function(p) { return p.name; }), laps: rec.laps && rec.laps.length ? rec.laps : undefined,
      points: A().semplifica(pts, 400), title: ''
    };
    var all = jget(RIDES, []); all.push(entry); jset(RIDES, all);
    if (window._hubRefreshRideLogBadge) window._hubRefreshRideLogBadge();
    return entry.id;
  }

  /* ── Comandi ─────────────────────────────────────────────────── */
  window.openRide = function() {
    inject();
    var v = veicolo();
    $('rd-veh').textContent = v ? vName(v) + ' · ' + (v.type === 'moto' ? 'Moto' : 'Auto') : 'Nessun veicolo attivo';
    $('rd-overlay').classList.add('visible');
    applyMode(); checkLive();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeRide = function() {
    if (S.state === 'recording' || S.state === 'paused') { if (!confirm('Terminare la registrazione?')) return; rideStop(); }
    $('rd-overlay').classList.remove('visible', 'rd-hud');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.rideStart = function() {
    if (!noGps && !('geolocation' in navigator)) { showError('GPS non disponibile sul dispositivo.'); return; }
    showError('');
    if (S.state === 'idle' || S.state === 'finished') { R = nuovaUscita(); perfReset(); S.savedId = null; localStorage.removeItem(LIVE); }
    R.segStart = Date.now(); R.last = null; R.fixes = 0;
    S.state = 'recording';
    setStatus('REC · attendo il GPS', true);
    if (S.mode === 'perf' && $('rd-gmeter') && $('rd-gmeter').style.display !== 'flex') startG();   // per il Max G della prova
    if (!noGps) watchId = navigator.geolocation.watchPosition(onPosition, function(err) {
      showError('GPS: ' + esc(err.message || err.code || 'errore') + ' · controlla che la posizione sia attiva e consentita.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    tickT = setInterval(tick, 200);
    lockOn(); applyMode();
  };
  function stopGps() {
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (tickT) { clearInterval(tickT); tickT = null; }
    lockOff();
  }
  window.ridePause = function() {
    if (S.state !== 'recording') return;
    R.elapsedMs += Date.now() - R.segStart; S.state = 'paused';
    setStatus('In pausa', false); stopGps(); saveLive(); renderActions();
  };
  window.rideStop = function() {
    if (!R) return;
    if (S.state === 'recording') R.elapsedMs += Date.now() - R.segStart;
    stopGps(); S.state = 'finished';
    var km = R.distanceM / 1000, mov = R.movingMs || R.elapsedMs;
    S.savedId = salvaUscita(R);
    localStorage.removeItem(LIVE);
    setStatus(S.savedId ? 'Salvata nel diario · media ' + (mov ? km / (mov / 3600000) : 0).toFixed(1).replace('.', ',') + ' km/h' : 'Troppo breve per il diario (sotto 1 km)', false);
    renderActions();
    if (S.savedId && window.hubRideLogOpen) window.hubRideLogOpen(S.savedId);
  };
  window.rideReset = function() {
    stopGps(); S.state = 'idle'; R = null; S.savedId = null; perfReset();
    ['rd-speed', 'rd-avg', 'rd-max'].forEach(function(id) { $(id).textContent = '0'; });
    $('rd-time').textContent = '00:00'; $('rd-dist').textContent = '0.0'; $('rd-tot').textContent = 'in movimento'; $('rd-sub').textContent = '';
    $('rd-gps').textContent = 'GPS —'; $('rd-gps').className = 'rd-gps';
    setStatus('In attesa', false); showError(''); applyMode();
  };
  window.rideExport = function() {
    if (!R || !R.track.length) { alert('Nessun punto GPS registrato.'); return; }
    var name = vName(veicolo()) + ' Ride';
    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AutoHub" xmlns="http://www.topografix.com/GPX/1/1">\n' +
      '  <metadata><name>' + esc(name) + '</name><time>' + new Date(R.track[0].ts).toISOString() + '</time></metadata>\n  <trk><name>' + esc(name) + '</name><trkseg>\n' +
      R.track.map(function(p) {
        return '    <trkpt lat="' + p.lat.toFixed(6) + '" lon="' + p.lng.toFixed(6) + '">' + (p.alt != null && !isNaN(p.alt) ? '<ele>' + p.alt.toFixed(1) + '</ele>' : '') +
          '<time>' + new Date(p.ts).toISOString() + '</time>' + (p.kmh != null ? '<extensions><speed>' + (p.kmh / 3.6).toFixed(2) + '</speed></extensions>' : '') + '</trkpt>';
      }).join('\n') + '\n  </trkseg></trk>\n</gpx>';
    var url = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' })), a = document.createElement('a');
    a.href = url; a.download = 'autohub-ride-' + new Date(R.track[0].ts).toISOString().replace(/[:.]/g, '-').slice(0, 16) + '.gpx';
    document.body.appendChild(a); a.click(); setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 100);
  };

  // Per i test: posizioni simulate senza GPS reale
  window._rdInternals = { feed: onPosition, noGps: function(b) { noGps = b; }, state: function() { return { S: S, R: R, P: P }; }, PERF: PERF };

  document.addEventListener('DOMContentLoaded', function() { setTimeout(inject, 400); });
})();
