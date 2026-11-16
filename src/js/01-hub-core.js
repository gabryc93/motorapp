


/* ═══════════════════════════════════════════════════════════════════
   HUB ROUTER — bottom tab navigation, default = fuel
   ═══════════════════════════════════════════════════════════════════ */
(function() {
  // Data locale YYYY-MM-DD (toISOString() usa UTC: tra mezzanotte e le 2 restituiva ieri)
  // db.json: circa 190 motori diesel (BMW 118d, Multijet, D-4D…) sono segnati "Benzina".
  // Si corregge l'alimentazione al caricamento, guardando il nome del motore,
  // così Diagnosi, Garage e Usato (Area B!) usano il dato giusto.
  var DIESEL_RE = /multijet|\bmjet\b|\bmjt\b|\bjtdm?\b|\btdi\b|\bcdti?\b|\bhdi\b|bluehdi|\bdci\b|tdci|\bcrdi\b|d-?4d|\bdiesel\b|\b\d{3}d\b|\b\d\.\dd\b|\bsd4\b|\bd[345]\b|i-dtec|\bdtec\b|ecoblue|bluetec|\bxdi\b|skyactiv-d|\btdv[68]\b|\bsdv[68]\b/i;
  window.hubIsDieselName = function(m) { return DIESEL_RE.test(String(m || '')); };
  window.hubFixVDB = function(db) {
    if (!db || !db.specs || db._alimFixed) return db;
    var n = 0;
    Object.keys(db.specs).forEach(function(k) {
      var sp = db.specs[k], mot = k.split('||')[3] || '', a = String(sp.alimentazione || '');
      if (DIESEL_RE.test(mot) && !/diesel/i.test(a)) {
        sp.alimentazione = /ibrid|hev|mhev/i.test(a + ' ' + mot) ? 'Diesel mild hybrid' : 'Diesel';
        n++;
      }
    });
    db._alimFixed = n;
    return db;
  };

  /* ── Database veicoli diviso per marca (db/index.json + db/<marca>.json) ──
     hubVDB.ensure(['Fiat', …]) scarica solo le marche richieste e le unisce in
     window._vdb = { _meta, vehicles, specs, maintenance }. Se db/ non c'è,
     ripiega sul vecchio db.json intero. */
  window.hubVDB = (function() {
    var index = null, loaded = {}, inflight = {}, full = false;
    function base() {
      if (!window._vdb) window._vdb = { _meta: {}, vehicles: {}, specs: {}, maintenance: {} };
      return window._vdb;
    }
    function merge(part) {
      var db = base();
      ['vehicles', 'specs', 'maintenance'].forEach(function(k) {
        var src = part[k] || {};
        for (var key in src) db[k][key] = src[key];
      });
      if (part._meta) db._meta = part._meta;
      window.hubFixVDB(db);
      db._alimFixed = false;   // le marche aggiunte dopo vanno ricontrollate
    }
    function getJSON(url) {
      return fetch(url, { cache: 'default' }).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' su ' + url);
        return r.json();
      });
    }
    function loadIndex() {
      if (index) return Promise.resolve(index);
      if (inflight._index) return inflight._index;
      inflight._index = getJSON('./db/index.json').then(function(j) {
        index = j; base()._meta = j._meta || {}; return j;
      }, function(e) { delete inflight._index; throw e; });
      return inflight._index;
    }
    function loadFull() {
      if (full) return Promise.resolve(base());
      if (inflight._full) return inflight._full;
      inflight._full = getJSON('./db.json').then(function(j) { merge(j); full = true; return base(); },
        function(e) { delete inflight._full; throw e; });
      return inflight._full;
    }
    function ensure(marche) {
      marche = (marche || []).filter(function(m, i, a) { return m && a.indexOf(m) === i; });
      if (full) return Promise.resolve(base());
      return loadIndex().then(function(ix) {
        return Promise.all(marche.map(function(m) {
          var b = ix.brands && ix.brands[m];
          if (!b || loaded[m]) return null;
          if (!inflight[m]) inflight[m] = getJSON('./db/' + b.file).then(function(part) {
            merge(part); loaded[m] = true; delete inflight[m];
          }, function(e) { delete inflight[m]; throw e; });
          return inflight[m];
        }));
      }, function() { return loadFull(); }).then(function() { return base(); });
    }
    return {
      ensure: ensure,
      has: function(m) { return full || !!loaded[m]; },
      brands: function() { return index ? Object.keys(index.brands || {}) : null; }
    };
  })();

  /* ── IndexedDB condiviso (foto veicoli + documenti manutenzione) ──
     Prima Garage apriva la versione 1 e Manutenzione la 2: dopo il primo documento
     il Garage andava in errore, e se il Garage era aperto la Manutenzione restava bloccata. */
  var _idbP = null;
  window.hubIDB = function() {
    if (_idbP) return _idbP;
    _idbP = new Promise(function(resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB non supportato')); return; }
      var req = indexedDB.open('autohub_v1', 2);
      req.onupgradeneeded = function(ev) {
        var db = ev.target.result;
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('maintdocs')) db.createObjectStore('maintdocs', { keyPath: 'id' });
      };
      req.onsuccess = function() {
        var db = req.result;
        db.onversionchange = function() { db.close(); _idbP = null; };
        resolve(db);
      };
      req.onerror = function() { _idbP = null; reject(req.error); };
      req.onblocked = function() { console.warn('[AutoHub] IndexedDB bloccato da un\'altra scheda aperta'); };
    });
    return _idbP;
  };

  /* ── Calendario (.ics): funziona con Calendario iPhone, Google, Outlook ──
     ev: { uid, title, desc, date:'YYYY-MM-DD' (giornata intera) | start/end ISO, alarms:[minuti prima] } */
  window.hubICS = function(events, filename) {
    function esc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, function(c) { return '\\' + c; }); }
    function utc(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    function day(s) { return s.replace(/-/g, ''); }
    function nextDay(s) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + 1); return window.hubToday(d).replace(/-/g, ''); }
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AutoHub//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    var stamp = utc(new Date());
    events.forEach(function(e) {
      L.push('BEGIN:VEVENT', 'UID:' + e.uid + '@autohub', 'DTSTAMP:' + stamp, 'SUMMARY:' + esc(e.title));
      if (e.date) L.push('DTSTART;VALUE=DATE:' + day(e.date), 'DTEND;VALUE=DATE:' + nextDay(e.date));
      else { L.push('DTSTART:' + utc(new Date(e.start)), 'DTEND:' + utc(new Date(e.end || new Date(new Date(e.start).getTime() + 3600000)))); }
      if (e.desc) L.push('DESCRIPTION:' + esc(e.desc));
      if (e.location) L.push('LOCATION:' + esc(e.location));
      (e.alarms || []).forEach(function(m) { L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(e.title), 'TRIGGER:-PT' + m + 'M', 'END:VALARM'); });
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    // righe max 75 ottetti (RFC 5545): si spezzano le lunghe
    var text = L.map(function(l) { var out = ''; while (l.length > 73) { out += l.slice(0, 73) + '\r\n '; l = l.slice(73); } return out + l; }).join('\r\n') + '\r\n';
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename || 'autohub.ics';
    document.body.appendChild(a); a.click();
    setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 200);
    return text;
  };

  window.hubToday = function(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  function escSafe(s) {
    if (typeof window.esc === 'function') return window.esc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var fuelInitialized = false;
  var _cmpFuel = null;
  // Sezioni reali con DOM persistente
  var SECTIONS = ['fuel', 'diag', 'garage', 'usato'];
  // Tab "azione": aprono un overlay e tornano alla sezione precedente
  var ACTIONS  = ['passi', 'ride', 'meteo', 'ms'];
  var _lastSection = 'fuel';

  function hubGo(name) {
    var isSection = SECTIONS.indexOf(name) >= 0;
    var isAction  = ACTIONS.indexOf(name) >= 0;
    if (!isSection && !isAction) name = 'fuel';

    hubMore(false);
    // La barra evidenzia solo le sezioni: gli strumenti (passi, ride, meteo, motorsport) sono overlay
    if (isSection) {
      document.querySelectorAll('.hub-tab[data-hub]').forEach(function(b) {
        var on = b.dataset.hub === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    if (isSection) {
      // Switch the visible section
      _lastSection = name;
      document.body.dataset.hub = name;
      ['hub-diag', 'hub-fuel', 'hub-garage', 'hub-usato'].forEach(function(id) {
        var sec = document.getElementById(id);
        if (sec) sec.classList.toggle('active', id === ('hub-' + name));
      });
      if (location.hash !== '#' + name) {
        try { history.replaceState(null, '', '#' + name); } catch(e) { location.hash = name; }
      }
      if (name === 'fuel' && !fuelInitialized) {
        fuelInitialized = true;
        try { window._fuelLazyInit && window._fuelLazyInit(); }
        catch (e) { console.error('Fuel init failed:', e); }
      }
      if (name === 'fuel') { setTimeout(_hubAutoSelectFuel, 80); }
      if (name === 'usato' && typeof window.usatoInit === 'function') window.usatoInit();
      window.scrollTo(0, 0);
    } else if (isAction) {
      // Open the corresponding overlay; section stays as it was
      if (name === 'passi') {
        if (typeof window.openPassi === 'function') window.openPassi();
      } else if (name === 'ride') {
        if (typeof window.openRide === 'function') window.openRide();
      } else if (name === 'meteo') {
        if (typeof window.openWeather === 'function') window.openWeather();
      } else if (name === 'ms') {
        if (typeof window.openMotorsport === 'function') window.openMotorsport();
      }
    }
  }
  window.hubGo = hubGo;

  /* ── Foglio "Altro": strumenti, tema, backup ─────────────────── */
  function hubMore(open) {
    var sh = document.getElementById('hub-more');
    if (!sh) return;
    if (open === undefined) open = !sh.classList.contains('visible');
    sh.classList.toggle('visible', !!open);
    var btn = document.getElementById('hub-tab-more');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var th = document.getElementById('hub-more-theme');
      if (th) th.textContent = (document.documentElement.getAttribute('data-theme') === 'light') ? 'Chiaro' : 'Scuro';
      var bd = document.getElementById('hub-more-build');
      if (bd) bd.textContent = 'build ' + ((document.querySelector('meta[name="autohub-build"]') || {}).content || '');
    }
  }
  window.hubMore = hubMore;
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') hubMore(false); });

  window.hubToggleTheme = function() {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
    hubMore(true);
  };

  /* (backup e ripristino: vedi 15-backup.js) */


  /* ── Auto-select fuel from active garage vehicle ─────────── */
  function _hubAutoSelectFuel() {
    var v = window.hubGarage && window.hubGarage.active && window.hubGarage.active();
    if (!v) return;
    var alim   = ((v.specs && v.specs.alim) || '').toLowerCase();
    var motore = (v.motore || '').toLowerCase();
    var s = alim + ' ' + motore;
    var target = 'Benzina';
    if (/elettr|bev|electric|\bev\b/.test(s))        target = 'EV';
    else if (/metano|cng|gnc/.test(s))                target = 'Metano';
    else if (/gpl|lpg/.test(s))                       target = 'GPL';
    else if (/hvo/.test(s))                           target = 'HVO';
    else if (/diesel|tdi|cdi|jtd|dci|crdi|hdi|cdti|mjet|d4d|jtdm|bluehdi|ecoblue|skyactiv-d/.test(s)) target = 'Diesel';
    var listBtn = document.querySelector('.fb[data-f="' + target + '"]');
    if (listBtn && typeof window.setFuel === 'function') {
      var cur = document.querySelector('.fb[data-f].on');
      if (!cur || cur.dataset.f !== target) {
        window.setFuel(listBtn);
        var vName = v.customName || ((v.marca||'')+' '+(v.modello||'')).trim();
        _hubFuelToast('⛽ ' + target + ' · dal veicolo ' + (vName || 'attivo'));
      }
    }
    var mapBtn = document.querySelector('.fb[data-mf="' + target + '"]');
    if (mapBtn && typeof window.setMapFuel === 'function') {
      var curMap = document.querySelector('.fb[data-mf].on');
      if (!curMap || curMap.dataset.mf !== target) window.setMapFuel(mapBtn);
    }
  }

  function _hubFuelToast(msg) {
    var t = document.getElementById('hub-fuel-toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.id = 'hub-fuel-toast';
    t.textContent = msg;
    Object.assign(t.style, {
      position:'fixed', bottom:'calc(72px + env(safe-area-inset-bottom,0px))',
      left:'50%', transform:'translateX(-50%)',
      background:'rgba(28,28,32,.96)', border:'1px solid rgba(255,255,255,.11)',
      color:'#ddd', fontFamily:'"DM Mono",monospace', fontSize:'.61rem',
      letterSpacing:'.04em', padding:'6px 14px', borderRadius:'999px',
      zIndex:'9999', whiteSpace:'nowrap', pointerEvents:'none',
      animation:'hubToastIn .2s ease'
    });
    document.body.appendChild(t);
    setTimeout(function() {
      t.style.animation = 'hubToastOut .3s ease forwards';
      setTimeout(function() { if (t.parentNode) t.remove(); }, 300);
    }, 2500);
  }

  window._hubOpenTankEdit = function() {
    var v = window.hubGarage && window.hubGarage.active && window.hubGarage.active();
    if (!v) { alert('Nessun veicolo attivo.'); return; }
    if (typeof window.openGarageEdit === 'function') {
      window.hubGo('garage');
      setTimeout(function() { window.openGarageEdit(v.id); }, 220);
    }
  };

  // initial route from hash — default = fuel (home)
  document.addEventListener('DOMContentLoaded', function() {
    var initial = (location.hash || '').replace('#', '');
    if (SECTIONS.indexOf(initial) >= 0) { hubGo(initial); return; }
    // Hash di uno strumento (es. #passi): prima si inizializza la home, poi si apre l'overlay
    hubGo('fuel');
    if (ACTIONS.indexOf(initial) >= 0) setTimeout(function() { hubGo(initial); }, 400);
  });
  window.addEventListener('hashchange', function() {
    var n = (location.hash || '').replace('#', '');
    // Hash sconosciuti vengono ignorati (prima riportavano sempre a Carburanti)
    if (SECTIONS.indexOf(n) >= 0 || ACTIONS.indexOf(n) >= 0) hubGo(n);
  });

  /* Smart link: vehicle motore -> fuel filter on Carburanti */
  window.hubSyncFuelFromVehicle = function(motore) {
    if (!motore) return;
    var s = String(motore).toLowerCase();
    var target = null;
    if (/tdi|cdi|jtd|dci|crdi|hdi|cdti|mjet|bluehdi|ecoblue|skyactiv-d|d4d|jtdm|diesel/i.test(s)) target = 'Diesel';
    else if (/gpl|lpg/i.test(s)) target = 'GPL';
    else if (/metano|cng/i.test(s)) target = 'Metano';
    else if (/bev|electric|elettric|recharge/i.test(s)) target = null;
    else target = 'Benzina';
    if (target && typeof window.setFuel === 'function') {
      try { window.setFuel(target); } catch(e) {}
    }
  };

  /* Auto-wire: when user picks a motore in diagnosi, sync the fuel tab filter */
  function _hubWireDiagSync() {
    var motSel = document.getElementById('sel-motore');
    if (motSel) {
      motSel.addEventListener('change', function() {
        if (this.value) window.hubSyncFuelFromVehicle(this.value);
      });
    }
    if (typeof window.avviaDiagnosi === 'function') {
      var _orig = window.avviaDiagnosi;
      window.avviaDiagnosi = function() {
        var v = motSel && motSel.value;
        if (v) { try { window.hubSyncFuelFromVehicle(v); } catch(e){} }
        return _orig.apply(this, arguments);
      };
    }
  }
  document.addEventListener('DOMContentLoaded', _hubWireDiagSync);

  /* ── Pill visibility: JS fallback for browsers without :has() ────
        Mirrors the CSS rule. Sets body[data-pill-hidden="1"] when any
        of the fullscreen views/modals are open inside #hub-fuel. */
  function _hubUpdatePillVisibility() {
    var mv  = document.getElementById('map-view');
    var fv  = document.getElementById('fav-view');
    var mo  = document.getElementById('modal-overlay');
    var feo = document.getElementById('fav-edit-overlay');
    var cmp = document.getElementById('hub-cmp-overlay');
    var gar = document.getElementById('gar-overlay');
    var ged = document.getElementById('gar-edit');
    var flo = document.getElementById('fl-overlay');
    var fle = document.getElementById('fl-edit');
    var pso = document.getElementById('ps-overlay');
    var psd = document.getElementById('ps-detail');
    var rdo = document.getElementById('rd-overlay');
    var mto = document.getElementById('mt-overlay');
    var mte = document.getElementById('mt-edit');
    var rdl = document.getElementById('rdl-overlay');
    var rdd = document.getElementById('rdl-detail');
    var wpo = document.getElementById('wp-overlay');
    var tco = document.getElementById('tco-overlay');
    var mso = document.getElementById('ms-overlay');
    var usOpen = !!document.querySelector('.us-ov.visible');
    var hide = usOpen ||
      (mv  && mv.classList.contains('visible')) ||
      (fv  && fv.classList.contains('visible')) ||
      (mo  && !mo.classList.contains('hidden')) ||
      (feo && !feo.classList.contains('hidden')) ||
      (cmp && cmp.classList.contains('visible')) ||
      (gar && gar.classList.contains('visible')) ||
      (ged && ged.classList.contains('visible')) ||
      (flo && flo.classList.contains('visible')) ||
      (fle && fle.classList.contains('visible')) ||
      (pso && pso.classList.contains('visible')) ||
      (psd && psd.classList.contains('visible')) ||
      (rdo && rdo.classList.contains('visible')) ||
      (mto && mto.classList.contains('visible')) ||
      (mte && mte.classList.contains('visible')) ||
      (rdl && rdl.classList.contains('visible')) ||
      (rdd && rdd.classList.contains('visible')) ||
      (wpo && wpo.classList.contains('visible')) ||
      (tco && tco.classList.contains('visible')) ||
      (mso && mso.classList.contains('visible'));
    if (hide) document.body.dataset.pillHidden = '1';
    else delete document.body.dataset.pillHidden;
  }
  function _hubObservePillTriggers() {
    var ids = ['map-view', 'fav-view', 'modal-overlay', 'fav-edit-overlay',
               'hub-cmp-overlay', 'gar-overlay', 'gar-edit', 'fl-overlay', 'fl-edit',
               'ps-overlay', 'ps-detail', 'rd-overlay', 'mt-overlay', 'mt-edit',
               'rdl-overlay', 'rdl-detail', 'wp-overlay', 'tco-overlay', 'ms-overlay'];
    if (typeof MutationObserver === 'function') {
      var obs = new MutationObserver(_hubUpdatePillVisibility);
      ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
      });
      var lateRetry = setTimeout(function() {
        ['gar-overlay', 'gar-edit', 'fl-overlay', 'fl-edit',
         'ps-overlay', 'ps-detail', 'rd-overlay', 'mt-overlay', 'mt-edit',
         'rdl-overlay', 'rdl-detail', 'wp-overlay', 'tco-overlay', 'ms-overlay'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
      }, 600);
    }
    _hubUpdatePillVisibility();
  }
  // Esposta: gli altri moduli la richiamano all'apertura/chiusura dei propri overlay
  window._hubUpdatePillVisibility = _hubUpdatePillVisibility;
  document.addEventListener('DOMContentLoaded', _hubObservePillTriggers);

  /* ── #4 AUTO-LOCALIZE on map open (only if permission already granted) */
  function _hubAutoLocalize() {
    if (typeof window.openMapView !== 'function') return;
    var _origOpenMap = window.openMapView;
    window.openMapView = function() {
      var r = _origOpenMap.apply(this, arguments);
      // Only auto-trigger if user has previously granted geolocation
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then(function(s) {
          if (s.state === 'granted' && typeof window.mapLocateMe === 'function') {
            // small delay to let the map init first
            setTimeout(function() { try { window.mapLocateMe(); } catch(e){} }, 250);
          }
        }).catch(function() {});
      }
      return r;
    };
  }
  /* ── Export full app data as downloadable JSON ──────────────── */


  document.addEventListener('DOMContentLoaded', _hubAutoLocalize);

  /* ── Cache-buster patch + map auto-refresh ────────────────────
     Patches window.api() to inject ?_t=timestamp on /api/* calls so
     browser/CDN can never serve stale station data. Also forces a
     map reload if the user returns to the map view after >5 min. */
  function _hubPatchApi() {
    if (typeof window.api !== 'function' || window._hubApiPatched) return false;
    var _origApi = window.api;
    window.api = async function(path) {
      var p = String(path || '');
      if (p.indexOf('/api/') === 0) {
        p += (p.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now();
      }
      var r = await _origApi.call(this, p);
      // Track last fuel-data fetch time for the "Aggiornato HH:MM" badge
      window._hubLastApiFetch = Date.now();
      return r;
    };
    window._hubApiPatched = true;
    return true;
  }
  document.addEventListener('DOMContentLoaded', function() {
    var tries = 0;
    var iv = setInterval(function() {
      if (_hubPatchApi() || ++tries > 30) clearInterval(iv);
    }, 100);
  });

  /* Show "Aggiornato HH:MM" badge in map status after each successful fetch */
  function _hubInjectMapTimestamp() {
    if (typeof window.loadMapStations !== 'function') return false;
    if (window._hubMapTimestampPatched) return true;
    var _origLoad = window.loadMapStations;
    window.loadMapStations = async function() {
      var r = await _origLoad.apply(this, arguments);
      try {
        var status = document.getElementById('map-status');
        if (status && window._hubLastApiFetch) {
          var d = new Date(window._hubLastApiFetch);
          var hh = (d.getHours() < 10 ? '0' : '') + d.getHours();
          var mm = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
          var orig = status.textContent;
          // Only append if the load was a "found stations" success
          if (/impianti trovati/i.test(orig)) {
            status.textContent = orig + ' · agg. ' + hh + ':' + mm;
          }
        }
      } catch(_) {}
      return r;
    };
    window._hubMapTimestampPatched = true;
    return true;
  }
  document.addEventListener('DOMContentLoaded', function() {
    var tries = 0;
    var iv = setInterval(function() {
      if (_hubInjectMapTimestamp() || ++tries > 30) clearInterval(iv);
    }, 100);
  });

  /* Auto-refresh map on visibility change if data is >5 min old */
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) return;
    var mapView = document.getElementById('map-view');
    if (!mapView || !mapView.classList.contains('visible')) return;
    var last = window._hubLastApiFetch || 0;
    if (Date.now() - last < 5 * 60 * 1000) return;
    if (typeof window.loadMapStations === 'function') {
      try { window.loadMapStations(); } catch(_) {}
    }
  });

  /* ── FORCE REFRESH button: clears local caches and re-fetches ── */
  function _hubInjectRefreshBtn() {
    var bar = document.getElementById('update-bar');
    if (!bar) return false;
    if (document.getElementById('hub-force-refresh')) return true;
    var btn = document.createElement('button');
    btn.id = 'hub-force-refresh';
    btn.title = 'Forza aggiornamento dati';
    btn.setAttribute('aria-label', 'Forza aggiornamento');
    btn.innerHTML = '<span>↻</span>';
    btn.onclick = window.hubForceRefresh;
    bar.appendChild(btn);

    // Add stale-warning slot
    if (!document.getElementById('hub-stale-warn')) {
      var warn = document.createElement('div');
      warn.id = 'hub-stale-warn';
      warn.className = 'update-stale-msg';
      warn.style.display = 'none';
      bar.appendChild(warn);
    }
    _hubCheckStaleness();
    return true;
  }
  document.addEventListener('DOMContentLoaded', function() {
    // Inject when home is rendered (might be later than DOMContentLoaded)
    var tries = 0;
    var iv = setInterval(function() {
      if (_hubInjectRefreshBtn() || ++tries > 20) clearInterval(iv);
    }, 200);
  });

  function _hubCheckStaleness() {
    var lastEl = document.getElementById('last-update');
    var bar = document.getElementById('update-bar');
    var warn = document.getElementById('hub-stale-warn');
    if (!lastEl || !bar || !warn) return;
    // Parse the date shown by renderUpdateBar: "DD/MM/YYYY · estrazione MIMIT"
    var txt = lastEl.textContent || '';
    var m = txt.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return;
    var dataDate = new Date(+m[3], +m[2] - 1, +m[1]);
    var today = new Date(); today.setHours(0,0,0,0);
    var ageDays = Math.round((today - dataDate) / 86400000);
    if (ageDays >= 1) {
      bar.classList.add('has-stale-warning');
      warn.style.display = 'block';
      warn.textContent = '⚠ Dati di ' + ageDays + ' ' + (ageDays === 1 ? 'giorno' : 'giorni') +
        ' fa. Tap ↻ per ricaricare dal server.';
    } else {
      bar.classList.remove('has-stale-warning');
      warn.style.display = 'none';
    }
  }
  // Re-check periodically and after renderUpdateBar updates the DOM
  setInterval(_hubCheckStaleness, 30000);
  // Patch renderUpdateBar to re-trigger our check
  if (typeof window.renderUpdateBar === 'function') {
    var _origRender = window.renderUpdateBar;
    window.renderUpdateBar = function() {
      var r = _origRender.apply(this, arguments);
      try { _hubCheckStaleness(); } catch(_) {}
      return r;
    };
  } else {
    // It might not be defined yet when this script runs; wait and patch
    var pTries = 0;
    var pi = setInterval(function() {
      if (typeof window.renderUpdateBar === 'function') {
        var _o = window.renderUpdateBar;
        window.renderUpdateBar = function() {
          var r = _o.apply(this, arguments);
          try { _hubCheckStaleness(); } catch(_) {}
          return r;
        };
        clearInterval(pi);
      }
      if (++pTries > 30) clearInterval(pi);
    }, 200);
  }

  window.hubForceRefresh = async function() {
    var btn = document.getElementById('hub-force-refresh');
    if (!btn) return;
    btn.classList.add('spinning');
    try {
      // 1. Clear local caches
      try { localStorage.removeItem('hub_medie_cache_v1'); } catch(_) {}
      ['medie_cache','opf_medie_cache','last_medie','_lastMedie'].forEach(function(k) {
        try { localStorage.removeItem(k); } catch(_) {}
      });

      // 2. NUKE server-side cache: hit /api/refresh which forces a fresh
      //    MIMIT fetch on the Worker. Best-effort — if endpoint missing
      //    (older Worker version), skip silently.
      try {
        var workerBase = (typeof window.WORKER === 'string') ? window.WORKER
                        : 'https://osservaprezzi.gabrycois.workers.dev';
        await fetch(workerBase + '/api/refresh?_t=' + Date.now());
      } catch(_) { /* worker too old, ignore */ }

      // 3. Re-fetch via the fuel app's own loader (handles render + UI)
      if (typeof window.loadMedie === 'function') {
        var _origFetch = window.fetch;
        var patched = false;
        window.fetch = function(url, opts) {
          if (typeof url === 'string' && url.indexOf('/api/medie') >= 0) {
            url = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now();
            window.fetch = _origFetch;
            patched = true;
          }
          return _origFetch.call(this, url, opts);
        };
        try {
          await window.loadMedie();
        } finally {
          if (!patched) window.fetch = _origFetch;
        }
      }
      _hubCheckStaleness();
      btn.style.background = 'rgba(76,175,125,.25)';
      setTimeout(function() { btn.style.background = ''; }, 800);
    } catch (e) {
      console.error('[AutoHub] force refresh failed', e);
      alert('Aggiornamento fallito: ' + (e.message || e) +
            '\n\nSe il problema persiste, il server MIMIT potrebbe non aver pubblicato dati nuovi.');
    } finally {
      btn.classList.remove('spinning');
    }
  };

  /* ── #6 COMPARE FAVORITES OVERLAY ───────────────────────────── */
  function _hubInjectCompareUI() {
    if (document.getElementById('hub-cmp-overlay')) return;

    // 1. Inject compare button at the top of fav-view-body
    var favBody = document.getElementById('fav-view-body');
    if (favBody) {
      var btn = document.createElement('button');
      btn.id = 'hub-cmp-launch-btn';
      btn.className = 'cmp-launch';
      btn.innerHTML = '📊 Confronta prezzi tra i preferiti';
      btn.onclick = window.openCompareView;
      favBody.parentNode.insertBefore(btn, favBody);
    }

    // 2. Inject overlay container at end of #hub-fuel
    var hubFuel = document.getElementById('hub-fuel');
    if (!hubFuel) return;
    var overlay = document.createElement('div');
    overlay.id = 'hub-cmp-overlay';
    overlay.innerHTML =
      '<div class="hub-cmp-hdr">' +
        '<h2>Confronto<small>Preferiti per carburante</small></h2>' +
        '<button class="btn-close-map" onclick="closeCompareView()">✕ Chiudi</button>' +
      '</div>' +
      '<div class="hub-cmp-tabs" id="hub-cmp-tabs"></div>' +
      '<div class="hub-cmp-body" id="hub-cmp-body"></div>';
    hubFuel.appendChild(overlay);
  }
  document.addEventListener('DOMContentLoaded', _hubInjectCompareUI);

  // Hide button if no favs (toggled when fav-view opens)
  function _hubSyncCompareBtn() {
    var btn = document.getElementById('hub-cmp-launch-btn');
    if (!btn) return;
    var favs = (typeof loadFavs === 'function') ? loadFavs() : [];
    btn.hidden = favs.length < 2;
  }

  window.openCompareView = function() {
    _hubInjectCompareUI();
    var ov = document.getElementById('hub-cmp-overlay');
    if (!ov) return;
    ov.classList.add('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
    var tabsEl = document.getElementById('hub-cmp-tabs');
    if (tabsEl && !tabsEl._hubWired) {
      tabsEl.addEventListener('click', function(ev) {
        var t = ev.target.closest('.hub-cmp-tab');
        if (!t) return;
        _cmpFuel = t.dataset.fuel;
        _renderCompare();
      });
      tabsEl._hubWired = true;
    }
    _renderCompare();
  };
  window.closeCompareView = function() {
    var ov = document.getElementById('hub-cmp-overlay');
    if (ov) ov.classList.remove('visible');
    if (typeof _hubUpdatePillVisibility === 'function') _hubUpdatePillVisibility();
  };

  function _renderCompare() {
    var tabsEl = document.getElementById('hub-cmp-tabs');
    var bodyEl = document.getElementById('hub-cmp-body');
    if (!tabsEl || !bodyEl) return;

    var favs = (typeof loadFavs === 'function') ? loadFavs() : [];

    // Group by carburante
    var byFuel = {};
    favs.forEach(function(f) {
      var k = f.carburante || 'Altro';
      if (!byFuel[k]) byFuel[k] = [];
      byFuel[k].push(f);
    });
    var fuels = Object.keys(byFuel).sort(function(a, b) { return byFuel[b].length - byFuel[a].length; });

    if (fuels.length === 0) {
      tabsEl.innerHTML = '';
      bodyEl.innerHTML = '<div class="hub-cmp-empty">Nessun preferito da confrontare.<br>Aggiungi almeno 2 stazioni ai preferiti per usare il confronto.</div>';
      return;
    }

    // Default selected fuel: first in list (most populated) if not set or invalid
    if (!_cmpFuel || fuels.indexOf(_cmpFuel) < 0) _cmpFuel = fuels[0];

    // Render tabs
    tabsEl.innerHTML = fuels.map(function(f) {
      var on = f === _cmpFuel ? ' on' : '';
      return '<button class="hub-cmp-tab' + on + '" data-fuel="' + escSafe(f) + '">' +
        escSafe(f) + '<span class="hub-cmp-tab-n">(' + byFuel[f].length + ')</span></button>';
    }).join('');
    // Wire tab clicks (delegation handled below via single listener)

    // Get rows for selected fuel, sorted by price asc
    var rows = byFuel[_cmpFuel].slice().filter(function(f) {
      return typeof f.prezzo === 'number' && !isNaN(f.prezzo);
    });
    rows.sort(function(a, b) { return a.prezzo - b.prezzo; });

    if (rows.length === 0) {
      bodyEl.innerHTML = '<div class="hub-cmp-empty">Nessun preferito con prezzo per ' + escSafe(_cmpFuel) + '.</div>';
      return;
    }

    var bestPrice = rows[0].prezzo;
    var unit = String(_cmpFuel).toLowerCase().indexOf('metano') >= 0 ? 'kg' : 'lt';

    bodyEl.innerHTML = rows.map(function(f, i) {
      var name = f.customName || f.nome || 'Distributore';
      var diff = f.prezzo - bestPrice;
      var diffStr = i === 0 ? '— (più economico)' : '+' + diff.toFixed(3) + ' €/' + unit;
      var rank = i === 0 ? '🏆' : (i + 1);
      var meta = [];
      if (f.bandiera) meta.push('<span class="hub-cmp-meta-tag">' + escSafe(f.bandiera) + '</span>');
      if (typeof f.isSelf === 'boolean') meta.push('<span class="hub-cmp-meta-tag">' + (f.isSelf ? 'self' : 'servito') + '</span>');
      if (f.comune) meta.push('<span>' + escSafe(f.comune) + '</span>');
      return '<div class="hub-cmp-row' + (i === 0 ? ' hub-cmp-best' : '') + '">' +
        '<div class="hub-cmp-rank">' + rank + '</div>' +
        '<div class="hub-cmp-info">' +
          '<div class="hub-cmp-name">' + escSafe(name) + '</div>' +
          '<div class="hub-cmp-meta">' + meta.join('') + '</div>' +
        '</div>' +
        '<div class="hub-cmp-price">' +
          '<div class="hub-cmp-price-val">' + f.prezzo.toFixed(3) + '</div>' +
          '<div class="hub-cmp-diff">' + diffStr + '</div>' +
          (f.dtComu ? '<div class="hub-cmp-date">' + escSafe(f.dtComu) + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  // Re-sync compare button visibility when favs change or fav-view opens
  if (typeof window.saveFavs === 'function') {
    var _origSaveFavs2 = window.saveFavs;
    window.saveFavs = function(favs) {
      var r = _origSaveFavs2.apply(this, arguments);
      try { _hubSyncCompareBtn(); } catch(e) {}
      return r;
    };
  }
  if (typeof window.openFavView === 'function') {
    var _origOpenFav = window.openFavView;
    window.openFavView = function() {
      var r = _origOpenFav.apply(this, arguments);
      _hubInjectCompareUI();
      _hubSyncCompareBtn();
      return r;
    };
  }
})();

