// src/admin/assinatura.js
// Assinatura eletrônica do master + geração de termos de abatimento
// Extraído de admin.html — Fase B

// ── Estado do canvas de assinatura ──
let _padDrawing = false;

window.abrirModalAssinatura = function() {
  // Somente o admin (role === 'master') pode cadastrar a assinatura da contratante
  if (!_isAdmin(window.currentUser)) {
    window.toast('Acesso restrito ao administrador.', 'error');
    return;
  }
  // Preenche os campos com dados salvos (se existirem)
  if (window.assinaturaMaster) {
    const nomEl = document.getElementById('assin-nome');
    const cnpjEl = document.getElementById('assin-cnpj');
    const cargoEl = document.getElementById('assin-cargo');
    const cidEl = document.getElementById('assin-cidade');
    const enderEl = document.getElementById('assin-endereco');
    if (nomEl) nomEl.value = window.assinaturaMaster.nome || '';
    if (cnpjEl) cnpjEl.value = window.assinaturaMaster.cpfCnpj || '';
    if (cargoEl) cargoEl.value = window.assinaturaMaster.cargo || '';
    if (cidEl) cidEl.value = window.assinaturaMaster.cidade || '';
    if (enderEl) enderEl.value = window.assinaturaMaster.endereco || '';
    // Mostra preview da assinatura salva
    if (window.assinaturaMaster.dataUrl) {
      const img = document.getElementById('assin-preview-img');
      img.src = window.assinaturaMaster.dataUrl;
      document.getElementById('assin-preview-wrap').style.display = 'flex';
    }
  }
  // Mostra botão "Apagar" apenas se já houver assinatura salva
  const btnAp = document.getElementById('btn-apagar-assinatura');
  if (btnAp) btnAp.style.display = window.assinaturaMaster?.dataUrl ? '' : 'none';
  // Inicializa canvas
  setTimeout(() => _iniciarPadCanvas(), 80);
  const mdlAssin = document.getElementById('modal-assinatura');
  if (mdlAssin) mdlAssin.classList.add('open');
}

window._iniciarPadCanvas = function() {
  const canvas = document.getElementById('assin-canvas');
  if (!canvas) return;

  // Aplica/reaplica configurações de estilo do traço
  const _ctx = () => {
    const c = document.getElementById('assin-canvas').getContext('2d');
    c.strokeStyle = '#1e293b';
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    return c;
  };

  // Registra listeners apenas uma vez por canvas (evita duplicatas ao reabrir o modal)
  if (canvas._padReady) return;
  canvas._padReady = true;

  const getPos = (e) => {
    const cvs = document.getElementById('assin-canvas');
    if (!cvs) return { x: 0, y: 0 };
    const r = cvs.getBoundingClientRect();
    const scaleX = cvs.width  / r.width;
    const scaleY = cvs.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * scaleX, y: (src.clientY - r.top) * scaleY };
  };

  canvas.addEventListener('mousedown', (e) => {
    _padDrawing = true;
    const pos = getPos(e);
    const c = _ctx();
    c.beginPath();
    c.moveTo(pos.x, pos.y);
    const hint = document.getElementById('assin-canvas-hint');
    if (hint) hint.style.display = 'none';
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!_padDrawing) return;
    const pos = getPos(e);
    const c = _ctx();
    c.lineTo(pos.x, pos.y);
    c.stroke();
  });

  canvas.addEventListener('mouseup',    () => { _padDrawing = false; });
  canvas.addEventListener('mouseleave', () => { _padDrawing = false; });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    _padDrawing = true;
    const pos = getPos(e);
    const c = _ctx();
    c.beginPath();
    c.moveTo(pos.x, pos.y);
    const hint = document.getElementById('assin-canvas-hint');
    if (hint) hint.style.display = 'none';
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!_padDrawing) return;
    const pos = getPos(e);
    const c = _ctx();
    c.lineTo(pos.x, pos.y);
    c.stroke();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    _padDrawing = false;
  }, { passive: false });
}

window.limparPadAssinatura = function() {
  const canvas = document.getElementById('assin-canvas');
  if (!canvas) return;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('assin-canvas-hint').style.display = '';
}

window.usarAssinaturaSalva = function() {
  // Carrega a assinatura salva no canvas para ser re-salva junto com novos dados
  if (!window.assinaturaMaster?.dataUrl) return;
  const canvas = document.getElementById('assin-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    document.getElementById('assin-canvas-hint').style.display = 'none';
  };
  img.src = window.assinaturaMaster.dataUrl;
}

window.salvarAssinaturaMaster = async function() {
  if (!_isAdmin(window.currentUser)) {
    window.toast('Acesso restrito ao administrador.', 'error');
    return;
  }
  const canvas = document.getElementById('assin-canvas');
  const nome     = document.getElementById('assin-nome').value.trim();
  const cpfCnpj  = document.getElementById('assin-cnpj').value.trim();
  const cargo    = document.getElementById('assin-cargo').value.trim();
  const cidade   = document.getElementById('assin-cidade').value.trim();
  const endereco = document.getElementById('assin-endereco').value.trim();

  if (!nome) { window.toast('Preencha o Nome / Razão Social.', 'error'); return; }

  // Verifica se o canvas tem algo desenhado
  let dataUrl = null;
  if (canvas) {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const temDesenho = pixels.some((v, i) => i % 4 === 3 && v > 0); // canal alfa
    if (temDesenho) {
      dataUrl = canvas.toDataURL('image/png');
    } else if (window.assinaturaMaster?.dataUrl) {
      // Sem novo desenho → mantém a assinatura anterior
      dataUrl = window.assinaturaMaster.dataUrl;
    }
  }

  const dados = { nome, cpfCnpj, cargo, cidade, endereco, dataUrl, salvo_em: new Date().toISOString() };

  const btn = document.querySelector('#modal-assinatura .btn-primary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...'; }
  try {
    await window._dbSet('config/assinatura_master', dados);
    window.assinaturaMaster = dados;
    window.toast('Assinatura salva com sucesso!', 'success');
    window.fecharModal('modal-assinatura');
    // Atualiza preview no botão do financeiro
    window._atualizarBotaoAssinatura();
  } catch(e) {
    console.error('[salvarAssinaturaMaster]', e);
    window.toast('Erro ao salvar. Tente novamente.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Salvar Assinatura'; }
  }
}

window.apagarAssinaturaMaster = async function() {
  if (!_isAdmin(window.currentUser)) {
    window.toast('Acesso restrito ao administrador.', 'error');
    return;
  }
  if (!confirm('Apagar a assinatura cadastrada?\nEsta ação não pode ser desfeita.')) return;
  const btn = document.getElementById('btn-apagar-assinatura');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Apagando...'; }
  try {
    await window._dbRemove('config/assinatura_master');
    window.assinaturaMaster = null;
    // Limpa canvas
    const canvas = document.getElementById('assin-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    const hint = document.getElementById('assin-canvas-hint');
    if (hint) hint.style.display = '';
    // Oculta preview
    const pw = document.getElementById('assin-preview-wrap');
    if (pw) {
      pw.style.display = 'none';
      const img = document.getElementById('assin-preview-img');
      if (img) img.src = '';
    }
    // Limpa campos
    ['assin-nome','assin-cnpj','assin-cargo','assin-cidade','assin-endereco']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    if (btn) btn.style.display = 'none';
    window.toast('Assinatura apagada com sucesso.', 'success');
    window.fecharModal('modal-assinatura');
    window._atualizarBotaoAssinatura();
  } catch(e) {
    console.error('[apagarAssinaturaMaster]', e);
    window.toast('Erro ao apagar. Tente novamente.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash-alt"></i> Apagar Assinatura'; }
  }
}

window._atualizarBotaoAssinatura = function() {
  const btn = document.getElementById('btn-assinatura-master');
  if (!btn) return;
  // Oculta o botão completamente para usuários que não são admin
  if (!_isAdmin(window.currentUser)) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  if (window.assinaturaMaster?.dataUrl) {
    btn.style.background = '#f0fdf4';
    btn.style.borderColor = '#86efac';
    btn.style.color = '#16a34a';
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Assinatura Cadastrada';
  } else {
    btn.style.background = '#fff7ed';
    btn.style.borderColor = '#fed7aa';
    btn.style.color = '#ea580c';
    btn.innerHTML = '<i class="fas fa-signature"></i> Cadastrar Assinatura';
  }
}

window.gerarTermoAbatimento = function(desconto) {
  const u        = window.usersCache[desconto.uid] || {};
  const empTec   = u.empresa || {};
  // Dados da contratante (master/admin) — usa empresa do cache se disponível
  const masterUid  = Object.keys(window.usersCache).find(k => window._isAdmin(window.usersCache[k])) || '';
  const empAdmin   = window.usersCache[masterUid]?.empresa || {};
  const admRazao   = empAdmin.razaoSocial  || window.assinaturaMaster?.nome   || '';
  const admCnpj    = empAdmin.cnpj         || window.assinaturaMaster?.cpfCnpj || '';
  const admEnder   = empAdmin.rua ? `${empAdmin.rua}, ${empAdmin.numero}${empAdmin.complemento?', '+empAdmin.complemento:''}, ${empAdmin.bairro}, ${empAdmin.cidade}/${empAdmin.estado}` : (window.assinaturaMaster?.endereco || '');
  const admCidade  = empAdmin.cidade || window.assinaturaMaster?.cidade || '';
  const admResp    = empAdmin.responsavel?.nome || empAdmin.respNome   || window.assinaturaMaster?.nome  || '';
  const admCargo   = empAdmin.responsavel?.cargo || empAdmin.respCargo  || window.assinaturaMaster?.cargo || '';
  const admPix     = empAdmin.pix        || '';
  const admPixTipo = empAdmin.pixTipo    || '';
  const admPixFav  = empAdmin.pixFavorecido || admRazao;
  const admForo    = empAdmin.foro       || admCidade || '';
  const admDiaChoice = empAdmin.diaChoice || '';
  // Dados do contratado (prestador)
  const tecRazao  = empTec.razaoSocial || u.name || desconto.uid;
  const tecCnpj   = empTec.cnpj   || '';
  const tecEnder  = empTec.rua ? `${empTec.rua}, ${empTec.numero}${empTec.complemento?', '+empTec.complemento:''}, ${empTec.bairro}, ${empTec.cidade}/${empTec.estado}` : '';
  const tecResp   = empTec.responsavel?.nome || empTec.respNome || u.name || '';
  const tecCpf    = empTec.responsavel?.cpf || empTec.respCpf  || '';
  const tecRg     = empTec.responsavel?.rg || empTec.respRg   || '';
  const tecCargo  = empTec.responsavel?.cargo || empTec.respCargo || 'Prestador de Serviços Autônomo';

  const fmt      = v => 'R$ ' + Number(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [y, m]   = (desconto.parcelaInicio || desconto.mesAno || '').split('-').map(Number);
  const mesIni   = y ? `${MESES_PT[m-1]} ${y}` : '—';
  const hoje     = new Date();
  const dataHoje = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`;
  const tot      = Number(desconto.parcelas) || 1;
  const vlrParcela = fmt(+(desconto.valor / tot).toFixed(2));
  const vlrTotal   = fmt(desconto.valor);

  // Calcula data prevista de término
  const mFim = m + tot - 1;
  const yFim = y + Math.floor((mFim - 1) / 12);
  const mFimAdj = ((mFim - 1) % 12) + 1;
  const mesFim  = y ? `${MESES_PT[mFimAdj-1]} ${yFim}` : '—';

  const _ce = (val, placeholder) => val
    ? `<span>${val}</span>`
    : `<span contenteditable="true" style="outline:none;background:#fffde7;border-bottom:1px solid #f59e0b;cursor:text;display:inline-block;min-width:140px">${placeholder||''}</span>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Venda a Prazo — ${tecRazao} [${desconto.fbKey||desconto._key||''}]</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Times New Roman',serif;background:#f5f5f0;color:#1a1a1a;padding:30px;font-size:13px}
  .page{max-width:760px;margin:0 auto;background:#fff;padding:50px 55px;border:1px solid #ccc;box-shadow:0 2px 12px rgba(0,0,0,.12)}
  h1{font-size:15px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
  .subtitle{text-align:center;font-size:11.5px;color:#555;margin-bottom:6px}
  .subtitle2{text-align:center;font-size:10.5px;color:#888;margin-bottom:26px}
  .divider{border:none;border-top:2px solid #1a1a1a;margin:18px 0}
  .divider-thin{border:none;border-top:1px solid #ccc;margin:14px 0}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1a3a5c;margin:18px 0 8px;border-bottom:2px solid #1a3a5c;padding-bottom:3px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:10px}
  .party-box{border:1px solid #d1d5db;border-radius:6px;padding:12px 14px;background:#fafafa}
  .party-label{font-size:9.5px;font-weight:700;text-transform:uppercase;color:#1a3a5c;letter-spacing:.07em;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
  .field{margin-bottom:6px}
  .field-label{font-size:9.5px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.05em;margin-bottom:1px}
  .field-value{font-size:12px;border-bottom:1px dotted #aaa;padding-bottom:2px;min-height:17px}
  [contenteditable]{outline:none;background:#fffde7;border-bottom:1px solid #f59e0b !important;cursor:text}
  [contenteditable]:focus{background:#fff9c4}
  .clause{margin-bottom:10px;line-height:1.7;text-align:justify;font-size:12.5px}
  .clause strong{font-weight:700}
  .clause span.num{font-weight:700;margin-right:4px}
  .highlight{background:#f0f9ff;border-left:3px solid #1a6fc4;padding:10px 14px;border-radius:0 6px 6px 0;margin:12px 0;font-size:12.5px;line-height:1.8}
  .opcoes-box{border:2px solid #1a3a5c;border-radius:8px;overflow:hidden;margin:14px 0}
  .opcoes-header{background:#1a3a5c;color:#fff;padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  .opcoes-grid{display:grid;grid-template-columns:1fr 1fr}
  .opcao{padding:12px 14px}
  .opcao-a{border-right:1px solid #d1d5db;background:#fff8f0}
  .opcao-b{background:#f0f8ff}
  .opcao-title{font-size:11px;font-weight:700;margin-bottom:6px}
  .opcao-a .opcao-title{color:#c2410c}
  .opcao-b .opcao-title{color:#1d4ed8}
  .opcao-desc{font-size:11px;line-height:1.6;color:#374151}
  .opcao-note{font-size:10px;color:#6b7280;margin-top:4px;font-style:italic}
  .sign-section{margin-top:28px}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px}
  .sign-block{text-align:center}
  .sign-line{border-bottom:1px solid #555;margin-bottom:6px;height:44px;display:flex;align-items:flex-end;justify-content:center}
  .sign-name{font-size:11px;font-weight:700}
  .sign-sub{font-size:10px;color:#555;margin-top:2px}
  .govbr-box{background:#1351b4;color:#fff;border-radius:8px;padding:16px 20px;margin-top:24px}
  .govbr-title{font-size:12px;font-weight:700;margin-bottom:8px}
  .govbr-step{font-size:11px;line-height:1.8;opacity:.92}
  .govbr-link{color:#addbff;font-weight:700}
  .disclaimer{background:#fff8e1;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-top:18px;font-size:10.5px;color:#78350f;line-height:1.6}
  .fbkey{font-size:9px;color:#bbb;text-align:right;margin-top:8px}
  .edit-hint{background:#fffde7;border:1px dashed #f59e0b;border-radius:6px;padding:8px 12px;font-size:10.5px;color:#92400e;margin-bottom:18px;display:flex;align-items:center;gap:6px}
  @media print{
    body{background:#fff;padding:0}
    .page{box-shadow:none;border:none;padding:30px 40px}
    .no-print{display:none}
    [contenteditable]{background:transparent !important;border-bottom:1px dotted #999 !important}
    .edit-hint{display:none}
    .govbr-box,.opcoes-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="page">

  ${(!admRazao || !tecCnpj) ? `<div class="edit-hint no-print">✏️ <strong>Antes de imprimir:</strong> clique nos campos amarelos para completar os dados em branco.</div>` : ''}

  <h1>Contrato de Venda a Prazo de Equipamento / Ferramenta</h1>
  <div class="subtitle">Instrumento Particular de Compra e Venda Parcelada — Código Civil Arts. 481, 482 e 521</div>
  <div class="subtitle2">Sem Vínculo Empregatício — OJ 303 TST / Súmula 331 TST</div>
  <hr class="divider">

  <!-- CLÁUSULA PRIMEIRA — Partes -->
  <div class="section-title">Cláusula Primeira — Identificação das Partes</div>
  <div class="two-col">
    <div class="party-box">
      <div class="party-label">Vendedora / Contratante</div>
      <div class="field"><div class="field-label">Razão Social</div>
        <div class="field-value">${_ce(admRazao,'Razão Social')}</div></div>
      <div class="field"><div class="field-label">CNPJ</div>
        <div class="field-value">${_ce(admCnpj,'CNPJ')}</div></div>
      <div class="field"><div class="field-label">Endereço</div>
        <div class="field-value">${_ce(admEnder,'Endereço completo')}</div></div>
      <div class="field"><div class="field-label">Representante</div>
        <div class="field-value">${_ce(admResp,'Nome do representante')}</div></div>
      <div class="field"><div class="field-label">Cargo</div>
        <div class="field-value">${_ce(admCargo,'Cargo')}</div></div>
    </div>
    <div class="party-box">
      <div class="party-label">Compradora / Contratada</div>
      <div class="field"><div class="field-label">Razão Social</div>
        <div class="field-value">${_ce(tecRazao,'Razão Social')}</div></div>
      <div class="field"><div class="field-label">CNPJ</div>
        <div class="field-value">${_ce(tecCnpj,'CNPJ')}</div></div>
      <div class="field"><div class="field-label">Endereço</div>
        <div class="field-value">${_ce(tecEnder,'Endereço completo')}</div></div>
      <div class="field"><div class="field-label">Responsável / CPF</div>
        <div class="field-value">${_ce(tecResp+(tecCpf?' — CPF: '+tecCpf:''),'Nome e CPF')}</div></div>
      <div class="field"><div class="field-label">RG</div>
        <div class="field-value">${_ce(tecRg,'RG')}</div></div>
    </div>
  </div>

  <hr class="divider-thin">

  <!-- CLÁUSULA SEGUNDA — Objeto -->
  <div class="section-title">Cláusula Segunda — Objeto</div>
  <div class="clause">
    A <strong>VENDEDORA</strong> vende à <strong>COMPRADORA</strong>, e esta compra, a prazo, o(s) bem(ns) descrito(s) abaixo,
    nos termos do art. 481 do Código Civil Brasileiro, sem que tal operação configure cessão de uso,
    locação ou qualquer forma de vínculo empregatício entre as partes.
  </div>
  <div class="highlight">
    <strong>Descrição:</strong> ${desconto.motivo || '—'}<br>
    <strong>Valor Total da Venda:</strong> ${vlrTotal}<br>
    <strong>Parcelamento:</strong> ${tot} (${window._extenso(tot)}) parcelas mensais de ${vlrParcela}<br>
    <strong>Primeira parcela:</strong> ${mesIni} &nbsp;&nbsp; <strong>Última parcela prevista:</strong> ${mesFim}
  </div>

  <!-- CLÁUSULA TERCEIRA — Preço e Parcelamento -->
  <div class="section-title">Cláusula Terceira — Preço e Parcelamento</div>
  <div class="clause"><span class="num">§1º</span>
    O preço total da compra e venda é de <strong>${vlrTotal}</strong>, dividido em <strong>${tot} parcelas mensais de ${vlrParcela}</strong>,
    com vencimento a partir de <strong>${mesIni}</strong>, sem incidência de juros ou correção monetária
    enquanto as parcelas forem quitadas até o vencimento.
  </div>
  <div class="clause"><span class="num">§2º</span>
    O bem passa à propriedade plena da <strong>COMPRADORA</strong> somente após o pagamento integral de todas as parcelas.
    Até esse momento, permanece como garantia da <strong>VENDEDORA</strong> nos termos do art. 521 do Código Civil.
  </div>

  <!-- CLÁUSULA QUARTA — Modalidade de Pagamento Mensal -->
  <div class="section-title">Cláusula Quarta — Modalidade de Pagamento Mensal (Escolha do Comprador)</div>
  <div class="clause">
    A <strong>COMPRADORA</strong> poderá, a cada mês, escolher livremente uma das seguintes modalidades de pagamento da parcela,
    mediante registro no sistema digital (SDR App) até o dia <strong>${admDiaChoice || '10'}</strong> de cada mês.
    Na ausência de escolha até o prazo, aplica-se automaticamente a <strong>Opção A</strong>.
  </div>

  <div class="opcoes-box">
    <div class="opcoes-header">Opções de Pagamento Mensal — Escolha no SDR App</div>
    <div class="opcoes-grid">
      <div class="opcao opcao-a">
        <div class="opcao-title">⬛ OPÇÃO A — Desconto no Honorário</div>
        <div class="opcao-desc">O valor da parcela (<strong>${vlrParcela}</strong>) é deduzido automaticamente
          do total de honorários do mês, antes do pagamento pela VENDEDORA.</div>
        <div class="opcao-note">Aplicada por padrão se não houver escolha até o prazo.</div>
      </div>
      <div class="opcao opcao-b">
        <div class="opcao-title">🔵 OPÇÃO B — Pagamento Direto via PIX</div>
        <div class="opcao-desc">A COMPRADORA realiza o pagamento da parcela (<strong>${vlrParcela}</strong>)
          diretamente para a conta da VENDEDORA via PIX, antes do vencimento do mês.</div>
        <div class="opcao-note">
          Chave PIX: <strong>${admPix || '—'}</strong>${admPixTipo ? ' ('+admPixTipo+')' : ''}<br>
          Favorecido: ${admPixFav || admRazao || '—'}
        </div>
      </div>
    </div>
  </div>

  <!-- CLÁUSULA QUINTA — Ausência de Vínculo -->
  <div class="section-title">Cláusula Quinta — Ausência de Vínculo Empregatício</div>
  <div class="clause"><span class="num">§1º</span>
    O presente contrato de venda a prazo <strong>não caracteriza</strong> vínculo empregatício, relação de emprego,
    subordinação hierárquica ou qualquer modalidade de contrato de trabalho regido pela CLT,
    em conformidade com a OJ 303 do TST e a Súmula 331 do TST.
  </div>
  <div class="clause"><span class="num">§2º</span>
    A opção de dedução no honorário (Opção A) decorre de livre e espontânea vontade da <strong>COMPRADORA</strong>,
    manifestada mensalmente no sistema digital, não configurando desconto compulsório por parte da VENDEDORA.
    Prevalece a realidade da relação (Súmula 331 TST) sobre a forma escolhida de pagamento.
  </div>

  <!-- CLÁUSULA SEXTA — Inadimplência -->
  <div class="section-title">Cláusula Sexta — Inadimplência</div>
  <div class="clause">
    O não pagamento de qualquer parcela — seja por desconto no honorário ou por PIX direto — por período
    superior a <strong>30 (trinta) dias</strong> após o vencimento, sujeitará a <strong>COMPRADORA</strong> a:
    multa moratória de <strong>2%</strong> sobre o valor da parcela em atraso, juros de <strong>1% ao mês</strong>
    (pro rata die) e correção monetária pelo IPCA. A <strong>VENDEDORA</strong> poderá, ainda, optar pela cobrança
    do saldo remanescente de forma antecipada.
  </div>

  <!-- CLÁUSULA SÉTIMA — Rescisão Antecipada -->
  <div class="section-title">Cláusula Sétima — Rescisão Antecipada</div>
  <div class="clause">
    Em caso de encerramento da relação de prestação de serviços antes da quitação total, o saldo devedor
    remanescente deverá ser liquidado em até <strong>60 (sessenta) dias</strong>, podendo as partes negociar
    parcelamento diferenciado. Eventual saldo pago a maior será restituído proporcionalmente,
    nos termos do art. 884 do Código Civil (vedação ao enriquecimento ilícito).
  </div>

  <!-- CLÁUSULA OITAVA — Foro -->
  <div class="section-title">Cláusula Oitava — Disposições Gerais e Foro</div>
  <div class="clause">
    As partes elegem o foro da Comarca de <strong>${_ce(admForo,'Cidade/UF')}</strong> para dirimir
    quaisquer controvérsias oriundas do presente instrumento, com renúncia de qualquer outro,
    por mais privilegiado que seja. Este contrato é regido pelas disposições do Código Civil
    Brasileiro (arts. 481, 482, 489 e 521) e produz efeitos a partir da assinatura de ambas as partes.
  </div>

  <hr class="divider-thin">

  <!-- Local e data -->
  <div style="margin:14px 0 6px;display:flex;gap:30px">
    <div class="field" style="flex:2">
      <div class="field-label">Local</div>
      <div class="field-value">${_ce(admCidade||admForo,'Cidade')}, ${dataHoje}</div>
    </div>
  </div>

  <!-- Assinaturas -->
  <div class="sign-section">
    <div class="sign-grid">
      <div class="sign-block">
        <div class="sign-line">
          ${window.assinaturaMaster?.dataUrl ? `<img src="${window.assinaturaMaster.dataUrl}" alt="assinatura" style="max-height:52px;max-width:200px;object-fit:contain">` : ''}
        </div>
        <div class="sign-name">${admResp || admRazao || 'VENDEDORA'}</div>
        <div class="sign-sub">${admCargo}</div>
        <div class="sign-sub">CNPJ: ${admCnpj || '—'}</div>
        <div class="sign-sub" style="margin-top:3px;font-size:9.5px;color:#888">Vendedora</div>
      </div>
      <div class="sign-block">
        <div class="sign-line"></div>
        <div class="sign-name">${tecResp || tecRazao}</div>
        <div class="sign-sub">${tecCargo}</div>
        <div class="sign-sub">CNPJ: ${tecCnpj||'—'} &nbsp;|&nbsp; CPF: ${tecCpf||'—'}</div>
        <div class="sign-sub" style="margin-top:3px;font-size:9.5px;color:#888">Compradora</div>
      </div>
    </div>
  </div>

  <hr class="divider-thin" style="margin-top:28px">

  <div class="govbr-box no-print">
    <div class="govbr-title">🇧🇷 Autenticação Digital via Gov.br (recomendado)</div>
    <div class="govbr-step">
      1. Salve este documento como PDF (Ctrl+P → Salvar como PDF)<br>
      2. Acesse <a class="govbr-link" href="https://assinador.iti.br" target="_blank">assinador.iti.br</a>
         e faça login com sua conta Gov.br (nível <strong>Prata ou Ouro</strong>)<br>
      3. Faça o upload do PDF e assine digitalmente<br>
      4. Envie o arquivo assinado ao contratante via sistema<br>
      5. O contratante confirma o recebimento — o contrato é então ativado
    </div>
  </div>

  <div class="disclaimer">
    ⚠️ <strong>Aviso Legal:</strong> Este instrumento é um contrato de venda a prazo (CC arts. 481 e 521),
    não constituindo relação empregatícia. A modalidade de pagamento mensal é escolhida livremente
    pela COMPRADORA no sistema digital. A autenticação digital via Gov.br tem validade jurídica
    nos termos da Lei nº 14.063/2020.
  </div>

  <div class="fbkey">Ref.: ${desconto.fbKey||'—'} &nbsp;|&nbsp; Emitido em: ${dataHoje} &nbsp;|&nbsp; v2.0 — Contrato de Venda a Prazo</div>
</div>

<div class="no-print" style="text-align:center;margin-top:22px">
  <button onclick="window.print()" style="background:#1351b4;color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:.9rem;font-weight:700;cursor:pointer">
    🖨️ Imprimir / Salvar PDF
  </button>
  <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;border-radius:8px;padding:12px 20px;font-size:.9rem;font-weight:700;cursor:pointer;margin-left:10px">
    Fechar
  </button>
</div>
</body>
</html>`;

  const _blobT = new Blob([html], { type: 'text/html; charset=utf-8' });
  const _urlT = window._createBlobUrl(_blobT);
  const win = window.open(_urlT, '_blank');
  if (!win) { const a = document.createElement('a'); a.href = _urlT; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
  // Fase5: Blob gerenciado por window._createBlobUrl
}

window._extenso = function(n) {
  const u = ['zero','uma','duas','três','quatro','cinco','seis','sete','oito','nove','dez',
             'onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const d = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  if (n < 20) return u[n];
  const dz = Math.floor(n/10), un = n%10;
  return d[dz] + (un ? ' e ' + u[un] : '');
}
