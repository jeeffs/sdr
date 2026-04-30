# Ferramentas de Mapa, Monitoramento e Campo — Referência Técnica

> **Objetivo**: Documentar as ferramentas técnicas que suportam o desenvolvimento do SDR Map — biblioteca de mapas, monitoramento de rede, GIS gratuito e workflows de campo.  
> **Contexto SDR**: Implementar mapa interativo FTTH, integrar monitoramento Zabbix, entender o fluxo de trabalho dos técnicos.

---

## 1. Leaflet.js — Biblioteca de Mapas Open Source

**Site**: leafletjs.com  
**GitHub**: github.com/Leaflet/Leaflet  
**Licença**: BSD-2-Clause (totalmente gratuita)  
**Peso**: ~42KB (minificado + gzip)  
**Uso**: Alternativa open source ao Google Maps API — sem custo, sem chave de API obrigatória  

### Por que Leaflet para o SDR?

| Critério | Google Maps | Leaflet + OpenStreetMap |
|----------|------------|------------------------|
| Custo | Pago acima de 28.000 req/mês | **Gratuito** |
| Chave de API | Obrigatória + cartão | Não necessária (OSM) |
| Tile satélite | Excelente | Disponível (via plugins) |
| Customização | Limitada | Total |
| Offline | Não | Suportado |
| GeoJSON nativo | Limitado | **Nativo e completo** |
| Peso | Pesado | **Leve (42KB)** |

### Funcionalidades Principais

```javascript
// 1. Inicializar mapa
const map = L.map('mapa').setView([-22.9068, -43.1729], 13);

// 2. Tile layers disponíveis
// OpenStreetMap (gratuito, padrão)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Google Maps (requer API key)
L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}').addTo(map);

// Satélite Esri (gratuito!)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);

// 3. Marcador simples
L.marker([-22.9068, -43.1729])
  .bindPopup('<b>CTO-001</b><br>8 portas, 4 livres')
  .addTo(map);

// 4. Marcador customizado (ícone próprio)
const iconeCTO = L.icon({
  iconUrl: 'img/cto.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
L.marker(coords, { icon: iconeCTO }).addTo(map);

// 5. Linha (cabo óptico)
L.polyline([
  [-22.906, -43.172],
  [-22.908, -43.175],
  [-22.910, -43.178]
], {
  color: '#FF6600',  // laranja = cabo distribuição
  weight: 3,
  opacity: 0.8
}).addTo(map);

// 6. GeoJSON completo
fetch('rede.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: feature => ({
        color: feature.properties.tipo === 'backbone' ? '#FF0000' : '#FF6600',
        weight: feature.properties.tipo === 'backbone' ? 5 : 2
      }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <b>${feature.properties.nome}</b><br>
          Tipo: ${feature.properties.tipo}<br>
          Status: ${feature.properties.status}
        `);
      }
    }).addTo(map);
  });

// 7. Círculo de viabilidade
L.circle([-22.9068, -43.1729], {
  radius: 300,  // metros
  color: '#00C851',
  fillOpacity: 0.1
}).addTo(map);

// 8. Layers (on/off por tipo)
const layerCTOs = L.layerGroup();
const layerCabos = L.layerGroup();
const layerPostes = L.layerGroup();

L.control.layers(null, {
  'CTOs': layerCTOs,
  'Cabos': layerCabos,
  'Postes': layerPostes
}).addTo(map);
```

### Plugins Essenciais Leaflet

| Plugin | Função | CDN |
|--------|--------|-----|
| **Leaflet.markercluster** | Agrupa marcadores próximos | Sim |
| **Leaflet.heat** | Heatmap de densidade | Sim |
| **Leaflet.draw** | Desenhar polígonos/linhas no mapa | Sim |
| **Leaflet.awesome-markers** | Ícones Font Awesome nos marcadores | Sim |
| **Leaflet.Routing.Machine** | Rotas entre pontos | Sim |
| **Turf.js** | Análise geoespacial (distância, buffer, intersecção) | cdnjs |

### Instalação CDN (SDR — sem build tool)

```html
<!-- Leaflet CSS + JS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- MarkerCluster -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"/>
<script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>

<!-- Turf.js (análise geoespacial) -->
<script src="https://unpkg.com/@turf/turf/turf.min.js"></script>
```

### Turf.js — Cálculos Geoespaciais

```javascript
// Distância entre dois pontos (km)
const ponto1 = turf.point([-43.1729, -22.9068]);
const ponto2 = turf.point([-43.1800, -22.9100]);
const distancia = turf.distance(ponto1, ponto2, { units: 'kilometers' });
// → 0.85 km

// Buscar CTOs dentro de raio de 500m do cliente
const cliente = turf.point([-43.1729, -22.9068]);
const buffer = turf.buffer(cliente, 0.5, { units: 'kilometers' });
const ctosProximas = ctos.filter(cto => 
  turf.booleanPointInPolygon(turf.point(cto.coords), buffer)
);

// Comprimento de cabo (rota)
const rota = turf.lineString([[-43.172, -22.906], [-43.175, -22.908], [-43.178, -22.910]]);
const comprimento = turf.length(rota, { units: 'kilometers' });
// → 0.42 km
```

---

## 2. Zabbix — Monitoramento de Rede ISP

**Site**: zabbix.com  
**Licença**: GPL v2 (open source)  
**Versão atual**: Zabbix 7.x (2025)  
**Stack**: PHP + PostgreSQL/MySQL + Java Gateway  

### Por que Zabbix para ISPs?

- Padrão de mercado para ISPs brasileiros
- GeoSite Telecom integra com Zabbix nativamente
- Monitora: roteadores, switches, OLTs, servidores, links
- Templates prontos para ZTE, Huawei, MikroTik, Cisco
- Alertas por e-mail, SMS, WhatsApp, Telegram
- Gratuito e open source

### O que o Zabbix monitora em uma rede ISP

```
Infraestrutura monitorada via SNMP/ICMP/Agent:

OLTs (ZTE C300/C600, Huawei MA5800)
  ├── Status das portas PON
  ├── Sinal óptico recebido (RX) por ONU
  ├── ONUs online/offline
  ├── Temperatura e CPU da OLT
  └── Tráfego por porta (bps)

Roteadores/Switches de Borda
  ├── Uso de CPU e memória
  ├── Tráfego por interface (bps)
  ├── Status de links (up/down)
  └── BGP sessions

Servidores
  ├── CPU, memória, disco
  ├── Serviços rodando (nginx, RADIUS, etc.)
  └── Latência e disponibilidade

Links de trânsito
  ├── Latência
  ├── Perda de pacotes
  └── Uso de banda (upstream/downstream)
```

### Templates Prontos para ISP (Zabbix Share)

| Template | Equipamento | Download |
|----------|------------|---------|
| ZTE OLT by SNMP | ZTE C300, C600, C610 | zabbix.com/integrations |
| Huawei OLT | MA5800, MA5600 | Community Templates |
| MikroTik by SNMP | RouterOS | zabbix.com/integrations |
| Cisco IOS by SNMP | Cisco roteadores | Oficial |
| Linux by Zabbix Agent | Servidores | Oficial |
| Generic SNMP | Qualquer device SNMP | Oficial |

### Configurar Zabbix para ONU via SNMP

```
# ONU Individual via SNMP
# Adicionar host no Zabbix:
Host name: ONU-CLIENTE-JOAO
IP: 192.168.1.254 (IP da ONU)
Templates: Generic SNMP + Custom ONU

# Items importantes:
OID: 1.3.6.1.2.1.1.1.0  → sysDescr (modelo ONU)
OID: 1.3.6.1.2.1.1.3.0  → sysUpTime (uptime)
OID: 1.3.6.1.4.1.3902... → OID específico ZTE/Huawei para RX power

# Para monitorar via OLT (recomendado):
Configurar OLT como proxy SNMP
Template "ZTE OLT" → Low Level Discovery → ONUs automático
```

### Integração Zabbix ↔ SDR

```javascript
// Firebase Function — consultar status no Zabbix via API
const ZABBIX_URL = 'http://zabbix.seudominio.com.br/api_jsonrpc.php';
const ZABBIX_TOKEN = 'seu_token_api';

async function verificarStatusONU(hostId) {
  const response = await fetch(ZABBIX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'item.get',
      params: {
        output: ['itemid', 'name', 'lastvalue'],
        hostids: hostId,
        search: { name: 'ICMP ping' }
      },
      auth: ZABBIX_TOKEN,
      id: 1
    })
  });
  
  const data = await response.json();
  return data.result[0]?.lastvalue === '1' ? 'online' : 'offline';
}

// Obter problemas ativos (alertas)
async function getAlertasAtivos() {
  const response = await fetch(ZABBIX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'problem.get',
      params: {
        output: 'extend',
        recent: true,
        sortfield: ['eventid'],
        sortorder: 'DESC'
      },
      auth: ZABBIX_TOKEN,
      id: 1
    })
  });
  return (await response.json()).result;
}
```

### Alertas Úteis para ISP

```
Alertas recomendados no Zabbix:

OLT offline (ICMP falhou)              → Crítico
OLT temperatura alta (>65°C)           → Alerta
PON port down                          → Alerta
ONU offline por >15 min                → Info
Link de trânsito saturado (>90%)       → Alerta
Servidor RADIUS down                   → Crítico
Perda de pacotes >5% no link           → Alerta
Sinal ONU fraco (<-26dBm)              → Alerta
```

---

## 3. QGIS — GIS Gratuito para Planejamento FTTH

**Site**: qgis.org  
**Licença**: GPL (totalmente gratuito)  
**Plataforma**: Windows, Mac, Linux  
**Posição**: Referência mundial em GIS open source  

### O que é QGIS?

QGIS é um Sistema de Informação Geográfica profissional e gratuito. Muitos ISPs brasileiros usam o QGIS para planejar projetos FTTH antes de contratar um software especializado (OZmap, GeoSite, etc.).

### Uso Típico de ISPs no QGIS

1. **Importar base cartográfica** (OpenStreetMap, Google, shapefiles municipais)
2. **Desenhar rede** (postes, cabos, CTOs como layers separados)
3. **Calcular distâncias** e rotas de cabo
4. **Análise de viabilidade** (quais endereços dentro do raio de cada CTO)
5. **Exportar para GeoJSON** → importar em OZmap ou outro sistema
6. **Projeto de expansão** → área nova, calcular custo de implantação

### Plugins QGIS para FTTH

| Plugin | Função |
|--------|--------|
| **FiberQ** | Design de rede FTTH/GPON open source dentro do QGIS |
| **FTTH Fiber Optic Network Design System** | Design automático via algoritmos de grafo |
| **GeoFibra-FTTH** | Plugin Python para design FTTH, análise PostGIS |
| **Network Analysis** | Análise de grafos de rede |
| **QuickMapServices** | Acesso fácil a tiles de fundo (Google, Bing, etc.) |

### FiberQ — Plugin Open Source

**GitHub**: plugins.qgis.org/plugins/fiberq/  
**Foco**: Telecom engineers e GIS professionals  
**Capacidades**:
- Design de rede de fibra dentro do QGIS
- Análise de rede óptica
- Documentação de infraestrutura FTTH

### Workflow QGIS → SDR

```
1. ISP usa QGIS para planejar expansão
2. Exporta camadas como GeoJSON:
   - postes.geojson
   - cabos.geojson
   - ctos.geojson
   - clientes.geojson
3. SDR importa os GeoJSONs
4. Elementos ficam no mapa SDR prontos para ativar clientes
```

### Formatos de Dados QGIS → Interoperabilidade

| Formato | Compatível com |
|---------|---------------|
| **GeoJSON** | Leaflet, OZmap, SDR, qualquer sistema web |
| **Shapefile (.shp)** | ArcGIS, QGIS, sistemas GIS profissionais |
| **KML/KMZ** | Google Earth, Google Maps |
| **GeoPackage (.gpkg)** | Padrão moderno, substitui Shapefile |
| **CSV com lat/lng** | Qualquer banco de dados |
| **PostGIS** | PostgreSQL com extensão geoespacial |

---

## 4. Workflows de Campo — Como Técnicos Trabalham

### Fluxo Completo de Instalação de Cliente

```
FASE 1 — VENDA
├── Cliente solicita internet
├── ERP (MK/HubSoft) verifica viabilidade via mapa (OZmap/SDR)
│   └── Consulta: endereço → CTO mais próxima → porta disponível
├── ERP reserva porta na CTO
└── OS criada → atribuída ao técnico

FASE 2 — AGENDAMENTO
├── Técnico recebe OS no app mobile
├── App mostra: endereço, CTO, porta reservada, equipamentos
└── Técnico vai ao depósito pegar ONU + drop

FASE 3 — INSTALAÇÃO EM CAMPO
├── Técnico localiza CTO no mapa
├── Técnico testa sinal na CTO (OTDR ou power meter)
├── Passa o drop da CTO até o cliente (aéreo ou subterrâneo)
├── Instala ONU na residência
├── Conecta fibra drop na ONU
├── Liga ONU e verifica LEDs (PON ON = sinal óptico OK)
└── Registra serial number da ONU no app

FASE 4 — PROVISIONAMENTO
├── App mobile ou técnico via SSH na OLT:
│   └── Autoriza ONU pelo serial number → atribui profile GPON
├── OLT envia parâmetros via OMCI → ONU conecta ao ACS
├── ACS (GenieACS) detecta ONU → aplica preset:
│   ├── Configura PPPoE (usuário/senha)
│   ├── Configura WiFi (SSID/senha)
│   └── Configura VoIP (se houver)
├── ONU aparece online no ERP
└── Técnico confirma OS como concluída

FASE 5 — DOCUMENTAÇÃO
├── Técnico fotografa instalação no app
├── App geotagueia foto com GPS
├── Atualiza porta da CTO: livre → ocupada (cliente X)
├── OS fechada no ERP
└── ERP gera cobrança automática no próximo vencimento
```

### Workflow de Manutenção / Chamado

```
FASE 1 — CHAMADO
├── Cliente abre chamado (app, WhatsApp, telefone)
├── ERP cria OS de suporte
├── Sistema verifica: ONU online? Sinal ok? Zabbix alerta?
└── OS atribuída a técnico

FASE 2 — DIAGNÓSTICO REMOTO (sem ir ao campo)
├── Técnico verifica no sistema:
│   ├── Status ONU (online/offline)
│   ├── Sinal óptico (dBm atual vs. histórico)
│   ├── Uptime (quando foi a última queda)
│   └── Alertas Zabbix ativos
├── Se ONU offline → tentar reboot remoto via ACS
├── Se sinal fraco → verificar se é histórico (degradação) ou súbito
└── Se problema resolvido remoto → fechar OS

FASE 3 — VISITA TÉCNICA (se necessário)
├── Técnico vai ao campo com app
├── App mostra: CTO, rota de cabo, histórico de sinal
├── Técnico verifica:
│   ├── Conectores da ONU (sujeira, oxidação)
│   ├── Drop (dano físico, curvatura excessiva)
│   ├── CTO (splitter, conectores, água)
│   └── CEO (fusões, cabo)
├── Usa OTDR para localizar quebra (se cabo rompido)
└── Reparo → documenta → fecha OS
```

### Indicadores de Qualidade de Campo

| Indicador | Meta | Crítico |
|-----------|------|---------|
| Tempo médio de instalação | < 2 horas | > 4 horas |
| Tempo médio de reparo (MTTR) | < 4 horas | > 8 horas |
| % OS resolvidas remotamente | > 30% | < 10% |
| Reincidência de chamados (30 dias) | < 10% | > 25% |
| Satisfação pós-OS (NPS campo) | > 70 | < 50 |

---

## 5. Estrutura de Dados GeoJSON para SDR

### Schema Completo dos Elementos de Rede

```javascript
// POSTE
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-43.1729, -22.9068] },
  "properties": {
    "id": "POST-001",
    "tipo": "poste",
    "altura_m": 11,
    "proprietario": "CEMIG",
    "numero": "12345",
    "status": "implantado",    // projeto | implantado | certificado
    "foto_url": "...",
    "criado_em": "2026-04-18T10:00:00Z"
  }
}

// CABO ÓPTICO
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[-43.172, -22.906], [-43.175, -22.908], [-43.178, -22.910]]
  },
  "properties": {
    "id": "CABO-001",
    "tipo": "cabo",
    "subtipo": "backbone",     // backbone | distribuicao | drop
    "fibras": 24,
    "comprimento_m": 420,
    "tipo_instalacao": "aereo", // aereo | subterraneo | duto
    "status": "implantado",
    "cor": "#FF0000"            // cor no mapa: backbone=vermelho, dist=laranja, drop=azul
  }
}

// CEO (Caixa de Emenda Óptica)
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-43.1750, -22.9080] },
  "properties": {
    "id": "CEO-001",
    "tipo": "ceo",
    "nome": "CEO-BV-01",
    "capacidade_fibras": 48,
    "splitter": "1:4",
    "perda_splitter_db": 7.0,
    "status": "implantado",
    "foto_url": "..."
  }
}

// CTO (Caixa de Terminação Óptica)
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-43.1780, -22.9100] },
  "properties": {
    "id": "CTO-001",
    "tipo": "cto",
    "nome": "CTO-BV-001",
    "portas_total": 16,
    "portas_ocupadas": 12,
    "portas_livres": 4,
    "splitter": "1:16",
    "perda_splitter_db": 13.5,
    "ceo_origem": "CEO-001",
    "distancia_olt_km": 3.5,
    "perda_total_db": 24.83,
    "margem_db": 3.17,
    "status_sinal": "ok",      // ok | limite | inviavel
    "status": "implantado",
    "foto_url": "..."
  }
}

// CLIENTE
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-43.1785, -22.9105] },
  "properties": {
    "id": "CLI-001",
    "tipo": "cliente",
    "nome": "João da Silva",
    "cpf": "***.***.***-**",    // mascarado
    "contrato_mk": "12345",
    "cto_id": "CTO-001",
    "cto_porta": 3,
    "onu_serial": "ZTEG12345678",
    "onu_modelo": "ZTE F670L",
    "sinal_dbm": -22.5,
    "status": "ativo",          // ativo | suspenso | cancelado
    "plano": "300 Mega",
    "ativado_em": "2026-01-15T14:00:00Z"
  }
}
```

---

## 6. Referências e Links

### Leaflet.js
- Site oficial: leafletjs.com
- Docs GeoJSON: leafletjs.com/examples/geojson/
- Tutoriais: leafletjs.com/examples.html
- Turf.js (geoespacial): turfjs.org

### Zabbix
- Site: zabbix.com
- Templates: zabbix.com/integrations
- Community templates: github.com/zabbix/community-templates
- Fórum ZTE OLT SNMP: zabbix.com/forum (buscar "ZTE OLT SNMP")

### QGIS
- Site: qgis.org
- Plugin FiberQ: plugins.qgis.org/plugins/fiberq/
- Case study FTTH: qgis.org/pt_BR/site/about/case_studies/poland_ffth.html
- Curso FTTH + QGIS: udemy.com (buscar "FTTH QGIS")

### Tiles Gratuitos para Mapas
- OpenStreetMap: tile.openstreetmap.org (gratuito, atribuição obrigatória)
- Esri Satélite: server.arcgisonline.com (gratuito para não-comercial)
- Stamen: stamen.com/maps (gratuito)
- MapTiler: maptiler.com (freemium, satélite HD)

---

*Criado em: 2026-04-18*  
*Tags: #leaflet #zabbix #qgis #mapa #monitoramento #campo #workflow #geojson #ftth #sdr*  
*Relacionado: [[FTTH_PLATAFORMAS_MAPEAMENTO]], [[FTTH_NORMAS_ATENUACAO]], [[TR069_ACS_PLATAFORMAS]], [[ISP_ERPS_BRASILEIROS]], [[MK_SISTEMA_COLETADO]]*  
*Índice: [[SDR_INDEX]]*
