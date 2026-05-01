// src/admin/seguranca_page.js
// EPI, documentos, inventário, veículo, alertas
// Extraído de admin.html — Fase D

function _segGetTecnicos(includeMaster) {
  return Object.entries(usersCache)
    .filter(([,u]) => u.ativo !== false && !u.firstLogin && (includeMaster || u.role !== 'master') && !['V0','V4'].includes(u.nivel||'V1'))
    .map(([id,u]) => ({id, nome:u.name||id, nivel:u.nivel||'V1', isMaster: u.role === 'master'}))
    .sort((a,b) => a.nome.localeCompare(b.nome));
}

function _segStatusDoc(validade) {
  if (!validade) return {status:'sem-data',cor:'#94a3b8',icon:'fa-question-circle',texto:'Sem data'};
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const val = new Date(validade+'T00:00:00');
  const diff = Math.ceil((val - hoje) / 86400000);
  if (diff < 0) return {status:'vencido',cor:'#dc2626',icon:'fa-times-circle',texto:`Vencido há ${Math.abs(diff)} dias`};
  if (diff <= 30) return {status:'vencendo',cor:'#d97706',icon:'fa-exclamation-triangle',texto:`Vence em ${diff} dias`};
  return {status:'ok',cor:'#059669',icon:'fa-check-circle',texto:`Válido até ${val.toLocaleDateString('pt-BR')}`};
}

function _segMesAtual() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

async function _obterAlertasVencimentoTodosTecnicos() {
  const tecs = _segGetTecnicos(false); // sem master
  const alertas = [];
  const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  for (const tec of tecs) {
    try {
      const snapDocs = await db.ref(`seguranca/${tec.id}/documentos`).once('value');
      const docs = snapDocs.val() || {};
      const snapDispensas = await db.ref(`seguranca/${tec.id}/dispensas`).once('value');
      const dispensas = snapDispensas.val() || {};
      Object.entries(docs).forEach(([tipo, d]) => {
        if (dispensas[tipo] || !d.validade) return;
        const st = _segStatusDoc(d.validade);
        if (st.status === 'vencido' || st.status === 'vencendo') {
          alertas.push({ tecId: tec.id, tecNome: tec.nome, tipo: SEG_DOC_TIPOS[tipo]?.nome || tipo, icon: SEG_DOC_TIPOS[tipo]?.icon || 'fa-file', texto: st.texto, cor: st.cor, status: st.status });
        }
      });
    } catch (_) {}
    try {
      const snapFicha = await db.ref(`seguranca/${tec.id}/fichaEpi`).once('value');
      const ficha = snapFicha.val() || {};
      Object.entries(ficha).forEach(([itemId, item]) => {
        if (item.validade) {
          const st = _segStatusDoc(item.validade);
          if (st.status === 'vencido' || st.status === 'vencendo') {
            alertas.push({ tecId: tec.id, tecNome: tec.nome, tipo: `EPI — ${item.nomeItem || itemId}`, icon: 'fa-hard-hat', texto: st.texto, cor: st.cor, status: st.status });
          }
        }
      });
    } catch (_) {}
    try {
      const snapV = await db.ref(`seguranca/${tec.id}/veiculo`).once('value');
      const veiculo = snapV.val();
      if (veiculo && veiculo.mesLicenciamento) {
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const proxMes = mesAtual === 12 ? 1 : mesAtual + 1;
        if (veiculo.mesLicenciamento == mesAtual) {
          alertas.push({ tecId: tec.id, tecNome: tec.nome, tipo: `Licenciamento (${veiculo.placa || ''})`, icon: 'fa-car', texto: 'Vence ESTE mês!', cor: '#dc2626', status: 'vencido' });
        } else if (veiculo.mesLicenciamento == proxMes) {
          alertas.push({ tecId: tec.id, tecNome: tec.nome, tipo: `Licenciamento (${veiculo.placa || ''})`, icon: 'fa-car', texto: `Vence em ${MESES_NOME[proxMes - 1] || ''}`, cor: '#d97706', status: 'vencendo' });
        }
        if (veiculo.status === 'com_debitos') {
          alertas.push({ tecId: tec.id, tecNome: tec.nome, tipo: `Débitos Veículo (${veiculo.placa || ''})`, icon: 'fa-exclamation-circle', texto: 'Débitos — Regularize!', cor: '#dc2626', status: 'vencido' });
        }
      }
    } catch (_) {}
  }
  alertas.sort((a, b) => (a.status === 'vencido' ? 0 : 1) - (b.status === 'vencido' ? 0 : 1));
  return alertas;
}

async function _mostrarModalAlertasFiscal() {
  if (_fiscalAlertasMostrados) return;
  _fiscalAlertasMostrados = true;
  const alertas = await _obterAlertasVencimentoTodosTecnicos();
  if (alertas.length === 0) return;
  const vencidos = alertas.filter(a => a.status === 'vencido');
  const vencendo = alertas.filter(a => a.status === 'vencendo');

  // Agrupa por técnico
  const porTec = {};
  alertas.forEach(a => {
    if (!porTec[a.tecId]) porTec[a.tecId] = { nome: a.tecNome, items: [] };
    porTec[a.tecId].items.push(a);
  });

  let listaHtml = '';
  Object.values(porTec).sort((a,b) => b.items.filter(i=>i.status==='vencido').length - a.items.filter(i=>i.status==='vencido').length).forEach(tec => {
    const venc = tec.items.filter(i => i.status === 'vencido').length;
    listaHtml += `<div style="margin-bottom:12px;background:#fff;border-radius:10px;border:1px solid ${venc>0?'#fca5a5':'#fde68a'};overflow:hidden">
      <div style="padding:10px 14px;background:${venc>0?'#fef2f2':'#fffbeb'};display:flex;align-items:center;gap:8px;border-bottom:1px solid ${venc>0?'#fca5a5':'#fde68a'}">
        <i class="fas fa-user" style="color:${venc>0?'#dc2626':'#d97706'}"></i>
        <strong style="font-size:.88rem;color:#1e293b">${tec.nome}</strong>
        <span style="margin-left:auto;font-size:.72rem;font-weight:700;color:${venc>0?'#dc2626':'#d97706'};background:${venc>0?'#fee2e2':'#fef3c7'};padding:2px 8px;border-radius:8px">${tec.items.length} alerta${tec.items.length>1?'s':''}</span>
      </div>
      <div style="padding:8px 14px">`;
    tec.items.forEach(a => {
      listaHtml += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9">
        <i class="fas ${a.icon}" style="color:${a.cor};flex-shrink:0"></i>
        <span style="font-size:.82rem;font-weight:600;color:#334155">${a.tipo}</span>
        <span style="margin-left:auto;font-size:.75rem;font-weight:700;color:${a.cor}">${a.texto}</span>
      </div>`;
    });
    listaHtml += '</div></div>';
  });

  const overlay = document.createElement('div');
  overlay.id = 'modal-alertas-fiscal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center';
  overlay.innerHTML = `
  <div style="width:100%;max-width:680px;margin:20px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.35)">
    <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:24px 28px;color:#fff;position:relative">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <i class="fas fa-exclamation-triangle" style="font-size:1.8rem;color:#fbbf24;animation:pulse 1.5s infinite"></i>
        <div>
          <h2 style="font-size:1.2rem;font-weight:800;margin:0">ALERTA DE VENCIMENTOS</h2>
          <p style="font-size:.82rem;opacity:.85;margin:4px 0 0">Documentos que precisam da sua atenção imediata</p>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:12px">
        ${vencidos.length>0?`<div style="background:rgba(220,38,38,.3);padding:6px 14px;border-radius:8px;font-size:.82rem;font-weight:700">
          <i class="fas fa-times-circle"></i> ${vencidos.length} Vencido${vencidos.length>1?'s':''}
        </div>`:''}
        ${vencendo.length>0?`<div style="background:rgba(217,119,6,.3);padding:6px 14px;border-radius:8px;font-size:.82rem;font-weight:700">
          <i class="fas fa-exclamation-triangle"></i> ${vencendo.length} Vencendo
        </div>`:''}
      </div>
    </div>
    <div style="padding:20px 24px;max-height:60vh;overflow-y:auto">
      ${listaHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:.78rem;color:#94a3b8">Clique em "Ir para Segurança" para gerenciar documentos</span>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('modal-alertas-fiscal').remove();showPage('seguranca')" style="background:#dc2626;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-weight:700;font-size:.88rem;cursor:pointer">
          <i class="fas fa-hard-hat"></i> Ir para Segurança
        </button>
        <button onclick="document.getElementById('modal-alertas-fiscal').remove()" style="background:#e5e7eb;color:#374151;border:none;border-radius:10px;padding:10px 20px;font-weight:700;font-size:.88rem;cursor:pointer">
          Fechar
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function _renderBannerAlertasFiscalDash() {
  const wrap = document.getElementById('fiscal-dash-alertas');
  if (!wrap) return;
  const alertas = await _obterAlertasVencimentoTodosTecnicos();
  if (alertas.length === 0) { wrap.innerHTML = ''; return; }
  const vencidos = alertas.filter(a => a.status === 'vencido');
  const vencendo = alertas.filter(a => a.status === 'vencendo');
  // Agrupa por técnico
  const porTec = {};
  alertas.forEach(a => {
    if (!porTec[a.tecId]) porTec[a.tecId] = { nome: a.tecNome, items: [] };
    porTec[a.tecId].items.push(a);
  });

  let html = `<div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);border:2px solid #dc2626;border-radius:14px;padding:18px;margin-bottom:20px;box-shadow:0 4px 16px rgba(220,38,38,.3)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <i class="fas fa-exclamation-triangle" style="color:#fbbf24;font-size:1.4rem;animation:pulse 1.5s infinite"></i>
      <div style="font-weight:800;color:#fef2f2;font-size:1rem">VENCIMENTOS DE DOCUMENTOS</div>
      <div style="margin-left:auto;display:flex;gap:8px">
        ${vencidos.length>0?`<span style="background:#dc2626;color:#fff;padding:3px 10px;border-radius:10px;font-size:.75rem;font-weight:700">${vencidos.length} Vencido${vencidos.length>1?'s':''}</span>`:''}
        ${vencendo.length>0?`<span style="background:#d97706;color:#fff;padding:3px 10px;border-radius:10px;font-size:.75rem;font-weight:700">${vencendo.length} Vencendo</span>`:''}
      </div>
    </div>`;

  Object.values(porTec).sort((a,b) => b.items.filter(i=>i.status==='vencido').length - a.items.filter(i=>i.status==='vencido').length).forEach(tec => {
    const venc = tec.items.filter(i => i.status === 'vencido').length;
    html += `<div style="background:${venc>0?'rgba(220,38,38,.2)':'rgba(217,119,6,.15)'};border-radius:10px;padding:10px 14px;margin-bottom:6px;cursor:pointer" onclick="showPage('seguranca')">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <i class="fas fa-user" style="color:${venc>0?'#fca5a5':'#fde68a'};font-size:.85rem"></i>
        <strong style="color:#fef2f2;font-size:.85rem">${tec.nome}</strong>
        <span style="margin-left:auto;font-size:.7rem;color:${venc>0?'#fca5a5':'#fde68a'};font-weight:700">${tec.items.length} alerta${tec.items.length>1?'s':''}</span>
        <i class="fas fa-chevron-right" style="color:#fca5a5;font-size:.65rem"></i>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">`;
    tec.items.forEach(a => {
      html += `<span style="font-size:.7rem;padding:2px 8px;border-radius:6px;background:${a.status==='vencido'?'rgba(239,68,68,.3)':'rgba(245,158,11,.25)'};color:${a.status==='vencido'?'#fca5a5':'#fde68a'};font-weight:600">
        <i class="fas ${a.icon}" style="font-size:.6rem"></i> ${a.tipo}: ${a.texto}
      </span>`;
    });
    html += '</div></div>';
  });

  html += '</div>';
  wrap.innerHTML = html;
}

async function renderSegurancaPage() {
  const lista = document.getElementById('seg-lista');
  const filtro = document.getElementById('seg-filtro-tec');
  const resumo = document.getElementById('seg-resumo');
  if (!lista) return;

  const tecs = _segGetTecnicos(false); // JA (master) não tem documentos — excluído da página de Segurança
  // Popula filtro (sempre recria para refletir lista atual sem JA)
  if (filtro) {
    const valorAtual = filtro.value;
    while (filtro.options.length > 1) filtro.remove(1);
    tecs.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.nome; filtro.appendChild(o); });
    if (valorAtual && tecs.find(t=>t.id===valorAtual)) filtro.value = valorAtual;
  }

  // Check-in: marca documentos vencidos de todos os técnicos
  for (const t of tecs) { await _checkinDocumentosVencidos(t.id); }

  const filtroUid = filtro?.value || '';
  const tecsVisiveis = filtroUid ? tecs.filter(t=>t.id===filtroUid) : tecs;

  let totalOk=0, totalVencendo=0, totalVencido=0, totalPendDocs=0;
  let html = '';

  // Add global button for managing EPI template (gestão/admin only)
  if (_isAdmin(currentUser) || currentUser.nivel === 'V0') {
    html += `<div style="margin-bottom:16px">
      <button class="btn btn-warning" onclick="segAbrirTemplateEpi()" style="background:#f59e0b;color:#fff"><i class="fas fa-cog"></i> Gerenciar Itens EPI (PGR)</button>
    </div>`;
  }

  for (const tec of tecsVisiveis) {
    // Load docs
    let docs = {};
    try { const s = await db.ref(`seguranca/${tec.id}/documentos`).once('value'); docs = s.val() || {}; } catch(_){}
    // Load inventario do mês
    let inv = null;
    try { const s = await db.ref(`seguranca/${tec.id}/inventarios/${_segMesAtual()}`).once('value'); inv = s.val(); } catch(_){}
    // Load pending docs (uploaded by tech, awaiting fiscal validation)
    let pendentes = {};
    try { const s = await db.ref(`seguranca/${tec.id}/pendentes`).once('value'); pendentes = s.val() || {}; } catch(_){}
    // Load bloqueio
    let bloqueio = null;
    try { const s = await db.ref(`seguranca/${tec.id}/bloqueio`).once('value'); bloqueio = s.val(); } catch(_){}
    // Load dispensas (Master only)
    let dispensas = {};
    try { const s = await db.ref(`seguranca/${tec.id}/dispensas`).once('value'); dispensas = s.val() || {}; } catch(_){}
    // Load EPI template and ficha
    let fichaEpi = {};
    let epiTemplate = {};
    try { const s = await db.ref(`seguranca/${tec.id}/fichaEpi`).once('value'); fichaEpi = s.val() || {}; } catch(_){}
    try { const s = await db.ref('seguranca/fichaEpiTemplate').once('value'); epiTemplate = s.val() || {}; } catch(_){}
    // Load vehicle data
    let veiculo = null;
    try { const s = await db.ref(`seguranca/${tec.id}/veiculo`).once('value'); veiculo = s.val(); } catch(_){}

    // Status geral
    let tecOk=0, tecVencendo=0, tecVencido=0;
    Object.keys(SEG_DOC_TIPOS).forEach(tipo => {
      const d = docs[tipo];
      if (!d || !d.validade) return;
      const st = _segStatusDoc(d.validade);
      if (st.status==='ok') tecOk++;
      else if (st.status==='vencendo') tecVencendo++;
      else if (st.status==='vencido') tecVencido++;
    });
    totalOk += tecOk; totalVencendo += tecVencendo; totalVencido += tecVencido;
    const numPendentes = Object.keys(pendentes).length;
    totalPendDocs += numPendentes;

    const corBorda = tecVencido > 0 ? '#dc2626' : tecVencendo > 0 ? '#d97706' : '#059669';
    const invStatus = inv ? `<span style="color:#059669"><i class="fas fa-check"></i> Feito em ${new Date(inv.data).toLocaleDateString('pt-BR')}</span>` : `<span style="color:#d97706"><i class="fas fa-clock"></i> Pendente</span>`;

    // Pendências de inventário
    let pendInvHtml = '';
    if (inv && inv.pendencias && Object.keys(inv.pendencias).length > 0) {
      const pends = Object.entries(inv.pendencias).filter(([,p]) => !p.resolvido);
      if (pends.length > 0) {
        pendInvHtml = `<div style="margin-top:8px;padding:8px 10px;background:#fee2e2;border-radius:8px;font-size:.78rem;color:#991b1b">
          <strong><i class="fas fa-exclamation-circle"></i> ${pends.length} pendência(s) de inventário:</strong>
          ${pends.map(([item,p]) => `<div style="margin-top:3px">• ${item}: ${p.obs||'sem observação'}</div>`).join('')}
        </div>`;
      }
    }

    // EPI status
    const templateItems = epiTemplate.itens ? Object.keys(epiTemplate.itens) : [];
    let epiPreenchidos = 0, epiPendentes = 0;
    if (templateItems.length > 0) {
      templateItems.forEach(itemId => {
        const epiData = fichaEpi[itemId];
        if (!epiData) epiPendentes++;
        else if (epiData.status === 'pendente') epiPendentes++;
        else if (epiData.status === 'validado') epiPreenchidos++;
      });
    }
    const epiStatusText = templateItems.length > 0
      ? `${epiPreenchidos}/${templateItems.length} itens ${epiPendentes > 0 ? `(${epiPendentes} pendente${epiPendentes===1?'':'s'})` : ''}`
      : 'Nenhum item configurado';

    html += `<div style="border-left:4px solid ${corBorda};background:#fff;border-radius:12px;padding:18px 20px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <span style="font-weight:800;font-size:1rem">${tec.nome}</span>
          ${bloqueio ? `<span style="font-size:.72rem;background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:700"><i class="fas fa-lock"></i> BLOQUEADO</span>` : ''}
          ${numPendentes > 0 ? `<span style="font-size:.72rem;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:700"><i class="fas fa-clock"></i> ${numPendentes} doc(s) pendente(s)</span>` : ''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" style="background:#dbeafe;color:#1d4ed8" onclick="segAbrirUploadDoc('${tec.id}')"><i class="fas fa-upload"></i> Doc</button>
          ${!tec.isMaster ? `<button class="btn btn-sm" style="background:#d1fae5;color:#065f46" onclick="segAbrirInventario('${tec.id}')"><i class="fas fa-clipboard-check"></i> Inventário</button>` : ''}
          <button class="btn btn-sm" style="background:#fce7f3;color:#be185d" onclick="segAbrirFichaEpi('${tec.id}')"><i class="fas fa-shield-alt"></i> Ficha EPI</button>
          <button class="btn btn-sm" style="background:#e0f2fe;color:#0369a1" onclick="segAbrirDadosVeiculo('${tec.id}')"><i class="fas fa-car"></i> Veículo</button>
          ${bloqueio ? `<button class="btn btn-sm" style="background:#fee2e2;color:#dc2626" onclick="segLiberarBloqueio('${tec.id}')"><i class="fas fa-unlock"></i> Liberar</button>` : ''}
          ${_isAdmin(currentUser) ? `<button class="btn btn-sm" style="background:#7f1d1d;color:#fff" onclick="segApagarTodosDocs('${tec.id}')"><i class="fas fa-trash-alt"></i> Apagar Docs</button>` : ''}
        </div>
      </div>
      <!-- Documentos -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:10px">
        ${Object.entries(SEG_DOC_TIPOS).map(([tipo,info]) => {
          const d = docs[tipo];
          const disp = dispensas[tipo];
          const st = d?.validade ? _segStatusDoc(d.validade) : {cor:'#94a3b8',icon:'fa-question-circle',texto:'Não enviado'};
          const pend = pendentes[tipo];
          const textoDisp = disp ? `DISPENSADO` : '';
          const styleDispensado = disp ? 'text-decoration:line-through;opacity:0.6;' : '';
          const docVencido = d && st.status === 'vencido' && !disp;
          return `<div style="padding:10px 12px;background:${docVencido?'#fef2f2':disp?'#f5f5f5':'#f8fafc'};border-radius:8px;border:${docVencido?'2px solid #dc2626':d?'1px solid #e2e8f0':'1px solid #fcd34d'};font-size:.78rem;${styleDispensado}${docVencido?'animation:pulse 2s infinite;':''}">
            <div style="font-weight:700;margin-bottom:4px"><i class="fas ${info.icon}" style="color:${st.cor};margin-right:4px"></i>${info.nome}</div>
            <div style="color:${st.cor}"><i class="fas ${st.icon}"></i> ${st.texto}</div>
            ${docVencido && !pend ? `<div style="margin-top:4px;background:#dc2626;color:#fff;padding:4px 8px;border-radius:4px;font-size:.7rem;font-weight:700">
              <i class="fas fa-exclamation-triangle"></i> VENCIDO
            </div>
            <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">
              <button class="btn btn-xs" style="background:#dbeafe;color:#1d4ed8;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segVerDocAprovado('${tec.id}','${tipo}')"><i class="fas fa-eye"></i> Ver</button>
              <button class="btn btn-xs" style="background:#fee2e2;color:#dc2626;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segRevogarDocumento('${tec.id}','${tipo}')"><i class="fas fa-ban"></i> Revogar</button>
              <button class="btn btn-xs" style="background:#25d366;color:#fff;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();_whatsAlertaVencido('${tec.id}',[{nome:'${(info.nome||tipo).replace(/'/g,"\\'")}',texto:'${st.texto.replace(/'/g,"\\'")}'}])"><i class="fab fa-whatsapp"></i> Notificar</button>
            </div>` : ''}
            ${d && !docVencido && !pend && !disp ? `<div style="display:flex;gap:4px;margin-top:4px">
              <button class="btn btn-xs" style="background:#dbeafe;color:#1d4ed8;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segVerDocAprovado('${tec.id}','${tipo}')"><i class="fas fa-eye"></i> Ver</button>
              <button class="btn btn-xs" style="background:#fee2e2;color:#dc2626;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segRevogarDocumento('${tec.id}','${tipo}')"><i class="fas fa-ban"></i> Revogar</button>
            </div>` : ''}
            ${pend ? `<div style="margin-top:3px">
              ${pend.status === 'rejeitado' ? `
                <div style="color:#dc2626;font-size:.72rem"><i class="fas fa-times-circle"></i> Rejeitado: ${pend.motivoRejeicao || 'Sem motivo'}</div>
                <div style="font-size:.68rem;color:#94a3b8">${pend.rejeitadoNome ? 'por ' + pend.rejeitadoNome : ''} ${pend.dataRejeicao ? '— ' + new Date(pend.dataRejeicao).toLocaleDateString('pt-BR') : ''}</div>
                <div style="display:flex;gap:4px;margin-top:4px">
                  ${pend.arquivo ? `<button class="btn btn-xs" style="background:#dbeafe;color:#1d4ed8;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segVerDocPendente('${tec.id}','${tipo}')"><i class="fas fa-eye"></i> Ver</button>` : ''}
                  <button class="btn btn-xs" style="background:#25d366;color:#fff;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();_whatsAlertaVencido('${tec.id}',[{nome:'${(info.nome||tipo).replace(/'/g,"\\'")}',texto:'Rejeitado'}])"><i class="fab fa-whatsapp"></i> Notificar</button>
                  <button class="btn btn-xs" style="background:#e2e8f0;color:#64748b;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();db.ref('seguranca/${tec.id}/pendentes/${tipo}').remove().then(()=>{toast('Removido.','success');renderSegurancaPage();})"><i class="fas fa-trash"></i> Limpar</button>
                </div>
              ` : `
                ${pend.ocrResultado && (pend.ocrResultado.alertaSevero || pend.ocrResultado.validacao === 'divergente') ? `
                  <div style="background:#dc2626;color:#fff;padding:3px 6px;border-radius:4px;font-size:.68rem;font-weight:700;margin-bottom:3px;animation:pulse 2s infinite">
                    <i class="fas fa-exclamation-triangle"></i> OCR: DATA DIVERGENTE${pend.ocrResultado.datas ? ' — Encontradas: '+pend.ocrResultado.datas.map(d=>d.split('-').reverse().join('/')).join(', ') : ''}
                  </div>` : ''}
                <div style="color:#d97706"><i class="fas fa-hourglass-half"></i> Aguardando validação</div>
              `}
              <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">
                <button class="btn btn-xs" style="background:#dbeafe;color:#1d4ed8;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segVerDocPendente('${tec.id}','${tipo}')"><i class="fas fa-eye"></i> Ver</button>
                <button class="btn btn-xs" style="background:#d1fae5;color:#065f46;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segAprovarDocPendente('${tec.id}','${tipo}')"><i class="fas fa-check"></i> Validar</button>
                <button class="btn btn-xs" style="background:#fee2e2;color:#dc2626;font-size:.68rem;padding:2px 6px" onclick="event.stopPropagation();segRejeitarDocumento('${tec.id}','${tipo}')"><i class="fas fa-times"></i> Rejeitar</button>
              </div>
            </div>` : ''}
            ${disp ? `<div style="color:#dc2626;margin-top:3px;font-weight:700"><i class="fas fa-ban"></i> ${textoDisp}</div>` : ''}
            ${_isAdmin(currentUser) && !disp ? `<div style="margin-top:6px"><button class="btn btn-xs" style="background:#fee2e2;color:#dc2626;font-size:.7rem;padding:2px 6px" onclick="segDispensarItem('${tec.id}','${tipo}','documento')"><i class="fas fa-times"></i> Dispensar</button></div>` : ''}
            ${_isAdmin(currentUser) && disp ? `<div style="margin-top:6px"><button class="btn btn-xs" style="background:#e5e7eb;color:#374151;font-size:.7rem;padding:2px 6px" onclick="segReverterDispensa('${tec.id}','${tipo}')"><i class="fas fa-undo"></i> Reverter</button></div>` : ''}
          </div>`;
        }).join('')}
      </div>
      ${!tec.isMaster ? `
      <!-- Inventário do mês -->
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:6px">
        <i class="fas fa-clipboard-list" style="margin-right:4px"></i>Inventário ${_segMesAtual().split('-').reverse().join('/')}: ${invStatus}
      </div>
      ${pendInvHtml}` : ''}
      <!-- EPI Status -->
      <div style="font-size:.8rem;color:var(--muted);margin-bottom:6px">
        <i class="fas fa-shield-alt" style="margin-right:4px"></i>Ficha de EPI: <span style="font-weight:600;color:#666">${epiStatusText}</span>
      </div>
      <!-- Veículo / Licenciamento -->
      ${veiculo ? `
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:6px;padding:8px;background:#f0f9ff;border-radius:6px;border-left:3px solid #0369a1">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div><i class="fas fa-car" style="margin-right:4px;color:#0369a1"></i><strong>Licenciamento:</strong> ${veiculo.placa} — ${veiculo.mesLicenciamento ? MESES_NOME[veiculo.mesLicenciamento - 1] + '/' + (veiculo.anoLicenciamentoAtual || new Date().getFullYear()) : '?'}</div>
            <span style="background:${veiculo.status === 'aprovado' ? '#d1fae5' : veiculo.status === 'com_debitos' ? '#fee2e2' : '#fef3c7'};color:${veiculo.status === 'aprovado' ? '#065f46' : veiculo.status === 'com_debitos' ? '#dc2626' : '#92400e'};padding:2px 8px;border-radius:4px;font-weight:600;font-size:.7rem">${veiculo.status === 'aprovado' ? 'Aprovado' : veiculo.status === 'com_debitos' ? 'Com Débitos' : 'Pendente'}</span>
          </div>
          ${veiculo.proximaConsulta && new Date(veiculo.proximaConsulta) <= new Date() ? `
            <div style="background:#fee2e2;color:#dc2626;padding:4px 8px;border-radius:4px;font-size:.72rem;font-weight:600;margin-top:4px;animation:pulse 2s infinite">
              <i class="fas fa-exclamation-triangle"></i> Reconsulta necessária — prazo de 15 dias vencido!
            </div>` : ''}
          ${veiculo.ultimaConsulta ? `<div style="font-size:.68rem;color:#64748b;margin-top:3px">Última consulta: ${new Date(veiculo.ultimaConsulta).toLocaleDateString('pt-BR')}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn btn-xs" style="background:#e0f2fe;color:#0369a1;font-size:.7rem;padding:2px 6px" onclick="consultarDebitosVeiculo('${tec.id}')"><i class="fas fa-search"></i> Consultar</button>
            <button class="btn btn-xs" style="background:#dbeafe;color:#0c4a6e;font-size:.7rem;padding:2px 6px" onclick="segAbrirHistoricoConsultas('${tec.id}')"><i class="fas fa-history"></i> Histórico</button>
          </div>
        </div>
      ` : `
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:6px">
          <i class="fas fa-car" style="margin-right:4px;color:#94a3b8"></i>Veículo: <span style="color:#d97706"><i class="fas fa-clock"></i> Não cadastrado</span>
        </div>
      `}
    </div>`;
  }

  if (resumo) resumo.innerHTML = `<span style="color:#059669"><i class="fas fa-check-circle"></i> ${totalOk}</span> · <span style="color:#d97706"><i class="fas fa-exclamation-triangle"></i> ${totalVencendo}</span> · <span style="color:#dc2626"><i class="fas fa-times-circle"></i> ${totalVencido}</span>${totalPendDocs?` · <span style="color:#92400e"><i class="fas fa-clock"></i> ${totalPendDocs} pendente(s)</span>`:''}`;
  lista.innerHTML = html || '<p style="text-align:center;color:var(--muted);padding:30px">Nenhum técnico encontrado.</p>';
}

function segAbrirUploadDoc(uid) {
  document.getElementById('modal-seg-doc').style.display = 'block';
  const sel = document.getElementById('seg-doc-uid');
  sel.innerHTML = '';
  _segGetTecnicos().forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.nome; sel.appendChild(o); });
  if (uid) sel.value = uid;
  document.getElementById('seg-doc-tipo').value = '';
  document.getElementById('seg-doc-file').value = '';
  document.getElementById('seg-doc-validade').value = '';
  document.getElementById('seg-doc-preview').style.display = 'none';
  document.getElementById('seg-doc-analise').style.display = 'none';
  document.getElementById('seg-btn-validar').style.display = 'none';
  document.getElementById('seg-btn-analisar').style.display = '';
}

async function segDocAnalisar() {
  const uid = document.getElementById('seg-doc-uid').value;
  const tipo = document.getElementById('seg-doc-tipo').value;
  const file = document.getElementById('seg-doc-file').files[0];
  const validade = document.getElementById('seg-doc-validade').value;

  if (!uid) { toast('Selecione o técnico.','error'); return; }
  if (!tipo) { toast('Selecione o tipo de documento.','error'); return; }
  if (!file) { toast('Selecione um arquivo.','error'); return; }
  if (!validade) { toast('Informe a data de validade.','error'); return; }

  const btn = document.getElementById('seg-btn-analisar');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';

  // Etapa 1: Análise automática (máquina)
  const analiseDiv = document.getElementById('seg-doc-analise');
  const resultDiv = document.getElementById('seg-doc-analise-result');
  analiseDiv.style.display = 'block';

  let erros = [];
  let avisos = [];

  // Verifica validade
  const stVal = _segStatusDoc(validade);
  if (stVal.status === 'vencido') erros.push(`Documento VENCIDO (${stVal.texto}). Não é possível aceitar documento vencido.`);
  else if (stVal.status === 'vencendo') avisos.push(`Documento vence em breve (${stVal.texto}).`);

  // Verifica tamanho do arquivo (máx 5MB para Base64)
  if (file.size > 5 * 1024 * 1024) erros.push('Arquivo excede 5MB. Reduza o tamanho.');

  // Verifica tipo do arquivo
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','jpg','jpeg','png'].includes(ext)) erros.push('Formato não aceito. Use PDF, JPG ou PNG.');

  // Verifica se técnico existe
  const tecInfo = usersCache[uid];
  if (!tecInfo) erros.push('Prestador não encontrado no sistema.');

  if (erros.length > 0) {
    resultDiv.innerHTML = `<div style="color:#dc2626;font-weight:700;margin-bottom:6px"><i class="fas fa-times-circle"></i> REPROVADO pela análise automática:</div>${erros.map(e=>`<div style="margin-top:3px">• ${e}</div>`).join('')}`;
    analiseDiv.style.borderColor = '#dc2626'; analiseDiv.style.background = '#fee2e2';
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Analisar Documento';
    return;
  }

  // Análise OK
  const tipoInfo = SEG_DOC_TIPOS[tipo];
  resultDiv.innerHTML = `<div style="color:#059669;font-weight:700;margin-bottom:6px"><i class="fas fa-check-circle"></i> APROVADO pela análise automática</div>
    <div style="margin-top:6px;font-size:.82rem">
      <div><strong>Prestador:</strong> ${tecInfo.name||uid}</div>
      <div><strong>Documento:</strong> ${tipoInfo.nome} — ${tipoInfo.descricao}</div>
      <div><strong>Validade:</strong> ${new Date(validade+'T00:00:00').toLocaleDateString('pt-BR')} (${stVal.texto})</div>
      <div><strong>Arquivo:</strong> ${file.name} (${(file.size/1024).toFixed(0)} KB)</div>
    </div>
    ${avisos.length?`<div style="color:#d97706;margin-top:8px">${avisos.map(a=>`<div><i class="fas fa-exclamation-triangle"></i> ${a}</div>`).join('')}</div>`:''}
    <div style="margin-top:10px;padding:10px;background:#fff;border-radius:8px;border:1px dashed #d97706">
      <strong style="color:#92400e"><i class="fas fa-user-check"></i> ETAPA 2 — Validação da Gestão:</strong>
      <div style="font-size:.8rem;color:#64748b;margin-top:4px">Confira se os dados acima estão corretos e clique em "Validar e Salvar" para aprovar, ou "Cancelar" para recusar.</div>
    </div>`;
  analiseDiv.style.borderColor = '#059669'; analiseDiv.style.background = '#d1fae5';
  document.getElementById('seg-btn-validar').style.display = '';
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-search"></i> Analisar Documento';
}

async function segDocValidar() {
  const uid = document.getElementById('seg-doc-uid').value;
  const tipo = document.getElementById('seg-doc-tipo').value;
  const file = document.getElementById('seg-doc-file').files[0];
  const validade = document.getElementById('seg-doc-validade').value;
  if (!uid || !tipo || !file || !validade) return;

  // ── Re-validação obrigatória de validade (previne manipulação do form) ──
  const stVal = _segStatusDoc(validade);
  if (stVal.status === 'vencido') {
    toast(`DOCUMENTO VENCIDO (${stVal.texto})! Não é possível salvar documento vencido.`, 'error');
    return;
  }
  if (stVal.status === 'vencendo') {
    if (!confirm(`ATENÇÃO: Documento vence em breve (${stVal.texto}).\nDeseja salvar mesmo assim?`)) return;
  }

  const btn = document.getElementById('seg-btn-validar');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    // Convert file to base64
    const base64 = await new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    await db.ref(`seguranca/${uid}/documentos/${tipo}`).set({
      arquivo: base64,
      nomeArquivo: file.name,
      validade: validade,
      validadoPor: currentUser.id,
      validadoNome: currentUser.name,
      dataValidacao: new Date().toISOString(),
      status: 'validado'
    });

    // Remove da fila de pendentes se existir
    await db.ref(`seguranca/${uid}/pendentes/${tipo}`).remove();

    document.getElementById('modal-seg-doc').style.display = 'none';
    toast('Documento validado e salvo com sucesso!','success');

    // If CRLV, open vehicle data form
    if (tipo === 'crlv') {
      setTimeout(() => segAbrirDadosVeiculo(uid), 500);
    }

    renderSegurancaPage();
  } catch(e) {
    console.error('[segDocValidar]', e);
    toast('Erro ao salvar documento.','error');
  }
  btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Validar e Salvar';
}

async function segAprovarDocPendente(uid, tipo) {
  try {
    const snap = await db.ref(`seguranca/${uid}/pendentes/${tipo}`).once('value');
    const pend = snap.val();
    if (!pend || !pend.arquivo) { toast('Documento pendente não encontrado.', 'error'); return; }
    const tecNome = usersCache[uid]?.name || uid;
    const tipoNome = SEG_DOC_TIPOS[tipo]?.nome || tipo;

    // ── Validação obrigatória de validade ──
    if (!pend.validade) {
      toast('Documento sem data de validade. Rejeite e peça reenvio com data.', 'error');
      return;
    }
    const stVal = _segStatusDoc(pend.validade);
    if (stVal.status === 'vencido') {
      toast(`DOCUMENTO VENCIDO (${stVal.texto})! Não é possível aprovar. Rejeite e solicite documento válido.`, 'error');
      return;
    }

    // ── OCR: analisa imagem antes de aprovar ──
    let ocrAlerta = '';
    if (pend.arquivo && !pend.arquivo.startsWith('data:application/pdf')) {
      toast('Analisando documento via OCR...', 'info');
      const ocr = await _ocrExtrairDatasDocumento(pend.arquivo);
      if (ocr.datas.length > 0) {
        const validacao = _ocrValidarValidade(pend.validade, ocr.datas);
        if (!validacao.ok) ocrAlerta = '\n\n⚠️ ALERTA OCR: ' + validacao.msg;
      }
    }
    if (!ocrAlerta && pend.ocrResultado && (pend.ocrResultado.validacao === 'divergente' || pend.ocrResultado.validacao === 'divergente-forcado')) {
      ocrAlerta = '\n\n⚠️ ALERTA: OCR detectou divergencia quando o prestador enviou!';
    }

    let msgConfirm = stVal.status === 'vencendo'
      ? `ATENCAO: "${tipoNome}" de ${tecNome} vence em breve (${stVal.texto}).`
      : `Aprovar "${tipoNome}" de ${tecNome}?\nValidade: ${pend.validade.split('-').reverse().join('/')}`;
    msgConfirm += ocrAlerta;
    if (ocrAlerta) msgConfirm += '\n\nTem certeza que deseja aprovar?';
    if (!confirm(msgConfirm)) return;

    await db.ref(`seguranca/${uid}/documentos/${tipo}`).set({
      arquivo: pend.arquivo,
      nomeArquivo: pend.nomeArquivo || '',
      validade: pend.validade,
      validadoPor: currentUser.id,
      validadoNome: currentUser.name,
      dataValidacao: new Date().toISOString(),
      status: 'validado'
    });
    await db.ref(`seguranca/${uid}/pendentes/${tipo}`).remove();
    toast(`Documento ${tipoNome} de ${tecNome} aprovado!`, 'success');
    renderSegurancaPage();
  } catch(e) {
    console.error('[segAprovarDocPendente]', e);
    toast('Erro ao aprovar documento.', 'error');
  }
}

async function segVerDocPendente(uid, tipo) {
  try {
    const snap = await db.ref(`seguranca/${uid}/pendentes/${tipo}`).once('value');
    const pend = snap.val();
    if (!pend || !pend.arquivo) {
      toast('Documento não encontrado ou sem arquivo anexado.', 'error');
      return;
    }
    const tipoInfo = SEG_DOC_TIPOS[tipo];
    const tecNome = usersCache[uid]?.name || uid;
    const isPdf = pend.arquivo.startsWith('data:application/pdf');

    // Modal de visualização
    const modal = document.createElement('div');
    modal.id = 'modal-ver-doc-pendente';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    const maxW = isPdf ? '90vw' : '600px';
    const maxH = isPdf ? '90vh' : '85vh';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;max-width:${maxW};max-height:${maxH};width:100%;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:.95rem">${tipoInfo?.nome || tipo}</div>
            <div style="font-size:.78rem;color:#64748b">Enviado por: ${pend.enviadoNome || tecNome} ${pend.dataEnvio ? '— ' + new Date(pend.dataEnvio).toLocaleDateString('pt-BR') : ''}</div>
            ${pend.validade ? `<div style="font-size:.78rem;color:#64748b">Validade: ${pend.validade.split('-').reverse().join('/')}</div>` : ''}
            ${pend.nomeArquivo ? `<div style="font-size:.72rem;color:#94a3b8">${pend.nomeArquivo}</div>` : ''}
          </div>
          <button onclick="this.closest('#modal-ver-doc-pendente').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;padding:4px 8px">&times;</button>
        </div>
        <div style="flex:1;overflow:auto;padding:10px;display:flex;align-items:center;justify-content:center;background:#f1f5f9">
          ${isPdf
            ? `<iframe src="${pend.arquivo}" style="width:100%;height:75vh;border:none;border-radius:6px"></iframe>`
            : `<img src="${pend.arquivo}" style="max-width:100%;max-height:75vh;object-fit:contain;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.15)">`
          }
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch(e) {
    console.error('[segVerDocPendente]', e);
    toast('Erro ao carregar documento.', 'error');
  }
}

async function segVerDocAprovado(uid, tipo) {
  try {
    const snap = await db.ref(`seguranca/${uid}/documentos/${tipo}`).once('value');
    const doc = snap.val();
    if (!doc || !doc.arquivo) { toast('Documento sem arquivo anexado.', 'error'); return; }
    const tipoInfo = SEG_DOC_TIPOS[tipo];
    const tecNome = usersCache[uid]?.name || uid;
    const isPdf = doc.arquivo.startsWith('data:application/pdf');
    const modal = document.createElement('div');
    modal.id = 'modal-ver-doc-aprovado';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    const st = doc.validade ? _segStatusDoc(doc.validade) : null;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;max-width:${isPdf?'90vw':'600px'};max-height:${isPdf?'90vh':'85vh'};width:100%;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:.95rem">${tipoInfo?.nome || tipo}</div>
            <div style="font-size:.78rem;color:#64748b">${tecNome}</div>
            ${doc.validade ? `<div style="font-size:.78rem;color:${st?.cor||'#64748b'}"><i class="fas ${st?.icon||'fa-calendar'}"></i> Validade: ${doc.validade.split('-').reverse().join('/')} ${st?.texto ? '('+st.texto+')' : ''}</div>` : ''}
            ${doc.validadoNome ? `<div style="font-size:.72rem;color:#94a3b8">Validado por: ${doc.validadoNome} ${doc.dataValidacao ? '- ' + new Date(doc.dataValidacao).toLocaleDateString('pt-BR') : ''}</div>` : ''}
          </div>
          <button onclick="this.closest('#modal-ver-doc-aprovado').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#64748b;padding:4px 8px">&times;</button>
        </div>
        <div style="flex:1;overflow:auto;padding:10px;display:flex;align-items:center;justify-content:center;background:#f1f5f9">
          ${isPdf
            ? '<iframe src="'+doc.arquivo+'" style="width:100%;height:75vh;border:none;border-radius:6px"></iframe>'
            : '<img src="'+doc.arquivo+'" style="max-width:100%;max-height:75vh;object-fit:contain;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.15)">'
          }
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch(e) {
    console.error('[segVerDocAprovado]', e);
    toast('Erro ao carregar documento.', 'error');
  }
}

async function segApagarTodosDocs(uid) {
  if (!_isAdmin(currentUser)) { toast('Apenas o master pode apagar todos os documentos.', 'error'); return; }
  const tecNome = usersCache[uid]?.name || uid;
  if (!confirm(`Apagar TUDO de seguranca de ${tecNome}?\n\nSerão removidos:\n• Documentos (CNH, ASO, laudos, seguros, CRLV)\n• Pendentes e dispensas\n• Bloqueios\n• Veiculo e consultas\n• Inventarios\n• Ficha de EPI\n\nTODOS os avisos e pendencias serao limpos.\nEsta acao NAO pode ser desfeita!`)) return;

  try {
    toast('Apagando tudo de seguranca...', 'info');
    await db.ref(`seguranca/${uid}`).remove();
    toast(`Tudo de seguranca de ${tecNome} foi apagado. Nenhum aviso ou pendencia restante.`, 'success');
    renderSegurancaPage();
  } catch(e) {
    console.error('[segApagarTodosDocs]', e);
    toast('Erro ao apagar dados.', 'error');
  }
}

async function segRevogarDocumento(uid, tipo) {
  const tipoInfo = SEG_DOC_TIPOS[tipo];
  const tecNome = usersCache[uid]?.name || uid;
  const motivo = prompt(`Motivo da revogacao de "${tipoInfo?.nome || tipo}" de ${tecNome}:\n(O prestador sera bloqueado ate reenviar o documento)`);
  if (motivo === null) return;
  try {
    // Remove documento aprovado (sem criar pendente rejeitado)
    await db.ref(`seguranca/${uid}/documentos/${tipo}`).remove();
    toast(`Documento ${tipoInfo?.nome || tipo} de ${tecNome} revogado! Prestador bloqueado ate reenvio.`, 'success');
    // Notifica via WhatsApp
    const tel = _getTelefone(uid);
    const msg = `*Documento Revogado*\n\nPrestador: ${tecNome}\nDocumento: ${tipoInfo?.nome || tipo}\nMotivo: ${motivo || 'Documento revogado'}\n\nEnvie o documento atualizado no app.\n👉 https://solucaoderua.web.app`;
    if (confirm(`Notificar ${tecNome} via WhatsApp?`)) {
      window.open(tel ? _whatsUrl(tel, msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
    renderSegurancaPage();
  } catch(e) {
    console.error('[segRevogarDocumento]', e);
    toast('Erro ao revogar documento.', 'error');
  }
}

async function segRejeitarDocumento(uid, tipo) {
  const tipoInfo = SEG_DOC_TIPOS[tipo];
  const tecNome = usersCache[uid]?.name || uid;
  const motivo = prompt(`Motivo da rejeição do documento ${tipoInfo?.nome || tipo} de ${tecNome}:`);
  if (motivo === null) return;

  try {
    // Remove pendente (documento rejeitado é excluído)
    await db.ref(`seguranca/${uid}/pendentes/${tipo}`).remove();
    toast(`Documento ${tipoInfo?.nome || tipo} de ${tecNome} rejeitado e excluído.`, 'success');
    // Notifica via WhatsApp
    const tel = _getTelefone(uid);
    const msg = `*Documento Rejeitado*\n\nPrestador: ${tecNome}\nDocumento: ${tipoInfo?.nome || tipo}\nMotivo: ${motivo || 'Sem motivo'}\n\nEnvie o documento correto no app.\n👉 https://solucaoderua.web.app`;
    if (confirm(`Notificar ${tecNome} via WhatsApp?`)) {
      window.open(tel ? _whatsUrl(tel, msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
    renderSegurancaPage();
  } catch(e) {
    console.error('[segRejeitarDocumento]', e);
    toast('Erro ao rejeitar documento.', 'error');
  }
}

async function segAbrirInventario(uid, mesOverride) {
  const tec = usersCache[uid];
  if (!tec) return;
  const mes = mesOverride || _segMesAtual();
  document.getElementById('seg-inv-titulo').innerHTML = `<i class="fas fa-clipboard-check" style="margin-right:8px"></i>Inventário ${mes.split('-').reverse().join('/')} — ${tec.name||uid}`;

  // Load existing
  let inv = null;
  try { const s = await db.ref(`seguranca/${uid}/inventarios/${mes}`).once('value'); inv = s.val(); } catch(_){}

  const corpo = document.getElementById('seg-inv-corpo');
  let html = '';

  // Veículo
  html += '<div style="font-weight:800;font-size:.9rem;color:#1e293b;margin-bottom:10px"><i class="fas fa-car" style="margin-right:6px;color:#2563eb"></i>Veículo</div>';
  SEG_VEICULO_ITENS.forEach(item => {
    const val = inv?.veiculo?.[item];
    const ok = val?.ok !== false;
    const obs = val?.obs || '';
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:.84rem">
      <label style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer">
        <input type="checkbox" class="seg-inv-chk" data-cat="veiculo" data-item="${item}" ${ok?'checked':''} style="width:18px;height:18px;accent-color:#059669">
        <span>${item}</span>
      </label>
      <input type="text" class="seg-inv-obs" data-cat="veiculo" data-item="${item}" value="${obs}" placeholder="Obs..." style="flex:.6;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem">
    </div>`;
  });

  // Ferramental
  html += '<div style="font-weight:800;font-size:.9rem;color:#1e293b;margin:16px 0 10px"><i class="fas fa-tools" style="margin-right:6px;color:#d97706"></i>Ferramental</div>';
  SEG_FERRAMENTAL_ITENS.forEach(item => {
    const val = inv?.ferramental?.[item];
    const ok = val?.ok !== false;
    const obs = val?.obs || '';
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:.84rem">
      <label style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer">
        <input type="checkbox" class="seg-inv-chk" data-cat="ferramental" data-item="${item}" ${ok?'checked':''} style="width:18px;height:18px;accent-color:#059669">
        <span>${item}</span>
      </label>
      <input type="text" class="seg-inv-obs" data-cat="ferramental" data-item="${item}" value="${obs}" placeholder="Obs..." style="flex:.6;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem">
    </div>`;
  });

  // EPI/EPC
  html += '<div style="font-weight:800;font-size:.9rem;color:#1e293b;margin:16px 0 10px"><i class="fas fa-hard-hat" style="margin-right:6px;color:#dc2626"></i>EPI / EPC</div>';
  SEG_EPI_ITENS.forEach(nome => {
    const val = inv?.epiEpc?.[nome];
    const ok = val?.ok !== false;
    const temCA = val?.temCA || false;
    const ca = val?.ca || '';
    const validade = val?.validade || '';
    const obs = val?.obs || '';
    const uid_ = uid.replace(/'/g,'');
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.84rem;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #f1f5f9">
      <label style="display:flex;align-items:center;gap:6px;min-width:150px;cursor:pointer">
        <input type="checkbox" class="seg-inv-chk" data-cat="epiEpc" data-item="${nome}" ${ok?'checked':''} style="width:18px;height:18px;accent-color:#059669">
        <span>${nome}</span>
      </label>
      <label style="display:flex;align-items:center;gap:4px;font-size:.76rem;color:var(--muted);cursor:pointer">
        <input type="checkbox" class="seg-inv-temca" data-item="${nome}" ${temCA?'checked':''} style="width:16px;height:16px;accent-color:#2563eb" onchange="document.getElementById('seg-ca-fields-${nome.replace(/\\s/g,'-')}').style.display=this.checked?'flex':'none'"> Tem CA?
      </label>
      <div id="seg-ca-fields-${nome.replace(/\\s/g,'-')}" style="display:${temCA?'flex':'none'};gap:6px;align-items:center">
        <input type="text" class="seg-inv-ca" data-item="${nome}" value="${ca}" placeholder="Nº CA" style="width:80px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem">
        <input type="date" class="seg-inv-val" data-item="${nome}" value="${validade}" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem">
      </div>
      <input type="text" class="seg-inv-obs" data-cat="epiEpc" data-item="${nome}" value="${obs}" placeholder="Obs..." style="flex:1;min-width:100px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:.78rem">
    </div>`;
  });

  html += `<div style="margin-top:20px;display:flex;gap:10px">
    <button class="btn btn-success" onclick="segSalvarInventario('${uid}')"><i class="fas fa-save"></i> Salvar Inventário</button>
    <button class="btn" onclick="document.getElementById('modal-seg-inv').style.display='none'" style="background:#e2e8f0"><i class="fas fa-times"></i> Fechar</button>
  </div>`;

  corpo.innerHTML = html;
  document.getElementById('modal-seg-inv').style.display = 'block';
}

async function segSalvarInventario(uid) {
  const mes = _segMesAtual();
  const data = {data: new Date().toISOString(), fiscalId: currentUser.id, fiscalNome: currentUser.name};

  // Coleta dados
  const veiculo = {}, ferramental = {}, epiEpc = {};
  const pendencias = {};

  document.querySelectorAll('.seg-inv-chk').forEach(chk => {
    const cat = chk.dataset.cat;
    const item = chk.dataset.item;
    const obsEl = document.querySelector(`.seg-inv-obs[data-cat="${cat}"][data-item="${item}"]`);
    const obj = {ok: chk.checked, obs: obsEl?.value?.trim() || ''};
    if (cat === 'veiculo') veiculo[item] = obj;
    else if (cat === 'ferramental') ferramental[item] = obj;
    else if (cat === 'epiEpc') {
      const temCAEl = document.querySelector(`.seg-inv-temca[data-item="${item}"]`);
      obj.temCA = temCAEl?.checked || false;
      if (obj.temCA) {
        const caEl = document.querySelector(`.seg-inv-ca[data-item="${item}"]`);
        const valEl = document.querySelector(`.seg-inv-val[data-item="${item}"]`);
        if (caEl) obj.ca = caEl.value.trim();
        if (valEl) obj.validade = valEl.value;
      }
      epiEpc[item] = obj;
    }
    if (!chk.checked) pendencias[item] = {obs: obj.obs, resolvido: false, criadoEm: new Date().toISOString()};
  });

  data.veiculo = veiculo;
  data.ferramental = ferramental;
  data.epiEpc = epiEpc;
  data.pendencias = pendencias;

  try {
    await db.ref(`seguranca/${uid}/inventarios/${mes}`).set(data);
    document.getElementById('modal-seg-inv').style.display = 'none';
    toast(`Inventário ${mes.split('-').reverse().join('/')} salvo!`, 'success');
    renderSegurancaPage();
    // Atualiza página de inventário se estiver visível
    if (document.getElementById('page-inventario')?.classList.contains('active')) renderInventarioFiscal();
  } catch(e) {
    console.error('[segSalvarInventario]', e);
    toast('Erro ao salvar inventário.', 'error');
  }
}

async function segLiberarBloqueio(uid) {
  if (!confirm(`Liberar bloqueio do técnico ${usersCache[uid]?.name||uid}?`)) return;
  try {
    await db.ref(`seguranca/${uid}/bloqueio`).remove();
    toast('Bloqueio removido!', 'success');
    renderSegurancaPage();
  } catch(e) { toast('Erro ao liberar.','error'); }
}

async function _ocrExtrairDatasDocumento(base64dataUrl) {
  try {
    if (typeof Tesseract === 'undefined') return { datas: [], textoOCR: '', erro: null };
    if (base64dataUrl.startsWith('data:application/pdf')) return { datas: [], textoOCR: '', erro: 'pdf-sem-suporte', msg: 'OCR disponivel apenas para imagens.' };
    const { data: { text } } = await Tesseract.recognize(base64dataUrl, 'por');
    const datas = [];
    let m;
    const r1 = /(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/g;
    while ((m = r1.exec(text)) !== null) {
      const d=parseInt(m[1]),mo=parseInt(m[2]),y=parseInt(m[3]);
      if (d>=1&&d<=31&&mo>=1&&mo<=12&&y>=2000&&y<=2099) datas.push({original:m[0],iso:`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`});
    }
    const r2 = /(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2})\b/g;
    while ((m = r2.exec(text)) !== null) {
      const d=parseInt(m[1]),mo=parseInt(m[2]);let y=parseInt(m[3]);if(y<50)y+=2000;else y+=1900;
      if(d>=1&&d<=31&&mo>=1&&mo<=12&&y>=2000){const iso=`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;if(!datas.some(x=>x.iso===iso))datas.push({original:m[0],iso});}
    }
    datas.sort((a,b)=>b.iso.localeCompare(a.iso));
    return { datas, textoOCR: text, erro: null };
  } catch(e) { return { datas: [], textoOCR: '', erro: e.message }; }
}

function _ocrValidarValidade(validadeInformada, datasOCR) {
  if (!datasOCR || datasOCR.length === 0) return { ok: true, msg: 'OCR nao encontrou datas.', confianca: 'baixa' };
  if (datasOCR.find(d => d.iso === validadeInformada)) return { ok: true, msg: 'Data confirmada.', confianca: 'alta' };
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const datasVencidas = datasOCR.filter(d => new Date(d.iso+'T00:00:00') < hoje);
  const datasValidas = datasOCR.filter(d => new Date(d.iso+'T00:00:00') >= hoje);
  const datasEncontradas = datasOCR.map(d => d.original).join(', ');
  const valInfFmt = validadeInformada.split('-').reverse().join('/');
  if (datasVencidas.length > 0 && datasValidas.length === 0) {
    return { ok: false, msg: `DOCUMENTO POSSIVELMENTE VENCIDO!\nDatas encontradas: ${datasEncontradas}\nTodas vencidas. Informado: ${valInfFmt}`, confianca: 'alta', datasEncontradas: datasOCR };
  }
  return { ok: false, msg: `Validade informada (${valInfFmt}) NAO encontrada no documento.\nDatas encontradas: ${datasEncontradas}`, confianca: 'media', datasEncontradas: datasOCR };
}

function _whatsUrl(telefone, msg) {
  let tel = (telefone||'').replace(/\D/g,'');
  if (tel.startsWith('0')) tel = tel.slice(1);
  if (tel.length <= 11) tel = '55' + tel;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

function _getTelefone(uid) {
  const u = usersCache[uid];
  return u?.empresa?.telefone || u?.telefone || '';
}

function _whatsAlertaVencido(uid, docsVencidos) {
  const tecNome = usersCache[uid]?.name || uid;
  const tel = _getTelefone(uid);
  let msg = `*ALERTA — Documentos Vencidos*\n\nPrestador: ${tecNome}\n\n`;
  docsVencidos.forEach(d => { msg += `* ${d.nome || d.tipo} — ${d.texto || 'Vencido'}\n`; });
  msg += `\nEnvie os documentos atualizados no app para desbloquear seu acesso.\n👉 https://solucaoderua.web.app`;
  window.open(tel ? _whatsUrl(tel, msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function _whatsGrupo(msg) { window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); }

async function _checkinDocumentosVencidos(uid) {
  const vencidos = [];
  try {
    const snapDocs = await db.ref(`seguranca/${uid}/documentos`).once('value');
    const docs = snapDocs.val() || {};
    const snapDispensas = await db.ref(`seguranca/${uid}/dispensas`).once('value');
    const dispensas = snapDispensas.val() || {};
    const updates = {};
    Object.entries(docs).forEach(([tipo, d]) => {
      if (dispensas[tipo] || !d.validade) return;
      const st = _segStatusDoc(d.validade);
      if (st.status === 'vencido') {
        if (d.status !== 'vencido') {
          updates[`${tipo}/status`] = 'vencido';
          updates[`${tipo}/vencidoDetectadoEm`] = new Date().toISOString();
        }
        vencidos.push({ tipo, nome: SEG_DOC_TIPOS[tipo]?.nome || tipo, icon: SEG_DOC_TIPOS[tipo]?.icon || 'fa-file', validade: d.validade, texto: st.texto });
      }
    });
    if (Object.keys(updates).length > 0) {
      await db.ref(`seguranca/${uid}/documentos`).update(updates);
    }
  } catch(e) { console.error('[_checkinDocumentosVencidos]', e); }
  return vencidos;
}

async function verificarBloqueioSeguranca(uid) {
  // 1. Verifica bloqueio direto (fiscal bloqueou manualmente)
  try {
    const snapBlq = await db.ref(`seguranca/${uid}/bloqueio`).once('value');
    if (snapBlq.val()) return {bloqueado:true, motivo: snapBlq.val().motivo || 'Bloqueio de segurança ativo. Procure o fiscal.'};
  } catch(_){}

  // Load dispensas para verificação
  let dispensas = {};
  try {
    const snapDisp = await db.ref(`seguranca/${uid}/dispensas`).once('value');
    dispensas = snapDisp.val() || {};
  } catch(_){}

  // 2. Verifica documentos vencidos (respeitando dispensas)
  try {
    const snapDocs = await db.ref(`seguranca/${uid}/documentos`).once('value');
    const docs = snapDocs.val() || {};
    const vencidos = [];
    Object.entries(docs).forEach(([tipo,d]) => {
      if (dispensas[tipo]) return; // Skip se dispensado
      if (d.validade) {
        const st = _segStatusDoc(d.validade);
        if (st.status === 'vencido') vencidos.push(SEG_DOC_TIPOS[tipo]?.nome || tipo);
      }
    });
    if (vencidos.length > 0) return {bloqueado:true, motivo:`Documento(s) vencido(s): ${vencidos.join(', ')}. Envie documentos atualizados.`};
  } catch(_){}

  // 3. Verifica pendências de inventário (dia > 2 do mês, pendência do mês anterior sem resolução)
  const hoje = new Date();
  if (hoje.getDate() > 2) {
    const mesAnt = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1);
    const mesAntKey = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth()+1).padStart(2,'0')}`;
    try {
      const snapInv = await db.ref(`seguranca/${uid}/inventarios/${mesAntKey}/pendencias`).once('value');
      const pends = snapInv.val() || {};
      const naoResolvidas = Object.entries(pends).filter(([,p]) => !p.resolvido);
      if (naoResolvidas.length > 0) {
        return {bloqueado:true, motivo:`Pendência(s) de inventário ${mesAntKey.split('-').reverse().join('/')} não resolvida(s): ${naoResolvidas.map(([item])=>item).join(', ')}. Procure o fiscal.`};
      }
    } catch(_){}
  }

  // 4. Verifica Ficha de EPI (dia > 2 do mês, EPI não preenchido, respeitando dispensas)
  if (hoje.getDate() > 2) {
    try {
      const snapTemplate = await db.ref('seguranca/fichaEpiTemplate/itens').once('value');
      const templateItems = snapTemplate.val() || {};
      if (Object.keys(templateItems).length > 0) {
        const snapFicha = await db.ref(`seguranca/${uid}/fichaEpi`).once('value');
        const fichaEpi = snapFicha.val() || {};
        const itensFaltantes = [];
        const itensRejeitados = [];
        Object.entries(templateItems).forEach(([itemId, item]) => {
          if (dispensas[itemId]) return; // Skip se dispensado
          const epiData = fichaEpi[itemId];
          if (!epiData || epiData.status === 'nao_preenchido' || epiData.status === 'rejeitado') {
            itensFaltantes.push(item.descricao);
            if (epiData?.status === 'rejeitado') itensRejeitados.push(item.descricao);
          }
        });
        if (itensFaltantes.length > 0) {
          const motivo = itensRejeitados.length > 0
            ? `Ficha de EPI: ${itensRejeitados.join(', ')} rejeitado(s) pela Gestão. Corrija e reenvie.`
            : `Ficha de EPI incompleta: ${itensFaltantes.join(', ')}. Preencha os itens obrigatórios.`;
          return {bloqueado:true, motivo};
        }
      }
    } catch(_){}
  }

  // 5. Verifica Licenciamento Veicular (se estiver no mês de licenciamento + 2 dias, status deve ser 'aprovado')
  if (hoje.getDate() >= 2) {
    try {
      const snapVeiculo = await db.ref(`seguranca/${uid}/veiculo`).once('value');
      const veiculo = snapVeiculo.val();
      if (veiculo && veiculo.mesLicenciamento) {
        const mesAtual = hoje.getMonth() + 1;
        if (mesAtual === veiculo.mesLicenciamento) {
          // Estamos no mês de licenciamento
          if (veiculo.status === 'com_debitos') {
            return {bloqueado:true, motivo:`Veículo ${veiculo.placa} possui débitos no mês de licenciamento (${MESES_NOME[veiculo.mesLicenciamento]}). Resolva os débitos com o DETRAN.`};
          }
        }
      }
    } catch(_){}
  }

  return {bloqueado:false};
}

async function verificarAlertasSeguranca(uid) {
  const alertas = [];
  try {
    const snapDocs = await db.ref(`seguranca/${uid}/documentos`).once('value');
    const docs = snapDocs.val() || {};
    Object.entries(docs).forEach(([tipo,d]) => {
      if (d.validade) {
        const st = _segStatusDoc(d.validade);
        if (st.status === 'vencendo') alertas.push(`${SEG_DOC_TIPOS[tipo]?.nome||tipo}: ${st.texto}`);
      }
    });
  } catch(_){}
  // EPI validades
  try {
    const mes = _segMesAtual();
    const snapInv = await db.ref(`seguranca/${uid}/inventarios/${mes}/epiEpc`).once('value');
    const epis = snapInv.val() || {};
    Object.entries(epis).forEach(([nome,epi]) => {
      if (epi.validade) {
        const st = _segStatusDoc(epi.validade);
        if (st.status === 'vencendo') alertas.push(`EPI ${nome}: ${st.texto}`);
        if (st.status === 'vencido') alertas.push(`EPI ${nome}: VENCIDO!`);
      }
    });
  } catch(_){}
  // Ficha de EPI - itens com CA vencido ou pendentes de validação
  try {
    const snapFicha = await db.ref(`seguranca/${uid}/fichaEpi`).once('value');
    const fichaEpi = snapFicha.val() || {};
    Object.entries(fichaEpi).forEach(([itemId, epiData]) => {
      if (epiData.validade) {
        const st = _segStatusDoc(epiData.validade);
        if (st.status === 'vencendo') alertas.push(`Ficha EPI CA vence em breve: ${st.texto}`);
        if (st.status === 'vencido') alertas.push(`Ficha EPI CA VENCIDO!`);
      }
      if (epiData.status === 'pendente') alertas.push(`Ficha EPI item pendente de validação pela gestão.`);
      if (epiData.status === 'rejeitado') alertas.push(`Ficha EPI item rejeitado pela gestão: ${epiData.motivoRejeicao || 'sem motivo especificado'}`);
    });
  } catch(_){}
  // Licenciamento Veicular
  try {
    const snapVeiculo = await db.ref(`seguranca/${uid}/veiculo`).once('value');
    const veiculo = snapVeiculo.val();
    if (veiculo && veiculo.mesLicenciamento) {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const mesProx = mesAtual === 12 ? 1 : mesAtual + 1;
      if (mesProx === veiculo.mesLicenciamento) {
        alertas.push(`Licenciamento vence em ${MESES_NOME[veiculo.mesLicenciamento]}. Prepare a documentação.`);
      }
      if (veiculo.status === 'com_debitos') {
        alertas.push(`Veículo ${veiculo.placa}: débitos encontrados. Procure resolver.`);
      }
    }
  } catch(_){}
  return alertas;
}

async function segAbrirTemplateEpi() {
  if (!(_isAdmin(currentUser) || currentUser.nivel === 'V0')) {
    toast('Apenas gestão pode gerenciar o template de EPI.', 'error');
    return;
  }

  // Load template
  let template = {};
  try {
    const s = await db.ref('seguranca/fichaEpiTemplate').once('value');
    template = s.val() || {};
  } catch(_){}

  const corpo = document.getElementById('seg-template-corpo');
  let html = '';

  // Show PGR info if available
  if (template.pgrInfo) {
    html += `<div style="padding:12px;background:#ecfdf5;border-radius:10px;border-left:4px solid #059669;margin-bottom:14px;font-size:.8rem">
      <strong style="color:#065f46"><i class="fas fa-info-circle"></i> Informações do PGR:</strong>
      <div style="color:#047857;margin-top:4px">
        Extraído em: ${new Date(template.pgrInfo.dataExtracao).toLocaleDateString('pt-BR')}
        ${template.pgrInfo.extraidoNome ? ` por ${template.pgrInfo.extraidoNome}` : ''}
      </div>
    </div>`;
  }

  // List items
  const itens = template.itens || {};
  if (Object.keys(itens).length > 0) {
    html += '<div style="margin-bottom:16px"><strong style="font-size:.9rem">Itens Atuais:</strong></div>';
    Object.entries(itens).forEach(([itemId, item]) => {
      html += `<div style="padding:12px;background:#f8fafc;border-radius:8px;border-left:4px solid #f59e0b;margin-bottom:8px;display:flex;justify-content:space-between;align-items:start">
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9rem">${item.descricao}</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:3px">
            <i class="fas fa-tag"></i> ${SEG_EPI_TIPOS[item.tipo] || item.tipo}
          </div>
          ${item.caReferencia ? `<div style="font-size:.78rem;color:#64748b;margin-top:2px"><i class="fas fa-certificate"></i> CA Ref: ${item.caReferencia}</div>` : ''}
          ${item.fabricanteRef ? `<div style="font-size:.78rem;color:#64748b;margin-top:2px"><i class="fas fa-industry"></i> Fabricante: ${item.fabricanteRef}</div>` : ''}
        </div>
        <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;margin-left:8px" onclick="segRemoverItemEpi('${itemId}')"><i class="fas fa-trash"></i></button>
      </div>`;
    });
  } else {
    html += '<div style="padding:12px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:.85rem"><i class="fas fa-exclamation-circle"></i> Nenhum item configurado.</div>';
  }

  // Add new item form
  html += `<div style="margin-top:20px;padding:16px;background:#f0f9ff;border-radius:10px;border:1px dashed #0ea5e9">
    <div style="font-weight:700;margin-bottom:12px;font-size:.9rem"><i class="fas fa-plus-circle"></i> Adicionar Novo Item</div>
    <div class="form-group">
      <label style="font-size:.8rem">Descrição do Equipamento</label>
      <input type="text" id="seg-epi-desc" class="form-input" placeholder="Ex: Óculos de Proteção" style="font-size:.85rem">
    </div>
    <div class="form-group">
      <label style="font-size:.8rem">Tipo de Proteção</label>
      <select id="seg-epi-tipo" class="form-input" style="font-size:.85rem">
        <option value="">Selecione...</option>
        ${Object.entries(SEG_EPI_TIPOS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label style="font-size:.8rem">CA de Referência (opcional)</label>
      <input type="text" id="seg-epi-ca" class="form-input" placeholder="Ex: 28018" style="font-size:.85rem">
    </div>
    <div class="form-group">
      <label style="font-size:.8rem">Fabricante de Referência (opcional)</label>
      <input type="text" id="seg-epi-fab" class="form-input" placeholder="Ex: ISSO MOLD" style="font-size:.85rem">
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-primary" onclick="segAdicionarItemEpi()" style="flex:1"><i class="fas fa-plus"></i> Adicionar Item</button>
      <button class="btn" onclick="document.getElementById('modal-ficha-epi-template').style.display='none'" style="background:#e2e8f0"><i class="fas fa-times"></i> Fechar</button>
    </div>
  </div>`;

  // Add "Gerar Fichas" button if template has items
  if (Object.keys(itens).length > 0) {
    html += `<div style="margin-top:20px;padding:14px;background:#dbeafe;border-radius:10px;border:1px solid #0ea5e9">
      <button class="btn btn-success" onclick="segGerarFichasEpi()" style="width:100%;background:#0284c7;color:#fff"><i class="fas fa-rocket"></i> Gerar Fichas para Prestadores</button>
      <div style="font-size:.75rem;color:#0c4a6e;margin-top:6px;font-style:italic">Cria fichas em branco para todos os prestadores ativos</div>
    </div>`;
    corpo.innerHTML = html;
  } else {
    corpo.innerHTML = html;
  }
  document.getElementById('modal-ficha-epi-template').style.display = 'block';
}

async function segAdicionarItemEpi() {
  const desc = document.getElementById('seg-epi-desc').value.trim();
  const tipo = document.getElementById('seg-epi-tipo').value;
  const ca = document.getElementById('seg-epi-ca').value.trim();
  const fab = document.getElementById('seg-epi-fab').value.trim();

  if (!desc) { toast('Informe a descrição do equipamento.', 'error'); return; }
  if (!tipo) { toast('Selecione o tipo de proteção.', 'error'); return; }

  try {
    const itemId = new Date().getTime().toString();
    const item = {
      descricao: desc,
      tipo: tipo,
      caReferencia: ca || null,
      fabricanteRef: fab || null,
      obrigatorioPGR: true,
      criadoPor: currentUser.id,
      criadoEm: new Date().toISOString()
    };

    await db.ref(`seguranca/fichaEpiTemplate/itens/${itemId}`).set(item);
    toast('Item adicionado com sucesso!', 'success');
    segAbrirTemplateEpi();
  } catch(e) {
    console.error('[segAdicionarItemEpi]', e);
    toast('Erro ao adicionar item.', 'error');
  }
}

async function segRemoverItemEpi(itemId) {
  if (!confirm('Remover este item do template? Os prestadores que já preencheram continuarão com seus registros.')) return;

  try {
    await db.ref(`seguranca/fichaEpiTemplate/itens/${itemId}`).remove();
    toast('Item removido!', 'success');
    segAbrirTemplateEpi();
  } catch(e) {
    console.error('[segRemoverItemEpi]', e);
    toast('Erro ao remover item.', 'error');
  }
}

async function segGerarFichasEpi() {
  const snapTemplate = await db.ref('seguranca/fichaEpiTemplate/itens').once('value');
  const template = snapTemplate.val() || {};
  const templateIds = Object.keys(template);
  if (templateIds.length === 0) { toast('Nenhum item no template.','error'); return; }

  const tecs = _segGetTecnicos();
  if (tecs.length === 0) { toast('Nenhum prestador ativo.','error'); return; }

  let criados = 0;
  for (const tec of tecs) {
    const snapFicha = await db.ref(`seguranca/${tec.id}/fichaEpi`).once('value');
    const ficha = snapFicha.val() || {};
    for (const itemId of templateIds) {
      if (!ficha[itemId]) {
        await db.ref(`seguranca/${tec.id}/fichaEpi/${itemId}`).set({
          status: 'nao_preenchido',
          criadoEm: new Date().toISOString()
        });
        criados++;
      }
    }
  }
  toast(`Fichas geradas! ${criados} itens criados para ${tecs.length} prestadores.`, 'success');
}

async function segDispensarItem(uid, tipo, categoria) {
  // categoria: 'documento' or 'epi'
  const motivo = prompt(`Motivo da dispensa de ${tipo} para ${usersCache[uid]?.name||uid}:`);
  if (motivo === null) return; // cancelled

  try {
    await db.ref(`seguranca/${uid}/dispensas/${tipo}`).set({
      categoria: categoria,
      dispensadoPor: currentUser.id,
      dispensadoNome: currentUser.name,
      dispensadoEm: new Date().toISOString(),
      motivo: motivo || 'Sem motivo informado'
    });
    toast(`${tipo} dispensado para ${usersCache[uid]?.name||uid}!`, 'success');
    renderSegurancaPage();
  } catch(e) {
    console.error('[segDispensarItem]', e);
    toast('Erro ao dispensar.', 'error');
  }
}

async function segReverterDispensa(uid, tipo) {
  if (!confirm(`Reverter dispensa de ${tipo} para ${usersCache[uid]?.name||uid}?`)) return;
  try {
    await db.ref(`seguranca/${uid}/dispensas/${tipo}`).remove();
    toast('Dispensa revertida!', 'success');
    renderSegurancaPage();
  } catch(e) {
    console.error('[segReverterDispensa]', e);
    toast('Erro ao reverter dispensa.', 'error');
  }
}

async function segAbrirFichaEpi(uid) {
  const tec = usersCache[uid];
  if (!tec) return;

  document.getElementById('seg-ficha-titulo').innerHTML = `<i class="fas fa-file-shield" style="margin-right:8px"></i>Ficha de EPI — ${tec.name || uid}`;

  // Load template and ficha
  let template = {};
  let fichaEpi = {};
  try {
    const s = await db.ref('seguranca/fichaEpiTemplate').once('value');
    template = s.val() || {};
  } catch(_){}
  try {
    const s = await db.ref(`seguranca/${uid}/fichaEpi`).once('value');
    fichaEpi = s.val() || {};
  } catch(_){}

  const corpo = document.getElementById('seg-ficha-corpo');
  const templateItems = template.itens || {};

  if (Object.keys(templateItems).length === 0) {
    corpo.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)"><i class="fas fa-info-circle"></i> Nenhum item configurado no template de EPI.</div>';
    document.getElementById('modal-ficha-epi-prestador').style.display = 'block';
    return;
  }

  let html = '';

  // Summary
  let totalItems = Object.keys(templateItems).length;
  let preenchidos = Object.entries(fichaEpi).filter(([,d]) => d.status === 'validado').length;
  let pendentes = Object.entries(fichaEpi).filter(([,d]) => d.status === 'pendente').length;
  let rejeitados = Object.entries(fichaEpi).filter(([,d]) => d.status === 'rejeitado').length;

  const statusCor = rejeitados > 0 ? '#dc2626' : pendentes > 0 ? '#d97706' : '#059669';
  const statusTexto = rejeitados > 0 ? 'Com rejeições' : pendentes > 0 ? 'Pendente' : 'Completo';

  html += `<div style="padding:14px;background:${statusCor}15;border-left:4px solid ${statusCor};border-radius:8px;margin-bottom:14px">
    <div style="font-weight:700;color:${statusCor};font-size:.9rem"><i class="fas fa-chart-pie"></i> Status: ${statusTexto}</div>
    <div style="font-size:.8rem;color:#475569;margin-top:4px">${preenchidos}/${totalItems} itens validados ${pendentes ? `· ${pendentes} pendente${pendentes === 1 ? '' : 's'}` : ''}${rejeitados ? ` · ${rejeitados} rejeitado${rejeitados === 1 ? '' : 's'}` : ''}</div>
  </div>`;

  // Items
  Object.entries(templateItems).forEach(([itemId, template]) => {
    const epiData = fichaEpi[itemId];
    const status = epiData?.status || 'nao_preenchido';
    const statusInfo = {
      'validado': { cor: '#059669', icon: 'fa-check-circle', texto: 'Validado' },
      'pendente': { cor: '#d97706', icon: 'fa-hourglass-half', texto: 'Pendente' },
      'rejeitado': { cor: '#dc2626', icon: 'fa-times-circle', texto: 'Rejeitado' },
      'nao_preenchido': { cor: '#94a3b8', icon: 'fa-circle-dashed', texto: 'Não preenchido' }
    }[status] || { cor: '#94a3b8', icon: 'fa-circle-dashed', texto: 'Desconhecido' };

    html += `<div style="padding:14px;background:#f8fafc;border-left:4px solid ${statusInfo.cor};border-radius:8px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9rem">${template.descricao}</div>
          <div style="font-size:.75rem;color:#64748b;margin-top:2px"><i class="fas fa-tag"></i> ${SEG_EPI_TIPOS[template.tipo] || template.tipo}</div>
        </div>
        <span style="font-size:.75rem;background:${statusInfo.cor}20;color:${statusInfo.cor};padding:3px 8px;border-radius:4px;font-weight:600">
          <i class="fas ${statusInfo.icon}"></i> ${statusInfo.texto}
        </span>
      </div>

      ${epiData ? `
        <div style="margin-top:8px;padding:10px;background:#fff;border-radius:6px;border:1px solid #e2e8f0;font-size:.8rem">
          <div><strong>Equipamento:</strong> ${epiData.nomeEquipamento || '-'}</div>
          <div><strong>CA:</strong> ${epiData.ca || '-'}</div>
          <div><strong>Válidade:</strong> ${epiData.validade ? new Date(epiData.validade + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</div>
          ${epiData.comprovante ? `
            <div style="margin-top:6px;padding:6px;background:#ecfdf5;border-radius:4px;border-left:3px solid #059669">
              <div><strong style="color:#065f46">Validação CA:</strong> <span style="color:${epiData.comprovante.situacao === 'VÁLIDO' ? '#059669' : '#d97706'}">${epiData.comprovante.resultado}</span></div>
              <div style="font-size:.75rem;color:#64748b;margin-top:2px">${epiData.comprovante.fonte}</div>
              <button class="btn btn-xs" style="background:#dbeafe;color:#1d4ed8;padding:2px 6px;margin-top:4px;font-size:.7rem" onclick="segVerComprovante('${uid}', '${itemId}')"><i class="fas fa-eye"></i> Ver Detalhes</button>
            </div>
          ` : ''}
          ${epiData.validadoPorGestao ? `
            <div style="margin-top:6px;padding:6px;background:#f0f9ff;border-radius:4px;border-left:3px solid #2563eb">
              <div style="font-size:.75rem;color:#1e40af"><strong>Validado por:</strong> ${epiData.nomeGestao || 'Gestão'}</div>
              <div style="font-size:.75rem;color:#64748b">${new Date(epiData.dataValidacaoGestao).toLocaleDateString('pt-BR')}</div>
            </div>
          ` : ''}
        </div>
      ` : `<div style="padding:10px;background:#fef3c7;border-radius:6px;color:#92400e;font-size:.8rem"><i class="fas fa-info-circle"></i> Não preenchido pelo prestador.</div>`}

      ${status === 'pendente' ? `
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-xs" style="background:#d1fae5;color:#065f46;flex:1" onclick="segAprovarItemEpi('${uid}', '${itemId}')"><i class="fas fa-check"></i> Aprovar</button>
          <button class="btn btn-xs" style="background:#fee2e2;color:#dc2626;flex:1" onclick="segRejeitarItemEpi('${uid}', '${itemId}')"><i class="fas fa-times"></i> Rejeitar</button>
        </div>
      ` : ''}
    </div>`;
  });

  html += `<div style="margin-top:16px">
    <button class="btn" onclick="document.getElementById('modal-ficha-epi-prestador').style.display='none'" style="background:#e2e8f0;width:100%"><i class="fas fa-times"></i> Fechar</button>
  </div>`;

  corpo.innerHTML = html;
  document.getElementById('modal-ficha-epi-prestador').style.display = 'block';
}

async function segAprovarItemEpi(uid, itemId) {
  try {
    await db.ref(`seguranca/${uid}/fichaEpi/${itemId}`).update({
      status: 'validado',
      validadoPorGestao: currentUser.id,
      nomeGestao: currentUser.name,
      dataValidacaoGestao: new Date().toISOString()
    });
    toast('Item aprovado!', 'success');
    segAbrirFichaEpi(uid);
  } catch(e) {
    console.error('[segAprovarItemEpi]', e);
    toast('Erro ao aprovar.', 'error');
  }
}

async function segRejeitarItemEpi(uid, itemId) {
  const motivo = prompt('Motivo da rejeição:');
  if (!motivo) return;

  try {
    await db.ref(`seguranca/${uid}/fichaEpi/${itemId}`).update({
      status: 'rejeitado',
      validadoPorGestao: currentUser.id,
      nomeGestao: currentUser.name,
      dataValidacaoGestao: new Date().toISOString(),
      motivoRejeicao: motivo
    });
    toast('Item rejeitado!', 'success');
    segAbrirFichaEpi(uid);
  } catch(e) {
    console.error('[segRejeitarItemEpi]', e);
    toast('Erro ao rejeitar.', 'error');
  }
}

function segVerComprovante(uid, itemId) {
  // Load and show comprovante details
  db.ref(`seguranca/${uid}/fichaEpi/${itemId}`).once('value').then(snap => {
    const epiData = snap.val();
    if (!epiData || !epiData.comprovante) {
      toast('Nenhum comprovante disponível.', 'info');
      return;
    }
    const comp = epiData.comprovante;
    const detalhesJson = JSON.stringify(comp.detalhes, null, 2);
    alert(`COMPROVANTE DE VALIDAÇÃO CA\n\nFonte: ${comp.fonte}\nResultado: ${comp.resultado}\nSituação: ${comp.situacao}\nData: ${new Date(comp.data).toLocaleString('pt-BR')}\n\nDetalhes:\n${detalhesJson}`);
  }).catch(e => {
    console.error('[segVerComprovante]', e);
    toast('Erro ao carregar comprovante.', 'error');
  });
}

async function validarCA(caNumber) {
  const comprovante = { data: new Date().toISOString(), fonte: '', resultado: '', detalhes: {}, situacao: '' };
  const ca = String(caNumber).trim();
  if (!ca) { comprovante.resultado = 'CA inválido'; return comprovante; }

  // Tier 1: API primária
  try {
    const resp = await fetch(`https://projeto-ca-api.rj.r.appspot.com/api/ca/${encodeURIComponent(ca)}`);
    if (resp.ok) {
      const data = await resp.json();
      comprovante.fonte = 'API projeto-ca (projeto-ca-api.rj.r.appspot.com)';
      comprovante.detalhes = data;
      comprovante.descricaoEquipamento = data['DescriçãoEquipamento'] || data['Equipamento'] || '';
      comprovante.fabricante = data['RazãoSocial'] || '';
      comprovante.dataValidade = data['DatadeValidade'] || '';
      const situacao = (data['Situação'] || '').toUpperCase();
      if (situacao.includes('VÁLIDO') || situacao.includes('VALIDO')) {
        comprovante.resultado = 'CA Válido';
        comprovante.situacao = 'VÁLIDO';
      } else {
        comprovante.resultado = `CA ${data['Situação'] || 'Status desconhecido'}`;
        comprovante.situacao = situacao;
      }
      return comprovante;
    }
  } catch(e) { console.warn('[validarCA] Tier 1 falhou:', e); }

  // Tier 2: ConsultaCA (automático via proxy)
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://consultaca.com/${ca}`)}`;
    const resp2 = await fetch(proxyUrl, {signal: AbortSignal.timeout(10000)});
    if (resp2.ok) {
      const html = await resp2.text();
      comprovante.fonte = 'ConsultaCA (consultaca.com) via proxy';
      // Parse HTML to extract info
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Try to extract status from the page
      const textoCompleto = doc.body?.textContent || '';

      // Look for "Situação" or status indicators
      const situacaoMatch = textoCompleto.match(/Situa[çc][ãa]o[:\s]*([^\n]+)/i);
      const validadeMatch = textoCompleto.match(/Validade[:\s]*([^\n]+)/i);
      const equipamentoMatch = textoCompleto.match(/Equipamento[:\s]*([^\n]+)/i) || textoCompleto.match(/Descri[çc][ãa]o[:\s]*([^\n]+)/i);
      const fabricanteMatch = textoCompleto.match(/Fabricante[:\s]*([^\n]+)/i) || textoCompleto.match(/Raz[ãa]o\s*Social[:\s]*([^\n]+)/i);

      if (situacaoMatch) {
        const sit = situacaoMatch[1].trim().toUpperCase();
        comprovante.situacao = sit.includes('VÁLIDO') || sit.includes('VALIDO') ? 'VÁLIDO' : sit;
        comprovante.resultado = sit.includes('VÁLIDO') || sit.includes('VALIDO') ? 'CA Válido' : `CA ${situacaoMatch[1].trim()}`;
      } else {
        // If we got a page but couldn't parse status, it's still better than nothing
        comprovante.resultado = 'Dados obtidos — verifique detalhes';
        comprovante.situacao = 'VERIFICAR';
      }

      comprovante.dataValidade = validadeMatch ? validadeMatch[1].trim() : '';
      comprovante.descricaoEquipamento = equipamentoMatch ? equipamentoMatch[1].trim() : '';
      comprovante.fabricante = fabricanteMatch ? fabricanteMatch[1].trim() : '';
      comprovante.detalhes.htmlExtraido = true;
      comprovante.detalhes.linkOriginal = `https://consultaca.com/${ca}`;
      return comprovante;
    }
  } catch(e) { console.warn('[validarCA] Tier 2 falhou:', e); }

  // Tier 3: Manual
  comprovante.fonte = 'Consulta manual necessária (APIs indisponíveis)';
  comprovante.resultado = 'Verificação manual necessária';
  comprovante.situacao = 'MANUAL';
  comprovante.detalhes = {
    linkConsultaCA: `https://consultaca.com/${ca}`,
    linkMTE: 'https://caepi.mte.gov.br/internet/consultaCAInternet.aspx',
    nota: 'Ambas as APIs automáticas falharam. Verifique manualmente.'
  };
  return comprovante;
}

function calcMesLicenciamento(placa) {
  const final = placa.replace(/[^0-9]/g,'').slice(-1);
  return TABELA_LICENCIAMENTO[final] || null;
}

function segAbrirDadosVeiculo(uid) {
  const modal = document.getElementById('modal-veiculo-dados');
  modal.style.display = 'block';
  document.getElementById('veiculo-placa').value = '';
  document.getElementById('veiculo-renavam').value = '';
  document.getElementById('veiculo-calc').style.display = 'none';
  modal._uid = uid; // store uid in modal for later use

  // Load existing data if any
  db.ref(`seguranca/${uid}/veiculo`).once('value').then(snap => {
    const v = snap.val();
    if (v) {
      document.getElementById('veiculo-placa').value = v.placa || '';
      document.getElementById('veiculo-renavam').value = v.renavam || '';
    }
  }).catch(e => console.warn('[segAbrirDadosVeiculo]', e));
}

async function segSalvarDadosVeiculo() {
  const uid = document.getElementById('modal-veiculo-dados')._uid;
  const placa = document.getElementById('veiculo-placa').value.toUpperCase().trim();
  const renavam = document.getElementById('veiculo-renavam').value.trim();

  if (!placa) { toast('Informe a placa do veículo.','error'); return; }
  if (!renavam) { toast('Informe o RENAVAM.','error'); return; }
  if (placa.length < 7) { toast('Placa inválida.','error'); return; }
  if (renavam.length !== 11) { toast('RENAVAM deve ter 11 dígitos.','error'); return; }

  const final = placa.replace(/[^0-9]/g,'').slice(-1);
  const mesLic = calcMesLicenciamento(placa);
  const anoAtual = new Date().getFullYear();

  try {
    await db.ref(`seguranca/${uid}/veiculo`).set({
      placa: placa,
      finalPlaca: final,
      renavam: renavam,
      mesLicenciamento: mesLic,
      anoLicenciamentoAtual: anoAtual,
      status: 'pendente',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    });

    document.getElementById('modal-veiculo-dados').style.display = 'none';
    toast('Dados do veículo salvos! Iniciando consulta de débitos...','success');

    // Trigger automatic debt check
    await consultarDebitosVeiculo(uid);
    renderSegurancaPage();
  } catch(e) {
    console.error('[segSalvarDadosVeiculo]', e);
    toast('Erro ao salvar dados do veículo.','error');
  }
}

async function consultarDebitosVeiculo(uid) {
  try {
    const snap = await db.ref(`seguranca/${uid}/veiculo`).once('value');
    const veiculo = snap.val();
    if (!veiculo || !veiculo.placa) { toast('Veículo não cadastrado.','error'); return null; }

    // Abre direto o modal de consulta manual com links do DETRAN
    document.getElementById('modal-consulta-manual').style.display = 'block';
    document.getElementById('modal-consulta-manual')._uid = uid;
    toast(`Consulte débitos de ${veiculo.placa} nos sites do DETRAN e registre o resultado.`, 'info');
    return null;
  } catch(e) {
    console.error('[consultarDebitosVeiculo]', e);
    toast('Erro ao abrir consulta.','error');
  }
}

async function segSalvarConsultaManual() {
  const uid = document.getElementById('modal-consulta-manual')._uid;
  const resultado = document.getElementById('consulta-resultado').value;
  const obs = document.getElementById('consulta-obs').value.trim();

  if (!resultado) { toast('Selecione o resultado da consulta.','error'); return; }

  try {
    const consulta = {
      data: new Date().toISOString(),
      fonte: 'Consulta manual (DETRAN)',
      resultado: resultado === 'sem_debitos' ? 'Sem débitos' : 'Débitos encontrados',
      detalhes: { observacoes: obs },
      realizadoPor: currentUser.id,
      realizadoNome: currentUser.name
    };

    const consultaId = Date.now().toString();
    await db.ref(`seguranca/${uid}/veiculo/consultas/${consultaId}`).set(consulta);

    // Update vehicle status
    if (resultado === 'sem_debitos') {
      await db.ref(`seguranca/${uid}/veiculo`).update({
        status: 'aprovado',
        atualizadoEm: new Date().toISOString(),
        ultimaConsulta: consulta.data,
        proximaConsulta: null
      });
      await db.ref(`seguranca/${uid}/documentos/crlv/status`).set('validado');
    } else {
      const proxConsulta = new Date();
      proxConsulta.setDate(proxConsulta.getDate() + 15);
      await db.ref(`seguranca/${uid}/veiculo`).update({
        status: 'com_debitos',
        atualizadoEm: new Date().toISOString(),
        ultimaConsulta: consulta.data,
        proximaConsulta: proxConsulta.toISOString()
      });
    }

    document.getElementById('modal-consulta-manual').style.display = 'none';
    toast('Consulta registrada com sucesso!','success');
    renderSegurancaPage();
  } catch(e) {
    console.error('[segSalvarConsultaManual]', e);
    toast('Erro ao registrar consulta.','error');
  }
}

async function segAbrirHistoricoConsultas(uid) {
  const corpo = document.getElementById('historico-consultas-corpo');
  corpo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
  document.getElementById('modal-historico-consultas').style.display = 'block';

  try {
    const snap = await db.ref(`seguranca/${uid}/veiculo/consultas`).once('value');
    const consultas = snap.val() || {};

    if (Object.keys(consultas).length === 0) {
      corpo.innerHTML = '<p style="text-align:center;color:var(--muted)">Nenhuma consulta registrada.</p>';
      return;
    }

    let html = '';
    Object.entries(consultas).sort((a,b) => new Date(b[1].data) - new Date(a[1].data)).forEach(([id, c]) => {
      const data = new Date(c.data).toLocaleDateString('pt-BR') + ' ' + new Date(c.data).toLocaleTimeString('pt-BR');
      const resultColor = c.resultado === 'Sem débitos' ? '#059669' : '#dc2626';
      html += `<div style="margin-bottom:12px;padding:12px;background:#f8fafc;border-radius:8px;border-left:4px solid ${resultColor}">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
          <div style="font-weight:700;color:#1e293b">${c.fonte}</div>
          <div style="font-size:.75rem;color:var(--muted)">${data}</div>
        </div>
        <div style="font-size:.85rem;color:${resultColor};font-weight:600;margin-bottom:4px"><i class="fas fa-${c.resultado === 'Sem débitos' ? 'check-circle' : 'exclamation-circle'}"></i> ${c.resultado}</div>
        ${c.detalhes && c.detalhes.observacoes ? `<div style="font-size:.8rem;color:#64748b;margin-top:6px"><strong>Observações:</strong> ${c.detalhes.observacoes}</div>` : ''}
        ${c.realizadoNome ? `<div style="font-size:.75rem;color:var(--muted);margin-top:4px">Registrado por: ${c.realizadoNome}</div>` : ''}
      </div>`;
    });
    corpo.innerHTML = html;
  } catch(e) {
    console.error('[segAbrirHistoricoConsultas]', e);
    corpo.innerHTML = '<p style="color:var(--danger)">Erro ao carregar histórico.</p>';
  }
}

async function verificarLicenciamentos() {
  const tecs = _segGetTecnicos();
  const hoje = new Date();

  for (const tec of tecs) {
    try {
      const snap = await db.ref(`seguranca/${tec.id}/veiculo`).once('value');
      const veiculo = snap.val();
      if (!veiculo || !veiculo.renavam) continue;

      // If already approved for this year, skip
      if (veiculo.status === 'aprovado' && veiculo.anoLicenciamentoAtual >= hoje.getFullYear()) continue;

      // Check if due for next check (every 15 days)
      if (veiculo.proximaConsulta) {
        const proxData = new Date(veiculo.proximaConsulta);
        if (hoje >= proxData) {
          await consultarDebitosVeiculo(tec.id);
        }
      }
    } catch(e) {
      console.warn('[verificarLicenciamentos]', e);
    }
  }
}
// ── Window bridge ──
window.renderSegurancaPage = renderSegurancaPage;
window.segDocAnalisar = segDocAnalisar;
window.segDocValidar = segDocValidar;
window.calcMesLicenciamento = calcMesLicenciamento;
window.segSalvarDadosVeiculo = segSalvarDadosVeiculo;
window.segSalvarConsultaManual = segSalvarConsultaManual;
