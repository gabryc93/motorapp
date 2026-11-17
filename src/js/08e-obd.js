/* ═══════════════════════════════════════════════════════════════════
   HUB OBD — chiavetta OBD2 Bluetooth LE (ELM327) via Web Bluetooth
   Dati in diretta per Ride e HUD: giri, velocità, temperatura acqua,
   pressione turbo, tensione batteria; lettura e cancellazione codici errore.
   Funziona su Chrome/Edge Android e desktop e nell'app del Play Store;
   su iPhone serve un browser con Web Bluetooth (es. Bluefy), Safari no.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  // servizi BLE usati dalle chiavette ELM327 più diffuse (Vgate/vLinker, Veepeak, cloni)
  var SERVIZI = [0xfff0, 0xffe0, 0x18f0, 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'];
  var NOMI = ['OBD', 'OBDII', 'vLinker', 'VLINK', 'IOS-Vlink', 'Android-Vlink', 'V-LINK', 'VEEPEAK', 'Vgate', 'iCar', 'ELM327', 'KONNWEI'];

  var dev = null, rx = null, tx = null, buf = '', attesa = null, coda = Promise.resolve(), loopOn = false;
  var D = { stato: 'off', nome: '', rpm: null, kmh: null, h2o: null, map: null, baro: null, volt: null, ts: 0, errore: '' };
  var ascoltatori = [];

  function supportato() { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); }
  function notifica() { ascoltatori.forEach(function(f) { try { f(D); } catch (e) {} }); }

  /* ── Comandi ELM327: uno alla volta, risposta fino al prompt ">" ── */
  function invia(cmd, ms) {
    var p = coda.then(function() {
      return new Promise(function(ok) {
        buf = '';
        var t = setTimeout(function() { attesa = null; ok(buf.trim() || 'TIMEOUT'); }, ms || 2500);
        attesa = function(txt) { clearTimeout(t); attesa = null; ok(txt); };
        var data = new TextEncoder().encode(cmd + '\r');
        (tx.properties.writeWithoutResponse && tx.writeValueWithoutResponse ? tx.writeValueWithoutResponse(data) : tx.writeValue(data)).catch(function() { clearTimeout(t); attesa = null; ok('ERRORE'); });
      });
    });
    coda = p.catch(function() {});
    return p;
  }
  function ricevi(ev) {
    buf += new TextDecoder().decode(ev.target.value);
    var i = buf.indexOf('>');
    if (i >= 0 && attesa) { var txt = buf.slice(0, i).replace(/\r/g, '\n').trim(); buf = buf.slice(i + 1); attesa(txt); }
  }
  // "41 0C 1A F8" → [0x1A, 0xF8] per la modalità/pid richiesta
  function byte(risp, pid) {
    var h = risp.replace(/[^0-9A-F]/gi, '').toUpperCase(), k = h.indexOf('41' + pid);
    if (k < 0) return null;
    var out = [], s = h.slice(k + 4);
    for (var i = 0; i + 1 < s.length && out.length < 4; i += 2) out.push(parseInt(s.slice(i, i + 2), 16));
    return out;
  }
  function decodeDTC(risp) {
    // risposta modo 03: "43" + coppie di byte; 0000 = vuoto
    var h = risp.replace(/[^0-9A-F]/gi, '').toUpperCase(), out = [], k;
    while ((k = h.indexOf('43')) >= 0) {
      h = h.slice(k + 2);
      for (var i = 0; i + 3 < h.length; i += 4) {
        var w = h.slice(i, i + 4); if (w === '0000') continue;
        if (!/^[0-9A-F]{4}$/.test(w)) break;
        var n = parseInt(w[0], 16), code = 'PCBU'[n >> 2] + (n & 3) + w.slice(1);
        if (out.indexOf(code) < 0) out.push(code);
      }
      break;
    }
    return out;
  }

  function connetti() {
    if (!supportato()) return Promise.reject(new Error(/iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Safari su iPhone non permette il Bluetooth alle pagine web: apri AutoHub con un browser che lo supporta, come Bluefy.' : 'Questo browser non supporta il Bluetooth per le pagine web: usa Chrome o Edge.'));
    D.stato = 'connessione'; D.errore = ''; notifica();
    var filtri = SERVIZI.map(function(s) { return { services: [s] }; }).concat(NOMI.map(function(n) { return { namePrefix: n }; }));
    return navigator.bluetooth.requestDevice({ filters: filtri, optionalServices: SERVIZI }).then(function(d) {
      dev = d; D.nome = d.name || 'OBD';
      d.addEventListener('gattserverdisconnected', function() { loopOn = false; D.stato = 'off'; D.errore = 'Chiavetta scollegata'; notifica(); });
      return d.gatt.connect();
    }).then(function(srv) { return srv.getPrimaryServices(); }).then(function(svcs) {
      // si cerca la coppia di caratteristiche: una che notifica (risposte) e una scrivibile (comandi)
      return Promise.all(svcs.map(function(s) { return s.getCharacteristics().catch(function() { return []; }); })).then(function(gr) {
        var all = [].concat.apply([], gr);
        rx = all.filter(function(c) { return c.properties.notify || c.properties.indicate; })[0];
        tx = all.filter(function(c) { return c.properties.write || c.properties.writeWithoutResponse; })[0];
        if (!rx || !tx) throw new Error('Chiavetta non compatibile (nessun canale seriale trovato)');
        rx.addEventListener('characteristicvaluechanged', ricevi);
        return rx.startNotifications();
      });
    }).then(function() {
      return invia('ATZ', 3000).then(function() { return invia('ATE0'); }).then(function() { return invia('ATL0'); }).then(function() { return invia('ATS0'); })
        .then(function() { return invia('ATH0'); }).then(function() { return invia('ATSP0'); }).then(function() { return invia('0100', 8000); });
    }).then(function(r) {
      if (!/4100/i.test(r.replace(/\s/g, ''))) throw new Error('La centralina non risponde: accendi il quadro (o il motore) e riprova. Risposta: ' + r.slice(0, 60));
      return invia('0133').then(function(b) { var x = byte(b, '33'); D.baro = x ? x[0] : 101; });
    }).then(function() {
      D.stato = 'on'; notifica(); avviaLoop();
    }).catch(function(e) {
      D.stato = 'off'; D.errore = e && e.name === 'NotFoundError' ? '' : (e.message || String(e)); notifica();
      try { if (dev && dev.gatt.connected) dev.gatt.disconnect(); } catch (x) {}
      if (D.errore) throw new Error(D.errore);
    });
  }
  function disconnetti() { loopOn = false; try { if (dev && dev.gatt.connected) dev.gatt.disconnect(); } catch (e) {} D.stato = 'off'; D.rpm = D.kmh = D.h2o = D.map = D.volt = null; notifica(); }

  // giri a ogni giro del ciclo, gli altri dati a rotazione
  var CICLO = ['010D', '0105', '010B', 'ATRV'];
  function avviaLoop() {
    if (loopOn) return; loopOn = true;
    var i = 0;
    (function passo() {
      if (!loopOn || D.stato !== 'on') return;
      var altro = CICLO[i++ % CICLO.length];
      invia('010C', 1200).then(function(r) { var b = byte(r, '0C'); if (b && b.length >= 2) D.rpm = Math.round((b[0] * 256 + b[1]) / 4); })
        .then(function() { return invia(altro, 1200); }).then(function(r) {
          if (altro === 'ATRV') { var v = parseFloat(String(r).replace(',', '.')); if (!isNaN(v)) D.volt = v; }
          else { var b = byte(r, altro.slice(2)); if (b) { if (altro === '010D') D.kmh = b[0]; if (altro === '0105') D.h2o = b[0] - 40; if (altro === '010B') D.map = b[0]; } }
          D.ts = Date.now(); notifica();
        }).then(function() { setTimeout(passo, 30); });
    })();
  }
  function leggiDTC() {
    if (D.stato !== 'on') return Promise.reject(new Error('Collega prima la chiavetta'));
    return invia('03', 5000).then(function(r) { return /NO DATA/i.test(r) ? [] : decodeDTC(r); });
  }
  function cancellaDTC() {
    if (D.stato !== 'on') return Promise.reject(new Error('Collega prima la chiavetta'));
    return invia('04', 5000).then(function(r) { return /44/.test(r.replace(/\s/g, '')); });
  }

  /* ── Pannello nella Ride ─────────────────────────────────────── */
  var dtc = null, msg = '';
  function pannello() {
    var box = $('rd-perf-result-inner'); if (!box) return;
    var on = D.stato === 'on', cella = function(l, v) { return '<div class="rd-perf-result-cell"><div class="rd-perf-result-cell-lbl">' + l + '</div><div class="rd-perf-result-cell-val">' + v + '</div></div>'; };
    box.innerHTML = '<div class="rd-perf-result-title">OBD · ' + (on ? '🟢 ' + esc(D.nome) : D.stato === 'connessione' ? 'collegamento…' : 'non collegata') + '</div>' +
      (on ? '<div class="rd-perf-result-grid">' + cella('Giri', D.rpm != null ? D.rpm.toLocaleString('it-IT') : '—') + cella('Acqua', D.h2o != null ? D.h2o + '°C' : '—') +
          cella('Turbo', D.map != null ? fmtBoost() : '—') + cella('Batteria', D.volt != null ? D.volt.toFixed(1).replace('.', ',') + ' V' : '—') + '</div>' +
          '<div class="rd-perf-result-actions"><button class="rd-perf-close" onclick="hubOBD._dtc()">🔧 Leggi codici errore</button><button class="rd-perf-close" onclick="hubOBD.disconnetti();hubOBD.pannello()">Scollega</button></div>' +
          (dtc ? '<div class="rd-obd-dtc">' + (dtc.length ? dtc.map(function(c) { return '<a href="https://www.google.com/search?q=' + encodeURIComponent(c + ' ' + veicolo()) + '" target="_blank" rel="noopener">' + c + '</a>'; }).join('') +
            '<button class="rd-perf-close" onclick="hubOBD._clr()">Cancella codici</button>' : '<p class="rd-perf-note">✓ Nessun codice errore memorizzato.</p>') + '</div>' : '')
        : '<p class="rd-perf-note">Con una chiavetta OBD2 Bluetooth LE (per esempio Vgate vLinker) vedi giri, acqua, turbo e batteria nella Ride e nell\'HUD, e leggi i codici errore. Inserisci la chiavetta nella presa OBD (sotto il volante), accendi il quadro e tocca Collega.</p>' +
          (!supportato() ? '<p class="rd-perf-note rd-ra-err">' + (/iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Su iPhone Safari non permette il Bluetooth alle pagine web: apri carburanti.netlify.app con l\'app Bluefy (browser con Web Bluetooth).' : 'Questo browser non supporta il Bluetooth per le pagine web: usa Chrome o Edge.') + '</p>' : '') +
          '<div class="rd-perf-result-actions"><button class="rd-perf-again" onclick="hubOBD._conn()"' + (supportato() ? '' : ' disabled') + '>🔌 Collega</button></div>') +
      (msg || D.errore ? '<p class="rd-perf-note rd-ra-err" role="alert">' + esc(msg || D.errore) + '</p>' : '') +
      '<div class="rd-perf-result-actions"><button class="rd-perf-again" onclick="ridePerfClose()">Chiudi</button></div>';
    $('rd-perf-result').classList.add('visible');
  }
  function veicolo() { var v = window.hubGarage && window.hubGarage.active(); return v ? (v.marca || '') + ' ' + (v.modello || '') : ''; }
  function fmtBoost() { var b = (D.map - (D.baro || 101)) / 100; return (b >= 0 ? '+' : '') + b.toFixed(2).replace('.', ',') + ' bar'; }
  function aperto() { var r = $('rd-perf-result'), t = r && r.querySelector('.rd-perf-result-title'); return r && r.classList.contains('visible') && t && /^OBD/.test(t.textContent); }
  var ult = 0;
  ascoltatori.push(function() { if (aperto() && Date.now() - ult > 700) { ult = Date.now(); pannello(); } });

  window.hubOBD = {
    supportato: supportato, connetti: connetti, disconnetti: disconnetti, leggiDTC: leggiDTC, cancellaDTC: cancellaDTC, pannello: pannello,
    dati: function() { return D; }, boost: function() { return D.map != null ? (D.map - (D.baro || 101)) / 100 : null; },
    fresco: function() { return D.stato === 'on' && Date.now() - D.ts < 3000; },
    onChange: function(f) { ascoltatori.push(f); },
    _conn: function() { msg = ''; dtc = null; connetti().then(pannello, function(e) { msg = e.message; pannello(); }); pannello(); },
    _dtc: function() { msg = ''; leggiDTC().then(function(c) { dtc = c; pannello(); }, function(e) { msg = e.message; pannello(); }); },
    _clr: function() { if (!confirm('Cancellare i codici errore? La spia si spegne, ma se il guasto c\'è ancora tornerà.')) return; cancellaDTC().then(function(ok) { dtc = ok ? [] : dtc; msg = ok ? '' : 'La centralina non ha confermato la cancellazione.'; pannello(); }); },
    _decodeDTC: decodeDTC, _byte: byte
  };
})();
