# CLAUDE.md — SDR Soluções de Rua
> Leia este arquivo inteiro antes de qualquer ação. Sem exceções.
> **Última atualização:** 2026-05-15

---

## 🎯 O QUE É O SDR

PWA em produção contínua que gerencia técnicos de campo: importação de planilhas,
cálculo financeiro, relatórios, EPI/segurança e assinatura digital.

- **URL Produção:** https://solucaoderua.web.app
- **Admin:** https://solucaoderua.web.app/admin.html
- **Firebase Projeto:** `solucaoderua`
- **Responsável:** Jeff (Jefferson Rodrigues)

---

## 🌐 IDIOMA

**Sempre escreva em Português Brasil** — código, comentários, mensagens ao usuário, respostas no chat, tudo. Sem exceções.

---

## ⚠️ REGRAS DE OURO — NUNCA VIOLE

### 1. O app está SEMPRE em uso — nunca pode parar
- Usuários reais dependem do sistema 24h
- Qualquer erro em produção causa impacto imediato
- Dúvida? Não faça. Pergunte antes.

### 2. NUNCA faça deploy sem testar no browser
- Testar admin.html e index.html no browser antes de qualquer deploy
- Verificar console do browser (sem erros JS)

### 3. NUNCA altere dados do Firebase sem confirmação explícita
- Deleções e alterações de estrutura do banco são irreversíveis
- Sempre pergunte antes de qualquer operação de escrita em produção

### 4. NUNCA edite sdr-bundle.js pelo Vite — edite direto
- O sdr-bundle.js é o arquivo compilado em produção
- Edições diretas são feitas no arquivo `public/sdr-bundle.js`
- Para mudanças grandes no admin, editar sdr-bundle.js diretamente com Edit tool

---

## 🚀 COMANDO DE DEPLOY

```powershell
cd "C:\Users\Jeeff\OneDrive\Documentos\ObsidianAI\Claude\SDR"; firebase deploy --only hosting
```

**Sempre bumpar o SW cache antes de deploy** — usar `.\bump-sw.ps1` (bumpa CACHE_NAME + CACHE_SHELL juntos).
Cache atual: `sdr-v157` / `sdr-shell-v132`

### Sequência de deploy completa
```powershell
cd C:\dev\SDR
.\bump-sw.ps1                                                    # bumpa CACHE_NAME + CACHE_SHELL
npm run build                                                    # se mexeu em src/admin/*.js
Copy-Item APP\interface\mobile.html public\index.html -Force    # se mexeu em mobile.html
git add . ; git commit -m "..." ; git push origin main
firebase deploy --only hosting
```

---

## 🛠️ STACK TÉCNICA

| Recurso | Detalhe |
|---|---|
| **Frontend Admin** | Vanilla JS, arquivo `public/sdr-bundle.js` (~12.000+ linhas) |
| **Frontend Mobile** | Vanilla JS, arquivo `public/index.html` (~7.000+ linhas) |
| **Banco** | Firebase Realtime Database (não Firestore) |
| **Auth** | Firebase Auth |
| **Hosting** | Firebase Hosting |
| **Service Worker** | `public/sw.js` — cache `sdr-v147` |

### Estrutura de arquivos (o que importa)
```
public/
├── admin.html        ← HTML shell do admin (login, estrutura base)
├── sdr-bundle.js     ← TODO o código do admin (~12.000 linhas, editar aqui)
├── index.html        ← app mobile dos técnicos (~7.000 linhas)
├── sw.js             ← service worker (cache sdr-v147)
├── manifest.json     ← PWA config
├── icon-192.png
└── icon-512.png

firebase.json         ← config hosting + CSP headers
.firebaserc           ← projeto: solucaoderua
```

### Firebase RTDB — paths principais
```
root/
├── users/{uid}/           → técnicos cadastrados
│   ├── name, email, tipo  → dados do técnico
│   ├── supervisao: true   → flag supervisor (Juliano = tecnico3)
│   └── aditivo_1/         → dados do aditivo contratual assinado
├── os/{fbKey}/            → ordens de serviço
├── precos/
│   ├── v1/{tipo}          → tabela preços base (precosV1map)
│   └── v2/{tipo}          → tabela preços V2 (precosV2map)
├── config/
│   ├── profiles           → {FILIAL:[cidades], MATRIZ:[cidades]}
│   ├── servicos_extra[]   → serviços customizados
│   ├── emprestimos/       → créditos de ferramenta
│   └── de_para            → aliases de nomes de serviço
├── seguranca/             → EPI e documentos
├── contratos/
│   └── {uid}/aditivo_1/   → aditivo contratual por técnico
└── impostos_mensais/
```

---

## 👥 TÉCNICOS CADASTRADOS

| UID | Nome | Nível | Observação |
|---|---|---|---|
| tecnico3 | Juliano | V2 + Supervisor | `supervisao: true` no RTDB |
| tecnico4 | Ewerton | V1 | Serviço fixo mensal R$750 (KMZ) |

---

## 💰 SISTEMA FINANCEIRO

### Níveis de preço
- **V1** — preço base (`precosV1map`) — todos os técnicos usam
- **V2** — preço premium (`precosV2map`) — técnicos com flag V2
- **Supervisor** — flag `supervisao: true` — cálculo especial (ver SUPERVISOR_DESIGN.md)

### Regras de negócio críticas
- Valor calculado por `precosV1map[tipo] × qtd` — NUNCA pela coluna VALOR da planilha
- Crédito de ferramenta: em `config/emprestimos` (não `config/descontos` — depreciado)
- Importação: fingerprint de duplicata `userId|tipo|cidade|cto_ceo|data|nSvs|total_cents`
- Arquivos V2: só referência de preço, não geram registros
- V3 rejeitado se técnico já tem V1 no mesmo lote (exceto Jefferson)
- Arquivos "GERAL" sempre rejeitados

---

## 📄 SISTEMA DE CONTRATOS

### Aditivo Contratual (Primeiro Aditivo)
- Template gerado em `sdr-bundle.js` (função `gerarAditivoContratual`)
- Assinatura via canvas touch/mouse no mobile (`index.html`)
- Upload do HTML assinado para Firebase Storage
- Path RTDB: `contratos/{uid}/aditivo_1/`
- Após assinatura: HTML deletado do Storage, PDF gerado e mantido

---

## 🔑 SISTEMA SUPERVISOR

Ver `SUPERVISOR_DESIGN.md` para documentação completa.

**Resumo:**
- Flag: `users/{uid}/supervisao: true`
- Técnico supervisor: Juliano (tecnico3)
- Cálculo: próprias OS × precosV1 + diferencial V2-V1 de TODA a equipe
- Badge roxo no admin, 3 cards no dashboard mobile, 4 cards no financeiro mobile

---

## 🚨 ERROS CONHECIDOS — NÃO REPITA

### Bug duplo bônus no mobile (NÃO CORRIGIDO AINDA)
- No `renderFinanceiro` do index.html, o bloco `${isV2 ? ...}` exibe o bonus
  mesmo para supervisor, onde ele já está embutido no `totalLiq`
- Causa: `isV2 && !isSupervisor` deveria ser a condição, mas está só `isV2`
- Resultado: Resumo Financeiro mostra R$88,25 duplicado para Juliano

### allRecords no mobile (limitação conhecida)
- `allRecords` no mobile carrega apenas registros do usuário logado
- Impacto: "Detalhamento Bônus PRESTADOR" mostra apenas o próprio Juliano
- Cálculo real do `totalGestao` (toda equipe) está correto, mas detalhe está errado

### SyntaxError corrigido (sdr-bundle.js ~linha 10071)
- Variáveis `_supServicosHtml` e `_supCoordHtml` pré-computadas antes do template
- IIFEs dentro de template literals causavam SyntaxError — substituídas por variáveis

---

## ✅ CHECKLIST ANTES DO DEPLOY

- [ ] Testei admin.html no browser (sem erros no console)
- [ ] Testei index.html no browser (sem erros no console)
- [ ] Bumpei `CACHE_NAME` em `sw.js` (ex: sdr-v147 → sdr-v148)
- [ ] Executei: `cd "C:\Users\Jeeff\OneDrive\Documentos\ObsidianAI\Claude\SDR"; firebase deploy --only hosting`
- [ ] Verifiquei o app em produção após deploy

---

## 🔄 HISTÓRICO RECENTE (ver SPRINT_LOG.md para detalhes)

- `2026-05-15` — GPS best-of-N: watchPosition + bestPos (menor accuracy), ACC_IDEAL=20m, ACC_GOOD=50m, coleta 6s mínimo
- `2026-05-15` — GPS admin: capturarGPS implementado em src/admin/os.js (era missing)
- `2026-05-15` — GPS verDetalhe: coordenadas + link Google Maps no modal de detalhe
- `2026-05-15` — Nominatim BR: fallback quarter/hamlet para bairro (suburb vazio no Brasil)
- `2026-05-15` — SW corrompido restaurado (PowerShell injection), bump-sw.ps1 criado
- `2026-05-15` — Fix CACHE_SHELL não bumpado (index.html em SHELL_ASSETS)
- `2026-05-12` — Fix sistema supervisor mobile (4 bugs): currentUser+supervisao, duplo bônus, allRecords equipe, detalhamento por serviço
- `2026-05-12` — Badge supervisor corrigido na `renderFinanceiro$1` do admin
- `2026-05-07` — SW bump sdr-v147, deploy
- `2026-05-06` — Implementação completa do sistema supervisor
- `2026-04-xx` — Aditivo contratual, assinatura digital, Firebase Storage
