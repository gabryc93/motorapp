

/* ════════════════════════════════════════════════════════════════
   AutoHub — Vehicle specs auto-fill database
   Curated dataset of popular Italian-market vehicles. Only the fields
   we don't know are left null — never invent numbers.
   Schema per entry:
     { marca, modello, anni: [start, end], variant?,
       cv, nm, peso, cc, kmh0_100, vmax, cambio, trazione, alim }
   ════════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var AUTO_DB = [
    // ─── Fiat ───
    { marca:'Fiat', modello:'Panda', anni:[2012,2024], cv:69, nm:102, peso:940, cc:1242, kmh0_100:14.2, vmax:164, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Fiat', modello:'500', anni:[2007,2024], cv:69, nm:102, peso:940, cc:1242, kmh0_100:12.9, vmax:160, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Fiat', modello:'500 Abarth', anni:[2008,2024], cv:165, nm:230, peso:1035, cc:1368, kmh0_100:7.4, vmax:211, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Fiat', modello:'Tipo', anni:[2015,2024], cv:120, nm:200, peso:1320, cc:1368, kmh0_100:9.7, vmax:200, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Fiat', modello:'500X', anni:[2014,2024], cv:120, nm:215, peso:1395, cc:1332, kmh0_100:10.5, vmax:188, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Fiat', modello:'Punto', anni:[2005,2018], cv:77, nm:115, peso:1080, cc:1242, kmh0_100:13.5, vmax:170, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    // ─── Alfa Romeo ───
    { marca:'Alfa Romeo', modello:'Giulia', anni:[2016,2024], cv:200, nm:330, peso:1429, cc:1995, kmh0_100:6.6, vmax:235, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Alfa Romeo', modello:'Giulia Quadrifoglio', anni:[2016,2024], cv:510, nm:600, peso:1580, cc:2891, kmh0_100:3.9, vmax:307, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Alfa Romeo', modello:'Stelvio', anni:[2017,2024], cv:200, nm:330, peso:1660, cc:1995, kmh0_100:7.2, vmax:215, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Alfa Romeo', modello:'Stelvio Quadrifoglio', anni:[2017,2024], cv:510, nm:600, peso:1830, cc:2891, kmh0_100:3.8, vmax:283, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Alfa Romeo', modello:'Tonale', anni:[2022,2025], cv:160, nm:240, peso:1525, cc:1469, kmh0_100:9.3, vmax:212, cambio:'dct', trazione:'fwd', alim:'ibrida' },
    { marca:'Alfa Romeo', modello:'Mito', anni:[2008,2018], cv:120, nm:215, peso:1145, cc:1368, kmh0_100:8.8, vmax:198, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    // ─── Lancia ───
    { marca:'Lancia', modello:'Ypsilon', anni:[2011,2024], cv:69, nm:102, peso:980, cc:1242, kmh0_100:13.7, vmax:160, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    // ─── BMW ───
    { marca:'BMW', modello:'Serie 1', anni:[2019,2024], cv:178, nm:280, peso:1465, cc:1998, kmh0_100:7.1, vmax:235, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'BMW', modello:'Serie 3', anni:[2018,2024], cv:184, nm:300, peso:1545, cc:1998, kmh0_100:7.1, vmax:235, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'BMW', modello:'M3', anni:[2021,2024], cv:510, nm:650, peso:1730, cc:2993, kmh0_100:3.5, vmax:290, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'BMW', modello:'M3 Competition', anni:[2014,2020], cv:450, nm:550, peso:1635, cc:2979, kmh0_100:4.0, vmax:290, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'BMW', modello:'M2', anni:[2016,2024], cv:460, nm:550, peso:1725, cc:2993, kmh0_100:4.1, vmax:285, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'BMW', modello:'X1', anni:[2015,2024], cv:150, nm:250, peso:1535, cc:1499, kmh0_100:9.7, vmax:205, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'BMW', modello:'X3', anni:[2017,2024], cv:184, nm:400, peso:1820, cc:1995, kmh0_100:8.0, vmax:213, cambio:'automatico', trazione:'awd', alim:'diesel' },
    { marca:'BMW', modello:'X5', anni:[2018,2024], cv:265, nm:620, peso:2185, cc:2993, kmh0_100:6.5, vmax:230, cambio:'automatico', trazione:'awd', alim:'diesel' },
    // ─── Mercedes ───
    { marca:'Mercedes', modello:'Classe A', anni:[2018,2024], cv:163, nm:250, peso:1395, cc:1332, kmh0_100:8.2, vmax:225, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Mercedes', modello:'A45 AMG', anni:[2020,2024], cv:421, nm:500, peso:1620, cc:1991, kmh0_100:3.9, vmax:270, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Mercedes', modello:'Classe C', anni:[2021,2024], cv:204, nm:300, peso:1655, cc:1999, kmh0_100:7.3, vmax:246, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Mercedes', modello:'C63 AMG', anni:[2014,2020], cv:476, nm:650, peso:1745, cc:3982, kmh0_100:4.1, vmax:250, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Mercedes', modello:'GLA', anni:[2020,2024], cv:163, nm:250, peso:1530, cc:1332, kmh0_100:8.7, vmax:215, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Mercedes', modello:'GLC', anni:[2022,2024], cv:258, nm:400, peso:1900, cc:1999, kmh0_100:6.2, vmax:240, cambio:'automatico', trazione:'awd', alim:'ibrida' },
    // ─── Audi ───
    { marca:'Audi', modello:'A1', anni:[2018,2024], cv:116, nm:200, peso:1175, cc:999, kmh0_100:9.4, vmax:203, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Audi', modello:'A3', anni:[2020,2024], cv:150, nm:250, peso:1370, cc:1498, kmh0_100:8.4, vmax:224, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Audi', modello:'S3', anni:[2020,2024], cv:310, nm:400, peso:1545, cc:1984, kmh0_100:4.8, vmax:250, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'RS3', anni:[2021,2024], cv:400, nm:500, peso:1565, cc:2480, kmh0_100:3.8, vmax:290, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'A4', anni:[2019,2024], cv:204, nm:320, peso:1525, cc:1984, kmh0_100:7.3, vmax:241, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Audi', modello:'Q3', anni:[2018,2024], cv:150, nm:250, peso:1545, cc:1498, kmh0_100:9.3, vmax:207, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Audi', modello:'Q5', anni:[2020,2024], cv:204, nm:400, peso:1860, cc:1968, kmh0_100:7.6, vmax:222, cambio:'dct', trazione:'awd', alim:'diesel' },
    // ─── Volkswagen ───
    { marca:'Volkswagen', modello:'Polo', anni:[2017,2024], cv:95, nm:175, peso:1185, cc:999, kmh0_100:10.8, vmax:187, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'Golf', anni:[2020,2024], cv:130, nm:200, peso:1320, cc:1498, kmh0_100:9.2, vmax:212, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'Golf GTI', anni:[2020,2024], cv:245, nm:370, peso:1462, cc:1984, kmh0_100:6.3, vmax:250, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'Golf R', anni:[2021,2024], cv:320, nm:420, peso:1564, cc:1984, kmh0_100:4.7, vmax:270, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Volkswagen', modello:'T-Roc', anni:[2018,2024], cv:150, nm:250, peso:1380, cc:1498, kmh0_100:8.4, vmax:206, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'Tiguan', anni:[2016,2024], cv:150, nm:250, peso:1620, cc:1498, kmh0_100:9.2, vmax:202, cambio:'dct', trazione:'fwd', alim:'benzina' },
    // ─── Peugeot/Citroen/Renault ───
    { marca:'Peugeot', modello:'208', anni:[2019,2024], cv:100, nm:205, peso:1090, cc:1199, kmh0_100:9.9, vmax:188, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Peugeot', modello:'308', anni:[2021,2024], cv:130, nm:230, peso:1320, cc:1199, kmh0_100:10.1, vmax:206, cambio:'automatico', trazione:'fwd', alim:'benzina' },
    { marca:'Peugeot', modello:'3008', anni:[2017,2024], cv:130, nm:230, peso:1370, cc:1199, kmh0_100:10.8, vmax:188, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Renault', modello:'Clio', anni:[2019,2024], cv:91, nm:160, peso:1090, cc:999, kmh0_100:11.8, vmax:188, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Renault', modello:'Captur', anni:[2019,2024], cv:91, nm:160, peso:1219, cc:999, kmh0_100:13.5, vmax:171, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Renault', modello:'Megane', anni:[2016,2022], cv:140, nm:240, peso:1294, cc:1332, kmh0_100:9.1, vmax:201, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Citroen', modello:'C3', anni:[2016,2024], cv:83, nm:118, peso:1080, cc:1199, kmh0_100:13.9, vmax:174, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Citroen', modello:'C4', anni:[2020,2024], cv:130, nm:230, peso:1316, cc:1199, kmh0_100:9.5, vmax:207, cambio:'automatico', trazione:'fwd', alim:'benzina' },
    // ─── Toyota / Honda / Hyundai ───
    { marca:'Toyota', modello:'Yaris', anni:[2020,2024], cv:116, nm:120, peso:1085, cc:1490, kmh0_100:9.7, vmax:175, cambio:'cvt', trazione:'fwd', alim:'ibrida' },
    { marca:'Toyota', modello:'Corolla', anni:[2019,2024], cv:122, nm:142, peso:1320, cc:1798, kmh0_100:10.9, vmax:180, cambio:'cvt', trazione:'fwd', alim:'ibrida' },
    { marca:'Toyota', modello:'C-HR', anni:[2020,2024], cv:184, nm:190, peso:1485, cc:1987, kmh0_100:8.2, vmax:180, cambio:'cvt', trazione:'fwd', alim:'ibrida' },
    { marca:'Toyota', modello:'Yaris GR', anni:[2020,2024], cv:261, nm:360, peso:1280, cc:1618, kmh0_100:5.5, vmax:230, cambio:'manuale', trazione:'awd', alim:'benzina' },
    { marca:'Honda', modello:'Civic', anni:[2022,2024], cv:184, nm:315, peso:1518, cc:1993, kmh0_100:7.9, vmax:180, cambio:'cvt', trazione:'fwd', alim:'ibrida' },
    { marca:'Honda', modello:'Civic Type R', anni:[2017,2024], cv:329, nm:420, peso:1429, cc:1996, kmh0_100:5.4, vmax:272, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Hyundai', modello:'Tucson', anni:[2021,2024], cv:150, nm:250, peso:1465, cc:1598, kmh0_100:9.6, vmax:201, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Hyundai', modello:'i30 N', anni:[2017,2024], cv:280, nm:392, peso:1467, cc:1998, kmh0_100:5.9, vmax:250, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    // ─── Ford ───
    { marca:'Ford', modello:'Fiesta', anni:[2017,2023], cv:100, nm:170, peso:1170, cc:998, kmh0_100:10.5, vmax:185, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Ford', modello:'Focus', anni:[2018,2024], cv:125, nm:200, peso:1340, cc:998, kmh0_100:10.2, vmax:200, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Ford', modello:'Focus ST', anni:[2019,2024], cv:280, nm:420, peso:1454, cc:2261, kmh0_100:5.7, vmax:250, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Ford', modello:'Mustang GT', anni:[2018,2024], cv:450, nm:529, peso:1738, cc:5038, kmh0_100:4.8, vmax:250, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    // ─── Sportive ───
    { marca:'Porsche', modello:'911 Carrera', anni:[2019,2024], cv:385, nm:450, peso:1505, cc:2981, kmh0_100:4.2, vmax:293, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Porsche', modello:'911 Turbo S', anni:[2020,2024], cv:650, nm:800, peso:1640, cc:3745, kmh0_100:2.7, vmax:330, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Porsche', modello:'Cayman', anni:[2017,2024], cv:300, nm:380, peso:1365, cc:1988, kmh0_100:5.1, vmax:275, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Porsche', modello:'Macan', anni:[2019,2024], cv:265, nm:400, peso:1845, cc:1984, kmh0_100:6.7, vmax:232, cambio:'dct', trazione:'awd', alim:'benzina' },
    // ─── Mini ───
    { marca:'Mini', modello:'Cooper', anni:[2014,2024], cv:136, nm:220, peso:1160, cc:1499, kmh0_100:7.9, vmax:210, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Mini', modello:'Cooper S', anni:[2014,2024], cv:178, nm:280, peso:1240, cc:1998, kmh0_100:6.8, vmax:235, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Mini', modello:'JCW', anni:[2015,2024], cv:231, nm:320, peso:1280, cc:1998, kmh0_100:6.1, vmax:246, cambio:'manuale', trazione:'fwd', alim:'benzina' },

    // ─── Alfa Romeo (storici) ───
    { marca:'Alfa Romeo', modello:'Giulietta', anni:[2010,2020], cv:170, nm:250, peso:1320, cc:1368, kmh0_100:7.7, vmax:218, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Alfa Romeo', modello:'Giulietta QV', anni:[2014,2020], cv:240, nm:340, peso:1395, cc:1742, kmh0_100:6.0, vmax:244, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Alfa Romeo', modello:'4C', anni:[2013,2020], cv:240, nm:350, peso:895, cc:1742, kmh0_100:4.5, vmax:258, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Alfa Romeo', modello:'159', anni:[2005,2011], cv:200, nm:400, peso:1610, cc:2387, kmh0_100:7.9, vmax:235, cambio:'manuale', trazione:'fwd', alim:'diesel' },
    { marca:'Alfa Romeo', modello:'Brera', anni:[2005,2010], cv:185, nm:230, peso:1505, cc:2198, kmh0_100:8.6, vmax:222, cambio:'manuale', trazione:'fwd', alim:'benzina' },

    // ─── BMW (estesi) ───
    { marca:'BMW', modello:'Serie 5', anni:[2017,2024], cv:252, nm:350, peso:1645, cc:1998, kmh0_100:6.2, vmax:250, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'BMW', modello:'M5 Competition', anni:[2018,2024], cv:625, nm:750, peso:1855, cc:4395, kmh0_100:3.3, vmax:305, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'BMW', modello:'M4 Competition', anni:[2021,2024], cv:510, nm:650, peso:1745, cc:2993, kmh0_100:3.5, vmax:290, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'BMW', modello:'M8 Competition', anni:[2019,2024], cv:625, nm:750, peso:1885, cc:4395, kmh0_100:3.2, vmax:305, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'BMW', modello:'Z4 M40i', anni:[2019,2024], cv:340, nm:500, peso:1535, cc:2998, kmh0_100:4.5, vmax:250, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'BMW', modello:'X4 M Competition', anni:[2019,2024], cv:510, nm:600, peso:2020, cc:2993, kmh0_100:3.8, vmax:285, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'BMW', modello:'X6 M Competition', anni:[2020,2024], cv:625, nm:750, peso:2295, cc:4395, kmh0_100:3.8, vmax:290, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'BMW', modello:'i4 M50', anni:[2022,2024], cv:544, nm:795, peso:2290, cc:0, kmh0_100:3.9, vmax:225, cambio:'automatico', trazione:'awd', alim:'elettrica' },

    // ─── Mercedes (estesi) ───
    { marca:'Mercedes', modello:'Classe E', anni:[2016,2023], cv:258, nm:370, peso:1700, cc:1991, kmh0_100:6.4, vmax:250, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Mercedes', modello:'E63 AMG S', anni:[2017,2023], cv:612, nm:850, peso:2010, cc:3982, kmh0_100:3.4, vmax:300, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Mercedes', modello:'G63 AMG', anni:[2018,2024], cv:585, nm:850, peso:2560, cc:3982, kmh0_100:4.5, vmax:240, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Mercedes', modello:'AMG GT', anni:[2014,2021], cv:476, nm:630, peso:1645, cc:3982, kmh0_100:4.0, vmax:304, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Mercedes', modello:'AMG GT R', anni:[2016,2021], cv:585, nm:700, peso:1555, cc:3982, kmh0_100:3.6, vmax:318, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Mercedes', modello:'CLA', anni:[2019,2024], cv:163, nm:250, peso:1410, cc:1332, kmh0_100:8.5, vmax:225, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Mercedes', modello:'CLA 45 AMG', anni:[2019,2024], cv:421, nm:500, peso:1620, cc:1991, kmh0_100:4.0, vmax:270, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Mercedes', modello:'GLE', anni:[2019,2024], cv:367, nm:500, peso:2185, cc:2999, kmh0_100:5.7, vmax:250, cambio:'automatico', trazione:'awd', alim:'benzina' },

    // ─── Audi (estesi) ───
    { marca:'Audi', modello:'A5', anni:[2016,2024], cv:190, nm:320, peso:1480, cc:1984, kmh0_100:7.7, vmax:240, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Audi', modello:'RS5', anni:[2017,2024], cv:450, nm:600, peso:1655, cc:2894, kmh0_100:3.9, vmax:250, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'A6', anni:[2018,2024], cv:204, nm:370, peso:1700, cc:1984, kmh0_100:7.9, vmax:241, cambio:'automatico', trazione:'fwd', alim:'benzina' },
    { marca:'Audi', modello:'RS6 Avant', anni:[2019,2024], cv:600, nm:800, peso:2075, cc:3996, kmh0_100:3.6, vmax:305, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'RS7 Sportback', anni:[2019,2024], cv:600, nm:800, peso:2065, cc:3996, kmh0_100:3.6, vmax:305, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'Q7', anni:[2019,2024], cv:286, nm:600, peso:2070, cc:2967, kmh0_100:6.5, vmax:241, cambio:'automatico', trazione:'awd', alim:'diesel' },
    { marca:'Audi', modello:'Q8', anni:[2018,2024], cv:340, nm:500, peso:2145, cc:2995, kmh0_100:5.9, vmax:250, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'TT', anni:[2014,2023], cv:230, nm:370, peso:1335, cc:1984, kmh0_100:6.0, vmax:250, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Audi', modello:'TT RS', anni:[2016,2023], cv:400, nm:480, peso:1450, cc:2480, kmh0_100:3.7, vmax:250, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'R8 V10', anni:[2015,2024], cv:570, nm:540, peso:1660, cc:5204, kmh0_100:3.4, vmax:330, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Audi', modello:'e-tron GT', anni:[2021,2024], cv:530, nm:640, peso:2300, cc:0, kmh0_100:4.1, vmax:245, cambio:'automatico', trazione:'awd', alim:'elettrica' },

    // ─── Volkswagen (estesi) ───
    { marca:'Volkswagen', modello:'Up GTI', anni:[2018,2024], cv:115, nm:200, peso:1080, cc:999, kmh0_100:8.8, vmax:196, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'Polo GTI', anni:[2017,2024], cv:207, nm:320, peso:1255, cc:1984, kmh0_100:6.7, vmax:240, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'Passat', anni:[2014,2024], cv:150, nm:250, peso:1450, cc:1498, kmh0_100:9.1, vmax:215, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'Arteon', anni:[2017,2024], cv:190, nm:320, peso:1604, cc:1984, kmh0_100:8.3, vmax:225, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Volkswagen', modello:'ID.3', anni:[2020,2024], cv:204, nm:310, peso:1812, cc:0, kmh0_100:7.3, vmax:160, cambio:'automatico', trazione:'rwd', alim:'elettrica' },
    { marca:'Volkswagen', modello:'ID.4', anni:[2020,2024], cv:204, nm:310, peso:2125, cc:0, kmh0_100:8.5, vmax:160, cambio:'automatico', trazione:'rwd', alim:'elettrica' },
    { marca:'Volkswagen', modello:'Touareg', anni:[2018,2024], cv:286, nm:600, peso:2070, cc:2967, kmh0_100:6.1, vmax:235, cambio:'automatico', trazione:'awd', alim:'diesel' },

    // ─── Skoda ───
    { marca:'Skoda', modello:'Octavia', anni:[2019,2024], cv:150, nm:250, peso:1400, cc:1498, kmh0_100:8.5, vmax:223, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Skoda', modello:'Octavia RS', anni:[2020,2024], cv:245, nm:370, peso:1450, cc:1984, kmh0_100:6.7, vmax:250, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Skoda', modello:'Superb', anni:[2015,2024], cv:190, nm:320, peso:1550, cc:1984, kmh0_100:7.7, vmax:235, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Skoda', modello:'Kodiaq', anni:[2016,2024], cv:190, nm:320, peso:1715, cc:1984, kmh0_100:8.2, vmax:213, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Skoda', modello:'Fabia', anni:[2021,2024], cv:95, nm:175, peso:1180, cc:999, kmh0_100:10.6, vmax:185, cambio:'manuale', trazione:'fwd', alim:'benzina' },

    // ─── Volvo ───
    { marca:'Volvo', modello:'XC40', anni:[2017,2024], cv:197, nm:300, peso:1670, cc:1969, kmh0_100:8.4, vmax:210, cambio:'automatico', trazione:'fwd', alim:'benzina' },
    { marca:'Volvo', modello:'XC60', anni:[2017,2024], cv:197, nm:300, peso:1830, cc:1969, kmh0_100:7.8, vmax:220, cambio:'automatico', trazione:'fwd', alim:'benzina' },
    { marca:'Volvo', modello:'XC90 T8', anni:[2015,2024], cv:455, nm:709, peso:2300, cc:1969, kmh0_100:5.3, vmax:180, cambio:'automatico', trazione:'awd', alim:'ibrida' },

    // ─── Mazda ───
    { marca:'Mazda', modello:'MX-5', anni:[2015,2024], cv:184, nm:205, peso:1050, cc:1998, kmh0_100:6.5, vmax:219, cambio:'manuale', trazione:'rwd', alim:'benzina' },
    { marca:'Mazda', modello:'CX-5', anni:[2017,2024], cv:165, nm:213, peso:1580, cc:1998, kmh0_100:9.9, vmax:200, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Mazda', modello:'3', anni:[2019,2024], cv:122, nm:213, peso:1340, cc:1998, kmh0_100:10.4, vmax:197, cambio:'manuale', trazione:'fwd', alim:'benzina' },

    // ─── Nissan ───
    { marca:'Nissan', modello:'Qashqai', anni:[2021,2024], cv:158, nm:270, peso:1570, cc:1332, kmh0_100:9.5, vmax:198, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Nissan', modello:'GT-R', anni:[2017,2024], cv:570, nm:637, peso:1752, cc:3799, kmh0_100:2.9, vmax:315, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Nissan', modello:'370Z', anni:[2009,2020], cv:328, nm:363, peso:1496, cc:3696, kmh0_100:5.3, vmax:250, cambio:'manuale', trazione:'rwd', alim:'benzina' },

    // ─── Hyundai / Kia ───
    { marca:'Hyundai', modello:'i30 N Performance', anni:[2017,2024], cv:280, nm:392, peso:1467, cc:1998, kmh0_100:5.9, vmax:250, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Hyundai', modello:'Ioniq 5', anni:[2021,2024], cv:305, nm:605, peso:2100, cc:0, kmh0_100:5.2, vmax:185, cambio:'automatico', trazione:'awd', alim:'elettrica' },
    { marca:'Kia', modello:'Sportage', anni:[2021,2024], cv:150, nm:250, peso:1545, cc:1598, kmh0_100:9.4, vmax:201, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Kia', modello:'EV6 GT', anni:[2022,2024], cv:585, nm:740, peso:2160, cc:0, kmh0_100:3.5, vmax:260, cambio:'automatico', trazione:'awd', alim:'elettrica' },

    // ─── Opel / Dacia / Seat / Cupra ───
    { marca:'Opel', modello:'Corsa', anni:[2019,2024], cv:100, nm:205, peso:1158, cc:1199, kmh0_100:10.0, vmax:188, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Opel', modello:'Astra', anni:[2021,2024], cv:130, nm:230, peso:1330, cc:1199, kmh0_100:10.6, vmax:210, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Opel', modello:'Mokka', anni:[2020,2024], cv:130, nm:230, peso:1240, cc:1199, kmh0_100:9.2, vmax:202, cambio:'automatico', trazione:'fwd', alim:'benzina' },
    { marca:'Dacia', modello:'Sandero', anni:[2020,2024], cv:91, nm:160, peso:1148, cc:999, kmh0_100:11.7, vmax:184, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Dacia', modello:'Duster', anni:[2017,2024], cv:91, nm:160, peso:1346, cc:999, kmh0_100:13.5, vmax:166, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Seat', modello:'Ibiza', anni:[2017,2024], cv:110, nm:200, peso:1186, cc:999, kmh0_100:10.2, vmax:200, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Seat', modello:'Leon', anni:[2020,2024], cv:150, nm:250, peso:1340, cc:1498, kmh0_100:8.4, vmax:223, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Cupra', modello:'Formentor', anni:[2020,2024], cv:310, nm:400, peso:1645, cc:1984, kmh0_100:4.9, vmax:250, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Cupra', modello:'Formentor VZ5', anni:[2021,2024], cv:390, nm:480, peso:1645, cc:2480, kmh0_100:4.2, vmax:250, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Cupra', modello:'Leon VZ', anni:[2020,2024], cv:245, nm:370, peso:1390, cc:1984, kmh0_100:6.4, vmax:250, cambio:'dct', trazione:'fwd', alim:'benzina' },

    // ─── Tesla ───
    { marca:'Tesla', modello:'Model 3', anni:[2017,2024], cv:283, nm:493, peso:1845, cc:0, kmh0_100:4.4, vmax:233, cambio:'automatico', trazione:'awd', alim:'elettrica' },
    { marca:'Tesla', modello:'Model 3 Performance', anni:[2018,2024], cv:510, nm:660, peso:1844, cc:0, kmh0_100:3.3, vmax:261, cambio:'automatico', trazione:'awd', alim:'elettrica' },
    { marca:'Tesla', modello:'Model Y', anni:[2020,2024], cv:295, nm:493, peso:1979, cc:0, kmh0_100:5.0, vmax:217, cambio:'automatico', trazione:'awd', alim:'elettrica' },
    { marca:'Tesla', modello:'Model Y Performance', anni:[2020,2024], cv:534, nm:660, peso:2003, cc:0, kmh0_100:3.7, vmax:250, cambio:'automatico', trazione:'awd', alim:'elettrica' },
    { marca:'Tesla', modello:'Model S Plaid', anni:[2021,2024], cv:1020, nm:1420, peso:2162, cc:0, kmh0_100:2.1, vmax:322, cambio:'automatico', trazione:'awd', alim:'elettrica' },

    // ─── Sportive iconiche ───
    { marca:'Toyota', modello:'Supra GR', anni:[2019,2024], cv:340, nm:500, peso:1495, cc:2998, kmh0_100:4.3, vmax:250, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Toyota', modello:'GR86', anni:[2021,2024], cv:234, nm:250, peso:1275, cc:2387, kmh0_100:6.3, vmax:226, cambio:'manuale', trazione:'rwd', alim:'benzina' },
    { marca:'Subaru', modello:'WRX STI', anni:[2014,2021], cv:300, nm:407, peso:1505, cc:2457, kmh0_100:5.2, vmax:255, cambio:'manuale', trazione:'awd', alim:'benzina' },
    { marca:'Mitsubishi', modello:'Lancer Evo X', anni:[2008,2016], cv:295, nm:407, peso:1500, cc:1998, kmh0_100:4.9, vmax:250, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Honda', modello:'NSX', anni:[2016,2022], cv:581, nm:646, peso:1725, cc:3493, kmh0_100:2.9, vmax:308, cambio:'dct', trazione:'awd', alim:'ibrida' },
    { marca:'Honda', modello:'S2000', anni:[1999,2009], cv:240, nm:208, peso:1265, cc:1997, kmh0_100:6.4, vmax:240, cambio:'manuale', trazione:'rwd', alim:'benzina' },
    { marca:'Renault', modello:'Clio RS Trophy', anni:[2018,2022], cv:220, nm:280, peso:1280, cc:1798, kmh0_100:6.6, vmax:235, cambio:'dct', trazione:'fwd', alim:'benzina' },
    { marca:'Renault', modello:'Megane RS Trophy-R', anni:[2019,2021], cv:300, nm:420, peso:1306, cc:1798, kmh0_100:5.4, vmax:262, cambio:'manuale', trazione:'fwd', alim:'benzina' },
    { marca:'Lotus', modello:'Elise', anni:[2010,2021], cv:220, nm:250, peso:924, cc:1798, kmh0_100:4.6, vmax:234, cambio:'manuale', trazione:'rwd', alim:'benzina' },
    { marca:'Lotus', modello:'Emira V6', anni:[2022,2024], cv:405, nm:430, peso:1458, cc:3456, kmh0_100:4.3, vmax:290, cambio:'manuale', trazione:'rwd', alim:'benzina' },
    { marca:'Alpine', modello:'A110', anni:[2017,2024], cv:252, nm:320, peso:1110, cc:1798, kmh0_100:4.4, vmax:260, cambio:'dct', trazione:'rwd', alim:'benzina' },

    // ─── Supercar italiane ───
    { marca:'Maserati', modello:'Ghibli', anni:[2013,2024], cv:350, nm:500, peso:1810, cc:2979, kmh0_100:5.5, vmax:267, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Maserati', modello:'Quattroporte', anni:[2013,2024], cv:530, nm:710, peso:1900, cc:3799, kmh0_100:4.7, vmax:310, cambio:'automatico', trazione:'rwd', alim:'benzina' },
    { marca:'Maserati', modello:'Levante GTS', anni:[2017,2024], cv:550, nm:730, peso:2170, cc:3799, kmh0_100:4.2, vmax:292, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Maserati', modello:'MC20', anni:[2020,2024], cv:630, nm:730, peso:1500, cc:2992, kmh0_100:2.9, vmax:325, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Lamborghini', modello:'Huracan', anni:[2014,2024], cv:610, nm:560, peso:1422, cc:5204, kmh0_100:3.2, vmax:325, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Lamborghini', modello:'Huracan Performante', anni:[2017,2019], cv:640, nm:600, peso:1382, cc:5204, kmh0_100:2.9, vmax:325, cambio:'dct', trazione:'awd', alim:'benzina' },
    { marca:'Lamborghini', modello:'Urus', anni:[2018,2024], cv:650, nm:850, peso:2197, cc:3996, kmh0_100:3.6, vmax:305, cambio:'automatico', trazione:'awd', alim:'benzina' },
    { marca:'Lamborghini', modello:'Aventador', anni:[2011,2022], cv:700, nm:690, peso:1575, cc:6498, kmh0_100:2.9, vmax:350, cambio:'sequenziale', trazione:'awd', alim:'benzina' },
    { marca:'Ferrari', modello:'488 GTB', anni:[2015,2019], cv:670, nm:760, peso:1370, cc:3902, kmh0_100:3.0, vmax:330, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Ferrari', modello:'F8 Tributo', anni:[2019,2022], cv:720, nm:770, peso:1330, cc:3902, kmh0_100:2.9, vmax:340, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Ferrari', modello:'296 GTB', anni:[2022,2024], cv:830, nm:740, peso:1470, cc:2992, kmh0_100:2.9, vmax:330, cambio:'dct', trazione:'rwd', alim:'ibrida' },
    { marca:'Ferrari', modello:'Roma', anni:[2020,2024], cv:620, nm:760, peso:1472, cc:3855, kmh0_100:3.4, vmax:320, cambio:'dct', trazione:'rwd', alim:'benzina' },
    { marca:'Ferrari', modello:'SF90 Stradale', anni:[2019,2024], cv:1000, nm:800, peso:1570, cc:3990, kmh0_100:2.5, vmax:340, cambio:'dct', trazione:'awd', alim:'ibrida' },
    { marca:'McLaren', modello:'720S', anni:[2017,2023], cv:720, nm:770, peso:1283, cc:3994, kmh0_100:2.9, vmax:341, cambio:'dct', trazione:'rwd', alim:'benzina' },
  ];

  var MOTO_DB = [
    // ─── Ducati ───
    { marca:'Ducati', modello:'Panigale V4', anni:[2018,2024], cv:215, nm:124, peso:198, cc:1103, kmh0_100:2.9, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Panigale V2', anni:[2020,2024], cv:155, nm:104, peso:200, cc:955, kmh0_100:3.1, vmax:260, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Streetfighter V4', anni:[2020,2024], cv:208, nm:123, peso:201, cc:1103, kmh0_100:3.0, vmax:280, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Monster', anni:[2021,2024], cv:111, nm:93, peso:188, cc:937, kmh0_100:3.5, vmax:225, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Multistrada V4', anni:[2021,2024], cv:170, nm:125, peso:243, cc:1158, kmh0_100:3.3, vmax:265, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Diavel V4', anni:[2023,2024], cv:168, nm:126, peso:236, cc:1158, kmh0_100:3.2, vmax:260, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Scrambler', anni:[2015,2024], cv:73, nm:65, peso:185, cc:803, kmh0_100:4.2, vmax:200, cambio:'sequenziale', trazione:'catena' },
    // ─── Aprilia ───
    { marca:'Aprilia', modello:'RSV4', anni:[2021,2024], cv:217, nm:125, peso:202, cc:1099, kmh0_100:2.9, vmax:300, cambio:'sequenziale', trazione:'catena' },
    { marca:'Aprilia', modello:'Tuono V4', anni:[2021,2024], cv:175, nm:121, peso:209, cc:1077, kmh0_100:3.0, vmax:280, cambio:'sequenziale', trazione:'catena' },
    { marca:'Aprilia', modello:'RS 660', anni:[2020,2024], cv:100, nm:67, peso:183, cc:659, kmh0_100:3.6, vmax:240, cambio:'sequenziale', trazione:'catena' },
    { marca:'Aprilia', modello:'Tuareg 660', anni:[2022,2024], cv:80, nm:70, peso:204, cc:659, kmh0_100:4.5, vmax:200, cambio:'sequenziale', trazione:'catena' },
    // ─── Yamaha ───
    { marca:'Yamaha', modello:'YZF-R1', anni:[2015,2024], cv:200, nm:113, peso:201, cc:998, kmh0_100:3.0, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'YZF-R6', anni:[2017,2020], cv:118, nm:62, peso:190, cc:599, kmh0_100:3.4, vmax:262, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'MT-09', anni:[2021,2024], cv:119, nm:93, peso:189, cc:889, kmh0_100:3.2, vmax:230, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'MT-07', anni:[2014,2024], cv:73, nm:67, peso:184, cc:689, kmh0_100:3.6, vmax:210, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'MT-10', anni:[2022,2024], cv:166, nm:112, peso:212, cc:998, kmh0_100:3.0, vmax:269, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'Ténéré 700', anni:[2019,2024], cv:73, nm:68, peso:204, cc:689, kmh0_100:4.1, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'Tracer 9', anni:[2021,2024], cv:119, nm:93, peso:213, cc:889, kmh0_100:3.3, vmax:230, cambio:'sequenziale', trazione:'catena' },
    // ─── Honda ───
    { marca:'Honda', modello:'CBR1000RR-R', anni:[2020,2024], cv:217, nm:113, peso:201, cc:999, kmh0_100:3.0, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'CBR600RR', anni:[2007,2024], cv:118, nm:64, peso:194, cc:599, kmh0_100:3.4, vmax:260, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'CB650R', anni:[2019,2024], cv:95, nm:64, peso:202, cc:649, kmh0_100:3.6, vmax:230, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'Africa Twin', anni:[2020,2024], cv:102, nm:105, peso:226, cc:1084, kmh0_100:3.7, vmax:215, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'Hornet 750', anni:[2023,2024], cv:92, nm:75, peso:190, cc:755, kmh0_100:3.4, vmax:215, cambio:'sequenziale', trazione:'catena' },
    // ─── Kawasaki ───
    { marca:'Kawasaki', modello:'Ninja ZX-10R', anni:[2021,2024], cv:203, nm:114, peso:207, cc:998, kmh0_100:3.0, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'Z900', anni:[2017,2024], cv:125, nm:98, peso:212, cc:948, kmh0_100:3.5, vmax:240, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'Z650', anni:[2017,2024], cv:68, nm:64, peso:188, cc:649, kmh0_100:4.0, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'Versys 650', anni:[2015,2024], cv:67, nm:61, peso:217, cc:649, kmh0_100:4.5, vmax:195, cambio:'sequenziale', trazione:'catena' },
    // ─── Suzuki ───
    { marca:'Suzuki', modello:'GSX-R1000', anni:[2017,2024], cv:202, nm:118, peso:202, cc:999, kmh0_100:3.0, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'Suzuki', modello:'GSX-S1000', anni:[2021,2024], cv:152, nm:106, peso:214, cc:999, kmh0_100:3.2, vmax:250, cambio:'sequenziale', trazione:'catena' },
    { marca:'Suzuki', modello:'V-Strom 650', anni:[2017,2024], cv:71, nm:62, peso:213, cc:645, kmh0_100:4.4, vmax:185, cambio:'sequenziale', trazione:'catena' },
    // ─── BMW Moto ───
    { marca:'BMW Moto', modello:'S 1000 RR', anni:[2019,2024], cv:210, nm:113, peso:197, cc:999, kmh0_100:3.0, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'BMW Moto', modello:'S 1000 R', anni:[2021,2024], cv:165, nm:114, peso:199, cc:999, kmh0_100:3.1, vmax:250, cambio:'sequenziale', trazione:'catena' },
    { marca:'BMW Moto', modello:'R 1250 GS', anni:[2019,2023], cv:136, nm:143, peso:249, cc:1254, kmh0_100:3.3, vmax:225, cambio:'sequenziale', trazione:'cardano' },
    { marca:'BMW Moto', modello:'R 1300 GS', anni:[2024,2024], cv:145, nm:149, peso:237, cc:1300, kmh0_100:3.2, vmax:230, cambio:'sequenziale', trazione:'cardano' },
    { marca:'BMW Moto', modello:'F 900 R', anni:[2020,2024], cv:105, nm:92, peso:211, cc:895, kmh0_100:3.8, vmax:225, cambio:'sequenziale', trazione:'catena' },
    // ─── KTM / Triumph ───
    { marca:'KTM', modello:'1290 Super Duke R', anni:[2020,2024], cv:180, nm:140, peso:189, cc:1301, kmh0_100:2.6, vmax:280, cambio:'sequenziale', trazione:'catena' },
    { marca:'KTM', modello:'890 Duke R', anni:[2020,2024], cv:121, nm:99, peso:166, cc:889, kmh0_100:3.3, vmax:240, cambio:'sequenziale', trazione:'catena' },
    { marca:'KTM', modello:'790 Adventure', anni:[2019,2024], cv:95, nm:88, peso:189, cc:799, kmh0_100:3.6, vmax:215, cambio:'sequenziale', trazione:'catena' },
    { marca:'Triumph', modello:'Speed Triple 1200', anni:[2021,2024], cv:180, nm:125, peso:198, cc:1160, kmh0_100:3.1, vmax:265, cambio:'sequenziale', trazione:'catena' },
    { marca:'Triumph', modello:'Street Triple', anni:[2020,2024], cv:123, nm:80, peso:189, cc:765, kmh0_100:3.5, vmax:235, cambio:'sequenziale', trazione:'catena' },
    { marca:'Triumph', modello:'Tiger 900', anni:[2020,2024], cv:95, nm:87, peso:201, cc:888, kmh0_100:3.7, vmax:215, cambio:'sequenziale', trazione:'catena' },

    // ─── Ducati (estesi) ───
    { marca:'Ducati', modello:'1299 Panigale', anni:[2015,2017], cv:205, nm:144, peso:190, cc:1285, kmh0_100:2.9, vmax:295, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'1199 Panigale', anni:[2012,2014], cv:195, nm:132, peso:188, cc:1198, kmh0_100:3.0, vmax:290, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Hypermotard 950', anni:[2019,2024], cv:114, nm:96, peso:178, cc:937, kmh0_100:3.5, vmax:225, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'SuperSport', anni:[2017,2024], cv:113, nm:96, peso:184, cc:937, kmh0_100:3.5, vmax:230, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Multistrada V2', anni:[2022,2024], cv:113, nm:96, peso:199, cc:937, kmh0_100:3.6, vmax:225, cambio:'sequenziale', trazione:'catena' },
    { marca:'Ducati', modello:'Monster 1200', anni:[2014,2020], cv:135, nm:124, peso:209, cc:1198, kmh0_100:3.4, vmax:240, cambio:'sequenziale', trazione:'catena' },

    // ─── Aprilia (estesi) ───
    { marca:'Aprilia', modello:'Dorsoduro 900', anni:[2017,2020], cv:95, nm:90, peso:212, cc:896, kmh0_100:3.5, vmax:215, cambio:'sequenziale', trazione:'catena' },
    { marca:'Aprilia', modello:'Shiver 900', anni:[2017,2020], cv:95, nm:90, peso:218, cc:896, kmh0_100:3.6, vmax:220, cambio:'sequenziale', trazione:'catena' },

    // ─── Yamaha (estesi) ───
    { marca:'Yamaha', modello:'YZF-R125', anni:[2019,2024], cv:15, nm:11, peso:144, cc:125, kmh0_100:12.0, vmax:130, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'YZF-R3', anni:[2019,2024], cv:42, nm:30, peso:168, cc:321, kmh0_100:5.9, vmax:188, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'MT-03', anni:[2016,2024], cv:42, nm:30, peso:168, cc:321, kmh0_100:5.8, vmax:185, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'MT-125', anni:[2014,2024], cv:15, nm:11, peso:140, cc:125, kmh0_100:12.5, vmax:122, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'Tracer 7', anni:[2020,2024], cv:73, nm:67, peso:196, cc:689, kmh0_100:3.7, vmax:210, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'XSR700', anni:[2016,2024], cv:73, nm:67, peso:186, cc:689, kmh0_100:3.6, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'XSR900', anni:[2022,2024], cv:119, nm:93, peso:193, cc:889, kmh0_100:3.2, vmax:230, cambio:'sequenziale', trazione:'catena' },
    { marca:'Yamaha', modello:'TMAX 560', anni:[2020,2024], cv:47, nm:56, peso:218, cc:562, kmh0_100:4.7, vmax:175, cambio:'cvt', trazione:'cinghia' },

    // ─── Honda (estesi) ───
    { marca:'Honda', modello:'CBR500R', anni:[2019,2024], cv:47, nm:43, peso:192, cc:471, kmh0_100:5.0, vmax:185, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'CB500F', anni:[2019,2024], cv:47, nm:43, peso:189, cc:471, kmh0_100:5.2, vmax:178, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'CB300R', anni:[2018,2024], cv:31, nm:28, peso:144, cc:286, kmh0_100:6.5, vmax:160, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'Transalp 750', anni:[2023,2024], cv:91, nm:75, peso:208, cc:755, kmh0_100:3.6, vmax:215, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'NC750X', anni:[2021,2024], cv:58, nm:69, peso:217, cc:745, kmh0_100:4.5, vmax:180, cambio:'sequenziale', trazione:'catena' },
    { marca:'Honda', modello:'Forza 750', anni:[2021,2024], cv:58, nm:69, peso:235, cc:745, kmh0_100:5.0, vmax:180, cambio:'cvt', trazione:'cinghia' },

    // ─── Kawasaki (estesi) ───
    { marca:'Kawasaki', modello:'Ninja 400', anni:[2018,2024], cv:49, nm:38, peso:173, cc:399, kmh0_100:5.4, vmax:190, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'Z400', anni:[2019,2024], cv:49, nm:38, peso:167, cc:399, kmh0_100:5.5, vmax:185, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'Z650RS', anni:[2022,2024], cv:68, nm:64, peso:187, cc:649, kmh0_100:4.0, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'Versys 1000', anni:[2019,2024], cv:120, nm:102, peso:257, cc:1043, kmh0_100:3.5, vmax:230, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'Ninja H2', anni:[2015,2024], cv:200, nm:134, peso:238, cc:998, kmh0_100:2.9, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'Kawasaki', modello:'ZX-6R', anni:[2013,2024], cv:130, nm:71, peso:196, cc:636, kmh0_100:3.4, vmax:262, cambio:'sequenziale', trazione:'catena' },

    // ─── Suzuki (estesi) ───
    { marca:'Suzuki', modello:'SV650', anni:[2016,2024], cv:76, nm:64, peso:197, cc:645, kmh0_100:3.9, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'Suzuki', modello:'Hayabusa', anni:[2021,2024], cv:190, nm:150, peso:264, cc:1340, kmh0_100:3.2, vmax:299, cambio:'sequenziale', trazione:'catena' },
    { marca:'Suzuki', modello:'V-Strom 1050', anni:[2020,2024], cv:107, nm:100, peso:247, cc:1037, kmh0_100:3.7, vmax:215, cambio:'sequenziale', trazione:'catena' },
    { marca:'Suzuki', modello:'GSX-S950', anni:[2022,2024], cv:95, nm:82, peso:214, cc:999, kmh0_100:3.5, vmax:225, cambio:'sequenziale', trazione:'catena' },
    { marca:'Suzuki', modello:'Burgman 400', anni:[2017,2024], cv:31, nm:36, peso:215, cc:399, kmh0_100:5.5, vmax:170, cambio:'cvt', trazione:'cinghia' },

    // ─── BMW Moto (estesi) ───
    { marca:'BMW Moto', modello:'F 850 GS', anni:[2018,2024], cv:95, nm:92, peso:229, cc:853, kmh0_100:3.6, vmax:219, cambio:'sequenziale', trazione:'catena' },
    { marca:'BMW Moto', modello:'F 750 GS', anni:[2018,2024], cv:77, nm:83, peso:224, cc:853, kmh0_100:3.9, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'BMW Moto', modello:'R nineT', anni:[2014,2024], cv:109, nm:116, peso:220, cc:1170, kmh0_100:3.5, vmax:200, cambio:'sequenziale', trazione:'cardano' },
    { marca:'BMW Moto', modello:'R 18', anni:[2021,2024], cv:91, nm:158, peso:345, cc:1802, kmh0_100:4.8, vmax:180, cambio:'sequenziale', trazione:'cardano' },
    { marca:'BMW Moto', modello:'M 1000 RR', anni:[2021,2024], cv:212, nm:113, peso:192, cc:999, kmh0_100:2.9, vmax:306, cambio:'sequenziale', trazione:'catena' },
    { marca:'BMW Moto', modello:'K 1600 GT', anni:[2017,2024], cv:160, nm:175, peso:343, cc:1649, kmh0_100:3.3, vmax:225, cambio:'sequenziale', trazione:'cardano' },

    // ─── KTM (estesi) ───
    { marca:'KTM', modello:'390 Duke', anni:[2017,2024], cv:44, nm:37, peso:158, cc:373, kmh0_100:5.5, vmax:170, cambio:'sequenziale', trazione:'catena' },
    { marca:'KTM', modello:'690 Duke', anni:[2017,2024], cv:75, nm:74, peso:148, cc:693, kmh0_100:3.9, vmax:210, cambio:'sequenziale', trazione:'catena' },
    { marca:'KTM', modello:'1290 Super Adventure S', anni:[2021,2024], cv:160, nm:138, peso:220, cc:1301, kmh0_100:3.0, vmax:240, cambio:'sequenziale', trazione:'catena' },

    // ─── Triumph (estesi) ───
    { marca:'Triumph', modello:'Bonneville T120', anni:[2016,2024], cv:80, nm:105, peso:224, cc:1200, kmh0_100:4.0, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'Triumph', modello:'Speed Twin 1200', anni:[2019,2024], cv:100, nm:112, peso:216, cc:1200, kmh0_100:3.5, vmax:225, cambio:'sequenziale', trazione:'catena' },
    { marca:'Triumph', modello:'Daytona 675', anni:[2013,2017], cv:128, nm:74, peso:184, cc:675, kmh0_100:3.4, vmax:255, cambio:'sequenziale', trazione:'catena' },
    { marca:'Triumph', modello:'Rocket 3', anni:[2020,2024], cv:167, nm:221, peso:291, cc:2458, kmh0_100:2.8, vmax:240, cambio:'sequenziale', trazione:'cardano' },
    { marca:'Triumph', modello:'Tiger 1200', anni:[2022,2024], cv:150, nm:130, peso:240, cc:1160, kmh0_100:3.2, vmax:230, cambio:'sequenziale', trazione:'cardano' },

    // ─── MV Agusta ───
    { marca:'MV Agusta', modello:'F3 800', anni:[2014,2024], cv:148, nm:88, peso:173, cc:798, kmh0_100:3.2, vmax:269, cambio:'sequenziale', trazione:'catena' },
    { marca:'MV Agusta', modello:'Brutale 800', anni:[2016,2024], cv:140, nm:87, peso:175, cc:798, kmh0_100:3.3, vmax:245, cambio:'sequenziale', trazione:'catena' },
    { marca:'MV Agusta', modello:'Dragster 800', anni:[2014,2024], cv:140, nm:87, peso:168, cc:798, kmh0_100:3.4, vmax:245, cambio:'sequenziale', trazione:'catena' },

    // ─── Harley / Husqvarna / Royal Enfield ───
    { marca:'Harley-Davidson', modello:'Sportster S', anni:[2021,2024], cv:121, nm:125, peso:228, cc:1252, kmh0_100:3.5, vmax:200, cambio:'sequenziale', trazione:'cinghia' },
    { marca:'Harley-Davidson', modello:'Iron 883', anni:[2014,2022], cv:50, nm:70, peso:256, cc:883, kmh0_100:6.0, vmax:175, cambio:'sequenziale', trazione:'cinghia' },
    { marca:'Harley-Davidson', modello:'Pan America', anni:[2021,2024], cv:152, nm:128, peso:245, cc:1252, kmh0_100:3.4, vmax:220, cambio:'sequenziale', trazione:'cinghia' },
    { marca:'Husqvarna', modello:'Vitpilen 401', anni:[2017,2024], cv:44, nm:37, peso:152, cc:373, kmh0_100:5.5, vmax:170, cambio:'sequenziale', trazione:'catena' },
    { marca:'Husqvarna', modello:'701 Supermoto', anni:[2016,2024], cv:75, nm:73, peso:145, cc:693, kmh0_100:3.8, vmax:200, cambio:'sequenziale', trazione:'catena' },
    { marca:'Royal Enfield', modello:'Continental GT 650', anni:[2018,2024], cv:47, nm:52, peso:211, cc:648, kmh0_100:5.5, vmax:160, cambio:'sequenziale', trazione:'catena' },
    { marca:'Royal Enfield', modello:'Himalayan', anni:[2018,2024], cv:25, nm:32, peso:199, cc:411, kmh0_100:8.0, vmax:140, cambio:'sequenziale', trazione:'catena' },
    { marca:'Royal Enfield', modello:'Classic 350', anni:[2021,2024], cv:20, nm:27, peso:195, cc:349, kmh0_100:9.0, vmax:120, cambio:'sequenziale', trazione:'catena' },
  ];

  // Normalizes for matching: lowercase, strip diacritics, collapse spaces
  function norm(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  // Score an entry vs query. Higher = better match. 0 = reject.
  function score(entry, q) {
    var qMarca = norm(q.marca);
    var qMod   = norm(q.modello);
    if (!qMarca || !qMod) return 0;
    if (norm(entry.marca) !== qMarca) return 0;
    var em = norm(entry.modello);
    var s = 0;
    if (em === qMod) s += 100;
    else if (em.indexOf(qMod) >= 0) s += 50;
    else if (qMod.indexOf(em) >= 0) s += 40;
    else return 0;
    // Year matches inside range gets bonus; outside cuts in half
    if (q.anno && entry.anni) {
      if (q.anno >= entry.anni[0] && q.anno <= entry.anni[1]) s += 20;
      else s = Math.floor(s / 2);
    }
    // Prefer specific (longer) model name over short
    s += em.length;
    return s;
  }

  // Public API:
  //   _hubVehicleDB.lookup({ marca, modello, anno, type })
  //     → null OR { specs: {...}, source: 'auto-fill' }
  //   _hubVehicleDB.suggest({ marca, type })
  //     → string[] with model suggestions
  window._hubVehicleDB = {
    lookup: function(query) {
      var db = (query.type === 'moto') ? MOTO_DB : AUTO_DB;
      var ranked = db.map(function(e) { return { e: e, s: score(e, query) }; })
                     .filter(function(r) { return r.s > 0; })
                     .sort(function(a, b) { return b.s - a.s; });
      if (ranked.length === 0) return null;
      var top = ranked[0].e;
      return {
        specs: {
          cv: top.cv, nm: top.nm, peso: top.peso, cc: top.cc,
          kmh0_100: top.kmh0_100, vmax: top.vmax,
          cambio: top.cambio, trazione: top.trazione, alim: top.alim
        },
        matchedAs: top.marca + ' ' + top.modello + (top.anni ? ' (' + top.anni[0] + '-' + top.anni[1] + ')' : ''),
        source: 'auto-fill'
      };
    },
    listMarche: function(type) {
      var db = (type === 'moto') ? MOTO_DB : AUTO_DB;
      var seen = {};
      db.forEach(function(e) { seen[e.marca] = true; });
      return Object.keys(seen).sort();
    },
    listModelli: function(marca, type) {
      var db = (type === 'moto') ? MOTO_DB : AUTO_DB;
      var qm = norm(marca);
      return db.filter(function(e) { return norm(e.marca) === qm; })
               .map(function(e) { return e.modello; });
    }
  };
})();


/* ═══════════════════════════════════════════════════════════════════
   HUB GARAGE — multi-vehicle profile management
   Stores: hub_garage_v1 (array), hub_active_vehicle_v1 (id)
   Integrates with diagnosis: selecting a vehicle pre-fills the dropdowns.
   Each vehicle: id, type (auto/moto), marca, modello, anno, motore,
                 customName, targa, note, kmTot, scadBollo, scadRca,
                 scadRev, scadTagliando, createdAt
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  function escSafe(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function uid() {
    return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  var GAR_KEY = 'hub_garage_v1';
  var GAR_ACTIVE = 'hub_active_vehicle_v1';

  /* ── IndexedDB store for vehicle photos (blobs too big for localStorage) ── */
  var DB_NAME = 'autohub_v1';
  var STORE = 'photos';
  var _dbPromise = null;
  function openPhotoDB() { return window.hubIDB(); }   // apertura condivisa (versione 2)
  async function dbPutPhoto(vehicleId, blobUrl) {
    var db = await openPhotoDB();
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: vehicleId, dataUrl: blobUrl, ts: Date.now() });
      tx.oncomplete = function() { resolve(true); };
      tx.onerror = function() { reject(tx.error); };
    });
  }
  async function dbGetPhoto(vehicleId) {
    try {
      var db = await openPhotoDB();
      return new Promise(function(resolve) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(vehicleId);
        req.onsuccess = function() { resolve(req.result ? req.result.dataUrl : null); };
        req.onerror = function() { resolve(null); };
      });
    } catch(e) { return null; }
  }
  async function dbDeletePhoto(vehicleId) {
    try {
      var db = await openPhotoDB();
      return new Promise(function(resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(vehicleId);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { resolve(false); };
      });
    } catch(e) { return false; }
  }
  // Expose on hubGarage for other modules
  window._hubPhotoGet = dbGetPhoto;
  window._hubPhotoSet = dbPutPhoto;
  window._hubPhotoDel = dbDeletePhoto;

  // Resize/compress an image File to a square dataURL (max 1024px, JPEG quality 0.85)
  function compressImageFile(file, maxSize) {
    maxSize = maxSize || 1024;
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() {
          var w = img.width, h = img.height;
          var scale = Math.min(1, maxSize / Math.max(w, h));
          var nw = Math.round(w * scale), nh = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = nw; canvas.height = nh;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, nw, nh);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = function() { reject(new Error('Image load failed')); };
        img.src = ev.target.result;
      };
      reader.onerror = function() { reject(new Error('File read failed')); };
      reader.readAsDataURL(file);
    });
  }
  window._hubCompressImage = compressImageFile;

  function loadGarage() {
    try { return JSON.parse(localStorage.getItem(GAR_KEY) || '[]'); }
    catch(e) { return []; }
  }
  function saveGarage(g) {
    try { localStorage.setItem(GAR_KEY, JSON.stringify(g)); } catch(e) {}
  }
  function getActiveId() { return localStorage.getItem(GAR_ACTIVE) || null; }
  function setActiveId(id) {
    if (id) localStorage.setItem(GAR_ACTIVE, id);
    else localStorage.removeItem(GAR_ACTIVE);
  }
  function getActiveVehicle() {
    var id = getActiveId();
    if (!id) return null;
    return loadGarage().find(function(v) { return v.id === id; }) || null;
  }
  // Public API for other modules (fuel logging, comparator, etc.)
  window.hubGarage = {
    list:   loadGarage,
    save:   saveGarage,
    active: getActiveVehicle,
    activeId: getActiveId,
    setActive: setActiveId,
    update: function(id, patch) {
      var g = loadGarage();
      var i = g.findIndex(function(v) { return v.id === id; });
      if (i < 0) return null;
      g[i] = Object.assign({}, g[i], patch);
      saveGarage(g);
      return g[i];
    }
  };

  /* ── UI INJECTION ───────────────────────────────────────────── */
  function injectGarageUI() {
    if (document.getElementById('gar-overlay')) return;

    var slot = document.getElementById('garage-launch-slot');
    if (slot) {
      var btn = document.createElement('button');
      btn.id = 'gar-launch-btn';
      btn.className = 'gar-launch';
      btn.type = 'button';
      btn.innerHTML =
        '<span class="gar-launch-icon">🚗</span>' +
        '<span class="gar-launch-text">Veicoli</span>' +
        '<span class="gar-launch-active" id="gar-launch-active">Nessun veicolo</span>';
      btn.onclick = window.openGarage;
      slot.appendChild(btn);
    }

    // Overlay + edit modal go to body so they survive section switches
    var ov = document.createElement('div');
    ov.id = 'gar-overlay';
    ov.innerHTML =
      '<div class="gar-hdr">' +
        '<h2>IL MIO GARAGE<small>Veicoli salvati · Switch rapido</small></h2>' +
        '<button class="gar-close" onclick="closeGarage()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="gar-body">' +
        '<button class="gar-add-btn" onclick="openGarageEdit(null)">+ Aggiungi veicolo</button>' +
        '<div id="gar-list"></div>' +
        '<button type="button" class="gar-autofill-btn" onclick="garCalendar()">📅 Tutte le scadenze nel calendario (.ics)</button>' +
      '</div>';
    document.body.appendChild(ov);

    var em = document.createElement('div');
    em.id = 'gar-edit';
    em.onclick = function(e) { if (e.target === em) closeGarageEdit(); };
    em.innerHTML =
      '<div class="gar-edit-card">' +
        '<h3 id="gar-edit-title">Nuovo veicolo</h3>' +
        '<div class="gar-photo-row">' +
          '<div class="gar-photo-preview" id="gar-photo-preview">' +
            '<div class="gar-photo-preview-empty">📷</div>' +
          '</div>' +
          '<div class="gar-photo-actions">' +
            '<input type="file" accept="image/*" class="gar-photo-input" id="gar-photo-input" onchange="_garPhotoChange(event)">' +
            '<button type="button" class="gar-photo-btn" onclick="document.getElementById(\'gar-photo-input\').click()">📷 Foto</button>' +
            '<button type="button" class="gar-photo-btn gar-photo-btn-rm" id="gar-photo-rm" onclick="_garPhotoRemove()" style="display:none">Rimuovi</button>' +
            '<div class="gar-photo-info">Salvata localmente, max 1024px</div>' +
          '</div>' +
        '</div>' +
        '<div class="gar-typebar">' +
          '<button type="button" data-type="auto" onclick="_garSetType(\'auto\')">🚗 Auto</button>' +
          '<button type="button" data-type="moto" onclick="_garSetType(\'moto\')">🏍 Moto</button>' +
        '</div>' +
        '<div id="gar-pick" class="gar-pick"></div>' +
        '<div id="gar-manual" class="gar-manual" style="display:none">' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Marca</label>' +
            '<input type="text" id="gar-f-marca" placeholder="Alfa Romeo" maxlength="30"></div>' +
          '<div class="gar-field"><label>Modello</label>' +
            '<input type="text" id="gar-f-modello" placeholder="Giulia" maxlength="40"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Anno</label>' +
            '<input type="text" id="gar-f-anno" placeholder="2020" maxlength="4"></div>' +
          '<div class="gar-field"><label>Motore</label>' +
            '<input type="text" id="gar-f-motore" placeholder="2.2 JTDM" maxlength="40"></div>' +
        '</div>' +
        '<button type="button" class="gar-autofill-btn" onclick="_garAutoFill()">🔍 Cerca specs nel database</button>' +
        '<div id="gar-autofill-result" class="gar-autofill-result"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Nome personalizzato</label>' +
            '<input type="text" id="gar-f-name" placeholder="Es. Giulia di tutti i giorni" maxlength="40"></div>' +
          '<div class="gar-field"><label>Serbatoio lt</label>' +
            '<input type="number" id="gar-f-tank" min="1" max="200" step="1" placeholder="Auto 50 · Moto 18"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Targa</label>' +
            '<input type="text" id="gar-f-targa" placeholder="AB123CD" maxlength="10" style="text-transform:uppercase"></div>' +
          '<div class="gar-field"><label>Km totali</label>' +
            '<input type="number" id="gar-f-km" placeholder="0" min="0"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Scadenza bollo</label>' +
            '<input type="date" id="gar-f-bollo"></div>' +
          '<div class="gar-field"><label>€ bollo / anno</label>' +
            '<input type="number" id="gar-f-bollo-cost" min="0" step="1" placeholder="180"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Scadenza RCA</label>' +
            '<input type="date" id="gar-f-rca"></div>' +
          '<div class="gar-field"><label>€ RCA / anno</label>' +
            '<input type="number" id="gar-f-rca-cost" min="0" step="1" placeholder="450"></div>' +
        '</div>' +
        '<div class="gar-row2">' +
          '<div class="gar-field"><label>Scadenza revisione</label>' +
            '<input type="date" id="gar-f-rev"></div>' +
          '<div class="gar-field"><label>€ revisione</label>' +
            '<input type="number" id="gar-f-rev-cost" min="0" step="1" placeholder="78"></div>' +
        '</div>' +
        '<div class="gar-field"><label>Prossimo tagliando</label>' +
          '<input type="date" id="gar-f-tag"></div>' +

        '<details class="gar-section"><summary>⚙ Specifiche tecniche</summary>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>Potenza CV</label>' +
              '<input type="number" id="gar-f-cv" min="0" step="1" placeholder="184"></div>' +
            '<div class="gar-field"><label>Coppia Nm</label>' +
              '<input type="number" id="gar-f-nm" min="0" step="1" placeholder="380"></div>' +
          '</div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>Peso kg</label>' +
              '<input type="number" id="gar-f-peso" min="0" step="1" placeholder="1480"></div>' +
            '<div class="gar-field"><label>Cilindrata cc</label>' +
              '<input type="number" id="gar-f-cc" min="0" step="1" placeholder="1995"></div>' +
          '</div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>0-100 sec</label>' +
              '<input type="number" id="gar-f-0100" min="0" step="0.1" placeholder="6.5"></div>' +
            '<div class="gar-field"><label>Vmax km/h</label>' +
              '<input type="number" id="gar-f-vmax" min="0" step="1" placeholder="240"></div>' +
          '</div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>Cambio</label>' +
              '<select id="gar-f-cambio">' +
                '<option value="">—</option>' +
                '<option value="manuale">Manuale</option>' +
                '<option value="automatico">Automatico</option>' +
                '<option value="dct">DCT/DSG</option>' +
                '<option value="cvt">CVT</option>' +
                '<option value="sequenziale">Sequenziale</option>' +
              '</select></div>' +
            '<div class="gar-field"><label>Trazione</label>' +
              '<select id="gar-f-traz">' +
                '<option value="">—</option>' +
                '<option value="fwd">Anteriore (FWD)</option>' +
                '<option value="rwd">Posteriore (RWD)</option>' +
                '<option value="awd">Integrale (AWD)</option>' +
                '<option value="catena">Catena (moto)</option>' +
                '<option value="cardano">Cardano (moto)</option>' +
                '<option value="cinghia">Cinghia (moto)</option>' +
              '</select></div>' +
          '</div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>Costo acquisto €</label>' +
              '<input type="number" id="gar-f-acq-cost" min="0" step="100" placeholder="42000"></div>' +
            '<div class="gar-field"><label>Data acquisto</label>' +
              '<input type="date" id="gar-f-acq-date"></div>' +
          '</div>' +
        '</details>' +

        '<details class="gar-section"><summary>🛞 Gomme</summary>' +
          '<div class="gar-field"><label>Misura (es. 225/45 R17)</label>' +
            '<input type="text" id="gar-f-gomme-misura" placeholder="225/45 R17" maxlength="20"></div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>Marca</label>' +
              '<input type="text" id="gar-f-gomme-marca" placeholder="Michelin" maxlength="30"></div>' +
            '<div class="gar-field"><label>Modello</label>' +
              '<input type="text" id="gar-f-gomme-modello" placeholder="Pilot Sport 4" maxlength="40"></div>' +
          '</div>' +
          '<div class="gar-field"><label>Tipo</label>' +
            '<select id="gar-f-gomme-tipo">' +
              '<option value="">—</option>' +
              '<option value="estive">Estive</option>' +
              '<option value="invernali">Invernali</option>' +
              '<option value="all-season">All Season (4 stagioni)</option>' +
              '<option value="track">Track / semislick</option>' +
            '</select></div>' +
          '<div class="gar-row2">' +
            '<div class="gar-field"><label>Data montaggio</label>' +
              '<input type="date" id="gar-f-gomme-data"></div>' +
            '<div class="gar-field"><label>Km al montaggio</label>' +
              '<input type="number" id="gar-f-gomme-km" min="0" step="100" placeholder="50000"></div>' +
          '</div>' +
        '</details>' +

        '<details class="gar-section"><summary>📋 Note tecniche personali</summary>' +
          '<div class="gar-field"><label>Pressioni gomme</label>' +
            '<input type="text" id="gar-f-press" placeholder="Es. 2.3 ant / 2.5 post" maxlength="60"></div>' +
          '<div class="gar-field"><label>Olio motore</label>' +
            '<input type="text" id="gar-f-olio" placeholder="Es. 5W30 fully synth, 4.5L" maxlength="60"></div>' +
          '<div class="gar-field"><label>Codici componenti</label>' +
            '<textarea id="gar-f-codici" rows="3" placeholder="Es. filtro olio K&N HF-303, pastiglie EBC FA424" maxlength="500"></textarea></div>' +
          '<div class="gar-field"><label>Settings sospensioni / ECU</label>' +
            '<textarea id="gar-f-settings" rows="2" placeholder="Es. molla post +2, comp -3, mappa 2" maxlength="300"></textarea></div>' +
        '</details>' +

        '<div class="gar-field"><label>Note generali</label>' +
          '<textarea id="gar-f-note" rows="2" placeholder="Es. blu Misano, cerchi 19..." maxlength="200"></textarea></div>' +
        '<div class="gar-edit-btns">' +
          '<button type="button" class="gar-cancel" onclick="closeGarageEdit()">Annulla</button>' +
          '<button type="button" class="gar-save" onclick="saveGarageEdit()">Salva</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(em);

    refreshGarageBadge();
  }

  /* ── Public functions ───────────────────────────────────────── */
  window.openGarage = function() {
    injectGarageUI();
    var ov = document.getElementById('gar-overlay');
    if (!ov) return;
    ov.classList.add('visible');
    renderGarageList();
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };
  window.closeGarage = function() {
    var ov = document.getElementById('gar-overlay');
    if (ov) ov.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  var _editingId = null;
  var _editingType = 'auto';
  // Photo state for the currently open edit modal:
  //   null  = no change requested
  //   ''    = remove photo on save
  //   "data:..." = new dataUrl to save
  var _pendingPhoto = null;

  window._garPhotoChange = async function(ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine.');
      return;
    }
    try {
      var dataUrl = await compressImageFile(file, 1024);
      _pendingPhoto = dataUrl;
      var prev = document.getElementById('gar-photo-preview');
      prev.innerHTML = '<img src="' + dataUrl + '" alt="">';
      document.getElementById('gar-photo-rm').style.display = 'inline-block';
    } catch(e) {
      alert('Errore caricamento foto: ' + (e.message || e));
    } finally {
      ev.target.value = ''; // reset so same file can be picked again
    }
  };
  window._garPhotoRemove = function() {
    _pendingPhoto = '';  // empty string flags "remove on save"
    var prev = document.getElementById('gar-photo-preview');
    prev.innerHTML = '<div class="gar-photo-preview-empty">📷</div>';
    document.getElementById('gar-photo-rm').style.display = 'none';
  };

  window.openGarageEdit = function(id) {
    injectGarageUI();
    _editingId = id;
    _pendingPhoto = null;  // reset
    var v = id ? loadGarage().find(function(x) { return x.id === id; }) : null;
    document.getElementById('gar-edit-title').textContent = v ? 'Modifica veicolo' : 'Nuovo veicolo';
    document.getElementById('gar-f-name').value    = v ? (v.customName || '') : '';
    document.getElementById('gar-f-marca').value   = v ? (v.marca || '') : '';
    document.getElementById('gar-f-modello').value = v ? (v.modello || '') : '';
    document.getElementById('gar-f-anno').value    = v ? (v.anno || '') : '';
    document.getElementById('gar-f-motore').value  = v ? (v.motore || '') : '';
    var tankEl = document.getElementById('gar-f-tank'); if (tankEl) tankEl.value = v ? (v.serbatoio || '') : '';
    var afResult = document.getElementById('gar-autofill-result');
    if (afResult) { afResult.style.display = 'none'; afResult.innerHTML = ''; }
    document.getElementById('gar-f-targa').value   = v ? (v.targa || '') : '';
    document.getElementById('gar-f-km').value      = v ? (v.kmTot || '') : '';
    document.getElementById('gar-f-bollo').value   = v ? (v.scadBollo || '') : '';
    document.getElementById('gar-f-rca').value     = v ? (v.scadRca || '') : '';
    document.getElementById('gar-f-rev').value     = v ? (v.scadRev || '') : '';
    document.getElementById('gar-f-tag').value     = v ? (v.scadTagliando || '') : '';
    document.getElementById('gar-f-bollo-cost').value = v ? (v.costoBollo || '') : '';
    document.getElementById('gar-f-rca-cost').value   = v ? (v.costoRca || '') : '';
    document.getElementById('gar-f-rev-cost').value   = v ? (v.costoRev || '') : '';
    // Specs tecniche
    var specs = (v && v.specs) || {};
    document.getElementById('gar-f-cv').value      = specs.cv || '';
    document.getElementById('gar-f-nm').value      = specs.nm || '';
    document.getElementById('gar-f-peso').value    = specs.peso || '';
    document.getElementById('gar-f-cc').value      = specs.cc || '';
    document.getElementById('gar-f-0100').value    = specs.kmh0_100 || '';
    document.getElementById('gar-f-vmax').value    = specs.vmax || '';
    document.getElementById('gar-f-cambio').value  = specs.cambio || '';
    document.getElementById('gar-f-traz').value    = specs.trazione || '';
    document.getElementById('gar-f-acq-cost').value = specs.acqCost || '';
    document.getElementById('gar-f-acq-date').value = specs.acqDate || '';
    // Gomme
    var g = (v && v.gomme) || {};
    document.getElementById('gar-f-gomme-misura').value  = g.misura || '';
    document.getElementById('gar-f-gomme-marca').value   = g.marca || '';
    document.getElementById('gar-f-gomme-modello').value = g.modello || '';
    document.getElementById('gar-f-gomme-tipo').value    = g.tipo || '';
    document.getElementById('gar-f-gomme-data').value    = g.dataMontaggio || '';
    document.getElementById('gar-f-gomme-km').value      = g.kmMontaggio || '';
    // Note tecniche
    var nt = (v && v.noteTec) || {};
    document.getElementById('gar-f-press').value    = nt.pressioni || '';
    document.getElementById('gar-f-olio').value     = nt.olio || '';
    document.getElementById('gar-f-codici').value   = nt.codici || '';
    document.getElementById('gar-f-settings').value = nt.settings || '';
    document.getElementById('gar-f-note').value    = v ? (v.note || '') : '';
    _garSetType(v ? (v.type || 'auto') : 'auto', true);
    initPick(v);

    // Load existing photo into preview
    var prev = document.getElementById('gar-photo-preview');
    var rmBtn = document.getElementById('gar-photo-rm');
    prev.innerHTML = '<div class="gar-photo-preview-empty">📷</div>';
    rmBtn.style.display = 'none';
    if (v && id) {
      dbGetPhoto(id).then(function(dataUrl) {
        if (dataUrl && _editingId === id) {  // still on same edit
          prev.innerHTML = '<img src="' + dataUrl + '" alt="">';
          rmBtn.style.display = 'inline-block';
        }
      });
    }

    document.getElementById('gar-edit').classList.add('visible');
  };
  window.closeGarageEdit = function() {
    document.getElementById('gar-edit').classList.remove('visible');
  };

  window._garSetType = function(t, silent) {
    var changed = _editingType !== t;
    _editingType = t;
    document.querySelectorAll('#gar-edit .gar-typebar button').forEach(function(b) {
      b.classList.toggle('on', b.dataset.type === t);
    });
    // Cambio auto↔moto dall'utente: si riparte dalla marca
    if (!silent && changed) {
      _pick = { marca: '', modello: '', gen: '', anno: '', motore: '' };
      syncFields();
      renderPick();
    }
  };

  /* ════════════════════════════════════════════════════════════════
     SELETTORE VEICOLO — tendine a cascata dal catalogo della Diagnosi
     Marca → elenco modelli (schede) → serie/anni → anno → motorizzazione.
     Le scelte vengono scritte nei campi gar-f-marca/modello/anno/motore
     (anno = serie "2016–2019", come la Diagnosi; annoImm = anno preciso).
     Le specifiche arrivano da db.json; senza db.json resta il vecchio
     database interno (_hubVehicleDB).
     ════════════════════════════════════════════════════════════════ */
  var _pick = { marca: '', modello: '', gen: '', anno: '', motore: '' };
  var _manual = false;
  var _autoFilled = {};   // campi specs scritti dal selettore (si possono riscrivere)
  var _vdbState = 'idle';

  function catalogFor(type) {
    try { return type === 'moto' ? MOTORCYCLES : VEHICLES; } catch (e) { return {}; }
  }
  function genYears(gen) {
    var m = /(\d{4})\D+(\d{4})/.exec(gen || '');
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  }
  function modelSummary(gens) {
    var min = 9999, max = 0, n = 0;
    Object.keys(gens).forEach(function(g) {
      var y = genYears(g); if (y) { min = Math.min(min, y[0]); max = Math.max(max, y[1]); }
      n += gens[g].length;
    });
    return { anni: min < 9999 ? min + '–' + max : '', motori: n, serie: Object.keys(gens).length };
  }
  function loadVDB(marca) {
    return window.hubVDB.ensure(marca ? [marca] : []);
  }
  function specKey() { return [_pick.marca, _pick.modello, _pick.gen, _pick.motore].join('||'); }
  function dbSpec() {
    var db = window._vdb;
    return db && db.specs ? db.specs[specKey()] || null : null;
  }
  function rangeMid(s) {
    var m = /([\d.,]+)\s*[–-]\s*([\d.,]+)/.exec(String(s || ''));
    if (m) return Math.round((parseFloat(m[1].replace(',', '.')) + parseFloat(m[2].replace(',', '.'))) / 2 * 10) / 10;
    var n = parseFloat(String(s || '').replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function mapCambio(t) {
    t = (t || '').toLowerCase();
    if (/dct|dsg|doppia|edc|s tronic|pdk/.test(t)) return 'dct';
    if (/cvt|e-cvt/.test(t)) return 'cvt';
    if (/sequenz/.test(t)) return 'sequenziale';
    if (/auto/.test(t)) return 'automatico';
    if (/manuale/.test(t)) return _editingType === 'moto' ? 'sequenziale' : 'manuale';
    return '';
  }
  function mapTraz(t) {
    t = (t || '').toLowerCase();
    if (/catena/.test(t)) return 'catena';
    if (/cardano/.test(t)) return 'cardano';
    if (/cinghia/.test(t)) return 'cinghia';
    if (/integrale|awd|4wd|4x4/.test(t)) return 'awd';
    if (/posteriore|rwd/.test(t)) return 'rwd';
    if (/anteriore|fwd/.test(t)) return 'fwd';
    return '';
  }
  function cvFromName(m) { var x = /(\d{2,4})\s*cv/i.exec(m || ''); return x ? parseInt(x[1], 10) : null; }
  function ccFromName(m) {
    var x = /\b(\d)[.,](\d)\b/.exec(m || '');
    return x ? parseInt(x[1] + x[2], 10) * 100 : null;
  }

  // Scrive un campo specs: riscrive solo se vuoto o scritto in precedenza dal selettore
  function setSpec(id, val) {
    var el = document.getElementById(id);
    if (!el || val === null || val === undefined || val === '') return false;
    if (el.value !== '' && !_autoFilled[id]) return false;
    el.value = val; _autoFilled[id] = true;
    return true;
  }
  function fillFromPick() {
    var sp = dbSpec(), filled = [];
    if (sp) {
      if (setSpec('gar-f-cv', sp.potenza_cv)) filled.push('CV');
      if (setSpec('gar-f-nm', sp.coppia_nm)) filled.push('Nm');
      if (setSpec('gar-f-cc', sp.cilindrata_cc)) filled.push('cilindrata');
      if (setSpec('gar-f-peso', sp.peso_kg)) filled.push('peso');
      // 0-100 e velocità max nel db sono intervalli per categoria: non vanno nei campi come se fossero dati veri
      if (setSpec('gar-f-cambio', mapCambio(sp.trasmissione))) filled.push('cambio');
      if (setSpec('gar-f-traz', mapTraz(sp.trazione))) filled.push('trazione');
      if (setSpec('gar-f-tank', sp.serbatoio_l)) filled.push('serbatoio');
    } else {
      // Senza db.json: potenza e cilindrata dal nome del motore, il resto dal database interno
      if (setSpec('gar-f-cv', cvFromName(_pick.motore))) filled.push('CV');
      if (setSpec('gar-f-cc', ccFromName(_pick.motore))) filled.push('cilindrata');
      var lk = window._hubVehicleDB && window._hubVehicleDB.lookup({
        marca: _pick.marca, modello: (window.hubModelloBase || String)(_pick.modello),
        anno: parseInt(_pick.anno, 10) || (genYears(_pick.gen) || [])[0], type: _editingType
      });
      if (lk && lk.specs) {
        if (setSpec('gar-f-cambio', lk.specs.cambio)) filled.push('cambio');
        if (setSpec('gar-f-traz', lk.specs.trazione)) filled.push('trazione');
      }
    }
    return filled;
  }
  function syncFields() {
    document.getElementById('gar-f-marca').value = _pick.marca;
    document.getElementById('gar-f-modello').value = _pick.modello;
    document.getElementById('gar-f-anno').value = _pick.gen;
    document.getElementById('gar-f-motore').value = _pick.motore;
  }

  function opt(v, label, sel) {
    return '<option value="' + escSafe(v) + '"' + (v === sel ? ' selected' : '') + '>' + escSafe(label) + '</option>';
  }
  function renderPick() {
    var box = document.getElementById('gar-pick');
    if (!box) return;
    var manualBox = document.getElementById('gar-manual');
    if (manualBox) manualBox.style.display = _manual ? '' : 'none';
    if (_manual) {
      box.innerHTML = '<button type="button" class="gar-pick-link" onclick="_garPickManual(false)">← Scegli dall\'elenco</button>';
      return;
    }
    var cat = catalogFor(_editingType), p = _pick, html = '';
    var marche = Object.keys(cat).sort(function(a, b) { return a.localeCompare(b, 'it'); });

    html += '<div class="gar-field"><label>1 · Marca</label><select id="gar-p-marca" onchange="_garPick(\'marca\', this.value)">' +
      opt('', '— scegli la marca (' + marche.length + ') —', p.marca) + marche.map(function(m) { return opt(m, m, p.marca); }).join('') + '</select></div>';

    if (p.marca && cat[p.marca]) {
      var modelli = Object.keys(cat[p.marca]).sort(function(a, b) { return a.localeCompare(b, 'it'); });
      if (!p.modello) {
        html += '<div class="gar-pick-h">2 · Scegli il modello <span>' + modelli.length + ' modelli ' + escSafe(p.marca) + '</span></div>' +
          '<div class="gar-pick-grid">' + modelli.map(function(m) {
            var s = modelSummary(cat[p.marca][m]);
            return '<button type="button" class="gar-pick-card" data-m="' + escSafe(m) + '" onclick="_garPick(\'modello\', this.dataset.m)">' +
              '<b>' + escSafe(m) + '</b><small>' + s.anni + '</small><small>' + s.serie + (s.serie === 1 ? ' serie' : ' serie') + ' · ' + s.motori + ' motori</small></button>';
          }).join('') + '</div>';
      } else {
        var gens = cat[p.marca][p.modello] || {}, genList = Object.keys(gens);
        html += '<div class="gar-pick-sel"><div><small>Modello</small><b>' + escSafe(p.marca + ' ' + p.modello) + '</b></div>' +
          '<button type="button" class="gar-pick-link" onclick="_garPick(\'modello\', \'\')">Cambia</button></div>';
        html += '<div class="gar-row2">' +
          '<div class="gar-field"><label>3 · Serie / anni</label><select id="gar-p-gen" onchange="_garPick(\'gen\', this.value)">' +
            opt('', '— scegli —', p.gen) + genList.map(function(g) { return opt(g, g, p.gen); }).join('') + '</select></div>';
        var yr = genYears(p.gen), years = [];
        if (yr) for (var y = yr[1]; y >= yr[0]; y--) years.push(String(y));
        html += '<div class="gar-field"><label>Anno immatricolazione</label><select id="gar-p-anno"' + (yr ? '' : ' disabled') + ' onchange="_garPick(\'anno\', this.value)">' +
            opt('', yr ? '— facoltativo —' : 'prima la serie', p.anno) + years.map(function(y) { return opt(y, y, p.anno); }).join('') + '</select></div></div>';
        var motori = p.gen && gens[p.gen] ? gens[p.gen] : [];
        var db = window._vdb && window._vdb.specs;
        html += '<div class="gar-field"><label>4 · Motorizzazione' + (motori.length ? ' (' + motori.length + ')' : '') + '</label><select id="gar-p-motore"' + (motori.length ? '' : ' disabled') + ' onchange="_garPick(\'motore\', this.value)">' +
          opt('', motori.length ? '— scegli il motore —' : 'prima la serie', p.motore) + motori.map(function(m) {
            var s = db && db[[p.marca, p.modello, p.gen, m].join('||')];
            return opt(m, m + (s && s.alimentazione ? ' · ' + s.alimentazione.replace(/\s*\(.*\)/, '') : ''), p.motore);
          }).join('') + '</select></div>';
        if (p.motore) html += specCard();
      }
    }
    html += '<button type="button" class="gar-pick-link" onclick="_garPickManual(true)">Il mio veicolo non è in elenco: inserisco a mano</button>';
    box.innerHTML = html;
  }
  function specCard() {
    var sp = dbSpec();
    if (!sp) {
      return '<div class="gar-pick-spec"><p>' + (_vdbState === 'loading' ? 'Carico la scheda tecnica…' :
        window.hubVDB.has(_pick.marca) ? 'Nessuna scheda tecnica per questo motore: completa a mano le specifiche.' :
        'Scheda tecnica non disponibile (dati non raggiungibili). Potenza e cilindrata ricavate dal nome del motore.') + '</p></div>';
    }
    var rows = [
      ['Potenza', sp.potenza_cv ? sp.potenza_cv + ' CV · ' + sp.potenza_kw + ' kW' : ''],
      ['Coppia', sp.coppia_nm ? sp.coppia_nm + ' Nm' : ''],
      ['Cilindrata', sp.cilindrata_cc ? sp.cilindrata_cc + ' cc' : ''],
      ['Alimentazione', sp.alimentazione || ''],
      ['Cambio', sp.trasmissione || ''],
      ['Trazione', sp.trazione || ''],
      ['0-100 km/h', sp.acc_0_100_s ? sp.acc_0_100_s + ' s (stima di categoria)' : ''],
      ['Velocità max', sp.vel_max_kmh ? sp.vel_max_kmh + ' km/h (stima di categoria)' : ''],
      ['Consumo reale', sp.consumo_reale || ''],
      ['Peso', sp.peso_kg ? sp.peso_kg + ' kg' : ''],
      ['Serbatoio', sp.serbatoio_l ? sp.serbatoio_l + ' l' : ''],
      ['Bagagliaio', sp.bagagliaio_l ? sp.bagagliaio_l + ' l' : '']
    ].filter(function(r) { return r[1]; });
    return '<div class="gar-pick-spec"><div class="gar-pick-spec-h">Scheda tecnica · inserita nelle specifiche</div><dl>' +
      rows.map(function(r) { return '<dt>' + r[0] + '</dt><dd>' + escSafe(r[1]) + '</dd>'; }).join('') + '</dl>' +
      '<p>0-100 e velocità max sono stime per categoria e non vengono inserite nelle specifiche: scrivile tu se conosci il dato. La coppia non è indicata perché nel database non era affidabile.</p></div>';
  }

  window._garPick = function(field, value) {
    var order = ['marca', 'modello', 'gen', 'anno', 'motore'];
    _pick[field] = value || '';
    // Cambiare un livello azzera quelli successivi (l'anno no, se resta nella serie)
    for (var i = order.indexOf(field) + 1; i < order.length; i++) {
      if (order[i] === 'anno' && field === 'gen') {
        var yr = genYears(_pick.gen), a = parseInt(_pick.anno, 10);
        if (yr && a >= yr[0] && a <= yr[1]) continue;
      }
      if (field === 'anno') break;
      _pick[order[i]] = '';
    }
    // serie unica: selezionata da sola
    if (field === 'modello' && value) {
      var gens = Object.keys((catalogFor(_editingType)[_pick.marca] || {})[value] || {});
      if (gens.length === 1) _pick.gen = gens[0];
    }
    syncFields();
    // Alla scelta della marca si scaricano i suoi dati (motori con alimentazione, schede tecniche)
    if (field === 'marca' && value && !window.hubVDB.has(value)) {
      _vdbState = 'loading';
      loadVDB(value).then(function() { _vdbState = 'ok'; renderPick(); }, function() { _vdbState = 'err'; renderPick(); });
    }
    if (field === 'motore' && value) {
      var filled = fillFromPick();
      var nameEl = document.getElementById('gar-f-name');
      if (nameEl && !nameEl.value) nameEl.placeholder = 'Es. ' + (window.hubModelloBase || String)(_pick.modello) + ' di tutti i giorni';
      if (filled.length) {
        var det = document.querySelector('#gar-edit details.gar-section');
        if (det) det.open = true;
      }
    }
    renderPick();
    if (field === 'modello' && value) {
      var g = document.getElementById('gar-p-gen');
      if (g && !_pick.gen) g.focus();
    }
  };
  window._garPickManual = function(on) {
    _manual = !!on;
    renderPick();
    if (on) { var m = document.getElementById('gar-f-marca'); if (m) m.focus(); }
  };
  // Prepara il selettore all'apertura del form (nuovo veicolo o modifica)
  function initPick(v) {
    _autoFilled = {};
    var cat = catalogFor(v ? (v.type || 'auto') : _editingType);
    _pick = { marca: '', modello: '', gen: '', anno: v && v.annoImm ? String(v.annoImm) : '', motore: '' };
    _manual = false;
    if (v && v.marca) {
      var inCat = cat[v.marca] && cat[v.marca][v.modello] && (!v.anno || cat[v.marca][v.modello][v.anno]) &&
        (!v.motore || (cat[v.marca][v.modello][v.anno] || []).indexOf(v.motore) >= 0);
      if (inCat) _pick = { marca: v.marca, modello: v.modello, gen: v.anno || '', anno: v.annoImm ? String(v.annoImm) : '', motore: v.motore || '' };
      else _manual = true;
    }
    renderPick();
    if (_pick.marca) loadVDB(_pick.marca).then(function() { if (document.getElementById('gar-edit').classList.contains('visible')) renderPick(); }, function() {});
  }
  window._garInitPick = initPick;
  window._garPickAnnoImm = function() { return _manual ? '' : _pick.anno; };


  // Auto-fill specs from local DB. Populates ONLY empty fields; never overrides
  // anything the user has already typed.
  window._garAutoFill = function() {
    var marca   = document.getElementById('gar-f-marca').value.trim();
    var modello = document.getElementById('gar-f-modello').value.trim();
    var annoStr = document.getElementById('gar-f-anno').value.trim();
    var anno    = parseInt(annoStr, 10) || null;
    var result  = document.getElementById('gar-autofill-result');

    if (!marca || !modello) {
      result.className = 'gar-autofill-result gar-af-err';
      result.innerHTML = '⚠ Inserisci almeno marca e modello prima di cercare';
      result.style.display = 'block';
      return;
    }
    if (!window._hubVehicleDB) {
      result.className = 'gar-autofill-result gar-af-err';
      result.innerHTML = '⚠ Database non caricato';
      result.style.display = 'block';
      return;
    }

    var match = window._hubVehicleDB.lookup({
      marca: marca, modello: modello, anno: anno, type: _editingType
    });

    if (!match) {
      result.className = 'gar-autofill-result gar-af-warn';
      result.innerHTML = '🔍 Modello non trovato nel database.<br><small>Compila i campi specs manualmente. Se conosci più dettagli aggiungili in <em>Specifiche tecniche</em>.</small>';
      result.style.display = 'block';
      return;
    }

    var s = match.specs;
    var filled = [];
    // For each spec field: fill only if currently empty
    function maybeFill(elId, value, label) {
      if (value === null || value === undefined || value === '') return;
      var el = document.getElementById(elId);
      if (!el) return;
      if (el.value && el.value.trim() !== '') return; // preserve user value
      el.value = value;
      filled.push(label);
    }
    maybeFill('gar-f-cv',   s.cv,       'CV');
    maybeFill('gar-f-nm',   s.nm,       'Nm');
    maybeFill('gar-f-peso', s.peso,     'Peso');
    maybeFill('gar-f-cc',   s.cc,       'Cilindrata');
    maybeFill('gar-f-0100', s.kmh0_100, '0-100');
    maybeFill('gar-f-vmax', s.vmax,     'Vmax');
    maybeFill('gar-f-cambio', s.cambio,   'Cambio');
    maybeFill('gar-f-traz',   s.trazione, 'Trazione');

    // Auto-open the specs section so user sees what got filled
    var detailsEl = document.querySelector('#gar-edit details.gar-section');
    if (detailsEl) detailsEl.open = true;

    result.className = 'gar-autofill-result gar-af-ok';
    if (filled.length === 0) {
      result.innerHTML = '✓ Match: <strong>' + match.matchedAs + '</strong><br><small>Tutti i campi specs erano già compilati, niente sovrascritto.</small>';
    } else {
      result.innerHTML = '✓ Match: <strong>' + match.matchedAs + '</strong><br><small>Compilati: ' + filled.join(', ') + '</small>';
    }
    result.style.display = 'block';
  };

  window.saveGarageEdit = async function() {
    var name = document.getElementById('gar-f-name').value.trim();
    var marca = document.getElementById('gar-f-marca').value.trim();
    var modello = document.getElementById('gar-f-modello').value.trim();
    var anno = document.getElementById('gar-f-anno').value.trim();
    var motore = document.getElementById('gar-f-motore').value.trim();
    if (!marca || !modello) {
      alert('Scegli almeno marca e modello (oppure inseriscili a mano).');
      return;
    }
    var patch = {
      type: _editingType || 'auto',
      customName: name,
      marca: marca,
      modello: modello,
      anno: anno,
      motore: motore,
      annoImm: parseInt(window._garPickAnnoImm(), 10) || null,
      targa: document.getElementById('gar-f-targa').value.trim().toUpperCase(),
      kmTot: parseInt(document.getElementById('gar-f-km').value, 10) || 0,
      scadBollo: document.getElementById('gar-f-bollo').value || '',
      scadRca: document.getElementById('gar-f-rca').value || '',
      scadRev: document.getElementById('gar-f-rev').value || '',
      scadTagliando: document.getElementById('gar-f-tag').value || '',
      serbatoio: (function(){ var e=document.getElementById('gar-f-tank'); return e?(parseFloat(e.value)||null):null; })(),
      costoBollo: parseFloat(document.getElementById('gar-f-bollo-cost').value) || 0,
      costoRca:   parseFloat(document.getElementById('gar-f-rca-cost').value)   || 0,
      costoRev:   parseFloat(document.getElementById('gar-f-rev-cost').value)   || 0,
      specs: {
        cv:       parseFloat(document.getElementById('gar-f-cv').value)       || null,
        nm:       parseFloat(document.getElementById('gar-f-nm').value)       || null,
        peso:     parseFloat(document.getElementById('gar-f-peso').value)     || null,
        cc:       parseFloat(document.getElementById('gar-f-cc').value)       || null,
        kmh0_100: parseFloat(document.getElementById('gar-f-0100').value)     || null,
        vmax:     parseFloat(document.getElementById('gar-f-vmax').value)     || null,
        cambio:   document.getElementById('gar-f-cambio').value || '',
        trazione: document.getElementById('gar-f-traz').value   || '',
        acqCost:  parseFloat(document.getElementById('gar-f-acq-cost').value) || null,
        acqDate:  document.getElementById('gar-f-acq-date').value || ''
      },
      gomme: {
        misura:        document.getElementById('gar-f-gomme-misura').value.trim(),
        marca:         document.getElementById('gar-f-gomme-marca').value.trim(),
        modello:       document.getElementById('gar-f-gomme-modello').value.trim(),
        tipo:          document.getElementById('gar-f-gomme-tipo').value,
        dataMontaggio: document.getElementById('gar-f-gomme-data').value || '',
        kmMontaggio:   parseInt(document.getElementById('gar-f-gomme-km').value, 10) || null
      },
      noteTec: {
        pressioni: document.getElementById('gar-f-press').value.trim(),
        olio:      document.getElementById('gar-f-olio').value.trim(),
        codici:    document.getElementById('gar-f-codici').value.trim(),
        settings:  document.getElementById('gar-f-settings').value.trim()
      },
      note: document.getElementById('gar-f-note').value.trim()
    };
    var g = loadGarage();
    var savedId;
    if (_editingId) {
      var i = g.findIndex(function(v) { return v.id === _editingId; });
      if (i >= 0) g[i] = Object.assign({}, g[i], patch);
      savedId = _editingId;
    } else {
      patch.id = uid();
      patch.createdAt = Date.now();
      g.push(patch);
      if (g.length === 1) setActiveId(patch.id);
      savedId = patch.id;
    }
    saveGarage(g);

    // Photo persistence
    if (_pendingPhoto !== null && savedId) {
      try {
        if (_pendingPhoto === '') {
          await dbDeletePhoto(savedId);
        } else {
          await dbPutPhoto(savedId, _pendingPhoto);
        }
      } catch(e) { console.error('[AutoHub] photo save failed', e); }
    }
    _pendingPhoto = null;

    closeGarageEdit();
    renderGarageList();
    refreshGarageBadge();
  };

  window.deleteVehicle = function(id) {
    if (!confirm('Eliminare questo veicolo dal garage?')) return;
    var g = loadGarage().filter(function(v) { return v.id !== id; });
    saveGarage(g);
    if (getActiveId() === id) {
      setActiveId(g.length ? g[0].id : null);
    }
    // Best-effort: also remove photo
    try { dbDeletePhoto(id); } catch(_) {}
    renderGarageList();
    refreshGarageBadge();
  };

  window.useVehicle = function(id) {
    setActiveId(id);
    var v = loadGarage().find(function(x) { return x.id === id; });
    refreshGarageBadge();
    renderGarageList();
    if (v) applyVehicleToDiagnosis(v);
    closeGarage();
  };

  /* ── List rendering ─────────────────────────────────────────── */
  function renderGarageList() {
    var list = document.getElementById('gar-list');
    if (!list) return;
    var g = loadGarage();
    var activeId = getActiveId();
    if (g.length === 0) {
      list.innerHTML = '<div class="gar-empty">Nessun veicolo nel garage.<br>Aggiungi auto o moto per usarle nella Diagnosi e tracciare consumi.</div>';
      return;
    }
    list.innerHTML = g.map(function(v) {
      var isActive = v.id === activeId;
      var icon = v.type === 'moto' ? '🏍' : '🚗';
      var displayName = v.customName || (v.marca + ' ' + v.modello);
      var spec = [v.marca, v.modello, v.annoImm || v.anno, v.motore].filter(Boolean).join(' · ');
      var tags = [];
      if (v.targa) tags.push(escSafe(v.targa));
      if (typeof v.kmTot === 'number' && v.kmTot > 0) tags.push(v.kmTot.toLocaleString('it-IT') + ' km');
      var scadenze = _formatScadenze(v);
      if (scadenze) tags.push(scadenze);

      return '<div class="gar-veh' + (isActive ? ' gar-veh-active' : '') + '">' +
        '<div class="gar-veh-row" onclick="useVehicle(\'' + v.id + '\')">' +
          '<div class="gar-veh-photo" data-vid="' + v.id + '">' +
            '<div class="gar-veh-photo-placeholder">' + icon + '</div>' +
          '</div>' +
          '<div class="gar-veh-info">' +
            '<div class="gar-veh-name">' + escSafe(displayName) + '</div>' +
            '<div class="gar-veh-spec">' + escSafe(spec) + '</div>' +
            (tags.length ? '<div class="gar-veh-tags">' +
              tags.map(function(t) { return '<span class="gar-veh-tag">' + t + '</span>'; }).join('') +
            '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="gar-veh-actions">' +
          (isActive ? '' :
            '<button class="gar-veh-act" onclick="useVehicle(\'' + v.id + '\')">Usa</button>') +
          '<button class="gar-veh-act" onclick="openGarageEdit(\'' + v.id + '\')">Modifica</button>' +
          '<button class="gar-veh-act" onclick="garCalendar(\'' + v.id + '\')" title="Scadenze nel calendario">📅 Scadenze</button>' +
          '<button class="gar-veh-act" onclick="hubUsatoFromVehicle(\'' + v.id + '\', \'simili\')">Cerca simili</button>' +
          '<button class="gar-veh-act" onclick="hubUsatoFromVehicle(\'' + v.id + '\', \'valore\')">Quanto vale</button>' +
          '<button class="gar-veh-act gar-veh-act-del" onclick="deleteVehicle(\'' + v.id + '\')">Elimina</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Lazy-load photos asynchronously to avoid blocking the render
    list.querySelectorAll('.gar-veh-photo[data-vid]').forEach(function(el) {
      var vid = el.dataset.vid;
      dbGetPhoto(vid).then(function(dataUrl) {
        if (!dataUrl) return;
        // Make sure the slot still belongs to the same vehicle
        if (el.dataset.vid === vid) {
          el.innerHTML = '<img src="' + dataUrl + '" alt="">';
        }
      });
    });
  }

  // Scadenze del veicolo (o di tutti) in un file calendario, con promemoria 7 giorni e 1 giorno prima
  function scadEvents(v) {
    var name = v.customName || (v.marca + ' ' + v.modello);
    var items = [['scadBollo', 'Bollo'], ['scadRca', 'Assicurazione RCA'], ['scadRev', 'Revisione'], ['scadTagliando', 'Tagliando']];
    return items.filter(function(x) { return /^\d{4}-\d{2}-\d{2}$/.test(v[x[0]] || ''); }).map(function(x) {
      return { uid: v.id + '-' + x[0] + '-' + v[x[0]], date: v[x[0]], title: x[1] + ' · ' + name + (v.targa ? ' (' + v.targa + ')' : ''),
        desc: 'Scadenza registrata in AutoHub.', alarms: [7 * 24 * 60, 24 * 60] };
    });
  }
  window.garCalendar = function(id) {
    var g = loadGarage(), list = id ? g.filter(function(v) { return v.id === id; }) : g;
    var ev = [];
    list.forEach(function(v) { ev = ev.concat(scadEvents(v)); });
    if (!ev.length) { alert('Nessuna scadenza inserita: aggiungi le date di bollo, RCA, revisione o tagliando in Modifica.'); return; }
    window.hubICS(ev, 'scadenze-' + (id && list[0] ? (list[0].targa || list[0].modello) : 'garage').replace(/[^\w-]+/g, '_').toLowerCase() + '.ics');
  };

  function _formatScadenze(v) {
    var dates = [];
    var today = new Date(); today.setHours(0,0,0,0);
    function check(label, dateStr) {
      if (!dateStr) return;
      var d = new Date(dateStr);
      if (isNaN(d)) return;
      var days = Math.round((d - today) / 86400000);
      if (days < 0) dates.push('⚠ ' + label + ' scaduto');
      else if (days <= 30) dates.push('⏰ ' + label + ' tra ' + days + 'gg');
    }
    check('bollo', v.scadBollo);
    check('RCA', v.scadRca);
    check('revisione', v.scadRev);
    check('tagliando', v.scadTagliando);
    return dates.length ? dates[0] : '';
  }

  /* ── Active-vehicle badge in launch button ──────────────────── */
  function refreshGarageBadge() {
    var b = document.getElementById('gar-launch-active');
    if (!b) return;
    var v = getActiveVehicle();
    if (v) {
      var name = v.customName || (v.marca + ' ' + v.modello);
      b.textContent = (v.type === 'moto' ? '🏍 ' : '🚗 ') + name;
    } else {
      b.textContent = 'Nessun veicolo';
    }
    renderShowroom();
  }
  window._hubRefreshGarageBadge = refreshGarageBadge;

  /* ── Showroom card: featured active vehicle in garage section ── */
  function renderShowroom() {
    var slot = document.getElementById('garage-showroom-slot');
    if (!slot) return;
    var v = getActiveVehicle();
    if (!v) {
      slot.innerHTML = '';
      return;
    }
    var name = v.customName || (v.marca + ' ' + v.modello);
    var sub = [v.marca, v.modello, v.annoImm || v.anno].filter(Boolean).join(' · ');
    var icon = v.type === 'moto' ? '🏍' : '🚗';

    // Compute kg/cv if specs present
    var kgcv = '';
    if (v.specs && v.specs.peso && v.specs.cv) {
      var ratio = (v.specs.peso / v.specs.cv).toFixed(2);
      kgcv = ratio;
    }

    // Birthday check (today is anniversary of acquisition)
    var birthday = '';
    if (v.specs && v.specs.acqDate) {
      var acq = new Date(v.specs.acqDate);
      var today = new Date();
      if (acq.getMonth() === today.getMonth() && acq.getDate() === today.getDate()) {
        var years = today.getFullYear() - acq.getFullYear();
        if (years >= 1) birthday = '🎂 oggi ' + years + ' ann' + (years === 1 ? 'o' : 'i') + ' insieme!';
      }
    }

    // Stats grid: km, cv, kg/cv, costoAcquisto/eta
    var stats = [];
    if (typeof v.kmTot === 'number' && v.kmTot > 0) stats.push({ lbl: 'KM', val: v.kmTot.toLocaleString('it-IT') });
    if (v.specs && v.specs.cv) stats.push({ lbl: 'CV', val: Math.round(v.specs.cv) });
    if (kgcv) stats.push({ lbl: 'KG/CV', val: kgcv });
    if (v.specs && v.specs.kmh0_100) stats.push({ lbl: '0-100', val: v.specs.kmh0_100 + 's' });

    // Upcoming scadenze
    var alerts = [];
    var now = Date.now();
    function daysUntil(dStr) {
      if (!dStr) return null;
      return Math.round((new Date(dStr).getTime() - now) / 86400000);
    }
    [
      { date: v.scadBollo, lbl: 'Bollo' },
      { date: v.scadRca,   lbl: 'RCA' },
      { date: v.scadRev,   lbl: 'Revisione' },
      { date: v.scadTagliando, lbl: 'Tagliando' }
    ].forEach(function(s) {
      var d = daysUntil(s.date);
      if (d !== null && d <= 30) {
        var cls = d < 0 ? 'crit' : d <= 7 ? 'warn' : 'ok';
        var txt = d < 0 ? 'scaduto ' + Math.abs(d) + 'gg' : 'tra ' + d + 'gg';
        alerts.push({ lbl: s.lbl, txt: txt, cls: cls });
      }
    });

    var statsHtml = stats.length ? '<div class="sr-stats">' + stats.map(function(s) {
      return '<div class="sr-stat"><div class="sr-stat-lbl">' + s.lbl + '</div><div class="sr-stat-val">' + s.val + '</div></div>';
    }).join('') + '</div>' : '';

    var alertsHtml = alerts.length ? '<div class="sr-alerts">' + alerts.map(function(a) {
      return '<span class="sr-alert sr-alert-' + a.cls + '">' + a.lbl + ' ' + a.txt + '</span>';
    }).join('') + '</div>' : '';

    var birthdayHtml = birthday ? '<div class="sr-birthday">' + birthday + '</div>' : '';

    slot.innerHTML =
      '<div class="sr-card" onclick="openGarage()">' +
        '<div class="sr-photo" id="sr-photo" data-vid="' + v.id + '">' +
          '<div class="sr-photo-placeholder">' + icon + '</div>' +
        '</div>' +
        '<div class="sr-info">' +
          '<div class="sr-name">' + escSafe(name) + '</div>' +
          '<div class="sr-sub">' + escSafe(sub) + '</div>' +
          birthdayHtml +
          statsHtml +
          alertsHtml +
        '</div>' +
      '</div>';

    // Lazy load photo
    if (typeof window._hubPhotoGet === 'function') {
      window._hubPhotoGet(v.id).then(function(dataUrl) {
        if (!dataUrl) return;
        var photoEl = document.getElementById('sr-photo');
        if (photoEl && photoEl.dataset.vid === v.id) {
          photoEl.innerHTML = '<img src="' + dataUrl + '" alt="">';
        }
      });
    }
  }

  /* ── Apply selected vehicle to the diagnosis dropdowns ─────── */
  function applyVehicleToDiagnosis(v) {
    if (!v) return;
    try {
      // 1. switch auto/moto mode (which rebuilds the marca list)
      if (typeof window.setVehicleMode === 'function') {
        window.setVehicleMode(v.type === 'moto' ? 'moto' : 'auto');
      }
      // 2. populate marca/modello/anno/motore via existing flow
      setTimeout(function() {
        if (typeof window.selectOption === 'function') {
          if (v.marca) window.selectOption('marca', v.marca);
          setTimeout(function() {
            if (v.modello && typeof window.selectOption === 'function') {
              window.selectOption('modello', v.modello);
            }
            setTimeout(function() {
              var sa = document.getElementById('sel-anno');
              if (sa && v.anno) {
                var hasAnno = Array.from(sa.options).some(function(o) { return o.value === v.anno; });
                if (hasAnno) {
                  sa.value = v.anno;
                  if (typeof window.updateMotori === 'function') window.updateMotori();
                  setTimeout(function() {
                    var sm = document.getElementById('sel-motore');
                    if (sm && v.motore) {
                      var hasMot = Array.from(sm.options).some(function(o) { return o.value === v.motore; });
                      if (hasMot) sm.value = v.motore;
                    }
                  }, 50);
                }
              }
            }, 100);
          }, 100);
        }
      }, 80);
    } catch(e) { console.error('[AutoHub] applyVehicleToDiagnosis failed', e); }
  }

  // Expose for other modules
  window._hubApplyVehicleToDiagnosis = applyVehicleToDiagnosis;

  /* ── Init: inject UI, restore active vehicle on page load ──── */
  document.addEventListener('DOMContentLoaded', function() {
    injectGarageUI();
    setTimeout(function() {
      var v = getActiveVehicle();
      if (v) {
        // Defer to allow diagnosis dropdowns to be initialized first
        setTimeout(function() { applyVehicleToDiagnosis(v); }, 200);
      }
    }, 100);
  });

  /* ── Pill auto-hide: garage overlay + edit modal also hide it ─ */
})();

