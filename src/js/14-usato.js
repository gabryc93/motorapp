/* ═══════════════════════════════════════════════════════════════════
   HUB USATO — il tuo "AutoScout personale"
   · Cerca            → stessa ricerca su AutoScout24, Automobile.it e Subito
                        (tramite il Worker), doppioni uniti, prezzo vs simili
   · Ricerche salvate → rilanciabili: segnala annunci nuovi e ribassati
   · Annunci salvati  → costo vero, giudizio, Area B, problemi noti (db.json)
   · Confronto        → tabella ordinata per costo vero d'acquisto
   Dati in localStorage (hub_usato_v1). Gli annunci si salvano dai risultati,
   a mano o incollando il JSON prodotto dalla skill cerca-usato.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var KEY = 'hub_usato_v1';

  /* ── Regole e tariffe: DA RIVERIFICARE quando cambiano ─────────────
     Passaggio di proprietà: voci ACI 2026 (lautomobile.aci.it).
     Area B Milano: regole in vigore e calendario (verificati il 16/11/2026). */
  var RULES = {
    verificato: '16/11/2026',
    passaggio: { fissi: 101.20, iptBase: 150.81, iptKw: 3.5119, sogliaKw: 53 },
    areaB: {
      link: 'https://www.comune.milano.it/aree-tematiche/mobilita/area-b',
      benzinaVietataFinoEuro: 3,          // Euro 0-3 benzina: vietate (Euro 3 dal 1/10/2025)
      benzinaEuro4Stop: '1/10/2028',
      dieselVietatoFinoEuro: 5,           // Euro 0-5 diesel: vietati
      dieselEuro6abcStop: '1/10/2028',
      dieselEuro6dStop: '1/10/2030'
    }
  };

  var STATI = [
    ['nuovo',      'Da contattare'],
    ['contattato', 'Contattato'],
    ['visto',      'Visto'],
    ['trattativa', 'In trattativa'],
    ['scartato',   'Scartato'],
    ['comprata',   'Comprata']
  ];
  var ALIM = ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrida', 'Plug-in', 'Elettrica'];

  /* ── Storage ─────────────────────────────────────────────────────── */
  function defaults() {
    return { settings: { budget: '', kmAnno: 10000, magg: 30, areaB: true, zip: '', raggio: 50, regione: '' }, searches: [], ads: [] };
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d || typeof d !== 'object') return defaults();
      var def = defaults();
      d.settings = Object.assign(def.settings, d.settings || {});
      d.searches = Array.isArray(d.searches) ? d.searches : [];
      d.ads = Array.isArray(d.ads) ? d.ads : [];
      return d;
    } catch (e) { return defaults(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Salvataggio non riuscito: memoria del browser piena'); }
  }
  var S = load();
  var view = 'cerca';
  var filtroStato = 'attivi';
  var db = null, dbState = 'idle';

  /* ── Utils ───────────────────────────────────────────────────────── */
  function h(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(v) {
    if (v == null || v === '') return null;
    var n = Number(String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function eur(n) { return n == null ? '—' : Math.round(n).toLocaleString('it-IT') + ' €'; }
  function kmf(n) { return n == null ? '—' : Math.round(n).toLocaleString('it-IT') + ' km'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function safeUrl(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  // Nome commerciale del modello senza serie: "Panda III" → "Panda", "Classe A (W176)" → "Classe A"
  function modelloBase(m) {
    return String(m || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+(?:(?:I|II|III|IV|V|VI|VII|VIII)\/)*(?:II|III|IV|VI|VII|VIII)$/, '').trim();
  }
  window.hubModelloBase = modelloBase;
  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    var t = $('us-toast');
    if (!t) { t = document.createElement('div'); t.id = 'us-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function() { t.classList.remove('on'); }, 2600);
  }
  function copy(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast('Copia non riuscita'); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() { toast(okMsg); }, fallback);
    } else fallback();
  }

  /* ── Database veicoli (lo stesso db.json della Diagnosi) ─────────── */
  // Scarica solo le marche degli annunci salvati (db diviso per marca)
  function loadDB() {
    var marche = S.ads.map(function(a) { return a.marca; }).filter(Boolean);
    var missing = marche.filter(function(m) { return !window.hubVDB.has(m); });
    if (!missing.length) { if (window._vdb) { db = window._vdb; dbState = 'ok'; } return; }
    if (dbState === 'loading') return;
    dbState = 'loading';
    window.hubVDB.ensure(missing)
      .then(function(j) { db = j; dbState = 'ok'; render(); if (openId && $('us-detail').classList.contains('visible')) renderDetail(); })
      .catch(function() { dbState = 'err'; render(); });
  }
  function catalog(tipo) {
    try { return tipo === 'moto' ? MOTORCYCLES : VEHICLES; } catch (e) { return {}; }
  }
  function dbKey(a) { return a.marca && a.modello && a.gen && a.motore ? [a.marca, a.modello, a.gen, a.motore].join('||') : ''; }
  function dbInfo(a) {
    var k = dbKey(a);
    if (!k || !db) return null;
    var v = db.vehicles && db.vehicles[k];
    var sp = db.specs && db.specs[k];
    return (v || sp) ? { v: v || {}, sp: sp || {} } : null;
  }

  /* ── Calcoli ─────────────────────────────────────────────────────── */
  function adKw(a) {
    if (num(a.kw)) return num(a.kw);
    var i = dbInfo(a);
    if (i && i.sp.potenza_kw) return i.sp.potenza_kw;
    var m = /(\d{2,3})\s*cv/i.exec(a.motore || a.titolo || '');
    return m ? Math.round(parseInt(m[1], 10) * 0.7355) : null;
  }
  // Passaggio di proprietà: voci fisse + IPT (con maggiorazione provinciale). Agenzia esclusa.
  function passaggio(a) {
    var P = RULES.passaggio, magg = 1 + (num(S.settings.magg) || 0) / 100;
    if (a.tipo === 'moto') return { tot: P.fissi, nota: 'solo voci fisse: verifica se per la tua moto è dovuta l\'IPT' };
    var kw = adKw(a);
    if (!kw) return { tot: P.fissi + P.iptBase * magg, nota: 'potenza non nota: stima minima (fino a 53 kW)' };
    var ipt = (kw <= P.sogliaKw ? P.iptBase : kw * P.iptKw) * magg;
    return { tot: P.fissi + ipt, nota: kw + ' kW · IPT +' + (num(S.settings.magg) || 0) + '%' };
  }
  function costoVero(a) {
    var p = num(a.prezzo);
    if (p == null) return null;
    return p + passaggio(a).tot + (num(a.lavori) || 0);
  }
  function areaB(a) {
    if (!S.settings.areaB || a.tipo === 'moto') return null;
    var R = RULES.areaB, al = (a.alim || '').toLowerCase(), e = num(a.euro);
    if (al === 'elettrica') return { st: 'ok', txt: 'Elettrica: entra sempre' };
    if (!al) return { st: 'nd', txt: 'Alimentazione non indicata' };
    if (e == null) return { st: 'nd', txt: 'Classe Euro non indicata: chiedi la foto del libretto' };
    if (al === 'diesel') {
      if (e <= R.dieselVietatoFinoEuro) return { st: 'no', txt: 'Diesel Euro ' + e + ': non entra in Area B (salvo MoVe-In o giorni di deroga)' };
      return { st: 'warn', txt: 'Diesel Euro 6: entra oggi. Stop dal ' + R.dieselEuro6abcStop + ' per le 6 A-B-C, dal ' + R.dieselEuro6dStop + ' per le 6 D-Temp e D: controlla la sottoclasse sul libretto' };
    }
    if (al === 'gpl' || al === 'metano') return { st: 'nd', txt: al.toUpperCase() + ' Euro ' + e + ': regole specifiche, verifica sul sito del Comune' };
    if (e <= R.benzinaVietataFinoEuro) return { st: 'no', txt: 'Benzina Euro ' + e + ': non entra in Area B (salvo MoVe-In o giorni di deroga)' };
    if (e === 4) return { st: 'warn', txt: 'Benzina Euro 4: entra fino al ' + R.benzinaEuro4Stop.replace('1/10', '30/9') + ', poi stop' };
    return { st: 'ok', txt: 'Euro ' + e + ': entra, nessuno stop già in calendario' };
  }
  // Media degli altri annunci salvati dello stesso modello (servono almeno 2 confronti)
  function mercato(a) {
    var p = num(a.prezzo);
    if (p == null || !a.modello) return null;
    var simili = S.ads.filter(function(x) {
      return x.id !== a.id && num(x.prezzo) != null && x.modello && slug(x.marca + ' ' + x.modello) === slug(a.marca + ' ' + a.modello);
    });
    if (simili.length < 2) return { n: simili.length };
    var media = simili.reduce(function(s, x) { return s + num(x.prezzo); }, 0) / simili.length;
    return { n: simili.length, media: media, delta: (p - media) / media * 100 };
  }
  function costoAnnuo(a) {
    var i = dbInfo(a), kmA = num(S.settings.kmAnno) || 10000, out = { kmAnno: kmA };
    if (i) {
      var cons = /([\d.,]+)\s*[–-]\s*([\d.,]+)/.exec(i.sp.consumo_reale || i.v.consumo_reale || '');
      var c = cons ? (num(cons[1]) + num(cons[2])) / 2 : num(i.sp.consumo_reale || i.v.consumo_reale);
      var prezzo = prezzoCarburante(a.alim);
      if (c && prezzo && /l\/100/i.test(i.sp.consumo_reale || i.v.consumo_reale || '')) {
        out.carburante = c / 100 * kmA * prezzo; out.consumo = c; out.prezzoL = prezzo;
      }
      out.assicurazione = i.v.assicurazione_fascia || '';
    }
    return out;
  }
  function prezzoCarburante(alim) {
    try {
      var c = JSON.parse(localStorage.getItem('hub_medie_cache_v1') || 'null');
      var map = { benzina: 'Benzina', ibrida: 'Benzina', 'plug-in': 'Benzina', diesel: 'Diesel', gpl: 'GPL' };
      var f = c && c.data && c.data[map[(alim || '').toLowerCase()]];
      return f ? (f.self || f.serv || null) : null;
    } catch (e) { return null; }
  }
  // Giudizio automatico: indicativo, basato solo sui dati inseriti
  function giudizio(a) {
    var scarta = [], riserva = [], note = [];
    var cv = costoVero(a), budget = num(S.settings.budget), km = num(a.km), anno = num(a.immatr);
    var ab = areaB(a), m = mercato(a), i = dbInfo(a);
    if (ab && ab.st === 'no') scarta.push(ab.txt);
    if (budget && cv && cv > budget * 1.1) scarta.push('Costo vero ' + eur(cv) + ': oltre il 10% sopra il budget di ' + eur(budget));
    else if (budget && cv && cv > budget) riserva.push('Costo vero ' + eur(cv) + ': sopra il budget di ' + eur(budget));
    if (ab && ab.st === 'warn') riserva.push(ab.txt);
    if (ab && ab.st === 'nd') riserva.push(ab.txt);
    if (i && i.v.affidabilita === 'bassa') riserva.push('Affidabilità bassa per questo motore: guarda i problemi noti');
    if (km != null && km > 200000) riserva.push('Oltre 200.000 km: contano solo fatture e storico manutenzione');
    if (km != null && anno) {
      var eta = Math.max(1, new Date().getFullYear() - anno), kma = km / eta;
      if (kma < 3000) riserva.push('Solo ' + Math.round(kma).toLocaleString('it-IT') + ' km/anno: verifica i km sullo storico revisioni');
      if (kma > 30000) riserva.push(Math.round(kma).toLocaleString('it-IT') + ' km/anno: uso molto intenso');
    }
    if (m && m.delta != null && m.delta < -20) riserva.push('Prezzo ' + Math.abs(Math.round(m.delta)) + '% sotto la media dei tuoi annunci: sconto da spiegare');
    if ((a.alim || '').toLowerCase() === 'diesel' && (num(S.settings.kmAnno) || 0) < 10000) riserva.push('Diesel per meno di 10.000 km/anno: rischio FAP intasato');
    if (a.venditore !== 'conc') note.push('Privato: nessuna garanzia, "vista e piaciuta"');
    if (!a.targa) note.push('Targa mancante: chiedila prima della visita');
    var st = scarta.length ? 'scarta' : riserva.length ? 'riserva' : 'ok';
    return { st: st, label: { scarta: 'Scarta', riserva: 'Da vedere con riserva', ok: 'Da vedere' }[st], scarta: scarta, riserva: riserva, note: note };
  }

  /* ── Link ai portali ─────────────────────────────────────────────── */
  function portali(q) {
    var moto = q.tipo === 'moto', nome = ((q.marca || '') + ' ' + modelloBase(q.modello)).trim(), out = [];
    var path = [slug(q.marca), slug(modelloBase(q.modello))].filter(Boolean).join('/');
    var fuel = { Benzina: 'B', Diesel: 'D', GPL: 'L', Metano: 'C', Elettrica: 'E', Ibrida: '2', 'Plug-in': '2' }[q.alim];
    var p = ['atype=' + (moto ? 'B' : 'C'), 'cy=I', 'sort=price', 'desc=0', 'ustate=N%2CU'];
    if (num(q.prezzoMax)) p.push('priceto=' + num(q.prezzoMax));
    if (num(q.kmMax)) p.push('kmto=' + num(q.kmMax));
    if (num(q.annoMin)) p.push('fregfrom=' + num(q.annoMin));
    if (num(q.annoMax)) p.push('fregto=' + num(q.annoMax));
    if (fuel) p.push('fuel=' + fuel);
    if (q.cambio === 'Manuale') p.push('gear=M');
    if (q.cambio === 'Automatico') p.push('gear=A');
    if (/^\d{5}$/.test(q.zip || '')) { p.push('zip=' + q.zip); p.push('zipr=' + (num(q.raggio) || 50)); }
    out.push(['AutoScout24', 'https://www.autoscout24.it/lst' + (path ? '/' + path : '') + '?' + p.join('&')]);
    var sp = [];
    if (nome) sp.push('q=' + encodeURIComponent(nome));
    if (num(q.prezzoMax)) sp.push('pe=' + num(q.prezzoMax));
    if (num(q.annoMin)) sp.push('ys=' + num(q.annoMin));
    if (num(q.annoMax)) sp.push('ye=' + num(q.annoMax));
    out.push(['Subito', 'https://www.subito.it/annunci-italia/vendita/' + (moto ? 'moto-e-scooter' : 'auto') + '/?' + sp.join('&')]);
    var wp = ['keywords=' + encodeURIComponent(nome || (moto ? 'moto' : 'auto')), 'category_ids=' + (moto ? '14000' : '100')];
    if (num(q.prezzoMax)) wp.push('max_sale_price=' + num(q.prezzoMax));
    out.push(['Wallapop', 'https://it.wallapop.com/app/search?' + wp.join('&')]);
    var g = encodeURIComponent((nome || 'usato') + ' usata' + (num(q.prezzoMax) ? ' ' + num(q.prezzoMax) + ' euro' : ''));
    out.push([moto ? 'Moto.it (Google)' : 'Automobile.it (Google)', 'https://www.google.com/search?q=site:' + (moto ? 'moto.it' : 'automobile.it') + '+' + g]);
    return out;
  }


  /* ── Ricerca sui portali ─────────────────────────────────────────
     Il Worker legge la pagina dei risultati di AutoScout24, Automobile.it e
     Subito (/api/usato) e restituisce annunci uniformi. Qui si uniscono i
     doppioni tra portali, si confronta ogni prezzo con gli annunci simili
     trovati e si applica lo stesso giudizio degli annunci salvati. */
  var PORTALI = [['autoscout24', 'AutoScout24'], ['automobile', 'Automobile.it'], ['subito', 'Subito']];
  var REGIONI = ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto'];
  var PROV = {};
  ('abruzzo:AQ CH PE TE|basilicata:MT PZ|calabria:CS CZ KR RC VV|campania:AV BN CE NA SA|emilia-romagna:BO FC FE MO PC PR RA RE RN|' +
   'friuli-venezia-giulia:GO PN TS UD|lazio:FR LT RI RM VT|liguria:GE IM SP SV|lombardia:BG BS CO CR LC LO MB MI MN PV SO VA|marche:AN AP FM MC PU|' +
   'molise:CB IS|piemonte:AL AT BI CN NO TO VB VC|puglia:BA BR BT FG LE TA|sardegna:CA NU OR SS SU|sicilia:AG CL CT EN ME PA RG SR TP|' +
   'toscana:AR FI GR LI LU MS PI PO PT SI|trentino-alto-adige:BZ TN|umbria:PG TR|valle-d-aosta:AO|veneto:BL PD RO TV VE VI VR').split('|').forEach(function(r) {
    var p = r.split(':'); p[1].split(' ').forEach(function(s) { PROV[s] = p[0]; });
  });
  // Regione dalle prime due cifre del CAP (AutoScout24 dà il CAP, non sempre la provincia)
  var CAPREG = {};
  ('lazio:00-04|umbria:05-06|sardegna:07-09|piemonte:10,12-15,28|valle-d-aosta:11|liguria:16-19|lombardia:20-27,46|emilia-romagna:29,40-44,47,48|' +
   'veneto:30-32,35-37,45|friuli-venezia-giulia:33,34|trentino-alto-adige:38,39|toscana:50-59|marche:60-63|abruzzo:64-67|puglia:70-74,76|' +
   'basilicata:75,85|campania:80-84|molise:86|calabria:87-89|sicilia:90-98').split('|').forEach(function(r) {
    var p = r.split(':');
    p[1].split(',').forEach(function(x) { var ab = x.split('-'), a = +ab[0], b = +(ab[1] || ab[0]); for (var i = a; i <= b; i++) CAPREG[('0' + i).slice(-2)] = p[0]; });
  });
  var CAPOLUOGO = { 'abruzzo': ['65121', 100], 'basilicata': ['85100', 100], 'calabria': ['88100', 150], 'campania': ['80121', 120], 'emilia-romagna': ['40121', 150],
    'friuli-venezia-giulia': ['33100', 100], 'lazio': ['00118', 130], 'liguria': ['16121', 150], 'lombardia': ['20121', 150], 'marche': ['60121', 120], 'molise': ['86100', 70],
    'piemonte': ['10121', 150], 'puglia': ['70121', 200], 'sardegna': ['09170', 200], 'sicilia': ['93100', 200], 'toscana': ['50121', 150], 'trentino-alto-adige': ['38121', 120],
    'umbria': ['06121', 80], 'valle-d-aosta': ['11100', 50], 'veneto': ['35121', 130] };
  function regSlug(r) { return slug(String(r || '').replace(/\s*\(.*$/, '').replace(/^(Bolzano|Trento)$/, 'Trentino-Alto Adige').replace("'", ' ')); }
  function provDi(citta) {
    var m = /\(([A-Z]{2})\)|(?:^|[\s-])([A-Z]{2})\s*$/.exec(String(citta || '').toUpperCase().trim());
    return m ? (m[1] || m[2]) : '';
  }
  function workerBase() {
    try { if (typeof WORKER === 'string' && WORKER) return WORKER; } catch (e) {}
    return window.WORKER || 'https://osservaprezzi.gabrycois.workers.dev';
  }
  function defRegione() {
    if (S.settings.regione) return S.settings.regione;
    try { var g = JSON.parse(localStorage.getItem('hub_garage_prefs_v1') || '{}').regione; return g ? regSlug(g) : ''; } catch (e) { return ''; }
  }
  function med(arr) { if (!arr.length) return null; var s = arr.slice().sort(function(a, b) { return a - b; }), i = (s.length - 1) / 2; return (s[Math.floor(i)] + s[Math.ceil(i)]) / 2; }
  function quart(arr, q) { var s = arr.slice().sort(function(a, b) { return a - b; }); return s.length ? s[Math.min(s.length - 1, Math.round((s.length - 1) * q))] : null; }
  // Anni a cavallo tra due normative: la classe Euro dall'anno non è affidabile
  var EURO_DUBBI = { 2000: 1, 2001: 1, 2005: 1, 2006: 1, 2009: 1, 2010: 1, 2011: 1, 2014: 1, 2015: 1 };

  var R = null;    // ricerca in corso: { q, fromId, st:{portale:{…}}, items:[], sort, solo, nuovi:{}, ribassi:{} }

  function toAd(x, q) {
    var euro = x.euro, stim = false;
    if (euro == null && x.anno && q.tipo !== 'moto' && !EURO_DUBBI[x.anno] && window.hubCosti) { euro = window.hubCosti.euroDaAnno(x.anno, 'auto'); stim = true; }
    return {
      id: x.id, tipo: q.tipo, titolo: x.titolo, marca: x.marca || q.marca, modello: x.modello || modelloBase(q.modello), gen: '', motore: '',
      immatr: x.anno || '', prezzo: x.prezzo, km: x.km, alim: x.alim || '', euro: euro == null ? '' : euro, euroStimata: stim,
      cambio: /auto/i.test(x.cambio || '') ? 'Automatico' : x.cambio ? 'Manuale' : '', kw: x.kw || '',
      venditore: x.venditore === 'concessionario' ? 'conc' : 'privato', venditoreNome: x.venditoreNome || '',
      citta: x.citta || '', link: safeUrl(x.link), foto: safeUrl(x.foto), portale: x.portale, data: x.data || '',
      altri: [], fonte: 'portale',
      // dati che non tornano (es. immatricolata 2023 ma "Euro 4"): da chiarire col libretto
      incoerente: x.euro != null && x.anno && q.tipo !== 'moto' && window.hubCosti && Math.abs(window.hubCosti.euroDaAnno(x.anno, 'auto') - x.euro) >= 2
    };
  }
  function dupKey(a) { return [a.immatr, Math.round((a.km || 0) / 100), slug(String(a.citta).split(/[\s(,-]/)[0])].join('|'); }

  function cerca(q, fromId) {
    R = { q: q, fromId: fromId || null, st: {}, items: [], sort: R && R.sort || 'conv', solo: R && R.solo || 'tutti', f: {}, nuovi: {}, ribassi: {}, t: Date.now() };
    view = 'cerca';
    PORTALI.forEach(function(p) {
      if (p[0] === 'automobile' && q.tipo === 'moto') { R.st[p[0]] = { stato: 'na', nome: p[1] }; return; }
      R.st[p[0]] = { stato: 'load', nome: p[1], pagina: 0 };
      carica(p[0], 1);
    });
    render();
  }
  function params(q, portale, pagina) {
    var p = new URLSearchParams({ portale: portale, tipo: q.tipo === 'moto' ? 'moto' : 'auto', pagina: String(pagina) });
    if (q.marca) p.set('marca', q.marca);
    if (q.modello) p.set('modello', modelloBase(q.modello));
    if (num(q.prezzoMax)) p.set('prezzoMax', String(num(q.prezzoMax)));
    if (num(q.annoMin)) p.set('annoMin', String(num(q.annoMin)));
    if (num(q.kmMax)) p.set('kmMax', String(num(q.kmMax)));
    if (q.alim) p.set('alim', q.alim.toLowerCase());
    if (/^\d{5}$/.test(q.zip || '')) { p.set('cap', q.zip); p.set('raggio', String(num(q.raggio) || 50)); }
    var rg = q.regione || '';
    if (rg && portale === 'subito') p.set('regione', rg);
    // AutoScout24 non filtra per regione: si cerca attorno al capoluogo, poi si tolgono gli annunci fuori regione
    if (rg && portale === 'autoscout24' && !/^\d{5}$/.test(q.zip || '') && CAPOLUOGO[rg]) { p.set('cap', CAPOLUOGO[rg][0]); p.set('raggio', String(CAPOLUOGO[rg][1])); }
    return p;
  }
  function carica(portale, pagina) {
    var run = R, st = R.st[portale];
    st.stato = 'load';
    fetch(workerBase() + '/api/usato?' + params(R.q, portale, pagina))
      .then(function(r) {
        return r.json().catch(function() { return {}; }).then(function(j) {
          if (r.status === 404 && !j.portale) throw new Error('Ricerca non ancora attiva sul Worker: va pubblicata la nuova versione');
          if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status);
          return j;
        });
      })
      .then(function(j) {
        if (run !== R) return;
        st.stato = 'ok'; st.pagina = pagina; st.pagine = j.pagine || 1; st.totale = j.totale || 0; st.url = safeUrl(j.url);
        aggiungi(j.annunci || []);
        st.n = R.items.filter(function(a) { return a.portale === st.nome || a.altri.some(function(o) { return o.portale === st.nome; }); }).length;
        fine();
      })
      .catch(function(e) {
        if (run !== R) return;
        st.stato = 'err'; st.errore = e.message || String(e);
        fine();
      });
  }
  function aggiungi(list) {
    var q = R.q, rg = q.regione;
    list.forEach(function(x) {
      var a = toAd(x, q);
      if (num(a.prezzo) == null || !a.link) return;
      if (num(q.annoMax) && a.immatr && a.immatr > num(q.annoMax)) return;
      if (q.cambio && a.cambio && a.cambio !== q.cambio) return;
      // zona: Subito filtra già per regione; per gli altri si usa la provincia, se si legge
      if (rg && !/^\d{5}$/.test(q.zip || '')) {
        var pv = provDi(a.citta), reg = pv && PROV[pv] ? PROV[pv] : /^\d{5}$/.test(x.cap || '') ? CAPREG[x.cap.slice(0, 2)] : '';
        if (reg && reg !== rg) return;
      }
      var k = dupKey(a), dup = a.immatr && a.km ? R.items.filter(function(b) { return dupKey(b) === k && b.portale !== a.portale; })[0] : null;
      if (dup) { if (!dup.altri.some(function(o) { return o.link === a.link; })) dup.altri.push({ portale: a.portale, prezzo: a.prezzo, link: a.link }); return; }
      if (R.items.some(function(b) { return b.id === a.id; })) return;
      R.items.push(a);
    });
    confronti();
  }
  // Prezzo rispetto agli annunci simili trovati (±1 anno, km entro ±40%); con meno di 5 simili, confronto con tutti
  function confronti() {
    var all = R.items.map(function(a) { return num(a.prezzo); });
    R.mediana = med(all);
    R.items.forEach(function(a) {
      var sim = R.items.filter(function(b) {
        return b !== a && b.immatr && a.immatr && Math.abs(b.immatr - a.immatr) <= 1 && (!a.km || !b.km || Math.abs(b.km - a.km) <= Math.max(20000, a.km * 0.4));
      }).map(function(b) { return num(b.prezzo); });
      var base = sim.length >= 5 ? sim : all.filter(function(p, i) { return R.items[i] !== a; });
      a.cmp = { n: base.length, simili: sim.length >= 5, mediana: med(base) };
      a.delta = a.cmp.mediana ? (num(a.prezzo) - a.cmp.mediana) / a.cmp.mediana * 100 : null;
      a.sospetto = num(a.prezzo) < 300 || (a.cmp.mediana >= 1500 && num(a.prezzo) < a.cmp.mediana * 0.5);
    });
  }
  function fine() {
    var busy = Object.keys(R.st).some(function(k) { return R.st[k].stato === 'load'; });
    if (!busy && R.fromId && !R.marcati) {
      R.marcati = true;
      var s = S.searches.filter(function(x) { return x.id === R.fromId; })[0];
      if (s) {
        var visti = s.visti || {}, prima = !s.ultima;
        R.items.forEach(function(a) {
          if (!prima && !(a.id in visti)) R.nuovi[a.id] = 1;
          else if (visti[a.id] && num(a.prezzo) < visti[a.id]) R.ribassi[a.id] = visti[a.id];
          visti[a.id] = num(a.prezzo);
        });
        var keys = Object.keys(visti); if (keys.length > 600) keys.slice(0, keys.length - 600).forEach(function(k) { delete visti[k]; });
        s.visti = visti; s.ultima = Date.now(); s.ultimiNuovi = Object.keys(R.nuovi).length; save();
      }
    }
    if (view === 'cerca') render();
  }
  function altriRisultati() {
    PORTALI.forEach(function(p) { var st = R.st[p[0]]; if (st && st.stato === 'ok' && st.pagina < Math.min(3, st.pagine)) carica(p[0], st.pagina + 1); });
    render();
  }
  function ordina(list) {
    var f = {
      conv: function(a) { var g = giudizio(a).st; return a.sospetto ? 1e9 : (g === 'scarta' ? 1e6 : 0) + (g === 'riserva' || a.incoerente ? 15 : 0) + (a.delta == null ? 0 : a.delta); },
      costo: function(a) { return costoVero(a) || 1e12; },
      prezzo: function(a) { return num(a.prezzo) == null ? 1e12 : num(a.prezzo); },
      km: function(a) { return a.km == null ? 1e12 : a.km; },
      anno: function(a) { return -(a.immatr || 0); }
    }[R.sort] || function() { return 0; };
    return list.slice().sort(function(a, b) { return f(a) - f(b); });
  }

  function renderCerca() {
    var html = renderSearchBox();
    if (!R) return html + '<div class="us-empty"><b>Cerca su tutti i portali insieme</b>Imposta marca, modello e budget: AutoHub cerca su AutoScout24, Automobile.it e Subito, unisce i doppioni e ti dice per ogni annuncio il costo vero, se entra in Area B e se il prezzo è in linea con quelli simili.</div>';
    var q = R.q;
    html += '<div class="us-pstat">' + PORTALI.map(function(p) {
      var st = R.st[p[0]] || {};
      var txt = st.stato === 'load' ? 'cerco…' : st.stato === 'ok' ? (st.n || 0) + ' su ' + (st.totale || 0).toLocaleString('it-IT') : st.stato === 'na' ? 'solo auto' : 'non raggiungibile';
      var link = st.url || (portali(q).filter(function(x) { return x[0].indexOf(p[1].split('.')[0]) === 0; })[0] || [])[1];
      return '<a class="us-ps us-ps-' + (st.stato || 'na') + '"' + (link ? ' href="' + h(link) + '" target="_blank" rel="noopener noreferrer"' : '') + ' title="' + h(st.errore || 'Apri la ricerca sul portale') + '">' +
        '<b>' + h(p[1]) + '</b><span>' + txt + '</span></a>';
    }).join('') + '</div>';
    var errs = PORTALI.filter(function(p) { return R.st[p[0]] && R.st[p[0]].stato === 'err'; });
    if (errs.length) html += '<p class="us-fine">' + errs.map(function(p) { return h(p[1]) + ': ' + h(R.st[p[0]].errore); }).join(' · ') + '. Tocca il portale per aprire la ricerca direttamente.</p>';
    var busy = PORTALI.some(function(p) { return R.st[p[0]] && R.st[p[0]].stato === 'load'; });
    if (!R.items.length) return html + (busy ? '<div class="us-empty us-loading">Cerco sui portali…</div>' : '<div class="us-empty"><b>Nessun annuncio con questi criteri</b>Prova ad alzare il prezzo, allargare la zona o togliere l\'anno minimo.</div>');

    var prezzi = R.items.map(function(a) { return num(a.prezzo); });
    var nN = Object.keys(R.nuovi).length, nR = Object.keys(R.ribassi).length;
    html += '<div class="us-sum"><div><small>Annunci</small><b>' + R.items.length + '</b></div><div><small>Prezzo mediano</small><b>' + eur(R.mediana) + '</b></div>' +
      '<div><small>Metà centrale</small><b>' + eur(quart(prezzi, .25)) + ' – ' + eur(quart(prezzi, .75)) + '</b></div></div>';
    if (R.valore) html += renderValore();
    html += '<div class="us-bar us-bar-sm">' + (R.fromId ? '<span class="us-saved">✓ Ricerca salvata: rilanciala da Ricerche per vedere i nuovi annunci</span>'
      : '<button class="us-btn" data-act="q-save">☆ Salva ricerca</button><span class="us-saved">per ritrovare i nuovi annunci e i ribassi</span>') + '</div>';
    if (nN || nR) html += '<p class="us-news">' + (nN ? '<b>' + nN + ' nuovi</b> dall\'ultima ricerca' : '') + (nN && nR ? ' · ' : '') + (nR ? '<b>' + nR + ' ribassati</b>' : '') + '</p>';
    html += '<div class="us-rbar"><label class="us-f us-f-inl"><span>Ordina</span><select data-rs="sort">' +
      [['conv', 'Più convenienti'], ['prezzo', 'Prezzo più basso'], ['costo', 'Costo vero'], ['km', 'Meno km'], ['anno', 'Più recenti']].map(function(o) { return '<option value="' + o[0] + '"' + (R.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<div class="us-chips">' + [['tutti', 'Tutti'], ['privato', 'Privati'], ['conc', 'Concessionari'], ['ok', 'Solo da vedere']].concat(nN ? [['nuovi', 'Nuovi']] : []).map(function(c) {
        return '<button class="' + (R.solo === c[0] ? 'on' : '') + '" data-act="r-solo" data-v="' + c[0] + '">' + c[1] + '</button>';
      }).join('') + '</div></div>';
    html += renderFiltri();
    var list = ordina(R.items.filter(function(a) {
      if (!passaFiltri(a)) return false;
      if (R.solo === 'privato' || R.solo === 'conc') return a.venditore === R.solo;
      if (R.solo === 'ok') return !a.sospetto && !a.incoerente && giudizio(a).st === 'ok';
      if (R.solo === 'nuovi') return !!R.nuovi[a.id];
      return true;
    }));
    if (list.length < R.items.length) html += '<p class="us-fcount">' + list.length + ' di ' + R.items.length + ' annunci · <button class="us-link" data-act="rf-reset">mostra tutti</button></p>';
    html += list.length ? list.map(cardRisultato).join('') : '<div class="us-empty">Nessun annuncio con questi filtri.</div>';
    var more = PORTALI.some(function(p) { var st = R.st[p[0]]; return st && st.stato === 'ok' && st.pagina < Math.min(3, st.pagine); });
    if (busy) html += '<div class="us-empty us-loading">Carico altri risultati…</div>';
    else if (more) html += '<div class="us-bar"><button class="us-btn" data-act="r-more">Carica altri annunci</button></div>';
    html += '<p class="us-fine">Risultati letti dai portali il ' + new Date(R.t).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) +
      ': un annuncio può essere già venduto, conferma col venditore. Classe Euro "stimata" = dedotta dall\'anno: fa fede il libretto. Il confronto prezzi usa solo gli annunci trovati in questa ricerca.</p>';
    return html;
  }
  function cardRisultato(a) {
    var g = giudizio(a), cv = costoVero(a), ab = areaB(a), saved = S.ads.some(function(x) { return x.link === a.link || x.pid === a.id; });
    var st = a.sospetto ? 'scarta' : g.st;
    var tags = [];
    if (R.nuovi[a.id]) tags.push('<span class="us-t us-t-new">Nuovo</span>');
    if (R.ribassi[a.id]) tags.push('<span class="us-t us-t-ok">Ribassato da ' + eur(R.ribassi[a.id]) + '</span>');
    if (a.sospetto) tags.push('<span class="us-t us-t-no">Prezzo sospetto: troppo basso</span>');
    if (a.incoerente) tags.push('<span class="us-t us-t-warn">Anno e classe Euro non tornano</span>');
    else if (a.delta != null) tags.push('<span class="us-t us-t-' + (a.delta <= -10 ? 'ok' : a.delta >= 10 ? 'no' : 'nd') + '">' + (a.delta > 0 ? '+' : '') + Math.round(a.delta) + '% vs ' + (a.cmp.simili ? 'simili' : 'media ricerca') + '</span>');
    if (ab) tags.push('<span class="us-t us-t-' + ab.st + '">Area B ' + { ok: 'sì', no: 'no', warn: 'a termine', nd: 'da verificare' }[ab.st] + '</span>');
    tags.push('<span class="us-t">' + (a.venditore === 'conc' ? 'Concessionario' : 'Privato') + '</span>');
    var portaliTxt = [a.portale].concat(a.altri.map(function(o) { return o.portale + (o.prezzo !== a.prezzo ? ' ' + eur(o.prezzo) : ''); })).join(' · ');
    return '<article class="us-card us-res us-st-' + st + '">' +
      (a.foto ? '<a class="us-res-img" href="' + h(a.link) + '" target="_blank" rel="noopener noreferrer"><img loading="lazy" referrerpolicy="no-referrer" alt="" src="' + h(a.foto) + '"></a>' : '') +
      '<div class="us-res-body"><header><h3>' + h(a.titolo) + '</h3>' + badgeG(a.sospetto ? { st: 'scarta', label: 'Sospetto' } : g) + '</header>' +
      '<div class="us-meta">' + [a.immatr, kmf(num(a.km)), a.alim + (a.euro !== '' ? ' Euro ' + a.euro + (a.euroStimata ? ' (stimata)' : '') : ''), a.cambio, a.citta].filter(function(x) { return x && x !== '—'; }).map(h).join(' · ') + '</div>' +
      '<div class="us-nums"><div><small>Annuncio</small><b>' + eur(num(a.prezzo)) + '</b></div><div><small>Costo vero</small><b class="us-cv">' + eur(cv) + '</b></div>' +
      '<div><small>Mediana simili</small><b>' + eur(a.cmp && a.cmp.mediana) + '</b></div></div>' +
      '<div class="us-tags">' + tags.join('') + '</div>' +
      (g.scarta.length || g.riserva.length ? '<p class="us-why">' + h((g.scarta[0] || g.riserva[0])) + '</p>' : '') +
      '<div class="us-res-act"><span class="us-res-src">' + h(portaliTxt) + '</span>' +
      '<a class="us-btn" href="' + h(a.link) + '" target="_blank" rel="noopener noreferrer">Apri ↗</a>' +
      (saved ? '<span class="us-btn us-done">Salvato ✓</span>' : '<button class="us-btn us-pri" data-act="r-save" data-id="' + h(a.id) + '">Salva</button>') +
      '</div></div></article>';
  }
  /* Filtri sui risultati (solo in pagina: non rifanno la ricerca) */
  function passaFiltri(a) {
    var f = R.f, p = num(a.prezzo), t;
    if (num(f.pmin) != null && p < num(f.pmin)) return false;
    if (num(f.pmax) != null && p > num(f.pmax)) return false;
    if (num(f.kmmax) != null && a.km != null && a.km > num(f.kmmax)) return false;
    if (num(f.anno) != null && a.immatr && a.immatr < num(f.anno)) return false;
    if (f.alim && f.alim.length && f.alim.indexOf(a.alim || '?') < 0) return false;
    if (f.cambio && a.cambio !== f.cambio) return false;
    if (f.portale && f.portale.length && !f.portale.some(function(x) { return a.portale === x || a.altri.some(function(o) { return o.portale === x; }); })) return false;
    if (f.areaB) { t = areaB(a); if (!t || (f.areaB === 'ok' ? t.st !== 'ok' : t.st !== 'ok' && t.st !== 'warn')) return false; }
    if (f.pulito && (a.sospetto || a.incoerente)) return false;
    if (f.foto && !a.foto) return false;
    if (f.testo) {
      var hay = slug(a.titolo + ' ' + a.citta + ' ' + a.venditoreNome);
      if (!slug(f.testo).split('-').filter(Boolean).every(function(w) { return hay.indexOf(w) >= 0; })) return false;
    }
    return true;
  }
  function nFiltri() {
    var f = R.f; return ['pmin', 'pmax', 'kmmax', 'anno', 'cambio', 'areaB', 'pulito', 'foto', 'testo'].filter(function(k) { return f[k]; }).length +
      (f.alim && f.alim.length ? 1 : 0) + (f.portale && f.portale.length ? 1 : 0);
  }
  function renderFiltri() {
    var f = R.f, alims = uniq(R.items.map(function(a) { return a.alim || '?'; })), port = uniq(R.items.map(function(a) { return a.portale; })), n = nFiltri();
    var chip = function(k, v, label) {
      var on = (f[k] || []).indexOf(v) >= 0;
      return '<button class="' + (on ? 'on' : '') + '" data-act="rf-tog" data-k="' + k + '" data-v="' + h(v) + '" aria-pressed="' + on + '">' + h(label || v) + '</button>';
    };
    var inp = function(k, ph, mode) { return '<input data-rf="' + k + '" ' + (mode === 'text' ? 'type="search"' : 'inputmode="numeric"') + ' placeholder="' + ph + '" value="' + h(f[k] || '') + '">'; };
    return '<details class="us-set us-filt"' + (R.filtriAperti ? ' open' : '') + '><summary>Filtri' + (n ? ' <i>' + n + ' attivi</i>' : ' <i>prezzo, km, alimentazione…</i>') + '</summary>' +
      '<div class="us-grid">' +
      fld('Prezzo (€)', '<span class="us-pair us-pair-eq">' + inp('pmin', 'da') + inp('pmax', 'a') + '</span>') +
      fld('Km massimi', inp('kmmax', 'es. 150000')) +
      fld('Anno dal', inp('anno', 'es. 2015')) +
      fld('Cambio', '<select data-rf="cambio">' + opts(['Manuale', 'Automatico'], f.cambio, 'Qualsiasi') + '</select>') +
      '</div>' +
      fld('Cerca nel titolo o città', inp('testo', 'es. 4x4, GPL, Monza', 'text')) +
      (alims.length > 1 ? '<div class="us-flbl">Alimentazione</div><div class="us-chips us-chips-wrap">' + alims.map(function(x) { return chip('alim', x, x === '?' ? 'Non indicata' : x); }).join('') + '</div>' : '') +
      (port.length > 1 ? '<div class="us-flbl">Portale</div><div class="us-chips us-chips-wrap">' + port.map(function(x) { return chip('portale', x); }).join('') + '</div>' : '') +
      (R.q.tipo !== 'moto' && S.settings.areaB ? '<div class="us-flbl">Area B</div><div class="us-chips us-chips-wrap">' +
        [['', 'Qualsiasi'], ['entra', 'Entra oggi'], ['ok', 'Senza scadenza']].map(function(o) { return '<button class="' + ((f.areaB || '') === o[0] ? 'on' : '') + '" data-act="rf-set" data-k="areaB" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' : '') +
      '<label class="us-chk"><input type="checkbox" data-rf="pulito"' + (f.pulito ? ' checked' : '') + '> Nascondi prezzi sospetti e dati incoerenti</label>' +
      '<label class="us-chk"><input type="checkbox" data-rf="foto"' + (f.foto ? ' checked' : '') + '> Solo con foto</label>' +
      (n ? '<div class="us-bar"><button class="us-btn" data-act="rf-reset">Azzera filtri</button></div>' : '') +
      '</details>';
  }
  function renderValore() {
    var v = R.valore, sim = R.items.filter(function(a) { return !a.sospetto && a.immatr && Math.abs(a.immatr - v.anno) <= 1 && (!v.km || !a.km || Math.abs(a.km - v.km) <= Math.max(20000, v.km * 0.3)); });
    var p = sim.map(function(a) { return num(a.prezzo); });
    if (p.length < 3) return '<div class="us-pick"><small>Quanto vale la tua</small><b>Pochi annunci confrontabili (' + p.length + ')</b><span>Allarga la ricerca o carica altri annunci per una stima affidabile.</span></div>';
    return '<div class="us-pick"><small>Quanto vale la tua ' + h(v.nome) + '</small><b>' + eur(med(p)) + '</b>' +
      '<span>Mediana di ' + p.length + ' annunci simili (±1 anno' + (v.km ? ', km comparabili' : '') + '), metà centrale ' + eur(quart(p, .25)) + ' – ' + eur(quart(p, .75)) + '. Sono prezzi richiesti, non di vendita: si chiude di solito un po\' sotto, e in permuta un concessionario offre meno.</span></div>';
  }
  function renderSearchBox() {
    var d = R ? R.q : (quick || (quick = { tipo: 'auto', prezzoMax: S.settings.budget, zip: S.settings.zip, raggio: S.settings.raggio || 50, regione: defRegione() }));
    var c = cascata(d);
    return '<details class="us-set us-qbox"' + (R ? '' : ' open') + '><summary>' + (R ? h(descr(d)) + ' <i>modifica</i>' : 'Nuova ricerca') + '</summary>' +
      '<div class="us-seg us-seg-sm"><button class="' + (d.tipo !== 'moto' ? 'on' : '') + '" data-act="q-tipo" data-v="auto">Auto</button><button class="' + (d.tipo === 'moto' ? 'on' : '') + '" data-act="q-tipo" data-v="moto">Moto</button></div>' +
      '<div class="us-grid">' +
      fld('Marca', '<select data-q="marca">' + opts(c.marche, d.marca, 'Tutte') + '</select>') +
      fld('Modello', '<select data-q="modello"' + (c.modelli.length ? '' : ' disabled') + '>' + opts(uniq(c.modelli.map(modelloBase)), modelloBase(d.modello), 'Tutti') + '</select>') +
      fld('Prezzo max (€)', '<input inputmode="numeric" data-q="prezzoMax" value="' + h(d.prezzoMax || '') + '">') +
      fld('Km max', '<input inputmode="numeric" data-q="kmMax" value="' + h(d.kmMax || '') + '">') +
      fld('Anno minimo', '<input inputmode="numeric" maxlength="4" data-q="annoMin" value="' + h(d.annoMin || '') + '">') +
      fld('Alimentazione', '<select data-q="alim">' + opts(ALIM, d.alim, 'Qualsiasi') + '</select>') +
      fld('Regione', '<select data-q="regione"><option value="">Tutta Italia</option>' + REGIONI.map(function(r) { var s = regSlug(r); return '<option value="' + s + '"' + (d.regione === s ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select>') +
      fld('CAP + raggio km', '<span class="us-pair"><input inputmode="numeric" maxlength="5" data-q="zip" value="' + h(d.zip || '') + '" placeholder="CAP"><input inputmode="numeric" data-q="raggio" value="' + h(d.raggio || '') + '" placeholder="50"></span>') +
      '</div><div class="us-bar"><button class="us-btn us-pri" data-act="q-go">🔎 Cerca sui portali</button></div>' +
      '<p class="us-fine">Con il CAP AutoScout24 cerca nel raggio indicato; Subito usa la regione; Automobile.it non filtra per zona e i risultati fuori regione vengono tolti qui.</p></details>';
  }
  function uniq(a) { return a.filter(function(x, i) { return x && a.indexOf(x) === i; }); }
  function descr(q) {
    return [((q.marca || '') + ' ' + modelloBase(q.modello || '')).trim() || (q.tipo === 'moto' ? 'Qualsiasi moto' : 'Qualsiasi auto'),
      num(q.prezzoMax) ? 'fino a ' + eur(num(q.prezzoMax)) : '', num(q.annoMin) ? 'dal ' + num(q.annoMin) : '', num(q.kmMax) ? 'max ' + kmf(num(q.kmMax)) : '', q.alim].filter(Boolean).join(' · ');
  }
  var quick = null;
  function readQuick() {
    var d = R ? Object.assign({}, R.q) : quick;
    document.querySelectorAll('#usato-root [data-q]').forEach(function(i) { d[i.dataset.q] = i.value.trim(); });
    return d;
  }
  function salvaRisultato(id) {
    var a = R && R.items.filter(function(x) { return x.id === id; })[0];
    if (!a) return;
    var ad = { id: uid(), pid: a.id, tipo: a.tipo, titolo: a.titolo, marca: a.marca, modello: a.modello, gen: '', motore: '', immatr: a.immatr, prezzo: a.prezzo, km: a.km,
      alim: a.alim, euro: a.euroStimata ? '' : a.euro, cambio: a.cambio, kw: a.kw, venditore: a.venditore, citta: a.citta, link: a.link, foto: a.foto, targa: '', lavori: '',
      note: (a.altri.length ? 'Anche su ' + a.altri.map(function(o) { return o.portale + ' a ' + eur(o.prezzo); }).join(', ') + '. ' : '') +
        (a.cmp && a.cmp.mediana ? 'Mediana annunci simili al ' + new Date().toLocaleDateString('it-IT') + ': ' + eur(a.cmp.mediana) + '.' : ''),
      stato: 'nuovo', fonte: a.portale, createdAt: Date.now() };
    // marca e modello come nel catalogo, così funzionano scheda tecnica e problemi noti
    var cat = catalog(a.tipo), mk = Object.keys(cat).filter(function(m) { return slug(m) === slug(a.marca); })[0];
    if (mk) {
      ad.marca = mk;
      // tra le serie con lo stesso nome ("Panda II", "Panda III"…) quella che copre l'anno dell'annuncio
      var mds = Object.keys(cat[mk]).filter(function(m) { return slug(modelloBase(m)) === slug(a.modello); });
      var md = mds.filter(function(m) { return Object.keys(cat[mk][m]).some(function(g) { var y = /(\d{4})\D+(\d{4}|oggi)?/.exec(g); return y && a.immatr >= +y[1] && a.immatr <= (y[2] && y[2] !== 'oggi' ? +y[2] : 9999); }); })[0] || mds[0];
      if (md) {
        ad.modello = md;
        var gen = Object.keys(cat[mk][md]).filter(function(g) { var y = /(\d{4})\D+(\d{4})?/.exec(g); return y && a.immatr >= +y[1] && a.immatr <= (y[2] ? +y[2] : 9999); })[0];
        if (gen) ad.gen = gen;
      }
    }
    S.ads.unshift(ad); save(); loadDB();
    toast('Salvato in Annunci: aggiungi targa e serie per i controlli completi');
    render();
  }

  /* ── Ponte con Claude (skill cerca-usato) ────────────────────────── */
  var JSON_FMT = '[{"titolo":"","marca":"","modello":"","anno_immatricolazione":0,"prezzo":0,"km":0,"alimentazione":"Benzina|Diesel|GPL|Metano|Ibrida|Plug-in|Elettrica","euro":0,"cambio":"Manuale|Automatico","kw":0,"venditore":"privato|concessionario","citta":"","link":"","targa":"","lavori_stimati":0,"giudizio":"da_vedere|riserva|scarta","note":""}]';
  function promptRicerca(q) {
    var s = S.settings, r = [];
    r.push('Usa la skill cerca-usato per questa ricerca.');
    r.push('Cerco: ' + (q.tipo === 'moto' ? 'moto' : 'auto') + ' ' + (((q.marca || '') + ' ' + (q.modello || '')).trim() || '(consigliami tu il modello)') + '.');
    if (num(q.prezzoMax)) r.push('Prezzo annuncio massimo: ' + num(q.prezzoMax) + ' €.');
    if (num(s.budget)) r.push('Budget tutto compreso (annuncio + passaggio + primi lavori): ' + num(s.budget) + ' €.');
    if (num(q.kmMax)) r.push('Km massimi: ' + num(q.kmMax) + '.');
    if (num(q.annoMin)) r.push('Anno minimo: ' + num(q.annoMin) + '.');
    if (q.alim) r.push('Alimentazione: ' + q.alim + '.');
    if (q.cambio) r.push('Cambio: ' + q.cambio + '.');
    if (q.zip) r.push('Zona: CAP ' + q.zip + ', raggio ' + (num(q.raggio) || 50) + ' km.');
    r.push('Percorrenza: circa ' + (num(s.kmAnno) || 10000) + ' km/anno.');
    if (s.areaB && q.tipo !== 'moto') r.push('Deve poter entrare in Area B a Milano.');
    if (q.note) r.push('Note: ' + q.note);
    r.push('');
    r.push('Alla fine, oltre al riepilogo, aggiungi un blocco di codice JSON da importare in AutoHub, in questo formato esatto (un oggetto per annuncio, numeri senza simboli, campi sconosciuti vuoti):');
    r.push(JSON_FMT);
    return r.join('\n');
  }
  function promptAnnuncio(a) {
    var r = ['Usa la skill cerca-usato per valutare questo annuncio.'];
    if (safeUrl(a.link)) r.push('Link: ' + a.link);
    r.push('Dati: ' + titolo(a) + ' · ' + (a.immatr || 'anno n.d.') + ' · ' + kmf(num(a.km)) + ' · ' + eur(num(a.prezzo)) + ' · ' + (a.alim || '') + (a.euro ? ' Euro ' + a.euro : '') + ' · ' + (a.venditore === 'conc' ? 'concessionario' : 'privato') + (a.citta ? ' · ' + a.citta : '') + (a.targa ? ' · targa ' + a.targa : ''));
    if (num(S.settings.budget)) r.push('Budget tutto compreso: ' + num(S.settings.budget) + ' €. Percorrenza ' + (num(S.settings.kmAnno) || 10000) + ' km/anno.');
    if (a.note) r.push('Mie note: ' + a.note);
    return r.join('\n');
  }
  function importaJSON(text) {
    var m = /\[[\s\S]*\]/.exec(text || '');
    if (!m) throw new Error('Non trovo un elenco JSON (deve iniziare con [ e finire con ])');
    var arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) throw new Error('Il JSON non è un elenco');
    var n = 0;
    arr.forEach(function(o) {
      if (!o || typeof o !== 'object') return;
      var link = safeUrl(o.link);
      if (link && S.ads.some(function(x) { return x.link === link; })) return;   // già presente
      var al = ALIM.filter(function(x) { return x.toLowerCase() === String(o.alimentazione || '').toLowerCase(); })[0] || '';
      S.ads.unshift({
        id: uid(), tipo: o.tipo === 'moto' ? 'moto' : 'auto', titolo: String(o.titolo || '').slice(0, 120),
        marca: String(o.marca || '').slice(0, 40), modello: String(o.modello || '').slice(0, 60), gen: '', motore: '',
        immatr: num(o.anno_immatricolazione) || '', prezzo: num(o.prezzo) || '', km: num(o.km) || '',
        alim: al, euro: num(o.euro) || '', cambio: /auto/i.test(o.cambio || '') ? 'Automatico' : (o.cambio ? 'Manuale' : ''),
        kw: num(o.kw) || '', venditore: /conc|comm|prof/i.test(o.venditore || '') ? 'conc' : 'privato',
        citta: String(o.citta || '').slice(0, 60), link: link, targa: String(o.targa || '').toUpperCase().slice(0, 10),
        lavori: num(o.lavori_stimati) || '', note: String(o.note || '').slice(0, 1000), stato: 'nuovo',
        fonte: 'claude', gClaude: /scarta/i.test(o.giudizio || '') ? 'scarta' : /riserva/i.test(o.giudizio || '') ? 'riserva' : (o.giudizio ? 'ok' : ''),
        createdAt: Date.now()
      });
      n++;
    });
    save();
    return n;
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  function titolo(a) {
    return a.titolo || [a.marca, a.modello, a.motore].filter(Boolean).join(' ') || 'Annuncio senza titolo';
  }
  function badgeG(g) { return '<span class="us-g us-g-' + g.st + '">' + h(g.label) + '</span>'; }
  function statoLabel(k) { for (var i = 0; i < STATI.length; i++) if (STATI[i][0] === k) return STATI[i][1]; return STATI[0][1]; }

  function render() {
    var root = $('usato-root');
    if (!root) return;
    var tabs = [['cerca', 'Cerca', ''], ['annunci', 'Salvati', S.ads.length], ['ricerche', 'Ricerche', S.searches.length], ['confronto', 'Confronto', '']];
    var html = '<div class="us-seg" role="tablist">' + tabs.map(function(t) {
      return '<button role="tab" aria-selected="' + (view === t[0]) + '" class="' + (view === t[0] ? 'on' : '') + '" data-act="view" data-v="' + t[0] + '">' + t[1] + (t[2] !== '' ? ' <i>' + t[2] + '</i>' : '') + '</button>';
    }).join('') + '</div>';
    html += view === 'cerca' ? renderCerca() : view === 'ricerche' ? renderRicerche() : view === 'confronto' ? renderConfronto() : renderAnnunci();
    root.innerHTML = html;
  }

  function renderSettings() {
    var s = S.settings;
    return '<details class="us-set"' + (num(s.budget) ? '' : ' open') + '><summary>Il tuo profilo d\'acquisto' +
      (num(s.budget) ? ' <i>budget ' + eur(num(s.budget)) + ' · ' + (num(s.kmAnno) || 0).toLocaleString('it-IT') + ' km/anno</i>' : ' <i>imposta il budget</i>') + '</summary>' +
      '<div class="us-grid">' +
      fld('Budget tutto compreso (€)', '<input inputmode="numeric" data-set="budget" value="' + h(s.budget) + '" placeholder="es. 3000">') +
      fld('Km all\'anno', '<input inputmode="numeric" data-set="kmAnno" value="' + h(s.kmAnno) + '">') +
      fld('Maggiorazione IPT provincia (%)', '<input inputmode="numeric" data-set="magg" value="' + h(s.magg) + '">') +
      fld('CAP di casa', '<input inputmode="numeric" maxlength="5" data-set="zip" value="' + h(s.zip) + '" placeholder="es. 20081">') +
      '</div><label class="us-chk"><input type="checkbox" data-set="areaB"' + (s.areaB ? ' checked' : '') + '> Deve entrare in Area B (Milano)</label>' +
      '<p class="us-fine">Il budget "tutto compreso" si confronta con il costo vero: annuncio + passaggio di proprietà + lavori. Tariffe e regole Area B verificate il ' + RULES.verificato + '.</p></details>';
  }
  function fld(label, control) { return '<label class="us-f"><span>' + label + '</span>' + control + '</label>'; }

  function renderAnnunci() {
    var html = renderSettings();
    html += '<div class="us-bar"><button class="us-btn us-pri" data-act="new-ad">+ Aggiungi annuncio</button>' +
      '<button class="us-btn" data-act="import">Importa da Claude</button></div>';
    if (!S.ads.length) {
      return html + '<div class="us-empty"><b>Nessun annuncio salvato</b>Incolla qui gli annunci che ti interessano: per ognuno vedi il costo vero d\'acquisto, se entra in Area B, i problemi noti del motore e cosa chiedere al venditore.</div>';
    }
    var chips = [['attivi', 'Attivi'], ['nuovo', 'Da contattare'], ['visto', 'Visti'], ['scartato', 'Scartati'], ['tutti', 'Tutti']];
    html += '<div class="us-chips">' + chips.map(function(c) {
      return '<button class="' + (filtroStato === c[0] ? 'on' : '') + '" data-act="filtro" data-v="' + c[0] + '">' + c[1] + '</button>';
    }).join('') + '</div>';
    var list = S.ads.filter(function(a) {
      if (filtroStato === 'tutti') return true;
      if (filtroStato === 'attivi') return a.stato !== 'scartato';
      if (filtroStato === 'visto') return a.stato === 'visto' || a.stato === 'trattativa';
      return (a.stato || 'nuovo') === filtroStato;
    }).sort(function(a, b) { return (costoVero(a) || 1e12) - (costoVero(b) || 1e12); });
    if (!list.length) return html + '<div class="us-empty">Nessun annuncio in questo filtro.</div>';
    html += list.map(function(a) {
      var g = giudizio(a), cv = costoVero(a), ab = areaB(a), i = dbInfo(a);
      return '<article class="us-card us-st-' + g.st + (a.stato === 'scartato' ? ' us-off' : '') + '" data-act="open" data-id="' + a.id + '" tabindex="0">' +
        '<header><h3>' + h(titolo(a)) + '</h3>' + badgeG(g) + '</header>' +
        '<div class="us-meta">' + [a.immatr, kmf(num(a.km)), a.alim + (a.euro ? ' Euro ' + a.euro : ''), a.cambio, a.citta].filter(function(x) { return x && x !== '—'; }).map(h).join(' · ') + '</div>' +
        '<div class="us-nums"><div><small>Annuncio</small><b>' + eur(num(a.prezzo)) + '</b></div>' +
        '<div><small>Costo vero</small><b class="us-cv">' + eur(cv) + '</b></div>' +
        '<div><small>Stato</small><b class="us-stato">' + h(statoLabel(a.stato)) + '</b></div></div>' +
        '<div class="us-tags">' +
        (ab ? '<span class="us-t us-t-' + ab.st + '">Area B ' + { ok: 'sì', no: 'no', warn: 'a termine', nd: 'da verificare' }[ab.st] + '</span>' : '') +
        (i && i.v.affidabilita ? '<span class="us-t us-t-' + { alta: 'ok', media: 'nd', bassa: 'no' }[i.v.affidabilita] + '">Affidabilità ' + h(i.v.affidabilita) + '</span>' : '') +
        '<span class="us-t">' + (a.venditore === 'conc' ? 'Concessionario' : 'Privato') + '</span>' +
        (a.fonte === 'claude' ? '<span class="us-t">da Claude</span>' : '') + '</div></article>';
    }).join('');
    return html;
  }

  function renderRicerche() {
    var html = '<div class="us-bar"><button class="us-btn us-pri" data-act="new-search">+ Nuova ricerca</button></div>';
    if (!S.searches.length) {
      return html + '<div class="us-empty"><b>Nessuna ricerca salvata</b>Fai una ricerca da Cerca e salvala: potrai rilanciarla quando vuoi e vedere solo gli annunci nuovi o ribassati.</div>';
    }
    html += S.searches.map(function(q) {
      var crit = [num(q.prezzoMax) ? 'fino a ' + eur(num(q.prezzoMax)) : '', num(q.kmMax) ? 'max ' + kmf(num(q.kmMax)) : '', num(q.annoMin) ? 'dal ' + num(q.annoMin) : '', num(q.annoMax) ? 'al ' + num(q.annoMax) : '', q.alim, q.cambio, q.zip ? 'CAP ' + q.zip + ' +' + (num(q.raggio) || 50) + ' km' : ''].filter(Boolean);
      var last = q.ultima ? 'Ultima ricerca ' + new Date(q.ultima).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + (q.ultimiNuovi ? ' · ' + q.ultimiNuovi + ' nuovi' : '') : 'Mai eseguita';
      if (q.regione) crit.push(REGIONI.filter(function(r) { return regSlug(r) === q.regione; })[0] || q.regione);
      return '<article class="us-card"><header><h3>' + h(((q.marca || '') + ' ' + modelloBase(q.modello || '')).trim() || (q.tipo === 'moto' ? 'Qualsiasi moto' : 'Qualsiasi auto')) + '</h3>' +
        '<button class="us-x" data-act="del-search" data-id="' + q.id + '" aria-label="Elimina ricerca">×</button></header>' +
        '<div class="us-meta">' + (crit.length ? crit.map(h).join(' · ') : 'Nessun filtro') + '</div>' +
        (q.note ? '<div class="us-note">' + h(q.note) + '</div>' : '') +
        '<div class="us-meta">' + h(last) + '</div>' +
        '<div class="us-bar"><button class="us-btn us-pri" data-act="run-search" data-id="' + q.id + '">🔎 Cerca ora</button>' +
        '<button class="us-btn" data-act="edit-search" data-id="' + q.id + '">Modifica</button>' +
        '<button class="us-btn us-claude" data-act="ask-search" data-id="' + q.id + '">Copia per Claude</button></div>' +
        '<details class="us-more"><summary>Apri sui portali</summary><div class="us-links">' + portali(q).map(function(p) {
          return '<a class="us-btn" target="_blank" rel="noopener noreferrer" href="' + h(p[1]) + '">' + h(p[0]) + ' ↗</a>';
        }).join('') + '</div></details></article>';
    }).join('');
    html += '<p class="us-fine">"Cerca ora" rilancia la ricerca sui portali e segnala gli annunci nuovi e quelli ribassati dall\'ultima volta. "Copia per Claude" passa la ricerca alla skill cerca-usato per una valutazione approfondita (difetti noti, foto, domande al venditore).</p>';
    return html;
  }

  function renderConfronto() {
    var list = S.ads.filter(function(a) { return a.stato !== 'scartato'; })
      .sort(function(a, b) { return (costoVero(a) || 1e12) - (costoVero(b) || 1e12); });
    if (list.length < 2) return '<div class="us-empty"><b>Servono almeno 2 annunci attivi</b>Il confronto li ordina per costo vero d\'acquisto, non per prezzo dell\'annuncio.</div>';
    var best = list.filter(function(a) { return giudizio(a).st !== 'scarta'; })[0];
    var html = '';
    if (best) html += '<div class="us-pick"><small>Da vedere per prima</small><b>' + h(titolo(best)) + '</b><span>Costo vero più basso tra quelli non scartati: ' + eur(costoVero(best)) + '</span></div>';
    html += '<div class="us-tblwrap"><table class="us-tbl"><thead><tr><th>Annuncio</th><th>Prezzo</th><th>Costo vero</th><th>Km</th><th>Anno</th><th>Area B</th><th>Affid.</th><th>Giudizio</th></tr></thead><tbody>' +
      list.map(function(a) {
        var g = giudizio(a), ab = areaB(a), i = dbInfo(a);
        return '<tr data-act="open" data-id="' + a.id + '"><td>' + h(titolo(a)) + '</td><td>' + eur(num(a.prezzo)) + '</td><td><b>' + eur(costoVero(a)) + '</b></td><td>' + kmf(num(a.km)) + '</td><td>' + h(a.immatr || '—') + '</td><td>' +
          (ab ? { ok: 'Sì', no: 'No', warn: 'A termine', nd: '?' }[ab.st] : '—') + '</td><td>' + h(i && i.v.affidabilita || '—') + '</td><td>' + badgeG(g) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return html;
  }

  /* ── Scheda annuncio ─────────────────────────────────────────────── */
  var openId = null;
  function findAd(id) { return S.ads.filter(function(a) { return a.id === id; })[0]; }
  function sec(t, body) { return '<section class="us-sec"><h4>' + t + '</h4>' + body + '</section>'; }
  function ul(arr, cls) { return '<ul class="us-ul ' + (cls || '') + '">' + arr.map(function(x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul>'; }

  function domande(a, i) {
    var q = ['Mi manda la targa e il certificato dell\'ultima revisione?', 'Quanti proprietari ha avuto e perché la vende?', 'Ha il libretto tagliandi e le fatture dei lavori?', 'Ha mai avuto incidenti?'];
    if (a.targa) q.shift();
    if (i && Array.isArray(i.v.domande_venditore)) q = q.concat(i.v.domande_venditore.slice(0, 4));
    q.push('Posso farla vedere a un meccanico di fiducia?');
    return q.filter(function(x, k, arr) { return arr.indexOf(x) === k; });
  }
  function messaggio(a, i) {
    return 'Buongiorno, sono interessato alla ' + titolo(a) + ' in vendita' + (num(a.prezzo) ? ' a ' + eur(num(a.prezzo)) : '') + '.\n' +
      domande(a, i).slice(0, 4).map(function(x) { return '- ' + x; }).join('\n') +
      '\nSe è ancora disponibile vorrei venire a vederla, possibilmente a motore freddo. Grazie.';
  }

  function renderDetail() {
    var a = findAd(openId), el = $('us-detail-body');
    if (!a || !el) return;
    var g = giudizio(a), pp = passaggio(a), cv = costoVero(a), m = mercato(a), ab = areaB(a), i = dbInfo(a), ca = costoAnnuo(a), km = num(a.km);
    var html = '<div class="us-hero us-st-' + g.st + '">' + badgeG(g) + '<h2>' + h(titolo(a)) + '</h2>' +
      '<div class="us-meta">' + [a.immatr, kmf(km), a.alim + (a.euro ? ' Euro ' + a.euro : ''), a.cambio, a.venditore === 'conc' ? 'Concessionario' : 'Privato', a.citta].filter(function(x) { return x && x !== '—'; }).map(h).join(' · ') + '</div>' +
      (g.scarta.length ? ul(g.scarta, 'us-ul-no') : '') + (g.riserva.length ? ul(g.riserva, 'us-ul-warn') : '') + (g.note.length ? ul(g.note) : '') +
      (!g.scarta.length && !g.riserva.length ? '<p class="us-fine">Nessun segnale negativo dai dati inseriti. Il giudizio è indicativo: decide la visita.</p>' : '') +
      (a.gClaude ? '<p class="us-fine">Giudizio di Claude all\'importazione: <b>' + { ok: 'Da vedere', riserva: 'Con riserva', scarta: 'Scarta' }[a.gClaude] + '</b></p>' : '') + '</div>';

    html += '<div class="us-bar">' + (safeUrl(a.link) ? '<a class="us-btn us-pri" target="_blank" rel="noopener noreferrer" href="' + h(safeUrl(a.link)) + '">Apri annuncio ↗</a>' : '') +
      '<button class="us-btn" data-act="edit-ad" data-id="' + a.id + '">Modifica</button>' +
      '<button class="us-btn us-claude" data-act="ask-ad" data-id="' + a.id + '">Copia per Claude</button></div>';

    html += sec('Stato', '<div class="us-chips">' + STATI.map(function(s) {
      return '<button class="' + ((a.stato || 'nuovo') === s[0] ? 'on' : '') + '" data-act="stato" data-v="' + s[0] + '">' + s[1] + '</button>';
    }).join('') + '</div>');

    html += sec('Costo vero d\'acquisto', '<dl class="us-dl"><dt>Prezzo annuncio</dt><dd>' + eur(num(a.prezzo)) + '</dd>' +
      '<dt>Passaggio di proprietà <i>' + h(pp.nota) + '</i></dt><dd>' + eur(pp.tot) + '</dd>' +
      '<dt>Lavori imminenti</dt><dd>' + eur(num(a.lavori) || 0) + '</dd>' +
      '<dt class="us-tot">Totale</dt><dd class="us-tot">' + eur(cv) + '</dd></dl>' +
      (num(S.settings.budget) && cv ? '<p class="us-fine">' + (cv <= num(S.settings.budget) ? 'Dentro il budget: restano ' + eur(num(S.settings.budget) - cv) + '.' : 'Fuori budget di ' + eur(cv - num(S.settings.budget)) + '.') + '</p>' : '') +
      '<p class="us-fine">Passaggio stimato con le voci ACI 2026, agenzia esclusa. Fai il calcolo esatto sul sito ACI prima di chiudere.</p>');

    if (m) html += sec('Prezzo rispetto ai tuoi annunci', m.media == null
      ? '<p class="us-fine">Salva almeno altri ' + (2 - m.n) + ' annunci dello stesso modello per avere un confronto.</p>'
      : '<p>Media di ' + m.n + ' annunci simili salvati: <b>' + eur(m.media) + '</b>. Questo è ' + (Math.abs(m.delta) < 5 ? '<b>in linea</b>' : '<b>' + Math.abs(Math.round(m.delta)) + '% ' + (m.delta < 0 ? 'sotto' : 'sopra') + '</b>') + '.</p>');

    if (ab) html += sec('Area B Milano', '<p class="us-ab us-ab-' + ab.st + '">' + h(ab.txt) + '</p><p class="us-fine">Regole verificate il ' + RULES.verificato + '. La classe Euro negli annunci è spesso sbagliata: fa fede il libretto. <a target="_blank" rel="noopener noreferrer" href="' + RULES.areaB.link + '">Sito del Comune ↗</a></p>');

    if (i) {
      var prob = (i.v.problemi || []).slice().sort(function(x, y) { return (y.severita === 'alta') - (x.severita === 'alta'); }).slice(0, 4);
      var flags = (i.v.km_red_flags || []).filter(function(f) { return km == null || (f.km >= km - 20000 && f.km <= km + 40000); });
      var b = '<p>Affidabilità <b>' + h(i.v.affidabilita || 'n.d.') + '</b>' + (i.v.sommario ? ' · ' + h(i.v.sommario) : '') + '</p>';
      if (flags.length) b += '<h5>Scadenze vicine a questi km</h5>' + ul(flags.map(function(f) { return f.km.toLocaleString('it-IT') + ' km: ' + f.descrizione; }), 'us-ul-warn');
      if (prob.length) b += '<h5>Problemi noti</h5>' + prob.map(function(p) {
        return '<div class="us-prob us-sev-' + h(p.severita) + '"><b>' + h(p.titolo) + '</b><span>' + (p.costo_min != null ? eur(p.costo_min) + ' – ' + eur(p.costo_max) : '') + '</span><p>' + h(p.descrizione || '') + '</p></div>';
      }).join('');
      if (i.v.recall_note) b += '<h5>Richiami</h5><p>' + h(i.v.recall_note) + '</p>';
      b += '<button class="us-btn" data-act="to-diag" data-id="' + a.id + '">Scheda completa in Diagnosi</button>';
      html += sec('Affidabilità e problemi noti', b);
    } else {
      html += sec('Affidabilità e problemi noti', '<p class="us-fine">' + (dbState === 'loading' ? 'Carico il database veicoli…' : dbState === 'err' ? 'Database veicoli non raggiungibile.' : 'Per vedere problemi noti, scadenze e domande specifiche scegli marca, modello, serie e motore dall\'elenco in Modifica.') + '</p>');
    }

    var annuo = '';
    if (ca.carburante) annuo += '<dt>Carburante <i>' + ca.consumo.toLocaleString('it-IT') + ' l/100 km reali · ' + ca.prezzoL.toFixed(3) + ' €/l</i></dt><dd>' + eur(ca.carburante) + '</dd>';
    if (ca.assicurazione) annuo += '<dt>Assicurazione <i>fascia indicativa</i></dt><dd>' + h(ca.assicurazione) + '</dd>';
    if (annuo) html += sec('Costo annuo indicativo', '<dl class="us-dl">' + annuo + '</dl><p class="us-fine">Su ' + ca.kmAnno.toLocaleString('it-IT') + ' km/anno. Bollo e manutenzione non inclusi. Per l\'assicurazione fai un preventivo con la targa.</p>');

    var t = (a.targa || '').toUpperCase();
    html += sec('Controlli per targa', (t ? '<div class="us-targa"><b>' + h(t) + '</b><button class="us-btn" data-act="copy-targa" data-id="' + a.id + '">Copia</button></div>' : '<p class="us-fine">Targa non inserita: chiedila al venditore. Un rifiuto è un segnale negativo.</p>') +
      '<div class="us-links"><a class="us-btn" target="_blank" rel="noopener noreferrer" href="https://www.ilportaledellautomobilista.it/web/portale-automobilista/verifica-revisioni-effettuate-ms">Revisioni e km ↗</a>' +
      '<a class="us-btn" target="_blank" rel="noopener noreferrer" href="https://www.ilportaledellautomobilista.it/web/portale-automobilista/ext/verifica-classe-ambientale-veicolo">Classe Euro ↗</a>' +
      '<a class="us-btn" target="_blank" rel="noopener noreferrer" href="https://www.ilportaledellautomobilista.it/web/portale-automobilista/ext/verifica-copertura-rc">Copertura RCA ↗</a></div>' +
      '<p class="us-fine">I km dell\'annuncio devono essere uguali o superiori a quelli dell\'ultima revisione. Prima di pagare fai anche una visura PRA (fermi amministrativi, ipoteche).</p>');

    html += sec('Domande al venditore', ul(domande(a, i)) + '<button class="us-btn" data-act="copy-msg" data-id="' + a.id + '">Copia messaggio pronto</button>');

    var chk = ['Chiedi di trovarla a motore freddo', 'Avviamento, fumo allo scarico, spie accese', 'Frizione, cambio, freni, sterzo dritto', 'Differenze di colore tra i pannelli, ruggine sui passaruota', 'Gomme: usura irregolare e data DOT (oltre 6-7 anni vanno cambiate)', 'Telaio e targa uguali al libretto'];
    if (i && Array.isArray(i.v.checklist_ispezione)) chk = chk.concat(i.v.checklist_ispezione.slice(0, 6));
    html += sec('Checklist visita', ul(chk));

    html += sec('Note', '<textarea id="us-note" rows="4" placeholder="Appunti dopo la telefonata o la visita…">' + h(a.note || '') + '</textarea>');
    html += '<div class="us-bar"><button class="us-btn us-danger" data-act="del-ad" data-id="' + a.id + '">Elimina annuncio</button></div>';
    el.innerHTML = html;
  }

  /* ── Form annuncio / ricerca ─────────────────────────────────────── */
  var editing = null;   // { kind:'ad'|'search', data:{} }
  function opts(list, sel, ph) {
    return '<option value="">' + ph + '</option>' + list.map(function(x) { return '<option' + (x === sel ? ' selected' : '') + '>' + h(x) + '</option>'; }).join('');
  }
  function cascata(d) {
    var cat = catalog(d.tipo), marche = Object.keys(cat).sort();
    var modelli = d.marca && cat[d.marca] ? Object.keys(cat[d.marca]).sort() : [];
    var gens = d.modello && cat[d.marca] && cat[d.marca][d.modello] ? Object.keys(cat[d.marca][d.modello]) : [];
    var motori = d.gen && gens.indexOf(d.gen) >= 0 ? cat[d.marca][d.modello][d.gen] : [];
    var inCat = !d.marca || marche.indexOf(d.marca) >= 0;
    return { marche: marche, modelli: modelli, gens: gens, motori: motori, inCat: inCat };
  }
  function renderForm() {
    var el = $('us-edit-body');
    if (!el || !editing) return;
    var d = editing.data, c = cascata(d), isAd = editing.kind === 'ad';
    $('us-edit-title').textContent = isAd ? (d.id ? 'Modifica annuncio' : 'Nuovo annuncio') : (d.id ? 'Modifica ricerca' : 'Nuova ricerca');
    var html = '<div class="us-seg us-seg-sm"><button class="' + (d.tipo !== 'moto' ? 'on' : '') + '" data-act="f-tipo" data-v="auto">Auto</button><button class="' + (d.tipo === 'moto' ? 'on' : '') + '" data-act="f-tipo" data-v="moto">Moto</button></div>';
    if (isAd) html += fld('Link dell\'annuncio', '<input data-f="link" type="url" value="' + h(d.link) + '" placeholder="https://…">');
    html += '<div class="us-grid">' +
      fld('Marca', '<select data-f="marca" data-casc="1">' + opts(c.marche, d.marca, '— scegli —') + '</select>') +
      fld('Modello', '<select data-f="modello" data-casc="1"' + (c.modelli.length ? '' : ' disabled') + '>' + opts(c.modelli, d.modello, isAd ? '— scegli —' : 'Tutti') + '</select>');
    if (isAd) html += fld('Serie', '<select data-f="gen" data-casc="1"' + (c.gens.length ? '' : ' disabled') + '>' + opts(c.gens, d.gen, '— scegli —') + '</select>') +
      fld('Motore', '<select data-f="motore" data-casc="1"' + (c.motori.length ? '' : ' disabled') + '>' + opts(c.motori, d.motore, '— scegli —') + '</select>');
    html += '</div>';
    if (isAd) {
      html += fld('Titolo (se il modello non è in elenco)', '<input data-f="titolo" value="' + h(d.titolo) + '" placeholder="es. Fiat Panda 1.2 Lounge">') +
        '<div class="us-grid">' +
        fld('Prezzo (€)', '<input inputmode="numeric" data-f="prezzo" value="' + h(d.prezzo) + '">') +
        fld('Km', '<input inputmode="numeric" data-f="km" value="' + h(d.km) + '">') +
        fld('Anno immatricolazione', '<input inputmode="numeric" maxlength="4" data-f="immatr" value="' + h(d.immatr) + '">') +
        fld('Alimentazione', '<select data-f="alim">' + opts(ALIM, d.alim, '—') + '</select>') +
        fld('Classe Euro', '<select data-f="euro">' + opts(['0', '1', '2', '3', '4', '5', '6'], String(d.euro || ''), 'Non indicata') + '</select>') +
        fld('Cambio', '<select data-f="cambio">' + opts(['Manuale', 'Automatico'], d.cambio, '—') + '</select>') +
        fld('Venditore', '<select data-f="venditore"><option value="privato"' + (d.venditore !== 'conc' ? ' selected' : '') + '>Privato</option><option value="conc"' + (d.venditore === 'conc' ? ' selected' : '') + '>Concessionario</option></select>') +
        fld('Città', '<input data-f="citta" value="' + h(d.citta) + '">') +
        fld('Targa', '<input data-f="targa" maxlength="10" value="' + h(d.targa) + '" style="text-transform:uppercase">') +
        fld('Lavori imminenti (€)', '<input inputmode="numeric" data-f="lavori" value="' + h(d.lavori) + '" placeholder="distribuzione, gomme…">') +
        fld('Potenza kW (se non in elenco)', '<input inputmode="numeric" data-f="kw" value="' + h(d.kw) + '">') +
        '</div>' + fld('Note', '<textarea data-f="note" rows="3">' + h(d.note) + '</textarea>');
    } else {
      html += '<div class="us-grid">' +
        fld('Prezzo massimo (€)', '<input inputmode="numeric" data-f="prezzoMax" value="' + h(d.prezzoMax) + '">') +
        fld('Km massimi', '<input inputmode="numeric" data-f="kmMax" value="' + h(d.kmMax) + '">') +
        fld('Anno minimo', '<input inputmode="numeric" maxlength="4" data-f="annoMin" value="' + h(d.annoMin) + '">') +
        fld('Anno massimo', '<input inputmode="numeric" maxlength="4" data-f="annoMax" value="' + h(d.annoMax) + '">') +
        fld('Alimentazione', '<select data-f="alim">' + opts(ALIM, d.alim, 'Qualsiasi') + '</select>') +
        fld('Cambio', '<select data-f="cambio">' + opts(['Manuale', 'Automatico'], d.cambio, 'Qualsiasi') + '</select>') +
        fld('CAP', '<input inputmode="numeric" maxlength="5" data-f="zip" value="' + h(d.zip) + '">') +
        fld('Raggio (km)', '<input inputmode="numeric" data-f="raggio" value="' + h(d.raggio) + '">') +
        '</div>' + fld('Note per Claude (uso, irrinunciabili…)', '<textarea data-f="note" rows="3">' + h(d.note) + '</textarea>');
    }
    html += '<div class="us-bar"><button class="us-btn us-pri" data-act="f-save">Salva</button><button class="us-btn" data-act="f-cancel">Annulla</button></div>';
    el.innerHTML = html;
  }
  function readForm() {
    var d = editing.data;
    $('us-edit-body').querySelectorAll('[data-f]').forEach(function(inp) { d[inp.dataset.f] = inp.value.trim(); });
    if (d.targa) d.targa = d.targa.toUpperCase().replace(/\s+/g, '');
  }
  function openForm(kind, data) {
    editing = { kind: kind, data: Object.assign({ tipo: 'auto' }, data) };
    renderForm(); show('us-edit', true);
  }

  function show(id, on) {
    var el = $(id);
    if (!el) return;
    el.classList.toggle('visible', on);
    if (typeof window._hubUpdatePillVisibility === 'function') window._hubUpdatePillVisibility();
  }

  /* ── Eventi (delegati: nessun onclick inline con dati dentro) ─────── */
  function onClick(e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.dataset.act, id = t.dataset.id, v = t.dataset.v, a;
    if (t.tagName === 'A') return;
    switch (act) {
      case 'view': view = v; render(); break;
      case 'q-tipo': quick = readQuick(); quick.tipo = v; quick.marca = quick.modello = ''; if (R) R.q = Object.assign({}, quick); render(); break;
      case 'q-go':
        var nq = readQuick(); if (R) R.marcati = false;
        if (/^\d{5}$/.test(nq.zip || '') && !S.settings.zip) { S.settings.zip = nq.zip; save(); }
        quick = nq; cerca(nq, R && R.fromId && sameQ(R.q, nq) ? R.fromId : null); break;
      case 'q-save':
        var sq = Object.assign({}, R.q, { id: uid() }); delete sq.visti; S.searches.unshift(sq); R.fromId = sq.id;
        sq.visti = {}; R.items.forEach(function(x) { sq.visti[x.id] = num(x.prezzo); }); sq.ultima = Date.now(); save();
        toast('Ricerca salvata: rilanciala da Ricerche per vedere i nuovi annunci'); render(); break;
      case 'run-search': cerca(Object.assign({}, S.searches.filter(function(q) { return q.id === id; })[0]), id); break;
      case 'r-solo': R.solo = v; render(); break;
      case 'rf-tog': var arr = R.f[t.dataset.k] = R.f[t.dataset.k] || [], ix = arr.indexOf(v); if (ix >= 0) arr.splice(ix, 1); else arr.push(v); R.filtriAperti = true; render(); break;
      case 'rf-set': R.f[t.dataset.k] = v; R.filtriAperti = true; render(); break;
      case 'rf-reset': R.f = {}; R.solo = 'tutti'; render(); break;
      case 'r-more': altriRisultati(); break;
      case 'r-save': salvaRisultato(id); break;
      case 'filtro': filtroStato = v; render(); break;
      case 'new-ad': openForm('ad', { venditore: 'privato', stato: 'nuovo' }); break;
      case 'edit-ad': openForm('ad', findAd(id)); break;
      case 'new-search': openForm('search', { zip: S.settings.zip, raggio: S.settings.raggio, prezzoMax: S.settings.budget }); break;
      case 'edit-search': openForm('search', S.searches.filter(function(q) { return q.id === id; })[0]); break;
      case 'del-search':
        if (confirm('Eliminare questa ricerca?')) { S.searches = S.searches.filter(function(q) { return q.id !== id; }); save(); render(); }
        break;
      case 'ask-search': copy(promptRicerca(S.searches.filter(function(q) { return q.id === id; })[0]), 'Richiesta copiata: incollala a Claude'); break;
      case 'open': openId = id; renderDetail(); show('us-detail', true); $('us-detail-body').scrollTop = 0; break;
      case 'close-detail': saveNote(); show('us-detail', false); render(); break;
      case 'stato': a = findAd(openId); if (a) { saveNote(); a.stato = v; save(); renderDetail(); } break;
      case 'del-ad':
        if (confirm('Eliminare questo annuncio?')) { S.ads = S.ads.filter(function(x) { return x.id !== id; }); save(); show('us-detail', false); render(); }
        break;
      case 'ask-ad': copy(promptAnnuncio(findAd(id)), 'Richiesta copiata: incollala a Claude'); break;
      case 'copy-targa': copy(findAd(id).targa, 'Targa copiata'); break;
      case 'copy-msg': a = findAd(id); copy(messaggio(a, dbInfo(a)), 'Messaggio copiato'); break;
      case 'to-diag': toDiag(findAd(id)); break;
      case 'import': $('us-import-text').value = ''; show('us-import', true); break;
      case 'close-import': show('us-import', false); break;
      case 'do-import':
        try {
          var n = importaJSON($('us-import-text').value);
          show('us-import', false); view = 'annunci'; filtroStato = 'attivi'; loadDB(); render();
          toast(n ? n + ' annunci importati' : 'Nessun annuncio nuovo da importare');
        } catch (err) { toast('Import non riuscito: ' + err.message); }
        break;
      case 'f-tipo': readForm(); editing.data.tipo = v; editing.data.marca = editing.data.modello = editing.data.gen = editing.data.motore = ''; renderForm(); break;
      case 'f-cancel': case 'close-edit': show('us-edit', false); editing = null; break;
      case 'f-save': saveForm(); break;
    }
  }
  function saveNote() {
    var a = findAd(openId), ta = $('us-note');
    if (a && ta && ta.value !== (a.note || '')) { a.note = ta.value; save(); }
  }
  function saveForm() {
    readForm();
    var d = editing.data;
    if (editing.kind === 'ad') {
      if (!d.titolo && !d.modello) { toast('Indica almeno il modello o un titolo'); return; }
      if (d.link && !safeUrl(d.link)) { toast('Il link deve iniziare con http:// o https://'); return; }
      // precompila l'alimentazione dal database se manca
      var i = dbInfo(d);
      if (i && !d.alim && i.sp.alimentazione) {
        var al = i.sp.alimentazione.toLowerCase();
        d.alim = /plug/.test(al) ? 'Plug-in' : /ibrid/.test(al) ? 'Ibrida' : /elettr/.test(al) ? 'Elettrica' : /diesel/.test(al) ? 'Diesel' : /gpl/.test(al) ? 'GPL' : /metano/.test(al) ? 'Metano' : 'Benzina';
      }
      if (d.id) { S.ads = S.ads.map(function(x) { return x.id === d.id ? d : x; }); }
      else { d.id = uid(); d.createdAt = Date.now(); S.ads.unshift(d); }
      save(); show('us-edit', false); editing = null;
      loadDB();
      if (openId === d.id && $('us-detail').classList.contains('visible')) renderDetail();
      view = 'annunci'; render();
    } else {
      if (d.id) { S.searches = S.searches.map(function(x) { return x.id === d.id ? d : x; }); }
      else { d.id = uid(); S.searches.unshift(d); }
      save(); show('us-edit', false); editing = null; view = 'ricerche'; render();
    }
  }
  function sameQ(a, b) { return ['tipo', 'marca', 'modello', 'prezzoMax', 'annoMin', 'kmMax', 'alim', 'regione', 'zip'].every(function(k) { return String(a[k] || '') === String(b[k] || ''); }); }
  function onChange(e) {
    var t = e.target;
    if (t.dataset.rs) { R[t.dataset.rs] = t.value; render(); return; }
    if (t.dataset.rf) { R.f[t.dataset.rf] = t.type === 'checkbox' ? t.checked : t.value.trim(); R.filtriAperti = true; render(); return; }
    if (t.dataset.q === 'marca' || t.dataset.q === 'modello') {
      var d = readQuick(); if (t.dataset.q === 'marca') d.modello = '';
      quick = d; if (R) R.q = Object.assign({}, R.q, { marca: d.marca, modello: d.modello }); render();
      var box = document.querySelector('#usato-root .us-qbox'); if (box) box.open = true;
      return;
    }
    if (t.dataset.set) {
      S.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : t.value.trim();
      save();
      if (t.type === 'checkbox') render();
      return;
    }
    if (t.dataset.casc && editing) {
      readForm();
      var d = editing.data, f = t.dataset.f;
      if (f === 'marca') d.modello = d.gen = d.motore = '';
      if (f === 'modello') d.gen = d.motore = '';
      if (f === 'gen') d.motore = '';
      renderForm();
    }
  }
  // Apre la scheda completa nella sezione Diagnosi con il veicolo già selezionato
  function toDiag(a) {
    show('us-detail', false);
    window.hubGo('diag');
    try {
      window.setVehicleMode(a.tipo === 'moto' ? 'moto' : 'auto');
      window.selectOption('marca', a.marca);
      window.selectOption('modello', a.modello);
      $('sel-anno').value = a.gen;
      window.updateMotori();
      $('sel-motore').value = a.motore;
      window.avviaDiagnosi();
    } catch (err) { /* la Diagnosi resta aperta: l'utente seleziona a mano */ }
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  var wired = false;
  window.usatoInit = function() {
    if (!wired) {
      wired = true;
      ['hub-usato', 'us-detail', 'us-edit', 'us-import'].forEach(function(id) {
        var el = $(id);
        if (el) { el.addEventListener('click', onClick); el.addEventListener('change', onChange); }
      });
      $('hub-usato').addEventListener('toggle', function(e) { if (R && e.target.classList && e.target.classList.contains('us-filt')) R.filtriAperti = e.target.open; }, true);
      $('hub-usato').addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.us-card[data-act]')) { e.preventDefault(); e.target.click(); }
      });
    }
    S = load();
    loadDB();
    render();
  };
  /* ── Dal Garage: "Cerca simili" e "Quanto vale" ──────────────────── */
  window.hubUsatoFromVehicle = function(id, mode) {
    var v = (window.hubGarage && window.hubGarage.list ? window.hubGarage.list() : JSON.parse(localStorage.getItem('hub_garage_v1') || '[]'))
      .filter(function(x) { return x.id === id; })[0];
    if (!v) return;
    S = load();
    var anno = parseInt(v.annoImm, 10) || (/(\d{4})/.exec(v.anno || '') || [])[1];
    anno = anno ? parseInt(anno, 10) : null;
    var sp = window._vdb && window._vdb.specs && window._vdb.specs[[v.marca, v.modello, v.anno, v.motore].join('||')];
    var al = sp && sp.alimentazione ? (/diesel/i.test(sp.alimentazione) ? 'Diesel' : /plug/i.test(sp.alimentazione) ? 'Plug-in' : /ibrid/i.test(sp.alimentazione) ? 'Ibrida' : /elettr/i.test(sp.alimentazione) ? 'Elettrica' : /gpl/i.test(sp.alimentazione) ? 'GPL' : 'Benzina') : '';
    var GA = { benzina: 'Benzina', diesel: 'Diesel', gpl: 'GPL', metano: 'Metano', ibrida: 'Ibrida', 'diesel-ibrida': 'Ibrida', plugin: 'Plug-in', elettrica: 'Elettrica' };
    if (GA[v.alim]) al = GA[v.alim];
    var nome = (v.marca + ' ' + modelloBase(v.modello) + (v.motore ? ' ' + v.motore : '')).trim();
    var q = { id: uid(), tipo: v.type === 'moto' ? 'moto' : 'auto', marca: v.marca, modello: v.modello, alim: al,
      zip: S.settings.zip, raggio: S.settings.raggio || 100 };
    if (mode === 'valore') {
      // Annunci dello stesso modello, ±1 anno e km simili: la base per stimare quanto vale
      if (anno) { q.annoMin = anno - 1; q.annoMax = anno + 1; }
      if (v.kmTot) q.kmMax = Math.round((v.kmTot + 30000) / 10000) * 10000;
      q.note = 'Stima del valore della mia ' + nome + (anno ? ' del ' + anno : '') + (v.kmTot ? ', ' + v.kmTot.toLocaleString('it-IT') + ' km' : '') + '.';
    } else {
      if (anno) q.annoMin = anno - 2;
      q.note = 'Simile alla mia ' + nome + '.';
    }
    q.regione = defRegione();
    // stessa ricerca già salvata (es. "Quanto vale" ripetuto): la si rilancia invece di duplicarla
    var gia = S.searches.filter(function(x) { return sameQ(x, q) && String(x.annoMax || '') === String(q.annoMax || ''); })[0];
    if (gia) q = gia; else { S.searches.unshift(q); save(); }
    window.hubGo('usato');
    cerca(Object.assign({}, q), q.id);
    if (mode === 'valore') R.valore = { anno: anno, km: v.kmTot || 0, nome: nome };
  };

  window.hubUsato = { data: function() { return S; }, _calc: { passaggio: passaggio, costoVero: costoVero, areaB: areaB, giudizio: giudizio, portali: portali, importaJSON: importaJSON } };
})();
