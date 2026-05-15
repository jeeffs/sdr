// src/admin/exportar.js
// Exportação XLSX, relatórios e botões de exportação
// Extraído de admin.html — Fase C

function getExportRecords(){
  const de=document.getElementById('exp-de').value;
  const ate=document.getElementById('exp-ate').value;
  const cidade=document.getElementById('exp-cidade').value;
  let base=_isAdmin(currentUser)?allRecords:filteredRecords();
  return base.filter(r=>{
    if(de&&r.data<de)return false;
    if(ate&&r.data>ate)return false;
    if(cidade&&r.cidade!==cidade)return false;
    return true;
  });
}

function _fmtXlsxData(d) {
  if (!d) return '';
  const p = d.split('-');
  if (p.length !== 3) return d;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function _applyStyle(cell, style) {
  const cs = {};
  if (style.font)      cs.font      = style.font;
  if (style.fill)      cs.fill      = style.fill;
  if (style.alignment) cs.alignment = style.alignment;
  if (style.border)    cs.border    = style.border;
  if (style.numFmt)    cs.numFmt    = style.numFmt;
  cell.style = cs;
}

function _fillXlsxWS(ws, recs, priceMap) {
  ws.columns = _XLS_COL_PX.map(px => ({ width: Math.round(px / 7) }));
  const nCols  = _XLS_HDRS.length;
  const numIdx = new Set([6,7,9,10,12,13,15,16,18,19,20]);
  const qtdIdx = new Set([6,9,12,15,18]);
  // OS importadas: valores históricos fixos (sv.valor = total do serviço, r.total = total da OS)
  // OS manuais:    sv.valor = preço unitário → recalcular com priceMap se disponível
  const _svTotal = (r, sv) => r.importado
    ? (Number(sv.valor)||0)                                    // importada: sv.valor JÁ é o total histórico
    : (sv.total !== undefined                                  // manual: sv.total preferido
        ? sv.total
        : (Number(sv.qtd)||0) * (Number(sv.valor)||0));       // manual legada sem sv.total

  const _calcR = (r) => r.importado
    ? (r.total || (r.servicos||[]).reduce((s,sv)=>s+(Number(sv.valor)||0),0))
    : priceMap
        ? (r.servicos||[]).reduce((s,sv)=>s+(Number(sv.qtd)||0)*(priceMap[sv.tipo]||Number(sv.valor)||0),0)
        : (r.total || (r.servicos||[]).reduce((s,sv)=>s+_svTotal(r,sv),0));

  // Ordena por data ascendente (menor → maior), como veio na importação
  const sorted = [...recs].sort((a, b) => (a.data||'').localeCompare(b.data||''));

  const totalGeral = sorted.reduce((s,r) => s + _calcR(r), 0);

  // Linha 1 – Total Geral
  const r1 = ws.addRow(Array(nCols).fill(''));
  r1.height = 20;
  for (let c=1; c<=nCols-3; c++) _applyStyle(r1.getCell(c), { font:{name:'Calibri',size:10} });
  r1.getCell(nCols-2).value = 'TOTAL GERAL:';
  _applyStyle(r1.getCell(nCols-2), _xlsxStyleGrayLabel());
  ws.mergeCells(1, nCols-2, 1, nCols-1);
  r1.getCell(nCols).value = totalGeral;
  _applyStyle(r1.getCell(nCols), _xlsxStyleOrangeM());

  // Linha 2 – Cabeçalhos
  const r2 = ws.addRow(_XLS_HDRS);
  r2.height = 22;
  for (let c=1; c<=nCols; c++) _applyStyle(r2.getCell(c), _xlsxStyleH('center'));

  // Linha 3 – Vazia
  const r3 = ws.addRow(Array(nCols).fill(''));
  r3.height = 5;
  for (let c=1; c<=nCols; c++) _applyStyle(r3.getCell(c), _xlsxStyleD());
  ws.views = [{ state:'frozen', ySplit:2 }];

  // Dados — ordenados por data
  sorted.forEach(r => {
    const cells = [_fmtXlsxData(r.data), r.profile||'', r.cidade||'', r.referencia||'', r.cto_ceo||''];
    for (let i=0; i<5; i++) {
      const s = r.servicos?.[i];
      const qtd = s?.qtd!==undefined&&s?.qtd!==''?Number(s.qtd)||0:'';
      // VALOR N = total do serviço
      // Importada: sv.valor é o total histórico gravado na importação
      // Manual com priceMap: qtd × preço_tabela (ou sv.valor se tipo não está no map)
      // Manual sem priceMap: sv.total ou qtd × sv.valor
      const valor = s?.tipo && qtd!==''
        ? (r.importado
            ? (Number(s.valor)||0)
            : priceMap
                ? (priceMap[s.tipo]||0) * (Number(s.qtd)||0)
                : _svTotal(r, s))
        : '';
      cells.push(s?.tipo||'', qtd, valor);
    }
    const tot = _calcR(r);
    cells.push(tot > 0 ? tot : '');
    const row = ws.addRow(cells);
    cells.forEach((_, ci) => {
      const cell = row.getCell(ci+1);
      if (ci === nCols-1 && cells[ci] !== '') {
        _applyStyle(cell, _xlsxStyleTotalCol());
      } else if (numIdx.has(ci) && cells[ci] !== '') {
        _applyStyle(cell, qtdIdx.has(ci) ? _xlsxStyleQ() : _xlsxStyleM());
      } else {
        _applyStyle(cell, _xlsxStyleD());
      }
    });
  });
}

async function _buildXlsxTecnico(recs, priceMap=null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ServicoDeRua';
  _fillXlsxWS(wb.addWorksheet('base'), recs, priceMap);
  return wb.xlsx.writeBuffer();
}

function _calcTotalV3(r) {
  // OS importadas: usar total histórico gravado — nunca recalcular
  if (r.importado) return r.total || (r.servicos||[]).reduce((s,sv)=>s+(Number(sv.valor)||0),0);
  return (r.servicos||[]).reduce((s, sv) => {
    if (sv.valorV3 !== undefined) return s + sv.valorV3;
    const preco = precosV3map[sv.tipo] || 0;
    const qtd   = Number(sv.qtd) || 0;
    return s + preco * qtd;
  }, 0);
}

async function _buildXlsxGeral(recs) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ServicoDeRua';
  const ws = wb.addWorksheet('base');

  ws.columns = _XLS_COL_PX_GERAL.map(px => ({ width: Math.round(px / 7) }));

  const nCols   = _XLS_HDRS_GERAL.length;
  const numIdx  = new Set([7,8,10,11,13,14,16,17,19,20,21]);
  const qtdIdx  = new Set([7,10,13,16,19]);
  const totalGeral = recs.reduce((s,r) => s + _calcTotalV3(r), 0);

  // Linha 1 – Total Geral
  const r1 = ws.addRow(Array(nCols).fill(''));
  r1.height = 20;
  // Células 1 a nCols-3: sem fundo
  for (let c=1; c<=nCols-3; c++) _applyStyle(r1.getCell(c), { font:{name:'Calibri',size:10} });
  // Mescla nCols-2 com nCols-1 → célula mestre = nCols-2 (valor vai aqui!)
  r1.getCell(nCols-2).value = 'TOTAL GERAL:';
  _applyStyle(r1.getCell(nCols-2), _xlsxStyleGrayLabel());
  ws.mergeCells(1, nCols-2, 1, nCols-1);
  // Valor total (laranja claro + moeda)
  r1.getCell(nCols).value = totalGeral;
  _applyStyle(r1.getCell(nCols), _xlsxStyleOrangeM());

  // Linha 2 – Cabeçalhos (azul escuro)
  const r2 = ws.addRow(_XLS_HDRS_GERAL);
  r2.height = 22;
  for (let c=1; c<=nCols; c++) _applyStyle(r2.getCell(c), _xlsxStyleH('center'));

  // Linha 3 – Vazia
  const r3 = ws.addRow(Array(nCols).fill(''));
  r3.height = 5;
  for (let c=1; c<=nCols; c++) _applyStyle(r3.getCell(c), _xlsxStyleD());

  ws.views = [{ state:'frozen', ySplit:2 }];

  // Agrupar por técnico, cada grupo ordenado por data ascendente
  const grupos = {};
  recs.forEach(r => {
    const k = r.userName||'—';
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(r);
  });

  Object.entries(grupos).forEach(([tec, grp]) => {
    // Ordena por data ascendente dentro de cada grupo
    const grpSorted = [...grp].sort((a, b) => (a.data||'').localeCompare(b.data||''));
    grpSorted.forEach(r => {
      const cells = [tec, _fmtXlsxData(r.data), r.profile||'', r.cidade||'', r.referencia||'', r.cto_ceo||''];
      for (let i=0; i<5; i++) {
        const s = r.servicos?.[i];
        const qtd = s?.qtd!==undefined&&s?.qtd!==''?Number(s.qtd)||0:'';
        // VALOR N = total do serviço
        // Importada: sv.valor é o total histórico | Manual: qtd × preço_V3
        const valorV3 = s?.tipo && qtd!==''
          ? (r.importado ? (Number(s.valor)||0) : (precosV3map[s.tipo]||0) * (Number(s.qtd)||0))
          : '';
        cells.push(s?.tipo||'', qtd, valorV3);
      }
      const totalV3 = _calcTotalV3(r);
      cells.push(totalV3 > 0 ? totalV3 : '');
      const row = ws.addRow(cells);
      cells.forEach((_, ci) => {
        const cell = row.getCell(ci+1);
        if (ci === nCols-1 && cells[ci] !== '') {
          _applyStyle(cell, _xlsxStyleTotalCol());
        } else if (numIdx.has(ci) && cells[ci] !== '') {
          _applyStyle(cell, qtdIdx.has(ci) ? _xlsxStyleQ() : _xlsxStyleM());
        } else {
          _applyStyle(cell, _xlsxStyleD());
        }
      });
    });
  });

  return wb.xlsx.writeBuffer();
}

async function _downloadXlsx(buffer, filename) {
  const blob = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = _createBlobUrl(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  // Fase5: Blob gerenciado por _createBlobUrl
}

async function _gerarArquivosPorGrupo(records, onDone) {
  const grupos = {};
  records.forEach(r => {
    const chave = `${r.userName||'Prestador'}||${r.profile||''}||${r.tipo||''}`;
    if (!grupos[chave]) grupos[chave] = {userName:r.userName||'Prestador', profile:r.profile||'', tipo:r.tipo||'', recs:[]};
    grupos[chave].recs.push(r);
  });
  const lista = Object.values(grupos);
  if (!lista.length) { toast('Nenhum registro encontrado!','error'); return; }
  for (let i=0; i<lista.length; i++) {
    const g = lista[i];
    try {
      const buf = await _buildXlsxTecnico(g.recs);
      await _downloadXlsx(buf, `${g.userName} ${g.profile} ${g.tipo}.xlsx`);
      await new Promise(res => setTimeout(res, 600));
    } catch(e) { toast('Erro ao gerar planilha: ' + e.message, 'error'); }
  }
  if (onDone) onDone(lista.length);
}

function exportarTecnico(uid) {
  const de = document.getElementById('exp-de').value;
  const ate = document.getElementById('exp-ate').value;
  const cidade = document.getElementById('exp-cidade').value;
  const recs = allRecords.filter(r => {
    if (r.userId !== uid) return false;
    if (de && r.data < de) return false;
    if (ate && r.data > ate) return false;
    if (cidade && r.cidade !== cidade) return false;
    return true;
  });
  if (!recs.length) { toast('Nenhum registro para este técnico!','error'); return; }
  const nome = recs[0].userName;
  toast(`Gerando planilha(s) de ${nome}...`,'success');
  _gerarArquivosPorGrupo(recs, n => toast(`${n} arquivo(s) de ${nome} gerado(s)!`,'success'));
}

function atualizarTecsMes() {
  const mes = document.getElementById('exp-mes').value;
  const ano = document.getElementById('exp-ano').value;
  _expReset('exp-tec-step','exp-profile-step','exp-tipo-step','exp-nivel-step');
  if (!mes || !ano) return;

  const prefixo = `${ano}-${mes}`;
  const tecs = Object.entries(usersCache)
    .filter(([,u]) => !_isAdmin(u) && u.name)
    .sort(([a],[b]) => (parseInt(a.replace(/\D/g,''))||0) - (parseInt(b.replace(/\D/g,''))||0));

  const sel = document.getElementById('exp-tec-sel');
  const temQualquer = allRecords.some(r => (r.data||'').startsWith(prefixo));
  sel.innerHTML = '<option value="">-- Selecione o técnico --</option>' +
    `<option value="__todos__" ${temQualquer?'':'disabled'}>★ Todos os Prestadores</option>` +
    tecs.map(([uid, u]) => {
      const tem = allRecords.some(r => r.userId === uid && (r.data||'').startsWith(prefixo));
      return `<option value="${uid}" ${tem?'':'disabled style="color:#aaa"'}>${u.name}${tem?'':' (sem registros)'}</option>`;
    }).join('');
  document.getElementById('exp-tec-step').style.display = 'block';
}

function _setExpBtn(id, ativo, onclick) {
  const b = document.getElementById(id);
  if (!b) return;
  b.style.opacity = ativo ? '1' : '.25';
  b.style.cursor  = ativo ? 'pointer' : 'not-allowed';
  b.onclick = ativo ? onclick : null;
}

function atualizarProfileStep() {
  _expReset('exp-profile-step','exp-tipo-step','exp-nivel-step');
  const uid = document.getElementById('exp-tec-sel').value;
  if (!uid) return;
  const mes = document.getElementById('exp-mes').value;
  const ano = document.getElementById('exp-ano').value;
  const prefixo = `${ano}-${mes}`;
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();
  const masterUids = new Set(Object.entries(usersCache).filter(([,u])=>_isAdmin(u)||_isFiscal(u)||_isObservador(u)).map(([id])=>id));

  // Para "Todos": verifica registros de qualquer prestador (exclui admin/fiscal/observador); para individual: filtra por uid
  const _recBase = r => uid==='__todos__'
    ? !masterUids.has(r.userId||'')
    : r.userId===uid;

  const temMatriz = allRecords.some(r => _recBase(r) && (r.data||'').startsWith(prefixo) && _n(r.profile)==='MATRIZ');
  const temFilial = allRecords.some(r => _recBase(r) && (r.data||'').startsWith(prefixo) && _n(r.profile)==='FILIAL');

  _setExpBtn('btn-exp-matriz', temMatriz, () => selecionarProfile('MATRIZ'));
  _setExpBtn('btn-exp-filial', temFilial, () => selecionarProfile('FILIAL'));
  delete document.getElementById('exp-profile-step').dataset.sel;
  document.getElementById('exp-profile-step').style.display = 'block';
}

function selecionarProfile(profile) {
  const uid = document.getElementById('exp-tec-sel').value;
  const mes = document.getElementById('exp-mes').value;
  const ano = document.getElementById('exp-ano').value;
  const prefixo = `${ano}-${mes}`;
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();

  // Destaca o profile selecionado (sem desativar o outro, apenas escurece)
  document.getElementById('btn-exp-matriz').style.opacity = profile==='MATRIZ' ? '1' : '.25';
  document.getElementById('btn-exp-filial').style.opacity = profile==='FILIAL' ? '1' : '.25';
  document.getElementById('exp-profile-step').dataset.sel = profile;

  // Verifica quais tipos têm registros para este perfil (todos os técnicos se "__todos__")
  const masterUidsP = new Set(Object.entries(usersCache).filter(([,u])=>_isAdmin(u)||_isFiscal(u)||_isObservador(u)).map(([id])=>id));
  const _recBaseP = r => uid==='__todos__' ? !masterUidsP.has(r.userId||'') : r.userId===uid;
  const temProjeto = allRecords.some(r => _recBaseP(r) && (r.data||'').startsWith(prefixo) && _n(r.profile)===profile && _n(r.tipo)==='PROJETO');
  const temManut   = allRecords.some(r => _recBaseP(r) && (r.data||'').startsWith(prefixo) && _n(r.profile)===profile && _n(r.tipo)==='MANUTENÇÃO');

  _setExpBtn('btn-exp-projeto', temProjeto, () => selecionarTipo('PROJETO'));
  _setExpBtn('btn-exp-manut',   temManut,   () => selecionarTipo('MANUTENÇÃO'));
  delete document.getElementById('exp-tipo-step').dataset.sel;
  _expReset('exp-nivel-step');
  document.getElementById('exp-tipo-step').style.display = 'block';
}

function selecionarTipo(tipo) {
  document.getElementById('btn-exp-projeto').style.opacity = tipo==='PROJETO'    ? '1' : '.25';
  document.getElementById('btn-exp-manut').style.opacity   = tipo==='MANUTENÇÃO' ? '1' : '.25';
  document.getElementById('exp-tipo-step').dataset.sel = tipo;
  // V3 disponível apenas para master
  _setExpBtn('btn-exp-v1', true, () => exportarMesNivel('V1'));
  _setExpBtn('btn-exp-v2', true, () => exportarMesNivel('V2'));
  _setExpBtn('btn-exp-v3', _isAdmin(currentUser), () => exportarMesNivel('V3'));
  document.getElementById('exp-nivel-step').style.display = 'block';
}

async function exportarMesNivel(nivel) {
  // Apenas master pode gerar planilhas V3
  if (nivel === 'V3' && !_isAdmin(currentUser)) {
    toast('Acesso negado — planilhas Admin são exclusivas do master.', 'error'); return;
  }
  const mes     = document.getElementById('exp-mes').value;
  const ano     = document.getElementById('exp-ano').value;
  const uid     = document.getElementById('exp-tec-sel').value;
  const profile = document.getElementById('exp-profile-step').dataset.sel;
  const tipo    = document.getElementById('exp-tipo-step').dataset.sel;
  const cidade  = document.getElementById('exp-cidade').value;
  if (!mes || !ano || !uid || !profile || !tipo) { toast('Preencha todos os campos!', 'error'); return; }

  const prefixo = `${ano}-${mes}`;
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();
  const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mesNome = MESES[parseInt(mes)] || mes;

  if (uid === '__todos__') {
    // Planilha geral: todos os prestadores, filtrado por profile + tipo (mesmo formato da Geral Unificada)
    const masterUidsE = new Set(Object.entries(usersCache).filter(([,u])=>_isAdmin(u)||_isFiscal(u)||_isObservador(u)).map(([id])=>id));
    const recs = allRecords.filter(r => {
      if (masterUidsE.has(r.userId||'')) return false;
      if (!(r.data||'').startsWith(prefixo)) return false;
      if (_n(r.profile) !== _n(profile)) return false;
      if (_n(r.tipo) !== _n(tipo)) return false;
      if (cidade && r.cidade !== cidade) return false;
      // Não exclui registros importados V3 — Jefferson usa este tipo e deve entrar na geral
      return true;
    });
    if (!recs.length) { toast(`Nenhum registro para ${profile} ${tipo} em ${mes}/${ano}!`, 'error'); return; }
    toast(`Gerando todos os prestadores — ${profile} ${tipo} — ${mesNome}/${ano} — ${nivel}...`, 'success');
    try {
      const buf = await _buildXlsxGeral(recs);
      await _downloadXlsx(buf, `GERAL ${profile} ${tipo}.xlsx`);
      toast(`✔ GERAL ${profile} ${tipo} | ${mesNome}/${ano} gerado!`, 'success');
    } catch(e) { toast('Erro: ' + e.message, 'error'); }
    return;
  }

  // Planilha individual (técnico específico)
  const pm = nivel==='V3' ? precosV3map : nivel==='V2' ? precosV2map : precosV1map;
  const recs = allRecords.filter(r => {
    if (r.userId !== uid) return false;
    if (!(r.data||'').startsWith(prefixo)) return false;
    if (_n(r.profile) !== _n(profile)) return false;
    if (_n(r.tipo) !== _n(tipo)) return false;
    if (cidade && r.cidade !== cidade) return false;
    return true;
  });
  if (!recs.length) { toast(`Nenhum registro para ${profile} ${tipo} em ${mes}/${ano}!`, 'error'); return; }

  const nome = usersCache[uid]?.name || uid;
  toast(`Gerando ${nome} — ${profile} ${tipo} — ${mesNome}/${ano} — ${nivel}...`, 'success');
  try {
    const buf  = await _buildXlsxTecnico(recs, pm);
    const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    const _url = _createBlobUrl(blob);
    a.href = _url;
    a.download = `${nome}_${profile}_${tipo}_${mesNome}${ano}_${nivel}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    // URL gerenciada por _createBlobUrl/_revokeAllBlobs — não revogar antes do download terminar
    toast(`✔ ${nome} | ${profile} ${tipo} | ${mesNome}/${ano} | ${nivel} gerado!`, 'success');
  } catch(e) { toast('Erro: ' + e.message, 'error'); }
}

async function enviarRelatorioWhatsApp(uid, mesAno) {
  // Gera e envia WhatsApp SEM abrir janela de relatorio
  // Calcula tudo inline (evita popup do exportarCardTecnico)
  const u = usersCache[uid] || {};
  const nome = u.name || uid;
  const MESES_PT = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [y, m] = mesAno.split('-').map(Number);
  const mesLabel = `${MESES_PT[m-1]} ${y}`;
  const fmtV = v => 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

  // ── Detecta fiscal (V0) e calcula totais ──────────────────────────────────
  const _isFiscalUser = _isFiscal(u);

  // Registros do mes (apenas para tecnicos; fiscal nao tem OS)
  const recs = _isFiscalUser ? [] : allRecords.filter(r =>
    r.userId === uid &&
    (r.data||'').startsWith(mesAno) &&
    !(r.importado && (r.nivelImp||'V1')==='V3')
  );

  let totalBruto;
  if (_isFiscalUser) {
    totalBruto = window.SALARIO_V0 || 3000;
  } else {
    totalBruto = recs.reduce((s,r) => s + (r.total || 0), 0);
  }

  // Descontos ativos no mes (igual logica de exportarCardTecnico)
  const descontosMes = Object.values(descontosCache).filter(d => {
    if (d.uid !== uid) return false;
    const tot = Number(d.parcelas)||1;
    const [yi,mi] = (d.parcelaInicio||d.mesAno||'').split('-').map(Number);
    if (!yi) return false;
    const [ya,ma] = mesAno.split('-').map(Number);
    const diff = (ya-yi)*12+(ma-mi)+1;
    return diff >= 1 && diff <= tot;
  });
  const totalDesc = descontosMes.reduce((s,d) => s + +(d.valor/((Number(d.parcelas)||1))).toFixed(2), 0);
  const totalLiq  = totalBruto - totalDesc;

  // ── Gera codigo do relatorio e salva no Firebase ──────────────────────────
  const _rndHex = () => Math.random().toString(16).slice(2, 6).toUpperCase();
  const codigoRel = `RSP-${mesAno}-${(nome||'X').slice(0,3).toUpperCase()}-${_rndHex()}`;
  const linkUpload = `https://solucaoderua.web.app?relatorio=${codigoRel}`;
  try {
    await _dbSet('relatorios/' + codigoRel, {
      codigo: codigoRel, uid, nomePrestador: nome, mesAno,
      valorTotal: totalBruto, totalDescontos: totalDesc, valorLiquido: totalLiq,
      totalOS: recs.length,
      geradoEm: new Date().toISOString(),
      geradoPor: currentUser?.id||'master', geradoPorNome: currentUser?.name||'Master',
      status: 'enviado', linkUpload
    });
  } catch(e) { console.warn('[enviarRelatorioWhatsApp] Firebase:', e.message); }

  // ── Monta mensagem WhatsApp ───────────────────────────────────────────────
  const titulo = _isFiscalUser ? 'Honorarios de Gestao' : 'Relatorio de Servicos Prestados';
  const linhaValor = _isFiscalUser
    ? `Honorarios brutos: ${fmtV(totalBruto)}`
    : `Total bruto: ${fmtV(totalBruto)}\nOS executadas: ${recs.length}`;
  const linhaLiq = totalDesc > 0 ? `\nDescontos: -${fmtV(totalDesc)}\nValor liquido: ${fmtV(totalLiq)}` : '';

  const msg = `*${titulo}*\n\nPrestador: ${nome}\nPeriodo: ${mesLabel}\n${linhaValor}${linhaLiq}\n\n*Instrucoes:*\n1. Confira o PDF anexado\n2. Assine via assinador.iti.br (Gov.br Prata/Ouro)\n3. Clique no link abaixo para enviar o PDF assinado:\n${linkUpload}\nCodigo: ${codigoRel}\n\nSolucao de Rua`;

  const tel = _getTelefone(uid);
  // window.open direto — sem setTimeout para evitar bloqueio pelo navegador
  window.open(tel ? _whatsUrl(tel, msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function renderBotoesTecnicos() {
  if (!_isAdmin(currentUser)) return;
  const wrap = document.getElementById('exp-por-tecnico');
  if (!wrap) return;
  wrap.style.display = 'block';

  // Popular dropdown de anos a partir dos registros existentes
  const anos = [...new Set(allRecords.map(r => (r.data||'').slice(0,4)).filter(a => a.length===4))].sort().reverse();
  const selAno = document.getElementById('exp-ano');
  if (selAno) {
    const atual = selAno.value;
    selAno.innerHTML = '<option value="">-- Selecione --</option>' +
      anos.map(a => `<option value="${a}" ${a===atual?'selected':''}>${a}</option>`).join('');
  }

  // Resetar passos ao recarregar
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
    // Fiscal (V0) não lança OS — esconde seção de planilhas Excel
    if (_isFiscal(currentUser)) {
      if (propWrap) propWrap.style.display = 'none';
      if (master)   master.style.display   = 'none';
      return;
    }
    if (propWrap) propWrap.style.display = 'block';
    if (master)   master.style.display   = 'none';
    // Monta botões para mês atual e mês anterior
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

async function renderRelatoriosAssinados() {
  const sec = document.getElementById('sec-relatorios-assinados');
  const lista = document.getElementById('relatorios-assinados-lista');
  if (!sec || !lista || !_isAdmin(currentUser)) return;
  sec.style.display = 'block';

  try {
    const snap = await db.ref('relatorios').once('value');
    const rels = snap.val() || {};
    const items = Object.values(rels).sort((a,b) => (b.geradoEm||'').localeCompare(a.geradoEm||''));
    const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    if (items.length === 0) {
      lista.innerHTML = '<div style="color:#94a3b8;font-size:.82rem">Nenhum relatorio gerado ainda.</div>';
      return;
    }

    const assinados = items.filter(r => r.status === 'assinado');
    const enviados = items.filter(r => r.status === 'enviado');
    const aprovados = items.filter(r => r.status === 'aprovado');

    let html = '';

    // Pendentes de aprovacao
    if (assinados.length > 0) {
      html += `<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;padding:12px;margin-bottom:12px;animation:pulse 2s infinite">
        <div style="font-weight:700;color:#92400e;margin-bottom:8px"><i class="fas fa-clock"></i> ${assinados.length} relatorio(s) aguardando aprovacao</div>`;
      assinados.forEach(r => {
        const [ry,rm] = (r.mesAno||'').split('-').map(Number);
        html += `<div style="background:#fff;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid #f59e0b">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div>
              <div style="font-weight:700;font-size:.88rem">${r.nomePrestador||r.uid}</div>
              <div style="font-size:.75rem;color:#64748b">${MESES_PT[rm-1]||''}/${ry} — ${r.codigo}</div>
              <div style="font-size:.75rem;color:#64748b">Recebido: ${r.recebidoEm ? new Date(r.recebidoEm).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
            <div style="font-weight:700;color:#1f4e79;font-size:.9rem">R$ ${Number(r.valorTotal||0).toFixed(2).replace('.',',')}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" style="background:#dbeafe;color:#1d4ed8" onclick="_verRelatorioAssinado('${r.codigo}')"><i class="fas fa-eye"></i> Ver PDF</button>
            <button class="btn btn-sm" style="background:#d1fae5;color:#065f46" onclick="_aprovarRelatorio('${r.codigo}')"><i class="fas fa-check"></i> Aprovar</button>
            <button class="btn btn-sm" style="background:#fee2e2;color:#dc2626" onclick="_rejeitarRelatorio('${r.codigo}')"><i class="fas fa-times"></i> Rejeitar</button>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    // Enviados (aguardando assinatura do prestador)
    if (enviados.length > 0) {
      html += `<div style="margin-bottom:12px"><div style="font-size:.78rem;font-weight:600;color:#d97706;margin-bottom:6px"><i class="fas fa-paper-plane"></i> Enviados (aguardando assinatura): ${enviados.length}</div>`;
      enviados.forEach(r => {
        const [ry,rm] = (r.mesAno||'').split('-').map(Number);
        html += `<div style="background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:3px;font-size:.78rem;display:flex;justify-content:space-between;align-items:center">
          <span>${r.nomePrestador||r.uid} — ${MESES_PT[rm-1]||''}/${ry}</span>
          <span style="color:#d97706;font-size:.72rem">${r.geradoEm ? new Date(r.geradoEm).toLocaleDateString('pt-BR') : ''}</span>
        </div>`;
      });
      html += '</div>';
    }

    // Aprovados (ultimos 10)
    if (aprovados.length > 0) {
      html += `<details style="margin-bottom:8px"><summary style="font-size:.78rem;font-weight:600;color:#065f46;cursor:pointer"><i class="fas fa-check-circle"></i> Aprovados: ${aprovados.length}</summary>`;
      aprovados.slice(0,10).forEach(r => {
        const [ry,rm] = (r.mesAno||'').split('-').map(Number);
        html += `<div style="background:#d1fae5;border-radius:6px;padding:6px 10px;margin-bottom:3px;font-size:.78rem;display:flex;justify-content:space-between;align-items:center">
          <span>${r.nomePrestador||r.uid} — ${MESES_PT[rm-1]||''}/${ry}</span>
          <span style="color:#065f46;font-size:.72rem">${r.aprovadoEm ? new Date(r.aprovadoEm).toLocaleDateString('pt-BR') : ''}</span>
        </div>`;
      });
      html += '</details>';
    }

    if (!html) html = '<div style="color:#94a3b8;font-size:.82rem">Nenhum relatorio pendente.</div>';
    lista.innerHTML = html;
  } catch(e) {
    console.error('[renderRelatoriosAssinados]', e);
    lista.innerHTML = '<div style="color:#dc2626;font-size:.82rem">Erro ao carregar relatorios.</div>';
  }
}

async function _verRelatorioAssinado(codigo) {
  try {
    const snap = await db.ref('relatorios/' + codigo).once('value');
    const rel = snap.val();
    if (!rel || !rel.pdfAssinado) { toast('PDF assinado nao encontrado.', 'error'); return; }
    const modal = document.createElement('div');
    modal.id = 'modal-ver-rel-assinado';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `<div style="background:#fff;border-radius:12px;max-width:90vw;max-height:90vh;width:100%;display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${rel.nomePrestador||''} — Relatorio Assinado</div>
          <div style="font-size:.78rem;color:#64748b">${codigo} | Recebido: ${rel.recebidoEm ? new Date(rel.recebidoEm).toLocaleDateString('pt-BR') : '—'}</div>
          <div style="font-size:.78rem;color:#065f46">Assinatura Gov.br: Score ${rel.assinaturaScore||'?'}/10</div>
        </div>
        <button onclick="this.closest('#modal-ver-rel-assinado').remove()" style="background:none;border:none;font-size:1.3rem;cursor:pointer">&times;</button>
      </div>
      <div style="flex:1;overflow:auto;padding:10px;background:#f1f5f9">
        <iframe src="${rel.pdfAssinado}" style="width:100%;height:80vh;border:none;border-radius:6px"></iframe>
      </div>
    </div>`;
    document.body.appendChild(modal);
  } catch(e) { toast('Erro ao carregar PDF.', 'error'); }
}

async function _aprovarRelatorio(codigo) {
  if (!confirm('Aprovar este relatorio assinado?')) return;
  try {
    await _dbUpdate('relatorios/' + codigo, {
      status: 'aprovado',
      aprovadoEm: new Date().toISOString(),
      aprovadoPor: currentUser?.id || 'master',
      aprovadoPorNome: currentUser?.name || 'Master'
    });
    toast('Relatorio aprovado!', 'success');
    renderRelatoriosAssinados();
  } catch(e) { toast('Erro ao aprovar.', 'error'); }
}

async function _rejeitarRelatorio(codigo) {
  const motivo = prompt('Motivo da rejeicao:');
  if (motivo === null) return;
  try {
    const snap = await db.ref('relatorios/' + codigo).once('value');
    const rel = snap.val();
    await _dbUpdate('relatorios/' + codigo, {
      status: 'enviado',
      pdfAssinado: null,
      recebidoEm: null,
      rejeitadoEm: new Date().toISOString(),
      motivoRejeicao: motivo || 'Sem motivo'
    });
    toast('Relatorio rejeitado. Prestador devera reassinar.', 'success');
    // Notifica via WhatsApp
    if (rel && rel.uid) {
      const tel = _getTelefone(rel.uid);
      const msg = `*Relatorio Rejeitado*\n\nCodigo: ${codigo}\nMotivo: ${motivo || 'Sem motivo'}\n\nPor favor, assine novamente e reenvie pelo link:\n${rel.linkUpload || 'https://solucaoderua.web.app'}`;
      if (confirm('Notificar prestador via WhatsApp?')) {
        window.open(tel ? _whatsUrl(tel, msg) : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
    }
    renderRelatoriosAssinados();
  } catch(e) { toast('Erro ao rejeitar.', 'error'); }
}

async function corrigirPrecosDoMes() {
  const btn = document.getElementById('btn-corrigir-precos');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...'; }

  const hoje    = new Date();
  const prefixo = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  const dataBR  = hoje.toLocaleDateString('pt-BR');

  // Apenas OS lançadas manualmente (Salvar OS) — registros importados têm valores históricos fixos
  const osDoMes = allRecords.filter(r => (r.data||'').startsWith(prefixo) && !r.importado);

  let corrigidos = 0;
  const relatorio = []; // { cod, tec, nivel, itens:[{tipo, de, para}] }

  for (const r of osDoMes) {
    const uid     = r.userId || '';
    const userObj = usersCache[uid];
    // Pula master/V3: eles têm tabela própria e não são afetados pela regra V2→V1
    if (!userObj || _isAdmin(userObj) || _isV3Import(userObj)) continue;

    const nivel = userObj.nivel || 'V1'; // 'V1' ou 'V2'
    let hasError = false;
    const itens  = [];

    const servicosCorrigidos = (r.servicos || []).map(sv => {
      const precoCorreto = precosV1map[sv.tipo];
      if (precoCorreto === undefined || precoCorreto === null) return sv; // serviço desconhecido
      const precoAtual = Number(sv.valor);
      if (precoAtual !== precoCorreto) {
        hasError = true;
        const qtd = Number(sv.qtd) || 0;
        itens.push({ tipo: sv.tipo, de: precoAtual, para: precoCorreto });
        return { ...sv, valor: precoCorreto, total: qtd * precoCorreto };
      }
      return sv;
    });

    if (!hasError) continue;

    // CORRIGIDO: sv.total pode estar ausente em OS manuais antigas → usar qtd × valor
    const novoTotal = servicosCorrigidos.reduce((s, sv) => s + (Number(sv.qtd)||0) * (Number(sv.valor)||0), 0);
    const detalheItens = itens.map(x =>
      `${x.tipo}: R$ ${x.de.toFixed(2).replace('.',',')} → R$ ${x.para.toFixed(2).replace('.',',')}`
    ).join(' | ');
    const nota = `[${dataBR}] Preço corrigido automaticamente — tabela V1 aplicada (técnico ${nivel}). Ajuste(s): ${detalheItens}.`;

    await _dbUpdate(`os/${r.fbKey}`, {
      servicos:      servicosCorrigidos,
      total:         novoTotal,
      nota_correcao: nota
    });

    // Atualiza cache local imediatamente
    const idx = allRecords.findIndex(x => x.fbKey === r.fbKey);
    if (idx >= 0) {
      allRecords[idx].servicos      = servicosCorrigidos;
      allRecords[idx].total         = novoTotal;
      allRecords[idx].nota_correcao = nota;
    }

    relatorio.push({ cod: r.codigo_os || r.fbKey, tec: r.userName || uid, nivel, itens });
    corrigidos++;
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Verificar e Corrigir Preços'; }

  // Exibe resultado
  const resDiv = document.getElementById('correcao-resultado');
  if (!resDiv) return;

  if (corrigidos === 0) {
    resDiv.innerHTML = `<div style="padding:12px 16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #16a34a;font-size:.85rem;color:#15803d">
      <i class="fas fa-check-circle"></i> <b>Nenhuma divergência encontrada</b> — todos os preços do mês de
      ${hoje.toLocaleString('pt-BR',{month:'long'})} estão corretos.
    </div>`;
    return;
  }

  const linhas = relatorio.map(x => {
    const det = x.itens.map(i =>
      `<span style="display:inline-block;background:#fef3c7;border-radius:4px;padding:1px 6px;font-size:.78rem;margin:2px">
        ${i.tipo}: <s style="color:#dc2626">R$ ${i.de.toFixed(2).replace('.',',')}</s>
        → <b style="color:#16a34a">R$ ${i.para.toFixed(2).replace('.',',')}</b>
      </span>`
    ).join(' ');
    return `<tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:7px 10px;font-size:.82rem"><b>${x.cod}</b></td>
      <td style="padding:7px 10px;font-size:.82rem">${x.tec}</td>
      <td style="padding:7px 10px">${det}</td>
    </tr>`;
  }).join('');

  resDiv.innerHTML = `
    <div style="padding:10px 14px;background:#fff7ed;border-radius:8px;border-left:4px solid #f59e0b;margin-bottom:12px;font-size:.85rem;color:#92400e">
      <i class="fas fa-tools"></i> <b>${corrigidos} OS corrigida(s)</b> no mês atual. Uma nota foi adicionada ao detalhe de cada OS.
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.82rem">
        <thead style="background:#1f4e79;color:#fff">
          <tr>
            <th style="padding:8px 10px;text-align:left">OS</th>
            <th style="padding:8px 10px;text-align:left">Prestador</th>
            <th style="padding:8px 10px;text-align:left">Correções</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  // Atualiza tabela de registros se estiver visível
  if (document.getElementById('page-registros')?.classList.contains('active')) filtrarTabela();
}

function exportarTecnicoMes(uid, mesAno) {
  // Preenche os campos de data do filtro e chama exportarTecnico
  const de  = document.getElementById('exp-de');
  const ate = document.getElementById('exp-ate');
  const [y, m] = mesAno.split('-');
  // Último dia do mês
  const ultimo = new Date(Number(y), Number(m), 0).getDate();
  if (de)  de.value  = `${mesAno}-01`;
  if (ate) ate.value = `${mesAno}-${String(ultimo).padStart(2,'0')}`;
  exportarTecnico(uid);
}

function _expReset(...ids) { ids.forEach(id => { const el = document.getElementById(id); if(el) el.style.display='none'; }); }

// ── Expor funções como globals para o admin.html (tree-shaking fix) ──
window.getExportRecords = getExportRecords;
window._fmtXlsxData = _fmtXlsxData;
window._applyStyle = _applyStyle;
window._fillXlsxWS = _fillXlsxWS;
window._buildXlsxTecnico = _buildXlsxTecnico;
window._calcTotalV3 = _calcTotalV3;
window._buildXlsxGeral = _buildXlsxGeral;
window._downloadXlsx = _downloadXlsx;
window._gerarArquivosPorGrupo = _gerarArquivosPorGrupo;
window.exportarTecnico = exportarTecnico;
window.atualizarTecsMes = atualizarTecsMes;
window._setExpBtn = _setExpBtn;
window.atualizarProfileStep = atualizarProfileStep;
window.selecionarProfile = selecionarProfile;
window.selecionarTipo = selecionarTipo;
window.exportarMesNivel = exportarMesNivel;
window.enviarRelatorioWhatsApp = enviarRelatorioWhatsApp;
window.renderBotoesTecnicos = renderBotoesTecnicos;
window.renderBotaoTecnicoProprio = renderBotaoTecnicoProprio;
window.renderRelatoriosAssinados = renderRelatoriosAssinados;
window._verRelatorioAssinado = _verRelatorioAssinado;
window._aprovarRelatorio = _aprovarRelatorio;
window._rejeitarRelatorio = _rejeitarRelatorio;
window.corrigirPrecosDoMes = corrigirPrecosDoMes;
window.exportarTecnicoMes = exportarTecnicoMes;
window._expReset = _expReset;