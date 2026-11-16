/* ═══════════════════════════════════════════════════════════════════
   GARAGE — stime di bollo e assicurazione, dati gomme
   window.hubCosti = { REGIONI, GARANZIE, bollo(), rca(), euroDaAnno(),
                       alimDaDb(), gomme: { marche(), modelli(), misure() } }
   Tutte le cifre sono STIME: l'importo vero si verifica sul calcolatore
   ACI (bollo) e con un preventivo per targa (assicurazione).
   Fonti (novembre 2026):
   · tariffe bollo nazionali e regionali 2026: ACI, UNRAE
   · bollo moto 2026: Segugio (Euro 3+: 19,11 € fino a 11 kW + 0,88 €/kW oltre)
   · premio medio RCA auto: IVASS, II trimestre 2026 = 422 €
   · premio medio RC moto: Segugio, marzo 2026 = 389 €
   · garanzie accessorie (media): Segugio
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var ANNO = new Date().getFullYear();

  var REGIONI = ['Abruzzo', 'Basilicata', 'Bolzano (Alto Adige)', 'Calabria', 'Campania', 'Emilia-Romagna',
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia',
    'Sardegna', 'Sicilia', 'Toscana', 'Trento (Trentino)', 'Umbria', "Valle d'Aosta", 'Veneto'];

  // €/kW fino a 100 kW e per ogni kW oltre 100, per classe Euro (tariffa nazionale)
  var NAZ = { 0: [3.00, 4.50], 1: [2.90, 4.35], 2: [2.80, 4.20], 3: [2.70, 4.05], 4: [2.58, 3.87], 5: [2.58, 3.87], 6: [2.58, 3.87] };
  // Maggiorazioni regionali sulla tariffa nazionale
  var FATTORE = { 'Abruzzo': 1.21, 'Campania': 1.21, 'Emilia-Romagna': 1.10, 'Lazio': 1.10, 'Liguria': 1.10, 'Calabria': 1.10, 'Veneto': 1.10 };
  var TOSCANA_SOTTO = { 0: 1.157, 1: 1.13, 2: 1.10, 3: 1.075, 4: 1.05, 5: 1.05, 6: 1.05 };
  var BOLZANO_SOTTO = { 0: 2.70, 1: 2.61, 2: 2.52, 3: 2.43, 4: 2.32, 5: 2.09, 6: 1.96 };
  var DOMICILIAZIONE = { 'Lombardia': 0.15, 'Lazio': 0.10, 'Campania': 0.10 };
  // Moto: quota fissa fino a 11 kW + €/kW oltre gli 11
  var MOTO = { 0: [26, 1.70], 1: [23, 1.30], 2: [21, 1.00], 3: [19.11, 0.88], 4: [19.11, 0.88], 5: [19.11, 0.88] };

  function r2(n) { return Math.round(n * 100) / 100; }

  function euroDaAnno(anno, tipo) {
    anno = parseInt(anno, 10);
    if (!anno) return '';
    if (tipo === 'moto') return anno >= 2021 ? 5 : anno >= 2017 ? 4 : anno >= 2007 ? 3 : anno >= 2004 ? 2 : anno >= 2000 ? 1 : 0;
    return anno >= 2016 ? 6 : anno >= 2011 ? 5 : anno >= 2006 ? 4 : anno >= 2001 ? 3 : anno >= 1997 ? 2 : anno >= 1993 ? 1 : 0;
  }
  // "Benzina mild hybrid", "Plug-in Hybrid (benzina)" … → codice del modulo
  function alimDaDb(s) {
    s = String(s || '').toLowerCase();
    if (!s) return '';
    if (/plug/.test(s)) return 'plugin';
    if (/elettr|bev/.test(s) && !/ibrid|hybrid/.test(s)) return 'elettrica';
    if (/diesel/.test(s)) return /ibrid|hybrid/.test(s) ? 'diesel-ibrida' : 'diesel';
    if (/ibrid|hybrid/.test(s)) return 'ibrida';
    if (/gpl/.test(s)) return 'gpl';
    if (/metano|cng/.test(s)) return 'metano';
    return 'benzina';
  }
  function co2DaDb(s) { var m = /(\d{1,3})\s*g/.exec(String(s || '')); return m ? parseInt(m[1], 10) : null; }

  /* ── BOLLO ─────────────────────────────────────────────────────
     p = { tipo, kw, euro, alim, regione, annoImm, co2, domic }
     → { importo, base, righe:[testo], note:[testo], esente } oppure { errore } */
  function bollo(p) {
    var kw = Number(p.kw) || 0, euro = p.euro === '' || p.euro == null ? null : Number(p.euro);
    if (!p.regione) return { errore: 'Scegli la regione di residenza' };
    if (!kw) return { errore: 'Serve la potenza (CV nelle specifiche o scegli il motore)' };
    if (euro == null) return { errore: 'Scegli la classe Euro' };
    var eta = p.annoImm ? ANNO - p.annoImm : null;
    var righe = [], note = [], base;

    if (p.tipo === 'moto') {
      var t = MOTO[Math.min(euro, 5)];
      base = t[0] + Math.max(0, kw - 11) * t[1];
      righe.push(t[0].toFixed(2).replace('.', ',') + ' € fino a 11 kW' + (kw > 11 ? ' + ' + Math.round(kw - 11) + ' kW × ' + t[1].toFixed(2).replace('.', ',') + ' €' : ''));
      note.push('Moto: tariffa nazionale, alcune regioni hanno importi leggermente diversi.');
    } else {
      var t2 = NAZ[Math.min(euro, 6)].slice(), f = FATTORE[p.regione] || 1, sotto = t2[0] * f, sopra = t2[1] * f;
      if (p.regione === 'Toscana') { sotto = t2[0] * TOSCANA_SOTTO[Math.min(euro, 6)]; sopra = t2[1] * 1.10; }
      if (p.regione === 'Bolzano (Alto Adige)') { sotto = BOLZANO_SOTTO[Math.min(euro, 6)]; sopra = sotto * 1.5; note.push('Bolzano applica tariffe proprie anche in base alla CO₂: stima approssimata.'); }
      sotto = r2(sotto); sopra = r2(sopra);
      base = Math.min(kw, 100) * sotto + Math.max(0, kw - 100) * sopra;
      righe.push(Math.round(Math.min(kw, 100)) + ' kW × ' + sotto.toFixed(2).replace('.', ',') + ' €' + (kw > 100 ? ' + ' + Math.round(kw - 100) + ' kW × ' + sopra.toFixed(2).replace('.', ',') + ' €' : ''));
      // Superbollo
      if (kw > 185) {
        var sb = (kw - 185) * 20, rid = eta == null ? 1 : eta > 20 ? 0 : eta > 15 ? 0.15 : eta > 10 ? 0.30 : eta > 5 ? 0.60 : 1;
        if (rid > 0) { base += sb * rid; righe.push('Superbollo: ' + Math.round(kw - 185) + ' kW × 20 €' + (rid < 1 ? ' × ' + Math.round(rid * 100) + '% (età)' : '') + ' = ' + Math.round(sb * rid) + ' €'); }
        else righe.push('Superbollo: non dovuto (oltre 20 anni)');
      }
    }
    var importo = base, esente = false;

    // Veicoli storici
    if (eta != null && eta >= 30) {
      return { importo: 0, base: r2(base), esente: true, righe: righe,
        note: ['Oltre 30 anni: esente dal bollo. Se circola paga solo la tassa di circolazione forfettaria (circa 26 € auto, 10 € moto).'] };
    }
    if (eta != null && eta >= 20) note.push('Tra 20 e 29 anni con certificato di rilevanza storica (CRS) il bollo è ridotto del 50%.');

    // Elettriche
    var a = p.alim || '';
    if (a === 'elettrica') {
      var anniEsenzione = p.regione === "Valle d'Aosta" ? 8 : 5;
      if (p.regione === 'Lombardia' || p.regione === 'Piemonte') { importo = 0; esente = true; note.push('Elettrica: in ' + p.regione + ' esente dal bollo.'); }
      else if (eta != null && eta < anniEsenzione) { importo = 0; esente = true; note.push('Elettrica: esente per i primi ' + anniEsenzione + ' anni, poi paga il 25%.'); }
      else { importo = base * 0.25; note.push('Elettrica: dopo il periodo di esenzione paga il 25% della tariffa.'); }
    }
    // Ibride benzina-elettrico: agevolazioni regionali
    if (a === 'ibrida' || a === 'plugin') {
      var reg = p.regione, co2 = p.co2 || (a === 'plugin' ? 50 : 100);
      var esenteAnni = { 'Campania': 3, 'Liguria': 3, 'Sicilia': 3, 'Veneto': 3, 'Molise': 2 }[reg];
      if (reg === 'Lazio' && p.annoImm && p.annoImm <= 2022) esenteAnni = 3;
      if (reg === 'Marche' && kw <= 66 && p.annoImm >= 2023 && p.annoImm <= 2026) esenteAnni = 6;
      if (reg === 'Piemonte' && kw <= 100) {
        if (p.annoImm && p.annoImm < 2025) esenteAnni = 5;
        else if (eta != null && eta < 5) { importo = base * 0.5; note.push('Ibrida in Piemonte (dal 2025, fino a 100 kW): 50% per 5 anni.'); }
      }
      if (reg === 'Puglia') {
        if (eta != null && eta < 5) esenteAnni = 5;
        else { importo = base * 0.25; note.push('Ibrida in Puglia: dopo 5 anni di esenzione paga il 25%.'); }
      }
      if (reg === 'Lombardia' && kw <= 100 && p.annoImm >= 2026 && co2 <= 120) {
        var mesi = co2 <= 60 ? 5 : 2;
        if (eta != null && eta < mesi) { importo = base * 0.5; note.push('Ibrida in Lombardia (dal 2026, fino a 100 kW): 50% per ' + (mesi * 12) + ' mesi.'); }
      }
      if (esenteAnni && eta != null && eta < esenteAnni) { importo = 0; esente = true; note.push('Ibrida in ' + reg + ': esente per i primi ' + esenteAnni + ' anni.'); }
      else if (esenteAnni) note.push('Ibrida in ' + reg + ': il periodo di esenzione (' + esenteAnni + ' anni) è finito.');
      if (reg === 'Bolzano (Alto Adige)' || reg === 'Trento (Trentino)') note.push('Ibride: a ' + reg.split(' ')[0] + ' le riduzioni dipendono dalla CO₂, verifica su ACI.');
    }
    if (a === 'gpl' || a === 'metano') note.push('GPL/metano: alcune regioni riducono il bollo per le auto a gas dalla fabbrica. Verifica sul calcolatore ACI.');

    if (p.domic && DOMICILIAZIONE[p.regione] && importo > 0) {
      var sc = DOMICILIAZIONE[p.regione];
      importo = importo * (1 - sc);
      righe.push('Sconto domiciliazione bancaria −' + Math.round(sc * 100) + '%');
    }
    if (eta != null && eta >= 0 && eta < 1) note.push('Primo anno: si paga in proporzione ai mesi dall\'immatricolazione.');
    return { importo: r2(importo), base: r2(base), esente: esente, righe: righe, note: note };
  }

  /* ── ASSICURAZIONE ─────────────────────────────────────────────── */
  var GARANZIE = [
    { id: 'furto',      nome: 'Furto e incendio',      eur: 103 },
    { id: 'cristalli',  nome: 'Cristalli',             eur: 53 },
    { id: 'assistenza', nome: 'Assistenza stradale',   eur: 23 },
    { id: 'infortuni',  nome: 'Infortuni conducente',  eur: 28 },
    { id: 'legale',     nome: 'Tutela legale',         eur: 15 },
    { id: 'naturali',   nome: 'Eventi naturali',       eur: 208 },
    { id: 'vandalici',  nome: 'Atti vandalici',        eur: 121 },
    { id: 'minikasko',  nome: 'Collisione (mini-kasko)', eur: 118 },
    { id: 'kasko',      nome: 'Kasko',                 eur: 400 }
  ];
  var RCA_MEDIA = { auto: 422, moto: 389 };

  function rca(p) {
    var tipo = p.tipo === 'moto' ? 'moto' : 'auto', base = RCA_MEDIA[tipo], righe = [];
    righe.push((tipo === 'moto' ? 'RC moto, media nazionale (Segugio, mar 2026)' : 'RCA, media nazionale (IVASS, II trim. 2026)') + ': ' + base + ' €');
    var g = p.garanzie || [], extra = 0;
    // Kasko e mini-kasko non si sommano: la kasko comprende la collisione
    var hasKasko = g.indexOf('kasko') >= 0;
    GARANZIE.forEach(function(x) {
      if (g.indexOf(x.id) < 0 || (hasKasko && x.id === 'minikasko')) return;
      extra += x.eur; righe.push(x.nome + ': ~' + x.eur + ' €');
    });
    return { importo: base + extra, base: base, extra: extra, righe: righe,
      note: ['Media nazionale: il prezzo vero dipende da età, classe di merito, provincia e veicolo. Fai un preventivo con la targa.'] };
  }

  /* ── GOMME ───────────────────────────────────────────────────────
     Marche e linee di prodotto più diffuse in Italia (suggerimenti, si può
     scrivere qualsiasi altro nome). Tipo: e = estive, i = invernali,
     a = 4 stagioni, s = sportive/track, m = moto.  */
  var GOMME = {
    'Michelin':    { e: ['Primacy 4+', 'Primacy 5', 'e.Primacy', 'Pilot Sport 5', 'Pilot Sport 4 SUV'], s: ['Pilot Sport 4 S', 'Pilot Sport Cup 2'], a: ['CrossClimate 2', 'CrossClimate 2 SUV'], i: ['Alpin 7', 'Pilot Alpin 5'], m: ['Road 6', 'Power 6', 'Power GP2', 'Pilot Street 2', 'Anakee Adventure', 'Anakee Road', 'City Grip 2'] },
    'Pirelli':     { e: ['Cinturato P7 (C2)', 'Powergy', 'P Zero (PZ4)', 'Scorpion'], s: ['P Zero Corsa', 'P Zero Trofeo RS'], a: ['Cinturato All Season SF3', 'Scorpion All Season SF2'], i: ['Winter Sottozero 3', 'Scorpion Winter 2'], m: ['Diablo Rosso IV', 'Diablo Rosso IV Corsa', 'Angel GT II', 'Scorpion Trail II', 'Diablo Supercorsa SP V4', 'Angel Scooter'] },
    'Continental': { e: ['PremiumContact 7', 'EcoContact 6', 'UltraContact'], s: ['SportContact 7'], a: ['AllSeasonContact 2'], i: ['WinterContact TS 870', 'WinterContact TS 870 P'], m: ['ContiRoadAttack 4', 'ContiSportAttack 4', 'TKC 70', 'ContiRoad'] },
    'Bridgestone': { e: ['Turanza 6', 'Turanza T005', 'Potenza Sport'], s: ['Potenza Race'], a: ['Turanza All Season 6', 'Weather Control A005 Evo'], i: ['Blizzak 6', 'Blizzak LM005'], m: ['Battlax S23', 'Battlax T32', 'Battlax Hypersport S22', 'Battlax Adventure A41'] },
    'Goodyear':    { e: ['EfficientGrip Performance 2', 'Eagle F1 Asymmetric 6'], s: ['Eagle F1 SuperSport'], a: ['Vector 4Seasons Gen-3'], i: ['UltraGrip Performance 3'] },
    'Dunlop':      { e: ['Sport BluResponse', 'Sport Maxx RT2'], s: ['Sport Maxx Race 2'], a: ['Sport All Season'], i: ['Winter Sport 5'], m: ['Sportmax RoadSport 2', 'SportSmart TT', 'Sportmax Mutant', 'Trailmax Meridian', 'RoadSmart IV'] },
    'Hankook':     { e: ['Ventus Prime 4', 'Ventus S1 evo3', 'Kinergy Eco 2'], a: ['Kinergy 4S2'], i: ['Winter i*cept RS3'] },
    'Yokohama':    { e: ['BluEarth-GT AE51', 'Advan Sport V107'], a: ['BluEarth-4S AW21'], i: ['BluEarth-Winter V906'] },
    'Nokian':      { e: ['Powerproof 1', 'Wetproof 1'], a: ['Seasonproof 1'], i: ['Snowproof 2'] },
    'Vredestein':  { e: ['Ultrac', 'Ultrac Pro'], a: ['Quatrac', 'Quatrac Pro+'], i: ['Wintrac', 'Wintrac Pro+'] },
    'Falken':      { e: ['Ziex ZE310 Ecorun', 'Azenis FK520'], a: ['Euroall Season AS210'], i: ['Eurowinter HS02'] },
    'Kumho':       { e: ['Ecsta PS71', 'Ecowing ES31'], a: ['Solus 4S HA32'], i: ['WinterCraft WP52'] },
    'Toyo':        { e: ['Proxes Sport 2', 'Proxes Comfort'], a: ['Celsius AS2'], i: ['Observe S944'] },
    'Firestone':   { e: ['Roadhawk 2'], a: ['Multiseason 2'], i: ['Winterhawk 4'] },
    'BFGoodrich':  { e: ['Advantage', 'g-Force Phenom'], a: ['Advantage All-Season'], i: ['g-Force Winter 2'] },
    'Nexen':       { e: ["N'Fera Sport", "N'blue HD Plus"], a: ["N'blue 4Season 2"], i: ["Winguard Sport 2"] },
    'Uniroyal':    { e: ['RainSport 5', 'RainExpert 5'], a: ['AllSeasonExpert 2'], i: ['WinterExpert'] },
    'Kleber':      { e: ['Dynaxer HP4'], a: ['Quadraxer 3'], i: ['Krisalp HP3'] },
    'Metzeler':    { m: ['Roadtec 02', 'Sportec M9 RR', 'Racetec RR', 'Tourance Next 2', 'Karoo 4', 'Feelfree Wintec'] },
    'Avon':        { m: ['Spirit ST', 'Storm 3D X-M', 'Trailrider'] },
    'Mitas':       { m: ['Terra Force-R', 'Sport Force+', 'E-07'] },
    'Maxxis':      { e: ['Premitra HP5'], a: ['Premitra All Season AP3'], m: ['Supermaxx ST'] },
    'Heidenau':    { m: ['K60 Scout', 'K73'] }
  };
  var TIPO_MAP = { estive: ['e', 's'], invernali: ['i'], 'all-season': ['a'], track: ['s'] };

  function marcheGomme(tipoVeicolo) {
    return Object.keys(GOMME).filter(function(m) {
      var g = GOMME[m];
      return tipoVeicolo === 'moto' ? !!g.m : !!(g.e || g.a || g.i || g.s);
    });
  }
  function modelliGomme(marca, tipoVeicolo, tipoGomma) {
    var g = GOMME[marca];
    if (!g) return [];
    if (tipoVeicolo === 'moto') return (g.m || []).slice();
    var keys = TIPO_MAP[tipoGomma] || ['e', 's', 'a', 'i'], out = [];
    keys.forEach(function(k) { (g[k] || []).forEach(function(x) { out.push(x); }); });
    return out;
  }

  // db/tyres.json: { "Marca||Modello": { "2012–2024": { "175/65 R14": [ant, post], default: [..] } } }
  var _tyres = null, _tyresP = null;
  function caricaMisure() {
    if (_tyres) return Promise.resolve(_tyres);
    if (_tyresP) return _tyresP;
    _tyresP = fetch('db/tyres.json').then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(j) { _tyres = j; return j; })
      .catch(function(e) { _tyresP = null; throw e; });
    return _tyresP;
  }
  function anni(s) { var m = /(\d{4})\D+(\d{4})/.exec(s || ''); if (m) return [+m[1], +m[2]]; m = /(\d{4})/.exec(s || ''); return m ? [+m[1], ANNO] : null; }
  // Misure per marca/modello/serie, scegliendo la serie del file che si sovrappone di più agli anni scelti
  function misure(marca, modello, gen, annoImm) {
    if (!_tyres || !marca || !modello) return null;
    var base = String(modello).replace(/\s*\([^)]*\)/, '').replace(/\s+(?:(?:I|II|III|IV|V|VI|VII|VIII)\/)*(?:II|III|IV|VI|VII|VIII)$/, '').trim();
    var e = _tyres[marca + '||' + modello] || _tyres[marca + '||' + base];
    if (!e) return null;
    var gens = Object.keys(e), want = annoImm ? [annoImm, annoImm] : anni(gen), best = gens[0], bestOv = -1;
    if (want) gens.forEach(function(g) {
      var y = anni(g); if (!y) return;
      var ov = Math.min(y[1], want[1]) - Math.max(y[0], want[0]);
      if (ov > bestOv) { bestOv = ov; best = g; }
    });
    var row = e[best], out = [];
    Object.keys(row).forEach(function(k) { if (k !== 'default') out.push({ misura: k, ant: row[k][0], post: row[k][1] }); });
    return { serie: best, misure: out, standard: row['default'] || null };
  }

  window.hubCosti = {
    REGIONI: REGIONI, GARANZIE: GARANZIE, DOMICILIAZIONE: DOMICILIAZIONE,
    bollo: bollo, rca: rca, euroDaAnno: euroDaAnno, alimDaDb: alimDaDb, co2DaDb: co2DaDb,
    gomme: { marche: marcheGomme, modelli: modelliGomme, carica: caricaMisure, misure: misure }
  };
})();
