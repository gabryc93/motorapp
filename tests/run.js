/* AutoHub — test automatici nel browser.
   Avvio: dalla cartella del progetto  python build.py --test  (oppure: node tests/run.js)
   Prima volta: cd tests && npm install && npx playwright install chromium
   Le API esterne (Worker, F1, MotoGP, mappe) sono sostituite da dati finti: i test
   controllano l'app, non i servizi. Esito: elenco ✓/✗ e codice di uscita 0/1. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

// ── Dati finti ────────────────────────────────────────────────────
const st = (i, n, p) => ({ id: String(100 + i), nome: n, gestore: 'G', indirizzo: 'Via Roma ' + i, bandiera: ['Eni', 'Q8', 'IP'][i % 3], comune: 'MILANO', provincia: 'MI',
  lat: 45.46 + i * .004, lng: 9.19 + i * .005, distanza: i * .7, prezzo: p, isSelf: true, carburante: 'Benzina', dtComu: '16/11/2026 07:30:00' });
const WORKER = {
  '/api/medie': { Benzina: { self: 1.712, serv: 1.861 }, Diesel: { self: 1.655, serv: 1.802 }, GPL: { serv: .699 }, Metano: { serv: 1.41 }, _cachedAt: new Date().toISOString() },
  '/api/comuni': [{ nome: 'MILANO', provincia: 'MI', count: 300 }],
  '/api/cerca': [st(1, "ENI VIA D'ANNUNZIO", 1.659), st(2, 'Q8 Easy', 1.674), st(3, 'IP Matic', 1.699)],
  '/api/vicini': [st(1, 'ENI', 1.659)], '/api/ev': [], '/api/bbox': [],
  '/api/impianti': { impianti: { '101': { prezzi: [{ carb: 'Benzina', prezzo: 1.639, isSelf: true, dtComu: 'x' }] } } }
};
const F1 = {
  sched: { MRData: { RaceTable: { Races: [
    { round: '20', raceName: 'Brazilian Grand Prix', date: '2026-11-08', time: '17:00:00Z', Circuit: { circuitName: 'Interlagos', Location: { country: 'Brazil' } } },
    { round: '23', raceName: 'Abu Dhabi Grand Prix', date: '2099-12-06', time: '13:00:00Z', Circuit: { circuitName: 'Yas Marina', Location: { country: 'UAE' } }, Qualifying: { date: '2099-12-05', time: '14:00:00Z' } }] } } },
  results: { MRData: { RaceTable: { Races: [{ Results: [1, 2, 3].map(i => ({ position: String(i), positionText: String(i), points: String(26 - i * 3), Driver: { givenName: 'P', familyName: 'Pilota' + i }, Constructor: { name: 'Team' + i }, grid: '1', Time: { time: i === 1 ? '1:35:00' : '+' + i + '.000' }, FastestLap: { rank: String(i) } })) }] } } },
  standings: { MRData: { StandingsTable: { StandingsLists: [{ round: '20', DriverStandings: [1, 2, 3].map(i => ({ position: String(i), points: String(400 - i * 50), wins: String(4 - i), Driver: { givenName: 'P', familyName: 'Pilota' + i }, Constructors: [{ name: 'Team' + i }] })) }] } } }
};

// ── Test ──────────────────────────────────────────────────────────
const results = [];
async function test(name, fn, page) {
  try { await fn(page); results.push(['✓', name]); }
  catch (e) { results.push(['✗', name + ' — ' + String(e.message).split('\n')[0]]); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }

(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 45.46, longitude: 9.19 }, permissions: ['geolocation'], serviceWorkers: 'block' });
  const errors = [];
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.hostname === '127.0.0.1') return r.continue();
    const J = o => r.fulfill({ json: o, headers: { 'access-control-allow-origin': '*' } });
    if (u.hostname.endsWith('workers.dev')) {
      if (u.pathname === '/api/motogp') return J(u.searchParams.get('path') === 'seasons' ? [{ id: 's', year: 2026 }] : []);
      return J(WORKER[u.pathname] || {});
    }
    if (u.hostname.includes('jolpi')) {
      if (/\/2026\.json$/.test(u.pathname)) return J(F1.sched);
      if (/results\.json$/.test(u.pathname)) return J(F1.results);
      if (/driverstandings/.test(u.pathname)) return J(F1.standings);
      return J({ MRData: { RaceTable: { Races: [] } } });
    }
    return r.abort();   // mappe, font, librerie: non servono ai test
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => { if (!page._ownDialog) d.accept().catch(() => {}); });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await test('Avvio senza errori JavaScript', async () => { expect(!errors.length, errors.join(' | ')); });

  await test('Carburanti: ricerca comune mantiene il carburante scelto', async p => {
    await p.evaluate(() => hubGo('fuel'));   // la prima schermata ora è Oggi
    await p.click('.fb[data-f="Diesel"]');
    const req = p.waitForRequest(r => r.url().includes('/api/cerca'));
    await p.fill('#qinput', 'Milano'); await p.click('#sbtn');
    const u = new URL((await req).url());
    expect(u.searchParams.get('carburante') === 'Diesel', 'carburante inviato: ' + u.searchParams.get('carburante'));
    expect(u.searchParams.get('provincia') === 'MI', 'provincia mancante');
    await p.waitForTimeout(500);
    expect((await p.$$('#fuel-results .station')).length === 3, 'distributori mostrati != 3');
  }, page);

  await test('Garage: tendine marca → modelli → serie → motore compilano le specifiche', async p => {
    await p.evaluate(() => { hubGo('garage'); openGarageEdit(); });
    await p.selectOption('#gar-p-marca', 'Fiat');
    expect((await p.$$('.gar-pick-card')).length > 3, 'elenco modelli vuoto');
    await p.click('.gar-pick-card[data-m="Panda III"]');
    await p.selectOption('#gar-p-gen', '2018–2024');
    await p.waitForTimeout(800);
    await p.selectOption('#gar-p-motore', '1.2 69cv');
    await p.waitForTimeout(300);
    expect(await p.$eval('#gar-f-cv', e => e.value) === '69', 'CV non compilati');
    expect(await p.$eval('#gar-f-0100', e => e.value) === '', '0-100 non deve essere compilato (stima)');
    await p.fill('#gar-f-targa', 'AB123CD'); await p.fill('#gar-f-bollo', '2099-01-31');
    await p.evaluate(() => saveGarageEdit()); await p.waitForTimeout(400);
    const g = await p.evaluate(() => JSON.parse(localStorage.getItem('hub_garage_v1')));
    expect(g.length === 1 && g[0].modello === 'Panda III' && g[0].anno === '2018–2024', 'veicolo non salvato correttamente');
  }, page);

  await test('Garage: scadenze esportate nel calendario (.ics)', async p => {
    const id = await p.evaluate(() => JSON.parse(localStorage.getItem('hub_garage_v1'))[0].id);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(i => garCalendar(i), id)]);
    const txt = fs.readFileSync(await dl.path(), 'utf8');
    expect(/BEGIN:VEVENT[\s\S]*DTSTART;VALUE=DATE:20990131/.test(txt), 'evento bollo mancante');
  }, page);

  await test('Garage: stima bollo per regione e assicurazione con garanzie', async p => {
    const r = await p.evaluate(() => {
      const B = hubCosti.bollo;
      return [B({ tipo: 'auto', kw: 51, euro: 6, alim: 'benzina', regione: 'Lombardia', annoImm: 2019 }).importo,
        B({ tipo: 'auto', kw: 250, euro: 6, alim: 'benzina', regione: 'Lombardia', annoImm: 2018 }).importo,
        B({ tipo: 'moto', kw: 80, euro: 4, regione: 'Lazio', annoImm: 2018 }).importo,
        B({ tipo: 'auto', kw: 100, euro: 6, alim: 'elettrica', regione: 'Lazio', annoImm: 2024 }).importo,
        hubCosti.rca({ tipo: 'auto', garanzie: ['furto', 'kasko', 'minikasko'] }).importo];
    });
    expect(r[0] === 131.58, 'bollo 51 kW Euro 6: ' + r[0]);
    expect(r[1] === 1618.5, 'bollo con superbollo: ' + r[1]);
    expect(r[2] === 79.83, 'bollo moto 80 kW: ' + r[2]);
    expect(r[3] === 0, 'elettrica nei primi 5 anni deve essere esente');
    expect(r[4] === 422 + 103 + 400, 'kasko e mini-kasko non vanno sommati: ' + r[4]);
  }, page);

  await test('Diario: import viaggi CSV (MyPeugeot) aggiorna consumi e km', async p => {
    const csv = 'Data partenza;Ora arrivo;Distanza (km);Consumo medio (l/100km);Kilometraggio iniziale;Kilometraggio finale\n12/11/2026 08:10;08:45;21,4;5,6;99000;99021\n13/11/2026 18:00;19:10;22,0;6,1;99021;99043\n';
    await p.evaluate(() => { hubGo('garage'); openRideLog(); openViaggiImport(); });
    await p.setInputFiles('#vi-file', { name: 'viaggi.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await p.waitForSelector('.vi-btn:not([disabled])');
    await p.click('.vi-btn'); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const v = hubGarage.active(); const t = hubTripStats(v.id); closeViaggiImport(); closeRideLog(); return [t.viaggi, Math.round(t.consumo * 10) / 10, v.kmTot]; });
    expect(r[0] === 2, 'viaggi importati: ' + r[0]);
    expect(r[1] === 5.9, 'consumo medio pesato: ' + r[1]);
    expect(r[2] === 99043, 'contachilometri non aggiornato: ' + r[2]);
    // stesso file ma consumo in km/l senza unità nell'intestazione: riconosciuto e corregge i viaggi già salvati
    const csv2 = 'Data partenza;Ora arrivo;Distanza (km);Consumo medio;Kilometraggio iniziale;Kilometraggio finale\n12/11/2026 08:10;08:45;21,4;20,0;99000;99021\n13/11/2026 18:00;19:10;22,0;12,5;99021;99043\n';
    await p.evaluate(() => { openRideLog(); openViaggiImport(); });
    await p.setInputFiles('#vi-file', { name: 'viaggi2.csv', mimeType: 'text/csv', buffer: Buffer.from(csv2) });
    await p.waitForSelector('#vi-unit');
    const u = await p.$eval('#vi-unit', e => e.value);
    expect(u === 'kml', 'unità non riconosciuta: ' + u);
    await p.click('.vi-btn'); await p.waitForTimeout(200);
    const r2 = await p.evaluate(() => { const v = hubGarage.active(); const t = hubTripStats(v.id); closeViaggiImport(); closeRideLog(); return [t.viaggi, Math.round(t.consumo * 10) / 10]; });
    expect(r2[0] === 2, 'viaggi duplicati: ' + r2[0]);
    expect(r2[1] === 6.5, 'consumo km/l non convertito: ' + r2[1]);
  }, page);

  await test('Costo di possesso: carburante stimato dai viaggi importati', async p => {
    const r = await p.evaluate(() => {
      const g = JSON.parse(localStorage.getItem('hub_garage_v1')); g.push({ id: 'tco1', type: 'auto', marca: 'Peugeot', modello: '308', alim: 'benzina', costoBolloStima: 200, costoRcaStima: 500 });
      localStorage.setItem('hub_garage_v1', JSON.stringify(g));
      const now = Date.now(), rides = JSON.parse(localStorage.getItem('hub_rides_v1') || '[]');
      rides.push({ id: 't1', vehicleId: 'tco1', startTs: now - 86400000, distanceKm: 100, consumo: 6, litri: 6 }, { id: 't2', vehicleId: 'tco1', startTs: now - 2 * 86400000, distanceKm: 100 });
      localStorage.setItem('hub_rides_v1', JSON.stringify(rides));
      window.hubMedie = { Benzina: { self: 1.8 } };
      hubGo('garage'); openTCO(); _tcoSetVehicle('tco1');
      const t = document.getElementById('tco-body').innerText; closeTCO(); return t;
    });
    expect(/stima dai viaggi/.test(r), 'carburante non stimato dai viaggi');
    expect(/200 km/.test(r) && /12 l/.test(r), 'litri stimati errati: ' + r.slice(0, 300));
  }, page);

  await test('Diagnosi: database caricato solo per la marca richiesta', async p => {
    const req = [];
    p.on('request', r => { if (/\/db\//.test(r.url())) req.push(r.url().split('/db/')[1]); });
    await p.evaluate(() => { hubGo('diag'); setVehicleMode('auto'); selectOption('marca', 'Toyota'); });
    const m = await p.evaluate(() => Object.keys(VEHICLES.Toyota)[0]);
    await p.evaluate(m => selectOption('modello', m), m);
    await p.evaluate(() => { const a = document.getElementById('sel-anno'); a.selectedIndex = 1; updateMotori(); document.getElementById('sel-motore').selectedIndex = 1; avviaDiagnosi(); });
    await p.waitForTimeout(1500);
    expect(req.includes('toyota.json'), 'toyota.json non richiesto: ' + req.join(','));
    expect(!req.some(x => /^(fiat|bmw|audi)\.json/.test(x)), 'scaricate marche non richieste: ' + req.join(','));
    expect(/Problemi/i.test(await p.$eval('#results', e => e.innerText)), 'risultati diagnosi assenti');
  }, page);

  await test('Diagnosi: ricerca rapida e difetti documentati del motore', async p => {
    await p.evaluate(() => hubGo('diag'));
    await p.fill('#dq-input', '108 puretech'); await p.evaluate(() => diagQuickSearch());
    await p.press('#dq-input', 'Enter'); await p.waitForSelector('#tab-problemi');
    const r = await p.evaluate(() => ({ sel: ['sel-marca', 'sel-modello', 'sel-motore'].map(i => document.getElementById(i).value).join('|'), txt: document.getElementById('tab-problemi').innerText, dist: (switchTab('manutenzione'), document.getElementById('tab-manutenzione').innerText) }));
    expect(r.sel === 'Peugeot|108|1.2 PureTech 82cv', 'ricerca rapida: ' + r.sel);
    expect(/bagno d'olio/i.test(r.txt) && /Documentato/i.test(r.txt), 'difetto PureTech non mostrato');
    expect(/bagno d'olio/i.test(r.dist), 'distribuzione non corretta in manutenzione');
    const chain = await p.evaluate(() => { const n = hubMotoriNoti('Fiat', 'Panda III', '2012–2017', '1.3 MultiJet 75cv', {}); return n.distribuzione; });
    expect(chain === 'Catena', '1.3 MultiJet deve risultare a catena');
    const cat = await p.evaluate(() => !!(VEHICLES.Lancia && VEHICLES.Lancia['Ypsilon (846)'] && MOTORCYCLES.Kymco));
    expect(cat, 'modelli aggiunti mancanti nel catalogo');
  }, page);

  await test('Usato: import da Claude, costo vero e Area B', async p => {
    await p.evaluate(() => hubGo('usato'));
    await p.click('[data-act="view"][data-v="annunci"]');
    await p.click('[data-act="import"]');
    await p.fill('#us-import-text', '[{"titolo":"Ford Fiesta 1.4 TDCi","marca":"Ford","modello":"Fiesta","anno_immatricolazione":2009,"prezzo":2900,"km":190000,"alimentazione":"Diesel","euro":4,"venditore":"privato","link":"javascript:alert(1)"}]');
    await p.click('[data-act="do-import"]'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const a = hubUsato.data().ads[0]; return [Math.round(hubUsato._calc.costoVero(a)), hubUsato._calc.areaB(a).st, a.link]; });
    expect(r[0] > 2900, 'costo vero non calcolato'); expect(r[1] === 'no', 'diesel Euro 4 deve risultare fuori Area B'); expect(r[2] === '', 'link javascript: non filtrato');
  }, page);

  await test('Usato: ricerca sui portali, doppioni, prezzo sospetto e ricerca salvata', async p => {
    const mk = (i, o) => Object.assign({ id: 'as24:' + i, portale: 'AutoScout24', titolo: 'Fiat Panda 1.2', marca: 'Fiat', modello: 'Panda', prezzo: 4000 + i * 100, anno: 2014, km: 90000 + i * 5000, alim: 'Benzina', cambio: 'Manuale', citta: 'Milano', venditore: 'privato', link: 'https://www.autoscout24.it/annunci/' + i }, o);
    let extra = [];
    await p.route('**/api/usato**', r => {
      const po = new URL(r.request().url()).searchParams.get('portale');
      const body = po === 'autoscout24' ? { portale: po, totale: 7, pagine: 1, annunci: [0, 1, 2, 3, 4, 5].map(i => mk(i)).concat([mk(9, { prezzo: 200 })], extra) }
        : po === 'automobile' ? { portale: po, totale: 2, pagine: 1, annunci: [mk(1, { id: 'aut:1', portale: 'Automobile.it', citta: 'Milano (MI)', prezzo: 4300 }), mk(7, { id: 'aut:2', portale: 'Automobile.it', citta: 'Roma (RM)' })] }
        : null;
      return body ? r.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } }) : r.fulfill({ status: 502, json: { portale: po, error: 'HTTP 403' }, headers: { 'access-control-allow-origin': '*' } });
    });
    await p.evaluate(() => { hubGo('usato'); hubUsato.data().settings.regione = 'lombardia'; });
    await p.click('[data-act="view"][data-v="cerca"]');
    await p.selectOption('#usato-root [data-q="marca"]', 'Fiat');
    await p.selectOption('#usato-root [data-q="modello"]', 'Panda');
    await p.selectOption('#usato-root [data-q="regione"]', 'lombardia');
    await p.click('[data-act="q-go"]'); await p.waitForSelector('.us-sum');
    const r = await p.evaluate(() => ({ n: document.querySelectorAll('.us-res').length, txt: document.getElementById('usato-root').innerText }));
    expect(r.n === 7, 'risultati attesi 7 (doppione unito, Roma fuori regione): ' + r.n);
    expect(/AutoScout24 · Automobile.it 4300/.test(r.txt), 'doppione tra portali non unito');
    expect(/Prezzo sospetto/.test(r.txt), 'prezzo di 200 € non segnalato');
    expect(/non raggiungibile/.test(r.txt), 'errore Subito non mostrato');
    await p.click('[data-act="q-save"]');
    extra = [mk(20, { prezzo: 3900 })];
    await p.click('[data-act="view"][data-v="ricerche"]'); await p.click('[data-act="run-search"]');
    await p.waitForSelector('.us-news');
    expect(/1 nuovi/.test(await p.$eval('.us-news', e => e.innerText)), 'annuncio nuovo non segnalato');
    await p.unroute('**/api/usato**');
  }, page);

  await test('Passi & strade: curvatura, tratti uniti e stagione', async p => {
    const r = await p.evaluate(() => {
      const I = window._psInternals, lat0 = 46.5, lng0 = 10.5, mLat = 1 / 111320, mLng = 1 / (111320 * Math.cos(lat0 * Math.PI / 180));
      const tw = []; let x = 0, y = 0, dir = 0;
      for (let i = 0; i < 600; i++) { dir += Math.sin(i / 6) * 0.35; x += Math.cos(dir) * 15; y += Math.sin(dir) * 15; tw.push({ lat: lat0 + y * mLat, lon: lng0 + x * mLng }); }
      const st = []; for (let i = 0; i < 300; i++) st.push({ lat: lat0 - 0.02, lon: lng0 + i * 20 * mLng });
      const tags = { highway: 'secondary', name: 'SS38' };
      const res = I.analizza({ elements: [{ type: 'way', id: 1, tags, geometry: tw.slice(0, 201) }, { type: 'way', id: 2, tags, geometry: tw.slice(400).reverse() }, { type: 'way', id: 3, tags, geometry: tw.slice(200, 401) },
        { type: 'way', id: 4, tags: { highway: 'primary', name: 'Dritta' }, geometry: st }] }, lat0, lng0);
      return { n: res.roads.length, name: res.roads[0] && res.roads[0].name, len: res.roads[0] && res.roads[0].len, stelvio: I.chiusoTxt(I.PASSES.find(x => x.id === 'stelvio')), unique: new Set(I.PASSES.map(x => x.id)).size === I.PASSES.length };
    });
    expect(r.n === 1 && r.name === 'SS38', 'strada curva non trovata o rettilineo incluso: ' + JSON.stringify(r));
    expect(r.len > 7, 'i 3 tratti OSM non sono stati uniti: ' + r.len);
    expect(r.stelvio === 'Di solito chiuso nov–mag', 'stagione Stelvio: ' + r.stelvio);
    expect(r.unique, 'id dei passi duplicati');
  }, page);

  await test('Ride: piega dalla traccia, 0-100 interpolato, giri in pista', async p => {
    const r = await p.evaluate(() => {
      const I = window._rdInternals; I.noGps(true);
      const O = { lat: 45.5, lng: 9.2 }, k = 111320, ck = k * Math.cos(O.lat * Math.PI / 180);
      let t = Date.now() - 3600000;
      const fix = (x, y, v) => I.feed({ timestamp: t, coords: { latitude: O.lat + y / k, longitude: O.lng + x / ck, speed: v, accuracy: 5, altitude: 120, heading: null } });
      openRide(); rideSetMode('giro'); rideStart();
      // rettilineo verso est a 72 km/h, poi un giro a sinistra (raggio 60 m a 43 km/h), poi di nuovo dritto
      let x = 0, y = 0;
      for (let i = 0; i < 30; i++) { fix(x, y, 20); x += 20; t += 1000; }
      const cx = x, cy = y + 60;
      for (let a = 0; a < 2 * Math.PI; a += 12 / 60) { fix(cx + 60 * Math.sin(a), cy - 60 * Math.cos(a), 12); t += 1000; }
      for (let i = 0; i < 30; i++) { fix(x, y, 20); x += 20; t += 1000; }
      for (let i = 0; i < 40; i++) { fix(x, y, 0); t += 1000; }   // sosta: non conta nel tempo in movimento
      rideStop(); closeRideLogDetail();
      const rides = JSON.parse(localStorage.getItem('hub_rides_v1') || '[]'), e = rides[rides.length - 1];
      // prestazioni: 0-100 con 4 m/s² costanti → 6,94 s
      rideReset(); rideSetMode('perf'); rideSetPerf('p0-100'); rideStart();
      for (let i = 0; i < 4; i++) { fix(0, 0, 0); t += 1000; }
      let s = 0;
      for (let tt = 0.5; tt < 9; tt += 1) { const v = 4 * tt; s = 2 * tt * tt; I.feed({ timestamp: t + tt * 1000, coords: { latitude: O.lat, longitude: O.lng + s / ck, speed: v, accuracy: 4, altitude: 120 } }); }
      t += 10000;
      ridePerfClose();
      const runs = JSON.parse(localStorage.getItem('hub_perf_runs_v1') || '[]'), run = runs[runs.length - 1];
      // pista: cerchio di 80 m a 72 km/h (giro da 25,1 s), traguardo segnato in corsa
      rideReset(); rideSetMode('pista'); rideStart();
      const R = 80, w = 20 / R; let ang = 0;
      for (let i = 0; i < 12; i++) { fix(R * Math.sin(ang), -R * Math.cos(ang), 20); ang += w; t += 1000; }
      rideLinea();
      for (let i = 0; i < 90; i++) { fix(R * Math.sin(ang), -R * Math.cos(ang), 20); ang += w; t += 1000; }
      const laps = I.state().R.laps.slice();
      const lapTxt = document.getElementById('rd-lap').textContent;
      rideStop(); closeRideLogDetail(); rideReset(); rideSetMode('giro'); closeRide();
      return { lean: e.leanSx, dx: e.leanDx, km: e.distanceKm, mov: e.movingMs, salvato: !!e.points.length && e.points[0].v != null, run, laps, lapTxt };
    });
    expect(r.km > 1.3 && r.km < 1.6, 'distanza: ' + r.km);
    expect(r.lean >= 11 && r.lean <= 17 && r.dx <= 3, 'piega: ' + r.lean + ' / ' + r.dx);
    expect(r.mov > 80000 && r.mov < 100000, 'tempo in movimento con la sosta: ' + r.mov);
    expect(r.salvato, 'traccia senza velocità');
    expect(r.run && r.run.mode === 'p0-100' && Math.abs(r.run.time - 6.94) < 0.15, '0-100: ' + JSON.stringify(r.run));
    expect(r.laps.length >= 2 && r.laps.every(l => Math.abs(l - 25133) < 400), 'giri: ' + r.laps.join(','));
    expect(/GIRO/.test(r.lapTxt), 'pannello giri');
  }, page);

  await test('Meteo percorso: punti e orari, passo chiuso, orario migliore, ritorno', async p => {
    const A = { lat: 45.4642, lng: 9.19 }, B = { lat: 46.5286, lng: 10.4532 }, N = 200;
    const base = Math.floor(Date.now() / 3600000) * 3600 - 7200;
    await p.route('**/photon.komoot.io/**', r => {
      const q = new URL(r.request().url()).searchParams.get('q'), c = /bormio|stelvio/i.test(q) ? B : A;
      r.fulfill({ json: { features: [{ geometry: { coordinates: [c.lng, c.lat] }, properties: { name: /bormio|stelvio/i.test(q) ? 'Passo dello Stelvio' : 'Milano', state: 'Lombardia', country: 'Italia' } }] }, headers: { 'access-control-allow-origin': '*' } });
    });
    await p.route('**/router.project-osrm.org/**', r => {
      const coords = []; for (let i = 0; i < N; i++) coords.push([A.lng + (B.lng - A.lng) * i / (N - 1), A.lat + (B.lat - A.lat) * i / (N - 1)]);
      r.fulfill({ json: { code: 'Ok', routes: [{ distance: 200000, duration: 10800, geometry: { coordinates: coords }, legs: [{ annotation: { duration: Array(N - 1).fill(10800 / (N - 1)) } }] }] }, headers: { 'access-control-allow-origin': '*' } });
    });
    await p.route('**/api.open-meteo.com/**', r => {
      const n = new URL(r.request().url()).searchParams.get('latitude').split(',').length, H = 16 * 24;
      const time = [], pr = []; for (let k = 0; k < H; k++) { time.push(base + k * 3600); pr.push(k < 10 ? 2 : 0); }   // piove per le prime 8 ore da adesso
      const one = { elevation: 500, hourly: { time, temperature_2m: Array(H).fill(5), precipitation: pr, precipitation_probability: pr.map(x => x ? 90 : 5), weather_code: pr.map(x => x ? 63 : 1),
        wind_speed_10m: Array(H).fill(8), wind_gusts_10m: Array(H).fill(15), visibility: Array(H).fill(20000), is_day: time.map(t => { const h = new Date(t * 1000).getHours(); return h >= 7 && h < 18 ? 1 : 0; }), snowfall: Array(H).fill(0) } };
      r.fulfill({ json: Array(n).fill(one), headers: { 'access-control-allow-origin': '*' } });
    });
    await p.evaluate(() => { localStorage.removeItem('hub_meteo_last_v1'); hubGo('meteo'); });
    await p.fill('#wp-from', 'Milano'); await p.waitForSelector('#wp-from-sug.on'); await p.click('#wp-from-sug .wp-sug-i');
    await p.fill('#wp-to', 'Bormio');
    await p.click('.wp-vbtn[data-v="moto"]');
    const ret = await p.$eval('#wp-when', e => { const d = new Date(e.value); d.setDate(d.getDate() + 1); const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':00'; });
    await p.fill('#wp-ret', ret);
    await p.click('.wp-go');
    await p.waitForSelector('.wp-steps');
    const r = await p.evaluate(() => ({ txt: document.getElementById('wp-result').textContent, steps: document.querySelectorAll('.wp-steps').length, rows: document.querySelector('.wp-steps').children.length,
      best: !!document.querySelector('.wp-hr.best'), first: document.querySelector('.wp-steps .wp-step-hh').textContent, when: document.getElementById('wp-when').value }));
    expect(r.rows === 11, 'punti lungo 200 km: ' + r.rows);
    expect(/Stelvio/.test(r.txt) && /chiuso/.test(r.txt), 'passo chiuso non segnalato');
    expect(/Conviene partire alle/.test(r.txt) && r.best, 'orario migliore assente');
    expect(r.steps === 2 && /Ritorno/.test(r.txt), 'ritorno assente');
    expect(/percepisci/.test(r.txt), 'freddo percepito in moto assente');
    await p.click('.wp-hr.best');
    const r2 = await p.evaluate(() => ({ when: document.getElementById('wp-when').value, wet: document.querySelectorAll('.wp-steps')[0].querySelectorAll('.wp-precip').length }));
    expect(r2.when !== r.when && r2.wet === 0, 'partenza migliore non applicata o ancora pioggia: ' + JSON.stringify(r2));
    await p.evaluate(() => closeWeather());
    await p.unroute('**/photon.komoot.io/**'); await p.unroute('**/router.project-osrm.org/**'); await p.unroute('**/api.open-meteo.com/**');
  }, page);

  await test('Musica: collegamento Spotify (PKCE), brano nella Ride e nell\'HUD', async p => {
    const H = { 'access-control-allow-origin': '*' };
    let tokenBody = '', apiCalls = 0;
    await p.route('**/accounts.spotify.com/api/token', r => { tokenBody = r.request().postData(); r.fulfill({ json: { access_token: 'AT' + (tokenBody.includes('refresh_token') ? '2' : '1'), refresh_token: 'RT', expires_in: 3600 }, headers: H }); });
    await p.route('**/api.spotify.com/**', r => { apiCalls++;
      r.fulfill({ json: { is_playing: true, progress_ms: 60000, item: { name: 'Highway Star', duration_ms: 370000, artists: [{ name: 'Deep Purple' }], album: { images: [] } } }, headers: H }); });
    const ch = await p.evaluate(() => hubMusica._challenge('dBjftJeZ4CVP-mJ92Kx1i8CB8T4fFHf9vYMfH8sxTrc'));
    const atteso = require('crypto').createHash('sha256').update('dBjftJeZ4CVP-mJ92Kx1i8CB8T4fFHf9vYMfH8sxTrc').digest('base64url');
    expect(ch === atteso, 'PKCE S256 errato: ' + ch);
    // ritorno da Spotify con il codice: scambio token e riapertura della Ride
    const url = p.url().split(/[?#]/)[0];
    await p.evaluate(() => { localStorage.removeItem('hub_spotify_v1'); localStorage.setItem('hub_spotify_pkce_v1', JSON.stringify({ v: 'VER', st: 'abc123', clientId: '0123456789abcdef0123456789abcdef', back: 'ride' })); });
    await p.goto(url + '?code=CODE&state=abc123');
    await p.waitForSelector('#rd-overlay.visible', { timeout: 8000 });
    await p.waitForFunction(() => !document.getElementById('rd-np').hidden, null, { timeout: 8000 });
    const r = await p.evaluate(() => ({ t: JSON.parse(localStorage.getItem('hub_spotify_v1')), np: document.getElementById('rd-np').textContent, url: location.search }));
    expect(r.t && r.t.access === 'AT1' && /code_verifier=VER/.test(tokenBody) && /code=CODE/.test(tokenBody), 'scambio codice non riuscito: ' + tokenBody);
    expect(/Highway Star/.test(r.np) && /Deep Purple/.test(r.np), 'brano non mostrato: ' + r.np);
    expect(r.url === '', 'parametri non tolti dall\'indirizzo');
    // token scaduto: si rinnova da solo
    await p.evaluate(() => { const t = JSON.parse(localStorage.getItem('hub_spotify_v1')); t.exp = 0; localStorage.setItem('hub_spotify_v1', JSON.stringify(t)); });
    await p.evaluate(() => hubMusica.poll(true));
    expect(/grant_type=refresh_token/.test(tokenBody) && JSON.parse(await p.evaluate(() => localStorage.getItem('hub_spotify_v1'))).access === 'AT2', 'rinnovo token non riuscito');
    await p.evaluate(() => rideHud());
    const hud = await p.evaluate(() => { const e = document.getElementById('rd-np'); return getComputedStyle(e).display !== 'none' && getComputedStyle(e.querySelector('.rd-np-ctl')).display === 'none'; });
    expect(hud, 'brano non visibile nell\'HUD o comandi visibili');
    await p.evaluate(() => { rideHud(); closeRide(); localStorage.removeItem('hub_spotify_v1'); });
    await p.unroute('**/accounts.spotify.com/api/token'); await p.unroute('**/api.spotify.com/**');
  }, page);

  await test('Radio: elenco stazioni, riproduzione e titolo in onda nell\'HUD', async p => {
    const H = { 'access-control-allow-origin': '*' };
    await p.route('**/*.api.radio-browser.info/json/stations/search**', r => r.fulfill({ json: [
      { stationuuid: 'u1', name: 'Radio Uno Test', url_resolved: 'https://stream.example/uno.mp3', favicon: '', tags: 'pop,italia', bitrate: 128 },
      { stationuuid: 'u2', name: 'Radio Http', url_resolved: 'http://stream.example/no.mp3', favicon: '', tags: '' },
      { stationuuid: 'u3', name: 'Radio Uno Test', url_resolved: 'https://stream.example/doppia.mp3', favicon: '', tags: '' }], headers: H }));
    await p.route('**/*.api.radio-browser.info/json/url/**', r => r.fulfill({ json: { ok: true }, headers: H }));
    await p.route('**/stream.example/**', r => r.abort());
    await p.route('**/api/icy?**', r => r.fulfill({ json: { title: 'Vasco Rossi - Albachiara' }, headers: H }));
    await p.evaluate(() => { localStorage.removeItem('hub_radio_lista_v1'); localStorage.removeItem('hub_spotify_v1'); openRide(); hubMusica.setup('radio'); });
    await p.waitForSelector('.rd-ra-st');
    const n = await p.$$eval('.rd-ra-st', e => e.length);
    expect(n === 1, 'stazioni http o doppie non filtrate: ' + n);
    await p.click('.rd-ra-name');
    await p.waitForFunction(() => /Albachiara/.test(document.getElementById('rd-np').textContent), null, { timeout: 5000 });
    const r = await p.evaluate(() => { const e = document.getElementById('rd-np'); rideHud(); const vis = getComputedStyle(e).display !== 'none'; rideHud();
      return { txt: e.textContent, vis, fav: !!localStorage.getItem('hub_radio_pref_v1') }; });
    expect(/Albachiara/.test(r.txt) && /Vasco Rossi/.test(r.txt) && /Radio Uno Test/.test(r.txt) && /LIVE/.test(r.txt), 'titolo radio: ' + r.txt);
    expect(r.vis, 'radio non visibile nell\'HUD');
    await p.click('.rd-ra-fav');
    const fav = await p.evaluate(() => (JSON.parse(localStorage.getItem('hub_radio_pref_v1')).fav || []).length);
    expect(fav === 1, 'preferita non salvata');
    await p.evaluate(() => { ridePerfClose(); closeRide(); });
    const off = await p.evaluate(() => hubRadio.np());
    expect(off === null, 'la radio resta accesa fuori dalla Ride');
    for (const u of ['**/*.api.radio-browser.info/json/stations/search**', '**/*.api.radio-browser.info/json/url/**', '**/stream.example/**', '**/api/icy?**']) await p.unroute(u);
  }, page);

  await test('Play Store: Usato solo link ai portali', async p => {
    let usato = 0;
    await p.route('**/api/usato**', r => { usato++; r.abort(); });
    await p.evaluate(() => { window.HUB_STORE = true; hubGo('usato'); });
    await p.click('[data-act="view"][data-v="cerca"]');
    await p.selectOption('#usato-root [data-q="marca"]', 'Fiat');
    await p.selectOption('#usato-root [data-q="modello"]', 'Panda');
    await p.click('[data-act="q-go"]'); await p.waitForSelector('.us-linkbtn');
    const links = await p.$$eval('.us-linkbtn', e => e.map(a => a.href));
    expect(usato === 0, 'nell\'app Play i portali non vanno letti');
    expect(links.some(h => /autoscout24\.it\/lst\/fiat\/panda/.test(h)) && links.some(h => /automobile\.it\/fiat-panda/.test(h)) && links.some(h => /subito\.it/.test(h)), 'link ai portali: ' + links.join(' '));
    await p.evaluate(() => { window.HUB_STORE = false; });
    await p.unroute('**/api/usato**');
  }, page);

  await test('Plug-in: ricarica da form, quota elettrica e costo per 100 km', async p => {
    await p.evaluate(() => {
      const g = hubGarage.list().filter(v => v.id !== 'plug1');
      g.push({ id: 'plug1', type: 'auto', marca: 'Peugeot', modello: '308', customName: '308 Plug-in', alim: 'plugin', kmTot: 10000 });
      hubGarage.save(g); hubGarage.setActive('plug1');
      localStorage.removeItem('hub_ricarica_pref_v1');
      localStorage.setItem('hub_refuels_v1', JSON.stringify(JSON.parse(localStorage.getItem('hub_refuels_v1') || '[]').filter(r => r.vehicleId !== 'plug1').concat([
        { id: 'pf1', vehicleId: 'plug1', date: '2026-10-01', km: 10000, litri: 30, prezzoPerLitro: 1.8, costoTotale: 54, carburante: 'Benzina', isFull: true },
        { id: 'pr2', vehicleId: 'plug1', tipo: 'ricarica', date: '2026-10-10', km: 10200, kwh: 10, luogo: 'colonnina', prezzoKwh: 0.7, costoTotale: 7, carburante: 'Ricarica' },
        { id: 'pf3', vehicleId: 'plug1', date: '2026-11-01', km: 11000, litri: 20, prezzoPerLitro: 1.8, costoTotale: 36, carburante: 'Benzina', isFull: true }])));
      hubGo('garage'); openFuelLog(); openFuelLogEdit(null);
    });
    const vis = await p.evaluate(() => !document.getElementById('fl-tipobar').hidden);
    expect(vis, 'scelta carburante/ricarica non mostrata per il plug-in');
    await p.click('#fl-tipobar [data-tipo="ricarica"]');
    await p.fill('#fl-r-km', '10100'); await p.fill('#fl-r-kwh', '10');
    const tot = await p.inputValue('#fl-r-totale');
    expect(tot === '2.00', 'totale a casa con 0,20 €/kWh: ' + tot);
    await p.click('#fl-edit .gar-save');
    const r = await p.evaluate(() => {
      const v = hubGarage.active(), E = hubEnergia(v), rec = JSON.parse(localStorage.getItem('hub_refuels_v1')).filter(x => x.vehicleId === 'plug1' && x.km === 10100)[0];
      return { rec, quota: Math.round(E.quotaEv * 100), eur100: +(E.eurKm * 100).toFixed(2), txt: document.getElementById('fl-body').textContent, cons: window.hubTripStats ? null : null };
    });
    expect(r.rec && r.rec.tipo === 'ricarica' && r.rec.luogo === 'casa' && r.rec.costoTotale === 2, 'ricarica salvata male: ' + JSON.stringify(r.rec));
    expect(r.quota === 12 && r.eur100 === 4.5, 'quota elettrica o costo: ' + r.quota + '% ' + r.eur100);
    expect(/In elettrico/.test(r.txt) && /Costo per 100 km/.test(r.txt) && /⛽ Benzina/.test(r.txt), 'pannello plug-in incompleto');
    await p.evaluate(() => { closeFuelLog(); });
  }, page);

  await test('Oggi: scadenze, meteo per guidare ed energia del plug-in', async p => {
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    await p.route('**/api.open-meteo.com/v1/forecast**', r => {
      const days = [0, 1, 2, 3].map(day), hours = [];
      days.forEach(d => { for (let h = 0; h < 24; h++) hours.push(d + 'T' + String(h).padStart(2, '0') + ':00'); });
      r.fulfill({ json: { daily: { time: days, weather_code: [1, 73, 3, 61], temperature_2m_max: [12, 3, 8, 9], temperature_2m_min: [4, -2, 1, 5], precipitation_sum: [0, 6, 0, 8],
        precipitation_probability_max: [5, 90, 10, 80], wind_gusts_10m_max: [20, 30, 20, 25], snowfall_sum: [0, 4, 0, 0], sunrise: days, sunset: days },
        hourly: { time: hours, visibility: hours.map(() => 20000), temperature_2m: hours.map((h, i) => i >= 24 && i < 48 ? -1 : 6), precipitation: hours.map((h, i) => i >= 24 && i < 48 ? 0.3 : 0) } }, headers: { 'access-control-allow-origin': '*' } });
    });
    await p.evaluate((d) => {
      hubGarage.update('plug1', { scadBollo: d.ieri, scadRev: d.tra3 });
      localStorage.setItem('hub_oggi_pos_v1', JSON.stringify({ lat: 45.4, lng: 8.92, nome: 'Abbiategrasso' }));
      localStorage.removeItem('hub_oggi_meteo_v1');
      hubGo('oggi');
    }, { ieri: day(-1), tra3: day(3) });
    await p.waitForFunction(() => /Abbiategrasso/.test(document.getElementById('oggi-root').textContent), null, { timeout: 5000 });
    const r = await p.evaluate(() => ({ txt: document.getElementById('oggi-root').textContent, crit: document.querySelectorAll('.og-todo.og-crit').length, active: document.getElementById('hub-oggi').classList.contains('active') }));
    expect(r.active, 'Oggi non è la sezione attiva');
    expect(/Bollo/.test(r.txt) && /scaduto da 1 giorno/.test(r.txt) && /Revisione/.test(r.txt) && /tra 3 giorni/.test(r.txt) && r.crit >= 1, 'scadenze: ' + r.txt.slice(0, 300));
    expect(/neve/.test(r.txt) && /ghiaccio/.test(r.txt), 'avvisi meteo di domani mancanti');
    expect(/In elettrico/.test(r.txt) && /12%/.test(r.txt), 'energia del plug-in mancante');
    expect(/Giro della domenica/.test(r.txt), 'scorciatoia Giro mancante');
    await p.unroute('**/api.open-meteo.com/v1/forecast**');
  }, page);

  await test('Giro della domenica: 3 anelli, direzione con colline, passi chiusi in inverno', async p => {
    const H = { 'access-control-allow-origin': '*' };
    const hav = (a, b) => { const R = Math.PI / 180, x = Math.sin((b[1] - a[1]) * R / 2) ** 2 + Math.cos(a[1] * R) * Math.cos(b[1] * R) * Math.sin((b[0] - a[0]) * R / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(x)); };
    let osrmCalls = 0;
    await p.route('**/api.open-meteo.com/v1/elevation**', r => {
      const u = new URL(r.request().url()), la = u.searchParams.get('latitude').split(',').map(Number);
      r.fulfill({ json: { elevation: la.map(l => Math.max(0, Math.round((l - 45.3) * 3000))) }, headers: H });
    });
    await p.route('**/router.project-osrm.org/**', r => {
      osrmCalls++;
      const pts = new URL(r.request().url()).pathname.split('/').pop().split(';').map(s => s.split(',').map(Number)), coords = [];
      for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 60; k++) {
        const f = k / 60, a = pts[i], b = pts[i + 1];
        coords.push([a[0] + (b[0] - a[0]) * f + Math.sin(k / 3) * 0.002, a[1] + (b[1] - a[1]) * f]);
      }
      coords.push(pts[pts.length - 1]);
      let m = 0; for (let i = 1; i < coords.length; i++) m += hav(coords[i - 1], coords[i]);
      r.fulfill({ json: { routes: [{ distance: m, duration: m / 16, geometry: { coordinates: coords } }] }, headers: H });
    });
    await p.route('**/api.open-meteo.com/v1/forecast**', r => {
      const n = new URL(r.request().url()).searchParams.get('latitude').split(',').length, t0 = Math.floor(Date.now() / 3600000) * 3600 - 3600, HH = 384, time = [];
      for (let k = 0; k < HH; k++) time.push(t0 + k * 3600);
      r.fulfill({ json: Array(n).fill({ hourly: { time, temperature_2m: Array(HH).fill(10), precipitation: Array(HH).fill(0), weather_code: Array(HH).fill(1), visibility: Array(HH).fill(20000) } }), headers: H });
    });
    await p.route('**/photon.komoot.io/reverse**', r => r.fulfill({ json: { features: [{ properties: { city: 'Lecco' } }] }, headers: H }));
    await p.evaluate(() => { openGiro(); giroSet('ore', 3); giroSet('stile', 'curve'); giroSet('quando', 'domani'); });
    await p.click('#gi-overlay .wp-go');
    await p.waitForSelector('.gi-card', { timeout: 10000 });
    const r = await p.evaluate(() => ({ n: document.querySelectorAll('.gi-card').length, txt: document.getElementById('gi-result').textContent,
      links: [...document.querySelectorAll('.gi-card a')].map(a => a.href), brg: _giInternals.state().res.G.map(g => g.c.brg) }));
    expect(r.n === 3, 'giri proposti: ' + r.n);
    expect(r.brg.some(b => b === 0 || b === 45 || b === 315), 'la direzione con le colline (nord) non è tra le proposte: ' + r.brg);
    expect(!r.brg.some(b => b === 180), 'proposta verso il "mare" (quota 0)');
    expect(r.links.every(h => /waypoints=/.test(h) && /destination=45\.4,8\.92/.test(h)), 'link Google Maps: ' + r.links[0]);
    expect(/asciutto/.test(r.txt) && /Curve/.test(r.txt) && /▲/.test(r.txt), 'dati del giro mancanti');
    // a novembre i passi alpini sono chiusi: si avvisa e si propongono colline
    await p.evaluate(() => giroSet('stile', 'passi'));
    await p.click('#gi-overlay .wp-go');
    await p.waitForFunction(() => /Nessun passo aperto/.test(document.getElementById('gi-result').textContent) || document.querySelector('.gi-card b') && /Via /.test(document.querySelector('.gi-card b').textContent), null, { timeout: 10000 });
    const m = new Date().getMonth() + 1;
    if (m >= 11 || m <= 3) expect(/Nessun passo aperto/.test(await p.$eval('#gi-result', e => e.textContent)), 'avviso passi chiusi mancante');
    // in fondo ai risultati il pulsante "torna su" riporta all'inizio del pannello (risultati lunghi simulati)
    await p.evaluate(() => { document.getElementById('gi-result').insertAdjacentHTML('beforeend', '<div style="height:2000px"></div>'); const b = document.querySelector('#gi-overlay .wp-body'); b.scrollTop = b.scrollHeight; });
    await p.waitForSelector('#hub-top.on', { timeout: 3000 });
    await p.click('#hub-top'); await p.waitForTimeout(900);
    expect(await p.evaluate(() => document.querySelector('#gi-overlay .wp-body').scrollTop) < 5, 'torna su non riporta in cima al Giro');
    await p.evaluate(() => { giroSet('stile', 'curve'); closeGiro(); });
    await p.waitForTimeout(200);
    expect(!(await p.evaluate(() => document.getElementById('hub-top').classList.contains('on'))), 'torna su resta visibile dopo la chiusura');
    for (const u of ['**/api.open-meteo.com/v1/elevation**', '**/router.project-osrm.org/**', '**/api.open-meteo.com/v1/forecast**', '**/photon.komoot.io/reverse**']) await p.unroute(u);
  }, page);

  await test('HUD e OBD: schermo dritto o a specchio, giri e codici errore dalla chiavetta', async p => {
    await p.evaluate(() => {
      const enc = new TextEncoder(); let cb = null;
      const R = { ATZ: 'ELM327 v1.5', '0100': 'SEARCHING...\r41 00 BE 3F A8 13', '0133': '41 33 65', '010C': '41 0C 1A F8', '010D': '41 0D 3C', '0105': '41 05 7B', '010B': '41 0B 8C', ATRV: '13.9V', '03': '43 01 33 03 00 00 00', '04': '44' };
      const rx = { properties: { notify: true }, addEventListener: (t, f) => { cb = f; }, startNotifications: async () => {} };
      const tx = { properties: { write: true }, writeValue: async d => { const c = new TextDecoder().decode(d).trim(); setTimeout(() => cb({ target: { value: enc.encode((R[c] || 'OK') + '\r\r>') } }), 3); } };
      Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: { requestDevice: async () => ({ name: 'vLinker MS', addEventListener() {}, gatt: { connected: true, disconnect() {},
        connect: async () => ({ getPrimaryServices: async () => [{ getCharacteristics: async () => [rx, tx] }] }) } }) } });
      localStorage.removeItem('hub_ride_pref_v1');
      openRide(); rideHud();
    });
    const h1 = await p.evaluate(() => { const o = document.getElementById('rd-overlay'); return { hud: o.classList.contains('rd-hud'), mirror: o.classList.contains('rd-mirror'), bar: o.classList.contains('rd-hudbar-on') }; });
    expect(h1.hud && !h1.mirror && h1.bar, 'HUD dritto con i comandi visibili all\'apertura: ' + JSON.stringify(h1));
    await p.click('#rd-hud-mirror');
    expect(await p.evaluate(() => document.getElementById('rd-overlay').classList.contains('rd-mirror') && JSON.parse(localStorage.getItem('hub_ride_pref_v1')).hudMirror === true), 'specchio non attivato o non ricordato');
    await p.evaluate(() => hubOBD.connetti());
    await p.waitForFunction(() => { const d = hubOBD.dati(); return d.rpm && d.h2o != null && d.map != null && d.volt != null; }, null, { timeout: 8000 });
    const r = await p.evaluate(() => ({ d: hubOBD.dati(), b: hubOBD.boost(), obd: document.getElementById('rd-obd').textContent, vis: !document.getElementById('rd-obd').hidden }));
    expect(r.d.rpm === 1726 && r.d.kmh === 60 && r.d.h2o === 83 && r.d.volt === 13.9 && Math.abs(r.b - 0.39) < 0.01, 'valori OBD: ' + JSON.stringify(r.d));
    expect(r.vis && /1\.?726/.test(r.obd) && /83°/.test(r.obd), 'riga OBD nell\'HUD: ' + r.obd);
    const dtc = await p.evaluate(() => hubOBD.leggiDTC());
    expect(dtc.join(',') === 'P0133,P0300', 'codici errore: ' + dtc);
    await p.evaluate(() => { hubOBD.disconnetti(); rideHudMirror(); rideHud(); closeRide(); localStorage.removeItem('hub_ride_pref_v1'); });
  }, page);

  await test('Meteo percorso: pieno sul percorso, solo distributori vicini alla strada', async p => {
    const A = { lat: 45.4642, lng: 9.19 }, B = { lat: 46.17, lng: 9.87 }, N = 100, H = { 'access-control-allow-origin': '*' };
    await p.route('**/photon.komoot.io/**', r => { const q = new URL(r.request().url()).searchParams.get('q') || '', c = /sondrio/i.test(q) ? B : A;
      r.fulfill({ json: { features: [{ geometry: { coordinates: [c.lng, c.lat] }, properties: { name: /sondrio/i.test(q) ? 'Sondrio' : 'Milano' } }] }, headers: H }); });
    await p.route('**/router.project-osrm.org/**', r => { const coords = []; for (let i = 0; i < N; i++) coords.push([A.lng + (B.lng - A.lng) * i / (N - 1), A.lat + (B.lat - A.lat) * i / (N - 1)]);
      r.fulfill({ json: { routes: [{ distance: 95000, duration: 5400, geometry: { coordinates: coords }, legs: [{ annotation: { duration: Array(N - 1).fill(5400 / (N - 1)) } }] }] }, headers: H }); });
    await p.route('**/api.open-meteo.com/**', r => { const n = new URL(r.request().url()).searchParams.get('latitude').split(',').length, HH = 384, t0 = Math.floor(Date.now() / 3600000) * 3600 - 7200, time = [];
      for (let k = 0; k < HH; k++) time.push(t0 + k * 3600);
      r.fulfill({ json: Array(n).fill({ elevation: 300, hourly: { time, temperature_2m: Array(HH).fill(12), precipitation: Array(HH).fill(0), precipitation_probability: Array(HH).fill(0), weather_code: Array(HH).fill(1),
        wind_speed_10m: Array(HH).fill(5), wind_gusts_10m: Array(HH).fill(10), visibility: Array(HH).fill(20000), is_day: Array(HH).fill(1), snowfall: Array(HH).fill(0) } }), headers: H }); });
    const mid = f => ({ lat: A.lat + (B.lat - A.lat) * f, lng: A.lng + (B.lng - A.lng) * f });
    const st = [Object.assign({ id: 'a', nome: 'Vicino caro', bandiera: 'Eni', prezzo: 1.85, comune: 'Lecco' }, mid(.3)),
      Object.assign({ id: 'b', nome: 'Vicino economico', bandiera: 'Tamoil', prezzo: 1.69, comune: 'Colico' }, mid(.8), { lng: mid(.8).lng + 0.005 }),
      Object.assign({ id: 'c', nome: 'Lontano', bandiera: 'Ip', prezzo: 1.50, comune: 'Altrove' }, mid(.5), { lng: mid(.5).lng + 0.2 })];
    let bboxCalls = 0;
    await p.route('**/api/bbox?**', r => { bboxCalls++; const u = new URL(r.request().url()).searchParams;
      const la1 = +u.get('lat1'), la2 = +u.get('lat2'), lo1 = +u.get('lng1'), lo2 = +u.get('lng2');
      r.fulfill({ json: st.filter(s => s.lat >= la1 && s.lat <= la2 && s.lng >= lo1 && s.lng <= lo2), headers: H }); });
    await p.evaluate(() => { localStorage.removeItem('hub_meteo_last_v1'); hubGo('meteo'); });
    await p.fill('#wp-from', 'Milano'); await p.fill('#wp-to', 'Sondrio'); await p.fill('#wp-ret', '');
    await p.click('#wp-overlay .wp-go'); await p.waitForSelector('#wp-carb');
    await p.selectOption('#wp-carb', 'Benzina'); await p.click('.wp-pieno-go');
    await p.waitForSelector('.wp-pieno-r', { timeout: 8000 });
    const r = await p.evaluate(() => [...document.querySelectorAll('.wp-pieno-r')].map(a => a.textContent + '|' + a.href));
    expect(r.length === 2 && /Tamoil/.test(r[0]) && /Eni/.test(r[1]), 'distributori (il più economico primo, quello lontano escluso): ' + r.join(' / '));
    expect(/waypoints=/.test(r[0]) && /km 76|km 77|km 75/.test(r[0]), 'km lungo il percorso o link: ' + r[0]);
    // con 40 km di autonomia resta solo quello raggiungibile
    await p.fill('#wp-aut', '40'); await p.click('.wp-pieno-go');
    await p.waitForFunction(() => document.querySelectorAll('.wp-pieno-r').length === 1, null, { timeout: 8000 });
    expect(/Eni/.test(await p.$eval('.wp-pieno-r', e => e.textContent)), 'autonomia non rispettata');
    await p.evaluate(() => closeWeather());
    for (const u of ['**/photon.komoot.io/**', '**/router.project-osrm.org/**', '**/api.open-meteo.com/**', '**/api/bbox?**']) await p.unroute(u);
  }, page);

  await test('Manutenzione: intervalli dal motore, km stimati, gomme e modifiche', async p => {
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    await p.evaluate((d) => {
      const g = hubGarage.list().filter(v => v.id !== 'mt1');
      g.push({ id: 'mt1', type: 'auto', marca: 'Prova', modello: 'X', alim: 'benzina', kmTot: 13000, specs: { distribuzione: 'Cinghia a bagno d\'olio' }, gomme: { tipo: 'estive', misura: '225/45 R17', kmMontaggio: 9000 } });
      hubGarage.save(g); hubGarage.setActive('mt1');
      localStorage.setItem('hub_refuels_v1', JSON.stringify([{ id: 'k1', vehicleId: 'mt1', date: d.a, km: 10000, litri: 30, isFull: true }, { id: 'k2', vehicleId: 'mt1', date: d.b, km: 13000, litri: 30, isFull: true }]));
      localStorage.setItem('hub_maint_v1', JSON.stringify([{ id: 'e1', vehicleId: 'mt1', type: 'olio', doneKm: 1000, doneDate: d.c, ts: 1 }]));
      localStorage.removeItem('hub_gomme_v1'); localStorage.removeItem('hub_mods_v1');
      hubGo('garage'); mtTab('int'); openMaint();
    }, { a: day(-110), b: day(-10), c: day(-300) });
    let txt = await p.$eval('#mt-body', e => e.textContent);
    expect(/≈ 13\.3\d\d km oggi/.test(txt) && /900 km al mese/.test(txt), 'km stimati: ' + txt.slice(0, 160));
    expect(/Cinghia distribuzione a bagno d'olio/.test(txt) && /dal motore/.test(txt) && /ogni 15\.000 km/.test(txt), 'intervalli dal motore mancanti');
    expect(/≈ 3 mesi al tuo ritmo/.test(txt), 'scadenza in mesi al ritmo di guida mancante');
    // intervallo personalizzato
    await p.evaluate(() => openMaintEdit('olio'));
    await p.fill('#mt-f-ikm', '10000'); await p.click('#mt-edit .gar-save');
    await p.waitForTimeout(200);
    expect(await p.evaluate(() => hubGarage.active().maintInt.olio.km === 10000 && /tuo intervallo/.test(document.getElementById('mt-body').textContent)), 'intervallo personalizzato non salvato');
    // gomme: il treno del Garage diventa quello montato
    await p.evaluate(() => mtTab('gomme'));
    txt = await p.$eval('#mt-body', e => e.textContent);
    const m = new Date().getMonth() + 1, inverno = m === 12 || m <= 3 || (m === 11 && new Date().getDate() >= 15) || (m === 4 && new Date().getDate() <= 15);
    expect(/Estive/.test(txt) && /Montate/.test(txt) && /4\.?3\d\d km fatti/.test(txt), 'treno estivo dal Garage: ' + txt.slice(0, 200));
    if (inverno) {
      expect(/Monta le gomme invernali/.test(txt), 'avviso stagione mancante');
      expect(await p.evaluate(() => _oggiInternals.daFare().some(x => /invernali/.test(x.nome))), 'avviso gomme non in Oggi');
    }
    await p.evaluate(() => mtGommeEdit(null));
    await p.selectOption('#mg-tipo', 'invernali'); await p.fill('#mg-dot', '2016'); await p.fill('#mg-mm', '5');
    await p.click('#mt-sheet .gar-save');
    txt = await p.$eval('#mt-body', e => e.textContent);
    expect(/10 anni: da sostituire/.test(txt), 'gomme vecchie non segnalate');
    p._ownDialog = true; p.once('dialog', d => { p._ownDialog = false; d.accept('13300'); });
    await p.click('.mt-gomma-act button:has-text("Monta queste")');
    const g = await p.evaluate(() => JSON.parse(localStorage.getItem('hub_gomme_v1')));
    const est = g.find(x => x.tipo === 'estive'), inv = g.find(x => x.tipo === 'invernali');
    expect(est.periodi[0].a === 13300 && inv.periodi[0].da === 13300 && inv.periodi[0].a == null, 'cambio gomme: ' + JSON.stringify(g));
    expect(await p.evaluate(() => hubGarage.active().gomme.tipo === 'invernali'), 'gomme montate non aggiornate nel Garage');
    // modifiche
    await p.evaluate(() => { mtTab('mod'); mtModEdit(null); });
    await p.fill('#mm-titolo', 'Scarico sportivo'); await p.fill('#mm-costo', '450'); await p.fill('#mm-cv', '140');
    await p.click('#mt-sheet .gar-save'); await p.waitForTimeout(200);
    txt = await p.$eval('#mt-body', e => e.textContent);
    expect(/Scarico sportivo/.test(txt) && /450 €/.test(txt) && /140 CV/.test(txt), 'modifica non mostrata: ' + txt.slice(0, 200));
    await p.evaluate(() => { mtTab('int'); closeMaint(); });
  }, page);

  await test('Zone sul percorso: Area B e C di Milano, autovelox, vignette', async p => {
    const H = { 'access-control-allow-origin': '*' }, A = { lat: 45.4642, lng: 9.19 }, B = { lat: 45.3984, lng: 8.9183 }, N = 120;
    await p.route('**/photon.komoot.io/api/**', r => { const q = new URL(r.request().url()).searchParams.get('q') || '', c = /abbiategrasso/i.test(q) ? B : A;
      r.fulfill({ json: { features: [{ geometry: { coordinates: [c.lng, c.lat] }, properties: { name: /abbiategrasso/i.test(q) ? 'Abbiategrasso' : 'Duomo' } }] }, headers: H }); });
    await p.route('**/photon.komoot.io/reverse**', r => { const u = new URL(r.request().url()).searchParams; r.fulfill({ json: { features: [{ properties: { countrycode: +u.get('lat') > 46 ? 'CH' : 'IT', city: 'X' } }] }, headers: H }); });
    await p.route('**/router.project-osrm.org/**', r => { const c = []; for (let i = 0; i < N; i++) c.push([A.lng + (B.lng - A.lng) * i / (N - 1), A.lat + (B.lat - A.lat) * i / (N - 1)]);
      r.fulfill({ json: { routes: [{ distance: 26000, duration: 2400, geometry: { coordinates: c }, legs: [{ annotation: { duration: Array(N - 1).fill(2400 / (N - 1)) } }] }] }, headers: H }); });
    await p.route('**/api.open-meteo.com/**', r => { const n = new URL(r.request().url()).searchParams.get('latitude').split(',').length, HH = 384, t0 = Math.floor(Date.now() / 3600000) * 3600 - 7200, time = [];
      for (let k = 0; k < HH; k++) time.push(t0 + k * 3600);
      r.fulfill({ json: Array(n).fill({ elevation: 120, hourly: { time, temperature_2m: Array(HH).fill(12), precipitation: Array(HH).fill(0), precipitation_probability: Array(HH).fill(0), weather_code: Array(HH).fill(1),
        wind_speed_10m: Array(HH).fill(5), wind_gusts_10m: Array(HH).fill(10), visibility: Array(HH).fill(20000), is_day: Array(HH).fill(1), snowfall: Array(HH).fill(0) } }), headers: H }); });
    const mid = f => ({ lat: A.lat + (B.lat - A.lat) * f, lng: A.lng + (B.lng - A.lng) * f });
    await p.route('**/api/autovelox?**', r => r.fulfill({ json: { autovelox: [Object.assign({ max: '50' }, mid(.5)), { lat: 45.6, lng: 9.5, max: '90' }] }, headers: H }));
    // lunedì prossimo alle 9:00, Corsa benzina Euro 4
    const lun = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); d.setHours(9, 0, 0, 0); const z = n => String(n).padStart(2, '0');
      const g = hubGarage.list().filter(v => v.id !== 'cz1'); g.push({ id: 'cz1', type: 'auto', marca: 'Opel', modello: 'Corsa', customName: 'Corsa 1.4', alim: 'benzina', euro: 4 }); hubGarage.save(g); hubGarage.setActive('cz1');
      localStorage.removeItem('hub_meteo_last_v1'); hubGo('meteo');
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T09:00'; });
    await p.fill('#wp-from', 'Duomo Milano'); await p.fill('#wp-to', 'Abbiategrasso'); await p.fill('#wp-when', lun); await p.fill('#wp-ret', '');
    await p.click('#wp-overlay .wp-go');
    await p.waitForFunction(() => /autovelox/.test((document.getElementById('wp-zone') || {}).textContent || ''), null, { timeout: 8000 });
    let z = await p.$eval('#wp-zone', e => e.textContent);
    expect(/Area B alle 09:0\d: Corsa 1\.4 può entrare \(benzina Euro 4: vietata dal 1° ottobre 2028\)/.test(z), 'Area B Euro 4: ' + z);
    expect(/Area C attiva alle 09:0\d: ticket 7,50 €/.test(z), 'Area C ticket: ' + z);
    expect(/1 autovelox fissi segnalati sul percorso \(limiti 50 km\/h\)/.test(z), 'autovelox: ' + z);
    // Euro 3: divieto
    await p.evaluate(() => { hubGarage.update('cz1', { euro: 3 }); });
    await p.click('#wp-overlay .wp-go');
    await p.waitForFunction(() => /non può entrare/.test((document.getElementById('wp-zone') || {}).textContent || ''), null, { timeout: 8000 });
    z = await p.$eval('#wp-zone', e => e.textContent);
    expect(/Area B attiva alle 09:0\d: Corsa 1\.4 \(benzina Euro 3\) non può entrare/.test(z) && /il ticket non basta/.test(z), 'divieto Euro 3: ' + z);
    // ricarica sul percorso per la plug-in
    await p.route('**/api/ev?**', r => r.fulfill({ json: [Object.assign({ maxKW: 22, isFast: false, numPrese: 2, comune: 'Corsico', indirizzo: 'Via Roma 1', attivo: true }, mid(.3)), { lat: 45.6, lng: 9.6, maxKW: 150, comune: 'Lontano' }], headers: H }));
    await p.evaluate(() => { hubGarage.update('cz1', { euro: 6, alim: 'plugin' }); });
    await p.click('#wp-overlay .wp-go');
    await p.waitForSelector('#wp-ric .wp-pieno-go', { timeout: 8000 });
    await p.click('#wp-ric .wp-pieno-go');
    await p.waitForFunction(() => /Via Roma 1|Nessuna colonnina/.test(document.getElementById('wp-ric').textContent), null, { timeout: 8000 });
    const ric = await p.$eval('#wp-ric', e => e.textContent);
    expect(/Via Roma 1/.test(ric) && !/Lontano/.test(ric) && /piena in ~/.test(ric), 'ricarica sul percorso: ' + ric.slice(0, 300));
    await p.unroute('**/api/ev?**');
    // vignette: percorso che sale in Svizzera
    const vg = await p.evaluate(() => hubZone.vignette([{ lat: 45.8, lng: 9.0 }, { lat: 46.0, lng: 9.0 }, { lat: 46.3, lng: 9.0 }, { lat: 46.6, lng: 9.0 }]));
    expect(vg.length === 1 && vg[0].cc === 'CH' && /40 CHF/.test(vg[0].prezzi), 'vignetta Svizzera: ' + JSON.stringify(vg));
    await p.evaluate(() => { closeWeather(); hubGarage.save(hubGarage.list().filter(v => v.id !== 'cz1')); });
    for (const u of ['**/photon.komoot.io/api/**', '**/photon.komoot.io/reverse**', '**/router.project-osrm.org/**', '**/api.open-meteo.com/**', '**/api/autovelox?**']) await p.unroute(u);
  }, page);

  await test('Documenti, patente in Oggi, backup e scorciatoie dall\'icona', async p => {
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    await p.evaluate(() => { localStorage.removeItem('hub_documenti_v1'); localStorage.removeItem('hub_cloud_v1'); hubGo('garage'); openDocumenti(); });
    const fc = p.waitForEvent('filechooser'); fc.catch(() => {});
    await p.click('.doc-cell .doc-thumb');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await (await fc).setFiles({ name: 'libretto.png', mimeType: 'image/png', buffer: png });
    await p.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('hub_documenti_v1') || '{}'), v = hubGarage.active(); return d[v.id] && d[v.id]['libretto-f']; }, null, { timeout: 5000 });
    await p.fill('#doc-pat-scad', day(30)); await p.dispatchEvent('#doc-pat-scad', 'change');
    const stat = await p.$eval('#doc-launch-stat', e => e.textContent);
    expect(/1 salvato/.test(stat), 'contatore documenti: ' + stat);
    await p.evaluate(() => { closeDocumenti(); hubGo('oggi'); });
    const o = await p.$eval('#oggi-root', e => e.textContent);
    expect(/Patente/.test(o) && /tra 30 giorni/.test(o), 'patente in scadenza non in Oggi');
    expect(/Salva una copia/.test(o) && /iCloud Drive/.test(o), 'invito al backup mancante');
    await p.evaluate(() => { location.hash = 'giro'; });
    await p.waitForFunction(() => document.getElementById('gi-overlay') && document.getElementById('gi-overlay').classList.contains('visible'), null, { timeout: 3000 });
    await p.evaluate(() => { closeGiro(); history.replaceState(null, '', '#oggi'); });
    const man = await p.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()));
    expect(man.shortcuts && man.shortcuts.some(x => x.url === './#hud'), 'scorciatoie nel manifest');
  }, page);

  await test('Richiami ufficiali: telaio, Garage e Oggi', async p => {
    const R = { id: 9, ref: 'SR/01/2026', data: '2026-06-11', modelli: '308 V3, 408', descr: '', rischio: 'Il cablaggio può surriscaldarsi.', tipi: ['FIRE'],
      periodi: ['308 V3: 01.11.2023 - 12.02.2026'], vin: [{ m: '308 V3', da: 'VR3F4DGXTPY500007', a: 'VR3F4DGM6TY520657' }],
      misure: ['richiamo in officina (volontario del costruttore)'], url: 'https://ec.europa.eu/safety-gate-alerts/screen/webReport/alertDetail/9?lang=it' };
    const R2 = Object.assign({}, R, { id: 10, ref: 'SR/02/2020', data: '2020-01-01', modelli: '208', periodi: [], vin: [] });
    await p.route('**/api/richiami?**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ richiami: [R, R2] }) }));
    const prima = await p.evaluate(() => { const v = hubGarage.active(); const o = { marca: v.marca, modello: v.modello, vin: v.vin, annoImm: v.annoImm, richiamiFatti: v.richiamiFatti };
      hubGarage.update(v.id, { marca: 'Peugeot', modello: '308 SW Hybrid', vin: '', annoImm: 2024, richiamiFatti: [] }); localStorage.removeItem('hub_richiami_v1'); return o; });
    const val = await p.evaluate(R => [
      hubRichiami.valuta(R, { modello: '308', vin: 'VR3F4DGXTPY510000' }).st,
      hubRichiami.valuta(R, { modello: '308', vin: 'VR3F4DGXTPY600000' }).st,
      hubRichiami.valuta(R, { modello: '308', vin: '' }).st,
      hubRichiami.valuta(R, { modello: '308', annoImm: 2019 }).st,
      hubRichiami.valuta(R, { modello: '3008', vin: '' }).st], R);
    expect(val.join() === 'tua,no,forse,no,no', 'valutazione: ' + val);
    await p.evaluate(() => { hubGo('garage'); openRichiami(); });
    await p.waitForSelector('#ric-body .ric-card', { timeout: 4000 });
    let b = await p.$eval('#ric-body', e => e.textContent);
    expect(/Da verificare/.test(b) && !/208/.test(b), 'elenco richiami: ' + b.slice(0, 200));
    await p.fill('#ric-vin', 'vr3f4dgxtpy510000'); await p.click('.ric-vinrow button');
    b = await p.$eval('#ric-body', e => e.textContent);
    expect(/Riguarda la tua auto/.test(b), 'telaio nell\'intervallo non riconosciuto');
    expect(/per la tua auto/.test(await p.$eval('#ric-launch-stat', e => e.textContent)), 'contatore nel Garage');
    await p.evaluate(() => { closeRichiami(); hubGo('oggi'); });
    expect(/Richiamo ufficiale da fare/.test(await p.$eval('#oggi-root', e => e.textContent)), 'richiamo non in Oggi');
    await p.evaluate(() => { hubGo('garage'); openRichiami(); });
    await p.waitForSelector('.ric-act button');
    await p.click('.ric-act button');
    await p.evaluate(() => { closeRichiami(); hubGo('oggi'); });
    { const t = await p.$eval('#oggi-root', e => e.textContent), f = await p.evaluate(() => hubGarage.active().richiamiFatti); expect(!/Richiamo ufficiale da fare/.test(t), 'richiamo fatto ancora in Oggi: ' + JSON.stringify(f) + ' ' + t.slice(0, 300)); }
    await p.evaluate(o => { hubGarage.update(hubGarage.active().id, o); localStorage.removeItem('hub_richiami_v1'); }, prima);
    await p.unroute('**/api/richiami?**');
  }, page);

  await test('Passi: stato ufficiale aperto/chiuso', async p => {
    await p.route('**/api/passi', r => r.fulfill({ json: { passi: { stelvio: { stato: 'chiuso', dal: '2026-11-13', al: '2099-05-01' }, gavia: { stato: 'aperto' } } }, headers: { 'access-control-allow-origin': '*' } }));
    await p.evaluate(() => { localStorage.removeItem('hub_passi_live_v1'); localStorage.removeItem('hub_passi_status_v3'); hubGo('passi'); });
    await p.waitForFunction(() => localStorage.getItem('hub_passi_live_v1'), null, { timeout: 6000 });
    const r = await p.evaluate(() => { const P = _psInternals.PASSES, g = id => P.find(x => x.id === id), gen = new Date(new Date().getFullYear() + 1, 0, 15).getTime();
      return [_psInternals.chiusoIl(g('stelvio')), _psInternals.chiusoIl(g('gavia')), _psInternals.chiusoIl(g('gavia'), gen), _psInternals.computeStatus(g('stelvio'), null, { stato: 'chiuso', al: '2099-05-01' }).note]; });
    expect(/riapertura prevista il 01\/05\/2099/.test(r[0]) && r[1] === false && r[2] && /Chiuso, riapertura/.test(r[3]), 'stato passi: ' + JSON.stringify(r));
    await p.evaluate(() => closePassi());
    await p.unroute('**/api/passi');
  }, page);

  await test('Officine: rubrica, preventivi, da chiedere e spese', async p => {
    await p.evaluate(() => { localStorage.removeItem('hub_officine_v1'); hubGo('garage'); openMaint(); mtTab('off'); });
    for (const [nome, prezzo] of [['Officina Rossi', 480], ['Garage Bianchi', 410]]) {
      await p.evaluate(() => ofEdit(null)); await p.fill('#of-nome', nome); await p.fill('#of-tel', '02 1234567'); await p.click('#mt-sheet .gar-save');
      const id = await p.evaluate(n => hubOfficine.list().find(o => o.nome === n).id, nome);
      await p.evaluate(id => ofPrev(id), id); await p.fill('#of-pd', 'Cinghia distribuzione'); await p.fill('#of-pi', String(prezzo)); await p.click('#mt-sheet .gar-save');
    }
    const id = await p.evaluate(() => hubOfficine.list()[0].id);
    await p.evaluate(id => ofChiedi(id), id); await p.fill('#of-q', 'Rumore ruota anteriore'); await p.click('#mt-sheet .gar-save');
    let t = await p.$eval('#mt-body', e => e.textContent);
    expect(/Confronto preventivi/.test(t) && /più conveniente Garage Bianchi/.test(t) && /70 € in meno di Officina Rossi/.test(t), 'confronto: ' + t.slice(0, 400));
    expect(/Rumore ruota anteriore/.test(t) && (await p.$$('.of-act a[href^="tel:"]')).length === 2, 'da chiedere o telefono');
    // intervento collegato all'officina
    await p.evaluate(() => { mtTab('int'); openMaintEdit(hubOfficine.list().length && 'olio'); });
    await p.selectOption('#mt-f-off', id); await p.fill('#mt-f-cost', '150'); await p.fill('#mt-f-km', '20000');
    await p.evaluate(() => saveMaintEvent());
    await p.waitForTimeout(300);
    await p.evaluate(() => mtTab('off'));
    t = await p.$eval('#mt-body', e => e.textContent);
    expect(/1 lavoro · 150 € spesi/.test(t), 'spese officina: ' + t.slice(0, 300));
    await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('hub_maint_v1')); localStorage.setItem('hub_maint_v1', JSON.stringify(l.filter(e => !e.offId))); mtTab('int'); closeMaint(); });
  }, page);

  await test('Parcheggio: posizione, scadenza in Oggi, calendario', async p => {
    await p.evaluate(() => { localStorage.removeItem('hub_parcheggio_v1'); openParcheggio(); });
    await p.click('#pk-body .pk-big');
    await p.waitForFunction(() => localStorage.getItem('hub_parcheggio_v1'), null, { timeout: 6000 });
    await p.evaluate(() => pkScad(60));
    let t = await p.$eval('#pk-body', e => e.textContent);
    expect(/Scade alle/.test(t) && /Portami all'auto/.test(t), 'pannello parcheggio: ' + t.slice(0, 200));
    expect(/maps\.apple\.com|google\.com\/maps/.test(await p.$eval('#pk-body a.pk-big', e => e.href)), 'link a piedi');
    const dl = p.waitForEvent('download'); await p.click('.pk-ics');
    expect((await dl).suggestedFilename() === 'parcheggio.ics', 'promemoria calendario');
    await p.fill('#pk-nota', 'piano -2 B14'); await p.dispatchEvent('#pk-nota', 'change');
    await p.evaluate(() => { closeParcheggio(); hubGo('oggi'); });
    t = await p.$eval('#oggi-root', e => e.textContent);
    expect(/Auto parcheggiata/.test(t) && /scade alle/.test(t) && /piano -2 B14/.test(t), 'parcheggio in Oggi: ' + t.slice(0, 200));
    await p.evaluate(() => { openParcheggio(); pkPreso(); closeParcheggio(); hubGo('oggi'); });
    expect(!/Auto parcheggiata/.test(await p.$eval('#oggi-root', e => e.textContent)), 'parcheggio non rimosso');
  }, page);

  await test('Eventi: calendario autodromo, date ripetute, eventi tuoi', async p => {
    const ev = await p.evaluate(() => { const w = _eventiInternals.weekend(), z = n => String(n).padStart(2, '0'), f = (d, h) => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + h;
      const sab = new Date(w[0]); sab.setDate(sab.getDate() + 1); const out = [];
      for (let i = 0; i < 4; i++) { const d = new Date(w[0]); d.setDate(d.getDate() + 7 + i); out.push({ titolo: 'Circuit Experience', inizio: f(d, '08:00:00'), fine: f(d, '17:00:00'), luogo: 'Autodromo Nazionale Monza', lat: 45.6156, lng: 9.2811, cat: ['Tour'] }); }
      out.push({ titolo: 'Track day GT', inizio: f(sab, '09:00:00'), fine: f(sab, '18:00:00'), luogo: 'Autodromo Nazionale Monza', lat: 45.6156, lng: 9.2811, cat: ['Track Event'], url: 'https://www.monzanet.it/x' });
      return out; });
    await p.route('**/api/eventi', r => r.fulfill({ json: { eventi: ev }, headers: { 'access-control-allow-origin': '*' } }));
    await p.evaluate(() => { localStorage.removeItem('hub_eventi_cache_v1'); localStorage.removeItem('hub_eventi_miei_v1'); openEventi(); });
    await p.waitForFunction(() => /Track day GT/.test(document.getElementById('ev-body').textContent), null, { timeout: 5000 });
    let t = await p.$eval('#ev-body', e => e.textContent);
    expect(/4 date dal/.test(t) && (t.match(/Circuit Experience/g) || []).length === 1, 'date ripetute non raggruppate: ' + t.slice(0, 300));
    expect(/km da te/.test(t), 'distanza da te');
    await p.evaluate(() => evFiltro('weekend'));
    t = await p.$eval('#ev-body', e => e.textContent);
    expect(/Track day GT/.test(t) && !/Circuit Experience/.test(t), 'filtro weekend: ' + t.slice(0, 200));
    await p.evaluate(() => evNuovo()); await p.fill('#ev-t', 'Cars & Coffee Brianza'); await p.fill('#ev-l', 'Monza'); await p.click('#mt-sheet .gar-save');
    await p.evaluate(() => evFiltro('miei'));
    expect(/Cars & Coffee Brianza/.test(await p.$eval('#ev-body', e => e.textContent)), 'evento tuo');
    const dl = p.waitForEvent('download'); await p.click('#ev-body .of-act button');
    expect((await dl).suggestedFilename() === 'evento.ics', 'evento nel calendario');
    await p.evaluate(() => { closeEventi(); localStorage.removeItem('hub_eventi_miei_v1'); });
    await p.unroute('**/api/eventi');
  }, page);

  await test('Motorsport: risultati F1 e classifica', async p => {
    await p.evaluate(() => { localStorage.removeItem('hub_ms_cache_v1'); hubGo('ms'); });
    await p.waitForTimeout(800);
    await p.click('.ms-fbtn[data-flt="f1"]');
    await p.click('#ms-body .ms-card.past');
    await p.waitForTimeout(600);
    expect((await p.$$('#ms-d-body .ms-res tbody tr')).length === 3, 'risultati gara assenti');
    await p.click('#ms-detail [data-act="close-detail"]');
    await p.click('.ms-seg[data-tab="standings"]'); await p.waitForTimeout(600);
    expect(/Pilota1/.test(await p.$eval('#ms-body', e => e.innerText)), 'classifica assente');
    await p.evaluate(() => closeMotorsport());
  }, page);

  await test('Backup: cifratura e ripristino', async p => {
    const r = await p.evaluate(async () => {
      const dump = await hubBackup.collect(true);
      const enc = await hubBackup._encrypt('TEST-CODE-1234-5678-ABCD', dump);
      const dec = await hubBackup._decrypt('TEST-CODE-1234-5678-ABCD', enc);
      let wrong = 'ok'; try { await hubBackup._decrypt('ALTRO-CODICE-0000-0000-0000', enc); } catch (e) { wrong = 'rifiutato'; }
      return [/Panda/.test(enc), dec.ls.hub_garage_v1 === dump.ls.hub_garage_v1, wrong];
    });
    expect(!r[0], 'il backup cifrato contiene testo in chiaro'); expect(r[1], 'decifratura diversa dall\'originale'); expect(r[2] === 'rifiutato', 'codice sbagliato accettato');
  }, page);

  await test('Backup: copia nel cloud dell\'utente e cloud solo col proprietario', async p => {
    await p.evaluate(() => { localStorage.removeItem('hub_backup_file_v1'); localStorage.removeItem('hub_owner_key_v1'); localStorage.removeItem('hub_cloud_v1'); });
    const dl = p.waitForEvent('download');
    await p.evaluate(() => { hubBackupOpen(); document.querySelector('[data-bk="share"]').click(); });
    expect(/autohub-backup-.*\.json/.test((await dl).suggestedFilename()), 'file di backup non scaricato');
    await p.waitForFunction(() => hubBackupFile() && hubBackupFile().lastAt > 0);
    let txt = await p.$eval('#hub-backup-body', e => e.textContent);
    expect(/Sono il proprietario/.test(txt) && !/Attiva backup automatico/.test(txt), 'cloud visibile senza chiave: ' + txt);
    await p.evaluate(() => { document.querySelector('[data-bk="owner"]').click(); document.querySelector('[data-bk="genkey"]').click(); });
    const k = await p.$eval('#hub-bk-key', e => e.textContent);
    expect(/^[0-9a-f]{48}$/.test(k), 'chiave proprietario: ' + k);
    let hdr = null;
    await p.route('**/api/backup/**', r => { hdr = r.request().headers()['x-backup-key']; r.fulfill({ json: { status: 'saved' }, headers: { 'access-control-allow-origin': '*' } }); });
    await p.evaluate(() => { document.querySelector('[data-bk="back"]').click(); document.querySelector('[data-bk="on"]').click(); });
    await p.waitForFunction(() => /Backup salvato/.test(document.getElementById('hub-bk-msg').textContent), null, { timeout: 8000 });
    expect(hdr === k, 'chiave non inviata al Worker');
    await p.unroute('**/api/backup/**');
    await p.evaluate(() => { localStorage.removeItem('hub_owner_key_v1'); localStorage.removeItem('hub_cloud_v1'); document.getElementById('hub-backup').classList.remove('visible'); hubGo('oggi'); });
    expect(!/💾 Backup/.test(await p.$eval('#oggi-root', e => e.textContent)), 'promemoria backup dopo una copia recente');
  }, page);

  await test('Nessun errore JavaScript durante i test', async () => { expect(!errors.length, errors.join(' | ')); });

  await browser.close(); srv.close();
  results.forEach(r => console.log(r[0] + ' ' + r[1]));
  const ko = results.filter(r => r[0] === '✗').length;
  console.log('\n' + (ko ? ko + ' test falliti' : 'Tutti i ' + results.length + ' test superati'));
  process.exit(ko ? 1 : 0);
})();
