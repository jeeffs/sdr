/**
 * SDR Solucoes de Rua - Entry Point
 * Vite + ES Modules — migração incremental do sdr-module.js
 *
 * Este bundle carrega ANTES do sdr-module.js (legado).
 * Funções extraídas ficam aqui e são expostas via window.xxx
 * para manter compatibilidade com o código legado.
 *
 * Fase 3: constantes de infraestrutura (config.js)
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
  SDR_OLT_BUDGET
} from './core/config.js';

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
  SDR_OLT_BUDGET
};

console.log('[SDR Bundle] sdr-bundle.js v3.0 carregado — config + haversine + fiber-standards OK');
