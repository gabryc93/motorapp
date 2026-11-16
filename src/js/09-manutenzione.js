

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
  function openDocDB() {
    if (_docDbPromise) return _docDbPromise;
    _docDbPromise = new Promise(function(resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB not supported')); return; }
      var req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = function(ev) {
        var db = ev.target.result;
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains(DOCS_STORE)) db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
      };
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
    return _docDbPromise;
  }
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

  function presetsFor(v) {
    return (v && v.type === 'moto') ? PRESETS_MOTO : PRESETS_AUTO;
  }

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
    return { kmRem: kmRem, daysRem: daysRem, pct: pct, status: status };
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
    document.getElementById('mt-f-km').value = (v && v.kmTot) || '';
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

  function renderMaint() {
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) return;
    var body = document.getElementById('mt-body');
    if (!body) return;
    var presets = presetsFor(v);
    var icon = v.type === 'moto' ? '🏍' : '🚗';
    var name = v.customName || (v.marca + ' ' + v.modello);

    var html = '<div class="mt-veh-header">' +
      '<div class="mt-veh-icon">' + icon + '</div>' +
      '<div class="mt-veh-info">' +
        '<div class="mt-veh-name">' + escSafe(name) + '</div>' +
        '<div class="mt-veh-km">' + (v.kmTot || 0).toLocaleString('it-IT') + ' km · ' + presets.length + ' interventi tracciati</div>' +
      '</div></div>';

    html += presets.map(function(p) {
      var last = lastEventFor(v.id, p.type);
      var st = statusFor(p, last, v.kmTot || 0);
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
      var st = statusFor(p, last, v.kmTot || 0);
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

