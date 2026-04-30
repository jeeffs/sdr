/**
 * SDR — Módulo ONUs
 * Fase 12: migrado de sdr-module.js linhas 4612-4896
 *
 * Expõe via window:
 *   window.sdrOnusRender()
 *   window.sdrOnusFilter()
 *   window.sdrOnuAdd()
 *   window.sdrOnuEdit(id)
 *   window.sdrOnuSave(editId)
 *   window.sdrOnuDelete(id)
 *   window.sdrOpenOnuPanel(id)
 *
 * Deps runtime (via window):
 *   window.sdrRef            — Firebase ref
 *   window.sdrOnusCache      — cache de ONUs
 *   window.sdrClientesCache  — cache de clientes
 *   window.sdrOltsCache      — cache de OLTs
 *   window.sdrCloseSidePanel — fecha painel lateral
 *   sdrCtxMenu / _sdrCtxOnu — globais
 *   toast()                  — global
 */

// ── Render principal ─────────────────────────────────────────────
window.sdrOnusRender = function() {
  const sdrRef = window.sdrRef;
  Promise.all([
    sdrRef('onus').once('value'),
    sdrRef('clients').once('value'),
    sdrRef('olt_connections').once('value')
  ]).then(([onuSnap, clientSnap, oltSnap]) => {
    window.sdrOnusCache      = onuSnap.val()   || {};
    window.sdrClientesCache  = clientSnap.val() || {};
    window.sdrOltsCache      = oltSnap.val()    || {};
    _renderOnusLista();
  });
};

window.sdrOnusFilter = function() { _renderOnusLista(); };

// ── Render da lista ──────────────────────────────────────────────
function _renderOnusLista() {
  const sdrOnusCache     = window.sdrOnusCache     || {};
  const sdrClientesCache = window.sdrClientesCache || {};
  const sdrOltsCache     = window.sdrOltsCache     || {};

  const filterStatus = document.getElementById('onus-filter-status')?.value || '';
  const filterOlt    = document.getElementById('onus-filter-olt')?.value    || '';
  const search       = (document.getElementById('onus-search')?.value || '').toLowerCase();

  const clientBySerial = {};
  Object.entries(sdrClientesCache).forEach(([cid, c]) => {
    if (c.onu_serial) clientBySerial[c.onu_serial.toLowerCase()] = { id: cid, ...c };
  });

  const items = Object.entries(sdrOnusCache).filter(([, u]) => {
    if (!u) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (filterOlt    && u.olt_id  !== filterOlt)    return false;
    if (search) {
      const client = u.serial_number ? clientBySerial[u.serial_number.toLowerCase()] : null;
      const s = `${u.serial_number||''} ${u.model||''} ${u.ip_address||''} ${client ? client.name : ''}`.toLowerCase();
      if (!s.includes(search)) return false;
    }
    return true;
  });

  // Stats
  const all     = Object.values(sdrOnusCache);
  const statsEl = document.getElementById('onus-stats');
  if (statsEl) {
    const total    = all.length;
    const online   = all.filter(u => u.status === 'online').length;
    const degraded = all.filter(u => u.status === 'degraded').length;
    const offline  = all.filter(u => u.status === 'offline').length;
    statsEl.innerHTML = `
      <div class="infra-stat"><div class="is-num">${total}</div><div class="is-label">Total</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#16a34a">${online}</div><div class="is-label">Online</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#d97706">${degraded}</div><div class="is-label">Degradado</div></div>
      <div class="infra-stat"><div class="is-num" style="color:#dc2626">${offline}</div><div class="is-label">Offline</div></div>`;
  }

  // Populate OLT filter
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
      const rxBadge     = u.rx_power != null ? (u.rx_power > -25 ? 'good' : u.rx_power > -28 ? 'warn' : 'bad') : '';
      const client      = u.serial_number ? clientBySerial[u.serial_number.toLowerCase()] : null;
      const olt         = u.olt_id ? sdrOltsCache[u.olt_id] : null;
      return `<tr style="border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="window.sdrOpenOnuPanel('${id}')" oncontextmenu="sdrCtxMenu(event,_sdrCtxOnu('${id}'))">
        <td style="padding:8px 10px;font-family:monospace;font-weight:600">${u.serial_number || '-'}</td>
        <td style="padding:8px 10px"><span class="signal-badge ${statusBadge}">${u.status || '?'}</span></td>
        <td style="padding:8px 10px">${u.rx_power != null ? `<span class="signal-badge ${rxBadge}">${u.rx_power} dBm</span>` : '-'}</td>
        <td style="padding:8px 10px">${client ? client.name : '<span style="color:var(--muted)">—</span>'}</td>
        <td style="padding:8px 10px">${olt ? olt.name : '-'}</td>
        <td style="padding:8px 10px">${u.pon_port || '-'}</td>
        <td style="padding:8px 10px;text-align:right">
          <button class="btn-map" onclick="event.stopPropagation();window.sdrOnuEdit('${id}')" style="padding:4px 8px;font-size:.75rem" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="sdr-row-menu" onclick="event.stopPropagation();sdrCtxMenu(event,_sdrCtxOnu('${id}'))" title="Mais ações"><i class="fas fa-ellipsis-v"></i></button>
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

// ── Modal ONU ────────────────────────────────────────────────────
window.sdrOnuAdd  = function()   { _sdrShowOnuModal(null, {}); };
window.sdrOnuEdit = function(id) { _sdrShowOnuModal(id, (window.sdrOnusCache || {})[id] || {}); };

function _sdrShowOnuModal(editId, d) {
  const isEdit       = !!editId;
  const sdrOltsCache     = window.sdrOltsCache     || {};
  const sdrClientesCache = window.sdrClientesCache || {};

  const oltOpts    = Object.entries(sdrOltsCache).map(([k, o]) =>
    `<option value="${k}" ${d.olt_id === k ? 'selected' : ''}>${o.name || k}</option>`).join('');
  const clientOpts = Object.entries(sdrClientesCache).map(([k, c]) =>
    `<option value="${k}" ${d.client_id === k ? 'selected' : ''}>${c.name || k}</option>`).join('');

  const html = `<div class="modal-overlay" id="sdr-modal" onclick="if(event.target===this)this.remove()">
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
              <option value="online"   ${d.status === 'online'   ? 'selected' : ''}>Online</option>
              <option value="degraded" ${d.status === 'degraded' ? 'selected' : ''}>Degradado</option>
              <option value="offline"  ${d.status === 'offline' || !d.status ? 'selected' : ''}>Offline</option>
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
        <button class="btn-primary" onclick="window.sdrOnuSave('${editId || ''}')">${isEdit ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('sdr-modal').classList.add('open');
}

// ── Save ─────────────────────────────────────────────────────────
window.sdrOnuSave = async function(editId) {
  const serial = document.getElementById('sdr-onu-serial').value.trim();
  if (!serial) { toast('Serial é obrigatório', 'error'); return; }

  const sdrRef = window.sdrRef;
  const data   = {
    serial_number: serial,
    model:         document.getElementById('sdr-onu-model').value.trim(),
    status:        document.getElementById('sdr-onu-status').value,
    olt_id:        document.getElementById('sdr-onu-olt').value    || null,
    pon_port:      document.getElementById('sdr-onu-pon').value.trim(),
    ip_address:    document.getElementById('sdr-onu-ip').value.trim(),
    client_id:     document.getElementById('sdr-onu-client').value || null,
    updated_at:    new Date().toISOString()
  };
  const rx = parseFloat(document.getElementById('sdr-onu-rx').value);
  const tx = parseFloat(document.getElementById('sdr-onu-tx').value);
  if (!isNaN(rx)) data.rx_power = rx;
  if (!isNaN(tx)) data.tx_power = tx;

  if (!editId) {
    data.created_at     = new Date().toISOString();
    data.last_online_at = data.status === 'online' ? data.created_at : null;
  }

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

    if (clientId) {
      await sdrRef(`clients/${clientId}`).update({
        onu_serial:  serial,
        onu_id:      onuId,
        onu_status:  data.status,
        rx_power:    data.rx_power || null,
        tx_power:    data.tx_power || null,
        updated_at:  new Date().toISOString()
      });
    }

    document.getElementById('sdr-modal').remove();
    window.sdrOnusRender();
  } catch(e) {
    toast('Erro: ' + e.message, 'error');
  }
};

// ── Delete ───────────────────────────────────────────────────────
window.sdrOnuDelete = async function(id) {
  if (!confirm('Excluir esta ONU?')) return;
  try {
    await window.sdrRef(`onus/${id}`).remove();
    toast('ONU excluída', 'success');
    if (typeof window.sdrCloseSidePanel === 'function') window.sdrCloseSidePanel();
    window.sdrOnusRender();
  } catch(e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Painel lateral ───────────────────────────────────────────────
window.sdrOpenOnuPanel = function(id) {
  const sdrOnusCache     = window.sdrOnusCache     || {};
  const sdrOltsCache     = window.sdrOltsCache     || {};
  const sdrClientesCache = window.sdrClientesCache || {};

  const u = sdrOnusCache[id];
  if (!u) return;

  document.getElementById('sp-title').textContent = u.serial_number || 'ONU';

  const olt    = u.olt_id    ? sdrOltsCache[u.olt_id]       : null;
  const client = u.client_id ? sdrClientesCache[u.client_id] : null;

  let linkedClient = client;
  if (!linkedClient && u.serial_number) {
    const entry = Object.entries(sdrClientesCache).find(([, c]) =>
      c.onu_serial && c.onu_serial.toLowerCase() === u.serial_number.toLowerCase());
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
  if (u.tx_power  != null) html += `<div class="sp-row"><span class="sp-label">Sinal Tx</span><span class="sp-val">${u.tx_power} dBm</span></div>`;
  if (u.ip_address)        html += `<div class="sp-row"><span class="sp-label">IP</span><span class="sp-val" style="font-family:monospace">${u.ip_address}</span></div>`;
  if (u.pon_port)          html += `<div class="sp-row"><span class="sp-label">PON Port</span><span class="sp-val">${u.pon_port}</span></div>`;
  if (olt)                 html += `<div class="sp-row"><span class="sp-label">OLT</span><span class="sp-val">${olt.name || olt.ip_address}</span></div>`;
  if (u.last_online_at)    html += `<div class="sp-row"><span class="sp-label">Último online</span><span class="sp-val">${new Date(u.last_online_at).toLocaleString('pt-BR')}</span></div>`;
  html += `</div>`;

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
    <button class="btn-primary" onclick="window.sdrOnuEdit('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    <button class="btn-danger"  onclick="window.sdrOnuDelete('${id}')" style="padding:8px 16px"><i class="fas fa-trash"></i></button>
  </div>`;

  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
};

console.log('[SDR Bundle] onus/index.js carregado — sdrOnusRender + sdrOnuSave + sdrOpenOnuPanel OK');
