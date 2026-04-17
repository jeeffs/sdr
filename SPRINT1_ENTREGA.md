# Sprint 1 — Entrega (Mapa + Infraestrutura + Clientes)
**Data**: 2026-04-13 (noite)  
**Status**: PRONTO PARA DEPLOY

---

## O QUE FOI IMPLEMENTADO

### Arquivo modificado
`public/admin.html` — ~1200 linhas adicionadas (CSS + HTML + JavaScript)

### 6 Novas Páginas no Sidebar (master)

1. **Mapa da Rede** — Mapa Leaflet.js interativo com:
   - Camadas toggleáveis (Clientes, CTOs, Postes, Cabos, OLTs, Mapa de Calor)
   - Marcadores coloridos por tipo (postes amarelo, CTOs azul, cabos verde, OLTs vermelho)
   - Clique em qualquer item abre painel lateral com detalhes
   - Botão "Cadastrar" abre modal de cadastro com GPS automático
   - Botão "Minha Posição" centraliza no GPS do usuário
   - Painel de estatísticas (contadores de postes, CTOs, cabos, clientes, OLTs)
   - Dados carregam em tempo real do Firebase

2. **Clientes** — Lista/tabela de clientes da rede com:
   - Busca por nome, CPF, ONU serial
   - Filtro por status financeiro (adimplente/inadimplente)
   - Cards de estatísticas (total, adimplentes, inadimplentes, ONUs online)
   - Clique no cliente abre Ficha Completa (painel lateral)
   - Botão para ver no mapa
   - CRUD completo (cadastrar, editar)

3. **Infraestrutura** — Grid de itens com:
   - Cards coloridos por tipo (poste, CTO, cabo, splitter, OLT)
   - Filtro por tipo e busca textual
   - Estatísticas por tipo
   - CRUD completo com formulário inteligente (campos extras por tipo)
   - Foto via câmera (mobile)

4. **OLTs** — Lista de OLTs cadastradas com:
   - Status ativa/inativa
   - Dados: IP, SNMP community, portas PON
   - Cadastro via página Infraestrutura (tipo OLT)

5. **Alertas** — Lista de alertas da rede com:
   - Severidade: info (azul), warning (amarelo), critical (vermelho)
   - Acknowledge (marcar como resolvido)
   - Ordenação por data

6. **Dashboard Rede** — Visão geral com:
   - KPIs: clientes, online, degradados, offline, infra, OLTs, alertas ativos
   - Top 10 pior sinal (tabela com badges)
   - Alertas ativos recentes

### Painel Lateral (Ficha)
- Slide-in da direita com detalhes completos
- Para infraestrutura: tipo, nome, código, coordenadas, portas, botões editar/excluir
- Para clientes: dados pessoais, plano, financeiro, ONU (serial, status, sinal Rx/Tx), infraestrutura vinculada
- Badges de sinal: verde (> -25dBm), amarelo (-25 a -28dBm), vermelho (< -28dBm)

### Modal de Cadastro
- Formulário inteligente que muda campos extras por tipo
- GPS automático (botão crosshairs)
- Upload de foto via câmera
- Funciona no mobile (PWA)

### Firebase Realtime DB
- Todos os dados ficam em `/sdr_comercial/default_tenant/`
- Sub-paths: infrastructure, clients, olt_connections, alerts, info
- Listener em tempo real para mapa (atualiza automaticamente)
- Tenant default criado automaticamente na primeira carga

---

## O QUE NÃO FOI ALTERADO

- Nenhum path existente (/users, /os, /precos, /config, /seguranca, /contratos)
- Nenhuma página existente (dashboard, OS, financeiro, etc.)
- Nenhum estilo existente
- Nenhuma função existente

---

## PARA FAZER DEPLOY

Abra o PowerShell na pasta do SDR e execute:

```powershell
cd C:\Users\Jeeff\OneDrive\Documentos\ObsidianAI\Claude\SDR
firebase use solucaoderua
firebase deploy --only hosting
```

---

## DEPOIS DO DEPLOY

1. Acesse https://solucaoderua.web.app/admin
2. Faça login como master
3. No sidebar, as 6 novas páginas aparecem: Mapa da Rede, Clientes, Infraestrutura, OLTs, Alertas, Dashboard Rede
4. Clique em "Mapa da Rede" — o mapa Leaflet carrega centrado em Jundiaí
5. Clique "Cadastrar" para adicionar postes, CTOs, cabos
6. Use GPS automático para pegar coordenadas
7. Os itens aparecem no mapa em tempo real

---

## PRÓXIMOS PASSOS (Sprint 2)

- Importação de clientes via CSV/Excel
- Vínculo completo cliente → CTO → poste → cabo
- Mapa de calor funcional (overlay com leaflet-heat)
- Integração MK Solutions API (sync clientes)
