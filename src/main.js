/**
 * SDR Solucoes de Rua - Entry Point
 * Vite + ES Modules — migração incremental do sdr-module.js
 *
 * Fase 24: OLT CRUD (sdrOltsRender, sdrOltAddModal, sdrOltSave, etc.)
 */

// Utils puros — sem dependência de DOM
import { haversineM }            from './utils/haversine.js';
import {
  SDR_FIBER_STANDARDS,
  SDR_CABLE_TUBE_CONFIG,
  SDR_SPLITTER_LOSS,
  SDR_SPLITTER_TOPOLOGIES
} from './utils/fiber-standards.js';

// Constantes de infraestrutura — tenant, tipos, perdas, budget OLT
import {
  SDR_TENANT,
  SDR_BASE,
  INFRA_TYPES,
  SDR_CTO_ICONS,
  SDR_CTO_COLOR_MAP,
  SDR_PERDAS,
  SDR_OLT_BUDGET,
  CABLE_RENDER,
  CABLE_FIBER_COLOR,
  SDR_CABLE_COLOR_MAP
} from './core/config.js';

// Power Budget GPON — sdrPowerBudgetCalc + _sdrTracePath
import { sdrPowerBudgetCalc } from './cto/power-budget.js';

// Audit Log — sdrAuditLog (fire-and-forget para toda escrita Firebase)
import { sdrAuditLog } from './core/audit.js';

// Renderização do mapa — fase 7
import './map/render.js';

// Modais CTO/CEO/RT — fase 9
import './cto/index.js';

// GIS Draw — fase 8
import './map/draw.js';

// KMZ/KML import — fase 11
import './map/kmz.js';

// Viabilidade Comercial — fase 13
import './viab/index.js';

// Clientes — importação CSV, painel, auto-link CTO — fase 10
import './clientes/index.js';

// Clientes — render lista + CRUD (sdrClientesRender, sdrClienteSave, etc.) — fase 15
import './clientes/render.js';

// ONUs — CRUD + painel + filtros — fase 12
import './onus/index.js';

// Infra — painel lateral + CRUD (sdrOpenInfraPanel, sdrInfraSave, etc.) — fase 14
import './infra/index.js';

// Tickets — CRUD + Ordem de Serviço — fase 16
import './tickets/index.js';

// MK Integração — Firebase Functions proxy — fase 17
import './mk/index.js';

// UI — Topologia, CtxMenu, MoveMarker, CtxHelpers, CSV Export — fase 18
import './ui/index.js';

// Realtime + Alertas + HTML Templates + Conversores — fase 19
import './realtime/index.js';

// Alertas CRUD + Relatório Inadimplentes — fase 20
import './alertas/index.js';

// Dashboard de Rede + HTML Templates — fase 21
import './dashboard/index.js';

// Infra Grid Render + sdrInfraAdd + sdrOltAdd — fase 22
import './infra/render.js';

// Fiber Standards Modal — fase 23
import './fiber/index.js';

// OLT CRUD — sdrOltsRender, sdrOltAddModal, sdrOltSave, sdrOltDelete, etc. — fase 24
import './olt/crud.js';

// Re-exporta para uso em outros módulos do bundle
export {
  haversineM,
  SDR_FIBER_STANDARDS,
  SDR_CABLE_TUBE_CONFIG,
  SDR_SPLITTER_LOSS,
  SDR_SPLITTER_TOPOLOGIES,
  SDR_TENANT,
  SDR_BASE,
  INFRA_TYPES,
  SDR_CTO_ICONS,
  SDR_CTO_COLOR_MAP,
  SDR_PERDAS,
  SDR_OLT_BUDGET,
  CABLE_RENDER,
  CABLE_FIBER_COLOR,
  SDR_CABLE_COLOR_MAP,
  sdrPowerBudgetCalc,
  sdrAuditLog
};

console.log('[SDR Bundle] sdr-bundle.js v24.0 carregado — audit + power-budget + config + map/render + cto/index + map/draw + map/kmz + viab + clientes + onus + infra + clientes/render + tickets + mk + ui + realtime + alertas + dashboard + infra/render + fiber + olt/crud OK');
