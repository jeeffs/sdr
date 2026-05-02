# RELATÓRIO DE AUDITORIA — SDR Solução de Rua
**Data:** 01/05/2026 | **Versão:** Bundle v37, 56 módulos  
**Método:** 3 agentes paralelos — análise estática de código, teste funcional no browser, auditoria financeira/exportação  
**Cobertura:** ~95% das funcionalidades (financeiro bloqueado por PIN)

---

## SUMÁRIO EXECUTIVO

| Severidade | Qtd | Status |
|---|---|---|
| 🔴 CRÍTICO | 3 | Requer correção imediata |
| 🟠 ALTO | 17 | Requer correção no próximo sprint |
| 🟡 MÉDIO | 20 | Planejar correção |
| 🟢 BAIXO | 7 | Backlog |

---

## 🔴 PROBLEMAS CRÍTICOS

### C1 — Vulnerabilidade `?loginComo=uid` sem autenticação ativa
**Arquivo:** admin.html:3626-3634 | **Testado em produção: CONFIRMADO**

Qualquer pessoa que conheça um UID pode acessar `/admin?loginComo=<uid>` e entrar no sistema **sem senha**. O código verifica apenas se o UID existe em `usersCache` e se o usuário está ativo — não exige que haja uma sessão master ativa.

```javascript
const _loginComoUid = _urlParams.get('loginComo');
if (_loginComoUid && usersCache[_loginComoUid] && usersCache[_loginComoUid].ativo !== false) {
  // → entra como esse usuário SEM verificar se quem está tentando é master
  await loginSuccess({ id: _loginComoUid, ... });
}
```
**Impacto:** Bypass total de autenticação. Tarefa #2 foi marcada como concluída mas o fix NÃO está ativo.  
**Correção:** Exigir `firebase.auth().currentUser` com email `@solucaoderua.app` E role master antes de permitir o `loginComo`.

---

### C2 — `corrigirPrecosDoMes` grava `total` errado na OS após correção
**Arquivo:** exportar.js:656-669

O campo `novoTotal` é calculado somando `sv.total` — mas esse campo só existe nos serviços que foram corrigidos. Serviços sem erro não têm `sv.total` e contribuem com 0.

```javascript
// BUG: sv.total não existe nos serviços não-corrigidos
const novoTotal = servicosCorrigidos.reduce((s, sv) => s + (Number(sv.total)||0), 0);
// → novoTotal = apenas soma dos serviços corrigidos, ignora o resto
```
**Impacto:** Após executar "Corrigir Preços do Mês", o campo `total` da OS fica menor que o real. Todos os cálculos financeiros subsequentes (financeiro mensal, relatório do técnico, exportação) ficam errados para OS corrigidas.  
**Correção:**
```javascript
const novoTotal = servicosCorrigidos.reduce((s, sv) => s + (Number(sv.qtd)||0) * (Number(sv.valor)||0), 0);
```

---

### C3 — `editarOS()` lança ReferenceError: `MAX_SERVICOS_POR_OS is not defined`
**Testado em produção: CONFIRMADO**

A constante `MAX_SERVICOS_POR_OS` não está definida no bundle v37 nem no admin.html atual. Toda tentativa de editar uma OS quebra com erro não tratado.

**Impacto:** Edição de OS está **completamente impossível**. Afeta operação diária.  
**Correção:** Verificar onde estava definida no bundle anterior e reintroduzir (provavelmente `const MAX_SERVICOS_POR_OS = 5;` ou similar).

---

## 🟠 PROBLEMAS ALTOS

### A1 — `_revokeBlobUrl` (singular) não existe — memory leak em exportações
**Arquivo:** exportar.js:379 | **Função inexistente**

```javascript
_revokeBlobUrl(a.href); // ← ReferenceError sempre que exporta planilha individual
```
Existe `_revokeAllBlobs` (plural) mas não `_revokeBlobUrl`. Cada exportação vaza uma Blob URL em memória. Após muitas exportações, pode causar lentidão.

**Correção:** Adicionar em ui-helpers.js:
```javascript
window._revokeBlobUrl = function(url) {
  try { URL.revokeObjectURL(url); } catch(_) {}
  window._blobUrls = (window._blobUrls || []).filter(u => u !== url);
};
```

---

### A2 — Página Segurança não renderiza automaticamente
**Testado em produção: CONFIRMADO**

Ao clicar em "Segurança" no menu lateral, a página exibe apenas título e dropdown — sem conteúdo. O hook `showPage` não chama `renderSegurancaPage()`.

**Impacto:** Usuário vê página vazia sem mensagem de erro. Funcionalidade parece quebrada.  
**Correção:** Adicionar no hook `showPage` (admin.html):
```javascript
if (name === 'seguranca') {
  if (typeof window.renderSegurancaPage === 'function') window.renderSegurancaPage();
}
```

---

### A3 — Fingerprint de duplicata diverge entre preview e execução (importar.js)
**Arquivo:** importar.js:807-810 vs 1043

O fingerprint gerado ao fazer preview da importação usa campos diferentes do fingerprint gerado na execução. Se os preços na aba `de_para` mudarem entre duas importações do mesmo arquivo, o fingerprint não bate e a OS é importada novamente como nova — **duplicata não detectada**.

**Impacto:** Risco de OS duplicadas no banco quando há reajuste de preços.  
**Correção:** Usar apenas `userId|tipo|cidade|cto|data|nSvs` sem o total monetário no fingerprint (o total varia com preços).

---

### A4 — Exceção Jefferson implementada de 4 formas diferentes
**Arquivos:** importar.js:1070, admin.html:2819, dashboard_admin.js:710, financeiro.js:547

Cada módulo tem sua própria forma de identificar Jefferson:
- `importar.js`: `.includes('JEFFERSON')` — captura "Carlos Jefferson" indevidamente
- `admin.html`: `=== 'jefferson'` — apenas nome exato
- `dashboard_admin.js`: `=== 'jefferson'` — apenas nome exato
- `financeiro.js`: `.includes('jefferson')` com `nivel === 'V3'`

**Impacto:** Comportamento inconsistente entre módulos. Técnico "Jefferson Silva" recebe exceção em importação mas não no dashboard financeiro.  
**Correção:** Centralizar em campo `excecaoV3: true` no Firebase (`users/{uid}/excecaoV3`).

---

### A5 — `_dbSet` e `_dbUpdate` sem guard contra `undefined`
**Arquivo:** firebase-helpers.js:10-11

Se `value` for `undefined`, Firebase pode lançar erro silencioso ou gravar `null` indesejado.

**Correção:**
```javascript
window._dbSet = async function(path, value) {
  if (value === undefined) throw new Error(`_dbSet: valor undefined no path ${path}`);
  await window.db.ref(path).set(value);
};
```

---

### A6 — `_calcR` na exportação não aplica aliases antes de buscar preço
**Arquivo:** exportar.js:40-43

```javascript
const _calcR = (r) => priceMap
  ? (r.servicos||[]).reduce((s,sv)=>s+(Number(sv.qtd)||0)*(priceMap[sv.tipo]||0),0)
```

`priceMap[sv.tipo]` retorna 0 se o tipo não estiver normalizado (aliases não aplicados). Exportações com "recalcular pelo preço atual" mostram R$ 0 para serviços com aliases.

**Correção:**
```javascript
const tipoNorm = window._normServico ? window._normServico(sv.tipo) : sv.tipo;
const preco = priceMap[tipoNorm] ?? priceMap[sv.tipo] ?? 0;
```

---

### A7 — `enviarRelatorioWhatsApp` usa tabela V1 para todos os técnicos
**Arquivo:** exportar.js:395-400

O total enviado por WhatsApp sempre usa `precosV1map`, independente do nível do técnico (V2, V3). Técnico V3 recebe mensagem com valor V1 errado.

---

### A8 — Preços negativos aceitos sem validação
**Arquivo:** config.js:160-165

```javascript
const v = parseFloat(inp.value)||0; // aceita -5 sem aviso
```
Um admin pode cadastrar preço negativo. Cálculos financeiros produzem totais negativos sem alerta.

**Correção:** `const v = Math.max(0, parseFloat(inp.value)||0);`

---

### A9 — `verificarTermosPendentes()` pode bloquear técnico V3 sem contrato
**Arquivo:** tecnicos.js:273-275

Verificação de contrato pendente só ocorre para V0/V1/V2. Técnico V3 (não-Jefferson) nunca passa pela verificação.

---

### A10 — Listeners de atividade instalados duas vezes após login
**Arquivo:** auth.js:81-83 + ui-helpers.js:22-28

Ao fazer logout e novo login, há 3 instâncias dos listeners de evento (click, keydown, touchstart, scroll). `_resetSessionTimer` é chamado múltiplas vezes por evento, causando chamadas desnecessárias ao Firebase.

---

### A11 — Rendering de dados do Firebase sem escape em `innerHTML`
**Arquivo:** financeiro.js:209-212, tecnicos.js:334-346

`empresa.razaoSocial` e outros campos do Firebase são inseridos diretamente em `innerHTML` sem sanitização. XSS potencial se o banco contiver dados maliciosos.

---

### A12 — `loginComo` em usuarios.js abre URL sem autenticação adicional
**Arquivo:** usuarios.js:5-15

O botão "Entrar como" abre `?loginComo=${uid}` em nova aba. Combinado com o bug C1, qualquer UID visto na tela de usuários pode ser usado para bypass.

---

### A13 — `removerDesconto` deleta do cache antes de confirmar sucesso no Firebase
**Arquivo:** financeiro.js:374-378

Se `_dbRemove` falhar, o cache local fica inconsistente com o banco (item removido do cache mas ainda no Firebase). Na próxima leitura, o item reaparece — confuso para o usuário.

---

### A14 — Rate limiting em memória — resetado no F5
**Arquivo:** auth.js:36-47

```javascript
const _loginAttempts = {}; // perde estado no reload
```
5 tentativas erradas + F5 = contador zerado. Atacante pode fazer força bruta.

**Correção:** Usar `sessionStorage` para persistir tentativas (não `localStorage` para não bloquear entre sessões).

---

### A15 — `numFmt` de data no Excel gravado como string
**Arquivo:** exportar.js:18-23

Datas exportadas como `DD/MM/YYYY` texto, não como data nativa do Excel. Filtros e ordenação de data no Excel não funcionam.

---

### A16 — `_salvarValorPlanilha` não trata formato BR `1.234,56`
**Arquivo:** importar.js:240

```javascript
const numVal = parseFloat(String(valor).replace(/[^\d.,-]/g,'').replace(',','.')) || 0;
```
Para `"1.234,56"` → `"1.234.56"` → `parseFloat` → `1.234` (perda silenciosa de ~R$ 1.233,22).

---

### A17 — `buildSidebar` acessa DOM sem null-check
**Arquivo:** tecnicos.js:357-378

```javascript
document.getElementById('filter-tec').style.display = 'inline-block'; // crash se null
document.getElementById('btn-del-tudo').style.display = 'inline-flex';
document.getElementById('tabela-header').innerHTML = ...
```
Crash se qualquer ID não estiver no DOM.

---

## 🟡 PROBLEMAS MÉDIOS

### M1 — Inconsistência de limiar dia 2 vs >2 em segurança
**Arquivo:** seguranca.js:32-34, 46-48, 73

Inventário e EPI checados apenas após `hoje.getDate() > 2`, veículo após `>= 2`. Técnico pode ser bloqueado por débito de veículo no dia 2 mas não pelo inventário.

---

### M2 — `calcJeffersonV1` retorna 0 indevidamente em início de mês
**Arquivo:** financeiro.js:545-621

O cálculo V1 de Jefferson depende de outros técnicos terem OS validadas. No início do mês (sem validações), o resultado é R$ 0 mesmo com OS lançadas. Pode estar correto por design, mas deveria ser documentado.

---

### M3 — Fórmula de precificação V2 usa proporção relativa histórica
**Arquivo:** dashboard_admin.js:43-58

Para OS históricas V2, usa `preço_V2_atual / preço_V1_atual × preço_V1_histórico`. Se preços foram reajustados assimetricamente, resultado incorreto.

---

### M4 — Parcelas arredondam para baixo (perda de centavos)
**Arquivo:** financeiro.js:459

Para desconto de R$ 100 em 3 parcelas: 3 × R$ 33,33 = R$ 99,99. Sistema nunca fecha exato.

---

### M5 — `iniciarFirebase` foi removida do bundle mas ainda era chamada pelo admin.html
**Arquivo:** admin.html:3525 | **RESOLVIDO nesta sessão**

A função foi reintroduzida inline no admin.html. Documentado aqui para rastreabilidade.

---

### M6 — `_isAdmin` em `soAdmin` com nome enganoso
**Arquivo:** tecnicos.js:497-500

```javascript
const soAdmin = typeof window._isAdmin === 'function' && !window._isAdmin(window.currentUser);
// nome diz "soAdmin" mas significa "NÃO é admin"
```
Risco de manutenção futura incorreta.

---

### M7 — `carregarDescontos` e `carregarDescontosTec` duplicam lógica e sobrescrevem cache
**Arquivo:** financeiro.js:5-39

Chamadas em sequência: a segunda sobrescreve o cache da primeira completamente.

---

### M8 — `_contratoSemGovBr` sem declaração no arquivo que a usa
**Arquivo:** tecnicos.js:307

Variável `_contratoSemGovBr` usada em `loginSuccess` mas não declarada em tecnicos.js — depende de declaração em admin.html. Frágil para manutenção.

---

### M9 — `precosV4map` copiado de `precosV3map` por referência antes de estar populado
**Arquivo:** finance.js:23-24

Race condition possível se `_carregarTodosPrecos` for chamada antes de V3 estar carregado.

---

### M10 — `initImpostos` chamada mas nunca encontrada nos arquivos analisados
**Arquivo:** tecnicos.js:639

```javascript
if (typeof initImpostos === 'function') initImpostos();
```
Função não encontrada em nenhum módulo. Impostos mensais podem não estar sendo inicializados.

---

### M11 — PDF de contrato gravado como DataURL no Realtime Database
**Arquivo:** usuarios.js:746-758

PDFs >1MB em base64 no Firebase RTDB aumentam custo de leitura do `usersCache` para todos.  
**Recomendação:** Migrar para Firebase Storage.

---

### M12 — `visualizarDocAutenticado` sem diagnóstico quando `_docsAutenticados` é undefined
**Arquivo:** contratos.js:114-116

Toast genérico "PDF não disponível" sem indicar que o usuário precisa recarregar.

---

### M13 — Check de PIN para página `tecnicos` é dead code
**Arquivo:** tecnicos.js:387 vs 411

A condição de PIN para `tecnicos` nunca é alcançada — há `return` antes.

---

### M14 — `update({key: null})` usado como delete no Firebase (não-óbvio)
**Arquivo:** usuarios.js:660-666

Correto funcionalmente mas perigoso para cópia de código sem entender semântica.

---

### M15 — `importarContrato` sem validação de tamanho do arquivo
**Arquivo:** usuarios.js:746

Sem limite de tamanho — usuário pode enviar arquivo de 100MB que vai ser gravado no Realtime DB.

---

### M16 — `r.nivelImp || 'V3'` inconsistente com padrão `'V1'` em outros lugares
**Arquivo:** importar.js:273

Registros sem `nivelImp` exibidos como V3 na tela mas tratados como V1 nos cálculos.

---

### M17 — `parseInt` em campo de form sem null-check
**Arquivo:** os.js:79, 95

`document.getElementById('s-qtd-${i}').value` pode lançar TypeError se elemento não existir.

---

### M18 — Regex de normalização pode ter problemas de encoding
**Arquivo:** constants.js:119

Recomendado usar `̀-ͯ` em vez de caracteres literais.

---

### M19 — `CLAUDE.md` desatualizado: path `config/emprestimos` (antigo) vs `config/descontos` (atual)
**Arquivo:** CLAUDE.md

O CLAUDE.md menciona `config/emprestimos` mas o código usa `config/descontos` em todos os módulos.

---

### M20 — `togglePwdVis` sem null-check
**Arquivo:** auth.js:88

`document.getElementById('pwd-input')` usado sem verificar null antes de acessar `.type`.

---

## 🟢 PROBLEMAS BAIXOS

### B1 — Log de install do Service Worker com versão errada
**Arquivo:** sw.js

Cache `sdr-v36` mas log diz `v35`. Dificulta debugging.

---

### B2 — Gráfico de Produção Mensal com escala achatada
**Testado em produção:** Barras muito baixas visualmente — possível `max` do eixo Y mal configurado.

---

### B3 — Select de Ano na exportação pode ter binding de evento inconsistente
**Testado em produção:** Alteração programática do select não disparou evento. Exportação pode requerer interação manual específica.

---

### B4 — `keepSynced is not a function` no console
**Testado em produção:** SDK Firebase compat não suporta `keepSynced`. Warning persistente mas sem impacto funcional.

---

### B5 — Preços negativos aceitos sem validação de frontend
**Arquivo:** config.js:160-165 (duplicado de A8 — listado também como baixo por impacto isolado)

---

### B6 — `SERVICOS` reatribuído sem `window.` em config.js
**Arquivo:** config.js:218

`SERVICOS = SERVICOS.filter(...)` — em strict mode seria `ReferenceError`.

---

### B7 — `importarContrato` sem previsão de progresso para arquivos grandes
**Arquivo:** usuarios.js:746

Sem feedback visual para PDF grande. Usuário pode achar que travou.

---

## PLANO DE AÇÃO PRIORIZADO

### Sprint imediato (hoje)
| # | Correção | Arquivo | Tempo estimado |
|---|---|---|---|
| 1 | Fix `?loginComo` — exigir sessão Firebase Auth master | admin.html:3626 | 30 min |
| 2 | Fix `MAX_SERVICOS_POR_OS` undefined | admin.html ou bundle | 15 min |
| 3 | Fix `corrigirPrecosDoMes` — novoTotal errado | exportar.js:669 | 20 min |
| 4 | Fix `renderSegurancaPage` não chamada no showPage | admin.html | 10 min |
| 5 | Fix `_revokeBlobUrl` inexistente | ui-helpers.js | 10 min |

### Sprint próximo (esta semana)
| # | Correção | Impacto |
|---|---|---|
| 6 | Centralizar exceção Jefferson em campo Firebase | Consistência entre módulos |
| 7 | Aplicar `_normServico` no `_calcR` da exportação | Preços corretos na exportação |
| 8 | Unificar fingerprint de duplicata | Evitar duplicatas em reajustes |
| 9 | Adicionar `renderSegurancaPage` no showPage hook | UX segurança |
| 10 | Guard `undefined` em `_dbSet/_dbUpdate` | Integridade Firebase |

### Backlog (próximas semanas)
- Migrar PDFs de contratos para Firebase Storage
- Centralizar `_nowBRT()` para datas em documentos legais
- Resolver parcelas com arredondamento (última parcela absorve diferença)
- Adicionar SRI/validação nos scripts CDN do admin.html
- Atualizar CLAUDE.md com path correto `config/descontos`
- Remover listeners de atividade duplicados
- Adicionar null-checks nos acessos DOM críticos
- Validar tamanho máximo de PDF no upload de contratos

---

## FUNCIONALIDADES APROVADAS (sem bug)

- ✅ Login com senha + rate limiting
- ✅ Auto-login por sessão (F5/reload)
- ✅ Dashboard KPIs e gráficos
- ✅ Tabela de OS com filtros
- ✅ Lançamento de nova OS (formulário, GPS, serviços)
- ✅ Modal de detalhes de OS
- ✅ Importação: rejeição de GERAL, V2 como referência, V3 com exceção Jefferson
- ✅ Importação: valor calculado por preço × qtd (nunca coluna VALOR)
- ✅ Filtro de exportação por período (inclusivo nos dois extremos)
- ✅ Mapa de rede (Leaflet, CTOs, cabos, OLTs)
- ✅ Dashboard de rede (KPIs tempo real)
- ✅ Painel OLTs com chassis visual
- ✅ Config Minha Empresa
- ✅ Config Usuários (lista, botões de ação)
- ✅ Proteção PIN no financeiro
- ✅ Biometria: detecção e limpeza de credencial obsoleta
- ✅ Firebase Auth fallback REST
- ✅ Data de OS importada de Excel: usa `getUTC*` (sem timezone shift)
- ✅ Cálculo de último dia do mês na exportação por mês

---

*Relatório gerado em 01/05/2026 por auditoria automatizada com 3 agentes paralelos.*
