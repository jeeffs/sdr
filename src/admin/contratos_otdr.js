// src/admin/contratos_otdr.js
// Contrato de Aluguel/Compra OTDR EXFO MAXI 730D — contrato único compartilhado
// Fluxo:
//   1. Admin configura os 6 compradores → descontos criados para todos (termoAssinado: false)
//   2. Admin envia o PDF pelo WhatsApp — 6 assinam sequencialmente via assinador.iti.br
//   3. Conforme cada um assina, admin confirma individualmente → desconto validado (termoAssinado: true)
//   4. Admin faz upload do PDF final → valida todos os restantes de uma vez

// ── Helpers locais ────────────────────────────────────────────────────────────
function _fmtEstadoCivil(ec) {
  const map = {
    solteiro: 'solteiro(a)', casado: 'casado(a)', divorciado: 'divorciado(a)',
    viuvo: 'viúvo(a)', uniao_estavel: 'em união estável', separado: 'separado(a)'
  };
  return map[(ec||'').toLowerCase()] || ec || '';
}

// ── Constantes ────────────────────────────────────────────────────────────────
const OTDR_FB_PATH         = 'contratos_equipamentos/otdr_730d';
const OTDR_VALOR_TOTAL     = 90000;
const OTDR_TOTAL_PARCELAS  = 60;
const OTDR_VALOR_COMPRADOR = 250;  // R$/mês por comprador
const OTDR_INICIO_MES      = '2026-02'; // início geral (5 técnicos)
// Ewerton pagou apenas 1 parcela (mar/2026 foi sua 1ª), os demais iniciaram em fev/2026
// Mapa de início específico por uid — sobrescreve OTDR_INICIO_MES se presente
// Preenchido pelo admin na configuração; aqui guardado no Firebase como _config.inicioUid
const OTDR_INICIO_DEFAULT = OTDR_INICIO_MES;

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Painel de gestão
// ═══════════════════════════════════════════════════════════════════════════════

async function renderGerenciarOTDR() {
  const el = document.getElementById('otdr-gestao-content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:24px;color:#64748b"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const [snapCfg, snapComp, snapUnico] = await Promise.all([
      db.ref(`${OTDR_FB_PATH}/_config`).once('value'),
      db.ref(`${OTDR_FB_PATH}/compradores`).once('value'),
      db.ref(`${OTDR_FB_PATH}/contrato_unico`).once('value')
    ]);
    const config        = snapCfg.val()   || null;
    const compradores   = snapComp.val()  || {};
    const contratoUnico = snapUnico.val() || null;

    let html = `
    <div style="background:#1f4e79;color:#fff;border-radius:12px;
      padding:18px 20px;margin-bottom:18px;display:flex;align-items:center;gap:14px">
      <div style="background:rgba(255,255,255,.15);border-radius:10px;width:44px;height:44px;
        display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i class="fas fa-camera" style="font-size:1.2rem"></i>
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:.95rem">3× OTDR EXFO MAXI 730D</div>
        <div style="font-size:.78rem;opacity:.85">
          Aluguel/Compra — 60 meses × R$ 250,00/comprador — Fev/2026 a Jan/2031
        </div>
      </div>
    </div>`;

    if (!config) {
      html += _renderOTDRSetup();
    } else {
      html += _renderOTDRPainel(config, compradores, contratoUnico);
    }

    el.innerHTML = html;
  } catch(e) {
    console.error('[renderGerenciarOTDR]', e);
    el.innerHTML = `<div style="color:#dc2626;padding:16px">
      <i class="fas fa-exclamation-triangle"></i> Erro ao carregar contrato OTDR.</div>`;
  }
}

function _renderOTDRSetup() {
  // Usa Object.entries para obter o Firebase key (fbKey) correto de cada usuário
  const tecs = Object.entries(usersCache || {})
    .filter(([, u]) => u.role !== 'master' && !_isObservador(u))
    .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''));

  const opts = tecs.map(([fbKey, u]) =>
    `<div style="border:1px solid #e2e8f0;border-radius:8px;background:#fff;
      padding:10px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <input type="checkbox" value="${fbKey}" style="accent-color:#1f4e79;width:16px;height:16px;flex-shrink:0">
      <span style="font-size:.85rem;font-weight:600;flex:1;min-width:120px">${u.name || fbKey}</span>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <label style="font-size:.74rem;color:#64748b;white-space:nowrap">Início parcelas:</label>
        <input type="month" id="otdr-inicio-${fbKey}" value="${OTDR_INICIO_MES}"
          style="font-size:.78rem;border:1px solid #e2e8f0;border-radius:5px;padding:3px 6px;color:#374151">
      </div>
    </div>`
  ).join('');

  return `
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;margin-bottom:14px">
    <div style="font-weight:700;font-size:.88rem;color:#1e3a5f;margin-bottom:4px">
      <i class="fas fa-cog" style="margin-right:6px"></i>Configuração inicial
    </div>
    <div style="font-size:.82rem;color:#374151;line-height:1.5">
      Selecione os <strong>6 técnicos compradores</strong> e ajuste a data de início individual se necessário.<br>
      <span style="color:#64748b;font-size:.79rem">Ex: Ewerton iniciou em 2026-04 (1 parcela paga), demais em 2026-02 (3 parcelas pagas)</span>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px" id="otdr-setup-list">
    ${opts}
  </div>
  <button onclick="salvarConfiguracaoOTDR()"
    style="background:#1f4e79;color:#fff;border:none;border-radius:8px;padding:10px 20px;
    font-size:.85rem;font-weight:600;cursor:pointer">
    <i class="fas fa-save" style="margin-right:5px"></i>Salvar configuração
  </button>`;
}

function _renderOTDRPainel(config, compradores, contratoUnico) {
  const uidsRaw    = config.uids || [];
  // Detecta uids quebrados (gravados como string 'undefined' por bug anterior)
  const uidsQuebrados = uidsRaw.filter(u => !u || u === 'undefined' || !usersCache?.[u]);
  if (uidsQuebrados.length === uidsRaw.length && uidsRaw.length > 0) {
    // Todos os uids são inválidos — exige reconfiguração
    return `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;
      padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:1.5rem;margin-bottom:8px">⚠️</div>
      <div style="font-weight:700;color:#b91c1c;font-size:.9rem;margin-bottom:6px">
        Configuração inválida detectada
      </div>
      <div style="font-size:.82rem;color:#7f1d1d;margin-bottom:14px;line-height:1.5">
        Os técnicos foram salvos incorretamente (bug corrigido). É necessário reconfigurar
        para registrar os 6 compradores corretamente.
      </div>
      <button onclick="renderConfigurarOTDR()"
        style="background:#b91c1c;color:#fff;border:none;border-radius:8px;
        padding:10px 20px;font-size:.85rem;font-weight:700;cursor:pointer">
        <i class="fas fa-cog" style="margin-right:5px"></i>Reconfigurar agora
      </button>
    </div>`;
  }

  const uids       = uidsRaw.filter(u => u && u !== 'undefined');
  const contratoOk = contratoUnico?.status === 'assinado';
  const assinados  = uids.filter(u => compradores[u]?.status === 'assinado').length;
  const pendentes  = uids.length - assinados;

  let html = `
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <div style="background:#dcfce7;border-radius:8px;padding:10px 16px;flex:1;min-width:90px;text-align:center">
      <div style="font-size:1.4rem;font-weight:700;color:#15803d">${assinados}</div>
      <div style="font-size:.74rem;color:#15803d;font-weight:600">Confirmados</div>
    </div>
    <div style="background:#fef3c7;border-radius:8px;padding:10px 16px;flex:1;min-width:90px;text-align:center">
      <div style="font-size:1.4rem;font-weight:700;color:#ca8a04">${pendentes}</div>
      <div style="font-size:.74rem;color:#ca8a04;font-weight:600">Pendentes</div>
    </div>
    <div style="background:#eff6ff;border-radius:8px;padding:10px 16px;flex:1;min-width:90px;text-align:center">
      <div style="font-size:1.4rem;font-weight:700;color:#1f4e79">${uids.length}</div>
      <div style="font-size:.74rem;color:#1f4e79;font-weight:600">Total</div>
    </div>
  </div>`;

  if (!contratoOk) {
    html += `
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;
    padding:14px 16px;margin-bottom:16px;font-size:.82rem;color:#1e3a5f;line-height:1.6">
    <div style="font-weight:700;margin-bottom:6px"><i class="fas fa-info-circle" style="margin-right:5px"></i>Como funciona a assinatura</div>
    <ol style="margin:0;padding-left:18px">
      <li style="margin-bottom:4px">Clique em <strong>Ver/Baixar Contrato</strong> e salve como PDF</li>
      <li style="margin-bottom:4px">Envie o PDF pelo <strong>WhatsApp</strong> para os 6 compradores assinarem</li>
      <li style="margin-bottom:4px">Cada um acessa <a href="https://assinador.iti.br" target="_blank" style="color:#1f4e79;font-weight:700">assinador.iti.br</a> e assina com conta gov.br (Prata ou Ouro) — o PDF vai passando de um para outro</li>
      <li>Após todos assinarem, faça o <strong>upload do PDF final</strong> aqui embaixo</li>
    </ol>
  </div>`;
  }

  // Botão principal — ver contrato
  html += `
  <div style="margin-bottom:16px">
    <button onclick="abrirContratoOTDR()"
      style="background:#1f4e79;color:#fff;border:none;border-radius:8px;
      padding:10px 18px;font-size:.85rem;font-weight:700;cursor:pointer;
      display:inline-flex;align-items:center;gap:7px">
      <i class="fas fa-file-contract"></i> Ver / Baixar Contrato
    </button>
  </div>`;

  // Lista de status por técnico
  html += `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">`;
  for (const uid of uids) {
    const u        = usersCache[uid] || {};
    const nome     = u.name || uid;
    const comp     = compradores[uid] || null;
    const okAssin  = comp?.status === 'assinado';
    const fbKey    = comp?.descontoFbKey || null;
    const desc     = fbKey && typeof descontosCache !== 'undefined' ? descontosCache[fbKey] : null;
    const descOk   = desc?.termoAssinado === true;
    const inicioStr = desc?.parcelaInicio
      ? desc.parcelaInicio.replace('-', '/')
      : (comp?.inicioMes || OTDR_INICIO_MES).replace('-', '/');

    html += `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;
      padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
        background:${okAssin ? '#dcfce7' : '#fef3c7'};
        display:flex;align-items:center;justify-content:center">
        <i class="fas ${okAssin ? 'fa-check' : 'fa-clock'}"
          style="color:${okAssin ? '#15803d' : '#ca8a04'};font-size:.8rem"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nome}</div>
        <div style="font-size:.72rem;color:#64748b;margin-top:2px;display:flex;flex-wrap:wrap;gap:6px">
          ${okAssin
            ? `<span style="color:#15803d"><i class="fas fa-check-circle"></i> Assinado em ${new Date(comp.assinadoEm).toLocaleDateString('pt-BR')}</span>`
            : '<span style="color:#ca8a04"><i class="fas fa-hourglass-half"></i> Assinatura pendente</span>'
          }
          ${fbKey
            ? descOk
              ? `<span style="color:#15803d"><i class="fas fa-dollar-sign"></i> Desconto validado · desde ${inicioStr}</span>`
              : `<span style="color:#6366f1"><i class="fas fa-dollar-sign"></i> Desconto criado · desde ${inicioStr} · aguarda assinatura</span>`
            : '<span style="color:#dc2626"><i class="fas fa-exclamation-circle"></i> Sem desconto</span>'
          }
        </div>
      </div>
      ${!okAssin
        ? `<button onclick="confirmarAssinadoOTDRIndividual('${uid}')"
            style="background:#15803d;color:#fff;border:none;border-radius:7px;
            padding:6px 11px;font-size:.75rem;font-weight:600;cursor:pointer;flex-shrink:0">
            <i class="fas fa-check"></i> Confirmar
          </button>`
        : ''
      }
    </div>`;
  }
  html += `</div>`;

  // Área de upload (se contrato ainda não foi enviado) ou exibir PDF assinado
  if (contratoOk) {
    html += `
    <div style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;
      padding:14px 16px;display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <i class="fas fa-check-circle" style="color:#15803d;font-size:1.4rem;flex-shrink:0"></i>
      <div style="flex:1">
        <div style="font-weight:700;font-size:.88rem;color:#14532d">Contrato assinado por todos</div>
        <div style="font-size:.76rem;color:#166534;margin-top:2px">
          Upload em ${new Date(contratoUnico.uploadEm).toLocaleDateString('pt-BR')} — ${contratoUnico.nomeArquivo || 'contrato_otdr.pdf'}
        </div>
      </div>
      ${contratoUnico.pdfBase64
        ? `<button onclick="adminVerPDFOTDR()"
            style="background:#15803d;color:#fff;border:none;border-radius:7px;
            padding:7px 12px;font-size:.77rem;font-weight:600;cursor:pointer;flex-shrink:0">
            <i class="fas fa-file-pdf"></i> Ver PDF
          </button>`
        : ''
      }
    </div>`;
  } else {
    html += `
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;
      padding:14px 16px;margin-bottom:14px">
      <div style="font-weight:700;font-size:.86rem;color:#713f12;margin-bottom:8px">
        <i class="fas fa-upload" style="margin-right:5px"></i>
        Upload do PDF final (com todas as assinaturas)
      </div>
      <p style="font-size:.8rem;color:#78350f;margin:0 0 10px;line-height:1.5">
        Após todos os 6 compradores assinarem via gov.br, faça o upload do PDF aqui.
        O sistema validará e ativará os descontos de todos automaticamente.
      </p>
      <label id="lbl-upload-otdr-admin"
        style="display:inline-flex;align-items:center;gap:8px;background:#ca8a04;color:#fff;
        border:none;border-radius:8px;padding:10px 18px;font-size:.83rem;font-weight:700;cursor:pointer">
        <i class="fas fa-upload"></i> Carregar PDF Assinado (todos)
        <input type="file" accept=".pdf" style="display:none"
          onchange="adminUploadContratoOTDR(event)">
      </label>
      <div id="otdr-admin-upload-status" style="margin-top:10px;font-size:.82rem;color:#92400e"></div>
    </div>`;
  }

  html += `
  <div style="padding-top:12px;border-top:1px solid #e2e8f0">
    <button onclick="renderConfigurarOTDR()"
      style="background:none;border:1px solid #cbd5e1;border-radius:8px;
      padding:8px 13px;font-size:.8rem;font-weight:600;cursor:pointer;color:#64748b">
      <i class="fas fa-cog" style="margin-right:4px"></i>Reconfigurar
    </button>
  </div>`;

  return html;
}

// ── Admin: configurar (reconfigurar) ─────────────────────────────────────────

window.renderConfigurarOTDR = async function() {
  const el = document.getElementById('otdr-gestao-content');
  if (!el) return;

  el.innerHTML = '<div style="text-align:center;padding:20px;color:#64748b"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

  // Carrega config atual para pré-preencher checkboxes e datas
  let cfgAtual = null;
  try {
    const snap = await db.ref(`${OTDR_FB_PATH}/_config`).once('value');
    cfgAtual = snap.val() || null;
  } catch(_e) { /* segue sem config */ }

  const uidsAtuais = new Set(cfgAtual?.uids || []);
  const inicioUidAtual = cfgAtual?.inicioUid || {};

  const tecs = Object.entries(usersCache || {})
    .filter(([, u]) => u.role !== 'master' && !_isObservador(u))
    .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''));

  const opts = tecs.map(([fbKey, u]) => {
    const checked = uidsAtuais.has(fbKey) ? 'checked' : '';
    const inicioVal = inicioUidAtual[fbKey] || OTDR_INICIO_MES;
    return `<div style="border:1px solid #e2e8f0;border-radius:8px;background:#fff;
        padding:10px 12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <input type="checkbox" value="${fbKey}" ${checked}
        style="accent-color:#1f4e79;width:16px;height:16px;flex-shrink:0">
      <span style="font-size:.85rem;font-weight:600;flex:1;min-width:120px">${u.name || fbKey}</span>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <label style="font-size:.74rem;color:#64748b;white-space:nowrap">Início parcelas:</label>
        <input type="month" id="otdr-inicio-${fbKey}" value="${inicioVal}"
          style="font-size:.78rem;border:1px solid #e2e8f0;border-radius:5px;padding:3px 6px;color:#374151">
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 16px;margin-bottom:14px;font-size:.82rem">
      <i class="fas fa-exclamation-triangle" style="color:#ca8a04;margin-right:6px"></i>
      <strong>Reconfiguração:</strong> Marque os 6 técnicos e ajuste as datas de início individualmente.
      Alterar a data de início atualiza o desconto existente do técnico.
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px" id="otdr-setup-list">${opts}</div>
    <div style="display:flex;gap:8px">
      <button onclick="salvarConfiguracaoOTDR()"
        style="background:#1f4e79;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:.83rem;font-weight:600;cursor:pointer">
        <i class="fas fa-save"></i> Salvar
      </button>
      <button onclick="renderGerenciarOTDR()"
        style="background:none;border:1px solid #cbd5e1;border-radius:8px;padding:9px 14px;font-size:.83rem;color:#64748b;cursor:pointer">
        Cancelar
      </button>
    </div>`;
};

// ── Admin: salvar configuração ────────────────────────────────────────────────

window.salvarConfiguracaoOTDR = async function() {
  const checks = document.querySelectorAll('#otdr-setup-list input[type=checkbox]:checked');
  const uids = Array.from(checks).map(c => c.value);
  if (uids.length === 0) { toast('Selecione pelo menos um técnico.', 'error'); return; }
  if (uids.length !== 6) {
    if (!confirm(`Você selecionou ${uids.length} técnico(s). O contrato prevê 6 compradores. Continuar?`)) return;
  }
  // Lê datas de início individuais configuradas no form
  const inicioUid = {};
  uids.forEach(uid => {
    const inp = document.getElementById(`otdr-inicio-${uid}`);
    if (inp?.value && inp.value !== OTDR_INICIO_MES) inicioUid[uid] = inp.value;
  });
  try {
    await _dbSet(`${OTDR_FB_PATH}/_config`, {
      equipamento: '3× OTDR EXFO MAXI 730D',
      valorTotal: OTDR_VALOR_TOTAL,
      totalParcelas: OTDR_TOTAL_PARCELAS,
      valorPorComprador: OTDR_VALOR_COMPRADOR,
      inicioParcelas: OTDR_INICIO_MES,
      uids,
      inicioUid: Object.keys(inicioUid).length ? inicioUid : null,
      geradoEm: new Date().toISOString()
    });

    // Limpa dados quebrados de versão anterior (uids gravados como 'undefined')
    try {
      // Compradores com chave 'undefined'
      await db.ref(`${OTDR_FB_PATH}/compradores/undefined`).remove();
      // Descontos com uid 'undefined'
      if (typeof descontosCache !== 'undefined' && descontosCache) {
        const quebrados = Object.entries(descontosCache)
          .filter(([, d]) => (d.uid === 'undefined' || !d.uid) && d.origemContrato === 'otdr_730d');
        await Promise.all(quebrados.map(async ([key]) => {
          await db.ref(`config/descontos/${key}`).remove();
          delete descontosCache[key];
        }));
        if (quebrados.length) console.log(`[OTDR] ${quebrados.length} desconto(s) inválido(s) removido(s)`);
      }
    } catch(_e) { console.warn('[OTDR] limpeza quebrados:', _e.message); }

    // Cria ou atualiza descontos para todos
    await Promise.all(uids.map(async uid => {
      const inicio = inicioUid[uid] || OTDR_INICIO_MES;
      // Tenta criar novo (retorna null se uid inválido, chave existente se já existe)
      const fbKey = await _criarDescontoOTDRPendente(uid, inicio);

      // Se desconto já existia, atualiza parcelaInicio/mesAno caso a data tenha mudado
      if (fbKey && typeof descontosCache !== 'undefined' && descontosCache) {
        const desc = descontosCache[fbKey];
        if (desc && desc.parcelaInicio !== inicio) {
          await _dbUpdate(`config/descontos/${fbKey}`, {
            parcelaInicio: inicio, mesAno: inicio
          });
          descontosCache[fbKey] = { ...desc, parcelaInicio: inicio, mesAno: inicio };
          console.log(`[OTDR] parcelaInicio de ${uid} atualizado para ${inicio}`);
        }
      }
    }));

    toast('Configuração salva! Descontos atualizados.', 'success');
    await renderGerenciarOTDR();
  } catch(e) {
    console.error('[salvarConfiguracaoOTDR]', e);
    toast('Erro ao salvar configuração.', 'error');
  }
};

// ── Admin: gerar contrato para UID ────────────────────────────────────────────

window.gerarContratoOTDRUID = async function(uid) {
  try {
    const hash = `OTDR-${uid}-${Date.now().toString(36)}`.toUpperCase();
    await _dbSet(`${OTDR_FB_PATH}/compradores/${uid}`, {
      hash,
      status: 'aguardando_assinatura',
      geradoEm: new Date().toISOString()
    });
    toast(`Contrato OTDR gerado para ${usersCache[uid]?.name || uid}.`, 'success');
    await renderGerenciarOTDR();
  } catch(e) {
    console.error('[gerarContratoOTDRUID]', e);
    toast('Erro ao gerar contrato.', 'error');
  }
};

window.gerarContratoOTDRTodos = async function() {
  try {
    const [snapCfg, snapComp] = await Promise.all([
      db.ref(`${OTDR_FB_PATH}/_config`).once('value'),
      db.ref(`${OTDR_FB_PATH}/compradores`).once('value')
    ]);
    const uids       = snapCfg.val()?.uids || [];
    const compradores = snapComp.val() || {};
    const naoGerados  = uids.filter(u => !compradores[u]?.hash);
    if (naoGerados.length === 0) { toast('Todos já têm contrato gerado.', 'info'); return; }
    await Promise.all(naoGerados.map(uid => {
      const hash = `OTDR-${uid}-${Date.now().toString(36)}`.toUpperCase();
      return _dbSet(`${OTDR_FB_PATH}/compradores/${uid}`, {
        hash, status: 'aguardando_assinatura', geradoEm: new Date().toISOString()
      });
    }));
    toast(`${naoGerados.length} contrato(s) gerado(s)!`, 'success');
    await renderGerenciarOTDR();
  } catch(e) {
    console.error('[gerarContratoOTDRTodos]', e);
    toast('Erro ao gerar contratos.', 'error');
  }
};

// ── Admin: abrir contrato HTML (único para todos os 6) ───────────────────────

window.abrirContratoOTDR = async function() {
  // Abre a janela IMEDIATAMENTE (dentro do evento de clique) para evitar bloqueio de popup
  const win = window.open('', '_blank');
  if (!win) {
    toast('Permita pop-ups neste site para abrir o contrato.', 'error');
    return;
  }
  win.document.write('<html><body style="font-family:sans-serif;padding:30px;color:#475569">'
    + '<p>⏳ Carregando contrato...</p></body></html>');
  try {
    const snapCfg = await db.ref(`${OTDR_FB_PATH}/_config`).once('value');
    const uids = snapCfg.val()?.uids || [];
    const hash = `OTDR-${Date.now().toString(36)}`.toUpperCase();
    _abrirHTMLContratoOTDR(null, hash, uids, win);
  } catch(e) {
    console.error('[abrirContratoOTDR]', e);
    win.close();
    toast('Erro ao carregar dados do contrato.', 'error');
  }
};

// ── Admin: visualizar PDF já enviado ─────────────────────────────────────────

window.adminVerPDFOTDR = async function() {
  try {
    const snap = await db.ref(`${OTDR_FB_PATH}/contrato_unico/pdfBase64`).once('value');
    const b64 = snap.val();
    if (!b64) { toast('PDF não disponível.', 'error'); return; }
    const bin   = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank');
  } catch(e) {
    console.error('[adminVerPDFOTDR]', e);
    toast('Erro ao abrir PDF.', 'error');
  }
};

// ── Admin: upload do PDF final com todas as assinaturas ──────────────────────

window.adminUploadContratoOTDR = async function(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast('Selecione um arquivo PDF válido.', 'error'); event.target.value = ''; return;
  }

  const statusEl = document.getElementById('otdr-admin-upload-status');
  const lbl      = document.getElementById('lbl-upload-otdr-admin');
  if (lbl)      { lbl.style.pointerEvents = 'none'; lbl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...'; }
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:#ca8a04"></i> Verificando assinaturas e conteúdo...';

  try {
    const buffer = await file.arrayBuffer();

    // Converte para base64
    const _bytes = new Uint8Array(buffer);
    let _b64 = '';
    for (let _i = 0; _i < _bytes.length; _i += 32768) {
      _b64 += String.fromCharCode.apply(null, _bytes.subarray(_i, _i + 32768));
    }
    const pdfBase64 = btoa(_b64);

    const sig      = _parsePDFSignature(buffer);
    const conteudo = _validarConteudoOTDR(buffer);

    // Conteúdo válido + ao menos 1 assinatura digital
    if (conteudo.valido && sig.score >= 2) {
      await _confirmarTodosAssinadosOTDR(pdfBase64, file.name, sig.score, conteudo.score);
      if (statusEl) statusEl.innerHTML = '<span style="color:#15803d"><i class="fas fa-check-circle"></i> Contrato validado! Descontos ativados para todos.</span>';
      toast('✅ Contrato OTDR validado — descontos ativados para todos!', 'success');
      await new Promise(r => setTimeout(r, 1200));
      await renderGerenciarOTDR();

    } else if (!conteudo.valido) {
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado (todos)<input type="file" accept=".pdf" style="display:none" onchange="adminUploadContratoOTDR(event)">'; }
      if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626"><i class="fas fa-times-circle"></i> Este PDF não parece ser o Contrato OTDR correto. Verifique o arquivo e tente novamente.</span>';
      event.target.value = '';

    } else {
      if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado (todos)<input type="file" accept=".pdf" style="display:none" onchange="adminUploadContratoOTDR(event)">'; }
      if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626"><i class="fas fa-times-circle"></i> Nenhuma assinatura digital detectada. Confirma que todos assinaram via assinador.iti.br?</span>';
      event.target.value = '';
    }
  } catch(e) {
    console.error('[adminUploadContratoOTDR]', e);
    if (lbl) { lbl.style.pointerEvents = ''; lbl.innerHTML = '<i class="fas fa-upload"></i> Carregar PDF Assinado (todos)<input type="file" accept=".pdf" style="display:none" onchange="adminUploadContratoOTDR(event)">'; }
    toast('Erro ao processar PDF.', 'error');
  }
};

// ── Confirma todos como assinados e ativa todos os descontos ─────────────────

async function _confirmarTodosAssinadosOTDR(pdfBase64, nomeArquivo, sigScore, conteudoScore) {
  const agora = new Date().toISOString();

  // 1. Salva o contrato único
  await _dbSet(`${OTDR_FB_PATH}/contrato_unico`, {
    status:       'assinado',
    pdfBase64,
    nomeArquivo,
    uploadEm:     agora,
    uploadBy:     currentUser?.id || 'admin',
    validacao:    { sigScore, conteudoScore }
  });

  // 2. Marca cada comprador como assinado e valida o desconto (já criado pendente)
  const snapCfg = await db.ref(`${OTDR_FB_PATH}/_config`).once('value');
  const uids    = snapCfg.val()?.uids || [];

  await Promise.all(uids.map(async uid => {
    // Só atualiza se ainda não confirmado individualmente
    const snapComp = await db.ref(`${OTDR_FB_PATH}/compradores/${uid}/status`).once('value');
    if (snapComp.val() !== 'assinado') {
      await db.ref(`${OTDR_FB_PATH}/compradores/${uid}`).update({
        status:      'assinado',
        assinadoEm:  agora,
        assinadoVia: 'govbr-admin-upload'
      });
    }
    await _validarDescontoOTDR(uid);
  }));
}

window.abrirContratoOTDRPDF = async function(uid) {
  try {
    const snap = await db.ref(`${OTDR_FB_PATH}/compradores/${uid}`).once('value');
    const dados = snap.val();
    if (!dados?.pdfBase64) { toast('PDF assinado não disponível.', 'error'); return; }
    const bin   = atob(dados.pdfBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
  } catch(e) {
    console.error('[abrirContratoOTDRPDF]', e);
    toast('Erro ao abrir PDF.', 'error');
  }
};

// ── Admin: confirmar assinatura individual ────────────────────────────────────

window.confirmarAssinadoOTDRIndividual = async function(uid) {
  const nome = usersCache[uid]?.name || uid;
  if (!confirm(`Confirmar que "${nome}" assinou o Contrato OTDR?\n\nO desconto será validado automaticamente.`)) return;
  try {
    const agora = new Date().toISOString();
    await db.ref(`${OTDR_FB_PATH}/compradores/${uid}`).update({
      status:      'assinado',
      assinadoEm:  agora,
      assinadoVia: 'admin-confirmado'
    });
    await _validarDescontoOTDR(uid);
    toast(`Assinatura de ${nome} confirmada — desconto validado!`, 'success');
    await renderGerenciarOTDR();
  } catch(e) {
    console.error('[confirmarAssinadoOTDRIndividual]', e);
    toast('Erro ao confirmar assinatura.', 'error');
  }
};

// ── Criar desconto pendente (ao configurar) ───────────────────────────────────
// termoAssinado: false — criado na hora; validado quando assinar

async function _criarDescontoOTDRPendente(uid, inicioMes) {
  // Guarda: uid deve ser uma chave Firebase válida (não vazio, não 'undefined')
  if (!uid || uid === 'undefined') {
    console.error('[_criarDescontoOTDRPendente] uid inválido:', uid);
    return null;
  }
  // Evita duplicata via OTDR path
  const snapKey = await db.ref(`${OTDR_FB_PATH}/compradores/${uid}/descontoFbKey`).once('value');
  if (snapKey.val()) return snapKey.val();

  // Evita duplicata via cache (desconto criado fora do OTDR module)
  if (typeof descontosCache !== 'undefined' && descontosCache) {
    const ex = Object.entries(descontosCache).find(([, v]) =>
      v.uid === uid && v.origemContrato === 'otdr_730d'
    );
    if (ex) {
      await _dbUpdate(`${OTDR_FB_PATH}/compradores/${uid}`, { descontoFbKey: ex[0] });
      return ex[0];
    }
  }

  const inicio = inicioMes || OTDR_INICIO_DEFAULT;
  const novo = {
    uid,
    motivo: 'Locação OTDR EXFO MAXI 730D',
    valor: OTDR_VALOR_COMPRADOR * OTDR_TOTAL_PARCELAS,  // 15000
    parcelas: OTDR_TOTAL_PARCELAS,
    parcelaInicio: inicio,
    mesAno: inicio,
    termoAssinado: false,
    termoAceitoTec: false,
    termoAssinadoVia: null,
    origemContrato: 'otdr_730d',
    criadoEm: new Date().toISOString()
  };
  const fbKey = await _dbPush('config/descontos', novo);
  await _dbUpdate(`${OTDR_FB_PATH}/compradores/${uid}`, { descontoFbKey: fbKey });
  if (typeof descontosCache !== 'undefined' && descontosCache) {
    descontosCache[fbKey] = { ...novo, fbKey };
  }
  return fbKey;
}

// ── Validar desconto existente (ao confirmar assinatura) ──────────────────────
// termoAssinado: false → true

async function _validarDescontoOTDR(uid) {
  const upd = {
    termoAssinado:    true,
    termoAceitoTec:   true,
    termoAssinadoVia: 'govbr-admin',
    validadoEm:       new Date().toISOString()
  };

  // Pega o fbKey salvo na path do comprador
  const snapKey = await db.ref(`${OTDR_FB_PATH}/compradores/${uid}/descontoFbKey`).once('value');
  let fbKey = snapKey.val();

  if (fbKey) {
    // Valida o desconto pelo link direto
    await _dbUpdate(`config/descontos/${fbKey}`, upd);
    if (typeof descontosCache !== 'undefined' && descontosCache?.[fbKey]) {
      Object.assign(descontosCache[fbKey], upd);
    }
    return fbKey;
  }

  // Link não salvo: busca todos os descontos OTDR deste uid em config/descontos
  // (evita criar duplicata quando o desconto existe mas o link não foi salvo)
  const snapDesc = await db.ref('config/descontos').orderByChild('uid').equalTo(uid).once('value');
  const todos = snapDesc.val() || {};
  const existentes = Object.entries(todos).filter(([, v]) => v.origemContrato === 'otdr_730d');

  if (existentes.length > 0) {
    // Atualiza todos os existentes (inclusive duplicatas) e salva o primeiro como link canônico
    await Promise.all(existentes.map(([k]) => _dbUpdate(`config/descontos/${k}`, upd)));
    fbKey = existentes[0][0];
    await _dbUpdate(`${OTDR_FB_PATH}/compradores/${uid}`, { descontoFbKey: fbKey });
    existentes.forEach(([k, v]) => {
      if (typeof descontosCache !== 'undefined' && descontosCache) {
        descontosCache[k] = { ...v, ...upd, fbKey: k };
      }
    });
    return fbKey;
  }

  // Nenhum desconto encontrado: cria já validado
  let inicioMes = OTDR_INICIO_DEFAULT;
  try {
    const snapI = await db.ref(`${OTDR_FB_PATH}/_config/inicioUid/${uid}`).once('value');
    if (snapI.val()) inicioMes = snapI.val();
  } catch(_) {}
  const novo = {
    uid,
    motivo: 'Locação OTDR EXFO MAXI 730D',
    valor: OTDR_VALOR_COMPRADOR * OTDR_TOTAL_PARCELAS,
    parcelas: OTDR_TOTAL_PARCELAS,
    parcelaInicio: inicioMes,
    mesAno: inicioMes,
    termoAssinado: true,
    termoAceitoTec: true,
    termoAssinadoVia: 'govbr-admin',
    origemContrato: 'otdr_730d',
    criadoEm: new Date().toISOString()
  };
  const newKey = await _dbPush('config/descontos', novo);
  await _dbUpdate(`${OTDR_FB_PATH}/compradores/${uid}`, { descontoFbKey: newKey });
  if (typeof descontosCache !== 'undefined' && descontosCache) {
    descontosCache[newKey] = { ...novo, fbKey: newKey };
  }
  return newKey;
}

// _ativarDescontoOTDR mantido como alias de _validarDescontoOTDR para compatibilidade
const _ativarDescontoOTDR = _validarDescontoOTDR;

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE HTML DO CONTRATO
// ═══════════════════════════════════════════════════════════════════════════════

function _abrirHTMLContratoOTDR(uidAssinante, hash, todosUids, winRef) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato OTDR [${hash}]</title>
<style>
  @page { size: A4; margin: 25mm 20mm 25mm 25mm; }
  body { font-family:'Times New Roman',Times,serif; font-size:11pt; line-height:1.7; color:#111; background:#fff; }
  .page { max-width:170mm; margin:0 auto; }
  h1 { font-size:12.5pt; text-align:center; margin:0 0 2px; text-transform:uppercase; font-weight:bold; }
  .fundamento { font-size:9pt; text-align:center; color:#444; margin:6px 0 16px; font-style:italic; }
  hr { border:none; border-top:1.5px solid #111; margin:14px 0; }
  p { margin:0 0 9px; text-align:justify; }
  .section-title { font-size:11pt; font-weight:bold; text-transform:uppercase;
    margin:16px 0 5px; border-bottom:1px solid #999; padding-bottom:2px; }
  .clause { margin-bottom:8px; text-align:justify; padding-left:2mm; }
  .sig-area { margin-top:30px; }
  .sig-block { margin-bottom:22px; }
  .sig-blank { border-bottom:1.5px solid #111; height:28px; margin-bottom:4px; width:80%; margin-left:auto; margin-right:auto; }
  .sig-name { font-size:10pt; text-align:center; font-weight:600; }
  .sig-label { font-size:9pt; text-align:center; color:#555; }
  .testemunha-area { margin-top:24px; border-top:1px solid #ccc; padding-top:16px; display:flex; gap:40px; }
  .test-block { flex:1; }
  .no-print { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;
    padding:12px 16px; margin-bottom:20px; font-family:sans-serif; font-size:11px; line-height:1.5; }
  .no-print button { background:#1f4e79; color:#fff; border:none; border-radius:6px;
    padding:8px 16px; font-size:11px; font-weight:700; cursor:pointer; margin-right:8px; }
  .no-print button.sec { background:#64748b; }
  ol.inst { margin:6px 0 10px; padding-left:20px; }
  .hash-footer { font-size:8pt; color:#94a3b8; text-align:center;
    margin-top:28px; border-top:1px solid #e2e8f0; padding-top:8px; }
  @media print { .no-print { display:none; } }
</style>
</head>
<body>
<div class="page">

  <div class="no-print">
    <strong>📋 Como proceder com a assinatura:</strong>
    <ol class="inst">
      <li>Clique em <strong>Imprimir / Salvar PDF</strong> e salve o contrato como PDF</li>
      <li>Envie o PDF pelo <strong>WhatsApp</strong> para os 6 locatários assinarem</li>
      <li>Cada locatário acessa <a href="https://assinador.iti.br" target="_blank"><strong>assinador.iti.br</strong></a>,
        assina com conta gov.br (Prata ou Ouro) e passa o PDF assinado para o próximo</li>
      <li>Após todos assinarem, o <strong>Jefferson faz o upload do PDF final</strong> no painel Admin → Contrato OTDR</li>
    </ol>
    <button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    <button class="sec" onclick="window.close()">✕ Fechar</button>
  </div>

  <h1>CONTRATO DE LOCAÇÃO DE EQUIPAMENTO</h1>
  <h1>COM OPÇÃO DE COMPRA</h1>
  <h1>OTDR EXFO MAXI 730D</h1>
  <h1>(EQUIPAMENTO DE TRABALHO — PRESTADORES DE SERVIÇOS)</h1>
  <p class="fundamento">Fundamento legal: Código Civil Brasileiro, arts. 565 a 578 (Locação de Coisas), art. 481 e seguintes (Compra e Venda); Lei nº 14.063/2020 (Assinatura Digital); Medida Provisória nº 2.200-2/2001</p>
  <hr>

  <p>As partes abaixo identificadas celebram o presente <strong>CONTRATO DE LOCAÇÃO DE EQUIPAMENTO COM OPÇÃO DE COMPRA</strong>, regido integralmente pelo Código Civil Brasileiro e demais disposições legais aplicáveis, de um lado:</p>

  <p><strong>LOCADOR:</strong><br>
  <strong>JEFFERSON RODRIGUES DE OLIVEIRA DA SILVA</strong>, brasileiro, casado, portador do R.G. nº 34.053.696-2 e CPF nº 303.156.968-77, sócio-proprietário de <strong>J. A. LOGISTICA &amp; TRANSPORTES</strong> (nome fantasia), pessoa jurídica de direito privado inscrita no CNPJ nº 24.308.642/0001-10, com sede na Rua José Rabello Portella nº 3486, Vila Popular, Várzea Paulista – SP, CEP 13.225-100, neste ato representando a empresa referida, doravante denominado <strong>"LOCADOR"</strong>.</p>

  <p><strong>LOCATÁRIOS (Prestadores de Serviços):</strong></p>
  <p>1. <strong>CAIO ESTEVAM DE OLIVEIRA</strong>, brasileiro, portador do RG nº 53.630.313-7 e CPF nº 426.401.248-11, titular de pessoa jurídica de direito privado inscrita no CNPJ nº 57.253.123/0001-51, com sede em Rua Sebastião Custodio da Rosa, 102, Conjunto Habitacional São José – Campo Limpo Paulista – SP, CEP 13.232-264, doravante denominado <strong>"LOCATÁRIO 1"</strong>;</p>
  <p>2. <strong>EWERTON SANTOS DA ROCHA</strong>, brasileiro, portador do RG nº 42.049.701 e CPF nº 427.869.588-81, titular de pessoa jurídica de direito privado inscrita no CNPJ nº 49.786.259/0001-07, com sede em Rua Turim, 67, Jardim Itália – Várzea Paulista – SP, CEP 13.224-728, doravante denominado <strong>"LOCATÁRIO 2"</strong>;</p>
  <p>3. <strong>JULIANO OLIVEIRA YVONIKA</strong>, brasileiro, portador do RG nº 58.387.830-1 e CPF nº 481.062.198-79, titular de pessoa jurídica de direito privado inscrita no CNPJ nº 53.412.039/0001-82, com sede em Rua Milão, 48, Jardim Itália – Várzea Paulista – SP, CEP 13.224-734, doravante denominado <strong>"LOCATÁRIO 3"</strong>;</p>
  <p>4. <strong>LORAN MENDES DE OLIVEIRA</strong>, brasileiro, portador do RG nº 49.307.868 e CPF nº 417.182.278-50, titular de pessoa jurídica de direito privado inscrita no CNPJ nº 41.069.348/0001-12, com sede em Rua Verona, 252, Jardim Itália – Várzea Paulista – SP, CEP 13.224-725, doravante denominado <strong>"LOCATÁRIO 4"</strong>;</p>
  <p>5. <strong>LUCAS HENRIQUE LEIVA DOS SANTOS</strong>, brasileiro, portador do RG nº 39.555.781-1 e CPF nº 440.472.218-48, titular de pessoa jurídica de direito privado inscrita no CNPJ nº 32.455.299/0001-65, com sede em Av. Manacá, 655 – Residencial Aimoré – Várzea Paulista – SP, CEP 13.225-350, doravante denominado <strong>"LOCATÁRIO 5"</strong>;</p>
  <p>6. <strong>ORLANDO VICENTE DA SILVA JUNIOR</strong>, brasileiro, portador do RG nº 42.704.264 e CPF nº 328.065.918-30, titular de pessoa jurídica de direito privado inscrita no CNPJ nº 61.245.584/0001-50, com sede em Antonio Frederico Ozanan, 2211, Ponte de São João, Jundiaí – SP, CEP 13.218-000, doravante denominado <strong>"LOCATÁRIO 6"</strong>.</p>

  <p>Coletivamente denominados <strong>"LOCATÁRIOS"</strong>.</p>
  <p>Resolvem as partes celebrar o presente Contrato de Locação de Equipamento com Opção de Compra, mediante as cláusulas e condições aqui pactuadas:</p>

  <div class="section-title">CLÁUSULA PRIMEIRA – OBJETO DA LOCAÇÃO</div>
  <div class="clause">1.1. O LOCADOR cede aos LOCATÁRIOS, em regime de locação, os seguintes equipamentos de trabalho: três (3) unidades de <strong>OTDR EXFO MAXI 730D</strong> (doravante "EQUIPAMENTOS").</div>
  <div class="clause">1.2. Os EQUIPAMENTOS são cedidos em perfeito estado de funcionamento, conforme termo de vistoria assinado pelas partes na data de entrega.</div>
  <div class="clause">1.3. Os EQUIPAMENTOS permanecerão de propriedade exclusiva do LOCADOR durante todo o período de locação, sendo transferidos aos LOCATÁRIOS somente após o exercício da opção de compra prevista na Cláusula Quinta.</div>

  <div class="section-title">CLÁUSULA SEGUNDA – REGIME DE USO E RESPONSABILIDADE</div>
  <div class="clause">2.1. Os LOCATÁRIOS utilizarão os EQUIPAMENTOS em regime de uso compartilhado, responsabilizando-se solidariamente pela guarda, conservação e manutenção dos mesmos.</div>
  <div class="clause">2.2. Os LOCATÁRIOS se comprometem a zelar, cuidar e manter os EQUIPAMENTOS em perfeito estado de funcionamento, utilizando-os exclusivamente para os fins a que se destinam.</div>
  <div class="clause">2.3. O uso negligente ou danoso dos EQUIPAMENTOS gera responsabilidade individual do LOCATÁRIO causador, sem prejuízo da responsabilidade solidária perante o LOCADOR.</div>
  <div class="clause">2.4. Em caso de dano por culpa de um ou mais LOCATÁRIOS, os responsáveis deverão arcar com os custos de reparo ou substituição, conforme avaliação técnica.</div>
  <div class="clause">2.5. Os LOCATÁRIOS se obrigam a contratar e manter vigente, durante todo o período de locação, seguro contra danos, furto, roubo e sinistros dos EQUIPAMENTOS, cujo prêmio será rateado igualmente entre os LOCATÁRIOS. A apólice deverá indicar o LOCADOR como beneficiário.</div>

  <div class="section-title">CLÁUSULA TERCEIRA – VALOR DO ALUGUEL E FORMA DE PAGAMENTO</div>
  <div class="clause">3.1. O valor mensal do aluguel é de R$ 1.500,00 (mil e quinhentos reais), correspondente a R$ 250,00 (duzentos e cinquenta reais) por LOCATÁRIO.</div>
  <div class="clause">3.2. O aluguel será pago em 59 (cinquenta e nove) parcelas mensais e consecutivas, com vencimento no dia 15 de cada mês, iniciando-se em 15 de fevereiro de 2026.</div>
  <div class="clause">3.3. Cada LOCATÁRIO, a cada mês e somente para aquele mês, poderá optar livremente por uma das duas modalidades de pagamento: <strong>(A) DESCONTO EM HONORÁRIOS</strong> — O valor será deduzido diretamente do honorário de prestação de serviços do mês, mediante autorização expressa e voluntária do LOCATÁRIO naquele mês; ou <strong>(B) PAGAMENTO DIRETO</strong> — O LOCATÁRIO realiza transferência bancária (PIX/TED) ao LOCADOR. Em nenhuma hipótese há desconto automático.</div>
  <div class="clause">3.4. Cada mês, o LOCATÁRIO comunica sua escolha (A ou B) até o último dia útil do mês anterior. Ausência de comunicação implica que o aluguel permanece em aberto, devendo ser regularizado em até 15 (quinze) dias do mês subsequente. Ultrapassado este prazo sem regularização, incidirão os encargos previstos no item 3.6.</div>
  <div class="clause">3.5. O não pagamento de 3 (três) aluguéis consecutivos ou 5 (cinco) aluguéis alternados, após notificação formal com prazo de 15 (quinze) dias para regularização, autoriza o LOCADOR a rescindir este contrato, observado o procedimento da Cláusula Sétima.</div>
  <div class="clause">3.6. Em caso de atraso no pagamento do aluguel, incidirá multa moratória de 2% (dois por cento) sobre o valor devido e juros de 1% (um por cento) ao mês, calculados proporcionalmente ao período em atraso.</div>
  <div class="clause">3.7. O valor do aluguel mensal permanecerá fixo durante toda a vigência do contrato, salvo em caso de inadimplência. Havendo atraso superior a 30 (trinta) dias em qualquer parcela, o valor do aluguel será reajustado pelo Índice Nacional de Preços ao Consumidor Amplo (IPCA) acumulado desde o início do contrato, passando a vigorar o valor corrigido a partir do mês subsequente à regularização.</div>

  <div class="section-title">CLÁUSULA QUARTA – VIGÊNCIA DA LOCAÇÃO</div>
  <div class="clause">4.1. O presente contrato de locação terá vigência de 59 (cinquenta e nove) meses, iniciando-se em 15 de fevereiro de 2026 e findando em 15 de janeiro de 2031.</div>
  <div class="clause">4.2. Ao término do período de locação, os LOCATÁRIOS poderão exercer a opção de compra prevista na Cláusula Quinta ou devolver os EQUIPAMENTOS ao LOCADOR.</div>

  <div class="section-title">CLÁUSULA QUINTA – OPÇÃO DE COMPRA</div>
  <div class="clause">5.1. Ao término do período de 59 (cinquenta e nove) meses de locação, havendo cumprimento integral de todas as obrigações contratuais, os LOCATÁRIOS adquirirão automaticamente os EQUIPAMENTOS mediante o pagamento da parcela final (60ª parcela) no valor de R$ 1.500,00 (mil e quinhentos reais), correspondente a R$ 250,00 (duzentos e cinquenta reais) por LOCATÁRIO.</div>
  <div class="clause">5.2. O pagamento integral e pontual de todas as 59 (cinquenta e nove) parcelas de aluguel presume o exercício automático da opção de compra, dispensando comunicação formal por parte dos LOCATÁRIOS.</div>
  <div class="clause">5.3. Efetuado o pagamento da 60ª parcela, a propriedade dos EQUIPAMENTOS será transferida aos LOCATÁRIOS em regime de condomínio pro-indiviso, conforme previsto no artigo 1.314 e seguintes do Código Civil Brasileiro.</div>
  <div class="clause">5.4. A transferência de propriedade será formalizada por meio de termo de transferência, às custas do LOCADOR, contendo a especificação dos EQUIPAMENTOS e do regime condominial.</div>
  <div class="clause">5.5. Caso os LOCATÁRIOS não efetuem o pagamento da 60ª parcela no prazo de 30 (trinta) dias após o vencimento, os EQUIPAMENTOS deverão ser devolvidos ao LOCADOR em perfeito estado de conservação, descontado o desgaste natural de uso.</div>

  <div class="section-title">CLÁUSULA SEXTA – MANUTENÇÃO DOS EQUIPAMENTOS</div>
  <div class="clause">6.1. O LOCADOR declara que os EQUIPAMENTOS se encontram em perfeito estado de funcionamento na data de celebração deste contrato.</div>
  <div class="clause">6.2. Caso os EQUIPAMENTOS apresentem defeitos de funcionamento nos primeiros 30 (trinta) dias de vigência do contrato, decorrentes de vícios ocultos ou defeitos de fabricação, o LOCADOR se obriga a realizar manutenção corretiva dentro de 30 (trinta) dias, arcando integralmente com os custos de mão de obra e peças.</div>
  <div class="clause">6.3. Após o período de 30 (trinta) dias, os custos de manutenção corretiva e preventiva serão de responsabilidade exclusiva dos LOCATÁRIOS, que deverão ratear tais despesas de forma igualitária.</div>
  <div class="clause">6.4. A garantia prevista no item 6.2 não cobre: (i) defeitos decorrentes de mau uso, negligência ou imperícia; (ii) danos causados por quedas, impactos ou exposição a condições inadequadas; (iii) desgaste natural dos componentes.</div>

  <div class="section-title">CLÁUSULA SÉTIMA – RESCISÃO CONTRATUAL E DEVOLUÇÃO</div>
  <div class="clause">7.1. Este contrato pode ser rescindido nas seguintes hipóteses: (i) por inadimplemento do LOCATÁRIO conforme Cláusula Terceira, após notificação e decurso do prazo para regularização; (ii) por acordo expresso entre as partes; (iii) por desistência voluntária de qualquer LOCATÁRIO, observado o item 7.2.</div>
  <div class="clause">7.2. Em caso de rescisão por inadimplemento, desistência ou qualquer outra causa atribuível aos LOCATÁRIOS, os valores pagos a título de aluguel não serão restituídos, por corresponderem à contraprestação pelo uso efetivo dos EQUIPAMENTOS durante o período de locação.</div>
  <div class="clause">7.3. As partes reconhecem que os valores pagos como aluguel destinam-se a remunerar o uso dos EQUIPAMENTOS e a cobrir o desgaste natural, manutenção e recondicionamento para disponibilização a novos locatários, não havendo direito a reembolso em qualquer hipótese de rescisão por parte dos LOCATÁRIOS.</div>
  <div class="clause">7.4. Em caso de rescisão, os EQUIPAMENTOS deverão ser devolvidos ao LOCADOR no prazo de 15 (quinze) dias, em estado de conservação compatível com o uso normal, descontado o desgaste natural.</div>
  <div class="clause">7.5. Caso os EQUIPAMENTOS sejam devolvidos com danos além do desgaste natural, os LOCATÁRIOS responsáveis arcarão com os custos de reparo, conforme avaliação técnica.</div>
  <div class="clause">7.6. Em caso de rescisão por culpa exclusiva do LOCADOR ou por inexecução de suas obrigações, os LOCATÁRIOS farão jus ao reembolso dos aluguéis pagos nos últimos 3 (três) meses, sem prejuízo de eventuais perdas e danos.</div>
  <div class="clause">7.7. A rescisão comunicada por qualquer parte será efetiva 30 (trinta) dias após notificação formal e escrita às demais partes, por carta registrada com aviso de recebimento ou meio eletrônico com confirmação de leitura.</div>

  <div class="section-title">CLÁUSULA OITAVA – ENTRADA E SAÍDA DE LOCATÁRIOS</div>
  <div class="clause">8.1. Caso um LOCATÁRIO necessite sair do contrato antes do término, este deverá comunicar formalmente aos demais LOCATÁRIOS e ao LOCADOR com antecedência mínima de 30 (trinta) dias.</div>
  <div class="clause">8.2. O LOCATÁRIO que sai é obrigado a quitar todos os seus aluguéis em atraso. Os valores já pagos não serão restituídos, por corresponderem ao aluguel pelo período de uso.</div>
  <div class="clause">8.3. O LOCATÁRIO retirante poderá ser substituído por novo locatário indicado pelos LOCATÁRIOS remanescentes, sujeito à aprovação do LOCADOR, mediante assinatura de termo aditivo.</div>
  <div class="clause">8.4. O novo LOCATÁRIO assumirá todas as obrigações do LOCATÁRIO anterior, incluindo o pagamento de todos os aluguéis futuros de R$ 250,00 (duzentos e cinquenta reais) mensais.</div>

  <div class="section-title">CLÁUSULA NONA – NATUREZA JURÍDICA E AUSÊNCIA DE VÍNCULO EMPREGATÍCIO</div>
  <div class="clause">9.1. O presente contrato é de natureza exclusivamente civil-comercial, sendo regido pelo Código Civil Brasileiro (Lei nº 10.406, de 2002), particularmente pelos artigos 565 a 578 (locação de coisas) e 481 e seguintes (compra e venda).</div>
  <div class="clause">9.2. As partes declaram expressamente que: (i) Não há relação de emprego, subordinação jurídica, pessoalidade exclusiva ou habitualidade remunerada nos moldes dos arts. 2º e 3º da Consolidação das Leis do Trabalho (CLT); (ii) Os LOCATÁRIOS são pessoas jurídicas autônomas, organizadas sob seu próprio risco econômico e administrativo; (iii) O presente instrumento não poderá ser interpretado, em nenhuma circunstância, como caracterizador de vínculo empregatício ou como indício de fraude à legislação trabalhista.</div>
  <div class="clause">9.3. A opção pelo desconto em honorários (Opção A), quando exercida, decorre de livre manifestação de vontade mensal de cada LOCATÁRIO, não constituindo desconto salarial compulsório, nos termos da Orientação Jurisprudencial 303 do Tribunal Superior do Trabalho.</div>

  <div class="section-title">CLÁUSULA DÉCIMA – ASSINATURA DIGITAL</div>
  <div class="clause">10.1. Este contrato poderá ser assinado eletronicamente por meio de certificado digital qualificado (ICP-Brasil) ou assinatura eletrônica avançada, com validade jurídica equivalente à firma reconhecida em cartório.</div>
  <div class="clause">10.2. As partes consentem expressamente que assinaturas digitais produzidas conforme disposto na Medida Provisória nº 2.200-2/2001 e Lei nº 14.063/2020 têm presunção de autenticidade e integridade.</div>
  <div class="clause">10.3. O documento assinado digitalmente gerará audit trail (trilha de auditoria) que será mantido pelas partes como prova de autenticidade.</div>

  <div class="section-title">CLÁUSULA DÉCIMA PRIMEIRA – DISPOSIÇÕES GERAIS</div>
  <div class="clause">11.1. A tolerância de qualquer das partes quanto ao descumprimento de obrigações contratuais não implica novação, renúncia ou alteração do pactuado.</div>
  <div class="clause">11.2. A nulidade de qualquer cláusula deste contrato não afetará a validade das demais, que permanecerão em pleno vigor.</div>
  <div class="clause">11.3. Eventuais alterações a este contrato somente terão validade se formalizadas por meio de termo aditivo escrito, assinado por todas as partes.</div>
  <div class="clause">11.4. Qualquer dúvida quanto à interpretação deste contrato será resolvida conforme a lei que o rege, não sendo admitidas interpretações restritivas que prejudiquem direitos das partes.</div>

  <div class="section-title">CLÁUSULA DÉCIMA SEGUNDA – FORO</div>
  <div class="clause">12.1. Fica eleito o Foro da Comarca de Várzea Paulista, Estado de São Paulo, como competente para conhecer e dirimir eventual pendência oriunda deste contrato, com expressa renúncia de quaisquer outros foros, por mais privilegiados que sejam.</div>

  <p style="margin-top:24px; text-align:center">Várzea Paulista, 15 de fevereiro de 2026.</p>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-blank"></div>
      <div class="sig-name">JEFFERSON RODRIGUES DE OLIVEIRA DA SILVA</div>
      <div class="sig-label">J. A. LOGISTICA &amp; TRANSPORTES (LOCADOR)</div>
    </div>

    <p style="margin-top:20px"><strong>LOCATÁRIOS:</strong></p>

    <div class="sig-block">
      <div class="sig-blank"></div>
      <div class="sig-name">CAIO ESTEVAM DE OLIVEIRA</div>
      <div class="sig-label">LOCATÁRIO 1</div>
    </div>
    <div class="sig-block">
      <div class="sig-blank"></div>
      <div class="sig-name">EWERTON SANTOS DA ROCHA</div>
      <div class="sig-label">LOCATÁRIO 2</div>
    </div>
    <div class="sig-block">
      <div class="sig-blank"></div>
      <div class="sig-name">JULIANO OLIVEIRA YVONIKA</div>
      <div class="sig-label">LOCATÁRIO 3</div>
    </div>
    <div class="sig-block">
      <div class="sig-blank"></div>
      <div class="sig-name">LORAN MENDES DE OLIVEIRA</div>
      <div class="sig-label">LOCATÁRIO 4</div>
    </div>
    <div class="sig-block">
      <div class="sig-blank"></div>
      <div class="sig-name">LUCAS HENRIQUE LEIVA DOS SANTOS</div>
      <div class="sig-label">LOCATÁRIO 5</div>
    </div>
    <div class="sig-block">
      <div class="sig-blank"></div>
      <div class="sig-name">ORLANDO VICENTE DA SILVA JUNIOR</div>
      <div class="sig-label">LOCATÁRIO 6</div>
    </div>

    <div class="testemunha-area">
      <div class="test-block">
        <div class="sig-blank"></div>
        <div class="sig-name">PRIMEIRA TESTEMUNHA</div>
        <div class="sig-label">CPF: ___________________</div>
      </div>
      <div class="test-block">
        <div class="sig-blank"></div>
        <div class="sig-name">SEGUNDA TESTEMUNHA</div>
        <div class="sig-label">CPF: ___________________</div>
      </div>
    </div>
  </div>

  <div class="hash-footer">Ref: ${hash} — Gerado via SDR App</div>

</div>
</body>
</html>`;

  const win = winRef || window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    toast('Permita pop-ups neste site para abrir o contrato.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TÉCNICO — Verificar e exibir contrato OTDR pendente
// ═══════════════════════════════════════════════════════════════════════════════

// Retorna { uid } se o técnico está no contrato OTDR e o contrato ainda não foi finalizado
// NÃO navega — quem chama decide o que fazer (modal ou tela)
async function verificarContratoOTDRPendente() {
  if (!currentUser || currentUser.role === 'master') return null;
  if (_isObservador(currentUser)) return null;
  if (_isFiscal(currentUser)) return null;
  const uid = currentUser.id;
  try {
    // Se contrato único já foi assinado por todos → sem pendência
    const snapUnico = await db.ref(`${OTDR_FB_PATH}/contrato_unico/status`).once('value');
    if (snapUnico.val() === 'assinado') return null;

    // Verifica se este técnico está na lista de compradores
    const snapComp = await db.ref(`${OTDR_FB_PATH}/compradores/${uid}`).once('value');
    if (!snapComp.val()) return null; // não está no contrato OTDR

    return { uid };
  } catch(e) {
    console.error('[verificarContratoOTDRPendente]', e);
    return null; // em caso de erro não bloqueia
  }
}

async function _renderContratoPendenteOTDR(uid) {
  const el = document.getElementById('otdr-pendente-content');
  if (!el) return;
  let todosUids = [];
  try {
    const snap = await db.ref(`${OTDR_FB_PATH}/_config`).once('value');
    todosUids = snap.val()?.uids || [];
  } catch(e) {}

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div style="font-weight:700;font-size:.95rem;color:#1e3a5f">
      <i class="fas fa-file-contract" style="margin-right:7px"></i>Contrato OTDR
    </div>
    <button onclick="window.screen('app');window.showPage('meu-dash')"
      style="background:none;border:1px solid #cbd5e1;border-radius:7px;
      padding:6px 12px;font-size:.78rem;font-weight:600;cursor:pointer;color:#64748b">
      <i class="fas fa-times"></i> Fechar
    </button>
  </div>

  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;
    padding:14px 16px;margin-bottom:14px;font-size:.82rem;color:#78350f;line-height:1.6">
    <div style="font-weight:700;margin-bottom:4px">
      <i class="fas fa-info-circle" style="margin-right:5px"></i>Contrato OTDR EXFO MAXI 730D — Assinatura Pendente
    </div>
    O contrato está sendo coletado para assinatura digital de todos os 6 compradores.<br>
    <strong>O Jefferson enviará o documento para você assinar via WhatsApp.</strong><br>
    Após receber, acesse <a href="https://assinador.iti.br" target="_blank"
      style="color:#92400e;font-weight:700">assinador.iti.br</a>,
    assine com sua conta gov.br (<strong>Prata ou Ouro</strong>) e devolva o PDF para o Jefferson.
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;
    padding:14px 16px;margin-bottom:14px">
    <div style="font-weight:700;font-size:.86rem;color:#14532d;margin-bottom:6px">
      <i class="fas fa-info-circle" style="margin-right:5px"></i>Sobre o contrato
    </div>
    <div style="font-size:.82rem;color:#166534;line-height:1.6">
      • 3× OTDR EXFO MAXI 730D — uso compartilhado entre os 6 compradores<br>
      • Desconto de <strong>R$ 250,00/mês</strong> nos honorários por 60 meses<br>
      • Total: R$ 15.000,00 — vigência fev/2026 a jan/2031<br>
      • Desconto já em andamento desde fev/2026
    </div>
  </div>

  <button onclick="_abrirHTMLContratoOTDR(null,'OTDR-PREVIEW',${JSON.stringify(todosUids)})"
    style="background:#1f4e79;color:#fff;border:none;border-radius:8px;
    padding:10px 18px;font-size:.84rem;font-weight:700;cursor:pointer;
    display:inline-flex;align-items:center;gap:7px">
    <i class="fas fa-eye"></i> Ver o Contrato
  </button>`;
}

// (upload pelo técnico removido — o admin faz um único upload com todas as assinaturas)

// ── Validação de identidade do contrato OTDR ─────────────────────────────────
// Verifica apenas que o PDF é o Contrato OTDR — sem tentar descomprimir streams.
// PDFs gerados pelo Chrome têm o título da página nos metadados não comprimidos,
// então "otdr" aparece naturalmente nos primeiros bytes. A assinatura ICP-Brasil
// (verificada por _parsePDFSignature) garante a autenticidade do documento.

function _validarConteudoOTDR(buffer) {
  const bytes = new Uint8Array(buffer);
  const dec   = new TextDecoder('latin1');
  // Lê cabeçalho + rodapé onde ficam metadados não comprimidos (título, XMP, etc.)
  const head  = dec.decode(bytes.slice(0, Math.min(bytes.length, 65536)));
  const tail  = dec.decode(bytes.slice(Math.max(0, bytes.length - 131072)));
  const txt   = (head + tail).toLowerCase();

  // Verifica apenas o identificador mínimo: "otdr" nos metadados do PDF
  // (o título "Contrato OTDR [HASH]" sempre aparece no metadata não comprimido)
  const valido = txt.includes('otdr');
  return { valido, score: valido ? 1 : 0 };
}

// ── Documentos autenticados: inclui OTDR nos filtros ─────────────────────────

// Retorna UMA entrada para a aba Documentos — o contrato único com todas as assinaturas
async function _carregarDocsOTDR() {
  const snapUnico = await db.ref(`${OTDR_FB_PATH}/contrato_unico`).once('value');
  const cu = snapUnico.val();
  if (!cu || cu.status !== 'assinado') return [];

  const snapCfg = await db.ref(`${OTDR_FB_PATH}/_config`).once('value');
  const uids    = snapCfg.val()?.uids || [];
  const nomes   = uids.map(u => usersCache?.[u]?.name || u).join(', ');

  return [{
    tipo:        'Contrato OTDR',
    tipoIcon:    'fa-camera',
    tipoColor:   '#0e7490',
    uid:         '_otdr_unico',
    userName:    `6 Compradores: ${nomes}`,
    assinadoEm:  cu.uploadEm    || '',
    nomeArquivo: cu.nomeArquivo || 'contrato_otdr_assinado.pdf',
    pdfBase64:   cu.pdfBase64   || null,
    validacao:   cu.validacao   || {},
    fbPath:      `${OTDR_FB_PATH}/contrato_unico`
  }];
}

// ── Expose globals ────────────────────────────────────────────────────────────

window.renderGerenciarOTDR            = renderGerenciarOTDR;
window._abrirHTMLContratoOTDR         = _abrirHTMLContratoOTDR;
window.verificarContratoOTDRPendente  = verificarContratoOTDRPendente;
window._renderContratoPendenteOTDR    = _renderContratoPendenteOTDR;
window._carregarDocsOTDR              = _carregarDocsOTDR;
