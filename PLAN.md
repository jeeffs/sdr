# PLANO DE EVOLUÇÃO SDR → SaaS de Licenças para ISPs

**Objetivo**: Transformar SDR em plataforma SaaS B2B para vendas de licenças a pequenos provedores de internet com infraestrutura integrada.

**Timeline**: Fase 1 (Infraestrutura) → Fase 2 (Monetização/Licenças)

---

## 🏗️ ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────────────┐
│                    SAAS PORTAL (SDR Evolved)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Dashboard Admin │  │ Gestão Licenças  │                 │
│  │  & Provider Home │  │ (3 Tiers)        │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Gestão de Infraestrutura & Clientes         │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • MK Solutions (Mikrotik) Integration                │   │
│  │ • OLT Fiberhome + Clientes com Ônus                 │   │
│  │ • Servidor TR-069 (Auto-provisioning)               │   │
│  │ • Mapa Visual de Rede                               │   │
│  │ • Gestão de Clientes (histórico, SLA, débitos)      │   │
│  │ • Gestão de Infraestrutura (equipamentos, topologia)│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Firebase Backend                     │   │
│  │  (Realtime DB + Auth + Hosting)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Integrações Externas                    │   │
│  │  ├─ MK API (Mikrotik)                               │   │
│  │  ├─ OLT Fiberhome (SNMP/HTTP)                       │   │
│  │  └─ TR-069 (ACS - Auto Configuration Server)        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 FASES DE IMPLEMENTAÇÃO

### FASE 1: INFRAESTRUTURA & GESTÃO (Core Features)

**Objetivo**: Criar plataforma funcional de gestão de infraestrutura para ISPs

#### Sprint 1: Gestão de Clientes Base
- [x] Modelo de dados expandido (cliente ISP → clientes do ISP → equipamentos → SLA)
- [ ] Dashboard de gestão de clientes (lista, busca, filtros)
- [ ] Registro de ônus/débitos por cliente
- [ ] Histórico de problemas/tickets por cliente
- [ ] Campos de SLA (uptime %, tempo resposta, etc)

**Dependências**: Nenhuma (standalone)  
**Saída**: Módulo de Gestão de Clientes pronto

---

#### Sprint 2: Integração Mikrotik (MK Solutions)
- [ ] Autenticação com APIs MK Solutions
- [ ] Sync de equipamentos Mikrotik (routers, switches)
- [ ] Leitura de status em tempo real (CPU, memória, uptime)
- [ ] Dashboard de equipamentos MK
- [ ] Alertas de degradação (CPU > 80%, memória > 85%, etc)

**Dependências**: Sprint 1 (precisa saber qual cliente "dono" do equipamento)  
**Saída**: MK Integration Dashboard pronto

---

#### Sprint 3: Integração OLT Fiberhome + Clientes com Ônus
- [ ] Conexão com OLT Fiberhome (SNMP ou HTTP API)
- [ ] Sync de clientes Fiberhome (CPE, ONUs)
- [ ] Status de cada ONU (ligada/desligada, signal, uptime)
- [ ] Registro de ônus específicos Fiberhome
- [ ] Dashboard OLT + Clientes com ônus (visualização)
- [ ] Alertas de ONUs offline/degradadas

**Dependências**: Sprint 1 + 2  
**Saída**: OLT Management + Clientes com Ônus pronto

---

#### Sprint 4: Servidor TR-069 (Auto-provisioning)
- [ ] Implementar ACS (Auto Configuration Server) TR-069
- [ ] Ligação com equipamentos (Mikrotik, Fiberhome)
- [ ] Configuração automática de CPE/ONUs
- [ ] Push de upgrades de firmware
- [ ] Monitoramento de performance pré/pós auto-provision

**Dependências**: Sprint 2 + 3  
**Saída**: TR-069 ACS funcional, auto-provisioning automático

---

#### Sprint 5: Mapa Visual de Rede de Infraestrutura
- [ ] Mapa interativo (Google Maps ou Mapbox base)
- [ ] Localização de OLT, MK, CPE, ONUs
- [ ] Visualização de topologia de rede (hierarquia)
- [ ] Status visual (verde=ok, amarelo=warning, vermelho=erro)
- [ ] Clique em ponto → detalhes do equipamento
- [ ] Filtros por tipo (OLT, MK, CPE, ONU) e status
- [ ] Histórico de eventos no mapa (últimas 24h)

**Dependências**: Sprint 1 + 2 + 3 + 4  
**Saída**: Mapa visual funcional, real-time

---

#### Sprint 6: Gestão Avançada de Infraestrutura
- [ ] Modelo de capacidade (OLT slots, MK ports, etc)
- [ ] Planejamento de expansão (recomendações automáticas)
- [ ] Relatórios de utilização (capacity planning)
- [ ] Grafos de topologia (rede como grafo direcionado)
- [ ] Análise de SLA por rota/equipamento

**Dependências**: Sprint 1-5  
**Saída**: Gestão avançada de infraestrutura

---

**Fim Fase 1**: Plataforma de infraestrutura completa, testada, estável

---

### FASE 2: MONETIZAÇÃO & LICENÇAS (SaaS Model)

**Objetivo**: Adicionar sistema de vendas de licenças com 3 tiers

#### Sprint 7: Sistema de Licenças Base
- [ ] Modelo de dados: Licença (tipo, tier, cliente_id, data_inicio, data_fim, status)
- [ ] Dashboard de gestão de licenças (admin)
- [ ] Dashboard de licenças do cliente (o que tem acesso)
- [ ] Histórico de licenças
- [ ] Renovação manual/automática

**Dependências**: Fase 1 completa  
**Saída**: Sistema de licenças base

---

#### Sprint 8: 3 Tiers de Licenças
- [ ] Definir funcionalidades por tier
- [ ] Implementar gates ("se Basic, não mostra recurso X")
- [ ] Pricing estratégia (por cliente ISP, por tier)
- [ ] Checkout/pagamento (Stripe/PayPal integrado)
- [ ] Gerador de faturas

**Saída**: Licenças com 3 tiers funcional, pronto para vendas

---

#### Sprint 9: Upgrade/Downgrade & Management
- [ ] Upgrade/downgrade mid-cycle (com ajuste pro-rata)
- [ ] Cancelamento com notificação
- [ ] Reativação de licenças expiradas
- [ ] Suporte multi-licença por cliente (ex: 1x Basic + 2x Pro)

**Saída**: Gestão completa de ciclo de vida de licenças

---

**Fim Fase 2**: SaaS pronto para vender

---

## 🎯 TIERS DE LICENÇAS

### Basic
**Preço**: ~R$ 99/mês por cliente ISP  
**O que inclui**:
- Dashboard de clientes (até 100 clientes)
- Gestão de clientes com ônus (básica)
- 1 integração (MK OU OLT)
- Mapa de rede (read-only)
- Suporte por email

---

### Pro
**Preço**: ~R$ 299/mês por cliente ISP  
**O que inclui**:
- Dashboard completo (até 500 clientes)
- Todas gestões de clientes (ônus, SLA, histórico)
- 2 integrações (MK + OLT)
- Mapa de rede (completo, interativo)
- TR-069 (auto-provisioning)
- Relatórios básicos
- Suporte por email + chat

---

### Premium
**Preço**: ~R$ 699/mês por cliente ISP  
**O que inclui**:
- Tudo do Pro
- Clientes ilimitados
- 3 integrações (MK + OLT + custom)
- Toda infraestrutura avançada
- Capacity planning automático
- Alertas avançados (custom rules)
- Webhooks/API para integração
- Relatórios avançados (BI ready)
- Account manager dedicado
- SLA 99.5% uptime

---

## 🔄 SEQUÊNCIA DE BUILD

```
FASE 1 (Infraestrutura)
├── Sprint 1: Gestão Clientes
├── Sprint 2: MK Integration
├── Sprint 3: OLT + Ônus
├── Sprint 4: TR-069
├── Sprint 5: Mapa Visual
└── Sprint 6: Gestão Avançada
         ↓
   [TESTE INTEGRAÇÃO COMPLETA]
         ↓
FASE 2 (Licenças)
├── Sprint 7: Sistema Base de Licenças
├── Sprint 8: 3 Tiers + Pagamento
└── Sprint 9: Upgrade/Downgrade
         ↓
   [TESTE VENDAS]
         ↓
   PRONTO PARA VENDER ✅
```

---

## 🛡️ GARANTIAS DE ESTABILIDADE

- ✅ **Sem mudanças no código existente**: Cada sprint adiciona módulos novos
- ✅ **Separação de concerns**: Fase 1 é independente de Fase 2
- ✅ **Rollback plan**: Cada sprint tem checkpoint de teste
- ✅ **Dados preservados**: Backup antes de cada deploy
- ✅ **Acesso progressivo**: Features bloqueadas por tier, não by default

---

## 📊 RECURSOS NECESSÁRIOS

### APIs Externas
- [ ] MK Solutions API docs (auth, endpoints)
- [ ] OLT Fiberhome API/SNMP docs
- [ ] TR-069 ACS framework (open source: OpenWRT, Genieacs, etc)
- [ ] Stripe/PayPal API (pagamentos)

### Tecnologias
- Frontend: React (já usando)
- Backend: Firebase (já usando) + Node.js functions (para TR-069, APIs)
- Mapa: Mapbox ou Google Maps API
- Banco de dados auxiliar: PostgreSQL (para dados históricos/analytics)

---

## ✅ PRÓXIMOS PASSOS

1. **Aprovação deste PLAN** — você aprova a sequência?
2. **Detalhar Sprint 1** — requirements específicos de Gestão de Clientes
3. **Iniciar EXECUTE phase** — começar Sprint 1

---

**Status**: READY FOR APPROVAL  
**Data**: 2026-04-12  
**Autor**: SPG
