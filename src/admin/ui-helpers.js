// src/admin/ui-helpers.js
// Funções utilitárias de UI: toast, formatação, navegação de modais, blobs
// Extraído de admin.html Fase A

// ── Blob URLs ──
let _blobUrls = [];

window._createBlobUrl = function(blob) {
  const url = URL.createObjectURL(blob);
  _blobUrls.push(url);
  return url;
};

window._revokeAllBlobs = function() {
  _blobUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(_){} });
  _blobUrls = [];
};

// ── Activity Listeners (session timeout) ──
const _activityListenersList = [];

window._setupActivityListeners = function() {
  ['click','keydown','touchstart','scroll'].forEach(evt => {
    const handler = () => { if (window.currentUser) window._resetSessionTimer(); };
    document.addEventListener(evt, handler, {passive: true});
    _activityListenersList.push({el: document, evt, fn: handler});
  });
};

window._removeActivityListeners = function() {
  _activityListenersList.forEach(({el, evt, fn}) => {
    try { el.removeEventListener(evt, fn); } catch(_){}
  });
  _activityListenersList.length = 0;
};

// ── Toast (notificação temporária) ──
function toast(msg, type = '') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) { console.warn('[toast]', type, msg); return; }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
  el.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
window.toast = toast;

// ── Formatação monetária e de data ──
function fmtMoeda(v) {
  return '<span class="money-val">R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>';
}
function fmtData(d) {
  if (!d) return '—';
  const [y, m, di] = d.split('-');
  return `${di}/${m}/${y}`;
}
window.fmtMoeda = fmtMoeda;
window.fmtData  = fmtData;

// ── Abrir / fechar modal ──
function fecharModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
function abrirModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
window.fecharModal = fecharModal;
window.abrirModal  = abrirModal;
