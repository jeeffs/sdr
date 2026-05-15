// src/admin/os.js
// Carregamento de dados, CRUD de OS, tabela e termos de aceite
// Extraído de admin.html — Fase B

// ── Índice fbKey → record (O(1)) ──
window._getRecordByKey = function(fbKey) { return window._recordsByKey?.[fbKey] || null; };


// ── Estado: qual janela de OS carregar ──
// Default: 'atual_anterior' (mês corrente + mês anterior) — bate com fluxo de fechamento.
// 'tudo' = histórico completo. 'mes:YYYY-MM' = um mês específico.
let _osLoadMode = 'atual_anterior';
window._setOsLoadMode = function(mode) {
  _osLoadMode = mode;
  console.log('[SDR Admin] _osLoadMode →', mode);
  return carregarDados();
};
window._getOsLoadMode = function() { return _osLoadMode; };

function _osLoadStartAt(mode) {
  const hoje = new Date();
  if (mode === 'atual_anterior') {
    const mesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    return mesAnt.toISOString().slice(0, 10);
  }
  if (mode && mode.startsWith('mes:')) {
    return mode.slice(4) + '-01';
  }
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}

function _osLoadEndAt(mode) {
  if (mode && mode.startsWith('mes:')) {
    return mode.slice(4) + '-31';
  }
  return null;
}

async function carregarDados() {
  _dataVersion++;
  Object.keys(_pageRenderVersion).forEach(k => delete _pageRenderVersion[k]);
  _precosHistoricoMes = null;

  // ── Query: REST direto para queries filtradas ──
  // IMPORTANTE: o monkey-patch do admin substitui apenas db.ref(path).once(),
  // não funciona com .orderByChild().startAt().once() (que retorna Query do SDK
  // não patched e cai no WebSocket que está falhando — audit 13/05 C3).
  let raw;
  if (_osLoadMode === 'tudo') {
    const snap = await db.ref('os').once('value');  // já passa pelo patch REST
    raw = snap.val() || {};
  } else {
    const _fbUser = firebase.auth().currentUser;
    const _tk     = _fbUser ? await _fbUser.getIdToken() : null;
    const _base   = 'https://solucaoderua-default-rtdb.firebaseio.com';
    const startAt = _osLoadStartAt(_osLoadMode);
    const endAt   = _osLoadEndAt(_osLoadMode);

    const params = [
      'orderBy=' + encodeURIComponent('"data"'),
      'startAt=' + encodeURIComponent('"' + startAt + '"'),
    ];
    if (endAt) params.push('endAt=' + encodeURIComponent('"' + endAt + '"'));
    if (_tk)   params.push('auth=' + _tk);

    const _resp = await fetch(_base + '/os.json?' + params.join('&'),
      { signal: AbortSignal.timeout(30000) });
    raw = _resp.ok ? (await _resp.json() || {}) : {};
  }

  allRecords = Object.entries(raw).map(([fbKey, v]) => {
    if (v.servicos) v.servicos.forEach(sv => { if (sv.tipo) sv.tipo = _normTipo(sv.tipo); });
    if (v.tipo) v.tipo = _normTipo(v.tipo);
    return {...v, fbKey};
  });
  // Fallback para 'data' quando criado_em ausente (registros legados)
  allRecords.sort((a,b)=>new Date(b.criado_em||b.data||0)-new Date(a.criado_em||a.data||0));

  _recordsByKey = {};
  allRecords.forEach(r => { _recordsByKey[r.fbKey] = r; });

  console.log('[SDR Admin] carregarDados:', _osLoadMode, '→', allRecords.length, 'registros');

  await _carregarTodosPrecos();
  buildServiceRows();

  usersCache = await _dbRead('users', {});
  if (_isAdmin(currentUser)) {
    await Promise.all([
      carregarDescontos(),
      carregarServicosFixos(),
    ]);
    assinaturaMaster = await _dbRead('config/assinatura_master', null);
  } else {
    await Promise.all([
      carregarDescontosTec(currentUser.id),
      carregarServicosFixos(),
    ]);
  }
  popularFiltros();
  _tabelaPagina = 0;
  renderTabela(filteredRecords());
  renderBotoesTecnicos();
  const count = filteredRecords().length;
  const countEl = document.getElementById('topbar-count');
  if (countEl) countEl.textContent = `${count} registro${count!==1?'s':''}`;
}

function _validarOS() {
  const erros = [];
  const profile = document.getElementById('f-profile').value.trim();
  if (!profile) erros.push('Selecione o Profile!');
  const tipo_os = document.getElementById('f-tipo').value.trim();
  if (!tipo_os) erros.push('Selecione o Tipo!');
  const cto = document.getElementById('f-cto').value.trim();
  if (!cto) erros.push('Preencha o campo CTO / CEO!');

  const cidadeSelect = document.getElementById('f-cidade').value;
  const cidade = cidadeSelect==='_outro'
    ? (document.getElementById('f-cidade-custom').value.trim().toUpperCase()||'')
    : cidadeSelect;
  if (!cidade) erros.push('Selecione uma cidade!');

  // Validação Profile × Cidade
  if (profile && cidade) {
    const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
    const cidNorm = norm(cidade);
    const profilesDaCidade = Object.entries(profilesCidades)
      .filter(([, cids]) => cids.some(c => { const cn = norm(c); return cn === cidNorm || cn.includes(cidNorm) || cidNorm.includes(cn); }))
      .map(([p]) => p);
    if (profilesDaCidade.length > 0 && !profilesDaCidade.includes(profile.toUpperCase())) {
      const sugerido = profilesDaCidade.join(' ou ');
      const profileSel = document.getElementById('f-profile');
      if (profileSel) { profileSel.style.border = '2px solid #dc2626'; profileSel.style.background = '#fff1f1'; profileSel.focus(); }
      erros.push(`Divergência de Profile! A cidade "${cidade}" pertence a ${sugerido}. Corrija o Profile antes de salvar.`);
    } else {
      const profileSel = document.getElementById('f-profile');
      if (profileSel) { profileSel.style.border = ''; profileSel.style.background = ''; }
    }
  }

  // Validação serviços
  for (let i=1;i<=MAX_SERVICOS_POR_OS;i++) {
    const t = document.getElementById(`s-tipo-${i}`).value;
    const q = parseInt(document.getElementById(`s-qtd-${i}`).value)||0;
    if (t && q <= 0) erros.push(`Informe a quantidade do ${i}º serviço!`);
  }
  const tipo1 = document.getElementById('s-tipo-1').value;
  const qtd1  = parseInt(document.getElementById('s-qtd-1').value)||0;
  if (!tipo1 || qtd1 <= 0) erros.push('O 1º serviço com quantidade é obrigatório!');

  return { valido: erros.length === 0, erros, cidade };
}

function _montarObjOS(cidade) {
  const servicos = [];
  for (let i=1;i<=MAX_SERVICOS_POR_OS;i++) {
    const tipo = document.getElementById(`s-tipo-${i}`).value;
    if (!tipo) continue;
    const qtd = parseInt(document.getElementById(`s-qtd-${i}`).value)||0;
    const val = parseFloat(document.getElementById(`s-val-${i}`).value)||0;
    servicos.push({tipo, qtd, valor:val, total:qtd*val});
  }
  if (!servicos.length) return null;

  const total = servicos.reduce((s,x)=>s+x.total,0);
  return {
    userId: currentUser.id,
    userName: currentUser.name,
    data: document.getElementById('f-data').value,
    hora: document.getElementById('f-hora').value,
    codigo_os: document.getElementById('f-codigo').value.trim(),
    profile: document.getElementById('f-profile').value,
    tipo: document.getElementById('f-tipo').value,
    cidade, referencia: document.getElementById('f-referencia').value.trim(),
    cto_ceo: document.getElementById('f-cto').value.trim(),
    lat: document.getElementById('f-lat').value||null,
    lon: document.getElementById('f-lon').value||null,
    foto: fotoBase64 || null,
    servicos, total,
    criado_em: new Date().toISOString(),
    validacaoFiscal: 'pendente',
    importado: false
  };
}

async function salvarOS(e) {
  try {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar');
    if (!btn) return;
    btn.disabled = true;

    // Verificação: Termo de Aceite de Serviços
    if (!_isAdmin(currentUser) && !_isFiscal(currentUser)) {
      const termoAceito = await verificarTermoServicos();
      if (!termoAceito) { mostrarTermoServicos(); btn.disabled = false; return; }
    }

    // Validação
    const { valido, erros, cidade } = _validarOS();
    if (!valido) { toast(erros[0], 'error'); btn.disabled=false; return; }

    // Montagem do objeto
    const record = _montarObjOS(cidade);
    if (!record) { toast('Adicione pelo menos 1 serviço!','error'); btn.disabled=false; return; }

    // BLOQUEIO: Jefferson nunca tem V1/V2 — somente V3
    // Mantém total (valor base do OS) mas define totalV3 e não cria totalV1/totalV2
    if ((currentUser.name || '').toUpperCase().includes('JEFFERSON')) {
      record.totalV3 = record.servicos.reduce((s, sv) => s + (sv.total || 0), 0);
    }

    // Salvar no Firebase
    const _pushKey = await _dbPush('os', record);
    if (!_pushKey) return;
    toast('OS salva com sucesso!','success');
    await carregarDados();
    limparForm();
    btn.disabled = false;
    showPage('registros');
  } catch(e) {
    console.error('[salvarOS]', e);
    toast('Erro ao salvar OS. Tente novamente.', 'error');
    const btn = document.getElementById('btn-salvar');
    if (btn) btn.disabled = false;
  }
}

window.renderTabelaPrecosUser = function() {
  const nivel = usersCache[currentUser?.id]?.nivel || 'V1';
  const precos = nivel === 'V2' ? precosV2map : precosV1map;
  const nomeNivel = _safeNivel(nivel);
  const body = document.getElementById('tabela-precos-user-body');
  if (!body) return;
  let html = `<div style="margin-bottom:14px;font-size:.82rem;color:var(--muted)"><i class="fas fa-info-circle" style="margin-right:4px"></i>Nível: <strong>${nomeNivel}</strong> — Passe o mouse sobre o serviço para ver a descrição.</div>`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:.85rem">
    <thead><tr style="background:#f1f5f9">
      <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e2e8f0;font-weight:700">#</th>
      <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e2e8f0;font-weight:700">Serviço</th>
      <th style="text-align:right;padding:10px 12px;border-bottom:2px solid #e2e8f0;font-weight:700">Valor (R$)</th>
    </tr></thead><tbody>`;
  SERVICOS.forEach((s, i) => {
    const val = precos[s] ?? 0;
    const desc = SERVICOS_DESC[s] || '';
    const descAttr = desc ? ` title="${desc.replace(/"/g,'&quot;')}" style="cursor:help;border-bottom:1px dotted #94a3b8"` : '';
    html += `<tr style="border-bottom:1px solid #f1f5f9${i%2?';background:#f8fafc':''}">
      <td style="padding:8px 12px;color:#94a3b8;font-size:.78rem">${i+1}</td>
      <td style="padding:8px 12px"><span${descAttr}>${s}</span></td>
      <td style="padding:8px 12px;text-align:right;font-weight:600;font-family:monospace">${typeof val==='number'?val.toFixed(2).replace('.',','):val}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  body.innerHTML = html;
};

function _montarCorpoTermoServicos() {
  const nivel = usersCache[currentUser?.id]?.nivel || 'V1';
  const precos = nivel === 'V2' ? precosV2map : precosV1map;
  const nomeNivel = _safeNivel(nivel);
  const nomeUsuario = currentUser?.name || '';
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  let tabelaServicos = '<table style="width:100%;border-collapse:collapse;font-size:.8rem;margin:12px 0">';
  tabelaServicos += '<thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1">Serviço</th><th style="text-align:left;padding:6px 8px;border-bottom:2px solid #cbd5e1">Descrição</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid #cbd5e1">Valor (R$)</th></tr></thead><tbody>';
  SERVICOS.forEach((s, i) => {
    const val = precos[s] ?? 0;
    const desc = SERVICOS_DESC[s] || '—';
    tabelaServicos += `<tr style="${i%2?'background:#f8fafc':''}"><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-weight:600">${s}</td><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:.78rem">${desc}</td><td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:monospace">${typeof val==='number'?val.toFixed(2).replace('.',','):val}</td></tr>`;
  });
  tabelaServicos += '</tbody></table>';

  return `
    <p style="text-align:center;font-weight:800;font-size:1rem;margin-bottom:18px;color:#1e293b">TERMO DE ACEITE DE PRESTAÇÃO DE SERVIÇOS</p>

    <p><strong>PRESTADOR(A) DE SERVIÇOS:</strong> ${nomeUsuario}</p>
    <p><strong>NÍVEL CONTRATUAL:</strong> ${nomeNivel}</p>
    <p><strong>DATA:</strong> ${dataHoje}</p>

    <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0">

    <p style="font-weight:700;color:#1e40af">CLÁUSULA PRIMEIRA — DO OBJETO</p>
    <p>O(A) PRESTADOR(A) DE SERVIÇOS, na qualidade de profissional autônomo(a), sem qualquer vínculo empregatício com a CONTRATANTE, declara ciência e concordância com os termos e condições estabelecidos neste instrumento para a prestação de serviços de infraestrutura de rede óptica, nos termos dos artigos 593 a 609 do Código Civil Brasileiro (Lei nº 10.406/2002).</p>

    <p style="font-weight:700;color:#1e40af;margin-top:14px">CLÁUSULA SEGUNDA — DA TABELA DE SERVIÇOS E VALORES</p>
    <p>O(A) PRESTADOR(A) declara ter pleno conhecimento dos serviços descritos na tabela abaixo, incluindo suas respectivas descrições operacionais e valores unitários vigentes para o nível <strong>${nomeNivel}</strong>:</p>
    ${tabelaServicos}
    <p style="font-size:.78rem;color:#64748b"><em>Os valores acima poderão ser reajustados pela CONTRATANTE mediante comunicação prévia ao PRESTADOR(A), conforme cláusula contratual de remuneração.</em></p>

    <p style="font-weight:700;color:#1e40af;margin-top:14px">CLÁUSULA TERCEIRA — DA VERACIDADE DAS INFORMAÇÕES</p>
    <p>O(A) PRESTADOR(A) compromete-se a registrar no sistema todas as informações referentes aos serviços executados com total veracidade, incluindo, mas não se limitando a: tipo de serviço, quantidades, localização (CTO/CEO), cidade, profile e demais dados solicitados.</p>
    <p>Declara estar ciente de que informações inverídicas ou fraudulentas constituem falta grave, podendo ensejar a rescisão imediata do contrato de prestação de serviços, sem prejuízo das medidas legais cabíveis nos termos da legislação civil e penal vigente.</p>

    <p style="font-weight:700;color:#1e40af;margin-top:14px">CLÁUSULA QUARTA — DA NATUREZA DA RELAÇÃO</p>
    <p>As partes declaram expressamente que a presente relação é de natureza exclusivamente civil, regida pelo Código Civil Brasileiro, <strong>não configurando, sob hipótese alguma, vínculo empregatício, subordinação, habitualidade ou pessoalidade</strong> entre o(a) PRESTADOR(A) e a CONTRATANTE, nos termos do art. 442 da CLT e jurisprudência consolidada.</p>
    <p>O(A) PRESTADOR(A) é o(a) único(a) responsável pelo recolhimento de seus tributos, encargos sociais e previdenciários.</p>

    <p style="font-weight:700;color:#1e40af;margin-top:14px">CLÁUSULA QUINTA — DO ACEITE DIGITAL</p>
    <p>O aceite digital deste termo, mediante clique no botão "Aceitar e Prosseguir", possui validade jurídica equivalente à assinatura manuscrita, conforme Lei nº 14.063/2020 (assinaturas eletrônicas) e Medida Provisória nº 2.200-2/2001 (ICP-Brasil), sendo registrado com data, hora e identificação do usuário no sistema.</p>

    <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0">
    <p style="font-size:.8rem;color:#64748b;text-align:center"><em>Ao aceitar este termo, o(a) PRESTADOR(A) confirma que leu, compreendeu e concorda integralmente com todas as cláusulas acima descritas.</em></p>
  `;
}

async function verificarTermoServicos() {
  if (!currentUser || _isAdmin(currentUser) || _isFiscal(currentUser) || _isObservador(currentUser)) return true;
  try {
    const snap = await db.ref(`users/${currentUser.id}/termoServicosAceito`).once('value');
    return snap.val() === true;
  } catch(e) { console.error('[verificarTermoServicos]', e); return true; }
}

function mostrarTermoServicos() {
  const corpo = document.getElementById('termo-servicos-corpo');
  if (corpo) corpo.innerHTML = _montarCorpoTermoServicos();
  const chk = document.getElementById('chk-termo-servicos');
  const btn = document.getElementById('btn-aceitar-termo-servicos');
  if (chk) { chk.checked = false; chk.onchange = () => { if(btn) btn.disabled = !chk.checked; }; }
  if (btn) btn.disabled = true;
  document.getElementById('modal-termo-servicos').style.display = 'block';
}

async function aceitarTermoServicos() {
  const chk = document.getElementById('chk-termo-servicos');
  if (!chk || !chk.checked) return;
  try {
    await _dbSet(`users/${currentUser.id}/termoServicosAceito`, true);
    await db.ref(`users/${currentUser.id}/termoServicosData`).set(new Date().toISOString());
    document.getElementById('modal-termo-servicos').style.display = 'none';
    toast('Termo aceito com sucesso!', 'success');
  } catch(e) {
    console.error('[aceitarTermoServicos]', e);
    toast('Erro ao registrar aceite. Tente novamente.', 'error');
  }
}

async function deletarOS(fbKey) {
  // Importada concluída só pode ser excluída pelo master
  const _rd = allRecords.find(r => r.fbKey === fbKey);
  if (_rd && _isImportadaConcluida(_rd) && !_isAdmin(currentUser)) {
    toast('OS importada (histórica) não pode ser excluída.', 'error'); return;
  }
  try {
    await _dbRemove(`os/${fbKey}`);
    await carregarDados();
    toast('Registro excluído.','success');
  } catch(e) {
    console.error('[deletarOS]', e);
    toast('Erro ao excluir registro. Tente novamente.', 'error');
  }
}

function confirmarDel(fbKey) {
  const r = allRecords.find(x => x.fbKey === fbKey);
  const desc = r ? ` (OS ${r.codigo_os || fbKey})` : '';
  if (!confirm(`Excluir o registro${desc}?\n\nEsta ação não pode ser desfeita.`)) return;
  deletarOS(fbKey);
}

async function confirmarLimparTudo() {
  if (!_isAdmin(currentUser)) { toast('Sem permissão para esta ação.', 'error'); return; }
  const total = allRecords.length;
  if (!total) { toast('Não há registros para excluir.', 'warning'); return; }
  const confirmMsg = `⚠️ ATENÇÃO: Isso excluirá TODOS os ${total} registro(s) de OS do banco de dados.\n\nDigite CONFIRMAR para prosseguir:`;
  const input = window.prompt(confirmMsg);
  if ((input || '').trim().toUpperCase() !== 'CONFIRMAR') {
    toast('Operação cancelada.', 'warning'); return;
  }
  try {
    toast('Excluindo todos os registros...', 'warning');
    await _dbRemove('os');
    await carregarDados();
    toast(`${total} registro(s) excluído(s) com sucesso.`, 'success');
  } catch(e) {
    console.error('[confirmarLimparTudo]', e);
    toast('Erro ao excluir registros. Tente novamente.', 'error');
  }
}

function filteredRecords() {
  if (!_isAdmin(currentUser)) {
    // Prestadores: apenas mês atual e mês anterior
    const h = new Date();
    const mesAtual = `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`;
    const dA = new Date(h.getFullYear(), h.getMonth()-1, 1);
    const mesAnt = `${dA.getFullYear()}-${String(dA.getMonth()+1).padStart(2,'0')}`;
    return allRecords.filter(r => r.userId===currentUser.id && (r.data||'').slice(0,7) >= mesAnt);
  }
  return allRecords;
}

function filtrarTabela() {
  const q      = document.getElementById('search-input').value.toLowerCase();
  const imp    = document.getElementById('filter-importado')?.value || '';
  let base = _isAdmin(currentUser) ? allRecords : filteredRecords();

  // Para o master: atualiza o dropdown de técnicos conforme o filtro importado,
  // preservando a seleção atual se ainda válida
  if (_isAdmin(currentUser)) _atualizarDropdownTecnicos();

  // Lê técnico e cidade APÓS atualizar os dropdowns (a seleção pode ter sido resetada)
  const tec    = _isAdmin(currentUser) ? document.getElementById('filter-tec').value : currentUser.id;
  const cidade = document.getElementById('filter-cidade').value;

  // Registros sem o filtro de cidade (para calcular quais cidades ficam habilitadas)
  const semCidade = base.filter(r => {
    const matchQ   = !q || [r.codigo_os,r.cidade,r.referencia,r.cto_ceo,r.userName,...(r.servicos||[]).map(s=>s.tipo)]
      .join(' ').toLowerCase().includes(q);
    const matchT   = !tec || (_isAdmin(currentUser) ? r.userId === tec : true);
    const matchImp = imp==='' || (imp==='imp' && r.importado) || (imp==='nao' && !r.importado);
    return matchQ && matchT && matchImp;
  });

  // Atualiza dropdown de cidades com base nos filtros ativos (exceto cidade) — para todos os perfis
  _atualizarDropdownCidades(semCidade);

  // Aplica também o filtro de cidade para renderizar a tabela
  const filtered = semCidade.filter(r => !cidade || r.cidade === cidade);
  renderTabela(filtered);
}

function renderTabela(records) {
  const body = document.getElementById('tabela-body');
  const pagDiv = document.getElementById('tabela-paginacao');
  const isMaster = _isAdmin(currentUser);
  if (!records||!records.length) {
    body.innerHTML='';
    if (pagDiv) pagDiv.style.display='none';
    document.getElementById('registros-empty').style.display='block';
    document.getElementById('tabela-registros').style.display='none';
    return;
  }
  document.getElementById('registros-empty').style.display='none';
  document.getElementById('tabela-registros').style.display='table';
  const sorted=[...records].sort((a,b)=>new Date(b.criado_em||0)-new Date(a.criado_em||0));

  // ── Fase4: Paginação ──
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  if (_tabelaPagina >= totalPages) _tabelaPagina = Math.max(0, totalPages - 1);
  const pageRecords = sorted.slice(_tabelaPagina * PAGE_SIZE, (_tabelaPagina + 1) * PAGE_SIZE);
  const offset = _tabelaPagina * PAGE_SIZE;

  body.innerHTML=pageRecords.map((r,idx)=>{
    // OS importada: sv.valor = total histórico da planilha | OS manual: sv.total = qtd × preço
    const svsDesc=r.servicos?.map(s=>{
      const svTotal = s.total !== undefined ? s.total : s.valor;
      return `<div style="font-size:.74rem;white-space:nowrap">${s.tipo} (${s.qtd}x) — ${fmtMoeda(svTotal)}</div>`;
    }).join('')||'';
    const badge=r.profile==='MATRIZ'?`<span class="badge badge-matriz">MATRIZ</span>`:`<span class="badge badge-filial">FILIAL</span>`;
    const gps=r.lat?`<i class="fas fa-map-marker-alt" style="color:var(--success);font-size:.78rem;margin-left:4px" title="${r.lat},${r.lon}"></i>`:'';
    return `<tr>
      <td class="reg-hide-md col-idx" style="color:var(--muted)">${offset+idx+1}</td>
      <td class="col-data" style="white-space:nowrap">${fmtData(r.data)}${r.hora?`<br><span style="font-size:.7em;color:var(--muted)">${r.hora}</span>`:''}</td>
      <td class="col-os" style="font-weight:600">${r.codigo_os||'—'}${r.importado?`<span style="display:inline-block;margin-left:3px;font-size:.6rem;font-weight:700;background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:4px;vertical-align:middle">IMP</span>`:''}</td>
      <td class="col-profile">${badge}</td>
      <td class="col-tipo">${r.tipo||'—'}</td>
      ${isMaster?`<td class="col-tec">${r.userName||'—'}</td>`:''}
      <td class="col-cidade">${r.cidade||'—'}</td>
      <td class="reg-hide-sm col-ref">${r.referencia||'—'}${gps}</td>
      <td class="reg-hide-sm col-cto">${r.cto_ceo||'—'}</td>
      <td class="col-svc">${svsDesc}</td>
      <td class="col-total total-row" style="white-space:nowrap">${fmtMoeda(r.total)}</td>
      <td class="reg-hide-md col-foto" style="text-align:center">${r.foto?`<img src="${r.foto}" alt="foto" style="width:38px;height:38px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer" onclick="abrirFotoModal('${r.fbKey}')" title="Ver foto">`:'<span style="color:var(--muted)">—</span>'}</td>
      <td class="col-act" style="white-space:nowrap;text-align:center">
        ${isMaster?`
          <button class="btn btn-sm" style="background:#e0f2fe;color:#0369a1;margin-right:2px" onclick="verDetalhe('${r.fbKey}')" title="Detalhes"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;margin-right:2px" onclick="editarOS('${r.fbKey}')" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="confirmarDel('${r.fbKey}')" title="Excluir"><i class="fas fa-trash"></i></button>
        `:`<button class="btn btn-sm" style="background:#e0f2fe;color:#0369a1" onclick="verDetalhe('${r.fbKey}')"><i class="fas fa-eye"></i></button>`}
      </td>
    </tr>`;
  }).join('');
  document.getElementById('topbar-count').textContent=`${sorted.length} registro${sorted.length!==1?'s':''}`;

  // ── Controles de paginação ──
  if (pagDiv) {
    if (totalPages <= 1) { pagDiv.style.display='none'; }
    else {
      pagDiv.style.display='block';
      const btnS = 'padding:5px 12px;margin:0 2px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:.8rem;font-weight:600;color:#334155';
      const btnDis = 'padding:5px 12px;margin:0 2px;border:1px solid #e5e7eb;border-radius:6px;background:#f8fafc;cursor:default;font-size:.8rem;font-weight:600;color:#cbd5e1';
      const isFirst = _tabelaPagina === 0;
      const isLast = _tabelaPagina >= totalPages - 1;
      pagDiv.innerHTML = `
        <button style="${isFirst?btnDis:btnS}" onclick="_tabelaPagina=0;filtrarTabela()" ${isFirst?'disabled':''}>«</button>
        <button style="${isFirst?btnDis:btnS}" onclick="_tabelaPagina--;filtrarTabela()" ${isFirst?'disabled':''}>‹</button>
        <span style="margin:0 10px;font-size:.82rem;color:#64748b">
          Página <b style="color:#1f4e79">${_tabelaPagina+1}</b> de <b>${totalPages}</b>
          <span style="color:#94a3b8;margin-left:6px">(${sorted.length} registros)</span>
        </span>
        <button style="${isLast?btnDis:btnS}" onclick="_tabelaPagina++;filtrarTabela()" ${isLast?'disabled':''}>›</button>
        <button style="${isLast?btnDis:btnS}" onclick="_tabelaPagina=${totalPages-1};filtrarTabela()" ${isLast?'disabled':''}>»</button>
      `;
    }
  }
}

// ── Formulário de OS: buildServiceRows, preencherPreco, calcTotal, gerarCodigoOS ──

function getActivePriceMap() {
  const nivel = currentUser?.nivel || 'V1';
  if (nivel === 'V3' || nivel === 'V4') return window.precosV3map || {};
  return window.precosV1map || {};
}

function buildServiceRows() {
  const c = document.getElementById('servicos-rows');
  if (!c) return;
  c.innerHTML = '';
  const svcs = window.SERVICOS || [];
  for (let i = 1; i <= 5; i++) {
    const opts = svcs.map(s => `<option>${s}</option>`).join('');
    c.innerHTML += `<div class="service-row">
      <select id="s-tipo-${i}" onchange="preencherPreco(${i})">
        <option value="">-- ${i}º Serviço --</option>${opts}
      </select>
      <input type="number" id="s-qtd-${i}" placeholder="Qtde" min="0" step="1"
        oninput="this.value=Math.floor(Math.abs(this.value))||'';calcTotal()">
      <div style="position:relative">
        <input type="number" id="s-val-${i}" placeholder="Sem preço" min="0" step="0.01"
          style="background:#f0fdf4;padding-right:26px;width:100%" readonly
          title="Valor da Tabela de Preços">
        <i class="fas fa-lock" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:.68rem;pointer-events:none"></i>
      </div>
    </div>`;
  }
}

function preencherPreco(i) {
  const tipoEl = document.getElementById(`s-tipo-${i}`);
  const vi = document.getElementById(`s-val-${i}`);
  if (!tipoEl || !vi) return;
  const tipo = tipoEl.value;
  const pm = getActivePriceMap();
  vi.value = (tipo && pm && pm[tipo] !== undefined) ? pm[tipo] : '';
  calcTotal();
}

function calcTotal() {
  let t = 0;
  for (let i = 1; i <= 5; i++) {
    t += (parseInt(document.getElementById(`s-qtd-${i}`)?.value) || 0)
       * (parseFloat(document.getElementById(`s-val-${i}`)?.value) || 0);
  }
  const el = document.getElementById('total-preview');
  if (el) el.innerHTML = typeof window.fmtMoeda === 'function' ? window.fmtMoeda(t) : `R$ ${t.toFixed(2)}`;
}

async function gerarCodigoOS() {
  const icon = document.getElementById('icon-os');
  if (icon) icon.classList.add('fa-spinner', 'fa-spin');
  const ano = new Date().getFullYear();
  const doAno = (allRecords || []).filter(r => r.data && r.data.startsWith(String(ano)));
  const seq = String(doAno.length + 1).padStart(4, '0');
  const fCodigo = document.getElementById('f-codigo');
  if (fCodigo) fCodigo.value = `OS-${ano}-${seq}`;
  if (icon) setTimeout(() => icon.classList.remove('fa-spinner', 'fa-spin'), 400);
}

// ── Filtros e dropdowns da tabela de OS ──

function _atualizarDropdownTecnicos() {
  const imp = document.getElementById('filter-importado')?.value || '';
  const base = imp === ''    ? allRecords
             : imp === 'imp' ? allRecords.filter(r =>  r.importado)
             :                 allRecords.filter(r => !r.importado);
  const comOS = new Set(base.map(r => r.userId).filter(Boolean));
  const todosUsers = Object.entries(usersCache)
    .filter(([, u]) => u.ativo !== false && !u.firstLogin && u.name)
    .sort((a, b) => (a[1].name || '').localeCompare(b[1].name || '', 'pt-BR'));
  ['filter-tec', 'exp-tec'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const prev = el.value;
    const first = el.options[0].outerHTML;
    el.innerHTML = first + todosUsers.map(([uid, u]) =>
      comOS.has(uid)
        ? `<option value="${uid}">${u.name}</option>`
        : `<option value="${uid}" disabled style="color:#cbd5e1">${u.name} (sem OS)</option>`
    ).join('');
    if (prev && comOS.has(prev)) el.value = prev;
    else if (prev) el.value = '';
  });
}

function _atualizarDropdownCidades(activeRecords) {
  ['filter-cidade','exp-cidade'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const prev = el.value;
    const first = el.options[0].outerHTML;
    const todasCidades = [
      ...new Set([
        ...(profilesCidades.FILIAL || []),
        ...(profilesCidades.MATRIZ || []),
        ...allRecords.filter(r => r.cidade).map(r => r.cidade)
      ])
    ].sort();
    if (!_isAdmin(currentUser)) {
      const comOS = new Set((activeRecords||[]).filter(r => r.cidade).map(r => r.cidade));
      el.innerHTML = first + todasCidades.map(c =>
        comOS.has(c)
          ? `<option value="${c}">${c}</option>`
          : `<option value="${c}" disabled style="color:#cbd5e1">${c} (sem OS)</option>`
      ).join('');
    } else {
      const comOS = new Set(allRecords.filter(r => r.cidade).map(r => r.cidade));
      el.innerHTML = first + todasCidades.map(c =>
        comOS.has(c)
          ? `<option value="${c}">${c}</option>`
          : `<option value="${c}" disabled style="color:#cbd5e1">${c} (sem OS)</option>`
      ).join('');
    }
    if (prev) el.value = prev;
  });
}

function popularFiltros() {
  _atualizarDropdownCidades(filteredRecords());
  if (_isAdmin(currentUser)) _atualizarDropdownTecnicos();
}

// ── Descontos ──

async function carregarDescontos() {
  try {
    const snap = await db.ref('config/descontos').once('value');
    descontosCache = {};
    const raw = snap.val() || {};
    for (const [k, v] of Object.entries(raw)) descontosCache[k] = { ...v, fbKey: k };
  } catch(e) {
    console.error('[carregarDescontos]', e);
    descontosCache = {};
  }
}

// ── Serviços Fixos Mensais ───────────────────────────────────────────────────
async function carregarServicosFixos() {
  try {
    const snap = await db.ref('config/servicos_fixos').once('value');
    window.servicosFixos = snap.val() || {};
  } catch(e) {
    window.servicosFixos = {};
  }
}
window.carregarServicosFixos = carregarServicosFixos;

// Retorna o valor fixo mensal de um técnico (0 se inativo/não cadastrado)
window.getServicoFixoValor = function(uid) {
  const sf = window.servicosFixos?.[uid];
  if (!sf || sf.ativo === false) return 0;
  return Number(sf.valor) || 0;
};

async function carregarDescontosTec(uid) {
  try {
    const [snapD, snapA] = await Promise.all([
      db.ref('config/descontos').once('value'),
      db.ref('config/assinatura_master').once('value')
    ]);
    descontosCache = {};
    const raw = snapD.val() || {};
    for (const [k, v] of Object.entries(raw)) {
      if (v.uid === uid) descontosCache[k] = { ...v, fbKey: k };
    }
    assinaturaMaster = snapA.val() || null;
  } catch(e) {
    console.error('[carregarDescontosTec]', e);
    descontosCache = {};
    assinaturaMaster = null;
  }
}

// ── Botões de exportação por técnico ──

function renderBotoesTecnicos() {
  if (!_isAdmin(currentUser)) return;
  const wrap = document.getElementById('exp-por-tecnico');
  if (!wrap) return;
  wrap.style.display = 'block';
  const anos = [...new Set(allRecords.map(r => (r.data||'').slice(0,4)).filter(a => a.length===4))].sort().reverse();
  const selAno = document.getElementById('exp-ano');
  if (selAno) {
    const atual = selAno.value;
    selAno.innerHTML = '<option value="">-- Selecione --</option>' +
      anos.map(a => `<option value="${a}" ${a===atual?'selected':''}>${a}</option>`).join('');
  }
  const tecStep   = document.getElementById('exp-tec-step');
  const nivelStep = document.getElementById('exp-nivel-step');
  if (tecStep)   tecStep.style.display   = 'none';
  if (nivelStep) nivelStep.style.display = 'none';
}

function renderBotaoTecnicoProprio() {
  const propWrap = document.getElementById('exp-proprio-tec');
  const botoesEl = document.getElementById('exp-proprio-botoes');
  const master   = document.getElementById('exp-por-tecnico');
  if (currentUser.role === 'user') {
    if (_isFiscal(currentUser)) {
      if (propWrap) propWrap.style.display = 'none';
      if (master)   master.style.display   = 'none';
      return;
    }
    if (propWrap) propWrap.style.display = 'block';
    if (master)   master.style.display   = 'none';
    if (botoesEl) {
      const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const hoje = new Date();
      const meses = [
        new Date(hoje.getFullYear(), hoje.getMonth(), 1),
        new Date(hoje.getFullYear(), hoje.getMonth()-1, 1),
      ];
      botoesEl.innerHTML = meses.map((d, i) => {
        const yy = d.getFullYear();
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const label = `${MESES_PT[d.getMonth()]} ${yy}`;
        const isCur = i === 0;
        return `<button class="btn ${isCur?'btn-success':'btn-secondary'}"
          onclick="exportarTecnicoMes(currentUser.id, '${yy}-${mm}')">
          <i class="fas fa-file-excel"></i> ${label}${isCur?' (atual)':' (anterior)'}
        </button>`;
      }).join('');
    }
  } else {
    if (propWrap) propWrap.style.display = 'none';
  }
}

// ── Expor funções como globals para o admin.html (tree-shaking fix) ──
window.carregarDados = carregarDados;
window._validarOS = _validarOS;
window._montarObjOS = _montarObjOS;
window.salvarOS = salvarOS;
window._montarCorpoTermoServicos = _montarCorpoTermoServicos;
window.verificarTermoServicos = verificarTermoServicos;
window.mostrarTermoServicos = mostrarTermoServicos;
window.aceitarTermoServicos = aceitarTermoServicos;
window.deletarOS = deletarOS;
window.confirmarDel = confirmarDel;
window.confirmarLimparTudo = confirmarLimparTudo;
window.filteredRecords = filteredRecords;
window.filtrarTabela = filtrarTabela;
window.renderTabela = renderTabela;
window.buildServiceRows = buildServiceRows;
window.preencherPreco = preencherPreco;
window.calcTotal = calcTotal;
window.gerarCodigoOS = gerarCodigoOS;
window.getActivePriceMap = getActivePriceMap;
window._atualizarDropdownTecnicos = _atualizarDropdownTecnicos;
window._atualizarDropdownCidades = _atualizarDropdownCidades;
window.popularFiltros = popularFiltros;
window.carregarDescontos = carregarDescontos;
window.carregarDescontosTec = carregarDescontosTec;
window.renderBotoesTecnicos = renderBotoesTecnicos;
window.renderBotaoTecnicoProprio = renderBotaoTecnicoProprio;