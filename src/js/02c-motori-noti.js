/* ═══════════════════════════════════════════════════════════════════
   MOTORI NOTI — problemi documentati per famiglia di motore/cambio
   Il database veicoli contiene soprattutto controlli generici per tipo di
   motore. Qui ci sono i difetti specifici e ben documentati (richiami,
   estensioni di garanzia, casi diffusi), riconosciuti dal nome del motore
   e dagli anni della serie. Vale per tutti i modelli che montano quel motore.
   window.hubMotoriNoti(marca, modello, gen, motore, spec) → { famiglie:[…], distribuzione, affidabilita }
   Costi: ordini di grandezza in officina indipendente, IVA inclusa.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  function anni(gen) {
    var m = /(\d{4})\D+(\d{4})/.exec(gen || '');
    if (m) return [+m[1], +m[2]];
    m = /(\d{4})/.exec(gen || '');
    return m ? [+m[1], new Date().getFullYear()] : null;
  }
  // la serie si sovrappone al periodo in cui il motore aveva il difetto
  // e la serie è iniziata quando il motore era già/ancora quello difettoso (inizio tra iniDa e iniA)
  function periodo(gen, f) {
    var y = anni(gen);
    if (!y) return true;
    return y[1] >= (f.da || 0) && y[0] <= (f.a || 9999) && y[0] >= (f.iniDa || 0) && y[0] <= (f.iniA || 9999);
  }

  var F = [
    {
      id: 'puretech', nome: 'PSA/Stellantis 1.2 PureTech (cinghia a bagno d\'olio)',
      test: function(s) { return /puretech|1\.2 (e-)?thp|1\.2 turbo|1\.2 t\b|1\.2 vti/.test(s.mot) && !/hybrid/.test(s.mot) && /peugeot|citro|ds |opel|fiat|jeep|lancia|toyota/.test(s.marca); },
      da: 2013, a: 2023, distribuzione: 'Cinghia a bagno d\'olio', affidabilita: 'bassa',
      problemi: [
        { titolo: 'Degrado della cinghia di distribuzione a bagno d\'olio', severita: 'alta',
          descrizione: 'Sui 1.2 PureTech la cinghia lavora immersa nell\'olio e con gli anni si sfalda: i frammenti intasano il pescante della pompa olio, la pressione cala e il motore può danneggiarsi. Stellantis ha esteso la garanzia su molti esemplari e accorciato gli intervalli di sostituzione.',
          sintomi: ['Spia pressione olio o messaggio "livello olio"', 'Rumore della distribuzione', 'Spia freni/servofreno a vuoto (pompa del vuoto alimentata dall\'olio)'],
          soluzione: 'Verifica dello stato della cinghia con l\'apposito calibro e del pescante; sostituzione secondo il nuovo piano Stellantis (in genere 100.000 km o 6 anni, o prima). Chiedi al concessionario se l\'auto rientra nell\'estensione di garanzia.',
          costo_min: 700, costo_max: 1500 },
        { titolo: 'Consumo d\'olio elevato (versioni turbo)', severita: 'media',
          descrizione: 'Diffuso sui 1.2 PureTech turbo 110/130 cv: fasce elastiche che si incollano e olio che passa in camera di combustione.',
          sintomi: ['Rabbocchi frequenti tra un tagliando e l\'altro', 'Fumo blu in accelerazione', 'Candele sporche'],
          soluzione: 'Usare solo olio della specifica PSA B71 2290/2312 e controllare il livello ogni 1.000–2.000 km. Nei casi gravi intervento sui pistoni in garanzia/estensione.',
          costo_min: 0, costo_max: 3000 }
      ]
    },
    {
      id: 'ecoboost', nome: 'Ford 1.0 EcoBoost',
      test: function(s) { return /ford/.test(s.marca) && /1\.0 ecoboost|1\.0 eco ?boost/.test(s.mot); },
      da: 2012, distribuzione: 'Cinghia a bagno d\'olio', affidabilita: 'media',
      problemi: [
        { titolo: 'Surriscaldamento (prime versioni)', severita: 'alta',
          descrizione: 'Sui primi 1.0 EcoBoost (circa 2012–2015) un manicotto del liquido di raffreddamento poteva cedere, portando a surriscaldamento e danni alla testata; Ford ha fatto una campagna di richiamo.',
          sintomi: ['Temperatura che sale', 'Perdita di liquido', 'Spia motore e modalità di protezione'],
          soluzione: 'Verifica che il richiamo sia stato eseguito (concessionario Ford o portale richiami con il telaio). Controllare spesso il livello del liquido.',
          costo_min: 0, costo_max: 3500 },
        { titolo: 'Cinghia di distribuzione a bagno d\'olio', severita: 'media',
          descrizione: 'La cinghia lavora nell\'olio: dura a lungo solo con l\'olio giusto (specifica Ford WSS-M2C948-B o successive) cambiato nei tempi.',
          sintomi: ['Nessun sintomo fino alla rottura'],
          soluzione: 'Sostituzione alla scadenza prevista dal libretto (di solito 150.000–200.000 km o 10 anni); chiedi la fattura se l\'auto ci è vicina.',
          costo_min: 600, costo_max: 1100 }
      ]
    },
    {
      id: 'ea111', nome: 'VW 1.2/1.4 TSI prima serie (EA111, a catena)',
      test: function(s) { return /volkswagen|audi|seat|skoda|cupra/.test(s.marca) && /\b1\.[24] ?tsi\b/.test(s.mot); },
      da: 2006, a: 2012, iniA: 2012, distribuzione: 'Catena', affidabilita: 'bassa',
      problemi: [
        { titolo: 'Allungamento della catena di distribuzione', severita: 'alta',
          descrizione: 'I 1.2 e 1.4 TSI costruiti fino al 2012 circa hanno una catena con tenditore debole: la catena si allunga e può saltare un dente, con danni a valvole e pistoni. Dalla serie EA211 (2012–2013) la catena è stata sostituita da una cinghia.',
          sintomi: ['Rumore metallico per 1–2 secondi all\'avviamento a freddo', 'Spia motore con errori di fasatura', 'Avviamento difficile'],
          soluzione: 'Sostituzione di catena, tenditore e guide alla comparsa del rumore. Su un\'auto usata chiedi la fattura dell\'intervento.',
          costo_min: 700, costo_max: 1400 }
      ]
    },
    {
      id: 'tsi-evo', nome: 'VW 1.5 TSI evo',
      test: function(s) { return /volkswagen|audi|seat|skoda|cupra/.test(s.marca) && /1\.5 (e)?tsi|35 tfsi/.test(s.mot); },
      da: 2017, a: 2020, iniA: 2019, distribuzione: 'Cinghia', affidabilita: 'media',
      problemi: [
        { titolo: 'Strappi a freddo ("effetto canguro")', severita: 'bassa',
          descrizione: 'Sui primi 1.5 TSI evo l\'auto può dare strattoni a bassa velocità nei primi minuti a motore freddo. VW ha rilasciato aggiornamenti software.',
          sintomi: ['Strappi tra 1.000 e 2.000 giri a freddo', 'Esitazione in rilascio'],
          soluzione: 'Verificare che sia stato fatto l\'aggiornamento della centralina in concessionaria.',
          costo_min: 0, costo_max: 150 }
      ]
    },
    {
      id: 'dsg', nome: 'Cambio DSG / S tronic',
      test: function(s) { return /volkswagen|audi|seat|skoda|cupra/.test(s.marca) && (/dsg|s.?tronic/.test(s.mot) || /dsg|s.?tronic/.test(s.trasm)); },
      problemi: [
        { titolo: 'Meccatronica e frizioni del DSG', severita: 'media',
          descrizione: 'Il DSG a 7 marce a secco (DQ200, sui motori fino a 250 Nm) è noto per guasti alla meccatronica e usura delle frizioni, soprattutto nell\'uso in città. I DSG a bagno d\'olio (6 e 7 marce per le coppie alte) sono più robusti se l\'olio del cambio viene sostituito.',
          sintomi: ['Strappi o vibrazioni in partenza', 'Cambiate lente o a vuoto', 'Lettera della marcia lampeggiante o modalità di emergenza'],
          soluzione: 'Prova in coda e in salita. DSG a bagno: sostituzione olio e filtro ogni 60.000 km (fatture). Diagnosi con strumento VAG prima dell\'acquisto.',
          costo_min: 300, costo_max: 2500 }
      ]
    },
    {
      id: 'ea189', nome: 'VW 1.6/2.0 TDI EA189 (Dieselgate)',
      test: function(s) { return /volkswagen|audi|seat|skoda/.test(s.marca) && /\b(1\.6|2\.0) tdi\b|\b(1\.6|2\.0) tdi cr/.test(s.mot); },
      da: 2008, a: 2015, iniDa: 2007, iniA: 2011, distribuzione: 'Cinghia', affidabilita: 'media',
      problemi: [
        { titolo: 'Aggiornamento "Dieselgate" e valvola EGR', severita: 'media',
          descrizione: 'I TDI EA189 (2008–2015) sono quelli coinvolti nel caso emissioni: la campagna di richiamo aggiorna il software (e sui 1.6 aggiunge un raddrizzatore di flusso). Dopo l\'aggiornamento alcuni proprietari segnalano più problemi a valvola EGR e filtro antiparticolato.',
          sintomi: ['Spia motore o FAP', 'Rigenerazioni frequenti', 'Calo di potenza'],
          soluzione: 'Verifica che il richiamo sia stato fatto (il controllo è gratuito in concessionaria). Pulizia/sostituzione EGR se necessaria.',
          costo_min: 0, costo_max: 900 }
      ]
    },
    {
      id: 'ea888g2', nome: 'VAG 1.8/2.0 TFSI EA888 seconda serie',
      test: function(s) { return /volkswagen|audi|seat|skoda/.test(s.marca) && /\b(1\.8|2\.0) tfsi\b|2\.0 tsi/.test(s.mot); },
      da: 2008, a: 2012, iniDa: 2007, iniA: 2011, distribuzione: 'Catena', affidabilita: 'bassa',
      problemi: [
        { titolo: 'Consumo d\'olio elevato', severita: 'alta',
          descrizione: 'Sui TFSI EA888 di seconda serie (circa 2008–2012) le fasce elastiche dei pistoni causano consumi d\'olio anche di 1 litro ogni 1.000 km; anche il tenditore della catena delle prime versioni è stato aggiornato.',
          sintomi: ['Rabbocchi frequenti', 'Fumo allo scarico', 'Rumore catena all\'avviamento'],
          soluzione: 'Chiedi quanto olio consuma e le fatture: la soluzione definitiva è la sostituzione di pistoni e fasce.',
          costo_min: 300, costo_max: 3500 }
      ]
    },
    {
      id: 'n47', nome: 'BMW 2.0 diesel N47',
      test: function(s) { return /^bmw/.test(s.marca) && /\b(1[12]6d|11[68]d|120d|123d|316d|318d|320d|325d|418d|420d|518d|520d|525d|x1 ?.?d|x3 ?.?d|sdrive1[68]d|sdrive20d|xdrive1[68]d|xdrive20d|18d|20d)\b/.test(s.mot); },
      da: 2007, a: 2014, iniA: 2013, distribuzione: 'Catena', affidabilita: 'bassa',
      problemi: [
        { titolo: 'Catena di distribuzione (lato cambio)', severita: 'alta',
          descrizione: 'Il diesel N47 (2007–2014 circa) ha la catena sul lato del volano: si allunga e può rompersi. Per sostituirla bisogna smontare il motore, per cui il costo è elevato.',
          sintomi: ['Fischio o tintinnio dal retro del motore, più forte a freddo', 'Rumore che aumenta in rilascio'],
          soluzione: 'Ascolta il motore a freddo prima dell\'acquisto; chiedi se la catena è stata sostituita (fattura). Con il rumore presente, mettilo nel prezzo.',
          costo_min: 1500, costo_max: 3000 }
      ]
    },
    {
      id: 'n20', nome: 'BMW 2.0 benzina N20',
      test: function(s) { return /^bmw/.test(s.marca) && /\b(120i|125i|220i|228i|320i|328i|420i|428i|520i|528i|x1 ?.?28i|x3 ?.?28i|sdrive20i|sdrive28i|xdrive20i|xdrive28i)\b/.test(s.mot); },
      da: 2011, a: 2015, iniDa: 2010, iniA: 2015, distribuzione: 'Catena', affidabilita: 'media',
      problemi: [
        { titolo: 'Guide della catena di distribuzione', severita: 'alta',
          descrizione: 'Sui 4 cilindri N20 costruiti fino al 2015 circa le guide in plastica della catena si usurano; BMW ha modificato il componente.',
          sintomi: ['Sibilo/fischio dal motore', 'Rumore a freddo'],
          soluzione: 'Controllo e sostituzione di guide e tenditore se rumorosi.',
          costo_min: 1200, costo_max: 2500 }
      ]
    },
    {
      id: 'tce12', nome: 'Renault/Dacia/Nissan 1.2 TCe (H5Ft)',
      test: function(s) { return /renault|dacia|nissan|mercedes/.test(s.marca) && /1\.2 (tce|dig-t)/.test(s.mot); },
      da: 2012, a: 2018, iniDa: 2010, iniA: 2017, distribuzione: 'Catena', affidabilita: 'bassa',
      problemi: [
        { titolo: 'Consumo d\'olio e danni al motore', severita: 'alta',
          descrizione: 'Il 1.2 TCe 115–130 cv (2012–2018) è noto per consumi d\'olio anomali che, se non controllati, portano a danni alla catena e al motore. Renault ha riconosciuto molti interventi.',
          sintomi: ['Livello olio che cala in fretta', 'Spia olio', 'Rumore catena'],
          soluzione: 'Chiedi lo storico: aggiornamenti e controlli consumo in rete Renault. Controllo del livello frequente.',
          costo_min: 0, costo_max: 4000 }
      ]
    },
    {
      id: 'k9k', nome: 'Renault 1.5 dCi (K9K)',
      test: function(s) { return /renault|dacia|nissan|mercedes|suzuki/.test(s.marca) && /1\.5 (blue )?dci|blue dci 1[01][05]|dci 9[05]|dci 1[01]0|\b180 ?d\b|\b160 ?d\b/.test(s.mot); },
      distribuzione: 'Cinghia', affidabilita: 'media',
      problemi: [
        { titolo: 'Bronzine di biella (versioni più vecchie)', severita: 'media',
          descrizione: 'Sui primi 1.5 dCi (fino al 2010 circa) intervalli olio lunghi e olio non adatto possono portare all\'usura delle bronzine. Le versioni più recenti sono più robuste.',
          sintomi: ['Battito metallico dal basso del motore', 'Spia pressione olio'],
          soluzione: 'Cambi olio ogni 15.000–20.000 km con olio della specifica Renault (RN0720 sui modelli con FAP).',
          costo_min: 800, costo_max: 2500 },
        { titolo: 'Valvola EGR e iniettori', severita: 'bassa',
          descrizione: 'Con uso urbano la valvola EGR si sporca; gli iniettori possono richiedere revisione dopo molti km.',
          sintomi: ['Calo di potenza', 'Fumo nero', 'Avviamento lungo'],
          soluzione: 'Pulizia EGR, diagnosi iniettori.',
          costo_min: 200, costo_max: 900 }
      ]
    },
    {
      id: 'mjet13', nome: 'Fiat/Opel/Suzuki 1.3 MultiJet / CDTI / DDiS',
      test: function(s) { return /1\.3 (multijet|mjt|mjet|cdti|ddis|jtd)/.test(s.mot); },
      distribuzione: 'Catena', affidabilita: 'alta',
      problemi: [
        { titolo: 'Filtro antiparticolato e valvola EGR in città', severita: 'media',
          descrizione: 'Motore robusto, ma con FAP (dal 2008 circa) soffre l\'uso solo urbano: il filtro non completa le rigenerazioni e si intasa; la valvola EGR si sporca.',
          sintomi: ['Spia FAP o motore', 'Ventola che resta accesa a motore spento', 'Olio che aumenta di livello (diluizione)'],
          soluzione: 'Tragitti extraurbani regolari; rigenerazione forzata o pulizia FAP. Olio a basse ceneri (Fiat 9.55535-S1).',
          costo_min: 150, costo_max: 1200 },
        { titolo: 'Allungamento catena a km elevati', severita: 'bassa',
          descrizione: 'La catena non ha sostituzione programmata ma oltre i 200.000 km può allungarsi, soprattutto con cambi olio trascurati.',
          sintomi: ['Rumore a freddo', 'Difficoltà di avviamento'],
          soluzione: 'Sostituzione kit catena se rumorosa.',
          costo_min: 400, costo_max: 900 }
      ]
    },
    {
      id: 'mjet16', nome: 'Fiat 1.6 / 2.0 MultiJet',
      test: function(s) { return /fiat|alfa|lancia|jeep/.test(s.marca) && /(1\.6|2\.0) (multijet|mjt|jtdm)/.test(s.mot); },
      distribuzione: 'Cinghia', affidabilita: 'media',
      problemi: [
        { titolo: 'Volano bimassa e FAP', severita: 'media',
          descrizione: 'Diesel robusto: le spese tipiche a km medio-alti sono volano bimassa e frizione, più FAP/EGR con uso urbano.',
          sintomi: ['Vibrazioni al minimo e in partenza', 'Colpi al rilascio frizione', 'Spia FAP'],
          soluzione: 'Prova in partenza in seconda a basso regime; chiedi se frizione e volano sono stati fatti.',
          costo_min: 700, costo_max: 1600 }
      ]
    },
    {
      id: 'twinair', nome: 'Fiat 0.9 TwinAir',
      test: function(s) { return /twinair|twin air/.test(s.mot); },
      distribuzione: 'Catena', affidabilita: 'media',
      problemi: [
        { titolo: 'Modulo MultiAir (attuatore valvole)', severita: 'media',
          descrizione: 'Il TwinAir comanda le valvole di aspirazione con il modulo idraulico MultiAir, sensibile alla qualità e al livello dell\'olio. Quando cede il motore gira male.',
          sintomi: ['Motore che "salta" o gira su un cilindro', 'Spia motore', 'Calo di potenza'],
          soluzione: 'Olio della specifica corretta cambiato puntualmente; diagnosi del modulo prima di sostituirlo.',
          costo_min: 500, costo_max: 1200 },
        { titolo: 'Consumi reali molto più alti di quelli dichiarati', severita: 'bassa',
          descrizione: 'Con guida normale il TwinAir consuma sensibilmente più del dato di omologazione, soprattutto in autostrada.',
          sintomi: ['Consumo reale spesso tra 6 e 8 l/100 km'],
          soluzione: 'Tienine conto nel costo annuo; non è un guasto.',
          costo_min: 0, costo_max: 0 }
      ]
    },
    {
      id: 'multiair', nome: 'Fiat/Alfa 1.4 MultiAir',
      test: function(s) { return /multiair|multi air/.test(s.mot) && !/twinair/.test(s.mot); },
      distribuzione: 'Cinghia', affidabilita: 'media',
      problemi: [
        { titolo: 'Modulo MultiAir', severita: 'media',
          descrizione: 'L\'attuatore idraulico che comanda le valvole di aspirazione può guastarsi, soprattutto con olio vecchio o non conforme.',
          sintomi: ['Funzionamento irregolare', 'Spia motore con errori del sistema MultiAir'],
          soluzione: 'Diagnosi; sostituzione del modulo se necessario. Olio cambiato puntualmente.',
          costo_min: 600, costo_max: 1300 }
      ]
    },
    {
      id: 'fire', nome: 'Fiat 1.2 / 1.4 Fire',
      test: function(s) { return /fiat|lancia|ford/.test(s.marca) && /\b(1\.1|1\.2|1\.4) (8v|16v|fire|easypower|natural power|gpl|69cv|60cv|54cv|77cv|65cv|70cv|73cv|75cv|95cv|100cv)\b|1\.2 69cv|1\.2 60cv|1\.4 77cv/.test(s.mot) && !/t-?jet|multiair|turbo|multijet/.test(s.mot); },
      distribuzione: 'Cinghia', affidabilita: 'alta',
      problemi: [
        { titolo: 'Motore semplice e robusto: le spese tipiche', severita: 'bassa',
          descrizione: 'Il Fire è uno dei motori più semplici e longevi: le spese ricorrenti sono cinghia di distribuzione, bobine di accensione, termostato e piccole perdite d\'olio.',
          sintomi: ['Balbettii (bobina)', 'Riscaldamento lento (termostato)'],
          soluzione: 'Cinghia ogni 5–6 anni o secondo libretto; bobine e termostato quando danno sintomi.',
          costo_min: 80, costo_max: 450 }
      ]
    },
    {
      id: 'dualogic', nome: 'Cambio robotizzato Fiat Dualogic',
      test: function(s) { return /dualogic/.test(s.mot) || /dualogic|robotizzat/.test(s.trasm); },
      problemi: [
        { titolo: 'Attuatore e pompa del Dualogic', severita: 'media',
          descrizione: 'Il robotizzato monofrizione Dualogic usa un gruppo idraulico (pompa e attuatore) che con gli anni perde pressione; anche la frizione si consuma più in fretta in città.',
          sintomi: ['Spia "avaria cambio"', 'Marce che non entrano', 'Rumore della pompa a quadro acceso'],
          soluzione: 'Diagnosi del gruppo idraulico, sostituzione dell\'olio specifico; chiedi le fatture.',
          costo_min: 300, costo_max: 1500 }
      ]
    },
    {
      id: 'powershift', nome: 'Cambio Ford PowerShift (doppia frizione a secco)',
      test: function(s) { return /ford/.test(s.marca) && (/powershift/.test(s.mot) || /powershift/.test(s.trasm)); },
      problemi: [
        { titolo: 'Frizioni e centralina del PowerShift', severita: 'alta',
          descrizione: 'Il doppia frizione a secco montato su Fiesta, Focus ed EcoSport (circa 2011–2018) ha avuto molti problemi di frizioni e centralina del cambio.',
          sintomi: ['Vibrazioni in partenza', 'Cambiate brusche', 'Spia cambio e modalità di emergenza'],
          soluzione: 'Prova accurata in coda; verifica aggiornamenti e interventi in garanzia.',
          costo_min: 500, costo_max: 2500 }
      ]
    },
    {
      id: 'toyota-hybrid', nome: 'Ibrido Toyota (Hybrid Synergy Drive)',
      test: function(s) { return /toyota|lexus|suzuki/.test(s.marca) && /hybrid|\b\d{3}h\b|rx ?400h|rx ?450h|nx ?300h|nx ?350h|ux ?250h|is ?300h/.test(s.mot); },
      distribuzione: 'Catena', affidabilita: 'alta',
      problemi: [
        { titolo: 'Stato della batteria ibrida', severita: 'bassa',
          descrizione: 'Il sistema ibrido Toyota è tra i più affidabili; la batteria di trazione dura di norma molto a lungo. Su auto con molti anni conviene far verificare lo stato della batteria (Toyota offre controlli annuali che estendono la garanzia sulla batteria).',
          sintomi: ['Motore termico che si accende molto spesso', 'Spia sistema ibrido'],
          soluzione: 'Controllo batteria ibrida in rete Toyota; pulizia del filtro/ventola di raffreddamento della batteria.',
          costo_min: 0, costo_max: 200 }
      ]
    },
    {
      id: 'd4d', nome: 'Toyota 2.0 / 2.2 D-4D (AD)',
      test: function(s) { return /toyota|lexus/.test(s.marca) && /(2\.0|2\.2) d-?4d|d-cat|\b2[02]0d\b/.test(s.mot); },
      da: 2005, a: 2013, iniA: 2012, distribuzione: 'Catena', affidabilita: 'bassa',
      problemi: [
        { titolo: 'Guarnizione della testata e consumo d\'olio', severita: 'alta',
          descrizione: 'I 2.0 e 2.2 D-4D della famiglia AD (circa 2005–2013) sono noti per consumi d\'olio e cedimenti della guarnizione della testata; Toyota ha riparato molte auto in garanzia estesa.',
          sintomi: ['Perdita di liquido refrigerante senza perdite visibili', 'Consumo d\'olio', 'Fumo bianco'],
          soluzione: 'Controllo livelli e storico interventi; evitare esemplari senza documenti.',
          costo_min: 1500, costo_max: 4000 }
      ]
    },
    {
      id: 'hdi16', nome: 'PSA/Ford 1.6 HDi 16v / TDCi',
      test: function(s) { return /peugeot|citro|ford|volvo|mazda|mini/.test(s.marca) && /1\.6 (hdi|tdci|d\b|e-hdi)|\b(d2|d3)\b.*1\.6/.test(s.mot); },
      da: 2004, a: 2011, iniA: 2010, distribuzione: 'Cinghia', affidabilita: 'media',
      problemi: [
        { titolo: 'Turbina e lubrificazione', severita: 'alta',
          descrizione: 'Sui 1.6 HDi/TDCi 16 valvole (circa 2004–2011) i depositi carboniosi possono ostruire il filtrino del tubo olio della turbina: la turbina resta senza lubrificazione e si rompe, a volte più volte.',
          sintomi: ['Fischio della turbina', 'Fumo blu', 'Calo di potenza'],
          soluzione: 'Alla sostituzione della turbina vanno cambiati anche tubo olio con filtrino e pulito il pescante; olio cambiato spesso.',
          costo_min: 700, costo_max: 1800 },
        { titolo: 'Guarnizioni degli iniettori', severita: 'media',
          descrizione: 'Le rondelle sotto gli iniettori perdono tenuta e lasciano uscire gas di scarico, con formazione di calamina attorno agli iniettori.',
          sintomi: ['Ticchettio', 'Odore di gas di scarico nel vano motore', 'Avviamento difficile'],
          soluzione: 'Sostituzione delle rondelle e pulizia delle sedi.',
          costo_min: 150, costo_max: 500 }
      ]
    },
    {
      id: 'thp', nome: 'PSA/BMW 1.6 THP / Mini (Prince)',
      test: function(s) { return (/peugeot|citro|ds /.test(s.marca) && /1\.6 (thp|vti)|thp/.test(s.mot)) || (/mini/.test(s.marca) && /cooper|one/.test(s.mot) && !/\bd\b|diesel/.test(s.mot)); },
      da: 2006, a: 2014, iniA: 2013, distribuzione: 'Catena', affidabilita: 'bassa',
      problemi: [
        { titolo: 'Catena di distribuzione e depositi carboniosi', severita: 'alta',
          descrizione: 'Il 1.6 "Prince" (Peugeot/Citroën THP e VTi, Mini Cooper e Cooper S fino al 2014 circa) ha problemi noti di allungamento catena e tenditore, oltre a depositi sulle valvole di aspirazione (iniezione diretta).',
          sintomi: ['Rumore di catena a freddo', 'Strappi e irregolarità', 'Consumo d\'olio'],
          soluzione: 'Kit catena con tenditore aggiornato; pulizia valvole. Chiedi le fatture.',
          costo_min: 800, costo_max: 2000 }
      ]
    },
    {
      id: 'bluehdi', nome: 'PSA/Stellantis BlueHDi (AdBlue)',
      test: function(s) { return /bluehdi|1\.5 hdi|1\.5 d\b|1\.5 diesel|1\.5 cdti|1\.6 d\b/.test(s.mot) && /peugeot|citro|ds |opel|fiat|toyota/.test(s.marca); },
      da: 2014, affidabilita: 'media',
      problemi: [
        { titolo: 'Serbatoio e pompa AdBlue', severita: 'media',
          descrizione: 'Sui BlueHDi è frequente il guasto del serbatoio/pompa AdBlue (cristallizzazione): compare il conto alla rovescia dei km oltre i quali l\'auto non si avvia più.',
          sintomi: ['Messaggio "Avviamento impossibile tra … km"', 'Spia emissioni/AdBlue'],
          soluzione: 'Sostituzione del serbatoio AdBlue completo; Stellantis ha esteso la garanzia su diversi esemplari.',
          costo_min: 600, costo_max: 1300 }
      ]
    },
    {
      id: 'bluehdi15', nome: 'Stellantis 1.5 BlueHDi / 1.5 diesel',
      test: function(s) { return /1\.5 (bluehdi|hdi|d|diesel|cdti)\b/.test(s.mot) && /peugeot|citro|ds |opel|fiat|toyota/.test(s.marca); },
      da: 2017, distribuzione: 'Catena',
      problemi: [
        { titolo: 'Catena di distribuzione', severita: 'media',
          descrizione: 'Sul 1.5 BlueHDi (dal 2017) sono stati segnalati casi di usura precoce della catena di distribuzione.',
          sintomi: ['Spia motore', 'Rumore a freddo', 'Messaggio di avaria antinquinamento'],
          soluzione: 'Diagnosi e verifica di eventuali aggiornamenti/estensioni in rete Stellantis.',
          costo_min: 700, costo_max: 1500 }
      ]
    },
    {
      id: 'skyd', nome: 'Mazda 2.2 Skyactiv-D',
      test: function(s) { return /mazda/.test(s.marca) && /2\.2 (skyactiv-?d|d)\b|skyactiv-d/.test(s.mot); },
      distribuzione: 'Catena', affidabilita: 'media',
      problemi: [
        { titolo: 'Diluizione dell\'olio e depositi', severita: 'media',
          descrizione: 'Con uso urbano le rigenerazioni del FAP non si completano e il gasolio diluisce l\'olio, il cui livello sale; si formano anche depositi in aspirazione.',
          sintomi: ['Livello olio che aumenta', 'Spia livello olio', 'Calo di potenza'],
          soluzione: 'Uso extraurbano regolare, cambio olio più frequente, aggiornamento software.',
          costo_min: 100, costo_max: 1500 }
      ]
    },
    {
      id: 'm271', nome: 'Mercedes 1.8 Kompressor (M271)',
      test: function(s) { return /mercedes/.test(s.marca) && /kompressor|\b(c|e|clk|slk) ?(180|200) ?k\b/.test(s.mot); },
      da: 2002, a: 2010, iniA: 2008, distribuzione: 'Catena', affidabilita: 'media',
      problemi: [
        { titolo: 'Allungamento della catena di distribuzione', severita: 'alta',
          descrizione: 'I primi M271 Kompressor (circa 2002–2008) hanno una catena a maglia singola che si allunga, con il rischio di salto di fase.',
          sintomi: ['Rumore all\'avviamento', 'Spia motore con errori dell\'albero a camme'],
          soluzione: 'Sostituzione catena, tenditore e ingranaggi del variatore se rumorosa.',
          costo_min: 900, costo_max: 2000 }
      ]
    },
    {
      id: 'edc', nome: 'Cambio Renault EDC (doppia frizione)',
      test: function(s) { return /renault|dacia|smart/.test(s.marca) && (/\bedc\b|twinamic/.test(s.mot) || /\bedc\b/.test(s.trasm)); },
      problemi: [
        { titolo: 'Frizioni e attuatori dell\'EDC', severita: 'media',
          descrizione: 'L\'EDC a secco a 6 marce può dare strappi in partenza e richiedere interventi su frizioni o attuatori, soprattutto con uso cittadino.',
          sintomi: ['Strappi a bassa velocità', 'Spia cambio', 'Rumori in manovra'],
          soluzione: 'Prova in coda e in manovra; diagnosi del cambio.',
          costo_min: 400, costo_max: 2000 }
      ]
    },
    {
      id: 'dualjet', nome: 'Suzuki 1.2 Dualjet',
      test: function(s) { return /suzuki/.test(s.marca) && /1\.2 (dualjet|hybrid|mhev)|dualjet/.test(s.mot); },
      distribuzione: 'Catena', affidabilita: 'alta',
      problemi: [
        { titolo: 'Motore molto affidabile', severita: 'bassa',
          descrizione: 'Il 1.2 Dualjet aspirato (anche in versione mild hybrid) non ha difetti ricorrenti noti: le spese sono quelle ordinarie (candele, olio, freni).',
          sintomi: [], soluzione: 'Manutenzione ordinaria secondo libretto.', costo_min: 0, costo_max: 0 }
      ]
    },
    {
      id: 'gas', nome: 'Alimentazione a GPL o metano',
      test: function(s) { return /gpl|lpg|easypower|natural power|metano|cng|ecochic|bi-?fuel|tgi|g-tec/.test(s.mot + ' ' + s.alim); },
      problemi: [
        { titolo: 'Impianto a gas: bombola, riduttore e valvole', severita: 'media',
          descrizione: 'Con il gas la combustione è più calda: valvole e sedi valvole si usurano di più (meno sui motori nati per il gas). La bombola GPL va sostituita dopo 10 anni; le bombole del metano vanno revisionate periodicamente (di solito ogni 4 anni).',
          sintomi: ['Funzionamento irregolare a gas', 'Odore di gas', 'Bombola vicina alla scadenza (vedi libretto)'],
          soluzione: 'Controlla sul libretto la data della bombola, fai verificare riduttore e iniettori del gas, registrazione valvole se prevista.',
          costo_min: 150, costo_max: 900 }
      ]
    },
    {
      id: 'ev', nome: 'Auto elettrica (batteria di trazione)',
      test: function(s) { var t = s.mot + ' ' + s.mod; return !/phev|plug|hybrid|ibrid|tfsi|tsi|\b\d\.\d\b/.test(s.mot) && (/elettric/.test(s.alim) || /\bev\b|e-tron|\bid\.\d|kwh|electric|e-208|e-2008|\beq[abcse]\b|ioniq 5|ioniq 6|\bev6\b|\bzoe\b|\bleaf\b|\bspring\b|model [3sxy]\b|\bborn\b|enyaq|ariya|bz4x|\bmg4\b|\batto\b|dolphin|\bseal\b/.test(t)); },
      distribuzione: 'Nessuna (motore elettrico)', affidabilita: 'media',
      problemi: [
        { titolo: 'Stato di salute della batteria (SoH)', severita: 'media',
          descrizione: 'Il valore di un\'elettrica usata dipende soprattutto dalla capacità residua della batteria. La garanzia della batteria è di solito 8 anni o 160.000 km, con soglia minima di capacità.',
          sintomi: ['Autonomia molto inferiore al dato originale', 'Ricarica rapida più lenta del normale'],
          soluzione: 'Chiedi un certificato SoH (concessionario o strumento OBD dedicato) e verifica la garanzia residua sulla batteria.',
          costo_min: 0, costo_max: 150 }
      ]
    }
  ];

  window.hubMotoriNoti = function(marca, modello, gen, motore, spec) {
    var s = {
      marca: String(marca || '').toLowerCase() + ' ', mod: String(modello || '').toLowerCase(),
      mot: String(motore || '').toLowerCase(), alim: String(spec && spec.alimentazione || '').toLowerCase(),
      trasm: String(spec && spec.trasmissione || '').toLowerCase()
    };
    var out = { famiglie: [], distribuzione: null, affidabilita: null };
    var rank = { bassa: 0, media: 1, alta: 2 };
    F.forEach(function(f) {
      if (!f.test(s) || !periodo(gen, f)) return;
      out.famiglie.push({ id: f.id, nome: f.nome, problemi: f.problemi });
      if (f.distribuzione && !out.distribuzione) out.distribuzione = f.distribuzione;
      // l'affidabilità più bassa tra le famiglie trovate (motore + cambio)
      if (f.affidabilita && (out.affidabilita == null || rank[f.affidabilita] < rank[out.affidabilita])) out.affidabilita = f.affidabilita;
    });
    return out;
  };
  window.hubMotoriNoti.famiglie = F;
})();
