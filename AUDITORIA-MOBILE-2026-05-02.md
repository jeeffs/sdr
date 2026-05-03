# Auditoria Técnica — SDR App Mobile
**Data:** 02/05/2026 | **Escopo:** index.html + módulos src/ (app técnicos de campo)

---

## 1. Segurança e LGPD

| Item | Risco | Problema encontrado no código | Recomendação |
|---|---|---|---|
| Token Firebase no query string | **ALTA** | `index.html` linha ~1131: REST API usa `?auth=${tok}` na URL. Token JWT visível em logs, histórico do browser e Referer headers. | Mover para header `Authorization: Bearer ${tok}`. O RTDB REST aceita esse header. |
| Hash de senha em `sessionStorage` durante toda a sessão | **ALTA** | `index.html` linha ~1695: `sessionStorage.setItem('sdr_bio_fhash', uid + ':' + h)`. Qualquer XSS lê trivialmente — equivale a expor a credencial Firebase. | Limpar `sdr_bio_fhash` imediatamente após reautenticação Firebase no callback `.then()`. |
| `innerHTML` sem escapeHtml em tickets e alertas | **ALTA** | `src/tickets/index.js` linhas 104-118 e `src/realtime/index.js` linha 215: `t.title`, `t.description`, `client.name` interpolados sem sanitização. XSS confirmado se admin gravar HTML no banco. | Implementar `escapeHtml(s)` e aplicar em todos os campos antes de interpolação. Já existe precedente no admin (task #3) — replicar para mobile. |
| `_impersonating` como variável global mutável | **ALTA** | `index.html` linha ~1069: `let _impersonating = false`. Qualquer JS na página seta `window._impersonating = true` e pula todos os bloqueios de EPI. | Não usar variável global para controle crítico. Verificar `currentUser.role === 'master'` diretamente em cada ponto de decisão. |
| `doLogin()` sem rate limiting | **ALTA** | `index.html` linha ~1646: `doLogin()` não chama `_checkRateLimit()`. Rate limiting existe para o admin mas o mobile tem implementação paralela sem limitação. | Implementar rate limiting no `doLogin()` mobile, análogo ao do admin. |
| `usersCache` carrega hashes de todos os técnicos | **ALTA** | `index.html` linha ~1213: `db.ref('users').once('value')` carrega `passwordHash`, `salt`, `biometria` e dados bancários de TODOS os usuários antes mesmo do login. | Carregar apenas campos de login (`name`, `passwordHash`, `salt`) antes da autenticação. Carregar dados completos do usuário específico somente após login. |
| Dados bancários (conta, PIX, agência) sem criptografia | **ALTA** | `index.html` linhas 341-362: campos `emp-banco`, `emp-agencia`, `emp-conta`, `emp-pix` gravados em `users/{uid}` em plaintext. Dados financeiros sob escopo direto da LGPD. | Criptografar via AES-GCM (Web Crypto API) antes de gravar, ou mover para subcoleção separada com regras de acesso mais restritivas. |
| CPF e RG sem proteção | **ALTA** | `index.html` linhas 326-336: campos `emp-resp-cpf` e `emp-resp-rg` coletados. CPF é dado sensível (LGPD art. 5º, II). | Criptografia no cliente ou isolamento em subcoleção restrita. Adicionar aviso de privacidade no formulário (LGPD art. 8º). |
| CSP com `unsafe-inline` e `unsafe-eval` | **MÉDIA** | `firebase.json` linha 44: ambas as diretivas invalidam a proteção contra XSS que o CSP oferece. | Migrar scripts inline para arquivos externos. Remover `unsafe-eval` — verificar se alguma lib CDN realmente precisa. |
| CDN sem SRI | **MÉDIA** | `index.html` linhas 938-943: Tesseract.js, qrcode-generator, ExcelJS e Leaflet sem atributo `integrity`. | Adicionar `integrity="sha384-..."` e `crossorigin="anonymous"` em cada script/link CDN. |
| `loginComo` sem proteção de autorização | **MÉDIA** | `index.html` linhas ~1246-1256: `?loginComo=uid` faz impersonate imediato se uid existir em `usersCache`. Única proteção é a URL não ser pública. | Exigir token de sessão admin válido antes de aceitar o parâmetro. |
| Ausência de política de privacidade | **MÉDIA** | Formulário coleta CPF, RG, CNPJ, dados bancários sem aviso de privacidade ou base legal informada ao titular. | Adicionar texto de consentimento e link para política antes do envio dos dados cadastrais. |

---

## 2. Autenticação e Sessão

| Item | Risco | Problema encontrado no código | Recomendação |
|---|---|---|---|
| Rate limiting apenas em memória (volátil) | **ALTA** | `src/admin/auth.js` linhas 32-62: `_loginAttempts` é objeto `{}` em memória. Reload da página zera o contador — brute force trivial com F5. | Persistir em `localStorage` com TTL. Melhor: Firebase App Check ou Cloud Function. |
| `verificarSenha` aceita hash sem salt como fallback | **MÉDIA** | `index.html` linhas ~1314-1322: hashes legados SHA-256 simples (sem salt) continuam válidos indefinidamente. Rainbow tables atacam facilmente. | Forçar migração: se `!user.salt`, exibir tela de upgrade obrigatório de senha em vez de aceitar hash legado. |
| Biometria sem `allowCredentials` | **MÉDIA** | `index.html` linhas ~1484-1488: `navigator.credentials.get` sem `allowCredentials`. Qualquer credencial WebAuthn do dispositivo pode ser aceita. | Passar `allowCredentials` com IDs registrados do usuário alvo antes da assertion. |
| Session timeout de 3h excessivo | **BAIXA** | `index.html` linha ~1527: `SESSION_TIMEOUT = 3 * 60 * 60 * 1000`. Técnico que deixa celular desbloqueado em campo fica exposto. O admin usa 30min. | Reduzir para 60-90min. Adicionar opção "manter conectado" para necessidades específicas. |

---

## 3. Armazenamento Local

| Item | Risco | Problema encontrado no código | Recomendação |
|---|---|---|---|
| `sdr_impersonate` em sessionStorage pode ser plantado | **ALTA** | `index.html` linha ~1288: `sessionStorage.getItem('sdr_impersonate') === '1'` pula bloqueios. Técnico pode injetar via console. | Não depender de sessionStorage para controle de permissão. Usar `role === 'master'` do Firebase. |
| `descontosCache` lê caminho depreciado | **MÉDIA** | `index.html` linha ~1733: `db.ref('descontos').once('value')`. CLAUDE.md indica que o correto é `config/emprestimos`. Mobile calcula financeiro com dados potencialmente desatualizados. | Atualizar para `db.ref('config/emprestimos').once('value')`. |
| Credential ID biométrico em localStorage sem expiração | **BAIXA** | `src/admin/auth.js` linha 274: `localStorage.setItem('srua_cred_' + user.id, b64)` persiste indefinidamente. | Adicionar TTL de 90 dias e sincronizar com `users/{uid}/biometria.credentialId`. |

---

## 4. Offline e Resiliência de Rede

| Item | Risco | Problema encontrado no código | Recomendação |
|---|---|---|---|
| Sem fila de escritas offline — perda de OS | **ALTA** | Ao falhar `salvarOS()` por falta de rede, a OS é perdida sem retry. O patch REST substitui as operações do SDK, perdendo o `keepSynced` nativo. | Implementar fila em `IndexedDB`: gravar localmente primeiro, exibir "pendente de sincronização", sincronizar via listener `online`. |
| Patch REST não implementa `.on()` | **ALTA** | `index.html` linha ~1123: `.on()` não é coberto pelo patch. `src/realtime/index.js` linha 33 usa `.on('value', ...)` nativo que depende do WebSocket bloqueado. | Implementar `.on()` via polling no patch REST, ou desabilitar o listener de tempo real no mobile e usar polling explícito. |
| `allRecords` sem fallback offline | **ALTA** | `index.html` linhas ~1714-1738: se o fetch falha, `allRecords = []` e o técnico vê dashboard vazio sem nenhum aviso. | Gravar `allRecords` em `localStorage` após cada fetch. Restaurar do cache se falhar e exibir "dados do cache — última atualização: HH:mm". |
| Timeout de 10s muito agressivo para 2G/3G | **MÉDIA** | `AbortSignal.timeout(10000)` nas linhas de fetch REST. Técnicos em campo com sinal fraco têm latências que excedem 10s. | Aumentar para 30s para escritas críticas. Retry automático com back-off exponencial (1s → 2s → 4s). |
| SW: log de install desatualizado | **BAIXA** | `sw.js` linha 57: `console.log('[SDR SW] install — v42')` mas CACHE_NAME é sdr-v48. Dificulta diagnóstico de problemas de cache em produção. | `console.log('[SDR SW] install —', CACHE_NAME)` — referenciar a constante. |

---

## 5. Performance e Bateria

| Item | Risco | Problema encontrado no código | Recomendação |
|---|---|---|---|
| Tesseract.js (~2.5MB) carregado no `<head>` para todos | **ALTA** | `index.html` linha ~941: biblioteca de OCR bloqueando no head mesmo para técnicos que nunca usam OCR. Penaliza o carregamento inicial de todos. | Lazy-load somente quando o recurso de OCR for acionado. Ou remover se não for mais usado no mobile. |
| `usersCache` carrega todos os usuários na inicialização | **ALTA** | `index.html` linha ~1212: carrega TODOS os técnicos (dados completos) antes de saber quem vai logar. | Carregar apenas lista de nomes para autocomplete. Dados completos somente após autenticação. |
| Leaflet sem lazy-loading | **MÉDIA** | `index.html` linhas 16-20: Leaflet (~140KB) carregado sincronicamente para todos, mesmo quem nunca usa a aba Mapa. | Carregar dinamicamente via `import()` apenas quando `navTo('pg-mapa')` for chamado. |
| Múltiplos `setInterval` por monkey-patch de `showPage` | **MÉDIA** | `src/realtime/index.js` linhas 248, 331 e `src/core/bootstrap.js` linha 127: 3 patches empilhados com flags distintas. Risco de múltiplos intervals ativos se os patches rodarem fora de ordem. | Substituir por `CustomEvent('sdr:page-change')`. Cada módulo escuta o evento sem sobrescrever a função. |
| Render completo de todas as abas no login | **MÉDIA** | `index.html` linhas ~1861-1865: `renderDashboard()`, `renderRegistros()`, `renderFinanceiro()`, `renderRelatorio()` chamados simultaneamente no `loginSuccess`. | Renderizar apenas a aba ativa. Demais abas renderizam sob demanda no `navTo`. |

---

## 6. UX e Acessibilidade (técnico em campo, celular, luz solar)

| Item | Risco | Problema encontrado no código | Recomendação |
|---|---|---|---|
| `user-scalable=no` impede zoom | **ALTA** | `index.html` linha 5: `maximum-scale=1,user-scalable=no`. Viola WCAG 1.4.4. Técnico com dificuldade visual não consegue ampliar conteúdo em campo. | Remover `user-scalable=no`. Corrigir CSS para que o zoom não quebre o layout. |
| Tela de bloqueio usa `innerHTML` com dados do banco | **MÉDIA** | `index.html` linha ~1847: `seguranca.motivo` interpolado via `innerHTML`. Um valor malicioso no campo `motivo` do Firebase executa HTML. | Sanitizar `segCheck.motivo` com `escapeHtml()` antes de interpolar. |
| Contraste insuficiente em `--muted` | **MÉDIA** | `index.html` linha 26: `--muted:#64748b` sobre `#fff` → ratio ≈ 4.1:1. Em luz solar direta o contraste percebido cai abaixo do mínimo WCAG AA. | Escurecer para `#475569` ou `#334155`. Considerar modo de alto contraste via `prefers-contrast`. |
| Bottom nav com 11 itens sem indicador de scroll | **MÉDIA** | `index.html` linhas 783-816: 11 itens em `overflow-x:auto` sem gradient indicativo de que há mais itens. Técnico com luvas não percebe o scroll horizontal. | Limitar a 5 itens primários + menu "Mais" (ícone `...`). Adicionar gradient fade nas bordas para indicar scroll. |
| Área de toque dos nav-items < 44px | **MÉDIA** | `.nav-item` com `padding:6px 4px` e `font-size:.55rem` resulta em área efetiva < 44px. | Aumentar padding vertical para garantir mínimo 48px de área de toque. |
| Toast com duração fixa de 3s | **BAIXA** | `index.html` linha ~1087: `setTimeout(3000)` fixo. Mensagens longas de erro desaparecem antes de serem lidas. | `Math.max(3000, msg.length * 50)ms`. Adicionar botão de fechar no toast. |
| Formulário sem validação de CNPJ | **BAIXA** | `index.html` linha 245: apenas `maxlength="18"`. Sem máscara nem validação de dígitos verificadores. | Implementar máscara e validação dos dígitos antes do `salvarEmpresa()`. |

---

## 7. Qualidade de Código Pós-migração

| Item | Risco | Problema encontrado no código | Recomendação |
|---|---|---|---|
| `showPage` sobrescrita 3x em monkey-patch empilhado | **ALTA** | `src/bootstrap.js` linha 127, `src/realtime/index.js` linhas 248 e 330: 3 patches com flags distintas (`_sdrPatched`, `_sdr9Patched`, `_sdrRtPatched`). Ordem de carregamento frágil. | Substituir por `CustomEvent('sdr:page-change')`. Módulos escutam o evento — sem sobrescrita de função. |
| Funções de crypto duplicadas entre index.html e auth.js | **ALTA** | `index.html` linhas ~1307-1313 redefine `sha256`, `gerarSalt`, `hashComSalt`, `verificarSenha` — exatamente as mesmas de `src/admin/auth.js`. Duas implementações que podem divergir. | Mover para `src/utils/crypto.js` e importar em ambos. |
| `src/tickets/index.js` com innerHTML sem escape | **ALTA** | Linhas 104-118: `t.title`, `t.description`, `t.notes`, `client.name` em template literal de tabela HTML. | Aplicar `escapeHtml()` em todos os campos. |
| `catch(_){}` silencioso em seguranca.js | **MÉDIA** | `src/admin/seguranca.js` linhas 5-89: erros de rede engolidos silenciosamente. Se o Firebase falhar na consulta de EPI, o bloqueio nunca é ativado — técnico passa sem verificação. | Substituir por `catch(e){ console.warn('[seguranca]', e.message); }`. Considerar propagar o erro ao técnico. |
| `descontosCache` lê caminho depreciado `descontos/` | **MÉDIA** | `index.html` linha ~1733: CLAUDE.md especifica que o correto é `config/emprestimos`. | Atualizar para `db.ref('config/emprestimos').once('value')`. |
| Bootstrap usa `setTimeout(0)` como gambiarra de ordem | **MÉDIA** | `src/core/bootstrap.js` linha ~156: `setTimeout(_sdrBootstrap, 0)` para esperar IIFE do bundle. Heurística frágil sob carga. | Usar `DOMContentLoaded` ou evento `sdr:bundle-ready` disparado pelo fim do IIFE. |
| Versão hardcoded `v15` no HTML | **BAIXA** | `index.html` linha ~413: `<div>v15</div>` dentro de `scr-abatimento`. Nunca atualizado com o deploy. | Centralizar em constante: `const APP_VERSION = '1.15'` e referenciar dinamicamente. |
| `sdrConverterCtoCeo` usa `alert()`/`confirm()` nativos | **BAIXA** | `src/realtime/index.js` linhas 356, 360: bloqueia thread principal, UX inconsistente no iOS. | Substituir por modal customizado (padrão `modal-overlay` já existe no app). |

---

## Resumo Executivo — Prioridade de Correção

### 🔴 Crítico — Corrigir Imediatamente

1. Token Firebase no query string URL → visível em proxies, logs de servidor e DevTools de qualquer técnico
2. Hash da senha em `sessionStorage` durante toda a sessão → XSS extrai credencial Firebase
3. `innerHTML` sem `escapeHtml` em tickets e alertas → XSS se admin gravar HTML no banco
4. `_impersonating` como variável global → qualquer técnico pula bloqueios de EPI via console
5. `doLogin()` sem rate limiting → brute force ilimitado no mobile
6. `usersCache` com hashes de todos os técnicos → prestador A pode ver hash de prestador B
7. Sem fila offline para OS → perda de dados em campo com rede ruim

### 🟡 Importante — Próximo Sprint

- Rate limiting persistente (localStorage com TTL)
- `user-scalable=no` removido (acessibilidade WCAG)
- Lazy-load Tesseract.js e Leaflet (performance inicial)
- Centralizar `sha256`/`hashComSalt` em `src/utils/crypto.js`
- Substituir monkey-patching de `showPage` por CustomEvent
- `descontosCache` → atualizar para `config/emprestimos`
- `catch(_){}` em seguranca.js → adicionar log mínimo

### 🟢 Backlog — Melhorias Planejáveis

- Toast com duração dinâmica + botão fechar
- Versão centralizada em constante
- Log do SW referenciando a constante `CACHE_NAME`
- Validação de CNPJ em tempo real
- `alert()`/`confirm()` → modal customizado
- Política de privacidade e consentimento LGPD
