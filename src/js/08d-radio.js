/* ═══════════════════════════════════════════════════════════════════
   HUB RADIO — radio in diretta dentro l'app (Ride e HUD)
   Stazioni: Radio Browser (radio-browser.info), solo stream https.
   Titolo in onda: Worker /api/icy (metadati ICY), ogni 20 s mentre suona.
   Dati: hub_radio_lista_v1 (elenco, 7 giorni), hub_radio_pref_v1 (preferite, ultima)
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var LISTA = 'hub_radio_lista_v1', PREF = 'hub_radio_pref_v1';
  var MIRROR = ['https://de1.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://de2.api.radio-browser.info'];
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  var audio = null, cur = null, title = null, playing = false, icyT = null, errore = '', found = [], ultimo = '';

  function rb(path) {
    var i = 0;
    var go = function() {
      return fetch(MIRROR[i] + path, { headers: { Accept: 'application/json' } }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function(e) { if (++i < MIRROR.length) return go(); throw e; });
    };
    return go();
  }
  function pulisci(list) {
    var seen = {};
    return (list || []).filter(function(s) {
      var u = s.url_resolved || s.url || '';
      if (!/^https:/.test(u) || !s.name) return false;
      var k = s.name.trim().toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true;
    }).map(function(s) {
      return { id: s.stationuuid, name: s.name.trim(), url: s.url_resolved || s.url, img: /^https:/.test(s.favicon || '') ? s.favicon : '',
        tags: (s.tags || '').split(',').filter(Boolean).slice(0, 3).join(' · '), br: s.bitrate || 0 };
    });
  }
  // stazioni italiane più ascoltate (in memoria per 7 giorni) o ricerca per nome
  function stazioni(q) {
    if (!q) {
      var c = jget(LISTA, null);
      if (c && Date.now() - c.ts < 7 * 86400000 && c.list.length) return Promise.resolve(c.list);
      return rb('/json/stations/search?countrycode=IT&is_https=true&hidebroken=true&order=clickcount&reverse=true&limit=80').then(function(d) {
        var l = pulisci(d).slice(0, 50); jset(LISTA, { ts: Date.now(), list: l }); return l;
      });
    }
    return rb('/json/stations/search?is_https=true&hidebroken=true&order=clickcount&reverse=true&limit=30&name=' + encodeURIComponent(q)).then(function(d) { return pulisci(d).slice(0, 20); });
  }

  /* ── Riproduzione ─────────────────────────────────────────────── */
  function play(st) {
    if (!audio) {
      audio = new Audio(); audio.preload = 'none';
      audio.addEventListener('playing', function() { playing = true; errore = ''; aggiorna(); });
      audio.addEventListener('pause', function() { playing = false; aggiorna(); });
      audio.addEventListener('error', function() { if (!cur) return; playing = false; errore = cur.name + ' non è raggiungibile ora: prova un\'altra stazione.'; aggiorna(); lista(); });
    }
    cur = st; title = null; errore = '';
    audio.src = st.url;
    var p = audio.play(); if (p && p.catch) p.catch(function(e) { if (e && e.name === 'NotAllowedError') { errore = 'Tocca di nuovo la stazione per avviare l\'audio.'; aggiorna(); } });
    var pref = jget(PREF, {}); pref.ultima = st; jset(PREF, pref);
    try { fetch(MIRROR[0] + '/json/url/' + st.id).catch(function() {}); } catch (e) {}   // conteggio ascolti, come chiede Radio Browser
    clearInterval(icyT); icy(); icyT = setInterval(icy, 20000);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('pause', function() { toggle(); });
      navigator.mediaSession.setActionHandler('play', function() { toggle(); });
      navigator.mediaSession.setActionHandler('stop', function() { stop(); });
    }
    aggiorna();
  }
  function toggle() { if (!audio || !cur) return; if (audio.paused) { audio.src = cur.url; audio.play().catch(function() {}); } else { audio.pause(); audio.removeAttribute('src'); audio.load(); } }
  function stop() { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } cur = null; title = null; playing = false; clearInterval(icyT); aggiorna(); lista(); }
  function icy() {
    if (!cur || typeof WORKER === 'undefined') return;
    var u = cur.url;
    fetch(WORKER + '/api/icy?url=' + encodeURIComponent(u)).then(function(r) { return r.ok ? r.json() : {}; }).then(function(d) {
      if (!cur || cur.url !== u) return;
      var t = d && d.title && d.title.toLowerCase() !== cur.name.toLowerCase() && !/^(-|unknown|\s*)$/i.test(d.title) ? d.title : null;
      if (t !== title) { title = t; aggiorna(); }
    }).catch(function() {});
  }
  function aggiorna() {
    if ('mediaSession' in navigator && cur && typeof MediaMetadata !== 'undefined') {
      var sp = (title || '').split(' - ');
      navigator.mediaSession.metadata = new MediaMetadata({ title: sp.length > 1 ? sp.slice(1).join(' - ') : title || cur.name, artist: sp.length > 1 ? sp[0] : 'Radio in diretta', album: cur.name, artwork: cur.img ? [{ src: cur.img }] : [] });
    }
    if (window.hubMusica && window.hubMusica.render) window.hubMusica.render();
    var on = document.querySelectorAll('.rd-ra-st');
    on.forEach(function(el) { el.classList.toggle('on', !!cur && el.dataset.id === cur.id); });
  }
  // cosa mostrare nella Ride/HUD: "Artista - Titolo" diviso, altrimenti il nome della stazione
  function np() {
    if (!cur) return null;
    var sp = (title || '').split(' - ');
    return { src: 'radio', live: true, playing: playing, img: cur.img,
      title: title ? (sp.length > 1 ? sp.slice(1).join(' - ') : title) : cur.name,
      artist: title ? (sp.length > 1 ? sp[0] + ' · ' : '') + cur.name : (playing ? 'In diretta' : 'In pausa') };
  }

  /* ── Pannello stazioni ────────────────────────────────────────── */
  function riga(s) {
    var fav = (jget(PREF, {}).fav || []).some(function(f) { return f.id === s.id; });
    return '<div class="rd-ra-st' + (cur && cur.id === s.id ? ' on' : '') + '" data-id="' + esc(s.id) + '">' +
      '<button type="button" class="rd-ra-play" data-id="' + esc(s.id) + '">' + (s.img ? '<img src="' + esc(s.img) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '<span>📻</span></button>' +
      '<button type="button" class="rd-ra-name" data-id="' + esc(s.id) + '">' + esc(s.name) + (s.tags ? '<small>' + esc(s.tags) + '</small>' : '') + '</button>' +
      '<button type="button" class="rd-ra-fav' + (fav ? ' on' : '') + '" data-fav="' + esc(s.id) + '" aria-label="' + (fav ? 'Togli dalle preferite' : 'Aggiungi alle preferite') + '">' + (fav ? '★' : '☆') + '</button></div>';
  }
  function lista() {
    var box = document.getElementById('rd-ra-list'); if (!box) return;
    var pref = jget(PREF, {}), fav = pref.fav || [];
    var html = (errore ? '<p class="rd-perf-note rd-ra-err">' + esc(errore) + '</p>' : '') +
      (cur ? '<div class="rd-ra-now"><span>▶ ' + esc(cur.name) + (title ? ' · ' + esc(title) : '') + '</span><button type="button" onclick="hubRadio.stop()">⏹ Stop</button></div>' : '');
    if (fav.length && !ultimo) html += '<div class="rd-ra-h">Preferite</div>' + fav.map(riga).join('');
    html += '<div class="rd-ra-h">' + (ultimo ? 'Risultati' : 'Più ascoltate in Italia') + '</div>' +
      (found.length ? found.filter(function(s) { return ultimo || !fav.some(function(f) { return f.id === s.id; }); }).map(riga).join('') : '<p class="rd-perf-note">' + (S_load ? 'Carico le stazioni…' : 'Nessuna stazione trovata.') + '</p>');
    box.innerHTML = html;
  }
  var S_load = false, cercaT = null;
  function carica(q) {
    ultimo = q || ''; S_load = true; lista();
    stazioni(ultimo).then(function(l) { if ((q || '') !== ultimo) return; found = l; S_load = false; lista(); })
      .catch(function() { S_load = false; found = []; errore = 'Elenco stazioni non raggiungibile: controlla la connessione.'; lista(); });
  }
  function trova(id) {
    var all = found.concat(jget(PREF, {}).fav || []); if (cur) all.push(cur);
    return all.filter(function(s) { return s.id === id; })[0];
  }
  function pannello(el) {
    el.innerHTML = '<input type="search" id="rd-ra-q" class="rd-np-in" placeholder="Cerca una radio (es. Virgin, Deejay, RTL)" autocomplete="off">' +
      '<div class="rd-ra-list" id="rd-ra-list"></div>' +
      '<p class="rd-perf-note">Stazioni da radio-browser.info. Il titolo del brano compare solo se la radio lo trasmette nello stream.</p>';
    var q = document.getElementById('rd-ra-q');
    q.addEventListener('input', function() { clearTimeout(cercaT); cercaT = setTimeout(function() { carica(q.value.trim()); }, 400); });
    document.getElementById('rd-ra-list').addEventListener('click', function(e) {
      var f = e.target.closest('[data-fav]');
      if (f) {
        var s = trova(f.dataset.fav), pref = jget(PREF, {}), fav = pref.fav || [];
        if (fav.some(function(x) { return x.id === s.id; })) fav = fav.filter(function(x) { return x.id !== s.id; }); else if (s) fav.unshift(s);
        pref.fav = fav.slice(0, 20); jset(PREF, pref); lista(); return;
      }
      var b = e.target.closest('[data-id]');
      if (b) { var st = trova(b.dataset.id); if (st) { if (cur && cur.id === st.id && playing) return; play(st); lista(); } }
    });
    carica('');
  }

  window.hubRadio = { pannello: pannello, play: play, stop: stop, toggle: toggle, np: np, _stato: function() { return { cur: cur, title: title, playing: playing }; }, _icy: icy };
})();
