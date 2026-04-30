/**
 * SDR — Módulo KMZ/KML Import
 * Fase 11: importação de arquivos KMZ/KML com preview e mapeamento de cores
 *
 * Depende (via window, disponível em runtime):
 *   window.sdrMap, window.sdrRef, window.sdrMapReloadData,
 *   window._haversineM, window._matchKMZColor,
 *   window.SDR_FIBER_STANDARDS, window.SDR_CABLE_COLOR_MAP,
 *   window.SDR_CTO_COLOR_MAP, window.INFRA_TYPES
 *   toast (global em admin.html), JSZip (global CDN), L (Leaflet global)
 */

// ── Estado ────────────────────────────────────────────────────────────────
window._sdrKMZFeatures = [];
let _sdrKMZLayer       = null; // layer group do preview no mapa

// ── Helpers de cor de fibra (padrão atual via localStorage) ───────────────
function _getSdrFiberStd() {
  return localStorage.getItem('sdr_fiber_standard') || 'abnt';
}

function _fiberColors() {
  var std = window.SDR_FIBER_STANDARDS && window.SDR_FIBER_STANDARDS[_getSdrFiberStd()];
  return std ? std.fibers.map(function(f){ return f.color; }) : [];
}

function _fiberNames() {
  var std = window.SDR_FIBER_STANDARDS && window.SDR_FIBER_STANDARDS[_getSdrFiberStd()];
  return std ? std.fibers.map(function(f){ return f.name; }) : [];
}

function _tubeColors(numTubes) {
  numTubes = numTubes || 12;
  var std = window.SDR_FIBER_STANDARDS && window.SDR_FIBER_STANDARDS[_getSdrFiberStd()];
  var result = [];
  for (var i = 1; i <= numTubes; i++) {
    result.push(std ? std.tubeColor(i).color : '#64748b');
  }
  return result;
}

// ── Abre o file picker ────────────────────────────────────────────────────
window.sdrImportKMZ = function() {
  var inp = document.getElementById('kmz-file-input');
  if (inp) { inp.value = ''; inp.click(); }
};

// ── Lê o arquivo KMZ ou KML selecionado ──────────────────────────────────
window.sdrHandleKMZFile = async function(input) {
  var file = input.files[0];
  if (!file) return;
  toast('Lendo arquivo...', 'info');
  try {
    var kmlText;
    if (file.name.toLowerCase().endsWith('.kmz')) {
      var zip = await JSZip.loadAsync(file);
      var kmlFile = zip.file('doc.kml') || zip.file(/\.kml$/i)[0];
      if (!kmlFile) throw new Error('KML não encontrado dentro do KMZ');
      kmlText = await kmlFile.async('text');
    } else {
      kmlText = await file.text();
    }
    var features = _parseKML(kmlText);
    if (features.length === 0) { toast('Nenhum elemento encontrado', 'error'); return; }
    window._sdrKMZFeatures = features;
    _sdrKMZPreviewModal(features, file.name);
  } catch(e) {
    toast('Erro: ' + e.message, 'error');
    console.error('[KMZ]', e);
  }
};

// ── Converte cor KML (aabbggrr) → hex CSS (#rrggbb) ──────────────────────
function _kmlColor(kmlHex) {
  if (!kmlHex || kmlHex.length < 8) return null;
  return '#' + kmlHex.slice(6,8) + kmlHex.slice(4,6) + kmlHex.slice(2,4);
}

// ── Parse KML → array de features {type, name, lat/lng ou route, color} ──
function _parseKML(kmlText) {
  var doc      = new DOMParser().parseFromString(kmlText, 'text/xml');
  var features = [], styleMap = {};

  doc.querySelectorAll('Style[id]').forEach(function(s) {
    var id = '#' + s.getAttribute('id');
    var lc = s.querySelector('LineStyle color')  ? s.querySelector('LineStyle color').textContent.trim()  : null;
    var ic = s.querySelector('IconStyle color')  ? s.querySelector('IconStyle color').textContent.trim()  : null;
    styleMap[id] = { line: lc ? _kmlColor(lc) : null, icon: ic ? _kmlColor(ic) : null };
  });

  doc.querySelectorAll('StyleMap[id]').forEach(function(sm) {
    var id = '#' + sm.getAttribute('id');
    sm.querySelectorAll('Pair').forEach(function(p) {
      var keyEl = p.querySelector('key');
      if (keyEl && keyEl.textContent === 'normal') {
        var urlEl = p.querySelector('styleUrl');
        var url   = urlEl ? urlEl.textContent.trim() : null;
        if (url && styleMap[url]) { styleMap[id] = styleMap[url]; }
      }
    });
  });

  function featureColor(pm) {
    var urlEl = pm.querySelector('styleUrl');
    var ref   = urlEl ? urlEl.textContent.trim() : null;
    if (ref && styleMap[ref]) return styleMap[ref].line || styleMap[ref].icon;
    var lc = pm.querySelector('LineStyle color') ? pm.querySelector('LineStyle color').textContent.trim() : null;
    var ic = pm.querySelector('IconStyle color') ? pm.querySelector('IconStyle color').textContent.trim() : null;
    return lc ? _kmlColor(lc) : (ic ? _kmlColor(ic) : null);
  }
  function getDesc(pm) {
    var el = pm.querySelector('description');
    return el ? el.textContent.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() : '';
  }
  function getExt(pm) {
    var d = {};
    pm.querySelectorAll('ExtendedData Data').forEach(function(el){
      var v = el.querySelector('value'); d[el.getAttribute('name')] = v ? v.textContent.trim() : '';
    });
    pm.querySelectorAll('SimpleData').forEach(function(el){
      d[el.getAttribute('name')] = el.textContent.trim();
    });
    return d;
  }

  doc.querySelectorAll('Placemark').forEach(function(pm) {
    var name  = (pm.querySelector('name') ? pm.querySelector('name').textContent : '').trim();
    var desc  = getDesc(pm), ext = getExt(pm), color = featureColor(pm);
    var ptEl  = pm.querySelector('Point > coordinates');
    if (ptEl) {
      var coords = ptEl.textContent.trim().split(',').map(parseFloat);
      var lng = coords[0], lat = coords[1];
      if (!isNaN(lat) && !isNaN(lng)) features.push({type:'point',name,desc,ext,lat,lng,color});
      return;
    }
    pm.querySelectorAll('LineString > coordinates').forEach(function(el) {
      var route = el.textContent.trim().split(/\s+/).map(function(s) {
        var p = s.split(',').map(parseFloat);
        return {lat: p[1], lng: p[0]};
      }).filter(function(p){ return !isNaN(p.lat) && !isNaN(p.lng); });
      if (route.length >= 2) features.push({type:'line',name,desc,ext,route,color});
    });
  });
  return features;
}

// ── Modal de preview e mapeamento de cores ────────────────────────────────
function _sdrKMZPreviewModal(features, filename) {
  var sdrMap = window.sdrMap;
  var points = features.filter(function(f){ return f.type === 'point'; });
  var lines  = features.filter(function(f){ return f.type === 'line';  });

  var lineColors = {}, pointColors = {};
  lines.forEach(function(f){  if (f.color) lineColors[f.color]  = (lineColors[f.color]  || 0) + 1; });
  points.forEach(function(f){ if (f.color) pointColors[f.color] = (pointColors[f.color] || 0) + 1; });

  // Preview no mapa
  if (_sdrKMZLayer && sdrMap) sdrMap.removeLayer(_sdrKMZLayer);
  _sdrKMZLayer = L.layerGroup().addTo(sdrMap);
  lines.forEach(function(f){
    L.polyline(f.route.map(function(p){ return [p.lat,p.lng]; }), {color:f.color||'#f59e0b',weight:2,opacity:0.8}).addTo(_sdrKMZLayer);
  });
  points.forEach(function(f){
    L.circleMarker([f.lat,f.lng], {radius:5,color:f.color||'#f59e0b',fillColor:f.color||'#f59e0b',fillOpacity:1}).addTo(_sdrKMZLayer);
  });
  var allPts = points.map(function(f){ return [f.lat,f.lng]; }).concat(
    lines.reduce(function(a,f){ return a.concat(f.route.map(function(p){ return [p.lat,p.lng]; })); }, [])
  );
  if (allPts.length > 0) { try { sdrMap.fitBounds(L.latLngBounds(allPts).pad(0.1)); } catch(e){} }

  var matchColor = typeof window._matchKMZColor === 'function' ? window._matchKMZColor : function(){ return null; };
  var cableCM    = window.SDR_CABLE_COLOR_MAP || [];
  var ctoCM      = window.SDR_CTO_COLOR_MAP   || [];

  function lineColorRows() {
    var entries = Object.entries(lineColors);
    if (!entries.length) return '';
    return '<div style="background:#f0fdf4;border-radius:10px;padding:14px;margin-bottom:12px">'
      + '<div style="font-weight:600;font-size:.88rem;color:#166534;margin-bottom:8px"><i class="fas fa-wave-square" style="margin-right:6px"></i>Cores dos Cabos (' + lines.length + ' linhas)</div>'
      + entries.map(function(entry, i) {
          var c = entry[0], n = entry[1];
          var match  = matchColor(c, cableCM);
          var defVal = match ? (match.cabo + ':' + match.fibers) : 'distribuicao:12';
          return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">'
            + '<div style="width:30px;height:12px;background:' + c + ';border-radius:3px;border:1px solid #e5e7eb;flex-shrink:0"></div>'
            + '<span style="font-size:.78rem;color:#374151;min-width:70px">' + n + ' cabo(s)</span>'
            + '<select id="clr-line-' + i + '" data-color="' + c + '" style="flex:1;padding:5px 7px;border:1px solid #d1d5db;border-radius:6px;font-size:.78rem">'
              + ['distribuicao:12','distribuicao:6','distribuicao:24','backbone:36','backbone:48','backbone:72','backbone:144','projeto:0'].map(function(v){
                  var label = v === 'distribuicao:12' ? 'Distribuição 12FO'
                    : v === 'distribuicao:6'  ? 'Distribuição 6FO'
                    : v === 'distribuicao:24' ? 'Distribuição 24FO'
                    : v === 'backbone:36'     ? 'Backbone 36FO'
                    : v === 'backbone:48'     ? 'Backbone 48FO'
                    : v === 'backbone:72'     ? 'Backbone 72FO'
                    : v === 'backbone:144'    ? 'Backbone 144FO' : 'Projeto';
                  return '<option value="' + v + '"' + (defVal === v ? ' selected' : '') + '>' + label + '</option>';
                }).join('')
            + '</select>'
            + '<select id="clr-inst-' + i + '" style="padding:5px 7px;border:1px solid #d1d5db;border-radius:6px;font-size:.78rem">'
              + '<option value="aereo">Aéreo</option><option value="subterraneo">Subterrâneo</option>'
            + '</select>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  function pointColorRows() {
    var entries = Object.entries(pointColors);
    if (!entries.length) return '';
    return '<div style="background:#eff6ff;border-radius:10px;padding:14px;margin-bottom:12px">'
      + '<div style="font-weight:600;font-size:.88rem;color:#1d4ed8;margin-bottom:8px"><i class="fas fa-map-pin" style="margin-right:6px"></i>Cores dos Pontos (' + points.length + ' pontos)</div>'
      + entries.map(function(entry, i) {
          var c = entry[0], n = entry[1];
          var match = matchColor(c, ctoCM);
          var opts = [
            ['cto:1/16:16','CTO 1/16 (16 portas)'],['cto:1/8:8','CTO 1/8 (8 portas)'],
            ['cto:1/4:4','CTO 1/4 (4 portas)'],['cto:splitter:8','CTO c/ Splitter'],
            ['cto:nao_instalada:16','Não Instalada'],['cto:emenda:0','Emenda'],
            ['cto:ceo:16','CEO (Cx. Emenda Óptica)'],['cto:rt:0','RT (Reserva de Cabo)'],
            ['pole:pole:0','Poste'],['splitter:splitter:0','Splitter']
          ];
          return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">'
            + '<div style="width:16px;height:16px;background:' + c + ';border-radius:50%;border:2px solid ' + (c === '#ffffff' ? '#aaa' : '#e5e7eb') + ';flex-shrink:0"></div>'
            + '<span style="font-size:.78rem;color:#374151;min-width:70px">' + n + ' ponto(s)</span>'
            + '<select id="clr-pt-' + i + '" data-color="' + c + '" style="flex:1;padding:5px 7px;border:1px solid #d1d5db;border-radius:6px;font-size:.78rem">'
              + opts.map(function(o){
                  var sel = match && ('cto:' + match.cto_type + ':' + match.ports) === o[0] ? ' selected' : '';
                  return '<option value="' + o[0] + '"' + sel + '>' + o[1] + '</option>';
                }).join('')
            + '</select></div>';
        }).join('')
      + '</div>';
  }

  var existing = document.getElementById('modal-kmz-import');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'modal-kmz-import';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
    + '<div style="padding:16px 22px;border-bottom:1px solid #e5e7eb;background:#f8fafc;display:flex;justify-content:space-between;align-items:center">'
      + '<div><div style="font-weight:700;font-size:1rem;color:#1e293b"><i class="fas fa-file-import" style="color:#f59e0b;margin-right:8px"></i>Importar: ' + filename + '</div>'
      + '<div style="font-size:.78rem;color:#64748b;margin-top:2px"><b>' + points.length + '</b> pontos • <b>' + lines.length + '</b> cabos detectados</div></div>'
      + '<button onclick="window.sdrKMZCancelImport()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#64748b">✕</button>'
    + '</div>'
    + '<div style="padding:16px 22px;overflow-y:auto;flex:1">'
      + '<div style="background:#fef3c7;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:.8rem;color:#92400e"><i class="fas fa-magic" style="margin-right:5px"></i>Cores detectadas automaticamente. Confirme o mapeamento.</div>'
      + lineColorRows()
      + pointColorRows()
    + '</div>'
    + '<div style="padding:13px 22px;border-top:1px solid #e5e7eb;background:#f8fafc;display:flex;gap:9px;justify-content:flex-end">'
      + '<button onclick="window.sdrKMZCancelImport()" style="padding:8px 18px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:.85rem">Cancelar</button>'
      + '<button onclick="window.sdrKMZConfirmImport()" style="padding:8px 20px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600"><i class="fas fa-check"></i> Importar ' + features.length + ' elementos</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

// ── Cancela o import e remove o preview ───────────────────────────────────
window.sdrKMZCancelImport = function() {
  var el = document.getElementById('modal-kmz-import');
  if (el) el.remove();
  if (_sdrKMZLayer && window.sdrMap) { window.sdrMap.removeLayer(_sdrKMZLayer); _sdrKMZLayer = null; }
};

// ── Confirma o import → salva tudo no Firebase ───────────────────────────
window.sdrKMZConfirmImport = async function() {
  var features   = window._sdrKMZFeatures || [];
  var hav        = window._haversineM;
  var matchColor = typeof window._matchKMZColor === 'function' ? window._matchKMZColor : function(){ return null; };
  var INFRA_TYPES = window.INFRA_TYPES || {};

  // Coleta mapeamentos de linha
  var lineMap = {};
  document.querySelectorAll('[id^="clr-line-"]').forEach(function(sel) {
    var c = sel.dataset.color, parts = sel.value.split(':');
    var idx = sel.id.split('-')[2];
    var instEl = document.getElementById('clr-inst-' + idx);
    lineMap[c] = { cable_type: parts[0], fiber_count: parseInt(parts[1]) || 12, installation: instEl ? instEl.value : 'aereo' };
  });

  // Coleta mapeamentos de ponto
  var ptMap = {};
  document.querySelectorAll('[id^="clr-pt-"]').forEach(function(sel) {
    var c = sel.dataset.color, parts = sel.value.split(':');
    ptMap[c] = { type: parts[0], cto_type: parts[1], total_ports: parseInt(parts[2]) || 8 };
  });

  var el = document.getElementById('modal-kmz-import');
  if (el) el.remove();
  if (_sdrKMZLayer && window.sdrMap) { window.sdrMap.removeLayer(_sdrKMZLayer); _sdrKMZLayer = null; }
  toast('Importando ' + features.length + ' elementos...', 'info');

  var updates = {};
  var now = Date.now();
  features.forEach(function(f, i) {
    var id = 'kmz_' + now + '_' + i;
    if (f.type === 'point') {
      var map = (f.color && ptMap[f.color]) || { type:'cto', cto_type:'default', total_ports:8 };
      var rec = {
        type: map.type,
        name: f.name || ((INFRA_TYPES[map.type] && INFRA_TYPES[map.type].label) || 'Item') + ' ' + (i+1),
        lat: f.lat, lng: f.lng,
        kmz_color: f.color || null,
        source: 'kmz_import',
        created_at: now
      };
      if (map.type === 'cto') { rec.cto_type = map.cto_type; rec.total_ports = map.total_ports; rec.used_ports = 0; rec.portas = {}; }
      if (f.desc) rec.kmz_desc = f.desc;
      if (f.ext && Object.keys(f.ext).length) rec.kmz_ext = f.ext;
      updates[id] = rec;
    } else if (f.type === 'line') {
      var lmap = (f.color && lineMap[f.color]) || { cable_type:'distribuicao', fiber_count:12, installation:'aereo' };
      var dist = 0;
      if (typeof hav === 'function') {
        for (var k = 1; k < f.route.length; k++) dist += hav(f.route[k-1], f.route[k]);
      }
      updates[id] = {
        type: 'cable', cable_type: lmap.cable_type, installation: lmap.installation,
        fiber_count: lmap.fiber_count, name: f.name || 'Cabo ' + (i+1),
        route: f.route, length_m: Math.round(dist),
        kmz_color: f.color || null, kmz_desc: f.desc || null,
        source: 'kmz_import', created_at: now
      };
    }
  });

  try {
    await window.sdrRef('infrastructure').update(updates);
    toast('✅ ' + features.length + ' elementos importados!', 'success');
    if (typeof window.sdrMapReloadData === 'function') window.sdrMapReloadData();
  } catch(e) {
    toast('Erro: ' + e.message, 'error');
  }
};

// ── Expor utilitários de fibra para outros módulos ────────────────────────
window._fiberColors = _fiberColors;
window._fiberNames  = _fiberNames;
window._tubeColors  = _tubeColors;

console.log('[SDR Bundle] map/kmz.js carregado — KMZ/KML import + fiber color helpers OK');
