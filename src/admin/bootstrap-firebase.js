'use strict';

window._getTecnicosAtivos = function () {
  return Object.entries(usersCache)
    .filter(([,u]) => u.ativo !== false && !u.firstLogin && !_isFiscal(u) && !_isObservador(u))
    .map(([id,u]) => ({id, nome:u.name||id, nivel:u.nivel||'V1'}))
    .sort((a,b) => a.nome.localeCompare(b.nome));
}

window.iniciarFirebase = async function (cfg) {
  try {
    firebase.initializeApp(cfg);
    db   = firebase.database();
    auth = firebase.auth();
    // Expoe db e auth no window para o sdr-bundle.js (audit log, etc.)
    window.db   = db;
    window.auth = auth;
    // keepSynced: mantém cópia local dos paths críticos para acesso offline
    // O Firebase RTDB usa WebSocket — SW não intercepta. keepSynced garante
    // que os dados fiquem em memória mesmo sem conexão.
    try {
      ['os','users','precos','config'].forEach(path => {
        db.ref(path).keepSynced(true);
      });
      console.log('[SDR] keepSynced ativado para: os, users, precos, config');
    } catch(_ks) { console.warn('[SDR] keepSynced nao disponivel:', _ks.message); }
    // Test connectivity
    await db.ref('.info/connected').once('value');
    // Faz sign-in anônimo para satisfazer regras "auth != null".
    // Se o provedor anônimo ainda não estiver habilitado no console,
    // o try interno falha silenciosamente (banco ainda em modo aberto).
    try { await auth.signInAnonymously(); } catch(_e) { console.warn('[iniciarFirebase]', _e.message); }
    // Testa permissão de leitura (a sessão anônima permanece ativa para
    // todas as chamadas subsequentes de inicialização)
    await db.ref('users').limitToFirst(1).once('value');
    return 'ok';
  } catch(e) {
    const msg = String(e.message || e).toLowerCase();
    if(msg.includes('permission') || msg.includes('denied')) return 'permission';
    return 'error';
  }
}

window.garantirUsuarios = async function () {
  const snap = await db.ref('users').once('value');
  const existing = snap.val() || {};
  const updates = {};
  for (const u of USERS_INIT) {
    if (!existing[u.id]) {
      // Cria usuário novo
      const dados = { name: u.name, role: u.role, passwordHash: null, firstLogin: true };
      if (u.nivel) dados.nivel = u.nivel;
      updates[`users/${u.id}`] = dados;
    } else {
      // Para usuários existentes: NUNCA sobrescreve o nome (preserva renomeações feitas pelo master)
      // Sincroniza nivel se ainda não estiver definido no Firebase (cobre V1 e V3)
      const nivelEsperado = u.nivel || 'V1';
      if (!existing[u.id].nivel) updates[`users/${u.id}/nivel`] = nivelEsperado;
    }
  }
  // Corrige Jefferson para V1 no Firebase (caso tenha sido alterado para V3 anteriormente)
  Object.entries(existing).forEach(([uid, u]) => {
    if ((uid === 'jefferson' || (u.name||'').toLowerCase() === 'jefferson') && (u.nivel||'V1') === 'V3') {
      updates[`users/${uid}/nivel`] = 'V1';
    }
  });
  if (Object.keys(updates).length > 0) await db.ref().update(updates);
  // Cache
  usersCache = await _dbRead('users', {});
}

window._precisaCadastroEmpresa = function (user) {
  // Master e Observador (V4) não precisam de cadastro
  if (_isAdmin(user) || _isObservador(user)) return false;
  // Se o master dispensou a ficha, não precisa
  if (user.empresa?.dispensado) return false;
  // Fiscal (V0), Técnico (V1), Supervisor (V2) precisam
  return !user.empresa || !user.empresa.razaoSocial;
}

window._preencherFormEmpresa = function (empresa) {
  if (!empresa) return;
  const campos = {
    // Dados da Empresa
    'cad-razao':    empresa.razaoSocial || '',
    'cad-fantasia': empresa.nomeFantasia || '',
    'cad-cnpj':     empresa.cnpj || '',
    'cad-cnae':     empresa.cnae || '',
    'cad-ie':       empresa.inscricaoEstadual || '',
    'cad-im':       empresa.inscricaoMunicipal || '',
    // Endereço
    'cad-rua':    empresa.rua || '',
    'cad-num':    empresa.numero || '',
    'cad-compl':  empresa.complemento || '',
    'cad-bairro': empresa.bairro || '',
    'cad-cep':    empresa.cep || '',
    'cad-cidade': empresa.cidade || '',
    'cad-estado': empresa.estado || '',
    // Contato
    'cad-tel':       empresa.telefone || '',
    'cad-cel':       empresa.celular || '',
    'cad-email':     empresa.email || '',
    'cad-email-fin': empresa.emailFinanceiro || '',
    'cad-site':      empresa.site || '',
    // Representante Legal
    'cad-resp-nome':  empresa.responsavel?.nome || empresa.respNome || '',
    'cad-resp-cpf':   empresa.responsavel?.cpf || empresa.respCpf || '',
    'cad-resp-rg':    empresa.responsavel?.rg || empresa.respRg || '',
    'cad-resp-nac':   empresa.responsavel?.nacionalidade || empresa.respNacionalidade || '',
    'cad-resp-ec':    empresa.responsavel?.ec || empresa.respEc || '',
    'cad-resp-cargo': empresa.responsavel?.cargo || empresa.respCargo || '',
    // Dados Bancários
    'cad-banco':      empresa.banco || '',
    'cad-agencia':    empresa.agencia || '',
    'cad-conta':      empresa.conta || '',
    'cad-tipo-conta': empresa.tipoConta || '',
    'cad-titular':    empresa.titular || '',
    // PIX
    'cad-pix-tipo':       empresa.pixTipo || '',
    'cad-pix':            empresa.pix || '',
    'cad-pix-favorecido': empresa.pixFavorecido || '',
    'cad-pix-banco':      empresa.pixBanco || '',
    // Contratos
    'cad-foro':           empresa.foro || '',
    'cad-dia-pgto':       empresa.diaPgto || '',
    'cad-dia-choice':     empresa.diaChoice || '',
    'cad-contrato-resp':  empresa.contratoResp || '',
    'cad-contrato-versao':empresa.contratoVersao || '',
  };
  Object.entries(campos).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

window.salvarCadastroEmpresa = async function () {
  const err = document.getElementById('cad-empresa-err');
  const btn = document.getElementById('btn-salvar-empresa');

  // Campos obrigatórios
  const razao = (document.getElementById('cad-razao')?.value || '').trim();
  const cnpj = (document.getElementById('cad-cnpj')?.value || '').trim();
  const rua = (document.getElementById('cad-rua')?.value || '').trim();
  const num = (document.getElementById('cad-num')?.value || '').trim();
  const bairro = (document.getElementById('cad-bairro')?.value || '').trim();
  const cidade = (document.getElementById('cad-cidade')?.value || '').trim();
  const estado = (document.getElementById('cad-estado')?.value || '').trim();
  const tel = (document.getElementById('cad-tel')?.value || '').trim();
  const respNome = (document.getElementById('cad-resp-nome')?.value || '').trim();
  const respCpf = (document.getElementById('cad-resp-cpf')?.value || '').trim();

  if (!razao || !cnpj || !rua || !num || !bairro || !cidade || !estado || !tel || !respNome || !respCpf) {
    if (err) { err.textContent = 'Preencha todos os campos obrigatórios (*).'; err.style.display = 'block'; }
    return;
  }
  if (err) err.style.display = 'none';

  const _cv = id => (document.getElementById(id)?.value || '').trim();
  const empresa = {
    // Dados da Empresa
    razaoSocial:        razao,
    nomeFantasia:       _cv('cad-fantasia'),
    cnpj,
    cnae:               _cv('cad-cnae'),
    inscricaoEstadual:  _cv('cad-ie'),
    inscricaoMunicipal: _cv('cad-im'),
    // Endereço
    rua, numero: num,
    complemento:        _cv('cad-compl'),
    bairro, cep:        _cv('cad-cep'),
    cidade, estado,
    // Contato
    telefone:           tel,
    celular:            _cv('cad-cel'),
    email:              _cv('cad-email'),
    emailFinanceiro:    _cv('cad-email-fin'),
    site:               _cv('cad-site'),
    // Representante Legal
    respNome, respCpf,
    respRg:             _cv('cad-resp-rg'),
    respNacionalidade:  _cv('cad-resp-nac'),
    respEc:             _cv('cad-resp-ec'),
    respCargo:          _cv('cad-resp-cargo'),
    // Dados Bancários
    banco:              _cv('cad-banco'),
    agencia:            _cv('cad-agencia'),
    conta:              _cv('cad-conta'),
    tipoConta:          _cv('cad-tipo-conta'),
    titular:            _cv('cad-titular'),
    // PIX
    pixTipo:            _cv('cad-pix-tipo'),
    pix:                _cv('cad-pix'),
    pixFavorecido:      _cv('cad-pix-favorecido'),
    pixBanco:           _cv('cad-pix-banco'),
    // Contratos
    foro:               _cv('cad-foro'),
    diaPgto:            _cv('cad-dia-pgto'),
    diaChoice:          _cv('cad-dia-choice'),
    contratoResp:       _cv('cad-contrato-resp'),
    contratoVersao:     _cv('cad-contrato-versao'),
    atualizadoEm: new Date().toISOString(),
  };

  if (btn) btn.disabled = true;
  try {
    await _dbSet(`users/${currentUser.id}/empresa`, empresa);
    currentUser.empresa = empresa;
    usersCache[currentUser.id] = { ...(usersCache[currentUser.id] || {}), empresa };
    toast('Dados da empresa salvos com sucesso!', 'success');

    // Continua para o app
    await carregarDados();
    // Verifica rescisão pendente primeiro
    const bloqueadoPorRescisao2 = await verificarRescisaoPendente();
    if (bloqueadoPorRescisao2) return;
    // Para V0/V1/V2: inicia (ou verifica) o fluxo de contrato de prestação de serviços
    if (['V0','V1','V2'].includes(currentUser.nivel||'V1')) {
      const bloqueadoPorContrato = await verificarContratoPendente();
      if (bloqueadoPorContrato) return;
    }
    const bloqueadoPorTermo = currentUser.role !== 'master' && await verificarTermosPendentes();
    if (!bloqueadoPorTermo) {
      appScreen('app');
      const firstPage = _isFiscal(currentUser) ? 'meu-dash' : _isObservador(currentUser) ? 'observador-dash' : 'meu-dash';
      showPage(firstPage);
    }
  } catch(e) {
    console.error('[salvarCadastroEmpresa]', e);
    if (err) { err.textContent = 'Erro ao salvar: ' + (e.message || e); err.style.display = 'block'; }
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.logout = function () {
  clearTimeout(_sessionTimer); // para timer de inatividade
  _removeActivityListeners();  // Fase5: limpa listeners
  _revokeAllBlobs();           // Fase5: libera Blob URLs
  currentUser = null;
  allRecords = [];
  selectedUserId = null;
  precosDesbloqueado = false; // bloqueia PIN novamente ao sair
  // Remove sessão persistida (impede auto-login no próximo reload)
  sessionStorage.removeItem('srua_sessao_uid');
  // Encerra sessão Firebase Auth
  try { if (auth) auth.signOut(); } catch(_e) { console.warn('[logout]', _e.message); }
  appScreen('login');
  document.querySelectorAll('.user-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('pwd-block').style.display = 'none';
  document.getElementById('btn-entrar').style.display = 'none';
  document.getElementById('pwd-input').value = '';
}

