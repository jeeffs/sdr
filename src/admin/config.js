// src/admin/config.js
// Configurações: preços, profiles, pin, normalização histórica
// Extraído de admin.html — Fase C

function salvarConfig() {
  const cfgInput = document.getElementById('config-input');
  const err = document.getElementById('setup-err');
  if (!cfgInput || !err) { console.error('[salvarConfig] elementos do DOM não encontrados'); return; }

  const raw = cfgInput.value.trim();
  err.style.display = 'none';
  let cfg;
  try {
    // Remove "const firebaseConfig = " prefix and trailing semicolons if present
    let clean = raw.replace(/^\s*const\s+firebaseConfig\s*=\s*/,'').replace(/;\s*$/,'').trim();
    // Convert JS object syntax (unquoted keys) to valid JSON
    clean = clean.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    cfg = JSON.parse(clean);
  } catch(e) {
    err.textContent = 'Formato inválido. Cole o objeto firebaseConfig como aparece no console do Firebase.';
    err.style.display = 'block';
    return;
  }
  if (!cfg.databaseURL) {
    err.textContent = 'Campo "databaseURL" não encontrado. Certifique-se de ter criado o Realtime Database.';
    err.style.display = 'block';
    return;
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  location.reload();
}

async function _carregarConfig() {
  // Carrega serviços extras do Firebase
  const snapS = await db.ref('config/servicos_extra').once('value');
  const extras = snapS.val();
  if (extras && typeof extras === 'object') {
    const arr = Array.isArray(extras) ? extras : Object.values(extras);
    arr.forEach(s => { if (s && !SERVICOS.includes(s)) SERVICOS.push(s); });
  }
  // Carrega profiles e cidades do Firebase
  const snapP = await db.ref('config/profiles').once('value');
  const profiles = snapP.val();
  if (profiles && typeof profiles === 'object') {
    profilesCidades = {};
    Object.entries(profiles).forEach(([k, v]) => {
      profilesCidades[k] = Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
    });
    // Garante que FILIAL e MATRIZ existam
    if (!profilesCidades['FILIAL']) profilesCidades['FILIAL'] = [...FILIAL_CIDADES];
    if (!profilesCidades['MATRIZ']) profilesCidades['MATRIZ'] = [...MATRIZ_CIDADES];
  } else {
    // Inicializa no Firebase com padrões
    profilesCidades = { FILIAL: [...FILIAL_CIDADES], MATRIZ: [...MATRIZ_CIDADES] };
    await _dbSet('config/profiles', { FILIAL: FILIAL_CIDADES, MATRIZ: MATRIZ_CIDADES });
  }
  atualizarProfileSelect();
}

async function garantirPrecos() {
  const snap = await db.ref('precos').once('value');
  if (!snap.exists()) {
    await _dbSet('precos/v1', PRECOS_V1);
    await _dbSet('precos/v2', PRECOS_V2);
    await _dbSet('precos/v3', PRECOS_V3);
    await _dbSet('precos/v4', PRECOS_V3); // V4 inicia com valores V3
  }
  await _carregarTodosPrecos();
}

function _nivelEfetivoPreco(r) {
  // Para OS importadas, usa nivelImp se disponível
  if (r.importado && r.nivelImp) {
    const ni = r.nivelImp;
    // V2 usa mesma tabela que V1
    if (ni === 'V2') return 'V1';
    return ni;
  }
  // Para OS normais, o nível do técnico determina qual tabela foi usada
  const nivel = usersCache[r.userId]?.nivel || 'V1';
  // V2 grava com preços V1 (getActivePriceMap retorna precosV1map para V2)
  if (nivel === 'V2') return 'V1';
  if (nivel === 'V4') return 'V3'; // V4 herda de V3
  return nivel; // V1 ou V3
}

function _precoUnitario(r, sv) {
  const q = Number(sv.qtd) || 1;
  if (r.importado) {
    // Importada: sv.valor = qtd × preço → preço unitário = sv.valor / qtd
    return (Number(sv.valor) || 0) / q;
  }
  // Manual: sv.valor = preço unitário
  return Number(sv.valor) || 0;
}

function _buildPrecosHistoricoMes() {
  if (_precosHistoricoMes) return _precosHistoricoMes;
  const mapa = {};
  allRecords.forEach(r => {
    const mes = (r.data||'').slice(0,7);
    if (!mes) return;
    const nivelEfetivo = _nivelEfetivoPreco(r);
    if (!mapa[mes]) mapa[mes] = {};
    if (!mapa[mes][nivelEfetivo]) mapa[mes][nivelEfetivo] = {};
    (r.servicos||[]).forEach(sv => {
      if (sv.tipo && sv.valor !== undefined && sv.valor !== null && mapa[mes][nivelEfetivo][sv.tipo] === undefined) {
        mapa[mes][nivelEfetivo][sv.tipo] = _precoUnitario(r, sv);
      }
    });
  });
  _precosHistoricoMes = mapa;
  return mapa;
}

function _nivelDoMapa(priceMap) {
  if (priceMap === precosV1map) return 'V1';
  if (priceMap === precosV2map) return 'V2';
  if (priceMap === precosV4map) return 'V4';
  if (priceMap === precosV3map) return 'V3';
  return 'V1';
}

function renderPrecosPage(){
  const tbody=document.getElementById('precos-tbody'); if(!tbody)return;
  // Linha de cabeçalho V0 — salário fixo, sem serviços
  const v0Row = `<tr style="background:#fefce8;border-bottom:2px solid #fde68a">
    <td style="padding:8px 14px;font-size:.84rem;font-weight:700;color:#854d0e">
      <i class="fas fa-search" style="margin-right:6px"></i>Honorários — Gestão
    </td>
    <td style="padding:8px 10px;text-align:center;color:#854d0e;font-weight:800;font-size:.88rem">
      R$ ${SALARIO_V0.toLocaleString('pt-BR',{minimumFractionDigits:2})}/mês
    </td>
    <td colspan="4" style="padding:8px 10px;font-size:.77rem;color:#92400e;text-align:center">
      Não gera OS · Valor fixo independente de produção
    </td>
  </tr>`;
  tbody.innerHTML = v0Row + SERVICOS.map((s,i)=>{
    const isExtra = !(s in PRECOS_V1);
    const desc = SERVICOS_DESC[s] || '';
    const titleAttr = desc ? ` title="${desc.replace(/"/g,'&quot;')}"` : '';
    return `<tr style="border-bottom:1px solid var(--border);background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="padding:8px 14px;font-size:.84rem">
        <span${titleAttr}${desc ? ' style="cursor:help;border-bottom:1px dotted #94a3b8"' : ''}>${s}</span>
        ${isExtra ? `<i class="fas fa-times" style="margin-left:8px;color:#dc2626;cursor:pointer;font-size:.72rem" onclick="removerServico('${s.replace(/'/g, "&apos;").replace(/"/g, "&quot;")}') " title="Remover serviço"></i>` : ''}
      </td>
      <td style="padding:6px 10px;text-align:center;color:#6b7280;font-size:.78rem">—</td>
      <td style="padding:6px 10px;text-align:center">${_inputPreco(s,'V1',precosV1map)}</td>
      <td style="padding:6px 10px;text-align:center">${_inputPreco(s,'V2',precosV2map)}</td>
      <td style="padding:6px 10px;text-align:center">${_inputPreco(s,'V3',precosV3map)}</td>
      <td style="padding:6px 10px;text-align:center">${_inputPreco(s,'V4',precosV4map)}</td>
    </tr>`;
  }).join('');
  renderGerenciarProfiles();
}

async function salvarTodosPrecos(){
  const upV1={}, upV2={}, upV3={}, upV4={};
  document.querySelectorAll('#precos-tbody input[data-servico]').forEach(inp=>{
    const s   = inp.getAttribute('data-servico');
    const niv = inp.getAttribute('data-nivel');
    const v   = parseFloat(inp.value)||0;
    if(niv==='V1'){ precosV1map[s]=v; upV1[s]=v; }
    else if(niv==='V2'){ precosV2map[s]=v; upV2[s]=v; }
    else if(niv==='V4'){ precosV4map[s]=v; upV4[s]=v; }
    else { precosV3map[s]=v; upV3[s]=v; }
  });
  await _dbUpdate('precos/v1', upV1);
  await _dbUpdate('precos/v2', upV2);
  await _dbUpdate('precos/v3', upV3);
  if (Object.keys(upV4).length) await _dbUpdate('precos/v4', upV4);
  toast('Preços salvos com sucesso!','success');
  buildServiceRows();
}

async function restaurarPrecosPadrao(){
  precosV1map={...PRECOS_V1}; precosV2map={...PRECOS_V2}; precosV3map={...PRECOS_V3}; precosV4map={...PRECOS_V3};
  await _dbSet('precos', {
    v1:PRECOS_V1, v2:PRECOS_V2, v3:PRECOS_V3, v4:PRECOS_V3
  });
  renderPrecosPage(); buildServiceRows();
  toast('Preços restaurados ao padrão.','success');
}

async function adicionarServico() {
  const nome = (document.getElementById('novo-servico-nome').value || '').trim().toUpperCase();
  if (!nome) { toast('Digite o nome do serviço.','error'); return; }
  if (SERVICOS.includes(nome)) { toast('Este serviço já existe.','error'); return; }
  const v1 = parseFloat(document.getElementById('novo-servico-v1').value) || 0;
  const v2 = parseFloat(document.getElementById('novo-servico-v2').value) || 0;
  const v3 = parseFloat(document.getElementById('novo-servico-v3').value) || 0;
  // Adiciona ao array em memória
  SERVICOS.push(nome);
  precosV1map[nome] = v1;
  precosV2map[nome] = v2;
  precosV3map[nome] = v3;
  precosV4map[nome] = v3; // V4 herda valor de V3 para novos serviços
  // Salva preços no Firebase
  await _dbUpdate('precos/v1', { [nome]: v1 });
  await _dbUpdate('precos/v2', { [nome]: v2 });
  await _dbUpdate('precos/v3', { [nome]: v3 });
  await _dbUpdate('precos/v4', { [nome]: v3 });
  // Salva lista de extras no Firebase (apenas os que não fazem parte do PRECOS_V1 padrão)
  const extras = SERVICOS.filter(s => !(s in PRECOS_V1));
  await _dbSet('config/servicos_extra', extras);
  // Limpa campos
  document.getElementById('novo-servico-nome').value = '';
  document.getElementById('novo-servico-v1').value = '';
  document.getElementById('novo-servico-v2').value = '';
  document.getElementById('novo-servico-v3').value = '';
  renderPrecosPage();
  buildServiceRows();
  toast(`Serviço "${nome}" adicionado!`, 'success');
}

async function removerServico(nome) {
  if (!confirm(`Remover o serviço "${nome}"?`)) return;
  SERVICOS = SERVICOS.filter(s => s !== nome);
  delete precosV1map[nome]; delete precosV2map[nome]; delete precosV3map[nome]; delete precosV4map[nome];
  await _dbRemove(`precos/v1/${nome}`);
  await _dbRemove(`precos/v2/${nome}`);
  await _dbRemove(`precos/v3/${nome}`);
  await _dbRemove(`precos/v4/${nome}`);
  const extras = SERVICOS.filter(s => !(s in PRECOS_V1));
  await db.ref('config/servicos_extra').set(extras.length ? extras : null);
  renderPrecosPage();
  buildServiceRows();
  toast(`Serviço "${nome}" removido.`, 'success');
}

function renderGerenciarProfiles() {
  const cont = document.getElementById('profiles-lista');
  if (!cont) return;
  const profiles = Object.keys(profilesCidades);
  if (!profiles.length) { cont.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Nenhum profile cadastrado.</p>'; return; }
  cont.innerHTML = profiles.map(p => {
    const cidades = profilesCidades[p] || [];
    const isDefault = p === 'FILIAL' || p === 'MATRIZ';
    return `<div style="margin-bottom:18px;padding:14px;border:1px solid var(--border);border-radius:10px;background:#fff">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <span style="font-weight:700;font-size:.92rem;color:var(--primary)">${p}</span>
        ${!isDefault ? `<button class="btn btn-danger btn-sm" onclick="removerProfile('${p}')"><i class="fas fa-trash"></i> Remover Profile</button>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
        ${cidades.map(c => `<span style="display:inline-flex;align-items:center;gap:5px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:20px;padding:3px 10px;font-size:.81rem;color:#1d4ed8">
          ${c}
          <i class="fas fa-times" style="cursor:pointer;font-size:.65rem;color:#6b7280" onclick="removerCidade('${p}','${c}')" title="Remover cidade"></i>
        </span>`).join('')}
        ${cidades.length === 0 ? '<span style="color:var(--muted);font-size:.82rem">Nenhuma cidade cadastrada.</span>' : ''}
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <input type="text" id="nova-cidade-${p}" placeholder="Nova cidade..." style="flex:1;min-width:140px;text-transform:uppercase;font-size:.83rem" oninput="this.value=this.value.toUpperCase()">
        <button class="btn btn-primary btn-sm" onclick="adicionarCidadeAoProfile('${p}')" style="height:34px;white-space:nowrap">
          <i class="fas fa-plus"></i> Adicionar
        </button>
      </div>
    </div>`;
  }).join('');
}

async function adicionarProfile() {
  const nome = (document.getElementById('novo-profile-nome').value || '').trim().toUpperCase();
  if (!nome) { toast('Digite o nome do profile.', 'error'); return; }
  if (profilesCidades[nome]) { toast('Este profile já existe.', 'error'); return; }
  profilesCidades[nome] = [];
  await _dbSet(`config/profiles/${nome}`, []);
  document.getElementById('novo-profile-nome').value = '';
  atualizarProfileSelect();
  renderGerenciarProfiles();
  toast(`Profile "${nome}" criado!`, 'success');
}

async function removerProfile(nome) {
  if (!confirm(`Remover o profile "${nome}" e todas as suas cidades?`)) return;
  delete profilesCidades[nome];
  await _dbRemove(`config/profiles/${nome}`);
  atualizarProfileSelect();
  renderGerenciarProfiles();
  toast(`Profile "${nome}" removido.`, 'success');
}

async function adicionarCidadeAoProfile(profile) {
  const inp = document.getElementById(`nova-cidade-${profile}`);
  const cidade = (inp ? inp.value : '').trim().toUpperCase();
  if (!cidade) { toast('Digite o nome da cidade.', 'error'); return; }
  if (!profilesCidades[profile]) profilesCidades[profile] = [];
  if (profilesCidades[profile].includes(cidade)) { toast('Cidade já cadastrada neste profile.', 'error'); return; }
  profilesCidades[profile].push(cidade);
  await db.ref(`config/profiles/${profile}`).set(profilesCidades[profile]);
  renderGerenciarProfiles();
  toast(`Cidade "${cidade}" adicionada ao profile ${profile}!`, 'success');
}

async function removerCidade(profile, cidade) {
  if (!confirm(`Remover "${cidade}" do profile ${profile}?`)) return;
  profilesCidades[profile] = (profilesCidades[profile] || []).filter(c => c !== cidade);
  await db.ref(`config/profiles/${profile}`).set(profilesCidades[profile].length ? profilesCidades[profile] : null);
  renderGerenciarProfiles();
  toast(`Cidade "${cidade}" removida.`, 'success');
}

function onPinInput() {
  document.getElementById('pin-err').textContent = '';
}

async function abrirPinPrecos(callback) {
  try {
    _pinCallbackPagina = callback || null;
    // Verifica se já existe PIN no Firebase
    const snap = await db.ref('users/master/pinPrecos').once('value');
    const pinSalvo = snap.val();
    const modal = document.getElementById('modal-pin-precos');
    if (!modal) return;

    const pinInput = document.getElementById('pin-input');
    const pinErr = document.getElementById('pin-err');
    const pinConfirm = document.getElementById('pin-confirm-input');
    const pinCriarWrap = document.getElementById('pin-criar-wrap');
    const pinTitle = document.getElementById('pin-modal-title');
    const pinDesc = document.getElementById('pin-modal-desc');
    const btnConfirmar = document.getElementById('btn-confirmar-pin');

    if (pinInput) pinInput.value = '';
    if (pinErr) pinErr.textContent = '';
    if (pinConfirm) pinConfirm.value = '';
    if (pinCriarWrap) pinCriarWrap.style.display = 'none';

    if (!pinSalvo) {
      // Primeira vez — cria PIN
      _pinModo = 'criar';
      if (pinTitle) pinTitle.textContent = 'Criar Senha — Área Restrita';
      if (pinDesc) pinDesc.textContent = 'Defina uma senha de 6 dígitos para proteger as abas Tabela de Preços e Prestadores.';
      if (pinCriarWrap) pinCriarWrap.style.display = 'block';
      if (btnConfirmar) btnConfirmar.innerHTML = '<i class="fas fa-lock"></i> Criar Senha';
    } else {
      _pinModo = 'verificar';
      if (pinTitle) pinTitle.textContent = 'Área Restrita';
      if (pinDesc) pinDesc.textContent = 'Digite a senha de 6 dígitos para acessar Tabela de Preços e Prestadores.';
      if (btnConfirmar) btnConfirmar.innerHTML = '<i class="fas fa-unlock"></i> Confirmar';
    }
    modal.classList.add('open');
    setTimeout(() => { const el = document.getElementById('pin-input'); if (el) el.focus(); }, 100);
  } catch(e) {
    console.error('[abrirPinPrecos]', e);
    toast('Erro ao abrir painel PIN. Tente novamente.', 'error');
  }
}

function abrirAlterarPinPrecos() {
  _pinModo = 'alterar';
  document.getElementById('pin-modal-title').textContent = 'Alterar Senha — Área Restrita';
  document.getElementById('pin-modal-desc').textContent = 'Digite a senha atual:';
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-err').textContent = '';
  document.getElementById('pin-confirm-input').value = '';
  const pcw = document.getElementById('pin-criar-wrap');
  if (pcw) pcw.style.display = 'none';
  const bcpin = document.getElementById('btn-confirmar-pin');
  if (bcpin) bcpin.innerHTML = '<i class="fas fa-key"></i> Próximo';
  const mpp = document.getElementById('modal-pin-precos');
  if (mpp) mpp.classList.add('open');
  setTimeout(() => { const el = document.getElementById('pin-input'); if (el) el.focus(); }, 100);
}

async function confirmarPin() {
  const pin = document.getElementById('pin-input').value.trim();
  const errEl = document.getElementById('pin-err');

  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    errEl.textContent = 'Digite exatamente 6 dígitos.';
    return;
  }

  if (_pinModo === 'criar') {
    const confirm = document.getElementById('pin-confirm-input').value.trim();
    if (confirm !== pin) { errEl.textContent = 'As senhas não coincidem.'; return; }
    const hash = await sha256(pin);
    await _dbSet('users/master/pinPrecos', hash);
    precosDesbloqueado = true;
    fecharModal('modal-pin-precos');
    toast('Senha criada! Acesso liberado.', 'success');
    if (_pinCallbackPagina) { _pinCallbackPagina(); } else showPage('precos');

  } else if (_pinModo === 'verificar') {
    const snap = await db.ref('users/master/pinPrecos').once('value');
    const pinSalvo = snap.val();
    const hash = await sha256(pin);
    if (hash !== pinSalvo) { errEl.textContent = 'Senha incorreta. Tente novamente.'; document.getElementById('pin-input').value=''; return; }
    precosDesbloqueado = true;
    fecharModal('modal-pin-precos');
    if (_pinCallbackPagina) { _pinCallbackPagina(); }
    else showPage('precos');

  } else if (_pinModo === 'alterar') {
    // Fase 1: valida senha atual, depois pede nova
    const snap = await db.ref('users/master/pinPrecos').once('value');
    const pinSalvo = snap.val();
    const hash = await sha256(pin);
    if (pinSalvo && hash !== pinSalvo) { errEl.textContent = 'Senha atual incorreta.'; document.getElementById('pin-input').value=''; return; }
    // Entra em modo de definir nova senha
    _pinModo = 'nova';
    document.getElementById('pin-modal-desc').textContent = 'Digite a nova senha de 6 dígitos:';
    document.getElementById('pin-criar-wrap').style.display = 'block';
    document.getElementById('btn-confirmar-pin').innerHTML = '<i class="fas fa-lock"></i> Salvar Nova Senha';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-confirm-input').value = '';
    errEl.textContent = '';
    document.getElementById('pin-input').focus();

  } else if (_pinModo === 'nova') {
    const confirm = document.getElementById('pin-confirm-input').value.trim();
    if (confirm !== pin) { errEl.textContent = 'As senhas não coincidem.'; return; }
    const hash = await sha256(pin);
    await _dbSet('users/master/pinPrecos', hash);
    fecharModal('modal-pin-precos');
    toast('Senha alterada com sucesso!', 'success');
  }
}