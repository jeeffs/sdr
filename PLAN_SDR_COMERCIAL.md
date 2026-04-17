# SDR Comercial — Plano Completo de Produto
**Data**: 2026-04-12  
**Status**: APROVADO PARA EXECUÇÃO  
**Versão**: 2.0 (pós-discuss amadurecida)

---

## 🎯 O PRODUTO

**SDR Comercial** é um SaaS de gestão técnica de rede FTTH para pequenos e médios provedores de internet — posicionado como a **camada técnica de rede** que trabalha nas falhas dos ERPs existentes.

### Proposta de Valor
> "O que o Geosite faz, mas integrado ao seu ERP, com OLT, TR-069 e histórico completo do cliente — mais fácil, mais barato, tudo em um lugar."

### Diferenciais vs Concorrentes (Geosite, MK Mapa, etc.)
1. **Cadastro fácil no campo** — GPS automático + formulário 2 campos + foto
2. **Mapa de calor integrado com OLT** — regiões com sinal baixo + tickets = área vermelha
3. **Clique no cliente → histórico completo** — financeiro + ONU + sinal + OS em 1 tela
4. **Multi-ERP** — integra MK Solutions, IXC Soft, HubSoft e outros
5. **Preço acessível** — tiers Basic/Pro/Premium para pequenos provedores

---

## 🏗️ ARQUITETURA

### Stack Tecnológico
```
Frontend:    React PWA (web + mobile instalável)
Mapa:        Leaflet.js (inspirado no Geosite Telecom)
Backend:     Supabase (PostgreSQL + Auth + Realtime + Storage)
Pagamentos:  Mercado Pago (PIX + Boleto + Cartão recorrente)
ACS:         GenieACS ou implementação própria (TR-069)
Deploy:      Firebase Hosting (atual) → migrar para Supabase/Vercel
```

### Diagrama de Arquitetura
```
┌──────────────────────────────────────────────────────────┐
│              SDR Comercial (React PWA)                    │
│   Mapa Leaflet + Dashboard + Ficha Cliente + Mobile      │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────────────────────┐
│                  Supabase                                  │
│  PostgreSQL + Auth + Realtime + RLS (multi-tenant)        │
└──┬──────────┬──────────┬──────────┬──────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────────────┐
│ MK   │  │ IXC  │  │ OLT  │  │  GenieACS    │
│Solut.│  │ Hub  │  │Fiber │  │  (TR-069)    │
│(API) │  │Soft  │  │home  │  │              │
│      │  │(API) │  │SNMP/ │  │              │
└──────┘  └──────┘  │ TL1  │  └──────────────┘
                     └──────┘
```

### Estrutura Multi-tenant (Supabase)
```sql
-- Cada provedor é um tenant isolado com Row Level Security
tenants
  ├── id, nome, plano (basic/pro/premium), licença
  ├── config/           (dados do provedor, limites por tier)
  ├── users/            (admin + técnicos do provedor)
  ├── infrastructure/
  │   ├── poles/        (postes — GPS, código, concessionária)
  │   ├── ctos/         (caixas de terminação óptica)
  │   ├── cables/       (rotas de fibra — polyline)
  │   ├── splitters/    (splitters 1:8, 1:16, 1:32)
  │   └── olts/         (OLTs cadastradas + credenciais)
  ├── clients/          (clientes do provedor — sync ERP)
  ├── onus/             (ONUs provisionadas — vínculo cliente)
  ├── tickets/          (OS de campo)
  └── alerts/           (alertas ativos)
```

---

## 👤 FICHA COMPLETA DO CLIENTE

Quando clicar em qualquer cliente no mapa, abre painel lateral com **tudo**:

### 1. Dados Básicos (ERP)
- Nome, CPF/CNPJ, telefone, endereço
- Plano contratado (velocidade, valor mensal)
- Status financeiro (adimplente / inadimplente)
- Último pagamento + próximo vencimento

### 2. ONU / Fiberhome
- ONU vinculada (serial, modelo)
- Sinal atual Rx/Tx (dBm) com semáforo visual
- Status: 🟢 Online / 🟡 Degradada / 🔴 Offline
- Uptime atual
- Histórico de quedas (24h / 7 dias / 30 dias)

### 3. Infraestrutura
- Poste onde está conectado (clicável no mapa)
- CTO / splitter (porta utilizada)
- Cabo de acesso (rota no mapa)
- Distância até a OLT (metros)

### 4. TR-069 / Roteador
- Modelo e firmware do roteador
- IP da ONU / WAN
- Velocidade real atual (upload / download)
- Wi-Fi: SSID, banda, dispositivos conectados
- **Ações rápidas:**
  - 🔄 Reboot ONU
  - 🔧 Diagnóstico (ping, traceroute)
  - 📶 Reset Wi-Fi
  - 🔑 Mudar senha Wi-Fi
  - ⬆️ Atualizar firmware

### 5. Ordens de Serviço
- OS abertas (com prioridade)
- Histórico de OS fechadas
- Fotos das visitas técnicas
- Técnico responsável + tempo de resolução

### 6. Alertas Ativos
- Se há alerta ativo agora para este cliente
- Origem do alerta (ONU / Zabbix / financeiro)

---

## 🗺️ MAPA DE INFRAESTRUTURA

### Camadas (toggleáveis)
- 📍 Clientes (ponto colorido por status)
- 🏠 CTOs / Splitters
- ⚡ Postes
- 〰️ Cabos (rotas de fibra)
- 📡 OLTs
- 🔥 Mapa de calor (regiões com problemas)

### Mapa de Calor — Quando uma região fica VERMELHA:
- ONUs com sinal baixo (Rx < -28dBm) na área **+**
- Clientes com ticket aberto na mesma área
- Combinação dos dois = alerta de falha de infraestrutura

### Cadastro no Campo (Mobile)
1. Técnico chega no local
2. Abre SDR no celular
3. Toca em "Adicionar" → seleciona tipo (poste, CTO, cabo)
4. GPS preenche localização automaticamente
5. Formulário mínimo: 2-3 campos obrigatórios + foto
6. Salva → aparece no mapa em tempo real
7. (Futuro) QR Code no equipamento → abre ficha direto

### Importação de Dados
- **Shapefile / KMZ** → importa infraestrutura existente
- **OpenStreetMap** → postes mapeados pela comunidade
- **Manual no campo** → sempre disponível como fallback

---

## 🔗 INTEGRAÇÕES

### ERPs (Multi-ERP)
| ERP | Método | Dados |
|-----|--------|-------|
| MK Solutions | API REST | Clientes, financeiro, PPPoE, RADIUS |
| IXC Soft | API REST | Clientes, financeiro, planos |
| HubSoft | API REST | Clientes, financeiro |
| Outros | Webhook / CSV | Importação periódica |

**Direção**: Read principalmente, write para atualizar status

### OLT Fiberhome
- Protocolo: SNMP v2/v3 + TL1 + HTTP API (UNM)
- Dados: Status ONU, Rx/Tx, uptime, histórico de eventos
- Ações: Reboot ONU, provisionar, desprovisionr

### TR-069 / ACS (GenieACS)
- Gerenciamento remoto de CPEs (ONUs, roteadores)
- Configuração de Wi-Fi, reset, diagnóstico
- Push de atualizações de firmware
- Compatível: Fiberhome, Intelbras, outros CPEs TR-069

### Monitoramento (substitui Zabbix gradualmente)
- Alertas baseados em sinal OLT + dados ERP
- Mapa de calor em tempo real
- Notificações (push mobile + email + WhatsApp)

### Pagamentos
- **Mercado Pago** (PIX + Boleto híbrido + Cartão)
- Cobrança recorrente mensal/anual
- Webhook → ativa/desativa licença automaticamente
- Grace period: 3 dias após vencimento
- Aviso antecipado: 7 dias antes

---

## 🎯 TIERS DE LICENÇA

### Basic — R$ 99/mês
- Até 100 clientes
- Mapa básico (cadastro + visualização)
- 1 OLT integrada
- Ficha do cliente (dados básicos + ONU)
- Suporte por email

### Pro — R$ 299/mês
- Até 500 clientes
- Mapa completo + mapa de calor
- Até 3 OLTs integradas
- Ficha completa do cliente (todos os dados)
- TR-069 básico (reboot + diagnóstico)
- Multi-ERP (MK + IXC ou HubSoft)
- OS inteligente
- Suporte email + chat

### Premium — R$ 699/mês
- Clientes ilimitados
- OLTs ilimitadas
- TR-069 completo (Wi-Fi, firmware, configuração)
- Manutenção preditiva (IA)
- Alertas inteligentes avançados
- Relatórios e analytics avançados
- API para integração customizada
- Multi-ERP ilimitado
- Cadastro no campo (mobile avançado)
- Suporte prioritário + account manager

---

## 📋 ROADMAP DE EXECUÇÃO

### FASE 1 — Fundação (Semanas 1-4)
**Objetivo**: Base sólida multi-tenant funcionando

- [ ] Setup Supabase (schema multi-tenant + RLS)
- [ ] Auth: cadastro do provedor + convite de técnicos
- [ ] Dashboard administrativo base
- [ ] Integração Mercado Pago (assinatura + webhook)
- [ ] Gestão de licenças por tier (Basic/Pro/Premium)
- [ ] Deploy e CI/CD básico

**Saída**: Provedor consegue criar conta, assinar e fazer login

---

### FASE 2 — Mapa Base (Semanas 5-8)
**Objetivo**: Mapa funcional com infraestrutura

- [ ] Mapa Leaflet integrado (view principal)
- [ ] Cadastro de camadas: postes, CTOs, cabos, splitters, OLTs
- [ ] Importação via Shapefile / KMZ
- [ ] App mobile (PWA instalável)
- [ ] Cadastro no campo: GPS auto + formulário 2 campos + foto
- [ ] Visualização em tempo real (novo item aparece no mapa)

**Saída**: Técnico cadastra infraestrutura no campo, aparece no mapa

---

### FASE 3 — Clientes no Mapa (Semanas 9-12)
**Objetivo**: Clientes vinculados à infraestrutura

- [ ] Integração ERP: MK Solutions (API)
- [ ] Sync de clientes do ERP → mapa
- [ ] Vínculo cliente → poste → CTO → cabo
- [ ] Busca por cliente → localiza no mapa
- [ ] Busca por CTO → lista clientes conectados
- [ ] Camadas toggleáveis no mapa
- [ ] Ficha básica do cliente (clique no mapa)

**Saída**: Clientes visíveis no mapa, ficha básica funcionando

---

### FASE 4 — OLT Fiberhome (Semanas 13-18)
**Objetivo**: OLT integrada com dados em tempo real

- [ ] Conexão OLT Fiberhome (SNMP + TL1 + HTTP/UNM)
- [ ] Leitura Rx/Tx, status ONU, uptime
- [ ] Vínculo ONU → cliente (serial da ONU)
- [ ] Dashboard OLT (visão geral de todas as ONUs)
- [ ] Histórico de quedas e eventos por ONU
- [ ] Ficha completa: dados ONU na ficha do cliente
- [ ] Alertas básicos (ONU offline, sinal baixo)
- [ ] Reboot remoto de ONU

**Saída**: Sinal da ONU visível na ficha do cliente, alertas funcionando

---

### FASE 5 — Mapa de Calor + Alertas (Semanas 19-22)
**Objetivo**: Inteligência visual no mapa

- [ ] Mapa de calor: ONUs com sinal baixo por região
- [ ] Mapa de calor: tickets abertos por região
- [ ] Combinação: região vermelha = ONU ruim + ticket
- [ ] Alertas inteligentes (push + email + WhatsApp)
- [ ] Manutenção preditiva básica (sinal caindo progressivamente → alerta antes de cair)
- [ ] Dashboard de saúde da rede

**Saída**: Operador vê mapa de calor em tempo real, recebe alertas antes de clientes reclamarem

---

### FASE 6 — TR-069 / ACS (Semanas 23-28)
**Objetivo**: Gerenciamento remoto completo de CPEs

- [ ] Deploy GenieACS (ou implementação própria)
- [ ] Integração ACS → SDR (dados de CPE)
- [ ] Leitura: velocidade real, Wi-Fi, dispositivos conectados
- [ ] Ações: reboot, diagnóstico, reset Wi-Fi, mudar senha
- [ ] Push de firmware
- [ ] Provisionamento automático de ONU nova
- [ ] Ficha completa: dados TR-069 na ficha do cliente

**Saída**: Técnico resolve problema do cliente remotamente sem abrir OS

---

### FASE 7 — OS Inteligente (Semanas 29-32)
**Objetivo**: Ordens de serviço vinculadas à rede

- [ ] Abertura automática de OS quando ONU offline > 30min
- [ ] Atribuição de técnico mais próximo no mapa
- [ ] OS com contexto completo (ONU + cliente + localização)
- [ ] App mobile para técnico de campo (recebe OS + navega até local)
- [ ] Fechamento de OS com foto + assinatura digital
- [ ] Histórico de OS na ficha do cliente

**Saída**: OS abre sozinha, técnico resolve com contexto completo, fecha com foto

---

### FASE 8 — Multi-ERP + Maturidade (Semanas 33-40)
**Objetivo**: Integrar mais ERPs e estabilizar

- [ ] Integração IXC Soft (API)
- [ ] Integração HubSoft (API)
- [ ] Migração automática entre ERPs (histórico preservado)
- [ ] Analytics avançados (capacidade, expansão, SLA)
- [ ] API pública para integrações custom (tier Premium)
- [ ] Substituição gradual do Zabbix

**Saída**: SDR funciona com qualquer ERP, Analytics completo

---

## 🛡️ GARANTIAS

- ✅ **Sem mexer no que funciona**: SDR Comercial é aplicação nova
- ✅ **SDR atual preservado**: continua funcionando em paralelo
- ✅ **Backup antes de cada fase**
- ✅ **Deploy gradual**: fase a fase, com checkpoint de aprovação
- ✅ **Multi-tenant**: cada provedor isolado, dados nunca se misturam

---

## ✅ PRÓXIMOS PASSOS

1. **Aprovar este PLAN** — sequência e escopo OK?
2. **Definir Fase 1** — setup Supabase ou começa pelo mapa?
3. **Iniciar EXECUTE** — SPG entra em modo de construção

**Status**: PRONTO PARA EXECUTE  
**Aprovado em**: 2026-04-12
