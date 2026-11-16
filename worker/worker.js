/**
 * OsservaPrezzi Carburanti — Cloudflare Worker
 *
 * Scarica i CSV open data MIMIT e serve risposte JSON leggere.
 * Cache a 3 livelli: in-memory (isolate), Cloudflare Cache API (persistente),
 * cron scheduled (refetch automatico ogni 4h).
 *
 * Endpoints:
 *   GET /                                  → health check
 *   GET /api/medie                         → medie nazionali
 *   GET /api/comuni?q=mil                  → autocomplete comuni
 *   GET /api/cap?q=20100                   → lookup CAP
 *   GET /api/cerca?comune=MILANO&carburante=Benzina&self=0
 *   GET /api/vicini?lat=45.46&lng=9.19&carburante=Benzina&self=1&raggio=5
 *   GET /api/bbox?lat1=...&lng1=...&lat2=...&lng2=...&carburante=...&self=...
 *   GET /api/ev?lat=...&lng=...&raggio=5
 *   GET /api/refresh                       → forza refresh server-side (max 1 ogni 10 min)
 *   GET /api/impianti?ids=123,456           → prezzi attuali di alcuni impianti (preferiti, max 50)
 *   GET /api/carburanti                    → elenco nomi carburante MIMIT e categoria assegnata (diagnostica)
 *   GET /api/motogp?path=events&seasonUuid=…  → proxy dell'API risultati MotoGP (che non permette CORS)
 *   PUT /api/backup/<id>  · GET /api/backup/<id>  → backup cifrato dell'app (serve il KV "BACKUP")
 *
 * Backup: nel dashboard Cloudflare crea un namespace KV (es. "autohub-backup") e
 * collegalo al Worker in Settings → Bindings → KV namespace, con nome variabile BACKUP.
 *
 * Setup wrangler.toml:
 *   [triggers]
 *   crons = ["0 *\/4 * * *"]
 */

const MIMIT_PREZZI = 'https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv';
const EV_CSV       = 'https://gabryc93.github.io/prezzibenzina/infrastrutture.csv';
const MIMIT_ANAG   = 'https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv';

const MAX_AGE_MS = 5 * 3600 * 1000; // 5h hard limit per la cache in-memory

// Chiave include data + slot di 4 ore (ora italiana) → invalidazione automatica
function cacheKey() {
  const r = romeParts(new Date());
  const day = r.day;
  const slot = Math.floor(r.h / 4);
  return 'https://cache.opf/v15/' + day + '/' + slot;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FUEL_KEYS = ['Benzina', 'Diesel', 'GPL', 'Metano', 'Benzina Premium', 'Diesel Premium', 'HVO'];

// Assegna a ogni descrizione carburante MIMIT UNA sola categoria.
// Prima si usava includes(): "Gasolio Premium" o "Benzina WR 100" finivano anche
// in Diesel/Benzina base, falsando medie e classifiche. Ora i carburanti base
// richiedono il nome esatto; tutte le varianti vanno nelle categorie Premium.
// Controlla il risultato su /api/carburanti.
function fuelKey(raw) {
  const c = (raw || '').toLowerCase().trim();
  if (!c) return '';
  if (c === 'benzina') return 'Benzina';
  if (c === 'gasolio') return 'Diesel';
  if (c.includes('hvo')) return 'HVO';
  if (c === 'gpl' || c.includes('gas di petrolio')) return 'GPL';
  if (c === 'gnl') return 'GNL';                       // metano liquido per mezzi pesanti: fuori dal Metano auto
  if (c === 'metano' || c.includes('gnc')) return 'Metano';
  if (c.includes('ottani')) return 'Benzina Premium';
  if (c.includes('diesel') || c.includes('gasolio') || c.includes('hi-q') || c.includes('hiq')) return 'Diesel Premium';
  if (c.includes('benzina') || c.includes('super') || c.includes('v-power')) return 'Benzina Premium';
  return raw.trim();
}

// Parametro ?carburante= → categoria (accetta sia le categorie sia un nome MIMIT grezzo)
function wantedKey(param) {
  return FUEL_KEYS.includes(param) ? param : fuelKey(param);
}

// Ora di Roma indipendente dal fuso dell'isolate
function romeParts(d) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const o = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return { day: o.year + '-' + o.month + '-' + o.day, h: parseInt(o.hour, 10) % 24, m: parseInt(o.minute, 10) };
}

// Cache in-memory per l'isolate corrente
let _mem = null;
let _memKey = null;
let _memTs = 0;

// Calcola il prossimo slot di aggiornamento (ogni 4 ore ora italiana)
// Restituisce un istante reale (UTC). Prima veniva serializzata l'ora di Roma
// come se fosse UTC: il client mostrava il prossimo aggiornamento 1-2 ore dopo.
function nextUpdateISO() {
  const now = new Date();
  const r = romeParts(now);
  const minsToNext = (Math.floor(r.h / 4) + 1) * 240 - (r.h * 60 + r.m);
  const next = new Date(now.getTime() + minsToNext * 60000);
  next.setUTCSeconds(0, 0);
  return next.toISOString();
}

let _lastForced = 0;
const REFRESH_MIN_MS = 10 * 60 * 1000;

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      const path = url.pathname;

      // ── Proxy MotoGP: non tocca i dati carburanti ─────────────
      if (path === '/api/motogp') return await motogpProxy(url, ctx);

      // ── Backup cifrato dell'app ───────────────────────────────
      if (path.startsWith('/api/backup/')) return await backupHandler(request, env, path.slice('/api/backup/'.length));

      // ── Force refresh: bypassa tutte le cache e rifa il fetch da MIMIT ──
      if (path === '/api/refresh') {
        // Ogni refresh riscarica ~2 CSV da MIMIT: limitato a uno ogni 10 minuti
        const tooSoon = _mem && (Date.now() - Math.max(_lastForced, new Date(_mem._cachedAt).getTime())) < REFRESH_MIN_MS;
        const data = tooSoon ? _mem : await getData(true);
        if (!tooSoon) _lastForced = Date.now();
        return ok({
          status: tooSoon ? 'recent' : 'refreshed',
          cachedAt: data._cachedAt,
          extractionDate: data._extractionDate,
          impianti: Object.keys(data.anagrafica).length,
        });
      }

      const data = await getData(false);

      // ── Health check ──────────────────────────────────────────
      if (path === '/' || path === '') {
        return ok({
          status: 'ok',
          cachedAt: data._cachedAt,
          extractionDate: data._extractionDate,
          impianti: Object.keys(data.anagrafica).length,
          conPrezzi: Object.keys(data.prezzi).length,
        });
      }

      // ── Medie nazionali ───────────────────────────────────────
      if (path === '/api/medie') {
        return ok({
          ...data.medie,
          _cachedAt: data._cachedAt,
          _extractionDate: data._extractionDate,
          _nextUpdate: nextUpdateISO(),
        });
      }

      // ── Elenco carburanti e categoria assegnata (diagnostica) ──
      if (path === '/api/carburanti') {
        const count = {};
        for (const list of Object.values(data.prezzi)) {
          for (const p of list) {
            const k = p.carb + '|' + p.k;
            count[k] = (count[k] || 0) + 1;
          }
        }
        return ok(Object.entries(count)
          .map(([k, n]) => ({ nome: k.split('|')[0], categoria: k.split('|')[1], prezzi: n }))
          .sort((a, b) => b.prezzi - a.prezzi));
      }

      // ── Autocomplete comuni ───────────────────────────────────
      // Le chiavi sono "NOME|PROVINCIA": i comuni omonimi restano distinti.
      if (path === '/api/comuni') {
        const q = (url.searchParams.get('q') || '').trim().toUpperCase();
        if (q.length < 2) return ok([]);
        const matches = Object.keys(data.comuni)
          .filter(c => c.startsWith(q))
          .sort((a, b) => data.comuni[b].ids.length - data.comuni[a].ids.length)
          .slice(0, 10)
          .map(c => ({
            nome: c.split('|')[0],
            provincia: data.comuni[c].provincia,
            count: data.comuni[c].ids.length,
          }));
        return ok(matches);
      }

      // ── Cerca impianti per comune ─────────────────────────────
      if (path === '/api/cerca') {
        const comune   = (url.searchParams.get('comune') || '').trim().toUpperCase();
        const carb     = url.searchParams.get('carburante') || 'Benzina';
        const selfOnly = url.searchParams.get('self') === '1';

        if (!comune) return ok({ error: 'parametro comune obbligatorio' }, 400);

        const prov = (url.searchParams.get('provincia') || '').trim().toUpperCase();
        // Con provincia: solo quel comune. Senza: tutti gli omonimi (compatibilità col vecchio frontend).
        let ids = [];
        if (prov && data.comuni[comune + '|' + prov]) {
          ids = data.comuni[comune + '|' + prov].ids;
        } else {
          for (const [k, v] of Object.entries(data.comuni)) {
            if (k.split('|')[0] === comune) ids = ids.concat(v.ids);
          }
        }
        if (!ids.length) return ok([]);

        const want = wantedKey(carb);
        const results = [];

        for (const id of ids) {
          const anag   = data.anagrafica[id] || {};
          const prezzi = data.prezzi[id] || [];
          for (const p of prezzi) {
            if (p.k !== want) continue;
            if (selfOnly && !p.isSelf) continue;
            results.push({
              id,
              nome:      anag.nome || anag.gestore || 'Impianto ' + id,
              gestore:   anag.gestore  || '',
              indirizzo: anag.indirizzo || '',
              bandiera:  anag.bandiera  || '',
              comune:    anag.comune    || '',
              provincia: anag.provincia || '',
              lat:       anag.lat || null,
              lng:       anag.lng || null,
              prezzo:    p.prezzo,
              isSelf:    p.isSelf,
              carburante: p.carb,
              dtComu:    p.dtComu,
            });
          }
        }

        results.sort((a, b) => a.prezzo - b.prezzo);
        return ok(results.slice(0, 60));
      }

      // ── Stazioni in bounding box (per mappa percorso) ───────────
      if (path === '/api/bbox') {
        const lat1 = parseFloat(url.searchParams.get('lat1'));
        const lng1 = parseFloat(url.searchParams.get('lng1'));
        const lat2 = parseFloat(url.searchParams.get('lat2'));
        const lng2 = parseFloat(url.searchParams.get('lng2'));
        const carb = url.searchParams.get('carburante') || 'Benzina';
        const selfOnly = url.searchParams.get('self') === '1';
        const want = wantedKey(carb);
        if ([lat1,lng1,lat2,lng2].some(isNaN)) return ok({ error: 'bbox params mancanti' }, 400);
        const minLat = Math.min(lat1, lat2), maxLat = Math.max(lat1, lat2);
        const minLng = Math.min(lng1, lng2), maxLng = Math.max(lng1, lng2);
        const results = [];
        for (const [id, anag] of Object.entries(data.anagrafica)) {
          if (!anag.lat || !anag.lng || isNaN(anag.lat) || isNaN(anag.lng)) continue;
          if (anag.lat < minLat || anag.lat > maxLat || anag.lng < minLng || anag.lng > maxLng) continue;
          // Una riga per impianto: il prezzo più basso tra quelli compatibili (prima prendeva il primo del CSV)
          let best = null;
          for (const p of (data.prezzi[id] || [])) {
            if (p.k !== want) continue;
            if (selfOnly && !p.isSelf) continue;
            if (!best || p.prezzo < best.prezzo) best = p;
          }
          if (best) {
            results.push({
              id, nome: anag.nome || anag.gestore || 'Impianto ' + id,
              gestore: anag.gestore || '', indirizzo: anag.indirizzo || '',
              bandiera: anag.bandiera || '', comune: anag.comune || '',
              lat: anag.lat, lng: anag.lng,
              prezzo: best.prezzo, isSelf: best.isSelf, carburante: best.carb, dtComu: best.dtComu,
            });
          }
        }
        results.sort((a, b) => a.prezzo - b.prezzo);
        return ok(results);
      }

      // ── Colonnine EV da CSV GitHub (aggiornato mensilmente) ────────
      if (path === '/api/ev') {
        const lat    = parseFloat(url.searchParams.get('lat'));
        const lng    = parseFloat(url.searchParams.get('lng'));
        const raggio = parseFloat(url.searchParams.get('raggio') || '5');
        const soloAttivi = url.searchParams.get('attivi') !== '0';

        if (isNaN(lat) || isNaN(lng)) return ok({ error: 'lat/lng obbligatori' }, 400);

        const evData = await getEVData();
        const results = [];
        const seen = new Set();
        for (const s of evData) {
          const dist = haversine(lat, lng, s.lat, s.lng);
          if (dist > raggio) continue;
          if (soloAttivi && !s.attivo) continue;
          const key = s.lat.toFixed(4) + ',' + s.lng.toFixed(4);
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ ...s, distanza: Math.round(dist * 10) / 10 });
          }
        }
        results.sort((a, b) => a.distanza - b.distanza);
        return ok(results);
      }

      // ── Prezzi attuali di impianti precisi (preferiti dell'app) ──
      if (path === '/api/impianti') {
        const ids = (url.searchParams.get('ids') || '').split(',').map(x => x.trim()).filter(x => /^\d{1,9}$/.test(x)).slice(0, 50);
        const out = {};
        for (const id of ids) {
          const anag = data.anagrafica[id];
          out[id] = {
            nome: anag ? (anag.nome || anag.gestore || '') : null,
            prezzi: (data.prezzi[id] || []).map(p => ({ carb: p.carb, k: p.k, prezzo: p.prezzo, isSelf: p.isSelf, dtComu: p.dtComu })),
          };
        }
        return ok({ _extractionDate: data._extractionDate, impianti: out });
      }

      // ── Lookup CAP ────────────────────────────────────────────
      if (path === '/api/cap') {
        const cap = (url.searchParams.get('q') || '').trim();
        if (!/^\d{5}$/.test(cap)) return ok([]);
        const comuni = data.capMap[cap] || [];
        return ok(comuni.map(c => ({
          nome: c.split('|')[0],
          provincia: data.comuni[c]?.provincia || '',
          count: data.comuni[c]?.ids.length || 0,
        })));
      }

      // ── Stazioni vicine (GPS) ─────────────────────────────────
      if (path === '/api/vicini') {
        const lat    = parseFloat(url.searchParams.get('lat'));
        const lng    = parseFloat(url.searchParams.get('lng'));
        const carb   = url.searchParams.get('carburante') || 'Benzina';
        const selfOnly = url.searchParams.get('self') === '1';
        const raggio = parseFloat(url.searchParams.get('raggio') || '5');
        const want = wantedKey(carb);

        if (isNaN(lat) || isNaN(lng)) return ok({ error: 'lat/lng obbligatori' }, 400);

        const results = [];
        for (const [id, anag] of Object.entries(data.anagrafica)) {
          if (!anag.lat || !anag.lng || isNaN(anag.lat) || isNaN(anag.lng)) continue;
          const dist = haversine(lat, lng, anag.lat, anag.lng);
          if (dist > raggio) continue;
          const prezzi = data.prezzi[id] || [];
          for (const p of prezzi) {
            if (p.k !== want) continue;
            if (selfOnly && !p.isSelf) continue;
            results.push({
              id,
              nome:      anag.nome || anag.gestore || 'Impianto ' + id,
              gestore:   anag.gestore  || '',
              indirizzo: anag.indirizzo || '',
              bandiera:  anag.bandiera  || '',
              comune:    anag.comune    || '',
              provincia: anag.provincia || '',
              lat:       anag.lat,
              lng:       anag.lng,
              distanza:  Math.round(dist * 10) / 10,
              prezzo:    p.prezzo,
              isSelf:    p.isSelf,
              carburante: p.carb,
              dtComu:    p.dtComu,
            });
          }
        }
        results.sort((a, b) => a.prezzo - b.prezzo);
        return ok(results.slice(0, 60));
      }

      return ok({ error: 'endpoint non trovato' }, 404);

    } catch (e) {
      console.error('[fetch]', e.stack || e.message);
      return ok({ error: e.message }, 500);
    }
  },

  // Cron handler: gira ogni 4h grazie al trigger configurato in wrangler.toml
  // Forza il refresh dei dati così quando arrivano gli utenti hanno già la cache calda.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      getData(true).catch(e => console.error('[scheduled] refresh failed:', e.message))
    );
  },
};

// ── Backup ────────────────────────────────────────────────────────
// L'app manda dati già cifrati sul dispositivo; l'id è l'hash del codice personale.
// Il Worker non può leggere il contenuto: lo conserva e lo restituisce.
const BACKUP_MAX = 15 * 1024 * 1024;     // 15 MB (foto e documenti compresi)
const BACKUP_MIN_GAP = 20 * 1000;        // al massimo un salvataggio ogni 20 secondi per codice

async function backupHandler(request, env, id) {
  if (!env.BACKUP) return ok({ error: 'Backup non configurato sul Worker: manca il KV "BACKUP"' }, 501);
  if (!/^[0-9a-f]{64}$/.test(id)) return ok({ error: 'id non valido' }, 400);
  const key = 'bk:' + id;
  if (request.method === 'GET') {
    const v = await env.BACKUP.get(key);
    if (v === null) return ok({ error: 'non trovato' }, 404);
    return new Response(v, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
  }
  if (request.method === 'PUT') {
    const len = parseInt(request.headers.get('content-length') || '0', 10);
    if (len > BACKUP_MAX) return ok({ error: 'backup troppo grande (max 15 MB)' }, 413);
    const body = await request.text();
    if (body.length > BACKUP_MAX) return ok({ error: 'backup troppo grande (max 15 MB)' }, 413);
    let j;
    try { j = JSON.parse(body); } catch (e) { return ok({ error: 'formato non valido' }, 400); }
    if (!j || j.v !== 1 || typeof j.iv !== 'string' || typeof j.ct !== 'string') return ok({ error: 'formato non valido' }, 400);
    const prev = await env.BACKUP.getWithMetadata(key);
    if (prev && prev.metadata && Date.now() - prev.metadata.ts < BACKUP_MIN_GAP) return ok({ error: 'troppo presto, riprova tra poco' }, 429);
    await env.BACKUP.put(key, body, { metadata: { ts: Date.now(), size: body.length } });
    return ok({ status: 'saved', size: body.length });
  }
  return ok({ error: 'metodo non consentito' }, 405);
}

// ── Proxy risultati MotoGP ────────────────────────────────────────
// L'API ufficiale non manda header CORS, quindi il browser non può chiamarla.
// Solo questi percorsi in sola lettura; risposta in cache 10 minuti.
const MOTOGP_API = 'https://api.motogp.pulselive.com/motogp/v1/results/';
const MOTOGP_PATHS = /^(seasons|events|categories|sessions|standings|session\/[0-9a-f-]{36}\/classification)$/;
const MOTOGP_PARAMS = ['seasonUuid', 'eventUuid', 'categoryUuid', 'isFinished', 'test'];

async function motogpProxy(url, ctx) {
  const p = url.searchParams.get('path') || '';
  if (!MOTOGP_PATHS.test(p)) return ok({ error: 'percorso non consentito' }, 400);
  const qs = new URLSearchParams();
  for (const k of MOTOGP_PARAMS) {
    const v = url.searchParams.get(k);
    if (v !== null) {
      if (!/^[\w-]{1,64}$/.test(v)) return ok({ error: 'parametro non valido: ' + k }, 400);
      qs.set(k, v);
    }
  }
  const target = MOTOGP_API + p + (qs.toString() ? '?' + qs : '');
  const cache = caches.default;
  const key = new Request('https://cache.opf/motogp/' + p + '?' + qs);
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } });
  const res = await fetch(target, { headers: { 'Accept': 'application/json', 'User-Agent': 'AutoHub/1.0' } });
  if (!res.ok) return ok({ error: 'MotoGP HTTP ' + res.status }, 502);
  const body = await res.text();
  ctx.waitUntil(cache.put(key, new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=600' } })));
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } });
}

// ── Gestione dati ─────────────────────────────────────────────────

async function getData(force) {
  const cache = caches.default;
  const key = new Request(cacheKey());

  // 1. Se non force, prova prima cache in-memory dell'isolate (più veloce)
  if (!force && _mem && _memKey === cacheKey() && (Date.now() - _memTs) < MAX_AGE_MS) {
    return _mem;
  }

  // 2. Se non force, prova Cloudflare Cache API (persiste tra isolate)
  if (!force) {
    try {
      const cached = await cache.match(key);
      if (cached) {
        const data = await cached.json();
        const age = Date.now() - new Date(data._cachedAt).getTime();
        if (age < MAX_AGE_MS) {
          _mem = data;
          _memKey = cacheKey();
          _memTs = Date.now();
          return data;
        }
      }
    } catch (e) { /* ignore cache errors */ }
  }

  // 3. Refetch fresco da MIMIT
  const fresh = await buildData();
  _mem = fresh;
  _memKey = cacheKey();
  _memTs = Date.now();

  // 4. Salva in Cache API per i prossimi isolate
  try {
    const toCache = new Response(JSON.stringify(fresh), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=18000' }
    });
    await cache.put(key, toCache);
  } catch (e) { /* cache write failure non-blocking */ }

  return fresh;
}

// ── EV CSV loader ─────────────────────────────────────────────
let _evMem = null;
let _evMemTs = 0;
const EV_TTL = 24 * 3600 * 1000; // 24h

async function getEVData() {
  const now = Date.now();
  if (_evMem && (now - _evMemTs) < EV_TTL) return _evMem;

  const res = await fetch(EV_CSV, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!res.ok) throw new Error('CSV EV non disponibile: ' + res.status);
  const text = await res.text();
  const lines = text.replace(/\r/g, '').split('\n');

  const headers = lines[0].replace(/^\uFEFF/, '').split(';');
  const idx = {
    lat:    headers.indexOf('Latitudine'),
    lng:    headers.indexOf('Longitudine'),
    stato:  headers.indexOf('Stato'),
    città:  headers.findIndex(h => h.includes('Citta')),
    indirizzo: headers.indexOf('Indirizzo'),
    potenzaW: headers.findIndex(h => h.includes('Potenza massima')),
    potenzaTipo: headers.indexOf('Potenza Erogabile'),
    corrente: headers.findIndex(h => h.includes('corrente')),
    orario:  headers.findIndex(h => h.includes('Orario')),
  };

  const stationMap = new Map();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(';');
    if (row.length < 8) continue;
    const lat = parseFloat(row[idx.lat]);
    const lng = parseFloat(row[idx.lng]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const key = lat.toFixed(5) + ',' + lng.toFixed(5);
    const attivo = row[idx.stato]?.trim() === 'Attivo';
    const potenzaW = parseInt(row[idx.potenzaW]) || 0;
    const potenzaKW = Math.round(potenzaW / 1000);
    const corrente = row[idx.corrente]?.trim() || '';
    const potenzaTipo = row[idx.potenzaTipo]?.trim() || '';

    if (!stationMap.has(key)) {
      stationMap.set(key, {
        id: 'ev' + i,
        lat, lng,
        comune: row[idx.città]?.trim().replace(/^" ?"$/, '') || '',
        indirizzo: row[idx.indirizzo]?.trim().replace(/^" ?"$/, '') || '',
        orario: row[idx.orario]?.trim().replace(/^" ?"$/, '') || '',
        attivo,
        maxKW: potenzaKW,
        isFast: potenzaKW >= 50,
        connettori: [],
        numPrese: 0,
        operatore: '',
      });
    }

    const st = stationMap.get(key);
    if (attivo && !st.attivo) st.attivo = true;
    if (potenzaKW > st.maxKW) { st.maxKW = potenzaKW; st.isFast = potenzaKW >= 50; }

    const connLabel = potenzaTipo + (corrente ? ' ' + corrente : '');
    if (connLabel && !st.connettori.includes(connLabel)) st.connettori.push(connLabel);
    st.numPrese++;
  }

  _evMem = [...stationMap.values()];
  _evMemTs = now;
  return _evMem;
}

async function buildData() {
  const [anagText, prezziText] = await Promise.all([
    fetchCSV(MIMIT_ANAG),
    fetchCSV(MIMIT_PREZZI),
  ]);
  const anagrafica = parseAnagrafica(anagText);
  const capMap = anagrafica._capMap || {};
  delete anagrafica._capMap;
  const { prezzi, comuni } = parsePrezzi(prezziText, anagrafica);
  const medie = calcMedie(prezzi);
  const extractionDate = parseExtractionDate(prezziText);
  return {
    anagrafica, prezzi, comuni, capMap, medie,
    _cachedAt: new Date().toISOString(),
    _extractionDate: extractionDate,
  };
}

function parseExtractionDate(raw) {
  const firstLine = raw.split('\n')[0] || '';
  const m = firstLine.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return new Date().toISOString().slice(0, 10);
}

// IMPORTANTE: niente cache CF sul fetch dei CSV MIMIT (li vogliamo sempre freschi
// dalla sorgente, è il livello sopra che cacha il risultato processato).
async function fetchCSV(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OsservaPrezziCarburanti/2.0' },
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (!res.ok) throw new Error(`CSV ${url} → HTTP ${res.status}`);
  return res.text();
}

// ── Parser CSV MIMIT ──────────────────────────────────────────────
// Separatore: "|" dal 10/02/2026 (prima era ",")

function sep(line) { return line.includes('|') ? '|' : ','; }

function parseAnagrafica(raw) {
  const map = {};
  const lines = raw.split('\n');
  const start = lines[0].toLowerCase().includes('idimpianto') ? 1 : 0;
  const capIndex = {};
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const p = line.split(sep(line));
    if (p.length < 8 || !/^\d+$/.test(p[0].trim())) continue;   // salta "Estrazione del…" e l'intestazione
    const indirizzo = p[5]?.trim() || '';
    const comune    = p[6]?.trim() || '';
    map[p[0].trim()] = {
      gestore:  p[1]?.trim() || '',
      bandiera: p[2]?.trim() || '',
      nome:     p[4]?.trim() || '',
      indirizzo,
      comune,
      provincia:p[7]?.trim() || '',
      lat:      parseFloat((p[8] || '').replace(',','.')),
      lng:      parseFloat((p[9] || '').replace(',','.')),
    };
    const capMatch = indirizzo.match(/\b(\d{5})\b/);
    if (capMatch && comune) {
      const cap = capMatch[1];
      if (!capIndex[cap]) capIndex[cap] = new Set();
      capIndex[cap].add(comune.toUpperCase() + '|' + (p[7]?.trim() || '').toUpperCase());
    }
  }
  const capMap = {};
  for (const [cap, set] of Object.entries(capIndex)) capMap[cap] = [...set];
  map._capMap = capMap;
  return map;
}

function parsePrezzi(raw, anagrafica) {
  const prezzi = {};
  const comuni = {};
  const lines = raw.split('\n');
  const start = lines[0].toLowerCase().includes('idimpianto') ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const p = line.split(sep(line));
    if (p.length < 4) continue;
    const id     = p[0].trim();
    const carb   = p[1]?.trim() || '';
    const prezzo = parseFloat(p[2]?.replace(',', '.'));
    const isSelf = p[3]?.trim() === '1';
    const dtComu = p[4]?.trim() || '';
    if (!id || isNaN(prezzo) || prezzo <= 0.1 || prezzo > 5) continue;

    if (!prezzi[id]) prezzi[id] = [];
    prezzi[id].push({ carb, k: fuelKey(carb), prezzo, isSelf, dtComu });

    const anag = anagrafica[id];
    if (anag?.comune) {
      const c = anag.comune.toUpperCase() + '|' + (anag.provincia || '').toUpperCase();
      if (!comuni[c]) comuni[c] = { ids: [], provincia: anag.provincia };
      if (!comuni[c].ids.includes(id)) comuni[c].ids.push(id);
    }
  }
  return { prezzi, comuni };
}

function calcMedie(prezzi) {
  const b = Object.fromEntries(FUEL_KEYS.map(k => [k, {self:[],serv:[]}]));
  for (const entries of Object.values(prezzi)) {
    for (const e of entries) {
      if (b[e.k]) b[e.k][e.isSelf ? 'self' : 'serv'].push(e.prezzo);
    }
  }
  const result = {};
  for (const [fuel, buckets] of Object.entries(b)) {
    result[fuel] = {
      self:      buckets.self.length  ? avg(buckets.self)  : null,
      serv:      buckets.serv.length  ? avg(buckets.serv)  : null,
      selfCount: buckets.self.length,
      servCount: buckets.serv.length,
    };
  }
  return result;
}

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

function ok(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}