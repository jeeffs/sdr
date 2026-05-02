// src/admin/contratos.js
// Documentos autenticados, PDF, contratos, termos, rescisão
// Extraído de admin.html — Fase D

async function renderDocumentosAutenticados() {
  const container = document.getElementById('documentos-autenticados-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:30px;color:#64748b"><i class="fas fa-spinner fa-spin"></i> Carregando documentos...</div>';

  const filtroTipo = document.getElementById('doc-filtro-tipo')?.value || 'todos';
  const filtroNome = (document.getElementById('doc-filtro-nome')?.value || '').toLowerCase().trim();

  try {
    const docs = [];

    // 1. Contratos de Prestação de Serviços (contratos/{uid}/prestacaoServicos)
    if (filtroTipo === 'todos' || filtroTipo === 'prestacao') {
      const snapContratos = await db.ref('contratos').once('value');
      const contratos = snapContratos.val() || {};
      for (const [uid, data] of Object.entries(contratos)) {
        const ps = data?.prestacaoServicos;
        if (ps && ps.status === 'assinado' && ps.assinadoVia === 'govbr-tec') {
          const userName = usersCache?.[uid]?.name || uid;
          docs.push({
            tipo: 'Prestação de Serviços',
            tipoIcon: 'fa-file-contract',
            tipoColor: '#1f4e79',
            uid, userName,
            assinadoEm: ps.assinadoEm || '',
            nomeArquivo: ps.nomeArquivo || 'contrato.pdf',
            pdfBase64: ps.pdfBase64 || null,
            validacao: ps.validacao || {},
            fbPath: `contratos/${uid}/prestacaoServicos`
          });
        }
      }
    }

    // 2. Contratos de Venda a Prazo (config/descontos)
    if (filtroTipo === 'todos' || filtroTipo === 'vendaPrazo') {
      const snapDesc = await db.ref('config/descontos').once('value');
      const descontos = snapDesc.val() || {};
      for (const [fbKey, d] of Object.entries(descontos)) {
        if (d.termoAssinado === true && d.termoAssinadoVia === 'govbr-tec') {
          const userName = usersCache?.[d.uid]?.name || d.uid;
          docs.push({
            tipo: 'Venda a Prazo',
            tipoIcon: 'fa-file-invoice-dollar',
            tipoColor: '#9a3412',
            uid: d.uid, userName,
            motivo: d.motivo || '',
            assinadoEm: d.termoConfirmadoEm || '',
            nomeArquivo: d.termoNomeArquivo || 'termo.pdf',
            pdfBase64: d.pdfBase64 || null,
            validacao: d.termoValidacaoConteudo || {},
            fbKey,
            fbPath: `config/descontos/${fbKey}`
          });
        }
      }
    }

    // Filtro por nome
    const filtered = filtroNome
      ? docs.filter(d => d.userName.toLowerCase().includes(filtroNome) || (d.motivo||'').toLowerCase().includes(filtroNome))
      : docs;

    // Ordena por data (mais recente primeiro)
    filtered.sort((a, b) => (b.assinadoEm || '').localeCompare(a.assinadoEm || ''));

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8"><i class="fas fa-folder-open" style="font-size:2rem;margin-bottom:10px;display:block"></i>Nenhum documento autenticado encontrado.</div>';
      return;
    }

    let html = `<div style="font-size:.78rem;color:#64748b;margin-bottom:12px">${filtered.length} documento(s) encontrado(s)</div>`;
    filtered.forEach((d, i) => {
      const dataFmt = d.assinadoEm ? new Date(d.assinadoEm).toLocaleString('pt-BR') : '—';
      const temPDF = !!d.pdfBase64;
      html += `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px">
        <div style="width:42px;height:42px;border-radius:10px;background:${d.tipoColor}15;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="fas ${d.tipoIcon}" style="color:${d.tipoColor};font-size:1.1rem"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.88rem;color:#1e293b">${d.userName}</div>
          <div style="font-size:.78rem;color:#64748b;margin-top:2px">
            <span style="background:${d.tipoColor}15;color:${d.tipoColor};padding:2px 8px;border-radius:4px;font-weight:600;font-size:.72rem">${d.tipo}</span>
            ${d.motivo ? `<span style="margin-left:6px">${d.motivo}</span>` : ''}
          </div>
          <div style="font-size:.72rem;color:#94a3b8;margin-top:4px">
            <i class="fas fa-clock"></i> ${dataFmt}
            &nbsp;|&nbsp; <i class="fas fa-file"></i> ${d.nomeArquivo}
            ${d.validacao?.sigScore ? ` &nbsp;|&nbsp; Score: ${d.validacao.sigScore}` : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          ${temPDF ? `<button onclick="visualizarDocAutenticado(${i})" style="background:#1f4e79;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:.78rem;font-weight:600;cursor:pointer" title="Visualizar PDF">
            <i class="fas fa-eye"></i> Ver PDF
          </button>` : `<span style="font-size:.72rem;color:#94a3b8;padding:8px"><i class="fas fa-ban"></i> Sem arquivo</span>`}
        </div>
      </div>`;
    });

    container.innerHTML = html;
    // Guarda referência para visualização
    window._docsAutenticados = filtered;
  } catch(e) {
    console.error('[renderDocumentosAutenticados]', e);
    container.innerHTML = '<div style="text-align:center;padding:30px;color:#dc2626"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar documentos.</div>';
  }
}

function visualizarDocAutenticado(idx) {
  const d = window._docsAutenticados?.[idx];
  if (!d || !d.pdfBase64) { toast('PDF não disponível.', 'error'); return; }
  try {
    const bin = atob(d.pdfBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch(e) {
    console.error('[visualizarDocAutenticado]', e);
    toast('Erro ao abrir PDF.', 'error');
  }
}

function _parsePDFSignature(buffer) {
  const bytes   = new Uint8Array(buffer);
  const dec     = new TextDecoder('latin1');
  const headLen = Math.min(bytes.length, 65536);
  const tailLen = Math.min(bytes.length, 262144);
  const head    = dec.decode(bytes.slice(0, headLen));
  const tail    = dec.decode(bytes.slice(Math.max(0, bytes.length - tailLen)));
  const full    = head + tail;
  const fullLc  = full.toLowerCase();
  const temSig    = full.includes('/Sig')    || full.includes('/Type /Sig');
  const temByte   = full.includes('/ByteRange');
  const temCert   = full.includes('/Cert')   || full.includes('/PKCS7');
  const temDocMDP = full.includes('/DocMDP') || full.includes('/TransformMethod');
  let score = 0;
  if (temSig)    score += 3;
  if (temByte)   score += 3;
  if (temCert)   score += 2;
  if (temDocMDP) score += 2;
  const icpStrings = [
    'icp-brasil', 'icp brasil', 'icpbrasil',
    'ac iti', 'ac serpro', 'ac caixa', 'ac certisign', 'ac serasa',
    'ac valid', 'ac imprensa', 'ac soluti', 'ac fenacef', 'ac online',
    'ac bry', 'ac digitalsign', 'ac notariado', 'ac prodemge',
    'ac link', 'ac br-trust', 'ac cristal', 'ac syncroton',
    'autoridade certificadora', 'iti.br', 'serpro.gov.br',
    'certisign.com.br', 'serasa.com.br'
  ];
  // Só checa ICP-Brasil nos dados do certificado (/Contents hex), NÃO no texto geral
  // (o template contém "assinador.iti.br" como instrução, causando falso positivo)
  let temICP = false;
  {
    const rx = /\/Contents\s*<([0-9a-fA-F\s]{50,}?)>/g;
    let m;
    while ((m = rx.exec(tail)) !== null && !temICP) {
      try {
        const hexStr = m[1].replace(/\s/g, '');
        const limit = Math.min(hexStr.length, 400000);
        let der = '';
        for (let i = 0; i < limit; i += 2) {
          der += String.fromCharCode(parseInt(hexStr.slice(i, i + 2), 16));
        }
        const derLc = der.toLowerCase();
        const found = icpStrings.find(s => derLc.includes(s));
        if (found) { temICP = true; }
      } catch (e) {}
    }
  }
  return { score, temSig, temByte, temCert, temDocMDP, temICP };
}

async function _validarConteudoTermo(buffer, fbKey) {
  const bytes = new Uint8Array(buffer);
  const dec   = new TextDecoder('latin1');
  const raw   = dec.decode(bytes);
  const rawLc = raw.toLowerCase();

  // Helper: decodifica escapes octais de strings PDF (\000 → byte 0x00, etc.)
  function _unescapePdfLiteral(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '\\' && i + 1 < s.length) {
        i++;
        if (s[i] >= '0' && s[i] <= '7') {
          let oct = s[i];
          if (i + 1 < s.length && s[i+1] >= '0' && s[i+1] <= '7') { oct += s[++i]; }
          if (i + 1 < s.length && s[i+1] >= '0' && s[i+1] <= '7') { oct += s[++i]; }
          out.push(parseInt(oct, 8));
        } else if (s[i] === 'n') out.push(10);
        else if (s[i] === 'r') out.push(13);
        else if (s[i] === 't') out.push(9);
        else out.push(s.charCodeAt(i));
      } else {
        out.push(s.charCodeAt(i));
      }
    }
    return new Uint8Array(out);
  }

  // Helper: decodifica bytes UTF-16BE com BOM para string
  function _decodeUtf16BE(arr) {
    let s = '';
    const start = (arr[0] === 0xFE && arr[1] === 0xFF) ? 2 : 0;
    for (let i = start; i + 1 < arr.length; i += 2) {
      const code = (arr[i] << 8) | arr[i+1];
      if (code > 0) s += String.fromCharCode(code);
    }
    return s;
  }

  // ── Fase 1: Extrair /Title do PDF ──
  let titleText = '';
  try {
    // 1a) Título literal: /Title (texto aqui) — pode conter escapes octais + UTF-16BE
    const litMatch = raw.match(/\/Title\s*\(([^)]*)\)/i);
    if (litMatch) {
      const unescaped = _unescapePdfLiteral(litMatch[1]);
      if (unescaped.length >= 2 && unescaped[0] === 0xFE && unescaped[1] === 0xFF) {
        titleText = _decodeUtf16BE(unescaped);
      } else {
        titleText = litMatch[1];
      }
    }
    // 1b) Título hex: /Title <FEFF0054006500...>
    if (!titleText) {
      const hexMatch = raw.match(/\/Title\s*<([0-9a-fA-F]{6,})>/i);
      if (hexMatch) {
        const hex = hexMatch[1];
        if (hex.length >= 4 && hex.slice(0,4).toUpperCase() === 'FEFF') {
          const u16hex = hex.slice(4);
          let s = '';
          for (let i = 0; i + 3 < u16hex.length; i += 4) {
            s += String.fromCharCode(parseInt(u16hex.slice(i, i+4), 16));
          }
          titleText = s;
        } else {
          titleText = hex.match(/.{1,2}/g).map(h => String.fromCharCode(parseInt(h,16))).join('');
        }
      }
    }
  } catch(_e) { console.warn('[_decodeUtf16BE]', _e.message); }
  titleText = titleText.toLowerCase();

  const tituloTemAbatimento = titleText.includes('abatimento') || titleText.includes('termo de acordo');
  const tituloTemVendaPrazo = titleText.includes('venda a prazo') || titleText.includes('contrato de venda') || titleText.includes('vendaprazo');
  const tituloTemPrestacao  = titleText.includes('presta');

  // ── Fase 2: Descomprimir streams FlateDecode ──
  let textoDescomprimido = '';

  async function _tryDeflate(chunk, fmt) {
    try {
      const ds = new DecompressionStream(fmt);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(chunk).catch(()=>{});
      writer.close().catch(()=>{});
      const parts = [];
      let safety = 0;
      while (safety++ < 500) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }
      const totalLen = parts.reduce((s, p) => s + p.length, 0);
      if (totalLen === 0) return '';
      const result = new Uint8Array(totalLen);
      let off = 0;
      parts.forEach(p => { result.set(p, off); off += p.length; });
      return new TextDecoder('latin1').decode(result);
    } catch(_) { return ''; }
  }

  try {
    const streamStarts = [];
    const re = /stream\r?\n/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
      streamStarts.push(m.index + m[0].length);
    }
    for (let i = 0; i < Math.min(streamStarts.length, 40); i++) {
      const start = streamStarts[i];
      const endIdx = raw.indexOf('endstream', start);
      if (endIdx <= start || endIdx - start > 500000) continue;
      let end = endIdx;
      if (end > start + 1 && raw[end-1] === '\n') end--;
      if (end > start + 1 && raw[end-1] === '\r') end--;
      const chunk = bytes.slice(start, end);
      if (chunk.length < 10) continue;
      let txt = await _tryDeflate(chunk, 'deflate');
      if (!txt) txt = await _tryDeflate(chunk, 'deflate-raw');
      if (!txt && chunk.length > 2) txt = await _tryDeflate(chunk.slice(2), 'deflate-raw');
      if (txt) textoDescomprimido += txt + ' ';
    }
  } catch(_e) { console.warn('[_tryDeflate]', _e.message); }

  // ── Fase 2b: Extrai texto de operadores Tj/TJ ──
  let textoOperadores = '';
  try {
    const fonte = textoDescomprimido || rawLc;
    const tjArrMatches = fonte.match(/\[([^\]]{3,500})\]\s*TJ/gi) || [];
    tjArrMatches.forEach(m => {
      const strs = m.match(/\(([^)]*)\)/g) || [];
      textoOperadores += strs.map(s => s.replace(/[()]/g,'')).join('') + ' ';
    });
    const tjMatches = fonte.match(/\(([^)]{2,80})\)\s*Tj/gi) || [];
    tjMatches.forEach(m => {
      const inner = m.match(/\(([^)]+)\)/);
      if (inner) textoOperadores += inner[1] + ' ';
    });
  } catch(_e) { console.warn('[_tryDeflate]', _e.message); }

  // ── Fase 2c: Metadados adicionais ──
  let rawExtraTexto = '';
  try {
    ['/Subject', '/Author', '/Keywords', '/Creator', '/Producer'].forEach(field => {
      const re = new RegExp(field.replace('/','\\/') + '\\s*\\(([^)]{3,})\\)', 'i');
      const mm = raw.match(re);
      if (mm) rawExtraTexto += mm[1] + ' ';
    });
  } catch(_e) { console.warn('[_tryDeflate]', _e.message); }

  let textoOpNorm = textoOperadores.replace(/(?<=[A-Za-zÀ-ÿ])\s+(?=[A-Za-zÀ-ÿ](?:\s|$))/g, '');
  textoOpNorm += ' ' + textoOperadores.replace(/\s+/g, '');

  const textoTotal = (rawLc + ' ' + titleText + ' ' + textoDescomprimido + ' ' + textoOpNorm + ' ' + rawExtraTexto).toLowerCase();

  // ── Fase 3: Verificar marcadores ──
  // Suporta tanto o Termo de Abatimento (legado) quanto o Contrato de Venda a Prazo (novo)
  const marcadores = [
    // Contrato de Prestação de Serviços
    { termo: 'contrato de prestacao de servicos', peso: 3 },
    { termo: 'contratodeprestacaodeservicos', peso: 3 },
    { termo: 'prestacao de servicos e outras avencas', peso: 3 },
    { termo: 'fibra otica', peso: 1 },
    { termo: 'fibraótica', peso: 1 },
    // Termos do contrato legado (Termo de Abatimento)
    { termo: 'termo de acordo de abatimento', peso: 3 },
    { termo: 'termodeacordodeabatimento', peso: 3 },
    { termo: 'abatimento', peso: 2 },
    // Termos do novo contrato (Venda a Prazo)
    { termo: 'contrato de venda a prazo', peso: 3 },
    { termo: 'contratodevendaaprazo', peso: 3 },
    { termo: 'venda a prazo', peso: 2 },
    { termo: 'vendaaprazo', peso: 2 },
    { termo: 'compradora', peso: 2 },
    { termo: 'vendedora', peso: 2 },
    { termo: 'modalidade de pagamento', peso: 2 },
    { termo: 'modalidadedepagamento', peso: 2 },
    { termo: 'opcao a', peso: 1 },
    { termo: 'opcao b', peso: 1 },
    // Termos comuns a ambos os contratos
    { termo: 'parcelamento', peso: 2 },
    { termo: 'contratante', peso: 1 },
    { termo: 'contratado', peso: 1 },
    { termo: 'presta', peso: 1 },
    { termo: 'clausula', peso: 1 },
    { termo: 'cl\xe1usula', peso: 1 },
    { termo: 'assinatura', peso: 1 },
    { termo: 'irrevog', peso: 1 },
    { termo: 'gov.br', peso: 1 },
    { termo: 'assinador.iti', peso: 1 },
    { termo: 'instrumento particular', peso: 2 },
    { termo: 'instrumentoparticular', peso: 2 },
    { termo: 'sem vinculo', peso: 1 },
    { termo: 'semvinculo', peso: 1 },
    { termo: 'aus\xeancia de v\xednculo', peso: 2 },
    { termo: 'ausenciadevinculo', peso: 2 },
  ];

  let scoreConteudo = 0;
  const encontrados = [];
  marcadores.forEach(m => {
    if (textoTotal.includes(m.termo)) {
      scoreConteudo += m.peso;
      encontrados.push(m.termo);
    }
  });

  if (tituloTemAbatimento) scoreConteudo += 5;
  if (tituloTemVendaPrazo) scoreConteudo += 5;
  if (tituloTemPrestacao)  scoreConteudo += 1;

  const temRef = fbKey && textoTotal.includes(fbKey.toLowerCase());
  if (temRef) scoreConteudo += 3;

  // Detecta formato novo: título contém [fbKey] entre colchetes
  const _tituloTemBracket = /\[.{5,}\]/.test(titleText);

  console.log('[_validarConteudoTermo]', {
    scoreConteudo, encontrados, tituloTemAbatimento, temRef, _tituloTemBracket,
    titleText: titleText.slice(0, 100),
    textoDescompLen: textoDescomprimido.length,
    textoOperLen: textoOperadores.length
  });

  return {
    valido: scoreConteudo >= 5,
    scoreConteudo,
    temRef,
    _tituloTemBracket,
    encontrados
  };
}

async function tecUploadTermoAssinado(event, fbKey) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Selecione um arquivo PDF válido.', 'error');
    event.target.value = '';
    return;
  }
  const lbl = document.getElementById(`label-upload-${fbKey}`);
  if (lbl) { lbl.style.pointerEvents = 'none'; lbl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando documento...'; }
  try {
    const buffer = await file.arrayBuffer();

    // 1. Valida se o conteúdo é realmente o Contrato / Termo correto
    const conteudo = await _validarConteudoTermo(buffer, fbKey);
    if (!conteudo.valido) {
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado (gov.br)'; }
      toast('Este PDF não é o Contrato correto. Baixe o contrato, assine via gov.br e envie novamente.', 'error');
      event.target.value = '';
      return;
    }
    // 2. Verifica assinatura digital gov.br
    const { score } = _parsePDFSignature(buffer);

    if (score >= 5) {
      // Assinatura válida + conteúdo correto → ativa automaticamente
      const agora = new Date().toISOString();
      await db.ref(`config/descontos/${fbKey}`).update({
        termoAssinado: true, termoAceitoTec: true,
        termoConfirmadoEm: agora, termoAssinadoVia: 'govbr-tec', termoNomeArquivo: file.name,
        termoValidacaoConteudo: { score: conteudo.scoreConteudo, temRef: conteudo.temRef }
      });
      descontosCache[fbKey] = { ...descontosCache[fbKey],
        termoAssinado: true, termoAceitoTec: true, termoConfirmadoEm: agora };
      if (lbl) lbl.innerHTML = '<i class="fas fa-check-circle"></i> Termo verificado!';
      toast('Contrato verificado com sucesso! Acesso liberado.', 'success');
      await new Promise(r => setTimeout(r, 900));
      const temPendente = await verificarTermosPendentes();
      if (!temPendente) { screen('app'); showPage('meu-dash'); }

    } else if (score >= 2) {
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Tentar novamente'; }
      toast('O documento é o Contrato correto, mas a assinatura é inconclusiva. Use o assinador.iti.br com conta Gov.br Prata ou Ouro.', 'error');
      event.target.value = '';
    } else {
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado (gov.br)'; }
      toast('Assinatura digital não encontrada neste Termo. Assine via assinador.iti.br antes de carregar.', 'error');
      event.target.value = '';
    }
  } catch(e) {
    console.error('[tecUploadTermoAssinado]', e);
    if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado (gov.br)'; }
    toast('Erro ao ler o arquivo. Tente novamente.', 'error');
    event.target.value = '';
  }
}

async function verificarPDFAssinado(event, fbKey) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    toast('Selecione um arquivo PDF válido.', 'error');
    return;
  }

  toast('Verificando documento e assinatura...', 'info');

  try {
    const buffer = await file.arrayBuffer();

    // Valida conteúdo do Termo de Abatimento
    const conteudo = await _validarConteudoTermo(buffer, fbKey);
    if (!conteudo.valido) {
      toast('Este PDF não é o Termo de Abatimento. Baixe o termo correto, assine e envie.', 'error');
      event.target.value = '';
      return;
    }

    const bytes  = new Uint8Array(buffer);

    // Converte para texto para busca de marcadores de assinatura PDF
    // Lê apenas os primeiros e últimos 64KB para eficiência
    const headLen = Math.min(bytes.length, 65536);
    const tailLen = Math.min(bytes.length, 65536);
    const head    = new TextDecoder('latin1').decode(bytes.slice(0, headLen));
    const tail    = new TextDecoder('latin1').decode(bytes.slice(bytes.length - tailLen));
    const fullTxt = head + tail;

    // Marcadores de assinatura digital em PDFs (padrão PDF/ICP-Brasil)
    const temSig   = fullTxt.includes('/Sig')    || fullTxt.includes('/Type /Sig');
    const temAcroF = fullTxt.includes('/AcroForm');
    const temByte  = fullTxt.includes('/ByteRange');
    const temCert  = fullTxt.includes('/Cert')   || fullTxt.includes('/PKCS7');
    const temDocMDP = fullTxt.includes('/DocMDP') || fullTxt.includes('/TransformMethod');

    // Pontuação de confiança
    let score = 0;
    if (temSig)     score += 3;
    if (temByte)    score += 3;
    if (temCert)    score += 2;
    if (temAcroF)   score++;
    if (temDocMDP)  score += 2;

    if (score >= 5) {
      // Assinatura detectada com alta confiança → ativa automaticamente
      if (confirm(
        `✅ Assinatura digital detectada no PDF!\n\n` +
        `Indicadores encontrados:\n` +
        `${temSig    ? '✔ Objeto de assinatura (/Sig)\n'     : ''}` +
        `${temByte   ? '✔ ByteRange (hash do documento)\n'  : ''}` +
        `${temCert   ? '✔ Certificado digital (/Cert)\n'    : ''}` +
        `${temDocMDP ? '✔ DocMDP (integridade do doc.)\n'   : ''}` +
        `\nAtivar o abatimento agora?`
      )) {
        await confirmarTermoAbatimento(fbKey);
      }
    } else if (score >= 2) {
      // Assinatura provável mas inconclusiva
      if (confirm(
        `⚠️ Possíveis indicadores de assinatura encontrados, porém a verificação não é conclusiva.\n\n` +
        `Recomenda-se validar o documento em: validar.iti.gov.br\n\n` +
        `Deseja ativar o abatimento mesmo assim?`
      )) {
        await confirmarTermoAbatimento(fbKey);
      }
    } else {
      // Nenhum indicador de assinatura digital encontrado
      toast(
        'Assinatura digital não detectada neste PDF. Verifique se o documento foi assinado via gov.br (assinador.iti.br) e tente novamente.',
        'error'
      );
      // Limpa o input para permitir novo upload
      event.target.value = '';
    }
  } catch(e) {
    console.error('[verificarPDFAssinado]', e);
    toast('Erro ao ler o arquivo. Tente novamente.', 'error');
  }
}

async function confirmarTermoAbatimento(fbKey) {
  if (!confirm('Confirmar que o Termo de Acordo assinado foi recebido?\n\nO abatimento será ativado e passará a ser descontado na apuração mensal.')) return;
  try {
    const agora = new Date().toISOString();
    await _dbUpdate(`config/descontos/${fbKey}`, { termoAssinado: true, termoConfirmadoEm: agora });
    if (descontosCache[fbKey]) {
      descontosCache[fbKey].termoAssinado    = true;
      descontosCache[fbKey].termoConfirmadoEm = agora;
    }
    _renderFinDescontos();
    renderFinanceiro();
    toast('Abatimento ativado com sucesso!', 'success');
  } catch(e) {
    console.error('[confirmarTermoAbatimento] erro:', e);
    toast('Erro ao ativar abatimento: ' + (e.message || e), 'error');
  }
}

function reabrirTermoAbatimento(fbKey) {
  const d = descontosCache[fbKey];
  if (!d) { toast('Abatimento não encontrado.', 'error'); return; }
  gerarTermoAbatimento(d);
}

function _gerarContratoFiscal(uid, contratoHash) {
  const u = usersCache[uid];
  if (!u) { toast('Fiscal não encontrado.', 'error'); return; }

  // ── Dados da CONTRATANTE (admin/master) ──
  const _fmtCnpjF = v => { const c = (v||'').replace(/\D/g,''); return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0,18); };
  const masterUid = Object.keys(usersCache).find(k => _isAdmin(usersCache[k])) || '';
  const empAdm    = usersCache[masterUid]?.empresa || {};
  const admRazao  = empAdm.razaoSocial  || assinaturaMaster?.nome    || '';
  const admFantasia = empAdm.nomeFantasia || '';
  const admCnpj   = _fmtCnpjF(empAdm.cnpj || assinaturaMaster?.cpfCnpj || '');
  const admEnder  = empAdm.rua
    ? `${empAdm.rua}, ${empAdm.numero}${empAdm.complemento?', '+empAdm.complemento:''}, ${empAdm.bairro}, ${empAdm.cidade}/${empAdm.estado}, CEP ${empAdm.cep}`
    : (assinaturaMaster?.endereco || '');
  const admCidade  = empAdm.cidade  || '';
  const admResp    = empAdm.responsavel?.nome || empAdm.respNome    || assinaturaMaster?.nome  || '';
  const admNac     = empAdm.responsavel?.nacionalidade || empAdm.respNacionalidade || 'brasileiro(a)';
  const admEc      = _ecTexto(empAdm.responsavel?.ec || empAdm.respEc);
  const admRg      = empAdm.responsavel?.rg || empAdm.respRg      || '';
  const admCpf     = empAdm.responsavel?.cpf || empAdm.respCpf     || assinaturaMaster?.cpfCnpj || '';
  const admForo    = empAdm.foro        || admCidade || '';
  const admDiaPgto = '20';

  // ── Dados da CONTRATADA (fiscal) ──
  const empFisc   = u.empresa || {};
  const fiscRazao = empFisc.razaoSocial || u.name || uid;
  const fiscCnpj  = _fmtCnpjF(empFisc.cnpj || '');
  const fiscEnder = empFisc.rua
    ? `${empFisc.rua}, ${empFisc.numero}${empFisc.complemento?', '+empFisc.complemento:''}, ${empFisc.bairro}, ${empFisc.cidade}/${empFisc.estado}, CEP ${empFisc.cep}`
    : '';
  const fiscCidade = empFisc.cidade || '';
  const fiscResp   = empFisc.responsavel?.nome || empFisc.respNome  || u.name || '';
  const fiscNac    = empFisc.responsavel?.nacionalidade || empFisc.respNacionalidade || 'brasileiro(a)';
  const fiscEc     = _ecTexto(empFisc.responsavel?.ec || empFisc.respEc);
  const fiscRg     = empFisc.responsavel?.rg || empFisc.respRg    || '';
  const fiscCpf    = empFisc.responsavel?.cpf || empFisc.respCpf   || '';

  const vlrMensal  = `R$ ${SALARIO_V0.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const vlrExtenso = SALARIO_V0 === 3000 ? 'três mil reais' : '';

  // ── Data e utilitários ──
  const hoje    = new Date();
  const dataHoje = hoje.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'});
  const _ce = (val, ph) => val
    ? `<span>${val}</span>`
    : `<span contenteditable="true" style="outline:none;background:#fffde7;border-bottom:1px solid #f59e0b;cursor:text;display:inline-block;min-width:120px">${ph||''}</span>`;
  const incompleto = !admRazao || !fiscCnpj || !fiscResp || !fiscRg;
  const hash = contratoHash || `${uid}-${Date.now().toString(36)}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Prestação de Serviços Administrativos — ${fiscRazao}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Times New Roman',serif;background:#f5f5f0;color:#1a1a1a;padding:30px;font-size:13px}
  .page{max-width:780px;margin:0 auto;background:#fff;padding:52px 58px;border:1px solid #ccc;box-shadow:0 2px 14px rgba(0,0,0,.12)}
  h1{font-size:13px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
  .subtitle{text-align:center;font-size:10.5px;color:#555;margin-bottom:24px}
  .divider{border:none;border-top:2px solid #1a1a1a;margin:16px 0}
  .divider-thin{border:none;border-top:1px solid #ccc;margin:12px 0}
  .section-title{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1a3a5c;margin:16px 0 6px;border-bottom:2px solid #1a3a5c;padding-bottom:3px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px}
  .party-box{border:1px solid #d1d5db;border-radius:6px;padding:11px 13px;background:#fafafa}
  .party-label{font-size:9px;font-weight:700;text-transform:uppercase;color:#1a3a5c;letter-spacing:.07em;margin-bottom:7px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
  .field{margin-bottom:5px}
  .field-label{font-size:9px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.05em;margin-bottom:1px}
  .field-value{font-size:11.5px;border-bottom:1px dotted #bbb;padding-bottom:2px;min-height:16px}
  [contenteditable]{outline:none;background:#fffde7;border-bottom:1px solid #f59e0b !important;cursor:text}
  [contenteditable]:focus{background:#fff9c4}
  .clause{margin-bottom:9px;line-height:1.75;text-align:justify;font-size:12px}
  .clause-num{font-weight:700;margin-right:4px}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:24px}
  .sign-block{text-align:center}
  .sign-line{border-bottom:1px solid #555;margin-bottom:5px;height:40px;display:flex;align-items:flex-end;justify-content:center}
  .sign-name{font-size:10.5px;font-weight:700}
  .sign-sub{font-size:9.5px;color:#555;margin-top:2px}
  .test-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:22px}
  .test-block{font-size:10px;line-height:1.8}
  .edit-hint{background:#fffde7;border:1px dashed #f59e0b;border-radius:6px;padding:8px 12px;font-size:10px;color:#92400e;margin-bottom:16px;display:flex;align-items:center;gap:6px}
  @media print{
    body{background:#fff;padding:0}
    .page{box-shadow:none;border:none;padding:32px 42px}
    .no-print{display:none!important}
    [contenteditable]{background:transparent!important;border-bottom:1px dotted #999!important}
    .edit-hint{display:none!important}
  }
</style>
</head>
<body>
<div class="page">

  <div class="no-print" style="display:flex;gap:10px;margin-bottom:18px;justify-content:space-between;flex-wrap:wrap;align-items:center">
    <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;border-radius:7px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer">
      &#x2715; Fechar
    </button>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button onclick="window.print()" style="background:#1f4e79;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer">
        🖨️ Imprimir / Salvar PDF
      </button>
    </div>
  </div>

  ${incompleto ? `<div class="edit-hint no-print">✏️ <strong>Antes de imprimir:</strong> clique nos campos amarelos para completar os dados em branco.</div>` : ''}

  <h1>Instrumento Particular de Contrato de Prestação de</h1>
  <h1>Serviços de Supervisão Operacional e Controle de Estoque</h1>
  <div class="subtitle">E Outras Avenças — Natureza Civil — Arts. 593 a 609 do Código Civil Brasileiro — Sem Vínculo Empregatício</div>
  <hr class="divider">

  <!-- Preâmbulo -->
  <div class="clause" style="margin-bottom:12px">
    Pelo presente instrumento particular, e na melhor forma de direito, de um lado,
    <strong>${_ce(admRazao,'Razão Social CONTRATANTE')}</strong>${admFantasia ? `, nome fantasia <strong>${admFantasia}</strong>,` : ','} pessoa jurídica de direito privado,
    inscrita no CNPJ n. ${_ce(admCnpj,'CNPJ')}, com sede na ${_ce(admEnder,'Endereço completo')},
    neste ato representada por seu sócio <strong>${_ce(admResp,'Nome do responsável')}</strong>,
    ${admNac}, ${admEc}, portador do R.G. n. ${_ce(admRg,'RG')}, CPF n. ${_ce(admCpf,'CPF')},
    doravante denominado simplesmente <strong>"CONTRATANTE"</strong>; e
  </div>
  <div class="clause" style="margin-bottom:12px">
    <strong>${_ce(fiscRazao,'Razão Social CONTRATADA')}</strong>, pessoa jurídica de direito privado,
    regularmente inscrita no CNPJ(MF) sob o n. ${_ce(fiscCnpj,'CNPJ')},
    com sede na ${_ce(fiscEnder,'Endereço completo')},
    neste ato representada por <strong>${_ce(fiscResp,'Nome do sócio')}</strong>,
    ${fiscNac}, ${fiscEc}, portadora do RG n. ${_ce(fiscRg,'RG')} e CPF n. ${_ce(fiscCpf,'CPF')},
    doravante denominada simplesmente <strong>"CONTRATADA"</strong>;
  </div>
  <div class="clause" style="margin-bottom:20px">
    Resolvem as Partes celebrar o presente Instrumento Particular de Contrato de Prestação de
    Serviços Administrativos e de Supervisão Operacional, mediante as cláusulas e condições aqui pactuadas.
  </div>

  <!-- CLÁUSULA PRIMEIRA -->
  <div class="section-title">Cláusula Primeira — Do Objeto</div>
  <div class="clause"><span class="clause-num">1.1.</span>A CONTRATADA prestará à CONTRATANTE serviços de supervisão operacional e controle de estoque, compreendendo exclusivamente as seguintes atividades: (a) acompanhamento e conferência das ordens de serviço executadas pelos técnicos de campo, mediante utilização da plataforma digital disponibilizada pela CONTRATANTE; (b) realização de inventário mensal do estoque de materiais e equipamentos, a ser concluído no prazo máximo até o dia 01 (primeiro) de cada mês de competência.</div>
  <div class="clause"><span class="clause-num">1.2.</span>Os serviços descritos nesta cláusula não incluem atividades de campo, deslocamento externo, processamento de pagamentos ou qualquer função financeira, sendo prestados exclusivamente por meio da plataforma digital disponibilizada pela CONTRATANTE e/ou nas dependências desta.</div>
  <div class="clause"><span class="clause-num">1.3.</span>A prestação dos serviços dar-se-á de forma autônoma, sem subordinação hierárquica, cabendo à CONTRATADA organizar seus métodos e horários de trabalho, respeitadas as demandas e prazos acordados com a CONTRATANTE.</div>

  <!-- CLÁUSULA SEGUNDA -->
  <div class="section-title">Cláusula Segunda — Obrigações da Contratante</div>
  <div class="clause"><span class="clause-num">2.1.</span>Fornecer à CONTRATADA acesso às ferramentas digitais, sistemas e informações necessárias à execução dos serviços, incluindo acesso à plataforma de gestão de ordens de serviço e ao controle de estoque.</div>
  <div class="clause"><span class="clause-num">2.2.</span>Fornecer habitual e prontamente todas as informações, cronogramas e dados que se fizerem necessários à execução dos trabalhos.</div>
  <div class="clause"><span class="clause-num">2.3.</span>Efetuar os pagamentos pelos serviços prestados nas datas acordadas.</div>
  <div class="clause"><span class="clause-num">2.4.</span>Zelar pelo bom relacionamento de seus colaboradores para com a CONTRATADA, num relacionamento de parceria e colaboração, sem subordinação de qualquer parte.</div>

  <!-- CLÁUSULA TERCEIRA -->
  <div class="section-title">Cláusula Terceira — Obrigações da Contratada</div>
  <div class="clause"><span class="clause-num">3.1.</span>Realizar a conferência e supervisão das ordens de serviço registradas pelos técnicos de campo na plataforma digital da CONTRATANTE, verificando a conformidade dos registros e reportando quaisquer irregularidades identificadas, sem qualquer atribuição de natureza financeira ou de processamento de pagamentos.</div>
  <div class="clause"><span class="clause-num">3.2.</span>Realizar o inventário mensal do estoque de materiais e equipamentos até o dia 01 (primeiro) de cada mês, entregando o relatório correspondente à CONTRATANTE.</div>
  <div class="clause"><span class="clause-num">3.3.</span>Emitir relatório mensal de atividades referente ao período de 01 a 31 de cada mês, entregue à CONTRATANTE até o último dia útil do mês de competência.</div>
  <div class="clause"><span class="clause-num">3.4.</span>Guardar sigilo sobre todas as informações, dados, processos e documentos da CONTRATANTE a que tiver acesso em virtude deste CONTRATO, inclusive após o encerramento da relação contratual.</div>
  <div class="clause"><span class="clause-num">3.5.</span>Comunicar à CONTRATANTE, com antecedência mínima de 48 (quarenta e oito) horas, qualquer impedimento que impossibilite o cumprimento das atividades previstas.</div>
  <div class="clause"><span class="clause-num">3.6.</span>Comunicar à CONTRATANTE toda e qualquer alteração que ocorrer em seus registros de MEI, especialmente as relativas à modificação de endereço e situação cadastral.</div>
  <div class="clause"><span class="clause-num">3.7.</span>Arcar com todas as obrigações tributárias e previdenciárias decorrentes de sua condição de Microempreendedora Individual, competindo à CONTRATANTE pagar apenas e tão somente o valor pelos serviços prestados.</div>

  <!-- CLÁUSULA QUARTA -->
  <div class="section-title">Cláusula Quarta — Dos Honorários</div>
  <div class="clause"><span class="clause-num">4.1.</span>Pela prestação dos serviços ora avençados, a CONTRATANTE pagará à CONTRATADA o valor mensal fixo de <strong>${vlrMensal}${vlrExtenso?' ('+vlrExtenso+')':''}</strong>, a título de honorários pela prestação dos serviços descritos na Cláusula Primeira.</div>
  <div class="clause"><span class="clause-num">4.2.</span>O valor pactuado nesta cláusula será reajustado somente mediante comum acordo entre as partes, formalizado por escrito.</div>
  <div class="clause"><span class="clause-num">4.3.</span>Todos os tributos incidentes sobre este CONTRATO serão recolhidos pela parte responsável nos termos da legislação tributária.</div>
  <div class="clause"><span class="clause-num">4.4.</span>Eventual saldo pago a maior será restituído proporcionalmente, mediante abatimento nas remunerações subsequentes ou por outro meio acordado entre as partes.</div>

  <!-- CLÁUSULA QUINTA -->
  <div class="section-title">Cláusula Quinta — Honorários</div>
  <div class="clause"><span class="clause-num">5.1.</span>A CONTRATADA deverá emitir relatório de atividades e <strong>Nota Fiscal de Prestação de Serviços</strong> referente ao mês de competência, que será paga pela CONTRATANTE até o dia <strong>${admDiaPgto}</strong> do mês subsequente ao da realização dos serviços.</div>
  <div class="clause"><span class="clause-num">5.2.</span>A ausência de emissão de Nota Fiscal no prazo estabelecido poderá acarretar postergação do pagamento, sem que isso configure mora da CONTRATANTE.</div>
  <div class="clause"><span class="clause-num">5.3.</span>O pagamento será efetuado mediante transferência bancária ou via PIX, para a conta indicada pela CONTRATADA no ato da emissão da Nota Fiscal.</div>

  <!-- CLÁUSULA SEXTA -->
  <div class="section-title">Cláusula Sexta — Vigência</div>
  <div class="clause"><span class="clause-num">6.1.</span>O presente contrato entra em vigor na data de sua assinatura, por prazo indeterminado, podendo ser rescindido por qualquer das partes nos termos da Cláusula Sétima.</div>

  <!-- CLÁUSULA SÉTIMA -->
  <div class="section-title">Cláusula Sétima — Da Rescisão</div>
  <div class="clause"><span class="clause-num">7.1.</span>Poderá o instrumento ser rescindido unilateralmente por qualquer das partes, sem justo motivo, mediante aviso prévio de <strong>30 (trinta) dias</strong> por escrito.</div>
  <div class="clause"><span class="clause-num">7.2.</span>Rescisão motivada poderá ocorrer imediatamente mediante notificação judicial ou extrajudicial nas seguintes situações: (7.2.1.) entrada das partes em regime de falência, concordata ou recuperação judicial que afete o cumprimento contratual; (7.2.2.) dolo ou má-fé da CONTRATADA na prestação dos serviços; (7.2.3.) descumprimento reiterado das obrigações estabelecidas na Cláusula Terceira.</div>

  <!-- CLÁUSULA OITAVA -->
  <div class="section-title">Cláusula Oitava — Cessão e Subcontratação</div>
  <div class="clause"><span class="clause-num">8.1.</span>É vedada a cessão ou subcontratação total ou parcial deste CONTRATO sem prévia anuência por escrito da CONTRATANTE, sob pena de rescisão imediata.</div>
  <div class="clause"><span class="clause-num">8.2.</span>Na hipótese de a CONTRATANTE concordar com a subcontratação, todas as responsabilidades pelas obrigações subcontratadas continuarão sendo da CONTRATADA.</div>

  <!-- CLÁUSULA NONA -->
  <div class="section-title">Cláusula Nona — Da Natureza do Contrato</div>
  <div class="clause"><span class="clause-num">9.1.</span>O presente contrato é de natureza exclusivamente civil, regido pelos Arts. 593 a 609 do Código Civil Brasileiro de 2002, não constituindo vínculo societário, empregatício, de representação comercial ou de subordinação entre as partes.</div>
  <div class="clause"><span class="clause-num">9.2.</span>Este CONTRATO não constitui qualquer tipo de vínculo societário, empregatício ou de representação comercial. A CONTRATADA assume total responsabilidade pelo recolhimento de seus tributos e contribuições previdenciárias na condição de Microempreendedora Individual.</div>

  <!-- CLÁUSULA DÉCIMA -->
  <div class="section-title">Cláusula Décima — Disposições Gerais</div>
  <div class="clause"><span class="clause-num">10.1.</span>Constituem motivos justos para rescisão: (a) descumprimento de qualquer obrigação inerente a este contrato; (b) prática de atos que importem em descrédito comercial da parte que der causa; (c) condenação definitiva por crime considerado infamante; (d) caso fortuito ou força maior.</div>
  <div class="clause"><span class="clause-num">10.2.</span>A CONTRATADA, em caso de extinção deste contrato por qualquer motivo, fica proibida de repassar ou divulgar informações sigilosas da CONTRATANTE, de seus produtos, serviços, clientes e operações.</div>
  <div class="clause"><span class="clause-num">10.3.</span>Nenhuma das partes será responsável por falhas ou atrasos causados por caso fortuito ou força maior, nos termos do Código Civil Brasileiro.</div>

  <!-- CLÁUSULA DÉCIMA PRIMEIRA -->
  <div class="section-title">Cláusula Décima Primeira — Do Foro</div>
  <div class="clause"><span class="clause-num">11.1.</span>Fica eleito o Foro da Comarca de <strong>${_ce(admForo,'Cidade/UF')}</strong> como competente para conhecer e solucionar eventual pendência oriunda deste contrato, com expressa renúncia de quaisquer outros, por mais privilegiados que sejam ou venham a ser.</div>

  <hr class="divider-thin" style="margin-top:20px">
  <div class="clause" style="text-align:center;margin:14px 0 6px">
    E por estarem cientes e de acordo, firmam o presente instrumento em 02 (duas) vias de igual teor, na presença das testemunhas abaixo.
  </div>
  <div style="text-align:center;font-size:11.5px;color:#555;margin-bottom:24px">${_ce(admCidade,'Cidade')}, ${dataHoje}.</div>

  <div class="sign-grid">
    <div class="sign-block">
      <div class="sign-line">
        ${assinaturaMaster?.dataUrl ? `<img src="${assinaturaMaster.dataUrl}" alt="assinatura" style="max-height:52px;max-width:200px;object-fit:contain">` : ''}
      </div>
      <div class="sign-name">${admResp || admRazao}</div>
      <div class="sign-sub">${admFantasia || admRazao}</div>
      <div class="sign-sub">CNPJ ${admCnpj}</div>
      <div class="sign-sub" style="color:#1a3a5c;font-weight:700">CONTRATANTE</div>
    </div>
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-name">${fiscResp || fiscRazao}</div>
      <div class="sign-sub">${fiscRazao}</div>
      <div class="sign-sub">CNPJ ${fiscCnpj}</div>
      <div class="sign-sub" style="color:#1a3a5c;font-weight:700">CONTRATADA</div>
    </div>
  </div>

  <div style="margin-top:28px;font-size:10.5px;font-weight:700;color:#555;text-align:center">Testemunhas</div>
  <div class="test-grid">
    <div class="test-block">
      <div style="border-bottom:1px solid #555;margin-bottom:4px;height:34px"></div>
      <div>1) Nome: ___________________________</div>
      <div>RG: _____________  CPF: _______________</div>
    </div>
    <div class="test-block">
      <div style="border-bottom:1px solid #555;margin-bottom:4px;height:34px"></div>
      <div>2) Nome: ___________________________</div>
      <div>RG: _____________  CPF: _______________</div>
    </div>
  </div>

  <!-- Rodapé de rastreio -->
  <div style="margin-top:30px;padding-top:10px;border-top:1px dotted #e2e8f0;text-align:center;font-size:8px;color:#bbb;line-height:1.6">
    Documento gerado em ${dataHoje} · Ref: ${hash} · ${uid}<br>
    Contrato de Prestação de Serviços de Supervisão Operacional e Controle de Estoque — ${fiscRazao}
  </div>

  <div class="no-print" style="margin-top:28px;text-align:center">
    <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;border-radius:8px;padding:10px 24px;font-size:12px;font-weight:700;cursor:pointer">
      &#x2715; Fechar e voltar ao app
    </button>
  </div>

</div>
</body>
</html>`;

  const _blob0 = new Blob([html], { type: 'text/html; charset=utf-8' });
  const _url0 = _createBlobUrl(_blob0);
  const win = window.open(_url0, '_blank');
  if (!win) { const a = document.createElement('a'); a.href = _url0; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
  // Fase5: Blob gerenciado por _createBlobUrl
}

async function gerarContratoServicos(uid, contratoHash) {
  const u = usersCache[uid];
  if (!u) { toast('Prestador não encontrado.', 'error'); return; }

  // Gera hash e salva registro no Firebase se ainda não existe
  if (!contratoHash) {
    contratoHash = `${uid}-${Date.now().toString(36)}`;
    try {
      const snap = await db.ref(`contratos/${uid}/prestacaoServicos`).once('value');
      if (!snap.val()) {
        await _dbSet(`contratos/${uid}/prestacaoServicos`, {
          hash: contratoHash, status: 'aguardando_assinatura', geradoEm: new Date().toISOString()
        });
      } else {
        contratoHash = snap.val().hash || contratoHash;
      }
    } catch(e) { console.error('[gerarContratoServicos] Firebase:', e); }
  }

  // V0 = Fiscal: contrato diferente (honorários fixos, sem tabela de preços)
  if ((u.nivel||'V1') === 'V0') { _gerarContratoFiscal(uid, contratoHash); return; }

  // ── Dados da CONTRATANTE (admin/master) ──
  const _fmtCnpj = v => { const c = (v||'').replace(/\D/g,''); return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').slice(0,18); };
  const masterUid = Object.keys(usersCache).find(k => _isAdmin(usersCache[k])) || '';
  const empAdm    = usersCache[masterUid]?.empresa || {};
  const admRazao  = empAdm.razaoSocial  || assinaturaMaster?.nome    || '';
  const admFantasia = empAdm.nomeFantasia || '';
  const admCnpj   = _fmtCnpj(empAdm.cnpj || assinaturaMaster?.cpfCnpj || '');
  const admEnder  = empAdm.rua
    ? `${empAdm.rua}, ${empAdm.numero}${empAdm.complemento?', '+empAdm.complemento:''}, ${empAdm.bairro}, ${empAdm.cidade}/${empAdm.estado}, CEP ${empAdm.cep}`
    : (assinaturaMaster?.endereco || '');
  const admCidade  = empAdm.cidade  || '';
  const admEstado  = empAdm.estado  || '';
  const admCep     = empAdm.cep     || '';
  const admResp    = empAdm.responsavel?.nome || empAdm.respNome    || assinaturaMaster?.nome  || '';
  const admNac     = empAdm.responsavel?.nacionalidade || empAdm.respNacionalidade || 'brasileiro(a)';
  const admEc      = _ecTexto(empAdm.responsavel?.ec || empAdm.respEc);
  const admRg      = empAdm.responsavel?.rg || empAdm.respRg      || '';
  const admCpf     = empAdm.responsavel?.cpf || empAdm.respCpf     || assinaturaMaster?.cpfCnpj || '';
  const admCargo   = empAdm.responsavel?.cargo || empAdm.respCargo   || assinaturaMaster?.cargo   || '';
  const admForo    = empAdm.foro        || admCidade || '';
  const admDiaPgto = '20';

  // ── Dados do CONTRATADO (prestador) ──
  const empTec   = u.empresa || {};
  const tecRazao = empTec.razaoSocial || u.name || uid;
  const tecCnpj  = _fmtCnpj(empTec.cnpj || '');
  const tecEnder = empTec.rua
    ? `${empTec.rua}, ${empTec.numero}${empTec.complemento?', '+empTec.complemento:''}, ${empTec.bairro}, ${empTec.cidade}/${empTec.estado}, CEP ${empTec.cep}`
    : '';
  const tecCidade = empTec.cidade || '';
  const tecEstado = empTec.estado || '';
  const tecCep    = empTec.cep    || '';
  const tecResp   = empTec.responsavel?.nome || empTec.respNome  || u.name || '';
  const tecNac    = empTec.responsavel?.nacionalidade || empTec.respNacionalidade || 'brasileiro(a)';
  const tecEc     = _ecTexto(empTec.responsavel?.ec || empTec.respEc);
  const tecRg     = empTec.responsavel?.rg || empTec.respRg    || '';
  const tecCpf    = empTec.responsavel?.cpf || empTec.respCpf   || '';
  const tecCargo  = empTec.responsavel?.cargo || empTec.respCargo || 'Sócio Administrador';

  // ── Tabela de preços conforme nível ──
  const nivel  = u.nivel || 'V1';
  const precos = nivel === 'V2' ? precosV2map : precosV1map;
  const tabelaRows = Object.entries(precos)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([srv, val], i) => {
      const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
      const valFmt = 'R$ ' + Number(val).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
      return `<tr style="background:${bg}">
        <td style="padding:5px 10px;font-size:11.5px;border-bottom:1px solid #e5e7eb">${srv}</td>
        <td style="padding:5px 10px;font-size:11.5px;text-align:right;font-weight:700;border-bottom:1px solid #e5e7eb">${valFmt}</td>
      </tr>`;
    }).join('');

  // ── Data e utilitários ──
  const hoje    = new Date();
  const dataHoje = hoje.toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'});
  const _ce = (val, ph) => val
    ? `<span>${val}</span>`
    : `<span contenteditable="true" style="outline:none;background:#fffde7;border-bottom:1px solid #f59e0b;cursor:text;display:inline-block;min-width:120px">${ph||''}</span>`;
  const incompleto = !admRazao || !tecCnpj || !tecResp || !tecRg;
  // Hash de rastreio (embeds uid + timestamp no rodapé para validação do PDF devolvido)
  const hash = contratoHash || `${uid}-${Date.now().toString(36)}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Prestação de Serviços — ${tecRazao}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Times New Roman',serif;background:#f5f5f0;color:#1a1a1a;padding:30px;font-size:13px}
  .page{max-width:780px;margin:0 auto;background:#fff;padding:52px 58px;border:1px solid #ccc;box-shadow:0 2px 14px rgba(0,0,0,.12)}
  h1{font-size:14px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
  .subtitle{text-align:center;font-size:10.5px;color:#555;margin-bottom:24px}
  .divider{border:none;border-top:2px solid #1a1a1a;margin:16px 0}
  .divider-thin{border:none;border-top:1px solid #ccc;margin:12px 0}
  .section-title{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1a3a5c;margin:16px 0 6px;border-bottom:2px solid #1a3a5c;padding-bottom:3px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px}
  .party-box{border:1px solid #d1d5db;border-radius:6px;padding:11px 13px;background:#fafafa}
  .party-label{font-size:9px;font-weight:700;text-transform:uppercase;color:#1a3a5c;letter-spacing:.07em;margin-bottom:7px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
  .field{margin-bottom:5px}
  .field-label{font-size:9px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.05em;margin-bottom:1px}
  .field-value{font-size:11.5px;border-bottom:1px dotted #bbb;padding-bottom:2px;min-height:16px}
  [contenteditable]{outline:none;background:#fffde7;border-bottom:1px solid #f59e0b !important;cursor:text}
  [contenteditable]:focus{background:#fff9c4}
  .clause{margin-bottom:9px;line-height:1.75;text-align:justify;font-size:12px}
  .clause-num{font-weight:700;margin-right:4px}
  .tabela-wrap{border:1px solid #d1d5db;border-radius:6px;overflow:hidden;margin:8px 0 12px}
  table{width:100%;border-collapse:collapse}
  thead th{background:#1f4e79;color:#fff;padding:7px 10px;font-size:10.5px;font-weight:700;text-align:left}
  thead th:last-child{text-align:right}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:24px}
  .sign-block{text-align:center}
  .sign-line{border-bottom:1px solid #555;margin-bottom:5px;height:40px;display:flex;align-items:flex-end;justify-content:center}
  .sign-name{font-size:10.5px;font-weight:700}
  .sign-sub{font-size:9.5px;color:#555;margin-top:2px}
  .test-grid{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:22px}
  .test-block{font-size:10px;line-height:1.8}
  .edit-hint{background:#fffde7;border:1px dashed #f59e0b;border-radius:6px;padding:8px 12px;font-size:10px;color:#92400e;margin-bottom:16px;display:flex;align-items:center;gap:6px}
  .nivel-badge{display:inline-block;background:#1f4e79;color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;vertical-align:middle;margin-left:6px}
  @media print{
    body{background:#fff;padding:0}
    .page{box-shadow:none;border:none;padding:32px 42px}
    .no-print{display:none!important}
    [contenteditable]{background:transparent!important;border-bottom:1px dotted #999!important}
    .edit-hint{display:none!important}
    thead th{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="page">

  <div class="no-print" style="display:flex;gap:10px;margin-bottom:18px;justify-content:space-between;flex-wrap:wrap;align-items:center">
    <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;border-radius:7px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer">
      &#x2715; Fechar
    </button>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button onclick="window.print()" style="background:#1f4e79;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer">
        🖨️ Imprimir / Salvar PDF
      </button>
    </div>
  </div>

  ${incompleto ? `<div class="edit-hint no-print">✏️ <strong>Antes de imprimir:</strong> clique nos campos amarelos para completar os dados em branco.</div>` : ''}

  <h1>Instrumento Particular de Contrato de Prestação de Serviços e Outras Avenças</h1>
  <div class="subtitle">Natureza Civil — Arts. 593 a 609 do Código Civil Brasileiro — Sem Vínculo Empregatício</div>
  <hr class="divider">

  <!-- Preâmbulo -->
  <div class="clause" style="margin-bottom:12px">
    Pelo presente instrumento particular, e na melhor forma de direito, de um lado,
    <strong>${_ce(admRazao,'Razão Social CONTRATANTE')}</strong>${admFantasia ? `, nome fantasia <strong>${admFantasia}</strong>,` : ','} pessoa jurídica de direito privado,
    inscrita no CNPJ n. ${_ce(admCnpj,'CNPJ')}, com sede na ${_ce(admEnder,'Endereço completo')},
    neste ato representada por seu sócio <strong>${_ce(admResp,'Nome do responsável')}</strong>,
    ${admNac}, ${admEc}, portador do R.G. n. ${_ce(admRg,'RG')}, CPF n. ${_ce(admCpf,'CPF')},
    doravante denominado simplesmente <strong>"CONTRATANTE"</strong>; e
  </div>
  <div class="clause" style="margin-bottom:18px">
    <strong>${_ce(tecRazao,'Razão Social CONTRATADO')}</strong>, pessoa jurídica de direito privado,
    regularmente inscrita no CNPJ(MF) sob o n. ${_ce(tecCnpj,'CNPJ')},
    com sede na ${_ce(tecEnder,'Endereço completo')},
    neste ato representada por <strong>${_ce(tecResp,'Nome do sócio')}</strong>,
    ${tecNac}, ${tecEc}, portador do RG n. ${_ce(tecRg,'RG')} e CPF n. ${_ce(tecCpf,'CPF')},
    doravante denominado simplesmente <strong>"CONTRATADO"</strong>;
  </div>
  <div class="clause" style="margin-bottom:20px">
    Resolvem as Partes celebrar o presente Instrumento Particular de Contrato de
    Prestação de Serviços e Outras Avenças, mediante as cláusulas e condições aqui pactuadas.
  </div>

  <!-- CLÁUSULA PRIMEIRA -->
  <div class="section-title">Cláusula Primeira — Objeto</div>
  <div class="clause"><span class="clause-num">1.1.</span>O CONTRATADO prestará à CONTRATANTE serviços de infraestrutura ótica, incluindo manutenção e reparos de toda a rede de infraestrutura de fibra ótica, manutenção e reparo de cabos de fibra danificados, bem como demais atividades ligadas à manutenção e instalação de fibra óptica.</div>
  <div class="clause"><span class="clause-num">1.2.</span>Tendo em vista a natureza dos serviços, os mesmos serão desenvolvidos exclusivamente na área atuante da CONTRATANTE.</div>
  <div class="clause"><span class="clause-num">1.3.</span>Sem prejuízo dos serviços serem prestados de forma autônoma, a CONTRATANTE tem ciência e concorda que os mesmos poderão ser executados em conjunto com a equipe operacional do CONTRATADO, sempre a critério e sob as orientações da CONTRATANTE, conforme manual de orientação da <strong>MEGALINK</strong>, devendo respeitar as instruções transmitidas pela CONTRATANTE, seus prepostos, colaboradores ou funcionários, por quaisquer meios, o que, todavia, não implicará em subordinação do CONTRATADO à CONTRATANTE.</div>

  <!-- CLÁUSULA SEGUNDA -->
  <div class="section-title">Cláusula Segunda — Obrigações da Contratante</div>
  <div class="clause"><span class="clause-num">2.1.</span>Fornecer habitual e prontamente ao CONTRATADO todas as informações, cronogramas e dados que se fizerem necessários à execução dos trabalhos.</div>
  <div class="clause"><span class="clause-num">2.2.</span>Fornecer os materiais que deverão ser instalados na rede de fibra ótica.</div>
  <div class="clause"><span class="clause-num">2.3.</span>Efetuar os pagamentos pelos serviços prestados na data acordada.</div>
  <div class="clause"><span class="clause-num">2.4.</span>Zelar pelo bom relacionamento de seus colaboradores para com o prestador ou equipe do CONTRATADO, garantindo o entendimento adequado das solicitações e orientações, num relacionamento de parceria e colaboração, sem subordinação de qualquer parte.</div>

  <!-- CLÁUSULA TERCEIRA -->
  <div class="section-title">Cláusula Terceira — Obrigações do Contratado</div>
  <div class="clause"><span class="clause-num">3.1.</span>Cumprir rigorosamente o prazo estabelecido pela ANATEL e MEGALINK, sendo: 4 horas para manutenções de link dedicados, anéis dos armários e links Equinix SP3/SP4; 8 horas para rompimentos e loss da rede em fibra ótica.</div>
  <div class="clause"><span class="clause-num">3.2.</span>Seguir o Regimento Interno de padrões técnicos de serviços da MEGALINK.</div>
  <div class="clause"><span class="clause-num">3.3.</span>Apresentar-se perante o cliente de maneira apresentável e asseado, devidamente uniformizado com os caracteres de sua empresa com os dizeres: "À SERVIÇO DA MEGALINK".</div>
  <div class="clause"><span class="clause-num">3.4.</span>Quando utilizar OTDR e outras ferramentas disponibilizadas pela CONTRATANTE, certificar, inspecionar e, se de acordo, utilizá-las, bem como zelar pelo seu bom estado de conservação e devolução.</div>
  <div class="clause"><span class="clause-num">3.5.</span>Não cobrar e não receber, em hipótese alguma, qualquer valor em espécie diretamente dos clientes da CONTRATANTE, sendo vedado também comercializar qualquer material diretamente com o cliente.</div>
  <div class="clause"><span class="clause-num">3.6.</span>As Ordens de Serviço registradas no sistema da CONTRATANTE valem como relatório mensal de serviços executados, dispensando envio separado. Na ausência de lançamento no sistema, o CONTRATADO deverá enviar relatório manual até o último dia do mês.</div>
  <div class="clause"><span class="clause-num">3.7.</span>Arcar com todas as obrigações trabalhistas, previdenciárias, fiscais, securitárias e de responsabilidade civil decorrentes de seus empregados, prepostos ou sócios que atuarem na execução deste CONTRATO.</div>
  <div class="clause"><span class="clause-num">3.8.</span>Observar rigorosamente o uso do EPI e EPC conforme manual da MEGALINK, sob pena de multa de <strong>R$ 400,00 (quatrocentos reais)</strong> por ocorrência de não utilização comprovada.</div>
  <div class="clause"><span class="clause-num">3.9.</span>Comunicar à CONTRATANTE toda e qualquer alteração societária que ocorrer em seus registros, especialmente relativas à modificação de endereço e administração.</div>

  <!-- CLÁUSULA QUARTA -->
  <div class="section-title">Cláusula Quarta — Tabela de Serviços</div>
  <div class="clause"><span class="clause-num">4.1.</span>Pela prestação de serviços ora avençados, a CONTRATANTE pagará ao CONTRATADO, por serviço efetivamente prestado, conforme tabela abaixo:</div>
  <div class="tabela-wrap">
    <table>
      <thead><tr><th>Serviço</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${tabelaRows}</tbody>
    </table>
  </div>
  <div class="clause"><span class="clause-num">4.2.</span>Não serão computadas nem remuneradas as horas nem despesas de deslocamento até o local de trabalho.</div>
  <div class="clause"><span class="clause-num">4.3.</span>O valor pactuado nesta cláusula será reajustado somente mediante comum acordo entre as partes, formalizado por escrito.</div>
  <div class="clause"><span class="clause-num">4.4.</span>Todos os tributos incidentes sobre este CONTRATO serão recolhidos pela parte responsável nos termos da legislação tributária.</div>
  <div class="clause"><span class="clause-num">4.5.</span>Deverá ser apresentada documentação fotográfica do serviço, com dados como número, portas, fibra, cabo, quantidade de clientes, fotos do serviço executado e localização da área.</div>

  <!-- CLÁUSULA QUINTA -->
  <div class="section-title">Cláusula Quinta — Honorários</div>
  <div class="clause"><span class="clause-num">5.1.</span>O CONTRATADO deverá emitir <strong>Nota Fiscal de Prestação de Serviços</strong> referente aos serviços prestados entre os dias 01 e 31 de cada mês, que será paga até o dia <strong>${admDiaPgto}</strong> do mês subsequente.</div>
  <div class="clause"><span class="clause-num">5.2.</span>A ausência de emissão de Nota Fiscal no prazo estabelecido poderá acarretar postergação do pagamento, sem que isso configure mora da CONTRATANTE.</div>

  <!-- CLÁUSULA SEXTA -->
  <div class="section-title">Cláusula Sexta — Vigência</div>
  <div class="clause"><span class="clause-num">6.1.</span>O presente contrato entra em vigor na data de sua assinatura, por prazo indeterminado, podendo ser rescindido por qualquer das partes nos termos da Cláusula Sétima.</div>

  <!-- CLÁUSULA SÉTIMA -->
  <div class="section-title">Cláusula Sétima — Da Rescisão</div>
  <div class="clause"><span class="clause-num">7.1.</span>Poderá o instrumento ser rescindido unilateralmente por qualquer das partes, sem justo motivo, mediante aviso prévio de <strong>30 (trinta) dias</strong> por escrito.</div>
  <div class="clause"><span class="clause-num">7.2.</span>Rescisão motivada poderá ocorrer imediatamente mediante notificação judicial ou extrajudicial nas seguintes situações: (a) falência, concordata ou recuperação judicial que afete o cumprimento contratual; (b) dolo ou má-fé na prestação dos serviços; (c) descumprimento reiterado de qualquer obrigação deste contrato.</div>

  <!-- CLÁUSULA OITAVA -->
  <div class="section-title">Cláusula Oitava — Cessão e Subcontratação</div>
  <div class="clause"><span class="clause-num">8.1.</span>É vedada a cessão ou subcontratação total ou parcial deste CONTRATO sem prévia anuência por escrito da CONTRATANTE, sob pena de rescisão imediata.</div>

  <!-- CLÁUSULA NONA -->
  <div class="section-title">Cláusula Nona — Da Natureza do Contrato</div>
  <div class="clause"><span class="clause-num">9.1.</span>O presente contrato é de natureza exclusivamente civil, regido pelos Arts. 593 a 609 do Código Civil Brasileiro de 2002, não constituindo vínculo societário, empregatício, de representação comercial ou de subordinação entre as partes.</div>
  <div class="clause"><span class="clause-num">9.2.</span>O CONTRATADO assume total responsabilidade pelo recolhimento de tributos e encargos sociais e previdenciários de seus sócios, prepostos, empregados e colaboradores.</div>

  <!-- CLÁUSULA DÉCIMA -->
  <div class="section-title">Cláusula Décima — Disposições Gerais</div>
  <div class="clause"><span class="clause-num">10.1.</span>O CONTRATADO, em caso de extinção deste contrato por qualquer motivo, fica proibido de repassar ou divulgar informações sigilosas da CONTRATANTE, de seus produtos e serviços.</div>
  <div class="clause"><span class="clause-num">10.2.</span>Nenhuma das partes será responsável por falhas ou atrasos causados por caso fortuito ou força maior, nos termos do Código Civil Brasileiro.</div>
  <div class="clause"><span class="clause-num">10.3.</span>Eventual saldo pago a maior pelo CONTRATADO será restituído proporcionalmente, mediante abatimento nas remunerações subsequentes ou por outro meio acordado entre as partes.</div>

  <!-- CLÁUSULA DÉCIMA PRIMEIRA -->
  <div class="section-title">Cláusula Décima Primeira — Do Foro</div>
  <div class="clause"><span class="clause-num">11.1.</span>Fica eleito o Foro da Comarca de <strong>${_ce(admForo,'Cidade/UF')}</strong> como competente para conhecer e solucionar eventual pendência oriunda deste contrato, com expressa renúncia de quaisquer outros.</div>

  <hr class="divider-thin" style="margin-top:20px">
  <div class="clause" style="text-align:center;margin:14px 0 6px">
    E por estarem cientes e de acordo, firmam o presente instrumento em 02 (duas) vias de igual teor, na presença das testemunhas abaixo.
  </div>
  <div style="text-align:center;font-size:11.5px;color:#555;margin-bottom:24px">${_ce(admCidade,'Cidade')}, ${dataHoje}.</div>

  <div class="sign-grid">
    <div class="sign-block">
      <div class="sign-line">
        ${assinaturaMaster?.dataUrl ? `<img src="${assinaturaMaster.dataUrl}" alt="assinatura" style="max-height:52px;max-width:200px;object-fit:contain">` : ''}
      </div>
      <div class="sign-name">${admResp || admRazao}</div>
      <div class="sign-sub">${admFantasia || admRazao}</div>
      <div class="sign-sub">CNPJ ${admCnpj}</div>
      <div class="sign-sub" style="color:#1a3a5c;font-weight:700">CONTRATANTE</div>
    </div>
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-name">${tecResp || tecRazao}</div>
      <div class="sign-sub">${tecRazao}</div>
      <div class="sign-sub">CNPJ ${tecCnpj}</div>
      <div class="sign-sub" style="color:#1a3a5c;font-weight:700">CONTRATADO</div>
    </div>
  </div>

  <div style="margin-top:28px;font-size:10.5px;font-weight:700;color:#555;text-align:center">Testemunhas</div>
  <div class="test-grid">
    <div class="test-block">
      <div style="border-bottom:1px solid #555;margin-bottom:4px;height:34px"></div>
      <div>1) Nome: ___________________________</div>
      <div>RG: _____________  CPF: _______________</div>
    </div>
    <div class="test-block">
      <div style="border-bottom:1px solid #555;margin-bottom:4px;height:34px"></div>
      <div>2) Nome: ___________________________</div>
      <div>RG: _____________  CPF: _______________</div>
    </div>
  </div>

  <!-- Rodapé de rastreio — necessário para validação do PDF assinado devolvido -->
  <div style="margin-top:30px;padding-top:10px;border-top:1px dotted #e2e8f0;text-align:center;font-size:8px;color:#bbb;line-height:1.6">
    Documento gerado em ${dataHoje} · Ref: ${hash} · ${uid}<br>
    Contrato de Prestação de Serviços e Outras Avenças — ${tecRazao}
  </div>

  <div class="no-print" style="margin-top:28px;text-align:center">
    <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;border-radius:8px;padding:10px 24px;font-size:12px;font-weight:700;cursor:pointer">
      &#x2715; Fechar e voltar ao app
    </button>
  </div>

</div>
</body>
</html>`;

  const _blob1 = new Blob([html], { type: 'text/html; charset=utf-8' });
  const _url1 = _createBlobUrl(_blob1);
  const win = window.open(_url1, '_blank');
  if (!win) { const a = document.createElement('a'); a.href = _url1; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
  // Fase5: Blob gerenciado por _createBlobUrl
}

function _ecTexto(respEc) {
  if (!respEc) return 'solteiro(a)';
  const ec = respEc.toLowerCase();
  if (ec.includes('solteiro'))          return 'solteiro(a)';
  if (ec.includes('divorciado'))        return 'divorciado(a)';
  if (ec.includes('viúvo'))             return 'viúvo(a)';
  if (ec.includes('união estável'))     return 'em união estável';
  if (ec.includes('comunhão parcial'))  return 'casado(a) em regime de comunhão parcial de bens';
  if (ec.includes('comunhão universal'))return 'casado(a) em regime de comunhão universal de bens';
  if (ec.includes('separação total'))   return 'casado(a) em regime de separação total de bens';
  if (ec.includes('casado'))            return 'casado(a)';
  return ec;
}

async function iniciarFluxoContrato(uid) {
  const hash      = `${uid}-${Date.now().toString(36)}`;
  const geradoEm  = new Date().toISOString();
  try {
    await _dbSet(`contratos/${uid}/prestacaoServicos`, {
      hash, status: 'aguardando_assinatura', geradoEm
    });
  } catch(e) {
    console.error('[iniciarFluxoContrato] Firebase erro:', e);
  }
  renderContratoPendente(uid, hash);
  screen('contrato-pendente');
}

async function verificarContratoPendente() {
  if (!currentUser || currentUser.role === 'master') return false;
  // Observadores dispensados de contrato de prestação; Fiscal (V0) agora incluído
  if (_isObservador(currentUser)) return false;
  const uid = currentUser.id;
  try {
    const snap = await db.ref(`contratos/${uid}/prestacaoServicos`).once('value');
    const dados = snap.val();
    // Já assinado → verifica se foi via gov.br
    if (dados && dados.status === 'assinado') {
      if (!dados.assinadoVia || dados.assinadoVia !== 'govbr-tec') {
        _contratoSemGovBr = { uid, hash: dados.hash || uid };
      }
      return false; // não bloqueia
    }
    if (!dados) return false;
    // Pendente — exibe bloqueio
    renderContratoPendente(uid, dados.hash || uid);
    screen('contrato-pendente');
    return true;
  } catch(e) {
    console.error('[verificarContratoPendente]', e);
    return false; // Não bloqueia em caso de erro de permissão
  }
}

function renderContratoPendente(uid, hash) {
  const el = document.getElementById('contrato-pendente-content');
  if (!el) return;
  const nome = (usersCache[uid] || currentUser)?.name || uid;
  el.innerHTML = `
    <!-- Passo 1: Baixar -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="background:#1f4e79;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0">1</div>
        <span style="font-weight:700;font-size:.9rem;color:#1e3a5f">Baixe e leia seu contrato</span>
      </div>
      <p style="font-size:.82rem;color:#374151;margin:0 0 10px">Seu contrato de prestação de serviços foi gerado com seus dados. Clique para abrir e salvar como PDF.</p>
      <button onclick="abrirContratoGerado('${uid}')"
        style="background:#1f4e79;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:.84rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px">
        <i class="fas fa-file-contract"></i> Abrir / Baixar Contrato
      </button>
    </div>

    <!-- Passo 2: Assinar -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="background:#15803d;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0">2</div>
        <span style="font-weight:700;font-size:.9rem;color:#14532d">Assine digitalmente via gov.br</span>
      </div>
      <p style="font-size:.82rem;color:#374151;margin:0 0 10px">
        Acesse <strong><a href="https://assinador.iti.br" target="_blank" style="color:#15803d">assinador.iti.br</a></strong>,
        faça login com sua conta gov.br (nível <strong>Prata</strong> ou <strong>Ouro</strong>),
        carregue o PDF do contrato e assine digitalmente.
      </p>
      <div style="background:#dcfce7;border-radius:6px;padding:8px 12px;font-size:.79rem;color:#14532d">
        <i class="fas fa-info-circle" style="margin-right:5px"></i>
        Não tem conta gov.br? Acesse <a href="https://acesso.gov.br" target="_blank" style="color:#15803d;font-weight:700">acesso.gov.br</a> para criar ou validar sua conta.
      </div>
    </div>

    <!-- Passo 3: Devolver -->
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="background:#ca8a04;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0">3</div>
        <span style="font-weight:700;font-size:.9rem;color:#713f12">Envie o contrato assinado aqui</span>
      </div>
      <p style="font-size:.82rem;color:#374151;margin:0 0 10px">Após assinar, carregue o PDF assinado abaixo. O sistema verificará a autenticidade automaticamente.</p>
      <label style="display:inline-flex;align-items:center;gap:8px;background:#ca8a04;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:.84rem;font-weight:700;cursor:pointer">
        <i class="fas fa-upload"></i> Carregar PDF Assinado
        <input type="file" accept=".pdf" style="display:none" onchange="tecUploadContratoAssinado(event, '${uid}')">
      </label>
      <div id="contrato-upload-status" style="margin-top:10px;font-size:.82rem;color:#92400e"></div>
    </div>

    <div style="font-size:.76rem;color:#94a3b8;text-align:center;margin-top:8px">
      <i class="fas fa-shield-alt" style="margin-right:4px"></i>Ref: ${hash}
    </div>`;
}

async function abrirContratoGerado(uid) {
  try {
    const snap = await db.ref(`contratos/${uid}/prestacaoServicos`).once('value');
    const dados = snap.val();
    if (dados && dados.status === 'assinado' && dados.pdfBase64) {
      // Abre o PDF assinado (gov.br) armazenado
      const byteChars = atob(dados.pdfBase64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      return;
    }
    // Não assinado ou sem PDF — gera HTML do contrato
    const hash = dados?.hash || uid;
    gerarContratoServicos(uid, hash);
  } catch(e) {
    console.error('[abrirContratoGerado]', e);
    gerarContratoServicos(uid, uid);
  }
}

async function tecUploadContratoAssinado(event, uid) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Selecione um arquivo PDF válido.', 'error'); event.target.value = ''; return;
  }
  const statusEl = document.getElementById('contrato-upload-status');
  const lbl      = event.target.closest('label');
  if (lbl)      { lbl.style.pointerEvents = 'none'; lbl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...'; }
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:#ca8a04"></i> Verificando documento e assinatura...';
  try {
    const buffer = await file.arrayBuffer();

    // Converte PDF para base64 para armazenamento
    const _bytes = new Uint8Array(buffer);
    let _b64 = '';
    for (let _i = 0; _i < _bytes.length; _i += 32768) {
      _b64 += String.fromCharCode.apply(null, _bytes.subarray(_i, _i + 32768));
    }
    const pdfBase64 = btoa(_b64);

    // Verificar assinatura digital gov.br PRIMEIRO
    const sig = _parsePDFSignature(buffer);

    // Validar conteúdo — usa uid como fbKey para checar hash embutido
    const conteudo = await _validarConteudoTermo(buffer, uid);

    // Se tem assinatura digital válida (gov.br comprime o texto do PDF,
    // então a validação de conteúdo pode falhar mesmo em PDFs legítimos)
    if (sig.score >= 5) {
      // ✅ Assinatura digital forte — aceita mesmo com conteúdo comprimido
      const agora = new Date().toISOString();
      await db.ref(`contratos/${uid}/prestacaoServicos`).update({
        status: 'assinado', assinadoEm: agora, assinadoVia: 'govbr-tec',
        nomeArquivo: file.name,
        pdfBase64: pdfBase64,
        validacao: { score: conteudo.scoreConteudo, sigScore: sig.score, temHash: conteudo.temRef }
      });
      if (statusEl) statusEl.innerHTML = '<span style="color:#15803d"><i class="fas fa-check-circle"></i> Contrato verificado! Liberando acesso...</span>';
      toast('✅ Contrato verificado com sucesso! Acesso liberado.', 'success');
      await new Promise(r => setTimeout(r, 1000));
      // Continua login normalmente
      await carregarDados();
      const bloqueadoPorTermo = currentUser.role !== 'master' && await verificarTermosPendentes();
      if (!bloqueadoPorTermo) { screen('app'); showPage('meu-dash'); }

    } else if (!conteudo.valido && sig.score < 2) {
      // Sem assinatura E conteúdo não reconhecido — PDF errado
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado'; }
      if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626"><i class="fas fa-times-circle"></i> Este PDF não é o contrato correto. Baixe novamente, assine e envie.</span>';
      event.target.value = ''; return;
    } else if (conteudo.valido && sig.score >= 2) {
      // Conteúdo OK e assinatura parcial — aceitável
      const agora = new Date().toISOString();
      await db.ref(`contratos/${uid}/prestacaoServicos`).update({
        status: 'assinado', assinadoEm: agora, assinadoVia: 'govbr-tec',
        nomeArquivo: file.name,
        pdfBase64: pdfBase64,
        validacao: { score: conteudo.scoreConteudo, sigScore: sig.score, temHash: conteudo.temRef }
      });
      if (statusEl) statusEl.innerHTML = '<span style="color:#15803d"><i class="fas fa-check-circle"></i> Contrato verificado! Liberando acesso...</span>';
      toast('✅ Contrato verificado com sucesso! Acesso liberado.', 'success');
      await new Promise(r => setTimeout(r, 1000));
      await carregarDados();
      const bloqueadoPorTermo = currentUser.role !== 'master' && await verificarTermosPendentes();
      if (!bloqueadoPorTermo) { screen('app'); showPage('meu-dash'); }
    } else if (sig.score >= 2) {
      // Assinatura parcial mas conteúdo não reconhecido
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Tentar novamente'; }
      if (statusEl) statusEl.innerHTML = '<span style="color:#92400e"><i class="fas fa-exclamation-triangle"></i> O documento parece assinado, mas a assinatura é inconclusiva. Use o assinador.iti.br com conta gov.br Prata ou Ouro.</span>';
      event.target.value = '';
    } else {
      // Conteúdo OK mas sem assinatura
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado'; }
      if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626"><i class="fas fa-times-circle"></i> Assinatura digital não encontrada. Assine via assinador.iti.br antes de enviar.</span>';
      event.target.value = '';
    }
  } catch(e) {
    console.error('[tecUploadContratoAssinado]', e);
    if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado'; }
    if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626"><i class="fas fa-times-circle"></i> Erro ao processar o arquivo. Tente novamente.</span>';
    event.target.value = '';
  }
}

async function renderMeusDocsPage() {
  const el = document.getElementById('meus-docs-content');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:.85rem"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
  const uid = currentUser.id;
  try {
    const snap = await db.ref(`contratos/${uid}/prestacaoServicos`).once('value');
    const dados = snap.val();
    if (!dados) {
      el.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Nenhum documento disponível.</p>'; return;
    }
    const assinadoGovBr = dados.assinadoVia === 'govbr-tec';
    const govBrBadge = assinadoGovBr
      ? `<span style="background:#1351b4;color:#fff;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px;margin-left:5px"><i class="fas fa-shield-alt" style="margin-right:3px"></i>Gov.br ✓</span>`
      : '';
    const statusBadge = dados.status === 'assinado'
      ? `<span style="background:#dcfce7;color:#15803d;border:1px solid #86efac;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">✅ Assinado — ${new Date(dados.assinadoEm||'').toLocaleDateString('pt-BR')}</span>${govBrBadge}`
      : `<span style="background:#fef9c3;color:#854d0e;border:1px solid #fde68a;font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:10px">⏳ Aguardando assinatura</span>`;
    el.innerHTML = `
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px">
          <i class="fas fa-file-contract" style="font-size:1.6rem;color:#1f4e79"></i>
          <div>
            <div style="font-weight:700;font-size:.9rem;color:#1e293b">Contrato de Prestação de Serviços</div>
            <div style="font-size:.78rem;color:#64748b;margin-top:2px">Gerado em ${new Date(dados.geradoEm||'').toLocaleDateString('pt-BR')} · Ref: ${dados.hash||'—'}</div>
            <div style="margin-top:6px">${statusBadge}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="abrirContratoGerado('${uid}')"
            style="background:${dados.status === 'assinado' && dados.pdfBase64 ? '#15803d' : '#1f4e79'};color:#fff;border:none;border-radius:7px;padding:8px 16px;font-size:.82rem;font-weight:700;cursor:pointer">
            <i class="fas ${dados.status === 'assinado' && dados.pdfBase64 ? 'fa-file-pdf' : 'fa-eye'}"></i> ${dados.status === 'assinado' && dados.pdfBase64 ? 'Abrir PDF Assinado (gov.br)' : 'Visualizar'}
          </button>
          ${(dados.status !== 'assinado' || !dados.pdfBase64) ? `
          <label style="background:${dados.status !== 'assinado' ? '#ca8a04' : '#7c3aed'};color:#fff;border:none;border-radius:7px;padding:8px 16px;font-size:.82rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px"
            title="${dados.status === 'assinado' && !dados.pdfBase64 ? 'PDF assinado não encontrado — reenvie para armazenar no sistema' : ''}">
            <i class="fas fa-upload"></i> ${dados.status === 'assinado' && !dados.pdfBase64 ? 'Reenviar PDF Assinado' : 'Enviar Assinado'}
            <input type="file" accept=".pdf" style="display:none" onchange="tecUploadContratoAssinado(event,'${uid}')">
          </label>` : ''}
        </div>
      </div>`;
  } catch(e) {
    el.innerHTML = '<p style="color:#dc2626;font-size:.85rem">Erro ao carregar documentos.</p>';
  }
}

async function escolherOpcaoPagamento(fbKey, opcao) {
  const d = descontosCache[fbKey];
  if (!d) { toast('Desconto não encontrado.', 'error'); return; }

  const agora  = new Date();
  const anoMes = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}`;

  const labelOpcao = opcao === 'A'
    ? 'Opção A — Desconto no honorário'
    : 'Opção B — Pagamento via PIX direto';

  if (!confirm(`Confirmar escolha para ${anoMes}?\n\n${labelOpcao}`)) return;

  try {
    await _dbSet(`config/descontos/${fbKey}/escolhas/${anoMes}`, opcao);

    // Atualiza cache local
    if (!descontosCache[fbKey].escolhas) descontosCache[fbKey].escolhas = {};
    descontosCache[fbKey].escolhas[anoMes] = opcao;

    toast(`✅ ${labelOpcao} registrada para ${anoMes}!`, 'success');

    // Re-renderiza o dash do prestador se estiver visível
    if (document.getElementById('page-meu-dash')?.style.display !== 'none') {
      renderMeuDash();
    }
    // Re-renderiza financeiro admin se estiver visível
    if (document.getElementById('page-financeiro')?.style.display !== 'none') {
      _renderFinDescontos();
    }
  } catch(e) {
    console.error('[escolherOpcaoPagamento]', e);
    toast('Erro ao registrar escolha: ' + (e.message || e), 'error');
  }
}

// ── Expor funções como globals para o admin.html (tree-shaking fix) ──
window.renderDocumentosAutenticados = renderDocumentosAutenticados;
window.visualizarDocAutenticado = visualizarDocAutenticado;
window._parsePDFSignature = _parsePDFSignature;
window._validarConteudoTermo = _validarConteudoTermo;
window.tecUploadTermoAssinado = tecUploadTermoAssinado;
window.verificarPDFAssinado = verificarPDFAssinado;
window.confirmarTermoAbatimento = confirmarTermoAbatimento;
window.reabrirTermoAbatimento = reabrirTermoAbatimento;
window._gerarContratoFiscal = _gerarContratoFiscal;
window.gerarContratoServicos = gerarContratoServicos;
window._ecTexto = _ecTexto;
window.iniciarFluxoContrato = iniciarFluxoContrato;
window.verificarContratoPendente = verificarContratoPendente;
window.renderContratoPendente = renderContratoPendente;
window.abrirContratoGerado = abrirContratoGerado;
window.tecUploadContratoAssinado = tecUploadContratoAssinado;
window.renderMeusDocsPage = renderMeusDocsPage;
window.escolherOpcaoPagamento = escolherOpcaoPagamento;