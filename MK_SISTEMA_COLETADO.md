# MK Solutions — Sistema Coletado e Mapeado
> Coletado em: 2026-04-17 | Acesso via browser direto ao sistema em produção
> Responsável: Jeff (JA-ADM) | Servidor: `http://177.38.56.6:8080`

---

## 1. Informações do Servidor

| Campo | Valor |
|---|---|
| **IP:Porta** | `177.38.56.6:8080` |
| **URL de acesso** | `http://177.38.56.6:8080/mk/open.do?sys=MK0` |
| **Versão do sistema** | MK ERP 4.0.0 / build 0-109.101.0 |
| **Usuário admin coletado** | JA-ADM |
| **Protocolo** | HTTP (sem HTTPS em produção — risco de segurança) |
| **Sistema** | `sys=MK0` (parâmetro fixo em todas as chamadas) |

---

## 2. Módulos Identificados no Sistema

### 2.1 Workspace (Módulo Principal)
Acesso direto a:
- **O.S. (Ordens de Serviço)** — abertura, acompanhamento e encerramento de ordens
- **Pessoas ou Empresas** — cadastro completo de clientes (PF/PJ)

### 2.2 Estoque
- Gerenciamento de materiais/equipamentos do provedor

### 2.3 Maps (Módulo Geográfico)
Submenus encontrados:
- **Gerenciador de Elementos** — OLTs, POPs, armários, pontos de rede
- **Provisionamento** — provisionamento de ONUs/conexões
- **Importações** — importação de dados geográficos e de rede

> ⚠️ **Problema encontrado:** O módulo Maps retorna erro "Não foi possível encontrar informações sobre seu provedor" na abertura. Provavelmente requer configuração adicional de provedor no cadastro do Maps.

---

## 3. Estrutura de Clientes (Pessoas ou Empresas)

### 3.1 Campos da listagem
| Coluna | Tipo | Exemplo |
|---|---|---|
| Código | Numérico | 76419 |
| Tipo cadastro | PF/PJ | PF |
| CPF/CNPJ | Texto formatado | 030.701.228-09 |
| Nome | Texto | Aparecida Souza |
| Celular | Texto | — |
| E-mail | Texto | — |
| Cidade | Texto | Jundiaí |
| Bairro | Texto | Jardim Morumbi |

### 3.2 Exemplo de cliente real coletado
```
Código:    76419
Nome:      Aparecida Souza
CPF:       030.701.228-09
Cidade:    Jundiaí – SP
Bairro:    Jardim Morumbi
Tipo:      PF (Pessoa Física)
```

### 3.3 Volume de clientes
- **Total estimado:** 1000+ clientes cadastrados (confirmado via paginação do sistema)

---

## 4. Área de Cobertura Confirmada

| Cidade | Estado | Observação |
|---|---|---|
| Jundiaí | SP | Principal — maioria dos clientes |
| Jarinu | SP | Cidade vizinha |
| Itupeva | SP | Área de expansão |
| Campo Limpo Paulista | SP | Área de expansão |
| Bom Jesus dos Perdões | SP | Área de expansão |

---

## 5. API — Autenticação e Endpoints

> Ver também: [[MK_API_REFERENCE]] para referência completa

### 5.1 URL base de API
```
http://177.38.56.6:8080/mk/
```

### 5.2 Autenticação padrão
```http
GET /mk/WSAutenticacao.rule?sys=MK0
  &token={tokenDoUsuarioMK}
  &password={contraSenhaPerfil}
  &cd_servico=9999
```
**Retorna:** `tokenRetornoAutenticacao` — necessário em todas as chamadas

### 5.3 Endpoints críticos para integração SDR

| Endpoint | Função SDR |
|---|---|
| `WSAutenticacao.rule` | Obter token de integração |
| `WSMKConsultaClientes.rule` | Listar/sincronizar clientes |
| `WSMKConsultaDoc.rule` | Buscar cliente por CPF/CNPJ |
| `WSMKConsultaNome.rule` | Buscar cliente por nome |
| `WSMKConexoesPorCliente.rule` | Status ONU/PPPoE do cliente |
| `WSMKContratosPorCliente.rule` | Plano e contrato do cliente |
| `WSMKFaturasPendentes.rule` | Situação financeira |
| `WSMKCriarOrdemServico.rule` | Abrir OS do SDR |
| `WSMKConsultaLocalManutencao.rule` | OLTs, POPs, CTOs |
| `WSMKConsultaPontoImobilizado.rule` | Infraestrutura física |
| `WSMKAutoDesbloqueio.rule` | Desbloquear cliente |
| `WSMKNovaLead.rule` | Registrar lead/visita |

---

## 6. Configuração Necessária no MK (Pendente)

Para habilitar a integração SDR ↔ MK, é necessário configurar dentro do MK:

1. **Módulo:** `Integradores → Gerenciador de Webservices`
2. **Ação:** Criar um **Perfil de Webservice** com:
   - Contra-senha (mínimo 8 dígitos) — será usada como `password` na autenticação
   - Restrição por IP (IP do servidor SDR / Firebase Functions)
   - Serviços autorizados: `6, 7, 8, 9, 16, 17` (e idealmente `9999` para todos)
3. **Token do usuário:** Obter o token de integração do usuário JA-ADM (ou criar usuário específico para integração)

> ⚠️ **Status atual:** Módulo Integradores não acessado durante a sessão. Precisa ser localizado no menu do MK e configurado manualmente por Jeff.

---

## 7. Estrutura Firebase SDR — Integração com MK

```
sdr_comercial/
└── default_tenant/
    ├── mk_config/               ← Configuração de conexão com MK
    │   ├── ip_porta             "177.38.56.6:8080"
    │   ├── token                {token do usuário MK}
    │   ├── password             {contra-senha do perfil webservice}
    │   ├── cd_servico           9999
    │   └── ultimo_sync          {timestamp}
    │
    ├── clients/                 ← Clientes sincronizados do MK
    │   └── {mk_codigo}/
    │       ├── mk_id            76419
    │       ├── nome             "Aparecida Souza"
    │       ├── cpf              "030.701.228-09"
    │       ├── cidade           "Jundiaí"
    │       ├── bairro           "Jardim Morumbi"
    │       └── synced_at        {timestamp}
    │
    ├── olt_connections/         ← OLTs sincronizadas via WSMKConsultaLocalManutencao(local=4)
    │   └── {id}/
    │       ├── name, ip_address, model
    │       ├── mk_id            {codigo no MK}
    │       └── pons/
    │           └── s{slot}_p{port}/
    │               ├── active, label, speed, vlan
    │               ├── dgo_id, dgo_fiber_key
    │               └── onu_serial
    │
    ├── infrastructure/          ← DGOs, Splitters, CTOs do MK
    │   └── {id}/
    │       ├── type             "dgo"|"splitter"|"cto"
    │       ├── mk_id            {codigo no MK}
    │       ├── parent_id        {id do nó pai na topologia}
    │       └── fibers/          (apenas DGOs — t{tube}f{fiber})
    │
    └── onus/                    ← ONUs/conexões via WSMKConexoesPorCliente
        └── {serial}/
            ├── serial_number, rx_power, status
            ├── mk_cd_cliente    {codigo cliente MK}
            └── cto_id           {id da CTO no Firebase}
```

---

## 8. Fluxo de Sincronização SDR ↔ MK

```
PASSO 1 — Autenticação (a cada sessão)
  WSAutenticacao → tokenRetornoAutenticacao
  Salvar token em mk_config/token_sessao + expiração

PASSO 2 — Sync de Clientes (periódico, ex: a cada hora)
  WSMKConsultaClientes(data_alteracao_inicio=ultimoSync)
  → Firebase sdr_comercial/default_tenant/clients/

PASSO 3 — Sync de Infraestrutura (diário ou manual)
  WSMKConsultaLocalManutencao(local=4) → OLTs
  WSMKConsultaLocalManutencao(local=1) → POPs
  WSMKConsultaLocalManutencao(local=6) → CTOs/NAPs
  WSMKConsultaPontoImobilizado        → Pontos físicos

PASSO 4 — Dados em tempo real (por cliente, sob demanda)
  WSMKConexoesPorCliente   → Status ONU, IP, velocidade
  WSMKContratosPorCliente  → Plano, status contrato
  WSMKFaturasPendentes     → Adimplente/Inadimplente

PASSO 5 — Ações SDR → MK
  WSMKCriarOrdemServico → Abrir OS de qualquer tela
  WSMKAutoDesbloqueio   → Botão "Desbloquear" na ficha
  WSMKNovaLead          → Registrar atendimento de campo
```

---

## 9. Mapeamento de Tipos de Local (Infraestrutura)

Usado em `WSMKConsultaLocalManutencao`:

| Código `local` | Tipo | Equivalente SDR |
|---|---|---|
| 1 | POP | `type: "pop"` em infrastructure |
| 2 | Armário | `type: "armario"` |
| 3 | Ponto de acesso | `type: "ponto_acesso"` |
| **4** | **OLT** | **`olt_connections/`** |
| 5 | Servidor | `type: "servidor"` |
| **6** | **Nap/Hub/CTO** | **`type: "cto"` em infrastructure** |
| 7 | Caixa de emenda | `type: "caixa_emenda"` |
| 99 | Outros | `type: "outro"` |

---

## 10. Implementação no sdr-module.js

### 10.1 Funções já implementadas (Modo Demo)

| Função | Descrição |
|---|---|
| `sdrMkConfigRender()` | Página de configuração — form de conexão MK |
| `sdrMkSaveConfig()` | Salva ip_porta/token/password no Firebase mk_config |
| `sdrMkTestarConexao()` | Testa autenticação MK (modo real ou demo) |
| `sdrMkSyncAll()` | Sync completo MK → Firebase (modo real ou demo) |
| `sdrMkDemoTopologia()` | Gera topologia FTTH completa de demonstração |

### 10.2 Funções a implementar (Integração Real)

| Função | Endpoint MK | Prioridade |
|---|---|---|
| `sdrMkAuth()` | `WSAutenticacao` | 🔴 Alta |
| `sdrMkSyncClientes()` | `WSMKConsultaClientes` | 🔴 Alta |
| `sdrMkSyncInfra()` | `WSMKConsultaLocalManutencao` | 🟡 Média |
| `sdrMkGetConexao(cdCliente)` | `WSMKConexoesPorCliente` | 🔴 Alta |
| `sdrMkAbrirOS(params)` | `WSMKCriarOrdemServico` | 🟡 Média |
| `sdrMkDesbloquear(cdConexao)` | `WSMKAutoDesbloqueio` | 🟡 Média |
| `sdrMkNovaLead(params)` | `WSMKNovaLead` | 🟢 Baixa |

### 10.3 Proxy recomendado (CORS)
Chamadas diretas ao MK de browser causam CORS error.
Solução: **Firebase Functions como proxy**
```
SDR browser → Firebase Function (sdrMkProxy) → MK 177.38.56.6:8080
```

---

## 11. Topologia FTTH Implementada no SDR

### Hierarquia completa
```
OLT (olt_connections/)
 └── PON s{slot}_p{port}
      └── DGO — Distribuidor Geral Óptico (infrastructure/, type:"dgo")
           └── Splitter 1º grau 1:8 (infrastructure/, type:"splitter_1")
                └── Splitter 2º grau 1:4 (infrastructure/, type:"splitter_2")
                     └── Splitter 3º grau 1:2 (infrastructure/, type:"splitter_3")
                          └── CTO — Caixa Terminal Óptica (infrastructure/, type:"cto")
                               └── ONU (onus/)
                                    └── Cliente (clients/)
```

### Cores ABNT para fibras (DGO)
| Nº | Cor |
|---|---|
| 1 | Cinza |
| 2 | Laranja |
| 3 | Verde |
| 4 | Azul |
| 5 | Amarelo |
| 6 | Violeta |
| 7 | Vermelho |
| 8 | Verde Claro |
| 9 | Marrom |
| 10 | Teal |
| 11 | Índigo |
| 12 | Rosa |

---

## 12. Problemas / Pendências

| # | Problema | Status | Ação necessária |
|---|---|---|---|
| 1 | Módulo Integradores não configurado | 🔴 Pendente | Jeff acessa MK → Integradores → Webservices → cria perfil |
| 2 | Token de API do MK não obtido | 🔴 Pendente | Depende do item 1 |
| 3 | Maps retorna erro de provedor | 🟡 Em análise | Verificar configuração de provedor no módulo Maps |
| 4 | CORS em chamadas diretas ao MK | 🟡 Em análise | Implementar Firebase Function proxy |
| 5 | MK usa HTTP (sem HTTPS) | 🟡 Risco | Comunicação entre SDR e MK deve ser server-side |
| 6 | Gerenciador de Elementos não explorado | 🟡 Pendente | Explorar via browser para mapear OLTs reais |

---

## 13. Próximos Passos (Sprint 6)

- [ ] **Jeff:** Acessar MK → Integradores → Gerenciador de Webservices → criar perfil SDR
- [ ] **Jeff:** Obter token do usuário JA-ADM e contra-senha do perfil criado
- [ ] **Dev:** Implementar `sdrMkAuth()` real (substituir demo)
- [ ] **Dev:** Implementar Firebase Function proxy para chamadas MK (evitar CORS)
- [ ] **Dev:** Implementar `sdrMkSyncClientes()` com sync incremental por `data_alteracao`
- [ ] **Dev:** Implementar `sdrMkSyncInfra()` para OLTs e CTOs reais
- [ ] **Dev:** Implementar `sdrMkGetConexao()` na ficha do cliente
- [ ] **Dev:** Botão "Abrir OS" integrado com `WSMKCriarOrdemServico`
- [ ] **Dev:** Botão "Desbloquear" integrado com `WSMKAutoDesbloqueio`
- [ ] **Jeff:** Explorar Gerenciador de Elementos → ver OLTs cadastradas no MK
- [ ] **Jeff:** Explorar Provisionamento → entender fluxo de ativação de ONU

---

## 14. Links e Referências

- [[MK_API_REFERENCE]] — Documentação completa dos Webservices MK
- [[PLAN_SDR_COMERCIAL_v3_FINAL]] — Plano de desenvolvimento do módulo Comercial
- [[SPRINT_LOG]] — Log de sprints do projeto SDR
- Documentação MK oficial: https://mkloud.atlassian.net/wiki/spaces/MK30/overview
- SDR produção: https://solucaoderua.web.app/admin
