// src/admin/finance.js
// Normalização de tipos de serviço e carregamento de preços
// Extraído de admin.html Fase A

window._normTipo = function(t) {
  try { return (decodeURIComponent(t) || t).replace(/\//g, '-'); }
  catch(_) { return (t || '').replace(/\//g, '-'); }
};

window._decodePrecos = function(obj) {
  const r = {};
  Object.entries(obj).forEach(([k, v]) => { r[window._normTipo(k)] = v; });
  return r;
};

window._carregarTodosPrecos = async function() {
  const snap = await window.db.ref('precos').once('value');
  const raw  = snap.val() || {};
  if (raw.v1 || raw.v2 || raw.v3) {
    window.precosV1map = raw.v1 ? window._decodePrecos(raw.v1) : {...window.PRECOS_V1};
    window.precosV2map = raw.v2 ? window._decodePrecos(raw.v2) : {...window.PRECOS_V2};
    window.precosV3map = raw.v3 ? window._decodePrecos(raw.v3) : {...window.PRECOS_V3};
    window.precosV4map = raw.v4 ? window._decodePrecos(raw.v4) : {...window.precosV3map};
  } else {
    window.precosV1map = {...window.PRECOS_V1};
    window.precosV2map = {...window.PRECOS_V2};
    window.precosV3map = {...window.PRECOS_V3};
    window.precosV4map = {...window.PRECOS_V3};
    await window.db.ref('precos').set({
      v1: window.PRECOS_V1,
      v2: window.PRECOS_V2,
      v3: window.PRECOS_V3,
      v4: window.PRECOS_V3,
    });
  }
};
