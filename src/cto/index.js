/**
 * SDR — Módulo CTO / CEO (Fase 9)
 * Extração de sdr-module.js → src/cto/index.js
 *
 * Dependências runtime via window:
 *   window.sdrRef            — referência Firebase (exposta em sdr-module.js)
 *   window.sdrInfraCache     — cache de infraestrutura
 *   window.sdrClientesCache  — cache de clientes
 *   window.SDR_CTO_ICONS     — ícones por subtipo (config.js)
 *   window.SDR_FIBER_STANDARDS — padrões de fibra (fiber-standards.js)
 *   window.sdrPowerBudgetCalc — power budget (power-budget.js)
 *   window._haversineM       — distância GPS (haversine.js)
 *   window.CABLE_RENDER      — estilos de cabo (config.js)
 *   window.sdrOpenInfraPanel, window.sdrInfraEdit, window.sdrViabilidadeCheck
 */

// ── Helper: padrão de fibra atual (lê do localStorage para evitar stale) ──

function _getSdrFiberStandard() {
  return localStorage.getItem('sdr_fiber_standard') || 'abnt';
}

// ── Utilitários de ocupação ───────────────────────────────────────────────

/**
 * Retorna lista de clientes vinculados a uma CTO.
 * @param {string} ctoId
 */
export function _sdrCtoOcupacao(ctoId) {
  const all = Object.values(window.sdrClientesCache || {});
  return all.filter(c => c.cto_id === ctoId);
}

/**
 * Retorna CTOs/splitters vinculados a um poste.
 * @param {string} poleId
 */
export function _sdrCtosDoPoste(poleId) {
  const infra = Object.entries(window.sdrInfraCache || {});
  return infra.filter(([, i]) => (i.type === 'cto' || i.type === 'splitter') && i.pole_id === poleId);
}

// ── Modal de portas da CTO ────────────────────────────────────────────────

window.sdrCTOPortsModal = function (id, item) {
  var existing = document.getElementById('sdr-cto-ports-modal');
  if (existing) existing.remove();
  window._ctoPortsItemRef = { id: id, item: item };

  var SDR_CTO_ICONS = window.SDR_CTO_ICONS || {};
  var _eff = (item.cto_type && SDR_CTO_ICONS[item.cto_type]) ? item.cto_type : (item.type || 'default');
  var ico  = SDR_CTO_ICONS[_eff] || SDR_CTO_ICONS.default || { bg: '#2563eb', label: 'CTO', icon: 'fa-box' };

  var cap    = parseInt(item.total_ports) || 0;
  var used   = parseInt(item.used_ports)  || 0;
  var livres = Math.max(0, cap - used);
  var pct    = cap > 0 ? Math.round((used / cap) * 100) : 0;
  var barColor    = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#22c55e';
  var livresColor = livres > 0 ? '#16a34a' : '#dc2626';

  // Power Budget
  var pb = (typeof window.sdrPowerBudgetCalc === 'function')
    ? window.sdrPowerBudgetCalc(id)
    : { status: 'unknown', totalLoss: 0, budget: 0, margem: 0, detail: [] };
  var pbColor = pb.status === 'ok' ? '#16a34a' : pb.status === 'warn' ? '#d97706' : pb.status === 'critical' ? '#dc2626' : '#94a3b8';
  var pbIcon  = pb.status === 'ok' ? 'fa-check-circle' : pb.status === 'warn' ? 'fa-exclamation-triangle' : pb.status === 'critical' ? 'fa-times-circle' : 'fa-question-circle';
  var pbLabel = pb.status === 'ok' ? 'Sinal OK' : pb.status === 'warn' ? 'Margem baixa ⚠️' : pb.status === 'critical' ? 'Sinal crítico ❌' : 'Caminho não mapeado';

  var pbDetailHtml = '';
  if (pb.detail && pb.detail.length > 0) {
    pb.detail.forEach(function (d) {
      pbDetailHtml += '<div style="display:flex;justify-content:space-between;font-size:.72rem;color:#475569;padding:2px 0">'
        + '<span>' + d.label + '</span><span style="font-weight:600">-' + d.loss + 'dB</span></div>';
    });
    pbDetailHtml += '<div style="height:1px;background:#e5e7eb;margin:5px 0"></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:.76rem;font-weight:700;color:#1e293b">'
      + '<span>Perda Total</span><span>' + pb.totalLoss + 'dB / ' + pb.budget + 'dB</span></div>'
      + '<div style="display:flex;justify-content:space-between;font-size:.76rem;font-weight:700;color:' + pbColor + '">'
      + '<span>Margem</span><span>' + (pb.margem > 0 ? '+' : '') + pb.margem + 'dB</span></div>';
  } else {
    pbDetailHtml = '<div style="font-size:.72rem;color:#94a3b8">Caminho até OLT não mapeado — configure parent_id nos splitters</div>';
  }

  // Clientes vinculados
  var clientes = [];
  Object.entries(window.sdrClientesCache || {}).forEach(function (e) {
    var c = e[1];
    if (c && (c.cto_id === id || c.cto === id)) clientes.push(c);
  });
  var clientesHtml = clientes.length > 0
    ? clientes.slice(0, 8).map(function (c) {
        var st = c.onu_status === 'online' ? '#16a34a' : c.onu_status === 'offline' ? '#dc2626' : '#d97706';
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:.75rem">'
          + '<i class="fas fa-circle" style="color:' + st + ';font-size:.45rem;flex-shrink:0"></i>'
          + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (c.name || '—') + '</span>'
          + '<span style="color:#94a3b8;font-size:.7rem">' + (c.plan_name || '') + '</span>'
          + '</div>';
      }).join('') + (clientes.length > 8 ? '<div style="font-size:.72rem;color:#94a3b8;text-align:center;padding:4px">+' + (clientes.length - 8) + ' mais</div>' : '')
    : '<div style="font-size:.75rem;color:#94a3b8;text-align:center;padding:8px">Nenhum cliente vinculado nesta CTO</div>';

  var modal = document.createElement('div');
  modal.id = 'sdr-cto-ports-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px';

  modal.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:420px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.25);overflow:hidden">'
    + '<div style="padding:14px 16px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;display:flex;align-items:center;gap:10px">'
    + '<div style="width:36px;height:36px;border-radius:10px;background:' + ico.bg + '44;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
    + '<i class="fas ' + ico.icon + '" style="color:' + ico.bg + ';font-size:.9rem"></i></div>'
    + '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (item.name || item.code || id) + '</div>'
    + '<div style="font-size:.72rem;opacity:.65">' + ico.label + (item.code ? ' · ' + item.code : '') + (item.endereco ? ' · ' + item.endereco : '') + '</div></div>'
    + '<button onclick="document.getElementById(\'sdr-cto-ports-modal\').remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1.4rem;opacity:.7;padding:0;line-height:1">&times;</button>'
    + '</div>'
    + '<div style="overflow-y:auto;flex:1">'
    + '<div style="padding:13px 16px;border-bottom:1px solid #e5e7eb">'
    + (cap > 0
      ? '<div style="display:flex;align-items:center;gap:14px;margin-bottom:10px">'
        + '<div style="text-align:center;min-width:48px"><div style="font-size:2rem;font-weight:900;line-height:1;color:' + livresColor + '">' + livres + '</div>'
        + '<div style="font-size:.6rem;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Livres</div></div>'
        + '<div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:.73rem;color:#64748b;margin-bottom:5px">'
        + '<span>Ocupação <b>' + pct + '%</b></span><span>' + used + ' de ' + cap + ' portas</span></div>'
        + '<div style="height:9px;background:#f1f5f9;border-radius:5px;overflow:hidden">'
        + '<div style="height:9px;background:' + barColor + ';border-radius:5px;width:' + pct + '%;transition:width .5s"></div></div>'
        + '</div></div>'
      : '<div style="font-size:.8rem;color:#94a3b8;text-align:center;padding:4px 0;margin-bottom:6px">Portas não configuradas</div>'
    )
    + '<div style="display:flex;gap:8px">'
    + '<button class="btn-map" onclick="sdrViabilidadeCheck(' + (item.lat || 0) + ',' + (item.lng || 0) + ',500);document.getElementById(\'sdr-cto-ports-modal\').remove()" style="flex:1;padding:7px 10px;font-size:.77rem"><i class="fas fa-search-location"></i> Ver área</button>'
    + '<button class="btn-map" onclick="document.getElementById(\'sdr-cto-ports-modal\').remove();setTimeout(function(){var r=window._ctoPortsItemRef||{};sdrOpenInfraPanel(r.id,sdrInfraCache[r.id]||r.item||{});},50)" style="flex:1;padding:7px 10px;font-size:.77rem"><i class="fas fa-eye"></i> Detalhes</button>'
    + '<button class="btn-map" onclick="document.getElementById(\'sdr-cto-ports-modal\').remove();setTimeout(function(){var r=window._ctoPortsItemRef||{};sdrInfraEdit(r.id);},50)" style="flex:1;padding:7px 10px;font-size:.77rem"><i class="fas fa-edit"></i> Editar</button>'
    + '</div></div>'
    + '<div style="padding:12px 16px;border-bottom:1px solid #e5e7eb">'
    + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px">'
    + '<i class="fas fa-signal" style="color:' + pbColor + '"></i>'
    + '<b style="font-size:.82rem;color:#1e293b">Power Budget</b>'
    + '<span style="margin-left:auto;font-size:.74rem;font-weight:700;color:' + pbColor + '"><i class="fas ' + pbIcon + '"></i> ' + pbLabel + '</span>'
    + '</div>'
    + '<div style="background:#f8fafc;border-radius:8px;padding:8px 10px">' + pbDetailHtml + '</div>'
    + '</div>'
    + '<div style="padding:12px 16px">'
    + '<div style="font-size:.8rem;font-weight:700;color:#374151;margin-bottom:8px">'
    + '<i class="fas fa-users" style="color:#2563eb;margin-right:5px"></i>Clientes vinculados (' + clientes.length + ')'
    + '</div>'
    + clientesHtml
    + (item.notes ? '<div style="margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:8px;font-size:.78rem;color:#78350f">' + item.notes + '</div>' : '')
    + '</div></div></div>';

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
};

// ── Modal de detalhes do cabo ─────────────────────────────────────────────

window.sdrCableDetailModal = function (id, item) {
  var tipos = { backbone: 'Backbone / Alimentador', distribuicao: 'Distribuição', drop: 'Drop / Acesso', projeto: 'Projeto' };
  var CABLE_RENDER = window.CABLE_RENDER || {};
  var sty = CABLE_RENDER[item.cable_type || 'unknown'] || CABLE_RENDER.unknown || { color: '#64748b' };
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px';
  var comp  = item.comprimento_m || item.length_m || '-';
  if (comp !== '-') comp = comp + 'm';
  var atenu   = item.atenuacao_db ? item.atenuacao_db + 'dB' : '-';
  var nota    = item.notes || item.kmz_desc || '';
  var notaHtml = nota ? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:.82rem;color:#78350f;margin-bottom:12px">' + nota + '</div>' : '';
  modal.innerHTML = '<div style="background:#fff;border-radius:14px;width:100%;max-width:460px;box-shadow:0 10px 40px rgba(0,0,0,.25)">'
    + '<div style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">'
    + '<div style="font-weight:700;color:#1e293b"><span style="display:inline-block;width:24px;height:6px;background:' + (item.kmz_color || sty.color) + ';border-radius:3px;margin-right:8px;vertical-align:middle"></span>' + (item.name || 'Cabo') + '</div>'
    + '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b">&#x2715;</button>'
    + '</div>'
    + '<div style="padding:16px 18px">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    + '<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Tipo</div><div style="font-weight:700;font-size:.88rem">' + (tipos[item.cable_type] || 'Desconhecido') + '</div></div>'
    + '<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Fibras</div><div style="font-weight:700;font-size:.88rem">' + (item.fiber_count || item.fibers || '?') + ' FO</div></div>'
    + '<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Comprimento</div><div style="font-weight:700;font-size:.88rem">' + comp + '</div></div>'
    + '<div style="background:#f8fafc;border-radius:8px;padding:11px;text-align:center"><div style="font-size:.72rem;color:#64748b;margin-bottom:3px">Atenuação</div><div style="font-weight:700;font-size:.88rem">' + atenu + '</div></div>'
    + '</div>' + notaHtml
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button onclick="this.closest(\'[style*=fixed]\').remove()" class="btn-map" style="padding:6px 14px">Fechar</button>'
    + '<button onclick="this.closest(\'[style*=fixed]\').remove();sdrInfraEdit(\'' + id + '\')" class="btn-map" style="padding:6px 14px;background:var(--primary);color:#fff"><i class="fas fa-pencil-alt"></i> Editar</button>'
    + '</div></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
};

// ── RT — editar metragem ──────────────────────────────────────────────────

window.sdrRtEditMetragem = function (id, metrosAtual) {
  var val = prompt('Metragem da Reserva Técnica (em metros):', metrosAtual || '');
  if (val === null) return;
  var metros = parseFloat(val);
  if (isNaN(metros) || metros < 0) { alert('Valor inválido. Digite apenas números.'); return; }
  window.sdrRef('infrastructure/' + id + '/comprimento_m').set(metros).then(function () {
    if (window.sdrInfraCache && window.sdrInfraCache[id]) {
      window.sdrInfraCache[id].comprimento_m = metros;
    }
    if (typeof window.sdrOpenInfraPanel === 'function') {
      window.sdrOpenInfraPanel(id, window.sdrInfraCache[id] || { comprimento_m: metros });
    }
  }).catch(function (e) { alert('Erro ao salvar: ' + e.message); });
};

// ── CEO — Diagrama de Fusão ───────────────────────────────────────────────

function _getCeoFiberColors() {
  var std = window.SDR_FIBER_STANDARDS ? window.SDR_FIBER_STANDARDS[_getSdrFiberStandard()] : null;
  if (std && std.fibers) {
    return std.fibers.map(function (f) {
      return { cor: f.color, nome: f.name, borda: (f.color === '#ffffff' ? '#94a3b8' : null) };
    });
  }
  return [
    { cor: '#16a34a', nome: 'Verde'  }, { cor: '#eab308', nome: 'Amarelo' },
    { cor: '#ffffff', nome: 'Branco', borda: '#94a3b8' }, { cor: '#2563eb', nome: 'Azul' },
    { cor: '#dc2626', nome: 'Vermelho' }, { cor: '#7c3aed', nome: 'Violeta' },
    { cor: '#92400e', nome: 'Marrom' }, { cor: '#ec4899', nome: 'Rosa' },
    { cor: '#0f172a', nome: 'Preto'  }, { cor: '#0891b2', nome: 'Ciano' },
    { cor: '#94a3b8', nome: 'Cinza'  }, { cor: '#f97316', nome: 'Laranja' }
  ];
}

window.sdrCeoFusaoModal = function (id) {
  var item    = (window.sdrInfraCache && window.sdrInfraCache[id]) || {};
  var fusoes  = item.ceo_fusoes || {};
  var notaKmz = item.kmz_desc  || '';
  var stdName = _getSdrFiberStandard() === 'tia' ? 'TIA-598' : 'ABNT';

  var totalFibras = 12;
  var nameMatch = (item.name || '').match(/(\d+)\/(\d+)/);
  if (nameMatch) totalFibras = Math.max(parseInt(nameMatch[1]) || 12, parseInt(nameMatch[2]) || 12);
  if (totalFibras > 48) totalFibras = 48;

  // Cabos próximos (raio ≈ 300m)
  var cabosProximos = [];
  if (item.lat && item.lng && typeof window._haversineM === 'function') {
    Object.entries(window.sdrInfraCache || {}).forEach(function (e) {
      var cid = e[0], cab = e[1];
      if (cab.type !== 'cable' || !cab.route || !cab.route.length) return;
      var minDist = Infinity;
      cab.route.forEach(function (pt) {
        var d = window._haversineM({ lat: item.lat, lng: item.lng }, { lat: pt.lat, lng: pt.lng });
        if (d < minDist) minDist = d;
      });
      if (minDist <= 300) cabosProximos.push({ id: cid, cab: cab, dist: Math.round(minDist) });
    });
    cabosProximos.sort(function (a, b) { return a.dist - b.dist; });
  }

  var prev = document.getElementById('sdr-ceo-fusao-modal');
  if (prev) prev.remove();

  var numBandejas = Math.max(1, Object.keys(fusoes).length);
  var modal = document.createElement('div');
  modal.id = 'sdr-ceo-fusao-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;padding:0';

  var cabosHtml = '';
  if (cabosProximos.length > 0) {
    var CABLE_RENDER = window.CABLE_RENDER || {};
    cabosHtml = '<div style="padding:8px 14px;border-bottom:1px solid #f1f5f9">'
      + '<div style="font-size:.72rem;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px"><i class="fas fa-wave-square" style="color:#16a34a;margin-right:4px"></i>Cabos Próximos (' + cabosProximos.length + ')</div>'
      + '<div style="display:flex;flex-direction:column;gap:3px">'
      + cabosProximos.slice(0, 5).map(function (e) {
          var sty = CABLE_RENDER[e.cab.cable_type] || { color: '#64748b' };
          return '<div style="display:flex;align-items:center;gap:6px;font-size:.76rem">'
            + '<span style="display:inline-block;width:14px;height:4px;background:' + (e.cab.kmz_color || sty.color) + ';border-radius:2px;flex-shrink:0"></span>'
            + '<span style="flex:1;color:#334155">' + (e.cab.name || 'Cabo') + '</span>'
            + '<span style="color:#94a3b8">' + (e.cab.fiber_count || '?') + ' FO</span>'
            + '<span style="color:#64748b;font-weight:600">' + e.dist + 'm</span></div>';
        }).join('')
      + '</div></div>';
  }

  modal.innerHTML = '<div style="background:#fff;border-radius:18px 18px 0 0;width:100%;max-width:500px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,.25)">'
    + '<div style="padding:13px 16px;background:linear-gradient(135deg,#ea580c,#dc2626);color:#fff;border-radius:18px 18px 0 0;display:flex;align-items:center;gap:10px">'
    + '<i class="fas fa-project-diagram" style="font-size:1.1rem;opacity:.9"></i>'
    + '<div style="flex:1"><div style="font-weight:700;font-size:.95rem">Diagrama de Fusão · CEO</div>'
    + '<div style="font-size:.72rem;opacity:.8">' + (item.name || 'CEO') + ' · Padrão ' + stdName + '</div></div>'
    + '<button onclick="sdrShowFiberStandardModal()" title="Trocar padrão ABNT/TIA" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:.7rem;margin-right:4px"><i class="fas fa-palette"></i> ' + stdName + '</button>'
    + '<button onclick="document.getElementById(\'sdr-ceo-fusao-modal\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:1rem">&times;</button>'
    + '</div>'
    + (notaKmz ? '<div style="padding:7px 14px;background:#fffbeb;border-bottom:1px solid #fde68a;font-size:.73rem;color:#78350f"><i class="fas fa-info-circle" style="margin-right:4px"></i>' + notaKmz + '</div>' : '')
    + cabosHtml
    + '<div style="padding:9px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
    + '<span style="font-size:.76rem;font-weight:600;color:#475569">Bandeja:</span>'
    + '<div id="sdr-ceo-bandeja-tabs" style="display:flex;gap:4px;flex-wrap:wrap">'
    + Array.from({ length: numBandejas }, function (_, i) {
        var b = i + 1, isSel = b === 1;
        return '<button id="sdr-ceo-tab-' + b + '" onclick="sdrCeoFusaoTab(\'' + id + '\',' + b + ')" style="padding:3px 10px;font-size:.73rem;border-radius:6px;border:1px solid ' + (isSel ? '#ea580c' : '#e2e8f0') + ';background:' + (isSel ? '#fff7ed' : '#fff') + ';color:' + (isSel ? '#ea580c' : '#64748b') + ';cursor:pointer;font-weight:' + (isSel ? '700' : '400') + '">B' + b + '</button>';
      }).join('')
    + '<button onclick="sdrCeoFusaoAddBandeja(\'' + id + '\')" style="padding:3px 9px;font-size:.73rem;border-radius:6px;border:1px dashed #ea580c;background:#fff7ed;color:#ea580c;cursor:pointer"><i class="fas fa-plus"></i></button>'
    + '</div></div>'
    + '<div id="sdr-ceo-fusao-body" style="flex:1;overflow-y:auto;padding:10px 14px"></div>'
    + '<div style="padding:9px 14px;border-top:1px solid #f1f5f9;display:flex;gap:8px">'
    + '<button onclick="document.getElementById(\'sdr-ceo-fusao-modal\').remove()" style="flex:1;padding:8px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:.82rem">Fechar</button>'
    + '<button onclick="sdrCeoFusaoAddBandeja(\'' + id + '\')" style="padding:8px 14px;background:#fff7ed;border:1px solid #fed7aa;color:#ea580c;border-radius:8px;cursor:pointer;font-size:.82rem"><i class="fas fa-plus"></i> Bandeja</button>'
    + '</div></div>';

  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
  modal._totalFibras = totalFibras;
  modal._id = id;

  window.sdrCeoFusaoTab(id, 1);
};

window.sdrCeoFusaoTab = function (id, bandeja) {
  var modal = document.getElementById('sdr-ceo-fusao-modal');
  if (!modal) return;
  var item        = (window.sdrInfraCache && window.sdrInfraCache[id]) || {};
  var fusoes      = item.ceo_fusoes || {};
  var totalFibras = modal._totalFibras || 12;
  var cores       = _getCeoFiberColors();

  document.querySelectorAll('[id^="sdr-ceo-tab-"]').forEach(function (btn) {
    var isActive = btn.id === 'sdr-ceo-tab-' + bandeja;
    btn.style.borderColor = isActive ? '#ea580c' : '#e2e8f0';
    btn.style.background  = isActive ? '#fff7ed' : '#fff';
    btn.style.color       = isActive ? '#ea580c' : '#64748b';
    btn.style.fontWeight  = isActive ? '700' : '400';
  });

  var body = document.getElementById('sdr-ceo-fusao-body');
  if (!body) return;
  var dados = fusoes[bandeja] || {};
  var totalMapeadas = Object.keys(dados).length;

  var html = '<div style="font-size:.72rem;color:#64748b;margin-bottom:8px;display:flex;gap:12px">'
    + '<span><i class="fas fa-link" style="color:#16a34a;margin-right:3px"></i>' + totalMapeadas + ' mapeadas</span>'
    + '<span><i class="fas fa-unlink" style="color:#94a3b8;margin-right:3px"></i>' + (totalFibras - totalMapeadas) + ' livres</span></div>';

  for (var f = 1; f <= totalFibras; f++) {
    var fc       = cores[(f - 1) % cores.length] || { cor: '#94a3b8', nome: '?' };
    var destino  = dados[f] ? String(dados[f]) : '';
    var hasConn  = !!destino;
    var destLabel = destino ? (isNaN(parseInt(destino)) ? destino : 'F' + destino) : '—';
    html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:' + (hasConn ? '#f0fdf4' : '#fafafa') + ';border:1px solid ' + (hasConn ? '#86efac' : '#e2e8f0') + ';border-radius:6px;margin-bottom:3px">'
      + '<div style="width:13px;height:13px;border-radius:50%;background:' + fc.cor + ';border:1.5px solid ' + (fc.borda || fc.cor) + ';flex-shrink:0"></div>'
      + '<span style="font-size:.78rem;font-weight:700;color:#334155;min-width:26px">F' + f + '</span>'
      + '<span style="font-size:.71rem;color:#94a3b8;flex:1">' + fc.nome + '</span>'
      + '<span style="font-size:.74rem;color:' + (hasConn ? '#15803d' : '#94a3b8') + ';font-weight:' + (hasConn ? '700' : '400') + ';margin-right:4px">' + (hasConn ? '→ ' + destLabel : '—') + '</span>'
      + '<button onclick="sdrCeoFusaoEditar(\'' + id + '\',' + bandeja + ',' + f + ',\'' + destino + '\')" style="padding:2px 8px;font-size:.68rem;background:' + (hasConn ? '#dcfce7' : '#f1f5f9') + ';border:1px solid ' + (hasConn ? '#86efac' : '#e2e8f0') + ';border-radius:4px;cursor:pointer;color:' + (hasConn ? '#15803d' : '#64748b') + ';flex-shrink:0">' + (hasConn ? 'Editar' : 'Mapear') + '</button>'
      + '</div>';
  }
  body.innerHTML = html;
};

window.sdrCeoFusaoEditar = function (id, bandeja, fibra, destinoAtual) {
  var val = prompt('Fibra de destino para F' + fibra + ' (Bandeja ' + bandeja + '):\nDigite o número da fibra de saída (ex: 5), ou deixe em branco para limpar:', destinoAtual || '');
  if (val === null) return;
  val = val.trim();
  var item   = (window.sdrInfraCache && window.sdrInfraCache[id]) || {};
  var fusoes = JSON.parse(JSON.stringify(item.ceo_fusoes || {}));
  if (!fusoes[bandeja]) fusoes[bandeja] = {};
  if (val === '') {
    delete fusoes[bandeja][fibra];
  } else {
    var num = parseInt(val);
    if (isNaN(num) || num < 1) { alert('Número inválido.'); return; }
    fusoes[bandeja][fibra] = num;
  }
  window.sdrRef('infrastructure/' + id + '/ceo_fusoes').set(fusoes).then(function () {
    if (window.sdrInfraCache && window.sdrInfraCache[id]) {
      window.sdrInfraCache[id].ceo_fusoes = fusoes;
    }
    window.sdrCeoFusaoTab(id, bandeja);
  }).catch(function (e) { alert('Erro: ' + e.message); });
};

window.sdrCeoFusaoAddBandeja = function (id) {
  var item       = (window.sdrInfraCache && window.sdrInfraCache[id]) || {};
  var fusoes     = item.ceo_fusoes || {};
  var novaBandeja = Object.keys(fusoes).length + 1;
  var modal = document.getElementById('sdr-ceo-fusao-modal');
  if (!modal) return;
  var tabs = document.getElementById('sdr-ceo-bandeja-tabs');
  if (tabs) {
    var btn = document.createElement('button');
    btn.id = 'sdr-ceo-tab-' + novaBandeja;
    btn.setAttribute('onclick', 'sdrCeoFusaoTab(\'' + id + '\',' + novaBandeja + ')');
    btn.style.cssText = 'padding:4px 12px;font-size:.75rem;border-radius:6px;border:1px solid #e2e8f0;background:#fff;color:#64748b;cursor:pointer';
    btn.textContent = 'B' + novaBandeja;
    var addBtn = tabs.querySelector('[onclick*="AddBandeja"]');
    tabs.insertBefore(btn, addBtn);
  }
  window.sdrCeoFusaoTab(id, novaBandeja);
};

// ── Expor utilitários de ocupação ─────────────────────────────────────────

window._sdrCtoOcupacao  = _sdrCtoOcupacao;
window._sdrCtosDoPoste  = _sdrCtosDoPoste;

console.log('[SDR Bundle] cto/index.js carregado — CTOPortsModal + CEO fusao + cable modal OK');
