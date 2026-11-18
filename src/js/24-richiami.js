/* ═══════════════════════════════════════════════════════════════════
   HUB RICHIAMI — campagne di richiamo ufficiali per i veicoli del Garage
   Fonte: EU Safety Gate (avvisi "veicoli a motore"), tramite il Worker
   (/api/richiami, cache 1 giorno). Con il numero di telaio (VIN) l'app
   controlla se l'auto rientra negli intervalli di telaio dell'avviso.
   Dati: hub_richiami_v1 { "marca|modello": {ts, list} } · v.vin nel Garage
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(id) { return document.getElementById(id); }
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var KEY = 'hub_richiami_v1', DAY = 86400000;
  var RISCHI = { INJURIES: 'lesioni', FIRE: 'incendio', BURNS: 'ustioni', ELECTRIC_SHOCK: 'scossa elettrica', CHOKING: 'soffocamento', ENVIRONMENT: 'ambiente', DAMAGE_TO_PROPERTY: 'danni', OTHER: 'altro' };
  function base(modello) { return String(modello || '').trim().split(/\s+/)[0] || ''; }
  function chiave(v) { return (v.marca || '').toLowerCase() + '|' + base(v.modello).toLowerCase(); }
  function nomeV(v) { return v.customName || ((v.marca || '') + ' ' + (v.modello || '')).trim(); }

  function scarica(v, forza) {
    var k = chiave(v), c = jget(KEY, {})[k];
    if (!forza && c && Date.now() - c.ts < DAY) return Promise.resolve(c.list);
    var w = typeof WORKER !== 'undefined' ? WORKER : 'https://osservaprezzi.gabrycois.workers.dev';
    return fetch(w + '/api/richiami?marca=' + encodeURIComponent(v.marca || '') + '&modello=' + encodeURIComponent(base(v.modello)))
      .then(function(r) { return r.json().then(function(j) { if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status); return j; }); })
      .then(function(j) { var all = jget(KEY, {}); all[k] = { ts: Date.now(), list: j.richiami || [] }; jset(KEY, all); return all[k].list; });
  }
  // Il richiamo riguarda questa auto? 'tua' (telaio nell'intervallo) · 'forse' (stesso modello, da verificare) · 'no'
  function valuta(r, v) {
    var mod = base(v.modello), re = new RegExp('(^|[^a-z0-9])' + mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i');
    if (!mod || !re.test(r.modelli || '')) return { st: 'no', perche: 'altro modello' };
    var vin = String(v.vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    var mieRanges = (r.vin || []).filter(function(x) { return !x.m || re.test(x.m); });
    if (vin.length === 17 && mieRanges.length) {
      // stesso costruttore (prime 3 lettere), anno modello (10ª) e stabilimento + numero di serie (11ª-17ª) negli intervalli
      var dentro = mieRanges.some(function(x) {
        var da = x.da.toUpperCase(), a = x.a.toUpperCase();
        return da.slice(0, 3) === vin.slice(0, 3) && vin[9] >= da[9] && vin[9] <= a[9] && vin.slice(10) >= da.slice(10) && vin.slice(10) <= a.slice(10);
      });
      return dentro ? { st: 'tua', perche: 'il tuo telaio è nell\'intervallo dell\'avviso' } : { st: 'no', perche: 'il tuo telaio è fuori dagli intervalli indicati' };
    }
    // senza telaio: periodo di produzione rispetto all'anno di immatricolazione
    var anno = parseInt(v.annoImm, 10);
    if (anno && r.periodi && r.periodi.length) {
      var anni = [];
      r.periodi.forEach(function(p) { if (p.indexOf(':') < 0 || re.test(p.split(':')[0])) (p.match(/(19|20)\d{2}/g) || []).forEach(function(y) { anni.push(+y); }); });
      if (anni.length && (anno < Math.min.apply(null, anni) || anno > Math.max.apply(null, anni) + 1)) return { st: 'no', perche: 'prodotte in anni diversi dalla tua' };
    }
    return { st: 'forse', perche: vin.length === 17 ? 'stesso modello: verifica con l\'officina' : 'stesso modello: inserisci il telaio per saperlo' };
  }
  function perVeicolo(v) {
    var c = jget(KEY, {})[chiave(v)];
    return c ? c.list.map(function(r) { return Object.assign({ val: valuta(r, v) }, r); }).filter(function(r) { return r.val.st !== 'no' || r.val.perche !== 'altro modello'; }) : null;
  }
  // per la pagina Oggi: richiami che riguardano (o forse riguardano) le auto del Garage
  window.hubRichiamiDaFare = function() {
    var out = [];
    (window.hubGarage ? window.hubGarage.list() : []).forEach(function(v) {
      (perVeicolo(v) || []).forEach(function(r) {
        var risolti = v.richiamiFatti || [];
        if (risolti.indexOf(r.ref) >= 0 || r.val.st === 'no') return;
        out.push({ v: v, r: r, st: r.val.st });
      });
    });
    return out;
  };
  // controllo in background (una volta al giorno per marca e modello)
  window.hubRichiamiAggiorna = function() {
    var vs = (window.hubGarage ? window.hubGarage.list() : []).filter(function(v) { return v.marca && v.modello; });
    return Promise.all(vs.map(function(v) { return scarica(v).catch(function() { return null; }); }));
  };

  /* ── Pannello (Garage → Richiami) ───────────────────────────── */
  var stato = { load: false, err: '' };
  function inject() {
    if ($('ric-overlay')) return;
    var slot = $('garage-launch-slot');
    if (slot && !$('ric-launch-btn')) {
      var b = document.createElement('button');
      b.id = 'ric-launch-btn'; b.className = 'mt-launch'; b.type = 'button';
      b.innerHTML = '<span class="mt-launch-icon">🛡</span><span class="mt-launch-text">Richiami ufficiali</span><span class="mt-launch-stat" id="ric-launch-stat">—</span>';
      b.onclick = function() { window.openRichiami(); };
      slot.appendChild(b);
    }
    var ov = document.createElement('div');
    ov.id = 'ric-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'ric-title');
    ov.innerHTML = '<div class="mt-hdr"><h2 id="ric-title">RICHIAMI<small id="ric-veh">—</small></h2><button class="gar-close" onclick="closeRichiami()">✕ Chiudi</button></div><div class="mt-body" id="ric-body"></div>';
    document.body.appendChild(ov);
  }
  function render() {
    var v = window.hubGarage && window.hubGarage.active(), body = $('ric-body'); if (!body || !v) return;
    var list = perVeicolo(v), fatti = v.richiamiFatti || [];
    // se stai scrivendo il telaio, un aggiornamento della lista non deve cancellarlo
    var cur = $('ric-vin'), bozza = cur && document.activeElement === cur ? cur.value : null, fuoco = bozza != null;
    var html = '<div class="gar-field"><label for="ric-vin">Numero di telaio (VIN, 17 caratteri: libretto, campo E)</label>' +
      '<div class="ric-vinrow"><input id="ric-vin" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done" value="' + esc(bozza != null ? bozza : v.vin || '') + '" placeholder="es. VR3F4DGXTPY500007" oninput="ricVinInput(this)" onchange="ricVin()" onkeydown="if(event.key===\'Enter\'){this.blur();}"><button type="button" class="og-btn" onclick="ricVin()">Salva</button></div>' +
      (_vinMsg ? '<div class="ric-vinmsg' + (/^✓/.test(_vinMsg) ? ' ok' : '') + '" role="status">' + esc(_vinMsg) + '</div>' : '') + '</div>';
    if (stato.load) html += '<div class="wp-loading">Cerco gli avvisi ufficiali…</div>';
    else if (stato.err) html += '<div class="wp-error">' + esc(stato.err) + '</div>';
    else if (list && !list.length) html += '<p class="og-p og-ok">✓ Nessun richiamo per ' + esc(v.marca + ' ' + base(v.modello)) + ' negli avvisi europei degli ultimi 10 anni.</p>';
    if (list && list.length) {
      list.sort(function(a, b) { var o = { tua: 0, forse: 1, no: 2 }; return o[a.val.st] - o[b.val.st] || (b.data || '').localeCompare(a.data || ''); });
      html += list.map(function(r) {
        var fatto = fatti.indexOf(r.ref) >= 0, st = fatto ? 'fatto' : r.val.st;
        var badge = { tua: '⚠ Riguarda la tua auto', forse: 'Da verificare', no: 'Non riguarda la tua', fatto: '✓ Fatto' }[st];
        return '<div class="mt-card ric-card ric-' + st + '"><div class="ric-h"><b>' + esc(r.modelli) + '</b><span class="ric-badge">' + badge + '</span></div>' +
          '<div class="mt-card-meta">' + esc(r.data.split('-').reverse().join('/')) + ' · ' + esc(r.ref) + (r.tipi && r.tipi.length ? ' · rischio: ' + esc(r.tipi.map(function(t) { return RISCHI[t] || t.toLowerCase(); }).join(', ')) : '') + '</div>' +
          (r.rischio ? '<p class="ric-txt">' + esc(r.rischio) + '</p>' : '') +
          (r.misure && r.misure.length ? '<p class="ric-txt"><b>Rimedio:</b> ' + esc(r.misure.join(', ')) + '</p>' : '') +
          '<p class="ric-why">' + esc(fatto ? 'Segnato come fatto in officina' : r.val.perche) + '</p>' +
          '<div class="ric-act"><a href="' + esc(r.url) + '" target="_blank" rel="noopener">Avviso ufficiale ↗</a>' +
          (st !== 'no' ? '<button type="button" onclick="ricFatto(\'' + esc(r.ref) + '\')">' + (fatto ? 'Annulla' : '✓ Già fatto') + '</button>' : '') + '</div></div>';
      }).join('');
    }
    html += '<p class="mt-int-nota">Per sapere con certezza se la tua auto è coinvolta, chiama un\'officina autorizzata della marca con il numero di telaio: il richiamo è gratuito. Dal 17 febbraio 2026, se un richiamo non viene fatto entro 24 mesi, l\'auto finisce nell\'elenco dei veicoli non riparati e si rischiano una multa e la sospensione dalla circolazione.</p>' +
      '<p class="mt-int-nota">Fonte: Safety Gate, il sistema di allerta europeo. Non tutti i richiami nazionali finiscono lì: la verifica col costruttore resta quella che conta.</p>';
    body.innerHTML = html; badge();
    if (fuoco && $('ric-vin')) { var el = $('ric-vin'); el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
  }
  function badge() {
    var b = $('ric-launch-stat'); if (!b) return;
    var v = window.hubGarage && window.hubGarage.active(), l = v ? perVeicolo(v) : null, fatti = v && v.richiamiFatti || [];
    if (!l) { b.textContent = '—'; b.className = 'mt-launch-stat'; return; }
    var tua = l.filter(function(r) { return r.val.st === 'tua' && fatti.indexOf(r.ref) < 0; }).length, forse = l.filter(function(r) { return r.val.st === 'forse' && fatti.indexOf(r.ref) < 0; }).length;
    b.textContent = tua ? tua + ' per la tua auto' : forse ? forse + ' da verificare' : 'nessuno';
    b.className = 'mt-launch-stat' + (tua ? ' crit' : forse ? ' warn' : '');
  }
  // Telaio: maiuscolo, senza spazi; I, O e Q non esistono nei VIN → 1, 0, 0 (errori di battitura tipici)
  function pulisci(x) { return String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[OQ]/g, '0').replace(/I/g, '1'); }
  window.hubVin = { pulisci: pulisci };
  var _vinMsg = '';
  // salva da solo: appena il telaio è completo, quando esci dal campo o premi Invio
  window.ricVin = function(silenzioso) {
    var v = window.hubGarage.active(), el = $('ric-vin'); if (!v || !el) return;
    var val = pulisci(el.value);
    if (val && val.length !== 17) { if (!silenzioso) { _vinMsg = 'Il telaio ha 17 caratteri: ne hai scritti ' + val.length + '.'; render(); } return; }
    if (val === (v.vin || '')) { if (!silenzioso) { _vinMsg = val ? '✓ Telaio salvato' : ''; render(); } return; }
    var r = window.hubGarage.update(v.id, { vin: val });
    var ok = r && (window.hubGarage.active() || {}).vin === val;
    _vinMsg = !ok ? 'Non riesco a salvare: memoria del telefono piena?' : val ? '✓ Telaio salvato' : 'Telaio cancellato';
    render();
  };
  window.ricVinInput = function(el) { var p = pulisci(el.value); if (p.length === 17 && p !== ((window.hubGarage.active() || {}).vin || '')) ricVin(); };
  window.ricFatto = function(ref) {
    var v = window.hubGarage.active(), f = (v.richiamiFatti || []).slice(), i = f.indexOf(ref);
    if (i >= 0) f.splice(i, 1); else f.push(ref);
    window.hubGarage.update(v.id, { richiamiFatti: f }); render();
  };
  window.openRichiami = function() {
    inject();
    var v = window.hubGarage && window.hubGarage.active();
    if (!v) { alert('Aggiungi prima un veicolo nel Garage.'); return; }
    $('ric-veh').textContent = nomeV(v);
    $('ric-overlay').classList.add('visible');
    stato = { load: !perVeicolo(v), err: '' }; _vinMsg = ''; render();
    scarica(v).then(function() { stato.load = false; render(); }, function(e) { stato = { load: false, err: 'Avvisi non disponibili ora: ' + e.message }; render(); });
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeRichiami = function() { var o = $('ric-overlay'); if (o) o.classList.remove('visible'); if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility(); };
  window.hubRichiami = { valuta: valuta, scarica: scarica, perVeicolo: perVeicolo };
  document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { inject(); badge(); }, 350); });
})();
