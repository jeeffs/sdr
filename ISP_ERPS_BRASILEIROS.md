# ERPs Brasileiros para ISP — Análise Completa

> **Objetivo**: Mapear todos os ERPs do mercado brasileiro de provedores de internet para planejar integrações SDR além do MK Solutions.  
> **Contexto SDR**: O SDR precisa funcionar com qualquer ERP — não apenas MK Solutions.

---

## Visão Geral do Mercado

O mercado brasileiro de ERPs para ISPs tem cerca de **10 players principais**. Os mais usados são:

| ERP | Posição no Mercado | Foco |
|-----|--------------------|------|
| **MK Solutions** | Líder histórico | Consolidado, grande base |
| **HubSoft** | Crescimento acelerado | Moderno, API first |
| **Voalle / Elleven** | Grande/médio porte | Suite completa, MVNO |
| **ISPBox** | Médio porte | OLT integrada, campo |
| **ISPFY** | Pequeno/médio | Simples, acessível |
| **SGP** | Pequeno porte | Legacy, muito ISP antigo |
| **IXCSoft** | Médio/grande | Gestão avançada |
| **Integrator** | Médio porte | ERP + CRM + RADIUS |
| **GereNet (GereISP)** | Nicho | IA integrada |
| **ISPCloud** | Nicho | Cloud first |

---

## 1. MK Solutions — Líder Consolidado

> ⚠️ Documentação completa disponível em: [[MK_SISTEMA_COLETADO]]

### Resumo
- **Site**: mksolutions.com.br
- **IP**: 177.38.56.6:8080 (instância Jeff)
- **Versão**: 4.0.0
- **Usuário Jeff**: JA-ADM
- +50 integrações nativas
- API REST documentada
- Integração OZmap: **ativa** (lê banco MK)
- Integração SDR: em desenvolvimento

---

## 2. HubSoft — Moderno e API First

**Site**: hubsoft.io | hubsoft.com.br  
**Docs API**: docs.hubsoft.com.br  
**Wiki**: wiki.hubsoft.com.br  
**Posição**: ERP exclusivo para provedores de internet, crescimento acelerado  

### Funcionalidades Completas

```
HubSoft Módulos:
├── Gestão de Clientes
│   ├── CRM personalizável
│   ├── Histórico completo de atendimentos
│   └── Ordens de Serviço (OS)
├── Financeiro
│   ├── Faturamento automático
│   ├── Controle financeiro completo
│   ├── Emissão de NFS-e
│   ├── PIX, boleto, cartão de crédito
│   └── Controle de devedores
├── Rede / Técnico
│   ├── Mapeamento e geolocalização de rede
│   ├── Monitoramento FTTH/FTTx
│   ├── Integração OLT
│   └── RADIUS server
├── Campo
│   ├── App técnico
│   └── Gestão de ordens de serviço em campo
├── Comunicação
│   ├── WhatsApp Bot
│   ├── Chatbot
│   └── Omnichannel
├── Comercial
│   ├── SVAs (serviços de valor agregado)
│   ├── IPTV
│   └── PABX/telefonia STFC
└── Analytics
    ├── Dashboards analíticos
    └── Relatórios customizados
```

### Integrações HubSoft

| Categoria | Integrações |
|-----------|-------------|
| **Mapeamento** | OZmap (nativo), GeoGrid |
| **OLT** | ZTE, Huawei, Fiberhome, Datacom |
| **Monitoramento** | Zabbix, SNMP |
| **Pagamento** | PIX, boleto, cartão |
| **Mensageria** | WhatsApp, SMS, e-mail |
| **SVAs** | IPTV, hotspot, streaming |

### API HubSoft

- Documentação: docs.hubsoft.com.br
- Formato: REST/JSON
- Política de preços: **sem cobrança por módulos extras** — acesso completo ao contratar
- **Sem limite** de usuários simultâneos

### Diferenciais
- Preço único — sem módulos adicionais
- Usuários ilimitados
- API aberta e documentada
- Integração OZmap nativa e bidirecional
- App mobile integrado para técnicos

---

## 3. Voalle / Elleven — Suite Enterprise

**Site**: grupovoalle.com.br  
**Wiki**: wiki.grupovoalle.com.br  
**Universidade**: universidadevoalle.com.br  
**Posição**: Focado em ISPs médios e grandes, expandindo para MVNO  

### Produtos

| Produto | Foco |
|---------|------|
| **Voalle ERP** | ISP — gestão completa |
| **Elleven** | Plataforma convergente (ISP + MVNO + Telecom) |
| **ISPLite** | Pontos de acesso / rádios |

### Módulos Voalle ERP

```
Voalle Suite:
├── CRM (gestão de clientes)
├── Service Desk (atendimento)
├── Field Services (técnico em campo)
├── Faturamento (contratos e recorrência)
├── Omnichannel (comunicação integrada)
├── RADIUS próprio (autenticação)
├── App do Cliente
├── Portal do Cliente
├── Financeiro
└── Integrações com parceiros
```

### APIs Voalle

- API de Abertura de Negociação
- API de Integração com sistemas terceiros
- API de Abertura de Protocolos
- APIs para streaming, mapas, monitoramento

### Integrações Voalle

| Tipo | Exemplos |
|------|---------|
| Mapeamento | OZmap (integração nativa — Voalle/OZmap citado como parceiro) |
| Monitoramento | Zabbix, ferramentas de rede |
| Assinatura digital | Parceiros de doc digital |
| Cobrança | Parceiros financeiros |
| PABX/URA/SMS | Parceiros de comunicação |
| Entretenimento | Plataformas de streaming |

### Elleven — Nova Plataforma

- Integra: gestão comercial + financeira + operacional + regulatória
- Suporte a MVNO (Operadora Virtual)
- Parceria com Telecall (2025)

### Diferenciais
- RADIUS próprio integrado
- Suporte a MVNO (diferencial único)
- Universidade Voalle (treinamento)
- Integração Anlix documentada (wiki.anlix.io)
- OZmap integração ativa

---

## 4. ISPBox — Foco em OLT e Campo

**Site**: duobox.com.br/ispbox | ispbox.net  
**Empresa**: Duobox — Cascavel/PR  
**Posição**: ISPs médios com foco em gestão técnica de rede óptica  

### Funcionalidades

```
ISPBox 2 Módulos:
├── Rede / OLT
│   ├── Integração OLT: ZTE, Huawei, Fiberhome, Datacom
│   ├── Controle de fibra óptica
│   ├── Autenticação de assinantes
│   └── Nível de sinal de ONUs
├── Financeiro
│   ├── Controle de caixa
│   ├── Relatórios de despesas/receitas
│   └── Controle de devedores
├── Campo
│   └── Servicebox (app mobile)
│       ├── Provisioning de ONU no celular
│       └── Sem necessidade de acesso externo
├── Portal do Cliente
│   ├── Speed test
│   ├── Segunda via (linha digitável)
│   └── Pagamento PIX e Picpay
└── Integrações de Pagamento
    └── Principais plataformas do mercado
```

### Diferenciais
- **Servicebox**: provisioning direto pelo celular do técnico em campo
- Suporte nativo a 4 fabricantes de OLT (ZTE, Huawei, Fiberhome, Datacom)
- Controle de sinal de ONU integrado
- Foco em ISPs que gerenciam a rede óptica diretamente

---

## 5. ISPFY — Simples e Acessível

**Site**: ispfy.com.br  
**Wiki**: wiki.ispfy.com.br  
**Posição**: ISPs pequenos e médios, fácil de usar  

### Módulos

```
ISPFY Módulos:
├── Gestão de Clientes
│   ├── Envio de mensagens (e-mail, SMS, WhatsApp)
│   ├── Controle de devedores
│   └── Posição de clientes por CTO
├── Financeiro
│   ├── Controle de despesas
│   ├── Parcelas e vencimentos
│   └── Emissão NFe 21/22
├── Rede
│   ├── Provisionamento de OLT
│   ├── Controle de firewall
│   └── CGNAT (script automático)
├── BI / Relatórios
│   ├── Módulo BI para relatórios customizados
│   └── Dashboards
└── Estoque
    └── Controle de inventário
```

### Integrações ISPFY

| Categoria | Exemplos |
|-----------|---------|
| **Pagamento** | Cel_cash, Efí, Iugu, Safe2Pay, WidePay, Asaas, Banco do Brasil, Bradesco, Caixa, Itaú, Santander, Sicoob, Sicredi, Uniprime |
| **Mensageria** | ConectaZapi, Digisac, Hipersend, Telegram, WhatsApp, Zenvia, e mais 15+ |
| **SVAs** | CDN-TV, ITTV, PlayHub, WatchTV, Youcast e outros |
| **Mapeamento** | Geofiber (módulo integrado) |

### Mapeamento Geofiber (ISPFY)

O ISPFY tem módulo próprio de mapeamento chamado **Geofiber**:
- Desenho e gestão de rede FTTH
- Clientes, OLTs, caixas, cabos e postes mapeados
- Posição de clientes por CTO

### Diferenciais
- Mais simples entre todos (foco em pequenos ISPs)
- Mapeamento Geofiber incluso
- Muitas integrações de pagamento
- NFe integrada

---

## 6. Outros ERPs do Mercado

### SGP — Sistema de Gerenciamento de Provedores
- Site: sgp8.hospedagemdesites.ws
- Legacy, muito usado por ISPs antigos
- Base grande mas crescimento parado

### IXCSoft
- Wiki: wiki.ixcsoft.com.br
- Médio/grande porte
- Suporte a autorização de ONUs (documentado na wiki)

### GereNet (GereISP)
- Site: gerenet.com.br
- Diferencial: **IA integrada** (GereISP + Inteligência Artificial)

### Integrator (RBX)
- Site: rbxsoft.com
- ERP + CRM + Provisionamento + Billing
- Foco em telecomunicações

### ISPCloud
- Site: ispcloud.com.br
- Cloud first
- ERP moderno

---

## 7. Comparativo Completo

### Tabela de Funcionalidades

| Funcionalidade | MK | HubSoft | Voalle | ISPBox | ISPFY |
|----------------|----|---------|---------| -------|-------|
| Gestão clientes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Financeiro/billing | ✅ | ✅ | ✅ | ✅ | ✅ |
| RADIUS próprio | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| App técnico campo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Integração OLT | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mapeamento nativo | ❌ | ❌ | ❌ | ❌ | ✅ (Geofiber) |
| API aberta | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |
| Integração OZmap | ✅ | ✅ | ✅ | ❌ | ❌ |
| WhatsApp integrado | ✅ | ✅ | ✅ | ✅ | ✅ |
| NFe/NFS-e | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| MVNO | ❌ | ❌ | ✅ | ❌ | ❌ |
| Preço público | ❌ | ❌ | ❌ | ❌ | ❌ |

### APIs Disponíveis para Integração SDR

| ERP | Status API | Documentação |
|-----|-----------|-------------|
| MK Solutions | ✅ REST | Interna (mksolutions.com.br) |
| HubSoft | ✅ REST | docs.hubsoft.com.br |
| Voalle | ✅ REST | wiki.grupovoalle.com.br/APIs |
| ISPBox | ⚠️ Limitada | Consultar |
| ISPFY | ⚠️ Limitada | wiki.ispfy.com.br |

---

## 8. Estratégia de Integração SDR

### Prioridade de Integração

```
Fase 1 — MK Solutions (já em andamento)
  → Maior base de clientes atual
  → Integração ativa já mapeada
  → Token API: Integradores → Gerenciador de Webservices

Fase 2 — HubSoft
  → API bem documentada (docs.hubsoft.com.br)
  → Crescimento acelerado no mercado
  → Integração OZmap similar ao MK

Fase 3 — Voalle
  → Médio/grande porte
  → API documentada
  → Mercado empresarial

Fase 4 — Universal
  → SDR com camada de abstração para qualquer ERP
  → Plugin model: ISP instala o conector do ERP que usa
```

### Arquitetura de Integração Universal

```javascript
// SDR — Camada de abstração ERP
// Cada ERP tem um "conector" que implementa a mesma interface

class ERPConnector {
  async buscarCliente(cpfCnpj) {}
  async ativarCliente(id, porta) {}
  async suspenderCliente(id) {}
  async cancelarCliente(id) {}
  async buscarContratos(clienteId) {}
  async criarOS(clienteId, tipo, descricao) {}
}

// Conectores implementados:
class MKSolutionsConnector extends ERPConnector { ... }
class HubSoftConnector extends ERPConnector { ... }
class VoalleConnector extends ERPConnector { ... }
```

---

## 9. Referências

- MK Solutions: mksolutions.com.br
- HubSoft: hubsoft.io | docs.hubsoft.com.br | wiki.hubsoft.com.br
- Voalle: grupovoalle.com.br | wiki.grupovoalle.com.br
- ISPBox: duobox.com.br/ispbox
- ISPFY: ispfy.com.br | wiki.ispfy.com.br
- IXCSoft: wiki.ixcsoft.com.br
- GereNet: gerenet.com.br
- Integrator/RBX: rbxsoft.com

---

*Criado em: 2026-04-18*  
*Tags: #erp #isp #provedor #mksolucoes #hubsoft #voalle #ispbox #ispfy #integracao #sdr*  
*Relacionado: [[MK_SISTEMA_COLETADO]], [[MK_API_REFERENCE]], [[FTTH_PLATAFORMAS_MAPEAMENTO]], [[TR069_ACS_PLATAFORMAS]], [[FERRAMENTAS_MAPA_MONITOR]]*  
*Índice: [[SDR_INDEX]]*
