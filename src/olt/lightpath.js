/**
 * SDR — OLT Lightpath Modal + LP Helper Functions
 * Fase 28: migrado de sdr-module.js
 *
 * Funções: sdrOltLightpathModal, sdrLpHighlight, sdrLpPonSelect,
 *          _sdrLpCancelSelect, sdrLpFiberConnect, sdrLpDisconnect
 * Helpers internos: _sdrInjectLightCSS, _dbtS, _sdrDrawAllCords
 */

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

window.sdrOltLightpathModal = window.sdrOltLightpathModal || function(oltId) {
  _sdrInjectLightCSS();
  var _inlineEl = document.getElementById('olt-panel-content');
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
window.sdrLpHighlight = window.sdrLpHighlight || function(type, id) {
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
window.sdrLpPonSelect = window.sdrLpPonSelect || function(oltId, sl, po) {
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
window._sdrLpCancelSelect = window._sdrLpCancelSelect || function() {
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
window.sdrLpFiberConnect = window.sdrLpFiberConnect || function(oltId, did, t, f) {
  if (!_sdrLpConnState) return; // só age se houver PON selecionada
  var sl = _sdrLpConnState.sl, po = _sdrLpConnState.po;
  var fkey = 't' + t + 'f' + f;
  var ponKey = 's' + sl + '_p' + po;
  var ponRef   = window.sdrRef('olt_connections/' + oltId + '/pons/' + ponKey);
  var fiberRef = window.sdrRef('infrastructure/' + did + '/fibers/' + fkey);
  // Libera fibra anterior desta PON, se houver
  ponRef.once('value').then(function(snap) {
    var prev = snap.val() || {};
    var chain = Promise.resolve();
    if (prev.dgo_id && prev.dgo_fiber_key) {
      chain = window.sdrRef('infrastructure/' + prev.dgo_id + '/fibers/' + prev.dgo_fiber_key)
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
window.sdrLpDisconnect = window.sdrLpDisconnect || function(oltId, sl, po) {
  if (!confirm('Desconectar Slot ' + sl + ' PON ' + po + '?\nA fibra do DGO ficará livre.')) return;
  var ponKey = 's' + sl + '_p' + po;
  var ponRef = window.sdrRef('olt_connections/' + oltId + '/pons/' + ponKey);
  ponRef.once('value').then(function(snap) {
    var cfg = snap.val() || {};
    var chain = Promise.resolve();
    if (cfg.dgo_id && cfg.dgo_fiber_key) {
      chain = window.sdrRef('infrastructure/' + cfg.dgo_id + '/fibers/' + cfg.dgo_fiber_key)
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
