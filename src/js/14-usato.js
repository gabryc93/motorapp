/* ═══════════════════════════════════════════════════════════════════
   HUB USATO — il tuo "AutoScout personale"
   · Ricerche salvate → link pronti sui portali + richiesta per Claude
   · Annunci salvati  → costo vero, giudizio, Area B, problemi noti (db.json)
   · Confronto        → tabella ordinata per costo vero d'acquisto
   Dati in localStorage (hub_usato_v1). Nessuno scraping: gli annunci si
   aggiungono a mano o incollando il JSON prodotto dalla skill cerca-usato.
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
    return { settings: { budget: '', kmAnno: 10000, magg: 30, areaB: true, zip: '', raggio: 50 }, searches: [], ads: [] };
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
  var view = 'annunci';
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
  function loadDB() {
    if (db || dbState === 'loading') return;
    if (window._vdb) { db = window._vdb; dbState = 'ok'; return; }
    dbState = 'loading';
    fetch('./db.json', { cache: 'default' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j) { window._vdb = db = j; dbState = 'ok'; render(); })
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
    if (fuel) p.push('fuel=' + fuel);
    if (q.cambio === 'Manuale') p.push('gear=M');
    if (q.cambio === 'Automatico') p.push('gear=A');
    if (/^\d{5}$/.test(q.zip || '')) { p.push('zip=' + q.zip); p.push('zipr=' + (num(q.raggio) || 50)); }
    out.push(['AutoScout24', 'https://www.autoscout24.it/lst' + (path ? '/' + path : '') + '?' + p.join('&')]);
    var sp = [];
    if (nome) sp.push('q=' + encodeURIComponent(nome));
    if (num(q.prezzoMax)) sp.push('pe=' + num(q.prezzoMax));
    if (num(q.annoMin)) sp.push('ys=' + num(q.annoMin));
    out.push(['Subito', 'https://www.subito.it/annunci-italia/vendita/' + (moto ? 'moto-e-scooter' : 'auto') + '/?' + sp.join('&')]);
    var wp = ['keywords=' + encodeURIComponent(nome || (moto ? 'moto' : 'auto')), 'category_ids=' + (moto ? '14000' : '100')];
    if (num(q.prezzoMax)) wp.push('max_sale_price=' + num(q.prezzoMax));
    out.push(['Wallapop', 'https://it.wallapop.com/app/search?' + wp.join('&')]);
    var g = encodeURIComponent((nome || 'usato') + ' usata' + (num(q.prezzoMax) ? ' ' + num(q.prezzoMax) + ' euro' : ''));
    out.push([moto ? 'Moto.it (Google)' : 'Automobile.it (Google)', 'https://www.google.com/search?q=site:' + (moto ? 'moto.it' : 'automobile.it') + '+' + g]);
    return out;
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
    var tabs = [['annunci', 'Annunci', S.ads.length], ['ricerche', 'Ricerche', S.searches.length], ['confronto', 'Confronto', '']];
    var html = '<div class="us-seg" role="tablist">' + tabs.map(function(t) {
      return '<button role="tab" aria-selected="' + (view === t[0]) + '" class="' + (view === t[0] ? 'on' : '') + '" data-act="view" data-v="' + t[0] + '">' + t[1] + (t[2] !== '' ? ' <i>' + t[2] + '</i>' : '') + '</button>';
    }).join('') + '</div>';
    html += view === 'ricerche' ? renderRicerche() : view === 'confronto' ? renderConfronto() : renderAnnunci();
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
      return html + '<div class="us-empty"><b>Nessuna ricerca salvata</b>Salva i criteri una volta: da qui apri la stessa ricerca su AutoScout24, Subito e Wallapop con i filtri già impostati, oppure la passi a Claude che cerca e valuta gli annunci per te.</div>';
    }
    html += S.searches.map(function(q) {
      var crit = [num(q.prezzoMax) ? 'fino a ' + eur(num(q.prezzoMax)) : '', num(q.kmMax) ? 'max ' + kmf(num(q.kmMax)) : '', num(q.annoMin) ? 'dal ' + num(q.annoMin) : '', q.alim, q.cambio, q.zip ? 'CAP ' + q.zip + ' +' + (num(q.raggio) || 50) + ' km' : ''].filter(Boolean);
      return '<article class="us-card"><header><h3>' + h(((q.marca || '') + ' ' + (q.modello || '')).trim() || (q.tipo === 'moto' ? 'Qualsiasi moto' : 'Qualsiasi auto')) + '</h3>' +
        '<button class="us-x" data-act="del-search" data-id="' + q.id + '" aria-label="Elimina ricerca">×</button></header>' +
        '<div class="us-meta">' + (crit.length ? crit.map(h).join(' · ') : 'Nessun filtro') + '</div>' +
        (q.note ? '<div class="us-note">' + h(q.note) + '</div>' : '') +
        '<div class="us-links">' + portali(q).map(function(p) {
          return '<a class="us-btn" target="_blank" rel="noopener noreferrer" href="' + h(p[1]) + '">' + h(p[0]) + ' ↗</a>';
        }).join('') + '</div>' +
        '<div class="us-bar"><button class="us-btn us-claude" data-act="ask-search" data-id="' + q.id + '">Copia richiesta per Claude</button>' +
        '<button class="us-btn" data-act="edit-search" data-id="' + q.id + '">Modifica</button></div></article>';
    }).join('');
    html += '<p class="us-fine">I portali non permettono a un\'app di leggere gli annunci: i link aprono la ricerca già filtrata, poi salvi qui quelli che ti interessano. Con "Copia richiesta per Claude" incolli la richiesta in chat, Claude cerca e valuta, e reimporti il risultato da Annunci → Importa da Claude.</p>';
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
          show('us-import', false); view = 'annunci'; filtroStato = 'attivi'; render();
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
      if (openId === d.id && $('us-detail').classList.contains('visible')) renderDetail();
      view = 'annunci'; render();
    } else {
      if (d.id) { S.searches = S.searches.map(function(x) { return x.id === d.id ? d : x; }); }
      else { d.id = uid(); S.searches.unshift(d); }
      save(); show('us-edit', false); editing = null; view = 'ricerche'; render();
    }
  }
  function onChange(e) {
    var t = e.target;
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
      $('hub-usato').addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.us-card[data-act]')) { e.preventDefault(); e.target.click(); }
      });
    }
    S = load();
    loadDB();
    render();
  };
  window.hubUsato = { data: function() { return S; }, _calc: { passaggio: passaggio, costoVero: costoVero, areaB: areaB, giudizio: giudizio, portali: portali, importaJSON: importaJSON } };
})();
