// src/admin/ui-helpers.js
// Blob URL Manager e Activity Listeners
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
