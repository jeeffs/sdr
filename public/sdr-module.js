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
      + '<div id="map-info" style="width:260px;background:#1e293b;color:#e2e8f0;padding:12px;overflow-y:auto;font-size:.78rem">'
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
  var _sdrPageList = ['dash-rede','clientes','olts','onus','alertas','tickets'];
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
      {id:'tickets',   icon:'fa-ticket-alt',    label:'Chamados'}
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
    PAGE_TITLES['olts']      = 'OLTs \u2014 Equipamentos';
    PAGE_TITLES['onus']      = 'ONUs \u2014 Terminais de Cliente';
    PAGE_TITLES['alertas']   = 'Alertas de Rede';
    PAGE_TITLES['tickets']   = 'Chamados de Suporte';
  }
  if (typeof showPage === 'function' && !showPage._sdrPatched) {
    var _origShowPage = showPage;
    window.showPage = function(name) {
      _origShowPage(name);
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
.sdr-toolbar .tb-group {
  display:flex; gap:4px; align-items:center;
}
.sdr-toolbar .tb-sep {
  width:1px; height:24px; background:#cbd5e1; margin:0 4px;
}
`;
  document.head.appendChild(style);
})();

(function() {
'use strict';

// ── CONFIGURAÇÃO ──
const SDR_TENANT = 'default_tenant';
const SDR_BASE = `sdr_comercial/${SDR_TENANT}`;
const INFRA_TYPES = {
  pole:     {label:'Poste',    icon:'fa-bolt',         color:'#d97706', iconClass:'pole'},
  cto:      {label:'CTO',      icon:'fa-box',          color:'#2563eb', iconClass:'cto'},
  cable:    {label:'Cabo',     icon:'fa-wave-square',  color:'#16a34a', iconClass:'cable'},
  splitter: {label:'Splitter', icon:'fa-code-branch',  color:'#9333ea', iconClass:'splitter'},
  olt:      {label:'OLT',      icon:'fa-server',       color:'#dc2626', iconClass:'olt'}
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
let sdrLayerVisible = { clients: true, ctos: true, poles: true, cables: false, olts: false, heatmap: false };
let sdrInfraCache = {};
let sdrClientesCache = {};
let sdrOltsCache = {};
let sdrAlertasCache = {};

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
  sdrLayers.olts = L.layerGroup();
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
    sdrMapRenderInfra();
    sdrUpdateMapInfo();
  });
  // Carregar clientes
  sdrRef('clients').once('value').then(snap => {
    sdrClientesCache = snap.val() || {};
    sdrMapRenderClients();
    sdrUpdateMapInfo();
  });
  // Carregar OLTs
  sdrRef('olt_connections').once('value').then(snap => {
    sdrOltsCache = snap.val() || {};
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
    marker.bindPopup(`<b>${c.name||'Cliente'}</b><br>${c.plan_name||''}<br>${c.financial_status||''}`);
    marker.on('click', () => window.sdrOpenClientePanel(id, c));
    sdrLayers.clients.addLayer(marker);
  });
}

function sdrMapRenderOlts() {
  sdrLayers.olts.clearLayers();
  Object.entries(sdrOltsCache).forEach(([id, o]) => {
    if (!o || !o.lat || !o.lng) return;
    const marker = L.marker([o.lat, o.lng], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: `<div class="marker-icon olt"><i class="fas fa-server"></i></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    marker.bindPopup(`<b>${o.name||'OLT'}</b><br>${o.model||''}<br>IP: ${o.ip_address||''}`);
    sdrLayers.olts.addLayer(marker);
  });
}

function _infraPopup(id, item) {
  const cfg = INFRA_TYPES[item.type] || INFRA_TYPES.pole;
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
  const cfg = INFRA_TYPES[item.type] || INFRA_TYPES.pole;
  const spTitle = document.getElementById('sp-title');
  const spBody = document.getElementById('sp-body');
  const spPanel = document.getElementById('sdr-side-panel');
  if (!spTitle || !spBody || !spPanel) { console.warn('[SDR] Side panel elements not found'); return; }
  spTitle.textContent = `${cfg.label}: ${item.name||item.code||''}`;
  let html = '';

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
        <select id="sdr-f-type" ${isEdit?'disabled':''}>
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

  // Campos extras por tipo
  const typeSelect = document.getElementById('sdr-f-type');
  function updateExtras() {
    const t = typeSelect.value;
    let ex = '';
    if (t === 'cto' || t === 'splitter') {
      ex = `<div style="display:flex;gap:10px">
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
    const tp = document.getElementById('sdr-f-total-ports');
    const up = document.getElementById('sdr-f-used-ports');
    if (tp) data.total_ports = parseInt(tp.value) || 0;
    if (up) data.used_ports = parseInt(up.value) || 0;
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
      await sdrRef(`infrastructure/${editId}`).update(data);
      toast('Atualizado com sucesso!','success');
    } else {
      // Se for OLT, salvar em olt_connections também
      if (type === 'olt') {
        const oltData = { name: data.name, model: data.model, ip_address: data.ip_address,
          snmp_community: data.snmp_community, snmp_version: 'v2c',
          lat: data.lat, lng: data.lng, total_pon_ports: data.total_pon_ports,
          is_active: true, created_at: data.created_at };
        const oltRef = await sdrRef('olt_connections').push(oltData);
        data.olt_connection_id = oltRef.key;
      }
      await sdrRef('infrastructure').push(data);
      toast('Cadastrado com sucesso!','success');
    }
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

    return `<div class="infra-card" onclick="sdrOpenInfraPanel('${id}',sdrInfraCache['${id}'])">
      <div class="ic-top">
        <div class="ic-icon ${cfg.iconClass}"><i class="fas ${cfg.icon}"></i></div>
        <div>
          <div class="ic-name">${item.name||item.code||id}</div>
          <div class="ic-type">${cfg.label}${item.code?' | '+item.code:''}</div>
        </div>
      </div>
      ${detail?`<div class="ic-detail">${detail}</div>`:''}
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
    _renderClientesLista();
  });
};

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
      return `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="sdrOpenClientePanel('${id}',sdrClientesCache['${id}'])">
        <td style="padding:8px 10px;font-weight:600">${c.name||'-'}</td>
        <td style="padding:8px 10px">${c.plan_name||'-'} ${c.plan_speed_down?c.plan_speed_down+'M':''}</td>
        <td style="padding:8px 10px">${fBadge}</td>
        <td style="padding:8px 10px">${onuBadge}</td>
        <td style="padding:8px 10px">${rxBadge}</td>
        <td style="padding:8px 10px"><button class="btn-map" onclick="event.stopPropagation();sdrMapFlyToClient('${id}')" style="padding:4px 8px;font-size:.75rem"><i class="fas fa-map-pin"></i></button></td>
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

// ════════════════════════════════════════════════════
// PÁGINA OLTs
// ════════════════════════════════════════════════════

window.sdrOltsRender = function() {
  sdrRef('olt_connections').once('value').then(snap => {
    sdrOltsCache = snap.val() || {};
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
// SPRINT 3 — OLTs CRUD MELHORADO
// ════════════════════════════════════════════════════

let sdrOnusCache = {};

// Sobrescrever render de OLTs com versão Sprint 3 (stats + CRUD dedicado)
window.sdrOltsRender = function() {
  Promise.all([
    sdrRef('olt_connections').once('value'),
    sdrRef('onus').once('value')
  ]).then(([oltSnap, onuSnap]) => {
    sdrOltsCache = oltSnap.val() || {};
    sdrOnusCache = onuSnap.val() || {};

    // Stats
    const olts = Object.values(sdrOltsCache);
    const statsEl = document.getElementById('olts-stats');
    if (statsEl) {
      const total = olts.length;
      const ativas = olts.filter(o => o.is_active).length;
      const totalPON = olts.reduce((s, o) => s + (o.total_pon_ports || 0), 0);
      const totalOnus = Object.values(sdrOnusCache).length;
      statsEl.innerHTML = `
        <div class="infra-stat"><div class="is-num">${total}</div><div class="is-label">OLTs</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#16a34a">${ativas}</div><div class="is-label">Ativas</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#2563eb">${totalPON}</div><div class="is-label">Portas PON</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#7c3aed">${totalOnus}</div><div class="is-label">ONUs</div></div>`;
    }

    const el = document.getElementById('olts-lista');
    if (!el) return;
    const items = Object.entries(sdrOltsCache);
    if (items.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
        <i class="fas fa-server" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:.4"></i>
        <p>Nenhuma OLT cadastrada</p>
        <button class="btn-primary" onclick="sdrOltAddModal()" style="margin-top:8px"><i class="fas fa-plus"></i> Cadastrar primeira OLT</button>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="infra-grid">${items.map(([id, o]) => {
      const onusThisOlt = Object.values(sdrOnusCache).filter(u => u.olt_id === id);
      const online = onusThisOlt.filter(u => u.status === 'online').length;
      const total = onusThisOlt.length;
      return `
      <div class="infra-card" style="cursor:pointer" onclick="sdrOpenOltPanel('${id}')">
        <div class="ic-top">
          <div class="ic-icon olt"><i class="fas fa-server"></i></div>
          <div>
            <div class="ic-name">${o.name || id}</div>
            <div class="ic-type">${o.model || 'OLT Fiberhome'}</div>
          </div>
          <span style="margin-left:auto">
            <span class="signal-badge ${o.is_active ? 'good' : 'off'}">${o.is_active ? 'Ativa' : 'Inativa'}</span>
          </span>
        </div>
        <div class="ic-detail">IP: <b>${o.ip_address || '-'}</b> | SNMP: ${o.snmp_community || '-'} | PON: ${o.total_pon_ports || '-'}</div>
        <div style="display:flex;gap:12px;margin-top:8px;font-size:.78rem">
          <span><i class="fas fa-wifi" style="color:#7c3aed"></i> ${total} ONUs</span>
          <span><i class="fas fa-circle" style="color:#16a34a;font-size:.5rem;vertical-align:middle"></i> ${online} online</span>
          ${o.last_poll_at ? `<span style="color:var(--muted)"><i class="fas fa-clock"></i> ${new Date(o.last_poll_at).toLocaleString('pt-BR')}</span>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;

    // Atualizar filtro de OLTs na página ONUs
    const oltFilter = document.getElementById('onus-filter-olt');
    if (oltFilter) {
      const current = oltFilter.value;
      oltFilter.innerHTML = '<option value="">Todas OLTs</option>' +
        items.map(([id, o]) => `<option value="${id}" ${id === current ? 'selected' : ''}>${o.name || id}</option>`).join('');
    }
  });
};

// Modal dedicado para OLT
window.sdrOltAddModal = function(editId) {
  const d = editId ? sdrOltsCache[editId] || {} : {};
  const isEdit = !!editId;

  let html = `<div class="modal-overlay" id="sdr-modal" onclick="if(event.target===this)this.remove()">
    <div class="modal-box">
      <div class="modal-header">
        <h3><i class="fas fa-server" style="color:#dc2626;margin-right:8px"></i>${isEdit ? 'Editar' : 'Nova'} OLT</h3>
        <button onclick="document.getElementById('sdr-modal').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Nome</label><input id="sdr-olt-name" value="${d.name || ''}" placeholder="Ex: OLT-01 Central"></div>
        <div class="form-group"><label>Modelo</label><input id="sdr-olt-model" value="${d.model || ''}" placeholder="Ex: Fiberhome AN5516-04"></div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>IP Address</label><input id="sdr-olt-ip" value="${d.ip_address || ''}" placeholder="Ex: 192.168.1.100"></div>
          <div class="form-group" style="flex:1"><label>Portas PON</label><input id="sdr-olt-pon" type="number" value="${d.total_pon_ports || 8}"></div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>SNMP Community</label><input id="sdr-olt-snmp" value="${d.snmp_community || 'public'}" placeholder="public"></div>
          <div class="form-group" style="flex:1"><label>Versão SNMP</label>
            <select id="sdr-olt-snmpv">
              <option value="2c" ${d.snmp_version !== '3' ? 'selected' : ''}>v2c</option>
              <option value="3" ${d.snmp_version === '3' ? 'selected' : ''}>v3</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="form-group" style="flex:1"><label>Latitude</label><input id="sdr-olt-lat" type="number" step="any" value="${d.lat || ''}"></div>
          <div class="form-group" style="flex:1"><label>Longitude</label><input id="sdr-olt-lng" type="number" step="any" value="${d.lng || ''}"></div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="sdr-olt-active" ${d.is_active !== false ? 'checked' : ''}> OLT Ativa
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="document.getElementById('sdr-modal').remove()">Cancelar</button>
        <button class="btn-primary" onclick="sdrOltSave('${editId || ''}')">${isEdit ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('sdr-modal').classList.add('open');
};

window.sdrOltSave = async function(editId) {
  const name = document.getElementById('sdr-olt-name').value.trim();
  if (!name) { toast('Nome é obrigatório', 'error'); return; }

  const data = {
    name,
    model: document.getElementById('sdr-olt-model').value.trim(),
    ip_address: document.getElementById('sdr-olt-ip').value.trim(),
    total_pon_ports: parseInt(document.getElementById('sdr-olt-pon').value) || 8,
    snmp_community: document.getElementById('sdr-olt-snmp').value.trim() || 'public',
    snmp_version: document.getElementById('sdr-olt-snmpv').value,
    is_active: document.getElementById('sdr-olt-active').checked,
    updated_at: new Date().toISOString()
  };
  const lat = parseFloat(document.getElementById('sdr-olt-lat').value);
  const lng = parseFloat(document.getElementById('sdr-olt-lng').value);
  if (!isNaN(lat)) data.lat = lat;
  if (!isNaN(lng)) data.lng = lng;

  if (!editId) data.created_at = new Date().toISOString();

  try {
    if (editId) {
      await sdrRef(`olt_connections/${editId}`).update(data);
      toast('OLT atualizada!', 'success');
    } else {
      await sdrRef('olt_connections').push(data);
      toast('OLT cadastrada!', 'success');
    }
    document.getElementById('sdr-modal').remove();
    sdrOltsRender();
  } catch (e) {
    toast('Erro: ' + e.message, 'error');
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

  html += `<div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn-primary" onclick="sdrOltAddModal('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    <button class="btn-danger" onclick="sdrOltDelete('${id}')" style="padding:8px 16px"><i class="fas fa-trash"></i></button>
  </div>`;

  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
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
      return `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="sdrOpenOnuPanel('${id}')">
        <td style="padding:8px 10px;font-family:monospace;font-weight:600">${u.serial_number || '-'}</td>
        <td style="padding:8px 10px"><span class="signal-badge ${statusBadge}">${u.status || '?'}</span></td>
        <td style="padding:8px 10px">${u.rx_power != null ? `<span class="signal-badge ${rxBadge}">${u.rx_power} dBm</span>` : '-'}</td>
        <td style="padding:8px 10px">${client ? client.name : '<span style="color:var(--muted)">sem vínculo</span>'}</td>
        <td style="padding:8px 10px">${olt ? olt.name : '-'}</td>
        <td style="padding:8px 10px">${u.pon_port || '-'}</td>
        <td style="padding:8px 10px"><button class="btn-map" onclick="event.stopPropagation();sdrOnuEdit('${id}')" style="padding:4px 8px;font-size:.75rem"><i class="fas fa-edit"></i></button></td>
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

// Hook heatmap render into map reload
const _origMapReload = sdrMapReloadData;
sdrMapReloadData = function() {
  _origMapReload();
  // Render heatmap after clients load
  setTimeout(sdrRenderHeatmap, 500);
};

// ── 4B: DASHBOARD REDE COM GRÁFICOS ──
let sdrChartInstances = {};

window.sdrDashRedeRender = function() {
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

    // Stats KPIs
    const statsEl = document.getElementById('dash-rede-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="infra-stat"><div class="is-num">${clientsArr.length}</div><div class="is-label">Clientes</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#16a34a">${onlineClients.length}</div><div class="is-label">Online</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#d97706">${degradedClients.length}</div><div class="is-label">Degradados</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#dc2626">${offlineClients.length}</div><div class="is-label">Offline</div></div>
        <div class="infra-stat"><div class="is-num">${onus.length}</div><div class="is-label">ONUs</div></div>
        <div class="infra-stat"><div class="is-num">${olts.length}</div><div class="is-label">OLTs</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#dc2626">${activeAlerts.length}</div><div class="is-label">Alertas</div></div>
        <div class="infra-stat"><div class="is-num" style="color:#2563eb">${openTickets.length}</div><div class="is-label">Tickets</div></div>`;
    }

    // ── Gráfico 1: Status da Rede (Donut) ──
    _sdrDestroyChart('chart-status-rede');
    const ctxStatus = document.getElementById('chart-status-rede');
    if (ctxStatus) {
      sdrChartInstances['chart-status-rede'] = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Online', 'Degradado', 'Offline', 'Sem ONU'],
          datasets: [{
            data: [
              onlineClients.length,
              degradedClients.length,
              offlineClients.length,
              clientsArr.filter(c => !c.onu_status || c.onu_status === '').length
            ],
            backgroundColor: ['#16a34a', '#d97706', '#dc2626', '#94a3b8']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Status da Rede', font: { size: 14 } },
            legend: { position: 'bottom', labels: { font: { size: 11 } } }
          }
        }
      });
    }

    // ── Gráfico 2: Distribuição de Sinal (Barras) ──
    _sdrDestroyChart('chart-signal-dist');
    const ctxSignal = document.getElementById('chart-signal-dist');
    if (ctxSignal) {
      const ranges = { 'Excelente (>-20)':0, 'Bom (-20 a -25)':0, 'Regular (-25 a -28)':0, 'Ruim (<-28)':0, 'Sem dados':0 };
      clientsArr.forEach(c => {
        if (c.rx_power == null) { ranges['Sem dados']++; return; }
        const rx = parseFloat(c.rx_power);
        if (rx > -20) ranges['Excelente (>-20)']++;
        else if (rx > -25) ranges['Bom (-20 a -25)']++;
        else if (rx > -28) ranges['Regular (-25 a -28)']++;
        else ranges['Ruim (<-28)']++;
      });
      sdrChartInstances['chart-signal-dist'] = new Chart(ctxSignal, {
        type: 'bar',
        data: {
          labels: Object.keys(ranges),
          datasets: [{
            label: 'Clientes',
            data: Object.values(ranges),
            backgroundColor: ['#16a34a', '#22c55e', '#eab308', '#dc2626', '#94a3b8']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Distribuição de Sinal Rx', font: { size: 14 } },
            legend: { display: false }
          },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }

    // ── Gráfico 3: Capacidade CTOs (Barras horizontais) ──
    _sdrDestroyChart('chart-cto-capacity');
    const ctxCto = document.getElementById('chart-cto-capacity');
    if (ctxCto) {
      const ctos = infraArr.filter(i => i.type === 'cto' || i.type === 'splitter');
      const ctoNames = [];
      const ctoOccupied = [];
      const ctoFree = [];
      ctos.slice(0, 10).forEach(cto => {
        const ports = parseInt(cto.ports) || 8;
        const linked = clientsArr.filter(c => c.cto_id && Object.keys(infra).find(k => infra[k] === cto && k === c.cto_id)).length;
        ctoNames.push(cto.name || cto.code || 'CTO');
        ctoOccupied.push(linked);
        ctoFree.push(Math.max(0, ports - linked));
      });
      sdrChartInstances['chart-cto-capacity'] = new Chart(ctxCto, {
        type: 'bar',
        data: {
          labels: ctoNames.length > 0 ? ctoNames : ['Nenhuma CTO'],
          datasets: [
            { label: 'Ocupadas', data: ctoOccupied.length > 0 ? ctoOccupied : [0], backgroundColor: '#3b82f6' },
            { label: 'Livres', data: ctoFree.length > 0 ? ctoFree : [0], backgroundColor: '#e2e8f0' }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            title: { display: true, text: 'Capacidade de CTOs (Top 10)', font: { size: 14 } },
            legend: { position: 'bottom', labels: { font: { size: 11 } } }
          },
          scales: { x: { stacked: true, beginAtZero: true }, y: { stacked: true } }
        }
      });
    }

    // ── Gráfico 4: Alertas últimos 7 dias (Linha) ──
    _sdrDestroyChart('chart-alerts-week');
    const ctxAlerts = document.getElementById('chart-alerts-week');
    if (ctxAlerts) {
      const days = [];
      const alertCounts = [];
      const ticketCounts = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
        days.push(label);
        alertCounts.push(alerts.filter(a => (a.created_at || '').startsWith(dateStr)).length);
        ticketCounts.push(tickets.filter(t => (t.created_at || '').startsWith(dateStr)).length);
      }
      sdrChartInstances['chart-alerts-week'] = new Chart(ctxAlerts, {
        type: 'line',
        data: {
          labels: days,
          datasets: [
            { label: 'Alertas', data: alertCounts, borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', fill: true, tension: 0.3 },
            { label: 'Tickets', data: ticketCounts, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Alertas e Tickets — Últimos 7 Dias', font: { size: 14 } },
            legend: { position: 'bottom', labels: { font: { size: 11 } } }
          },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }

    // ── Tabelas (mantidas do Sprint 3) ──
    const contentEl = document.getElementById('dash-rede-content');
    if (contentEl) {
      const worstSignal = clientsArr.filter(c => c.rx_power != null).sort((a,b) => a.rx_power - b.rx_power).slice(0, 10);
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

      if (activeAlerts.length > 0) {
        html += `<div style="margin-top:20px"><h4 style="font-size:.9rem;margin-bottom:10px"><i class="fas fa-bell" style="color:#d97706;margin-right:6px"></i>Alertas Ativos</h4>`;
        activeAlerts.slice(0, 5).forEach(a => {
          const color = {info:'#2563eb',warning:'#d97706',critical:'#dc2626'}[a.severity]||'#2563eb';
          html += `<div style="padding:8px 12px;border-left:3px solid ${color};background:#fafbfc;border-radius:0 6px 6px 0;margin-bottom:6px;font-size:.82rem">
            <b>${a.title||'Alerta'}</b><br><span style="color:var(--muted)">${a.message||''}</span></div>`;
        });
        html += `</div>`;
      }

      contentEl.innerHTML = html || '<p style="color:var(--muted);text-align:center;padding:20px">Cadastre clientes e infraestrutura para ver o dashboard completo.</p>';
    }
  });
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

  const modal = document.getElementById('sdr-modal');
  modal.innerHTML = `<div style="background:#fff;border-radius:12px;padding:24px;width:520px;max-height:85vh;overflow-y:auto;position:relative">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0;font-size:1rem"><i class="fas fa-headset" style="color:var(--primary);margin-right:6px"></i>${isEdit ? 'Editar' : 'Novo'} Ticket</h3>
      <button onclick="document.getElementById('sdr-modal').style.display='none'" style="border:none;background:none;font-size:1.3rem;cursor:pointer;color:var(--muted)">&times;</button>
    </div>
    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#64748b;display:block;margin-bottom:4px">Título</label>
    <input id="tk-title" value="${d.title||''}" placeholder="Ex: ONU offline no cliente X" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:12px;font-size:.85rem">
    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#64748b;display:block;margin-bottom:4px">Descrição</label>
    <textarea id="tk-desc" rows="3" placeholder="Detalhes do problema..." style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:12px;font-size:.85rem;resize:vertical">${d.description||''}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#64748b;display:block;margin-bottom:4px">Prioridade</label>
        <select id="tk-priority" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem">
          <option value="low" ${d.priority==='low'?'selected':''}>Baixa</option>
          <option value="medium" ${d.priority==='medium'||!d.priority?'selected':''}>Média</option>
          <option value="high" ${d.priority==='high'?'selected':''}>Alta</option>
          <option value="critical" ${d.priority==='critical'?'selected':''}>Crítica</option>
        </select>
      </div>
      <div>
        <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#64748b;display:block;margin-bottom:4px">Status</label>
        <select id="tk-status" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem">
          <option value="aberto" ${d.status==='aberto'||!d.status?'selected':''}>Aberto</option>
          <option value="em_andamento" ${d.status==='em_andamento'?'selected':''}>Em Andamento</option>
          <option value="aguardando" ${d.status==='aguardando'?'selected':''}>Aguardando</option>
          <option value="resolvido" ${d.status==='resolvido'?'selected':''}>Resolvido</option>
        </select>
      </div>
    </div>
    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#64748b;display:block;margin:12px 0 4px">Cliente</label>
    <select id="tk-client" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem">${clientOpts}</select>
    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#64748b;display:block;margin:12px 0 4px">Tipo</label>
    <select id="tk-type" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem">
      <option value="sem_sinal" ${d.type==='sem_sinal'?'selected':''}>Sem Sinal / ONU Offline</option>
      <option value="sinal_baixo" ${d.type==='sinal_baixo'?'selected':''}>Sinal Baixo / Degradado</option>
      <option value="lentidao" ${d.type==='lentidao'?'selected':''}>Lentidão</option>
      <option value="queda_frequente" ${d.type==='queda_frequente'?'selected':''}>Quedas Frequentes</option>
      <option value="instalacao" ${d.type==='instalacao'?'selected':''}>Instalação</option>
      <option value="mudanca_endereco" ${d.type==='mudanca_endereco'?'selected':''}>Mudança de Endereço</option>
      <option value="infra" ${d.type==='infra'?'selected':''}>Infraestrutura</option>
      <option value="outro" ${d.type==='outro'||!d.type?'selected':''}>Outro</option>
    </select>
    <label style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#64748b;display:block;margin:12px 0 4px">Observações</label>
    <textarea id="tk-notes" rows="2" placeholder="Notas internas..." style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:16px;font-size:.85rem;resize:vertical">${d.notes||''}</textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="document.getElementById('sdr-modal').style.display='none'" style="padding:8px 16px;border:1px solid #e2e8f0;background:#fff;border-radius:6px;cursor:pointer;font-size:.85rem">Cancelar</button>
      <button onclick="sdrTicketSave('${editId||''}')" class="btn-primary" style="padding:8px 20px;font-size:.85rem"><i class="fas fa-save" style="margin-right:4px"></i>${isEdit ? 'Salvar' : 'Criar Ticket'}</button>
    </div>
  </div>`;
  modal.style.display = 'flex';
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
    document.getElementById('sdr-modal').style.display = 'none';
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
    <button onclick="sdrTicketDelete('${id}')" style="padding:6px 14px;font-size:.82rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;cursor:pointer"><i class="fas fa-trash" style="margin-right:4px"></i>Excluir</button>
  </div>`;

  document.getElementById('sp-title').textContent = 'Ticket #' + id.substring(0,6);
  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
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

window.sdrDrawModeToggle = function() {
  if (!sdrMapReady || !sdrMap) { toast('Aguarde o mapa carregar', 'warning'); return; }
  if (document.getElementById('sdr-draw-panel')) { window._sdrCloseDrawMode(); return; }
  _sdrOpenDrawPanel();
};

function _sdrOpenDrawPanel() {
  const btn = document.getElementById('btn-draw-mode');
  if (btn) { btn.style.background = '#2563eb'; btn.innerHTML = '<i class="fas fa-times"></i> Fechar'; }
  const mapContainer = document.getElementById('sdr-map');
  if (!mapContainer) return;
  const panel = document.createElement('div');
  panel.id = 'sdr-draw-panel';
  panel.style.cssText = 'position:absolute;top:60px;left:10px;z-index:1000;background:#1e293b;color:#f1f5f9;border-radius:10px;padding:14px;width:230px;box-shadow:0 4px 24px rgba(0,0,0,.6);font-family:sans-serif';
  panel.innerHTML =
    '<div style="font-weight:700;margin-bottom:12px;font-size:.88rem;color:#94a3b8"><i class="fas fa-draw-polygon"></i>&nbsp; MODO DESENHO — FTTH</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<button onclick="window._sdrStartDraw(\'cable\')" style="background:#0ea5e9;color:#fff;border:none;padding:9px 12px;border-radius:7px;cursor:pointer;text-align:left;font-size:.82rem">' +
        '<i class="fas fa-minus"></i> <b>Cabo de Fibra Óptica</b><br><span style="font-size:.71rem;opacity:.8">Clique pontos • duplo-clique finaliza</span>' +
      '</button>' +
      '<button onclick="window._sdrStartDraw(\'cto\')" style="background:#7c3aed;color:#fff;border:none;padding:9px 12px;border-radius:7px;cursor:pointer;text-align:left;font-size:.82rem">' +
        '<i class="fas fa-circle"></i> <b>CTO / Splitter</b><br><span style="font-size:.71rem;opacity:.8">Clique para posicionar no mapa</span>' +
      '</button>' +
      '<button onclick="window._sdrStartDraw(\'area\')" style="background:#059669;color:#fff;border:none;padding:9px 12px;border-radius:7px;cursor:pointer;text-align:left;font-size:.82rem">' +
        '<i class="fas fa-vector-square"></i> <b>Área de Cobertura</b><br><span style="font-size:.71rem;opacity:.8">Clique pontos • duplo-clique fecha</span>' +
      '</button>' +
    '</div>' +
    '<div id="sdr-draw-hint" style="margin-top:12px;font-size:.73rem;color:#64748b;min-height:28px;line-height:1.4"></div>' +
    '<button onclick="window._sdrCloseDrawMode()" style="margin-top:10px;width:100%;background:#ef4444;color:#fff;border:none;padding:7px;border-radius:7px;cursor:pointer;font-size:.79rem">' +
      '<i class="fas fa-times"></i> Cancelar / Fechar' +
    '</button>';
  mapContainer.appendChild(panel);
}

window._sdrCloseDrawMode = function() {
  _sdrCancelCurrentDraw();
  const panel = document.getElementById('sdr-draw-panel');
  if (panel) panel.remove();
  const btn = document.getElementById('btn-draw-mode');
  if (btn) { btn.style.background = ''; btn.innerHTML = '<i class="fas fa-pencil-alt"></i> Desenhar'; }
  sdrDrawModeActive = false;
  _sdrDrawCurrentMode = null;
  if (sdrMap) sdrMap.getContainer().style.cursor = '';
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
window._sdrHtml_dash_rede = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> Dashboard de Rede</h2>'
    +'<button class="btn-map" onclick="sdrDashRedeRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'</div>'
    +'<div id="dash-kpi-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:20px">'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#dbeafe"><i class="fas fa-users" style="color:#2563eb"></i></div><div class="sdr-kpi-val" id="kpi-clientes-val">-</div><div class="sdr-kpi-lbl">Clientes</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#dcfce7"><i class="fas fa-wifi" style="color:#16a34a"></i></div><div class="sdr-kpi-val" id="kpi-online-val" style="color:#16a34a">-</div><div class="sdr-kpi-lbl">Online</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#fee2e2"><i class="fas fa-wifi" style="color:#dc2626"></i></div><div class="sdr-kpi-val" id="kpi-offline-val" style="color:#dc2626">-</div><div class="sdr-kpi-lbl">Offline</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#ede9fe"><i class="fas fa-server" style="color:#7c3aed"></i></div><div class="sdr-kpi-val" id="kpi-olts-val">-</div><div class="sdr-kpi-lbl">OLTs Ativas</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#fff7ed"><i class="fas fa-bell" style="color:#d97706"></i></div><div class="sdr-kpi-val" id="kpi-alertas-val" style="color:#d97706">-</div><div class="sdr-kpi-lbl">Alertas</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#fdf4ff"><i class="fas fa-ticket-alt" style="color:#9333ea"></i></div><div class="sdr-kpi-val" id="kpi-tickets-val">-</div><div class="sdr-kpi-lbl">Chamados</div></div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">'
    +'<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)"><div style="font-weight:700;font-size:.88rem;margin-bottom:12px;color:#374151">Status das ONUs</div><canvas id="dash-chart-onus" height="180"></canvas></div>'
    +'<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)"><div style="font-weight:700;font-size:.88rem;margin-bottom:12px;color:#374151">Chamados por Status</div><canvas id="dash-chart-tickets" height="180"></canvas></div>'
    +'</div>'
    +'<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">'
    +'<div style="font-weight:700;font-size:.88rem;margin-bottom:12px;color:#374151"><i class="fas fa-bell" style="color:#d97706"></i> Alertas Recentes</div>'
    +'<div id="dash-alertas-recentes"><div style="color:var(--muted);text-align:center;padding:20px">Carregando...</div></div>'
    +'</div></div>';
};

window._sdrHtml_clientes = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-users" style="color:var(--primary)"></i> Clientes FTTH</h2>'
    +'<input id="clientes-busca" type="text" placeholder="Buscar cliente..." oninput="sdrClientesFiltrar(this.value)" style="padding:6px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;width:220px">'
    +'<button class="btn-map" onclick="sdrClienteAdd()" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Novo</button>'
    +'<button class="btn-map" onclick="document.getElementById(\'clientes-import-input\').click()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-import"></i> Importar</button>'
    +'<button class="btn-map" onclick="sdrAutoLinkCTO()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-link"></i> Auto-Link CTO</button>'
    +'<input type="file" id="clientes-import-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="sdrImportClientes(this)">'
    +'</div>'
    +'<div id="clientes-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="clientes-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_olts = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-server" style="color:var(--primary)"></i> OLTs</h2>'
    +'<button class="btn-map" onclick="sdrOltsRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'<button class="btn-map" onclick="sdrOltAddModal(null)" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Nova OLT</button>'
    +'</div>'
    +'<div id="olts-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_onus = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-router" style="color:var(--primary)"></i> ONUs</h2>'
    +'<select id="onus-filtro-olt" onchange="sdrOnusRender()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todas as OLTs</option></select>'
    +'<select id="onus-filtro-status" onchange="sdrOnusRender()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todos os Status</option><option value="online">Online</option><option value="offline">Offline</option><option value="degraded">Degradado</option></select>'
    +'<button class="btn-map" onclick="sdrOnusRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
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
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-ticket-alt" style="color:var(--primary)"></i> Chamados de Suporte</h2>'
    +'<select id="tickets-filtro-status" onchange="sdrTicketsFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todos</option><option value="aberto">Abertos</option><option value="em_andamento">Em Andamento</option><option value="resolvido">Resolvidos</option></select>'
    +'<button class="btn-map" onclick="sdrTicketsRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
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
    '#page-olts{display:none!important}#page-olts.active{display:block!important}',
    '#page-onus{display:none!important}#page-onus.active{display:block!important}',
    '#page-alertas{display:none!important}#page-alertas.active{display:block!important}',
    '#page-tickets{display:none!important}#page-tickets.active{display:block!important}'
  ].join('');
  document.head.appendChild(st);
})();

// Fecha a IIFE (function(){"use strict"; ...}) que envolve todo o codigo SDR
}());
