/**
 * SDR — OLT Visual · PON Config · DGO 144 · Fase 25
 * Extração do sdr-module.js:
 *   sdrOltVisualModal, sdrPonConfig, sdrPonDgoChange, sdrPonSave,
 *   sdrPonSelectFiber, sdrDgo144Modal, sdrDgo144View, sdrFiberSelect,
 *   sdrDgoCriarModal, sdrDgoCalc, sdrDgoSalvar, sdrOltSlotAdd
 *
 * Dependências window:
 *   sdrRef, sdrOltsCache (read), sdrOltInlineRender, _sdrActiveOltTab,
 *   sdrDgoCriarModal, sdrOltSlotAdd, sdrPonConfig, sdrDgo144View,
 *   sdrFiberSelect, sdrPonSave, sdrDgo144Modal, sdrPonSelectFiber,
 *   sdrDgoSalvar, sdrOltVisualModal
 */

window.sdrOltVisualModal = window.sdrOltVisualModal || function(oltId) {
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
      + '<button class="btn-map" onclick="window.sdrDgoCriarModal(\'' + oltId + '\')" style="padding:4px 10px;font-size:.74rem"><i class="fas fa-plus"></i> Novo DGO</button>'
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
window.sdrPonConfig = window.sdrPonConfig || function(oltId, slot, port) {
  window.sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port).once('value').then(function(ponSnap) {
    var cfg = ponSnap.val() || {};
    window.sdrRef('infrastructure').once('value').then(function(infraSnap) {
      var infra = infraSnap.val() || {};
      var dgoOpts = '<option value="">— Sem DGO —</option>'
        + Object.entries(infra).filter(function(e){ return e[1] && e[1].type === 'dgo'; }).map(function(e) {
          return '<option value="' + e[0] + '"' + (cfg.dgo_id === e[0] ? ' selected' : '') + '>' + (e[1].nome || e[0]) + ' (' + ((e[1].tube_count||12)*(e[1].fiber_per_tube||12)) + ' fibras)</option>';
        }).join('');

      var fiberInfo = cfg.dgo_fiber_key
        ? '<div id="pon-fiber-info" style="margin-top:8px;font-size:.8rem;color:#065f46;padding:8px 12px;background:#d1fae5;border-radius:6px;display:flex;align-items:center;gap:8px">'
          + '<i class="fas fa-link"></i> Fibra conectada: <b>' + cfg.dgo_fiber_key + '</b>'
          + '<button onclick="window.sdrPonSelectFiber(\'' + oltId + '\',' + slot + ',' + port + ')" style="margin-left:auto;padding:2px 8px;font-size:.72rem;border:1px solid #059669;border-radius:4px;background:#fff;color:#059669;cursor:pointer"><i class="fas fa-exchange-alt"></i> Trocar</button>'
          + '</div>'
        : '<div id="pon-fiber-info" style="margin-top:8px;display:' + (cfg.dgo_id ? 'block' : 'none') + '">'
          + '<button onclick="window.sdrPonSelectFiber(\'' + oltId + '\',' + slot + ',' + port + ')" style="width:100%;padding:7px;font-size:.8rem;border:1px solid #d97706;border-radius:6px;background:#fef3c7;color:#92400e;cursor:pointer"><i class="fas fa-link"></i> Selecionar fibra no DGO</button>'
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
        + '<div class="form-group"><label>DGO de Saída (cordão)</label><select id="pon-dgo" onchange="window.sdrPonDgoChange()">' + dgoOpts + '</select></div>'
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

window.sdrPonDgoChange = window.sdrPonDgoChange || function() {
  var el = document.getElementById('pon-dgo');
  var info = document.getElementById('pon-fiber-info');
  if (info && el) info.style.display = el.value ? 'block' : 'none';
};

window.sdrPonSave = window.sdrPonSave || function(oltId, slot, port) {
  var active = document.getElementById('pon-active').checked;
  var label  = document.getElementById('pon-label').value.trim();
  var speed  = document.getElementById('pon-speed').value;
  var vlan   = document.getElementById('pon-vlan').value;
  var dgoId  = document.getElementById('pon-dgo').value;

  window.sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port).once('value').then(function(snap) {
    var existing = snap.val() || {};
    var data = {active: active, label: label, speed: speed, updated_at: new Date().toISOString()};
    if (vlan) data.vlan = parseInt(vlan);
    if (dgoId) data.dgo_id = dgoId;
    // Preserve fiber link if same DGO
    if (existing.dgo_fiber_key && existing.dgo_id === dgoId) data.dgo_fiber_key = existing.dgo_fiber_key;

    window.sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port).set(data).then(function() {
      if (typeof toast === 'function') toast('PON ' + port + ' salva!', 'success');
      document.getElementById('sdr-pon-modal').remove();
      if (document.getElementById('olt-panel-content') && window._sdrActiveOltTab === oltId) {
        window.sdrOltInlineRender(oltId);
      } else {
        window.sdrOltVisualModal(oltId);
      }
    });
  });
};

// ── Seleção de fibra no DGO (144 fibras — grade visual) ────────────
window.sdrPonSelectFiber = window.sdrPonSelectFiber || function(oltId, slot, port) {
  var dgoId = (document.getElementById('pon-dgo') || {}).value;
  if (!dgoId) { if (typeof toast === 'function') toast('Selecione um DGO primeiro', 'error'); return; }
  window.sdrDgo144Modal(dgoId, oltId, slot, port);
};

window.sdrDgo144Modal = window.sdrDgo144Modal || function(dgoId, oltId, slot, port) {
  window.sdrRef('infrastructure/' + dgoId).once('value').then(function(snap) {
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
window.sdrDgo144View = window.sdrDgo144View || function(dgoId) { window.sdrDgo144Modal(dgoId, null, null, null); };

window.sdrFiberSelect = window.sdrFiberSelect || function(oltId, slot, port, dgoId, fiberKey) {
  var ponRef   = window.sdrRef('olt_connections/' + oltId + '/pons/s' + slot + '_p' + port);
  var fiberRef = window.sdrRef('infrastructure/' + dgoId + '/fibers/' + fiberKey);

  // Liberar fibra anterior se houver
  ponRef.once('value').then(function(snap) {
    var prev = snap.val() || {};
    var chain = Promise.resolve();
    if (prev.dgo_id && prev.dgo_fiber_key) {
      chain = window.sdrRef('infrastructure/' + prev.dgo_id + '/fibers/' + prev.dgo_fiber_key)
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
    window.sdrOltVisualModal(oltId);
  });
};

// ── Criar novo DGO ─────────────────────────────────────────────────
window.sdrDgoCriarModal = window.sdrDgoCriarModal || function(oltId) {
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
    + '<div class="form-group" style="flex:1"><label>Tubos</label><select id="dgo-tubos" onchange="window.sdrDgoCalc()"><option value="6">6 tubos</option><option value="12" selected>12 tubos</option></select></div>'
    + '<div class="form-group" style="flex:1"><label>Fibras/Tubo</label><select id="dgo-fpt" onchange="window.sdrDgoCalc()"><option value="6">6 fibras</option><option value="12" selected>12 fibras</option><option value="24">24 fibras</option></select></div>'
    + '</div>'
    + '<div style="background:#f0f9ff;border-radius:8px;padding:10px;font-size:.82rem;color:#0284c7;text-align:center">'
    + '<i class="fas fa-info-circle"></i> Total: <b id="dgo-total-calc">144 fibras</b>'
    + '</div>'
    + '</div>'
    + '<div class="modal-footer">'
    + '<button class="btn-secondary" onclick="document.getElementById(\'sdr-dgo-criar-modal\').remove()">Cancelar</button>'
    + '<button class="btn-primary" onclick="window.sdrDgoSalvar(\'' + (oltId || '') + '\')"><i class="fas fa-save"></i> Criar DGO</button>'
    + '</div></div></div>';
  var prev = document.getElementById('sdr-dgo-criar-modal');
  if (prev) prev.remove();
  document.body.insertAdjacentHTML('beforeend', html);
};

window.sdrDgoCalc = window.sdrDgoCalc || function() {
  var t = parseInt((document.getElementById('dgo-tubos') || {}).value || 12);
  var f = parseInt((document.getElementById('dgo-fpt')   || {}).value || 12);
  var el = document.getElementById('dgo-total-calc');
  if (el) el.textContent = (t * f) + ' fibras (' + t + ' × ' + f + ')';
};

window.sdrDgoSalvar = window.sdrDgoSalvar || function(oltId) {
  var nome  = ((document.getElementById('dgo-nome')     || {}).value || '').trim();
  var end   = ((document.getElementById('dgo-endereco') || {}).value || '').trim();
  var tubos = parseInt((document.getElementById('dgo-tubos') || {}).value) || 12;
  var fpt   = parseInt((document.getElementById('dgo-fpt')   || {}).value) || 12;
  if (!nome) { if (typeof toast === 'function') toast('Nome é obrigatório', 'error'); return; }

  var data = {type:'dgo', nome:nome, endereco:end, tube_count:tubos, fiber_per_tube:fpt,
    total_fibers:tubos * fpt, olt_id:oltId || null, created_at:new Date().toISOString()};

  window.sdrRef('infrastructure').push(data).then(function() {
    if (typeof toast === 'function') toast('DGO criado com ' + (tubos * fpt) + ' fibras!', 'success');
    document.getElementById('sdr-dgo-criar-modal') && document.getElementById('sdr-dgo-criar-modal').remove();
    if (oltId) {
      if (document.getElementById('olt-panel-content') && window._sdrActiveOltTab === oltId) {
        window.sdrOltInlineRender(oltId);
      } else {
        window.sdrOltVisualModal(oltId);
      }
    }
  });
};

// ── Adicionar slot ao chassis ───────────────────────────────────────
window.sdrOltSlotAdd = window.sdrOltSlotAdd || function(oltId) {
  window.sdrRef('olt_connections/' + oltId + '/slot_count').once('value').then(function(s) {
    var next = (s.val() || 4) + 1;
    window.sdrRef('olt_connections/' + oltId + '/slot_count').set(next).then(function() {
      if (typeof toast === 'function') toast('Slot ' + next + ' adicionado!', 'success');
      if (document.getElementById('olt-panel-content') && window._sdrActiveOltTab === oltId) {
        window.sdrOltInlineRender(oltId);
      } else {
        window.sdrOltVisualModal(oltId);
      }
    });
  });
};

