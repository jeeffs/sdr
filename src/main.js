/**
 * SDR Solucoes de Rua - Entry Point
 * Vite + ES Modules — migração incremental do sdr-module.js
 *
 * Fase 25: OLT Visual + PON Config + DGO 144 + Slot
 */

import { haversineM }            from './utils/haversine.js';
import {
  SDR_FIBER_STANDARDS,
  SDR_CABLE_TUBE_CONFIG,
  SDR_SPLITTER_LOSS,
  SDR_SPLITTER_TOPOLOGIES
} from './utils/fiber-standards.js';

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

import { sdrPowerBudgetCalc } from './cto/power-budget.js';
import { sdrAuditLog } from './core/audit.js';

import './map/render.js';
import './cto/index.js';
import './map/draw.js';
import './map/kmz.js';
import './viab/index.js';
import './clientes/index.js';
import './clientes/render.js';
import './onus/index.js';
import './infra/index.js';
import './tickets/index.js';
import './mk/index.js';
import './ui/index.js';
import './realtime/index.js';
import './alertas/index.js';
import './dashboard/index.js';
import './infra/render.js';
import './fiber/index.js';

// OLT CRUD — fase 24
import './olt/crud.js';

// OLT Visual + PON + DGO 144 — fase 25
import './olt/visual.js';

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

console.log('[SDR Bundle] sdr-bundle.js v25.0 carregado — ... + olt/crud + olt/visual OK');
