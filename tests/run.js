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
  page.on('dialog', d => d.accept());
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await test('Avvio senza errori JavaScript', async () => { expect(!errors.length, errors.join(' | ')); });

  await test('Carburanti: ricerca comune mantiene il carburante scelto', async p => {
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

  await test('Nessun errore JavaScript durante i test', async () => { expect(!errors.length, errors.join(' | ')); });

  await browser.close(); srv.close();
  results.forEach(r => console.log(r[0] + ' ' + r[1]));
  const ko = results.filter(r => r[0] === '✗').length;
  console.log('\n' + (ko ? ko + ' test falliti' : 'Tutti i ' + results.length + ' test superati'));
  process.exit(ko ? 1 : 0);
})();
