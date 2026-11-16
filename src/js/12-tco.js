

/* ═══════════════════════════════════════════════════════════════════
   HUB TCO — Total Cost of Ownership per vehicle
   Aggrega: rifornimenti + manutenzioni + scadenze (bollo/RCA/revisione)
   Periodi: 12 mesi / 6 mesi / dall'inizio
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function fmtEur(n) {
    if (!n || isNaN(n)) return '0';
    return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function fmtEur2(n) {
    if (!n || isNaN(n)) return '0';
    return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Italian bollo + RCA estimates per vehicle type (very rough — user can override)
  // Bollo for moto: typically 0 < 11kW, ~50€ for 15kW, ~100€ for 25kW+
  // For auto: depends on kW + Euro class. We use rough averages.
  var ESTIMATED_ANNUAL_BOLLO = { auto: 250, moto: 60 };
  var ESTIMATED_ANNUAL_RCA   = { auto: 422, moto: 389 };   // medie nazionali 2026 (IVASS / Segugio)
  var ESTIMATED_REVISIONE    = 80;  // every 2 years for cars; every 4y for moto over 4y old

  /* ── State ──────────────────────────────────────────────────── */
  var _tcoVehicleId = null;   // current selected vehicle in TCO view
  var _tcoPeriod = '12m';     // '12m' | '6m' | 'all'

  function periodCutoffMs(period) {
    var now = Date.now();
    if (period === '6m')  return now - 6  * 30 * 86400000;
    if (period === '12m') return now - 12 * 30 * 86400000;
    return 0; // all time
  }
  function periodLabel(period, firstTs) {
    if (period === '6m')  return 'Ultimi 6 mesi';
    if (period === '12m') return 'Ultimi 12 mesi';
    if (firstTs) {
      var months = Math.max(1, Math.round((Date.now() - firstTs) / (30 * 86400000)));
      return 'Dall\'inizio · ' + months + (months === 1 ? ' mese' : ' mesi');
    }
    return 'Dall\'inizio';
  }

  /* ── Compute TCO breakdown for a vehicle/period ─────────────── */
  // Consumo medio dai rifornimenti a pieno (litri tra due pieni / km)
  function refuelAvgCons(refuels) {
    var s = refuels.slice().sort(function(a, b) { return a.km - b.km; }), prev = null, l = 0, L = 0, K = 0;
    s.forEach(function(r) {
      if (prev) { l += Number(r.litri) || 0; if (r.isFull && r.km > prev.km) { L += l; K += r.km - prev.km; prev = r; l = 0; } }
      else if (r.isFull) prev = r;
    });
    return K > 0 ? L / K * 100 : null;
  }
  // Prezzo al litro: ultimo rifornimento del veicolo → media nazionale del giorno (Carburanti) → valore indicativo
  function fuelPrice(vehicle, refuels) {
    var last = refuels.filter(function(r) { return Number(r.prezzoPerLitro) > 0; }).sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); })[0];
    if (last) return { eur: Number(last.prezzoPerLitro), src: 'il tuo ultimo rifornimento' };
    var a = vehicle.alim || '', fuel = /diesel/.test(a) ? 'Diesel' : a === 'gpl' ? 'GPL' : a === 'metano' ? 'Metano' : 'Benzina';
    var m = null;
    try { m = window.hubMedie || JSON.parse(localStorage.getItem('hub_medie_v1') || 'null'); } catch(_) {}
    var d = m && m[fuel];
    if (d && (d.self || d.serv)) return { eur: d.self || d.serv, src: 'media nazionale ' + fuel.toLowerCase() + ' self' };
    var fb = { Benzina: 1.75, Diesel: 1.70, GPL: 0.70, Metano: 1.40 }[fuel];
    return { eur: fb, src: 'prezzo indicativo ' + fuel.toLowerCase() };
  }

  // Consumo medio (rifornimenti, poi viaggi importati) e prezzo al litro: usati per il costo di un'uscita
  window.hubConsumoPrezzo = function(vehicle) {
    if (!vehicle || vehicle.alim === 'elettrica') return null;
    var refuels = [];
    try { refuels = JSON.parse(localStorage.getItem('hub_refuels_v1') || '[]').filter(function(r) { return r.vehicleId === vehicle.id; }); } catch(_) {}
    var cons = refuelAvgCons(refuels), src = 'rifornimenti';
    if (!cons && window.hubTripStats) { var ts = window.hubTripStats(vehicle.id); if (ts && ts.consumo) { cons = ts.consumo; src = 'viaggi importati'; } }
    if (!cons) return null;
    var pr = fuelPrice(vehicle, refuels);
    return pr ? { cons: cons, eur: pr.eur, src: 'consumo dai ' + src + ', ' + pr.src } : null;
  };

  function computeTCO(vehicle, period) {
    var cutoff = periodCutoffMs(period);
    var firstTs = null;

    // Refuels (carburante)
    var refuels = [];
    try { refuels = JSON.parse(localStorage.getItem('hub_refuels_v1') || '[]'); } catch(_) {}
    refuels = refuels.filter(function(r) { return r.vehicleId === vehicle.id; });
    var fuelCost = 0;
    var kmRange = { min: Infinity, max: -Infinity };
    refuels.forEach(function(r) {
      var rTs = r.date ? new Date(r.date).getTime() : 0;
      if (cutoff && rTs && rTs < cutoff) return;
      if (rTs && (!firstTs || rTs < firstTs)) firstTs = rTs;
      fuelCost += (Number(r.costoTotale) || 0);
      if (typeof r.km === 'number') {
        kmRange.min = Math.min(kmRange.min, r.km);
        kmRange.max = Math.max(kmRange.max, r.km);
      }
    });
    var kmInPeriod = (kmRange.max > kmRange.min) ? (kmRange.max - kmRange.min) : 0;
    var refuelsInPeriod = refuels.filter(function(r) { var t = r.date ? new Date(r.date).getTime() : 0; return !cutoff || !t || t >= cutoff; });

    // Viaggi del Diario uscite (ride registrate e viaggi importati da MyPeugeot, Google Maps…)
    var trips = [];
    try { trips = JSON.parse(localStorage.getItem('hub_rides_v1') || '[]'); } catch(_) {}
    trips = trips.filter(function(r) { return r.vehicleId === vehicle.id && r.distanceKm > 0 && (!cutoff || (r.startTs || 0) >= cutoff); });
    var tripKm = 0, consKm = 0, consL = 0;
    trips.forEach(function(r) {
      tripKm += r.distanceKm;
      if (r.startTs && (!firstTs || r.startTs < firstTs)) firstTs = r.startTs;
      if (r.consumo != null) { consKm += r.distanceKm; consL += r.litri != null ? r.litri : r.consumo * r.distanceKm / 100; }
    });
    // Senza rifornimenti nel periodo il carburante si stima dai viaggi: litri (consumo del viaggio,
    // oppure consumo medio per i viaggi senza dato) × prezzo al litro
    var fuelSrc = refuelsInPeriod.length ? 'rifornimenti' : 'nessuno', fuelEst = null;
    if (!refuelsInPeriod.length && tripKm > 0) {
      var avgCons = consKm > 0 ? consL / consKm * 100 : refuelAvgCons(refuels);
      if (avgCons) {
        var litri = consL + (tripKm - consKm) * avgCons / 100, pr = fuelPrice(vehicle, refuels);
        if (pr && vehicle.alim !== 'elettrica') {
          fuelCost = litri * pr.eur;
          fuelSrc = 'viaggi';
          fuelEst = { litri: litri, prezzo: pr.eur, prezzoSrc: pr.src, consumo: avgCons, consMisurato: consKm > 0, km: tripKm, viaggi: trips.length };
        }
      }
    }
    kmInPeriod = Math.max(kmInPeriod, Math.round(tripKm));

    // Maintenance (officina/ricambi)
    var maint = [];
    try { maint = JSON.parse(localStorage.getItem('hub_maint_v1') || '[]'); } catch(_) {}
    maint = maint.filter(function(m) { return m.vehicleId === vehicle.id; });
    var maintCost = 0;
    maint.forEach(function(m) {
      var mTs = m.doneDate ? new Date(m.doneDate).getTime() : (m.ts || 0);
      if (cutoff && mTs && mTs < cutoff) return;
      if (mTs && (!firstTs || mTs < firstTs)) firstTs = mTs;
      // 1. Prefer the explicit cost field (new entries)
      if (typeof m.cost === 'number' && !isNaN(m.cost)) {
        maintCost += m.cost;
        return;
      }
      // 2. Fallback: regex-parse note (legacy entries without cost field)
      var n = (m.note || '').replace(/\s+/g, ' ');
      var match = n.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur|euro)/i) ||
                  n.match(/(?:€|eur|euro)\s*(\d+(?:[.,]\d+)?)/i);
      if (match) maintCost += parseFloat(match[1].replace(',', '.')) || 0;
    });

    // Bollo: stima annuale × frazione di periodo coperta
    var months = period === '6m' ? 6 : period === '12m' ? 12 :
                 (firstTs ? Math.max(1, (Date.now() - firstTs) / (30 * 86400000)) : 12);
    var boType = vehicle.type === 'moto' ? 'moto' : 'auto';
    // Ordine: importo inserito → stima calcolata nel Garage (regione, kW, Euro) → media generica
    var bolloAnnuale = vehicle.costoBollo || (typeof vehicle.costoBolloStima === 'number' ? vehicle.costoBolloStima : ESTIMATED_ANNUAL_BOLLO[boType]);
    var bolloCost = bolloAnnuale * (months / 12);

    // RCA stimato
    var rcaAnnuale = vehicle.costoRca || vehicle.costoRcaStima || ESTIMATED_ANNUAL_RCA[boType];
    var rcaCost = rcaAnnuale * (months / 12);

    // Revisione: ogni 2 anni → costo ammortizzato 80/24 €/mese
    var revPerMese = ESTIMATED_REVISIONE / 24;
    var revCost = (vehicle.costoRev ? vehicle.costoRev / 24 : revPerMese) * months;

    var total = fuelCost + maintCost + bolloCost + rcaCost + revCost;
    // €/km: i costi fissi (bollo, assicurazione, revisione) contano solo per i mesi coperti dai dati,
    // altrimenti pochi km registrati darebbero un €/km enorme
    var fixedPerMonth = months > 0 ? (bolloCost + rcaCost + revCost) / months : 0;
    var covered = firstTs ? Math.min(months, Math.max(1, (Date.now() - firstTs) / (30.44 * 86400000))) : months;
    var costPerKm = kmInPeriod > 0 ? (fuelCost + maintCost + fixedPerMonth * covered) / kmInPeriod : 0;
    var costPerMonth = months > 0 ? total / months : 0;

    return {
      total: total,
      fuel: fuelCost,
      maint: maintCost,
      bollo: bolloCost,
      rca: rcaCost,
      bolloSrc: vehicle.costoBollo ? 'tuo' : typeof vehicle.costoBolloStima === 'number' ? 'stima' : 'media',
      rcaSrc: vehicle.costoRca ? 'tuo' : vehicle.costoRcaStima ? 'stima' : 'media',
      revisione: revCost,
      kmInPeriod: kmInPeriod,
      costPerKm: costPerKm,
      costPerMonth: costPerMonth,
      months: months,
      firstTs: firstTs,
      refuelCount: refuels.length,
      tripCount: trips.length,
      fuelSrc: fuelSrc,
      fuelEst: fuelEst,
      maintCount: maint.length
    };
  }

  /* ── UI Injection ───────────────────────────────────────────── */
  function injectTCOUI() {
    if (document.getElementById('tco-overlay')) return;

    // Launch button in garage section
    var slot = document.getElementById('garage-launch-slot');
    if (slot && !document.getElementById('tco-launch-btn')) {
      var b = document.createElement('button');
      b.id = 'tco-launch-btn';
      b.className = 'tco-launch';
      b.type = 'button';
      b.innerHTML =
        '<span class="tco-launch-icon">💰</span>' +
        '<span class="tco-launch-text">Costo possesso (TCO)</span>' +
        '<span class="tco-launch-stat" id="tco-launch-stat">—</span>';
      b.onclick = window.openTCO;
      slot.appendChild(b);
    }

    // Overlay
    var ov = document.createElement('div');
    ov.id = 'tco-overlay';
    ov.innerHTML =
      '<div class="tco-hdr">' +
        '<h2>COSTO POSSESSO<small>Carburante · Officina · Bollo · RCA · Revisione</small></h2>' +
        '<button class="gar-close" onclick="closeTCO()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="tco-body" id="tco-body"></div>';
    document.body.appendChild(ov);
  }

  /* ── Public ─────────────────────────────────────────────────── */
  window.openTCO = function() {
    injectTCOUI();
    var v = window.hubGarage && window.hubGarage.active();
    if (!v && window.hubGarage) {
      var list = window.hubGarage.list();
      if (list.length === 0) {
        alert('Aggiungi prima un veicolo nel garage.');
        return;
      }
      v = list[0];
    }
    _tcoVehicleId = v.id;
    document.getElementById('tco-overlay').classList.add('visible');
    renderTCO();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeTCO = function() {
    document.getElementById('tco-overlay').classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window._tcoSetPeriod = function(p) {
    _tcoPeriod = p;
    renderTCO();
  };
  window._tcoSetVehicle = function(id) {
    _tcoVehicleId = id;
    renderTCO();
  };

  /* ── Render ─────────────────────────────────────────────────── */
  function renderTCO() {
    var body = document.getElementById('tco-body');
    if (!body) return;
    var allVehicles = (window.hubGarage && window.hubGarage.list()) || [];
    var v = allVehicles.find(function(x) { return x.id === _tcoVehicleId; }) ||
            allVehicles[0];
    if (!v) {
      body.innerHTML = '<div class="tco-empty">Nessun veicolo nel garage.</div>';
      return;
    }
    _tcoVehicleId = v.id;

    var html = '';

    // Vehicle picker (only if more than 1 vehicle)
    if (allVehicles.length > 1) {
      html += '<div class="tco-veh-picker">';
      allVehicles.forEach(function(veh) {
        var lbl = (veh.type === 'moto' ? '🏍 ' : '🚗 ') + (veh.customName || (veh.marca + ' ' + veh.modello));
        var on = veh.id === v.id ? ' on' : '';
        html += '<button class="tco-veh-pick' + on + '" onclick="_tcoSetVehicle(\'' + veh.id + '\')">' + escSafe(lbl) + '</button>';
      });
      html += '</div>';
    }

    // Period selector
    html += '<div class="tco-period-bar">' +
      '<button class="' + (_tcoPeriod === '12m' ? 'on' : '') + '" onclick="_tcoSetPeriod(\'12m\')">12 mesi</button>' +
      '<button class="' + (_tcoPeriod === '6m'  ? 'on' : '') + '" onclick="_tcoSetPeriod(\'6m\')">6 mesi</button>' +
      '<button class="' + (_tcoPeriod === 'all' ? 'on' : '') + '" onclick="_tcoSetPeriod(\'all\')">Tutto</button>' +
    '</div>';

    // Compute
    var tco = computeTCO(v, _tcoPeriod);

    if (tco.refuelCount === 0 && tco.maintCount === 0 && !tco.tripCount) {
      html += '<div class="tco-empty">' +
        'Nessun rifornimento, intervento o viaggio registrato.<br>' +
        'Aggiungi rifornimenti in <strong>Consumi & Rifornimenti</strong>, interventi in <strong>Manutenzione</strong> o importa i viaggi nel <strong>Diario uscite</strong> per vedere il costo di possesso.' +
      '</div>';
      body.innerHTML = html;
      return;
    }

    var name = v.customName || (v.marca + ' ' + v.modello);
    html += '<div class="tco-totals">' +
      '<div class="tco-totals-veh">' + escSafe(name) + '</div>' +
      '<div class="tco-totals-main">' + fmtEur(tco.total) + ' €</div>' +
      '<div class="tco-totals-period">' + escSafe(periodLabel(_tcoPeriod, tco.firstTs)) + '</div>' +
      '<div class="tco-totals-grid">' +
        '<div class="tco-totals-cell">' +
          '<div class="tco-totals-lbl">Costo / km</div>' +
          '<div class="tco-totals-val">' + (tco.costPerKm > 0 ? fmtEur2(tco.costPerKm) + ' €' : '—') + '</div>' +
        '</div>' +
        '<div class="tco-totals-cell">' +
          '<div class="tco-totals-lbl">Costo / mese</div>' +
          '<div class="tco-totals-val">' + fmtEur(tco.costPerMonth) + ' €</div>' +
        '</div>' +
        '<div class="tco-totals-cell">' +
          '<div class="tco-totals-lbl">Km percorsi</div>' +
          '<div class="tco-totals-val">' + (tco.kmInPeriod || 0).toLocaleString('it-IT') + '</div>' +
        '</div>' +
        '<div class="tco-totals-cell">' +
          '<div class="tco-totals-lbl">Interventi</div>' +
          '<div class="tco-totals-val">' + tco.refuelCount + ' rif. · ' + tco.maintCount + ' man.' + (tco.tripCount ? ' · ' + tco.tripCount + ' viaggi' : '') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    // Breakdown
    var rows = [
      { lbl: 'Carburante' + (tco.fuelSrc === 'viaggi' ? ' (stima dai viaggi)' : ''), val: tco.fuel, color: '#5b9bd5' },
      { lbl: 'Manutenzione', val: tco.maint,     color: '#4caf7d' },
      { lbl: 'Bollo' + (tco.bolloSrc === 'tuo' ? '' : ' (stima)'),val: tco.bollo,     color: '#e8a030' },
      { lbl: 'Assicurazione' + (tco.rcaSrc === 'tuo' ? '' : ' (stima)'),  val: tco.rca,       color: '#c97fd4' },
      { lbl: 'Revisione',    val: tco.revisione, color: '#ff8a82' }
    ];
    var total = tco.total || 1;
    html += '<div class="tco-breakdown">' +
      '<div class="tco-breakdown-title">Scomposizione costi</div>' +
      '<div class="tco-bar">';
    rows.forEach(function(r) {
      var pct = (r.val / total) * 100;
      if (pct < 0.1) return;
      html += '<div class="tco-bar-seg" style="width:' + pct.toFixed(2) + '%;background:' + r.color + '" title="' + r.lbl + '">' +
        (pct >= 8 ? Math.round(pct) + '%' : '') +
      '</div>';
    });
    html += '</div>';
    html += '<div class="tco-rows">';
    rows.forEach(function(r) {
      var pct = (r.val / total) * 100;
      html += '<div class="tco-row">' +
        '<div class="tco-row-dot" style="background:' + r.color + '"></div>' +
        '<div class="tco-row-lbl">' + r.lbl + '</div>' +
        '<div class="tco-row-pct">' + pct.toFixed(0) + '%</div>' +
        '<div class="tco-row-val">' + fmtEur(r.val) + ' €</div>' +
      '</div>';
    });
    html += '</div></div>';

    // Insights
    var insights = [];
    if (tco.fuel > tco.total * 0.6 && tco.kmInPeriod > 0) {
      insights.push({
        icon: '⛽',
        txt: 'Il carburante è oltre il <strong>' + Math.round(tco.fuel / tco.total * 100) +
             '%</strong> della spesa. Considera carburanti premium o stile di guida più efficiente.'
      });
    }
    if (tco.maint === 0 && tco.maintCount > 0) {
      insights.push({
        icon: '💡',
        txt: 'Hai registrato <strong>' + tco.maintCount + '</strong> interventi senza costo. ' +
             'Aggiungi "120€" nelle note per vedere il vero TCO.'
      });
    }
    if (tco.kmInPeriod === 0 && tco.refuelCount >= 2) {
      insights.push({
        icon: '📍',
        txt: 'Mancano i km nei rifornimenti — non posso calcolare €/km. Aggiungi i km al pieno per stat più precise.'
      });
    }
    if (tco.costPerKm > 0 && tco.costPerKm < 0.15 && v.type === 'auto') {
      insights.push({
        icon: '🏆',
        txt: 'Costo €/km eccellente (<strong>' + fmtEur2(tco.costPerKm) + ' €/km</strong>). Sei sotto la media nazionale auto (~0.30 €/km).'
      });
    }
    if (tco.fuelEst) {
      var fe = tco.fuelEst;
      insights.unshift({
        icon: '🧮',
        txt: 'Carburante stimato dal Diario uscite: <strong>' + Math.round(fe.km).toLocaleString('it-IT') + ' km</strong> in ' + fe.viaggi + ' viaggi × ' +
          fe.consumo.toFixed(1) + ' l/100 km' + (fe.consMisurato ? ' (dai resoconti)' : ' (dai rifornimenti)') + ' = <strong>' + fe.litri.toFixed(0) + ' l</strong> a ' +
          fe.prezzo.toFixed(3) + ' €/l (' + fe.prezzoSrc + '). Registrando i rifornimenti il dato diventa reale.' +
          (v.alim === 'plugin' ? ' Per un plug-in conta solo la benzina: la ricarica elettrica non è inclusa.' : '')
      });
    }
    var srcTxt = { tuo: 'importo inserito da te', stima: 'stima calcolata nel Garage', media: 'media generica' };
    if (tco.bolloSrc !== 'tuo' || tco.rcaSrc !== 'tuo') insights.push({
      icon: 'ℹ',
      txt: 'Bollo: <strong>' + srcTxt[tco.bolloSrc] + '</strong> · Assicurazione: <strong>' + srcTxt[tco.rcaSrc] + '</strong>. ' +
           'Inserisci gli importi veri in Garage → Modifica per un TCO preciso.'
    });
    insights.forEach(function(ins) {
      html += '<div class="tco-insight">' +
        '<div class="tco-insight-icon">' + ins.icon + '</div>' +
        '<div class="tco-insight-txt">' + ins.txt + '</div>' +
      '</div>';
    });

    body.innerHTML = html;
  }

  /* ── Badge: show €/km of active vehicle ────────────────────── */
  function refreshTCOBadge() {
    var b = document.getElementById('tco-launch-stat');
    if (!b) return;
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) { b.textContent = '—'; return; }
    var tco = computeTCO(v, '12m');
    if (tco.refuelCount === 0 && tco.maintCount === 0 && !tco.tripCount) {
      b.textContent = 'Vuoto';
    } else if (tco.costPerKm > 0) {
      b.textContent = fmtEur2(tco.costPerKm) + ' €/km';
    } else {
      b.textContent = fmtEur(tco.total) + ' €/anno';
    }
  }
  window._hubRefreshTCOBadge = refreshTCOBadge;

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      injectTCOUI();
      refreshTCOBadge();
    }, 550);
  });

  if (typeof window.useVehicle === 'function') {
    var _origUseVehicleT = window.useVehicle;
    window.useVehicle = function(id) {
      var r = _origUseVehicleT.apply(this, arguments);
      try { refreshTCOBadge(); } catch(_) {}
      return r;
    };
  }
})();

