/**
 * SDR — OLT CRUD · Fase 24
 * Extração do sdr-module.js:
 *   sdrOltStartMapPlace, _sdrCancelOltPlace, sdrMapClickCapture override,
 *   sdrOltsRender (Sprint 4), sdrOltAddModal, sdrOltModalCriarDgo,
 *   sdrOltSave, sdrOltDelete, sdrOpenOltPanel
 *
 * Dependências window:
 *   sdrRef, sdrOltsCache, sdrOnusCache, _sdrActiveOltTab, _sdrOltPlaceMode,
 *   sdrMapRenderOlts, sdrOltTabSwitch, sdrOltInlineRender, sdrOltVisualModal,
 *   sdrDgoCriarModal, sdrDgoSalvar, sdrCloseSidePanel, sdrLayers, _sdrHtml_olts
 */

// Init shared state (bundle loads first — IIFE may reinit but || preserves bundle value)
window.sdrOltsCache    = window.sdrOltsCache    || {};
window.sdrOnusCache    = window.sdrOnusCache    || {};
window._sdrActiveOltTab = window._sdrActiveOltTab || null;
window._sdrOltPlaceMode = window._sdrOltPlaceMode || null;

window.sdrOltStartMapPlace = window.sdrOltStartMapPlace || function(oltId) {
  var name = (window.sdrOltsCache[oltId] || {}).name || 'OLT';
  window._sdrOltPlaceMode = { oltId: oltId, name: name };
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

window._sdrCancelOltPlace = window._sdrCancelOltPlace || function() {
  window._sdrOltPlaceMode = null;
  var _placeMapEl = document.getElementById('sdr-map');
  if (_placeMapEl) _placeMapEl.style.cursor = '';
  var _placeBanner = document.getElementById('sdr-olt-place-banner');
  if (_placeBanner) _placeBanner.remove();
};

// ── Hook de click no mapa ──────────────────────────────────────────
// (chamado pelo sdrMap.on('click') que já existe no código de inicialização do mapa)
// Estende o bundle (src/infra/index.js) sem substituí-lo: chama o original se window._sdrOltPlaceMode não ativo
(function() {
  var _prevCapture = window.sdrMapClickCapture;
  window.sdrMapClickCapture = function(lat, lng) {
    if (window._sdrOltPlaceMode) {
      var mode = window._sdrOltPlaceMode;
      window._sdrOltPlaceMode = null;
      var _placeMapEl = document.getElementById('sdr-map');
      if (_placeMapEl) _placeMapEl.style.cursor = '';
      var _placeBanner = document.getElementById('sdr-olt-place-banner');
      if (_placeBanner) _placeBanner.remove();
      window.sdrRef('olt_connections/' + mode.oltId).update({ lat: lat, lng: lng }).then(function() {
        if (typeof toast === 'function') toast(mode.name + ' posicionada no mapa!', 'success');
        window.sdrRef('olt_connections').once('value').then(function(s) {
          window.sdrOltsCache = s.val() || {};
          if (typeof window.sdrMapRenderOlts === 'function') window.sdrMapRenderOlts();
        });
      });
      return true;
    }
    // Delega para versão do bundle (sdrMapClickMode para modal de infra)
    return typeof _prevCapture === 'function' ? _prevCapture(lat, lng) : false;
  };
}());

// ════════════════════════════════════════════════════
// SPRINT 3 — OLTs CRUD MELHORADO
// ════════════════════════════════════════════════════


// Render de OLTs — versão Sprint 4 (tab interface)
window.sdrOltsRender = window.sdrOltsRender || function() {
  // Ajustar estilo do page-olts para layout flex sem padding
  var pageEl = document.getElementById('page-olts');
  if (pageEl) pageEl.style.cssText = 'padding:0;overflow:hidden;height:calc(100vh - 56px);display:flex;flex-direction:column';

  // Garantir HTML da tab interface
  if (!document.getElementById('olts-tab-bar')) {
    var _htmlFn = window._sdrHtml_olts;
    if (pageEl && _htmlFn) pageEl.innerHTML = _htmlFn();
  }

  Promise.all([
    window.sdrRef('olt_connections').once('value'),
    window.sdrRef('onus').once('value')
  ]).then(function(snaps) {
    window.sdrOltsCache = snaps[0].val() || {};
    window.sdrOnusCache = snaps[1].val() || {};

    // Atualizar marcadores OLT no mapa (só se o mapa já foi inicializado)
    try { if (typeof window.sdrMapRenderOlts === 'function' && window.sdrLayers && window.sdrLayers.olts) window.sdrMapRenderOlts(); } catch(e) {}

    var tabBar = document.getElementById('olts-tab-bar');
    var panel  = document.getElementById('olt-panel-content');
    if (!tabBar) return;

    var items = Object.entries(window.sdrOltsCache);

    if (items.length === 0) {
      tabBar.innerHTML = '';
      if (panel) panel.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#64748b">'
        + '<i class="fas fa-server" style="font-size:3rem;opacity:.3;display:block;margin-bottom:16px"></i>'
        + '<p style="font-size:.9rem;margin-bottom:12px">Nenhuma OLT cadastrada</p>'
        + '<button onclick="sdrOltAddModal()" style="padding:8px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer"><i class="fas fa-plus"></i> Cadastrar primeira OLT</button>'
        + '</div>';
      return;
    }

    if (!window._sdrActiveOltTab || !window.sdrOltsCache[window._sdrActiveOltTab]) {
      window._sdrActiveOltTab = items[0][0];
    }

    tabBar.innerHTML = items.map(function(e) {
      var id = e[0], o = e[1];
      var active     = id === window._sdrActiveOltTab;
      var onusThisOlt = Object.values(window.sdrOnusCache).filter(function(u){ return u.olt_id === id; });
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

    sdrOltTabSwitch(window._sdrActiveOltTab);
  });
};

// Modal dedicado para OLT
window.sdrOltAddModal = window.sdrOltAddModal || function(editId) {
  // Buscar DGOs disponíveis para seleção antes de abrir o modal
  window.sdrRef('infrastructure').once('value').then(function(snap) {
    var allInfra = snap.val() || {};
    var d        = editId ? (window.sdrOltsCache[editId] || {}) : {};
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
window.sdrOltModalCriarDgo = window.sdrOltModalCriarDgo || function(oltIdOrPlaceholder) {
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

window.sdrOltSave = window.sdrOltSave || async function(editId) {
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
      await window.sdrRef('olt_connections/' + editId).update(data);
      if (typeof toast === 'function') toast('OLT atualizada!', 'success');
    } else {
      var newRef = await window.sdrRef('olt_connections').push(data);
      oltId = newRef.key;
      if (typeof toast === 'function') toast('OLT cadastrada!', 'success');
    }

    // ── Vincular DGO selecionado ─────────────────────────────────
    if (dgoIdSelecionado) {
      // Desvincular qualquer DGO anterior desta OLT (se houver)
      var infraSnap = await window.sdrRef('infrastructure').once('value');
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
      await window.sdrRef('').update(dgoUpdates);
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
      if (document.getElementById('olt-panel-content') && window._sdrActiveOltTab === editId) {
        sdrOltInlineRender(editId);
      }
    }
  } catch (e) {
    if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
    console.error('[sdrOltSave]', e);
  }
};

window.sdrOltDelete = window.sdrOltDelete || async function(id) {
  if (!confirm('Excluir esta OLT?')) return;
  try {
    await window.sdrRef(`olt_connections/${id}`).remove();
    toast('OLT excluída', 'success');
    sdrCloseSidePanel();
    sdrOltsRender();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// Painel lateral da OLT
window.sdrOpenOltPanel = window.sdrOpenOltPanel || function(id) {
  const o = window.sdrOltsCache[id];
  if (!o) return;
  document.getElementById('sp-title').textContent = o.name || 'OLT';

  const onusThisOlt = Object.entries(window.sdrOnusCache).filter(([, u]) => u.olt_id === id);
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

