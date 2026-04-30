/**
 * SDR — Fase 22: Infra Render Grid + sdrInfraAdd + sdrOltAdd
 * Migrado de sdr-module.js:
 *   sdrInfraRender    (linhas 593-600)
 *   _renderInfraGrid  (linhas 601-665, privada IIFE)
 *   sdrInfraAdd       (linhas 667-669)
 *   sdrOltAdd         (linhas 721-723)
 *
 * Deps runtime via window:
 *   window.sdrRef, window.sdrInfraCache, window.INFRA_TYPES,
 *   window.sdrOpenInfraPanel, window.sdrCtxMenu, window._sdrCtxInfra,
 *   window.sdrInfraEdit, window._sdrShowAddModal
 */

// ── Privada: renderiza grid de infra (filtro + stats + cards) ──
function _renderInfraGrid() {
  const filterType = document.getElementById('infra-filter-type')?.value || '';
  const search     = (document.getElementById('infra-search')?.value || '').toLowerCase();
  const cache      = window.sdrInfraCache || {};
  const TYPES      = window.INFRA_TYPES  || {};

  const items = Object.entries(cache).filter(([id, item]) => {
    if (!item) return false;
    if (filterType && item.type !== filterType) return false;
    if (search) {
      const searchable = `${item.name||''} ${item.code||''} ${item.notes||''}`.toLowerCase();
      if (!searchable.includes(search)) return false;
    }
    return true;
  });

  // Stats
  const all     = Object.values(cache);
  const statsEl = document.getElementById('infra-stats');
  if (statsEl) {
    statsEl.innerHTML = Object.entries(TYPES).map(([k, v]) => {
      const count = all.filter(i => i.type === k).length;
      return `<div class="infra-stat"><div class="is-num" style="color:${v.color}">${count}</div><div class="is-label">${v.label}s</div></div>`;
    }).join('');
  }

  // Grid
  const gridEl = document.getElementById('infra-grid');
  if (!gridEl) return;

  if (items.length === 0) {
    gridEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      <i class="fas fa-map-signs" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:.4"></i>
      <p style="font-size:.9rem;margin-bottom:8px">Nenhum item cadastrado</p>
      <button class="btn-primary" onclick="sdrInfraAdd()" style="padding:8px 20px;font-size:.85rem"><i class="fas fa-plus"></i> Cadastrar primeiro item</button>
    </div>`;
    return;
  }

  gridEl.innerHTML = items.map(([id, item]) => {
    const _effType = (item.cto_type && TYPES[item.cto_type]) ? item.cto_type : item.type;
    const cfg = TYPES[_effType] || TYPES.pole || {};
    let detail = '';
    if      (item.total_ports)    detail = `Portas: ${item.used_ports||0}/${item.total_ports}`;
    else if (item.fiber_count)    detail = `${item.fiber_count} fibras | ${item.length_meters||0}m`;
    else if (item.concessionaria) detail = item.concessionaria;
    else if (item.model)          detail = item.model;
    else if (item.ip_address)     detail = `IP: ${item.ip_address}`;

    return `<div class="infra-card" style="cursor:pointer;position:relative" onclick="sdrOpenInfraPanel('${id}',sdrInfraCache['${id}'])" oncontextmenu="sdrCtxMenu(event,_sdrCtxInfra('${id}'))">
      <div class="ic-top">
        <div class="ic-icon ${cfg.iconClass||''}"><i class="fas ${cfg.icon||'fa-circle'}"></i></div>
        <div style="flex:1">
          <div class="ic-name">${item.name||item.code||id}</div>
          <div class="ic-type">${cfg.label||''}${item.code?' | '+item.code:''}</div>
        </div>
        <button class="sdr-row-menu" onclick="event.stopPropagation();sdrCtxMenu(event,_sdrCtxInfra('${id}'))" title="Ações" style="align-self:flex-start"><i class="fas fa-ellipsis-v"></i></button>
      </div>
      ${detail?`<div class="ic-detail">${detail}</div>`:''}
      <div class="sdr-card-actions" style="display:flex;gap:6px;margin-top:8px">
        <button onclick="event.stopPropagation();sdrOpenInfraPanel('${id}',sdrInfraCache['${id}'])" style="padding:3px 8px;font-size:.72rem;border:1px solid #e5e7eb;border-radius:5px;background:#f8fafc;cursor:pointer"><i class="fas fa-eye"></i> Ver</button>
        <button onclick="event.stopPropagation();sdrInfraEdit('${id}')" style="padding:3px 8px;font-size:.72rem;border:1px solid #e5e7eb;border-radius:5px;background:#f8fafc;cursor:pointer"><i class="fas fa-edit"></i> Editar</button>
      </div>
    </div>`;
  }).join('');
}

// ── sdrInfraRender: carrega Firebase → cache → grid ──
window.sdrInfraRender = window.sdrInfraRender || function() {
  window.sdrRef('infrastructure').once('value').then(snap => {
    window.sdrInfraCache = snap.val() || {};
    _renderInfraGrid();
  });
};

// ── sdrInfraAdd: abre modal de adição ──
window.sdrInfraAdd = window.sdrInfraAdd || function() {
  window._sdrShowAddModal(null, null);
};

// ── sdrOltAdd: abre modal de adição de OLT ──
window.sdrOltAdd = window.sdrOltAdd || function() {
  window._sdrShowAddModal(null, { type: 'olt' });
};

console.log('[SDR Bundle] infra/render.js — sdrInfraRender + sdrInfraAdd + sdrOltAdd OK');
