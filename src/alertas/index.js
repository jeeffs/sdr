/**
 * SDR — Fase 20: Alertas + Relatório Inadimplentes
 * Migrado de sdr-module.js:
 *   sdrCheckAlerts (linhas 3859-3921)
 *   sdrAlertaAck   (linhas 761-773)
 *   sdrRelatorioInadimplentes (linhas 4223-4283)
 *
 * Expõe via window:
 *   sdrCheckAlerts, sdrAlertaAck, sdrRelatorioInadimplentes
 *
 * Deps (via window em runtime):
 *   window.sdrRef, window.toast, window.sdrAlertasRender,
 *   window.sdrClientesCache
 */

window.sdrCheckAlerts = async function() {
  const [onuSnap, alertSnap] = await Promise.all([
    window.sdrRef('onus').once('value'),
    window.sdrRef('alerts').once('value')
  ]);
  const onus = onuSnap.val() || {};
  const existingAlerts = alertSnap.val() || {};

  const activeAlertsByOnu = {};
  Object.entries(existingAlerts).forEach(([aid, a]) => {
    if (a.is_active && a.onu_id) activeAlertsByOnu[a.onu_id] = aid;
  });

  const now = new Date().toISOString();
  const updates = {};
  let created = 0;

  Object.entries(onus).forEach(([onuId, u]) => {
    if (u.status === 'offline' && !activeAlertsByOnu[onuId]) {
      const alertKey = window.sdrRef('alerts').push().key;
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

    if (u.rx_power != null && u.rx_power < -28 && u.status !== 'offline') {
      const existingDegAlert = Object.entries(existingAlerts).find(([, a]) =>
        a.is_active && a.onu_id === onuId && a.title && a.title.includes('Sinal'));
      if (!existingDegAlert) {
        const alertKey = window.sdrRef('alerts').push().key;
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
    await window.sdrRef('').update(updates);
    window.toast(`${created} alerta(s) gerado(s)`, 'success');
    window.sdrAlertasRender && window.sdrAlertasRender();
  } else {
    window.toast('Nenhum novo alerta necessário', 'info');
  }
};

window.sdrAlertaAck = function(id) {
  window.sdrRef(`alerts/${id}`).update({
    is_active: false,
    acknowledged_at: new Date().toISOString()
  }).then(() => {
    window.toast('Alerta reconhecido', 'success');
    window.sdrAlertasRender && window.sdrAlertasRender();
  });
};

window.sdrRelatorioInadimplentes = function() {
  var all  = Object.entries(window.sdrClientesCache || {});
  var inad = all.filter(function(e) { return e[1] && e[1].financial_status === 'inadimplente'; });
  if (inad.length === 0) { window.toast('Nenhum cliente inadimplente cadastrado', 'success'); return; }

  var now     = new Date();
  var dateStr = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

  var rows = inad.map(function(e) {
    var id = e[0], c = e[1];
    var onuBadge = c.onu_status === 'online' ? '🟢 Online'
      : c.onu_status === 'offline'  ? '🔴 Offline'
      : c.onu_status === 'degraded' ? '🟡 Degradado'
      : '⚪ Sem ONU';
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

console.log('[SDR Bundle] alertas/index.js — sdrCheckAlerts + sdrAlertaAck + sdrRelatorioInadimplentes OK');
