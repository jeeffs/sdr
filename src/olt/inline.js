/**
 * SDR — OLT Inline Panel + Chassis Preview
 * Fase 27: migrado de sdr-module.js
 *
 * Funções: sdrOltTabSwitch, sdrOltInlineRender, sdrOltChassisPreview,
 *          sdrOltBrandChange, sdrOltModelChange
 * Estado: window._sdrCordDrawMode (exposto no sdr-module.js)
 */

// Catálogo de marcas/modelos OLT (future: mover para config.js)
window.SDR_OLT_MODELS = window.SDR_OLT_MODELS || {};

window.sdrOltTabSwitch = window.sdrOltTabSwitch || function(oltId) {
  window._sdrActiveOltTab = oltId;
  window._sdrCordDrawMode = null; // cancel any draw mode on tab switch
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
    window.sdrOltInlineRender(oltId);
  }
};

// ── Render inline do painel (chassis + DGO) ──────────────────────────
window.sdrOltInlineRender = window.sdrOltInlineRender || function(oltId) {
  Promise.all([
    window.sdrRef('olt_connections/' + oltId).once('value'),
    window.sdrRef('olt_connections/' + oltId + '/pons').once('value'),
    window.sdrRef('infrastructure').once('value'),
    window.sdrRef('onus').once('value')
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
      window._sdrDrawSavedCords(oltId, pons, dgos);
      // Guardar args para redesenho automático no resize/zoom
      window._sdrLastCordArgs = { oltId: oltId, pons: pons, dgos: dgos };
    }, 300);
  });
};

// ── OLT Chassis + Lightpath + Slots (branch main) ────────────────────────
window.sdrOltChassisPreview = window.sdrOltChassisPreview || function() {
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
window.sdrOltBrandChange = window.sdrOltBrandChange || function() {
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
window.sdrOltModelChange = window.sdrOltModelChange || function() {
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
