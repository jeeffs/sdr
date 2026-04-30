# SDR — Log de Sprints e Estado do Projeto

**Última atualização:** 2026-04-14  
**Arquivo principal:** `public/sdr-module.js` (3586 linhas)  
**Deploy:** Firebase Hosting — `firebase deploy --only hosting` (executado localmente pelo Jeff)

---

## ⚠️ REGRA PRIMORDIAL

**Sempre escrever em Português Brasil (pt-BR).** Sem exceções.

---

## 📁 Estrutura de Arquivos

```
SDR/
├── public/
│   ├── admin.html          ← Framework base (NÃO MODIFICAR — propenso a rollback)
│   └── sdr-module.js       ← TODO o código SDR fica aqui (sobrevive a rollbacks)
├── BACKUP/
│   ├── CLEAN_2026-04-12/   ← Backup pré-sprint (admin.html do zero)
│   ├── sdr-module.BACKUP_2026-04-14.js  ← Backup antes de rebuild sprints
│   └── index.html.*        ← Backups antigos do index
└── SPRINT_LOG.md           ← Este arquivo
```

**Lição aprendida:** As Sprints 1–4 foram perdidas porque o código estava no `admin.html`. Quando houve um erro na Sprint 5, o sistema voltou ao backup de 2026-04-12 que predatava todas as sprints. O `sdr-module.js` é carregado via `<script>` no admin.html e NÃO é afetado por rollbacks do admin.html.

---

## 🗄️ Firebase

- **Realtime DB path base:** `/sdr_comercial/default_tenant/`
- **Função helper:** `sdrRef(path)` → `db.ref(\`${SDR_BASE}/${path}\`)`
- **Coleções existentes:**
  - `infrastructure/` — CTOs, Postes, Cabos, OLTs (tipo field)
  - `clients/` — Clientes FTTH com coordenadas e status ONU
  - `olt_connections/` — OLTs cadastradas com IP, SNMP, PON
  - `onus/` — ONUs com MAC, serial, Rx/Tx power, status
  - `alerts/` — Alertas de rede com severity e is_active
  - `tickets/` — Chamados de suporte

---

## 🗺️ Arquitetura do sdr-module.js

### Como funciona o bootstrap

O arquivo começa com `(function _sdrBootstrap())` que:
1. Injeta `<div id="page-mapa">` no `#main` do admin.html
2. Faz `PAGES.master.push({id:'mapa', ...})` para aparecer no sidebar
3. Patcha `showPage()` para chamar `sdrMapInit()` quando entrar na página 'mapa'
4. Chama `buildSidebar()` para rerrenderizar o menu

**PROBLEMA ATUAL (2026-04-14):** O bootstrap só injeta `page-mapa`. As páginas das Sprints 1–4 (Clientes, OLTs, ONUs, Alertas, Dashboard Rede, Tickets) têm suas funções de renderização no arquivo mas NÃO estão injetadas no sidebar. Próximo passo: adicionar as injeções no bootstrap.

---

## ✅ Sprint 5 — Mapa de Rede FTTH (CONCLUÍDA — SOBREVIVEU)

**Status:** ✅ Produção  
**Páginas:** `page-mapa`  
**Sidebar:** Mapa de Rede (ícone: `fa-network-wired`)

### Features implementadas:
- Mapa Leaflet com MarkerClusterGroup (suporta 6000+ CTOs)
- Camadas: Postes, CTOs, Cabos, Clientes, OLTs, Heatmap
- Toolbar com toggle de camadas
- Import KMZ/KML com preview e confirmação
- Modo Desenhar (polyline para cabos)
- Troca de base: Streets / Satellite / Dark
- Padrão de cores fibra: ABNT / TIA
- Card flutuante **draggable** para edição de infraestrutura
- Captura GPS clicando no mapa (toggle crosshair)
- Diagrama unifilar por CTO com hierarquia de splitters
- **Constantes Furukawa:**
  - `SDR_SPLITTER_LOSS` — perdas por ratio (balanced 1:2→1:64, unbalanced)
  - `SDR_SPLITTER_TOPOLOGIES` — 128p/PON (24.7dB), 512p/PON (31.1dB), 192p/PON desbalanceada (21.3dB)
- Side panel deslizante para detalhes de infraestrutura
- Modal de portas para CTOs
- Detalhes de cabo com tipo/bitola/comprimento
- Auto-link cliente → CTO mais próxima
- Import de clientes via CSV/Excel

---

## 🔄 Sprint 1–4 — PERDIDAS e em RECONSTRUÇÃO

**Status:** 🔧 Reconstruindo dentro do sdr-module.js  
**Data perda:** Rollback para backup 2026-04-12 durante Sprint 5  
**Estratégia:** Reconstruir no sdr-module.js (não admin.html)

### O que JÁ EXISTE no sdr-module.js (funções prontas, só falta injetar no sidebar):

#### Clientes (Sprint 1)
- `sdrClientesRender()` — lista com grid cards
- `sdrClienteAdd()` — modal de cadastro
- `sdrClienteEdit(id)` — modal de edição
- `sdrClienteSave(editId)` — salva no Firebase
- `sdrOpenClientePanel(id, c)` — painel lateral
- `sdrMapFlyToClient(id)` — voa para cliente no mapa
- `sdrImportClientes(input)` — import CSV/Excel
- `sdrImportExecute()` — executa importação em batch
- `sdrAutoLinkCTO()` — vincula clientes à CTO mais próxima

#### OLTs (Sprint 2)
- `sdrOltsRender()` — lista de OLTs (versão simples - linha 1318)
- `sdrOltAdd()` — chama _sdrShowAddModal com type:'olt'
- `sdrOltAddModal(editId)` — modal COMPLETO de OLT (linha 2029)
- `sdrOltSave(editId)` — salva OLT no Firebase
- `sdrOltDelete(id)` — exclui OLT
- `sdrOpenOltPanel(id)` — painel com PON ports, ONUs vinculadas

#### ONUs (Sprint 2)
- `sdrOnusRender()` — lista ONUs com Rx/Tx power e status
- `sdrOnuAdd()` / `sdrOnuEdit(id)` — modal ONU
- `sdrOnuSave(editId)` — salva no Firebase
- `sdrOnuDelete(id)` — exclui ONU
- `sdrOpenOnuPanel(id)` — painel de detalhes com sinal

#### Alertas (Sprint 3)
- `sdrAlertasRender()` — lista com severity badges
- `sdrAlertaAck(id)` — reconhece alerta
- `sdrCheckAlerts()` — verifica e cria alertas automáticos

#### Dashboard Rede (Sprint 2)
- `sdrDashRedeRender()` — KPIs, gráficos Chart.js, status geral
- Inclui: total clientes, OLTs ativas, alertas, disponibilidade

#### Tickets (Sprint 3)
- `sdrTicketsRender()` — lista com filtros
- `sdrTicketAdd(editId)` — modal de chamado
- `sdrTicketEdit(id)` — edita chamado
- `sdrTicketSave(editId)` — salva no Firebase
- `sdrTicketResolve(id)` — resolve chamado
- `sdrTicketDelete(id)` — exclui chamado
- `sdrOpenTicketPanel(id)` — painel de detalhes

### O que FALTA implementar:
- [ ] Injetar páginas HTML no `_sdrBootstrap` para cada módulo
- [ ] Adicionar ao `PAGES.master` no sidebar
- [ ] Patchar `showPage()` para chamar render de cada página
- [ ] MK Solutions API (Sprint 3) — sync de clientes/ONUs
- [ ] TR-069 / Anlix / Flashman (Sprint 4) — provisionamento ONU

---

## 🔧 Referência Técnica

### Padrão para adicionar nova página no sdr-module.js:

```javascript
// 1. No _sdrBootstrap, injetar HTML:
if (!document.getElementById('page-NOME')) {
  var p = document.createElement('div');
  p.id = 'page-NOME'; p.className = 'page';
  p.innerHTML = '...HTML DA PÁGINA...';
  mainEl.appendChild(p);
}

// 2. Push no sidebar:
if (!PAGES.master.find(p => p.id === 'NOME')) {
  PAGES.master.push({id:'NOME', icon:'fa-ICON', label:'Label'});
}
PAGE_TITLES['NOME'] = 'Título completo';

// 3. Patch showPage:
// (dentro do bloco if (!showPage._sdrPatched))
if (name === 'NOME') sdrNOMERender();
```

### CSS das páginas SDR:

As páginas SDR usam as mesmas classes do admin.html:
- `.page` — visibilidade controlada por `.active`
- `.infra-grid` — grid de cards
- `.infra-card` — card individual
- `.ic-icon` — ícone do card
- `.btn-map` — botão padrão do mapa
- `.signal-badge.good/.warn/.off/.critical` — badges de status

### Firebase paths:
```javascript
sdrRef('infrastructure')     // CTOs, postes, cabos
sdrRef('clients')            // Clientes FTTH
sdrRef('olt_connections')    // OLTs
sdrRef('onus')               // ONUs
sdrRef('alerts')             // Alertas
sdrRef('tickets')            // Chamados
```

---

## 📋 Próximos Passos

1. **IMEDIATO:** Adicionar injeção de páginas no `_sdrBootstrap` para Clientes, OLTs, ONUs, Alertas, Dashboard, Tickets
2. **Sprint 3 resto:** MK Solutions API integration
3. **Sprint 4:** TR-069 / Anlix server integration
4. Sempre fazer backup antes de modificações grandes: `cp sdr-module.js BACKUP/sdr-module.BACKUP_YYYY-MM-DD.js`

---

## 🛡️ Regras de Segurança

- **NUNCA** colocar código de features no `admin.html` — apenas no `sdr-module.js`
- Fazer backup antes de qualquer modificação grande
- Deploy via `firebase deploy --only hosting` no terminal local do Jeff
- Testar no browser antes de reportar conclusão
