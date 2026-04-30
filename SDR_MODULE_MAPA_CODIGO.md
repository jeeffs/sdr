# SDR Module — Mapa Completo do Código Fonte
> Arquivo: `public/sdr-module.js` | Total: ~5114 linhas | Gerado em: 2026-04-18
> Caminho completo: `C:\Users\Jeeff\OneDrive\Documentos\ObsidianAI\Claude\SDR\public\sdr-module.js`

---

## Visão Geral da Arquitetura

```
sdr-module.js
├── Bootstrap (linhas 1–131)          → Injeta páginas e menus no admin.html
├── CSS Injetado (132–224)            → Estilos do mapa, modais, toolbar
├── Constantes e Padrões (226–360)    → SDR_TENANT, INFRA_TYPES, SDR_FIBER_STANDARDS
├── Mapa Leaflet (474–802)            → Inicialização, camadas, marcadores
├── Infraestrutura (803–1152)         → CRUD de postes, CTOs, cabos, splitters
├── Clientes FTTH (1153–1376)         → Lista, busca, painel lateral
├── OLTs — Módulo Comercial (1377–2590) → Cards, chassis visual, PONs, DGO
├── ONUs (2591–2940)                  → Lista, painel, CRUD
├── Alertas (2941–3009)               → Heatmap, lista de alertas
├── Dashboard de Rede (3010–3223)     → Gráficos, KPIs
├── Chamados/Tickets (3224–3516)      → CRUD de chamados
├── Ferramentas de Desenho (3517–3869) → Draw mode, linhas, polígonos
├── KMZ/KML Import (3870–4245)        → Import, preview, conversão
├── HTML Templates (4277–4419)        → _sdrHtml_* → retornam HTML das páginas
├── MK Solutions Integration (4420–5009) → Config, sync, demo, topologia
└── Context Menu Engine (5010–5114)   → Menu direito profissional
```

---

## Constantes Globais (linhas 229–360)

```javascript
const SDR_TENANT = 'default_tenant';
const SDR_BASE   = 'sdr_comercial/default_tenant';

// Tipos de infraestrutura no mapa
const INFRA_TYPES = {
  pole, cto, cable, splitter, olt
};

// Padrões de fibra (ABNT NBR 14100 e TIA-598)
const SDR_FIBER_STANDARDS = { abnt, tia };

// Configuração de tubos por tamanho de cabo
const SDR_CABLE_TUBE_CONFIG = {
  6, 12, '12_2x6', '12_6x2', 24, 36, 48, 72, 144
};

// Perdas de inserção — Splitters Furukawa
const SDR_SPLITTER_LOSS = { balanced, unbalanced };

// Topologias conhecidas
const SDR_SPLITTER_TOPOLOGIES = { '128', '512', '192' };
```

---

## Índice Completo de Funções

### Bootstrap e Inicialização

| Linha | Função | Descrição |
|---|---|---|
| 1 | `_sdrBootstrap()` | IIFE — injeta páginas e menus no admin.html |
| 112 | `showPage(name)` | Patch do showPage para inicializar módulos SDR |
| 362 | `_getTubeConfig(fiberCount)` | Retorna config de tubos para tamanho de cabo |
| 365 | `_getTubeColor(tubeNum)` | Retorna cor do tubo no padrão ativo |
| 370 | `sdrSetFiberStandard(std)` | Muda padrão ABNT/TIA e salva em localStorage |
| 378 | `sdrShowFiberStandardModal()` | Modal de seleção de padrão de cores |
| 473 | `sdrRef(path)` | Wrapper Firebase → `db.ref(SDR_BASE + '/' + path)` |

---

### Mapa Leaflet (linhas 474–802)

| Linha | Função | Descrição |
|---|---|---|
| 479 | `sdrMapInit()` | Inicializa mapa Leaflet, centro em Jundiaí-SP |
| 535 | `sdrMapReloadData()` | Recarrega todos os dados do Firebase |
| 557 | `sdrMapRenderInfra()` | Renderiza postes, CTOs, cabos, splitters |
| 565 | `sdrMapRenderClients()` | Renderiza markers de clientes |
| 586 | `sdrMapRenderOlts()` | Renderiza markers de OLTs |
| 604 | `_infraPopup(id, item)` | Gera HTML do popup de infraestrutura |
| 614 | `sdrUpdateMapInfo()` | Atualiza contadores do painel lateral |
| 624 | `sdrMapToggleLayer(layer)` | Liga/desliga camada (clients/ctos/poles/cables/olts/heatmap) |
| 635 | `sdrMapCenterOnMe()` | Centraliza mapa no GPS do usuário |
| 649 | `sdrMapAddItem()` | Abre modal de adição de infra |
| 657 | `sdrOpenInfraPanel(id, item)` | Abre painel lateral de infraestrutura |
| 693 | `sdrOpenClientePanel(id, c)` | Abre painel lateral de cliente |
| 754 | `sdrCloseSidePanel()` | Fecha painel lateral |
| 758 | `sdrMapFlyTo(lat, lng)` | Anima mapa até coordenada |
| 770 | `sdrToggleMapClickMode()` | Toggle modo de captura de clique no mapa |
| 785 | `sdrMapClickCapture(lat, lng)` | Captura coordenada do clique |

---

### Infraestrutura (linhas 801–1152)

| Linha | Função | Descrição |
|---|---|---|
| 801 | `_sdrShowAddModal(editId, editData)` | Modal de adicionar/editar item de infra |
| 947 | `sdrCancelMapClickMode()` | Cancela modo de clique |
| 955 | `sdrGetGPS()` | Captura GPS para form de infra |
| 1046 | `sdrInfraEdit(id)` | Abre modal de edição |
| 1052 | `sdrInfraDelete(id)` | Deleta item do Firebase |
| 1060 | `_fileToBase64(file)` | Converte arquivo para base64 |
| 1073 | `sdrInfraRender()` | Renderiza grid de infraestrutura |
| 1081 | `_renderInfraGrid()` | Monta HTML do grid de cards |
| 1145 | `sdrInfraAdd()` | Botão "Adicionar" na toolbar |

---

### Clientes FTTH (linhas 1153–1376)

| Linha | Função | Descrição |
|---|---|---|
| 1153 | `sdrClientesRender()` | Inicializa página de clientes |
| 1160 | `_renderClientesLista()` | Renderiza lista de clientes com filtros |
| 1234 | `sdrMapFlyToClient(id)` | Centraliza mapa no cliente |
| 1242 | `sdrClienteAdd()` | Botão "Adicionar Cliente" |
| 1246 | `sdrClienteEdit(id)` | Abre modal de edição de cliente |
| 1252 | `_sdrShowClienteModal(editId, d)` | Modal CRUD de cliente |
| 1319 | `sdrGetGPSCliente()` | Captura GPS para form de cliente |
| 1377 | `sdrOltsRender()` | Versão inicial — render de OLTs (substituída) |
| 1410 | `sdrOltAdd()` | Botão "Adicionar OLT" (versão inicial) |
| 1418 | `sdrAlertasRender()` | Versão inicial de alertas (substituída) |
| 1449 | `sdrAlertaAck()` | Reconhece alerta |

---

### Dashboard de Rede (linhas 1463–1564)

| Linha | Função | Descrição |
|---|---|---|
| 1463 | `sdrDashRedeRender()` | Dashboard com KPIs de rede (versão inicial) |
| 1565 | `_mapColumn(header)` | Normaliza cabeçalhos de planilha |
| 1573 | `_normalizeFinStatus(val)` | Normaliza status financeiro |

---

### Painel Lateral do Cliente (linhas 1827–2016)

| Linha | Função | Descrição |
|---|---|---|
| 1814 | `_sdrCtoOcupacao(ctoId)` | Calcula ocupação de uma CTO |
| 1821 | `_sdrCtosDoPoste(poleId)` | Lista CTOs de um poste |
| 1827 | `sdrOpenClientePanel(id, c)` | Abre painel lateral do cliente (versão 2) |
| 1839 | `_buildClientePanel(id, c)` | Monta HTML completo do painel de cliente |

---

### OLTs — Módulo FTTH Comercial (linhas 2017–2590)

| Linha | Função | Descrição |
|---|---|---|
| 2017 | `sdrOltsRender()` | **Versão principal** — lista de OLTs com cards |
| 2090 | `sdrOltAddModal(editId)` | Modal CRUD de OLT |
| 2183 | `sdrOpenOltPanel(id)` | Painel lateral de OLT com PONs e ONUs |
| 2242 | `sdrOltVisualModal(oltId)` | **Chassis visual** — grid Slot×PON com cores de status |
| 2350 | `sdrPonConfig(oltId, slot, port)` | Modal de configuração de PON individual |
| 2400 | `sdrPonDgoChange()` | Atualiza DGOs disponíveis ao trocar seleção |
| 2406 | `sdrPonSave(oltId, slot, port)` | Salva config da PON no Firebase |
| 2430 | `sdrPonSelectFiber(oltId, slot, port)` | Abre modal de seleção de fibra no DGO |
| 2436 | `sdrDgo144Modal(dgoId, oltId, slot, port)` | **Grid 144 fibras** — 12 tubos × 12 fibras c/ cores ABNT/TIA |
| 2496 | `sdrDgo144View(dgoId)` | View-only do DGO sem selecionar fibra |
| 2498 | `sdrFiberSelect(oltId, slot, port, dgoId, fiberKey)` | **Conecta fibra** — libera anterior, marca nova, atualiza PON |
| 2525 | `sdrDgoCriarModal(oltId)` | Modal de criação de DGO |
| 2552 | `sdrDgoCalc()` | Recalcula fibras ao editar form de DGO |
| 2559 | `sdrDgoSalvar(oltId)` | Salva DGO novo no Firebase |
| 2577 | `sdrOltSlotAdd(oltId)` | Adiciona slot extra à OLT |

---

### ONUs (linhas 2591–2940)

| Linha | Função | Descrição |
|---|---|---|
| 2591 | `sdrOnusRender()` | Inicializa página de ONUs |
| 2604 | `_renderOnusLista()` | Renderiza lista de ONUs |
| 2696 | `sdrOnuAdd()` | Abre modal de nova ONU |
| 2697 | `sdrOnuEdit(id)` | Abre modal de edição de ONU |
| 2699 | `_sdrShowOnuModal(editId, d)` | Modal CRUD de ONU |
| 2817 | `sdrOpenOnuPanel(id)` | Painel lateral da ONU |

---

### Alertas e Heatmap (linhas 2941–3009)

| Linha | Função | Descrição |
|---|---|---|
| 2941 | `sdrAlertasRender()` | **Versão principal** — lista de alertas |
| 2960 | `sdrRenderHeatmap()` | Renderiza camada de heatmap no mapa |

---

### Dashboard de Rede — Versão Principal (linhas 3010–3223)

| Linha | Função | Descrição |
|---|---|---|
| 3010 | `sdrDashRedeRender()` | **Versão principal** — KPIs, gráficos Chart.js |
| 3214 | `_sdrDestroyChart(id)` | Destrói instância de gráfico antes de recriar |

---

### Chamados / Tickets (linhas 3224–3516)

| Linha | Função | Descrição |
|---|---|---|
| 3224 | `sdrTicketsRender()` | Inicializa página de chamados |
| 3252 | `_renderTicketsLista()` | Renderiza lista de tickets |
| 3326 | `sdrTicketAdd(editId)` | Modal CRUD de chamado |
| 3390 | `sdrTicketEdit(id)` | Alias para sdrTicketAdd com id |
| 3453 | `sdrOpenTicketPanel(id)` | Painel lateral do ticket |
| 3517 | `sdrMapChangeBase(type)` | Muda tile base do mapa (streets/satellite/dark) |

---

### Ferramentas de Desenho (linhas 3555–3869)

| Linha | Função | Descrição |
|---|---|---|
| 3555 | `sdrDrawModeToggle()` | Liga/desliga modo de desenho |
| 3561 | `_sdrOpenDrawPanel()` | Abre painel de ferramentas de desenho |
| 3589 | `_sdrCloseDrawMode()` | Fecha modo de desenho |
| 3600 | `_sdrStartDraw(mode)` | Inicia desenho (line/polygon) |
| 3621 | `_sdrOnDrawClick(e)` | Handler de clique durante desenho |
| 3642 | `_sdrOnDrawDblClick(e)` | Finaliza desenho no duplo-clique |
| 3648 | `_sdrCancelCurrentDraw()` | Cancela desenho em andamento |
| 3661 | `_sdrFinalizeDrawing(pts)` | Salva traçado |
| 3669 | `_sdrShowPropertiesModal(type, pts)` | Modal de propriedades do elemento desenhado |

---

### KMZ/KML Import (linhas 3870–4245)

| Linha | Função | Descrição |
|---|---|---|
| 3797 | `_fiberColors()` | Retorna array de cores do padrão ativo |
| 3798 | `_fiberNames()` | Retorna array de nomes do padrão ativo |
| 3799 | `_tubeColors(numTubes)` | Retorna cores dos tubos |
| 3871 | `_matchKMZColor(hexColor, colorMap)` | Mapeia cor KMZ para tipo SDR |
| 3885 | `_fmtDist(m)` | Formata distância em metros/km |
| 3887 | `_haversineM(a, b)` | Distância entre dois pontos (haversine) |
| 3894 | `sdrMapRenderInfra()` | Versão 2 — renderiza mapa com todos os tipos |
| 3998 | `sdrImportKMZ()` | Abre seletor de arquivo KMZ |
| 4021 | `_kmlColor(kmlHex)` | Converte cor KML (AABBGGRR) para hex |
| 4026 | `_parseKML(kmlText)` | Parseia KML/KMZ e extrai features |
| 4080 | `_sdrKMZPreviewModal(features, filename)` | Preview de importação KMZ |
| 4186 | `sdrKMZCancelImport()` | Cancela importação |
| 4246 | `sdrCableDetailModal(id, item)` | Modal de detalhes de cabo |

---

### HTML Templates das Páginas (linhas 4277–4419)

| Linha | Função | Descrição |
|---|---|---|
| 4277 | `_sdrHtml_dash_rede()` | HTML da página Dashboard de Rede |
| 4301 | `_sdrHtml_clientes()` | HTML da página Clientes |
| 4316 | `_sdrHtml_olts()` | HTML da página OLTs |
| 4333 | `_sdrHtml_onus()` | HTML da página ONUs |
| 4347 | `_sdrHtml_alertas()` | HTML da página Alertas |
| 4358 | `_sdrHtml_tickets()` | HTML da página Chamados |
| 4372 | `sdrClientesFiltrar(q)` | Filtra lista de clientes por texto |
| 4420 | `_sdrHtml_mk_config()` | HTML da página Integração MK |

---

### MK Solutions Integration (linhas 4515–5009)

| Linha | Função | Descrição |
|---|---|---|
| 4515 | `sdrMkConfigRender()` | Carrega config MK do Firebase e preenche form |
| 4538 | `sdrMkSaveConfig()` | Salva configurações no Firebase `mk_config` |
| 4559 | `sdrMkTestarConexao()` | Testa autenticação MK (real ou demo) |
| 4599 | `sdrMkSyncAll()` | Sync completo MK → Firebase |
| 4615 | `sdrMkDemoTopologia()` | Gera topologia FTTH de demonstração completa |
| 4758 | `sdrMkDemoOlts()` | Cria OLTs demo no Firebase `olt_connections/` |
| 4774 | `sdrMkDemoOnus()` | Cria ONUs demo no Firebase `onus/` |
| 4799 | `sdrMkDemoClientes()` | Cria clientes demo no Firebase `clients/` |
| 4825 | `sdrTopologiaToggle()` | Toggle da árvore de topologia |
| 4833 | `sdrTopologiaRender()` | Renderiza árvore FTTH colapsável |
| 4956 | `_sdrMkLog(msg, type)` | Adiciona linha ao log de sync |
| 4967 | `_sdrMkUpdateBadge(enabled)` | Atualiza badge de status MK no menu |
| 4980 | `_sdrMkRefreshCounts()` | Atualiza contadores da dashboard MK |

---

### Context Menu Engine (linhas 5010–5114)

| Linha | Função | Descrição |
|---|---|---|
| 5010 | `sdrCtxMenu(e, items)` | Abre menu de contexto profissional no cursor |
| 5058 | `sdrCtxClose()` | Fecha menu de contexto |
| 5064 | `_sdrCtxOlt(id)` | Itens do context menu de OLT |
| 5078 | `_sdrCtxOnu(id)` | Itens do context menu de ONU |
| 5088 | `_sdrCtxCliente(id)` | Itens do context menu de Cliente |
| 5100 | `_sdrCtxInfra(id)` | Itens do context menu de Infraestrutura |

---

## Estrutura Firebase (caminhos usados no código)

```
sdr_comercial/default_tenant/
├── infrastructure/{id}          → Postes, CTOs, Splitters, DGOs
│   ├── type, name, lat, lng, status
│   ├── parent_id                → id do nó pai na topologia
│   └── fibers/t{tube}f{fiber}   → apenas DGOs
│       └── status, olt_id, slot, port, label, connected_at
├── olt_connections/{id}         → OLTs
│   ├── name, model, ip_address, total_pon_ports, is_active
│   └── pons/s{slot}_p{port}     → PONs
│       └── active, label, speed, vlan, dgo_id, dgo_fiber_key, onu_serial
├── onus/{serial}                → ONUs
│   ├── serial_number, rx_power, status
│   ├── cto_id, olt_id, slot, port
│   └── mk_cd_cliente
├── clients/{id}                 → Clientes FTTH
│   ├── name, cpf, city, neighborhood
│   ├── lat, lng, onu_serial
│   └── mk_id
├── alertas/{id}                 → Alertas de rede
├── tickets/{id}                 → Chamados de suporte
└── mk_config/                   → Configuração MK Solutions
    ├── ip_porta, token, password, cd_servico
    ├── modo_demo, ultimo_sync
    └── enabled
```

---

## Padrão de Cores — OLT Chassis Visual

| Cor | Status |
|---|---|
| `#374151` (cinza escuro) | PON inativa |
| `#2563eb` (azul) | PON ativa, sem DGO conectado |
| `#16a34a` (verde) | PON ativa e conectada ao DGO |
| `#dc2626` (vermelho) | PON em alarme |

---

## Como Editar

1. Abrir `public/sdr-module.js` no VS Code
2. Usar `Ctrl+G` → número da linha para navegar
3. Usar `Ctrl+F` → nome da função para buscar
4. Qualquer mudança → commit na branch `develop`
5. Deploy via `.\BACKUP_E_DEPLOY.ps1`

---

## Seções com Duplicidade (atenção!)

| Função | Versão | Linha | Ativa |
|---|---|---|---|
| `sdrOltsRender` | v1 (simples) | 1377 | ❌ Substituída |
| `sdrOltsRender` | v2 (completa) | 2017 | ✅ Principal |
| `sdrAlertasRender` | v1 | 1418 | ❌ Substituída |
| `sdrAlertasRender` | v2 | 2941 | ✅ Principal |
| `sdrDashRedeRender` | v1 | 1463 | ❌ Substituída |
| `sdrDashRedeRender` | v2 | 3010 | ✅ Principal |
| `sdrMapRenderInfra` | v1 | 557 | ❌ Substituída |
| `sdrMapRenderInfra` | v2 | 3894 | ✅ Principal |

> ⚠️ O JS executa a última declaração de `window.nome = function`. As versões v2 sobrescrevem as v1 por estarem mais adiante no arquivo.

---

## Links Relacionados

- [[MK_SISTEMA_COLETADO]] — Sistema MK coletado e mapeado
- [[MK_API_REFERENCE]] — Referência da API MK Solutions
- [[CLAUDE]] — Regras do projeto e workflow
- [[SPRINT_LOG]] — Histórico de sprints
