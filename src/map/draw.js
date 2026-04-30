/**
 * SDR — Módulo GIS Draw
 * Fase 8: ferramentas de desenho e edição de infraestrutura no mapa
 *
 * Depende (via window, disponível em runtime):
 *   window.sdrMap, window.sdrInfraCache, window.sdrRef,
 *   window.sdrMapReloadData, window._haversineM, window._sdrMapClickMode
 *   toast (global em admin.html), L (Leaflet global)
 */

// ── Estado interno ────────────────────────────────────────────────────────
let _sdrDrawCurrentMode = null;
let _sdrDrawPts         = [];
let _sdrPolyPrev        = null;
let _sdrPolyArea        = null;
let _sdrTmpMkrs         = [];
let sdrDrawModeActive   = false;

let _sdrSnapEnabled     = false;
let _sdrMoveSelected    = null;
let _sdrMoveSelMarker   = null;
let _sdrMeasurePts      = [];
let _sdrMeasureLine     = null;
let _sdrMeasurePop      = null;
let _sdrEditMode        = null; // 'move' | 'delete'

window._sdrPendingDrawPoints = null;

// ── Helpers ───────────────────────────────────────────────────────────────

function _dbtS(color) {
  return 'background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44';
}

function _sdrSnapToNearest(lat, lng) {
  if (!_sdrSnapEnabled) return { lat: lat, lng: lng };
  var best = { lat: lat, lng: lng }, bestDist = 10;
  var hav = window._haversineM;
  if (typeof hav !== 'function') return best;
  Object.values(window.sdrInfraCache || {}).forEach(function(item) {
    if (!item.lat || !item.lng) return;
    var d = hav({ lat: lat, lng: lng }, item);
    if (d < bestDist) { bestDist = d; best = { lat: item.lat, lng: item.lng }; }
  });
  return best;
}

// ── Toggle do painel de desenho ───────────────────────────────────────────
window.sdrDrawModeToggle = function() {
  var sdrMap = window.sdrMap, sdrMapReady = window.sdrMapReady;
  if (!sdrMapReady || !sdrMap) { toast('Aguarde o mapa carregar', 'warning'); return; }
  if (document.getElementById('sdr-draw-panel')) { window._sdrCloseDrawMode(); return; }
  _sdrOpenDrawPanel();
};

// ── Abre o painel flutuante de edição GIS ─────────────────────────────────
function _sdrOpenDrawPanel() {
  var sdrMap = window.sdrMap;
  var btn = document.getElementById('btn-draw-mode');
  if (btn) { btn.style.background = '#2563eb'; btn.innerHTML = '<i class="fas fa-times"></i> Fechar'; }
  var mapContainer = document.getElementById('sdr-map');
  if (!mapContainer) return;

  if (!document.getElementById('sdr-dbt-css')) {
    var s = document.createElement('style'); s.id = 'sdr-dbt-css';
    s.textContent = [
      '.sdr-dbt{display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 4px 6px;border-radius:7px;cursor:pointer;font-size:.7rem;transition:all .12s;user-select:none}',
      '.sdr-dbt b{font-weight:700;font-size:.73rem;line-height:1}',
      '.sdr-dbt small{font-size:.58rem;opacity:.65;line-height:1}',
      '.sdr-dbt.active{outline:2px solid #fff!important;transform:scale(.94);opacity:1!important}'
    ].join('');
    document.head.appendChild(s);
  }

  var panel = document.createElement('div');
  panel.id = 'sdr-draw-panel';
  panel.style.cssText = 'position:absolute;top:8px;left:8px;z-index:1000;background:#1e293b;color:#f1f5f9;border-radius:12px;padding:12px;width:248px;box-shadow:0 6px 28px rgba(0,0,0,.7);font-family:sans-serif';
  panel.innerHTML =
    '<div style="font-weight:700;font-size:.8rem;color:#60a5fa;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<span><i class="fas fa-tools"></i> EDIÇÃO GIS — FTTH</span>'
    + '<button onclick="window._sdrCloseDrawMode()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;padding:0 2px;line-height:1">×</button>'
    + '</div>'
    + '<div style="font-size:.6rem;color:#475569;text-transform:uppercase;letter-spacing:.09em;margin-bottom:5px">Criar</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px">'
    + '<button id="dbt-cable"   class="sdr-dbt" onclick="window._sdrStartDraw(\'cable\')"   style="' + _dbtS('#0ea5e9') + '"><i class="fas fa-minus"></i><b>Cabo FO</b><small>pts+duplo</small></button>'
    + '<button id="dbt-cto"     class="sdr-dbt" onclick="window._sdrStartDraw(\'cto\')"     style="' + _dbtS('#7c3aed') + '"><i class="fas fa-dot-circle"></i><b>CTO</b><small>1 clique</small></button>'
    + '<button id="dbt-pole"    class="sdr-dbt" onclick="window._sdrStartDraw(\'pole\')"    style="' + _dbtS('#d97706') + '"><i class="fas fa-bolt"></i><b>Poste</b><small>1 clique</small></button>'
    + '<button id="dbt-area"    class="sdr-dbt" onclick="window._sdrStartDraw(\'area\')"    style="' + _dbtS('#059669') + '"><i class="fas fa-vector-square"></i><b>Área</b><small>pts+duplo</small></button>'
    + '<button id="dbt-measure" class="sdr-dbt" onclick="window._sdrStartDraw(\'measure\')" style="' + _dbtS('#f59e0b') + '"><i class="fas fa-ruler-combined"></i><b>Medir</b><small>2+ pts</small></button>'
    + '</div>'
    + '<div style="font-size:.6rem;color:#475569;text-transform:uppercase;letter-spacing:.09em;margin-bottom:5px;padding-top:6px;border-top:1px solid #334155">Editar</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px">'
    + '<button id="dbt-move"   class="sdr-dbt" onclick="window._sdrStartEditMode(\'move\')"   style="' + _dbtS('#06b6d4') + '"><i class="fas fa-arrows-alt"></i><b>Mover</b><small>selec+drag</small></button>'
    + '<button id="dbt-delete" class="sdr-dbt" onclick="window._sdrStartEditMode(\'delete\')" style="' + _dbtS('#ef4444') + '"><i class="fas fa-trash-alt"></i><b>Deletar</b><small>1 clique</small></button>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:7px;padding:5px 7px;background:#0f172a;border-radius:6px;cursor:pointer;margin-bottom:8px" onclick="window._sdrToggleSnap()">'
    + '<div id="snap-tog" style="width:30px;height:16px;background:#334155;border-radius:8px;position:relative;transition:.2s;flex-shrink:0">'
    + '<div id="snap-thm" style="width:12px;height:12px;background:#64748b;border-radius:50%;position:absolute;top:2px;left:2px;transition:.2s"></div></div>'
    + '<span style="font-size:.73rem;color:#94a3b8"><i class="fas fa-magnet" style="color:#60a5fa;margin-right:3px"></i>Snap a elementos</span>'
    + '</div>'
    + '<div id="sdr-draw-hint" style="font-size:.72rem;color:#60a5fa;min-height:0;margin-bottom:5px;line-height:1.4;padding:4px 7px;background:#0f172a;border-radius:5px;display:none"></div>'
    + '<div id="sdr-draw-stats" style="font-size:.7rem;color:#94a3b8;margin-bottom:7px;display:none;gap:10px">'
    + '<span>Pts: <b id="dp-count">0</b></span><span>Dist: <b id="dp-dist">0.00</b> km</span>'
    + '</div>'
    + '<div style="display:flex;gap:5px;margin-bottom:8px">'
    + '<button onclick="window._sdrUndoPt()" title="Ctrl+Z" style="flex:1;background:#374151;color:#f1f5f9;border:none;padding:6px;border-radius:6px;cursor:pointer;font-size:.73rem"><i class="fas fa-undo"></i> Desfazer</button>'
    + '<button onclick="window._sdrFinalizeDraw()" title="Enter" style="flex:1;background:#16a34a;color:#fff;border:none;padding:6px;border-radius:6px;cursor:pointer;font-size:.73rem"><i class="fas fa-check"></i> Finalizar</button>'
    + '</div>'
    + '<div style="font-size:.62rem;color:#334155;text-align:center">'
    + '<kbd style="background:#334155;border-radius:3px;padding:1px 4px;color:#94a3b8">Esc</kbd> cancela &nbsp;'
    + '<kbd style="background:#334155;border-radius:3px;padding:1px 4px;color:#94a3b8">Enter</kbd> finaliza &nbsp;'
    + '<kbd style="background:#334155;border-radius:3px;padding:1px 4px;color:#94a3b8">Ctrl+Z</kbd> desfaz'
    + '</div>';

  mapContainer.appendChild(panel);

  window._sdrDrawKeyHandler = function(ev) {
    if (ev.key === 'Escape') { window._sdrCloseDrawMode(); }
    if (ev.key === 'Enter')  { window._sdrFinalizeDraw(); }
    if ((ev.key === 'z' || ev.key === 'Z') && ev.ctrlKey) { ev.preventDefault(); window._sdrUndoPt(); }
  };
  document.addEventListener('keydown', window._sdrDrawKeyHandler);
}

// ── Fecha o painel e limpa todo o estado ──────────────────────────────────
window._sdrCloseDrawMode = function() {
  var sdrMap = window.sdrMap;
  _sdrCancelCurrentDraw();
  _sdrEditMode = null;
  _sdrMoveSelected = null;
  if (_sdrMoveSelMarker && sdrMap) { try { sdrMap.removeLayer(_sdrMoveSelMarker); } catch(e){} _sdrMoveSelMarker = null; }
  if (_sdrMeasureLine && sdrMap)  { try { sdrMap.removeLayer(_sdrMeasureLine);  } catch(e){} _sdrMeasureLine  = null; }
  if (_sdrMeasurePop  && sdrMap)  { try { sdrMap.closePopup(_sdrMeasurePop);    } catch(e){} _sdrMeasurePop   = null; }
  _sdrMeasurePts = [];
  if (sdrMap) {
    sdrMap.off('click', _sdrMoveModeClick);
    sdrMap.off('click', _sdrDeleteModeClick);
    sdrMap.off('click', _sdrMeasureClick);
  }
  if (window._sdrDrawKeyHandler) {
    document.removeEventListener('keydown', window._sdrDrawKeyHandler);
    window._sdrDrawKeyHandler = null;
  }
  var panel = document.getElementById('sdr-draw-panel');
  if (panel) panel.remove();
  var btn = document.getElementById('btn-draw-mode');
  if (btn) { btn.style.background = ''; btn.innerHTML = '<i class="fas fa-pencil-alt"></i> Desenhar'; }
  sdrDrawModeActive = false;
  _sdrDrawCurrentMode = null;
  if (sdrMap) sdrMap.getContainer().style.cursor = '';
};

// ── Snap toggle ───────────────────────────────────────────────────────────
window._sdrToggleSnap = function() {
  _sdrSnapEnabled = !_sdrSnapEnabled;
  var tog = document.getElementById('snap-tog');
  var thm = document.getElementById('snap-thm');
  if (tog) tog.style.background  = _sdrSnapEnabled ? '#2563eb' : '#334155';
  if (thm) { thm.style.background = _sdrSnapEnabled ? '#fff' : '#64748b'; thm.style.left = _sdrSnapEnabled ? '16px' : '2px'; }
  toast(_sdrSnapEnabled ? '🧲 Snap ativo' : 'Snap desativado', 'info');
};

// ── Desfaz o último ponto ─────────────────────────────────────────────────
window._sdrUndoPt = function() {
  var sdrMap = window.sdrMap;
  if (!_sdrDrawPts.length) return;
  _sdrDrawPts.pop();
  var m = _sdrTmpMkrs.pop();
  if (m) { try { sdrMap.removeLayer(m); } catch(e){} }
  if (_sdrPolyPrev) { try { sdrMap.removeLayer(_sdrPolyPrev); } catch(e){} _sdrPolyPrev = null; }
  if (_sdrPolyArea) { try { sdrMap.removeLayer(_sdrPolyArea); } catch(e){} _sdrPolyArea = null; }
  if (_sdrDrawCurrentMode === 'cable' && _sdrDrawPts.length >= 2) {
    _sdrPolyPrev = L.polyline(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#0ea5e9',weight:3,dashArray:'8,4',opacity:.85}).addTo(sdrMap);
  }
  if (_sdrDrawCurrentMode === 'area' && _sdrDrawPts.length >= 2) {
    _sdrPolyArea = L.polygon(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#059669',fillColor:'#059669',fillOpacity:.15,weight:2,dashArray:'6,3'}).addTo(sdrMap);
  }
  _sdrUpdateDrawStats();
  toast('Ponto removido', 'info');
};

// ── Finaliza o desenho atual ──────────────────────────────────────────────
window._sdrFinalizeDraw = function() {
  if (_sdrDrawCurrentMode === 'measure') { _sdrMeasureReset(); return; }
  if (_sdrDrawCurrentMode && _sdrDrawPts.length >= 2) {
    _sdrFinalizeDrawing(_sdrDrawPts.slice());
  } else if (_sdrDrawPts.length < 2) {
    toast('Adicione pelo menos 2 pontos para finalizar', 'warning');
  }
};

// ── Atualiza contador e distância no painel ───────────────────────────────
function _sdrUpdateDrawStats() {
  var cnt   = document.getElementById('dp-count');
  var dist  = document.getElementById('dp-dist');
  var stats = document.getElementById('sdr-draw-stats');
  if (cnt) cnt.textContent = _sdrDrawPts.length;
  if (_sdrDrawPts.length >= 2) {
    var hav = window._haversineM;
    var total = 0;
    if (typeof hav === 'function') {
      for (var i = 1; i < _sdrDrawPts.length; i++) total += hav(_sdrDrawPts[i-1], _sdrDrawPts[i]);
    }
    if (dist)  dist.textContent  = (total / 1000).toFixed(2);
    if (stats) stats.style.display = 'flex';
  } else {
    if (stats) stats.style.display = 'none';
  }
}

// ── Ferramenta MEDIR ──────────────────────────────────────────────────────
function _sdrMeasureClick(e) {
  var sdrMap = window.sdrMap;
  var hav = window._haversineM;
  L.DomEvent.stop(e);
  var snapped = _sdrSnapToNearest(e.latlng.lat, e.latlng.lng);
  _sdrMeasurePts.push(snapped);
  var m = L.circleMarker([snapped.lat, snapped.lng], {radius:5,color:'#f59e0b',fillColor:'#f59e0b',fillOpacity:1,weight:2}).addTo(sdrMap);
  _sdrTmpMkrs.push(m);
  if (_sdrMeasurePts.length >= 2) {
    if (_sdrMeasureLine) sdrMap.removeLayer(_sdrMeasureLine);
    _sdrMeasureLine = L.polyline(_sdrMeasurePts.map(function(p){return [p.lat,p.lng];}), {color:'#f59e0b',weight:2,dashArray:'6,3',opacity:.9}).addTo(sdrMap);
    var total = 0;
    if (typeof hav === 'function') {
      for (var i=1; i<_sdrMeasurePts.length; i++) total += hav(_sdrMeasurePts[i-1], _sdrMeasurePts[i]);
    }
    var midIdx = Math.floor((_sdrMeasurePts.length - 1) / 2);
    var midPt  = _sdrMeasurePts[midIdx];
    if (_sdrMeasurePop) sdrMap.closePopup(_sdrMeasurePop);
    _sdrMeasurePop = L.popup({closeOnClick:false, autoClose:false, className:'sdr-measure-pop'})
      .setLatLng([midPt.lat, midPt.lng])
      .setContent('<div style="font-size:.9rem;font-weight:700;color:#f59e0b">'
        + (total < 1000 ? Math.round(total)+'m' : (total/1000).toFixed(2)+'km') + '</div>'
        + '<div style="font-size:.7rem;color:#94a3b8">' + _sdrMeasurePts.length + ' pontos</div>')
      .openOn(sdrMap);
    var hint = document.getElementById('sdr-draw-hint');
    if (hint) hint.innerHTML = '<i class="fas fa-ruler-combined" style="color:#f59e0b"></i> <b>'
      + (total < 1000 ? Math.round(total)+'m' : (total/1000).toFixed(2)+'km') + '</b> · clique para mais pontos';
  }
}

function _sdrMeasureReset() {
  var sdrMap = window.sdrMap;
  _sdrMeasurePts = [];
  _sdrTmpMkrs.forEach(function(m){ try{ sdrMap.removeLayer(m); }catch(e){} });
  _sdrTmpMkrs = [];
  if (_sdrMeasureLine) { try{ sdrMap.removeLayer(_sdrMeasureLine); }catch(e){} _sdrMeasureLine = null; }
  if (_sdrMeasurePop)  { try{ sdrMap.closePopup(_sdrMeasurePop);   }catch(e){} _sdrMeasurePop  = null; }
  var hint = document.getElementById('sdr-draw-hint');
  if (hint) hint.innerHTML = '<i class="fas fa-ruler-combined" style="color:#f59e0b"></i> <b>Clique</b> para medir distâncias.';
  toast('Medição zerada', 'info');
}

// ── Modo MOVER ────────────────────────────────────────────────────────────
function _sdrMoveModeClick(e) {
  var sdrMap = window.sdrMap;
  var hav = window._haversineM;
  L.DomEvent.stop(e);
  var lat = e.latlng.lat, lng = e.latlng.lng;
  if (!_sdrMoveSelected) {
    var bestId = null, bestItem = null, bestDist = Infinity;
    Object.entries(window.sdrInfraCache || {}).forEach(function(kv) {
      var item = kv[1];
      if (!item || !item.lat || !item.lng) return;
      var d = typeof hav === 'function' ? hav({lat:lat,lng:lng}, {lat:item.lat,lng:item.lng}) : Infinity;
      if (d < bestDist) { bestDist = d; bestId = kv[0]; bestItem = item; }
    });
    if (!bestId || bestDist > 80) { toast('Nenhum elemento próximo. Clique mais perto de um elemento.', 'warning'); return; }
    _sdrMoveSelected = { id: bestId, item: bestItem };
    if (_sdrMoveSelMarker) try{ sdrMap.removeLayer(_sdrMoveSelMarker); }catch(e){}
    _sdrMoveSelMarker = L.circleMarker([bestItem.lat,bestItem.lng], {radius:14,color:'#06b6d4',fillOpacity:0,weight:3,dashArray:'5,3'}).addTo(sdrMap);
    var hint = document.getElementById('sdr-draw-hint');
    if (hint) { hint.style.display='block'; hint.innerHTML='<i class="fas fa-arrows-alt" style="color:#06b6d4"></i> <b>'+(bestItem.name||bestItem.nome||bestId)+'</b> selecionado — clique no novo local.'; }
    toast('Selecionado: ' + (bestItem.name||bestItem.nome||bestId), 'info');
  } else {
    var snapped = _sdrSnapToNearest(lat, lng);
    var id = _sdrMoveSelected.id, itm = _sdrMoveSelected.item;
    window.sdrRef('infrastructure/' + id).update({lat:snapped.lat, lng:snapped.lng, updated_at:new Date().toISOString()}).then(function(){
      toast((itm.name||itm.nome||id) + ' movido!', 'success');
      if (_sdrMoveSelMarker) { try{ sdrMap.removeLayer(_sdrMoveSelMarker); }catch(e){} _sdrMoveSelMarker = null; }
      _sdrMoveSelected = null;
      var hint2 = document.getElementById('sdr-draw-hint');
      if (hint2) hint2.innerHTML = '<i class="fas fa-arrows-alt" style="color:#06b6d4"></i> Clique em outro elemento para mover.';
      if (typeof window.sdrMapReloadData === 'function') window.sdrMapReloadData();
    }).catch(function(err){ toast('Erro: ' + err.message, 'error'); });
  }
}

// ── Modo DELETAR ──────────────────────────────────────────────────────────
function _sdrDeleteModeClick(e) {
  var hav = window._haversineM;
  L.DomEvent.stop(e);
  var lat = e.latlng.lat, lng = e.latlng.lng;
  var bestId = null, bestItem = null, bestDist = Infinity;
  Object.entries(window.sdrInfraCache || {}).forEach(function(kv) {
    var item = kv[1];
    if (!item || !item.lat || !item.lng) return;
    var d = typeof hav === 'function' ? hav({lat:lat,lng:lng},{lat:item.lat,lng:item.lng}) : Infinity;
    if (d < bestDist) { bestDist = d; bestId = kv[0]; bestItem = item; }
  });
  if (!bestId || bestDist > 80) { toast('Nenhum elemento próximo.', 'warning'); return; }
  var nome = bestItem.name || bestItem.nome || bestId;
  if (!confirm('Deletar "' + nome + '"?\n\nEsta ação não pode ser desfeita.')) return;
  window.sdrRef('infrastructure/' + bestId).remove().then(function(){
    if (window.sdrInfraCache) delete window.sdrInfraCache[bestId];
    toast('"' + nome + '" deletado', 'success');
    if (typeof window.sdrMapReloadData === 'function') window.sdrMapReloadData();
  }).catch(function(err){ toast('Erro: ' + err.message, 'error'); });
}

// ── Ativa modo de edição (mover / deletar) ────────────────────────────────
window._sdrStartEditMode = function(mode) {
  var sdrMap = window.sdrMap;
  _sdrCancelCurrentDraw();
  _sdrDrawCurrentMode = null;
  _sdrEditMode = mode;
  _sdrMoveSelected = null;
  document.querySelectorAll('.sdr-dbt').forEach(function(b){ b.classList.remove('active'); });
  var dbt = document.getElementById('dbt-' + mode);
  if (dbt) dbt.classList.add('active');
  if (sdrMap) {
    sdrMap.off('click', _sdrOnDrawClick);
    sdrMap.off('click', _sdrMoveModeClick);
    sdrMap.off('click', _sdrDeleteModeClick);
    sdrMap.off('click', _sdrMeasureClick);
    sdrMap.getContainer().style.cursor = mode === 'delete' ? 'crosshair' : 'move';
    if (mode === 'move')   sdrMap.on('click', _sdrMoveModeClick);
    if (mode === 'delete') sdrMap.on('click', _sdrDeleteModeClick);
  }
  var hint = document.getElementById('sdr-draw-hint');
  if (hint) {
    hint.style.display = 'block';
    hint.innerHTML = mode === 'move'
      ? '<i class="fas fa-arrows-alt" style="color:#06b6d4"></i> 1º clique: selecionar. 2º clique: mover para o novo local.'
      : '<i class="fas fa-trash-alt" style="color:#ef4444"></i> Clique em um elemento do mapa para deletá-lo.';
  }
  toast('Modo ' + (mode === 'move' ? 'Mover' : 'Deletar') + ' ativo', 'info');
};

// ── Inicia ferramenta de desenho ──────────────────────────────────────────
window._sdrStartDraw = function(mode) {
  var sdrMap = window.sdrMap;
  _sdrCancelCurrentDraw();
  _sdrDrawCurrentMode = mode;
  sdrDrawModeActive = true;
  if (!sdrMap) return;
  var hints = {
    cable:   '<b>Cabo:</b> Clique para adicionar pontos. <b>Duplo-clique</b> para finalizar (mín. 2 pts).',
    cto:     '<b>CTO:</b> Clique no mapa para posicionar o splitter.',
    area:    '<b>Área:</b> Clique para criar os vértices. <b>Duplo-clique</b> para fechar o polígono.',
    pole:    '<b>Poste:</b> Clique no mapa para posicionar.',
    measure: '<b>Medir:</b> Clique para adicionar pontos e medir distâncias.'
  };
  var hint = document.getElementById('sdr-draw-hint');
  if (hint) { hint.style.display = 'block'; hint.innerHTML = hints[mode] || ''; }
  sdrMap.getContainer().style.cursor = 'crosshair';
  sdrMap.off('click', _sdrOnDrawClick);
  sdrMap.off('dblclick', _sdrOnDrawDblClick);
  sdrMap.off('click', _sdrMeasureClick);
  if (mode === 'measure') {
    sdrMap.on('click', _sdrMeasureClick);
    return;
  }
  sdrMap.on('click', _sdrOnDrawClick);
  if (mode !== 'cto' && mode !== 'pole') {
    sdrMap.on('dblclick', _sdrOnDrawDblClick);
    sdrMap.doubleClickZoom.disable();
  }
  var labels = { cable: 'Cabo', cto: 'CTO', area: 'Área', pole: 'Poste' };
  toast('Ferramenta ' + (labels[mode] || mode) + ' ativa. Clique no mapa.', 'info');
};

// ── Handlers de clique no mapa ────────────────────────────────────────────
function _sdrOnDrawClick(e) {
  if (!_sdrDrawCurrentMode) return;
  if (window._sdrMapClickMode) return;
  var sdrMap = window.sdrMap;
  L.DomEvent.stop(e);
  var lat = e.latlng.lat, lng = e.latlng.lng;
  if (_sdrDrawCurrentMode === 'cto' || _sdrDrawCurrentMode === 'pole') {
    _sdrFinalizeDrawing([{lat: lat, lng: lng}]);
    return;
  }
  _sdrDrawPts.push({lat: lat, lng: lng});
  var fillColor = _sdrDrawCurrentMode === 'cable' ? '#0ea5e9' : '#059669';
  var m = L.circleMarker([lat, lng], {radius:5, color:'#fff', fillColor:fillColor, fillOpacity:1, weight:2}).addTo(sdrMap);
  _sdrTmpMkrs.push(m);
  if (_sdrDrawCurrentMode === 'cable' && _sdrDrawPts.length >= 2) {
    if (_sdrPolyPrev) sdrMap.removeLayer(_sdrPolyPrev);
    _sdrPolyPrev = L.polyline(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#0ea5e9',weight:3,dashArray:'8,4',opacity:.85}).addTo(sdrMap);
  }
  if (_sdrDrawCurrentMode === 'area' && _sdrDrawPts.length >= 2) {
    if (_sdrPolyArea) sdrMap.removeLayer(_sdrPolyArea);
    _sdrPolyArea = L.polygon(_sdrDrawPts.map(function(p){return [p.lat,p.lng];}), {color:'#059669',fillColor:'#059669',fillOpacity:.15,weight:2,dashArray:'6,3'}).addTo(sdrMap);
  }
  _sdrUpdateDrawStats();
}

function _sdrOnDrawDblClick(e) {
  L.DomEvent.stop(e);
  if (_sdrDrawPts.length < 2) { toast('Adicione pelo menos 2 pontos para finalizar', 'warning'); return; }
  _sdrFinalizeDrawing(_sdrDrawPts.slice());
}

function _sdrCancelCurrentDraw() {
  var sdrMap = window.sdrMap;
  _sdrTmpMkrs.forEach(function(m){ try{ if(sdrMap) sdrMap.removeLayer(m); }catch(e){} });
  _sdrTmpMkrs = [];
  if (_sdrPolyPrev) { try{ if(sdrMap) sdrMap.removeLayer(_sdrPolyPrev); }catch(e){} _sdrPolyPrev = null; }
  if (_sdrPolyArea) { try{ if(sdrMap) sdrMap.removeLayer(_sdrPolyArea); }catch(e){} _sdrPolyArea = null; }
  _sdrDrawPts = [];
  if (sdrMap) {
    sdrMap.off('click',   _sdrOnDrawClick);
    sdrMap.off('dblclick', _sdrOnDrawDblClick);
    try { sdrMap.doubleClickZoom.enable(); } catch(e) {}
  }
}

function _sdrFinalizeDrawing(pts) {
  _sdrCancelCurrentDraw();
  var mode = _sdrDrawCurrentMode;
  _sdrDrawCurrentMode = null;
  window._sdrPendingDrawPoints = pts;
  _sdrShowPropertiesModal(mode, pts);
}

// ── Modal de propriedades (nome, tipo, observações) ───────────────────────
function _sdrShowPropertiesModal(type, pts) {
  var existing = document.getElementById('sdr-props-modal');
  if (existing) existing.remove();
  var lbl = 'display:block;margin:.75rem 0 .3rem;font-size:.77rem;color:#94a3b8';
  var inp = 'width:100%;padding:7px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:.82rem;box-sizing:border-box';
  var title = '', formHtml = '';
  if (type === 'cable') {
    title = '<i class="fas fa-minus" style="color:#0ea5e9"></i>&nbsp; Cabo de Fibra Óptica';
    formHtml =
      '<label style="' + lbl + '">Nome / Trecho</label>' +
      '<input id="dp-name" style="' + inp + '" placeholder="Ex: Cabo Rua das Flores - P12"/>' +
      '<label style="' + lbl + '">Quantidade de Fibras</label>' +
      '<select id="dp-fibers" style="' + inp + '">' +
        '<option value="6">6 FO</option><option value="12" selected>12 FO</option>' +
        '<option value="24">24 FO</option><option value="36">36 FO</option>' +
        '<option value="48">48 FO</option><option value="72">72 FO</option>' +
        '<option value="144">144 FO</option>' +
      '</select>' +
      '<label style="' + lbl + '">Tipo de Instalação</label>' +
      '<select id="dp-install" style="' + inp + '">' +
        '<option value="aereo">Aéreo</option>' +
        '<option value="subterraneo">Subterrâneo (tracejado no mapa)</option>' +
      '</select>' +
      '<label style="' + lbl + '">OLT / GPON de Origem</label>' +
      '<input id="dp-olt" style="' + inp + '" placeholder="Ex: OLT-Centro Porta 1/1"/>' +
      '<label style="' + lbl + '">Observações</label>' +
      '<input id="dp-notes" style="' + inp + '" placeholder="Observações opcionais"/>';
  } else if (type === 'cto') {
    title = '<i class="fas fa-circle" style="color:#7c3aed"></i>&nbsp; CTO / Splitter';
    formHtml =
      '<label style="' + lbl + '">Nome da CTO</label>' +
      '<input id="dp-name" style="' + inp + '" placeholder="Ex: CTO-001"/>' +
      '<label style="' + lbl + '">Tipo de Splitter</label>' +
      '<select id="dp-cto-type" style="' + inp + '">' +
        '<option value="1x8">1:8 (8 portas)</option>' +
        '<option value="1x16">1:16 (16 portas)</option>' +
        '<option value="1x4">1:4 (4 portas)</option>' +
        '<option value="1x2">1:2 (2 portas)</option>' +
        '<option value="ceo">CEO</option>' +
        '<option value="emenda">Emenda</option>' +
      '</select>' +
      '<label style="' + lbl + '">Cabo de Entrada</label>' +
      '<input id="dp-cable-in" style="' + inp + '" placeholder="Nome do cabo de alimentação"/>' +
      '<label style="' + lbl + '">Observações</label>' +
      '<input id="dp-notes" style="' + inp + '" placeholder="Observações opcionais"/>';
  } else if (type === 'pole') {
    title = '<i class="fas fa-bolt" style="color:#d97706"></i>&nbsp; Poste';
    formHtml =
      '<label style="' + lbl + '">Identificação do Poste</label>' +
      '<input id="dp-name" style="' + inp + '" placeholder="Ex: P-001 ou P-Rua das Flores 12"/>' +
      '<label style="' + lbl + '">Observações</label>' +
      '<input id="dp-notes" style="' + inp + '" placeholder="Observações opcionais"/>';
  } else {
    title = '<i class="fas fa-vector-square" style="color:#059669"></i>&nbsp; Área de Cobertura';
    formHtml =
      '<label style="' + lbl + '">Nome da Área</label>' +
      '<input id="dp-name" style="' + inp + '" placeholder="Ex: Bairro Centro - GPON 1"/>' +
      '<label style="' + lbl + '">Cor no Mapa</label>' +
      '<select id="dp-color" style="' + inp + '">' +
        '<option value="#0ea5e9">Azul</option>' +
        '<option value="#059669">Verde</option>' +
        '<option value="#f59e0b">Amarelo</option>' +
        '<option value="#ef4444">Vermelho</option>' +
        '<option value="#7c3aed">Roxo</option>' +
      '</select>' +
      '<label style="' + lbl + '">Observações</label>' +
      '<input id="dp-notes" style="' + inp + '" placeholder="Descrição da área de cobertura"/>';
  }
  var modal = document.createElement('div');
  modal.id = 'sdr-props-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75)';
  modal.innerHTML =
    '<div style="background:#1e293b;color:#f1f5f9;border-radius:12px;padding:24px;width:360px;max-width:95vw;box-shadow:0 8px 40px rgba(0,0,0,.7)">' +
      '<div style="font-weight:700;font-size:.98rem;margin-bottom:2px">' + title + '</div>' +
      '<div style="font-size:.73rem;color:#64748b;margin-bottom:6px">' + pts.length + ' ponto' + (pts.length !== 1 ? 's' : '') + ' definido' + (pts.length !== 1 ? 's' : '') + ' no mapa</div>' +
      formHtml +
      '<div style="display:flex;gap:10px;margin-top:18px">' +
        '<button id="btn-dp-save" onclick="window._sdrSaveDrawing(\'' + type + '\')" ' +
          'style="flex:1;background:#16a34a;color:#fff;border:none;padding:10px;border-radius:8px;cursor:pointer;font-weight:600;font-size:.87rem">' +
          '<i class="fas fa-save"></i> Salvar no Mapa' +
        '</button>' +
        '<button onclick="document.getElementById(\'sdr-props-modal\').remove()" ' +
          'style="background:#475569;color:#fff;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:.9rem">✕</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
}

// ── Salva o elemento desenhado no Firebase ────────────────────────────────
window._sdrSaveDrawing = async function(type) {
  var pts   = window._sdrPendingDrawPoints || [];
  var name  = ((document.getElementById('dp-name')  || {}).value || '').trim();
  var notes = ((document.getElementById('dp-notes') || {}).value || '').trim();
  var btn   = document.getElementById('btn-dp-save');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }
  var now  = new Date().toISOString();
  var data = { created_at: now };
  if (name)  data.name  = name;
  if (notes) data.notes = notes;

  if (type === 'cable') {
    var fibers  = parseInt((document.getElementById('dp-fibers')  || {}).value || '12');
    var install = (document.getElementById('dp-install') || {}).value || 'aereo';
    var olt     = ((document.getElementById('dp-olt') || {}).value || '').trim();
    data.type = 'cable'; data.route = pts; data.fiber_count = fibers;
    data.installation = install; data.cable_type = install;
    if (olt) data.olt_origin = olt;
  } else if (type === 'cto') {
    var ctoType = (document.getElementById('dp-cto-type') || {}).value || '1x8';
    var cableIn = ((document.getElementById('dp-cable-in') || {}).value || '').trim();
    var portMap = {'1x8':8,'1x16':16,'1x4':4,'1x2':2,'ceo':12,'emenda':0};
    data.type = 'cto'; data.lat = pts[0].lat; data.lng = pts[0].lng;
    data.cto_type = ctoType; data.total_ports = portMap[ctoType] || 8; data.used_ports = 0;
    if (cableIn) data.cable_input = cableIn;
  } else if (type === 'pole') {
    data.type = 'pole'; data.lat = pts[0].lat; data.lng = pts[0].lng;
  } else {
    var color = (document.getElementById('dp-color') || {}).value || '#0ea5e9';
    data.type = 'coverage_area'; data.polygon = pts; data.color = color;
  }

  try {
    await window.sdrRef('infrastructure').push(data);
    var m = document.getElementById('sdr-props-modal');
    if (m) m.remove();
    window._sdrPendingDrawPoints = null;
    toast('Salvo com sucesso!', 'success');
    if (typeof window.sdrMapReloadData === 'function') window.sdrMapReloadData();
  } catch(e) {
    console.error('[SDR Draw]', e);
    toast('Erro ao salvar: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar no Mapa'; }
  }
};

console.log('[SDR Bundle] map/draw.js carregado — GIS draw + edit + measure OK');
