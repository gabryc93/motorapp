
// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════
function extractJSON(raw) {
  let t = raw.replace(/```json\s*/gi,'').replace(/```/g,'').trim();
  try { return JSON.parse(t); } catch(e) {}
  const s = t.indexOf('{');
  if (s === -1) throw new Error('Nessun JSON trovato');
  let end = t.lastIndexOf('}');
  while (end > s) {
    try { return JSON.parse(t.slice(s, end+1)); } catch(e) { end = t.lastIndexOf('}', end-1); }
  }
  let p = t.slice(s);
  const lc = p.lastIndexOf(','), lb = p.lastIndexOf('{');
  if (lb > lc) p = p.slice(0, lc);
  let opens=0, brackets=0;
  for (const ch of p) { if(ch==='{') opens++; else if(ch==='}') opens--; else if(ch==='[') brackets++; else if(ch===']') brackets--; }
  p += ']'.repeat(Math.max(0,brackets)) + '}'.repeat(Math.max(0,opens));
  return JSON.parse(p);
}

function setLoading(v) {
  document.getElementById('loading').className = v ? 'loading on' : 'loading';
  document.getElementById('btn-analisi').disabled = v;
}
function setLoadingMsg(m) {
  const el = document.getElementById('load-msg');
  if (el) el.textContent = m;
}
function showError(m) {
  document.getElementById('error-msg').textContent = m;
  document.getElementById('error-box').className = 'ebox on';
}
function hideError() { document.getElementById('error-box').className = 'ebox'; }

// ═══════════════════════════════════════════════════════════════════
// MAIN NAV
// ═══════════════════════════════════════════════════════════════════
function switchView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  document.querySelector('.nav-btn[data-view="' + id + '"]').classList.add('active');
  if (id === 'diario') diaryInit();
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH DROPDOWNS (analisi)
// ═══════════════════════════════════════════════════════════════════
var _searchData = { marca: [], modello: [] };
var _closeTimer = {};

function buildMarcaList() {
  var src = _vehicleMode === 'moto' ? MOTORCYCLES : VEHICLES;
  _searchData.marca = Object.keys(src).sort();
}
function buildModelloList(marca) {
  var src = _vehicleMode === 'moto' ? MOTORCYCLES : VEHICLES;
  _searchData.modello = marca && src[marca] ? Object.keys(src[marca]).sort() : [];
}

function filterSearch(type) {
  var inp = document.getElementById('search-' + type);
  var drop = document.getElementById('drop-' + type);
  var q = inp.value.toLowerCase();
  var items = _searchData[type].filter(function(x){ return x.toLowerCase().includes(q); });
  renderDrop(drop, items, q, function(item){ selectOption(type, item); });
  drop.classList.add('open');
}
function openDropdown(type) {
  clearTimeout(_closeTimer[type]);
  filterSearch(type);
}
function closeDropdown(type) {
  _closeTimer[type] = setTimeout(function(){ document.getElementById('drop-' + type).classList.remove('open'); }, 200);
}
function renderDrop(drop, items, q, onSelect) {
  if (!items.length) {
    drop.innerHTML = '<div class="sdo" style="color:var(--t3)">Nessun risultato</div>';
    return;
  }
  drop.innerHTML = items.map(function(item) {
    var safe = q ? q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') : '';
    var hi = safe ? item.replace(new RegExp('(' + safe + ')','gi'),'<mark>$1</mark>') : item;
    var d = document.createElement('div');
    d.className = 'sdo';
    d.dataset.val = item;
    d.innerHTML = hi;
    return d.outerHTML;
  }).join('');
  drop.querySelectorAll('.sdo[data-val]').forEach(function(el) {
    el.addEventListener('mousedown', function(e) { e.preventDefault(); onSelect(this.dataset.val); });
  });
}

function selectOption(type, value) {
  document.getElementById('search-' + type).value = value;
  document.getElementById('sel-' + type).value = value;
  document.getElementById('drop-' + type).classList.remove('open');
  if (type === 'marca') {
    buildModelloList(value);
    var sm = document.getElementById('search-modello');
    sm.value = ''; sm.disabled = false; sm.placeholder = 'Cerca modello…';
    document.getElementById('sel-modello').value = '';
    document.getElementById('sel-anno').innerHTML = '<option value="">— Anno —</option>';
    document.getElementById('sel-motore').innerHTML = '<option value="">— Motore —</option>';
  } else if (type === 'modello') {
    updateAnni();
  }
}

function updateAnni(init) {
  var src     = _vehicleMode === 'moto' ? MOTORCYCLES : VEHICLES;
  var marca   = document.getElementById('sel-marca').value;
  var modello = document.getElementById('sel-modello').value;
  var sel = document.getElementById('sel-anno');
  sel.innerHTML = '<option value="">— Anno —</option>';
  document.getElementById('sel-motore').innerHTML = '<option value="">— Motore —</option>';
  if (!marca || !modello || !src[marca] || !src[marca][modello]) return;
  Object.keys(src[marca][modello]).forEach(function(a) {
    var o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o);
  });
  if (init) { sel.value = Object.keys(src[marca][modello])[0]; updateMotori(true); }
}

function updateMotori(init) {
  var src     = _vehicleMode === 'moto' ? MOTORCYCLES : VEHICLES;
  var marca   = document.getElementById('sel-marca').value;
  var modello = document.getElementById('sel-modello').value;
  var anno    = document.getElementById('sel-anno').value;
  var sel = document.getElementById('sel-motore');
  sel.innerHTML = '<option value="">— Motore —</option>';
  if (!marca || !modello || !anno) return;
  var motori = (src[marca] && src[marca][modello] && src[marca][modello][anno]) || [];
  motori.forEach(function(m) {
    var o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o);
  });
  if (init && motori.length) sel.value = motori[0];
}

function populateMarca() {
  _vehicleMode = 'auto';
  buildMarcaList();
  selectOption('marca','Alfa Romeo');
  selectOption('modello','Giulia');
  updateAnni(true);
}

// ═══════════════════════════════════════════════════════════════════
// DIAGNOSI
// ═══════════════════════════════════════════════════════════════════
async function avviaDiagnosi() {
  var marca   = document.getElementById('sel-marca').value;
  var modello = document.getElementById('sel-modello').value;
  var anno    = document.getElementById('sel-anno').value;
  var motore  = document.getElementById('sel-motore').value;
  if (!marca || !modello || !anno || !motore) { showError('Seleziona tutti i campi.'); return; }

  setLoading(true); hideError();
  document.getElementById('results').innerHTML = '';
  document.getElementById('tabs').className = 'tabs';
  document.getElementById('filter-bar').className = 'filter-bar';

  // vehicle bar
  var bar = document.getElementById('vehicle-bar');
  bar.className = 'visible';
  bar.innerHTML = '<span style="color:var(--t3);font-size:.58rem;text-transform:uppercase;letter-spacing:.1em">Veicolo:</span>'
    + '<span class="vtag">' + marca + '</span>'
    + '<span class="vtag">' + modello + '</span>'
    + '<span class="vtag">' + anno + '</span>'
    + '<span class="vtag">' + motore + '</span>';

  try {
    if (!window.hubVDB.has(marca)) setLoadingMsg('Carico i dati ' + marca + '…');
    await window.hubVDB.ensure([marca]);
    var dbKey = marca + '||' + modello + '||' + anno + '||' + motore;
    var entry = window._vdb && window._vdb.vehicles && window._vdb.vehicles[dbKey];
    if (!entry) { setLoading(false); showNotInDB(marca, modello, anno, motore); return; }

    // source badge
    var badge = document.createElement('span');
    badge.className = 'src-badge';
    badge.style.cssText = 'color:var(--grn);border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.07)';
    badge.textContent = '⚡ database locale';
    bar.appendChild(badge);

    renderResults(entry, marca, modello, anno, motore);
  } catch(err) {
    showError('Errore durante l\'analisi: ' + err.message);
  } finally {
    setLoading(false);
  }
}

function showNotInDB(marca, modello, anno, motore) {
  document.getElementById('results').innerHTML =
    '<div class="nodb">'
    + '<div class="nodb-icon">🔧</div>'
    + '<div class="nodb-title">Veicolo non ancora nel database</div>'
    + '<div class="nodb-text"><strong style="color:var(--t1)">' + marca + ' ' + modello + ' ' + anno + ' — ' + motore + '</strong><br>'
    + 'Questo veicolo verrà aggiunto al prossimo aggiornamento settimanale.<br>'
    + 'Il database copre già <strong style="color:var(--t1)">' + ((window._vdb && window._vdb._meta && window._vdb._meta.total_vehicles) || 2976).toLocaleString('it-IT') + ' combinazioni</strong> di veicoli e motori.</div>'
    + '<div class="nodb-note">Nessuna chiamata API · Costo €0</div>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// TAB SYSTEM
// ═══════════════════════════════════════════════════════════════════
function switchTab(id) {
  document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  var pane = document.getElementById('tab-' + id);
  var btn  = document.querySelector('.tab-btn[data-tab="' + id + '"]');
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');
  document.getElementById('filter-bar').className = (id === 'problemi') ? 'filter-bar visible' : 'filter-bar';
}

// ═══════════════════════════════════════════════════════════════════
// FILTER
// ═══════════════════════════════════════════════════════════════════
function applyFilter(sev) {
  document.querySelectorAll('.fbtn').forEach(function(b){ b.className = 'fbtn'; });
  var btn = document.querySelector('.fbtn[data-sev="' + sev + '"]');
  if (btn) btn.classList.add(sev === 'all' ? 'fa' : (sev === 'alta' ? 'falta' : (sev === 'media' ? 'fmedia' : 'fbassa')));
  document.querySelectorAll('.problem-card').forEach(function(c){
    c.classList.toggle('hf', sev !== 'all' && c.dataset.sev !== sev);
  });
}

// ═══════════════════════════════════════════════════════════════════
// RENDER RESULTS
// ═══════════════════════════════════════════════════════════════════
function renderResults(data, marca, modello, anno, motore) {
  var db = window._vdb || {};
  var dbKey = marca + '||' + modello + '||' + anno + '||' + motore;
  var maint = db.maintenance && db.maintenance[dbKey];

  // ── affidabilità ──────────────────────────────────────────────────
  var affClass = { alta:'aff-alta', media:'aff-media', bassa:'aff-bassa' }[data.affidabilita] || 'aff-media';
  var affIcon  = { alta:'▲ Alta affidabilità', media:'◆ Affidabilità media', bassa:'▼ Bassa affidabilità' }[data.affidabilita] || '';

  // ── TAB: problemi ─────────────────────────────────────────────────
  var tProblemi = '<div class="rh"><div class="rt">Problemi Noti</div>'
    + '<div class="rc">' + (data.problemi||[]).length + ' problemi identificati</div></div>'
    + '<div class="summary-box ' + affClass + '"><div class="aff-label">' + affIcon + '</div>'
    + '<div class="summary-text">' + (data.sommario||'') + '</div></div>';

  (data.problemi||[]).forEach(function(p, i) {
    var sev = p.severita || 'media';
    var cost = (p.costo_min && p.costo_max)
      ? '€' + Number(p.costo_min).toLocaleString() + '–' + Number(p.costo_max).toLocaleString()
      : (p.costo_stima || '');
    tProblemi += '<div class="problem-card" id="pc-' + i + '" data-sev="' + sev + '">'
      + '<div class="pch" onclick="toggleCard(' + i + ')">'
      + '<span class="sdot s' + sev[0] + '"></span>'
      + '<span class="ptitle">' + p.titolo + '</span>'
      + '<span class="slbl l' + sev[0] + '">' + sev + '</span>'
      + '<span class="chev">▼</span></div>'
      + '<div class="pcb">'
      + '<div class="psec"><div class="pst">// Descrizione</div><p>' + p.descrizione + '</p></div>'
      + (p.sintomi&&p.sintomi.length ? '<div class="psec"><div class="pst">// Sintomi</div><ul>'
        + p.sintomi.map(function(s){ return '<li>'+s+'</li>'; }).join('') + '</ul></div>' : '')
      + (p.soluzione ? '<div class="psec"><div class="pst">// Soluzione</div><p>' + p.soluzione + '</p></div>' : '')
      + (cost ? '<div class="cbadge">💶 ' + cost + '</div>' : '')
      + '</div></div>';
  });

  // ── TAB: stats ───────────────────────────────────────────────────
  var tStats = '<div class="sg">'
    + '<div class="sc sr"><div class="slb">Budget manutenzione</div>'
    + '<div class="sv" style="color:var(--err)">€' + Number(data.costo_totale_min||0).toLocaleString() + '–' + Number(data.costo_totale_max||0).toLocaleString() + '</div>'
    + '<div class="ss">stima totale problemi noti</div></div>'
    + '<div class="sc so"><div class="slb">RC Auto indicativa</div>'
    + '<div class="sv" style="color:var(--gold)">' + (data.assicurazione_fascia||'N/D') + '</div>'
    + '<div class="ss">fascia mercato Italia</div></div>'
    + '<div class="sc sg2"><div class="slb">Consumi dichiarati</div>'
    + '<div class="sv" style="color:var(--grn);font-size:1.1rem">' + (data.consumo_dichiarato||'N/D') + '</div>'
    + '<div class="ss">dato ufficiale WLTP</div></div>'
    + '<div class="sc sb2"><div class="slb">Consumi reali stimati</div>'
    + '<div class="sv" style="color:var(--blue);font-size:1.1rem">' + (data.consumo_reale||'N/D') + '</div>'
    + '<div class="ss">uso misto reale</div></div>'
    + '</div>';
  tStats += '<div class="shd">// Red flag per chilometraggio</div><ul class="rfl">';
  (data.km_red_flags||[]).forEach(function(f){
    tStats += '<li class="rfi"><div class="rfk">' + Number(f.km).toLocaleString() + '<span>km</span></div>'
      + '<div class="rfd">' + f.descrizione + '</div></li>';
  });
  tStats += '</ul>';

  // ── TAB: manutenzione ────────────────────────────────────────────
  var tMaint = '<div style="color:var(--t3);font-size:.83rem;padding:18px 0">Dati non disponibili per questo veicolo.</div>';
  if (maint) {
    var o=maint.olio||{}, d=maint.distribuzione, c=maint.candele,
        r=maint.refrigerante||{}, fr=maint.liquido_freni||{},
        fi=maint.filtri||{}, lm=maint.lampadine||{}, sc=maint.schedule||[];
    var distBadge = d ? (d.tipo==='Catena'
      ? '<span class="bcat bc-grn">⛓ Catena — no sostituzione programmata</span>'
      : '<span class="bcat bc-red">⚠ Cinghia — sostituzione obbligatoria</span>') : '';
    var distSub = d ? (d.tipo==='Catena' ? d.note
      : (d.intervallo_km ? 'Ogni <strong>' + Number(d.intervallo_km).toLocaleString() + ' km</strong> o <strong>'+(d.intervallo_anni||5)+' anni</strong>' : d.note)) : 'N/A';

    tMaint = '<div class="ms"><div class="shd">// Fluidi</div><div class="mg">'
      + '<div class="mc co"><div class="mclb">Olio motore</div>'
      + '<div class="mcv">' + (o.viscosita||'N/A') + '</div>'
      + '<div class="mcs">Norma: <strong>' + (o.norma||'N/A') + '</strong><br>'
      + 'Ogni <strong>' + (o.intervallo_km?Number(o.intervallo_km).toLocaleString():'?') + ' km</strong>'
      + ' o <strong>' + (o.intervallo_mesi||'?') + ' mesi</strong></div></div>'
      + '<div class="mc cb2"><div class="mclb">Liquido raffreddamento</div>'
      + '<div class="mcv">' + (r.tipo?r.tipo.split('/')[0].trim():'N/A') + '</div>'
      + '<div class="mcs">Colore: <strong>' + (r.colore||'—') + '</strong> · Ogni <strong>' + (r.intervallo_anni||'?') + ' anni</strong></div></div>'
      + '<div class="mc cr"><div class="mclb">Liquido freni</div>'
      + '<div class="mcv">' + (fr.tipo||'DOT 4') + '</div>'
      + '<div class="mcs">Ogni <strong>' + (fr.intervallo_anni||2) + ' anni</strong></div></div>'
      + '</div></div>';

    tMaint += '<div class="ms"><div class="shd">// Distribuzione & Accensione</div><div class="mg">'
      + '<div class="mc ' + (d&&d.tipo==='Catena'?'cg':'cr') + '"><div class="mclb">Distribuzione</div>'
      + '<div class="mcv">' + (d?d.tipo:'N/A') + '</div>'
      + '<div class="mcs">' + distSub + '</div>' + distBadge + '</div>'
      + (c ? '<div class="mc co"><div class="mclb">Candele</div><div class="mcv">'+c.tipo+'</div>'
        + '<div class="mcs">Ogni <strong>'+Number(c.km).toLocaleString()+' km</strong></div></div>' : '')
      + '<div class="mc"><div class="mclb">Filtri</div>'
      + '<div class="mcv" style="font-size:.8rem;line-height:1.6">'
      + 'Aria: ogni <strong>'+(fi.aria_km?Number(fi.aria_km).toLocaleString():'30.000')+' km</strong><br>'
      + 'Abitacolo: ogni <strong>'+(fi.abitacolo_km?Number(fi.abitacolo_km).toLocaleString():'20.000')+' km</strong>'
      + (fi.gasolio_km?'<br>Gasolio: ogni <strong>'+Number(fi.gasolio_km).toLocaleString()+' km</strong>':'')
      + (fi.dsg_km?'<br>Olio DSG: ogni <strong>'+Number(fi.dsg_km).toLocaleString()+' km</strong>':'')
      + '</div></div></div></div>';

    tMaint += '<div class="ms"><div class="shd">// Lampadine</div>'
      + '<table class="btb"><thead><tr><th>Funzione</th><th>Tipo</th></tr></thead><tbody>'
      + ['anabbaglianti','abbaglianti','indicatori','luci_posizione','luci_stop','retromarcia','plafoniera'].map(function(k){
          var labels={'anabbaglianti':'Anabbaglianti','abbaglianti':'Abbaglianti','indicatori':'Indicatori',
            'luci_posizione':'Luci posizione','luci_stop':'Luci stop','retromarcia':'Retromarcia','plafoniera':'Plafoniera'};
          return '<tr><td>'+labels[k]+'</td><td>'+(lm[k]||'—')+'</td></tr>';
        }).join('')
      + '</tbody></table>'
      + (lm.note?'<div style="margin-top:9px;font-size:.72rem;color:var(--t3);font-family:var(--mono);line-height:1.5">⚠ '+lm.note+'</div>':'')
      + '</div>';

    tMaint += '<div class="ms"><div class="shd">// Calendario manutenzione</div>'
      + '<div style="display:flex;gap:14px;margin-bottom:10px;font-family:var(--mono);font-size:.58rem;color:var(--t3);text-transform:uppercase;letter-spacing:.08em">'
      + '<span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--err);margin-right:4px;vertical-align:middle"></span>Alta</span>'
      + '<span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--warn);margin-right:4px;vertical-align:middle"></span>Media</span>'
      + '<span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--grn);margin-right:4px;vertical-align:middle"></span>Bassa</span>'
      + '</div><ul class="scl">'
      + sc.map(function(s){
          return '<li class="sci"><span class="sin">'+s.intervallo+'</span>'
            +'<span class="sop">'+s.operazione+'</span>'
            +'<span class="pd pd-'+s.priorita[0]+'"></span></li>';
        }).join('')
      + '</ul></div>';
  }

  // ── TAB: checklist ───────────────────────────────────────────────
  var checks = data.checklist_ispezione||[];
  var tCheck = '<div class="cprog"><span id="chk-cnt">0/'+checks.length+' completati</span>'
    + '<div class="cpb"><div class="cpf" id="chk-fill" style="width:0%"></div></div>'
    + '<button class="btn-outline" onclick="resetChecklist()">Reset</button>'
    + '<button class="btn-outline" onclick="window.print()">🖨 Stampa</button></div>'
    + '<ul class="cl" id="checklist-ul">'
    + checks.map(function(item,i){
        return '<li class="cli" id="chk-'+i+'" onclick="toggleCheck('+i+')">'
          +'<div class="cb"></div><span class="ct">'+item+'</span></li>';
      }).join('')
    + '</ul>';

  // ── TAB: domande ─────────────────────────────────────────────────
  var domande = data.domande_venditore||[];
  var tDomande = '<p style="font-family:var(--mono);font-size:.58rem;text-transform:uppercase;letter-spacing:.1em;color:var(--t3);margin-bottom:14px">Domande basate sui problemi noti di questo veicolo</p>'
    + domande.map(function(d,i){
        return '<div class="qi"><span class="qn">'+(i+1)+'</span><span>'+d+'</span></div>';
      }).join('');

  // ── TAB: tecnico (pressioni + olio) ─────────────────────────────
  var marcaModKey = marca + '||' + modello;
  var tyreData = TYRE_P[marcaModKey];
  var oilData  = OIL_QTY[dbKey];
  var tTecnico = '';

  if (oilData) {
    tTecnico += '<div class="shd">// Olio motore</div><div class="mg" style="margin-bottom:22px">'
      + '<div class="mc co"><div class="mclb">Quantità</div><div class="mcv">'+oilData.litri+' litri</div><div class="mcs">con sostituzione filtro</div></div>'
      + '<div class="mc co"><div class="mclb">Viscosità</div><div class="mcv" style="color:var(--gold)">'+oilData.viscosita+'</div></div>'
      + '<div class="mc co"><div class="mclb">Norma costruttore</div><div class="mcv">'+oilData.norma+'</div></div>'
      + '</div>';
  }

  tTecnico += '<div class="shd">// Pressioni pneumatici</div>';
  if (tyreData) {
    var annoKeys = Object.keys(tyreData).filter(function(k){ return k!=='default'; });
    var bestRange = annoKeys.find(function(k){ return anno && k.split('–')[0] <= anno.split('–')[0]; }) || annoKeys[0];
    var sizes = tyreData[bestRange] || tyreData[annoKeys[0]] || {};
    tTecnico += '<table class="ttb"><thead><tr><th>Misura gomma</th><th>Anteriore</th><th>Posteriore</th></tr></thead><tbody>';
    Object.entries(sizes).forEach(function(entry){
      var sz = entry[0], pr = entry[1];
      if (sz === 'default') return;
      tTecnico += '<tr><td>'+sz+'</td><td>'+pr[0]+' bar</td><td>'+pr[1]+' bar</td></tr>';
    });
    tTecnico += '</tbody></table>';
    if (sizes.default) tTecnico += '<div style="margin-top:8px;font-size:.72rem;color:var(--t3);font-family:var(--mono)">Default: '+sizes.default[0]+' / '+sizes.default[1]+' bar</div>';
  } else {
    tTecnico += '<div style="color:var(--t3);font-size:.83rem">Pressioni non disponibili per questo modello.</div>';
  }

  // ── TAB: SCHEDA TECNICA ─────────────────────────────────────────
  var spec = db.specs && db.specs[dbKey];
  var tScheda = '';
  if (!spec) {
    tScheda = '<div style="color:var(--t3);font-size:.83rem;padding:18px 0">Specifiche non disponibili per questo veicolo.</div>';
  } else {
    var links = Object.assign({}, spec.link_esterni || {});
    // Nel db alcuni link AutoScout contengono la serie nello slug (es. /fiat/panda-iii): si toglie
    if (links.autoscout) links.autoscout = links.autoscout.replace(/-(?:i|ii|iii|iv|v|vi|vii|viii)(?=\?|$)/, '');
    tScheda = '<div class="spec-section"><div class="shd">// Motore & Prestazioni</div>'
      + '<div class="spec-grid">'
      + (spec.potenza_cv ? '<div class="spec-card"><div class="spec-lbl">Potenza</div><div class="spec-val spec-highlight">'+spec.potenza_cv+'<span class="spec-unit">cv</span> / '+spec.potenza_kw+'<span class="spec-unit">kW</span></div></div>' : '')
      + (spec.coppia_nm  ? '<div class="spec-card"><div class="spec-lbl">Coppia massima</div><div class="spec-val">'+spec.coppia_nm+'<span class="spec-unit">Nm</span></div></div>' : '')
      + (spec.cilindrata_cc ? '<div class="spec-card"><div class="spec-lbl">Cilindrata</div><div class="spec-val">'+spec.cilindrata_cc.toLocaleString()+'<span class="spec-unit">cc</span></div></div>' : '')
      + '<div class="spec-card"><div class="spec-lbl">Alimentazione</div><div class="spec-val" style="font-size:.82rem">'+spec.alimentazione+'</div></div>'
      + '<div class="spec-card"><div class="spec-lbl">Trasmissione</div><div class="spec-val" style="font-size:.8rem">'+spec.trasmissione+'</div></div>'
      + '<div class="spec-card"><div class="spec-lbl">Trazione</div><div class="spec-val" style="font-size:.8rem">'+spec.trazione+'</div></div>'
      + '</div></div>'

      + '<div class="spec-section"><div class="shd">// Prestazioni & Consumi</div>'
      + '<table class="spec-row-table">'
      + (spec.acc_0_100_s ? '<tr><td>0–100 km/h</td><td>'+spec.acc_0_100_s+' s</td></tr>' : '')
      + (spec.vel_max_kmh ? '<tr><td>Velocità massima</td><td>'+spec.vel_max_kmh+' km/h</td></tr>' : '')
      + (spec.consumo_dichiarato ? '<tr><td>Consumi dichiarati</td><td>'+spec.consumo_dichiarato+'</td></tr>' : '')
      + (spec.consumo_reale ? '<tr><td>Consumi reali stimati</td><td>'+spec.consumo_reale+'</td></tr>' : '')
      + (spec.co2_gkm ? '<tr><td>Emissioni CO₂</td><td>'+spec.co2_gkm+'</td></tr>' : '')
      + '</table></div>'

      + '<div class="spec-section"><div class="shd">// Dimensioni & Ingombri</div>'
      + '<table class="spec-row-table">'
      + (spec.lunghezza_mm ? '<tr><td>Lunghezza</td><td>'+spec.lunghezza_mm.toLocaleString()+' mm</td></tr>' : '')
      + (spec.larghezza_mm ? '<tr><td>Larghezza</td><td>'+spec.larghezza_mm.toLocaleString()+' mm</td></tr>' : '')
      + (spec.altezza_mm   ? '<tr><td>Altezza</td><td>'+spec.altezza_mm.toLocaleString()+' mm</td></tr>' : '')
      + (spec.passo_mm     ? '<tr><td>Passo</td><td>'+spec.passo_mm.toLocaleString()+' mm</td></tr>' : '')
      + (spec.bagagliaio_l ? '<tr><td>Bagagliaio</td><td>'+spec.bagagliaio_l+' L</td></tr>' : '')
      + '</table></div>'

      + '<div class="spec-section"><div class="shd">// Verifica dati su fonti ufficiali</div>'
      + '<div class="ext-links">'
      + (links.quattroruote ? '<a href="'+links.quattroruote+'" target="_blank" rel="noopener" class="ext-link">📰 Quattroruote</a>' : '')
      + (links.alvolante    ? '<a href="'+links.alvolante+'"    target="_blank" rel="noopener" class="ext-link">🚗 alVolante</a>' : '')
      + (links.motorionline ? '<a href="'+links.motorionline+'" target="_blank" rel="noopener" class="ext-link">⚡ Motorionline</a>' : '')
      + (links.autoscout    ? '<a href="'+links.autoscout+'"    target="_blank" rel="noopener" class="ext-link">🔎 AutoScout24</a>' : '')
      + (links.insella      ? '<a href="'+links.insella+'"      target="_blank" rel="noopener" class="ext-link">🏍 inSella</a>' : '')
      + (links.motociclismo ? '<a href="'+links.motociclismo+'" target="_blank" rel="noopener" class="ext-link">🏁 Motociclismo</a>' : '')
      + (links.dueruote     ? '<a href="'+links.dueruote+'"     target="_blank" rel="noopener" class="ext-link">⚙ DueRuote</a>' : '')
      + (links.inmoto       ? '<a href="'+links.inmoto+'"       target="_blank" rel="noopener" class="ext-link">📋 InMoto</a>' : '')
      + '</div>'
      + '<div class="spec-disclaimer">⚠ Le specifiche sono stimate dalla knowledge base e potrebbero variare in base all\'anno esatto e all\'allestimento. Verificare sempre sui siti ufficiali o sul libretto del veicolo.</div>'
      + '</div>';
  }

  // ── TAB: OBD ────────────────────────────────────────────────────
  var obdEntries = Object.entries(OBD_CODES);
  var tOBD = '<div class="obds"><span class="si" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--t3)">🔍</span>'
    + '<input class="obdi" id="obd-search-input" placeholder="Cerca codice o descrizione…" oninput="filterOBD()"></div>'
    + '<div class="obdct" id="obd-count">' + obdEntries.length + ' codici nel database</div>'
    + '<ul class="obdl" id="obd-list">'
    + obdEntries.map(function(e){
        var code=e[0], desc=e[1], t=code[0];
        return '<li class="obdi2"><span class="ocode o'+t+'">'+code+'</span><span class="odesc">'+desc+'</span></li>';
      }).join('')
    + '</ul>';

  // ── TAB: extra ──────────────────────────────────────────────────
  var slug = SCEGLIAUTO_SLUGS[marca] || marca.toLowerCase().replace(/\s+/g,'-');
  var scUrl = 'https://www.scegliauto.com/video/' + slug + '/tutorial/';
  var tExtra = '<div class="rb"><div class="rbt">📋 Recall e campagne di richiamo</div>'
    + '<p>' + (data.recall_note||'Nessuna nota specifica disponibile.') + '</p>'
    + '<p style="margin-top:10px">Verifica recall su: '
    + '<a href="https://www.motorizzazione.it/servizi/campagne_di_richiamo/" target="_blank">Ministero Trasporti IT</a> · '
    + '<a href="https://www.nhtsa.gov/vehicle/recalls" target="_blank">NHTSA</a> · '
    + '<a href="https://www.autoscout24.it/informazioni/recall-auto/" target="_blank">AutoScout24</a>'
    + '</p></div>'
    + '<div class="rb" style="border-color:rgba(34,197,94,.25);background:rgba(34,197,94,.04)">'
    + '<div class="rbt" style="color:var(--grn)">🎬 Video Tutorial Fai da Te — ' + marca + ' ' + modello + '</div>'
    + '<p style="margin-bottom:12px">Guide di manutenzione e riparazione fai da te per la tua <strong style="color:var(--t1)">'
    + marca + ' ' + modello + '</strong> — smontaggio, sostituzione parti, reset service e altro.</p>'
    + '<a href="' + scUrl + '" target="_blank" rel="noopener" class="btn-link btn-link-grn">▶ Apri video tutorial su ScegliAuto</a>'
    + '<p style="margin-top:9px;font-size:.7rem;color:var(--t3);font-family:var(--mono)">Fonte: scegliauto.com — contenuti di terze parti</p></div>'
    + '<div class="rb" style="border-color:rgba(240,165,0,.25);background:rgba(240,165,0,.04)">'
    + '<div class="rbt" style="color:var(--gold)">🔗 Risorse utili</div><p>'
    + '<a href="https://www.autouncle.it/" target="_blank" style="color:var(--gold)">AutoUncle</a> — valutazione prezzo di mercato<br>'
    + '<a href="https://www.automobile.it/" target="_blank" style="color:var(--gold)">Automobile.it</a> — annunci verificati<br>'
    + '<a href="https://www.quattroruote.it/" target="_blank" style="color:var(--gold)">Quattroruote</a> — prove e affidabilità<br>'
    + '<a href="https://www.motorionline.com/prove/" target="_blank" style="color:var(--gold)">Motorionline</a> — prove su strada'
    + '</p></div>';

  // ── Inject all tabs ──────────────────────────────────────────────
  document.getElementById('results').innerHTML =
    '<div class="tab-pane active" id="tab-problemi">' + tProblemi + '</div>'
    + '<div class="tab-pane" id="tab-stats">' + tStats + '</div>'
    + '<div class="tab-pane" id="tab-manutenzione">' + tMaint + '</div>'
    + '<div class="tab-pane" id="tab-checklist">' + tCheck + '</div>'
    + '<div class="tab-pane" id="tab-domande">' + tDomande + '</div>'
    + '<div class="tab-pane" id="tab-tecnico">' + tTecnico + '</div>'
    + '<div class="tab-pane" id="tab-scheda">' + tScheda + '</div>'
    + '<div class="tab-pane" id="tab-obd">' + tOBD + '</div>'
    + '<div class="tab-pane" id="tab-extra">' + tExtra + '</div>';

  document.getElementById('tabs').className = 'tabs visible';
  document.getElementById('filter-bar').className = 'filter-bar visible';
}

function toggleCard(i) {
  document.getElementById('pc-' + i).classList.toggle('open');
}

// ── Checklist ─────────────────────────────────────────────────────
var _chkState = {};
function toggleCheck(i) {
  _chkState[i] = !_chkState[i];
  document.getElementById('chk-' + i).classList.toggle('chk', _chkState[i]);
  updateChkProgress();
}
function resetChecklist() {
  _chkState = {};
  document.querySelectorAll('.cli').forEach(function(el){ el.classList.remove('chk'); });
  updateChkProgress();
}
function updateChkProgress() {
  var total = document.querySelectorAll('.cli').length;
  var done  = Object.values(_chkState).filter(Boolean).length;
  var pct   = total ? Math.round(done/total*100) : 0;
  var el = document.getElementById('chk-cnt');
  var fill = document.getElementById('chk-fill');
  if (el) el.textContent = done + '/' + total + ' completati';
  if (fill) fill.style.width = pct + '%';
}

// ── OBD search ────────────────────────────────────────────────────
function filterOBD() {
  var q = (document.getElementById('obd-search-input').value || '').toLowerCase().trim();
  var items = document.querySelectorAll('.obdi2');
  var vis = 0;
  items.forEach(function(el){
    var show = !q || el.textContent.toLowerCase().includes(q);
    el.style.display = show ? '' : 'none';
    if (show) vis++;
  });
  var cnt = document.getElementById('obd-count');
  if (cnt) cnt.textContent = q ? vis + ' risultati' : items.length + ' codici nel database';
}

// ═══════════════════════════════════════════════════════════════════
// VIN DECODER
// ═══════════════════════════════════════════════════════════════════
var YEAR_MAP = {
  'A':2010,'B':2011,'C':2012,'D':2013,'E':2014,'F':2015,'G':2016,'H':2017,
  'J':2018,'K':2019,'L':2020,'M':2021,'N':2022,'P':2023,'R':2024,'S':2025,'T':2026,
  '1':2001,'2':2002,'3':2003,'4':2004,'5':2005,'6':2006,'7':2007,'8':2008,'9':2009
};
var PAESI = {
  'A':'Sudafrica','J':'Giappone','K':'Corea del Sud','L':'Cina',
  'S':'Gran Bretagna','T':'Repubblica Ceca','U':'Romania',
  'V':'Francia/Spagna','W':'Germania','X':'Russia','Y':'Svezia/Finlandia',
  'Z':'Italia','1':'USA','2':'Canada','3':'Messico','4':'USA','5':'USA',
  '6':'Australia','9':'Brasile'
};

function decodeVIN() {
  var vin = (document.getElementById('vin-input').value||'').trim().toUpperCase();
  var errEl = document.getElementById('vin-error');
  var resEl = document.getElementById('vin-result');
  if (vin.length !== 17 || /[IOQ]/.test(vin)) {
    errEl.className = 'vin-err on'; resEl.className = 'vin-res'; return;
  }
  errEl.className = 'vin-err';
  var wmi3 = vin.slice(0,3), wmi2 = vin.slice(0,2);
  var marca = WMI_DB[wmi3] || WMI_DB[wmi2] || 'Sconosciuto';
  var paese = PAESI[vin[0]] || 'Sconosciuto';
  var anno  = YEAR_MAP[vin[9]] || '?';
  var POS   = ['Pa','Co','Ti','','','','','','Ck','An','St','','','','','','Se'];
  var chars = vin.split('').map(function(ch,i){
    var hi = [0,1,2,9,10].includes(i);
    return '<div class="vc'+(hi?' hi':'')+'"><span>'+ch+'</span><span>'+(POS[i]||''+(i+1))+'</span></div>';
  }).join('');
  var fields = [
    {lb:'Costruttore',v:marca},{lb:'Paese produzione',v:paese},
    {lb:'Anno modello',v:anno},{lb:'WMI',v:wmi3},
    {lb:'VDS',v:vin.slice(3,9)},{lb:'N° seriale',v:vin.slice(11)}
  ];
  var grid = fields.map(function(f){
    return '<div><div class="vf-lb">'+f.lb+'</div><div class="vf-v">'+f.v+'</div></div>';
  }).join('');
  document.getElementById('vin-chars').innerHTML = chars;
  document.getElementById('vin-grid').innerHTML = grid;
  window._vinMarca = marca;
  resEl.className = 'vin-res on';
}
function gotoAnalisiFromVIN() {
  switchView('analisi');
  if (window._vinMarca && VEHICLES[window._vinMarca]) selectOption('marca', window._vinMarca);
}

// ═══════════════════════════════════════════════════════════════════
// CONFRONTO
// ═══════════════════════════════════════════════════════════════════
var _cmpClose = {};
function buildCompareSelectors(side) {
  var wrap = document.getElementById('compare-selectors-' + side);
  var ac = side === 'a' ? 'var(--red)' : 'var(--blue)';
  wrap.innerHTML = '<div class="fg"><label>Marca</label>'
    + '<div class="sw"><span class="si">⌕</span>'
    + '<input class="si-input" id="cmp-search-' + side + '" placeholder="Cerca marca…" autocomplete="off"'
    + ' oninput="cmpFilter(\'' + side + '\')" onfocus="cmpOpen(\'' + side + '\')" onblur="cmpClose(\'' + side + '\')">'
    + '<div class="sd" id="cmp-drop-' + side + '"></div>'
    + '</div><input type="hidden" id="cmp-sel-' + side + '"></div>'
    + '<div class="fg"><label>Modello · Anno · Motore</label>'
    + '<select id="cmp-combo-' + side + '"><option value="">— Seleziona prima la marca —</option></select></div>';
}
function cmpFilter(side) {
  var q = (document.getElementById('cmp-search-' + side).value || '').toLowerCase();
  var items = Object.keys(VEHICLES).sort().filter(function(x){ return x.toLowerCase().includes(q); });
  var drop = document.getElementById('cmp-drop-' + side);
  renderDrop(drop, items, q, function(item){ cmpSelectMarca(side, item); });
  drop.classList.add('open');
}
function cmpOpen(side) { clearTimeout(_cmpClose[side]); cmpFilter(side); }
function cmpClose(side) {
  _cmpClose[side] = setTimeout(function(){ document.getElementById('cmp-drop-' + side).classList.remove('open'); }, 200);
}
function cmpSelectMarca(side, marca) {
  document.getElementById('cmp-search-' + side).value = marca;
  document.getElementById('cmp-sel-' + side).value = marca;
  document.getElementById('cmp-drop-' + side).classList.remove('open');
  var combo = document.getElementById('cmp-combo-' + side);
  combo.innerHTML = '<option value="">— Seleziona —</option>';
  if (VEHICLES[marca]) {
    Object.entries(VEHICLES[marca]).forEach(function(me){
      Object.entries(me[1]).forEach(function(ae){
        ae[1].forEach(function(motore){
          var key = marca+'||'+me[0]+'||'+ae[0]+'||'+motore;
          var opt = document.createElement('option');
          opt.value = key;
          opt.textContent = me[0] + ' · ' + ae[0] + ' · ' + motore;
          combo.appendChild(opt);
        });
      });
    });
  }
}
async function avviaConfronto() {
  var kA = document.getElementById('cmp-combo-a').value;
  var kB = document.getElementById('cmp-combo-b').value;
  if (!kA || !kB) { alert('Seleziona entrambi i veicoli.'); return; }
  if (kA === kB)  { alert('Seleziona due veicoli diversi.'); return; }
  // Prima il confronto funzionava solo se il database era già stato caricato da un'analisi
  try { await window.hubVDB.ensure([kA.split('||')[0], kB.split('||')[0]]); }
  catch (e) { alert('Database veicoli non raggiungibile: ' + e.message); return; }
  var db = window._vdb || {};
  var dA = db.vehicles && db.vehicles[kA];
  var dB = db.vehicles && db.vehicles[kB];
  var mA = db.maintenance && db.maintenance[kA];
  var mB = db.maintenance && db.maintenance[kB];
  var lblA = kA.split('||').slice(0,2).join(' ');
  var lblB = kB.split('||').slice(0,2).join(' ');

  function row(lb, vA, vB, lowerBetter) {
    var wA=false, wB=false;
    var nA=parseFloat(String(vA).replace(/[^0-9.]/g,'')), nB=parseFloat(String(vB).replace(/[^0-9.]/g,''));
    if (!isNaN(nA)&&!isNaN(nB)&&vA!==vB){ wA=lowerBetter?nA<nB:nA>nB; wB=lowerBetter?nB<nA:nB>nA; }
    return '<div class="cr">'
      +'<div class="crl">'+lb+'</div>'
      +'<div class="cc lc'+(wA?' win':'')+'">'+( vA||'—')+'</div>'
      +'<div class="cc'+(wB?' win':'')+'">'+( vB||'—')+'</div>'
      +'</div>';
  }
  function sec(lb){ return '<div class="cr"><div class="csh">'+lb+'</div></div>'; }
  var affM={alta:3,media:2,bassa:1};
  var sA=affM[dA&&dA.affidabilita]||0, sB=affM[dB&&dB.affidabilita]||0;

  var html='<div style="display:grid;grid-template-columns:138px 1fr 1fr;margin-bottom:7px">'
    +'<div></div>'
    +'<div style="padding:8px 13px;font-family:var(--mono);font-size:.6rem;text-transform:uppercase;color:var(--red)">'+lblA+'</div>'
    +'<div style="padding:8px 13px;font-family:var(--mono);font-size:.6rem;text-transform:uppercase;color:var(--blue)">'+lblB+'</div>'
    +'</div>';
  html += sec('🔍 Affidabilità');
  html += row('Affidabilità', dA?dA.affidabilita:'—', dB?dB.affidabilita:'—', false);
  html += sec('💰 Costi');
  html += row('Budget manutenzione',
    dA?'€'+Number(dA.costo_totale_min||0).toLocaleString()+'–'+Number(dA.costo_totale_max||0).toLocaleString():'—',
    dB?'€'+Number(dB.costo_totale_min||0).toLocaleString()+'–'+Number(dB.costo_totale_max||0).toLocaleString():'—', true);
  html += row('RC Auto', dA?dA.assicurazione_fascia:'—', dB?dB.assicurazione_fascia:'—', false);
  html += sec('⛽ Consumi');
  html += row('Dichiarati', dA?dA.consumo_dichiarato:'—', dB?dB.consumo_dichiarato:'—', false);
  html += row('Reali stimati', dA?dA.consumo_reale:'—', dB?dB.consumo_reale:'—', false);
  html += sec('🔧 Manutenzione');
  html += row('Olio motore', mA?mA.olio.viscosita:'—', mB?mB.olio.viscosita:'—', false);
  html += row('Intervallo olio',
    mA?(Number(mA.olio.intervallo_km||0).toLocaleString()+' km'):'—',
    mB?(Number(mB.olio.intervallo_km||0).toLocaleString()+' km'):'—', true);
  var distA=mA&&mA.distribuzione?mA.distribuzione.tipo+(mA.distribuzione.intervallo_km?' · '+Number(mA.distribuzione.intervallo_km).toLocaleString()+' km':' (no scadenza)'):'—';
  var distB=mB&&mB.distribuzione?mB.distribuzione.tipo+(mB.distribuzione.intervallo_km?' · '+Number(mB.distribuzione.intervallo_km).toLocaleString()+' km':' (no scadenza)'):'—';
  html += row('Distribuzione', distA, distB, false);
  html += sec('⚠ Problemi noti');
  var sc = function(d,s){ return d?(d.problemi||[]).filter(function(p){return p.severita===s;}).length:0; };
  html += row('Alta severità', sc(dA,'alta'), sc(dB,'alta'), true);
  html += row('Media severità', sc(dA,'media'), sc(dB,'media'), true);
  var score = function(d,m){ return (affM[d&&d.affidabilita]||0)*3 - sc(d,'alta')*2 - sc(d,'media'); };
  var vS=score(dA,mA), vSB=score(dB,mB);
  var verdict = vS>vSB ? '✅ <strong>'+lblA+'</strong> risulta complessivamente più affidabile e conveniente.'
    : vSB>vS ? '✅ <strong>'+lblB+'</strong> risulta complessivamente più affidabile e conveniente.'
    : '🤝 I due veicoli sono sostanzialmente equivalenti su questo profilo.';
  html += '<div class="verdict">'+verdict+'</div>';

  var res = document.getElementById('compare-results');
  res.innerHTML = html;
  res.className = 'cres on';
  res.scrollIntoView({behavior:'smooth',block:'start'});
}

// ═══════════════════════════════════════════════════════════════════
// PROMEMORIA
// ═══════════════════════════════════════════════════════════════════
var _remClose;
function filterSearchRem() {
  var q = (document.getElementById('search-rem-marca').value||'').toLowerCase();
  var items = Object.keys(VEHICLES).sort().filter(function(x){ return x.toLowerCase().includes(q); });
  var drop = document.getElementById('drop-rem-marca');
  renderDrop(drop, items, q, function(item){ remSelectMarca(item); });
  drop.classList.add('open');
}
function openDropdownRem() { clearTimeout(_remClose); filterSearchRem(); }
function closeDropdownRem() {
  _remClose = setTimeout(function(){ document.getElementById('drop-rem-marca').classList.remove('open'); }, 200);
}
function remSelectMarca(marca) {
  document.getElementById('search-rem-marca').value = marca;
  document.getElementById('sel-rem-marca').value = marca;
  document.getElementById('drop-rem-marca').classList.remove('open');
  var combo = document.getElementById('sel-rem-combo');
  combo.innerHTML = '<option value="">— Seleziona —</option>';
  if (VEHICLES[marca]) {
    Object.entries(VEHICLES[marca]).forEach(function(me){
      Object.entries(me[1]).forEach(function(ae){
        ae[1].forEach(function(motore){
          var key = marca+'||'+me[0]+'||'+ae[0]+'||'+motore;
          var opt = document.createElement('option');
          opt.value = key; opt.textContent = me[0]+' · '+ae[0]+' · '+motore;
          combo.appendChild(opt);
        });
      });
    });
  }
}
async function calcolaPromemoria() {
  var key = document.getElementById('sel-rem-combo').value;
  var kmS = document.getElementById('km-input').value;
  if (!key)   { alert('Seleziona un veicolo.'); return; }
  if (!kmS || isNaN(parseInt(kmS))) { alert('Inserisci il chilometraggio attuale.'); return; }
  try { await window.hubVDB.ensure([key.split('||')[0]]); }
  catch (e) { alert('Database veicoli non raggiungibile: ' + e.message); return; }
  var km = parseInt(kmS);
  var db = window._vdb || {};
  var maint = db.maintenance && db.maintenance[key];
  if (!maint) { alert('Dati manutenzione non disponibili per questo veicolo.'); return; }
  var saved = JSON.parse(localStorage.getItem('ad_rem') || '{}');
  saved[key] = { km: km, at: new Date().toISOString() };
  localStorage.setItem('ad_rem', JSON.stringify(saved));
  var sv = document.getElementById('reminder-saved');
  sv.className = 'rem-saved on';
  setTimeout(function(){ sv.className = 'rem-saved'; }, 3000);

  function parseKm(str) {
    var m = str.match(/[\d.]+\s*km/i);
    return m ? parseInt(m[0].replace(/[.\s]/g,'').replace('km','')) : null;
  }
  function parseMo(str) {
    var m = str.match(/(\d+)\s*(mesi|mese|anni|anno)/i);
    if (!m) return null;
    return parseInt(m[1]) * (m[2].includes('ann') ? 12 : 1);
  }
  var sc = maint.schedule || [];
  var cards = document.getElementById('reminder-cards');
  cards.innerHTML = sc.map(function(item){
    var intKm = parseKm(item.intervallo);
    var status='ok', pct=0, delta='', dueKm=null;
    if (intKm) {
      var last = Math.floor(km/intKm)*intKm;
      dueKm = last + intKm;
      var diff = dueKm - km;
      pct = Math.min(100, Math.round((km-last)/intKm*100));
      if (diff < 0) { status='ov'; delta='⚠ Scaduto di '+Math.abs(diff).toLocaleString()+' km'; }
      else if (diff < intKm*0.15) { status='soon'; delta='Tra '+diff.toLocaleString()+' km'; }
      else { status='ok'; delta='Tra '+diff.toLocaleString()+' km'; }
    } else {
      var mo = parseMo(item.intervallo);
      delta = item.intervallo; pct=50; status='ok';
    }
    var col = status==='ok'?'var(--grn)':status==='soon'?'var(--warn)':'var(--err)';
    return '<div class="rcard '+status+'">'
      +'<div class="rop">'+item.operazione+'</div>'
      +'<div class="rkr">'
      +'<span class="rdue">'+(dueKm?'Scadenza: '+Math.round(dueKm).toLocaleString()+' km':item.intervallo)+'</span>'
      +'<span class="rdelta '+status+'">'+delta+'</span>'
      +'</div>'
      +'<div class="rbar"><div class="rbf" style="width:'+pct+'%;background:'+col+'"></div></div>'
      +'</div>';
  }).join('');
  cards.scrollIntoView({behavior:'smooth',block:'start'});
}
function restoreReminder() {
  try {
    var saved = JSON.parse(localStorage.getItem('ad_rem')||'{}');
    var lastKey = Object.keys(saved).pop();
    if (!lastKey) return;
    var marca = lastKey.split('||')[0];
    remSelectMarca(marca);
    setTimeout(function(){
      document.getElementById('sel-rem-combo').value = lastKey;
      document.getElementById('km-input').value = saved[lastKey].km;
    }, 150);
  } catch(e) {}
}


// =======================================================================
// OBD LIVE SCANNER — Web Bluetooth + ELM327
// =======================================================================
// Supported adapters: most BLE ELM327 clones (OBDII BLE, Viecar, Veepeak,
// KONNWEI, iCar etc.) using the FFF0/FFF1/FFF2 GATT profile or UART NUS.
// Browser: Chrome 79+, Edge 79+, Chrome Android 85+ (NOT Safari/Firefox)

var OBD = {
  device:   null,
  server:   null,
  rxChar:   null,
  txChar:   null,
  connected: false,
  scanning:  false,
  _rxBuf:   '',
  _resolve: null,
  _timer:   null,
  _liveInterval: null,

  // ── GATT profiles to try ──────────────────────────────────────────
  PROFILES: [
    // Most common cheap ELM327 BLE adapters
    { service:'0000fff0-0000-1000-8000-00805f9b34fb',
      write:  '0000fff2-0000-1000-8000-00805f9b34fb',
      notify: '0000fff1-0000-1000-8000-00805f9b34fb' },
    // Veepeak / VLINK
    { service:'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      write:  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
      notify: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
    // Nordic UART Service (some adapters)
    { service:'6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      write:  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
      notify: '6e400003-b5a3-f393-e0a9-e50e24dcca9e' },
  ],

  // ── OBD-II PIDs for live data ──────────────────────────────────────
  PIDS: [
    { pid:'010C', name:'RPM',           unit:'giri/min', parse: function(d){ return ((d[0]*256+d[1])/4).toFixed(0); }, icon:'⚙', color:'var(--blue)', max:8000 },
    { pid:'010D', name:'Velocità',      unit:'km/h',     parse: function(d){ return d[0]; },                          icon:'🚗', color:'var(--grn)',  max:250  },
    { pid:'0105', name:'Temp. liquido', unit:'°C',       parse: function(d){ return d[0]-40; },                       icon:'🌡', color:'var(--warn)', max:130  },
    { pid:'010F', name:'Temp. aria',    unit:'°C',       parse: function(d){ return d[0]-40; },                       icon:'💨', color:'var(--blue)', max:100  },
    { pid:'0111', name:'Acceleratore',  unit:'%',        parse: function(d){ return (d[0]*100/255).toFixed(1); },     icon:'🦶', color:'var(--gold)', max:100  },
    { pid:'012F', name:'Carburante',    unit:'%',        parse: function(d){ return (d[0]*100/255).toFixed(1); },     icon:'⛽', color:'var(--grn)',  max:100  },
    { pid:'0104', name:'Carico motore', unit:'%',        parse: function(d){ return (d[0]*100/255).toFixed(1); },     icon:'📊', color:'var(--err)',  max:100  },
    { pid:'010B', name:'Pressione MAP', unit:'kPa',      parse: function(d){ return d[0]; },                          icon:'📡', color:'#a78bfa',    max:300  },
    { pid:'0110', name:'Portata MAF',   unit:'g/s',      parse: function(d){ return ((d[0]*256+d[1])/100).toFixed(2); }, icon:'🌬', color:'var(--blue)', max:200 },
    { pid:'015C', name:'Temp. olio',    unit:'°C',       parse: function(d){ return d[0]-40; },                       icon:'🛢', color:'var(--warn)', max:150  },
    { pid:'0142', name:'Tensione',      unit:'V',        parse: function(d){ return ((d[0]*256+d[1])/1000).toFixed(2); }, icon:'⚡', color:'var(--gold)', max:16 },
    { pid:'0146', name:'Temp. ambien.', unit:'°C',       parse: function(d){ return d[0]-40; },                       icon:'🌤', color:'var(--t2)',   max:60   },
  ],

  _supported: [],

  // ── Connect ──────────────────────────────────────────────────────────
  connect: async function() {
    if (!navigator.bluetooth) {
      obdUI.setStatus('error', 'Web Bluetooth non supportato. Usa Chrome o Edge su desktop/Android.');
      return;
    }
    obdUI.setStatus('connecting', 'Ricerca adattatore OBD…');
    obdUI.setBtnConnect(false);

    try {
      var serviceUUIDs = OBD.PROFILES.map(function(p) { return p.service; });
      OBD.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [OBD.PROFILES[0].service] },
          { services: [OBD.PROFILES[1].service] },
          { services: [OBD.PROFILES[2].service] },
          { namePrefix: 'OBD' },
          { namePrefix: 'ELM' },
          { namePrefix: 'OBDII' },
          { namePrefix: 'Vlink' },
          { namePrefix: 'Viecar' },
          { namePrefix: 'IOS-Vlink' },
          { namePrefix: 'KONNWEI' },
          { namePrefix: 'V-LINK' },
          { namePrefix: 'PLX' },
          { namePrefix: 'CAR' },
        ],
        optionalServices: serviceUUIDs,
      });

      OBD.device.addEventListener('gattserverdisconnected', OBD._onDisconnect);
      obdUI.setStatus('connecting', 'Connessione a ' + (OBD.device.name || 'dispositivo') + '…');

      OBD.server = await OBD.device.gatt.connect();

      // Try each profile
      var connected = false;
      for (var i = 0; i < OBD.PROFILES.length; i++) {
        try {
          var profile = OBD.PROFILES[i];
          var svc = await OBD.server.getPrimaryService(profile.service);
          OBD.txChar = await svc.getCharacteristic(profile.write);
          OBD.rxChar = await svc.getCharacteristic(profile.notify);
          await OBD.rxChar.startNotifications();
          OBD.rxChar.addEventListener('characteristicvaluechanged', OBD._onData);
          connected = true;
          break;
        } catch(e) { /* try next */ }
      }

      if (!connected) throw new Error('Nessun profilo GATT compatibile trovato');

      obdUI.setStatus('connecting', 'Inizializzazione ELM327…');
      await OBD._initELM();
      OBD.connected = true;
      obdUI.onConnected(OBD.device.name || 'OBD Adapter');

    } catch(e) {
      if (e.name !== 'NotFoundError') {
        obdUI.setStatus('error', 'Errore: ' + e.message);
      } else {
        obdUI.setStatus('idle', '');
      }
      OBD._cleanup();
      obdUI.setBtnConnect(true);
    }
  },

  disconnect: function() {
    OBD.stopLive();
    if (OBD.device && OBD.device.gatt.connected) {
      OBD.device.gatt.disconnect();
    }
    OBD._cleanup();
    obdUI.onDisconnected();
  },

  _onDisconnect: function() {
    OBD.stopLive();
    OBD._cleanup();
    obdUI.onDisconnected();
  },

  _cleanup: function() {
    OBD.connected = false;
    OBD.server = null; OBD.rxChar = null; OBD.txChar = null;
    OBD._rxBuf = ''; OBD._resolve = null;
    clearTimeout(OBD._timer);
  },

  // ── Data receive ──────────────────────────────────────────────────────
  _onData: function(e) {
    var bytes = new Uint8Array(e.target.value.buffer);
    OBD._rxBuf += Array.from(bytes).map(function(b) {
      return b === 13 ? '\r' : b === 10 ? '\n' : String.fromCharCode(b);
    }).join('');
    if (OBD._rxBuf.includes('>') && OBD._resolve) {
      clearTimeout(OBD._timer);
      var r = OBD._resolve;
      OBD._resolve = null;
      r(OBD._rxBuf.replace(/>/g,'').trim());
      OBD._rxBuf = '';
    }
  },

  // ── Send command ──────────────────────────────────────────────────────
  _send: function(cmd, timeout) {
    return new Promise(function(resolve, reject) {
      if (!OBD.txChar) { reject(new Error('Non connesso')); return; }
      OBD._rxBuf = '';
      OBD._resolve = resolve;
      OBD._timer = setTimeout(function() {
        OBD._resolve = null;
        resolve('TIMEOUT');
      }, timeout || 3000);
      var data = new TextEncoder().encode(cmd + '\r');
      OBD.txChar.writeValue(data).catch(reject);
    });
  },

  // ── ELM327 init sequence ──────────────────────────────────────────────
  _initELM: async function() {
    await OBD._send('ATZ',  3000);   // Reset
    await OBD._send('ATE0', 2000);   // Echo off
    await OBD._send('ATL0', 2000);   // Linefeed off
    await OBD._send('ATS0', 2000);   // Spaces off
    await OBD._send('ATH0', 2000);   // Headers off
    await OBD._send('ATSP0',2000);   // Auto protocol
    await OBD._send('0100', 4000);   // Supported PIDs (wakes up)

    // Discover supported PIDs
    OBD._supported = [];
    var checks = ['0100','0120','0140','0160'];
    for (var i = 0; i < checks.length; i++) {
      var r = await OBD._send(checks[i], 3000);
      var m = r.match(/41\s*[0-9A-F]{2}\s*([0-9A-F\s]+)/i);
      if (m) {
        var hex = m[1].replace(/\s/g,'');
        var base = 1 + i*32;
        for (var b = 0; b < hex.length && b < 8; b++) {
          var byte_ = parseInt(hex.slice(b*2, b*2+2), 16);
          for (var bit = 7; bit >= 0; bit--) {
            if (byte_ & (1<<bit)) OBD._supported.push(base + (b*8) + (7-bit));
          }
        }
      }
    }
  },

  // ── Read single PID ───────────────────────────────────────────────────
  readPID: async function(pid) {
    var r = await OBD._send(pid, 2500);
    var mode = '4' + pid[1];
    var re = new RegExp(mode + '\\s*' + pid.slice(2) + '\\s*([0-9A-Fa-f\\s]+)', 'i');
    var m = r.match(re);
    if (!m) return null;
    var bytes = m[1].replace(/\s/g,'').match(/.{2}/g);
    if (!bytes) return null;
    return bytes.map(function(b) { return parseInt(b,16); });
  },

  // ── Live polling ─────────────────────────────────────────────────────
  startLive: function() {
    if (OBD._liveInterval) return;
    var idx = 0;
    var activePids = OBD.PIDS.filter(function(p) {
      var pidNum = parseInt(p.pid.slice(2),16);
      return OBD._supported.indexOf(pidNum) >= 0;
    });
    if (!activePids.length) activePids = OBD.PIDS.slice(0,6); // fallback: try all

    obdUI.initLiveCards(activePids);

    OBD._liveInterval = setInterval(async function() {
      if (!OBD.connected || !activePids.length) return;
      var p = activePids[idx % activePids.length];
      idx++;
      try {
        var bytes = await OBD.readPID(p.pid);
        if (bytes) obdUI.updateLiveCard(p, p.parse(bytes));
      } catch(e) {}
    }, 400);
  },

  stopLive: function() {
    if (OBD._liveInterval) { clearInterval(OBD._liveInterval); OBD._liveInterval = null; }
  },

  // ── Read DTCs ────────────────────────────────────────────────────────
  readDTC: async function() {
    OBD.stopLive();
    obdUI.setDTCStatus('reading');
    try {
      var r = await OBD._send('03', 5000);   // Mode 03 = stored DTCs
      var codes = OBD._parseDTC(r);
      // Also read pending DTCs (mode 07)
      var r2 = await OBD._send('07', 3000);
      var pending = OBD._parseDTC(r2);
      obdUI.showDTCs(codes, pending);
    } catch(e) {
      obdUI.setDTCStatus('error', e.message);
    }
  },

  _parseDTC: function(raw) {
    var codes = [];
    var hex = raw.replace(/[^0-9A-Fa-f]/g,'');
    // Remove mode response byte(s)
    if (hex.startsWith('43') || hex.startsWith('47')) hex = hex.slice(2);
    if (hex === '00' || hex === '0000') return codes;
    var pairs = hex.match(/.{4}/g) || [];
    pairs.forEach(function(pair) {
      if (pair === '0000') return;
      var first = parseInt(pair[0],16);
      var type  = ['P','C','B','U'][first >> 2] || 'P';
      var digit = (first & 3).toString() + pair.slice(1);
      codes.push(type + digit.toUpperCase());
    });
    return codes;
  },

  clearDTC: async function() {
    if (!confirm('Cancellare tutti i codici di errore dalla centralina? Il segnale di avaria si spegnerà.')) return;
    obdUI.setDTCStatus('clearing');
    var r = await OBD._send('04', 5000);
    if (r.includes('44') || r.includes('NO DATA')) {
      obdUI.setDTCStatus('cleared');
    } else {
      obdUI.setDTCStatus('error', 'Risposta inattesa: ' + r.slice(0,20));
    }
  },

  // ── Freeze frame ─────────────────────────────────────────────────────
  readFreeze: async function() {
    OBD.stopLive();
    obdUI.setDTCStatus('reading');
    var r = await OBD._send('0202', 3000);   // DTC that triggered freeze
    var r2 = await OBD._send('0204', 3000);  // Engine load at freeze
    var r3 = await OBD._send('020C', 3000);  // RPM at freeze
    var r4 = await OBD._send('020D', 3000);  // Speed at freeze
    var r5 = await OBD._send('0205', 3000);  // Coolant at freeze
    obdUI.showFreeze({ dtc:r, load:r2, rpm:r3, speed:r4, coolant:r5 });
  },
};

// =======================================================================
// OBD UI
// =======================================================================
var obdUI = {

  setStatus: function(state, msg) {
    var el = document.getElementById('obd-status');
    if (!el) return;
    var icons = { idle:'📡', connecting:'⏳', connected:'✅', error:'❌' };
    var colors = { idle:'var(--t3)', connecting:'var(--warn)', connected:'var(--grn)', error:'var(--err)' };
    el.style.color = colors[state] || 'var(--t3)';
    el.innerHTML = (icons[state]||'') + (msg ? ' ' + msg : '');
  },

  setBtnConnect: function(show) {
    var btnC = document.getElementById('obd-btn-connect');
    var btnD = document.getElementById('obd-btn-disconnect');
    if (btnC) btnC.style.display = show ? '' : 'none';
    if (btnD) btnD.style.display = show ? 'none' : '';
  },

  onConnected: function(name) {
    obdUI.setStatus('connected', 'Connesso a ' + name);
    obdUI.setBtnConnect(false);
    document.getElementById('obd-controls').style.display = 'flex';
    document.getElementById('obd-panel-live').style.display = 'block';
  },

  onDisconnected: function() {
    obdUI.setStatus('idle', 'Disconnesso');
    obdUI.setBtnConnect(true);
    var ctrl = document.getElementById('obd-controls');
    if (ctrl) ctrl.style.display = 'none';
  },

  initLiveCards: function(pids) {
    var grid = document.getElementById('obd-live-grid');
    if (!grid) return;
    grid.innerHTML = pids.map(function(p) {
      return '<div class="obd-card" id="obc-' + p.pid + '">'
        + '<div class="obd-card-icon">' + p.icon + '</div>'
        + '<div class="obd-card-body">'
        +   '<div class="obd-card-name">' + p.name + '</div>'
        +   '<div class="obd-card-val" id="obv-' + p.pid + '">—</div>'
        +   '<div class="obd-card-unit">' + p.unit + '</div>'
        +   '<div class="obd-gauge-track"><div class="obd-gauge-fill" id="obg-' + p.pid + '" style="background:' + p.color + '"></div></div>'
        + '</div></div>';
    }).join('');
  },

  updateLiveCard: function(p, val) {
    var valEl  = document.getElementById('obv-' + p.pid);
    var fillEl = document.getElementById('obg-' + p.pid);
    if (valEl)  valEl.textContent = val;
    if (fillEl) fillEl.style.width = Math.min(100, (parseFloat(val) / p.max * 100)).toFixed(1) + '%';
  },

  setDTCStatus: function(state, msg) {
    var el = document.getElementById('obd-dtc-status');
    if (!el) return;
    var msgs = {
      reading:  '⏳ Lettura codici in corso…',
      clearing: '⏳ Cancellazione in corso…',
      cleared:  '✅ Codici cancellati. Riavviare il motore.',
      error:    '❌ ' + (msg||'Errore'),
    };
    el.textContent = msgs[state] || '';
    el.style.color = state === 'cleared' ? 'var(--grn)' : state === 'error' ? 'var(--err)' : 'var(--warn)';
  },

  showDTCs: function(stored, pending) {
    var el = document.getElementById('obd-dtc-list');
    if (!el) return;

    if (!stored.length && !pending.length) {
      el.innerHTML = '<div class="obd-no-dtc">✅ Nessun codice di errore presente</div>';
      document.getElementById('obd-dtc-status').textContent = '';
      return;
    }

    var html = '';
    if (stored.length) {
      html += '<div class="obd-dtc-section-title">⚠ Errori attivi (' + stored.length + ')</div>';
      stored.forEach(function(code) {
        var info = OBD_CODES[code] || 'Descrizione non disponibile nel database locale';
        html += '<div class="obd-dtc-item">'
          + '<span class="obd-dtc-code ocode o' + code[0] + '">' + code + '</span>'
          + '<div class="obd-dtc-desc">'
          +   '<div class="obd-dtc-title">' + info + '</div>'
          +   '<div class="obd-dtc-cat">' + obdUI._dtcCategory(code) + '</div>'
          + '</div></div>';
      });
    }
    if (pending.length) {
      html += '<div class="obd-dtc-section-title" style="margin-top:14px">⏳ Errori in sospeso (' + pending.length + ')</div>';
      pending.forEach(function(code) {
        var info = OBD_CODES[code] || 'Descrizione non disponibile';
        html += '<div class="obd-dtc-item obd-dtc-pending">'
          + '<span class="obd-dtc-code ocode o' + code[0] + '">' + code + '</span>'
          + '<div class="obd-dtc-desc">'
          +   '<div class="obd-dtc-title">' + info + '</div>'
          +   '<div class="obd-dtc-cat">' + obdUI._dtcCategory(code) + ' · Pendente</div>'
          + '</div></div>';
      });
    }

    el.innerHTML = html;
    document.getElementById('obd-dtc-status').textContent = '';
  },

  showFreeze: function(data) {
    var el = document.getElementById('obd-dtc-list');
    if (!el) return;
    function extract(raw, mode_pid) {
      var m = raw.replace(/\s/g,'').match(new RegExp('4[27]' + mode_pid.slice(2) + '([0-9A-Fa-f]+)', 'i'));
      return m ? m[1] : null;
    }
    var html = '<div class="obd-dtc-section-title">❄ Freeze Frame — dati al momento del guasto</div>';
    html += '<div class="obd-freeze-grid">';
    var ff = [
      { label:'Motore (RPM)', raw: extract(data.rpm,'020C'), parse: function(h){ var b=h.match(/.{2}/g);return b?((parseInt(b[0],16)*256+parseInt(b[1],16))/4).toFixed(0):'-'; } },
      { label:'Velocità (km/h)', raw: extract(data.speed,'020D'), parse: function(h){ return parseInt(h.slice(0,2),16)||'-'; } },
      { label:'Carico motore', raw: extract(data.load,'0204'), parse: function(h){ return (parseInt(h.slice(0,2),16)*100/255).toFixed(1)+'%'; } },
      { label:'Temp. liquido (°C)', raw: extract(data.coolant,'0205'), parse: function(h){ return (parseInt(h.slice(0,2),16)-40)||'-'; } },
    ];
    ff.forEach(function(f) {
      var val = f.raw ? (function(){ try{ return f.parse(f.raw); }catch(e){ return '-'; } })() : '—';
      html += '<div class="dsm"><div class="dsm-lb">' + f.label + '</div><div class="dsm-v" style="font-size:1.1rem">' + val + '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
    document.getElementById('obd-dtc-status').textContent = '';
  },

  _dtcCategory: function(code) {
    var cats = {
      P0:'Powertrain generico', P1:'Powertrain specifico costruttore',
      P2:'Powertrain generico (ISO)', P3:'Powertrain costruttore',
      C0:'Chassis generico', B0:'Body generico',
      U0:'Network generico', U1:'Network costruttore',
    };
    return cats[code.slice(0,2)] || 'Codice ' + code[0];
  },
};

function obdConnect()    { OBD.connect(); }
function obdDisconnect() { OBD.disconnect(); }
function obdStartLive()  { OBD.startLive(); }
function obdStopLive()   { OBD.stopLive(); obdUI.setStatus('connected','Live fermato'); }
function obdReadDTC()    { OBD.readDTC(); }
function obdClearDTC()   { OBD.clearDTC(); }
function obdReadFreeze() { OBD.readFreeze(); }


// =======================================================================
// DIARIO DELLA VETTURA
// =======================================================================
var DIARY_KEY = 'autodiagnosi_diary';
var DIARY_TYPES = [
  { id:'tagliando',     label:'Tagliando',     icon:'🔧', color:'var(--blue)' },
  { id:'riparazione',   label:'Riparazione',   icon:'🔩', color:'var(--err)'  },
  { id:'revisione',     label:'Revisione',     icon:'📋', color:'#a78bfa'     },
  { id:'rifornimento',  label:'Rifornimento',  icon:'⛽', color:'var(--grn)'  },
  { id:'bollo',         label:'Bollo',         icon:'📝', color:'var(--warn)' },
  { id:'assicurazione', label:'Assicurazione', icon:'🛡', color:'var(--gold)' },
  { id:'altro',         label:'Altro',         icon:'📌', color:'var(--t3)'   },
];
var _diaryType = 'tagliando';

function diaryLoad() {
  try { return JSON.parse(localStorage.getItem(DIARY_KEY) || '{"entries":[],"car":"","kmStart":0}'); }
  catch(e) { return { entries:[], car:'', kmStart:0 }; }
}
function diarySave(data) { localStorage.setItem(DIARY_KEY, JSON.stringify(data)); }

function diaryInit() {
  var pills = document.getElementById('diary-type-pills');
  if (!pills) return;
  pills.innerHTML = DIARY_TYPES.map(function(t) {
    return '<div class="dtype' + (t.id === _diaryType ? ' active' : '') + '" data-tid="' + t.id
      + '" onclick="diarySetType(\'' + t.id + '\')">' + t.icon + ' ' + t.label + '</div>';
  }).join('');
  var data = diaryLoad();
  var nameEl = document.getElementById('diary-car-name');
  var kmEl   = document.getElementById('diary-km-start');
  if (nameEl && data.car)     nameEl.value = data.car;
  if (kmEl   && data.kmStart) kmEl.value   = data.kmStart;
  var dateEl = document.getElementById('di-date');
  if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0,10);
  diaryRender();
}

function diarySetType(id) {
  _diaryType = id;
  document.querySelectorAll('.dtype').forEach(function(el) {
    el.classList.toggle('active', el.dataset.tid === id);
  });
  var fx = document.getElementById('di-fuel-extra');
  if (fx) fx.style.display = (id === 'rifornimento') ? 'block' : 'none';
}

function diaryAdd() {
  var title = (document.getElementById('di-title').value || '').trim();
  var date  = document.getElementById('di-date').value;
  var cost  = parseFloat(document.getElementById('di-cost').value) || 0;
  var km    = parseInt(document.getElementById('di-km').value) || 0;
  var notes = (document.getElementById('di-notes').value || '').trim();
  if (!title) { document.getElementById('di-title').focus(); return; }
  if (!date)  { document.getElementById('di-date').focus(); return; }
  var entry = { id:Date.now(), type:_diaryType, title:title, date:date, cost:cost, km:km, notes:notes };
  if (_diaryType === 'rifornimento') {
    var liters = parseFloat(document.getElementById('di-liters').value) || 0;
    var ppl    = parseFloat(document.getElementById('di-ppl').value) || 0;
    if (liters) entry.liters = liters;
    if (ppl)    entry.ppl    = ppl;
    if (!cost && liters && ppl) entry.cost = Math.round(liters * ppl * 100) / 100;
  }
  var data = diaryLoad();
  data.entries.unshift(entry);
  data.car     = (document.getElementById('diary-car-name').value || '').trim();
  data.kmStart = parseInt(document.getElementById('diary-km-start').value) || 0;
  diarySave(data);
  ['di-title','di-cost','di-km','di-notes','di-liters','di-ppl'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  diaryRender();
}

function diaryDelete(id) {
  var data = diaryLoad();
  data.entries = data.entries.filter(function(e) { return e.id !== id; });
  diarySave(data);
  diaryRender();
}

function diaryUpdateStats() {
  var data = diaryLoad();
  data.car     = (document.getElementById('diary-car-name').value || '').trim();
  data.kmStart = parseInt(document.getElementById('diary-km-start').value) || 0;
  diarySave(data);
  diaryRender();
}

function diaryRender() {
  var data    = diaryLoad();
  var entries = data.entries || [];
  var total    = entries.reduce(function(s,e) { return s + (e.cost||0); }, 0);
  var yr       = new Date().getFullYear() + '';
  var yearCost = entries.filter(function(e) { return (e.date||'').startsWith(yr); })
                        .reduce(function(s,e) { return s + (e.cost||0); }, 0);
  var kms   = entries.filter(function(e) { return e.km>0; }).map(function(e) { return e.km; });
  var kmMax = kms.length ? Math.max.apply(null,kms) : 0;
  var kmMin = data.kmStart || (kms.length ? Math.min.apply(null,kms) : 0);
  var cpkm  = (kmMax-kmMin>0 && total>0) ? (total/(kmMax-kmMin)).toFixed(2) : null;
  function fmt(n) { return n.toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:0}); }
  function setEl(id, v) { var el=document.getElementById(id); if(el) el.textContent=v; }
  setEl('ds-total', '\u20AC' + fmt(total));
  setEl('ds-count', entries.length);
  setEl('ds-cpkm',  cpkm ? '\u20AC' + cpkm : '\u2014');
  setEl('ds-year',  '\u20AC' + fmt(yearCost));

  // Charts
  var chartsEl = document.getElementById('diary-charts');
  if (chartsEl && entries.length >= 2) {
    chartsEl.style.display = 'grid';
    var byCat = {}; DIARY_TYPES.forEach(function(t) { byCat[t.id]=0; });
    entries.forEach(function(e) { if(e.cost) byCat[e.type]=(byCat[e.type]||0)+e.cost; });
    var maxCat = Math.max.apply(null,Object.values(byCat))||1;
    var catBars = DIARY_TYPES.filter(function(t) { return byCat[t.id]>0; })
      .sort(function(a,b) { return byCat[b.id]-byCat[a.id]; })
      .map(function(t) {
        return '<div class="bar-row"><div class="bar-label">'+t.icon+' '+t.label+'</div>'
          +'<div class="bar-track"><div class="bar-fill" style="width:'
          +(byCat[t.id]/maxCat*100).toFixed(1)+'%;background:'+t.color+'"></div></div>'
          +'<div class="bar-val">\u20AC'+Math.round(byCat[t.id]).toLocaleString()+'</div></div>';
      }).join('');
    var byYear = {};
    entries.forEach(function(e) { var y=(e.date||'').slice(0,4); if(y) byYear[y]=(byYear[y]||0)+(e.cost||0); });
    var maxYear = Math.max.apply(null,Object.values(byYear))||1;
    var yearBars = Object.keys(byYear).sort().map(function(y) {
      return '<div class="bar-row"><div class="bar-label">'+y+'</div>'
        +'<div class="bar-track"><div class="bar-fill" style="width:'
        +(byYear[y]/maxYear*100).toFixed(1)+'%;background:var(--gold)"></div></div>'
        +'<div class="bar-val">\u20AC'+Math.round(byYear[y]).toLocaleString()+'</div></div>';
    }).join('');
    chartsEl.innerHTML =
      '<div class="chart-box"><div class="chart-box-title">// Spesa per categoria</div><div class="bar-chart">'+catBars+'</div></div>'
      +'<div class="chart-box"><div class="chart-box-title">// Spesa per anno</div><div class="bar-chart">'+yearBars+'</div></div>';
  } else if (chartsEl) {
    chartsEl.style.display='none'; chartsEl.innerHTML='';
  }

  // List
  var listEl = document.getElementById('diary-list');
  if (!listEl) return;
  if (!entries.length) {
    listEl.innerHTML = '<div class="empty-diary"><span>\ud83d\udcd3</span>Nessun intervento registrato.<br>Aggiungi il primo usando il modulo sopra.</div>';
    return;
  }
  var groups = {};
  entries.forEach(function(e) {
    var k=(e.date||'').slice(0,7)||'Senza data';
    if(!groups[k]) groups[k]=[];
    groups[k].push(e);
  });
  var mN=['','Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  var html='';
  Object.keys(groups).sort().reverse().forEach(function(key) {
    var lbl=key;
    if(key.match(/^\d{4}-\d{2}$/)) { var p=key.split('-'); lbl=mN[parseInt(p[1])]+' '+p[0]; }
    var mTot=groups[key].reduce(function(s,e) { return s+(e.cost||0); },0);
    html+='<div class="diary-month">'+lbl+(mTot?'<span style="float:right;color:var(--gold)">\u20AC'+mTot.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>':'')+'</div>';
    groups[key].forEach(function(e) {
      var t=DIARY_TYPES.find(function(x){return x.id===e.type;})||DIARY_TYPES[6];
      var meta=[];
      if(e.km) meta.push('\u2299 '+e.km.toLocaleString()+' km');
      if(e.liters) meta.push('\u26fd '+e.liters+' L');
      if(e.ppl) meta.push('@ \u20AC'+e.ppl+'/L');
      if(e.notes) meta.push(e.notes);
      html+='<div class="diary-entry">'
        +'<div class="diary-entry-icon">'+t.icon+'</div>'
        +'<div class="diary-entry-body">'
        +'<div class="diary-entry-top">'
        +'<span class="diary-entry-type dtype-'+e.type+'">'+t.label+'</span>'
        +(e.cost?'<span class="diary-entry-cost">\u20AC'+e.cost.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>':'')+'<span class="diary-entry-date">'+((e.date||'').split('-').reverse().join('/'))+'</span>'
        +'</div>'
        +'<div class="diary-entry-title">'+e.title+'</div>'
        +(meta.length?'<div class="diary-entry-meta">'+meta.join(' \u00b7 ')+'</div>':'')+'</div>'
        +'<button class="diary-entry-del" onclick="diaryDelete('+e.id+')" title="Elimina">\u2715</button></div>';
    });
  });
  listEl.innerHTML=html;
}

function diaryExportCSV() {
  var data=diaryLoad(); var entries=data.entries||[];
  if(!entries.length){alert('Nessun dato da esportare.');return;}
  var rows=[['Data','Tipo','Titolo','Costo (EUR)','Km','Litri','EUR/L','Note']];
  entries.forEach(function(e){rows.push([e.date||'',e.type||'',e.title||'',(e.cost||0).toFixed(2),e.km||'',e.liters||'',e.ppl||'',e.notes||'']);});
  var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='diario_auto.csv'; a.click();
  URL.revokeObjectURL(url);
}

function diaryClear() {
  if(!confirm('Eliminare TUTTI gli interventi? Non reversibile.')) return;
  localStorage.removeItem(DIARY_KEY);
  ['diary-car-name','diary-km-start'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  diaryRender();
}


// ── THEME TOGGLE ────────────────────────────────────────────────────────────
(function() {
  var saved = localStorage.getItem('ad_theme');
  // Predefinito scuro: il tema chiaro esiste solo per la Diagnosi e si attiva da Altro → Tema
  var theme = saved === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ad_theme', next);
  var btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = next === 'dark' ? '🌙' : '☀️';
}

function initThemeBtn() {
  var btn   = document.getElementById('theme-toggle');
  var theme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}


// ── VEHICLE MODE (auto / moto) ──────────────────────────────────────────────
function setVehicleMode(mode) {
  _vehicleMode = mode;
  document.getElementById('type-auto').className = 'type-btn' + (mode==='auto'?' active':'');
  document.getElementById('type-moto').className = 'type-btn' + (mode==='moto'?' active-moto':'');
  var hint = document.getElementById('moto-hint');
  if (hint) hint.className = 'moto-hint' + (mode==='moto'?' visible':'');

  // Reset selectors
  var sm = document.getElementById('search-marca');
  var sd = document.getElementById('search-modello');
  var sa = document.getElementById('sel-anno');
  var sm2= document.getElementById('sel-motore');
  if (sm)  { sm.value=''; document.getElementById('sel-marca').value=''; }
  if (sd)  { sd.value=''; sd.disabled=true; sd.placeholder='Prima seleziona marca'; document.getElementById('sel-modello').value=''; }
  if (sa)  sa.innerHTML='<option value="">— Anno —</option>';
  if (sm2) sm2.innerHTML='<option value="">— Motore —</option>';

  // Rebuild marca list
  buildMarcaList();
  document.getElementById('results').innerHTML = '';
  document.getElementById('tabs').className = 'tabs';
  document.getElementById('filter-bar').className = 'filter-bar';
  document.getElementById('vehicle-bar').className = '';
}

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
initThemeBtn();
populateMarca();
buildCompareSelectors('a');
buildCompareSelectors('b');
restoreReminder();


