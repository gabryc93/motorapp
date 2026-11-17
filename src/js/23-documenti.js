/* ═══════════════════════════════════════════════════════════════════
   HUB DOCUMENTI — libretto, polizza e altri documenti di ogni veicolo,
   più la patente (con scadenza, ricordata nella pagina Oggi).
   Le immagini restano sul dispositivo (IndexedDB, archivio "maintdocs").
   Dati: hub_documenti_v1 { [vid|'patente']: { [slot]: {docId, mime, ts} } },
         hub_patente_v1 { scadenza, categorie }
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var DK = 'hub_documenti_v1', PK = 'hub_patente_v1';
  var SLOT_V = [['libretto-f', 'Libretto · fronte'], ['libretto-r', 'Libretto · retro'], ['polizza', 'Polizza RCA'], ['altro', 'Altro (garanzia, tagliandi…)']];
  var SLOT_P = [['patente-f', 'Patente · fronte'], ['patente-r', 'Patente · retro']];
  var thumbs = {};

  function inject() {
    if ($('doc-overlay')) return;
    var slot = $('garage-launch-slot');
    if (slot && !$('doc-launch-btn')) {
      var b = document.createElement('button');
      b.id = 'doc-launch-btn'; b.className = 'mt-launch'; b.type = 'button';
      b.innerHTML = '<span class="mt-launch-icon">📄</span><span class="mt-launch-text">Documenti</span><span class="mt-launch-stat" id="doc-launch-stat">—</span>';
      b.onclick = function() { window.openDocumenti(); };
      slot.appendChild(b);
    }
    var ov = document.createElement('div');
    ov.id = 'doc-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'doc-title');
    ov.innerHTML = '<div class="mt-hdr"><h2 id="doc-title">DOCUMENTI<small id="doc-veh">—</small></h2><button class="gar-close" onclick="closeDocumenti()">✕ Chiudi</button></div>' +
      '<div class="mt-body" id="doc-body"></div><input type="file" id="doc-file" accept="image/*,application/pdf" hidden>' +
      '<div class="doc-view" id="doc-view" onclick="if(event.target===this)this.classList.remove(\'visible\')"><button class="gar-close" onclick="document.getElementById(\'doc-view\').classList.remove(\'visible\')">✕ Chiudi</button><div id="doc-view-in"></div></div>';
    document.body.appendChild(ov);
    $('doc-file').addEventListener('change', carica);
  }
  function doc(owner, slot) { var d = jget(DK, {}); return d[owner] && d[owner][slot] || null; }
  function cella(owner, s) {
    var d = doc(owner, s[0]), k = owner + '|' + s[0];
    return '<div class="doc-cell" data-k="' + esc(k) + '">' +
      '<button type="button" class="doc-thumb" onclick="docApri(\'' + esc(owner) + '\',\'' + s[0] + '\')" aria-label="' + esc(s[1]) + '">' +
        (d ? (thumbs[k] ? '<img src="' + thumbs[k] + '" alt="">' : d.mime === 'application/pdf' ? '<span>PDF</span>' : '<span>…</span>') : '<span>＋</span>') + '</button>' +
      '<div class="doc-lbl">' + esc(s[1]) + (d ? '<button type="button" class="doc-x" onclick="docTogli(\'' + esc(owner) + '\',\'' + s[0] + '\')" aria-label="Elimina">🗑</button>' : '') + '</div></div>';
  }
  function render() {
    var v = window.hubGarage && window.hubGarage.active(), P = jget(PK, {}), body = $('doc-body'); if (!body) return;
    var g = P.scadenza ? Math.round((new Date(P.scadenza + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000) : null;
    body.innerHTML = (v ? '<div class="doc-sec">🚗 ' + esc(v.customName || (v.marca + ' ' + v.modello)) + (v.targa ? ' · ' + esc(v.targa) : '') + '</div><div class="doc-grid">' + SLOT_V.map(function(s) { return cella(v.id, s); }).join('') + '</div>' : '') +
      '<div class="doc-sec">🪪 Patente</div><div class="doc-grid">' + SLOT_P.map(function(s) { return cella('patente', s); }).join('') + '</div>' +
      '<div class="gar-row2"><div class="gar-field"><label for="doc-pat-scad">Scadenza patente</label><input type="date" id="doc-pat-scad" value="' + esc(P.scadenza || '') + '" onchange="docPatente()"></div>' +
      '<div class="gar-field"><label for="doc-pat-cat">Categorie</label><input id="doc-pat-cat" maxlength="20" placeholder="B" value="' + esc(P.categorie || '') + '" onchange="docPatente()"></div></div>' +
      (g != null ? '<p class="mt-int-nota' + (g <= 90 ? ' doc-warn' : '') + '">' + (g < 0 ? 'La patente è scaduta da ' + (-g) + ' giorni.' : g <= 90 ? 'La patente scade tra ' + g + ' giorni: prenota la visita medica per il rinnovo.' : 'Scade il ' + P.scadenza.split('-').reverse().join('/') + '.') + '</p>' : '') +
      '<p class="mt-int-nota">Foto e PDF restano solo su questo telefono. In Italia alla guida servono gli originali o le versioni digitali ufficiali: queste copie servono come promemoria, per esempio per la polizza in caso di incidente.</p>';
    // miniature in background
    body.querySelectorAll('.doc-cell').forEach(function(c) {
      var k = c.dataset.k, p = k.split('|'), d = doc(p[0], p[1]);
      if (d && d.mime !== 'application/pdf' && !thumbs[k] && window.hubDocs) window.hubDocs.get(d.docId).then(function(x) { if (x) { thumbs[k] = x.dataUrl; var im = c.querySelector('.doc-thumb'); if (im) im.innerHTML = '<img src="' + x.dataUrl + '" alt="">'; } });
    });
    badge();
  }
  var _target = null;
  window.docApri = function(owner, slot) {
    var d = doc(owner, slot);
    if (!d) { _target = [owner, slot]; $('doc-file').click(); return; }
    window.hubDocs.get(d.docId).then(function(x) {
      if (!x) { alert('Documento non trovato.'); return; }
      $('doc-view-in').innerHTML = x.mime === 'application/pdf' ? '<iframe src="' + x.dataUrl + '" title="Documento"></iframe>' : '<img src="' + x.dataUrl + '" alt="Documento">';
      $('doc-view').classList.add('visible');
    });
  };
  function carica(ev) {
    var f = ev.target.files && ev.target.files[0], t = _target; ev.target.value = '';
    if (!f || !t) return;
    if (f.size > 8 * 1024 * 1024) { alert('File troppo grande (massimo 8 MB).'); return; }
    var salva = function(dataUrl, mime) {
      var id = 'doc-' + t[0] + '-' + t[1] + '-' + Date.now().toString(36), all = jget(DK, {}), old = all[t[0]] && all[t[0]][t[1]];
      window.hubDocs.put(id, dataUrl, mime).then(function() {
        if (old) window.hubDocs.del(old.docId);
        all[t[0]] = all[t[0]] || {}; all[t[0]][t[1]] = { docId: id, mime: mime, ts: Date.now() }; jset(DK, all);
        delete thumbs[t[0] + '|' + t[1]]; render();
      }).catch(function(e) { alert('Salvataggio non riuscito: ' + e.message); });
    };
    if (f.type.indexOf('image/') === 0 && window._hubCompressImage) window._hubCompressImage(f, 1800).then(function(d) { salva(d, 'image/jpeg'); }, function() { leggi(f, salva); });
    else leggi(f, salva);
  }
  function leggi(f, cb) { var r = new FileReader(); r.onload = function(e) { cb(e.target.result, f.type || 'application/octet-stream'); }; r.readAsDataURL(f); }
  window.docTogli = function(owner, slot) {
    if (!confirm('Eliminare questo documento dal telefono?')) return;
    var all = jget(DK, {}), d = all[owner] && all[owner][slot];
    if (d) { window.hubDocs.del(d.docId); delete all[owner][slot]; jset(DK, all); delete thumbs[owner + '|' + slot]; }
    render();
  };
  window.docPatente = function() { jset(PK, { scadenza: $('doc-pat-scad').value, categorie: $('doc-pat-cat').value.trim() }); render(); };
  function badge() {
    var b = $('doc-launch-stat'); if (!b) return;
    var v = window.hubGarage && window.hubGarage.active(), d = jget(DK, {}), n = 0;
    [v ? v.id : '', 'patente'].forEach(function(o) { if (d[o]) n += Object.keys(d[o]).length; });
    b.textContent = n ? n + ' salvat' + (n === 1 ? 'o' : 'i') : 'Nessuno';
  }
  // per la pagina Oggi: patente in scadenza entro 90 giorni
  window.hubPatenteScad = function() {
    var P = jget(PK, {}); if (!P.scadenza) return null;
    var g = Math.round((new Date(P.scadenza + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000);
    return g <= 90 ? { giorni: g, data: P.scadenza } : null;
  };
  window.openDocumenti = function() {
    inject();
    var v = window.hubGarage && window.hubGarage.active();
    $('doc-veh').textContent = v ? (v.customName || (v.marca + ' ' + v.modello)) : 'Patente';
    $('doc-overlay').classList.add('visible'); render();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeDocumenti = function() { var o = $('doc-overlay'); if (o) o.classList.remove('visible'); if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility(); };
  document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { inject(); badge(); }, 300); });
})();
