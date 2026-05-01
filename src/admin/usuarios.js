// src/admin/usuarios.js
// Gestão de usuários, fichas, rescisão, renomear
// Extraído de admin.html — Fase C

function loginComo(uid) {
  const u = usersCache[uid];
  if (!u) { toast('Usuario nao encontrado.', 'error'); return; }
  const isFiscalUser = (u?.nivel || 'V1') === 'V0';
  const destino = isFiscalUser ? 'painel admin' : 'app mobile';
  if (!confirm(`Abrir o ${destino} como ${u.name || uid}?`)) return;
  if (isFiscalUser) {
    window.open(`https://solucaoderua.web.app/admin?loginComo=${uid}`, '_blank');
  } else {
    window.open(`https://solucaoderua.web.app?loginComo=${uid}`, '_blank');
  }
}

function renderUsuariosPage(){
  const ul=document.getElementById('users-list'); if(!ul)return;
  // Atualiza display do nome master
  const masterDisplay = document.getElementById('master-nome-display');
  if (masterDisplay) masterDisplay.textContent = usersCache['master']?.name || 'JA';

  // Todos os usuários do cache (exceto o master — inclui V3)
  const allUsers = Object.entries(usersCache).filter(([id, u]) => u.role !== 'master' && u.name);
  const _sortNum = arr => arr.sort(([a],[b]) => {
    const na = parseInt(a.replace(/\D/g,'')) || 0;
    const nb = parseInt(b.replace(/\D/g,'')) || 0;
    if (na && nb) return na - nb;
    if (na) return 1;
    if (nb) return -1;
    return a.localeCompare(b);
  });
  const fiscais     = _sortNum(allUsers.filter(([, u]) => _isFiscal(u) && u.ativo !== false));
  const observadores= _sortNum(allUsers.filter(([, u]) => _isObservador(u) && u.ativo !== false));
  const ativos      = _sortNum(allUsers.filter(([, u]) => !_isFiscal(u) && !_isObservador(u) && u.ativo !== false));
  const historicos   = allUsers.filter(([, u]) => u.ativo === false);

  const _cardFiscal = ([uid, u]) => {
    const status = u.firstLogin
      ? '<span class="badge badge-pending">Aguardando 1º acesso</span>'
      : '<span class="badge badge-active">Ativo</span>';
    return `<div class="user-row-card" style="border-left:4px solid #854d0e;background:#fffbeb">
      <div class="user-avatar user" style="background:#854d0e">🔍</div>
      <div class="user-info">
        <div class="uname">${u.name}</div>
        <div class="ustatus">Usuário Gestão</div>
      </div>
      ${status}
      <div style="display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;align-items:center">
        <select style="padding:5px 8px;border-radius:7px;border:1px solid var(--border);font-size:.8rem;font-weight:600;background:#f8fafc"
          onchange="salvarNivel('${uid}',this.value)" title="Nível">
          <option value="V0" ${(u.nivel||'V1')==='V0'?'selected':''}>Gestão</option>
          <option value="V1" ${(u.nivel||'V1')==='V1'?'selected':''}>Prestador</option>
          <option value="V2" ${(u.nivel||'V1')==='V2'?'selected':''}>PRESTADOR</option>
          <option value="V3" ${(u.nivel||'V1')==='V3'?'selected':''}>Admin</option>
          <option value="V4" ${(u.nivel||'V1')==='V4'?'selected':''}>Observador</option>
        </select>
        <button class="btn btn-secondary btn-sm" data-tip="Alterar o nome de exibição deste fiscal" onclick="abrirRenomear('${uid}','${(u.name||'').replace(/'/g, "&apos;").replace(/"/g, "&quot;")}')">
          <i class="fas fa-user-edit"></i> Renomear</button>
        <button class="btn btn-secondary btn-sm" data-tip="Gerar nova senha temporária para este fiscal" onclick="resetarSenha('${uid}')">
          <i class="fas fa-key"></i> Resetar senha</button>
        <button class="btn btn-sm" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0" data-tip="Visualizar o cadastro da empresa deste fiscal" onclick="verFichaEmpresa('${uid}')">
          <i class="fas fa-building"></i> ${u.empresa?.razaoSocial ? 'Ficha' : u.empresa?.dispensado ? 'Dispensado' : '<span style=color:#dc2626>Sem ficha</span>'}</button>
        <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a" data-tip="Editar a ficha cadastral deste fiscal" onclick="abrirEditarFichaAdmin('${uid}')">
          <i class="fas fa-pen"></i> Editar Ficha</button>
        ${!u.empresa?.razaoSocial && !u.empresa?.dispensado ? `<button class="btn btn-sm" style="background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe" data-tip="Dispensar o preenchimento do cadastro da empresa" onclick="dispensarFichaEmpresa('${uid}')">
          <i class="fas fa-forward"></i> Pular Ficha</button>` : ''}
        ${u.empresa?.dispensado ? `<button class="btn btn-sm" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" data-tip="Reverter a dispensa e exigir o cadastro da empresa" onclick="reverterDispensaFicha('${uid}')">
          <i class="fas fa-undo"></i> Reverter</button>` : ''}
        ${u.empresa?.razaoSocial ? `<button class="btn btn-sm" style="background:#fff1f2;color:#be123c;border:1px solid #fda4af" data-tip="Apagar a ficha e o contrato — prestador precisará preencher novamente" onclick="resetarFichaEmpresa('${uid}')">
          <i class="fas fa-redo"></i> Resetar Ficha</button>` : ''}
        <label class="btn btn-sm" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;cursor:pointer;margin:0" data-tip="Enviar ou substituir o PDF do contrato">
          <i class="fas fa-file-pdf"></i> ${u.contratoPDF ? 'Contrato ✔' : 'Contrato'}
          <input type="file" accept=".pdf" style="display:none" onchange="importarContrato('${uid}', event)">
        </label>
        <button class="btn btn-sm" style="background:#f0fdf4;color:#15803d;border:1px solid #86efac" data-tip="Gerar contrato de prestação de serviços (fiscal)" onclick="gerarContratoServicos('${uid}')">
          <i class="fas fa-file-contract"></i> Gerar Contrato</button>
        <button class="btn btn-sm" style="background:#eff6ff;color:#1f4e79;border:1px solid #bfdbfe" data-tip="Visualizar o contrato já gerado deste fiscal" onclick="abrirContratoGerado('${uid}')">
          <i class="fas fa-eye"></i> Ver Contrato</button>
        <button class="btn btn-sm" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa" data-tip="Remover autenticação Gov.br do Contrato de Prestação de Serviços — prestador terá que re-assinar via assinador.iti.br" onclick="invalidarAssinaturaGovBr('${uid}')">
          <i class="fas fa-shield-alt"></i> Invalidar Gov.br</button>
        <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a" data-tip="Mover este fiscal para a lista de arquivados" onclick="toggleAtivoUsuario('${uid}')">
          <i class="fas fa-archive"></i> Arquivar</button>
        ${u.rescisao?.status === 'pendente'
          ? `<button class="btn btn-sm" style="background:#fecaca;color:#991b1b;border:1px solid #fca5a5" data-tip="Clique para destravar e cancelar o Termo de Rescisão" onclick="reverterRescisao('${uid}')">
              <i class="fas fa-lock"></i> Travado</button>`
          : `<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5" data-tip="Clique para travar e gerar um Termo de Rescisão" onclick="travarPrestador('${uid}')">
              <i class="fas fa-lock-open"></i> Destravar</button>`
        }
        <button class="btn btn-sm" style="background:#1e40af;color:#fff;border:1px solid #1e3a8a" data-tip="Abrir o painel admin como este fiscal" onclick="loginComo('${uid}')">
          <i class="fas fa-sign-in-alt"></i> Entrar como</button>
      </div>
    </div>`;
  };

  const _cardObservador = ([uid, u]) => {
    const status = u.firstLogin
      ? '<span class="badge badge-pending">Aguardando 1º acesso</span>'
      : '<span class="badge badge-active">Ativo</span>';
    const profileNames = Object.keys(profilesCidades);
    const profileSel = profileNames.map(p =>
      `<option value="${p}" ${(u.profileVinculado||'')=== p ? 'selected':''}>${p}</option>`
    ).join('');
    return `<div class="user-row-card" style="border-left:4px solid #0e7490;background:#f0fdfa">
      <div class="user-avatar user" style="background:#0e7490">👁️</div>
      <div class="user-info">
        <div class="uname">${u.name}</div>
        <div class="ustatus">Profile: <b>${u.profileVinculado || 'não definido'}</b> · Somente leitura</div>
      </div>
      <span style="background:#e0f2fe;color:#0e7490;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">Observador</span>
      ${status}
      <div style="display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;align-items:center">
        <select style="padding:5px 8px;border-radius:7px;border:1px solid var(--border);font-size:.8rem;font-weight:600;background:#f0fdfa"
          onchange="salvarProfileObservador('${uid}',this.value)" title="Profile vinculado">
          <option value="">Selecionar Profile</option>
          ${profileSel}
        </select>
        <button class="btn btn-secondary btn-sm" data-tip="Alterar o nome de exibição deste observador" onclick="abrirRenomear('${uid}','${(u.name||'').replace(/'/g, "&apos;").replace(/"/g, "&quot;")}')">
          <i class="fas fa-user-edit"></i> Renomear</button>
        <button class="btn btn-secondary btn-sm" data-tip="Gerar nova senha temporária para este observador" onclick="resetarSenha('${uid}')">
          <i class="fas fa-key"></i> Resetar senha</button>
        <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a" data-tip="Mover este observador para a lista de arquivados" onclick="toggleAtivoUsuario('${uid}')">
          <i class="fas fa-archive"></i> Arquivar</button>
      </div>
    </div>`;
  };

  const _cardAtivo = ([uid, u]) => {
    const status = u.firstLogin
      ? '<span class="badge badge-pending">Aguardando 1º acesso</span>'
      : '<span class="badge badge-active">Ativo</span>';
    const count = allRecords.filter(r=>r.userId===uid).length;
    // Antes do 1º acesso o nome fica oculto — regra de privacidade de cadastro
    return `<div class="user-row-card">
      <div class="user-avatar user">👷</div>
      <div class="user-info">
        <div class="uname">${u.name}</div>
        <div class="ustatus">${count} OS registradas</div>
      </div>
      ${ (u.nivel||'V1')==='V3' ? '<span style="background:#ede9fe;color:#6d28d9;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">Admin</span>'
        : (u.nivel||'V1')==='V0' ? '<span style="background:#fef9c3;color:#854d0e;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">Gestão</span>'
        : (u.nivel||'V1')==='V4' ? '<span style="background:#e0f2fe;color:#0e7490;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">Observador</span>'
        : (u.nivel||'V1')==='V2' ? '<span style="background:#ffedd5;color:#ea580c;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">PRESTADOR</span>'
        : '<span class="badge badge-user">Prestador</span>'} ${status}
      <div style="display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;align-items:center">
        <select style="padding:5px 8px;border-radius:7px;border:1px solid var(--border);font-size:.8rem;font-weight:600;background:#f8fafc"
          onchange="salvarNivel('${uid}',this.value)" title="Nível de preços">
          <option value="V0" ${(u.nivel||'V1')==='V0'?'selected':''}>Gestão</option>
          <option value="V1" ${(u.nivel||'V1')==='V1'?'selected':''}>Prestador</option>
          <option value="V2" ${(u.nivel||'V1')==='V2'?'selected':''}>PRESTADOR</option>
          <option value="V3" ${(u.nivel||'V1')==='V3'?'selected':''}>Admin</option>
          <option value="V4" ${(u.nivel||'V1')==='V4'?'selected':''}>Observador</option>
        </select>
        <button class="btn btn-secondary btn-sm" data-tip="Alterar o nome de exibição deste usuário" onclick="abrirRenomear('${uid}','${(u.name||'').replace(/'/g, "&apos;").replace(/"/g, "&quot;")}')">
          <i class="fas fa-user-edit"></i> Renomear</button>
        <button class="btn btn-secondary btn-sm" data-tip="Gerar nova senha temporária para este usuário" onclick="resetarSenha('${uid}')">
          <i class="fas fa-key"></i> Resetar senha</button>
        <button class="btn btn-sm" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0" data-tip="Visualizar o cadastro da empresa deste prestador" onclick="verFichaEmpresa('${uid}')">
          <i class="fas fa-building"></i> ${u.empresa?.razaoSocial ? 'Ficha' : u.empresa?.dispensado ? 'Dispensado' : '<span style=color:#dc2626>Sem ficha</span>'}</button>
        <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a" data-tip="Editar a ficha cadastral deste prestador" onclick="abrirEditarFichaAdmin('${uid}')">
          <i class="fas fa-pen"></i> Editar Ficha</button>
        ${!u.empresa?.razaoSocial && !u.empresa?.dispensado ? `<button class="btn btn-sm" style="background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe" data-tip="Dispensar o preenchimento do cadastro da empresa" onclick="dispensarFichaEmpresa('${uid}')">
          <i class="fas fa-forward"></i> Pular Ficha</button>` : ''}
        ${u.empresa?.dispensado ? `<button class="btn btn-sm" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" data-tip="Reverter a dispensa e exigir o cadastro da empresa" onclick="reverterDispensaFicha('${uid}')">
          <i class="fas fa-undo"></i> Reverter</button>` : ''}
        <label class="btn btn-sm" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;cursor:pointer;margin:0" data-tip="Enviar ou substituir o PDF do contrato">
          <i class="fas fa-file-pdf"></i> ${u.contratoPDF ? 'Contrato ✔' : 'Contrato'}
          <input type="file" accept=".pdf" style="display:none" onchange="importarContrato('${uid}', event)">
        </label>
        <button class="btn btn-sm" style="background:#f0fdf4;color:#15803d;border:1px solid #86efac" data-tip="Gerar contrato de prestação de serviços preenchido com os dados da empresa" onclick="gerarContratoServicos('${uid}')">
          <i class="fas fa-file-contract"></i> Gerar Contrato</button>
        <button class="btn btn-sm" style="background:#eff6ff;color:#1f4e79;border:1px solid #bfdbfe" data-tip="Visualizar o contrato já gerado deste prestador" onclick="abrirContratoGerado('${uid}')">
          <i class="fas fa-eye"></i> Ver Contrato</button>
        <button class="btn btn-sm" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa" data-tip="Remover autenticação Gov.br do Contrato de Prestação de Serviços — prestador terá que re-assinar via assinador.iti.br" onclick="invalidarAssinaturaGovBr('${uid}')">
          <i class="fas fa-shield-alt"></i> Invalidar Gov.br</button>
        ${u.empresa?.razaoSocial ? `<button class="btn btn-sm" style="background:#fff1f2;color:#be123c;border:1px solid #fda4af" data-tip="Apagar a ficha e o contrato — prestador precisará preencher novamente" onclick="resetarFichaEmpresa('${uid}')">
          <i class="fas fa-redo"></i> Resetar Ficha</button>` : ''}
        <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a" data-tip="Mover este usuário para a lista de arquivados" onclick="toggleAtivoUsuario('${uid}')">
          <i class="fas fa-archive"></i> Arquivar</button>
        ${u.rescisao?.status === 'pendente'
          ? `<button class="btn btn-sm" style="background:#fecaca;color:#991b1b;border:1px solid #fca5a5" data-tip="Clique para destravar e cancelar o Termo de Rescisão" onclick="reverterRescisao('${uid}')">
              <i class="fas fa-lock"></i> Travado</button>`
          : `<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5" data-tip="Clique para travar e gerar um Termo de Rescisão" onclick="travarPrestador('${uid}')">
              <i class="fas fa-lock-open"></i> Destravar</button>`
        }
        <button class="btn btn-sm" style="background:#1e40af;color:#fff;border:1px solid #1e3a8a" data-tip="Abrir o app mobile como este usuario" onclick="loginComo('${uid}')">
          <i class="fas fa-sign-in-alt"></i> Entrar como</button>
      </div>
    </div>`;
  };

  const _cardHistorico = ([uid, u]) => {
    const count = allRecords.filter(r=>r.userId===uid).length;
    return `<div class="user-row-card" style="opacity:.85;background:#f8fafc;border:1px dashed #cbd5e1">
      <div class="user-avatar user" style="background:#94a3b8">📁</div>
      <div class="user-info">
        <div class="uname" style="color:#475569">${u.name}</div>
        <div class="ustatus">${count} OS históricas · somente consulta</div>
      </div>
      <span style="background:#e2e8f0;color:#64748b;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">Histórico</span>
      <div style="display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;align-items:center">
        <button class="btn btn-secondary btn-sm" data-tip="Alterar o nome de exibição deste usuário" onclick="abrirRenomear('${uid}','${(u.name||'').replace(/'/g, "&apos;").replace(/"/g, "&quot;")}')">
          <i class="fas fa-user-edit"></i> Renomear</button>
        <button class="btn btn-sm" style="background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0" data-tip="Restaurar este usuário para a lista de ativos" onclick="toggleAtivoUsuario('${uid}')">
          <i class="fas fa-user-check"></i> Reativar</button>
      </div>
    </div>`;
  };

  const fiscaisHtml = fiscais.length
    ? fiscais.map(_cardFiscal).join('')
    : '';

  const observadoresHtml = observadores.length
    ? observadores.map(_cardObservador).join('')
    : '';

  const ativosHtml = ativos.length
    ? ativos.map(_cardAtivo).join('')
    : '<p style="color:var(--muted);font-size:.84rem;padding:8px 0">Nenhum técnico ativo.</p>';

  const historicosHtml = historicos.length
    ? historicos.map(_cardHistorico).join('')
    : '<p style="color:var(--muted);font-size:.82rem;font-style:italic;padding:4px 0">Nenhum técnico histórico cadastrado.</p>';

  const fiscalSection = fiscais.length ? `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap">
        <h4 style="font-size:.9rem;font-weight:700;color:#854d0e;margin:0"><i class="fas fa-search"></i> Usuário Gestão (${fiscais.length})</h4>
      </div>
      ${fiscaisHtml}
    </div>
    <div style="border-top:2px solid #fde68a;margin-bottom:20px"></div>
  ` : '';

  const observadorSection = observadores.length ? `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap">
        <h4 style="font-size:.9rem;font-weight:700;color:#0e7490;margin:0"><i class="fas fa-eye"></i> Observadores (${observadores.length})</h4>
      </div>
      ${observadoresHtml}
    </div>
    <div style="border-top:2px solid #a5f3fc;margin-bottom:20px"></div>
  ` : '';

  ul.innerHTML = fiscalSection + observadorSection + `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap">
        <h4 style="font-size:.9rem;font-weight:700;color:#1f4e79;margin:0"><i class="fas fa-hard-hat"></i> Prestadores Ativos (${ativos.length})</h4>
        <button class="btn btn-primary btn-sm" onclick="toggleFormNovoTecnico()">
          <i class="fas fa-user-plus"></i> Novo Prestador
        </button>
      </div>
      <div id="form-novo-tec" style="display:none;background:#f0f9ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin-bottom:14px">
        <div style="font-weight:700;font-size:.85rem;color:#1f4e79;margin-bottom:10px"><i class="fas fa-user-plus"></i> Novo Prestador Ativo</div>
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
          <div style="flex:2;min-width:160px">
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:3px">Nome</label>
            <input id="novo-tec-nome" type="text" placeholder="Nome completo"
              style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;font-size:.84rem"
              onkeydown="if(event.key==='Enter')criarUsuarioAtivo()">
          </div>
          <div style="flex:1;min-width:130px">
            <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:3px">Nível</label>
            <select id="novo-tec-nivel" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;font-size:.84rem">
              <option value="V0">Gestão</option>
              <option value="V1">Prestador</option>
              <option value="V2">PRESTADOR</option>
              <option value="V3">Admin</option>
              <option value="V4">Observador</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" onclick="criarUsuarioAtivo()" style="height:36px;white-space:nowrap">
            <i class="fas fa-plus"></i> Adicionar
          </button>
          <button class="btn btn-secondary btn-sm" onclick="toggleFormNovoTecnico()" style="height:36px">
            Cancelar
          </button>
        </div>
      </div>
      ${ativosHtml}
    </div>

    <div style="border-top:2px dashed #e2e8f0;padding-top:16px;margin-top:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap">
        <h4 style="font-size:.9rem;font-weight:700;color:#64748b;margin:0"><i class="fas fa-archive"></i> Prestadores Históricos — somente consulta (${historicos.length})</h4>
      </div>
      <p style="font-size:.8rem;color:var(--muted);margin-bottom:10px">Estes usuários existem apenas para associar planilhas históricas importadas. Não conseguem fazer login.</p>
      ${historicosHtml}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;padding:12px;background:#f0f9ff;border-radius:8px;border:1px solid #bfdbfe">
        <i class="fas fa-user-plus" style="color:var(--primary)"></i>
        <input id="hist-user-nome" type="text" placeholder="Nome do técnico histórico (ex: João)"
          style="flex:1;min-width:160px;padding:7px 10px;border:1px solid var(--border);border-radius:7px;font-size:.85rem"
          onkeydown="if(event.key==='Enter')criarUsuarioHistorico()">
        <button class="btn btn-primary btn-sm" onclick="criarUsuarioHistorico()">
          <i class="fas fa-plus"></i> Adicionar
        </button>
      </div>
    </div>`;
}

function toggleFormNovoTecnico() {
  const f = document.getElementById('form-novo-tec');
  if (!f) return;
  const abrir = f.style.display === 'none';
  f.style.display = abrir ? 'block' : 'none';
  if (abrir) setTimeout(() => document.getElementById('novo-tec-nome')?.focus(), 50);
}

async function criarUsuarioAtivo() {
  const nomeEl  = document.getElementById('novo-tec-nome');
  const nivelEl = document.getElementById('novo-tec-nivel');
  const nome  = (nomeEl?.value || '').trim();
  const nivel = nivelEl?.value || 'V1';
  if (!nome) { toast('Digite o nome do técnico.', 'error'); return; }

  const jaExiste = Object.values(usersCache).find(u => (u.name||'').toLowerCase() === nome.toLowerCase());
  if (jaExiste) { toast(`Já existe um usuário com o nome "${nome}".`, 'error'); return; }

  const uid   = 'user_' + Date.now();
  const dados = { name: nome, role: 'user', nivel, ativo: true, firstLogin: true, passwordHash: null };
  await _dbSet(`users/${uid}`, dados);
  usersCache[uid] = { ...dados, fbKey: uid };
  if (nomeEl) nomeEl.value = '';
  document.getElementById('form-novo-tec').style.display = 'none';
  renderUsuariosPage();
  renderTecnicosPage();
  // Atualiza o Financeiro para criar o card do novo usuário imediatamente
  if (document.getElementById('fin-producao')) renderFinanceiro();
  const labelNivel = nivel === 'V0' ? 'Gestão' : nivel === 'V3' ? 'Admin' : nivel === 'V4' ? 'Observador' : nivel === 'V2' ? 'PRESTADOR' : 'Prestador';
  toast(`${labelNivel} "${nome}" criado. Ele definirá a senha no primeiro acesso.`, 'success');
}

async function criarUsuarioHistorico() {
  const inp = document.getElementById('hist-user-nome');
  const nome = (inp?.value || '').trim();
  if (!nome) { toast('Digite o nome do técnico histórico.', 'error'); return; }

  // Verifica se já existe
  const jaExiste = Object.values(usersCache).find(u => (u.name||'').toLowerCase() === nome.toLowerCase());
  if (jaExiste) { toast(`Já existe um usuário com o nome "${nome}".`, 'error'); return; }

  const uid = 'hist_' + Date.now();
  const dados = {
    name: nome, role: 'user', nivel: 'V1',
    ativo: false, historico: true,
    passwordHash: null, firstLogin: false,
  };
  await _dbSet(`users/${uid}`, dados);
  usersCache[uid] = dados;
  if (inp) inp.value = '';
  renderUsuariosPage();
  toast(`Prestador histórico "${nome}" criado com sucesso.`, 'success');
}

async function toggleAtivoUsuario(uid) {
  const u = usersCache[uid];
  if (!u) return;
  const novoAtivo = u.ativo === false ? true : false;
  await _dbUpdate(`users/${uid}`, { ativo: novoAtivo });
  usersCache[uid] = { ...u, ativo: novoAtivo };
  renderUsuariosPage();
  renderTecnicosPage();
  const acao = novoAtivo ? 'reativado' : 'arquivado';
  toast(`${usersCache[uid].name} ${acao} com sucesso.`, 'success');
}

async function resetarSenha(uid){
  await _dbUpdate(`users/${uid}`, {passwordHash:null, firstLogin:true});
  usersCache[uid]={...usersCache[uid], passwordHash:null, firstLogin:true};
  renderUsuariosPage();
  toast(`Senha de ${usersCache[uid]?.name||uid} resetada. Prestador criará nova senha no próximo acesso.`,'success');
}

async function salvarNivel(uid, nivel) {
  await _dbUpdate(`users/${uid}`, { nivel });
  usersCache[uid] = { ...(usersCache[uid]||{}), nivel };
  renderUsuariosPage();
  // Atualiza o Financeiro para mover o card para a seção correta
  if (document.getElementById('fin-producao')) renderFinanceiro();
  const _nlbl = {V0:'Gestão',V1:'Prestador',V2:'PRESTADOR',V3:'Admin',V4:'Observador'}[nivel] || nivel;
  toast(`Nível de ${usersCache[uid]?.name||uid} atualizado para ${_nlbl}.`, 'success');
}

async function salvarProfileObservador(uid, profile) {
  await _dbUpdate(`users/${uid}`, { profileVinculado: profile });
  usersCache[uid] = { ...(usersCache[uid]||{}), profileVinculado: profile };
  renderUsuariosPage();
  toast(`Profile de ${usersCache[uid]?.name||uid} alterado para ${profile || 'nenhum'}.`, 'success');
}

function verFichaEmpresa(uid) {
  const u = usersCache[uid];
  if (!u) return;
  const e = u.empresa;
  if (!e) {
    toast(`${u.name} ainda não preencheu a ficha de empresa.`, 'error');
    return;
  }
  const _v = v => v || '—';
  const html = `
    <div style="max-width:600px;margin:0 auto">
      <div style="text-align:center;margin-bottom:16px">
        <i class="fas fa-building" style="font-size:2rem;color:#0e7490"></i>
        <h3 style="font-size:1.1rem;font-weight:700;color:#1e293b;margin:6px 0 0">${_v(e.razaoSocial)}</h3>
        <div style="font-size:.8rem;color:#64748b">${_v(e.nomeFantasia)} · CNPJ: ${_v(e.cnpj)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.82rem">
        <div><b style="color:var(--muted)">IE:</b> ${_v(e.inscricaoEstadual)}</div>
        <div><b style="color:var(--muted)">IM:</b> ${_v(e.inscricaoMunicipal)}</div>
        <div style="grid-column:1/-1"><b style="color:var(--muted)">Endereço:</b> ${_v(e.rua)}, ${_v(e.numero)} ${e.complemento||''} - ${_v(e.bairro)}, ${_v(e.cidade)}/${_v(e.estado)} CEP ${_v(e.cep)}</div>
        <div><b style="color:var(--muted)">Telefone:</b> ${_v(e.telefone)}</div>
        <div><b style="color:var(--muted)">Email:</b> ${_v(e.email)}</div>
        <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:8px;margin-top:4px"><b style="color:#0e7490">Dados Bancários</b></div>
        <div><b style="color:var(--muted)">Banco:</b> ${_v(e.banco)}</div>
        <div><b style="color:var(--muted)">Agência:</b> ${_v(e.agencia)}</div>
        <div><b style="color:var(--muted)">Conta:</b> ${_v(e.conta)}</div>
        <div><b style="color:var(--muted)">PIX:</b> ${_v(e.pix)}</div>
        <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:8px;margin-top:4px"><b style="color:#0e7490">Responsável Legal</b></div>
        <div><b style="color:var(--muted)">Nome:</b> ${_v(e.responsavel?.nome || e.respNome)}</div>
        <div><b style="color:var(--muted)">CPF:</b> ${_v(e.responsavel?.cpf || e.respCpf)}</div>
        <div><b style="color:var(--muted)">RG:</b> ${_v(e.responsavel?.rg || e.respRg)}</div>
      </div>
      ${u.contratoPDF ? `<div style="margin-top:14px;text-align:center">
        <a href="${u.contratoPDF}" target="_blank" class="btn btn-sm" style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe">
          <i class="fas fa-file-pdf" style="margin-right:4px"></i>Ver Contrato PDF</a>
      </div>` : ''}
      <div style="margin-top:16px;text-align:center;border-top:1px solid var(--border);padding-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a" onclick="document.getElementById('modal-ficha-empresa').remove();abrirEditarFichaAdmin('${uid}')">
          <i class="fas fa-pen"></i> Editar Ficha</button>
        <button class="btn btn-sm" style="background:#fff1f2;color:#be123c;border:1px solid #fda4af" onclick="document.getElementById('modal-ficha-empresa').remove();resetarFichaEmpresa('${uid}')">
          <i class="fas fa-redo"></i> Resetar Ficha</button>
      </div>
    </div>`;
  // Usa modal genérico se existir, senão cria um overlay
  let overlay = document.getElementById('modal-ficha-empresa');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-ficha-empresa';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:24px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;position:relative">
    <button onclick="document.getElementById('modal-ficha-empresa').remove()" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.3rem;color:#94a3b8;cursor:pointer">&times;</button>
    ${html}
  </div>`;
  overlay.style.display = 'flex';
}

function abrirEditarFichaAdmin(uid) {
  const u = usersCache[uid];
  if (!u) return;
  const e = u.empresa || {};
  const resp = e.responsavel || {};

  const _val = v => v || '';
  const _fmtCNPJ = v => { const c = (v||'').replace(/\D/g,''); return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0,18); };
  const _fmtCPF = v => { const c = (v||'').replace(/\D/g,''); return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0,14); };
  const _fmtPhone = v => { const c = (v||'').replace(/\D/g,''); return c.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0,15); };

  const estados = ['','AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const estadoOpts = estados.map(s => `<option value="${s}" ${(e.estado||'')==s?'selected':''}>${s||'Selecione'}</option>`).join('');

  const html = `
    <div style="max-width:600px;margin:0 auto">
      <div style="text-align:center;margin-bottom:16px">
        <i class="fas fa-user-edit" style="font-size:2rem;color:#92400e"></i>
        <h3 style="font-size:1.1rem;font-weight:700;color:#1e293b;margin:6px 0 0">Editar Ficha: ${u.name||uid}</h3>
      </div>
      <div style="font-size:.82rem;color:#475569;font-weight:600;margin-bottom:8px">Dados da Empresa</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Razão Social *</label><input type="text" id="adm-edit-razao" class="form-input" value="${_val(e.razaoSocial)}"></div>
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Nome Fantasia</label><input type="text" id="adm-edit-fantasia" class="form-input" value="${_val(e.nomeFantasia)}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">CNPJ *</label><input type="text" id="adm-edit-cnpj" class="form-input" value="${_fmtCNPJ(e.cnpj)}" maxlength="18"></div>
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">IE</label><input type="text" id="adm-edit-ie" class="form-input" value="${_val(e.ie || e.inscricaoEstadual)}"></div>
      </div>
      <div style="margin-bottom:10px"><label style="font-size:.75rem;color:#64748b;font-weight:600">IM</label><input type="text" id="adm-edit-im" class="form-input" value="${_val(e.im || e.inscricaoMunicipal)}"></div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Rua *</label><input type="text" id="adm-edit-rua" class="form-input" value="${_val(e.rua)}"></div>
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Nº *</label><input type="text" id="adm-edit-numero" class="form-input" value="${_val(e.numero)}"></div>
      </div>
      <div style="margin-bottom:10px"><label style="font-size:.75rem;color:#64748b;font-weight:600">Complemento</label><input type="text" id="adm-edit-complemento" class="form-input" value="${_val(e.complemento)}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">CEP</label><input type="text" id="adm-edit-cep" class="form-input" value="${_val(e.cep)}"></div>
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Bairro *</label><input type="text" id="adm-edit-bairro" class="form-input" value="${_val(e.bairro)}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Cidade *</label><input type="text" id="adm-edit-cidade" class="form-input" value="${_val(e.cidade)}"></div>
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Estado *</label><select id="adm-edit-estado" class="form-input">${estadoOpts}</select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Telefone *</label><input type="tel" id="adm-edit-telefone" class="form-input" value="${_fmtPhone(e.telefone)}"></div>
        <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Email</label><input type="email" id="adm-edit-email" class="form-input" value="${_val(e.email)}"></div>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px">
        <div style="font-size:.82rem;color:#475569;font-weight:600;margin-bottom:8px">Responsável Legal</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Nome *</label><input type="text" id="adm-edit-resp-nome" class="form-input" value="${_val(resp.nome || e.respNome)}"></div>
          <div><label style="font-size:.75rem;color:#64748b;font-weight:600">CPF *</label><input type="text" id="adm-edit-resp-cpf" class="form-input" value="${_fmtCPF(resp.cpf || e.respCpf)}" maxlength="14"></div>
        </div>
        <div style="margin-bottom:10px"><label style="font-size:.75rem;color:#64748b;font-weight:600">RG</label><input type="text" id="adm-edit-resp-rg" class="form-input" value="${_val(resp.rg || e.respRg)}"></div>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px">
        <div style="font-size:.82rem;color:#475569;font-weight:600;margin-bottom:8px">Dados Bancários</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Banco</label><input type="text" id="adm-edit-banco" class="form-input" value="${_val(e.banco)}"></div>
          <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Agência</label><input type="text" id="adm-edit-agencia" class="form-input" value="${_val(e.agencia)}"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div><label style="font-size:.75rem;color:#64748b;font-weight:600">Conta</label><input type="text" id="adm-edit-conta" class="form-input" value="${_val(e.conta)}"></div>
          <div><label style="font-size:.75rem;color:#64748b;font-weight:600">PIX</label><input type="text" id="adm-edit-pix" class="form-input" value="${_val(e.pix)}"></div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-sm" style="flex:1;background:#059669;color:#fff;padding:10px;font-weight:700;font-size:.9rem" onclick="salvarFichaAdmin('${uid}')">
          <i class="fas fa-check"></i> Salvar</button>
        <button class="btn btn-sm" style="flex:1;background:#f1f5f9;color:#475569;padding:10px;font-weight:700;font-size:.9rem" onclick="document.getElementById('modal-editar-ficha-admin').remove()">
          <i class="fas fa-times"></i> Cancelar</button>
      </div>
    </div>`;

  let overlay = document.getElementById('modal-editar-ficha-admin');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-editar-ficha-admin';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.onclick = ev => { if (ev.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:24px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;position:relative">
    <button onclick="document.getElementById('modal-editar-ficha-admin').remove()" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.3rem;color:#94a3b8;cursor:pointer">&times;</button>
    ${html}
  </div>`;
  overlay.style.display = 'flex';

  // Setup masks
  const _setupMask = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ev => { ev.target.value = fn(ev.target.value); });
  };
  _setupMask('adm-edit-cnpj', _fmtCNPJ);
  _setupMask('adm-edit-telefone', _fmtPhone);
  _setupMask('adm-edit-resp-cpf', _fmtCPF);
}

async function salvarFichaAdmin(uid) {
  const _g = id => document.getElementById(id)?.value?.trim() || '';

  const razao = _g('adm-edit-razao');
  const cnpj = _g('adm-edit-cnpj').replace(/\D/g,'');
  const rua = _g('adm-edit-rua');
  const numero = _g('adm-edit-numero');
  const bairro = _g('adm-edit-bairro');
  const cidade = _g('adm-edit-cidade');
  const estado = _g('adm-edit-estado');
  const telefone = _g('adm-edit-telefone').replace(/\D/g,'');
  const respNome = _g('adm-edit-resp-nome');
  const respCpf = _g('adm-edit-resp-cpf').replace(/\D/g,'');

  if (!razao || !cnpj || !rua || !numero || !bairro || !cidade || !estado || !telefone || !respNome || !respCpf) {
    toast('Preencha todos os campos obrigatórios (*)', 'error');
    return;
  }

  try {
    const empresa = {
      razaoSocial: razao,
      nomeFantasia: _g('adm-edit-fantasia') || null,
      cnpj: cnpj,
      ie: _g('adm-edit-ie') || null,
      im: _g('adm-edit-im') || null,
      rua: rua,
      numero: numero,
      complemento: _g('adm-edit-complemento') || null,
      cep: _g('adm-edit-cep') || null,
      bairro: bairro,
      cidade: cidade,
      estado: estado,
      telefone: telefone,
      email: _g('adm-edit-email') || null,
      banco: _g('adm-edit-banco') || null,
      agencia: _g('adm-edit-agencia') || null,
      conta: _g('adm-edit-conta') || null,
      pix: _g('adm-edit-pix') || null,
      responsavel: {
        nome: respNome,
        cpf: respCpf,
        rg: _g('adm-edit-resp-rg') || null
      },
      salvoEm: new Date().toISOString()
    };

    await _dbSet(`users/${uid}/empresa`, empresa);

    // Update cache
    if (usersCache[uid]) usersCache[uid].empresa = empresa;

    const overlay = document.getElementById('modal-editar-ficha-admin');
    if (overlay) overlay.remove();

    toast(`Ficha de "${usersCache[uid]?.name || uid}" atualizada com sucesso!`, 'success');
    renderUsuariosPage();
  } catch (e) {
    console.error('[salvarFichaAdmin]', e);
    toast('Erro ao salvar: ' + (e.message || e), 'error');
  }
}

async function dispensarFichaEmpresa(uid) {
  const u = usersCache[uid];
  if (!u) return;
  if (!confirm(`Dispensar a ficha de empresa de "${u.name}"?\n\nO técnico poderá usar o sistema sem preencher o cadastro da empresa.`)) return;
  try {
    await _dbSet(`users/${uid}/empresa`, { dispensado: true, dispensadoPor: currentUser.name || currentUser.id, dispensadoEm: new Date().toISOString() });
    usersCache[uid] = { ...u, empresa: { dispensado: true } };
    renderUsuariosPage();
    toast(`Ficha de "${u.name}" dispensada. O técnico pode acessar o sistema normalmente.`, 'success');
  } catch(e) {
    console.error('[dispensarFichaEmpresa]', e);
    toast('Erro ao dispensar: ' + (e.message || e), 'error');
  }
}

async function invalidarAssinaturaGovBr(uid) {
  const u = usersCache[uid];
  if (!u) return;
  if (!confirm(`Invalidar a autenticação Gov.br do contrato de "${u.name}"?\n\nO contrato continuará como assinado, mas o prestador verá um aviso para re-assinar via assinador.iti.br no próximo login.`)) return;
  try {
    await db.ref(`contratos/${uid}/prestacaoServicos/assinadoVia`).remove();
    toast(`Autenticação Gov.br de "${u.name}" invalidada. Ele deverá re-assinar via assinador.iti.br.`, 'success');
    renderUsuariosPage();
  } catch(e) {
    console.error('[invalidarAssinaturaGovBr]', e);
    toast('Erro ao invalidar: ' + (e.message || e), 'error');
  }
}

async function invalidarAssinaturaGovBrVendaPrazo(uid) {
  const u = usersCache[uid];
  if (!u) return;
  if (!confirm(`Invalidar a autenticação Gov.br do Contrato de Venda a Prazo de "${u.name}"?\n\nOs contratos continuarão como assinados, mas o prestador verá um aviso para re-assinar via assinador.iti.br.`)) return;
  try {
    let snap = await db.ref('config/descontos').once('value');
    const descontos = snap.val() || {};
    const entries = Object.entries(descontos).filter(([, d]) => d.uid === uid && d.termoAssinado === true);
    if (entries.length === 0) {
      toast(`Nenhum Contrato de Venda a Prazo assinado encontrado para "${u.name}".`, 'info');
      return;
    }
    for (const [fbKey] of entries) {
      await db.ref(`config/descontos/${fbKey}`).update({
        termoAssinado: false,
        termoAceitoTec: false,
        termoAssinadoVia: null,
        termoConfirmadoEm: null,
        termoNomeArquivo: null,
        termoValidacaoConteudo: null
      });
    }
    toast(`Gov.br invalidado. "${u.name}" deverá baixar e re-assinar o(s) contrato(s) no próximo acesso.`, 'success');
    renderUsuariosPage();
  } catch(e) {
    console.error('[invalidarAssinaturaGovBrVendaPrazo]', e);
    toast('Erro ao invalidar: ' + (e.message || e), 'error');
  }
}

async function invalidarTermoGovBr(fbKey) {
  const d = descontosCache[fbKey];
  if (!d) return;
  const tecNome = usersCache[d.uid]?.name || d.uid;
  if (!confirm(`Invalidar a autenticação Gov.br do Contrato de Venda a Prazo de "${tecNome}"?\n\nO prestador será bloqueado no próximo acesso e terá que baixar, assinar via assinador.iti.br e reenviar o PDF.`)) return;
  try {
    // Reseta para "pendente": bloqueia o mobile até nova assinatura gov.br
    await db.ref(`config/descontos/${fbKey}`).update({
      termoAssinado: false,
      termoAceitoTec: false,
      termoAssinadoVia: null,
      termoConfirmadoEm: null,
      termoNomeArquivo: null,
      termoValidacaoConteudo: null
    });
    toast(`Gov.br invalidado. "${tecNome}" deverá baixar e re-assinar o contrato no próximo acesso.`, 'success');
    await carregarDescontos();
    _renderFinDescontos();
    renderDescontosLista();
  } catch(e) {
    console.error('[invalidarTermoGovBr]', e);
    toast('Erro ao invalidar: ' + (e.message || e), 'error');
  }
}

async function resetarFichaEmpresa(uid) {
  const u = usersCache[uid];
  if (!u) return;
  if (!confirm(`Resetar a ficha de empresa de "${u.name}"?\n\nIsso apagará os dados cadastrais e o contrato assinado.\nO prestador terá que preencher a ficha e assinar um novo contrato no próximo acesso.`)) return;
  try {
    // Remove ficha da empresa
    await _dbRemove(`users/${uid}/empresa`);
    // Remove contrato (força nova assinatura)
    await _dbRemove(`contratos/${uid}/prestacaoServicos`);
    // Atualiza cache local
    const updated = { ...u };
    delete updated.empresa;
    usersCache[uid] = updated;
    renderUsuariosPage();
    toast(`Ficha de "${u.name}" resetada. O prestador deverá preencher novamente no próximo acesso.`, 'success');
  } catch(e) {
    console.error('[resetarFichaEmpresa]', e);
    toast('Erro ao resetar ficha: ' + (e.message || e), 'error');
  }
}

async function reverterDispensaFicha(uid) {
  const u = usersCache[uid];
  if (!u) return;
  if (!confirm(`Reverter a dispensa de "${u.name}"?\n\nO técnico será obrigado a preencher a ficha de empresa no próximo login.`)) return;
  try {
    await _dbRemove(`users/${uid}/empresa`);
    usersCache[uid] = { ...u, empresa: null };
    renderUsuariosPage();
    toast(`Dispensa de "${u.name}" revertida. O técnico precisará preencher a ficha no próximo acesso.`, 'success');
  } catch(e) {
    console.error('[reverterDispensaFicha]', e);
    toast('Erro ao reverter: ' + (e.message || e), 'error');
  }
}

async function importarContrato(uid, event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Selecione um arquivo PDF.', 'error');
    event.target.value = '';
    return;
  }
  // Converte para base64 Data URL e salva no Firebase
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    try {
      await _dbSet(`users/${uid}/contratoPDF`, dataUrl);
      usersCache[uid] = { ...(usersCache[uid] || {}), contratoPDF: dataUrl };
      renderUsuariosPage();
      toast(`Contrato de ${usersCache[uid]?.name || uid} importado com sucesso!`, 'success');
    } catch(e) {
      console.error('[importarContrato]', e);
      toast('Erro ao importar contrato: ' + (e.message || e), 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function travarPrestador(uid) {
  const u = usersCache[uid];
  if (!u) return;
  if (!confirm(`Travar "${u.name}"?\n\nIsso gerará um Termo de Rescisão de Contrato. O técnico ficará bloqueado até assinar o documento e será arquivado automaticamente após a assinatura.`)) return;

  const hoje = new Date();
  const dataRescisao = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;

  const rescisao = {
    status: 'pendente',
    dataRescisao,
    criadoEm: hoje.toISOString(),
    criadoPor: currentUser.name || currentUser.id,
    termoAceitoTec: false,
    pdfAssinado: null,
  };

  try {
    await _dbSet(`users/${uid}/rescisao`, rescisao);
    usersCache[uid] = { ...u, rescisao };
    renderUsuariosPage();
    toast(`Termo de Rescisão gerado para "${u.name}". O técnico será bloqueado no próximo login.`, 'success');
  } catch(e) {
    console.error('[travarPrestador]', e);
    toast('Erro ao gerar termo: ' + (e.message || e), 'error');
  }
}

async function reverterRescisao(uid) {
  const u = usersCache[uid];
  if (!u) return;
  if (!confirm(`Reverter o bloqueio de "${u.name}"?\n\nO Termo de Rescisão pendente será cancelado e o técnico poderá acessar o sistema normalmente.`)) return;

  try {
    await _dbRemove(`users/${uid}/rescisao`);
    const updated = { ...u };
    delete updated.rescisao;
    usersCache[uid] = updated;
    renderUsuariosPage();
    toast(`Bloqueio de "${u.name}" revertido com sucesso.`, 'success');
  } catch(e) {
    console.error('[reverterRescisao]', e);
    toast('Erro ao reverter bloqueio: ' + (e.message || e), 'error');
  }
}

async function verificarRescisaoPendente() {
  if (currentUser?.role === 'master' || _isAdmin(currentUser) || _isObservador(currentUser)) return false;
  const uid = currentUser.id;

  let rescisao = null;
  try {
    const snap = await db.ref(`users/${uid}/rescisao`).once('value');
    rescisao = snap.val();
  } catch(_) { return false; }

  if (!rescisao || rescisao.status !== 'pendente') return false;

  // Carrega assinatura do master para o termo (se ainda não carregada)
  if (!assinaturaMaster) {
    assinaturaMaster = await _dbRead('config/assinatura_master', null);
  }

  // Mostra tela de bloqueio com termo de rescisão
  renderTermoRescisao(rescisao);
  screen('termo-pendente');
  return true;
}

function renderTermoRescisao(rescisao) {
  const el = document.getElementById('termo-pendente-content');
  if (!el) return;

  const tecNome = currentUser.name || currentUser.id;
  const empresa = currentUser.empresa || {};
  const assinMestre = assinaturaMaster;

  const sigImg = assinMestre?.dataUrl
    ? `<img src="${assinMestre.dataUrl}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;margin:0 auto">`
    : `<div style="height:48px"></div>`;

  const _v = v => v || '—';

  el.innerHTML = `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
      padding:10px 14px;margin-bottom:14px;font-size:.83rem;color:#991b1b;display:flex;align-items:center;gap:8px">
      <i class="fas fa-ban"></i>
      <span><strong>Termo de Rescisão de Contrato</strong> — Leia e assine para finalizar.</span>
    </div>

    <div style="border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:18px">
      <!-- Cabeçalho -->
      <div style="background:#991b1b;color:#fff;padding:14px 18px;text-align:center">
        <div style="font-size:.88rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px">
          Termo de Rescisão de Contrato de Prestação de Serviços
        </div>
        <div style="font-size:.72rem;opacity:.85">Instrumento Particular de Encerramento — Sem Vínculo Empregatício</div>
      </div>

      <!-- Corpo -->
      <div style="padding:16px 18px;font-size:.8rem;color:#1a1a1a;line-height:1.65;font-family:'Times New Roman',serif">

        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
          color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px">
          1. Identificação das Partes
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-size:.78rem">
          <div>
            <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:1px">Contratante</div>
            <div style="border-bottom:1px dotted #aaa;padding-bottom:2px"><strong>${_v(assinMestre?.nome)}</strong></div>
            ${assinMestre?.cpfCnpj ? `<div style="font-size:.7rem;color:#555;margin-top:3px">CNPJ/CPF: ${assinMestre.cpfCnpj}</div>` : ''}
            ${assinMestre?.endereco ? `<div style="font-size:.7rem;color:#555">${assinMestre.endereco}</div>` : ''}
          </div>
          <div>
            <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:1px">Contratado (Prestador)</div>
            <div style="border-bottom:1px dotted #aaa;padding-bottom:2px"><strong>${_v(empresa.razaoSocial || tecNome)}</strong></div>
            ${empresa.cnpj ? `<div style="font-size:.7rem;color:#555;margin-top:3px">CNPJ: ${empresa.cnpj}</div>` : ''}
            ${empresa.rua ? `<div style="font-size:.7rem;color:#555">${empresa.rua}, ${empresa.numero||''} - ${empresa.bairro||''}, ${empresa.cidade||''}/${empresa.estado||''}</div>` : ''}
            ${(empresa.responsavel?.nome || empresa.respNome) ? `<div style="font-size:.7rem;color:#555">Resp.: ${empresa.responsavel?.nome || empresa.respNome} — CPF: ${_v(empresa.responsavel?.cpf || empresa.respCpf)}</div>` : ''}
          </div>
        </div>

        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
          color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px">
          2. Objeto da Rescisão
        </div>
        <div style="background:#fef2f2;border-left:3px solid #dc2626;padding:9px 12px;
          border-radius:0 6px 6px 0;margin-bottom:12px;font-size:.78rem">
          Pelo presente instrumento, as partes acima identificadas, de comum acordo, declaram
          <strong>rescindido o contrato de prestação de serviços</strong> que mantinham entre si,
          com efeitos a partir de <strong>${_v(rescisao.dataRescisao)}</strong>.
        </div>

        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
          color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px">
          3. Cláusulas
        </div>
        <div style="font-size:.78rem;text-align:justify;margin-bottom:6px">
          <strong>3.1</strong> A partir da data acima, o <strong>CONTRATADO</strong> não prestará mais
          serviços ao <strong>CONTRATANTE</strong>, cessando todas as obrigações mútuas decorrentes
          do contrato original, exceto as obrigações financeiras pendentes já acordadas.
        </div>
        <div style="font-size:.78rem;text-align:justify;margin-bottom:6px">
          <strong>3.2</strong> Eventuais valores devidos ao <strong>CONTRATADO</strong> referentes a
          serviços já prestados e não quitados serão pagos conforme o cronograma regular de pagamentos.
        </div>
        <div style="font-size:.78rem;text-align:justify;margin-bottom:6px">
          <strong>3.3</strong> O <strong>CONTRATADO</strong> declara nada mais ter a reclamar do
          <strong>CONTRATANTE</strong> após a quitação dos valores pendentes, dando plena e
          irrevogável quitação.
        </div>
        <div style="font-size:.78rem;text-align:justify;margin-bottom:14px">
          <strong>3.4</strong> Este termo é firmado de forma livre e espontânea, sem qualquer coação,
          e as partes reconhecem que o encerramento se dá de forma amigável.
        </div>

        <!-- Assinaturas -->
        <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
          color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:12px">
          Assinaturas
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:center;font-size:.76rem">
          <div>
            <div style="border-bottom:1px solid #333;padding-bottom:4px;margin-bottom:4px;min-height:50px">
              ${sigImg}
            </div>
            <strong>${_v(assinMestre?.nome)}</strong><br>
            <span style="font-size:.68rem;color:#666">Contratante</span>
            ${assinMestre?.cargo ? `<br><span style="font-size:.65rem;color:#999">${assinMestre.cargo}</span>` : ''}
          </div>
          <div>
            <div style="border-bottom:1px solid #333;padding-bottom:4px;margin-bottom:4px;min-height:50px">
              <div style="height:50px"></div>
            </div>
            <strong>${tecNome}</strong><br>
            <span style="font-size:.68rem;color:#666">Contratado / Prestador</span>
          </div>
        </div>

        <div style="text-align:center;margin-top:12px;font-size:.72rem;color:#999">
          Data: ${_v(rescisao.dataRescisao)}
        </div>
      </div>
    </div>

    <!-- Ações -->
    <div style="text-align:center;margin-top:16px">
      <p style="font-size:.82rem;color:#64748b;margin-bottom:12px">
        <i class="fas fa-info-circle"></i> Ao assinar este termo, seu acesso ao sistema será encerrado.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <label class="btn btn-primary" style="cursor:pointer;padding:10px 24px;font-size:.9rem">
          <i class="fas fa-file-upload" style="margin-right:6px"></i>Enviar Termo Assinado (PDF)
          <input type="file" accept=".pdf" style="display:none" onchange="uploadRescisaoAssinada(event)">
        </label>
        <button class="btn" style="background:#dc2626;color:#fff;padding:10px 24px;font-size:.9rem" onclick="aceitarRescisaoDigital()">
          <i class="fas fa-check-circle" style="margin-right:6px"></i>Aceitar Digitalmente
        </button>
      </div>
    </div>`;
}

async function uploadRescisaoAssinada(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Selecione um arquivo PDF.', 'error');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await finalizarRescisao(reader.result);
    } catch(e) {
      toast('Erro ao enviar: ' + (e.message || e), 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function aceitarRescisaoDigital() {
  if (!confirm('Ao aceitar digitalmente, você confirma que leu e concorda com todos os termos da rescisão. Seu acesso será encerrado. Deseja continuar?')) return;
  try {
    await finalizarRescisao(null);
  } catch(e) {
    toast('Erro ao aceitar: ' + (e.message || e), 'error');
  }
}

async function finalizarRescisao(pdfDataUrl) {
  const uid = currentUser.id;
  const agora = new Date().toISOString();

  const updates = {};
  updates[`users/${uid}/rescisao/status`] = 'assinado';
  updates[`users/${uid}/rescisao/termoAceitoTec`] = true;
  updates[`users/${uid}/rescisao/assinadoEm`] = agora;
  if (pdfDataUrl) updates[`users/${uid}/rescisao/pdfAssinado`] = pdfDataUrl;
  // Arquiva automaticamente
  updates[`users/${uid}/ativo`] = false;

  await db.ref().update(updates);

  toast('Termo de Rescisão assinado. Seu acesso foi encerrado.', 'success');

  // Aguarda 2 segundos e faz logout
  setTimeout(() => {
    logout();
  }, 2500);
}

function abrirRenomear(uid, nomeAtual) {
  _renomearUid = uid;
  const inp = document.getElementById('input-novo-nome');
  inp.value = nomeAtual;
  const rerr = document.getElementById('renomear-err');
  if (rerr) rerr.style.display = 'none';
  const mren = document.getElementById('modal-renomear');
  if (mren) mren.classList.add('open');
  setTimeout(()=>{ inp.select(); inp.focus(); }, 150);
}

async function confirmarRenomear() {
  const novoNome = document.getElementById('input-novo-nome').value.trim();
  const err = document.getElementById('renomear-err');
  if (!novoNome) { err.textContent='Digite um nome válido.'; err.style.display='block'; return; }
  if (!_renomearUid) return;

  // Atualiza no Firebase (usuário) e em todos os registros de OS deste técnico
  await _dbUpdate(`users/${_renomearUid}`, {name: novoNome});
  usersCache[_renomearUid] = {...(usersCache[_renomearUid]||{}), name: novoNome};

  // Atualiza USERS_INIT localmente para refletir no login
  const u = USERS_INIT.find(x=>x.id===_renomearUid);
  if (u) u.name = novoNome;

  // Atualiza nome nos registros de OS existentes
  const updates = {};
  allRecords.forEach(r=>{ if(r.userId===_renomearUid && r.fbKey) updates[`os/${r.fbKey}/userName`]=novoNome; });
  if(Object.keys(updates).length) await db.ref().update(updates);

  // Se renomeando o usuário atual (master renomeando a si mesmo)
  if (_renomearUid === currentUser?.id) {
    currentUser.name = novoNome;
    document.getElementById('sb-username').textContent = novoNome;
  }

  fecharModal('modal-renomear');
  await carregarDados();
  renderUsuariosPage();
  const isMasterRename = _renomearUid === 'master';
  toast(`${isMasterRename ? 'Nome master' : 'Prestador'} renomeado para "${novoNome}" com sucesso!`,'success');
}

function atualizarAvatarSidebar() {
  const foto = usersCache[currentUser?.id]?.profilePhoto;
  const av = document.getElementById('sb-avatar');
  if (!av) return;
  av.innerHTML = foto
    ? `<img src="${foto}" alt="perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : `<i class="fas fa-user-circle"></i>`;
}

async function salvarFotoPerfil(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    const img = new Image();
    img.onload = async function() {
      const MAX = 150;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL('image/jpeg', 0.82);
      await _dbUpdate(`users/${currentUser.id}`, { profilePhoto: b64 });
      usersCache[currentUser.id] = { ...(usersCache[currentUser.id]||{}), profilePhoto: b64 };
      atualizarAvatarSidebar();
      toast('Foto de perfil atualizada!', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function abrirRenomearMaster() {
  _renomearUid = 'master';
  const nomeAtual = usersCache['master']?.name || currentUser?.name || 'JA';
  const inp = document.getElementById('input-novo-nome');
  if (!inp) return;
  inp.value = nomeAtual;
  const rerr2 = document.getElementById('renomear-err');
  if (rerr2) rerr2.style.display = 'none';
  const mren2 = document.getElementById('modal-renomear');
  if (mren2) mren2.classList.add('open');
  setTimeout(() => { inp.select(); inp.focus(); }, 150);
}