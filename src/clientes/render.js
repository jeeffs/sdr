/**
 * SDR — Fase 15: Clientes Render + CRUD
 * Migrado de sdr-module.js linhas 671-909
 *
 * Expõe via window:
 *   sdrClientesRender, sdrClientesFilter, sdrMapFlyToClient,
 *   sdrClienteAdd, sdrClienteEdit, sdrGetGPSCliente,
 *   sdrClienteSave, sdrClienteDelete
 *
 * Deps (via window em runtime):
 *   window.sdrRef, window.sdrClientesCache, window.sdrInfraCache,
 *   window.toast, window.showPage, window.sdrMapFlyTo,
 *   window.sdrCloseSidePanel, window.sdrOpenClientePanel
 */

window.sdrClientesRender = function() {
  window.sdrRef('clients').once('value').then(snap => {
    window.sdrClientesCache = snap.val() || {};
    _renderClientesLista();
  });
};

// Filtro sem rebuscar Firebase — usa cache
window.sdrClientesFilter = function() { _renderClientesLista(); };

function _renderClientesLista() {
  const sdrClientesCache = window.sdrClientesCache || {};
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
  const c = (window.sdrClientesCache || {})[id];
  if (c && c.lat && c.lng) {
    window.showPage('mapa');
    setTimeout(() => window.sdrMapFlyTo(c.lat, c.lng), 300);
  }
};

window.sdrClienteAdd = function() {
  _sdrShowClienteModal(null, null);
};

window.sdrClienteEdit = function(id) {
  window.sdrCloseSidePanel();
  const c = (window.sdrClientesCache || {})[id];
  if (c) _sdrShowClienteModal(id, c);
};

function _sdrShowClienteModal(editId, d) {
  const isEdit = !!editId;
  d = d || {};

  // Montar opções de CTOs e Postes
  const infraItems = Object.entries(window.sdrInfraCache || {});
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
  if (!navigator.geolocation) { window.toast('GPS não disponível','error'); return; }
  window.toast('Obtendo posição GPS...','info');
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('sc-lat').value = pos.coords.latitude.toFixed(6);
    document.getElementById('sc-lng').value = pos.coords.longitude.toFixed(6);
    window.toast('Posição capturada!','success');
  }, () => window.toast('Erro ao obter GPS','error'), { enableHighAccuracy: true, timeout: 10000 });
};

window.sdrClienteSave = async function(editId) {
  const name = document.getElementById('sc-name').value.trim();
  if (!name) { window.toast('Nome é obrigatório','error'); return; }

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
      await window.sdrRef(`clients/${editId}`).update(data);
      window.toast('Cliente atualizado!','success');
    } else {
      await window.sdrRef('clients').push(data);
      window.toast('Cliente cadastrado!','success');
    }
    document.getElementById('sdr-modal').remove();
    window.sdrCloseSidePanel();
  } catch(e) {
    window.toast('Erro: ' + e.message,'error');
  }
};

window.sdrClienteDelete = async function(id) {
  const c = (window.sdrClientesCache || {})[id];
  const nome = c ? c.name : id;
  if (!confirm('Excluir cliente "' + nome + '"?\nEsta ação não pode ser desfeita.')) return;
  try {
    await window.sdrRef('clients/' + id).remove();
    delete window.sdrClientesCache[id];
    window.toast('Cliente excluído', 'success');
    window.sdrCloseSidePanel();
    window.sdrClientesRender();
  } catch(e) { window.toast('Erro: ' + e.message, 'error'); }
};

console.log('[SDR Bundle] clientes/render.js — render + CRUD OK');
