# AutoHub (motorapp)

App che unisce prezzi carburanti, garage, ricerca dell'usato e diagnosi veicolo.

## Struttura

```
index.html            file pubblicato (generato da build.py: non modificarlo a mano)
db.json               database veicoli (problemi noti, specifiche, manutenzione)
build.py              assembla src/ in index.html e controlla la sintassi
src/
  index.template.html markup della pagina, con i segnaposto per CSS e JS
  css/NN-nome.css     stili, uniti in ordine alfabetico
  js/NN-nome.js       un modulo per file, ognuno nel proprio <script>
worker/worker.js      Cloudflare Worker dei prezzi carburanti
index.prev.html       copia della versione precedente (si può eliminare)
```

## Modificare e pubblicare

1. Modifica i file in `src/`.
2. `python build.py` rigenera `index.html`. Con Node installato la build si ferma
   se un file JS ha un errore di sintassi, se c'è testo dopo `</html>` o se un
   modulo non è collegato al template.
3. Carica su GitHub `index.html` (e `db.json` solo se è cambiato).

Per aggiungere un modulo: crea `src/js/15-nome.js` e aggiungi nel template
`<script>/*@JS:15-nome@*/</script>`.

Lo stato condiviso tra moduli passa da `window` (`hubGarage`, `hubFuelLog`,
`hubUsato`, `hubToday()`, `_hubUpdatePillVisibility()`): una variabile dichiarata
dentro la funzione di un modulo non è visibile dagli altri.

## Worker

Incolla `worker/worker.js` nell'editor del Worker `osservaprezzi` su Cloudflare e
premi Deploy. Dopo il deploy apri `/api/carburanti` per controllare come i nomi
carburante MIMIT vengono assegnati alle categorie.

## Usato: regole da riverificare

In `src/js/14-usato.js`, oggetto `RULES`: voci del passaggio di proprietà (ACI 2026)
e calendario Area B Milano, verificati il 16/11/2026.
