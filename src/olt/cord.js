/**
 * SDR — OLT Cord Drawing, Slot Management, Rastreabilidade, Cord Edit
 * Fase 29: migrado de sdr-module.js
 *
 * Funções: sdrOltSlotInsert, sdrOltSlotRemove, sdrPonCordStart,
 *          sdrCordDrawCancel, sdrCordConnectFiber, _sdrCordDrawFromFiber,
 *          _sdrCordFinishFiberToPon, _sdrCordSvgUpdate, _sdrDrawSavedCords,
 *          _sdrRastreabilidade, sdrSlotConfig, sdrSlotConfigSave,
 *          _sdrCordHighlight, _sdrCordEdit*, (cord edit suite)
 * Estado: window._sdrCordDrawMode (exposto em sdr-module.js)
 */

window.sdrOltSlotInsert = window.sdrOltSlotInsert || function(oltId) {
  var pos   = parseInt(document.getElementById('slot-pos').value);
  var gbics = parseInt(document.getElementById('slot-gbics').value) || 8;
  window.sdrRef('olt_connections/' + oltId).once('value').then(function(snap) {
    var olt = snap.val() || {};
    var slotCount = olt.slot_count || 4;
    var pons = olt.pons || {};
    var slots = olt.slots || {};
    // Desloca todos os slots >= pos uma posição para cima
    var updates = {};
    for (var s = slotCount; s >= pos; s--) {
      // Move PONs do slot s para s+1
      var slotPons = {};
      Object.entries(pons).forEach(function(e) {
        var m = e[0].match(/^s(\d+)_p(\d+)$/);
        if (m && parseInt(m[1]) === s) {
          updates['olt_connections/' + oltId + '/pons/s' + (s+1) + '_p' + m[2]] = e[1];
          updates['olt_connections/' + oltId + '/pons/' + e[0]] = null; // remove antigo
        }
      });
      // Move config do slot
      if (slots[s]) {
        updates['olt_connections/' + oltId + '/slots/' + (s+1)] = slots[s];
        updates['olt_connections/' + oltId + '/slots/' + s] = null;
      }
    }
    // Insere o novo slot na posição
    updates['olt_connections/' + oltId + '/slots/' + pos] = { pon_count: gbics };
    updates['olt_connections/' + oltId + '/slot_count'] = slotCount + 1;
    return firebase.database().ref().update(updates);
  }).then(function() {
    if (typeof toast === 'function') toast('Slot inserido na posição ' + pos + '!', 'success');
    document.getElementById('sdr-slot-modal') && document.getElementById('sdr-slot-modal').remove();
    sdrOltLightpathModal(oltId);
  }).catch(function(e) { if (typeof toast === 'function') toast('Erro: ' + e.message, 'error'); });
};

// Remove um slot do chassis (desconecta PONs do slot)
window.sdrOltSlotRemove = window.sdrOltSlotRemove || function(oltId) {
  var slotNum = parseInt(document.getElementById('slot-remove-num').value);
  if (!confirm('Remover Slot ' + slotNum + '? As PONs serão desconectadas.')) return;
  window.sdrRef('olt_connections/' + oltId).once('value').then(function(snap) {
    var olt = snap.val() || {};
    var slotCount = olt.slot_count || 4;
    var pons = olt.pons || {};
    var slots = olt.slots || {};
    var updates = {};
    // Libera fibras do DGO das PONs deste slot
    var fiberFrees = [];
    Object.entries(pons).forEach(function(e) {
      var m = e[0].match(/^s(\d+)_p(\d+)$/);
      if (!m) return;
      var s = parseInt(m[1]);
      if (s === slotNum) {
        // Remove PON e libera fibra do DGO
        updates['olt_connections/' + oltId + '/pons/' + e[0]] = null;
        var cfg = e[1] || {};
        if (cfg.dgo_id && cfg.dgo_fiber_key) {
          fiberFrees.push(window.sdrRef('infrastructure/' + cfg.dgo_id + '/fibers/' + cfg.dgo_fiber_key)
            .update({ status:'free', olt_id:null, slot:null, port:null, label:null }));
        }
      } else if (s > slotNum) {
        // Desloca slots superiores uma posição para baixo
        updates['olt_connections/' + oltId + '/pons/s' + (s-1) + '_p' + m[2]] = e[1];
        updates['olt_connections/' + oltId + '/pons/' + e[0]] = null;
      }
    });
    // Desloca configs de slots
    for (var i = slotNum + 1; i <= slotCount; i++) {
      if (slots[i]) updates['olt_connections/' + oltId + '/slots/' + (i-1)] = slots[i];
      updates['olt_connections/' + oltId + '/slots/' + i] = null;
    }
    updates['olt_connections/' + oltId + '/slots/' + slotNum] = null;
    updates['olt_connections/' + oltId + '/slot_count'] = slotCount - 1;
    return Promise.all(fiberFrees).then(function() {
      return firebase.database().ref().update(updates);
    });
  }).then(function() {
    if (typeof toast === 'function') toast('Slot ' + slotNum + ' removido!', 'success');
    document.getElementById('sdr-slot-modal') && document.getElementById('sdr-slot-modal').remove();
    sdrOltLightpathModal(oltId);
  }).catch(function(e) { if (typeof toast === 'function') toast('Erro: ' + e.message, 'error'); });
};


// Redesenhar cordões ao redimensionar janela (zoom, resize)
(function() {
  var _resizeTimer = null;
  window.addEventListener('resize', function() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function() {
      if (window._sdrLastCordArgs) {
        var a = window._sdrLastCordArgs;
        _sdrDrawSavedCords(a.oltId, a.pons, a.dgos);
      }
    }, 120);
  });
})();

// ── Iniciar modo de cordão (com waypoints) ─────────────────────────
window.sdrPonCordStart = window.sdrPonCordStart || function(oltId, slot, port) {
  // Se em draw mode iniciado pela fibra → fechar circuito nesta PON
  if (window._sdrCordDrawMode && window._sdrCordDrawMode._startType === 'fiber') {
    _sdrCordFinishFiberToPon(oltId, slot, port);
    return;
  }
  if (window._sdrCordDrawMode) { sdrCordDrawCancel(); return; }

  // Se PON conectada ao DGO → apenas mostrar rastreabilidade (sem modo de edição de waypoints)
  var ponBtn = document.getElementById('pon-btn-' + oltId + '-' + slot + '-' + port);
  if (ponBtn && ponBtn.getAttribute('data-has-cord')) {
    if (window._sdrCordEdit) _sdrCordEditCancel();
    var _dgoId    = ponBtn.getAttribute('data-dgo-id');
    var _fiberKey = ponBtn.getAttribute('data-fiber-key');
    if (_dgoId) _sdrRastreabilidade(oltId, slot, port, _dgoId, _fiberKey);
    return;
  }

  window._sdrCordDrawMode = { oltId: oltId, slot: slot, port: port, waypoints: [], _ponBtn: ponBtn };

  // Banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) {
    banner.style.display = 'flex';
    var txt = document.getElementById('olt-cord-banner-text');
    if (txt) txt.textContent = 'SL' + slot + ' · PON ' + port + ' — clique no painel para adicionar pontos; clique na fibra do DGO para finalizar';
  }

  // Destacar PON selecionada, escurecer demais
  document.querySelectorAll('[id^="pon-btn-' + oltId + '-"]').forEach(function(el) {
    el.style.opacity = '0.25';
  });
  if (ponBtn) {
    ponBtn.style.opacity = '1';
    ponBtn.style.outline = '2px solid #a5b4fc';
    ponBtn.style.outlineOffset = '3px';
    ponBtn.style.zIndex = '2';
  }

  document.body.style.cursor = 'crosshair';

  // ── SVG de draw dentro do scroll area (scroll-relative, position:absolute) ──
  var scrollArea = document.getElementById('olt-scroll-area');
  if (scrollArea) {
    var oldSvg = document.getElementById('olt-draw-svg');
    if (oldSvg) oldSvg.remove();
    var drawSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    drawSvg.id = 'olt-draw-svg';
    drawSvg.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:25;overflow:visible');
    drawSvg.setAttribute('width', '100%');
    drawSvg.setAttribute('height', scrollArea.scrollHeight);
    drawSvg.innerHTML = '<defs>'
      + '<marker id="draw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
      + '<polygon points="0 0,8 4,0 8" fill="#a5b4fc"/></marker>'
      + '<filter id="draw-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur stdDeviation="2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>'
      // Polyline dos pontos confirmados (começa vazia)
      + '<polyline id="olt-draw-polyline" stroke="#a5b4fc" stroke-width="2" fill="none" opacity="0.8"/>'
      // Linha dashed do último ponto ao cursor
      + '<line id="olt-draw-dashline" stroke="#a5b4fc" stroke-width="2" stroke-dasharray="9,6" '
      + 'marker-end="url(#draw-arrow)" filter="url(#draw-glow)" opacity="0"/>'
      // Grupo de dots dos waypoints
      + '<g id="olt-draw-dots"></g>';
    scrollArea.appendChild(drawSvg);
  }

  function getSaCoords(clientX, clientY) {
    var sa = document.getElementById('olt-scroll-area');
    if (!sa) return {x: clientX, y: clientY};
    var r = sa.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top + sa.scrollTop };
  }

  function onMouseMove(ev) {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (!sa || !svg) return;
    // Atualizar altura do SVG se scroll mudou
    svg.setAttribute('height', sa.scrollHeight);
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode._lastMouseSvg = pos;
    _sdrCordSvgUpdate();
  }

  function onScroll() {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (sa && svg) svg.setAttribute('height', sa.scrollHeight);
    _sdrCordSvgUpdate();
  }

  // Waypoint: clique no painel (não em PON nem em fibra DGO)
  function onScrollClick(ev) {
    if (!window._sdrCordDrawMode) return;
    var tid = (ev.target.id || '');
    if (tid.indexOf('pon-btn-') === 0 || tid.indexOf('dgo-fiber-') === 0) return;
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode.waypoints.push(pos);
    _sdrCordSvgUpdate();
    // Feedback visual rápido no ponto clicado
    if (typeof toast === 'function') toast('Ponto ' + window._sdrCordDrawMode.waypoints.length + ' adicionado', 'info');
  }

  scrollArea.addEventListener('mousemove', onMouseMove);
  scrollArea.addEventListener('scroll', onScroll);
  scrollArea.addEventListener('click', onScrollClick);
  window._sdrCordDrawMode._onMouseMove   = onMouseMove;
  window._sdrCordDrawMode._onScroll      = onScroll;
  window._sdrCordDrawMode._onScrollClick = onScrollClick;

  _sdrCordSvgUpdate();
  if (typeof toast === 'function') toast('SL' + slot + ' PON ' + port + ' selecionada — clique para adicionar pontos do cordão', 'info');
};

// ── Cancelar modo de cordão ─────────────────────────────────────────
window.sdrCordDrawCancel = window.sdrCordDrawCancel || function() {
  if (window._sdrCordEdit) { _sdrCordEditCancel(); return; }
  if (!window._sdrCordDrawMode) return;
  var m = window._sdrCordDrawMode;
  window._sdrCordDrawMode = null;

  // Remover listeners do scroll area
  var sa = document.getElementById('olt-scroll-area');
  if (sa) {
    if (m._onMouseMove)   sa.removeEventListener('mousemove', m._onMouseMove);
    if (m._onScroll)      sa.removeEventListener('scroll',    m._onScroll);
    if (m._onScrollClick) sa.removeEventListener('click',     m._onScrollClick);
  }

  // Remover SVG de draw em progresso
  var drawSvg = document.getElementById('olt-draw-svg');
  if (drawSvg) drawSvg.remove();

  // Restaurar cursor
  document.body.style.cursor = '';

  // Esconder banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) banner.style.display = 'none';

  if (m._startType === 'fiber') {
    // Restaurar fibras DGO
    document.querySelectorAll('[id^="dgo-fiber-"]').forEach(function(el) {
      el.style.opacity = '';
      el.style.boxShadow = '';
    });
  } else {
    // Restaurar botões PON
    document.querySelectorAll('[id^="pon-btn-' + m.oltId + '-"]').forEach(function(el) {
      el.style.opacity = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.zIndex = '';
    });
  }
};

// ── Conectar PON → fibra do DGO ────────────────────────────────────
window.sdrCordConnectFiber = window.sdrCordConnectFiber || function(dgoId, fiberKey) {
  if (!window._sdrCordDrawMode) {
    var fiberEl = document.getElementById('dgo-fiber-' + dgoId + '-' + fiberKey);
    var connKey = fiberEl ? fiberEl.getAttribute('data-pon-key') : null;
    if (connKey) {
      // Fibra já conectada → destacar cordão
      _sdrCordHighlight(connKey);
      return;
    }
    // Fibra livre → iniciar draw a partir da fibra
    _sdrCordDrawFromFiber(dgoId, fiberKey);
    return;
  }
  // Em draw mode pon-start: clicou na fibra → fechar circuito
  if (window._sdrCordDrawMode._startType === 'fiber') {
    // Clicou na fibra de origem (cancela) ou em outra fibra (trocar destino não faz sentido → cancelar)
    sdrCordDrawCancel();
    return;
  }
  var m      = window._sdrCordDrawMode;
  var oltId  = m.oltId;
  var slot   = m.slot;
  var port   = m.port;
  var ponKey = 's' + slot + '_p' + port;

  window.sdrRef('infrastructure/' + dgoId + '/fibers/' + fiberKey).once('value').then(function(snap) {
    var fib = snap.val() || {};
    var oldPonKey = fib.pon_key || null;  // PON que usava esta fibra antes

    if (fib.status === 'used') {
      var msg = oldPonKey
        ? 'Fibra ' + fiberKey + ' já está usada pela ' + oldPonKey + '.\nDesconectar e reconectar à SL' + slot + ' PON' + port + '?'
        : 'Fibra ' + fiberKey + ' já está em uso. Reconectar mesmo assim?';
      if (!confirm(msg)) {
        sdrCordDrawCancel();
        return;
      }
    }

    // Converter waypoints para coordenadas fracionais (relativo ao scroll area)
    var cordPath = [];
    var sa = document.getElementById('olt-scroll-area');
    if (sa && m.waypoints && m.waypoints.length > 0) {
      var saW = sa.clientWidth  || 1;
      var saH = sa.scrollHeight || 1;
      cordPath = m.waypoints.map(function(wp) {
        return { x: Math.round(wp.x / saW * 10000) / 10000,
                 y: Math.round(wp.y / saH * 10000) / 10000 };
      });
    }

    var updates = {};
    // Liberar a antiga PON que usava esta fibra (se houver)
    if (oldPonKey && oldPonKey !== ponKey) {
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/dgo_id']        = null;
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/dgo_fiber_key'] = null;
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/cord_path']     = null;
      updates['olt_connections/' + oltId + '/pons/' + oldPonKey + '/active']        = false;
    }
    // Liberar fibra antiga da PON atual (se estava conectada a outra fibra)
    // (será lido da PON via Firebase para não depender de cache)
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/active']        = true;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_id']        = dgoId;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_fiber_key'] = fiberKey;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/updated_at']    = new Date().toISOString();
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/cord_path']     = cordPath;
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/status']     = 'used';
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/olt_id']     = oltId;
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/pon_key']    = ponKey;

    // Se a PON já estava conectada a OUTRA fibra, liberar a fibra antiga
    window.sdrRef('olt_connections/' + oltId + '/pons/' + ponKey).once('value').then(function(pSnap) {
      var pData = pSnap.val() || {};
      if (pData.dgo_id && pData.dgo_fiber_key && (pData.dgo_id !== dgoId || pData.dgo_fiber_key !== fiberKey)) {
        updates['infrastructure/' + pData.dgo_id + '/fibers/' + pData.dgo_fiber_key + '/status']  = 'free';
        updates['infrastructure/' + pData.dgo_id + '/fibers/' + pData.dgo_fiber_key + '/olt_id']  = null;
        updates['infrastructure/' + pData.dgo_id + '/fibers/' + pData.dgo_fiber_key + '/pon_key'] = null;
      }
      return window.sdrRef('').update(updates);
    }).then(function() {
      if (typeof toast === 'function') toast('Conectado: SL' + slot + ' PON' + port + ' → ' + fiberKey + (cordPath.length ? ' (' + cordPath.length + ' pontos)' : ''), 'success');
      sdrCordDrawCancel();
      window.sdrOltInlineRender(oltId);
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
    });
  });
};

// ── Draw mode iniciado pela fibra do DGO ───────────────────────────
window._sdrCordDrawFromFiber = window._sdrCordDrawFromFiber || function(dgoId, fiberKey) {
  // OLT ativa fica na global window._sdrActiveOltTab (setada pelo sdrOltTabSwitch)
  var oltId = window._sdrActiveOltTab || null;
  if (!oltId) { if (typeof toast === 'function') toast('Abra o painel de uma OLT primeiro', 'warn'); return; }

  var fiberEl = document.getElementById('dgo-fiber-' + dgoId + '-' + fiberKey);

  window._sdrCordDrawMode = {
    _startType : 'fiber',
    oltId      : oltId,
    dgoId      : dgoId,
    fiberKey   : fiberKey,
    _fiberEl   : fiberEl,
    waypoints  : []
  };

  // Banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) {
    banner.style.display = 'flex';
    var txt = document.getElementById('olt-cord-banner-text');
    if (txt) txt.textContent = 'Fibra ' + fiberKey.replace('_', ' ') + ' selecionada — clique no painel para pontos; clique na PON de destino para finalizar';
  }

  // Destacar fibra de origem, escurecer demais fibras
  document.querySelectorAll('[id^="dgo-fiber-"]').forEach(function(el) { el.style.opacity = '0.25'; });
  if (fiberEl) { fiberEl.style.opacity = '1'; fiberEl.style.boxShadow = '0 0 10px #a5b4fc'; }

  document.body.style.cursor = 'crosshair';

  var scrollArea = document.getElementById('olt-scroll-area');
  if (scrollArea) {
    var oldSvg = document.getElementById('olt-draw-svg');
    if (oldSvg) oldSvg.remove();
    var drawSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    drawSvg.id = 'olt-draw-svg';
    drawSvg.setAttribute('style', 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:25;overflow:visible');
    drawSvg.setAttribute('width', '100%');
    drawSvg.setAttribute('height', scrollArea.scrollHeight);
    drawSvg.innerHTML = '<defs>'
      + '<marker id="draw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
      + '<polygon points="0 0,8 4,0 8" fill="#a5b4fc"/></marker>'
      + '<filter id="draw-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur stdDeviation="2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>'
      + '<polyline id="olt-draw-polyline" stroke="#a5b4fc" stroke-width="2" fill="none" opacity="0.8"/>'
      + '<line id="olt-draw-dashline" stroke="#a5b4fc" stroke-width="2" stroke-dasharray="9,6" '
      + 'marker-end="url(#draw-arrow)" filter="url(#draw-glow)" opacity="0"/>'
      + '<g id="olt-draw-dots"></g>';
    scrollArea.appendChild(drawSvg);
  }

  function getSaCoords(clientX, clientY) {
    var sa = document.getElementById('olt-scroll-area');
    if (!sa) return {x: clientX, y: clientY};
    var r = sa.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top + sa.scrollTop };
  }

  function onMouseMove(ev) {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (!sa || !svg) return;
    svg.setAttribute('height', sa.scrollHeight);
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode._lastMouseSvg = pos;
    _sdrCordSvgUpdate();
  }
  function onScroll() {
    var sa = document.getElementById('olt-scroll-area');
    var svg = document.getElementById('olt-draw-svg');
    if (sa && svg) svg.setAttribute('height', sa.scrollHeight);
    _sdrCordSvgUpdate();
  }
  function onScrollClick(ev) {
    if (!window._sdrCordDrawMode) return;
    var tid = (ev.target.id || '');
    // Ignorar cliques em fibras DGO e botões PON (tratados nos seus próprios handlers)
    if (tid.indexOf('pon-btn-') === 0 || tid.indexOf('dgo-fiber-') === 0) return;
    var pos = getSaCoords(ev.clientX, ev.clientY);
    window._sdrCordDrawMode.waypoints.push(pos);
    _sdrCordSvgUpdate();
    if (typeof toast === 'function') toast('Ponto ' + window._sdrCordDrawMode.waypoints.length + ' adicionado', 'info');
  }

  if (scrollArea) {
    scrollArea.addEventListener('mousemove', onMouseMove);
    scrollArea.addEventListener('scroll', onScroll);
    scrollArea.addEventListener('click', onScrollClick);
    window._sdrCordDrawMode._onMouseMove   = onMouseMove;
    window._sdrCordDrawMode._onScroll      = onScroll;
    window._sdrCordDrawMode._onScrollClick = onScrollClick;
  }

  _sdrCordSvgUpdate();
  if (typeof toast === 'function') toast('Fibra ' + fiberKey + ' — clique na PON de destino para finalizar', 'info');
};

// ── Finalizar circuito: fibra DGO → PON (suporta reconexão) ─────────
window._sdrCordFinishFiberToPon = window._sdrCordFinishFiberToPon || function(oltId, slot, port) {
  var m = window._sdrCordDrawMode;
  if (!m || m._startType !== 'fiber') return;

  var ponKey   = 's' + slot + '_p' + port;
  var dgoId    = m.dgoId;
  var fiberKey = m.fiberKey;

  // Ler estado atual da PON (pode já estar conectada a outra fibra)
  window.sdrRef('olt_connections/' + oltId + '/pons/' + ponKey).once('value').then(function(snap) {
    var pon = snap.val() || {};
    var oldDgoId    = pon.dgo_id       || null;
    var oldFiberKey = pon.dgo_fiber_key || null;

    if (oldDgoId) {
      var msg = oldFiberKey
        ? 'PON SL' + slot + '-' + port + ' já está conectada à fibra ' + oldFiberKey + '.\nDesconectar e reconectar à fibra ' + fiberKey + '?'
        : 'PON SL' + slot + '-' + port + ' já está conectada. Reconectar mesmo assim?';
      if (!confirm(msg)) {
        sdrCordDrawCancel();
        return;
      }
    }

    // Converter waypoints para fracional (inverter: fibra→PON fica PON→fibra)
    var cordPath = [];
    var sa = document.getElementById('olt-scroll-area');
    if (sa && m.waypoints && m.waypoints.length > 0) {
      var saW = sa.clientWidth  || 1;
      var saH = sa.scrollHeight || 1;
      cordPath = m.waypoints.slice().reverse().map(function(wp) {
        return { x: Math.round(wp.x / saW * 10000) / 10000,
                 y: Math.round(wp.y / saH * 10000) / 10000 };
      });
    }

    var updates = {};
    // Liberar fibra antiga (se era diferente)
    if (oldDgoId && oldFiberKey && (oldDgoId !== dgoId || oldFiberKey !== fiberKey)) {
      updates['infrastructure/' + oldDgoId + '/fibers/' + oldFiberKey + '/status']  = 'free';
      updates['infrastructure/' + oldDgoId + '/fibers/' + oldFiberKey + '/olt_id']  = null;
      updates['infrastructure/' + oldDgoId + '/fibers/' + oldFiberKey + '/pon_key'] = null;
    }
    // Gravar nova conexão na PON
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/active']        = true;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_id']        = dgoId;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/dgo_fiber_key'] = fiberKey;
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/updated_at']    = new Date().toISOString();
    updates['olt_connections/' + oltId + '/pons/' + ponKey + '/cord_path']     = cordPath;
    // Marcar nova fibra como usada
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/status']     = 'used';
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/olt_id']     = oltId;
    updates['infrastructure/' + dgoId + '/fibers/' + fiberKey + '/pon_key']    = ponKey;

    window.sdrRef('').update(updates).then(function() {
      var msg = oldDgoId
        ? 'Reconectado: SL' + slot + ' PON' + port + ' → ' + fiberKey + (oldFiberKey ? ' (era ' + oldFiberKey + ')' : '')
        : 'Conectado: Fibra ' + fiberKey + ' → SL' + slot + ' PON' + port;
      if (cordPath.length) msg += ' (' + cordPath.length + ' pontos)';
      if (typeof toast === 'function') toast(msg, 'success');
      sdrCordDrawCancel();
      window.sdrOltInlineRender(oltId);
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
    });
  });
};

// ── Atualizar SVG em progresso (draw mode) ─────────────────────────
window._sdrCordSvgUpdate = window._sdrCordSvgUpdate || function() {
  var m = window._sdrCordDrawMode;
  if (!m) return;
  var sa  = document.getElementById('olt-scroll-area');
  var svg = document.getElementById('olt-draw-svg');
  if (!sa || !svg) return;

  var sr = sa.getBoundingClientRect();

  // ── Ponto de origem depende de onde o draw foi iniciado ──
  var startPt = { x: 0, y: 0 };
  if (m._startType === 'fiber') {
    // Iniciado pela fibra DGO — saída da borda direita
    var fEl = m._fiberEl || document.getElementById('dgo-fiber-' + m.dgoId + '-' + m.fiberKey);
    if (fEl) {
      var fr = fEl.getBoundingClientRect();
      startPt.x = fr.left - sr.left + fr.width;          // borda direita fibra
      startPt.y = fr.top  - sr.top  + sa.scrollTop + fr.height / 2;
    }
  } else {
    // Iniciado pela PON — saída da borda direita
    var ponBtn = m._ponBtn || document.getElementById('pon-btn-' + m.oltId + '-' + m.slot + '-' + m.port);
    if (ponBtn) {
      var br = ponBtn.getBoundingClientRect();
      startPt.x = br.left - sr.left + br.width;          // borda direita PON
      startPt.y = br.top  - sr.top  + sa.scrollTop + br.height / 2;
    }
  }

  // Todos os pontos confirmados: origem + waypoints
  var pts = [startPt].concat(m.waypoints || []);
  var ptsStr = pts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

  // Polyline dos pontos confirmados
  var poly = document.getElementById('olt-draw-polyline');
  if (poly) poly.setAttribute('points', ptsStr);

  // Linha dashed: último ponto confirmado → cursor
  var lastPt = pts[pts.length - 1];
  var dash = document.getElementById('olt-draw-dashline');
  if (dash) {
    dash.setAttribute('x1', lastPt.x);
    dash.setAttribute('y1', lastPt.y);
    if (m._lastMouseSvg) {
      dash.setAttribute('x2', m._lastMouseSvg.x);
      dash.setAttribute('y2', m._lastMouseSvg.y);
      dash.setAttribute('opacity', '0.85');
    }
  }

  // Dots nos waypoints
  var dotsG = document.getElementById('olt-draw-dots');
  if (dotsG) {
    dotsG.innerHTML = '';
    (m.waypoints || []).forEach(function(wp, idx) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', wp.x); c.setAttribute('cy', wp.y);
      c.setAttribute('r', '5'); c.setAttribute('fill', '#6366f1');
      c.setAttribute('stroke', '#a5b4fc'); c.setAttribute('stroke-width', '1.5');
      dotsG.appendChild(c);
      var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', wp.x + 7); txt.setAttribute('y', wp.y + 4);
      txt.setAttribute('font-size', '8'); txt.setAttribute('fill', '#a5b4fc');
      txt.textContent = idx + 1;
      dotsG.appendChild(txt);
    });
    // Dot de início (PON ou fibra)
    var startDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startDot.setAttribute('cx', startPt.x); startDot.setAttribute('cy', startPt.y);
    startDot.setAttribute('r', '7');
    startDot.setAttribute('fill', m._startType === 'fiber' ? '#22c55e' : '#a5b4fc');
    startDot.setAttribute('stroke', '#fff'); startDot.setAttribute('stroke-width', '1.5');
    startDot.setAttribute('opacity', '0.9');
    dotsG.appendChild(startDot);
  }
};

// ── Desenhar cordões salvos no SVG permanente ──────────────────────
window._sdrDrawSavedCords = window._sdrDrawSavedCords || function(oltId, pons, dgos) {
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return;

  var old = document.getElementById('olt-cords-svg');
  if (old) old.remove();
  // Limpar qualquer SVG de edição de waypoints residual (não usado mais — rota auto-calculada)
  var oldEdit = document.getElementById('olt-cord-edit-svg');
  if (oldEdit) oldEdit.remove();
  if (window._sdrCordEdit) { window._sdrCordEdit = null; }
  var banner = document.getElementById('olt-cord-banner');
  if (banner) banner.style.display = 'none';

  // Verificar se há PONs conectadas a DGOs (com ou sem waypoints)
  var hasAnyCord = Object.values(pons).some(function(c) {
    return c && c.dgo_id && c.dgo_fiber_key;
  });
  if (!hasAnyCord) return;

  var svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.id = 'olt-cords-svg';
  svgEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;overflow:visible;pointer-events:none;z-index:10';
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', Math.max(sa.scrollHeight, sa.clientHeight, 600));
  svgEl.innerHTML = '<defs>'
    + '<marker id="csaved-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">'
    + '<polygon points="0 0,8 4,0 8" fill="#6366f1"/></marker>'
    + '<filter id="csaved-glow" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feGaussianBlur stdDeviation="1.8" result="b"/>'
    + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '</defs>';
  sa.appendChild(svgEl);

  var saRect = sa.getBoundingClientRect();
  var saW    = sa.clientWidth;
  var saH    = sa.scrollHeight;

  var _bridgePad = 10;

  Object.entries(pons).forEach(function(e) {
    var ponKey = e[0], cfg = e[1];
    // Desenhar para TODAS as PONs conectadas a DGO (com ou sem waypoints)
    if (!cfg || !cfg.dgo_id || !cfg.dgo_fiber_key) return;
    var mm = ponKey.match(/^s(\d+)_p(\d+)$/);
    if (!mm) return;
    var sl = mm[1], po = mm[2];

    var ponBtn  = document.getElementById('pon-btn-' + oltId + '-' + sl + '-' + po);
    var fiberEl = document.getElementById('dgo-fiber-' + cfg.dgo_id + '-' + cfg.dgo_fiber_key);

    var pts = [];
    var ponX, ponY, fiberX, fiberY;

    if (ponBtn) {
      var br = ponBtn.getBoundingClientRect();
      ponX = br.left - saRect.left + br.width;              // borda DIREITA da PON
      ponY = br.top  - saRect.top  + sa.scrollTop + br.height / 2;
    }
    if (fiberEl) {
      var fr = fiberEl.getBoundingClientRect();
      fiberX = fr.left - saRect.left + fr.width;            // borda DIREITA da fibra DGO
      fiberY = fr.top  - saRect.top  + sa.scrollTop + fr.height / 2;
    }

    if (ponX == null || fiberX == null) return;

    // Roteamento duplo-L:
    //   PON → gap do slot (↓ até abaixo da última PON) → ponte (→) → gap do tubo (↓) → fibra (→)
    var GAP_HALF    = 14;
    var BRIDGE_PAD  = 10; // px abaixo da última PON do slot

    // slotGapX — direita do slot + GAP_HALF (espinha vertical)
    var slotEl = document.getElementById('olt-slot-' + oltId + '-' + sl);
    var slotGapX = slotEl
      ? slotEl.getBoundingClientRect().right - saRect.left + GAP_HALF
      : ponX + GAP_HALF;

    // bridgeY — base da ÚLTIMA PON do slot deste cordão + margem
    // Cada cord usa a base do seu próprio slot (todos devem ter o mesmo nº de PONs para alinhamento)
    var bridgeY = slotEl
      ? slotEl.getBoundingClientRect().bottom - saRect.top + sa.scrollTop + _bridgePad
      : fiberY - 20;
    bridgeY = Math.min(bridgeY, fiberY - 4); // nunca ultrapassar a fibra

    // tubeGapX — direita do tubo alvo + GAP_HALF (extrai nº tubo da fiber key, ex: "t6f10" → t=6)
    var tubeMatch = cfg.dgo_fiber_key && cfg.dgo_fiber_key.match(/^t(\d+)f/);
    var tubeNum   = tubeMatch ? tubeMatch[1] : null;
    var tubeEl    = tubeNum ? document.getElementById('dgo-tube-' + cfg.dgo_id + '-' + tubeNum) : null;
    var tubeGapX  = tubeEl
      ? tubeEl.getBoundingClientRect().right - saRect.left + GAP_HALF
      : fiberX + GAP_HALF;

    pts = [
      { x: ponX,      y: ponY      },  // saída direita da PON →
      { x: slotGapX,  y: ponY      },  // entra no gap do slot ↓
      { x: slotGapX,  y: bridgeY   },  // desce abaixo da última PON (PON 16)
      { x: tubeGapX,  y: bridgeY   },  // L → travessia horizontal até gap do tubo
      { x: tubeGapX,  y: fiberY    },  // desce pelo gap do tubo ↓
      { x: fiberX,    y: fiberY    }   // L → chega na fibra
    ];
    if (pts.length < 2) return;

    var ptsStr = pts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

    // Grupo do cordão (pointer-events ativo para clique)
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = 'cord-' + ponKey;
    g.setAttribute('pointer-events', 'all');
    g.style.cursor = 'pointer';

    // Área de clique transparente e larga
    var hit = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    hit.setAttribute('points', ptsStr);
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '14');
    hit.setAttribute('fill', 'none');
    hit.setAttribute('pointer-events', 'stroke');
    g.appendChild(hit);

    // Polyline visível
    var vis = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    vis.setAttribute('points', ptsStr);
    vis.setAttribute('stroke', '#6366f1');
    vis.setAttribute('stroke-width', '2.5');
    vis.setAttribute('fill', 'none');
    vis.setAttribute('marker-end', 'url(#csaved-arrow)');
    vis.setAttribute('filter', 'url(#csaved-glow)');
    vis.setAttribute('pointer-events', 'none');
    vis.setAttribute('class', 'olt-cord-vis'); // SVG: usar setAttribute, não .className
    g.appendChild(vis);

    // Dots de waypoints removidos — roteamento automático (Sprint 16+)

    // Clique no cordão
    g.onclick = function(ev) {
      ev.stopPropagation();
      _sdrCordHighlight(ponKey);
    };
    svgEl.appendChild(g);
  });
};

// ── Rastreabilidade completa do caminho óptico PON → DGO → Splitters → CTO ──
window._sdrRastreabilidade = window._sdrRastreabilidade || function(oltId, slot, port, dgoId, fiberKey) {
  var panel = document.getElementById('olt-panel-content');
  if (!panel) return;

  // Criar ou limpar painel de rastreio
  var tracePanel = document.getElementById('olt-rastreio-panel');
  if (!tracePanel) {
    panel.insertAdjacentHTML('beforeend',
      '<div id="olt-rastreio-panel" style="margin-top:16px;background:#060d1c;border:1px solid #334155;border-radius:10px;overflow:hidden">'
      + '<div style="background:#0f1f3a;padding:9px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e3a5f">'
      + '<span style="color:#38bdf8;font-size:.82rem;font-weight:700"><i class="fas fa-route" style="margin-right:7px"></i>Caminho Óptico</span>'
      + '<button onclick="document.getElementById(\'olt-rastreio-panel\').remove()" '
      + 'style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1.1rem;line-height:1">&times;</button>'
      + '</div>'
      + '<div id="olt-rastreio-content" style="padding:14px;font-size:.8rem;color:#e2e8f0;max-height:420px;overflow-y:auto">'
      + '<i class="fas fa-spinner fa-spin" style="color:#64748b"></i></div>'
      + '</div>'
    );
    tracePanel = document.getElementById('olt-rastreio-panel');
  } else {
    var rc = document.getElementById('olt-rastreio-content');
    if (rc) rc.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:#64748b"></i>';
  }
  setTimeout(function() { tracePanel && tracePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);

  Promise.all([
    window.sdrRef('olt_connections/' + oltId).once('value'),
    window.sdrRef('infrastructure').once('value'),
    window.sdrRef('onus').once('value'),
    window.sdrRef('clients').once('value')
  ]).then(function(snaps) {
    var olt     = snaps[0].val() || {};
    var infra   = snaps[1].val() || {};
    var onus    = snaps[2].val() || {};
    var clients = snaps[3].val() || {};

    // Índice: pai → filhos
    var byParent = {};
    Object.entries(infra).forEach(function(e) {
      var id = e[0], obj = e[1];
      if (!obj) return;
      var pid = obj.parent_id || obj.olt_id || '__root__';
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push({ id: id, obj: obj });
    });

    // Índice: serial → cliente
    var clientBySerial = {};
    Object.entries(clients).forEach(function(e) {
      var c = e[1];
      if (c && c.onu_serial) clientBySerial[c.onu_serial] = c;
    });

    var ponKey = 's' + slot + '_p' + port;
    var ponCfg = (olt.pons || {})[ponKey] || {};
    var dgo    = infra[dgoId] || {};

    function rxBadge(rx) {
      if (rx == null) return '';
      var col = rx > -25 ? '#22c55e' : rx > -28 ? '#f59e0b' : '#ef4444';
      return '<span style="color:' + col + ';font-size:.7rem;margin-left:4px">' + rx + ' dBm</span>';
    }

    function nodeHtml(depth, borderColor, iconCls, iconColor, label, sublabel, extra) {
      var indent = depth * 18;
      return '<div style="margin:5px 0 5px ' + indent + 'px;display:flex;align-items:flex-start;gap:0">'
        + (depth > 0 ? '<div style="width:2px;min-height:24px;background:#1e3a5f;margin-right:10px;margin-top:6px;flex-shrink:0"></div>' : '')
        + '<span style="display:inline-flex;align-items:center;gap:6px;background:#0f172a;'
        + 'border:1px solid ' + borderColor + ';border-radius:7px;padding:5px 11px;flex-wrap:wrap">'
        + '<i class="fas ' + iconCls + '" style="color:' + iconColor + ';width:14px;text-align:center"></i>'
        + '<b style="color:' + iconColor + '">' + label + '</b>'
        + (sublabel ? '<span style="color:#64748b;font-size:.72rem">' + sublabel + '</span>' : '')
        + (extra || '')
        + '</span></div>';
    }

    function renderSubtree(nodeId, depth) {
      var children = (byParent[nodeId] || []).sort(function(a,b) {
        return (a.obj.nome || a.id).localeCompare(b.obj.nome || b.id);
      });
      return children.map(function(c) {
        var cid = c.id, cobj = c.obj;
        var tipo = cobj.type;
        if (tipo === 'cto') {
          // CTOs: mostrar ONUs conectadas
          var ctOnus = Object.entries(onus).filter(function(e) {
            return e[1] && e[1].cto_id === cid;
          });
          var usedPorts = cobj.used_ports || 0;
          var totalPorts = cobj.total_ports || 8;
          var ctoNode = nodeHtml(depth, '#d97706', 'fa-box', '#fbbf24',
            cobj.nome || cid,
            usedPorts + '/' + totalPorts + ' portas · ' + ctOnus.length + ' ONUs', '');
          var onusHtml = ctOnus.length > 0
            ? ctOnus.map(function(e2) {
                var uid = e2[0], u = e2[1];
                var st  = u.status || 'offline';
                var stCol = st === 'online' ? '#22c55e' : '#ef4444';
                var cli = u.serial_number ? (clientBySerial[u.serial_number] || null) : null;
                return '<div style="margin:3px 0 3px ' + ((depth+1)*18+12) + 'px;display:flex;align-items:center;gap:6px;font-size:.75rem">'
                  + '<span style="width:7px;height:7px;border-radius:50%;background:' + stCol + ';flex-shrink:0"></span>'
                  + '<span style="color:#94a3b8;font-family:monospace">' + (u.serial_number || uid) + '</span>'
                  + '<span style="color:#64748b">' + (u.model || '') + '</span>'
                  + rxBadge(u.rx_power)
                  + (cli ? '<span style="color:#e2e8f0;font-weight:600"> — ' + cli.name + '</span>'
                           + '<span style="color:#64748b;font-size:.7rem"> ' + (cli.plan_name || '') + '</span>' : '')
                  + '</div>';
              }).join('')
            : '<div style="margin-left:' + ((depth+1)*18+12) + 'px;font-size:.72rem;color:#475569;font-style:italic">Sem ONUs</div>';
          return ctoNode + onusHtml;
        } else if (tipo === 'splitter') {
          var grau = cobj.grau || 1;
          var spColor = grau === 1 ? '#7c3aed' : grau === 2 ? '#a855f7' : '#c084fc';
          var spNode = nodeHtml(depth, spColor, 'fa-code-branch', spColor,
            cobj.nome || cid, 'Grau ' + grau + ' · ' + (cobj.ratio || ''), '');
          return spNode + renderSubtree(cid, depth + 1);
        } else {
          return nodeHtml(depth, '#64748b', 'fa-circle', '#94a3b8',
            cobj.nome || cid, tipo, '') + renderSubtree(cid, depth + 1);
        }
      }).join('');
    }

    // Caminho: OLT → PON → DGO → arvore infra
    var ponLabel  = ponCfg.label || ('Slot ' + slot + ' PON ' + port);
    var ponActive = ponCfg.active ? '<span style="color:#22c55e;font-size:.7rem">● Ativa</span>' : '<span style="color:#ef4444;font-size:.7rem">○ Inativa</span>';
    var ponVlan   = ponCfg.vlan   ? '<span style="color:#64748b;font-size:.7rem">VLAN ' + ponCfg.vlan + '</span>' : '';

    var subtree = renderSubtree(dgoId, 2);
    var noSubtree = !subtree.trim();

    var html = ''
      // OLT
      + nodeHtml(0, '#ef4444', 'fa-server', '#fca5a5', olt.name || oltId, (olt.ip_address || '') + ' · ' + (olt.model || ''), '')
      // PON
      + '<div style="margin-left:14px;font-size:.7rem;color:#4f6272;padding:2px 0"><i class="fas fa-long-arrow-alt-down"></i> cordão</div>'
      + nodeHtml(1, '#3b82f6', 'fa-plug', '#93c5fd', ponLabel, 'SL' + slot + ' PON' + port + ' · ' + (ponCfg.speed || '1G GPON'), ' ' + ponActive + ' ' + ponVlan)
      // DGO
      + (dgoId
        ? ('<div style="margin-left:' + (1*18+14) + 'px;font-size:.7rem;color:#4f6272;padding:2px 0"><i class="fas fa-long-arrow-alt-down"></i> fibra ' + (fiberKey || '') + '</div>'
          + nodeHtml(1, '#0ea5e9', 'fa-network-wired', '#7dd3fc',
              dgo.nome || dgoId,
              (dgo.tube_count||12) + 'T × ' + (dgo.fiber_per_tube||12) + 'F', ''))
        : '')
      // Subtree (Splitters → CTOs → ONUs)
      + (dgoId
        ? (noSubtree
            ? '<div style="margin-left:36px;font-size:.77rem;color:#475569;font-style:italic;padding:8px 0">Sem splitters/CTOs vinculados ao DGO na infraestrutura</div>'
            : subtree)
        : '');

    var rc2 = document.getElementById('olt-rastreio-content');
    if (rc2) rc2.innerHTML = html;
  }).catch(function(err) {
    var rc3 = document.getElementById('olt-rastreio-content');
    if (rc3) rc3.innerHTML = '<span style="color:#ef4444"><i class="fas fa-exclamation-triangle"></i> Erro: ' + err.message + '</span>';
  });
};

// ── Configuração de slot — quantidade de PONs por slot ──────────────
window.sdrSlotConfig = window.sdrSlotConfig || function(oltId, slot, currentCount) {
  var existing = document.getElementById('sdr-slot-cfg-modal');
  if (existing) existing.remove();

  var html = '<div class="modal-overlay open" id="sdr-slot-cfg-modal" onclick="if(event.target===this)this.remove()">'
    + '<div class="modal-box" style="max-width:360px">'
    + '<div class="modal-header">'
    + '<h3 style="font-size:.95rem"><i class="fas fa-sliders-h" style="color:#6366f1;margin-right:8px"></i>Configurar Slot ' + slot + '</h3>'
    + '<button onclick="document.getElementById(\'sdr-slot-cfg-modal\').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer">&times;</button>'
    + '</div>'
    + '<div class="modal-body">'
    + '<div class="form-group">'
    + '<label>Quantidade de PONs neste slot</label>'
    + '<select id="slot-cfg-poncount" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem">'
    + [4,8,16,32].map(function(n) {
        return '<option value="' + n + '"' + (n === currentCount ? ' selected' : '') + '>' + n + ' PONs por slot</option>';
      }).join('')
    + '</select>'
    + '</div>'
    + '<div class="form-group">'
    + '<label>Nome / Descrição do slot (opcional)</label>'
    + '<input id="slot-cfg-label" placeholder="Ex: Slot ' + slot + ' — Bairro Norte" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:.9rem">'
    + '</div>'
    + '<div style="font-size:.78rem;color:#64748b;background:#f8fafc;border-radius:6px;padding:8px 12px">'
    + '<i class="fas fa-info-circle" style="color:#3b82f6;margin-right:4px"></i>'
    + 'A alteração afeta <b>somente este slot</b>. Os outros slots mantêm a configuração global da OLT.'
    + '</div>'
    + '</div>'
    + '<div class="modal-footer">'
    + '<button class="btn-secondary" onclick="document.getElementById(\'sdr-slot-cfg-modal\').remove()">Cancelar</button>'
    + '<button class="btn-primary" onclick="sdrSlotConfigSave(\'' + oltId + '\',' + slot + ')"><i class="fas fa-save"></i> Salvar Slot</button>'
    + '</div>'
    + '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
  // Preencher label existente assincronamente
  window.sdrRef('olt_connections/' + oltId + '/slots/' + slot).once('value').then(function(snap) {
    var slotCfg = snap.val() || {};
    var labelEl = document.getElementById('slot-cfg-label');
    if (labelEl && slotCfg.label) labelEl.value = slotCfg.label;
    // Atualizar select com valor real do Firebase (sobrescreve currentCount)
    var selEl = document.getElementById('slot-cfg-poncount');
    if (selEl && slotCfg.pon_count) selEl.value = String(slotCfg.pon_count);
  });
};

window.sdrSlotConfigSave = window.sdrSlotConfigSave || function(oltId, slot) {
  var ponCount = parseInt(document.getElementById('slot-cfg-poncount').value) || 8;
  var label    = (document.getElementById('slot-cfg-label').value || '').trim();
  var updates  = {};
  updates['olt_connections/' + oltId + '/slots/' + slot + '/pon_count'] = ponCount;
  if (label) updates['olt_connections/' + oltId + '/slots/' + slot + '/label'] = label;
  window.sdrRef('').update(updates).then(function() {
    if (typeof toast === 'function') toast('Slot ' + slot + ' configurado com ' + ponCount + ' PONs!', 'success');
    document.getElementById('sdr-slot-cfg-modal').remove();
    if (document.getElementById('olt-panel-content') && window._sdrActiveOltTab === oltId) {
      window.sdrOltInlineRender(oltId);
    }
  }).catch(function(e) {
    if (typeof toast === 'function') toast('Erro: ' + e.message, 'error');
  });
};

// ── Destacar um cordão (clique no cordão, PON ou fibra) ────────────
window._sdrCordHighlight = window._sdrCordHighlight || function(ponKey) {
  var svg = document.getElementById('olt-cords-svg');
  if (!svg) return;
  // Escurecer todos
  svg.querySelectorAll('.olt-cord-vis').forEach(function(el) {
    el.setAttribute('stroke', '#312e81');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('opacity', '0.35');
  });
  // Iluminar o selecionado
  var g = document.getElementById('cord-' + ponKey);
  if (g) {
    var vis = g.querySelector('.olt-cord-vis');
    if (vis) {
      vis.setAttribute('stroke', '#e0e7ff');
      vis.setAttribute('stroke-width', '3.5');
      vis.setAttribute('opacity', '1');
    }
    // Info toast
    var mm = ponKey.match(/^s(\d+)_p(\d+)$/);
    if (mm && typeof toast === 'function') {
      toast('Cordão: SL' + mm[1] + ' PON' + mm[2] + ' — clique noutra área para desfazer destaque', 'info');
    }
  }
  // Restaurar após 4s
  setTimeout(function() {
    svg.querySelectorAll('.olt-cord-vis').forEach(function(el) {
      el.setAttribute('stroke', '#6366f1');
      el.setAttribute('stroke-width', '2.5');
      el.setAttribute('opacity', '1');
    });
  }, 4000);
};

// ══════════════════════════════════════════════════════════════════════
// ── EDITOR DE CORDÃO — arrastar waypoints + adicionar/remover pontos ──
// ══════════════════════════════════════════════════════════════════════

window._sdrCordEdit = null; // { oltId, slot, port, ponKey, dgoId, fiberKey, pts:[{x,y}...], dragging }

// Retorna todos os pontos do cordão: PON → waypoints → fibra DGO
window._sdrCordEditAllPts = window._sdrCordEditAllPts || function() {
  var m = window._sdrCordEdit;
  if (!m) return [];
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return m.pts.slice();
  var saRect = sa.getBoundingClientRect();
  var pts = [];

  var ponBtn = document.getElementById('pon-btn-' + m.oltId + '-' + m.slot + '-' + m.port);
  if (ponBtn) {
    var br = ponBtn.getBoundingClientRect();
    pts.push({ x: br.left - saRect.left + br.width,      // borda direita PON
               y: br.top  - saRect.top  + sa.scrollTop + br.height/2, _fixed: true });
  }
  m.pts.forEach(function(p) { pts.push(p); });
  var fEl = document.getElementById('dgo-fiber-' + m.dgoId + '-' + m.fiberKey);
  if (fEl) {
    var fr = fEl.getBoundingClientRect();
    pts.push({ x: fr.left - saRect.left + fr.width,      // borda direita fibra DGO
               y: fr.top  - saRect.top  + sa.scrollTop + fr.height/2, _fixed: true });
  }
  return pts;
};

window._sdrCordEditStart = window._sdrCordEditStart || function(oltId, slot, port, dgoId, fiberKey) {
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return;
  var ponKey = 's' + slot + '_p' + port;

  window.sdrRef('olt_connections/' + oltId + '/pons/' + ponKey + '/cord_path').once('value').then(function(snap) {
    var saved  = snap.val() || [];
    var saW    = sa.clientWidth  || 1;
    var saH    = sa.scrollHeight || 1;
    var pts    = saved.map(function(wp) { return { x: wp.x * saW, y: wp.y * saH }; });

    window._sdrCordEdit = { oltId: oltId, slot: slot, port: port, ponKey: ponKey,
                            dgoId: dgoId, fiberKey: fiberKey, pts: pts, dragging: null };

    // Banner
    var banner = document.getElementById('olt-cord-banner');
    if (banner) {
      banner.style.display = 'flex';
      var txt = document.getElementById('olt-cord-banner-text');
      if (txt) txt.textContent =
        'Editando SL' + slot + ' PON' + port + ' — clique no painel para adicionar pontos; arraste pontos para mover; botão dir. para remover';
      // Botão Cancelar já existe; adicionar Salvar dinamicamente
      if (!document.getElementById('olt-cord-edit-save-btn')) {
        var saveBtn = document.createElement('button');
        saveBtn.id = 'olt-cord-edit-save-btn';
        saveBtn.textContent = '✓ Salvar';
        saveBtn.style.cssText = 'background:#16a34a;border:none;color:#fff;cursor:pointer;font-size:.78rem;padding:3px 10px;border-radius:4px;margin-left:6px';
        saveBtn.onclick = _sdrCordEditSave;
        banner.appendChild(saveBtn);
      }
    }

    // Cursor crosshair no scroll area
    sa.style.cursor = 'crosshair';

    _sdrCordEditRender();
    if (typeof toast === 'function') toast('Clique para adicionar pontos • Arraste para mover • Botão dir. para remover', 'info');
  });
};

window._sdrCordEditRender = window._sdrCordEditRender || function() {
  var m = window._sdrCordEdit;
  if (!m) return;
  var sa = document.getElementById('olt-scroll-area');
  if (!sa) return;
  var saH = Math.max(sa.scrollHeight, sa.clientHeight, 600);
  var saRect = sa.getBoundingClientRect();

  // Remover SVG anterior
  var old = document.getElementById('olt-cord-edit-svg');
  if (old) old.remove();

  var svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.id = 'olt-cord-edit-svg';
  // pointer-events:none no fundo do SVG — os elementos interativos (polyline hit, dots) definem pointer-events próprios
  // Isso garante que botões do banner acima do SVG recebam cliques normalmente
  svgEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;overflow:visible;z-index:30;cursor:crosshair;pointer-events:none';
  svgEl.setAttribute('width', '100%');
  svgEl.setAttribute('height', saH);

  var allPts = _sdrCordEditAllPts();
  var ptsStr = allPts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

  // Área de clique larga na polyline (para inserir pontos)
  if (allPts.length >= 2) {
    var hit = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    hit.setAttribute('points', ptsStr);
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '16');
    hit.setAttribute('fill', 'none');
    hit.setAttribute('pointer-events', 'stroke');
    hit.style.cursor = 'copy';
    // Clique na linha = inserir waypoint no segmento mais próximo
    hit.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var m2 = window._sdrCordEdit;
      if (!m2 || m2.dragging !== null) return;
      var r = sa.getBoundingClientRect();
      var cx = ev.clientX - r.left;
      var cy = ev.clientY - r.top + sa.scrollTop;
      // Encontrar o segmento mais próximo (ignorando pontos fixos nas extremidades)
      var wp = _sdrCordEditAllPts();
      var bestSeg = 0, bestDist = Infinity;
      for (var i = 0; i < wp.length - 1; i++) {
        var mx = (wp[i].x + wp[i+1].x) / 2, my = (wp[i].y + wp[i+1].y) / 2;
        var d = Math.hypot(cx - mx, cy - my);
        if (d < bestDist) { bestDist = d; bestSeg = i; }
      }
      // Inserir após bestSeg mas antes de qualquer ponto fixo
      // bestSeg 0 = entre PON (fixo) e primeiro waypoint → inserir no início
      // bestSeg N-1 = entre último waypoint e fibra (fixo) → inserir no fim
      var hasStartFixed = (_sdrCordEditAllPts()[0] || {})._fixed;
      var insertIdx = hasStartFixed ? bestSeg : bestSeg; // dentro de m.pts
      var wpIdx = hasStartFixed ? Math.max(0, bestSeg) : bestSeg;
      m2.pts.splice(wpIdx, 0, { x: cx, y: cy });
      _sdrCordEditRender();
    });
    svgEl.appendChild(hit);

    // Polyline visível com dash
    var vis = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    vis.setAttribute('points', ptsStr);
    vis.setAttribute('stroke', '#a5b4fc');
    vis.setAttribute('stroke-width', '2.5');
    vis.setAttribute('stroke-dasharray', '8,4');
    vis.setAttribute('fill', 'none');
    vis.setAttribute('pointer-events', 'none');
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = '<filter id="cedit-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur stdDeviation="2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svgEl.appendChild(defs);
    vis.setAttribute('filter', 'url(#cedit-glow)');
    svgEl.appendChild(vis);
  }

  // Pontos fixos (PON + fibra DGO) — losangos cinza
  allPts.forEach(function(p) {
    if (!p._fixed) return;
    var d = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    var s = 8;
    d.setAttribute('points', (p.x)+','+(p.y-s)+' '+(p.x+s)+','+(p.y)+' '+(p.x)+','+(p.y+s)+' '+(p.x-s)+','+(p.y));
    d.setAttribute('fill', '#64748b');
    d.setAttribute('stroke', '#e2e8f0');
    d.setAttribute('stroke-width', '1.5');
    d.setAttribute('pointer-events', 'none');
    svgEl.appendChild(d);
  });

  // Waypoints draggáveis (pontos editáveis)
  m.pts.forEach(function(pt, idx) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('pointer-events', 'all');
    g.style.cursor = 'grab';

    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', pt.x);
    dot.setAttribute('cy', pt.y);
    dot.setAttribute('r', m.dragging === idx ? '10' : '8');
    dot.setAttribute('fill', m.dragging === idx ? '#4f46e5' : '#6366f1');
    dot.setAttribute('stroke', '#e0e7ff');
    dot.setAttribute('stroke-width', '2');
    dot.setAttribute('pointer-events', 'all');

    // Número do ponto
    var lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x', pt.x + 12); lbl.setAttribute('y', pt.y + 4);
    lbl.setAttribute('font-size', '9'); lbl.setAttribute('fill', '#c7d2fe');
    lbl.setAttribute('pointer-events', 'none');
    lbl.textContent = idx + 1;

    // Drag: mousedown
    g.addEventListener('mousedown', function(ev) {
      ev.stopPropagation(); ev.preventDefault();
      var m3 = window._sdrCordEdit;
      if (m3) { m3.dragging = idx; _sdrCordEditRender(); }
    });

    // Botão direito = remover ponto
    g.addEventListener('contextmenu', function(ev) {
      ev.preventDefault(); ev.stopPropagation();
      var m4 = window._sdrCordEdit;
      if (!m4) return;
      m4.pts.splice(idx, 1);
      _sdrCordEditRender();
    });

    g.appendChild(dot);
    g.appendChild(lbl);
    svgEl.appendChild(g);
  });

  // Rect transparente como fundo interativo (o SVG em si tem pointer-events:none,
  // mas filhos com pointer-events:all ainda recebem eventos)
  var bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', 'transparent');
  bgRect.setAttribute('pointer-events', 'all');
  bgRect.style.cursor = 'crosshair';
  // Clique no fundo = adicionar waypoint no final
  bgRect.addEventListener('click', function(ev) {
    var m5 = window._sdrCordEdit;
    if (!m5 || m5.dragging !== null) return;
    var r = sa.getBoundingClientRect();
    m5.pts.push({ x: ev.clientX - r.left, y: ev.clientY - r.top + sa.scrollTop });
    _sdrCordEditRender();
  });
  svgEl.insertBefore(bgRect, svgEl.firstChild); // inserir como primeiro filho (abaixo dos outros elementos)

  sa.appendChild(svgEl);

  // Arrastar: mousemove e mouseup no document
  if (!svgEl._dragBound) {
    svgEl._dragBound = true;
    var onDocMove = function(ev) {
      var m6 = window._sdrCordEdit;
      if (!m6 || m6.dragging === null) return;
      var r = sa.getBoundingClientRect();
      var nx = ev.clientX - r.left;
      var ny = ev.clientY - r.top + sa.scrollTop;
      m6.pts[m6.dragging] = { x: nx, y: ny };
      // Update positions diretamente sem re-render completo
      var allNow = _sdrCordEditAllPts();
      var pStr   = allNow.map(function(p) { return p.x + ',' + p.y; }).join(' ');
      var poly   = svgEl.querySelector('polyline[stroke="#a5b4fc"]');
      var phit   = svgEl.querySelector('polyline[stroke="transparent"]');
      if (poly) poly.setAttribute('points', pStr);
      if (phit) phit.setAttribute('points', pStr);
      var dots = svgEl.querySelectorAll('circle');
      dots.forEach(function(d, i) { d.setAttribute('cx', m6.pts[i].x); d.setAttribute('cy', m6.pts[i].y); });
      var lbls = svgEl.querySelectorAll('text');
      lbls.forEach(function(l, i) { l.setAttribute('x', m6.pts[i].x + 12); l.setAttribute('y', m6.pts[i].y + 4); });
    };
    var onDocUp = function() {
      var m7 = window._sdrCordEdit;
      if (m7 && m7.dragging !== null) {
        m7.dragging = null;
        _sdrCordEditRender(); // re-render limpo ao soltar
      }
    };
    document.addEventListener('mousemove', onDocMove);
    document.addEventListener('mouseup',  onDocUp);
    // Cleanup quando edição terminar
    window._sdrCordEditCleanupListeners = window._sdrCordEditCleanupListeners || function() {
      document.removeEventListener('mousemove', onDocMove);
      document.removeEventListener('mouseup',  onDocUp);
    };
  }
};

window._sdrCordEditSave = window._sdrCordEditSave || function() {
  var m = window._sdrCordEdit;
  if (!m) return;
  var sa = document.getElementById('olt-scroll-area');
  var saW = sa ? sa.clientWidth  || 1 : 1;
  var saH = sa ? sa.scrollHeight || 1 : 1;

  // Converter pixel → fração
  var cordPath = m.pts.map(function(p) {
    return { x: Math.round(p.x / saW * 10000) / 10000,
             y: Math.round(p.y / saH * 10000) / 10000 };
  });

  window.sdrRef('olt_connections/' + m.oltId + '/pons/' + m.ponKey + '/cord_path').set(cordPath).then(function() {
    if (typeof toast === 'function') toast('Percurso do cordão salvo! (' + cordPath.length + ' pontos)', 'success');
    _sdrCordEditCancel();
    window.sdrOltInlineRender(m.oltId);
  }).catch(function(e) {
    if (typeof toast === 'function') toast('Erro ao salvar: ' + e.message, 'error');
  });
};

window._sdrCordEditCancel = window._sdrCordEditCancel || function() {
  var m = window._sdrCordEdit;
  window._sdrCordEdit = null;

  // Limpar listeners globais
  if (typeof window._sdrCordEditCleanupListeners === 'function') {
    window._sdrCordEditCleanupListeners();
    window._sdrCordEditCleanupListeners = null;
  }

  // Remover SVG de edição
  var svg = document.getElementById('olt-cord-edit-svg');
  if (svg) svg.remove();

  // Remover botão Salvar do banner
  var saveBtn = document.getElementById('olt-cord-edit-save-btn');
  if (saveBtn) saveBtn.remove();

  // Esconder banner
  var banner = document.getElementById('olt-cord-banner');
  if (banner) banner.style.display = 'none';

  // Restaurar cursor
  var sa = document.getElementById('olt-scroll-area');
  if (sa) sa.style.cursor = '';

  // Re-desenhar cordões salvos (com o percurso original intacto se Cancelar)
  if (m) {
    var oldTab = window._sdrActiveOltTab;
    if (oldTab && document.getElementById('olt-panel-content')) {
      window.sdrOltInlineRender(oldTab);
    }
  }
};

// ── Posicionar OLT no mapa ──────────────────────────────────────────
// ── OLT CRUD — MIGRADO para src/olt/crud.js (sdr-bundle.js) ─────────────
// sdrOltStartMapPlace, _sdrCancelOltPlace, sdrMapClickCapture override,
// sdrOltsRender (Sprint 4), sdrOltAddModal, sdrOltModalCriarDgo,
