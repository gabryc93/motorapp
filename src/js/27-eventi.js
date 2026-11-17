/* ═══════════════════════════════════════════════════════════════════
   HUB EVENTI — eventi per appassionati vicino a te
   · calendari degli autodromi (Worker /api/eventi, cache 12 ore): gare,
     track day, tour in pista; le date ripetute diventano una sola voce
   · i tuoi eventi (raduni, cars & coffee, mostre) aggiunti a mano
   · "Aggiungi al calendario" (.ics) e indicazioni stradali
   · in Oggi, dal giovedì: cosa c'è nel weekend
   Dati: hub_eventi_cache_v1 {ts, eventi} · hub_eventi_miei_v1 [{id, titolo, inizio, luogo, url, note}]
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var CK = 'hub_eventi_cache_v1', MK = 'hub_eventi_miei_v1', TTL = 12 * 3600000;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function dt(s) { return new Date(String(s).replace(' ', 'T')); }
  function giorno(d) { return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function ora(d) { return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }
  function km(a, b) {
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function scarica(forza) {
    var c = jget(CK, null);
    if (!forza && c && Date.now() - c.ts < TTL) return Promise.resolve(c.eventi);
    var w = typeof WORKER !== 'undefined' ? WORKER : 'https://osservaprezzi.gabrycois.workers.dev';
    return fetch(w + '/api/eventi').then(function(r) { return r.json().then(function(j) { if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status); return j; }); })
      .then(function(j) { jset(CK, { ts: Date.now(), eventi: j.eventi || [] }); return j.eventi || []; })
      .catch(function(e) { if (c) return c.eventi; throw e; });
  }
  // stesse date ripetute (es. tour quotidiani) → una voce con il periodo
  function raggruppa(list) {
    var g = {}, out = [];
    list.forEach(function(e) { var k = e.titolo + '|' + e.luogo; (g[k] = g[k] || []).push(e); });
    Object.keys(g).forEach(function(k) {
      var xs = g[k].sort(function(a, b) { return a.inizio.localeCompare(b.inizio); });
      if (xs.length >= 3) out.push(Object.assign({}, xs[0], { fine: xs[xs.length - 1].fine, date: xs.length, ripetuto: true }));
      else xs.forEach(function(e) { out.push(e); });
    });
    return out.sort(function(a, b) { return a.inizio.localeCompare(b.inizio); });
  }
  function miei() { return jget(MK, []).filter(function(e) { return dt(e.inizio) > Date.now() - 86400000; }); }
  function tutti(list) {
    return raggruppa(list || []).concat(miei().map(function(e) { return Object.assign({ mio: true, fine: e.inizio.slice(0, 10) + ' 23:59:00' }, e); }))
      .filter(function(e) { return dt(e.fine || e.inizio) >= Date.now() - 3600000; })
      .sort(function(a, b) { return a.inizio.localeCompare(b.inizio); });
  }
  // venerdì–domenica di questo weekend (da lunedì a giovedì: il prossimo)
  function weekend() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    var dow = d.getDay(), ven = new Date(d); ven.setDate(d.getDate() + (dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow));
    var dom = new Date(ven); dom.setDate(ven.getDate() + 2); dom.setHours(23, 59, 59);
    return [ven, dom];
  }
  function nelWeekend(e) {
    var w = weekend(), a = dt(e.inizio), b = dt(e.fine || e.inizio);
    if (e.ripetuto) return a <= w[1] && b >= w[0];
    return a <= w[1] && b >= w[0];
  }
  function ics(e) {
    var f = function(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var a = dt(e.inizio), b = e.fine && !e.ripetuto ? dt(e.fine) : new Date(a.getTime() + 3 * 3600000);
    var txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AutoHub//Eventi//IT', 'BEGIN:VEVENT', 'UID:' + encodeURIComponent(e.titolo + e.inizio) + '@autohub', 'DTSTAMP:' + f(new Date()),
      'DTSTART:' + f(a), 'DTEND:' + f(b), 'SUMMARY:' + e.titolo.replace(/[,;]/g, ' '), 'LOCATION:' + (e.luogo || '').replace(/[,;]/g, ' '), 'URL:' + (e.url || ''),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e.titolo.replace(/[,;]/g, ' '), 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var el = document.createElement('a'), url = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
    el.href = url; el.download = 'evento.ics'; document.body.appendChild(el); el.click();
    setTimeout(function() { URL.revokeObjectURL(url); el.remove(); }, 300);
  }

  var stato = { list: null, load: false, err: '', filtro: 'tutti' };
  function inject() {
    if ($('ev-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'ev-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'ev-title');
    ov.innerHTML = '<div class="mt-hdr"><h2 id="ev-title">EVENTI<small>autodromi, raduni e i tuoi appuntamenti</small></h2><button class="gar-close" onclick="closeEventi()">✕ Chiudi</button></div><div class="mt-body" id="ev-body"></div>';
    document.body.appendChild(ov);
  }
  var _vis = [];
  function render() {
    var b = $('ev-body'); if (!b) return;
    var pos = jget('hub_oggi_pos_v1', null) || jget('hub_passi_pos_v1', null);
    var list = tutti(stato.list).filter(function(e) { return stato.filtro === 'tutti' || (stato.filtro === 'weekend' ? nelWeekend(e) : e.mio); });
    _vis = list;
    var html = '<div class="mt-tabs" role="tablist">' + [['tutti', 'Tutti'], ['weekend', 'Questo weekend'], ['miei', 'I miei']].map(function(t) {
      return '<button type="button" role="tab" aria-selected="' + (stato.filtro === t[0]) + '" class="' + (stato.filtro === t[0] ? 'on' : '') + '" onclick="evFiltro(\'' + t[0] + '\')">' + t[1] + '</button>';
    }).join('') + '</div>';
    if (stato.load) html += '<div class="wp-loading">Carico i calendari…</div>';
    if (stato.err) html += '<div class="wp-error">' + esc(stato.err) + '</div>';
    if (!stato.load && !list.length) html += '<p class="mt-int-nota">' + (stato.filtro === 'miei' ? 'Aggiungi raduni, cars & coffee o mostre a cui vuoi andare: li ritrovi qui e in Oggi.' : 'Nessun evento ' + (stato.filtro === 'weekend' ? 'questo weekend' : 'nei prossimi mesi') + '.') + '</p>';
    html += list.map(function(e, i) {
      var a = dt(e.inizio), z = dt(e.fine || e.inizio), quando;
      if (e.ripetuto) quando = e.date + ' date dal ' + giorno(a) + ' al ' + giorno(z);
      else if (a.toDateString() !== z.toDateString()) quando = 'dal ' + giorno(a) + ' al ' + giorno(z);
      else quando = giorno(a) + (e.tuttoIlGiorno ? '' : ' · ' + ora(a));
      var d = pos && e.lat ? Math.round(km(pos, e)) : null;
      var nav = e.lat ? 'https://www.google.com/maps/dir/?api=1&destination=' + e.lat + ',' + e.lng : e.luogo ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.luogo) : '';
      return '<div class="mt-card ev-card' + (nelWeekend(e) ? ' ev-wk' : '') + '"><div class="ev-h"><b>' + esc(e.titolo) + '</b>' + (e.mio ? '<span class="ev-tag">tuo</span>' : (e.cat || []).slice(0, 1).map(function(c) { return '<span class="ev-tag">' + esc(c) + '</span>'; }).join('')) + '</div>' +
        '<div class="mt-card-meta">' + esc(quando) + ' · ' + esc(e.luogo || '') + (d != null ? ' · ' + d + ' km da te' : '') + (e.costo ? ' · ' + esc(e.costo) : '') + '</div>' +
        (e.descr || e.note ? '<p class="ev-d">' + esc(e.descr || e.note) + '</p>' : '') +
        '<div class="of-act">' + (e.url ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">Dettagli ↗</a>' : '') + (nav ? '<a href="' + nav + '" target="_blank" rel="noopener">📍 Portami</a>' : '') +
        '<button type="button" onclick="evIcs(' + i + ')">📅 Calendario</button>' + (e.mio ? '<button type="button" onclick="evDel(\'' + e.id + '\')">🗑</button>' : '') + '</div></div>';
    }).join('');
    html += '<button class="fl-add-btn" onclick="evNuovo()">+ Aggiungi un evento</button>' +
      '<p class="mt-int-nota">Calendario ufficiale dell\'Autodromo di Monza (gare, track day e tour in pista), aggiornato due volte al giorno. Raduni e cars & coffee non hanno un calendario pubblico affidabile: aggiungili tu quando li vedi.</p>';
    b.innerHTML = html;
  }
  window.evFiltro = function(f) { stato.filtro = f; render(); };
  window.evIcs = function(i) { if (_vis[i]) ics(_vis[i]); };
  window.evNuovo = function() {
    var el = $('mt-sheet');
    if (!el) { el = document.createElement('div'); el.id = 'mt-sheet'; el.onclick = function(e) { if (e.target === el) el.classList.remove('visible'); }; document.body.appendChild(el); }
    el.innerHTML = '<div class="gar-edit-card"><h3>Nuovo evento</h3>' +
      '<div class="gar-field"><label>Cosa</label><input id="ev-t" maxlength="80" placeholder="Es. Cars & Coffee Brianza"></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Giorno</label><input type="date" id="ev-g" value="' + window.hubToday() + '"></div><div class="gar-field"><label>Ora</label><input type="time" id="ev-o" value="09:00"></div></div>' +
      '<div class="gar-field"><label>Dove</label><input id="ev-l" maxlength="100" placeholder="Luogo o indirizzo"></div>' +
      '<div class="gar-field"><label>Link (facoltativo)</label><input id="ev-u" type="url" maxlength="300"></div>' +
      '<div class="gar-field"><label>Note</label><input id="ev-n" maxlength="140" placeholder="Es. iscrizione entro venerdì"></div>' +
      '<div class="gar-edit-btns"><button type="button" class="gar-cancel" onclick="document.getElementById(\'mt-sheet\').classList.remove(\'visible\')">Annulla</button><button type="button" class="gar-save" onclick="evSalva()">Salva</button></div></div>';
    el.classList.add('visible');
  };
  window.evSalva = function() {
    var t = $('ev-t').value.trim(), g = $('ev-g').value; if (!t || !g) { alert('Scrivi cosa e quando.'); return; }
    var u = $('ev-u').value.trim();
    var l = jget(MK, []); l.push({ id: 'e' + Date.now().toString(36), titolo: t, inizio: g + ' ' + ($('ev-o').value || '09:00') + ':00', luogo: $('ev-l').value.trim(), url: /^https?:\/\//.test(u) ? u : '', note: $('ev-n').value.trim() });
    jset(MK, l); $('mt-sheet').classList.remove('visible'); render(); oggi();
  };
  window.evDel = function(id) { if (!confirm('Eliminare questo evento?')) return; jset(MK, jget(MK, []).filter(function(e) { return e.id !== id; })); render(); oggi(); };
  function oggi() { if (window._oggiInternals && document.body.dataset.hub === 'oggi') window._oggiInternals.render(); }
  window.openEventi = function() {
    inject(); $('ev-overlay').classList.add('visible');
    var c = jget(CK, null); stato.list = c ? c.eventi : null; stato.load = !c; stato.err = ''; render();
    scarica().then(function(l) { stato.list = l; stato.load = false; render(); }, function(e) { stato.load = false; stato.err = 'Calendari non disponibili ora (' + e.message + ').'; render(); });
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeEventi = function() { var o = $('ev-overlay'); if (o) o.classList.remove('visible'); if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility(); };
  // per Oggi: dal giovedì, gli eventi del weekend (prima i tuoi)
  window.hubEventiWeekend = function() {
    var dow = new Date().getDay();
    if (dow >= 1 && dow <= 3) return [];
    var c = jget(CK, null);
    return tutti(c ? c.eventi : []).filter(nelWeekend).sort(function(a, b) { return (b.mio ? 1 : 0) - (a.mio ? 1 : 0) || (a.ripetuto ? 1 : 0) - (b.ripetuto ? 1 : 0); });
  };
  window.hubEventiAggiorna = function() { return scarica().catch(function() { return null; }); };
  window._eventiInternals = { raggruppa: raggruppa, weekend: weekend, nelWeekend: nelWeekend };
})();
