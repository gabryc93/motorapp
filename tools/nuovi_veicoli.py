#!/usr/bin/env python3
"""AutoHub — aggiunge al catalogo e al database i modelli che mancavano.

Uso:  python tools/nuovi_veicoli.py        (dopo tools/db_tool.py, se lo rilanci)

Scrive:
  · src/js/02a2-veicoli-extra.js  → si unisce a VEHICLES / MOTORCYCLES all'avvio
  · db/<marca>.json + db/index.json → schede (specs), manutenzione e controlli

Regole sui dati (meglio un campo vuoto che un dato inventato):
  · potenza, cilindrata, alimentazione, cambio e trazione: dati di listino noti
  · distribuzione: indicata solo se nota (C catena, B cinghia, W cinghia a bagno
    d'olio, N nessuna/elettrica); altrimenti "verifica sul libretto"
  · dimensioni, consumi, 0-100, velocità: lasciati vuoti
  · problemi: solo controlli generali per tipo di motore; i difetti specifici
    li aggiunge l'app da src/js/02c-motori-noti.js quando il motore è noto
Lo script è idempotente: rilanciato, sovrascrive le stesse chiavi.
"""
import json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# tipo, marca, modello, serie, [ "nome motore|cv|cc|alimentazione|cambio|trazione|distribuzione" ]
# cambio: M = manuale, A = automatico, R = robotizzato/doppia frizione, U = rapporto unico ; trazione: F, R, 4
AUTO = [
    ('Lancia', 'Ypsilon (846)', '2011–2024', ['1.2 69cv|69|1242|Benzina|M5|F|B', '1.2 69cv EasyPower GPL|69|1242|GPL|M5|F|B',
        '0.9 TwinAir 85cv|85|875|Benzina|M5|F|C', '0.9 TwinAir 80cv Ecochic metano|80|875|Metano|M5|F|C',
        '1.3 MultiJet 95cv|95|1248|Diesel|M5|F|C', '1.0 Hybrid 70cv|70|999|Benzina mild hybrid|M6|F|C']),
    ('Lancia', 'Ypsilon (2024)', '2024–2025', ['1.2 Hybrid 100cv|100|1199|Benzina mild hybrid|A6|F|C', 'Elettrica 156cv|156||Elettrico|U|F|N']),
    ('Fiat', 'Panda II (169)', '2003–2012', ['1.1 54cv|54|1108|Benzina|M5|F|B', '1.2 60cv|60|1242|Benzina|M5|F|B', '1.2 69cv|69|1242|Benzina|M5|F|B',
        '1.2 60cv Natural Power metano|60|1242|Metano|M5|F|B', '1.2 69cv GPL|69|1242|GPL|M5|F|B', '1.4 16v 100cv|100|1368|Benzina|M6|F|B',
        '1.3 MultiJet 70cv|70|1248|Diesel|M5|F|C', '1.3 MultiJet 75cv 4x4|75|1248|Diesel|M5|4|C']),
    ('Fiat', '500L', '2012–2022', ['1.4 95cv|95|1368|Benzina|M6|F|B', '0.9 TwinAir 105cv|105|875|Benzina|M6|F|C', '1.4 T-Jet 120cv GPL|120|1368|GPL|M6|F|B',
        '1.3 MultiJet 85cv|85|1248|Diesel|M5|F|C', '1.3 MultiJet 95cv|95|1248|Diesel|M5|F|C', '1.6 MultiJet 105cv|105|1598|Diesel|M6|F|B', '1.6 MultiJet 120cv|120|1598|Diesel|M6|F|B']),
    ('Fiat', 'Qubo', '2008–2020', ['1.4 77cv|77|1360|Benzina|M5|F|B', '1.4 70cv Natural Power metano|70|1368|Metano|M5|F|B',
        '1.3 MultiJet 75cv|75|1248|Diesel|M5|F|C', '1.3 MultiJet 95cv|95|1248|Diesel|M5|F|C']),
    ('Fiat', '600', '2023–2025', ['1.2 Hybrid 100cv|100|1199|Benzina mild hybrid|A6|F|C', 'Elettrica 156cv|156||Elettrico|U|F|N']),
    ('Fiat', 'Grande Panda', '2025–2025', ['1.2 Hybrid 110cv|110|1199|Benzina mild hybrid|A6|F|C', 'Elettrica 113cv|113||Elettrico|U|F|N']),
    ('Alfa Romeo', 'Junior', '2024–2025', ['1.2 Ibrida 136cv|136|1199|Benzina mild hybrid|A6|F|C', 'Elettrica 156cv|156||Elettrico|U|F|N', 'Veloce elettrica 280cv|280||Elettrico|U|F|N']),
    ('Toyota', 'Yaris Cross', '2021–2025', ['1.5 Hybrid 116cv|116|1490|Ibrido benzina|A|F|C', '1.5 Hybrid 116cv AWD-i|116|1490|Ibrido benzina|A|4|C', '1.5 Hybrid 130cv|130|1490|Ibrido benzina|A|F|C']),
    ('Volkswagen', 'T-Cross', '2019–2025', ['1.0 TSI 95cv|95|999|Benzina|M5|F|B', '1.0 TSI 110cv|110|999|Benzina|M6|F|B', '1.0 TSI 115cv DSG|115|999|Benzina|R7|F|B',
        '1.5 TSI 150cv DSG|150|1498|Benzina|R7|F|B', '1.6 TDI 95cv|95|1598|Diesel|M5|F|B']),
    ('Volkswagen', 'Golf V (1K)', '2003–2008', ['1.4 16v 80cv|80|1390|Benzina|M5|F|B', '1.4 TSI 122cv|122|1390|Benzina|M6|F|C', '1.4 TSI 140cv|140|1390|Benzina|M6|F|C',
        '1.9 TDI 105cv|105|1896|Diesel|M5|F|B', '2.0 TDI 140cv|140|1968|Diesel|M6|F|B', '2.0 TFSI 200cv GTI|200|1984|Benzina|M6|F|B']),
    ('Volkswagen', 'Polo IV (9N)', '2001–2009', ['1.2 55cv|55|1198|Benzina|M5|F|C', '1.2 64cv|64|1198|Benzina|M5|F|C', '1.4 16v 80cv|80|1390|Benzina|M5|F|B',
        '1.4 TDI 70cv|70|1422|Diesel|M5|F|B', '1.4 TDI 80cv|80|1422|Diesel|M5|F|B', '1.9 TDI 100cv|100|1896|Diesel|M5|F|B']),
    ('Volkswagen', 'Touran (1T/5T)', '2010–2015', ['1.4 TSI 140cv|140|1390|Benzina|M6|F|C', '1.6 TDI 105cv|105|1598|Diesel|M5|F|B', '2.0 TDI 140cv|140|1968|Diesel|M6|F|B']),
    ('Volkswagen', 'Touran (1T/5T)', '2015–2025', ['1.5 TSI 150cv|150|1498|Benzina|M6|F|B', '1.6 TDI 115cv|115|1598|Diesel|M6|F|B', '2.0 TDI 150cv|150|1968|Diesel|M6|F|B']),
    ('Ford', 'Ka (RU8)', '2008–2016', ['1.2 69cv|69|1242|Benzina|M5|F|B', '1.3 TDCi 75cv|75|1248|Diesel|M5|F|C']),
    ('Ford', 'C-Max (II)', '2010–2019', ['1.0 EcoBoost 100cv|100|999|Benzina|M6|F|W', '1.0 EcoBoost 125cv|125|999|Benzina|M6|F|W', '1.6 TDCi 115cv|115|1560|Diesel|M6|F|B', '2.0 TDCi 150cv|150|1997|Diesel|M6|F|B']),
    ('Ford', 'B-Max', '2012–2017', ['1.0 EcoBoost 100cv|100|999|Benzina|M5|F|W', '1.0 EcoBoost 120cv|120|999|Benzina|M5|F|W', '1.4 90cv|90|1388|Benzina|M5|F|B', '1.5 TDCi 75cv|75|1499|Diesel|M5|F|B']),
    ('Opel', 'Meriva (B)', '2010–2017', ['1.4 100cv|100|1398|Benzina|M5|F|', '1.4 Turbo 120cv|120|1364|Benzina|M6|F|', '1.4 Turbo 140cv|140|1364|Benzina|M6|F|',
        '1.3 CDTI 95cv|95|1248|Diesel|M5|F|C', '1.6 CDTI 110cv|110|1598|Diesel|M6|F|']),
    ('Kia', 'Rio (UB/YB)', '2011–2017', ['1.2 84cv|84|1248|Benzina|M5|F|C', '1.4 CRDi 90cv|90|1396|Diesel|M6|F|']),
    ('Kia', 'Rio (UB/YB)', '2017–2024', ['1.2 84cv|84|1248|Benzina|M5|F|C', '1.0 T-GDi 100cv|100|998|Benzina|M6|F|', '1.0 T-GDi 120cv|120|998|Benzina|M6|F|']),
    ('Hyundai', 'ix35', '2010–2015', ['1.6 GDi 135cv|135|1591|Benzina|M6|F|C', '1.7 CRDi 116cv|116|1685|Diesel|M6|F|', '2.0 CRDi 136cv 4WD|136|1995|Diesel|M6|4|C', '2.0 CRDi 184cv 4WD|184|1995|Diesel|A6|4|C']),
    ('Suzuki', 'Ignis (MF)', '2016–2025', ['1.2 Dualjet 90cv|90|1242|Benzina|M5|F|C', '1.2 Hybrid 83cv|83|1197|Benzina mild hybrid|M5|F|C', '1.2 Hybrid 83cv 4WD AllGrip|83|1197|Benzina mild hybrid|M5|4|C']),
    ('Smart', 'Fortwo (451)', '2007–2014', ['1.0 71cv|71|999|Benzina|R5|R|C', '1.0 Turbo 84cv|84|999|Benzina|R5|R|C', 'Electric drive 75cv|75||Elettrico|U|R|N']),
    ('Smart', 'Fortwo / Forfour (453)', '2014–2024', ['1.0 71cv|71|999|Benzina|M5|R|C', '0.9 Turbo 90cv|90|898|Benzina|M5|R|C', 'EQ 82cv|82||Elettrico|U|R|N']),
    ('MG', 'ZS', '2019–2025', ['1.5 106cv|106|1498|Benzina|M5|F|', '1.0 T-GDI 111cv|111|1000|Benzina|A6|F|', 'EV 177cv|177||Elettrico|U|F|N', '1.5 Hybrid+ 197cv|197|1498|Ibrido benzina|A|F|']),
    ('MG', 'MG4', '2022–2025', ['Standard 170cv|170||Elettrico|U|R|N', 'Comfort 204cv|204||Elettrico|U|R|N', 'XPOWER 435cv AWD|435||Elettrico|U|4|N']),
    ('MG', 'HS', '2019–2025', ['1.5 T-GDI 162cv|162|1490|Benzina|M6|F|', '1.5 PHEV 258cv|258|1490|Plug-in Hybrid (benzina)|A|F|']),
    ('BYD', 'Atto 3', '2022–2025', ['204cv|204||Elettrico|U|F|N']),
    ('BYD', 'Dolphin', '2023–2025', ['95cv|95||Elettrico|U|F|N', '204cv|204||Elettrico|U|F|N']),
    ('BYD', 'Seal', '2023–2025', ['313cv RWD|313||Elettrico|U|R|N', '530cv AWD|530||Elettrico|U|4|N']),
    ('Peugeot', '108', '2014–2022', ['1.0 VTi 68cv|68|998|Benzina|M5|F|C', '1.0 VTi 72cv|72|998|Benzina|M5|F|C', '1.2 PureTech 82cv|82|1199|Benzina|M5|F|W']),
    ('Citroën', 'C3 (IV)', '2024–2025', ['1.2 Turbo 100cv|100|1199|Benzina|M6|F|C', 'ë-C3 elettrica 113cv|113||Elettrico|U|F|N']),
]

MOTO = [
    ('Yamaha', 'MT-03', '2016–2025', ['MT-03 42cv|42|321|Benzina|M6|R|C']),
    ('Yamaha', 'YZF-R3', '2015–2025', ['YZF-R3 42cv|42|321|Benzina|M6|R|C']),
    ('Yamaha', 'MT-125 / YZF-R125', '2014–2025', ['MT-125 15cv|15|125|Benzina|M6|R|C', 'YZF-R125 15cv|15|125|Benzina|M6|R|C']),
    ('Honda', 'NX500', '2024–2025', ['NX500 48cv|48|471|Benzina|M6|R|C']),
    ('Kymco', 'AK 550', '2017–2025', ['AK 550 53cv|53|550|Benzina|V|R|C']),
    ('Kymco', 'Agility / People S', '2008–2025', ['Agility 125|||Benzina|V|R|C', 'People S 125|||Benzina|V|R|C']),
    ('SYM', 'Symphony / Jet', '2009–2025', ['Symphony 125|||Benzina|V|R|C', 'Jet 14 125|||Benzina|V|R|C']),
    ('Aprilia', 'SR GT', '2022–2025', ['SR GT 125|||Benzina|V|R|C', 'SR GT 200|||Benzina|V|R|C']),
    ('Ducati', 'Hypermotard 950', '2019–2025', ['Hypermotard 950 114cv|114|937|Benzina|M6|R|D']),
    ('BMW Motorrad', 'F 900 GS', '2024–2025', ['F 900 GS 105cv|105|895|Benzina|M6|R|C']),
    ('KTM', '690 SMC R / Enduro R', '2019–2025', ['690 SMC R 74cv|74|693|Benzina|M6|R|C', '690 Enduro R 74cv|74|693|Benzina|M6|R|C']),
    ('Triumph', 'Speed 400', '2024–2025', ['Speed 400 40cv|40|398|Benzina|M6|R|C']),
    ('Kawasaki', 'Versys-X 300', '2017–2025', ['Versys-X 300 40cv|40|296|Benzina|M6|R|C']),
]

DIST = {'C': 'Catena', 'B': 'Cinghia', 'W': "Cinghia a bagno d'olio", 'N': 'Nessuna (motore elettrico)', 'D': 'Cinghia desmodromica'}
CAMBIO = {'M5': 'Manuale 5 marce', 'M6': 'Manuale 6 marce', 'A6': 'Automatico 6 marce', 'A': 'Automatico (e-CVT)', 'R5': 'Robotizzato 5 marce',
          'R7': 'Doppia frizione 7 marce (DSG)', 'U': 'Automatico (rapporto unico)', 'V': 'Automatico CVT'}
TRAZ = {'F': 'Anteriore (FWD)', 'R': 'Posteriore (RWD)', '4': 'Integrale (AWD)'}


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def generici(alim, dist, moto):
    """Controlli generali per tipo di motore: dichiaratamente non specifici del modello."""
    P = []
    a = alim.lower()
    if moto:
        P.append(dict(titolo='Kit trasmissione (catena, corona, pignone)', severita='media',
                      descrizione='Componente a usura su tutte le moto a catena: dura molto di più se pulito, lubrificato e tenuto alla giusta tensione.',
                      sintomi=['Catena con punti duri o allungata', 'Denti della corona a uncino', 'Rumore in accelerazione'],
                      soluzione='Controllo tensione e lubrificazione ogni 500–1.000 km; sostituzione del kit completo.', costo_min=150, costo_max=400))
        P.append(dict(titolo='Gioco valvole e tagliandi', severita='media',
                      descrizione='Il controllo del gioco valvole è previsto a intervalli fissi dal costruttore: saltarlo porta a irregolarità e consumi.',
                      sintomi=['Minimo irregolare', 'Avviamento difficile a caldo'],
                      soluzione='Verifica sul libretto tagliandi che il controllo valvole sia stato fatto.', costo_min=150, costo_max=600))
        P.append(dict(titolo='Batteria e impianto elettrico', severita='bassa',
                      descrizione='Le moto usate poco scaricano la batteria; regolatore di tensione e connettori soffrono umidità.',
                      sintomi=['Avviamento faticoso', 'Spie che lampeggiano'],
                      soluzione='Mantenitore di carica in inverno; misura della tensione di ricarica (13,5–14,5 V).', costo_min=60, costo_max=250))
        return P
    if 'elettric' in a and 'ibrid' not in a and 'plug' not in a:
        P.append(dict(titolo='Freni poco usati (frenata rigenerativa)', severita='bassa',
                      descrizione='Sulle elettriche i freni lavorano poco e i dischi possono ossidarsi.',
                      sintomi=['Rumore o vibrazioni in frenata', 'Dischi rigati o arrugginiti'],
                      soluzione='Frenate decise periodiche; controllo di dischi e pinze al tagliando.', costo_min=100, costo_max=500))
        P.append(dict(titolo='Batteria a 12 V di servizio', severita='bassa',
                      descrizione='Anche le elettriche hanno una batteria a 12 V: se cede l\'auto non si "accende".',
                      sintomi=['Auto che non si attiva', 'Avvisi di sistema intermittenti'],
                      soluzione='Controllo della batteria 12 V al tagliando.', costo_min=100, costo_max=300))
        return P
    if dist == 'Cinghia':
        P.append(dict(titolo='Cinghia di distribuzione da sostituire a scadenza', severita='alta',
                      descrizione='Motore a cinghia: va sostituita alla scadenza del costruttore (km o anni); la rottura danneggia il motore.',
                      sintomi=['Nessun sintomo prima della rottura'],
                      soluzione='Chiedi la fattura dell\'ultima sostituzione (kit con tenditori e pompa acqua).', costo_min=300, costo_max=900))
    if 'diesel' in a:
        P.append(dict(titolo='Filtro antiparticolato, EGR e volano bimassa', severita='media',
                      descrizione='Sui diesel moderni l\'uso solo urbano intasa FAP ed EGR; a km medio-alti si consumano frizione e volano bimassa.',
                      sintomi=['Spia FAP o motore', 'Vibrazioni al minimo o in partenza'],
                      soluzione='Tragitti extraurbani regolari; prova in partenza in seconda.', costo_min=200, costo_max=1600))
    if 'gpl' in a or 'metano' in a:
        pass  # coperto dalla famiglia "gas" in 02c-motori-noti.js
    if 'ibrid' in a or 'plug' in a or 'hybrid' in a:
        P.append(dict(titolo='Sistema ibrido e batteria di servizio', severita='bassa',
                      descrizione='Sulle ibride conviene far leggere eventuali errori del sistema ibrido e controllare la batteria a 12 V.',
                      sintomi=['Spia sistema ibrido', 'Avviamento del termico molto frequente'],
                      soluzione='Diagnosi in rete ufficiale prima dell\'acquisto.', costo_min=0, costo_max=200))
    P.append(dict(titolo='Freni, sospensioni e pneumatici', severita='media',
                  descrizione='Componenti a usura su qualsiasi auto: a seconda dei km possono servire pastiglie, dischi, ammortizzatori e gomme.',
                  sintomi=['Rumori in frenata o sulle buche', 'Gomme consumate in modo irregolare'],
                  soluzione='Controllo visivo e prova su strada; data di produzione delle gomme (DOT).', costo_min=150, costo_max=900))
    return P


CHECK_AUTO = [
    'Avviamento a motore freddo: rumori, fumo, spie', 'Livello e colore di olio e liquido di raffreddamento',
    'Perdite sotto il veicolo', 'Usura e data (DOT) degli pneumatici', 'Freni: rumori, vibrazioni, tiraggio',
    'Climatizzatore e riscaldamento', 'Spie sul cruscotto a motore acceso', 'Carrozzeria: differenze di colore, ruggine, luci tra i pannelli',
    'Prova su strada di almeno 20 minuti (città e scorrimento)']
CHECK_MOTO = [
    'Avviamento a freddo e minimo', 'Kit trasmissione: tensione e usura', 'Segni di caduta: leve, pedane, carene, manubrio',
    'Forcella: perdite d\'olio dai paraoli', 'Gomme: usura e data (DOT)', 'Freni e liquido', 'Luci e impianto elettrico', 'Prova su strada']
DOMANDE = [
    'Ha il libretto tagliandi e le fatture?', 'Quanti proprietari ha avuto?', 'Ha avuto incidenti o riparazioni di carrozzeria?',
    'Ci sono spie accese? Posso collegare un lettore OBD?', 'Perché la vende?', 'Posso farla vedere a un meccanico di fiducia?']


def build():
    adds = {'auto': {}, 'moto': {}}
    rows = {}
    for tipo, lst in (('auto', AUTO), ('moto', MOTO)):
        for marca, modello, gen, motori in lst:
            names = []
            for m in motori:
                name, cv, cc, alim, cam, tr, di = (m.split('|') + [''] * 7)[:7]
                names.append(name)
                key = '||'.join([marca, modello, gen, name])
                cv = int(cv) if cv else None
                dist = DIST.get(di)
                probs = generici(alim, dist, tipo == 'moto')
                v = {
                    'sommario': 'Scheda di base: i problemi elencati sono controlli generali per questo tipo di motore, non specifici del modello.',
                    'affidabilita': None,
                    'costo_totale_min': sum(p['costo_min'] for p in probs), 'costo_totale_max': sum(p['costo_max'] for p in probs),
                    'consumo_dichiarato': 'N/D', 'consumo_reale': 'N/D',
                    'km_red_flags': [] if tipo == 'moto' else [
                        {'km': 60000, 'descrizione': 'Tagliando completo con filtri e candele (benzina)'},
                        {'km': 120000, 'descrizione': 'Distribuzione se a cinghia, frizione, ammortizzatori'}],
                    'problemi': probs,
                    'checklist_ispezione': CHECK_MOTO if tipo == 'moto' else CHECK_AUTO,
                    'domande_venditore': DOMANDE,
                    'recall_note': 'Verifica i richiami attivi con il numero di telaio presso la rete ufficiale o sul portale del Ministero.',
                    '_marca': marca, '_modello': modello, '_anno': gen, '_motore': name, '_fonte': 'tools/nuovi_veicoli.py',
                }
                ms = slug(modello.split('(')[0])
                links = {'quattroruote': f'https://www.quattroruote.it/listino/{slug(marca)}/{ms}/',
                         'alvolante': f'https://www.alvolante.it/scheda/{slug(marca)}-{ms}/'} if tipo == 'auto' else \
                        {'insella': f'https://www.insella.it/moto/{slug(marca)}', 'dueruote': 'https://www.dueruote.it/listino.html'}
                links['autoscout'] = f'https://www.autoscout24.it/{"lst-moto" if tipo == "moto" else "lst"}/{slug(marca)}/{ms}?cy=I'
                s = {
                    'potenza_cv': cv, 'potenza_kw': round(cv * 0.7355) if cv else None, 'coppia_nm': None,
                    'cilindrata_cc': int(cc) if cc else None, 'alimentazione': alim,
                    'trasmissione': CAMBIO.get(cam, ''), 'trazione': TRAZ.get(tr, ''),
                    'lunghezza_mm': None, 'larghezza_mm': None, 'altezza_mm': None, 'passo_mm': None, 'bagagliaio_l': None,
                    'vel_max_kmh': None, 'acc_0_100_s': None, 'consumo_dichiarato': None, 'consumo_reale': None, 'co2_gkm': None,
                    'link_esterni': links,
                }
                mt = {
                    'olio': {'viscosita': 'Secondo libretto', 'norma': 'specifica del costruttore', 'intervallo_km': None, 'intervallo_mesi': 12, 'quantita_litri': None},
                    'distribuzione': {'tipo': dist or 'Da verificare sul libretto', 'intervallo_km': None,
                                      'note': 'Intervallo secondo il piano del costruttore.' if dist and dist != 'Catena' else ('A catena: nessuna sostituzione programmata.' if dist == 'Catena' else 'Tipo non indicato in archivio: verificalo sul libretto.')},
                    'filtri': {'aria_km': None, 'abitacolo_km': None},
                    'liquido_freni': {'tipo': 'DOT 4', 'intervallo_anni': 2},
                    'refrigerante': {'tipo': 'Secondo libretto', 'intervallo_anni': None},
                    'schedule': [
                        {'intervallo': 'Ogni anno o secondo libretto', 'operazione': 'Tagliando: olio e filtro', 'priorita': 'alta'},
                        {'intervallo': 'Ogni 2 anni', 'operazione': 'Sostituzione liquido freni', 'priorita': 'alta'},
                    ] + ([{'intervallo': 'Secondo libretto', 'operazione': 'Sostituzione cinghia distribuzione + pompa acqua', 'priorita': 'alta'}] if dist and 'Cinghia' in dist else [])
                      + ([{'intervallo': 'Ogni 500–1.000 km', 'operazione': 'Pulizia e lubrificazione catena di trasmissione', 'priorita': 'media'}] if tipo == 'moto' else []),
                }
                rows[key] = (marca, v, s, mt)
            adds[tipo].setdefault(marca, {}).setdefault(modello, {})[gen] = names
    return adds, rows


def main():
    adds, rows = build()
    # 1) catalogo per l'app
    js = ('/* Generato da tools/nuovi_veicoli.py — non modificare a mano.\n'
          '   Modelli aggiunti al catalogo: si uniscono a VEHICLES / MOTORCYCLES. */\n'
          '(function() {\n  var A = ' + json.dumps(adds['auto'], ensure_ascii=False) + ';\n'
          '  var M = ' + json.dumps(adds['moto'], ensure_ascii=False) + ';\n'
          '  function merge(dst, src) { Object.keys(src).forEach(function(b) { dst[b] = dst[b] || {}; Object.keys(src[b]).forEach(function(m) {\n'
          '    dst[b][m] = dst[b][m] || {}; Object.keys(src[b][m]).forEach(function(g) { dst[b][m][g] = src[b][m][g]; }); }); }); }\n'
          '  merge(VEHICLES, A); merge(MOTORCYCLES, M);\n})();\n')
    (ROOT / 'src/js/02a2-veicoli-extra.js').write_text(js, encoding='utf-8')
    # 2) database per marca
    idx_p = ROOT / 'db/index.json'
    idx = json.loads(idx_p.read_text(encoding='utf-8'))
    nuove = sorted(set(r[0] for r in rows.values()) - set(idx['brands']))
    by = {}
    for key, (marca, v, s, mt) in rows.items():
        by.setdefault(marca, []).append((key, v, s, mt))
    for marca, items in by.items():
        info = idx['brands'].get(marca) or {'file': slug(marca) + '.json'}
        fp = ROOT / 'db' / info['file']
        d = json.loads(fp.read_text(encoding='utf-8')) if fp.exists() else {'vehicles': {}, 'specs': {}, 'maintenance': {}}
        for key, v, s, mt in items:
            d['vehicles'][key] = v; d['specs'][key] = s; d['maintenance'][key] = mt
        txt = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        fp.write_text(txt, encoding='utf-8')
        info['motori'] = len(d['vehicles']); info['kb'] = round(len(txt.encode()) / 1024)
        idx['brands'][marca] = info
    idx['brands'] = dict(sorted(idx['brands'].items()))
    idx['_meta']['total_vehicles'] = sum(b['motori'] for b in idx['brands'].values())
    idx['_meta']['aggiunti'] = len(rows)
    idx_p.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding='utf-8')
    n_mod = sum(len(m) for t in adds.values() for m in t.values())
    print(f'aggiunti {len(rows)} motori in {n_mod} modelli · marche nuove: ' + ', '.join(nuove))


if __name__ == '__main__':
    main()
