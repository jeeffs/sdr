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
const SDR_TENANT = 'default_tenant';
const SDR_BASE = `sdr_comercial/${SDR_TENANT}`;
const INFRA_TYPES = {
  pole:     {label:'Poste',             icon:'fa-bolt',           color:'#d97706', iconClass:'pole'},
  cto:      {label:'CTO',               icon:'fa-box',            color:'#2563eb', iconClass:'cto'},
  ceo:      {label:'CEO',               icon:'fa-project-diagram',color:'#2563eb', iconClass:'cto'},
  rt:       {label:'Reserva Técnica',   icon:'fa-tape',           color:'#16a34a', iconClass:'cable'},
  emd:      {label:'Emenda',            icon:'fa-link',           color:'#0891b2', iconClass:'cto'},
  spl:      {label:'Splitter',          icon:'fa-code-branch',    color:'#9333ea', iconClass:'splitter'},
  cable:    {label:'Cabo',              icon:'fa-wave-square',    color:'#16a34a', iconClass:'cable'},
  splitter: {label:'Splitter',          icon:'fa-code-branch',    color:'#9333ea', iconClass:'splitter'},
  olt:      {label:'OLT',               icon:'fa-server',         color:'#dc2626', iconClass:'olt'}
};

// ── PADRÃO DE CORES DE FIBRA ──
// ABNT NBR 14100 (Brasil) e TIA-598 (EUA/Internacional)
const SDR_FIBER_STANDARDS = {
  abnt: {
    name: 'ABNT NBR 14100 (Brasil)',
    short: 'ABNT',
    fibers: [
      { num:1,  color:'#16a34a', name:'Verde' },
      { num:2,  color:'#eab308', name:'Amarelo' },
      { num:3,  color:'#ffffff', name:'Branco', border:'#999' },
      { num:4,  color:'#2563eb', name:'Azul' },
      { num:5,  color:'#dc2626', name:'Vermelho' },
      { num:6,  color:'#7c3aed', name:'Violeta' },
      { num:7,  color:'#8b4513', name:'Marrom' },
      { num:8,  color:'#ec4899', name:'Rosa' },
      { num:9,  color:'#000000', name:'Preto' },
      { num:10, color:'#6b7280', name:'Cinza' },
      { num:11, color:'#f97316', name:'Laranja' },
      { num:12, color:'#06b6d4', name:'Aqua' }
    ],
    // ABNT: T1=Verde (piloto), T2=Amarelo (direcional), demais=Branco
    tubeColor: function(tubeNum) {
      if (tubeNum===1) return { color:'#16a34a', name:'Verde (piloto)' };
      if (tubeNum===2) return { color:'#eab308', name:'Amarelo (direcional)' };
      return { color:'#ffffff', name:'Branco', border:'#999' };
    }
  },
  tia: {
    name: 'TIA-598 (EUA/Internacional)',
    short: 'TIA-598',
    fibers: [
      { num:1,  color:'#2563eb', name:'Blue' },
      { num:2,  color:'#f97316', name:'Orange' },
      { num:3,  color:'#16a34a', name:'Green' },
      { num:4,  color:'#8b4513', name:'Brown' },
      { num:5,  color:'#6b7280', name:'Slate' },
      { num:6,  color:'#ffffff', name:'White', border:'#999' },
      { num:7,  color:'#dc2626', name:'Red' },
      { num:8,  color:'#000000', name:'Black' },
      { num:9,  color:'#eab308', name:'Yellow' },
      { num:10, color:'#7c3aed', name:'Violet' },
      { num:11, color:'#ec4899', name:'Rose' },
      { num:12, color:'#06b6d4', name:'Aqua' }
    ],
    // TIA: Tubos seguem sequência TIA-598 completa
    tubeColor: function(tubeNum) {
      const colors = this.fibers;
      const idx = (tubeNum-1) % 12;
      return { color:colors[idx].color, name:colors[idx].name, border:colors[idx].border };
    }
  }
};

// Configuração de tubos por tamanho de cabo
const SDR_CABLE_TUBE_CONFIG = {
  6:   [{ fibers:6 }],                                                        // 1×6
  12:  [{ fibers:12 }],                                                       // 1×12 (padrão)
  '12_2x6':  [{ fibers:6 },{ fibers:6 }],                                    // 2×6
  '12_6x2':  [{ fibers:2 },{ fibers:2 },{ fibers:2 },{ fibers:2 },{ fibers:2 },{ fibers:2 }], // 6×2
  24:  [{ fibers:6 },{ fibers:6 },{ fibers:6 },{ fibers:6 }],                // 4×6
  36:  [{ fibers:6 },{ fibers:6 },{ fibers:6 },{ fibers:6 },{ fibers:6 },{ fibers:6 }], // 6×6
  48:  [{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 }],            // 4×12
  72:  [{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 }], // 6×12
  144: [{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 },
        { fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 },{ fibers:12 }]  // 12×12
};

// Perdas de inserção — Splitters Furukawa (dB típicos @1550nm)
const SDR_SPLITTER_LOSS = {
  balanced: {
    '1:2':  { loss: 3.7, uniformity: 0.5 },
    '1:4':  { loss: 7.1, uniformity: 0.6 },
    '1:8':  { loss: 10.5, uniformity: 1.0 },
    '1:16': { loss: 13.7, uniformity: 1.3 },
    '1:32': { loss: 17.1, uniformity: 1.6 },
    '1:64': { loss: 20.5, uniformity: 2.0 }
  },
  unbalanced: {
    '50/50': { loss_p1: 3.7, loss_p2: 3.7 },
    '30/70': { loss_p1: 5.9, loss_p2: 2.0 },
    '20/80': { loss_p1: 7.9, loss_p2: 1.4 },
    '15/85': { loss_p1: 9.6, loss_p2: 1.0 },
    '10/90': { loss_p1: 11.0, loss_p2: 0.7 }
  }
};

// Topologias de splitagem conhecidas
const SDR_SPLITTER_TOPOLOGIES = {
  '128': {
    label: '128 portas/PON (balanceada)',
    levels: [
      { grau: 1, ratio: '1:2', loss: 3.7 },
      { grau: 2, ratio: '1:8', loss: 10.5 },
      { grau: 3, ratio: '1:8', loss: 10.5 }
    ],
    totalPorts: 128,
    totalLoss: 24.7
  },
  '512': {
    label: '512 portas/PON (balanceada)',
    levels: [
      { grau: 1, ratio: '1:2', loss: 3.7 },
      { grau: 2, ratio: '1:16', loss: 13.7 },
      { grau: 3, ratio: '1:16', loss: 13.7 }
    ],
    totalPorts: 512,
    totalLoss: 31.1
  },
  '192': {
    label: '192 portas/PON (desbalanceada)',
    levels: [
      { grau: 1, ratio: '1:2', loss: 3.7 },
      { grau: 2, ratio: '1:4', loss: 7.1 },
      { grau: 3, ratio: '1:8', loss: 10.5 }
    ],
    note: '4 splitters 1:4 no 2º grau × 8 no 3º = 4×4×8 + 4×8 + … = ~192',
    totalPorts: 192,
    totalLoss: 21.3
  }
};

function _getTubeConfig(fiberCount) {
  return SDR_CABLE_TUBE_CONFIG[fiberCount] || [{ fibers: fiberCount }];
}
function _getTubeColor(tubeNum) {
  return SDR_FIBER_STANDARDS[sdrFiberStandard].tubeColor(tubeNum);
}
let sdrFiberStandard = localStorage.getItem('sdr_fiber_standard') || 'abnt';

window.sdrSetFiberStandard = function(std) {
  sdrFiberStandard = std;
  localStorage.setItem('sdr_fiber_standard', std);
  // Atualizar indicador
  const el = document.getElementById('fiber-std-label');
  if (el) el.textContent = std === 'tia' ? 'TIA' : 'ABNT';
};

window.sdrShowFiberStandardModal = function() {
  const existing = document.getElementById('modal-fiber-std');
  if (existing) existing.remove();

  const std = SDR_FIBER_STANDARDS[sdrFiberStandard];
  const other = sdrFiberStandard === 'abnt' ? 'tia' : 'abnt';
  const otherStd = SDR_FIBER_STANDARDS[other];

  function renderFiberGrid(s, key) {
    const fibers = s.fibers;
    // Gerar tubos dinamicamente usando tubeColor() — mostra até 12 tubos como referência
    const maxTubes = 12;
    let html = `<div style="margin-bottom:14px">`;
    html += `<div style="font-weight:700;font-size:.82rem;color:#1e293b;margin-bottom:8px"><i class="fas fa-circle" style="font-size:8px;color:#2563eb;margin-right:6px"></i>Fibras (${fibers.length} cores)</div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px">`;
    fibers.forEach(f => {
      html += `<div style="text-align:center;padding:6px 2px;background:#f8fafc;border-radius:6px;border:1px solid #e5e7eb">
        <div style="width:22px;height:22px;border-radius:50%;background:${f.color};border:2px solid ${f.border||f.color};margin:0 auto 3px"></div>
        <div style="font-size:.65rem;font-weight:700;color:#1e293b">${f.num}</div>
        <div style="font-size:.58rem;color:#64748b">${f.name}</div>
      </div>`;
    });
    html += `</div>`;
    html += `<div style="font-weight:700;font-size:.82rem;color:#1e293b;margin:10px 0 8px"><i class="fas fa-grip-lines" style="font-size:8px;color:#16a34a;margin-right:6px"></i>Tubos (até ${maxTubes})</div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px">`;
    for (let i = 1; i <= maxTubes; i++) {
      const tc = s.tubeColor(i);
      html += `<div style="text-align:center;padding:6px 2px;background:#f8fafc;border-radius:6px;border:1px solid #e5e7eb">
        <div style="width:28px;height:10px;border-radius:3px;background:${tc.color};border:1.5px solid ${tc.border||tc.color};margin:0 auto 3px"></div>
        <div style="font-size:.65rem;font-weight:700;color:#1e293b">T${i}</div>
        <div style="font-size:.55rem;color:#64748b">${tc.name}</div>
      </div>`;
    }
    html += `</div></div>`;
    return html;
  }

  const modal = document.createElement('div');
  modal.id = 'modal-fiber-std';
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:1rem;color:#1e293b"><i class="fas fa-palette" style="color:#8b5cf6;margin-right:8px"></i>Padrão de Cores de Fibra</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:2px">Selecione o padrão usado nos cabos da sua rede</div>
        </div>
        <button onclick="document.getElementById('modal-fiber-std').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b">✕</button>
      </div>
      <div style="padding:16px 20px;overflow-y:auto;flex:1">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div onclick="sdrSetFiberStandard('abnt');document.getElementById('modal-fiber-std').remove()"
               style="cursor:pointer;border:2px solid ${sdrFiberStandard==='abnt'?'#2563eb':'#e5e7eb'};border-radius:12px;padding:14px;transition:.2s;${sdrFiberStandard==='abnt'?'background:#eff6ff':'background:#fff'}">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:1.2rem">🇧🇷</span>
              <div>
                <div style="font-weight:700;font-size:.88rem;color:#1e293b">ABNT NBR 14100</div>
                <div style="font-size:.7rem;color:#64748b">Padrão Brasileiro</div>
              </div>
              ${sdrFiberStandard==='abnt'?'<i class="fas fa-check-circle" style="color:#2563eb;margin-left:auto"></i>':''}
            </div>
            ${renderFiberGrid(SDR_FIBER_STANDARDS.abnt, 'abnt')}
          </div>
          <div onclick="sdrSetFiberStandard('tia');document.getElementById('modal-fiber-std').remove()"
               style="cursor:pointer;border:2px solid ${sdrFiberStandard==='tia'?'#2563eb':'#e5e7eb'};border-radius:12px;padding:14px;transition:.2s;${sdrFiberStandard==='tia'?'background:#eff6ff':'background:#fff'}">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font-size:1.2rem">🇺🇸</span>
              <div>
                <div style="font-weight:700;font-size:.88rem;color:#1e293b">TIA-598</div>
                <div style="font-size:.7rem;color:#64748b">Padrão Americano/Internacional</div>
              </div>
              ${sdrFiberStandard==='tia'?'<i class="fas fa-check-circle" style="color:#2563eb;margin-left:auto"></i>':''}
            </div>
            ${renderFiberGrid(SDR_FIBER_STANDARDS.tia, 'tia')}
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

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
  sdrLayers.clients.clearLayers();
  Object.entries(sdrClientesCache).forEach(([id, c]) => {
    if (!c || !c.lat || !c.lng) return;
    const status = c.financial_status === 'inadimplente' ? 'client-off' :
                   c.onu_status === 'offline' ? 'client-bad' :
                   c.onu_status === 'degraded' ? 'client-warn' : 'client-ok';
    const marker = L.marker([c.lat, c.lng], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: `<div class="marker-icon ${status}"><i class="fas fa-user"></i></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    marker.bindTooltip(`<b>${c.name||'Cliente'}</b><br>${c.plan_name||''} · ${c.onu_status||''}`, {direction:'top', offset:[0,-14]});
    marker.on('click', () => window.sdrOpenClientePanel(id, c));
    marker.on('contextmenu', (e) => { L.DomEvent.preventDefault(e); L.DomEvent.stopPropagation(e); sdrCtxMenu(e.originalEvent, _sdrCtxCliente(id)); });
    sdrLayers.clients.addLayer(marker);
  });
}

function sdrMapRenderOlts() {
  sdrLayers.olts.clearLayers();

  // 1. OLTs gerenciadas via painel OLTs (olt_connections)
  Object.entries(sdrOltsCache).forEach(([id, o]) => {
    if (!o || !o.lat || !o.lng) return;
    const marker = L.marker([o.lat, o.lng], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: `<div class="marker-icon olt"><i class="fas fa-server"></i></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    marker.bindTooltip(`<b>${o.name||'OLT'}</b><br>${o.model||''} · ${o.ip_address||''}`, {direction:'top', offset:[0,-14]});
    marker.on('click', function() {
      // Click simples → navega para aba OLTs e abre painel inline do chassis
      if (typeof showPage === 'function') showPage('olts');
      setTimeout(function() { sdrOltTabSwitch(id); }, 250);
    });
    marker.on('contextmenu', (e) => { L.DomEvent.preventDefault(e); L.DomEvent.stopPropagation(e); sdrCtxMenu(e.originalEvent, _sdrCtxOlt(id)); });
    sdrLayers.olts.addLayer(marker);
  });

  // 2. OLTs de infraestrutura (type='olt' em sdrInfraCache) — itens editados no mapa
  // Evitar conflito: sdrMapRenderInfra tentaria adicionar ao sdrLayers.olts mas
  // sdrMapRenderOlts limparia logo após. Tratamos aqui para garantir visibilidade.
  if (window.sdrInfraCache) {
    Object.entries(sdrInfraCache).forEach(function(entry) {
      var iid = entry[0], item = entry[1];
      if (!item || item.type !== 'olt' || !item.lat || !item.lng) return;
      // Já está em olt_connections? Não duplicar
      if (sdrOltsCache[iid]) return;
      var imarker = L.marker([item.lat, item.lng], {
        icon: L.divIcon({
          className: 'leaflet-div-icon',
          html: '<div class="marker-icon olt"><i class="fas fa-server"></i></div>',
          iconSize: [28, 28], iconAnchor: [14, 14]
        })
      });
      imarker.bindTooltip('<b>' + (item.name || item.code || 'OLT') + '</b>', {direction:'top', offset:[0,-14]});
      imarker.on('click', function() { sdrOpenInfraPanel(iid, item); });
      imarker.on('contextmenu', function(e) { L.DomEvent.stopPropagation(e); L.DomEvent.preventDefault(e); sdrOpenInfraPanel(iid, item); });
      sdrLayers.olts.addLayer(imarker);
    });
  }
}

function _infraPopup(id, item) {
  // cto_type 'ceo'/'rt'/'emd'/'spl' sobrescreve o tipo base para o label correto
  const _effType = (item.cto_type && INFRA_TYPES[item.cto_type]) ? item.cto_type : item.type;
  const cfg = INFRA_TYPES[_effType] || INFRA_TYPES.pole;
  let html = `<b>${cfg.label}: ${item.name||item.code||id}</b>`;
  if (item.code) html += `<br>Código: ${item.code}`;
  if (item.total_ports) html += `<br>Portas: ${item.used_ports||0}/${item.total_ports}`;
  if (item.concessionaria) html += `<br>Concess.: ${item.concessionaria}`;
  if (item.fiber_count) html += `<br>Fibras: ${item.fiber_count}`;
  return html;
}

function sdrUpdateMapInfo() {
  const infra = Object.values(sdrInfraCache);
  const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  _set('mi-poles', infra.filter(i=>i.type==='pole').length);
  _set('mi-ctos', infra.filter(i=>i.type==='cto'||i.type==='splitter').length);
  _set('mi-cables', infra.filter(i=>i.type==='cable').length);
  _set('mi-clients', Object.keys(sdrClientesCache).length);
  _set('mi-olts', Object.keys(sdrOltsCache).length);
}

window.sdrMapInfoToggle = function() {
  var panel = document.getElementById('map-info');
  var body  = document.getElementById('map-info-body');
  var chev  = document.getElementById('map-info-chev');
  var btn   = document.getElementById('map-info-toggle');
  if (!panel) return;
  var collapsed = panel.getAttribute('data-collapsed') === '1';
  if (collapsed) {
    // Expandir
    panel.style.width = '260px';
    panel.style.minWidth = '260px';
    panel.style.padding = '12px';
    if (body) body.style.display = '';
    if (chev) chev.style.transform = 'rotate(0deg)';
    if (btn)  btn.title = 'Minimizar painel';
    panel.setAttribute('data-collapsed', '0');
    if (sdrMap) setTimeout(function(){ sdrMap.invalidateSize(); }, 240);
  } else {
    // Minimizar
    panel.style.width = '28px';
    panel.style.minWidth = '28px';
    panel.style.padding = '0';
    if (body) body.style.display = 'none';
    if (chev) chev.style.transform = 'rotate(180deg)';
    if (btn)  btn.title = 'Expandir painel';
    panel.setAttribute('data-collapsed', '1');
    if (sdrMap) setTimeout(function(){ sdrMap.invalidateSize(); }, 240);
  }
};

window.sdrMapToggleLayer = function(layer) {
  sdrLayerVisible[layer] = !sdrLayerVisible[layer];
  const btn = document.getElementById('ml-' + layer);
  if (btn) btn.classList.toggle('active', sdrLayerVisible[layer]);
  if (sdrLayerVisible[layer]) {
    if (sdrLayers[layer]) sdrMap.addLayer(sdrLayers[layer]);
  } else {
    if (sdrLayers[layer]) sdrMap.removeLayer(sdrLayers[layer]);
  }
};

window.sdrMapCenterOnMe = function() {
  if (!navigator.geolocation) { toast('GPS não disponível','error'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    sdrMap.setView([pos.coords.latitude, pos.coords.longitude], 16);
    L.marker([pos.coords.latitude, pos.coords.longitude], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: '<div style="width:16px;height:16px;background:#2563eb;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(37,99,235,.5)"></div>',
        iconSize: [16,16], iconAnchor: [8,8]
      })
    }).addTo(sdrMap).bindPopup('Você está aqui');
  }, () => toast('Não foi possível obter sua posição','error'));
};

window.sdrMapAddItem = function() {
  _sdrShowAddModal(null, null);
};

// ════════════════════════════════════════════════════
// PAINEL LATERAL
// ════════════════════════════════════════════════════

window.sdrOpenInfraPanel = function(id, item) {
  // cto_type 'ceo'/'rt'/'emd'/'spl' sobrescreve o tipo base para label/icon corretos
  const _effType = (item.cto_type && INFRA_TYPES[item.cto_type]) ? item.cto_type : item.type;
  const cfg = INFRA_TYPES[_effType] || INFRA_TYPES.pole;
  const spTitle = document.getElementById('sp-title');
  const spBody = document.getElementById('sp-body');
  const spPanel = document.getElementById('sdr-side-panel');
  if (!spTitle || !spBody || !spPanel) { console.warn('[SDR] Side panel elements not found'); return; }
  spTitle.textContent = `${cfg.label}: ${item.name||item.code||''}`;
  let html = '';

  // Reserva Técnica — exibe apenas metragem
  var isRT = item.cto_type === 'rt' || (item.name || '').toUpperCase() === 'RT';
  if (isRT) {
    var metros = item.comprimento_m || item.metragem_m || item.length_m || '';
    html += '<div class="sp-section">'
      + '<div class="sp-section-title"><i class="fas fa-tape" style="color:#16a34a"></i> Reserva Técnica de Cabo</div>'
      + '<div style="text-align:center;padding:18px 0">'
      + '<div style="font-size:2.5rem;font-weight:800;color:#16a34a">' + (metros || '—') + (metros ? '<span style="font-size:1rem;font-weight:400;color:#64748b"> m</span>' : '') + '</div>'
      + '<div style="font-size:.8rem;color:#64748b;margin-top:4px">Metragem reservada</div>'
      + '</div>'
      + (item.lat && item.lng ? '<div class="sp-row"><span class="sp-label">Coordenadas</span><span class="sp-val">' + item.lat.toFixed(5) + ', ' + item.lng.toFixed(5) + '</span></div>' : '')
      + (item.notes ? '<div class="sp-row"><span class="sp-label">Observações</span><span class="sp-val">' + item.notes + '</span></div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:8px;margin-top:16px">'
      + '<button class="btn-primary" onclick="sdrRtEditMetragem(\'' + id + '\',' + (metros||0) + ')" style="flex:1;padding:8px"><i class="fas fa-ruler"></i> Definir Metragem</button>'
      + '<button class="btn-primary" onclick="sdrInfraEdit(\'' + id + '\')" style="padding:8px 14px"><i class="fas fa-edit"></i></button>'
      + '<button class="btn-danger" onclick="sdrInfraDelete(\'' + id + '\')" style="padding:8px 16px"><i class="fas fa-trash"></i></button>'
      + '</div>';
    document.getElementById('sp-body').innerHTML = html;
    document.getElementById('sdr-side-panel').classList.add('open');
    return;
  }

  html += `<div class="sp-section">
    <div class="sp-section-title"><i class="fas ${cfg.icon}" style="color:${cfg.color}"></i> Informações</div>
    <div class="sp-row"><span class="sp-label">Tipo</span><span class="sp-val">${cfg.label}</span></div>`;
  if (item.name) html += `<div class="sp-row"><span class="sp-label">Nome</span><span class="sp-val">${item.name}</span></div>`;
  if (item.code) html += `<div class="sp-row"><span class="sp-label">Código</span><span class="sp-val">${item.code}</span></div>`;
  if (item.lat && item.lng) html += `<div class="sp-row"><span class="sp-label">Coordenadas</span><span class="sp-val">${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}</span></div>`;
  if (item.concessionaria) html += `<div class="sp-row"><span class="sp-label">Concessionária</span><span class="sp-val">${item.concessionaria}</span></div>`;
  if (item.total_ports != null) {
    const pct = item.total_ports > 0 ? Math.round((item.used_ports||0)/item.total_ports*100) : 0;
    const color = pct > 85 ? '#dc2626' : pct > 60 ? '#d97706' : '#16a34a';
    html += `<div class="sp-row"><span class="sp-label">Portas</span><span class="sp-val" style="color:${color}">${item.used_ports||0}/${item.total_ports} (${pct}%)</span></div>`;
  }
  if (item.fiber_count) html += `<div class="sp-row"><span class="sp-label">Fibras</span><span class="sp-val">${item.fiber_count}</span></div>`;
  if (item.length_meters) html += `<div class="sp-row"><span class="sp-label">Comprimento</span><span class="sp-val">${item.length_meters}m</span></div>`;
  if (item.notes) html += `<div class="sp-row"><span class="sp-label">Observações</span><span class="sp-val">${item.notes}</span></div>`;
  html += `</div>`;

  // Botões de ação
  html += `<div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn-primary" onclick="sdrInfraEdit('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    <button class="btn-danger" onclick="sdrInfraDelete('${id}')" style="padding:8px 16px"><i class="fas fa-trash"></i></button>
  </div>`;

  spBody.innerHTML = html;
  spPanel.classList.add('open');
}

function sdrOpenClientePanel(id, c) {
  document.getElementById('sp-title').textContent = c.name || 'Cliente';
  let html = '';

  // Bloco 1: Dados ERP
  html += `<div class="sp-section">
    <div class="sp-section-title"><i class="fas fa-user" style="color:#2563eb"></i> Dados do Cliente</div>
    <div class="sp-row"><span class="sp-label">Nome</span><span class="sp-val">${c.name||'-'}</span></div>`;
  if (c.cpf_cnpj) html += `<div class="sp-row"><span class="sp-label">CPF/CNPJ</span><span class="sp-val">${c.cpf_cnpj}</span></div>`;
  if (c.phone) html += `<div class="sp-row"><span class="sp-label">Telefone</span><span class="sp-val">${c.phone}</span></div>`;
  if (c.email) html += `<div class="sp-row"><span class="sp-label">Email</span><span class="sp-val">${c.email}</span></div>`;
  if (c.address) html += `<div class="sp-row"><span class="sp-label">Endereço</span><span class="sp-val">${c.address}</span></div>`;
  if (c.plan_name) html += `<div class="sp-row"><span class="sp-label">Plano</span><span class="sp-val">${c.plan_name} ${c.plan_speed_down?'('+c.plan_speed_down+'M)':''}</span></div>`;
  if (c.plan_price) html += `<div class="sp-row"><span class="sp-label">Valor</span><span class="sp-val">R$ ${parseFloat(c.plan_price).toFixed(2)}</span></div>`;
  const fStatus = c.financial_status || 'adimplente';
  const fColor = fStatus === 'adimplente' ? '#16a34a' : '#dc2626';
  html += `<div class="sp-row"><span class="sp-label">Financeiro</span><span class="sp-val" style="color:${fColor}">${fStatus.toUpperCase()}</span></div>`;
  html += `</div>`;

  // Bloco 2: ONU (se vinculada)
  if (c.onu_serial || c.onu_id) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-wifi" style="color:#d97706"></i> ONU</div>`;
    if (c.onu_serial) html += `<div class="sp-row"><span class="sp-label">Serial</span><span class="sp-val">${c.onu_serial}</span></div>`;
    if (c.onu_status) {
      const badge = c.onu_status==='online'?'good':c.onu_status==='degraded'?'warn':c.onu_status==='offline'?'bad':'off';
      html += `<div class="sp-row"><span class="sp-label">Status</span><span class="signal-badge ${badge}">${c.onu_status.toUpperCase()}</span></div>`;
    }
    if (c.rx_power != null) {
      const rxBadge = c.rx_power > -25 ? 'good' : c.rx_power > -28 ? 'warn' : 'bad';
      html += `<div class="sp-row"><span class="sp-label">Sinal Rx</span><span class="signal-badge ${rxBadge}">${c.rx_power} dBm</span></div>`;
    }
    if (c.tx_power != null) html += `<div class="sp-row"><span class="sp-label">Sinal Tx</span><span class="sp-val">${c.tx_power} dBm</span></div>`;
    html += `</div>`;
  }

  // Bloco 3: Infraestrutura
  if (c.cto_id || c.pole_id) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-network-wired" style="color:#16a34a"></i> Infraestrutura</div>`;
    if (c.cto_id && sdrInfraCache[c.cto_id]) {
      const cto = sdrInfraCache[c.cto_id];
      html += `<div class="sp-row"><span class="sp-label">CTO</span><span class="sp-val">${cto.name||cto.code||c.cto_id} ${c.cto_port?'(porta '+c.cto_port+')':''}</span></div>`;
    }
    if (c.pole_id && sdrInfraCache[c.pole_id]) {
      const pole = sdrInfraCache[c.pole_id];
      html += `<div class="sp-row"><span class="sp-label">Poste</span><span class="sp-val">${pole.name||pole.code||c.pole_id}</span></div>`;
    }
    html += `</div>`;
  }

  // Botões
  html += `<div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn-primary" onclick="sdrClienteEdit('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    <button class="btn-map" onclick="sdrMapFlyTo(${c.lat},${c.lng})" style="padding:8px 16px"><i class="fas fa-map-pin"></i> Ver no Mapa</button>
  </div>`;

  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
}

window.sdrCloseSidePanel = function() {
  document.getElementById('sdr-side-panel').classList.remove('open');
};

window.sdrMapFlyTo = function(lat, lng) {
  if (sdrMap) { sdrMap.flyTo([lat, lng], 17); }
};

// ════════════════════════════════════════════════════
// MODAL DE CADASTRO (INFRAESTRUTURA)
// ════════════════════════════════════════════════════

// Flag: mapa em modo "capturar clique para coordenadas"
let _sdrMapClickMode = false;

// Ativar/desativar modo de clique no mapa para capturar coordenadas
window.sdrToggleMapClickMode = function() {
  _sdrMapClickMode = !_sdrMapClickMode;
  const btn = document.getElementById('btn-map-click-mode');
  const mapEl = document.getElementById('sdr-map');
  if (_sdrMapClickMode) {
    if (btn) { btn.style.background='#ef4444'; btn.title='Clique no mapa para definir posição (ativo)'; btn.innerHTML='<i class="fas fa-map-pin"></i> Clicando no mapa...'; }
    if (mapEl) mapEl.style.cursor = 'crosshair';
    toast('Clique no mapa para definir a posição','info');
  } else {
    if (btn) { btn.style.background=''; btn.title='Clique no mapa para capturar coordenadas'; btn.innerHTML='<i class="fas fa-map-marker-alt"></i> Clicar no mapa'; }
    if (mapEl) mapEl.style.cursor = '';
  }
};

// Chamado pelo listener de clique no mapa (registrado em sdrRenderMap)
window.sdrMapClickCapture = function(lat, lng) {
  if (!_sdrMapClickMode) return false;
  const latEl = document.getElementById('sdr-f-lat');
  const lngEl = document.getElementById('sdr-f-lng');
  if (latEl) latEl.value = lat.toFixed(6);
  if (lngEl) lngEl.value = lng.toFixed(6);
  // Desativar modo após captura
  _sdrMapClickMode = false;
  const btn = document.getElementById('btn-map-click-mode');
  const mapEl = document.getElementById('sdr-map');
  if (btn) { btn.style.background='#16a34a'; btn.innerHTML='<i class="fas fa-check"></i> Posição capturada!'; setTimeout(()=>{ btn.style.background=''; btn.innerHTML='<i class="fas fa-map-marker-alt"></i> Clicar no mapa'; },2000); }
  if (mapEl) mapEl.style.cursor = '';
  toast('Coordenadas capturadas: '+lat.toFixed(5)+', '+lng.toFixed(5),'success');
  return true; // consumiu o clique
};

function _sdrShowAddModal(editId, editData) {
  const isEdit = !!editId;
  const d = editData || {};
  const title = isEdit ? 'Editar Item' : 'Cadastrar Infraestrutura';

  // Card flutuante e arrastável (sem overlay de fundo)
  const card = document.createElement('div');
  card.id = 'sdr-modal';
  card.style.cssText = [
    'position:fixed',
    'top:80px',
    'right:20px',
    'z-index:9998',
    'width:360px',
    'background:#fff',
    'border-radius:14px',
    'box-shadow:0 8px 40px rgba(0,0,0,.28)',
    'display:flex',
    'flex-direction:column',
    'overflow:hidden',
    'border:1.5px solid #e2e8f0',
    'user-select:none'
  ].join(';');

  card.innerHTML = `
    <div id="sdr-modal-drag-handle" style="padding:12px 16px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:space-between;cursor:grab;border-radius:14px 14px 0 0">
      <div style="display:flex;align-items:center;gap:8px">
        <i class="fas fa-grip-horizontal" style="opacity:.7;font-size:.8rem"></i>
        <span style="font-weight:700;font-size:.9rem"><i class="fas fa-${isEdit?'edit':'plus-circle'}" style="margin-right:6px"></i>${title}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:.65rem;opacity:.75;cursor:default">arraste para mover</span>
        <button onclick="sdrCancelMapClickMode();document.getElementById('sdr-modal').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center">&times;</button>
      </div>
    </div>
    <div style="padding:14px 16px;overflow-y:auto;max-height:70vh;display:flex;flex-direction:column;gap:8px">
      <div class="form-group">
        <label>Tipo</label>
        <select id="sdr-f-type">
          ${Object.entries(INFRA_TYPES).map(([k,v]) => `<option value="${k}" ${d.type===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Nome</label>
        <input id="sdr-f-name" value="${d.name||''}" placeholder="Ex: CTO-001, Poste Rua Tal">
      </div>
      <div class="form-group">
        <label>Código</label>
        <input id="sdr-f-code" value="${d.code||''}" placeholder="Código identificador">
      </div>
      <div style="display:flex;gap:8px">
        <div class="form-group" style="flex:1">
          <label>Latitude</label>
          <input id="sdr-f-lat" type="number" step="any" value="${d.lat||''}" placeholder="-23.1862">
        </div>
        <div class="form-group" style="flex:1">
          <label>Longitude</label>
          <input id="sdr-f-lng" type="number" step="any" value="${d.lng||''}" placeholder="-46.8842">
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button id="btn-map-click-mode" onclick="sdrToggleMapClickMode()" title="Clique no mapa para capturar coordenadas"
          style="flex:1;padding:7px 10px;background:#0ea5e9;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.75rem;font-weight:600;transition:.2s">
          <i class="fas fa-map-marker-alt"></i> Clicar no mapa
        </button>
        <button onclick="sdrGetGPS()" title="Usar GPS do dispositivo"
          style="padding:7px 12px;background:#7c3aed;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.75rem">
          <i class="fas fa-crosshairs"></i> GPS
        </button>
      </div>
      <div id="sdr-f-extra"></div>
      <div class="form-group">
        <label>Observações</label>
        <textarea id="sdr-f-notes" rows="2" style="resize:vertical">${d.notes||''}</textarea>
      </div>
      <div class="form-group">
        <label>Foto</label>
        <input id="sdr-f-photo" type="file" accept="image/*" capture="environment" style="font-size:.82rem">
      </div>
    </div>
    <div style="padding:10px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px">
      <button onclick="sdrCancelMapClickMode();document.getElementById('sdr-modal').remove()" style="flex:1;padding:8px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font-size:.82rem">Cancelar</button>
      <button onclick="sdrInfraSave('${editId||''}')" style="flex:1;padding:8px;background:var(--primary);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.82rem;font-weight:600">${isEdit?'<i class="fas fa-save"></i> Salvar':'<i class="fas fa-plus"></i> Cadastrar'}</button>
    </div>
  `;

  document.body.appendChild(card);

  // ── Drag para mover o card ──
  const handle = document.getElementById('sdr-modal-drag-handle');
  let isDragging = false, startX, startY, startLeft, startTop;
  handle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    handle.style.cursor = 'grabbing';
    const rect = card.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    // Converter de right para left para arrastar
    card.style.right = 'auto';
    card.style.left = startLeft + 'px';
    card.style.top = startTop + 'px';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    card.style.left = Math.max(0, Math.min(window.innerWidth - 370, startLeft + dx)) + 'px';
    card.style.top = Math.max(0, Math.min(window.innerHeight - 100, startTop + dy)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) { isDragging = false; handle.style.cursor = 'grab'; }
  });

  // ── Marcador arrastável no mapa (edição) ──
  // Só cria se o mapa estiver ativo e o item tiver coordenadas
  var _editDragMarker = null;
  if (isEdit && d.lat && d.lng && window.sdrMap && window.sdrMapReady) {
    var editCfg = INFRA_TYPES[d.type] || INFRA_TYPES.pole;
    _editDragMarker = L.marker([d.lat, d.lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: '<div class="marker-icon ' + editCfg.iconClass + '" style="border:2px dashed #f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.4)"><i class="fas ' + editCfg.icon + '"></i></div>',
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    _editDragMarker.bindTooltip('Arraste para reposicionar', {permanent: false, direction: 'top', offset: [0, -14]});
    _editDragMarker.addTo(sdrMap);
    _editDragMarker.on('drag', function(ev) {
      var ll = ev.target.getLatLng();
      var latEl = document.getElementById('sdr-f-lat');
      var lngEl = document.getElementById('sdr-f-lng');
      if (latEl) latEl.value = ll.lat.toFixed(6);
      if (lngEl) lngEl.value = ll.lng.toFixed(6);
    });
    // Focar o mapa neste item
    sdrMap.setView([d.lat, d.lng], Math.max(sdrMap.getZoom(), 17));
  }

  // Remover marcador de edição quando o card for removido
  var _origRemove = card.remove.bind(card);
  card.remove = function() {
    if (_editDragMarker && window.sdrMap) { try { sdrMap.removeLayer(_editDragMarker); } catch(e) {} _editDragMarker = null; }
    _origRemove();
  };

  // Campos extras por tipo
  const typeSelect = document.getElementById('sdr-f-type');
  function updateExtras() {
    const t = typeSelect.value;
    let ex = '';
    if (t === 'cto' || t === 'splitter') {
      ex = `<div class="form-group">
        <label>Subtipo</label>
        <select id="sdr-f-cto-type">
          <option value="default"      ${(d.cto_type||'default')==='default'      ?'selected':''}>CTO (genérica)</option>
          <option value="ceo"          ${d.cto_type==='ceo'          ?'selected':''}>CEO — Caixa de Emenda Óptica</option>
          <option value="1/8"          ${d.cto_type==='1/8'          ?'selected':''}>CTO 1:8 (8 portas)</option>
          <option value="1/16"         ${d.cto_type==='1/16'         ?'selected':''}>CTO 1:16 (16 portas)</option>
          <option value="1/4"          ${d.cto_type==='1/4'          ?'selected':''}>CTO 1:4 (4 portas)</option>
          <option value="splitter"     ${d.cto_type==='splitter'     ?'selected':''}>Splitter</option>
          <option value="emenda"       ${d.cto_type==='emenda'       ?'selected':''}>Emenda</option>
          <option value="rt"           ${d.cto_type==='rt'           ?'selected':''}>RT — Reserva de Tubo</option>
          <option value="nao_instalada"${d.cto_type==='nao_instalada'?'selected':''}>Não Instalada</option>
        </select>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Portas Total</label><input id="sdr-f-total-ports" type="number" value="${d.total_ports||''}"></div>
        <div class="form-group" style="flex:1"><label>Portas Usadas</label><input id="sdr-f-used-ports" type="number" value="${d.used_ports||0}"></div>
      </div>`;
    } else if (t === 'pole') {
      ex = `<div class="form-group"><label>Concessionária</label><input id="sdr-f-concess" value="${d.concessionaria||''}"></div>`;
    } else if (t === 'cable') {
      ex = `<div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Comprimento (m)</label><input id="sdr-f-length" type="number" value="${d.length_meters||''}"></div>
        <div class="form-group" style="flex:1"><label>Nº Fibras</label><input id="sdr-f-fibers" type="number" value="${d.fiber_count||''}"></div>
      </div>`;
    } else if (t === 'olt') {
      ex = `<div class="form-group"><label>Modelo</label><input id="sdr-f-model" value="${d.model||''}" placeholder="Ex: Fiberhome AN5516-04"></div>
        <div class="form-group"><label>IP</label><input id="sdr-f-ip" value="${d.ip_address||''}"></div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>SNMP Community</label><input id="sdr-f-snmp" value="${d.snmp_community||'public'}"></div>
          <div class="form-group" style="flex:1"><label>Portas PON</label><input id="sdr-f-pon" type="number" value="${d.total_pon_ports||''}"></div>
        </div>`;
    }
    document.getElementById('sdr-f-extra').innerHTML = ex;
  }
  typeSelect.addEventListener('change', updateExtras);
  updateExtras();
}

// Cancelar modo de clique no mapa ao fechar card
window.sdrCancelMapClickMode = function() {
  if (_sdrMapClickMode) {
    _sdrMapClickMode = false;
    const mapEl = document.getElementById('sdr-map');
    if (mapEl) mapEl.style.cursor = '';
  }
};

window.sdrGetGPS = function() {
  if (!navigator.geolocation) { toast('GPS não disponível','error'); return; }
  toast('Obtendo posição GPS...','info');
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('sdr-f-lat').value = pos.coords.latitude.toFixed(6);
    document.getElementById('sdr-f-lng').value = pos.coords.longitude.toFixed(6);
    toast('Posição capturada!','success');
  }, () => toast('Erro ao obter GPS','error'), { enableHighAccuracy: true, timeout: 10000 });
};

window.sdrInfraSave = async function(editId) {
  const type = document.getElementById('sdr-f-type').value;
  const name = document.getElementById('sdr-f-name').value.trim();
  const code = document.getElementById('sdr-f-code').value.trim();
  const lat = parseFloat(document.getElementById('sdr-f-lat').value);
  const lng = parseFloat(document.getElementById('sdr-f-lng').value);
  const notes = document.getElementById('sdr-f-notes').value.trim();

  if (!name && !code) { toast('Preencha nome ou código','error'); return; }
  if (type !== 'cable' && (isNaN(lat) || isNaN(lng))) { toast('Coordenadas obrigatórias','error'); return; }

  const data = {
    type, name, code, notes,
    created_at: editId ? (sdrInfraCache[editId]?.created_at || new Date().toISOString()) : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (!isNaN(lat)) data.lat = lat;
  if (!isNaN(lng)) data.lng = lng;

  // Campos extras
  if (type === 'cto' || type === 'splitter') {
    const ct = document.getElementById('sdr-f-cto-type');
    const tp = document.getElementById('sdr-f-total-ports');
    const up = document.getElementById('sdr-f-used-ports');
    if (ct) data.cto_type = ct.value || 'default';
    if (tp) data.total_ports = parseInt(tp.value) || 0;
    if (up) data.used_ports = parseInt(up.value) || 0;
    // Porta padrão por subtipo se não informada
    if (!data.total_ports) {
      const defaultPorts = {'1/8':8,'1/16':16,'1/4':4,'ceo':12,'splitter':8,'emenda':0,'rt':0,'nao_instalada':16,'default':8};
      data.total_ports = defaultPorts[data.cto_type] || 8;
    }
  }
  if (type === 'pole') {
    const c = document.getElementById('sdr-f-concess');
    if (c) data.concessionaria = c.value.trim();
  }
  if (type === 'cable') {
    const l = document.getElementById('sdr-f-length');
    const f = document.getElementById('sdr-f-fibers');
    if (l) data.length_meters = parseFloat(l.value) || 0;
    if (f) data.fiber_count = parseInt(f.value) || 0;
  }
  if (type === 'olt') {
    const m = document.getElementById('sdr-f-model');
    const ip = document.getElementById('sdr-f-ip');
    const s = document.getElementById('sdr-f-snmp');
    const p = document.getElementById('sdr-f-pon');
    if (m) data.model = m.value.trim();
    if (ip) data.ip_address = ip.value.trim();
    if (s) data.snmp_community = s.value.trim() || 'public';
    if (p) data.total_pon_ports = parseInt(p.value) || 0;
  }

  // Foto (base64)
  const photoInput = document.getElementById('sdr-f-photo');
  if (photoInput && photoInput.files[0]) {
    try {
      data.photo_url = await _fileToBase64(photoInput.files[0]);
    } catch(e) { console.warn('Erro ao processar foto:', e); }
  }

  try {
    if (editId) {
      const oldItem = sdrInfraCache[editId] || {};
      await sdrRef(`infrastructure/${editId}`).update(data);

      // Atualizar cache local imediatamente (para refresh do mapa)
      sdrInfraCache[editId] = Object.assign({}, oldItem, data);

      // Se tipo mudou PARA OLT e ainda não tem olt_connection_id → criar entrada em olt_connections
      if (type === 'olt' && !oldItem.olt_connection_id) {
        const oltData = {
          name: data.name, model: data.model || '', ip_address: data.ip_address || '',
          snmp_community: data.snmp_community || 'public', snmp_version: 'v2c',
          lat: data.lat, lng: data.lng,
          total_pon_ports: data.total_pon_ports || 0,
          is_active: true, created_at: new Date().toISOString()
        };
        const oltRef = await sdrRef('olt_connections').push(oltData);
        await sdrRef(`infrastructure/${editId}`).update({ olt_connection_id: oltRef.key });
        sdrInfraCache[editId].olt_connection_id = oltRef.key;
        sdrOltsCache[oltRef.key] = oltData;  // update local OLT cache too
      }

      // Se tipo mudou DE OLT para outro → remover olt_connection_id do infra item
      if (type !== 'olt' && oldItem.type === 'olt' && oldItem.olt_connection_id) {
        // Não deletar olt_connections (pode ter DGOs vinculados), apenas desvincula
        await sdrRef(`infrastructure/${editId}`).update({ olt_connection_id: null });
        sdrInfraCache[editId].olt_connection_id = null;
      }

      toast('Atualizado com sucesso!','success');
    } else {
      // Se for OLT nova, salvar em olt_connections também
      if (type === 'olt') {
        const oltData = { name: data.name, model: data.model, ip_address: data.ip_address,
          snmp_community: data.snmp_community, snmp_version: 'v2c',
          lat: data.lat, lng: data.lng, total_pon_ports: data.total_pon_ports,
          is_active: true, created_at: data.created_at };
        const oltRef = await sdrRef('olt_connections').push(oltData);
        data.olt_connection_id = oltRef.key;
        sdrOltsCache[oltRef.key] = oltData;  // update local OLT cache
      }
      const newRef = await sdrRef('infrastructure').push(data);
      sdrInfraCache[newRef.key] = data;  // update local infra cache
      toast('Cadastrado com sucesso!','success');
    }

    // Refresh mapa para refletir mudanças (sem rebuscar Firebase)
    if (typeof sdrMapRenderInfra === 'function') sdrMapRenderInfra();
    if (typeof sdrMapRenderOlts === 'function') sdrMapRenderOlts();
    if (typeof sdrUpdateMapInfo === 'function') sdrUpdateMapInfo();

    const modal = document.getElementById('sdr-modal');
    if (modal) modal.remove();
    sdrCloseSidePanel();
  } catch(e) {
    console.error('Erro ao salvar:', e);
    toast('Erro ao salvar: ' + e.message,'error');
  }
};

window.sdrInfraEdit = function(id) {
  sdrCloseSidePanel();
  const item = sdrInfraCache[id];
  if (item) _sdrShowAddModal(id, item);
};

window.sdrInfraDelete = function(id) {
  if (!confirm('Excluir este item da infraestrutura?')) return;
  sdrRef(`infrastructure/${id}`).remove().then(() => {
    toast('Excluído!','success');
    sdrCloseSidePanel();
  }).catch(e => toast('Erro: ' + e.message,'error'));
};

function _fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ════════════════════════════════════════════════════
// PÁGINA INFRAESTRUTURA (LISTA/GRID)
// ════════════════════════════════════════════════════

window.sdrInfraRender = function() {
  // Carregar dados
  sdrRef('infrastructure').once('value').then(snap => {
    sdrInfraCache = snap.val() || {};
    window.sdrInfraCache = sdrInfraCache;
    _renderInfraGrid();
  });
};

function _renderInfraGrid() {
  const filterType = document.getElementById('infra-filter-type')?.value || '';
  const search = (document.getElementById('infra-search')?.value || '').toLowerCase();

  const items = Object.entries(sdrInfraCache).filter(([id, item]) => {
    if (!item) return false;
    if (filterType && item.type !== filterType) return false;
    if (search) {
      const searchable = `${item.name||''} ${item.code||''} ${item.notes||''}`.toLowerCase();
      if (!searchable.includes(search)) return false;
    }
    return true;
  });

  // Stats
  const all = Object.values(sdrInfraCache);
  const statsEl = document.getElementById('infra-stats');
  if (statsEl) {
    statsEl.innerHTML = Object.entries(INFRA_TYPES).map(([k,v]) => {
      const count = all.filter(i=>i.type===k).length;
      return `<div class="infra-stat"><div class="is-num" style="color:${v.color}">${count}</div><div class="is-label">${v.label}s</div></div>`;
    }).join('');
  }

  // Grid
  const gridEl = document.getElementById('infra-grid');
  if (!gridEl) return;

  if (items.length === 0) {
    gridEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      <i class="fas fa-map-signs" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:.4"></i>
      <p style="font-size:.9rem;margin-bottom:8px">Nenhum item cadastrado</p>
      <button class="btn-primary" onclick="sdrInfraAdd()" style="padding:8px 20px;font-size:.85rem"><i class="fas fa-plus"></i> Cadastrar primeiro item</button>
    </div>`;
    return;
  }

  gridEl.innerHTML = items.map(([id, item]) => {
    const cfg = INFRA_TYPES[item.type] || INFRA_TYPES.pole;
    let detail = '';
    if (item.total_ports) detail = `Portas: ${item.used_ports||0}/${item.total_ports}`;
    else if (item.fiber_count) detail = `${item.fiber_count} fibras | ${item.length_meters||0}m`;
    else if (item.concessionaria) detail = item.concessionaria;
    else if (item.model) detail = item.model;
    else if (item.ip_address) detail = `IP: ${item.ip_address}`;

    return `<div class="infra-card" style="cursor:pointer;position:relative" onclick="sdrOpenInfraPanel('${id}',sdrInfraCache['${id}'])" oncontextmenu="sdrCtxMenu(event,_sdrCtxInfra('${id}'))">
      <div class="ic-top">
        <div class="ic-icon ${cfg.iconClass}"><i class="fas ${cfg.icon}"></i></div>
        <div style="flex:1">
          <div class="ic-name">${item.name||item.code||id}</div>
          <div class="ic-type">${cfg.label}${item.code?' | '+item.code:''}</div>
        </div>
        <button class="sdr-row-menu" onclick="event.stopPropagation();sdrCtxMenu(event,_sdrCtxInfra('${id}'))" title="Ações" style="align-self:flex-start"><i class="fas fa-ellipsis-v"></i></button>
      </div>
      ${detail?`<div class="ic-detail">${detail}</div>`:''}
      <div class="sdr-card-actions" style="display:flex;gap:6px;margin-top:8px">
        <button onclick="event.stopPropagation();sdrOpenInfraPanel('${id}',sdrInfraCache['${id}'])" style="padding:3px 8px;font-size:.72rem;border:1px solid #e5e7eb;border-radius:5px;background:#f8fafc;cursor:pointer"><i class="fas fa-eye"></i> Ver</button>
        <button onclick="event.stopPropagation();sdrInfraEdit('${id}')" style="padding:3px 8px;font-size:.72rem;border:1px solid #e5e7eb;border-radius:5px;background:#f8fafc;cursor:pointer"><i class="fas fa-edit"></i> Editar</button>
      </div>
    </div>`;
  }).join('');
}

window.sdrInfraAdd = function() {
  _sdrShowAddModal(null, null);
};

// ════════════════════════════════════════════════════
// PÁGINA CLIENTES DA REDE
// ════════════════════════════════════════════════════

window.sdrClientesRender = function() {
  sdrRef('clients').once('value').then(snap => {
    sdrClientesCache = snap.val() || {};
    window.sdrClientesCache = sdrClientesCache;
    _renderClientesLista();
  });
};
// Filtro sem rebuscar Firebase — usa cache
window.sdrClientesFilter = function() { _renderClientesLista(); };

function _renderClientesLista() {
  const filter = document.getElementById('clientes-filter-status')?.value || '';
  const search = (document.getElementById('clientes-search')?.value || '').toLowerCase();

  const items = Object.entries(sdrClientesCache).filter(([id, c]) => {
    if (!c) return false;
    if (filter && (c.financial_status||'adimplente') !== filter) return false;
    if (search) {
      const s = `${c.name||''} ${c.cpf_cnpj||''} ${c.onu_serial||''} ${c.phone||''}`.toLowerCase();
      if (!s.includes(search)) return false;
    }
    return true;
  });

  // Stats
  const all = Object.values(sdrClientesCache);
  const statsEl = document.getElementById('clientes-stats');
  if (statsEl) {
    const total = all.length;
    const adimplentes = all.filter(c=>c.financial_status!=='inadimplente').length;
    const inadimplentes = all.filter(c=>c.financial_status==='inadimplente').length;
    const online = all.filter(c=>c.onu_status==='online').length;
    statsEl.innerHTML = `
      <div class="infra-stat"><div class="is-num">${total}</div><div class="is-label">Total</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#16a34a">${adimplentes}</div><div class="is-label">Adimplentes</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#dc2626">${inadimplentes}</div><div class="is-label">Inadimplentes</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#2563eb">${online}</div><div class="is-label">ONUs Online</div></div>`;
  }

  const el = document.getElementById('clientes-lista');
  if (!el) return;

  if (items.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      <i class="fas fa-users" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:.4"></i>
      <p>Nenhum cliente cadastrado</p>
      <button class="btn-primary" onclick="sdrClienteAdd()" style="margin-top:8px"><i class="fas fa-plus"></i> Cadastrar</button>
    </div>`;
    return;
  }

  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.83rem">
    <thead><tr style="background:#f8fafc;text-align:left">
      <th style="padding:8px 10px">Nome</th>
      <th style="padding:8px 10px">Plano</th>
      <th style="padding:8px 10px">Financeiro</th>
      <th style="padding:8px 10px">ONU</th>
      <th style="padding:8px 10px">Sinal</th>
      <th style="padding:8px 10px"></th>
    </tr></thead>
    <tbody>${items.map(([id, c]) => {
      const fBadge = c.financial_status==='inadimplente'
        ? '<span style="color:#dc2626;font-weight:600">Inadimplente</span>'
        : '<span style="color:#16a34a">Adimplente</span>';
      const onuBadge = c.onu_status
        ? `<span class="signal-badge ${c.onu_status==='online'?'good':c.onu_status==='degraded'?'warn':'bad'}">${c.onu_status}</span>`
        : '<span style="color:var(--muted)">-</span>';
      const rxBadge = c.rx_power != null
        ? `<span class="signal-badge ${c.rx_power>-25?'good':c.rx_power>-28?'warn':'bad'}">${c.rx_power} dBm</span>`
        : '-';
      return `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="sdrOpenClientePanel('${id}',sdrClientesCache['${id}'])" oncontextmenu="sdrCtxMenu(event,_sdrCtxCliente('${id}'))">
        <td style="padding:8px 10px;font-weight:600">${c.name||'-'}</td>
        <td style="padding:8px 10px">${c.plan_name||'-'} ${c.plan_speed_down?c.plan_speed_down+'M':''}</td>
        <td style="padding:8px 10px">${fBadge}</td>
        <td style="padding:8px 10px">${onuBadge}</td>
        <td style="padding:8px 10px">${rxBadge}</td>
        <td style="padding:8px 10px;text-align:right;white-space:nowrap">
          <button class="btn-map" onclick="event.stopPropagation();sdrMapFlyToClient('${id}')" style="padding:4px 8px;font-size:.75rem" title="Ver no mapa"><i class="fas fa-map-pin"></i></button>
          <button class="sdr-row-menu" onclick="event.stopPropagation();sdrCtxMenu(event,_sdrCtxCliente('${id}'))" title="Mais ações"><i class="fas fa-ellipsis-v"></i></button>
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

window.sdrMapFlyToClient = function(id) {
  const c = sdrClientesCache[id];
  if (c && c.lat && c.lng) {
    showPage('mapa');
    setTimeout(() => sdrMapFlyTo(c.lat, c.lng), 300);
  }
};

window.sdrClienteAdd = function() {
  _sdrShowClienteModal(null, null);
};

window.sdrClienteEdit = function(id) {
  sdrCloseSidePanel();
  const c = sdrClientesCache[id];
  if (c) _sdrShowClienteModal(id, c);
};

function _sdrShowClienteModal(editId, d) {
  const isEdit = !!editId;
  d = d || {};

  // Montar opções de CTOs e Postes
  const infraItems = Object.entries(sdrInfraCache);
  const ctoOpts = infraItems.filter(([,i])=>i.type==='cto'||i.type==='splitter')
    .map(([k,i])=>`<option value="${k}" ${d.cto_id===k?'selected':''}>${i.name||i.code||k}</option>`).join('');
  const poleOpts = infraItems.filter(([,i])=>i.type==='pole')
    .map(([k,i])=>`<option value="${k}" ${d.pole_id===k?'selected':''}>${i.name||i.code||k}</option>`).join('');

  let html = `<div class="modal-overlay" id="sdr-modal" onclick="if(event.target===this)this.remove()">
    <div class="modal-box">
      <div class="modal-header">
        <h3><i class="fas fa-user-plus" style="color:var(--primary);margin-right:8px"></i>${isEdit?'Editar':'Novo'} Cliente</h3>
        <button onclick="document.getElementById('sdr-modal').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Nome</label><input id="sc-name" value="${d.name||''}"></div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>CPF/CNPJ</label><input id="sc-cpf" value="${d.cpf_cnpj||''}"></div>
          <div class="form-group" style="flex:1"><label>Telefone</label><input id="sc-phone" value="${d.phone||''}"></div>
        </div>
        <div class="form-group"><label>Email</label><input id="sc-email" value="${d.email||''}"></div>
        <div class="form-group"><label>Endereço</label><input id="sc-address" value="${d.address||''}"></div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>Latitude</label><input id="sc-lat" type="number" step="any" value="${d.lat||''}"></div>
          <div class="form-group" style="flex:1"><label>Longitude</label><input id="sc-lng" type="number" step="any" value="${d.lng||''}"></div>
          <div style="display:flex;align-items:flex-end;padding-bottom:14px">
            <button class="btn-map" onclick="sdrGetGPSCliente()" style="padding:9px 12px"><i class="fas fa-crosshairs"></i></button>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>Plano</label><input id="sc-plan" value="${d.plan_name||''}"></div>
          <div class="form-group" style="flex:1"><label>Velocidade (Mbps)</label><input id="sc-speed" type="number" value="${d.plan_speed_down||''}"></div>
          <div class="form-group" style="flex:1"><label>Valor (R$)</label><input id="sc-price" type="number" step="0.01" value="${d.plan_price||''}"></div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>Status Financeiro</label>
            <select id="sc-fin-status">
              <option value="adimplente" ${d.financial_status!=='inadimplente'?'selected':''}>Adimplente</option>
              <option value="inadimplente" ${d.financial_status==='inadimplente'?'selected':''}>Inadimplente</option>
            </select>
          </div>
          <div class="form-group" style="flex:1"><label>CTO/Splitter</label>
            <select id="sc-cto"><option value="">Nenhum</option>${ctoOpts}</select>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>Porta CTO</label><input id="sc-cto-port" type="number" value="${d.cto_port||''}"></div>
          <div class="form-group" style="flex:1"><label>Poste</label>
            <select id="sc-pole"><option value="">Nenhum</option>${poleOpts}</select>
          </div>
        </div>
        <div class="form-group"><label>ONU Serial</label><input id="sc-onu" value="${d.onu_serial||''}"></div>
        <div class="form-group"><label>Observações</label><textarea id="sc-notes" rows="2">${d.notes||''}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="document.getElementById('sdr-modal').remove()">Cancelar</button>
        <button class="btn-primary" onclick="sdrClienteSave('${editId||''}')">${isEdit?'Salvar':'Cadastrar'}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('sdr-modal').classList.add('open');
}

window.sdrGetGPSCliente = function() {
  if (!navigator.geolocation) { toast('GPS não disponível','error'); return; }
  toast('Obtendo posição GPS...','info');
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('sc-lat').value = pos.coords.latitude.toFixed(6);
    document.getElementById('sc-lng').value = pos.coords.longitude.toFixed(6);
    toast('Posição capturada!','success');
  }, () => toast('Erro ao obter GPS','error'), { enableHighAccuracy: true, timeout: 10000 });
};

window.sdrClienteSave = async function(editId) {
  const name = document.getElementById('sc-name').value.trim();
  if (!name) { toast('Nome é obrigatório','error'); return; }

  const data = {
    name,
    cpf_cnpj: document.getElementById('sc-cpf').value.trim(),
    phone: document.getElementById('sc-phone').value.trim(),
    email: document.getElementById('sc-email').value.trim(),
    address: document.getElementById('sc-address').value.trim(),
    plan_name: document.getElementById('sc-plan').value.trim(),
    plan_speed_down: parseInt(document.getElementById('sc-speed').value) || null,
    plan_price: parseFloat(document.getElementById('sc-price').value) || null,
    financial_status: document.getElementById('sc-fin-status').value,
    cto_id: document.getElementById('sc-cto').value || null,
    cto_port: parseInt(document.getElementById('sc-cto-port').value) || null,
    pole_id: document.getElementById('sc-pole').value || null,
    onu_serial: document.getElementById('sc-onu').value.trim(),
    notes: document.getElementById('sc-notes').value.trim(),
    is_active: true,
    updated_at: new Date().toISOString()
  };
  const lat = parseFloat(document.getElementById('sc-lat').value);
  const lng = parseFloat(document.getElementById('sc-lng').value);
  if (!isNaN(lat)) data.lat = lat;
  if (!isNaN(lng)) data.lng = lng;

  if (!editId) data.created_at = new Date().toISOString();

  try {
    if (editId) {
      await sdrRef(`clients/${editId}`).update(data);
      toast('Cliente atualizado!','success');
    } else {
      await sdrRef('clients').push(data);
      toast('Cliente cadastrado!','success');
    }
    document.getElementById('sdr-modal').remove();
    sdrCloseSidePanel();
  } catch(e) {
    toast('Erro: ' + e.message,'error');
  }
};

window.sdrClienteDelete = async function(id) {
  const c = sdrClientesCache[id];
  const nome = c ? c.name : id;
  if (!confirm('Excluir cliente "' + nome + '"?\nEsta ação não pode ser desfeita.')) return;
  try {
    await sdrRef('clients/' + id).remove();
    delete sdrClientesCache[id];
    toast('Cliente excluído', 'success');
    sdrCloseSidePanel();
    sdrClientesRender();
  } catch(e) { toast('Erro: ' + e.message, 'error'); }
};

// ════════════════════════════════════════════════════
// PÁGINA OLTs
// ════════════════════════════════════════════════════

window.sdrOltsRender = function() {
  sdrRef('olt_connections').once('value').then(snap => {
    sdrOltsCache = snap.val() || {};
    window.sdrOltsCache = sdrOltsCache;
    const el = document.getElementById('olts-lista');
    if (!el) return;
    const items = Object.entries(sdrOltsCache);
    if (items.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
        <i class="fas fa-server" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:.4"></i>
        <p>Nenhuma OLT cadastrada</p>
        <p style="font-size:.8rem;margin-top:8px">Cadastre OLTs pela página de Infraestrutura (tipo: OLT)</p>
      </div>`;
      return;
    }
    el.innerHTML = `<div class="infra-grid">${items.map(([id, o]) => `
      <div class="infra-card">
        <div class="ic-top">
          <div class="ic-icon olt"><i class="fas fa-server"></i></div>
          <div>
            <div class="ic-name">${o.name||id}</div>
            <div class="ic-type">${o.model||'OLT'}</div>
          </div>
          <span style="margin-left:auto">
            <span class="signal-badge ${o.is_active?'good':'off'}">${o.is_active?'Ativa':'Inativa'}</span>
          </span>
        </div>
        <div class="ic-detail">IP: ${o.ip_address||'-'} | SNMP: ${o.snmp_community||'-'} | PON: ${o.total_pon_ports||'-'} portas</div>
        ${o.last_poll_at?`<div class="ic-detail" style="font-size:.72rem">Último poll: ${new Date(o.last_poll_at).toLocaleString('pt-BR')}</div>`:''}
      </div>
    `).join('')}</div>`;
  });
};

window.sdrOltAdd = function() {
  _sdrShowAddModal(null, {type:'olt'});
};

// ════════════════════════════════════════════════════
// PÁGINA ALERTAS
// ════════════════════════════════════════════════════

window.sdrAlertasRender = function() {
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

window.sdrAlertaAck = function(id) {
  sdrRef(`alerts/${id}`).update({
    is_active: false,
    acknowledged_at: new Date().toISOString()
  }).then(() => {
    toast('Alerta reconhecido','success');
    sdrAlertasRender();
  });
};

// ════════════════════════════════════════════════════
// DASHBOARD REDE
// ════════════════════════════════════════════════════

window.sdrDashRedeRender = function() {
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

// ════════════════════════════════════════════════════
// SPRINT 2 — IMPORTAÇÃO CSV/EXCEL DE CLIENTES
// ════════════════════════════════════════════════════

// Mapeamento flexível de colunas (aceita variações comuns de CSV/Excel de ISPs brasileiros)
const IMPORT_COL_MAP = {
  name:       ['nome','name','cliente','razao_social','razão social','nome_completo','nome completo'],
  cpf_cnpj:   ['cpf','cnpj','cpf_cnpj','cpf/cnpj','documento','doc'],
  phone:      ['telefone','phone','celular','fone','tel','whatsapp'],
  email:      ['email','e-mail','e_mail'],
  address:    ['endereco','endereço','address','logradouro','rua','end'],
  plan_name:  ['plano','plan','plan_name','nome_plano'],
  plan_speed_down: ['velocidade','speed','download','mbps','velocidade_download'],
  plan_price: ['valor','price','mensalidade','preco','preço','valor_plano'],
  financial_status: ['status_financeiro','financial_status','financeiro','status_fin','situacao','situação'],
  lat:        ['lat','latitude'],
  lng:        ['lng','lon','longitude','long'],
  onu_serial: ['onu','serial','serial_onu','onu_serial','serial_number','sn'],
  cto_port:   ['porta','port','porta_cto','cto_port'],
  notes:      ['obs','observacao','observação','notes','nota','observacoes']
};

function _mapColumn(header) {
  const h = header.toLowerCase().trim().replace(/[^a-záàãâéêíóôõúç0-9_\s]/gi,'').replace(/\s+/g,'_');
  for (const [field, aliases] of Object.entries(IMPORT_COL_MAP)) {
    if (aliases.includes(h)) return field;
  }
  return null;
}

function _normalizeFinStatus(val) {
  if (!val) return 'adimplente';
  const v = val.toLowerCase().trim();
  if (v.includes('inadim') || v.includes('atraso') || v === 'bloqueado' || v === 'suspenso') return 'inadimplente';
  return 'adimplente';
}

window.sdrImportClientes = async function(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = ''; // reset para permitir reimportar mesmo arquivo

  if (typeof XLSX === 'undefined') {
    toast('Biblioteca SheetJS não carregou. Recarregue a página.','error');
    return;
  }

  toast('Lendo arquivo...','info');

  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', codepage: 65001 });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) { toast('Arquivo vazio ou sem dados','error'); return; }

    // Mapear colunas
    const headers = Object.keys(rows[0]);
    const colMap = {};
    headers.forEach(h => {
      const field = _mapColumn(h);
      if (field) colMap[h] = field;
    });

    if (!colMap || !Object.values(colMap).includes('name')) {
      // Tenta achar pelo menos o nome
      const nameCol = headers.find(h => h.toLowerCase().includes('nom'));
      if (nameCol) colMap[nameCol] = 'name';
      else {
        toast('Não encontrei coluna de "Nome" no arquivo. Verifique os cabeçalhos.','error');
        return;
      }
    }

    // Preview modal
    const mappedFields = Object.values(colMap);
    const unmapped = headers.filter(h => !colMap[h]);

    let previewHtml = `<div class="modal-overlay" id="sdr-import-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal-box" style="max-width:700px;max-height:85vh;overflow-y:auto">
        <div class="modal-header">
          <h3><i class="fas fa-file-import" style="color:var(--primary);margin-right:8px"></i>Importar ${rows.length} Clientes</h3>
          <button onclick="document.getElementById('sdr-import-modal').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:12px;font-size:.85rem"><b>Arquivo:</b> ${file.name} &mdash; <b>${rows.length}</b> linhas encontradas</p>
          <div style="margin-bottom:14px">
            <p style="font-size:.82rem;font-weight:600;margin-bottom:6px"><i class="fas fa-check-circle" style="color:#16a34a;margin-right:4px"></i>Colunas mapeadas (${mappedFields.length}):</p>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${mappedFields.map(f => `<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:12px;font-size:.75rem">${f}</span>`).join('')}
            </div>
          </div>
          ${unmapped.length ? `<div style="margin-bottom:14px">
            <p style="font-size:.82rem;font-weight:600;margin-bottom:6px"><i class="fas fa-exclamation-circle" style="color:#d97706;margin-right:4px"></i>Colunas ignoradas (${unmapped.length}):</p>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${unmapped.map(h => `<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:12px;font-size:.75rem">${h}</span>`).join('')}
            </div>
          </div>` : ''}
          <p style="font-size:.82rem;margin-bottom:8px"><b>Preview (primeiros 5):</b></p>
          <div style="overflow-x:auto;font-size:.78rem">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#f8fafc">${['Nome','CPF/CNPJ','Plano','Financeiro'].map(h=>`<th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e2e8f0">${h}</th>`).join('')}</tr></thead>
              <tbody>${rows.slice(0,5).map(row => {
                const mapped = {};
                for (const [col, field] of Object.entries(colMap)) { mapped[field] = row[col]; }
                return `<tr>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${mapped.name||'-'}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${mapped.cpf_cnpj||'-'}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${mapped.plan_name||'-'} ${mapped.plan_speed_down?mapped.plan_speed_down+'M':''}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${_normalizeFinStatus(String(mapped.financial_status||''))}</td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>

          <div style="margin-top:14px">
            <label style="font-size:.82rem;display:flex;align-items:center;gap:6px">
              <input type="checkbox" id="sdr-import-skip-dup" checked>
              Pular clientes com CPF/CNPJ já cadastrado
            </label>
          </div>
          <div style="margin-top:8px">
            <label style="font-size:.82rem;display:flex;align-items:center;gap:6px">
              <input type="checkbox" id="sdr-import-link-cto">
              Vincular a CTO por proximidade GPS (se lat/lng disponíveis)
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="document.getElementById('sdr-import-modal').remove()">Cancelar</button>
          <button class="btn-primary" id="sdr-import-btn" onclick="sdrImportExecute()">
            <i class="fas fa-upload" style="margin-right:4px"></i>Importar ${rows.length} Clientes
          </button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', previewHtml);
    document.getElementById('sdr-import-modal').classList.add('open');

    // Guardar dados para o execute
    window._sdrImportData = { rows, colMap, fileName: file.name };
  } catch(e) {
    toast('Erro ao ler arquivo: ' + e.message, 'error');
    console.error('[SDR Import]', e);
  }
};

window.sdrImportExecute = async function() {
  const { rows, colMap } = window._sdrImportData || {};
  if (!rows || !rows.length) { toast('Sem dados para importar','error'); return; }

  const btn = document.getElementById('sdr-import-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';

  const skipDup = document.getElementById('sdr-import-skip-dup')?.checked;
  const linkCTO = document.getElementById('sdr-import-link-cto')?.checked;

  // Carregar clientes existentes para check de duplicatas
  let existingCpfs = new Set();
  if (skipDup) {
    const snap = await sdrRef('clients').once('value');
    const existing = snap.val() || {};
    Object.values(existing).forEach(c => {
      if (c.cpf_cnpj) existingCpfs.add(c.cpf_cnpj.replace(/\D/g,''));
    });
  }

  // Carregar infra para vincular CTOs por proximidade
  let ctoList = [];
  if (linkCTO) {
    const infraSnap = await sdrRef('infrastructure').once('value');
    const infra = infraSnap.val() || {};
    ctoList = Object.entries(infra)
      .filter(([,i]) => (i.type === 'cto' || i.type === 'splitter') && i.lat && i.lng)
      .map(([id, i]) => ({ id, lat: i.lat, lng: i.lng, name: i.name || i.code }));
  }

  let imported = 0, skipped = 0, errors = 0;
  const now = new Date().toISOString();
  const updates = {};

  for (const row of rows) {
    try {
      const mapped = {};
      for (const [col, field] of Object.entries(colMap)) {
        mapped[field] = row[col];
      }

      if (!mapped.name || !String(mapped.name).trim()) { skipped++; continue; }

      // Check duplicata
      if (skipDup && mapped.cpf_cnpj) {
        const cpfClean = String(mapped.cpf_cnpj).replace(/\D/g,'');
        if (cpfClean && existingCpfs.has(cpfClean)) { skipped++; continue; }
        existingCpfs.add(cpfClean);
      }

      const client = {
        name: String(mapped.name).trim(),
        cpf_cnpj: mapped.cpf_cnpj ? String(mapped.cpf_cnpj).trim() : '',
        phone: mapped.phone ? String(mapped.phone).trim() : '',
        email: mapped.email ? String(mapped.email).trim() : '',
        address: mapped.address ? String(mapped.address).trim() : '',
        plan_name: mapped.plan_name ? String(mapped.plan_name).trim() : '',
        plan_speed_down: mapped.plan_speed_down ? parseInt(mapped.plan_speed_down) || null : null,
        plan_price: mapped.plan_price ? parseFloat(String(mapped.plan_price).replace(',','.')) || null : null,
        financial_status: _normalizeFinStatus(String(mapped.financial_status || '')),
        onu_serial: mapped.onu_serial ? String(mapped.onu_serial).trim() : '',
        cto_port: mapped.cto_port ? parseInt(mapped.cto_port) || null : null,
        notes: mapped.notes ? String(mapped.notes).trim() : '',
        is_active: true,
        import_source: window._sdrImportData.fileName || '',
        created_at: now,
        updated_at: now
      };

      // GPS
      const lat = parseFloat(mapped.lat);
      const lng = parseFloat(mapped.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        client.lat = lat;
        client.lng = lng;

        // Vincular CTO mais próxima
        if (linkCTO && ctoList.length) {
          let nearest = null, minDist = Infinity;
          ctoList.forEach(cto => {
            const d = Math.sqrt(Math.pow(cto.lat - lat, 2) + Math.pow(cto.lng - lng, 2));
            if (d < minDist) { minDist = d; nearest = cto; }
          });
          // Vincular se dentro de ~200m (aproximadamente 0.002 graus)
          if (nearest && minDist < 0.002) {
            client.cto_id = nearest.id;
          }
        }
      }

      const newKey = sdrRef('clients').push().key;
      updates[`clients/${newKey}`] = client;
      imported++;
    } catch(e) {
      errors++;
      console.warn('[SDR Import] Erro na linha:', e);
    }
  }

  // Batch write
  if (Object.keys(updates).length) {
    try {
      await sdrRef('').update(updates);
    } catch(e) {
      toast('Erro ao salvar: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-upload"></i> Tentar novamente';
      return;
    }
  }

  document.getElementById('sdr-import-modal')?.remove();
  toast(`Importação concluída! ${imported} importados, ${skipped} pulados, ${errors} erros`, imported > 0 ? 'success' : 'error');
  window._sdrImportData = null;
  sdrClientesRender();
};

// ════════════════════════════════════════════════════
// SPRINT 2 — FICHA DO CLIENTE MELHORADA + OCUPAÇÃO CTO
// ════════════════════════════════════════════════════

// Helper: calcular ocupação de uma CTO (quantos clientes vinculados)
function _sdrCtoOcupacao(ctoId) {
  const all = Object.values(sdrClientesCache || {});
  const vinculados = all.filter(c => c.cto_id === ctoId);
  return vinculados;
}

// Helper: encontrar CTO do poste (postes que tem CTOs vinculadas)
function _sdrCtosDoPoste(poleId) {
  const infra = Object.entries(sdrInfraCache || {});
  return infra.filter(([,i]) => (i.type === 'cto' || i.type === 'splitter') && i.pole_id === poleId);
}

// Sobrescrever a ficha do cliente com versão melhorada Sprint 2
window.sdrOpenClientePanel = function(id, c) {
  // Garantir que infra cache está carregado
  if (Object.keys(sdrInfraCache).length === 0) {
    sdrRef('infrastructure').once('value').then(snap => {
      sdrInfraCache = snap.val() || {};
    window.sdrInfraCache = sdrInfraCache;
      _buildClientePanel(id, c);
    });
  } else {
    _buildClientePanel(id, c);
  }
};

function _buildClientePanel(id, c) {
  document.getElementById('sp-title').textContent = c.name || 'Cliente';
  let html = '';

  // Bloco 1: Dados do Cliente
  html += `<div class="sp-section">
    <div class="sp-section-title"><i class="fas fa-user" style="color:#2563eb"></i> Dados do Cliente</div>
    <div class="sp-row"><span class="sp-label">Nome</span><span class="sp-val">${c.name||'-'}</span></div>`;
  if (c.cpf_cnpj) html += `<div class="sp-row"><span class="sp-label">CPF/CNPJ</span><span class="sp-val">${c.cpf_cnpj}</span></div>`;
  if (c.phone) html += `<div class="sp-row"><span class="sp-label">Telefone</span><span class="sp-val">${c.phone}</span></div>`;
  if (c.email) html += `<div class="sp-row"><span class="sp-label">Email</span><span class="sp-val">${c.email}</span></div>`;
  if (c.address) html += `<div class="sp-row"><span class="sp-label">Endereço</span><span class="sp-val">${c.address}</span></div>`;
  if (c.plan_name) html += `<div class="sp-row"><span class="sp-label">Plano</span><span class="sp-val">${c.plan_name} ${c.plan_speed_down?'('+c.plan_speed_down+'M)':''}</span></div>`;
  if (c.plan_price) html += `<div class="sp-row"><span class="sp-label">Valor</span><span class="sp-val">R$ ${parseFloat(c.plan_price).toFixed(2)}</span></div>`;
  const fStatus = c.financial_status || 'adimplente';
  const fColor = fStatus === 'adimplente' ? '#16a34a' : '#dc2626';
  html += `<div class="sp-row"><span class="sp-label">Financeiro</span><span class="sp-val" style="color:${fColor};font-weight:600">${fStatus.toUpperCase()}</span></div>`;
  if (c.import_source) html += `<div class="sp-row"><span class="sp-label">Importado de</span><span class="sp-val" style="font-size:.75rem;color:var(--muted)">${c.import_source}</span></div>`;
  html += `</div>`;

  // Bloco 2: ONU (se vinculada)
  if (c.onu_serial || c.onu_id) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-wifi" style="color:#d97706"></i> ONU</div>`;
    if (c.onu_serial) html += `<div class="sp-row"><span class="sp-label">Serial</span><span class="sp-val" style="font-family:monospace">${c.onu_serial}</span></div>`;
    if (c.onu_status) {
      const badge = c.onu_status==='online'?'good':c.onu_status==='degraded'?'warn':c.onu_status==='offline'?'bad':'off';
      html += `<div class="sp-row"><span class="sp-label">Status</span><span class="signal-badge ${badge}">${c.onu_status.toUpperCase()}</span></div>`;
    }
    if (c.rx_power != null) {
      const rxBadge = c.rx_power > -25 ? 'good' : c.rx_power > -28 ? 'warn' : 'bad';
      html += `<div class="sp-row"><span class="sp-label">Sinal Rx</span><span class="signal-badge ${rxBadge}">${c.rx_power} dBm</span></div>`;
    }
    if (c.tx_power != null) html += `<div class="sp-row"><span class="sp-label">Sinal Tx</span><span class="sp-val">${c.tx_power} dBm</span></div>`;
    html += `</div>`;
  }

  // Bloco 3: Infraestrutura (MELHORADO Sprint 2 — com ocupação CTO e cadeia completa)
  const hasCTO = c.cto_id && sdrInfraCache[c.cto_id];
  const hasPole = c.pole_id && sdrInfraCache[c.pole_id];

  if (hasCTO || hasPole) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-network-wired" style="color:#16a34a"></i> Infraestrutura Vinculada</div>`;

    if (hasCTO) {
      const cto = sdrInfraCache[c.cto_id];
      const ocupacao = _sdrCtoOcupacao(c.cto_id);
      const totalPorts = cto.total_ports || 8;
      const usedPorts = ocupacao.length;
      const pctUso = Math.round((usedPorts / totalPorts) * 100);
      const barColor = pctUso > 80 ? '#dc2626' : pctUso > 60 ? '#d97706' : '#16a34a';

      html += `<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:600;font-size:.85rem"><i class="fas fa-box" style="color:#2563eb;margin-right:4px"></i>${cto.name||cto.code||'CTO'}</span>
          <span style="font-size:.75rem;color:var(--muted)">${cto.type === 'splitter' ? 'Splitter' : 'CTO'}</span>
        </div>`;
      if (c.cto_port) html += `<div class="sp-row" style="margin-bottom:4px"><span class="sp-label">Porta</span><span class="sp-val" style="font-weight:600">${c.cto_port}</span></div>`;
      html += `<div class="sp-row" style="margin-bottom:4px"><span class="sp-label">Ocupação</span><span class="sp-val">${usedPorts}/${totalPorts} portas (${pctUso}%)</span></div>
        <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:4px">
          <div style="height:100%;width:${pctUso}%;background:${barColor};border-radius:3px;transition:width .3s"></div>
        </div>`;
      // Listar outros clientes na mesma CTO
      if (ocupacao.length > 1) {
        const outros = ocupacao.filter(oc => oc.name !== c.name).slice(0, 5);
        if (outros.length) {
          html += `<div style="margin-top:8px;font-size:.75rem;color:var(--muted)">
            <span style="font-weight:600">Outros clientes:</span> ${outros.map(oc => oc.name).join(', ')}${ocupacao.length > 6 ? ` (+${ocupacao.length - 6})` : ''}
          </div>`;
        }
      }
      // Botão ver CTO no mapa
      if (cto.lat && cto.lng) {
        html += `<button class="btn-map" onclick="sdrMapFlyTo(${cto.lat},${cto.lng})" style="margin-top:6px;padding:4px 10px;font-size:.75rem"><i class="fas fa-map-pin"></i> Ver CTO no mapa</button>`;
      }
      html += `</div>`;
    }

    if (hasPole) {
      const pole = sdrInfraCache[c.pole_id];
      html += `<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;font-size:.85rem"><i class="fas fa-bolt" style="color:#d97706;margin-right:4px"></i>${pole.name||pole.code||'Poste'}</span>
          <span style="font-size:.75rem;color:var(--muted)">Poste</span>
        </div>`;
      if (pole.concessionaria) html += `<div class="sp-row"><span class="sp-label">Concessionária</span><span class="sp-val">${pole.concessionaria}</span></div>`;
      // CTOs neste poste
      if (pole.lat && pole.lng) {
        html += `<button class="btn-map" onclick="sdrMapFlyTo(${pole.lat},${pole.lng})" style="margin-top:6px;padding:4px 10px;font-size:.75rem"><i class="fas fa-map-pin"></i> Ver poste no mapa</button>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  } else {
    // Sem vínculo — sugerir
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-network-wired" style="color:#94a3b8"></i> Infraestrutura</div>
      <p style="color:var(--muted);font-size:.82rem;text-align:center;padding:12px 0">Nenhuma infraestrutura vinculada<br>
      <span style="font-size:.75rem">Edite o cliente para vincular CTO e Poste</span></p>
    </div>`;
  }

  // Coordenadas
  if (c.lat && c.lng) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-map-marker-alt" style="color:#7c3aed"></i> Localização</div>
      <div class="sp-row"><span class="sp-label">Coordenadas</span><span class="sp-val" style="font-family:monospace;font-size:.78rem">${parseFloat(c.lat).toFixed(6)}, ${parseFloat(c.lng).toFixed(6)}</span></div>
    </div>`;
  }

  // Botões
  html += `<div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn-primary" onclick="sdrClienteEdit('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    ${c.lat && c.lng ? `<button class="btn-map" onclick="sdrMapFlyTo(${c.lat},${c.lng})" style="padding:8px 16px"><i class="fas fa-map-pin"></i> Mapa</button>` : ''}
  </div>`;

  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
}

// ════════════════════════════════════════════════════
// SPRINT 2 — VINCULAÇÃO CTO POR PROXIMIDADE (para clientes sem CTO)
// ════════════════════════════════════════════════════

window.sdrAutoLinkCTO = async function() {
  toast('Buscando clientes sem CTO vinculada...','info');

  const [clientSnap, infraSnap] = await Promise.all([
    sdrRef('clients').once('value'),
    sdrRef('infrastructure').once('value')
  ]);

  const clients = clientSnap.val() || {};
  const infra = infraSnap.val() || {};

  const ctoList = Object.entries(infra)
    .filter(([,i]) => (i.type === 'cto' || i.type === 'splitter') && i.lat && i.lng)
    .map(([id, i]) => ({ id, lat: i.lat, lng: i.lng }));

  if (!ctoList.length) { toast('Nenhuma CTO cadastrada com GPS','error'); return; }

  const updates = {};
  let linked = 0;

  Object.entries(clients).forEach(([cid, c]) => {
    if (c.cto_id || !c.lat || !c.lng) return; // já vinculado ou sem GPS

    let nearest = null, minDist = Infinity;
    ctoList.forEach(cto => {
      const d = Math.sqrt(Math.pow(cto.lat - c.lat, 2) + Math.pow(cto.lng - c.lng, 2));
      if (d < minDist) { minDist = d; nearest = cto; }
    });

    if (nearest && minDist < 0.002) { // ~200m
      updates[`clients/${cid}/cto_id`] = nearest.id;
      updates[`clients/${cid}/updated_at`] = new Date().toISOString();
      linked++;
    }
  });

  if (Object.keys(updates).length) {
    await sdrRef('').update(updates);
    toast(`${linked} clientes vinculados à CTO mais próxima!`, 'success');
    sdrClientesRender();
  } else {
    toast('Nenhum cliente para vincular (todos já têm CTO ou sem GPS)', 'info');
  }
};

// ════════════════════════════════════════════════════
// SPRINT 4 — OLTs TAB INTERFACE + CHASSIS INLINE + CORD DRAWING
// ════════════════════════════════════════════════════

var _sdrActiveOltTab = null;
var _sdrOltPlaceMode  = null;
var _sdrCordDrawMode  = null;

// ── HTML da página OLTs (tab-based dark UI) ─────────────────────────
window._sdrHtml_olts = function() {
  return '<div id="olts-page" style="height:100%;display:flex;flex-direction:column;background:#060d1c;overflow:hidden">'
    // Tab bar row: scrollable tabs on left, Nova OLT button pinned on right
    +'<div style="display:flex;align-items:stretch;background:#0a1628;border-bottom:1px solid #1e3a5f;flex-shrink:0">'
    +'<div id="olts-tab-bar" style="flex:1;display:flex;align-items:flex-end;min-height:42px;overflow-x:auto;padding:0 4px"></div>'
    +'<div style="display:flex;align-items:center;padding:0 10px;flex-shrink:0;border-left:1px solid #1e3a5f">'
    +'<button onclick="sdrOltAddModal()" style="padding:5px 12px;font-size:.78rem;background:#1d4ed8;color:#fff;border:none;border-radius:6px;cursor:pointer;white-space:nowrap"><i class="fas fa-plus"></i> Nova OLT</button>'
    +'</div>'
    +'</div>'
    +'<div id="olt-panel-content" style="flex:1;min-height:0;overflow:hidden;position:relative;background:#060d1c;display:flex;flex-direction:column"></div>'
    +'</div>';
};

// ── Troca de aba ─────────────────────────────────────────────────────
window.sdrOltTabSwitch = function(oltId) {
  _sdrActiveOltTab = oltId;
  _sdrCordDrawMode = null; // cancel any draw mode on tab switch
  document.querySelectorAll('[id^="olt-tab-"]').forEach(function(btn) {
    var active = btn.id === 'olt-tab-' + oltId;
    btn.style.background    = active ? '#1e3a5f' : 'transparent';
    btn.style.borderBottom  = '2px solid ' + (active ? '#6366f1' : 'transparent');
    btn.style.color         = active ? '#e2e8f0' : '#64748b';
    btn.style.fontWeight    = active ? '600' : '400';
  });
  var panel = document.getElementById('olt-panel-content');
  if (panel) {
    panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:80px;color:#64748b;font-size:.85rem"><i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>Carregando...</div>';
    sdrOltInlineRender(oltId);
  }
};

// ── Render inline do painel (chassis + DGO) ──────────────────────────
window.sdrOltInlineRender = function(oltId) {
  Promise.all([
    sdrRef('olt_connections/' + oltId).once('value'),
    sdrRef('olt_connections/' + oltId + '/pons').once('value'),
    sdrRef('infrastructure').once('value'),
    sdrRef('onus').once('value')
  ]).then(function(snaps) {
    var olt   = snaps[0].val() || {};
    var pons  = snaps[1].val() || {};
    var infra = snaps[2].val() || {};
    var onus  = snaps[3].val() || {};

    // Index DGOs — exibir os vinculados a esta OLT + os referenciados por PONs com cordão
    var dgos = {};
    // 1. DGOs com olt_id vinculado
    Object.entries(infra).forEach(function(e) {
      if (e[1] && e[1].type === 'dgo' && e[1].olt_id === oltId) dgos[e[0]] = e[1];
    });
    // 2. DGOs referenciados por PONs desta OLT (para exibir cordões existentes)
    Object.values(pons).forEach(function(p) {
      if (p && p.dgo_id && !dgos[p.dgo_id] && infra[p.dgo_id]) {
        dgos[p.dgo_id] = infra[p.dgo_id]; // mostrar DGO não vinculado se tem cordão
      }
    });

    // ONUs por PON
    var onusByPon = {};
    Object.values(onus).forEach(function(u) {
      if (u && u.olt_id === oltId && u.slot != null && u.port != null) {
        var key = 's' + u.slot + '_p' + u.port;
        if (!onusByPon[key]) onusByPon[key] = [];
        onusByPon[key].push(u);
      }
    });

    var panel = document.getElementById('olt-panel-content');
    if (!panel) return;

    var slotCount  = olt.slot_count  || 4;
    var ponPerSlot = olt.pon_per_slot || 8;

    // ── Chassis HTML — layout "em pé" (AN5516-06): slots lado a lado, PONs empilhadas ──
    // Cada slot é uma COLUNA vertical; slots ficam dispostos horizontalmente
    var chassisHtml = '<div style="display:flex;flex-direction:row;align-items:flex-start;gap:28px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">';
    for (var sl = 1; sl <= slotCount; sl++) {
      var slotCfg   = ((olt.slots || {})[sl]) || {};
      var portCount = slotCfg.pon_count || ponPerSlot;
      // Coluna do slot: label no topo + PONs empilhadas abaixo
      chassisHtml += '<div id="olt-slot-' + oltId + '-' + sl + '" style="display:flex;flex-direction:column;align-items:center;gap:2px">'
        // Label do slot (topo) + botão de configuração de slot
        + '<div style="font-size:.62rem;font-weight:700;color:#94a3b8;letter-spacing:.04em;'
        + 'background:#0a1628;border:1px solid #334155;border-radius:3px 3px 0 0;'
        + 'width:100%;text-align:center;padding:3px 0;min-width:40px;position:relative;cursor:pointer" '
        + 'title="Configurar Slot ' + sl + '" '
        + 'onclick="sdrSlotConfig(\'' + oltId + '\',' + sl + ',' + portCount + ')">'
        + 'SL' + sl
        + '<span style="position:absolute;right:3px;top:50%;transform:translateY(-50%);font-size:.55rem;opacity:.5">⚙</span>'
        + '</div>'
        // Caixa das PONs (coluna interna)
        + '<div style="background:#0f172a;border:1px solid #334155;border-top:none;border-radius:0 0 4px 4px;'
        + 'padding:4px 4px;display:flex;flex-direction:column;gap:3px;align-items:center">';
      for (var po = 1; po <= portCount; po++) {
        var key      = 's' + sl + '_p' + po;
        var cfg      = pons[key] || {};
        var portOnus = onusByPon[key] || [];
        var hasAlarm = portOnus.some(function(u) { return u.status === 'offline'; });
        var bg;
        if (!cfg.active) {
          bg = '#334155';
        } else if (cfg.dgo_id) {
          bg = hasAlarm ? '#dc2626' : '#16a34a';
        } else {
          bg = '#2563eb';
        }
        var dgoName  = cfg.dgo_id ? ((dgos[cfg.dgo_id] || {}).nome || 'DGO') : '';
        var fiberLbl = cfg.dgo_fiber_key ? ' · ' + cfg.dgo_fiber_key : '';
        var ponTitle = 'Slot ' + sl + ' PON ' + po
          + (dgoName ? ' → ' + dgoName + fiberLbl : ' (sem DGO)')
          + ' | ' + portOnus.length + ' ONUs'
          + (cfg.dgo_id ? ' — Clique para rastrear' : ' — Clique para conectar cordão');
        // hasCord: PON conectada a DGO (com ou sem waypoints de cordão)
        var hasDgoConn = !!(cfg.dgo_id && cfg.dgo_fiber_key);
        chassisHtml += '<div id="pon-btn-' + oltId + '-' + sl + '-' + po + '" '
          + (hasDgoConn ? ('data-has-cord="1" data-dgo-id="' + cfg.dgo_id + '" data-fiber-key="' + cfg.dgo_fiber_key + '" ') : '')
          + 'onclick="sdrPonCordStart(\'' + oltId + '\',' + sl + ',' + po + ')" '
          + 'title="' + ponTitle + '" '
          + 'style="width:38px;height:28px;border-radius:3px;background:' + bg + ';cursor:pointer;'
          + 'display:flex;align-items:center;justify-content:center;font-size:.62rem;color:#fff;'
          + 'font-weight:700;border:1px solid rgba(255,255,255,.12);transition:transform .1s;position:relative" '
          + 'onmouseover="this.style.transform=\'scale(1.15)\';this.style.zIndex=5" '
          + 'onmouseout="this.style.transform=\'\';this.style.zIndex=\'\'">' + po
          + (cfg.dgo_id ? '<span style="position:absolute;bottom:-2px;right:-2px;width:6px;height:6px;border-radius:50%;background:#6366f1;border:1px solid #060d1c"></span>' : '')
          + '</div>';
      }
      chassisHtml += '</div></div>'; // fecha caixa PONs + coluna slot
    }
    chassisHtml += '</div>'; // fecha row de slots

    // Legenda horizontal — fica no cabeçalho do chassis, à direita (deitada)
    var legend = '<div style="display:flex;flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end">'
      + '<span style="display:flex;align-items:center;gap:4px;font-size:.64rem;color:#64748b;white-space:nowrap"><span style="width:9px;height:9px;background:#334155;border-radius:2px;flex-shrink:0"></span>Inativa</span>'
      + '<span style="display:flex;align-items:center;gap:4px;font-size:.64rem;color:#64748b;white-space:nowrap"><span style="width:9px;height:9px;background:#2563eb;border-radius:2px;flex-shrink:0"></span>Ativa</span>'
      + '<span style="display:flex;align-items:center;gap:4px;font-size:.64rem;color:#64748b;white-space:nowrap"><span style="width:9px;height:9px;background:#16a34a;border-radius:2px;flex-shrink:0"></span>Conectada</span>'
      + '<span style="display:flex;align-items:center;gap:4px;font-size:.64rem;color:#64748b;white-space:nowrap"><span style="width:9px;height:9px;background:#dc2626;border-radius:2px;flex-shrink:0"></span>Alarme</span>'
      + '<span style="display:flex;align-items:center;gap:4px;font-size:.64rem;color:#64748b;white-space:nowrap"><span style="width:9px;height:9px;background:#6366f1;border-radius:50%;flex-shrink:0"></span>Tem DGO</span>'
      + '</div>';

    // ── DGO panel HTML ──────────────────────────────────────────────
    var dgoItems = Object.entries(dgos);
    var dgoHtml  = '<div style="display:flex;flex-direction:column;gap:8px">';
    if (dgoItems.length === 0) {
      dgoHtml += '<div style="font-size:.78rem;color:#64748b;font-style:italic;padding:8px 0">'
        + 'Nenhum DGO cadastrado — '
        + '<button onclick="sdrDgoCriarModal(\'' + oltId + '\')" style="background:none;border:none;color:#6366f1;cursor:pointer;font-size:.78rem;text-decoration:underline">criar agora</button>'
        + '</div>';
    } else {
      dgoItems.forEach(function(e) {
        var did = e[0], d = e[1];
        var tubeCount    = d.tube_count    || 12;
        var fiberPerTube = d.fiber_per_tube || 12;
        var usedFibers = Object.values(d.fibers || {}).filter(function(f){ return f && f.status === 'used'; }).length;
        var total      = tubeCount * fiberPerTube;
        var freeCount  = total - usedFibers;

        // Layout "em pé": cada fileira (tubo) é uma COLUNA vertical de fibras
        // Fileiras lado a lado — igual ao chassi AN5516-06
        // Índice reverso: fiberKey → ponKey (para data-pon-key)
        var fiberToPon = {};
        Object.entries(pons).forEach(function(pe) {
          if (pe[1] && pe[1].dgo_id === did && pe[1].dgo_fiber_key) {
            fiberToPon[pe[1].dgo_fiber_key] = pe[0];
          }
        });

        var fiberGrid = '<div style="display:flex;flex-direction:row;align-items:flex-start;gap:28px;flex-wrap:nowrap;overflow-x:auto">';
        for (var t = 1; t <= tubeCount; t++) {
          fiberGrid += '<div id="dgo-tube-' + did + '-' + t + '" style="display:flex;flex-direction:column;align-items:center;gap:2px">'
            // Label do tubo (topo) — mesma largura do botão PON (38px)
            + '<div style="font-size:.62rem;font-weight:700;color:#64748b;text-align:center;'
            + 'background:#0a1628;border:1px solid #1e3a5f;border-radius:3px 3px 0 0;'
            + 'min-width:38px;padding:3px 0">T' + t + '</div>'
            // Fibras empilhadas
            + '<div style="display:flex;flex-direction:column;gap:3px;'
            + 'background:#060d1c;border:1px solid #1e3a5f;border-top:none;border-radius:0 0 4px 4px;padding:4px">';
          for (var f = 1; f <= fiberPerTube; f++) {
            var fKey  = 't' + t + '_f' + f;
            var fib   = (d.fibers || {})[fKey] || {};
            var fUsed = fib.status === 'used';
            var fBg   = fUsed ? '#7f1d1d' : '#14532d';
            var fBd   = fUsed ? '#dc2626' : '#22c55e';
            var connPonKey = fiberToPon[fKey] || '';
            fiberGrid += '<div id="dgo-fiber-' + did + '-' + fKey + '" '
              + (connPonKey ? 'data-pon-key="' + connPonKey + '" ' : '')
              + 'onclick="sdrCordConnectFiber(\'' + did + '\',\'' + fKey + '\')" '
              + 'title="Tubo ' + t + ' · Fibra ' + f + (fUsed ? ' — USADA' : ' — livre') + (connPonKey ? ' (' + connPonKey + ')' : '') + '" '
              + 'style="width:38px;height:28px;border-radius:3px;background:' + fBg + ';'
              + 'border:1px solid ' + fBd + ';cursor:pointer;'
              + 'transition:transform .1s,box-shadow .1s;font-size:.62rem;color:' + (fUsed ? '#fca5a5' : '#86efac') + ';'
              + 'display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:600" '
              + 'onmouseover="this.style.transform=\'scale(1.15)\';this.style.zIndex=5;'
              + 'if(window._sdrCordDrawMode){'
              + 'this.style.boxShadow=\'0 0 8px #a5b4fc,0 0 16px #6366f1\';'
              + 'this.style.borderColor=\'#a5b4fc\';'
              + 'if(window._sdrCordDrawMode._lastMouseSvg){var l=document.getElementById(\'olt-draw-dashline\');'
              + 'if(l){var sa=document.getElementById(\'olt-scroll-area\');var r=this.getBoundingClientRect();var sr=sa?sa.getBoundingClientRect():{left:0,top:0};var st=sa?sa.scrollTop:0;'
              + 'l.setAttribute(\'x2\',r.left-sr.left+r.width/2);l.setAttribute(\'y2\',r.top-sr.top+st+r.height/2)}}}" '
              + 'onmouseout="this.style.transform=\'\';this.style.zIndex=\'\';'
              + 'this.style.boxShadow=\'\';this.style.borderColor=\'' + fBd + '\'">'
              + (fUsed ? 'F'+f : '<span style="opacity:.35">'+f+'</span>')
              + '</div>';
          }
          fiberGrid += '</div></div>'; // fecha coluna de fibras + coluna do tubo
        }
        fiberGrid += '</div>'; // fecha row de tubos

        dgoHtml += '<div id="dgo-card-' + did + '" style="background:#0f172a;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px">'
          + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
          + '<i class="fas fa-network-wired" style="color:#3b82f6;font-size:.85rem"></i>'
          + '<span style="font-weight:600;color:#e2e8f0;font-size:.85rem;flex:1">' + (d.nome || did) + '</span>'
          + '<span style="font-size:.72rem;color:#64748b">' + usedFibers + '/' + total
          + ' &nbsp;<span style="color:#22c55e">' + freeCount + ' livres</span></span>'
          + '</div>'
          + fiberGrid
          + '</div>';
      });
    }
    dgoHtml += '</div>';

    // ── Montar painel completo ──────────────────────────────────────
    panel.innerHTML = ''
      // Cabeçalho
      + '<div style="background:#0f172a;border-bottom:1px solid #1e3a5f;padding:8px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap">'
      + '<i class="fas fa-server" style="color:#dc2626"></i>'
      + '<span style="color:#e2e8f0;font-weight:700">' + (olt.name || oltId) + '</span>'
      + '<span style="font-size:.74rem;color:#64748b;font-family:monospace">' + (olt.ip_address || '') + '</span>'
      + '<span style="padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:600;background:' + (olt.is_active ? '#14532d' : '#1e293b') + ';color:' + (olt.is_active ? '#22c55e' : '#64748b') + '">' + (olt.is_active ? 'Ativa' : 'Inativa') + '</span>'
      + '<div style="margin-left:auto;display:flex;gap:5px;flex-wrap:wrap">'
      + '<button onclick="sdrOltAddModal(\'' + oltId + '\')" title="Editar OLT" style="padding:4px 8px;font-size:.72rem;background:transparent;border:1px solid #334155;border-radius:5px;color:#94a3b8;cursor:pointer"><i class="fas fa-edit"></i></button>'
      + '<button onclick="sdrDgoCriarModal(\'' + oltId + '\')" title="Novo DGO" style="padding:4px 8px;font-size:.72rem;background:transparent;border:1px solid #334155;border-radius:5px;color:#94a3b8;cursor:pointer"><i class="fas fa-plus"></i>&nbsp;DGO</button>'
      + '<button onclick="sdrOltSlotAdd(\'' + oltId + '\')" title="Adicionar Slot" style="padding:4px 8px;font-size:.72rem;background:transparent;border:1px solid #334155;border-radius:5px;color:#94a3b8;cursor:pointer"><i class="fas fa-plus-square"></i>&nbsp;Slot</button>'
      + '<button onclick="sdrOltStartMapPlace(\'' + oltId + '\')" title="Posicionar no mapa" style="padding:4px 8px;font-size:.72rem;background:transparent;border:1px solid #334155;border-radius:5px;color:#94a3b8;cursor:pointer"><i class="fas fa-map-pin"></i></button>'
      + '<button onclick="sdrOltDelete(\'' + oltId + '\')" title="Excluir OLT" style="padding:4px 8px;font-size:.72rem;background:transparent;border:1px solid #7f1d1d;border-radius:5px;color:#f87171;cursor:pointer"><i class="fas fa-trash"></i></button>'
      + '</div>'
      + '</div>'
      // Área scrollável (sem padding — SVG de cordões ocupa o full scroll area)
      + '<div id="olt-scroll-area" style="flex:1;overflow-y:auto;position:relative">'
      + '<div style="padding:14px">'
      // Banner modo cordão (oculto por padrão)
      + '<div id="olt-cord-banner" style="display:none;background:#1e3a5f;border:1px solid #6366f1;border-radius:8px;padding:8px 14px;margin-bottom:12px;font-size:.8rem;color:#e2e8f0;align-items:center;gap:8px;position:relative;z-index:50">'
      + '<i class="fas fa-pencil-alt" style="color:#6366f1"></i>'
      + '<span id="olt-cord-banner-text">Selecione uma PON para iniciar o cordão</span>'
      + '&nbsp;&nbsp;<button onclick="sdrCordDrawCancel()" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:.78rem;text-decoration:underline">Cancelar</button>'
      + '</div>'
      // Chassis
      + '<div id="olt-chassis-' + oltId + '" style="background:#1a2744;border:1px solid #1e3a5f;border-radius:10px;padding:12px 14px;margin-bottom:16px">'
      // Cabeçalho: título à esquerda + legenda horizontal à direita
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      + '<span style="font-size:.76rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">'
      + '<i class="fas fa-server" style="margin-right:5px;color:#dc2626"></i>Chassis — ' + (olt.model || 'OLT') + '</span>'
      + '<div style="flex:1"></div>'
      + legend
      + '</div>'
      // Só os slots (sem legenda no flex-row)
      + chassisHtml
      + '</div>'
      // DGOs
      + '<div>'
      + '<div style="font-size:.76rem;font-weight:700;color:#94a3b8;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;position:relative;z-index:15;background:#060d1c;padding:2px 0">'
      + '<i class="fas fa-network-wired" style="margin-right:5px;color:#3b82f6"></i>DGOs — Distribuição de Fibras</div>'
      + dgoHtml
      + '</div>'
      + '</div>' // end content wrapper
      + '</div>'; // end scroll area

    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';

    // Desenhar cordões salvos (300ms para DOM settle e layout completo)
    setTimeout(function() {
      _sdrDrawSavedCords(oltId, pons, dgos);
      // Guardar args para redesenho automático no resize/zoom
      window._sdrLastCordArgs = { oltId: oltId, pons: pons, dgos: dgos };
    }, 300);
  });
};

// ── OLT Chassis + Lightpath + Slots (branch main) ────────────────────────
window.sdrOltChassisPreview = function() {
  var brand  = (document.getElementById('sdr-olt-brand')  || {}).value || '';
  var model  = (document.getElementById('sdr-olt-model-sel') || {}).value || '';
  var bd = (SDR_OLT_MODELS[brand] || {});
  var md = (bd.models || {})[model] || {};
  var prev = document.getElementById('olt-chassis-prev');
  if (!prev) return;

  var slots   = parseInt((document.getElementById('sdr-olt-slots')  || {}).value) || md.slots  || 4;
  var gbics   = parseInt((document.getElementById('sdr-olt-gbics')  || {}).value) || md.gbics  || 8;
  var orient  = (document.getElementById('sdr-olt-orient') || {}).value || md.orient || 'deitada';
  var chassis = md.chassis || '#0d1117';
  var plate   = md.plate   || '#1e3a5f';
  var bColor  = bd.brandColor || '#374151';
  var bLabel  = bd.label || 'OLT';
  var prCount = Math.min(gbics, md.ports_per_row || gbics); // portas por linha no preview
  var isVert  = orient === 'pe';

  var rows = '';
  if (!isVert) {
    // Deitada: slots em linhas
    var show = Math.min(slots, 8);
    for (var s = 1; s <= show; s++) {
      rows += '<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px">'
        + '<div style="width:8px;height:14px;background:' + plate + ';border-radius:1px;flex-shrink:0"></div>'
        + '<div style="background:' + plate + '22;border:1px solid ' + plate + '55;border-radius:2px;padding:2px 3px;display:flex;gap:2px;flex:1">';
      for (var p = 1; p <= Math.min(prCount, 16); p++) {
        rows += '<div style="width:8px;height:10px;border-radius:1px;background:' + plate + '66;border:1px solid ' + plate + '99"></div>';
      }
      if (prCount > 16) rows += '<span style="font-size:.5rem;color:' + plate + ';align-self:center">+' + (prCount-16) + '</span>';
      rows += '</div></div>';
    }
    if (slots > 8) rows += '<div style="font-size:.6rem;color:#475569;text-align:center">... +' + (slots-8) + ' slots</div>';
  } else {
    // Em pé: slots em colunas
    rows += '<div style="display:flex;gap:3px;align-items:flex-start">';
    var showS = Math.min(slots, 8);
    for (var s = 1; s <= showS; s++) {
      rows += '<div style="display:flex;flex-direction:column;align-items:center;gap:2px">'
        + '<div style="font-size:.5rem;color:#64748b">S' + s + '</div>'
        + '<div style="background:' + plate + '33;border:1px solid ' + plate + '55;border-radius:2px;padding:2px;display:flex;flex-direction:column;gap:2px">';
      for (var p = 1; p <= Math.min(gbics, 8); p++) {
        rows += '<div style="width:10px;height:8px;border-radius:1px;background:' + plate + '66;border:1px solid ' + plate + '99"></div>';
      }
      rows += '</div></div>';
    }
    if (slots > 8) rows += '<div style="font-size:.55rem;color:#475569;align-self:center">+' + (slots-8) + '</div>';
    rows += '</div>';
  }

  prev.innerHTML =
    // Frame do chassis
    '<div style="background:' + chassis + ';border:2px solid ' + plate + '55;border-radius:6px;padding:6px 8px;font-family:monospace">'
    // Barra superior: logo + LEDs
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">'
    + '<div style="display:flex;align-items:center;gap:4px">'
    + '<div style="width:4px;height:14px;background:' + bColor + ';border-radius:1px"></div>'
    + '<span style="font-size:.65rem;font-weight:700;color:' + bColor + ';letter-spacing:.04em">' + bLabel.toUpperCase() + '</span>'
    + '<span style="font-size:.6rem;color:#475569;margin-left:3px">' + (model || '') + '</span>'
    + '</div>'
    + '<div style="display:flex;gap:3px;align-items:center">'
    + '<div title="PWR" style="width:5px;height:5px;border-radius:50%;background:#16a34a;box-shadow:0 0 3px #16a34a"></div>'
    + '<div title="ALM" style="width:5px;height:5px;border-radius:50%;background:#374151"></div>'
    + '<div title="SYN" style="width:5px;height:5px;border-radius:50%;background:#2563eb;box-shadow:0 0 3px #2563eb66"></div>'
    + '</div></div>'
    // Slots
    + rows
    // Rodapé: capacidade
    + '<div style="margin-top:5px;font-size:.62rem;color:#475569;text-align:center">'
    + slots + ' slots · ' + gbics + ' GBICs/slot · <b style="color:' + bColor + '">' + (slots*gbics) + ' PON total</b>'
    + '</div>'
    + '</div>';

  // Atualiza contador de capacidade
  var cap = document.getElementById('olt-cap-calc');
  if (cap) cap.textContent = (slots * gbics) + ' GBICs';
};

// Ao trocar marca, atualiza lista de modelos e auto-preenche
window.sdrOltBrandChange = function() {
  var brand = (document.getElementById('sdr-olt-brand') || {}).value || '';
  var bd = SDR_OLT_MODELS[brand] || {};
  var modelSel = document.getElementById('sdr-olt-model-sel');
  if (!modelSel) return;
  modelSel.innerHTML = Object.entries(bd.models || {}).map(function(e) {
    return '<option value="' + e[0] + '">' + e[0] + ' — ' + e[1].desc + '</option>';
  }).join('') || '<option value="">Personalizado</option>';
  window.sdrOltModelChange();
};

// Ao trocar modelo, preenche campos e atualiza preview
window.sdrOltModelChange = function() {
  var brand = (document.getElementById('sdr-olt-brand') || {}).value || '';
  var model = (document.getElementById('sdr-olt-model-sel') || {}).value || '';
  var md = ((SDR_OLT_MODELS[brand] || {}).models || {})[model] || {};
  if (!md.slots) { window.sdrOltChassisPreview(); return; }
  var s = document.getElementById('sdr-olt-slots');
  var g = document.getElementById('sdr-olt-gbics');
  var o = document.getElementById('sdr-olt-orient');
  var nm = document.getElementById('sdr-olt-model');
  if (s) s.value = md.slots;
  if (g) g.value = md.gbics;
  if (o) o.value = md.orient || 'deitada';
  if (nm) nm.value = model;
  window.sdrOltChassisPreview();
};

// Modal dedicado para OLT

function _sdrInjectLightCSS() {
  if (document.getElementById('sdr-lp-css')) return;
  var s = document.createElement('style'); s.id = 'sdr-lp-css';
  s.textContent = [
    '@keyframes sdr-cord{to{stroke-dashoffset:-36}}',
    '@keyframes sdr-glow{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.08)}}',
    '.sdr-port-lit{outline:3px solid #818cf8!important;box-shadow:0 0 10px #6366f1!important;animation:sdr-glow .9s ease-in-out infinite;z-index:5;position:relative}',
    '.sdr-fib-lit {outline:3px solid #fbbf24!important;box-shadow:0 0 10px #f59e0b!important;animation:sdr-glow .9s ease-in-out infinite;z-index:5;position:relative}',
    '.sdr-cord-active{stroke-dasharray:12 6!important;animation:sdr-cord .45s linear infinite;filter:drop-shadow(0 0 4px #6366f1)!important}',
    '.sdr-lp-selected{outline:3px solid #f59e0b!important;box-shadow:0 0 14px #f59e0baa!important;animation:sdr-glow .8s ease-in-out infinite;z-index:5;position:relative}',
    '.sdr-fib-connectable{box-shadow:0 0 7px #f59e0b88!important;border-color:#f59e0b!important;cursor:pointer!important;animation:sdr-glow 1.2s ease-in-out infinite}'
  ].join('');
  document.head.appendChild(s);
}

function _dbtS(color) {
  return 'background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44';
}

window.sdrOltLightpathModal = function(oltId) {
  _sdrInjectLightCSS();
  var _inlineEl = document.getElementById('olt-panel-content');
  Promise.all([
    sdrRef('olt_connections/' + oltId).once('value'),
    sdrRef('olt_connections/' + oltId + '/pons').once('value'),
    sdrRef('infrastructure').once('value'),
    sdrRef('onus').once('value')
  ]).then(function(snaps) {
    var olt   = snaps[0].val() || {};
    var pons  = snaps[1].val() || {};
    var infra = snaps[2].val() || {};
    var onus  = snaps[3].val() || {};

    // DGOs desta OLT — vinculados por olt_id ou por conexão de PON
    var dgos = {};
    Object.entries(infra).forEach(function(e) {
      var d = e[1];
      if (!d || d.type !== 'dgo') return;
      var linked = d.olt_id === oltId;
      if (!linked) linked = Object.values(pons).some(function(p){ return p && p.dgo_id === e[0]; });
      if (linked) dgos[e[0]] = d;
    });

    // ONUs por PON key
    var onusByPon = {};
    Object.values(onus).forEach(function(u) {
      if (u && u.olt_id === oltId && u.slot != null && u.port != null) {
        var k = 's' + u.slot + '_p' + u.port;
        if (!onusByPon[k]) onusByPon[k] = [];
        onusByPon[k].push(u);
      }
    });

    var slotCount  = olt.slot_count  || 4;
    var ponPerSlot = olt.pon_per_slot || olt.gbics_per_slot || 8;
    var orientIcon = olt.orientation === 'pe' ? '┃ Placas em pé' : '━ Placas deitadas';

    // ── OLT chassis HTML ─────────────────────────────────────────
    var oltHtml = '';
    for (var sl = 1; sl <= slotCount; sl++) {
      oltHtml += '<div style="margin-bottom:12px">'
        + '<div style="font-size:.6rem;font-weight:700;color:#475569;letter-spacing:.1em;margin-bottom:5px;padding:2px 6px;background:#1a2a40;border-radius:3px;display:inline-block">SLOT ' + sl + '</div>'
        + '<div style="display:flex;gap:3px;flex-wrap:wrap;background:#0a1628;padding:6px;border-radius:6px;border:1px solid #1e3a5f">';
      var portCount = ((olt.slots || {})[sl] || {}).pon_count || ponPerSlot;
      for (var po = 1; po <= portCount; po++) {
        var pkey = 's' + sl + '_p' + po;
        var cfg  = pons[pkey] || {};
        var portOnus = onusByPon[pkey] || [];
        var isConn   = !!(cfg.active && cfg.dgo_id);
        var offCount = portOnus.filter(function(u){ return u.status === 'offline'; }).length;
        var hasAlarm = offCount > 0;
        // Rompimento: TODAS as ONUs da porta estão offline (≥1 ONU) → cabo rompido
        var isRomped = portOnus.length >= 1 && offCount === portOnus.length;
        var bg, bdr, clkAttr = '', extraBtn = '';
        if (!cfg.active)  { bg='#0d1a2e'; bdr='#1e3a5f'; }
        else if (isConn)  {
          if (isRomped)      { bg='#7f1d1d'; bdr='#ef4444'; }
          else if (hasAlarm) { bg='#431407'; bdr='#f97316'; }
          else               { bg='#14532d'; bdr='#22c55e'; }
          // 1×clique = iluminar cordão | 2×clique = desconectar
          clkAttr = 'data-dgo="' + cfg.dgo_id + '" data-fiber="' + (cfg.dgo_fiber_key||'') + '"'
            + ' onclick="sdrLpHighlight(\'pon\',\'' + sl + '_' + po + '\')"'
            + ' ondblclick="event.stopPropagation();sdrLpDisconnect(\'' + oltId + '\',' + sl + ',' + po + ')"';
        } else {
          // Ativa sem DGO → 1×clique seleciona para conectar
          bg='#1c1500'; bdr='#f59e0b';
          clkAttr = 'onclick="sdrLpPonSelect(\'' + oltId + '\',' + sl + ',' + po + ')"';
        }
        // Stub — pequena linha saindo da direita da porta (indica saída do cordão)
        var stub = isConn
          ? '<div style="position:absolute;right:-6px;top:50%;transform:translateY(-50%);width:6px;height:2px;background:' + bdr + ';opacity:.9"></div>'
          : '';
        var ponTitle = isConn
          ? (isRomped ? '⚡ ROMPIMENTO — ' : '') + 'Slot '+sl+' PON '+po+' → '+(dgos[cfg.dgo_id]||{}).nome+' / '+cfg.dgo_fiber_key
            + ' · '+offCount+'/'+portOnus.length+' offline'
            + ' | 1×clique ilumina · 2×clique desconecta'
          : (cfg.active ? 'Slot '+sl+' PON '+po+' — livre · clique para conectar' : 'Slot '+sl+' PON '+po+' — Inativa');
        oltHtml += '<div id="lp-pon-' + sl + '_' + po + '" ' + clkAttr
          + ' title="' + ponTitle + '"'
          + ' style="position:relative;width:30px;height:30px;border-radius:4px;background:' + bg + ';border:2px solid ' + bdr + ';cursor:' + (cfg.active?'pointer':'default') + ';display:flex;align-items:center;justify-content:center;font-size:.6rem;color:#e2e8f0;font-weight:700;flex-shrink:0;user-select:none;transition:transform .12s" '
          + 'onmouseover="if(this.style.cursor!==\'default\')this.style.transform=\'scale(1.15)\'" '
          + 'onmouseout="this.style.transform=\'\'">'
          + po + stub + '</div>';
      }
      oltHtml += '</div></div>';
    }

    // ── DGO panels HTML ───────────────────────────────────────────
    var TC = ['#64748b','#fb923c','#84cc16','#38bdf8','#facc15','#c084fc','#f87171','#4ade80','#a16207','#2dd4bf','#818cf8','#fb7185'];
    var TN = ['Cinza','Laranja','Verde','Azul','Amarelo','Violeta','Vermelho','V.Claro','Marrom','Teal','Índigo','Rosa'];
    var dgoHtml = '';
    var dgoEntries = Object.entries(dgos);

    if (!dgoEntries.length) {
      dgoHtml = '<div style="text-align:center;padding:40px;color:#334155;font-size:.82rem">'
        + '<i class="fas fa-network-wired" style="font-size:2.5rem;display:block;margin-bottom:10px;opacity:.2"></i>'
        + 'Nenhum DGO cadastrado<br><span style="font-size:.72rem">Clique em "Novo DGO" para criar</span></div>';
    } else {
      dgoEntries.forEach(function(de) {
        var did = de[0], d = de[1];
        var fibers = d.fibers || {};
        var tCount = d.tube_count || 12, fpt = d.fiber_per_tube || 12;
        var totalF = tCount * fpt;
        var usedF  = Object.values(fibers).filter(function(f){ return f && f.status === 'used'; }).length;
        var freeF  = totalF - usedF;
        var dgoOrient = d.orientation === 'deitado' ? '📦' : '🗂';
        var freeBadge = '<span style="font-size:.6rem;color:' + (freeF > 0 ? '#4ade80' : '#64748b') + ';margin-left:auto">'
          + freeF + ' livres</span>';
        dgoHtml += '<div style="margin-bottom:16px;background:#0a1628;border-radius:10px;padding:10px;border:1px solid #1e3a5f">'
          + '<div style="font-size:.78rem;font-weight:700;color:#60a5fa;margin-bottom:8px;display:flex;align-items:center;gap:6px">'
          + '<i class="fas fa-network-wired"></i> ' + (d.nome || did)
          + ' <span style="font-size:.65rem;font-weight:400;color:#475569">' + dgoOrient + ' · ' + totalF + 'F</span>'
          + freeBadge + '</div>';
        for (var t2 = 1; t2 <= tCount; t2++) {
          dgoHtml += '<div style="margin-bottom:5px">'
            + '<div style="font-size:.6rem;color:#475569;margin-bottom:3px;display:flex;align-items:center;gap:3px">'
            + '<span style="display:inline-block;width:7px;height:7px;border-radius:1px;background:' + TC[t2-1] + '"></span>'
            + 'T' + t2 + ' ' + TN[t2-1] + '</div>'
            + '<div style="display:flex;gap:2px;flex-wrap:wrap">';
          for (var f2 = 1; f2 <= fpt; f2++) {
            var fkey2 = 't' + t2 + 'f' + f2;
            var fib2  = fibers[fkey2] || {};
            var isFree = fib2.status !== 'used';
            var fBg   = isFree ? '#050e1c' : '#0e2a1a';
            var fBdr  = isFree ? TC[t2-1] + '44' : '#22c55e';
            var fClr  = isFree ? TC[t2-1] + '88' : '#4ade80';
            var fTip  = isFree
              ? ('T'+t2+'F'+f2+' — Livre (selecione uma PON e clique aqui para conectar)')
              : ('T'+t2+'F'+f2+' → Slot '+(fib2.slot||'?')+' PON '+(fib2.port||'?')+' · Clique para iluminar');
            var stubL = !isFree ? '<div style="position:absolute;left:-6px;top:50%;transform:translateY(-50%);width:6px;height:3px;background:' + fBdr + ';border-radius:2px 0 0 2px"></div>' : '';
            var clkF  = isFree
              ? ('class="lp-free-fiber" onclick="sdrLpFiberConnect(\'' + oltId + '\',\'' + did + '\',' + t2 + ',' + f2 + ')"')
              : ('data-dgo="'+did+'" data-fiber="'+fkey2+'" data-slot="'+(fib2.slot||'')+'" data-port="'+(fib2.port||'')+'" onclick="sdrLpHighlight(\'fib\',\''+did+'_'+fkey2+'\')"');
            dgoHtml += '<div id="lp-fib-' + did + '_' + fkey2 + '" ' + clkF
              + ' title="' + fTip + '"'
              + ' style="position:relative;width:22px;height:22px;border-radius:3px;background:' + fBg + ';border:1.5px solid ' + fBdr + ';cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.55rem;color:' + fClr + ';font-weight:700;transition:transform .1s" '
              + 'onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'\'">'
              + f2 + stubL + '</div>';
          }
          dgoHtml += '</div></div>';
        }
        dgoHtml += '</div>';
      });
    }

    // ── HTML compartilhado: status bar + 3 colunas + legenda ────────
    var _sharedBody =
      // Status bar (visível só no modo de conexão)
      '<div id="lp-status" style="display:none;background:#1c1500;border-bottom:1px solid #f59e0b44;padding:7px 16px;font-size:.78rem;color:#fbbf24;align-items:center;gap:8px;flex-shrink:0"></div>'
      // Body 3 colunas: OLT | Zona de Cordões | DGO
      + '<div id="lp-body" style="flex:1;display:flex;overflow:hidden;position:relative;min-height:0">'
      + '<svg id="lp-svg" style="position:absolute;inset:0;pointer-events:none;z-index:1;overflow:visible" width="100%" height="100%"></svg>'
      + '<div id="lp-olt-panel" style="position:relative;z-index:2;width:310px;flex-shrink:0;overflow-y:auto;padding:10px 4px 10px 12px;background:#060d1c;border-right:1px solid #0f172a">'
      + '<div style="font-size:.65rem;font-weight:700;color:#ef4444;letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">'
      + '<span><i class="fas fa-server"></i> OLT — EM PÉ</span>'
      + '<span style="font-size:.57rem;font-weight:400;color:#374151">🟡 1×clique=conectar &nbsp;2×clique=desconectar</span></div>'
      + oltHtml
      + '</div>'
      + '<div id="lp-cord-zone" style="position:relative;z-index:2;width:72px;flex-shrink:0;background:#020810;display:flex;align-items:center;justify-content:center;border-left:1px solid #0c1525;border-right:1px solid #0c1525;overflow:hidden">'
      + '<span style="writing-mode:vertical-rl;font-size:.52rem;letter-spacing:.18em;color:#0f2040;user-select:none;font-weight:700">CORDÕES</span>'
      + '</div>'
      + '<div id="lp-dgo-panel" style="position:relative;z-index:2;flex:1;overflow-y:auto;padding:10px 12px 10px 4px;background:#030b18;border-left:1px solid #0f172a">'
      + '<div style="font-size:.65rem;font-weight:700;color:#3b82f6;letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">'
      + '<span><i class="fas fa-network-wired"></i> DGO — EM PÉ</span>'
      + '<span style="font-size:.57rem;font-weight:400;color:#334155">1×clique=conectar</span></div>'
      + dgoHtml
      + '</div>'
      + '</div>'
      // Legenda
      + '<div style="background:#1e293b;padding:6px 14px;display:flex;gap:12px;font-size:.67rem;color:#475569;flex-shrink:0;flex-wrap:wrap;border-top:1px solid #334155;align-items:center">'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#0e2a1a;border:1.5px solid #22c55e;border-radius:2px;margin-right:3px"></span>OK</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#431407;border:1.5px solid #f97316;border-radius:2px;margin-right:3px"></span>🟠 Rompimento parcial</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#7f1d1d;border:1.5px solid #ef4444;border-radius:2px;margin-right:3px"></span>🔴 Rompimento total</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#1c1500;border:1.5px solid #f59e0b;border-radius:2px;margin-right:3px"></span>Livre → conectar</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#0d1a2e;border:1.5px solid #1e3a5f;border-radius:2px;margin-right:3px"></span>Inativa</span>'
      + '<span style="margin-left:auto;color:#f59e0b;font-size:.65rem"><i class="fas fa-plug"></i> 1×clique numa PON 🟡 → clique na fibra livre · 2×clique numa PON 🟢 → desconecta</span>'
      + '</div>';

    if (_inlineEl) {
      // ── MODO INLINE — renderiza dentro da aba da página OLTs ──────
      _inlineEl.innerHTML =
        '<div style="height:100%;display:flex;flex-direction:column;background:#0f172a;overflow:hidden">'
        // Header da aba com botões de ação
        + '<div style="background:#1e293b;padding:9px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;border-bottom:1px solid #334155;flex-wrap:wrap">'
        + '<div style="width:26px;height:26px;background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-project-diagram" style="color:#fff;font-size:.75rem"></i></div>'
        + '<div style="min-width:0">'
        + '<div style="font-weight:700;font-size:.85rem;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (olt.name || oltId) + '</div>'
        + '<div style="font-size:.62rem;color:#475569">' + orientIcon + ' · ' + slotCount + ' slots · ' + (olt.gbics_per_slot || ponPerSlot) + ' GBICs/slot · IP: ' + (olt.ip_address || '—') + '</div>'
        + '</div>'
        + '<div style="margin-left:auto;display:flex;align-items:center;gap:5px;flex-wrap:wrap">'
        + '<button onclick="sdrOltAddModal(\'' + oltId + '\')" style="padding:4px 10px;font-size:.72rem;background:transparent;border:1px solid #334155;color:#94a3b8;border-radius:5px;cursor:pointer" title="Editar dados da OLT"><i class="fas fa-edit"></i> Editar</button>'
        + '<button onclick="sdrOltVisualModal(\'' + oltId + '\')" style="padding:4px 10px;font-size:.72rem;background:transparent;border:1px solid #334155;color:#94a3b8;border-radius:5px;cursor:pointer" title="Visualização do chassis"><i class="fas fa-th"></i> Chassis</button>'
        + '<button onclick="sdrOltSlotAdd(\'' + oltId + '\')" style="padding:4px 10px;font-size:.72rem;background:transparent;border:1px solid #334155;color:#94a3b8;border-radius:5px;cursor:pointer" title="Gerenciar slots do chassis"><i class="fas fa-layer-group"></i> Slots</button>'
        + '<button onclick="sdrDgoCriarModal(\'' + oltId + '\')" style="padding:4px 10px;font-size:.72rem;background:#1e3a8a;border:1px solid #3b82f6;color:#93c5fd;border-radius:5px;cursor:pointer"><i class="fas fa-plus"></i> Novo DGO</button>'
        + '<button onclick="sdrOltStartMapPlace(\'' + oltId + '\')" style="padding:4px 10px;font-size:.72rem;background:#14532d;border:1px solid #22c55e;color:#4ade80;border-radius:5px;cursor:pointer" title="Posicionar esta OLT no mapa"><i class="fas fa-map-marker-alt"></i> Posicionar</button>'
        + '<button onclick="sdrOltTabSwitch(\'' + oltId + '\')" style="padding:4px 9px;font-size:.72rem;background:transparent;border:1px solid #334155;color:#64748b;border-radius:5px;cursor:pointer" title="Atualizar painel"><i class="fas fa-sync-alt"></i></button>'
        + '<button onclick="sdrOltDelete(\'' + oltId + '\')" style="padding:4px 9px;font-size:.72rem;background:#450a0a;border:1px solid #ef4444;color:#f87171;border-radius:5px;cursor:pointer" title="Excluir OLT"><i class="fas fa-trash"></i></button>'
        + '</div></div>'
        + _sharedBody
        + '</div>';
    } else {
      // ── MODO MODAL — fallback quando a página OLTs não está ativa ──
      var html = '<div id="sdr-lp-modal" style="position:fixed;inset:0;z-index:50002;background:rgba(2,6,23,.88);display:flex;align-items:stretch;justify-content:center;padding:8px">'
        + '<div style="background:#0f172a;border-radius:14px;width:100%;max-width:1200px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.9)">'
        + '<div style="background:#1e293b;padding:11px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;border-bottom:1px solid #334155">'
        + '<div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-project-diagram" style="color:#fff;font-size:.85rem"></i></div>'
        + '<div><div style="font-weight:700;font-size:.9rem;color:#f1f5f9">Painel de Conexão — ' + (olt.name || oltId) + '</div>'
        + '<div style="font-size:.7rem;color:#64748b">' + orientIcon + ' · ' + slotCount + ' slots · ' + (olt.gbics_per_slot || ponPerSlot) + ' GBICs/slot</div></div>'
        + '<div style="margin-left:auto;display:flex;align-items:center;gap:8px">'
        + '<button onclick="sdrDgoCriarModal(\'' + oltId + '\')" style="background:#1e3a8a;border:1px solid #3b82f6;color:#93c5fd;padding:5px 11px;border-radius:6px;font-size:.73rem;cursor:pointer;white-space:nowrap"><i class="fas fa-plus"></i> Novo DGO</button>'
        + '<button onclick="document.getElementById(\'sdr-lp-modal\').remove()" style="background:#ef4444;border:none;color:#fff;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center">&times;</button>'
        + '</div></div>'
        + _sharedBody
        + '</div></div>';
      var prev = document.getElementById('sdr-lp-modal');
      if (prev) prev.remove();
      document.body.insertAdjacentHTML('beforeend', html);
    }

    // Desenha cordões após render
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { _sdrDrawAllCords(pons, dgos); });
    });
  });
};

// Desenha cordões com roteamento ortogonal (linhas retas + curvas de 90°)
// Cordões saem pela LATERAL direita da OLT e entram pela LATERAL esquerda do DGO
// Roteamento: porta → stub horizontal direita → zona de cordões (vertical) → stub horizontal esquerda → fibra
function _sdrDrawAllCords(pons, dgos) {
  var svg      = document.getElementById('lp-svg');
  var body     = document.getElementById('lp-body');
  var oltPanel = document.getElementById('lp-olt-panel');
  var dgoPanel = document.getElementById('lp-dgo-panel');
  var cordZone = document.getElementById('lp-cord-zone');
  if (!svg || !body) return;

  var br       = body.getBoundingClientRect();
  // Limites da zona de cordões
  var zoneL = cordZone ? cordZone.getBoundingClientRect().left  - br.left + 4 : (oltPanel ? oltPanel.getBoundingClientRect().right - br.left + 4 : 310);
  var zoneR = cordZone ? cordZone.getBoundingClientRect().right - br.left - 4 : zoneL + 64;
  var zoneW = Math.max(zoneR - zoneL, 10);

  svg.innerHTML = ''; // limpa tudo

  // Coleta todos os cordões existentes
  var cords = [];
  Object.entries(pons).forEach(function(e) {
    var pkey = e[0], cfg = e[1];
    if (!cfg || !cfg.active || !cfg.dgo_id || !cfg.dgo_fiber_key) return;
    var m = pkey.match(/^s(\d+)_p(\d+)$/);
    if (!m) return;
    var ponEl = document.getElementById('lp-pon-' + m[1] + '_' + m[2]);
    var fibEl = document.getElementById('lp-fib-' + cfg.dgo_id + '_' + cfg.dgo_fiber_key);
    if (!ponEl || !fibEl) return;
    var pr = ponEl.getBoundingClientRect();
    var fr = fibEl.getBoundingClientRect();
    cords.push({
      id : m[1] + '_' + m[2],
      x1 : pr.right - br.left,           // ponta direita da porta OLT
      y1 : pr.top + pr.height / 2 - br.top,
      x2 : fr.left  - br.left,           // ponta esquerda da fibra DGO
      y2 : fr.top + fr.height / 2 - br.top
    });
  });

  if (!cords.length) return;

  // Distribui cordões em "lanes" dentro da zona para evitar sobreposição
  // Ordena por y1 para atribuir lanes sequenciais
  cords.sort(function(a, b) { return a.y1 - b.y1; });
  var maxLanes  = Math.max(1, Math.min(cords.length, Math.floor(zoneW / 6)));
  var laneStep  = zoneW / maxLanes;

  cords.forEach(function(c, i) {
    // X do segmento vertical dentro da zona (lane distribuída)
    var laneX = zoneL + laneStep * (i % maxLanes) + laneStep / 2;
    var r     = 7; // raio das curvas de 90°
    var dy    = c.y2 - c.y1;
    var d;

    if (Math.abs(dy) < 2) {
      // Mesmo Y — linha reta horizontal
      d = 'M' + c.x1 + ',' + c.y1 + ' H' + c.x2;
    } else {
      var dir = dy > 0 ? 1 : -1;
      var ar  = Math.min(r, Math.abs(dy) / 2); // raio adaptativo
      // Caminho: saída direita → curva 90° para baixo/cima → vertical → curva 90° → entrada esquerda
      d = 'M'  + c.x1              + ',' + c.y1
        + ' H' + (laneX - ar)
        + ' Q' + laneX + ',' + c.y1 + ' ' + laneX + ',' + (c.y1 + dir * ar)
        + ' V' + (c.y2 - dir * ar)
        + ' Q' + laneX + ',' + c.y2 + ' ' + (laneX + ar) + ',' + c.y2
        + ' H' + c.x2;
    }

    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id',           'lp-cord-' + c.id);
    path.setAttribute('d',            d);
    path.setAttribute('fill',         'none');
    path.setAttribute('stroke',       '#1e3a5f');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('opacity',      '0.8');
    svg.appendChild(path);
  });
}

// Ilumina o caminho ao clicar numa porta ou fibra
window.sdrLpHighlight = function(type, id) {
  _sdrInjectLightCSS();
  // Limpa highlights anteriores
  document.querySelectorAll('.sdr-port-lit,.sdr-fib-lit').forEach(function(el){
    el.classList.remove('sdr-port-lit','sdr-fib-lit');
  });
  var svg = document.getElementById('lp-svg');
  if (svg) {
    svg.querySelectorAll('[data-lit]').forEach(function(p){
      p.removeAttribute('data-lit');
      p.setAttribute('stroke', '#1e3a5f');
      p.setAttribute('stroke-width', '1.5');
      p.setAttribute('opacity', '0.55');
      p.classList.remove('sdr-cord-active');
    });
  }

  var ponEl, fibEl, cordId;
  if (type === 'pon') {
    ponEl = document.getElementById('lp-pon-' + id);
    if (!ponEl) return;
    var dgoId2  = ponEl.dataset.dgo;
    var fibKey2 = ponEl.dataset.fiber;
    if (!dgoId2 || !fibKey2) return;
    fibEl  = document.getElementById('lp-fib-' + dgoId2 + '_' + fibKey2);
    cordId = 'lp-cord-' + id;
  } else {
    fibEl = document.getElementById('lp-fib-' + id);
    if (!fibEl) return;
    var sl2 = fibEl.dataset.slot, po2 = fibEl.dataset.port;
    if (!sl2 || !po2) return;
    ponEl  = document.getElementById('lp-pon-' + sl2 + '_' + po2);
    cordId = 'lp-cord-' + sl2 + '_' + po2;
  }

  if (ponEl) ponEl.classList.add('sdr-port-lit');
  if (fibEl) fibEl.classList.add('sdr-fib-lit');
  var cord = cordId ? document.getElementById(cordId) : null;
  if (cord) {
    cord.setAttribute('stroke', '#818cf8');
    cord.setAttribute('stroke-width', '3.5');
    cord.setAttribute('opacity', '1');
    cord.setAttribute('data-lit', '1');
    cord.classList.add('sdr-cord-active');
    cord.setAttribute('stroke-dasharray', '12 5');
  }
  if (fibEl) { try { fibEl.scrollIntoView({behavior:'smooth',block:'nearest'}); } catch(ex){} }
  if (ponEl) { try { ponEl.scrollIntoView({behavior:'smooth',block:'nearest'}); } catch(ex){} }
};

// ── Estado de conexão interativa no painel lightpath ──────────────────
var _sdrLpConnState = null; // { oltId, sl, po }

// 1. Seleciona uma PON para entrar em modo de conexão
window.sdrLpPonSelect = function(oltId, sl, po) {
  _sdrInjectLightCSS();
  // Limpa highlights de caminho óptico
  document.querySelectorAll('.sdr-port-lit,.sdr-fib-lit').forEach(function(el){
    el.classList.remove('sdr-port-lit','sdr-fib-lit');
  });
  var svg = document.getElementById('lp-svg');
  if (svg) svg.querySelectorAll('[data-lit]').forEach(function(p){
    p.removeAttribute('data-lit'); p.setAttribute('stroke','#1e3a5f');
    p.setAttribute('stroke-width','1.5'); p.setAttribute('opacity','0.55');
    p.classList.remove('sdr-cord-active');
  });
  var statusEl = document.getElementById('lp-status');
  // Toggle: desseleciona se já está selecionada
  if (_sdrLpConnState && _sdrLpConnState.sl == sl && _sdrLpConnState.po == po) {
    var prevEl = document.getElementById('lp-pon-' + _sdrLpConnState.sl + '_' + _sdrLpConnState.po);
    if (prevEl) prevEl.classList.remove('sdr-lp-selected');
    _sdrLpConnState = null;
    if (statusEl) statusEl.style.display = 'none';
    document.querySelectorAll('.lp-free-fiber').forEach(function(e){ e.classList.remove('sdr-fib-connectable'); });
    return;
  }
  // Remove seleção anterior
  if (_sdrLpConnState) {
    var prevEl2 = document.getElementById('lp-pon-' + _sdrLpConnState.sl + '_' + _sdrLpConnState.po);
    if (prevEl2) prevEl2.classList.remove('sdr-lp-selected');
  }
  _sdrLpConnState = { oltId: oltId, sl: sl, po: po };
  // Destaca porta selecionada
  var ponEl = document.getElementById('lp-pon-' + sl + '_' + po);
  if (ponEl) ponEl.classList.add('sdr-lp-selected');
  // Mostra barra de status
  if (statusEl) {
    statusEl.innerHTML = '<i class="fas fa-plug" style="color:#f59e0b"></i>'
      + '&nbsp;<b style="color:#fbbf24">Slot ' + sl + ' · PON ' + po + '</b>'
      + '<span style="color:#94a3b8;margin:0 10px">aguardando fibra</span>'
      + '→ clique em uma <b style="color:#4ade80">fibra livre</b> no DGO para conectar o cordão'
      + '<button onclick="_sdrLpCancelSelect()" style="margin-left:auto;background:none;border:1px solid #ef4444;color:#ef4444;border-radius:4px;padding:2px 10px;font-size:.7rem;cursor:pointer"><i class="fas fa-times"></i> Cancelar</button>';
    statusEl.style.display = 'flex';
  }
  // Pulsa fibras livres como clicáveis
  document.querySelectorAll('.lp-free-fiber').forEach(function(e){ e.classList.add('sdr-fib-connectable'); });
};

// Cancela modo de conexão
window._sdrLpCancelSelect = function() {
  if (_sdrLpConnState) {
    var el = document.getElementById('lp-pon-' + _sdrLpConnState.sl + '_' + _sdrLpConnState.po);
    if (el) el.classList.remove('sdr-lp-selected');
  }
  _sdrLpConnState = null;
  document.querySelectorAll('.lp-free-fiber').forEach(function(e){ e.classList.remove('sdr-fib-connectable'); });
  var statusEl = document.getElementById('lp-status');
  if (statusEl) statusEl.style.display = 'none';
};

// 2. Conecta a PON selecionada a uma fibra livre do DGO
window.sdrLpFiberConnect = function(oltId, did, t, f) {
  if (!_sdrLpConnState) return; // só age se houver PON selecionada
  var sl = _sdrLpConnState.sl, po = _sdrLpConnState.po;
  var fkey = 't' + t + 'f' + f;
  var ponKey = 's' + sl + '_p' + po;
  var ponRef   = sdrRef('olt_connections/' + oltId + '/pons/' + ponKey);
  var fiberRef = sdrRef('infrastructure/' + did + '/fibers/' + fkey);
  // Libera fibra anterior desta PON, se houver
  ponRef.once('value').then(function(snap) {
    var prev = snap.val() || {};
    var chain = Promise.resolve();
    if (prev.dgo_id && prev.dgo_fiber_key) {
      chain = sdrRef('infrastructure/' + prev.dgo_id + '/fibers/' + prev.dgo_fiber_key)
        .update({ status: 'free', olt_id: null, slot: null, port: null, label: null });
    }
    return chain;
  }).then(function() {
    return fiberRef.set({
      status: 'used', olt_id: oltId,
      slot: parseInt(sl), port: parseInt(po),
      label: 'OLT Slot' + sl + '/PON' + po,
      connected_at: new Date().toISOString()
    });
  }).then(function() {
    return ponRef.update({
      dgo_id: did, dgo_fiber_key: fkey,
      active: true, updated_at: new Date().toISOString()
    });
  }).then(function() {
    _sdrLpConnState = null;
    if (typeof toast === 'function') toast('Cordão: Slot ' + sl + ' PON ' + po + ' → T' + t + 'F' + f, 'success');
    sdrOltLightpathModal(oltId);
  }).catch(function(err) {
    if (typeof toast === 'function') toast('Erro: ' + (err.message || err), 'error');
  });
};

// 3. Desconecta uma PON (remove do Firebase e atualiza fibra do DGO para livre)
window.sdrLpDisconnect = function(oltId, sl, po) {
  if (!confirm('Desconectar Slot ' + sl + ' PON ' + po + '?\nA fibra do DGO ficará livre.')) return;
  var ponKey = 's' + sl + '_p' + po;
  var ponRef = sdrRef('olt_connections/' + oltId + '/pons/' + ponKey);
  ponRef.once('value').then(function(snap) {
    var cfg = snap.val() || {};
    var chain = Promise.resolve();
    if (cfg.dgo_id && cfg.dgo_fiber_key) {
      chain = sdrRef('infrastructure/' + cfg.dgo_id + '/fibers/' + cfg.dgo_fiber_key)
        .update({ status: 'free', olt_id: null, slot: null, port: null, label: null });
    }
    return chain;
  }).then(function() {
    return ponRef.update({ dgo_id: null, dgo_fiber_key: null });
  }).then(function() {
    if (typeof toast === 'function') toast('PON desconectada · Slot ' + sl + ' PON ' + po, 'success');
    sdrOltLightpathModal(oltId);
  }).catch(function(err) {
    if (typeof toast === 'function') toast('Erro: ' + (err.message || err), 'error');
  });
};


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
  if (_sdrCordDrawMode && _sdrCordDrawMode._startType === 'fiber') {
    _sdrCordFinishFiberToPon(oltId, slot, port);
    return;
  }
  if (_sdrCordDrawMode) { sdrCordDrawCancel(); return; }

  // Se PON conectada ao DGO → apenas mostrar rastreabilidade (sem modo de edição de waypoints)
  var ponBtn = document.getElementById('pon-btn-' + oltId + '-' + slot + '-' + port);
  if (ponBtn && ponBtn.getAttribute('data-has-cord')) {
    if (window._sdrCordEdit) _sdrCordEditCancel();
    var _dgoId    = ponBtn.getAttribute('data-dgo-id');
    var _fiberKey = ponBtn.getAttribute('data-fiber-key');
    if (_dgoId) _sdrRastreabilidade(oltId, slot, port, _dgoId, _fiberKey);
    return;
  }

  _sdrCordDrawMode = { oltId: oltId, slot: slot, port: port, waypoints: [], _ponBtn: ponBtn };

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
    _sdrCordDrawMode._lastMouseSvg = pos;
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
  _sdrCordDrawMode._onMouseMove   = onMouseMove;
  _sdrCordDrawMode._onScroll      = onScroll;
  _sdrCordDrawMode._onScrollClick = onScrollClick;

  _sdrCordSvgUpdate();
  if (typeof toast === 'function') toast('SL' + slot + ' PON ' + port + ' selecionada — clique para adicionar pontos do cordão', 'info');
};

// ── Cancelar modo de cordão ─────────────────────────────────────────
window.sdrCordDrawCancel = function() {
  if (window._sdrCordEdit) { _sdrCordEditCancel(); return; }
  if (!_sdrCordDrawMode) return;
  var m = _sdrCordDrawMode;
  _sdrCordDrawMode = null;

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
  if (!_sdrCordDrawMode) {
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
  if (_sdrCordDrawMode._startType === 'fiber') {
    // Clicou na fibra de origem (cancela) ou em outra fibra (trocar destino não faz sentido → cancelar)
    sdrCordDrawCancel();
    return;
  }
  var m      = _sdrCordDrawMode;
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
  // OLT ativa fica na global _sdrActiveOltTab (setada pelo sdrOltTabSwitch)
  var oltId = window._sdrActiveOltTab || null;
  if (!oltId) { if (typeof toast === 'function') toast('Abra o painel de uma OLT primeiro', 'warn'); return; }

  var fiberEl = document.getElementById('dgo-fiber-' + dgoId + '-' + fiberKey);

  _sdrCordDrawMode = {
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
    _sdrCordDrawMode._lastMouseSvg = pos;
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
    _sdrCordDrawMode._onMouseMove   = onMouseMove;
    _sdrCordDrawMode._onScroll      = onScroll;
    _sdrCordDrawMode._onScrollClick = onScrollClick;
  }

  _sdrCordSvgUpdate();
  if (typeof toast === 'function') toast('Fibra ' + fiberKey + ' — clique na PON de destino para finalizar', 'info');
};

// ── Finalizar circuito: fibra DGO → PON (suporta reconexão) ─────────
window._sdrCordFinishFiberToPon = function(oltId, slot, port) {
  var m = _sdrCordDrawMode;
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
    if (document.getElementById('olt-panel-content') && _sdrActiveOltTab === oltId) {
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
    var oldTab = _sdrActiveOltTab;
    if (oldTab && document.getElementById('olt-panel-content')) {
      sdrOltInlineRender(oldTab);
    }
  }
};

// ── Posicionar OLT no mapa ──────────────────────────────────────────
window.sdrOltStartMapPlace = function(oltId) {
  var name = (sdrOltsCache[oltId] || {}).name || 'OLT';
  _sdrOltPlaceMode = { oltId: oltId, name: name };
  if (typeof showPage === 'function') showPage('mapa');
  setTimeout(function() {
    var mapEl = document.getElementById('sdr-map');
    if (mapEl) mapEl.style.cursor = 'crosshair';
    var existing = document.getElementById('sdr-olt-place-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'sdr-olt-place-banner';
    banner.style.cssText = 'position:absolute;top:60px;left:50%;transform:translateX(-50%);'
      + 'z-index:9999;background:#1e3a5f;border:1px solid #6366f1;border-radius:8px;'
      + 'padding:8px 16px;color:#e2e8f0;font-size:.82rem;display:flex;align-items:center;'
      + 'gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.4);white-space:nowrap';
    banner.innerHTML = '<i class="fas fa-map-pin" style="color:#6366f1"></i> Clique no mapa para posicionar <b>' + name + '</b>'
      + ' <button onclick="_sdrCancelOltPlace()" style="margin-left:8px;background:#dc2626;border:none;'
      + 'border-radius:4px;color:#fff;padding:2px 8px;cursor:pointer;font-size:.75rem">Cancelar</button>';
    var mapParent = mapEl ? mapEl.parentElement : null;
    if (mapParent) {
      if (getComputedStyle(mapParent).position === 'static') mapParent.style.position = 'relative';
      mapParent.appendChild(banner);
    } else {
      document.body.appendChild(banner);
    }
  }, 400);
};

window._sdrCancelOltPlace = function() {
  _sdrOltPlaceMode = null;
  var _placeMapEl = document.getElementById('sdr-map');
  if (_placeMapEl) _placeMapEl.style.cursor = '';
  var _placeBanner = document.getElementById('sdr-olt-place-banner');
  if (_placeBanner) _placeBanner.remove();
};

// ── Hook de click no mapa ──────────────────────────────────────────
// (chamado pelo sdrMap.on('click') que já existe no código de inicialização do mapa)
window.sdrMapClickCapture = function(lat, lng) {
  if (_sdrOltPlaceMode) {
    var mode = _sdrOltPlaceMode;
    _sdrOltPlaceMode = null;
    var _placeMapEl = document.getElementById('sdr-map');
    if (_placeMapEl) _placeMapEl.style.cursor = '';
    var _placeBanner = document.getElementById('sdr-olt-place-banner');
    if (_placeBanner) _placeBanner.remove();
    sdrRef('olt_connections/' + mode.oltId).update({ lat: lat, lng: lng }).then(function() {
      if (typeof toast === 'function') toast(mode.name + ' posicionada no mapa!', 'success');
      sdrRef('olt_connections').once('value').then(function(s) {
        sdrOltsCache = s.val() || {};
        if (typeof sdrMapRenderOlts === 'function') sdrMapRenderOlts();
      });
    });
    return true;
  }
  return false;
};

// ════════════════════════════════════════════════════
// SPRINT 3 — OLTs CRUD MELHORADO
// ════════════════════════════════════════════════════

let sdrOnusCache = {};

// Render de OLTs — versão Sprint 4 (tab interface)
window.sdrOltsRender = function() {
  // Ajustar estilo do page-olts para layout flex sem padding
  var pageEl = document.getElementById('page-olts');
  if (pageEl) pageEl.style.cssText = 'padding:0;overflow:hidden;height:calc(100vh - 56px);display:flex;flex-direction:column';

  // Garantir HTML da tab interface
  if (!document.getElementById('olts-tab-bar')) {
    var _htmlFn = window._sdrHtml_olts;
    if (pageEl && _htmlFn) pageEl.innerHTML = _htmlFn();
  }

  Promise.all([
    sdrRef('olt_connections').once('value'),
    sdrRef('onus').once('value')
  ]).then(function(snaps) {
    sdrOltsCache = snaps[0].val() || {};
    sdrOnusCache = snaps[1].val() || {};

    // Atualizar marcadores OLT no mapa (só se o mapa já foi inicializado)
    try { if (typeof sdrMapRenderOlts === 'function' && window.sdrLayers && sdrLayers.olts) sdrMapRenderOlts(); } catch(e) {}

    var tabBar = document.getElementById('olts-tab-bar');
    var panel  = document.getElementById('olt-panel-content');
    if (!tabBar) return;

    var items = Object.entries(sdrOltsCache);

    if (items.length === 0) {
      tabBar.innerHTML = '';
      if (panel) panel.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#64748b">'
        + '<i class="fas fa-server" style="font-size:3rem;opacity:.3;display:block;margin-bottom:16px"></i>'
        + '<p style="font-size:.9rem;margin-bottom:12px">Nenhuma OLT cadastrada</p>'
        + '<button onclick="sdrOltAddModal()" style="padding:8px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer"><i class="fas fa-plus"></i> Cadastrar primeira OLT</button>'
        + '</div>';
      return;
    }

    if (!_sdrActiveOltTab || !sdrOltsCache[_sdrActiveOltTab]) {
      _sdrActiveOltTab = items[0][0];
    }

    tabBar.innerHTML = items.map(function(e) {
      var id = e[0], o = e[1];
      var active     = id === _sdrActiveOltTab;
      var onusThisOlt = Object.values(sdrOnusCache).filter(function(u){ return u.olt_id === id; });
      var hasAlarm   = onusThisOlt.some(function(u){ return u.status === 'offline'; });
      var dotColor   = !o.is_active ? '#64748b' : hasAlarm ? '#ef4444' : '#22c55e';
      return '<button id="olt-tab-' + id + '" onclick="sdrOltTabSwitch(\'' + id + '\')" '
        + 'style="padding:8px 14px;border:none;border-bottom:2px solid ' + (active ? '#6366f1' : 'transparent') + ';'
        + 'background:' + (active ? '#1e3a5f' : 'transparent') + ';color:' + (active ? '#e2e8f0' : '#64748b') + ';'
        + 'font-weight:' + (active ? '600' : '400') + ';font-size:.82rem;cursor:pointer;'
        + 'white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:6px;transition:all .15s">'
        + '<span style="width:7px;height:7px;border-radius:50%;background:' + dotColor + ';flex-shrink:0"></span>'
        + (o.name || id) + '</button>';
    }).join('');

    // Atualizar filtro de OLTs na página ONUs
    var oltFilter = document.getElementById('onus-filter-olt');
    if (oltFilter) {
      var current = oltFilter.value;
      oltFilter.innerHTML = '<option value="">Todas OLTs</option>'
        + items.map(function(e) {
          return '<option value="' + e[0] + '"' + (e[0] === current ? ' selected' : '') + '>' + (e[1].name || e[0]) + '</option>';
        }).join('');
    }

    sdrOltTabSwitch(_sdrActiveOltTab);
  });
};

// Modal dedicado para OLT
window.sdrOltAddModal = function(editId) {
  // Buscar DGOs disponíveis para seleção antes de abrir o modal
  sdrRef('infrastructure').once('value').then(function(snap) {
    var allInfra = snap.val() || {};
    var d        = editId ? (sdrOltsCache[editId] || {}) : {};
    var isEdit   = !!editId;

    // DGOs disponíveis: sem olt_id (livres) + o já vinculado a esta OLT
    var dgoOptions = '<option value="">— Nenhum / selecionar depois —</option>';
    Object.entries(allInfra).forEach(function(e) {
      var did = e[0], dg = e[1];
      if (!dg || dg.type !== 'dgo') return;
      var vinculado = dg.olt_id === editId;
      var livre     = !dg.olt_id;
      if (vinculado || livre) {
        var label = (dg.nome || did) + (vinculado ? ' ← vinculado' : ' (livre)');
        dgoOptions += '<option value="' + did + '"' + (vinculado ? ' selected' : '') + '>' + label + '</option>';
      }
    });

    // DGO(s) já vinculados a esta OLT (para exibição informativa)
    var dgosVinculados = Object.entries(allInfra).filter(function(e) {
      return e[1] && e[1].type === 'dgo' && e[1].olt_id === editId;
    });
    var dgoInfoHtml = '';
    if (isEdit && dgosVinculados.length > 0) {
      dgoInfoHtml = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin-top:4px;font-size:.78rem;color:#15803d">'
        + '<i class="fas fa-check-circle"></i> DGO vinculado: <b>'
        + dgosVinculados.map(function(e){ return e[1].nome || e[0]; }).join(', ')
        + '</b></div>';
    }

    var html = '<div class="modal-overlay" id="sdr-modal" onclick="if(event.target===this)this.remove()">'
      + '<div class="modal-box" style="max-width:520px">'
      + '<div class="modal-header">'
      + '<h3><i class="fas fa-server" style="color:#dc2626;margin-right:8px"></i>' + (isEdit ? 'Editar' : 'Nova') + ' OLT</h3>'
      + '<button onclick="document.getElementById(\'sdr-modal\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<div class="form-group"><label>Nome</label><input id="sdr-olt-name" value="' + (d.name || '') + '" placeholder="Ex: OLT-01 Central"></div>'
      + '<div class="form-group"><label>Modelo</label><input id="sdr-olt-model" value="' + (d.model || '') + '" placeholder="Ex: Fiberhome AN5516-04"></div>'
      + '<div style="display:flex;gap:10px">'
      + '<div class="form-group" style="flex:1"><label>IP Address</label><input id="sdr-olt-ip" value="' + (d.ip_address || '') + '" placeholder="Ex: 192.168.1.100"></div>'
      + '<div class="form-group" style="flex:1"><label>Portas PON</label><input id="sdr-olt-pon" type="number" value="' + (d.total_pon_ports || 8) + '"></div>'
      + '</div>'
      + '<div style="display:flex;gap:10px">'
      + '<div class="form-group" style="flex:1"><label>SNMP Community</label><input id="sdr-olt-snmp" value="' + (d.snmp_community || 'public') + '" placeholder="public"></div>'
      + '<div class="form-group" style="flex:1"><label>Versão SNMP</label>'
      + '<select id="sdr-olt-snmpv"><option value="2c" ' + (d.snmp_version !== '3' ? 'selected' : '') + '>v2c</option>'
      + '<option value="3" ' + (d.snmp_version === '3' ? 'selected' : '') + '>v3</option></select>'
      + '</div></div>'
      + '<div style="display:flex;gap:10px">'
      + '<div class="form-group" style="flex:1"><label>Latitude</label><input id="sdr-olt-lat" type="number" step="any" value="' + (d.lat || '') + '"></div>'
      + '<div class="form-group" style="flex:1"><label>Longitude</label><input id="sdr-olt-lng" type="number" step="any" value="' + (d.lng || '') + '"></div>'
      + '</div>'
      + '<div class="form-group">'
      + '<label style="display:flex;align-items:center;gap:6px">'
      + '<input type="checkbox" id="sdr-olt-active" ' + (d.is_active !== false ? 'checked' : '') + '> OLT Ativa'
      + '</label></div>'
      // ── Seção DGO ──────────────────────────────────────────
      + '<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;margin-top:4px">'
      + '<div style="font-size:.76rem;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">'
      + '<i class="fas fa-network-wired" style="color:#3b82f6;margin-right:5px"></i>DGO — Distribuidor Óptico</div>'
      + '<div style="display:flex;gap:8px;align-items:flex-end">'
      + '<div class="form-group" style="flex:1;margin:0">'
      + '<label style="font-size:.74rem;color:#64748b;display:block;margin-bottom:4px">Vincular DGO existente</label>'
      + '<select id="sdr-olt-dgo-id" style="width:100%;padding:7px 10px;border:1px solid #334155;border-radius:6px;background:#0a1628;color:#e2e8f0;font-size:.83rem">'
      + dgoOptions + '</select>'
      + '</div>'
      + '<button type="button" onclick="sdrOltModalCriarDgo(\'' + (editId || '__novo__') + '\')" '
      + 'title="Criar novo DGO" '
      + 'style="padding:7px 12px;font-size:.78rem;background:#1e3a5f;border:1px solid #3b82f6;border-radius:6px;color:#93c5fd;cursor:pointer;white-space:nowrap;flex-shrink:0">'
      + '<i class="fas fa-plus"></i> Novo DGO</button>'
      + '</div>'
      + dgoInfoHtml
      + '</div>'
      // ────────────────────────────────────────────────────────
      + '</div>'
      + '<div class="modal-footer">'
      + '<button class="btn-secondary" onclick="document.getElementById(\'sdr-modal\').remove()">Cancelar</button>'
      + '<button class="btn-primary" onclick="sdrOltSave(\'' + (editId || '') + '\')">' + (isEdit ? 'Salvar' : 'Cadastrar') + '</button>'
      + '</div></div></div>';

    var prev = document.getElementById('sdr-modal');
    if (prev) prev.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    // IMPORTANTE: adicionar classe 'open' para o modal aparecer
    var m = document.getElementById('sdr-modal');
    if (m) m.classList.add('open');
  });
};

// ── Botão "Novo DGO" dentro do modal de OLT ──────────────────────────
window.sdrOltModalCriarDgo = function(oltIdOrPlaceholder) {
  // Fechar modal da OLT, abrir modal DGO, depois reabrir OLT
  var modal = document.getElementById('sdr-modal');
  var dgoIdSel = (document.getElementById('sdr-olt-dgo-id') || {}).value || '';
  if (modal) modal.remove();
  // Salvar contexto para reabrir a OLT depois
  var isNovo = oltIdOrPlaceholder === '__novo__';
  var editId = isNovo ? null : oltIdOrPlaceholder;
  sdrDgoCriarModal(isNovo ? '' : editId);
  // Quando o DGO for criado, o sdrDgoSalvar já chama sdrOltInlineRender
  // Depois fechar o DGO modal e reabrir o OLT modal para escolha
  var orig = window.sdrDgoSalvar;
  window.sdrDgoSalvar = function(oid) {
    window.sdrDgoSalvar = orig; // restaurar
    orig.call(this, oid);
    // Reabrir modal da OLT após a criação do DGO
    setTimeout(function() { sdrOltAddModal(editId || ''); }, 500);
  };
};

window.sdrOltSave = async function(editId) {
  const name = (document.getElementById('sdr-olt-name') || {}).value && document.getElementById('sdr-olt-name').value.trim();
  if (!name) { if (typeof toast === 'function') toast('Nome é obrigatório', 'error'); return; }

  const dgoIdSelecionado = ((document.getElementById('sdr-olt-dgo-id') || {}).value || '').trim();

  const data = {
    name,
    model:           (document.getElementById('sdr-olt-model')  || {}).value && document.getElementById('sdr-olt-model').value.trim()  || '',
    ip_address:      (document.getElementById('sdr-olt-ip')     || {}).value && document.getElementById('sdr-olt-ip').value.trim()     || '',
    total_pon_ports: parseInt((document.getElementById('sdr-olt-pon') || {}).value) || 8,
    snmp_community:  (document.getElementById('sdr-olt-snmp')   || {}).value && document.getElementById('sdr-olt-snmp').value.trim()   || 'public',
    snmp_version:    (document.getElementById('sdr-olt-snmpv')  || {}).value || '2c',
    is_active:       !!(document.getElementById('sdr-olt-active') || {}).checked,
    updated_at:      new Date().toISOString()
  };
  const lat = parseFloat((document.getElementById('sdr-olt-lat') || {}).value);
  const lng = parseFloat((document.getElementById('sdr-olt-lng') || {}).value);
  if (!isNaN(lat)) data.lat = lat;
  if (!isNaN(lng)) data.lng = lng;

  if (!editId) data.created_at = new Date().toISOString();

  try {
    var oltId = editId;

    if (editId) {
      await sdrRef('olt_connections/' + editId).update(data);
      if (typeof toast === 'function') toast('OLT atualizada!', 'success');
    } else {
      var newRef = await sdrRef('olt_connections').push(data);
      oltId = newRef.key;
      if (typeof toast === 'function') toast('OLT cadastrada!', 'success');
    }

    // ── Vincular DGO selecionado ─────────────────────────────────
    if (dgoIdSelecionado) {
      // Desvincular qualquer DGO anterior desta OLT (se houver)
      var infraSnap = await sdrRef('infrastructure').once('value');
      var infra = infraSnap.val() || {};
      var dgoUpdates = {};
      Object.entries(infra).forEach(function(e) {
        var did = e[0], dg = e[1];
        if (dg && dg.type === 'dgo' && dg.olt_id === oltId && did !== dgoIdSelecionado) {
          dgoUpdates['infrastructure/' + did + '/olt_id'] = null;
        }
      });
      // Vincular o novo DGO
      dgoUpdates['infrastructure/' + dgoIdSelecionado + '/olt_id'] = oltId;
      await sdrRef('').update(dgoUpdates);
    }

    var modal = document.getElementById('sdr-modal');
    if (modal) modal.remove();

    if (!editId) {
      // Nova OLT: re-render lista + oferecer posicionamento
      sdrOltsRender();
      setTimeout(function() {
        if (confirm('Deseja posicionar a OLT no mapa agora?')) {
          sdrOltStartMapPlace(oltId);
        }
      }, 400);
    } else {
      // Edição: re-render painel inline se estiver aberto
      sdrOltsRender();
      if (document.getElementById('olt-panel-content') && _sdrActiveOltTab === editId) {
        sdrOltInlineRender(editId);
      }
    }
  } catch (e) {
    if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
    console.error('[sdrOltSave]', e);
  }
};

window.sdrOltDelete = async function(id) {
  if (!confirm('Excluir esta OLT?')) return;
  try {
    await sdrRef(`olt_connections/${id}`).remove();
    toast('OLT excluída', 'success');
    sdrCloseSidePanel();
    sdrOltsRender();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// Painel lateral da OLT
window.sdrOpenOltPanel = function(id) {
  const o = sdrOltsCache[id];
  if (!o) return;
  document.getElementById('sp-title').textContent = o.name || 'OLT';

  const onusThisOlt = Object.entries(sdrOnusCache).filter(([, u]) => u.olt_id === id);
  const online = onusThisOlt.filter(([, u]) => u.status === 'online').length;
  const degraded = onusThisOlt.filter(([, u]) => u.status === 'degraded').length;
  const offline = onusThisOlt.filter(([, u]) => u.status === 'offline').length;

  let html = `<div class="sp-section">
    <div class="sp-section-title"><i class="fas fa-server" style="color:#dc2626"></i> Dados da OLT</div>
    <div class="sp-row"><span class="sp-label">Nome</span><span class="sp-val">${o.name || '-'}</span></div>
    <div class="sp-row"><span class="sp-label">Modelo</span><span class="sp-val">${o.model || '-'}</span></div>
    <div class="sp-row"><span class="sp-label">IP</span><span class="sp-val" style="font-family:monospace">${o.ip_address || '-'}</span></div>
    <div class="sp-row"><span class="sp-label">SNMP</span><span class="sp-val">${o.snmp_community || '-'} (${o.snmp_version || 'v2c'})</span></div>
    <div class="sp-row"><span class="sp-label">Portas PON</span><span class="sp-val">${o.total_pon_ports || '-'}</span></div>
    <div class="sp-row"><span class="sp-label">Status</span><span class="signal-badge ${o.is_active ? 'good' : 'off'}">${o.is_active ? 'Ativa' : 'Inativa'}</span></div>
    ${o.last_poll_at ? `<div class="sp-row"><span class="sp-label">Último Poll</span><span class="sp-val">${new Date(o.last_poll_at).toLocaleString('pt-BR')}</span></div>` : ''}
  </div>`;

  // ONUs desta OLT
  html += `<div class="sp-section">
    <div class="sp-section-title"><i class="fas fa-wifi" style="color:#7c3aed"></i> ONUs (${onusThisOlt.length})</div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <span style="font-size:.78rem"><span style="color:#16a34a;font-weight:600">${online}</span> online</span>
      <span style="font-size:.78rem"><span style="color:#d97706;font-weight:600">${degraded}</span> degradado</span>
      <span style="font-size:.78rem"><span style="color:#dc2626;font-weight:600">${offline}</span> offline</span>
    </div>`;
  if (onusThisOlt.length) {
    html += onusThisOlt.slice(0, 10).map(([uid, u]) => {
      const badge = u.status === 'online' ? 'good' : u.status === 'degraded' ? 'warn' : 'bad';
      const rxBadge = u.rx_power != null ? (u.rx_power > -25 ? 'good' : u.rx_power > -28 ? 'warn' : 'bad') : 'off';
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:.78rem">
        <span class="signal-badge ${badge}" style="min-width:55px;text-align:center">${u.status || '?'}</span>
        <span style="font-family:monospace;flex:1">${u.serial_number || '-'}</span>
        ${u.rx_power != null ? `<span class="signal-badge ${rxBadge}">${u.rx_power} dBm</span>` : ''}
      </div>`;
    }).join('');
    if (onusThisOlt.length > 10) html += `<p style="font-size:.75rem;color:var(--muted);margin-top:4px">+${onusThisOlt.length - 10} mais...</p>`;
  } else {
    html += `<p style="color:var(--muted);font-size:.82rem">Nenhuma ONU vinculada</p>`;
  }
  html += `</div>`;

  html += `<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
    <button class="btn-map" onclick="sdrOltVisualModal('${id}')" style="flex:1;padding:8px;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border-color:#1e40af"><i class="fas fa-th"></i> Chassis Visual</button>
    <button class="btn-primary" onclick="sdrOltAddModal('${id}')" style="padding:8px 12px"><i class="fas fa-edit"></i></button>
    <button class="btn-danger" onclick="sdrOltDelete('${id}')" style="padding:8px 16px"><i class="fas fa-trash"></i></button>
  </div>`;

  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
};

// ============================================================
// OLT VISUAL — Chassis Gráfico · PON · DGO 144 fibras
// ============================================================

window.sdrOltVisualModal = function(oltId) {
  Promise.all([
    sdrRef('olt_connections/' + oltId).once('value'),
    sdrRef('olt_connections/' + oltId + '/pons').once('value'),
    sdrRef('infrastructure').once('value'),
    sdrRef('onus').once('value')
  ]).then(function(snaps) {
    var olt   = snaps[0].val() || {};
    var pons  = snaps[1].val() || {};
    var infra = snaps[2].val() || {};
    var onus  = snaps[3].val() || {};

    // Index DGOs
    var dgos = {};
    Object.entries(infra).forEach(function(e){ if (e[1] && e[1].type === 'dgo') dgos[e[0]] = e[1]; });

    // ONUs by pon key
    var onusByPon = {};
    Object.values(onus).forEach(function(u) {
      if (u && u.olt_id === oltId && u.slot != null && u.port != null) {
        var key = 's' + u.slot + '_p' + u.port;
        if (!onusByPon[key]) onusByPon[key] = [];
        onusByPon[key].push(u);
      }
    });

    var slotCount  = olt.slot_count  || 4;
    var ponPerSlot = olt.pon_per_slot || 8;

    // DGO summary panel
    var dgoHtml = Object.entries(dgos).map(function(e) {
      var did = e[0], d = e[1];
      var usedFibers = Object.values(d.fibers || {}).filter(function(f){ return f && f.status === 'used'; }).length;
      var total = (d.tube_count || 12) * (d.fiber_per_tube || 12);
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#fff;border-radius:6px;border:1px solid #e5e7eb;font-size:.75rem;cursor:pointer" onclick="sdrDgo144View(\'' + did + '\')">'
        + '<i class="fas fa-network-wired" style="color:#3b82f6"></i>'
        + '<span style="font-weight:600;flex:1">' + (d.nome || did) + '</span>'
        + '<span style="color:#64748b">' + usedFibers + '/' + total + ' fibras</span>'
        + '<i class="fas fa-eye" style="color:#94a3b8;font-size:.7rem"></i>'
        + '</div>';
    }).join('') || '<div style="font-size:.75rem;color:#94a3b8;font-style:italic">Nenhum DGO cadastrado</div>';

    // Build chassis grid
    var chassisHtml = '';
    for (var sl = 1; sl <= slotCount; sl++) {
      var slotCfg  = ((olt.slots || {})[sl]) || {};
      var portCount = slotCfg.pon_count || ponPerSlot;
      chassisHtml += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">'
        + '<div style="width:58px;font-size:.65rem;font-weight:700;color:#94a3b8;text-align:right;flex-shrink:0">Slot ' + sl + '</div>'
        + '<div style="background:#0f172a;border:1px solid #334155;border-radius:4px;padding:4px 6px;display:flex;gap:3px;flex:1">';
      for (var po = 1; po <= portCount; po++) {
        var key = 's' + sl + '_p' + po;
        var cfg = pons[key] || {};
        var portOnus = onusByPon[key] || [];
        var hasAlarm = portOnus.some(function(u){ return u.status === 'offline'; });
        var bg, title, lbl;
        if (!cfg.active) {
          bg = '#334155'; title = 'PON ' + po + ' — Inativa (clique para configurar)';
        } else if (cfg.dgo_id) {
          var dgoName = (dgos[cfg.dgo_id] || {}).nome || 'DGO';
          bg = hasAlarm ? '#dc2626' : '#16a34a';
          title = 'PON ' + po + ' — ' + dgoName + ' · ' + (cfg.dgo_fiber_key || '—') + ' · ' + portOnus.length + ' ONUs';
        } else {
          bg = '#2563eb'; title = 'PON ' + po + ' — Ativa (sem DGO)';
        }
        chassisHtml += '<div onclick="sdrPonConfig(\'' + oltId + '\',' + sl + ',' + po + ')" title="' + title + '" '
          + 'style="width:26px;height:26px;border-radius:3px;background:' + bg + ';cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.58rem;color:#fff;font-weight:700;border:1px solid rgba(255,255,255,.12);transition:transform .12s" '
          + 'onmouseover="this.style.transform=\'scale(1.18)\';this.style.zIndex=10" onmouseout="this.style.transform=\'\';this.style.zIndex=\'\'">' + po + '</div>';
      }
      chassisHtml += '</div></div>';
    }

    var legend = '<div style="display:flex;gap:14px;font-size:.7rem;color:#64748b;margin-bottom:10px;flex-wrap:wrap">'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#334155;border-radius:2px;margin-right:3px"></span>Inativa</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#2563eb;border-radius:2px;margin-right:3px"></span>Ativa · Sem DGO</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#16a34a;border-radius:2px;margin-right:3px"></span>Ativa · Conectada</span>'
      + '<span><span style="display:inline-block;width:9px;height:9px;background:#dc2626;border-radius:2px;margin-right:3px"></span>Alarme</span>'
      + '</div>';

    var html = '<div class="modal-overlay open" id="sdr-modal-olt-visual" onclick="if(event.target===this)this.remove()">'
      + '<div class="modal-box" style="max-width:740px;width:96vw">'
      + '<div class="modal-header">'
      + '<h3><i class="fas fa-server" style="color:#dc2626;margin-right:8px"></i>Chassis — ' + (olt.name || oltId) + '</h3>'
      + '<button onclick="document.getElementById(\'sdr-modal-olt-visual\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<div style="display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap;font-size:.8rem;align-items:center">'
      + '<span><i class="fas fa-microchip" style="color:#64748b"></i> ' + (olt.model || '—') + '</span>'
      + '<span style="font-family:monospace">' + (olt.ip_address || '—') + '</span>'
      + '<span><i class="fas fa-circle" style="color:' + (olt.is_active ? '#16a34a' : '#94a3b8') + ';font-size:.55rem;vertical-align:middle"></i> ' + (olt.is_active ? 'Ativa' : 'Inativa') + '</span>'
      + '<div style="margin-left:auto;display:flex;gap:6px">'
      + '<button class="btn-map" onclick="sdrDgoCriarModal(\'' + oltId + '\')" style="padding:4px 10px;font-size:.74rem"><i class="fas fa-plus"></i> Novo DGO</button>'
      + '<button class="btn-map" onclick="sdrOltSlotAdd(\'' + oltId + '\')" style="padding:4px 10px;font-size:.74rem"><i class="fas fa-plus-square"></i> Slot</button>'
      + '</div></div>'
      + legend
      + '<div style="background:#1e293b;border-radius:10px;padding:14px 10px;margin-bottom:16px">' + chassisHtml + '</div>'
      + '<div style="font-weight:600;color:#1e293b;font-size:.8rem;margin-bottom:8px"><i class="fas fa-network-wired" style="color:#3b82f6"></i> DGOs conectados</div>'
      + '<div style="display:flex;flex-direction:column;gap:6px">' + dgoHtml + '</div>'
      + '<p style="font-size:.7rem;color:#94a3b8;margin-top:10px;text-align:center">Clique em uma porta PON para configurar / ativar / conectar ao DGO</p>'
      + '</div></div></div>';

    var prev = document.getElementById('sdr-modal-olt-visual');
    if (prev) prev.remove();
    document.body.insertAdjacentHTML('beforeend', html);
  });
};

// ── Configuração individual de PON ──────────────────────────────────
window.sdrPonConfig = function(oltId, slot, port) {
  sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port).once('value').then(function(ponSnap) {
    var cfg = ponSnap.val() || {};
    sdrRef('infrastructure').once('value').then(function(infraSnap) {
      var infra = infraSnap.val() || {};
      var dgoOpts = '<option value="">— Sem DGO —</option>'
        + Object.entries(infra).filter(function(e){ return e[1] && e[1].type === 'dgo'; }).map(function(e) {
          return '<option value="' + e[0] + '"' + (cfg.dgo_id === e[0] ? ' selected' : '') + '>' + (e[1].nome || e[0]) + ' (' + ((e[1].tube_count||12)*(e[1].fiber_per_tube||12)) + ' fibras)</option>';
        }).join('');

      var fiberInfo = cfg.dgo_fiber_key
        ? '<div id="pon-fiber-info" style="margin-top:8px;font-size:.8rem;color:#065f46;padding:8px 12px;background:#d1fae5;border-radius:6px;display:flex;align-items:center;gap:8px">'
          + '<i class="fas fa-link"></i> Fibra conectada: <b>' + cfg.dgo_fiber_key + '</b>'
          + '<button onclick="sdrPonSelectFiber(\'' + oltId + '\',' + slot + ',' + port + ')" style="margin-left:auto;padding:2px 8px;font-size:.72rem;border:1px solid #059669;border-radius:4px;background:#fff;color:#059669;cursor:pointer"><i class="fas fa-exchange-alt"></i> Trocar</button>'
          + '</div>'
        : '<div id="pon-fiber-info" style="margin-top:8px;display:' + (cfg.dgo_id ? 'block' : 'none') + '">'
          + '<button onclick="sdrPonSelectFiber(\'' + oltId + '\',' + slot + ',' + port + ')" style="width:100%;padding:7px;font-size:.8rem;border:1px solid #d97706;border-radius:6px;background:#fef3c7;color:#92400e;cursor:pointer"><i class="fas fa-link"></i> Selecionar fibra no DGO</button>'
          + '</div>';

      var html = '<div class="modal-overlay open" id="sdr-pon-modal" onclick="if(event.target===this)this.remove()">'
        + '<div class="modal-box" style="max-width:460px">'
        + '<div class="modal-header">'
        + '<h3><i class="fas fa-plug" style="color:#7c3aed;margin-right:8px"></i>Slot ' + slot + ' — PON ' + port + '</h3>'
        + '<button onclick="document.getElementById(\'sdr-pon-modal\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer">&times;</button>'
        + '</div>'
        + '<div class="modal-body">'
        + '<div style="padding:10px 14px;background:#f8fafc;border-radius:8px;margin-bottom:14px;display:flex;align-items:center;gap:10px">'
        + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;font-size:.9rem">'
        + '<input type="checkbox" id="pon-active" ' + (cfg.active ? 'checked' : '') + ' style="width:18px;height:18px"> Porta PON Ativa</label>'
        + '</div>'
        + '<div class="form-group"><label>Label / Descrição</label><input id="pon-label" value="' + (cfg.label || 'PON ' + port) + '" placeholder="Ex: PON 1 — Bairro Sul"></div>'
        + '<div style="display:flex;gap:10px">'
        + '<div class="form-group" style="flex:1"><label>Velocidade</label><select id="pon-speed"><option value="1G" ' + (cfg.speed !== '2.5G' ? 'selected' : '') + '>1G GPON</option><option value="2.5G" ' + (cfg.speed === '2.5G' ? 'selected' : '') + '>2.5G XGS-PON</option></select></div>'
        + '<div class="form-group" style="flex:1"><label>VLAN</label><input id="pon-vlan" type="number" value="' + (cfg.vlan || '') + '" placeholder="Ex: 100"></div>'
        + '</div>'
        + '<div class="form-group"><label>DGO de Saída (cordão)</label><select id="pon-dgo" onchange="sdrPonDgoChange()">' + dgoOpts + '</select></div>'
        + fiberInfo
        + '</div>'
        + '<div class="modal-footer">'
        + '<button class="btn-secondary" onclick="document.getElementById(\'sdr-pon-modal\').remove()">Cancelar</button>'
        + '<button class="btn-primary" onclick="sdrPonSave(\'' + oltId + '\',' + slot + ',' + port + ')"><i class="fas fa-save"></i> Salvar PON</button>'
        + '</div></div></div>';

      var prev = document.getElementById('sdr-pon-modal');
      if (prev) prev.remove();
      document.body.insertAdjacentHTML('beforeend', html);
    });
  });
};

window.sdrPonDgoChange = function() {
  var el = document.getElementById('pon-dgo');
  var info = document.getElementById('pon-fiber-info');
  if (info && el) info.style.display = el.value ? 'block' : 'none';
};

window.sdrPonSave = function(oltId, slot, port) {
  var active = document.getElementById('pon-active').checked;
  var label  = document.getElementById('pon-label').value.trim();
  var speed  = document.getElementById('pon-speed').value;
  var vlan   = document.getElementById('pon-vlan').value;
  var dgoId  = document.getElementById('pon-dgo').value;

  sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port).once('value').then(function(snap) {
    var existing = snap.val() || {};
    var data = {active: active, label: label, speed: speed, updated_at: new Date().toISOString()};
    if (vlan) data.vlan = parseInt(vlan);
    if (dgoId) data.dgo_id = dgoId;
    // Preserve fiber link if same DGO
    if (existing.dgo_fiber_key && existing.dgo_id === dgoId) data.dgo_fiber_key = existing.dgo_fiber_key;

    sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port).set(data).then(function() {
      if (typeof toast === 'function') toast('PON ' + port + ' salva!', 'success');
      document.getElementById('sdr-pon-modal').remove();
      if (document.getElementById('olt-panel-content') && _sdrActiveOltTab === oltId) {
        sdrOltInlineRender(oltId);
      } else {
        sdrOltVisualModal(oltId);
      }
    });
  });
};

// ── Seleção de fibra no DGO (144 fibras — grade visual) ────────────
window.sdrPonSelectFiber = function(oltId, slot, port) {
  var dgoId = (document.getElementById('pon-dgo') || {}).value;
  if (!dgoId) { if (typeof toast === 'function') toast('Selecione um DGO primeiro', 'error'); return; }
  sdrDgo144Modal(dgoId, oltId, slot, port);
};

window.sdrDgo144Modal = function(dgoId, oltId, slot, port) {
  sdrRef('infrastructure/' + dgoId).once('value').then(function(snap) {
    var dgo    = snap.val() || {};
    var fibers = dgo.fibers || {};
    var tCount = dgo.tube_count     || 12;
    var fpt    = dgo.fiber_per_tube || 12;

    // ABNT tube colors
    var TC = ['#64748b','#fb923c','#84cc16','#38bdf8','#facc15','#c084fc','#f87171','#4ade80','#a16207','#2dd4bf','#818cf8','#fb7185'];
    var TN = ['Cinza','Laranja','Verde','Azul','Amarelo','Violeta','Vermelho','Verde Claro','Marrom','Teal','Índigo','Rosa'];

    var gridHtml = '';
    var freeCount = 0, usedCount = 0;
    for (var t = 1; t <= tCount; t++) {
      gridHtml += '<div style="margin-bottom:10px">'
        + '<div style="font-size:.68rem;font-weight:700;color:#374151;margin-bottom:4px;display:flex;align-items:center;gap:5px">'
        + '<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:' + TC[t-1] + '"></span>'
        + 'Tubo ' + t + ' — ' + TN[t-1] + '</div>'
        + '<div style="display:flex;gap:3px;flex-wrap:wrap">';
      for (var f = 1; f <= fpt; f++) {
        var key = 't' + t + 'f' + f;
        var fib = fibers[key] || {};
        var isSelf = fib.olt_id === oltId && fib.slot == slot && fib.port == port;
        var used   = fib.status === 'used' && !isSelf;
        var bg     = isSelf ? '#7c3aed' : used ? '#94a3b8' : '#d1fae5';
        var bdr    = isSelf ? '#6d28d9' : used ? '#94a3b8' : '#16a34a';
        var cur    = used ? 'not-allowed' : 'pointer';
        var tip    = isSelf ? 'Esta PON' : (used ? ('Usada: ' + (fib.label || '')) : ('T' + t + 'F' + f + ' — Livre'));
        var clk    = used ? '' : ('onclick="sdrFiberSelect(\'' + oltId + '\',' + slot + ',' + port + ',\'' + dgoId + '\',\'' + key + '\')"');
        if (!used && !isSelf) freeCount++;
        if (used) usedCount++;
        gridHtml += '<div ' + clk + ' title="' + tip + '" style="width:26px;height:26px;border-radius:3px;background:' + bg + ';border:2px solid ' + bdr + ';cursor:' + cur + ';display:flex;align-items:center;justify-content:center;font-size:.58rem;color:#374151;font-weight:700">' + f + '</div>';
      }
      gridHtml += '</div></div>';
    }

    var selMode = oltId != null; // true=selection mode, false=view only
    var html = '<div class="modal-overlay open" id="sdr-dgo-fiber-modal" onclick="if(event.target===this)this.remove()">'
      + '<div class="modal-box" style="max-width:660px;width:96vw">'
      + '<div class="modal-header">'
      + '<h3><i class="fas fa-project-diagram" style="color:#16a34a;margin-right:8px"></i>' + (dgo.nome || dgoId) + ' — ' + (tCount * fpt) + ' fibras</h3>'
      + '<button onclick="document.getElementById(\'sdr-dgo-fiber-modal\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer">&times;</button>'
      + '</div>'
      + '<div class="modal-body">'
      + '<div style="display:flex;gap:12px;font-size:.72rem;margin-bottom:12px;flex-wrap:wrap">'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#d1fae5;border:2px solid #16a34a;border-radius:2px;margin-right:3px"></span>Livre (' + freeCount + ')</span>'
      + '<span><span style="display:inline-block;width:10px;height:10px;background:#94a3b8;border:2px solid #94a3b8;border-radius:2px;margin-right:3px"></span>Usada (' + usedCount + ')</span>'
      + (selMode ? '<span><span style="display:inline-block;width:10px;height:10px;background:#7c3aed;border:2px solid #6d28d9;border-radius:2px;margin-right:3px"></span>Esta PON</span>' : '')
      + '</div>'
      + '<div style="max-height:400px;overflow-y:auto;padding-right:4px">' + gridHtml + '</div>'
      + (selMode ? '<p style="font-size:.72rem;color:#94a3b8;margin-top:10px">Clique em uma fibra <b style="color:#16a34a">LIVRE</b> (verde) para conectar Slot ' + slot + ' PON ' + port + '</p>' : '')
      + '</div></div></div>';

    var prev = document.getElementById('sdr-dgo-fiber-modal');
    if (prev) prev.remove();
    document.body.insertAdjacentHTML('beforeend', html);
  });
};

// View-only (sem seleção)
window.sdrDgo144View = function(dgoId) { sdrDgo144Modal(dgoId, null, null, null); };

window.sdrFiberSelect = function(oltId, slot, port, dgoId, fiberKey) {
  var ponRef   = sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port);
  var fiberRef = sdrRef('infrastructure/' + dgoId + '/fibers/' + fiberKey);

  // Liberar fibra anterior se houver
  ponRef.once('value').then(function(snap) {
    var prev = snap.val() || {};
    var chain = Promise.resolve();
    if (prev.dgo_id && prev.dgo_fiber_key) {
      chain = sdrRef('infrastructure/' + prev.dgo_id + '/fibers/' + prev.dgo_fiber_key)
        .update({status:'free', olt_id:null, slot:null, port:null, label:null});
    }
    return chain;
  }).then(function() {
    var label = 'OLT Slot' + slot + '/PON' + port;
    return fiberRef.set({status:'used', olt_id:oltId, slot:slot, port:port, label:label, connected_at:new Date().toISOString()});
  }).then(function() {
    return ponRef.update({dgo_id:dgoId, dgo_fiber_key:fiberKey, active:true, updated_at:new Date().toISOString()});
  }).then(function() {
    if (typeof toast === 'function') toast('Fibra ' + fiberKey + ' conectada — Slot ' + slot + ' PON ' + port + '!', 'success');
    document.getElementById('sdr-dgo-fiber-modal') && document.getElementById('sdr-dgo-fiber-modal').remove();
    document.getElementById('sdr-pon-modal')        && document.getElementById('sdr-pon-modal').remove();
    sdrOltVisualModal(oltId);
  });
};

// ── Criar novo DGO ─────────────────────────────────────────────────
window.sdrDgoCriarModal = function(oltId) {
  var html = '<div class="modal-overlay open" id="sdr-dgo-criar-modal" onclick="if(event.target===this)this.remove()">'
    + '<div class="modal-box" style="max-width:460px">'
    + '<div class="modal-header">'
    + '<h3><i class="fas fa-network-wired" style="color:#3b82f6;margin-right:8px"></i>Novo DGO</h3>'
    + '<button onclick="document.getElementById(\'sdr-dgo-criar-modal\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer">&times;</button>'
    + '</div>'
    + '<div class="modal-body">'
    + '<div class="form-group"><label>Nome</label><input id="dgo-nome" placeholder="Ex: DGO-CENTRAL-01"></div>'
    + '<div class="form-group"><label>Endereço / Localização</label><input id="dgo-endereco" placeholder="Ex: Rua das Flores, 100 — Sala Técnica"></div>'
    + '<div style="display:flex;gap:10px">'
    + '<div class="form-group" style="flex:1"><label>Tubos</label><select id="dgo-tubos" onchange="sdrDgoCalc()"><option value="6">6 tubos</option><option value="12" selected>12 tubos</option></select></div>'
    + '<div class="form-group" style="flex:1"><label>Fibras/Tubo</label><select id="dgo-fpt" onchange="sdrDgoCalc()"><option value="6">6 fibras</option><option value="12" selected>12 fibras</option><option value="24">24 fibras</option></select></div>'
    + '</div>'
    + '<div style="background:#f0f9ff;border-radius:8px;padding:10px;font-size:.82rem;color:#0284c7;text-align:center">'
    + '<i class="fas fa-info-circle"></i> Total: <b id="dgo-total-calc">144 fibras</b>'
    + '</div>'
    + '</div>'
    + '<div class="modal-footer">'
    + '<button class="btn-secondary" onclick="document.getElementById(\'sdr-dgo-criar-modal\').remove()">Cancelar</button>'
    + '<button class="btn-primary" onclick="sdrDgoSalvar(\'' + (oltId || '') + '\')"><i class="fas fa-save"></i> Criar DGO</button>'
    + '</div></div></div>';
  var prev = document.getElementById('sdr-dgo-criar-modal');
  if (prev) prev.remove();
  document.body.insertAdjacentHTML('beforeend', html);
};

window.sdrDgoCalc = function() {
  var t = parseInt((document.getElementById('dgo-tubos') || {}).value || 12);
  var f = parseInt((document.getElementById('dgo-fpt')   || {}).value || 12);
  var el = document.getElementById('dgo-total-calc');
  if (el) el.textContent = (t * f) + ' fibras (' + t + ' × ' + f + ')';
};

window.sdrDgoSalvar = function(oltId) {
  var nome  = ((document.getElementById('dgo-nome')     || {}).value || '').trim();
  var end   = ((document.getElementById('dgo-endereco') || {}).value || '').trim();
  var tubos = parseInt((document.getElementById('dgo-tubos') || {}).value) || 12;
  var fpt   = parseInt((document.getElementById('dgo-fpt')   || {}).value) || 12;
  if (!nome) { if (typeof toast === 'function') toast('Nome é obrigatório', 'error'); return; }

  var data = {type:'dgo', nome:nome, endereco:end, tube_count:tubos, fiber_per_tube:fpt,
    total_fibers:tubos * fpt, olt_id:oltId || null, created_at:new Date().toISOString()};

  sdrRef('infrastructure').push(data).then(function() {
    if (typeof toast === 'function') toast('DGO criado com ' + (tubos * fpt) + ' fibras!', 'success');
    document.getElementById('sdr-dgo-criar-modal') && document.getElementById('sdr-dgo-criar-modal').remove();
    if (oltId) {
      if (document.getElementById('olt-panel-content') && _sdrActiveOltTab === oltId) {
        sdrOltInlineRender(oltId);
      } else {
        sdrOltVisualModal(oltId);
      }
    }
  });
};

// ── Adicionar slot ao chassis ───────────────────────────────────────
window.sdrOltSlotAdd = function(oltId) {
  sdrRef('olt_connections/' + oltId + '/slot_count').once('value').then(function(s) {
    var next = (s.val() || 4) + 1;
    sdrRef('olt_connections/' + oltId + '/slot_count').set(next).then(function() {
      if (typeof toast === 'function') toast('Slot ' + next + ' adicionado!', 'success');
      if (document.getElementById('olt-panel-content') && _sdrActiveOltTab === oltId) {
        sdrOltInlineRender(oltId);
      } else {
        sdrOltVisualModal(oltId);
      }
    });
  });
};

// ════════════════════════════════════════════════════
// SPRINT 3 — PÁGINA ONUs
// ════════════════════════════════════════════════════

window.sdrOnusRender = function() {
  Promise.all([
    sdrRef('onus').once('value'),
    sdrRef('clients').once('value'),
    sdrRef('olt_connections').once('value')
  ]).then(([onuSnap, clientSnap, oltSnap]) => {
    sdrOnusCache = onuSnap.val() || {};
    sdrClientesCache = clientSnap.val() || {};
    sdrOltsCache = oltSnap.val() || {};
    _renderOnusLista();
  });
};
// Filtro sem rebuscar Firebase
window.sdrOnusFilter = function() { _renderOnusLista(); };

function _renderOnusLista() {
  const filterStatus = document.getElementById('onus-filter-status')?.value || '';
  const filterOlt = document.getElementById('onus-filter-olt')?.value || '';
  const search = (document.getElementById('onus-search')?.value || '').toLowerCase();

  // Build client lookup by onu serial
  const clientBySerial = {};
  Object.entries(sdrClientesCache).forEach(([cid, c]) => {
    if (c.onu_serial) clientBySerial[c.onu_serial.toLowerCase()] = { id: cid, ...c };
  });

  const items = Object.entries(sdrOnusCache).filter(([id, u]) => {
    if (!u) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (filterOlt && u.olt_id !== filterOlt) return false;
    if (search) {
      const client = u.serial_number ? clientBySerial[u.serial_number.toLowerCase()] : null;
      const s = `${u.serial_number || ''} ${u.model || ''} ${u.ip_address || ''} ${client ? client.name : ''}`.toLowerCase();
      if (!s.includes(search)) return false;
    }
    return true;
  });

  // Stats
  const all = Object.values(sdrOnusCache);
  const statsEl = document.getElementById('onus-stats');
  if (statsEl) {
    const total = all.length;
    const online = all.filter(u => u.status === 'online').length;
    const degraded = all.filter(u => u.status === 'degraded').length;
    const offline = all.filter(u => u.status === 'offline').length;
    statsEl.innerHTML = `
      <div class="infra-stat"><div class="is-num">${total}</div><div class="is-label">Total</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#16a34a">${online}</div><div class="is-label">Online</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#d97706">${degraded}</div><div class="is-label">Degradado</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#dc2626">${offline}</div><div class="is-label">Offline</div></div>`;
  }

  // Update OLT filter options
  const oltFilter = document.getElementById('onus-filter-olt');
  if (oltFilter && oltFilter.options.length <= 1) {
    Object.entries(sdrOltsCache).forEach(([oid, o]) => {
      const opt = document.createElement('option');
      opt.value = oid;
      opt.textContent = o.name || oid;
      oltFilter.appendChild(opt);
    });
  }

  const el = document.getElementById('onus-lista');
  if (!el) return;

  if (items.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      <i class="fas fa-wifi" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:.4"></i>
      <p>Nenhuma ONU cadastrada</p>
      <button class="btn-primary" onclick="sdrOnuAdd()" style="margin-top:8px"><i class="fas fa-plus"></i> Cadastrar</button>
    </div>`;
    return;
  }

  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.83rem">
    <thead><tr style="background:#f8fafc;text-align:left">
      <th style="padding:8px 10px">Serial</th>
      <th style="padding:8px 10px">Status</th>
      <th style="padding:8px 10px">Sinal Rx</th>
      <th style="padding:8px 10px">Cliente</th>
      <th style="padding:8px 10px">OLT</th>
      <th style="padding:8px 10px">PON</th>
      <th style="padding:8px 10px"></th>
    </tr></thead>
    <tbody>${items.map(([id, u]) => {
      const statusBadge = u.status === 'online' ? 'good' : u.status === 'degraded' ? 'warn' : u.status === 'offline' ? 'bad' : 'off';
      const rxBadge = u.rx_power != null ? (u.rx_power > -25 ? 'good' : u.rx_power > -28 ? 'warn' : 'bad') : '';
      const client = u.serial_number ? clientBySerial[u.serial_number.toLowerCase()] : null;
      const olt = u.olt_id ? sdrOltsCache[u.olt_id] : null;
      return `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="sdrOpenOnuPanel('${id}')" oncontextmenu="sdrCtxMenu(event,_sdrCtxOnu('${id}'))">
        <td style="padding:8px 10px;font-family:monospace;font-weight:600">${u.serial_number || '-'}</td>
        <td style="padding:8px 10px"><span class="signal-badge ${statusBadge}">${u.status || '?'}</span></td>
        <td style="padding:8px 10px">${u.rx_power != null ? `<span class="signal-badge ${rxBadge}">${u.rx_power} dBm</span>` : '-'}</td>
        <td style="padding:8px 10px">${client ? client.name : '<span style="color:var(--muted)">—</span>'}</td>
        <td style="padding:8px 10px">${olt ? olt.name : '-'}</td>
        <td style="padding:8px 10px">${u.pon_port || '-'}</td>
        <td style="padding:8px 10px;text-align:right">
          <button class="btn-map" onclick="event.stopPropagation();sdrOnuEdit('${id}')" style="padding:4px 8px;font-size:.75rem" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="sdr-row-menu" onclick="event.stopPropagation();sdrCtxMenu(event,_sdrCtxOnu('${id}'))" title="Mais ações"><i class="fas fa-ellipsis-v"></i></button>
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

// Modal para ONU
window.sdrOnuAdd = function() { _sdrShowOnuModal(null, {}); };
window.sdrOnuEdit = function(id) { _sdrShowOnuModal(id, sdrOnusCache[id] || {}); };

function _sdrShowOnuModal(editId, d) {
  const isEdit = !!editId;
  const oltOpts = Object.entries(sdrOltsCache).map(([k, o]) =>
    `<option value="${k}" ${d.olt_id === k ? 'selected' : ''}>${o.name || k}</option>`).join('');
  const clientOpts = Object.entries(sdrClientesCache).map(([k, c]) =>
    `<option value="${k}" ${d.client_id === k ? 'selected' : ''}>${c.name || k}</option>`).join('');

  let html = `<div class="modal-overlay" id="sdr-modal" onclick="if(event.target===this)this.remove()">
    <div class="modal-box">
      <div class="modal-header">
        <h3><i class="fas fa-wifi" style="color:#7c3aed;margin-right:8px"></i>${isEdit ? 'Editar' : 'Nova'} ONU</h3>
        <button onclick="document.getElementById('sdr-modal').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Serial Number</label><input id="sdr-onu-serial" value="${d.serial_number || ''}" placeholder="FHTT12345678"></div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>Modelo</label><input id="sdr-onu-model" value="${d.model || ''}" placeholder="Ex: HG6145F"></div>
          <div class="form-group" style="flex:1"><label>Status</label>
            <select id="sdr-onu-status">
              <option value="online" ${d.status === 'online' ? 'selected' : ''}>Online</option>
              <option value="degraded" ${d.status === 'degraded' ? 'selected' : ''}>Degradado</option>
              <option value="offline" ${d.status === 'offline' || !d.status ? 'selected' : ''}>Offline</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>OLT</label>
            <select id="sdr-onu-olt"><option value="">Selecione</option>${oltOpts}</select>
          </div>
          <div class="form-group" style="flex:1"><label>Porta PON</label><input id="sdr-onu-pon" value="${d.pon_port || ''}" placeholder="1/1/1"></div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>Sinal Rx (dBm)</label><input id="sdr-onu-rx" type="number" step="0.01" value="${d.rx_power != null ? d.rx_power : ''}"></div>
          <div class="form-group" style="flex:1"><label>Sinal Tx (dBm)</label><input id="sdr-onu-tx" type="number" step="0.01" value="${d.tx_power != null ? d.tx_power : ''}"></div>
        </div>
        <div class="form-group"><label>IP Address</label><input id="sdr-onu-ip" value="${d.ip_address || ''}" placeholder="Ex: 10.0.0.100"></div>
        <div class="form-group"><label>Cliente vinculado</label>
          <select id="sdr-onu-client"><option value="">Nenhum (vincular depois)</option>${clientOpts}</select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="document.getElementById('sdr-modal').remove()">Cancelar</button>
        <button class="btn-primary" onclick="sdrOnuSave('${editId || ''}')">${isEdit ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('sdr-modal').classList.add('open');
}

window.sdrOnuSave = async function(editId) {
  const serial = document.getElementById('sdr-onu-serial').value.trim();
  if (!serial) { toast('Serial é obrigatório', 'error'); return; }

  const data = {
    serial_number: serial,
    model: document.getElementById('sdr-onu-model').value.trim(),
    status: document.getElementById('sdr-onu-status').value,
    olt_id: document.getElementById('sdr-onu-olt').value || null,
    pon_port: document.getElementById('sdr-onu-pon').value.trim(),
    ip_address: document.getElementById('sdr-onu-ip').value.trim(),
    client_id: document.getElementById('sdr-onu-client').value || null,
    updated_at: new Date().toISOString()
  };
  const rx = parseFloat(document.getElementById('sdr-onu-rx').value);
  const tx = parseFloat(document.getElementById('sdr-onu-tx').value);
  if (!isNaN(rx)) data.rx_power = rx;
  if (!isNaN(tx)) data.tx_power = tx;

  if (!editId) {
    data.created_at = new Date().toISOString();
    data.last_online_at = data.status === 'online' ? data.created_at : null;
  }

  // Se vinculou cliente, atualizar o onu_serial do cliente também
  const clientId = data.client_id;

  try {
    let onuId = editId;
    if (editId) {
      await sdrRef(`onus/${editId}`).update(data);
      toast('ONU atualizada!', 'success');
    } else {
      const ref = await sdrRef('onus').push(data);
      onuId = ref.key;
      toast('ONU cadastrada!', 'success');
    }

    // Sync: atualizar cliente com dados da ONU
    if (clientId) {
      await sdrRef(`clients/${clientId}`).update({
        onu_serial: serial,
        onu_id: onuId,
        onu_status: data.status,
        rx_power: data.rx_power || null,
        tx_power: data.tx_power || null,
        updated_at: new Date().toISOString()
      });
    }

    document.getElementById('sdr-modal').remove();
    sdrOnusRender();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  }
};

window.sdrOnuDelete = async function(id) {
  if (!confirm('Excluir esta ONU?')) return;
  try {
    await sdrRef(`onus/${id}`).remove();
    toast('ONU excluída', 'success');
    sdrCloseSidePanel();
    sdrOnusRender();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// Painel lateral ONU
window.sdrOpenOnuPanel = function(id) {
  const u = sdrOnusCache[id];
  if (!u) return;
  document.getElementById('sp-title').textContent = u.serial_number || 'ONU';

  const olt = u.olt_id ? sdrOltsCache[u.olt_id] : null;
  const client = u.client_id ? sdrClientesCache[u.client_id] : null;
  // Também tentar achar por serial
  let linkedClient = client;
  if (!linkedClient && u.serial_number) {
    const entry = Object.entries(sdrClientesCache).find(([, c]) => c.onu_serial && c.onu_serial.toLowerCase() === u.serial_number.toLowerCase());
    if (entry) linkedClient = { id: entry[0], ...entry[1] };
  }

  const statusBadge = u.status === 'online' ? 'good' : u.status === 'degraded' ? 'warn' : 'bad';

  let html = `<div class="sp-section">
    <div class="sp-section-title"><i class="fas fa-wifi" style="color:#7c3aed"></i> Dados da ONU</div>
    <div class="sp-row"><span class="sp-label">Serial</span><span class="sp-val" style="font-family:monospace">${u.serial_number || '-'}</span></div>
    <div class="sp-row"><span class="sp-label">Modelo</span><span class="sp-val">${u.model || '-'}</span></div>
    <div class="sp-row"><span class="sp-label">Status</span><span class="signal-badge ${statusBadge}">${(u.status || 'offline').toUpperCase()}</span></div>`;
  if (u.rx_power != null) {
    const rxB = u.rx_power > -25 ? 'good' : u.rx_power > -28 ? 'warn' : 'bad';
    html += `<div class="sp-row"><span class="sp-label">Sinal Rx</span><span class="signal-badge ${rxB}">${u.rx_power} dBm</span></div>`;
  }
  if (u.tx_power != null) html += `<div class="sp-row"><span class="sp-label">Sinal Tx</span><span class="sp-val">${u.tx_power} dBm</span></div>`;
  if (u.ip_address) html += `<div class="sp-row"><span class="sp-label">IP</span><span class="sp-val" style="font-family:monospace">${u.ip_address}</span></div>`;
  if (u.pon_port) html += `<div class="sp-row"><span class="sp-label">PON Port</span><span class="sp-val">${u.pon_port}</span></div>`;
  if (olt) html += `<div class="sp-row"><span class="sp-label">OLT</span><span class="sp-val">${olt.name || olt.ip_address}</span></div>`;
  if (u.last_online_at) html += `<div class="sp-row"><span class="sp-label">Último online</span><span class="sp-val">${new Date(u.last_online_at).toLocaleString('pt-BR')}</span></div>`;
  html += `</div>`;

  // Cliente vinculado
  html += `<div class="sp-section">
    <div class="sp-section-title"><i class="fas fa-user" style="color:#2563eb"></i> Cliente</div>`;
  if (linkedClient) {
    html += `<div class="sp-row"><span class="sp-label">Nome</span><span class="sp-val" style="font-weight:600">${linkedClient.name}</span></div>`;
    if (linkedClient.plan_name) html += `<div class="sp-row"><span class="sp-label">Plano</span><span class="sp-val">${linkedClient.plan_name}</span></div>`;
    const fColor = linkedClient.financial_status === 'inadimplente' ? '#dc2626' : '#16a34a';
    html += `<div class="sp-row"><span class="sp-label">Financeiro</span><span class="sp-val" style="color:${fColor};font-weight:600">${(linkedClient.financial_status || 'adimplente').toUpperCase()}</span></div>`;
  } else {
    html += `<p style="color:var(--muted);font-size:.82rem;text-align:center;padding:8px">Nenhum cliente vinculado</p>`;
  }
  html += `</div>`;

  html += `<div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn-primary" onclick="sdrOnuEdit('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    <button class="btn-danger" onclick="sdrOnuDelete('${id}')" style="padding:8px 16px"><i class="fas fa-trash"></i></button>
  </div>`;

  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
};

// ════════════════════════════════════════════════════
// SPRINT 3 — ALERTAS MELHORADOS (auto-geração)
// ════════════════════════════════════════════════════

// Gerar alertas baseado em status de ONUs
window.sdrCheckAlerts = async function() {
  const [onuSnap, alertSnap] = await Promise.all([
    sdrRef('onus').once('value'),
    sdrRef('alerts').once('value')
  ]);
  const onus = onuSnap.val() || {};
  const existingAlerts = alertSnap.val() || {};

  // Alertas ativos por onu_id
  const activeAlertsByOnu = {};
  Object.entries(existingAlerts).forEach(([aid, a]) => {
    if (a.is_active && a.onu_id) activeAlertsByOnu[a.onu_id] = aid;
  });

  const now = new Date().toISOString();
  const updates = {};
  let created = 0;

  Object.entries(onus).forEach(([onuId, u]) => {
    // Alerta: ONU offline
    if (u.status === 'offline' && !activeAlertsByOnu[onuId]) {
      const alertKey = sdrRef('alerts').push().key;
      updates[`alerts/${alertKey}`] = {
        onu_id: onuId,
        client_id: u.client_id || null,
        severity: 'critical',
        title: `ONU Offline: ${u.serial_number || onuId}`,
        message: `ONU ${u.serial_number || ''} está offline${u.ip_address ? ' (IP: ' + u.ip_address + ')' : ''}`,
        is_active: true,
        created_at: now
      };
      created++;
    }

    // Alerta: sinal degradado
    if (u.rx_power != null && u.rx_power < -28 && u.status !== 'offline') {
      const existingDegAlert = Object.entries(existingAlerts).find(([, a]) =>
        a.is_active && a.onu_id === onuId && a.title && a.title.includes('Sinal'));
      if (!existingDegAlert) {
        const alertKey = sdrRef('alerts').push().key;
        updates[`alerts/${alertKey}`] = {
          onu_id: onuId,
          client_id: u.client_id || null,
          severity: 'warning',
          title: `Sinal Baixo: ${u.serial_number || onuId}`,
          message: `Sinal Rx: ${u.rx_power} dBm (abaixo de -28 dBm)`,
          is_active: true,
          created_at: now
        };
        created++;
      }
    }
  });

  if (Object.keys(updates).length) {
    await sdrRef('').update(updates);
    toast(`${created} alerta(s) gerado(s)`, 'success');
    sdrAlertasRender();
  } else {
    toast('Nenhum novo alerta necessário', 'info');
  }
};

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
function sdrRenderHeatmap() {
  if (!sdrMap || !sdrLayers.heatmap) return;
  // Remove old heatmap layer if exists
  if (sdrLayers.heatmap && sdrMap.hasLayer(sdrLayers.heatmap)) {
    sdrMap.removeLayer(sdrLayers.heatmap);
  }
  const points = [];
  Object.values(sdrClientesCache).forEach(c => {
    if (!c || !c.lat || !c.lng) return;
    // Intensity based on signal: good signal = low heat, bad signal = high heat
    let intensity = 0.3; // default (no data)
    if (c.rx_power != null) {
      const rx = parseFloat(c.rx_power);
      if (rx > -20) intensity = 0.1;
      else if (rx > -25) intensity = 0.3;
      else if (rx > -28) intensity = 0.6;
      else intensity = 1.0; // bad signal = hot
    }
    if (c.onu_status === 'offline') intensity = 1.0;
    points.push([c.lat, c.lng, intensity]);
  });

  if (points.length > 0) {
    sdrLayers.heatmap = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      max: 1.0,
      gradient: {0.2: '#00ff00', 0.4: '#adff2f', 0.6: '#ffff00', 0.8: '#ff8c00', 1.0: '#ff0000'}
    });
  } else {
    sdrLayers.heatmap = L.layerGroup();
  }

  if (sdrLayerVisible.heatmap) {
    sdrLayers.heatmap.addTo(sdrMap);
  }
}

// Hook heatmap render into map reload + expor para window
const _origMapReload = sdrMapReloadData;
sdrMapReloadData = function() {
  _origMapReload();
  // Render heatmap after clients load
  setTimeout(sdrRenderHeatmap, 500);
};
window.sdrMapReloadData = sdrMapReloadData;

// ── 4B: DASHBOARD REDE COM GRÁFICOS ──
let sdrChartInstances = {};

// Carrega Chart.js dinamicamente se não estiver disponível
function _sdrLoadChartJs(callback) {
  if (typeof Chart !== 'undefined') { callback(); return; }
  if (document.getElementById('sdr-chartjs-script')) {
    // já solicitado mas ainda carregando — aguarda
    var _poll = setInterval(function() {
      if (typeof Chart !== 'undefined') { clearInterval(_poll); callback(); }
    }, 50);
    return;
  }
  var s = document.createElement('script');
  s.id = 'sdr-chartjs-script';
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload = callback;
  s.onerror = function() { console.warn('[SDR] Chart.js não carregou — gráficos desativados.'); };
  document.head.appendChild(s);
}

window.sdrDashRedeRender = function() {
  _sdrLoadChartJs(function() {
  Promise.all([
    sdrRef('infrastructure').once('value'),
    sdrRef('clients').once('value'),
    sdrRef('olt_connections').once('value'),
    sdrRef('alerts').once('value'),
    sdrRef('onus').once('value'),
    sdrRef('tickets').once('value')
  ]).then(([infraSnap, clientsSnap, oltsSnap, alertsSnap, onusSnap, ticketsSnap]) => {
    const infra = infraSnap.val() || {};
    const infraArr = Object.values(infra);
    const clients = clientsSnap.val() || {};
    const clientsArr = Object.values(clients);
    const olts = Object.values(oltsSnap.val() || {});
    const alerts = Object.values(alertsSnap.val() || {});
    const onus = Object.values(onusSnap.val() || {});
    const tickets = Object.values(ticketsSnap.val() || {});

    const activeAlerts = alerts.filter(a => a.is_active);
    const onlineClients = clientsArr.filter(c => c.onu_status === 'online');
    const offlineClients = clientsArr.filter(c => c.onu_status === 'offline');
    const degradedClients = clientsArr.filter(c => c.onu_status === 'degraded');
    const openTickets = tickets.filter(t => t.status !== 'resolvido');

    // ── KPI Cards → #dash-rede-stats ──
    const statsEl = document.getElementById('dash-rede-stats');
    if (statsEl) {
      const kpis = [
        { val: clientsArr.length,     label: 'Clientes',      color: '#2563eb', icon: 'fa-users' },
        { val: onlineClients.length,  label: 'Online',        color: '#16a34a', icon: 'fa-circle' },
        { val: degradedClients.length,label: 'Degradados',    color: '#d97706', icon: 'fa-exclamation-triangle' },
        { val: offlineClients.length, label: 'Offline',       color: '#dc2626', icon: 'fa-times-circle' },
        { val: olts.length,           label: 'OLTs',          color: '#7c3aed', icon: 'fa-server' },
        { val: activeAlerts.length,   label: 'Alertas',       color: '#dc2626', icon: 'fa-bell' },
        { val: openTickets.length,    label: 'Chamados',      color: '#d97706', icon: 'fa-ticket-alt' }
      ];
      statsEl.innerHTML = kpis.map(k =>
        `<div class="infra-stat">
          <div class="is-num" style="color:${k.color}">${k.val}</div>
          <div class="is-label"><i class="fas ${k.icon}" style="margin-right:3px;font-size:.7rem"></i>${k.label}</div>
        </div>`
      ).join('');
    }

    // ── Conteúdo: gráficos + tabelas → #dash-rede-content ──
    const contentEl = document.getElementById('dash-rede-content');
    if (!contentEl) return;

    // Calcular dados dos gráficos antes de injetar HTML
    const ranges = { 'Excelente\n(>-20)':0, 'Bom\n(-20 a -25)':0, 'Regular\n(-25 a -28)':0, 'Ruim\n(<-28)':0, 'Sem dados':0 };
    clientsArr.forEach(c => {
      if (c.rx_power == null) { ranges['Sem dados']++; return; }
      const rx = parseFloat(c.rx_power);
      if (rx > -20) ranges['Excelente\n(>-20)']++;
      else if (rx > -25) ranges['Bom\n(-20 a -25)']++;
      else if (rx > -28) ranges['Regular\n(-25 a -28)']++;
      else ranges['Ruim\n(<-28)']++;
    });

    const ctos = infraArr.filter(i => i.type === 'cto' || i.type === 'splitter');
    const ctoNames = [], ctoOccupied = [], ctoFree = [];
    const infraKeys = Object.keys(infra);
    ctos.slice(0, 10).forEach(cto => {
      const ctoKey = infraKeys.find(k => infra[k] === cto);
      const ports = parseInt(cto.total_ports || cto.ports) || 8;
      const linked = clientsArr.filter(c => c.cto_id && c.cto_id === ctoKey).length;
      ctoNames.push(cto.name || cto.code || 'CTO');
      ctoOccupied.push(linked);
      ctoFree.push(Math.max(0, ports - linked));
    });

    const openT   = tickets.filter(t => t.status === 'aberto').length;
    const inProgT = tickets.filter(t => t.status === 'em_andamento').length;
    const waitT   = tickets.filter(t => t.status === 'aguardando').length;
    const doneT   = tickets.filter(t => t.status === 'resolvido').length;

    const worstSignal = clientsArr.filter(c => c.rx_power != null).sort((a,b) => a.rx_power - b.rx_power).slice(0, 10);

    // Injetar HTML com canvases — os IDs existem depois do innerHTML
    let contentHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="dash-chart-onus" height="200"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="chart-signal-dist" height="200"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="chart-cto-capacity" height="200"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="dash-chart-tickets" height="200"></canvas>
      </div>
    </div>`;

    // Tabela pior sinal
    if (worstSignal.length > 0) {
      contentHtml += `<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:16px">
        <h4 style="font-size:.9rem;margin:0 0 10px"><i class="fas fa-signal" style="color:#dc2626;margin-right:6px"></i>Top 10 — Pior Sinal Rx</h4>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:#fef2f2">
            <th style="padding:6px 10px;text-align:left">Cliente</th>
            <th style="padding:6px 10px;text-align:center">Rx (dBm)</th>
            <th style="padding:6px 10px;text-align:center">Status</th>
            <th style="padding:6px 10px"></th>
          </tr></thead>
          <tbody>${worstSignal.map(c => {
            const id = Object.keys(clients).find(k => clients[k] === c) || '';
            const badge = c.rx_power > -25 ? 'good' : c.rx_power > -28 ? 'warn' : 'bad';
            return `<tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:6px 10px;font-weight:600">${c.name||'-'}</td>
              <td style="padding:6px 10px;text-align:center"><span class="signal-badge ${badge}">${c.rx_power} dBm</span></td>
              <td style="padding:6px 10px;text-align:center">${c.onu_status||'-'}</td>
              <td style="padding:6px 10px;text-align:right">
                <button class="btn-map" onclick="sdrOpenClientePanel('${id}',sdrClientesCache['${id}']||{})" style="padding:3px 8px;font-size:.72rem"><i class="fas fa-eye"></i></button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
    }

    // Alertas ativos
    if (activeAlerts.length > 0) {
      contentHtml += `<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <h4 style="font-size:.9rem;margin:0 0 10px"><i class="fas fa-bell" style="color:#d97706;margin-right:6px"></i>Alertas Ativos (${activeAlerts.length})</h4>`;
      activeAlerts.slice(0, 5).forEach(a => {
        const color = {info:'#2563eb',warning:'#d97706',critical:'#dc2626'}[a.severity]||'#2563eb';
        contentHtml += `<div style="padding:8px 12px;border-left:3px solid ${color};background:#fafbfc;border-radius:0 6px 6px 0;margin-bottom:6px;font-size:.82rem">
          <b>${a.title||'Alerta'}</b><br><span style="color:var(--muted)">${a.message||''}</span></div>`;
      });
      contentHtml += `</div>`;
    } else {
      contentHtml += `<div style="text-align:center;padding:20px;color:var(--muted)"><i class="fas fa-check-circle" style="color:#16a34a;font-size:1.5rem;display:block;margin-bottom:8px"></i>Nenhum alerta ativo — rede estável.</div>`;
    }

    contentEl.innerHTML = contentHtml;

    // Inicializar gráficos APÓS os canvases estarem no DOM
    _sdrDestroyChart('dash-chart-onus');
    _sdrDestroyChart('chart-signal-dist');
    _sdrDestroyChart('chart-cto-capacity');
    _sdrDestroyChart('dash-chart-tickets');

    const ctxStatus = document.getElementById('dash-chart-onus');
    if (ctxStatus && typeof Chart !== 'undefined') {
      sdrChartInstances['dash-chart-onus'] = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Online', 'Degradado', 'Offline', 'Sem ONU'],
          datasets: [{ data: [onlineClients.length, degradedClients.length, offlineClients.length, clientsArr.filter(c => !c.onu_status).length], backgroundColor: ['#16a34a','#d97706','#dc2626','#94a3b8'] }]
        },
        options: { responsive:true, plugins: { title:{display:true,text:'Status da Rede',font:{size:14}}, legend:{position:'bottom',labels:{font:{size:11}}} } }
      });
    }

    const ctxSignal = document.getElementById('chart-signal-dist');
    if (ctxSignal && typeof Chart !== 'undefined') {
      sdrChartInstances['chart-signal-dist'] = new Chart(ctxSignal, {
        type: 'bar',
        data: { labels: Object.keys(ranges), datasets: [{ label:'Clientes', data:Object.values(ranges), backgroundColor:['#16a34a','#22c55e','#eab308','#dc2626','#94a3b8'] }] },
        options: { responsive:true, plugins: { title:{display:true,text:'Distribuição de Sinal Rx',font:{size:14}}, legend:{display:false} }, scales:{ y:{beginAtZero:true,ticks:{stepSize:1}} } }
      });
    }

    const ctxCto = document.getElementById('chart-cto-capacity');
    if (ctxCto && typeof Chart !== 'undefined') {
      sdrChartInstances['chart-cto-capacity'] = new Chart(ctxCto, {
        type: 'bar',
        data: {
          labels: ctoNames.length > 0 ? ctoNames : ['Nenhuma CTO'],
          datasets: [
            { label:'Ocupadas', data: ctoOccupied.length>0?ctoOccupied:[0], backgroundColor:'#3b82f6' },
            { label:'Livres',   data: ctoFree.length>0?ctoFree:[0],         backgroundColor:'#e2e8f0' }
          ]
        },
        options: { indexAxis:'y', responsive:true, plugins:{ title:{display:true,text:'Capacidade de CTOs (Top 10)',font:{size:14}}, legend:{position:'bottom',labels:{font:{size:11}}} }, scales:{ x:{stacked:true,beginAtZero:true}, y:{stacked:true} } }
      });
    }

    const ctxTickets = document.getElementById('dash-chart-tickets');
    if (ctxTickets && typeof Chart !== 'undefined') {
      sdrChartInstances['dash-chart-tickets'] = new Chart(ctxTickets, {
        type: 'doughnut',
        data: { labels:['Abertos','Em Andamento','Aguardando','Resolvidos'], datasets:[{ data:[openT,inProgT,waitT,doneT], backgroundColor:['#dc2626','#2563eb','#d97706','#16a34a'] }] },
        options: { responsive:true, plugins:{ title:{display:true,text:'Chamados por Status',font:{size:14}}, legend:{position:'bottom',labels:{font:{size:11}}} } }
      });
    }
  }).catch(err => console.error('[SDR DashRede]', err));
  }); // _sdrLoadChartJs
};

function _sdrDestroyChart(id) {
  if (sdrChartInstances[id]) {
    sdrChartInstances[id].destroy();
    delete sdrChartInstances[id];
  }
}

// ── 4C: TICKETS DE REDE ──
let sdrTicketsCache = {};

window.sdrTicketsRender = function() {
  Promise.all([
    sdrRef('tickets').once('value'),
    sdrRef('clients').once('value')
  ]).then(([ticketsSnap, clientsSnap]) => {
    sdrTicketsCache = ticketsSnap.val() || {};
    sdrClientesCache = clientsSnap.val() || {};

    const tickets = Object.values(sdrTicketsCache);
    const open = tickets.filter(t => t.status === 'aberto');
    const inProgress = tickets.filter(t => t.status === 'em_andamento');
    const waiting = tickets.filter(t => t.status === 'aguardando');
    const resolved = tickets.filter(t => t.status === 'resolvido');

    const statsEl = document.getElementById('tickets-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="infra-stat"><div class="is-num">${tickets.length}</div><div class="is-label">Total</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#dc2626">${open.length}</div><div class="is-label">Abertos</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#2563eb">${inProgress.length}</div><div class="is-label">Em Andamento</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#d97706">${waiting.length}</div><div class="is-label">Aguardando</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#16a34a">${resolved.length}</div><div class="is-label">Resolvidos</div></div>`;
    }

    _renderTicketsLista();
  });
};

function _renderTicketsLista() {
  const statusFilter = document.getElementById('tickets-filter-status')?.value || '';
  const priorityFilter = document.getElementById('tickets-filter-priority')?.value || '';
  const search = (document.getElementById('tickets-search')?.value || '').toLowerCase();

  let entries = Object.entries(sdrTicketsCache);

  if (statusFilter) entries = entries.filter(([,t]) => t.status === statusFilter);
  if (priorityFilter) entries = entries.filter(([,t]) => t.priority === priorityFilter);
  if (search) {
    entries = entries.filter(([,t]) => {
      const clientName = t.client_id ? (sdrClientesCache[t.client_id]?.name || '') : '';
      return (t.title || '').toLowerCase().includes(search) ||
             (t.description || '').toLowerCase().includes(search) ||
             clientName.toLowerCase().includes(search);
    });
  }

  entries.sort((a,b) => (b[1].created_at || '').localeCompare(a[1].created_at || ''));

  const el = document.getElementById('tickets-lista');
  if (!el) return;

  if (entries.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      <i class="fas fa-headset" style="font-size:2.5rem;opacity:.3;margin-bottom:10px;display:block"></i>
      Nenhum ticket encontrado
      <div style="margin-top:12px"><button class="btn-primary" onclick="sdrTicketAdd()" style="padding:8px 16px;font-size:.82rem"><i class="fas fa-plus" style="margin-right:4px"></i>Abrir primeiro ticket</button></div>
    </div>`;
    return;
  }

  const priorityColors = { critical:'#dc2626', high:'#ea580c', medium:'#d97706', low:'#16a34a' };
  const priorityLabels = { critical:'Crítica', high:'Alta', medium:'Média', low:'Baixa' };
  const statusLabels = { aberto:'Aberto', em_andamento:'Em Andamento', aguardando:'Aguardando', resolvido:'Resolvido' };
  const statusColors = { aberto:'#dc2626', em_andamento:'#2563eb', aguardando:'#d97706', resolvido:'#16a34a' };

  let html = `<table style="width:100%;border-collapse:collapse;font-size:.82rem">
    <thead><tr style="background:#f8fafc">
      <th style="padding:8px 10px;text-align:left">Ticket</th>
      <th style="padding:8px 10px;text-align:left">Cliente</th>
      <th style="padding:8px 10px;text-align:center">Prioridade</th>
      <th style="padding:8px 10px;text-align:center">Status</th>
      <th style="padding:8px 10px;text-align:center">Aberto em</th>
      <th style="padding:8px 10px;text-align:center">Ações</th>
    </tr></thead><tbody>`;

  entries.forEach(([id, t]) => {
    const client = t.client_id ? sdrClientesCache[t.client_id] : null;
    const pColor = priorityColors[t.priority] || '#94a3b8';
    const pLabel = priorityLabels[t.priority] || t.priority || '-';
    const sColor = statusColors[t.status] || '#94a3b8';
    const sLabel = statusLabels[t.status] || t.status || '-';
    const date = t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '-';

    html += `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="sdrOpenTicketPanel('${id}')">
      <td style="padding:8px 10px"><b>${t.title || 'Sem título'}</b><br><span style="color:var(--muted);font-size:.78rem">${(t.description||'').substring(0,60)}${(t.description||'').length > 60 ? '...' : ''}</span></td>
      <td style="padding:8px 10px">${client ? client.name : (t.client_name || '-')}</td>
      <td style="padding:8px 10px;text-align:center"><span style="background:${pColor};color:#fff;padding:2px 8px;border-radius:10px;font-size:.75rem">${pLabel}</span></td>
      <td style="padding:8px 10px;text-align:center"><span style="background:${sColor}22;color:${sColor};padding:2px 8px;border-radius:10px;font-size:.75rem;font-weight:600">${sLabel}</span></td>
      <td style="padding:8px 10px;text-align:center;color:var(--muted)">${date}</td>
      <td style="padding:8px 10px;text-align:center">
        <button onclick="event.stopPropagation();sdrTicketEdit('${id}')" style="border:none;background:none;cursor:pointer;color:var(--primary)" title="Editar"><i class="fas fa-edit"></i></button>
        ${t.status !== 'resolvido' ? `<button onclick="event.stopPropagation();sdrTicketResolve('${id}')" style="border:none;background:none;cursor:pointer;color:#16a34a" title="Resolver"><i class="fas fa-check-circle"></i></button>` : ''}
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  el.innerHTML = html;
}

window.sdrTicketsFilter = _renderTicketsLista;

window.sdrTicketAdd = function(editId) {
  const d = editId ? sdrTicketsCache[editId] || {} : {};
  const isEdit = !!editId;

  // Build client options
  let clientOpts = '<option value="">Nenhum cliente vinculado</option>';
  Object.entries(sdrClientesCache).forEach(([cid, c]) => {
    const sel = d.client_id === cid ? 'selected' : '';
    clientOpts += `<option value="${cid}" ${sel}>${c.name || cid}</option>`;
  });

  // Remover modal anterior se existir
  const prev = document.getElementById('sdr-ticket-modal');
  if (prev) prev.remove();

  const html = `<div class="modal-overlay open" id="sdr-ticket-modal" onclick="if(event.target===this)this.remove()">
    <div class="modal-box" style="max-width:520px">
      <div class="modal-header">
        <h3><i class="fas fa-headset" style="color:var(--primary);margin-right:8px"></i>${isEdit ? 'Editar' : 'Novo'} Ticket</h3>
        <button onclick="document.getElementById('sdr-ticket-modal').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Título</label>
          <input id="tk-title" value="${d.title||''}" placeholder="Ex: ONU offline no cliente X"></div>
        <div class="form-group"><label>Descrição</label>
          <textarea id="tk-desc" rows="3" placeholder="Detalhes do problema..." style="resize:vertical">${d.description||''}</textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label>Prioridade</label>
            <select id="tk-priority">
              <option value="low" ${d.priority==='low'?'selected':''}>Baixa</option>
              <option value="medium" ${d.priority==='medium'||!d.priority?'selected':''}>Média</option>
              <option value="high" ${d.priority==='high'?'selected':''}>Alta</option>
              <option value="critical" ${d.priority==='critical'?'selected':''}>Crítica</option>
            </select></div>
          <div class="form-group"><label>Status</label>
            <select id="tk-status">
              <option value="aberto" ${d.status==='aberto'||!d.status?'selected':''}>Aberto</option>
              <option value="em_andamento" ${d.status==='em_andamento'?'selected':''}>Em Andamento</option>
              <option value="aguardando" ${d.status==='aguardando'?'selected':''}>Aguardando</option>
              <option value="resolvido" ${d.status==='resolvido'?'selected':''}>Resolvido</option>
            </select></div>
        </div>
        <div class="form-group"><label>Cliente</label>
          <select id="tk-client">${clientOpts}</select></div>
        <div class="form-group"><label>Tipo</label>
          <select id="tk-type">
            <option value="sem_sinal" ${d.type==='sem_sinal'?'selected':''}>Sem Sinal / ONU Offline</option>
            <option value="sinal_baixo" ${d.type==='sinal_baixo'?'selected':''}>Sinal Baixo / Degradado</option>
            <option value="lentidao" ${d.type==='lentidao'?'selected':''}>Lentidão</option>
            <option value="queda_frequente" ${d.type==='queda_frequente'?'selected':''}>Quedas Frequentes</option>
            <option value="instalacao" ${d.type==='instalacao'?'selected':''}>Instalação</option>
            <option value="mudanca_endereco" ${d.type==='mudanca_endereco'?'selected':''}>Mudança de Endereço</option>
            <option value="infra" ${d.type==='infra'?'selected':''}>Infraestrutura</option>
            <option value="outro" ${d.type==='outro'||!d.type?'selected':''}>Outro</option>
          </select></div>
        <div class="form-group"><label>Observações</label>
          <textarea id="tk-notes" rows="2" placeholder="Notas internas..." style="resize:vertical">${d.notes||''}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="document.getElementById('sdr-ticket-modal').remove()">Cancelar</button>
        <button class="btn-primary" onclick="sdrTicketSave('${editId||''}')"><i class="fas fa-save" style="margin-right:4px"></i>${isEdit ? 'Salvar' : 'Criar Ticket'}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.sdrTicketEdit = function(id) { window.sdrTicketAdd(id); };

window.sdrTicketSave = async function(editId) {
  const title = document.getElementById('tk-title')?.value?.trim();
  if (!title) { toast('Informe o título do ticket', 'error'); return; }

  const data = {
    title,
    description: document.getElementById('tk-desc')?.value?.trim() || '',
    priority: document.getElementById('tk-priority')?.value || 'medium',
    status: document.getElementById('tk-status')?.value || 'aberto',
    client_id: document.getElementById('tk-client')?.value || '',
    type: document.getElementById('tk-type')?.value || 'outro',
    notes: document.getElementById('tk-notes')?.value?.trim() || '',
    updated_at: new Date().toISOString()
  };

  if (!editId) {
    data.created_at = new Date().toISOString();
    data.created_by = firebase.auth().currentUser?.displayName || 'admin';
  }

  try {
    if (editId) {
      await sdrRef(`tickets/${editId}`).update(data);
      toast('Ticket atualizado!', 'success');
    } else {
      await sdrRef('tickets').push(data);
      toast('Ticket criado!', 'success');
    }
    const tm = document.getElementById('sdr-ticket-modal');
    if (tm) tm.remove();
    sdrTicketsRender();
  } catch (e) {
    toast('Erro ao salvar ticket: ' + e.message, 'error');
  }
};

window.sdrTicketResolve = async function(id) {
  if (!confirm('Resolver este ticket?')) return;
  try {
    await sdrRef(`tickets/${id}`).update({
      status: 'resolvido',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    toast('Ticket resolvido!', 'success');
    sdrTicketsRender();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  }
};

window.sdrTicketDelete = async function(id) {
  if (!confirm('Excluir este ticket permanentemente?')) return;
  try {
    await sdrRef(`tickets/${id}`).remove();
    toast('Ticket excluído', 'success');
    sdrTicketsRender();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
  }
};

window.sdrOpenTicketPanel = function(id) {
  const t = sdrTicketsCache[id];
  if (!t) return;
  const client = t.client_id ? sdrClientesCache[t.client_id] : null;

  const priorityLabels = { critical:'Crítica', high:'Alta', medium:'Média', low:'Baixa' };
  const priorityColors = { critical:'#dc2626', high:'#ea580c', medium:'#d97706', low:'#16a34a' };
  const statusLabels = { aberto:'Aberto', em_andamento:'Em Andamento', aguardando:'Aguardando', resolvido:'Resolvido' };
  const statusColors = { aberto:'#dc2626', em_andamento:'#2563eb', aguardando:'#d97706', resolvido:'#16a34a' };
  const typeLabels = { sem_sinal:'Sem Sinal / ONU Offline', sinal_baixo:'Sinal Baixo', lentidao:'Lentidão', queda_frequente:'Quedas Frequentes', instalacao:'Instalação', mudanca_endereco:'Mudança de Endereço', infra:'Infraestrutura', outro:'Outro' };

  const pColor = priorityColors[t.priority] || '#94a3b8';
  const sColor = statusColors[t.status] || '#94a3b8';

  let html = `
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <span style="background:${pColor};color:#fff;padding:3px 10px;border-radius:10px;font-size:.78rem;font-weight:600">${priorityLabels[t.priority]||'-'}</span>
      <span style="background:${sColor}22;color:${sColor};padding:3px 10px;border-radius:10px;font-size:.78rem;font-weight:600">${statusLabels[t.status]||'-'}</span>
      <span style="background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:10px;font-size:.78rem">${typeLabels[t.type]||t.type||'-'}</span>
    </div>
    <h4 style="font-size:.95rem;margin:0 0 8px">${t.title || 'Sem título'}</h4>
    <p style="font-size:.84rem;color:var(--muted);margin:0 0 14px;white-space:pre-wrap">${t.description || 'Sem descrição'}</p>`;

  if (client) {
    html += `<div style="background:#f0f9ff;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:.82rem">
      <b><i class="fas fa-user" style="margin-right:4px;color:var(--primary)"></i>${client.name}</b>
      ${client.phone ? '<br><i class="fas fa-phone" style="margin-right:4px;color:var(--muted)"></i>' + client.phone : ''}
      ${client.plan_name ? '<br><i class="fas fa-wifi" style="margin-right:4px;color:var(--muted)"></i>' + client.plan_name : ''}
    </div>`;
  }

  if (t.notes) {
    html += `<div style="background:#fffbeb;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:.82rem">
      <b><i class="fas fa-sticky-note" style="margin-right:4px;color:#d97706"></i>Observações</b>
      <p style="margin:4px 0 0;white-space:pre-wrap">${t.notes}</p>
    </div>`;
  }

  html += `<div style="font-size:.78rem;color:var(--muted);margin:12px 0">
    ${t.created_at ? '<i class="fas fa-clock"></i> Aberto: ' + new Date(t.created_at).toLocaleString('pt-BR') : ''}
    ${t.resolved_at ? '<br><i class="fas fa-check-circle" style="color:#16a34a"></i> Resolvido: ' + new Date(t.resolved_at).toLocaleString('pt-BR') : ''}
    ${t.created_by ? '<br><i class="fas fa-user-edit"></i> Por: ' + t.created_by : ''}
  </div>`;

  html += `<div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap">
    <button onclick="sdrTicketEdit('${id}')" class="btn-primary" style="padding:6px 14px;font-size:.82rem"><i class="fas fa-edit" style="margin-right:4px"></i>Editar</button>
    ${t.status !== 'resolvido' ? `<button onclick="sdrTicketResolve('${id}')" style="padding:6px 14px;font-size:.82rem;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer"><i class="fas fa-check" style="margin-right:4px"></i>Resolver</button>` : ''}
    <button onclick="sdrTicketPrintOS('${id}')" style="padding:6px 14px;font-size:.82rem;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer" title="Imprimir Ordem de Serviço"><i class="fas fa-print" style="margin-right:4px"></i>OS</button>
    <button onclick="sdrTicketDelete('${id}')" style="padding:6px 14px;font-size:.82rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;cursor:pointer"><i class="fas fa-trash" style="margin-right:4px"></i>Excluir</button>
  </div>`;

  document.getElementById('sp-title').textContent = 'Ticket #' + id.substring(0,6);
  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
};

// ── Imprimir OS (Ordem de Serviço) ──
window.sdrTicketPrintOS = function(id) {
  var t = sdrTicketsCache[id];
  if (!t) { toast('Ticket não encontrado no cache — abra a aba Tickets primeiro', 'error'); return; }
  var client = t.client_id ? sdrClientesCache[t.client_id] : null;
  var now = new Date();
  var osNum = 'OS-' + now.getFullYear() + '-' + id.substring(0, 6).toUpperCase();
  var dateStr = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  var timeStr = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

  var prioLbl = {critical:'🔴 CRÍTICA', high:'🟠 ALTA', medium:'🟡 MÉDIA', low:'🟢 BAIXA'};
  var typeLbl = {sem_sinal:'Sem Sinal / ONU Offline', sinal_baixo:'Sinal Baixo / Degradado', lentidao:'Lentidão', queda_frequente:'Quedas Frequentes', instalacao:'Instalação', mudanca_endereco:'Mudança de Endereço', infra:'Infraestrutura', outro:'Outro'};
  var checklist = {
    sem_sinal:    ['Verificar alimentação da ONU', 'Verificar cabo drop do cliente', 'Verificar conector SC/APC', 'Verificar sinal na CTO/splitter', 'Substituir ONU se necessário'],
    sinal_baixo:  ['Medir sinal Rx com OTDR/power meter', 'Limpar conectores SC/APC', 'Verificar emendas e curvas no cabo', 'Verificar atenuação da rota óptica', 'Verificar splitter'],
    lentidao:     ['Verificar velocidade com speed test', 'Verificar plano contratado no sistema', 'Verificar QoS/limitação na OLT', 'Reiniciar ONU', 'Verificar cabeamento LAN do cliente'],
    queda_frequente:['Verificar log de eventos na OLT', 'Medir sinal Rx ao longo de 30 min', 'Verificar temperatura da ONU', 'Verificar conexão do conector', 'Verificar alimentação elétrica'],
    instalacao:   ['Verificar viabilidade do ponto', 'Localizar CTO mais próxima com porta livre', 'Lançar cabo drop', 'Instalar e provisionar ONU', 'Testar velocidade e sinal', 'Assinar contrato'],
    outro:        ['Verificar configurações da ONU', 'Consultar painel SDR', 'Contatar suporte N2 se necessário']
  };
  var items = checklist[t.type] || checklist.outro;

  var win = window.open('', '_blank', 'width=800,height=900');
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${osNum}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:0;padding:24px;max-width:760px;margin:0 auto}
  .os-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:16px}
  .os-logo{font-size:22px;font-weight:900;color:#2563eb}
  .os-logo span{color:#1e293b}
  .os-num{text-align:right;font-size:.85rem;color:#475569}
  .os-num strong{display:block;font-size:1.5rem;color:#2563eb;letter-spacing:1px}
  .os-section{border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:12px}
  .os-section h3{margin:0 0 8px;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:#64748b;border-bottom:1px solid #f1f5f9;padding-bottom:4px}
  .os-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}
  .os-row{display:flex;gap:6px;padding:2px 0}
  .os-lbl{font-weight:600;min-width:110px;color:#475569;font-size:.82rem}
  .os-val{font-size:.82rem}
  .os-checklist{list-style:none;margin:0;padding:0}
  .os-checklist li{padding:5px 0;border-bottom:1px dashed #e2e8f0;display:flex;align-items:center;gap:8px;font-size:.84rem}
  .os-check-box{width:14px;height:14px;border:1px solid #94a3b8;border-radius:2px;flex-shrink:0}
  .os-sign{border-top:1px solid #1e293b;width:200px;padding-top:4px;margin-top:40px;font-size:.78rem;color:#475569;text-align:center}
  .os-footer{margin-top:20px;font-size:.73rem;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:10px}
  .prio-badge{display:inline-block;font-size:.75rem;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#92400e;font-weight:600}
  @media print{body{padding:0;font-size:11px}button{display:none!important}}
</style>
</head><body>

<div class="os-header">
  <div>
    <div class="os-logo">SDR <span>Comercial</span></div>
    <div style="font-size:.78rem;color:#64748b;margin-top:2px">Solução de Rede</div>
  </div>
  <div class="os-num">
    <div>ORDEM DE SERVIÇO</div>
    <strong>${osNum}</strong>
    <div style="margin-top:4px">${dateStr} — ${timeStr}</div>
  </div>
</div>

<div class="os-section">
  <h3>📋 Dados do Chamado</h3>
  <div class="os-row"><span class="os-lbl">Título:</span><span class="os-val"><b>${t.title || '-'}</b></span></div>
  <div class="os-row"><span class="os-lbl">Tipo:</span><span class="os-val">${typeLbl[t.type] || t.type || '-'}</span></div>
  <div class="os-row"><span class="os-lbl">Prioridade:</span><span class="os-val"><span class="prio-badge">${prioLbl[t.priority] || t.priority || '-'}</span></span></div>
  <div class="os-row" style="margin-top:6px"><span class="os-lbl" style="align-self:flex-start">Descrição:</span><span class="os-val" style="white-space:pre-wrap">${t.description || 'Sem descrição'}</span></div>
  ${t.notes ? `<div class="os-row" style="margin-top:4px"><span class="os-lbl" style="align-self:flex-start">Observações:</span><span class="os-val" style="white-space:pre-wrap">${t.notes}</span></div>` : ''}
</div>

${client ? `
<div class="os-section">
  <h3>👤 Dados do Cliente</h3>
  <div class="os-grid">
    <div class="os-row"><span class="os-lbl">Nome:</span><span class="os-val"><b>${client.name}</b></span></div>
    ${client.cpf_cnpj ? `<div class="os-row"><span class="os-lbl">CPF/CNPJ:</span><span class="os-val">${client.cpf_cnpj}</span></div>` : ''}
    ${client.phone ? `<div class="os-row"><span class="os-lbl">Telefone:</span><span class="os-val">${client.phone}</span></div>` : ''}
    ${client.email ? `<div class="os-row"><span class="os-lbl">E-mail:</span><span class="os-val">${client.email}</span></div>` : ''}
    ${client.plan_name ? `<div class="os-row"><span class="os-lbl">Plano:</span><span class="os-val">${client.plan_name} ${client.plan_speed_down ? '('+client.plan_speed_down+'M)' : ''}</span></div>` : ''}
    ${client.onu_serial ? `<div class="os-row"><span class="os-lbl">Serial ONU:</span><span class="os-val" style="font-family:monospace">${client.onu_serial}</span></div>` : ''}
  </div>
  ${client.address ? `<div class="os-row" style="margin-top:6px"><span class="os-lbl">Endereço:</span><span class="os-val">${client.address}</span></div>` : ''}
</div>
` : ''}

<div class="os-section">
  <h3>✅ Checklist Técnico</h3>
  <ul class="os-checklist">
    ${items.map(i => `<li><div class="os-check-box"></div>${i}</li>`).join('')}
    <li><div class="os-check-box"></div><em style="color:#94a3b8">Outro: ___________________________</em></li>
  </ul>
</div>

<div class="os-section">
  <h3>📝 Diagnóstico e Resolução (preencher em campo)</h3>
  <div style="border:1px solid #e2e8f0;border-radius:4px;min-height:60px;padding:6px;color:#94a3b8;font-size:.8rem">Descreva o problema encontrado e a solução aplicada...</div>
  <div style="margin-top:8px;font-size:.8rem"><b>Materiais utilizados:</b> ___________________________________________</div>
  <div style="margin-top:6px;font-size:.8rem"><b>Sinal Rx antes:</b> _______ dBm &nbsp;&nbsp;&nbsp; <b>Sinal Rx depois:</b> _______ dBm</div>
  <div style="margin-top:6px;font-size:.8rem"><b>Hora de chegada:</b> ____:____ &nbsp;&nbsp;&nbsp; <b>Hora de saída:</b> ____:____</div>
</div>

<div style="display:flex;justify-content:space-between;margin-top:20px">
  <div class="os-sign">Assinatura do Técnico</div>
  <div class="os-sign">Assinatura do Cliente</div>
</div>

<div class="os-footer">
  Gerado pelo SDR Comercial em ${dateStr} às ${timeStr} &nbsp;·&nbsp; ${osNum}
</div>

<div style="text-align:center;margin-top:16px">
  <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.9rem"><i>🖨</i> Imprimir</button>
  <button onclick="window.close()" style="padding:8px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;cursor:pointer;font-size:.9rem;margin-left:8px">Fechar</button>
</div>

</body></html>`);
  win.document.close();
  setTimeout(function() { win.focus(); }, 300);
};

// ── Relatório de Inadimplentes ──
window.sdrRelatorioInadimplentes = function() {
  var all = Object.entries(sdrClientesCache);
  var inad = all.filter(function(e) { return e[1] && e[1].financial_status === 'inadimplente'; });
  if (inad.length === 0) { toast('Nenhum cliente inadimplente cadastrado', 'success'); return; }

  var now = new Date();
  var dateStr = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  var rows = inad.map(function(e) {
    var id = e[0], c = e[1];
    var onuBadge = c.onu_status === 'online' ? '🟢 Online' : c.onu_status === 'offline' ? '🔴 Offline' : c.onu_status === 'degraded' ? '🟡 Degradado' : '⚪ Sem ONU';
    return `<tr>
      <td style="padding:6px 10px;font-weight:600">${c.name || '-'}</td>
      <td style="padding:6px 10px">${c.cpf_cnpj || '-'}</td>
      <td style="padding:6px 10px">${c.phone || '-'}</td>
      <td style="padding:6px 10px">${c.plan_name || '-'} ${c.plan_speed_down ? '('+c.plan_speed_down+'M)' : ''}</td>
      <td style="padding:6px 10px;text-align:center">${onuBadge}</td>
      <td style="padding:6px 10px;font-size:.78rem;color:#64748b">${c.address || '-'}</td>
    </tr>`;
  }).join('');

  var win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>Relatório de Inadimplência — ${dateStr}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px;margin:0 auto;max-width:900px}
  h1{font-size:1.1rem;color:#dc2626;margin-bottom:4px}
  .sub{font-size:.8rem;color:#64748b;margin-bottom:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#fef2f2;padding:7px 10px;text-align:left;font-size:.78rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #fca5a5}
  tr:nth-child(even){background:#fff5f5}
  tr:hover{background:#fee2e2}
  td{border-bottom:1px solid #fecaca}
  .total{font-weight:700;color:#dc2626;font-size:.9rem;margin-top:12px}
  @media print{button{display:none!important}}
</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    <h1>🔴 Relatório de Inadimplência</h1>
    <div class="sub">Gerado em ${dateStr} via SDR Comercial</div>
  </div>
  <div style="text-align:right">
    <button onclick="window.print()" style="padding:6px 14px;background:#dc2626;color:#fff;border:none;border-radius:5px;cursor:pointer">🖨 Imprimir</button>
    <button onclick="window.close()" style="padding:6px 14px;background:#f1f5f9;color:#475569;border:none;border-radius:5px;cursor:pointer;margin-left:6px">Fechar</button>
  </div>
</div>
<table>
  <thead><tr>
    <th>Nome</th><th>CPF/CNPJ</th><th>Telefone</th><th>Plano</th><th>Status ONU</th><th>Endereço</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="total" style="margin-top:14px">Total de inadimplentes: ${inad.length} cliente(s)</div>
</body></html>`);
  win.document.close();
  setTimeout(function() { win.focus(); }, 300);
};

// ── 4D: MAPA BASE — SATÉLITE + RUAS ──
const SDR_TILE_URLS = {
  streets:   { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap', maxZoom: 19 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri', maxZoom: 19 },
  hybrid:    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri', maxZoom: 19 },
  dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; CARTO', maxZoom: 19 }
};
let sdrHybridLabels = null;

window.sdrMapChangeBase = function(type) {
  if (!sdrMap || !sdrBaseTile) return;
  const cfg = SDR_TILE_URLS[type] || SDR_TILE_URLS.streets;
  sdrMap.removeLayer(sdrBaseTile);
  if (sdrHybridLabels) { sdrMap.removeLayer(sdrHybridLabels); sdrHybridLabels = null; }
  sdrBaseTile = L.tileLayer(cfg.url, { maxZoom: cfg.maxZoom, attribution: cfg.attr }).addTo(sdrMap);
  // Add road/place labels on top of satellite
  if (type === 'hybrid' || type === 'satellite') {
    sdrHybridLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, attribution: '&copy; CARTO', pane: 'overlayPane'
    }).addTo(sdrMap);
  }
};


// ════════════════════════════════════════════════════════════════
// SPRINT 5 — MAPA FTTH PROFISSIONAL
// Import KMZ/KML • Cores do KMZ • CTOs com Portas • Cabos Avançados
// Modo Desenho • Diagrama Unifilar
// ════════════════════════════════════════════════════════════════

// ── Estado Sprint 5 ──
let sdrDrawModeActive = false;
let sdrDrawPoints     = [];
let sdrDrawPolyline   = null;
let sdrDrawTmpMarkers = [];
let sdrKMZLayer       = null;

// ════════════════════════════════════════════════════════════════
// MÓDULO DE DESENHO — GIS FTTH (Cabos, CTOs, Áreas de Cobertura)
// ════════════════════════════════════════════════════════════════
let _sdrDrawCurrentMode = null;
let _sdrDrawPts         = [];
let _sdrPolyPrev        = null;
let _sdrPolyArea        = null;
let _sdrTmpMkrs         = [];
window._sdrPendingDrawPoints = null;


// ── GIS Draw Mode avançado (branch main) ─────────────────────────────────
window.sdrDrawModeToggle = function() {
  if (!sdrMapReady || !sdrMap) { toast('Aguarde o mapa carregar', 'warning'); return; }
  if (document.getElementById('sdr-draw-panel')) { window._sdrCloseDrawMode(); return; }
  _sdrOpenDrawPanel();
};

// Estado global das novas ferramentas
let _sdrSnapEnabled = false;
let _sdrMoveSelected = null;
let _sdrMoveSelMarker = null;
let _sdrMeasurePts  = [];
let _sdrMeasureLine = null;
let _sdrMeasurePop  = null;
let _sdrEditMode    = null; // 'move' | 'delete'

function _sdrOpenDrawPanel() {
  const btn = document.getElementById('btn-draw-mode');
  if (btn) { btn.style.background = '#2563eb'; btn.innerHTML = '<i class="fas fa-times"></i> Fechar'; }
  const mapContainer = document.getElementById('sdr-map');
  if (!mapContainer) return;

  // Inject button CSS once
  if (!document.getElementById('sdr-dbt-css')) {
    var s = document.createElement('style'); s.id = 'sdr-dbt-css';
    s.textContent = [
      '.sdr-dbt{display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 4px 6px;border-radius:7px;cursor:pointer;font-size:.7rem;transition:all .12s;user-select:none}',
      '.sdr-dbt b{font-weight:700;font-size:.73rem;line-height:1}',
      '.sdr-dbt small{font-size:.58rem;opacity:.65;line-height:1}',
      '.sdr-dbt.active{outline:2px solid #fff!important;transform:scale(.94);opacity:1!important}'
    ].join('');
    document.head.appendChild(s);
  }

  const panel = document.createElement('div');
  panel.id = 'sdr-draw-panel';
  panel.style.cssText = 'position:absolute;top:8px;left:8px;z-index:1000;background:#1e293b;color:#f1f5f9;border-radius:12px;padding:12px;width:248px;box-shadow:0 6px 28px rgba(0,0,0,.7);font-family:sans-serif';
  panel.innerHTML =
    // Título
    '<div style="font-weight:700;font-size:.8rem;color:#60a5fa;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<span><i class="fas fa-tools"></i> EDIÇÃO GIS — FTTH</span>'
    + '<button onclick="window._sdrCloseDrawMode()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;padding:0 2px;line-height:1">×</button>'
    + '</div>'
    // --- CRIAR ---
    + '<div style="font-size:.6rem;color:#475569;text-transform:uppercase;letter-spacing:.09em;margin-bottom:5px">Criar</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px">'
    + '<button id="dbt-cable"   class="sdr-dbt" onclick="window._sdrStartDraw(\'cable\')"   style="' + _dbtS('#0ea5e9') + '"><i class="fas fa-minus"></i><b>Cabo FO</b><small>pts+duplo</small></button>'
    + '<button id="dbt-cto"     class="sdr-dbt" onclick="window._sdrStartDraw(\'cto\')"     style="' + _dbtS('#7c3aed') + '"><i class="fas fa-dot-circle"></i><b>CTO</b><small>1 clique</small></button>'
    + '<button id="dbt-pole"    class="sdr-dbt" onclick="window._sdrStartDraw(\'pole\')"    style="' + _dbtS('#d97706') + '"><i class="fas fa-bolt"></i><b>Poste</b><small>1 clique</small></button>'
    + '<button id="dbt-area"    class="sdr-dbt" onclick="window._sdrStartDraw(\'area\')"    style="' + _dbtS('#059669') + '"><i class="fas fa-vector-square"></i><b>Área</b><small>pts+duplo</small></button>'
    + '<button id="dbt-measure" class="sdr-dbt" onclick="window._sdrStartDraw(\'measure\')" style="' + _dbtS('#f59e0b') + '"><i class="fas fa-ruler-combined"></i><b>Medir</b><small>2+ pts</small></button>'
    + '</div>'
    // --- EDITAR ---
    + '<div style="font-size:.6rem;color:#475569;text-transform:uppercase;letter-spacing:.09em;margin-bottom:5px;padding-top:6px;border-top:1px solid #334155">Editar</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px">'
    + '<button id="dbt-move"   class="sdr-dbt" onclick="window._sdrStartEditMode(\'move\')"   style="' + _dbtS('#06b6d4') + '"><i class="fas fa-arrows-alt"></i><b>Mover</b><small>selec+drag</small></button>'
    + '<button id="dbt-delete" class="sdr-dbt" onclick="window._sdrStartEditMode(\'delete\')" style="' + _dbtS('#ef4444') + '"><i class="fas fa-trash-alt"></i><b>Deletar</b><small>1 clique</small></button>'
    + '</div>'
    // --- SNAP ---
    + '<div style="display:flex;align-items:center;gap:7px;padding:5px 7px;background:#0f172a;border-radius:6px;cursor:pointer;margin-bottom:8px" onclick="window._sdrToggleSnap()">'
    + '<div id="snap-tog" style="width:30px;height:16px;background:#334155;border-radius:8px;position:relative;transition:.2s;flex-shrink:0">'
    + '<div id="snap-thm" style="width:12px;height:12px;background:#64748b;border-radius:50%;position:absolute;top:2px;left:2px;transition:.2s"></div></div>'
    + '<span style="font-size:.73rem;color:#94a3b8"><i class="fas fa-magnet" style="color:#60a5fa;margin-right:3px"></i>Snap a elementos</span>'
    + '</div>'
    // --- HINT ---
    + '<div id="sdr-draw-hint" style="font-size:.72rem;color:#60a5fa;min-height:0;margin-bottom:5px;line-height:1.4;padding:4px 7px;background:#0f172a;border-radius:5px;display:none"></div>'
    // --- STATS ---
    + '<div id="sdr-draw-stats" style="font-size:.7rem;color:#94a3b8;margin-bottom:7px;display:none;gap:10px">'
    + '<span>Pts: <b id="dp-count">0</b></span><span>Dist: <b id="dp-dist">0.00</b> km</span>'
    + '</div>'
    // --- UNDO + FINALIZAR ---
    + '<div style="display:flex;gap:5px;margin-bottom:8px">'
    + '<button onclick="window._sdrUndoPt()" title="Ctrl+Z" style="flex:1;background:#374151;color:#f1f5f9;border:none;padding:6px;border-radius:6px;cursor:pointer;font-size:.73rem"><i class="fas fa-undo"></i> Desfazer</button>'
    + '<button onclick="window._sdrFinalizeDraw()" title="Enter" style="flex:1;background:#16a34a;color:#fff;border:none;padding:6px;border-radius:6px;cursor:pointer;font-size:.73rem"><i class="fas fa-check"></i> Finalizar</button>'
    + '</div>'
    // --- ATALHOS ---
    + '<div style="font-size:.62rem;color:#334155;text-align:center">'
    + '<kbd style="background:#334155;border-radius:3px;padding:1px 4px;color:#94a3b8">Esc</kbd> cancela &nbsp;'
    + '<kbd style="background:#334155;border-radius:3px;padding:1px 4px;color:#94a3b8">Enter</kbd> finaliza &nbsp;'
    + '<kbd style="background:#334155;border-radius:3px;padding:1px 4px;color:#94a3b8">Ctrl+Z</kbd> desfaz'
    + '</div>';

  mapContainer.appendChild(panel);

  // Atalhos de teclado
  window._sdrDrawKeyHandler = function(ev) {
    if (ev.key === 'Escape') { window._sdrCloseDrawMode(); }
    if (ev.key === 'Enter')  { window._sdrFinalizeDraw(); }
    if ((ev.key === 'z' || ev.key === 'Z') && ev.ctrlKey) { ev.preventDefault(); window._sdrUndoPt(); }
  };
  document.addEventListener('keydown', window._sdrDrawKeyHandler);
}

window._sdrCloseDrawMode = function() {
  _sdrCancelCurrentDraw();
  // Limpa modo de edição
  _sdrEditMode = null;
  _sdrMoveSelected = null;
  if (_sdrMoveSelMarker) { try { sdrMap.removeLayer(_sdrMoveSelMarker); } catch(e){} _sdrMoveSelMarker = null; }
  // Limpa medida
  if (_sdrMeasureLine) { try { sdrMap.removeLayer(_sdrMeasureLine); } catch(e){} _sdrMeasureLine = null; }
  if (_sdrMeasurePop)  { try { sdrMap.closePopup(_sdrMeasurePop); } catch(e){} _sdrMeasurePop = null; }
  _sdrMeasurePts = [];
  // Remove listeners de edição
  if (sdrMap) {
    sdrMap.off('click', _sdrMoveModeClick);
    sdrMap.off('click', _sdrDeleteModeClick);
    sdrMap.off('click', _sdrMeasureClick);
  }
  // Remove teclado
  if (window._sdrDrawKeyHandler) {
    document.removeEventListener('keydown', window._sdrDrawKeyHandler);
    window._sdrDrawKeyHandler = null;
  }
  const panel = document.getElementById('sdr-draw-panel');
  if (panel) panel.remove();
  const btn = document.getElementById('btn-draw-mode');
  if (btn) { btn.style.background = ''; btn.innerHTML = '<i class="fas fa-pencil-alt"></i> Desenhar'; }
  sdrDrawModeActive = false;
  _sdrDrawCurrentMode = null;
  if (sdrMap) sdrMap.getContainer().style.cursor = '';
};


window._sdrToggleSnap = function() {
  _sdrSnapEnabled = !_sdrSnapEnabled;
  var tog = document.getElementById('snap-tog');
  var thm = document.getElementById('snap-thm');
  if (tog)  tog.style.background  = _sdrSnapEnabled ? '#2563eb' : '#334155';
  if (thm)  { thm.style.background = _sdrSnapEnabled ? '#fff' : '#64748b'; thm.style.left = _sdrSnapEnabled ? '16px' : '2px'; }
  toast(_sdrSnapEnabled ? '🧲 Snap ativo' : 'Snap desativado', 'info');
};

// Desfaz o último ponto
window._sdrUndoPt = function() {
  if (!_sdrDrawPts.length) return;
  _sdrDrawPts.pop();
  var m = _sdrTmpMkrs.pop();
  if (m) { try { sdrMap.removeLayer(m); } catch(e){} }
  if (_sdrPolyPrev) { try { sdrMap.removeLayer(_sdrPolyPrev); } catch(e){} _sdrPolyPrev = null; }
  if (_sdrPolyArea) { try { sdrMap.removeLayer(_sdrPolyArea); } catch(e){} _sdrPolyArea = null; }
  if (_sdrDrawCurrentMode === 'cable' && _sdrDrawPts.length >= 2) {
    _sdrPolyPrev = L.polyline(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#0ea5e9',weight:3,dashArray:'8,4',opacity:.85}).addTo(sdrMap);
  }
  if (_sdrDrawCurrentMode === 'area' && _sdrDrawPts.length >= 2) {
    _sdrPolyArea = L.polygon(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#059669',fillColor:'#059669',fillOpacity:.15,weight:2,dashArray:'6,3'}).addTo(sdrMap);
  }
  _sdrUpdateDrawStats();
  toast('Ponto removido', 'info');
};

// Finaliza o desenho atual
window._sdrFinalizeDraw = function() {
  if (_sdrDrawCurrentMode === 'measure') { _sdrMeasureReset(); return; }
  if (_sdrDrawCurrentMode && _sdrDrawPts.length >= 2) {
    _sdrFinalizeDrawing(_sdrDrawPts.slice());
  } else if (_sdrDrawPts.length < 2) {
    toast('Adicione pelo menos 2 pontos para finalizar', 'warning');
  }
};

// Atualiza contador de pontos e distância no painel
function _sdrUpdateDrawStats() {
  var cnt   = document.getElementById('dp-count');
  var dist  = document.getElementById('dp-dist');
  var stats = document.getElementById('sdr-draw-stats');
  if (cnt) cnt.textContent = _sdrDrawPts.length;
  if (_sdrDrawPts.length >= 2) {
    var total = 0;
    for (var i = 1; i < _sdrDrawPts.length; i++) total += _haversineM(_sdrDrawPts[i-1], _sdrDrawPts[i]);
    if (dist)  dist.textContent  = (total/1000).toFixed(2);
    if (stats) stats.style.display = 'flex';
  } else {
    if (stats) stats.style.display = 'none';
  }
}

// Ferramenta MEDIR — clique acumula pontos e mostra distância
function _sdrMeasureClick(e) {
  L.DomEvent.stop(e);
  var snapped = _sdrSnapToNearest(e.latlng.lat, e.latlng.lng);
  var lat = snapped.lat, lng = snapped.lng;
  _sdrMeasurePts.push({lat:lat, lng:lng});
  var m = L.circleMarker([lat,lng], {radius:5,color:'#f59e0b',fillColor:'#f59e0b',fillOpacity:1,weight:2}).addTo(sdrMap);
  _sdrTmpMkrs.push(m);
  if (_sdrMeasurePts.length >= 2) {
    if (_sdrMeasureLine) sdrMap.removeLayer(_sdrMeasureLine);
    _sdrMeasureLine = L.polyline(_sdrMeasurePts.map(function(p){return [p.lat,p.lng];}), {color:'#f59e0b',weight:2,dashArray:'6,3',opacity:.9}).addTo(sdrMap);
    var total = 0;
    for (var i=1;i<_sdrMeasurePts.length;i++) total += _haversineM(_sdrMeasurePts[i-1], _sdrMeasurePts[i]);
    var midIdx = Math.floor((_sdrMeasurePts.length-1)/2);
    var midPt  = _sdrMeasurePts[midIdx];
    if (_sdrMeasurePop) sdrMap.closePopup(_sdrMeasurePop);
    _sdrMeasurePop = L.popup({closeOnClick:false, autoClose:false, className:'sdr-measure-pop'})
      .setLatLng([midPt.lat, midPt.lng])
      .setContent('<div style="font-size:.9rem;font-weight:700;color:#f59e0b">'
        + (total < 1000 ? Math.round(total)+'m' : (total/1000).toFixed(2)+'km') + '</div>'
        + '<div style="font-size:.7rem;color:#94a3b8">' + _sdrMeasurePts.length + ' pontos</div>')
      .openOn(sdrMap);
    // Atualiza hint
    var hint = document.getElementById('sdr-draw-hint');
    if (hint) hint.innerHTML = '<i class="fas fa-ruler-combined" style="color:#f59e0b"></i> <b>'
      + (total < 1000 ? Math.round(total)+'m' : (total/1000).toFixed(2)+'km') + '</b> · clique para mais pontos';
  }
}

function _sdrMeasureReset() {
  _sdrMeasurePts = [];
  _sdrTmpMkrs.forEach(function(m){ try{ sdrMap.removeLayer(m); }catch(e){} });
  _sdrTmpMkrs = [];
  if (_sdrMeasureLine) { try{ sdrMap.removeLayer(_sdrMeasureLine); }catch(e){} _sdrMeasureLine = null; }
  if (_sdrMeasurePop)  { try{ sdrMap.closePopup(_sdrMeasurePop); }catch(e){} _sdrMeasurePop = null; }
  var hint = document.getElementById('sdr-draw-hint');
  if (hint) hint.innerHTML = '<i class="fas fa-ruler-combined" style="color:#f59e0b"></i> <b>Clique</b> para medir distâncias.';
  toast('Medição zerada', 'info');
}

// Modo MOVER — 1º clique seleciona, 2º clique move
function _sdrMoveModeClick(e) {
  L.DomEvent.stop(e);
  var lat = e.latlng.lat, lng = e.latlng.lng;
  if (!_sdrMoveSelected) {
    // Seleciona elemento mais próximo
    var bestId = null, bestItem = null, bestDist2 = Infinity;
    Object.entries(sdrInfraCache).forEach(function(kv) {
      var item = kv[1];
      if (!item || !item.lat || !item.lng) return;
      var d = _haversineM({lat:lat,lng:lng}, {lat:item.lat,lng:item.lng});
      if (d < bestDist2) { bestDist2=d; bestId=kv[0]; bestItem=item; }
    });
    if (!bestId || bestDist2 > 80) { toast('Nenhum elemento próximo. Clique mais perto de um elemento.', 'warning'); return; }
    _sdrMoveSelected = {id:bestId, item:bestItem};
    if (_sdrMoveSelMarker) try{ sdrMap.removeLayer(_sdrMoveSelMarker); }catch(e){}
    _sdrMoveSelMarker = L.circleMarker([bestItem.lat,bestItem.lng], {radius:14,color:'#06b6d4',fillOpacity:0,weight:3,dashArray:'5,3'}).addTo(sdrMap);
    var hint = document.getElementById('sdr-draw-hint');
    if (hint) { hint.style.display='block'; hint.innerHTML='<i class="fas fa-arrows-alt" style="color:#06b6d4"></i> <b>'+(bestItem.name||bestItem.nome||bestId)+'</b> selecionado — clique no novo local.'; }
    toast('Selecionado: ' + (bestItem.name||bestItem.nome||bestId), 'info');
  } else {
    // Move para nova posição
    var snapped2 = _sdrSnapToNearest(lat, lng);
    var newLat = snapped2.lat, newLng = snapped2.lng;
    var id = _sdrMoveSelected.id;
    var itm = _sdrMoveSelected.item;
    sdrRef('infrastructure/' + id).update({lat:newLat, lng:newLng, updated_at:new Date().toISOString()}).then(function(){
      toast((itm.name||itm.nome||id) + ' movido!', 'success');
      if (_sdrMoveSelMarker) { try{ sdrMap.removeLayer(_sdrMoveSelMarker); }catch(e){} _sdrMoveSelMarker=null; }
      _sdrMoveSelected = null;
      var hint = document.getElementById('sdr-draw-hint');
      if (hint) { hint.innerHTML='<i class="fas fa-arrows-alt" style="color:#06b6d4"></i> Clique em outro elemento para mover.'; }
      sdrMapReloadData();
    }).catch(function(err){ toast('Erro: ' + err.message, 'error'); });
  }
}

// Modo DELETAR — clique no elemento o deleta
function _sdrDeleteModeClick(e) {
  L.DomEvent.stop(e);
  var lat = e.latlng.lat, lng = e.latlng.lng;
  var bestId = null, bestItem = null, bestDist3 = Infinity;
  Object.entries(sdrInfraCache).forEach(function(kv) {
    var item = kv[1];
    if (!item || !item.lat || !item.lng) return;
    var d = _haversineM({lat:lat,lng:lng},{lat:item.lat,lng:item.lng});
    if (d < bestDist3) { bestDist3=d; bestId=kv[0]; bestItem=item; }
  });
  if (!bestId || bestDist3 > 80) { toast('Nenhum elemento próximo.', 'warning'); return; }
  var nome = bestItem.name || bestItem.nome || bestId;
  if (!confirm('Deletar "' + nome + '"?\n\nEsta ação não pode ser desfeita.')) return;
  sdrRef('infrastructure/' + bestId).remove().then(function(){
    delete sdrInfraCache[bestId];
    toast('"' + nome + '" deletado', 'success');
    sdrMapReloadData();
  }).catch(function(err){ toast('Erro: ' + err.message, 'error'); });
}

// Ativa modo de edição (mover / deletar)
window._sdrStartEditMode = function(mode) {
  _sdrCancelCurrentDraw();
  _sdrDrawCurrentMode = null;
  _sdrEditMode = mode;
  _sdrMoveSelected = null;
  // Destaca botão
  document.querySelectorAll('.sdr-dbt').forEach(function(b){ b.classList.remove('active'); });
  var dbt = document.getElementById('dbt-' + mode);
  if (dbt) dbt.classList.add('active');
  if (sdrMap) {
    sdrMap.off('click', _sdrOnDrawClick);
    sdrMap.off('click', _sdrMoveModeClick);
    sdrMap.off('click', _sdrDeleteModeClick);
    sdrMap.off('click', _sdrMeasureClick);
    sdrMap.getContainer().style.cursor = mode === 'delete' ? 'crosshair' : 'move';
    if (mode === 'move')   sdrMap.on('click', _sdrMoveModeClick);
    if (mode === 'delete') sdrMap.on('click', _sdrDeleteModeClick);
  }
  var hint = document.getElementById('sdr-draw-hint');
  if (hint) {
    hint.style.display = 'block';
    hint.innerHTML = mode === 'move'
      ? '<i class="fas fa-arrows-alt" style="color:#06b6d4"></i> 1º clique: selecionar. 2º clique: mover para o novo local.'
      : '<i class="fas fa-trash-alt" style="color:#ef4444"></i> Clique em um elemento do mapa para deletá-lo.';
  }
  toast('Modo ' + (mode === 'move' ? 'Mover' : 'Deletar') + ' ativo', 'info');
};

window._sdrStartDraw = function(mode) {
  _sdrCancelCurrentDraw();
  _sdrDrawCurrentMode = mode;
  sdrDrawModeActive = true;
  if (!sdrMap) return;
  const hints = {
    cable: '<b>Cabo:</b> Clique para adicionar pontos. <b>Duplo-clique</b> para finalizar (mín. 2 pts).',
    cto:   '<b>CTO:</b> Clique no mapa para posicionar o splitter.',
    area:  '<b>Área:</b> Clique para criar os vértices. <b>Duplo-clique</b> para fechar o polígono.'
  };
  const hint = document.getElementById('sdr-draw-hint');
  if (hint) hint.innerHTML = hints[mode] || '';
  sdrMap.getContainer().style.cursor = 'crosshair';
  sdrMap.off('click', _sdrOnDrawClick);
  sdrMap.off('dblclick', _sdrOnDrawDblClick);
  sdrMap.on('click', _sdrOnDrawClick);
  if (mode !== 'cto') { sdrMap.on('dblclick', _sdrOnDrawDblClick); sdrMap.doubleClickZoom.disable(); }
  const labels = { cable: 'Cabo', cto: 'CTO', area: 'Área' };
  toast('Ferramenta ' + (labels[mode] || mode) + ' ativa. Clique no mapa.', 'info');
};


function _sdrOnDrawClick(e) {
  if (!_sdrDrawCurrentMode) return;
  // Se modo de captura de coordenadas está ativo, deixa ele tratar primeiro
  if (_sdrMapClickMode) return;
  L.DomEvent.stop(e);
  var lat = e.latlng.lat, lng = e.latlng.lng;
  if (_sdrDrawCurrentMode === 'cto') { _sdrFinalizeDrawing([{lat:lat, lng:lng}]); return; }
  _sdrDrawPts.push({lat:lat, lng:lng});
  var fillColor = _sdrDrawCurrentMode === 'cable' ? '#0ea5e9' : '#059669';
  var m = L.circleMarker([lat, lng], {radius:5, color:'#fff', fillColor:fillColor, fillOpacity:1, weight:2}).addTo(sdrMap);
  _sdrTmpMkrs.push(m);
  if (_sdrDrawCurrentMode === 'cable' && _sdrDrawPts.length >= 2) {
    if (_sdrPolyPrev) sdrMap.removeLayer(_sdrPolyPrev);
    _sdrPolyPrev = L.polyline(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#0ea5e9',weight:3,dashArray:'8,4',opacity:.85}).addTo(sdrMap);
  }
  if (_sdrDrawCurrentMode === 'area' && _sdrDrawPts.length >= 2) {
    if (_sdrPolyArea) sdrMap.removeLayer(_sdrPolyArea);
    _sdrPolyArea = L.polygon(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#059669',fillColor:'#059669',fillOpacity:.15,weight:2,dashArray:'6,3'}).addTo(sdrMap);
  }
}

function _sdrOnDrawDblClick(e) {
  L.DomEvent.stop(e);
  if (_sdrDrawPts.length < 2) { toast('Adicione pelo menos 2 pontos para finalizar', 'warning'); return; }
  _sdrFinalizeDrawing(_sdrDrawPts.slice());
}

function _sdrCancelCurrentDraw() {
  _sdrTmpMkrs.forEach(function(m){ try{ if(sdrMap) sdrMap.removeLayer(m); }catch(e){} });
  _sdrTmpMkrs = [];
  if (_sdrPolyPrev) { try{ if(sdrMap) sdrMap.removeLayer(_sdrPolyPrev); }catch(e){} _sdrPolyPrev = null; }
  if (_sdrPolyArea) { try{ if(sdrMap) sdrMap.removeLayer(_sdrPolyArea); }catch(e){} _sdrPolyArea = null; }
  _sdrDrawPts = [];
  if (sdrMap) {
    sdrMap.off('click', _sdrOnDrawClick);
    sdrMap.off('dblclick', _sdrOnDrawDblClick);
    sdrMap.doubleClickZoom.enable();
  }
}

function _sdrFinalizeDrawing(pts) {
  _sdrCancelCurrentDraw();
  var mode = _sdrDrawCurrentMode;
  _sdrDrawCurrentMode = null;
  window._sdrPendingDrawPoints = pts;
  _sdrShowPropertiesModal(mode, pts);
}

function _sdrShowPropertiesModal(type, pts) {
  var existing = document.getElementById('sdr-props-modal');
  if (existing) existing.remove();
  var lbl = 'display:block;margin:.75rem 0 .3rem;font-size:.77rem;color:#94a3b8';
  var inp = 'width:100%;padding:7px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:.82rem;box-sizing:border-box';
  var title = '', formHtml = '';
  if (type === 'cable') {
    title = '<i class="fas fa-minus" style="color:#0ea5e9"></i>&nbsp; Cabo de Fibra Óptica';
    formHtml =
      '<label style="' + lbl + '">Nome / Trecho</label>' +
      '<input id="dp-name" style="' + inp + '" placeholder="Ex: Cabo Rua das Flores - P12"/>' +
      '<label style="' + lbl + '">Quantidade de Fibras</label>' +
      '<select id="dp-fibers" style="' + inp + '">' +
        '<option value="6">6 FO</option><option value="12" selected>12 FO</option>' +
        '<option value="24">24 FO</option><option value="36">36 FO</option>' +
        '<option value="48">48 FO</option><option value="72">72 FO</option>' +
        '<option value="144">144 FO</option>' +
      '</select>' +
      '<label style="' + lbl + '">Tipo de Instalação</label>' +
      '<select id="dp-install" style="' + inp + '">' +
        '<option value="aereo">Aéreo</option>' +
        '<option value="subterraneo">Subterrâneo (tracejado no mapa)</option>' +
      '</select>' +
      '<label style="' + lbl + '">OLT / GPON de Origem</label>' +
      '<input id="dp-olt" style="' + inp + '" placeholder="Ex: OLT-Centro Porta 1/1"/>' +
      '<label style="' + lbl + '">Observações</label>' +
      '<input id="dp-notes" style="' + inp + '" placeholder="Observações opcionais"/>';
  } else if (type === 'cto') {
    title = '<i class="fas fa-circle" style="color:#7c3aed"></i>&nbsp; CTO / Splitter';
    formHtml =
      '<label style="' + lbl + '">Nome da CTO</label>' +
      '<input id="dp-name" style="' + inp + '" placeholder="Ex: CTO-001"/>' +
      '<label style="' + lbl + '">Tipo de Splitter</label>' +
      '<select id="dp-cto-type" style="' + inp + '">' +
        '<option value="1x8">1:8 (8 portas)</option>' +
        '<option value="1x16">1:16 (16 portas)</option>' +
        '<option value="1x4">1:4 (4 portas)</option>' +
        '<option value="1x2">1:2 (2 portas)</option>' +
        '<option value="ceo">CEO</option>' +
        '<option value="emenda">Emenda</option>' +
      '</select>' +
      '<label style="' + lbl + '">Cabo de Entrada</label>' +
      '<input id="dp-cable-in" style="' + inp + '" placeholder="Nome do cabo de alimentação"/>' +
      '<label style="' + lbl + '">Observações</label>' +
      '<input id="dp-notes" style="' + inp + '" placeholder="Observações opcionais"/>';
  } else {
    title = '<i class="fas fa-vector-square" style="color:#059669"></i>&nbsp; Área de Cobertura';
    formHtml =
      '<label style="' + lbl + '">Nome da Área</label>' +
      '<input id="dp-name" style="' + inp + '" placeholder="Ex: Bairro Centro - GPON 1"/>' +
      '<label style="' + lbl + '">Cor no Mapa</label>' +
      '<select id="dp-color" style="' + inp + '">' +
        '<option value="#0ea5e9">Azul</option>' +
        '<option value="#059669">Verde</option>' +
        '<option value="#f59e0b">Amarelo</option>' +
        '<option value="#ef4444">Vermelho</option>' +
        '<option value="#7c3aed">Roxo</option>' +
      '</select>' +
      '<label style="' + lbl + '">Observações</label>' +
      '<input id="dp-notes" style="' + inp + '" placeholder="Descrição da área de cobertura"/>';
  }
  var modal = document.createElement('div');
  modal.id = 'sdr-props-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75)';
  modal.innerHTML =
    '<div style="background:#1e293b;color:#f1f5f9;border-radius:12px;padding:24px;width:360px;max-width:95vw;box-shadow:0 8px 40px rgba(0,0,0,.7)">' +
      '<div style="font-weight:700;font-size:.98rem;margin-bottom:2px">' + title + '</div>' +
      '<div style="font-size:.73rem;color:#64748b;margin-bottom:6px">' + pts.length + ' ponto' + (pts.length !== 1 ? 's' : '') + ' definido' + (pts.length !== 1 ? 's' : '') + ' no mapa</div>' +
      formHtml +
      '<div style="display:flex;gap:10px;margin-top:18px">' +
        '<button id="btn-dp-save" onclick="window._sdrSaveDrawing(\'' + type + '\')" ' +
          'style="flex:1;background:#16a34a;color:#fff;border:none;padding:10px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.87rem">' +
          '<i class="fas fa-save"></i> Salvar no Mapa' +
        '</button>' +
        '<button onclick="document.getElementById(\'sdr-props-modal\').remove()" ' +
          'style="background:#475569;color:#fff;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:.9rem">✕</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

window._sdrSaveDrawing = async function(type) {
  var pts = window._sdrPendingDrawPoints || [];
  var name  = (document.getElementById('dp-name')  || {}).value || '';
  var notes = (document.getElementById('dp-notes') || {}).value || '';
  name = name.trim(); notes = notes.trim();
  var btn = document.getElementById('btn-dp-save');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }
  var now = new Date().toISOString();
  var data = { created_at: now };
  if (name)  data.name  = name;
  if (notes) data.notes = notes;
  if (type === 'cable') {
    var fibers  = parseInt((document.getElementById('dp-fibers')  || {}).value || '12');
    var install = (document.getElementById('dp-install') || {}).value || 'aereo';
    var olt     = ((document.getElementById('dp-olt') || {}).value || '').trim();
    data.type = 'cable'; data.route = pts; data.fiber_count = fibers;
    data.installation = install; data.cable_type = install;
    if (olt) data.olt_origin = olt;
  } else if (type === 'cto') {
    var ctoType  = (document.getElementById('dp-cto-type')  || {}).value || '1x8';
    var cableIn  = ((document.getElementById('dp-cable-in') || {}).value || '').trim();
    var portMap  = {'1x8':8,'1x16':16,'1x4':4,'1x2':2,'ceo':12,'emenda':0};
    data.type = 'cto'; data.lat = pts[0].lat; data.lng = pts[0].lng;
    data.cto_type = ctoType; data.total_ports = portMap[ctoType] || 8; data.used_ports = 0;
    if (cableIn) data.cable_input = cableIn;
  } else {
    var color = (document.getElementById('dp-color') || {}).value || '#0ea5e9';
    data.type = 'coverage_area'; data.polygon = pts; data.color = color;
  }
  try {
    await sdrRef('infrastructure').push(data);
    var m = document.getElementById('sdr-props-modal');
    if (m) m.remove();
    window._sdrPendingDrawPoints = null;
    toast('Salvo com sucesso!', 'success');
    if (typeof sdrMapReloadData === 'function') sdrMapReloadData();
  } catch(e) {
    console.error('[SDR Draw]', e);
    toast('Erro ao salvar: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar no Mapa'; }
  }
};
// ════════════════════════════════════════════════════════════════
window._sdrKMZFeatures = [];

// ── Cores ABNT de fibra ──
// Cores de fibra dinâmicas pelo padrão selecionado
function _fiberColors() { return SDR_FIBER_STANDARDS[sdrFiberStandard].fibers.map(f=>f.color); }
function _fiberNames()  { return SDR_FIBER_STANDARDS[sdrFiberStandard].fibers.map(f=>f.name); }
function _tubeColors(numTubes)  {
  numTubes = numTubes || 12;
  const result = [];
  for (let i = 1; i <= numTubes; i++) {
    const tc = _getTubeColor(i);
    result.push(tc.color);
  }
  return result;
}
// Alias para compatibilidade
const FIBER_COLORS_ABNT = null; // DEPRECATED - usar _fiberColors()
const FIBER_NAMES_ABNT  = null; // DEPRECATED - usar _fiberNames()

// ── Estilos de cabo por tipo ──
const CABLE_RENDER = {
  backbone:     { color:'#1d4ed8', weight:5 },
  distribuicao: { color:'#16a34a', weight:4 },
  drop:         { color:'#f59e0b', weight:3 },
  projeto:      { color:'#06b6d4', weight:3 },
  unknown:      { color:'#8b5cf6', weight:3 }
};

// Cor por contagem de fibras (padrão empresa)
const CABLE_FIBER_COLOR = {
  6:   { color:'#2563eb', weight:3, label:'6FO'   },   // azul
  12:  { color:'#16a34a', weight:4, label:'12FO'  },   // verde
  24:  { color:'#eab308', weight:4, label:'24FO'  },   // amarelo
  36:  { color:'#f97316', weight:5, label:'36FO'  },   // laranja
  48:  { color:'#ec4899', weight:5, label:'48FO'  },   // rosa
  72:  { color:'#dc2626', weight:5, label:'72FO'  },   // vermelho
  144: { color:'#8b5cf6', weight:6, label:'144FO' }    // violeta
};

// ── Padrão de cores da empresa (doc: padrao cores.docx) ──
// CABOS: verde=12FO, azul=6FO, amarelo=24FO, laranja=36FO, rosa=48FO, vermelho=72FO, violeta=144FO, aqua=projeto
const SDR_CABLE_COLOR_MAP = [
  { hex:['#00ff00','#008000','#00aa00','#00cc00','#006400','#22c55e'], cabo:'distribuicao', fibers:12, label:'Distribuição 12FO' },
  { hex:['#0000ff','#0000cc','#0000aa','#1e40af','#1d4ed8','#3b82f6'], cabo:'distribuicao', fibers:6,  label:'Distribuição 6FO'  },
  { hex:['#ffff00','#ffd700','#f0e000','#ffe000','#eab308'],           cabo:'distribuicao', fibers:24, label:'Distribuição 24FO' },
  { hex:['#ff8000','#ff7f00','#ff6600','#ff4500','#f97316'],           cabo:'backbone',     fibers:36, label:'Backbone 36FO'     },
  { hex:['#ff69b4','#ff1493','#ff00ff','#ee00cc','#ec4899'],           cabo:'backbone',     fibers:48, label:'Backbone 48FO'     },
  { hex:['#ff0000','#cc0000','#dd0000','#ee0000','#ef4444'],           cabo:'backbone',     fibers:72, label:'Backbone 72FO'     },
  { hex:['#9400d3','#8b008b','#7b00c3','#aa00dd','#a855f7'],           cabo:'backbone',     fibers:144,label:'Backbone 144FO'    },
  { hex:['#00ffff','#00cccc','#00aaaa','#22d3ee','#06b6d4'],           cabo:'projeto',      fibers:0,  label:'Projeto'          }
];

// CTOS: preto=1/16, branco=1/8, marrom=1/4, amarelo=com splitter, vermelho=não instalada, laranja=emenda, azul=CEO
const SDR_CTO_COLOR_MAP = [
  { hex:['#000000','#111111','#222222','#0a0a0a','#1a1a1a'], cto_type:'1/16',          ports:16, label:'CTO 1/16'        },
  { hex:['#ffffff','#eeeeee','#f0f0f0','#dddddd','#f5f5f5'], cto_type:'1/8',           ports:8,  label:'CTO 1/8'         },
  { hex:['#8b4513','#6b3410','#7b3d1e','#a0522d','#92400e'], cto_type:'1/4',           ports:4,  label:'CTO 1/4'         },
  { hex:['#ffff00','#ffd700','#f0e000','#eab308'],            cto_type:'splitter',      ports:8,  label:'CTO c/ Splitter' },
  { hex:['#ff0000','#cc0000','#dd0000','#ef4444'],            cto_type:'nao_instalada', ports:16, label:'Não Instalada'   },
  { hex:['#ff8000','#ff7f00','#ff6600','#f97316'],            cto_type:'emenda',        ports:0,  label:'CTO Emenda'      },
  { hex:['#0000ff','#0000cc','#1d4ed8','#2563eb','#3b82f6'],  cto_type:'ceo',           ports:16, label:'CEO'             },
  { hex:['#00ff00','#00cc00','#22c55e','#10b981','#16a34a','#4ade80'], cto_type:'rt', ports:0,  label:'RT (Reserva)'    }
];

// Ícones das CTOs por subtipo
const SDR_CTO_ICONS = {
  '1/16':          { bg:'#000000', fg:'#ffffff', label:'1:16', icon:'fa-box' },
  '1/8':           { bg:'#1e40af', fg:'#ffffff', label:'1:8',  icon:'fa-box' },
  '1/4':           { bg:'#7c3aed', fg:'#ffffff', label:'1:4',  icon:'fa-box' },
  'splitter':      { bg:'#0891b2', fg:'#ffffff', label:'SPL',  icon:'fa-code-branch' },
  'nao_instalada': { bg:'#ef4444', fg:'#ffffff', label:'N/I',  icon:'fa-times-circle' },
  'emenda':        { bg:'#f97316', fg:'#ffffff', label:'EMD',  icon:'fa-link' },
  'ceo':           { bg:'#2563eb', fg:'#ffffff', label:'CEO',  icon:'fa-project-diagram' },
  'rt':            { bg:'#10b981', fg:'#ffffff', label:'RT',   icon:'fa-exchange-alt' },
  'default':       { bg:'#2563eb', fg:'#ffffff', label:'CTO',  icon:'fa-box' }
};

// Correspondência de cor por distância euclidiana RGB
function _matchKMZColor(hexColor, colorMap) {
  if (!hexColor || hexColor.length < 7) return null;
  const r1=parseInt(hexColor.slice(1,3),16), g1=parseInt(hexColor.slice(3,5),16), b1=parseInt(hexColor.slice(5,7),16);
  let best=null, bestDist=Infinity;
  for (const entry of colorMap) {
    for (const ref of entry.hex) {
      const r2=parseInt(ref.slice(1,3),16), g2=parseInt(ref.slice(3,5),16), b2=parseInt(ref.slice(5,7),16);
      const d=Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);
      if (d<bestDist) { bestDist=d; best=entry; }
    }
  }
  return bestDist < 90 ? best : null;
}

function _fmtDist(m) { return m>=1000?(m/1000).toFixed(2)+'km':m+'m'; }

function _haversineM(a,b) {
  const R=6371000,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;
  const s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
}

// ── Renderização do mapa (Sprint 5 sobrescreve) ──

// ── Power Budget + Viabilidade (branch main) ─────────────────────────────
window.sdrPowerBudgetCalc = function(itemId, oltBudgetDb) {
  const budget = oltBudgetDb || SDR_OLT_BUDGET.default;
  const path = _sdrTracePath(itemId);
  let totalLoss = SDR_PERDAS.conector_par;
  const detail = [{ label:'Conectores OLT+ONU (par)', loss: SDR_PERDAS.conector_par }];

  path.forEach(({ id, item }, idx) => {
    if (!item) return;
    // Splitter: usa ratio definido no item
    if ((item.type==='splitter'||item.type==='cto') && item.ratio) {
      const loss = SDR_PERDAS.splitter[item.ratio] || 0;
      if (loss > 0) {
        totalLoss += loss;
        detail.push({ label:`Splitter ${item.ratio} — ${item.nome||item.name||id}`, loss });
      }
    }
    // Cabo com comprimento real
    if (item.type==='cable' && item.length_m) {
      const loss = +(( item.length_m / 1000) * SDR_PERDAS.cabo_db_km).toFixed(2);
      totalLoss += loss;
      detail.push({ label:`Cabo ${item.name||id} (${Math.round(item.length_m)}m)`, loss });
      return;
    }
    // Estimativa pelo gap geográfico para o próximo elemento
    if (item.lat && item.lng && idx < path.length - 1) {
      const nxt = path[idx+1]?.item;
      if (nxt?.lat && nxt?.lng) {
        const dm = _haversineM({lat:item.lat,lng:item.lng},{lat:nxt.lat,lng:nxt.lng});
        if (dm > 20) {
          const loss = +((dm/1000)*SDR_PERDAS.cabo_db_km).toFixed(2);
          totalLoss += loss;
          detail.push({ label:`Cabo estimado ~${Math.round(dm)}m`, loss });
        }
      }
    }
  });

  const margem = +(budget - totalLoss).toFixed(2);
  const status = margem < 0 ? 'crit' : margem < SDR_PERDAS.margem_min ? 'warn' : 'ok';
  return { totalLoss:+totalLoss.toFixed(2), margem, budget, status, detail, hops:path.length };
};

// ════════════════════════════════════════════════════
// MODAL DE PORTAS DA CTO — click na CTO no mapa
// ════════════════════════════════════════════════════

window.sdrViabilidadeToggle = function() {
  _sdrViabMode = !_sdrViabMode;
  const btn = document.getElementById('btn-viabilidade');
  if (btn) {
    btn.style.background = _sdrViabMode ? '#16a34a' : '';
    btn.style.color      = _sdrViabMode ? '#fff'    : '';
    btn.style.borderColor= _sdrViabMode ? '#15803d' : '';
  }
  if (sdrMap) sdrMap.getContainer().style.cursor = _sdrViabMode ? 'crosshair' : '';
  if (!_sdrViabMode && _sdrViabMarker) { sdrMap.removeLayer(_sdrViabMarker); _sdrViabMarker=null; }
  const ex = document.getElementById('viab-modal-ov');
  if (!_sdrViabMode && ex) ex.remove();
  toast(_sdrViabMode ? '📍 Clique no mapa para verificar viabilidade' : 'Modo viabilidade desativado', 'info');
};

window.sdrViabilidadeCheck = function(lat, lng, radiusM) {
  radiusM = radiusM || 500;
  const results = [];
  Object.entries(sdrInfraCache).forEach(([id,item]) => {
    if (!item || !item.lat || !item.lng) return;
    if (item.type!=='cto' && item.type!=='splitter') return;
    const dist = Math.round(_haversineM({lat,lng},{lat:item.lat,lng:item.lng}));
    if (dist > radiusM) return;
    const cap    = parseInt(item.total_ports)||0;
    const used   = parseInt(item.used_ports)||0;
    const livres = Math.max(0, cap-used);
    const pct    = cap>0 ? Math.round((used/cap)*100) : 0;
    const pb     = sdrPowerBudgetCalc(id);
    results.push({id,item,dist,cap,used,livres,pct,pb});
  });
  // Ranking: prioriza portas livres + sinal OK + distância curta
  results.sort((a,b) => {
    const s = r => (r.livres>0?0:2) + (r.pb.status==='ok'?0:r.pb.status==='warn'?.5:1) + (r.dist/500);
    return s(a)-s(b);
  });
  _sdrViabModal(lat, lng, results.slice(0,12), radiusM);
};

window.sdrMapRenderInfra = function() {
  sdrLayers.poles.clearLayers();
  sdrLayers.ctos.clearLayers();
  sdrLayers.cables.clearLayers();
  if (sdrLayers.areas) sdrLayers.areas.clearLayers();

  Object.entries(sdrInfraCache).forEach(([id,item]) => {
    if (!item) return;

    // CABOS — cor por contagem de fibra (padrão da empresa)
    if (item.type==='cable' && item.route && item.route.length>=2) {
      let ctype=item.cable_type||'unknown', fibers=item.fiber_count;
      if (item.kmz_color) {
        const m=_matchKMZColor(item.kmz_color,SDR_CABLE_COLOR_MAP);
        if (m) { ctype=m.cabo; if(!fibers) fibers=m.fibers; }
      }
      // Prioridade: cor pela fibra > cor pelo tipo > fallback
      const fiberStyle=fibers && CABLE_FIBER_COLOR[fibers];
      const typeStyle=CABLE_RENDER[ctype]||CABLE_RENDER.unknown;
      const color=ctype==='projeto'?'#06b6d4':(fiberStyle?fiberStyle.color:typeStyle.color);
      const weight=fiberStyle?fiberStyle.weight:typeStyle.weight;
      const dash=item.installation==='subterraneo'?'10,5':null;
      const line=L.polyline(item.route.map(p=>[p.lat,p.lng]),{color,weight,opacity:0.95,dashArray:dash});
      line.bindTooltip(`<b>${item.name||'Cabo'}</b><br>${fibers||'?'}FO • ${ctype} • ${item.installation==='subterraneo'?'Subterrâneo':'Aéreo'}${item.length_m?' • '+_fmtDist(item.length_m):''}`,{sticky:true});
      line.on('click',()=>sdrCableDetailModal(id,{...item,cable_type:ctype,fiber_count:fibers}));
      line.on('contextmenu',(e)=>{L.DomEvent.stopPropagation(e);L.DomEvent.preventDefault(e);sdrOpenInfraPanel(id,item);});
      sdrLayers.cables.addLayer(line);
      return;
    }

    if (!item.lat||!item.lng) return;
    const type=item.type||'pole';

    // CTOS / SPLITTERS / CEO / RT
    if (type==='cto'||type==='splitter') {
      let subtype=item.cto_type||'default';
      if (!item.cto_type&&item.kmz_color) {
        const m=_matchKMZColor(item.kmz_color,SDR_CTO_COLOR_MAP);
        if (m) subtype=m.cto_type;
      }
      const ico=SDR_CTO_ICONS[subtype]||SDR_CTO_ICONS.default;
      const cap=item.total_ports||0, used=item.used_ports||0;
      const pct=cap>0?Math.round((used/cap)*100):0;
      const bgColor=pct>=90?'#dc2626':pct>=60?'#d97706':ico.bg;
      const barColor=pct>=90?'#dc2626':pct>=60?'#d97706':'#22c55e';

      // Extrair nome curto (sem prefixo repetitivo)
      const rawName=item.name||'';
      const shortName=rawName.replace(/^(CTO|CEO|RT|EMD|SPL)\s*/i,'').substring(0,18);

      // HTML do marker profissional
      let html=`<div class="cto-marker">`;
      html+=`<div class="cto-box" style="background:${bgColor}">`;
      html+=`<i class="fas ${ico.icon||'fa-box'}"></i>`;
      html+=`<span>${ico.label}</span>`;
      if(cap>0) html+=`<span style="font-size:8px;opacity:0.85;margin-left:1px">${used}/${cap}</span>`;
      html+=`</div>`;
      if(shortName) html+=`<div class="cto-name">${shortName}</div>`;
      if(cap>0) {
        html+=`<div class="cto-bar"><div class="cto-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>`;
      }
      html+=`</div>`;

      const marker=L.marker([item.lat,item.lng],{
        icon:L.divIcon({
          className:'',
          html:html,
          iconSize:[50,32],
          iconAnchor:[25,32]
        })
      });
      marker.bindTooltip(`${item.name||'CTO'} • ${ico.label}${cap>0?' • '+used+'/'+cap+' portas ('+pct+'%)':''}`,{direction:'top',offset:[0,-5]});
      marker.on('click',()=>sdrCTOPortsModal(id,{...item,cto_type:subtype}));
      marker.on('contextmenu',(e)=>{L.DomEvent.stopPropagation(e);L.DomEvent.preventDefault(e);sdrOpenInfraPanel(id,item);});
      sdrLayers.ctos.addLayer(marker);
      return;
    }

    // ÁREAS DE COBERTURA
    if (type === 'coverage_area' && item.polygon && item.polygon.length >= 3) {
      var acolor = item.color || '#0ea5e9';
      var apoly = L.polygon(item.polygon.map(function(p){return [p.lat,p.lng];}), {
        color: acolor, fillColor: acolor, fillOpacity: 0.12, weight: 2, dashArray: '6,4'
      });
      apoly.bindTooltip('<b>' + (item.name || 'Área de Cobertura') + '</b>' + (item.notes ? '<br>' + item.notes : ''), {sticky: true});
      apoly.on('contextmenu', function(e){ L.DomEvent.stopPropagation(e); L.DomEvent.preventDefault(e); sdrOpenInfraPanel(id, item); });
      if (sdrLayers.areas) sdrLayers.areas.addLayer(apoly);
      return;
    }

    // POSTES e outros
    const cfg=INFRA_TYPES[type]||INFRA_TYPES.pole;
    const marker=L.marker([item.lat,item.lng],{icon:L.divIcon({className:'leaflet-div-icon',html:`<div class="marker-icon ${cfg.iconClass}"><i class="fas ${cfg.icon}"></i></div>`,iconSize:[28,28],iconAnchor:[14,14]})});
    marker.bindTooltip(item.name||cfg.label,{direction:'top',offset:[0,-14]});
    marker.on('click',()=>sdrOpenInfraPanel(id,item));
    marker.on('contextmenu',(e)=>{L.DomEvent.stopPropagation(e);L.DomEvent.preventDefault(e);sdrOpenInfraPanel(id,item);});
    (sdrLayers[type+'s']||sdrLayers.poles).addLayer(marker);
  });
};

// ────────────────────────────────────────────────
// A. IMPORTAÇÃO KMZ / KML
// ────────────────────────────────────────────────

window.sdrImportKMZ = function() {
  document.getElementById('kmz-file-input').value='';
  document.getElementById('kmz-file-input').click();
};

window.sdrHandleKMZFile = async function(input) {
  const file=input.files[0]; if (!file) return;
  toast('Lendo arquivo...','info');
  try {
    let kmlText;
    if (file.name.toLowerCase().endsWith('.kmz')) {
      const zip=await JSZip.loadAsync(file);
      const kmlFile=zip.file('doc.kml')||zip.file(/\.kml$/i)[0];
      if (!kmlFile) throw new Error('KML não encontrado dentro do KMZ');
      kmlText=await kmlFile.async('text');
    } else { kmlText=await file.text(); }
    const features=_parseKML(kmlText);
    if (features.length===0) { toast('Nenhum elemento encontrado','error'); return; }
    window._sdrKMZFeatures=features;
    _sdrKMZPreviewModal(features,file.name);
  } catch(e) { toast('Erro: '+e.message,'error'); console.error('[KMZ]',e); }
};

function _kmlColor(kmlHex) {
  if (!kmlHex||kmlHex.length<8) return null;
  return '#'+kmlHex.slice(6,8)+kmlHex.slice(4,6)+kmlHex.slice(2,4);
}

function _parseKML(kmlText) {
  const doc=new DOMParser().parseFromString(kmlText,'text/xml');
  const features=[], styleMap={};
  doc.querySelectorAll('Style[id]').forEach(s=>{
    const id='#'+s.getAttribute('id');
    const lc=s.querySelector('LineStyle color')?.textContent?.trim();
    const ic=s.querySelector('IconStyle color')?.textContent?.trim();
    styleMap[id]={ line:lc?_kmlColor(lc):null, icon:ic?_kmlColor(ic):null };
  });
  doc.querySelectorAll('StyleMap[id]').forEach(sm=>{
    const id='#'+sm.getAttribute('id');
    const pairs=sm.querySelectorAll('Pair');
    for (const p of pairs) {
      if (p.querySelector('key')?.textContent==='normal') {
        const url=p.querySelector('styleUrl')?.textContent?.trim();
        if (url&&styleMap[url]) { styleMap[id]=styleMap[url]; break; }
      }
    }
  });

  function featureColor(pm) {
    const ref=pm.querySelector('styleUrl')?.textContent?.trim();
    if (ref&&styleMap[ref]) return styleMap[ref].line||styleMap[ref].icon;
    const lc=pm.querySelector('LineStyle color')?.textContent?.trim();
    const ic=pm.querySelector('IconStyle color')?.textContent?.trim();
    return lc?_kmlColor(lc):(ic?_kmlColor(ic):null);
  }
  function getDesc(pm) { return (pm.querySelector('description')?.textContent||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
  function getExt(pm) {
    const d={};
    pm.querySelectorAll('ExtendedData Data').forEach(el=>{ d[el.getAttribute('name')]=el.querySelector('value')?.textContent?.trim(); });
    pm.querySelectorAll('SimpleData').forEach(el=>{ d[el.getAttribute('name')]=el.textContent?.trim(); });
    return d;
  }

  doc.querySelectorAll('Placemark').forEach(pm=>{
    const name=(pm.querySelector('name')?.textContent||'').trim();
    const desc=getDesc(pm), ext=getExt(pm), color=featureColor(pm);
    const ptEl=pm.querySelector('Point > coordinates');
    if (ptEl) {
      const [lng,lat]=ptEl.textContent.trim().split(',').map(parseFloat);
      if (!isNaN(lat)&&!isNaN(lng)) features.push({type:'point',name,desc,ext,lat,lng,color});
      return;
    }
    pm.querySelectorAll('LineString > coordinates').forEach(el=>{
      const route=el.textContent.trim().split(/\s+/).map(s=>{
        const [lng,lat]=s.split(',').map(parseFloat); return {lat,lng};
      }).filter(p=>!isNaN(p.lat)&&!isNaN(p.lng));
      if (route.length>=2) features.push({type:'line',name,desc,ext,route,color});
    });
  });
  return features;
}

function _sdrKMZPreviewModal(features,filename) {
  const points=features.filter(f=>f.type==='point');
  const lines=features.filter(f=>f.type==='line');

  // Agrupa cores únicas
  const lineColors={}, pointColors={};
  lines.forEach(f=>{ if(f.color) lineColors[f.color]=(lineColors[f.color]||[]); lineColors[f.color]=(lineColors[f.color]||[]);
    if(f.color) lineColors[f.color]=(lineColors[f.color]||0)+1; });
  points.forEach(f=>{ if(f.color) pointColors[f.color]=(pointColors[f.color]||0)+1; });

  // Preview no mapa
  if (sdrKMZLayer) sdrMap.removeLayer(sdrKMZLayer);
  sdrKMZLayer=L.layerGroup().addTo(sdrMap);
  lines.forEach(f=>L.polyline(f.route.map(p=>[p.lat,p.lng]),{color:f.color||'#f59e0b',weight:2,opacity:0.8}).addTo(sdrKMZLayer));
  points.forEach(f=>L.circleMarker([f.lat,f.lng],{radius:5,color:f.color||'#f59e0b',fillColor:f.color||'#f59e0b',fillOpacity:1}).addTo(sdrKMZLayer));
  const allPts=[...points.map(f=>[f.lat,f.lng]),...lines.flatMap(f=>f.route.map(p=>[p.lat,p.lng]))];
  if (allPts.length>0) { try{sdrMap.fitBounds(L.latLngBounds(allPts).pad(0.1));}catch(e){} }

  // Monta linhas de cor para cabos
  function lineColorRows() {
    const entries=Object.entries(lineColors);
    if (!entries.length) return '';
    return `<div style="background:#f0fdf4;border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-weight:600;font-size:.88rem;color:#166534;margin-bottom:8px"><i class="fas fa-wave-square" style="margin-right:6px"></i>Cores dos Cabos (${lines.length} linhas)</div>
      ${entries.map(([c,n],i)=>{
        const match=_matchKMZColor(c,SDR_CABLE_COLOR_MAP);
        const defVal=match?(match.cabo+':'+match.fibers):'distribuicao:12';
        const defInst='aereo';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
          <div style="width:30px;height:12px;background:${c};border-radius:3px;border:1px solid #e5e7eb;flex-shrink:0"></div>
          <span style="font-size:.78rem;color:#374151;min-width:70px">${n} cabo(s)</span>
          <select id="clr-line-${i}" data-color="${c}" style="flex:1;padding:5px 7px;border:1px solid #d1d5db;border-radius:6px;font-size:.78rem">
            <option value="distribuicao:12" ${defVal==='distribuicao:12'?'selected':''}>Distribuição 12FO</option>
            <option value="distribuicao:6"  ${defVal==='distribuicao:6' ?'selected':''}>Distribuição 6FO</option>
            <option value="distribuicao:24" ${defVal==='distribuicao:24'?'selected':''}>Distribuição 24FO</option>
            <option value="backbone:36"     ${defVal==='backbone:36'    ?'selected':''}>Backbone 36FO</option>
            <option value="backbone:48"     ${defVal==='backbone:48'    ?'selected':''}>Backbone 48FO</option>
            <option value="backbone:72"     ${defVal==='backbone:72'    ?'selected':''}>Backbone 72FO</option>
            <option value="backbone:144"    ${defVal==='backbone:144'   ?'selected':''}>Backbone 144FO</option>
            <option value="projeto:0"       ${defVal==='projeto:0'      ?'selected':''}>Projeto</option>
          </select>
          <select id="clr-inst-${i}" style="padding:5px 7px;border:1px solid #d1d5db;border-radius:6px;font-size:.78rem">
            <option value="aereo">Aéreo</option><option value="subterraneo">Subterrâneo</option>
          </select>
        </div>`;
      }).join('')}
    </div>`;
  }

  function pointColorRows() {
    const entries=Object.entries(pointColors);
    if (!entries.length) return '';
    return `<div style="background:#eff6ff;border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="font-weight:600;font-size:.88rem;color:#1d4ed8;margin-bottom:8px"><i class="fas fa-map-pin" style="margin-right:6px"></i>Cores dos Pontos (${points.length} pontos)</div>
      ${entries.map(([c,n],i)=>{
        const match=_matchKMZColor(c,SDR_CTO_COLOR_MAP);
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
          <div style="width:16px;height:16px;background:${c};border-radius:50%;border:2px solid ${c==='#ffffff'?'#aaa':'#e5e7eb'};flex-shrink:0"></div>
          <span style="font-size:.78rem;color:#374151;min-width:70px">${n} ponto(s)</span>
          <select id="clr-pt-${i}" data-color="${c}" style="flex:1;padding:5px 7px;border:1px solid #d1d5db;border-radius:6px;font-size:.78rem">
            <option value="cto:1/16:16"          ${match?.cto_type==='1/16'          ?'selected':''}>CTO 1/16 (16 portas)</option>
            <option value="cto:1/8:8"            ${match?.cto_type==='1/8'           ?'selected':''}>CTO 1/8 (8 portas)</option>
            <option value="cto:1/4:4"            ${match?.cto_type==='1/4'           ?'selected':''}>CTO 1/4 (4 portas)</option>
            <option value="cto:splitter:8"       ${match?.cto_type==='splitter'       ?'selected':''}>CTO c/ Splitter</option>
            <option value="cto:nao_instalada:16" ${match?.cto_type==='nao_instalada' ?'selected':''}>Não Instalada</option>
            <option value="cto:emenda:0"         ${match?.cto_type==='emenda'         ?'selected':''}>Emenda</option>
            <option value="cto:ceo:16"           ${match?.cto_type==='ceo'            ?'selected':''}>CEO (Cx. Emenda Óptica)</option>
            <option value="cto:rt:0"             ${match?.cto_type==='rt'             ?'selected':''}>RT (Reserva de Cabo)</option>
            <option value="pole:pole:0">Poste</option>
            <option value="splitter:splitter:0">Splitter</option>
          </select>
        </div>`;
      }).join('')}
    </div>`;
  }

  const modal=document.createElement('div');
  modal.id='modal-kmz-import';
  modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:16px;width:100%;max-width:680px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="padding:16px 22px;border-bottom:1px solid #e5e7eb;background:#f8fafc;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:1rem;color:#1e293b"><i class="fas fa-file-import" style="color:#f59e0b;margin-right:8px"></i>Importar: ${filename}</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:2px"><b>${points.length}</b> pontos • <b>${lines.length}</b> cabos detectados</div>
        </div>
        <button onclick="sdrKMZCancelImport()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#64748b">✕</button>
      </div>
      <div style="padding:16px 22px;overflow-y:auto;flex:1">
        <div style="background:#fef3c7;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:.8rem;color:#92400e">
          <i class="fas fa-magic" style="margin-right:5px"></i>
          Cores detectadas automaticamente pelo padrão da empresa. Confirme o mapeamento.
        </div>
        ${lineColorRows()}
        ${pointColorRows()}
      </div>
      <div style="padding:13px 22px;border-top:1px solid #e5e7eb;background:#f8fafc;display:flex;gap:9px;justify-content:flex-end">
        <button onclick="sdrKMZCancelImport()" style="padding:8px 18px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:.85rem">Cancelar</button>
        <button onclick="sdrKMZConfirmImport()" style="padding:8px 20px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600">
          <i class="fas fa-check"></i> Importar ${features.length} elementos
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

window.sdrKMZCancelImport = function() {
  document.getElementById('modal-kmz-import')?.remove();
  if (sdrKMZLayer) { sdrMap.removeLayer(sdrKMZLayer); sdrKMZLayer=null; }
};

window.sdrKMZConfirmImport = async function() {
  const features=window._sdrKMZFeatures||[];

  // Coleta mapeamentos de linha
  const lineMap={};
  document.querySelectorAll('[id^="clr-line-"]').forEach(sel=>{
    const c=sel.dataset.color; const [ctype,fibStr]=sel.value.split(':');
    const instEl=document.getElementById('clr-inst-'+sel.id.split('-')[2]);
    lineMap[c]={cable_type:ctype,fiber_count:parseInt(fibStr)||12,installation:instEl?.value||'aereo'};
  });

  // Coleta mapeamentos de ponto
  const ptMap={};
  document.querySelectorAll('[id^="clr-pt-"]').forEach(sel=>{
    const c=sel.dataset.color; const [baseType,subType,portsStr]=sel.value.split(':');
    ptMap[c]={type:baseType,cto_type:subType,total_ports:parseInt(portsStr)||8};
  });

  document.getElementById('modal-kmz-import')?.remove();
  if (sdrKMZLayer) { sdrMap.removeLayer(sdrKMZLayer); sdrKMZLayer=null; }
  toast('Importando '+features.length+' elementos...','info');

  const updates={};
  features.forEach((f,i)=>{
    const id='kmz_'+Date.now()+'_'+i;
    if (f.type==='point') {
      const map=(f.color&&ptMap[f.color])||{type:'cto',cto_type:'default',total_ports:8};
      const rec={type:map.type,name:f.name||(INFRA_TYPES[map.type]?.label||'Item')+' '+(i+1),
        lat:f.lat,lng:f.lng,kmz_color:f.color||null,kmz_desc:f.desc||null,source:'kmz_import',created_at:Date.now()};
      if (map.type==='cto') { rec.cto_type=map.cto_type; rec.total_ports=map.total_ports; rec.used_ports=0; rec.portas={}; }
      if (f.desc) rec.kmz_desc=f.desc;
      if (Object.keys(f.ext||{}).length) rec.kmz_ext=f.ext;
      updates[id]=rec;
    } else if (f.type==='line') {
      const map=(f.color&&lineMap[f.color])||{cable_type:'distribuicao',fiber_count:12,installation:'aereo'};
      let dist=0; for(let k=1;k<f.route.length;k++) dist+=_haversineM(f.route[k-1],f.route[k]);
      updates[id]={type:'cable',cable_type:map.cable_type,installation:map.installation,fiber_count:map.fiber_count,
        name:f.name||'Cabo '+(i+1),route:f.route,length_m:Math.round(dist),kmz_color:f.color||null,
        kmz_desc:f.desc||null,source:'kmz_import',created_at:Date.now()};
    }
  });

  try {
    await sdrRef('infrastructure').update(updates);
    toast('✅ '+features.length+' elementos importados!','success');
    sdrMapReloadData();
  } catch(e) { toast('Erro: '+e.message,'error'); }
};

// ────────────────────────────────────────────────
// B. DETALHES DO CABO
// ────────────────────────────────────────────────


// ────────────────────────────────────────────────
// C. MODAL DE CLICK NA CTO / CEO / RT / SPLITTER
// ────────────────────────────────────────────────
window.sdrCTOPortsModal = function(id, item) {
  var existing = document.getElementById('sdr-cto-ports-modal');
  if (existing) existing.remove();
  // Salva referência global para o botão Detalhes poder acessar o item
  window._ctoPortsItemRef = { id: id, item: item };

  var ico = (typeof SDR_CTO_ICONS !== 'undefined' ? (SDR_CTO_ICONS[item.cto_type||'default'] || SDR_CTO_ICONS.default) : {label:'CTO', icon:'fa-box', bg:'#2563eb'});
  var cap = item.total_ports || 0;
  var used = item.used_ports || 0;
  var pct = cap > 0 ? Math.round((used / cap) * 100) : 0;
  var barColor = pct >= 90 ? '#dc2626' : pct >= 60 ? '#d97706' : '#22c55e';

  // Clientes conectados a esta CTO
  var clientesConectados = [];
  if (typeof sdrClientesCache !== 'undefined') {
    Object.entries(sdrClientesCache).forEach(function(entry) {
      var cid = entry[0], c = entry[1];
      if (c && (c.cto_id === id || c.cto === id)) clientesConectados.push({id: cid, c: c});
    });
  }

  var clientesHtml = '';
  if (clientesConectados.length > 0) {
    clientesHtml = '<div style="margin-top:12px">'
      + '<div style="font-size:.75rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Clientes (' + clientesConectados.length + ')</div>'
      + '<div style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">'
      + clientesConectados.map(function(e) {
          var status = e.c.onu_status || 'desconhecido';
          var dot = status === 'online' ? '#22c55e' : status === 'offline' ? '#dc2626' : '#94a3b8';
          return '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:#f8fafc;border-radius:6px;font-size:.8rem">'
            + '<span style="width:8px;height:8px;border-radius:50%;background:' + dot + ';flex-shrink:0"></span>'
            + '<span style="flex:1;font-weight:500">' + (e.c.name || e.id) + '</span>'
            + '<span style="color:#64748b;font-size:.72rem">' + (e.c.plan_name || '') + '</span>'
            + '</div>';
        }).join('')
      + '</div></div>';
  } else {
    clientesHtml = '<div style="color:#94a3b8;font-size:.8rem;text-align:center;padding:10px 0">Nenhum cliente vinculado</div>';
  }

  var modal = document.createElement('div');
  modal.id = 'sdr-cto-ports-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';

  modal.innerHTML = '<div style="background:#fff;border-radius:14px;width:100%;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,.25);overflow:hidden">'
    // Header
    + '<div style="padding:13px 16px;background:' + (ico.bg || '#2563eb') + ';color:#fff;display:flex;align-items:center;justify-content:space-between">'
    + '<div style="display:flex;align-items:center;gap:9px">'
    + '<i class="fas ' + (ico.icon || 'fa-box') + '" style="font-size:1.1rem;opacity:.9"></i>'
    + '<div><div style="font-weight:700;font-size:.95rem">' + (item.name || 'CTO') + '</div>'
    + '<div style="font-size:.72rem;opacity:.8">' + ico.label + (item.code ? ' · ' + item.code : '') + '</div></div>'
    + '</div>'
    + '<button onclick="document.getElementById(\'sdr-cto-ports-modal\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">&times;</button>'
    + '</div>'
    // Body
    + '<div style="padding:14px 16px">'
    // Stats portas
    + (cap > 0
      ? '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
        + '<div style="flex:1;background:#f1f5f9;border-radius:8px;padding:8px 12px;text-align:center">'
        + '<div style="font-size:1.3rem;font-weight:800;color:#1e293b">' + used + '<span style="font-size:.8rem;font-weight:500;color:#64748b">/' + cap + '</span></div>'
        + '<div style="font-size:.7rem;color:#64748b">Portas usadas</div></div>'
        + '<div style="flex:2"><div style="height:10px;background:#e2e8f0;border-radius:10px;overflow:hidden">'
        + '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:10px;transition:.3s"></div></div>'
        + '<div style="font-size:.72rem;color:#64748b;text-align:right;margin-top:3px">' + pct + '% ocupado</div>'
        + '</div></div>'
      : '<div style="color:#94a3b8;font-size:.8rem;text-align:center;padding:4px 0;margin-bottom:8px">Portas não configuradas</div>'
    )
    + clientesHtml
    + (item.notes ? '<div style="margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:8px;font-size:.78rem;color:#78350f">' + item.notes + '</div>' : '')
    + '</div>'
    // Footer
    + '<div style="padding:10px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end">'
    + '<button onclick="document.getElementById(\'sdr-cto-ports-modal\').remove()" style="padding:7px 16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font-size:.82rem">Fechar</button>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sdr-cto-ports-modal\').remove();setTimeout(function(){var r=window._ctoPortsItemRef||{};sdrOpenInfraPanel(r.id,sdrInfraCache[r.id]||r.item||{});},50);" style="padding:7px 16px;background:#0ea5e9;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.82rem"><i class="fas fa-eye"></i> Detalhes</button>'
    + '<button onclick="event.stopPropagation();document.getElementById(\'sdr-cto-ports-modal\').remove();setTimeout(function(){var r=window._ctoPortsItemRef||{};sdrInfraEdit(r.id);},50);" style="padding:7px 16px;background:var(--primary);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.82rem;font-weight:600"><i class="fas fa-edit"></i> Editar</button>'
    + '</div></div>';

  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
};

// sdrCableDetailModal — versao completa (arquivo estava truncado)
window.sdrCableDetailModal = function(id,item) {
  var tipos={backbone:'Backbone / Alimentador',distribuicao:'Distribuicao',drop:'Drop / Acesso',projeto:'Projeto'};
  var sty=(typeof CABLE_RENDER!=='undefined'?CABLE_RENDER[item.cable_type||'unknown']||CABLE_RENDER.unknown:{color:'#64748b',label:'Cabo'});
  var modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px';
  var comp = item.comprimento_m||item.length_m||'-';
  if (comp!=='-') comp = comp+'m';
  var atenu = item.atenuacao_db ? item.atenuacao_db+'dB' : '-';
  var nota = item.notes||item.kmz_desc||'';
  var notaHtml = nota ? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:.82rem;color:#78350f;margin-bottom:12px">'+nota+'</div>' : '';
  modal.innerHTML='<div style="background:#fff;border-radius:14px;width:100%;max-width:460px;box-shadow:0 10px 40px rgba(0,0,0,.25)">'
    +'<div style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">'
    +'<div style="font-weight:700;color:#1e293b"><span style="display:inline-block;width:24px;height:6px;background:'+(item.kmz_color||sty.color)+';border-radius:3px;margin-right:8px;vertical-align:middle"></span>'+(item.name||'Cabo')+'</div>'
    +'<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b">&#x2715;</button>'
    +'</div>'
    +'<div style="padding:16px 18px">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    +'<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Tipo</div><div style="font-weight:700;font-size:.88rem">'+(tipos[item.cable_type]||'Desconhecido')+'</div></div>'
    +'<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Fibras</div><div style="font-weight:700;font-size:.88rem">'+(item.fiber_count||item.fibers||'?')+' FO</div></div>'
    +'<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Comprimento</div><div style="font-weight:700;font-size:.88rem">'+comp+'</div></div>'
    +'<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Atenuacao</div><div style="font-weight:700;font-size:.88rem">'+atenu+'</div></div>'
    +'</div>'+notaHtml
    +'<div style="display:flex;gap:8px;justify-content:flex-end">'
    +'<button onclick="this.closest(\'[style*=fixed]\').remove()" class="btn-map" style="padding:6px 14px">Fechar</button>'
    +'<button onclick="this.closest(\'[style*=fixed]\').remove();sdrInfraEdit(\''+id+'\')" class="btn-map" style="padding:6px 14px;background:var(--primary);color:#fff"><i class="fas fa-pencil-alt"></i> Editar</button>'
    +'</div></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
};

// HTML DAS PAGINAS SDR
// IDs devem bater exatamente com o que as funções de render buscam via getElementById
window._sdrHtml_dash_rede = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> Dashboard de Rede</h2>'
    +'<button class="btn-map" onclick="sdrDashRedeRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'</div>'
    // stats row — sdrDashRedeRender popula com infra-stat divs
    +'<div id="dash-rede-stats" class="infra-stats-row" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">'
    +'<div style="color:var(--muted);font-size:.82rem">Carregando...</div>'
    +'</div>'
    // content area — sdrDashRedeRender insere tabelas e listas aqui
    +'<div id="dash-rede-content"></div>'
    +'</div>';
};

window._sdrHtml_clientes = function() {
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

window._sdrHtml_onus = function() {
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

window._sdrHtml_alertas = function() {
  return '<div style="max-width:900px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-bell" style="color:#d97706"></i> Alertas de Rede</h2>'
    +'<button class="btn-map" onclick="sdrCheckAlerts()" style="padding:6px 14px;font-size:.8rem;background:#d97706;color:#fff;border-color:#b45309"><i class="fas fa-search"></i> Verificar Agora</button>'
    +'<button class="btn-map" onclick="sdrAlertasRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'</div>'
    +'<div id="alertas-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_tickets = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-ticket-alt" style="color:var(--primary)"></i> Chamados de Suporte</h2>'
    // IDs corretos que _renderTicketsLista usa: tickets-filter-status, tickets-filter-priority, tickets-search
    +'<input id="tickets-search" type="text" placeholder="Buscar chamado..." oninput="sdrTicketsFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem;width:180px">'
    +'<select id="tickets-filter-status" onchange="sdrTicketsFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem">'
    +'<option value="">Todos os Status</option><option value="aberto">Abertos</option><option value="em_andamento">Em Andamento</option><option value="aguardando">Aguardando</option><option value="resolvido">Resolvidos</option>'
    +'</select>'
    +'<select id="tickets-filter-priority" onchange="sdrTicketsFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem">'
    +'<option value="">Todas as Prioridades</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option>'
    +'</select>'
    +'<button class="btn-map" onclick="sdrTicketsRender()" style="padding:6px 10px;font-size:.8rem"><i class="fas fa-sync-alt"></i></button>'
    +'<button class="btn-map" onclick="sdrTicketAdd(null)" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Novo Chamado</button>'
    +'</div>'
    +'<div id="tickets-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="tickets-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

// Filtro de clientes
window.sdrClientesFiltrar = function(q) {
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

window._sdrHtml_mk_config = function() {
  return '<div style="max-width:900px;margin:0 auto">'
    // Cabeçalho
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-plug" style="color:var(--primary)"></i> Integração MK Solutions</h2>'
    +'<span id="mk-status-badge" style="display:none;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600"></span>'
    +'</div>'

    // Card de Configuração
    +'<div class="infra-card" style="margin-bottom:20px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'
    +'<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center">'
    +'<i class="fas fa-server" style="color:#fff;font-size:.9rem"></i>'
    +'</div>'
    +'<div><div style="font-weight:600;color:#1e293b;font-size:.9rem">Servidor MK</div>'
    +'<div style="font-size:.75rem;color:#64748b">Configurações de conexão com a API</div></div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +'<div>'
    +'<label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Servidor (IP:PORTA)</label>'
    +'<input id="mk-server-url" type="text" placeholder="Ex: 192.168.1.10:8080" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" />'
    +'</div>'
    +'<div>'
    +'<label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Token do Usuário</label>'
    +'<input id="mk-token" type="text" placeholder="Token cadastrado no MK" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" />'
    +'</div>'
    +'<div>'
    +'<label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Contra-senha do Perfil</label>'
    +'<input id="mk-password" type="password" placeholder="Contra-senha do Webservice" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" />'
    +'</div>'
    +'<div>'
    +'<label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Código de Serviço</label>'
    +'<input id="mk-cd-servico" type="text" placeholder="Ex: 9999 (todos)" value="9999" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" />'
    +'</div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">'
    +'<button class="btn-map" onclick="sdrMkSaveConfig()" style="padding:8px 20px;font-size:.82rem;background:var(--primary);color:#fff"><i class="fas fa-save"></i> Salvar Configuração</button>'
    +'<button class="btn-map" onclick="sdrMkTestarConexao()" style="padding:8px 20px;font-size:.82rem"><i class="fas fa-wifi"></i> Testar Conexão</button>'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#374151;cursor:pointer;margin-left:auto">'
    +'<input id="mk-enabled" type="checkbox" style="width:16px;height:16px" /> Integração ativa'
    +'</label>'
    +'</div>'
    +'<div id="mk-test-result" style="margin-top:10px;font-size:.82rem"></div>'
    +'</div>'

    // Card Modo Demo
    +'<div class="infra-card" style="margin-bottom:20px;border-left:3px solid #f59e0b">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
    +'<i class="fas fa-flask" style="color:#f59e0b;font-size:1.1rem"></i>'
    +'<div style="font-weight:600;color:#1e293b;font-size:.9rem">Modo Demo / Simulação</div>'
    +'</div>'
    +'<p style="margin:0 0 14px;font-size:.82rem;color:#64748b">Gera a topologia FTTH completa no Firebase para testar todas as telas sem precisar do IP do MK.</p>'
    +'<button class="btn-map" onclick="sdrMkDemoTopologia()" style="padding:9px 22px;font-size:.85rem;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-color:#d97706;font-weight:600;width:100%;margin-bottom:12px">'
    +'<i class="fas fa-project-diagram"></i> Simular Topologia Completa (OLT → DGO → Splitters → CTO → ONU → Cliente)</button>'
    +'<p style="margin:0 0 8px;font-size:.75rem;color:#94a3b8">Ou simule partes individuais:</p>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn-map" onclick="sdrMkDemoOlts()" style="padding:6px 12px;font-size:.78rem"><i class="fas fa-server"></i> Só OLTs</button>'
    +'<button class="btn-map" onclick="sdrMkDemoOnus()" style="padding:6px 12px;font-size:.78rem"><i class="fas fa-router"></i> Só ONUs</button>'
    +'<button class="btn-map" onclick="sdrMkDemoClientes()" style="padding:6px 12px;font-size:.78rem"><i class="fas fa-users"></i> Só Clientes</button>'
    +'</div>'
    +'</div>'

    // Card Status Sync
    +'<div class="infra-card" style="margin-bottom:20px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'
    +'<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center">'
    +'<i class="fas fa-sync-alt" style="color:#fff;font-size:.9rem"></i>'
    +'</div>'
    +'<div><div style="font-weight:600;color:#1e293b;font-size:.9rem">Sincronização de Dados</div>'
    +'<div style="font-size:.75rem;color:#64748b">Última sync: <span id="mk-last-sync">—</span></div></div>'
    +'<button class="btn-map" onclick="sdrMkSyncAll()" style="margin-left:auto;padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Sincronizar Agora</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px" id="mk-sync-stats">'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#eff6ff"><i class="fas fa-server" style="color:#3b82f6"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-olts">—</div><div class="sdr-kpi-lbl">OLTs</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#f0fdf4"><i class="fas fa-network-wired" style="color:#10b981"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-pops">—</div><div class="sdr-kpi-lbl">POPs</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#fef3c7"><i class="fas fa-box" style="color:#f59e0b"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-ctos">—</div><div class="sdr-kpi-lbl">CTOs/NAPs</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#fdf2f8"><i class="fas fa-users" style="color:#a855f7"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-clientes">—</div><div class="sdr-kpi-lbl">Clientes</div></div>'
    +'</div>'
    +'</div>'

    // Log de Atividade
    +'<div class="infra-card">'
    +'<div style="font-weight:600;color:#1e293b;font-size:.9rem;margin-bottom:12px"><i class="fas fa-list-alt" style="color:var(--primary)"></i> Log de Atividade</div>'
    +'<div id="mk-log" style="max-height:220px;overflow-y:auto;font-size:.78rem;font-family:monospace;color:#374151;background:#f8fafc;border-radius:8px;padding:10px;line-height:1.7">'
    +'<span style="color:#94a3b8">Aguardando atividade...</span>'
    +'</div>'
    +'</div>'
    +'</div>';
};

// ---- MK: Render (carrega config salva do Firebase) ----
window.sdrMkConfigRender = function() {
  sdrRef('mk_config').once('value').then(function(snap) {
    var cfg = snap.val() || {};
    var su = document.getElementById('mk-server-url');
    var tk = document.getElementById('mk-token');
    var pw = document.getElementById('mk-password');
    var cs = document.getElementById('mk-cd-servico');
    var en = document.getElementById('mk-enabled');
    if (su) su.value = cfg.server_url || '';
    if (tk) tk.value = cfg.token || '';
    if (pw) pw.value = cfg.password || '';
    if (cs) cs.value = cfg.cd_servico || '9999';
    if (en) en.checked = !!cfg.enabled;
    _sdrMkUpdateBadge(cfg.enabled);
    _sdrMkLog('Config carregada do Firebase.');
    // Atualizar contadores se existirem dados
    _sdrMkRefreshCounts();
  }).catch(function(e) {
    _sdrMkLog('Erro ao carregar config: ' + e.message, 'error');
  });
};

// ---- MK: Salvar Configuração ----
window.sdrMkSaveConfig = function() {
  var cfg = {
    server_url: (document.getElementById('mk-server-url')||{}).value || '',
    token:      (document.getElementById('mk-token')||{}).value || '',
    password:   (document.getElementById('mk-password')||{}).value || '',
    cd_servico: (document.getElementById('mk-cd-servico')||{}).value || '9999',
    enabled:    !!(document.getElementById('mk-enabled')||{}).checked,
    updated_at: new Date().toISOString()
  };
  sdrRef('mk_config').set(cfg).then(function() {
    _sdrMkLog('✅ Configuração salva com sucesso.', 'ok');
    _sdrMkUpdateBadge(cfg.enabled);
    if (typeof Swal !== 'undefined') {
      Swal.fire({icon:'success', title:'Salvo!', text:'Configuração MK atualizada.', timer:1800, showConfirmButton:false});
    }
  }).catch(function(e) {
    _sdrMkLog('❌ Erro ao salvar: ' + e.message, 'error');
  });
};

// ── URL base das Firebase Functions (proxy MK) ──────────────────────
var _SDR_FN_BASE = 'https://us-central1-solucaoderua.cloudfunctions.net';

// ---- MK: Testar Conexão (via Firebase Functions proxy) ----
window.sdrMkTestarConexao = function() {
  var url   = (document.getElementById('mk-server-url')||{}).value || '';
  var token = (document.getElementById('mk-token')||{}).value || '';
  var pass  = (document.getElementById('mk-password')||{}).value || '';
  var res   = document.getElementById('mk-test-result');

  if (!url || !token || !pass) {
    if (res) res.innerHTML = '<span style="color:#ef4444">⚠️ Preencha servidor, token e contra-senha antes de testar.</span>';
    return;
  }

  // Salvar config temporária para o teste (precisa estar salvo no Firebase para o proxy ler)
  if (res) res.innerHTML = '<span style="color:#3b82f6"><i class="fas fa-spinner fa-spin"></i> Salvando config e testando via proxy...</span>';
  _sdrMkLog('⏳ Testando conexão via Firebase Functions proxy...');

  // Salvar config no Firebase primeiro (proxy lê de lá)
  sdrRef('mk_config').update({
    ip_porta: url,
    token:    token,
    password: pass,
    enabled:  true
  }).then(function() {
    var fnUrl = _SDR_FN_BASE + '/sdrMkTestar?tenant=default_tenant';
    return fetch(fnUrl, { signal: AbortSignal.timeout(15000) });
  })
  .then(function(r) { return r.json(); })
  .then(function(j) {
    if (j.ok && j.data && j.data.sucesso) {
      var ms = j.data.ms || 0;
      if (res) res.innerHTML = '<span style="color:#10b981">✅ Conexão OK via proxy! Latência: ' + ms + 'ms</span>';
      _sdrMkLog('✅ Autenticação MK OK via proxy. Latência: ' + ms + 'ms', 'ok');
    } else if (j.ok && j.data) {
      var raw = j.data.resposta_raw || '';
      if (res) res.innerHTML = '<span style="color:#f59e0b">⚠️ Proxy chegou ao MK mas credenciais inválidas. Resposta: ' + raw.substring(0,120) + '</span>';
      _sdrMkLog('⚠️ Proxy OK, MK recusou credenciais: ' + raw.substring(0,200), 'warn');
    } else {
      if (res) res.innerHTML = '<span style="color:#ef4444">❌ ' + (j.error || 'Erro desconhecido') + '</span>';
      _sdrMkLog('❌ Erro no proxy: ' + (j.error || JSON.stringify(j)), 'error');
    }
  })
  .catch(function(e) {
    var msg = e.name === 'TimeoutError' ? 'Timeout (proxy não respondeu em 15s)'
      : (e.message.includes('Failed to fetch') ? 'Firebase Functions não deployadas ainda — rode: firebase deploy --only functions' : e.message);
    if (res) res.innerHTML = '<span style="color:#ef4444">❌ ' + msg + '</span>';
    _sdrMkLog('❌ ' + msg, 'error');
  });
};

// ---- MK: Sincronizar Tudo (via Firebase Functions proxy) ----
window.sdrMkSyncAll = function() {
  _sdrMkLog('⏳ Iniciando sincronização completa via proxy...');
  var btn = document.querySelector('[onclick="sdrMkSyncAll()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...'; }

  sdrRef('mk_config').once('value').then(function(snap) {
    var cfg = snap.val() || {};
    if (!cfg.enabled || !cfg.ip_porta) {
      _sdrMkLog('⚠️ Integração desativada ou servidor não configurado. Configure e teste a conexão primeiro.', 'warn');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Agora'; }
      return;
    }

    // Sync paralelo: clientes + infra
    var urlClientes = _SDR_FN_BASE + '/sdrMkSyncClientes?tenant=default_tenant';
    var urlInfra    = _SDR_FN_BASE + '/sdrMkSyncInfra?tenant=default_tenant';

    _sdrMkLog('🔄 Sincronizando clientes e infraestrutura...');

    Promise.all([
      fetch(urlClientes, { signal: AbortSignal.timeout(60000) }).then(function(r){ return r.json(); }),
      fetch(urlInfra,    { signal: AbortSignal.timeout(60000) }).then(function(r){ return r.json(); })
    ]).then(function(results) {
      var rCli  = results[0];
      var rInfra = results[1];

      if (rCli.ok && rCli.data) {
        _sdrMkLog('✅ Clientes: ' + (rCli.data.sincronizados || 0) + ' sincronizados.', 'ok');
        var kc = document.getElementById('mk-count-clients');
        if (kc) kc.textContent = rCli.data.sincronizados || '0';
      } else {
        _sdrMkLog('⚠️ Clientes: ' + (rCli.error || 'sem dados'), 'warn');
      }

      if (rInfra.ok && rInfra.data) {
        _sdrMkLog('✅ Infra: ' + (rInfra.data.olts || 0) + ' OLTs, ' + (rInfra.data.ctos || 0) + ' CTOs sincronizados.', 'ok');
        var ko = document.getElementById('mk-count-olts');
        if (ko) ko.textContent = rInfra.data.olts || '0';
      } else {
        _sdrMkLog('⚠️ Infraestrutura: ' + (rInfra.error || 'sem dados'), 'warn');
      }

      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Agora'; }

      var agora = new Date().toLocaleTimeString('pt-BR');
      _sdrMkLog('✅ Sync concluído às ' + agora + '.', 'ok');
    })
    .catch(function(e) {
      var msg = e.message.includes('Failed to fetch')
        ? 'Firebase Functions não deployadas — rode: firebase deploy --only functions'
        : e.message;
      _sdrMkLog('❌ Erro no sync: ' + msg, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Agora'; }
    });
  });
};

// ---- MK: Obter conexões de um cliente (via proxy) ----
window.sdrMkGetConexao = function(cdCliente, callback) {
  var url = _SDR_FN_BASE + '/sdrMkConexoes?tenant=default_tenant&cd_cliente=' + encodeURIComponent(cdCliente);
  fetch(url, { signal: AbortSignal.timeout(10000) })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (typeof callback === 'function') callback(j.ok ? j.data : null, j.ok ? null : j.error);
    })
    .catch(function(e) {
      if (typeof callback === 'function') callback(null, e.message);
    });
};

// ---- MK: Abrir OS (via proxy) ----
window.sdrMkAbrirOS = function(params, callback) {
  var url = _SDR_FN_BASE + '/sdrMkAbrirOS?tenant=default_tenant&'
    + Object.entries(params).map(function(e){ return encodeURIComponent(e[0])+'='+encodeURIComponent(e[1]); }).join('&');
  fetch(url, { signal: AbortSignal.timeout(10000) })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (typeof callback === 'function') callback(j.ok ? j.data : null, j.ok ? null : j.error);
    })
    .catch(function(e) {
      if (typeof callback === 'function') callback(null, e.message);
    });
};

// ---- MK: Desbloquear conexão (via proxy) ----
window.sdrMkDesbloquear = function(cdConexao, callback) {
  var url = _SDR_FN_BASE + '/sdrMkDesbloquear?tenant=default_tenant&cd_conexao=' + encodeURIComponent(cdConexao);
  fetch(url, { signal: AbortSignal.timeout(10000) })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (typeof callback === 'function') callback(j.ok ? j.data : null, j.ok ? null : j.error);
    })
    .catch(function(e) {
      if (typeof callback === 'function') callback(null, e.message);
    });
};

// ---- MK: Demo — Topologia COMPLETA (OLT→DGO→Sp1→Sp2→Sp3→CTO→ONU→Cliente) ----
window.sdrMkDemoTopologia = function() {
  _sdrMkLog('⏳ Gerando topologia FTTH completa...', 'ok');
  var saves = [];
  var ts = new Date().toISOString();

  // ── OLTs ──────────────────────────────────────────────────────
  var olts = [
    {id:'olt-demo-01', name:'OLT-CENTRAL-01', model:'ZTE C320',          ip_address:'10.0.0.1', total_pon_ports:8, snmp_community:'public', is_active:true,  lat:-20.316, lng:-40.338},
    {id:'olt-demo-02', name:'OLT-FILIAL-01',  model:'Huawei MA5608T',    ip_address:'10.0.0.2', total_pon_ports:4, snmp_community:'public', is_active:true,  lat:-20.320, lng:-40.342},
  ];
  olts.forEach(function(o) {
    var id = o.id; delete o.id;
    saves.push(sdrRef('olt_connections/' + id).set(Object.assign({}, o, {source:'demo', created_at:ts})));
    o.id = id;
  });

  // ── DGOs ──────────────────────────────────────────────────────
  var dgos = [
    {id:'dgo-demo-01', type:'dgo', nome:'DGO-CENTRAL-01', olt_id:'olt-demo-01', pon_port:'1/0/1', capacidade_fibras:24, endereco:'Rua das Flores, 100'},
    {id:'dgo-demo-02', type:'dgo', nome:'DGO-FILIAL-01',  olt_id:'olt-demo-02', pon_port:'1/0/1', capacidade_fibras:12, endereco:'Av. Principal, 500'},
  ];
  dgos.forEach(function(d) {
    var id = d.id; delete d.id;
    saves.push(sdrRef('infrastructure/' + id).set(Object.assign({}, d, {source:'demo', created_at:ts})));
    d.id = id;
  });

  // ── Splitters 1º grau (1:8) ────────────────────────────────────
  var sp1list = [
    {id:'sp1-demo-01', type:'splitter', grau:1, ratio:'1:8', nome:'SP1-CENTRAL-01', parent_id:'dgo-demo-01', parent_type:'dgo', pon_port:'1/0/1'},
    {id:'sp1-demo-02', type:'splitter', grau:1, ratio:'1:8', nome:'SP1-CENTRAL-02', parent_id:'dgo-demo-01', parent_type:'dgo', pon_port:'1/0/2'},
    {id:'sp1-demo-03', type:'splitter', grau:1, ratio:'1:8', nome:'SP1-FILIAL-01',  parent_id:'dgo-demo-02', parent_type:'dgo', pon_port:'1/0/1'},
  ];
  sp1list.forEach(function(s) {
    var id = s.id; delete s.id;
    saves.push(sdrRef('infrastructure/' + id).set(Object.assign({}, s, {source:'demo', created_at:ts})));
    s.id = id;
  });

  // ── Splitters 2º grau (1:4) ────────────────────────────────────
  var sp2list = [
    {id:'sp2-demo-01', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-C01-A', parent_id:'sp1-demo-01', parent_type:'splitter'},
    {id:'sp2-demo-02', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-C01-B', parent_id:'sp1-demo-01', parent_type:'splitter'},
    {id:'sp2-demo-03', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-C02-A', parent_id:'sp1-demo-02', parent_type:'splitter'},
    {id:'sp2-demo-04', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-F01-A', parent_id:'sp1-demo-03', parent_type:'splitter'},
  ];
  sp2list.forEach(function(s) {
    var id = s.id; delete s.id;
    saves.push(sdrRef('infrastructure/' + id).set(Object.assign({}, s, {source:'demo', created_at:ts})));
    s.id = id;
  });

  // ── Splitters 3º grau (1:2) — apenas para alguns ramos ─────────
  var sp3list = [
    {id:'sp3-demo-01', type:'splitter', grau:3, ratio:'1:2', nome:'SP3-C01-A1', parent_id:'sp2-demo-01', parent_type:'splitter'},
    {id:'sp3-demo-02', type:'splitter', grau:3, ratio:'1:2', nome:'SP3-C01-A2', parent_id:'sp2-demo-01', parent_type:'splitter'},
  ];
  sp3list.forEach(function(s) {
    var id = s.id; delete s.id;
    saves.push(sdrRef('infrastructure/' + id).set(Object.assign({}, s, {source:'demo', created_at:ts})));
    s.id = id;
  });

  // ── CTOs ──────────────────────────────────────────────────────
  // Mapa: parent_id → lista de CTOs
  var ctosDefs = [
    // via Sp3
    {id:'cto-demo-01', nome:'CTO-01', parent_id:'sp3-demo-01', total_ports:8, used_ports:4, endereco:'Rua A, poste 10', lat:-20.316, lng:-40.337},
    {id:'cto-demo-02', nome:'CTO-02', parent_id:'sp3-demo-02', total_ports:8, used_ports:3, endereco:'Rua A, poste 15', lat:-20.317, lng:-40.336},
    // via Sp2 direto (sem Sp3)
    {id:'cto-demo-03', nome:'CTO-03', parent_id:'sp2-demo-02', total_ports:8, used_ports:6, endereco:'Rua B, poste 5',  lat:-20.318, lng:-40.339},
    {id:'cto-demo-04', nome:'CTO-04', parent_id:'sp2-demo-03', total_ports:8, used_ports:5, endereco:'Rua C, poste 8',  lat:-20.319, lng:-40.340},
    {id:'cto-demo-05', nome:'CTO-05', parent_id:'sp2-demo-04', total_ports:8, used_ports:4, endereco:'Av. Principal, poste 20', lat:-20.321, lng:-40.341},
  ];
  ctosDefs.forEach(function(c) {
    var id = c.id; delete c.id;
    saves.push(sdrRef('infrastructure/' + id).set(Object.assign({}, c, {type:'cto', source:'demo', created_at:ts})));
    c.id = id;
  });

  // ── ONUs + Clientes ──────────────────────────────────────────
  var modelos = ['ZTE F660','Huawei HG8245H','Intelbras 110A','ZTE F620','Multilaser RE160'];
  var nomes   = ['Ana Silva','Bruno Souza','Carlos Lima','Diana Costa','Eduardo Pereira',
                 'Fernanda Oliveira','Gabriel Santos','Helena Rocha','Igor Martins','Julia Ferreira',
                 'Kleber Matos','Larissa Dias','Marcos Viana','Nathalia Cruz','Otto Leal',
                 'Patricia Mendes','Rafael Gomes','Sandra Lima','Thiago Costa','Valeria Reis'];
  var planos = ['50MB','100MB','200MB','500MB'];

  // Cada CTO ganha 4 ONUs
  var onuIdx = 0;
  ctosDefs.forEach(function(cto, ci) {
    var oltId = (ci < 2) ? 'olt-demo-01' : (ci < 4) ? 'olt-demo-01' : 'olt-demo-02';
    for (var p = 0; p < 4; p++) {
      onuIdx++;
      var serial = 'ZTEG' + String(onuIdx * 111111).padStart(8,'0');
      var onuId  = 'onu-demo-' + String(onuIdx).padStart(2,'0');
      var cliId  = 'cli-demo-' + String(onuIdx).padStart(2,'0');
      var nome   = nomes[(onuIdx - 1) % nomes.length];
      var status = (onuIdx % 6 === 0) ? 'offline' : (onuIdx % 8 === 0) ? 'degraded' : 'online';
      var rxPow  = status === 'offline' ? null : -(Math.floor(Math.random()*12) + 14);

      saves.push(sdrRef('onus/' + onuId).set({
        serial_number: serial,
        model:         modelos[onuIdx % modelos.length],
        status:        status,
        olt_id:        oltId,
        cto_id:        cto.id,
        cto_nome:      cto.nome,
        rx_power:      rxPow,
        ip_address:    '192.168.' + ci + '.' + (100 + p),
        pon_port:      '1/0/' + (ci + 1),
        source:'demo', created_at:ts
      }));

      saves.push(sdrRef('clients/' + cliId).set({
        name:           nome,
        onu_serial:     serial,
        onu_status:     status,
        rx_power:       rxPow,
        plan_name:      planos[onuIdx % planos.length],
        financial_status: (onuIdx % 7 === 0) ? 'inadimplente' : 'adimplente',
        cto_id:         cto.id,
        cto_nome:       cto.nome,
        olt_id:         oltId,
        lat:            cto.lat + (Math.random() - 0.5) * 0.002,
        lng:            cto.lng + (Math.random() - 0.5) * 0.002,
        source:'demo', created_at:ts
      }));
    }
  });

  Promise.all(saves).then(function() {
    _sdrMkLog('✅ Topologia completa gerada: ' + olts.length + ' OLTs, ' + dgos.length + ' DGOs, ' + sp1list.length + ' Sp1, ' + sp2list.length + ' Sp2, ' + sp3list.length + ' Sp3, ' + ctosDefs.length + ' CTOs, ' + onuIdx + ' ONUs + Clientes.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({
      icon:'success', title:'Topologia Gerada!',
      html: '<b>' + olts.length + '</b> OLTs · <b>' + dgos.length + '</b> DGOs · <b>' + (sp1list.length+sp2list.length+sp3list.length) + '</b> Splitters · <b>' + ctosDefs.length + '</b> CTOs · <b>' + onuIdx + '</b> ONUs<br><br>Acesse a aba <b>OLTs → Topologia</b> para visualizar.',
      timer:4000, showConfirmButton:false
    });
  }).catch(function(e) { _sdrMkLog('❌ Erro ao gerar topologia: ' + e.message, 'error'); });
};

// ---- MK: Demo — Só OLTs ----
window.sdrMkDemoOlts = function() {
  var ts = new Date().toISOString();
  var demoOlts = {
    'olt-demo-01': {name:'OLT-CENTRAL-01', model:'ZTE C320',       ip_address:'10.0.0.1', total_pon_ports:8, is_active:true, source:'demo', created_at:ts},
    'olt-demo-02': {name:'OLT-FILIAL-01',  model:'Huawei MA5608T', ip_address:'10.0.0.2', total_pon_ports:4, is_active:true, source:'demo', created_at:ts},
    'olt-demo-03': {name:'OLT-FILIAL-02',  model:'ZTE C300',       ip_address:'10.0.0.3', total_pon_ports:2, is_active:false,source:'demo', created_at:ts}
  };
  var saves = Object.entries(demoOlts).map(function(e){ return sdrRef('olt_connections/' + e[0]).set(e[1]); });
  Promise.all(saves).then(function() {
    _sdrMkLog('✅ ' + Object.keys(demoOlts).length + ' OLTs demo em olt_connections.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({icon:'success', title:'OLTs Demo', text:'3 OLTs salvas. Acesse a aba OLTs para ver.', timer:2000, showConfirmButton:false});
  }).catch(function(e) { _sdrMkLog('❌ Erro OLTs demo: ' + e.message, 'error'); });
};

// ---- MK: Demo — Só ONUs ----
window.sdrMkDemoOnus = function() {
  var ts = new Date().toISOString();
  var modelos = ['ZTE F660','Huawei HG8245H','Intelbras 110A','ZTE F620','Multilaser RE160'];
  var saves = [];
  for (var i = 1; i <= 12; i++) {
    var oltId = i <= 4 ? 'olt-demo-01' : i <= 8 ? 'olt-demo-02' : 'olt-demo-03';
    var status = (i % 6 === 0) ? 'offline' : (i % 8 === 0) ? 'degraded' : 'online';
    saves.push(sdrRef('onus/onu-demo-' + String(i).padStart(2,'0')).set({
      serial_number: 'ZTEG' + String(i * 111111).padStart(8,'0'),
      model:  modelos[i % modelos.length],
      status: status,
      olt_id: oltId,
      rx_power: status === 'offline' ? null : -(Math.floor(Math.random()*12)+14),
      ip_address: '192.168.1.' + (100 + i),
      source:'demo', created_at:ts
    }));
  }
  Promise.all(saves).then(function() {
    _sdrMkLog('✅ 12 ONUs demo salvas.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({icon:'success', title:'ONUs Demo', text:'12 ONUs salvas. Acesse a aba ONUs.', timer:2000, showConfirmButton:false});
  }).catch(function(e) { _sdrMkLog('❌ Erro ONUs demo: ' + e.message, 'error'); });
};

// ---- MK: Demo — Só Clientes ----
window.sdrMkDemoClientes = function() {
  var ts = new Date().toISOString();
  var nomes = ['Ana Silva','Bruno Souza','Carlos Lima','Diana Costa','Eduardo Pereira',
               'Fernanda Oliveira','Gabriel Santos','Helena Rocha','Igor Martins','Julia Ferreira'];
  var planos = ['50MB','100MB','200MB','500MB'];
  var saves = nomes.map(function(n, i) {
    return sdrRef('clients/cli-demo-' + String(i+1).padStart(2,'0')).set({
      name: n,
      onu_serial: 'ZTEG' + String((i+1)*111111).padStart(8,'0'),
      onu_status: i % 6 === 0 ? 'offline' : 'online',
      rx_power: -(Math.floor(Math.random()*12)+14),
      plan_name: planos[i%4],
      financial_status: i % 5 === 0 ? 'inadimplente' : 'adimplente',
      lat: -20.316 + (Math.random()-0.5)*0.02,
      lng: -40.338 + (Math.random()-0.5)*0.02,
      source:'demo', created_at:ts
    });
  });
  Promise.all(saves).then(function() {
    _sdrMkLog('✅ ' + nomes.length + ' clientes demo salvos.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({icon:'success', title:'Clientes Demo', text:nomes.length + ' clientes salvos. Acesse a aba Clientes.', timer:2000, showConfirmButton:false});
  }).catch(function(e) { _sdrMkLog('❌ Erro clientes demo: ' + e.message, 'error'); });
};

// ---- Topologia FTTH — Árvore Visual ----
window.sdrTopologiaToggle = function() {
  var panel = document.getElementById('topologia-tree');
  if (!panel) return;
  var visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) sdrTopologiaRender();
};

window.sdrTopologiaRender = function() {
  var el = document.getElementById('topologia-content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

  Promise.all([
    sdrRef('olt_connections').once('value'),
    sdrRef('infrastructure').once('value'),
    sdrRef('onus').once('value'),
    sdrRef('clients').once('value')
  ]).then(function(snaps) {
    var olts    = snaps[0].val() || {};
    var infra   = snaps[1].val() || {};
    var onus    = snaps[2].val() || {};
    var clients = snaps[3].val() || {};

    // Índices por tipo/parent
    var byType   = {};   // type → {id: obj}
    var byParent = {};   // parent_id → [{id, obj}]
    Object.entries(infra).forEach(function(e) {
      var id = e[0], obj = e[1];
      if (!obj) return;
      var t = obj.type || 'unknown';
      if (!byType[t]) byType[t] = {};
      byType[t][id] = obj;
      var pid = obj.parent_id || obj.olt_id || '__root__';
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push({id:id, obj:obj});
    });

    // ONUs por CTO
    var onusByCto = {};
    Object.entries(onus).forEach(function(e) {
      var uid = e[0], u = e[1];
      if (!u) return;
      var cid = u.cto_id || '__nocto__';
      if (!onusByCto[cid]) onusByCto[cid] = [];
      onusByCto[cid].push({id:uid, obj:u});
    });

    // Clientes por ONU serial
    var clientBySerial = {};
    Object.entries(clients).forEach(function(e) {
      var c = e[1];
      if (c && c.onu_serial) clientBySerial[c.onu_serial] = c;
    });

    function badge(status) {
      var col = status === 'online' ? '#16a34a' : status === 'degraded' ? '#d97706' : '#dc2626';
      return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + col + ';margin-right:4px"></span>';
    }

    function renderChildren(parentId, depth, oltId) {
      var children = (byParent[parentId] || []).sort(function(a,b){ return (a.obj.nome||a.id).localeCompare(b.obj.nome||b.id); });
      if (children.length === 0) return '';
      var pad = depth * 20;
      return children.map(function(c) {
        var id = c.id, obj = c.obj;
        var tipo = obj.type;
        var color = tipo === 'dgo' ? '#3b82f6' : tipo === 'splitter' ? (obj.grau === 1 ? '#7c3aed' : obj.grau === 2 ? '#a855f7' : '#c084fc') : tipo === 'cto' ? '#d97706' : '#64748b';
        var icon  = tipo === 'dgo' ? 'fa-network-wired' : tipo === 'splitter' ? 'fa-code-branch' : tipo === 'cto' ? 'fa-box' : 'fa-circle';
        var label = obj.nome || id;
        var info  = tipo === 'dgo' ? ('PON ' + (obj.pon_port||'—')) : tipo === 'splitter' ? ('Grau ' + obj.grau + ' · ' + (obj.ratio||'')) : tipo === 'cto' ? ((obj.used_ports||0) + '/' + (obj.total_ports||8) + ' portas') : '';

        // CTOs: listar ONUs filhas
        var onusHtml = '';
        if (tipo === 'cto') {
          var ctOnus = onusByCto[id] || [];
          onusHtml = ctOnus.map(function(u) {
            var cli = u.obj.serial_number ? (clientBySerial[u.obj.serial_number] || null) : null;
            var st  = u.obj.status || 'offline';
            return '<div style="padding:3px 0 3px ' + (pad+40) + 'px;font-size:.73rem;border-left:2px solid #e5e7eb;margin-left:' + (pad+28) + 'px;padding-left:12px">'
              + badge(st)
              + '<span style="color:#374151;font-family:monospace">' + (u.obj.serial_number||u.id) + '</span>'
              + ' <span style="color:#64748b">' + (u.obj.model||'') + '</span>'
              + (cli ? ' — <b style="color:#1e293b">' + cli.name + '</b> <span style="color:var(--muted);font-size:.7rem">' + (cli.plan_name||'') + '</span>' : '')
              + (u.obj.rx_power != null ? ' <span style="color:' + (u.obj.rx_power > -25 ? '#16a34a' : u.obj.rx_power > -28 ? '#d97706' : '#dc2626') + ';font-size:.7rem">(' + u.obj.rx_power + ' dBm)</span>' : '')
              + '</div>';
          }).join('');
          if (ctOnus.length === 0) onusHtml = '<div style="padding-left:' + (pad+52) + 'px;font-size:.72rem;color:#94a3b8;font-style:italic">Sem ONUs</div>';
        }

        return '<div style="padding:5px 0 2px ' + pad + 'px" class="topo-row" onclick="this.nextElementSibling&&(this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\')">'
          + '<span style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:4px 10px;font-size:.78rem;box-shadow:0 1px 2px rgba(0,0,0,.04)">'
          + '<i class="fas ' + icon + '" style="color:' + color + ';width:14px"></i>'
          + '<b style="color:#1e293b">' + label + '</b>'
          + (info ? '<span style="color:#64748b;font-size:.7rem">' + info + '</span>' : '')
          + '</span></div>'
          + '<div>' + onusHtml + renderChildren(id, depth + 1, oltId) + '</div>';
      }).join('');
    }

    var oltEntries = Object.entries(olts);
    if (oltEntries.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)"><i class="fas fa-info-circle"></i> Nenhuma OLT cadastrada. Use <b>Integração MK → Simular Topologia Completa</b>.</div>';
      return;
    }

    var html = oltEntries.map(function(e) {
      var oid = e[0], o = e[1];
      var status = o.is_active ? 'online' : 'offline';
      var onusOlt = Object.values(onus).filter(function(u){ return u && u.olt_id === oid; });
      var onOnline = onusOlt.filter(function(u){ return u.status === 'online'; }).length;
      return '<div style="margin-bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
        + '<div style="width:32px;height:32px;background:' + (o.is_active ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : '#94a3b8') + ';border-radius:8px;display:flex;align-items:center;justify-content:center">'
        + '<i class="fas fa-server" style="color:#fff;font-size:.85rem"></i></div>'
        + '<div><b style="color:#1e293b;font-size:.9rem">' + (o.name||oid) + '</b>'
        + '<div style="font-size:.73rem;color:#64748b">' + (o.model||'OLT') + ' · IP: ' + (o.ip_address||'—') + ' · ' + (o.total_pon_ports||0) + ' PONs</div></div>'
        + badge(status) + '<span style="font-size:.75rem;color:#64748b">' + onOnline + '/' + onusOlt.length + ' ONUs online</span>'
        + '</div>'
        + renderChildren(oid, 0, oid)
        + ((!byParent[oid] || byParent[oid].length === 0) ? '<div style="padding-left:8px;font-size:.78rem;color:#94a3b8;font-style:italic">Sem DGOs vinculados a esta OLT</div>' : '')
        + '</div>';
    }).join('');

    el.innerHTML = html;
  }).catch(function(e) {
    el.innerHTML = '<div style="color:#dc2626;padding:16px">Erro ao carregar topologia: ' + e.message + '</div>';
  });
};

// ---- Helpers internos MK ----
function _sdrMkLog(msg, type) {
  var el = document.getElementById('mk-log');
  if (!el) return;
  var color = type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : type === 'ok' ? '#10b981' : '#475569';
  var ts = new Date().toLocaleTimeString('pt-BR');
  var line = '<div><span style="color:#94a3b8">[' + ts + ']</span> <span style="color:' + color + '">' + msg + '</span></div>';
  el.innerHTML = el.innerHTML.replace('<span style="color:#94a3b8">Aguardando atividade...</span>', '');
  el.innerHTML += line;
  el.scrollTop = el.scrollHeight;
}

function _sdrMkUpdateBadge(enabled) {
  var badge = document.getElementById('mk-status-badge');
  if (!badge) return;
  badge.style.display = 'inline-block';
  if (enabled) {
    badge.style.background = '#d1fae5'; badge.style.color = '#065f46';
    badge.textContent = '● Integração Ativa';
  } else {
    badge.style.background = '#fee2e2'; badge.style.color = '#991b1b';
    badge.textContent = '○ Integração Inativa';
  }
}

function _sdrMkRefreshCounts() {
  sdrRef('olt_connections').once('value').then(function(s) {
    var el = document.getElementById('mk-count-olts');
    if (el) el.textContent = Object.keys(s.val()||{}).length || '0';
  });
  sdrRef('infrastructure').once('value').then(function(s) {
    var infra = s.val() || {};
    var ctoCount  = Object.values(infra).filter(function(i){ return i && i.type === 'cto'; }).length;
    var dgoCount  = Object.values(infra).filter(function(i){ return i && i.type === 'dgo'; }).length;
    var elCto = document.getElementById('mk-count-ctos');
    var elPop = document.getElementById('mk-count-pops');
    if (elCto) elCto.textContent = ctoCount || '0';
    if (elPop) elPop.textContent = dgoCount || '0';
  });
  sdrRef('clients').once('value').then(function(s) {
    var el = document.getElementById('mk-count-clientes');
    if (el) el.textContent = Object.keys(s.val()||{}).length || '0';
  });
  sdrRef('mk_config/updated_at').once('value').then(function(s) {
    var el = document.getElementById('mk-last-sync');
    if (el && s.val()) el.textContent = new Date(s.val()).toLocaleString('pt-BR');
  });
}

// ============================================================
// CONTEXT MENU ENGINE — Padrão IQGeo/OSPInsight
// Esquerdo = seleciona/painel · Direito = menu ações · ⋮ = mesmo menu
// ============================================================
window._sdrCtxReg = {}; // registro de handlers por sessão

window.sdrCtxMenu = function(e, items) {
  window.sdrCtxClose();
  if (e && e.preventDefault) e.preventDefault();
  if (e && e.stopPropagation) e.stopPropagation();

  var x = (e && e.clientX) ? e.clientX : (e && e.target ? e.target.getBoundingClientRect().right : 100);
  var y = (e && e.clientY) ? e.clientY : (e && e.target ? e.target.getBoundingClientRect().bottom : 100);
  var sid = 'ctx_' + Date.now();
  window._sdrCtxReg[sid] = items;

  var html = '<div id="sdr-ctx-menu">';
  items.forEach(function(item, i) {
    if (item === '---') { html += '<div class="sdr-ctx-sep"></div>'; return; }
    if (item._label) { html += '<div class="sdr-ctx-label">' + item._label + '</div>'; return; }
    var col   = item.color   || '#1e293b';
    var icCol = item.color   || '#64748b';
    html += '<div class="sdr-ctx-item" style="color:' + col + '" '
      + 'onclick="(window._sdrCtxReg[\'' + sid + '\'][' + i + '].fn)();window.sdrCtxClose()">'
      + '<i class="fas ' + (item.icon || 'fa-circle') + '" style="color:' + icCol + '"></i>'
      + item.label + '</div>';
  });
  html += '</div>';

  var wrap = document.createElement('div');
  wrap.id = 'sdr-ctx-wrap';
  wrap.style.cssText = 'left:' + x + 'px;top:' + y + 'px';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);

  // Ajuste de borda de tela
  var rect = wrap.getBoundingClientRect();
  if (rect.right  > window.innerWidth)  wrap.style.left = (x - rect.width)  + 'px';
  if (rect.bottom > window.innerHeight) wrap.style.top  = (y - rect.height) + 'px';

  // Fechar ao clicar fora ou Escape
  setTimeout(function() {
    function away(ev) {
      if (!document.getElementById('sdr-ctx-wrap') || !document.getElementById('sdr-ctx-wrap').contains(ev.target)) {
        window.sdrCtxClose(); cleanup();
      }
    }
    function esc(ev) { if (ev.key === 'Escape') { window.sdrCtxClose(); cleanup(); } }
    function cleanup() { document.removeEventListener('click', away); document.removeEventListener('keydown', esc); }
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
  }, 60);
};

window.sdrCtxClose = function() {
  var w = document.getElementById('sdr-ctx-wrap');
  if (w) w.remove();
};

// ── Mover marcador no mapa (drag & drop) ─────────────────────────────────────
var _sdrMoveState = null; // { id, collection, marker, origLat, origLng }

window.sdrMoveMarker = function(id, collection) {
  // Remover estado anterior se existir
  sdrMoveCancelMarker();

  var item, lat, lng, label;
  if (collection === 'infrastructure') {
    item = sdrInfraCache[id] || {};
    lat  = item.lat; lng = item.lng;
    label = item.name || item.code || id;
  } else if (collection === 'cliente') {
    item = sdrClientesCache[id] || {};
    lat  = item.lat; lng = item.lng;
    label = item.name || id;
  }
  if (!lat || !lng) { toast('Item sem coordenadas — use Editar para definir posição.', 'error'); return; }

  // Navegar para o mapa
  if (typeof showPage === 'function') showPage('mapa');

  setTimeout(function() {
    // Centralizar no item
    if (sdrMap) sdrMap.setView([lat, lng], Math.max(sdrMap.getZoom(), 17));

    // Criar marcador arrastável com visual distinto
    var moveIcon = L.divIcon({
      className: '',
      html: '<div style="width:32px;height:32px;background:#f97316;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);cursor:grab">'
          + '<i class="fas fa-arrows-alt" style="color:#fff;font-size:.75rem"></i></div>',
      iconSize:   [32, 32],
      iconAnchor: [16, 16]
    });

    var dragMarker = L.marker([lat, lng], { draggable: true, icon: moveIcon, zIndexOffset: 9999 });
    dragMarker.addTo(sdrMap);
    dragMarker.bindTooltip('Arraste para reposicionar: ' + label, { permanent: false, direction: 'top', offset: [0, -18] });

    _sdrMoveState = { id: id, collection: collection, marker: dragMarker, origLat: lat, origLng: lng };

    // Banner de confirmação
    var existing = document.getElementById('sdr-move-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'sdr-move-banner';
    banner.style.cssText = 'position:absolute;top:68px;left:50%;transform:translateX(-50%);z-index:9999;'
      + 'background:#1e293b;border:1px solid #f97316;border-radius:10px;'
      + 'padding:9px 16px;color:#f1f5f9;font-size:.82rem;display:flex;align-items:center;'
      + 'gap:12px;box-shadow:0 4px 20px rgba(0,0,0,.45);white-space:nowrap';
    banner.innerHTML = '<i class="fas fa-arrows-alt" style="color:#f97316"></i>'
      + '<span>Arraste <b>' + label + '</b> para nova posição</span>'
      + '<button onclick="sdrMoveConfirmMarker()" style="padding:5px 14px;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:700"><i class="fas fa-check"></i> Confirmar</button>'
      + '<button onclick="sdrMoveCancelMarker()" style="padding:5px 10px;background:#334155;color:#cbd5e1;border:none;border-radius:6px;cursor:pointer;font-size:.8rem">Cancelar</button>';
    var mapContainer = document.getElementById('sdr-map');
    if (mapContainer) mapContainer.appendChild(banner);
  }, 300);
};

window.sdrMoveConfirmMarker = function() {
  if (!_sdrMoveState) return;
  var s   = _sdrMoveState;
  var pos = s.marker.getLatLng();
  var ref, cache;
  if (s.collection === 'infrastructure') {
    ref   = sdrRef('infrastructure/' + s.id);
    cache = sdrInfraCache;
  } else {
    ref   = sdrRef('clients/' + s.id);
    cache = sdrClientesCache;
  }
  ref.update({ lat: pos.lat, lng: pos.lng, updated_at: new Date().toISOString() })
    .then(function() {
      if (cache[s.id]) { cache[s.id].lat = pos.lat; cache[s.id].lng = pos.lng; }
      toast('Posição salva com sucesso.', 'success');
      sdrMoveCancelMarker();
      if (typeof sdrMapRenderInfra === 'function') sdrMapRenderInfra();
      if (typeof sdrMapRenderClientes === 'function') sdrMapRenderClientes();
    })
    .catch(function(e) { toast('Erro ao salvar: ' + e.message, 'error'); });
};

window.sdrMoveCancelMarker = function() {
  if (_sdrMoveState) {
    try { sdrMap && sdrMap.removeLayer(_sdrMoveState.marker); } catch(e){}
    _sdrMoveState = null;
  }
  var b = document.getElementById('sdr-move-banner');
  if (b) b.remove();
};

// Helpers de itens de contexto por tipo
window._sdrCtxOlt = function(id) {
  return [
    {_label: 'OLT'},
    {icon:'fa-th',          label:'Ver Chassis',      fn:function(){ showPage && showPage('olts'); setTimeout(function(){ sdrOltTabSwitch(id); }, 200); }},
    {icon:'fa-edit',        label:'Editar',           fn:function(){ sdrOltAddModal(id); }},
    {icon:'fa-sitemap',     label:'Ver Topologia',    fn:function(){ showPage && showPage('olts'); setTimeout(function(){ var p=document.getElementById('topologia-tree'); if(p&&p.style.display==='none') sdrTopologiaToggle(); else sdrTopologiaRender(); },200); }},
    '---',
    {icon:'fa-router',      label:'Nova ONU',         fn:function(){ sdrOnuAdd(); }},
    {icon:'fa-network-wired',label:'Novo DGO',        fn:function(){ sdrDgoCriarModal(id); }},
    '---',
    {icon:'fa-trash',       label:'Excluir OLT',      color:'#dc2626', fn:function(){ sdrOltDelete(id); }}
  ];
};

window._sdrCtxOnu = function(id) {
  return [
    {_label: 'ONU'},
    {icon:'fa-eye',         label:'Ver Detalhes',     fn:function(){ sdrOpenOnuPanel(id); }},
    {icon:'fa-edit',        label:'Editar',           fn:function(){ sdrOnuEdit(id); }},
    '---',
    {icon:'fa-trash',       label:'Excluir ONU',      color:'#dc2626', fn:function(){ sdrOnuDelete && sdrOnuDelete(id); }}
  ];
};

window._sdrCtxCliente = function(id) {
  return [
    {_label: 'Cliente'},
    {icon:'fa-eye',         label:'Ver Detalhes',     fn:function(){ sdrOpenClientePanel(id, sdrClientesCache[id]); }},
    {icon:'fa-edit',        label:'Editar',           fn:function(){ sdrClienteEdit && sdrClienteEdit(id); }},
    {icon:'fa-arrows-alt',  label:'Mover',            fn:function(){ sdrMoveMarker(id, 'cliente'); }},
    {icon:'fa-map-pin',     label:'Ver no Mapa',      fn:function(){ sdrMapFlyToClient(id); }},
    {icon:'fa-ticket-alt',  label:'Abrir Chamado',    fn:function(){ sdrTicketAdd && sdrTicketAdd(id); }},
    '---',
    {icon:'fa-trash',       label:'Excluir Cliente',  color:'#dc2626', fn:function(){ sdrClienteDelete && sdrClienteDelete(id); }}
  ];
};

window._sdrCtxInfra = function(id) {
  var item = sdrInfraCache[id] || {};
  return [
    {_label: 'Infraestrutura'},
    {icon:'fa-eye',         label:'Ver Detalhes',     fn:function(){ sdrOpenInfraPanel(id, sdrInfraCache[id]); }},
    {icon:'fa-edit',        label:'Editar',           fn:function(){ sdrInfraEdit(id); }},
    {icon:'fa-arrows-alt',  label:'Mover',            fn:function(){ sdrMoveMarker(id, 'infrastructure'); }},
    {icon:'fa-map-marker-alt',label:'Ir ao Mapa',     fn:function(){ var it=sdrInfraCache[id]; if(it&&it.lat) { showPage&&showPage('mapa'); setTimeout(function(){ sdrMapFlyTo(it.lat,it.lng); },300); } }},
    '---',
    {icon:'fa-trash',       label:'Excluir',          color:'#dc2626', fn:function(){ sdrInfraDelete && sdrInfraDelete(id); }}
  ];
};

// ════════════════════════════════════════════════════════════════════
// SPRINT 8 — Real-time · Badge Alertas · MK Panel · Alerta→Ticket
//            Export CSV · Auto-refresh Dashboard · Fix Filtros
// ════════════════════════════════════════════════════════════════════

// ── 1. Fix filtro de clientes (trabalha com tabela, não cards) ────
window.sdrClientesFiltrar = function(q) {
  q = (q || '').toLowerCase().trim();
  var rows = document.querySelectorAll('#clientes-lista tbody tr');
  if (rows.length === 0) { sdrClientesRender(); return; }
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
};

// ── 2. Export CSV ─────────────────────────────────────────────────
window.sdrExportClientesCSV = function() {
  var data = Object.entries(sdrClientesCache || {});
  if (!data.length) { if (typeof toast === 'function') toast('Sem clientes para exportar', 'warn'); return; }
  var header = ['Nome','CPF/CNPJ','Telefone','Email','Endereço','Plano','Velocidade','Preço','Financeiro','ONU Serial','Status ONU','Sinal Rx','CTO'];
  var rows = data.map(function(e) {
    var c = e[1];
    return [
      c.name || '', c.cpf_cnpj || '', c.phone || '', c.email || '', c.address || '',
      c.plan_name || '', (c.plan_speed_down ? c.plan_speed_down + 'M' : ''), (c.plan_price ? 'R$ ' + parseFloat(c.plan_price).toFixed(2) : ''),
      c.financial_status || 'adimplente', c.onu_serial || '', c.onu_status || '', (c.rx_power != null ? c.rx_power + ' dBm' : ''), c.cto_nome || c.cto_id || ''
    ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
  });
  var csv = [header.join(',')].concat(rows).join('\n');
  var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'clientes_sdr_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click(); URL.revokeObjectURL(url);
  if (typeof toast === 'function') toast('CSV exportado: ' + data.length + ' clientes', 'success');
};

window.sdrExportOnusCSV = function() {
  var data = Object.entries(sdrOnusCache || {});
  if (!data.length) { if (typeof toast === 'function') toast('Sem ONUs para exportar', 'warn'); return; }
  var header = ['Serial','Modelo','Status','Sinal Rx','Sinal Tx','IP','OLT','PON','CTO','Cliente'];
  var cbs = {};
  Object.entries(sdrClientesCache || {}).forEach(function(e) {
    if (e[1] && e[1].onu_serial) cbs[e[1].onu_serial.toLowerCase()] = e[1].name;
  });
  var rows = data.map(function(e) {
    var u = e[1];
    var olt = (sdrOltsCache || {})[u.olt_id] || {};
    return [
      u.serial_number || '', u.model || '', u.status || '', (u.rx_power != null ? u.rx_power : ''), (u.tx_power != null ? u.tx_power : ''),
      u.ip_address || '', olt.name || u.olt_id || '', u.pon_port || '', u.cto_nome || u.cto_id || '',
      (u.serial_number ? cbs[u.serial_number.toLowerCase()] || '' : '')
    ].map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
  });
  var csv = [header.join(',')].concat(rows).join('\n');
  var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'onus_sdr_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click(); URL.revokeObjectURL(url);
  if (typeof toast === 'function') toast('CSV exportado: ' + data.length + ' ONUs', 'success');
};

// Adicionar botões de export nas páginas (chamado após render)
(function _sdrInjectExportBtns() {
  // Esperar DOM estar pronto (as páginas podem não existir ainda)
  var _orig8ShowPage = window.showPage;
  if (typeof _orig8ShowPage === 'function' && !_orig8ShowPage._sdr8Patched) {
    var _orig8 = _orig8ShowPage;
    window.showPage = function(name) {
      _orig8(name);
      setTimeout(function() {
        if (name === 'clientes') {
          var hdr = document.querySelector('#page-clientes .flex');
          if (hdr && !document.getElementById('btn-exp-clients')) {
            var btn = document.createElement('button');
            btn.id = 'btn-exp-clients';
            btn.className = 'btn-map';
            btn.style.cssText = 'padding:6px 14px;font-size:.8rem';
            btn.innerHTML = '<i class="fas fa-file-csv"></i> Exportar CSV';
            btn.onclick = sdrExportClientesCSV;
            hdr.appendChild(btn);
          }
        }
        if (name === 'onus') {
          var hdr2 = document.querySelector('#page-onus .flex');
          if (hdr2 && !document.getElementById('btn-exp-onus')) {
            var btn2 = document.createElement('button');
            btn2.id = 'btn-exp-onus';
            btn2.className = 'btn-map';
            btn2.style.cssText = 'padding:6px 14px;font-size:.8rem';
            btn2.innerHTML = '<i class="fas fa-file-csv"></i> Exportar CSV';
            btn2.onclick = sdrExportOnusCSV;
            hdr2.appendChild(btn2);
          }
        }
      }, 500);
    };
    window.showPage._sdrPatched = window.showPage._sdr8Patched = true;
  }
})();

// ── 3. Listener real-time de ONUs → auto-alertas + badge sidebar ──
var _sdrRealtimeActive = false;
window._sdrInitRealtime = function() {
  if (_sdrRealtimeActive) return;
  _sdrRealtimeActive = true;

  // Listener em /onus: detecta mudança de status para offline
  var _prevOnuStatus = {};
  sdrRef('onus').on('value', function(snap) {
    var onus = snap.val() || {};

    // Atualizar badge de alertas (verificar alertas ativos)
    sdrRef('alerts').once('value').then(function(aSnap) {
      var alerts = aSnap.val() || {};
      var activeCount = Object.values(alerts).filter(function(a) { return a && a.is_active; }).length;
      _sdrUpdateAlertBadge(activeCount);
    });

    // Detectar ONUs que ficaram offline desde a última leitura
    var now = new Date().toISOString();
    var updates = {};
    var newAlerts = 0;

    Object.entries(onus).forEach(function(e) {
      var onuId = e[0], u = e[1];
      if (!u) return;
      var prev = _prevOnuStatus[onuId];
      // ONU acabou de ficar offline
      if (u.status === 'offline' && prev && prev !== 'offline') {
        var alertKey = sdrRef('alerts').push().key;
        updates['alerts/' + alertKey] = {
          onu_id:    onuId,
          client_id: u.client_id || null,
          severity:  'critical',
          title:     'ONU Offline: ' + (u.serial_number || onuId),
          message:   'ONU ' + (u.serial_number || '') + ' ficou offline às ' + new Date().toLocaleTimeString('pt-BR'),
          is_active: true,
          created_at: now
        };
        newAlerts++;
      }
      _prevOnuStatus[onuId] = u.status;
    });

    if (Object.keys(updates).length) {
      sdrRef('').update(updates).then(function() {
        // Re-verificar badge após criar alertas
        sdrRef('alerts').once('value').then(function(aSnap2) {
          var cnt = Object.values(aSnap2.val() || {}).filter(function(a) { return a && a.is_active; }).length;
          _sdrUpdateAlertBadge(cnt);
        });
        if (typeof toast === 'function') toast('⚠ ' + newAlerts + ' ONU(s) ficou offline — alerta criado!', 'error');
        // Atualizar página de alertas se aberta
        if (document.getElementById('alertas-lista') && document.querySelector('#page-alertas.active')) {
          sdrAlertasRender();
        }
      });
    }
  });
};

// Badge de alertas no sidebar
window._sdrUpdateAlertBadge = function(count) {
  var badge = document.getElementById('sdr-alert-badge');
  if (!badge) {
    // Criar badge no item de Alertas do sidebar
    var alertLink = document.querySelector('[onclick*="alertas"]') || Array.from(document.querySelectorAll('[onclick]')).find(function(el){return el.getAttribute('onclick').indexOf('alertas')>-1;});
    if (!alertLink) return;
    badge = document.createElement('span');
    badge.id = 'sdr-alert-badge';
    badge.style.cssText = 'display:inline-block;background:#dc2626;color:#fff;font-size:.62rem;font-weight:700;border-radius:50%;width:16px;height:16px;text-align:center;line-height:16px;margin-left:4px';
    alertLink.appendChild(badge);
  }
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
};

// Iniciar real-time após 2s (garantir que Firebase está pronto)
setTimeout(function() {
  if (typeof sdrRef === 'function') window._sdrInitRealtime();
}, 2000);

// ── 4. Seção MK Solutions no painel do cliente ────────────────────
(function _sdrPatchClientePanel() {
  var _origBuildPanel = window._buildClientePanel || window.sdrOpenClientePanel;
  // Estender _buildClientePanel injetando seção MK depois de renderizar
  var _origOpenPanel = window.sdrOpenClientePanel;
  window.sdrOpenClientePanel = function(id, c) {
    _origOpenPanel(id, c);
    // Injetar seção MK após o painel ser montado
    setTimeout(function() {
      var body = document.getElementById('sp-body');
      if (!body || !c) return;
      // Verificar se já foi injetado
      if (document.getElementById('sp-mk-section')) return;

      // Verificar se há config MK
      sdrRef('mk_config').once('value').then(function(snap) {
        var mkCfg = snap.val() || {};
        var hasMk = !!(mkCfg.token && mkCfg.token !== 'SEU_TOKEN_AQUI');
        var sp = document.getElementById('sdr-side-panel');
        if (!sp || !sp.classList.contains('open')) return; // painel fechou

        var mkSection = document.createElement('div');
        mkSection.id = 'sp-mk-section';
        mkSection.className = 'sp-section';
        mkSection.innerHTML = '<div class="sp-section-title"><i class="fas fa-plug" style="color:#7c3aed"></i> MK Solutions'
          + (hasMk ? '' : ' <span style="font-size:.68rem;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;font-weight:600;margin-left:4px">Token pendente</span>')
          + '</div>'
          + (c.mk_id ? '<div class="sp-row"><span class="sp-label">ID no MK</span><span class="sp-val" style="font-family:monospace">' + c.mk_id + '</span></div>' : '')
          + (c.mk_contrato ? '<div class="sp-row"><span class="sp-label">Contrato</span><span class="sp-val">' + c.mk_contrato + '</span></div>' : '')
          + (c.mk_vencimento ? '<div class="sp-row"><span class="sp-label">Vencimento</span><span class="sp-val">' + c.mk_vencimento + '</span></div>' : '')
          + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">'
          + '<button onclick="sdrMkAbrirOS && sdrMkAbrirOS(\'' + id + '\')" '
          + 'style="padding:5px 10px;font-size:.75rem;background:#ede9fe;color:#7c3aed;border:1px solid #c4b5fd;border-radius:6px;cursor:pointer'
          + (hasMk ? '' : ';opacity:.5;cursor:not-allowed') + '" '
          + (hasMk ? '' : 'title="Configure o token MK em Integração MK" disabled') + '>'
          + '<i class="fas fa-wrench" style="margin-right:4px"></i>Abrir OS</button>'
          + '<button onclick="sdrMkDesbloquear && sdrMkDesbloquear(\'' + id + '\')" '
          + 'style="padding:5px 10px;font-size:.75rem;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:6px;cursor:pointer'
          + (hasMk ? '' : ';opacity:.5;cursor:not-allowed') + '" '
          + (hasMk ? '' : 'title="Configure o token MK em Integração MK" disabled') + '>'
          + '<i class="fas fa-unlock" style="margin-right:4px"></i>Desbloquear</button>'
          + '<button onclick="sdrTicketAdd && sdrTicketAdd(\'' + id + '\')" '
          + 'style="padding:5px 10px;font-size:.75rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;cursor:pointer">'
          + '<i class="fas fa-ticket-alt" style="margin-right:4px"></i>Abrir Chamado</button>'
          + '</div>';

        body.appendChild(mkSection);
      });
    }, 150);
  };
})();

// ── 5. Alerta → criar ticket ──────────────────────────────────────
window.sdrAlertaAbrirTicket = function(alertId) {
  sdrRef('alerts/' + alertId).once('value').then(function(snap) {
    var a = snap.val();
    if (!a) return;
    var clientId = a.client_id || '';
    sdrRef('clients/' + clientId).once('value').then(function(cSnap) {
      var c = cSnap.val() || {};
      // Pré-preencher modal de ticket
      if (typeof sdrTicketAdd === 'function') {
        sdrTicketAdd(clientId || null);
        setTimeout(function() {
          var titleEl = document.getElementById('ticket-title');
          var descEl  = document.getElementById('ticket-description');
          var typeEl  = document.getElementById('ticket-type');
          var prioEl  = document.getElementById('ticket-priority');
          if (titleEl) titleEl.value = a.title || 'Alerta: ' + (a.severity || '') + ' — ' + (c.name || '');
          if (descEl)  descEl.value  = a.message || '';
          if (typeEl)  typeEl.value  = a.title && a.title.includes('Offline') ? 'sem_sinal' : 'sinal_baixo';
          if (prioEl)  prioEl.value  = a.severity === 'critical' ? 'critical' : 'high';
        }, 200);
      }
    });
  });
};

// Injetar botão "Abrir Ticket" nos alertas após render
var _origAlertasRender8 = window.sdrAlertasRender;
window.sdrAlertasRender = function() {
  _origAlertasRender8();
  setTimeout(function() {
    var lista = document.getElementById('alertas-lista');
    if (!lista) return;
    // Adicionar coluna de ação nas linhas de alertas já renderizadas
    lista.querySelectorAll('tr[data-alert-id]').forEach(function(row) {
      if (row.querySelector('.alerta-ticket-btn')) return;
      var aid = row.getAttribute('data-alert-id');
      var td = document.createElement('td');
      td.innerHTML = '<button class="alerta-ticket-btn" onclick="sdrAlertaAbrirTicket(\'' + aid + '\')" '
        + 'style="padding:3px 8px;font-size:.72rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:5px;cursor:pointer">'
        + '<i class="fas fa-ticket-alt"></i> Ticket</button>';
      row.appendChild(td);
    });
  }, 300);
};

// Override sdrAlertasRender para injetar data-alert-id nas linhas
(function _sdrPatchAlertasTable() {
  var _origAlRender = window.sdrAlertasRender;
  window.sdrAlertasRender = function() {
    // Chamar o original
    _origAlRender();
    // Após render, adicionar data-alert-id se possível (a tabela usa entries)
    // A versão de sprint4 do alertasRender usa 'alertas-lista' com rows sem IDs
    // Vamos sobrescrever o render completamente para incluir o botão ticket
  };
  window.sdrAlertasRender = _origAlRender; // restaurar — vamos fazer de outro jeito
})();

// Render de alertas melhorado — com botão de ticket em cada linha
window.sdrAlertasRender = function() {
  sdrRef('alerts').once('value').then(function(snap) {
    var alerts = snap.val() || {};
    var lista = document.getElementById('alertas-lista');
    if (!lista) return;

    var entries = Object.entries(alerts);
    if (entries.length === 0) {
      lista.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">'
        + '<i class="fas fa-check-circle" style="font-size:2.5rem;color:#22c55e;margin-bottom:10px;display:block"></i>'
        + '<p>Nenhum alerta ativo — rede estável.</p></div>';
      _sdrUpdateAlertBadge(0);
      return;
    }

    var activeAlerts = entries.filter(function(e) { return e[1] && e[1].is_active; });
    var inactiveAlerts = entries.filter(function(e) { return e[1] && !e[1].is_active; });
    _sdrUpdateAlertBadge(activeAlerts.length);

    var sevColor  = { critical:'#dc2626', warning:'#d97706', info:'#2563eb' };
    var sevLabel  = { critical:'Crítico',  warning:'Atenção',  info:'Info' };
    var sevBg     = { critical:'#fee2e2',  warning:'#fef3c7',  info:'#dbeafe' };

    function renderGroup(label, arr) {
      if (!arr.length) return '';
      var rows = arr.map(function(e) {
        var id = e[0], a = e[1];
        var sc = sevColor[a.severity] || '#94a3b8';
        var sl = sevLabel[a.severity] || a.severity;
        var sb = sevBg[a.severity]   || '#f8fafc';
        var dt = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '';
        return '<tr data-alert-id="' + id + '" style="border-bottom:1px solid #f1f5f9">'
          + '<td style="padding:8px 10px"><span style="background:' + sb + ';color:' + sc + ';padding:2px 8px;border-radius:8px;font-size:.72rem;font-weight:700">' + sl + '</span></td>'
          + '<td style="padding:8px 10px;font-weight:600">' + (a.title || 'Alerta') + '</td>'
          + '<td style="padding:8px 10px;font-size:.78rem;color:var(--muted)">' + (a.message || '') + '</td>'
          + '<td style="padding:8px 10px;font-size:.75rem;color:var(--muted);white-space:nowrap">' + dt + '</td>'
          + '<td style="padding:8px 10px;text-align:right;white-space:nowrap">'
          + (a.is_active
            ? '<button onclick="sdrAlertaAck(\'' + id + '\')" style="padding:3px 8px;font-size:.72rem;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:5px;cursor:pointer;margin-right:4px"><i class="fas fa-check"></i> ACK</button>'
            : '')
          + '<button onclick="sdrAlertaAbrirTicket(\'' + id + '\')" style="padding:3px 8px;font-size:.72rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:5px;cursor:pointer">'
          + '<i class="fas fa-ticket-alt"></i> Ticket</button>'
          + '</td></tr>';
      }).join('');
      return '<div style="font-size:.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px">' + label + ' (' + arr.length + ')</div>'
        + '<table style="width:100%;border-collapse:collapse;font-size:.83rem;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">'
        + '<thead><tr style="background:#f8fafc"><th style="padding:8px 10px;text-align:left">Severity</th><th style="padding:8px 10px;text-align:left">Título</th>'
        + '<th style="padding:8px 10px;text-align:left">Mensagem</th><th style="padding:8px 10px;text-align:left">Data</th><th style="padding:8px 10px"></th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';
    }

    lista.innerHTML = renderGroup('Alertas Ativos', activeAlerts)
      + renderGroup('Histórico (Reconhecidos)', inactiveAlerts.slice(0, 20));
  });
};

// ── 6. Auto-refresh Dashboard a cada 60s ─────────────────────────
var _sdrDashInterval = null;
(function _sdrPatchDashPage() {
  var _orig9 = window.showPage;
  if (typeof _orig9 !== 'function' || _orig9._sdr9Patched) return;
  var _w9 = function(name) {
    _orig9(name);
    if (name === 'dash-rede') {
      if (_sdrDashInterval) clearInterval(_sdrDashInterval);
      _sdrDashInterval = setInterval(function() {
        if (document.querySelector('#page-dash-rede.active') && typeof sdrDashRedeRender === 'function') {
          sdrDashRedeRender();
        } else {
          clearInterval(_sdrDashInterval);
          _sdrDashInterval = null;
        }
      }, 60000); // 60 segundos
    } else {
      if (_sdrDashInterval) { clearInterval(_sdrDashInterval); _sdrDashInterval = null; }
    }
  };
  _w9._sdrPatched = _w9._sdr9Patched = true;
  window.showPage = _w9;
})();

// ── 7. Botão "Export CSV" nos templates de página ─────────────────
// Substituir templates para incluir botão export
window._sdrHtml_clientes = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-users" style="color:var(--primary)"></i> Clientes FTTH</h2>'
    +'<input id="clientes-search" type="text" placeholder="Buscar cliente..." oninput="sdrClientesFilter()" style="padding:6px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;width:200px">'
    +'<select id="clientes-filter-status" onchange="sdrClientesFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem">'
    +'<option value="">Todos</option><option value="adimplente">Adimplentes</option><option value="inadimplente">Inadimplentes</option></select>'
    +'<button class="btn-map" onclick="sdrClienteAdd()" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Novo</button>'
    +'<button class="btn-map" onclick="document.getElementById(\'clientes-import-input\').click()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-import"></i> Importar</button>'
    +'<button class="btn-map" onclick="sdrAutoLinkCTO()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-link"></i> Auto-Link</button>'
    +'<button class="btn-map" onclick="sdrExportClientesCSV()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-csv"></i> CSV</button>'
    +'<button class="btn-map" onclick="sdrRelatorioInadimplentes()" style="padding:6px 14px;font-size:.8rem;background:#dc2626;color:#fff;border-color:#b91c1c" title="Relatório de Inadimplentes"><i class="fas fa-exclamation-triangle"></i> Inadimplentes</button>'
    +'<input type="file" id="clientes-import-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="sdrImportClientes(this)">'
    +'</div>'
    +'<div id="clientes-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="clientes-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_onus = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-router" style="color:var(--primary)"></i> ONUs</h2>'
    +'<input id="onus-search" type="text" placeholder="Buscar serial, modelo..." oninput="sdrOnusFilter()" style="padding:6px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;width:200px">'
    +'<select id="onus-filter-olt" onchange="sdrOnusFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todas as OLTs</option></select>'
    +'<select id="onus-filter-status" onchange="sdrOnusFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todos Status</option><option value="online">Online</option><option value="offline">Offline</option><option value="degraded">Degradado</option></select>'
    +'<button class="btn-map" onclick="sdrOnusRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'<button class="btn-map" onclick="sdrOnuAdd()" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Nova ONU</button>'
    +'<button class="btn-map" onclick="sdrExportOnusCSV()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-csv"></i> CSV</button>'
    +'</div>'
    +'<div id="onus-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="onus-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

// Fix: search para tabela de ONUs (igual ao de clientes)
window.sdrOnusFiltrar = function(q) {
  q = (q || '').toLowerCase().trim();
  var rows = document.querySelectorAll('#onus-lista tbody tr');
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
};

// ── 8. Alertas: template melhorado com indicador de tempo real ────
window._sdrHtml_alertas = function() {
  return '<div style="max-width:1000px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-bell" style="color:#d97706"></i> Alertas de Rede</h2>'
    +'<span id="sdr-rt-indicator" style="font-size:.72rem;color:#16a34a;background:#d1fae5;padding:3px 10px;border-radius:10px;display:none"><i class="fas fa-circle" style="font-size:.55rem;margin-right:4px"></i>Tempo real ativo</span>'
    +'<button class="btn-map" onclick="sdrCheckAlerts()" style="padding:6px 14px;font-size:.8rem;background:#d97706;color:#fff;border-color:#b45309"><i class="fas fa-search"></i> Verificar Agora</button>'
    +'<button class="btn-map" onclick="sdrAlertasRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'</div>'
    +'<div id="alertas-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

// Mostrar indicador de real-time quando alertas estiver ativo
var _origAlertasShow = window.showPage;
if (typeof _origAlertasShow === 'function' && !_origAlertasShow._sdrRtPatched) {
  var _wRt = function(name) {
    _origAlertasShow(name);
    if (name === 'alertas') {
      setTimeout(function() {
        var ind = document.getElementById('sdr-rt-indicator');
        if (ind && _sdrRealtimeActive) ind.style.display = 'inline-block';
      }, 400);
    }
  };
  _wRt._sdrPatched = _wRt._sdrRtPatched = true;
  window.showPage = _wRt;
}

// Edita metragem de Reserva Técnica
window.sdrRtEditMetragem = function(id, metrosAtual) {
  var val = prompt('Metragem da Reserva Técnica (em metros):', metrosAtual || '');
  if (val === null) return;
  var metros = parseFloat(val);
  if (isNaN(metros) || metros < 0) { alert('Valor inválido. Digite apenas números.'); return; }
  sdrRef('infrastructure/' + id + '/comprimento_m').set(metros).then(function() {
    if (window.sdrInfraCache && window.sdrInfraCache[id]) {
      window.sdrInfraCache[id].comprimento_m = metros;
    }
    // Reabre o painel com valor atualizado
    if (typeof sdrOpenInfraPanel === 'function') {
      sdrOpenInfraPanel(id, window.sdrInfraCache[id] || {comprimento_m: metros});
    }
  }).catch(function(e) { alert('Erro ao salvar: ' + e.message); });
};


// ── FERRAMENTAS DE CONVERSÃO BULK ─────────────────────────────────────────
// Converte itens CEO com nome prefixado "CTO..." → "CEO..."
window.sdrConverterCtoCeo = function() {
  var infra = window.sdrInfraCache || {};
  var candidatos = Object.entries(infra).filter(function(e) {
    var i = e[1];
    return i.cto_type === 'ceo' && (i.name || '').match(/^CTO/i);
  });

  if (candidatos.length === 0) {
    alert('Nenhum item CEO com nome "CTO..." encontrado.');
    return;
  }

  if (!confirm('Converter ' + candidatos.length + ' itens:\n' +
    candidatos.slice(0,5).map(function(e){ return '  ' + e[1].name; }).join('\n') +
    (candidatos.length > 5 ? '\n  ...e mais ' + (candidatos.length - 5) : '') +
    '\n\nTrocar prefixo CTO → CEO no nome?')) return;

  var total = candidatos.length, feitos = 0, erros = 0;
  candidatos.forEach(function(entry) {
    var id = entry[0], item = entry[1];
    var novoNome = item.name.replace(/^CTO/i, 'CEO');
    sdrRef('infrastructure/' + id + '/name').set(novoNome)
      .then(function() {
        feitos++;
        window.sdrInfraCache[id].name = novoNome;
        if (feitos + erros === total) {
          alert('Conversão concluída!\n' + feitos + ' renomeados' + (erros ? ', ' + erros + ' erros' : '') + '.\nRecarregue o mapa para ver as mudanças.');
          if (typeof sdrLoadInfra === 'function') sdrLoadInfra();
        }
      })
      .catch(function() {
        erros++;
        if (feitos + erros === total) {
          alert('Concluído com ' + erros + ' erros. ' + feitos + ' renomeados.');
        }
      });
  });
};

// Converte itens RT (Reserva Técnica) com nome "RT" → nome descritivo
window.sdrConverterRtNome = function() {
  var infra = window.sdrInfraCache || {};
  // RT: items com name === 'RT' ou que começam com 'RT'
  var candidatos = Object.entries(infra).filter(function(e) {
    var i = e[1];
    return (i.name || '').match(/^RT$/i) || (i.cto_type === 'rt' && (i.name || '').match(/^RT/i));
  });

  if (candidatos.length === 0) {
    alert('Nenhum item RT encontrado.');
    return;
  }

  var novoNome = prompt(
    'Encontrados ' + candidatos.length + ' itens com nome "RT".\n' +
    'Digite o prefixo para o novo nome (ex: "Reserva Técnica"):',
    'Reserva Técnica'
  );
  if (!novoNome) return;

  var total = candidatos.length, feitos = 0, erros = 0;
  candidatos.forEach(function(entry) {
    var id = entry[0], item = entry[1];
    // Se nome é só "RT", substitui por novoNome; senão, troca prefixo RT por novoNome
    var nomeAtual = item.name || 'RT';
    var nomeFinal = nomeAtual === 'RT' ? novoNome : nomeAtual.replace(/^RT/i, novoNome);
    sdrRef('infrastructure/' + id + '/name').set(nomeFinal)
      .then(function() {
        feitos++;
        window.sdrInfraCache[id].name = nomeFinal;
        if (feitos + erros === total) {
          alert('Conversão RT concluída!\n' + feitos + ' renomeados.');
          if (typeof sdrLoadInfra === 'function') sdrLoadInfra();
        }
      })
      .catch(function() { erros++; });
  });
};


// Fecha a IIFE (function(){"use strict"; ...}) que envolve todo o codigo SDR
}());
