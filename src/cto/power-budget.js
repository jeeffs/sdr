/**
 * SDR — Power Budget GPON
 * Calcula perda optica acumulada OLT -> CTO percorrendo chain parent_id
 *
 * Dependencias runtime (disponíveis via sdr-bundle.js carregado antes):
 *   window.sdrInfraCache  — cache dos elementos do mapa (atualizado pelo sdr-module.js)
 *   window.SDR_PERDAS     — constantes de perda optica
 *   window.SDR_OLT_BUDGET — budget por classe optica (B+/C+)
 *   window._haversineM    — distancia em metros entre dois pontos lat/lng
 */

/**
 * Percorre a chain parent_id a partir de um elemento até a raiz (OLT/DGO)
 * @param {string} startId - ID do elemento de origem (ex: CTO)
 * @returns {{ id: string, item: object }[]} caminho do elemento até a raiz
 */
function sdrTracePath(startId) {
  const cache   = window.sdrInfraCache || {};
  const path    = [];
  const visited = new Set();
  let curId = startId;
  let cur   = cache[startId];

  while (cur && !visited.has(curId)) {
    visited.add(curId);
    path.push({ id: curId, item: cur });
    if (!cur.parent_id) break;
    curId = cur.parent_id;
    cur   = cache[curId] || null;
  }

  return path;
}

/**
 * Calcula o power budget GPON de um elemento CTO/splitter até a OLT
 * @param {string} itemId        - ID do elemento (CTO, splitter)
 * @param {number} [oltBudgetDb] - Budget da OLT em dB (usa SDR_OLT_BUDGET.default se omitido)
 * @returns {{ totalLoss: number, margem: number, budget: number, status: string, detail: object[], hops: number }}
 */
export function sdrPowerBudgetCalc(itemId, oltBudgetDb) {
  const perdas = window.SDR_PERDAS;
  const budget = oltBudgetDb || window.SDR_OLT_BUDGET.default;
  const path   = sdrTracePath(itemId);

  let totalLoss = perdas.conector_par;
  const detail  = [{ label: 'Conectores OLT+ONU (par)', loss: perdas.conector_par }];

  path.forEach(({ id, item }, idx) => {
    if (!item) return;

    // Splitter com ratio definido no elemento
    if ((item.type === 'splitter' || item.type === 'cto') && item.ratio) {
      const loss = perdas.splitter[item.ratio] || 0;
      if (loss > 0) {
        totalLoss += loss;
        detail.push({ label: `Splitter ${item.ratio} — ${item.nome || item.name || id}`, loss });
      }
    }

    // Cabo com comprimento real registrado
    if (item.type === 'cable' && item.length_m) {
      const loss = +((item.length_m / 1000) * perdas.cabo_db_km).toFixed(2);
      totalLoss += loss;
      detail.push({ label: `Cabo ${item.name || id} (${Math.round(item.length_m)}m)`, loss });
      return;
    }

    // Estimativa pelo gap geográfico para o próximo elemento da chain
    if (item.lat && item.lng && idx < path.length - 1) {
      const nxt = path[idx + 1]?.item;
      if (nxt?.lat && nxt?.lng) {
        const dm = window._haversineM(
          { lat: item.lat, lng: item.lng },
          { lat: nxt.lat,  lng: nxt.lng  }
        );
        if (dm > 20) {
          const loss = +((dm / 1000) * perdas.cabo_db_km).toFixed(2);
          totalLoss += loss;
          detail.push({ label: `Cabo estimado ~${Math.round(dm)}m`, loss });
        }
      }
    }
  });

  const margem = +(budget - totalLoss).toFixed(2);
  const status = margem < 0 ? 'crit'
               : margem < perdas.margem_min ? 'warn'
               : 'ok';

  return {
    totalLoss: +totalLoss.toFixed(2),
    margem,
    budget,
    status,
    detail,
    hops: path.length
  };
}

// ── Expor globais para compatibilidade com sdr-module.js ─────────────────────
window.sdrPowerBudgetCalc = sdrPowerBudgetCalc;
window._sdrTracePath      = sdrTracePath;
