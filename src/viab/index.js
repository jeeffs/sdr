/**
 * SDR — Viabilidade Comercial
 * Fase 13: migrado de sdr-module.js (bloco ~6786-6882 em HEAD)
 *
 * Expõe via window:
 *   window.sdrViabilidadeToggle()
 *   window.sdrViabilidadeCheck(lat, lng, radiusM)
 *
 * Deps runtime (via window):
 *   window.sdrMap          — instância Leaflet
 *   window.L               — Leaflet global
 *   window.sdrInfraCache   — cache de infra
 *   window._haversineM     — distância em metros
 *   window.sdrPowerBudgetCalc — power budget por CTO id
 *   window.sdrCTOPortsModal   — abre modal de portas
 *   toast()                — global
 */

// ── Estado do módulo ──────────────────────────────────────────────
let _sdrViabMode    = false;
let _sdrViabMarker  = null;
let _viabClickFn    = null;   // handler registrado em sdrMap.on('click')

// ── Toggle do modo viabilidade ────────────────────────────────────
window.sdrViabilidadeToggle = function() {
  _sdrViabMode = !_sdrViabMode;

  const btn = document.getElementById('btn-viabilidade');
  if (btn) {
    btn.style.background  = _sdrViabMode ? '#16a34a' : '';
    btn.style.color       = _sdrViabMode ? '#fff'    : '';
    btn.style.borderColor = _sdrViabMode ? '#15803d' : '';
  }

  const map = window.sdrMap;
  if (!map) return;

  map.getContainer().style.cursor = _sdrViabMode ? 'crosshair' : '';

  if (_sdrViabMode) {
    // Registra handler de clique dedicado
    _viabClickFn = function(e) {
      if (!_sdrViabMode) return;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Atualiza marcador de posição
      if (_sdrViabMarker) map.removeLayer(_sdrViabMarker);
      if (window.L) {
        _sdrViabMarker = window.L.circleMarker([lat, lng], {
          radius: 8,
          color: '#2563eb',
          fillColor: '#2563eb',
          fillOpacity: 0.8,
          weight: 2
        }).addTo(map);
      }

      window.sdrViabilidadeCheck(lat, lng, 500);
    };
    map.on('click', _viabClickFn);
  } else {
    // Remove handler e limpa
    if (_viabClickFn) { map.off('click', _viabClickFn); _viabClickFn = null; }
    if (_sdrViabMarker) { map.removeLayer(_sdrViabMarker); _sdrViabMarker = null; }
    const ex = document.getElementById('viab-modal-ov');
    if (ex) ex.remove();
  }

  if (typeof toast === 'function') {
    toast(_sdrViabMode ? '📍 Clique no mapa para verificar viabilidade' : 'Modo viabilidade desativado', 'info');
  }
};

// ── Busca CTOs no raio e monta resultado ─────────────────────────
window.sdrViabilidadeCheck = function(lat, lng, radiusM) {
  radiusM = radiusM || 500;
  const results = [];

  const cache = window.sdrInfraCache || {};
  Object.entries(cache).forEach(([id, item]) => {
    if (!item || !item.lat || !item.lng) return;
    if (item.type !== 'cto' && item.type !== 'splitter') return;

    const dist   = Math.round((window._haversineM || function() { return 0; })({ lat, lng }, { lat: item.lat, lng: item.lng }));
    if (dist > radiusM) return;

    const cap    = parseInt(item.total_ports) || 0;
    const used   = parseInt(item.used_ports)  || 0;
    const livres = Math.max(0, cap - used);
    const pct    = cap > 0 ? Math.round((used / cap) * 100) : 0;
    const pb     = (typeof window.sdrPowerBudgetCalc === 'function') ? window.sdrPowerBudgetCalc(id) : { status: 'unknown', totalLoss: 0, margem: 0 };

    results.push({ id, item, dist, cap, used, livres, pct, pb });
  });

  // Ranking: portas livres > sinal OK > distância curta
  results.sort((a, b) => {
    const score = r => (r.livres > 0 ? 0 : 2)
      + (r.pb.status === 'ok' ? 0 : r.pb.status === 'warn' ? 0.5 : 1)
      + (r.dist / 500);
    return score(a) - score(b);
  });

  _sdrViabModal(lat, lng, results.slice(0, 12), radiusM);
};

// ── Modal de resultado ────────────────────────────────────────────
function _sdrViabModal(lat, lng, results, radiusM) {
  var total    = results.length;
  var comPorta = results.filter(function(r) { return r.livres > 0; }).length;
  var rows = '';

  if (total === 0) {
    rows = '<div style="text-align:center;padding:24px;color:#94a3b8">'
      + '<i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:8px;opacity:.4"></i>'
      + 'Nenhuma CTO em raio de ' + radiusM + 'm<br>'
      + '<span style="font-size:.75rem">Tente aumentar o raio de busca</span></div>';
  } else {
    results.forEach(function(r) {
      var pbColor = r.pb.status === 'ok' ? '#16a34a' : r.pb.status === 'warn' ? '#d97706' : '#dc2626';
      var pbIcon  = r.pb.status === 'ok' ? 'fa-check-circle' : r.pb.status === 'warn' ? 'fa-exclamation-triangle' : 'fa-times-circle';
      var pColor  = r.livres > 0 ? '#16a34a' : '#dc2626';
      var barPct  = r.cap > 0 ? r.pct : 0;
      var barCol  = barPct >= 90 ? '#dc2626' : barPct >= 70 ? '#d97706' : '#22c55e';
      var portaLabel = r.livres > 0
        ? (r.livres + ' porta' + (r.livres > 1 ? 's' : '') + ' livre' + (r.livres > 1 ? 's' : ''))
        : 'Sem porta livre';

      rows += '<div style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;cursor:pointer;transition:all .15s"'
        + ' onmouseover="this.style.borderColor=\'#93c5fd\';this.style.background=\'#f0f9ff\'"'
        + ' onmouseout="this.style.borderColor=\'#e5e7eb\';this.style.background=\'\'"'
        + ' onclick="if(window.sdrMap)window.sdrMap.flyTo([' + r.item.lat + ',' + r.item.lng + '],18);document.getElementById(\'viab-modal-ov\').remove();if(typeof window.sdrCTOPortsModal===\'function\')window.sdrCTOPortsModal(\'' + r.id + '\',window.sdrInfraCache[\'' + r.id + '\'])">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
        + '<i class="fas fa-box" style="color:#2563eb;font-size:.8rem;flex-shrink:0"></i>'
        + '<b style="font-size:.83rem;color:#1e293b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (r.item.name || r.item.code || r.id) + '</b>'
        + '<span style="font-size:.7rem;color:#94a3b8;flex-shrink:0">' + r.dist + 'm</span>'
        + '</div>'
        + '<div style="display:flex;gap:10px;font-size:.72rem;margin-bottom:5px">'
        + '<span style="color:' + pColor + ';font-weight:600"><i class="fas fa-plug"></i> ' + portaLabel + '</span>'
        + '<span style="color:#64748b"><i class="fas fa-server"></i> ' + r.used + '/' + (r.cap || '?') + '</span>'
        + '<span style="color:' + pbColor + ';margin-left:auto"><i class="fas ' + pbIcon + '"></i> ' + r.pb.totalLoss + 'dB / ' + (r.pb.margem > 0 ? '+' : '') + r.pb.margem + 'dB</span>'
        + '</div>'
        + (r.cap > 0 ? '<div style="height:4px;background:#f1f5f9;border-radius:2px"><div style="height:4px;background:' + barCol + ';border-radius:2px;width:' + barPct + '%"></div></div>' : '')
        + '</div>';
    });
  }

  var existing = document.getElementById('viab-modal-ov');
  if (existing) existing.remove();

  var div = document.createElement('div');
  div.id = 'viab-modal-ov';
  div.style.cssText = 'position:fixed;top:66px;right:10px;z-index:49999;width:370px;background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.18);display:flex;flex-direction:column;max-height:calc(100vh - 80px)';
  div.innerHTML = '<div style="padding:12px 14px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px">'
    + '<i class="fas fa-search-location" style="color:#2563eb;font-size:1rem;flex-shrink:0"></i>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-weight:700;font-size:.88rem;color:#1e293b">Viabilidade Comercial</div>'
    + '<div style="font-size:.7rem;color:#64748b">Raio ' + radiusM + 'm · <b style="color:#1e293b">' + total + '</b> CTO' + (total !== 1 ? 's' : '') + ' · <b style="color:#16a34a">' + comPorta + '</b> com porta livre</div>'
    + '</div>'
    + '<button onclick="document.getElementById(\'viab-modal-ov\').remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.3rem;padding:0;line-height:1;flex-shrink:0">&times;</button>'
    + '</div>'
    + '<div style="overflow-y:auto;flex:1;padding:10px">' + rows + '</div>'
    + '<div style="padding:8px 10px;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:center">'
    + '<span style="font-size:.72rem;color:#94a3b8;flex-shrink:0">Raio:</span>'
    + '<input id="viab-r-input" type="number" value="' + radiusM + '" min="100" max="3000" step="100" style="width:80px;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:.8rem">'
    + '<button class="btn-map" onclick="window.sdrViabilidadeCheck(' + lat + ',' + lng + ',parseInt(document.getElementById(\'viab-r-input\').value)||500)" style="flex:1;padding:6px;font-size:.78rem"><i class="fas fa-sync-alt"></i> Rebuscar</button>'
    + '</div>';

  document.body.appendChild(div);
}

console.log('[SDR Bundle] viab/index.js carregado — sdrViabilidadeToggle + sdrViabilidadeCheck OK');
