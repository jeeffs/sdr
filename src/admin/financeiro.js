// src/admin/financeiro.js
// Financeiro: descontos, termos abatimento, renderFinanceiro, exportarCard
// Extraído de admin.html — Fase C

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

async function carregarDescontosTec(uid) {
  try {
    // Carrega TODOS os descontos e filtra client-side pelo uid.
    // Evita dependência de índice Firebase (.indexOn) que causaria retorno null silencioso.
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
    console.log('[carregarDescontosTec] uid:', uid,
      '| termos encontrados:', Object.keys(descontosCache).length,
      '| assinatura master:', !!assinaturaMaster);
  } catch(e) {
    console.error('[carregarDescontosTec]', e);
    descontosCache = {};
    assinaturaMaster = null;
  }
}

async function verificarTermosPendentes() {
  // Apenas o papel 'master' está isento — técnicos V3 também podem ter termos pendentes
  if (currentUser?.role === 'master') return false;
  const uid = currentUser.id;

  let termosDoTec = [];
  try {
    const snap = await db.ref('config/descontos').once('value');
    const raw = snap.val() || {};
    termosDoTec = Object.entries(raw)
      .filter(([, v]) => v.uid === uid)
      .map(([k, v]) => ({ ...v, fbKey: k }));
    // Atualiza o cache local com os dados recém-lidos
    termosDoTec.forEach(d => { descontosCache[d.fbKey] = d; });
  } catch(e) {
    console.error('[verificarTermosPendentes] erro Firebase:', e);
    return false; // Em caso de erro de permissão, não bloqueia
  }

  // Contratos OTDR são gerenciados pelo admin via painel — não bloqueiam login
  const paraAssinar      = termosDoTec.filter(d =>
    d.origemContrato !== 'otdr_730d' && (
      (d.termoAssinado === false && d.termoAceitoTec !== true) ||
      (d.termoAssinado === true && d.termoAssinadoVia !== 'govbr-tec')
    )
  );
  const aguardandoMaster = termosDoTec.filter(d =>
    d.origemContrato !== 'otdr_730d' &&
    d.termoAssinado === false && d.termoAceitoTec === true
  );
  console.log('[verificarTermosPendentes] uid:', uid,
    '| termos do tec:', termosDoTec.length,
    '| paraAssinar:', paraAssinar.length,
    '| aguardandoMaster:', aguardandoMaster.length);
  if (paraAssinar.length === 0 && aguardandoMaster.length === 0) return false;
  renderTermosPendentes(paraAssinar, aguardandoMaster);
  screen('termo-pendente');
  return true;
}

function renderTermosPendentes(paraAssinar, aguardandoMaster) {
  const el = document.getElementById('termo-pendente-content');
  if (!el) return;
  const fmt = v => `<span class="money-val">R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const fmtMes = s => {
    if (!s) return '—';
    const [y, m] = (s+'').substring(0,7).split('-').map(Number);
    return `${MESES[m-1]||m} ${y}`;
  };
  const fmtMesCurto = s => {
    if (!s) return '—';
    const [y, m] = (s+'').substring(0,7).split('-').map(Number);
    const n = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${n[m-1]||m}/${y}`;
  };
  const hoje = new Date();
  const dataHoje = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;
  const tecNome = currentUser.name || currentUser.id;
  let html = '';

  // ── Termos para assinar: mostra o TERMO COMPLETO ──
  if (paraAssinar.length > 0) {
    html += `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;
      padding:10px 14px;margin-bottom:14px;font-size:.83rem;color:#92400e;display:flex;align-items:center;gap:8px">
      <i class="fas fa-pen-alt"></i>
      <span><strong>Leia o termo abaixo e assine</strong> para continuar usando o sistema.</span>
    </div>`;

    paraAssinar.forEach(d => {
      const tot        = Number(d.parcelas) || 1;
      const vlrParcela = +(d.valor / tot).toFixed(2);
      const mIni       = d.parcelaInicio || d.mesAno || '';
      const [yi, mi]   = mIni.split('-').map(Number);
      const mFimIdx    = mi + tot - 1;
      const yFim       = yi + Math.floor((mFimIdx - 1) / 12);
      const mFimAdj    = ((mFimIdx - 1) % 12) + 1;
      const mesFim     = yi ? `${MESES[mFimAdj-1]} ${yFim}` : '—';

      const assinMestre = assinaturaMaster;
      const sigImg = assinMestre?.dataUrl
        ? `<img src="${assinMestre.dataUrl}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;margin:0 auto">`
        : `<div style="height:48px"></div>`;

      html += `
      <div style="border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:18px">
        <!-- Cabeçalho do documento -->
        <div style="background:#1f4e79;color:#fff;padding:14px 18px;text-align:center">
          <div style="font-size:.88rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px">
            Termo de Acordo de Abatimento em Prestação de Serviços
          </div>
          <div style="font-size:.72rem;opacity:.85">Instrumento Particular de Parcelamento de Débito — Sem Vínculo Empregatício</div>
        </div>

        <!-- Corpo do termo -->
        <div style="padding:16px 18px;font-size:.8rem;color:#1a1a1a;line-height:1.65;font-family:'Times New Roman',serif">

          <!-- Identificação -->
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
            color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px">
            1. Identificação das Partes
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-size:.78rem">
            <div>
              <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:1px">Contratante</div>
              <div style="border-bottom:1px dotted #aaa;padding-bottom:2px;min-height:15px"><strong>${assinMestre?.nome || '—'}</strong></div>
              ${assinMestre?.cpfCnpj ? `<div style="font-size:.7rem;color:#555;margin-top:3px">CNPJ/CPF: ${assinMestre.cpfCnpj}</div>` : ''}
              ${assinMestre?.endereco ? `<div style="font-size:.7rem;color:#555">${assinMestre.endereco}</div>` : ''}
            </div>
            <div>
              <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:1px">Contratado (Prestador Autônomo)</div>
              <div style="border-bottom:1px dotted #aaa;padding-bottom:2px;min-height:15px"><strong>${tecNome}</strong></div>
            </div>
          </div>

          <!-- Objeto -->
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
            color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px">
            2. Objeto do Acordo
          </div>
          <div style="background:#f0f9ff;border-left:3px solid #1a6fc4;padding:9px 12px;
            border-radius:0 6px 6px 0;margin-bottom:12px;font-size:.78rem">
            <strong>Descrição:</strong> ${d.motivo||'—'}<br>
            <strong>Valor Total:</strong> ${fmt(d.valor)}<br>
            <strong>Parcelamento:</strong> ${tot}× de ${fmt(vlrParcela)} mensais<br>
            <strong>Início:</strong> ${fmtMes(mIni)} &nbsp;|&nbsp; <strong>Término previsto:</strong> ${mesFim}
          </div>

          <!-- Cláusulas -->
          <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
            color:#555;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px">
            3. Cláusulas e Condições
          </div>
          <div style="font-size:.78rem;text-align:justify;margin-bottom:6px">
            <strong>3.1</strong> O valor de ${fmt(vlrParcela)} será abatido mensalmente do total apurado
            pelos serviços prestados pelo <strong>CONTRATADO</strong>, com início em
            <strong>${fmtMes(mIni)}</strong> e encerramento após <strong>${tot}</strong> abatimentos.
          </div>
          <div style="font-size:.78rem;text-align:justify;margin-bottom:6px">
            <strong>3.2</strong> O presente acordo <strong>não caracteriza</strong> vínculo empregatício,
            relação de emprego ou qualquer modalidade de contrato regido pela CLT. Os serviços são
            prestados em regime de autonomia, sem exclusividade.
          </div>
          <div style="font-size:.78rem;text-align:justify;margin-bottom:6px">
            <strong>3.3</strong> O abatimento decorre de livre e espontânea vontade do
            <strong>CONTRATADO</strong>, sem qualquer desconto compulsório.
          </div>
          <div style="font-size:.78rem;text-align:justify;margin-bottom:12px">
            <strong>3.4</strong> Este instrumento é firmado em caráter irrevogável e irretratável,
            obrigando as partes e seus sucessores.
          </div>

          <!-- Local e data -->
          <div style="font-size:.76rem;color:#555;margin-bottom:14px">
            ${assinMestre?.cidade ? assinMestre.cidade + ', ' : ''}${dataHoje}
          </div>

          <!-- Assinaturas -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:8px">
            <div style="text-align:center">
              <div style="border-bottom:1px solid #555;min-height:52px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">
                ${sigImg}
              </div>
              <div style="font-size:.72rem;font-weight:700;margin-top:4px">${assinMestre?.nome || 'CONTRATANTE'}</div>
              ${assinMestre?.cargo ? `<div style="font-size:.67rem;color:#666">${assinMestre.cargo}</div>` : ''}
            </div>
            <div style="text-align:center">
              <div style="border-bottom:1px solid #555;min-height:52px"></div>
              <div style="font-size:.72rem;font-weight:700;margin-top:4px">${tecNome}</div>
              <div style="font-size:.67rem;color:#666">Prestador de Serviços Autônomo</div>
            </div>
          </div>

          <!-- Ref -->
          <div style="font-size:.63rem;color:#ccc;text-align:right;margin-top:10px">
            Ref.: ${d.fbKey||'—'} | Gerado em: ${dataHoje}
          </div>
        </div><!-- /corpo -->

        <!-- Rodapé: 2 passos para assinar -->
        <div style="padding:14px 18px;background:#f8fafc;border-top:1px solid #e5e7eb">

          <!-- Passo 1: Baixar e assinar -->
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
            <div style="width:22px;height:22px;border-radius:50%;background:#1f4e79;color:#fff;
              font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">1</div>
            <div style="flex:1">
              <div style="font-size:.75rem;font-weight:700;color:#374151;margin-bottom:5px">Baixe o Termo e assine via Gov.br</div>
              <div style="display:flex;gap:7px;flex-wrap:wrap">
                <button onclick="gerarTermoAbatimento(descontosCache['${d.fbKey}'])"
                  style="background:#1f4e79;color:#fff;border:none;border-radius:7px;
                  padding:7px 13px;font-size:.78rem;font-weight:600;cursor:pointer;
                  display:inline-flex;align-items:center;gap:6px">
                  <i class="fas fa-file-pdf"></i> Baixar / Imprimir Termo
                </button>
                <a href="https://assinador.iti.br" target="_blank" rel="noopener"
                  style="background:#1351b4;color:#fff;border-radius:7px;padding:7px 13px;
                  font-size:.78rem;font-weight:600;text-decoration:none;
                  display:inline-flex;align-items:center;gap:6px">
                  <i class="fas fa-external-link-alt"></i> assinador.iti.br
                </a>
              </div>
            </div>
          </div>

          <!-- Passo 2: Upload automático -->
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="width:22px;height:22px;border-radius:50%;background:#ea580c;color:#fff;
              font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">2</div>
            <div style="flex:1">
              <div style="font-size:.75rem;font-weight:700;color:#374151;margin-bottom:5px">
                Carregue o PDF assinado — verificação automática
              </div>
              <label id="label-upload-${d.fbKey}"
                style="display:flex;align-items:center;justify-content:center;gap:8px;
                background:#ea580c;color:#fff;border-radius:8px;padding:10px;
                font-size:.85rem;font-weight:700;cursor:pointer;width:100%;box-sizing:border-box">
                <i class="fas fa-upload"></i> Carregar PDF Assinado (gov.br)
                <input type="file" accept=".pdf"
                  onchange="tecUploadTermoAssinado(event,'${d.fbKey}')"
                  style="display:none">
              </label>
              <div style="font-size:.68rem;color:#94a3b8;margin-top:5px;text-align:center;line-height:1.4">
                A assinatura digital é verificada automaticamente.<br>
                Se válida, o acesso é liberado sem intervenção do responsável.
              </div>
            </div>
          </div>

        </div>
      </div>`;
    });
  }

  // ── Aguardando verificação/ativação pelo master ──
  if (aguardandoMaster.length > 0) {
    html += `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;
      padding:16px 18px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:8px;color:#14532d;font-size:.9rem">
        <i class="fas fa-check-circle" style="color:#16a34a"></i>
        Termo${aguardandoMaster.length>1?'s':''} assinado${aguardandoMaster.length>1?'s':''} — aguardando verificação
      </div>
      <p style="margin:0 0 10px;font-size:.82rem;color:#166534;line-height:1.55">
        Você já assinou ${aguardandoMaster.length>1?'os termos abaixo':'o termo abaixo'} no sistema.
        O responsável irá verificar a autenticidade e ativar o abatimento em breve.
        Após a verificação e ativação, seu acesso será liberado automaticamente.
      </p>
      ${aguardandoMaster.map(d => `
        <div style="background:#fff;border-radius:7px;padding:9px 12px;margin-top:6px;
          font-size:.8rem;color:#374151;border:1px solid #bbf7d0">
          <strong>${d.motivo||'Abatimento'}</strong> —
          ${fmt(d.valor)} em ${Number(d.parcelas)||1}x
          a partir de ${fmtMesCurto(d.parcelaInicio||d.mesAno)}
        </div>`).join('')}
    </div>`;
  }

  // ── Botão verificar atualização ──
  html += `<div style="text-align:center;margin-top:8px">
    <button onclick="verificarAtualizacaoTermos()" id="btn-verificar-termos"
      style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;
      padding:9px 20px;font-size:.82rem;color:#475569;cursor:pointer;
      display:inline-flex;align-items:center;gap:7px;font-weight:500">
      <i class="fas fa-sync-alt"></i> Verificar atualização
    </button>
  </div>`;
  el.innerHTML = html;
}

async function aceitarTermoAbatimento(fbKey) {
  const btn = document.querySelector(`[data-fbkey="${fbKey}"][data-action="aceitar"]`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguarde...'; }
  try {
    const agora = new Date().toISOString();
    await _dbUpdate(`config/descontos/${fbKey}`, { termoAceitoTec: true, termoAceitoEm: agora });
    descontosCache[fbKey].termoAceitoTec = true;
    descontosCache[fbKey].termoAceitoEm = agora;
    toast('Termo assinado! Aguardando verificação pelo responsável.', 'success');
    // Re-verifica se ainda há termos pendentes
    const temPendente = await verificarTermosPendentes();
    if (!temPendente) {
      screen('app');
      showPage(_isAdmin(currentUser) ? 'dashboard' : 'meu-dash');
    }
  } catch(e) {
    console.error('[aceitarTermoAbatimento]', e);
    toast('Erro ao confirmar termo. Tente novamente.', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmo que li e estou ciente'; }
  }
}

async function verificarAtualizacaoTermos() {
  const btn = document.getElementById('btn-verificar-termos');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...'; }
  try {
    await carregarDescontosTec(currentUser.id);
    const temPendente = await verificarTermosPendentes();
    if (!temPendente) {
      screen('app');
      showPage(_isAdmin(currentUser) ? 'dashboard' : 'meu-dash');
      toast('Acesso liberado!', 'success');
    }
    // Se ainda tem pendentes, renderTermosPendentes já foi chamado pelo verificarTermosPendentes
  } catch(e) {
    console.error('[verificarAtualizacaoTermos]', e);
    toast('Erro ao verificar. Tente novamente.', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> Verificar atualização'; }
  }
}

function renderDescontosLista() {
  const el = document.getElementById('descontos-lista');
  if (!el) return;
  const items = Object.values(descontosCache).sort((a,b) => (b.mesAno||'').localeCompare(a.mesAno||''));
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:.84rem;padding:8px 0">Nenhum desconto registrado.</p>';
    return;
  }
  const fmt = v => `<span class="money-val">R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const thS = 'padding:8px 12px;font-size:.77rem;font-weight:700;text-align:left;white-space:nowrap';
  const tdS = 'padding:7px 12px;font-size:.82rem;border-bottom:1px solid #e5e7eb';
  el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead style="background:#ea580c;color:#fff"><tr>
      <th style="${thS}">Prestador</th><th style="${thS}">Mês/Ano</th>
      <th style="${thS}">Descrição</th><th style="${thS};text-align:right">Valor</th>
      <th style="${thS}"></th>
    </tr></thead>
    <tbody>${items.map((d,i)=>`<tr style="background:${i%2===0?'#fff':'#fff7ed'}">
      <td style="${tdS}">${usersCache[d.uid]?.name || d.uid || '—'}</td>
      <td style="${tdS}">${d.mesAno||'—'}</td>
      <td style="${tdS}">${d.motivo||'—'}</td>
      <td style="${tdS};text-align:right;font-weight:700;color:#dc2626">-${fmt(d.valor)}</td>
      <td style="${tdS};text-align:center">
        <button class="btn btn-sm btn-danger" onclick="removerDesconto('${d.fbKey}')" title="Remover"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

async function removerDesconto(fbKey) {
  if (!confirm('Remover este desconto/parcelamento?')) return;
  try {
    await _dbRemove(`config/descontos/${fbKey}`);
    delete descontosCache[fbKey];
    renderDescontosLista();
    if (document.getElementById('fin-descontos-lista')) _renderFinDescontos();
    if (document.getElementById('fin-producao')) renderFinanceiro();
    toast('Desconto removido.', 'success');
  } catch(e) {
    console.error('[removerDesconto] erro:', e);
    toast('Erro ao remover desconto: ' + (e.message || e), 'error');
  }
}

function _mesLocalStr(d) {
  d = d || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function _dateLocalStr(d) {
  d = d || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function finMudarMes(delta) {
  const base = _finMesAno || _mesLocalStr();
  const [y,m] = base.split('-').map(Number);
  const d = new Date(y, m-1+delta, 1);
  const next = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const now  = _mesLocalStr();
  _finMesAno = next > now ? now : next;
  renderFinanceiro();
}

function _finParcLabel(d, mesAtual) {
  // d = desconto com { parcelas, parcelaInicio }
  // Retorna { label: 'X/Y', diff, tot }
  const tot = Number(d.parcelas) || 1;
  const ini  = d.parcelaInicio || d.mesAno || mesAtual;
  const [yi,mi] = ini.split('-').map(Number);
  const [ya,ma] = mesAtual.split('-').map(Number);
  const diff = (ya - yi) * 12 + (ma - mi) + 1;
  const atual = Math.min(Math.max(diff, 1), tot);
  return { label: `${atual}/${tot}`, diff, tot };
}

function _renderFinDescontos() {
  const el = document.getElementById('fin-descontos-lista');
  if (!el) return;

  // Popula select de técnico sempre, independente de haver descontos
  const sel = document.getElementById('fin-desc-tec');
  if (sel) {
    const prev = sel.value;
    const tecs = Object.entries(usersCache).filter(([,u])=>!_isAdmin(u) && u.ativo !== false && !u.firstLogin)
      .sort((a,b)=>(a[1].name||'').localeCompare(b[1].name||''));
    sel.innerHTML = '<option value="">-- Selecione --</option>' +
      tecs.map(([uid,u])=>`<option value="${uid}">${u.name}</option>`).join('');
    if (prev) sel.value = prev;
  }

  const mesAtual = _finMesAno || _mesLocalStr();
  const fmt = v => `<span class="money-val">R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const items = Object.values(descontosCache).sort((a,b)=>
    (usersCache[a.uid]?.name||'').localeCompare(usersCache[b.uid]?.name||''));
  if (!items.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:.84rem">Nenhum desconto/parcelamento cadastrado.</p>';
    return;
  }
  const thS = 'padding:8px 12px;font-size:.77rem;font-weight:700;white-space:nowrap';
  const tdS = 'padding:7px 12px;font-size:.82rem;border-bottom:1px solid #e5e7eb';
  el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead style="background:#1f4e79;color:#fff"><tr>
      <th style="${thS}">Prestador</th>
      <th style="${thS}">Início</th>
      <th style="${thS}">Descrição</th>
      <th style="${thS};text-align:center">Parcela</th>
      <th style="${thS};text-align:center">Status</th>
      <th style="${thS};text-align:right">Valor / Parcela</th>
      <th style="${thS};text-align:center">Escolha ${mesAtual}</th>
      <th style="${thS}"></th>
    </tr></thead>
    <tbody>${items.map((d,i)=>{
      const tot        = Number(d.parcelas)||1;
      const vlrParcela = +(d.valor/tot).toFixed(2);
      const { label, diff } = _finParcLabel(d, mesAtual);
      const concluido  = diff > tot;
      // 2 estados: termoAssinado !== false = ativo | false = aguardando assinatura do técnico
      const ativo    = d.termoAssinado !== false; // undefined (registro antigo) ou true
      const pendente = !ativo;
      const rowBg    = pendente ? '#fff7ed' : concluido ? '#f0fdf4' : (i%2===0?'#fff':'#fffbeb');

      // Badge de escolha mensal
      const escolhaMes = d.escolhas?.[mesAtual];
      const ativoEssesMes = ativo && !concluido && diff >= 1;
      const escolhaBadge = !ativoEssesMes
        ? `<span style="font-size:.68rem;color:#94a3b8">—</span>`
        : escolhaMes === 'A'
          ? `<span style="font-size:.68rem;background:#fff7ed;color:#c2410c;border:1px solid #f97316;
               padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">🔶 Opção A</span>`
          : escolhaMes === 'B'
            ? `<span style="font-size:.68rem;background:#eff6ff;color:#1d4ed8;border:1px solid #3b82f6;
                 padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">🔷 Opção B</span>`
            : `<span style="font-size:.68rem;background:#fef9c3;color:#854d0e;border:1px solid #eab308;
                 padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">⏳ Aguardando</span>`;

      const parcelaBadge = concluido
        ? `<span style="font-size:.68rem;background:#dcfce7;color:#16a34a;padding:2px 7px;border-radius:10px;font-weight:700">✓ Quitado</span>`
        : `<span style="font-size:.82rem;font-weight:800;color:#1f4e79;background:#dbeafe;padding:3px 10px;border-radius:10px">${label}</span>`;

      const statusBadge = pendente
        ? `<span style="font-size:.68rem;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;
             padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">
             ✍ Aguard. Assinatura do Prestador
           </span>`
        : `<span style="font-size:.68rem;background:#dcfce7;color:#14532d;border:1px solid #86efac;
             padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">
             ✔ Ativo${d.termoAssinadoVia==='govbr-tec'?' (gov.br)':''}
           </span>`;

      // Ações: pendente → ver termo + ativar manual (fallback) + remover
      //        ativo   → ver termo + remover
      const acoes = pendente
        ? `<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
             <button onclick="reabrirTermoAbatimento('${d.fbKey}')" title="Ver/Reimprimir Termo"
               style="background:#1351b4;color:#fff;border:none;border-radius:6px;padding:4px 7px;font-size:.7rem;cursor:pointer">
               <i class="fas fa-file-signature"></i>
             </button>
             <button onclick="confirmarTermoAbatimento('${d.fbKey}')" title="Ativar manualmente (sem verificação de PDF)"
               style="background:#64748b;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:.68rem;font-weight:600;cursor:pointer;white-space:nowrap">
               <i class="fas fa-check"></i> Ativar
             </button>
             <button onclick="removerDesconto('${d.fbKey}')" title="Remover"
               style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 7px;font-size:.7rem;cursor:pointer">
               <i class="fas fa-trash"></i>
             </button>
           </div>`
        : `<div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
             <button onclick="reabrirTermoAbatimento('${d.fbKey}')" title="Reabrir Termo"
               style="background:#64748b;color:#fff;border:none;border-radius:6px;padding:4px 7px;font-size:.7rem;cursor:pointer">
               <i class="fas fa-file-alt"></i>
             </button>
             ${d.termoAssinadoVia === 'govbr-tec' ? `<button onclick="invalidarTermoGovBr('${d.fbKey}')" title="Invalidar Gov.br — prestador terá que re-assinar"
               style="background:#c2410c;color:#fff;border:none;border-radius:6px;padding:4px 7px;font-size:.7rem;cursor:pointer">
               <i class="fas fa-shield-alt"></i>
             </button>` : ''}
             <button onclick="removerDesconto('${d.fbKey}')" title="Remover"
               style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:4px 7px;font-size:.7rem;cursor:pointer">
               <i class="fas fa-trash"></i>
             </button>
           </div>`;

      return `<tr style="background:${rowBg}">
        <td style="${tdS};font-weight:600">${usersCache[d.uid]?.name||d.uid||'—'}</td>
        <td style="${tdS}">${d.parcelaInicio||d.mesAno||'—'}</td>
        <td style="${tdS}">${d.motivo||'—'}</td>
        <td style="${tdS};text-align:center">${parcelaBadge}</td>
        <td style="${tdS};text-align:center">${statusBadge}</td>
        <td style="${tdS};text-align:right">
          <span style="font-weight:800;color:${pendente?'#94a3b8':'#dc2626'};font-size:.88rem">${pendente?'—':'-'+fmt(vlrParcela)}</span>
          ${tot>1&&!pendente?`<br><span style="font-size:.72rem;color:#94a3b8">total ${fmt(d.valor)}</span>`:''}
          ${pendente?`<br><span style="font-size:.68rem;color:#f59e0b">inativo até assinatura</span>`:''}
        </td>
        <td style="${tdS};text-align:center">${escolhaBadge}</td>
        <td style="${tdS};text-align:center">${acoes}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  // ── Controle PIX — Opção B ─────────────────────────────────────────────────
  const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  // Coleta todos os meses com pelo menos uma escolha B nos últimos 6 meses
  const hoje = new Date();
  const mesesVerif = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    mesesVerif.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const pixEntries = [];
  Object.entries(descontosCache).forEach(([fbKey, d]) => {
    if (d.termoAssinado !== true) return;
    mesesVerif.forEach(m => {
      if (d.escolhas?.[m] !== 'B') return;
      const tot = Number(d.parcelas) || 1;
      const [yi, mi] = (d.parcelaInicio || d.mesAno || '').split('-').map(Number);
      if (!yi) return;
      const [ya, ma] = m.split('-').map(Number);
      const diff = (ya - yi) * 12 + (ma - mi) + 1;
      if (diff < 1 || diff > tot) return;
      const recebido = d.pixPagamentos?.[m]?.recebido === true;
      const recebidoEm = d.pixPagamentos?.[m]?.recebidoEm;
      pixEntries.push({ fbKey, d, mes: m, diff, tot, vlr: +(d.valor/tot).toFixed(2), recebido, recebidoEm });
    });
  });

  if (pixEntries.length > 0) {
    const thP = 'padding:7px 10px;font-size:.75rem;font-weight:700;white-space:nowrap';
    const tdP = 'padding:6px 10px;font-size:.8rem;border-bottom:1px solid #e5e7eb';
    const pixRows = pixEntries.sort((a,b) => b.mes.localeCompare(a.mes)).map(e => {
      const [ya, ma] = e.mes.split('-').map(Number);
      const nomeMes = `${MESES_PT[ma-1]}/${ya}`;
      const nome = usersCache[e.d.uid]?.name || e.d.uid;
      const vlrFmt = `R$ ${e.vlr.toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
      const statusBadge = e.recebido
        ? `<span style="font-size:.68rem;background:#dcfce7;color:#14532d;border:1px solid #86efac;padding:3px 8px;border-radius:8px;font-weight:700">✔ Recebido${e.recebidoEm ? ' ' + new Date(e.recebidoEm).toLocaleDateString('pt-BR') : ''}</span>`
        : `<span style="font-size:.68rem;background:#fef9c3;color:#854d0e;border:1px solid #eab308;padding:3px 8px;border-radius:8px;font-weight:700">⏳ Aguardando PIX</span>`;
      const btnPix = e.recebido ? '' :
        `<button onclick="marcarPixRecebido('${e.fbKey}','${e.mes}')"
           style="background:#15803d;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:.72rem;font-weight:700;cursor:pointer;white-space:nowrap">
           <i class="fas fa-check"></i> Recebido
         </button>`;
      return `<tr style="background:${e.recebido?'#f0fdf4':'#fffbeb'}">
        <td style="${tdP};font-weight:600">${nome}</td>
        <td style="${tdP};text-align:center">${nomeMes}</td>
        <td style="${tdP}">${e.d.motivo||'Venda a Prazo'} <span style="font-size:.7rem;color:#94a3b8">(${e.diff}/${e.tot})</span></td>
        <td style="${tdP};text-align:right;font-weight:700;color:#1d4ed8">${vlrFmt}</td>
        <td style="${tdP};text-align:center">${statusBadge}</td>
        <td style="${tdP};text-align:center">${btnPix}</td>
      </tr>`;
    }).join('');

    el.innerHTML += `
    <div style="margin-top:24px">
      <div style="font-size:.82rem;font-weight:700;color:#1d4ed8;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-pix" style="color:#32bcad"></i> Controle de Pagamentos PIX — Opção B
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead style="background:#1d4ed8;color:#fff"><tr>
          <th style="${thP}">Prestador</th>
          <th style="${thP}">Mês</th>
          <th style="${thP}">Descrição</th>
          <th style="${thP};text-align:right">Valor</th>
          <th style="${thP};text-align:center">Status</th>
          <th style="${thP};text-align:center">Ação</th>
        </tr></thead>
        <tbody>${pixRows}</tbody>
      </table></div>
    </div>`;
  }
}

async function marcarPixRecebido(fbKey, mes) {
  if (!confirm(`Confirmar recebimento do PIX de ${MESES_NOME?.[parseInt(mes.split('-')[1])-1] || mes}?\n\nO pagamento será registrado como recebido.`)) return;
  try {
    const agora = new Date().toISOString();
    await _dbUpdate(`config/descontos/${fbKey}/pixPagamentos/${mes}`, { recebido: true, recebidoEm: agora });
    if (descontosCache[fbKey]) {
      if (!descontosCache[fbKey].pixPagamentos) descontosCache[fbKey].pixPagamentos = {};
      descontosCache[fbKey].pixPagamentos[mes] = { recebido: true, recebidoEm: agora };
    }
    _renderFinDescontos();
    toast('PIX registrado como recebido!', 'success');
  } catch(e) {
    console.error('[marcarPixRecebido]', e);
    toast('Erro ao registrar recebimento.', 'error');
  }
}
window.marcarPixRecebido = marcarPixRecebido;

function calcJeffersonV1(mesAtual) {
  // Encontra Jefferson (V3 nivel tech, não admin)
  const jeffersonEntry = Object.entries(usersCache).find(([uid, u]) =>
    u.nivel === 'V3' && u.role !== 'master' && u.name && u.name.toLowerCase().includes('jefferson')
  );
  if (!jeffersonEntry) return null;

  const jeffUid = jeffersonEntry[0];

  // Registros V3 importados de Jefferson no mês
  const jeffV3Records = allRecords.filter(r =>
    r.userId === jeffUid &&
    r.importado &&
    (r.nivelImp || 'V1') === 'V3' &&
    (r.data || '').startsWith(mesAtual)
  );

  if (jeffV3Records.length === 0) return null;

  const FRENTES = [
    {key:'FM', prof:'FILIAL',  tipo:'MANUTENÇÃO'},
    {key:'FP', prof:'FILIAL',  tipo:'PROJETO'},
    {key:'MM', prof:'MATRIZ',  tipo:'MANUTENÇÃO'},
    {key:'MP', prof:'MATRIZ',  tipo:'PROJETO'},
  ];

  const _n = s => (s || '').normalize('NFC').trim().toUpperCase();

  // Calcula Jefferson V3 total por frente
  const jeffV3perFrente = {};
  FRENTES.forEach(f => {
    jeffV3perFrente[f.key] = jeffV3Records
      .filter(r => _n(r.profile) === f.prof && _n(r.tipo) === f.tipo)
      .reduce((sum, r) => sum + (r.total || 0), 0);
  });

  // Registros V1 validados de OTHER techs (não Jefferson) no mês
  // Inclui tanto registros não-importados quanto importados V1
  const masterUids = new Set(Object.entries(usersCache)
    .filter(([, u]) => _isAdmin(u) || _isFiscal(u) || _isObservador(u))
    .map(([id]) => id));

  const outrosV1Records = allRecords.filter(r =>
    r.userId !== jeffUid &&
    !masterUids.has(r.userId || '') &&
    (r.data || '').startsWith(mesAtual) &&
    r.validacaoFiscal !== 'pendente' && // apenas validados
    !(r.importado && (r.nivelImp || 'V1') === 'V3') // exclui V3 importado
  );

  // Soma V1 totals de outros techs por frente
  const outrosV1perFrente = {};
  FRENTES.forEach(f => {
    outrosV1perFrente[f.key] = outrosV1Records
      .filter(r => _n(r.profile) === f.prof && _n(r.tipo) === f.tipo)
      .reduce((sum, r) => sum + (r.total || 0), 0);
  });

  // Jefferson V1 = Jefferson V3 - outros techs V1 totals (mín 0)
  const jeffV1perFrente = {};
  let jeffV1Total = 0;
  FRENTES.forEach(f => {
    jeffV1perFrente[f.key] = Math.max(0, (jeffV3perFrente[f.key] || 0) - (outrosV1perFrente[f.key] || 0));
    jeffV1Total += jeffV1perFrente[f.key];
  });

  return {
    uid: jeffUid,
    nome: jeffersonEntry[1].name,
    v3perFrente: jeffV3perFrente,
    outrosV1perFrente: outrosV1perFrente,
    v1perFrente: jeffV1perFrente,
    totalV1: jeffV1Total,
    totalV3: Object.values(jeffV3perFrente).reduce((s, v) => s + v, 0),
    osCount: jeffV3Records.length
  };
}

function renderFinanceiro() {
  if (!_isAdmin(currentUser)) return; // apenas master (admin)
  // Atualiza visual do botão de assinatura
  _atualizarBotaoAssinatura();
  const mesAtual = _finMesAno || _mesLocalStr();
  _finMesAno = mesAtual;
  const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [y,m] = mesAtual.split('-').map(Number);
  const labelEl = document.getElementById('fin-label');
  if (labelEl) labelEl.textContent = `${MESES_PT[m-1]} ${y}`;
  const btnNext = document.getElementById('btn-fin-next');
  if (btnNext) {
    const now = _mesLocalStr();
    btnNext.style.opacity = mesAtual >= now ? '0.3' : '1';
    btnNext.disabled = mesAtual >= now;
  }

  const fmt = v => `<span class="money-val">R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const _n  = s => (s||'').normalize('NFC').trim().toUpperCase();

  // Registros do mês selecionado (exclui admin, V3 e Fiscal) — calculado antes de filtrar técnicos
  const masterUids = new Set(Object.entries(usersCache).filter(([,u])=>_isAdmin(u)||_isFiscal(u)||_isObservador(u)).map(([id])=>id));
  const recMes = allRecords.filter(r =>
    (r.data||'').startsWith(mesAtual) &&
    !masterUids.has(r.userId||'') &&
    !(r.importado && (r.nivelImp||'V1')==='V3')
  );

  // Técnicos não-admin: ativos sempre exibidos; históricos (inativos) somente se tiverem OS no período
  const uidsComRecMes = new Set(recMes.map(r => r.userId).filter(Boolean));
  // Ordenação igual à aba Usuários: parte numérica do UID; empate → alfabético pelo ID
  const _sortNumFin = arr => arr.sort(([a],[b]) => {
    const na = parseInt(a.replace(/\D/g,'')) || 0;
    const nb = parseInt(b.replace(/\D/g,'')) || 0;
    if (na && nb) return na - nb;
    if (na) return 1;
    if (nb) return -1;
    return a.localeCompare(b);
  });
  const tecs = _sortNumFin(Object.entries(usersCache)
    .filter(([uid, u]) => !_isAdmin(u) && !_isFiscal(u) && !_isObservador(u) && (u.ativo !== false || uidsComRecMes.has(uid))));

  const FRENTES = [
    {key:'FM', prof:'FILIAL',  tipo:'MANUTENÇÃO', label:'Filial Manut.', cor:'#1a6fc4'},
    {key:'FP', prof:'FILIAL',  tipo:'PROJETO',    label:'Filial Proj.',  cor:'#0891b2'},
    {key:'MM', prof:'MATRIZ',  tipo:'MANUTENÇÃO', label:'Matriz Manut.', cor:'#ea580c'},
    {key:'MP', prof:'MATRIZ',  tipo:'PROJETO',    label:'Matriz Proj.',  cor:'#7c3aed'},
  ];

  // Calcula desconto de cada técnico para o mês visualizado
  // Um desconto aplica no mês se: parcelaInicio <= mesAtual < parcelaInicio + parcelas
  // Opção B: técnico paga via PIX — NÃO desconta do honorário neste mês
  const _descontoTecMes = (uid) => {
    return Object.values(descontosCache)
      .filter(d => d.uid === uid)
      .reduce((soma, d) => {
        // Abatimentos sem Termo assinado são ignorados no cálculo financeiro.
        // Registros antigos (sem campo termoAssinado) são tratados como ativos (retrocompatibilidade).
        if (d.termoAssinado === false) return soma;
        const tot = Number(d.parcelas) || 1;
        const [yi, mi] = (d.parcelaInicio || d.mesAno || '').split('-').map(Number);
        if (!yi) return soma;
        const [ya, ma] = mesAtual.split('-').map(Number);
        const diff = (ya - yi) * 12 + (ma - mi) + 1; // parcela atual (1-indexed)
        if (diff >= 1 && diff <= tot) {
          // Opção B: paga via PIX — não desconta do honorário
          const escolha = d.escolhas?.[mesAtual];
          if (escolha === 'B') return soma;
          soma += +(d.valor / tot).toFixed(2);
        }
        return soma;
      }, 0);
  };

  const prodEl = document.getElementById('fin-producao');
  if (prodEl) {
    if (!tecs.length) {
      prodEl.innerHTML = '<p style="color:var(--muted);font-size:.84rem">Nenhum técnico cadastrado.</p>';
    } else {
      // Totais gerais
      const totFrentes = {};
      FRENTES.forEach(f=>{ totFrentes[f.key]=0; });
      let gtotal = 0, gtotalDesc = 0, gtotalLiq = 0;

      // Pré-calcula dados de cada técnico
      const diaAtual = new Date().getDate();
      // REGRA: prazo do fiscal = dia 10 do MÊS SEGUINTE ao mês da OS
      // mesAtual aqui é o mês exibido no Financeiro (pode ser navegado)
      const hojePrefixo = _mesLocalStr();
      // O prazo das OS deste mês exibido já venceu?
      // Se mesAtual < hojePrefixo: é mês anterior. Prazo = dia 10 do mês seguinte ao exibido.
      // Se mesAtual === hojePrefixo: é mês atual. Prazo = dia 10 do próximo mês → nunca vencido.
      const _prazoVencido = (() => {
        if (mesAtual >= hojePrefixo) return false; // mês atual ou futuro → prazo não venceu
        // mês passado: prazo é dia 10 do mês seguinte ao exibido
        const [ym,mm] = mesAtual.split('-').map(Number);
        const mesSeguinte = mm === 12 ? `${ym+1}-01` : `${ym}-${String(mm+1).padStart(2,'0')}`;
        if (hojePrefixo > mesSeguinte) return true; // já passamos do mês do prazo
        if (hojePrefixo === mesSeguinte && diaAtual >= 10) return true; // estamos no mês do prazo e dia >= 10
        return false;
      })();
      const _prazoProximo = (() => {
        if (mesAtual >= hojePrefixo) return false;
        if (_prazoVencido) return false;
        const [ym,mm] = mesAtual.split('-').map(Number);
        const mesSeguinte = mm === 12 ? `${ym+1}-01` : `${ym}-${String(mm+1).padStart(2,'0')}`;
        if (hojePrefixo === mesSeguinte && diaAtual >= 7) return true;
        return false;
      })();
      const tecsData = tecs.map(([uid, u]) => {
        const rTec = recMes.filter(r=>r.userId===uid);
        const rTecPend = rTec.filter(r => r.validacaoFiscal === 'pendente');
        // Se prazo vencido: OS pendentes não entram no fechamento (exclui do total)
        // Se prazo ainda aberto: inclui todas as OS no total (igual ao relatório)
        const rTecContam = _prazoVencido
          ? rTec.filter(r => r.validacaoFiscal !== 'pendente')
          : rTec;
        const vals = {}, valsPend = {};
        let rowTotal = 0, rowTotalPend = 0;
        FRENTES.forEach(f => {
          const v    = rTecContam.filter(r=>_n(r.profile)===f.prof&&_n(r.tipo)===f.tipo).reduce((s,r)=>s+(r.total||0),0);
          const vp   = rTecPend.filter(r=>_n(r.profile)===f.prof&&_n(r.tipo)===f.tipo).reduce((s,r)=>s+(r.total||0),0);
          vals[f.key] = v; valsPend[f.key] = vp;
          totFrentes[f.key] += v;
          rowTotal += v; rowTotalPend += vp;
        });
        // Serviço fixo mensal (ex: Gestão KMZ)
        const sfVal   = window.getServicoFixoValor ? window.getServicoFixoValor(uid) : 0;
        rowTotal += sfVal;
        // Honorários Extra (diferencial V2-V1) para técnicos V2
        const isV2Tec = (u.nivel === 'V2') || (u.supervisao === true);
        let rowHonExtra = 0;
        if (isV2Tec) {
          const _masterU = new Set(Object.entries(usersCache).filter(([,ju])=>_isAdmin(ju)||_isFiscal(ju)||_isObservador(ju)).map(([id])=>id));
          const _jeffU   = new Set(Object.entries(usersCache).filter(([,ju])=>(ju.name||'').toLowerCase()==='jefferson'&&ju.role!=='master').map(([id])=>id));
          recMes.forEach(r => {
            if (_masterU.has(r.userId||'')||_jeffU.has(r.userId||'')) return;
            if (r.importado && (r.nivelImp||'V1')==='V3') return;
            (r.servicos||[]).forEach(sv => {
              const q = Number(sv.qtd)||0;
              if (r.importado && sv.valorV2 !== undefined) {
                rowHonExtra += sv.valorV2 - (Number(sv.valor)||0);
              } else {
                rowHonExtra += q * ((precosV2map[sv.tipo]||0) - (precosV1map[sv.tipo]||0));
              }
            });
          });
          rowTotal += rowHonExtra;
        }
        const rowDesc = _descontoTecMes(uid);
        const rowLiq  = rowTotal - rowDesc;
        gtotal     += rowTotal;
        gtotalDesc += rowDesc;
        gtotalLiq  += rowLiq;
        const isHist   = u.ativo === false;
        const avatarBg = isHist ? '#94a3b8' : '#'+Math.abs((u.name||uid).split('').reduce((h,c)=>((h<<5)-h)+c.charCodeAt(0),0)%0xffffff).toString(16).padStart(6,'0').slice(0,6);
        return { uid, u, vals, valsPend, rowTotal, rowTotalPend, rowDesc, rowLiq, isHist, avatarBg, osCount: rTec.length, osPendCount: rTecPend.length, sfVal, rowHonExtra, isV2Tec };
      });

      // Cards individuais por técnico
      const cards = tecsData.map(({ uid, u, vals, valsPend, rowTotal, rowTotalPend, rowDesc, rowLiq, isHist, avatarBg, osCount, osPendCount, sfVal, rowHonExtra, isV2Tec }) => {
        const cardBorder = isHist ? '#cbd5e1' : avatarBg;
        const headerBg  = isHist ? '#64748b' : '#1f4e79';

        const frenteItems = FRENTES.map(f => {
          const v = vals[f.key];
          return `<div style="background:${v>0?f.cor+'11':'#f8fafc'};border:1px solid ${v>0?f.cor+'44':'#e5e7eb'};border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-size:.65rem;font-weight:700;color:${v>0?f.cor:'#94a3b8'};text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${f.label}</div>
            <div style="font-size:.85rem;font-weight:800;color:${v>0?f.cor:'#cbd5e1'}">${v>0?fmt(v):'—'}</div>
          </div>`;
        }).join('');

        const semOS = rowTotal === 0 && rowDesc === 0;
        return `<div style="background:${isHist?'#f8fafc':'#fff'};border-radius:12px;border:1px solid ${cardBorder}44;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;opacity:${isHist?'.85':'1'}">
          <!-- Cabeçalho do card -->
          <div style="background:${headerBg};color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:30px;height:30px;border-radius:50%;background:${avatarBg}33;border:2px solid ${avatarBg}99;color:#fff;font-weight:800;font-size:.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${isHist?'📁':(u.name||'?')[0]}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${u.name||uid}
                ${isHist?'<span style="font-size:.6rem;font-weight:600;background:rgba(255,255,255,.2);border-radius:4px;padding:1px 5px;margin-left:5px">histórico</span>':''}
              </div>
              <div style="font-size:.68rem;opacity:.75;margin-top:1px">${osCount} OS no período</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button onclick="exportarCardTecnico('${uid}','${mesAtual}')" title="Gerar relatório"
                style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:7px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background .15s"
                onmouseover="this.style.background='rgba(255,255,255,.28)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
                <i class="fas fa-file-alt"></i> Relatório
              </button>
              <button onclick="enviarRelatorioWhatsApp('${uid}','${mesAtual}')" title="Enviar via WhatsApp"
                style="background:#25d366;border:1px solid #20bd5a;color:#fff;border-radius:7px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background .15s"
                onmouseover="this.style.background='#1da851'" onmouseout="this.style.background='#25d366'">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>
          </div>
          <!-- Badge OS pendentes de validação -->
          ${osPendCount>0?`
          <div style="background:${_prazoVencido?'#fff1f2':_prazoProximo?'#fffbeb':'#eff6ff'};border-bottom:1px solid ${_prazoVencido?'#fca5a5':_prazoProximo?'#fde68a':'#bfdbfe'};padding:6px 14px;display:flex;align-items:center;gap:6px">
            <i class="fas fa-${_prazoVencido?'exclamation-circle':_prazoProximo?'clock':'info-circle'}" style="color:${_prazoVencido?'#dc2626':_prazoProximo?'#d97706':'#1f4e79'};font-size:.75rem"></i>
            <span style="font-size:.73rem;font-weight:700;color:${_prazoVencido?'#991b1b':_prazoProximo?'#92400e':'#1f4e79'}">
              ${osPendCount} OS pendentes de validação · ${fmt(rowTotalPend)} ${_prazoVencido?'— prazo vencido, não entram no fechamento':'— prazo: dia 10 do próximo mês'}
            </span>
          </div>`:''}
          <!-- Frentes (grade 2×2) -->
          <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:7px">
            ${frenteItems}
          </div>
          <!-- Serviço fixo mensal (se houver) -->
          ${sfVal > 0 ? `
          <div style="padding:4px 12px 2px;display:flex;align-items:center;gap:6px;background:#f0fdf4;border-top:1px solid #bbf7d0">
            <i class="fas fa-plus-circle" style="color:#16a34a;font-size:.7rem"></i>
            <span style="font-size:.72rem;color:#166534;font-weight:600">${(window.servicosFixos?.[uid]?.descricao)||'Serviço Fixo'}</span>
            <span style="margin-left:auto;font-size:.78rem;font-weight:800;color:#16a34a">+${fmt(sfVal)}</span>
          </div>` : ''}
          <!-- Honorários Extra (V2) -->
          ${isV2Tec && rowHonExtra > 0 ? `
          <div style="padding:4px 12px 2px;display:flex;align-items:center;gap:6px;background:#faf5ff;border-top:1px solid #e9d5ff">
            <i class="fas fa-coins" style="color:#7c3aed;font-size:.7rem"></i>
            <span style="font-size:.72rem;color:#6d28d9;font-weight:600">Honorários Extra</span>
            <span style="margin-left:auto;font-size:.78rem;font-weight:800;color:#7c3aed">+${fmt(rowHonExtra)}</span>
          </div>` : ''}
          <!-- Rodapé: totais -->
          <div style="border-top:1px solid #e5e7eb;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:6px;background:${isHist?'#f1f5f9':'#f9fafb'}">
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Bruto</div>
              <div style="font-size:.88rem;font-weight:800;color:${rowTotal>0?'#16a34a':'#cbd5e1'}">${semOS?'—':fmt(rowTotal)}</div>
            </div>
            <div style="width:1px;height:28px;background:#e5e7eb"></div>
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Desconto</div>
              <div style="font-size:.88rem;font-weight:800;color:${rowDesc>0?'#dc2626':'#cbd5e1'}">${rowDesc>0?'-'+fmt(rowDesc):'—'}</div>
            </div>
            <div style="width:1px;height:28px;background:#e5e7eb"></div>
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Líquido</div>
              <div style="font-size:.92rem;font-weight:800;color:${semOS?'#cbd5e1':rowLiq>=0?'#0f766e':'#dc2626'}">${semOS?'—':fmt(rowLiq)}</div>
            </div>
          </div>
        </div>`;
      });

      // Cards dos Fiscais (V0) — salário fixo
      const fiscais = Object.entries(usersCache).filter(([,u]) => _isFiscal(u) && u.ativo !== false);
      let gtotalFiscal = 0;
      const cardsFiscal = fiscais.map(([fid, fu]) => {
        const descFiscal = _descontoTecMes(fid);
        const liqFiscal  = SALARIO_V0 - descFiscal;
        gtotalFiscal += liqFiscal;
        return `<div style="background:#fffbeb;border-radius:12px;border:1px solid #fde68a;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden">
          <div style="background:#854d0e;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.5);color:#fff;font-weight:800;font-size:.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${(fu.name||'F')[0]}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:.88rem">${fu.name||fid}</div>
              <div style="font-size:.68rem;opacity:.75">Gestão — Honorários</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button onclick="exportarCardTecnico('${fid}','${mesAtual}')" title="Gerar relatório"
                style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:7px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap"
                onmouseover="this.style.background='rgba(255,255,255,.28)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
                <i class="fas fa-file-alt"></i> Relatório
              </button>
              <button onclick="enviarRelatorioWhatsApp('${fid}','${mesAtual}')" title="Enviar via WhatsApp"
                style="background:#25d366;border:1px solid #20bd5a;color:#fff;border-radius:7px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap"
                onmouseover="this.style.background='#1da851'" onmouseout="this.style.background='#25d366'">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>
          </div>
          <div style="padding:12px;text-align:center">
            <div style="font-size:.65rem;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">Honorários Mensais</div>
            <div style="font-size:1.1rem;font-weight:800;color:#854d0e">${fmt(SALARIO_V0)}</div>
          </div>
          <div style="border-top:1px solid #fde68a;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:6px;background:#fefce8">
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Bruto</div>
              <div style="font-size:.88rem;font-weight:800;color:#854d0e">${fmt(SALARIO_V0)}</div>
            </div>
            <div style="width:1px;height:28px;background:#fde68a"></div>
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Desconto</div>
              <div style="font-size:.88rem;font-weight:800;color:${descFiscal>0?'#dc2626':'#cbd5e1'}">${descFiscal>0?'-'+fmt(descFiscal):'—'}</div>
            </div>
            <div style="width:1px;height:28px;background:#fde68a"></div>
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Líquido</div>
              <div style="font-size:.92rem;font-weight:800;color:#059669">${fmt(liqFiscal)}</div>
            </div>
          </div>
        </div>`;
      });

      // Card Jefferson V1 (calculado a partir do V3)
      let cardsJefferson = [];
      const jeffCalc = calcJeffersonV1(mesAtual);
      if (jeffCalc && jeffCalc.totalV1 > 0) {
        const { uid, nome, v1perFrente, totalV1, totalV3, osCount } = jeffCalc;
        const jeffDesc = _descontoTecMes(uid);
        const jeffLiq = totalV1 - jeffDesc;

        const jeffFrenteItems = FRENTES.map(f => {
          const v = v1perFrente[f.key];
          return `<div style="background:${v>0?f.cor+'11':'#f8fafc'};border:1px solid ${v>0?f.cor+'44':'#e5e7eb'};border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-size:.65rem;font-weight:700;color:${v>0?f.cor:'#94a3b8'};text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${f.label}</div>
            <div style="font-size:.85rem;font-weight:800;color:${v>0?f.cor:'#cbd5e1'}">${v>0?fmt(v):'—'}</div>
          </div>`;
        }).join('');

        const jeffCard = `<div style="background:#fff;border-radius:12px;border:1px solid #4f46e5;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;position:relative">
          <div style="position:absolute;top:0;right:0;background:#4f46e5;color:#fff;padding:2px 8px;font-size:.6rem;font-weight:700;border-radius:0 12px 0 8px">V1 calculado</div>
          <!-- Cabeçalho do card -->
          <div style="background:#4f46e5;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px">
            <div style="width:30px;height:30px;border-radius:50%;background:#4f46e533;border:2px solid #4f46e599;color:#fff;font-weight:800;font-size:.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${(nome||'J')[0]}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${nome}
              </div>
              <div style="font-size:.68rem;opacity:.75;margin-top:1px">${osCount} OS V3 no período</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button onclick="exportarCardTecnico('${uid}','${mesAtual}')" title="Gerar relatório"
                style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:7px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background .15s"
                onmouseover="this.style.background='rgba(255,255,255,.28)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
                <i class="fas fa-file-alt"></i> Relatório
              </button>
              <button onclick="enviarRelatorioWhatsApp('${uid}','${mesAtual}')" title="Enviar via WhatsApp"
                style="background:#25d366;border:1px solid #20bd5a;color:#fff;border-radius:7px;padding:5px 9px;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background .15s"
                onmouseover="this.style.background='#1da851'" onmouseout="this.style.background='#25d366'">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>
          </div>
          <!-- Info note -->
          <div style="background:#f0f4ff;border-bottom:1px solid #c7d2fe;padding:6px 14px;display:flex;align-items:center;gap:6px;font-size:.7rem;color:#312e81">
            <i class="fas fa-info-circle" style="flex-shrink:0"></i>
            <span><b>Valores V1 calculados</b> a partir do V3 importado, deduzindo o trabalho de outros técnicos.</span>
          </div>
          <!-- Frentes (grade 2×2) -->
          <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:7px">
            ${jeffFrenteItems}
          </div>
          <!-- Rodapé: totais -->
          <div style="border-top:1px solid #e5e7eb;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:6px;background:#f9fafb">
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Bruto V1</div>
              <div style="font-size:.88rem;font-weight:800;color:#4f46e5">${fmt(totalV1)}</div>
            </div>
            <div style="width:1px;height:28px;background:#e5e7eb"></div>
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Desconto</div>
              <div style="font-size:.88rem;font-weight:800;color:${jeffDesc>0?'#dc2626':'#cbd5e1'}">${jeffDesc>0?'-'+fmt(jeffDesc):'—'}</div>
            </div>
            <div style="width:1px;height:28px;background:#e5e7eb"></div>
            <div style="text-align:center;flex:1">
              <div style="font-size:.62rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Líquido</div>
              <div style="font-size:.92rem;font-weight:800;color:${jeffLiq>=0?'#0f766e':'#dc2626'}">${fmt(jeffLiq)}</div>
            </div>
          </div>
        </div>`;

        cardsJefferson.push(jeffCard);

        // Adiciona Jefferson aos totais gerais (V1 calculado)
        FRENTES.forEach(f => {
          totFrentes[f.key] += v1perFrente[f.key];
        });
        gtotal += totalV1;
        gtotalDesc += jeffDesc;
        gtotalLiq += jeffLiq;
      }

      // Barra de total geral
      const totalBar = `<div style="background:#1f4e79;border-radius:10px;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:16px;margin-bottom:16px">
        <div style="font-size:.82rem;font-weight:800;color:#fff;flex:1;min-width:120px">▸ TOTAL GERAL</div>
        ${FRENTES.map(f=>`<div style="text-align:center">
          <div style="font-size:.6rem;font-weight:700;color:${f.cor === '#1a6fc4' || f.cor === '#0891b2' ? '#93c5fd' : f.cor === '#ea580c' ? '#fdba74' : '#c4b5fd'};text-transform:uppercase;letter-spacing:.04em">${f.label}</div>
          <div style="font-size:.82rem;font-weight:800;color:#fff">${totFrentes[f.key]>0?fmt(totFrentes[f.key]):'—'}</div>
        </div>`).join('')}
        <div style="width:1px;height:32px;background:rgba(255,255,255,.2)"></div>
        <div style="text-align:center">
          <div style="font-size:.6rem;font-weight:700;color:#86efac;text-transform:uppercase;letter-spacing:.04em">Bruto</div>
          <div style="font-size:.88rem;font-weight:800;color:#4ade80">${fmt(gtotal)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.6rem;font-weight:700;color:#fca5a5;text-transform:uppercase;letter-spacing:.04em">Descontos</div>
          <div style="font-size:.88rem;font-weight:800;color:#f87171">${gtotalDesc>0?'-'+fmt(gtotalDesc):'—'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.6rem;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:.04em">Líquido</div>
          <div style="font-size:1rem;font-weight:800;color:#34d399">${fmt(gtotalLiq)}</div>
        </div>
      </div>`;

      const allCards = [...cards, ...cardsJefferson, ...cardsFiscal].join('');
      prodEl.innerHTML = totalBar +
        `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px">${allCards}</div>`;
    }
  }

  _renderFinDescontos();
}

async function exportarCardTecnico(uid, mesAno, paraWhatsApp=false) {
  const u = usersCache[uid] || {};
  const fmt = v => `<span class="money-val">R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  const _n  = s => (s||'').normalize('NFC').trim().toUpperCase();
  const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [y, m] = mesAno.split('-').map(Number);
  const mesLabel = `${MESES_PT[m-1]} ${y}`;

  const FRENTES = [
    {key:'FM', prof:'FILIAL',  tipo:'MANUTENÇÃO', label:'Filial — Manutenção'},
    {key:'FP', prof:'FILIAL',  tipo:'PROJETO',    label:'Filial — Projeto'},
    {key:'MM', prof:'MATRIZ',  tipo:'MANUTENÇÃO', label:'Matriz — Manutenção'},
    {key:'MP', prof:'MATRIZ',  tipo:'PROJETO',    label:'Matriz — Projeto'},
  ];

  // Dados das empresas (contratante + contratada)
  let empresaContratante = {};
  empresaContratante = await _dbRead('config/assinatura_master', {});
  const empresaPrestador = u.empresa || {};

  // Registros do técnico no mês
  const recs = allRecords.filter(r =>
    r.userId === uid &&
    (r.data||'').startsWith(mesAno) &&
    !(r.importado && (r.nivelImp||'V1')==='V3')
  ).sort((a,b) => (a.data||'').localeCompare(b.data||''));

  // Produção por frente
  const vals = {};
  let totalBruto = 0;
  FRENTES.forEach(f => {
    const v = recs.filter(r => _n(r.profile)===f.prof && _n(r.tipo)===f.tipo).reduce((s,r)=>s+(r.total||0),0);
    vals[f.key] = v;
    totalBruto += v;
  });

  // V0 (Fiscal) — usa salário fixo de gestão como totalBruto
  const _isFiscalUser = _isFiscal(u);
  if (_isFiscalUser) {
    FRENTES.forEach(f => { vals[f.key] = 0; });
    totalBruto = window.SALARIO_V0 || 3000;
  }

  // Serviço fixo mensal (ex: Gestão KMZ) — soma ao totalBruto
  const sfValCard = !_isFiscalUser && window.getServicoFixoValor ? window.getServicoFixoValor(uid) : 0;
  if (sfValCard > 0) totalBruto += sfValCard;

  // Descontos do mês
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

  // Honorarios Extra (bonus V2) -- so para tecnicos V2/supervisor
  const _isV2Card = !_isFiscalUser && ((u.nivel === 'V2') || (u.supervisao === true));
  let honExtrasCard = 0;
  if (_isV2Card) {
    const _masterU2 = new Set(Object.entries(usersCache).filter(([,ju])=>_isAdmin(ju)||_isFiscal(ju)||_isObservador(ju)).map(([id])=>id));
    const _jeffU2   = new Set(Object.entries(usersCache).filter(([,ju])=>(ju.name||'').toLowerCase()==='jefferson'&&ju.role!=='master').map(([id])=>id));
    allRecords.filter(r =>
      (r.data||'').startsWith(mesAno) &&
      !_masterU2.has(r.userId||'') &&
      !_jeffU2.has(r.userId||'') &&
      !(r.importado && (r.nivelImp||'V1')==='V3')
    ).forEach(r => {
      (r.servicos||[]).forEach(sv => {
        const q = Number(sv.qtd)||0;
        if (r.importado && sv.valorV2 !== undefined) {
          honExtrasCard += sv.valorV2 - (Number(sv.valor)||0);
        } else {
          honExtrasCard += q * ((precosV2map[sv.tipo]||0) - (precosV1map[sv.tipo]||0));
        }
      });
    });
    totalBruto += honExtrasCard;
  }

  // Descricao do servico fixo mensal (ex: Gestao KMZ)
  const sfDesc = (window.servicosFixos && window.servicosFixos[uid] && window.servicosFixos[uid].descricao)
    ? window.servicosFixos[uid].descricao
    : 'Servico Fixo Mensal';

  const totalLiq  = totalBruto - totalDesc;

  // Linhas adicionais pre-computadas (evita template literals aninhados)
  const _sfValRow = sfValCard > 0
    ? '<tr style="background:#f0fdf4">'
      + '<td style="padding:8px 10px;font-size:.82rem;font-weight:600;color:#166534">' + sfDesc + '</td>'
      + '<td style="padding:8px 10px;font-size:.82rem;text-align:center;color:#64748b">—</td>'
      + '<td style="padding:8px 10px;font-size:.82rem;text-align:right;font-weight:700;color:#16a34a">' + fmt(sfValCard) + '</td>'
      + '</tr>'
    : '';
  const _honExtrasRow = (_isV2Card && honExtrasCard > 0)
    ? '<tr style="background:#faf5ff">'
      + '<td style="padding:8px 10px;font-size:.82rem;font-weight:600;color:#7c3aed">Honorários Extra</td>'
      + '<td style="padding:8px 10px;font-size:.82rem;text-align:center;color:#64748b">—</td>'
      + '<td style="padding:8px 10px;font-size:.82rem;text-align:right;font-weight:700;color:#7c3aed">+' + fmt(honExtrasCard) + '</td>'
      + '</tr>'
    : '';

  // Data de geracao
  const hoje = new Date();
  const dataGer = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;

  // Linhas das OS
  const linhasOS = recs.length ? recs.map((r,i) => {
    const data = r.data ? r.data.split('-').reverse().join('/') : '—';
    const svcs = (r.servicos||[]).map(s=>`${s.tipo} (${s.qtd}×)`).join(', ') || '—';
    return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="padding:6px 10px;font-size:.78rem;white-space:nowrap">${data}</td>
      <td style="padding:6px 10px;font-size:.78rem;font-weight:600">${r.codigo_os||'—'}</td>
      <td style="padding:6px 10px;font-size:.78rem">${r.profile||'—'}</td>
      <td style="padding:6px 10px;font-size:.78rem">${r.tipo||'—'}</td>
      <td style="padding:6px 10px;font-size:.78rem">${r.cidade||'—'}</td>
      <td style="padding:6px 10px;font-size:.78rem">${svcs}</td>
      <td style="padding:6px 10px;font-size:.78rem;text-align:right;font-weight:700">${r.total>0?fmt(r.total):'—'}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" style="padding:14px;text-align:center;color:#94a3b8;font-size:.82rem">Nenhuma OS lançada neste período</td></tr>`;

  // Linhas de desconto
  const linhasDesc = descontosMes.length ? descontosMes.map((d,i) => {
    const tot = Number(d.parcelas)||1;
    const [yi,mi] = (d.parcelaInicio||d.mesAno||'').split('-').map(Number);
    const [ya,ma] = mesAno.split('-').map(Number);
    const parcAtual = Math.min(Math.max((ya-yi)*12+(ma-mi)+1, 1), tot);
    const vlrParcela = +(d.valor/tot).toFixed(2);
    return `<tr style="background:${i%2===0?'#fff':'#fff7ed'}">
      <td style="padding:6px 10px;font-size:.8rem">${d.motivo||'—'}</td>
      <td style="padding:6px 10px;font-size:.8rem;text-align:center">${parcAtual}/${tot}</td>
      <td style="padding:6px 10px;font-size:.8rem;text-align:right;font-weight:700;color:#dc2626">-${fmt(vlrParcela)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="3" style="padding:10px;text-align:center;color:#94a3b8;font-size:.8rem">Nenhum desconto neste mês</td></tr>`;

  // ── Gera codigo unico do relatorio e QR Code ──
  const _rndHex = () => Math.random().toString(16).slice(2, 6).toUpperCase();
  const codigoRelatorio = `RSP-${mesAno}-${(u.name||'X').slice(0,3).toUpperCase()}-${_rndHex()}`;
  const linkUpload = `https://solucaoderua.web.app?relatorio=${codigoRelatorio}`;
  let qrImgTag = '';
  try {
    const qr = qrcode(0, 'M');
    qr.addData(linkUpload);
    qr.make();
    qrImgTag = qr.createImgTag(3, 8);
  } catch(_) { qrImgTag = '<span style="font-size:.7rem;color:#94a3b8">[QR indisponivel]</span>'; }

  // Salva no Firebase se for envio WhatsApp
  if (paraWhatsApp) {
    try {
      await _dbSet('relatorios/' + codigoRelatorio, {
        codigo: codigoRelatorio, uid, nomePrestador: u.name||uid, mesAno,
        valorTotal: totalBruto, totalDescontos: totalDesc, valorLiquido: totalLiq, totalOS: recs.length,
        geradoEm: new Date().toISOString(), geradoPor: currentUser?.id||'master', geradoPorNome: currentUser?.name||'Master',
        status: 'enviado', linkUpload
      });
    } catch(e) { console.error('[exportarCardTecnico] Firebase:', e); }
  }


  // ── Detalhamento Honorários Extra por prestador × frente (só V2) ──────────
  let _honExtrasDetalheSection = '';
  if (_isV2Card && honExtrasCard > 0) {
    const _normD = s => (s||'').normalize('NFC').trim().toUpperCase();
    const _masterU3 = new Set(
      Object.entries(usersCache)
        .filter(([,ju]) => _isAdmin(ju) || _isFiscal(ju) || _isObservador(ju))
        .map(([id]) => id)
    );
    const _jeffU3 = new Set(
      Object.entries(usersCache)
        .filter(([,ju]) => (ju.name||'').toLowerCase() === 'jefferson' && ju.role !== 'master')
        .map(([id]) => id)
    );
    const _byKey = {};
    allRecords.filter(r =>
      (r.data||'').startsWith(mesAno) &&
      !_masterU3.has(r.userId||'') &&
      !_jeffU3.has(r.userId||'') &&
      !(r.importado && (r.nivelImp||'V1') === 'V3')
    ).forEach(r => {
      const _nome = r.userName || r.userId || '—';
      const _prof = _normD(r.profile) || '—';
      const _tip  = _normD(r.tipo)    || '—';
      const _key  = `${r.userId||''}||${_prof}||${_tip}`;
      if (!_byKey[_key]) _byKey[_key] = { nome: _nome, prof: _prof, tip: _tip, bonus: 0 };
      (r.servicos||[]).forEach(sv => {
        const q = Number(sv.qtd) || 0;
        if (r.importado && sv.valorV2 !== undefined) {
          _byKey[_key].bonus += sv.valorV2 - (Number(sv.valor) || 0);
        } else {
          _byKey[_key].bonus += q * ((precosV2map[sv.tipo] || 0) - (precosV1map[sv.tipo] || 0));
        }
      });
    });
    // Agrupa por nome → total + lista de frentes
    const _porTec = {};
    Object.values(_byKey).forEach(x => {
      if (!_porTec[x.nome]) _porTec[x.nome] = { total: 0, frentes: [] };
      _porTec[x.nome].total += x.bonus;
      if (x.bonus > 0) _porTec[x.nome].frentes.push({ prof: x.prof, tip: x.tip, bonus: x.bonus });
    });
    const _tecsSorted = Object.entries(_porTec)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
    let _bnsRows = '';
    _tecsSorted.forEach(([_tnome, _tv], _ti) => {
      const _isOwner = _tnome === (u.name || '');
      const _bgRow   = _isOwner ? '#faf5ff' : (_ti % 2 === 0 ? '#fff' : '#f8fafc');
      const _frentesTxt = _tv.frentes.length > 1
        ? _tv.frentes.sort((a, b) => b.bonus - a.bonus)
            .map(f => `${f.prof} ${f.tip}: ${fmt(f.bonus)}`).join('<br>')
        : '—';
      _bnsRows +=
        `<tr style="background:${_bgRow}">` +
        `<td style="padding:8px 10px;font-size:.82rem;font-weight:${_isOwner ? '800' : '600'};color:${_isOwner ? '#7c3aed' : '#1e293b'}">` +
          _tnome +
          (_isOwner
            ? ' <span style="font-size:.65rem;background:#ede9fe;color:#7c3aed;padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">auto-prestador</span>'
            : '') +
        `</td>` +
        `<td style="padding:8px 10px;font-size:.78rem;color:#64748b">${_frentesTxt}</td>` +
        `<td style="padding:8px 10px;font-size:.82rem;text-align:right;font-weight:700;color:#7c3aed">${fmt(_tv.total)}</td>` +
        `</tr>`;
    });
    _honExtrasDetalheSection =
      `<section style="padding-bottom:0">` +
        `<div class="sec-title" style="color:#7c3aed">` +
          `<span style="margin-right:4px">💜</span>Detalhamento — Honorários Extra` +
        `</div>` +
        `<table>` +
          `<thead><tr>` +
            `<th>Prestador</th>` +
            `<th>Frentes</th>` +
            `<th style="text-align:right">Bônus Gerado</th>` +
          `</tr></thead>` +
          `<tbody>${_bnsRows}</tbody>` +
        `</table>` +
      `</section>`;
  }
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${_isFiscalUser ? 'Relatório de Honorários' : 'Relatório de Serviços'} — ${u.name||uid} — ${mesLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;padding:30px}
  .page{max-width:780px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)}
  .header{background:#1f4e79;color:#fff;padding:24px 30px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-title{font-size:1.3rem;font-weight:800;letter-spacing:.02em}
  .header-sub{font-size:.82rem;opacity:.8;margin-top:4px}
  .header-meta{text-align:right;font-size:.78rem;opacity:.8;line-height:1.7}
  .tec-bar{background:#e8f0fe;border-left:5px solid #1a6fc4;padding:14px 24px;display:flex;align-items:center;gap:12px}
  .tec-avatar{width:42px;height:42px;border-radius:50%;background:#1a6fc4;color:#fff;font-weight:800;font-size:1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .tec-name{font-size:1.05rem;font-weight:800;color:#1e293b}
  .tec-info{font-size:.78rem;color:#64748b;margin-top:2px}
  section{padding:20px 30px 0}
  section:last-of-type{padding-bottom:20px}
  .sec-title{font-size:.72rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  table{width:100%;border-collapse:collapse}
  th{background:#1f4e79;color:#fff;padding:7px 10px;font-size:.72rem;font-weight:700;text-align:left}
  th:last-child{text-align:right}
  tr:last-child td{border-bottom:none}
  .totals{background:#f0fdf4;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-around;align-items:center;margin-top:4px;gap:10px}
  .tot-item{text-align:center}
  .tot-label{font-size:.65rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em}
  .tot-val{font-size:1.05rem;font-weight:800;margin-top:3px}
  .confirm-box{background:#f0fdf4;border:1px dashed #16a34a;border-radius:10px;padding:18px 24px;margin:16px 30px}
  .confirm-title{font-size:.78rem;font-weight:700;color:#14532d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
  .sign-row{display:flex;gap:30px;margin-top:16px}
  .sign-box{flex:1}
  .sign-line{border-bottom:1px solid #94a3b8;margin-bottom:4px;height:28px}
  .sign-label{font-size:.68rem;color:#64748b;text-align:center}
  .disclaimer{background:#f8fafc;border-top:2px solid #e5e7eb;padding:14px 24px;margin:0 0 0 0;font-size:.66rem;color:#94a3b8;line-height:1.6}
  .footer{background:#f8fafc;border-top:1px solid #e5e7eb;padding:10px 30px;font-size:.68rem;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{
    body{background:#fff;padding:0}
    .page{box-shadow:none;border-radius:0}
    .no-print{display:none}
  }
</style>
</head>
<body>
<div class="page">
  <!-- Cabeçalho -->
  <div class="header">
    <div>
      <div class="header-title">${_isFiscalUser ? 'Relatório de Honorários' : 'Relatório de Serviços Prestados'}</div>
      <div class="header-sub">Referência: ${mesLabel}</div>
    </div>
    <div class="header-meta">
      Emitido em: ${dataGer}<br>
      ${_isFiscalUser ? 'Honorários fixos de gestão' : `${recs.length} OS executada${recs.length!==1?'s':''}`}
    </div>
  </div>

  <!-- Contratante e Contratado -->
  <div style="display:flex;gap:0;margin:0">
    <div style="flex:1;background:#e8f0fe;border-left:5px solid #1a6fc4;padding:14px 20px">
      <div style="font-size:.65rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">CONTRATANTE</div>
      <div style="font-size:.95rem;font-weight:800;color:#1e293b">${empresaContratante.nome || 'Nao configurado'}</div>
      ${empresaContratante.cpfCnpj ? '<div style="font-size:.78rem;color:#475569">CNPJ: '+empresaContratante.cpfCnpj+'</div>' : ''}
      ${empresaContratante.endereco ? '<div style="font-size:.75rem;color:#64748b">'+empresaContratante.endereco+'</div>' : ''}
      ${empresaContratante.cidade ? '<div style="font-size:.75rem;color:#64748b">'+empresaContratante.cidade+'</div>' : ''}
    </div>
    <div style="flex:1;background:#f0fdf4;border-left:5px solid #16a34a;padding:14px 20px">
      <div style="font-size:.65rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">CONTRATADO (PRESTADOR)</div>
      <div style="font-size:.95rem;font-weight:800;color:#1e293b">${empresaPrestador.razaoSocial || u.name || uid}</div>
      ${empresaPrestador.cnpj ? '<div style="font-size:.78rem;color:#475569">CNPJ: '+empresaPrestador.cnpj+'</div>' : ''}
      ${empresaPrestador.rua ? '<div style="font-size:.75rem;color:#64748b">'+empresaPrestador.rua+(empresaPrestador.numero?', '+empresaPrestador.numero:'')+(empresaPrestador.bairro?' — '+empresaPrestador.bairro:'')+'</div>' : ''}
      ${empresaPrestador.cidade ? '<div style="font-size:.75rem;color:#64748b">'+empresaPrestador.cidade+(empresaPrestador.estado?' / '+empresaPrestador.estado:'')+'</div>' : ''}
      ${empresaPrestador.telefone ? '<div style="font-size:.75rem;color:#64748b">Tel: '+empresaPrestador.telefone+'</div>' : ''}
      ${empresaPrestador.responsavel?.nome ? '<div style="font-size:.75rem;color:#64748b">Resp: '+empresaPrestador.responsavel.nome+(empresaPrestador.responsavel.cpf?' — CPF: '+empresaPrestador.responsavel.cpf:'')+'</div>' : ''}
    </div>
  </div>

  <!-- Serviços por categoria (técnicos) / Honorários fixos (fiscal) -->
  ${_isFiscalUser ? `
  <section>
    <div class="sec-title">Honorários de Gestão</div>
    <table>
      <thead><tr>
        <th>Descrição</th>
        <th style="text-align:right">Valor</th>
      </tr></thead>
      <tbody>
        <tr style="background:#fffbeb">
          <td style="padding:8px 10px;font-size:.82rem;font-weight:600">Honorários Mensais Fixos — Supervisão Operacional e Controle de Estoque</td>
          <td style="padding:8px 10px;font-size:.82rem;text-align:right;font-weight:700;color:#854d0e">${fmt(totalBruto)}</td>
        </tr>
      </tbody>
    </table>
  </section>` : `
  <section>
    <div class="sec-title">Serviços Executados por Categoria</div>
    <table>
      <thead><tr>
        <th>Categoria</th>
        <th style="text-align:center">Qtd. OS</th>
        <th style="text-align:right">Valor dos Serviços</th>
      </tr></thead>
      <tbody>
        ${FRENTES.map((f,i) => {
          const v = vals[f.key];
          const cnt = recs.filter(r=>_n(r.profile)===f.prof&&_n(r.tipo)===f.tipo).length;
          return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
            <td style="padding:8px 10px;font-size:.82rem;font-weight:600">${f.label}</td>
            <td style="padding:8px 10px;font-size:.82rem;text-align:center;color:#64748b">${cnt||'—'}</td>
            <td style="padding:8px 10px;font-size:.82rem;text-align:right;font-weight:700;color:${v>0?'#1a6fc4':'#cbd5e1'}">${v>0?fmt(v):'—'}</td>
          </tr>`;
        }).join('')}
        ${_sfValRow}${_honExtrasRow}
      </tbody>
    </table>
  </section>`}

  ${_honExtrasDetalheSection}

  <!-- Resumo de valores -->
  <section>
    <div class="sec-title">Resumo de Valores</div>
    <div class="totals">
      <div class="tot-item">
        <div class="tot-label">${_isFiscalUser ? 'Honorários Brutos' : 'Total dos Serviços'}</div>
        <div class="tot-val" style="color:${_isFiscalUser?'#854d0e':'#16a34a'}">${fmt(totalBruto)}</div>
      </div>
      <div style="font-size:1.4rem;color:#e5e7eb">—</div>
      <div class="tot-item">
        <div class="tot-label">Abatimentos</div>
        <div class="tot-val" style="color:${totalDesc>0?'#dc2626':'#94a3b8'}">${totalDesc>0?'-'+fmt(totalDesc):'—'}</div>
      </div>
      <div style="font-size:1.4rem;color:#e5e7eb">=</div>
      <div class="tot-item">
        <div class="tot-label">Saldo a Receber</div>
        <div class="tot-val" style="color:${totalLiq>=0?'#0f766e':'#dc2626'};font-size:1.2rem">${fmt(totalLiq)}</div>
      </div>
    </div>
  </section>

  <!-- Abatimentos acordados -->
  ${descontosMes.length ? `<section>
    <div class="sec-title">Abatimentos Acordados</div>
    <table>
      <thead><tr>
        <th>Descrição</th>
        <th style="text-align:center">Parcela</th>
        <th style="text-align:right">Valor</th>
      </tr></thead>
      <tbody>${linhasDesc}</tbody>
    </table>
  </section>` : ''}

  <!-- Ordens de Serviço executadas (apenas para técnicos, não fiscal) -->
  ${_isFiscalUser ? '' : `
  <section>
    <div class="sec-title">Ordens de Serviço Executadas</div>
    <table>
      <thead><tr>
        <th>Data</th><th>Nº OS</th><th>Profile</th><th>Tipo</th><th>Cidade</th><th>Serviços</th>
        <th style="text-align:right">Valor</th>
      </tr></thead>
      <tbody>${linhasOS}</tbody>
    </table>
  </section>`}

  <!-- Confirmação -->
  <div class="confirm-box">
    <div class="confirm-title">${_isFiscalUser ? 'Confirmação de Honorários' : 'Confirmação de Execução dos Serviços'}</div>
    <p style="font-size:.8rem;color:#166534;line-height:1.6">
      ${_isFiscalUser
        ? `Confirmo que os serviços de supervisão operacional e controle de estoque referentes ao
           período de <strong>${mesLabel}</strong> foram devidamente prestados, conforme o Contrato
           de Prestação de Serviços vigente, e que os honorários acima refletem o acordado.`
        : `Confirmo que os serviços listados neste relatório, referentes ao período de
           <strong>${mesLabel}</strong>, foram por mim executados conforme as ordens de serviço
           acordadas, e que as informações acima refletem os trabalhos realizados.`
      }
    </p>
    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">Assinatura do Prestador de Serviços</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">Data</div>
      </div>
    </div>
  </div>

  <!-- Codigo de verificacao + QR Code -->
  <div style="margin-top:16px;padding:12px;background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;display:flex;align-items:center;gap:16px">
    <div>${qrImgTag}</div>
    <div>
      <div style="font-size:.7rem;color:#64748b;margin-bottom:2px">CODIGO DE VERIFICACAO</div>
      <div style="font-size:.95rem;font-weight:800;color:#1f4e79;letter-spacing:.05em;font-family:monospace">${codigoRelatorio}</div>
      <div style="font-size:.68rem;color:#94a3b8;margin-top:4px">Assine este documento via Gov.br e envie pelo link acima ou escaneie o QR Code</div>
      <div style="font-size:.65rem;color:#1d4ed8;margin-top:2px;word-break:break-all">${linkUpload}</div>
    </div>
  </div>

  <!-- Disclaimer legal -->
  <div class="disclaimer">
    ⚠️ <strong>Aviso:</strong> Este documento é um relatório de controle interno de ordens de serviço
    executadas em regime de <strong>prestação de serviços autônoma</strong>, sem caracterizar vínculo
    empregatício, relação de emprego ou qualquer outra forma de contrato de trabalho regido pela CLT.
    A remuneração pelos serviços prestados é calculada com base nas ordens de serviço executadas,
    não configurando honorários, gratificação ou qualquer benefício trabalhista.
  </div>

  <div class="footer">
    <span>Relatório emitido em ${dataGer}</span>
    <span>${u.name||uid} — ${mesLabel}</span>
  </div>
</div>

<div class="no-print" style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="background:#1f4e79;color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:.9rem;font-weight:700;cursor:pointer">
    🖨️ Imprimir / Salvar PDF
  </button>
  <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;border-radius:8px;padding:12px 20px;font-size:.9rem;font-weight:700;cursor:pointer;margin-left:10px">
    Fechar
  </button>
  <button onclick="if(window.opener&&window.opener.enviarRelatorioWhatsApp){window.opener.enviarRelatorioWhatsApp('${uid}','${mesAno}')}else{alert('Salve como PDF primeiro, depois envie pelo WhatsApp.')}" style="background:#25d366;color:#fff;border:none;border-radius:8px;padding:12px 20px;font-size:.9rem;font-weight:700;cursor:pointer;margin-left:10px">
    <span style="margin-right:4px">📱</span> Enviar via WhatsApp
  </button>
</div>
</body>
</html>`;

  const _blobC = new Blob([html], { type: 'text/html; charset=utf-8' });
  const _urlC = _createBlobUrl(_blobC);
  const win = window.open(_urlC, '_blank');
  if (!win) { const a = document.createElement('a'); a.href = _urlC; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
  // Fase5: Blob gerenciado por _createBlobUrl — revogado em _revokeAllBlobs()
}

async function adicionarDescontoFin() {
  const uid     = document.getElementById('fin-desc-tec').value;
  const inicio  = _finMesAno || _mesLocalStr();
  const motivo  = document.getElementById('fin-desc-motivo').value.trim();
  const vlrParcela = parseFloat((document.getElementById('fin-desc-valor').value || '').replace(',', '.')) || 0;
  const parcelas   = parseInt(document.getElementById('fin-desc-parcelas').value) || 1;
  if (!uid)          { toast('Selecione o técnico.', 'error'); return; }
  if (!motivo)       { toast('Informe a descrição.', 'error'); return; }
  if (vlrParcela<=0) { toast('Informe o valor da parcela (ex: 500.00).', 'error'); return; }

  const btn = document.querySelector('[onclick*="adicionarDescontoFin"]');
  const btnOrigHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }

  try {
    // Armazena o valor TOTAL (parcela × qtd parcelas) — lógica interna não muda
    const valorTotal = +(vlrParcela * parcelas).toFixed(2);
    // termoAssinado: false — abatimento fica inativo até o Termo ser assinado e confirmado
    const novo = { uid, mesAno: inicio, parcelaInicio: inicio, motivo, valor: valorTotal, parcelas,
                   termoAssinado: false, criado_em: new Date().toISOString() };
    const _pushKey = await _dbPush('config/descontos', novo);
    if (!_pushKey) { if (btn) { btn.disabled = false; btn.innerHTML = btnOrigHtml; } return; }
    descontosCache[_pushKey] = { ...novo, fbKey: _pushKey };
    document.getElementById('fin-desc-motivo').value = '';
    document.getElementById('fin-desc-valor').value  = '';
    _renderFinDescontos();
    renderDescontosLista();
    renderFinanceiro();
    const fmt = v => 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    toast(`Abatimento criado. Gere e assine o Termo antes de ativar.`, 'success');
    // Abre automaticamente o Termo de Acordo para impressão/assinatura
    gerarTermoAbatimento({ ...novo, fbKey: _pushKey });
  } catch(e) {
    console.error('[adicionarDescontoFin] erro ao salvar:', e);
    toast('Erro ao salvar abatimento: ' + (e.message || e), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btnOrigHtml; }
  }
}

// ── Expor funções como globals para o admin.html (tree-shaking fix) ──
window.carregarDescontos = carregarDescontos;
window.carregarDescontosTec = carregarDescontosTec;
window.verificarTermosPendentes = verificarTermosPendentes;
window.renderTermosPendentes = renderTermosPendentes;
window.aceitarTermoAbatimento = aceitarTermoAbatimento;
window.verificarAtualizacaoTermos = verificarAtualizacaoTermos;
window.renderDescontosLista = renderDescontosLista;
window.removerDesconto = removerDesconto;
window._mesLocalStr = _mesLocalStr;
window._dateLocalStr = _dateLocalStr;
window.finMudarMes = finMudarMes;
window._finParcLabel = _finParcLabel;
window._renderFinDescontos = _renderFinDescontos;
window.calcJeffersonV1 = calcJeffersonV1;
window.renderFinanceiro = renderFinanceiro;
window.exportarCardTecnico = exportarCardTecnico;
window.adicionarDescontoFin = adicionarDescontoFin;