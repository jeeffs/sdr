/**
 * Configuracao central do SDR — constantes de infraestrutura
 * Exporta todos os tipos, icones, perdas opticas e budget da OLT
 */

// ── Tenant / base do banco ────────────────────────────────────────────────

export const SDR_TENANT = 'default_tenant';
export const SDR_BASE   = `sdr_comercial/${SDR_TENANT}`;

// ── Tipos de infraestrutura — label, icon FontAwesome, cor e classe ───────

export const INFRA_TYPES = {
  pole:     { label: 'Poste',            icon: 'fa-bolt',           color: '#d97706', iconClass: 'pole'     },
  cto:      { label: 'CTO',              icon: 'fa-box',            color: '#2563eb', iconClass: 'cto'      },
  ceo:      { label: 'CEO',              icon: 'fa-project-diagram',color: '#2563eb', iconClass: 'cto'      },
  rt:       { label: 'Reserva Tecnica',  icon: 'fa-tape',           color: '#16a34a', iconClass: 'cable'    },
  emd:      { label: 'Emenda',           icon: 'fa-link',           color: '#0891b2', iconClass: 'cto'      },
  spl:      { label: 'Splitter',         icon: 'fa-code-branch',    color: '#9333ea', iconClass: 'splitter' },
  cable:    { label: 'Cabo',             icon: 'fa-wave-square',    color: '#16a34a', iconClass: 'cable'    },
  splitter: { label: 'Splitter',         icon: 'fa-code-branch',    color: '#9333ea', iconClass: 'splitter' },
  olt:      { label: 'OLT',              icon: 'fa-server',         color: '#dc2626', iconClass: 'olt'      }
};

// ── Icones de marcador por subtipo de caixa ───────────────────────────────

export const SDR_CTO_ICONS = {
  '1/16':          { bg: '#000000', fg: '#ffffff', label: '1:16', icon: 'fa-box'            },
  '1/8':           { bg: '#1e40af', fg: '#ffffff', label: '1:8',  icon: 'fa-box'            },
  '1/4':           { bg: '#7c3aed', fg: '#ffffff', label: '1:4',  icon: 'fa-box'            },
  'splitter':      { bg: '#0891b2', fg: '#ffffff', label: 'SPL',  icon: 'fa-code-branch'    },
  'nao_instalada': { bg: '#ef4444', fg: '#ffffff', label: 'N/I',  icon: 'fa-times-circle'   },
  'emenda':        { bg: '#f97316', fg: '#ffffff', label: 'EMD',  icon: 'fa-link'           },
  'ceo':           { bg: '#ea580c', fg: '#ffffff', label: 'CEO',  icon: 'fa-project-diagram'},
  'rt':            { bg: '#16a34a', fg: '#ffffff', label: 'RT',   icon: 'fa-tape'           },
  'default':       { bg: '#2563eb', fg: '#ffffff', label: 'CTO',  icon: 'fa-box'            }
};

// ── Mapa de cores KMZ → subtipo de CTO ───────────────────────────────────

export const SDR_CTO_COLOR_MAP = [
  { hex: ['#000000','#111111','#222222','#0a0a0a','#1a1a1a'],            cto_type: '1/16',          ports: 16, label: 'CTO 1/16'        },
  { hex: ['#ffffff','#eeeeee','#f0f0f0','#dddddd','#f5f5f5'],            cto_type: '1/8',           ports: 8,  label: 'CTO 1/8'         },
  { hex: ['#8b4513','#6b3410','#7b3d1e','#a0522d','#92400e'],            cto_type: '1/4',           ports: 4,  label: 'CTO 1/4'         },
  { hex: ['#ffff00','#ffd700','#f0e000','#eab308'],                      cto_type: 'splitter',      ports: 8,  label: 'CTO c/ Splitter' },
  { hex: ['#ff0000','#cc0000','#dd0000','#ef4444'],                      cto_type: 'nao_instalada', ports: 16, label: 'Nao Instalada'   },
  { hex: ['#ff8000','#ff7f00','#ff6600','#f97316'],                      cto_type: 'emenda',        ports: 0,  label: 'CTO Emenda'      },
  { hex: ['#0000ff','#0000cc','#1d4ed8','#2563eb','#3b82f6'],            cto_type: 'ceo',           ports: 16, label: 'CEO'             },
  { hex: ['#00ff00','#00cc00','#22c55e','#10b981','#16a34a','#4ade80'],  cto_type: 'rt',            ports: 0,  label: 'RT (Reserva)'    }
];

// ── Perdas opticas — valores tipicos @1310nm (SMF G.652D) ────────────────
// Referencia: Furukawa / normas ITU-T G.984 (GPON)

export const SDR_PERDAS = {
  cabo_db_km:   0.35,   // dBm/km @ 1310nm (SMF G.652D)
  splitter: {
    '1:2':  3.5,
    '1:4':  7.0,
    '1:8':  10.5,
    '1:16': 13.5,
    '1:32': 17.0,
    '1:64': 20.5
  },
  conector_par: 0.5,    // par de conectores (OLT + ONU)
  emenda_fusao: 0.1,    // por emenda de fusao
  margem_min:   3.0     // margem minima de seguranca (dB)
};

// ── Budget de potencia da OLT por classe optica ───────────────────────────
// Classe B+: 28 dB | Classe C+: 32 dB (ITU-T G.984.2)

export const SDR_OLT_BUDGET = {
  'B+':      28,
  'C+':      32,
  'default': 28
};

// ── Estilos de renderização de cabo por tipo ──────────────────────────────

export const CABLE_RENDER = {
  backbone:     { color: '#1d4ed8', weight: 5 },
  distribuicao: { color: '#16a34a', weight: 4 },
  drop:         { color: '#f59e0b', weight: 3 },
  projeto:      { color: '#06b6d4', weight: 3 },
  unknown:      { color: '#8b5cf6', weight: 3 }
};

// ── Cor de renderização por contagem de fibras ────────────────────────────

export const CABLE_FIBER_COLOR = {
  6:   { color: '#2563eb', weight: 3, label: '6FO'   },
  12:  { color: '#16a34a', weight: 4, label: '12FO'  },
  24:  { color: '#eab308', weight: 4, label: '24FO'  },
  36:  { color: '#f97316', weight: 5, label: '36FO'  },
  48:  { color: '#ec4899', weight: 5, label: '48FO'  },
  72:  { color: '#dc2626', weight: 5, label: '72FO'  },
  144: { color: '#8b5cf6', weight: 6, label: '144FO' }
};

// ── Mapa de cores KMZ → tipo/fibras de cabo ───────────────────────────────
// verde=12FO, azul=6FO, amarelo=24FO, laranja=36FO, rosa=48FO, vermelho=72FO,
// violeta=144FO, aqua=projeto

export const SDR_CABLE_COLOR_MAP = [
  { hex: ['#00ff00','#008000','#00aa00','#00cc00','#006400','#22c55e'], cabo: 'distribuicao', fibers: 12, label: 'Distribuição 12FO' },
  { hex: ['#0000ff','#0000cc','#0000aa','#1e40af','#1d4ed8','#3b82f6'], cabo: 'distribuicao', fibers: 6,  label: 'Distribuição 6FO'  },
  { hex: ['#ffff00','#ffd700','#f0e000','#ffe000','#eab308'],            cabo: 'distribuicao', fibers: 24, label: 'Distribuição 24FO' },
  { hex: ['#ff8000','#ff7f00','#ff6600','#ff4500','#f97316'],            cabo: 'backbone',     fibers: 36, label: 'Backbone 36FO'     },
  { hex: ['#ff69b4','#ff1493','#ff00ff','#ee00cc','#ec4899'],            cabo: 'backbone',     fibers: 48, label: 'Backbone 48FO'     },
  { hex: ['#ff0000','#cc0000','#dd0000','#ee0000','#ef4444'],            cabo: 'backbone',     fibers: 72, label: 'Backbone 72FO'     },
  { hex: ['#9400d3','#8b008b','#7b00c3','#aa00dd','#a855f7'],            cabo: 'backbone',     fibers: 144,label: 'Backbone 144FO'    },
  { hex: ['#00ffff','#00cccc','#00aaaa','#22d3ee','#06b6d4'],            cabo: 'projeto',      fibers: 0,  label: 'Projeto'          }
];

// ── Expor como globais para compatibilidade com sdr-module.js ─────────────

window.SDR_TENANT          = SDR_TENANT;
window.SDR_BASE            = SDR_BASE;
window.INFRA_TYPES         = INFRA_TYPES;
window.SDR_CTO_ICONS       = SDR_CTO_ICONS;
window.SDR_CTO_COLOR_MAP   = SDR_CTO_COLOR_MAP;
window.SDR_PERDAS          = SDR_PERDAS;
window.SDR_OLT_BUDGET      = SDR_OLT_BUDGET;
window.CABLE_RENDER        = CABLE_RENDER;
window.CABLE_FIBER_COLOR   = CABLE_FIBER_COLOR;
window.SDR_CABLE_COLOR_MAP = SDR_CABLE_COLOR_MAP;
