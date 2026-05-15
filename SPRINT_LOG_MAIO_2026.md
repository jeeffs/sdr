# Sprint Log — Maio 2026
> Histórico de implementações do SDR Soluções de Rua
> Período: 2026-04-15 a 2026-05-12

---

## Sprint: Sistema Supervisor Financeiro
**Status:** ✅ Em produção (com bugs conhecidos pendentes)
**SW cache:** sdr-v147

### Contexto
O Juliano (tecnico3) passou a ter papel duplo: executa OS normalmente (V1) e
coordena a equipe (recebe diferencial V2-V1 de todos os técnicos do mês).

### Implementações realizadas

#### 1. Flag supervisor no RTDB
- Path: `users/tecnico3/supervisao: true`
- Ativado via console Firebase direto

#### 2. Cálculo supervisor — index.html (mobile)
**renderDashboard** — 3 cards no lugar de 1:
- Serviços Executados (azul) = próprias OS × precosV1
- Coordenação Técnica (verde) = diferencial V2-V1 de toda equipe
- Total (roxo) = soma dos dois

**renderFinanceiro** — 4 cards:
- Serviços Executados = totalBruto
- Venda a Prazo = -totalDesc
- Valor Líquido = totalLiq (já inclui bônus)
- Coordenação Técnica (roxo) = bonus

#### 3. Badge e toggle — sdr-bundle.js (admin)
- `renderTecnicosPage` (sub-aba prestadores): badge + toggle ✅
- `renderFinanceiro$1` (Financeiro principal): badge + toggle ✅ (corrigido 2026-05-12)
- Header roxo (#6d28d9) quando supervisao === true
- Toggle `window._toggleSupervisor(uid)` alterna null ↔ true no RTDB

#### 4. Seção gestão no PDF (sdr-bundle.js ~linha 10071)
- Variáveis pré-computadas: `_supServicosHtml` e `_supCoordHtml`
- Evitam SyntaxError de IIFEs dentro de template literals
- PDF mostra tabela de serviços executados + tabela de coordenação

#### 5. Primeiro Aditivo Contratual
- Template gerado no admin (sdr-bundle.js)
- Assinatura digital via canvas no mobile (index.html)
- Upload para Firebase Storage
- Deleção automática do HTML após upload do PDF assinado
- Path RTDB: `contratos/{uid}/aditivo_1/`

### Bugs conhecidos (pendentes)
Documentados em SUPERVISOR_DESIGN.md:
- Bug 1: Duplo bônus no Resumo Financeiro (isV2 deveria ser isV2 && !isSupervisor)
- Bug 2: Detalhamento genérico (por frente, não por serviço individual)
- Bug 3: allRecords carrega só dados do usuário logado (totalGestao incorreto)

---

## Sprint: Infraestrutura e Qualidade (Abril 2026)

### Implementações realizadas

#### Service Worker bumps
- sdr-v53 → sdr-v56 → ... → sdr-v146 → sdr-v147

#### Firebase Storage
- Migração de `exportarCardTecnico` para Firebase Storage
- Deleção automática do HTML após upload do assinado
- `storage.rules` criado e configurado

#### Segurança e autenticação
- Monkey-patch REST para writes (set/update/remove/push) no admin.html
- Silenciar console.log/warn em produção
- Correção CSP no firebase.json (connect-src, worker-src)
- Correção form login (password field, first-login, autocomplete)

#### Financeiro fiscal
- Relatório financeiro do fiscal (V0) com botão WhatsApp

#### Serviço fixo mensal
- Ewerton KMZ: R$750/mês implementado

#### Contrato OTDR
- Multi-assinatura (contratos_otdr.js + admin.html + tecnicos.js)

---

## Estado atual do sistema (2026-05-12)

### Arquivos chave
| Arquivo | Tamanho aprox. | Função |
|---|---|---|
| `public/sdr-bundle.js` | ~12.000 linhas | Todo o código do admin |
| `public/index.html` | ~7.000 linhas | App mobile dos técnicos |
| `public/sw.js` | ~190 linhas | Service worker, cache sdr-v147 |
| `public/admin.html` | ~300 linhas | Shell HTML do admin |

### Deploy
```powershell
cd "C:\Users\Jeeff\OneDrive\Documentos\ObsidianAI\Claude\SDR"
firebase deploy --only hosting
```

### Próximas pendências
- [ ] Corrigir bug duplo bônus no mobile (isV2 && !isSupervisor)
- [ ] Desdobrar detalhamento bônus por tipo de serviço
- [ ] Corrigir allRecords para carregar OS de toda equipe
- [ ] Atualizar SPRINT_LOG.md principal com este conteúdo
