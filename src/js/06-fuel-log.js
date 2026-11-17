

/* ═══════════════════════════════════════════════════════════════════
   HUB FUEL LOG — refuel diary per active vehicle, computes:
     • L/100km between consecutive "full" refuels
     • €/km from costs
     • Trend (last 3 vs all-time avg)
   Storage: hub_refuels_v1 (array)
   Each: id, vehicleId, date(ISO), km, litri, prezzoPerLitro,
         costoTotale, carburante, isFull, distributore, note
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function uid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  var FL_KEY = 'hub_refuels_v1';
  function loadAll() { try { return JSON.parse(localStorage.getItem(FL_KEY) || '[]'); } catch(e) { return []; } }
  function saveAll(r) { try { localStorage.setItem(FL_KEY, JSON.stringify(r)); } catch(e) {} }
  function loadForVehicle(vehicleId) {
    return loadAll().filter(function(r) { return r.vehicleId === vehicleId; })
      .sort(function(a, b) { return a.km - b.km; });
  }

  // Ricariche (plug-in ed elettriche): stesso archivio, tipo 'ricarica', kWh al posto dei litri.
  // I vecchi rifornimenti "Elettrico (kWh)" valgono come ricariche.
  function isRic(r) { return r && (r.tipo === 'ricarica' || r.carburante === 'Elettrico'); }
  function kwhDi(r) { return Number(r.kwh != null ? r.kwh : r.litri) || 0; }
  var RP_KEY = 'hub_ricarica_pref_v1';
  function ricPref() {
    var p = {}; try { p = JSON.parse(localStorage.getItem(RP_KEY) || '{}'); } catch(e) {}
    return { casa: p.casa != null ? p.casa : 0.20, colonnina: p.colonnina != null ? p.colonnina : 0.70, consEv: p.consEv != null ? p.consEv : 17 };
  }
  function isPlug(v) { return v && (v.alim === 'plugin' || v.alim === 'elettrica'); }

  // Energia di un plug-in/elettrica nel tempo: km tra il primo e l'ultimo rifornimento o ricarica,
  // kWh e litri totali, km fatti in elettrico stimati dal consumo elettrico tipico (kWh/100 km)
  function energia(v, records) {
    records = (records || loadForVehicle(v.id)).filter(function(r) { return typeof r.km === 'number'; }).sort(function(a, b) { return a.km - b.km; });
    if (records.length < 2) return null;
    var P = ricPref(), km = records[records.length - 1].km - records[0].km;
    if (km <= 0) return null;
    // ciò che si carica al primo record serve a percorrere i km successivi: si esclude il primo
    var after = records.slice(1), ric = after.filter(isRic), fuel = after.filter(function(r) { return !isRic(r); });
    var kwh = ric.reduce(function(a, r) { return a + kwhDi(r); }, 0), litri = fuel.reduce(function(a, r) { return a + (Number(r.litri) || 0); }, 0);
    var eurE = ric.reduce(function(a, r) { return a + (Number(r.costoTotale) || kwhDi(r) * (r.luogo === 'colonnina' ? P.colonnina : P.casa)); }, 0);
    var eurF = fuel.reduce(function(a, r) { return a + (Number(r.costoTotale) || 0); }, 0);
    var kwhCasa = ric.filter(function(r) { return r.luogo !== 'colonnina'; }).reduce(function(a, r) { return a + kwhDi(r); }, 0);
    var kmEv = v.alim === 'elettrica' ? km : Math.min(km, kwh / P.consEv * 100), kmTerm = km - kmEv;
    return { km: km, kwh: kwh, litri: litri, eurE: eurE, eurF: eurF, eurKm: (eurE + eurF) / km, quotaCasa: kwh ? kwhCasa / kwh : null,
      kmEv: kmEv, quotaEv: kmEv / km, kwh100: kwh / km * 100, l100: litri / km * 100,
      l100Term: kmTerm > 200 && litri > 0 ? litri / kmTerm * 100 : null, ricariche: ric.length, pref: P };
  }

  // Public API
  window.hubFuelLog = {
    list:    loadAll,
    listFor: loadForVehicle,
    save:    saveAll,
    isRicarica: isRic,
    energia: energia,
    ricPref: ricPref
  };
  // Costo dell'energia al km per qualsiasi veicolo (per Oggi, Ride e TCO)
  window.hubEnergia = function(v) { return v && isPlug(v) ? energia(v) : null; };

  /* ── Compute stats ──────────────────────────────────────────── */
  function computeStats(refuels) {
    refuels = (refuels || []).filter(function(r) { return !isRic(r); });
    if (!refuels || refuels.length === 0) {
      return { avgConsumption: null, avgCostPerKm: null, totalSpent: 0, totalKm: 0, totalLitres: 0,
               trendPct: null, intervals: [] };
    }
    // intervals: from each "full" tank to the next "full" tank
    var sorted = refuels.slice().sort(function(a, b) { return a.km - b.km; });
    var intervals = [];
    var prevFull = null;
    var litresInWindow = 0;
    var costInWindow = 0;
    for (var i = 0; i < sorted.length; i++) {
      var r = sorted[i];
      if (prevFull) {
        var rl = Number(r.litri) || 0;
        litresInWindow += rl;
        // costo reale di ogni rifornimento della finestra (non solo il prezzo dell'ultimo)
        costInWindow += (Number(r.costoTotale) || rl * (Number(r.prezzoPerLitro) || 0));
        if (r.isFull) {
          var distKm = r.km - prevFull.km;
          if (distKm > 0 && litresInWindow > 0) {
            intervals.push({
              from: prevFull, to: r,
              km: distKm, litri: litresInWindow,
              consumption: (litresInWindow / distKm) * 100,
              costPerKm: costInWindow / distKm, costo: costInWindow
            });
          }
          prevFull = r;
          litresInWindow = 0;
          costInWindow = 0;
        }
      } else if (r.isFull) {
        prevFull = r;
        litresInWindow = 0;
      }
    }

    var totalLitres = sorted.reduce(function(s, r) { return s + (Number(r.litri) || 0); }, 0);
    var totalSpent = sorted.reduce(function(s, r) { return s + (Number(r.costoTotale) || 0); }, 0);
    var firstKm = sorted[0].km;
    var lastKm = sorted[sorted.length - 1].km;
    var totalKm = Math.max(0, lastKm - firstKm);

    var avgConsumption = null, avgCostPerKm = null, trendPct = null;
    if (intervals.length > 0) {
      // Media pesata sui km (litri totali / km totali): un intervallo corto non deve pesare come uno lungo
      var sumKm = intervals.reduce(function(s, x) { return s + x.km; }, 0);
      var sumL  = intervals.reduce(function(s, x) { return s + x.litri; }, 0);
      var sumE  = intervals.reduce(function(s, x) { return s + (x.costo || 0); }, 0);
      avgConsumption = (sumL / sumKm) * 100;
      avgCostPerKm = sumE / sumKm;

      // trend: compare last 3 (or last half) vs all-time
      if (intervals.length >= 4) {
        var last3 = intervals.slice(-3);
        var l3avg = last3.reduce(function(s, x) { return s + x.consumption; }, 0) / last3.length;
        trendPct = ((l3avg - avgConsumption) / avgConsumption) * 100;
      }
    }

    return {
      avgConsumption: avgConsumption,
      avgCostPerKm: avgCostPerKm,
      totalSpent: totalSpent,
      totalKm: totalKm,
      totalLitres: totalLitres,
      trendPct: trendPct,
      intervals: intervals,
      count: sorted.length
    };
  }

  /* ── UI INJECTION ───────────────────────────────────────────── */
  function injectFuelLogUI() {
    if (document.getElementById('fl-overlay')) return;

    var slot = document.getElementById('garage-launch-slot');
    if (slot) {
      var b = document.createElement('button');
      b.id = 'fl-launch-btn';
      b.className = 'fl-launch';
      b.type = 'button';
      b.innerHTML =
        '<span class="fl-launch-icon">📊</span>' +
        '<span class="fl-launch-text">Consumi & Rifornimenti</span>' +
        '<span class="fl-launch-stat" id="fl-launch-stat">—</span>';
      b.onclick = window.openFuelLog;
      slot.appendChild(b);
    }

    var ov = document.createElement('div');
    ov.id = 'fl-overlay';
    ov.innerHTML =
      '<div class="fl-hdr">' +
        '<h2>CONSUMI<small id="fl-hdr-veh">—</small></h2>' +
        '<button class="gar-close" onclick="closeFuelLog()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="fl-body" id="fl-body"></div>';
    document.body.appendChild(ov);

    var em = document.createElement('div');
    em.id = 'fl-edit';
    em.onclick = function(e) { if (e.target === em) closeFuelLogEdit(); };
    em.innerHTML =
      '<div class="gar-edit-card">' +
        '<h3 id="fl-edit-title">Nuovo rifornimento</h3>' +
        '<div class="fl-fullbar fl-tipobar" id="fl-tipobar">' +
          '<button type="button" data-tipo="fuel" onclick="_flSetTipo(\'fuel\')">⛽ Carburante</button>' +
          '<button type="button" data-tipo="ricarica" onclick="_flSetTipo(\'ricarica\')">🔌 Ricarica</button>' +
        '</div>' +
        '<div id="fl-ric-box" hidden>' +
          '<div class="fl-fullbar" id="fl-luogobar">' +
            '<button type="button" data-luogo="casa" onclick="_flSetLuogo(\'casa\')">🏠 Casa</button>' +
            '<button type="button" data-luogo="colonnina" onclick="_flSetLuogo(\'colonnina\')">⚡ Colonnina</button>' +
          '</div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>Data</label><input type="date" id="fl-r-date"></div>' +
            '<div class="gar-field"><label>Km totali</label><input type="number" id="fl-r-km" min="0" step="1"></div>' +
          '</div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>kWh caricati</label><input type="number" id="fl-r-kwh" min="0" step="0.1" placeholder="10.5"></div>' +
            '<div class="gar-field"><label>€ per kWh</label><input type="number" id="fl-r-prezzo" min="0" step="0.01"></div>' +
          '</div>' +
          '<div class="gar-field"><label>Totale spesa €</label><input type="number" id="fl-r-totale" min="0" step="0.01"></div>' +
          '<p class="fl-hint">I kWh li trovi nell\'app dell\'auto, della wallbox o della colonnina. A casa conta il prezzo finale in bolletta.</p>' +
        '</div>' +
        '<div id="fl-fuel-box">' +
        '<div class="fl-fullbar">' +
          '<button type="button" data-full="1" onclick="_flSetFull(true)">⛽ Pieno fatto</button>' +
          '<button type="button" data-full="0" onclick="_flSetFull(false)">Parziale</button>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Data</label>' +
            '<input type="date" id="fl-f-date"></div>' +
          '<div class="gar-field"><label>Km totali al pieno</label>' +
            '<input type="number" id="fl-f-km" min="0" step="1" placeholder="45000"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Litri</label>' +
            '<input type="number" id="fl-f-litri" min="0" step="0.01" placeholder="42.5"></div>' +
          '<div class="gar-field"><label>€ per litro</label>' +
            '<input type="number" id="fl-f-prezzo" min="0" step="0.001" placeholder="1.789"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Totale spesa €</label>' +
            '<input type="number" id="fl-f-totale" min="0" step="0.01" placeholder="76.03"></div>' +
          '<div class="gar-field"><label>Carburante</label>' +
            '<select id="fl-f-carb">' +
              '<option value="Benzina">Benzina</option>' +
              '<option value="Diesel">Diesel</option>' +
              '<option value="GPL">GPL</option>' +
              '<option value="Metano">Metano</option>' +
              '<option value="HVO">HVO</option>' +
              '<option value="Elettrico">Elettrico (kWh)</option>' +
            '</select></div>' +
        '</div>' +
        '<div class="gar-field"><label>Distributore (opzionale)</label>' +
          '<input type="text" id="fl-f-distrib" placeholder="Eni Cologno" maxlength="60"></div>' +
        '<div class="gar-field"><label>Note</label>' +
          '<textarea id="fl-f-note" rows="2" placeholder="Es. autostrada, viaggio Roma…" maxlength="200"></textarea></div>' +
        '</div>' +
        '<div class="gar-edit-btns">' +
          '<button type="button" class="gar-cancel" onclick="closeFuelLogEdit()">Annulla</button>' +
          '<button type="button" class="gar-save" onclick="saveFuelLogEdit()" style="background:rgba(91,155,213,.85);border-color:rgba(91,155,213,.6);color:#08131c">Salva</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(em);

    function autoTotale() {
      var L = parseFloat(document.getElementById('fl-f-litri').value);
      var P = parseFloat(document.getElementById('fl-f-prezzo').value);
      if (!isNaN(L) && !isNaN(P)) {
        document.getElementById('fl-f-totale').value = (L * P).toFixed(2);
      }
    }
    document.getElementById('fl-f-litri').addEventListener('input', autoTotale);
    document.getElementById('fl-f-prezzo').addEventListener('input', autoTotale);
    function autoRic() {
      var k = parseFloat(document.getElementById('fl-r-kwh').value), p = parseFloat(document.getElementById('fl-r-prezzo').value);
      if (!isNaN(k) && !isNaN(p)) document.getElementById('fl-r-totale').value = (k * p).toFixed(2);
    }
    document.getElementById('fl-r-kwh').addEventListener('input', autoRic);
    document.getElementById('fl-r-prezzo').addEventListener('input', autoRic);
  }
  var _editingTipo = 'fuel', _editingLuogo = 'casa';
  window._flSetTipo = function(t) {
    _editingTipo = t;
    document.querySelectorAll('#fl-tipobar button').forEach(function(b) { b.classList.toggle('on', b.dataset.tipo === t); });
    document.getElementById('fl-ric-box').hidden = t !== 'ricarica';
    document.getElementById('fl-fuel-box').hidden = t === 'ricarica';
    document.getElementById('fl-edit-title').textContent = (_editingFlId ? 'Modifica ' : 'Nuova ') + (t === 'ricarica' ? 'ricarica' : 'rifornimento').replace(/^Nuova rif/, 'Nuovo rif');
  };
  window._flSetLuogo = function(l) {
    var prev = _editingLuogo; _editingLuogo = l;
    document.querySelectorAll('#fl-luogobar button').forEach(function(b) { b.classList.toggle('on', b.dataset.luogo === l); });
    var P = ricPref(), pr = document.getElementById('fl-r-prezzo');
    // cambia il prezzo solo se era quello predefinito dell'altro luogo (o vuoto)
    if (!pr.value || parseFloat(pr.value) === P[prev]) { pr.value = P[l].toFixed(2); pr.dispatchEvent(new Event('input')); }
  };

  /* ── Public functions ──────────────────────────────────────── */
  window.openFuelLog = function() {
    injectFuelLogUI();
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) {
      alert('Aggiungi prima un veicolo nel garage.');
      return;
    }
    document.getElementById('fl-overlay').classList.add('visible');
    document.getElementById('fl-hdr-veh').textContent =
      (v.customName || (v.marca + ' ' + v.modello)) + ' · ' + (v.type === 'moto' ? 'Moto' : 'Auto');
    renderFuelLog();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeFuelLog = function() {
    document.getElementById('fl-overlay').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  var _editingFlId = null;
  var _editingFull = true;

  window.openFuelLogEdit = function(id) {
    injectFuelLogUI();
    _editingFlId = id;
    var r = id ? loadAll().find(function(x) { return x.id === id; }) : null;
    document.getElementById('fl-edit-title').textContent = r ? 'Modifica rifornimento' : 'Nuovo rifornimento';

    // Defaults: date today, km from active vehicle's odometer or last refuel + 500
    var v = window.hubGarage && window.hubGarage.active();
    var refuels = v ? loadForVehicle(v.id) : [];
    var lastRefuel = refuels[refuels.length - 1];
    var defKm = r ? r.km : (lastRefuel ? (lastRefuel.km + 500) : (v ? (v.kmTot || 0) : 0));
    var defCarb = r ? r.carburante : (lastRefuel ? lastRefuel.carburante : 'Benzina');

    document.getElementById('fl-f-date').value = r ? (r.date || '') : window.hubToday();
    document.getElementById('fl-f-km').value = defKm || '';
    document.getElementById('fl-f-litri').value = r ? (r.litri || '') : '';
    document.getElementById('fl-f-prezzo').value = r ? (r.prezzoPerLitro || '') : '';
    document.getElementById('fl-f-totale').value = r ? (r.costoTotale || '') : '';
    document.getElementById('fl-f-carb').value = defCarb;
    document.getElementById('fl-f-distrib').value = r ? (r.distributore || '') : '';
    document.getElementById('fl-f-note').value = r ? (r.note || '') : '';
    _flSetFull(r ? !!r.isFull : true);

    // plug-in ed elettriche: scelta carburante / ricarica
    var plug = isPlug(v), ric = r ? isRic(r) : (v && v.alim === 'elettrica');
    document.getElementById('fl-tipobar').hidden = !plug && !ric;
    document.getElementById('fl-r-date').value = r ? (r.date || '') : window.hubToday();
    document.getElementById('fl-r-km').value = defKm || '';
    document.getElementById('fl-r-kwh').value = r && ric ? kwhDi(r) || '' : '';
    _editingLuogo = r && ric ? (r.luogo || 'casa') : 'casa';   // quasi sempre si carica a casa
    document.getElementById('fl-r-prezzo').value = r && ric ? (r.prezzoKwh || r.prezzoPerLitro || '') : ricPref()[_editingLuogo].toFixed(2);
    document.getElementById('fl-r-totale').value = r && ric ? (r.costoTotale || '') : '';
    document.querySelectorAll('#fl-luogobar button').forEach(function(b) { b.classList.toggle('on', b.dataset.luogo === _editingLuogo); });
    _flSetTipo(ric ? 'ricarica' : 'fuel');

    document.getElementById('fl-edit').classList.add('visible');
  };
  window.closeFuelLogEdit = function() {
    document.getElementById('fl-edit').classList.remove('visible');
  };

  window._flSetFull = function(full) {
    _editingFull = !!full;
    document.querySelectorAll('#fl-edit .fl-fullbar button').forEach(function(b) {
      b.classList.toggle('on', (b.dataset.full === '1') === !!full);
    });
  };

  window.saveFuelLogEdit = function() {
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) { alert('Nessun veicolo attivo.'); return; }
    if (_editingTipo === 'ricarica') return salvaRicarica(v);

    var date = document.getElementById('fl-f-date').value;
    var km = parseInt(document.getElementById('fl-f-km').value, 10);
    var litri = parseFloat(document.getElementById('fl-f-litri').value);
    var prezzo = parseFloat(document.getElementById('fl-f-prezzo').value);
    var totale = parseFloat(document.getElementById('fl-f-totale').value);

    if (!date || isNaN(km) || km < 0 || isNaN(litri) || litri <= 0) {
      alert('Compila almeno data, km e litri.');
      return;
    }
    if (isNaN(totale) && !isNaN(prezzo)) totale = litri * prezzo;
    if (isNaN(prezzo) && !isNaN(totale) && litri > 0) prezzo = totale / litri;

    var record = {
      vehicleId: v.id,
      date: date,
      km: km,
      litri: litri,
      prezzoPerLitro: isNaN(prezzo) ? null : prezzo,
      costoTotale: isNaN(totale) ? null : totale,
      carburante: document.getElementById('fl-f-carb').value,
      isFull: _editingFull,
      distributore: document.getElementById('fl-f-distrib').value.trim(),
      note: document.getElementById('fl-f-note').value.trim()
    };

    var all = loadAll();
    if (_editingFlId) {
      var i = all.findIndex(function(x) { return x.id === _editingFlId; });
      if (i >= 0) all[i] = Object.assign({}, all[i], record);
    } else {
      record.id = uid();
      all.push(record);
    }
    saveAll(all);

    // Update vehicle's odometer to the new max km
    if (window.hubGarage && km > (v.kmTot || 0)) {
      window.hubGarage.update(v.id, { kmTot: km });
      if (typeof window._hubRefreshGarageBadge === 'function') window._hubRefreshGarageBadge();
    }

    closeFuelLogEdit();
    renderFuelLog();
    refreshFuelLogBadge();
  };

  function salvaRicarica(v) {
    var date = document.getElementById('fl-r-date').value, km = parseInt(document.getElementById('fl-r-km').value, 10);
    var kwh = parseFloat(document.getElementById('fl-r-kwh').value), pr = parseFloat(document.getElementById('fl-r-prezzo').value), tot = parseFloat(document.getElementById('fl-r-totale').value);
    if (!date || isNaN(km) || km < 0 || isNaN(kwh) || kwh <= 0) { alert('Compila almeno data, km e kWh.'); return; }
    if (isNaN(tot) && !isNaN(pr)) tot = kwh * pr;
    if (isNaN(pr) && !isNaN(tot)) pr = tot / kwh;
    var rec = { vehicleId: v.id, tipo: 'ricarica', date: date, km: km, kwh: kwh, litri: null, luogo: _editingLuogo,
      prezzoKwh: isNaN(pr) ? null : pr, costoTotale: isNaN(tot) ? null : Math.round(tot * 100) / 100, carburante: 'Ricarica', isFull: false };
    var all = loadAll();
    if (_editingFlId) { var i = all.findIndex(function(x) { return x.id === _editingFlId; }); if (i >= 0) all[i] = Object.assign({}, all[i], rec); }
    else { rec.id = uid(); all.push(rec); }
    saveAll(all);
    if (window.hubGarage && km > (v.kmTot || 0)) { window.hubGarage.update(v.id, { kmTot: km }); if (typeof window._hubRefreshGarageBadge === 'function') window._hubRefreshGarageBadge(); }
    closeFuelLogEdit(); renderFuelLog(); refreshFuelLogBadge();
  }
  window._flPref = function(k, val) {
    var p = ricPref(), n = parseFloat(String(val).replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    p[k] = n; try { localStorage.setItem(RP_KEY, JSON.stringify(p)); } catch(e) {}
    renderFuelLog();
  };

  window.deleteRefuel = function(id) {
    if (!confirm('Eliminare questo rifornimento?')) return;
    var all = loadAll().filter(function(r) { return r.id !== id; });
    saveAll(all);
    renderFuelLog();
    refreshFuelLogBadge();
  };

  /* ── Render ─────────────────────────────────────────────────── */
  function renderFuelLog() {
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) return;
    var refuels = loadForVehicle(v.id);
    var stats = computeStats(refuels);

    var body = document.getElementById('fl-body');
    if (!body) return;

    var html = '';

    // Stats grid
    html += '<div class="fl-stats">';
    var consVal = stats.avgConsumption != null ? stats.avgConsumption.toFixed(1) : '—';
    var trendHtml = '';
    if (stats.trendPct != null) {
      var pct = stats.trendPct;
      var cls = pct > 2 ? 'fl-stat-trend-up' : pct < -2 ? 'fl-stat-trend-down' : 'fl-stat-trend-flat';
      var arrow = pct > 2 ? '▲' : pct < -2 ? '▼' : '—';
      var sign = pct > 0 ? '+' : '';
      trendHtml = '<span class="' + cls + '">' + arrow + ' ' + sign + pct.toFixed(1) + '% ult. 3</span>';
    }
    html += '<div class="fl-stat">' +
      '<div class="fl-stat-lbl">' + (isPlug(v) ? 'Carburante sui km totali' : 'Consumo medio') + '</div>' +
      '<div class="fl-stat-val">' + consVal + '<span style="font-size:.6rem;color:var(--t2);margin-left:4px">L/100km</span></div>' +
      (trendHtml ? '<div class="fl-stat-sub">' + trendHtml + '</div>' : '') +
      '</div>';
    html += '<div class="fl-stat">' +
      '<div class="fl-stat-lbl">Costo per km</div>' +
      '<div class="fl-stat-val">' + (stats.avgCostPerKm != null ? stats.avgCostPerKm.toFixed(3) : '—') +
        '<span style="font-size:.6rem;color:var(--t2);margin-left:4px">€/km</span></div>' +
      '</div>';
    html += '<div class="fl-stat">' +
      '<div class="fl-stat-lbl">' + (isPlug(v) ? 'Speso in carburante' : 'Totale speso') + '</div>' +
      '<div class="fl-stat-val">' + (stats.totalSpent || 0).toFixed(2) + ' €</div>' +
      '<div class="fl-stat-sub">' + (stats.totalLitres || 0).toFixed(1) + ' L · ' + stats.count + ' rif.</div>' +
      '</div>';
    html += '<div class="fl-stat">' +
      '<div class="fl-stat-lbl">Km percorsi</div>' +
      '<div class="fl-stat-val">' + (stats.totalKm || 0).toLocaleString('it-IT') + '</div>' +
      '<div class="fl-stat-sub">tracking</div>' +
      '</div>';
    html += '</div>';

    // Plug-in ed elettriche: energia elettrica + carburante sugli stessi km
    if (isPlug(v)) html += pannelloPlug(v, refuels);

    // Consumo dai viaggi importati (MyPeugeot & co.) nel Diario uscite
    var ts = window.hubTripStats ? window.hubTripStats(v.id) : null;
    if (ts && ts.consumo != null) {
      var diff = stats.avgConsumption != null ? (ts.consumo - stats.avgConsumption) / stats.avgConsumption * 100 : null;
      html += '<div class="fl-trips"><div><div class="fl-stat-lbl">Consumo dai viaggi importati</div>' +
        '<div class="fl-stat-val">' + ts.consumo.toFixed(1) + '<span style="font-size:.6rem;color:var(--t2);margin-left:4px">L/100km</span></div>' +
        '<div class="fl-stat-sub">' + ts.viaggi + ' viaggi · ' + Math.round(ts.km).toLocaleString('it-IT') + ' km · ' + ts.litri.toFixed(1) + ' L stimati' +
        (diff != null && Math.abs(diff) >= 3 ? ' · ' + (diff > 0 ? '+' : '') + diff.toFixed(0) + '% rispetto ai rifornimenti' : '') + '</div></div>' +
        '<button type="button" class="fl-trips-btn" onclick="openRideLog()">Diario ›</button></div>';
    }

    // Add button
    html += '<button class="fl-add-btn" onclick="openFuelLogEdit(null)">+ Nuovo ' + (isPlug(v) ? 'rifornimento o ricarica' : 'rifornimento') + '</button>';

    // List
    if (refuels.length === 0) {
      html += '<div class="fl-empty">Nessun rifornimento registrato.<br>Aggiungi il primo per iniziare a tracciare consumo e costo per km.</div>';
    } else {
      html += '<div class="fl-list-title">Storico (' + refuels.length + ')</div>';
      // Newest first
      var sorted = refuels.slice().sort(function(a, b) {
        return (b.km || 0) - (a.km || 0);
      });
      // Map intervals back to "to" record id for showing consumption inline
      var intervalByToId = {};
      stats.intervals.forEach(function(ix) { intervalByToId[ix.to.id] = ix; });

      html += sorted.map(function(r) {
        var dateNice = r.date ? r.date.split('-').reverse().join('/') : '—';
        if (isRic(r)) {
          var rm = [kwhDi(r).toFixed(1) + ' kWh'];
          if (r.costoTotale) rm.push((+r.costoTotale).toFixed(2) + ' €');
          if (r.prezzoKwh) rm.push((+r.prezzoKwh).toFixed(2) + ' €/kWh');
          rm.push((r.km || 0).toLocaleString('it-IT') + ' km');
          return '<div class="fl-row fl-row-ric"><div class="fl-row-info">' +
            '<div class="fl-row-date">' + escSafe(dateNice) + ' · 🔌 ' + (r.luogo === 'colonnina' ? 'Colonnina' : 'Casa') + '</div>' +
            '<div class="fl-row-meta">' + rm.join(' · ') + '</div></div>' +
            '<button class="fl-row-del" onclick="openFuelLogEdit(\'' + r.id + '\')" title="Modifica">✎</button>' +
            '<button class="fl-row-del" onclick="deleteRefuel(\'' + r.id + '\')" title="Elimina">✕</button></div>';
        }
        var meta = [];
        if (r.litri) meta.push((+r.litri).toFixed(2) + ' L');
        if (r.costoTotale) meta.push((+r.costoTotale).toFixed(2) + ' €');
        if (r.prezzoPerLitro) meta.push((+r.prezzoPerLitro).toFixed(3) + ' €/L');
        if (r.distributore) meta.push(escSafe(r.distributore));
        meta.push((r.km || 0).toLocaleString('it-IT') + ' km');
        if (!r.isFull) meta.push('parziale');

        var ix = intervalByToId[r.id];
        var consBlock = ix ?
          '<div class="fl-row-cons"><div class="fl-row-val">' + ix.consumption.toFixed(1) + '</div>' +
          '<div class="fl-row-unit">L/100km</div></div>' : '';

        return '<div class="fl-row">' +
          '<div class="fl-row-info">' +
            '<div class="fl-row-date">' + escSafe(dateNice) + ' · ' + escSafe(r.carburante || '—') + '</div>' +
            '<div class="fl-row-meta">' + meta.join(' · ') + '</div>' +
          '</div>' +
          consBlock +
          '<button class="fl-row-del" onclick="openFuelLogEdit(\'' + r.id + '\')" title="Modifica">✎</button>' +
          '<button class="fl-row-del" onclick="deleteRefuel(\'' + r.id + '\')" title="Elimina">✕</button>' +
        '</div>';
      }).join('');
    }

    body.innerHTML = html;
  }

  function pannelloPlug(v, refuels) {
    var E = energia(v, refuels), P = ricPref(), f2 = function(n) { return n.toFixed(2).replace('.', ','); };
    var prefs = '<div class="fl-plug-pref">' +
      '<label>🏠 Casa <input type="number" step="0.01" min="0" value="' + P.casa + '" onchange="_flPref(\'casa\',this.value)"> €/kWh</label>' +
      '<label>⚡ Colonnina <input type="number" step="0.01" min="0" value="' + P.colonnina + '" onchange="_flPref(\'colonnina\',this.value)"> €/kWh</label>' +
      '<label>Consumo elettrico tipico <input type="number" step="0.5" min="5" value="' + P.consEv + '" onchange="_flPref(\'consEv\',this.value)"> kWh/100 km</label></div>';
    if (!E) return '<div class="fl-plug"><div class="fl-plug-h">🔌 Plug-in</div><p class="fl-hint">Registra rifornimenti e ricariche con i km del contachilometri: con almeno due registrazioni calcolo quanta strada fai in elettrico e quanto ti costa ogni km.</p>' + prefs + '</div>';
    var cell = function(l, val, sub) { return '<div class="fl-stat"><div class="fl-stat-lbl">' + l + '</div><div class="fl-stat-val">' + val + '</div>' + (sub ? '<div class="fl-stat-sub">' + sub + '</div>' : '') + '</div>'; };
    var cmp = [['🏠 Ricarica a casa', P.consEv * P.casa], ['⚡ Colonnina', P.consEv * P.colonnina]];
    var lastF = refuels.filter(function(r) { return !isRic(r) && Number(r.prezzoPerLitro) > 0; }).pop(), med = null;
    try { med = window.hubMedie || JSON.parse(localStorage.getItem('hub_medie_v1') || 'null'); } catch(e) {}
    var pBenz = lastF ? Number(lastF.prezzoPerLitro) : med && med.Benzina ? (med.Benzina.self || med.Benzina.serv) : null;
    if (E.l100Term && pBenz) cmp.push(['⛽ Benzina', E.l100Term * pBenz]);
    var max = Math.max.apply(null, cmp.map(function(c) { return c[1]; }));
    return '<div class="fl-plug"><div class="fl-plug-h">🔌 Plug-in · ultimi ' + Math.round(E.km).toLocaleString('it-IT') + ' km</div>' +
      '<div class="fl-stats">' +
        cell('In elettrico', Math.round(E.quotaEv * 100) + '%', '≈ ' + Math.round(E.kmEv).toLocaleString('it-IT') + ' km stimati') +
        cell('Costo energia', f2(E.eurKm * 100) + ' €', 'ogni 100 km, tutto compreso') +
        cell('Elettricità', E.kwh100.toFixed(1).replace('.', ',') + ' kWh', 'per 100 km · ' + Math.round(E.kwh) + ' kWh, ' + (E.quotaCasa != null ? Math.round(E.quotaCasa * 100) + '% a casa' : '')) +
        cell('Carburante', E.l100.toFixed(1).replace('.', ',') + ' l', 'per 100 km' + (E.l100Term ? ' · ' + E.l100Term.toFixed(1).replace('.', ',') + ' l col motore termico' : '')) +
      '</div>' +
      '<div class="fl-plug-cmp"><div class="fl-stat-lbl">Costo per 100 km</div>' + cmp.map(function(c) {
        return '<div class="fl-plug-bar"><span>' + c[0] + '</span><i style="width:' + Math.max(6, c[1] / max * 100).toFixed(0) + '%"></i><b>' + f2(c[1]) + ' €</b></div>';
      }).join('') + '</div>' +
      '<p class="fl-hint">La quota in elettrico è stimata: kWh caricati diviso il consumo elettrico tipico. L\'auto non lo esporta, quindi regolalo se il tuo è diverso.</p>' + prefs + '</div>';
  }

  /* ── Badge: show avg consumption next to launch button ─────── */
  function refreshFuelLogBadge() {
    var b = document.getElementById('fl-launch-stat');
    if (!b) return;
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) { b.textContent = '—'; return; }
    var stats = computeStats(loadForVehicle(v.id)), E = isPlug(v) ? energia(v) : null;
    if (E) {
      b.textContent = Math.round(E.quotaEv * 100) + '% elettrico · ' + (E.eurKm * 100).toFixed(1).replace('.', ',') + ' €/100 km';
    } else if (stats.avgConsumption != null) {
      b.textContent = stats.avgConsumption.toFixed(1) + ' L/100km';
    } else if (window.hubTripStats && window.hubTripStats(v.id).consumo != null) {
      b.textContent = window.hubTripStats(v.id).consumo.toFixed(1) + ' L/100km';
    } else if (stats.count > 0) {
      b.textContent = stats.count + ' rif.';
    } else {
      b.textContent = 'Mai usato';
    }
  }
  window._hubRefreshFuelLogBadge = refreshFuelLogBadge;

  /* ── Init ───────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      injectFuelLogUI();
      refreshFuelLogBadge();
    }, 250); // after garage UI injection
  });

  // When user switches active vehicle, the badge needs to update too
  if (typeof window.useVehicle === 'function') {
    var _origUseVehicle = window.useVehicle;
    window.useVehicle = function(id) {
      var r = _origUseVehicle.apply(this, arguments);
      try { refreshFuelLogBadge(); } catch(e) {}
      return r;
    };
  }
})();

