/**
 * SDR — Heatmap de Sinal + Troca de Base do Mapa · Fase 26
 * sdrRenderHeatmap, sdrMapChangeBase, SDR_TILE_URLS
 *
 * Dependências window: sdrMap, sdrLayers, sdrLayerVisible,
 *   sdrClientesCache, sdrBaseTile, sdrHybridLabels, L (Leaflet)
 */

// ── Configurações de tiles ──────────────────────────────────────────
window.SDR_TILE_URLS = window.SDR_TILE_URLS || {
  streets:   { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap', maxZoom: 19 },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri', maxZoom: 19 },
  hybrid:    { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri', maxZoom: 19 },
  dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; CARTO', maxZoom: 19 }
};

// ── Heatmap de sinal (Leaflet.heat) ────────────────────────────────
function _sdrRenderHeatmap() {
  if (!window.sdrMap || !window.sdrLayers || !window.sdrLayers.heatmap) return;
  var sdrMap          = window.sdrMap;
  var sdrLayers       = window.sdrLayers;
  var sdrLayerVisible = window.sdrLayerVisible || {};

  if (sdrLayers.heatmap && sdrMap.hasLayer(sdrLayers.heatmap)) {
    sdrMap.removeLayer(sdrLayers.heatmap);
  }

  const points = [];
  Object.values(window.sdrClientesCache || {}).forEach(c => {
    if (!c || !c.lat || !c.lng) return;
    let intensity = 0.3;
    if (c.rx_power != null) {
      const rx = parseFloat(c.rx_power);
      if      (rx > -20) intensity = 0.1;
      else if (rx > -25) intensity = 0.3;
      else if (rx > -28) intensity = 0.6;
      else               intensity = 1.0;
    }
    if (c.onu_status === 'offline') intensity = 1.0;
    points.push([c.lat, c.lng, intensity]);
  });

  if (points.length > 0 && typeof L !== 'undefined' && L.heatLayer) {
    sdrLayers.heatmap = L.heatLayer(points, {
      radius: 35, blur: 25, maxZoom: 17, max: 1.0,
      gradient: {0.2:'#00ff00', 0.4:'#adff2f', 0.6:'#ffff00', 0.8:'#ff8c00', 1.0:'#ff0000'}
    });
  } else {
    if (typeof L !== 'undefined') sdrLayers.heatmap = L.layerGroup();
  }

  if (sdrLayerVisible.heatmap && sdrLayers.heatmap) {
    sdrLayers.heatmap.addTo(sdrMap);
  }
}
window.sdrRenderHeatmap = window.sdrRenderHeatmap || _sdrRenderHeatmap;

// ── Troca de base do mapa ───────────────────────────────────────────
window.sdrMapChangeBase = window.sdrMapChangeBase || function(type) {
  if (!window.sdrMap || !window.sdrBaseTile) return;
  var sdrMap         = window.sdrMap;
  var cfg            = window.SDR_TILE_URLS[type] || window.SDR_TILE_URLS.streets;

  sdrMap.removeLayer(window.sdrBaseTile);
  if (window.sdrHybridLabels) {
    sdrMap.removeLayer(window.sdrHybridLabels);
    window.sdrHybridLabels = null;
  }
  window.sdrBaseTile = L.tileLayer(cfg.url, { maxZoom: cfg.maxZoom, attribution: cfg.attr }).addTo(sdrMap);
  if (type === 'hybrid' || type === 'satellite') {
    window.sdrHybridLabels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, attribution: '&copy; CARTO', pane: 'overlayPane' }
    ).addTo(sdrMap);
  }
};
