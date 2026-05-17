# CLAUDE.md — SDR Soluções de Rua
> Leia este arquivo inteiro antes de qualquer ação. Sem exceções.
> **Última atualização:** 2026-05-17

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
cd C:\dev\SDR; firebase deploy --only hosting
```

> ⚠️ **ATENÇÃO:** O path OneDrive (`C:\Users\Jeeff\OneDrive\Documentos\ObsidianAI\Claude\SDR`) está **CORROMPIDO** (fatal: bad object HEAD). **Nunca use.** Veja seção [Pasta OneDrive Proibida](#-pasta-onedrive-proibida) abaixo.

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
- Descontos/parcelamentos: salvos em `config/descontos` com campo `uid` (admin lê/escreve aqui — OTDR aqui)
- `config/emprestimos`: path alternativo também lido pelo mobile (mobile faz merge dos dois paths)
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

### Bug bônus V2 corrigido (2026-05-15)
- `totalLiq` em `renderFinanceiro` agora inclui o bônus: `totalBruto + bonus - totalDesc`
- Card "Coordenação Técnica" (roxo) mostra o componente bônus antes do Valor Líquido
- Alinhado com `renderDashboard` que já calculava `totalGeral = totalV1 + totalGestao`

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
- [ ] Executei: `cd C:\dev\SDR; firebase deploy --only hosting`
- [ ] Verifiquei o app em produção após deploy

---

## 🔄 HISTÓRICO RECENTE (ver SPRINT_LOG.md para detalhes)

- `2026-05-17` — Relatório assinado: fix "PDF assinado não encontrado" — admin checava `pdfAssinado`, mobile salvava `pdfAssinadoUrl` (Storage OK) — exportar.js agora lê ambos
- `2026-05-17` — Botão "Salvar como PDF" no iframe: trocado de `frame.contentWindow.print()` (bloqueado por sandbox) para `window.open(frame.src, '_blank')`; sandbox ganhou `allow-scripts allow-modals`
- `2026-05-17` — Honorários Extra: detalhamento no PDF exportarCardTecnico, replicando algoritmo `renderFinanceiro` do mobile (agrupamento uid‖prof‖tipo, badge auto-prestador)
- `2026-05-17` — Fix iframe vazio em `solucaoderua.web.app/?relatorio=`: `htmlContent` agora salvo no Firebase após geração do HTML; `skipWindow` param adicionado a `exportarCardTecnico`; `enviarRelatorioWhatsApp` delega para `exportarCardTecnico`
- `2026-05-17` — Substituições legais: Bônus→Honorários, Supervisão→Acompanhamento, remuneração→valor, Gestão→Fiscal (6 arquivos)
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

## Regras de colaboração (atualizadas em 2026-05-17)

---

### 🚫 Pasta OneDrive Proibida

**Path único válido: `C:\dev\SDR\`**

A pasta `C:\Users\Jeeff\OneDrive\Documentos\ObsidianAI\Claude\SDR` está **CORROMPIDA**
(`fatal: bad object HEAD`) e **nunca deve ser usada**.

Em sessão anterior, o Cowork editou e fez deploy a partir do OneDrive, causando **perda de
~8h de trabalho**. A recuperação foi via `cd C:\dev\SDR; firebase deploy --only hosting`
(funcionou porque `C:\dev\SDR` tinha todos os commits no GitHub).

> **TODO:** deletar a pasta OneDrive após confirmar que C:\dev\SDR está completa.

---

### ✂️ Edição de arquivos grandes — PowerShell vs Python

Scripts Python no sandbox Linux do Cowork **truncaram arquivos 8 vezes** em sessões
recentes (mobile.html: 7547 linhas, ~440KB). Padrão do truncamento:

- Python lê ~435 KB e escreve de volta sem o restante
- Arquivo fica com ~7250–7400 linhas (perdeu 150–300 linhas do final)
- `tail` não termina em `</html>`
- Scripts ficam desbalanceados (ex: 11 abertos / 10 fechados)

#### Edições CIRÚRGICAS (1–5 substituições simples) — use PowerShell

**PowerShell direto no Windows é o caminho seguro** para arquivos grandes.

```powershell
# Comando-padrão (UTF-8 sem BOM):
$path  = "C:\dev\SDR\APP\interface\mobile.html"
$old   = "texto exato a substituir"
$new   = "novo texto"
$enc   = [System.Text.UTF8Encoding]::new($false)
$txt   = [System.IO.File]::ReadAllText($path, $enc)
# Verificar que há exatamente 1 ocorrência antes de salvar:
$count = ([regex]::Matches($txt, [regex]::Escape($old))).Count
if ($count -ne 1) { throw "ABORT: $count ocorrencias encontradas (esperado 1)" }
$txt   = $txt.Replace($old, $new)
[System.IO.File]::WriteAllText($path, $txt, $enc)
```

Depois: sempre rodar os 3 checks de integridade (ver seção abaixo).

#### Edições GRANDES (refactor, nova função, múltiplas mudanças) — Cowork via Python

- Restaurar do git antes de reescrever: `git show HEAD:ARQUIVO > /tmp/original.html`
- Aplicar mudanças no original restaurado, não no arquivo potencialmente corrompido
- Rodar os 3 checks obrigatoriamente
- Se falhar: `git checkout HEAD -- ARQUIVO` e refazer

---

### ✅ Os 3 Checks de Integridade

Após **qualquer** edição em arquivos grandes (feita pelo Cowork ou pelo próprio Claude),
rodar **obrigatoriamente** os 3 checks antes de `git commit`:

```powershell
$path = "C:\dev\SDR\APP\interface\mobile.html"   # ajustar para o arquivo editado

# CHECK 1 — Line count (se caiu >100 linhas: TRUNCOU)
$lines = (Get-Content $path | Measure-Object -Line).Lines
Write-Host "Linhas: $lines"

# CHECK 2 — Tail termina em </html>
$tail = (Get-Content $path -Tail 1).Trim()
if ($tail -ne "</html>") { throw "NAO fecha em </html>: '$tail'" }
Write-Host "Tail OK: $tail"

# CHECK 3 — Scripts balanceados
$c = Get-Content $path -Raw
$o = ([regex]::Matches($c, '<script')).Count
$x = ([regex]::Matches($c, '</script>')).Count
if ($o -ne $x) { throw "Scripts desbalancados: $o open / $x close" }
Write-Host "Scripts OK: $o/$x"
```

Se **qualquer** check falhar → restaurar imediatamente:
```powershell
git checkout HEAD -- APP\interface\mobile.html
```

> A regra de scripts balanceados já pegou 1 truncamento antes do deploy em 2026-05-15 —
> provou seu valor. Não pule.

---

### 🔄 Diferença LF vs CRLF (informativo)

O git no Windows mostra "LF will be replaced by CRLF" ao fazer `git add`. **Normal — não
quebra nada.**

Sintoma comum: o Cowork (Linux) vê `mobile.html` com ~8293 linhas (LF), enquanto o
PowerShell (Windows) vê ~7547 linhas (CRLF). **Diferença de 400–800 linhas não é
truncamento** — é apenas a contagem de quebras de linha.

Para distinguir truncamento real de diferença CRLF/LF:
- Tamanho em bytes antes/depois (`(Get-Item $path).Length`)
- Tail termina em `</html>` (CHECK 2)
- Scripts balanceados (CHECK 3)

---

### 👥 Papéis fixos: Claude ↔ Cowork ↔ Jeff

| Papel | Responsabilidade |
|---|---|
| **Claude (chat)** | Analisa o problema, planeja a solução, verifica integridade pós-edição, passa ordens estruturadas ao Cowork. **NÃO executa edições diretas** (exceto quando Cowork falhou repetidamente e Jeff aprovou PowerShell) |
| **Cowork** | Executa as ordens recebidas do Claude, reporta status de cada passo, aguarda aprovação do Jeff antes de commit/push/deploy |
| **Jeff** | Arbitra (aprova/rejeita), executa comandos finais (commit, push, deploy), valida resultado em produção |

**Regra de prompt para o Cowork:** Toda tarefa deve especificar explicitamente
`INVESTIGA E PROPÕE` ou `EXECUTA`. Sem essa distinção, o Cowork tende a aplicar fixes
sem aprovação.

---

### Deploy de hosting — sequência canônica

```powershell
cd C:\dev\SDR
.\bump-sw.ps1                                                    # SEMPRE — bumpa CACHE_NAME + CACHE_SHELL
npm run build                                                    # se mexeu em src/admin/*.js
Copy-Item APP\interface\mobile.html public\index.html -Force    # se mexeu em mobile.html
# VALIDAR com os 3 checks — não pular
git add . ; git commit -m "..." ; git push origin main
firebase deploy --only hosting
```

### Ambiente

- Projeto em `C:\dev\SDR\` (FORA do OneDrive — não retornar nunca)
- PowerShell 5.1 não suporta `-replace { ... }` (script block) — usar `-replace "str", "str"`
- `Set-Content` default = ASCII — usar `[System.IO.File]::WriteAllText` com UTF-8 sem BOM
