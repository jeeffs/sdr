/**
 * SDR — Fase 14: Infra Panel + CRUD
 * Migrado de sdr-module.js linhas 574-1133
 *
 * Expõe via window:
 *   sdrOpenInfraPanel, sdrCloseSidePanel, sdrMapFlyTo,
 *   sdrToggleMapClickMode, sdrMapClickCapture, sdrCancelMapClickMode,
 *   sdrGetGPS, sdrInfraSave, sdrInfraEdit, sdrInfraDelete,
 *   _sdrShowAddModal
 *
 * Deps (acessadas via window em runtime):
 *   window.INFRA_TYPES, window.sdrRef, window.sdrMap, window.sdrMapReady,
 *   window.sdrInfraCache, window.sdrOltsCache, window.sdrAuditLog,
 *   window.L (Leaflet), window.toast,
 *   window.sdrMapRenderInfra, window.sdrMapRenderOlts, window.sdrUpdateMapInfo
 */

// ════════════════════════════════════════════════════
// PAINEL LATERAL
// ════════════════════════════════════════════════════

window.sdrOpenInfraPanel = function(id, item) {
  const INFRA_TYPES = window.INFRA_TYPES;
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
  if (item.kmz_desc) html += `<div class="sp-row"><span class="sp-label">Nota Fusão</span><span class="sp-val" style="font-size:.74rem;color:#475569;word-break:break-word">${item.kmz_desc}</span></div>`;
  html += `</div>`;

  // Botão Diagrama de Fusão — exclusivo para CEO
  if (_effType === 'ceo') {
    html += `<button class="btn-primary" onclick="sdrCeoFusaoModal('${id}')" style="width:100%;margin-top:12px;padding:9px;background:linear-gradient(135deg,#ea580c,#dc2626);border:none"><i class="fas fa-project-diagram"></i> Diagrama de Fusão</button>`;
  }

  // Botões de ação
  html += `<div style="display:flex;gap:8px;margin-top:10px">
    <button class="btn-primary" onclick="sdrInfraEdit('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    <button class="btn-danger" onclick="sdrInfraDelete('${id}')" style="padding:8px 16px"><i class="fas fa-trash"></i></button>
  </div>`;

  spBody.innerHTML = html;
  spPanel.classList.add('open');
};

window.sdrCloseSidePanel = function() {
  document.getElementById('sdr-side-panel').classList.remove('open');
};

window.sdrMapFlyTo = function(lat, lng) {
  if (window.sdrMap) { window.sdrMap.flyTo([lat, lng], 17); }
};

// ════════════════════════════════════════════════════
// MODAL DE CADASTRO (INFRAESTRUTURA)
// ════════════════════════════════════════════════════

// Flag: mapa em modo "capturar clique para coordenadas"
window._sdrMapClickMode = false; // exposto para src/map/draw.js

// Ativar/desativar modo de clique no mapa para capturar coordenadas
window.sdrToggleMapClickMode = function() {
  window._sdrMapClickMode = !window._sdrMapClickMode;
  const btn = document.getElementById('btn-map-click-mode');
  const mapEl = document.getElementById('sdr-map');
  if (window._sdrMapClickMode) {
    if (btn) { btn.style.background='#ef4444'; btn.title='Clique no mapa para definir posição (ativo)'; btn.innerHTML='<i class="fas fa-map-pin"></i> Clicando no mapa...'; }
    if (mapEl) mapEl.style.cursor = 'crosshair';
    window.toast('Clique no mapa para definir a posição','info');
  } else {
    if (btn) { btn.style.background=''; btn.title='Clique no mapa para capturar coordenadas'; btn.innerHTML='<i class="fas fa-map-marker-alt"></i> Clicar no mapa'; }
    if (mapEl) mapEl.style.cursor = '';
  }
};

// Chamado pelo listener de clique no mapa (registrado em sdrRenderMap)
window.sdrMapClickCapture = function(lat, lng) {
  if (!window._sdrMapClickMode) return false;
  const latEl = document.getElementById('sdr-f-lat');
  const lngEl = document.getElementById('sdr-f-lng');
  if (latEl) latEl.value = lat.toFixed(6);
  if (lngEl) lngEl.value = lng.toFixed(6);
  // Desativar modo após captura
  window._sdrMapClickMode = false;
  const btn = document.getElementById('btn-map-click-mode');
  const mapEl = document.getElementById('sdr-map');
  if (btn) { btn.style.background='#16a34a'; btn.innerHTML='<i class="fas fa-check"></i> Posição capturada!'; setTimeout(()=>{ btn.style.background=''; btn.innerHTML='<i class="fas fa-map-marker-alt"></i> Clicar no mapa'; },2000); }
  if (mapEl) mapEl.style.cursor = '';
  window.toast('Coordenadas capturadas: '+lat.toFixed(5)+', '+lng.toFixed(5),'success');
  return true; // consumiu o clique
};

function _sdrShowAddModal(editId, editData) {
  const INFRA_TYPES = window.INFRA_TYPES;
  const L = window.L;
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
  var _editDragMarker = null;
  if (isEdit && d.lat && d.lng && window.sdrMap && window.sdrMapReady) {
    var _effTypeEdit = (d.cto_type && INFRA_TYPES[d.cto_type]) ? d.cto_type : d.type;
    var editCfg = INFRA_TYPES[_effTypeEdit] || INFRA_TYPES.pole;
    _editDragMarker = L.marker([d.lat, d.lng], {
      draggable: true,
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: '<div class="marker-icon ' + editCfg.iconClass + '" style="border:2px dashed #f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.4)"><i class="fas ' + editCfg.icon + '"></i></div>',
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    _editDragMarker.bindTooltip('Arraste para reposicionar', {permanent: false, direction: 'top', offset: [0, -14]});
    _editDragMarker.addTo(window.sdrMap);
    _editDragMarker.on('drag', function(ev) {
      var ll = ev.target.getLatLng();
      var latEl = document.getElementById('sdr-f-lat');
      var lngEl = document.getElementById('sdr-f-lng');
      if (latEl) latEl.value = ll.lat.toFixed(6);
      if (lngEl) lngEl.value = ll.lng.toFixed(6);
    });
    // Focar o mapa neste item
    window.sdrMap.setView([d.lat, d.lng], Math.max(window.sdrMap.getZoom(), 17));
  }

  // Remover marcador de edição quando o card for removido
  var _origRemove = card.remove.bind(card);
  card.remove = function() {
    if (_editDragMarker && window.sdrMap) { try { window.sdrMap.removeLayer(_editDragMarker); } catch(e) {} _editDragMarker = null; }
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

// Expõe _sdrShowAddModal para chamadas externas (ex: botão FAB "Cadastrar")
window._sdrShowAddModal = _sdrShowAddModal;

// Cancelar modo de clique no mapa ao fechar card
window.sdrCancelMapClickMode = function() {
  if (window._sdrMapClickMode) {
    window._sdrMapClickMode = false;
    const mapEl = document.getElementById('sdr-map');
    if (mapEl) mapEl.style.cursor = '';
  }
};

window.sdrGetGPS = function() {
  if (!navigator.geolocation) { window.toast('GPS não disponível','error'); return; }
  window.toast('Obtendo posição GPS...','info');
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('sdr-f-lat').value = pos.coords.latitude.toFixed(6);
    document.getElementById('sdr-f-lng').value = pos.coords.longitude.toFixed(6);
    window.toast('Posição capturada!','success');
  }, () => window.toast('Erro ao obter GPS','error'), { enableHighAccuracy: true, timeout: 10000 });
};

window.sdrInfraSave = async function(editId) {
  const sdrInfraCache = window.sdrInfraCache;
  const sdrOltsCache  = window.sdrOltsCache;
  const type = document.getElementById('sdr-f-type').value;
  const name = document.getElementById('sdr-f-name').value.trim();
  const code = document.getElementById('sdr-f-code').value.trim();
  const lat = parseFloat(document.getElementById('sdr-f-lat').value);
  const lng = parseFloat(document.getElementById('sdr-f-lng').value);
  const notes = document.getElementById('sdr-f-notes').value.trim();

  if (!name && !code) { window.toast('Preencha nome ou código','error'); return; }
  if (type !== 'cable' && (isNaN(lat) || isNaN(lng))) { window.toast('Coordenadas obrigatórias','error'); return; }

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
      await window.sdrRef(`infrastructure/${editId}`).update(data);

      window.sdrAuditLog('update_infra',
        { id: editId, type: data.type || oldItem.type, nome: data.name || oldItem.name },
        oldItem,
        Object.assign({}, oldItem, data)
      );

      sdrInfraCache[editId] = Object.assign({}, oldItem, data);

      if (type === 'olt' && !oldItem.olt_connection_id) {
        const oltData = {
          name: data.name, model: data.model || '', ip_address: data.ip_address || '',
          snmp_community: data.snmp_community || 'public', snmp_version: 'v2c',
          lat: data.lat, lng: data.lng,
          total_pon_ports: data.total_pon_ports || 0,
          is_active: true, created_at: new Date().toISOString()
        };
        const oltRef = await window.sdrRef('olt_connections').push(oltData);
        await window.sdrRef(`infrastructure/${editId}`).update({ olt_connection_id: oltRef.key });
        sdrInfraCache[editId].olt_connection_id = oltRef.key;
        sdrOltsCache[oltRef.key] = oltData;
      }

      if (type !== 'olt' && oldItem.type === 'olt' && oldItem.olt_connection_id) {
        await window.sdrRef(`infrastructure/${editId}`).update({ olt_connection_id: null });
        sdrInfraCache[editId].olt_connection_id = null;
      }

      window.toast('Atualizado com sucesso!','success');
    } else {
      if (type === 'olt') {
        const oltData = { name: data.name, model: data.model, ip_address: data.ip_address,
          snmp_community: data.snmp_community, snmp_version: 'v2c',
          lat: data.lat, lng: data.lng, total_pon_ports: data.total_pon_ports,
          is_active: true, created_at: data.created_at };
        const oltRef = await window.sdrRef('olt_connections').push(oltData);
        data.olt_connection_id = oltRef.key;
        sdrOltsCache[oltRef.key] = oltData;
      }
      const newRef = await window.sdrRef('infrastructure').push(data);
      sdrInfraCache[newRef.key] = data;

      window.sdrAuditLog('create_infra',
        { id: newRef.key, type: data.type, nome: data.name },
        null,
        data
      );

      window.toast('Cadastrado com sucesso!','success');
    }

    if (typeof window.sdrMapRenderInfra === 'function') window.sdrMapRenderInfra();
    if (typeof window.sdrMapRenderOlts === 'function') window.sdrMapRenderOlts();
    if (typeof window.sdrUpdateMapInfo === 'function') window.sdrUpdateMapInfo();

    const modal = document.getElementById('sdr-modal');
    if (modal) modal.remove();
    window.sdrCloseSidePanel();
  } catch(e) {
    console.error('Erro ao salvar:', e);
    window.toast('Erro ao salvar: ' + e.message,'error');
  }
};

window.sdrInfraEdit = function(id) {
  window.sdrCloseSidePanel();
  const item = window.sdrInfraCache[id];
  if (item) _sdrShowAddModal(id, item);
};

window.sdrInfraDelete = function(id) {
  if (!confirm('Excluir este item da infraestrutura?')) return;
  const itemAntes = window.sdrInfraCache[id] || {};
  window.sdrRef(`infrastructure/${id}`).remove().then(() => {
    window.sdrAuditLog('delete_infra',
      { id, type: itemAntes.type, nome: itemAntes.name },
      itemAntes,
      null
    );
    window.toast('Excluído!','success');
    window.sdrCloseSidePanel();
  }).catch(e => window.toast('Erro: ' + e.message,'error'));
};

function _fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

console.log('[SDR Bundle] infra/index.js — painel + CRUD OK');
