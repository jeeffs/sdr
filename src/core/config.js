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

// ── Expor como globais para compatibilidade com sdr-module.js ─────────────

window.SDR_TENANT        = SDR_TENANT;
window.SDR_BASE          = SDR_BASE;
window.INFRA_TYPES       = INFRA_TYPES;
window.SDR_CTO_ICONS     = SDR_CTO_ICONS;
window.SDR_CTO_COLOR_MAP = SDR_CTO_COLOR_MAP;
window.SDR_PERDAS        = SDR_PERDAS;
window.SDR_OLT_BUDGET    = SDR_OLT_BUDGET;
