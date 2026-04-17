# SDR Comercial — Plano Firebase v1.0
**Data**: 2026-04-13  
**Status**: PLANEJADO  
**Base**: Adaptação do PLAN_SDR_COMERCIAL_v3_FINAL para Firebase

---

## DECISÃO ESTRATÉGICA

O SDR Comercial será construído **sobre o Firebase existente** (projeto solucaoderua), adicionando os módulos comerciais como novas páginas/seções no app atual. Supabase fica como opção futura de migração quando o produto estiver validado.

### Por que Firebase agora
- Infraestrutura já funciona e está em produção
- Zero custo adicional de migração
- Firebase Realtime DB suporta multi-tenant via paths
- Sem risco de quebrar o que funciona
- Validar produto antes de investir em nova stack

### O que muda vs plano Supabase
| Aspecto | Supabase (original) | Firebase (adaptação) |
|---------|--------------------|--------------------|
| Banco | PostgreSQL + PostGIS | Realtime DB (JSON) |
| Multi-tenant | RLS policies | Paths por tenant + Security Rules |
| Geolocalização | PostGIS GEOGRAPHY | Campos lat/lng + Leaflet client-side |
| Auth | Supabase Auth | Firebase Auth (já em uso) |
| Storage | Supabase Storage | Firebase Storage |
| Hosting | Vercel | Firebase Hosting (já em uso) |
| Backend | Edge Functions | Cloud Functions |
| Cache | Redis | Cloud Functions + Realtime DB |
| Real-time | Supabase Realtime | Firebase Realtime DB (nativo) |

---

## ARQUITETURA FIREBASE ADAPTADA

### Stack
```
Frontend:    HTML/JS monolítico (padrão SDR atual) + Leaflet.js
Mapa:        Leaflet.js + plugins (heatmap, draw, markercluster)
Backend:     Firebase Realtime DB + Cloud Functions
Auth:        Firebase Auth (já existente)
Storage:     Firebase Storage (fotos campo, shapefiles)
Hosting:     Firebase Hosting (já existente)
Pagamentos:  Mercado Pago (futuro)
TR-069:      Anlix/Flashman API (futuro)
```

### Diagrama
```
┌──────────────────────────────────────────────────────────┐
│            SDR Comercial (HTML/JS PWA)                    │
│   Mapa Leaflet + Dashboard + Ficha Cliente               │
│   (novas páginas dentro do index.html existente)         │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────────────────────┐
│               Firebase                                    │
│  Realtime DB (dados JSON multi-tenant)                   │
│  Auth (login existente)                                  │
│  Storage (fotos, documentos)                             │
│  Cloud Functions (workers, integrações)                  │
└──┬──────────┬──────────┬─────────────────────────────────┘
   │          │          │
   ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────────────┐
│ MK   │  │ OLT  │  │  Anlix       │
│Solut.│  │Fiber │  │  Flashman    │
│(API) │  │home  │  │  (TR-069)   │
│      │  │SNMP  │  │  (futuro)   │
└──────┘  └──────┘  └──────────────┘
```

---

## ESTRUTURA FIREBASE REALTIME DB

### Paths Novos (sem mexer nos existentes)
```
/sdr_comercial/
  ├── tenants/{tenantId}/
  │   ├── info/          → {name, cnpj, email, phone, tier, license_status, created_at}
  │   ├── config/        → {max_clients, max_olts, trial_ends_at}
  │   │
  │   ├── team/{userId}/ → {name, email, role, avatar_url, is_active, last_login_at}
  │   │
  │   ├── erp_connections/{erpId}/
  │   │   → {erp_type, api_url, api_token, is_active, last_sync_at, sync_interval_min}
  │   │
  │   ├── olt_connections/{oltId}/
  │   │   → {name, model, ip_address, snmp_community, snmp_version,
  │   │      lat, lng, total_pon_ports, used_pon_ports, is_active, last_poll_at}
  │   │
  │   ├── infrastructure/{infraId}/
  │   │   → {type, name, code, lat, lng,
  │   │      route: [{lat,lng},...],     ← polyline para cabos
  │   │      properties: {},             ← dados flexíveis
  │   │      total_ports, used_ports,    ← para CTOs/splitters
  │   │      concessionaria,             ← para postes
  │   │      length_meters, fiber_count, ← para cabos
  │   │      photo_url, notes,
  │   │      created_by, created_at, updated_at}
  │   │
  │   ├── clients/{clientId}/
  │   │   → {erp_client_id, name, cpf_cnpj, email, phone, address,
  │   │      lat, lng,
  │   │      plan_name, plan_speed_down, plan_speed_up, plan_price,
  │   │      financial_status, last_payment_at, next_due_at,
  │   │      pole_id, cto_id, cto_port, olt_id,
  │   │      is_active, notes, erp_synced_at, created_at, updated_at}
  │   │
  │   ├── onus/{onuId}/
  │   │   → {client_id, olt_id, serial_number, model,
  │   │      status, rx_power, tx_power, uptime_seconds,
  │   │      ip_address, pon_port,
  │   │      last_online_at, last_offline_at, last_poll_at}
  │   │
  │   ├── onu_history/{onuId}/{timestamp}/
  │   │   → {status, rx_power, tx_power}
  │   │
  │   ├── tickets/{ticketId}/
  │   │   → {client_id, onu_id, title, description,
  │   │      status, priority, assigned_to,
  │   │      lat, lng,
  │   │      resolution_notes, resolution_photo_url, resolved_at,
  │   │      auto_generated, created_by, created_at, updated_at}
  │   │
  │   ├── alerts/{alertId}/
  │   │   → {client_id, onu_id, infra_id, severity, title, message,
  │   │      is_active, acknowledged_by, acknowledged_at, created_at}
  │   │
  │   └── heatmap_cache/
  │       → {last_updated, zones: [{lat, lng, intensity, type},...]}
```

### Paths Existentes (NÃO ALTERAR)
```
/users/          → Usuários do SDR atual (OS, financeiro)
/os/             → Ordens de serviço existentes
/precos/         → Tabela de preços V1-V4
/config/         → Configuração atual
/seguranca/      → Segurança e EPI
/contratos/      → Contratos de prestação
/impostos_mensais/ → Impostos
/relatorios/     → Relatórios exportados
```

### Firebase Security Rules (Multi-tenant)
```json
{
  "rules": {
    "sdr_comercial": {
      "tenants": {
        "$tenantId": {
          ".read": "auth != null && root.child('sdr_comercial/tenants/' + $tenantId + '/team/' + auth.uid).exists()",
          ".write": "auth != null && root.child('sdr_comercial/tenants/' + $tenantId + '/team/' + auth.uid).exists()"
        }
      }
    },
    "users": { "...regras existentes..." },
    "os": { "...regras existentes..." }
  }
}
```

---

## NOVAS PÁGINAS NO SDR

As features comerciais serão **novas páginas** no sidebar existente:

### Para Roles Admin/Owner (SDR Comercial)
```javascript
// Novas entradas no sidebar
{id:'mapa',           icon:'fa-map-marked-alt', label:'Mapa da Rede'},
{id:'clientes-rede',  icon:'fa-users',          label:'Clientes'},
{id:'infraestrutura', icon:'fa-network-wired',  label:'Infraestrutura'},
{id:'olts',           icon:'fa-server',         label:'OLTs'},
{id:'onus',           icon:'fa-wifi',           label:'ONUs'},
{id:'tickets-rede',   icon:'fa-headset',        label:'Tickets'},
{id:'alertas',        icon:'fa-bell',           label:'Alertas'},
{id:'dash-rede',      icon:'fa-chart-area',     label:'Dashboard Rede'},
```

### Páginas Detalhadas

1. **Mapa da Rede** (`mapa`)
   - Leaflet.js fullscreen com camadas toggleáveis
   - Clientes (pontos coloridos por status ONU)
   - CTOs/Splitters (com ocupação)
   - Postes
   - Cabos (polylines)
   - OLTs
   - Mapa de calor (overlay)
   - Clique em qualquer item → painel lateral com detalhes
   - Botão "+" para cadastro no campo (GPS auto)

2. **Clientes** (`clientes-rede`)
   - Lista/grid de clientes do provedor
   - Busca por nome, CPF, ONU serial
   - Filtros: status financeiro, status ONU, cidade
   - Clique → abre Ficha Completa (6 blocos)

3. **Infraestrutura** (`infraestrutura`)
   - CRUD de postes, CTOs, cabos, splitters
   - Importação Shapefile/KMZ/GeoJSON
   - Vinculação: cliente → CTO → poste → cabo

4. **OLTs** (`olts`)
   - OLTs cadastradas com status
   - Portas PON (utilização)
   - Última leitura SNMP
   - Botão: testar conexão

5. **ONUs** (`onus`)
   - Todas ONUs com status/sinal
   - Filtro: online/offline/degraded
   - Clique → histórico de sinal (gráfico)
   - Vínculo com cliente

6. **Tickets** (`tickets-rede`)
   - OS da rede (diferente das OS atuais de campo)
   - Auto-gerados por alertas
   - Atribuição a técnico
   - Status + prioridade

7. **Alertas** (`alertas`)
   - Alertas ativos (ONU offline, sinal baixo, infra)
   - Severidade: info/warning/critical
   - Ack + resolução

8. **Dashboard Rede** (`dash-rede`)
   - KPIs: ONUs online/offline, tickets abertos, alertas ativos
   - Gráfico: sinal médio 7d
   - Top 10 clientes com problemas
   - Capacidade de rede (% uso splitters, PON ports)

---

## SPRINTS DE IMPLEMENTAÇÃO

### Sprint 1 — Fundação Firebase (Semana 1-2)
**Objetivo**: Estrutura base + mapa funcionando

Tarefas:
- [ ] Criar path `/sdr_comercial/` no Firebase
- [ ] Criar tenant default (provedor atual do Jeff)
- [ ] Adicionar Leaflet.js ao index.html
- [ ] Criar página `mapa` com mapa vazio + controles
- [ ] Criar página `infraestrutura` com CRUD básico
- [ ] Cadastro de infraestrutura: poste, CTO, cabo com GPS auto
- [ ] Infraestrutura aparece no mapa em tempo real
- [ ] Security rules para `/sdr_comercial/`

**Saída**: Mapa funcional com cadastro de infraestrutura

### Sprint 2 — Clientes + Ficha (Semana 3-4)
**Objetivo**: Clientes no mapa com ficha básica

Tarefas:
- [ ] Página `clientes-rede` com lista/busca
- [ ] CRUD de clientes (manual + futura importação ERP)
- [ ] Clientes como pontos no mapa
- [ ] Vínculo cliente → CTO → poste
- [ ] Ficha do cliente: Bloco 1 (dados) + Bloco 3 (infra)
- [ ] Clique no mapa → abre ficha lateral
- [ ] Busca por cliente → centraliza no mapa
- [ ] Importação CSV/Excel de clientes

**Saída**: Clientes visíveis no mapa, ficha básica funcionando

### Sprint 3 — OLT + ONUs (Semana 5-6)
**Objetivo**: Integração OLT Fiberhome básica

Tarefas:
- [ ] Página `olts` com cadastro de OLTs
- [ ] Página `onus` com lista/filtro
- [ ] Cloud Function: poll OLT via SNMP (leitura Rx/Tx)
- [ ] Vínculo ONU → cliente (por serial)
- [ ] Ficha do cliente: Bloco 2 (ONU/Fiberhome)
- [ ] Semáforo visual de sinal
- [ ] Histórico de sinal (onu_history)
- [ ] Alertas básicos: ONU offline > 30 min

**Saída**: Dados OLT na ficha do cliente, alertas funcionando

### Sprint 4 — Alertas + Dashboard + Heatmap (Semana 7-8)
**Objetivo**: Inteligência visual completa

Tarefas:
- [ ] Página `alertas` com CRUD + ack
- [ ] Página `dash-rede` com KPIs
- [ ] Mapa de calor: ONUs sinal baixo por região
- [ ] Camadas toggleáveis no mapa
- [ ] Página `tickets-rede` com OS auto-geradas
- [ ] Push notifications (PWA)
- [ ] Dashboard Rede com gráficos

**Saída**: MVP completo — mapa + clientes + OLT + alertas + dashboard

---

## PÓS-MVP (Sprints de 4 semanas)

### Sprint 5 — Integração MK Solutions
- API MK Solutions → sync clientes
- Dados financeiros na ficha do cliente
- Status adimplente/inadimplente no mapa

### Sprint 6 — Multi-tenant + Licenças
- Sistema de tenants separados
- Tela de cadastro de novo provedor
- Licenças por tier (Starter/Pro/Enterprise)
- Mercado Pago integração

### Sprint 7 — TR-069 via Anlix
- Integração Anlix/Flashman API
- Bloco 4 na ficha (TR-069)
- Ações remotas (reboot, Wi-Fi, diagnóstico)

### Sprint 8 — Mobile + Offline
- PWA otimizada para campo
- Modo offline com sync
- Cadastro no campo refinado

---

## GARANTIAS

- ✅ **Sem mexer no que funciona**: todas as features novas ficam em `/sdr_comercial/`
- ✅ **Paths existentes intactos**: /users, /os, /precos, /config não são alterados
- ✅ **Backup antes de cada sprint**
- ✅ **Deploy gradual**: sprint a sprint, com checkpoint de aprovação
- ✅ **Rollback fácil**: cada sprint é aditivo, nunca remove funcionalidade existente
- ✅ **Mesmo projeto Firebase**: solucaoderua, sem criar novo projeto

---

## PRÓXIMOS PASSOS

1. **Aprovar este PLAN** → Sprint 1 começa
2. **Sprint 1**: Leaflet + infraestrutura no mapa
3. **Checkpoint**: validar antes do Sprint 2
