# SUPERVISOR_DESIGN.md — Sistema Supervisor SDR
> Documentação completa do feature supervisor financeiro
> **Criado:** 2026-05-12

---

## 🎯 O QUE É O SUPERVISOR

O supervisor é um técnico com papel duplo:
1. **Executa** OS normalmente (cobrado a preço V1)
2. **Coordena** toda a equipe (recebe diferencial V2−V1 de todos os técnicos)

Técnico atual: **Juliano** (UID: `tecnico3`)
Flag no RTDB: `users/tecnico3/supervisao: true`

---

## 💰 CÁLCULO DO HONORÁRIO

### Variáveis
| Variável | Significado |
|---|---|
| `totalBruto` / `totalV1` | Soma das próprias OS × `precosV1map[tipo]` |
| `bonus` / `totalGestao` | Soma de TODA equipe × `(precosV2map[tipo] − precosV1map[tipo])` |
| `totalGeral` | `totalBruto + bonus` |
| `totalDesc` | Descontos/empréstimos |
| `totalLiq` | `totalGeral − totalDesc` |

### Fórmulas
```
totalBruto = ∑ (próprias OS) × precosV1map[tipo]
bonus      = ∑ (TODA equipe) × (precosV2map[tipo] − precosV1map[tipo])
totalGeral = totalBruto + bonus
totalLiq   = totalGeral − totalDesc
```

### Exemplo real (Maio 2026 — Juliano)
```
totalBruto = R$226,00   (4 OS próprias × V1)
bonus      = R$88,25    (diferencial V2-V1 de toda equipe)
  ├── FILIAL MANUTENÇÃO: R$33,00
  │     REPUXE 300× R$0,05         = R$15,00
  │     FUSÃO 16× R$0,50           = R$ 8,00
  │     MANUTENÇÃO CTO 3× R$1,50   = R$ 4,50
  │     ACOMPH CPFL 4× R$1,00      = R$ 4,00
  │     INSERÇÃO CABO 4× R$0,25    = R$ 1,00
  │     EQUIPAGEM POSTE 1× R$0,50  = R$ 0,50
  ├── MATRIZ MANUTENÇÃO: R$30,25
  └── FILIAL PROJETO: R$25,00
totalGeral = R$314,25
totalDesc  = R$226,00   (coincide com totalBruto em maio)
totalLiq   = R$ 88,25   (= bonus, pois totalBruto = totalDesc)
```

---

## 📱 DISPLAY MOBILE — index.html

### Dashboard (renderDashboard)
3 cards para supervisor (em vez do card único padrão):

| Card | Cor | Valor |
|---|---|---|
| Serviços Executados | Azul | `totalV1` (próprias OS × V1) |
| Coordenação Técnica | Verde | `totalGestao` (diferencial equipe) |
| Total | Roxo | `totalGeral` |

### Financeiro (renderFinanceiro)
4 cards métrica:

| Card | Cor | Valor |
|---|---|---|
| Serviços Executados | Azul | `totalBruto` |
| Venda a Prazo | Vermelho | `-totalDesc` |
| Valor Líquido | Verde | `totalLiq` (já inclui bonus!) |
| Coordenação Técnica | Roxo | `bonus` (só para isV2 ou isSupervisor) |

### Detalhamento Bônus (div #fin-bonus-detalhe)
Agrupa por: `prestador → frente → tipo`

**Exibe atualmente (genérico por frente):**
```
Juliano você         R$88,25
  FILIAL MANUTENÇÃO  R$33,00   ← valor agregado
  MATRIZ MANUTENÇÃO  R$30,25
  FILIAL PROJETO     R$25,00
```

**Deveria exibir (por serviço — PENDENTE):**
```
Juliano você         R$88,25
  FILIAL MANUTENÇÃO  R$33,00
    REPUXE (300×)       R$15,00
    FUSÃO (16×)         R$ 8,00
    MANUTENÇÃO CTO (3×) R$ 4,50
    ...
```

---

## 🖥️ DISPLAY ADMIN — sdr-bundle.js

### Badge e Toggle (renderFinanceiro$1 — linha ~7801)
- Header roxo (`#6d28d9`) quando `u.supervisao === true`
- Badge: `🔑 Supervisor` em destaque no card
- Botão toggle: `+ Sup` / `✕ Sup` para ativar/desativar

### Código implementado (linha ~7801):
```javascript
const _isSup = u.supervisao === true,
  _supBadge = _isSup ? '<span style="...">🔑 Supervisor</span>' : '',
  _supToggle = `<button onclick="window._toggleSupervisor('${uid}')">...</button>`,
  cardBorder = isHist ? "#cbd5e1" : _isSup ? "#7c3aed" : avatarBg,
  headerBg = isHist ? "#64748b" : _isSup ? "#6d28d9" : "#1f4e79"
```

### Toggle function (linha ~11912):
```javascript
window._toggleSupervisor = async (uid) => {
  const isSup = usersCache[uid]?.supervisao === true;
  await set(ref(db, `users/${uid}/supervisao`), isSup ? null : true);
  // reload
}
```

### PDF exportarCardTecnico (sdr-bundle.js linha ~10071)
Seção de gestão no PDF com:
- `_supServicosHtml` — tabela de serviços executados (V1)
- `_supCoordHtml` — tabela de coordenação técnica (diferencial V2-V1)

---

## 🐛 BUGS CONHECIDOS (NÃO CORRIGIDOS)

### Bug 0: `currentUser` sem campo `supervisao` ← RAIZ DE TUDO
**Onde:** `index.html:1823` — `loginSuccess()`
**Problema:** `currentUser = { id, name, nivel }` não copiava `supervisao` do usersCache
**Efeito:** `isSupervisor` sempre false — todo o sistema supervisor mobile inativo
**✅ CORRIGIDO 2026-05-12:** `currentUser = { ..., supervisao: u.supervisao === true }`

### Bug 1: Duplo bônus no Resumo Financeiro mobile
**Onde:** `index.html:6110`
**✅ CORRIGIDO 2026-05-12:** `${isV2 ? ...}` → `${isV2 && !isSupervisor ? ...}`

### Bug 2: Detalhamento genérico (por frente, não por serviço)
**Onde:** `index.html:6029`
**✅ CORRIGIDO 2026-05-12:** Condição `(isV2 || isSupervisor)` + breakdown por `sv.tipo`

### Bug 3: allRecords carrega só dados do usuário logado
**Onde:** `index.html:1796` — `carregarOsDoUsuario()`
**✅ CORRIGIDO 2026-05-12:** Supervisor busca `/os.json?auth=token` (sem filtro userId)

---

## 📋 PENDÊNCIAS DE IMPLEMENTAÇÃO

- [x] **Bug #0 corrigido** — `supervisao` no `currentUser` (2026-05-12)
- [x] **Duplo bônus corrigido** — `isV2 && !isSupervisor` no resumo (2026-05-12)
- [x] **allRecords corrigido** — supervisor busca toda equipe (2026-05-12)
- [x] **Detalhamento por serviço** — REPUXE, FUSÃO etc. com qtd e diferencial (2026-05-12)
- [ ] **Validar em produção** — confirmar valores de Maio/2026 com Juliano

---

## 🔑 REFERÊNCIA RÁPIDA

```javascript
// Verificar flag supervisor
const isSupervisor = currentUser.supervisao === true;  // mobile
const _isSup = u.supervisao === true;                   // admin

// Tabelas de preço (carregadas do RTDB)
precosV1map = { "REPUXE": 0.40, "FUSÃO": 8.00, ... }
precosV2map = { "REPUXE": 0.45, "FUSÃO": 8.50, ... }

// Cálculo do bonus (supervisor)
bonus += qtd * (precosV2map[tipo] - precosV1map[tipo])
```
