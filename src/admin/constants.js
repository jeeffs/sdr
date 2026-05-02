// src/admin/constants.js
// Tabelas de preços, serviços, aliases e usuários padrão
// Extraído de admin.html Fase A

window.SERVICOS = [
  'MANUTENÇÃO EM CEO','MANUTENÇÃO EM CTO','INSTALAÇÃO DE PTO','INSTALAÇÃO DE CEIP-BW',
  'INSTALAÇÃO DE CEO','INSTALAÇÃO DE CTO','ACOMPANHAMENTO CPFL','LANÇAMENTO DE CABO',
  'LEVANTAMENTO DE REDE (POR CTO)','FUSÃO DE CORDÃO','REPUXE','CABO CROCADO',
  'INSERÇÃO DE CABO','INSTALAÇÃO DE SPLITER','FUSÃO',
  'EQUIPAGEM DE POSTE (FERRAGEN LEVE)','EQUIPAGEM DE POSTE (FERRAGEN PESADA)',
  'RETIRA DE SPLITER','TROCA DE BANDEJA','KM RODADO','LANÇAMENTO DE DROP',
  'INSTALAÇÃO DE CRUZETA','SERVIÇO DE RADIO','CERTIFICAÇÃO DE PORTAS OCUPADAS',
  'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)','INSTALAÇÃO DE PLAQUETAS',
  'ORGANIZAÇÃO DE CABOS EM CTO','RETIRADA DE EQUIPAMENTO',
];

window.PRECOS_V1 = {
  'MANUTENÇÃO EM CEO':62,'MANUTENÇÃO EM CTO':34,'INSTALAÇÃO DE PTO':20,
  'INSTALAÇÃO DE CEIP-BW':62,'INSTALAÇÃO DE CEO':62,'INSTALAÇÃO DE CTO':62,
  'ACOMPANHAMENTO CPFL':30,'LANÇAMENTO DE CABO':0.65,'LEVANTAMENTO DE REDE (POR CTO)':20,
  'FUSÃO DE CORDÃO':30,'REPUXE':0.4,'CABO CROCADO':62,'INSERÇÃO DE CABO':7,
  'INSTALAÇÃO DE SPLITER':5,'FUSÃO':8,'EQUIPAGEM DE POSTE (FERRAGEN LEVE)':14,
  'EQUIPAGEM DE POSTE (FERRAGEN PESADA)':20,'RETIRA DE SPLITER':5,'TROCA DE BANDEJA':5,
  'KM RODADO':1,'LANÇAMENTO DE DROP':0.35,'INSTALAÇÃO DE CRUZETA':15,
  'SERVIÇO DE RADIO':70,'CERTIFICAÇÃO DE PORTAS OCUPADAS':62,
  'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)':30,'INSTALAÇÃO DE PLAQUETAS':8,
  'ORGANIZAÇÃO DE CABOS EM CTO':5,'RETIRADA DE EQUIPAMENTO':30,
};

window.PRECOS_V2 = {
  'MANUTENÇÃO EM CEO':64,'MANUTENÇÃO EM CTO':35.5,'INSTALAÇÃO DE PTO':20,
  'INSTALAÇÃO DE CEIP-BW':64,'INSTALAÇÃO DE CEO':64,'INSTALAÇÃO DE CTO':64,
  'ACOMPANHAMENTO CPFL':31,'LANÇAMENTO DE CABO':0.8,'LEVANTAMENTO DE REDE (POR CTO)':20,
  'FUSÃO DE CORDÃO':32,'REPUXE':0.45,'CABO CROCADO':62,'INSERÇÃO DE CABO':7.25,
  'INSTALAÇÃO DE SPLITER':5.25,'FUSÃO':8.5,'EQUIPAGEM DE POSTE (FERRAGEN LEVE)':14.5,
  'EQUIPAGEM DE POSTE (FERRAGEN PESADA)':21,'RETIRA DE SPLITER':5.25,'TROCA DE BANDEJA':5.25,
  'KM RODADO':1,'LANÇAMENTO DE DROP':0.4,'INSTALAÇÃO DE CRUZETA':15,
  'SERVIÇO DE RADIO':70,'CERTIFICAÇÃO DE PORTAS OCUPADAS':64,
  'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)':30,'INSTALAÇÃO DE PLAQUETAS':8,
  'ORGANIZAÇÃO DE CABOS EM CTO':5,'RETIRADA DE EQUIPAMENTO':30,
};

window.PRECOS_V3 = {
  'MANUTENÇÃO EM CEO':106,'MANUTENÇÃO EM CTO':57,'INSTALAÇÃO DE PTO':27,
  'INSTALAÇÃO DE CEIP-BW':106,'INSTALAÇÃO DE CEO':106,'INSTALAÇÃO DE CTO':106,
  'ACOMPANHAMENTO CPFL':49,'LANÇAMENTO DE CABO':1.3,'LEVANTAMENTO DE REDE (POR CTO)':36,
  'FUSÃO DE CORDÃO':61,'REPUXE':1.1,'CABO CROCADO':106,'INSERÇÃO DE CABO':12,
  'INSTALAÇÃO DE SPLITER':16.5,'FUSÃO':14,'EQUIPAGEM DE POSTE (FERRAGEN LEVE)':24.5,
  'EQUIPAGEM DE POSTE (FERRAGEN PESADA)':36.5,'RETIRA DE SPLITER':16.5,'TROCA DE BANDEJA':11,
  'KM RODADO':1.2,'LANÇAMENTO DE DROP':0.5,'INSTALAÇÃO DE CRUZETA':33,
  'SERVIÇO DE RADIO':100,'CERTIFICAÇÃO DE PORTAS OCUPADAS':106,
  'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)':36,'INSTALAÇÃO DE PLAQUETAS':13,
  'ORGANIZAÇÃO DE CABOS EM CTO':11,'RETIRADA DE EQUIPAMENTO':44,
};

window.SERVICOS_DESC = {
  'INSTALAÇÃO DE CEO':'CEO e CRUZETA instalada no poste, cordoalha ou cabo.',
  'INSTALAÇÃO DE CRUZETA':'Somente em CEO antigas que NÃO tenha a cruzeta ou mudança da CEO para outro ponto.',
  'INSTALAÇÃO DE CTO':'CTO, SPLITER CTO, ACOPLADORES, instalada no poste, cordoalha ou cabo e 1 FUSÃO.',
  'INSTALAÇÃO DE CEIP-BW':'CEIP-BW, SPLITER CEIP-BW, ACOPLADORES, instalada no SHAFT de prédio ou DG e 1 FUSÃO.',
  'INSTALAÇÃO DE PTO':'DROP ou CABO, instalada no poste, cordoalha ou cabo e 1 FUSÃO.',
  'MANUTENÇÃO EM CEO':'Abrir e EXECUTAR mínimo 1 fusão.',
  'MANUTENÇÃO EM CTO':'Abrir e EXECUTAR mínimo 1 fusão.',
  'INSERÇÃO DE CABO':'Inserir cabo em CTO ou CEO.',
  'INSTALAÇÃO DE SPLITER':'SPLITER NC/NC ou troca de SPLITER 1/4 pra 1/8 ou 1/8 pra 1/16.',
  'RETIRA DE SPLITER':'SPLITER NC/NC, SPLITER 1/4, SPLITER 1/8 e SPLITER 1/16.',
  'TROCA DE BANDEJA':'Antiga CTO, pra trocar Spliter, troca BANDEJA.',
  'FUSÃO':'MENOS a FUSÃO da INSTALAÇÃO DE CTO e PTO.',
  'CABO CROCADO':'CABO CROCADO na entrada da CTO ou nas roldanas.',
  'LEVANTAMENTO DE REDE (POR CTO)':'Informações da CTO ou CEO: cabos, fibras, spliters, portas e clientes conectados.',
  'FUSÃO DE CORDÃO':'SOMENTE em caso de link Corporativo ou Dedicado.',
  'REPUXE':'Rompimentos ou troca de postes.',
  'LANÇAMENTO DE CABO':'Cabo, ferragens e plaquetas instaladas nos postes.',
  'LANÇAMENTO DE DROP':'Rede antiga feita com DROP ou alguns clientes link dedicado no drop.',
  'ACOMPANHAMENTO CPFL':'Troca de postes.',
  'EQUIPAGEM DE POSTE (FERRAGEN LEVE)':'Troca de poste ou SEM a FERRAGEM, exceto em LANÇAMENTO DE CABOS.',
  'EQUIPAGEM DE POSTE (FERRAGEN PESADA)':'Cabos Pesados 24FO pra cima e Cordoalha.',
  'KM RODADO':'FILIAL: ITUPEVA, LOUVEIRA e SP3; MATRIZ: JARINU, ATIBAIA, ITATIBA, BOM JESUS e SP4, uma vez por dia.',
  'CERTIFICAÇÃO DE PORTAS OCUPADAS':'SOMENTE com aparelho que faz este serviço.',
  'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)':'SOMENTE no armário, seja para rompimento ou atenuação.',
  'INSTALAÇÃO DE PLAQUETAS':'Aberto EXCEÇÃO para SP4.',
  'SERVIÇO DE RADIO':'NÃO executa mais este serviço.',
  'RETIRADA DE EQUIPAMENTO':'NÃO executa mais este serviço.',
  'ORGANIZAÇÃO DE CABOS EM CTO':'NÃO executa mais este serviço.',
};

window.SERVICE_ALIASES = {
  'LEVANTAMENTO DE REDE':            'LEVANTAMENTO DE REDE (POR CTO)',
  'LEVANTAMENTO DE REDE POR CTO':    'LEVANTAMENTO DE REDE (POR CTO)',
  'EQUIPAGEM DE POSTE':              'EQUIPAGEM DE POSTE (FERRAGEN LEVE)',
  'EQUIPAGEM DE POSTE FERRAGEN LEVE':'EQUIPAGEM DE POSTE (FERRAGEN LEVE)',
  'EQUIPAGEM POSTE FERRAGEN LEVE':   'EQUIPAGEM DE POSTE (FERRAGEN LEVE)',
  'EQUIPAGEM DE POSTE FERRAGEN PESADA':'EQUIPAGEM DE POSTE (FERRAGEN PESADA)',
  'EQUIPAGEM POSTE FERRAGEN PESADA': 'EQUIPAGEM DE POSTE (FERRAGEN PESADA)',
  'INSTALAÇÃO DE CEIP/BW':           'INSTALAÇÃO DE CEIP-BW',
  'INSTALACAO DE CEIP/BW':           'INSTALAÇÃO DE CEIP-BW',
  'INSTALAÇÃO DE CEIP BW':           'INSTALAÇÃO DE CEIP-BW',
  'OTDR':                            'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)',
  'OTDR ARMARIO':                    'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)',
  'OTDR ARMARIO ROMPIMENTO ATENUAÇÃO':'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)',
  'OTDR ARMARIO ROMPIMENTO-ATENUAÇÃO':'OTDR ARMARIO (ROMPIMENTO-ATENUAÇÃO)',
  'CERTIFICAÇÃO DE PORTAS':          'CERTIFICAÇÃO DE PORTAS OCUPADAS',
  'CERTIFICACAO DE PORTAS':          'CERTIFICAÇÃO DE PORTAS OCUPADAS',
};

window.FILIAL_CIDADES = ['VÁRZEA PAULISTA','JUNDIAÍ','ITATIBA','ITUPEVA','INDAIATUBA','CABREUVA','LOUVEIRA','SP3','JACARÉ'];
window.MATRIZ_CIDADES = ['CAMPO LIMPO PAULISTA','JARINU','BOM JESUS DOS PERDÕES','ATIBAIA','SP4','ITATIBA','BOTUJURU','FRANCISCO MORATO'];

window.USERS_INIT = [
  {id:'master',    name:'JA',       role:'master'},
  {id:'jefferson', name:'Jefferson', role:'user', nivel:'V1'},
  ...Array.from({length:10},(_,i)=>({id:`tecnico${i+1}`,name:`Prestador ${i+1}`,role:'user',nivel:'V1'}))
];

// ── Helpers de nível — usados pelo bundle (window.xxx para acesso via tecnicos.js) ──
window._NIVEL_NOMES = { V0:'Gestão', V1:'Prestador', V2:'PRESTADOR', V3:'Admin', V4:'Observador' };
window._safeNivel = function(n) { return window._NIVEL_NOMES[n] || 'Prestador'; };

// ── Helpers de role — definidos como var para hoist no IIFE flat do Rollup ──
// Idênticos ao window.xxx de admin.html, duplicados para que módulos do bundle
// possam chamá-los sem prefixo window. (ex: _isAdmin(currentUser))
// eslint-disable-next-line no-var
var _isAdmin      = function(u) { return u?.role === 'master'; };
// eslint-disable-next-line no-var
var _isFiscal     = function(u) { return (u?.nivel || 'V1') === 'V0'; };
// eslint-disable-next-line no-var
var _isObservador = function(u) { return (u?.nivel || 'V1') === 'V4'; };
// eslint-disable-next-line no-var
var _isV3Import   = function(u) { return (u?.name||'').toLowerCase() === 'jefferson' && u?.role !== 'master'; };
window._isAdmin      = _isAdmin;
window._isFiscal     = _isFiscal;
window._isObservador = _isObservador;
window._isV3Import   = _isV3Import;

// ── Helpers de OS importada — usados por os.js e dashboard_admin.js sem window. ──
// eslint-disable-next-line no-var
var _isImportada = function(r) { return r?.importado === true; };
// eslint-disable-next-line no-var
var _isImportadaConcluida = function(r) {
  if (!r?.importado) return false;
  if (r.validacaoFiscal === 'importada') return true;
  // Retrocompat: importações antigas sem campo — se mês anterior ao vigente, é concluída
  const _h = new Date();
  const _mv = `${_h.getFullYear()}-${String(_h.getMonth()+1).padStart(2,'0')}`;
  return (r.data||'').slice(0,7) < _mv;
};
window._isImportada           = _isImportada;
window._isImportadaConcluida  = _isImportadaConcluida;

window._normServico = function(tipo) {
  if (!tipo) return tipo;
  const t = tipo.replace(/\xa0/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
  if (window.SERVICE_ALIASES[t]) return window.SERVICE_ALIASES[t];
  const sem = t.normalize('NFD').replace(/[̀-ͯ]/g,'');
  for (const [alias, canon] of Object.entries(window.SERVICE_ALIASES)) {
    const aliasNorm = alias.normalize('NFD').replace(/[̀-ͯ]/g,'');
    if (sem === aliasNorm) return canon;
  }
  const tSlash = t.replace(/\//g, '-');
  if (tSlash !== t && window.SERVICE_ALIASES[tSlash]) return window.SERVICE_ALIASES[tSlash];
  return tipo.replace(/\xa0/g,' ').replace(/\s+/g,' ').trim();
};
