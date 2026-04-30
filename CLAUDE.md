# CLAUDE.md — SDR Soluções de Rua
> Leia este arquivo inteiro antes de qualquer ação. Sem exceções.

---

## 🎯 O QUE É O SDR

PWA em produção contínua que gerencia técnicos de campo: importação de planilhas,
cálculo financeiro, relatórios, EPI/segurança e assinatura digital.

- **URL Produção:** https://solucaoderua.web.app
- **Admin:** https://solucaoderua.web.app/admin
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

### 2. NUNCA trabalhe direto no branch `main`
```
main     → produção (somente recebe merge aprovado)
develop  → desenvolvimento (todo trabalho acontece aqui)
```
Antes de qualquer mudança, confirme: `git branch` deve mostrar `develop`.

### 3. NUNCA faça deploy sem backup
Sempre use `.\BACKUP_E_DEPLOY.ps1` — nunca `firebase deploy` direto.
O script faz backup do código e do banco antes de qualquer mudança em produção.

### 4. NUNCA altere dados do Firebase sem confirmação explícita
Deleções e alterações de estrutura do banco são irreversíveis.
Sempre pergunte antes de qualquer operação de escrita em produção.

### 5. Teste antes de fazer merge para `main`
Toda mudança deve ser testada manualmente no browser antes de ir para produção.

---

## 🛠️ STACK TÉCNICA

| Recurso | Detalhe |
|---|---|
| **Frontend** | Vanilla JS (sem frameworks) |
| **Banco** | Firebase Realtime Database (não Firestore) |
| **Auth** | Firebase Auth |
| **Hosting** | Firebase Hosting |
| **Libs** | Firebase 9.23.0 (compat), ExcelJS 4.3.0, SheetJS 0.18.5, Tesseract.js 5 |

### Estrutura de arquivos (o que importa)
```
public/
├── admin.html        ← painel admin (~13.500 linhas)
├── index.html        ← app mobile dos técnicos
├── sdr-module.js     ← módulo compartilhado
├── sw.js             ← service worker (cache sdr-v7)
└── manifest.json     ← PWA config

firebase.json         ← config hosting + rewrites
.firebaserc           ← projeto: solucaoderua
```

### Ordem de carregamento JS (crítico)
```
constants → finance → ui-helpers → firebase-helpers → auth → inline admin.html → seguranca
```

### Namespaces disponíveis
- `Finance` — cálculos financeiros
- `UI` — helpers de interface (`$()`, `show()`, `hide()`)
- `CORES` — cores centralizadas
- `_dbRead/_dbSet/_dbUpdate/_dbPush/_dbRemove` — wrappers Firebase com retry
- `_cachedRead(path, ttlMs)` — cache com TTL 5min

---

## 🔄 FLUXO DE TRABALHO OBRIGATÓRIO

### Para qualquer mudança:
```
1. git checkout develop          (confirmar branch)
2. Fazer a alteração no código
3. Testar no browser localmente
4. git add . && git commit -m "descrição clara"
5. git push
6. Revisão visual final
7. git checkout main
8. git merge develop
9. .\BACKUP_E_DEPLOY.ps1        (backup + deploy)
10. git checkout develop         (voltar para develop)
```

### Para rollback de emergência:
```powershell
# Ver versões anteriores do Firebase Hosting
firebase hosting:releases:list --project solucaoderua

# Voltar para versão anterior
firebase hosting:rollback --project solucaoderua
```

---

## 💾 ESTRUTURA DO BANCO (Firebase Realtime Database)

```
root/
├── users/{uid}/          → técnicos cadastrados
├── os/{fbKey}/           → ordens de serviço
├── precos/{v1|v2|v3|v4}/ → tabelas de preço por nível
├── config/
│   ├── profiles          → {FILIAL:[cidades], MATRIZ:[cidades]}
│   ├── servicos_extra[]  → serviços customizados
│   ├── emprestimos/      → créditos de ferramenta (Código Civil)
│   ├── de_para           → aliases de nomes de serviço
│   └── valoresPlanilha/  → valores originais das planilhas
├── seguranca/            → EPI e documentos
├── relatorios/{uid}/{mes}
├── impostos_mensais/
└── contratos/
```

---

## 📋 REGRAS DE NEGÓCIO CRÍTICAS

### Importação de planilhas
- Fingerprint de duplicata: `userId|tipo|cidade|cto_ceo|data|nSvs|total_cents`
- Arquivos V2 são só referência de preço — não geram registros
- V3 rejeitado se técnico já tem V1 no mesmo lote (exceto Jefferson)
- Arquivos "GERAL" sempre rejeitados
- Valor calculado por `_preco(tipo) × qtd` via tabela `de_para` — NUNCA pela coluna VALOR da planilha

### Sistema financeiro
- Crédito de ferramenta: voluntário, base Código Civil (não CLT)
- Dados em `config/emprestimos` (não `config/descontos` — depreciado)
- Saldo = Total bruto − descontos − impostos

### Service Worker
- Cache atual: `sdr-v7`
- Para forçar refresh nos clientes após deploy: incrementar versão no `sw.js`

---

## 🚨 ERROS CONHECIDOS — NÃO REPITA

Consulte o Obsidian em `ARQUIVO/SDR/SDR - Log de Erros e Aprendizados` antes de qualquer mudança.

Principais pitfalls:
- Não remover `_gerarArquivosPorGrupo` e `_buildXlsxGeral` — ainda usadas por `exportarTecnico`
- `verificarTermosPendentes()` não deve bloquear técnicos (correção legal de 18/03/2026)
- Cache Firebase tem TTL 5min — mudanças no banco podem demorar para aparecer

---

## ✅ CHECKLIST ANTES DO DEPLOY

- [ ] Estou no branch `develop`
- [ ] Testei a mudança no browser
- [ ] Não há erros no console do browser
- [ ] Fiz merge para `main`
- [ ] Usei `.\BACKUP_E_DEPLOY.ps1` (não `firebase deploy` direto)
- [ ] Verifiquei o app em produção após o deploy
