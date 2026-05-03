/**
 * SDR — Fase 19: Realtime + Alertas + HTML Templates + Conversores
 * Migrado de sdr-module.js linhas 4615-5070
 *
 * Expõe via window:
 *   _sdrInitRealtime, _sdrUpdateAlertBadge,
 *   sdrAlertaAbrirTicket, sdrAlertasRender,
 *   _sdrHtml_clientes, _sdrHtml_onus, _sdrHtml_alertas,
 *   sdrOnusFiltrar,
 *   sdrConverterCtoCeo, sdrConverterRtNome
 *
 * Deps (via window em runtime):
 *   window.sdrRef, window.toast, window.showPage,
 *   window.sdrTicketAdd, window.sdrOpenClientePanel,
 *   window.sdrMkAbrirOS, window.sdrMkDesbloquear,
 *   window.sdrDashRedeRender, window.sdrCheckAlerts,
 *   window.sdrClientesFilter, window.sdrClienteAdd,
 *   window.sdrAutoLinkCTO, window.sdrImportClientes,
 *   window.sdrExportClientesCSV, window.sdrRelatorioInadimplentes,
 *   window.sdrOnusFilter, window.sdrOnuAdd, window.sdrExportOnusCSV,
 *   window.sdrOnusRender, window.sdrInfraCache, window.sdrLoadInfra
 */

// Sanitização XSS — escapa HTML antes de interpolar dados do banco
function _escRt(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Realtime listener ────────────────────────────────────────────────

var _sdrRealtimeActive = false;

window._sdrInitRealtime = function() {
  if (_sdrRealtimeActive) return;
  _sdrRealtimeActive = true;

  var _prevOnuStatus = {};
  window.sdrRef('onus').on('value', function(snap) {
    var onus = snap.val() || {};

    window.sdrRef('alerts').once('value').then(function(aSnap) {
      var alerts = aSnap.val() || {};
      var activeCount = Object.values(alerts).filter(function(a) { return a && a.is_active; }).length;
      window._sdrUpdateAlertBadge(activeCount);
    });

    var now = new Date().toISOString();
    var updates = {};
    var newAlerts = 0;

    Object.entries(onus).forEach(function(e) {
      var onuId = e[0], u = e[1];
      if (!u) return;
      var prev = _prevOnuStatus[onuId];
      if (u.status === 'offline' && prev && prev !== 'offline') {
        var alertKey = window.sdrRef('alerts').push().key;
        updates['alerts/' + alertKey] = {
          onu_id:    onuId,
          client_id: u.client_id || null,
          severity:  'critical',
          title:     'ONU Offline: ' + (u.serial_number || onuId),
          message:   'ONU ' + (u.serial_number || '') + ' ficou offline às ' + new Date().toLocaleTimeString('pt-BR'),
          is_active: true,
          created_at: now
        };
        newAlerts++;
      }
      _prevOnuStatus[onuId] = u.status;
    });

    if (Object.keys(updates).length) {
      window.sdrRef('').update(updates).then(function() {
        window.sdrRef('alerts').once('value').then(function(aSnap2) {
          var cnt = Object.values(aSnap2.val() || {}).filter(function(a) { return a && a.is_active; }).length;
          window._sdrUpdateAlertBadge(cnt);
        });
        if (typeof window.toast === 'function') window.toast('⚠ ' + newAlerts + ' ONU(s) ficou offline — alerta criado!', 'error');
        if (document.getElementById('alertas-lista') && document.querySelector('#page-alertas.active')) {
          window.sdrAlertasRender();
        }
      });
    }
  });
};

// ── Badge de alertas no sidebar ──────────────────────────────────────

window._sdrUpdateAlertBadge = function(count) {
  var badge = document.getElementById('sdr-alert-badge');
  if (!badge) {
    var alertLink = document.querySelector('[onclick*="alertas"]') || Array.from(document.querySelectorAll('[onclick]')).find(function(el){ return el.getAttribute('onclick').indexOf('alertas') > -1; });
    if (!alertLink) return;
    badge = document.createElement('span');
    badge.id = 'sdr-alert-badge';
    badge.style.cssText = 'display:inline-block;background:#dc2626;color:#fff;font-size:.62rem;font-weight:700;border-radius:50%;width:16px;height:16px;text-align:center;line-height:16px;margin-left:4px';
    alertLink.appendChild(badge);
  }
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
};

// Iniciar real-time após 2s (garantir que Firebase está pronto)
setTimeout(function() {
  if (typeof window.sdrRef === 'function') window._sdrInitRealtime();
}, 2000);

// ── Patch sdrOpenClientePanel — injetar seção MK ─────────────────────

(function _sdrPatchClientePanel() {
  var _origOpenPanel = window.sdrOpenClientePanel;
  if (typeof _origOpenPanel !== 'function') return;
  window.sdrOpenClientePanel = function(id, c) {
    _origOpenPanel(id, c);
    setTimeout(function() {
      var body = document.getElementById('sp-body');
      if (!body || !c) return;
      if (document.getElementById('sp-mk-section')) return;

      window.sdrRef('mk_config').once('value').then(function(snap) {
        var mkCfg = snap.val() || {};
        var hasMk = !!(mkCfg.token && mkCfg.token !== 'SEU_TOKEN_AQUI');
        var sp = document.getElementById('sdr-side-panel');
        if (!sp || !sp.classList.contains('open')) return;

        var mkSection = document.createElement('div');
        mkSection.id = 'sp-mk-section';
        mkSection.className = 'sp-section';
        mkSection.innerHTML = '<div class="sp-section-title"><i class="fas fa-plug" style="color:#7c3aed"></i> MK Solutions'
          + (hasMk ? '' : ' <span style="font-size:.68rem;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;font-weight:600;margin-left:4px">Token pendente</span>')
          + '</div>'
          + (c.mk_id ? '<div class="sp-row"><span class="sp-label">ID no MK</span><span class="sp-val" style="font-family:monospace">' + c.mk_id + '</span></div>' : '')
          + (c.mk_contrato ? '<div class="sp-row"><span class="sp-label">Contrato</span><span class="sp-val">' + c.mk_contrato + '</span></div>' : '')
          + (c.mk_vencimento ? '<div class="sp-row"><span class="sp-label">Vencimento</span><span class="sp-val">' + c.mk_vencimento + '</span></div>' : '')
          + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">'
          + '<button onclick="sdrMkAbrirOS && sdrMkAbrirOS(\'' + id + '\')" '
          + 'style="padding:5px 10px;font-size:.75rem;background:#ede9fe;color:#7c3aed;border:1px solid #c4b5fd;border-radius:6px;cursor:pointer'
          + (hasMk ? '' : ';opacity:.5;cursor:not-allowed') + '" '
          + (hasMk ? '' : 'title="Configure o token MK em Integração MK" disabled') + '>'
          + '<i class="fas fa-wrench" style="margin-right:4px"></i>Abrir OS</button>'
          + '<button onclick="sdrMkDesbloquear && sdrMkDesbloquear(\'' + id + '\')" '
          + 'style="padding:5px 10px;font-size:.75rem;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:6px;cursor:pointer'
          + (hasMk ? '' : ';opacity:.5;cursor:not-allowed') + '" '
          + (hasMk ? '' : 'title="Configure o token MK em Integração MK" disabled') + '>'
          + '<i class="fas fa-unlock" style="margin-right:4px"></i>Desbloquear</button>'
          + '<button onclick="sdrTicketAdd && sdrTicketAdd(\'' + id + '\')" '
          + 'style="padding:5px 10px;font-size:.75rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;cursor:pointer">'
          + '<i class="fas fa-ticket-alt" style="margin-right:4px"></i>Abrir Chamado</button>'
          + '</div>';

        body.appendChild(mkSection);
      });
    }, 150);
  };
})();

// ── Alerta → criar ticket ────────────────────────────────────────────

window.sdrAlertaAbrirTicket = function(alertId) {
  window.sdrRef('alerts/' + alertId).once('value').then(function(snap) {
    var a = snap.val();
    if (!a) return;
    var clientId = a.client_id || '';
    window.sdrRef('clients/' + clientId).once('value').then(function(cSnap) {
      var c = cSnap.val() || {};
      if (typeof window.sdrTicketAdd === 'function') {
        window.sdrTicketAdd(clientId || null);
        setTimeout(function() {
          var titleEl = document.getElementById('ticket-title');
          var descEl  = document.getElementById('ticket-description');
          var typeEl  = document.getElementById('ticket-type');
          var prioEl  = document.getElementById('ticket-priority');
          if (titleEl) titleEl.value = a.title || 'Alerta: ' + (a.severity || '') + ' — ' + (c.name || '');
          if (descEl)  descEl.value  = a.message || '';
          if (typeEl)  typeEl.value  = a.title && a.title.includes('Offline') ? 'sem_sinal' : 'sinal_baixo';
          if (prioEl)  prioEl.value  = a.severity === 'critical' ? 'critical' : 'high';
        }, 200);
      }
    });
  });
};

// ── sdrAlertasRender — versão definitiva com botão Ticket ────────────

window.sdrAlertasRender = function() {
  window.sdrRef('alerts').once('value').then(function(snap) {
    var alerts = snap.val() || {};
    var lista = document.getElementById('alertas-lista');
    if (!lista) return;

    var entries = Object.entries(alerts);
    if (entries.length === 0) {
      lista.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">'
        + '<i class="fas fa-check-circle" style="font-size:2.5rem;color:#22c55e;margin-bottom:10px;display:block"></i>'
        + '<p>Nenhum alerta ativo — rede estável.</p></div>';
      window._sdrUpdateAlertBadge(0);
      return;
    }

    var activeAlerts   = entries.filter(function(e) { return e[1] && e[1].is_active; });
    var inactiveAlerts = entries.filter(function(e) { return e[1] && !e[1].is_active; });
    window._sdrUpdateAlertBadge(activeAlerts.length);

    var sevColor = { critical:'#dc2626', warning:'#d97706', info:'#2563eb' };
    var sevLabel = { critical:'Crítico',  warning:'Atenção',  info:'Info' };
    var sevBg    = { critical:'#fee2e2',  warning:'#fef3c7',  info:'#dbeafe' };

    function renderGroup(label, arr) {
      if (!arr.length) return '';
      var rows = arr.map(function(e) {
        var id = e[0], a = e[1];
        var sc = sevColor[a.severity] || '#94a3b8';
        var sl = sevLabel[a.severity] || a.severity;
        var sb = sevBg[a.severity]   || '#f8fafc';
        var dt = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '';
        return '<tr data-alert-id="' + id + '" style="border-bottom:1px solid #f1f5f9">'
          + '<td style="padding:8px 10px"><span style="background:' + sb + ';color:' + sc + ';padding:2px 8px;border-radius:8px;font-size:.72rem;font-weight:700">' + sl + '</span></td>'
          + '<td style="padding:8px 10px;font-weight:600">' + _escRt(a.title || 'Alerta') + '</td>'
          + '<td style="padding:8px 10px;font-size:.78rem;color:var(--muted)">' + _escRt(a.message || '') + '</td>'
          + '<td style="padding:8px 10px;font-size:.75rem;color:var(--muted);white-space:nowrap">' + dt + '</td>'
          + '<td style="padding:8px 10px;text-align:right;white-space:nowrap">'
          + (a.is_active
            ? '<button onclick="sdrAlertaAck(\'' + id + '\')" style="padding:3px 8px;font-size:.72rem;background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:5px;cursor:pointer;margin-right:4px"><i class="fas fa-check"></i> ACK</button>'
            : '')
          + '<button onclick="sdrAlertaAbrirTicket(\'' + id + '\')" style="padding:3px 8px;font-size:.72rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:5px;cursor:pointer">'
          + '<i class="fas fa-ticket-alt"></i> Ticket</button>'
          + '</td></tr>';
      }).join('');
      return '<div style="font-size:.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px">' + label + ' (' + arr.length + ')</div>'
        + '<table style="width:100%;border-collapse:collapse;font-size:.83rem;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">'
        + '<thead><tr style="background:#f8fafc">'
        + '<th style="padding:8px 10px;text-align:left">Severity</th>'
        + '<th style="padding:8px 10px;text-align:left">Título</th>'
        + '<th style="padding:8px 10px;text-align:left">Mensagem</th>'
        + '<th style="padding:8px 10px;text-align:left">Data</th>'
        + '<th style="padding:8px 10px"></th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';
    }

    lista.innerHTML = renderGroup('Alertas Ativos', activeAlerts)
      + renderGroup('Histórico (Reconhecidos)', inactiveAlerts.slice(0, 20));
  });
};

// ── Auto-refresh Dashboard a cada 60s ───────────────────────────────

var _sdrDashInterval = null;

(function _sdrPatchDashPage() {
  var _orig9 = window.showPage;
  if (typeof _orig9 !== 'function' || _orig9._sdr9Patched) return;
  var _w9 = function(name) {
    _orig9(name);
    if (name === 'dash-rede') {
      if (_sdrDashInterval) clearInterval(_sdrDashInterval);
      _sdrDashInterval = setInterval(function() {
        if (document.querySelector('#page-dash-rede.active') && typeof window.sdrDashRedeRender === 'function') {
          window.sdrDashRedeRender();
        } else {
          clearInterval(_sdrDashInterval);
          _sdrDashInterval = null;
        }
      }, 60000);
    } else {
      if (_sdrDashInterval) { clearInterval(_sdrDashInterval); _sdrDashInterval = null; }
    }
  };
  _w9._sdrPatched = _w9._sdr9Patched = true;
  window.showPage = _w9;
})();

// ── HTML templates atualizados com botões CSV e inadimplentes ────────

window._sdrHtml_clientes = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-users" style="color:var(--primary)"></i> Clientes FTTH</h2>'
    +'<input id="clientes-search" type="text" placeholder="Buscar cliente..." oninput="sdrClientesFilter()" style="padding:6px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;width:200px">'
    +'<select id="clientes-filter-status" onchange="sdrClientesFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem">'
    +'<option value="">Todos</option><option value="adimplente">Adimplentes</option><option value="inadimplente">Inadimplentes</option></select>'
    +'<button class="btn-map" onclick="sdrClienteAdd()" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Novo</button>'
    +'<button class="btn-map" onclick="document.getElementById(\'clientes-import-input\').click()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-import"></i> Importar</button>'
    +'<button class="btn-map" onclick="sdrAutoLinkCTO()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-link"></i> Auto-Link</button>'
    +'<button class="btn-map" onclick="sdrExportClientesCSV()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-csv"></i> CSV</button>'
    +'<button class="btn-map" onclick="sdrRelatorioInadimplentes()" style="padding:6px 14px;font-size:.8rem;background:#dc2626;color:#fff;border-color:#b91c1c" title="Relatório de Inadimplentes"><i class="fas fa-exclamation-triangle"></i> Inadimplentes</button>'
    +'<input type="file" id="clientes-import-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="sdrImportClientes(this)">'
    +'</div>'
    +'<div id="clientes-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="clientes-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window._sdrHtml_onus = function() {
  return '<div style="max-width:1100px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-router" style="color:var(--primary)"></i> ONUs</h2>'
    +'<input id="onus-search" type="text" placeholder="Buscar serial, modelo..." oninput="sdrOnusFilter()" style="padding:6px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;width:200px">'
    +'<select id="onus-filter-olt" onchange="sdrOnusFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todas as OLTs</option></select>'
    +'<select id="onus-filter-status" onchange="sdrOnusFilter()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:.82rem"><option value="">Todos Status</option><option value="online">Online</option><option value="offline">Offline</option><option value="degraded">Degradado</option></select>'
    +'<button class="btn-map" onclick="sdrOnusRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'<button class="btn-map" onclick="sdrOnuAdd()" style="padding:6px 14px;font-size:.8rem;background:var(--primary);color:#fff"><i class="fas fa-plus"></i> Nova ONU</button>'
    +'<button class="btn-map" onclick="sdrExportOnusCSV()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-file-csv"></i> CSV</button>'
    +'</div>'
    +'<div id="onus-stats" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"></div>'
    +'<div id="onus-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

window.sdrOnusFiltrar = function(q) {
  q = (q || '').toLowerCase().trim();
  var rows = document.querySelectorAll('#onus-lista tbody tr');
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
};

window._sdrHtml_alertas = function() {
  return '<div style="max-width:1000px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">'
    +'<h2 style="margin:0;font-size:1.1rem;color:#1e293b;flex:1"><i class="fas fa-bell" style="color:#d97706"></i> Alertas de Rede</h2>'
    +'<span id="sdr-rt-indicator" style="font-size:.72rem;color:#16a34a;background:#d1fae5;padding:3px 10px;border-radius:10px;display:none"><i class="fas fa-circle" style="font-size:.55rem;margin-right:4px"></i>Tempo real ativo</span>'
    +'<button class="btn-map" onclick="sdrCheckAlerts()" style="padding:6px 14px;font-size:.8rem;background:#d97706;color:#fff;border-color:#b45309"><i class="fas fa-search"></i> Verificar Agora</button>'
    +'<button class="btn-map" onclick="sdrAlertasRender()" style="padding:6px 14px;font-size:.8rem"><i class="fas fa-sync-alt"></i> Atualizar</button>'
    +'</div>'
    +'<div id="alertas-lista"><div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-spinner fa-spin" style="font-size:2rem"></i><p style="margin-top:12px">Carregando...</p></div></div>'
    +'</div>';
};

// Indicador real-time quando página de alertas está ativa
(function() {
  var _origAlertasShow = window.showPage;
  if (typeof _origAlertasShow === 'function' && !_origAlertasShow._sdrRtPatched) {
    var _wRt = function(name) {
      _origAlertasShow(name);
      if (name === 'alertas') {
        setTimeout(function() {
          var ind = document.getElementById('sdr-rt-indicator');
          if (ind && _sdrRealtimeActive) ind.style.display = 'inline-block';
        }, 400);
      }
    };
    _wRt._sdrPatched = _wRt._sdrRtPatched = true;
    window.showPage = _wRt;
  }
})();

// ── Conversores bulk ─────────────────────────────────────────────────

window.sdrConverterCtoCeo = function() {
  var infra = window.sdrInfraCache || {};
  var candidatos = Object.entries(infra).filter(function(e) {
    var i = e[1];
    return i.cto_type === 'ceo' && (i.name || '').match(/^CTO/i);
  });

  if (candidatos.length === 0) {
    alert('Nenhum item CEO com nome "CTO..." encontrado.');
    return;
  }

  if (!confirm('Converter ' + candidatos.length + ' itens:\n' +
    candidatos.slice(0,5).map(function(e){ return '  ' + e[1].name; }).join('\n') +
    (candidatos.length > 5 ? '\n  ...e mais ' + (candidatos.length - 5) : '') +
    '\n\nTrocar prefixo CTO → CEO no nome?')) return;

  var total = candidatos.length, feitos = 0, erros = 0;
  candidatos.forEach(function(entry) {
    var id = entry[0], item = entry[1];
    var novoNome = item.name.replace(/^CTO/i, 'CEO');
    window.sdrRef('infrastructure/' + id + '/name').set(novoNome)
      .then(function() {
        feitos++;
        if (window.sdrInfraCache && window.sdrInfraCache[id]) window.sdrInfraCache[id].name = novoNome;
        if (feitos + erros === total) {
          alert('Conversão concluída!\n' + feitos + ' renomeados' + (erros ? ', ' + erros + ' erros' : '') + '.\nRecarregue o mapa para ver as mudanças.');
          if (typeof window.sdrLoadInfra === 'function') window.sdrLoadInfra();
        }
      })
      .catch(function() {
        erros++;
        if (feitos + erros === total) alert('Concluído com ' + erros + ' erros. ' + feitos + ' renomeados.');
      });
  });
};

window.sdrConverterRtNome = function() {
  var infra = window.sdrInfraCache || {};
  var candidatos = Object.entries(infra).filter(function(e) {
    var i = e[1];
    return (i.name || '').match(/^RT$/i) || (i.cto_type === 'rt' && (i.name || '').match(/^RT/i));
  });

  if (candidatos.length === 0) {
    alert('Nenhum item RT encontrado.');
    return;
  }

  var novoNome = prompt(
    'Encontrados ' + candidatos.length + ' itens com nome "RT".\n' +
    'Digite o prefixo para o novo nome (ex: "Reserva Técnica"):',
    'Reserva Técnica'
  );
  if (!novoNome) return;

  var total = candidatos.length, feitos = 0, erros = 0;
  candidatos.forEach(function(entry) {
    var id = entry[0], item = entry[1];
    var nomeAtual = item.name || 'RT';
    var nomeFinal = nomeAtual === 'RT' ? novoNome : nomeAtual.replace(/^RT/i, novoNome);
    window.sdrRef('infrastructure/' + id + '/name').set(nomeFinal)
      .then(function() {
        feitos++;
        if (window.sdrInfraCache && window.sdrInfraCache[id]) window.sdrInfraCache[id].name = nomeFinal;
        if (feitos + erros === total) {
          alert('Conversão RT concluída!\n' + feitos + ' renomeados.');
          if (typeof window.sdrLoadInfra === 'function') window.sdrLoadInfra();
        }
      })
      .catch(function() { erros++; });
  });
};

console.log('[SDR Bundle] realtime/index.js — realtime + alertas + templates + conversores OK');
