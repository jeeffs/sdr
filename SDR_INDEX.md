# SDR Soluções de Rua — Índice Central

> **Hub de conhecimento do projeto SDR** — navegue pelo grafo ou use os links abaixo.  
> Última atualização: 2026-04-18

---

## 🗺️ Mapa do Projeto

```
                        ┌─────────────┐
                        │  SDR_INDEX  │  ← você está aqui
                        └──────┬──────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼──────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │  PROJETO   │      │  PESQUISA   │     │  TÉCNICO    │
    │  SDR       │      │  MERCADO    │     │  INFRA      │
    └─────┬──────┘      └──────┬──────┘     └──────┬──────┘
          │                    │                    │
    ┌─────▼──────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │PLAN, SPRINT│      │PLATAFORMAS  │     │TR069, NORMAS│
    │CÓDIGO, MK  │      │ERPS, CAMPO  │     │GEOSITE      │
    └────────────┘      └─────────────┘     └─────────────┘
```

---

## 📁 Todos os Documentos

### 🏗️ Projeto SDR — Core

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| [[CLAUDE]] | Regras do projeto, workflow, deploy | ✅ Ativo |
| [[SPRINT_LOG]] | Histórico de todas as sprints | ✅ Ativo |
| [[PLAN_SDR_COMERCIAL_v3_FINAL]] | Plano de desenvolvimento completo | ✅ Ativo |
| [[PLAN_SDR_FIREBASE_v1]] | Arquitetura Firebase do SDR | ✅ Ativo |
| [[PLAN_SDR_COMERCIAL]] | Plano módulo comercial | ✅ Ativo |
| [[PLAN]] | Plano geral | ✅ Ativo |
| [[SPRINT1_ENTREGA]] | Entrega da Sprint 1 | ✅ Ativo |
| [[ANALISE_MERCADO_SDR_COMERCIAL]] | Análise de mercado módulo comercial | ✅ Ativo |

### 🔌 Integrações — MK Solutions

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| [[MK_SISTEMA_COLETADO]] | Sistema MK completo: endpoints, Firebase, sync | ✅ Ativo |
| [[MK_API_REFERENCE]] | Referência completa dos Webservices MK | ✅ Ativo |

### 💻 Código SDR

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| [[SDR_MODULE_MAPA_CODIGO]] | Mapa completo do sdr-module.js (5114+ linhas) | ✅ Ativo |

### 🗺️ Pesquisa — Plataformas de Mapeamento FTTH

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| [[GEOSITE_ANALISE]] | GeoSite Telecom — 13 módulos completos | ✅ Novo |
| [[FTTH_PLATAFORMAS_MAPEAMENTO]] | OZmap, Tomodat, VETRO, IQGeo, Comsof e mais 5 | ✅ Novo |

### ⚙️ Pesquisa — Infraestrutura Técnica

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| [[TR069_ACS_PLATAFORMAS]] | TR-069, GenieACS, Anlix, Made4Graph, SmartOLT | ✅ Novo |
| [[FTTH_NORMAS_ATENUACAO]] | Normas ABNT, tabela atenuação, power budget GPON | ✅ Novo |

### 🏢 Pesquisa — Ecossistema ISP

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| [[ISP_ERPS_BRASILEIROS]] | HubSoft, Voalle, ISPBox, ISPFY + 5 outros ERPs | ✅ Novo |
| [[FERRAMENTAS_MAPA_MONITOR]] | Leaflet.js, Zabbix, QGIS, Workflows campo | ✅ Novo |

---

## 🔗 Grafo de Conexões

```
Legenda de cores sugerida no Obsidian Graph View:
  🔵 Azul    → Arquivos de Projeto (PLAN, SPRINT, CLAUDE)
  🟢 Verde   → Pesquisa de Mercado (PLATAFORMAS, ERPS, GEOSITE)
  🟠 Laranja → Infraestrutura Técnica (TR069, NORMAS, MK)
  🔴 Vermelho → Código (SDR_MODULE, sdr-module.js)
```

### Conexões Principais

```
SDR_INDEX
├──► CLAUDE (regras projeto)
├──► SPRINT_LOG (histórico)
├──► PLAN_SDR_COMERCIAL_v3_FINAL
│     └──► MK_SISTEMA_COLETADO
│           └──► MK_API_REFERENCE
├──► SDR_MODULE_MAPA_CODIGO
│     ├──► MK_SISTEMA_COLETADO
│     ├──► MK_API_REFERENCE
│     └──► SPRINT_LOG
├──► GEOSITE_ANALISE
│     ├──► MK_SISTEMA_COLETADO
│     └──► SDR_MODULE_MAPA_CODIGO
├──► FTTH_PLATAFORMAS_MAPEAMENTO
│     ├──► GEOSITE_ANALISE
│     ├──► TR069_ACS_PLATAFORMAS
│     └──► MK_SISTEMA_COLETADO
├──► TR069_ACS_PLATAFORMAS
│     ├──► GEOSITE_ANALISE
│     └──► MK_SISTEMA_COLETADO
├──► FTTH_NORMAS_ATENUACAO
│     ├──► FTTH_PLATAFORMAS_MAPEAMENTO
│     ├──► TR069_ACS_PLATAFORMAS
│     └──► GEOSITE_ANALISE
├──► ISP_ERPS_BRASILEIROS
│     ├──► MK_SISTEMA_COLETADO
│     ├──► FTTH_PLATAFORMAS_MAPEAMENTO
│     └──► TR069_ACS_PLATAFORMAS
└──► FERRAMENTAS_MAPA_MONITOR
      ├──► FTTH_PLATAFORMAS_MAPEAMENTO
      ├──► FTTH_NORMAS_ATENUACAO
      └──► TR069_ACS_PLATAFORMAS
```

---

## 🎯 Objetivo do Projeto

> Construir uma aplicação **superior a todas as plataformas estudadas**, combinando o melhor de cada uma, com foco no mercado brasileiro de ISPs FTTH.

### O que cada pesquisa contribui para o SDR

| Pesquisa | Contribuição para o SDR |
|----------|------------------------|
| [[GEOSITE_ANALISE]] | Blueprint de módulos, workflow de projetos FTTH |
| [[FTTH_PLATAFORMAS_MAPEAMENTO]] | Features prioritárias Tier 1/2/3, estrutura GeoJSON |
| [[TR069_ACS_PLATAFORMAS]] | Motor de gestão remota de CPE, GenieACS como backend |
| [[FTTH_NORMAS_ATENUACAO]] | Motor de cálculo de power budget, viabilidade óptica |
| [[ISP_ERPS_BRASILEIROS]] | Estratégia de integração universal (MK → HubSoft → Voalle) |
| [[FERRAMENTAS_MAPA_MONITOR]] | Stack técnica do SDR Map (Leaflet + Firebase + GeoJSON) |
| [[MK_SISTEMA_COLETADO]] | Integração ativa com ERP atual dos clientes |

---

## 🚀 Próximos Passos

### Infraestrutura
- [ ] Subir servidor Linux (Ubuntu 22.04) com IP fixo
- [ ] Instalar GenieACS (TR-069 ACS) — ver [[TR069_ACS_PLATAFORMAS]]
- [ ] Configurar OLTs ZTE/Huawei para apontar ONUs ao ACS

### SDR Map — Sprint 7+
- [ ] Implementar Leaflet.js no sdr-module.js — ver [[FERRAMENTAS_MAPA_MONITOR]]
- [ ] Estrutura GeoJSON: postes, cabos, CEOs, CTOs — ver [[FERRAMENTAS_MAPA_MONITOR]]
- [ ] Motor de power budget — ver [[FTTH_NORMAS_ATENUACAO]]
- [ ] Viabilidade comercial (endereço → CTOs próximas com porta livre)
- [ ] Integração mapa ↔ MK Solutions — ver [[MK_API_REFERENCE]]

### Integrações
- [ ] Token API MK Solutions (Integradores → Gerenciador de Webservices)
- [ ] Mapear API HubSoft — ver [[ISP_ERPS_BRASILEIROS]]
- [ ] Integração Zabbix → SDR — ver [[FERRAMENTAS_MAPA_MONITOR]]

### Deploy
- [ ] Commit fixes sdr-module.js (7 bugs + CSS + sdrClienteDelete)
- [ ] Deploy produção via `.\BACKUP_E_DEPLOY.ps1` — ver [[CLAUDE]]

---

## 📊 Estatísticas da Base de Conhecimento

| Métrica | Valor |
|---------|-------|
| Total de documentos | 17 arquivos .md |
| Plataformas estudadas | 20+ (mapeamento, ACS, ERP, campo) |
| Linhas de código documentadas | 5.114+ (sdr-module.js) |
| Sprints registradas | Ver [[SPRINT_LOG]] |
| ERPs mapeados | 10 (MK, HubSoft, Voalle, ISPBox, ISPFY...) |
| Normas ABNT catalogadas | 14 normas |

---

*Criado em: 2026-04-18*  
*Tags: #index #sdr #hub #moc*
