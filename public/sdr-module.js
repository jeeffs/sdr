// SDR MODULE — Auto-inject HTML + hook into admin.html
(function _sdrBootstrap() {
  var mainEl = document.getElementById('main');
  if (!mainEl) { console.warn('[SDR] #main not found, retry in 500ms'); setTimeout(_sdrBootstrap, 500); return; }

  if (!document.getElementById('page-mapa')) {
    var pageDiv = document.createElement('div');
    pageDiv.id = 'page-mapa';
    pageDiv.className = 'page';
    pageDiv.style.cssText = 'padding:0;height:calc(100vh - 56px);display:flex;flex-direction:column';
    pageDiv.innerHTML = '<div class="sdr-toolbar">'
      + '<div class="tb-group">'
      + '<button class="btn-map" onclick="sdrInfraAdd()" style="padding:6px 10px;font-size:.78rem"><i class="fas fa-plus"></i> Adicionar</button>'
      + '<button class="btn-map" onclick="sdrMapReloadData()" style="padding:6px 10px" title="Recarregar dados"><i class="fas fa-sync-alt"></i></button>'
      + '</div>'
      + '<div class="tb-sep"></div>'
      + '<div class="tb-group">'
      + '<button class="btn-map" onclick="sdrImportKMZ()" style="background:#f59e0b;color:#fff;border-color:#d97706;padding:6px 10px;font-size:.78rem"><i class="fas fa-file-import"></i> KMZ</button>'
      + '<button class="btn-map" id="btn-draw-mode" onclick="sdrDrawModeToggle()" style="padding:6px 10px;font-size:.78rem"><i class="fas fa-pencil-alt"></i> Desenhar</button>'
      + '<button class="btn-map" id="btn-viabilidade" onclick="sdrViabilidadeToggle()" style="padding:6px 10px;font-size:.78rem" title="Verificar viabilidade comercial (CTOs próximas + power budget)"><i class="fas fa-search-location"></i> Viabilidade</button>'
      + '</div>'
      + '<div style="flex:1"></div>'
      + '<div class="tb-group">'
      + '<button class="btn-map" onclick="sdrShowFiberStandardModal()" style="padding:4px 8px;font-size:.7rem;background:#f0f9ff;border-color:#bae6fd" title="Padrão de Cores"><i class="fas fa-palette"></i> <span id="fiber-std-label">' + (localStorage.getItem('sdr_fiber_standard')==='tia'?'TIA':'ABNT') + '</span></button>'
      + '<div class="tb-sep"></div>'
      + '<button class="btn-map" onclick="sdrMapChangeBase(\'streets\')" style="padding:4px 8px;font-size:.7rem" title="Mapa de Rua"><i class="fas fa-road"></i></button>'
      + '<button class="btn-map" onclick="sdrMapChangeBase(\'satellite\')" style="padding:4px 8px;font-size:.7rem" title="Satélite"><i class="fas fa-satellite"></i></button>'
      + '<button class="btn-map" onclick="sdrMapChangeBase(\'dark\')" style="padding:4px 8px;font-size:.7rem" title="Modo Escuro"><i class="fas fa-moon"></i></button>'
      + '</div>'
      + '<input type="file" id="kmz-file-input" accept=".kmz,.kml" style="display:none" onchange="sdrHandleKMZFile(this)">'
      + '</div>'
      + '<div style="flex:1;display:flex;position:relative">'
      + '<div id="sdr-map" style="flex:1;z-index:1"></div>'
      + '<div id="map-info" style="width:260px;min-width:260px;background:#1e293b;color:#e2e8f0;padding:12px;overflow-y:auto;font-size:.78rem;position:relative;transition:width .22s ease,min-width .22s ease,padding .22s ease">'
      + '<button id="map-info-toggle" onclick="sdrMapInfoToggle()" title="Minimizar painel" style="position:absolute;top:50%;left:-14px;transform:translateY(-50%);width:26px;height:26px;background:#1a6fc4;border:2px solid rgba(255,255,255,.7);border-radius:50%;color:#fff;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;font-size:.65rem;box-shadow:0 2px 8px rgba(0,0,0,.35);padding:0;transition:background .15s"><i id="map-info-chev" class="fas fa-chevron-right" style="transition:transform .22s ease"></i></button>'
      + '<div id="map-info-body">'
      + '<div style="font-weight:700;margin-bottom:8px;color:#38bdf8"><i class="fas fa-info-circle"></i> Resumo</div>'
      + '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">'
      + '<div style="display:flex;justify-content:space-between"><span><i class="fas fa-bolt" style="color:#d97706;width:18px"></i> Postes</span><b id="mi-poles">0</b></div>'
      + '<div style="display:flex;justify-content:space-between"><span><i class="fas fa-box" style="color:#2563eb;width:18px"></i> CTOs</span><b id="mi-ctos">0</b></div>'
      + '<div style="display:flex;justify-content:space-between"><span><i class="fas fa-wave-square" style="color:#16a34a;width:18px"></i> Cabos</span><b id="mi-cables">0</b></div>'
      + (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'master' ? '<div style="display:flex;justify-content:space-between"><span><i class="fas fa-user" style="color:#0ea5e9;width:18px"></i> Clientes</span><b id="mi-clients">0</b></div>' : '')
      + '<div style="display:flex;justify-content:space-between"><span><i class="fas fa-server" style="color:#dc2626;width:18px"></i> OLTs</span><b id="mi-olts">0</b></div>'
      + '</div>'
      + '<div style="font-weight:700;margin-bottom:8px;color:#38bdf8"><i class="fas fa-layer-group"></i> Camadas</div>'
      + '<div style="display:flex;flex-direction:column;gap:4px">'
      + '<button id="ml-poles" class="btn-map active" onclick="sdrMapToggleLayer(\'poles\')" style="padding:4px 8px;font-size:.72rem;text-align:left"><i class="fas fa-bolt"></i> Postes</button>'
      + '<button id="ml-ctos" class="btn-map active" onclick="sdrMapToggleLayer(\'ctos\')" style="padding:4px 8px;font-size:.72rem;text-align:left"><i class="fas fa-box"></i> CTOs</button>'
      + '<button id="ml-cables" class="btn-map active" onclick="sdrMapToggleLayer(\'cables\')" style="padding:4px 8px;font-size:.72rem;text-align:left"><i class="fas fa-wave-square"></i> Cabos</button>'
      + '<button id="ml-clients" class="btn-map active" onclick="sdrMapToggleLayer(\'clients\')" style="padding:4px 8px;font-size:.72rem;text-align:left"><i class="fas fa-user"></i> Clientes</button>'
      + '<button id="ml-olts" class="btn-map" onclick="sdrMapToggleLayer(\'olts\')" style="padding:4px 8px;font-size:.72rem;text-align:left"><i class="fas fa-server"></i> OLTs</button>'
      + '<button id="ml-heatmap" class="btn-map" onclick="sdrMapToggleLayer(\'heatmap\')" style="padding:4px 8px;font-size:.72rem;text-align:left"><i class="fas fa-fire"></i> Heatmap</button>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '<div id="sdr-side-panel" style="position:absolute;top:0;right:0;width:340px;height:100%;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,.15);z-index:500;overflow-y:auto;transform:translateX(100%);transition:transform .3s ease">'
      + '<div style="padding:14px 16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">'
      + '<h4 id="sp-title" style="margin:0;font-size:.95rem;color:#1e293b">Detalhes</h4>'
      + '<button onclick="sdrCloseSidePanel()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#94a3b8;padding:0 4px">&times;</button>'
      + '</div>'
      + '<div id="sp-body" style="padding:14px 16px"></div>'
      + '</div>'
      + '</div>';
    mainEl.appendChild(pageDiv);
  }

  // Injetar paginas SDR no #main
  var _sdrPageList = ['dash-rede','clientes','olts','onus','alertas','tickets','mk-config'];
  _sdrPageList.forEach(function(pgId) {
    if (!document.getElementById('page-' + pgId)) {
      var d = document.createElement('div');
      d.id = 'page-' + pgId;
      d.className = 'page';
      d.style.cssText = 'padding:20px;overflow-y:auto;height:calc(100vh - 56px)';
      var fn = window['_sdrHtml_' + pgId.replace(/-/g,'_')];
      d.innerHTML = fn ? fn() : '<div style="padding:40px;text-align:center">Carregando...</div>';
      mainEl.appendChild(d);
    }
  });
  if (typeof PAGES !== 'undefined' && PAGES.master) {
    var _sdrMenuItems = [
      {id:'dash-rede', icon:'fa-chart-bar',     label:'Dashboard Rede'},
      {id:'mapa',      icon:'fa-network-wired', label:'Mapa de Rede'},
      {id:'clientes',  icon:'fa-users',         label:'Clientes'},
      {id:'olts',      icon:'fa-server',        label:'OLTs'},
      {id:'onus',      icon:'fa-router',        label:'ONUs'},
      {id:'alertas',   icon:'fa-bell',          label:'Alertas'},
      {id:'tickets',   icon:'fa-ticket-alt',    label:'Chamados'},
      {id:'mk-config', icon:'fa-plug',          label:'Integração MK'}
    ];
    _sdrMenuItems.forEach(function(item) {
      if (!PAGES.master.find(function(p){ return p.id === item.id; })) {
        PAGES.master.push(item);
      }
    });
    // Adicionar Mapa de Rede para todos os perfis (user, fiscal, observador)
    var _mapaItem = {id:'mapa', icon:'fa-network-wired', label:'Mapa de Rede'};
    ['user','fiscal','observador'].forEach(function(perfil) {
      if (PAGES[perfil] && !PAGES[perfil].find(function(p){ return p.id === 'mapa'; })) {
        PAGES[perfil].push(_mapaItem);
      }
    });
  }
  if (typeof PAGE_TITLES !== 'undefined') {
    PAGE_TITLES['mapa']      = 'Mapa de Rede \u2014 Infraestrutura FTTH';
    PAGE_TITLES['dash-rede'] = 'Dashboard de Rede';
    PAGE_TITLES['clientes']  = 'Clientes FTTH';
    PAGE_TITLES['olts']      = 'OLTs \u2014 Rede \u00d3ptica';
    PAGE_TITLES['onus']      = 'ONUs \u2014 Terminais de Cliente';
    PAGE_TITLES['alertas']   = 'Alertas de Rede';
    PAGE_TITLES['tickets']   = 'Chamados de Suporte';
    PAGE_TITLES['mk-config'] = 'Integração MK Solutions';
  }
  if (typeof showPage === 'function' && !showPage._sdrPatched) {
    var _origShowPage = showPage;
    var _sdrFullViewportPages = { mapa:1, olts:1 };
    window.showPage = function(name) {
      _origShowPage(name);
      // Gerenciar overflow do body: full-viewport pages (mapa/olts) não usam scroll externo
      document.body.style.overflowY = _sdrFullViewportPages[name] ? 'hidden' : '';
      // Timing fix: reinjetar HTML SDR se bootstrap rodou antes de _sdrHtml_* serem definidas
      var _pgEl = document.getElementById('page-' + name);
      var _pgFn = window['_sdrHtml_' + name.replace(/-/g,'_')];
      if (_pgEl && _pgFn && _pgEl.innerHTML.indexOf('Carregando') !== -1) _pgEl.innerHTML = _pgFn();
      if (name === 'mapa'      && typeof sdrMapInit        === 'function') sdrMapInit();
      if (name === 'dash-rede' && typeof sdrDashRedeRender === 'function') sdrDashRedeRender();
      if (name === 'clientes'  && typeof sdrClientesRender === 'function') sdrClientesRender();
      if (name === 'olts'      && typeof sdrOltsRender     === 'function') sdrOltsRender();
      if (name === 'onus'      && typeof sdrOnusRender     === 'function') sdrOnusRender();
      if (name === 'alertas'   && typeof sdrAlertasRender  === 'function') sdrAlertasRender();
      if (name === 'tickets'   && typeof sdrTicketsRender  === 'function') sdrTicketsRender();
      if (name === 'mk-config' && typeof sdrMkConfigRender === 'function') sdrMkConfigRender();
    };
    window.showPage._sdrPatched = true;
  }
  if (typeof buildSidebar === 'function' && typeof currentUser !== 'undefined' && currentUser) {
    buildSidebar();
  }
})();




// Fix: ensure page-mapa responds to .active class like other pages
(function(){
  var style = document.createElement('style');
  style.textContent = `
#page-mapa { display:none !important; }
#page-mapa.active { display:flex !important; }
#sdr-side-panel.open { transform:translateX(0) !important; }

/* CTO Marker Styles */
.cto-marker {
  display:flex; flex-direction:column; align-items:center; gap:1px;
  font-family:'Segoe UI',system-ui,sans-serif; cursor:pointer;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
  transition: transform 0.15s ease;
}
.cto-marker:hover { transform:scale(1.15); z-index:9999!important; }

.cto-marker .cto-box {
  display:flex; align-items:center; gap:3px;
  padding:2px 5px; border-radius:4px;
  border:1.5px solid rgba(255,255,255,0.9);
  font-size:10px; font-weight:700; line-height:1.1;
  white-space:nowrap; color:#fff;
  min-width:28px; justify-content:center;
}
.cto-marker .cto-box i { font-size:9px; opacity:0.9; }

.cto-marker .cto-name {
  font-size:8px; font-weight:600; color:#1e293b;
  background:rgba(255,255,255,0.92); padding:0 3px;
  border-radius:2px; max-width:70px; overflow:hidden;
  text-overflow:ellipsis; white-space:nowrap; line-height:1.3;
  text-shadow:0 0 2px #fff;
}

.cto-marker .cto-bar {
  width:100%; height:3px; border-radius:1.5px;
  background:rgba(255,255,255,0.5); overflow:hidden;
  margin-top:1px;
}
.cto-marker .cto-bar-fill {
  height:100%; border-radius:1.5px;
  transition: width 0.3s ease;
}

/* Cable label styles */
.cable-label {
  font-size:9px; font-weight:600; color:#1e293b;
  background:rgba(255,255,255,0.85); padding:1px 4px;
  border-radius:2px; white-space:nowrap;
  border:1px solid rgba(0,0,0,0.1);
  font-family:'Segoe UI',system-ui,sans-serif;
}

/* Modal SDR styles (modal-box, modal-header, modal-body, modal-footer) */
.modal-box {
  background:#fff; border-radius:16px; width:90%; max-width:500px;
  box-shadow:0 20px 60px rgba(0,0,0,.3); overflow:hidden;
}
.modal-header {
  padding:16px 20px; border-bottom:1px solid #e5e7eb;
  display:flex; justify-content:space-between; align-items:center;
}
.modal-header h3 {
  margin:0; font-size:1.05rem; color:#1e293b;
}
.modal-body {
  padding:16px 20px; overflow-y:auto; max-height:65vh;
  display:flex; flex-direction:column; gap:12px;
}
.modal-footer {
  padding:14px 20px; border-top:1px solid #e5e7eb;
  display:flex; justify-content:flex-end; gap:10px;
}

/* SDR Toolbar compact */
.sdr-toolbar {
  padding:8px 12px; display:flex; gap:6px; align-items:center; flex-wrap:wrap;
  background:#f8fafc; border-bottom:1px solid #e2e8f0; min-height:44px;
}
.sdr-toolbar .tb-group { display:flex; gap:4px; align-items:center; }
.sdr-toolbar .tb-sep { width:1px; height:24px; background:#cbd5e1; margin:0 4px; }

/* ── Btn-map (botões da toolbar do mapa) ── */
.btn-map {
  display:inline-flex; align-items:center; gap:5px;
  padding:5px 10px; font-size:.78rem; border-radius:7px;
  border:1px solid #e2e8f0; background:#fff; color:#374151;
  cursor:pointer; transition:background .12s,border-color .12s;
  white-space:nowrap; font-family:inherit;
}
.btn-map:hover { background:#f1f5f9; border-color:#cbd5e1; }
.btn-map.active { background:#eff6ff; border-color:#bfdbfe; color:#2563eb; }

/* ── Infra grid e cards ── */
.infra-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:14px; padding:4px 0;
}
.infra-card {
  background:#fff; border-radius:12px; padding:14px 16px;
  border:1px solid #e5e7eb; box-shadow:0 1px 4px rgba(0,0,0,.06);
  transition:box-shadow .15s,border-color .15s;
}
.infra-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.10); border-color:#c7d2fe; }
.ic-top { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.ic-icon {
  width:36px; height:36px; border-radius:9px; display:flex; align-items:center;
  justify-content:center; font-size:.95rem; flex-shrink:0;
}
.ic-icon.pole    { background:#fef3c7; color:#d97706; }
.ic-icon.cto     { background:#dbeafe; color:#2563eb; }
.ic-icon.cable   { background:#d1fae5; color:#16a34a; }
.ic-icon.splitter{ background:#ede9fe; color:#7c3aed; }
.ic-icon.olt     { background:#fee2e2; color:#dc2626; }
.ic-name  { font-weight:700; font-size:.88rem; color:#1e293b; }
.ic-type  { font-size:.72rem; color:#64748b; margin-top:1px; }
.ic-detail{ font-size:.75rem; color:#64748b; margin-top:2px; }

/* ── Infra stats ── */
.infra-stats {
  display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px;
}
.infra-stat {
  background:#fff; border-radius:10px; padding:12px 16px; text-align:center;
  border:1px solid #e5e7eb; min-width:80px; box-shadow:0 1px 3px rgba(0,0,0,.06);
}
.is-num   { font-size:1.6rem; font-weight:800; color:#1e293b; line-height:1; }
.is-label { font-size:.7rem; color:#64748b; font-weight:600; text-transform:uppercase; margin-top:3px; }

/* ── Signal badges ── */
.signal-badge {
  padding:2px 8px; border-radius:20px; font-size:.7rem; font-weight:700;
  display:inline-block; text-transform:uppercase; letter-spacing:.04em;
}
.signal-badge.good { background:#d1fae5; color:#065f46; }
.signal-badge.warn { background:#fef3c7; color:#92400e; }
.signal-badge.bad  { background:#fee2e2; color:#991b1b; }
.signal-badge.off  { background:#f1f5f9; color:#64748b; }

/* ── Side panel (painel lateral de detalhes) ── */
.sp-section { margin-bottom:16px; }
.sp-section-title {
  font-size:.73rem; font-weight:700; color:#64748b; text-transform:uppercase;
  letter-spacing:.06em; margin-bottom:8px; display:flex; align-items:center; gap:6px;
}
.sp-row {
  display:flex; justify-content:space-between; align-items:center;
  padding:5px 0; border-bottom:1px solid #f8fafc; font-size:.8rem;
}
.sp-label { color:#64748b; flex-shrink:0; margin-right:8px; }
.sp-val   { color:#1e293b; font-weight:500; text-align:right; word-break:break-all; }
`;
  document.head.appendChild(style);
})();

(function() {
'use strict';

// ── CONFIGURAÇÃO ──
// MIGRADO para src/core/config.js (sdr-bundle.js)
// Disponível via window.xxx (carregado antes deste arquivo)
const SDR_TENANT     = window.SDR_TENANT;
const SDR_BASE       = window.SDR_BASE;
const INFRA_TYPES    = window.INFRA_TYPES;
const SDR_PERDAS     = window.SDR_PERDAS;
const SDR_OLT_BUDGET = window.SDR_OLT_BUDGET;

// MIGRADO para src/cto/power-budget.js (sdr-bundle.js)
// _sdrTracePath e sdrPowerBudgetCalc disponíveis via window.xxx
const _sdrTracePath  = window._sdrTracePath;

// MIGRADO para src/utils/haversine.js (sdr-bundle.js)
const _haversineM = window._haversineM;

// ── PADRÃO DE CORES DE FIBRA ──
// MIGRADO para src/utils/fiber-standards.js (sdr-bundle.js)
// Disponível como window.SDR_FIBER_STANDARDS (carregado antes deste arquivo)
const SDR_FIBER_STANDARDS = window.SDR_FIBER_STANDARDS;

// MIGRADO para src/utils/fiber-standards.js (sdr-bundle.js)
const SDR_CABLE_TUBE_CONFIG   = window.SDR_CABLE_TUBE_CONFIG;
const SDR_SPLITTER_LOSS       = window.SDR_SPLITTER_LOSS;
const SDR_SPLITTER_TOPOLOGIES = window.SDR_SPLITTER_TOPOLOGIES;

function _getTubeConfig(fiberCount) {
  return SDR_CABLE_TUBE_CONFIG[fiberCount] || [{ fibers: fiberCount }];
}
function _getTubeColor(tubeNum) {
  return window.SDR_FIBER_STANDARDS[window.sdrFiberStandard].tubeColor(tubeNum);
}
window.sdrFiberStandard = localStorage.getItem('sdr_fiber_standard') || 'abnt';

window.sdrSetFiberStandard = window.sdrSetFiberStandard || function(std) {
  window.sdrFiberStandard = std;
  localStorage.setItem('sdr_fiber_standard', std);
};
window.sdrShowFiberStandardModal = window.sdrShowFiberStandardModal || function() {};

// ── ESTADO ──
let sdrMap = null;
let sdrMapReady = false;
let sdrBaseTile = null;
let sdrLayers = { clients: null, ctos: null, poles: null, cables: null, olts: null, heatmap: null };
let sdrLayerVisible = { clients: true, ctos: true, poles: true, cables: false, olts: true, heatmap: false };
let sdrInfraCache = {};
let sdrClientesCache = {};
let sdrOltsCache = {};
let sdrAlertasCache = {};
// Expoe caches no window para acesso em onclick inline
window.sdrInfraCache    = sdrInfraCache;
window.sdrClientesCache = sdrClientesCache;
window.sdrOltsCache     = sdrOltsCache;
window.sdrAlertasCache  = sdrAlertasCache;

// ── REFERÊNCIAS FIREBASE ──
function sdrRef(path) { return db.ref(`${SDR_BASE}/${path}`); }
window.sdrRef = sdrRef; // exposto para src/cto/index.js (sdr-bundle.js)

// ════════════════════════════════════════════════════
// MAPA LEAFLET
// ════════════════════════════════════════════════════

window.sdrMapInit = function() {
  if (sdrMapReady && sdrMap) {
    setTimeout(() => sdrMap.invalidateSize(), 100);
    sdrMapReloadData();
    return;
  }
  const container = document.getElementById('sdr-map');
  if (!container) return;

  // Retry se Leaflet ainda não carregou (CDN lento)
  if (typeof L === 'undefined' || !L.map) {
    console.warn('[SDR] Leaflet não carregado, retry em 500ms...');
    setTimeout(() => window.sdrMapInit(), 500);
    return;
  }

  // Centro padrão: Jundiaí-SP (região de operação)
  sdrMap = L.map('sdr-map', {
    center: [-23.1862, -46.8842],
    zoom: 13,
    zoomControl: true,
    attributionControl: false,
    preferCanvas: true
  });

  // Tiles
  sdrBaseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(sdrMap);

  window.sdrBaseTile = sdrBaseTile; // exposed for src/map/heatmap.js
  // Inicializar layer groups — MarkerCluster para CTOs (6000+)
  sdrLayers.ctos = (typeof L.markerClusterGroup === 'function')
    ? L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false, disableClusteringAtZoom: 17 }).addTo(sdrMap)
    : L.layerGroup().addTo(sdrMap);
  sdrLayers.clients = L.layerGroup(); // não adiciona ao mapa por padrão (14k+ sem coords)
  sdrLayers.poles = L.layerGroup().addTo(sdrMap);
  sdrLayers.cables = L.layerGroup().addTo(sdrMap);
  sdrLayers.olts = L.layerGroup().addTo(sdrMap);
  sdrLayers.heatmap = L.layerGroup();
  sdrLayers.areas = L.layerGroup().addTo(sdrMap); // Áreas de cobertura (coverage_area)

  sdrMapReady = true;
  // Expor estado do mapa para módulos em sdr-bundle.js (map/render.js)
  window.sdrMap          = sdrMap;
  window.sdrLayers       = sdrLayers;
  window.sdrLayerVisible = sdrLayerVisible;
  window.sdrMapReady     = true;
  setTimeout(() => sdrMap.invalidateSize(), 200);

  // Listener de clique no mapa — capturar coordenadas quando card de edição está aberto
  sdrMap.on('click', function(e) {
    if (window.sdrMapClickCapture) {
      window.sdrMapClickCapture(e.latlng.lat, e.latlng.lng);
    }
  });

  // Carregar dados
  sdrMapReloadData();
};

function sdrMapReloadData() {
  if (!sdrMapReady) return;
  // Carregar infra
  sdrRef('infrastructure').once('value').then(snap => {
    sdrInfraCache = snap.val() || {};
    window.sdrInfraCache = sdrInfraCache;
    sdrMapRenderInfra();
    sdrUpdateMapInfo();
  });
  // Carregar clientes
  sdrRef('clients').once('value').then(snap => {
    sdrClientesCache = snap.val() || {};
    window.sdrClientesCache = sdrClientesCache;
    sdrMapRenderClients();
    sdrUpdateMapInfo();
  });
  // Carregar OLTs
  sdrRef('olt_connections').once('value').then(snap => {
    sdrOltsCache = snap.val() || {};
    window.sdrOltsCache = sdrOltsCache;
    sdrMapRenderOlts();
    sdrUpdateMapInfo();
  });
}

function sdrMapRenderInfra() {
  // Delega para a versão Sprint 5 com ícones profissionais
  if (typeof window.sdrMapRenderInfra === 'function') {
    window.sdrMapRenderInfra();
    return;
  }
}

function sdrMapRenderClients() {
  // MIGRADO para src/map/render.js (sdr-bundle.js)
  if (typeof window.sdrMapRenderClients === 'function') { window.sdrMapRenderClients(); return; }
}

function sdrMapRenderOlts() {
  // MIGRADO para src/map/render.js (sdr-bundle.js)
  if (typeof window.sdrMapRenderOlts === 'function') { window.sdrMapRenderOlts(); return; }
}

function _infraPopup(id, item) {
  // MIGRADO para src/map/render.js (sdr-bundle.js)
  if (typeof window._infraPopup === 'function') return window._infraPopup(id, item);
  return '';
}

function sdrUpdateMapInfo() {
  // MIGRADO para src/map/render.js (sdr-bundle.js)
  if (typeof window.sdrUpdateMapInfo === 'function') { window.sdrUpdateMapInfo(); return; }
}

// sdrMapInfoToggle, sdrMapToggleLayer, sdrMapCenterOnMe
// MIGRADOS para src/map/render.js (sdr-bundle.js) — definidos via window lá

window.sdrMapAddItem = window.sdrMapAddItem || function() { window._sdrShowAddModal(null, null); };

// ════════════════════════════════════════════════════
// PAINEL LATERAL + MODAL INFRA CRUD — migrado para src/infra/index.js (Fase 14)
// ════════════════════════════════════════════════════
window.sdrOpenInfraPanel    = window.sdrOpenInfraPanel    || function() {};
window.sdrCloseSidePanel    = window.sdrCloseSidePanel    || function() {};
window.sdrMapFlyTo          = window.sdrMapFlyTo          || function() {};
window.sdrToggleMapClickMode= window.sdrToggleMapClickMode|| function() {};
window.sdrMapClickCapture   = window.sdrMapClickCapture   || function() { return false; };
window.sdrCancelMapClickMode= window.sdrCancelMapClickMode|| function() {};
window.sdrGetGPS            = window.sdrGetGPS            || function() {};
window.sdrInfraSave         = window.sdrInfraSave         || function() {};
window.sdrInfraEdit         = window.sdrInfraEdit         || function() {};
window.sdrInfraDelete       = window.sdrInfraDelete       || function() {};
window._sdrShowAddModal     = window._sdrShowAddModal     || function() {};

// ════════════════════════════════════════════════════
// PÁGINA INFRAESTRUTURA (LISTA/GRID)
// ════════════════════════════════════════════════════

window.sdrInfraRender = window.sdrInfraRender || function() {};
window.sdrInfraAdd = window.sdrInfraAdd || function() {};

// ════════════════════════════════════════════════════
// PÁGINA CLIENTES DA REDE — migrado para src/clientes/render.js (Fase 15)
// ════════════════════════════════════════════════════
window.sdrClientesRender   = window.sdrClientesRender   || function() {};
window.sdrClientesFilter   = window.sdrClientesFilter   || function() {};
window.sdrMapFlyToClient   = window.sdrMapFlyToClient   || function() {};
window.sdrClienteAdd       = window.sdrClienteAdd       || function() {};
window.sdrClienteEdit      = window.sdrClienteEdit      || function() {};
window.sdrGetGPSCliente    = window.sdrGetGPSCliente    || function() {};
window.sdrClienteSave      = window.sdrClienteSave      || function() {};
window.sdrClienteDelete    = window.sdrClienteDelete    || function() {};

// ════════════════════════════════════════════════════
// PÁGINA OLTs
// ════════════════════════════════════════════════════

window.sdrOltsRender = window.sdrOltsRender || function() {};

window.sdrOltAdd = window.sdrOltAdd || function() {};

// ════════════════════════════════════════════════════
// PÁGINA ALERTAS
// ════════════════════════════════════════════════════

window.sdrAlertasRender = window.sdrAlertasRender || function() {
  sdrRef('alerts').once('value').then(snap => {
    sdrAlertasCache = snap.val() || {};
    window.sdrAlertasCache = sdrAlertasCache;
    const el = document.getElementById('alertas-lista');
    if (!el) return;
    const items = Object.entries(sdrAlertasCache).sort((a,b) => (b[1].created_at||'').localeCompare(a[1].created_at||''));
    if (items.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
        <i class="fas fa-check-circle" style="font-size:2.5rem;margin-bottom:12px;display:block;color:#16a34a;opacity:.6"></i>
        <p>Nenhum alerta ativo</p>
      </div>`;
      return;
    }
    el.innerHTML = items.map(([id, a]) => {
      const colors = {info:'#2563eb',warning:'#d97706',critical:'#dc2626'};
      const icons = {info:'fa-info-circle',warning:'fa-exclamation-triangle',critical:'fa-radiation'};
      const c = colors[a.severity]||colors.info;
      return `<div style="padding:12px;border-left:4px solid ${c};background:#fff;border-radius:0 8px 8px 0;margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <i class="fas ${icons[a.severity]||icons.info}" style="color:${c};font-size:1.2rem"></i>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.88rem">${a.title||'Alerta'}</div>
          <div style="font-size:.78rem;color:var(--muted)">${a.message||''}</div>
          <div style="font-size:.7rem;color:var(--muted);margin-top:2px">${a.created_at?new Date(a.created_at).toLocaleString('pt-BR'):''}</div>
        </div>
        ${a.is_active?`<button class="btn-map" onclick="sdrAlertaAck('${id}')" style="padding:4px 10px;font-size:.75rem"><i class="fas fa-check"></i> Ack</button>`
        :`<span style="font-size:.72rem;color:#16a34a"><i class="fas fa-check-circle"></i> Resolvido</span>`}
      </div>`;
    }).join('');
  });
};

window.sdrAlertaAck = window.sdrAlertaAck || function(id) {
  window.sdrRef(`alerts/${id}`).update({is_active:false,acknowledged_at:new Date().toISOString()}).then(()=>{
    window.toast('Alerta reconhecido','success');
    window.sdrAlertasRender&&window.sdrAlertasRender();
  });
};

// ════════════════════════════════════════════════════
// DASHBOARD REDE
// ════════════════════════════════════════════════════

window.sdrDashRedeRender = window.sdrDashRedeRender || function() {
  Promise.all([
    sdrRef('infrastructure').once('value'),
    sdrRef('clients').once('value'),
    sdrRef('olt_connections').once('value'),
    sdrRef('alerts').once('value')
  ]).then(([infraSnap, clientsSnap, oltsSnap, alertsSnap]) => {
    const infra = Object.values(infraSnap.val() || {});
    const clients = Object.values(clientsSnap.val() || {});
    const olts = Object.values(oltsSnap.val() || {});
    const alerts = Object.values(alertsSnap.val() || {});

    const activeAlerts = alerts.filter(a => a.is_active);
    const onlineClients = clients.filter(c => c.onu_status === 'online');
    const offlineClients = clients.filter(c => c.onu_status === 'offline');
    const degradedClients = clients.filter(c => c.onu_status === 'degraded');

    const statsEl = document.getElementById('dash-rede-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="infra-stat"><div class="is-num">${clients.length}</div><div class="is-label">Clientes</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#16a34a">${onlineClients.length}</div><div class="is-label">Online</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#d97706">${degradedClients.length}</div><div class="is-label">Degradados</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#dc2626">${offlineClients.length}</div><div class="is-label">Offline</div></div>
        <div class="infra-stat"><div class="is-num">${infra.length}</div><div class="is-label">Infra Items</div></div>
        <div class="infra-stat"><div class="is-num">${olts.length}</div><div class="is-label">OLTs</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#dc2626">${activeAlerts.length}</div><div class="is-label">Alertas Ativos</div></div>`;
    }

    const contentEl = document.getElementById('dash-rede-content');
    if (contentEl) {
      // Top 10 clientes com sinal ruim
      const worstSignal = clients.filter(c => c.rx_power != null).sort((a,b) => a.rx_power - b.rx_power).slice(0, 10);
      let html = '';
      if (worstSignal.length > 0) {
        html += `<div style="margin-top:20px"><h4 style="font-size:.9rem;margin-bottom:10px"><i class="fas fa-signal" style="color:#dc2626;margin-right:6px"></i>Top 10 — Pior Sinal</h4>`;
        html += `<table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:#fef2f2"><th style="padding:6px 10px;text-align:left">Cliente</th><th style="padding:6px 10px">Rx (dBm)</th><th style="padding:6px 10px">Status</th></tr></thead>
          <tbody>${worstSignal.map(c => {
            const badge = c.rx_power > -25 ? 'good' : c.rx_power > -28 ? 'warn' : 'bad';
            return `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px 10px">${c.name||'-'}</td>
              <td style="padding:6px 10px;text-align:center"><span class="signal-badge ${badge}">${c.rx_power} dBm</span></td>
              <td style="padding:6px 10px;text-align:center">${c.onu_status||'-'}</td></tr>`;
          }).join('')}</tbody></table></div>`;
      }

      // Alertas recentes
      if (activeAlerts.length > 0) {
        html += `<div style="margin-top:20px"><h4 style="font-size:.9rem;margin-bottom:10px"><i class="fas fa-bell" style="color:#d97706;margin-right:6px"></i>Alertas Ativos</h4>`;
        activeAlerts.slice(0, 5).forEach(a => {
          const c = {info:'#2563eb',warning:'#d97706',critical:'#dc2626'}[a.severity]||'#2563eb';
          html += `<div style="padding:8px 12px;border-left:3px solid ${c};background:#fafbfc;border-radius:0 6px 6px 0;margin-bottom:6px;font-size:.82rem">
            <b>${a.title||'Alerta'}</b><br><span style="color:var(--muted)">${a.message||''}</span>
          </div>`;
        });
        html += `</div>`;
      }

      contentEl.innerHTML = html || '<p style="color:var(--muted);text-align:center;padding:20px">Cadastre clientes e infraestrutura para ver o dashboard da rede.</p>';
    }
  });
};

// ════════════════════════════════════════════════════
// INICIALIZAÇÃO DO TENANT DEFAULT
// ════════════════════════════════════════════════════

// Criar tenant padrão se não existir
sdrRef('info').once('value').then(snap => {
  if (!snap.exists()) {
    sdrRef('info').set({
      name: 'Meu Provedor',
      tier: 'starter',
      license_status: 'active',
      created_at: new Date().toISOString()
    });
    console.log('[SDR Comercial] Tenant default criado');
  }
});

// ── Clientes — MIGRADO para src/clientes/index.js (sdr-bundle.js) ──────────
// sdrImportClientes, sdrImportExecute, sdrOpenClientePanel, _buildClientePanel
// sdrAutoLinkCTO, _mapColumn, _normalizeFinStatus → window.xxx via sdr-bundle.js
window.sdrImportClientes   = window.sdrImportClientes   || function() {};
window.sdrImportExecute    = window.sdrImportExecute    || function() {};
window.sdrOpenClientePanel = window.sdrOpenClientePanel || function() {};
window.sdrAutoLinkCTO      = window.sdrAutoLinkCTO      || function() {};

// Helper: calcular ocupação de uma CTO
function _sdrCtoOcupacao(ctoId) { return (typeof window._sdrCtoOcupacao === 'function') ? window._sdrCtoOcupacao(ctoId) : []; } // migrado → src/cto/index.js
// Helper: encontrar CTO do poste
function _sdrCtosDoPoste(poleId) { return (typeof window._sdrCtosDoPoste === 'function') ? window._sdrCtosDoPoste(poleId) : []; } // migrado → src/cto/index.js

// ════════════════════════════════════════════════════
// SPRINT 4 — OLTs TAB INTERFACE + CHASSIS INLINE + CORD DRAWING
// ════════════════════════════════════════════════════

window._sdrActiveOltTab = window._sdrActiveOltTab || null;
window._sdrOltPlaceMode = window._sdrOltPlaceMode || null;
window._sdrCordDrawMode = window._sdrCordDrawMode || null;

// ── HTML da página OLTs (tab-based dark UI) ─────────────────────────
// ── HTML OLT page — MIGRADO para src/olt/html.js ────────────────────────
window._sdrHtml_olts = window._sdrHtml_olts || function() { return ''; };

// ── OLT TabSwitch + InlineRender + ChassisPreview — MIGRADO para src/olt/inline.js ──
window.sdrOltTabSwitch      = window.sdrOltTabSwitch      || function() {};
window.sdrOltInlineRender   = window.sdrOltInlineRender   || function() {};
window.sdrOltChassisPreview = window.sdrOltChassisPreview || function() {};
window.sdrOltBrandChange    = window.sdrOltBrandChange    || function() {};
window.sdrOltModelChange    = window.sdrOltModelChange    || function() {};

// Modal dedicado para OLT

// ── OLT Lightpath Modal + LP helpers — MIGRADO para src/olt/lightpath.js ──
window.sdrOltLightpathModal = window.sdrOltLightpathModal || function() {};
window.sdrLpHighlight       = window.sdrLpHighlight       || function() {};
window.sdrLpPonSelect       = window.sdrLpPonSelect       || function() {};
window._sdrLpCancelSelect   = window._sdrLpCancelSelect   || function() {};
window.sdrLpFiberConnect    = window.sdrLpFiberConnect    || function() {};
window.sdrLpDisconnect      = window.sdrLpDisconnect      || function() {};


window.sdrOltSlotInsert = function(oltId) {
  var pos   = parseInt(document.getElementById('slot-pos').value);
  var gbics = parseInt(document.getElementById('slot-gbics').value) || 8;
  sdrRef('olt_connections/' + oltId).once('value').then(function(snap) {
    var olt = snap.val() || {};
    var slotCount = olt.slot_count || 4;
    var pons = olt.pons || {};
    var slots = olt.slots || {};
    // Desloca todos os slots >= pos uma posição para cima
    var updates = {};
    for (var s = slotCount; s >= pos; s--) {
      // Move PONs do slot s para s+1
      var slotPons = {};
      Object.entries(pons).forEach(function(e) {
        var m = e[0].match(/^s(\d+)_p(\d+)$/);
        if (m && parseInt(m[1]) === s) {
          updates['olt_connections/' + oltId + '/pons/s' + (s+1) + '_p' + m[2]] = e[1];
          updates['olt_connections/' + oltId + '/pons/' + e[0]] = null; // remove antigo
        }
      });
      // Move config do slot
      if (slots[s]) {
        updates['olt_connections/' + oltId + '/slots/' + (s+1)] = slots[s];
        updates['olt_connections/' + oltId + '/slots/' + s] = null;
      }
    }
    // Insere o novo slot na posição
    updates['olt_connections/' + oltId + '/slots/' + pos] = { pon_count: gbics };
    updates['olt_connections/' + oltId + '/slot_count'] = slotCount + 1;
    return firebase.database().ref().update(updates);
  }).then(function() {
    if (typeof toast === 'function') toast('Slot inserido na posição ' + pos + '!', 'success');
    document.getElementById('sdr-slot-modal') && document.getElementById('sdr-slot-modal').remove();
    sdrOltLightpathModal(oltId);
  }).catch(function(e) { if (typeof toast === 'function') toast('Erro: ' + e.message, 'error'); });
};

// Remove um slot do chassis (desconecta PONs do slot)
window.sdrOltSlotRemove = function(oltId) {
  var slotNum = parseInt(document.getElementById('slot-remove-num').value);
  if (!confirm('Remover Slot ' + slotNum + '? As PONs serão desconectadas.')) return;
  sdrRef('olt_connections/' + oltId).once('value').then(function(snap) {
    var olt = snap.val() || {};
    var slotCount = olt.slot_count || 4;
    var pons = olt.pons || {};
    var slots = olt.slots || {};
    var updates = {};
    // Libera fibras do DGO das PONs deste slot
    var fiberFrees = [];
    Object.entries(pons).forEach(function(e) {
      var m = e[0].match(/^s(\d+)_p(\d+)$/);
      if (!m) return;
      var s = parseInt(m[1]);
      if (s === slotNum) {
        // Remove PON e libera fibra do DGO
        updates['olt_connections/' + oltId + '/pons/' + e[0]] = null;
        var cfg = e[1] || {};
        if (cfg.dgo_id && cfg.dgo_fiber_key) {
          fiberFrees.push(sdrRef('infrastructure/' + cfg.dgo_id + '/fibers/' + cfg.dgo_fiber_key)
            .update({ status:'free', olt_id:null, slot:null, port:null, label:null }));
        }
      } else if (s > slotNum) {
        // Desloca slots superiores uma posição para baixo
        updates['olt_connections/' + oltId + '/pons/s' + (s-1) + '_p' + m[2]] = e[1];
        updates['olt_connections/' + oltId + '/pons/' + e[0]] = null;
      }
    });
    // Desloca configs de slots
    for (var i = slotNum + 1; i <= slotCount; i++) {
      if (slots[i]) updates['olt_connections/' + oltId + '/slots/' + (i-1)] = slots[i];
      updates['olt_connections/' + oltId + '/slots/' + i] = null;
    }
    updates['olt_connections/' + oltId + '/slots/' + slotNum] = null;
    updates['olt_connections/' + oltId + '/slot_count'] = slotCount - 1;
    return Promise.all(fiberFrees).then(function() {
      return firebase.database().ref().update(updates);
    });
  }).then(function() {
    if (typeof toast === 'function') toast('Slot ' + slotNum + ' removido!', 'success');
    document.getElementById('sdr-slot-modal') && document.getElementById('sdr-slot-modal').remove();
    sdrOltLightpathModal(oltId);
  }).catch(function(e) { if (typeof toast === 'function') toast('Erro: ' + e.message, 'error'); });
};


// Redesenhar cordões ao redimensionar janela (zoom, resize)
(function() {
  var _resizeTimer = null;
  window.addEventListener('resize', function() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function() {
      if (window._sdrLastCordArgs) {
        var a = window._sdrLastCordArgs;
        _sdrDrawSavedCords(a.oltId, a.pons, a.dgos);
      }
    }, 120);
  });
})();

// ── Iniciar modo de cordão (com waypoints) ─────────────────────────
window.sdrPonCordStart = function(oltId, slot, port) {
  // Se em draw mode iniciado pela fibra → fechar circuito nesta PON
  if (window._sdrCordDrawMode && window._sdrCordDrawMode._startType === 'fiber') {
    _sdrCordFinishFiberToPon(oltId, slot, port);
    return;
  }
  if (window._sdrCordDrawMode) { sdrCordDrawCancel(); return; }

  // Se PON conectada ao DGO → apenas mostrar rastreabilidade (sem modo de edição de waypoints)
  var ponBtn = document.getElementById('pon-btn-' + oltId + '-' + slot + '-' + port);
  if (ponBtn && ponBtn.getAttribute('data-has-cord')) {
    if (window._sdrCordEdit) _sdrCordEditCancel();
    var _dgoId    = ponBtn.getAttribute('data-dgo-id');
    var _fiberKey = ponBtn.getAttribute('data-fiber-key');
    if (_dgoId) _sdrRastreabilidade(oltId, slot, port, _dgoId, _fiberKey);
    return;
  }

  window._sdrCordDrawMode = { oltId: oltId, slot: slot, port: port, waypoints: [], _ponBtn: ponBtn };

  // Banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) {
    banner.style.display = 'flex';
    var txt = document.getElementById('olt-cord-banner-text');
    if (txt) txt.textContent = 'SL' + slot + ' · PON ' + port + ' — clique no painel para adicionar pontos; clique na fibra do DGO para finalizar';
  }

  // Destacar PON selecionada, escurecer demais
  document.querySelectorAll('[id^="pon-btn-' + oltId + '-"]').forEach(function(el) {
    el.style.opacity = '0.25';
  });
  if (ponBtn) {
    ponBtn.style.opacity = '1';
    ponBtn.style.outline = '2px solid #a5b4fc';
    ponBtn.style.outlineOffset = '3px';
    ponBtn.style.zIndex = '2';
  }

  document.body.style.cursor = 'crosshair';

  // ── SVG de draw dentro do scroll area (scroll-relative, position:absolute) ──
  var scrollArea = document.getElementById('olt-scroll-area');
  if (scrollArea) {
    var oldSvg = document.getElementById('olt-draw-svg');
    if (oldSvg) oldSvg.remove();
    var drawSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    drawSvg.id = 'olt-draw-svg';
    drawSvg.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:25;overflow:visible');
    drawSvg.setAttribute('width', '100%');
    drawSvg.setAttribute('height', scrollArea.scrollHeight);
    drawSvg.innerHTML = '<defs>'
      + '<marker id="draw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
      + '<polygon points="0 0,8 4,0 8" fill="#a5b4fc"/></marker>'
      + '<filter id="draw-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur stdDeviation="2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>'
      // Polyline dos pontos confirmados (começa vazia)
      + '<polyline id="olt-draw-polyline" stroke="#a5b4fc" stroke-width="2" fill="none" opacity="0.8"/>'
      // Linha dashed do último ponto ao cursor
      + '<line id="olt-draw-dashline" stroke="#a5b4fc" stroke-width="2" stroke-dasharray="9,6" '
      + 'marker-end="url(#draw-arrow)" filter="url(#draw-glow)" opacity="0"/>'
      // Grupo de dots dos waypoints
      + '<g id="olt-draw-dots"></g>';
    scrollArea.appendChild(drawSvg);
  }

  function getSaCoords(clientX, clientY) {
    var sa = document.getElementById('olt-scroll-area');
    if (!sa) return {x: clientX, y: clientY};
    var r = sa.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top + sa.scrollTop };
  }

  function onMouseMove(ev) {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (!sa || !svg) return;
    // Atualizar altura do SVG se scroll mudou
    svg.setAttribute('height', sa.scrollHeight);
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode._lastMouseSvg = pos;
    _sdrCordSvgUpdate();
  }

  function onScroll() {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (sa && svg) svg.setAttribute('height', sa.scrollHeight);
    _sdrCordSvgUpdate();
  }

  // Waypoint: clique no painel (não em PON nem em fibra DGO)
  function onScrollClick(ev) {
    if (!window._sdrCordDrawMode) return;
    var tid = (ev.target.id || '');
    if (tid.indexOf('pon-btn-') === 0 || tid.indexOf('dgo-fiber-') === 0) return;
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode.waypoints.push(pos);
    _sdrCordSvgUpdate();
    // Feedback visual rápido no ponto clicado
    if (typeof toast === 'function') toast('Ponto ' + window._sdrCordDrawMode.waypoints.length + ' adicionado', 'info');
  }

  scrollArea.addEventListener('mousemove', onMouseMove);
  scrollArea.addEventListener('scroll', onScroll);
  scrollArea.addEventListener('click', onScrollClick);
  window._sdrCordDrawMode._onMouseMove   = onMouseMove;
  window._sdrCordDrawMode._onScroll      = onScroll;
  window._sdrCordDrawMode._onScrollClick = onScrollClick;

  _sdrCordSvgUpdate();
  if (typeof toast === 'function') toast('SL' + slot + ' PON ' + port + ' selecionada — clique para adicionar pontos do cordão', 'info');
};

// ── Cancelar modo de cordão ─────────────────────────────────────────
window.sdrCordDrawCancel = function() {
  if (window._sdrCordEdit) { _sdrCordEditCancel(); return; }
  if (!window._sdrCordDrawMode) return;
  var m = window._sdrCordDrawMode;
  window._sdrCordDrawMode = null;

  // Remover listeners do scroll area
  var sa = document.getElementById('olt-scroll-area');
  if (sa) {
    if (m._onMouseMove)   sa.removeEventListener('mousemove', m._onMouseMove);
    if (m._onScroll)      sa.removeEventListener('scroll',    m._onScroll);
    if (m._onScrollClick) sa.removeEventListener('click',     m._onScrollClick);
  }

  // Remover SVG de draw em progresso
  var drawSvg = document.getElementById('olt-draw-svg');
  if (drawSvg) drawSvg.remove();

  // Restaurar cursor
  document.body.style.cursor = '';

  // Esconder banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) banner.style.display = 'none';

  if (m._startType === 'fiber') {
    // Restaurar fibras DGO
    document.querySelectorAll('[id^="dgo-fiber-"]').forEach(function(el) {
      el.style.opacity = '';
      el.style.boxShadow = '';
    });
  } else {
    // Restaurar botões PON
    document.querySelectorAll('[id^="pon-btn-' + m.oltId + '-"]').forEach(function(el) {
      el.style.opacity = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.zIndex = '';
    });
  }
};

// ── Conectar PON → fibra do DGO ────────────────────────────────────
window.sdrCordConnectFiber = function(dgoId, fiberKey) {
  if (!window._sdrCordDrawMode) {
    var fiberEl = document.getElementById('dgo-fiber-' + dgoId + '-' + fiberKey);
    var connKey = fiberEl ? fiberEl.getAttribute('data-pon-key') : null;
    if (connKey) {
      // Fibra já conectada → destacar cordão
      _sdrCordHighlight(connKey);
      return;
    }
    // Fibra livre → iniciar draw a partir da fibra
    _sdrCordDrawFromFiber(dgoId, fiberKey);
    return;
  }
  // Em draw mode pon-start: clicou na fibra → fechar circuito
  if (window._sdrCordDrawMode._startType === 'fiber') {
    // Clicou na fibra de origem (cancela) ou em outra fibra (trocar destino não faz sentido → cancelar)
    sdrCordDrawCancel();
    return;
  }
  var m      = window._sdrCordDrawMode;
  var oltId  = m.oltId;
  var slot   = m.slot;
  var port   = m.port;
  var ponKey = 's' + slot + '_p' + port;

  sdrRef('infrastructure/' + dgoId + '/fibers/' + fiberKey).once('value').then(function(snap) {
    var fib = snap.val() || {};
    var oldPonKey = fib.pon_key || null;  // PON que usava esta fibra antes

    if (fib.status === 'used') {
      var msg = oldPonKey
        ? 'Fibra ' + fiberKey + ' já está usada pela ' + oldPonKey + '.\nDesconectar e reconectar à SL' + slot + ' PON' + port + '?'
        : 'Fibra ' + fiberKey + ' já está em uso. Reconectar mesmo assim?';
      if (!confirm(msg)) {
        sdrCordDrawCancel();
        return;
      }
    }

    // Converter waypoints para coordenadas fracionais (relativo ao scroll area)
    var cordPath = [];
    var sa = document.getElementById('olt-scroll-area');
    if (sa && m.waypoints && m.waypoints.length > 0) {
      var saW = sa.clientWidth  || 1;
      var saH = sa.scrollHeight || 1;
      cordPath = m.waypoints.map(function(wp) {
        return { x: Math.round(wp.x / saW * 10000) / 10000,
                 y: Math.round(wp.y / saH * 10000) / 10000 };
      });
    }

    var updates = {};
    // Liberar a antiga PON que usava esta fibra (se houver)
    if (oldPonKey && oldPonKey !== ponKey) {
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/dgo_id']        = null;
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/dgo_fiber_key'] = null;
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/cord_path']     = null;
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/active']        = false;
    }
    // Liberar fibra antiga da PON atual (se estava conectada a outra fibra)
    // (será lido da PON via Firebase para não depender de cache)
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/active']        = true;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_id']        = dgoId;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_fiber_key'] = fiberKey;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/updated_at']    = new Date().toISOString();
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/cord_path']     = cordPath;
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/status']     = 'used';
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/olt_id']     = oltId;
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/pon_key']    = ponKey;

    // Se a PON já estava conectada a OUTRA fibra, liberar a fibra antiga
    sdrRef('olt_connections/' + oltId + '/pons/' + ponKey).once('value').then(function(pSnap) {
      var pData = pSnap.val() || {};
      if (pData.dgo_id && pData.dgo_fiber_key && (pData.dgo_id !== dgoId || pData.dgo_fiber_key !== fiberKey)) {
        updates['infrastructure/' + pData.dgo_id + '/fibers/' + pData.dgo_fiber_key + '/status']  = 'free';
        updates['infrastructure/' + pData.dgo_id + '/fibers/' + pData.dgo_fiber_key + '/olt_id']  = null;
        updates['infrastructure/' + pData.dgo_id + '/fibers/' + pData.dgo_fiber_key + '/pon_key'] = null;
      }
      return sdrRef('').update(updates);
    }).then(function() {
      if (typeof toast === 'function') toast('Conectado: SL' + slot + ' PON' + port + ' → ' + fiberKey + (cordPath.length ? ' (' + cordPath.length + ' pontos)' : ''), 'success');
      sdrCordDrawCancel();
      sdrOltInlineRender(oltId);
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
    });
  });
};

// ── Draw mode iniciado pela fibra do DGO ───────────────────────────
window._sdrCordDrawFromFiber = function(dgoId, fiberKey) {
  // OLT ativa fica na global window._sdrActiveOltTab (setada pelo sdrOltTabSwitch)
  var oltId = window._sdrActiveOltTab || null;
  if (!oltId) { if (typeof toast === 'function') toast('Abra o painel de uma OLT primeiro', 'warn'); return; }

  var fiberEl = document.getElementById('dgo-fiber-' + dgoId + '-' + fiberKey);

  window._sdrCordDrawMode = {
    _startType : 'fiber',
    oltId      : oltId,
    dgoId      : dgoId,
    fiberKey   : fiberKey,
    _fiberEl   : fiberEl,
    waypoints  : []
  };

  // Banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) {
    banner.style.display = 'flex';
    var txt = document.getElementById('olt-cord-banner-text');
    if (txt) txt.textContent = 'Fibra ' + fiberKey.replace('_', ' ') + ' selecionada — clique no painel para pontos; clique na PON de destino para finalizar';
  }

  // Destacar fibra de origem, escurecer demais fibras
  document.querySelectorAll('[id^="dgo-fiber-"]').forEach(function(el) { el.style.opacity = '0.25'; });
  if (fiberEl) { fiberEl.style.opacity = '1'; fiberEl.style.boxShadow = '0 0 10px #a5b4fc'; }

  document.body.style.cursor = 'crosshair';

  var scrollArea = document.getElementById('olt-scroll-area');
  if (scrollArea) {
    var oldSvg = document.getElementById('olt-draw-svg');
    if (oldSvg) oldSvg.remove();
    var drawSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    drawSvg.id = 'olt-draw-svg';
    drawSvg.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:25;overflow:visible');
    drawSvg.setAttribute('width', '100%');
    drawSvg.setAttribute('height', scrollArea.scrollHeight);
    drawSvg.innerHTML = '<defs>'
      + '<marker id="draw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
      + '<polygon points="0 0,8 4,0 8" fill="#a5b4fc"/></marker>'
      + '<filter id="draw-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur stdDeviation="2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>'
      + '<polyline id="olt-draw-polyline" stroke="#a5b4fc" stroke-width="2" fill="none" opacity="0.8"/>'
      + '<line id="olt-draw-dashline" stroke="#a5b4fc" stroke-width="2" stroke-dasharray="9,6" '
      + 'marker-end="url(#draw-arrow)" filter="url(#draw-glow)" opacity="0"/>'
      + '<g id="olt-draw-dots"></g>';
    scrollArea.appendChild(drawSvg);
  }

  function getSaCoords(clientX, clientY) {
    var sa = document.getElementById('olt-scroll-area');
    if (!sa) return {x: clientX, y: clientY};
    var r = sa.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top + sa.scrollTop };
  }

  function onMouseMove(ev) {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (!sa || !svg) return;
    svg.setAttribute('height', sa.scrollHeight);
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode._lastMouseSvg = pos;
    _sdrCordSvgUpdate();
  }
  function onScroll() {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (sa && svg) svg.setAttribute('height', sa.scrollHeight);
    _sdrCordSvgUpdate();
  }
  function onScrollClick(ev) {
    if (!window._sdrCordDrawMode) return;
    var tid = (ev.target.id || '');
    // Ignorar cliques em fibras DGO e botões PON (tratados nos seus próprios handlers)
    if (tid.indexOf('pon-btn-') === 0 || tid.indexOf('dgo-fiber-') === 0) return;
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode.waypoints.push(pos);
    _sdrCordSvgUpdate();
    if (typeof toast === 'function') toast('Ponto ' + window._sdrCordDrawMode.waypoints.length + ' adicionado', 'info');
  }

  if (scrollArea) {
    scrollArea.addEventListener('mousemove', onMouseMove);
    scrollArea.addEventListener('scroll', onScroll);
    scrollArea.addEventListener('click', onScrollClick);
    window._sdrCordDrawMode._onMouseMove   = onMouseMove;
    window._sdrCordDrawMode._onScroll      = onScroll;
    window._sdrCordDrawMode._onScrollClick = onScrollClick;
  }

  _sdrCordSvgUpdate();
  if (typeof toast === 'function') toast('Fibra ' + fiberKey + ' — clique na PON de destino para finalizar', 'info');
};

// ── Finalizar circuito: fibra DGO → PON (suporta reconexão) ─────────
window._sdrCordFinishFiberToPon = function(oltId, slot, port) {
  var m = window._sdrCordDrawMode;
  if (!m || m._startType !== 'fiber') return;

  var ponKey   = 's' + slot + '_p' + port;
  var dgoId    = m.dgoId;
  var fiberKey = m.fiberKey;

  // Ler estado atual da PON (pode já estar conectada a outra fibra)
  sdrRef('olt_connections/' + oltId + '/pons/' + ponKey).once('value').then(function(snap) {
    var pon = snap.val() || {};
    var oldDgoId    = pon.dgo_id       || null;
    var oldFiberKey = pon.dgo_fiber_key || null;

    if (oldDgoId) {
      var msg = oldFiberKey
        ? 'PON SL' + slot + '-' + port + ' já está conectada à fibra ' + oldFiberKey + '.\nDesconectar e reconectar à fibra ' + fiberKey + '?'
        : 'PON SL' + slot + '-' + port + ' já está conectada. Reconectar mesmo assim?';
      if (!confirm(msg)) {
        sdrCordDrawCancel();
        return;
      }
    }

    // Converter waypoints para fracional (inverter: fibra→PON fica PON→fibra)
    var cordPath = [];
    var sa = document.getElementById('olt-scroll-area');
    if (sa && m.waypoints && m.waypoints.length > 0) {
      var saW = sa.clientWidth  || 1;
      var saH = sa.scrollHeight || 1;
      cordPath = m.waypoints.slice().reverse().map(function(wp) {
        return { x: Math.round(wp.x / saW * 10000) / 10000,
                 y: Math.round(wp.y / saH * 10000) / 10000 };
      });
    }

    var updates = {};
    // Liberar fibra antiga (se era diferente)
    if (oldDgoId && oldFiberKey && (oldDgoId !== dgoId || oldFiberKey !== fiberKey)) {
      updates['infrastructure/' + oldDgoId + '/fibers/' + oldFiberKey + '/status']  = 'free';
      updates['infrastructure/' + oldDgoId + '/fibers/' + oldFiberKey + '/olt_id']  = null;
      updates['infrastructure/' + oldDgoId + '/fibers/' + oldFiberKey + '/pon_key'] = null;
    }
    // Gravar nova conexão na PON
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/active']        = true;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_id']        = dgoId;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_fiber_key'] = fiberKey;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/updated_at']    = new Date().toISOString();
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/cord_path']     = cordPath;
    // Marcar nova fibra como usada
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/status']     = 'used';
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/olt_id']     = oltId;
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/pon_key']    = ponKey;

    sdrRef('').update(updates).then(function() {
      var msg = oldDgoId
        ? 'Reconectado: SL' + slot + ' PON' + port + ' → ' + fiberKey + (oldFiberKey ? ' (era ' + oldFiberKey + ')' : '')
        : 'Conectado: Fibra ' + fiberKey + ' → SL' + slot + ' PON' + port;
      if (cordPath.length) msg += ' (' + cordPath.length + ' pontos)';
      if (typeof toast === 'function') toast(msg, 'success');
      sdrCordDrawCancel();
      sdrOltInlineRender(oltId);
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
    });
  });
};

// ── Atualizar SVG em progresso (draw mode) ─────────────────────────
window._sdrCordSvgUpdate = function() {
  var m = window._sdrCordDrawMode;
  if (!m) return;
  var sa  = document.getElementById('olt-scroll-area');
  var svg = document.getElementById('olt-draw-svg');
  if (!sa || !svg) return;

  var sr = sa.getBoundingClientRect();

  // ── Ponto de origem depende de onde o draw foi iniciado ──
  var startPt = { x: 0, y: 0 };
  if (m._startType === 'fiber') {
    // Iniciado pela fibra DGO — saída da borda direita
    var fEl = m._fiberEl || document.getElementById('dgo-fiber-' + m.dgoId + '-' + m.fiberKey);
    if (fEl) {
      var fr = fEl.getBoundingClientRect();
      startPt.x = fr.left - sr.left + fr.width;          // borda direita fibra
      startPt.y = fr.top  - sr.top  + sa.scrollTop + fr.height / 2;
    }
  } else {
    // Iniciado pela PON — saída da borda direita
    var ponBtn = m._ponBtn || document.getElementById('pon-btn-' + m.oltId + '-' + m.slot + '-' + m.port);
    if (ponBtn) {
      var br = ponBtn.getBoundingClientRect();
      startPt.x = br.left - sr.left + br.width;          // borda direita PON
      startPt.y = br.top  - sr.top  + sa.scrollTop + br.height / 2;
    }
  }

  // Todos os pontos confirmados: origem + waypoints
  var pts = [startPt].concat(m.waypoints || []);
  var ptsStr = pts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

  // Polyline dos pontos confirmados
  var poly = document.getElementById('olt-draw-polyline');
  if (poly) poly.setAttribute('points', ptsStr);

  // Linha dashed: último ponto confirmado → cursor
  var lastPt = pts[pts.length - 1];
  var dash = document.getElementById('olt-draw-dashline');
  if (dash) {
    dash.setAttribute('x1', lastPt.x);
    dash.setAttribute('y1', lastPt.y);
    if (m._lastMouseSvg) {
      dash.setAttribute('x2', m._lastMouseSvg.x);
      dash.setAttribute('y2', m._lastMouseSvg.y);
      dash.setAttribute('opacity', '0.85');
    }
  }

  // Dots nos waypoints
  var dotsG = document.getElementById('olt-draw-dots');
  if (dotsG) {
    dotsG.innerHTML = '';
    (m.waypoints || []).forEach(function(wp, idx) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', wp.x); c.setAttribute('cy', wp.y);
      c.setAttribute('r', '5'); c.setAttribute('fill', '#6366f1');
      c.setAttribute('stroke', '#a5b4fc'); c.setAttribute('stroke-width', '1.5');
      dotsG.appendChild(c);
      var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', wp.x + 7); txt.setAttribute('y', wp.y + 4);
      txt.setAttribute('font-size', '8'); txt.setAttribute('fill', '#a5b4fc');
      txt.textContent = idx + 1;
      dotsG.appendChild(txt);
    });
    // Dot de início (PON ou fibra)
    var startDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startDot.setAttribute('cx', startPt.x); startDot.setAttribute('cy', startPt.y);
    startDot.setAttribute('r', '7');
    startDot.setAttribute('fill', m._startType === 'fiber' ? '#22c55e' : '#a5b4fc');
    startDot.setAttribute('stroke', '#fff'); startDot.setAttribute('stroke-width', '1.5');
    startDot.setAttribute('opacity', '0.9');
    dotsG.appendChild(startDot);
  }
};

// ── Desenhar cordões salvos no SVG permanente ──────────────────────
window._sdrDrawSavedCords = function(oltId, pons, dgos) {
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return;

  var old = document.getElementById('olt-cords-svg');
  if (old) old.remove();
  // Limpar qualquer SVG de edição de waypoints residual (não usado mais — rota auto-calculada)
  var oldEdit = document.getElementById('olt-cord-edit-svg');
  if (oldEdit) oldEdit.remove();
  if (window._sdrCordEdit) { window._sdrCordEdit = null; }
  var banner = document.getElementById('olt-cord-banner');
  if (banner) banner.style.display = 'none';

  // Verificar se há PONs conectadas a DGOs (com ou sem waypoints)
  var hasAnyCord = Object.values(pons).some(function(c) {
    return c && c.dgo_id && c.dgo_fiber_key;
  });
  if (!hasAnyCord) return;

  var svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.id = 'olt-cords-svg';
  svgEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;overflow:visible;pointer-events:none;z-index:10';
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', Math.max(sa.scrollHeight, sa.clientHeight, 600));
  svgEl.innerHTML = '<defs>'
    + '<marker id="csaved-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
    + '<polygon points="0 0,8 4,0 8" fill="#6366f1"/></marker>'
    + '<filter id="csaved-glow" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feGaussianBlur stdDeviation="1.8" result="b"/>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '</defs>';
  sa.appendChild(svgEl);

  var saRect = sa.getBoundingClientRect();
  var saW    = sa.clientWidth;
  var saH    = sa.scrollHeight;

  var _bridgePad = 10;

  Object.entries(pons).forEach(function(e) {
    var ponKey = e[0], cfg = e[1];
    // Desenhar para TODAS as PONs conectadas a DGO (com ou sem waypoints)
    if (!cfg || !cfg.dgo_id || !cfg.dgo_fiber_key) return;
    var mm = ponKey.match(/^s(\d+)_p(\d+)$/);
    if (!mm) return;
    var sl = mm[1], po = mm[2];

    var ponBtn  = document.getElementById('pon-btn-' + oltId + '-' + sl + '-' + po);
    var fiberEl = document.getElementById('dgo-fiber-' + cfg.dgo_id + '-' + cfg.dgo_fiber_key);

    var pts = [];
    var ponX, ponY, fiberX, fiberY;

    if (ponBtn) {
      var br = ponBtn.getBoundingClientRect();
      ponX = br.left - saRect.left + br.width;              // borda DIREITA da PON
      ponY = br.top  - saRect.top  + sa.scrollTop + br.height / 2;
    }
    if (fiberEl) {
      var fr = fiberEl.getBoundingClientRect();
      fiberX = fr.left - saRect.left + fr.width;            // borda DIREITA da fibra DGO
      fiberY = fr.top  - saRect.top  + sa.scrollTop + fr.height / 2;
    }

    if (ponX == null || fiberX == null) return;

    // Roteamento duplo-L:
    //   PON → gap do slot (↓ até abaixo da última PON) → ponte (→) → gap do tubo (↓) → fibra (→)
    var GAP_HALF    = 14;
    var BRIDGE_PAD  = 10; // px abaixo da última PON do slot

    // slotGapX — direita do slot + GAP_HALF (espinha vertical)
    var slotEl = document.getElementById('olt-slot-' + oltId + '-' + sl);
    var slotGapX = slotEl
      ? slotEl.getBoundingClientRect().right - saRect.left + GAP_HALF
      : ponX + GAP_HALF;

    // bridgeY — base da ÚLTIMA PON do slot deste cordão + margem
    // Cada cord usa a base do seu próprio slot (todos devem ter o mesmo nº de PONs para alinhamento)
    var bridgeY = slotEl
      ? slotEl.getBoundingClientRect().bottom - saRect.top + sa.scrollTop + _bridgePad
      : fiberY - 20;
    bridgeY = Math.min(bridgeY, fiberY - 4); // nunca ultrapassar a fibra

    // tubeGapX — direita do tubo alvo + GAP_HALF (extrai nº tubo da fiber key, ex: "t6f10" → t=6)
    var tubeMatch = cfg.dgo_fiber_key && cfg.dgo_fiber_key.match(/^t(\d+)f/);
    var tubeNum   = tubeMatch ? tubeMatch[1] : null;
    var tubeEl    = tubeNum ? document.getElementById('dgo-tube-' + cfg.dgo_id + '-' + tubeNum) : null;
    var tubeGapX  = tubeEl
      ? tubeEl.getBoundingClientRect().right - saRect.left + GAP_HALF
      : fiberX + GAP_HALF;

    pts = [
      { x: ponX,      y: ponY      },  // saída direita da PON →
      { x: slotGapX,  y: ponY      },  // entra no gap do slot ↓
      { x: slotGapX,  y: bridgeY   },  // desce abaixo da última PON (PON 16)
      { x: tubeGapX,  y: bridgeY   },  // L → travessia horizontal até gap do tubo
      { x: tubeGapX,  y: fiberY    },  // desce pelo gap do tubo ↓
      { x: fiberX,    y: fiberY    }   // L → chega na fibra
    ];
    if (pts.length < 2) return;

    var ptsStr = pts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

    // Grupo do cordão (pointer-events ativo para clique)
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = 'cord-' + ponKey;
    g.setAttribute('pointer-events', 'all');
    g.style.cursor = 'pointer';

    // Área de clique transparente e larga
    var hit = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    hit.setAttribute('points', ptsStr);
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '14');
    hit.setAttribute('fill', 'none');
    hit.setAttribute('pointer-events', 'stroke');
    g.appendChild(hit);

    // Polyline visível
    var vis = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    vis.setAttribute('points', ptsStr);
    vis.setAttribute('stroke', '#6366f1');
    vis.setAttribute('stroke-width', '2.5');
    vis.setAttribute('fill', 'none');
    vis.setAttribute('marker-end', 'url(#csaved-arrow)');
    vis.setAttribute('filter', 'url(#csaved-glow)');
    vis.setAttribute('pointer-events', 'none');
    vis.setAttribute('class', 'olt-cord-vis'); // SVG: usar setAttribute, não .className
    g.appendChild(vis);

    // Dots de waypoints removidos — roteamento automático (Sprint 16+)

    // Clique no cordão
    g.onclick = function(ev) {
      ev.stopPropagation();
      _sdrCordHighlight(ponKey);
    };
    svgEl.appendChild(g);
  });
};

// ── Rastreabilidade completa do caminho óptico PON → DGO → Splitters → CTO ──
window._sdrRastreabilidade = function(oltId, slot, port, dgoId, fiberKey) {
  var panel = document.getElementById('olt-panel-content');
  if (!panel) return;

  // Criar ou limpar painel de rastreio
  var tracePanel = document.getElementById('olt-rastreio-panel');
  if (!tracePanel) {
    panel.insertAdjacentHTML('beforeend',
      '<div id="olt-rastreio-panel" style="margin-top:16px;background:#060d1c;border:1px solid #334155;border-radius:10px;overflow:hidden">'
      + '<div style="background:#0f1f3a;padding:9px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e3a5f">'
      + '<span style="color:#38bdf8;font-size:.82rem;font-weight:700"><i class="fas fa-route" style="margin-right:7px"></i>Caminho Óptico</span>'
      + '<button onclick="document.getElementById(\'olt-rastreio-panel\').remove()" '
      + 'style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;line-height:1">&times;</button>'
      + '</div>'
      + '<div id="olt-rastreio-content" style="padding:14px;font-size:.8rem;color:#e2e8f0;max-height:420px;overflow-y:auto">'
      + '<i class="fas fa-spinner fa-spin" style="color:#64748b"></i></div>'
      + '</div>'
    );
    tracePanel = document.getElementById('olt-rastreio-panel');
  } else {
    var rc = document.getElementById('olt-rastreio-content');
    if (rc) rc.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:#64748b"></i>';
  }
  setTimeout(function() { tracePanel && tracePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);

  Promise.all([
    sdrRef('olt_connections/' + oltId).once('value'),
    sdrRef('infrastructure').once('value'),
    sdrRef('onus').once('value'),
    sdrRef('clients').once('value')
  ]).then(function(snaps) {
    var olt     = snaps[0].val() || {};
    var infra   = snaps[1].val() || {};
    var onus    = snaps[2].val() || {};
    var clients = snaps[3].val() || {};

    // Índice: pai → filhos
    var byParent = {};
    Object.entries(infra).forEach(function(e) {
      var id = e[0], obj = e[1];
      if (!obj) return;
      var pid = obj.parent_id || obj.olt_id || '__root__';
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push({ id: id, obj: obj });
    });

    // Índice: serial → cliente
    var clientBySerial = {};
    Object.entries(clients).forEach(function(e) {
      var c = e[1];
      if (c && c.onu_serial) clientBySerial[c.onu_serial] = c;
    });

    var ponKey = 's' + slot + '_p' + port;
    var ponCfg = (olt.pons || {})[ponKey] || {};
    var dgo    = infra[dgoId] || {};

    function rxBadge(rx) {
      if (rx == null) return '';
      var col = rx > -25 ? '#22c55e' : rx > -28 ? '#f59e0b' : '#ef4444';
      return '<span style="color:' + col + ';font-size:.7rem;margin-left:4px">' + rx + ' dBm</span>';
    }

    function nodeHtml(depth, borderColor, iconCls, iconColor, label, sublabel, extra) {
      var indent = depth * 18;
      return '<div style="margin:5px 0 5px ' + indent + 'px;display:flex;align-items:flex-start;gap:0">'
        + (depth > 0 ? '<div style="width:2px;min-height:24px;background:#1e3a5f;margin-right:10px;margin-top:6px;flex-shrink:0"></div>' : '')
        + '<span style="display:inline-flex;align-items:center;gap:6px;background:#0f172a;'
        + 'border:1px solid ' + borderColor + ';border-radius:7px;padding:5px 11px;flex-wrap:wrap">'
        + '<i class="fas ' + iconCls + '" style="color:' + iconColor + ';width:14px;text-align:center"></i>'
        + '<b style="color:' + iconColor + '">' + label + '</b>'
        + (sublabel ? '<span style="color:#64748b;font-size:.72rem">' + sublabel + '</span>' : '')
        + (extra || '')
        + '</span></div>';
    }

    function renderSubtree(nodeId, depth) {
      var children = (byParent[nodeId] || []).sort(function(a,b) {
        return (a.obj.nome || a.id).localeCompare(b.obj.nome || b.id);
      });
      return children.map(function(c) {
        var cid = c.id, cobj = c.obj;
        var tipo = cobj.type;
        if (tipo === 'cto') {
          // CTOs: mostrar ONUs conectadas
          var ctOnus = Object.entries(onus).filter(function(e) {
            return e[1] && e[1].cto_id === cid;
          });
          var usedPorts = cobj.used_ports || 0;
          var totalPorts = cobj.total_ports || 8;
          var ctoNode = nodeHtml(depth, '#d97706', 'fa-box', '#fbbf24',
            cobj.nome || cid,
            usedPorts + '/' + totalPorts + ' portas · ' + ctOnus.length + ' ONUs', '');
          var onusHtml = ctOnus.length > 0
            ? ctOnus.map(function(e2) {
                var uid = e2[0], u = e2[1];
                var st  = u.status || 'offline';
                var stCol = st === 'online' ? '#22c55e' : '#ef4444';
                var cli = u.serial_number ? (clientBySerial[u.serial_number] || null) : null;
                return '<div style="margin:3px 0 3px ' + ((depth+1)*18+12) + 'px;display:flex;align-items:center;gap:6px;font-size:.75rem">'
                  + '<span style="width:7px;height:7px;border-radius:50%;background:' + stCol + ';flex-shrink:0"></span>'
                  + '<span style="color:#94a3b8;font-family:monospace">' + (u.serial_number || uid) + '</span>'
                  + '<span style="color:#64748b">' + (u.model || '') + '</span>'
                  + rxBadge(u.rx_power)
                  + (cli ? '<span style="color:#e2e8f0;font-weight:600"> — ' + cli.name + '</span>'
                           + '<span style="color:#64748b;font-size:.7rem"> ' + (cli.plan_name || '') + '</span>' : '')
                  + '</div>';
              }).join('')
            : '<div style="margin-left:' + ((depth+1)*18+12) + 'px;font-size:.72rem;color:#475569;font-style:italic">Sem ONUs</div>';
          return ctoNode + onusHtml;
        } else if (tipo === 'splitter') {
          var grau = cobj.grau || 1;
          var spColor = grau === 1 ? '#7c3aed' : grau === 2 ? '#a855f7' : '#c084fc';
          var spNode = nodeHtml(depth, spColor, 'fa-code-branch', spColor,
            cobj.nome || cid, 'Grau ' + grau + ' · ' + (cobj.ratio || ''), '');
          return spNode + renderSubtree(cid, depth + 1);
        } else {
          return nodeHtml(depth, '#64748b', 'fa-circle', '#94a3b8',
            cobj.nome || cid, tipo, '') + renderSubtree(cid, depth + 1);
        }
      }).join('');
    }

    // Caminho: OLT → PON → DGO → arvore infra
    var ponLabel  = ponCfg.label || ('Slot ' + slot + ' PON ' + port);
    var ponActive = ponCfg.active ? '<span style="color:#22c55e;font-size:.7rem">● Ativa</span>' : '<span style="color:#ef4444;font-size:.7rem">○ Inativa</span>';
    var ponVlan   = ponCfg.vlan   ? '<span style="color:#64748b;font-size:.7rem">VLAN ' + ponCfg.vlan + '</span>' : '';

    var subtree = renderSubtree(dgoId, 2);
    var noSubtree = !subtree.trim();

    var html = ''
      // OLT
      + nodeHtml(0, '#ef4444', 'fa-server', '#fca5a5', olt.name || oltId, (olt.ip_address || '') + ' · ' + (olt.model || ''), '')
      // PON
      + '<div style="margin-left:14px;font-size:.7rem;color:#4f6272;padding:2px 0"><i class="fas fa-long-arrow-alt-down"></i> cordão</div>'
      + nodeHtml(1, '#3b82f6', 'fa-plug', '#93c5fd', ponLabel, 'SL' + slot + ' PON' + port + ' · ' + (ponCfg.speed || '1G GPON'), ' ' + ponActive + ' ' + ponVlan)
      // DGO
      + (dgoId
        ? ('<div style="margin-left:' + (1*18+14) + 'px;font-size:.7rem;color:#4f6272;padding:2px 0"><i class="fas fa-long-arrow-alt-down"></i> fibra ' + (fiberKey || '') + '</div>'
          + nodeHtml(1, '#0ea5e9', 'fa-network-wired', '#7dd3fc',
              dgo.nome || dgoId,
              (dgo.tube_count||12) + 'T × ' + (dgo.fiber_per_tube||12) + 'F', ''))
        : '')
      // Subtree (Splitters → CTOs → ONUs)
      + (dgoId
        ? (noSubtree
            ? '<div style="margin-left:36px;font-size:.77rem;color:#475569;font-style:italic;padding:8px 0">Sem splitters/CTOs vinculados ao DGO na infraestrutura</div>'
            : subtree)
        : '');

    var rc2 = document.getElementById('olt-rastreio-content');
    if (rc2) rc2.innerHTML = html;
  }).catch(function(err) {
    var rc3 = document.getElementById('olt-rastreio-content');
    if (rc3) rc3.innerHTML = '<span style="color:#ef4444"><i class="fas fa-exclamation-triangle"></i> Erro: ' + err.message + '</span>';
  });
};

// ── Configuração de slot — quantidade de PONs por slot ──────────────
window.sdrSlotConfig = function(oltId, slot, currentCount) {
  var existing = document.getElementById('sdr-slot-cfg-modal');
  if (existing) existing.remove();

  var html = '<div class="modal-overlay open" id="sdr-slot-cfg-modal" onclick="if(event.target===this)this.remove()">'
    + '<div class="modal-box" style="max-width:360px">'
    + '<div class="modal-header">'
    + '<h3 style="font-size:.95rem"><i class="fas fa-sliders-h" style="color:#6366f1;margin-right:8px"></i>Configurar Slot ' + slot + '</h3>'
    + '<button onclick="document.getElementById(\'sdr-slot-cfg-modal\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer">&times;</button>'
    + '</div>'
    + '<div class="modal-body">'
    + '<div class="form-group">'
    + '<label>Quantidade de PONs neste slot</label>'
    + '<select id="slot-cfg-poncount" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem">'
    + [4,8,16,32].map(function(n) {
        return '<option value="' + n + '"' + (n === currentCount ? ' selected' : '') + '>' + n + ' PONs por slot</option>';
      }).join('')
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>Nome / Descrição do slot (opcional)</label>'
    + '<input id="slot-cfg-label" placeholder="Ex: Slot ' + slot + ' — Bairro Norte" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem">'
    + '</div>'
    + '<div style="font-size:.78rem;color:#64748b;background:#f8fafc;border-radius:6px;padding:8px 12px">'
    + '<i class="fas fa-info-circle" style="color:#3b82f6;margin-right:4px"></i>'
    + 'A alteração afeta <b>somente este slot</b>. Os outros slots mantêm a configuração global da OLT.'
    + '</div>'
    + '</div>'
    + '<div class="modal-footer">'
    + '<button class="btn-secondary" onclick="document.getElementById(\'sdr-slot-cfg-modal\').remove()">Cancelar</button>'
    + '<button class="btn-primary" onclick="sdrSlotConfigSave(\'' + oltId + '\',' + slot + ')"><i class="fas fa-save"></i> Salvar Slot</button>'
    + '</div>'
    + '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
  // Preencher label existente assincronamente
  sdrRef('olt_connections/' + oltId + '/slots/' + slot).once('value').then(function(snap) {
    var slotCfg = snap.val() || {};
    var labelEl = document.getElementById('slot-cfg-label');
    if (labelEl && slotCfg.label) labelEl.value = slotCfg.label;
    // Atualizar select com valor real do Firebase (sobrescreve currentCount)
    var selEl = document.getElementById('slot-cfg-poncount');
    if (selEl && slotCfg.pon_count) selEl.value = String(slotCfg.pon_count);
  });
};

window.sdrSlotConfigSave = function(oltId, slot) {
  var ponCount = parseInt(document.getElementById('slot-cfg-poncount').value) || 8;
  var label    = (document.getElementById('slot-cfg-label').value || '').trim();
  var updates  = {};
  updates['olt_connections/' + oltId + '/slots/' + slot + '/pon_count'] = ponCount;
  if (label) updates['olt_connections/' + oltId + '/slots/' + slot + '/label'] = label;
  sdrRef('').update(updates).then(function() {
    if (typeof toast === 'function') toast('Slot ' + slot + ' configurado com ' + ponCount + ' PONs!', 'success');
    document.getElementById('sdr-slot-cfg-modal').remove();
    if (document.getElementById('olt-panel-content') && window._sdrActiveOltTab === oltId) {
      sdrOltInlineRender(oltId);
    }
  }).catch(function(e) {
    if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
  });
};

// ── Destacar um cordão (clique no cordão, PON ou fibra) ────────────
window._sdrCordHighlight = function(ponKey) {
  var svg = document.getElementById('olt-cords-svg');
  if (!svg) return;
  // Escurecer todos
  svg.querySelectorAll('.olt-cord-vis').forEach(function(el) {
    el.setAttribute('stroke', '#312e81');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('opacity', '0.35');
  });
  // Iluminar o selecionado
  var g = document.getElementById('cord-' + ponKey);
  if (g) {
    var vis = g.querySelector('.olt-cord-vis');
    if (vis) {
      vis.setAttribute('stroke', '#e0e7ff');
      vis.setAttribute('stroke-width', '3.5');
      vis.setAttribute('opacity', '1');
    }
    // Info toast
    var mm = ponKey.match(/^s(\d+)_p(\d+)$/);
    if (mm && typeof toast === 'function') {
      toast('Cordão: SL' + mm[1] + ' PON' + mm[2] + ' — clique noutra área para desfazer destaque', 'info');
    }
  }
  // Restaurar após 4s
  setTimeout(function() {
    svg.querySelectorAll('.olt-cord-vis').forEach(function(el) {
      el.setAttribute('stroke', '#6366f1');
      el.setAttribute('stroke-width', '2.5');
      el.setAttribute('opacity', '1');
    });
  }, 4000);
};

// ══════════════════════════════════════════════════════════════════════
// ── EDITOR DE CORDÃO — arrastar waypoints + adicionar/remover pontos ──
// ══════════════════════════════════════════════════════════════════════

window._sdrCordEdit = null; // { oltId, slot, port, ponKey, dgoId, fiberKey, pts:[{x,y}...], dragging }

// Retorna todos os pontos do cordão: PON → waypoints → fibra DGO
window._sdrCordEditAllPts = function() {
  var m = window._sdrCordEdit;
  if (!m) return [];
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return m.pts.slice();
  var saRect = sa.getBoundingClientRect();
  var pts = [];

  var ponBtn = document.getElementById('pon-btn-' + m.oltId + '-' + m.slot + '-' + m.port);
  if (ponBtn) {
    var br = ponBtn.getBoundingClientRect();
    pts.push({ x: br.left - saRect.left + br.width,      // borda direita PON
               y: br.top  - saRect.top  + sa.scrollTop + br.height/2, _fixed: true });
  }
  m.pts.forEach(function(p) { pts.push(p); });
  var fEl = document.getElementById('dgo-fiber-' + m.dgoId + '-' + m.fiberKey);
  if (fEl) {
    var fr = fEl.getBoundingClientRect();
    pts.push({ x: fr.left - saRect.left + fr.width,      // borda direita fibra DGO
               y: fr.top  - saRect.top  + sa.scrollTop + fr.height/2, _fixed: true });
  }
  return pts;
};

window._sdrCordEditStart = function(oltId, slot, port, dgoId, fiberKey) {
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return;
  var ponKey = 's' + slot + '_p' + port;

  sdrRef('olt_connections/' + oltId + '/pons/' + ponKey + '/cord_path').once('value').then(function(snap) {
    var saved  = snap.val() || [];
    var saW    = sa.clientWidth  || 1;
    var saH    = sa.scrollHeight || 1;
    var pts    = saved.map(function(wp) { return { x: wp.x * saW, y: wp.y * saH }; });

    window._sdrCordEdit = { oltId: oltId, slot: slot, port: port, ponKey: ponKey,
                            dgoId: dgoId, fiberKey: fiberKey, pts: pts, dragging: null };

    // Banner
    var banner = document.getElementById('olt-cord-banner');
    if (banner) {
      banner.style.display = 'flex';
      var txt = document.getElementById('olt-cord-banner-text');
      if (txt) txt.textContent =
        'Editando SL' + slot + ' PON' + port + ' — clique no painel para adicionar pontos; arraste pontos para mover; botão dir. para remover';
      // Botão Cancelar já existe; adicionar Salvar dinamicamente
      if (!document.getElementById('olt-cord-edit-save-btn')) {
        var saveBtn = document.createElement('button');
        saveBtn.id = 'olt-cord-edit-save-btn';
        saveBtn.textContent = '✓ Salvar';
        saveBtn.style.cssText = 'background:#16a34a;border:none;color:#fff;cursor:pointer;font-size:.78rem;padding:3px 10px;border-radius:4px;margin-left:6px';
        saveBtn.onclick = _sdrCordEditSave;
        banner.appendChild(saveBtn);
      }
    }

    // Cursor crosshair no scroll area
    sa.style.cursor = 'crosshair';

    _sdrCordEditRender();
    if (typeof toast === 'function') toast('Clique para adicionar pontos • Arraste para mover • Botão dir. para remover', 'info');
  });
};

window._sdrCordEditRender = function() {
  var m = window._sdrCordEdit;
  if (!m) return;
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return;
  var saH = Math.max(sa.scrollHeight, sa.clientHeight, 600);
  var saRect = sa.getBoundingClientRect();

  // Remover SVG anterior
  var old = document.getElementById('olt-cord-edit-svg');
  if (old) old.remove();

  var svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.id = 'olt-cord-edit-svg';
  // pointer-events:none no fundo do SVG — os elementos interativos (polyline hit, dots) definem pointer-events próprios
  // Isso garante que botões do banner acima do SVG recebam cliques normalmente
  svgEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;overflow:visible;z-index:30;cursor:crosshair;pointer-events:none';
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', saH);

  var allPts = _sdrCordEditAllPts();
  var ptsStr = allPts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

  // Área de clique larga na polyline (para inserir pontos)
  if (allPts.length >= 2) {
    var hit = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    hit.setAttribute('points', ptsStr);
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '16');
    hit.setAttribute('fill', 'none');
    hit.setAttribute('pointer-events', 'stroke');
    hit.style.cursor = 'copy';
    // Clique na linha = inserir waypoint no segmento mais próximo
    hit.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var m2 = window._sdrCordEdit;
      if (!m2 || m2.dragging !== null) return;
      var r = sa.getBoundingClientRect();
      var cx = ev.clientX - r.left;
      var cy = ev.clientY - r.top + sa.scrollTop;
      // Encontrar o segmento mais próximo (ignorando pontos fixos nas extremidades)
      var wp = _sdrCordEditAllPts();
      var bestSeg = 0, bestDist = Infinity;
      for (var i = 0; i < wp.length - 1; i++) {
        var mx = (wp[i].x + wp[i+1].x) / 2, my = (wp[i].y + wp[i+1].y) / 2;
        var d = Math.hypot(cx - mx, cy - my);
        if (d < bestDist) { bestDist = d; bestSeg = i; }
      }
      // Inserir após bestSeg mas antes de qualquer ponto fixo
      // bestSeg 0 = entre PON (fixo) e primeiro waypoint → inserir no início
      // bestSeg N-1 = entre último waypoint e fibra (fixo) → inserir no fim
      var hasStartFixed = (_sdrCordEditAllPts()[0] || {})._fixed;
      var insertIdx = hasStartFixed ? bestSeg : bestSeg; // dentro de m.pts
      var wpIdx = hasStartFixed ? Math.max(0, bestSeg) : bestSeg;
      m2.pts.splice(wpIdx, 0, { x: cx, y: cy });
      _sdrCordEditRender();
    });
    svgEl.appendChild(hit);

    // Polyline visível com dash
    var vis = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    vis.setAttribute('points', ptsStr);
    vis.setAttribute('stroke', '#a5b4fc');
    vis.setAttribute('stroke-width', '2.5');
    vis.setAttribute('stroke-dasharray', '8,4');
    vis.setAttribute('fill', 'none');
    vis.setAttribute('pointer-events', 'none');
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = '<filter id="cedit-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur stdDeviation="2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svgEl.appendChild(defs);
    vis.setAttribute('filter', 'url(#cedit-glow)');
    svgEl.appendChild(vis);
  }

  // Pontos fixos (PON + fibra DGO) — losangos cinza
  allPts.forEach(function(p) {
    if (!p._fixed) return;
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    var s = 8;
    d.setAttribute('points', (p.x)+','+(p.y-s)+' '+(p.x+s)+','+(p.y)+' '+(p.x)+','+(p.y+s)+' '+(p.x-s)+','+(p.y));
    d.setAttribute('fill', '#64748b');
    d.setAttribute('stroke', '#e2e8f0');
    d.setAttribute('stroke-width', '1.5');
    d.setAttribute('pointer-events', 'none');
    svgEl.appendChild(d);
  });

  // Waypoints draggáveis (pontos editáveis)
  m.pts.forEach(function(pt, idx) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('pointer-events', 'all');
    g.style.cursor = 'grab';

    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', pt.x);
    dot.setAttribute('cy', pt.y);
    dot.setAttribute('r', m.dragging === idx ? '10' : '8');
    dot.setAttribute('fill', m.dragging === idx ? '#4f46e5' : '#6366f1');
    dot.setAttribute('stroke', '#e0e7ff');
    dot.setAttribute('stroke-width', '2');
    dot.setAttribute('pointer-events', 'all');

    // Número do ponto
    var lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x', pt.x + 12); lbl.setAttribute('y', pt.y + 4);
    lbl.setAttribute('font-size', '9'); lbl.setAttribute('fill', '#c7d2fe');
    lbl.setAttribute('pointer-events', 'none');
    lbl.textContent = idx + 1;

    // Drag: mousedown
    g.addEventListener('mousedown', function(ev) {
      ev.stopPropagation(); ev.preventDefault();
      var m3 = window._sdrCordEdit;
      if (m3) { m3.dragging = idx; _sdrCordEditRender(); }
    });

    // Botão direito = remover ponto
    g.addEventListener('contextmenu', function(ev) {
      ev.preventDefault(); ev.stopPropagation();
      var m4 = window._sdrCordEdit;
      if (!m4) return;
      m4.pts.splice(idx, 1);
      _sdrCordEditRender();
    });

    g.appendChild(dot);
    g.appendChild(lbl);
    svgEl.appendChild(g);
  });

  // Rect transparente como fundo interativo (o SVG em si tem pointer-events:none,
  // mas filhos com pointer-events:all ainda recebem eventos)
  var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', 'transparent');
  bgRect.setAttribute('pointer-events', 'all');
  bgRect.style.cursor = 'crosshair';
  // Clique no fundo = adicionar waypoint no final
  bgRect.addEventListener('click', function(ev) {
    var m5 = window._sdrCordEdit;
    if (!m5 || m5.dragging !== null) return;
    var r = sa.getBoundingClientRect();
    m5.pts.push({ x: ev.clientX - r.left, y: ev.clientY - r.top + sa.scrollTop });
    _sdrCordEditRender();
  });
  svgEl.insertBefore(bgRect, svgEl.firstChild); // inserir como primeiro filho (abaixo dos outros elementos)

  sa.appendChild(svgEl);

  // Arrastar: mousemove e mouseup no document
  if (!svgEl._dragBound) {
    svgEl._dragBound = true;
    var onDocMove = function(ev) {
      var m6 = window._sdrCordEdit;
      if (!m6 || m6.dragging === null) return;
      var r = sa.getBoundingClientRect();
      var nx = ev.clientX - r.left;
      var ny = ev.clientY - r.top + sa.scrollTop;
      m6.pts[m6.dragging] = { x: nx, y: ny };
      // Update positions diretamente sem re-render completo
      var allNow = _sdrCordEditAllPts();
      var pStr   = allNow.map(function(p) { return p.x + ',' + p.y; }).join(' ');
      var poly   = svgEl.querySelector('polyline[stroke="#a5b4fc"]');
      var phit   = svgEl.querySelector('polyline[stroke="transparent"]');
      if (poly) poly.setAttribute('points', pStr);
      if (phit) phit.setAttribute('points', pStr);
      var dots = svgEl.querySelectorAll('circle');
      dots.forEach(function(d, i) { d.setAttribute('cx', m6.pts[i].x); d.setAttribute('cy', m6.pts[i].y); });
      var lbls = svgEl.querySelectorAll('text');
      lbls.forEach(function(l, i) { l.setAttribute('x', m6.pts[i].x + 12); l.setAttribute('y', m6.pts[i].y + 4); });
    };
    var onDocUp = function() {
      var m7 = window._sdrCordEdit;
      if (m7 && m7.dragging !== null) {
        m7.dragging = null;
        _sdrCordEditRender(); // re-render limpo ao soltar
      }
    };
    document.addEventListener('mousemove', onDocMove);
    document.addEventListener('mouseup',  onDocUp);
    // Cleanup quando edição terminar
    window._sdrCordEditCleanupListeners = function() {
      document.removeEventListener('mousemove', onDocMove);
      document.removeEventListener('mouseup',  onDocUp);
    };
  }
};

window._sdrCordEditSave = function() {
  var m = window._sdrCordEdit;
  if (!m) return;
  var sa = document.getElementById('olt-scroll-area');
  var saW = sa ? sa.clientWidth  || 1 : 1;
  var saH = sa ? sa.scrollHeight || 1 : 1;

  // Converter pixel → fração
  var cordPath = m.pts.map(function(p) {
    return { x: Math.round(p.x / saW * 10000) / 10000,
             y: Math.round(p.y / saH * 10000) / 10000 };
  });

  sdrRef('olt_connections/' + m.oltId + '/pons/' + m.ponKey + '/cord_path').set(cordPath).then(function() {
    if (typeof toast === 'function') toast('Percurso do cordão salvo! (' + cordPath.length + ' pontos)', 'success');
    _sdrCordEditCancel();
    sdrOltInlineRender(m.oltId);
  }).catch(function(e) {
    if (typeof toast === 'function') toast('Erro ao salvar: ' + e.message, 'error');
  });
};

window._sdrCordEditCancel = function() {
  var m = window._sdrCordEdit;
  window._sdrCordEdit = null;

  // Limpar listeners globais
  if (typeof window._sdrCordEditCleanupListeners === 'function') {
    window._sdrCordEditCleanupListeners();
    window._sdrCordEditCleanupListeners = null;
  }

  // Remover SVG de edição
  var svg = document.getElementById('olt-cord-edit-svg');
  if (svg) svg.remove();

  // Remover botão Salvar do banner
  var saveBtn = document.getElementById('olt-cord-edit-save-btn');
  if (saveBtn) saveBtn.remove();

  // Esconder banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) banner.style.display = 'none';

  // Restaurar cursor
  var sa = document.getElementById('olt-scroll-area');
  if (sa) sa.style.cursor = '';

  // Re-desenhar cordões salvos (com o percurso original intacto se Cancelar)
  if (m) {
    var oldTab = window._sdrActiveOltTab;
    if (oldTab && document.getElementById('olt-panel-content')) {
      sdrOltInlineRender(oldTab);
    }
  }
};

// ── Posicionar OLT no mapa ──────────────────────────────────────────
// ── OLT CRUD — MIGRADO para src/olt/crud.js (sdr-bundle.js) ─────────────
// sdrOltStartMapPlace, _sdrCancelOltPlace, sdrMapClickCapture override,
// sdrOltsRender (Sprint 4), sdrOltAddModal, sdrOltModalCriarDgo,
// sdrOltSave, sdrOltDelete, sdrOpenOltPanel → window.xxx via sdr-bundle.js
window.sdrOltStartMapPlace = window.sdrOltStartMapPlace || function() {};
window._sdrCancelOltPlace  = window._sdrCancelOltPlace  || function() {};
window.sdrOltsRender       = window.sdrOltsRender       || function() {};
window.sdrOltAddModal      = window.sdrOltAddModal      || function() {};
window.sdrOltModalCriarDgo = window.sdrOltModalCriarDgo || function() {};
window.sdrOltSave          = window.sdrOltSave          || async function() {};
window.sdrOltDelete        = window.sdrOltDelete        || async function() {};
window.sdrOpenOltPanel     = window.sdrOpenOltPanel     || function() {};

// ── OLT VISUAL + PON + DGO — MIGRADO para src/olt/visual.js ─────────────
// sdrOltVisualModal, sdrPonConfig, sdrPonDgoChange, sdrPonSave,
// sdrPonSelectFiber, sdrDgo144Modal, sdrDgo144View, sdrFiberSelect,
// sdrDgoCriarModal, sdrDgoCalc, sdrDgoSalvar, sdrOltSlotAdd → window.xxx via sdr-bundle.js
window.sdrOltVisualModal   = window.sdrOltVisualModal   || function() {};
window.sdrPonConfig        = window.sdrPonConfig        || function() {};
window.sdrPonDgoChange     = window.sdrPonDgoChange     || function() {};
window.sdrPonSave          = window.sdrPonSave          || function() {};
window.sdrPonSelectFiber   = window.sdrPonSelectFiber   || function() {};
window.sdrDgo144Modal      = window.sdrDgo144Modal      || function() {};
window.sdrDgo144View       = window.sdrDgo144View       || function() {};
window.sdrFiberSelect      = window.sdrFiberSelect      || function() {};
window.sdrDgoCriarModal    = window.sdrDgoCriarModal    || function() {};
window.sdrDgoCalc          = window.sdrDgoCalc          || function() {};
window.sdrDgoSalvar        = window.sdrDgoSalvar        || function() {};
window.sdrOltSlotAdd       = window.sdrOltSlotAdd       || function() {};

// ── ONUs — MIGRADO para src/onus/index.js (sdr-bundle.js) ─────────────────
// sdrOnusRender, sdrOnusFilter, sdrOnuAdd, sdrOnuEdit, sdrOnuSave
// sdrOnuDelete, sdrOpenOnuPanel → window.xxx via sdr-bundle.js
window.sdrOnusRender    = window.sdrOnusRender    || function() {};
window.sdrOnusFilter    = window.sdrOnusFilter    || function() {};
window.sdrOnuAdd        = window.sdrOnuAdd        || function() {};
window.sdrOnuEdit       = window.sdrOnuEdit       || function() {};
window.sdrOnuSave       = window.sdrOnuSave       || function() {};
window.sdrOnuDelete     = window.sdrOnuDelete     || function() {};
window.sdrOpenOnuPanel  = window.sdrOpenOnuPanel  || function() {};

// SPRINT 3 — ALERTAS MELHORADOS (auto-geração)
// ════════════════════════════════════════════════════

// Gerar alertas baseado em status de ONUs
window.sdrCheckAlerts = window.sdrCheckAlerts || async function() {};

// Botão para gerar alertas no render de alertas
const _origAlertasRender = window.sdrAlertasRender;
window.sdrAlertasRender = function() {
  _origAlertasRender();
  // Adicionar botão de check após render
  setTimeout(() => {
    const el = document.getElementById('alertas-lista');
    if (el) {
      const btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'text-align:center;margin-top:14px;padding:8px';
      btnWrap.innerHTML = `<button class="btn-map" onclick="sdrCheckAlerts()" style="padding:8px 16px;font-size:.82rem"><i class="fas fa-sync-alt" style="margin-right:4px"></i>Verificar ONUs e gerar alertas</button>`;
      el.appendChild(btnWrap);
    }
  }, 200);
};

// ════════════════════════════════════════════════════
// SPRINT 4 — HEATMAP + DASHBOARD CHARTS + TICKETS
// ════════════════════════════════════════════════════

// ── 4A: HEATMAP DE SINAL ──
// ── HEATMAP — MIGRADO para src/map/heatmap.js ──────────────────────────
// sdrRenderHeatmap → window.sdrRenderHeatmap via sdr-bundle.js
// Hook sdrMapReloadData → still here in IIFE to call window.sdrRenderHeatmap after reload
const _origMapReload = sdrMapReloadData;
sdrMapReloadData = function() {
  _origMapReload();
  setTimeout(function() { if (typeof window.sdrRenderHeatmap === 'function') window.sdrRenderHeatmap(); }, 500);
};
window.sdrMapReloadData = sdrMapReloadData;


// ── 4B: DASHBOARD REDE COM GRÁFICOS ──
window.sdrDashRedeRender = window.sdrDashRedeRender || function() {};


// ── 4C: TICKETS DE REDE — migrado para src/tickets/index.js (Fase 16) ──
window.sdrTicketsRender   = window.sdrTicketsRender   || function() {};
window.sdrTicketsFilter   = window.sdrTicketsFilter   || function() {};
window.sdrTicketAdd       = window.sdrTicketAdd       || function() {};
window.sdrTicketEdit      = window.sdrTicketEdit      || function() {};
window.sdrTicketSave      = window.sdrTicketSave      || function() {};
window.sdrTicketResolve   = window.sdrTicketResolve   || function() {};
window.sdrTicketDelete    = window.sdrTicketDelete    || function() {};
window.sdrOpenTicketPanel = window.sdrOpenTicketPanel || function() {};
window.sdrTicketPrintOS   = window.sdrTicketPrintOS   || function() {};

// ── Relatório de Inadimplentes ──
window.sdrRelatorioInadimplentes = window.sdrRelatorioInadimplentes || function() {};

// ── MAPA BASE — MIGRADO para src/map/heatmap.js ─────────────────────────
// SDR_TILE_URLS, sdrHybridLabels, sdrMapChangeBase → window.xxx via sdr-bundle.js
window.sdrHybridLabels   = window.sdrHybridLabels   || null;
window.sdrMapChangeBase  = window.sdrMapChangeBase  || function() {};


// ════════════════════════════════════════════════════════════════
// SPRINT 5 — MAPA FTTH PROFISSIONAL
// Import KMZ/KML • Cores do KMZ • CTOs com Portas • Cabos Avançados
// Modo Desenho • Diagrama Unifilar
// ════════════════════════════════════════════════════════════════

// ── Estado Sprint 5 ──
// ── GIS Draw block — MIGRADO para src/map/draw.js (sdr-bundle.js) ─────────
// sdrDrawModeToggle, _sdrStartDraw, _sdrCloseDrawMode, _sdrSaveDrawing etc.
// window.sdrDrawModeToggle, window._sdrStartDraw, window._sdrStartEditMode
// window._sdrUndoPt, window._sdrFinalizeDraw, window._sdrToggleSnap
// window._sdrSaveDrawing → todos via sdr-bundle.js (carregado antes)
let sdrDrawPoints     = []; // legado (não usado)
let sdrDrawPolyline   = null;
let sdrDrawTmpMarkers = [];
// ── KMZ block — MIGRADO para src/map/kmz.js (sdr-bundle.js) ────────────────
// sdrImportKMZ, sdrHandleKMZFile, sdrKMZCancelImport, sdrKMZConfirmImport
// _fiberColors, _fiberNames, _tubeColors → window.xxx via sdr-bundle.js
window._sdrKMZFeatures = window._sdrKMZFeatures || [];
// sdrKMZLayer agora gerenciado em src/map/kmz.js
let sdrKMZLayer = null; // alias local para compatibilidade com legado

// ── Viabilidade — MIGRADO para src/viab/index.js (sdr-bundle.js) ─────────
// sdrViabilidadeToggle, sdrViabilidadeCheck → window.xxx via sdr-bundle.js
window.sdrViabilidadeToggle = window.sdrViabilidadeToggle || function() {};
window.sdrViabilidadeCheck  = window.sdrViabilidadeCheck  || function() {};

// ────────────────────────────────────────────────
// B. DETALHES DO CABO
// ────────────────────────────────────────────────


// ────────────────────────────────────────────────
// C. MODAL DE CLICK NA CTO / CEO / RT / SPLITTER
// Inclui Power Budget, clientes, viabilidade
// ────────────────────────────────────────────────
window.sdrCTOPortsModal = window.sdrCTOPortsModal || function() {}; // migrado → src/cto/index.js

// sdrCableDetailModal — versao completa (arquivo estava truncado)
window.sdrCableDetailModal = window.sdrCableDetailModal || function() {}; // migrado → src/cto/index.js

// HTML DAS PAGINAS SDR
// IDs devem bater exatamente com o que as funções de render buscam via getElementById
window._sdrHtml_dash_rede = window._sdrHtml_dash_rede || function() { return ''; };

window._sdrHtml_clientes = window._sdrHtml_clientes || function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-users" style="color:var(--primary)"></i> Clientes FTTH</h2>'
    // IDs corretos que _renderClientesLista usa
    +'<input id="clientes-search" type="text" placeholder="Buscar cliente..." oninput="sdrClientesFilter()" style="padding:6px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;width:200px">'
    +'<select id="clientes-filter-status" onchange="sdrClientesFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem">'
    +'<option value="">Todos</option><option value="adimplente">Adimplentes</option><option value="inadimplente">Inadimplentes</option>'
    +'</select>'
    +'<button class="btn-map" onclick="sdrClienteAdd()" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Novo</button>'
    +'<button class="btn-map" onclick="document.getElementById(\'clientes-import-input\').click()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-import"></i> Importar</button>'
    +'<button class="btn-map" onclick="sdrAutoLinkCTO()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-link"></i> Auto-Link CTO</button>'
    +'<button class="btn-map" onclick="sdrRelatorioInadimplentes()" style="padding:6px 14px;font-size:.8rem;background:#dc2626;color:#fff;border-color:#b91c1c" title="Relatório de Inadimplentes"><i class="fas fa-exclamation-triangle"></i> Inadimplentes</button>'
    +'<input type="file" id="clientes-import-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="sdrImportClientes(this)">'
    +'</div>'
    +'<div id="clientes-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="clientes-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

// _sdrHtml_olts definida na Sprint 4 (linha ~2098) — não redefinir aqui

window._sdrHtml_onus = window._sdrHtml_onus || function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-router" style="color:var(--primary)"></i> ONUs</h2>'
    // IDs corretos que _renderOnusLista usa: filter-olt, filter-status, onus-search
    +'<input id="onus-search" type="text" placeholder="Buscar serial/cliente..." oninput="sdrOnusFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem;width:190px">'
    +'<select id="onus-filter-olt" onchange="sdrOnusFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todas as OLTs</option></select>'
    +'<select id="onus-filter-status" onchange="sdrOnusFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todos os Status</option><option value="online">Online</option><option value="offline">Offline</option><option value="degraded">Degradado</option></select>'
    +'<button class="btn-map" onclick="sdrOnusRender()" style="padding:6px 10px;font-size:.8rem"><i class="fas fa-sync-alt"></i></button>'
    +'<button class="btn-map" onclick="sdrOnuAdd()" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Nova ONU</button>'
    +'</div>'
    +'<div id="onus-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="onus-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_alertas = window._sdrHtml_alertas || function() {
  return '<div style="max-width:900px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-bell" style="color:#d97706"></i> Alertas de Rede</h2>'
    +'<button class="btn-map" onclick="sdrCheckAlerts()" style="padding:6px 14px;font-size:.8rem;background:#d97706;color:#fff;border-color:#b45309"><i class="fas fa-search"></i> Verificar Agora</button>'
    +'<button class="btn-map" onclick="sdrAlertasRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'</div>'
    +'<div id="alertas-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_tickets = window._sdrHtml_tickets || function() { return ''; };

// Filtro de clientes — stub (bundle define versão definitiva)
window.sdrClientesFiltrar = window.sdrClientesFiltrar || function(q) {
  q = (q||'').toLowerCase().trim();
  var cards = document.querySelectorAll('#clientes-lista .infra-card[data-search]');
  cards.forEach(function(c) {
    c.style.display = (!q || c.dataset.search.toLowerCase().includes(q)) ? '' : 'none';
  });
};

// CSS das paginas SDR
(function(){
  if (document.getElementById('sdr-extra-css')) return;
  var st = document.createElement('style');
  st.id = 'sdr-extra-css';
  st.textContent = [
    '.sdr-kpi-card{background:#fff;border-radius:12px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08);display:flex;flex-direction:column;align-items:center;gap:8px}',
    '.sdr-kpi-icon{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem}',
    '.sdr-kpi-val{font-size:1.8rem;font-weight:800;color:#1e293b;line-height:1}',
    '.sdr-kpi-lbl{font-size:.75rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em}',
    '#page-dash-rede{display:none!important}#page-dash-rede.active{display:block!important}',
    '#page-clientes{display:none!important}#page-clientes.active{display:block!important}',
    '#page-olts{display:none!important}#page-olts.active{display:flex!important;flex-direction:column;overflow:hidden;padding:0!important}',
    '#page-olts #olts-page{flex:1;min-height:0;display:flex;flex-direction:column}',
    /* Esconder scrollbar interno do painel OLT sem afetar o resto do app */
    '#page-olts *::-webkit-scrollbar{width:0;height:0;background:transparent}',
    '#page-olts *{scrollbar-width:none}',
    '#page-onus{display:none!important}#page-onus.active{display:block!important}',
    '#page-alertas{display:none!important}#page-alertas.active{display:block!important}',
    '#page-tickets{display:none!important}#page-tickets.active{display:block!important}',
    '#page-mk-config{display:none!important}#page-mk-config.active{display:block!important}',
    /* ── Context Menu (padrão IQGeo/OSPInsight) ── */
    '#sdr-ctx-wrap{position:fixed;z-index:99999}',
    '#sdr-ctx-menu{background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.14),0 1px 4px rgba(0,0,0,.06);padding:5px;min-width:200px}',
    '.sdr-ctx-item{padding:8px 14px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:.83rem;transition:background .1s;white-space:nowrap}',
    '.sdr-ctx-item:hover{background:#f1f5f9}',
    '.sdr-ctx-item i{width:15px;text-align:center;flex-shrink:0}',
    '.sdr-ctx-sep{height:1px;background:#f1f5f9;margin:4px 0}',
    '.sdr-ctx-label{font-size:.7rem;font-weight:700;color:#94a3b8;padding:8px 14px 2px;text-transform:uppercase;letter-spacing:.04em}',
    /* ── Botão ⋮ nas linhas de tabela ── */
    '.sdr-row-menu{opacity:.35;transition:opacity .15s;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:1rem;color:#374151}',
    '.sdr-row-menu:hover{opacity:1;background:#f1f5f9}',
    'tr:hover .sdr-row-menu{opacity:.7}',
    /* ── Card hover-reveal ── */
    '.sdr-card-actions{opacity:.4;transition:opacity .15s}',
    '.infra-card:hover .sdr-card-actions{opacity:1}'
  ].join('');
  document.head.appendChild(st);
})();

// ============================================================
// MK SOLUTIONS — Página de Configuração e Integração
// ============================================================

window._sdrHtml_mk_config = window._sdrHtml_mk_config || function() { return ''; };

// ---- MK: Render (carrega config salva do Firebase) ----
// ── Fase 17: MK integração → sdr-bundle.js (mk/index.js) ──
window.sdrMkConfigRender  = window.sdrMkConfigRender  || function() {};
window.sdrMkSaveConfig    = window.sdrMkSaveConfig    || function() {};
window.sdrMkTestarConexao = window.sdrMkTestarConexao || function() {};
window.sdrMkSyncAll       = window.sdrMkSyncAll       || function() {};
window.sdrMkGetConexao    = window.sdrMkGetConexao    || function() {};
window.sdrMkAbrirOS       = window.sdrMkAbrirOS       || function() {};
window.sdrMkDesbloquear   = window.sdrMkDesbloquear   || function() {};
window.sdrMkDemoTopologia = window.sdrMkDemoTopologia || function() {};
window.sdrMkDemoOlts      = window.sdrMkDemoOlts      || function() {};
window.sdrMkDemoOnus      = window.sdrMkDemoOnus      || function() {};
window.sdrMkDemoClientes  = window.sdrMkDemoClientes  || function() {};


// ---- Topologia FTTH — Árvore Visual ----
// ── Fase 18: Topologia + CtxMenu + MoveMarker + CSV → sdr-bundle.js (ui/index.js) ──
window.sdrTopologiaToggle  = window.sdrTopologiaToggle  || function() {};
window.sdrTopologiaRender  = window.sdrTopologiaRender  || function() {};
window._sdrCtxReg          = window._sdrCtxReg          || {};
window.sdrCtxMenu          = window.sdrCtxMenu          || function() {};
window.sdrCtxClose         = window.sdrCtxClose         || function() {};
window.sdrMoveMarker       = window.sdrMoveMarker       || function() {};
window.sdrMoveConfirmMarker= window.sdrMoveConfirmMarker|| function() {};
window.sdrMoveCancelMarker = window.sdrMoveCancelMarker || function() {};
window._sdrCtxOlt          = window._sdrCtxOlt          || function() { return []; };
window._sdrCtxOnu          = window._sdrCtxOnu          || function() { return []; };
window._sdrCtxCliente      = window._sdrCtxCliente      || function() { return []; };
window._sdrCtxInfra        = window._sdrCtxInfra        || function() { return []; };
window.sdrClientesFiltrar  = window.sdrClientesFiltrar  || function() {};
window.sdrExportClientesCSV= window.sdrExportClientesCSV|| function() {};
window.sdrExportOnusCSV    = window.sdrExportOnusCSV    || function() {};

// ── Fase 19: Realtime + Alertas + Templates → sdr-bundle.js (realtime/index.js) ──
window._sdrInitRealtime     = window._sdrInitRealtime     || function() {};
window._sdrUpdateAlertBadge = window._sdrUpdateAlertBadge || function() {};
window.sdrAlertaAbrirTicket = window.sdrAlertaAbrirTicket || function() {};
window.sdrAlertasRender     = window.sdrAlertasRender     || function() {};
window._sdrHtml_clientes    = window._sdrHtml_clientes    || function() { return ''; };
window._sdrHtml_onus        = window._sdrHtml_onus        || function() { return ''; };
window._sdrHtml_alertas     = window._sdrHtml_alertas     || function() { return ''; };
window.sdrOnusFiltrar       = window.sdrOnusFiltrar       || function() {};
window.sdrConverterCtoCeo   = window.sdrConverterCtoCeo   || function() {};
window.sdrConverterRtNome   = window.sdrConverterRtNome   || function() {};



// Fecha a IIFE (function(){"use strict"; ...}) que envolve todo o codigo SDR
}());
