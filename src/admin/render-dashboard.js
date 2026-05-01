'use strict';

window.mudarMesDash = function (delta) {
  const hoje = new Date();
  let base;
  if (_dashMes) {
    // Usa construtor com números (hora local) para evitar UTC shift no fuso de Brasília (UTC-3)
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

window.renderDashboard = function () {
  const rec=allRecords;

  // ── Mês selecionado ──
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

  // Atualiza label e botão avançar
  const labelEl = document.getElementById('dash-mes-label');
  if (labelEl) labelEl.textContent = mesLabel;
  const btnNext = document.getElementById('btn-dash-next');
  if (btnNext) {
    const atualMes = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
    btnNext.disabled = prefM >= atualMes;
    btnNext.style.opacity = prefM >= atualMes ? '0.4' : '1';
  }

  // ── Cards stats do mês ──
  // Normaliza prefM: garante formato YYYY-MM sem componente de horário
  const recMes = rec.filter(r => {
    const d = (r.data || '').toString().trim();
    return d.startsWith(prefM);
  });

  // Banner "sem dados" — aparece logo abaixo da navegação quando o mês está vazio
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

  // ── Breakdown V1 / V2 / V3 por mês ──
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

  // ── Investimento por Profile (Filial / Matriz) ──
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

  // Total rendimentos = soma(V3-V2) de todos os registros do mês
  // Jefferson: sem V2 → rendimento = V3 integral (sem custo intermediário)
  // Demais: usa totalV3-totalV2 armazenados (correto para todas as eras)
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

  // ── Detalhamento por técnico × profile × tipo ──
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

window.gerarCodigoOS = async function () {
  const icon=document.getElementById('icon-os');
  if(icon)icon.classList.add('fa-spinner','fa-spin');
  const ano=new Date().getFullYear();
  const doAno=allRecords.filter(r=>r.data&&r.data.startsWith(String(ano)));
  const seq=String(doAno.length+1).padStart(4,'0');
  const fCodigo=document.getElementById('f-codigo');
  if(fCodigo)fCodigo.value=`OS-${ano}-${seq}`;
  if(icon)setTimeout(()=>icon.classList.remove('fa-spinner','fa-spin'),400);
}

window.decimalToDMS = function (decimal, isLat) {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir = isLat
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  return `${deg}°${String(min).padStart(2,'0')}'${String(sec).padStart(4,'0')}"${dir}`;
}

window.capturarGPS = async function () {
  const btn    = document.getElementById('btn-gps');
  const status = document.getElementById('gps-status');

  // ── Diagnóstico preventivo ──────────────────────────────────────────────
  // 1) Contexto não seguro (arquivo aberto via file://)
  if (!window.isSecureContext) {
    status.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#d97706"></i>
      <b>GPS bloqueado pelo navegador.</b><br>
      <span style="font-size:.8rem;line-height:1.5">
        O arquivo está sendo aberto diretamente (<code>file://</code>), o que bloqueia
        a geolocalização por segurança.<br>
        <b>Solução:</b> Publique o app no Firebase Hosting ou acesse via
        <code>http://localhost</code> com um servidor local.
      </span>`;
    return;
  }
  // 2) API ausente
  if (!navigator.geolocation) {
    status.innerHTML = `<i class="fas fa-times-circle" style="color:var(--danger)"></i>
      <b>Geolocalização não suportada</b> neste navegador.`;
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refinando GPS...';
  status.innerHTML = '<i class="fas fa-satellite-dish" style="color:var(--primary)"></i> Aguardando sinal GPS...';

  const ACURACIA_ALVO = 5;   // metros — aceita quando atingir ≤5m
  const TIMEOUT_MAX   = 15000; // 15s — desiste e usa o melhor disponível
  let melhorPos = null;
  let watchId   = null;
  let timerMax  = null;

  const _finalizarGPS = async (pos) => {
    clearTimeout(timerMax);
    navigator.geolocation.clearWatch(watchId);

    const lat = pos.coords.latitude.toFixed(7);
    const lon = pos.coords.longitude.toFixed(7);
    const acc = Math.round(pos.coords.accuracy);

    document.getElementById('f-lat').value = lat;
    document.getElementById('f-lon').value = lon;
    const dms = `${decimalToDMS(parseFloat(lat), true)}  ${decimalToDMS(parseFloat(lon), false)}`;
    document.getElementById('f-gps-dms').value = dms;
    status.innerHTML = `<i class="fas fa-check-circle" style="color:var(--success)"></i> Posição capturada ±${acc}m. Buscando endereço...`;

    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=pt-BR&addressdetails=1`, {headers:{'Accept-Language':'pt-BR'}});
      const data = await res.json();
      const addr = data.address || {};
      const rua    = addr.road || addr.pedestrian || addr.footway || '';
      const num    = addr.house_number || '';
      const bairro = addr.suburb || addr.neighbourhood || '';
      let ref = rua; if (num) ref += ', ' + num; if (bairro) ref += ' — ' + bairro;
      if (ref) document.getElementById('f-referencia').value = ref;
      const cidadeGPS = (addr.city || addr.town || addr.village || addr.municipality || '').toUpperCase().trim();
      if (cidadeGPS) {
        const sel = document.getElementById('f-cidade');
        const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
        const cidadeNorm = norm(cidadeGPS);
        let found = false;
        for (const opt of sel.options) {
          if (opt.value && opt.value !== '_outro' && norm(opt.value) === cidadeNorm) { sel.value = opt.value; found = true; break; }
        }
        if (!found) {
          for (const opt of sel.options) {
            if (opt.value && opt.value !== '_outro') {
              const ov = norm(opt.value);
              if (cidadeNorm.includes(ov) || ov.includes(cidadeNorm)) { sel.value = opt.value; found = true; break; }
            }
          }
        }
        if (!found) {
          sel.value = '_outro';
          document.getElementById('grp-cidade-custom').style.display = 'block';
          document.getElementById('f-cidade-custom').value = cidadeGPS;
        } else {
          document.getElementById('grp-cidade-custom').style.display = 'none';
        }

        // ── Validação de compatibilidade Profile × Cidade ───────────────
        const profileSel   = document.getElementById('f-profile');
        const profileAtual = (profileSel?.value || '').toUpperCase();
        const cidadeSet    = (sel.value && sel.value !== '_outro') ? norm(sel.value) : cidadeNorm;

        // Descobre em quais profiles a cidade detectada está cadastrada
        const profilesDaCidade = Object.entries(profilesCidades)
          .filter(([, cids]) => cids.some(c => norm(c) === cidadeSet || norm(c).includes(cidadeSet) || cidadeSet.includes(norm(c))))
          .map(([p]) => p);

        if (profilesDaCidade.length > 0 && profileAtual && !profilesDaCidade.includes(profileAtual)) {
          // Divergência: cidade pertence a outro(s) profile(s)
          const sugerido = profilesDaCidade.join(' ou ');
          if (profileSel) {
            profileSel.style.border = '2px solid #dc2626';
            profileSel.style.background = '#fff1f1';
            profileSel.title = `Cidade "${cidadeGPS}" pertence ao profile ${sugerido}`;
          }
          status.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:#dc2626"></i>
            <b style="color:#dc2626">Divergência de Profile!</b>
            A cidade <b>${cidadeGPS}</b> está cadastrada em <b>${sugerido}</b>,
            mas o profile selecionado é <b>${profileAtual}</b>.
            <span style="color:#dc2626">(±${acc}m)</span>`;
        } else {
          // Sem divergência — limpa destaque se havia
          if (profileSel) { profileSel.style.border = ''; profileSel.style.background = ''; profileSel.title = ''; }
          status.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--success)"></i> Endereço preenchido! (±${acc}m)`;
        }
      } else {
        status.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--success)"></i> Endereço preenchido! (±${acc}m)`;
      }
    } catch {
      status.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:var(--secondary)"></i> Posição obtida, mas endereço não carregado.`;
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Recapturar GPS';
  };

  // Timeout máximo: usa o melhor sinal obtido até agora
  timerMax = setTimeout(() => {
    navigator.geolocation.clearWatch(watchId);
    if (melhorPos) {
      _finalizarGPS(melhorPos);
    } else {
      status.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:var(--secondary)"></i> Tempo esgotado sem sinal preciso.`;
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Tentar novamente';
    }
  }, TIMEOUT_MAX);

  watchId = navigator.geolocation.watchPosition(pos => {
    const acc = Math.round(pos.coords.accuracy);
    // Guarda o melhor sinal recebido (menor acurácia = mais preciso)
    if (!melhorPos || acc < Math.round(melhorPos.coords.accuracy)) melhorPos = pos;
    status.innerHTML = `<i class="fas fa-satellite-dish" style="color:var(--primary)"></i> Refinando... ±${acc}m`;
    // Aceita imediatamente se atingir a meta
    if (acc <= ACURACIA_ALVO) _finalizarGPS(pos);
  }, err => {
    clearTimeout(timerMax);
    navigator.geolocation.clearWatch(watchId);
    const msgs = {
      1: `<b>Permissão negada pelo navegador.</b><br>
          <span style="font-size:.79rem">Clique no ícone de cadeado/câmera na barra de endereços e permita "Localização".</span>`,
      2: `<b>Posição indisponível.</b><br>
          <span style="font-size:.79rem">Em computadores, ative os <b>Serviços de Localização</b>:
          Windows: <i>Configurações → Privacidade → Localização → Ativar</i>.
          Mac: <i>Preferências → Segurança → Serviços de Localização → Ativar</i>.</span>`,
      3: `<b>Tempo esgotado.</b><br>
          <span style="font-size:.79rem">Verifique se os Serviços de Localização estão ativos e tente novamente.</span>`,
    };
    status.innerHTML = `<i class="fas fa-times-circle" style="color:var(--danger)"></i> ${msgs[err.code] || 'Erro ao obter localização.'}`;
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Tentar novamente';
  }, {enableHighAccuracy: true, timeout: TIMEOUT_MAX, maximumAge: 0});
}

