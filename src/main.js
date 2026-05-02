/**
 * SDR Solucoes de Rua - Entry Point
 * Vite + ES Modules — migração incremental do sdr-module.js
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
import './olt/crud.js';
import './olt/visual.js';
import './olt/html.js';
import './map/heatmap.js';
import './olt/inline.js';
import './olt/lightpath.js';
import './olt/cord.js';
import './map/core.js';
import './core/bootstrap.js';

// Admin — Fase A
import './admin/constants.js';
import './admin/firebase-helpers.js';
import './admin/finance.js';
import './admin/ui-helpers.js';
import './admin/auth.js';
import './admin/seguranca.js';

// Admin — Fase B
import './admin/tecnicos.js';
import './admin/os.js';
import './admin/assinatura.js';

// Admin — Fase C
import './admin/config.js';
import './admin/usuarios.js';
import './admin/exportar.js';
import './admin/financeiro.js';

// Admin — Fase D
import './admin/seguranca_page.js';
import './admin/importar.js';
import './admin/dashboard_admin.js';
import './admin/contratos.js';

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

console.log('[SDR Bundle] sdr-bundle.js v47.0 carregado — fix: validacao via REST API, bypass WebSocket bloqueado');
