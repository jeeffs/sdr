/**
 * Utilitário de distância geográfica — SDR
 * Fórmula de Haversine: distância em metros entre dois pontos lat/lng
 */

/**
 * Calcula distância em metros entre dois pontos geográficos
 * @param {{ lat: number, lng: number }} a - Ponto de origem
 * @param {{ lat: number, lng: number }} b - Ponto de destino
 * @returns {number} Distância em metros
 */
export function haversineM(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180)
    * Math.cos(b.lat * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Compatibilidade com sdr-module.js — chamado internamente como _haversineM
window._haversineM = haversineM;
