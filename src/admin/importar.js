// src/admin/importar.js
// Importação de planilhas, preview, execução, apagar
// Extraído de admin.html — Fase D

function _parsearNomeArquivo(nome, relativePath) {
  // Remove extensão e normaliza separadores (hífen, underscore → espaço)
  const base = nome.replace(/\.(xlsx|xlsm)$/i, '')
                   .replace(/[-_]+/g, ' ')
                   .toUpperCase().trim();
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase()
                          .replace(/[ÀÁÂÃÄ]/g,'A').replace(/[ÈÉÊË]/g,'E')
                          .replace(/[ÌÍÎÏ]/g,'I').replace(/[ÒÓÔÕÖ]/g,'O')
                          .replace(/[ÙÚÛÜ]/g,'U').replace(/Ç/g,'C');

  // Palavras a ignorar ao extrair o nome do técnico
  const PROFILES  = ['MATRIZ','FILIAL'];
  const MESES_PT  = new Set([
    'JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO',
    'JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ',
  ]);
  const STOP_WORDS = new Set([
    'PLANILHA','TABELA','VALORES','RELATORIO','SERVICOS',
    'TERCEIROS','PRESTADORES','DADOS','ARQUIVO','CONTROLE','RESUMO',
  ]);

  let profile = '', tipo = '';
  const palavras = base.split(/\s+/).filter(Boolean);
  let pIdx = -1, tIdx = -1, vIdx = -1;

  palavras.forEach((p, i) => {
    const pn = _n(p);
    if (PROFILES.includes(pn)) pIdx = i;
    if (pn.includes('MANUT') || pn.includes('MANU')) tIdx = i;
    if (pn === 'PROJETO') tIdx = i;
    if (pn.includes('INSTALA')) tIdx = i;
    if (/^V[123]$/i.test(p)) vIdx = i;
  });

  if (pIdx >= 0) { profile = palavras[pIdx]; }
  if (tIdx >= 0) tipo = palavras[tIdx].normalize('NFC');
  if (!profile) profile = 'FILIAL';
  if (!tipo)    tipo = 'MANUTENÇÃO';

  if (tipo.toUpperCase().replace(/Ã/g,'A').includes('MANUT')) tipo = 'MANUTENÇÃO';
  else tipo = 'PROJETO';

  const nivelNome = vIdx >= 0 ? palavras[vIdx].toUpperCase() : null;

  // Extrai nome do técnico: palavras antes do profile, sem meses/stopwords/números/separadores
  const skip = new Set([pIdx, tIdx, vIdx].filter(i => i >= 0));
  const candidatos = (pIdx >= 0 ? palavras.slice(0, pIdx) : palavras)
    .filter((p, i) => {
      if (skip.has(i)) return false;
      const pn = _n(p);
      if (!p || p === '-') return false;
      if (/^\d+$/.test(p)) return false;            // números puros (anos, meses)
      if (MESES_PT.has(pn)) return false;           // nomes de mês
      if (STOP_WORDS.has(pn)) return false;         // palavras genéricas
      return true;
    });

  let nomeTec = candidatos.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  // Fallback: se não encontrou nome no arquivo, tenta extrair dos segmentos da pasta
  // Ex: "JANEIRO/V3/CAIO FILIAL.xlsx" → segmento "CAIO FILIAL" → extrai "Caio"
  // Ex: "2025/V2/CAIO/PLANILHA.xlsx" → segmento "CAIO" → extrai "Caio"
  if (!nomeTec && relativePath) {
    const segs = relativePath.split(/[\/\\]/).slice(0, -1); // ignora o próprio arquivo
    for (const seg of segs.reverse()) { // percorre do mais próximo para o mais distante
      const segBase = seg.replace(/[-_]+/g, ' ').trim().toUpperCase();
      if (!segBase) continue;
      const pn = _n(segBase);
      // Ignora segmentos que sejam apenas mês, ano, nível ou stopword
      if (MESES_PT.has(pn)) continue;
      if (/^V[123]$/.test(pn)) continue;
      if (/^\d{4}$/.test(pn)) continue;
      if (STOP_WORDS.has(pn)) continue;
      if (PROFILES.includes(pn)) continue;
      // Extrai o nome do segmento da pasta usando a mesma lógica do arquivo
      const { nomeTec: nSeg } = _parsearNomeArquivo(seg + '.xlsx');
      if (nSeg && nSeg !== seg) { nomeTec = nSeg; break; }
      // Se o segmento em si parece um nome válido (≥3 letras, sem números), usa direto
      if (/^[A-ZÁÉÍÓÚÀÂÊÔÃÇÜ ]+$/i.test(segBase) && segBase.length >= 3) {
        nomeTec = segBase.charAt(0).toUpperCase() + segBase.slice(1).toLowerCase();
        break;
      }
    }
  }

  return { nomeTec: nomeTec || base, profile: profile.toUpperCase(), tipo, nivelNome };
}

function _detectarNivelPath(relativePath, fileName) {
  const _testNivel = src => {
    const s = (src || '').toUpperCase();
    // Segmento exatamente igual a V3/V2/V1 (como palavra isolada no caminho)
    if (/(?:^|[\/\\\s_\-])V3(?:[\/\\\s_\-.]|$)/.test(s)) return 'V3';
    if (/(?:^|[\/\\\s_\-])V2(?:[\/\\\s_\-.]|$)/.test(s)) return 'V2';
    if (/(?:^|[\/\\\s_\-])V1(?:[\/\\\s_\-.]|$)/.test(s)) return 'V1';
    return null;
  };

  // ── 1ª prioridade: segmentos de PASTA (exclui o próprio nome do arquivo) ──
  if (relativePath) {
    const partes = relativePath.split(/[\/\\]/);
    const pastas = partes.slice(0, -1); // remove o último elemento (arquivo)
    for (const pasta of pastas) {
      const nivel = _testNivel(pasta);
      if (nivel) return nivel;
    }
  }

  // ── 2ª prioridade: nome do arquivo ──
  if (fileName) {
    const nivel = _testNivel(fileName.replace(/\.(xlsx|xlsm)$/i, ''));
    if (nivel) return nivel;
  }

  return null; // não detectado — prossegue para comparação por preços
}

function _detectarNivelPorPrecos(dpMap) {
  if (!dpMap || !Object.keys(dpMap).length) return null;
  const maps = { V1: precosV1map, V2: precosV2map, V3: precosV3map, V4: precosV4map };
  const scores = { V1: 0, V2: 0, V3: 0, V4: 0 };
  for (const [servico, preco] of Object.entries(dpMap)) {
    if (!preco) continue;
    // Normaliza o nome do serviço para encontrar no mapa do sistema
    const sNorm = _normServico(servico);
    for (const nv of ['V1','V2','V3']) {
      // Tenta pelo nome original e pelo normalizado
      const ref = maps[nv]?.[servico] ?? maps[nv]?.[sNorm];
      if (ref !== undefined && Math.abs(Number(ref) - Number(preco)) < 0.01) scores[nv]++;
    }
  }
  // Nível vencedor: maior pontuação, com mínimo de 2 serviços coincidentes
  const best = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
  if (best && best[1] >= 2) return best[0];
  return null;
}

function _detectarMesAnoPath(relativePath) {
  if (!relativePath) return null;
  const parts = relativePath.split(/[\/\\]/);
  let ano = '', mes = '';
  for (const p of parts) {
    if (/^\d{4}$/.test(p) && +p >= 2020 && +p <= 2099) ano = p;
    if (/^(0[1-9]|1[0-2])$/.test(p)) mes = p;
    const m = p.match(/^(\d{4})[-_](\d{2})$/);
    if (m) { ano = m[1]; mes = m[2]; }
  }
  if (ano && mes) return `${ano}-${mes}`;
  return null;
}

function _matchUser(nomeTec, fullFileName, relativePath) {
  // Normaliza removendo acentos para comparação robusta
  const _nu = s => (s||'').normalize('NFC').toUpperCase()
    .replace(/[ÀÁÂÃÄ]/g,'A').replace(/[ÈÉÊË]/g,'E').replace(/[ÌÍÎÏ]/g,'I')
    .replace(/[ÒÓÔÕÖ]/g,'O').replace(/[ÙÚÛÜ]/g,'U').replace(/Ç/g,'C').trim();

  const nTec  = _nu(nomeTec);
  // Versão limpa do nome do arquivo (sem extensão, separadores viram espaço)
  const nFull = fullFileName
    ? _nu(fullFileName.replace(/\.(xlsx|xlsm)$/i,'').replace(/[-_]+/g,' '))
    : '';
  // Segmentos de pasta do caminho relativo (ex: "JANEIRO/V3/CAIO FILIAL.xlsx" → ["JANEIRO","V3","CAIO FILIAL"])
  // Cada segmento é normalizado e limpo para busca
  const pathSegs = relativePath
    ? relativePath.split(/[\/\\]/)
        .map(s => _nu(s.replace(/\.(xlsx|xlsm)$/i,'').replace(/[-_]+/g,' ').trim()))
        .filter(s => s && !/^(V[123]|JANEIRO|FEVEREIRO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO|JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|\d{4}|\d{2})$/.test(s))
    : [];
  // Todas as "fontes" a pesquisar: nome extraído, nome completo do arquivo, segmentos de pasta
  const fontes = [nTec, nFull, ...pathSegs].filter(Boolean);

  const users = Object.entries(usersCache).filter(([,u]) => u.ativo !== false);

  // Passagem 1 — correspondência exata em qualquer fonte
  for (const [uid, u] of users) {
    const uN = _nu(u.name);
    for (const f of fontes) {
      if (uN === f) return uid;
    }
  }

  // Passagem 2 — prefixo (um começa com o outro) em qualquer fonte
  for (const [uid, u] of users) {
    const uN = _nu(u.name);
    if (!uN) continue;
    for (const f of fontes) {
      if (f.startsWith(uN) || uN.startsWith(f)) return uid;
    }
  }

  if (!fontes.some(Boolean)) return null;

  // Passagem 3 — nome completo do usuário aparece como palavras em qualquer fonte
  for (const [uid, u] of users) {
    const uN = _nu(u.name);
    if (!uN) continue;
    const pattern = new RegExp('(^|\\s)' + uN.replace(/\s+/g, '\\s+') + '(\\s|$)');
    for (const f of fontes) {
      if (pattern.test(f)) return uid;
    }
  }

  // Passagem 4 — primeiro nome do usuário (≥4 letras) aparece como palavra em qualquer fonte
  for (const [uid, u] of users) {
    const firstName = _nu(u.name).split(/\s+/)[0];
    if (firstName.length < 4) continue;
    const pattern = new RegExp('(^|\\s)' + firstName + '(\\s|$)');
    for (const f of fontes) {
      if (pattern.test(f)) return uid;
    }
  }

  return null;
}

async function _carregarValoresPlanilha() {
  try {
    _valoresPlanilhaCache = await _dbRead('config/valoresPlanilha', {});
  } catch(e) { console.warn('[valoresPlanilha] load error', e.message); }
}

function _getValorPlanilha(uid, mesAno, profile, tipo) {
  const key = `${(profile||'').toUpperCase()}_${(tipo||'').toUpperCase()}`;
  const raw = _valoresPlanilhaCache?.[uid]?.[mesAno]?.[key] ?? null;
  if (raw === null) return null;
  // Suporta formato antigo (número puro) e novo ({valor, descricao})
  if (typeof raw === 'object' && raw !== null) return raw;
  return { valor: raw, descricao: '' };
}

async function _salvarValorPlanilha(uid, mesAno, profile, tipo, valor, descricao) {
  const key = `${(profile||'').toUpperCase()}_${(tipo||'').toUpperCase()}`;
  const path = `config/valoresPlanilha/${uid}/${mesAno}/${key}`;
  const numVal = parseFloat(String(valor).replace(/[^\d.,-]/g,'').replace(',','.')) || 0;
  const obj = { valor: numVal, descricao: (descricao || '').trim() };
  await _dbSet(path, obj);
  if (!_valoresPlanilhaCache[uid]) _valoresPlanilhaCache[uid] = {};
  if (!_valoresPlanilhaCache[uid][mesAno]) _valoresPlanilhaCache[uid][mesAno] = {};
  _valoresPlanilhaCache[uid][mesAno][key] = obj;
  toast(`Valor planilha salvo: R$ ${numVal.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, 'success');
}

function _toggleValorPlanilhaEdit(rowId) {
  const panel = document.getElementById('vp-panel-' + rowId);
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function _salvarVPFromPanel(rowId) {
  const panel = document.getElementById('vp-panel-' + rowId);
  if (!panel) return;
  const uid = panel.dataset.uid;
  const mesAno = panel.dataset.mesano;
  const profile = panel.dataset.profile;
  const tipo = panel.dataset.tipo;
  const inputValor = document.getElementById('vp-val-' + rowId);
  const inputDesc = document.getElementById('vp-desc-' + rowId);
  if (!inputValor) return;
  await _salvarValorPlanilha(uid, mesAno, profile, tipo, inputValor.value, inputDesc ? inputDesc.value : '');
}

async function renderImportarPage() {
  const wrap = document.getElementById('imp-consulta');
  if (!wrap) return;
  const fmt  = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const _n   = s => (s||'').normalize('NFC').trim().toUpperCase();
  const nivelBadge = n => {
    const c = n==='V3'?'#7c3aed':n==='V2'?'#ea580c':'#16a34a';
    return `<span style="background:${c};color:#fff;font-size:.68rem;font-weight:700;padding:1px 7px;border-radius:10px;margin-left:4px">${n||'V1'}</span>`;
  };

  // Carrega valores originais das planilhas (se houver)
  await _carregarValoresPlanilha();

  const importados = allRecords.filter(r => r.importado);
  if (!importados.length) {
    wrap.innerHTML = `<p style="color:var(--muted);font-size:.85rem">Nenhuma planilha importada ainda.</p>`;
    return;
  }

  // Totais por nível (resumo rápido no topo)
  const totaisNivel = {V1:0, V2:0, V3:0};
  const osNivel     = {V1:0, V2:0, V3:0};
  importados.forEach(r => {
    const nv = r.nivelImp || 'V1';
    totaisNivel[nv] = (totaisNivel[nv]||0) + (r.total||0);
    osNivel[nv]     = (osNivel[nv]||0) + 1;
  });

  // Agrupa por técnico → nível → mês/ano → profile / tipo
  const tree = {};
  importados.forEach(r => {
    const tec   = r.userName || r.userId || '—';
    const nv    = r.nivelImp || 'V3';
    const mesAno= (r.data||'').slice(0,7);
    const combo = `${_n(r.profile)} / ${_n(r.tipo)}`;
    if (!tree[tec]) tree[tec] = {};
    if (!tree[tec][nv]) tree[tec][nv] = {};
    if (!tree[tec][nv][mesAno]) tree[tec][nv][mesAno] = {};
    if (!tree[tec][nv][mesAno][combo]) tree[tec][nv][mesAno][combo] = { os:0, total:0, profile: r.profile||'', tipo: r.tipo||'', uid: r.userId||'' };
    tree[tec][nv][mesAno][combo].os++;
    tree[tec][nv][mesAno][combo].total += r.total || 0;
  });

  const MESES = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
                 '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
  const thS = 'padding:8px 12px;font-size:.78rem;font-weight:700;text-align:left;white-space:nowrap';
  const tdS = 'padding:7px 12px;font-size:.82rem;border-bottom:1px solid #e5e7eb';
  const NIVEIS = ['V1','V2','V3'];
  const nivelLabel = {V1:'Prestador',V2:'PRESTADOR',V3:'Admin'};
  const nivelBg    = {V1:'#dcfce7',V2:'#ffedd5',V3:'#ede9fe'};
  const nivelTxt   = {V1:'#16a34a',V2:'#ea580c',V3:'#7c3aed'};

  let html = '';
  for (const [tec, niveis] of Object.entries(tree).sort()) {
    const totalTec = Object.values(niveis).flatMap(nv=>Object.values(nv).flatMap(m=>Object.values(m))).reduce((s,v)=>s+v.total,0);
    const osTec    = Object.values(niveis).flatMap(nv=>Object.values(nv).flatMap(m=>Object.values(m))).reduce((s,v)=>s+v.os,0);
    let nivelBlocks = '';
    for (const nv of NIVEIS) {
      if (!niveis[nv]) continue;
      const totalNv = Object.values(niveis[nv]).flatMap(m=>Object.values(m)).reduce((s,v)=>s+v.total,0);
      const osNv    = Object.values(niveis[nv]).flatMap(m=>Object.values(m)).reduce((s,v)=>s+v.os,0);
      let mesRows = '';
      for (const [mesAno, combos] of Object.entries(niveis[nv]).sort()) {
        const [ano, mes] = mesAno.split('-');
        const label = `${MESES[mes]||mes}/${ano}`;
        const osMonth    = Object.values(combos).reduce((s,v)=>s+v.os,0);
        const totalMonth = Object.values(combos).reduce((s,v)=>s+v.total,0);
        // Encontra o userId deste grupo (todos os registros do grupo têm o mesmo userId)
        const uid = importados.find(r =>
          (r.userName||r.userId||'—') === tec && (r.data||'').startsWith(mesAno)
        )?.userId || '';
        const esc  = s => s.replace(/'/g,"\\'");
        // Linha de cabeçalho do mês com botão de apagar todo o mês
        mesRows += `<tr style="background:#fef9f0;border-top:2px solid #fed7aa">
          <td colspan="5" style="${tdS};font-weight:700;color:#92400e;font-size:.81rem">
            <i class="fas fa-calendar-alt" style="margin-right:5px"></i>${label}
            <span style="font-weight:400;color:#b45309;margin-left:8px">${osMonth} OS · <span class="money-val">${fmt(totalMonth)}</span></span>
          </td>
          <td style="${tdS};text-align:right">
            <button onclick="confirmarApagarGrupo('${esc(uid)}','${esc(tec)}','${mesAno}')"
              style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 10px;
                     cursor:pointer;font-size:.73rem;font-weight:600;white-space:nowrap">
              <i class="fas fa-trash-alt"></i> Apagar mês
            </button>
          </td>
        </tr>`;
        for (const [combo, dados] of Object.entries(combos)) {
          const vpObj = _getValorPlanilha(dados.uid || uid, mesAno, dados.profile, dados.tipo);
          const vpValor = vpObj !== null ? vpObj.valor : null;
          const vpDesc = vpObj !== null ? (vpObj.descricao || '') : '';
          const vpDisplay = vpValor !== null ? vpValor.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
          const vpId = `vp_${(dados.uid||uid)}_${mesAno}_${_n(dados.profile)}_${_n(dados.tipo)}`.replace(/[^a-zA-Z0-9_]/g,'');
          const diffClass = vpValor !== null && Math.abs(vpValor - dados.total) > 0.01;
          const hasVP = vpValor !== null;
          // Ícone do botão: lápis se não tem VP, warning se tem divergência, check se OK
          const btnIcon = !hasVP ? 'fa-pen' : (diffClass ? 'fa-exclamation-triangle' : 'fa-check-circle');
          const btnColor = !hasVP ? '#64748b' : (diffClass ? '#d97706' : '#16a34a');
          const btnBg = !hasVP ? '#f1f5f9' : (diffClass ? '#fffbeb' : '#f0fdf4');
          const btnTitle = !hasVP ? 'Informar valor da planilha' : (diffClass ? `Divergência: Plan.=${fmt(vpValor)} vs Real=${fmt(dados.total)}` : 'Valores conferem');
          mesRows += `<tr>
            <td style="${tdS};padding-left:22px;color:var(--muted);font-size:.78rem">${label}</td>
            <td style="${tdS}">${combo}</td>
            <td style="${tdS};text-align:center">${dados.os}</td>
            <td style="${tdS};text-align:right;color:${nivelTxt[nv]};font-weight:600;white-space:nowrap">
              ${hasVP && diffClass ? `<span class="money-val" style="font-size:.7rem;color:#d97706;text-decoration:line-through;margin-right:4px">${fmt(vpValor)}</span>` : ''}
              <span class="money-val">${fmt(dados.total)}</span>
            </td>
            <td style="${tdS};text-align:center;width:40px">
              <button onclick="_toggleValorPlanilhaEdit('${vpId}')"
                title="${btnTitle}"
                style="background:${btnBg};color:${btnColor};border:1px solid ${btnColor}44;border-radius:5px;padding:3px 7px;
                       cursor:pointer;font-size:.7rem;line-height:1">
                <i class="fas ${btnIcon}"></i>
              </button>
            </td>
            <td style="${tdS};text-align:right">
              <button onclick="confirmarApagarPlanilha('${esc(uid)}','${esc(tec)}','${mesAno}','${esc(dados.profile)}','${esc(dados.tipo)}')"
                style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:5px;padding:3px 8px;
                       cursor:pointer;font-size:.7rem;font-weight:600;white-space:nowrap">
                <i class="fas fa-file-excel"></i> Apagar planilha
              </button>
            </td>
          </tr>
          <tr id="vp-panel-${vpId}" style="display:none" data-uid="${dados.uid||uid}" data-mesano="${mesAno}" data-profile="${dados.profile||''}" data-tipo="${dados.tipo||''}">
            <td colspan="6" style="padding:8px 16px 12px 30px;background:#fefce8;border-bottom:2px solid #fde68a">
              <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
                <div style="flex:0 0 auto">
                  <label style="font-size:.72rem;font-weight:600;color:#92400e;display:block;margin-bottom:2px">Valor Planilha (R$)</label>
                  <input id="vp-val-${vpId}" type="text" value="${vpDisplay}"
                    placeholder="${fmt(dados.total)}"
                    style="width:120px;text-align:right;font-size:.82rem;padding:5px 8px;border:1px solid #d97706;border-radius:5px;
                           background:#fff;color:#92400e;font-weight:700"
                  />
                </div>
                <div style="flex:1;min-width:200px">
                  <label style="font-size:.72rem;font-weight:600;color:#92400e;display:block;margin-bottom:2px">Descrição do erro</label>
                  <input id="vp-desc-${vpId}" type="text" value="${vpDesc.replace(/"/g,'&quot;')}"
                    placeholder="Ex: Planilha original tinha erro de cálculo..."
                    style="width:100%;font-size:.8rem;padding:5px 8px;border:1px solid #d97706;border-radius:5px;
                           background:#fff;color:#78350f"
                  />
                </div>
                <div style="flex:0 0 auto;padding-top:16px">
                  <button onclick="_salvarVPFromPanel('${vpId}')"
                    style="background:#d97706;color:#fff;border:none;border-radius:6px;padding:6px 14px;
                           cursor:pointer;font-size:.78rem;font-weight:600;white-space:nowrap">
                    <i class="fas fa-save"></i> Salvar
                  </button>
                </div>
              </div>
              ${vpDesc ? `<div style="margin-top:6px;font-size:.75rem;color:#92400e;font-style:italic"><i class="fas fa-info-circle"></i> ${vpDesc}</div>` : ''}
            </td>
          </tr>`;
        }
      }
      nivelBlocks += `
        <div style="margin:0 0 8px 0;border-radius:8px;overflow:hidden;border:1px solid ${nivelTxt[nv]}33">
          <div style="background:${nivelBg[nv]};padding:7px 14px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:.82rem;color:${nivelTxt[nv]}">${nivelLabel[nv]}</span>
            <span style="font-size:.78rem;color:${nivelTxt[nv]}">${osNv} OS · <span class="money-val">${fmt(totalNv)}</span></span>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead style="background:#fafafa">
              <tr>
                <th style="${thS}">Mês/Ano</th>
                <th style="${thS}">Profile / Tipo</th>
                <th style="${thS};text-align:center">OS</th>
                <th style="${thS};text-align:right">Valor</th>
                <th style="${thS};text-align:center;width:40px" title="Valor Planilha / Erro"><i class="fas fa-edit" style="color:#64748b"></i></th>
                <th style="${thS}"></th>
              </tr>
            </thead>
            <tbody>${mesRows}</tbody>
          </table>
        </div>`;
    }
    html += `
      <div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#1f4e79;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <span style="font-weight:700;font-size:.88rem"><i class="fas fa-hard-hat" style="margin-right:6px"></i>${tec}</span>
          <span style="font-size:.8rem;background:rgba(255,255,255,.15);padding:3px 10px;border-radius:12px">${osTec} OS · <span class="money-val">${fmt(totalTec)}</span></span>
        </div>
        <div style="padding:10px 12px">${nivelBlocks}</div>
      </div>`;
  }

  // Resumo por nível no topo
  const resumoNivel = NIVEIS.filter(nv=>osNivel[nv]>0).map(nv =>
    `<div style="flex:1;min-width:140px;background:${nivelBg[nv]};border:1px solid ${nivelTxt[nv]}44;border-radius:10px;padding:12px 16px;text-align:center">
      <div style="font-size:.72rem;font-weight:700;color:${nivelTxt[nv]};text-transform:uppercase;margin-bottom:4px">${nivelLabel[nv]}</div>
      <div class="money-val" style="font-size:1.1rem;font-weight:800;color:${nivelTxt[nv]}">${fmt(totaisNivel[nv])}</div>
      <div style="font-size:.74rem;color:${nivelTxt[nv]}99">${osNivel[nv]} OS</div>
    </div>`
  ).join('');

  wrap.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">${resumoNivel}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <span style="font-size:.85rem;color:var(--muted)">
        <b style="color:#1f4e79">${importados.length}</b> OS importadas de
        <b style="color:#1f4e79">${Object.keys(tree).length}</b> técnico(s)
      </span>
    </div>
    ${html}`;
}

async function previewImport(files) {
  _impData = [];
  _refPrecosV2 = {};
  const wrap = document.getElementById('imp-preview');
  const acts = document.getElementById('imp-actions');
  if (!files || !files.length) { wrap.innerHTML = ''; acts.style.display='none'; return; }

  // Filtra apenas .xlsx/.xlsm e rejeita arquivos com "GERAL" no nome
  const todosExcel = Array.from(files).filter(f => /\.(xlsx|xlsm)$/i.test(f.name));
  const geralRejeitados = todosExcel.filter(f => /\bGERAL\b/i.test(f.name.replace(/\.(xlsx|xlsm)$/i,'')));
  const validFiles = todosExcel.filter(f => !/\bGERAL\b/i.test(f.name.replace(/\.(xlsx|xlsm)$/i,'')));

  if (!todosExcel.length) {
    wrap.innerHTML = `<p style="color:#dc2626;font-size:.85rem"><i class="fas fa-exclamation-circle"></i> Nenhum arquivo .xlsx ou .xlsm encontrado na seleção.</p>`;
    return;
  }

  const avisoGeral = geralRejeitados.length
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:.82rem;color:#92400e">
        <i class="fas fa-ban"></i> <b>${geralRejeitados.length} arquivo(s) rejeitado(s)</b> por conterem "GERAL" no nome (planilhas de agrupamento não são importadas):<br>
        <span style="font-size:.75rem">${geralRejeitados.map(f=>f.name).join(', ')}</span>
       </div>` : '';

  if (!validFiles.length) {
    wrap.innerHTML = avisoGeral + `<p style="color:#dc2626;font-size:.85rem"><i class="fas fa-exclamation-circle"></i> Nenhum arquivo válido restante para importar.</p>`;
    return;
  }

  wrap.innerHTML = avisoGeral + `<p style="color:var(--muted);font-size:.84rem"><i class="fas fa-spinner fa-spin"></i> Lendo ${validFiles.length} arquivo(s)... aguarde.</p>`;

  const rawEntries = []; // coleta dados brutos antes das regras de rejeição V2/V3

  // ── Processa TODOS os arquivos válidos (nível ajustável pelo dropdown) ──
  for (const file of validFiles) {
    const relativePath = file.webkitRelativePath || '';
    // Passa relativePath para que o nome do técnico seja extraído também dos segmentos de pasta
    // Ex: "JANEIRO/V3/CAIO FILIAL.xlsx" → nomeTec="Caio" mesmo que o arquivo seja genérico
    const { nomeTec, profile, tipo, nivelNome } = _parsearNomeArquivo(file.name, relativePath);
    // Nível: 1ª etapa — pasta ou nome do arquivo (V2/V3 ficam em pastas próprias)
    const nivelPath = _detectarNivelPath(relativePath, file.name);
    let nivelDet       = nivelPath || nivelNome || null; // null = ainda não determinado
    let nivelDetMetodo = nivelPath ? 'pasta' : nivelNome ? 'nome' : null; // como foi detectado
    // Mês/ano: tenta detectar do caminho da pasta
    const mesAnoPath = _detectarMesAnoPath(relativePath);
    // Passa relativePath para buscar o usuário também pelos segmentos da pasta
    const matchedUid = _matchUser(nomeTec, file.name, relativePath);
    const buf  = await file.arrayBuffer();
    const wb   = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    // ── Lê tabela de preços original da aba de_para ──
    const wsDp = wb.getWorksheet('de_para');
    const dpMap = {};
    if (wsDp) {
      wsDp.eachRow((row, ri) => {
        const nome  = (row.getCell(1).value||'').toString().replace(/\xa0/g,' ').replace(/\s+/g,' ').trim();
        const preco = Number(row.getCell(2).value) || 0;
        if (nome && preco) dpMap[nome] = preco;
      });
    }
    // 2ª etapa de detecção de nível: comparar preços da aba de_para com tabelas do sistema
    // (só executa se a 1ª etapa não determinou o nível pela pasta/nome)
    if (!nivelDet) {
      const nivelPrecos = _detectarNivelPorPrecos(dpMap);
      if (nivelPrecos) {
        nivelDet = nivelPrecos;
        nivelDetMetodo = 'precos';
      } else {
        nivelDet = 'V1';
        nivelDetMetodo = 'padrao';
      }
    }

    // Função auxiliar: resolve preço pelo nome do serviço (fuzzy match)
    const _preco = (nomeServ) => {
      if (!nomeServ) return 0;
      const limpo = nomeServ.replace(/\xa0/g,' ').trim();
      if (dpMap[limpo] !== undefined) return dpMap[limpo];
      // tenta match parcial caso haja espaços extras
      for (const [k, v] of Object.entries(dpMap)) {
        if (k.replace(/\s+/g,' ').trim() === limpo.replace(/\s+/g,' ').trim()) return v;
      }
      return 0;
    };

    // Lista todas as abas para diagnóstico
    const sheetNames = wb.worksheets.map(s => s.name);
    const ws   = wb.getWorksheet('base') || wb.getWorksheet('Base') || wb.getWorksheet('BASE') || wb.worksheets[0];
    const wsName = ws ? ws.name : '(nenhuma)';
    const dataRows = [];
    let _diagTotal = 0, _diagSemData = 0, _diagSemServ = 0;

    // ── Helper: extrai valor de célula (resolve fórmulas) ──
    const _getVal = (row, c) => {
      const v = row.getCell(c).value;
      if (v === null || v === undefined) return null;
      if (typeof v === 'object' && v !== null && 'formula' in v) return v.result ?? null;
      return v;
    };

    // ── Helper: checa se valor parece uma data ──
    const _isDateVal = v => {
      if (!v) return false;
      if (v instanceof Date) return !isNaN(v.getTime());
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return true;
      return false;
    };

    // ── Detecta layout automaticamente (CAIO vs EWERTON) ──
    // CAIO:   A=codigo/hora, B=data(Date), C=profile, D=cidade, E=ref, F=cto, G+H=svc1...
    // EWERTON: A=data(ISO str), B=profile, C=cidade, D=ref, E=cto, F+G=svc1...
    let colDate = 2; // padrão CAIO
    if (ws) {
      for (let ri = 3; ri <= 8; ri++) {
        const row = ws.getRow(ri);
        const v1 = _getVal(row, 1);
        const v2 = _getVal(row, 2);
        // CAIO: A=timestamp(Date), B=data(Date) → col B é data
        // EWERTON: A=data(ISO str), B=profile(str) → col B NÃO é data
        if (_isDateVal(v2)) { colDate = 2; break; }       // CAIO: col B é data
        if (_isDateVal(v1) && !_isDateVal(v2)) { colDate = 1; break; } // EWERTON: só col A é data
      }
    }
    // Posições derivadas do layout detectado
    const colProfile = colDate + 1; // CAIO: col C (colDate=2+1=3); EWERTON: col B (colDate=1+1=2)
    const colCidade = colDate + 2;
    const colRef    = colDate + 3;
    const colCTO    = colDate + 4;
    // Serviços começam em colCTO+1, de 3 em 3: [nome, qtd, valor(ignorado)]
    const svcPairs  = [0,1,2,3,4].map(i => [colCTO + 1 + i*3, colCTO + 2 + i*3]);

    if (ws) ws.eachRow((row, ri) => {
      if (ri < 3) return; // pula cabeçalhos
      _diagTotal++;
      const rawDate = _getVal(row, colDate);
      if (!_isDateVal(rawDate)) { _diagSemData++; return; }

      // Parse data → extrai ano/mês/dia usando UTC para evitar shift de timezone
      // ExcelJS cria Date em UTC (meia-noite). Usando getFullYear/getMonth/getDate (local),
      // timezones negativos (ex: UTC-3 Brasil) empurram a data para o dia anterior.
      let _dYear, _dMonth, _dDay;
      if (rawDate instanceof Date) {
        _dYear  = rawDate.getUTCFullYear();
        _dMonth = rawDate.getUTCMonth();
        _dDay   = rawDate.getUTCDate();
      } else {
        // String ISO como "2026-01-07T14:30:00" ou "2026-01-07"
        const m = String(rawDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) { _diagSemData++; return; }
        _dYear = +m[1]; _dMonth = +m[2]-1; _dDay = +m[3];
      }
      const datePart = new Date(_dYear, _dMonth, _dDay); // para compatibilidade
      if (isNaN(_dYear) || _dMonth < 0 || _dMonth > 11 || _dDay < 1) { _diagSemData++; return; }

      const servicos = [];
      svcPairs.forEach(([tc, qc]) => {
        const tipo_sv = (_getVal(row, tc)||'').toString().replace(/\xa0/g,' ').trim();
        const qtd     = Number(_getVal(row, qc)) || 0;
        if (tipo_sv && qtd > 0) {
          const valor = _preco(tipo_sv) * qtd;
          servicos.push({ tipo: tipo_sv, qtd, valor });
        }
      });
      if (!servicos.length) { _diagSemServ++; return; }

      // Hora: colDate=2 (CAIO) → extrai de col A (timestamp); colDate=1 (EWERTON) → da própria string
      let horaStr = '';
      if (colDate === 2) {
        const ts = _getVal(row, 1);
        if (ts instanceof Date) horaStr = `${String(ts.getUTCHours()).padStart(2,'0')}:${String(ts.getUTCMinutes()).padStart(2,'0')}`;
      } else if (typeof rawDate === 'string' && rawDate.includes('T')) {
        horaStr = rawDate.split('T')[1]?.slice(0,5) || '';
      }

      const yyyy = _dYear;
      const mm   = String(_dMonth+1).padStart(2,'0');
      const dd   = String(_dDay).padStart(2,'0');
      const dataStr = `${yyyy}-${mm}-${dd}`;
      const total   = servicos.reduce((s, sv) => s + (sv.valor||0), 0);
      dataRows.push({
        data: dataStr, hora: horaStr, profile, tipo,
        cidade:    (_getVal(row, colCidade)||'').toString().replace(/\xa0/g,' ').trim().toUpperCase(),
        referencia:(_getVal(row, colRef   )||'').toString().replace(/\xa0/g,' ').trim().toUpperCase(),
        cto_ceo:   (_getVal(row, colCTO   )||'').toString().replace(/\xa0/g,' ').trim().toUpperCase(),
        servicos, total,
      });
    });
    // Amostra da linha 3 para diagnóstico (só quando ainda não leu nada)
    let _diagSample = '';
    if (ws && _diagTotal > 0 && dataRows.length === 0) {
      try {
        const rowSample = ws.getRow(3);
        const cells = [];
        for (let c = 1; c <= 22; c++) {
          const v = rowSample.getCell(c).value;
          cells.push(`C${c}:${v===null||v===undefined?'∅':JSON.stringify(v).slice(0,20)}`);
        }
        _diagSample = `Layout detectado: col${colDate}=data, svcPairs=${JSON.stringify(svcPairs[0])}...<br>Linha 3: ${cells.join(' | ')}`;
      } catch(_e) { console.warn('[previewImport]', _e.message); }
    }
    // Detecta mês/ano predominante nos dados
    // Mês/ano: pasta tem prioridade, depois detecta pelos dados
    const mesAnoData = (() => {
      const freq = {};
      dataRows.forEach(r => { const p = r.data.slice(0,7); freq[p] = (freq[p]||0)+1; });
      return Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
    })();
    const mesAnoDetectado = mesAnoPath || mesAnoData;
    const [anoD='', mesD=''] = mesAnoDetectado ? mesAnoDetectado.split('-') : [];

    // Armazena dados brutos (sem push em _impData ainda) — a rejeição V2/V3 ocorre após o loop
    const dataObj = { fileName: file.name, nomeTec, profile, tipo, matchedUid, dataRows,
                      mesAno: mesAnoDetectado, confirmado: !!mesAnoDetectado,
                      nivel: nivelDet, nivelMetodo: nivelDetMetodo, dpMap };

    const color = matchedUid ? '#16a34a' : '#dc2626';
    const icon  = matchedUid ? 'fa-check-circle' : 'fa-exclamation-circle';
    const MESES_SEL = ['01','02','03','04','05','06','07','08','09','10','11','12']
      .map(m => `<option value="${m}" ${m===mesD?'selected':''}>${m}</option>`).join('');
    const NIVEL_SEL = ['V1','V2','V3']
      .map(v => `<option value="${v}" ${v===nivelDet?'selected':''}>${_safeNivel(v)}</option>`).join('');
    const nivelColor = nivelDet==='V3'?'#7c3aed':nivelDet==='V2'?'#ea580c':'#16a34a';
    // Tooltip explicando como o nível foi detectado
    const nivelMetodoLabel = {
      pasta:  'Detectado pela pasta',
      nome:   'Detectado pelo nome do arquivo',
      precos: 'Detectado pela tabela de preços (de_para)',
      padrao: 'Padrão Prestador (não detectado)',
    }[nivelDetMetodo] || 'Ajuste manual';
    // Badge — usa placeholder __IDX__ que será substituído após rejeição
    const nivelBadge = `<span id="imp-badge-__IDX__" style="font-size:.68rem;border-radius:4px;padding:1px 5px;margin-left:4px">…</span>`;
    const nivelMetodoIcon = nivelDetMetodo==='precos' ? '🔍' : nivelDetMetodo==='pasta' ? '📁' : nivelDetMetodo==='nome' ? '🏷️' : '⚙️';

    // Bloco de diagnóstico mostrado quando 0 OS foram lidas
    const diagBlock = dataRows.length === 0 ? `
      <tr style="background:#fff7ed;border-bottom:1px solid #fed7aa">
        <td colspan="8" style="padding:8px 14px;font-size:.78rem;color:#92400e">
          <b><i class="fas fa-search"></i> Diagnóstico:</b>
          Abas encontradas: <b>${sheetNames.join(', ')}</b> → lendo aba "<b>${wsName}</b>" |
          Linhas brutas (após linha 2): <b>${_diagTotal}</b> |
          Sem data (col B vazia): <b>${_diagSemData}</b> |
          Sem serviços (col G/J/M/P/S): <b>${_diagSemServ}</b>
          ${_diagSample ? `<br><span style="font-family:monospace;font-size:.7rem;word-break:break-all">${_diagSample}</span>` : ''}
        </td>
      </tr>` : '';

    // HTML do row usa placeholder __IDX__ (substituído após determinar o índice final)
    const rowHTMLTemplate = diagBlock + `
      <tr style="border-bottom:1px solid #e5e7eb" id="imp-row-__IDX__">
        <td style="padding:8px 10px;font-size:.78rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${relativePath||file.name}">${relativePath||file.name}</td>
        <td style="padding:8px 10px;font-size:.82rem">${nomeTec}</td>
        <td style="padding:8px 10px;font-size:.82rem">${profile}</td>
        <td style="padding:8px 10px;font-size:.82rem">${tipo}</td>
        <td style="padding:6px 8px">
          <select id="imp-nivel-__IDX__" data-niv-idx="__IDX__"
            onchange="_impData[this.dataset.nivIdx].nivel=this.value;
              const c=this.value==='V3'?'#7c3aed':this.value==='V2'?'#ea580c':'#16a34a';
              this.style.borderColor=c;this.style.color=c;
              _atualizarRefBadges();"
            title="${nivelMetodoLabel}"
            style="font-size:.8rem;padding:3px 5px;border-radius:6px;border:2px solid ${nivelColor};font-weight:700;color:${nivelColor};background:#fff;width:52px">
            ${NIVEL_SEL}
          </select>
          <span title="${nivelMetodoLabel}" style="font-size:.72rem;cursor:default">${nivelMetodoIcon}</span>
          ${nivelBadge}
        </td>
        <td style="padding:8px 10px;font-size:.82rem;color:${dataRows.length===0?'#dc2626':'inherit'}">${dataRows.length===0?'⚠️ 0':dataRows.length} OS</td>
        <td style="padding:8px 10px">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
            <select data-idx="__IDX__" onchange="_impData[this.dataset.idx].mesAno=document.getElementById('imp-ano-__IDX__').value+'-'+this.value;_impData[this.dataset.idx].confirmado=true;document.getElementById('imp-conf-__IDX__').style.display='inline'" style="font-size:.78rem;padding:3px 5px;border-radius:6px;border:1px solid #d1d5db;width:52px">
              ${MESES_SEL}
            </select>
            <input id="imp-ano-__IDX__" type="number" value="${anoD}" min="2020" max="2099"
              oninput="_impData[__IDX__].mesAno=this.value+'-'+document.querySelector('[data-idx=&quot;__IDX__&quot;]').value;_impData[__IDX__].confirmado=true;document.getElementById('imp-conf-__IDX__').style.display='inline'"
              style="width:60px;font-size:.78rem;padding:3px 5px;border-radius:6px;border:1px solid #d1d5db">
            <i id="imp-conf-__IDX__" class="fas fa-check-circle" style="color:#16a34a;display:${mesAnoDetectado?'inline':'none'}" title="Mês/ano confirmado"></i>
            <i class="fas fa-exclamation-triangle" id="imp-warn-__IDX__" style="color:#f59e0b;display:${mesAnoDetectado?'none':'inline'};font-size:.75rem" title="Informe o mês e ano"></i>
          </div>
        </td>
        <td style="padding:8px 10px">
          <select data-uid-idx="__IDX__" onchange="_impData[this.dataset.uidIdx].matchedUid=this.value" style="font-size:.8rem;padding:4px 6px;border-radius:6px;border:1px solid #d1d5db">
            <option value="">-- Selecione --</option>
            ${Object.entries(usersCache).map(([uid,u])=>`<option value="${uid}" ${uid===matchedUid?'selected':''}>${u.name}${_isAdmin(u)?' (master)':''}</option>`).join('')}
          </select>
          <i class="fas ${icon}" style="color:${color};margin-left:4px"></i>
        </td>
      </tr>`;

    rawEntries.push({ dataObj, rowHTMLTemplate });
  }

  // ── Aplica regras de rejeição V2/V3 ──
  // V2: apenas o PRIMEIRO arquivo V2 é aceito (referência de preços); demais são rejeitados
  // V3: aceito SOMENTE para usuários que NÃO possuem arquivo V1 no mesmo lote
  //     (ex: Jefferson só tem V3, os demais técnicos têm V1 → V3 deles é ignorado)
  let _v2Count = 0;
  const v2Rejeitados = [];
  const v3Rejeitados = [];

  // 1º passo: identifica quais usuários possuem arquivo V1 no lote
  const usersComV1 = new Set(
    rawEntries
      .filter(e => e.dataObj.nivel === 'V1' && e.dataObj.matchedUid)
      .map(e => e.dataObj.matchedUid)
  );

  for (const entry of rawEntries) {
    const d = entry.dataObj;
    if (d.nivel === 'V2') {
      _v2Count++;
      if (_v2Count === 1) {
        _impData.push(d);
      } else {
        v2Rejeitados.push(d);
      }
    } else if (d.nivel === 'V3') {
      // V3 aceito se: usuário identificado E (NÃO tem V1 no lote OU é Jefferson — exceção única)
      const matchedUser = d.matchedUid ? usersCache[d.matchedUid] : null;
      const permitido = d.matchedUid && (!usersComV1.has(d.matchedUid) || _isV3Import(matchedUser));
      if (permitido) {
        _impData.push(d);
      } else {
        v3Rejeitados.push(d);
      }
    } else {
      _impData.push(d); // V1 sempre aceito
    }
  }

  // ── Detecção de duplicados: rejeita arquivos cujas OS já existem no banco ──
  // Compara por: userId + tipo + cidade + cto_ceo + data + nServiços + total
  // tipo (PROJETO/MANUTENÇÃO) evita colisão entre planilhas de categorias diferentes
  // cto_ceo distingue OS com mesma cidade/data/serviço mas CTOs diferentes
  const _osFingerprint = (userId, tipo, cidade, cto, data, svs) => {
    const total = (svs||[]).reduce((s,sv) => s + Math.round((Number(sv.valor)||0) * 100), 0);
    const nSvs = (svs||[]).length;
    return `${userId}|${(tipo||'').toUpperCase()}|${(cidade||'').toUpperCase()}|${(cto||'').toUpperCase()}|${data}|${nSvs}|${total}`;
  };
  // Monta Map de fingerprints → contagem dos registros já importados no banco
  // Usa Map (não Set) para permitir OS genuinamente distintas com dados idênticos
  const _fpExistentes = new Map();
  allRecords.filter(r => r.importado === true).forEach(r => {
    const fp = _osFingerprint(r.userId, r.tipo, r.cidade, r.cto_ceo, r.data, r.servicos);
    _fpExistentes.set(fp, (_fpExistentes.get(fp)||0) + 1);
  });
  const dupRejeitados = [];
  const _impDataFiltrada = [];
  for (const d of _impData) {
    if (d.nivel === 'V2') { _impDataFiltrada.push(d); continue; }
    if (!d.matchedUid || !d.mesAno) { _impDataFiltrada.push(d); continue; }
    const registros = d.dataRows.filter(r => r.data.startsWith(d.mesAno));
    // Conta quantas OS deste arquivo já existem no banco, comparando por contagem
    // d.tipo vem do nome do arquivo (PROJETO/MANUTENÇÃO), usado como filtro
    // Agrupa fingerprints da planilha para comparar contagens
    const fpPlanilha = new Map();
    registros.forEach(r => {
      const fp = _osFingerprint(d.matchedUid, d.tipo, r.cidade, r.cto_ceo, r.data, r.servicos);
      fpPlanilha.set(fp, (fpPlanilha.get(fp)||0) + 1);
    });
    let existCount = 0;
    for (const [fp, qtdPlanilha] of fpPlanilha) {
      const qtdBanco = _fpExistentes.get(fp) || 0;
      // Conta como "existente" apenas as que o banco já cobre
      existCount += Math.min(qtdPlanilha, qtdBanco);
    }
    if (existCount > 0 && existCount === registros.length) {
      // TODAS as OS deste arquivo já existem → rejeita inteiro
      dupRejeitados.push({ file: d, total: registros.length });
    } else if (existCount > 0) {
      // Algumas OS duplicadas → mantém o arquivo mas marca quantas serão ignoradas
      d._duplicados = existCount;
      d._novos = registros.length - existCount;
      _impDataFiltrada.push(d);
    } else {
      _impDataFiltrada.push(d);
    }
  }
  _impData = _impDataFiltrada;

  // ── Constrói rows apenas para os arquivos aceitos, com índice final correto ──
  const rows = rawEntries
    .filter(e => _impData.includes(e.dataObj))
    .map(e => {
      const newIdx = _impData.indexOf(e.dataObj);
      return e.rowHTMLTemplate.replace(/__IDX__/g, String(newIdx));
    });

  // Painel de avisos de rejeição V2 extra
  const avisoV2HTML = v2Rejeitados.length
    ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:.82rem;color:#7f1d1d">
        <i class="fas fa-ban"></i> <b>${v2Rejeitados.length} arquivo(s) PRESTADOR rejeitado(s)</b> — já existe uma referência PRESTADOR (apenas 1 planilha PRESTADOR é aceita como referência de preços para bônus). As demais são ignoradas:<br>
        <span style="font-size:.75rem">${v2Rejeitados.map(d=>d.fileName).join(', ')}</span>
       </div>` : '';

  // Painel de avisos de rejeição V3 (usuários que já possuem V1)
  const avisoV3HTML = v3Rejeitados.length
    ? `<div style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:.82rem;color:#5b21b6">
        <i class="fas fa-info-circle"></i> <b>${v3Rejeitados.length} arquivo(s) Admin (V3) ignorado(s)</b> — esses técnicos já possuem planilha Prestador (V1) no lote, portanto seus arquivos V3 não geram registros separados:<br>
        <span style="font-size:.75rem">${v3Rejeitados.map(d=>d.fileName).join(', ')}</span>
       </div>` : '';

  // Painel de avisos de duplicados (arquivos 100% já importados)
  const avisoDupHTML = dupRejeitados.length
    ? `<div style="background:#fef9c3;border:1px solid #facc15;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:.82rem;color:#713f12">
        <i class="fas fa-clone"></i> <b>${dupRejeitados.length} arquivo(s) rejeitado(s) — já importado(s):</b><br>
        ${dupRejeitados.map(x => `<span style="font-size:.75rem">• ${x.file.fileName} (${x.total} OS já existentes)</span>`).join('<br>')}
       </div>` : '';

  // Painel de avisos parciais (arquivo tem OS novas + duplicadas)
  const parciais = _impData.filter(d => d._duplicados > 0);
  const avisoParcialHTML = parciais.length
    ? `<div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:.82rem;color:#1e3a5f">
        <i class="fas fa-info-circle"></i> <b>OS duplicadas serão ignoradas automaticamente:</b><br>
        ${parciais.map(d => `<span style="font-size:.75rem">• ${d.fileName}: ${d._novos} novas, ${d._duplicados} já existentes (ignoradas)</span>`).join('<br>')}
       </div>` : '';

  const avisosHTML = avisoGeral + avisoV2HTML + avisoV3HTML + avisoDupHTML + avisoParcialHTML;

  if (!rows.length) {
    wrap.innerHTML = avisosHTML + `<p style="color:#dc2626;font-size:.85rem"><i class="fas fa-exclamation-circle"></i> Nenhum arquivo será importado (todos rejeitados pelas regras de nível).</p>`;
    acts.style.display = 'none';
    return;
  }

  wrap.innerHTML = avisosHTML + `
    <div id="imp-aviso-refdup"></div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead style="background:#1f4e79;color:#fff">
          <tr>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">Arquivo / Caminho</th>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">Prestador</th>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">Profile</th>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">Tipo</th>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">Nível</th>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">OS</th>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">Mês / Ano</th>
            <th style="padding:9px 10px;font-size:.78rem;text-align:left">Usuário no sistema</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
    <p style="font-size:.8rem;color:var(--muted);margin-top:8px">
      <i class="fas fa-info-circle"></i> Prestador = dados dos prestadores | Admin = dados do master (Jefferson) | PRESTADOR = referência de preços (apenas <b>1 arquivo</b>).
    </p>`;
  acts.style.display = 'flex';
  // Atualiza badges de referência (REF ATIVA / dados)
  _atualizarRefBadges();
}

function _atualizarRefBadges() {
  // V2 extra e V3 não-master já foram rejeitados antes de entrar em _impData.
  // Aqui apenas atualiza os badges dos arquivos ACEITOS.
  _impData.forEach((d, idx) => {
    const b = document.getElementById(`imp-badge-${idx}`);
    if (!b) return;
    if (d.nivel === 'V1') {
      b.textContent = 'dados'; b.style.background = '#d1fae5'; b.style.color = '#16a34a';
    } else if (d.nivel === 'V3') {
      // Apenas V3 do master chega aqui (não-master foi rejeitado)
      b.textContent = 'dados'; b.style.background = '#ede9fe'; b.style.color = '#6d28d9';
    } else {
      // V2 — única referência ativa (extras foram rejeitadas)
      b.textContent = 'ref bônus ativa'; b.style.background = '#fef3c7'; b.style.color = '#92400e';
    }
  });
  // Limpa o aviso de duplicata (não é mais necessário — extras são rejeitadas antes)
  const avisoEl = document.getElementById('imp-aviso-refdup');
  if (avisoEl) avisoEl.innerHTML = '';
}

async function executarImport() {
  try {
    const btn = document.getElementById('btn-imp-exec');
    const log = document.getElementById('imp-log');
    if (!btn || !log) { toast('Elementos da interface não encontrados.', 'error'); return; }

    // Valida acesso: non-admin users can only import arquivos em seu próprio nome
    if (!_isAdmin(currentUser)) {
      for (const d of _impData) {
        if (d.nivel === 'V1' || d.nivel === 'V3') {
          if (d.matchedUid !== currentUser.id) {
            toast(`Acesso negado: você só pode importar planilhas em seu próprio nome.`, 'error');
            return;
          }
        }
      }
    }

    // Valida arquivos marcados como dados: V1 (técnicos regulares) ou V3 (master Jefferson)
    const dadosFiles = _impData.filter(d => d.nivel === 'V1' || d.nivel === 'V3');
    if (!dadosFiles.length) {
      toast('Nenhum arquivo de dados encontrado. Técnicos com V1 usam Prestador; técnicos sem V1 usam Admin (V3).', 'error');
      return;
    }
    const sem_usuario = dadosFiles.filter(d => !d.matchedUid);
    if (sem_usuario.length) {
      toast(`Selecione o usuário para: ${sem_usuario.map(d=>d.fileName).join(', ')}`, 'error');
      return;
    }
    const sem_mesano = dadosFiles.filter(d => !d.mesAno || d.mesAno.length < 7);
    if (sem_mesano.length) {
      toast(`Informe o mês e ano para: ${sem_mesano.map(d=>d.fileName).join(', ')}`, 'error');
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
    log.innerHTML = '';
    let totalOS = 0;
    const erroLog = [];

  // Referências V1, V2 e V3: capturam preços da aba de_para das planilhas de referência
  let _refPrecosV1 = {};
  _refPrecosV2 = {};
  let _refPrecosV3 = {};
  // V1 referência: captura de arquivo V1 (para quando dados vêm de arquivo V3)
  const _primeiroV1 = _impData.find(d => d.nivel === 'V1' && d.dpMap && Object.keys(d.dpMap).length > 0);
  if (_primeiroV1) {
    _refPrecosV1 = { ..._primeiroV1.dpMap };
    erroLog.push(`ℹ️ Referência V1 ativa: <b>${_primeiroV1.fileName}</b> (${Object.keys(_primeiroV1.dpMap).length} serviços)`);
  }
  const _primeiroV2 = _impData.find(d => d.nivel === 'V2' && d.dpMap && Object.keys(d.dpMap).length > 0);
  if (_primeiroV2) {
    _refPrecosV2 = { ..._primeiroV2.dpMap };
    erroLog.push(`ℹ️ Referência V2 ativa: <b>${_primeiroV2.fileName}</b> (${Object.keys(_primeiroV2.dpMap).length} serviços)`);
  }
  const _v3refFile = _impData.find(d => d.nivel === 'V3' && d.dpMap && Object.keys(d.dpMap).length > 0);
  if (_v3refFile) {
    _refPrecosV3 = { ..._v3refFile.dpMap };
    erroLog.push(`ℹ️ Referência V3 ativa: <b>${_v3refFile.fileName}</b> (${Object.keys(_v3refFile.dpMap).length} serviços)`);
  }

  // Helper: busca preço na referência com normalização de espaços e aliases
  const _buscarRef = (mapa, tipo) => {
    const limpo = (tipo||'').replace(/\xa0/g,' ').replace(/\s+/g,' ').trim();
    if (mapa[limpo] !== undefined) return mapa[limpo];
    // Tenta pelo nome normalizado (aliases)
    const norm = _normServico(limpo);
    if (norm !== limpo && mapa[norm] !== undefined) return mapa[norm];
    for (const [k, v] of Object.entries(mapa)) {
      if (k.replace(/\s+/g,' ').trim() === limpo) return v;
    }
    return undefined;
  };

  for (const d of _impData) {
    // Pula arquivos de referência (V2) — não geram registros
    // V3 que NÃO têm matchedUid são apenas referência (não geram registros)
    if (d.nivel === 'V2') continue;
    if (d.nivel !== 'V1' && d.nivel !== 'V3') continue;

    const u = usersCache[d.matchedUid];
    if (!d.matchedUid) continue; // Sem usuário = apenas referência
    const registrosFiltrados = d.dataRows.filter(r => r.data.startsWith(d.mesAno));

    if (!registrosFiltrados.length) {
      erroLog.push(`⚠️ <b>${d.fileName}</b>: nenhum registro encontrado para ${d.mesAno} (total na planilha: ${d.dataRows.length})`);
      continue;
    }

    let duplicados = 0;
    // Map de fingerprints → contagem para detecção de duplicados (inclui tipo + cidade + cto_ceo)
    // Usa Map em vez de Set para permitir OS genuinamente distintas com dados idênticos
    // (ex: 2× REPUXE no mesmo CTO/dia — ambas devem ser importadas)
    const _fpBanco = new Map();
    allRecords.filter(ex => ex.importado === true && ex.userId === d.matchedUid)
      .forEach(ex => {
        const tot = (ex.servicos||[]).reduce((s,sv) => s + Math.round((Number(sv.valor)||0) * 100), 0);
        const fp = `${(ex.tipo||'').toUpperCase()}|${(ex.cidade||'').toUpperCase()}|${(ex.cto_ceo||'').toUpperCase()}|${ex.data}|${(ex.servicos||[]).length}|${tot}`;
        _fpBanco.set(fp, (_fpBanco.get(fp)||0) + 1);
      });
    // Conta quantas vezes cada fingerprint aparece na planilha atual
    const _fpPlanilha = new Map();
    for (const r of registrosFiltrados) {
      const tot = (r.servicos||[]).reduce((s,sv) => s + Math.round((Number(sv.valor)||0) * 100), 0);
      const fp = `${(d.tipo||'').toUpperCase()}|${(r.cidade||'').toUpperCase()}|${(r.cto_ceo||'').toUpperCase()}|${r.data}|${(r.servicos||[]).length}|${tot}`;
      _fpPlanilha.set(fp, (_fpPlanilha.get(fp)||0) + 1);
    }
    // Tracker: conforme cada OS é processada, conta quantas já "consumimos"
    const _fpUsado = new Map();
    for (const r of registrosFiltrados) {
      try {
        // ── Detecção de duplicados: pula OS que já existe no banco ──
        const tot = (r.servicos||[]).reduce((s,sv) => s + Math.round((Number(sv.valor)||0) * 100), 0);
        const fp = `${(d.tipo||'').toUpperCase()}|${(r.cidade||'').toUpperCase()}|${(r.cto_ceo||'').toUpperCase()}|${r.data}|${(r.servicos||[]).length}|${tot}`;
        const noBanco = _fpBanco.get(fp) || 0;
        const jaUsado = _fpUsado.get(fp) || 0;
        _fpUsado.set(fp, jaUsado + 1);
        // Pula apenas se o banco já tem pelo menos tantas cópias quanto as que já processamos
        if (jaUsado < noBanco) { duplicados++; continue; }

        const codigo = `IMP-${d.nivel||'V1'}-${r.data.slice(0,7)}-${String(Math.floor(Math.random()*9000)+1000)}`;
        // sv.valor já usa o preço da de_para do arquivo importado (nível V1 ou V3)
        // Adiciona valorV2 e valorV3 usando as referências quando disponíveis
        // REGRA: Jefferson é exceção — só opera em V3, nunca recebe V1/V2
        const _isJefferson = (u?.name || d.nomeTec || '').toUpperCase().includes('JEFFERSON');

        const servicosComRefs = (r.servicos || []).map(sv => {
          const q = Number(sv.qtd) || 0;
          const tipoNorm = _normServico(sv.tipo);
          const result = { tipo: tipoNorm, qtd: sv.qtd, valor: sv.valor };
          if (!_isJefferson) {
            // V1: busca preço na referência V1 (útil quando dados vêm de arquivo V3)
            const pV1 = _buscarRef(_refPrecosV1, sv.tipo);
            if (pV1 !== undefined) result.valorV1 = +(pV1 * q).toFixed(2);
            // V2: busca preço na referência V2
            const pV2 = _buscarRef(_refPrecosV2, sv.tipo);
            if (pV2 !== undefined) result.valorV2 = +(pV2 * q).toFixed(2);
          }
          // V3: busca preço na referência V3
          const pV3 = _buscarRef(_refPrecosV3, sv.tipo);
          if (pV3 !== undefined) result.valorV3 = +(pV3 * q).toFixed(2);
          return result;
        });
        const totalV1 = servicosComRefs.reduce((s, sv) => s + (Number(sv.valor)||0), 0);
        const rec = {
          criado_em:  new Date().toISOString(),
          data:       r.data,
          hora:       r.hora || '',
          codigo_os:  codigo,
          userId:     d.matchedUid,
          userName:   u?.name || d.nomeTec,
          profile:    r.profile || '',
          tipo:       r.tipo || '',
          cidade:     r.cidade || '',
          referencia: r.referencia || '',
          cto_ceo:    r.cto_ceo || '',
          lat: '', lon: '',
          servicos:   servicosComRefs,
          total:      totalV1,
          importado:  true,
          nivelImp:   d.nivel || 'V1',
          // REGRA: mês vigente → pendente (como manual); meses anteriores → importada (concluída)
          validacaoFiscal: (() => {
            const _hi = new Date();
            const _mv = `${_hi.getFullYear()}-${String(_hi.getMonth()+1).padStart(2,'0')}`;
            return (r.data||'').startsWith(_mv) ? 'pendente' : 'importada';
          })(),
        };
        // Totais por nível (independente de qual nível é o arquivo de dados)
        // BLOQUEIO: Jefferson NUNCA recebe totalV1/totalV2 — somente totalV3
        if (!_isJefferson) {
          if (Object.keys(_refPrecosV1).length || d.nivel === 'V1') {
            rec.totalV1 = d.nivel === 'V1' ? totalV1
              : +servicosComRefs.reduce((s, sv) => s + (sv.valorV1 !== undefined ? sv.valorV1 : (Number(sv.valor)||0)), 0).toFixed(2);
          }
          if (Object.keys(_refPrecosV2).length) {
            rec.totalV2 = +servicosComRefs.reduce((s, sv) => s + (sv.valorV2 !== undefined ? sv.valorV2 : (Number(sv.valor)||0)), 0).toFixed(2);
          }
        }
        // Jefferson: mantém total (valor base do OS) mas nunca cria totalV1/totalV2
        if (Object.keys(_refPrecosV3).length || d.nivel === 'V3') {
          rec.totalV3 = d.nivel === 'V3' ? totalV1
            : +servicosComRefs.reduce((s, sv) => s + (sv.valorV3 !== undefined ? sv.valorV3 : (Number(sv.valor)||0)), 0).toFixed(2);
        }
        const _impKey = await _dbPush('os', rec);
        if (!_impKey) throw new Error('Falha ao gravar OS no Firebase');
        totalOS++;
      } catch(e) {
        console.error('Erro ao importar OS:', e);
        erroLog.push(`❌ <b>${d.fileName}</b> [${r.data}]: ${e.message}`);
      }
    }
    if (duplicados > 0) {
      erroLog.push(`⏭️ <b>${d.fileName}</b>: ${duplicados} OS já existente(s) — ignorada(s)`);
    }
  }

    await carregarDados();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Importar para Firebase';

    const cor    = totalOS > 0 ? '#16a34a' : '#dc2626';
    const icone  = totalOS > 0 ? 'fa-check-circle' : 'fa-times-circle';
    const infoLog  = erroLog.filter(e => e.startsWith('ℹ️'));
    const errosSom = erroLog.filter(e => !e.startsWith('ℹ️'));
    const infoHtml = infoLog.length
      ? `<ul style="margin:6px 0 0 0;padding-left:18px;font-size:.78rem;color:#1a6fc4">${infoLog.map(e=>`<li>${e}</li>`).join('')}</ul>`
      : '';
    const errosHtml = errosSom.length
      ? `<ul style="margin:8px 0 0 0;padding-left:18px;font-size:.8rem;color:#dc2626">${errosSom.map(e=>`<li>${e}</li>`).join('')}</ul>`
      : '';
    log.innerHTML = `
      <div style="padding:14px 18px;background:${totalOS>0?'#f0fdf4':'#fef2f2'};border-radius:10px;border-left:4px solid ${cor};font-size:.88rem">
        <b style="color:${cor}"><i class="fas ${icone}"></i> ${totalOS > 0 ? 'Importação concluída' : 'Nenhum registro importado'}!</b><br>
        <span style="color:#374151">${totalOS} OS importadas com sucesso.</span>
        ${infoHtml}
        ${errosHtml}
      </div>`;
    if (totalOS > 0) toast(`${totalOS} OS importadas com sucesso!`, 'success');
    else toast('Nenhuma OS foi importada — verifique os detalhes abaixo.', 'error');
  } catch(e) {
    console.error('[executarImport]', e);
    toast('Erro ao importar dados. Tente novamente.', 'error');
    const btn = document.getElementById('btn-imp-exec');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Importar para Firebase'; }
  }
}

function confirmarApagarImportados() {
  const total = allRecords.filter(r => r.importado === true).length;
  if (!total) { toast('Não há registros importados para apagar.', 'warning'); return; }
  const log = document.getElementById('imp-apagar-log');
  log.innerHTML = `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;font-size:.85rem;color:#7f1d1d">
      <b><i class="fas fa-exclamation-triangle"></i> Confirmar exclusão</b><br>
      Isso apagará <b>${total} registro(s) importados</b> permanentemente do banco de dados. Esta ação não pode ser desfeita.<br>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn" style="background:#dc2626;color:#fff;font-size:.82rem" onclick="apagarImportados()">
          <i class="fas fa-trash-alt"></i> Confirmar — Apagar ${total} registros
        </button>
        <button class="btn btn-secondary" style="font-size:.82rem" onclick="document.getElementById('imp-apagar-log').innerHTML=''">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </div>`;
}

async function apagarImportados() {
  const log = document.getElementById('imp-apagar-log');
  log.innerHTML = `<p style="font-size:.84rem;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i> Apagando registros importados...</p>`;
  try {
    const snap = await db.ref('os').once('value');
    const todos = snap.val() || {};
    let apagados = 0;
    const promises = [];
    for (const [key, val] of Object.entries(todos)) {
      if (val.importado === true) {
        promises.push(db.ref(`os/${key}`).remove());
        apagados++;
      }
    }
    await Promise.all(promises);
    await carregarDados();
    log.innerHTML = `<div style="background:#f0fdf4;border-radius:8px;padding:10px 14px;font-size:.84rem;color:#166534">
      <i class="fas fa-check-circle"></i> <b>${apagados} registro(s) importados apagados com sucesso.</b>
    </div>`;
    toast(`${apagados} registros importados removidos.`, 'success');
  } catch(e) {
    console.error('Erro ao apagar importados:', e);
    log.innerHTML = `<div style="background:#fef2f2;border-radius:8px;padding:10px 14px;font-size:.84rem;color:#dc2626">
      <i class="fas fa-times-circle"></i> Erro: ${e.message}
    </div>`;
    toast('Erro ao apagar registros.', 'error');
  }
}

function confirmarApagarGrupo(userId, userName, mesAno) {
  const count = allRecords.filter(r =>
    r.importado === true && r.userId === userId && (r.data||'').startsWith(mesAno)
  ).length;
  if (!count) { toast('Nenhum registro encontrado para este grupo.', 'warning'); return; }
  const MESES_N = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
                   '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
  const [ano, mes] = mesAno.split('-');
  const label = `${MESES_N[mes]||mes}/${ano}`;
  if (!confirm(`Apagar ${count} registro(s) importados de "${userName}" em ${label}?\n\nEsta ação não pode ser desfeita.`)) return;
  apagarGrupoImportado(userId, mesAno);
}

async function apagarGrupoImportado(userId, mesAno) {
  try {
    const snap = await db.ref('os').once('value');
    const todos = snap.val() || {};
    const promises = [];
    let apagados = 0;
    for (const [key, val] of Object.entries(todos)) {
      if (val.importado === true && val.userId === userId && (val.data||'').startsWith(mesAno)) {
        promises.push(db.ref(`os/${key}`).remove());
        apagados++;
      }
    }
    await Promise.all(promises);
    await carregarDados();
    renderImportarPage();
    toast(`${apagados} registro(s) removidos com sucesso.`, 'success');
  } catch(e) {
    toast('Erro ao apagar registros: ' + e.message, 'error');
  }
}

function confirmarApagarPlanilha(userId, userName, mesAno, profile, tipo) {
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();
  const count = allRecords.filter(r =>
    r.importado === true &&
    r.userId === userId &&
    (r.data||'').startsWith(mesAno) &&
    _n(r.profile) === _n(profile) &&
    _n(r.tipo) === _n(tipo)
  ).length;
  if (!count) { toast('Nenhum registro encontrado para esta planilha.', 'warning'); return; }
  const MESES_N = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
                   '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
  const [ano, mes] = mesAno.split('-');
  const label = `${MESES_N[mes]||mes}/${ano}`;
  const descPlani = `${(profile||'').toUpperCase()} / ${(tipo||'').toUpperCase()}`;
  if (!confirm(`Apagar ${count} registro(s) importados de "${userName}" — ${descPlani} — ${label}?\n\nEsta ação não pode ser desfeita.`)) return;
  apagarPlanilhaImportada(userId, mesAno, profile, tipo);
}

async function apagarPlanilhaImportada(userId, mesAno, profile, tipo) {
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();
  try {
    const snap = await db.ref('os').once('value');
    const todos = snap.val() || {};
    const promises = [];
    let apagados = 0;
    for (const [key, val] of Object.entries(todos)) {
      if (
        val.importado === true &&
        val.userId === userId &&
        (val.data||'').startsWith(mesAno) &&
        _n(val.profile) === _n(profile) &&
        _n(val.tipo) === _n(tipo)
      ) {
        promises.push(db.ref(`os/${key}`).remove());
        apagados++;
      }
    }
    await Promise.all(promises);
    await carregarDados();
    renderImportarPage();
    toast(`${apagados} registro(s) removidos com sucesso.`, 'success');
  } catch(e) {
    toast('Erro ao apagar planilha: ' + e.message, 'error');
  }
}
// ── Window bridge ──
window.previewImport = previewImport;
window.executarImport = executarImport;
window.confirmarApagarImportados = confirmarApagarImportados;
