/**
 * SDR — Fase 17: MK Integração (Mikrotik/ISP Manager via Firebase Functions proxy)
 * Migrado de sdr-module.js linhas 4583-4985 + helpers 5118-5163
 *
 * Expõe via window:
 *   sdrMkConfigRender, sdrMkSaveConfig, sdrMkTestarConexao, sdrMkSyncAll,
 *   sdrMkGetConexao, sdrMkAbrirOS, sdrMkDesbloquear,
 *   sdrMkDemoTopologia, sdrMkDemoOlts, sdrMkDemoOnus, sdrMkDemoClientes
 *
 * Deps (via window em runtime):
 *   window.sdrRef, window.toast
 */

// ── URL base das Firebase Functions (proxy MK) ──────────────────────
var _SDR_FN_BASE = 'https://us-central1-solucaoderua.cloudfunctions.net';

// ── Helpers privados ao módulo ───────────────────────────────────────

function _sdrMkLog(msg, type) {
  var el = document.getElementById('mk-log');
  if (!el) return;
  var color = type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : type === 'ok' ? '#10b981' : '#475569';
  var ts = new Date().toLocaleTimeString('pt-BR');
  var line = '<div><span style="color:#94a3b8">[' + ts + ']</span> <span style="color:' + color + '">' + msg + '</span></div>';
  el.innerHTML = el.innerHTML.replace('<span style="color:#94a3b8">Aguardando atividade...</span>', '');
  el.innerHTML += line;
  el.scrollTop = el.scrollHeight;
}

function _sdrMkUpdateBadge(enabled) {
  var badge = document.getElementById('mk-status-badge');
  if (!badge) return;
  badge.style.display = 'inline-block';
  if (enabled) {
    badge.style.background = '#d1fae5'; badge.style.color = '#065f46';
    badge.textContent = '● Integração Ativa';
  } else {
    badge.style.background = '#fee2e2'; badge.style.color = '#991b1b';
    badge.textContent = '○ Integração Inativa';
  }
}

function _sdrMkRefreshCounts() {
  window.sdrRef('olt_connections').once('value').then(function(s) {
    var el = document.getElementById('mk-count-olts');
    if (el) el.textContent = Object.keys(s.val()||{}).length || '0';
  });
  window.sdrRef('infrastructure').once('value').then(function(s) {
    var infra = s.val() || {};
    var ctoCount  = Object.values(infra).filter(function(i){ return i && i.type === 'cto'; }).length;
    var dgoCount  = Object.values(infra).filter(function(i){ return i && i.type === 'dgo'; }).length;
    var elCto = document.getElementById('mk-count-ctos');
    var elPop = document.getElementById('mk-count-pops');
    if (elCto) elCto.textContent = ctoCount || '0';
    if (elPop) elPop.textContent = dgoCount || '0';
  });
  window.sdrRef('clients').once('value').then(function(s) {
    var el = document.getElementById('mk-count-clientes');
    if (el) el.textContent = Object.keys(s.val()||{}).length || '0';
  });
  window.sdrRef('mk_config/updated_at').once('value').then(function(s) {
    var el = document.getElementById('mk-last-sync');
    if (el && s.val()) el.textContent = new Date(s.val()).toLocaleString('pt-BR');
  });
}

// ── Funções públicas ─────────────────────────────────────────────────

window.sdrMkConfigRender = function() {
  window.sdrRef('mk_config').once('value').then(function(snap) {
    var cfg = snap.val() || {};
    var su = document.getElementById('mk-server-url');
    var tk = document.getElementById('mk-token');
    var pw = document.getElementById('mk-password');
    var cs = document.getElementById('mk-cd-servico');
    var en = document.getElementById('mk-enabled');
    if (su) su.value = cfg.server_url || '';
    if (tk) tk.value = cfg.token || '';
    if (pw) pw.value = cfg.password || '';
    if (cs) cs.value = cfg.cd_servico || '9999';
    if (en) en.checked = !!cfg.enabled;
    _sdrMkUpdateBadge(cfg.enabled);
    _sdrMkLog('Config carregada do Firebase.');
    _sdrMkRefreshCounts();
  }).catch(function(e) {
    _sdrMkLog('Erro ao carregar config: ' + e.message, 'error');
  });
};

window.sdrMkSaveConfig = function() {
  var cfg = {
    server_url: (document.getElementById('mk-server-url')||{}).value || '',
    token:      (document.getElementById('mk-token')||{}).value || '',
    password:   (document.getElementById('mk-password')||{}).value || '',
    cd_servico: (document.getElementById('mk-cd-servico')||{}).value || '9999',
    enabled:    !!(document.getElementById('mk-enabled')||{}).checked,
    updated_at: new Date().toISOString()
  };
  window.sdrRef('mk_config').set(cfg).then(function() {
    _sdrMkLog('✅ Configuração salva com sucesso.', 'ok');
    _sdrMkUpdateBadge(cfg.enabled);
    if (typeof Swal !== 'undefined') {
      Swal.fire({icon:'success', title:'Salvo!', text:'Configuração MK atualizada.', timer:1800, showConfirmButton:false});
    }
  }).catch(function(e) {
    _sdrMkLog('❌ Erro ao salvar: ' + e.message, 'error');
  });
};

window.sdrMkTestarConexao = function() {
  var url   = (document.getElementById('mk-server-url')||{}).value || '';
  var token = (document.getElementById('mk-token')||{}).value || '';
  var pass  = (document.getElementById('mk-password')||{}).value || '';
  var res   = document.getElementById('mk-test-result');

  if (!url || !token || !pass) {
    if (res) res.innerHTML = '<span style="color:#ef4444">⚠️ Preencha servidor, token e contra-senha antes de testar.</span>';
    return;
  }

  if (res) res.innerHTML = '<span style="color:#3b82f6"><i class="fas fa-spinner fa-spin"></i> Salvando config e testando via proxy...</span>';
  _sdrMkLog('⏳ Testando conexão via Firebase Functions proxy...');

  window.sdrRef('mk_config').update({
    ip_porta: url,
    token:    token,
    password: pass,
    enabled:  true
  }).then(function() {
    var fnUrl = _SDR_FN_BASE + '/sdrMkTestar?tenant=default_tenant';
    return fetch(fnUrl, { signal: AbortSignal.timeout(15000) });
  })
  .then(function(r) { return r.json(); })
  .then(function(j) {
    if (j.ok && j.data && j.data.sucesso) {
      var ms = j.data.ms || 0;
      if (res) res.innerHTML = '<span style="color:#10b981">✅ Conexão OK via proxy! Latência: ' + ms + 'ms</span>';
      _sdrMkLog('✅ Autenticação MK OK via proxy. Latência: ' + ms + 'ms', 'ok');
    } else if (j.ok && j.data) {
      var raw = j.data.resposta_raw || '';
      if (res) res.innerHTML = '<span style="color:#f59e0b">⚠️ Proxy chegou ao MK mas credenciais inválidas. Resposta: ' + raw.substring(0,120) + '</span>';
      _sdrMkLog('⚠️ Proxy OK, MK recusou credenciais: ' + raw.substring(0,200), 'warn');
    } else {
      if (res) res.innerHTML = '<span style="color:#ef4444">❌ ' + (j.error || 'Erro desconhecido') + '</span>';
      _sdrMkLog('❌ Erro no proxy: ' + (j.error || JSON.stringify(j)), 'error');
    }
  })
  .catch(function(e) {
    var msg = e.name === 'TimeoutError' ? 'Timeout (proxy não respondeu em 15s)'
      : (e.message.includes('Failed to fetch') ? 'Firebase Functions não deployadas ainda — rode: firebase deploy --only functions' : e.message);
    if (res) res.innerHTML = '<span style="color:#ef4444">❌ ' + msg + '</span>';
    _sdrMkLog('❌ ' + msg, 'error');
  });
};

window.sdrMkSyncAll = function() {
  _sdrMkLog('⏳ Iniciando sincronização completa via proxy...');
  var btn = document.querySelector('[onclick="sdrMkSyncAll()"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...'; }

  window.sdrRef('mk_config').once('value').then(function(snap) {
    var cfg = snap.val() || {};
    if (!cfg.enabled || !cfg.ip_porta) {
      _sdrMkLog('⚠️ Integração desativada ou servidor não configurado. Configure e teste a conexão primeiro.', 'warn');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Agora'; }
      return;
    }

    var urlClientes = _SDR_FN_BASE + '/sdrMkSyncClientes?tenant=default_tenant';
    var urlInfra    = _SDR_FN_BASE + '/sdrMkSyncInfra?tenant=default_tenant';

    _sdrMkLog('🔄 Sincronizando clientes e infraestrutura...');

    Promise.all([
      fetch(urlClientes, { signal: AbortSignal.timeout(60000) }).then(function(r){ return r.json(); }),
      fetch(urlInfra,    { signal: AbortSignal.timeout(60000) }).then(function(r){ return r.json(); })
    ]).then(function(results) {
      var rCli  = results[0];
      var rInfra = results[1];

      if (rCli.ok && rCli.data) {
        _sdrMkLog('✅ Clientes: ' + (rCli.data.sincronizados || 0) + ' sincronizados.', 'ok');
        var kc = document.getElementById('mk-count-clients');
        if (kc) kc.textContent = rCli.data.sincronizados || '0';
      } else {
        _sdrMkLog('⚠️ Clientes: ' + (rCli.error || 'sem dados'), 'warn');
      }

      if (rInfra.ok && rInfra.data) {
        _sdrMkLog('✅ Infra: ' + (rInfra.data.olts || 0) + ' OLTs, ' + (rInfra.data.ctos || 0) + ' CTOs sincronizados.', 'ok');
        var ko = document.getElementById('mk-count-olts');
        if (ko) ko.textContent = rInfra.data.olts || '0';
      } else {
        _sdrMkLog('⚠️ Infraestrutura: ' + (rInfra.error || 'sem dados'), 'warn');
      }

      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Agora'; }
      var agora = new Date().toLocaleTimeString('pt-BR');
      _sdrMkLog('✅ Sync concluído às ' + agora + '.', 'ok');
    })
    .catch(function(e) {
      var msg = e.message.includes('Failed to fetch')
        ? 'Firebase Functions não deployadas — rode: firebase deploy --only functions'
        : e.message;
      _sdrMkLog('❌ Erro no sync: ' + msg, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar Agora'; }
    });
  });
};

window.sdrMkGetConexao = function(cdCliente, callback) {
  var url = _SDR_FN_BASE + '/sdrMkConexoes?tenant=default_tenant&cd_cliente=' + encodeURIComponent(cdCliente);
  fetch(url, { signal: AbortSignal.timeout(10000) })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (typeof callback === 'function') callback(j.ok ? j.data : null, j.ok ? null : j.error);
    })
    .catch(function(e) {
      if (typeof callback === 'function') callback(null, e.message);
    });
};

window.sdrMkAbrirOS = function(params, callback) {
  var url = _SDR_FN_BASE + '/sdrMkAbrirOS?tenant=default_tenant&'
    + Object.entries(params).map(function(e){ return encodeURIComponent(e[0])+'='+encodeURIComponent(e[1]); }).join('&');
  fetch(url, { signal: AbortSignal.timeout(10000) })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (typeof callback === 'function') callback(j.ok ? j.data : null, j.ok ? null : j.error);
    })
    .catch(function(e) {
      if (typeof callback === 'function') callback(null, e.message);
    });
};

window.sdrMkDesbloquear = function(cdConexao, callback) {
  var url = _SDR_FN_BASE + '/sdrMkDesbloquear?tenant=default_tenant&cd_conexao=' + encodeURIComponent(cdConexao);
  fetch(url, { signal: AbortSignal.timeout(10000) })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (typeof callback === 'function') callback(j.ok ? j.data : null, j.ok ? null : j.error);
    })
    .catch(function(e) {
      if (typeof callback === 'function') callback(null, e.message);
    });
};

window.sdrMkDemoTopologia = function() {
  _sdrMkLog('⏳ Gerando topologia FTTH completa...', 'ok');
  var saves = [];
  var ts = new Date().toISOString();

  var olts = [
    {id:'olt-demo-01', name:'OLT-CENTRAL-01', model:'ZTE C320',       ip_address:'10.0.0.1', total_pon_ports:8, snmp_community:'public', is_active:true,  lat:-20.316, lng:-40.338},
    {id:'olt-demo-02', name:'OLT-FILIAL-01',  model:'Huawei MA5608T', ip_address:'10.0.0.2', total_pon_ports:4, snmp_community:'public', is_active:true,  lat:-20.320, lng:-40.342},
  ];
  olts.forEach(function(o) {
    var id = o.id; delete o.id;
    saves.push(window.sdrRef('olt_connections/' + id).set(Object.assign({}, o, {source:'demo', created_at:ts})));
    o.id = id;
  });

  var dgos = [
    {id:'dgo-demo-01', type:'dgo', nome:'DGO-CENTRAL-01', olt_id:'olt-demo-01', pon_port:'1/0/1', capacidade_fibras:24, endereco:'Rua das Flores, 100'},
    {id:'dgo-demo-02', type:'dgo', nome:'DGO-FILIAL-01',  olt_id:'olt-demo-02', pon_port:'1/0/1', capacidade_fibras:12, endereco:'Av. Principal, 500'},
  ];
  dgos.forEach(function(d) {
    var id = d.id; delete d.id;
    saves.push(window.sdrRef('infrastructure/' + id).set(Object.assign({}, d, {source:'demo', created_at:ts})));
    d.id = id;
  });

  var sp1list = [
    {id:'sp1-demo-01', type:'splitter', grau:1, ratio:'1:8', nome:'SP1-CENTRAL-01', parent_id:'dgo-demo-01', parent_type:'dgo', pon_port:'1/0/1'},
    {id:'sp1-demo-02', type:'splitter', grau:1, ratio:'1:8', nome:'SP1-CENTRAL-02', parent_id:'dgo-demo-01', parent_type:'dgo', pon_port:'1/0/2'},
    {id:'sp1-demo-03', type:'splitter', grau:1, ratio:'1:8', nome:'SP1-FILIAL-01',  parent_id:'dgo-demo-02', parent_type:'dgo', pon_port:'1/0/1'},
  ];
  sp1list.forEach(function(s) {
    var id = s.id; delete s.id;
    saves.push(window.sdrRef('infrastructure/' + id).set(Object.assign({}, s, {source:'demo', created_at:ts})));
    s.id = id;
  });

  var sp2list = [
    {id:'sp2-demo-01', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-C01-A', parent_id:'sp1-demo-01', parent_type:'splitter'},
    {id:'sp2-demo-02', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-C01-B', parent_id:'sp1-demo-01', parent_type:'splitter'},
    {id:'sp2-demo-03', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-C02-A', parent_id:'sp1-demo-02', parent_type:'splitter'},
    {id:'sp2-demo-04', type:'splitter', grau:2, ratio:'1:4', nome:'SP2-F01-A', parent_id:'sp1-demo-03', parent_type:'splitter'},
  ];
  sp2list.forEach(function(s) {
    var id = s.id; delete s.id;
    saves.push(window.sdrRef('infrastructure/' + id).set(Object.assign({}, s, {source:'demo', created_at:ts})));
    s.id = id;
  });

  var sp3list = [
    {id:'sp3-demo-01', type:'splitter', grau:3, ratio:'1:2', nome:'SP3-C01-A1', parent_id:'sp2-demo-01', parent_type:'splitter'},
    {id:'sp3-demo-02', type:'splitter', grau:3, ratio:'1:2', nome:'SP3-C01-A2', parent_id:'sp2-demo-01', parent_type:'splitter'},
  ];
  sp3list.forEach(function(s) {
    var id = s.id; delete s.id;
    saves.push(window.sdrRef('infrastructure/' + id).set(Object.assign({}, s, {source:'demo', created_at:ts})));
    s.id = id;
  });

  var ctosDefs = [
    {id:'cto-demo-01', nome:'CTO-01', parent_id:'sp3-demo-01', total_ports:8, used_ports:4, endereco:'Rua A, poste 10', lat:-20.316, lng:-40.337},
    {id:'cto-demo-02', nome:'CTO-02', parent_id:'sp3-demo-02', total_ports:8, used_ports:3, endereco:'Rua A, poste 15', lat:-20.317, lng:-40.336},
    {id:'cto-demo-03', nome:'CTO-03', parent_id:'sp2-demo-02', total_ports:8, used_ports:6, endereco:'Rua B, poste 5',  lat:-20.318, lng:-40.339},
    {id:'cto-demo-04', nome:'CTO-04', parent_id:'sp2-demo-03', total_ports:8, used_ports:5, endereco:'Rua C, poste 8',  lat:-20.319, lng:-40.340},
    {id:'cto-demo-05', nome:'CTO-05', parent_id:'sp2-demo-04', total_ports:8, used_ports:4, endereco:'Av. Principal, poste 20', lat:-20.321, lng:-40.341},
  ];
  ctosDefs.forEach(function(c) {
    var id = c.id; delete c.id;
    saves.push(window.sdrRef('infrastructure/' + id).set(Object.assign({}, c, {type:'cto', source:'demo', created_at:ts})));
    c.id = id;
  });

  var modelos = ['ZTE F660','Huawei HG8245H','Intelbras 110A','ZTE F620','Multilaser RE160'];
  var nomes   = ['Ana Silva','Bruno Souza','Carlos Lima','Diana Costa','Eduardo Pereira',
                 'Fernanda Oliveira','Gabriel Santos','Helena Rocha','Igor Martins','Julia Ferreira',
                 'Kleber Matos','Larissa Dias','Marcos Viana','Nathalia Cruz','Otto Leal',
                 'Patricia Mendes','Rafael Gomes','Sandra Lima','Thiago Costa','Valeria Reis'];
  var planos = ['50MB','100MB','200MB','500MB'];

  var onuIdx = 0;
  ctosDefs.forEach(function(cto, ci) {
    var oltId = (ci < 2) ? 'olt-demo-01' : (ci < 4) ? 'olt-demo-01' : 'olt-demo-02';
    for (var p = 0; p < 4; p++) {
      onuIdx++;
      var serial = 'ZTEG' + String(onuIdx * 111111).padStart(8,'0');
      var onuId  = 'onu-demo-' + String(onuIdx).padStart(2,'0');
      var cliId  = 'cli-demo-' + String(onuIdx).padStart(2,'0');
      var nome   = nomes[(onuIdx - 1) % nomes.length];
      var status = (onuIdx % 6 === 0) ? 'offline' : (onuIdx % 8 === 0) ? 'degraded' : 'online';
      var rxPow  = status === 'offline' ? null : -(Math.floor(Math.random()*12) + 14);

      saves.push(window.sdrRef('onus/' + onuId).set({
        serial_number: serial,
        model:         modelos[onuIdx % modelos.length],
        status:        status,
        olt_id:        oltId,
        cto_id:        cto.id,
        cto_nome:      cto.nome,
        rx_power:      rxPow,
        ip_address:    '192.168.' + ci + '.' + (100 + p),
        pon_port:      '1/0/' + (ci + 1),
        source:'demo', created_at:ts
      }));

      saves.push(window.sdrRef('clients/' + cliId).set({
        name:           nome,
        onu_serial:     serial,
        onu_status:     status,
        rx_power:       rxPow,
        plan_name:      planos[onuIdx % planos.length],
        financial_status: (onuIdx % 7 === 0) ? 'inadimplente' : 'adimplente',
        cto_id:         cto.id,
        cto_nome:       cto.nome,
        olt_id:         oltId,
        lat:            cto.lat + (Math.random() - 0.5) * 0.002,
        lng:            cto.lng + (Math.random() - 0.5) * 0.002,
        source:'demo', created_at:ts
      }));
    }
  });

  Promise.all(saves).then(function() {
    _sdrMkLog('✅ Topologia completa gerada: ' + olts.length + ' OLTs, ' + dgos.length + ' DGOs, ' + sp1list.length + ' Sp1, ' + sp2list.length + ' Sp2, ' + sp3list.length + ' Sp3, ' + ctosDefs.length + ' CTOs, ' + onuIdx + ' ONUs + Clientes.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({
      icon:'success', title:'Topologia Gerada!',
      html: '<b>' + olts.length + '</b> OLTs · <b>' + dgos.length + '</b> DGOs · <b>' + (sp1list.length+sp2list.length+sp3list.length) + '</b> Splitters · <b>' + ctosDefs.length + '</b> CTOs · <b>' + onuIdx + '</b> ONUs<br><br>Acesse a aba <b>OLTs → Topologia</b> para visualizar.',
      timer:4000, showConfirmButton:false
    });
  }).catch(function(e) { _sdrMkLog('❌ Erro ao gerar topologia: ' + e.message, 'error'); });
};

window.sdrMkDemoOlts = function() {
  var ts = new Date().toISOString();
  var demoOlts = {
    'olt-demo-01': {name:'OLT-CENTRAL-01', model:'ZTE C320',       ip_address:'10.0.0.1', total_pon_ports:8, is_active:true, source:'demo', created_at:ts},
    'olt-demo-02': {name:'OLT-FILIAL-01',  model:'Huawei MA5608T', ip_address:'10.0.0.2', total_pon_ports:4, is_active:true, source:'demo', created_at:ts},
    'olt-demo-03': {name:'OLT-FILIAL-02',  model:'ZTE C300',       ip_address:'10.0.0.3', total_pon_ports:2, is_active:false,source:'demo', created_at:ts}
  };
  var saves = Object.entries(demoOlts).map(function(e){ return window.sdrRef('olt_connections/' + e[0]).set(e[1]); });
  Promise.all(saves).then(function() {
    _sdrMkLog('✅ ' + Object.keys(demoOlts).length + ' OLTs demo em olt_connections.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({icon:'success', title:'OLTs Demo', text:'3 OLTs salvas. Acesse a aba OLTs para ver.', timer:2000, showConfirmButton:false});
  }).catch(function(e) { _sdrMkLog('❌ Erro OLTs demo: ' + e.message, 'error'); });
};

window.sdrMkDemoOnus = function() {
  var ts = new Date().toISOString();
  var modelos = ['ZTE F660','Huawei HG8245H','Intelbras 110A','ZTE F620','Multilaser RE160'];
  var saves = [];
  for (var i = 1; i <= 12; i++) {
    var oltId = i <= 4 ? 'olt-demo-01' : i <= 8 ? 'olt-demo-02' : 'olt-demo-03';
    var status = (i % 6 === 0) ? 'offline' : (i % 8 === 0) ? 'degraded' : 'online';
    saves.push(window.sdrRef('onus/onu-demo-' + String(i).padStart(2,'0')).set({
      serial_number: 'ZTEG' + String(i * 111111).padStart(8,'0'),
      model:  modelos[i % modelos.length],
      status: status,
      olt_id: oltId,
      rx_power: status === 'offline' ? null : -(Math.floor(Math.random()*12)+14),
      ip_address: '192.168.1.' + (100 + i),
      source:'demo', created_at:ts
    }));
  }
  Promise.all(saves).then(function() {
    _sdrMkLog('✅ 12 ONUs demo salvas.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({icon:'success', title:'ONUs Demo', text:'12 ONUs salvas. Acesse a aba ONUs.', timer:2000, showConfirmButton:false});
  }).catch(function(e) { _sdrMkLog('❌ Erro ONUs demo: ' + e.message, 'error'); });
};

window.sdrMkDemoClientes = function() {
  var ts = new Date().toISOString();
  var nomes = ['Ana Silva','Bruno Souza','Carlos Lima','Diana Costa','Eduardo Pereira',
               'Fernanda Oliveira','Gabriel Santos','Helena Rocha','Igor Martins','Julia Ferreira'];
  var planos = ['50MB','100MB','200MB','500MB'];
  var saves = nomes.map(function(n, i) {
    return window.sdrRef('clients/cli-demo-' + String(i+1).padStart(2,'0')).set({
      name: n,
      onu_serial: 'ZTEG' + String((i+1)*111111).padStart(8,'0'),
      onu_status: i % 6 === 0 ? 'offline' : 'online',
      rx_power: -(Math.floor(Math.random()*12)+14),
      plan_name: planos[i%4],
      financial_status: i % 5 === 0 ? 'inadimplente' : 'adimplente',
      lat: -20.316 + (Math.random()-0.5)*0.02,
      lng: -40.338 + (Math.random()-0.5)*0.02,
      source:'demo', created_at:ts
    });
  });
  Promise.all(saves).then(function() {
    _sdrMkLog('✅ ' + nomes.length + ' clientes demo salvos.', 'ok');
    _sdrMkRefreshCounts();
    if (typeof Swal !== 'undefined') Swal.fire({icon:'success', title:'Clientes Demo', text:nomes.length + ' clientes salvos. Acesse a aba Clientes.', timer:2000, showConfirmButton:false});
  }).catch(function(e) { _sdrMkLog('❌ Erro clientes demo: ' + e.message, 'error'); });
};

console.log('[SDR Bundle] mk/index.js — MK integração OK');
