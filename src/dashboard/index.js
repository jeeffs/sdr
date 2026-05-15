/**
 * SDR — Fase 21: Dashboard de Rede + HTML Templates
 * Migrado de sdr-module.js:
 *   sdrDashRedeRender   (linhas 3948-4138)
 *   _sdrHtml_dash_rede  (linhas 4228-4241)
 *   _sdrHtml_tickets    (linhas 4292-4310)
 *   _sdrHtml_mk_config  (linhas 4365-4457)
 *
 * Deps privadas (copiadas do IIFE, sem janela):
 *   _sdrChartInstances, _sdrLoadChartJs, _sdrDestroyChart
 *
 * Deps runtime via window:
 *   window.sdrRef, window.sdrOpenClientePanel, window.sdrClientesCache
 */

// ── Privadas de Chart.js ──
let _sdrChartInstances = {};

function _sdrLoadChartJs(callback) {
  if (typeof Chart !== 'undefined') { callback(); return; }
  if (document.getElementById('sdr-chartjs-script')) {
    var _poll = setInterval(function() {
      if (typeof Chart !== 'undefined') { clearInterval(_poll); callback(); }
    }, 50);
    return;
  }
  var s = document.createElement('script');
  s.id  = 'sdr-chartjs-script';
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload  = callback;
  s.onerror = function() { console.warn('[SDR] Chart.js não carregou — gráficos desativados.'); };
  document.head.appendChild(s);
}

function _sdrDestroyChart(id) {
  if (_sdrChartInstances[id]) {
    _sdrChartInstances[id].destroy();
    delete _sdrChartInstances[id];
  }
}

// ── Dashboard de Rede ──
window.sdrDashRedeRender = function() {
  _sdrLoadChartJs(function() {
  Promise.all([
    window.sdrRef('infrastructure').once('value'),
    window.sdrRef('clients').once('value'),
    window.sdrRef('olt_connections').once('value'),
    window.sdrRef('alerts').once('value'),
    window.sdrRef('onus').once('value'),
    window.sdrRef('tickets').once('value')
  ]).then(([infraSnap, clientsSnap, oltsSnap, alertsSnap, onusSnap, ticketsSnap]) => {
    const infra      = infraSnap.val()    || {};
    const infraArr   = Object.values(infra);
    const clients    = clientsSnap.val()  || {};
    const clientsArr = Object.values(clients);
    const olts       = Object.values(oltsSnap.val()   || {});
    const alerts     = Object.values(alertsSnap.val() || {});
    const onus       = Object.values(onusSnap.val()   || {});
    const tickets    = Object.values(ticketsSnap.val()|| {});

    const activeAlerts    = alerts.filter(a => a.is_active);
    const onlineClients   = clientsArr.filter(c => c.onu_status === 'online');
    const offlineClients  = clientsArr.filter(c => c.onu_status === 'offline');
    const degradedClients = clientsArr.filter(c => c.onu_status === 'degraded');
    const openTickets     = tickets.filter(t => t.status !== 'resolvido');

    // ── KPI Cards → #dash-rede-stats ──
    const statsEl = document.getElementById('dash-rede-stats');
    if (statsEl) {
      const kpis = [
        { val: clientsArr.length,      label: 'Clientes',   color: '#2563eb', icon: 'fa-users' },
        { val: onlineClients.length,   label: 'Online',     color: '#16a34a', icon: 'fa-circle' },
        { val: degradedClients.length, label: 'Degradados', color: '#d97706', icon: 'fa-exclamation-triangle' },
        { val: offlineClients.length,  label: 'Offline',    color: '#dc2626', icon: 'fa-times-circle' },
        { val: olts.length,            label: 'OLTs',       color: '#7c3aed', icon: 'fa-server' },
        { val: activeAlerts.length,    label: 'Alertas',    color: '#dc2626', icon: 'fa-bell' },
        { val: openTickets.length,     label: 'Chamados',   color: '#d97706', icon: 'fa-ticket-alt' }
      ];
      statsEl.innerHTML = kpis.map(k =>
        `<div class="infra-stat">
          <div class="is-num" style="color:${k.color}">${k.val}</div>
          <div class="is-label"><i class="fas ${k.icon}" style="margin-right:3px;font-size:.7rem"></i>${k.label}</div>
        </div>`
      ).join('');
    }

    const contentEl = document.getElementById('dash-rede-content');
    if (!contentEl) return;

    // Calcular dados dos gráficos
    const ranges = { 'Excelente\n(>-20)':0, 'Bom\n(-20 a -25)':0, 'Regular\n(-25 a -28)':0, 'Ruim\n(<-28)':0, 'Sem dados':0 };
    clientsArr.forEach(c => {
      if (c.rx_power == null) { ranges['Sem dados']++; return; }
      const rx = parseFloat(c.rx_power);
      if (rx > -20) ranges['Excelente\n(>-20)']++;
      else if (rx > -25) ranges['Bom\n(-20 a -25)']++;
      else if (rx > -28) ranges['Regular\n(-25 a -28)']++;
      else ranges['Ruim\n(<-28)']++;
    });

    const ctos = infraArr.filter(i => i.type === 'cto' || i.type === 'splitter');
    const ctoNames = [], ctoOccupied = [], ctoFree = [];
    const infraKeys = Object.keys(infra);
    ctos.slice(0, 10).forEach(cto => {
      const ctoKey = infraKeys.find(k => infra[k] === cto);
      const ports  = parseInt(cto.total_ports || cto.ports) || 8;
      const linked = clientsArr.filter(c => c.cto_id && c.cto_id === ctoKey).length;
      ctoNames.push(cto.name || cto.code || 'CTO');
      ctoOccupied.push(linked);
      ctoFree.push(Math.max(0, ports - linked));
    });

    const openT   = tickets.filter(t => t.status === 'aberto').length;
    const inProgT = tickets.filter(t => t.status === 'em_andamento').length;
    const waitT   = tickets.filter(t => t.status === 'aguardando').length;
    const doneT   = tickets.filter(t => t.status === 'resolvido').length;

    const worstSignal = clientsArr.filter(c => c.rx_power != null)
      .sort((a, b) => a.rx_power - b.rx_power).slice(0, 10);

    // Injetar HTML com canvases
    let contentHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="dash-chart-onus" height="200"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="chart-signal-dist" height="200"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="chart-cto-capacity" height="200"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <canvas id="dash-chart-tickets" height="200"></canvas>
      </div>
    </div>`;

    // Tabela pior sinal
    if (worstSignal.length > 0) {
      contentHtml += `<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:16px">
        <h4 style="font-size:.9rem;margin:0 0 10px"><i class="fas fa-signal" style="color:#dc2626;margin-right:6px"></i>Top 10 — Pior Sinal Rx</h4>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead><tr style="background:#fef2f2">
            <th style="padding:6px 10px;text-align:left">Cliente</th>
            <th style="padding:6px 10px;text-align:center">Rx (dBm)</th>
            <th style="padding:6px 10px;text-align:center">Status</th>
            <th style="padding:6px 10px"></th>
          </tr></thead>
          <tbody>${worstSignal.map(c => {
            const id    = Object.keys(clients).find(k => clients[k] === c) || '';
            const badge = c.rx_power > -25 ? 'good' : c.rx_power > -28 ? 'warn' : 'bad';
            return `<tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:6px 10px;font-weight:600">${c.name||'-'}</td>
              <td style="padding:6px 10px;text-align:center"><span class="signal-badge ${badge}">${c.rx_power} dBm</span></td>
              <td style="padding:6px 10px;text-align:center">${c.onu_status||'-'}</td>
              <td style="padding:6px 10px;text-align:right">
                <button class="btn-map" onclick="sdrOpenClientePanel('${id}',sdrClientesCache['${id}']||{})" style="padding:3px 8px;font-size:.72rem"><i class="fas fa-eye"></i></button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
    }

    // Alertas ativos
    if (activeAlerts.length > 0) {
      contentHtml += `<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <h4 style="font-size:.9rem;margin:0 0 10px"><i class="fas fa-bell" style="color:#d97706;margin-right:6px"></i>Alertas Ativos (${activeAlerts.length})</h4>`;
      activeAlerts.slice(0, 5).forEach(a => {
        const color = { info:'#2563eb', warning:'#d97706', critical:'#dc2626' }[a.severity] || '#2563eb';
        contentHtml += `<div style="padding:8px 12px;border-left:3px solid ${color};background:#fafbfc;border-radius:0 6px 6px 0;margin-bottom:6px;font-size:.82rem">
          <b>${a.title||'Alerta'}</b><br><span style="color:var(--muted)">${a.message||''}</span></div>`;
      });
      contentHtml += `</div>`;
    } else {
      contentHtml += `<div style="text-align:center;padding:20px;color:var(--muted)"><i class="fas fa-check-circle" style="color:#16a34a;font-size:1.5rem;display:block;margin-bottom:8px"></i>Nenhum alerta ativo — rede estável.</div>`;
    }

    contentEl.innerHTML = contentHtml;

    // Inicializar gráficos APÓS canvases no DOM
    _sdrDestroyChart('dash-chart-onus');
    _sdrDestroyChart('chart-signal-dist');
    _sdrDestroyChart('chart-cto-capacity');
    _sdrDestroyChart('dash-chart-tickets');

    const ctxStatus = document.getElementById('dash-chart-onus');
    if (ctxStatus && typeof Chart !== 'undefined') {
      _sdrChartInstances['dash-chart-onus'] = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Online', 'Degradado', 'Offline', 'Sem ONU'],
          datasets: [{ data: [onlineClients.length, degradedClients.length, offlineClients.length, clientsArr.filter(c => !c.onu_status).length], backgroundColor: ['#16a34a','#d97706','#dc2626','#94a3b8'] }]
        },
        options: { responsive:true, plugins: { title:{display:true,text:'Status da Rede',font:{size:14}}, legend:{position:'bottom',labels:{font:{size:11}}} } }
      });
    }

    const ctxSignal = document.getElementById('chart-signal-dist');
    if (ctxSignal && typeof Chart !== 'undefined') {
      _sdrChartInstances['chart-signal-dist'] = new Chart(ctxSignal, {
        type: 'bar',
        data: { labels: Object.keys(ranges), datasets: [{ label:'Clientes', data:Object.values(ranges), backgroundColor:['#16a34a','#22c55e','#eab308','#dc2626','#94a3b8'] }] },
        options: { responsive:true, plugins: { title:{display:true,text:'Distribuição de Sinal Rx',font:{size:14}}, legend:{display:false} }, scales:{ y:{beginAtZero:true,ticks:{stepSize:1}} } }
      });
    }

    const ctxCto = document.getElementById('chart-cto-capacity');
    if (ctxCto && typeof Chart !== 'undefined') {
      _sdrChartInstances['chart-cto-capacity'] = new Chart(ctxCto, {
        type: 'bar',
        data: {
          labels: ctoNames.length > 0 ? ctoNames : ['Nenhuma CTO'],
          datasets: [
            { label:'Ocupadas', data: ctoOccupied.length>0?ctoOccupied:[0], backgroundColor:'#3b82f6' },
            { label:'Livres',   data: ctoFree.length>0?ctoFree:[0],         backgroundColor:'#e2e8f0' }
          ]
        },
        options: { indexAxis:'y', responsive:true, plugins:{ title:{display:true,text:'Capacidade de CTOs (Top 10)',font:{size:14}}, legend:{position:'bottom',labels:{font:{size:11}}} }, scales:{ x:{stacked:true,beginAtZero:true}, y:{stacked:true} } }
      });
    }

    const ctxTickets = document.getElementById('dash-chart-tickets');
    if (ctxTickets && typeof Chart !== 'undefined') {
      _sdrChartInstances['dash-chart-tickets'] = new Chart(ctxTickets, {
        type: 'doughnut',
        data: { labels:['Abertos','Em Andamento','Aguardando','Resolvidos'], datasets:[{ data:[openT,inProgT,waitT,doneT], backgroundColor:['#dc2626','#2563eb','#d97706','#16a34a'] }] },
        options: { responsive:true, plugins:{ title:{display:true,text:'Chamados por Status',font:{size:14}}, legend:{position:'bottom',labels:{font:{size:11}}} } }
      });
    }
  }).catch(err => console.error('[SDR DashRede]', err));
  }); // _sdrLoadChartJs
};

// ── HTML Templates ──
window._sdrHtml_dash_rede = window._sdrHtml_dash_rede || function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b"><i class="fas fa-chart-bar" style="color:var(--primary)"></i> Dashboard de Rede</h2>'
    +'<button class="btn-map" onclick="sdrDashRedeRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'</div>'
    +'<div id="dash-rede-stats" class="infra-stats-row" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">'
    +'<div style="color:var(--muted);font-size:.82rem">Carregando...</div>'
    +'</div>'
    +'<div id="dash-rede-content"></div>'
    +'</div>';
};

window._sdrHtml_tickets = window._sdrHtml_tickets || function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-ticket-alt" style="color:var(--primary)"></i> Chamados de Suporte</h2>'
    +'<input id="tickets-search" type="text" placeholder="Buscar chamado..." oninput="sdrTicketsFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem;width:180px">'
    +'<select id="tickets-filter-status" onchange="sdrTicketsFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem">'
    +'<option value="">Todos os Status</option><option value="aberto">Abertos</option><option value="em_andamento">Em Andamento</option><option value="aguardando">Aguardando</option><option value="resolvido">Resolvidos</option>'
    +'</select>'
    +'<select id="tickets-filter-priority" onchange="sdrTicketsFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem">'
    +'<option value="">Todas as Prioridades</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option>'
    +'</select>'
    +'<button class="btn-map" onclick="sdrTicketsRender()" style="padding:6px 10px;font-size:.8rem"><i class="fas fa-sync-alt"></i></button>'
    +'<button class="btn-map" onclick="sdrTicketAdd(null)" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Novo Chamado</button>'
    +'</div>'
    +'<div id="tickets-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="tickets-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_mk_config = window._sdrHtml_mk_config || function() {
  return '<div style="max-width:900px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-plug" style="color:var(--primary)"></i> Integração MK Solutions</h2>'
    +'<span id="mk-status-badge" style="display:none;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600"></span>'
    +'</div>'
    +'<div class="infra-card" style="margin-bottom:20px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'
    +'<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center">'
    +'<i class="fas fa-server" style="color:#fff;font-size:.9rem"></i>'
    +'</div>'
    +'<div><div style="font-weight:600;color:#1e293b;font-size:.9rem">Servidor MK</div>'
    +'<div style="font-size:.75rem;color:#64748b">Configurações de conexão com a API</div></div>'
    +'</div>'
    +'<form onsubmit="sdrMkSaveConfig();return false;" autocomplete="on">'
    +'<input type="text" autocomplete="username" style="display:none" tabindex="-1" aria-hidden="true">'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +'<div><label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Servidor (IP:PORTA)</label>'
    +'<input id="mk-server-url" type="text" autocomplete="off" placeholder="Ex: 192.168.1.10:8080" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" /></div>'
    +'<div><label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Token do Usuário</label>'
    +'<input id="mk-token" type="text" autocomplete="off" placeholder="Token cadastrado no MK" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" /></div>'
    +'<div><label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Contra-senha do Perfil</label>'
    +'<input id="mk-password" type="password" autocomplete="current-password" placeholder="Contra-senha do Webservice" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" /></div>'
    +'<div><label style="font-size:.78rem;font-weight:600;color:#374151;display:block;margin-bottom:4px">Código de Serviço</label>'
    +'<input id="mk-cd-servico" type="text" autocomplete="off" placeholder="Ex: 9999 (todos)" value="9999" style="width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;box-sizing:border-box" /></div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">'
    +'<button type="submit" class="btn-map" style="padding:8px 20px;font-size:.82rem;background:var(--primary);color:#fff"><i class="fas fa-save"></i> Salvar Configuração</button>'
    +'<button type="button" class="btn-map" onclick="sdrMkTestarConexao()" style="padding:8px 20px;font-size:.82rem"><i class="fas fa-wifi"></i> Testar Conexão</button>'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:.82rem;color:#374151;cursor:pointer;margin-left:auto">'
    +'<input id="mk-enabled" type="checkbox" style="width:16px;height:16px" /> Integração ativa'
    +'</label>'
    +'</div>'
    +'</form>'
    +'<div id="mk-test-result" style="margin-top:10px;font-size:.82rem"></div>'
    +'</div>'
    +'<div class="infra-card" style="margin-bottom:20px;border-left:3px solid #f59e0b">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
    +'<i class="fas fa-flask" style="color:#f59e0b;font-size:1.1rem"></i>'
    +'<div style="font-weight:600;color:#1e293b;font-size:.9rem">Modo Demo / Simulação</div>'
    +'</div>'
    +'<p style="margin:0 0 14px;font-size:.82rem;color:#64748b">Gera a topologia FTTH completa no Firebase para testar todas as telas sem precisar do IP do MK.</p>'
    +'<button class="btn-map" onclick="sdrMkDemoTopologia()" style="padding:9px 22px;font-size:.85rem;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-color:#d97706;font-weight:600;width:100%;margin-bottom:12px">'
    +'<i class="fas fa-project-diagram"></i> Simular Topologia Completa (OLT → DGO → Splitters → CTO → ONU → Cliente)</button>'
    +'<p style="margin:0 0 8px;font-size:.75rem;color:#94a3b8">Ou simule partes individuais:</p>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn-map" onclick="sdrMkDemoOlts()" style="padding:6px 12px;font-size:.78rem"><i class="fas fa-server"></i> Só OLTs</button>'
    +'<button class="btn-map" onclick="sdrMkDemoOnus()" style="padding:6px 12px;font-size:.78rem"><i class="fas fa-router"></i> Só ONUs</button>'
    +'<button class="btn-map" onclick="sdrMkDemoClientes()" style="padding:6px 12px;font-size:.78rem"><i class="fas fa-users"></i> Só Clientes</button>'
    +'</div>'
    +'</div>'
    +'<div class="infra-card" style="margin-bottom:20px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">'
    +'<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center">'
    +'<i class="fas fa-sync-alt" style="color:#fff;font-size:.9rem"></i>'
    +'</div>'
    +'<div><div style="font-weight:600;color:#1e293b;font-size:.9rem">Sincronização de Dados</div>'
    +'<div style="font-size:.75rem;color:#64748b">Última sync: <span id="mk-last-sync">—</span></div></div>'
    +'<button class="btn-map" onclick="sdrMkSyncAll()" style="margin-left:auto;padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Sincronizar Agora</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px" id="mk-sync-stats">'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#eff6ff"><i class="fas fa-server" style="color:#3b82f6"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-olts">—</div><div class="sdr-kpi-lbl">OLTs</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#f0fdf4"><i class="fas fa-network-wired" style="color:#10b981"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-pops">—</div><div class="sdr-kpi-lbl">POPs</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#fef3c7"><i class="fas fa-box" style="color:#f59e0b"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-ctos">—</div><div class="sdr-kpi-lbl">CTOs/NAPs</div></div>'
    +'<div class="sdr-kpi-card"><div class="sdr-kpi-icon" style="background:#fdf2f8"><i class="fas fa-users" style="color:#a855f7"></i></div>'
    +'<div class="sdr-kpi-val" id="mk-count-clientes">—</div><div class="sdr-kpi-lbl">Clientes</div></div>'
    +'</div>'
    +'</div>'
    +'<div class="infra-card">'
    +'<div style="font-weight:600;color:#1e293b;font-size:.9rem;margin-bottom:12px"><i class="fas fa-list-alt" style="color:var(--primary)"></i> Log de Atividade</div>'
    +'<div id="mk-log" style="max-height:220px;overflow-y:auto;font-size:.78rem;font-family:monospace;color:#374151;background:#f8fafc;border-radius:8px;padding:10px;line-height:1.7">'
    +'<span style="color:#94a3b8">Aguardando atividade...</span>'
    +'</div>'
    +'</div>'
    +'</div>';
};

console.log('[SDR Bundle] dashboard/index.js — sdrDashRedeRender + _sdrHtml_dash_rede + _sdrHtml_tickets + _sdrHtml_mk_config OK');
