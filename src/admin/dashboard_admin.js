// src/admin/dashboard_admin.js
// Dashboards: técnicos, bônus, meu dash, fiscal, observador, fiscalização, anual
// Extraído de admin.html — Fase D

function _calcTecTotal(uid, profile, tipo, priceMap, mesFiltro) {
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  const hist = _buildPrecosHistoricoMes();
  const nivelColuna = _nivelDoMapa(priceMap);
  // Helper: busca preço no mapa com normalização de aliases
  const _pm = tipo => priceMap[tipo] ?? priceMap[_normServico(tipo)] ?? 0;
  const _v1 = tipo => precosV1map[tipo] ?? precosV1map[_normServico(tipo)] ?? 0;
  const _v2 = tipo => precosV2map[tipo] ?? precosV2map[_normServico(tipo)] ?? 0;
  return allRecords
    .filter(r => r.userId === uid &&
                 _n(r.profile) === _n(profile) &&
                 _n(r.tipo) === _n(tipo) &&
                 (!mesFiltro || (r.data||'').startsWith(mesFiltro)))
    .reduce((sum, r) => sum + (r.servicos||[]).reduce((s2, sv) => {
      const q = Number(sv.qtd) || 0;
      const mesOS = (r.data||'').slice(0,7);
      let p; // sempre PREÇO UNITÁRIO
      if (mesOS >= mesAtual) {
        p = _pm(sv.tipo);
      } else if (r.importado) {
        const nivelImp = r.nivelImp || 'V1';
        if (nivelColuna === 'V1') {
          if (sv.valorV1 !== undefined) return s2 + sv.valorV1;
          if (nivelImp === 'V1' && sv.valor !== undefined) return s2 + sv.valor;
          p = _pm(sv.tipo);
        } else if (nivelColuna === 'V2') {
          if (sv.valorV2 !== undefined) return s2 + sv.valorV2;
          if (nivelImp === 'V2' && sv.valor !== undefined) return s2 + sv.valor;
          p = _pm(sv.tipo);
        } else if (nivelColuna === 'V3') {
          if (sv.valorV3 !== undefined) return s2 + sv.valorV3;
          if (nivelImp === 'V3' && sv.valor !== undefined) return s2 + sv.valor;
          p = _pm(sv.tipo);
        } else {
          p = _pm(sv.tipo);
        }
      } else if (nivelColuna === 'V2') {
        const nivelEfetivo = _nivelEfetivoPreco(r);
        let pV1;
        const tipoN = _normServico(sv.tipo);
        if (nivelEfetivo === 'V1' && sv.valor !== undefined && sv.valor !== null) {
          pV1 = _precoUnitario(r, sv);
        } else if ((hist[mesOS]?.['V1']?.[sv.tipo] ?? hist[mesOS]?.['V1']?.[tipoN]) !== undefined) {
          pV1 = hist[mesOS]['V1'][sv.tipo] ?? hist[mesOS]['V1'][tipoN];
        } else if (sv.valor !== undefined && sv.valor !== null) {
          pV1 = _precoUnitario(r, sv);
        } else {
          pV1 = _v1(sv.tipo);
        }
        const v1Atual = _v1(sv.tipo);
        const v2Atual = _v2(sv.tipo);
        p = v1Atual > 0 ? pV1 * (v2Atual / v1Atual) : v2Atual;
      } else {
        const nivelBusca = nivelColuna;
        const nivelEfetivo = _nivelEfetivoPreco(r);
        const tipoN = _normServico(sv.tipo);
        if (nivelEfetivo === nivelBusca && sv.valor !== undefined && sv.valor !== null) {
          p = _precoUnitario(r, sv);
        } else if ((hist[mesOS]?.[nivelBusca]?.[sv.tipo] ?? hist[mesOS]?.[nivelBusca]?.[tipoN]) !== undefined) {
          p = hist[mesOS][nivelBusca][sv.tipo] ?? hist[mesOS][nivelBusca][tipoN];
        } else if (sv.valor !== undefined && sv.valor !== null) {
          p = _precoUnitario(r, sv);
        } else {
          p = _pm(sv.tipo);
        }
      }
      return s2 + q * p;
    }, 0), 0);
}

function _fmtTec(v) {
  if (!v) return '<span style="color:#ccc">—</span>';
  return `<span style="color:#1a6fc4;font-weight:700">${fmtMoeda(v)}</span>`;
}

async function _batchFixServicos() {
  if (!_isAdmin(currentUser)) { toast('Apenas admin pode executar esta correção.','error'); return; }
  if (!confirm('Corrigir nomes de serviço (aliases) em TODOS os registros importados?\n\nEx: "LEVANTAMENTO DE REDE" → "LEVANTAMENTO DE REDE (POR CTO)"\n"EQUIPAGEM DE POSTE" → "EQUIPAGEM DE POSTE (FERRAGEN LEVE)"')) return;
  let corrigidos = 0, totalSv = 0, svCorrigidos = 0;
  const updates = {};
  for (const r of allRecords) {
    if (!r.servicos || !r.servicos.length || !r.fbKey) continue;
    let changed = false;
    const newServicos = r.servicos.map(sv => {
      totalSv++;
      const norm = _normServico(sv.tipo);
      if (norm !== sv.tipo) {
        changed = true;
        svCorrigidos++;
        return { ...sv, tipo: norm };
      }
      return sv;
    });
    if (changed) {
      corrigidos++;
      // Caminho correto: os/{fbKey}/servicos
      updates[`os/${r.fbKey}/servicos`] = newServicos;
    }
  }
  if (!Object.keys(updates).length) {
    toast('Nenhum serviço precisou de correção.','info');
    return;
  }
  try {
    await firebase.database().ref().update(updates);
    // Atualiza cache local
    for (const r of allRecords) {
      if (!r.servicos) continue;
      r.servicos = r.servicos.map(sv => ({ ...sv, tipo: _normServico(sv.tipo) }));
    }
    toast(`✅ ${corrigidos} registros corrigidos (${svCorrigidos} serviços renomeados de ${totalSv} total).`,'success');
  } catch (e) {
    toast('Erro ao corrigir: ' + e.message, 'error');
  }
}

function _diagTecTotal(uid, profile, tipo, priceMap, mesFiltro) {
  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();
  const nivelColuna = _nivelDoMapa(priceMap);
  const recs = allRecords.filter(r => r.userId === uid && _n(r.profile) === _n(profile) && _n(r.tipo) === _n(tipo) && (!mesFiltro || (r.data||'').startsWith(mesFiltro)));
  const impCount = recs.filter(r=>r.importado).length;
  const manCount = recs.length - impCount;
  let html = `<div style="max-height:70vh;overflow-y:auto;font-size:.75rem">
    <div style="margin-bottom:8px;font-weight:700">${profile} – ${tipo} | Coluna: ${nivelColuna} | ${recs.length} OS (${impCount} importadas${manCount ? `, ${manCount} manuais` : ''})</div>
    <table style="width:100%;border-collapse:collapse;font-size:.72rem">
    <tr style="background:#f1f5f9">
      <th style="padding:4px;text-align:left">#</th>
      <th style="padding:4px;text-align:left">Data</th>
      <th>Imp?</th><th>NvImp</th>
      <th style="padding:4px;text-align:left">Código OS</th>
      <th style="padding:4px;text-align:left">Serviço</th><th>Qtd</th>
      <th>sv.valor</th><th>Usado</th><th>Subtotal</th>
      <th style="padding:4px;text-align:left">Ação</th>
    </tr>`;
  let total = 0;
  const _pmd = t => priceMap[t] ?? priceMap[_normServico(t)] ?? 0;
  for (let idx = 0; idx < recs.length; idx++) {
    const r = recs[idx];
    const nivelImp = r.nivelImp || 'V1';
    let osTotal = 0;
    const svRows = [];
    for (const sv of (r.servicos||[])) {
      const q = Number(sv.qtd)||0;
      let usado = '', subtotal = 0;
      if (r.importado) {
        if (nivelColuna === 'V1') {
          if (sv.valorV1 !== undefined) { usado = 'valorV1'; subtotal = sv.valorV1; }
          else if (nivelImp === 'V1' && sv.valor !== undefined) { usado = 'valor(V1)'; subtotal = q * Number(sv.valor); }
          else { const p = _pmd(sv.tipo); usado = `sis(${p})`; subtotal = q * p; }
        } else if (nivelColuna === 'V2') {
          if (sv.valorV2 !== undefined) { usado = 'valorV2'; subtotal = sv.valorV2; }
          else if (nivelImp === 'V2' && sv.valor !== undefined) { usado = 'valor(V2)'; subtotal = q * Number(sv.valor); }
          else { const p = _pmd(sv.tipo); usado = `sis(${p})`; subtotal = q * p; }
        } else if (nivelColuna === 'V3') {
          if (sv.valorV3 !== undefined) { usado = 'valorV3'; subtotal = sv.valorV3; }
          else if (nivelImp === 'V3' && sv.valor !== undefined) { usado = 'valor(V3)'; subtotal = q * Number(sv.valor); }
          else { const p = _pmd(sv.tipo); usado = `sis(${p})`; subtotal = q * p; }
        }
      } else {
        const p = _pmd(sv.tipo);
        usado = `man(${p})`;
        subtotal = q * p;
      }
      osTotal += subtotal;
      svRows.push({tipo:sv.tipo,q,valor:sv.valor,usado,subtotal});
    }
    total += osTotal;
    const bg = r.importado ? (idx%2===0?'#fff':'#f8fafc') : '#fef3c7';
    const codOS = (r.codigo_os||'—').replace('IMP-','');
    const delBtn = r.fbKey ? `<button onclick="if(confirm('Excluir OS ${r.codigo_os||''}?')){firebase.database().ref('os/${r.fbKey}').remove().then(()=>{toast('Excluído!','success');this.closest('div[style*=fixed]').remove();carregarDados()})}" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:4px;padding:1px 4px;font-size:.65rem;cursor:pointer">X</button>` : '';
    for (let si = 0; si < svRows.length; si++) {
      const sv = svRows[si];
      const isFirst = si === 0;
      const rowspan = isFirst ? ` rowspan="${svRows.length}"` : '';
      html += `<tr style="background:${bg};border-bottom:1px solid #e5e7eb">`;
      if (isFirst) {
        html += `<td${rowspan} style="padding:3px;font-weight:600;color:#64748b">${idx+1}</td>
          <td${rowspan} style="padding:3px">${(r.data||"").split("-").reverse().join("/")}</td>
          <td${rowspan}>${r.importado?'S':'N'}</td>
          <td${rowspan}>${_safeNivel(nivelImp)}</td>
          <td${rowspan} style="font-size:.65rem;color:#94a3b8;max-width:90px;overflow:hidden;text-overflow:ellipsis" title="${r.codigo_os||''}">${codOS}</td>`;
      }
      html += `<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${sv.tipo}">${sv.tipo}</td>
        <td style="text-align:right">${sv.q}</td>
        <td style="text-align:right">${sv.valor !== undefined ? Number(sv.valor).toFixed(2) : '—'}</td>
        <td style="color:#059669;font-weight:600;font-size:.65rem">${sv.usado}</td>
        <td style="text-align:right;font-weight:600">${sv.subtotal.toFixed(2)}</td>`;
      if (isFirst) html += `<td${rowspan} style="text-align:center">${delBtn}</td>`;
      html += `</tr>`;
    }
  }
  html += `<tr style="background:#1f4e79;color:#fff;font-weight:700"><td colspan="9" style="padding:4px">TOTAL (${recs.length} OS)</td><td style="text-align:right;padding:4px">${total.toFixed(2)}</td><td></td></tr></table></div>`;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px';
  d.onclick = e => { if (e.target === d) d.remove(); };
  d.innerHTML = `<div style="background:#fff;border-radius:12px;padding:20px;max-width:95vw;max-height:90vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;justify-content:space-between;margin-bottom:12px"><b>Diagnóstico de Cálculo</b><button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer">✕</button></div>${html}</div>`;
  document.body.appendChild(d);
}

function _tecTabela(uid, mesFiltro) {
  const combos = [
    { profile:'MATRIZ', tipo:'PROJETO',    bg:'#eff6ff', label:'MATRIZ – PROJETO'    },
    { profile:'MATRIZ', tipo:'MANUTENÇÃO', bg:'#fefce8', label:'MATRIZ – MANUTENÇÃO' },
    { profile:'FILIAL', tipo:'PROJETO',    bg:'#f0fdf4', label:'FILIAL – PROJETO'    },
    { profile:'FILIAL', tipo:'MANUTENÇÃO', bg:'#fff7ed', label:'FILIAL – MANUTENÇÃO' },
  ];
  const thS = 'padding:7px 12px;font-size:.75rem;font-weight:700;text-align:center;border:1px solid #e2e8f0';
  const tdS = 'padding:7px 14px;font-size:.83rem;text-align:right;border:1px solid #e2e8f0';
  const tdL = 'padding:7px 12px;font-size:.78rem;font-weight:600;border:1px solid #e2e8f0';
  return `
    <div style="overflow-x:auto;margin-top:4px">
      <table style="border-collapse:collapse;width:100%;min-width:400px">
        <thead>
          <tr>
            <th style="${thS};background:#1f4e79;color:#fff;text-align:left;width:44%">Categoria</th>
            <th style="${thS};background:#1a6fc4;color:#fff">Prestador</th>
            <th style="${thS};background:#1557a0;color:#fff">PRESTADOR</th>
            <th style="${thS};background:#0d4e8a;color:#fff">Admin</th>
          </tr>
        </thead>
        <tbody>
          ${combos.map(c => `
            <tr>
              <td style="${tdL};background:${c.bg}">${c.label}</td>
              <td style="${tdS};background:${c.bg};cursor:pointer" onclick="_diagTecTotal('${uid}','${c.profile}','${c.tipo}',precosV1map,'${mesFiltro}')" title="Clique para diagnóstico">${_fmtTec(_calcTecTotal(uid, c.profile, c.tipo, precosV1map, mesFiltro))}</td>
              <td style="${tdS};background:${c.bg};cursor:pointer" onclick="_diagTecTotal('${uid}','${c.profile}','${c.tipo}',precosV2map,'${mesFiltro}')" title="Clique para diagnóstico">${_fmtTec(_calcTecTotal(uid, c.profile, c.tipo, precosV2map, mesFiltro))}</td>
              <td style="${tdS};background:${c.bg};cursor:pointer" onclick="_diagTecTotal('${uid}','${c.profile}','${c.tipo}',precosV3map,'${mesFiltro}')" title="Clique para diagnóstico">${_fmtTec(_calcTecTotal(uid, c.profile, c.tipo, precosV3map, mesFiltro))}</td>
            </tr>`).join('')}
          <tr style="border-top:2px solid #1f4e79">
            <td style="${tdL};background:#f1f5f9;font-weight:700">TOTAL GERAL</td>
            <td style="${tdS};background:#f1f5f9;font-weight:700;color:#1a6fc4">${_fmtTec(combos.reduce((s,c)=>s+_calcTecTotal(uid,c.profile,c.tipo,precosV1map,mesFiltro),0))}</td>
            <td style="${tdS};background:#f1f5f9;font-weight:700;color:#1a6fc4">${_fmtTec(combos.reduce((s,c)=>s+_calcTecTotal(uid,c.profile,c.tipo,precosV2map,mesFiltro),0))}</td>
            <td style="${tdS};background:#f1f5f9;font-weight:700;color:#1a6fc4">${_fmtTec(combos.reduce((s,c)=>s+_calcTecTotal(uid,c.profile,c.tipo,precosV3map,mesFiltro),0))}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function _tecDashboard(tecs, mesFiltro) {
  const combos = [
    { profile:'MATRIZ', tipo:'PROJETO',    bg:'#eff6ff', label:'MATRIZ – PROJETO',    icon:'📁' },
    { profile:'MATRIZ', tipo:'MANUTENÇÃO', bg:'#fefce8', label:'MATRIZ – MANUTENÇÃO', icon:'🔧' },
    { profile:'FILIAL', tipo:'PROJETO',    bg:'#f0fdf4', label:'FILIAL – PROJETO',    icon:'📁' },
    { profile:'FILIAL', tipo:'MANUTENÇÃO', bg:'#fff7ed', label:'FILIAL – MANUTENÇÃO', icon:'🔧' },
  ];
  const maps = [precosV1map, precosV2map, precosV3map];
  const labels = ['V1','V2','V3'];
  const colors = ['#1a6fc4','#1557a0','#0d4e8a'];

  // Totais gerais V1/V2/V3
  const totaisGerais = maps.map(pm =>
    tecs.reduce((s,[uid]) =>
      s + combos.reduce((s2,c) => s2 + _calcTecTotal(uid,c.profile,c.tipo,pm,mesFiltro), 0), 0)
  );

  // Cards de totais gerais
  const metricCards = labels.map((lbl,i) => `
    <div style="flex:1;min-width:150px;background:${colors[i]};border-radius:12px;padding:18px 16px;color:#fff;text-align:center">
      <div style="font-size:.72rem;font-weight:700;opacity:.8;letter-spacing:.08em;margin-bottom:6px">TOTAL ${lbl}</div>
      <div style="font-size:1.25rem;font-weight:800">${fmtMoeda(totaisGerais[i])}</div>
      <div style="font-size:.7rem;opacity:.7;margin-top:4px">todos os técnicos</div>
    </div>`).join('');

  // Tabela por categoria × V1/V2/V3 (soma de todos os técnicos)
  const thS = 'padding:8px 12px;font-size:.75rem;font-weight:700;text-align:center;border:1px solid #e2e8f0';
  const tdS = 'padding:7px 14px;font-size:.83rem;text-align:right;border:1px solid #e2e8f0;font-weight:600';
  const tdL = 'padding:7px 12px;font-size:.78rem;font-weight:600;border:1px solid #e2e8f0';
  const catRows = combos.map(c => {
    const vals = maps.map(pm =>
      tecs.reduce((s,[uid]) => s + _calcTecTotal(uid,c.profile,c.tipo,pm,mesFiltro), 0));
    return `<tr>
      <td style="${tdL};background:${c.bg}">${c.icon} ${c.label}</td>
      ${vals.map((v,i)=>`<td style="${tdS};background:${c.bg};color:${colors[i]}">${v?fmtMoeda(v):'<span style="color:#ccc">—</span>'}</td>`).join('')}
    </tr>`;
  }).join('');
  const totalRow = (() => {
    return `<tr style="border-top:2px solid #1f4e79">
      <td style="${tdL};background:#1f4e79;color:#fff;font-weight:700">⚡ TOTAL</td>
      ${totaisGerais.map((v,i)=>`<td style="${tdS};background:#1f4e79;color:#fff">${fmtMoeda(v)}</td>`).join('')}
    </tr>`;
  })();

  // Tabela por técnico (resumo compacto)
  const tecRows = tecs.map(([uid,u], idx) => {
    const num = parseInt(uid.replace(/\D/g,'')) || (idx+1);
    const vals = maps.map(pm =>
      combos.reduce((s,c) => s + _calcTecTotal(uid,c.profile,c.tipo,pm,mesFiltro), 0));
    const totalOS = allRecords.filter(r=>r.userId===uid && (!mesFiltro || (r.data||'').startsWith(mesFiltro))).length;
    return `<tr>
      <td style="${tdL};background:#f8fafc">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#1f4e79;color:#fff;font-size:.7rem;font-weight:700;margin-right:7px">${num}</span>
        ${u.name} <span style="color:var(--muted);font-size:.72rem;margin-left:4px">(${totalOS} OS)</span>
      </td>
      ${vals.map((v,i)=>`<td style="${tdS};background:#f8fafc;color:${colors[i]}">${v?fmtMoeda(v):'<span style="color:#ccc">—</span>'}</td>`).join('')}
    </tr>`;
  }).join('');

  return `
    <!-- Métricas gerais -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
      ${metricCards}
    </div>

    <!-- Tabela por categoria -->
    <div style="margin-bottom:20px">
      <div style="font-size:.8rem;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
        <i class="fas fa-layer-group" style="margin-right:6px;color:var(--primary)"></i>Totais por Categoria
      </div>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse;width:100%;min-width:380px">
          <thead><tr>
            <th style="${thS};background:#1f4e79;color:#fff;text-align:left">Categoria</th>
            <th style="${thS};background:#1a6fc4;color:#fff">Prestador</th>
            <th style="${thS};background:#1557a0;color:#fff">PRESTADOR</th>
            <th style="${thS};background:#0d4e8a;color:#fff">Admin</th>
          </tr></thead>
          <tbody>${catRows}${totalRow}</tbody>
        </table>
      </div>
    </div>

    <!-- Tabela resumo por técnico -->
    <div style="margin-bottom:24px">
      <div style="font-size:.8rem;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
        <i class="fas fa-users" style="margin-right:6px;color:var(--primary)"></i>Resumo por Prestador
      </div>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse;width:100%;min-width:380px">
          <thead><tr>
            <th style="${thS};background:#1f4e79;color:#fff;text-align:left">Prestador</th>
            <th style="${thS};background:#1a6fc4;color:#fff">Prestador</th>
            <th style="${thS};background:#1557a0;color:#fff">PRESTADOR</th>
            <th style="${thS};background:#0d4e8a;color:#fff">Admin</th>
          </tr></thead>
          <tbody>${tecRows}</tbody>
        </table>
      </div>
    </div>

    <hr style="border:none;border-top:1px solid var(--border);margin-bottom:20px">
    <div style="font-size:.8rem;font-weight:700;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">
      <i class="fas fa-hard-hat" style="margin-right:6px;color:var(--primary)"></i>Detalhamento por Prestador
    </div>`;
}

function renderTecnicosPage() {
  const lista = document.getElementById('tecnicos-lista');
  if (!lista) return;
  // Exibe técnicos (V1, V2, V3) — exclui master, fiscal (V0) e observador (V4)
  const tecs = Object.entries(usersCache)
    .filter(([id, u]) => u.role !== 'master' && !_isFiscal(u) && !_isObservador(u) && u.name && u.ativo !== false)
    .sort(([a],[b]) => {
      const na = parseInt(a.replace(/\D/g,'')) || 0;
      const nb = parseInt(b.replace(/\D/g,'')) || 0;
      if (na && nb) return na - nb;
      if (na) return 1;
      if (nb) return -1;
      return a.localeCompare(b);
    });
  if (!tecs.length) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:.87rem">Nenhum técnico cadastrado.</p>';
    return;
  }

  // Descobrir meses disponíveis a partir das OS
  const mesesSet = new Set();
  allRecords.forEach(r => { const m = (r.data||'').slice(0,7); if(m) mesesSet.add(m); });
  const meses = [...mesesSet].sort().reverse();
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  if (!_tecMesSelecionado) _tecMesSelecionado = mesAtual;
  const MESES_NOME = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const fmtMesLabel = m => { const [a,mm] = m.split('-'); return `${MESES_NOME[parseInt(mm)-1]} ${a}`; };

  // Seletor de mês
  const seletorMes = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <div style="font-size:.82rem;font-weight:700;color:#374151"><i class="fas fa-calendar-alt" style="margin-right:6px;color:var(--primary)"></i>Período:</div>
      <select id="tec-filtro-mes" onchange="_tecMesSelecionado=this.value;renderTecnicosPage()"
        style="padding:7px 12px;border-radius:8px;border:1px solid var(--border);font-size:.82rem;font-weight:600;background:#f8fafc;min-width:140px">
        ${meses.map(m => `<option value="${m}" ${m===_tecMesSelecionado?'selected':''}>${fmtMesLabel(m)}</option>`).join('')}
      </select>
      <span style="font-size:.75rem;color:var(--muted)">${_tecMesSelecionado === mesAtual ? '(mês atual)' : ''}</span>
    </div>`;

  const mesFiltro = _tecMesSelecionado;
  const dashboard = _tecDashboard(tecs, mesFiltro);
  const cards = tecs.map(([uid, u], idx) => {
    const num = parseInt(uid.replace(/\D/g,'')) || (idx+1);
    const totalOS = allRecords.filter(r => r.userId === uid && (r.data||'').startsWith(mesFiltro)).length;
    if (totalOS === 0) return ''; // não mostra técnico sem OS no mês
    const sf = window.servicosFixos?.[uid];
    const sfHtml = sf
      ? `<div style="margin-top:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <i class="fas fa-plus-circle" style="color:#16a34a;font-size:.82rem"></i>
          <span style="font-size:.8rem;font-weight:700;color:#166534;flex:1">${sf.descricao}</span>
          <span style="font-size:.88rem;font-weight:800;color:#16a34a">R$ ${Number(sf.valor).toFixed(2).replace('.',',')}</span>
          <span style="font-size:.7rem;padding:2px 8px;border-radius:99px;font-weight:700;background:${sf.ativo!==false?'#dcfce7':'#fee2e2'};color:${sf.ativo!==false?'#166534':'#991b1b'}">${sf.ativo!==false?'ATIVO':'INATIVO'}</span>
          <button onclick="_toggleServicoFixo('${uid}',${sf.ativo===false})"
            style="background:${sf.ativo!==false?'#dc2626':'#16a34a'};color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:.72rem;font-weight:700;cursor:pointer">
            ${sf.ativo!==false?'Desativar':'Ativar'}
          </button>
          <button onclick="_removerServicoFixo('${uid}')"
            style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;font-size:.72rem;font-weight:600;cursor:pointer">
            Remover
          </button>
        </div>`
      : `<div style="margin-top:12px">
          <button onclick="_abrirModalServicoFixo('${uid}','${u.name}')"
            style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:8px;padding:7px 14px;font-size:.77rem;font-weight:700;cursor:pointer;width:100%">
            <i class="fas fa-plus"></i> Adicionar Serviço Fixo Mensal
          </button>
        </div>`;
    return `
    <div style="border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:14px;background:#fff">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:#1f4e79;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;color:#fff;flex-shrink:0">${num}</div>
        <div>
          <div style="font-weight:700;font-size:.97rem">${u.name}</div>
          <div style="font-size:.74rem;color:var(--muted)">${totalOS} ordem${totalOS!==1?'s':''} de serviço</div>
        </div>
      </div>
      ${_tecTabela(uid, mesFiltro)}
      ${sfHtml}
    </div>`;
  }).join('');
  lista.innerHTML = seletorMes + dashboard + cards;
  renderDescontosLista();
  // Popula select de técnicos no form de desconto
  const sel = document.getElementById('desc-tec');
  if (sel) {
    const prev = sel.value;
    sel.innerHTML = '<option value="">-- Selecione --</option>' +
      tecs.map(([uid,u]) => `<option value="${uid}">${u.name}</option>`).join('');
    if (prev) sel.value = prev;
  }
}

function renderBonusV2() {
  const wrap = document.getElementById('exp-bonus-v2');
  if (!wrap) return;

  const nivelAtual = currentUser.nivel || 'V1';
  // Visível para supervisores (V2) e master — controle de pagamento bônus V2
  if (!_isAdmin(currentUser) && nivelAtual !== 'V2') { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  // Popular anos no select
  const selAno = document.getElementById('bns-ano');
  if (selAno) {
    const anos = [...new Set(allRecords.map(r => (r.data||'').slice(0,4)).filter(a=>a.length===4))].sort().reverse();
    const prev = selAno.value;
    selAno.innerHTML = '<option value="">Todos</option>' +
      anos.map(a => `<option value="${a}" ${a===prev?'selected':''}>${a}</option>`).join('');
  }

  // Calcula prefixo pelo botão ativo ('atual' ou 'anterior')
  const hoje = new Date();
  const _mesStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const mesVigente  = _mesStr(hoje);
  const mesAnterior = _mesStr(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  const _bnsMes = window._bnsModoAtivo || 'atual';
  const prefixos = [_bnsMes === 'anterior' ? mesAnterior : mesVigente];

  // Destaca o botão ativo
  const btnAtual    = document.getElementById('bns-btn-atual');
  const btnAnterior = document.getElementById('bns-btn-anterior');
  if (btnAtual && btnAnterior) {
    const ativo   = 'background:#1f4e79;color:#fff;border-color:#1f4e79';
    const inativo = '';
    if (_bnsMes === 'anterior') {
      btnAnterior.setAttribute('style', `min-width:120px;${ativo}`);
      btnAtual.setAttribute('style',    `min-width:120px;${inativo}`);
    } else {
      btnAtual.setAttribute('style',    `min-width:120px;${ativo}`);
      btnAnterior.setAttribute('style', `min-width:120px;${inativo}`);
    }
  }

  const _n = s => (s||'').normalize('NFC').trim().toUpperCase();

  // Master (role='master') — nunca entra no controle V1/V2
  const _isMaster = u => _isAdmin(u);

  // Usuários que recebem bônus: nivel=V2, exceto master
  const usersV2 = new Set(
    Object.entries(usersCache)
      .filter(([, u]) => !_isMaster(u) && (u.nivel || 'V1') === 'V2')
      .map(([uid]) => uid)
  );
  // Usuários que participam do controle de pagamento: nivel=V1 ou V2, exceto master
  const usersV1ouV2 = new Set(
    Object.entries(usersCache)
      .filter(([, u]) => {
        if (_isMaster(u)) return false;
        const nv = u.nivel || 'V1';
        return nv === 'V1' || nv === 'V2';
      })
      .map(([uid]) => uid)
  );

  // Agrupa por (tecnico, mesAno, profile, tipo) — granularidade "de cada planilha"
  // Bônus = V2−V1 calculado sobre todos os registros V1 (é o que o supervisor V2 recebe)
  const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const fmtPeriodo = s => { if(!s) return '—'; const [y,m]=s.split('-'); return `${MESES_ABREV[parseInt(m)-1]||m}/${y}`; };
  const map = {};
  allRecords.forEach(r => {
    if (prefixos.length && !prefixos.some(p => (r.data||'').startsWith(p))) return;
    const uid = r.userId || '';
    if (!usersV1ouV2.has(uid)) return;
    if (r.importado && (r.nivelImp || 'V1') === 'V3') return;
    const tec     = r.userName || uid || '—';
    const profile = _n(r.profile) || '—';
    const tipo    = _n(r.tipo)    || '—';
    const mesAno  = (r.data||'').slice(0,7);
    const isV2user = usersV2.has(uid); // apenas para badge visual
    const key     = `${tec}||${mesAno}||${profile}||${tipo}`;
    if (!map[key]) map[key] = { tec, uid, profile, tipo, mesAno, v1: 0, bonus: 0, temBonus: isV2user };
    (r.servicos||[]).forEach(sv => {
      const qtd = Number(sv.qtd) || 0;
      const pV1 = precosV1map[sv.tipo] ?? precosV1map[_normServico(sv.tipo)] ?? 0;
      const pV2 = precosV2map[sv.tipo] ?? precosV2map[_normServico(sv.tipo)] ?? 0;
      map[key].v1    += qtd * pV1;
      // Bônus V2−V1 calculado sobre todos os registros (V1 e V2), exceto master
      map[key].bonus += qtd * (pV2 - pV1);
    });
  });

  const isMasterView = _isAdmin(currentUser);

  let rows;
  if (isMasterView) {
    // Master: agrega por (tec, profile, tipo) — sem coluna de período
    const agg = {};
    Object.values(map).forEach(x => {
      const k = `${x.tec}||${x.profile}||${x.tipo}`;
      if (!agg[k]) agg[k] = { tec:x.tec, uid:x.uid, profile:x.profile, tipo:x.tipo, v1:0, bonus:0, temBonus:x.temBonus };
      agg[k].v1    += x.v1;
      agg[k].bonus += x.bonus;
    });
    rows = Object.values(agg).filter(x => x.v1 > 0 || x.bonus > 0);
    rows.sort((a,b) => {
      if (a.temBonus !== b.temBonus) return a.temBonus ? -1 : 1;
      return a.tec.localeCompare(b.tec) || a.profile.localeCompare(b.profile) || a.tipo.localeCompare(b.tipo);
    });
  } else {
    // V2: granularidade por planilha (mesAno visível) — todos os técnicos, só bônus
    rows = Object.values(map).filter(x => x.v1 > 0 || x.bonus > 0);
    rows.sort((a,b) => {
      if (a.temBonus !== b.temBonus) return a.temBonus ? -1 : 1;
      return (a.mesAno||'').localeCompare(b.mesAno||'') || a.tec.localeCompare(b.tec) || a.profile.localeCompare(b.profile) || a.tipo.localeCompare(b.tipo);
    });
  }

  const fmt = v => `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const totalV1    = rows.reduce((s,x) => s + x.v1,    0);
  const totalBonus = rows.reduce((s,x) => s + x.bonus,  0);
  const totalGeral = totalV1 + totalBonus;

  const tdS = 'padding:8px 10px;font-size:.82rem;border-bottom:1px solid #e5e7eb';
  const thS = 'padding:9px 10px;font-size:.78rem;font-weight:700;text-align:left;white-space:nowrap';

  const tbl = document.getElementById('bns-tabela');
  if (!tbl) return;

  if (!rows.length) {
    tbl.innerHTML = `<p style="color:var(--muted);font-size:.85rem">Nenhum registro encontrado para o período selecionado.</p>`;
    return;
  }

  if (isMasterView) {
    // ── Visão master/V3: tabela completa com V1 + Bônus + Total ──
    tbl.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead style="background:#1557a0;color:#fff">
            <tr>
              <th style="${thS}">Prestador</th>
              <th style="${thS}">Profile</th>
              <th style="${thS}">Tipo</th>
              <th style="${thS};text-align:right;color:#bfdbfe">Serviços</th>
              <th style="${thS};text-align:right;color:#fde68a">Bônus</th>
              <th style="${thS};text-align:right;color:#a7f3d0">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((x, i) => {
              const celBonus = x.bonus > 0
                ? `<td style="${tdS};text-align:right;color:#16a34a;font-weight:700">${fmt(x.bonus)}</td>`
                : `<td style="${tdS};text-align:right;color:#9ca3af">—</td>`;
              return `<tr style="background:${i%2===0?'#f8fafc':'#fff'}">
                <td style="${tdS}">${x.tec}</td>
                <td style="${tdS}">${x.profile}</td>
                <td style="${tdS}">${x.tipo}</td>
                <td style="${tdS};text-align:right;color:#1f4e79;font-weight:600">${fmt(x.v1)}</td>
                ${celBonus}
                <td style="${tdS};text-align:right;color:#7c3aed;font-weight:700">${fmt(x.v1 + x.bonus)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot style="background:#f1f5f9;border-top:2px solid #cbd5e1">
            <tr>
              <td colspan="3" style="padding:9px 10px;font-weight:700;font-size:.82rem">Total Geral</td>
              <td style="padding:9px 10px;text-align:right;font-weight:700;color:#1f4e79">${fmt(totalV1)}</td>
              <td style="padding:9px 10px;text-align:right;font-weight:700;color:#16a34a">${fmt(totalBonus)}</td>
              <td style="padding:9px 10px;text-align:right;font-weight:800;font-size:.9rem;color:#7c3aed">${fmt(totalGeral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin-top:12px;padding:10px 14px;background:#f0fdf4;border-radius:8px;border-left:4px solid #16a34a;font-size:.85rem;display:flex;gap:20px;flex-wrap:wrap;align-items:center">
        <span><b style="color:#1f4e79"><i class="fas fa-wallet"></i> Serviços:</b> <b style="color:#1f4e79">${fmt(totalV1)}</b></span>
        <span><b style="color:#16a34a"><i class="fas fa-star"></i> Bônus total:</b> <b style="color:#15803d">${fmt(totalBonus)}</b></span>
        <span><b style="color:#7c3aed"><i class="fas fa-coins"></i> Total apurado:</b> <b style="color:#6d28d9;font-size:1rem">${fmt(totalGeral)}</b></span>
      </div>
    `;
  } else {
    // ── Visão V2: todos os técnicos, bônus por planilha (mesAno), sem V1 individual ──
    tbl.innerHTML = `
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          <thead style="background:#1557a0;color:#fff">
            <tr>
              <th style="${thS}">Período</th>
              <th style="${thS}">Prestador</th>
              <th style="${thS}">Profile</th>
              <th style="${thS}">Tipo</th>
              <th style="${thS};text-align:right;color:#fde68a">Bônus</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((x, i) => {
              const isOwn = x.uid === currentUser.id;
              const rowBg = isOwn ? '#f0fdf4' : (i%2===0 ? '#f8fafc' : '#fff');
              const youBadge = isOwn ? ' <span style="font-size:.65rem;background:#dcfce7;color:#16a34a;border-radius:4px;padding:1px 5px;font-weight:700">você</span>' : '';
              return `<tr style="background:${rowBg}">
                <td style="${tdS};white-space:nowrap">${fmtPeriodo(x.mesAno)}</td>
                <td style="${tdS}">${x.tec}${youBadge}</td>
                <td style="${tdS}">${x.profile}</td>
                <td style="${tdS}">${x.tipo}</td>
                <td style="${tdS};text-align:right;color:#16a34a;font-weight:700">${x.bonus > 0 ? fmt(x.bonus) : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot style="background:#f1f5f9;border-top:2px solid #cbd5e1">
            <tr>
              <td colspan="4" style="padding:9px 10px;font-weight:700;font-size:.82rem">Total Bônus</td>
              <td style="padding:9px 10px;text-align:right;font-weight:800;font-size:.9rem;color:#16a34a">${fmt(totalBonus)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin-top:12px;padding:10px 14px;background:#f0fdf4;border-radius:8px;border-left:4px solid #16a34a;font-size:.85rem">
        <span><b style="color:#16a34a"><i class="fas fa-star"></i> Total bônus no período:</b>
        <b style="color:#15803d;font-size:1rem;margin-left:8px">${fmt(totalBonus)}</b></span>
      </div>
    `;
  }
}

function setBnsMes(modo) {
  window._bnsModoAtivo = modo; // 'atual' | 'anterior'
  renderBonusV2();
}

function renderMeuDash() {
  const wrap = document.getElementById('meu-dash-content');
  if (!wrap) return;
  // Fiscal tem dashboard próprio
  if (_isFiscal(currentUser)) { renderMeuDashFiscal(wrap); return; }

  // ── Aviso: contrato assinado mas PDF não armazenado → pedir reenvio ──
  if (!_isAdmin(currentUser) && !_isObservador(currentUser)) {
    const uid = currentUser.id;
    db.ref(`contratos/${uid}/prestacaoServicos`).once('value').then(snap => {
      const ps = snap.val();
      if (ps && ps.status === 'assinado' && !ps.pdfBase64) {
        const bannerId = 'banner-reenvio-contrato';
        if (!document.getElementById(bannerId)) {
          const banner = document.createElement('div');
          banner.id = bannerId;
          banner.innerHTML = `
            <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:flex-start;gap:14px">
              <i class="fas fa-exclamation-triangle" style="color:#d97706;font-size:1.3rem;margin-top:2px;flex-shrink:0"></i>
              <div style="flex:1">
                <div style="font-weight:700;font-size:.92rem;color:#92400e;margin-bottom:4px">
                  Reenvio do contrato necessário
                </div>
                <div style="font-size:.82rem;color:#78350f;line-height:1.5;margin-bottom:10px">
                  Seu contrato já foi assinado via gov.br, mas o arquivo PDF assinado não está armazenado em nosso sistema.
                  Para garantir que a versão com autenticação gov.br fique disponível para você e para a empresa,
                  acesse <strong>Meus Documentos</strong> e reenvie o PDF assinado.
                </div>
                <button onclick="showPage('meus-docs')"
                  style="background:#d97706;color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:.81rem;font-weight:700;cursor:pointer">
                  <i class="fas fa-upload"></i> Ir para Meus Documentos
                </button>
              </div>
            </div>`;
          wrap.insertBefore(banner, wrap.firstChild);
        }
      }
    }).catch(() => {});
  }

  const isV2 = (currentUser.nivel || 'V1') === 'V2';
  const uid  = currentUser.id;
  const _n   = s => (s||'').normalize('NFC').trim().toUpperCase();
  const fmt  = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

  // Mês vigente automático (YYYY-MM)
  const hoje    = new Date();
  const anoAtual = String(hoje.getFullYear());
  const mesAtual = String(hoje.getMonth()+1).padStart(2,'0');
  const prefixo  = `${anoAtual}-${mesAtual}`;
  const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesNome  = MESES_NOME[hoje.getMonth()];

  // Registros do próprio técnico no mês vigente
  const myRecs = allRecords.filter(r => r.userId === uid && (r.data||'').startsWith(prefixo));

  // Gestão V2: diferença (V2-V1) de todos os técnicos no mês vigente, exceto admin e registros V3
  const masterUids = new Set(Object.entries(usersCache).filter(([,u])=>_isAdmin(u)).map(([id])=>id));
  // Jefferson é excluído do bônus V2 — identificado pelo nome (ele é V1 no cadastro, mas V3 para importação)
  const v3ImportUids = new Set(Object.entries(usersCache).filter(([,u]) => (u.name||'').toLowerCase()==='jefferson' && u.role!=='master').map(([id])=>id));
  const allMes = isV2 ? allRecords.filter(r =>
    (r.data||'').startsWith(prefixo) &&
    !masterUids.has(r.userId||'') &&
    !v3ImportUids.has(r.userId||'') &&
    !(r.importado && (r.nivelImp||'V1')==='V3')
  ) : [];

  // ── Helpers inline (Finance namespace não está disponível no bundle) ──
  const _calcBonusHonorariosExtra = (recs, v1map, v2map) => {
    let bonus = 0;
    recs.forEach(r => (r.servicos||[]).forEach(sv => {
      const q = Number(sv.qtd)||0;
      if (r.importado && sv.valorV2 !== undefined) {
        bonus += sv.valorV2 - (Number(sv.valor)||0);
      } else {
        bonus += q * ((v2map[sv.tipo]||0) - (v1map[sv.tipo]||0));
      }
    }));
    return bonus;
  };
  const _calcDescontosMes = (cache, pref) => {
    const _mn = s => { const [y,m]=(s||'').split('-').map(Number); return (y||0)*12+(m||0); };
    const mn = _mn(pref);
    const ativos = Object.values(cache).filter(d => {
      if (d.termoAssinado === false) return false;
      const tot = Number(d.parcelas)||1;
      const ini = _mn(d.parcelaInicio || d.mesAno || '');
      return mn >= ini && mn < ini + tot;
    });
    return { ativos, total: ativos.reduce((s,d) => s + +((d.valor/(Number(d.parcelas)||1)).toFixed(2)), 0) };
  };
  const _agruparCombo = recs => {
    const _n2 = s => (s||'').normalize('NFC').trim().toUpperCase();
    const m = {};
    recs.forEach(r => {
      const k = `${_n2(r.profile)}||${_n2(r.tipo)}`;
      if (!m[k]) m[k] = { profile: _n2(r.profile), tipo: _n2(r.tipo), v1: 0 };
      m[k].v1 += r.total || 0;
    });
    return m;
  };
  const _calcBonusByCombo = (recs, v1map, v2map) => {
    const _n2 = s => (s||'').normalize('NFC').trim().toUpperCase();
    const m = {};
    recs.forEach(r => {
      const k = `${_n2(r.profile)}||${_n2(r.tipo)}`;
      if (!m[k]) m[k] = { g: 0 };
      (r.servicos||[]).forEach(sv => {
        const q = Number(sv.qtd)||0;
        if (r.importado && sv.valorV2 !== undefined) {
          m[k].g += sv.valorV2 - (Number(sv.valor)||0);
        } else {
          m[k].g += q * ((v2map[sv.tipo]||0) - (v1map[sv.tipo]||0));
        }
      });
    });
    return m;
  };
  const _agruparCidade = recs => {
    const m = {};
    recs.forEach(r => { const c=r.cidade||'—'; if(!m[c])m[c]={qtd:0,total:0}; m[c].qtd++; m[c].total+=r.total||0; });
    return m;
  };
  const _agruparServico = recs => {
    const m = {};
    recs.forEach(r => (r.servicos||[]).forEach(sv => {
      const t=sv.tipo||'—'; if(!m[t])m[t]={qtd:0,total:0};
      m[t].qtd+=Number(sv.qtd)||0; m[t].total+=(Number(sv.qtd)||0)*(Number(sv.valor)||0);
    }));
    return m;
  };

  // ── Totais gerais ──
  const totalV1 = myRecs.reduce((s, r) => s + (r.total || 0), 0);
  const totalGestao = isV2 ? _calcBonusHonorariosExtra(allMes, precosV1map, precosV2map) : 0;
  const totalGeral = totalV1 + totalGestao;

  // ── OS Pendentes de Validação do Fiscal ──
  const osPendentesValMes = myRecs.filter(r => r.validacaoFiscal === 'pendente');
  const totalPendenteVal  = osPendentesValMes.reduce((s,r) => s + (r.total||0), 0);
  const diaHoje = hoje.getDate();
  const alertaCriticoVal = false;
  const alertaAproximandoVal = false;
  const nomeMesProximo = MESES_NOME[hoje.getMonth() === 11 ? 0 : hoje.getMonth() + 1];

  // ── Descontos & Parcelamentos ativos no mês vigente ──
  const { ativos: descontosMesAtivo, total: totalDescontoMes } = _calcDescontosMes(descontosCache, prefixo);
  const totalLiquido = totalGeral - totalDescontoMes;

  // ── Por Profile × Tipo ──
  const byCombo = _agruparCombo(myRecs);
  const byComboGestao = isV2 ? _calcBonusByCombo(allMes, precosV1map, precosV2map) : {};

  // ── Resumo por Cidade ──
  const cMap = _agruparCidade(myRecs);
  const cidadeRows = Object.entries(cMap).sort((a,b) => b[1].total - a[1].total)
    .map(([c,v]) => `<tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:8px 12px;font-size:.82rem">${c}</td>
      <td style="padding:8px 12px;font-size:.82rem;text-align:center">${v.qtd}</td>
      <td style="padding:8px 12px;font-size:.82rem;text-align:right;font-weight:700;color:#16a34a">${fmt(v.total)}</td>
    </tr>`).join('');

  // ── Resumo por Serviço ──
  const sMap = _agruparServico(myRecs);
  const servicoRows = Object.entries(sMap).sort((a,b) => b[1].total - a[1].total)
    .map(([s,v]) => `<tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:8px 12px;font-size:.82rem">${s}</td>
      <td style="padding:8px 12px;font-size:.82rem;text-align:center">${v.qtd}</td>
      <td style="padding:8px 12px;font-size:.82rem;text-align:right;font-weight:700;color:#16a34a">${fmt(v.total)}</td>
    </tr>`).join('');

  const thS = 'padding:9px 12px;font-size:.78rem;font-weight:700;text-align:left;white-space:nowrap';
  const tdS = 'padding:8px 12px;font-size:.82rem;border-bottom:1px solid #e5e7eb';

  // Combina todos os keys (próprios + gestão) para a tabela
  const allKeys = [...new Set([...Object.keys(byCombo), ...Object.keys(byComboGestao)])];
  const comboRows = allKeys.map((key,i) => {
    const c  = byCombo[key]        || { profile: key.split('||')[0], tipo: key.split('||')[1], v1:0 };
    const g  = byComboGestao[key]?.g || 0;
    return `<tr style="background:${i%2===0?'#f8fafc':'#fff'}">
      <td style="${tdS}">${c.profile}</td>
      <td style="${tdS}">${c.tipo}</td>
      <td style="${tdS};text-align:right;color:#1f4e79;font-weight:600">${fmt(c.v1)}</td>
      ${isV2?`<td style="${tdS};text-align:right;color:#16a34a;font-weight:700">${fmt(g)}</td>`:''}
      ${isV2?`<td style="${tdS};text-align:right;color:#7c3aed;font-weight:700">${fmt(c.v1+g)}</td>`:''}
    </tr>`;
  }).join('');

  // ── Escolha de pagamento mensal (Opção A / B) ──
  // Filtra descontos ativos do mês atual pertencentes ao usuário corrente
  const descontosComEscolha = Object.entries(descontosCache)
    .filter(([, d]) => {
      if (d.uid && d.uid !== uid) return false;     // só os do prestador atual
      if (d.termoAssinado === false) return false;   // pendente de assinatura
      const tot = Number(d.parcelas) || 1;
      const ini = d.parcelaInicio || d.mesAno || '';
      if (!ini) return false;
      const diff = mesAtualNum - _mesAnoNum(ini) + 1;
      return diff >= 1 && diff <= tot;               // apenas os ativos este mês
    })
    .map(([fbKey, d]) => ({ fbKey, d }));

  const escolhaCards = descontosComEscolha.map(({ fbKey, d }) => {
    const escolha = d.escolhas?.[prefixo];
    const vlrParc = +((d.valor / (Number(d.parcelas)||1)).toFixed(2));
    const fmt2 = v => 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    if (escolha === 'A') {
      return `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;
        background:#fff7ed;border:2px solid #f97316;border-radius:10px;margin-bottom:10px">
        <i class="fas fa-check-circle" style="color:#f97316;font-size:1.1rem"></i>
        <div style="flex:1">
          <div style="font-size:.78rem;font-weight:700;color:#7c2d12">${d.motivo||'Desconto'}</div>
          <div style="font-size:.82rem;color:#9a3412;margin-top:2px">
            ✅ <strong>Opção A</strong> — Desconto no honorário (${fmt2(vlrParc)})
          </div>
        </div>
        <button onclick="escolherOpcaoPagamento('${fbKey}','B')"
          style="font-size:.72rem;padding:5px 10px;border:1px solid #f97316;
          background:#fff;border-radius:6px;cursor:pointer;color:#c2410c;white-space:nowrap">
          Trocar para B
        </button>
      </div>`;
    } else if (escolha === 'B') {
      return `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;
        background:#eff6ff;border:2px solid #3b82f6;border-radius:10px;margin-bottom:10px">
        <i class="fas fa-check-circle" style="color:#3b82f6;font-size:1.1rem"></i>
        <div style="flex:1">
          <div style="font-size:.78rem;font-weight:700;color:#1e3a5f">${d.motivo||'Desconto'}</div>
          <div style="font-size:.82rem;color:#1d4ed8;margin-top:2px">
            ✅ <strong>Opção B</strong> — Pagamento via PIX direto
          </div>
        </div>
        <button onclick="escolherOpcaoPagamento('${fbKey}','A')"
          style="font-size:.72rem;padding:5px 10px;border:1px solid #3b82f6;
          background:#fff;border-radius:6px;cursor:pointer;color:#1d4ed8;white-space:nowrap">
          Trocar para A
        </button>
      </div>`;
    } else {
      // Sem escolha — exibe os dois botões
      return `<div style="padding:14px;background:#fefce8;border:2px solid #eab308;
        border-radius:10px;margin-bottom:10px">
        <div style="font-size:.78rem;font-weight:700;color:#713f12;margin-bottom:8px">
          ⏳ ${d.motivo||'Desconto'} — Escolha sua modalidade para ${prefixo}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button onclick="escolherOpcaoPagamento('${fbKey}','A')"
            style="padding:12px 8px;background:#fff7ed;border:2px solid #f97316;border-radius:8px;
            cursor:pointer;font-size:.8rem;font-weight:700;color:#c2410c;text-align:center">
            <div style="font-size:1rem;margin-bottom:4px">🔶 Opção A</div>
            <div style="font-weight:800">Desconto no honorário</div>
            <div style="font-size:.7rem;color:#9a3412;margin-top:4px">-${fmt2(vlrParc)} neste mês</div>
          </button>
          <button onclick="escolherOpcaoPagamento('${fbKey}','B')"
            style="padding:12px 8px;background:#eff6ff;border:2px solid #3b82f6;border-radius:8px;
            cursor:pointer;font-size:.8rem;font-weight:700;color:#1d4ed8;text-align:center">
            <div style="font-size:1rem;margin-bottom:4px">🔷 Opção B</div>
            <div style="font-weight:800">Pagamento via PIX</div>
            <div style="font-size:.7rem;color:#1e40af;margin-top:4px">Sem desconto no honorário</div>
          </button>
        </div>
      </div>`;
    }
  }).join('');

  // ── Linhas da tabela Descontos & Parcelamentos ──
  const todosDescontos = Object.values(descontosCache)
    .sort((a,b) => (a.parcelaInicio||a.mesAno||'').localeCompare(b.parcelaInicio||b.mesAno||''));
  const descRows = todosDescontos.map((d, i) => {
    const tot = Number(d.parcelas) || 1;
    const vlrParc = +(d.valor / tot).toFixed(2);
    const ini  = d.parcelaInicio || d.mesAno || '';
    const pend = d.termoAssinado === false;
    let pLabel, sLabel, sColor, sBg;
    if (pend) {
      pLabel = tot > 1 ? `—/${tot}` : '—/1';
      sLabel = '⏳ Pend. assinatura'; sColor = '#92400e'; sBg = '#fef3c7';
    } else if (!ini) {
      pLabel = `1/${tot}`;
      sLabel = '✔ Ativo'; sColor = '#14532d'; sBg = '#dcfce7';
    } else {
      const diff = mesAtualNum - _mesAnoNum(ini) + 1;
      pLabel = `${Math.min(Math.max(diff,1),tot)}/${tot}`;
      if (diff < 1)        { sLabel = '⏰ Futuro';  sColor = '#1e3a5f'; sBg = '#dbeafe'; }
      else if (diff > tot) { sLabel = '✓ Quitado'; sColor = '#166534'; sBg = '#f0fdf4'; }
      else                 { sLabel = '✔ Ativo';   sColor = '#14532d'; sBg = '#dcfce7'; }
    }
    return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="${tdS}">${d.motivo||'—'}</td>
      <td style="${tdS};text-align:center;font-weight:700;color:#1f4e79">${pLabel}</td>
      <td style="${tdS};text-align:right;font-weight:800;color:${pend?'#94a3b8':'#dc2626'}">
        ${pend?'—':'-'+fmt(vlrParc)}${tot>1&&!pend?`<br><span style="font-size:.7rem;color:#94a3b8">total ${fmt(d.valor)}</span>`:''}
      </td>
      <td style="${tdS};text-align:center">
        <span style="font-size:.68rem;background:${sBg};color:${sColor};padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">${sLabel}</span>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <!-- Cabeçalho do período -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="background:#1f4e79;color:#fff;border-radius:8px;padding:8px 16px;font-size:.85rem;font-weight:700">
        <i class="fas fa-calendar-check"></i> ${mesNome} ${anoAtual}
      </div>
      <span style="font-size:.8rem;color:var(--muted)">Os valores zeram a cada início de mês</span>
    </div>

    <!-- Alerta de OS Pendentes de Validação -->
    ${osPendentesValMes.length>0?`
    <div style="background:#eff6ff;
      border:1px solid #bfdbfe;
      border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:flex-start;gap:10px">
      <i class="fas fa-info-circle"
        style="color:#1f4e79;margin-top:2px;font-size:1rem;flex-shrink:0"></i>
      <div>
        <div style="font-weight:700;font-size:.84rem;color:#1e3a5f;margin-bottom:3px">
          📋 OS aguardando validação da Gestão
        </div>
        <div style="font-size:.81rem;color:#1f4e79">
          <strong>${osPendentesValMes.length} OS</strong> pendentes · valor total:
          <strong>${fmt(totalPendenteVal)}</strong>
           — prazo para validação: <strong>dia 10 de ${nomeMesProximo}</strong>.
        </div>
      </div>
    </div>`:''}

    <!-- Cards de resumo -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px">
      <div style="background:#eff6ff;border-radius:12px;padding:18px 20px;border-left:4px solid #1f4e79">
        <div style="font-size:.75rem;font-weight:700;color:#1f4e79;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-wallet"></i> Rendimentos
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#1f4e79">${fmt(totalV1)}</div>
      </div>
      ${isV2?`
      <div style="background:#f0fdf4;border-radius:12px;padding:18px 20px;border-left:4px solid #16a34a">
        <div style="font-size:.75rem;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-coins"></i> Honorários Extra
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#16a34a">${fmt(totalGestao)}</div>
      </div>
      <div style="background:#faf5ff;border-radius:12px;padding:18px 20px;border-left:4px solid #7c3aed">
        <div style="font-size:.75rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-coins"></i> ${totalDescontoMes>0?'Total Bruto':'Total Geral'}
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#7c3aed">${fmt(totalGeral)}</div>
      </div>`:''}
      ${totalDescontoMes>0?`
      <div style="background:#fff1f2;border-radius:12px;padding:18px 20px;border-left:4px solid #dc2626">
        <div style="font-size:.75rem;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-minus-circle"></i> Descontos
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#dc2626">-${fmt(totalDescontoMes)}</div>
      </div>
      <div style="background:#f0fdf4;border-radius:12px;padding:18px 20px;border-left:4px solid #059669">
        <div style="font-size:.75rem;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-check-circle"></i> Total Líquido
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#059669">${fmt(totalLiquido)}</div>
      </div>`:''}
    </div>

    <!-- Por Profile × Tipo -->
    <div class="card">
      <div class="card-title"><i class="fas fa-layer-group"></i> Detalhamento por Profile e Tipo</div>
      ${comboRows ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead style="background:#1f4e79;color:#fff">
          <tr>
            <th style="${thS}">Profile</th>
            <th style="${thS}">Tipo</th>
            <th style="${thS};text-align:right">Rendimentos</th>
            ${isV2?`<th style="${thS};text-align:right;color:#86efac">Hon. Extra</th>`:''}
            ${isV2?`<th style="${thS};text-align:right;color:#d8b4fe">Total</th>`:''}
          </tr>
        </thead>
        <tbody>${comboRows}</tbody>
        <tfoot style="background:#f1f5f9;border-top:2px solid #cbd5e1">
          <tr>
            <td colspan="2" style="padding:9px 12px;font-weight:700;font-size:.82rem">${totalDescontoMes>0?'Total Bruto':'Total'}</td>
            <td style="padding:9px 12px;text-align:right;font-weight:700;color:#1f4e79">${fmt(totalV1)}</td>
            ${isV2?`<td style="padding:9px 12px;text-align:right;font-weight:700;color:#16a34a">${fmt(totalGestao)}</td>`:''}
            ${isV2?`<td style="padding:9px 12px;text-align:right;font-weight:700;color:#7c3aed">${fmt(totalGeral)}</td>`:''}
          </tr>
          ${totalDescontoMes>0?`
          <tr style="background:#fff1f2">
            <td colspan="${isV2?4:2}" style="padding:8px 12px;font-size:.8rem;color:#dc2626;font-weight:700;white-space:nowrap">
              <i class="fas fa-minus-circle"></i> Descontos / Parcelamentos
            </td>
            <td style="padding:8px 12px;text-align:right;font-weight:800;color:#dc2626">-${fmt(totalDescontoMes)}</td>
          </tr>
          <tr style="background:#f0fdf4;border-top:2px solid #86efac">
            <td colspan="${isV2?4:2}" style="padding:9px 12px;font-weight:800;font-size:.85rem;color:#059669">
              <i class="fas fa-check-circle"></i> Total Líquido
            </td>
            <td style="padding:9px 12px;text-align:right;font-weight:800;color:#059669;font-size:.95rem">${fmt(totalLiquido)}</td>
          </tr>`:''}
        </tfoot>
      </table></div>` : `<p style="color:var(--muted);font-size:.85rem">Nenhum registro lançado em ${mesNome}.</p>`}
    </div>

    <!-- Descontos & Parcelamentos -->
    ${todosDescontos.length?`
    <div class="card">
      <div class="card-title"><i class="fas fa-hand-holding-usd" style="color:#dc2626"></i> Descontos &amp; Parcelamentos</div>
      ${totalDescontoMes>0?`
      <div style="background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <i class="fas fa-exclamation-circle" style="color:#dc2626;font-size:1rem"></i>
        <span style="font-size:.84rem;color:#991b1b;font-weight:600">
          Desconto de <strong>-${fmt(totalDescontoMes)}</strong> aplicado neste mês &nbsp;·&nbsp; Total Líquido: <strong style="color:#059669">${fmt(totalLiquido)}</strong>
        </span>
      </div>`:''}
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead style="background:#b91c1c;color:#fff">
          <tr>
            <th style="${thS}">Descrição</th>
            <th style="${thS};text-align:center">Parcela</th>
            <th style="${thS};text-align:right">Valor / Parcela</th>
            <th style="${thS};text-align:center">Status neste mês</th>
          </tr>
        </thead>
        <tbody>${descRows}</tbody>
        ${totalDescontoMes>0?`
        <tfoot style="background:#fff1f2;border-top:2px solid #fca5a5">
          <tr>
            <td colspan="2" style="padding:8px 12px;font-weight:700;font-size:.8rem;color:#b91c1c">Total descontado neste mês</td>
            <td style="padding:8px 12px;text-align:right;font-weight:800;color:#dc2626">-${fmt(totalDescontoMes)}</td>
            <td></td>
          </tr>
        </tfoot>`:''}
      </table></div>
    </div>`:''}

    <!-- Escolha Mensal de Modalidade de Pagamento -->
    ${escolhaCards ? `
    <div class="card" style="border-top:3px solid #eab308">
      <div class="card-title">
        <i class="fas fa-hand-point-right" style="color:#ca8a04"></i>
        Escolha do Mês — Modalidade de Pagamento (${prefixo})
      </div>
      <p style="font-size:.8rem;color:var(--muted);margin-bottom:12px">
        Para cada parcela ativa, escolha a modalidade de quitação deste mês.
        Sem escolha até o prazo → <strong>Opção A</strong> aplicada automaticamente.
      </p>
      ${escolhaCards}
    </div>` : ''}

    <!-- Apuração de Bônus (visível apenas para V2/V3/master via renderBonusV2) -->
    <div id="exp-bonus-v2" style="display:none">
      <div class="card">
        <div class="card-title"><i class="fas fa-coins" style="color:#f59e0b"></i> Apuração de Bônus</div>
        <div style="display:flex;gap:10px;margin-bottom:16px">
          <button id="bns-btn-atual" class="btn btn-primary btn-sm" onclick="setBnsMes('atual')" style="min-width:120px">
            <i class="fas fa-calendar-check"></i> Mês Atual
          </button>
          <button id="bns-btn-anterior" class="btn btn-secondary btn-sm" onclick="setBnsMes('anterior')" style="min-width:120px">
            <i class="fas fa-calendar-alt"></i> Mês Anterior
          </button>
        </div>
        <div id="bns-tabela"></div>
      </div>
    </div>

    <!-- Resumo por Cidade -->
    <div class="card">
      <div class="card-title"><i class="fas fa-map-marker-alt"></i> Resumo por Cidade</div>
      ${cidadeRows ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead style="background:var(--primary);color:#fff">
          <tr>
            <th style="${thS}">Cidade</th>
            <th style="${thS};text-align:center">OS</th>
            <th style="${thS};text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${cidadeRows}</tbody>
      </table></div>` : `<p style="color:var(--muted);font-size:.85rem">Sem OS registradas em ${mesNome}.</p>`}
    </div>

    <!-- Resumo por Serviço -->
    <div class="card">
      <div class="card-title"><i class="fas fa-tools"></i> Resumo por Serviço</div>
      ${servicoRows ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead style="background:var(--primary);color:#fff">
          <tr>
            <th style="${thS}">Serviço</th>
            <th style="${thS};text-align:center">Qtde</th>
            <th style="${thS};text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${servicoRows}</tbody>
      </table></div>` : `<p style="color:var(--muted);font-size:.85rem">Sem OS registradas em ${mesNome}.</p>`}
    </div>
  `;

  // Preenche a tabela de bônus (visibilidade controlada internamente por renderBonusV2)
  renderBonusV2();
}

function renderMeuDashFiscal(wrap) {
  const fmt = v => `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const hoje = new Date();
  const prefixo = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesNome = MESES[hoje.getMonth()];
  const anoAtual = String(hoje.getFullYear());
  const uid = currentUser.id;

  // Cálculo de descontos do mês
  const _mesAnoNum = s => { const [y,m]=(s||'').split('-').map(Number); return (y||0)*12+(m||0); };
  const mesAtualNum = _mesAnoNum(prefixo);
  const descontosMesAtivo = Object.values(descontosCache).filter(d => {
    if (d.termoAssinado === false) return false;
    const tot = Number(d.parcelas) || 1;
    const ini = d.parcelaInicio || d.mesAno || '';
    if (!ini) return false;
    const diff = mesAtualNum - _mesAnoNum(ini) + 1;
    return diff >= 1 && diff <= tot;
  });
  const totalDescontoMes = descontosMesAtivo.reduce((s,d) => s + +(d.valor/(Number(d.parcelas)||1)).toFixed(2), 0);
  const totalLiquido = SALARIO_V0 - totalDescontoMes;

  // Mês anterior
  const dAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const prefixoAnt = `${dAnt.getFullYear()}-${String(dAnt.getMonth()+1).padStart(2,'0')}`;
  const mesNomeAnt = MESES[dAnt.getMonth()];

  // UIDs de admin/fiscal/master/sem-login — excluídos da contagem de OS para o Fiscal
  const excluirUids = new Set(
    Object.entries(usersCache).filter(([,u]) => _isAdmin(u) || _isFiscal(u) || _isObservador(u) || u?.role === 'master' || u.firstLogin).map(([id]) => id)
  );

  // OS dos dois meses visíveis ao Fiscal (atual + anterior) — exclui master
  const osDoisMeses = allRecords.filter(r => {
    const d = r.data || '';
    return (d.startsWith(prefixo) || d.startsWith(prefixoAnt)) && !excluirUids.has(r.userId || '');
  });

  // Mês atual — importadas concluídas contam como validadas (não aparecem como pendentes)
  const osMes    = osDoisMeses.filter(r => (r.data||'').startsWith(prefixo));
  const osValidadas = osMes.filter(r => r.validacaoFiscal === 'validada' || _isImportadaConcluida(r));
  // Retrocompat: sem campo = ainda não validada na visão do Fiscal
  const osPendentes = osMes.filter(r => r.validacaoFiscal !== 'validada' && !_isImportadaConcluida(r));

  // Mês anterior — mesma lógica
  const osMesAnt    = osDoisMeses.filter(r => (r.data||'').startsWith(prefixoAnt));
  const osValidadasAnt = osMesAnt.filter(r => r.validacaoFiscal === 'validada' || _isImportadaConcluida(r));
  const osPendentesAnt = osMesAnt.filter(r => r.validacaoFiscal !== 'validada' && !_isImportadaConcluida(r));

  // Total pendentes (ambos os meses)
  const totalPendentes = osPendentes.length + osPendentesAnt.length;

  // Agrupar pendentes por técnico (ambos os meses)
  const pendPorTec = {};
  [...osPendentes, ...osPendentesAnt].forEach(r => {
    const tecNome = usersCache[r.userId]?.name || r.userName || r.userId || '—';
    const mes = (r.data||'').slice(0,7);
    const key = r.userId || tecNome;
    if (!pendPorTec[key]) pendPorTec[key] = { nome: tecNome, atual: 0, anterior: 0 };
    if (mes === prefixo)    pendPorTec[key].atual++;
    else                    pendPorTec[key].anterior++;
  });

  const diaAtual = hoje.getDate();
  // REGRA: prazo do fiscal = dia 10 do MÊS SEGUINTE ao mês da OS
  // OS do mês anterior → prazo dia 10 do mês atual (pode ser urgente)
  // OS do mês atual → prazo dia 10 do próximo mês (nunca urgente agora)
  const alertaUrgente = diaAtual >= 8 && osPendentesAnt.length > 0;

  const tdS = 'padding:8px 12px;font-size:.82rem;border-bottom:1px solid #e5e7eb';
  const thS = 'padding:9px 12px;font-size:.78rem;font-weight:700;text-align:left;white-space:nowrap';

  // Descontos & Parcelamentos
  const todosDescontos = Object.values(descontosCache)
    .sort((a,b) => (a.parcelaInicio||a.mesAno||'').localeCompare(b.parcelaInicio||b.mesAno||''));
  const descRows = todosDescontos.map((d,i) => {
    const tot = Number(d.parcelas)||1;
    const vlrParc = +(d.valor/tot).toFixed(2);
    const ini = d.parcelaInicio||d.mesAno||'';
    const pend = d.termoAssinado === false;
    let pLabel,sLabel,sColor,sBg;
    if (pend) { pLabel=tot>1?`—/${tot}`:'—/1'; sLabel='⏳ Pend. assinatura'; sColor='#92400e'; sBg='#fef3c7'; }
    else if (!ini) { pLabel=`1/${tot}`; sLabel='✔ Ativo'; sColor='#14532d'; sBg='#dcfce7'; }
    else {
      const diff = mesAtualNum - _mesAnoNum(ini) + 1;
      pLabel=`${Math.min(Math.max(diff,1),tot)}/${tot}`;
      if (diff<1){sLabel='⏰ Futuro';sColor='#1e3a5f';sBg='#dbeafe';}
      else if(diff>tot){sLabel='✓ Quitado';sColor='#166534';sBg='#f0fdf4';}
      else{sLabel='✔ Ativo';sColor='#14532d';sBg='#dcfce7';}
    }
    return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="${tdS}">${d.motivo||'—'}</td>
      <td style="${tdS};text-align:center;font-weight:700;color:#1f4e79">${pLabel}</td>
      <td style="${tdS};text-align:right;font-weight:800;color:${pend?'#94a3b8':'#dc2626'}">
        ${pend?'—':'-'+fmt(vlrParc)}${tot>1&&!pend?`<br><span style="font-size:.7rem;color:#94a3b8">total ${fmt(d.valor)}</span>`:''}
      </td>
      <td style="${tdS};text-align:center">
        <span style="font-size:.68rem;background:${sBg};color:${sColor};padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">${sLabel}</span>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div id="fiscal-dash-alertas"></div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="background:#854d0e;color:#fff;border-radius:8px;padding:8px 16px;font-size:.85rem;font-weight:700">
        <i class="fas fa-search"></i> ${mesNome} ${anoAtual} — Gestão
      </div>
      <span style="font-size:.8rem;color:var(--muted)">Honorários mensais</span>
    </div>

    <!-- Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px">
      <div style="background:#fefce8;border-radius:12px;padding:18px 20px;border-left:4px solid #854d0e">
        <div style="font-size:.75rem;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-wallet"></i> Honorários
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#854d0e">${fmt(SALARIO_V0)}</div>
      </div>
      ${totalDescontoMes>0?`
      <div style="background:#fff1f2;border-radius:12px;padding:18px 20px;border-left:4px solid #dc2626">
        <div style="font-size:.75rem;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-minus-circle"></i> Descontos
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#dc2626">-${fmt(totalDescontoMes)}</div>
      </div>`:''}
      <div style="background:#f0fdf4;border-radius:12px;padding:18px 20px;border-left:4px solid #059669">
        <div style="font-size:.75rem;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-check-circle"></i> Total Líquido
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#059669">${fmt(totalLiquido)}</div>
      </div>
      <div style="background:#eff6ff;border-radius:12px;padding:18px 20px;border-left:4px solid #1f4e79">
        <div style="font-size:.75rem;font-weight:700;color:#1f4e79;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-clipboard-check"></i> OS Validadas (mês atual)
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:#1f4e79">${osValidadas.length}</div>
        <div style="font-size:.72rem;color:#94a3b8">${osValidadasAnt.length} no mês anterior</div>
      </div>
      <div style="background:${totalPendentes>0?(alertaUrgente?'#fff1f2':'#fffbeb'):'#f0fdf4'};border-radius:12px;padding:18px 20px;border-left:4px solid ${totalPendentes>0?(alertaUrgente?'#dc2626':'#d97706'):'#16a34a'}">
        <div style="font-size:.75rem;font-weight:700;color:${totalPendentes>0?(alertaUrgente?'#dc2626':'#d97706'):'#16a34a'};text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">
          <i class="fas fa-${totalPendentes>0?(alertaUrgente?'exclamation-circle':'clock'):'check-double'}"></i> OS Pendentes
        </div>
        <div style="font-size:1.35rem;font-weight:800;color:${totalPendentes>0?(alertaUrgente?'#dc2626':'#d97706'):'#16a34a'}">${totalPendentes}</div>
        <div style="font-size:.72rem;color:#94a3b8">${osPendentes.length} atual · ${osPendentesAnt.length} anterior</div>
      </div>
    </div>

    <!-- Seção de OS Pendentes por Técnico -->
    ${totalPendentes > 0 ? `
    <div class="card" style="border-left:4px solid ${alertaUrgente?'#dc2626':'#d97706'}">
      <div class="card-title" style="color:${alertaUrgente?'#dc2626':'#92400e'}">
        <i class="fas fa-${alertaUrgente?'exclamation-triangle':'clock'}"></i>
        OS Pendentes de Validação
        <span style="font-size:.75rem;font-weight:400;color:#94a3b8;margin-left:8px">${totalPendentes} no total</span>
      </div>
      ${alertaUrgente ? `
      <div style="background:#fff1f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:8px">
        <i class="fas fa-exclamation-circle" style="color:#dc2626"></i>
        <span style="font-size:.83rem;color:#991b1b;font-weight:600">
          Atenção: OS de <strong>${mesNomeAnt}</strong> não validadas até o dia <strong>10 de ${mesNome}</strong> serão abatidas do pagamento!
          ${diaAtual >= 10 ? '<br><strong>O prazo do mês anterior já passou. Valide imediatamente.</strong>' : ''}
        </span>
      </div>` : ''}
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead style="background:${alertaUrgente?'#dc2626':'#d97706'};color:#fff">
            <tr>
              <th style="${thS}">Prestador</th>
              <th style="${thS};text-align:center">${mesNome} (atual)</th>
              <th style="${thS};text-align:center">${mesNomeAnt} (anterior)</th>
              <th style="${thS};text-align:center">Total</th>
              <th style="${thS};text-align:center">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(pendPorTec).sort((a,b) => (b.atual+b.anterior)-(a.atual+a.anterior)).map((t,i) => `
            <tr style="background:${i%2===0?'#fff':'#fafafa'}">
              <td style="${tdS};font-weight:700">${t.nome}</td>
              <td style="${tdS};text-align:center">
                ${t.atual > 0 ? `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:8px;font-weight:700">${t.atual} OS</span>` : '<span style="color:#cbd5e1">—</span>'}
              </td>
              <td style="${tdS};text-align:center">
                ${t.anterior > 0 ? `<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:8px;font-weight:700">${t.anterior} OS</span>` : '<span style="color:#cbd5e1">—</span>'}
              </td>
              <td style="${tdS};text-align:center;font-weight:800;color:${alertaUrgente?'#dc2626':'#d97706'}">${t.atual+t.anterior}</td>
              <td style="${tdS};text-align:center">
                <button onclick="showPage('fiscalizacao')"
                  style="background:${alertaUrgente?'#dc2626':'#d97706'};color:#fff;border:none;border-radius:7px;padding:5px 12px;font-size:.75rem;font-weight:700;cursor:pointer">
                  <i class="fas fa-search"></i> Validar
                </button>
              </td>
            </tr>`).join('')}
          </tbody>
          <tfoot style="background:#f1f5f9;border-top:2px solid ${alertaUrgente?'#fca5a5':'#fde68a'}">
            <tr>
              <td style="padding:8px 12px;font-weight:700;font-size:.8rem">Total</td>
              <td style="padding:8px 12px;text-align:center;font-weight:800;color:#92400e">${osPendentes.length > 0 ? osPendentes.length : '—'}</td>
              <td style="padding:8px 12px;text-align:center;font-weight:800;color:#991b1b">${osPendentesAnt.length > 0 ? osPendentesAnt.length : '—'}</td>
              <td style="padding:8px 12px;text-align:center;font-weight:800;color:${alertaUrgente?'#dc2626':'#d97706'}">${totalPendentes}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>` : `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
      <i class="fas fa-check-double" style="color:#16a34a;font-size:1.1rem"></i>
      <span style="font-size:.88rem;color:#14532d;font-weight:600">Todas as OS dos meses atual e anterior estão validadas.</span>
    </div>`}

    ${todosDescontos.length?`
    <div class="card">
      <div class="card-title"><i class="fas fa-hand-holding-usd" style="color:#dc2626"></i> Descontos &amp; Parcelamentos</div>
      ${totalDescontoMes>0?`
      <div style="background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <i class="fas fa-exclamation-circle" style="color:#dc2626"></i>
        <span style="font-size:.84rem;color:#991b1b;font-weight:600">
          Desconto de <strong>-${fmt(totalDescontoMes)}</strong> aplicado neste mês &nbsp;·&nbsp; Total Líquido: <strong style="color:#059669">${fmt(totalLiquido)}</strong>
        </span>
      </div>`:''}
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead style="background:#b91c1c;color:#fff"><tr>
          <th style="${thS}">Descrição</th>
          <th style="${thS};text-align:center">Parcela</th>
          <th style="${thS};text-align:right">Valor / Parcela</th>
          <th style="${thS};text-align:center">Status neste mês</th>
        </tr></thead>
        <tbody>${descRows}</tbody>
        ${totalDescontoMes>0?`
        <tfoot style="background:#fff1f2;border-top:2px solid #fca5a5">
          <tr>
            <td colspan="2" style="padding:8px 12px;font-weight:700;font-size:.8rem;color:#b91c1c">Total descontado neste mês</td>
            <td style="padding:8px 12px;text-align:right;font-weight:800;color:#dc2626">-${fmt(totalDescontoMes)}</td>
            <td></td>
          </tr>
        </tfoot>`:''}
      </table></div>
    </div>`:''}
  `;

  // Carrega alertas de vencimento assíncronamente
  _renderBannerAlertasFiscalDash();
}

function renderObservadorDash() {
  const wrap = document.getElementById('obs-dash-stats');
  const lista = document.getElementById('obs-dash-lista');
  const profileEl = document.getElementById('obs-dash-profile');
  if (!wrap || !lista) return;

  const profileVinc = currentUser?.profileVinculado || '';
  if (profileEl) {
    profileEl.innerHTML = `<div style="display:inline-flex;align-items:center;gap:8px;background:#e0f2fe;padding:6px 14px;border-radius:8px;font-size:.85rem;font-weight:700;color:#0e7490">
      <i class="fas fa-map-marker-alt"></i> Profile: ${profileVinc || '<span style="color:#dc2626">não definido</span>'}
    </div>`;
  }

  if (!profileVinc) {
    wrap.innerHTML = '<div style="padding:20px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;color:#92400e;font-size:.88rem"><i class="fas fa-exclamation-triangle"></i> Nenhum profile vinculado. Solicite ao administrador que defina seu profile.</div>';
    lista.innerHTML = '';
    return;
  }

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  const recsProfile = allRecords.filter(r => (r.profile||'').toUpperCase() === profileVinc.toUpperCase());
  const recsMes = recsProfile.filter(r => (r.data||'').startsWith(mesAtual));

  // Excluir admin/fiscal/observador da contagem de técnicos
  const excludeUids = new Set(Object.entries(usersCache).filter(([,u]) => _isAdmin(u) || _isFiscal(u) || _isObservador(u)).map(([id]) => id));
  const recsTecMes = recsMes.filter(r => !excludeUids.has(r.userId));

  const totalOS = recsTecMes.length;
  const totalServicos = recsTecMes.reduce((s,r) => s + (r.servicos||[]).reduce((a,sv) => a + (Number(sv.qtd)||0), 0), 0);
  const tecsAtivos = new Set(recsTecMes.map(r => r.userId)).size;
  // Valor total usando tabela V4 (observador)
  const totalValor = recsTecMes.reduce((s,r) => s + (r.servicos||[]).reduce((a,sv) => a + (Number(sv.qtd)||0) * (precosV4map[sv.tipo]||0), 0), 0);

  const fmt = v => `<span class="money-val">R$\u00a0${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>`;

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:.75rem;color:#0e7490;font-weight:600;margin-bottom:4px">OS no Mês</div>
        <div style="font-size:1.5rem;font-weight:800;color:#0e7490">${totalOS}</div>
      </div>
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:.75rem;color:#0e7490;font-weight:600;margin-bottom:4px">Serviços</div>
        <div style="font-size:1.5rem;font-weight:800;color:#0e7490">${totalServicos}</div>
      </div>
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:.75rem;color:#0e7490;font-weight:600;margin-bottom:4px">Prestadores Ativos</div>
        <div style="font-size:1.5rem;font-weight:800;color:#0e7490">${tecsAtivos}</div>
      </div>
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:.75rem;color:#0e7490;font-weight:600;margin-bottom:4px">Valor Total</div>
        <div style="font-size:1.5rem;font-weight:800;color:#0e7490">${fmt(totalValor)}</div>
      </div>
    </div>`;

  // Últimas 20 OS
  const ultimas = recsTecMes.slice(0, 20);
  if (!ultimas.length) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:.85rem;margin-top:16px">Nenhuma OS encontrada para este profile no mês atual.</p>';
    return;
  }
  lista.innerHTML = `<h4 style="font-size:.88rem;font-weight:700;margin-bottom:10px;color:#334155">Últimas OS — ${profileVinc}</h4>` +
    ultimas.map(r => {
      const tec = usersCache[r.userId]?.name || r.userId || '—';
      const svs = (r.servicos||[]).map(sv => `${sv.tipo} x${sv.qtd||1}`).join(', ');
      const valOS = (r.servicos||[]).reduce((a,sv) => a + (Number(sv.qtd)||0) * (precosV4map[sv.tipo]||0), 0);
      return `<div style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:.82rem;display:flex;gap:10px;align-items:center">
        <span style="color:var(--muted);min-width:75px">${r.data||'—'}</span>
        <span style="font-weight:600;min-width:100px">${tec}</span>
        <span style="color:#475569;flex:1">${svs || '—'}</span>
        <span style="font-weight:600;color:#0e7490;min-width:80px;text-align:right">${fmt(valOS)}</span>
        <span style="color:var(--muted);font-size:.75rem">${r.cidade||''}</span>
      </div>`;
    }).join('');
}

function renderObservadorRegs() {
  const lista = document.getElementById('obs-regs-lista');
  const contadorEl = document.getElementById('obs-contador');
  if (!lista) return;

  const profileVinc = currentUser?.profileVinculado || '';
  if (!profileVinc) {
    lista.innerHTML = '<div style="padding:20px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;color:#92400e;font-size:.88rem"><i class="fas fa-exclamation-triangle"></i> Nenhum profile vinculado.</div>';
    if (contadorEl) contadorEl.textContent = '';
    return;
  }

  // Popula filtro de meses
  const selMes = document.getElementById('obs-filtro-mes');
  const mesAtualSel = selMes?.value || '';
  if (selMes && !selMes.options.length) {
    const meses = [...new Set(allRecords.filter(r => (r.profile||'').toUpperCase() === profileVinc.toUpperCase()).map(r => (r.data||'').slice(0,7)))].filter(Boolean).sort().reverse();
    if (!meses.length) meses.push(_mesLocalStr());
    selMes.innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
  }
  const mesSel = selMes?.value || _mesLocalStr();

  // Popula filtro de técnicos
  const selTec = document.getElementById('obs-filtro-tec');
  const tecSel = selTec?.value || '';
  const excludeUids = new Set(Object.entries(usersCache).filter(([,u]) => _isAdmin(u) || _isFiscal(u) || _isObservador(u)).map(([id]) => id));
  if (selTec && selTec.options.length <= 1) {
    const tecs = Object.entries(usersCache).filter(([id, u]) => !excludeUids.has(id) && u.ativo !== false && !u.firstLogin).sort(([,a],[,b]) => (a.name||'').localeCompare(b.name||''));
    selTec.innerHTML = '<option value="">Todos os prestadores</option>' + tecs.map(([id, u]) => `<option value="${id}">${u.name}</option>`).join('');
    if (tecSel) selTec.value = tecSel;
  }

  let recs = allRecords.filter(r =>
    (r.profile||'').toUpperCase() === profileVinc.toUpperCase() &&
    (r.data||'').startsWith(mesSel) &&
    !excludeUids.has(r.userId)
  );
  if (tecSel) recs = recs.filter(r => r.userId === tecSel);

  if (contadorEl) contadorEl.textContent = `${recs.length} registro${recs.length !== 1 ? 's' : ''}`;

  if (!recs.length) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Nenhum registro encontrado.</p>';
    return;
  }

  const fmtR = v => 'R$\u00a0' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
  lista.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">
    <thead><tr style="background:#f0fdfa">
      <th style="padding:8px 10px;text-align:left;color:#0e7490;font-weight:700">Data</th>
      <th style="padding:8px 10px;text-align:left;color:#0e7490;font-weight:700">Prestador</th>
      <th style="padding:8px 10px;text-align:left;color:#0e7490;font-weight:700">Tipo OS</th>
      <th style="padding:8px 10px;text-align:left;color:#0e7490;font-weight:700">CTO/CEO</th>
      <th style="padding:8px 10px;text-align:left;color:#0e7490;font-weight:700">Cidade</th>
      <th style="padding:8px 10px;text-align:left;color:#0e7490;font-weight:700">Serviços</th>
      <th style="padding:8px 10px;text-align:right;color:#0e7490;font-weight:700">Valor</th>
    </tr></thead>
    <tbody>` + recs.map((r,i) => {
      const tec = usersCache[r.userId]?.name || r.userId || '—';
      const svs = (r.servicos||[]).map(sv => `${sv.tipo} x${sv.qtd||1}`).join(', ');
      const valOS = (r.servicos||[]).reduce((a,sv) => a + (Number(sv.qtd)||0) * (precosV4map[sv.tipo]||0), 0);
      return `<tr style="border-bottom:1px solid var(--border);background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:6px 10px">${r.data||'—'}</td>
        <td style="padding:6px 10px;font-weight:600">${tec}</td>
        <td style="padding:6px 10px">${r.tipo||'—'}</td>
        <td style="padding:6px 10px">${r.cto_ceo||'—'}</td>
        <td style="padding:6px 10px">${r.cidade||'—'}</td>
        <td style="padding:6px 10px;font-size:.78rem">${svs||'—'}</td>
        <td style="padding:6px 10px;text-align:right;font-weight:700;color:#0e7490">${fmtR(valOS)}</td>
      </tr>`;
    }).join('') + `</tbody></table></div>`;
}

function renderFiscalizacao() {
  if (!_isFiscal(currentUser) && !_isAdmin(currentUser)) return;

  const fmt = v => `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const hoje = new Date();
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesAtualVal = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  const dAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesAntVal = `${dAnt.getFullYear()}-${String(dAnt.getMonth()+1).padStart(2,'0')}`;

  // ── 1. Lê valores atuais ANTES de alterar qualquer select ──────────────
  const statusSel = document.getElementById('fisc-filtro-status')?.value || 'pendente';
  const tecSelAntes = document.getElementById('fisc-filtro-tec')?.value || '';
  const mesSelAntes = document.getElementById('fisc-filtro-mes')?.value || 'atual_anterior';

  // ── 2. Reconstrói select de MESES (preserva seleção) ───────────────────
  const selMes = document.getElementById('fisc-filtro-mes');
  if (selMes) {
    // Fiscal valida apenas mês atual e anterior — escopo fixo de 2 meses
    const mesOpcoes = [
      { val: 'atual_anterior', lbl: `📅 ${MESES[dAnt.getMonth()]} + ${MESES[hoje.getMonth()]} (todos)` },
      { val: mesAtualVal,      lbl: `${MESES[hoje.getMonth()]} ${hoje.getFullYear()} — atual` },
      { val: mesAntVal,        lbl: `${MESES[dAnt.getMonth()]} ${dAnt.getFullYear()} — anterior` },
    ];
    // Só reconstrói se as opções mudaram (evita reset da seleção desnecessário)
    const valoresAtuais = Array.from(selMes.options).map(o => o.value).join(',');
    const valoresNovos  = mesOpcoes.map(o => o.val).join(',');
    if (valoresAtuais !== valoresNovos) {
      selMes.innerHTML = '';
      mesOpcoes.forEach(o => selMes.add(new Option(o.lbl, o.val)));
    }
    // Restaura seleção anterior (se ainda válida) ou usa padrão
    selMes.value = mesOpcoes.some(o => o.val === mesSelAntes) ? mesSelAntes : 'atual_anterior';
  }
  const mesSel = selMes?.value || 'atual_anterior';

  // ── 3. Reconstrói select de TÉCNICOS (preserva seleção) ────────────────
  // Pré-filtra OS por mês+status para saber quais técnicos têm OS no filtro atual
  // Exclui admin, fiscal, observador E master das listagens do Fiscal
  const _fiscalView = _isFiscal(currentUser);
  const excluirUidsPre = new Set(
    Object.entries(usersCache).filter(([,u]) => _isAdmin(u) || _isFiscal(u) || _isObservador(u) || (_fiscalView && u?.role === 'master')).map(([id]) => id)
  );
  let recsPre = allRecords.filter(r => {
    const data = r.data || '';
    if (mesSel === 'atual_anterior') return data.startsWith(mesAtualVal) || data.startsWith(mesAntVal);
    return data.startsWith(mesSel);
  }).filter(r => !excluirUidsPre.has(r.userId || ''))
    .filter(r => !_isImportadaConcluida(r)); // OS importada histórica = concluída, não aparece
  // Aplica filtro de status para descobrir técnicos com OS nesse status
  if (statusSel === 'pendente')       recsPre = recsPre.filter(r => r.validacaoFiscal !== 'validada');
  else if (statusSel === 'validada')  recsPre = recsPre.filter(r => r.validacaoFiscal === 'validada');
  const uidsComOS = new Set(recsPre.map(r => r.userId));

  const selTec = document.getElementById('fisc-filtro-tec');
  if (selTec) {
    const tecAtivos = Object.entries(usersCache)
      .filter(([,u]) => !_isAdmin(u) && !_isFiscal(u) && !_isObservador(u) && u.ativo !== false && !u.firstLogin && !(_fiscalView && u?.role === 'master'))
      .sort((a,b) => (a[1].name||'').localeCompare(b[1].name||''));
    // Reconstrói sempre para garantir lista atualizada
    selTec.innerHTML = '<option value="">Todos os prestadores</option>';
    tecAtivos.forEach(([uid,u]) => {
      const opt = new Option(u.name, uid);
      if (!uidsComOS.has(uid)) { opt.disabled = true; opt.style.color = '#aaa'; }
      selTec.add(opt);
    });
    // Restaura seleção anterior (se técnico ainda existe e tem OS no filtro)
    const uidValido = tecAtivos.some(([uid]) => uid === tecSelAntes) && uidsComOS.has(tecSelAntes);
    selTec.value = uidValido ? tecSelAntes : '';
  }
  const tecSel = selTec?.value || '';

  // ── 4. Filtra OS ────────────────────────────────────────────────────────
  let recs = allRecords.filter(r => {
    const data = r.data || '';
    if (mesSel === 'atual_anterior') return data.startsWith(mesAtualVal) || data.startsWith(mesAntVal);
    return data.startsWith(mesSel);
  });

  recs = recs.filter(r => !excluirUidsPre.has(r.userId || ''))
             .filter(r => !_isImportadaConcluida(r)); // OS importada histórica não aparece
  if (tecSel) recs = recs.filter(r => r.userId === tecSel);

  // Retrocompatibilidade: OS sem o campo são pendentes na visão do Fiscal;
  // no financeiro (fechamento) a lógica é inversa (sem campo = validada).
  if (statusSel === 'pendente')       recs = recs.filter(r => r.validacaoFiscal !== 'validada');
  else if (statusSel === 'validada')  recs = recs.filter(r => r.validacaoFiscal === 'validada');
  // 'todas' — sem filtro adicional

  recs.sort((a,b) => (a.data||'').localeCompare(b.data||''));

  const cnt = document.getElementById('fisc-contador');
  if (cnt) cnt.textContent = `${recs.length} OS encontradas`;

  const lista = document.getElementById('fisc-lista');
  if (!lista) return;
  if (!recs.length) {
    lista.innerHTML = `<p style="color:var(--muted);font-size:.85rem;padding:12px 0">Nenhuma OS encontrada com os filtros selecionados.</p>`;
    return;
  }

  const dia = hoje.getDate();
  // REGRA: prazo = dia 10 do MÊS SEGUINTE ao mês da OS
  // Alerta só para OS do mês anterior (cujo prazo é dia 10 do mês atual)
  const temOsMesAnt = recs.some(r => (r.data||'').startsWith(mesAntVal));
  const alertaDia10 = dia >= 8 && temOsMesAnt && statusSel === 'pendente';
  const prazoVencidoFisc = dia >= 10 && temOsMesAnt;
  const mesNomeAntFisc = MESES[dAnt.getMonth()];
  const mesNomeAtualFisc = MESES[hoje.getMonth()];

  lista.innerHTML = (alertaDia10 ? `
    <div style="background:${prazoVencidoFisc?'#fff1f2':'#fef3c7'};border:1px solid ${prazoVencidoFisc?'#fca5a5':'#fbbf24'};border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:8px">
      <i class="fas fa-${prazoVencidoFisc?'exclamation-circle':'exclamation-triangle'}" style="color:${prazoVencidoFisc?'#dc2626':'#d97706'}"></i>
      <span style="font-size:.83rem;color:${prazoVencidoFisc?'#991b1b':'#92400e'};font-weight:600">
        ${prazoVencidoFisc
          ? 'Prazo vencido! OS de <strong>'+mesNomeAntFisc+'</strong> não validadas até dia <strong>10 de '+mesNomeAtualFisc+'</strong> serão abatidas do pagamento!'
          : 'Atenção: OS de <strong>'+mesNomeAntFisc+'</strong> devem ser validadas até o dia <strong>10 de '+mesNomeAtualFisc+'</strong>!'}
      </span>
    </div>` : '') +
  recs.map((r,i) => {
    const tec = usersCache[r.userId]?.name || r.userName || '—';
    const validada = r.validacaoFiscal === 'validada';
    const svcs = (r.servicos||[]).map(s =>
      `<span style="background:#f1f5f9;border-radius:4px;padding:2px 7px;font-size:.75rem;margin-right:4px">${s.tipo} × ${s.qtd}</span>`
    ).join('');
    const temMat = r.materiais && r.materiais.length;
    const matConferido = r.materiaisConferidos;
    const matBadge = temMat
      ? (matConferido
          ? `<span style="font-size:.72rem;background:#dcfce7;color:#14532d;padding:3px 8px;border-radius:8px;font-weight:700;margin-left:6px"><i class="fas fa-check-circle" style="margin-right:3px"></i>${r.materiais.length} material(is) conferido(s)</span>`
          : `<button onclick="event.stopPropagation();_mostrarModalMateriais(_getRecordByKey('${r.fbKey}'),'${r.fbKey}')"
              style="font-size:.72rem;background:#7c3aed;color:#fff;padding:4px 10px;border-radius:8px;font-weight:700;border:none;cursor:pointer;margin-left:6px">
              <i class="fas fa-clipboard-check" style="margin-right:3px"></i>${r.materiais.length} material(is) — Conferir</button>`)
      : '';
    const validadoBadge = validada
      ? `<span style="font-size:.72rem;background:#dcfce7;color:#14532d;padding:3px 8px;border-radius:8px;font-weight:700">✔ Validada por ${r.validadoPor||'—'}</span>`
      : `<span style="font-size:.72rem;background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:8px;font-weight:700">⏳ Pendente</span>`;
    return `<div style="background:${validada?'#f0fdf4':'#fff'};border:1px solid ${validada?'#86efac':'#e5e7eb'};border-radius:10px;padding:12px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.87rem;color:#1f4e79;margin-bottom:4px">
            <i class="fas fa-hard-hat" style="margin-right:5px;color:#64748b"></i>${tec}
            <span style="font-size:.75rem;color:#64748b;font-weight:400;margin-left:8px">${r.data||'—'}</span>
          </div>
          <div style="font-size:.8rem;color:#475569;margin-bottom:5px">
            <strong>${r.profile||'—'} · ${r.tipo||'—'}</strong> · ${r.cidade||'—'}
          </div>
          ${r.referencia?`<div style="font-size:.78rem;color:#64748b;margin-bottom:4px">Ref.: ${r.referencia}</div>`:''}
          ${r.cto_ceo?`<div style="font-size:.78rem;color:#64748b;margin-bottom:4px">CTO/CEO: ${r.cto_ceo}</div>`:''}
          <div style="margin-top:5px">${svcs}</div>
          <div style="margin-top:6px">${validadoBadge}${matBadge}</div>
          ${r.validadoEm?`<div style="font-size:.72rem;color:#94a3b8;margin-top:3px">Em: ${new Date(r.validadoEm).toLocaleString('pt-BR')}</div>`:''}
        </div>
        ${!validada?`
        <button onclick="validarOS('${r.fbKey}')"
          style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:.82rem;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <i class="fas fa-check-circle"></i> Validar OS
        </button>`:''}
      </div>
    </div>`;
  }).join('');
}

async function validarOS(fbKey) {
  const rec = allRecords.find(r => r.fbKey === fbKey);
  if (!rec) { toast('OS não encontrada.', 'error'); return; }
  // OS importada concluída não precisa de validação
  if (_isImportadaConcluida(rec)) {
    toast('OS importada (histórica) não precisa de validação.', 'error'); return;
  }
  // Fiscal não pode validar OS do master
  if (_isFiscal(currentUser) && _isMasterUid(rec.userId)) {
    toast('Sem permissão para validar OS deste usuário.', 'error'); return;
  }
  // Se a OS tem materiais, mostra modal de alerta antes de validar
  if (rec.materiais && rec.materiais.length) {
    _mostrarModalMateriais(rec, fbKey);
    return;
  }
  // Sem materiais — valida direto
  await _executarValidacaoOS(fbKey, rec);
}

function _mostrarModalMateriais(rec, fbKey) {
  const info = document.getElementById('modal-mat-info');
  info.innerHTML = `<strong>${rec.userName || '—'}</strong> · ${rec.data || '—'} · OS: <strong>${rec.codigo_os || '—'}</strong>`;
  const total = rec.materiais.length;
  const lista = document.getElementById('modal-mat-lista');
  lista.innerHTML = rec.materiais.map((m, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:background .15s"
      id="mat-row-${i}" onclick="const cb=this.querySelector('input');cb.checked=!cb.checked;_atualizarContagemMat()">
      <input type="checkbox" class="mat-check" style="width:20px;height:20px;accent-color:#16a34a;flex-shrink:0" onclick="event.stopPropagation();_atualizarContagemMat()">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.82rem;color:#1e293b">${m.nome}</div>
        <div style="font-size:.74rem;color:#64748b">Código: ${m.codigo}</div>
      </div>
      <div style="font-weight:800;font-size:.9rem;color:#7c3aed;background:#ede9fe;padding:4px 10px;border-radius:6px;flex-shrink:0">${m.qtd}</div>
    </div>
  `).join('');

  // Status e botão
  const statusEl = document.getElementById('modal-mat-status');
  statusEl.innerHTML = `<div style="background:#fef3c7;color:#92400e"><i class="fas fa-clipboard-list"></i> Conferidos: <strong>0 / ${total}</strong></div>`;
  const okBtn = document.getElementById('modal-mat-ok');
  okBtn.disabled = true;
  okBtn.style.opacity = '.4';
  okBtn.style.cursor = 'not-allowed';
  okBtn.onclick = async () => {
    fecharModal('modal-materiais');
    await _executarValidacaoOS(fbKey, rec, true);
  };
  document.getElementById('modal-materiais').classList.add('open');
}

function _atualizarContagemMat() {
  const checks = document.querySelectorAll('.mat-check');
  const total = checks.length;
  const marcados = [...checks].filter(c => c.checked).length;
  // Atualiza visual de cada linha
  checks.forEach((c, i) => {
    const row = document.getElementById(`mat-row-${i}`);
    if (row) row.style.background = c.checked ? '#f0fdf4' : '';
  });
  // Atualiza status
  const statusEl = document.getElementById('modal-mat-status');
  if (marcados === total) {
    statusEl.innerHTML = `<div style="background:#dcfce7;color:#14532d;padding:10px 14px;border-radius:8px"><i class="fas fa-check-circle"></i> Todos os <strong>${total}</strong> materiais conferidos!</div>`;
  } else {
    statusEl.innerHTML = `<div style="background:#fef3c7;color:#92400e;padding:10px 14px;border-radius:8px"><i class="fas fa-clipboard-list"></i> Conferidos: <strong>${marcados} / ${total}</strong></div>`;
  }
  // Habilita/desabilita botão
  const okBtn = document.getElementById('modal-mat-ok');
  if (marcados === total) {
    okBtn.disabled = false;
    okBtn.style.opacity = '1';
    okBtn.style.cursor = 'pointer';
  } else {
    okBtn.disabled = true;
    okBtn.style.opacity = '.4';
    okBtn.style.cursor = 'not-allowed';
  }
}

async function _executarValidacaoOS(fbKey, rec, materiaisConferidos) {
  const agora = new Date().toISOString();
  const fiscalNome = currentUser.name;
  try {
    // Garantir Firebase Auth ativo antes de escrever no banco
    const _fbAuth = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth() : null;
    let _fbUser = _fbAuth ? _fbAuth.currentUser : null;
    if (!_fbUser || _fbUser.isAnonymous || !(_fbUser.email || '').endsWith('@solucaoderua.app')) {
      // Tentar re-autenticar com hash salvo (caso login biometrico sem sessao Firebase)
      const _uid = currentUser.id || '';
      const _storedHash = _uid && localStorage.getItem('sdr_admin_bio_fhash_' + _uid);
      if (_fbAuth && _storedHash) {
        // Tenta re-auth: primeiro email principal, depois variante .v2@
        const _emailBase = _uid.replace(/[^a-zA-Z0-9._-]/g, '_');
        for (const _em of [_emailBase + '@solucaoderua.app', _emailBase + '.v2@solucaoderua.app']) {
          try {
            const _cred = await _fbAuth.signInWithEmailAndPassword(_em, _storedHash);
            if (_cred && _cred.user) { _fbUser = _cred.user; break; }
          } catch(_e2) { /* tenta proximo */ }
        }
        if (_fbUser) console.log('[validarOS] re-auth Firebase OK:', _uid, _fbUser.email);
        else console.warn('[validarOS] re-auth falhou para:', _uid);
      }
      // Apos tentativa de re-auth, verificar novamente
      const _fbUser2 = _fbAuth ? _fbAuth.currentUser : null;
      if (!_fbUser2 || _fbUser2.isAnonymous || !(_fbUser2.email || '').endsWith('@solucaoderua.app')) {
        toast('Sessao Firebase inativa. Faca logout e entre novamente para habilitar a validacao.', 'error');
        console.error('[validarOS] Firebase Auth nao ativo para usuario:', currentUser.id);
        return;
      }
    }
    const updates = {
      validacaoFiscal: 'validada',
      validadoPor: fiscalNome,
      validadoEm: agora
    };
    if (materiaisConferidos) updates.materiaisConferidos = true;
    // Usar REST API diretamente — evita problema de WebSocket bloqueado no SDK
    const _fbUserFinal = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (_fbUserFinal && (_fbUserFinal.email || '').endsWith('@solucaoderua.app')) {
      const _tk = await _fbUserFinal.getIdToken(); // sem force-refresh — token valido por 1h
      const _dbUrl = ((typeof firebase !== 'undefined' && firebase.app && firebase.app().options.databaseURL) || 'https://solucaoderua-default-rtdb.firebaseio.com').replace(/\/$/, '');
      const _res = await fetch(`${_dbUrl}/os/${fbKey}.json?auth=${_tk}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!_res.ok) {
        const _errData = await _res.json().catch(() => ({}));
        throw new Error(_errData.error || 'PERMISSION_DENIED');
      }
    } else {
      // Fallback: SDK nativo (caso Firebase Auth nao disponivel via REST)
      await _dbUpdate(`os/${fbKey}`, updates);
    }
    rec.validacaoFiscal = 'validada';
    rec.validadoPor = fiscalNome;
    rec.validadoEm = agora;
    if (materiaisConferidos) rec.materiaisConferidos = true;
    toast('OS validada com sucesso!' + (materiaisConferidos ? ' Materiais conferidos.' : ''), 'success');
    renderFiscalizacao();
  } catch(e) {
    console.error('[validarOS]', e);
    const _permErr = (e.code === 'PERMISSION_DENIED') || (typeof e.message === 'string' && e.message.includes('PERMISSION_DENIED'));
    toast(_permErr
      ? 'Sem permissao no banco. Faca logout e entre novamente.'
      : 'Erro ao validar OS: ' + (e.message || e.code || 'desconhecido'),
      'error');
  }
}

async function renderInventarioFiscal() {
  if (!_isFiscal(currentUser) && !_isAdmin(currentUser)) return;
  const hoje = new Date();
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesAtualVal = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  const dAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesAntVal = `${dAnt.getFullYear()}-${String(dAnt.getMonth()+1).padStart(2,'0')}`;

  // ── Select de meses ──
  const selMes = document.getElementById('inv-filtro-mes');
  if (selMes && selMes.options.length <= 1) {
    selMes.innerHTML = '';
    [
      { val: mesAtualVal, lbl: `${MESES[hoje.getMonth()]} ${hoje.getFullYear()} — atual` },
      { val: mesAntVal,   lbl: `${MESES[dAnt.getMonth()]} ${dAnt.getFullYear()} — anterior` },
    ].forEach(o => selMes.add(new Option(o.lbl, o.val)));
  }
  const mesSel = selMes?.value || mesAtualVal;

  // ── Técnicos (exclui fiscal, observador, master e quem não fez 1º login) ──
  // Jefferson aparece SOMENTE na aba Segurança > Documentos para o Fiscal
  const tecs = _getTecnicosAtivos().filter(t => !_isMasterUid(t.id));


  // ── Select de técnicos ──
  const selTec = document.getElementById('inv-filtro-tec');
  if (selTec) {
    const prev = selTec.value;
    selTec.innerHTML = '<option value="">Todos os prestadores</option>';
    tecs.forEach(t => selTec.add(new Option(t.nome, t.id)));
    if (tecs.some(t => t.id === prev)) selTec.value = prev;
  }
  const tecSel = selTec?.value || '';

  const tecsFiltrados = tecSel ? tecs.filter(t => t.id === tecSel) : tecs;

  // ── Carrega inventários de todos os técnicos ──
  let totalPreenchidos = 0, totalPendentes = 0, totalComPendencias = 0;
  const lista = document.getElementById('inv-lista');
  if (!lista) return;

  let html = '';
  for (const tec of tecsFiltrados) {
    let inv = null;
    inv = await _dbRead(`seguranca/${tec.id}/inventarios/${mesSel}`);

    const preenchido = !!(inv && inv.data);
    if (preenchido) totalPreenchidos++; else totalPendentes++;

    // Pendências — mostra todas não resolvidas; distingue arrastadas de novas
    const pends = inv?.pendencias ? Object.entries(inv.pendencias).filter(([item,p]) => !p.resolvido) : [];
    if (pends.length > 0) totalComPendencias++;
    const arrastadas = pends.filter(([,p]) => p.criadoEm && p.criadoEm.substring(0,7) !== mesSel);
    const novas = pends.filter(([,p]) => !p.criadoEm || p.criadoEm.substring(0,7) === mesSel);

    // Status badge
    let badge;
    if (preenchido && pends.length === 0) {
      badge = `<span style="font-size:.75rem;background:#dcfce7;color:#14532d;padding:3px 10px;border-radius:20px;font-weight:700"><i class="fas fa-check-circle"></i> Completo</span>`;
    } else if (preenchido && arrastadas.length > 0) {
      badge = `<span style="font-size:.75rem;background:#fee2e2;color:#7f1d1d;padding:3px 10px;border-radius:20px;font-weight:700"><i class="fas fa-lock"></i> ${arrastadas.length} BLOQUEANTE(s)${novas.length > 0 ? ' + '+novas.length+' nova(s)' : ''}</span>`;
    } else if (preenchido && novas.length > 0) {
      badge = `<span style="font-size:.75rem;background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-weight:700"><i class="fas fa-exclamation-circle"></i> ${novas.length} pendência(s)</span>`;
    } else {
      badge = `<span style="font-size:.75rem;background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-weight:700"><i class="fas fa-clock"></i> Não preenchido</span>`;
    }

    // Resumo de itens
    let resumoHtml = '';
    if (preenchido) {
      const dataPreench = inv.dataPreenchimentoTec
        ? `Preenchido pelo técnico em ${new Date(inv.dataPreenchimentoTec).toLocaleDateString('pt-BR')}`
        : `Registrado em ${new Date(inv.data).toLocaleDateString('pt-BR')}`;
      const validadoPor = inv.fiscalNome ? ` · Validado por ${inv.fiscalNome}` : '';
      resumoHtml = `<div style="font-size:.76rem;color:#64748b;margin-top:4px">${dataPreench}${validadoPor}</div>`;

      if (arrastadas.length > 0) {
        const rowsArr = arrastadas.map(([item,p]) => '<div style="margin-top:2px"><i class="fas fa-exclamation-triangle"></i> <strong>' + item + '</strong> (desde ' + (p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('pt-BR') : '') + ')' + (p.obs ? ': '+p.obs : '') + '</div>').join('');
        resumoHtml += '<div style="margin-top:6px;padding:6px 10px;background:#fee2e2;border-radius:6px;font-size:.76rem;color:#7f1d1d"><strong><i class="fas fa-lock"></i> BLOQUEANTE — arrastada(s) de mês anterior:</strong>' + rowsArr + '</div>';
      }
      if (novas.length > 0) {
        const rowsNov = novas.map(([item,p]) => '<div style="margin-top:2px">• <strong>' + item + '</strong>' + (p.criadoEm ? ' (desde ' + new Date(p.criadoEm).toLocaleDateString('pt-BR') + ')' : '') + (p.obs ? ': '+p.obs : '') + '</div>').join('');
        resumoHtml += '<div style="margin-top:6px;padding:6px 10px;background:#fef3c7;border-radius:6px;font-size:.76rem;color:#92400e"><strong><i class="fas fa-exclamation-circle"></i> Nova(s) — prazo em aberto:</strong>' + rowsNov + '</div>';
      }
    }

    // Categorias resumo
    let catResumo = '';
    if (preenchido) {
      const veicOk = inv.veiculo ? Object.values(inv.veiculo).filter(v => v.ok).length : 0;
      const veicTot = inv.veiculo ? Object.keys(inv.veiculo).length : 0;
      const ferrOk = inv.ferramental ? Object.values(inv.ferramental).filter(v => v.ok).length : 0;
      const ferrTot = inv.ferramental ? Object.keys(inv.ferramental).length : 0;
      const epiOk = inv.epiEpc ? Object.values(inv.epiEpc).filter(v => v.ok).length : 0;
      const epiTot = inv.epiEpc ? Object.keys(inv.epiEpc).length : 0;

      catResumo = `<div style="display:flex;gap:12px;margin-top:8px;font-size:.76rem">
        <span style="color:#2563eb"><i class="fas fa-car"></i> Veículo: ${veicOk}/${veicTot}</span>
        <span style="color:#d97706"><i class="fas fa-tools"></i> Ferramental: ${ferrOk}/${ferrTot}</span>
        <span style="color:#dc2626"><i class="fas fa-hard-hat"></i> EPI: ${epiOk}/${epiTot}</span>
      </div>`;
    }

    const corBorda = !preenchido ? '#d97706' : pends.length > 0 ? '#dc2626' : '#059669';
    html += `<div style="border-left:4px solid ${corBorda};background:#fff;border-radius:10px;padding:14px 18px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.04)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-weight:700;font-size:.92rem">${tec.nome}</span>
          ${badge}
        </div>
        <button class="btn btn-sm" style="background:#d1fae5;color:#065f46;font-weight:700" onclick="segAbrirInventario('${tec.id}','${mesSel}')">
          <i class="fas fa-clipboard-check"></i> ${preenchido ? 'Revisar / Validar' : 'Preencher Inventário'}
        </button>
      </div>
      ${resumoHtml}
      ${catResumo}
    </div>`;
  }

  if (!tecsFiltrados.length) {
    html = `<p style="color:var(--muted);font-size:.85rem">Nenhum técnico encontrado.</p>`;
  }

  lista.innerHTML = html;

  const cnt = document.getElementById('inv-contador');
  if (cnt) cnt.textContent = `${totalPreenchidos} preenchido(s), ${totalPendentes} pendente(s)${totalComPendencias ? ', '+totalComPendencias+' com pendências' : ''}`;
}

function mudarAnoAnual(delta) {
  const base = _dashAno || new Date().getFullYear();
  _dashAno = base + delta;
  if (_dashAno >= new Date().getFullYear()) _dashAno = null;
  renderDashboardAnual();
}

function daToggleMetrica(m) {
  _daMetrica = m;
  ['valor','os'].forEach(k => {
    const b = document.getElementById(`da-btn-${k}`);
    if (!b) return;
    const on = k===m;
    b.style.background  = on?'#1f4e79':'#fff';
    b.style.color       = on?'#fff':'#374151';
    b.style.borderColor = on?'#1f4e79':'#d1d5db';
  });
  _renderDaBarras(window._daRecAno||[]);
}

function daShowTab(t) {
  _daTab = t;
  ['tec','svc','cid','rec'].forEach(id => {
    const btn = document.getElementById(`da-tab-${id}`);
    if (!btn) return;
    if (id===t) { btn.style.borderBottomColor='#1f4e79'; btn.style.color='#1f4e79'; btn.style.fontWeight='700'; }
    else        { btn.style.borderBottomColor='transparent'; btn.style.color='#64748b'; btn.style.fontWeight='600'; }
  });
  _renderDaTabContent(window._daRecAno||[]);
}

function _renderDaBarras(rec) {
  const el = document.getElementById('da-barras'); if (!el) return;
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const ano   = _dashAno || new Date().getFullYear();
  const vals  = Array.from({length:12},(_,i) => {
    const m  = String(i+1).padStart(2,'0');
    const rs = rec.filter(r=>(r.data||'').startsWith(`${ano}-${m}`));
    return _daMetrica==='valor' ? rs.reduce((s,r)=>s+(r._tv3??r.total??0),0) : rs.length;
  });
  const maxV = Math.max(...vals,1);
  const fmt  = v => _daMetrica==='valor'
    ? `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`
    : String(v);
  const curMes = new Date().getMonth();
  el.innerHTML = vals.map((v,i) => {
    const pct = Math.max(Math.round((v/maxV)*100), v>0?4:1);
    const isNow = i===curMes && ano===new Date().getFullYear();
    const cor = isNow?'#16a34a':'#2d6ea8';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0">
      <div style="font-size:.58rem;font-weight:700;color:${v>0?cor:'#cbd5e1'};white-space:nowrap;overflow:hidden;max-width:100%;text-align:center">${v>0?fmt(v):''}</div>
      <div style="width:100%;height:${pct}%;min-height:3px;background:${v>0?cor:'#e2e8f0'};border-radius:4px 4px 0 0"></div>
      <div style="font-size:.64rem;font-weight:${isNow?'800':'500'};color:${isNow?'#16a34a':'#64748b'}">${MESES[i]}</div>
    </div>`;
  }).join('');
}

function _renderDaTabContent(rec) {
  const el = document.getElementById('da-tab-content'); if (!el) return;
  const fmt = v => `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;

  if (_daTab==='tec') {
    const byTec = {};
    rec.forEach(r=>{ const u=r.userId||'—'; if(!byTec[u])byTec[u]={nome:r.userName||u,os:0,total:0}; byTec[u].os++; byTec[u].total+=(r._tv3??r.total??0); });
    const sorted=Object.values(byTec).sort((a,b)=>b.total-a.total);
    const maxT=sorted[0]?.total||1;
    el.innerHTML=sorted.length?sorted.map((x,i)=>{
      const pct=Math.round((x.total/maxT)*100);
      const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
      return `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:.83rem">
          <span style="font-weight:700">${medal} ${x.nome}</span>
          <span style="font-weight:800;color:var(--success)">${fmt(x.total)} <span style="color:#94a3b8;font-weight:400;font-size:.75rem">(${x.os} OS)</span></span>
        </div>
        <div style="background:#e2e8f0;border-radius:6px;height:9px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#1f4e79,#3b82f6);height:100%;width:${pct}%;border-radius:6px"></div>
        </div>
      </div>`;
    }).join(''):'<p style="color:var(--muted);font-size:.84rem">Sem dados para o período.</p>';

  } else if (_daTab==='svc') {
    const sMap={};
    rec.forEach(r=>(r.servicos||[]).forEach(s=>{if(!s.tipo)return;if(!sMap[s.tipo])sMap[s.tipo]={qtd:0,total:0};sMap[s.tipo].qtd+=s.qtd||0;sMap[s.tipo].total+=s.total||s.valor||0;}));
    const sorted=Object.entries(sMap).sort((a,b)=>b[1].qtd-a[1].qtd).slice(0,15);
    const maxQ=sorted[0]?.[1]?.qtd||1;
    el.innerHTML=sorted.length?sorted.map(([s,v])=>{
      const pct=Math.round((v.qtd/maxQ)*100);
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:.82rem">
          <span style="font-weight:600;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s}</span>
          <span><b style="color:#ea580c">${v.qtd}×</b> <span style="color:#94a3b8;font-size:.75rem">${fmt(v.total)}</span></span>
        </div>
        <div style="background:#e2e8f0;border-radius:6px;height:6px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#ea580c,#f97316);height:100%;width:${pct}%;border-radius:6px"></div>
        </div>
      </div>`;
    }).join(''):'<p style="color:var(--muted);font-size:.84rem">Sem dados.</p>';

  } else if (_daTab==='cid') {
    const cMap={};
    rec.forEach(r=>{if(r.cidade)cMap[r.cidade]=(cMap[r.cidade]||0)+1;});
    const sorted=Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const maxC=sorted[0]?.[1]||1;
    el.innerHTML=sorted.length?sorted.map(([c,n])=>{
      const pct=Math.round((n/maxC)*100);
      return `<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:.82rem">
          <span style="font-weight:600">${c}</span>
          <span style="font-weight:700;color:#7c3aed">${n} OS</span>
        </div>
        <div style="background:#e2e8f0;border-radius:6px;height:6px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#7c3aed,#a855f7);height:100%;width:${pct}%;border-radius:6px"></div>
        </div>
      </div>`;
    }).join(''):'<p style="color:var(--muted);font-size:.84rem">Sem dados.</p>';

  } else {
    const ultimos=[...allRecords].sort((a,b)=>(b.data||'').localeCompare(a.data||'')).slice(0,12);
    el.innerHTML=ultimos.length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">
      <thead style="background:#f8fafc"><tr>
        <th style="padding:8px 10px;text-align:left">Data</th>
        <th style="padding:8px 10px;text-align:left">Prestador</th>
        <th style="padding:8px 10px;text-align:left">Cidade</th>
        <th style="padding:8px 10px;text-align:center">Origem</th>
        <th style="padding:8px 10px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${ultimos.map(r=>`<tr style="border-top:1px solid var(--border)">
        <td style="padding:8px 10px">${fmtData(r.data)}</td>
        <td style="padding:8px 10px;font-weight:600">${r.userName||'—'}</td>
        <td style="padding:8px 10px">${r.cidade||'—'}</td>
        <td style="padding:8px 10px;text-align:center">${r.importado
          ?'<span style="font-size:.68rem;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-weight:700">IMP</span>'
          :'<span style="font-size:.68rem;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:4px;font-weight:700">MAN</span>'}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:var(--success)">${fmtMoeda(r.total)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<p style="color:var(--muted);font-size:.84rem">Nenhum lançamento ainda.</p>';
  }
}

function renderDashboardAnual() {
  const ano  = _dashAno || new Date().getFullYear();
  const labelEl = document.getElementById('dash-anual-label');
  if (labelEl) labelEl.textContent = String(ano);
  const btnNext = document.getElementById('btn-anual-next');
  if (btnNext) { const isNow=ano>=new Date().getFullYear(); btnNext.disabled=isNow; btnNext.style.opacity=isNow?'0.3':'1'; }

  const fmt = v => `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const _n  = s => (s||'').normalize('NFC').trim().toUpperCase();

  // Helper: nível do registro (usa usersCache ou campo importado)
  const _nivelRec = r => {
    if (r.importado && r.nivelImp) return r.nivelImp;
    const u = usersCache[r.userId];
    if (!u) return 'V1';
    if (u.role === 'master' || _isV3Import(u)) return 'V3';
    return u.nivel || 'V1';
  };

  // Todos os registros do ano (V1 + V2 + V3), exceto fiscal
  const recAno = allRecords.filter(r =>
    (r.data||'').startsWith(String(ano)) && !_isFiscal(usersCache[r.userId]) && !_isObservador(usersCache[r.userId])
  );

  // Usa o totalV3 já calculado e armazenado no OS (correto para todas as eras)
  // Fallback: recalcula apenas se totalV3 não existir
  const _totalV3 = r => {
    if (r.totalV3 !== undefined && r.totalV3 !== null) return Number(r.totalV3) || 0;
    return (r.servicos||[]).reduce((s, sv) => {
      return s + (Number(sv.valorV3) || (Number(sv.qtd)||0) * (precosV3map[sv.tipo] || 0));
    }, 0);
  };

  // rec = todos os registros, mas com totalV3 sobreposto para os cálculos
  const rec = recAno.map(r => ({ ...r, _tv3: _totalV3(r) }));
  window._daRecAno = rec;

  const recV1 = rec.filter(r => _nivelRec(r) === 'V1');
  const recV2 = rec.filter(r => _nivelRec(r) === 'V2');
  const recV3 = rec.filter(r => _nivelRec(r) === 'V3');

  const total = rec.reduce((s,r) => s + r._tv3, 0);
  const svs   = rec.reduce((s,r) => s + (r.servicos?.length||0), 0);
  const tecs  = new Set(rec.map(r=>r.userId).filter(Boolean)).size;

  // ── KPIs no header ──
  const kpisEl = document.getElementById('da-kpis');
  if (kpisEl) {
    const kpi = (label, val, sub) =>
      `<div style="text-align:center;min-width:70px">
        <div style="font-size:.63rem;opacity:.7;text-transform:uppercase;letter-spacing:.04em">${label}</div>
        <div style="font-size:1.05rem;font-weight:800;margin-top:1px">${val}</div>
        ${sub?`<div style="font-size:.55rem;opacity:.6">${sub}</div>`:''}
      </div>`;
    kpisEl.innerHTML =
      kpi('Total OS', rec.length) +
      kpi('Valor Total', fmt(total)) +
      kpi('Serviços', svs) +
      kpi('Prestadores', tecs) +
      kpi('Téc / Sup / Adm', `${recV1.length} / ${recV2.length} / ${recV3.length}`, 'OS por nível');
  }

  // ── Barras mensais ──
  _renderDaBarras(rec);

  // ── 4 Frentes ──
  const frentesEl = document.getElementById('da-4frentes');
  if (frentesEl) {
    const fr = [
      {label:'Filial Manutenção',prof:'FILIAL', tipo:'MANUTENÇÃO',cor:'#1a6fc4',bg:'#eff6ff'},
      {label:'Filial Projeto',   prof:'FILIAL', tipo:'PROJETO',   cor:'#0891b2',bg:'#ecfeff'},
      {label:'Matriz Manutenção',prof:'MATRIZ', tipo:'MANUTENÇÃO',cor:'#ea580c',bg:'#fff7ed'},
      {label:'Matriz Projeto',   prof:'MATRIZ', tipo:'PROJETO',   cor:'#7c3aed',bg:'#f5f3ff'},
    ];
    frentesEl.innerHTML = fr.map(f=>{
      const rs=rec.filter(r=>_n(r.profile)===f.prof&&_n(r.tipo)===f.tipo);
      const tv=rs.reduce((s,r)=>s+(r._tv3??r.total??0),0);
      return `<div style="background:${f.bg};border-radius:14px;padding:16px;border:1px solid ${f.cor}33">
        <div style="font-size:.64rem;font-weight:800;color:${f.cor};text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${f.label}</div>
        <div style="font-size:1.3rem;font-weight:800;color:#1e293b;line-height:1">${rs.length} <span style="font-size:.72rem;font-weight:500;color:#64748b">OS</span></div>
        <div style="font-size:.82rem;font-weight:700;color:${f.cor};margin-top:5px">${fmt(tv)}</div>
      </div>`;
    }).join('');
  }

  // ── Conteúdo da tab ──
  _renderDaTabContent(rec);
}

// ════════════════════════════════════════════════════
// Dashboard Mensal — mudarMesDash + renderDashboard
// ════════════════════════════════════════════════════
let _dashMes = null; // null = mês atual; formato 'YYYY-MM'

function mudarMesDash(delta) {
  const hoje = new Date();
  let base;
  if (_dashMes) {
    const [_a, _m] = _dashMes.split('-');
    base = new Date(parseInt(_a), parseInt(_m) - 1, 1);
  } else {
    base = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  }
  base.setMonth(base.getMonth() + delta);
  const novoMes = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
  const atualMes = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  _dashMes = novoMes === atualMes ? null : novoMes;
  renderDashboard();
}

function renderDashboard() {
  const rec = allRecords;

  const hoje   = new Date();
  const MESES_NOME = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let anoM, mesM;
  if (_dashMes) {
    [anoM, mesM] = _dashMes.split('-');
  } else {
    anoM = String(hoje.getFullYear());
    mesM = String(hoje.getMonth()+1).padStart(2,'0');
  }
  const prefM = `${anoM}-${mesM}`;
  const mesLabel = `${MESES_NOME[parseInt(mesM)-1]} ${anoM}`;
  const fmt = v => `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const _n  = s => (s||'').normalize('NFC').trim().toUpperCase();

  const labelEl = document.getElementById('dash-mes-label');
  if (labelEl) labelEl.textContent = mesLabel;
  const btnNext = document.getElementById('btn-dash-next');
  if (btnNext) {
    const atualMes = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
    btnNext.disabled = prefM >= atualMes;
    btnNext.style.opacity = prefM >= atualMes ? '0.4' : '1';
  }

  const recMes = rec.filter(r => {
    const d = (r.data || '').toString().trim();
    return d.startsWith(prefM);
  });

  const _bannerEl = document.getElementById('dash-sem-dados');
  if (_bannerEl) {
    _bannerEl.style.display = recMes.length === 0 ? 'block' : 'none';
    _bannerEl.innerHTML = recMes.length === 0
      ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:14px 18px;margin-bottom:16px;color:#92400e;font-size:.88rem;display:flex;align-items:center;gap:10px">
           <i class="fas fa-info-circle" style="font-size:1.1rem"></i>
           <span>Nenhum registro encontrado em <b>${mesLabel}</b>. Os dados serão exibidos assim que houver OS lançadas para este período.</span>
         </div>`
      : '';
  }

  const statsEl = document.getElementById('dash-stats-mes');
  if (statsEl) {
    const totalMes = recMes.reduce((s,r)=>s+(r.total||0),0);
    const svsMes   = recMes.reduce((s,r)=>s+(r.servicos?.length||0),0);
    const tecsMes  = new Set(recMes.map(r=>r.userId).filter(Boolean)).size;
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-file-alt"></i></div>
        <div><div class="stat-val">${recMes.length}</div><div class="stat-lbl">OS no Mês</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div>
        <div><div class="stat-val" style="font-size:1rem">${fmtMoeda(totalMes)}</div><div class="stat-lbl">Valor no Mês</div></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-tools"></i></div>
        <div><div class="stat-val">${svsMes}</div><div class="stat-lbl">Serviços no Mês</div></div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-users"></i></div>
        <div><div class="stat-val">${tecsMes}</div><div class="stat-lbl">Prestadores no Mês</div></div></div>`;
  }

  const _nivelRec = r => {
    if (r.importado && r.nivelImp) return r.nivelImp;
    const u = usersCache[r.userId];
    if (!u) return 'V1';
    if (u.role === 'master' || _isV3Import(u)) return 'V3';
    return u.nivel || 'V1';
  };
  const recV1 = recMes.filter(r => _nivelRec(r) === 'V1');
  const recV2 = recMes.filter(r => _nivelRec(r) === 'V2');
  const recV3 = recMes.filter(r => _nivelRec(r) === 'V3');
  const nivelEl = document.getElementById('dash-nivel-breakdown');
  if (nivelEl) {
    const nivCard = (label, cor, bg, recs) => {
      const tv = recs.reduce((s,r)=>s+(r.total||0),0);
      const tecs = new Set(recs.map(r=>r.userId).filter(Boolean)).size;
      return `<div style="background:${bg};border-radius:12px;padding:16px 18px;border-left:4px solid ${cor}">
        <div style="font-size:.68rem;font-weight:800;color:${cor};text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${label}</div>
        <div style="font-size:1.25rem;font-weight:800;color:#1e293b">${recs.length} <span style="font-size:.75rem;font-weight:500;color:#64748b">OS</span></div>
        <div style="font-size:.9rem;font-weight:700;color:${cor};margin-top:4px">${fmt(tv)}</div>
        <div style="font-size:.7rem;color:#94a3b8;margin-top:2px">${tecs} técnico${tecs!==1?'s':''}</div>
      </div>`;
    };
    nivelEl.innerHTML =
      nivCard('Prestador',  '#16a34a','#f0fdf4', recV1) +
      nivCard('PRESTADOR',  '#ea580c','#fff7ed', recV2) +
      nivCard('Admin',      '#7c3aed','#f5f3ff', recV3);
  }

  const filialRec = recMes.filter(r => _n(r.profile) === 'FILIAL');
  const matrizRec = recMes.filter(r => _n(r.profile) === 'MATRIZ');
  const elFilialVal = document.getElementById('dash-filial-val');
  const elFilialOS  = document.getElementById('dash-filial-os');
  const elMatrizVal = document.getElementById('dash-matriz-val');
  const elMatrizOS  = document.getElementById('dash-matriz-os');
  if (elFilialVal) elFilialVal.innerHTML = fmt(filialRec.reduce((s,r)=>s+(r.total||0),0));
  if (elFilialOS)  elFilialOS.textContent  = `${filialRec.length} OS`;
  if (elMatrizVal) elMatrizVal.innerHTML = fmt(matrizRec.reduce((s,r)=>s+(r.total||0),0));
  if (elMatrizOS)  elMatrizOS.textContent  = `${matrizRec.length} OS`;

  let totalRend = 0;
  recMes.forEach(r => {
    const v3 = Number(r.totalV3 || 0);
    if (r.totalV3 !== undefined) {
      const v2 = Number(r.totalV2 || 0);
      totalRend += v3 - v2;
    } else {
      (r.servicos||[]).forEach(sv => {
        const sv3 = Number(sv.valorV3) || (Number(sv.qtd)||0) * (precosV3map[sv.tipo] ?? precosV3map[_normServico(sv.tipo)] ?? 0);
        const sv2 = Number(sv.valorV2) || (Number(sv.qtd)||0) * (precosV2map[sv.tipo] ?? precosV2map[_normServico(sv.tipo)] ?? 0);
        totalRend += sv3 - sv2;
      });
    }
  });

  const elRend = document.getElementById('s-rendimentos');
  const elPer  = document.getElementById('s-rend-periodo');
  if (elRend) elRend.innerHTML = fmt(totalRend);
  if (elPer)  elPer.textContent  = mesLabel;

  const byTec = {};
  recMes.forEach(r => {
    const nome    = r.userName || r.userId || '—';
    const profile = _n(r.profile) || '—';
    const tipo    = _n(r.tipo)    || '—';
    const key     = `${nome}||${profile}||${tipo}`;
    if (!byTec[key]) byTec[key] = { nome, profile, tipo, v: 0 };
    if (r.totalV3 !== undefined) {
      const v2 = Number(r.totalV2 || 0);
      byTec[key].v += (Number(r.totalV3)||0) - v2;
    } else {
      (r.servicos||[]).forEach(sv => {
        const v3 = Number(sv.valorV3) || (Number(sv.qtd)||0) * (precosV3map[sv.tipo] ?? precosV3map[_normServico(sv.tipo)] ?? 0);
        const v2 = Number(sv.valorV2) || (Number(sv.qtd)||0) * (precosV2map[sv.tipo] ?? precosV2map[_normServico(sv.tipo)] ?? 0);
        byTec[key].v += v3 - v2;
      });
    }
  });

  const rendRows = Object.values(byTec).filter(x => x.v > 0).sort((a,b)=>b.v-a.v);
  const thS = 'padding:9px 12px;font-size:.78rem;font-weight:700;text-align:left;white-space:nowrap';
  const tdS = 'padding:8px 12px;font-size:.82rem;border-bottom:1px solid #e5e7eb';
  const elTec = document.getElementById('dash-rend-tec');
  if (elTec) {
    elTec.innerHTML = rendRows.length
      ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
          <thead style="background:#7c3aed;color:#fff">
            <tr>
              <th style="${thS}">Prestador</th>
              <th style="${thS}">Profile</th>
              <th style="${thS}">Tipo</th>
              <th style="${thS};text-align:right;color:#e9d5ff">Rendimentos</th>
            </tr>
          </thead>
          <tbody>
            ${rendRows.map((x,i)=>`<tr style="background:${i%2===0?'#faf5ff':'#fff'}">
              <td style="${tdS}">${x.nome}</td>
              <td style="${tdS}">${x.profile}</td>
              <td style="${tdS}">${x.tipo}</td>
              <td style="${tdS};text-align:right;color:#7c3aed;font-weight:700">${fmt(x.v)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot style="background:#f3e8ff;border-top:2px solid #c4b5fd">
            <tr>
              <td colspan="3" style="padding:9px 12px;font-weight:700;font-size:.82rem">Total</td>
              <td style="padding:9px 12px;text-align:right;font-weight:800;color:#7c3aed">${fmt(totalRend)}</td>
            </tr>
          </tfoot>
        </table></div>`
      : `<p style="color:var(--muted);font-size:.85rem">Nenhum registro em ${mesLabel}.</p>`;
  }
}

// ── Expor funções como globals para o admin.html (tree-shaking fix) ──
window._calcTecTotal = _calcTecTotal;
window._fmtTec = _fmtTec;
window._batchFixServicos = _batchFixServicos;
window._diagTecTotal = _diagTecTotal;
window._tecTabela = _tecTabela;
window._tecDashboard = _tecDashboard;
window.renderTecnicosPage = renderTecnicosPage;
window.renderBonusV2 = renderBonusV2;
window.setBnsMes = setBnsMes;
window.renderMeuDash = renderMeuDash;
window.renderMeuDashFiscal = renderMeuDashFiscal;
window.renderObservadorDash = renderObservadorDash;
window.renderObservadorRegs = renderObservadorRegs;
window.renderFiscalizacao = renderFiscalizacao;
window.validarOS = validarOS;
window._mostrarModalMateriais = _mostrarModalMateriais;
window._atualizarContagemMat = _atualizarContagemMat;
window._executarValidacaoOS = _executarValidacaoOS;
window.renderInventarioFiscal = renderInventarioFiscal;
window.mudarAnoAnual = mudarAnoAnual;
window.daToggleMetrica = daToggleMetrica;
window.daShowTab = daShowTab;
window._renderDaBarras = _renderDaBarras;
window._renderDaTabContent = _renderDaTabContent;
window.renderDashboardAnual = renderDashboardAnual;
window.mudarMesDash = mudarMesDash;
window.renderDashboard = renderDashboard;