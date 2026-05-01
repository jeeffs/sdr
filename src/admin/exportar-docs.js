'use strict';

window.renderExportarDocsPage = function () {
  const tecDiv = document.getElementById('exp-docs-tecnicos');
  const tiposDiv = document.getElementById('exp-docs-tipos');
  if (!tecDiv || !tiposDiv) return;
  // Carrega contratos assinados (admin e fiscal)
  if (_isAdmin(currentUser) || _isFiscal(currentUser)) _renderContratosAssinados().catch(e => console.error('[_renderContratosAssinados]', e));

  const tecs = _segGetTecnicos();
  tecDiv.innerHTML = tecs.map(t =>
    `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.84rem;transition:background .15s">
      <input type="checkbox" class="exp-doc-tec" value="${t.id}" style="width:18px;height:18px;accent-color:#2563eb">
      <span style="font-weight:600">${t.nome}</span>
    </label>`
  ).join('');

  // Documentos padrão + Ficha de EPI + Licenciamento
  const tiposExtra = [
    ...Object.entries(SEG_DOC_TIPOS).map(([tipo,info]) => ({tipo, nome:info.nome, icon:info.icon})),
    {tipo:'fichaEpi', nome:'Ficha de EPI', icon:'fa-shield-alt'},
    {tipo:'licenciamento', nome:'Licenciamento Veicular', icon:'fa-car'}
  ];
  tiposDiv.innerHTML = tiposExtra.map(t =>
    `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f8fafc;border-radius:8px;border:1px solid var(--border);cursor:pointer;font-size:.84rem">
      <input type="checkbox" class="exp-doc-tipo" value="${t.tipo}" checked style="width:18px;height:18px;accent-color:#d97706">
      <i class="fas ${t.icon}" style="color:#64748b"></i>
      <span>${t.nome}</span>
    </label>`
  ).join('');
}

