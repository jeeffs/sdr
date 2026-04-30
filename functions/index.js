/**
 * SDR Soluções de Rua — Firebase Functions
 * Proxy MK Solutions: evita CORS e mixed-content (HTTP→HTTPS)
 *
 * Todas as funções leem mk_config do Firebase Realtime DB e repassam
 * a chamada ao servidor MK. O browser NUNCA chama o MK diretamente.
 *
 * Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const fetch     = require('node-fetch');

admin.initializeApp();
const db = admin.database();

// ─── Helper: ler config MK do Firebase ────────────────────────────────
async function getMkConfig(tenant) {
  tenant = tenant || 'default_tenant';
  const snap = await db.ref('sdr_comercial/' + tenant + '/mk_config').once('value');
  const cfg  = snap.val() || {};
  if (!cfg.ip_porta) throw new Error('MK não configurado. Acesse Configurações → MK Solutions e salve o IP:Porta.');
  return cfg;
}

// ─── Helper: chamada ao MK ────────────────────────────────────────────
async function mkGet(cfg, endpoint, params) {
  params = params || {};
  // Usar token de sessão se disponível, senão o token de usuário
  const tkSessao = cfg.token_sessao;
  const token    = tkSessao && tkSessao.valor && tkSessao.expira > Date.now()
    ? tkSessao.valor
    : cfg.token;

  const base    = 'http://' + cfg.ip_porta + '/mk/' + endpoint + '?sys=MK0&token=' + encodeURIComponent(token);
  const qs      = Object.entries(params)
    .filter(function(e) { return e[1] != null && e[1] !== ''; })
    .map(function(e) { return encodeURIComponent(e[0]) + '=' + encodeURIComponent(e[1]); })
    .join('&');
  const url     = base + (qs ? '&' + qs : '');

  const resp    = await fetch(url, { timeout: 15000 });
  const text    = await resp.text();

  // MK retorna XML ou JSON — tentar parsear JSON primeiro
  try {
    return { ok: true, data: JSON.parse(text), raw: null };
  } catch (_) {
    return { ok: true, data: null, raw: text };
  }
}

// ─── Helper: resposta CORS ────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

function sendOk(res, data)  { res.set(corsHeaders()).status(200).json({ ok: true,  data: data }); }
function sendErr(res, msg)  { res.set(corsHeaders()).status(200).json({ ok: false, error: msg }); }

// ═══════════════════════════════════════════════════════════════════════
// 1. sdrMkAuth — Autenticação (obtém tokenRetornoAutenticacao)
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkAuth = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || 'default_tenant';
    const cfg    = await getMkConfig(tenant);

    const url = 'http://' + cfg.ip_porta + '/mk/WSAutenticacao.rule?sys=MK0'
      + '&token='      + encodeURIComponent(cfg.token)
      + '&password='   + encodeURIComponent(cfg.password || '')
      + '&cd_servico=' + encodeURIComponent(cfg.cd_servico || 9999);

    const resp  = await fetch(url, { timeout: 10000 });
    const text  = await resp.text();

    // Extrair token da resposta (normalmente JSON: {tokenRetornoAutenticacao: "..."})
    let tokenRetorno = null;
    try {
      const j = JSON.parse(text);
      tokenRetorno = j.tokenRetornoAutenticacao || j.token || j.Token || null;
    } catch (_) {
      // Tentar regex para XML
      const m = text.match(/<tokenRetornoAutenticacao>([^<]+)<\/tokenRetornoAutenticacao>/);
      if (m) tokenRetorno = m[1];
    }

    if (tokenRetorno) {
      // Salvar token de sessão (expira em 8h)
      await db.ref('sdr_comercial/' + tenant + '/mk_config/token_sessao').set({
        valor:  tokenRetorno,
        expira: Date.now() + 8 * 3600 * 1000,
        at:     new Date().toISOString()
      });
      sendOk(res, { tokenRetornoAutenticacao: tokenRetorno });
    } else {
      sendErr(res, 'Autenticação falhou — verifique token e password. Resposta: ' + text.substring(0, 200));
    }
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 2. sdrMkTestar — Testar conexão (auth rápida + ping)
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkTestar = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || 'default_tenant';
    const cfg    = await getMkConfig(tenant);

    const url = 'http://' + cfg.ip_porta + '/mk/WSAutenticacao.rule?sys=MK0'
      + '&token='      + encodeURIComponent(cfg.token)
      + '&password='   + encodeURIComponent(cfg.password || '')
      + '&cd_servico=' + encodeURIComponent(cfg.cd_servico || 9999);

    const t0   = Date.now();
    const resp = await fetch(url, { timeout: 10000 });
    const ms   = Date.now() - t0;
    const text = await resp.text();

    let tokenRetorno = null;
    try {
      const j = JSON.parse(text);
      tokenRetorno = j.tokenRetornoAutenticacao || j.token || null;
    } catch (_) {
      const m = text.match(/<tokenRetornoAutenticacao>([^<]+)<\/tokenRetornoAutenticacao>/);
      if (m) tokenRetorno = m[1];
    }

    if (tokenRetorno) {
      sendOk(res, { sucesso: true, ms: ms, token_preview: tokenRetorno.substring(0, 8) + '...' });
    } else {
      sendOk(res, { sucesso: false, ms: ms, resposta_raw: text.substring(0, 300) });
    }
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 3. sdrMkClientes — Listar/sincronizar clientes
//    Params: data_alteracao_inicio, nome_cliente, doc, cd_cliente
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkClientes = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || 'default_tenant';
    const cfg    = await getMkConfig(tenant);

    const params = {
      data_alteracao_inicio: req.query.data_alteracao_inicio || '',
      data_alteracao_fim:    req.query.data_alteracao_fim    || '',
      nome_cliente:          req.query.nome_cliente          || '',
      doc:                   req.query.doc                   || '',
      cd_cliente:            req.query.cd_cliente            || '',
      cd_cliente_inicio:     req.query.cd_cliente_inicio     || '',
      cd_cliente_fim:        req.query.cd_cliente_fim        || ''
    };

    const result = await mkGet(cfg, 'WSMKConsultaClientes.rule', params);
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 4. sdrMkConexoes — Conexões/status ONU por cliente
//    Params: cd_cliente (obrigatório)
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkConexoes = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant    = req.query.tenant     || 'default_tenant';
    const cdCliente = req.query.cd_cliente || '';
    if (!cdCliente) { sendErr(res, 'cd_cliente obrigatório'); return; }

    const cfg    = await getMkConfig(tenant);
    const result = await mkGet(cfg, 'WSMKConexoesPorCliente.rule', { cd_cliente: cdCliente });
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 5. sdrMkContratos — Contratos por cliente
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkContratos = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant    = req.query.tenant     || 'default_tenant';
    const cdCliente = req.query.cd_cliente || '';
    if (!cdCliente) { sendErr(res, 'cd_cliente obrigatório'); return; }

    const cfg    = await getMkConfig(tenant);
    const result = await mkGet(cfg, 'WSMKContratosPorCliente.rule', { cd_cliente: cdCliente });
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 6. sdrMkFaturas — Faturas pendentes por cliente
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkFaturas = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant    = req.query.tenant     || 'default_tenant';
    const cdCliente = req.query.cd_cliente || '';
    if (!cdCliente) { sendErr(res, 'cd_cliente obrigatório'); return; }

    const cfg    = await getMkConfig(tenant);
    const result = await mkGet(cfg, 'WSMKFaturasPendentes.rule', { cd_cliente: cdCliente });
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 7. sdrMkInfraestrutura — Locais de manutenção (OLTs, POPs, CTOs)
//    Params: local (1=POP, 4=OLT, 6=NAP/CTO)
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkInfraestrutura = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || 'default_tenant';
    const local  = req.query.local  || '4';
    const cfg    = await getMkConfig(tenant);
    const result = await mkGet(cfg, 'WSMKConsultaLocalManutencao.rule', { local: local });
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 8. sdrMkPontosImobilizados — Infraestrutura física
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkPontosImobilizados = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || 'default_tenant';
    const cfg    = await getMkConfig(tenant);
    const result = await mkGet(cfg, 'WSMKConsultaPontoImobilizado.rule', {});
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 9. sdrMkAbrirOS — Criar Ordem de Serviço no MK
//    Body (POST) ou query params: CodigoCliente, DescricaoProblema, etc.
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkAbrirOS = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || (req.body && req.body.tenant) || 'default_tenant';
    const p      = Object.assign({}, req.query, req.body || {});
    const cfg    = await getMkConfig(tenant);

    if (!p.CodigoCliente) { sendErr(res, 'CodigoCliente obrigatório'); return; }

    const params = {
      CodigoCliente:      p.CodigoCliente,
      CodigoConexao:      p.CodigoConexao      || '',
      CodigoContrato:     p.CodigoContrato      || '',
      DescricaoProblema:  p.DescricaoProblema   || '',
      CodigoTipoOS:       p.CodigoTipoOS        || '',
      CodigoTecnico:      p.CodigoTecnico       || '',
      CodigoGrupoServico: p.CodigoGrupoServico  || '',
      categoria:          p.categoria           || '1'
    };

    const result = await mkGet(cfg, 'WSMKCriarOrdemServico.rule', params);
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 10. sdrMkDesbloquear — Auto-desbloqueio de conexão
//     Params: cd_conexao, diasexcecao (opcional)
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkDesbloquear = functions.https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant     = req.query.tenant      || 'default_tenant';
    const cdConexao  = req.query.cd_conexao  || '';
    const diasExcecao= req.query.diasexcecao || '';
    if (!cdConexao) { sendErr(res, 'cd_conexao obrigatório'); return; }

    const cfg    = await getMkConfig(tenant);
    const result = await mkGet(cfg, 'WSMKAutoDesbloqueio.rule', {
      cd_conexao: cdConexao,
      diasexcecao: diasExcecao
    });
    sendOk(res, result.data || result.raw);
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 11. sdrMkSyncClientes — Sync incremental MK → Firebase Realtime DB
//     Executa no servidor: busca clientes alterados desde ultimoSync,
//     salva em sdr_comercial/{tenant}/clients/
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkSyncClientes = functions
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || 'default_tenant';
    const cfg    = await getMkConfig(tenant);

    // Ler último sync
    const syncSnap = await db.ref('sdr_comercial/' + tenant + '/mk_config/ultimo_sync').once('value');
    const ultimoSync = syncSnap.val() || '';

    // Buscar clientes alterados
    const result = await mkGet(cfg, 'WSMKConsultaClientes.rule', {
      data_alteracao_inicio: ultimoSync
    });

    const clientes = Array.isArray(result.data) ? result.data
      : (result.data && result.data.clientes ? result.data.clientes : []);

    if (!clientes || clientes.length === 0) {
      sendOk(res, { sincronizados: 0, msg: 'Nenhum cliente alterado desde ' + (ultimoSync || 'início') });
      return;
    }

    // Salvar em batch no Firebase
    const updates = {};
    const agora   = new Date().toISOString();
    clientes.forEach(function(c) {
      const mkId = c.cd_cliente || c.codigo || c.Codigo;
      if (!mkId) return;
      const key = 'mk_' + mkId;
      updates['sdr_comercial/' + tenant + '/clients/' + key] = {
        mk_id:      mkId,
        nome:       c.nm_cliente   || c.nome  || c.Nome  || '',
        cpf:        c.nr_cpf_cnpj  || c.doc   || c.Doc   || '',
        cidade:     c.nm_cidade    || c.cidade || '',
        bairro:     c.nm_bairro    || c.bairro || '',
        email:      c.email        || c.Email  || '',
        celular:    c.nr_celular   || c.celular || '',
        tipo:       c.tp_pessoa    || '',
        status:     c.st_cliente   || 'ativo',
        synced_at:  agora,
        source:     'mk'
      };
    });

    await db.ref().update(updates);
    await db.ref('sdr_comercial/' + tenant + '/mk_config/ultimo_sync').set(agora);

    sendOk(res, { sincronizados: clientes.length, ultimo_sync: agora });
  } catch (e) {
    sendErr(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 12. sdrMkSyncInfra — Sync OLTs + CTOs do MK → Firebase
// ═══════════════════════════════════════════════════════════════════════
exports.sdrMkSyncInfra = functions
  .runWith({ timeoutSeconds: 180, memory: '256MB' })
  .https.onRequest(async function(req, res) {
  if (req.method === 'OPTIONS') { res.set(corsHeaders()).status(204).send(''); return; }
  try {
    const tenant = req.query.tenant || 'default_tenant';
    const cfg    = await getMkConfig(tenant);

    const [oltsRes, popsRes, ctosRes] = await Promise.all([
      mkGet(cfg, 'WSMKConsultaLocalManutencao.rule', { local: '4' }),
      mkGet(cfg, 'WSMKConsultaLocalManutencao.rule', { local: '1' }),
      mkGet(cfg, 'WSMKConsultaLocalManutencao.rule', { local: '6' })
    ]);

    const agora   = new Date().toISOString();
    const updates = {};

    // OLTs
    const olts = Array.isArray(oltsRes.data) ? oltsRes.data
      : (oltsRes.data && oltsRes.data.locais ? oltsRes.data.locais : []);
    olts.forEach(function(o) {
      const mkId = o.cd_local || o.codigo;
      if (!mkId) return;
      const key  = 'mk_olt_' + mkId;
      updates['sdr_comercial/' + tenant + '/olt_connections/' + key] = {
        mk_id:      mkId,
        name:       o.nm_local || o.nome || 'OLT-' + mkId,
        ip_address: o.ip       || o.nr_ip || '',
        model:      o.modelo   || '',
        is_active:  true,
        synced_at:  agora,
        source:     'mk'
      };
    });

    // CTOs/NAPs
    const ctos = Array.isArray(ctosRes.data) ? ctosRes.data
      : (ctosRes.data && ctosRes.data.locais ? ctosRes.data.locais : []);
    ctos.forEach(function(c) {
      const mkId = c.cd_local || c.codigo;
      if (!mkId) return;
      const key = 'mk_cto_' + mkId;
      updates['sdr_comercial/' + tenant + '/infrastructure/' + key] = {
        mk_id:    mkId,
        type:     'cto',
        nome:     c.nm_local || c.nome || 'CTO-' + mkId,
        lat:      c.nr_latitude  || null,
        lng:      c.nr_longitude || null,
        synced_at: agora,
        source:   'mk'
      };
    });

    await db.ref().update(updates);

    sendOk(res, {
      olts:  olts.length,
      pops:  (Array.isArray(popsRes.data) ? popsRes.data : []).length,
      ctos:  ctos.length,
      synced_at: agora
    });
  } catch (e) {
    sendErr(res, e.message);
  }
});
