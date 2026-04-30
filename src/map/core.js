/**
 * src/map/core.js — Fase 30
 * Inicialização do mapa Leaflet + carregamento de dados Firebase
 * Extraído do IIFE monolith (sdr-module.js)
 */

window.sdrMapInit = window.sdrMapInit || function() {
  if (window.sdrMapReady && window.sdrMap) {
    setTimeout(() => window.sdrMap.invalidateSize(), 100);
    window.sdrMapReloadData();
    return;
  }
  const container = document.getElementById('sdr-map');
  if (!container) return;

  // Retry se Leaflet ainda não carregou (CDN lento)
  if (typeof L === 'undefined' || !L.map) {
    console.warn('[SDR] Leaflet não carregado, retry em 500ms...');
    setTimeout(() => window.sdrMapInit(), 500);
    return;
  }

  // Centro padrão: Jundiaí-SP (região de operação)
  window.sdrMap = L.map('sdr-map', {
    center: [-23.1862, -46.8842],
    zoom: 13,
    zoomControl: true,
    attributionControl: false,
    preferCanvas: true
  });

  // Tiles
  window.sdrBaseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(window.sdrMap);

  // Inicializar layer groups — MarkerCluster para CTOs (6000+)
  window.sdrLayers.ctos = (typeof L.markerClusterGroup === 'function')
    ? L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false, disableClusteringAtZoom: 17 }).addTo(window.sdrMap)
    : L.layerGroup().addTo(window.sdrMap);
  window.sdrLayers.clients  = L.layerGroup(); // não adiciona ao mapa por padrão (14k+ sem coords)
  window.sdrLayers.poles    = L.layerGroup().addTo(window.sdrMap);
  window.sdrLayers.cables   = L.layerGroup().addTo(window.sdrMap);
  window.sdrLayers.olts     = L.layerGroup().addTo(window.sdrMap);
  window.sdrLayers.heatmap  = L.layerGroup();
  window.sdrLayers.areas    = L.layerGroup().addTo(window.sdrMap); // Áreas de cobertura

  window.sdrMapReady = true;
  setTimeout(() => window.sdrMap.invalidateSize(), 200);

  // Listener de clique no mapa — capturar coords quando card de edição está aberto
  window.sdrMap.on('click', function(e) {
    if (typeof window.sdrMapClickCapture === 'function') {
      window.sdrMapClickCapture(e.latlng.lat, e.latlng.lng);
    }
  });

  // Carregar dados
  window.sdrMapReloadData();
};

window.sdrMapReloadData = window.sdrMapReloadData || function() {
  if (!window.sdrMapReady) return;
  // Carregar infra
  window.sdrRef('infrastructure').once('value').then(snap => {
    window.sdrInfraCache = snap.val() || {};
    if (typeof window.sdrMapRenderInfra  === 'function') window.sdrMapRenderInfra();
    if (typeof window.sdrUpdateMapInfo   === 'function') window.sdrUpdateMapInfo();
  });
  // Carregar clientes
  window.sdrRef('clients').once('value').then(snap => {
    window.sdrClientesCache = snap.val() || {};
    if (typeof window.sdrMapRenderClients === 'function') window.sdrMapRenderClients();
    if (typeof window.sdrUpdateMapInfo    === 'function') window.sdrUpdateMapInfo();
  });
  // Carregar OLTs
  window.sdrRef('olt_connections').once('value').then(snap => {
    window.sdrOltsCache = snap.val() || {};
    if (typeof window.sdrMapRenderOlts === 'function') window.sdrMapRenderOlts();
    if (typeof window.sdrUpdateMapInfo === 'function') window.sdrUpdateMapInfo();
  });
  // Heatmap hook — migrado do IIFE sprint 4
  setTimeout(function() {
    if (typeof window.sdrRenderHeatmap === 'function') window.sdrRenderHeatmap();
  }, 500);
};
