# AutoHub (motorapp)

App web per appassionati di auto e moto: prezzi carburanti, garage, ricerca dell'usato,
diagnosi, passi alpini, ride mode e motorsport. Si installa sul telefono come app (PWA).

## Struttura

```
index.html            pagina pubblicata (generata da build.py: non modificarla a mano)
sw.js                 service worker (generato da build.py da src/sw.js)
manifest.webmanifest  dati per l'installazione come app
icons/                icone dell'app
db/                   database veicoli diviso per marca (index.json + un file per marca)
db.json               vecchio database intero: serve solo se manca db/ (si può togliere)
build.py              assembla src/ in index.html e sw.js, controlla la sintassi
src/
  index.template.html markup della pagina, con i segnaposto per CSS e JS
  css/NN-nome.css     stili, uniti in ordine alfabetico
  js/NN-nome.js       un modulo per file, ognuno nel proprio <script>
  sw.js               sorgente del service worker
tools/
  db_tool.py          controlla, corregge e divide il database veicoli
  db-report.md        report dell'ultimo controllo del database
tests/run.js          test automatici nel browser
worker/worker.js      Cloudflare Worker (prezzi carburanti, proxy MotoGP, backup)
```

## Modificare e pubblicare

1. Modifica i file in `src/`.
2. `python build.py` rigenera `index.html` e `sw.js`. Con Node installato la build si
   ferma se un file JS ha un errore di sintassi, se c'è testo dopo `</html>` o se un
   modulo non è collegato al template.
3. `python build.py --test` fa anche girare i test (vedi sotto).
4. Pubblica su GitHub (con Git, vedi sotto, oppure caricando i file).

Per aggiungere un modulo: crea `src/js/18-nome.js` e aggiungi nel template
`<script>/*@JS:18-nome@*/</script>`.

Lo stato condiviso tra moduli passa da `window` (`hubGarage`, `hubVDB`, `hubIDB`,
`hubICS`, `hubToday()`, `hubBackup`, `_hubUpdatePillVisibility()`): una variabile
dichiarata dentro la funzione di un modulo non è visibile dagli altri.

## Usare Git (consigliato al posto del caricamento manuale)

Con Git ogni pubblicazione resta nella cronologia e puoi tornare indietro in un clic.

1. Installa **GitHub Desktop** (desktop.github.com) e accedi con il tuo account.
2. *File → Clone repository* → scegli il repository del sito (es. `motorapp`) e una cartella.
3. Copia dentro quella cartella il contenuto di questa (sovrascrivendo).
4. In GitHub Desktop vedi l'elenco delle modifiche: scrivi un titolo (es. "Garage con tendine")
   e premi **Commit to main**, poi **Push origin**. GitHub Pages si aggiorna in 1-2 minuti.
5. Per annullare una pubblicazione: scheda *History* → clic destro sul commit → *Revert*.

`.gitignore` evita di caricare le dipendenze dei test e i file temporanei.

## Test automatici

Una volta sola: installa Node.js (nodejs.org), poi nella cartella `tests`:

```
npm install
npx playwright install chromium
```

Poi, dalla cartella del progetto: `python build.py --test`. I test aprono l'app in un
browser invisibile con dati finti (Worker, F1 e MotoGP simulati) e controllano: avvio
senza errori, ricerca carburanti, Garage con tendine e calendario, caricamento del
database per marca, Usato, risultati Motorsport e cifratura del backup.

## Worker

Incolla `worker/worker.js` nell'editor del Worker `osservaprezzi` su Cloudflare e premi Deploy.

- `/api/carburanti` mostra come i nomi carburante MIMIT vengono assegnati alle categorie.
- `/api/impianti?ids=…` dà i prezzi attuali dei distributori preferiti (avvisi prezzo).
- `/api/motogp?path=…` fa da ponte per i risultati MotoGP (l'API ufficiale non permette
  chiamate dirette dal browser).
- `/api/backup/<id>` conserva il backup cloud. **Richiede un KV**: nel dashboard Cloudflare
  *Storage & Databases → KV → Create* (nome a piacere, es. `autohub-backup`), poi nel Worker
  *Settings → Bindings → Add → KV namespace* con nome variabile **`BACKUP`**. Senza KV il
  resto funziona e il backup cloud risponde "non configurato".

## Backup

Altro → Backup e ripristino:
- **File**: scarica un .json con tutti i dati, comprese foto dei veicoli e documenti della manutenzione.
- **Cloud**: i dati vengono cifrati sul telefono con una chiave ricavata da un codice personale
  (es. `ABCD-EFGH-…`); il Worker riceve solo dati cifrati. Salvataggio automatico all'apertura
  (ogni 12 ore) e quando chiudi l'app, solo se qualcosa è cambiato. **Se perdi il codice il
  backup cloud non si recupera**: salvalo nelle note.

## Database veicoli

`python tools/db_tool.py db.json` controlla il database, corregge ciò che è certo, divide per
marca in `db/` e scrive `tools/db-report.md`. Correzioni applicate all'ultimo giro:
- 177 motori diesel segnati "Benzina" (BMW 118d, Multijet, D-4D…) → Diesel
- 17 elettriche segnate "Benzina" (ID.4, Q4 e-tron, i3s, iX, e-Golf…) → Elettrico; 45 elettriche con "cambio manuale" → automatico
- coppia (Nm) rimossa da tutti i 2.183 motori: era la potenza × un coefficiente fisso, non un dato reale
- Panda 1.0 Hybrid tolta dalla serie 2012–2017 (è uscita nel 2020)

0-100 e velocità massima sono intervalli per categoria: l'app li mostra come stima e non li
inserisce nelle specifiche del Garage. `hubFixVDB()` corregge comunque i diesel anche se
l'app ripiega sul vecchio `db.json`.

## Fonti dati della sezione Motorsport

- F1: api.jolpi.ca (calendario, risultati, qualifiche, sprint, classifiche), chiamata diretta
- MotoGP: calendario salvato in `13-motorsport.js` (date verificate il 16/11/2026) e link ai risultati ufficiali.
  L'API di motogp.com rifiuta le richieste dai server, quindi il ponte `/api/motogp` del Worker non riceve dati
  (`MGP_LIVE = false`); il codice resta pronto se un giorno l'API lo permettesse.
- WSBK, WRC: elenchi inseriti a mano in `13-motorsport.js`, con link ai siti ufficiali
- Circuiti: elenco con link ai calendari ufficiali (niente date inserite a mano)

## Usato: regole da riverificare

In `src/js/14-usato.js`, oggetto `RULES`: voci del passaggio di proprietà (ACI 2026)
e calendario Area B Milano, verificati il 16/11/2026.
