(function() {
'use strict';

// ── CONFIGURAÇÃO ──
// MIGRADO para src/core/config.js (sdr-bundle.js)
// Disponível via window.xxx (carregado antes deste arquivo)
const SDR_TENANT     = window.SDR_TENANT;
const SDR_BASE       = window.SDR_BASE;
const INFRA_TYPES    = window.INFRA_TYPES;
const SDR_PERDAS     = window.SDR_PERDAS;
const SDR_OLT_BUDGET = window.SDR_OLT_BUDGET;

// MIGRADO para src/cto/power-budget.js (sdr-bundle.js)
// _sdrTracePath e sdrPowerBudgetCalc disponíveis via window.xxx
const _sdrTracePath  = window._sdrTracePath;

// MIGRADO para src/utils/haversine.js (sdr-bundle.js)
const _haversineM = window._haversineM;

// ── PADRÃO DE CORES DE FIBRA ──
// MIGRADO para src/utils/fiber-standards.js (sdr-bundle.js)
// Disponível como window.SDR_FIBER_STANDARDS (carregado antes deste arquivo)
const SDR_FIBER_STANDARDS = window.SDR_FIBER_STANDARDS;

// MIGRADO para src/utils/fiber-standards.js (sdr-bundle.js)
const SDR_CABLE_TUBE_CONFIG   = window.SDR_CABLE_TUBE_CONFIG;
const SDR_SPLITTER_LOSS       = window.SDR_SPLITTER_LOSS;
const SDR_SPLITTER_TOPOLOGIES = window.SDR_SPLITTER_TOPOLOGIES;

function _getTubeConfig(fiberCount) {
  return SDR_CABLE_TUBE_CONFIG[fiberCount] || [{ fibers: fiberCount }];
}
window.sdrFiberStandard = localStorage.getItem('sdr_fiber_standard') || 'abnt';

window.sdrSetFiberStandard = window.sdrSetFiberStandard || function(std) {
  window.sdrFiberStandard = std;
  localStorage.setItem('sdr_fiber_standard', std);
};
window.sdrShowFiberStandardModal = window.sdrShowFiberStandardModal || function() {};

// ── ESTADO (exposto via window — src/map/core.js acessa diretamente) ──
window.sdrMap          = window.sdrMap          || null;
window.sdrMapReady     = window.sdrMapReady     || false;
window.sdrBaseTile     = window.sdrBaseTile     || null;
window.sdrLayers       = window.sdrLayers       || { clients: null, ctos: null, poles: null, cables: null, olts: null, heatmap: null };
window.sdrLayerVisible = window.sdrLayerVisible || { clients: true, ctos: true, poles: true, cables: false, olts: true, heatmap: false };
window.sdrInfraCache   = window.sdrInfraCache   || {};
window.sdrClientesCache= window.sdrClientesCache|| {};
window.sdrOltsCache    = window.sdrOltsCache    || {};
window.sdrAlertasCache = window.sdrAlertasCache || {};

// ── REFERÊNCIAS FIREBASE ──
function sdrRef(path) { return db.ref(`${SDR_BASE}/${path}`); }
window.sdrRef = sdrRef; // exposto para src/cto/index.js (sdr-bundle.js)

// ════════════════════════════════════════════════════
// MAPA LEAFLET
// ════════════════════════════════════════════════════

// ── MAPA — migrado para src/map/core.js (Fase 30) ──
window.sdrMapInit       = window.sdrMapInit       || function() {};
window.sdrMapReloadData = window.sdrMapReloadData || function() {};
window.sdrMapAddItem    = window.sdrMapAddItem    || function() { window._sdrShowAddModal(null, null); };

// ════════════════════════════════════════════════════
// PAINEL LATERAL + MODAL INFRA CRUD — migrado para src/infra/index.js (Fase 14)
// ════════════════════════════════════════════════════
window.sdrOpenInfraPanel    = window.sdrOpenInfraPanel    || function() {};
window.sdrCloseSidePanel    = window.sdrCloseSidePanel    || function() {};
window.sdrMapFlyTo          = window.sdrMapFlyTo          || function() {};
window.sdrToggleMapClickMode= window.sdrToggleMapClickMode|| function() {};
window.sdrMapClickCapture   = window.sdrMapClickCapture   || function() { return false; };
window.sdrCancelMapClickMode= window.sdrCancelMapClickMode|| function() {};
window.sdrGetGPS            = window.sdrGetGPS            || function() {};
window.sdrInfraSave         = window.sdrInfraSave         || function() {};
window.sdrInfraEdit         = window.sdrInfraEdit         || function() {};
window.sdrInfraDelete       = window.sdrInfraDelete       || function() {};
window._sdrShowAddModal     = window._sdrShowAddModal     || function() {};

// ════════════════════════════════════════════════════
// PÁGINA INFRAESTRUTURA (LISTA/GRID)
// ════════════════════════════════════════════════════

window.sdrInfraRender = window.sdrInfraRender || function() {};
window.sdrInfraAdd = window.sdrInfraAdd || function() {};

// ════════════════════════════════════════════════════
// PÁGINA CLIENTES DA REDE — migrado para src/clientes/render.js (Fase 15)
// ════════════════════════════════════════════════════
window.sdrClientesRender   = window.sdrClientesRender   || function() {};
window.sdrClientesFilter   = window.sdrClientesFilter   || function() {};
window.sdrMapFlyToClient   = window.sdrMapFlyToClient   || function() {};
window.sdrClienteAdd       = window.sdrClienteAdd       || function() {};
window.sdrClienteEdit      = window.sdrClienteEdit      || function() {};
window.sdrGetGPSCliente    = window.sdrGetGPSCliente    || function() {};
window.sdrClienteSave      = window.sdrClienteSave      || function() {};
window.sdrClienteDelete    = window.sdrClienteDelete    || function() {};

// ════════════════════════════════════════════════════
// PÁGINA OLTs
// ════════════════════════════════════════════════════

window.sdrOltsRender = window.sdrOltsRender || function() {};

window.sdrOltAdd = window.sdrOltAdd || function() {};

// ════════════════════════════════════════════════════
// PÁGINA ALERTAS
// ════════════════════════════════════════════════════

// sdrAlertasRender — sobrescrita por src/realtime/index.js (bundle)
window.sdrAlertasRender = window.sdrAlertasRender || function() {};
// sdrAlertaAck — sobrescrita por src/alertas/index.js (bundle)
window.sdrAlertaAck = window.sdrAlertaAck || function() {};
// ════════════════════════════════════════════════════
// DASHBOARD REDE
// ════════════════════════════════════════════════════

// sdrDashRedeRender — sobrescrita por src/dashboard/index.js (bundle)
window.sdrDashRedeRender = window.sdrDashRedeRender || function() {};
// ════════════════════════════════════════════════════
// INICIALIZAÇÃO DO TENANT DEFAULT
// ════════════════════════════════════════════════════

// Criar tenant padrão se não existir
sdrRef('info').once('value').then(snap => {
  if (!snap.exists()) {
    sdrRef('info').set({
      name: 'Meu Provedor',
      tier: 'starter',
      license_status: 'active',
      created_at: new Date().toISOString()
    });
    console.log('[SDR Comercial] Tenant default criado');
  }
});

// ── Clientes — MIGRADO para src/clientes/index.js (sdr-bundle.js) ──────────
// sdrImportClientes, sdrImportExecute, sdrOpenClientePanel, _buildClientePanel
// sdrAutoLinkCTO, _mapColumn, _normalizeFinStatus → window.xxx via sdr-bundle.js
window.sdrImportClientes   = window.sdrImportClientes   || function() {};
window.sdrImportExecute    = window.sdrImportExecute    || function() {};
window.sdrOpenClientePanel = window.sdrOpenClientePanel || function() {};
window.sdrAutoLinkCTO      = window.sdrAutoLinkCTO      || function() {};

// Helper: calcular ocupação de uma CTO
// Helper: encontrar CTO do poste

// ════════════════════════════════════════════════════
// SPRINT 4 — OLTs TAB INTERFACE + CHASSIS INLINE + CORD DRAWING
// ════════════════════════════════════════════════════

window._sdrActiveOltTab = window._sdrActiveOltTab || null;
window._sdrOltPlaceMode = window._sdrOltPlaceMode || null;
window._sdrCordDrawMode = window._sdrCordDrawMode || null;

// ── HTML da página OLTs (tab-based dark UI) ─────────────────────────
// ── HTML OLT page — MIGRADO para src/olt/html.js ────────────────────────
window._sdrHtml_olts = window._sdrHtml_olts || function() { return ''; };

// ── OLT TabSwitch + InlineRender + ChassisPreview — MIGRADO para src/olt/inline.js ──
window.sdrOltTabSwitch      = window.sdrOltTabSwitch      || function() {};
window.sdrOltInlineRender   = window.sdrOltInlineRender   || function() {};
window.sdrOltChassisPreview = window.sdrOltChassisPreview || function() {};
window.sdrOltBrandChange    = window.sdrOltBrandChange    || function() {};
window.sdrOltModelChange    = window.sdrOltModelChange    || function() {};

// Modal dedicado para OLT

// ── OLT Lightpath Modal + LP helpers — MIGRADO para src/olt/lightpath.js ──
window.sdrOltLightpathModal = window.sdrOltLightpathModal || function() {};
window.sdrLpHighlight       = window.sdrLpHighlight       || function() {};
window.sdrLpPonSelect       = window.sdrLpPonSelect       || function() {};
window._sdrLpCancelSelect   = window._sdrLpCancelSelect   || function() {};
window.sdrLpFiberConnect    = window.sdrLpFiberConnect    || function() {};
window.sdrLpDisconnect      = window.sdrLpDisconnect      || function() {};


// ── Cord Drawing + Slots + Rastreabilidade + CordEdit — MIGRADO para src/olt/cord.js ──
window.sdrOltSlotInsert         = window.sdrOltSlotInsert         || function() {};
window.sdrOltSlotRemove         = window.sdrOltSlotRemove         || function() {};
window.sdrPonCordStart          = window.sdrPonCordStart          || function() {};
window.sdrCordDrawCancel        = window.sdrCordDrawCancel        || function() {};
window.sdrCordConnectFiber      = window.sdrCordConnectFiber      || function() {};
window._sdrCordDrawFromFiber    = window._sdrCordDrawFromFiber    || function() {};
window._sdrCordFinishFiberToPon = window._sdrCordFinishFiberToPon || function() {};
window._sdrCordSvgUpdate        = window._sdrCordSvgUpdate        || function() {};
window._sdrDrawSavedCords       = window._sdrDrawSavedCords       || function() {};
window._sdrRastreabilidade      = window._sdrRastreabilidade      || function() {};
window.sdrSlotConfig            = window.sdrSlotConfig            || function() {};
window.sdrSlotConfigSave        = window.sdrSlotConfigSave        || function() {};
window._sdrCordHighlight        = window._sdrCordHighlight        || function() {};
window._sdrCordEdit             = window._sdrCordEdit             || null;
window._sdrCordEditAllPts       = window._sdrCordEditAllPts       || function() {};
window._sdrCordEditStart        = window._sdrCordEditStart        || function() {};
window._sdrCordEditRender       = window._sdrCordEditRender       || function() {};
window._sdrCordEditSave         = window._sdrCordEditSave         || function() {};
window._sdrCordEditCancel       = window._sdrCordEditCancel       || function() {};
// sdrOltSave, sdrOltDelete, sdrOpenOltPanel → window.xxx via sdr-bundle.js
window.sdrOltStartMapPlace = window.sdrOltStartMapPlace || function() {};
window._sdrCancelOltPlace  = window._sdrCancelOltPlace  || function() {};
window.sdrOltsRender       = window.sdrOltsRender       || function() {};
window.sdrOltAddModal      = window.sdrOltAddModal      || function() {};
window.sdrOltModalCriarDgo = window.sdrOltModalCriarDgo || function() {};
window.sdrOltSave          = window.sdrOltSave          || async function() {};
window.sdrOltDelete        = window.sdrOltDelete        || async function() {};
window.sdrOpenOltPanel     = window.sdrOpenOltPanel     || function() {};

// ── OLT VISUAL + PON + DGO — MIGRADO para src/olt/visual.js ─────────────
// sdrOltVisualModal, sdrPonConfig, sdrPonDgoChange, sdrPonSave,
// sdrPonSelectFiber, sdrDgo144Modal, sdrDgo144View, sdrFiberSelect,
// sdrDgoCriarModal, sdrDgoCalc, sdrDgoSalvar, sdrOltSlotAdd → window.xxx via sdr-bundle.js
window.sdrOltVisualModal   = window.sdrOltVisualModal   || function() {};
window.sdrPonConfig        = window.sdrPonConfig        || function() {};
window.sdrPonDgoChange     = window.sdrPonDgoChange     || function() {};
window.sdrPonSave          = window.sdrPonSave          || function() {};
window.sdrPonSelectFiber   = window.sdrPonSelectFiber   || function() {};
window.sdrDgo144Modal      = window.sdrDgo144Modal      || function() {};
window.sdrDgo144View       = window.sdrDgo144View       || function() {};
window.sdrFiberSelect      = window.sdrFiberSelect      || function() {};
window.sdrDgoCriarModal    = window.sdrDgoCriarModal    || function() {};
window.sdrDgoCalc          = window.sdrDgoCalc          || function() {};
window.sdrDgoSalvar        = window.sdrDgoSalvar        || function() {};
window.sdrOltSlotAdd       = window.sdrOltSlotAdd       || function() {};

// ── ONUs — MIGRADO para src/onus/index.js (sdr-bundle.js) ─────────────────
// sdrOnusRender, sdrOnusFilter, sdrOnuAdd, sdrOnuEdit, sdrOnuSave
// sdrOnuDelete, sdrOpenOnuPanel → window.xxx via sdr-bundle.js
window.sdrOnusRender    = window.sdrOnusRender    || function() {};
window.sdrOnusFilter    = window.sdrOnusFilter    || function() {};
window.sdrOnuAdd        = window.sdrOnuAdd        || function() {};
window.sdrOnuEdit       = window.sdrOnuEdit       || function() {};
window.sdrOnuSave       = window.sdrOnuSave       || function() {};
window.sdrOnuDelete     = window.sdrOnuDelete     || function() {};
window.sdrOpenOnuPanel  = window.sdrOpenOnuPanel  || function() {};

// SPRINT 3 — ALERTAS MELHORADOS (auto-geração)
// ════════════════════════════════════════════════════

// Gerar alertas baseado em status de ONUs
window.sdrCheckAlerts = window.sdrCheckAlerts || async function() {};

// ── Patch alertas + heatmap hook — removidos (Fase 30) ──
// sdrAlertasRender: já inclui "Verificar Agora" em src/realtime/index.js
// sdrRenderHeatmap: hook integrado em window.sdrMapReloadData (src/map/core.js)


// ── 4B: DASHBOARD REDE COM GRÁFICOS ──

// ── 4C: TICKETS DE REDE — migrado para src/tickets/index.js (Fase 16) ──
window.sdrTicketsRender   = window.sdrTicketsRender   || function() {};
window.sdrTicketsFilter   = window.sdrTicketsFilter   || function() {};
window.sdrTicketAdd       = window.sdrTicketAdd       || function() {};
window.sdrTicketEdit      = window.sdrTicketEdit      || function() {};
window.sdrTicketSave      = window.sdrTicketSave      || function() {};
window.sdrTicketResolve   = window.sdrTicketResolve   || function() {};
window.sdrTicketDelete    = window.sdrTicketDelete    || function() {};
window.sdrOpenTicketPanel = window.sdrOpenTicketPanel || function() {};
window.sdrTicketPrintOS   = window.sdrTicketPrintOS   || function() {};

// ── Relatório de Inadimplentes ──
window.sdrRelatorioInadimplentes = window.sdrRelatorioInadimplentes || function() {};

// ── MAPA BASE — MIGRADO para src/map/heatmap.js ─────────────────────────
// SDR_TILE_URLS, sdrHybridLabels, sdrMapChangeBase → window.xxx via sdr-bundle.js
window.sdrHybridLabels   = window.sdrHybridLabels   || null;
window.sdrMapChangeBase  = window.sdrMapChangeBase  || function() {};


// ════════════════════════════════════════════════════════════════
// SPRINT 5 — MAPA FTTH PROFISSIONAL
// Import KMZ/KML • Cores do KMZ • CTOs com Portas • Cabos Avançados
// Modo Desenho • Diagrama Unifilar
// ════════════════════════════════════════════════════════════════

// ── Estado Sprint 5 ──
// ── GIS Draw block — MIGRADO para src/map/draw.js (sdr-bundle.js) ─────────
// sdrDrawModeToggle, _sdrStartDraw, _sdrCloseDrawMode, _sdrSaveDrawing etc.
// window.sdrDrawModeToggle, window._sdrStartDraw, window._sdrStartEditMode
// window._sdrUndoPt, window._sdrFinalizeDraw, window._sdrToggleSnap
// window._sdrSaveDrawing → todos via sdr-bundle.js (carregado antes)
// ── KMZ block — MIGRADO para src/map/kmz.js (sdr-bundle.js) ────────────────
// sdrImportKMZ, sdrHandleKMZFile, sdrKMZCancelImport, sdrKMZConfirmImport
// _fiberColors, _fiberNames, _tubeColors → window.xxx via sdr-bundle.js
window._sdrKMZFeatures = window._sdrKMZFeatures || [];
// sdrKMZLayer agora gerenciado em src/map/kmz.js

// ── Viabilidade — MIGRADO para src/viab/index.js (sdr-bundle.js) ─────────
// sdrViabilidadeToggle, sdrViabilidadeCheck → window.xxx via sdr-bundle.js
window.sdrViabilidadeToggle = window.sdrViabilidadeToggle || function() {};
window.sdrViabilidadeCheck  = window.sdrViabilidadeCheck  || function() {};

// ────────────────────────────────────────────────
// B. DETALHES DO CABO
// ────────────────────────────────────────────────


// ────────────────────────────────────────────────
// C. MODAL DE CLICK NA CTO / CEO / RT / SPLITTER
// Inclui Power Budget, clientes, viabilidade
// ────────────────────────────────────────────────
window.sdrCTOPortsModal = window.sdrCTOPortsModal || function() {}; // migrado → src/cto/index.js

// sdrCableDetailModal — versao completa (arquivo estava truncado)
window.sdrCableDetailModal = window.sdrCableDetailModal || function() {}; // migrado → src/cto/index.js

// HTML DAS PAGINAS SDR
// IDs devem bater exatamente com o que as funções de render buscam via getElementById
window._sdrHtml_dash_rede = window._sdrHtml_dash_rede || function() { return ''; };

// _sdrHtml_clientes — sobrescrita por src/realtime/index.js (bundle)
window._sdrHtml_clientes = window._sdrHtml_clientes || function() { return '<div>Carregando...</div>'; };
// _sdrHtml_olts definida na Sprint 4 (linha ~2098) — não redefinir aqui

// _sdrHtml_onus — sobrescrita por src/realtime/index.js (bundle)
window._sdrHtml_onus = window._sdrHtml_onus || function() { return '<div>Carregando...</div>'; };
// _sdrHtml_alertas — sobrescrita por src/realtime/index.js (bundle)
window._sdrHtml_alertas = window._sdrHtml_alertas || function() { return '<div>Carregando...</div>'; };
window._sdrHtml_tickets = window._sdrHtml_tickets || function() { return ''; };

// Filtro de clientes — stub (bundle define versão definitiva)
// sdrClientesFiltrar — sobrescrita por src/ui/index.js (bundle)
window.sdrClientesFiltrar = window.sdrClientesFiltrar || function() {};
// CSS das paginas SDR
// (injeção de CSS migrada para sdr-bundle.js)
})();

// ============================================================
// MK SOLUTIONS — Página de Configuração e Integração
// ============================================================

window._sdrHtml_mk_config = window._sdrHtml_mk_config || function() { return ''; };

// ---- MK: Render (carrega config salva do Firebase) ----
// ── Fase 17: MK integração → sdr-bundle.js (mk/index.js) ──
window.sdrMkConfigRender  = window.sdrMkConfigRender  || function() {};
window.sdrMkSaveConfig    = window.sdrMkSaveConfig    || function() {};
window.sdrMkTestarConexao = window.sdrMkTestarConexao || function() {};
window.sdrMkSyncAll       = window.sdrMkSyncAll       || function() {};
window.sdrMkGetConexao    = window.sdrMkGetConexao    || function() {};
window.sdrMkAbrirOS       = window.sdrMkAbrirOS       || function() {};
window.sdrMkDesbloquear   = window.sdrMkDesbloquear   || function() {};
window.sdrMkDemoTopologia = window.sdrMkDemoTopologia || function() {};
window.sdrMkDemoOlts      = window.sdrMkDemoOlts      || function() {};
window.sdrMkDemoOnus      = window.sdrMkDemoOnus      || function() {};
window.sdrMkDemoClientes  = window.sdrMkDemoClientes  || function() {};


// ---- Topologia FTTH — Árvore Visual ----
// ── Fase 18: Topologia + CtxMenu + MoveMarker + CSV → sdr-bundle.js (ui/index.js) ──
window.sdrTopologiaToggle  = window.sdrTopologiaToggle  || function() {};
window.sdrTopologiaRender  = window.sdrTopologiaRender  || function() {};
window._sdrCtxReg          = window._sdrCtxReg          || {};
window.sdrCtxMenu          = window.sdrCtxMenu          || function() {};
window.sdrCtxClose         = window.sdrCtxClose         || function() {};
window.sdrMoveMarker       = window.sdrMoveMarker       || function() {};
window.sdrMoveConfirmMarker= window.sdrMoveConfirmMarker|| function() {};
window.sdrMoveCancelMarker = window.sdrMoveCancelMarker || function() {};
window._sdrCtxOlt          = window._sdrCtxOlt          || function() { return []; };
window._sdrCtxOnu          = window._sdrCtxOnu          || function() { return []; };
window._sdrCtxCliente      = window._sdrCtxCliente      || function() { return []; };
window._sdrCtxInfra        = window._sdrCtxInfra        || function() { return []; };
window.sdrClientesFiltrar  = window.sdrClientesFiltrar  || function() {};
window.sdrExportClientesCSV= window.sdrExportClientesCSV|| function() {};
window.sdrExportOnusCSV    = window.sdrExportOnusCSV    || function() {};

// ── Fase 19: Realtime + Alertas + Templates → sdr-bundle.js (realtime/index.js) ──
window._sdrInitRealtime     = window._sdrInitRealtime     || function() {};
window._sdrUpdateAlertBadge = window._sdrUpdateAlertBadge || function() {};
window.sdrAlertaAbrirTicket = window.sdrAlertaAbrirTicket || function() {};
window.sdrAlertasRender     = window.sdrAlertasRender     || function() {};
window._sdrHtml_clientes    = window._sdrHtml_clientes    || function() { return ''; };
window._sdrHtml_onus        = window._sdrHtml_onus        || function() { return ''; };
window._sdrHtml_alertas     = window._sdrHtml_alertas     || function() { return ''; };
window.sdrOnusFiltrar       = window.sdrOnusFiltrar       || function() {};
window.sdrConverterCtoCeo   = window.sdrConverterCtoCeo   || function() {};
window.sdrConverterRtNome   = window.sdrConverterRtNome   || function() {};
