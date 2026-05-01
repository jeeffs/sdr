'use strict';

window._atualizarDropdownTecnicos = function () {
  const imp = document.getElementById('filter-importado')?.value || '';
  // Base: registros filtrados pelo critério de importado
  const base = imp === ''     ? allRecords
             : imp === 'imp'  ? allRecords.filter(r =>  r.importado)
             :                  allRecords.filter(r => !r.importado);

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
    // Mantém seleção anterior se ainda válida (não desabilitada)
    if (prev && comOS.has(prev)) el.value = prev;
    else if (prev) el.value = ''; // era inválido — reseta para "Todos os prestadores"
  });
}

window._atualizarDropdownCidades = function (activeRecords) {
  ['filter-cidade','exp-cidade'].forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    const prev=el.value;
    const first=el.options[0].outerHTML;

    if (!_isAdmin(currentUser)) {
      // Técnico: lista todas as cidades do sistema — habilita só as que têm OS nos registros ativos
      const todasCidades = [
        ...new Set([
          ...(profilesCidades.FILIAL || []),
          ...(profilesCidades.MATRIZ || []),
          ...allRecords.filter(r=>r.userId===currentUser.id&&r.cidade).map(r=>r.cidade)
        ])
      ].sort();
      const comOS = new Set((activeRecords||[]).filter(r=>r.cidade).map(r=>r.cidade));
      el.innerHTML = first + todasCidades.map(c =>
        comOS.has(c)
          ? `<option value="${c}">${c}</option>`
          : `<option value="${c}" disabled style="color:#cbd5e1">${c} (sem OS)</option>`
      ).join('');
    } else {
      // Admin: lista TODAS as cidades do sistema — habilita só as que têm OS, desabilita o restante
      const todasCidades = [
        ...new Set([
          ...(profilesCidades.FILIAL || []),
          ...(profilesCidades.MATRIZ || []),
          ...allRecords.filter(r => r.cidade).map(r => r.cidade)
        ])
      ].sort();
      const comOS = new Set(allRecords.filter(r => r.cidade).map(r => r.cidade));
      el.innerHTML = first + todasCidades.map(c =>
        comOS.has(c)
          ? `<option value="${c}">${c}</option>`
          : `<option value="${c}" disabled style="color:#cbd5e1">${c} (sem OS)</option>`
      ).join('');
    }

    if(prev) el.value=prev;
  });
}

window.popularFiltros = function () {
  // Cidade: usa todos os registros do usuário como base inicial
  _atualizarDropdownCidades(filteredRecords());

  if (_isAdmin(currentUser)) {
    _atualizarDropdownTecnicos();
  }
}

window.abrirFotoModal = function (fbKey) {
  const r = _getRecordByKey(fbKey);
  if (!r || !r.foto) return;
  verDetalhe(fbKey);
}

window.verDetalhe = function (fbKey) {
  const r=_getRecordByKey(fbKey); if(!r)return;
  const rows=r.servicos?.map(s=>`<tr>
    <td style="padding:7px 10px">${s.tipo}</td>
    <td style="padding:7px 10px;text-align:center">${s.qtd}</td>
    <td style="padding:7px 10px;text-align:right">${fmtMoeda(s.valor)}</td>
    <td style="padding:7px 10px;text-align:right;font-weight:700;color:var(--success)">${fmtMoeda(s.total)}</td>
  </tr>`).join('')||'';
  const mapsLink=r.lat?`<a href="https://www.google.com/maps?q=${r.lat},${r.lon}" target="_blank" style="font-size:.78rem;color:var(--primary)"><i class="fas fa-map"></i> Ver no mapa</a>`:'';
  document.getElementById('modal-detail-content').innerHTML=`
    <table style="width:100%;font-size:.84rem;margin-bottom:14px;border-collapse:collapse">
      <tr><td style="color:var(--muted);width:110px;padding:4px 0">Data/Hora</td><td><b>${fmtData(r.data)}${r.hora?' às '+r.hora:''}</b></td></tr>
      <tr><td style="color:var(--muted);padding:4px 0">Código OS</td><td><b>${r.codigo_os||'—'}</b></td></tr>
      <tr><td style="color:var(--muted);padding:4px 0">Prestador</td><td>${r.userName||'—'}</td></tr>
      <tr><td style="color:var(--muted);padding:4px 0">Profile</td><td>${r.profile}</td></tr>
      <tr><td style="color:var(--muted);padding:4px 0">Tipo</td><td>${r.tipo||'—'}</td></tr>
      <tr><td style="color:var(--muted);padding:4px 0">Cidade</td><td>${r.cidade||'—'}</td></tr>
      <tr><td style="color:var(--muted);padding:4px 0">Referência</td><td>${r.referencia||'—'}</td></tr>
      <tr><td style="color:var(--muted);padding:4px 0">CTO/CEO</td><td>${r.cto_ceo||'—'}</td></tr>
      ${r.lat?`<tr><td style="color:var(--muted);padding:4px 0">GPS</td><td>${r.lat}, ${r.lon} ${mapsLink}</td></tr>`:''}
    </table>
    ${r.foto?`<div style="margin-bottom:14px"><div style="font-weight:600;font-size:.84rem;margin-bottom:8px;color:var(--primary)"><i class="fas fa-camera"></i> Foto do Local</div><img src="${r.foto}" alt="Foto" style="max-width:100%;border-radius:10px;border:1px solid var(--border)"></div>`:''}
    <div style="font-weight:600;margin-bottom:8px;font-size:.84rem">Serviços</div>
    <table style="width:100%;font-size:.81rem;border-collapse:collapse">
      <thead style="background:var(--primary);color:#fff"><tr>
        <th style="padding:7px 10px;text-align:left">Serviço</th><th style="padding:7px 10px">Qtde</th>
        <th style="padding:7px 10px">Valor Unit.</th><th style="padding:7px 10px">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#f0fdf4;font-weight:700">
        <td colspan="3" style="padding:7px 10px;text-align:right">TOTAL GERAL:</td>
        <td style="padding:7px 10px;text-align:right;color:var(--success)">${fmtMoeda(r.total)}</td>
      </tr></tfoot>
    </table>
    ${r.nota_correcao ? `
    <div style="margin-top:14px;padding:10px 14px;background:#fff7ed;border-radius:8px;border-left:4px solid #f59e0b;font-size:.79rem;color:#92400e;line-height:1.5">
      <i class="fas fa-info-circle" style="margin-right:5px;color:#d97706"></i><b>Nota de correção:</b> ${r.nota_correcao}
    </div>` : ''}`;
  const md = document.getElementById('modal-detail');
  if (md) md.classList.add('open');
}

window._editPreencherForm = function (r) {
  document.getElementById('edit-data').value       = r.data || '';
  document.getElementById('edit-hora').value       = r.hora || '';
  document.getElementById('edit-codigo').value     = r.codigo_os || '';
  document.getElementById('edit-profile').value    = r.profile || 'FILIAL';
  document.getElementById('edit-tipo').value       = r.tipo || 'MANUTENÇÃO';
  document.getElementById('edit-cto').value        = r.cto_ceo || '';
  document.getElementById('edit-cidade').value     = r.cidade || '';
  document.getElementById('edit-referencia').value = r.referencia || '';
  const cont = document.getElementById('edit-servicos-rows');
  cont.innerHTML = '';
  const OPTS = SERVICOS.map(s => `<option>${s}</option>`).join('');
  for (let i = 1; i <= MAX_SERVICOS_POR_OS; i++) {
    const sv = (r.servicos || [])[i-1] || {};
    cont.innerHTML += `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;margin-bottom:6px">
      <select id="edit-s-tipo-${i}" onchange="calcEditTotal()">
        <option value="">-- ${i}º Serviço --</option>${OPTS}
      </select>
      <input type="number" id="edit-s-qtd-${i}" placeholder="Qtde" min="0" step="1" value="${sv.qtd||''}"
        oninput="calcEditTotal()">
      <input type="number" id="edit-s-val-${i}" placeholder="0,00" min="0" step="0.01" value="${sv.valor||''}"
        style="background:#f0fdf4" readonly>
    </div>`;
    if (sv.tipo) {
      setTimeout(() => {
        const sel = document.getElementById(`edit-s-tipo-${i}`);
        if (sel) { sel.value = sv.tipo; }
      }, 0);
    }
  }
  calcEditTotal();
}

window.editarOS = function (fbKey) {
  const r = _getRecordByKey(fbKey);
  if (!r) return;
  if (_isImportadaConcluida(r) && !_isAdmin(currentUser)) {
    toast('OS importada (histórica) não pode ser editada.', 'error'); return;
  }
  _editFbKey = fbKey;
  _editPreencherForm(r);
  const meo = document.getElementById('modal-edit-os');
  if (meo) meo.classList.add('open');
}

window.calcEditTotal = function () {
  let t = 0;
  for (let i = 1; i <= 5; i++) {
    const tipo = (document.getElementById(`edit-s-tipo-${i}`)?.value || '');
    const qtd  = parseInt(document.getElementById(`edit-s-qtd-${i}`)?.value) || 0;
    const valEl = document.getElementById(`edit-s-val-${i}`);
    const preco = (tipo && precosV1map[tipo] !== undefined) ? precosV1map[tipo] : 0;
    if (valEl) valEl.value = preco || '';
    t += qtd * preco;
  }
  const el = document.getElementById('edit-total-preview');
  if (el) el.innerHTML = fmtMoeda(t);
}

window.confirmarDel = function (fbKey){
  const mdm = document.getElementById('modal-del-msg');
  if (mdm) mdm.textContent='Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.';
  const md = document.getElementById('modal-del');
  if (md) md.classList.add('open');
  const mok = document.getElementById('modal-del-ok');
  if (mok) mok.onclick=async()=>{
    await deletarOS(fbKey);fecharModal('modal-del');
  };
}

window.confirmarLimparTudo = function (){
  // Identifica filtros ativos
  const tecUid = document.getElementById('filter-tec')?.value || '';
  const imp    = document.getElementById('filter-importado')?.value || '';
  const tecNome = tecUid ? (usersCache[tecUid]?.name || tecUid) : '';

  // Filtra os registros que serão excluídos (respeitando os filtros)
  const aExcluir = allRecords.filter(r => {
    if (tecUid && r.userId !== tecUid) return false;
    if (imp === 'imp' && !r.importado) return false;
    if (imp === 'nao' && r.importado) return false;
    return true;
  });

  if (!aExcluir.length) { toast('Nenhum registro para excluir com os filtros atuais.', 'error'); return; }

  // Monta mensagem descritiva
  let msg = `Excluir ${aExcluir.length} registro(s)`;
  if (tecNome) msg += ` de "${tecNome}"`;
  if (imp === 'imp') msg += ' (somente importados)';
  else if (imp === 'nao') msg += ' (somente lançados)';
  else if (!tecUid) msg += ' de TODOS os técnicos';
  msg += '?\n\nEssa ação não pode ser desfeita.';

  const mdm2 = document.getElementById('modal-del-msg');
  if (mdm2) mdm2.textContent = msg;
  const md2 = document.getElementById('modal-del');
  if (md2) md2.classList.add('open');
  document.getElementById('modal-del-ok').onclick = async () => {
    try {
      const updates = {};
      aExcluir.forEach(r => { if (r.fbKey) updates[r.fbKey] = null; });
      await _dbUpdate('os', updates);
      await carregarDados();
      fecharModal('modal-del');
      toast(`${aExcluir.length} registro(s) excluído(s).`, 'success');
    } catch(e) {
      console.error('[confirmarLimparTudo]', e);
      toast('Erro ao excluir: ' + (e.message||e), 'error');
    }
  };
}

window.salvarEdicaoOS = async function () {
  try {
    if (!_editFbKey) return;
    const servicos = [];
    for (let i = 1; i <= 5; i++) {
      const tipo = (document.getElementById(`edit-s-tipo-${i}`)?.value || '').trim();
      if (!tipo) continue;
      const qtd  = parseInt(document.getElementById(`edit-s-qtd-${i}`)?.value) || 0;
      const val  = parseFloat(document.getElementById(`edit-s-val-${i}`)?.value) || 0;
      servicos.push({ tipo, qtd, valor: val, total: qtd * val });
    }
    if (!servicos.length) { toast('Adicione pelo menos 1 serviço.', 'error'); return; }
    const total = servicos.reduce((s, x) => s + x.total, 0);
    const updates = {
      data:       document.getElementById('edit-data').value,
      hora:       document.getElementById('edit-hora').value,
      codigo_os:  document.getElementById('edit-codigo').value.trim(),
      profile:    document.getElementById('edit-profile').value,
      tipo:       document.getElementById('edit-tipo').value,
      cto_ceo:    document.getElementById('edit-cto').value.trim(),
      cidade:     document.getElementById('edit-cidade').value.trim(),
      referencia: document.getElementById('edit-referencia').value.trim(),
      servicos, total,
    };
    await _dbUpdate(`os/${_editFbKey}`, updates);
    await carregarDados();
    fecharModal('modal-edit-os');
    toast('OS atualizada com sucesso!', 'success');
  } catch(e) {
    console.error('[salvarEdicaoOS]', e);
    toast('Erro ao atualizar OS. Tente novamente.', 'error');
  }
}

