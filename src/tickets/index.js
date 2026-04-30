/**
 * SDR — Fase 16: Tickets de Rede + Ordem de Serviço
 * Migrado de sdr-module.js linhas 4211-4622
 *
 * Expõe via window:
 *   sdrTicketsRender, sdrTicketsFilter, sdrTicketAdd, sdrTicketEdit,
 *   sdrTicketSave, sdrTicketResolve, sdrTicketDelete,
 *   sdrOpenTicketPanel, sdrTicketPrintOS
 *
 * Deps (via window em runtime):
 *   window.sdrRef, window.sdrTicketsCache, window.sdrClientesCache,
 *   window.toast, window.firebase, window.sdrCloseSidePanel
 */

// Cache local (sincronizado com window.sdrTicketsCache em cada render)
window.sdrTicketsCache = window.sdrTicketsCache || {};

window.sdrTicketsRender = function() {
  Promise.all([
    window.sdrRef('tickets').once('value'),
    window.sdrRef('clients').once('value')
  ]).then(([ticketsSnap, clientsSnap]) => {
    window.sdrTicketsCache = ticketsSnap.val() || {};
    window.sdrClientesCache = clientsSnap.val() || {};

    const tickets = Object.values(window.sdrTicketsCache);
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
  const sdrTicketsCache  = window.sdrTicketsCache  || {};
  const sdrClientesCache = window.sdrClientesCache || {};

  const statusFilter   = document.getElementById('tickets-filter-status')?.value   || '';
  const priorityFilter = document.getElementById('tickets-filter-priority')?.value || '';
  const search         = (document.getElementById('tickets-search')?.value || '').toLowerCase();

  let entries = Object.entries(sdrTicketsCache);

  if (statusFilter)   entries = entries.filter(([,t]) => t.status   === statusFilter);
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
  const statusLabels   = { aberto:'Aberto', em_andamento:'Em Andamento', aguardando:'Aguardando', resolvido:'Resolvido' };
  const statusColors   = { aberto:'#dc2626', em_andamento:'#2563eb', aguardando:'#d97706', resolvido:'#16a34a' };

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
  const sdrTicketsCache  = window.sdrTicketsCache  || {};
  const sdrClientesCache = window.sdrClientesCache || {};
  const d = editId ? sdrTicketsCache[editId] || {} : {};
  const isEdit = !!editId;

  let clientOpts = '<option value="">Nenhum cliente vinculado</option>';
  Object.entries(sdrClientesCache).forEach(([cid, c]) => {
    const sel = d.client_id === cid ? 'selected' : '';
    clientOpts += `<option value="${cid}" ${sel}>${c.name || cid}</option>`;
  });

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
  if (!title) { window.toast('Informe o título do ticket', 'error'); return; }

  const data = {
    title,
    description: document.getElementById('tk-desc')?.value?.trim() || '',
    priority:    document.getElementById('tk-priority')?.value || 'medium',
    status:      document.getElementById('tk-status')?.value || 'aberto',
    client_id:   document.getElementById('tk-client')?.value || '',
    type:        document.getElementById('tk-type')?.value || 'outro',
    notes:       document.getElementById('tk-notes')?.value?.trim() || '',
    updated_at:  new Date().toISOString()
  };

  if (!editId) {
    data.created_at = new Date().toISOString();
    data.created_by = window.firebase?.auth()?.currentUser?.displayName || 'admin';
  }

  try {
    if (editId) {
      await window.sdrRef(`tickets/${editId}`).update(data);
      window.toast('Ticket atualizado!', 'success');
    } else {
      await window.sdrRef('tickets').push(data);
      window.toast('Ticket criado!', 'success');
    }
    const tm = document.getElementById('sdr-ticket-modal');
    if (tm) tm.remove();
    window.sdrTicketsRender();
  } catch (e) {
    window.toast('Erro ao salvar ticket: ' + e.message, 'error');
  }
};

window.sdrTicketResolve = async function(id) {
  if (!confirm('Resolver este ticket?')) return;
  try {
    await window.sdrRef(`tickets/${id}`).update({
      status: 'resolvido',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    window.toast('Ticket resolvido!', 'success');
    window.sdrTicketsRender();
  } catch (e) {
    window.toast('Erro: ' + e.message, 'error');
  }
};

window.sdrTicketDelete = async function(id) {
  if (!confirm('Excluir este ticket permanentemente?')) return;
  try {
    await window.sdrRef(`tickets/${id}`).remove();
    window.toast('Ticket excluído', 'success');
    window.sdrTicketsRender();
  } catch (e) {
    window.toast('Erro: ' + e.message, 'error');
  }
};

window.sdrOpenTicketPanel = function(id) {
  const sdrTicketsCache  = window.sdrTicketsCache  || {};
  const sdrClientesCache = window.sdrClientesCache || {};
  const t = sdrTicketsCache[id];
  if (!t) return;
  const client = t.client_id ? sdrClientesCache[t.client_id] : null;

  const priorityLabels = { critical:'Crítica', high:'Alta', medium:'Média', low:'Baixa' };
  const priorityColors = { critical:'#dc2626', high:'#ea580c', medium:'#d97706', low:'#16a34a' };
  const statusLabels   = { aberto:'Aberto', em_andamento:'Em Andamento', aguardando:'Aguardando', resolvido:'Resolvido' };
  const statusColors   = { aberto:'#dc2626', em_andamento:'#2563eb', aguardando:'#d97706', resolvido:'#16a34a' };
  const typeLabels     = { sem_sinal:'Sem Sinal / ONU Offline', sinal_baixo:'Sinal Baixo', lentidao:'Lentidão', queda_frequente:'Quedas Frequentes', instalacao:'Instalação', mudanca_endereco:'Mudança de Endereço', infra:'Infraestrutura', outro:'Outro' };

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

window.sdrTicketPrintOS = function(id) {
  const sdrTicketsCache  = window.sdrTicketsCache  || {};
  const sdrClientesCache = window.sdrClientesCache || {};
  var t = sdrTicketsCache[id];
  if (!t) { window.toast('Ticket não encontrado no cache — abra a aba Tickets primeiro', 'error'); return; }
  var client = t.client_id ? sdrClientesCache[t.client_id] : null;
  var now = new Date();
  var osNum = 'OS-' + now.getFullYear() + '-' + id.substring(0, 6).toUpperCase();
  var dateStr = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  var timeStr = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

  var prioLbl = {critical:'🔴 CRÍTICA', high:'🟠 ALTA', medium:'🟡 MÉDIA', low:'🟢 BAIXA'};
  var typeLbl = {sem_sinal:'Sem Sinal / ONU Offline', sinal_baixo:'Sinal Baixo / Degradado', lentidao:'Lentidão', queda_frequente:'Quedas Frequentes', instalacao:'Instalação', mudanca_endereco:'Mudança de Endereço', infra:'Infraestrutura', outro:'Outro'};
  var checklist = {
    sem_sinal:       ['Verificar alimentação da ONU', 'Verificar cabo drop do cliente', 'Verificar conector SC/APC', 'Verificar sinal na CTO/splitter', 'Substituir ONU se necessário'],
    sinal_baixo:     ['Medir sinal Rx com OTDR/power meter', 'Limpar conectores SC/APC', 'Verificar emendas e curvas no cabo', 'Verificar atenuação da rota óptica', 'Verificar splitter'],
    lentidao:        ['Verificar velocidade com speed test', 'Verificar plano contratado no sistema', 'Verificar QoS/limitação na OLT', 'Reiniciar ONU', 'Verificar cabeamento LAN do cliente'],
    queda_frequente: ['Verificar log de eventos na OLT', 'Medir sinal Rx ao longo de 30 min', 'Verificar temperatura da ONU', 'Verificar conexão do conector', 'Verificar alimentação elétrica'],
    instalacao:      ['Verificar viabilidade do ponto', 'Localizar CTO mais próxima com porta livre', 'Lançar cabo drop', 'Instalar e provisionar ONU', 'Testar velocidade e sinal', 'Assinar contrato'],
    outro:           ['Verificar configurações da ONU', 'Consultar painel SDR', 'Contatar suporte N2 se necessário']
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

console.log('[SDR Bundle] tickets/index.js — tickets + OS OK');
