

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

  // Public API
  window.hubFuelLog = {
    list:    loadAll,
    listFor: loadForVehicle,
    save:    saveAll,
  };

  /* ── Compute stats ──────────────────────────────────────────── */
  function computeStats(refuels) {
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
  }

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
      '<div class="fl-stat-lbl">Consumo medio</div>' +
      '<div class="fl-stat-val">' + consVal + '<span style="font-size:.6rem;color:var(--t2);margin-left:4px">L/100km</span></div>' +
      (trendHtml ? '<div class="fl-stat-sub">' + trendHtml + '</div>' : '') +
      '</div>';
    html += '<div class="fl-stat">' +
      '<div class="fl-stat-lbl">Costo per km</div>' +
      '<div class="fl-stat-val">' + (stats.avgCostPerKm != null ? stats.avgCostPerKm.toFixed(3) : '—') +
        '<span style="font-size:.6rem;color:var(--t2);margin-left:4px">€/km</span></div>' +
      '</div>';
    html += '<div class="fl-stat">' +
      '<div class="fl-stat-lbl">Totale speso</div>' +
      '<div class="fl-stat-val">' + (stats.totalSpent || 0).toFixed(2) + ' €</div>' +
      '<div class="fl-stat-sub">' + (stats.totalLitres || 0).toFixed(1) + ' L · ' + stats.count + ' rif.</div>' +
      '</div>';
    html += '<div class="fl-stat">' +
      '<div class="fl-stat-lbl">Km percorsi</div>' +
      '<div class="fl-stat-val">' + (stats.totalKm || 0).toLocaleString('it-IT') + '</div>' +
      '<div class="fl-stat-sub">tracking</div>' +
      '</div>';
    html += '</div>';

    // Add button
    html += '<button class="fl-add-btn" onclick="openFuelLogEdit(null)">+ Nuovo rifornimento</button>';

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

  /* ── Badge: show avg consumption next to launch button ─────── */
  function refreshFuelLogBadge() {
    var b = document.getElementById('fl-launch-stat');
    if (!b) return;
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) { b.textContent = '—'; return; }
    var stats = computeStats(loadForVehicle(v.id));
    if (stats.avgConsumption != null) {
      b.textContent = stats.avgConsumption.toFixed(1) + ' L/100km';
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

