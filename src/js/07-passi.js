/* ═══════════════════════════════════════════════════════════════════
   PASSI & STRADE — per motociclisti
   · Passi: elenco curato (coordinate e quote verificate su OpenStreetMap),
     stato stagionale indicativo + meteo in vetta (Open-Meteo, quota del passo),
     distanza da te, preferiti, mappa, previsioni a 3 giorni.
   · Strade: strade asfaltate più guidate (curvatura) intorno a te, a un luogo
     o a un passo. Dati OpenStreetMap via Worker (/api/strade, con cache);
     i tratti con lo stesso nome vengono uniti e se ne prende il pezzo migliore.
     Apri il percorso in Google Maps o scarica il GPX.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';
  function h(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function workerBase() {
    try { if (typeof WORKER === 'string' && WORKER) return WORKER; } catch (e) {}
    return window.WORKER || 'https://osservaprezzi.gabrycois.workers.dev';
  }
  var MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  /* ── Passi curati ─────────────────────────────────────────────────
     area: dolomiti | alpi | appennino | isole
     closed: mesi in cui di solito è chiuso (indicativo: le date cambiano ogni anno)
     length / hairpins: solo dove noti (null = non indicato)               */
  var PASSES = [
    { id:'stelvio', name:'Passo dello Stelvio', region:'Lombardia / Alto Adige', area:'alpi', lat:46.5286, lng:10.4532, alt:2758, length:24, hairpins:48, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Il passo dei 48 tornanti del versante altoatesino, il secondo asfaltato più alto delle Alpi. Lato Bormio più aperto e scorrevole.' },
    { id:'gavia', name:'Passo di Gavia', region:'Lombardia', area:'alpi', lat:46.3435, lng:10.4873, alt:2621, length:25, hairpins:34, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Stretto e selvaggio, in alcuni tratti senza guardrail. Per chi ha esperienza.' },
    { id:'mortirolo', name:'Passo del Mortirolo', region:'Lombardia', area:'alpi', lat:46.2479, lng:10.2983, alt:1852, length:12, hairpins:33, closed:[12,1,2,3], diff:'expert', desc:'Pendenze molto forti e tornanti ravvicinati nel bosco: un mito del ciclismo, impegnativo anche in moto.' },
    { id:'pordoi', name:'Passo Pordoi', region:'Trentino / Veneto', area:'dolomiti', lat:46.4876, lng:11.8122, alt:2239, length:11, hairpins:33, closed:null, diff:'medium', desc:'Cuore delle Dolomiti, tornanti ampi e vista sul Sella. Tappa del Sellaronda.' },
    { id:'sella', name:'Passo Sella', region:'Trentino / Alto Adige', area:'dolomiti', lat:46.5081, lng:11.7673, alt:2240, length:11, hairpins:21, closed:null, diff:'medium', desc:'Tra Sassolungo e gruppo del Sella. Molto trafficato in alta stagione.' },
    { id:'gardena', name:'Passo Gardena', region:'Alto Adige', area:'dolomiti', lat:46.5498, lng:11.8084, alt:2121, length:10, hairpins:13, closed:null, diff:'medium', desc:'Il passo del Sellaronda tra Val Gardena e Val Badia, curve fluide.' },
    { id:'campolongo', name:'Passo Campolongo', region:'Alto Adige / Veneto', area:'dolomiti', lat:46.5139, lng:11.8724, alt:1875, length:6, hairpins:16, closed:null, diff:'easy', desc:'Il più facile dei quattro passi del Sellaronda.' },
    { id:'falzarego', name:'Passo Falzarego', region:'Veneto', area:'dolomiti', lat:46.5188, lng:12.0084, alt:2105, length:18, hairpins:24, closed:null, diff:'medium', desc:'Strada della Grande Guerra sotto le Tofane; si combina con il Giau e il Valparola.' },
    { id:'giau', name:'Passo Giau', region:'Veneto', area:'dolomiti', lat:46.4826, lng:12.0539, alt:2236, length:9, hairpins:29, closed:null, diff:'expert', desc:'Tornanti stretti e ravvicinati con uno dei panorami più belli delle Dolomiti.' },
    { id:'valparola', name:'Passo Valparola', region:'Veneto / Alto Adige', area:'dolomiti', lat:46.5251, lng:11.9974, alt:2192, length:null, hairpins:null, closed:null, diff:'medium', desc:'A due passi dal Falzarego, scende verso la Val Badia: classico anello dolomitico.' },
    { id:'fedaia', name:'Passo Fedaia', region:'Trentino / Veneto', area:'dolomiti', lat:46.4640, lng:11.8626, alt:2057, length:14, hairpins:8, closed:null, diff:'medium', desc:'Sotto il ghiacciaio della Marmolada, con il lago in cima e pendenze forti sul lato veneto.' },
    { id:'sanpellegrino', name:'Passo San Pellegrino', region:'Trentino / Veneto', area:'dolomiti', lat:46.3784, lng:11.7917, alt:1918, length:null, hairpins:null, closed:null, diff:'easy', desc:'Collega Val di Fassa e Agordino, largo e scorrevole.' },
    { id:'costalunga', name:'Passo di Costalunga', region:'Trentino / Alto Adige', area:'dolomiti', lat:46.4043, lng:11.6090, alt:1745, length:null, hairpins:null, closed:null, diff:'easy', desc:'Tra Catinaccio e Latemar, con il lago di Carezza sul versante altoatesino.' },
    { id:'lavaze', name:'Passo di Lavazè', region:'Trentino / Alto Adige', area:'dolomiti', lat:46.3547, lng:11.4927, alt:1807, length:null, hairpins:null, closed:null, diff:'easy', desc:'Altopiano di prati e boschi, poco trafficato.' },
    { id:'rolle', name:'Passo Rolle', region:'Trentino', area:'dolomiti', lat:46.2963, lng:11.7863, alt:1971, length:21, hairpins:18, closed:null, diff:'medium', desc:'Sotto le Pale di San Martino, asfalto buono e curve scorrevoli.' },
    { id:'manghen', name:'Passo Manghen', region:'Trentino', area:'dolomiti', lat:46.1733, lng:11.4415, alt:2047, length:25, hairpins:32, closed:[11,12,1,2,3,4], diff:'medium', desc:'Strada poco frequentata tra boschi e malghe; asfalto irregolare in alcuni tratti.' },
    { id:'cereda', name:'Passo Cereda', region:'Trentino / Veneto', area:'dolomiti', lat:46.1930, lng:11.9054, alt:1369, length:null, hairpins:null, closed:null, diff:'easy', desc:'Collegamento tranquillo tra Primiero e Agordino.' },
    { id:'duran', name:'Passo Duran', region:'Veneto', area:'dolomiti', lat:46.3249, lng:12.0961, alt:1605, length:null, hairpins:null, closed:null, diff:'medium', desc:'Strada stretta e solitaria tra Agordo e Zoldo.' },
    { id:'staulanza', name:'Passo Staulanza', region:'Veneto', area:'dolomiti', lat:46.4207, lng:12.1045, alt:1766, length:null, hairpins:null, closed:null, diff:'easy', desc:'Sotto il Pelmo, tra Val di Zoldo e Val Fiorentina.' },
    { id:'cibiana', name:'Passo Cibiana', region:'Veneto', area:'dolomiti', lat:46.3744, lng:12.2598, alt:1530, length:null, hairpins:null, closed:null, diff:'medium', desc:'Dal Cadore alla Val di Zoldo, con il borgo dei murales.' },
    { id:'trecroci', name:'Passo Tre Croci', region:'Veneto', area:'dolomiti', lat:46.5570, lng:12.2019, alt:1809, length:null, hairpins:null, closed:null, diff:'easy', desc:'Da Cortina verso Misurina e le Tre Cime.' },
    { id:'erbe', name:'Passo delle Erbe', region:'Alto Adige', area:'dolomiti', lat:46.6751, lng:11.8143, alt:1987, length:null, hairpins:null, closed:null, diff:'medium', desc:'Strada stretta sotto il Sass de Putia, tra Val di Funes e Val Badia.' },
    { id:'pennes', name:'Passo di Pennes', region:'Alto Adige', area:'alpi', lat:46.8188, lng:11.4413, alt:2211, length:null, hairpins:null, closed:[11,12,1,2,3,4], diff:'medium', desc:'Da Bolzano a Vipiteno per la Val Sarentino: lungo, vario, poco trafficato.' },
    { id:'mendola', name:'Passo della Mendola', region:'Alto Adige / Trentino', area:'alpi', lat:46.4168, lng:11.2083, alt:1363, length:14, hairpins:18, closed:null, diff:'easy', desc:'Tornanti regolari tra Caldaro e la Val di Non.' },
    { id:'resia', name:'Passo di Resia', region:'Alto Adige', area:'alpi', lat:46.8344, lng:10.5102, alt:1507, length:null, hairpins:null, closed:null, diff:'easy', desc:'Il passo del campanile nel lago, verso Austria e Svizzera.' },
    { id:'tonale', name:'Passo del Tonale', region:'Lombardia / Trentino', area:'alpi', lat:46.2580, lng:10.5818, alt:1883, length:15, hairpins:8, closed:null, diff:'easy', desc:'Largo e sempre aperto, collega Val Camonica e Val di Sole.' },
    { id:'aprica', name:'Passo dell\'Aprica', region:'Lombardia', area:'alpi', lat:46.1543, lng:10.1542, alt:1172, length:null, hairpins:null, closed:null, diff:'easy', desc:'Collega Valtellina e Val Camonica, aperto tutto l\'anno.' },
    { id:'vivione', name:'Passo del Vivione', region:'Lombardia', area:'alpi', lat:46.0366, lng:10.1993, alt:1828, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Strada stretta e lunga tra Val di Scalve e Val Camonica, molto panoramica.' },
    { id:'crocedomini', name:'Passo di Crocedomini', region:'Lombardia', area:'alpi', lat:45.9075, lng:10.4095, alt:1892, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Alture bresciane selvagge, tratti stretti verso il lago d\'Idro.' },
    { id:'presolana', name:'Passo della Presolana', region:'Lombardia', area:'alpi', lat:45.9292, lng:10.0990, alt:1297, length:null, hairpins:null, closed:null, diff:'easy', desc:'Sotto la Presolana, tra Val Seriana e Val di Scalve.' },
    { id:'zambla', name:'Colle di Zambla', region:'Lombardia', area:'alpi', lat:45.8871, lng:9.7977, alt:1264, length:null, hairpins:null, closed:null, diff:'easy', desc:'Tra Val Serina e Val Seriana, tornanti nel bosco.' },
    { id:'sanmarco', name:'Passo San Marco', region:'Lombardia', area:'alpi', lat:46.0472, lng:9.6228, alt:1991, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Dalla Val Brembana alla Valtellina sulla storica via Priula.' },
    { id:'spluga', name:'Passo dello Spluga', region:'Lombardia / Svizzera', area:'alpi', lat:46.5056, lng:9.3303, alt:2115, length:30, hairpins:36, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Tornanti vertiginosi sul lato italiano e paesaggio d\'alta quota verso il confine.' },
    { id:'bernina', name:'Passo del Bernina', region:'Svizzera', area:'alpi', lat:46.4108, lng:10.0281, alt:2328, length:35, hairpins:14, closed:null, diff:'easy', desc:'Ben asfaltato, paesaggio glaciale e il trenino rosso. In giornata dalla Lombardia.' },
    { id:'forno', name:'Passo del Forno (Ofenpass)', region:'Svizzera', area:'alpi', lat:46.6398, lng:10.2922, alt:2150, length:null, hairpins:null, closed:null, diff:'easy', desc:'Attraversa il Parco Nazionale Svizzero verso la Val Müstair.' },
    { id:'sanbernardino', name:'Passo del San Bernardino', region:'Svizzera', area:'alpi', lat:46.4971, lng:9.1711, alt:2067, length:17, hairpins:24, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Alternativa alla galleria dell\'A13, tornanti regolari e asfalto ottimo.' },
    { id:'lucomagno', name:'Passo del Lucomagno', region:'Svizzera', area:'alpi', lat:46.5743, lng:8.8012, alt:1972, length:null, hairpins:null, closed:null, diff:'easy', desc:'Dal Ticino ai Grigioni, ampio e panoramico.' },
    { id:'gotthard', name:'Passo del San Gottardo (Tremola)', region:'Svizzera', area:'alpi', lat:46.5593, lng:8.5612, alt:2106, length:13, hairpins:38, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'La Tremola: strada storica in pavé con decine di tornanti. Serve sensibilità.' },
    { id:'furka', name:'Passo della Furka', region:'Svizzera', area:'alpi', lat:46.5727, lng:8.4152, alt:2429, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Tra Vallese e Uri, con il ghiacciaio del Rodano: si combina con Grimsel e Susten.' },
    { id:'susten', name:'Passo del Susten', region:'Svizzera', area:'alpi', lat:46.7291, lng:8.4465, alt:2224, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Strada larga e spettacolare tra ghiacciai e gallerie.' },
    { id:'sempione', name:'Passo del Sempione', region:'Svizzera', area:'alpi', lat:46.2502, lng:8.0317, alt:2006, length:null, hairpins:null, closed:null, diff:'easy', desc:'Dall\'Ossola al Vallese, strada larga aperta tutto l\'anno.' },
    { id:'gransanbernardo', name:'Colle del Gran San Bernardo', region:'Valle d\'Aosta / Svizzera', area:'alpi', lat:45.8691, lng:7.1704, alt:2469, length:null, hairpins:null, closed:[10,11,12,1,2,3,4,5], diff:'medium', desc:'Lo storico ospizio dei cani San Bernardo; d\'inverno resta solo il traforo.' },
    { id:'piccolosanbernardo', name:'Colle del Piccolo San Bernardo', region:'Valle d\'Aosta / Francia', area:'alpi', lat:45.6792, lng:6.8829, alt:2188, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Da La Thuile verso la Savoia, lunghi tornanti panoramici.' },
    { id:'nivolet', name:'Colle del Nivolet', region:'Piemonte / Valle d\'Aosta', area:'alpi', lat:45.4792, lng:7.1423, alt:2612, length:null, hairpins:null, closed:[10,11,12,1,2,3,4,5,6], diff:'expert', desc:'Nel Parco del Gran Paradiso, strada senza uscita tra laghi d\'alta quota. In estate possono esserci giornate con accesso limitato.' },
    { id:'iseran', name:'Col de l\'Iseran', region:'Francia', area:'alpi', lat:45.4171, lng:7.0309, alt:2764, length:48, hairpins:20, closed:[11,12,1,2,3,4,5,6], diff:'expert', desc:'Il passo asfaltato più alto delle Alpi. Strada stretta e isolata, di solito aperto solo in piena estate.' },
    { id:'galibier', name:'Col du Galibier', region:'Francia', area:'alpi', lat:45.0641, lng:6.4079, alt:2642, length:23, hairpins:13, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Salita mitica del Tour de France, con il Télégraphe sul versante nord.' },
    { id:'monginevro', name:'Colle del Monginevro', region:'Piemonte / Francia', area:'alpi', lat:44.9313, lng:6.7257, alt:1851, length:8, hairpins:5, closed:null, diff:'easy', desc:'Aperto tutto l\'anno, porta verso Briançon e i grandi colli francesi.' },
    { id:'sommeiller', name:'Colle del Sommeiller', region:'Piemonte', area:'alpi', lat:45.1332, lng:6.8458, alt:3009, length:18, hairpins:0, closed:[10,11,12,1,2,3,4,5,6,7], diff:'expert', desc:'Strada sterrata, NON asfaltata: solo moto enduro o adventure, accesso regolamentato. Verifica le regole prima di partire.' },
    { id:'agnello', name:'Colle dell\'Agnello', region:'Piemonte / Francia', area:'alpi', lat:44.6839, lng:6.9796, alt:2744, length:23, hairpins:25, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Terzo passo asfaltato più alto delle Alpi: lato italiano lungo, lato francese ripido.' },
    { id:'sampeyre', name:'Colle di Sampeyre', region:'Piemonte', area:'alpi', lat:44.5510, lng:7.1196, alt:2284, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'expert', desc:'Tra Val Varaita e Val Maira, strada stretta e ripida.' },
    { id:'fauniera', name:'Colle Fauniera', region:'Piemonte', area:'alpi', lat:44.3856, lng:7.1218, alt:2481, length:null, hairpins:null, closed:[10,11,12,1,2,3,4,5,6], diff:'expert', desc:'Strada stretta e d\'alta quota nelle valli cuneesi, asfalto a tratti rovinato.' },
    { id:'maddalena', name:'Colle della Maddalena', region:'Piemonte / Francia', area:'alpi', lat:44.4218, lng:6.8984, alt:1991, length:null, hairpins:null, closed:null, diff:'easy', desc:'Dalla Valle Stura verso la Francia, ampio e scorrevole.' },
    { id:'lombarda', name:'Colle della Lombarda', region:'Piemonte / Francia', area:'alpi', lat:44.2027, lng:7.1501, alt:2351, length:null, hairpins:null, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Da Vinadio verso Isola 2000, tornanti nel bosco e poi alpeggi.' },
    { id:'montecrocecarnico', name:'Passo di Monte Croce Carnico', region:'Friuli-Venezia Giulia / Austria', area:'alpi', lat:46.6036, lng:12.9451, alt:1360, length:null, hairpins:null, closed:null, diff:'medium', desc:'Dalla Carnia alla Carinzia, tornanti in gallerie e sotto pareti di roccia.' },
    { id:'sellanevea', name:'Sella Nevea', region:'Friuli-Venezia Giulia', area:'alpi', lat:46.3904, lng:13.4763, alt:1195, length:null, hairpins:null, closed:null, diff:'easy', desc:'Tra Canin e Montasio, verso il lago del Predil.' },
    { id:'fugazze', name:'Pian delle Fugazze', region:'Veneto / Trentino', area:'alpi', lat:45.7602, lng:11.1733, alt:1163, length:null, hairpins:null, closed:null, diff:'easy', desc:'Sotto il Pasubio, collega Vallarsa e Valli del Pasubio.' },
    { id:'xomo', name:'Passo Xomo', region:'Veneto', area:'alpi', lat:45.7771, lng:11.2376, alt:1058, length:null, hairpins:null, closed:null, diff:'medium', desc:'Tornanti stretti nel bosco tra Posina e Valli del Pasubio.' },
    { id:'penice', name:'Passo del Penice', region:'Emilia-Romagna / Lombardia', area:'appennino', lat:44.7973, lng:9.3283, alt:1149, length:null, hairpins:null, closed:null, diff:'easy', desc:'Il passo dei motociclisti lombardi: da Varzi a Bobbio con curve continue.' },
    { id:'faiallo', name:'Passo del Faiallo', region:'Liguria', area:'appennino', lat:44.4588, lng:8.6692, alt:1060, length:null, hairpins:null, closed:null, diff:'medium', desc:'Strada di crinale con il mare sotto, spesso nella nebbia.' },
    { id:'bracco', name:'Passo del Bracco', region:'Liguria', area:'appennino', lat:44.2495, lng:9.5697, alt:612, length:null, hairpins:null, closed:null, diff:'easy', desc:'La vecchia Aurelia tra Sestri Levante e La Spezia, curve una dopo l\'altra.' },
    { id:'cisa', name:'Passo della Cisa', region:'Emilia-Romagna / Toscana', area:'appennino', lat:44.4716, lng:9.9285, alt:1041, length:null, hairpins:null, closed:null, diff:'easy', desc:'La statale della Cisa: alternativa panoramica all\'autostrada A15.' },
    { id:'cerreto', name:'Passo del Cerreto', region:'Emilia-Romagna / Toscana', area:'appennino', lat:44.3041, lng:10.2171, alt:1243, length:null, hairpins:null, closed:null, diff:'easy', desc:'Dall\'Appennino reggiano alla Lunigiana.' },
    { id:'radici', name:'Passo delle Radici', region:'Emilia-Romagna / Toscana', area:'appennino', lat:44.2093, lng:10.4888, alt:1527, length:null, hairpins:null, closed:null, diff:'medium', desc:'Tra Frignano e Garfagnana, uno dei valichi più alti dell\'Appennino tosco-emiliano.' },
    { id:'abetone', name:'Passo dell\'Abetone', region:'Toscana', area:'appennino', lat:44.1456, lng:10.6650, alt:1388, length:null, hairpins:null, closed:null, diff:'easy', desc:'Storico valico tra Pistoia e Modena, tra le foreste.' },
    { id:'futa', name:'Passo della Futa', region:'Toscana', area:'appennino', lat:44.0962, lng:11.2753, alt:903, length:null, hairpins:null, closed:null, diff:'easy', desc:'La vecchia statale Bologna–Firenze: con la Raticosa e il Giogo è il triangolo dei motociclisti.' },
    { id:'raticosa', name:'Passo della Raticosa', region:'Toscana / Emilia-Romagna', area:'appennino', lat:44.1729, lng:11.3384, alt:968, length:null, hairpins:null, closed:null, diff:'easy', desc:'Curve veloci sulla Futa, frequentatissimo nei weekend.' },
    { id:'giogo', name:'Passo del Giogo', region:'Toscana', area:'appennino', lat:44.0469, lng:11.3881, alt:882, length:null, hairpins:null, closed:null, diff:'medium', desc:'Tornanti nel Mugello tra Scarperia e Firenzuola.' },
    { id:'muraglione', name:'Passo del Muraglione', region:'Toscana / Romagna', area:'appennino', lat:43.9329, lng:11.6548, alt:907, length:null, hairpins:null, closed:null, diff:'medium', desc:'Il ritrovo storico dei motociclisti tra Firenze e Forlì.' },
    { id:'calla', name:'Passo della Calla', region:'Toscana / Romagna', area:'appennino', lat:43.8597, lng:11.7444, alt:1296, length:null, hairpins:null, closed:null, diff:'medium', desc:'Nelle Foreste Casentinesi, strada stretta e ombreggiata.' },
    { id:'mandrioli', name:'Passo dei Mandrioli', region:'Toscana / Romagna', area:'appennino', lat:43.7975, lng:11.9151, alt:1173, length:null, hairpins:null, closed:null, diff:'medium', desc:'Dal Casentino alla Romagna, tornanti stretti sul versante romagnolo.' },
    { id:'trabaria', name:'Bocca Trabaria', region:'Toscana / Marche', area:'appennino', lat:43.5951, lng:12.2356, alt:1049, length:null, hairpins:null, closed:null, diff:'easy', desc:'Dall\'Alta Valle del Tevere verso Urbino.' },
    { id:'capannelle', name:'Valico delle Capannelle', region:'Abruzzo', area:'appennino', lat:42.4593, lng:13.3514, alt:1300, length:null, hairpins:null, closed:null, diff:'easy', desc:'Sotto il Gran Sasso, tra L\'Aquila e la Valle del Vomano.' },
    { id:'campoimperatore', name:'Campo Imperatore', region:'Abruzzo', area:'appennino', lat:42.4503, lng:13.5586, alt:2130, length:30, hairpins:40, closed:[11,12,1,2,3,4,5], diff:'medium', desc:'Il "piccolo Tibet": altopiano lunare e salita lunghissima. Vento e meteo da controllare.' },
    { id:'lanciano', name:'Passo Lanciano', region:'Abruzzo', area:'appennino', lat:42.1889, lng:14.1045, alt:1318, length:null, hairpins:null, closed:null, diff:'medium', desc:'Sulla Majella, con la salita verso il Blockhaus.' },
    { id:'forcacaruso', name:'Forca Caruso', region:'Abruzzo', area:'appennino', lat:42.0639, lng:13.7058, alt:1100, length:10, hairpins:14, closed:null, diff:'easy', desc:'Tra Marsica e Valle Peligna, salita dolce e panorami sul Fucino.' },
    { id:'forcadacero', name:'Forca d\'Acero', region:'Abruzzo / Lazio', area:'appennino', lat:41.7518, lng:13.8158, alt:1538, length:null, hairpins:null, closed:null, diff:'medium', desc:'Nel Parco Nazionale d\'Abruzzo, tra Opi e la Val Comino.' },
    { id:'bocca', name:'Bocca della Selva', region:'Campania', area:'appennino', lat:41.3489, lng:14.4819, alt:1393, length:15, hairpins:25, closed:null, diff:'medium', desc:'Sul Matese, poco conosciuto, curve fluide e traffico minimo.' },
    { id:'mandarini', name:'Portella di Mandarini', region:'Sicilia', area:'isole', lat:37.8595, lng:14.1003, alt:1204, length:null, hairpins:null, closed:null, diff:'medium', desc:'Nelle Madonie, tra Petralia e Isnello.' },
    { id:'gennasilana', name:'Genna Silana', region:'Sardegna', area:'isole', lat:40.1585, lng:9.5079, alt:1002, length:null, hairpins:null, closed:null, diff:'medium', desc:'Sulla SS125 Orientale Sarda tra Dorgali e Baunei: una delle strade più belle d\'Italia.' }
  ];

  /* ── Stato: stagione (indicativa) + meteo in vetta ─────────────── */
  var STATUS_KEY = 'hub_passi_status_v2', STATUS_TTL = 3 * 3600 * 1000;
  var FAV_KEY = 'hub_passi_fav_v1', POS_KEY = 'hub_passi_pos_v1';
  var _status = {}, _statusTs = 0;
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  (function() { var c = load(STATUS_KEY, null); if (c && Date.now() - c.ts < STATUS_TTL) { _status = c.data || {}; _statusTs = c.ts; } })();
  var _fav = load(FAV_KEY, []);
  var _pos = load(POS_KEY, null);   // { lat, lng, ts } ultima posizione nota

  function closedNow(p) { return !!(p.closed && p.closed.indexOf(new Date().getMonth() + 1) >= 0); }
  function chiusoTxt(p) {
    if (!p.closed) return 'Aperto tutto l\'anno (salvo neve)';
    var ms = p.closed.slice().sort(function(a, b) { return a - b; });
    // intervallo che attraversa l'anno (es. 11→5)
    var start = ms.filter(function(m) { return ms.indexOf(m === 1 ? 12 : m - 1) < 0; })[0];
    var end = ms.filter(function(m) { return ms.indexOf(m === 12 ? 1 : m + 1) < 0; })[0];
    return 'Di solito chiuso ' + MESI[start - 1].toLowerCase() + '–' + MESI[end - 1].toLowerCase();
  }
  function computeStatus(p, w) {
    if (closedNow(p)) return { status: 'closed', note: chiusoTxt(p) + ': verifica prima di partire' };
    if (!w) return { status: 'unknown', note: 'Meteo non disponibile' };
    if (w.snow > 3) return { status: 'caution', note: 'Neve in vetta (' + Math.round(w.snow) + ' cm): possibile chiusura' };
    if (w.tMin < 0 && w.snow > 0.2) return { status: 'caution', note: 'Gelo e neve: rischio ghiaccio' };
    if (w.tMin < 1) return { status: 'caution', note: 'Gelo possibile in cima (min ' + Math.round(w.tMin) + '°)' };
    if (w.wind > 60) return { status: 'caution', note: 'Vento forte (' + Math.round(w.wind) + ' km/h)' };
    if (w.rain > 8) return { status: 'caution', note: 'Pioggia prevista (' + Math.round(w.rain) + ' mm)' };
    return { status: 'open', note: 'Meteo buono in vetta · ' + Math.round(w.tMin) + '…' + Math.round(w.tMax) + '°' };
  }
  // Meteo di oggi e domani alla quota del passo (il parametro elevation corregge la temperatura)
  function fetchWeatherBatch(list) {
    var out = {}, chunks = [];
    for (var i = 0; i < list.length; i += 25) chunks.push(list.slice(i, i + 25));
    return Promise.all(chunks.map(function(ch) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + ch.map(function(p) { return p.lat; }).join(',') +
        '&longitude=' + ch.map(function(p) { return p.lng; }).join(',') + '&elevation=' + ch.map(function(p) { return p.alt; }).join(',') +
        '&daily=temperature_2m_min,temperature_2m_max,snowfall_sum,rain_sum,wind_speed_10m_max&past_days=1&forecast_days=2&timezone=Europe%2FRome';
      return fetch(url).then(function(r) { return r.ok ? r.json() : null; }).then(function(d) {
        if (!d) return;
        (Array.isArray(d) ? d : [d]).forEach(function(x, j) {
          var dd = x.daily; if (!dd) return;
          var sum = function(a) { return (a || []).reduce(function(s, v) { return s + (v || 0); }, 0); };
          out[ch[j].id] = { tMin: Math.min.apply(null, dd.temperature_2m_min), tMax: Math.max.apply(null, dd.temperature_2m_max),
            snow: sum(dd.snowfall_sum), rain: sum(dd.rain_sum), wind: Math.max.apply(null, dd.wind_speed_10m_max) };
        });
      }).catch(function() {});
    })).then(function() { return out; });
  }
  function refreshStatus() {
    var open = PASSES.filter(function(p) { return !closedNow(p); });
    return fetchWeatherBatch(open).then(function(w) {
      PASSES.forEach(function(p) { _status[p.id] = computeStatus(p, w[p.id]); });
      _statusTs = Date.now(); store(STATUS_KEY, { ts: _statusTs, data: _status });
    });
  }
  function statusFor(p) { return _status[p.id] || (closedNow(p) ? computeStatus(p) : { status: 'unknown', note: 'Aggiorno il meteo…' }); }

  /* ── Posizione ────────────────────────────────────────────────── */
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function locate() {
    return new Promise(function(ok, ko) {
      if (!navigator.geolocation) return ko(new Error('GPS non disponibile su questo dispositivo'));
      navigator.geolocation.getCurrentPosition(function(p) {
        _pos = { lat: p.coords.latitude, lng: p.coords.longitude, ts: Date.now() }; store(POS_KEY, _pos); ok(_pos);
      }, function(e) { ko(new Error(e.code === 1 ? 'Permesso posizione negato' : 'Posizione non disponibile')); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
    });
  }

  /* ── UI ───────────────────────────────────────────────────────── */
  var _mode = 'passi', _filter = 'all', _sort = 'stato', _q = '';
  function inject() {
    if (document.getElementById('ps-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'ps-overlay';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Passi e strade');
    ov.innerHTML =
      '<div class="ps-hdr"><h2>PASSI & STRADE<small>Per motociclisti · dati OpenStreetMap e Open-Meteo</small></h2>' +
        '<button class="gar-close" onclick="closePassi()">✕ Chiudi</button></div>' +
      '<div class="ps-segctrl" role="tablist">' +
        '<button class="ps-seg on" data-mode="passi" role="tab">⛰ Passi</button>' +
        '<button class="ps-seg" data-mode="mappa" role="tab">🗺 Mappa</button>' +
        '<button class="ps-seg" data-mode="strade" role="tab">〰 Strade</button>' +
      '</div>' +
      '<div class="ps-tools" id="ps-tools"></div>' +
      '<div class="ps-body" id="ps-body"></div>';
    document.body.appendChild(ov);
    var dm = document.createElement('div');
    dm.id = 'ps-detail';
    dm.addEventListener('click', function(e) { if (e.target === dm) closePassoDetail(); });
    dm.innerHTML = '<div class="ps-detail-card" id="ps-detail-card" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(dm);
    ov.addEventListener('click', onClick);
    ov.addEventListener('change', onChange);
    ov.addEventListener('input', function(e) { if (e.target.id === 'ps-q') { _q = e.target.value; renderList(); } });
    ov.addEventListener('keydown', function(e) { if (e.target.id === 'rd-place' && e.key === 'Enter') { e.preventDefault(); stradeDaLuogo(); } });
    dm.addEventListener('click', onClick);
  }
  function setMode(m) {
    _mode = m;
    document.querySelectorAll('#ps-overlay .ps-seg').forEach(function(s) { var on = s.dataset.mode === m; s.classList.toggle('on', on); s.setAttribute('aria-selected', on); });
    if (m === 'passi') { renderTools(); renderList(); }
    else if (m === 'mappa') { renderTools(); renderMap(); }
    else { renderStradeTools(); if (!_roads) renderStradeIntro(); else renderRoads(); }
  }
  function renderTools() {
    var el = document.getElementById('ps-tools');
    var flt = [['all', 'Tutti'], ['fav', '★ Preferiti'], ['open', 'Meteo ok'], ['dolomiti', 'Dolomiti'], ['alpi', 'Alpi'], ['appennino', 'Appennini'], ['isole', 'Isole'], ['easy', 'Facili'], ['expert', 'Esperti']];
    el.innerHTML = (_mode === 'passi' ? '<div class="ps-search"><input id="ps-q" type="search" placeholder="Cerca un passo o una regione" value="' + h(_q) + '" autocomplete="off">' +
        '<select id="ps-sort" aria-label="Ordina"><option value="stato"' + (_sort === 'stato' ? ' selected' : '') + '>Meteo migliore</option><option value="vicini"' + (_sort === 'vicini' ? ' selected' : '') + '>Più vicini</option><option value="alti"' + (_sort === 'alti' ? ' selected' : '') + '>Più alti</option></select></div>' : '') +
      '<div class="ps-filters" id="ps-filters">' + flt.map(function(f) { return '<button class="ps-fbtn' + (f[0] === _filter ? ' on' : '') + '" data-flt="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>';
  }
  function passFilter(p) {
    if (_q) { var t = (p.name + ' ' + p.region + ' ' + p.area + (p.area === 'appennino' ? ' appennini' : '')).toLowerCase(); if (!_q.toLowerCase().split(/\s+/).every(function(w) { return t.indexOf(w) >= 0; })) return false; }
    if (_filter === 'all') return true;
    if (_filter === 'fav') return _fav.indexOf(p.id) >= 0;
    if (_filter === 'open') return statusFor(p).status === 'open';
    if (_filter === 'easy' || _filter === 'expert') return p.diff === _filter;
    return p.area === _filter;
  }
  function diffLbl(d) { return d === 'easy' ? 'Facile' : d === 'medium' ? 'Medio' : 'Esperto'; }
  function stLbl(s) { return { open: '🟢 Meteo ok', caution: '🟡 Attenzione', closed: '🔴 Di solito chiuso', unknown: '⚪ Da verificare' }[s] || '⚪'; }
  function renderList() {
    var body = document.getElementById('ps-body'); if (!body) return;
    var rows = PASSES.filter(passFilter);
    var rank = { open: 0, caution: 1, unknown: 2, closed: 3 };
    rows.sort(function(a, b) {
      if (_sort === 'vicini' && _pos) return km([_pos.lat, _pos.lng], [a.lat, a.lng]) - km([_pos.lat, _pos.lng], [b.lat, b.lng]);
      if (_sort === 'alti') return b.alt - a.alt;
      return (rank[statusFor(a).status] - rank[statusFor(b).status]) || (_pos ? km([_pos.lat, _pos.lng], [a.lat, a.lng]) - km([_pos.lat, _pos.lng], [b.lat, b.lng]) : b.alt - a.alt);
    });
    var html = '';
    if (_sort === 'vicini' && !_pos) html += '<div class="ps-note">Per ordinare per distanza serve la posizione. <button class="ps-link" data-act="locate">Usa la mia posizione</button></div>';
    if (!rows.length) html += '<div class="ps-empty">' + (_filter === 'fav' ? 'Nessun preferito: apri un passo e tocca ☆.' : 'Nessun passo con questi filtri.') + '</div>';
    html += rows.map(function(p) {
      var st = statusFor(p), d = _pos ? Math.round(km([_pos.lat, _pos.lng], [p.lat, p.lng])) : null;
      return '<button class="ps-card" data-id="' + p.id + '">' +
        '<div class="ps-card-top"><span class="ps-card-status status-' + st.status + '">' + stLbl(st.status) + '</span>' +
          (_fav.indexOf(p.id) >= 0 ? '<span class="ps-card-fav" aria-label="Preferito">★</span>' : '') +
          (d != null ? '<span class="ps-card-dist">' + d + ' km</span>' : '') + '</div>' +
        '<div class="ps-card-name">' + h(p.name) + '</div>' +
        '<div class="ps-card-region">' + h(p.region) + '</div>' +
        '<div class="ps-card-status-note">' + h(st.note) + '</div>' +
        '<div class="ps-card-stats"><span><span class="ps-card-stat-lbl">ALT</span>' + p.alt + ' m</span>' +
          (p.length ? '<span><span class="ps-card-stat-lbl">LUNGH</span>' + p.length + ' km</span>' : '') +
          (p.hairpins ? '<span><span class="ps-card-stat-lbl">TORN</span>' + p.hairpins + '</span>' : '') +
          '<span class="ps-card-diff d-' + p.diff + '">' + diffLbl(p.diff) + '</span></div>' +
      '</button>';
    }).join('');
    html += '<p class="ps-fine">Lo stato "di solito chiuso" è indicativo: le date di apertura cambiano ogni anno con la neve. Il meteo è previsto alla quota del passo' + (_statusTs ? ' (aggiornato alle ' + new Date(_statusTs).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + ')' : '') + '.</p>';
    body.innerHTML = html;
  }

  /* ── Mappa ────────────────────────────────────────────────────── */
  var _map = null, _layer = null;
  function ensureMap(el, center, zoom) {
    if (typeof L === 'undefined') { el.innerHTML = '<div class="ps-empty">Mappa non disponibile (libreria non caricata).</div>'; return null; }
    if (_map) { _map.remove(); _map = null; }
    _map = L.map(el, { zoomControl: true, attributionControl: true }).setView(center, zoom);
    if (typeof addBasemap === 'function') addBasemap(_map);
    else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(_map);
    return _map;
  }
  function renderMap() {
    var body = document.getElementById('ps-body');
    body.innerHTML = '<div id="ps-map" class="ps-map" aria-label="Mappa dei passi"></div><p class="ps-fine">Tocca un segnaposto per aprire il passo. Colore: verde meteo ok, giallo attenzione, rosso di solito chiuso.</p>';
    var map = ensureMap(document.getElementById('ps-map'), _pos ? [_pos.lat, _pos.lng] : [45.9, 10.6], _pos ? 7 : 6);
    if (!map) return;
    var col = { open: '#4caf7d', caution: '#e8a030', closed: '#f0655d', unknown: '#8f8d99' };
    PASSES.filter(passFilter).forEach(function(p) {
      var st = statusFor(p).status;
      L.circleMarker([p.lat, p.lng], { radius: 7, weight: 2, color: '#111', fillColor: col[st], fillOpacity: .95 })
        .addTo(map).bindTooltip(p.name + ' · ' + p.alt + ' m').on('click', function() { openDetail(p.id); });
    });
    if (_pos) L.circleMarker([_pos.lat, _pos.lng], { radius: 6, color: '#5b9bd5', fillColor: '#5b9bd5', fillOpacity: 1 }).addTo(map).bindTooltip('Tu');
    setTimeout(function() { map.invalidateSize(); }, 60);
  }

  /* ── Scheda del passo ─────────────────────────────────────────── */
  function openDetail(id) {
    var p = PASSES.filter(function(x) { return x.id === id; })[0]; if (!p) return;
    var st = statusFor(p), fav = _fav.indexOf(p.id) >= 0, d = _pos ? Math.round(km([_pos.lat, _pos.lng], [p.lat, p.lng])) : null;
    var card = document.getElementById('ps-detail-card');
    card.innerHTML =
      '<div class="ps-detail-hdr"><div><h3>' + h(p.name) + '</h3><div class="ps-detail-hdr-region">' + h(p.region) + (d != null ? ' · ' + d + ' km da te' : '') + '</div></div>' +
        '<button class="ps-fav' + (fav ? ' on' : '') + '" data-act="fav" data-id="' + p.id + '" aria-pressed="' + fav + '" aria-label="Preferito">' + (fav ? '★' : '☆') + '</button></div>' +
      '<div class="ps-detail-body">' +
        '<div class="ps-detail-grid">' +
          '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Quota</div><div class="ps-detail-cell-val">' + p.alt + ' m</div></div>' +
          '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Difficoltà</div><div class="ps-detail-cell-val">' + diffLbl(p.diff) + '</div></div>' +
          (p.length ? '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Salita</div><div class="ps-detail-cell-val">' + p.length + ' km</div></div>' : '') +
          (p.hairpins ? '<div class="ps-detail-cell"><div class="ps-detail-cell-lbl">Tornanti</div><div class="ps-detail-cell-val">' + p.hairpins + '</div></div>' : '') +
          '<div class="ps-detail-cell ps-span"><div class="ps-detail-cell-lbl">Stagione</div><div class="ps-detail-cell-val ps-small">' + h(chiusoTxt(p)) + '</div></div>' +
        '</div>' +
        '<div class="ps-detail-desc">' + h(p.desc) + '</div>' +
        '<div class="ps-detail-weather" id="ps-detail-weather"><div class="ps-detail-weather-loading">Previsioni in vetta…</div></div>' +
        '<div class="ps-mini" id="ps-mini-map"></div>' +
      '</div>' +
      '<div class="ps-detail-actions">' +
        '<a class="ps-detail-maps" href="https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng + '&travelmode=driving" target="_blank" rel="noopener">📍 Portami lì</a>' +
        '<button class="ps-detail-alt" data-act="strade-qui" data-id="' + p.id + '">〰 Strade intorno</button>' +
        '<a class="ps-detail-alt" href="https://www.google.com/search?q=' + encodeURIComponent(p.name + ' aperto chiuso oggi') + '" target="_blank" rel="noopener">Verifica apertura ↗</a>' +
        '<button class="ps-detail-close" onclick="closePassoDetail()">Chiudi</button>' +
      '</div>';
    document.getElementById('ps-detail').classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
    forecast(p);
    if (typeof L !== 'undefined') {
      setTimeout(function() {
        var m = L.map('ps-mini-map', { zoomControl: false, attributionControl: false, dragging: true }).setView([p.lat, p.lng], 12);
        if (typeof addBasemap === 'function') addBasemap(m); else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        L.circleMarker([p.lat, p.lng], { radius: 7, color: '#111', fillColor: '#c97fd4', fillOpacity: 1, weight: 2 }).addTo(m);
        card._mini = m;
      }, 30);
    }
  }
  // 3 giorni in vetta, con un giudizio "da moto"
  function forecast(p) {
    var slot = document.getElementById('ps-detail-weather');
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lng + '&elevation=' + p.alt +
      '&daily=weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum,snowfall_sum,wind_speed_10m_max' +
      '&forecast_days=3&timezone=Europe%2FRome';
    fetch(url).then(function(r) { if (!r.ok) throw new Error(); return r.json(); }).then(function(d) {
      var dd = d.daily, days = ['Oggi', 'Domani'];
      slot.innerHTML = '<div class="ps-fc-title">Previsioni a ' + p.alt + ' m</div><div class="ps-fc">' + dd.time.map(function(t, i) {
        var tmin = dd.temperature_2m_min[i], tmax = dd.temperature_2m_max[i], pp = dd.precipitation_probability_max[i], sn = dd.snowfall_sum[i], wi = dd.wind_speed_10m_max[i];
        var v = sn > 0.5 ? ['no', 'Neve'] : tmax < 6 ? ['no', 'Troppo freddo'] : pp >= 60 ? ['no', 'Pioggia probabile'] : (tmin < 3 || pp >= 30 || wi > 45) ? ['warn', tmin < 3 ? 'Fresco: copriti' : wi > 45 ? 'Ventoso' : 'Rischio pioggia'] : ['ok', 'Giornata da moto'];
        var nome = i < 2 ? days[i] : new Date(t + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        return '<div class="ps-fc-day ps-fc-' + v[0] + '"><b>' + nome + '</b><span class="ps-fc-ico">' + wIcon(dd.weather_code[i]) + '</span>' +
          '<span>' + Math.round(tmin) + '° / ' + Math.round(tmax) + '°</span><small>pioggia ' + (pp == null ? '—' : pp + '%') + ' · vento ' + Math.round(wi) + '</small><em>' + v[1] + '</em></div>';
      }).join('') + '</div>';
    }).catch(function() { slot.innerHTML = '<div class="ps-detail-weather-loading">Previsioni non disponibili</div>'; });
  }
  function wIcon(c) { return c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 48 ? '🌫' : c <= 67 ? '🌧' : c <= 77 ? '🌨' : c <= 82 ? '🌦' : c <= 86 ? '🌨' : '⛈'; }

  /* ════════════════════════════════════════════════════════════════
     STRADE — curvatura su dati OpenStreetMap
     ════════════════════════════════════════════════════════════════ */
  var _roads = null, _roadPasses = [], _center = null, _radius = 15, _minKm = 3;
  function renderStradeTools() {
    document.getElementById('ps-tools').innerHTML =
      '<div class="rd-tools">' +
        '<div class="rd-where"><input id="rd-place" type="search" placeholder="Paese, valle o passo (es. Bormio)" autocomplete="off">' +
          '<button class="ps-nearby-go" data-act="rd-place">Cerca</button>' +
          '<button class="ps-nearby-go rd-gps" data-act="rd-gps" aria-label="Usa la mia posizione">📍</button></div>' +
        '<div class="rd-opts"><label>Raggio <select id="rd-radius">' + [10, 15, 20, 30].map(function(r) { return '<option' + (r === _radius ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select> km</label>' +
          '<label>Tratto minimo <select id="rd-min">' + [2, 3, 5, 8].map(function(r) { return '<option' + (r === _minKm ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select> km</label></div>' +
      '</div>';
  }
  function renderStradeIntro() {
    document.getElementById('ps-body').innerHTML = '<div class="ps-empty">Trova le strade più guidate: curve continue, tornanti, poco rettilineo.<br>Cerca intorno a te (📍), a un luogo o apri un passo e tocca <b>Strade intorno</b>.</div>' +
      '<p class="ps-fine">Dati OpenStreetMap: solo strade asfaltate pubbliche. La curvatura è calcolata sul tracciato; non tiene conto di traffico, chiusure o stato dell\'asfalto.</p>';
  }
  function loading(msg) { document.getElementById('ps-body').innerHTML = '<div class="ps-nearby-loading ps-nearby-spinner">' + h(msg) + '</div>'; }
  function errBox(msg) { document.getElementById('ps-body').innerHTML = '<div class="ps-nearby-error">' + h(msg) + '</div>'; }

  function stradeDaGps() {
    loading('Cerco la tua posizione');
    locate().then(function(p) { cercaStrade(p.lat, p.lng, 'te'); }, function(e) { errBox(e.message); });
  }
  function stradeDaLuogo() {
    var q = (document.getElementById('rd-place') || {}).value || '';
    if (q.trim().length < 2) return;
    loading('Cerco "' + q + '"');
    // Nominatim (OpenStreetMap): una richiesta alla volta, solo quando l'utente cerca
    fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=it&countrycodes=it,ch,fr,at,si&q=' + encodeURIComponent(q))
      .then(function(r) { return r.json(); })
      .then(function(j) {
        if (!j || !j.length) throw new Error('Luogo non trovato: prova con il nome del paese');
        cercaStrade(+j[0].lat, +j[0].lon, j[0].name || q);
      }).catch(function(e) { errBox(e.message || 'Ricerca del luogo non riuscita'); });
  }
  function cercaStrade(lat, lng, nome) {
    _center = { lat: lat, lng: lng, nome: nome };
    loading('Scarico le strade entro ' + _radius + ' km da ' + nome);
    var direct = function() {
      var q = '[out:json][timeout:40];(way(around:' + _radius * 1000 + ',' + lat + ',' + lng + ')["highway"~"^(trunk|primary|secondary|tertiary|unclassified)$"]["area"!="yes"]["surface"!~"^(gravel|dirt|ground|unpaved|grass|fine_gravel|compacted)$"];node(around:' + _radius * 1000 + ',' + lat + ',' + lng + ')["mountain_pass"="yes"]["name"];);out tags geom qt;';
      return fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) })
        .then(function(r) { if (!r.ok) throw new Error('OpenStreetMap non raggiungibile (HTTP ' + r.status + ')'); return r.json(); });
    };
    fetch(workerBase() + '/api/strade?lat=' + lat.toFixed(4) + '&lng=' + lng.toFixed(4) + '&r=' + _radius)
      .then(function(r) { return r.json().then(function(j) { if (!r.ok || j.error) throw new Error(j.error || 'HTTP ' + r.status); return j; }); })
      .catch(function(e) { console.warn('[strade] Worker:', e.message, '→ provo direttamente'); return direct(); })
      .then(function(data) {
        loading('Calcolo la curvatura');
        setTimeout(function() {
          var res = analizza(data, lat, lng);
          _roads = res.roads; _roadPasses = res.passes;
          renderRoads();
        }, 20);
      })
      .catch(function(e) { errBox((e.message || 'Errore') + '. Il servizio gratuito di OpenStreetMap a volte è sovraccarico: riprova tra qualche minuto.'); });
  }

  // Geometria: ricampionamento ogni 20 m e variazione di direzione
  function bearing(a, b) {
    var r = Math.PI / 180, y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
    var x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
    return Math.atan2(y, x) / r;
  }
  function resample(pts, step) {
    var out = [pts[0]], acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], d = km(a, b) * 1000;
      if (d === 0) continue;
      var t = step - acc;
      while (t <= d) { var f = t / d; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); t += step; }
      acc = d - (t - step);
    }
    return out;
  }
  // Unisce i tratti OSM con lo stesso nome/numero che si toccano agli estremi
  function catene(ways) {
    var groups = {};
    ways.forEach(function(w) { var k = (w.tags.ref || w.tags.name || ('#' + w.id)); (groups[k] = groups[k] || []).push(w); });
    var out = [];
    Object.keys(groups).forEach(function(k) {
      var list = groups[k].map(function(w) { return { w: w, pts: w.geometry.map(function(g) { return [g.lat, g.lon]; }), used: false }; });
      var key = function(p) { return p[0].toFixed(6) + ',' + p[1].toFixed(6); };
      var ends = {};
      list.forEach(function(it, i) { [key(it.pts[0]), key(it.pts[it.pts.length - 1])].forEach(function(e) { (ends[e] = ends[e] || []).push(i); }); });
      list.forEach(function(it) {
        if (it.used) return;
        it.used = true;
        var chain = it.pts.slice();
        var grow = function(atEnd) {
          for (;;) {
            var tip = key(atEnd ? chain[chain.length - 1] : chain[0]);
            var nx = (ends[tip] || []).map(function(i) { return list[i]; }).filter(function(o) { return !o.used; })[0];
            if (!nx) return;
            nx.used = true;
            var seg = nx.pts.slice();
            if (atEnd) { if (key(seg[0]) !== tip) seg.reverse(); chain = chain.concat(seg.slice(1)); }
            else { if (key(seg[seg.length - 1]) !== tip) seg.reverse(); chain = seg.slice(0, -1).concat(chain); }
          }
        };
        grow(true); grow(false);
        out.push({ tags: it.w.tags, pts: chain });
      });
    });
    return out;
  }
  function analizza(data, clat, clng) {
    var els = (data && data.elements) || [];
    var ways = els.filter(function(e) { return e.type === 'way' && e.geometry && e.geometry.length > 1 && e.tags; });
    var passes = els.filter(function(e) { return e.type === 'node' && e.tags && e.tags.name; }).map(function(n) {
      return { name: n.tags.name, lat: n.lat, lng: n.lon, alt: parseInt(n.tags.ele, 10) || null, curated: PASSES.filter(function(p) { return km([p.lat, p.lng], [n.lat, n.lon]) < 1.5; })[0] || null };
    });
    var STEP = 20, roads = [];
    catene(ways).forEach(function(c) {
      var pts = resample(c.pts, STEP);
      if (pts.length < 100) return;   // meno di 2 km
      // variazione di direzione ogni 20 m, ignorando il rumore < 2°
      var turn = [0];
      for (var i = 1; i < pts.length - 1; i++) {
        var d = bearing(pts[i], pts[i + 1]) - bearing(pts[i - 1], pts[i]);
        while (d > 180) d -= 360; while (d < -180) d += 360;
        turn.push(Math.abs(d) < 2 ? 0 : d);
      }
      turn.push(0);
      // miglior tratto: finestra di lunghezza variabile (min _minKm, max 25 km) con più gradi di curva
      var n = pts.length, minN = Math.round(_minKm * 1000 / STEP), maxN = Math.round(25000 / STEP);
      if (n < minN) return;
      var pre = [0]; for (i = 0; i < n; i++) pre.push(pre[i] + Math.abs(turn[i]));
      var best = null;
      for (var w = minN; w <= Math.min(maxN, n); w += Math.max(1, Math.round(1000 / STEP))) {
        for (var s = 0; s + w <= n; s += 10) {
          var deg = pre[s + w] - pre[s], len = w * STEP / 1000, sc = deg / len;
          // preferisce tratti lunghi a parità di curve: punteggio × radice della lunghezza
          var val = sc * Math.sqrt(len);
          if (!best || val > best.val) best = { s: s, e: s + w, deg: deg, len: len, sc: sc, val: val };
        }
      }
      if (!best || best.sc < 70) return;
      // tornanti: almeno 120° di svolta nello stesso verso entro 120 m
      var hp = 0, accDeg = 0, accLen = 0, dir = 0;
      for (i = best.s; i < best.e; i++) {
        var t = turn[i], sg = t > 0 ? 1 : t < 0 ? -1 : 0;
        if (sg && sg === dir) { accDeg += Math.abs(t); accLen += STEP; }
        else if (sg) { dir = sg; accDeg = Math.abs(t); accLen = STEP; }
        else { accLen += STEP; }
        if (accLen > 120) { accDeg = 0; accLen = 0; dir = 0; }
        if (accDeg >= 120) { hp++; accDeg = 0; accLen = 0; dir = 0; }
      }
      var seg = pts.slice(best.s, best.e);
      roads.push({
        id: (c.tags.ref || c.tags.name || 'strada') + '_' + seg[0][0].toFixed(3) + seg[0][1].toFixed(3),
        name: c.tags.name || c.tags.ref || 'Strada senza nome', ref: c.tags.ref && c.tags.name ? c.tags.ref : '',
        tipo: c.tags.highway, pts: seg, len: best.len, score: best.sc, hairpins: hp, val: best.val,
        dist: Math.min(km([clat, clng], seg[0]), km([clat, clng], seg[seg.length - 1]))
      });
    });
    roads.sort(function(a, b) { return b.val - a.val; });
    // niente doppioni dello stesso tracciato (carreggiate separate ecc.)
    var uniq = [];
    roads.forEach(function(r) { if (!uniq.some(function(u) { return km(u.pts[0], r.pts[0]) < 0.4 && km(u.pts[u.pts.length - 1], r.pts[r.pts.length - 1]) < 0.4; })) uniq.push(r); });
    return { roads: uniq.slice(0, 15), passes: passes };
  }
  function sparkSvg(pts) {
    var la = pts.map(function(p) { return p[0]; }), lo = pts.map(function(p) { return p[1]; });
    var a = Math.min.apply(null, la), b = Math.max.apply(null, la), c = Math.min.apply(null, lo), d = Math.max.apply(null, lo);
    var k = Math.cos((a + b) / 2 * Math.PI / 180), W = 72, H = 72, sx = (d - c) * k || 1e-4, sy = (b - a) || 1e-4, s = Math.min((W - 8) / sx, (H - 8) / sy);
    var step = Math.max(1, Math.floor(pts.length / 150));
    var path = pts.filter(function(_, i) { return i % step === 0; }).map(function(p, i) {
      return (i ? 'L' : 'M') + (4 + (p[1] - c) * k * s + (W - 8 - sx * s) / 2).toFixed(1) + ' ' + (4 + (b - p[0]) * s + (H - 8 - sy * s) / 2).toFixed(1);
    }).join('');
    return '<svg viewBox="0 0 72 72" aria-hidden="true"><path d="' + path + '" stroke="#c97fd4" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function grade(sc) { return sc >= 300 ? 'Tornanti a raffica' : sc >= 200 ? 'Molto guidata' : sc >= 130 ? 'Guidata' : 'Curve dolci'; }
  function renderRoads() {
    var body = document.getElementById('ps-body');
    if (!_roads) return renderStradeIntro();
    var html = '<div class="ps-note">Intorno a <b>' + h(_center.nome) + '</b> · ' + _radius + ' km · ' + _roads.length + ' strade · <button class="ps-link" data-act="rd-map">Vedi sulla mappa</button></div>';
    var ps = _roadPasses.filter(function(p) { return p.alt; }).slice(0, 12);
    if (ps.length) html += '<div class="rd-passes"><span>Passi in zona:</span>' + ps.map(function(p) {
      return p.curated ? '<button class="ps-chip" data-act="pass" data-id="' + p.curated.id + '">' + h(p.name) + ' · ' + p.alt + ' m</button>'
        : '<a class="ps-chip" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng + '">' + h(p.name) + ' · ' + p.alt + ' m</a>';
    }).join('') + '</div>';
    if (!_roads.length) html += '<div class="ps-empty">Nessuna strada con abbastanza curve qui. Allarga il raggio o abbassa la lunghezza minima.</div>';
    html += _roads.map(function(r, i) {
      return '<div class="psn-card"><div class="psn-card-map">' + sparkSvg(r.pts) + '</div>' +
        '<div class="psn-card-info"><div class="psn-card-name">' + h(r.name) + (r.ref ? ' <small>' + h(r.ref) + '</small>' : '') + '</div>' +
          '<div class="psn-card-grade">' + grade(r.score) + '</div>' +
          '<div class="psn-card-stats"><span class="psn-card-score">' + Math.round(r.score) + ' °/km</span>' +
            '<span><span class="psn-card-stat-lbl">TRATTO</span>' + r.len.toFixed(1) + ' km</span>' +
            (r.hairpins ? '<span><span class="psn-card-stat-lbl">TORN</span>' + r.hairpins + '</span>' : '') +
            '<span><span class="psn-card-stat-lbl">DA ' + (_center.nome === 'te' ? 'TE' : 'QUI') + '</span>' + Math.round(r.dist) + ' km</span></div>' +
          '<div class="psn-acts"><a class="psn-btn" target="_blank" rel="noopener" href="' + gmaps(r) + '">Percorso in Maps</a>' +
            '<button class="psn-btn" data-act="gpx" data-i="' + i + '">GPX</button>' +
            '<button class="psn-btn" data-act="rd-show" data-i="' + i + '">Mappa</button></div>' +
        '</div></div>';
    }).join('');
    html += '<p class="ps-fine">°/km = gradi di curva per chilometro sul tratto migliore della strada. "Percorso in Maps" segue il tratto dall\'inizio alla fine; il GPX si apre con Calimoto, Kurviger, OsmAnd o il navigatore della moto.</p>';
    body.innerHTML = html;
  }
  function gmaps(r) {
    var p = r.pts, n = p.length, f = function(x) { return x[0].toFixed(5) + ',' + x[1].toFixed(5); };
    return 'https://www.google.com/maps/dir/?api=1&origin=' + f(p[0]) + '&destination=' + f(p[n - 1]) +
      '&waypoints=' + encodeURIComponent(f(p[Math.floor(n / 3)]) + '|' + f(p[Math.floor(2 * n / 3)])) + '&travelmode=driving';
  }
  function gpx(r) {
    var pts = r.pts.filter(function(_, i) { return i % 3 === 0 || i === r.pts.length - 1; });   // un punto ogni ~60 m
    var x = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="AutoHub" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>' + h(r.name) + '</name><trkseg>\n' +
      pts.map(function(p) { return '<trkpt lat="' + p[0].toFixed(6) + '" lon="' + p[1].toFixed(6) + '"/>'; }).join('\n') + '\n</trkseg></trk>\n</gpx>\n';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([x], { type: 'application/gpx+xml' }));
    a.download = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.gpx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 2000);
  }
  function mapRoads(only) {
    var body = document.getElementById('ps-body');
    body.innerHTML = '<div class="ps-note"><button class="ps-link" data-act="rd-list">← Torna all\'elenco</button></div><div id="ps-map" class="ps-map"></div>';
    var map = ensureMap(document.getElementById('ps-map'), [_center.lat, _center.lng], 11);
    if (!map) return;
    var list = only != null ? [_roads[only]] : _roads, all = [];
    list.forEach(function(r, i) {
      var line = L.polyline(r.pts, { color: only != null || i < 3 ? '#c97fd4' : '#8f6bb0', weight: only != null ? 5 : 4, opacity: .9 }).addTo(map).bindTooltip(r.name + ' · ' + Math.round(r.score) + ' °/km');
      all = all.concat(r.pts);
    });
    L.circleMarker([_center.lat, _center.lng], { radius: 6, color: '#5b9bd5', fillColor: '#5b9bd5', fillOpacity: 1 }).addTo(map);
    if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [20, 20] });
    setTimeout(function() { map.invalidateSize(); }, 60);
  }

  /* ── Eventi ───────────────────────────────────────────────────── */
  function onClick(e) {
    var t = e.target.closest('[data-act],[data-mode],[data-flt],.ps-card');
    if (!t) return;
    if (t.dataset.mode) return setMode(t.dataset.mode);
    if (t.dataset.flt) { _filter = t.dataset.flt; renderTools(); return _mode === 'mappa' ? renderMap() : renderList(); }
    if (t.classList.contains('ps-card')) return openDetail(t.dataset.id);
    var a = t.dataset.act;
    if (a === 'fav') {
      var i = _fav.indexOf(t.dataset.id);
      if (i >= 0) _fav.splice(i, 1); else _fav.push(t.dataset.id);
      store(FAV_KEY, _fav);
      t.classList.toggle('on', i < 0); t.textContent = i < 0 ? '★' : '☆'; t.setAttribute('aria-pressed', i < 0);
      if (_mode === 'passi') renderList();
    }
    if (a === 'locate') locate().then(function() { renderList(); }, function(err) { alert(err.message); });
    if (a === 'strade-qui') {
      var p = PASSES.filter(function(x) { return x.id === t.dataset.id; })[0];
      closePassoDetail(); setMode('strade'); cercaStrade(p.lat, p.lng, p.name);
    }
    if (a === 'pass') openDetail(t.dataset.id);
    if (a === 'rd-gps') stradeDaGps();
    if (a === 'rd-place') stradeDaLuogo();
    if (a === 'gpx') gpx(_roads[+t.dataset.i]);
    if (a === 'rd-show') mapRoads(+t.dataset.i);
    if (a === 'rd-map') mapRoads(null);
    if (a === 'rd-list') renderRoads();
  }
  function onChange(e) {
    var id = e.target.id;
    if (id === 'ps-sort') {
      _sort = e.target.value;
      if (_sort === 'vicini' && !_pos) locate().then(renderList, function() { renderList(); }); else renderList();
    }
    if (id === 'rd-radius' || id === 'rd-min') {
      if (id === 'rd-radius') _radius = +e.target.value; else _minKm = +e.target.value;
      if (_center) cercaStrade(_center.lat, _center.lng, _center.nome);
    }
  }

  window.openPassi = function() {
    inject();
    document.getElementById('ps-overlay').classList.add('visible');
    setMode(_mode === 'mappa' ? 'passi' : _mode);
    if (!_statusTs || Date.now() - _statusTs > STATUS_TTL) refreshStatus().then(function() { if (_mode === 'passi') renderList(); });
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closePassi = function() {
    var o = document.getElementById('ps-overlay'); if (o) o.classList.remove('visible');
    if (_map) { _map.remove(); _map = null; }
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closePassoDetail = function() {
    var d = document.getElementById('ps-detail'); if (!d) return;
    var c = document.getElementById('ps-detail-card'); if (c && c._mini) { c._mini.remove(); c._mini = null; }
    d.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.psRefreshStatus = function() { return refreshStatus().then(renderList); };
  // per i test
  window._psInternals = { PASSES: PASSES, analizza: analizza, catene: catene, chiusoTxt: chiusoTxt, computeStatus: computeStatus };
  document.addEventListener('DOMContentLoaded', function() { setTimeout(inject, 350); });
})();
