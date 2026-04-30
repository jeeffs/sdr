/**
 * Padrões de fibra óptica e topologias de splitagem — SDR
 * Padrão ABNT NBR 14100 (Brasil) e TIA-598 (EUA/Internacional)
 */

// ── Padrões de cores de fibra ──────────────────────────────────────────────

export const SDR_FIBER_STANDARDS = {
  abnt: {
    name: 'ABNT NBR 14100 (Brasil)',
    short: 'ABNT',
    fibers: [
      { num: 1,  color: '#16a34a', name: 'Verde' },
      { num: 2,  color: '#eab308', name: 'Amarelo' },
      { num: 3,  color: '#ffffff', name: 'Branco', border: '#999' },
      { num: 4,  color: '#2563eb', name: 'Azul' },
      { num: 5,  color: '#dc2626', name: 'Vermelho' },
      { num: 6,  color: '#7c3aed', name: 'Violeta' },
      { num: 7,  color: '#8b4513', name: 'Marrom' },
      { num: 8,  color: '#ec4899', name: 'Rosa' },
      { num: 9,  color: '#000000', name: 'Preto' },
      { num: 10, color: '#6b7280', name: 'Cinza' },
      { num: 11, color: '#f97316', name: 'Laranja' },
      { num: 12, color: '#06b6d4', name: 'Aqua' }
    ],
    // T1=Verde (piloto), T2=Amarelo (direcional), demais=Branco
    tubeColor: function(tubeNum) {
      if (tubeNum === 1) return { color: '#16a34a', name: 'Verde (piloto)' };
      if (tubeNum === 2) return { color: '#eab308', name: 'Amarelo (direcional)' };
      return { color: '#ffffff', name: 'Branco', border: '#999' };
    }
  },
  tia: {
    name: 'TIA-598 (EUA/Internacional)',
    short: 'TIA-598',
    fibers: [
      { num: 1,  color: '#2563eb', name: 'Blue' },
      { num: 2,  color: '#f97316', name: 'Orange' },
      { num: 3,  color: '#16a34a', name: 'Green' },
      { num: 4,  color: '#8b4513', name: 'Brown' },
      { num: 5,  color: '#6b7280', name: 'Slate' },
      { num: 6,  color: '#ffffff', name: 'White', border: '#999' },
      { num: 7,  color: '#dc2626', name: 'Red' },
      { num: 8,  color: '#000000', name: 'Black' },
      { num: 9,  color: '#eab308', name: 'Yellow' },
      { num: 10, color: '#7c3aed', name: 'Violet' },
      { num: 11, color: '#ec4899', name: 'Rose' },
      { num: 12, color: '#06b6d4', name: 'Aqua' }
    ],
    // Tubos seguem sequência TIA-598
    tubeColor: function(tubeNum) {
      const colors = this.fibers;
      const idx = (tubeNum - 1) % 12;
      return { color: colors[idx].color, name: colors[idx].name, border: colors[idx].border };
    }
  }
};

// ── Configuração de tubos por tamanho de cabo ─────────────────────────────

export const SDR_CABLE_TUBE_CONFIG = {
  6:         [{ fibers: 6 }],
  12:        [{ fibers: 12 }],
  '12_2x6':  [{ fibers: 6 }, { fibers: 6 }],
  '12_6x2':  [{ fibers: 2 }, { fibers: 2 }, { fibers: 2 }, { fibers: 2 }, { fibers: 2 }, { fibers: 2 }],
  24:        [{ fibers: 6 }, { fibers: 6 }, { fibers: 6 }, { fibers: 6 }],
  36:        [{ fibers: 6 }, { fibers: 6 }, { fibers: 6 }, { fibers: 6 }, { fibers: 6 }, { fibers: 6 }],
  48:        [{ fibers: 12 }, { fibers: 12 }, { fibers: 12 }, { fibers: 12 }],
  72:        [{ fibers: 12 }, { fibers: 12 }, { fibers: 12 }, { fibers: 12 }, { fibers: 12 }, { fibers: 12 }],
  144:       [
    { fibers: 12 }, { fibers: 12 }, { fibers: 12 }, { fibers: 12 },
    { fibers: 12 }, { fibers: 12 }, { fibers: 12 }, { fibers: 12 },
    { fibers: 12 }, { fibers: 12 }, { fibers: 12 }, { fibers: 12 }
  ]
};

// ── Perdas de inserção — Splitters Furukawa (dB típicos @1550nm) ──────────

export const SDR_SPLITTER_LOSS = {
  balanced: {
    '1:2':  { loss: 3.7,  uniformity: 0.5 },
    '1:4':  { loss: 7.1,  uniformity: 0.6 },
    '1:8':  { loss: 10.5, uniformity: 1.0 },
    '1:16': { loss: 13.7, uniformity: 1.3 },
    '1:32': { loss: 17.1, uniformity: 1.6 },
    '1:64': { loss: 20.5, uniformity: 2.0 }
  },
  unbalanced: {
    '50/50': { loss_p1: 3.7,  loss_p2: 3.7 },
    '30/70': { loss_p1: 5.9,  loss_p2: 2.0 },
    '20/80': { loss_p1: 7.9,  loss_p2: 1.4 },
    '15/85': { loss_p1: 9.6,  loss_p2: 1.0 },
    '10/90': { loss_p1: 11.0, loss_p2: 0.7 }
  }
};

// ── Topologias de splitagem conhecidas ────────────────────────────────────

export const SDR_SPLITTER_TOPOLOGIES = {
  '128': {
    label: '128 portas/PON (balanceada)',
    levels: [
      { grau: 1, ratio: '1:2', loss: 3.7  },
      { grau: 2, ratio: '1:8', loss: 10.5 },
      { grau: 3, ratio: '1:8', loss: 10.5 }
    ],
    totalPorts: 128,
    totalLoss: 24.7
  },
  '512': {
    label: '512 portas/PON (balanceada)',
    levels: [
      { grau: 1, ratio: '1:2',  loss: 3.7  },
      { grau: 2, ratio: '1:16', loss: 13.7 },
      { grau: 3, ratio: '1:16', loss: 13.7 }
    ],
    totalPorts: 512,
    totalLoss: 31.1
  },
  '192': {
    label: '192 portas/PON (desbalanceada)',
    levels: [
      { grau: 1, ratio: '1:2', loss: 3.7  },
      { grau: 2, ratio: '1:4', loss: 7.1  },
      { grau: 3, ratio: '1:8', loss: 10.5 }
    ],
    note: '4 splitters 1:4 no 2o grau x 8 no 3o = ~192 portas',
    totalPorts: 192,
    totalLoss: 21.3
  }
};

// ── Expor como globais para compatibilidade com sdr-module.js ─────────────
// sdr-bundle.js carrega antes do sdr-module.js, então estas globais
// estão disponíveis quando o IIFE do sdr-module.js executa.

window.SDR_FIBER_STANDARDS    = SDR_FIBER_STANDARDS;
window.SDR_CABLE_TUBE_CONFIG  = SDR_CABLE_TUBE_CONFIG;
window.SDR_SPLITTER_LOSS      = SDR_SPLITTER_LOSS;
window.SDR_SPLITTER_TOPOLOGIES = SDR_SPLITTER_TOPOLOGIES;
