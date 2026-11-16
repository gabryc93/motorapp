


// ═══════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════
const VEHICLES = {
  "Alfa Romeo": {
    "147": {
      "2001–2005": [
        "1.6 TS 105cv",
        "1.6 TS 120cv",
        "2.0 TS 150cv",
        "1.9 JTD 100cv",
        "1.9 JTD 115cv"
      ],
      "2005–2010": [
        "1.6 JTS 105cv",
        "2.0 JTS 150cv",
        "1.9 JTD 120cv"
      ]
    },
    "156": {
      "1997–2003": [
        "1.6 TS 120cv",
        "1.8 TS 144cv",
        "2.0 JTS 165cv",
        "1.9 JTD 115cv",
        "2.4 JTD 140cv"
      ],
      "2003–2007": [
        "2.0 JTS 165cv",
        "2.5 V6 192cv",
        "1.9 JTD 150cv",
        "2.4 JTD 175cv"
      ]
    },
    "159": {
      "2005–2008": [
        "1.8 MPI 140cv",
        "1.9 JTDm 120cv",
        "1.9 JTDm 150cv",
        "2.4 JTDm 200cv",
        "3.2 V6 260cv"
      ],
      "2008–2011": [
        "1.8 TBI 160cv",
        "2.0 JTDm 170cv",
        "2.4 JTDm 210cv"
      ]
    },
    "Brera": {
      "2006–2010": [
        "2.2 JTS 185cv",
        "3.2 V6 260cv",
        "2.4 JTDM 200cv"
      ]
    },
    "Giulia": {
      "2016–2019": [
        "2.0T 200cv",
        "2.0T 280cv Veloce",
        "2.9 V6 510cv Quadrifoglio",
        "2.2 JTDm 150cv",
        "2.2 JTDm 180cv"
      ],
      "2020–2024": [
        "2.0T 200cv",
        "2.0T 280cv Veloce",
        "2.9 V6 520cv Quadrifoglio",
        "2.2 JTDm 160cv"
      ]
    },
    "Giulietta": {
      "2010–2014": [
        "1.4 TB 105cv",
        "1.4 TB 120cv",
        "1.4 TB 170cv",
        "1.4 TB MultiAir 170cv",
        "1.6 JTDm 105cv",
        "1.75 TB 235cv Quadrifoglio",
        "1.75 TB 235cv Quadrifoglio Verde",
        "1.75 TB 235cv QV",
        "2.0 JTDm 140cv",
        "2.0 JTDm 150cv",
        "2.0 JTDm 170cv"
      ],
      "2014–2020": [
        "1.4 TB 110cv",
        "1.4 TB 120cv",
        "1.4 TB 150cv",
        "1.6 JTDm 120cv",
        "1.75 TB 240cv Quadrifoglio Verde",
        "2.0 JTDm 120cv",
        "2.0 JTDm 150cv",
        "2.0 JTDm 175cv"
      ]
    },
    "Mito": {
      "2008–2013": [
        "1.4 70cv",
        "1.4 TB 120cv",
        "1.4 TB 155cv Cloverleaf",
        "1.3 JTDm 95cv"
      ],
      "2013–2018": [
        "1.4 70cv",
        "1.4 TB 105cv",
        "1.4 TB 170cv Cloverleaf",
        "1.3 JTDm 95cv",
        "1.6 JTDm 120cv"
      ],
      "2008–2018": [
        "1.3 JTDm 85cv",
        "1.4 78cv",
        "1.4 95cv",
        "1.4 MultiAir 105cv",
        "1.4 TB 135cv",
        "1.4 TB MultiAir 170cv",
        "1.6 JTDm 120cv"
      ]
    },
    "Spider (939)": {
      "2006–2010": [
        "2.2 JTS 185cv",
        "3.2 V6 260cv",
        "2.4 JTDM 200cv"
      ]
    },
    "Stelvio": {
      "2017–2019": [
        "2.0T 200cv",
        "2.0T 280cv Veloce",
        "2.9 V6 510cv Quadrifoglio",
        "2.2 JTDm 180cv",
        "2.2 JTDm 210cv"
      ],
      "2020–2024": [
        "2.0T 200cv",
        "2.0T 280cv Veloce",
        "2.9 V6 520cv Quadrifoglio",
        "2.2 JTDm 160cv"
      ]
    },
    "Tonale": {
      "2022–2024": [
        "1.5 MHEV 130cv",
        "1.5 MHEV 160cv",
        "1.6 Multijet 130cv",
        "1.3 PHEV 280cv Q4"
      ]
    }
  },
  "Audi": {
    "A1 (8X/GB)": {
      "2010–2014": [
        "1.2 TFSI 86cv",
        "1.4 TFSI 122cv",
        "1.4 TFSI 185cv S1",
        "1.6 TDI 90cv",
        "2.0 TDI 143cv"
      ],
      "2015–2018": [
        "1.0 TFSI 95cv",
        "1.4 TFSI 125cv",
        "1.8 TFSI 192cv S1",
        "1.6 TDI 116cv"
      ],
      "2019–2024": [
        "25 TFSI 95cv",
        "30 TFSI 116cv",
        "35 TFSI 150cv",
        "30 TDI 116cv"
      ]
    },
    "A2 (8Z)": {
      "2000–2005": [
        "1.4 75cv",
        "1.6 FSI 110cv",
        "1.4 TDI 75cv",
        "1.4 TDI 90cv"
      ]
    },
    "A3 (8V/8Y)": {
      "2012–2016": [
        "1.0 TFSI 116cv",
        "1.2 TFSI 105cv",
        "1.2 TFSI 86cv",
        "1.4 g-tron 110cv metano",
        "1.4 TFSI 122cv",
        "1.4 TFSI 140cv",
        "1.4 TFSI 140cv COD",
        "1.6 TDI 105cv",
        "1.6 TDI 110cv",
        "1.8 TFSI 180cv",
        "2.0 TDI 150cv",
        "2.0 TDI 184cv",
        "2.0 TFSI 190cv",
        "2.0 TFSI 220cv S3",
        "2.0 TFSI 300cv RS3",
        "2.0 TFSI 300cv S3"
      ],
      "2017–2020": [
        "1.0 TFSI 116cv",
        "1.4 e-tron PHEV 204cv",
        "1.5 TFSI 150cv",
        "1.5 TFSI 150cv COD",
        "1.6 TDI 116cv",
        "2.0 TDI 150cv",
        "2.0 TDI 184cv",
        "2.0 TFSI 190cv",
        "2.0 TFSI 300cv S3",
        "2.5 TFSI 400cv RS3"
      ],
      "2020–2024": [
        "2.5 TFSI 400cv RS3",
        "30 TDI 116cv",
        "30 TFSI 110cv",
        "35 TDI 150cv",
        "35 TFSI 150cv",
        "40 TDI 200cv",
        "40 TFSI 204cv",
        "45 TFSI 245cv S3",
        "45 TFSIe 245cv PHEV"
      ]
    },
    "A4 (B8/B9)": {
      "2008–2015": [
        "1.8 TFSI 120cv",
        "1.8 TFSI 160cv",
        "2.0 TDI 120cv",
        "2.0 TDI 143cv",
        "2.0 TDI 150cv",
        "2.0 TDI 177cv",
        "2.0 TFSI 180cv",
        "2.0 TFSI 211cv",
        "2.0 TFSI 225cv",
        "3.0 BiTDI 313cv",
        "3.0 TDI 204cv",
        "3.0 TDI 240cv",
        "3.0 TDI 245cv",
        "3.0 TFSI 272cv",
        "3.2 FSI 265cv",
        "4.2 FSI 450cv RS4"
      ],
      "2015–2019": [
        "1.4 TFSI 150cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv",
        "2.0 TFSI 190cv",
        "2.0 TFSI 252cv",
        "2.9 TFSI 450cv RS4",
        "3.0 TDI 218cv",
        "3.0 TDI 272cv",
        "3.0 TDI 286cv",
        "3.0 TFSI 354cv S4"
      ],
      "2019–2024": [
        "2.0 TFSI 150cv MHEV",
        "2.0 TFSI 204cv MHEV",
        "40 TDI 190cv MHEV",
        "3.0 TDI 286cv"
      ]
    },
    "A5 (8T/F5)": {
      "2007–2016": [
        "1.8 TFSI 177cv",
        "2.0 TFSI 211cv",
        "3.0 TFSI 272cv S5",
        "2.0 TDI 177cv",
        "3.0 TDI 245cv"
      ],
      "2016–2024": [
        "2.0 TFSI 190cv",
        "2.0 TFSI 245cv",
        "3.0 TFSI 354cv RS5",
        "2.0 TDI 190cv",
        "3.0 TDI 286cv"
      ]
    },
    "A6 (C7/C8)": {
      "2011–2018": [
        "2.0 TFSI 252cv",
        "3.0 TFSI 310cv",
        "2.0 TDI 190cv",
        "3.0 TDI 218cv",
        "3.0 TDI 272cv",
        "3.0 TDI 320cv"
      ],
      "2018–2024": [
        "45 TFSI 245cv MHEV",
        "55 TFSI 340cv",
        "40 TDI 204cv MHEV",
        "45 TDI 231cv MHEV",
        "55 TFSIe 367cv PHEV"
      ]
    },
    "A7 (4G/4K)": {
      "2010–2018": [
        "2.0 TFSI 252cv",
        "3.0 TFSI 300cv",
        "3.0 TFSI 333cv",
        "2.0 TDI 190cv",
        "3.0 TDI 218cv",
        "3.0 TDI 272cv"
      ],
      "2018–2024": [
        "55 TFSI 340cv",
        "50 TDI 286cv",
        "55 TFSIe 367cv PHEV"
      ]
    },
    "Q2 (GA)": {
      "2016–2020": [
        "1.0 TFSI 116cv",
        "1.4 TFSI 150cv",
        "2.0 TFSI 190cv",
        "1.6 TDI 116cv",
        "2.0 TDI 150cv"
      ],
      "2020–2024": [
        "35 TFSI 150cv",
        "30 TDI 116cv",
        "35 TDI 150cv"
      ]
    },
    "Q3 (8U/F3)": {
      "2011–2018": [
        "1.4 TFSI 125cv",
        "2.0 TFSI 170cv",
        "2.0 TFSI 220cv",
        "1.4 TDI 90cv",
        "2.0 TDI 150cv",
        "2.0 TDI 177cv"
      ],
      "2018–2024": [
        "35 TFSI 150cv",
        "40 TFSI 190cv",
        "35 TDI 150cv",
        "45 TFSIe 245cv PHEV"
      ]
    },
    "Q4 e-tron": {
      "2021–2024": [
        "35 e-tron 170cv RWD",
        "40 e-tron 204cv RWD",
        "45 e-tron 265cv",
        "50 e-tron quattro 299cv"
      ]
    },
    "Q5 (8R/FY)": {
      "2008–2017": [
        "2.0 TFSI 211cv",
        "3.0 TFSI 272cv",
        "2.0 TDI 177cv",
        "3.0 TDI 240cv",
        "3.0 TDI 313cv SQ5"
      ],
      "2017–2024": [
        "2.0 TFSI 252cv quattro",
        "3.0 TFSI 354cv SQ5",
        "2.0 TDI 190cv quattro",
        "3.0 TDI 286cv quattro",
        "55 TFSIe 367cv PHEV"
      ]
    },
    "Q7 (4L/4M)": {
      "2006–2015": [
        "3.0 TFSI 272cv",
        "4.2 FSI 350cv",
        "3.0 TDI 233cv",
        "4.2 TDI 340cv"
      ],
      "2015–2024": [
        "3.0 TFSI 333cv",
        "55 TFSI 340cv e-tron",
        "3.0 TDI 218cv",
        "45 TDI 231cv",
        "50 TDI 286cv"
      ]
    },
    "TT (8N/8J/8S)": {
      "1998–2006": [
        "1.8T 180cv",
        "1.8T 225cv",
        "3.2 V6 250cv",
        "1.9 TDI 130cv"
      ],
      "2006–2014": [
        "2.0 TFSI 200cv",
        "2.0 TFSI 272cv",
        "3.2 V6 250cv",
        "2.0 TDI 170cv"
      ],
      "2014–2023": [
        "1.8 TFSI 180cv",
        "2.0 TFSI 230cv",
        "2.0 TFSI 310cv TTS",
        "2.0 TDI 184cv"
      ]
    },
    "e-tron (GE/GH)": {
      "2019–2023": [
        "50 quattro 313cv",
        "55 quattro 408cv",
        "S 503cv",
        "GT 476cv",
        "RS GT 598cv"
      ]
    }
  },
  "BMW": {
    "M2 / M3 / M4": {
      "2015–2021": [
        "M2 370cv",
        "M2 CS 450cv",
        "M3 480cv",
        "M4 480cv"
      ],
      "2021–2024": [
        "M2 460cv",
        "M3 510cv",
        "M4 510cv",
        "M3 CS 550cv",
        "M4 CSL 550cv"
      ]
    },
    "Serie 1 (E87/F20/F40)": {
      "2004–2011": [
        "116i 116cv",
        "118i 143cv",
        "120i 170cv",
        "130i 265cv",
        "116d 115cv",
        "118d 143cv",
        "120d 177cv"
      ],
      "2012–2019": [
        "116i 136cv",
        "118i 136cv",
        "120i 184cv",
        "125i 224cv",
        "118d 150cv",
        "120d 184cv",
        "125d 224cv"
      ],
      "2019–2024": [
        "116i 109cv",
        "118i 136cv",
        "120i 178cv",
        "M135i xDrive 306cv",
        "116d 116cv",
        "118d 150cv",
        "120d 190cv"
      ]
    },
    "Serie 2 (F22/F45/G42)": {
      "2014–2021": [
        "218i 136cv",
        "220i 184cv",
        "228i 245cv",
        "M240i 340cv",
        "216d 116cv",
        "218d 150cv",
        "220d 190cv"
      ],
      "2021–2024": [
        "218i 156cv Active Tourer",
        "220i 204cv",
        "M240i xDrive 374cv",
        "216d 136cv Active Tourer",
        "218d 150cv"
      ]
    },
    "Serie 3 (E90/F30/G20)": {
      "2005–2012": [
        "316d 116cv",
        "316i 122cv",
        "318d 122cv",
        "318d 143cv",
        "318i 143cv",
        "320d 163cv",
        "320i 150cv",
        "320i 170cv",
        "325d 197cv",
        "325i 218cv",
        "328i 233cv",
        "330d 231cv",
        "330d 245cv",
        "330i 258cv",
        "330i 272cv",
        "335d 286cv",
        "335i 306cv",
        "M3 420cv",
        "M3 450cv"
      ],
      "2012–2018": [
        "316d 116cv",
        "316i 136cv",
        "318d 143cv",
        "318i 156cv",
        "320d 184cv",
        "320i 184cv",
        "325d 218cv",
        "328i 245cv",
        "330d 258cv",
        "330i 252cv",
        "335d 313cv",
        "335i 306cv",
        "340i 326cv",
        "M3 431cv",
        "M3 450cv CS"
      ],
      "2019–2024": [
        "316d 122cv",
        "318d 150cv",
        "318i 156cv",
        "320d 190cv",
        "320i 184cv",
        "330d 286cv",
        "330e PHEV 292cv",
        "330e xDrive PHEV 292cv",
        "330i 258cv",
        "M3 480cv",
        "M3 CS 550cv",
        "M340d 340cv xDrive",
        "M340i 374cv xDrive",
        "M340i xDrive 374cv"
      ]
    },
    "Serie 4 (F32/G22)": {
      "2013–2020": [
        "420i 184cv",
        "428i 245cv",
        "440i 326cv",
        "418d 150cv",
        "420d 190cv",
        "430d 258cv"
      ],
      "2020–2024": [
        "420i 184cv",
        "430i 258cv",
        "M440i xDrive 374cv",
        "420d 190cv",
        "430d 286cv",
        "M4 Competition 510cv"
      ]
    },
    "Serie 5 (F10/G30)": {
      "2010–2017": [
        "520i 184cv",
        "528i 245cv",
        "530i 258cv",
        "535i 306cv",
        "518d 143cv",
        "520d 184cv",
        "525d 218cv",
        "530d 258cv",
        "535d 313cv"
      ],
      "2017–2024": [
        "520i 184cv",
        "530i 252cv",
        "540i 340cv",
        "M550i xDrive 462cv",
        "520d 190cv",
        "530d 265cv",
        "540d 340cv",
        "530e PHEV 292cv"
      ]
    },
    "Serie 6 (E63/F13/G32)": {
      "2003–2011": [
        "630i 258cv",
        "650i 367cv",
        "M6 507cv",
        "630d 235cv",
        "635d 286cv"
      ],
      "2011–2018": [
        "640i 320cv",
        "650i 450cv",
        "M6 560cv",
        "640d 313cv"
      ]
    },
    "Serie 7 (E65/F01/G11)": {
      "2002–2009": [
        "730i 258cv",
        "740i 306cv",
        "750i 367cv",
        "730d 231cv",
        "745d 329cv"
      ],
      "2009–2016": [
        "730i 258cv",
        "740i 326cv",
        "750i 450cv",
        "730d 258cv",
        "740d 313cv"
      ],
      "2016–2023": [
        "730i 258cv MHEV",
        "745e PHEV 394cv",
        "730d 265cv MHEV",
        "740d 340cv MHEV"
      ]
    },
    "X1 (E84/F48/U11)": {
      "2009–2015": [
        "sDrive18d 143cv",
        "sDrive18i 150cv",
        "sDrive20i 184cv",
        "xDrive20d 184cv",
        "xDrive20i 184cv",
        "xDrive23d 204cv",
        "xDrive25d 218cv",
        "xDrive25i 218cv",
        "xDrive28i 245cv"
      ],
      "2015–2022": [
        "sDrive18d 150cv",
        "sDrive18i 140cv",
        "xDrive20d 190cv",
        "xDrive20i 192cv",
        "xDrive25d 231cv",
        "xDrive25e PHEV 220cv",
        "xDrive25i 231cv",
        "xDrive28i 231cv"
      ],
      "2022–2024": [
        "eDrive20 204cv BEV",
        "iX1 xDrive30 313cv BEV",
        "sDrive18d 150cv",
        "sDrive18i 136cv",
        "xDrive20d 204cv",
        "xDrive23d 211cv",
        "xDrive23i 218cv",
        "xDrive25e PHEV 245cv",
        "xDrive30e PHEV 326cv"
      ]
    },
    "X2 (F39/U10)": {
      "2018–2023": [
        "sDrive20i 192cv",
        "xDrive20i 192cv",
        "xDrive25e PHEV 220cv",
        "sDrive18d 150cv",
        "xDrive20d 190cv"
      ],
      "2024–2024": [
        "xDrive20d 150cv MHEV",
        "M35i xDrive 300cv",
        "iX2 xDrive30 313cv BEV"
      ]
    },
    "X3 (E83/F25/G01)": {
      "2003–2010": [
        "2.0d 150cv",
        "2.0i 150cv",
        "2.5i 192cv",
        "3.0d 204cv",
        "3.0d 218cv",
        "3.0i 231cv",
        "3.0si 272cv"
      ],
      "2010–2017": [
        "M40d 313cv xDrive",
        "M40i 354cv",
        "sDrive18d 143cv",
        "sDrive20i 184cv",
        "xDrive20d 184cv",
        "xDrive20i 184cv",
        "xDrive28i 245cv",
        "xDrive30d 258cv",
        "xDrive35i 306cv"
      ],
      "2017–2024": [
        "iX3 BEV 286cv",
        "M40d 340cv xDrive",
        "M40i 354cv",
        "M40i 360cv",
        "M40i 374cv",
        "X3 M 480cv",
        "X3 M CS 550cv",
        "xDrive18d 150cv",
        "xDrive20d 190cv",
        "xDrive20i 184cv",
        "xDrive30d 265cv",
        "xDrive30e PHEV 292cv",
        "xDrive30e PHEV 326cv",
        "xDrive30i 252cv"
      ]
    },
    "X4 (F26/G02)": {
      "2014–2021": [
        "xDrive20i 184cv",
        "xDrive28i 245cv",
        "M40i 354cv",
        "xDrive20d 190cv",
        "xDrive30d 265cv",
        "M40d 340cv"
      ],
      "2021–2024": [
        "xDrive20i 184cv",
        "xDrive30i 252cv",
        "M40i 354cv",
        "xDrive20d 190cv",
        "xDrive30d 265cv"
      ]
    },
    "X5 (E53/E70/F15/G05)": {
      "2000–2006": [
        "3.0i 231cv",
        "4.4i 320cv",
        "3.0d 218cv"
      ],
      "2007–2013": [
        "xDrive30i 272cv",
        "xDrive35i 306cv",
        "xDrive30d 235cv",
        "xDrive40d 306cv"
      ],
      "2014–2018": [
        "xDrive25d 218cv",
        "xDrive30d 258cv",
        "xDrive40e PHEV 313cv",
        "xDrive50i 450cv"
      ],
      "2018–2024": [
        "xDrive40i 340cv",
        "M50i 530cv",
        "xDrive30d 286cv",
        "xDrive40d 340cv",
        "xDrive45e PHEV 394cv",
        "xDrive50e PHEV 490cv"
      ]
    },
    "X6 (E71/F16/G06)": {
      "2008–2014": [
        "xDrive35i 306cv",
        "xDrive50i 408cv",
        "xDrive30d 235cv",
        "xDrive40d 306cv",
        "M 555cv"
      ],
      "2015–2023": [
        "xDrive30d 265cv",
        "xDrive40d 340cv",
        "xDrive50i 450cv",
        "M 575cv"
      ]
    },
    "iX3 / i3 / iX": {
      "2013–2022": [
        "i3 170cv 33kWh",
        "i3 170cv 42kWh",
        "i3s 184cv"
      ],
      "2021–2024": [
        "iX3 286cv",
        "iX xDrive40 326cv",
        "iX xDrive50 523cv",
        "iX M60 619cv"
      ]
    }
  },
  "Citroën": {
    "Berlingo III": {
      "2018–2024": [
        "1.2 PureTech 110cv",
        "1.5 BlueHDi 100cv",
        "1.5 BlueHDi 130cv",
        "ë-Berlingo 136cv BEV"
      ]
    },
    "C1 (PM/PN)": {
      "2005–2014": [
        "1.0 68cv",
        "1.4 75cv",
        "1.4 HDi 54cv"
      ],
      "2014–2022": [
        "1.0 68cv",
        "1.2 82cv"
      ]
    },
    "C2 (GN)": {
      "2003–2009": [
        "1.1 60cv",
        "1.4 75cv",
        "1.6 16V 110cv",
        "1.6 VTS 125cv",
        "1.4 HDi 70cv"
      ]
    },
    "C3 (II/III)": {
      "2009–2016": [
        "1.0 PureTech 68cv",
        "1.1 60cv",
        "1.2 PureTech 82cv",
        "1.2 VTi 82cv",
        "1.4 73cv",
        "1.4 HDi 70cv",
        "1.4 VTi 95cv",
        "1.6 BlueHDi 100cv",
        "1.6 BlueHDi 75cv",
        "1.6 HDi 114cv",
        "1.6 HDi 90cv",
        "1.6 THP 155cv",
        "1.6 VTi 120cv"
      ],
      "2017–2024": [
        "1.2 PureTech 83cv",
        "1.2 PureTech 110cv",
        "1.5 BlueHDi 100cv"
      ],
      "2017–2022": [
        "1.2 PureTech 110cv",
        "1.2 PureTech 68cv",
        "1.2 PureTech 82cv",
        "1.5 BlueHDi 100cv"
      ]
    },
    "C3 Aircross": {
      "2017–2021": [
        "1.2 PureTech 110cv",
        "1.2 PureTech 130cv",
        "1.5 BlueHDi 100cv",
        "1.6 BlueHDi 120cv"
      ],
      "2021–2024": [
        "1.2 PureTech 110cv",
        "1.5 BlueHDi 110cv",
        "ë-C3 Aircross 136cv BEV"
      ]
    },
    "C4 (II/III)": {
      "2010–2018": [
        "1.2 PureTech 130cv",
        "1.6 THP 155cv",
        "1.6 BlueHDi 100cv",
        "2.0 BlueHDi 150cv"
      ],
      "2020–2024": [
        "1.2 PureTech 100cv",
        "1.2 PureTech 130cv",
        "1.5 BlueHDi 110cv",
        "ë-C4 136cv BEV"
      ]
    },
    "C5 (II)": {
      "2008–2012": [
        "1.6 THP 150cv",
        "2.0 143cv",
        "3.0 V6 215cv",
        "1.6 HDi 115cv",
        "2.0 HDi 140cv",
        "2.7 V6 HDi 208cv"
      ],
      "2012–2017": [
        "1.6 THP 155cv",
        "2.0 THP 200cv",
        "1.6 BlueHDi 120cv",
        "2.0 BlueHDi 150cv",
        "2.0 BlueHDi 180cv"
      ]
    },
    "C5 Aircross": {
      "2018–2021": [
        "1.2 PureTech 130cv",
        "1.6 PureTech 180cv",
        "1.5 BlueHDi 130cv",
        "2.0 BlueHDi 180cv",
        "1.6 PHEV 225cv"
      ],
      "2021–2024": [
        "1.2 PureTech 130cv",
        "1.6 PureTech 180cv",
        "1.5 BlueHDi 130cv",
        "1.6 PHEV 225cv"
      ]
    },
    "DS3 / DS3 Crossback": {
      "2010–2016": [
        "1.2 PureTech 82cv",
        "1.6 THP 155cv",
        "1.6 THP 208cv",
        "1.6 BlueHDi 120cv"
      ],
      "2019–2024": [
        "1.2 PureTech 130cv",
        "1.6 PureTech 180cv",
        "BlueHDi 100cv",
        "ë-DS3 Crossback 136cv BEV"
      ]
    },
    "Jumpy / Spacetourer": {
      "2016–2024": [
        "1.6 BlueHDi 95cv",
        "1.6 BlueHDi 115cv",
        "2.0 BlueHDi 150cv",
        "2.0 BlueHDi 180cv",
        "ë-Spacetourer 136cv BEV"
      ]
    }
  },
  "Cupra": {
    "Born": {
      "2021–2024": [
        "58kWh 231cv RWD",
        "77kWh 231cv RWD",
        "VZ 77kWh 231cv"
      ]
    },
    "Formentor": {
      "2021–2024": [
        "1.5 TSI 150cv",
        "2.0 TSI 190cv",
        "2.0 TSI 245cv 4Drive",
        "2.0 TSI 310cv VZ 4Drive",
        "1.4 e-Hybrid 204cv",
        "1.4 e-Hybrid 245cv"
      ]
    },
    "Leon (KL8)": {
      "2020–2024": [
        "1.5 TSI 150cv",
        "2.0 TSI 245cv",
        "2.0 TSI 300cv VZ",
        "1.4 e-Hybrid 204cv",
        "2.0 TDI 150cv"
      ]
    }
  },
  "Dacia": {
    "Bigster": {
      "2025–2025": [
        "1.2 TCe 130cv MHEV",
        "1.2 TCe 140cv 4WD",
        "Hybrid 155cv"
      ]
    },
    "Duster (I/II)": {
      "2010–2017": [
        "1.6 115cv 4x2",
        "2.0 143cv 4x4",
        "1.5 dCi 85cv 4x2",
        "1.5 dCi 110cv 4x4"
      ],
      "2018–2024": [
        "1.0 TCe 100cv",
        "1.0 TCe 90cv",
        "1.3 TCe 130cv",
        "1.3 TCe 150cv 4WD",
        "1.3 TCe 150cv 4x4",
        "1.5 Blue dCi 115cv 4WD",
        "1.5 Blue dCi 115cv 4x4",
        "1.5 Blue dCi 95cv"
      ],
      "2010–2018": [
        "1.2 TCe 125cv",
        "1.5 dCi 110cv 4WD",
        "1.5 dCi 90cv",
        "1.6 115cv",
        "2.0 135cv"
      ]
    },
    "Jogger": {
      "2022–2024": [
        "1.0 TCe 110cv",
        "1.0 TCe 100cv ECO-G bi-fuel",
        "1.6 Hybrid 140cv"
      ]
    },
    "Logan (II/III)": {
      "2012–2020": [
        "1.0 SCe 73cv",
        "0.9 TCe 90cv",
        "1.5 dCi 75cv",
        "1.5 dCi 90cv"
      ],
      "2020–2024": [
        "1.0 SCe 65cv",
        "1.0 TCe 90cv",
        "1.0 TCe 100cv ECO-G"
      ]
    },
    "Sandero (II/III)": {
      "2013–2020": [
        "1.0 SCe 73cv",
        "0.9 TCe 90cv",
        "1.5 dCi 75cv",
        "1.5 dCi 90cv"
      ],
      "2020–2024": [
        "1.0 SCe 65cv",
        "1.0 TCe 90cv",
        "1.0 TCe 100cv ECO-G bi-fuel",
        "1.5 Blue dCi 95cv"
      ],
      "2013–2021": [
        "0.9 TCe 90cv",
        "1.0 SCe 75cv",
        "1.0 Tce 100cv",
        "1.5 dCi 75cv",
        "1.5 dCi 90cv"
      ],
      "2021–2024": [
        "1.0 SCe 65cv",
        "1.0 TCe 100cv ECO-G",
        "1.0 TCe 90cv",
        "1.5 Blue dCi 95cv"
      ]
    },
    "Spring": {
      "2021–2024": [
        "Electric 45cv",
        "Electric Extreme 65cv"
      ]
    }
  },
  "Fiat": {
    "124 Spider": {
      "2016–2021": [
        "1.4 MultiAir Turbo 140cv",
        "Abarth 170cv"
      ]
    },
    "500 (312)": {
      "2007–2015": [
        "0.9 TwinAir 105cv",
        "0.9 TwinAir 65cv",
        "0.9 TwinAir 85cv",
        "1.2 69cv",
        "1.3 MultiJet 75cv",
        "1.3 MultiJet 95cv",
        "1.4 100cv",
        "1.4 500C Cabrio 100cv",
        "1.4 Abarth 135cv",
        "1.4 Abarth 160cv"
      ],
      "2015–2024": [
        "0.9 TwinAir 105cv",
        "0.9 TwinAir 85cv",
        "1.0 Hybrid 70cv",
        "1.2 69cv",
        "1.3 MultiJet 95cv",
        "1.4 100cv",
        "1.4 Abarth 145cv",
        "1.4 Abarth 165cv",
        "elettrica 118cv",
        "elettrica 320cv Abarth"
      ]
    },
    "500X": {
      "2015–2018": [
        "1.4 MultiAir 140cv",
        "1.4 MultiAir 170cv 4x4",
        "2.0 MultiJet 140cv 4x4",
        "1.6 MultiJet 120cv"
      ],
      "2018–2024": [
        "1.0 FireFly 120cv",
        "1.3 FireFly 150cv DCT",
        "1.6 MultiJet 130cv",
        "2.0 MultiJet 140cv"
      ]
    },
    "Bravo II": {
      "2007–2011": [
        "1.4 90cv",
        "1.4 T-Jet 120cv",
        "1.4 T-Jet 150cv",
        "1.6 MJet 90cv",
        "1.9 MJet 120cv",
        "1.9 MJet 150cv"
      ],
      "2011–2014": [
        "1.4 T-Jet 120cv",
        "1.6 MJet 105cv",
        "2.0 MJet 165cv"
      ]
    },
    "Doblo (II/III)": {
      "2010–2015": [
        "1.4 95cv",
        "1.6 MultiJet 90cv",
        "1.6 MultiJet 105cv",
        "2.0 MultiJet 135cv"
      ],
      "2022–2024": [
        "1.2 PureTech 110cv",
        "1.5 BlueHDi 100cv",
        "ë-Doblò 136cv BEV"
      ]
    },
    "Freemont": {
      "2011–2016": [
        "2.0 143cv",
        "2.4 170cv",
        "2.0 MultiJet 140cv",
        "2.0 MultiJet 170cv 4WD"
      ]
    },
    "Linea": {
      "2007–2015": [
        "1.4 77cv",
        "1.4 T-Jet 120cv",
        "1.3 MJet 90cv"
      ]
    },
    "Panda III": {
      "2012–2017": [
        "0.9 TwinAir 65cv",
        "0.9 TwinAir 85cv",
        "1.2 69cv",
        "1.3 MultiJet 75cv",
        "1.3 MultiJet 95cv 4x4"
      ],
      "2018–2024": [
        "1.2 69cv",
        "0.9 TwinAir 85cv",
        "1.0 Hybrid 70cv",
        "1.3 MultiJet 95cv"
      ]
    },
    "Punto III": {
      "2005–2012": [
        "1.2 65cv",
        "1.4 77cv",
        "1.4 T-Jet 120cv",
        "1.3 MJet 75cv",
        "1.3 MJet 90cv"
      ],
      "2012–2018": [
        "1.2 69cv",
        "1.4 77cv",
        "0.9 TwinAir 85cv",
        "1.3 MJet 75cv",
        "1.3 MJet 95cv"
      ]
    },
    "Stilo": {
      "2001–2007": [
        "1.2 80cv",
        "1.4 95cv",
        "1.6 103cv",
        "1.8 133cv",
        "2.4 20V 170cv Abarth",
        "1.9 MJet 80cv",
        "1.9 MJet 115cv",
        "1.9 MJet 140cv"
      ]
    },
    "Tipo (356)": {
      "2016–2020": [
        "1.4 95cv",
        "1.4 T-Jet 120cv",
        "1.6 MultiJet 120cv",
        "2.0 MultiJet 150cv"
      ],
      "2020–2024": [
        "1.0 FireFly 100cv",
        "1.5 Hybrid 130cv",
        "1.6 MultiJet 130cv"
      ],
      "2016–2024": [
        "1.0 100cv",
        "1.3 MultiJet 95cv",
        "1.4 95cv",
        "1.4 T-Jet 120cv",
        "1.6 110cv",
        "1.6 MultiJet 120cv",
        "2.0 MultiJet 150cv"
      ]
    }
  },
  "Ford": {
    "EcoSport (B515)": {
      "2014–2018": [
        "1.0 EcoBoost 125cv",
        "1.5 Ti-VCT 112cv",
        "1.5 TDCi 95cv"
      ],
      "2018–2022": [
        "1.0 EcoBoost 125cv",
        "1.5 Ti-VCT 123cv",
        "1.5 EcoBlue 100cv"
      ]
    },
    "Explorer (V/VI)": {
      "2011–2019": [
        "2.0 EcoBoost 240cv",
        "3.5 Ti-VCT 290cv",
        "3.5 EcoBoost 370cv",
        "2.0 TDCi 182cv"
      ],
      "2019–2024": [
        "3.0 EcoBoost PHEV 457cv",
        "3.0 EcoBoost 336cv"
      ]
    },
    "Fiesta (VI/VII)": {
      "2008–2017": [
        "1.0 65cv",
        "1.0 80cv",
        "1.0 EcoBoost 100cv",
        "1.0 EcoBoost 125cv",
        "1.0 EcoBoost 140cv",
        "1.25 82cv",
        "1.4 TDCi 70cv",
        "1.5 TDCi 75cv",
        "1.5 TDCi 95cv",
        "1.6 120cv",
        "1.6 182cv ST",
        "1.6 TDCi 90cv",
        "1.6 TDCi 95cv",
        "1.6 Ti-VCT 120cv",
        "1.6 Ti-VCT 85cv",
        "ST 200cv"
      ],
      "2017–2023": [
        "1.0 EcoBoost 100cv MHEV",
        "1.0 EcoBoost 125cv",
        "1.0 EcoBoost 125cv MHEV",
        "1.0 EcoBoost 155cv ST-Line",
        "1.0 EcoBoost 85cv",
        "1.0 EcoBoost 95cv",
        "1.0 EcoBoost 95cv MHEV",
        "1.5 EcoBoost 200cv ST",
        "1.5 TDCi 120cv",
        "1.5 TDCi 85cv",
        "ST 200cv"
      ]
    },
    "Focus (III/IV)": {
      "2011–2018": [
        "1.0 EcoBoost 100cv",
        "1.0 EcoBoost 125cv",
        "1.5 EcoBoost 150cv",
        "1.5 EcoBoost 182cv",
        "1.5 TDCi 105cv",
        "1.5 TDCi 120cv",
        "1.5 TDCi 95cv",
        "1.6 EcoBoost 150cv",
        "1.6 EcoBoost 182cv",
        "1.6 TDCi 115cv",
        "1.6 TDCi 95cv",
        "1.6 Ti-VCT 105cv",
        "1.6 Ti-VCT 85cv",
        "2.0 EcoBoost 250cv ST",
        "2.0 ST 250cv",
        "2.0 TDCi 140cv",
        "2.0 TDCi 150cv",
        "2.0 TDCi 185cv",
        "2.3 RS 350cv"
      ],
      "2018–2024": [
        "1.0 EcoBoost 125cv MHEV",
        "1.0 EcoBoost 155cv",
        "1.0 EcoBoost 155cv MHEV",
        "1.0 EcoBoost 85cv MHEV",
        "1.5 EcoBlue 120cv",
        "1.5 EcoBlue 95cv",
        "2.0 EcoBlue 150cv",
        "2.3 EcoBoost 280cv ST"
      ]
    },
    "Galaxy / S-MAX (II)": {
      "2015–2023": [
        "1.5 EcoBoost 160cv",
        "2.0 EcoBoost 240cv",
        "1.5 TDCi 120cv",
        "2.0 TDCi 150cv",
        "2.0 TDCi 210cv"
      ]
    },
    "Kuga (II/III)": {
      "2012–2019": [
        "1.5 EcoBoost 120cv",
        "1.5 EcoBoost 150cv",
        "2.0 EcoBoost 240cv 4x4",
        "1.5 TDCi 120cv",
        "2.0 TDCi 150cv",
        "2.0 TDCi 180cv 4x4"
      ],
      "2020–2024": [
        "1.5 EcoBoost 150cv",
        "2.5 Duratec FHEV 190cv",
        "2.5 PHEV 225cv",
        "1.5 EcoBlue 120cv"
      ]
    },
    "Mondeo (IV/V)": {
      "2007–2014": [
        "1.6 EcoBoost 160cv",
        "2.0 EcoBoost 203cv",
        "2.0 EcoBoost 240cv",
        "1.6 TDCi 115cv",
        "2.0 TDCi 140cv",
        "2.2 TDCi 200cv"
      ],
      "2015–2022": [
        "1.5 EcoBoost 160cv",
        "2.0 EcoBoost 203cv",
        "2.0 EcoBoost 240cv",
        "2.0 Hybrid 187cv",
        "1.5 TDCi 120cv",
        "2.0 TDCi 150cv",
        "2.0 TDCi 210cv"
      ]
    },
    "Mustang (S550/S650)": {
      "2015–2022": [
        "2.3 EcoBoost 317cv",
        "5.0 V8 450cv",
        "5.2 V8 GT350 530cv",
        "5.2 V8 GT500 771cv"
      ],
      "2023–2024": [
        "2.3 EcoBoost 290cv",
        "5.0 V8 450cv",
        "Mach 1 460cv"
      ]
    },
    "Puma": {
      "2019–2024": [
        "1.0 EcoBoost 125cv MHEV",
        "1.0 EcoBoost 155cv MHEV",
        "ST 200cv",
        "1.5 EcoBlue 120cv"
      ]
    },
    "Ranger (T6/T7/T8)": {
      "2012–2019": [
        "2.2 TDCi 150cv",
        "3.2 TDCi 200cv",
        "2.0 EcoBlue 170cv",
        "Raptor 2.0 213cv"
      ],
      "2019–2024": [
        "2.0 EcoBlue 170cv",
        "2.0 EcoBlue 205cv",
        "3.0 V6 EcoBoost Raptor 289cv"
      ]
    },
    "Tourneo / Transit Custom": {
      "2013–2023": [
        "2.0 EcoBlue 105cv",
        "2.0 EcoBlue 130cv",
        "2.0 EcoBlue 185cv",
        "PHEV 126cv"
      ]
    }
  },
  "Honda": {
    "Accord (VIII/IX)": {
      "2008–2015": [
        "2.0 i-VTEC 156cv",
        "2.4 i-VTEC 201cv",
        "2.2 i-DTEC 150cv"
      ]
    },
    "CR-V (IV/V)": {
      "2012–2018": [
        "1.6 i-DTEC 120cv 2WD",
        "1.6 i-DTEC 160cv 4WD",
        "2.0 i-VTEC 155cv"
      ],
      "2018–2024": [
        "1.5 VTEC Turbo 173cv",
        "1.5 VTEC Turbo 4WD 173cv",
        "2.0 e:HEV 184cv",
        "2.0 PHEV 306cv"
      ]
    },
    "Civic (IX/X/XI)": {
      "2012–2017": [
        "1.4 i-VTEC 100cv",
        "1.8 i-VTEC 142cv",
        "2.0 Si 201cv",
        "1.6 i-DTEC 120cv",
        "2.2 i-DTEC 150cv"
      ],
      "2017–2022": [
        "1.0 VTEC Turbo 126cv",
        "1.5 VTEC Turbo 182cv",
        "1.6 i-DTEC 120cv",
        "Type R 320cv"
      ],
      "2022–2024": [
        "1.5 e:HEV 143cv",
        "2.0 e:HEV 184cv",
        "Type R 329cv"
      ]
    },
    "HR-V (II/III)": {
      "2015–2022": [
        "1.5 i-VTEC 130cv",
        "1.6 i-DTEC 120cv"
      ],
      "2022–2024": [
        "1.5 e:HEV 131cv 2WD",
        "1.5 e:HEV 4WD 131cv"
      ]
    },
    "Jazz (III/IV)": {
      "2008–2015": [
        "1.2 90cv",
        "1.2 i-VTEC 90cv",
        "1.3 i-VTEC 88cv",
        "1.3 IMA Hybrid 88cv",
        "1.4 i-DSI 83cv",
        "1.4 i-VTEC 100cv"
      ],
      "2015–2020": [
        "1.2 i-VTEC 90cv",
        "1.3 i-VTEC 102cv",
        "1.5 i-VTEC 130cv"
      ],
      "2020–2024": [
        "1.5 e:HEV 109cv",
        "1.5 e:HEV Crosstar 109cv"
      ],
      "2015–2024": [
        "1.3 i-VTEC 102cv",
        "1.5 i-MMD Hybrid 122cv"
      ]
    },
    "Legend (IV)": {
      "2004–2012": [
        "3.5 V6 300cv 4WD"
      ]
    },
    "NSX (NC1)": {
      "2016–2022": [
        "3.5 V6 Hybrid SH-AWD 573cv"
      ]
    }
  },
  "Hyundai": {
    "Bayon": {
      "2021–2024": [
        "1.0 T-GDI 100cv MHEV",
        "1.0 T-GDI 120cv MHEV",
        "1.2 MPI 84cv"
      ]
    },
    "Ioniq (AE)": {
      "2016–2022": [
        "Hybrid 141cv",
        "Plug-in Hybrid 141cv",
        "Electric 136cv"
      ]
    },
    "Ioniq 5 / 6": {
      "2021–2024": [
        "Ioniq5 RWD 170cv 58kWh",
        "Ioniq5 RWD 218cv 77kWh",
        "Ioniq5 AWD 305cv 77kWh",
        "Ioniq5 N 650cv",
        "Ioniq6 RWD 151cv",
        "Ioniq6 RWD 229cv",
        "Ioniq6 AWD 325cv"
      ]
    },
    "Kona (OS/SX2)": {
      "2017–2023": [
        "1.0 T-GDI 120cv",
        "1.6 T-GDI 177cv",
        "1.6 CRDi 115cv",
        "64kWh Electric 204cv"
      ],
      "2023–2024": [
        "1.0 T-GDI 120cv MHEV",
        "1.6 T-GDI 199cv FHEV",
        "65.4kWh Electric 218cv"
      ]
    },
    "Nexo": {
      "2018–2024": [
        "Fuel Cell 163cv Idrogeno"
      ]
    },
    "Santa Fe (III/IV)": {
      "2012–2018": [
        "2.0 GDI 150cv",
        "2.4 GDI 192cv",
        "2.2 CRDi 150cv",
        "2.2 CRDi 200cv"
      ],
      "2018–2024": [
        "2.0 T-GDI 235cv",
        "2.2 CRDi 200cv",
        "1.6 T-GDI PHEV 265cv",
        "1.6 T-GDI FHEV 230cv"
      ]
    },
    "Tucson (III/IV)": {
      "2015–2020": [
        "1.6 GDI 132cv",
        "1.6 T-GDI 177cv",
        "2.0 CRDi 136cv",
        "2.0 CRDi 185cv 4WD"
      ],
      "2020–2024": [
        "1.6 T-GDI 150cv MHEV",
        "1.6 T-GDI 230cv PHEV",
        "1.6 T-GDI 265cv FHEV",
        "1.6 CRDi 136cv MHEV"
      ],
      "2015–2021": [
        "1.6 CRDi 115cv",
        "1.6 CRDi 136cv 48V",
        "1.6 GDI 132cv",
        "1.6 T-GDI 177cv 4WD",
        "2.0 CRDi 185cv 4WD",
        "2.0 MPI 155cv",
        "2.4 GDI 184cv 4WD"
      ],
      "2021–2024": [
        "1.6 CRDi 115cv MHEV",
        "1.6 CRDi 136cv AWD MHEV",
        "1.6 Hybrid 230cv FHEV",
        "1.6 T-GDI 150cv MHEV",
        "1.6 T-GDI 180cv AWD MHEV",
        "1.6 T-GDI 230cv PHEV AWD"
      ]
    },
    "i10 (PA/IA/AC3)": {
      "2008–2014": [
        "1.0 66cv",
        "1.1 69cv",
        "1.2 86cv"
      ],
      "2014–2020": [
        "1.0 66cv",
        "1.2 87cv",
        "1.0 T-GDI 100cv"
      ],
      "2020–2024": [
        "1.0 67cv",
        "1.2 84cv",
        "1.0 T-GDI 100cv MHEV",
        "N Line 1.0 T-GDI 100cv"
      ]
    },
    "i20 (II/III)": {
      "2014–2020": [
        "1.0 T-GDI 100cv",
        "1.2 MPI 75cv",
        "1.2 MPI 84cv",
        "1.4 MPI 100cv",
        "1.1 CRDi 75cv",
        "1.4 CRDi 90cv"
      ],
      "2020–2024": [
        "1.0 T-GDI 100cv MHEV",
        "1.0 T-GDI 120cv MHEV",
        "N Performance 204cv"
      ]
    },
    "i30 (II/III)": {
      "2012–2017": [
        "1.4 100cv",
        "1.4 CRDi 90cv",
        "1.4 T-GDI 140cv",
        "1.6 132cv",
        "1.6 135cv",
        "1.6 CRDi 110cv",
        "1.6 CRDi 136cv",
        "1.6 T-GDI 204cv N",
        "2.0 CRDi 136cv",
        "2.0 i30 N 275cv",
        "2.0 N 275cv"
      ],
      "2017–2024": [
        "1.0 T-GDI 120cv",
        "1.4 CRDi 90cv",
        "1.4 T-GDI 140cv",
        "1.5 T-GDI 160cv MHEV",
        "1.6 CRDi 115cv",
        "2.0 CRDi 136cv",
        "2.0 T-GDI N 280cv",
        "2.0 T-GDI N 300cv",
        "N 275cv"
      ]
    }
  },
  "Jeep": {
    "Avenger": {
      "2023–2024": [
        "BEV 156cv",
        "1.2 Turbo 100cv"
      ]
    },
    "Cherokee (KL)": {
      "2014–2019": [
        "2.0 MultiAir 170cv FWD",
        "2.4 MultiAir 184cv",
        "3.2 V6 272cv",
        "2.2 MultiJet 200cv 4x4"
      ],
      "2019–2023": [
        "2.0 GME 270cv",
        "3.2 V6 272cv",
        "2.2 MultiJet 195cv"
      ]
    },
    "Compass (II)": {
      "2017–2020": [
        "1.4 MultiAir 140cv FWD",
        "1.4 MultiAir 170cv 4x4",
        "2.0 MultiJet 140cv FWD",
        "2.0 MultiJet 170cv 4x4"
      ],
      "2021–2024": [
        "1.3 T4 130cv",
        "1.3 T4 150cv",
        "1.3 4xe PHEV 240cv",
        "1.6 E-Torq 130cv"
      ]
    },
    "Grand Cherokee (WJ/WK/WK2/WL)": {
      "2000–2010": [
        "3.7 V6 215cv",
        "4.7 V8 218cv",
        "5.7 HEMI 326cv",
        "3.0 CRD 218cv"
      ],
      "2010–2022": [
        "3.6 V6 286cv",
        "5.7 HEMI 352cv",
        "6.4 SRT 468cv",
        "3.0 CRD 250cv",
        "4xe PHEV 375cv"
      ],
      "2022–2024": [
        "2.0 Turbo 272cv",
        "3.6 V6 293cv",
        "4xe PHEV 375cv",
        "SRT 6.4 468cv"
      ]
    },
    "Renegade": {
      "2014–2019": [
        "1.4 MultiAir 140cv FWD",
        "1.4 MultiAir 170cv 4x4",
        "2.0 MultiJet 120cv FWD",
        "2.0 MultiJet 140cv 4x4",
        "2.0 MultiJet 170cv 4x4 Auto"
      ],
      "2019–2024": [
        "1.0 T3 120cv",
        "1.3 T4 150cv FWD",
        "1.3 T4 150cv 4xe PHEV",
        "1.6 E-Torq 110cv",
        "1.3 4xe PHEV 240cv"
      ]
    },
    "Wrangler (JK/JL)": {
      "2007–2018": [
        "3.6 V6 284cv",
        "3.8 V6 202cv",
        "2.8 CRD 200cv"
      ],
      "2018–2024": [
        "2.0 T 272cv",
        "3.6 V6 285cv",
        "2.2 MultiJet 200cv",
        "4xe PHEV 380cv"
      ]
    }
  },
  "Kia": {
    "Ceed (II/III)": {
      "2012–2018": [
        "1.0 T-GDI 100cv",
        "1.2 MPI 84cv",
        "1.4 100cv",
        "1.4 CRDi 90cv",
        "1.4 MPI 100cv",
        "1.6 CRDi 110cv",
        "1.6 CRDi 136cv",
        "1.6 GDI 135cv"
      ],
      "2018–2024": [
        "1.0 T-GDI 120cv",
        "1.4 T-GDI 140cv",
        "1.5 T-GDI 160cv",
        "Proceed GT 204cv",
        "1.6 CRDi 115cv",
        "1.6 CRDi 136cv"
      ]
    },
    "EV6": {
      "2021–2024": [
        "RWD 170cv 58kWh",
        "RWD 228cv 77kWh",
        "AWD 325cv 77kWh",
        "GT AWD 585cv"
      ]
    },
    "Niro (DE/SG2)": {
      "2016–2022": [
        "1.6 GDI Hybrid 141cv",
        "1.6 PHEV 141cv",
        "64kWh Electric 204cv"
      ],
      "2022–2024": [
        "HEV 141cv",
        "PHEV 183cv",
        "EV 204cv",
        "EV 204cv Long Range"
      ]
    },
    "Picanto (SA/TA/JA)": {
      "2004–2011": [
        "1.0 61cv",
        "1.1 65cv",
        "1.1 CRDi 75cv"
      ],
      "2011–2017": [
        "1.0 69cv",
        "1.2 85cv",
        "1.0 T-GDI 100cv"
      ],
      "2017–2024": [
        "1.0 67cv",
        "1.2 84cv",
        "1.0 T-GDI 100cv MHEV"
      ]
    },
    "ProCeed": {
      "2019–2024": [
        "1.5 T-GDI 160cv",
        "GT 2.0 T-GDI 204cv",
        "1.6 CRDi 136cv"
      ]
    },
    "Sorento (III/IV)": {
      "2015–2020": [
        "2.0 GDI 163cv",
        "2.2 CRDi 200cv",
        "2.4 GDI 192cv"
      ],
      "2020–2024": [
        "1.6 T-GDI 230cv PHEV",
        "1.6 T-GDI 230cv FHEV",
        "2.2 CRDi 202cv AWD"
      ]
    },
    "Sportage (III/IV/V)": {
      "2010–2016": [
        "1.6 GDI 135cv",
        "1.7 CRDi 115cv",
        "2.0 CRDi 136cv",
        "2.0 CRDi 184cv",
        "2.0 CRDi 184cv AWD",
        "2.0 GDI 163cv",
        "2.0 GDI 166cv",
        "2.0 T-GDI 184cv AWD",
        "2.7 V6 188cv"
      ],
      "2016–2021": [
        "1.4 T-GDI 140cv",
        "1.6 CRDi 115cv",
        "1.6 T-GDI 177cv",
        "1.7 CRDi 115cv",
        "2.0 CRDi 136cv",
        "2.0 CRDi 185cv",
        "2.0 CRDi 185cv AWD",
        "2.0 MPI 163cv",
        "2.0 T-GDI 185cv AWD"
      ],
      "2021–2024": [
        "1.6 CRDi 115cv MHEV",
        "1.6 CRDi 136cv MHEV",
        "1.6 CRDi 136cv MHEV AWD",
        "1.6 T-GDI 150cv MHEV",
        "1.6 T-GDI 180cv AWD MHEV",
        "1.6 T-GDI 230cv PHEV",
        "1.6 T-GDI 230cv PHEV AWD",
        "1.6 T-GDI 265cv FHEV",
        "1.6 T-GDI 265cv FHEV AWD"
      ]
    },
    "Stonic": {
      "2017–2021": [
        "1.0 T-GDI 100cv",
        "1.0 T-GDI 120cv",
        "1.4 MPI 100cv",
        "1.6 CRDi 115cv"
      ],
      "2021–2024": [
        "1.0 T-GDI 100cv MHEV",
        "1.0 T-GDI 120cv MHEV"
      ]
    },
    "XCeed": {
      "2019–2024": [
        "1.0 T-GDI 120cv",
        "1.4 T-GDI 140cv",
        "1.5 T-GDI 160cv",
        "1.4 PHEV 141cv",
        "1.6 CRDi 115cv",
        "1.6 CRDi 136cv"
      ]
    }
  },
  "Land Rover": {
    "Defender (L663)": {
      "2020–2024": [
        "P300 300cv",
        "P400 400cv",
        "P525 V8 525cv",
        "D200 200cv MHEV",
        "D240 240cv MHEV",
        "D300 300cv MHEV",
        "P400e PHEV 404cv"
      ]
    },
    "Discovery Sport (L550)": {
      "2015–2019": [
        "2.0 Si4 240cv",
        "2.0 eD4 150cv FWD",
        "2.0 TD4 150cv",
        "2.0 TD4 180cv"
      ],
      "2019–2024": [
        "2.0 P200 200cv MHEV",
        "2.0 P250 249cv MHEV",
        "1.5 P300e PHEV 309cv",
        "2.0 D150 150cv MHEV",
        "2.0 D200 204cv MHEV"
      ]
    },
    "Freelander 2": {
      "2006–2010": [
        "3.2 i6 233cv",
        "2.2 TD4 160cv"
      ],
      "2010–2014": [
        "2.0 Si4 240cv",
        "2.2 SD4 190cv",
        "2.2 TD4 150cv"
      ]
    },
    "Range Rover Evoque (L538/L551)": {
      "2011–2018": [
        "2.0 Si4 240cv 4WD",
        "2.0 Si4 280cv Dynamic",
        "2.0 eD4 150cv FWD",
        "2.0 TD4 150cv",
        "2.0 TD4 180cv"
      ],
      "2019–2024": [
        "P200 200cv MHEV",
        "P250 249cv MHEV",
        "P300e PHEV 309cv",
        "D150 150cv MHEV",
        "D200 204cv MHEV"
      ]
    },
    "Range Rover Sport (L320/L494)": {
      "2005–2013": [
        "4.4 V8 305cv",
        "5.0 V8 510cv SVR",
        "3.0 TDV6 245cv",
        "3.6 TDV8 270cv"
      ],
      "2013–2022": [
        "3.0 SDV6 249cv",
        "3.0 SDV6 306cv",
        "5.0 P525 SVR",
        "3.0 P400e PHEV 404cv"
      ]
    }
  },
  "Lexus": {
    "IS (XE20/XE30)": {
      "2005–2013": [
        "IS200 152cv",
        "IS220d 177cv",
        "IS250 208cv",
        "IS300 223cv"
      ],
      "2013–2021": [
        "IS200t 245cv",
        "IS250 208cv",
        "IS300h Hybrid 223cv",
        "IS300 256cv"
      ]
    },
    "NX (AZ10/AZ20)": {
      "2014–2021": [
        "NX200t 238cv",
        "NX300h Hybrid 197cv",
        "NX300 238cv"
      ],
      "2022–2024": [
        "NX250 204cv",
        "NX350 279cv",
        "NX350h Hybrid 244cv",
        "NX450h+ PHEV 309cv",
        "NX500h+ PHEV 309cv"
      ]
    },
    "RX (XU30/AL10/AL20)": {
      "2004–2009": [
        "RX300 204cv",
        "RX400h Hybrid 272cv"
      ],
      "2009–2015": [
        "RX350 277cv",
        "RX450h Hybrid 299cv"
      ],
      "2016–2022": [
        "RX200t 238cv",
        "RX300 238cv",
        "RX450h Hybrid 313cv",
        "RX450hL Hybrid 313cv"
      ]
    },
    "UX (ZA10)": {
      "2019–2024": [
        "UX200 169cv",
        "UX250h Hybrid 184cv",
        "UX300e BEV 204cv"
      ]
    }
  },
  "Maserati": {
    "Ghibli (M157)": {
      "2013–2021": [
        "3.0 V6 243cv",
        "3.0 V6 275cv",
        "3.0 V6 350cv S",
        "3.0 V6 Diesel 275cv",
        "Trofeo V8 580cv"
      ]
    },
    "Grecale": {
      "2022–2024": [
        "2.0 MHEV 300cv",
        "2.0 MHEV 330cv GT",
        "Folgore BEV 530cv"
      ]
    },
    "Levante": {
      "2016–2022": [
        "3.0 V6 275cv",
        "3.0 V6 350cv S",
        "3.0 V6 Diesel 275cv",
        "Trofeo V8 580cv",
        "GTS 530cv"
      ]
    }
  },
  "Mazda": {
    "CX-30": {
      "2019–2024": [
        "2.0 Skyactiv-G 122cv M Hybrid",
        "2.0 Skyactiv-G 150cv M Hybrid",
        "2.0 Skyactiv-X 186cv M Hybrid",
        "1.8 Skyactiv-D 116cv",
        "e-Skyactiv X 186cv M Hybrid"
      ]
    },
    "CX-5 (KE/KF)": {
      "2012–2017": [
        "2.0 Skyactiv-G 165cv",
        "2.2 Skyactiv-D 150cv",
        "2.2 Skyactiv-D 175cv AWD",
        "2.5 Skyactiv-G 192cv",
        "2.5 Skyactiv-G 192cv AWD"
      ],
      "2017–2024": [
        "2.0 Skyactiv-G 165cv",
        "2.2 Skyactiv-D 150cv",
        "2.2 Skyactiv-D 184cv AWD",
        "2.5 Skyactiv-G 194cv",
        "2.5 Skyactiv-G 194cv AWD",
        "2.5 Skyactiv-G 230cv Turbo AWD",
        "2.5 Turbo 231cv AWD"
      ]
    },
    "MX-5 (ND)": {
      "2015–2019": [
        "1.5 Skyactiv-G 131cv",
        "2.0 Skyactiv-G 160cv"
      ],
      "2019–2024": [
        "1.5 Skyactiv-G 132cv",
        "2.0 Skyactiv-G 184cv"
      ]
    },
    "Mazda2 (DJ)": {
      "2015–2019": [
        "1.5 Skyactiv-G 75cv",
        "1.5 Skyactiv-G 90cv",
        "1.5 Skyactiv-G 115cv",
        "1.5 Skyactiv-D 105cv"
      ],
      "2019–2024": [
        "1.5 Skyactiv-G 75cv",
        "1.5 Skyactiv-G 90cv",
        "M Hybrid 116cv"
      ]
    },
    "Mazda3 (BM/BP)": {
      "2013–2018": [
        "1.5 Skyactiv-G 100cv",
        "2.0 Skyactiv-G 120cv",
        "2.5 Skyactiv-G 185cv",
        "1.5 Skyactiv-D 105cv",
        "2.2 Skyactiv-D 150cv",
        "2.2 Skyactiv-D 175cv"
      ],
      "2019–2024": [
        "2.0 Skyactiv-G 122cv M Hybrid",
        "2.0 Skyactiv-G 150cv M Hybrid",
        "2.5 Skyactiv-G 186cv",
        "2.0 Skyactiv-X 180cv",
        "1.8 Skyactiv-D 116cv"
      ]
    }
  },
  "Mercedes-Benz": {
    "CLA (C117/C118)": {
      "2013–2019": [
        "CLA180 122cv",
        "CLA200 156cv",
        "CLA250 211cv",
        "CLA180d 109cv",
        "CLA200d 136cv",
        "CLA250 4Matic",
        "CLA45 AMG 360cv"
      ],
      "2019–2024": [
        "CLA180 136cv",
        "CLA200 163cv",
        "CLA250 224cv",
        "CLA180d 116cv",
        "CLA200d 150cv",
        "CLA35 AMG 306cv",
        "CLA45 AMG 387cv"
      ]
    },
    "Classe A (W168/W169/W176/W177)": {
      "1998–2004": [
        "1.4 82cv",
        "1.6 102cv",
        "1.7 CDI 95cv"
      ],
      "2004–2012": [
        "1.5 95cv",
        "2.0 Turbo 193cv",
        "2.0 CDI 109cv",
        "2.0 CDI 136cv"
      ],
      "2013–2018": [
        "A180 122cv",
        "A200 156cv",
        "A250 211cv",
        "A180 CDI 109cv",
        "A200 CDI 136cv",
        "A45 AMG 360cv"
      ],
      "2018–2024": [
        "A180 136cv",
        "A200 163cv",
        "A250 224cv",
        "A180d 116cv",
        "A200d 150cv",
        "A35 AMG 306cv",
        "A45 AMG 387cv"
      ]
    },
    "Classe B (W246/W247)": {
      "2011–2018": [
        "B180 122cv",
        "B200 156cv",
        "B250 211cv",
        "B180 CDI 109cv",
        "B200 CDI 136cv",
        "B250 4Matic"
      ],
      "2018–2024": [
        "B160 109cv",
        "B180 136cv",
        "B200 163cv",
        "B250 224cv",
        "B180d 116cv",
        "B200d 150cv",
        "B250e EQ Power 218cv"
      ]
    },
    "Classe C (W204/W205/W206)": {
      "2007–2014": [
        "C160 102cv",
        "C180 156cv",
        "C180 CDI 120cv",
        "C180 CGI 156cv",
        "C200 184cv",
        "C200 CDI 136cv",
        "C220 170cv",
        "C220 CDI 170cv",
        "C230 204cv",
        "C250 204cv",
        "C250 CDI 204cv",
        "C300 231cv",
        "C300 CDI 231cv",
        "C350 272cv",
        "C63 AMG 457cv"
      ],
      "2014–2021": [
        "C160 102cv",
        "C180 156cv",
        "C180d 116cv",
        "C200 184cv",
        "C200d 136cv",
        "C220d 170cv",
        "C220d 194cv",
        "C250 211cv",
        "C250d 204cv",
        "C300 245cv",
        "C300d 245cv",
        "C350e PHEV 279cv",
        "C43 AMG 390cv",
        "C63 AMG 476cv",
        "C63 S AMG 510cv"
      ],
      "2021–2024": [
        "AMG C43 408cv",
        "C180 170cv",
        "C200 204cv MHEV",
        "C200d 163cv MHEV",
        "C220d 197cv MHEV",
        "C300 258cv",
        "C300 258cv MHEV",
        "C300d 265cv MHEV",
        "C300e PHEV 313cv",
        "C400e PHEV 313cv",
        "C43 AMG 408cv",
        "C63 AMG e Performance 680cv PHEV"
      ]
    },
    "Classe E (W212/W213)": {
      "2009–2016": [
        "E200 184cv",
        "E250 204cv",
        "E350 292cv",
        "E200 CDI 136cv",
        "E220 CDI 170cv",
        "E250 CDI 204cv",
        "E63 AMG 557cv"
      ],
      "2016–2024": [
        "E200 184cv MHEV",
        "E300 258cv",
        "E220d 194cv MHEV",
        "E300d 265cv MHEV",
        "E350e PHEV 286cv",
        "E63 AMG 571cv"
      ]
    },
    "Classe S (W221/W222/W223)": {
      "2005–2013": [
        "S320 235cv",
        "S350 272cv",
        "S500 388cv",
        "S600 V12 517cv",
        "S320 CDI 235cv",
        "S420 CDI 320cv"
      ],
      "2014–2021": [
        "S350d 286cv",
        "S400d 340cv",
        "S500 455cv",
        "S63 AMG 612cv",
        "S500e PHEV 455cv"
      ],
      "2021–2024": [
        "S400d 330cv MHEV",
        "S580 503cv",
        "S680 V12 621cv",
        "S580e PHEV 510cv",
        "EQS 350 292cv"
      ]
    },
    "EQA / EQB": {
      "2021–2024": [
        "EQA250 190cv",
        "EQA250+ 190cv",
        "EQA300 4Matic 228cv",
        "EQB250 190cv",
        "EQB300 4Matic 228cv",
        "EQB350 4Matic 292cv"
      ]
    },
    "EQC (N293)": {
      "2019–2023": [
        "400 4Matic 408cv"
      ]
    },
    "GLA (X156/H247)": {
      "2014–2020": [
        "GLA180 122cv",
        "GLA200 156cv",
        "GLA250 211cv",
        "GLA220d 170cv",
        "GLA250 4Matic"
      ],
      "2020–2024": [
        "GLA180 136cv",
        "GLA200 163cv",
        "GLA250 224cv",
        "GLA180d 116cv",
        "GLA200d 150cv",
        "GLA250e PHEV 218cv"
      ]
    },
    "GLB (X247)": {
      "2019–2024": [
        "GLB180 136cv",
        "GLB200 163cv",
        "GLB250 224cv 4Matic",
        "GLB180d 116cv",
        "GLB200d 150cv",
        "GLB250d 4Matic",
        "AMG GLB35 306cv"
      ]
    },
    "GLC (X253/X254)": {
      "2015–2022": [
        "GLC200 184cv",
        "GLC300 245cv",
        "GLC220d 194cv",
        "GLC300d 245cv",
        "GLC350e PHEV 320cv",
        "AMG GLC43 390cv"
      ],
      "2022–2024": [
        "GLC300 258cv MHEV",
        "GLC400e PHEV 381cv",
        "GLC220d 197cv MHEV",
        "GLC300d 270cv MHEV",
        "AMG GLC43 421cv"
      ]
    },
    "GLE (W166/V167)": {
      "2015–2019": [
        "GLE350 258cv",
        "GLE450 367cv",
        "GLE43 AMG 390cv",
        "GLE250d 204cv",
        "GLE350d 258cv",
        "GLE500e PHEV 442cv"
      ],
      "2019–2024": [
        "GLE300d 245cv MHEV",
        "GLE350de PHEV 320cv",
        "GLE580 503cv",
        "GLE63 AMG S 612cv"
      ]
    },
    "GLS (X166/X167)": {
      "2012–2019": [
        "GLS350d 258cv",
        "GLS400 333cv",
        "GLS500 435cv",
        "GLS63 AMG 585cv"
      ],
      "2019–2024": [
        "GLS400d 330cv",
        "GLS450 367cv",
        "GLS580 489cv",
        "GLS63 AMG 612cv",
        "GLS600 Maybach 630cv"
      ]
    }
  },
  "Mini": {
    "Mini (R56/R58/F56)": {
      "2006–2013": [
        "One 98cv",
        "Cooper 122cv",
        "Cooper S 184cv",
        "JCW 211cv",
        "One D 75cv",
        "Cooper D 112cv"
      ],
      "2014–2024": [
        "One 102cv",
        "Cooper 136cv",
        "Cooper S 192cv",
        "JCW 231cv",
        "One D 95cv",
        "Cooper D 116cv",
        "Cooper SD 170cv"
      ]
    },
    "Mini Clubman (R55/F54)": {
      "2007–2015": [
        "One 98cv",
        "Cooper 122cv",
        "Cooper S 184cv",
        "Cooper D 110cv"
      ],
      "2015–2024": [
        "One 102cv",
        "Cooper 136cv",
        "Cooper S 192cv",
        "Cooper D 116cv",
        "Cooper SD 190cv",
        "JCW 306cv"
      ]
    },
    "Mini Countryman (R60/F60)": {
      "2010–2016": [
        "Cooper 122cv",
        "Cooper S 184cv ALL4",
        "Cooper D 112cv",
        "Cooper SD 143cv ALL4"
      ],
      "2017–2024": [
        "Cooper 136cv",
        "Cooper S 192cv ALL4",
        "Cooper SE PHEV 224cv",
        "Cooper D 116cv",
        "Cooper SD 190cv ALL4",
        "JCW 306cv"
      ]
    }
  },
  "Mitsubishi": {
    "ASX (GA)": {
      "2010–2016": [
        "1.6 117cv 2WD",
        "2.0 150cv 4WD",
        "1.8 DI-D 116cv 2WD",
        "2.2 Di-D 150cv 4WD"
      ],
      "2016–2022": [
        "1.6 117cv",
        "2.0 150cv 4WD",
        "2.0 MIVEC 150cv"
      ]
    },
    "Colt (Z30)": {
      "2004–2008": [
        "1.1 75cv",
        "1.3 95cv",
        "1.5 109cv",
        "1.5 DI-D 95cv"
      ],
      "2008–2012": [
        "1.1 75cv",
        "1.3 95cv",
        "Ralliart 150cv",
        "1.5 DI-D 95cv"
      ]
    },
    "Eclipse Cross": {
      "2017–2021": [
        "1.5 T 163cv",
        "1.5 T 163cv 4WD",
        "2.4 PHEV 188cv 4WD"
      ],
      "2021–2024": [
        "2.4 PHEV 188cv 4WD"
      ]
    },
    "L200 (KA/KB/KK)": {
      "2006–2015": [
        "2.5 DI-D 136cv",
        "2.5 DI-D 178cv 4WD"
      ],
      "2015–2024": [
        "2.4 DI-D 154cv 4WD",
        "2.4 DI-D 181cv 4WD",
        "2.2 DI-D 150cv 4WD"
      ]
    },
    "Outlander (CW/GF/GG)": {
      "2007–2012": [
        "2.0 150cv",
        "2.4 170cv 4WD",
        "2.0 DI-D 140cv"
      ],
      "2012–2021": [
        "2.0 150cv",
        "2.4 167cv 4WD",
        "2.0 PHEV 224cv 4WD",
        "2.2 DI-D 150cv"
      ]
    },
    "Pajero (V60/V80)": {
      "2000–2007": [
        "3.2 DI-D 160cv",
        "3.5 V6 197cv",
        "3.2 DI-D 190cv"
      ],
      "2007–2021": [
        "3.2 DI-D 190cv 4WD",
        "3.8 V6 250cv 4WD"
      ]
    },
    "Space Star (A0)": {
      "2013–2024": [
        "1.0 71cv",
        "1.2 80cv"
      ]
    }
  },
  "Nissan": {
    "Ariya": {
      "2022–2024": [
        "63kWh FWD 218cv",
        "87kWh FWD 242cv",
        "87kWh e-4ORCE AWD 306cv"
      ]
    },
    "Juke (F15/F16)": {
      "2010–2019": [
        "1.2 DIG-T 115cv",
        "1.5 dCi 110cv",
        "1.5 dCi 110cv FWD",
        "1.6 117cv",
        "1.6 117cv FWD",
        "1.6 DIG-T 190cv 4WD",
        "1.6 DIG-T 190cv Nismo RS"
      ],
      "2019–2024": [
        "1.0 DIG-T 114cv",
        "1.0 DIG-T 117cv",
        "1.0 DIG-T 117cv MHEV",
        "1.6 Hybrid 143cv"
      ]
    },
    "Leaf": {
      "2011–2017": [
        "24kWh 109cv",
        "30kWh 109cv"
      ],
      "2018–2024": [
        "40kWh 150cv",
        "62kWh e+ 217cv"
      ]
    },
    "Micra (K12/K13/K14)": {
      "2003–2010": [
        "1.0 65cv",
        "1.2 80cv",
        "1.4 88cv",
        "1.5 dCi 65cv",
        "1.5 dCi 86cv"
      ],
      "2010–2016": [
        "1.2 80cv",
        "1.2 DIG-S 98cv",
        "1.5 dCi 90cv"
      ],
      "2017–2024": [
        "1.0 IG-T 100cv",
        "1.0 IG-T 117cv",
        "0.9 IG-T 90cv",
        "1.5 dCi 90cv"
      ]
    },
    "Navara (D40/D23)": {
      "2005–2016": [
        "2.5 dCi 174cv 4WD",
        "4.0 V6 260cv 4WD"
      ],
      "2016–2024": [
        "2.3 dCi 160cv",
        "2.3 dCi 190cv 4WD",
        "2.5 dCi 188cv 4WD"
      ]
    },
    "Note (E11/E12)": {
      "2006–2013": [
        "1.4 88cv",
        "1.6 110cv",
        "1.5 dCi 86cv"
      ],
      "2013–2021": [
        "1.2 80cv",
        "1.2 DIG-S 98cv",
        "1.2 e-Power 109cv"
      ]
    },
    "Pulsar (C13)": {
      "2014–2018": [
        "1.2 DIG-T 115cv",
        "1.6 DIG-T 190cv Nismo",
        "1.5 dCi 110cv"
      ]
    },
    "Qashqai (J10/J11/J12)": {
      "2007–2013": [
        "1.5 dCi 106cv",
        "1.6 115cv",
        "1.6 dCi 130cv",
        "2.0 140cv",
        "2.0 dCi 150cv 4WD"
      ],
      "2014–2021": [
        "1.2 DIG-T 115cv",
        "1.3 DIG-T 140cv",
        "1.3 DIG-T 160cv",
        "1.5 dCi 110cv",
        "1.6 dCi 130cv",
        "1.6 dCi 130cv 4WD",
        "1.6 DIG-T 163cv",
        "1.7 Blue dCi 150cv",
        "1.7 Blue dCi 150cv 4WD",
        "2.0 dCi 177cv 4WD"
      ],
      "2021–2024": [
        "1.3 DIG-T 140cv MHEV",
        "1.3 DIG-T 158cv AWD MHEV",
        "1.3 DIG-T 158cv MHEV 4WD",
        "1.3 PHEV 190cv",
        "1.5 e-Power 190cv"
      ]
    },
    "Townstar / NV200": {
      "2010–2021": [
        "1.5 dCi 89cv",
        "1.5 dCi 110cv",
        "ë-NV200 109cv BEV"
      ],
      "2022–2024": [
        "1.3 DIG-T 130cv",
        "ë-Townstar 122cv BEV"
      ]
    },
    "X-Trail (T31/T32)": {
      "2007–2013": [
        "2.0 141cv",
        "2.5 172cv",
        "2.0 dCi 150cv"
      ],
      "2014–2021": [
        "1.6 DIG-T 163cv",
        "2.0 144cv",
        "1.6 dCi 130cv",
        "2.0 dCi 177cv 4WD"
      ],
      "2021–2024": [
        "1.5 e-Power 213cv FWD",
        "1.5 e-Power 4WD 250cv"
      ]
    }
  },
  "Opel": {
    "Adam": {
      "2013–2019": [
        "1.0 Turbo 90cv",
        "1.2 70cv",
        "1.4 87cv",
        "1.4 Turbo 100cv"
      ]
    },
    "Agila (A/B)": {
      "2000–2007": [
        "1.0 65cv",
        "1.2 80cv",
        "1.4 90cv",
        "1.3 CDTi 70cv"
      ]
    },
    "Astra (H/J/K/L)": {
      "2004–2009": [
        "1.3 CDTi 90cv",
        "1.4 90cv",
        "1.6 115cv",
        "1.7 CDTi 100cv",
        "1.8 140cv",
        "1.9 CDTi 120cv",
        "1.9 CDTi 150cv",
        "2.0 OPC 240cv",
        "2.0 Turbo OPC 240cv"
      ],
      "2010–2015": [
        "1.3 CDTi 95cv",
        "1.4 Turbo 100cv",
        "1.4 Turbo 120cv",
        "1.4 Turbo 140cv",
        "1.6 CDTi 110cv",
        "1.6 CDTi 136cv",
        "1.6 Turbo 180cv",
        "2.0 CDTi 165cv",
        "2.0 OPC 280cv"
      ],
      "2015–2021": [
        "1.0 CDTI 95cv",
        "1.0 Turbo 105cv",
        "1.2 Turbo 110cv",
        "1.4 Turbo 125cv",
        "1.4 Turbo 150cv",
        "1.5 CDTi 105cv",
        "1.6 CDTi 110cv",
        "1.6 CDTI 110cv",
        "1.6 CDTi 136cv",
        "1.6 Turbo 200cv OPC",
        "2.0 CDTI 165cv",
        "2.0 CDTi 165cv"
      ],
      "2021–2024": [
        "1.2 Turbo 110cv",
        "1.2 Turbo 130cv",
        "1.4 Turbo 145cv",
        "1.5 CDTi 105cv",
        "1.5 CDTi 130cv",
        "BEV 54kWh 156cv",
        "PHEV 225cv",
        "Plug-in Hybrid 180cv PHEV"
      ]
    },
    "Combo (D/E)": {
      "2011–2018": [
        "1.4 95cv",
        "1.6 CDTi 90cv",
        "1.6 CDTi 120cv"
      ],
      "2018–2024": [
        "1.2 PureTech 110cv",
        "1.5 BlueHDi 100cv",
        "1.5 BlueHDi 130cv",
        "ë-Combo 136cv BEV"
      ]
    },
    "Corsa (D/E/F)": {
      "2006–2014": [
        "1.0 60cv",
        "1.0 65cv",
        "1.0 CDTI 75cv",
        "1.2 80cv",
        "1.3 CDTI 75cv",
        "1.3 CDTI 90cv",
        "1.3 CDTI 95cv",
        "1.4 100cv",
        "1.4 90cv",
        "1.6 OPC 192cv",
        "1.6 Turbo OPC 192cv",
        "1.7 CDTI 100cv",
        "1.7 CDTI 125cv"
      ],
      "2014–2019": [
        "1.0 Turbo 115cv",
        "1.0 Turbo 90cv",
        "1.2 70cv",
        "1.3 CDTI 75cv",
        "1.3 CDTI 95cv",
        "1.4 100cv",
        "1.4 90cv",
        "1.4 GPL 90cv",
        "1.4 Turbo 100cv",
        "1.4 Turbo 150cv",
        "1.6 OPC 207cv",
        "1.6 Turbo OPC 207cv"
      ],
      "2019–2024": [
        "1.2 75cv",
        "1.2 T 100cv",
        "1.2 T 130cv",
        "1.5 CDTi 100cv",
        "BEV 136cv",
        "GS Line 1.2T 130cv",
        "Hybrid 100cv MHEV",
        "Hybrid 136cv MHEV"
      ]
    },
    "Crossland / Grandland": {
      "2017–2024": [
        "1.2 PureTech 110cv",
        "1.5 CDTi 120cv",
        "2.0 CDTI 177cv 4WD",
        "PHEV 300cv 4WD",
        "BEV 156cv"
      ],
      "2017–2021": [
        "1.2 Turbo 110cv",
        "1.2 Turbo 130cv",
        "1.5 CDTi 102cv",
        "1.5 CDTi 120cv",
        "1.6 Turbo 180cv",
        "Plug-in Hybrid 300cv 4WD"
      ]
    },
    "Insignia (A/B)": {
      "2008–2013": [
        "1.6 Turbo 180cv",
        "2.0 Turbo 220cv",
        "2.8 V6 Turbo 325cv OPC",
        "2.0 CDTI 130cv",
        "2.0 CDTI 160cv"
      ],
      "2013–2017": [
        "1.4 Turbo 140cv",
        "1.6 Turbo 170cv",
        "2.0 Turbo 220cv",
        "2.0 CDTI 110cv",
        "2.0 CDTI 163cv"
      ],
      "2017–2022": [
        "1.5 Turbo 140cv",
        "2.0 Turbo 260cv GS Line",
        "2.0 CDTI 110cv",
        "2.0 CDTI 170cv"
      ]
    },
    "Karl / Viva": {
      "2015–2019": [
        "1.0 75cv"
      ]
    },
    "Mokka (A/B)": {
      "2012–2016": [
        "1.4 Turbo 140cv",
        "1.6 115cv",
        "1.7 CDTI 130cv",
        "2.0 CDTI 130cv 4WD"
      ],
      "2016–2020": [
        "1.4 Turbo 140cv",
        "1.6 CDTI 136cv",
        "2.0 CDTI 130cv 4WD"
      ],
      "2020–2024": [
        "1.2 T 100cv",
        "1.2 T 130cv",
        "BEV 136cv"
      ]
    },
    "Zafira (A/B/C)": {
      "2005–2014": [
        "1.6 105cv",
        "1.8 140cv",
        "2.0 Turbo OPC 200cv",
        "1.7 CDTi 110cv",
        "2.0 CDTi 130cv"
      ],
      "2011–2019": [
        "1.4 Turbo 140cv",
        "1.6 CDTi 136cv",
        "2.0 CDTi 165cv",
        "1.4 Turbo 120cv"
      ]
    }
  },
  "Peugeot": {
    "106 / 107": {
      "1991–2004": [
        "1.0 50cv",
        "1.1 60cv",
        "1.4 75cv",
        "1.6 GTI 120cv",
        "1.5 D 54cv"
      ],
      "2005–2014": [
        "1.0 68cv",
        "1.4 75cv"
      ]
    },
    "2008 (A94/P24)": {
      "2013–2019": [
        "1.2 PureTech 82cv",
        "1.2 PureTech 110cv",
        "1.6 VTi 115cv",
        "1.6 BlueHDi 100cv"
      ],
      "2019–2024": [
        "1.2 PureTech 100cv",
        "1.2 PureTech 130cv",
        "1.5 BlueHDi 110cv",
        "BEV 136cv"
      ]
    },
    "206 (2A/C)": {
      "1998–2012": [
        "1.1 60cv",
        "1.4 75cv",
        "1.6 16V 110cv",
        "2.0 GTI 136cv",
        "1.4 HDi 70cv",
        "1.6 HDi 90cv",
        "1.9 D 70cv"
      ]
    },
    "207 (WA)": {
      "2006–2012": [
        "1.4 VTi 95cv",
        "1.6 VTi 120cv",
        "1.6 THP 150cv",
        "1.6 HDi 90cv",
        "1.6 HDi 110cv"
      ]
    },
    "208 (I/II)": {
      "2012–2019": [
        "1.0 VTi 68cv",
        "1.2 PureTech 110cv",
        "1.2 PureTech 82cv",
        "1.2 VTi 82cv",
        "1.4 HDi 68cv",
        "1.4 HDi 70cv",
        "1.4 VTi 95cv",
        "1.6 BlueHDi 100cv",
        "1.6 BlueHDi 120cv",
        "1.6 BlueHDi 75cv",
        "1.6 HDi 92cv",
        "1.6 THP 155cv GTi",
        "1.6 THP 208cv GTi"
      ],
      "2019–2024": [
        "1.2 PureTech 75cv",
        "1.2 PureTech 100cv",
        "1.2 PureTech 130cv",
        "1.5 BlueHDi 100cv",
        "BEV 136cv"
      ]
    },
    "3008 / 5008 (I/II)": {
      "2009–2016": [
        "1.6 THP 156cv",
        "2.0 THP 165cv",
        "1.6 BlueHDi 120cv",
        "2.0 BlueHDi 150cv",
        "2.0 BlueHDi 180cv"
      ],
      "2016–2024": [
        "1.2 PureTech 130cv",
        "1.6 THP 165cv",
        "1.6 PHEV4 300cv 4WD",
        "1.5 BlueHDi 130cv",
        "2.0 BlueHDi 180cv"
      ]
    },
    "308 (I/II/III)": {
      "2007–2013": [
        "1.4 VTi 95cv",
        "1.6 HDi 112cv",
        "1.6 HDi 90cv",
        "1.6 THP 125cv",
        "1.6 THP 150cv",
        "1.6 THP 175cv",
        "1.6 VTi 120cv",
        "2.0 143cv",
        "2.0 HDi 136cv"
      ],
      "2013–2021": [
        "1.0 PureTech 68cv",
        "1.2 PureTech 82cv",
        "1.2 PureTech 110cv",
        "1.2 PureTech 130cv",
        "1.6 THP 205cv GT",
        "1.6 THP 270cv GTi",
        "1.5 BlueHDi 100cv",
        "1.5 BlueHDi 130cv",
        "2.0 BlueHDi 150cv",
        "2.0 BlueHDi 180cv"
      ],
      "2021–2024": [
        "1.2 PureTech 100cv",
        "1.2 PureTech 110cv",
        "1.2 PureTech 130cv",
        "1.2 Hybrid 136cv MHEV",
        "1.6 PHEV 180cv",
        "1.6 PHEV 225cv",
        "e-308 156cv BEV",
        "1.5 BlueHDi 100cv",
        "1.5 BlueHDi 130cv"
      ]
    },
    "508 (I/II)": {
      "2011–2018": [
        "1.6 THP 156cv",
        "2.0 THP 200cv",
        "1.6 BlueHDi 120cv",
        "2.0 BlueHDi 150cv",
        "2.0 BlueHDi 180cv"
      ],
      "2018–2024": [
        "1.6 PureTech 180cv",
        "1.6 PureTech 225cv",
        "1.6 PHEV 225cv",
        "1.6 PHEV4 360cv AWD",
        "1.5 BlueHDi 130cv",
        "2.0 BlueHDi 180cv"
      ]
    },
    "Rifter / Traveller": {
      "2018–2024": [
        "1.2 PureTech 110cv",
        "1.5 BlueHDi 100cv",
        "1.5 BlueHDi 130cv",
        "ë-Rifter 136cv BEV"
      ]
    },
    "e-208 / e-2008": {
      "2019–2024": [
        "ë-208 136cv BEV",
        "ë-2008 136cv BEV"
      ]
    }
  },
  "Porsche": {
    "911 (996/997/991/992)": {
      "1998–2004": [
        "3.4 Carrera 300cv",
        "3.6 Carrera 4S 320cv",
        "3.6 Turbo 420cv"
      ],
      "2005–2011": [
        "3.6 Carrera 325cv",
        "3.8 Carrera S 385cv",
        "3.6 Turbo 480cv",
        "3.8 GT3 RS 450cv"
      ],
      "2012–2019": [
        "3.4 Carrera 350cv",
        "3.8 Carrera S 400cv",
        "3.0 Carrera 370cv",
        "3.0 Carrera S 420cv",
        "3.8 Turbo S 560cv"
      ],
      "2019–2024": [
        "3.0 Carrera 385cv",
        "3.0 Carrera S 450cv",
        "3.8 Turbo S 650cv",
        "4.0 GT3 510cv"
      ]
    },
    "Cayenne (9PA/92A/9YA)": {
      "2002–2010": [
        "3.2 V6 250cv",
        "4.5 V8 340cv",
        "4.8 Turbo S 550cv",
        "3.0 TDI 240cv",
        "4.2 TDI 385cv"
      ],
      "2010–2017": [
        "3.6 V6 300cv",
        "4.8 S 400cv",
        "4.8 Turbo S 570cv",
        "3.0 Diesel 245cv",
        "3.0 S E-Hybrid 416cv"
      ],
      "2018–2024": [
        "3.0 V6 340cv",
        "2.9 S 440cv",
        "4.0 Turbo 550cv",
        "3.0 E-Hybrid 462cv",
        "4.0 Turbo S E-Hybrid 680cv"
      ]
    },
    "Macan (95B/J1)": {
      "2014–2018": [
        "2.0 252cv",
        "3.0 S 340cv",
        "3.0 GTS 360cv",
        "3.0 Turbo 400cv",
        "2.2 TDI 150cv",
        "3.0 TDI 258cv"
      ],
      "2018–2024": [
        "2.0 245cv",
        "2.9 S 380cv",
        "2.9 GTS 440cv",
        "Macan EV 408cv BEV"
      ]
    },
    "Panamera (970/971)": {
      "2009–2016": [
        "3.6 V6 300cv",
        "4.8 S 400cv",
        "4.8 Turbo 500cv",
        "3.0 Diesel 250cv",
        "S E-Hybrid 416cv"
      ],
      "2016–2024": [
        "2.9 S 440cv",
        "4.0 Turbo 550cv",
        "2.9 4 E-Hybrid 462cv",
        "4.0 Turbo S E-Hybrid 700cv"
      ]
    }
  },
  "Renault": {
    "Arkana": {
      "2021–2024": [
        "1.3 TCe 140cv",
        "1.3 TCe 160cv",
        "E-Tech Hybrid 145cv"
      ]
    },
    "Austral": {
      "2022–2024": [
        "1.2 TCe 130cv MHEV",
        "1.3 TCe 160cv MHEV",
        "E-Tech Hybrid 200cv",
        "E-Tech 4x4 300cv"
      ]
    },
    "Captur (I/II)": {
      "2013–2019": [
        "0.9 TCe 90cv",
        "1.2 TCe 120cv",
        "1.5 dCi 90cv",
        "1.5 dCi 110cv"
      ],
      "2019–2024": [
        "1.0 TCe 100cv",
        "1.3 TCe 140cv",
        "1.3 TCe 155cv",
        "E-Tech PHEV 160cv",
        "E-Tech PHEV 145cv",
        "1.5 Blue dCi 115cv"
      ]
    },
    "Clio (III/IV/V)": {
      "2005–2012": [
        "1.2 75cv",
        "1.2 TCe 100cv",
        "1.4 98cv",
        "1.5 dCi 106cv",
        "1.5 dCi 75cv",
        "1.5 dCi 86cv",
        "1.6 128cv",
        "2.0 RS 197cv",
        "2.0 RS 200cv"
      ],
      "2012–2019": [
        "0.9 TCe 75cv",
        "0.9 TCe 90cv",
        "1.2 TCe 120cv",
        "1.5 dCi 110cv",
        "1.5 dCi 75cv",
        "1.5 dCi 90cv",
        "1.6 RS 200cv",
        "1.6 RS 220cv Trophy",
        "1.6 RS Trophy 220cv"
      ],
      "2019–2024": [
        "1.0 SCe 65cv",
        "1.0 TCe 100cv",
        "1.0 TCe 90cv",
        "1.3 TCe 130cv",
        "1.5 Blue dCi 100cv",
        "1.5 Blue dCi 115cv",
        "1.5 Blue dCi 85cv",
        "E-Tech Hybrid 140cv",
        "E-Tech Hybrid 145cv"
      ]
    },
    "Espace (V)": {
      "2023–2024": [
        "1.2 TCe 130cv MHEV",
        "E-Tech Hybrid 200cv",
        "E-Tech 4x4 300cv"
      ]
    },
    "Kadjar": {
      "2015–2018": [
        "1.2 TCe 130cv",
        "1.6 TCe 163cv",
        "1.5 dCi 110cv",
        "1.6 dCi 130cv 4WD"
      ],
      "2018–2022": [
        "1.3 TCe 140cv",
        "1.3 TCe 160cv",
        "1.5 Blue dCi 115cv",
        "1.7 Blue dCi 150cv 4WD"
      ]
    },
    "Kangoo (I/II/III)": {
      "2009–2021": [
        "1.2 TCe 115cv",
        "1.5 dCi 90cv",
        "1.5 dCi 110cv",
        "ë-Kangoo BEV 60cv"
      ],
      "2021–2024": [
        "1.3 TCe 130cv",
        "1.5 Blue dCi 95cv",
        "ë-Kangoo E-Tech 90cv BEV"
      ]
    },
    "Mégane (III/IV)": {
      "2008–2016": [
        "1.2 TCe 115cv",
        "1.2 TCe 132cv",
        "1.4 TCe 130cv",
        "1.5 dCi 110cv",
        "1.5 dCi 90cv",
        "1.6 115cv",
        "1.6 dCi 130cv",
        "2.0 140cv",
        "2.0 dCi 160cv",
        "2.0 dCi 165cv",
        "2.0 Turbo 265cv RS",
        "2.0 Turbo RS 265cv"
      ],
      "2016–2022": [
        "1.2 TCe 100cv",
        "1.2 TCe 130cv",
        "1.3 TCe 115cv",
        "1.3 TCe 140cv",
        "1.5 Blue dCi 115cv",
        "1.5 Blue dCi 95cv",
        "1.6 dCi 165cv",
        "1.6 TCe 205cv RS",
        "1.7 Blue dCi 120cv",
        "1.7 Blue dCi 150cv",
        "1.8 TCe 280cv RS",
        "1.8 TCe RS 280cv Trophy"
      ]
    },
    "Scenic (III/IV)": {
      "2009–2016": [
        "1.4 TCe 130cv",
        "1.6 130cv",
        "2.0 Turbo 220cv",
        "1.5 dCi 110cv",
        "1.6 dCi 130cv",
        "2.0 dCi 150cv"
      ],
      "2016–2023": [
        "1.3 TCe 140cv",
        "1.7 Blue dCi 120cv",
        "1.7 Blue dCi 150cv"
      ]
    },
    "Talisman": {
      "2016–2022": [
        "1.3 TCe 140cv",
        "1.6 TCe 200cv",
        "2.0 dCi 130cv",
        "2.0 dCi 160cv"
      ]
    },
    "Twingo (I/II/III)": {
      "1993–2007": [
        "1.2 58cv",
        "1.6 16V 110cv RS",
        "1.5 dCi 65cv"
      ],
      "2007–2014": [
        "1.2 75cv",
        "1.2 TCe 100cv GT",
        "1.5 dCi 75cv"
      ],
      "2014–2022": [
        "1.0 70cv",
        "0.9 TCe 90cv",
        "Electric 81cv BEV"
      ]
    },
    "Zoe": {
      "2013–2019": [
        "R240 88cv 22kWh",
        "R400 88cv 41kWh",
        "Q90 92cv"
      ],
      "2019–2024": [
        "R135 135cv 52kWh",
        "R110 108cv 52kWh"
      ]
    }
  },
  "SEAT": {
    "Arona": {
      "2017–2021": [
        "1.0 TSI 95cv",
        "1.0 TSI 115cv",
        "1.5 TSI 150cv",
        "1.6 TDI 95cv"
      ],
      "2021–2024": [
        "1.0 TSI 95cv",
        "1.0 TSI 110cv",
        "1.5 TSI 150cv e-Hybrid",
        "1.0 TDI 80cv"
      ]
    },
    "Ateca": {
      "2016–2020": [
        "1.0 TSI 115cv",
        "1.4 TSI 150cv",
        "1.8 TSI 180cv",
        "2.0 TSI 300cv Cupra",
        "1.6 TDI 115cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv 4Drive"
      ],
      "2020–2024": [
        "1.0 TSI 110cv",
        "1.5 TSI 150cv",
        "2.0 TSI 300cv Cupra",
        "1.5 TSI 150cv DSG",
        "2.0 TDI 150cv"
      ]
    },
    "Ibiza (IV/V)": {
      "2008–2017": [
        "1.0 60cv",
        "1.2 70cv",
        "1.2 TDI 75cv",
        "1.2 TSI 86cv",
        "1.2 TSI 90cv",
        "1.4 85cv",
        "1.4 TDI 70cv",
        "1.4 TSI 150cv SC",
        "1.4 TSI 180cv Cupra",
        "1.6 105cv",
        "1.6 TDI 105cv",
        "1.6 TDI 90cv"
      ],
      "2017–2024": [
        "1.0 MPI 65cv",
        "1.0 TSI 95cv",
        "1.0 TSI 115cv",
        "FR 1.5 TSI 150cv",
        "1.6 TDI 95cv"
      ]
    },
    "Leon (II/III/IV)": {
      "2005–2012": [
        "1.4 TSI 125cv",
        "1.8 TSI 160cv",
        "2.0 TSI Cupra 210cv",
        "2.0 TDI 140cv",
        "2.0 TDI 170cv"
      ],
      "2012–2020": [
        "1.2 TSI 105cv",
        "1.4 TSI 125cv",
        "1.8 TSI 180cv",
        "2.0 Cupra 290cv",
        "1.6 TDI 105cv",
        "2.0 TDI 150cv",
        "2.0 TDI 184cv"
      ],
      "2020–2024": [
        "1.0 eTSI 90cv",
        "1.0 eTSI 110cv",
        "1.5 TSI 130cv",
        "1.5 eTSI 150cv",
        "1.4 eHybrid 204cv PHEV",
        "1.6 TDI 115cv",
        "2.0 TDI 150cv"
      ]
    },
    "Mii (AA)": {
      "2011–2021": [
        "1.0 60cv",
        "1.0 75cv",
        "Mii electric BEV 83cv"
      ]
    },
    "Tarraco": {
      "2018–2024": [
        "1.5 TSI 150cv",
        "2.0 TSI 190cv 4Drive",
        "1.5 TSI eHybrid 245cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv 4Drive"
      ]
    },
    "Toledo (III/IV)": {
      "2005–2012": [
        "1.4 85cv",
        "1.6 102cv",
        "2.0 TDI 140cv"
      ],
      "2013–2019": [
        "1.2 TSI 86cv",
        "1.4 TSI 122cv",
        "1.6 TDI 105cv"
      ]
    }
  },
  "Skoda": {
    "Citigo": {
      "2012–2020": [
        "1.0 MPI 60cv",
        "1.0 MPI 75cv",
        "Citigo-e iV BEV 83cv"
      ]
    },
    "Enyaq (iV)": {
      "2021–2024": [
        "iV 60 179cv RWD",
        "iV 80 204cv RWD",
        "iV 80x AWD 265cv",
        "RS 299cv AWD",
        "Coupé RS 299cv AWD"
      ]
    },
    "Fabia (II/III/IV)": {
      "2007–2014": [
        "1.2 HTP 70cv",
        "1.4 85cv",
        "1.2 TSI 105cv",
        "1.6 TDI 75cv",
        "1.6 TDI 105cv"
      ],
      "2015–2021": [
        "1.0 MPI 60cv",
        "1.0 TSI 95cv",
        "1.2 TSI 90cv",
        "1.4 TSI 150cv",
        "1.4 TDI 90cv"
      ],
      "2021–2024": [
        "1.0 MPI 65cv",
        "1.0 TSI 115cv",
        "1.0 TSI 95cv",
        "1.4 TSI 150cv Monte Carlo",
        "1.5 TSI 150cv",
        "1.6 TDI 95cv"
      ],
      "2007–2015": [
        "1.0 60cv",
        "1.2 HTP 70cv",
        "1.4 85cv",
        "1.4 TDI 80cv",
        "1.4 TSI 180cv vRS",
        "1.6 105cv",
        "1.6 TDI 90cv"
      ],
      "2015–2022": [
        "1.0 MPI 60cv",
        "1.0 MPI 75cv",
        "1.0 TSI 110cv",
        "1.0 TSI 95cv",
        "1.4 TDI 90cv",
        "1.5 TSI 150cv",
        "1.6 TDI 90cv"
      ]
    },
    "Kamiq": {
      "2019–2024": [
        "1.0 TSI 110cv",
        "1.0 TSI 95cv",
        "1.5 TSI 150cv",
        "1.6 TDI 115cv",
        "1.6 TDI 95cv",
        "2.0 TDI 115cv"
      ]
    },
    "Karoq": {
      "2017–2024": [
        "1.0 TSI 115cv",
        "1.5 TSI 150cv",
        "2.0 TSI 190cv 4x4",
        "1.6 TDI 115cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv 4x4"
      ]
    },
    "Kodiaq": {
      "2017–2021": [
        "1.4 TSI 125cv",
        "2.0 TSI 180cv",
        "2.0 TSI 240cv SportLine",
        "1.5 TSI 150cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv 4x4",
        "2.0 TDI 200cv"
      ],
      "2021–2024": [
        "1.5 TSI 150cv",
        "2.0 TSI 190cv",
        "2.0 TDI 150cv",
        "2.0 TDI 200cv 4x4",
        "1.4 iV PHEV 245cv"
      ]
    },
    "Octavia (II/III/IV)": {
      "2004–2013": [
        "1.2 TSI 86cv",
        "1.4 TSI 122cv",
        "1.4 TSI g-tec 110cv metano",
        "1.6 MPI 102cv",
        "1.6 TDI 105cv",
        "1.6 TDI 90cv",
        "1.8 TSI 160cv",
        "1.9 TDI 105cv",
        "2.0 TDI 110cv",
        "2.0 TDI 140cv",
        "2.0 TDI 170cv",
        "2.0 TDI 177cv",
        "2.0 TSI RS 200cv",
        "2.0 TSI RS 230cv"
      ],
      "2013–2020": [
        "1.0 TSI 115cv",
        "1.2 TSI 105cv",
        "1.2 TSI 86cv",
        "1.4 g-tec 110cv metano",
        "1.4 TSI 150cv",
        "1.5 g-tec 130cv metano",
        "1.5 TSI 150cv",
        "1.6 TDI 105cv",
        "1.6 TDI 115cv",
        "1.6 TDI 116cv",
        "1.6 TDI 90cv",
        "2.0 TDI 115cv",
        "2.0 TDI 150cv",
        "2.0 TDI 184cv",
        "2.0 TSI RS 230cv",
        "2.0 TSI RS 245cv"
      ],
      "2020–2024": [
        "1.0 TSI 110cv",
        "1.4 iV PHEV 245cv",
        "1.5 g-tec 130cv metano",
        "1.5 TSI 150cv",
        "2.0 TDI 115cv",
        "2.0 TDI 150cv",
        "2.0 TDI 200cv",
        "2.0 TSI RS 245cv"
      ]
    },
    "Rapid (NH3)": {
      "2012–2019": [
        "1.2 TSI 86cv",
        "1.4 TSI 122cv",
        "1.6 MPI 85cv",
        "1.4 TDI 90cv",
        "1.6 TDI 90cv"
      ]
    },
    "Roomster": {
      "2006–2015": [
        "1.2 70cv",
        "1.4 85cv",
        "1.6 105cv",
        "1.4 TDI 80cv",
        "1.6 TDI 90cv"
      ]
    },
    "Scala": {
      "2019–2024": [
        "1.0 TSI 95cv",
        "1.0 TSI 110cv",
        "1.5 TSI 150cv",
        "2.0 TDI 115cv",
        "2.0 TDI 150cv"
      ]
    },
    "Superb (II/III)": {
      "2008–2015": [
        "1.4 TSI 125cv",
        "1.8 TSI 160cv",
        "2.0 TSI 200cv",
        "1.9 TDI 105cv",
        "2.0 TDI 140cv",
        "2.0 TDI 170cv"
      ],
      "2015–2024": [
        "1.4 TSI 150cv",
        "1.8 TSI 180cv",
        "2.0 TSI 272cv",
        "1.5 TSI 150cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv",
        "1.4 iV PHEV 218cv"
      ]
    },
    "Yeti": {
      "2009–2017": [
        "1.2 TSI 105cv",
        "1.4 TSI 122cv",
        "2.0 TSI 200cv",
        "1.6 TDI 105cv",
        "2.0 TDI 110cv",
        "2.0 TDI 140cv"
      ]
    }
  },
  "Subaru": {
    "Forester (SG/SH/SJ/SK)": {
      "2002–2008": [
        "2.0 128cv",
        "2.5 XT Turbo 230cv",
        "2.0D 108cv"
      ],
      "2008–2012": [
        "2.0 X 150cv",
        "2.5 XT 230cv",
        "2.0D 147cv"
      ],
      "2013–2018": [
        "2.0i 150cv",
        "2.0XT 280cv",
        "2.0D 147cv"
      ],
      "2019–2024": [
        "2.0i-L 156cv e-Boxer MHEV",
        "2.0i 150cv"
      ]
    },
    "Impreza (GD/GH/GP/GT)": {
      "2001–2007": [
        "1.5 100cv",
        "2.0 125cv",
        "2.0 WRX 225cv",
        "2.5 WRX STI 265cv",
        "2.0 D 150cv"
      ],
      "2007–2011": [
        "1.5 R 107cv",
        "2.0 R 150cv",
        "2.5 WRX 230cv",
        "2.5 WRX STI 300cv"
      ],
      "2011–2016": [
        "1.6i 114cv",
        "2.0i 150cv",
        "2.0 WRX STI 280cv"
      ],
      "2016–2024": [
        "1.6i 114cv",
        "2.0i-L 156cv",
        "2.0GT 182cv e-Boxer"
      ]
    },
    "Outback (BP/BR/BS/BT)": {
      "2003–2009": [
        "2.5i 165cv",
        "3.0R 245cv",
        "2.0D 150cv"
      ],
      "2009–2014": [
        "2.5i 167cv",
        "3.6R 260cv",
        "2.0D 150cv"
      ],
      "2014–2021": [
        "2.5i 175cv",
        "3.6R 260cv",
        "2.0D 150cv"
      ],
      "2021–2024": [
        "2.5i 175cv",
        "2.4T 264cv Wilderness",
        "2.0e-Boxer 150cv"
      ]
    },
    "XV / Crosstrek": {
      "2012–2017": [
        "2.0i 150cv",
        "2.0D 147cv"
      ],
      "2017–2024": [
        "2.0i 156cv",
        "2.0i e-Boxer 150cv MHEV",
        "2.5i 182cv 2024"
      ],
      "2012–2018": [
        "1.6i 114cv AWD",
        "2.0D 143cv AWD",
        "2.0i 150cv AWD"
      ],
      "2018–2024": [
        "1.6i 114cv AWD",
        "2.0i 150cv AWD",
        "2.0i 156cv e-Boxer Hybrid AWD"
      ]
    }
  },
  "Suzuki": {
    "Jimny (JB74)": {
      "2018–2024": [
        "1.5 102cv 4WD"
      ]
    },
    "SX4 S-Cross (JY/EY)": {
      "2013–2021": [
        "1.6 120cv",
        "1.4 BoosterJet 140cv AllGrip",
        "1.6 DDiS 120cv"
      ],
      "2021–2024": [
        "1.4 BoosterJet 129cv MHEV",
        "1.4 BoosterJet 140cv AllGrip MHEV"
      ]
    },
    "Swift (MZ/SZ/AZ)": {
      "2005–2011": [
        "1.3 92cv",
        "1.6 Sport 125cv",
        "1.3 DDiS 70cv"
      ],
      "2011–2017": [
        "1.2 94cv",
        "1.4 Boosterjet 140cv Sport",
        "1.3 DDiS 75cv"
      ],
      "2017–2024": [
        "1.2 Dualjet 90cv Hybrid",
        "1.0 BoosterJet 111cv",
        "1.4 BoosterJet 140cv Sport"
      ]
    },
    "Vitara (LY)": {
      "2015–2018": [
        "1.6 120cv 4WD",
        "1.4 BoosterJet 140cv AllGrip",
        "1.6 DDiS 120cv"
      ],
      "2018–2024": [
        "1.4 BoosterJet 129cv MHEV",
        "1.5 Hybrid 102cv",
        "1.4 BoosterJet 140cv AllGrip"
      ]
    }
  },
  "Tesla": {
    "Model 3": {
      "2019–2022": [
        "Standard Range 283cv RWD",
        "Long Range AWD 499cv",
        "Performance AWD 513cv"
      ],
      "2023–2024": [
        "RWD 283cv",
        "Long Range AWD 358cv",
        "Performance AWD 460cv"
      ]
    },
    "Model S": {
      "2013–2021": [
        "75D 328cv",
        "100D 417cv",
        "P100D 613cv Ludicrous",
        "Plaid 1020cv"
      ],
      "2021–2024": [
        "Long Range AWD 670cv",
        "Plaid 1020cv"
      ]
    },
    "Model X": {
      "2016–2021": [
        "100D 417cv",
        "P100D 613cv Ludicrous"
      ],
      "2021–2024": [
        "Long Range AWD 670cv",
        "Plaid 1020cv"
      ]
    },
    "Model Y": {
      "2021–2023": [
        "Standard Range 283cv RWD",
        "Long Range AWD 514cv",
        "Performance AWD 534cv"
      ],
      "2024–2024": [
        "RWD 283cv",
        "Long Range AWD 514cv",
        "Performance AWD 574cv",
        "Juniper RWD 340cv"
      ]
    }
  },
  "Toyota": {
    "Auris (E150/E180)": {
      "2006–2012": [
        "1.3 100cv",
        "1.6 132cv",
        "2.0 D-4D 126cv",
        "1.8 Hybrid 136cv"
      ],
      "2013–2019": [
        "1.2T 116cv",
        "1.4 D-4D 90cv",
        "1.6 132cv",
        "1.8 Hybrid 136cv",
        "2.0 D-4D 143cv"
      ]
    },
    "Aygo (AB10/AB40)": {
      "2005–2014": [
        "1.0 VVT-i 68cv",
        "1.4 D-4D 54cv"
      ],
      "2014–2022": [
        "1.0 VVT-i 72cv"
      ],
      "2022–2024": [
        "1.0 VVT-i 72cv Aygo X"
      ]
    },
    "C-HR": {
      "2016–2020": [
        "1.2T 116cv",
        "1.8 Hybrid 122cv 2WD",
        "2.0 Hybrid 184cv 4WD"
      ],
      "2020–2024": [
        "1.8 Hybrid 122cv",
        "2.0 Hybrid 184cv",
        "2.0 PHEV 224cv"
      ],
      "2016–2024": [
        "1.2 Turbo 116cv",
        "1.8 Hybrid 122cv",
        "2.0 Hybrid 184cv",
        "2.0 PHEV 224cv"
      ]
    },
    "Camry (XV70)": {
      "2018–2024": [
        "2.5 Hybrid 218cv",
        "2.5 VVT-iW 201cv"
      ]
    },
    "Corolla (E120/E140/E170/E210)": {
      "2002–2006": [
        "1.4 VVT-i 97cv",
        "1.6 VVT-i 110cv",
        "1.8 VVT-i 136cv",
        "2.0 D-4D 116cv"
      ],
      "2006–2013": [
        "1.4 VVT-i 97cv",
        "1.6 VVT-i 132cv",
        "2.0 D-4D 126cv"
      ],
      "2013–2018": [
        "1.33 99cv",
        "1.6 132cv",
        "2.0 D-4D 143cv"
      ],
      "2019–2024": [
        "1.2T 116cv",
        "1.8 Hybrid 122cv",
        "2.0 Hybrid 184cv"
      ]
    },
    "GR Yaris": {
      "2020–2024": [
        "1.6 T 261cv AWD",
        "Circuit 268cv AWD"
      ]
    },
    "Hilux (AN120/AN220)": {
      "2005–2016": [
        "2.5 D-4D 144cv",
        "3.0 D-4D 171cv 4WD"
      ],
      "2016–2024": [
        "2.4 D-4D 150cv",
        "2.8 D-4D 204cv 4WD",
        "2.8 D-4D Hybrid 224cv 4WD"
      ]
    },
    "Land Cruiser (J200/J300)": {
      "2007–2021": [
        "4.0 V6 275cv",
        "4.5 V8 Diesel 286cv",
        "4.6 V8 Benzina 310cv"
      ],
      "2021–2024": [
        "3.3 V6 Diesel 309cv",
        "3.5 V6 Twin-Turbo 415cv GR Sport"
      ]
    },
    "Proace / Proace City": {
      "2016–2024": [
        "1.6 BlueHDi 95cv",
        "2.0 BlueHDi 120cv",
        "2.0 BlueHDi 150cv",
        "Proace City Electric 136cv BEV"
      ]
    },
    "RAV4 (XA30/XA40/XA50)": {
      "2006–2012": [
        "2.0 VVT-i 158cv",
        "2.2 D-4D 136cv",
        "2.2 D-4D 177cv 4WD"
      ],
      "2013–2018": [
        "2.0 VVT-i 151cv",
        "2.5 Hybrid 197cv",
        "2.0 D-4D 124cv",
        "2.5 D-4D 177cv 4WD"
      ],
      "2019–2024": [
        "2.0 175cv",
        "2.0 D-4D 143cv",
        "2.0 D-4D 150cv",
        "2.0 VVT-i 173cv",
        "2.5 Hybrid 218cv",
        "2.5 PHEV 306cv",
        "2.5 Plug-in Hybrid 306cv AWD-i"
      ],
      "2006–2013": [
        "2.0 VVT-i 158cv",
        "2.2 D-4D 136cv",
        "2.2 D-CAT 177cv",
        "3.5 V6 273cv"
      ],
      "2013–2019": [
        "2.0 D-4D 124cv",
        "2.0 VVT-i 151cv",
        "2.2 D-4D 150cv",
        "2.5 Hybrid 197cv"
      ]
    },
    "Verso": {
      "2009–2018": [
        "1.6 132cv",
        "1.8 147cv",
        "2.0 D-4D 126cv",
        "2.2 D-4D 150cv",
        "1.8 Hybrid 136cv"
      ]
    },
    "Yaris (XP10/XP13/XP210)": {
      "1999–2005": [
        "1.0 VVT-i 68cv",
        "1.3 VVT-i 87cv",
        "1.4 D-4D 75cv"
      ],
      "2005–2011": [
        "1.0 Dual VVT-i 68cv",
        "1.0 VVT-i 69cv",
        "1.3 VVT-i 86cv",
        "1.33 VVT-i 101cv",
        "1.4 D-4D 90cv",
        "1.5 VVT-i 106cv"
      ],
      "2011–2020": [
        "1.0 69cv",
        "1.3 99cv",
        "1.33 99cv",
        "1.4 D-4D 90cv",
        "1.5 Hybrid 100cv"
      ],
      "2020–2024": [
        "1.5 GR GRMN 272cv",
        "1.5 GR Sport 261cv",
        "1.5 Hybrid 116cv",
        "1.5 Hybrid 130cv",
        "Cross 1.5 Hybrid 116cv",
        "GR 1.6 T 261cv",
        "GR GRMN 272cv"
      ]
    },
    "bZ4X": {
      "2022–2024": [
        "FWD 204cv 71.4kWh",
        "AWD 218cv 71.4kWh"
      ]
    }
  },
  "Volkswagen": {
    "Arteon (3H7)": {
      "2017–2021": [
        "1.5 TSI 150cv",
        "2.0 TSI 190cv",
        "2.0 TSI 272cv R",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv"
      ],
      "2021–2024": [
        "1.4 eHybrid 218cv",
        "2.0 TSI 190cv",
        "2.0 TSI 320cv R",
        "2.0 TDI 150cv"
      ]
    },
    "Golf (VI/VII/VIII)": {
      "2008–2012": [
        "1.2 TSI 105cv",
        "1.2 TSI 85cv",
        "1.4 TSI 122cv",
        "1.4 TSI 160cv",
        "1.4 TSI 160cv ACT",
        "1.6 TDI 105cv",
        "1.6 TDI 90cv",
        "2.0 GTI 210cv",
        "2.0 GTI 235cv Performance",
        "2.0 R 256cv",
        "2.0 TDI 110cv",
        "2.0 TDI 140cv",
        "2.0 TDI GTD 170cv"
      ],
      "2013–2020": [
        "1.0 TSI 115cv",
        "1.0 TSI 86cv",
        "1.2 TSI 110cv",
        "1.2 TSI 85cv",
        "1.4 GTE PHEV 204cv",
        "1.4 TGI 110cv metano",
        "1.4 TSI 125cv",
        "1.4 TSI 150cv ACT",
        "1.5 TSI 130cv EVO",
        "1.5 TSI 150cv EVO",
        "1.5 TSI EVO 150cv",
        "1.6 TDI 105cv",
        "1.6 TDI 110cv",
        "1.6 TDI 90cv",
        "1.6 TDI BlueMotion 110cv",
        "2.0 GTI 220cv",
        "2.0 GTI 230cv",
        "2.0 GTI 245cv",
        "2.0 GTI 265cv Clubsport",
        "2.0 R 300cv",
        "2.0 R 310cv",
        "2.0 TDI 150cv",
        "2.0 TDI 184cv",
        "2.0 TDI 184cv GTD",
        "2.0 TDI GTD 184cv",
        "e-Golf 115cv",
        "e-Golf 136cv",
        "GTE PHEV 204cv"
      ],
      "2020–2024": [
        "1.0 eTSI 110cv MHEV",
        "1.0 eTSI 90cv MHEV",
        "1.4 GTE PHEV 245cv",
        "1.5 eTSI 130cv MHEV",
        "1.5 eTSI 150cv MHEV",
        "1.5 TGI 130cv metano",
        "2.0 GTI 245cv",
        "2.0 GTI Clubsport 300cv",
        "2.0 R 320cv",
        "2.0 R 333cv",
        "2.0 TDI 115cv",
        "2.0 TDI 150cv",
        "eHybrid PHEV 245cv"
      ]
    },
    "ID.4 / ID.3": {
      "2020–2024": [
        "ID.3 Pure 150cv 45kWh",
        "ID.3 Pro 204cv 58kWh",
        "ID.3 Pro S 204cv 77kWh",
        "ID.4 Pure RWD 170cv",
        "ID.4 Pro 204cv 77kWh",
        "ID.4 GTX AWD 299cv 77kWh"
      ]
    },
    "ID.5 / ID.7": {
      "2022–2024": [
        "ID.5 Pro 204cv 77kWh",
        "ID.5 Pro 4Motion 299cv",
        "ID.5 GTX 299cv",
        "ID.7 Pro 286cv 77kWh",
        "ID.7 GTX 340cv AWD"
      ]
    },
    "Passat (B7/B8)": {
      "2011–2014": [
        "1.4 TSI 122cv",
        "1.4 TSI 150cv",
        "1.6 TDI 105cv",
        "1.8 TSI 160cv",
        "2.0 TDI 140cv",
        "2.0 TDI 170cv",
        "2.0 TDI 177cv",
        "2.0 TSI 200cv",
        "2.0 TSI 220cv"
      ],
      "2015–2019": [
        "1.4 GTE PHEV 218cv",
        "1.4 TSI 125cv",
        "1.5 TSI 150cv EVO",
        "1.6 TDI 120cv",
        "1.8 TSI 180cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv",
        "2.0 TDI 240cv BiTurbo",
        "2.0 TSI 220cv",
        "2.0 TSI 272cv",
        "GTE PHEV 218cv"
      ],
      "2019–2024": [
        "1.5 TSI 150cv",
        "2.0 TSI 272cv",
        "1.6 TDI 120cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv"
      ]
    },
    "Polo (5/6)": {
      "2009–2017": [
        "1.0 60cv",
        "1.0 75cv",
        "1.2 60cv",
        "1.2 TDI 75cv",
        "1.2 TSI 105cv",
        "1.2 TSI 90cv",
        "1.4 TDI 90cv",
        "1.4 TSI 150cv",
        "1.4 TSI 180cv GTI"
      ],
      "2017–2024": [
        "1.0 MPI 65cv",
        "1.0 TGI 90cv metano",
        "1.0 TSI 110cv",
        "1.0 TSI 115cv",
        "1.0 TSI 80cv",
        "1.0 TSI 95cv",
        "1.5 TSI 150cv",
        "1.6 TDI 80cv",
        "1.6 TDI 95cv",
        "2.0 GTI 200cv",
        "2.0 GTI 207cv"
      ]
    },
    "Sharan (7N)": {
      "2010–2022": [
        "1.4 TSI 150cv",
        "2.0 TSI 200cv",
        "1.9 TDI 115cv",
        "2.0 TDI 150cv",
        "2.0 TDI 184cv 4Motion"
      ]
    },
    "T-Roc": {
      "2017–2021": [
        "1.0 TSI 115cv",
        "1.5 TSI 150cv",
        "2.0 TSI 190cv R-Line",
        "2.0 R 300cv",
        "1.6 TDI 115cv",
        "2.0 TDI 150cv"
      ],
      "2021–2024": [
        "1.0 TSI 110cv eTSI MHEV",
        "1.5 TSI 150cv eTSI MHEV",
        "2.0 R 300cv",
        "2.0 TDI 115cv",
        "2.0 TDI 150cv"
      ],
      "2017–2024": [
        "1.0 TGI 90cv metano",
        "1.0 TSI 115cv",
        "1.5 TSI 150cv ACT",
        "1.6 TDI 115cv",
        "2.0 TDI 115cv",
        "2.0 TDI 150cv",
        "2.0 TSI 190cv 4Motion",
        "2.0 TSI 300cv R 4Motion"
      ]
    },
    "Taos": {
      "2022–2024": [
        "1.4 TSI 150cv",
        "1.5 TSI 150cv",
        "2.0 TDI 122cv"
      ]
    },
    "Tiguan (5N/AD)": {
      "2007–2016": [
        "1.4 TSI 122cv",
        "1.4 TSI 150cv",
        "1.8 TSI 160cv",
        "2.0 TDI 110cv",
        "2.0 TDI 140cv",
        "2.0 TDI 170cv 4Motion",
        "2.0 TSI 170cv",
        "2.0 TSI 200cv 4Motion"
      ],
      "2016–2024": [
        "1.4 eHybrid PHEV 245cv",
        "1.4 TSI 125cv",
        "1.5 TSI 130cv",
        "1.5 TSI 150cv",
        "1.6 TDI 115cv",
        "2.0 TDI 150cv",
        "2.0 TDI 190cv",
        "2.0 TDI 200cv 4Motion",
        "2.0 TSI 180cv",
        "2.0 TSI 180cv 4Motion",
        "2.0 TSI 220cv 4Motion",
        "2.0 TSI 220cv Allspace",
        "2.0 TSI 245cv Allspace"
      ]
    },
    "Touareg (7L/7P/CR)": {
      "2002–2010": [
        "3.2 V6 220cv",
        "4.2 V8 310cv",
        "5.0 TDI 313cv",
        "3.0 TDI 225cv"
      ],
      "2010–2018": [
        "3.6 FSI 280cv",
        "4.2 FSI 350cv",
        "3.0 TDI 204cv",
        "3.0 TDI 262cv",
        "3.6 FSI e-Hybrid 380cv"
      ],
      "2018–2024": [
        "3.0 TSI 340cv",
        "3.0 TDI 231cv",
        "3.0 TDI 286cv",
        "3.0 eHybrid PHEV 381cv"
      ]
    },
    "Up! (AA)": {
      "2011–2020": [
        "1.0 MPI 60cv",
        "1.0 MPI 75cv",
        "1.0 TSI 90cv GTI",
        "1.0 TGI 68cv"
      ],
      "2016–2023": [
        "1.0 MPI 65cv",
        "e-up! BEV 83cv"
      ]
    }
  },
  "Volvo": {
    "C30 (M)": {
      "2006–2012": [
        "1.6 100cv",
        "2.0 145cv",
        "2.5 T5 230cv",
        "1.6D 109cv",
        "2.0D 136cv"
      ]
    },
    "C40 Recharge": {
      "2021–2024": [
        "P8 AWD 408cv BEV",
        "Single Motor 231cv BEV"
      ]
    },
    "EX30": {
      "2023–2024": [
        "Single Motor 272cv BEV",
        "Twin Motor AWD 428cv BEV"
      ]
    },
    "S60 / V60 (II/III)": {
      "2010–2018": [
        "T3 152cv",
        "T5 254cv",
        "T6 AWD 329cv Polestar",
        "D2 120cv",
        "D3 150cv",
        "D4 190cv",
        "D5 215cv AWD"
      ],
      "2019–2024": [
        "B3 163cv MHEV",
        "B4 197cv MHEV",
        "B5 254cv MHEV",
        "T6 AWD 253cv PHEV",
        "D3 150cv",
        "D4 190cv"
      ]
    },
    "V40 / S40": {
      "2004–2012": [
        "1.6 100cv",
        "2.0 145cv",
        "2.5 T5 230cv",
        "1.6 D2 115cv",
        "2.0 D3 150cv"
      ],
      "2012–2019": [
        "1.5 T2 120cv",
        "1.5 T3 152cv",
        "2.0 T4 190cv",
        "2.0 T5 254cv",
        "1.6 D2 115cv",
        "2.0 D2 120cv",
        "2.0 D3 150cv",
        "2.0 D4 190cv"
      ]
    },
    "V50 (MW)": {
      "2004–2012": [
        "1.6 100cv",
        "2.0 145cv",
        "2.5 T5 220cv",
        "1.6D 109cv",
        "2.0D 136cv"
      ]
    },
    "V70 / XC70 (BW)": {
      "2007–2016": [
        "2.0 145cv",
        "2.4i 170cv",
        "T6 305cv",
        "D4 181cv",
        "D5 215cv"
      ]
    },
    "V90 / S90 (PW/PS)": {
      "2016–2024": [
        "B4 197cv MHEV",
        "B5 254cv MHEV",
        "B6 300cv MHEV",
        "T8 AWD 455cv PHEV",
        "D4 190cv",
        "D5 235cv AWD"
      ]
    },
    "XC40": {
      "2018–2021": [
        "T2 129cv",
        "T3 163cv",
        "T4 190cv",
        "T5 AWD 247cv",
        "T4 PHEV 211cv",
        "D3 150cv",
        "D4 190cv"
      ],
      "2021–2024": [
        "B3 163cv MHEV",
        "B4 197cv MHEV AWD",
        "Recharge P8 408cv BEV",
        "Recharge Twin 408cv BEV"
      ],
      "2018–2024": [
        "B3 163cv MHEV",
        "B4 197cv MHEV AWD",
        "D3 150cv",
        "D4 190cv AWD",
        "Recharge P8 408cv AWD BEV",
        "Recharge Single Motor 231cv BEV",
        "T2 129cv FWD",
        "T3 163cv FWD",
        "T4 211cv AWD",
        "T5 253cv AWD"
      ]
    },
    "XC60 (I/II)": {
      "2008–2017": [
        "2.0T 203cv",
        "3.0 T6 285cv",
        "2.4D 185cv",
        "2.0D 163cv",
        "2.4D5 215cv AWD"
      ],
      "2017–2024": [
        "B4 197cv MHEV",
        "B5 254cv MHEV AWD",
        "T6 AWD 253cv PHEV",
        "T8 AWD 390cv PHEV",
        "D4 190cv AWD"
      ]
    },
    "XC90 (I/II)": {
      "2002–2014": [
        "2.5T 210cv",
        "4.4 V8 315cv",
        "2.4D5 185cv",
        "2.4D5 200cv"
      ],
      "2015–2024": [
        "B5 250cv AWD MHEV",
        "B6 300cv AWD MHEV",
        "T8 AWD 455cv PHEV",
        "D4 190cv",
        "D5 235cv AWD"
      ]
    }
  }
};

var _vehicleMode = "auto";  // "auto" | "moto"

const MOTORCYCLES = {
  "Aprilia": {
    "Dorsoduro 750 / 900": {
      "2008–2018": [
        "Dorsoduro 750 90cv",
        "Dorsoduro 900 95cv"
      ]
    },
    "RS 660": {
      "2020–2024": [
        "RS 660 100cv"
      ]
    },
    "Tuono 660": {
      "2021–2024": [
        "Tuono 660 95cv"
      ]
    },
    "Tuono V4": {
      "2011–2020": [
        "Tuono V4 1000 167cv",
        "Tuono V4 1100 175cv RR"
      ],
      "2021–2024": [
        "Tuono V4 1100 175cv",
        "Tuono V4 Factory 175cv"
      ]
    },
    "Tuareg 660": {
      "2022–2024": [
        "Tuareg 660 80cv"
      ]
    },
    "RSV4": {
      "2009–2020": [
        "RSV4 Factory 180cv",
        "RSV4 RF 201cv",
        "RSV4 1000 RR 217cv"
      ],
      "2021–2024": [
        "RSV4 1100 217cv Factory",
        "RSV4 SE 221cv"
      ]
    },
    "Shiver 750 / 900": {
      "2007–2021": [
        "Shiver 750 95cv",
        "Shiver 900 96cv GT"
      ]
    },
    "Caponord 1200": {
      "2013–2017": [
        "Caponord 1200 125cv ABS",
        "Caponord 1200 Rally 125cv"
      ]
    }
  },
  "Benelli": {
    "TRK 502 / 502X": {
      "2017–2024": [
        "TRK 502 47cv",
        "TRK 502X 47cv"
      ]
    },
    "TRK 702 / 702X": {
      "2022–2024": [
        "TRK 702 80cv",
        "TRK 702X 80cv"
      ]
    },
    "Leoncino 500": {
      "2017–2024": [
        "Leoncino 500 47.6cv",
        "Leoncino 500 Trail 47.6cv"
      ]
    },
    "752S": {
      "2019–2024": [
        "752S 80cv"
      ]
    },
    "502C": {
      "2020–2024": [
        "502C 47cv"
      ]
    },
    "BN 302 / 302S": {
      "2015–2020": [
        "BN 302 38cv",
        "BN 302S 38cv"
      ]
    }
  },
  "BMW Motorrad": {
    "R 1250 GS / Adventure": {
      "2019–2024": [
        "R 1250 GS 136cv",
        "R 1250 GS Adventure 136cv",
        "R 1250 GS HP 136cv"
      ]
    },
    "R 1300 GS / Adventure": {
      "2024–2024": [
        "R 1300 GS 145cv",
        "R 1300 GS Adventure 145cv"
      ]
    },
    "F 900 R / XR": {
      "2020–2024": [
        "F 900 R 105cv",
        "F 900 XR 105cv"
      ]
    },
    "F 850 GS / Adventure": {
      "2018–2024": [
        "F 850 GS 95cv",
        "F 850 GS Adventure 95cv"
      ]
    },
    "F 800 GS / Adventure": {
      "2008–2018": [
        "F 800 GS 85cv",
        "F 800 GS Adventure 85cv",
        "F 800 R 87cv"
      ]
    },
    "S 1000 RR": {
      "2009–2018": [
        "S 1000 RR 193cv",
        "S 1000 RR HP4 212cv"
      ],
      "2019–2024": [
        "S 1000 RR 210cv",
        "S 1000 RR M 212cv"
      ]
    },
    "S 1000 XR": {
      "2015–2019": [
        "S 1000 XR 165cv"
      ],
      "2020–2024": [
        "S 1000 XR 165cv",
        "S 1000 XR M Sport 165cv"
      ]
    },
    "R nineT": {
      "2014–2024": [
        "R nineT 109cv",
        "R nineT Pure 109cv",
        "R nineT Scrambler 109cv",
        "R nineT Urban G/S 109cv",
        "R nineT Racer 109cv"
      ]
    },
    "G 310 R / GS": {
      "2017–2024": [
        "G 310 R 34cv",
        "G 310 GS 34cv"
      ]
    },
    "C 400 X / GT": {
      "2019–2024": [
        "C 400 X 34cv",
        "C 400 GT 34cv"
      ]
    },
    "K 1600 GT / GTL": {
      "2011–2024": [
        "K 1600 GT 160cv",
        "K 1600 GTL 160cv",
        "K 1600 Grand America 160cv"
      ]
    },
    "M 1000 RR": {
      "2021–2024": [
        "M 1000 RR 212cv",
        "M 1000 RR Competition 212cv"
      ]
    },
    "R 18": {
      "2020–2024": [
        "R 18 91cv",
        "R 18 B 91cv",
        "R 18 Transcontinental 91cv"
      ]
    }
  },
  "Ducati": {
    "Monster 821 / 937": {
      "2014–2020": [
        "Monster 821 109cv",
        "Monster 821 Stealth 109cv"
      ],
      "2021–2024": [
        "Monster 937 111cv",
        "Monster+ 111cv"
      ]
    },
    "Monster 1200 / 1200S": {
      "2014–2021": [
        "Monster 1200 150cv",
        "Monster 1200S 150cv R",
        "Monster 1200 25° Ann."
      ]
    },
    "Multistrada V4 / V4S": {
      "2021–2024": [
        "Multistrada V4 170cv",
        "Multistrada V4S 170cv",
        "Multistrada V4 Pikes Peak 170cv",
        "Multistrada V4 Rally 170cv"
      ]
    },
    "Multistrada 1260 / 1260S": {
      "2018–2021": [
        "Multistrada 1260 158cv",
        "Multistrada 1260S 158cv",
        "Multistrada 1260 Pikes Peak 158cv",
        "Multistrada 1260 Grand Tour"
      ]
    },
    "Multistrada 950 / 950S": {
      "2017–2022": [
        "Multistrada 950 113cv",
        "Multistrada 950S 113cv"
      ]
    },
    "Panigale V4 / V4S": {
      "2018–2024": [
        "Panigale V4 214cv",
        "Panigale V4S 214cv",
        "Panigale V4R 221cv",
        "Panigale V4 Speciale 226cv"
      ]
    },
    "Panigale V2": {
      "2020–2024": [
        "Panigale V2 155cv",
        "Panigale V2 Bayliss 1st Ann."
      ]
    },
    "Scrambler 800": {
      "2015–2024": [
        "Scrambler Icon 73cv",
        "Scrambler Full Throttle 73cv",
        "Scrambler Café Racer 73cv",
        "Scrambler Desert Sled 73cv",
        "Scrambler Nightshift 73cv"
      ]
    },
    "Scrambler 1100": {
      "2018–2024": [
        "Scrambler 1100 86cv",
        "Scrambler 1100 Special 86cv",
        "Scrambler 1100 Sport Pro 86cv"
      ]
    },
    "Streetfighter V4": {
      "2020–2024": [
        "Streetfighter V4 208cv",
        "Streetfighter V4S 208cv",
        "Streetfighter V4 Lamborghini 208cv"
      ]
    },
    "SuperSport 950": {
      "2017–2024": [
        "SuperSport 950 110cv",
        "SuperSport 950S 110cv"
      ]
    },
    "DesertX": {
      "2022–2024": [
        "DesertX 110cv",
        "DesertX Rally 110cv"
      ]
    },
    "Diavel V4": {
      "2023–2024": [
        "Diavel V4 168cv"
      ]
    }
  },
  "Harley-Davidson": {
    "Sportster S": {
      "2021–2024": [
        "Sportster S 121cv Revolution Max"
      ]
    },
    "Nightster / Nightster Special": {
      "2022–2024": [
        "Nightster 89cv",
        "Nightster Special 89cv"
      ]
    },
    "Pan America 1250": {
      "2021–2024": [
        "Pan America 1250 150cv",
        "Pan America 1250 Special 150cv"
      ]
    },
    "Fat Boy / Heritage": {
      "2018–2024": [
        "Fat Boy 114ci 97cv",
        "Heritage Classic 114ci 97cv",
        "Fat Bob 114ci 97cv"
      ]
    },
    "Road King / Road Glide": {
      "2017–2024": [
        "Road King 114ci 100cv",
        "Road Glide Special 117ci 106cv",
        "Street Glide 117ci 106cv"
      ]
    },
    "Softail Standard / Street Bob": {
      "2018–2024": [
        "Softail Standard 107ci 92cv",
        "Street Bob 114ci 97cv"
      ]
    },
    "LiveWire": {
      "2019–2024": [
        "LiveWire BEV 105cv"
      ]
    }
  },
  "Honda": {
    "Africa Twin CRF1000L / CRF1100L": {
      "2016–2019": [
        "CRF1000L Africa Twin 94cv",
        "CRF1000L Adventure Sports 94cv"
      ],
      "2020–2024": [
        "CRF1100L Africa Twin 100cv",
        "CRF1100L Adventure Sports 100cv",
        "CRF1100L Adventure Sports DCT"
      ]
    },
    "XL 750 Transalp": {
      "2023–2024": [
        "XL 750 Transalp 91cv"
      ]
    },
    "CB500F / CB500X / CBR500R": {
      "2013–2024": [
        "CB500F 47cv",
        "CB500X 47cv A2",
        "CBR500R 47cv A2"
      ]
    },
    "CB650R / CBR650R": {
      "2019–2024": [
        "CB650R 95cv",
        "CBR650R 95cv"
      ]
    },
    "CB750 Hornet": {
      "2023–2024": [
        "CB750 Hornet 92cv"
      ]
    },
    "CB1000R": {
      "2018–2024": [
        "CB1000R 143cv Neo Sports Café",
        "CB1000R Black Edition 143cv"
      ]
    },
    "CBR1000RR Fireblade": {
      "2017–2024": [
        "CBR1000RR Fireblade 192cv",
        "CBR1000RR-R Fireblade SP 214cv"
      ]
    },
    "CRF 300L / Rally": {
      "2021–2024": [
        "CRF300L 27cv",
        "CRF300L Rally 27cv"
      ]
    },
    "NC750X / DCT": {
      "2012–2024": [
        "NC750X 58cv",
        "NC750X DCT 58cv",
        "NT1100 102cv DCT"
      ]
    },
    "X-ADV 750": {
      "2017–2024": [
        "X-ADV 750 54cv DCT"
      ]
    },
    "ADV 350": {
      "2022–2024": [
        "ADV 350 29cv"
      ]
    },
    "Forza 350 / 750": {
      "2018–2024": [
        "Forza 350 29cv",
        "Forza 750 58cv DCT"
      ]
    },
    "SH 125i / 150i / 350i": {
      "2009–2024": [
        "SH 125i ABS 13cv",
        "SH 150i ABS 15cv",
        "SH 350i ABS 29cv"
      ]
    },
    "PCX 125": {
      "2010–2024": [
        "PCX 125 12cv",
        "PCX 125 Hybrid 13cv"
      ]
    },
    "Integra 750": {
      "2012–2019": [
        "Integra 750 54cv DCT"
      ]
    },
    "VFR800F / VFR1200": {
      "2014–2021": [
        "VFR800F 107cv",
        "VFR1200F 173cv DCT"
      ]
    }
  },
  "Kawasaki": {
    "Z900 / Z900RS": {
      "2017–2024": [
        "Z900 125cv",
        "Z900 SE 125cv",
        "Z900RS 111cv",
        "Z900RS Café 111cv",
        "Z900RS SE 111cv"
      ]
    },
    "Z650 / Z650RS": {
      "2017–2024": [
        "Z650 68cv",
        "Z650RS 68cv"
      ]
    },
    "Z125 Pro": {
      "2017–2024": [
        "Z125 9.7cv"
      ]
    },
    "Ninja 650": {
      "2017–2024": [
        "Ninja 650 68cv",
        "Ninja 650 KRT 68cv"
      ]
    },
    "Ninja 1000SX": {
      "2020–2024": [
        "Ninja 1000SX 142cv",
        "Ninja 1000SX Tourer 142cv"
      ]
    },
    "ZZR 1400": {
      "2012–2020": [
        "ZZR 1400 200cv ABS",
        "ZZR 1400 Special Edition 200cv"
      ]
    },
    "H2 / H2R": {
      "2015–2024": [
        "H2 231cv Supercharged",
        "H2 SX 200cv Supercharged",
        "H2R 310cv Track"
      ]
    },
    "Versys 650": {
      "2015–2024": [
        "Versys 650 69cv",
        "Versys 650 Grand Tourer 69cv"
      ]
    },
    "Versys 1000": {
      "2019–2024": [
        "Versys 1000 120cv",
        "Versys 1000 SE 120cv KCMC"
      ]
    },
    "Z400": {
      "2019–2024": [
        "Z400 45cv A2"
      ]
    },
    "Ninja 400": {
      "2018–2024": [
        "Ninja 400 45cv A2"
      ]
    },
    "KLE 500": {
      "2025–2025": [
        "KLE 500 48cv A2"
      ]
    }
  },
  "KTM": {
    "125 Duke / RC 125": {
      "2011–2024": [
        "125 Duke 15cv",
        "RC 125 15cv"
      ]
    },
    "390 Duke / RC 390": {
      "2013–2024": [
        "390 Duke 44cv",
        "RC 390 44cv"
      ]
    },
    "790 Duke": {
      "2018–2023": [
        "790 Duke 95cv",
        "790 Duke R 95cv"
      ]
    },
    "890 Duke R": {
      "2020–2024": [
        "890 Duke 121cv",
        "890 Duke R 121cv",
        "890 SMT 121cv"
      ]
    },
    "1290 Super Duke R": {
      "2014–2024": [
        "1290 Super Duke R 180cv",
        "1290 Super Duke RR 180cv EVO"
      ]
    },
    "790 / 890 Adventure": {
      "2019–2024": [
        "790 Adventure 95cv",
        "890 Adventure 105cv",
        "890 Adventure R 105cv"
      ]
    },
    "1290 Super Adventure": {
      "2015–2024": [
        "1290 Super Adventure S 160cv",
        "1290 Super Adventure R 160cv"
      ]
    },
    "250 / 390 Adventure": {
      "2020–2024": [
        "250 Adventure 30cv",
        "390 Adventure 46cv"
      ]
    },
    "Duke 200": {
      "2011–2024": [
        "200 Duke 25cv"
      ]
    }
  },
  "Moto Guzzi": {
    "V7 (III/IV)": {
      "2012–2024": [
        "V7 Special 52cv",
        "V7 Stone 52cv",
        "V7 Centenario 52cv",
        "V7 Stone Corsa 52cv"
      ]
    },
    "V9 Bobber / Roamer": {
      "2016–2024": [
        "V9 Bobber 55cv",
        "V9 Roamer 55cv"
      ]
    },
    "V85 TT": {
      "2019–2024": [
        "V85 TT 80cv",
        "V85 TT Travel 80cv",
        "V85 TT Guardia d'Onore"
      ]
    },
    "Stelvio": {
      "2023–2024": [
        "Stelvio 115cv"
      ]
    },
    "V100 Mandello": {
      "2022–2024": [
        "V100 Mandello 115cv",
        "V100 Mandello S 115cv"
      ]
    },
    "Griso 1200 8V": {
      "2007–2016": [
        "Griso 1200 8V 110cv"
      ]
    }
  },
  "Moto Morini": {
    "X-Cape 650": {
      "2021–2024": [
        "X-Cape 650 60cv",
        "X-Cape 650X 60cv"
      ]
    },
    "Seiemmezzo SCR / STR": {
      "2021–2024": [
        "Seiemmezzo SCR 55cv",
        "Seiemmezzo STR 55cv"
      ]
    }
  },
  "MV Agusta": {
    "Brutale 800 / 1000": {
      "2013–2024": [
        "Brutale 800 140cv",
        "Brutale 800 Dragster RR 140cv",
        "Brutale 1000 RR 208cv",
        "Brutale 1000 RS 208cv"
      ]
    },
    "F3 675 / 800": {
      "2012–2022": [
        "F3 675 128cv",
        "F3 800 148cv",
        "F3 800 RC 153cv"
      ]
    },
    "Turismo Veloce 800": {
      "2015–2024": [
        "Turismo Veloce 800 110cv",
        "Turismo Veloce 800 Lusso 110cv"
      ]
    },
    "Superveloce 800": {
      "2020–2024": [
        "Superveloce 800 148cv Serie Oro"
      ]
    }
  },
  "Piaggio": {
    "Beverly 300 / 400": {
      "2010–2024": [
        "Beverly 300 ABS 22cv",
        "Beverly 400 ABS 35cv",
        "Beverly S 400 ABS 35cv"
      ]
    },
    "Liberty 125": {
      "2009–2024": [
        "Liberty 125 ABS 11cv iGet"
      ]
    },
    "Medley 125 / 150": {
      "2016–2024": [
        "Medley 125 ABS 13cv",
        "Medley 150 ABS 15cv"
      ]
    },
    "MP3 300 / 500": {
      "2014–2024": [
        "MP3 300 ABS 25cv",
        "MP3 500 ABS 40cv HPE"
      ]
    },
    "Vespa GTS 300": {
      "2019–2024": [
        "Vespa GTS 300 Super 24cv",
        "Vespa GTS 300 HPE SuperTech",
        "Vespa GTS 300 Super Sport 24cv"
      ]
    },
    "Vespa Primavera / Sprint 125": {
      "2013–2024": [
        "Vespa Primavera 125 ABS 10cv",
        "Vespa Sprint 125 ABS 10cv",
        "Vespa Primavera S 125 ABS"
      ]
    }
  },
  "Royal Enfield": {
    "Interceptor 650 / GT 650": {
      "2019–2024": [
        "Interceptor 650 47cv",
        "Continental GT 650 47cv"
      ]
    },
    "Himalayan 411 / 450": {
      "2018–2024": [
        "Himalayan 411 24.5cv",
        "Himalayan 450 40cv"
      ]
    },
    "Meteor 350": {
      "2021–2024": [
        "Meteor 350 20cv"
      ]
    },
    "Hunter 350": {
      "2022–2024": [
        "Hunter 350 20cv"
      ]
    },
    "Scram 411": {
      "2022–2024": [
        "Scram 411 24.5cv"
      ]
    },
    "Super Meteor 650": {
      "2023–2024": [
        "Super Meteor 650 47cv"
      ]
    }
  },
  "Suzuki": {
    "GSX-S750 / GSX-S950": {
      "2015–2024": [
        "GSX-S750 114cv",
        "GSX-S950 110cv"
      ]
    },
    "GSX-S1000 / GT": {
      "2015–2024": [
        "GSX-S1000 150cv",
        "GSX-S1000GT 152cv",
        "GSX-S1000GX 152cv"
      ]
    },
    "V-Strom 650 / XT": {
      "2012–2024": [
        "V-Strom 650 71cv",
        "V-Strom 650XT 71cv"
      ]
    },
    "V-Strom 1050 / XT": {
      "2020–2024": [
        "V-Strom 1050 107cv",
        "V-Strom 1050XT 107cv"
      ]
    },
    "Burgman 400 / 650": {
      "2017–2024": [
        "Burgman 400 34cv ABS",
        "Burgman 650 56cv Executive"
      ]
    },
    "GSX-R 600 / 750 / 1000": {
      "2011–2024": [
        "GSX-R 600 125cv",
        "GSX-R 750 150cv",
        "GSX-R 1000 202cv R"
      ]
    },
    "SV 650": {
      "2016–2024": [
        "SV 650 73cv",
        "SV 650X 73cv"
      ]
    },
    "Katana 1000": {
      "2019–2024": [
        "Katana 150cv"
      ]
    }
  },
  "Triumph": {
    "Tiger 900 / GT / Rally": {
      "2020–2024": [
        "Tiger 900 95cv",
        "Tiger 900 GT Pro 95cv",
        "Tiger 900 Rally Pro 95cv",
        "Tiger 900 GT Low 95cv"
      ]
    },
    "Tiger 1200 GT / Rally": {
      "2022–2024": [
        "Tiger 1200 GT 150cv",
        "Tiger 1200 GT Pro 150cv",
        "Tiger 1200 GT Explorer 150cv",
        "Tiger 1200 Rally Pro 150cv",
        "Tiger 1200 Rally Explorer 150cv"
      ]
    },
    "Street Triple 765": {
      "2017–2024": [
        "Street Triple 765 R 118cv",
        "Street Triple 765 RS 130cv",
        "Street Triple 765 Moto2 130cv"
      ]
    },
    "Bonneville T100 / T120": {
      "2016–2024": [
        "Bonneville T100 54cv",
        "Bonneville T120 80cv",
        "Bonneville T120 Black 80cv"
      ]
    },
    "Scrambler 400X / 900 / 1200": {
      "2019–2024": [
        "Scrambler 400X 40cv A2",
        "Scrambler 900 64cv",
        "Scrambler 1200 XC 90cv",
        "Scrambler 1200 XE 90cv"
      ]
    },
    "Trident 660": {
      "2021–2024": [
        "Trident 660 81cv A2"
      ]
    },
    "Speed Triple 1200": {
      "2021–2024": [
        "Speed Triple 1200 RR 180cv",
        "Speed Triple 1200 RS 180cv"
      ]
    },
    "Speedmaster / Thunderbird": {
      "2018–2024": [
        "Speedmaster 1200 77cv",
        "Bobber Black 1200 77cv"
      ]
    },
    "Rocket 3 R / GT": {
      "2020–2024": [
        "Rocket 3 R 167cv",
        "Rocket 3 GT 167cv",
        "Rocket 3 Storm GT 167cv"
      ]
    }
  },
  "Vespa": {
    "GTS 125 / 300": {
      "2009–2024": [
        "GTS 125 Super ABS 12cv",
        "GTS 300 HPE 24cv",
        "GTS 300 Super 24cv",
        "GTS 125 Sport 12cv"
      ]
    },
    "946": {
      "2013–2024": [
        "946 125 12cv",
        "946 Dragon 125",
        "946 Bunny 125"
      ]
    }
  },
  "Voge": {
    "525DSX / 900DSX": {
      "2022–2024": [
        "525DSX 50cv",
        "525DSX Adventure 50cv",
        "900DSX 95cv"
      ]
    },
    "Valico 525": {
      "2023–2024": [
        "Valico 525D 50cv"
      ]
    }
  },
  "Yamaha": {
    "MT-07": {
      "2014–2024": [
        "MT-07 73cv",
        "MT-07 Moto Cage 73cv",
        "XSR700 73cv",
        "XSR700 Legacy 73cv"
      ]
    },
    "MT-09 / SP": {
      "2014–2024": [
        "MT-09 115cv",
        "MT-09 SP 119cv",
        "XSR900 119cv",
        "XSR900 GP 119cv"
      ]
    },
    "MT-10 / SP": {
      "2016–2024": [
        "MT-10 166cv",
        "MT-10 SP 166cv",
        "MT-10 Tourer 166cv"
      ]
    },
    "Tracer 7 / GT": {
      "2020–2024": [
        "Tracer 7 73cv",
        "Tracer 7 GT 73cv"
      ]
    },
    "Tracer 9 / GT": {
      "2021–2024": [
        "Tracer 9 119cv",
        "Tracer 9 GT 119cv",
        "Tracer 9 GT+ 119cv"
      ]
    },
    "Ténéré 700 / World Raid": {
      "2019–2024": [
        "Ténéré 700 73cv",
        "Ténéré 700 World Raid 73cv",
        "Ténéré 700 Rally 73cv"
      ]
    },
    "R1": {
      "2015–2024": [
        "R1 200cv",
        "R1M 200cv",
        "GYTR 200cv"
      ]
    },
    "R7": {
      "2021–2024": [
        "R7 73cv"
      ]
    },
    "XMAX 125 / 300 / 400": {
      "2017–2024": [
        "XMAX 125 15cv",
        "XMAX 300 28cv",
        "XMAX 400 35cv"
      ]
    },
    "T-MAX 560": {
      "2020–2024": [
        "T-MAX 560 49cv",
        "T-MAX 560 Tech MAX 49cv"
      ]
    },
    "NMAX 125": {
      "2015–2024": [
        "NMAX 125 11cv",
        "NMAX 125 Connected 11cv"
      ]
    },
    "Tricity 300": {
      "2020–2024": [
        "Tricity 300 28cv LMW"
      ]
    },
    "FZ6 / FZ8": {
      "2010–2017": [
        "FZ6 S2 98cv",
        "FZ6 Fazer S2 98cv",
        "FZ8 106cv",
        "FZ8 Fazer 106cv"
      ]
    },
    "Fazer 8 / FZ8 N": {
      "2010–2016": [
        "Fazer 8 106cv",
        "FZ8 N 106cv"
      ]
    }
  }
};
const SCEGLIAUTO_SLUGS = {
  "Alfa Romeo":    "alfa-romeo",
  "Audi":          "audi",
  "BMW":           "bmw",
  "Citroën":       "citroen",
  "Dacia":         "dacia",
  "Fiat":          "fiat",
  "Ford":          "ford",
  "Honda":         "honda",
  "Hyundai":       "hyundai",
  "Jeep":          "jeep",
  "Kia":           "kia",
  "Land Rover":    "land-rover",
  "Mazda":         "mazda",
  "Mercedes-Benz": "mercedes",
  "Mini":          "mini",
  "Mitsubishi":    "mitsubishi",
  "Nissan":        "nissan",
  "Opel":          "opel",
  "Peugeot":       "peugeot",
  "Porsche":       "porsche",
  "Renault":       "renault",
  "SEAT":          "seat",
  "Skoda":         "skoda",
  "Subaru":        "subaru",
  "Suzuki":        "suzuki",
  "Toyota":        "toyota",
  "Volkswagen":    "volkswagen",
  "Volvo":         "volvo",
};
const WMI_DB = {
  'WAU':'Audi','WBA':'BMW','WBS':'BMW M','WBY':'BMW','WDD':'Mercedes-Benz',
  'WDC':'Mercedes-Benz','WDB':'Mercedes-Benz','WEB':'Mercedes-Benz',
  'WF0':'Ford Europa','WFO':'Ford','WJM':'Volvo','YV1':'Volvo','YV2':'Volvo',
  'VF1':'Renault','VF3':'Peugeot','VF7':'Citroën','VF6':'Citroën',
  'VS6':'Ford Spagna','VSS':'SEAT','VNK':'Toyota','VS7':'Citroën',
  'ZAR':'Alfa Romeo','ZFA':'Fiat','ZFF':'Ferrari','ZHW':'Lamborghini',
  'ZAM':'Maserati','ZLA':'Lancia','ZCF':'Iveco',
  'TMA':'Hyundai','TMB':'Skoda','TMAJ':'Kia',
  'VF8':'Matra','SAJ':'Jaguar','SAL':'Land Rover','SAR':'Rover',
  'SAX':'Land Rover','SCF':'Aston Martin',
  'W0L':'Opel','W0V':'Opel','WOL':'Opel',
  'SUF':'Subaru','JF1':'Subaru','JF2':'Subaru',
  'JHM':'Honda','JH4':'Honda','JH2':'Honda',
  'JN1':'Nissan','JN6':'Nissan','JN8':'Nissan',
  '1HG':'Honda USA','2HG':'Honda Canada',
  'JTD':'Toyota','JTE':'Toyota','JTH':'Lexus',
  'KNA':'Kia','KNC':'Kia','KND':'Kia','KNM':'Renault Samsung',
  'MAT':'Tata','MAJ':'Ford India',
  'SHH':'Honda UK','SCC':'Lotus',
  'TRU':'Audi Ungheria','WAUZZZF2':'Audi A6','WAP':'Porsche',
  'WP0':'Porsche','WP1':'Porsche',
  'VSK':'Nissan Spagna','VNE':'Nissan',
  'XTA':'Lada','XUF':'GM Uzbekistan',
  'UU1':'Dacia','UU6':'Renault Romania',
  'NM0':'Mazda','JM1':'Mazda','JM3':'Mazda',
  'TMK':'Volkswagen SK','WVW':'Volkswagen','WVG':'Volkswagen',
  'WV1':'Volkswagen','WV2':'Volkswagen','WV3':'Volkswagen',
  '1VW':'Volkswagen USA','3VW':'Volkswagen Mexico',
  'SBM':'McLaren','SBD':'Aston Martin',
  'ADV':'Volkswagen Austria','TMAM':'Skoda',
};
const YEAR_CODES = {
  // (le lettere A–T si ripetono ogni 30 anni: qui vale il ciclo 2010–2026)
  'V':1997,'W':1998,'X':1999,'Y':2000,'1':2001,'2':2002,'3':2003,
  '4':2004,'5':2005,'6':2006,'7':2007,'8':2008,'9':2009,'A':2010,'B':2011,
  'C':2012,'D':2013,'E':2014,'F':2015,'G':2016,'H':2017,'J':2018,'K':2019,
  'L':2020,'M':2021,'N':2022,'P':2023,'R':2024,'S':2025,'T':2026,
};
const OBD_CODES = {"P0100": "Sensore portata aria (MAF) — circuito aperto", "P0101": "Sensore portata aria (MAF) — range/prestazione fuori norma", "P0102": "Sensore portata aria (MAF) — segnale basso", "P0103": "Sensore portata aria (MAF) — segnale alto", "P0110": "Sensore temperatura aria aspirazione — circuito aperto", "P0112": "Sensore temperatura aria aspirazione — segnale basso", "P0113": "Sensore temperatura aria aspirazione — segnale alto", "P0115": "Sensore temperatura liquido raffreddamento (ECT) — circuito", "P0116": "Sensore ECT — range/prestazione fuori norma", "P0117": "Sensore ECT — segnale basso", "P0118": "Sensore ECT — segnale alto", "P0120": "Sensore posizione acceleratore (TPS) A — circuito", "P0121": "Sensore posizione acceleratore (TPS) A — range/prestazione", "P0122": "Sensore posizione acceleratore (TPS) A — segnale basso", "P0123": "Sensore posizione acceleratore (TPS) A — segnale alto", "P0130": "Sonda lambda banco 1 sensore 1 — circuito", "P0131": "Sonda lambda banco 1 sensore 1 — tensione bassa", "P0132": "Sonda lambda banco 1 sensore 1 — tensione alta", "P0133": "Sonda lambda banco 1 sensore 1 — risposta lenta", "P0134": "Sonda lambda banco 1 sensore 1 — nessuna attività", "P0135": "Sonda lambda banco 1 sensore 1 — riscaldatore", "P0136": "Sonda lambda banco 1 sensore 2 — circuito", "P0137": "Sonda lambda banco 1 sensore 2 — tensione bassa", "P0138": "Sonda lambda banco 1 sensore 2 — tensione alta", "P0140": "Sonda lambda banco 1 sensore 2 — nessuna attività", "P0141": "Sonda lambda banco 1 sensore 2 — riscaldatore", "P0150": "Sonda lambda banco 2 sensore 1 — circuito", "P0151": "Sonda lambda banco 2 sensore 1 — tensione bassa", "P0152": "Sonda lambda banco 2 sensore 1 — tensione alta", "P0153": "Sonda lambda banco 2 sensore 1 — risposta lenta", "P0171": "Sistema miscela troppo magra — banco 1", "P0172": "Sistema miscela troppo ricca — banco 1", "P0174": "Sistema miscela troppo magra — banco 2", "P0175": "Sistema miscela troppo ricca — banco 2", "P0440": "Sistema evaporativo EVAP — malfunzionamento generico", "P0441": "Sistema evaporativo EVAP — flusso errato", "P0442": "Sistema evaporativo EVAP — perdita piccola rilevata", "P0446": "Sistema evaporativo EVAP — valvola sfiato", "P0455": "Sistema evaporativo EVAP — grande perdita rilevata", "P0456": "Sistema evaporativo EVAP — perdita molto piccola", "P0420": "Efficienza catalizzatore banco 1 sotto soglia", "P0421": "Efficienza catalizzatore banco 1 — riscaldamento sotto soglia", "P0430": "Efficienza catalizzatore banco 2 sotto soglia", "P0300": "Mancata accensione casuale/multipla rilevata", "P0301": "Mancata accensione cilindro 1", "P0302": "Mancata accensione cilindro 2", "P0303": "Mancata accensione cilindro 3", "P0304": "Mancata accensione cilindro 4", "P0305": "Mancata accensione cilindro 5", "P0306": "Mancata accensione cilindro 6", "P0010": "Attuatore fasatura camme aspirazione banco 1 — circuito", "P0011": "Posizione fasatura camme aspirazione banco 1 — troppo anticipata", "P0012": "Posizione fasatura camme aspirazione banco 1 — troppo ritardata", "P0013": "Attuatore fasatura camme scarico banco 1 — circuito", "P0014": "Posizione fasatura camme scarico banco 1 — troppo anticipata", "P0020": "Attuatore fasatura camme aspirazione banco 2 — circuito", "P0021": "Posizione fasatura camme aspirazione banco 2 — troppo anticipata", "P0087": "Pressione carburante — troppo bassa (rail/sistema)", "P0088": "Pressione carburante — troppo alta", "P0089": "Regolatore pressione carburante — prestazione", "P0090": "Regolatore pressione carburante — circuito", "P0191": "Sensore pressione carburante rail — range/prestazione", "P0192": "Sensore pressione carburante rail — segnale basso", "P0193": "Sensore pressione carburante rail — segnale alto", "P0200": "Iniettore — circuito aperto", "P0201": "Iniettore cilindro 1 — circuito", "P0202": "Iniettore cilindro 2 — circuito", "P0203": "Iniettore cilindro 3 — circuito", "P0204": "Iniettore cilindro 4 — circuito", "P0205": "Iniettore cilindro 5 — circuito", "P0206": "Iniettore cilindro 6 — circuito", "P0340": "Sensore posizione albero a camme banco 1 — circuito", "P0341": "Sensore posizione albero a camme banco 1 — range/prestazione", "P0342": "Sensore posizione albero a camme banco 1 — segnale basso", "P0343": "Sensore posizione albero a camme banco 1 — segnale alto", "P0335": "Sensore posizione albero motore (CKP) — circuito", "P0336": "Sensore posizione albero motore (CKP) — range/prestazione", "P0234": "Sovrappressione turbocompressore — limite superato", "P0235": "Sensore pressione turbocompressore banco 1 — circuito", "P0236": "Sensore pressione turbocompressore banco 1 — range/prestazione", "P0237": "Sensore pressione turbocompressore banco 1 — segnale basso", "P0238": "Sensore pressione turbocompressore banco 1 — segnale alto", "P0243": "Valvola wastegate turbocompressore — circuito", "P0245": "Valvola wastegate turbocompressore — segnale basso", "P0246": "Valvola wastegate turbocompressore — segnale alto", "P0217": "Temperatura motore eccessiva", "P0218": "Temperatura trasmissione eccessiva", "P0597": "Valvola termostatica — circuito aperto", "P0598": "Valvola termostatica — segnale basso", "P0599": "Valvola termostatica — segnale alto", "P0400": "Ricircolo gas scarico (EGR) — flusso insufficiente", "P0401": "Ricircolo gas scarico (EGR) — flusso insufficiente rilevato", "P0402": "Ricircolo gas scarico (EGR) — flusso eccessivo rilevato", "P0403": "Circuito valvola EGR — malfunzionamento", "P0404": "Valvola EGR — range/prestazione", "P0405": "Sensore posizione EGR A — segnale basso", "P0406": "Sensore posizione EGR A — segnale alto", "P2002": "Efficienza filtro antiparticolato (DPF) banco 1 — sotto soglia", "P2003": "Efficienza filtro antiparticolato (DPF) banco 2 — sotto soglia", "P244A": "Differenziale pressione DPF — basso flusso", "P244B": "Differenziale pressione DPF — alto flusso", "P2463": "Filtro antiparticolato diesel — accumulo eccessivo di fuliggine", "P0473": "Sensore pressione scarico — segnale alto", "P0474": "Sensore pressione scarico — segnale intermittente", "P203F": "Qualità reagente (AdBlue) — sotto soglia", "P2048": "Iniettore reagente AdBlue — circuito basso", "P2049": "Iniettore reagente AdBlue — circuito alto", "P204F": "Efficienza sistema SCR banco 1 — sotto soglia", "P0700": "Sistema controllo trasmissione — guasto generico", "P0715": "Sensore velocità turbina trasmissione — circuito", "P0720": "Sensore velocità uscita trasmissione — circuito", "P0730": "Rapporto di marcia errato", "P0740": "Circuito solenoide convertitore di coppia (TCC)", "P0750": "Solenoide cambio A — malfunzionamento", "P0760": "Solenoide cambio C — malfunzionamento", "P0780": "Problema cambio marcia", "C0035": "Sensore velocità ruota anteriore sinistra — circuito", "C0040": "Sensore velocità ruota anteriore destra — circuito", "C0045": "Sensore velocità ruota posteriore sinistra — circuito", "C0050": "Sensore velocità ruota posteriore destra — circuito", "C0110": "Malfunzionamento pompa motore ABS", "C0121": "Valvola solenoide ABS — malfunzionamento", "C0265": "Relè circuito attuatore ABS — aperto", "B1000": "Centralina controllo clima — guasto interno", "P0530": "Sensore pressione refrigerante A/C — circuito", "P0531": "Sensore pressione refrigerante A/C — range/prestazione", "P0532": "Sensore pressione refrigerante A/C — segnale basso", "P0533": "Sensore pressione refrigerante A/C — segnale alto", "B0001": "Circuito airbag lato guida — cortocircuito a massa", "B0002": "Circuito airbag passeggero — cortocircuito a massa", "B0051": "Airbag frontale passeggero — circuito aperto", "B0057": "Cintura di sicurezza pretensionatore lato guida — circuito", "P0560": "Tensione sistema — intermittente", "P0562": "Tensione sistema — bassa", "P0563": "Tensione sistema — alta", "P0600": "Bus comunicazione seriale — malfunzionamento", "P0601": "Memoria centralina motore (ECM/PCM) — errore checksum", "P0606": "Processore centralina motore (ECM/PCM) — guasto", "P0A00": "Sistema motore/generatore — malfunzionamento", "P0A0F": "Tensione batteria ad alta tensione — bassa", "P0A1F": "Capacità batteria — sotto soglia", "P0A7F": "Prestazione sistema batteria ad alta tensione", "P0A80": "Sostituire moduli batteria ad alta tensione", "P0A94": "Convertitore DC/DC — prestazione", "P1A10": "Temperatura batteria ibrida — alta", "P3000": "Sistema batteria ad alta tensione — malfunzionamento"};
const OIL_QTY = {"Fiat||500 (312)||1.2 69cv": {"litri": 3.1, "viscosita": "5W-40", "norma": "Fiat 9.55535-S1"}, "Fiat||500 (312)||0.9 TwinAir 85cv": {"litri": 2.9, "viscosita": "5W-40", "norma": "Fiat 9.55535-S1"}, "Fiat||Panda III||1.0 Hybrid 70cv": {"litri": 3.5, "viscosita": "0W-20", "norma": "Fiat 9.55535-GS1"}, "Fiat||Panda III||1.3 MultiJet 95cv 4x4": {"litri": 3.6, "viscosita": "5W-30", "norma": "Fiat 9.55535-S1"}, "Volkswagen||Golf (VI/VII/VIII)||1.4 TSI 125cv": {"litri": 4.3, "viscosita": "5W-30", "norma": "VW 504.00/507.00"}, "Volkswagen||Golf (VI/VII/VIII)||2.0 TDI 150cv": {"litri": 4.3, "viscosita": "5W-30", "norma": "VW 504.00/507.00"}, "Volkswagen||Golf (VI/VII/VIII)||1.5 eTSI 150cv MHEV": {"litri": 4.5, "viscosita": "0W-20", "norma": "VW 508.00/509.00"}, "Volkswagen||Polo (5/6)||1.0 TSI 95cv": {"litri": 3.8, "viscosita": "5W-30", "norma": "VW 504.00/507.00"}, "Volkswagen||Tiguan (5N/AD)||2.0 TDI 150cv": {"litri": 4.3, "viscosita": "5W-30", "norma": "VW 507.00"}, "Audi||A3 (8V/8Y)||2.0 TDI 150cv": {"litri": 4.3, "viscosita": "5W-30", "norma": "VW 507.00"}, "Audi||A4 (B8/B9)||2.0 TFSI 190cv": {"litri": 4.6, "viscosita": "5W-30", "norma": "VW 504.00"}, "Skoda||Octavia (II/III/IV)||2.0 TDI 150cv": {"litri": 4.3, "viscosita": "5W-30", "norma": "VW 507.00"}, "BMW||Serie 3 (E90/F30/G20)||320d 184cv": {"litri": 5.5, "viscosita": "5W-30", "norma": "BMW Longlife-04"}, "BMW||Serie 3 (E90/F30/G20)||320i 184cv": {"litri": 5.0, "viscosita": "5W-30", "norma": "BMW Longlife-01"}, "BMW||Serie 5 (F10/G30)||520d 184cv": {"litri": 5.5, "viscosita": "5W-30", "norma": "BMW Longlife-04"}, "BMW||X3 (E83/F25/G01)||xDrive20d 184cv": {"litri": 5.5, "viscosita": "5W-30", "norma": "BMW Longlife-04"}, "Mercedes-Benz||Classe C (W204/W205/W206)||C220d 170cv": {"litri": 6.5, "viscosita": "5W-30", "norma": "MB 229.51"}, "Mercedes-Benz||Classe C (W204/W205/W206)||C200 184cv": {"litri": 5.5, "viscosita": "5W-30", "norma": "MB 229.5"}, "Mercedes-Benz||Classe E (W212/W213)||E220 CDI 170cv": {"litri": 7.0, "viscosita": "5W-30", "norma": "MB 229.51"}, "Toyota||Yaris (XP10/XP13/XP210)||1.5 Hybrid 116cv": {"litri": 3.9, "viscosita": "0W-20", "norma": "Toyota WS"}, "Toyota||Corolla (E120/E140/E170/E210)||1.8 Hybrid 122cv": {"litri": 4.2, "viscosita": "0W-20", "norma": "Toyota WS"}, "Toyota||RAV4 (XA30/XA40/XA50)||2.5 Hybrid 218cv": {"litri": 4.7, "viscosita": "0W-20", "norma": "Toyota WS"}, "Alfa Romeo||Giulia||2.0T 200cv": {"litri": 5.0, "viscosita": "5W-40", "norma": "Fiat 9.55535-GH2"}, "Alfa Romeo||Giulia||2.2 JTDm 180cv": {"litri": 5.5, "viscosita": "5W-30", "norma": "Fiat 9.55535-DS1"}, "Alfa Romeo||Stelvio||2.0T 200cv": {"litri": 5.0, "viscosita": "5W-40", "norma": "Fiat 9.55535-GH2"}, "Renault||Clio (III/IV/V)||1.0 TCe 100cv": {"litri": 4.0, "viscosita": "5W-40", "norma": "RN0700"}, "Renault||Mégane (III/IV)||1.3 TCe 140cv": {"litri": 4.8, "viscosita": "5W-30", "norma": "RN0700/RN0710"}, "Ford||Focus (III/IV)||1.0 EcoBoost 125cv": {"litri": 3.8, "viscosita": "5W-20", "norma": "WSS-M2C948-B"}, "Ford||Fiesta (VI/VII)||1.0 EcoBoost 125cv": {"litri": 3.5, "viscosita": "5W-20", "norma": "WSS-M2C948-B"}, "Peugeot||208 (I/II)||1.2 PureTech 100cv": {"litri": 3.5, "viscosita": "5W-30", "norma": "PSA B71 2290"}, "Peugeot||308 (I/II/III)||1.5 BlueHDi 130cv": {"litri": 4.2, "viscosita": "5W-30", "norma": "PSA B71 2312"}, "Citroën||C3 (II/III)||1.2 PureTech 110cv": {"litri": 3.5, "viscosita": "5W-30", "norma": "PSA B71 2290"}, "Opel||Corsa (D/E/F)||1.2 T 100cv": {"litri": 4.0, "viscosita": "5W-30", "norma": "dexos2"}, "Opel||Astra (H/J/K/L)||1.4 Turbo 140cv": {"litri": 4.0, "viscosita": "5W-30", "norma": "dexos2"}, "Honda||Civic (IX/X/XI)||1.5 VTEC Turbo 182cv": {"litri": 3.7, "viscosita": "0W-20", "norma": "Honda HTO-06"}, "Honda||CR-V (IV/V)||1.5 VTEC Turbo 173cv": {"litri": 3.9, "viscosita": "0W-20", "norma": "Honda HTO-06"}};
const TYRE_P = {"Alfa Romeo||Giulia": {"2016–2024": {"225/45 R17": [2.3, 2.3], "225/40 R18": [2.4, 2.4], "225/35 R19": [2.5, 2.5], "default": [2.3, 2.3]}}, "Alfa Romeo||Stelvio": {"2017–2024": {"225/60 R18": [2.3, 2.3], "235/55 R19": [2.4, 2.4], "default": [2.3, 2.3]}}, "Alfa Romeo||Giulietta": {"2010–2020": {"205/55 R16": [2.2, 2.1], "225/45 R17": [2.3, 2.2], "default": [2.2, 2.1]}}, "Alfa Romeo||Mito": {"2008–2018": {"195/55 R16": [2.2, 2.0], "205/45 R17": [2.3, 2.1], "default": [2.2, 2.0]}}, "Fiat||500 (312)": {"2007–2024": {"185/55 R15": [2.2, 2.0], "195/45 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Fiat||Panda III": {"2012–2024": {"175/65 R14": [2.2, 2.0], "185/55 R15": [2.2, 2.0], "default": [2.2, 2.0]}}, "Fiat||Tipo (356)": {"2016–2024": {"195/65 R15": [2.3, 2.1], "205/55 R16": [2.3, 2.1], "default": [2.3, 2.1]}}, "Volkswagen||Golf (VI/VII/VIII)": {"2008–2024": {"195/65 R15": [2.2, 2.1], "205/55 R16": [2.3, 2.2], "225/45 R17": [2.4, 2.3], "225/40 R18": [2.5, 2.4], "default": [2.3, 2.2]}}, "Volkswagen||Polo (5/6)": {"2009–2024": {"185/65 R15": [2.2, 2.0], "195/55 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Volkswagen||Tiguan (5N/AD)": {"2007–2024": {"215/65 R16": [2.3, 2.2], "215/60 R17": [2.4, 2.3], "235/55 R17": [2.4, 2.3], "235/50 R18": [2.5, 2.4], "default": [2.4, 2.3]}}, "Volkswagen||Passat (B7/B8)": {"2011–2024": {"205/60 R16": [2.3, 2.2], "215/55 R17": [2.4, 2.3], "default": [2.3, 2.2]}}, "BMW||Serie 3 (E90/F30/G20)": {"2005–2024": {"205/55 R16": [2.2, 2.2], "225/45 R17": [2.3, 2.5], "225/40 R18": [2.3, 2.6], "default": [2.3, 2.5]}}, "BMW||Serie 5 (F10/G30)": {"2010–2024": {"225/55 R17": [2.3, 2.3], "245/45 R18": [2.4, 2.6], "245/40 R19": [2.4, 2.6], "default": [2.4, 2.6]}}, "BMW||X3 (E83/F25/G01)": {"2003–2024": {"225/55 R17": [2.4, 2.4], "245/50 R18": [2.5, 2.5], "default": [2.4, 2.4]}}, "BMW||X5 (E53/E70/F15/G05)": {"2000–2024": {"255/55 R18": [2.5, 2.5], "275/45 R19": [2.6, 2.6], "default": [2.5, 2.5]}}, "Mercedes-Benz||Classe C (W204/W205/W206)": {"2007–2024": {"205/60 R16": [2.3, 2.3], "225/50 R17": [2.4, 2.4], "225/45 R18": [2.5, 2.5], "default": [2.3, 2.3]}}, "Mercedes-Benz||Classe E (W212/W213)": {"2009–2024": {"225/55 R17": [2.4, 2.4], "245/45 R18": [2.5, 2.5], "245/40 R19": [2.5, 2.5], "default": [2.4, 2.4]}}, "Mercedes-Benz||GLC (X253/X254)": {"2015–2024": {"235/60 R18": [2.5, 2.5], "255/50 R19": [2.6, 2.6], "default": [2.5, 2.5]}}, "Audi||A3 (8V/8Y)": {"2012–2024": {"195/65 R15": [2.2, 2.1], "225/45 R17": [2.4, 2.3], "225/40 R18": [2.5, 2.4], "default": [2.3, 2.2]}}, "Audi||A4 (B8/B9)": {"2008–2024": {"205/60 R16": [2.3, 2.2], "225/50 R17": [2.4, 2.3], "245/40 R18": [2.5, 2.4], "default": [2.4, 2.3]}}, "Audi||Q5 (8R/FY)": {"2008–2024": {"235/65 R17": [2.4, 2.4], "255/55 R18": [2.5, 2.5], "default": [2.4, 2.4]}}, "Toyota||Yaris (XP10/XP13/XP210)": {"1999–2024": {"175/65 R14": [2.2, 2.0], "185/55 R15": [2.3, 2.1], "default": [2.2, 2.0]}}, "Toyota||Corolla (E120/E140/E170/E210)": {"2002–2024": {"195/65 R15": [2.3, 2.1], "215/45 R17": [2.4, 2.2], "default": [2.3, 2.1]}}, "Toyota||RAV4 (XA30/XA40/XA50)": {"2006–2024": {"225/65 R17": [2.3, 2.3], "235/55 R18": [2.4, 2.4], "default": [2.3, 2.3]}}, "Toyota||C-HR": {"2016–2024": {"215/60 R17": [2.3, 2.3], "225/50 R18": [2.4, 2.4], "default": [2.3, 2.3]}}, "Renault||Clio (III/IV/V)": {"2005–2024": {"185/65 R15": [2.2, 2.0], "195/55 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Renault||Mégane (III/IV)": {"2008–2022": {"205/55 R16": [2.3, 2.1], "215/45 R17": [2.4, 2.2], "default": [2.3, 2.1]}}, "Renault||Captur (I/II)": {"2013–2024": {"195/60 R16": [2.3, 2.1], "215/50 R17": [2.4, 2.2], "default": [2.3, 2.1]}}, "Peugeot||208 (I/II)": {"2012–2024": {"185/65 R15": [2.2, 2.0], "195/55 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Peugeot||308 (I/II/III)": {"2007–2024": {"205/55 R16": [2.3, 2.1], "225/45 R17": [2.4, 2.2], "default": [2.3, 2.1]}}, "Opel||Corsa (D/E/F)": {"2006–2024": {"185/65 R15": [2.2, 2.0], "195/55 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Opel||Astra (H/J/K/L)": {"2004–2024": {"205/55 R16": [2.3, 2.1], "225/45 R17": [2.4, 2.2], "default": [2.3, 2.1]}}, "Ford||Focus (III/IV)": {"2011–2024": {"205/55 R16": [2.3, 2.1], "215/50 R17": [2.4, 2.2], "default": [2.3, 2.1]}}, "Ford||Fiesta (VI/VII)": {"2008–2023": {"185/60 R15": [2.2, 2.0], "195/50 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Ford||Kuga (II/III)": {"2012–2024": {"215/65 R16": [2.3, 2.2], "235/50 R18": [2.5, 2.4], "default": [2.4, 2.3]}}, "Honda||Civic (IX/X/XI)": {"2012–2024": {"205/55 R16": [2.3, 2.2], "235/40 R18": [2.5, 2.4], "default": [2.3, 2.2]}}, "Honda||CR-V (IV/V)": {"2012–2024": {"225/65 R17": [2.4, 2.4], "235/55 R19": [2.5, 2.5], "default": [2.4, 2.4]}}, "Hyundai||Tucson (III/IV)": {"2015–2024": {"225/60 R17": [2.3, 2.3], "235/55 R18": [2.4, 2.4], "default": [2.3, 2.3]}}, "Hyundai||i30 (II/III)": {"2012–2024": {"195/65 R15": [2.2, 2.0], "205/55 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Kia||Sportage (III/IV/V)": {"2010–2024": {"215/65 R16": [2.3, 2.3], "235/55 R18": [2.4, 2.4], "default": [2.3, 2.3]}}, "Nissan||Qashqai (J10/J11/J12)": {"2007–2024": {"215/60 R17": [2.3, 2.3], "225/55 R18": [2.4, 2.4], "default": [2.3, 2.3]}}, "Skoda||Octavia (II/III/IV)": {"2004–2024": {"205/55 R16": [2.3, 2.2], "225/45 R17": [2.4, 2.3], "default": [2.3, 2.2]}}, "SEAT||Leon (II/III/IV)": {"2005–2024": {"205/55 R16": [2.3, 2.1], "225/45 R17": [2.4, 2.2], "default": [2.3, 2.1]}}, "Mazda||CX-5 (KE/KF)": {"2012–2024": {"225/65 R17": [2.3, 2.3], "225/55 R19": [2.5, 2.5], "default": [2.3, 2.3]}}, "Mini||Mini (R56/R58/F56)": {"2006–2024": {"185/65 R15": [2.2, 2.1], "205/45 R17": [2.4, 2.3], "default": [2.3, 2.2]}}, "Land Rover||Discovery Sport (L550)": {"2015–2024": {"235/65 R17": [2.4, 2.4], "235/55 R19": [2.6, 2.6], "default": [2.4, 2.4]}}, "Land Rover||Range Rover Evoque (L538/L551)": {"2011–2024": {"235/60 R18": [2.5, 2.5], "235/55 R19": [2.6, 2.6], "default": [2.5, 2.5]}}, "Porsche||Macan (95B/J1)": {"2014–2024": {"235/60 R18": [2.6, 2.8], "265/45 R20": [2.7, 2.9], "default": [2.6, 2.8]}}, "Porsche||Cayenne (9PA/92A/9YA)": {"2002–2024": {"255/55 R18": [2.6, 2.8], "285/45 R20": [2.7, 2.9], "default": [2.6, 2.8]}}, "Volvo||XC60 (I/II)": {"2008–2024": {"235/65 R17": [2.4, 2.4], "235/50 R19": [2.6, 2.6], "default": [2.4, 2.4]}}, "Volvo||XC40": {"2018–2024": {"235/60 R18": [2.5, 2.5], "235/50 R19": [2.6, 2.6], "default": [2.5, 2.5]}}, "Dacia||Duster (I/II)": {"2010–2024": {"215/65 R16": [2.2, 2.2], "215/60 R17": [2.3, 2.3], "default": [2.2, 2.2]}}, "Dacia||Sandero (II/III)": {"2013–2024": {"185/65 R15": [2.2, 2.0], "195/55 R16": [2.3, 2.1], "default": [2.2, 2.0]}}, "Subaru||Forester (SG/SH/SJ/SK)": {"2002–2024": {"215/65 R16": [2.3, 2.3], "225/55 R17": [2.4, 2.4], "default": [2.3, 2.3]}}, "Subaru||Outback (BP/BR/BS/BT)": {"2003–2024": {"225/60 R17": [2.3, 2.3], "225/55 R18": [2.4, 2.4], "default": [2.3, 2.3]}}};
