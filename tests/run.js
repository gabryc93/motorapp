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

  await test('Usato: import da Claude, costo vero e Area B', async p => {
    await p.evaluate(() => hubGo('usato'));
    await p.click('[data-act="import"]');
    await p.fill('#us-import-text', '[{"titolo":"Ford Fiesta 1.4 TDCi","marca":"Ford","modello":"Fiesta","anno_immatricolazione":2009,"prezzo":2900,"km":190000,"alimentazione":"Diesel","euro":4,"venditore":"privato","link":"javascript:alert(1)"}]');
    await p.click('[data-act="do-import"]'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const a = hubUsato.data().ads[0]; return [Math.round(hubUsato._calc.costoVero(a)), hubUsato._calc.areaB(a).st, a.link]; });
    expect(r[0] > 2900, 'costo vero non calcolato'); expect(r[1] === 'no', 'diesel Euro 4 deve risultare fuori Area B'); expect(r[2] === '', 'link javascript: non filtrato');
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
