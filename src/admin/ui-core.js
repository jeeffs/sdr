'use strict';

window.fecharModal = function (id){const el = document.getElementById(id); if(el) el.classList.remove('open');}

window.appScreen = function (name){
  document.getElementById('screen-loading').style.display='none';
  document.getElementById('screen-setup').style.display='none';
  document.getElementById('screen-login').style.display='none';
  document.getElementById('screen-first-login').style.display='none';
  document.getElementById('screen-app').style.display='none';
  document.getElementById('screen-termo-pendente').style.display='none';
  document.getElementById('screen-cadastro-empresa').style.display='none';
  document.getElementById('screen-contrato-pendente').style.display='none';
  if(name==='loading'){document.getElementById('screen-loading').style.display='flex';}
  else if(name==='setup'){document.getElementById('screen-setup').style.display='flex';}
  else if(name==='login'){document.getElementById('screen-login').style.display='flex'; initLoginScreen();}
  else if(name==='first-login'){document.getElementById('screen-first-login').style.display='flex';}
  else if(name==='app'){document.getElementById('screen-app').style.display='flex'; initSidebar();}
  else if(name==='termo-pendente'){document.getElementById('screen-termo-pendente').style.display='flex';}
  else if(name==='cadastro-empresa'){document.getElementById('screen-cadastro-empresa').style.display='flex';}
  else if(name==='contrato-pendente'){document.getElementById('screen-contrato-pendente').style.display='flex';}
}

window.atualizarDados = function () {
  const btn = document.getElementById('btn-atualizar');
  if (!btn || btn.classList.contains('refreshing')) return;
  btn.classList.add('refreshing');
  btn.disabled = true;
  // Reload completo da página — a sessão é mantida via sessionStorage
  // e o auto-login restaura o usuário sem pedir senha
  location.reload();
}

window.toggleSidebar = function () {
  const sb = document.getElementById('sidebar');
  const collapsed = sb.classList.toggle('collapsed');
  try { localStorage.setItem('sb-collapsed', collapsed ? '1' : '0'); } catch(_e) { console.warn('[toggleSidebar]', _e.message); }
}

window.toggleValores = function () {
  const oculto = document.body.classList.toggle('hide-money');
  const btn = document.getElementById('btn-olho');
  const ico = document.getElementById('icon-olho');
  if (btn) btn.classList.toggle('aberto', !oculto);
  if (ico) ico.className = oculto ? 'fas fa-eye-slash' : 'fas fa-eye';
}

window.initSidebar = function () {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  // Padrão: minimizada. Só expande se o usuário tiver explicitamente expandido antes.
  const saved = localStorage.getItem('sb-collapsed');
  const doCollapse = saved === null ? true : saved === '1';
  if (doCollapse) sb.classList.add('collapsed');
  else sb.classList.remove('collapsed');
}

window.fmtMoeda = function (v){return '<span class="money-val">R$ '+(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'</span>';}

window.fmtData = function (d){if(!d)return '—';const[y,m,di]=d.split('-');return `${di}/${m}/${y}`;}

window.toast = function (msg,type=''){
  const wrap=document.getElementById('toast-wrap');
  const el=document.createElement('div');el.className=`toast ${type}`;
  el.innerHTML=`<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':'info-circle'}"></i> ${msg}`;
  wrap.appendChild(el);setTimeout(()=>el.remove(),3500);
}

window.atualizarProfileSelect = function () {
  const sel = document.getElementById('f-profile');
  if (!sel) return;
  const current = sel.value || 'FILIAL';
  const profiles = Object.keys(profilesCidades);
  sel.innerHTML = profiles.map(p => `<option value="${p}"${p===current?' selected':''}>${p}</option>`).join('');
  atualizarCidadesPorProfile();
}

window.atualizarCidadesPorProfile = function () {
  const profile = document.getElementById('f-profile')?.value || 'FILIAL';
  const cidades = profilesCidades[profile] || FILIAL_CIDADES;
  const sel = document.getElementById('f-cidade');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">-- Selecione --</option>'
    + cidades.map(c => `<option value="${c}">${c}</option>`).join('')
    + '<option value="_outro">Outra cidade...</option>';
  // Tenta manter a seleção anterior se ainda existir
  if (cidades.includes(current)) sel.value = current;
  else sel.value = '';
  document.getElementById('grp-cidade-custom').style.display = 'none';
}

