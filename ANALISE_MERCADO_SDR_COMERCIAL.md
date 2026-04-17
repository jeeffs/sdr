# SDR Comercial — Análise de Mercado + Propostas de Melhoria
**Data**: 2026-04-12  
**Versão**: 1.0

---

## 1. TAMANHO DO MERCADO

### Dados concretos:
- **22.000+ provedores** registrados na Anatel
- **18.805 operadoras** com outorga ativa
- ISPs regionais detêm **63,8% do market share** de banda larga fixa
- ISPs respondem por **56,4%** dos acessos fixos no Brasil
- Mercado altamente pulverizado — maioria é pequeno/médio porte
- **479 provedores** participaram de programa que instalou 12 mil km de fibra óptica em 2025

### Tendências 2025-2026:
- Anatel endurecendo exigências → ISPs precisam se profissionalizar
- Fim da dispensa automática de outorga → compliance obrigatório
- Consolidação: grandes players comprando ISPs menores
- Inadimplência recorde → pressão por automação financeira
- FTTH domina novos acessos → todo ISP precisa de gestão de rede óptica

### Oportunidade para SDR Comercial:
> **22.000 provedores** que precisam se profissionalizar.
> Maioria usa sistemas fragmentados (ERP + planilha + WhatsApp).
> Se capturar **1% = 220 clientes** × R$299/mês = **R$65.780/mês**.
> Se capturar **5% = 1.100 clientes** × R$299/mês = **R$328.900/mês**.

---

## 2. ANÁLISE DE CONCORRENTES

### A. Geosite Telecom (Mapa de Rede)
**O que faz**: Mapeamento e monitoramento de redes ópticas
- Cadastro de ativos, passivos e infraestrutura
- App mobile com Google Maps
- Integração com Zabbix, OLTCloud, análise OTDR
- Cálculo de viabilidade de atendimento
- Integra com CRM/ERP para sincronização de clientes

**Preço**: Planos flexíveis + add-ons (Integração +R$80/mês, Projetos +R$60/mês, Combo +R$100/mês)
**Infraestrutura**: Oracle Cloud
**Fraqueza**: Apenas mapa, não tem OLT integrada, não tem TR-069, não tem financeiro, sistema isolado

---

### B. OZmap (Cadastro de Rede)
**O que faz**: Software de cadastro e documentação de redes ópticas FTTH
- Plataforma GIS para FTTX networks
- Mapeamento detalhado de projetos
- Visualização interna de caixas e conexões
- Relatórios de área para análise de dados
- Diagramas lógicos de rede

**Integrações**: IXC Soft (API bidirecional), MK Solutions, HubSoft
**Produtos adicionais**: OZsurvey (campo), OZneutral (rede neutra), OZloc (viabilidade)
**Desde**: 2012, baseada em Florianópolis
**Fraqueza**: Focado em documentação, não tem monitoramento real-time, não tem TR-069

---

### C. MK Solutions / MK MAPS (ERP + Mapa)
**O que faz**: ERP completo para ISPs
- Gestão financeira, clientes, PPPoE/RADIUS
- MK MAPS (módulo de mapa — caro e complexo)
- MK Nextpay (gateway financeiro)
- MK BI (business intelligence)

**Escala**: 15 milhões de clientes autenticados
**Preço**: Não divulgado publicamente, considerado caro pelo mercado
**Fraqueza**: Mapa caro e trabalhoso, sistema legado (JSP/framesets), difícil integração com outros

---

### D. IXC Soft (ERP + InMap)
**O que faz**: ERP de gestão para provedores
- InMap + FiberDocs (mapeamento de rede integrado)
- IXC ACS (próprio servidor TR-069)
- Integração com OZmap

**Diferencial**: Tem ACS próprio (TR-069 nativo)
**Fraqueza**: Sistema fechado, precisa usar IXC para tudo, caro para pequenos provedores

---

### E. Anlix / Flashman (TR-069/ACS)
**O que faz**: Plataforma de gerenciamento remoto de CPEs via TR-069
- Flashman: ACS on-premise (centenas de milhares de CPEs)
- FlashOne: versão cloud (até 1.000 CPEs)
- Atendimento N1 autônomo (resolve antes do cliente reclamar)

**Preço**: Tabela regressiva por licença/CPE. FlashOne para pequenos.
**Fraqueza**: Apenas TR-069, sem mapa, sem gestão de clientes, sem financeiro

---

## 3. MAPA COMPETITIVO

```
                    Mapa     OLT      TR-069    Multi-ERP    Ficha     Preço
                    Infra    Integr.  ACS       Integração   Completa  Acessível
                    ────     ────     ────      ────         ────      ────
Geosite Telecom     ✅✅✅    ⚠️       ❌        ⚠️           ❌        ⚠️
OZmap               ✅✅✅    ❌       ❌        ✅           ❌        ⚠️
MK Solutions        ⚠️       ❌       ❌        ❌(é o ERP)   ⚠️        ❌
IXC Soft            ✅       ⚠️       ✅        ❌(é o ERP)   ⚠️        ❌
Anlix/Flashman      ❌       ❌       ✅✅✅     ❌           ❌        ✅

SDR Comercial       ✅✅     ✅✅     ✅✅      ✅✅✅        ✅✅✅     ✅✅✅
```

### GAP PRINCIPAL DO MERCADO:
> **Nenhum concorrente oferece tudo junto** (Mapa + OLT + TR-069 + Multi-ERP + Ficha Completa) a preço acessível para pequenos provedores.
>
> Cada um resolve UM pedaço. SDR resolve TUDO em um lugar.

---

## 4. ANÁLISE CRÍTICA DAS SUAS IDEIAS

### ✅ O que está EXCELENTE no seu plano:
1. **Multi-ERP** — ninguém faz isso bem. SDR integra MK, IXC, HubSoft = mercado enorme
2. **Ficha completa do cliente** — diferencial matador. Um clique = tudo
3. **Mapa de calor + OLT** — ninguém combina mapa de calor com dados de OLT em tempo real
4. **Preço acessível** — tiers Basic/Pro/Premium atende do micro ao médio ISP
5. **PWA mobile** — técnico no campo com tudo na mão

### ⚠️ O que precisa MELHORAR:

#### A. Posicionamento
**Problema**: Você está tentando ser tudo ao mesmo tempo
**Melhoria**: Comece como "Mapa + OLT + Ficha do Cliente", depois expanda

#### B. TR-069 é complexo demais para Fase 1
**Problema**: GenieACS exige servidor dedicado, configuração por modelo de CPE, testing extenso
**Melhoria**: Fase 1-4 sem TR-069. Fase 5+ integra com Anlix/Flashman (API) ao invés de fazer próprio

#### C. Preços subestimados
**Problema**: R$99/mês é muito barato — não cobre custos de Supabase + desenvolvimento
**Melhoria**: Recalcular com custos reais (ver proposta abaixo)

#### D. Multi-tenant no Supabase tem complexidade
**Problema**: RLS é poderoso mas difícil de debugar e testar
**Melhoria**: Começar com schema separation (schema por tenant) ao invés de RLS

#### E. Falta modelo de vendas
**Problema**: Plano técnico perfeito, mas como você vai VENDER?
**Melhoria**: Adicionar go-to-market (ver proposta abaixo)

---

## 5. PROPOSTAS DE MELHORIA

### PROPOSTA 1 — Reposicionar o Produto
**Antes**: "SaaS de gestão técnica de rede FTTH"
**Depois**: "O único painel que conecta seu ERP, sua OLT e seu mapa em um clique"

**Tagline**: "Um clique no mapa, toda a história do cliente"

**Por quê**: Foco na dor, não na tecnologia. O provedor não quer "SaaS de gestão técnica" — quer "parar de abrir 4 sistemas quando cliente liga reclamando".

---

### PROPOSTA 2 — MVP em 8 semanas (não 40)
**Antes**: 8 fases / 40 semanas
**Depois**: MVP funcional em 8 semanas

**MVP mínimo viável (8 semanas):**
1. Semanas 1-2: Supabase + Auth + Dashboard base + Mercado Pago
2. Semanas 3-4: Mapa Leaflet + cadastro de CTOs/cabos/postes
3. Semanas 5-6: Integração MK Solutions (API) + clientes no mapa
4. Semanas 7-8: OLT Fiberhome (leitura SNMP básica) + ficha do cliente

**Resultado**: Em 8 semanas você tem mapa + clientes + OLT + ficha. Já pode vender.

**Depois do MVP** (iterações de 4 semanas cada):
- Sprint 5: Mapa de calor + alertas
- Sprint 6: App mobile (PWA)
- Sprint 7: IXC Soft + HubSoft
- Sprint 8: TR-069 (via Anlix API, não GenieACS próprio)
- Sprint 9: OS inteligente
- Sprint 10: Manutenção preditiva

---

### PROPOSTA 3 — Preços realistas
**Antes**: Basic R$99 / Pro R$299 / Premium R$699
**Depois**: Recalculado com base no mercado

| Tier | Preço | Justificativa |
|------|-------|---------------|
| **Starter** | R$ 149/mês | Até 200 clientes, 1 OLT, mapa básico — acessível para micro ISP |
| **Pro** | R$ 399/mês | Até 1.000 clientes, 3 OLTs, mapa calor, multi-ERP, ficha completa |
| **Enterprise** | R$ 899/mês | Ilimitado, TR-069, preditivo, API, suporte dedicado |

**Trial**: 14 dias grátis (tier Pro) — sem cartão
**Desconto anual**: 20% (2 meses grátis)

**Comparação com concorrentes**:
- Geosite: R$80-100/mês por add-on (sem OLT, sem TR-069)
- OZmap: estimado R$200-500/mês
- MK Solutions: estimado R$300-1000/mês
- Anlix FlashOne: por licença/CPE

**SDR Pro a R$399 é competitivo** e oferece MAIS que qualquer concorrente individual.

---

### PROPOSTA 4 — TR-069 via parceria, não desenvolvimento
**Antes**: Fase 6 — implementar GenieACS próprio (6 semanas)
**Depois**: Integrar via API com Anlix/Flashman

**Por quê**:
- GenieACS exige expertise profundo em TR-069, CWMP, cada modelo de CPE
- Anlix já resolve isso para 1.000+ provedores
- SDR integra via API: puxa dados de diagnóstico + executa ações remotas
- Economia de 4-6 semanas de desenvolvimento
- Melhor produto (Anlix já testou com centenas de modelos de CPE)

**Como**:
```
SDR → API Anlix → Flashman/FlashOne → CPE do cliente
SDR ← dados de diagnóstico, Wi-Fi, velocidade, firmware ← Anlix
```

No tier Premium, se o provedor já usa Anlix, SDR integra. Se não, SDR pode oferecer Anlix embutido como parceria.

---

### PROPOSTA 5 — Go-to-market (como vender)
**Problema**: Plano técnico sem estratégia de vendas

**Canais de venda**:
1. **Eventos ISP** — Abrint, congressos regionais, feiras de telecom
2. **Parcerias com distribuidores Fiberhome** — quem vende OLT pode revender SDR
3. **Integração com ERPs** — aparecer no marketplace de MK Solutions e IXC
4. **YouTube/Content** — tutoriais de mapeamento de rede FTTH atraem ISPs
5. **Trial gratuito** — 14 dias, sem cartão, conversão por email

**Primeira venda**:
- Usar na sua própria operação (dogfooding)
- Oferecer para 3-5 provedores amigos/conhecidos (beta)
- Coletar depoimentos e case studies
- Lançar publicamente após 3 cases de sucesso

---

### PROPOSTA 6 — Funcionalidades que faltam no plano

#### A. Viabilidade de Atendimento (como Geosite faz)
- Cliente pede internet → verificar no mapa se tem infraestrutura perto
- Calcular rota de drop (cliente → splitter → CTO → OLT)
- Mostrar capacidade disponível no splitter
- Geosite cobra R$60/mês por isso — SDR inclui no tier Pro

#### B. Relatório de Capacidade (capacity planning)
- Splitter 1:8 com 7 portas usadas = 87% lotado → alerta
- OLT com 90% de PON ports usadas → hora de expandir
- Mapa mostrando áreas "saturadas" vs "com capacidade"

#### C. Dashboard de NOC (Network Operations Center)
- Tela de TV para o NOC do provedor
- Mapa ao vivo com ONUs piscando (online/offline)
- Alertas em tempo real (push + som)
- Contador: "23 ONUs offline agora"

#### D. Integração WhatsApp (notificações)
- Cliente com ONU offline > 30min → WhatsApp automático para ele
- Técnico recebe OS via WhatsApp
- Provedor recebe alertas no grupo do NOC

#### E. Modo Offline para App Mobile
- Técnico cadastra infraestrutura sem internet (área rural)
- Sincroniza quando volta para área com cobertura
- Essencial para operações em campo

#### F. Compliance Anatel
- Anatel endurecendo regras → ISPs precisam de relatórios
- SDR gera relatórios de infraestrutura automaticamente
- Diferencial: "compliance-ready" como argumento de venda

---

### PROPOSTA 7 — Arquitetura melhorada

**Antes**: Supabase puro
**Depois**: Supabase + Redis + Workers

```
┌──────────────────────────────────────────────────────────┐
│              SDR Comercial (React PWA)                    │
│   Mapa Leaflet + Dashboard + Ficha Cliente + Mobile      │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────────────────────┐
│               Supabase Edge Functions                     │
│           (API Gateway + business logic)                  │
├──────────────────────────────────────────────────────────┤
│  PostgreSQL (dados)  │  Realtime (WebSocket)             │
│  RLS multi-tenant    │  Storage (fotos, arquivos)        │
└──┬──────────┬────────┴───────────────────────────────────┘
   │          │
   ▼          ▼
┌──────┐  ┌──────────────┐
│Redis │  │  Workers      │
│Cache │  │  (background) │
│      │  │  - Poll OLT   │
│      │  │  - Sync ERP   │
│      │  │  - Alertas    │
│      │  │  - Heatmap    │
└──────┘  └──────────────┘
           │          │
     ┌─────┴──┐ ┌─────┴──────┐
     │ ERPs   │ │ OLT/ACS    │
     │MK/IXC  │ │Fiberhome   │
     │HubSoft │ │Anlix API   │
     └────────┘ └────────────┘
```

**Por quê Workers**:
- OLT precisa ser polled a cada 5 minutos (não pode depender de request do usuário)
- Sync com ERP roda em background
- Alertas precisam ser processados 24/7
- Mapa de calor precisa ser recalculado periodicamente

**Por quê Redis**:
- Cache de dados de OLT (não bater na OLT a cada request)
- Cache de ficha do cliente (dados combinados de 3+ fontes)
- Session management

---

## 6. RESUMO DAS MELHORIAS

| # | Melhoria | Impacto |
|---|----------|---------|
| 1 | Reposicionar como "painel unificado" | Marketing mais forte |
| 2 | MVP em 8 semanas (não 40) | Vende antes, valida rápido |
| 3 | Preços realistas (R$149/399/899) | Sustentável financeiramente |
| 4 | TR-069 via Anlix (não GenieACS) | Economia de 6 semanas |
| 5 | Go-to-market definido | Sabe como vender |
| 6 | Viabilidade + NOC + WhatsApp + Offline | Features que diferenciam |
| 7 | Redis + Workers na arquitetura | Performance e confiabilidade |

---

## 7. PRÓXIMOS PASSOS RECOMENDADOS

1. **Aprovar as melhorias** — quais propostas aceita?
2. **Atualizar PLAN.md** com melhorias aprovadas
3. **Começar MVP** — setup Supabase + mapa + integração MK Solutions
4. **Dogfooding** — usar SDR na sua própria operação
5. **Beta com 3-5 provedores** — validar product-market fit

---

**Status**: ANÁLISE COMPLETA — AGUARDANDO APROVAÇÃO DAS PROPOSTAS
