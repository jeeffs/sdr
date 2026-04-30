/**
 * SDR — Renderização do Mapa (Fase 7)
 * Extração de sdr-module.js → src/map/render.js
 *
 * Dependências runtime via window (disponíveis após sdrMapInit):
 *   window.sdrMap, window.sdrLayers, window.sdrLayerVisible
 *   window.sdrInfraCache, window.sdrClientesCache, window.sdrOltsCache
 *   window.INFRA_TYPES, window.SDR_CTO_ICONS, window.SDR_CTO_COLOR_MAP
 *   window.CABLE_RENDER, window.CABLE_FIBER_COLOR, window.SDR_CABLE_COLOR_MAP
 *   window.sdrOpenInfraPanel, window.sdrCTOPortsModal, window.sdrCableDetailModal
 *   window._sdrCtxOlt, window._sdrCtxCliente, window.sdrCtxMenu, window.sdrOltTabSwitch
 */

// ── Utilitários de apresentação ───────────────────────────────────────────

export function _fmtDist(m) {
  return m >= 1000 ? (m / 1000).toFixed(2) + 'km' : m + 'm';
}

/**
 * Corresponde uma cor hex ao entry mais próximo de um colorMap por distância RGB.
 * @param {string} hexColor  - cor '#rrggbb'
 * @param {Array}  colorMap  - array com { hex: [...], ... }
 */
export function _matchKMZColor(hexColor, colorMap) {
  if (!hexColor || hexColor.length < 7) return null;
  const r1 = parseInt(hexColor.slice(1, 3), 16);
  const g1 = parseInt(hexColor.slice(3, 5), 16);
  const b1 = parseInt(hexColor.slice(5, 7), 16);
  let best = null, bestDist = Infinity;
  for (const entry of colorMap) {
    for (const ref of entry.hex) {
      const r2 = parseInt(ref.slice(1, 3), 16);
      const g2 = parseInt(ref.slice(3, 5), 16);
      const b2 = parseInt(ref.slice(5, 7), 16);
      const d = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
      if (d < bestDist) { bestDist = d; best = entry; }
    }
  }
  return bestDist < 90 ? best : null;
}

// ── Painel de informações do mapa ─────────────────────────────────────────

export function sdrUpdateMapInfo() {
  const infra = Object.values(window.sdrInfraCache || {});
  const _set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  _set('mi-poles',   infra.filter(i => i.type === 'pole').length);
  _set('mi-ctos',    infra.filter(i => i.type === 'cto' || i.type === 'splitter').length);
  _set('mi-cables',  infra.filter(i => i.type === 'cable').length);
  _set('mi-clients', Object.keys(window.sdrClientesCache || {}).length);
  _set('mi-olts',    Object.keys(window.sdrOltsCache || {}).length);
}

// ── HTML de popup de infraestrutura ──────────────────────────────────────

export function _infraPopup(id, item) {
  const _effType = (item.cto_type && window.INFRA_TYPES[item.cto_type]) ? item.cto_type : item.type;
  const cfg = window.INFRA_TYPES[_effType] || window.INFRA_TYPES.pole;
  let html = `<b>${cfg.label}: ${item.name || item.code || id}</b>`;
  if (item.code)          html += `<br>Código: ${item.code}`;
  if (item.total_ports)   html += `<br>Portas: ${item.used_ports || 0}/${item.total_ports}`;
  if (item.concessionaria)html += `<br>Concess.: ${item.concessionaria}`;
  if (item.fiber_count)   html += `<br>Fibras: ${item.fiber_count}`;
  return html;
}

// ── Render: clientes ──────────────────────────────────────────────────────

export function sdrMapRenderClients() {
  const layers = window.sdrLayers;
  if (!layers || !layers.clients) return;
  layers.clients.clearLayers();
  Object.entries(window.sdrClientesCache || {}).forEach(([id, c]) => {
    if (!c || !c.lat || !c.lng) return;
    const status = c.financial_status === 'inadimplente' ? 'client-off' :
                   c.onu_status === 'offline'  ? 'client-bad' :
                   c.onu_status === 'degraded' ? 'client-warn' : 'client-ok';
    const marker = L.marker([c.lat, c.lng], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: `<div class="marker-icon ${status}"><i class="fas fa-user"></i></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    marker.bindTooltip(
      `<b>${c.name || 'Cliente'}</b><br>${c.plan_name || ''} · ${c.onu_status || ''}`,
      { direction: 'top', offset: [0, -14] }
    );
    marker.on('click', () => window.sdrOpenClientePanel(id, c));
    marker.on('contextmenu', (e) => {
      L.DomEvent.preventDefault(e);
      L.DomEvent.stopPropagation(e);
      window.sdrCtxMenu(e.originalEvent, window._sdrCtxCliente(id));
    });
    layers.clients.addLayer(marker);
  });
}

// ── Render: OLTs ──────────────────────────────────────────────────────────

export function sdrMapRenderOlts() {
  const layers = window.sdrLayers;
  if (!layers || !layers.olts) return;
  layers.olts.clearLayers();

  // OLTs gerenciadas via painel OLTs (olt_connections)
  Object.entries(window.sdrOltsCache || {}).forEach(([id, o]) => {
    if (!o || !o.lat || !o.lng) return;
    const marker = L.marker([o.lat, o.lng], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: `<div class="marker-icon olt"><i class="fas fa-server"></i></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    marker.bindTooltip(
      `<b>${o.name || 'OLT'}</b><br>${o.model || ''} · ${o.ip_address || ''}`,
      { direction: 'top', offset: [0, -14] }
    );
    marker.on('click', function () {
      if (typeof showPage === 'function') showPage('olts');
      setTimeout(function () { window.sdrOltTabSwitch(id); }, 250);
    });
    marker.on('contextmenu', (e) => {
      L.DomEvent.preventDefault(e);
      L.DomEvent.stopPropagation(e);
      window.sdrCtxMenu(e.originalEvent, window._sdrCtxOlt(id));
    });
    layers.olts.addLayer(marker);
  });

  // OLTs de infraestrutura (type='olt' em sdrInfraCache) — não duplicar olt_connections
  const infraCache = window.sdrInfraCache || {};
  const oltsCache  = window.sdrOltsCache  || {};
  Object.entries(infraCache).forEach(([iid, item]) => {
    if (!item || item.type !== 'olt' || !item.lat || !item.lng) return;
    if (oltsCache[iid]) return; // já renderizado acima
    const imarker = L.marker([item.lat, item.lng], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: '<div class="marker-icon olt"><i class="fas fa-server"></i></div>',
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    imarker.bindTooltip('<b>' + (item.name || item.code || 'OLT') + '</b>', { direction: 'top', offset: [0, -14] });
    imarker.on('click', function () { window.sdrOpenInfraPanel(iid, item); });
    imarker.on('contextmenu', function (e) {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      window.sdrOpenInfraPanel(iid, item);
    });
    layers.olts.addLayer(imarker);
  });
}

// ── Render: infraestrutura completa (postes, CTOs, cabos, áreas) ──────────

window.sdrMapRenderInfra = function () {
  const layers = window.sdrLayers;
  if (!layers) return;
  layers.poles.clearLayers();
  layers.ctos.clearLayers();
  layers.cables.clearLayers();
  if (layers.areas) layers.areas.clearLayers();

  const CABLE_RENDER        = window.CABLE_RENDER        || {};
  const CABLE_FIBER_COLOR   = window.CABLE_FIBER_COLOR   || {};
  const SDR_CABLE_COLOR_MAP = window.SDR_CABLE_COLOR_MAP || [];
  const SDR_CTO_ICONS       = window.SDR_CTO_ICONS       || {};
  const SDR_CTO_COLOR_MAP   = window.SDR_CTO_COLOR_MAP   || [];
  const INFRA_TYPES         = window.INFRA_TYPES         || {};

  Object.entries(window.sdrInfraCache || {}).forEach(([id, item]) => {
    if (!item) return;

    // ── Cabos ──────────────────────────────────────────────────────────────
    if (item.type === 'cable' && item.route && item.route.length >= 2) {
      let ctype = item.cable_type || 'unknown', fibers = item.fiber_count;
      if (item.kmz_color) {
        const m = _matchKMZColor(item.kmz_color, SDR_CABLE_COLOR_MAP);
        if (m) { ctype = m.cabo; if (!fibers) fibers = m.fibers; }
      }
      const fiberStyle = fibers && CABLE_FIBER_COLOR[fibers];
      const typeStyle  = CABLE_RENDER[ctype] || CABLE_RENDER.unknown || { color: '#8b5cf6', weight: 3 };
      const color  = ctype === 'projeto' ? '#06b6d4' : (fiberStyle ? fiberStyle.color : typeStyle.color);
      const weight = fiberStyle ? fiberStyle.weight : typeStyle.weight;
      const dash   = item.installation === 'subterraneo' ? '10,5' : null;
      const line   = L.polyline(item.route.map(p => [p.lat, p.lng]),
        { color, weight, opacity: 0.95, dashArray: dash });
      line.bindTooltip(
        `<b>${item.name || 'Cabo'}</b><br>${fibers || '?'}FO • ${ctype} • ` +
        `${item.installation === 'subterraneo' ? 'Subterrâneo' : 'Aéreo'}` +
        `${item.length_m ? ' • ' + _fmtDist(item.length_m) : ''}`,
        { sticky: true }
      );
      line.on('click', () => window.sdrCableDetailModal(id, { ...item, cable_type: ctype, fiber_count: fibers }));
      line.on('contextmenu', (e) => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        window.sdrOpenInfraPanel(id, item);
      });
      layers.cables.addLayer(line);
      return;
    }

    if (!item.lat || !item.lng) return;
    const type = item.type || 'pole';

    // ── CTOs / Splitters / CEO / RT / EMD ─────────────────────────────────
    if (type === 'cto' || type === 'splitter' || type === 'ceo' || type === 'rt' || type === 'emd') {
      let subtype = item.cto_type || type || 'default';
      if (!item.cto_type && item.kmz_color) {
        const m = _matchKMZColor(item.kmz_color, SDR_CTO_COLOR_MAP);
        if (m) subtype = m.cto_type;
      }
      if ((item.name || '').toUpperCase() === 'RT') subtype = 'rt';

      const ico      = SDR_CTO_ICONS[subtype] || SDR_CTO_ICONS.default || { bg: '#2563eb', label: 'CTO', icon: 'fa-box' };
      const cap      = item.total_ports || 0;
      const used     = item.used_ports  || 0;
      const pct      = cap > 0 ? Math.round((used / cap) * 100) : 0;
      const bgColor  = pct >= 90 ? '#dc2626' : pct >= 60 ? '#d97706' : ico.bg;
      const barColor = pct >= 90 ? '#dc2626' : pct >= 60 ? '#d97706' : '#22c55e';
      const shortName = (item.name || '').replace(/^(CTO|CEO|RT|EMD|SPL)\s*/i, '').substring(0, 18);

      let html = `<div class="cto-marker">`;
      html += `<div class="cto-box" style="background:${bgColor}">`;
      html += `<i class="fas ${ico.icon || 'fa-box'}"></i>`;
      html += `<span>${ico.label}</span>`;
      if (cap > 0) html += `<span style="font-size:8px;opacity:0.85;margin-left:1px">${used}/${cap}</span>`;
      html += `</div>`;
      if (shortName) html += `<div class="cto-name">${shortName}</div>`;
      if (cap > 0) {
        html += `<div class="cto-bar"><div class="cto-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>`;
      }
      html += `</div>`;

      const marker = L.marker([item.lat, item.lng], {
        icon: L.divIcon({ className: '', html, iconSize: [50, 32], iconAnchor: [25, 32] })
      });
      marker.bindTooltip(
        `${item.name || 'CTO'} • ${ico.label}${cap > 0 ? ' • ' + used + '/' + cap + ' portas (' + pct + '%)' : ''}`,
        { direction: 'top', offset: [0, -5] }
      );
      marker.on('click', () => window.sdrCTOPortsModal(id, { ...item, cto_type: subtype }));
      marker.on('contextmenu', (e) => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        window.sdrOpenInfraPanel(id, item);
      });
      layers.ctos.addLayer(marker);
      return;
    }

    // ── Áreas de cobertura ─────────────────────────────────────────────────
    if (type === 'coverage_area' && item.polygon && item.polygon.length >= 3) {
      const acolor = item.color || '#0ea5e9';
      const apoly  = L.polygon(item.polygon.map(p => [p.lat, p.lng]), {
        color: acolor, fillColor: acolor, fillOpacity: 0.12, weight: 2, dashArray: '6,4'
      });
      apoly.bindTooltip(
        '<b>' + (item.name || 'Área de Cobertura') + '</b>' + (item.notes ? '<br>' + item.notes : ''),
        { sticky: true }
      );
      apoly.on('contextmenu', (e) => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        window.sdrOpenInfraPanel(id, item);
      });
      if (layers.areas) layers.areas.addLayer(apoly);
      return;
    }

    // ── Postes e outros ────────────────────────────────────────────────────
    const _effTypeMap = (item.cto_type && INFRA_TYPES[item.cto_type]) ? item.cto_type : type;
    const cfg = INFRA_TYPES[_effTypeMap] || INFRA_TYPES.pole || { iconClass: 'pole', icon: 'fa-bolt', label: 'Poste' };
    const marker = L.marker([item.lat, item.lng], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: `<div class="marker-icon ${cfg.iconClass}"><i class="fas ${cfg.icon}"></i></div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      })
    });
    marker.bindTooltip(item.name || cfg.label, { direction: 'top', offset: [0, -14] });
    marker.on('click', () => window.sdrOpenInfraPanel(id, item));
    marker.on('contextmenu', (e) => {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      window.sdrOpenInfraPanel(id, item);
    });
    (layers[type + 's'] || layers.poles).addLayer(marker);
  });
};

// ── Controles do painel de informações ────────────────────────────────────

window.sdrMapInfoToggle = function () {
  const panel = document.getElementById('map-info');
  const body  = document.getElementById('map-info-body');
  const chev  = document.getElementById('map-info-chev');
  const btn   = document.getElementById('map-info-toggle');
  if (!panel) return;
  const collapsed = panel.getAttribute('data-collapsed') === '1';
  if (collapsed) {
    panel.style.width = '260px'; panel.style.minWidth = '260px'; panel.style.padding = '12px';
    if (body) body.style.display = '';
    if (chev) chev.style.transform = 'rotate(0deg)';
    if (btn)  btn.title = 'Minimizar painel';
    panel.setAttribute('data-collapsed', '0');
    if (window.sdrMap) setTimeout(() => window.sdrMap.invalidateSize(), 240);
  } else {
    panel.style.width = '28px'; panel.style.minWidth = '28px'; panel.style.padding = '0';
    if (body) body.style.display = 'none';
    if (chev) chev.style.transform = 'rotate(180deg)';
    if (btn)  btn.title = 'Expandir painel';
    panel.setAttribute('data-collapsed', '1');
    if (window.sdrMap) setTimeout(() => window.sdrMap.invalidateSize(), 240);
  }
};

window.sdrMapToggleLayer = function (layer) {
  const lv = window.sdrLayerVisible;
  const ls = window.sdrLayers;
  const mp = window.sdrMap;
  if (!lv || !ls || !mp) return;
  lv[layer] = !lv[layer];
  const btn = document.getElementById('ml-' + layer);
  if (btn) btn.classList.toggle('active', lv[layer]);
  if (lv[layer]) { if (ls[layer]) mp.addLayer(ls[layer]); }
  else           { if (ls[layer]) mp.removeLayer(ls[layer]); }
};

window.sdrMapCenterOnMe = function () {
  if (!navigator.geolocation) { window.toast('GPS não disponível', 'error'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const mp = window.sdrMap;
    if (!mp) return;
    mp.setView([pos.coords.latitude, pos.coords.longitude], 16);
    L.marker([pos.coords.latitude, pos.coords.longitude], {
      icon: L.divIcon({
        className: 'leaflet-div-icon',
        html: '<div style="width:16px;height:16px;background:#2563eb;border-radius:50%;border:3px solid #fff;box-shadow:0 0 8px rgba(37,99,235,.5)"></div>',
        iconSize: [16, 16], iconAnchor: [8, 8]
      })
    }).addTo(mp).bindPopup('Você está aqui');
  }, () => window.toast('Não foi possível obter sua posição', 'error'));
};

// ── Expor utilitários para compatibilidade com sdr-module.js ─────────────

window._fmtDist        = _fmtDist;
window._matchKMZColor  = _matchKMZColor;
window._infraPopup     = _infraPopup;
window.sdrUpdateMapInfo   = sdrUpdateMapInfo;
window.sdrMapRenderClients = sdrMapRenderClients;
window.sdrMapRenderOlts    = sdrMapRenderOlts;

console.log('[SDR Bundle] map/render.js carregado — renderização do mapa modularizada');
