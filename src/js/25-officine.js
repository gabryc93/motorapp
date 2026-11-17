/* ═══════════════════════════════════════════════════════════════════
   HUB OFFICINE — rubrica di officine di fiducia (Manutenzione → Officine)
   · contatti (chiama, naviga), tipo, note
   · "Da chiedere": promemoria da portare in officina, per auto
   · preventivi con importo, per confrontarli
   · quanto hai speso in ciascuna (interventi e modifiche collegati)
   Dati: hub_officine_v1 [{id, nome, tipo, tel, indirizzo, note, chiedi:[{id,t,vid,fatto}], prev:[{id,descr,importo,data,vid}]}]
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  var KEY = 'hub_officine_v1';
  var TIPI = { meccanico: '🔧 Meccanico', gommista: '⚫ Gommista', carrozzeria: '🎨 Carrozzeria', elettrauto: '⚡ Elettrauto', concessionaria: '🏢 Concessionaria', revisioni: '📋 Centro revisioni', altro: '• Altro' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function jl(k) { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { return []; } }
  function js(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function $(id) { return document.getElementById(id); }
  function list() { return jl(KEY); }
  function save(l) { js(KEY, l); }
  function eur(n) { return Math.round(n).toLocaleString('it-IT') + ' €'; }
  function rerender() { if (window.mtTab) window.mtTab('off'); }
  function sheet(html) {
    var el = $('mt-sheet');
    if (!el) { el = document.createElement('div'); el.id = 'mt-sheet'; el.onclick = function(e) { if (e.target === el) el.classList.remove('visible'); }; document.body.appendChild(el); }
    el.innerHTML = '<div class="gar-edit-card">' + html + '</div>'; el.classList.add('visible');
  }
  function chiudi() { var el = $('mt-sheet'); if (el) el.classList.remove('visible'); }
  function nomeV(id) { var v = (window.hubGarage ? window.hubGarage.list() : []).filter(function(x) { return x.id === id; })[0]; return v ? v.customName || ((v.marca || '') + ' ' + (v.modello || '')).trim() : ''; }

  // spesa per officina: interventi (hub_maint_v1, cost) e modifiche (hub_mods_v1, costo)
  function spese(oid) {
    var tot = 0, n = 0, ultima = '';
    jl('hub_maint_v1').forEach(function(e) { if (e.offId === oid) { n++; tot += e.cost || 0; if ((e.doneDate || '') > ultima) ultima = e.doneDate; } });
    jl('hub_mods_v1').forEach(function(m) { if (m.offId === oid) { n++; tot += m.costo || 0; if ((m.data || '') > ultima) ultima = m.data; } });
    return { tot: tot, n: n, ultima: ultima };
  }

  function render(v) {
    var l = list(), html = '';
    if (!l.length) html += '<p class="mt-int-nota">Salva le officine di cui ti fidi: le chiami e ci arrivi con un tocco, colleghi interventi e fatture, ti segni cosa chiedere la prossima volta e confronti i preventivi.</p>';
    html += l.map(function(o) {
      var s = spese(o.id), aperte = (o.chiedi || []).filter(function(c) { return !c.fatto; });
      var maps = o.indirizzo ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.nome + ' ' + o.indirizzo) : '';
      var prev = (o.prev || []).slice().sort(function(a, b) { return (b.data || '').localeCompare(a.data || ''); });
      return '<div class="mt-card of-card"><div class="of-h"><div><b>' + esc(o.nome) + '</b><small>' + esc(TIPI[o.tipo] || '') + (o.indirizzo ? ' · ' + esc(o.indirizzo) : '') + '</small></div>' +
        '<button type="button" class="of-edit" onclick="ofEdit(\'' + o.id + '\')" aria-label="Modifica officina">✎</button></div>' +
        '<div class="of-act">' + (o.tel ? '<a href="tel:' + esc(o.tel.replace(/[^\d+]/g, '')) + '">📞 Chiama</a>' : '') + (maps ? '<a href="' + maps + '" target="_blank" rel="noopener">📍 Mappa</a>' : '') +
        '<button type="button" onclick="ofChiedi(\'' + o.id + '\')">❓ Da chiedere</button><button type="button" onclick="ofPrev(\'' + o.id + '\')">💶 Preventivo</button></div>' +
        (s.n ? '<div class="mt-card-meta">' + s.n + (s.n === 1 ? ' lavoro' : ' lavori') + (s.tot ? ' · ' + eur(s.tot) + ' spesi' : '') + (s.ultima ? ' · ultimo il ' + s.ultima.split('-').reverse().join('/') : '') + '</div>' : '') +
        (aperte.length ? '<ul class="of-ask">' + aperte.map(function(c) {
          return '<li><label><input type="checkbox" onchange="ofFatto(\'' + o.id + '\',\'' + c.id + '\')"> ' + esc(c.t) + (c.vid ? ' <small>' + esc(nomeV(c.vid)) + '</small>' : '') + '</label></li>';
        }).join('') + '</ul>' : '') +
        (prev.length ? '<div class="of-prev">' + prev.map(function(p) {
          return '<div><span>' + esc(p.descr) + '<small>' + (p.data || '').split('-').reverse().join('/') + (p.vid ? ' · ' + esc(nomeV(p.vid)) : '') + '</small></span><b>' + (p.importo ? eur(p.importo) : '—') + '</b><button type="button" onclick="ofPrevDel(\'' + o.id + '\',\'' + p.id + '\')" aria-label="Elimina preventivo">✕</button></div>';
        }).join('') + '</div>' : '') +
        (o.note ? '<p class="of-note">' + esc(o.note) + '</p>' : '') + '</div>';
    }).join('');
    var conf = confronto();
    if (conf) html += conf;
    return html + '<button class="fl-add-btn" onclick="ofEdit(null)">+ Officina</button>';
  }
  // preventivi per lo stesso lavoro in officine diverse: il più basso e la differenza
  function confronto() {
    var g = {};
    list().forEach(function(o) { (o.prev || []).forEach(function(p) { if (!p.importo) return; var k = p.descr.toLowerCase().replace(/[^a-z0-9à-ù]+/g, ' ').trim(); (g[k] = g[k] || []).push({ o: o, p: p }); }); });
    var righe = Object.keys(g).filter(function(k) { var os = {}; g[k].forEach(function(x) { os[x.o.id] = 1; }); return Object.keys(os).length > 1; }).map(function(k) {
      var xs = g[k].sort(function(a, b) { return a.p.importo - b.p.importo; }), lo = xs[0], hi = xs[xs.length - 1];
      return '<li><b>' + esc(lo.p.descr) + '</b>: più conveniente ' + esc(lo.o.nome) + ' (' + eur(lo.p.importo) + '), ' + eur(hi.p.importo - lo.p.importo) + ' in meno di ' + esc(hi.o.nome) + '</li>';
    });
    return righe.length ? '<div class="mt-card of-conf"><b>Confronto preventivi</b><ul>' + righe.join('') + '</ul></div>' : '';
  }

  window.ofEdit = function(id) {
    var o = id ? list().filter(function(x) { return x.id === id; })[0] : null;
    sheet('<h3>' + (o ? 'Modifica officina' : 'Nuova officina') + '</h3>' +
      '<div class="gar-field"><label>Nome</label><input id="of-nome" maxlength="60" value="' + esc(o ? o.nome : '') + '" placeholder="Es. Officina Rossi"></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Tipo</label><select id="of-tipo">' + Object.keys(TIPI).map(function(k) { return '<option value="' + k + '"' + ((o ? o.tipo : 'meccanico') === k ? ' selected' : '') + '>' + TIPI[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="gar-field"><label>Telefono</label><input id="of-tel" type="tel" maxlength="20" value="' + esc(o ? o.tel || '' : '') + '"></div></div>' +
      '<div class="gar-field"><label>Indirizzo</label><input id="of-ind" maxlength="120" value="' + esc(o ? o.indirizzo || '' : '') + '" placeholder="Via, città"></div>' +
      '<div class="gar-field"><label>Note</label><textarea id="of-note" rows="2" maxlength="300" placeholder="Es. chiedere di Marco, chiuso il sabato, fa anche gli pneumatici">' + esc(o ? o.note || '' : '') + '</textarea></div>' +
      '<div class="gar-edit-btns">' + (o ? '<button type="button" class="gar-cancel" onclick="ofDel(\'' + o.id + '\')">🗑 Elimina</button>' : '') +
      '<button type="button" class="gar-cancel" onclick="ofChiudi()">Annulla</button><button type="button" class="gar-save" onclick="ofSave(\'' + (o ? o.id : '') + '\')">Salva</button></div>');
  };
  window.ofChiudi = chiudi;
  window.ofSave = function(id) {
    var val = function(x) { return $(x).value.trim(); };
    if (!val('of-nome')) { alert('Scrivi il nome dell\'officina.'); return; }
    var l = list(), o = id ? l.filter(function(x) { return x.id === id; })[0] : { id: uid(), chiedi: [], prev: [] };
    Object.assign(o, { nome: val('of-nome'), tipo: val('of-tipo'), tel: val('of-tel'), indirizzo: val('of-ind'), note: val('of-note') });
    if (!id) l.push(o);
    save(l); chiudi(); rerender();
  };
  window.ofDel = function(id) {
    if (!confirm('Eliminare questa officina? Gli interventi collegati restano.')) return;
    save(list().filter(function(x) { return x.id !== id; })); chiudi(); rerender();
  };
  window.ofChiedi = function(id) {
    var o = list().filter(function(x) { return x.id === id; })[0], v = window.hubGarage && window.hubGarage.active();
    sheet('<h3>Da chiedere a ' + esc(o.nome) + '</h3>' +
      '<div class="gar-field"><label>Cosa vuoi chiedere o far controllare</label><input id="of-q" maxlength="140" placeholder="Es. rumore dalla ruota anteriore destra in curva"></div>' +
      (v ? '<label class="of-chk"><input type="checkbox" id="of-qv" checked> Riguarda ' + esc(nomeV(v.id)) + '</label>' : '') +
      '<div class="gar-edit-btns"><button type="button" class="gar-cancel" onclick="ofChiudi()">Annulla</button><button type="button" class="gar-save" onclick="ofChiediSave(\'' + id + '\')">Aggiungi</button></div>');
    setTimeout(function() { var q = $('of-q'); if (q) q.focus(); }, 50);
  };
  window.ofChiediSave = function(id) {
    var t = $('of-q').value.trim(); if (!t) return;
    var v = window.hubGarage && window.hubGarage.active(), l = list(), o = l.filter(function(x) { return x.id === id; })[0];
    (o.chiedi = o.chiedi || []).push({ id: uid(), t: t, vid: v && $('of-qv') && $('of-qv').checked ? v.id : null, fatto: false });
    save(l); chiudi(); rerender();
  };
  window.ofFatto = function(id, cid) {
    var l = list(), o = l.filter(function(x) { return x.id === id; })[0];
    o.chiedi = (o.chiedi || []).filter(function(c) { return c.id !== cid; });
    save(l); setTimeout(rerender, 250);
  };
  window.ofPrev = function(id) {
    var o = list().filter(function(x) { return x.id === id; })[0];
    sheet('<h3>Preventivo di ' + esc(o.nome) + '</h3>' +
      '<div class="gar-field"><label>Lavoro</label><input id="of-pd" maxlength="80" placeholder="Es. cinghia distribuzione + pompa acqua"></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Importo €</label><input id="of-pi" type="number" min="0" step="1"></div>' +
      '<div class="gar-field"><label>Data</label><input id="of-pdt" type="date" value="' + window.hubToday() + '"></div></div>' +
      '<p class="mt-int-nota">Scrivi il lavoro con le stesse parole nelle diverse officine: l\'app confronta da sola i preventivi uguali.</p>' +
      '<div class="gar-edit-btns"><button type="button" class="gar-cancel" onclick="ofChiudi()">Annulla</button><button type="button" class="gar-save" onclick="ofPrevSave(\'' + id + '\')">Salva</button></div>');
  };
  window.ofPrevSave = function(id) {
    var d = $('of-pd').value.trim(); if (!d) { alert('Scrivi il lavoro.'); return; }
    var v = window.hubGarage && window.hubGarage.active(), l = list(), o = l.filter(function(x) { return x.id === id; })[0];
    (o.prev = o.prev || []).push({ id: uid(), descr: d, importo: parseFloat($('of-pi').value) || null, data: $('of-pdt').value, vid: v ? v.id : null });
    save(l); chiudi(); rerender();
  };
  window.ofPrevDel = function(id, pid) {
    var l = list(), o = l.filter(function(x) { return x.id === id; })[0];
    o.prev = (o.prev || []).filter(function(p) { return p.id !== pid; });
    save(l); rerender();
  };
  // menu a tendina per i moduli di interventi e modifiche
  function select(idSel, val) {
    var l = list();
    return '<div class="gar-field"><label>Officina</label><select id="' + idSel + '"><option value="">' + (l.length ? '— nessuna —' : '— aggiungile in Officine —') + '</option>' +
      l.map(function(o) { return '<option value="' + o.id + '"' + (o.id === val ? ' selected' : '') + '>' + esc(o.nome) + '</option>'; }).join('') + '</select></div>';
  }
  // promemoria aperti per l'auto attiva (badge nel tab)
  function aperti(vid) {
    var n = 0; list().forEach(function(o) { (o.chiedi || []).forEach(function(c) { if (!c.fatto && (!vid || !c.vid || c.vid === vid)) n++; }); }); return n;
  }
  window.hubOfficine = { list: list, render: render, select: select, spese: spese, aperti: aperti };
})();
