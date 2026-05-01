// src/admin/tecnicos.js
// Cadastro da empresa, loginSuccess, buildSidebar, showPage e sub-tabs
// Extraído de admin.html — Fase B

// ── Navegação — constantes de páginas ──
const PAGES = {
  master: [
    {id:'dashboard',    icon:'fa-chart-bar',   label:'Dashboard'},
    {id:'configuracoes',icon:'fa-cog',         label:'Configurações'},
    {id:'os',           icon:'fa-list',        label:'OS & Registros'},
    {id:'financeiro',   icon:'fa-dollar-sign', label:'Financeiro'},
    {id:'dados',        icon:'fa-database',    label:'Dados'},
    {id:'seguranca',    icon:'fa-shield-alt',  label:'Segurança'},
  ],
  user: [
    {id:'meu-dash',    icon:'fa-chart-line',  label:'Meu Dashboard'},
    {id:'lancar',      icon:'fa-plus-circle', label:'Lançar OS'},
    {id:'registros',   icon:'fa-list',        label:'Meus Registros'},
    {id:'tabela-precos',icon:'fa-tag',        label:'Tabela de Preços'},
    {id:'relatorio',   icon:'fa-file-excel',  label:'Baixar Planilha'},
    {id:'meus-docs',   icon:'fa-folder-open', label:'Meus Documentos'},
  ],
  fiscal: [
    {id:'meu-dash',       icon:'fa-chart-line',    label:'Meu Dashboard'},
    {id:'fiscalizacao',   icon:'fa-search',         label:'Fiscalização de OS'},
    {id:'inventario',     icon:'fa-clipboard-check',label:'Inventário'},
    {id:'seguranca',      icon:'fa-hard-hat',       label:'Segurança'},
    {id:'relatorio',      icon:'fa-file-export',    label:'Exportar'},
  ],
  observador: [
    {id:'observador-dash',  icon:'fa-eye',         label:'Dashboard'},
    {id:'observador-regs',  icon:'fa-list',        label:'Registros'},
  ],
};
const PAGE_TITLES = {
  dashboard:'Dashboard',
  'meu-dash':'Meu Dashboard', lancar:'Lançar OS', registros:'Registros',
  'tabela-precos':'Tabela de Preços',
  relatorio:'Exportar', precos:'Tabela de Preços', tecnicos:'Prestadores', usuarios:'Gerenciar Usuários',
  importar:'Importar Planilhas Históricas',
  financeiro:'Financeiro — Produção & Descontos',
  'impostos-mensais':'Impostos Mensais — Simples Nacional',
  fiscalizacao:'Fiscalização de OS',
  inventario:'Inventário Mensal',
  'observador-dash':'Dashboard do Observador',
  'observador-regs':'Registros do Profile',
  'seguranca':'Segurança — Documentos & Inventário',
  'exportar-docs':'Exportar Documentos',
  os:'OS & Registros', dados:'Dados', 'configuracoes':'Configurações', 'cadastro-admin':'Cadastro da Empresa',
  'meus-docs':'Meus Documentos',
};

window.renderCadastroAdmin = function() {
  const emp = (window.currentUser && window.currentUser.empresa) || {};

  const _fill = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  // Dados da Empresa
  _fill('adm-razao',     emp.razaoSocial);
  _fill('adm-fantasia',  emp.nomeFantasia);
  _fill('adm-cnpj',      emp.cnpj);
  _fill('adm-ie',        emp.inscricaoEstadual);
  _fill('adm-im',        emp.inscricaoMunicipal);
  _fill('adm-cnae',      emp.cnae);

  // Endereço
  _fill('adm-rua',       emp.rua);
  _fill('adm-num',       emp.numero);
  _fill('adm-compl',     emp.complemento);
  _fill('adm-bairro',    emp.bairro);
  _fill('adm-cep',       emp.cep);
  _fill('adm-cidade',    emp.cidade);
  _fill('adm-estado',    emp.estado);

  // Contato
  _fill('adm-tel',       emp.telefone);
  _fill('adm-cel',       emp.celular);
  _fill('adm-email',     emp.email);
  _fill('adm-email-fin', emp.emailFinanceiro);
  _fill('adm-site',      emp.site);

  // Representante Legal
  _fill('adm-resp-nome',  emp.responsavel?.nome || emp.respNome);
  _fill('adm-resp-cpf',   emp.responsavel?.cpf || emp.respCpf);
  _fill('adm-resp-rg',    emp.responsavel?.rg || emp.respRg);
  _fill('adm-resp-nac',   emp.responsavel?.nacionalidade || emp.respNacionalidade);
  _fill('adm-resp-ec',    emp.responsavel?.ec || emp.respEc);
  _fill('adm-resp-cargo', emp.responsavel?.cargo || emp.respCargo);

  // Dados Bancários
  _fill('adm-banco',       emp.banco);
  _fill('adm-agencia',     emp.agencia);
  _fill('adm-conta',       emp.conta);
  _fill('adm-tipo-conta',  emp.tipoConta);
  _fill('adm-titular',     emp.titular);

  // PIX
  _fill('adm-pix-tipo',       emp.pixTipo);
  _fill('adm-pix',            emp.pix);
  _fill('adm-pix-favorecido', emp.pixFavorecido);
  _fill('adm-pix-banco',      emp.pixBanco);

  // Informações para Contratos
  _fill('adm-foro',           emp.foro);
  _fill('adm-dia-pgto',       emp.diaPgto);
  _fill('adm-dia-choice',     emp.diaChoice);
  _fill('adm-contrato-resp',  emp.contratoResp);
  _fill('adm-contrato-versao',emp.contratoVersao);

  // Oculta preview e erros
  const prev = document.getElementById('adm-cad-preview');
  const err  = document.getElementById('adm-cad-err');
  if (prev) prev.style.display = 'none';
  if (err)  err.style.display  = 'none';
}

window.salvarCadastroAdmin = async function() {
  const err = document.getElementById('adm-cad-err');
  const prev = document.getElementById('adm-cad-preview');
  const btn = document.getElementById('adm-btn-salvar');

  const _v = id => (document.getElementById(id)?.value || '').trim();

  // Campos obrigatórios
  const razao  = _v('adm-razao');
  const cnpj   = _v('adm-cnpj');
  const rua    = _v('adm-rua');
  const num    = _v('adm-num');
  const bairro = _v('adm-bairro');
  const cidade = _v('adm-cidade');
  const estado = _v('adm-estado');
  const tel    = _v('adm-tel');
  const pix    = _v('adm-pix');

  if (!razao || !cnpj || !rua || !num || !bairro || !cidade || !estado || !tel || !pix) {
    if (err) {
      err.textContent = 'Preencha os campos obrigatórios (*). A Chave PIX é obrigatória para contratos de venda.';
      err.style.display = 'block';
    }
    return;
  }
  if (err) err.style.display = 'none';

  const empresa = {
    // Dados da Empresa
    razaoSocial:        razao,
    nomeFantasia:       _v('adm-fantasia'),
    cnpj,
    inscricaoEstadual:  _v('adm-ie'),
    inscricaoMunicipal: _v('adm-im'),
    cnae:               _v('adm-cnae'),
    // Endereço
    rua, numero: num,
    complemento:        _v('adm-compl'),
    bairro, cep:        _v('adm-cep'),
    cidade, estado,
    // Contato
    telefone:           tel,
    celular:            _v('adm-cel'),
    email:              _v('adm-email'),
    emailFinanceiro:    _v('adm-email-fin'),
    site:               _v('adm-site'),
    // Representante Legal
    respNome:           _v('adm-resp-nome'),
    respCpf:            _v('adm-resp-cpf'),
    respRg:             _v('adm-resp-rg'),
    respNacionalidade:  _v('adm-resp-nac'),
    respEc:             _v('adm-resp-ec'),
    respCargo:          _v('adm-resp-cargo'),
    // Dados Bancários
    banco:              _v('adm-banco'),
    agencia:            _v('adm-agencia'),
    conta:              _v('adm-conta'),
    tipoConta:          _v('adm-tipo-conta'),
    titular:            _v('adm-titular'),
    // PIX
    pixTipo:            _v('adm-pix-tipo'),
    pix,
    pixFavorecido:      _v('adm-pix-favorecido'),
    pixBanco:           _v('adm-pix-banco'),
    // Informações para Contratos
    foro:               _v('adm-foro'),
    diaPgto:            _v('adm-dia-pgto'),
    diaChoice:          _v('adm-dia-choice'),
    contratoResp:       _v('adm-contrato-resp'),
    contratoVersao:     _v('adm-contrato-versao'),
    // Controle
    atualizadoEm: new Date().toISOString(),
  };

  if (btn) btn.disabled = true;
  try {
    await window._dbSet(`users/${window.currentUser.id}/empresa`, empresa);
    window.currentUser.empresa = empresa;
    window.usersCache[window.currentUser.id] = { ...(window.usersCache[window.currentUser.id] || {}), empresa };

    // Mostra preview
    const prevBody = document.getElementById('adm-cad-preview-body');
    if (prevBody) {
      prevBody.innerHTML = `
        <b>Empresa:</b> ${empresa.razaoSocial}<br>
        <b>CNPJ:</b> ${empresa.cnpj}<br>
        <b>Chave PIX:</b> ${empresa.pix}${empresa.pixTipo ? ' (' + empresa.pixTipo + ')' : ''}<br>
        <b>Favorecido PIX:</b> ${empresa.pixFavorecido || '—'}<br>
        <b>Responsável:</b> ${empresa.responsavel?.nome || empresa.respNome || '—'}<br>
        <b>Atualizado em:</b> ${new Date().toLocaleString('pt-BR')}`;
    }
    if (prev) prev.style.display = 'block';

    window.toast('Dados da empresa salvos com sucesso!', 'success');
  } catch(e) {
    console.error('[salvarCadastroAdmin]', e);
    if (err) { err.textContent = 'Erro ao salvar: ' + (e.message || e); err.style.display = 'block'; }
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.loginSuccess = async function(user) {
  window.currentUser = user;
  window._setupActivityListeners(); // Fase5: instala listeners com cleanup
  window._resetSessionTimer(); // inicia timer de inatividade
  // Autentica no Firebase (permite regras window.auth != null no banco de dados)
  try { if (window.auth && !firebase.auth().currentUser) await window.auth.signInAnonymously(); } catch(_e) { console.warn('[loginSuccess]', _e.message); }
  // Salva último usuário para auto-preenchimento
  localStorage.setItem('srua_lastUser', user.name);
  localStorage.setItem('srua_lastUid',  user.id);
  // Persiste sessão para sobreviver a reload (F5 / botão Atualizar)
  sessionStorage.setItem('srua_sessao_uid', user.id);
  document.getElementById('sb-username').textContent = user.name;
  document.getElementById('sb-role').textContent = window._isAdmin(user) ? 'Master' : window._safeNivel(user.nivel||'V1');
  // Olho: apenas master tem o botão de ocultar/revelar valores
  const _olhoBtn = document.getElementById('btn-olho');
  const _olhoIco = document.getElementById('icon-olho');
  if (user.role === 'master') {
    document.body.classList.add('hide-money');
    if (_olhoBtn) { _olhoBtn.classList.remove('aberto'); _olhoBtn.style.display = ''; }
    if (_olhoIco) { _olhoIco.className = 'fas fa-eye-slash'; }
  } else {
    document.body.classList.remove('hide-money');
    if (_olhoBtn) _olhoBtn.style.display = 'none';
  }
  window.buildSidebar();

  // Carrega dados da empresa do Firebase (se existirem)
  try {
    const snapEmp = await window.db.ref(`users/${user.id}/empresa`).once('value');
    const empresaData = snapEmp.val();
    if (empresaData) {
      user.empresa = empresaData;
      window.currentUser.empresa = empresaData;
    }
  } catch(_e) { console.warn('[loginSuccess]', _e.message); }

  // Verifica se precisa preencher cadastro de empresa (V0, V1, V2)
  if (window._precisaCadastroEmpresa(user)) {
    window._preencherFormEmpresa(user.empresa || null);
    window.appScreen('cadastro-empresa');
    window.limparForm();
    return;
  }

  await window.carregarDados();
  window.atualizarAvatarSidebar();
  // Verifica rescisão pendente (prioridade sobre termos de abatimento)
  const bloqueadoPorRescisao = await window.verificarRescisaoPendente();
  if (bloqueadoPorRescisao) { window.limparForm(); return; }

  // Para V0/V1/V2: verifica se o contrato de prestação de serviços está pendente
  if (['V0','V1','V2'].includes(user.nivel||'V1')) {
    const bloqueadoPorContrato = await window.verificarContratoPendente();
    if (bloqueadoPorContrato) { window.limparForm(); return; }
  }

  // Verifica bloqueio de segurança (documentos vencidos, pendências inventário)
  if (!window._isAdmin(user) && !window._isFiscal(user) && !window._isObservador(user)) {
    const segCheck = await window.verificarBloqueioSeguranca(user.id);
    if (segCheck.bloqueado) {
      window.toast(segCheck.motivo, 'error');
      window.limparForm();
      return;
    }
  }

  // Para técnicos (não-admin): verifica se há termos de abatimento pendentes
  // Se houver, exibe a tela de bloqueio; caso contrário prossegue normalmente
  const bloqueadoPorTermo = user.role !== 'master' && await window.verificarTermosPendentes();
  if (!bloqueadoPorTermo) {
    window.appScreen('app');
    const firstPage = window._isAdmin(user) ? 'dashboard' : window._isFiscal(user) ? 'seguranca' : window._isObservador(user) ? 'observador-dash' : 'meu-dash';
    window.showPage(firstPage);
    // Alertas de segurança (não bloqueantes) para técnicos
    if (!window._isAdmin(user) && !window._isFiscal(user) && !window._isObservador(user)) {
      const alertas = await window.verificarAlertasSeguranca(user.id);
      if (alertas.length > 0) {
        setTimeout(() => window.toast('⚠ Atenção: ' + alertas.join(' | '), 'error'), 500);
      }
    }
    // Modal generoso de alertas para Fiscal no login
    if (window._isFiscal(user)) {
      setTimeout(() => window._mostrarModalAlertasFiscal(), 600);
    }
    // Aviso: contrato assinado sem autenticação gov.br
    if (_contratoSemGovBr) {
      const csg = _contratoSemGovBr;
      _contratoSemGovBr = null;
      setTimeout(() => {
        let overlay = document.getElementById('modal-contrato-govbr');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'modal-contrato-govbr';
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
          document.body.appendChild(overlay);
        }
        overlay.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.3)">
          <div style="background:#b45309;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
            <i class="fas fa-shield-alt" style="color:#fff;font-size:1.5rem"></i>
          </div>
          <div style="font-weight:800;font-size:1.05rem;color:#1e293b;margin-bottom:8px">Contrato sem autenticação gov.br</div>
          <div style="font-size:.85rem;color:#475569;line-height:1.6;margin-bottom:16px">
            Seu contrato foi enviado anteriormente <strong>sem a assinatura digital via gov.br</strong>.
            Para regularizar, você precisa:<br><br>
            <ol style="text-align:left;padding-left:20px;margin:0 0 10px">
              <li style="margin-bottom:6px">Baixar novamente o contrato</li>
              <li style="margin-bottom:6px">Assinar via <strong><a href="https://assinador.iti.br" target="_blank" style="color:#15803d">assinador.iti.br</a></strong> (conta gov.br Prata ou Ouro)</li>
              <li>Reenviar o PDF assinado pelo app</li>
            </ol>
            <span style="font-size:.79rem;color:#64748b">Isso garante a validade jurídica do documento.</span>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button onclick="document.getElementById('modal-contrato-govbr').remove();renderContratoPendente('${csg.uid}','${csg.hash}');window.appScreen('contrato-pendente')"
              style="background:#1f4e79;color:#fff;border:none;border-radius:10px;padding:12px 20px;font-size:.88rem;font-weight:700;cursor:pointer">
              <i class="fas fa-file-contract"></i> Regularizar Agora
            </button>
            <button onclick="document.getElementById('modal-contrato-govbr').remove()"
              style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:10px;padding:12px 20px;font-size:.88rem;font-weight:600;cursor:pointer">
              Lembrar depois
            </button>
          </div>
          <div style="font-size:.72rem;color:#94a3b8;margin-top:14px">
            <i class="fas fa-info-circle"></i> Este aviso aparecerá a cada login até a regularização
          </div>
        </div>`;
      }, 700);
    }
  }
  window.limparForm();
  // Oferece biometria se disponível e não cadastrada (só se não estiver bloqueado)
  if (!bloqueadoPorTermo) setTimeout(() => window.ofereceRegistrarBiometria(user), 800);
}

window.buildSidebar = function() {
  const pages = window._isAdmin(window.currentUser) ? PAGES.master : window._isFiscal(window.currentUser) ? PAGES.fiscal : window._isObservador(window.currentUser) ? PAGES.observador : PAGES.user;
  document.getElementById('sidebar-nav').innerHTML = pages.map((p,i) =>
    `<a id="nav-${p.id}" onclick="window.showPage('${p.id}')"><i class="fas ${p.icon}"></i><span>${p.label}</span></a>`
  ).join('');
  // Master extras visibility
  if (window._isAdmin(window.currentUser)) {
    document.getElementById('filter-tec').style.display = 'inline-block';
    document.getElementById('btn-del-tudo').style.display = 'inline-flex';
  }
  // Table header
  const isMaster = window._isAdmin(window.currentUser);
  document.getElementById('tabela-header').innerHTML = `
    <th class="reg-hide-md col-idx">#</th>
    <th class="col-data">Data</th><th class="col-os">OS</th>
    <th class="col-profile">Profile</th><th class="col-tipo">Tipo</th>
    ${isMaster?'<th class="col-tec">Prestador</th>':''}
    <th class="col-cidade">Cidade</th>
    <th class="reg-hide-sm col-ref">Referência</th>
    <th class="reg-hide-sm col-cto">CTO/CEO</th>
    <th class="col-svc">Serviços</th>
    <th class="col-total">Total</th>
    <th class="reg-hide-md col-foto">Foto</th>
    <th class="col-act">${isMaster?'Ações':''}</th>`;
}

window.showPage = function(name) {
  // Etapa 2: Dashboard Anual agora é sub-aba de Dashboard
  if (name === 'dashboard') {
    // será tratado abaixo — mostra sub-tab mensal por padrão
  }
  // Etapas 4-7: redirects para novas páginas consolidadas
  if (name === 'tecnicos')   { window.showPage('dashboard'); if(typeof window.dashMostrarSubTab==='function') window.dashMostrarSubTab('prestadores'); return; }
  if (name === 'lancar')     { window.showPage('os'); if(typeof window.osMostrarSubTab==='function') window.osMostrarSubTab('lancar'); return; }
  if (name === 'registros')  { window.showPage('os'); if(typeof window.osMostrarSubTab==='function') window.osMostrarSubTab('registros'); return; }
  if (name === 'relatorio')  { window.showPage('dados'); if(typeof window.dadosMostrarSubTab==='function') window.dadosMostrarSubTab('exportar'); return; }
  if (name === 'importar')   { window.showPage('dados'); if(typeof window.dadosMostrarSubTab==='function') window.dadosMostrarSubTab('importar'); return; }
  if (name === 'precos')     { window.showPage('financeiro'); if(typeof window.finMostrarSubTab==='function') window.finMostrarSubTab('precos'); return; }
  // Etapa 3: Configurações agrupa Minha Empresa + Usuários
  if (name === 'cadastro-admin') {
    window.showPage('configuracoes');
    if (typeof window.cfgMostrarSubTab === 'function') window.cfgMostrarSubTab('empresa');
    return;
  }
  if (name === 'usuarios') {
    window.showPage('configuracoes');
    if (typeof window.cfgMostrarSubTab === 'function') window.cfgMostrarSubTab('usuarios');
    return;
  }
  // Etapa 1: Impostos Mensais agora é sub-aba de Financeiro
  if (name === 'impostos-mensais') {
    window.showPage('financeiro');
    if (typeof window.finMostrarSubTab === 'function') window.finMostrarSubTab('impostos');
    return;
  }
  // Página de preços exige PIN
  if ((name === 'precos' || name === 'tecnicos' || name === 'financeiro') && window._isAdmin(window.currentUser) && !window.precosDesbloqueado) {
    window.abrirPinPrecos(() => window.showPage(name)); return;
  }
  window._revokeAllBlobs(); // Fase5: libera Blob URLs da página anterior
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('#sidebar-nav a').forEach(a=>a.classList.remove('active'));
  const pg = document.getElementById(`page-${name}`);
  if (pg) pg.classList.add('active');
  const nav = document.getElementById(`nav-${name}`);
  if (nav) nav.classList.add('active');
  const _pagesForIcon = window._isAdmin(window.currentUser) ? PAGES.master : window._isFiscal(window.currentUser) ? PAGES.fiscal : window._isObservador(window.currentUser) ? PAGES.observador : PAGES.user;
  document.getElementById('page-title').innerHTML =
    `<i class="fas ${_pagesForIcon.find(p=>p.id===name)?.icon||'fa-circle'}" style="margin-right:8px;color:var(--primary)"></i>${PAGE_TITLES[name]||name}`;

  if (name==='relatorio') {
    window.renderBotoesTecnicos(); renderBotaoTecnicoProprio(); window.renderRelatoriosAssinados();
    // Fiscal: esconde card de Excel (não lança OS)
    const cardExcel = document.getElementById('card-exportar-excel');
    if (cardExcel) cardExcel.style.display = window._isFiscal(window.currentUser) ? 'none' : '';
    // Exportar Documentos: visível para master e fiscal dentro da aba Exportar
    const secDocs = document.getElementById('sec-exportar-docs');
    if (secDocs) {
      if (window._isAdmin(window.currentUser) || window._isFiscal(window.currentUser)) {
        secDocs.style.display = 'block';
        if (typeof window.renderExportarDocsPage === 'function') window.renderExportarDocsPage();
      } else {
        secDocs.style.display = 'none';
      }
    }
  }
  // ── Fase4: Lazy loading — pula re-render se dados não mudaram ──
  const _skipIfCached = (pageName, renderFn) => {
    if (window._pageRenderVersion[pageName] === window._dataVersion) return; // já renderizado com dados atuais
    window._pageRenderVersion[pageName] = window._dataVersion;
    renderFn();
  };
  if (name==='precos') _skipIfCached('precos', window.renderPrecosPage);
  if (name==='tecnicos') _skipIfCached('tecnicos', window.renderTecnicosPage);
  if (name==='os') {
    if(typeof window.osMostrarSubTab==='function') window.osMostrarSubTab('registros');
  }
  if (name==='dados') {
    if(typeof window.dadosMostrarSubTab==='function') window.dadosMostrarSubTab('importar');
  }
  // usuarios: redirecionado para sub-aba de configuracoes (Etapa 3)
  if (name==='dashboard') {
    if (typeof window.dashMostrarSubTab === 'function') window.dashMostrarSubTab('anual');
  }
  if (name==='meu-dash') _skipIfCached('meu-dash', window.renderMeuDash);
  if (name==='importar') window.renderImportarPage();  // sempre recarrega (pode ter importações novas)
  if (name==='dashboard') _skipIfCached('dashboard', window.renderDashboardAnual);
  if (name==='financeiro') {
    _skipIfCached('financeiro', window.renderFinanceiro);
    if (typeof window.finMostrarSubTab === 'function') window.finMostrarSubTab('producao');
  }
  // impostos-mensais: redirecionado para sub-aba de financeiro (ver topo da função)
  if (name==='fiscalizacao') _skipIfCached('fiscalizacao', window.renderFiscalizacao);
  if (name==='inventario') window.renderInventarioFiscal();  // dados de segurança podem mudar externamente
  if (name==='seguranca') window.renderSegurancaPage();  // dados de segurança mudam externamente
  // exportar-docs agora é seção dentro de 'relatorio' — renderizado em window.showPage('relatorio')
  if (name==='meus-docs')    window.renderMeusDocsPage().catch(e => console.error('[renderMeusDocsPage]', e));
  if (name==='observador-dash') window.renderObservadorDash();
  if (name==='observador-regs') window.renderObservadorRegs();
  if (name==='tabela-precos') window.renderTabelaPrecosUser();
  if (name==='configuracoes') {
    if (typeof window.cfgMostrarSubTab === 'function') window.cfgMostrarSubTab('empresa');
  }
  // cadastro-admin: redirecionado para sub-aba de configuracoes (Etapa 3)
}

window.osMostrarSubTab = function(sub) {
  const divR = document.getElementById('os-sub-registros');
  const divL = document.getElementById('os-sub-lancar');
  const btnR = document.getElementById('os-tab-registros');
  const btnL = document.getElementById('os-tab-lancar');
  if (divR) divR.style.display = sub === 'registros' ? '' : 'none';
  if (divL) divL.style.display = sub === 'lancar' ? '' : 'none';
  if (btnR) { btnR.style.color = sub==='registros'?'#1f4e79':'#64748b'; btnR.style.borderBottomColor = sub==='registros'?'#1f4e79':'transparent'; btnR.style.fontWeight = sub==='registros'?'700':'500'; }
  if (btnL) { btnL.style.color = sub==='lancar'?'#1f4e79':'#64748b'; btnL.style.borderBottomColor = sub==='lancar'?'#1f4e79':'transparent'; btnL.style.fontWeight = sub==='lancar'?'700':'500'; }
}

window.dadosMostrarSubTab = function(sub) {
  const divI = document.getElementById('dados-sub-importar');
  const divE = document.getElementById('dados-sub-exportar');
  const btnI = document.getElementById('dados-tab-importar');
  const btnE = document.getElementById('dados-tab-exportar');
  // Apenas admin (master) tem acesso à importação de planilhas
  const soAdmin = typeof window._isAdmin === 'function' && !window._isAdmin(window.currentUser);
  if (btnI) btnI.style.display = soAdmin ? 'none' : '';
  if (soAdmin && sub === 'importar') sub = 'exportar'; // força para exportar
  if (divI) divI.style.display = sub === 'importar' ? '' : 'none';
  if (divE) divE.style.display = sub === 'exportar' ? '' : 'none';
  if (btnI) { btnI.style.color = sub==='importar'?'#1f4e79':'#64748b'; btnI.style.borderBottomColor = sub==='importar'?'#1f4e79':'transparent'; btnI.style.fontWeight = sub==='importar'?'700':'500'; }
  if (btnE) { btnE.style.color = sub==='exportar'?'#1f4e79':'#64748b'; btnE.style.borderBottomColor = sub==='exportar'?'#1f4e79':'transparent'; btnE.style.fontWeight = sub==='exportar'?'700':'500'; }
  // Lazy-load importar (consulta de dados importados)
  if (sub === 'importar') {
    if (typeof window.renderImportarPage === 'function') window.renderImportarPage();
  }
  // Lazy-load exportar (sec-exportar-docs)
  if (sub === 'exportar') {
    const secDocs = document.getElementById('sec-exportar-docs');
    if (secDocs && (typeof window._isAdmin==='function') && (window._isAdmin(window.currentUser) || (typeof window._isFiscal==='function' && window._isFiscal(window.currentUser)))) {
      secDocs.style.display = 'block';
      if (typeof window.renderExportarDocsPage === 'function') window.renderExportarDocsPage();
    }
  }
}

window.cfgMostrarSubTab = function(sub) {
  const tabs = ['empresa', 'usuarios', 'precos', 'documentos'];
  tabs.forEach(t => {
    const div = document.getElementById('cfg-sub-' + t);
    const btn = document.getElementById('cfg-tab-' + t);
    if (div) div.style.display = sub === t ? '' : 'none';
    if (btn) {
      btn.style.color = sub === t ? '#1f4e79' : '#64748b';
      btn.style.borderBottomColor = sub === t ? '#1f4e79' : 'transparent';
      btn.style.fontWeight = sub === t ? '700' : '500';
    }
  });
  // Lazy-load: renderiza a sub-seção apenas se dados mudaram
  if (sub === 'empresa') {
    if (typeof window._pageRenderVersion !== 'undefined' && typeof window._dataVersion !== 'undefined') {
      if (window._pageRenderVersion['cfg-empresa-sub'] !== window._dataVersion) {
        window._pageRenderVersion['cfg-empresa-sub'] = window._dataVersion;
        if (typeof window.renderCadastroAdmin === 'function') window.renderCadastroAdmin();
      }
    }
  }
  if (sub === 'usuarios') {
    if (typeof window._pageRenderVersion !== 'undefined' && typeof window._dataVersion !== 'undefined') {
      if (window._pageRenderVersion['cfg-usuarios-sub'] !== window._dataVersion) {
        window._pageRenderVersion['cfg-usuarios-sub'] = window._dataVersion;
        if (typeof window.renderUsuariosPage === 'function') window.renderUsuariosPage();
      }
    }
  }
  // cfg-sub-precos agora contém apenas Gerenciar Profiles & Cidades (sem tabela de preços)
  if (sub === 'documentos') {
    window.renderDocumentosAutenticados();
  }
}

window.dashMostrarSubTab = function(sub) {
  const divM = document.getElementById('dash-sub-mensal');
  const divA = document.getElementById('dash-sub-anual');
  const divP = document.getElementById('dash-sub-prestadores');
  const btnM = document.getElementById('dash-tab-mensal');
  const btnA = document.getElementById('dash-tab-anual');
  const btnP = document.getElementById('dash-tab-prestadores');
  if (divM) divM.style.display = sub === 'mensal' ? '' : 'none';
  if (divA) divA.style.display = sub === 'anual' ? '' : 'none';
  if (divP) divP.style.display = sub === 'prestadores' ? '' : 'none';
  if (btnM) {
    btnM.style.color = sub === 'mensal' ? '#1f4e79' : '#64748b';
    btnM.style.borderBottomColor = sub === 'mensal' ? '#1f4e79' : 'transparent';
    btnM.style.fontWeight = sub === 'mensal' ? '700' : '500';
  }
  if (btnA) {
    btnA.style.color = sub === 'anual' ? '#1f4e79' : '#64748b';
    btnA.style.borderBottomColor = sub === 'anual' ? '#1f4e79' : 'transparent';
    btnA.style.fontWeight = sub === 'anual' ? '700' : '500';
  }
  if (btnP) {
    btnP.style.color = sub === 'prestadores' ? '#1f4e79' : '#64748b';
    btnP.style.borderBottomColor = sub === 'prestadores' ? '#1f4e79' : 'transparent';
    btnP.style.fontWeight = sub === 'prestadores' ? '700' : '500';
  }
  // Lazy-load: renderiza dashboard anual apenas se dados mudaram
  // Chave separada de 'dashboard' para não colidir com cache do mensal
  if (sub === 'anual') {
    if (typeof window._pageRenderVersion !== 'undefined' && typeof window._dataVersion !== 'undefined') {
      if (window._pageRenderVersion['dashboard-anual-sub'] !== window._dataVersion) {
        window._pageRenderVersion['dashboard-anual-sub'] = window._dataVersion;
        if (typeof window.renderDashboardAnual === 'function') window.renderDashboardAnual();
      }
    }
  }
  // Lazy-load: renderiza dashboard mensal se dados mudaram
  if (sub === 'mensal') {
    if (typeof window._pageRenderVersion !== 'undefined' && typeof window._dataVersion !== 'undefined') {
      if (window._pageRenderVersion['dashboard-mensal-sub'] !== window._dataVersion) {
        window._pageRenderVersion['dashboard-mensal-sub'] = window._dataVersion;
        if (typeof window.renderDashboard === 'function') window.renderDashboard();
      }
    }
  }
  // Lazy-load: renderiza Prestadores se dados mudaram
  if (sub === 'prestadores') {
    if (typeof window._pageRenderVersion !== 'undefined' && typeof window._dataVersion !== 'undefined') {
      if (window._pageRenderVersion['dashboard-prestadores-sub'] !== window._dataVersion) {
        window._pageRenderVersion['dashboard-prestadores-sub'] = window._dataVersion;
        if (typeof window.renderTecnicosPage === 'function') window.renderTecnicosPage();
      }
    }
  }
}

window.finMostrarSubTab = function(sub) {
  const divP = document.getElementById('fin-sub-producao');
  const divI = document.getElementById('fin-sub-impostos');
  const divPr = document.getElementById('fin-sub-precos');
  const btnP = document.getElementById('fin-tab-producao');
  const btnI = document.getElementById('fin-tab-impostos');
  const btnPr = document.getElementById('fin-tab-precos');
  if (divP) divP.style.display = sub === 'producao' ? '' : 'none';
  if (divI) divI.style.display = sub === 'impostos' ? '' : 'none';
  if (divPr) divPr.style.display = sub === 'precos' ? '' : 'none';
  if (btnP) {
    btnP.style.color = sub === 'producao' ? '#1f4e79' : '#64748b';
    btnP.style.borderBottomColor = sub === 'producao' ? '#1f4e79' : 'transparent';
    btnP.style.fontWeight = sub === 'producao' ? '700' : '500';
  }
  if (btnI) {
    btnI.style.color = sub === 'impostos' ? '#1f4e79' : '#64748b';
    btnI.style.borderBottomColor = sub === 'impostos' ? '#1f4e79' : 'transparent';
    btnI.style.fontWeight = sub === 'impostos' ? '700' : '500';
  }
  if (btnPr) {
    btnPr.style.color = sub === 'precos' ? '#1f4e79' : '#64748b';
    btnPr.style.borderBottomColor = sub === 'precos' ? '#1f4e79' : 'transparent';
    btnPr.style.fontWeight = sub === 'precos' ? '700' : '500';
  }
  // Lazy-load: renderiza impostos apenas se dados mudaram
  if (sub === 'impostos') {
    if (typeof window._pageRenderVersion !== 'undefined' && typeof window._dataVersion !== 'undefined') {
      if (window._pageRenderVersion['impostos-mensais'] !== window._dataVersion) {
        window._pageRenderVersion['impostos-mensais'] = window._dataVersion;
        if (typeof initImpostos === 'function') initImpostos();
      }
    }
  }
  // Lazy-load: renderiza tabela de preços apenas se dados mudaram
  if (sub === 'precos') {
    if (typeof window._pageRenderVersion !== 'undefined' && typeof window._dataVersion !== 'undefined') {
      if (window._pageRenderVersion['fin-precos-sub'] !== window._dataVersion) {
        window._pageRenderVersion['fin-precos-sub'] = window._dataVersion;
        if (typeof window.renderPrecosPage === 'function') window.renderPrecosPage();
      }
    }
  }
}
