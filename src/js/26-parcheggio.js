/* ═══════════════════════════════════════════════════════════════════
   HUB PARCHEGGIO — "dove ho lasciato l'auto"
   · posizione GPS, foto del posto (piano, colonna, cartello), nota
   · scadenza di disco orario, strisce blu o ticket: conto alla rovescia in
     Oggi e promemoria nel calendario del telefono (.ics con avviso)
   · "Portami all'auto" a piedi con Mappe / Google Maps
   Dati: hub_parcheggio_v1 {lat, lng, acc, ts, vid, nota, scad, foto} · foto in IDB (hubDocs, id "park")
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var KEY = 'hub_parcheggio_v1', FOTO = 'park-foto';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function set(p) { try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY); } catch (e) {} }
  function hhmm(ts) { return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }
  function quando(ts) {
    var d = new Date(ts), oggi = new Date(); oggi.setHours(0, 0, 0, 0);
    var g = Math.round((new Date(d).setHours(0, 0, 0, 0) - oggi) / 86400000);
    return (g === 0 ? 'oggi' : g === -1 ? 'ieri' : g === 1 ? 'domani' : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })) + ' alle ' + hhmm(ts);
  }
  function dist(a, b) {
    var R = 6371000, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function mancano(scad) {
    var m = Math.round((scad - Date.now()) / 60000);
    if (m < 0) return 'scaduto da ' + (-m < 60 ? -m + ' min' : Math.floor(-m / 60) + ' h ' + (-m % 60) + ' min');
    return m < 60 ? 'tra ' + m + ' min' : 'tra ' + Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '');
  }
  var iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function navUrl(p) {
    return iOS ? 'https://maps.apple.com/?daddr=' + p.lat + ',' + p.lng + '&dirflg=w' : 'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=' + p.lat + ',' + p.lng;
  }
  // promemoria nel calendario del telefono: file .ics con avviso 10 minuti prima
  function ics(p) {
    var f = function(ts) { return new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AutoHub//Parcheggio//IT', 'BEGIN:VEVENT', 'UID:park-' + p.ts + '@autohub', 'DTSTAMP:' + f(Date.now()),
      'DTSTART:' + f(p.scad - 600000), 'DTEND:' + f(p.scad), 'SUMMARY:🅿 Sposta l\'auto (scade alle ' + hhmm(p.scad) + ')',
      'DESCRIPTION:' + (p.nota ? p.nota.replace(/[,;\n]/g, ' ') + ' — ' : '') + 'https://maps.google.com/?q=' + p.lat + '\\,' + p.lng,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Parcheggio in scadenza', 'TRIGGER:-PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
    a.href = url; a.download = 'parcheggio.ics'; document.body.appendChild(a); a.click();
    setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 300);
  }

  var stato = { msg: '', pos: null, foto: null, fotoNuova: null };
  function inject() {
    if ($('pk-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'pk-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'pk-title');
    ov.innerHTML = '<div class="mt-hdr"><h2 id="pk-title">PARCHEGGIO<small id="pk-veh">dove hai lasciato l\'auto</small></h2><button class="gar-close" onclick="closeParcheggio()">✕ Chiudi</button></div><div class="mt-body" id="pk-body"></div>';
    document.body.appendChild(ov);
  }
  function scadForm(p) {
    var opz = [[0, 'Nessuna'], [30, '30 min'], [60, '1 ora'], [90, '1 h 30'], [120, '2 ore'], [180, '3 ore']];
    return '<div class="gar-field"><label>Scade (disco orario, strisce blu, ticket)</label><div class="pk-scad">' +
      opz.map(function(o) { return '<button type="button" onclick="pkScad(' + o[0] + ')"' + (p && !p.scad && !o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') +
      '<input type="time" id="pk-ora" aria-label="Oppure alle ore" value="' + (p && p.scad ? hhmm(p.scad) : '') + '" onchange="pkOra()"></div></div>';
  }
  function render() {
    var b = $('pk-body'); if (!b) return;
    var p = get(), html = '';
    if (!p) {
      html += '<p class="mt-int-nota">Salva il posto quando scendi dall\'auto: ti riporto lì a piedi, ti ricordo quando scade il disco o il ticket e, in un garage, la foto ti dice piano e colonna.</p>' +
        '<button type="button" class="pk-big" onclick="pkQui()">📍 Ho parcheggiato qui</button>';
    } else {
      var v = (window.hubGarage ? window.hubGarage.list() : []).filter(function(x) { return x.id === p.vid; })[0];
      var d = stato.pos ? dist(stato.pos, p) : null;
      html += '<div class="mt-card pk-card"><div class="pk-h"><b>' + (v ? esc(v.customName || (v.marca + ' ' + v.modello)) : 'La tua auto') + '</b><small>parcheggiata ' + quando(p.ts) + (p.acc > 60 ? ' · posizione approssimativa (±' + Math.round(p.acc) + ' m)' : '') + '</small></div>' +
        (p.scad ? '<div class="pk-scadbox' + (p.scad < Date.now() ? ' crit' : p.scad - Date.now() < 900000 ? ' warn' : '') + '">⏱ Scade alle <b>' + hhmm(p.scad) + '</b> · ' + mancano(p.scad) + '</div>' : '') +
        '<div id="pk-foto" class="pk-foto">' + (stato.foto ? '<img src="' + stato.foto + '" alt="Foto del parcheggio">' : '') + '</div>' +
        (p.nota ? '<p class="pk-nota">📝 ' + esc(p.nota) + '</p>' : '') +
        (d != null ? '<p class="pk-dist">Sei a ' + (d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km') + ' dall\'auto · circa ' + Math.max(1, Math.round(d / 80)) + ' min a piedi</p>' : '') +
        '<a class="pk-big" href="' + navUrl(p) + '" target="_blank" rel="noopener">🚶 Portami all\'auto</a></div>' +
        scadForm(p) +
        (p.scad && p.scad > Date.now() ? '<button type="button" class="og-btn og-ghost pk-ics" onclick="pkIcs()">🔔 Promemoria nel calendario</button>' : '') +
        '<div class="gar-field"><label>Nota</label><input id="pk-nota" maxlength="80" value="' + esc(p.nota || '') + '" placeholder="Es. piano -2, colonna B14" onchange="pkNota()"></div>' +
        '<div class="gar-field"><label>Foto del posto</label><input type="file" id="pk-file" accept="image/*" capture="environment" onchange="pkFoto(event)"></div>' +
        '<div class="gar-edit-btns"><button type="button" class="gar-cancel" onclick="pkQui()">📍 Aggiorna posizione</button><button type="button" class="gar-save" onclick="pkPreso()">✓ Ho ripreso l\'auto</button></div>';
    }
    html += '<div class="hub-bk-msg" role="status">' + esc(stato.msg) + '</div>';
    b.innerHTML = html;
  }
  function posizione() {
    return new Promise(function(ok, ko) {
      if (!navigator.geolocation) return ko(new Error('posizione non disponibile'));
      navigator.geolocation.getCurrentPosition(function(x) { ok({ lat: x.coords.latitude, lng: x.coords.longitude, acc: x.coords.accuracy }); }, function(e) { ko(new Error(e.message || 'posizione negata')); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }
  window.pkQui = function() {
    stato.msg = 'Prendo la posizione…'; render();
    posizione().then(function(x) {
      var old = get(), v = window.hubGarage && window.hubGarage.active();
      set({ lat: x.lat, lng: x.lng, acc: x.acc, ts: old ? old.ts : Date.now(), vid: old ? old.vid : v && v.id, nota: old ? old.nota : '', scad: old ? old.scad : null });
      stato.pos = x; stato.msg = old ? 'Posizione aggiornata' : 'Parcheggio salvato'; render();
    }, function(e) { stato.msg = 'Non riesco a prendere la posizione: ' + e.message; render(); });
  };
  window.pkScad = function(min) {
    var p = get(); if (!p) return;
    p.scad = min ? Date.now() + min * 60000 : null; set(p); stato.msg = min ? 'Ti ricordo la scadenza in Oggi' : ''; render(); oggi();
  };
  window.pkOra = function() {
    var p = get(), v = $('pk-ora').value; if (!p || !v) return;
    var d = new Date(); d.setHours(+v.split(':')[0], +v.split(':')[1], 0, 0);
    if (d < Date.now() - 60000) d.setDate(d.getDate() + 1);
    p.scad = d.getTime(); set(p); render(); oggi();
  };
  window.pkNota = function() { var p = get(); if (!p) return; p.nota = $('pk-nota').value.trim(); set(p); render(); };
  window.pkIcs = function() { var p = get(); if (p && p.scad) ics(p); };
  window.pkFoto = function(ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    var salva = function(d) { stato.foto = d; if (window.hubDocs) window.hubDocs.put(FOTO, d, 'image/jpeg'); var p = get(); if (p) { p.foto = true; set(p); } render(); };
    if (typeof window._hubCompressImage === 'function') window._hubCompressImage(f, 1200).then(salva);
    else { var r = new FileReader(); r.onload = function(e) { salva(e.target.result); }; r.readAsDataURL(f); }
  };
  window.pkPreso = function() {
    set(null); stato.foto = null; stato.msg = '';
    if (window.hubDocs) try { window.hubDocs.del(FOTO); } catch (e) {}
    render(); oggi();
  };
  function oggi() { if (window._oggiInternals && document.body.dataset.hub === 'oggi') window._oggiInternals.render(); }
  window.openParcheggio = function() {
    inject(); stato.msg = ''; stato.foto = null;
    $('pk-overlay').classList.add('visible'); render();
    var p = get();
    if (p && p.foto && window.hubDocs) window.hubDocs.get(FOTO).then(function(d) { if (d) { stato.foto = d.dataUrl; render(); } });
    if (p) posizione().then(function(x) { stato.pos = x; render(); }, function() {});
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeParcheggio = function() { var o = $('pk-overlay'); if (o) o.classList.remove('visible'); if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility(); };
  // per Oggi
  window.hubParcheggio = function() { var p = get(); return p ? { ts: p.ts, scad: p.scad, nota: p.nota, testo: p.scad ? 'scade alle ' + hhmm(p.scad) + ' (' + mancano(p.scad) + ')' : 'da ' + quando(p.ts), scaduto: p.scad && p.scad < Date.now() } : null; };
  // aggiorna il conto alla rovescia mentre il pannello è aperto
  setInterval(function() { var o = $('pk-overlay'); if (o && o.classList.contains('visible') && get() && get().scad && !(document.activeElement && o.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) render(); }, 30000);
})();
