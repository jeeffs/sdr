'use strict';

window.renderExportarDocsPage = function () {
  const tecDiv = document.getElementById('exp-docs-tecnicos');
  const tiposDiv = document.getElementById('exp-docs-tipos');
  if (!tecDiv || !tiposDiv) return;
  // Carrega contratos assinados (admin e fiscal)
  if (_isAdmin(currentUser) || _isFiscal(currentUser)) _renderContratosAssinados().catch(e => console.error('[_renderContratosAssinados]', e));

  const tecs = _segGetTecnicos();
  tecDiv.innerHTML = tecs.map(t =>
    `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.84rem;transition:background .15s">
      <input type="checkbox" class="exp-doc-tec" value="${t.id}" style="width:18px;height:18px;accent-color:#2563eb">
      <span style="font-weight:600">${t.nome}</span>
    </label>`
  ).join('');

  // Documentos padrão + Ficha de EPI + Licenciamento
  const tiposExtra = [
    ...Object.entries(SEG_DOC_TIPOS).map(([tipo,info]) => ({tipo, nome:info.nome, icon:info.icon})),
    {tipo:'fichaEpi', nome:'Ficha de EPI', icon:'fa-shield-alt'},
    {tipo:'licenciamento', nome:'Licenciamento Veicular', icon:'fa-car'}
  ];
  tiposDiv.innerHTML = tiposExtra.map(t =>
    `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.84rem">
      <input type="checkbox" class="exp-doc-tipo" value="${t.tipo}" checked style="width:18px;height:18px;accent-color:#d97706">
      <i class="fas ${t.icon}" style="color:#64748b"></i>
      <span>${t.nome}</span>
    </label>`
  ).join('');
}

window._renderContratosAssinados = async function () {
  const el = document.getElementById('exp-contratos-assinados');
  if (!el) return;
  el.innerHTML = '<div style="font-size:.84rem;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
  try {
    const snap = await db.ref('contratos').once('value');
    const todos = snap.val() || {};
    const contratos = Object.entries(todos)
      .map(([uid, c]) => ({ uid, ...(c.prestacaoServicos||{}) }))
      .filter(c => c.status)
      .sort((a,b) => {
        // Assinados primeiro, depois pendentes
        if (a.status === 'assinado' && b.status !== 'assinado') return -1;
        if (a.status !== 'assinado' && b.status === 'assinado') return 1;
        return (b.assinadoEm||b.geradoEm||'').localeCompare(a.assinadoEm||a.geradoEm||'');
      });
    if (!contratos.length) {
      el.innerHTML = '<p style="color:var(--muted);font-size:.84rem">Nenhum contrato encontrado.</p>'; return;
    }
    const thS = 'padding:8px 10px;font-size:.77rem;font-weight:700;white-space:nowrap';
    const tdS = 'padding:7px 10px;font-size:.82rem;border-bottom:1px solid #e5e7eb';
    el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead style="background:#1f4e79;color:#fff"><tr>
        <th style="${thS}">Prestador</th>
        <th style="${thS}">Status</th>
        <th style="${thS}">Data</th>
        <th style="${thS};text-align:center">Contrato</th>
      </tr></thead>
      <tbody>${contratos.map((c,i) => {
        const u = usersCache[c.uid];
        const nome = u?.name || c.uid;
        const assinado = c.status === 'assinado';
        const dt = assinado
          ? (c.assinadoEm ? new Date(c.assinadoEm).toLocaleDateString('pt-BR') : '—')
          : (c.geradoEm ? new Date(c.geradoEm).toLocaleDateString('pt-BR') : '—');
        const statusBadge = assinado
          ? '<span style="font-size:.7rem;background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:8px;font-weight:700">Assinado</span>'
          : '<span style="font-size:.7rem;background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:8px;font-weight:700">Pendente</span>';
        return `<tr style="background:${assinado ? (i%2===0?'#f0fdf4':'#fff') : (i%2===0?'#fffbeb':'#fff')}">
          <td style="${tdS};font-weight:600">${nome}</td>
          <td style="${tdS}">${statusBadge}</td>
          <td style="${tdS}">${dt}</td>
          <td style="${tdS};text-align:center">
            <button onclick="gerarContratoServicos('${c.uid}','${c.hash||''}')"
              style="background:#1f4e79;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:.72rem;cursor:pointer">
              <i class="fas fa-file-contract"></i> Ver
            </button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  } catch(e) {
    el.innerHTML = '<p style="color:#dc2626;font-size:.84rem">Erro ao carregar contratos.</p>';
  }
}

window.gerarPdfExportDocs = async function () {
  const empresa = document.getElementById('exp-docs-empresa').value.trim();
  if (!empresa) { toast('Informe o nome da empresa solicitante.','error'); return; }

  const tecsSelecionados = [...document.querySelectorAll('.exp-doc-tec:checked')].map(c => c.value);
  if (tecsSelecionados.length === 0) { toast('Selecione pelo menos um técnico.','error'); return; }

  const tiposSelecionados = [...document.querySelectorAll('.exp-doc-tipo:checked')].map(c => c.value);
  if (tiposSelecionados.length === 0) { toast('Selecione pelo menos um tipo de documento.','error'); return; }

  toast('Gerando PDF...','success');

  // Coleta dados de todos os técnicos selecionados
  const dadosTecs = [];
  for (const uid of tecsSelecionados) {
    const u = usersCache[uid] || {};
    let docs = {};
    try { const s = await db.ref(`seguranca/${uid}/documentos`).once('value'); docs = s.val() || {}; } catch(_){}
    const docsIncluidos = [];
    for (const tipo of tiposSelecionados) {
      const d = docs[tipo];
      const info = SEG_DOC_TIPOS[tipo];
      const st = d?.validade ? _segStatusDoc(d.validade) : null;
      docsIncluidos.push({
        tipo, nome: info.nome, descricao: info.descricao,
        temDoc: !!d, validade: d?.validade || null,
        status: st ? st.texto : 'Não enviado',
        statusCor: st ? st.cor : '#94a3b8',
        arquivo: d?.arquivo || null,
        nomeArquivo: d?.nomeArquivo || null
      });
    }
    dadosTecs.push({uid, nome: u.name||uid, nivel: u.nivel||'V1', empresa: u.empresa || {}, docs: docsIncluidos});
  }

  const hoje = new Date();
  const dataFormatada = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;

  // Gera HTML para impressão como PDF
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      @page{size:A4;margin:20mm 15mm}
      body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1e293b;line-height:1.5}
      .capa{text-align:center;padding-top:80px;page-break-after:always}
      .capa h1{font-size:22pt;color:#1e40af;margin-bottom:8px}
      .capa h2{font-size:14pt;color:#475569;font-weight:400;margin-bottom:40px}
      .capa .info{font-size:11pt;color:#64748b;margin-top:30px}
      .capa .info strong{color:#1e293b}
      .tec-header{background:#1e40af;color:#fff;padding:12px 18px;border-radius:8px 8px 0 0;font-size:13pt;font-weight:700;page-break-before:always}
      .tec-header:first-of-type{page-break-before:auto}
      .tec-info{background:#f1f5f9;padding:12px 18px;border:1px solid #e2e8f0;margin-bottom:16px;font-size:10pt}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10pt}
      th{background:#f1f5f9;text-align:left;padding:8px 10px;border:1px solid #e2e8f0;font-weight:700}
      td{padding:8px 10px;border:1px solid #e2e8f0}
      .status-ok{color:#059669;font-weight:600}
      .status-warn{color:#d97706;font-weight:600}
      .status-bad{color:#dc2626;font-weight:600}
      .status-na{color:#94a3b8}
      .doc-img{max-width:100%;max-height:700px;margin:10px 0;border:1px solid #e2e8f0;border-radius:4px}
      .footer{text-align:center;font-size:8pt;color:#94a3b8;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:8px}
      @media print{.no-print{display:none}}
    </style></head><body>`;

  // -- Capa --
  html += `<div class="capa">
    <h1>Documentos de Segurança</h1>
    <h2>Prestadores de Serviços</h2>
    <div style="width:80px;height:4px;background:#1e40af;margin:30px auto"></div>
    <div class="info" style="margin-top:50px">
      <p><strong>Empresa Solicitante:</strong> ${empresa}</p>
      <p><strong>Data de Emissão:</strong> ${dataFormatada}</p>
      <p><strong>Quantidade de Prestadores:</strong> ${dadosTecs.length}</p>
      <p><strong>Documentos Incluídos:</strong> ${tiposSelecionados.map(t=>SEG_DOC_TIPOS[t].nome).join(', ')}</p>
    </div>
    <div style="margin-top:60px;font-size:10pt;color:#94a3b8">
      <p>Emitido por: ${currentUser?.name || 'Gestão'} — J. A. Logística & Transportes</p>
    </div>
  </div>`;

  // -- Índice --
  html += `<div style="page-break-after:always">
    <h2 style="color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:6px;margin-bottom:16px">Índice de Prestadores</h2>
    <table><thead><tr><th>#</th><th>Prestador</th><th>CNPJ / Razão Social</th><th>Documentos</th></tr></thead><tbody>`;
  dadosTecs.forEach((t,i) => {
    const docsOk = t.docs.filter(d=>d.temDoc).length;
    html += `<tr><td>${i+1}</td><td><strong>${t.nome}</strong></td><td>${t.empresa.razaoSocial||'—'}<br><small>${t.empresa.cnpj||''}</small></td><td>${docsOk}/${t.docs.length}</td></tr>`;
  });
  html += '</tbody></table></div>';

  // -- Detalhe de cada técnico --
  dadosTecs.forEach((tec, idx) => {
    html += `<div class="tec-header">${idx+1}. ${tec.nome}</div>`;
    html += `<div class="tec-info">`;
    if (tec.empresa.razaoSocial) html += `<strong>Razão Social:</strong> ${tec.empresa.razaoSocial}<br>`;
    if (tec.empresa.cnpj) html += `<strong>CNPJ:</strong> ${tec.empresa.cnpj}<br>`;
    if (tec.empresa.endereco) html += `<strong>Endereço:</strong> ${tec.empresa.endereco}<br>`;
    if (tec.empresa.telefone) html += `<strong>Telefone:</strong> ${tec.empresa.telefone}`;
    html += `</div>`;

    html += `<table><thead><tr><th>Documento</th><th>Status</th><th>Validade</th><th>Arquivo</th></tr></thead><tbody>`;
    tec.docs.forEach(d => {
      const stClass = d.statusCor==='#059669'?'status-ok':d.statusCor==='#d97706'?'status-warn':d.statusCor==='#dc2626'?'status-bad':'status-na';
      const valFormatada = d.validade ? new Date(d.validade+'T00:00:00').toLocaleDateString('pt-BR') : '—';
      html += `<tr><td><strong>${d.nome}</strong></td><td class="${stClass}">${d.status}</td><td>${valFormatada}</td><td>${d.temDoc?'✔ Anexado':'✖ Não enviado'}</td></tr>`;
    });
    html += '</tbody></table>';

    // Inclui imagens dos documentos (apenas JPG/PNG)
    tec.docs.forEach(d => {
      if (d.arquivo && d.arquivo.startsWith('data:image')) {
        html += `<div style="margin-bottom:16px"><p style="font-weight:700;font-size:10pt;color:#475569;margin-bottom:6px">${d.nome} — ${tec.nome}</p><img class="doc-img" src="${d.arquivo}"></div>`;
      } else if (d.arquivo && d.arquivo.startsWith('data:application/pdf')) {
        html += `<div style="margin-bottom:16px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"><p style="font-weight:700;font-size:10pt;color:#475569"><i>📄 ${d.nome}</i> — Arquivo PDF: ${d.nomeArquivo||'documento.pdf'}</p><p style="font-size:9pt;color:#94a3b8">Arquivo PDF não pode ser visualizado inline. Documento disponível no sistema.</p></div>`;
      }
    });
  });

  // -- Rodapé --
  html += `<div class="footer">
    <p>Documento gerado automaticamente pelo sistema Solução de Rua — J. A. Logística & Transportes</p>
    <p>${dataFormatada} — Este documento tem caráter informativo e não substitui os originais.</p>
  </div>`;

  html += `<div class="no-print" style="text-align:center;margin:30px 0">
    <button onclick="window.print()" style="background:#1e40af;color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:.9rem;font-weight:700;cursor:pointer">
      <i class="fas fa-print" style="margin-right:6px"></i> Imprimir / Salvar como PDF
    </button>
  </div></body></html>`;

  // Abre em nova aba para impressão
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
  else toast('Pop-up bloqueado. Permita pop-ups para gerar o PDF.','error');
}

