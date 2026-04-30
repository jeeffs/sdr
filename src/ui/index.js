/**
 * SDR — Fase 18: UI — Topologia, CtxMenu, MoveMarker, CtxHelpers, CSV Export
 * Migrado de sdr-module.js linhas 4598-5030
 *
 * Expõe via window:
 *   sdrTopologiaToggle, sdrTopologiaRender,
 *   _sdrCtxReg, sdrCtxMenu, sdrCtxClose,
 *   sdrMoveMarker, sdrMoveConfirmMarker, sdrMoveCancelMarker,
 *   _sdrCtxOlt, _sdrCtxOnu, _sdrCtxCliente, _sdrCtxInfra,
 *   sdrClientesFiltrar,
 *   sdrExportClientesCSV, sdrExportOnusCSV
 *
 * Deps (via window em runtime):
 *   window.sdrRef, window.sdrMap, window.L, window.toast, window.showPage,
 *   window.sdrInfraCache, window.sdrClientesCache, window.sdrOnusCache, window.sdrOltsCache,
 *   window.sdrMapRenderInfra, window.sdrMapRenderClientes, window.sdrMapFlyTo,
 *   window.sdrOltTabSwitch, window.sdrOnuAdd, window.sdrDgoCriarModal, window.sdrOltDelete,
 *   window.sdrOpenOnuPanel, window.sdrOnuEdit, window.sdrOnuDelete,
 *   window.sdrOpenClientePanel, window.sdrClienteEdit, window.sdrMapFlyToClient,
 *   window.sdrTicketAdd, window.sdrClienteDelete,
 *   window.sdrOpenInfraPanel, window.sdrInfraEdit, window.sdrInfraDelete,
 *   window.sdrClientesRender
 */

// ── Topologia FTTH — Árvore Visual ─────────────────────────────────

window.sdrTopologiaToggle = function() {
  var panel = document.getElementById('topologia-tree');
  if (!panel) return;
  var visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) window.sdrTopologiaRender();
};

window.sdrTopologiaRender = function() {
  var el = document.getElementById('topologia-content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

  Promise.all([
    window.sdrRef('olt_connections').once('value'),
    window.sdrRef('infrastructure').once('value'),
    window.sdrRef('onus').once('value'),
    window.sdrRef('clients').once('value')
  ]).then(function(snaps) {
    var olts    = snaps[0].val() || {};
    var infra   = snaps[1].val() || {};
    var onus    = snaps[2].val() || {};
    var clients = snaps[3].val() || {};

    var byType   = {};
    var byParent = {};
    Object.entries(infra).forEach(function(e) {
      var id = e[0], obj = e[1];
      if (!obj) return;
      var t = obj.type || 'unknown';
      if (!byType[t]) byType[t] = {};
      byType[t][id] = obj;
      var pid = obj.parent_id || obj.olt_id || '__root__';
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push({id:id, obj:obj});
    });

    var onusByCto = {};
    Object.entries(onus).forEach(function(e) {
      var uid = e[0], u = e[1];
      if (!u) return;
      var cid = u.cto_id || '__nocto__';
      if (!onusByCto[cid]) onusByCto[cid] = [];
      onusByCto[cid].push({id:uid, obj:u});
    });

    var clientBySerial = {};
    Object.entries(clients).forEach(function(e) {
      var c = e[1];
      if (c && c.onu_serial) clientBySerial[c.onu_serial] = c;
    });

    function badge(status) {
      var col = status === 'online' ? '#16a34a' : status === 'degraded' ? '#d97706' : '#dc2626';
      return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + col + ';margin-right:4px"></span>';
    }

    function renderChildren(parentId, depth) {
      var children = (byParent[parentId] || []).sort(function(a,b){ return (a.obj.nome||a.id).localeCompare(b.obj.nome||b.id); });
      if (children.length === 0) return '';
      var pad = depth * 20;
      return children.map(function(c) {
        var id = c.id, obj = c.obj;
        var tipo = obj.type;
        var color = tipo === 'dgo' ? '#3b82f6' : tipo === 'splitter' ? (obj.grau === 1 ? '#7c3aed' : obj.grau === 2 ? '#a855f7' : '#c084fc') : tipo === 'cto' ? '#d97706' : '#64748b';
        var icon  = tipo === 'dgo' ? 'fa-network-wired' : tipo === 'splitter' ? 'fa-code-branch' : tipo === 'cto' ? 'fa-box' : 'fa-circle';
        var label = obj.nome || id;
        var info  = tipo === 'dgo' ? ('PON ' + (obj.pon_port||'—')) : tipo === 'splitter' ? ('Grau ' + obj.grau + ' · ' + (obj.ratio||'')) : tipo === 'cto' ? ((obj.used_ports||0) + '/' + (obj.total_ports||8) + ' portas') : '';

        var onusHtml = '';
        if (tipo === 'cto') {
          var ctOnus = onusByCto[id] || [];
          onusHtml = ctOnus.map(function(u) {
            var cli = u.obj.serial_number ? (clientBySerial[u.obj.serial_number] || null) : null;
            var st  = u.obj.status || 'offline';
            return '<div style="padding:3px 0 3px ' + (pad+40) + 'px;font-size:.73rem;border-left:2px solid #e5e7eb;margin-left:' + (pad+28) + 'px;padding-left:12px">'
              + badge(st)
              + '<span style="color:#374151;font-family:monospace">' + (u.obj.serial_number||u.id) + '</span>'
              + ' <span style="color:#64748b">' + (u.obj.model||'') + '</span>'
              + (cli ? ' — <b style="color:#1e293b">' + cli.name + '</b> <span style="color:var(--muted);font-size:.7rem">' + (cli.plan_name||'') + '</span>' : '')
              + (u.obj.rx_power != null ? ' <span style="color:' + (u.obj.rx_power > -25 ? '#16a34a' : u.obj.rx_power > -28 ? '#d97706' : '#dc2626') + ';font-size:.7rem">(' + u.obj.rx_power + ' dBm)</span>' : '')
              + '</div>';
          }).join('');
          if (ctOnus.length === 0) onusHtml = '<div style="padding-left:' + (pad+52) + 'px;font-size:.72rem;color:#94a3b8;font-style:italic">Sem ONUs</div>';
        }

        return '<div style="padding:5px 0 2px ' + pad + 'px" class="topo-row" onclick="this.nextElementSibling&&(this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\')">'
          + '<span style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:4px 10px;font-size:.78rem;box-shadow:0 1px 2px rgba(0,0,0,.04)">'
          + '<i class="fas ' + icon + '" style="color:' + color + ';width:14px"></i>'
          + '<b style="color:#1e293b">' + label + '</b>'
          + (info ? '<span style="color:#64748b;font-size:.7rem">' + info + '</span>' : '')
          + '</span></div>'
          + '<div>' + onusHtml + renderChildren(id, depth + 1) + '</div>';
      }).join('');
    }

    var oltEntries = Object.entries(olts);
    if (oltEntries.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)"><i class="fas fa-info-circle"></i> Nenhuma OLT cadastrada. Use <b>Integração MK → Simular Topologia Completa</b>.</div>';
      return;
    }

    var html = oltEntries.map(function(e) {
      var oid = e[0], o = e[1];
      var status = o.is_active ? 'online' : 'offline';
      var onusOlt = Object.values(onus).filter(function(u){ return u && u.olt_id === oid; });
      var onOnline = onusOlt.filter(function(u){ return u.status === 'online'; }).length;
      return '<div style="margin-bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px">'
        + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
        + '<div style="width:32px;height:32px;background:' + (o.is_active ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : '#94a3b8') + ';border-radius:8px;display:flex;align-items:center;justify-content:center">'
        + '<i class="fas fa-server" style="color:#fff;font-size:.85rem"></i></div>'
        + '<div><b style="color:#1e293b;font-size:.9rem">' + (o.name||oid) + '</b>'
        + '<div style="font-size:.73rem;color:#64748b">' + (o.model||'OLT') + ' · IP: ' + (o.ip_address||'—') + ' · ' + (o.total_pon_ports||0) + ' PONs</div></div>'
        + badge(status) + '<span style="font-size:.75rem;color:#64748b">' + onOnline + '/' + onusOlt.length + ' ONUs online</span>'
        + '</div>'
        + renderChildren(oid, 0)
        + ((!byParent[oid] || byParent[oid].length === 0) ? '<div style="padding-left:8px;font-size:.78rem;color:#94a3b8;font-style:italic">Sem DGOs vinculados a esta OLT</div>' : '')
        + '</div>';
    }).join('');

    el.innerHTML = html;
  }).catch(function(e) {
    el.innerHTML = '<div style="color:#dc2626;padding:16px">Erro ao carregar topologia: ' + e.message + '</div>';
  });
};

// ── Context Menu Engine ──────────────────────────────────────────────

window._sdrCtxReg = {};

window.sdrCtxMenu = function(e, items) {
  window.sdrCtxClose();
  if (e && e.preventDefault) e.preventDefault();
  if (e && e.stopPropagation) e.stopPropagation();

  var x = (e && e.clientX) ? e.clientX : (e && e.target ? e.target.getBoundingClientRect().right : 100);
  var y = (e && e.clientY) ? e.clientY : (e && e.target ? e.target.getBoundingClientRect().bottom : 100);
  var sid = 'ctx_' + Date.now();
  window._sdrCtxReg[sid] = items;

  var html = '<div id="sdr-ctx-menu">';
  items.forEach(function(item, i) {
    if (item === '---') { html += '<div class="sdr-ctx-sep"></div>'; return; }
    if (item._label) { html += '<div class="sdr-ctx-label">' + item._label + '</div>'; return; }
    var col   = item.color || '#1e293b';
    var icCol = item.color || '#64748b';
    html += '<div class="sdr-ctx-item" style="color:' + col + '" '
      + 'onclick="(window._sdrCtxReg[\'' + sid + '\'][' + i + '].fn)();window.sdrCtxClose()">'
      + '<i class="fas ' + (item.icon || 'fa-circle') + '" style="color:' + icCol + '"></i>'
      + item.label + '</div>';
  });
  html += '</div>';

  var wrap = document.createElement('div');
  wrap.id = 'sdr-ctx-wrap';
  wrap.style.cssText = 'left:' + x + 'px;top:' + y + 'px';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);

  var rect = wrap.getBoundingClientRect();
  if (rect.right  > window.innerWidth)  wrap.style.left = (x - rect.width)  + 'px';
  if (rect.bottom > window.innerHeight) wrap.style.top  = (y - rect.height) + 'px';

  setTimeout(function() {
    function away(ev) {
      if (!document.getElementById('sdr-ctx-wrap') || !document.getElementById('sdr-ctx-wrap').contains(ev.target)) {
        window.sdrCtxClose(); cleanup();
      }
    }
    function esc(ev) { if (ev.key === 'Escape') { window.sdrCtxClose(); cleanup(); } }
    function cleanup() { document.removeEventListener('click', away); document.removeEventListener('keydown', esc); }
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
  }, 60);
};

window.sdrCtxClose = function() {
  var w = document.getElementById('sdr-ctx-wrap');
  if (w) w.remove();
};

// ── Mover marcador no mapa ───────────────────────────────────────────

var _sdrMoveState = null;

window.sdrMoveMarker = function(id, collection) {
  window.sdrMoveCancelMarker();

  var item, lat, lng, label;
  if (collection === 'infrastructure') {
    item = (window.sdrInfraCache || {})[id] || {};
    lat  = item.lat; lng = item.lng;
    label = item.name || item.code || id;
  } else if (collection === 'cliente') {
    item = (window.sdrClientesCache || {})[id] || {};
    lat  = item.lat; lng = item.lng;
    label = item.name || id;
  }
  if (!lat || !lng) { window.toast('Item sem coordenadas — use Editar para definir posição.', 'error'); return; }

  if (typeof window.showPage === 'function') window.showPage('mapa');

  setTimeout(function() {
    if (window.sdrMap) window.sdrMap.setView([lat, lng], Math.max(window.sdrMap.getZoom(), 17));

    var moveIcon = window.L.divIcon({
      className: '',
      html: '<div style="width:32px;height:32px;background:#f97316;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);cursor:grab">'
          + '<i class="fas fa-arrows-alt" style="color:#fff;font-size:.75rem"></i></div>',
      iconSize:   [32, 32],
      iconAnchor: [16, 16]
    });

    var dragMarker = window.L.marker([lat, lng], { draggable: true, icon: moveIcon, zIndexOffset: 9999 });
    dragMarker.addTo(window.sdrMap);
    dragMarker.bindTooltip('Arraste para reposicionar: ' + label, { permanent: false, direction: 'top', offset: [0, -18] });

    _sdrMoveState = { id: id, collection: collection, marker: dragMarker, origLat: lat, origLng: lng };

    var existing = document.getElementById('sdr-move-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'sdr-move-banner';
    banner.style.cssText = 'position:absolute;top:68px;left:50%;transform:translateX(-50%);z-index:9999;'
      + 'background:#1e293b;border:1px solid #f97316;border-radius:10px;'
      + 'padding:9px 16px;color:#f1f5f9;font-size:.82rem;display:flex;align-items:center;'
      + 'gap:12px;box-shadow:0 4px 20px rgba(0,0,0,.45);white-space:nowrap';
    banner.innerHTML = '<i class="fas fa-arrows-alt" style="color:#f97316"></i>'
      + '<span>Arraste <b>' + label + '</b> para nova posição</span>'
      + '<button onclick="sdrMoveConfirmMarker()" style="padding:5px 14px;background:#f97316;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:700"><i class="fas fa-check"></i> Confirmar</button>'
      + '<button onclick="sdrMoveCancelMarker()" style="padding:5px 10px;background:#334155;color:#cbd5e1;border:none;border-radius:6px;cursor:pointer;font-size:.8rem">Cancelar</button>';
    var mapContainer = document.getElementById('sdr-map');
    if (mapContainer) mapContainer.appendChild(banner);
  }, 300);
};

window.sdrMoveConfirmMarker = function() {
  if (!_sdrMoveState) return;
  var s   = _sdrMoveState;
  var pos = s.marker.getLatLng();
  var ref, cache;
  if (s.collection === 'infrastructure') {
    ref   = window.sdrRef('infrastructure/' + s.id);
    cache = window.sdrInfraCache;
  } else {
    ref   = window.sdrRef('clients/' + s.id);
    cache = window.sdrClientesCache;
  }
  ref.update({ lat: pos.lat, lng: pos.lng, updated_at: new Date().toISOString() })
    .then(function() {
      if (cache && cache[s.id]) { cache[s.id].lat = pos.lat; cache[s.id].lng = pos.lng; }
      window.toast('Posição salva com sucesso.', 'success');
      window.sdrMoveCancelMarker();
      if (typeof window.sdrMapRenderInfra   === 'function') window.sdrMapRenderInfra();
      if (typeof window.sdrMapRenderClientes === 'function') window.sdrMapRenderClientes();
    })
    .catch(function(e) { window.toast('Erro ao salvar: ' + e.message, 'error'); });
};

window.sdrMoveCancelMarker = function() {
  if (_sdrMoveState) {
    try { window.sdrMap && window.sdrMap.removeLayer(_sdrMoveState.marker); } catch(e){}
    _sdrMoveState = null;
  }
  var b = document.getElementById('sdr-move-banner');
  if (b) b.remove();
};

// ── Helpers de contexto por tipo ─────────────────────────────────────

window._sdrCtxOlt = function(id) {
  return [
    {_label: 'OLT'},
    {icon:'fa-th',           label:'Ver Chassis',   fn:function(){ window.showPage&&window.showPage('olts'); setTimeout(function(){ window.sdrOltTabSwitch(id); }, 200); }},
    {icon:'fa-edit',         label:'Editar',        fn:function(){ window.sdrOltAddModal(id); }},
    {icon:'fa-sitemap',      label:'Ver Topologia', fn:function(){ window.showPage&&window.showPage('olts'); setTimeout(function(){ var p=document.getElementById('topologia-tree'); if(p&&p.style.display==='none') window.sdrTopologiaToggle(); else window.sdrTopologiaRender(); },200); }},
    '---',
    {icon:'fa-router',       label:'Nova ONU',      fn:function(){ window.sdrOnuAdd(); }},
    {icon:'fa-network-wired',label:'Novo DGO',      fn:function(){ window.sdrDgoCriarModal(id); }},
    '---',
    {icon:'fa-trash',        label:'Excluir OLT',   color:'#dc2626', fn:function(){ window.sdrOltDelete(id); }}
  ];
};

window._sdrCtxOnu = function(id) {
  return [
    {_label: 'ONU'},
    {icon:'fa-eye',  label:'Ver Detalhes', fn:function(){ window.sdrOpenOnuPanel(id); }},
    {icon:'fa-edit', label:'Editar',       fn:function(){ window.sdrOnuEdit(id); }},
    '---',
    {icon:'fa-trash',label:'Excluir ONU',  color:'#dc2626', fn:function(){ window.sdrOnuDelete&&window.sdrOnuDelete(id); }}
  ];
};

window._sdrCtxCliente = function(id) {
  return [
    {_label: 'Cliente'},
    {icon:'fa-eye',        label:'Ver Detalhes',   fn:function(){ window.sdrOpenClientePanel(id, (window.sdrClientesCache||{})[id]); }},
    {icon:'fa-edit',       label:'Editar',         fn:function(){ window.sdrClienteEdit&&window.sdrClienteEdit(id); }},
    {icon:'fa-arrows-alt', label:'Mover',          fn:function(){ window.sdrMoveMarker(id, 'cliente'); }},
    {icon:'fa-map-pin',    label:'Ver no Mapa',    fn:function(){ window.sdrMapFlyToClient(id); }},
    {icon:'fa-ticket-alt', label:'Abrir Chamado',  fn:function(){ window.sdrTicketAdd&&window.sdrTicketAdd(id); }},
    '---',
    {icon:'fa-trash',      label:'Excluir Cliente',color:'#dc2626', fn:function(){ window.sdrClienteDelete&&window.sdrClienteDelete(id); }}
  ];
};

window._sdrCtxInfra = function(id) {
  return [
    {_label: 'Infraestrutura'},
    {icon:'fa-eye',           label:'Ver Detalhes', fn:function(){ window.sdrOpenInfraPanel(id, (window.sdrInfraCache||{})[id]); }},
    {icon:'fa-edit',          label:'Editar',       fn:function(){ window.sdrInfraEdit(id); }},
    {icon:'fa-arrows-alt',    label:'Mover',        fn:function(){ window.sdrMoveMarker(id, 'infrastructure'); }},
    {icon:'fa-map-marker-alt',label:'Ir ao Mapa',   fn:function(){ var it=(window.sdrInfraCache||{})[id]; if(it&&it.lat){ window.showPage&&window.showPage('mapa'); setTimeout(function(){ window.sdrMapFlyTo(it.lat,it.lng); },300); } }},
    '---',
    {icon:'fa-trash',         label:'Excluir',      color:'#dc2626', fn:function(){ window.sdrInfraDelete&&window.sdrInfraDelete(id); }}
  ];
};

// ── Filtro de clientes ───────────────────────────────────────────────

window.sdrClientesFiltrar = function(q) {
  q = (q || '').toLowerCase().trim();
  var rows = document.querySelectorAll('#clientes-lista tbody tr');
  if (rows.length === 0) { window.sdrClientesRender && window.sdrClientesRender(); return; }
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    row.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
};

// ── Export CSV ──────────────────────────────────────────────────────

window.sdrExportClientesCSV = function() {
  var data = Object.entries(window.sdrClientesCache || {});
  if (!data.length) { if (typeof window.toast === 'function') window.toast('Sem clientes para exportar', 'warn'); return; }
  var header = ['Nome','CPF/CNPJ','Telefone','Email','Endereço','Plano','Velocidade','Preço','Financeiro','ONU Serial','Status ONU','Sinal Rx','CTO'];
  var rows = data.map(function(e) {
    var c = e[1];
    return [
      c.name||'', c.cpf_cnpj||'', c.phone||'', c.email||'', c.address||'',
      c.plan_name||'', (c.plan_speed_down ? c.plan_speed_down+'M' : ''), (c.plan_price ? 'R$ '+parseFloat(c.plan_price).toFixed(2) : ''),
      c.financial_status||'adimplente', c.onu_serial||'', c.onu_status||'', (c.rx_power!=null ? c.rx_power+' dBm' : ''), c.cto_nome||c.cto_id||''
    ].map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(',');
  });
  var csv  = [header.join(',')].concat(rows).join('\n');
  var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'clientes_sdr_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click(); URL.revokeObjectURL(url);
  if (typeof window.toast === 'function') window.toast('CSV exportado: '+data.length+' clientes', 'success');
};

window.sdrExportOnusCSV = function() {
  var data = Object.entries(window.sdrOnusCache || {});
  if (!data.length) { if (typeof window.toast === 'function') window.toast('Sem ONUs para exportar', 'warn'); return; }
  var header = ['Serial','Modelo','Status','Sinal Rx','Sinal Tx','IP','OLT','PON','CTO','Cliente'];
  var cbs = {};
  Object.entries(window.sdrClientesCache || {}).forEach(function(e) {
    if (e[1] && e[1].onu_serial) cbs[e[1].onu_serial.toLowerCase()] = e[1].name;
  });
  var rows = data.map(function(e) {
    var u = e[1];
    var olt = (window.sdrOltsCache || {})[u.olt_id] || {};
    return [
      u.serial_number||'', u.model||'', u.status||'', (u.rx_power!=null?u.rx_power:''), (u.tx_power!=null?u.tx_power:''),
      u.ip_address||'', olt.name||u.olt_id||'', u.pon_port||'', u.cto_nome||u.cto_id||'',
      (u.serial_number ? cbs[u.serial_number.toLowerCase()]||'' : '')
    ].map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(',');
  });
  var csv  = [header.join(',')].concat(rows).join('\n');
  var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'onus_sdr_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click(); URL.revokeObjectURL(url);
  if (typeof window.toast === 'function') window.toast('CSV exportado: '+data.length+' ONUs', 'success');
};

// ── Injetar botões de export nas páginas ────────────────────────────

(function _sdrInjectExportBtns() {
  var _orig8ShowPage = window.showPage;
  if (typeof _orig8ShowPage === 'function' && !_orig8ShowPage._sdr8Patched) {
    var _orig8 = _orig8ShowPage;
    window.showPage = function(name) {
      _orig8(name);
      setTimeout(function() {
        if (name === 'clientes') {
          var hdr = document.querySelector('#page-clientes .flex');
          if (hdr && !document.getElementById('btn-exp-clients')) {
            var btn = document.createElement('button');
            btn.id = 'btn-exp-clients';
            btn.className = 'btn-map';
            btn.style.cssText = 'padding:6px 14px;font-size:.8rem';
            btn.innerHTML = '<i class="fas fa-file-csv"></i> Exportar CSV';
            btn.onclick = window.sdrExportClientesCSV;
            hdr.appendChild(btn);
          }
        }
        if (name === 'onus') {
          var hdr2 = document.querySelector('#page-onus .flex');
          if (hdr2 && !document.getElementById('btn-exp-onus')) {
            var btn2 = document.createElement('button');
            btn2.id = 'btn-exp-onus';
            btn2.className = 'btn-map';
            btn2.style.cssText = 'padding:6px 14px;font-size:.8rem';
            btn2.innerHTML = '<i class="fas fa-file-csv"></i> Exportar CSV';
            btn2.onclick = window.sdrExportOnusCSV;
            hdr2.appendChild(btn2);
          }
        }
      }, 500);
    };
    window.showPage._sdrPatched = window.showPage._sdr8Patched = true;
  }
})();

console.log('[SDR Bundle] ui/index.js — topologia + ctx-menu + move-marker + csv-export OK');
