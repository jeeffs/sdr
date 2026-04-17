# SDR Comercial — Plano Final v3.0
**Data**: 2026-04-12  
**Status**: APROVADO — TODAS AS MELHORIAS INTEGRADAS

---

## 🎯 POSICIONAMENTO

> **"Um clique no mapa, toda a história do cliente"**

SDR Comercial é o **painel unificado** que conecta seu ERP, sua OLT e seu mapa em um clique — trabalhando nas falhas dos outros aplicativos.

**Para quem**: Pequenos e médios provedores de internet (dos 22.000+ ISPs do Brasil)
**O que resolve**: Parar de abrir 4 sistemas quando cliente reclama
**Diferencial**: Ninguém oferece Mapa + OLT + TR-069 + Multi-ERP + Ficha Completa junto

---

## 🏗️ ARQUITETURA (Melhorada)

### Stack
```
Frontend:    React PWA (web + mobile instalável)
Mapa:        Leaflet.js (inspirado Geosite, melhor que Geosite)
Backend:     Supabase (PostgreSQL + Auth + Realtime + Storage)
Cache:       Redis (dados OLT + ficha combinada)
Workers:     Background jobs (poll OLT, sync ERP, alertas, heatmap)
Pagamentos:  Mercado Pago (PIX + Boleto + Cartão recorrente)
TR-069:      Anlix/Flashman (via API — parceria, não próprio)
Deploy:      Vercel + Supabase Cloud
```

### Diagrama
```
┌──────────────────────────────────────────────────────────┐
│              SDR Comercial (React PWA)                    │
│   Mapa Leaflet + Dashboard + Ficha Cliente + NOC         │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────────────────────┐
│               Supabase Edge Functions                     │
│           (API Gateway + business logic)                  │
├──────────────────────────────────────────────────────────┤
│  PostgreSQL (dados)  │  Realtime (WebSocket)             │
│  RLS multi-tenant    │  Storage (fotos, shapefiles)      │
└──┬──────────┬────────┴───────────────────────────────────┘
   │          │
   ▼          ▼
┌──────┐  ┌──────────────┐
│Redis │  │  Workers 24/7 │
│Cache │  │  - Poll OLT   │  ← a cada 5 min
│      │  │  - Sync ERP   │  ← a cada 15 min
│      │  │  - Alertas    │  ← real-time
│      │  │  - Heatmap    │  ← a cada 10 min
│      │  │  - WhatsApp   │  ← trigger por alerta
└──────┘  └──────────────┘
           │       │        │
     ┌─────┴──┐ ┌──┴─────┐ ┌┴──────────┐
     │ ERPs   │ │ OLT    │ │ Anlix     │
     │MK Solut│ │Fiber   │ │Flashman   │
     │IXC Soft│ │home    │ │(TR-069)   │
     │HubSoft │ │SNMP/TL1│ │API        │
     └────────┘ └────────┘ └───────────┘
```

### Multi-tenant (Supabase)
```sql
tenants
  ├── id, nome, cnpj, plano, licença, status
  ├── config/           (limites por tier, preferências)
  ├── users/            (admin + técnicos — roles)
  ├── erp_connections/  (credenciais API do ERP)
  ├── olt_connections/  (credenciais SNMP da OLT)
  ├── infrastructure/
  │   ├── poles/        (postes — GPS, código, concessionária)
  │   ├── ctos/         (caixas terminação óptica — capacidade, portas)
  │   ├── cables/       (rotas de fibra — polyline no mapa)
  │   ├── splitters/    (1:8, 1:16, 1:32 — portas usadas/livres)
  │   └── olts/         (OLTs cadastradas + portas PON)
  ├── clients/          (sync do ERP — nome, plano, financeiro)
  ├── onus/             (ONUs — serial, Rx/Tx, status, vínculo)
  ├── tickets/          (OS de campo — prioridade, técnico, fotos)
  ├── alerts/           (alertas ativos — tipo, severidade)
  └── heatmap_cache/    (dados pré-calculados do mapa de calor)
```

---

## 💰 TIERS DE LICENÇA (Preços Realistas)

### Starter — R$ 149/mês
- Até 200 clientes
- 1 OLT integrada
- Mapa básico (cadastro + visualização de infra)
- Ficha do cliente (dados ERP + ONU básico)
- 1 integração ERP (MK ou IXC ou HubSoft)
- App mobile (PWA)
- Suporte por email

### Pro — R$ 399/mês
- Até 1.000 clientes
- Até 3 OLTs
- Mapa completo + mapa de calor
- Ficha completa do cliente (ERP + ONU + infra + alertas)
- Multi-ERP (MK + IXC + HubSoft)
- Viabilidade de atendimento (rota de drop)
- Capacity planning (splitters, PON ports)
- OS inteligente
- Alertas (push + email)
- Suporte email + chat

### Enterprise — R$ 899/mês
- Clientes ilimitados
- OLTs ilimitadas
- Tudo do Pro +
- TR-069 via Anlix (diagnóstico + Wi-Fi + reboot + firmware)
- Dashboard NOC (tela ao vivo)
- Manutenção preditiva (IA)
- Alertas WhatsApp
- Modo offline (campo)
- Relatórios Anatel (compliance)
- API pública
- Suporte prioritário + account manager

### Extras
- **Trial**: 14 dias grátis (tier Pro) — sem cartão
- **Desconto anual**: 20% (2 meses grátis)
- **Pagamento**: Mercado Pago (PIX / Boleto / Cartão recorrente)

---

## 👤 FICHA COMPLETA DO CLIENTE (clique no mapa)

Painel lateral com **tudo** em 1 tela:

### Bloco 1 — Dados (ERP)
- Nome, CPF/CNPJ, telefone, endereço
- Plano contratado (velocidade, valor)
- Status: 🟢 Adimplente / 🔴 Inadimplente
- Último pagamento + próximo vencimento

### Bloco 2 — ONU (Fiberhome)
- ONU serial + modelo
- Sinal: Rx/Tx (dBm) com semáforo 🟢🟡🔴
- Status: Online / Degradada / Offline
- Uptime atual
- Gráfico: histórico de sinal 24h / 7d / 30d
- Histórico de quedas

### Bloco 3 — Infraestrutura (Mapa)
- Poste (clicável → abre no mapa)
- CTO / splitter (porta X de Y — ocupação)
- Cabo de acesso (rota visível no mapa)
- Distância até OLT (metros)

### Bloco 4 — TR-069 (via Anlix — tier Enterprise)
- Modelo + firmware do roteador
- IP WAN
- Velocidade real (upload / download)
- Wi-Fi: SSID, banda, dispositivos conectados
- Ações rápidas: 🔄 Reboot | 🔧 Diagnóstico | 📶 Reset Wi-Fi | 🔑 Mudar senha

### Bloco 5 — OS
- OS abertas (prioridade + técnico)
- Histórico de OS fechadas
- Fotos de visitas
- Tempo médio de resolução

### Bloco 6 — Alertas
- Alertas ativos para este cliente
- Origem (ONU / financeiro / infra)

---

## 🗺️ MAPA

### Camadas (toggleáveis)
- 📍 Clientes (cor por status: 🟢 ok / 🟡 degradado / 🔴 offline / ⚫ inadimplente)
- 🏠 CTOs/Splitters (com indicador de ocupação)
- ⚡ Postes
- 〰️ Cabos (rotas de fibra)
- 📡 OLTs
- 🔥 Mapa de calor (regiões com problemas)

### Mapa de Calor
**Região fica vermelha quando**:
- ONUs com Rx < -28dBm na área **+**
- Tickets abertos na mesma área
- Combinação = provável falha de infraestrutura na região

### Viabilidade de Atendimento (tier Pro+)
- Novo cliente pede internet → verificar no mapa se tem infra
- Calcular rota de drop: cliente → splitter → CTO → OLT
- Mostrar capacidade no splitter (portas livres)
- Resposta: ✅ Viável / ⚠️ Precisa expansão / ❌ Sem infra

### Capacity Planning (tier Pro+)
- Splitter 1:8 com 7 portas = ⚠️ 87% lotado
- PON port com 90% uso = 🔴 hora de expandir
- Mapa mostrando áreas "saturadas" vs "com capacidade"

### Dashboard NOC (tier Enterprise)
- Tela full-screen para TV do NOC
- Mapa ao vivo com ONUs pulsando (online/offline)
- Alertas em tempo real com som
- Contadores: "23 ONUs offline | 5 alertas críticos | 2 OS abertas"

### Cadastro no Campo (Mobile)
1. Técnico abre SDR no celular (PWA)
2. Toca "+" → seleciona tipo (poste, CTO, cabo, cliente)
3. GPS preenche localização automaticamente
4. Formulário mínimo: 2-3 campos + foto
5. Salva → aparece no mapa real-time
6. Modo offline: salva local → sincroniza quando voltar cobertura

### Importação
- Shapefile / KMZ / GeoJSON → infraestrutura existente
- CSV/Excel → clientes em massa
- API → sync automático do ERP

---

## 🔗 INTEGRAÇÕES

### ERPs (Multi-ERP — tier Pro+)
| ERP | API | Dados | Direção |
|-----|-----|-------|---------|
| MK Solutions | REST | Clientes, financeiro, PPPoE, RADIUS | Read + Write |
| IXC Soft | REST | Clientes, financeiro, planos | Read + Write |
| HubSoft | REST | Clientes, financeiro | Read + Write |
| Outros | Webhook/CSV | Importação periódica | Read |

### OLT Fiberhome (todos os tiers)
- Protocolo: SNMP v2/v3 + TL1 + HTTP (UNM)
- Dados: status ONU, Rx/Tx, uptime, eventos
- Ações: reboot ONU
- Polling: worker a cada 5 minutos (cache Redis)

### TR-069 / ACS (tier Enterprise — via parceria Anlix)
- SDR → Anlix API → Flashman/FlashOne → CPE
- Dados: velocidade real, Wi-Fi, firmware, dispositivos
- Ações: reboot, diagnóstico, reset Wi-Fi, mudar senha, update firmware
- Vantagem: Anlix já testou com centenas de modelos CPE

### Notificações
- Push (PWA notification)
- Email (Supabase + Resend)
- WhatsApp (tier Enterprise — Evolution API ou Z-API)

### Pagamentos
- Mercado Pago (PIX + Boleto + Cartão recorrente)
- Webhook → ativa/desativa licença
- Grace period: 3 dias
- Aviso: 7 dias antes do vencimento

---

## 📋 ROADMAP MVP (8 SEMANAS)

### Sprint 1 (Semanas 1-2) — Fundação
- [ ] Setup Supabase (schema multi-tenant + RLS)
- [ ] Auth: cadastro provedor + convite técnicos
- [ ] Dashboard base (layout, navegação)
- [ ] Mercado Pago: assinatura + webhook + ativação licença
- [ ] Tiers (Starter/Pro/Enterprise) — gates de acesso
- [ ] Deploy Vercel + CI/CD

**Entrega**: Provedor cria conta, assina, faz login

---

### Sprint 2 (Semanas 3-4) — Mapa Base
- [ ] Mapa Leaflet (view principal do app)
- [ ] Camadas: postes, CTOs, cabos, splitters, OLTs
- [ ] Cadastro de infra: formulário 2-3 campos + GPS auto + foto
- [ ] Importação: Shapefile / KMZ / GeoJSON
- [ ] Visualização em tempo real (novo item aparece no mapa)

**Entrega**: Técnico cadastra infra no campo, aparece no mapa

---

### Sprint 3 (Semanas 5-6) — Clientes + ERP
- [ ] Integração MK Solutions (API)
- [ ] Sync clientes do ERP → mapa (geolocalização)
- [ ] Vínculo cliente → poste → CTO → cabo
- [ ] Busca por cliente → localiza no mapa
- [ ] Busca por CTO → lista clientes conectados
- [ ] Ficha básica do cliente (dados ERP)

**Entrega**: Clientes do MK Solutions visíveis no mapa

---

### Sprint 4 (Semanas 7-8) — OLT + Ficha Completa
- [ ] Conexão OLT Fiberhome (SNMP básico)
- [ ] Worker: poll OLT a cada 5 min → cache Redis
- [ ] Leitura Rx/Tx, status ONU, uptime
- [ ] Vínculo ONU → cliente (serial da ONU)
- [ ] Ficha completa: ERP + ONU + infra em 1 painel
- [ ] Alertas básicos: ONU offline, sinal baixo

**Entrega**: MVP COMPLETO — mapa + clientes + OLT + ficha completa

---

### 🚀 MVP PRONTO → PODE VENDER

---

## 📋 ROADMAP PÓS-MVP (Sprints de 4 semanas)

### Sprint 5 — Mapa de Calor + Alertas Avançados
- [ ] Worker: recalcular heatmap a cada 10 min
- [ ] Mapa de calor: ONU sinal baixo + tickets por região
- [ ] Alertas inteligentes (push + email)
- [ ] Dashboard de saúde da rede
- [ ] Manutenção preditiva básica (sinal caindo → alerta antes de cair)

---

### Sprint 6 — Mobile + Modo Offline
- [ ] PWA otimizada para celular
- [ ] Cadastro no campo com modo offline
- [ ] Sincronização quando volta cobertura
- [ ] Notificações push no celular
- [ ] QR Code no equipamento → abre ficha

---

### Sprint 7 — Multi-ERP
- [ ] Integração IXC Soft (API)
- [ ] Integração HubSoft (API)
- [ ] Migração automática entre ERPs (histórico preservado)
- [ ] Conector genérico (webhook/CSV) para outros ERPs

---

### Sprint 8 — TR-069 (via Anlix)
- [ ] Integração API Anlix/Flashman
- [ ] Dados: velocidade real, Wi-Fi, dispositivos
- [ ] Ações: reboot, diagnóstico, reset Wi-Fi
- [ ] Exibir dados TR-069 na ficha do cliente
- [ ] Push firmware remoto

---

### Sprint 9 — OS Inteligente
- [ ] OS automática quando ONU offline > 30min
- [ ] Atribuição de técnico mais próximo (GPS)
- [ ] App para técnico: recebe OS → navega → resolve → foto → fecha
- [ ] Histórico de OS na ficha do cliente
- [ ] WhatsApp: notifica técnico + cliente

---

### Sprint 10 — NOC + Viabilidade + Compliance
- [ ] Dashboard NOC (tela TV full-screen)
- [ ] Viabilidade de atendimento (rota de drop + capacidade)
- [ ] Capacity planning (splitters, PON ports)
- [ ] Relatórios Anatel (compliance)
- [ ] API pública (tier Enterprise)

---

## 📊 GO-TO-MARKET

### Fase 1 — Dogfooding (Semanas 1-8)
- Usar SDR na própria operação
- Documentar tudo (screenshots, vídeos, métricas)

### Fase 2 — Beta (Semanas 9-16)
- Convidar 3-5 provedores amigos/conhecidos
- Trial gratuito 30 dias
- Coletar feedback intenso
- Gerar 3 case studies

### Fase 3 — Lançamento (Semana 17+)
- Landing page profissional
- Trial 14 dias grátis (sem cartão)
- Canais:
  - YouTube: tutoriais de mapeamento FTTH (SEO)
  - Eventos ISP: Abrint, congressos regionais
  - Parcerias: distribuidores Fiberhome, revendas
  - Marketplace: aparecer no MK Solutions e IXC como integração
  - Indicação: provedor indica provedor → 1 mês grátis

### Métricas de Sucesso
- MRR (receita mensal recorrente)
- Churn rate (cancelamentos)
- NPS (satisfação)
- Time-to-value (tempo até primeiro mapa funcional)

---

## 💰 PROJEÇÃO FINANCEIRA

### Cenário Conservador (Ano 1)
| Mês | Clientes | MRR |
|-----|----------|-----|
| 3 | 5 (beta) | R$ 0 (trial) |
| 6 | 20 | R$ 5.980 |
| 9 | 50 | R$ 14.950 |
| 12 | 100 | R$ 29.900 |

### Cenário Otimista (Ano 1)
| Mês | Clientes | MRR |
|-----|----------|-----|
| 3 | 10 | R$ 2.990 |
| 6 | 50 | R$ 14.950 |
| 9 | 150 | R$ 44.850 |
| 12 | 300 | R$ 89.700 |

### Custos estimados (mensal)
- Supabase Pro: ~R$ 125/mês
- Vercel Pro: ~R$ 100/mês
- Redis (Upstash): ~R$ 50/mês
- Domínio + SSL: ~R$ 30/mês
- WhatsApp API: ~R$ 200/mês
- **Total infra**: ~R$ 505/mês (cresce com escala)

**Break-even**: ~2 clientes Pro cobrem a infra.

---

## 🛡️ GARANTIAS

- ✅ SDR atual (Solução de Rua) preservado — não mexe no que funciona
- ✅ ADV Store preservado — backup criado 2026-04-12
- ✅ AD Camisetas preservado — funcionando
- ✅ SDR Comercial é aplicação 100% nova
- ✅ Multi-tenant: dados de provedores nunca se misturam
- ✅ Trial sem cartão: cliente testa antes de pagar
- ✅ Backup antes de cada sprint

---

## ✅ PRÓXIMO PASSO

**Iniciar Sprint 1 — Fundação**
1. Setup Supabase
2. Schema multi-tenant
3. Auth + Dashboard
4. Mercado Pago
5. Deploy

**Status**: PRONTO PARA EXECUTE  
**Aprovado em**: 2026-04-12  
**MVP em**: 8 semanas
