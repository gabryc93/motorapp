/* ═══════════════════════════════════════════════════════════════════
   BACKUP — file e cloud (Worker)
   · Il backup contiene tutti i dati salvati nel browser (localStorage)
     più foto dei veicoli e documenti della manutenzione (IndexedDB).
   · Backup cloud: i dati vengono cifrati sul dispositivo (AES-GCM) con una
     chiave ricavata dal codice personale; il Worker riceve solo dati cifrati
     e un identificativo (hash del codice). Senza il codice nessuno li legge,
     nemmeno il Worker. Se perdi il codice il backup cloud non è recuperabile.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // Dati dell'utente (le cache rigenerabili sono escluse apposta)
  var KEYS = ['hub_garage_v1', 'hub_active_vehicle_v1', 'hub_refuels_v1', 'hub_maint_v1', 'hub_rides_v1',
              'hub_perf_best_v1', 'hub_usato_v1', 'hub_ms_prefs_v1', 'hub_price_alerts_v1',
              'opf_favs', 'opf_hidden_cards', 'opf_cmp_liters', 'ad_rem', 'autodiagnosi_diary', 'ad_theme'];
  var STORES = ['photos', 'maintdocs'];
  var CLOUD = 'hub_cloud_v1';   // { code, lastHash, lastAt }
  var AUTO_MS = 12 * 3600 * 1000;

  function workerBase() {
    try { if (typeof WORKER === 'string' && WORKER) return WORKER; } catch (e) {}
    return window.WORKER || 'https://osservaprezzi.gabrycois.workers.dev';
  }
  function build() { return (document.querySelector('meta[name="autohub-build"]') || {}).content || ''; }

  /* ── Raccolta e ripristino ───────────────────────────────────────── */
  function readStore(db, name) {
    return new Promise(function(resolve) {
      try {
        var out = [], tx = db.transaction(name, 'readonly'), req = tx.objectStore(name).openCursor();
        req.onsuccess = function() { var c = req.result; if (c) { out.push(c.value); c.continue(); } else resolve(out); };
        req.onerror = function() { resolve(out); };
      } catch (e) { resolve([]); }
    });
  }
  function collect(withFiles) {
    var dump = { _format: 2, _exportedAt: new Date().toISOString(), _appBuild: build(), ls: {}, idb: {} };
    KEYS.forEach(function(k) { var v = localStorage.getItem(k); if (v !== null) dump.ls[k] = v; });
    if (!withFiles || !window.hubIDB) return Promise.resolve(dump);
    return window.hubIDB().then(function(db) {
      return Promise.all(STORES.map(function(s) { return readStore(db, s).then(function(rows) { dump.idb[s] = rows; }); }));
    }).then(function() { return dump; }, function() { return dump; });
  }
  // Accetta il formato nuovo (ls/idb) e quello vecchio (chiavi in cima al file, valori già decodificati)
  function normalize(dump) {
    if (dump && dump._format === 2) return dump;
    var out = { ls: {}, idb: {}, _exportedAt: dump && dump._exportedAt };
    KEYS.forEach(function(k) {
      var v = dump && dump[k];
      if (v === undefined || v === null || v === '<corrupted>') return;
      out.ls[k] = typeof v === 'string' ? v : JSON.stringify(v);
    });
    return out;
  }
  function restore(dump) {
    dump = normalize(dump);
    var keys = Object.keys(dump.ls || {});
    keys.forEach(function(k) { if (KEYS.indexOf(k) >= 0) localStorage.setItem(k, dump.ls[k]); });
    var stores = Object.keys(dump.idb || {}).filter(function(s) { return STORES.indexOf(s) >= 0; });
    if (!stores.length || !window.hubIDB) return Promise.resolve({ keys: keys.length, files: 0 });
    var files = 0;
    return window.hubIDB().then(function(db) {
      return Promise.all(stores.map(function(s) {
        return new Promise(function(resolve) {
          var tx = db.transaction(s, 'readwrite'), st = tx.objectStore(s);
          (dump.idb[s] || []).forEach(function(row) { if (row && row.id != null) { st.put(row); files++; } });
          tx.oncomplete = resolve; tx.onerror = resolve;
        });
      }));
    }).then(function() { return { keys: keys.length, files: files }; });
  }
  function summary(dump) {
    dump = normalize(dump);
    var n = 0;
    try { n = JSON.parse(dump.ls.hub_garage_v1 || '[]').length; } catch (e) {}
    var f = Object.keys(dump.idb || {}).reduce(function(s, k) { return s + (dump.idb[k] || []).length; }, 0);
    return n + (n === 1 ? ' veicolo' : ' veicoli') + ', ' + Object.keys(dump.ls).length + ' archivi, ' + f + ' tra foto e documenti';
  }

  /* ── File ────────────────────────────────────────────────────────── */
  window.hubExportData = function() {
    collect(true).then(function(dump) {
      var blob = new Blob([JSON.stringify(dump)], { type: 'application/json' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'autohub-backup-' + window.hubToday() + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 200);
    }).catch(function(e) { alert('Esportazione non riuscita: ' + e.message); });
  };
  window.hubImportData = function(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      try {
        var dump = JSON.parse(reader.result), n = normalize(dump);
        if (!Object.keys(n.ls).length) { alert('Questo file non contiene dati AutoHub.'); return; }
        if (!confirm('Ripristino il backup del ' + String(n._exportedAt || '').slice(0, 10) + ' (' + summary(dump) + ')?\n\nI dati di questo dispositivo verranno sostituiti.')) return;
        restore(dump).then(function() { location.reload(); });
      } catch (e) { alert('File non valido: ' + e.message); }
      finally { input.value = ''; }
    };
    reader.readAsText(file);
  };

  /* ── Cifratura ───────────────────────────────────────────────────── */
  var enc = new TextEncoder(), dec = new TextDecoder();
  function b64(buf) {
    var s = '', b = new Uint8Array(buf);
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function normCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function newCode() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(20)), s = '';
    for (var i = 0; i < r.length; i++) s += A[r[i] % A.length];
    return s.match(/.{4}/g).join('-');   // 20 caratteri ≈ 100 bit
  }
  function cloudId(code) {
    return crypto.subtle.digest('SHA-256', enc.encode('autohub-id:' + normCode(code))).then(function(h) {
      return Array.from(new Uint8Array(h)).map(function(x) { return x.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function keyFor(code) {
    return crypto.subtle.importKey('raw', enc.encode(normCode(code)), 'PBKDF2', false, ['deriveKey']).then(function(base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('autohub-backup-v1'), iterations: 150000, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function encrypt(code, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return keyFor(code).then(function(k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(JSON.stringify(obj))); })
      .then(function(ct) { return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) }); });
  }
  function decrypt(code, text) {
    var j = JSON.parse(text);
    return keyFor(code).then(function(k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(j.iv) }, k, unb64(j.ct)); })
      .then(function(pt) { return JSON.parse(dec.decode(pt)); });
  }
  function hashOf(str) {
    return crypto.subtle.digest('SHA-256', enc.encode(str)).then(function(h) { return b64(h).slice(0, 22); });
  }

  /* ── Cloud ───────────────────────────────────────────────────────── */
  function cloud() { try { return JSON.parse(localStorage.getItem(CLOUD) || 'null'); } catch (e) { return null; } }
  function setCloud(c) { try { if (c) localStorage.setItem(CLOUD, JSON.stringify(c)); else localStorage.removeItem(CLOUD); } catch (e) {} }

  function upload(force) {
    var c = cloud();
    if (!c || !c.code) return Promise.reject(new Error('Backup cloud non attivo'));
    var dumpP = collect(true);
    return dumpP.then(function(dump) {
      var forHash = JSON.stringify({ ls: dump.ls, idb: dump.idb });
      return hashOf(forHash).then(function(h) {
        if (!force && h === c.lastHash) return { skipped: true };
        return Promise.all([cloudId(c.code), encrypt(c.code, dump)]).then(function(r) {
          return fetch(workerBase() + '/api/backup/' + r[0], { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: r[1] })
            .then(function(res) {
              return res.json().catch(function() { return {}; }).then(function(j) {
                if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
                c.lastHash = h; c.lastAt = Date.now(); setCloud(c);
                return { bytes: r[1].length };
              });
            });
        });
      });
    });
  }
  function download(code) {
    return cloudId(code).then(function(id) { return fetch(workerBase() + '/api/backup/' + id); }).then(function(res) {
      if (res.status === 404) throw new Error('Nessun backup trovato con questo codice');
      if (!res.ok) return res.json().catch(function() { return {}; }).then(function(j) { throw new Error(j.error || ('HTTP ' + res.status)); });
      return res.text();
    }).then(function(t) {
      return decrypt(code, t).catch(function() { throw new Error('Codice sbagliato: il backup non si decifra'); });
    });
  }
  // Salvataggio automatico: all'apertura (se è passato abbastanza tempo) e quando l'app va in secondo piano
  function autoSave(minAge) {
    var c = cloud();
    if (!c || !c.code || !navigator.onLine) return;
    if (c.lastAt && Date.now() - c.lastAt < minAge) return;
    upload(false).catch(function(e) { console.warn('[backup] automatico non riuscito:', e.message); });
  }
  document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { autoSave(AUTO_MS); }, 8000); });
  document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') autoSave(10 * 60 * 1000); });

  /* ── Interfaccia (foglio "Backup") ───────────────────────────────── */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(ts) { return ts ? new Date(ts).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai'; }
  function sheet() {
    var el = document.getElementById('hub-backup');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'hub-backup'; el.className = 'hub-more';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Backup');
    el.innerHTML = '<div class="hub-more-sheet"><div class="hub-more-grip" aria-hidden="true"></div><div id="hub-backup-body"></div></div>';
    el.addEventListener('click', function(e) {
      if (e.target === el) { close(); return; }
      var t = e.target.closest('[data-bk]');
      if (t) action(t.dataset.bk);
    });
    document.body.appendChild(el);
    return el;
  }
  function close() { var el = document.getElementById('hub-backup'); if (el) el.classList.remove('visible'); }
  function msg(text, err) { var m = document.getElementById('hub-bk-msg'); if (m) { m.textContent = text; m.className = 'hub-bk-msg' + (err ? ' err' : ''); } }
  function render() {
    var c = cloud(), b = document.getElementById('hub-backup-body');
    var html = '<div class="hub-more-h">Backup su file</div><div class="hub-more-list">' +
      '<button data-bk="export">Scarica backup completo <b>.json con foto e documenti</b></button>' +
      '<button data-bk="import">Ripristina da file <b>sostituisce i dati</b></button></div>' +
      '<div class="hub-more-h">Backup cloud</div>';
    if (c && c.code) {
      html += '<div class="hub-bk-code"><small>Il tuo codice: conservalo, serve per recuperare i dati</small><b id="hub-bk-code">' + h(c.code) + '</b></div>' +
        '<div class="hub-more-list"><button data-bk="copy">Copia il codice <b>da salvare nelle note</b></button>' +
        '<button data-bk="save">Salva ora <b>ultimo: ' + when(c.lastAt) + '</b></button>' +
        '<button data-bk="restore">Ripristina da cloud <b>codice di un altro dispositivo</b></button>' +
        '<button data-bk="off">Disattiva su questo dispositivo <b>il backup resta sul server</b></button></div>' +
        '<p class="hub-bk-note">Salvataggio automatico all\'apertura (ogni 12 ore) e quando chiudi l\'app, solo se i dati sono cambiati. I dati partono già cifrati: senza il codice nessuno può leggerli.</p>';
    } else {
      html += '<p class="hub-bk-note">Salva una copia cifrata dei tuoi dati sul tuo Worker, così non li perdi se svuoti il browser o cambi telefono. Nessun account: ti basta un codice.</p>' +
        '<div class="hub-more-list"><button data-bk="on">Attiva backup cloud <b>crea il codice</b></button>' +
        '<button data-bk="restore">Ho già un codice <b>ripristina</b></button></div>';
    }
    html += '<div id="hub-bk-msg" class="hub-bk-msg" role="status"></div>';
    b.innerHTML = html;
  }
  function action(a) {
    var c = cloud();
    if (a === 'export') return window.hubExportData();
    if (a === 'import') return document.getElementById('hub-import-file').click();
    if (a === 'copy') {
      (navigator.clipboard ? navigator.clipboard.writeText(c.code) : Promise.reject()).then(function() { msg('Codice copiato'); }, function() { msg('Copia a mano il codice qui sopra'); });
      return;
    }
    if (a === 'on') {
      setCloud({ code: newCode(), lastHash: '', lastAt: 0 }); render(); msg('Salvo il primo backup…');
      upload(true).then(function(r) { msg('Backup salvato (' + Math.round(r.bytes / 1024) + ' KB)'); render(); msg('Backup salvato. Salva il codice in un posto sicuro.'); },
        function(e) { msg('Backup non riuscito: ' + e.message, true); });
      return;
    }
    if (a === 'save') {
      msg('Salvo…');
      upload(true).then(function(r) { render(); msg('Backup salvato (' + Math.round(r.bytes / 1024) + ' KB)'); }, function(e) { msg('Non riuscito: ' + e.message, true); });
      return;
    }
    if (a === 'off') {
      if (confirm('Disattivo il backup cloud su questo dispositivo? Il backup già salvato resta sul server: per recuperarlo ti servirà il codice.')) { setCloud(null); render(); }
      return;
    }
    if (a === 'restore') {
      var code = prompt('Inserisci il codice del backup (es. ABCD-EFGH-…)');
      if (!code || normCode(code).length < 16) { if (code) msg('Codice troppo corto', true); return; }
      msg('Scarico e decifro…');
      download(code).then(function(dump) {
        if (!confirm('Trovato il backup del ' + String(dump._exportedAt || '').slice(0, 10) + ' (' + summary(dump) + ').\n\nSostituisco i dati di questo dispositivo?')) { msg(''); return; }
        return restore(dump).then(function() {
          setCloud({ code: code.trim().toUpperCase(), lastHash: '', lastAt: Date.now() });
          location.reload();
        });
      }).catch(function(e) { msg(e.message, true); });
    }
  }
  window.hubBackupOpen = function() {
    if (window.hubMore) window.hubMore(false);
    sheet(); render();
    document.getElementById('hub-backup').classList.add('visible');
  };
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });

  window.hubBackup = { collect: collect, restore: restore, upload: upload, download: download, _encrypt: encrypt, _decrypt: decrypt, _cloudId: cloudId };
})();
