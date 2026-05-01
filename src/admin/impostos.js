'use strict';

window._simplesCalc = function (faturamento, rbt12) {
  if (!faturamento || !rbt12) return null;
  const faixa = SIMPLES_FAIXAS.find(f => rbt12 >= f.limInf && rbt12 <= f.limSup);
  if (!faixa) return null;
  const aliqEfetiva = (rbt12 * faixa.aliq - faixa.ded) / rbt12;
  const r2 = (v) => Math.round(v * 100) / 100;
  const irpj   = r2(faturamento * aliqEfetiva * faixa.irpj);
  const csll   = r2(faturamento * aliqEfetiva * faixa.csll);
  const cofins = r2(faturamento * aliqEfetiva * faixa.cofins);
  const pis    = r2(faturamento * aliqEfetiva * faixa.pis);
  const cpp    = r2(faturamento * aliqEfetiva * faixa.cpp);
  const issRaw = faturamento * aliqEfetiva * faixa.iss;
  const issCap = faturamento * 0.05;
  const iss    = r2(Math.min(issRaw, issCap));
  const total  = r2(irpj + csll + cofins + pis + cpp + iss);
  return { aliqEfetiva, total, irpj, csll, cofins, pis, cpp, iss };
}

window.renderImpostos = function () {
  const tbody = document.getElementById('imp-tbody');
  const tfoot = document.getElementById('imp-tfoot');
  const resumo = document.getElementById('imp-resumo');
  if (!tbody) return;

  const anoIni = parseInt(document.getElementById('imp-ano-ini')?.value || 2025);
  const anos = [anoIni, anoIni + 1];
  const mesesPt = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  // Monta lista de todos os meses incluindo 12 anteriores para RBT12
  const allMonths = [];
  for (let y = anoIni - 1; y <= anoIni + 1; y++) {
    for (let m = 1; m <= 12; m++) {
      allMonths.push({ y, m, ym: `${y}-${String(m).padStart(2,'0')}` });
    }
  }

  // Calcula RBT12 para cada mês
  const rbt12Map = {};
  allMonths.forEach((mo, idx) => {
    let soma = 0;
    for (let i = Math.max(0, idx - 11); i <= idx; i++) {
      soma += _impFaturamentos[allMonths[i].ym] || 0;
    }
    rbt12Map[mo.ym] = soma;
  });

  // Formata moeda
  const fmt = v => v.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtPct = v => (v * 100).toFixed(2) + '%';

  let rows = '';
  let totFat = 0, totDas = 0, totIrpj = 0, totCsll = 0, totCofins = 0, totPis = 0, totCpp = 0, totIss = 0;
  let anoAtual = null;

  const exibirMonths = allMonths.filter(mo => anos.includes(mo.y));

  exibirMonths.forEach((mo, idx) => {
    if (mo.y !== anoAtual) {
      anoAtual = mo.y;
      rows += `<tr>
        <td colspan="11" style="background:#dbeafe;color:#1e3a5f;font-weight:700;font-size:.8rem;padding:6px 10px;border-top:2px solid #93c5fd">
          ▸ ${anoAtual}
        </td>
      </tr>`;
    }

    const fat = _impFaturamentos[mo.ym] || 0;
    const rbt = rbt12Map[mo.ym] || 0;
    const calc = fat > 0 ? _simplesCalc(fat, rbt) : null;
    const bg = idx % 2 === 0 ? '#f8fafc' : '#fff';

    totFat    += fat;
    totDas    += calc?.total  || 0;
    totIrpj   += calc?.irpj   || 0;
    totCsll   += calc?.csll   || 0;
    totCofins += calc?.cofins || 0;
    totPis    += calc?.pis    || 0;
    totCpp    += calc?.cpp    || 0;
    totIss    += calc?.iss    || 0;

    const tdStyle = `padding:7px 6px;border-bottom:1px solid #e2e8f0;text-align:right;background:${bg}`;
    rows += `<tr>
      <td style="${tdStyle};text-align:left;font-weight:600;white-space:nowrap">${mesesPt[mo.m-1]}/${mo.y}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;background:#fefce8">
        <input type="number" data-ym="${mo.ym}" value="${fat || ''}" placeholder="0,00"
          min="0" step="0.01"
          style="width:100%;border:1px solid #d1d5db;border-radius:5px;padding:5px 7px;font-size:.82rem;text-align:right;background:transparent"
          onchange="impAtualizarLinha(this)">
      </td>
      <td style="${tdStyle}">${rbt > 0 ? fmt(rbt) : '—'}</td>
      <td style="${tdStyle};color:${calc ? '#1f4e79' : '#94a3b8'};font-weight:600">${calc ? fmtPct(calc.aliqEfetiva) : '—'}</td>
      <td style="${tdStyle};font-weight:700;color:${calc ? '#dc2626' : '#94a3b8'};background:${calc ? '#fef2f2' : bg}">${calc ? fmt(calc.total) : '—'}</td>
      <td style="${tdStyle};font-size:.78rem">${calc ? fmt(calc.irpj)   : '—'}</td>
      <td style="${tdStyle};font-size:.78rem">${calc ? fmt(calc.csll)   : '—'}</td>
      <td style="${tdStyle};font-size:.78rem">${calc ? fmt(calc.cofins) : '—'}</td>
      <td style="${tdStyle};font-size:.78rem">${calc ? fmt(calc.pis)    : '—'}</td>
      <td style="${tdStyle};font-size:.78rem">${calc ? fmt(calc.cpp)    : '—'}</td>
      <td style="${tdStyle};font-size:.78rem">${calc ? fmt(calc.iss)    : '—'}</td>
    </tr>`;
  });

  tbody.innerHTML = rows;

  // Rodapé total
  tfoot.innerHTML = `<tr style="background:#1f3a6e;color:#fff;font-weight:700;font-size:.82rem">
    <td style="padding:9px 10px">TOTAL</td>
    <td style="padding:9px 6px;text-align:right">${fmt(totFat)}</td>
    <td></td><td></td>
    <td style="padding:9px 6px;text-align:right">${fmt(totDas)}</td>
    <td style="padding:9px 6px;text-align:right;font-size:.78rem">${fmt(totIrpj)}</td>
    <td style="padding:9px 6px;text-align:right;font-size:.78rem">${fmt(totCsll)}</td>
    <td style="padding:9px 6px;text-align:right;font-size:.78rem">${fmt(totCofins)}</td>
    <td style="padding:9px 6px;text-align:right;font-size:.78rem">${fmt(totPis)}</td>
    <td style="padding:9px 6px;text-align:right;font-size:.78rem">${fmt(totCpp)}</td>
    <td style="padding:9px 6px;text-align:right;font-size:.78rem">${fmt(totIss)}</td>
  </tr>`;

  // Cards resumo
  const cards = [
    { label:'Faturamento Total', val: fmt(totFat),  icon:'fa-money-bill-wave', color:'#1f4e79' },
    { label:'Total DAS',         val: fmt(totDas),  icon:'fa-receipt',         color:'#dc2626' },
    { label:'IRPJ',              val: fmt(totIrpj), icon:'fa-landmark',        color:'#7c3aed' },
    { label:'CSLL',              val: fmt(totCsll), icon:'fa-university',      color:'#7c3aed' },
    { label:'Cofins',            val: fmt(totCofins),icon:'fa-coins',          color:'#d97706' },
    { label:'PIS/Pasep',         val: fmt(totPis),  icon:'fa-coins',           color:'#d97706' },
    { label:'CPP',               val: fmt(totCpp),  icon:'fa-users',           color:'#059669' },
    { label:'ISS',               val: fmt(totIss),  icon:'fa-city',            color:'#0891b2' },
  ];
  resumo.innerHTML = cards.map(c => `
    <div class="card" style="padding:14px 16px;text-align:center">
      <i class="fas ${c.icon}" style="font-size:1.3rem;color:${c.color};margin-bottom:6px"></i>
      <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px">${c.label}</div>
      <div style="font-size:.95rem;font-weight:700;color:${c.color}">R$ ${c.val}</div>
    </div>`).join('');
}

window.impAtualizarLinha = function (inp) {
  const ym = inp.dataset.ym;
  const val = parseFloat(inp.value.replace(',','.')) || 0;
  if (val > 0) _impFaturamentos[ym] = val;
  else delete _impFaturamentos[ym];
  renderImpostos();
}

