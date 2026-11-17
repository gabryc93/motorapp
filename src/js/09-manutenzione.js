

/* ═══════════════════════════════════════════════════════════════════
   HUB MAINT — maintenance tracker per vehicle (km + date based).
   Different presets for auto vs moto. Stored at hub_maint_v1.
   Each event: id, vehicleId, type, doneKm, doneDate, note
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function uid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  // Maintenance presets:
  //   km:    interval in kilometers (null = date-only)
  //   months: interval in months  (null = km-only)
  // For each item, we use whichever is reached first.
  var PRESETS_AUTO = [
    { type:'olio',       icon:'🛢',  name:'Cambio olio motore',  km:15000, months:12 },
    { type:'filtro',     icon:'🌫',  name:'Filtro aria',          km:30000, months:24 },
    { type:'tagliando',  icon:'🔧',  name:'Tagliando completo',   km:30000, months:12 },
    { type:'gomme',      icon:'⚫',  name:'Gomme (rotazione)',    km:10000, months:12 },
    { type:'pastiglie',  icon:'🛑',  name:'Pastiglie freni',      km:30000, months:null },
    { type:'liq-freni',  icon:'💧',  name:'Liquido freni',        km:null,  months:24 },
    { type:'liq-raffr',  icon:'❄️',  name:'Liquido refrigerante', km:null,  months:24 },
    { type:'cinghia',    icon:'⚙',   name:'Cinghia distribuzione',km:120000,months:60 },
    { type:'revisione',  icon:'📋',  name:'Revisione (MCTC)',     km:null,  months:24 }
  ];
  var PRESETS_MOTO = [
    { type:'olio',       icon:'🛢',  name:'Cambio olio motore',   km:6000,  months:12 },
    { type:'filtro-olio',icon:'🛢',  name:'Filtro olio',          km:12000, months:24 },
    { type:'catena',     icon:'⛓',  name:'Catena (lubr+tens)',   km:500,   months:null },
    { type:'catena-set', icon:'⛓',  name:'Kit catena (sostituz.)', km:25000, months:null },
    { type:'pastiglie',  icon:'🛑',  name:'Pastiglie freni',      km:15000, months:null },
    { type:'gomme',      icon:'⚫',  name:'Gomme (sostituz.)',    km:10000, months:null },
    { type:'liq-freni',  icon:'💧',  name:'Liquido freni',        km:null,  months:24 },
    { type:'liq-raffr',  icon:'❄️',  name:'Liquido refrigerante', km:null,  months:24 },
    { type:'liq-frizione',icon:'💧', name:'Liquido frizione',     km:null,  months:24 },
    { type:'valvole',    icon:'⚙',   name:'Gioco valvole',        km:24000, months:null },
    { type:'candele',    icon:'⚡',  name:'Candele',              km:12000, months:null },
    { type:'filtro-aria',icon:'🌫',  name:'Filtro aria',          km:18000, months:null },
    { type:'revisione',  icon:'📋',  name:'Revisione (MCTC)',     km:null,  months:48 }
  ];

  var MT_KEY = 'hub_maint_v1';

  /* ── IndexedDB for invoices/receipts (separate from photos) ── */
  var DB_NAME = 'autohub_v1';
  var DOCS_STORE = 'maintdocs';
  var _docDbPromise = null;
  function openDocDB() { return window.hubIDB(); }   // apertura condivisa (versione 2)
  async function dbPutDoc(docId, dataUrl, mime) {
    var db = await openDocDB();
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(DOCS_STORE, 'readwrite');
      tx.objectStore(DOCS_STORE).put({ id: docId, dataUrl: dataUrl, mime: mime || 'image/jpeg', ts: Date.now() });
      tx.oncomplete = function() { resolve(true); };
      tx.onerror = function() { reject(tx.error); };
    });
  }
  async function dbGetDoc(docId) {
    try {
      var db = await openDocDB();
      return new Promise(function(resolve) {
        var tx = db.transaction(DOCS_STORE, 'readonly');
        var req = tx.objectStore(DOCS_STORE).get(docId);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { resolve(null); };
      });
    } catch(e) { return null; }
  }
  async function dbDeleteDoc(docId) {
    try {
      var db = await openDocDB();
      return new Promise(function(resolve) {
        var tx = db.transaction(DOCS_STORE, 'readwrite');
        tx.objectStore(DOCS_STORE).delete(docId);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { resolve(false); };
      });
    } catch(e) { return false; }
  }

  // Pending doc state for the open edit modal:
  //   null = no change, '' = remove, {dataUrl, mime} = new
  var _pendingDoc = null;

  // archivio documenti condiviso (fatture, libretto, polizza, patente)
  window.hubDocs = { put: dbPutDoc, get: dbGetDoc, del: dbDeleteDoc };

  window._mtDocChange = function(ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File troppo grande (>5MB).');
      ev.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      // If image, compress; if PDF, store as-is
      if (file.type.startsWith('image/') && typeof window._hubCompressImage === 'function') {
        window._hubCompressImage(file, 1400).then(function(compressed) {
          _pendingDoc = { dataUrl: compressed, mime: 'image/jpeg' };
          _mtDocShowPreview(compressed, 'image/jpeg');
        }).catch(function() {
          _pendingDoc = { dataUrl: dataUrl, mime: file.type };
          _mtDocShowPreview(dataUrl, file.type);
        });
      } else {
        _pendingDoc = { dataUrl: dataUrl, mime: file.type };
        _mtDocShowPreview(dataUrl, file.type);
      }
    };
    reader.readAsDataURL(file);
    ev.target.value = '';
  };
  function _mtDocShowPreview(dataUrl, mime) {
    var prev = document.getElementById('mt-doc-preview');
    if (mime === 'application/pdf') {
      prev.innerHTML = '<div class="mt-doc-pdf">📄 PDF</div>';
    } else {
      prev.innerHTML = '<img src="' + dataUrl + '" alt="">';
    }
    document.getElementById('mt-doc-rm').style.display = 'inline-block';
  }
  window._mtDocRemove = function() {
    _pendingDoc = '';
    document.getElementById('mt-doc-preview').innerHTML = '<div class="mt-doc-empty">📎</div>';
    document.getElementById('mt-doc-rm').style.display = 'none';
  };
  function loadAll() { try { return JSON.parse(localStorage.getItem(MT_KEY) || '[]'); } catch(e) { return []; } }
  function saveAll(r) { try { localStorage.setItem(MT_KEY, JSON.stringify(r)); } catch(e) {} }

  // Intervalli: base per auto/moto → adattati al motore (distribuzione, elettrica) → modificati dall'utente
  function presetsFor(v) {
    var base = (v && v.type === 'moto') ? PRESETS_MOTO : PRESETS_AUTO;
    var out = base.map(function(p) { return Object.assign({}, p); });
    if (!v) return out;
    if (v.alim === 'elettrica') out = out.filter(function(p) { return ['olio', 'filtro', 'filtro-olio', 'cinghia', 'candele', 'filtro-aria'].indexOf(p.type) < 0; });
    var mn = null;
    try { mn = window.hubMotoriNoti ? window.hubMotoriNoti(v.marca, v.modello, v.anno, v.motore, v.specs || {}) : null; } catch (e) {}
    var dist = mn && mn.distribuzione || (v.specs && v.specs.distribuzione) || '';
    out.forEach(function(p) {
      if (p.type === 'cinghia' && /bagno/i.test(dist)) { p.name = 'Cinghia distribuzione a bagno d\'olio'; p.km = 100000; p.months = 72; p.fonte = 'motore'; p.nota = 'Intervallo prudente per questa cinghia: controlla anche il libretto e i richiami della casa.'; }
      else if (p.type === 'cinghia' && /catena/i.test(dist)) { p.name = 'Catena distribuzione (controllo)'; p.km = 120000; p.months = null; p.fonte = 'motore'; p.nota = 'La catena non ha una sostituzione programmata: si controllano rumorosità e allungamento.'; }
      if (p.type === 'olio' && /bagno/i.test(dist)) { p.km = Math.min(p.km, 15000); p.fonte = 'motore'; p.nota = 'Con la cinghia a bagno d\'olio conviene cambiare l\'olio spesso e solo con quello omologato.'; }
      var o = v.maintInt && v.maintInt[p.type];
      if (o) { if (o.km !== undefined) p.km = o.km; if (o.months !== undefined) p.months = o.months; p.fonte = 'tuo'; }
    });
    return out;
  }

  // Km percorsi al giorno (rifornimenti e interventi degli ultimi 13 mesi) e km di oggi stimati
  function kmStima(v) {
    if (!v) return { kmGiorno: null, kmOggi: 0, stimato: false };
    var pts = [], lim = Date.now() - 400 * 86400000;
    try { JSON.parse(localStorage.getItem('hub_refuels_v1') || '[]').forEach(function(r) { if (r.vehicleId === v.id && r.km > 0 && r.date) pts.push({ t: new Date(r.date).getTime(), km: r.km }); }); } catch (e) {}
    // gli interventi solo se mancano i rifornimenti (i km dei rifornimenti sono più regolari)
    if (pts.filter(function(x) { return x.t >= lim; }).length < 2) loadAll().forEach(function(e) { if (e.vehicleId === v.id && e.doneKm > 0 && e.doneDate) pts.push({ t: new Date(e.doneDate).getTime(), km: e.doneKm }); });
    pts = pts.filter(function(x) { return x.t >= lim && !isNaN(x.t); }).sort(function(a, b) { return a.t - b.t; });
    var kmTot = v.kmTot || 0;
    if (pts.length < 2) return { kmGiorno: null, kmOggi: kmTot, stimato: false };
    var a = pts[0], b = pts[pts.length - 1], giorni = (b.t - a.t) / 86400000;
    if (giorni < 20 || b.km <= a.km) return { kmGiorno: null, kmOggi: kmTot, stimato: false };
    var kg = (b.km - a.km) / giorni, ult = pts.reduce(function(m, x) { return x.km > m.km ? x : m; }, b);
    var oggi = Math.round(Math.max(kmTot, ult.km + kg * Math.max(0, (Date.now() - ult.t) / 86400000)));
    return { kmGiorno: kg, kmOggi: oggi, stimato: oggi > kmTot + 50 };
  }
  window.hubKmStima = kmStima;

  // Compute status for a maintenance item:
  //   kmRem = km until next service (or null if no km interval)
  //   daysRem = days until next (or null)
  //   status = 'ok' | 'warn' | 'crit'
  function statusFor(preset, lastEvent, currentKm) {
    var kmRem = null, kmPct = null;
    if (preset.km && lastEvent && lastEvent.doneKm != null) {
      var nextKm = lastEvent.doneKm + preset.km;
      kmRem = nextKm - (currentKm || 0);
      kmPct = (kmRem / preset.km);
    }
    var daysRem = null, datePct = null;
    if (preset.months && lastEvent && lastEvent.doneDate) {
      var done = new Date(lastEvent.doneDate);
      var nextDate = new Date(done);
      nextDate.setMonth(nextDate.getMonth() + preset.months);
      var today = new Date(); today.setHours(0,0,0,0);
      daysRem = Math.round((nextDate - today) / 86400000);
      datePct = daysRem / (preset.months * 30);
    }
    // Worst-case among km/date
    var pct = null;
    if (kmPct != null && datePct != null) pct = Math.min(kmPct, datePct);
    else if (kmPct != null) pct = kmPct;
    else if (datePct != null) pct = datePct;

    var status;
    if (!lastEvent) {
      status = 'unknown';
    } else if (pct == null) {
      status = 'ok';
    } else if (pct < 0) {
      status = 'crit';
    } else if (pct < 0.15) {
      status = 'warn';
    } else {
      status = 'ok';
    }
    // giorni stimati prima della scadenza: la prima tra data e km (al ritmo di guida attuale)
    var kg = arguments[3], giorniKm = kmRem != null && kg ? Math.round(kmRem / kg) : null;
    var giorni = daysRem != null && giorniKm != null ? Math.min(daysRem, giorniKm) : daysRem != null ? daysRem : giorniKm;
    return { kmRem: kmRem, daysRem: daysRem, pct: pct, status: status, giorniKm: giorniKm, giorni: giorni };
  }

  function injectMaintUI() {
    if (document.getElementById('mt-overlay')) return;

    var slot = document.getElementById('garage-launch-slot');
    if (slot) {
      var b = document.createElement('button');
      b.id = 'mt-launch-btn';
      b.className = 'mt-launch';
      b.type = 'button';
      b.innerHTML =
        '<span class="mt-launch-icon">🔧</span>' +
        '<span class="mt-launch-text">Manutenzione</span>' +
        '<span class="mt-launch-stat" id="mt-launch-stat">—</span>';
      b.onclick = window.openMaint;
      slot.appendChild(b);
    }

    var ov = document.createElement('div');
    ov.id = 'mt-overlay';
    ov.innerHTML =
      '<div class="mt-hdr">' +
        '<h2>MANUTENZIONE<small id="mt-hdr-veh">—</small></h2>' +
        '<button class="mt-export-btn" onclick="hubExportData()" title="Esporta tutti i dati">⬇</button>' +
        '<button class="gar-close" onclick="closeMaint()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="mt-body" id="mt-body"></div>';
    document.body.appendChild(ov);

    var em = document.createElement('div');
    em.id = 'mt-edit';
    em.onclick = function(e) { if (e.target === em) closeMaintEdit(); };
    em.innerHTML =
      '<div class="gar-edit-card">' +
        '<h3 id="mt-edit-title">Registra intervento</h3>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Data intervento</label>' +
            '<input type="date" id="mt-f-date"></div>' +
          '<div class="gar-field"><label>Km al momento</label>' +
            '<input type="number" id="mt-f-km" min="0"></div>' +
        '</div>' +
        '<div class="gar-field"><label>Costo €</label>' +
          '<input type="number" id="mt-f-cost" min="0" step="0.01" placeholder="120.00"></div>' +
        '<div class="gar-row2 mt-int-row">' +
          '<div class="gar-field"><label>Prossimo ogni km</label><input type="number" id="mt-f-ikm" min="0" step="500" placeholder="—"></div>' +
          '<div class="gar-field"><label>o ogni mesi</label><input type="number" id="mt-f-imesi" min="0" step="1" placeholder="—"></div>' +
        '</div>' +
        '<p class="mt-int-nota" id="mt-int-nota"></p>' +
        '<div class="gar-field"><label>Documento (fattura, ricevuta...)</label>' +
          '<div class="mt-doc-row" id="mt-doc-row">' +
            '<div class="mt-doc-preview" id="mt-doc-preview"><div class="mt-doc-empty">📎</div></div>' +
            '<div class="mt-doc-actions">' +
              '<input type="file" accept="image/*,application/pdf" class="mt-doc-input" id="mt-doc-input" onchange="_mtDocChange(event)">' +
              '<button type="button" class="gar-photo-btn" onclick="document.getElementById(\'mt-doc-input\').click()">📷 Carica</button>' +
              '<button type="button" class="gar-photo-btn gar-photo-btn-rm" id="mt-doc-rm" onclick="_mtDocRemove()" style="display:none">Rimuovi</button>' +
            '</div>' +
          '</div></div>' +
        '<div class="gar-field"><label>Note</label>' +
          '<textarea id="mt-f-note" rows="2" placeholder="Es. olio Castrol 5W30, pastiglie EBC, da Officina XY..." maxlength="200"></textarea></div>' +
        '<div class="gar-edit-btns">' +
          '<button type="button" class="gar-cancel" onclick="closeMaintEdit()">Annulla</button>' +
          '<button type="button" class="gar-save" onclick="saveMaintEvent()" style="background:rgba(76,175,125,.85);border-color:rgba(76,175,125,.6);color:#08160d">Salva</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(em);
  }

  /* ── Public ─────────────────────────────────────────────────── */
  window.openMaint = function() {
    injectMaintUI();
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) { alert('Aggiungi prima un veicolo nel garage.'); return; }
    document.getElementById('mt-overlay').classList.add('visible');
    document.getElementById('mt-hdr-veh').textContent =
      (v.customName || (v.marca + ' ' + v.modello)) + ' · ' + (v.type === 'moto' ? 'Moto' : 'Auto');
    renderMaint();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeMaint = function() {
    document.getElementById('mt-overlay').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  var _editingType = null;
  window.openMaintEdit = function(presetType) {
    injectMaintUI();
    _editingType = presetType;
    _pendingDoc = null;
    var v = window.hubGarage && window.hubGarage.active();
    var preset = presetsFor(v).find(function(p) { return p.type === presetType; });
    document.getElementById('mt-edit-title').textContent = preset ? preset.name : 'Intervento';
    document.getElementById('mt-f-date').value = window.hubToday();
    document.getElementById('mt-f-km').value = kmStima(v).kmOggi || (v && v.kmTot) || '';
    document.getElementById('mt-f-ikm').value = preset && preset.km ? preset.km : '';
    document.getElementById('mt-f-imesi').value = preset && preset.months ? preset.months : '';
    document.getElementById('mt-int-nota').textContent = preset && preset.nota ? preset.nota : 'Cambia gli intervalli se il libretto o il tuo meccanico dicono diversamente.';
    document.getElementById('mt-f-cost').value = '';
    document.getElementById('mt-f-note').value = '';
    document.getElementById('mt-doc-preview').innerHTML = '<div class="mt-doc-empty">📎</div>';
    document.getElementById('mt-doc-rm').style.display = 'none';
    document.getElementById('mt-edit').classList.add('visible');
  };
  window.closeMaintEdit = function() {
    document.getElementById('mt-edit').classList.remove('visible');
  };

  // Smart click: if no events for this preset → edit directly. Else → show history.
  window._maintCardClick = function(presetType) {
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) return;
    var events = loadAll().filter(function(e) {
      return e.vehicleId === v.id && e.type === presetType;
    });
    if (events.length === 0) {
      window.openMaintEdit(presetType);
    } else {
      window.openMaintHistory(presetType);
    }
  };

  window.openMaintHistory = function(presetType) {
    injectMaintUI();
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) return;
    var preset = presetsFor(v).find(function(p) { return p.type === presetType; });
    var events = loadAll().filter(function(e) {
      return e.vehicleId === v.id && e.type === presetType;
    }).sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });

    var modal = document.getElementById('mt-history');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mt-history';
      modal.onclick = function(e) { if (e.target === modal) modal.classList.remove('visible'); };
      modal.innerHTML = '<div class="mt-history-card" id="mt-history-card"></div>';
      document.body.appendChild(modal);
    }

    var rows = events.map(function(e) {
      var dateStr = e.doneDate ? e.doneDate.split('-').reverse().join('/') : '—';
      var costStr = (typeof e.cost === 'number' && !isNaN(e.cost)) ? e.cost.toFixed(0) + ' €' : '';
      var docBadge = e.docId ? '<button class="mt-hist-doc" onclick="event.stopPropagation();viewMaintDoc(\'' + e.id + '\')" title="Apri documento">📎</button>' : '';
      return '<div class="mt-hist-row" data-id="' + e.id + '">' +
        '<div class="mt-hist-info">' +
          '<div class="mt-hist-date">' + dateStr + ' ' + docBadge + '</div>' +
          '<div class="mt-hist-meta">' + (e.doneKm != null ? e.doneKm.toLocaleString('it-IT') + ' km' : '—') +
            (costStr ? ' · ' + costStr : '') + '</div>' +
          (e.note ? '<div class="mt-hist-note">' + escSafe(e.note) + '</div>' : '') +
        '</div>' +
        '<button class="mt-hist-del" onclick="event.stopPropagation();deleteMaintEvent(\'' + e.id + '\',\'' + presetType + '\')">🗑</button>' +
      '</div>';
    }).join('');

    document.getElementById('mt-history-card').innerHTML =
      '<div class="mt-history-hdr">' +
        '<h3>' + escSafe(preset ? preset.name : presetType) + '</h3>' +
        '<small>' + events.length + ' intervent' + (events.length === 1 ? 'o' : 'i') + ' registrat' + (events.length === 1 ? 'o' : 'i') + '</small>' +
        '<button class="mt-history-close" onclick="document.getElementById(\'mt-history\').classList.remove(\'visible\')">✕</button>' +
      '</div>' +
      '<div class="mt-history-body">' + rows + '</div>' +
      '<div class="mt-history-actions">' +
        '<button class="mt-history-add" onclick="document.getElementById(\'mt-history\').classList.remove(\'visible\');openMaintEdit(\'' + presetType + '\')">+ Nuovo intervento</button>' +
      '</div>';
    modal.classList.add('visible');
  };

  window.deleteMaintEvent = function(eventId, presetType) {
    if (!confirm('Eliminare questo intervento?')) return;
    var all = loadAll();
    var ev = all.find(function(e) { return e.id === eventId; });
    if (ev && ev.docId) { try { dbDeleteDoc(ev.docId); } catch(_) {} }
    all = all.filter(function(e) { return e.id !== eventId; });
    saveAll(all);
    var v = window.hubGarage && window.hubGarage.active();
    var remaining = all.filter(function(e) {
      return e.vehicleId === v.id && e.type === presetType;
    });
    if (remaining.length > 0) {
      openMaintHistory(presetType);
    } else {
      document.getElementById('mt-history').classList.remove('visible');
    }
    renderMaint();
    refreshMaintBadge();
  };

  window.viewMaintDoc = async function(eventId) {
    var ev = loadAll().find(function(e) { return e.id === eventId; });
    if (!ev || !ev.docId) return;
    var doc = await dbGetDoc(ev.docId);
    if (!doc) { alert('Documento non trovato.'); return; }
    var w = window.open();
    if (!w) { alert('Pop-up bloccati. Abilita i pop-up per visualizzare il documento.'); return; }
    if (doc.mime === 'application/pdf') {
      w.document.write('<html><body style="margin:0;background:#000"><iframe src="' + doc.dataUrl + '" style="border:0;width:100%;height:100vh"></iframe></body></html>');
    } else {
      w.document.write('<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="' + doc.dataUrl + '" style="max-width:100%;max-height:100vh"></body></html>');
    }
  };

  window.saveMaintEvent = async function() {
    var v = window.hubGarage && window.hubGarage.active();
    if (!v || !_editingType) { alert('Errore.'); return; }
    var date = document.getElementById('mt-f-date').value;
    var km = parseInt(document.getElementById('mt-f-km').value, 10);
    if (!date || isNaN(km)) { alert('Compila data e km.'); return; }
    var costRaw = document.getElementById('mt-f-cost').value.replace(',', '.').trim();
    var cost = costRaw === '' ? null : parseFloat(costRaw);
    if (cost !== null && isNaN(cost)) cost = null;

    var newId = uid();
    var docId = null;
    if (_pendingDoc && _pendingDoc !== '' && typeof _pendingDoc === 'object') {
      docId = 'd' + newId;
      try {
        await dbPutDoc(docId, _pendingDoc.dataUrl, _pendingDoc.mime);
      } catch(e) { console.error('[AutoHub] doc save failed', e); docId = null; }
    }
    _pendingDoc = null;

    var all = loadAll();
    all.push({
      id: newId,
      vehicleId: v.id,
      type: _editingType,
      doneKm: km,
      doneDate: date,
      cost: cost,
      docId: docId,
      note: document.getElementById('mt-f-note').value.trim(),
      ts: Date.now()
    });
    saveAll(all);
    // intervallo modificato: diventa quello di questo veicolo
    var preset = presetsFor(v).find(function(p) { return p.type === _editingType; }) || {};
    var ik = parseInt(document.getElementById('mt-f-ikm').value, 10), im = parseInt(document.getElementById('mt-f-imesi').value, 10);
    ik = isNaN(ik) || ik <= 0 ? null : ik; im = isNaN(im) || im <= 0 ? null : im;
    if (ik !== (preset.km || null) || im !== (preset.months || null)) {
      var mi = Object.assign({}, v.maintInt || {}); mi[_editingType] = { km: ik, months: im };
      window.hubGarage.update(v.id, { maintInt: mi });
    }
    if (window.hubGarage && km > (v.kmTot || 0)) {
      window.hubGarage.update(v.id, { kmTot: km });
      if (typeof window._hubRefreshGarageBadge === 'function') window._hubRefreshGarageBadge();
    }
    closeMaintEdit();
    renderMaint();
    refreshMaintBadge();
  };

  /* ── Render ─────────────────────────────────────────────────── */
  function lastEventFor(vehicleId, type) {
    var ev = loadAll().filter(function(e) { return e.vehicleId === vehicleId && e.type === type; });
    if (ev.length === 0) return null;
    return ev.sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); })[0];
  }

  /* ── Treni di gomme ─────────────────────────────────────────── */
  var GK = 'hub_gomme_v1', MK = 'hub_mods_v1';
  function jl(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function js(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var TIPI = { estive: 'Estive', invernali: 'Invernali', 'all-season': '4 stagioni', track: 'Pista' };
  function gommeDi(v) {
    var all = jl(GK), mie = all.filter(function(g) { return g.vid === v.id; });
    // primo accesso: il treno indicato nel Garage diventa quello montato
    var gg = v.gomme || {}, gia = mie.some(function(g) { return montato(g) || (g.tipo === (gg.tipo || 'estive') && (g.marca || '') === (gg.marca || '') && (g.modello || '') === (gg.modello || '')); });
    if (!gia && (gg.misura || gg.marca)) {
      var g0 = { id: uid(), vid: v.id, tipo: v.gomme.tipo || 'estive', marca: v.gomme.marca || '', modello: v.gomme.modello || '', misura: v.gomme.misura || '', dot: null, mm: null,
        periodi: [{ da: v.gomme.kmMontaggio || v.kmTot || 0, daData: v.gomme.dataMontaggio || window.hubToday() }] };
      all.push(g0); js(GK, all); mie = mie.concat([g0]);
    }
    return mie;
  }
  function montato(g) { var p = g.periodi && g.periodi[g.periodi.length - 1]; return !!(p && p.a == null); }
  function kmGomme(g, kmOggi) { return (g.periodi || []).reduce(function(a, p) { return a + Math.max(0, (p.a != null ? p.a : kmOggi) - p.da); }, 0); }
  // stagione: obbligo invernali (o catene) dal 15/11 al 15/4; le invernali si tolgono entro il 15/5
  function stagione() { var d = new Date(), m = d.getMonth() + 1, g = d.getDate(); return (m === 11 && g >= 15) || m === 12 || m <= 3 || (m === 4 && g <= 15) ? 'inverno' : (m === 5 && g > 15) || (m > 5 && m < 10) || (m === 10 && g < 15) ? 'estate' : 'cambio'; }
  function avvisoGomme(v) {
    var g = gommeDi(v).filter(montato)[0]; if (!g) return null;
    var st = stagione();
    if (st === 'inverno' && g.tipo === 'estive') return 'Monta le gomme invernali (o tieni le catene a bordo): obbligo fino al 15 aprile su molte strade';
    if (st === 'estate' && g.tipo === 'invernali') return 'Monta le gomme estive: con il caldo le invernali frenano peggio e si consumano prima';
    return null;
  }
  window.hubGommeAvviso = avvisoGomme;
  function renderGomme(v) {
    var K = kmStima(v), list = gommeDi(v), anno = new Date().getFullYear(), av = avvisoGomme(v);
    var html = av ? '<div class="mt-alert">⚠ ' + escSafe(av) + '</div>' : '';
    html += list.sort(function(a, b) { return montato(b) - montato(a); }).map(function(g) {
      var km = kmGomme(g, K.kmOggi), eta = g.dot ? anno - g.dot : null, warn = [];
      if (eta != null && eta >= 8) warn.push('🔴 ' + eta + ' anni: da sostituire anche se sembrano buone');
      else if (eta != null && eta >= 6) warn.push('🟡 ' + eta + ' anni: fai controllare la gomma');
      var minMm = g.tipo === 'invernali' ? 4 : 3;
      if (g.mm != null && g.mm < 1.6) warn.push('🔴 ' + String(g.mm).replace('.', ',') + ' mm: sotto il minimo di legge (1,6 mm)');
      else if (g.mm != null && g.mm < minMm) warn.push('🟡 ' + String(g.mm).replace('.', ',') + ' mm: consigliato cambiarle sotto ' + minMm + ' mm');
      return '<div class="mt-card mt-gomma' + (montato(g) ? ' on' : '') + (warn.some(function(w) { return w[0] === '🔴'; }) ? ' crit' : warn.length ? ' warn' : '') + '">' +
        '<div class="mt-card-row"><div class="mt-card-icon">' + (g.tipo === 'invernali' ? '❄️' : g.tipo === 'all-season' ? '🌦' : g.tipo === 'track' ? '🏁' : '☀️') + '</div>' +
        '<div class="mt-card-info"><div class="mt-card-name">' + escSafe(TIPI[g.tipo] || 'Gomme') + (g.marca ? ' · ' + escSafe(g.marca + ' ' + (g.modello || '')) : '') + '</div>' +
        '<div class="mt-card-meta">' + escSafe([g.misura, g.dot ? 'DOT ' + g.dot : '', g.mm != null ? String(g.mm).replace('.', ',') + ' mm' : ''].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="mt-card-status ' + (montato(g) ? 'ok' : '') + '">' + (montato(g) ? 'Montate' : 'In garage') + '</div></div>' +
        '<div class="mt-card-detail"><span>' + km.toLocaleString('it-IT') + ' km fatti</span><span>' + (g.periodi || []).length + ' stagion' + ((g.periodi || []).length === 1 ? 'e' : 'i') + '</span></div>' +
        (warn.length ? '<div class="mt-gomma-w">' + warn.map(escSafe).join('<br>') + '</div>' : '') +
        '<div class="mt-gomma-act">' + (montato(g) ? '' : '<button type="button" onclick="mtGommeMonta(\'' + g.id + '\')">⇄ Monta queste</button>') +
          '<button type="button" onclick="mtGommeEdit(\'' + g.id + '\')">✎ Modifica</button></div></div>';
    }).join('');
    html += '<button class="fl-add-btn" onclick="mtGommeEdit(null)">+ Treno di gomme</button>' +
      '<p class="mt-int-nota">Registra estive e invernali: al cambio stagione tocca "Monta queste" e l\'app tiene il conto dei km di ciascun treno.</p>';
    return html;
  }
  window.mtGommeMonta = function(id) {
    var v = window.hubGarage.active(), K = kmStima(v), km = parseInt(prompt('Km del contachilometri al cambio gomme:', K.kmOggi), 10);
    if (isNaN(km)) return;
    var all = jl(GK), oggi = window.hubToday();
    all.forEach(function(g) {
      if (g.vid !== v.id) return;
      var p = g.periodi && g.periodi[g.periodi.length - 1];
      if (montato(g)) { p.a = km; p.aData = oggi; }
      if (g.id === id) { g.periodi = (g.periodi || []).concat([{ da: km, daData: oggi }]); }
    });
    js(GK, all);
    var nuovo = all.filter(function(g) { return g.id === id; })[0];
    if (nuovo) window.hubGarage.update(v.id, { gomme: Object.assign({}, v.gomme || {}, { tipo: nuovo.tipo, marca: nuovo.marca, modello: nuovo.modello, misura: nuovo.misura || (v.gomme || {}).misura, dataMontaggio: oggi, kmMontaggio: km }), kmTot: Math.max(v.kmTot || 0, km) });
    renderMaint();
  };
  window.mtGommeEdit = function(id) {
    var v = window.hubGarage.active(), g = id ? jl(GK).filter(function(x) { return x.id === id; })[0] : null;
    var m = document.getElementById('mt-sheet');
    if (!m) { m = document.createElement('div'); m.id = 'mt-sheet'; m.onclick = function(e) { if (e.target === m) m.classList.remove('visible'); }; document.body.appendChild(m); }
    m.innerHTML = '<div class="gar-edit-card"><h3>' + (g ? 'Modifica gomme' : 'Nuovo treno di gomme') + '</h3>' +
      '<div class="gar-row2"><div class="gar-field"><label>Tipo</label><select id="mg-tipo">' + Object.keys(TIPI).map(function(k) { return '<option value="' + k + '"' + ((g ? g.tipo : 'invernali') === k ? ' selected' : '') + '>' + TIPI[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="gar-field"><label>Misura</label><input id="mg-misura" maxlength="30" value="' + escSafe(g ? g.misura : (v.gomme && v.gomme.misura) || '') + '" placeholder="225/45 R17"></div></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Marca</label><input id="mg-marca" maxlength="30" value="' + escSafe(g ? g.marca : '') + '"></div>' +
      '<div class="gar-field"><label>Modello</label><input id="mg-modello" maxlength="40" value="' + escSafe(g ? g.modello : '') + '"></div></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Anno DOT</label><input type="number" id="mg-dot" min="2000" max="2100" value="' + (g && g.dot || '') + '" placeholder="es. 2023"></div>' +
      '<div class="gar-field"><label>Battistrada mm</label><input type="number" id="mg-mm" min="0" max="12" step="0.5" value="' + (g && g.mm != null ? g.mm : '') + '" placeholder="es. 6"></div></div>' +
      (g ? '' : '<label class="mt-check"><input type="checkbox" id="mg-on"> Sono montate adesso</label>') +
      '<p class="mt-int-nota">L\'anno è nelle ultime due cifre del codice DOT sul fianco (es. 2423 = settimana 24 del 2023).</p>' +
      '<div class="gar-edit-btns">' + (g ? '<button type="button" class="gar-cancel" onclick="mtGommeDel(\'' + g.id + '\')">🗑 Elimina</button>' : '') +
      '<button type="button" class="gar-cancel" onclick="document.getElementById(\'mt-sheet\').classList.remove(\'visible\')">Annulla</button>' +
      '<button type="button" class="gar-save" onclick="mtGommeSave(\'' + (g ? g.id : '') + '\')">Salva</button></div></div>';
    m.classList.add('visible');
  };
  window.mtGommeSave = function(id) {
    var v = window.hubGarage.active(), all = jl(GK), val = function(x) { return document.getElementById(x).value.trim(); };
    var rec = { tipo: val('mg-tipo'), misura: val('mg-misura'), marca: val('mg-marca'), modello: val('mg-modello'), dot: parseInt(val('mg-dot'), 10) || null, mm: val('mg-mm') === '' ? null : parseFloat(val('mg-mm').replace(',', '.')) };
    if (id) all = all.map(function(g) { return g.id === id ? Object.assign({}, g, rec) : g; });
    else {
      var on = document.getElementById('mg-on').checked, K = kmStima(v);
      if (on) all.forEach(function(g) { if (g.vid === v.id && montato(g)) { var p = g.periodi[g.periodi.length - 1]; p.a = K.kmOggi; p.aData = window.hubToday(); } });
      all.push(Object.assign({ id: uid(), vid: v.id, periodi: on ? [{ da: K.kmOggi, daData: window.hubToday() }] : [] }, rec));
    }
    js(GK, all); document.getElementById('mt-sheet').classList.remove('visible'); renderMaint();
  };
  window.mtGommeDel = function(id) {
    if (!confirm('Eliminare questo treno di gomme?')) return;
    js(GK, jl(GK).filter(function(g) { return g.id !== id; })); document.getElementById('mt-sheet').classList.remove('visible'); renderMaint();
  };

  /* ── Modifiche ed elaborazioni ───────────────────────────────── */
  var CAT = { motore: '⚙ Motore', scarico: '💨 Scarico', assetto: '🔩 Assetto', freni: '🛑 Freni', cerchi: '⭕ Cerchi', interni: '🪑 Interni', estetica: '✨ Estetica', elettronica: '🔌 Elettronica', altro: '🧰 Altro' };
  function renderMods(v) {
    var list = jl(MK).filter(function(m) { return m.vid === v.id; }).sort(function(a, b) { return (b.data || '').localeCompare(a.data || ''); });
    var tot = list.reduce(function(a, m) { return a + (m.costo || 0); }, 0);
    var banco = list.filter(function(m) { return m.cv; }).sort(function(a, b) { return (b.data || '').localeCompare(a.data || ''); })[0];
    var html = '<div class="mt-mods-sum"><div><small>Modifiche</small><b>' + list.length + '</b></div><div><small>Speso</small><b>' + Math.round(tot).toLocaleString('it-IT') + ' €</b></div>' +
      (banco ? '<div><small>Ultima prova al banco</small><b>' + banco.cv + ' CV' + (banco.nm ? ' · ' + banco.nm + ' Nm' : '') + '</b></div>' : '') + '</div>';
    html += list.map(function(m) {
      return '<div class="mt-card" onclick="mtModEdit(\'' + m.id + '\')"><div class="mt-card-row"><div class="mt-card-icon">' + (CAT[m.cat] || '🧰').split(' ')[0] + '</div>' +
        '<div class="mt-card-info"><div class="mt-card-name">' + escSafe(m.titolo) + '</div><div class="mt-card-meta">' + escSafe([m.data ? m.data.split('-').reverse().join('/') : '', m.km ? m.km.toLocaleString('it-IT') + ' km' : '', m.cv ? m.cv + ' CV al banco' : ''].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="mt-card-status">' + (m.costo ? Math.round(m.costo).toLocaleString('it-IT') + ' €' : '') + (m.docId ? ' 📎' : '') + '</div></div>' +
        (m.note ? '<div class="mt-card-detail"><span>' + escSafe(m.note.slice(0, 80)) + '</span></div>' : '') + '</div>';
    }).join('');
    if (!list.length) html += '<p class="mt-int-nota">Tieni traccia di elaborazioni, ricambi e accessori: costo, fattura, prove al banco. Utile anche quando vendi l\'auto.</p>';
    return html + '<button class="fl-add-btn" onclick="mtModEdit(null)">+ Modifica</button>';
  }
  var _modDoc = null;
  window.mtModEdit = function(id) {
    var v = window.hubGarage.active(), m = id ? jl(MK).filter(function(x) { return x.id === id; })[0] : null; _modDoc = null;
    var el = document.getElementById('mt-sheet');
    if (!el) { el = document.createElement('div'); el.id = 'mt-sheet'; el.onclick = function(e) { if (e.target === el) el.classList.remove('visible'); }; document.body.appendChild(el); }
    el.innerHTML = '<div class="gar-edit-card"><h3>' + (m ? 'Modifica' : 'Nuova modifica') + '</h3>' +
      '<div class="gar-field"><label>Cosa hai fatto</label><input id="mm-titolo" maxlength="80" value="' + escSafe(m ? m.titolo : '') + '" placeholder="Es. Scarico Akrapovič, mappa stage 1, ammortizzatori Bilstein"></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Categoria</label><select id="mm-cat">' + Object.keys(CAT).map(function(k) { return '<option value="' + k + '"' + ((m ? m.cat : 'motore') === k ? ' selected' : '') + '>' + CAT[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="gar-field"><label>Costo €</label><input type="number" id="mm-costo" min="0" step="1" value="' + (m && m.costo || '') + '"></div></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Data</label><input type="date" id="mm-data" value="' + (m ? m.data : window.hubToday()) + '"></div>' +
      '<div class="gar-field"><label>Km</label><input type="number" id="mm-km" min="0" value="' + (m ? m.km || '' : kmStima(v).kmOggi || '') + '"></div></div>' +
      '<div class="gar-row2"><div class="gar-field"><label>Banco: CV</label><input type="number" id="mm-cv" min="0" value="' + (m && m.cv || '') + '" placeholder="facoltativo"></div>' +
      '<div class="gar-field"><label>Banco: Nm</label><input type="number" id="mm-nm" min="0" value="' + (m && m.nm || '') + '" placeholder="facoltativo"></div></div>' +
      '<div class="gar-field"><label>Fattura o foto</label><input type="file" id="mm-doc" accept="image/*,application/pdf" onchange="mtModDoc(event)">' + (m && m.docId ? '<button type="button" class="gar-photo-btn" onclick="mtModView(\'' + m.id + '\')">📎 Apri allegato</button>' : '') + '</div>' +
      '<div class="gar-field"><label>Note</label><textarea id="mm-note" rows="2" maxlength="300">' + escSafe(m ? m.note || '' : '') + '</textarea></div>' +
      '<p class="mt-int-nota">Le modifiche a scarico, assetto, cerchi o potenza spesso vanno omologate o annotate sul libretto: verifica prima di circolare.</p>' +
      '<div class="gar-edit-btns">' + (m ? '<button type="button" class="gar-cancel" onclick="mtModDel(\'' + m.id + '\')">🗑 Elimina</button>' : '') +
      '<button type="button" class="gar-cancel" onclick="document.getElementById(\'mt-sheet\').classList.remove(\'visible\')">Annulla</button>' +
      '<button type="button" class="gar-save" onclick="mtModSave(\'' + (m ? m.id : '') + '\')">Salva</button></div></div>';
    el.classList.add('visible');
  };
  window.mtModDoc = function(ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('File troppo grande (>5MB).'); ev.target.value = ''; return; }
    if (f.type.indexOf('image/') === 0 && typeof window._hubCompressImage === 'function') window._hubCompressImage(f, 1400).then(function(d) { _modDoc = { dataUrl: d, mime: 'image/jpeg' }; });
    else { var r = new FileReader(); r.onload = function(e) { _modDoc = { dataUrl: e.target.result, mime: f.type }; }; r.readAsDataURL(f); }
  };
  window.mtModSave = async function(id) {
    var v = window.hubGarage.active(), val = function(x) { return document.getElementById(x).value.trim(); };
    if (!val('mm-titolo')) { alert('Scrivi cosa hai fatto.'); return; }
    var all = jl(MK), old = id ? all.filter(function(x) { return x.id === id; })[0] : null, nid = id || uid(), docId = old ? old.docId : null;
    if (_modDoc) { docId = 'dm' + nid; try { await dbPutDoc(docId, _modDoc.dataUrl, _modDoc.mime); } catch (e) { docId = old ? old.docId : null; } }
    var rec = { id: nid, vid: v.id, titolo: val('mm-titolo'), cat: val('mm-cat'), costo: parseFloat(val('mm-costo')) || null, data: val('mm-data'), km: parseInt(val('mm-km'), 10) || null,
      cv: parseFloat(val('mm-cv')) || null, nm: parseFloat(val('mm-nm')) || null, note: val('mm-note'), docId: docId };
    all = id ? all.map(function(x) { return x.id === id ? rec : x; }) : all.concat([rec]);
    js(MK, all); document.getElementById('mt-sheet').classList.remove('visible'); renderMaint();
  };
  window.mtModDel = function(id) {
    if (!confirm('Eliminare questa modifica?')) return;
    var m = jl(MK).filter(function(x) { return x.id === id; })[0];
    if (m && m.docId) { try { dbDeleteDoc(m.docId); } catch (e) {} }
    js(MK, jl(MK).filter(function(x) { return x.id !== id; })); document.getElementById('mt-sheet').classList.remove('visible'); renderMaint();
  };
  window.mtModView = async function(id) {
    var m = jl(MK).filter(function(x) { return x.id === id; })[0]; if (!m || !m.docId) return;
    var d = await dbGetDoc(m.docId); if (!d) { alert('Allegato non trovato.'); return; }
    var w = window.open(); if (!w) { alert('Pop-up bloccati.'); return; }
    w.document.write(d.mime === 'application/pdf' ? '<iframe src="' + d.dataUrl + '" style="border:0;width:100%;height:100vh"></iframe>' : '<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="' + d.dataUrl + '" style="max-width:100%;max-height:100vh"></body>');
  };

  // Interventi in scadenza o scaduti di un veicolo (per la pagina Oggi)
  window.hubMaintScad = function(v) {
    if (!v) return [];
    return presetsFor(v).map(function(p) {
      var K = kmStima(v), st = statusFor(p, lastEventFor(v.id, p.type), K.kmOggi, K.kmGiorno);
      return { type: p.type, icon: p.icon, name: p.name, status: st.status, kmRem: st.kmRem, daysRem: st.giorni != null ? st.giorni : st.daysRem };
    }).filter(function(x) { return x.status === 'warn' || x.status === 'crit'; });
  };

  var _tab = 'int';
  window.mtTab = function(t) { _tab = t; renderMaint(); };
  function tabs() {
    return '<div class="mt-tabs" role="tablist">' + [['int', '🔧 Interventi'], ['gomme', '⚫ Gomme'], ['mod', '🛠 Modifiche']].map(function(t) {
      return '<button type="button" role="tab" aria-selected="' + (_tab === t[0]) + '" class="' + (_tab === t[0] ? 'on' : '') + '" onclick="mtTab(\'' + t[0] + '\')">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  function renderMaint() {
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) return;
    var body = document.getElementById('mt-body');
    if (!body) return;
    if (_tab === 'gomme') { body.innerHTML = tabs() + renderGomme(v); return; }
    if (_tab === 'mod') { body.innerHTML = tabs() + renderMods(v); return; }
    var presets = presetsFor(v), K = kmStima(v);
    var icon = v.type === 'moto' ? '🏍' : '🚗';
    var name = v.customName || (v.marca + ' ' + v.modello);

    var html = '<div class="mt-veh-header">' +
      '<div class="mt-veh-icon">' + icon + '</div>' +
      '<div class="mt-veh-info">' +
        '<div class="mt-veh-name">' + escSafe(name) + '</div>' +
        '<div class="mt-veh-km">' + (K.stimato ? '≈ ' + K.kmOggi.toLocaleString('it-IT') + ' km oggi (stima)' : (v.kmTot || 0).toLocaleString('it-IT') + ' km') +
          (K.kmGiorno ? ' · ' + Math.round(K.kmGiorno * 30).toLocaleString('it-IT') + ' km al mese' : '') + '</div>' +
      '</div></div>';
    html = tabs() + html;

    html += presets.map(function(p) {
      var last = lastEventFor(v.id, p.type);
      var st = statusFor(p, last, K.kmOggi, K.kmGiorno);
      var statusLbl = '', statusClass = '';
      var detailParts = [];
      var barPct = 0;

      if (!last) {
        statusLbl = 'Mai registrato';
        statusClass = 'warn';
        detailParts.push('Tap per registrare il primo intervento');
      } else {
        var allForType = loadAll().filter(function(e) { return e.vehicleId === v.id && e.type === p.type; });
        var doneStr = last.doneDate ? last.doneDate.split('-').reverse().join('/') : '—';
        var lastLine = (allForType.length > 1 ? allForType.length + 'ª volta · ' : 'Ultimo: ') +
                       doneStr + (last.doneKm != null ? ' · ' + last.doneKm.toLocaleString('it-IT') + ' km' : '');
        if (typeof last.cost === 'number' && !isNaN(last.cost)) {
          lastLine += ' · ' + last.cost.toFixed(0) + ' €';
        }
        detailParts.push(lastLine);

        if (st.status === 'crit') {
          statusClass = 'crit';
          if (st.kmRem != null && st.kmRem < 0) statusLbl = 'Scaduto ' + Math.abs(st.kmRem) + ' km fa';
          else if (st.daysRem != null && st.daysRem < 0) statusLbl = 'Scaduto ' + Math.abs(st.daysRem) + ' gg fa';
          else statusLbl = 'Scaduto';
        } else if (st.status === 'warn') {
          statusClass = 'warn';
          if (st.kmRem != null && st.kmRem < (p.km * 0.15)) statusLbl = 'Tra ~' + st.kmRem + ' km';
          else if (st.daysRem != null) statusLbl = 'Tra ' + st.daysRem + ' gg';
          else statusLbl = 'In scadenza';
        } else {
          statusClass = 'ok';
          if (st.kmRem != null) statusLbl = 'Tra ~' + st.kmRem.toLocaleString('it-IT') + ' km';
          else if (st.daysRem != null) statusLbl = 'Tra ' + st.daysRem + ' gg';
          else statusLbl = 'OK';
        }

        // Bar fill (1.0 = just done, 0.0 = due now, <0 = overdue)
        if (st.pct != null) {
          var fillPct = Math.max(0, Math.min(100, (1 - st.pct) * 100));
          // pct close to 1 = full bar (worn); close to 0 = empty (just done)
          // We want: just done → empty bar (looks healthy), close to due → full red bar.
          // So invert again:
          fillPct = Math.max(0, Math.min(100, (1 - Math.max(0, st.pct)) * 100));
          // pct < 0 (overdue) → 100%
          if (st.pct < 0) fillPct = 100;
          barPct = fillPct;
        }
      }

      var cardClass = statusClass === 'crit' ? 'mt-card crit'
                    : statusClass === 'warn' ? 'mt-card warn' : 'mt-card';
      var nextInfoLeft = '';
      if (p.km) nextInfoLeft += 'ogni ' + p.km.toLocaleString('it-IT') + ' km';
      if (p.km && p.months) nextInfoLeft += ' o ';
      if (p.months) nextInfoLeft += 'ogni ' + p.months + ' mesi';
      if (p.fonte === 'motore') nextInfoLeft += ' · dal motore';
      else if (p.fonte === 'tuo') nextInfoLeft += ' · tuo intervallo';
      if (st.giorniKm != null && st.status !== 'crit' && last && p.km) nextInfoLeft += ' · ≈ ' + (st.giorniKm > 60 ? Math.round(st.giorniKm / 30) + ' mesi' : st.giorniKm + ' giorni') + ' al tuo ritmo';

      return '<div class="' + cardClass + '" onclick="_maintCardClick(\'' + p.type + '\')">' +
        '<div class="mt-card-row">' +
          '<div class="mt-card-icon">' + p.icon + '</div>' +
          '<div class="mt-card-info">' +
            '<div class="mt-card-name">' + escSafe(p.name) + '</div>' +
            '<div class="mt-card-meta">' + escSafe(detailParts.join(' · ')) + '</div>' +
          '</div>' +
          '<div class="mt-card-status ' + statusClass + '">' + escSafe(statusLbl) + '</div>' +
        '</div>' +
        (last ? '<div class="mt-card-bar">' +
          '<div class="mt-card-bar-fill ' + statusClass + '" style="width:' + barPct + '%"></div>' +
        '</div>' : '') +
        '<div class="mt-card-detail">' +
          '<span>' + escSafe(nextInfoLeft) + '</span>' +
          '<span>' + (last && last.note ? escSafe(last.note.slice(0, 40)) : '') + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    body.innerHTML = html;
  }

  /* ── Badge: show worst status across all items ─────────────── */
  function refreshMaintBadge() {
    var b = document.getElementById('mt-launch-stat');
    if (!b) return;
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) { b.textContent = '—'; b.className = 'mt-launch-stat'; return; }
    var presets = presetsFor(v);
    var worst = 'ok';
    var critN = 0, warnN = 0;
    presets.forEach(function(p) {
      var last = lastEventFor(v.id, p.type);
      if (!last) return;
      var K = kmStima(v), st = statusFor(p, last, K.kmOggi, K.kmGiorno);
      if (st.status === 'crit') { worst = 'crit'; critN++; }
      else if (st.status === 'warn' && worst !== 'crit') { worst = 'warn'; warnN++; }
    });
    b.className = 'mt-launch-stat' + (worst === 'crit' ? ' crit' : worst === 'warn' ? ' warn' : '');
    if (critN > 0) b.textContent = critN + ' scaduti';
    else if (warnN > 0) b.textContent = warnN + ' in scad.';
    else b.textContent = 'Tutto ok';
  }
  window._hubRefreshMaintBadge = refreshMaintBadge;

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      injectMaintUI();
      refreshMaintBadge();
    }, 450);
  });

  // Re-sync when active vehicle changes
  if (typeof window.useVehicle === 'function') {
    var _origUseVehicleM = window.useVehicle;
    window.useVehicle = function(id) {
      var r = _origUseVehicleM.apply(this, arguments);
      try { refreshMaintBadge(); } catch(e) {}
      return r;
    };
  }
})();

