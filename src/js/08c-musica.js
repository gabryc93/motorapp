/* ═══════════════════════════════════════════════════════════════════
   HUB MUSICA — brano in ascolto su Spotify nella Ride e nell'HUD
   Spotify Web API con OAuth PKCE (nessun segreto nell'app): l'utente
   crea una sua app su developer.spotify.com e incolla qui il Client ID.
   Apple Music, Amazon Music e le app radio non permettono a una pagina
   web di leggere cosa stanno suonando: non sono supportate.
   Dati: hub_spotify_v1 { clientId, access, refresh, exp }
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var KEY = 'hub_spotify_v1', PKCE = 'hub_spotify_pkce_v1';
  var SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';
  var ACC = 'https://accounts.spotify.com', API = 'https://api.spotify.com/v1';
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function redirectUri() { return location.origin + location.pathname; }

  var NP = null, lastPoll = 0, polling = false, noCtrl = false, errTxt = '';

  /* ── PKCE ─────────────────────────────────────────────────────── */
  function b64url(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function verifier() { var a = new Uint8Array(48); crypto.getRandomValues(a); return b64url(a); }
  function challenge(v) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(b64url); }

  function collega(clientId) {
    clientId = String(clientId || '').trim();
    if (!/^[0-9a-f]{32}$/i.test(clientId)) return Promise.reject(new Error('Il Client ID è di 32 caratteri (lettere a-f e numeri).'));
    var v = verifier(), st = verifier().slice(0, 16);
    jset(PKCE, { v: v, st: st, clientId: clientId, back: 'ride' });
    return challenge(v).then(function(ch) {
      location.href = ACC + '/authorize?response_type=code&client_id=' + clientId + '&scope=' + encodeURIComponent(SCOPES) +
        '&redirect_uri=' + encodeURIComponent(redirectUri()) + '&code_challenge_method=S256&code_challenge=' + ch + '&state=' + st;
    });
  }
  function token(body) {
    return fetch(ACC + '/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() })
      .then(function(r) { return r.json().then(function(d) { if (!r.ok) throw new Error(d.error_description || d.error || 'HTTP ' + r.status); return d; }); });
  }
  function salva(clientId, d, old) {
    var t = { clientId: clientId, access: d.access_token, refresh: d.refresh_token || (old && old.refresh), exp: Date.now() + (d.expires_in || 3600) * 1000 - 60000 };
    jset(KEY, t); return t;
  }
  // ritorno da Spotify: ?code=…&state=…
  function ritorno() {
    var q = new URLSearchParams(location.search), code = q.get('code'), st = q.get('state'), err = q.get('error');
    var P = jget(PKCE, null);
    if (!P || !st || st !== P.st) return;
    localStorage.removeItem(PKCE);
    history.replaceState(null, '', location.pathname + location.hash);
    var riapri = function() { if (P.back === 'ride' && window.openRide) setTimeout(function() { window.openRide(); }, 600); };
    if (err || !code) { errTxt = err === 'access_denied' ? 'Collegamento annullato.' : 'Spotify ha risposto: ' + (err || 'errore'); riapri(); return; }
    token({ grant_type: 'authorization_code', code: code, redirect_uri: redirectUri(), client_id: P.clientId, code_verifier: P.v })
      .then(function(d) { salva(P.clientId, d); errTxt = ''; poll(true); })
      .catch(function(e) { errTxt = 'Collegamento non riuscito: ' + e.message; })
      .then(riapri);
  }
  function accesso() {
    var t = jget(KEY, null);
    if (!t || !t.access) return Promise.resolve(null);
    if (Date.now() < t.exp) return Promise.resolve(t);
    if (!t.refresh) return Promise.resolve(null);
    return token({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: t.clientId }).then(function(d) { return salva(t.clientId, d, t); })
      .catch(function(e) { if (/invalid_grant|revoked/i.test(e.message)) { localStorage.removeItem(KEY); errTxt = 'Collegamento Spotify scaduto: ricollegalo.'; } return null; });
  }
  function api(method, path) {
    return accesso().then(function(t) {
      if (!t) return { status: 0 };
      return fetch(API + path, { method: method, headers: { Authorization: 'Bearer ' + t.access } }).then(function(r) {
        if (r.status === 401) { var x = jget(KEY, {}); x.exp = 0; jset(KEY, x); }
        if (r.status === 204 || method !== 'GET') return { status: r.status };
        return r.json().then(function(d) { return { status: r.status, d: d }; }, function() { return { status: r.status }; });
      });
    });
  }

  /* ── Brano in ascolto ────────────────────────────────────────── */
  function poll(force) {
    if (polling || !jget(KEY, null)) return Promise.resolve();
    var ov = $('rd-overlay');
    if (!force && (!ov || !ov.classList.contains('visible') || document.visibilityState !== 'visible')) return Promise.resolve();
    polling = true; lastPoll = Date.now();
    return api('GET', '/me/player/currently-playing?additional_types=episode').then(function(r) {
      if (r.status === 200 && r.d && r.d.item) {
        var it = r.d.item, img = (it.album && it.album.images) || it.images || (it.show && it.show.images) || [];
        NP = { title: it.name, artist: it.artists ? it.artists.map(function(a) { return a.name; }).join(', ') : it.show ? it.show.name : '',
          img: img.length ? img[img.length > 1 ? img.length - 2 : 0].url : null, playing: !!r.d.is_playing, pos: r.d.progress_ms || 0, dur: it.duration_ms || 0, at: Date.now() };
      } else if (r.status === 204 || r.status === 200) NP = null;
      else if (r.status === 429) lastPoll = Date.now() + 25000;   // quota: rallenta
      render();
    }).catch(function() {}).then(function() { polling = false; });
  }
  function fmt(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function render() {
    var el = $('rd-np'); if (!el) return;
    var R = window.hubRadio && window.hubRadio.np();   // la radio dell'app ha la precedenza
    var cur = R || (jget(KEY, null) ? NP : null);
    if (!cur) { el.hidden = true; el.innerHTML = ''; el.dataset.k = ''; return; }
    var pos = cur.live ? 0 : cur.playing ? Math.min(cur.dur, cur.pos + (Date.now() - cur.at)) : cur.pos, pct = !cur.live && cur.dur ? pos / cur.dur * 100 : 0;
    var ctl = cur.live ? '<div class="rd-np-ctl"><button type="button" onclick="hubRadio.toggle()" aria-label="' + (cur.playing ? 'Pausa' : 'Riproduci') + '">' + (cur.playing ? '⏸' : '▶') + '</button>' +
        '<button type="button" onclick="hubRadio.stop()" aria-label="Spegni la radio">⏹</button></div>'
      : noCtrl ? '' : '<div class="rd-np-ctl"><button type="button" onclick="hubMusica.cmd(\'previous\')" aria-label="Brano precedente">⏮</button>' +
        '<button type="button" onclick="hubMusica.cmd(\'' + (cur.playing ? 'pause' : 'play') + '\')" aria-label="' + (cur.playing ? 'Pausa' : 'Riproduci') + '">' + (cur.playing ? '⏸' : '▶') + '</button>' +
        '<button type="button" onclick="hubMusica.cmd(\'next\')" aria-label="Brano successivo">⏭</button></div>';
    var html = (cur.img ? '<img class="rd-np-art" src="' + esc(cur.img) + '" alt="" onerror="this.outerHTML=\'<div class=&quot;rd-np-art rd-np-noart&quot;>' + (cur.live ? '📻' : '♪') + '</div>\'">' : '<div class="rd-np-art rd-np-noart">' + (cur.live ? '📻' : '♪') + '</div>') +
      '<div class="rd-np-txt"><div class="rd-np-t">' + esc(cur.title) + '</div><div class="rd-np-a">' + (cur.live ? '<b class="rd-np-live">LIVE</b> ' : '') + esc(cur.artist) + '</div>' +
      (cur.live ? '' : '<div class="rd-np-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>') + '</div>' + ctl;
    el.hidden = false; el.classList.toggle('paused', !cur.playing);
    // aggiorna solo la barra se il brano è lo stesso, così i pulsanti non si ricreano a ogni secondo
    var k = cur.src + '|' + cur.title + '|' + cur.artist + '|' + cur.playing + '|' + noCtrl;
    if (el.dataset.k === k) { var b = el.querySelector('.rd-np-bar i'); if (b) b.style.width = pct.toFixed(1) + '%'; return; }
    el.dataset.k = k; el.innerHTML = html;
  }
  function cmd(c) {
    var m = c === 'pause' || c === 'play' ? 'PUT' : 'POST';
    api(m, '/me/player/' + c).then(function(r) {
      if (r.status === 403) { noCtrl = true; errTxt = 'Comandi non disponibili (servono Spotify Premium e i permessi dell\'app): resta la visualizzazione.'; }
      if (NP && (c === 'pause' || c === 'play')) { NP.playing = c === 'play'; NP.at = Date.now(); }
      render(); setTimeout(function() { poll(); }, 700);
    });
  }

  /* ── Impostazioni (pannello nella Ride) ───────────────────────── */
  var tab = null;
  function setup(t2) {
    var box = $('rd-perf-result-inner'); if (!box) return;
    var t = jget(KEY, null), ruri = redirectUri();
    tab = t2 || tab || (t ? 'spotify' : 'radio');
    var tabs = '<div class="rd-mu-tabs" role="tablist"><button type="button" role="tab" class="rd-chip' + (tab === 'radio' ? ' on' : '') + '" onclick="hubMusica.setup(\'radio\')">📻 Radio</button>' +
      '<button type="button" role="tab" class="rd-chip' + (tab === 'spotify' ? ' on' : '') + '" onclick="hubMusica.setup(\'spotify\')">Spotify</button></div>';
    if (tab === 'radio' && window.hubRadio) {
      box.innerHTML = '<div class="rd-perf-result-title">Musica nell\'HUD</div>' + tabs + '<div id="rd-ra-box"></div>' +
        '<div class="rd-perf-result-actions"><button class="rd-perf-again" onclick="ridePerfClose()">Chiudi</button></div>';
      window.hubRadio.pannello($('rd-ra-box'));
      $('rd-perf-result').classList.add('visible');
      return;
    }
    box.innerHTML = '<div class="rd-perf-result-title">Musica nell\'HUD</div>' + tabs +
      (t ? '<p class="rd-perf-note rd-np-ok">✓ Spotify collegato. Il brano compare sotto i dati della Ride e nell\'HUD.</p>' +
           '<div class="rd-perf-result-actions"><button class="rd-perf-close" onclick="hubMusica.scollega()">Scollega</button><button class="rd-perf-again" onclick="ridePerfClose()">Chiudi</button></div>'
         : '<p class="rd-perf-note">Si collega <b>Spotify</b> con una tua app sviluppatore gratuita (2 minuti, una volta sola). Serve un account <b>Premium</b>.</p>' +
           '<ol class="rd-np-steps"><li>Apri <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> e accedi.</li>' +
           '<li><b>Create app</b>: nome a piacere, API <b>Web API</b>, Redirect URI:<br><code id="rd-np-uri">' + esc(ruri) + '</code> <button type="button" class="rd-np-copy" onclick="hubMusica.copia()">Copia</button></li>' +
           '<li>Nelle impostazioni dell\'app copia il <b>Client ID</b> e incollalo qui.</li></ol>' +
           '<input id="rd-np-cid" class="rd-np-in" placeholder="Client ID (32 caratteri)" autocomplete="off" spellcheck="false" value="' + esc((jget(PKCE, {}) || {}).clientId || '') + '">' +
           '<p class="rd-perf-note" id="rd-np-err" role="alert">' + esc(errTxt) + '</p>' +
           '<div class="rd-perf-result-actions"><button class="rd-perf-close" onclick="ridePerfClose()">Annulla</button><button class="rd-perf-again" onclick="hubMusica.vai()">Collega Spotify</button></div>') +
      '<p class="rd-perf-note">Apple Music, Amazon Music e le app radio esterne non permettono a una pagina web di leggere il brano in riproduzione, quindi non possono comparire qui.</p>';
    $('rd-perf-result').classList.add('visible');
  }

  window.hubMusica = {
    setup: setup, cmd: cmd, poll: poll, render: render,
    vai: function() {
      var s = window._rdInternals && window._rdInternals.state && window._rdInternals.state().S;
      if (s && (s.state === 'recording' || s.state === 'paused')) { $('rd-np-err').textContent = 'Termina la Ride prima di collegare: la pagina si ricarica.'; return; }
      collega($('rd-np-cid').value).catch(function(e) { $('rd-np-err').textContent = e.message; });
    },
    scollega: function() { localStorage.removeItem(KEY); NP = null; noCtrl = false; render(); setup('spotify'); },
    copia: function() { try { navigator.clipboard.writeText(redirectUri()); } catch (e) {} var b = document.querySelector('.rd-np-copy'); if (b) b.textContent = 'Copiato'; },
    collegato: function() { return !!jget(KEY, null); },
    _challenge: challenge, _ritorno: ritorno, _np: function() { return NP; }
  };

  // ogni secondo la barra avanza; ogni 5 s (solo con la Ride aperta e lo schermo acceso) chiede il brano
  setInterval(function() { if (NP && NP.playing) render(); if (Date.now() - lastPoll > 5000 && !(window.hubRadio && window.hubRadio.np())) poll(); }, 1000);
  document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') poll(); });
  if (/[?&]state=/.test(location.search)) ritorno();
})();
