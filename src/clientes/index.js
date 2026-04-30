/**
 * SDR — Módulo de Clientes
 * Fase 10: migrado de sdr-module.js linhas 1628-2088
 *
 * Expõe via window:
 *   window.sdrImportClientes(input)
 *   window.sdrImportExecute()
 *   window.sdrOpenClientePanel(id, c)
 *   window._buildClientePanel(id, c)
 *   window.sdrAutoLinkCTO()
 *   window._mapColumn(header)
 *   window._normalizeFinStatus(val)
 *
 * Deps runtime (via window):
 *   window.sdrRef           — Firebase ref
 *   window.sdrInfraCache    — cache de infra
 *   window.sdrClientesCache — cache de clientes
 *   window.sdrClientesRender — re-render lista
 *   window._sdrCtoOcupacao  — ocupação CTO (src/cto/index.js)
 *   window._sdrCtosDoPoste  — CTOs de um poste (src/cto/index.js)
 *   XLSX                    — SheetJS global
 *   toast()                 — global
 */

// ── Mapeamento flexível de colunas CSV/Excel ─────────────────────
const IMPORT_COL_MAP = {
  name:             ['nome','name','cliente','razao_social','razão social','nome_completo','nome completo'],
  cpf_cnpj:         ['cpf','cnpj','cpf_cnpj','cpf/cnpj','documento','doc'],
  phone:            ['telefone','phone','celular','fone','tel','whatsapp'],
  email:            ['email','e-mail','e_mail'],
  address:          ['endereco','endereço','address','logradouro','rua','end'],
  plan_name:        ['plano','plan','plan_name','nome_plano'],
  plan_speed_down:  ['velocidade','speed','download','mbps','velocidade_download'],
  plan_price:       ['valor','price','mensalidade','preco','preço','valor_plano'],
  financial_status: ['status_financeiro','financial_status','financeiro','status_fin','situacao','situação'],
  lat:              ['lat','latitude'],
  lng:              ['lng','lon','longitude','long'],
  onu_serial:       ['onu','serial','serial_onu','onu_serial','serial_number','sn'],
  cto_port:         ['porta','port','porta_cto','cto_port'],
  notes:            ['obs','observacao','observação','notes','nota','observacoes']
};

function _mapColumn(header) {
  const h = header.toLowerCase().trim().replace(/[^a-záàãâéêíóôõúç0-9_\s]/gi,'').replace(/\s+/g,'_');
  for (const [field, aliases] of Object.entries(IMPORT_COL_MAP)) {
    if (aliases.includes(h)) return field;
  }
  return null;
}

function _normalizeFinStatus(val) {
  if (!val) return 'adimplente';
  const v = val.toLowerCase().trim();
  if (v.includes('inadim') || v.includes('atraso') || v === 'bloqueado' || v === 'suspenso') return 'inadimplente';
  return 'adimplente';
}

// ── Importação CSV/Excel ─────────────────────────────────────────
window.sdrImportClientes = async function(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = ''; // reset para permitir reimportar mesmo arquivo

  if (typeof XLSX === 'undefined') {
    toast('Biblioteca SheetJS não carregou. Recarregue a página.', 'error');
    return;
  }

  toast('Lendo arquivo...', 'info');

  try {
    const data = await file.arrayBuffer();
    const wb   = XLSX.read(data, { type: 'array', codepage: 65001 });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) { toast('Arquivo vazio ou sem dados', 'error'); return; }

    // Mapear colunas
    const headers = Object.keys(rows[0]);
    const colMap  = {};
    headers.forEach(h => { const f = _mapColumn(h); if (f) colMap[h] = f; });

    if (!Object.values(colMap).includes('name')) {
      const nameCol = headers.find(h => h.toLowerCase().includes('nom'));
      if (nameCol) colMap[nameCol] = 'name';
      else { toast('Não encontrei coluna de "Nome" no arquivo. Verifique os cabeçalhos.', 'error'); return; }
    }

    const mappedFields = Object.values(colMap);
    const unmapped     = headers.filter(h => !colMap[h]);

    const previewHtml = `<div class="modal-overlay" id="sdr-import-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal-box" style="max-width:700px;max-height:85vh;overflow-y:auto">
        <div class="modal-header">
          <h3><i class="fas fa-file-import" style="color:var(--primary);margin-right:8px"></i>Importar ${rows.length} Clientes</h3>
          <button onclick="document.getElementById('sdr-import-modal').remove()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom:12px;font-size:.85rem"><b>Arquivo:</b> ${file.name} &mdash; <b>${rows.length}</b> linhas encontradas</p>
          <div style="margin-bottom:14px">
            <p style="font-size:.82rem;font-weight:600;margin-bottom:6px"><i class="fas fa-check-circle" style="color:#16a34a;margin-right:4px"></i>Colunas mapeadas (${mappedFields.length}):</p>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${mappedFields.map(f => `<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:12px;font-size:.75rem">${f}</span>`).join('')}
            </div>
          </div>
          ${unmapped.length ? `<div style="margin-bottom:14px">
            <p style="font-size:.82rem;font-weight:600;margin-bottom:6px"><i class="fas fa-exclamation-circle" style="color:#d97706;margin-right:4px"></i>Colunas ignoradas (${unmapped.length}):</p>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${unmapped.map(h => `<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:12px;font-size:.75rem">${h}</span>`).join('')}
            </div>
          </div>` : ''}
          <p style="font-size:.82rem;margin-bottom:8px"><b>Preview (primeiros 5):</b></p>
          <div style="overflow-x:auto;font-size:.78rem">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#f8fafc">${['Nome','CPF/CNPJ','Plano','Financeiro'].map(h=>`<th style="padding:6px 8px;text-align:left;border-bottom:1px solid #e2e8f0">${h}</th>`).join('')}</tr></thead>
              <tbody>${rows.slice(0,5).map(row => {
                const m = {};
                for (const [col, field] of Object.entries(colMap)) { m[field] = row[col]; }
                return `<tr>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${m.name||'-'}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${m.cpf_cnpj||'-'}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${m.plan_name||'-'} ${m.plan_speed_down?m.plan_speed_down+'M':''}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9">${_normalizeFinStatus(String(m.financial_status||''))}</td>
                </tr>`;
              }).join('')}</tbody>
            </table>
          </div>
          <div style="margin-top:14px">
            <label style="font-size:.82rem;display:flex;align-items:center;gap:6px">
              <input type="checkbox" id="sdr-import-skip-dup" checked>
              Pular clientes com CPF/CNPJ já cadastrado
            </label>
          </div>
          <div style="margin-top:8px">
            <label style="font-size:.82rem;display:flex;align-items:center;gap:6px">
              <input type="checkbox" id="sdr-import-link-cto">
              Vincular a CTO por proximidade GPS (se lat/lng disponíveis)
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="document.getElementById('sdr-import-modal').remove()">Cancelar</button>
          <button class="btn-primary" id="sdr-import-btn" onclick="window.sdrImportExecute()">
            <i class="fas fa-upload" style="margin-right:4px"></i>Importar ${rows.length} Clientes
          </button>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', previewHtml);
    document.getElementById('sdr-import-modal').classList.add('open');
    window._sdrImportData = { rows, colMap, fileName: file.name };

  } catch(e) {
    toast('Erro ao ler arquivo: ' + e.message, 'error');
    console.error('[SDR Import]', e);
  }
};

window.sdrImportExecute = async function() {
  const { rows, colMap } = window._sdrImportData || {};
  if (!rows || !rows.length) { toast('Sem dados para importar', 'error'); return; }

  const btn = document.getElementById('sdr-import-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...'; }

  const skipDup = document.getElementById('sdr-import-skip-dup')?.checked;
  const linkCTO = document.getElementById('sdr-import-link-cto')?.checked;
  const sdrRef  = window.sdrRef;

  // Duplicatas
  let existingCpfs = new Set();
  if (skipDup) {
    const snap     = await sdrRef('clients').once('value');
    const existing = snap.val() || {};
    Object.values(existing).forEach(c => { if (c.cpf_cnpj) existingCpfs.add(c.cpf_cnpj.replace(/\D/g,'')); });
  }

  // CTOs para vincular por GPS
  let ctoList = [];
  if (linkCTO) {
    const infraSnap = await sdrRef('infrastructure').once('value');
    const infra     = infraSnap.val() || {};
    ctoList = Object.entries(infra)
      .filter(([,i]) => (i.type === 'cto' || i.type === 'splitter') && i.lat && i.lng)
      .map(([id, i]) => ({ id, lat: i.lat, lng: i.lng, name: i.name || i.code }));
  }

  let imported = 0, skipped = 0, errors = 0;
  const now     = new Date().toISOString();
  const updates = {};

  for (const row of rows) {
    try {
      const mapped = {};
      for (const [col, field] of Object.entries(colMap)) { mapped[field] = row[col]; }

      if (!mapped.name || !String(mapped.name).trim()) { skipped++; continue; }

      if (skipDup && mapped.cpf_cnpj) {
        const cpfClean = String(mapped.cpf_cnpj).replace(/\D/g,'');
        if (cpfClean && existingCpfs.has(cpfClean)) { skipped++; continue; }
        existingCpfs.add(cpfClean);
      }

      const client = {
        name:             String(mapped.name).trim(),
        cpf_cnpj:         mapped.cpf_cnpj         ? String(mapped.cpf_cnpj).trim()                                 : '',
        phone:            mapped.phone             ? String(mapped.phone).trim()                                    : '',
        email:            mapped.email             ? String(mapped.email).trim()                                    : '',
        address:          mapped.address           ? String(mapped.address).trim()                                  : '',
        plan_name:        mapped.plan_name         ? String(mapped.plan_name).trim()                                : '',
        plan_speed_down:  mapped.plan_speed_down   ? parseInt(mapped.plan_speed_down)   || null                    : null,
        plan_price:       mapped.plan_price        ? parseFloat(String(mapped.plan_price).replace(',','.')) || null : null,
        financial_status: _normalizeFinStatus(String(mapped.financial_status || '')),
        onu_serial:       mapped.onu_serial        ? String(mapped.onu_serial).trim()                               : '',
        cto_port:         mapped.cto_port          ? parseInt(mapped.cto_port)          || null                    : null,
        notes:            mapped.notes             ? String(mapped.notes).trim()                                    : '',
        is_active:        true,
        import_source:    window._sdrImportData.fileName || '',
        created_at:       now,
        updated_at:       now
      };

      const lat = parseFloat(mapped.lat);
      const lng = parseFloat(mapped.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        client.lat = lat;
        client.lng = lng;
        if (linkCTO && ctoList.length) {
          let nearest = null, minDist = Infinity;
          ctoList.forEach(cto => {
            const d = Math.sqrt(Math.pow(cto.lat - lat, 2) + Math.pow(cto.lng - lng, 2));
            if (d < minDist) { minDist = d; nearest = cto; }
          });
          if (nearest && minDist < 0.002) client.cto_id = nearest.id;
        }
      }

      const newKey = sdrRef('clients').push().key;
      updates[`clients/${newKey}`] = client;
      imported++;
    } catch(e) {
      errors++;
      console.warn('[SDR Import] Erro na linha:', e);
    }
  }

  if (Object.keys(updates).length) {
    try {
      await sdrRef('').update(updates);
    } catch(e) {
      toast('Erro ao salvar: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Tentar novamente'; }
      return;
    }
  }

  document.getElementById('sdr-import-modal')?.remove();
  toast(`Importação concluída! ${imported} importados, ${skipped} pulados, ${errors} erros`, imported > 0 ? 'success' : 'error');
  window._sdrImportData = null;
  if (typeof window.sdrClientesRender === 'function') window.sdrClientesRender();
};

// ── Painel do cliente ────────────────────────────────────────────
window.sdrOpenClientePanel = function(id, c) {
  const infraCache = window.sdrInfraCache || {};
  if (Object.keys(infraCache).length === 0) {
    window.sdrRef('infrastructure').once('value').then(snap => {
      window.sdrInfraCache = snap.val() || {};
      _buildClientePanel(id, c);
    });
  } else {
    _buildClientePanel(id, c);
  }
};

function _buildClientePanel(id, c) {
  document.getElementById('sp-title').textContent = c.name || 'Cliente';
  const sdrInfraCache = window.sdrInfraCache || {};
  let html = '';

  // Bloco 1: Dados do Cliente
  html += `<div class="sp-section">
    <div class="sp-section-title"><i class="fas fa-user" style="color:#2563eb"></i> Dados do Cliente</div>
    <div class="sp-row"><span class="sp-label">Nome</span><span class="sp-val">${c.name||'-'}</span></div>`;
  if (c.cpf_cnpj) html += `<div class="sp-row"><span class="sp-label">CPF/CNPJ</span><span class="sp-val">${c.cpf_cnpj}</span></div>`;
  if (c.phone)    html += `<div class="sp-row"><span class="sp-label">Telefone</span><span class="sp-val">${c.phone}</span></div>`;
  if (c.email)    html += `<div class="sp-row"><span class="sp-label">Email</span><span class="sp-val">${c.email}</span></div>`;
  if (c.address)  html += `<div class="sp-row"><span class="sp-label">Endereço</span><span class="sp-val">${c.address}</span></div>`;
  if (c.plan_name) html += `<div class="sp-row"><span class="sp-label">Plano</span><span class="sp-val">${c.plan_name} ${c.plan_speed_down?'('+c.plan_speed_down+'M)':''}</span></div>`;
  if (c.plan_price) html += `<div class="sp-row"><span class="sp-label">Valor</span><span class="sp-val">R$ ${parseFloat(c.plan_price).toFixed(2)}</span></div>`;
  const fStatus = c.financial_status || 'adimplente';
  const fColor  = fStatus === 'adimplente' ? '#16a34a' : '#dc2626';
  html += `<div class="sp-row"><span class="sp-label">Financeiro</span><span class="sp-val" style="color:${fColor};font-weight:600">${fStatus.toUpperCase()}</span></div>`;
  if (c.import_source) html += `<div class="sp-row"><span class="sp-label">Importado de</span><span class="sp-val" style="font-size:.75rem;color:var(--muted)">${c.import_source}</span></div>`;
  html += `</div>`;

  // Bloco 2: ONU
  if (c.onu_serial || c.onu_id) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-wifi" style="color:#d97706"></i> ONU</div>`;
    if (c.onu_serial) html += `<div class="sp-row"><span class="sp-label">Serial</span><span class="sp-val" style="font-family:monospace">${c.onu_serial}</span></div>`;
    if (c.onu_status) {
      const badge = c.onu_status==='online'?'good':c.onu_status==='degraded'?'warn':c.onu_status==='offline'?'bad':'off';
      html += `<div class="sp-row"><span class="sp-label">Status</span><span class="signal-badge ${badge}">${c.onu_status.toUpperCase()}</span></div>`;
    }
    if (c.rx_power != null) {
      const rxBadge = c.rx_power > -25 ? 'good' : c.rx_power > -28 ? 'warn' : 'bad';
      html += `<div class="sp-row"><span class="sp-label">Sinal Rx</span><span class="signal-badge ${rxBadge}">${c.rx_power} dBm</span></div>`;
    }
    if (c.tx_power != null) html += `<div class="sp-row"><span class="sp-label">Sinal Tx</span><span class="sp-val">${c.tx_power} dBm</span></div>`;
    html += `</div>`;
  }

  // Bloco 3: Infraestrutura
  const hasCTO  = c.cto_id  && sdrInfraCache[c.cto_id];
  const hasPole = c.pole_id && sdrInfraCache[c.pole_id];

  if (hasCTO || hasPole) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-network-wired" style="color:#16a34a"></i> Infraestrutura Vinculada</div>`;

    if (hasCTO) {
      const cto      = sdrInfraCache[c.cto_id];
      const ocupacao = (typeof window._sdrCtoOcupacao === 'function') ? window._sdrCtoOcupacao(c.cto_id) : [];
      const totalPorts = cto.total_ports || 8;
      const usedPorts  = ocupacao.length;
      const pctUso     = Math.round((usedPorts / totalPorts) * 100);
      const barColor   = pctUso > 80 ? '#dc2626' : pctUso > 60 ? '#d97706' : '#16a34a';

      html += `<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:600;font-size:.85rem"><i class="fas fa-box" style="color:#2563eb;margin-right:4px"></i>${cto.name||cto.code||'CTO'}</span>
          <span style="font-size:.75rem;color:var(--muted)">${cto.type==='splitter'?'Splitter':'CTO'}</span>
        </div>`;
      if (c.cto_port) html += `<div class="sp-row" style="margin-bottom:4px"><span class="sp-label">Porta</span><span class="sp-val" style="font-weight:600">${c.cto_port}</span></div>`;
      html += `<div class="sp-row" style="margin-bottom:4px"><span class="sp-label">Ocupação</span><span class="sp-val">${usedPorts}/${totalPorts} portas (${pctUso}%)</span></div>
        <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:4px">
          <div style="height:100%;width:${pctUso}%;background:${barColor};border-radius:3px;transition:width .3s"></div>
        </div>`;
      if (ocupacao.length > 1) {
        const outros = ocupacao.filter(oc => oc.name !== c.name).slice(0, 5);
        if (outros.length) {
          html += `<div style="margin-top:8px;font-size:.75rem;color:var(--muted)">
            <span style="font-weight:600">Outros clientes:</span> ${outros.map(oc => oc.name).join(', ')}${ocupacao.length > 6 ? ` (+${ocupacao.length - 6})` : ''}
          </div>`;
        }
      }
      if (cto.lat && cto.lng) {
        html += `<button class="btn-map" onclick="sdrMapFlyTo(${cto.lat},${cto.lng})" style="margin-top:6px;padding:4px 10px;font-size:.75rem"><i class="fas fa-map-pin"></i> Ver CTO no mapa</button>`;
      }
      html += `</div>`;
    }

    if (hasPole) {
      const pole = sdrInfraCache[c.pole_id];
      html += `<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;font-size:.85rem"><i class="fas fa-bolt" style="color:#d97706;margin-right:4px"></i>${pole.name||pole.code||'Poste'}</span>
          <span style="font-size:.75rem;color:var(--muted)">Poste</span>
        </div>`;
      if (pole.concessionaria) html += `<div class="sp-row"><span class="sp-label">Concessionária</span><span class="sp-val">${pole.concessionaria}</span></div>`;
      if (pole.lat && pole.lng) {
        html += `<button class="btn-map" onclick="sdrMapFlyTo(${pole.lat},${pole.lng})" style="margin-top:6px;padding:4px 10px;font-size:.75rem"><i class="fas fa-map-pin"></i> Ver poste no mapa</button>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

  } else {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-network-wired" style="color:#94a3b8"></i> Infraestrutura</div>
      <p style="color:var(--muted);font-size:.82rem;text-align:center;padding:12px 0">Nenhuma infraestrutura vinculada<br>
      <span style="font-size:.75rem">Edite o cliente para vincular CTO e Poste</span></p>
    </div>`;
  }

  // Coordenadas
  if (c.lat && c.lng) {
    html += `<div class="sp-section">
      <div class="sp-section-title"><i class="fas fa-map-marker-alt" style="color:#7c3aed"></i> Localização</div>
      <div class="sp-row"><span class="sp-label">Coordenadas</span><span class="sp-val" style="font-family:monospace;font-size:.78rem">${parseFloat(c.lat).toFixed(6)}, ${parseFloat(c.lng).toFixed(6)}</span></div>
    </div>`;
  }

  // Botões
  html += `<div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn-primary" onclick="sdrClienteEdit('${id}')" style="flex:1;padding:8px"><i class="fas fa-edit"></i> Editar</button>
    ${c.lat && c.lng ? `<button class="btn-map" onclick="sdrMapFlyTo(${c.lat},${c.lng})" style="padding:8px 16px"><i class="fas fa-map-pin"></i> Mapa</button>` : ''}
  </div>`;

  document.getElementById('sp-body').innerHTML = html;
  document.getElementById('sdr-side-panel').classList.add('open');
}

// ── Auto-link CTO por proximidade GPS ───────────────────────────
window.sdrAutoLinkCTO = async function() {
  toast('Buscando clientes sem CTO vinculada...', 'info');
  const sdrRef = window.sdrRef;

  const [clientSnap, infraSnap] = await Promise.all([
    sdrRef('clients').once('value'),
    sdrRef('infrastructure').once('value')
  ]);

  const clients = clientSnap.val() || {};
  const infra   = infraSnap.val()   || {};

  const ctoList = Object.entries(infra)
    .filter(([,i]) => (i.type === 'cto' || i.type === 'splitter') && i.lat && i.lng)
    .map(([id, i]) => ({ id, lat: i.lat, lng: i.lng }));

  if (!ctoList.length) { toast('Nenhuma CTO cadastrada com GPS', 'error'); return; }

  const updates = {};
  let linked = 0;

  Object.entries(clients).forEach(([cid, c]) => {
    if (c.cto_id || !c.lat || !c.lng) return;
    let nearest = null, minDist = Infinity;
    ctoList.forEach(cto => {
      const d = Math.sqrt(Math.pow(cto.lat - c.lat, 2) + Math.pow(cto.lng - c.lng, 2));
      if (d < minDist) { minDist = d; nearest = cto; }
    });
    if (nearest && minDist < 0.002) {
      updates[`clients/${cid}/cto_id`]      = nearest.id;
      updates[`clients/${cid}/updated_at`]  = new Date().toISOString();
      linked++;
    }
  });

  if (Object.keys(updates).length) {
    await sdrRef('').update(updates);
    toast(`${linked} clientes vinculados à CTO mais próxima!`, 'success');
    if (typeof window.sdrClientesRender === 'function') window.sdrClientesRender();
  } else {
    toast('Nenhum cliente para vincular (todos já têm CTO ou sem GPS)', 'info');
  }
};

// ── Expor helpers para compatibilidade (MK patch usa window._buildClientePanel) ─
window._buildClientePanel   = _buildClientePanel;
window._mapColumn           = _mapColumn;
window._normalizeFinStatus  = _normalizeFinStatus;

console.log('[SDR Bundle] clientes/index.js carregado — sdrImportClientes + sdrOpenClientePanel + sdrAutoLinkCTO OK');
