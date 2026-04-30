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


// ── Cord Drawing + Slots + Rastreabilidade + CordEdit — MIGRADO para src/olt/cord.js ──
window.sdrOltSlotInsert         = window.sdrOltSlotInsert         || function() {};
window.sdrOltSlotRemove         = window.sdrOltSlotRemove         || function() {};
window.sdrPonCordStart          = window.sdrPonCordStart          || function() {};
window.sdrCordDrawCancel        = window.sdrCordDrawCancel        || function() {};
window.sdrCordConnectFiber      = window.sdrCordConnectFiber      || function() {};
window._sdrCordDrawFromFiber    = window._sdrCordDrawFromFiber    || function() {};
window._sdrCordFinishFiberToPon = window._sdrCordFinishFiberToPon || function() {};
window._sdrCordSvgUpdate        = window._sdrCordSvgUpdate        || function() {};
window._sdrDrawSavedCords       = window._sdrDrawSavedCords       || function() {};
window._sdrRastreabilidade      = window._sdrRastreabilidade      || function() {};
window.sdrSlotConfig            = window.sdrSlotConfig            || function() {};
window.sdrSlotConfigSave        = window.sdrSlotConfigSave        || function() {};
window._sdrCordHighlight        = window._sdrCordHighlight        || function() {};
window._sdrCordEdit             = window._sdrCordEdit             || null;
window._sdrCordEditAllPts       = window._sdrCordEditAllPts       || function() {};
window._sdrCordEditStart        = window._sdrCordEditStart        || function() {};
window._sdrCordEditRender       = window._sdrCordEditRender       || function() {};
window._sdrCordEditSave         = window._sdrCordEditSave         || function() {};
window._sdrCordEditCancel       = window._sdrCordEditCancel       || function() {};
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
