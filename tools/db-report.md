# Report database veicoli

Sorgente: `db.json` · 2975 motori

## Riepilogo

- coppia rimossa (calcolata, non reale): **2183**
- alimentazione corretta in Diesel: **177**
- elettriche con cambio manuale corrette: **45**
- alimentazione corretta in Elettrico: **17**
- Nissan e-Power corrette in Ibrido: **4**
- motori rimossi da serie sbagliate: **1**
- da verificare: ibrido in serie vecchia: **1**

## Dettagli

- COPPIA: 2183 valori su 2183 sono CV × coefficiente fisso (2.4, 3.8, 3.6, 2.8, 2.5, 3.2): rimossi tutti.
- ELETTRICA: `Volkswagen||ID.4 / ID.3||2020–2024||ID.4 Pure RWD 170cv` era 'Benzina'
- ELETTRICA: `Audi||Q4 e-tron||2021–2024||35 e-tron 170cv RWD` era 'Benzina'
- ELETTRICA: `Audi||Q4 e-tron||2021–2024||40 e-tron 204cv RWD` era 'Benzina'
- ELETTRICA: `Audi||Q4 e-tron||2021–2024||45 e-tron 265cv` era 'Benzina'
- ELETTRICA: `Audi||Q4 e-tron||2021–2024||50 e-tron quattro 299cv` era 'Benzina'
- ELETTRICA: `BMW||iX3 / i3 / iX||2013–2022||i3s 184cv` era 'Benzina'
- ELETTRICA: `BMW||iX3 / i3 / iX||2021–2024||iX3 286cv` era 'Benzina'
- ELETTRICA: `BMW||iX3 / i3 / iX||2021–2024||iX xDrive40 326cv` era 'Benzina'
- ELETTRICA: `BMW||iX3 / i3 / iX||2021–2024||iX xDrive50 523cv` era 'Benzina'
- ELETTRICA: `BMW||iX3 / i3 / iX||2021–2024||iX M60 619cv` era 'Benzina'
- ELETTRICA: `Kia||Niro (DE/SG2)||2022–2024||EV 204cv` era 'Benzina'
- ELETTRICA: `Kia||Niro (DE/SG2)||2022–2024||EV 204cv Long Range` era 'Benzina'
- ELETTRICA: `Volkswagen||ID.5 / ID.7||2022–2024||ID.5 Pro 4Motion 299cv` era 'Benzina'
- ELETTRICA: `Volkswagen||ID.5 / ID.7||2022–2024||ID.5 GTX 299cv` era 'Benzina'
- ELETTRICA: `Volkswagen||ID.5 / ID.7||2022–2024||ID.7 GTX 340cv AWD` era 'Benzina'
- ELETTRICA: `Volkswagen||Golf (VI/VII/VIII)||2013–2020||e-Golf 115cv` era 'Benzina'
- ELETTRICA: `Volkswagen||Golf (VI/VII/VIII)||2013–2020||e-Golf 136cv` era 'Benzina'
- RIMOSSO `Fiat||Panda III||2012–2017||1.0 Hybrid 70cv`: il 1.0 Hybrid è arrivato nel 2020 (è già nella serie 2018–2024)
- VERIFICA: `Lexus||RX (XU30/AL10/AL20)||2004–2009||RX400h Hybrid 272cv` (ibrido in una serie che finisce nel 2009)
- STIME: 0-100 e velocità max sono intervalli per categoria su 1866 motori (es. '8.5–10.5'): mostrati come stima, mai usati come dato preciso.
