'use strict';

window.buildServiceRows = function () {
  const c=document.getElementById('servicos-rows'); if(!c)return;
  c.innerHTML='';
  for(let i=1;i<=5;i++){
    const opts=SERVICOS.map(s=>`<option>${s}</option>`).join('');
    c.innerHTML+=`<div class="service-row">
      <select id="s-tipo-${i}" onchange="preencherPreco(${i})">
        <option value="">-- ${i}º Serviço --</option>${opts}
      </select>
      <input type="number" id="s-qtd-${i}" placeholder="Qtde" min="0" step="1"
        oninput="this.value=Math.floor(Math.abs(this.value))||'';calcTotal()">
      <div style="position:relative">
        <input type="number" id="s-val-${i}" placeholder="Sem preço" min="0" step="0.01"
          style="background:#f0fdf4;padding-right:26px;width:100%" readonly
          title="Valor da Tabela de Preços">
        <i class="fas fa-lock" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:.68rem;pointer-events:none"></i>
      </div>
    </div>`;
  }
}

window.preencherPreco = function (i){
  const tipoEl = document.getElementById(`s-tipo-${i}`);
  const vi = document.getElementById(`s-val-${i}`);
  if (!tipoEl || !vi) return;
  const tipo = tipoEl.value;
  const pm = getActivePriceMap();
  vi.value=(tipo&&pm&&pm[tipo]!==undefined)?pm[tipo]:'';
  calcTotal();
}

window.calcTotal = function (){
  let t=0;
  for(let i=1;i<=5;i++){
    t+=(parseInt(document.getElementById(`s-qtd-${i}`)?.value)||0)*(parseFloat(document.getElementById(`s-val-${i}`)?.value)||0);
  }
  const el=document.getElementById('total-preview');
  if(el)el.innerHTML=fmtMoeda(t);
}

window.limparForm = function (){
  const f=document.getElementById('form-os'); if(f)f.reset();
  buildServiceRows();
  atualizarCidadesPorProfile();
  const tp=document.getElementById('total-preview'); if(tp)tp.textContent='R$ 0,00';
  const gcc=document.getElementById('grp-cidade-custom'); if(gcc)gcc.style.display='none';
  const dmsF=document.getElementById('f-gps-dms'); if(dmsF)dmsF.value='';
  const gs=document.getElementById('gps-status');
  if(gs)gs.innerHTML='<i class="fas fa-info-circle"></i> Clique em "Capturar localização" para preencher via GPS.';
  const bg=document.getElementById('btn-gps');
  if(bg){bg.disabled=false;bg.innerHTML='<i class="fas fa-map-marker-alt"></i> Capturar localização';}
  const now=new Date();
  const df=document.getElementById('f-data'); if(df)df.value=_dateLocalStr(now);
  const hf=document.getElementById('f-hora'); if(hf)hf.value=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  removerFoto();
  gerarCodigoOS();
}

window.removerFoto = function () {
  fotoBase64 = null;
  const inp = document.getElementById('f-foto');
  if (inp) inp.value = '';
  const prev = document.getElementById('foto-preview');
  if (prev) prev.src = '';
  const wrap = document.getElementById('foto-preview-wrap');
  if (wrap) wrap.style.display = 'none';
}

window._inputPreco = function (s, nivel, map) {
  const v = map[s] !== undefined ? map[s] : '';
  return `<div style="position:relative;display:inline-flex;align-items:center">
    <span style="position:absolute;left:6px;color:var(--muted);font-size:.75rem;pointer-events:none">R$</span>
    <input type="number" data-servico="${s}" data-nivel="${nivel}" value="${v}" min="0" step="0.01" placeholder="0,00"
      style="padding:5px 6px 5px 22px;width:110px;border:1px solid var(--border);border-radius:7px;font-size:.82rem;text-align:right"
      oninput="atualizarPrecoMemoria(this)">
  </div>`;
}

window.atualizarPrecoMemoria = function (el) {
  const s   = el.getAttribute('data-servico');
  const niv = el.getAttribute('data-nivel');
  const v   = parseFloat(el.value) || 0;
  if (niv === 'V1') precosV1map[s] = v;
  else if (niv === 'V2') precosV2map[s] = v;
  else if (niv === 'V4') precosV4map[s] = v;
  else precosV3map[s] = v;
}

