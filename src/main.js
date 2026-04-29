/**
 * SDR Solucoes de Rua - Entry Point
 * Vite + ES Modules — migração incremental do sdr-module.js
 *
 * Este bundle carrega ANTES do sdr-module.js (legado).
 * Funções extraídas ficam aqui e são expostas via window.xxx
 * para manter compatibilidade com o código legado.
 *
 * Fase 2: utilitários puros sem dependência de DOM ou Firebase
 */

// Utils puros — sem dependência de DOM
import { haversineM }            from './utils/haversine.js';
import {
  SDR_FIBER_STANDARDS,
  SDR_CABLE_TUBE_CONFIG,
  SDR_SPLITTER_LOSS,
  SDR_SPLITTER_TOPOLOGIES
} from './utils/fiber-standards.js';

// Re-exporta para uso em outros módulos do bundle
export {
  haversineM,
  SDR_FIBER_STANDARDS,
  SDR_CABLE_TUBE_CONFIG,
  SDR_SPLITTER_LOSS,
  SDR_SPLITTER_TOPOLOGIES
};

console.log('[SDR Bundle] sdr-bundle.js v2.0 carregado — haversine + fiber-standards OK');
