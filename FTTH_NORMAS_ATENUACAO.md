# FTTH — Normas Técnicas, Atenuação Óptica e Power Budget

> **Objetivo**: Referência técnica completa para cálculos de viabilidade óptica, power budget, normas brasileiras e padrões de rede FTTH/GPON.  
> **Uso SDR**: Motor de cálculo de atenuação, verificação de viabilidade, alertas de sinal fraco.

---

## 1. Normas Técnicas Brasileiras — ABNT

### Normas Principais FTTH

| Norma | Escopo |
|-------|--------|
| **ABNT NBR 16869-1** | Requisitos para planejamento de cabeamento estruturado |
| **ABNT NBR 16869-2** | Testes em cabeamento óptico (publicada 12/04/2021) |
| **ABNT NBR 16869-5** | ODN — Optical Distribution Network |
| **ABNT NBR 14565** | Cabeamento estruturado para edificações comerciais |
| **ABNT NBR 16264** | Cabeamento óptico |
| **ABNT NBR 16521** | Cabeamento óptico |
| **ABNT NBR 16665** | Cabeamento óptico |
| **ABNT NBR 14100** | Código de cores em fibras ópticas |
| **ABNT NBR 14106** | Optical patch cord — Especificação |
| **ABNT NBR 14771** | Cabo óptico interno — Especificação |
| **ABNT NBR 13488** | Fibra óptica tipo monomodo de dispersão normal |
| **ABNT NBR 15445-1:2006** | Características de fibras ópticas |
| **ABNT NBR 16193:2013** | Propriedades e classificação de fibras |
| **ABNT NBR 13506:2017** | Tipos de cabos e splices |
| **ABNT NBR 14401:2016** | Tipos de fibras ópticas |
| **ABNT NBR 15794-2:2010** | Fatores de atenuação |

### Padrões Internacionais (ITU-T)

| Padrão | Tecnologia | Descrição |
|--------|-----------|-----------|
| **ITU-T G.984** | GPON | Gigabit Passive Optical Network |
| **ITU-T G.987** | XG-PON | 10G Passive Optical Network |
| **ITU-T G.9807** | XGS-PON | 10G Symmetric PON |
| **ITU-T G.989** | NG-PON2 | Next-Gen PON 2 (40G) |
| **IEEE 802.3ah** | EPON | Ethernet PON |

---

## 2. Código de Cores — Fibras Ópticas (ABNT NBR 14100)

### Cores das Fibras (dentro do tubo)

| Posição | Cor |
|---------|-----|
| 1 | Azul |
| 2 | Laranja |
| 3 | Verde |
| 4 | Marrom |
| 5 | Cinza |
| 6 | Branco |
| 7 | Vermelho |
| 8 | Preto |
| 9 | Amarelo |
| 10 | Violeta |
| 11 | Rosa |
| 12 | Água/Turquesa |

### Cores dos Tubos (cabo com múltiplos tubos)

| Posição | Cor |
|---------|-----|
| 1 | Azul |
| 2 | Laranja |
| 3 | Verde |
| 4 | Marrom |
| 5 | Cinza |
| 6 | Branco |
| 7 | Vermelho |
| 8 | Preto |
| 9 | Amarelo |
| 10 | Violeta |
| 11 | Rosa |
| 12 | Água/Turquesa |

> Padrão: Para cabo de 24 fibras = 2 tubos × 12 fibras. Para 48 fibras = 4 tubos × 12 fibras.

---

## 3. Tabela Completa de Atenuação Óptica

### 3.1 Fibra Óptica (por km)

| Tipo | Comprimento de Onda | Atenuação |
|------|---------------------|-----------|
| Monomodo OS2 (padrão FTTH) | 1310 nm (upstream) | **0,35 dB/km** |
| Monomodo OS2 (padrão FTTH) | 1490 nm (downstream) | **0,25 dB/km** |
| Monomodo OS2 (padrão FTTH) | 1550 nm (OTDR/TV) | **0,20 dB/km** |
| Multimodo OM3 | 850 nm | 3,5 dB/km |
| Multimodo OM4 | 850 nm | 3,0 dB/km |

> **Regra prática FTTH**: Use **0,35 dB/km** para cálculos conservadores no upstream (pior caso).

### 3.2 Splitters PLC (Passive Light Coupling)

| Razão de Divisão | Perda Teórica | Perda Real (PLC) | Margem Extra |
|-----------------|---------------|-----------------|--------------|
| 1:2 | 3,0 dB | **3,5 dB** | 0,5 dB |
| 1:4 | 6,0 dB | **7,0 dB** | 1,0 dB |
| 1:8 | 9,0 dB | **10,5 dB** | 1,5 dB |
| 1:16 | 12,0 dB | **13,5 dB** | 1,5 dB |
| 1:32 | 15,0 dB | **17,0 dB** | 2,0 dB |
| 1:64 | 18,0 dB | **20,5 dB** | 2,5 dB |

> **Regra**: A cada vez que o splitter dobra (1:8 → 1:16), adiciona ~3,5 dB de perda.

### 3.3 Splitters Cascateados (típico FTTH Brasil)

| Combinação | Perda Total |
|------------|-------------|
| 1:4 (CEO) + 1:8 (CTO) | 7,0 + 10,5 = **17,5 dB** |
| 1:4 (CEO) + 1:16 (CTO) | 7,0 + 13,5 = **20,5 dB** |
| 1:8 (CEO) + 1:8 (CTO) | 10,5 + 10,5 = **21,0 dB** |
| 1:8 (CEO) + 1:4 (CTO) | 10,5 + 7,0 = **17,5 dB** |
| 1:2 (proteção) + 1:16 | 3,5 + 13,5 = **17,0 dB** |

### 3.4 Conectores (por par conector/adaptador)

| Tipo | Perda Típica | Perda Máxima |
|------|-------------|-------------|
| SC/APC (verde) — padrão FTTH | **0,3 dB** | 0,5 dB |
| SC/UPC (azul) | **0,3 dB** | 0,5 dB |
| LC/APC | **0,2 dB** | 0,4 dB |
| E2000/APC | **0,2 dB** | 0,3 dB |

> **Regra prática**: Conte **0,5 dB por ponto de conexão** (par macho/fêmea) para cálculo conservador.

### 3.5 Emendas (Splices)

| Tipo | Perda Típica | Perda Máxima |
|------|-------------|-------------|
| Fusão (fusion splice) | **0,05–0,1 dB** | 0,2 dB |
| Mecânica (mechanical splice) | **0,3 dB** | 0,5 dB |

> **Regra prática**: Use **0,1 dB por emenda de fusão** nos cálculos.

### 3.6 Outros Fatores

| Fator | Perda |
|-------|-------|
| Curvatura do cabo (bend loss) | 0,5–1,0 dB total estimado |
| Envelhecimento e temperatura | **3 dB de margem de segurança** (reserva) |
| Conector sujo/mal polido | até 3,0 dB adicional |

---

## 4. GPON — Classes e Power Budget

### Classes de Power Budget (ITU-T G.984)

| Classe | Budget Máximo | Uso Típico |
|--------|---------------|-----------|
| **Classe B+** | **28 dB** | Padrão — 20 km + 1:32 |
| **Classe C+** | **32 dB** | Longa distância — 20 km + 1:64 |
| **Classe C++** | **35 dB** | Redes densas de alta capacidade |

> **No Brasil**: A maioria das OLTs ZTE e Huawei usa SFPs **Classe B+** (28 dB) ou **Classe C+** (32 dB).

### Parâmetros GPON Padrão

| Parâmetro | Valor |
|-----------|-------|
| Velocidade downstream | 2,488 Gbps |
| Velocidade upstream | 1,244 Gbps |
| Comprimento de onda downstream | **1490 nm** |
| Comprimento de onda upstream | **1310 nm** |
| Comprimento de onda OTDR/TV | **1550 nm** |
| Distância máxima OLT→ONU | **20 km** |
| Split máximo padrão | **1:128** (G.984) |
| Split típico Brasil | **1:32** ou **1:64** |

### Potência Típica dos Equipamentos

| Equipamento | Parâmetro | Valor Típico |
|-------------|-----------|-------------|
| OLT SFP B+ | Potência de transmissão | +1,5 a +5 dBm |
| OLT SFP C+ | Potência de transmissão | +3 a +7 dBm |
| ONU | Sensibilidade de recepção | -28 dBm |
| ONU | Potência de transmissão upstream | +0,5 a +5 dBm |

---

## 5. Cálculo de Power Budget — Fórmula

### Fórmula Geral

```
Power Budget disponível = Potência OLT (dBm) - Sensibilidade ONU (dBm)

Perda Total = 
    (distância_km × 0,35 dB/km)     → cabo
  + perda_splitters (dB)             → splitters cascateados
  + (n_conectores × 0,5 dB)         → conectores
  + (n_emendas × 0,1 dB)            → fusões
  + 0,5 dB (bend loss)               → curvaturas
  + 3,0 dB (margem segurança)        → envelhecimento

Margem = Power Budget - Perda Total

✅ OK: Margem > 0 dB
⚠️ Atenção: Margem entre 0 e 3 dB
❌ Inviável: Margem < 0 dB
```

### Exemplo Real de Cálculo

```
Cenário:
- OLT: ZTE C300 com SFP Classe B+ → Budget = 28 dB
- Distância OLT → ONU: 3,5 km
- Splitter CEO: 1:4 (7,0 dB)
- Splitter CTO: 1:8 (10,5 dB)
- Conectores: 4 pares (SC/APC)
- Emendas de fusão: 6

Cálculo:
  Cabo:       3,5 km × 0,35 = 1,23 dB
  Splitters:  7,0 + 10,5    = 17,5 dB
  Conectores: 4 × 0,5       = 2,0 dB
  Emendas:    6 × 0,1       = 0,6 dB
  Bend loss:                = 0,5 dB
  Margem seg.:              = 3,0 dB
  ─────────────────────────────────
  TOTAL:                    = 24,83 dB

Margem = 28 - 24,83 = 3,17 dB → ✅ OK (margem positiva)
```

### Tabela de Referência Rápida

> Usando SFP Classe B+ (28 dB budget) + splitter 1:4 CEO + 1:8 CTO (17,5 dB fixo de splitter)

| Distância | Perda Cabo | Total Estimado | Margem | Status |
|-----------|-----------|----------------|--------|--------|
| 500 m | 0,18 dB | 18,2 dB | 9,8 dB | ✅ Excelente |
| 1 km | 0,35 dB | 18,4 dB | 9,6 dB | ✅ Excelente |
| 2 km | 0,70 dB | 18,7 dB | 9,3 dB | ✅ Excelente |
| 3 km | 1,05 dB | 19,1 dB | 8,9 dB | ✅ Excelente |
| 5 km | 1,75 dB | 19,8 dB | 8,2 dB | ✅ Boa |
| 8 km | 2,80 dB | 20,8 dB | 7,2 dB | ✅ Boa |
| 10 km | 3,50 dB | 21,5 dB | 6,5 dB | ✅ Boa |
| 15 km | 5,25 dB | 23,3 dB | 4,7 dB | ✅ Aceitável |
| 18 km | 6,30 dB | 24,3 dB | 3,7 dB | ⚠️ Limite |
| 20 km | 7,00 dB | 25,0 dB | 3,0 dB | ⚠️ Margem mínima |

---

## 6. Valores de Sinal na ONU (dBm) — Referência

### Leitura de Sinal Óptico Recebido na ONU

| Faixa (dBm) | Status | Ação |
|-------------|--------|------|
| -8 a -15 | 🟢 Excelente | Normal |
| -15 a -22 | 🟡 Boa | Normal |
| -22 a -26 | 🟠 Aceitável | Monitorar |
| -26 a -28 | 🔴 Fraco | Investigar |
| < -28 | ⛔ Crítico | Técnico urgente |

> **Referência GPON**: Sensibilidade típica de ONU = -28 dBm. Sinal abaixo disso = ONU offline.

### Valores Típicos por Distância (rede bem executada)

| Distância | Sinal Esperado (dBm) |
|-----------|----------------------|
| < 500 m | -8 a -12 |
| 500 m – 2 km | -12 a -18 |
| 2 – 5 km | -18 a -22 |
| 5 – 10 km | -20 a -24 |
| 10 – 15 km | -22 a -26 |

---

## 7. Topologia FTTH — Arquitetura Padrão

### Hierarquia de Rede

```
OLT (Optical Line Terminal)
  └── Porta PON (1 porta = até 128 ONUs)
        └── Cabo Óptico (backbone)
              └── DGO / CEO (Distribuidor Geral / Caixa de Emenda)
                    ├── Splitter 1:4 ou 1:8 (1ª divisão)
                    └── Cabo de Distribuição
                          └── CTO (Caixa de Terminação Óptica)
                                ├── Splitter 1:8 ou 1:16 (2ª divisão)
                                ├── Porta 1 → Drop → ONU Cliente 1
                                ├── Porta 2 → Drop → ONU Cliente 2
                                └── ...
```

### Distâncias Recomendadas

| Trecho | Distância Máxima Recomendada |
|--------|------------------------------|
| OLT → CEO (backbone) | Até 10 km |
| CEO → CTO (distribuição) | Até 3 km |
| CTO → ONU (drop) | Até 300 m |
| OLT → ONU (total) | Até 20 km |

### Capacidade por Porta PON

| Configuração | ONUs por porta | Clientes por OLT (16 portas) |
|--------------|----------------|------------------------------|
| 1:32 (padrão) | 32 | 512 |
| 1:64 | 64 | 1.024 |
| 1:128 (máximo) | 128 | 2.048 |

---

## 8. Implementação SDR — Motor de Cálculo

### Função JavaScript — Power Budget

```javascript
// SDR — Cálculo de Power Budget GPON
// Retorna: { total_db, margem_db, status, detalhes }

function sdrCalcularPowerBudget(params) {
  const {
    distancia_km,           // distância OLT → ONU
    splitters = [],         // ex: [{ razao: '1:4', perda: 7.0 }, { razao: '1:8', perda: 10.5 }]
    n_conectores = 4,       // pares de conectores
    n_emendas = 4,          // emendas de fusão
    budget_olt_db = 28,     // Classe B+ = 28, Classe C+ = 32
    margem_seguranca = 3.0  // dB reservados
  } = params;

  // Constantes
  const ATENUACAO_CABO_DB_KM = 0.35;
  const PERDA_CONECTOR_DB = 0.5;
  const PERDA_EMENDA_DB = 0.1;
  const BEND_LOSS_DB = 0.5;

  // Cálculos individuais
  const perda_cabo = distancia_km * ATENUACAO_CABO_DB_KM;
  const perda_splitters = splitters.reduce((acc, s) => acc + s.perda, 0);
  const perda_conectores = n_conectores * PERDA_CONECTOR_DB;
  const perda_emendas = n_emendas * PERDA_EMENDA_DB;

  // Total
  const total_db = perda_cabo + perda_splitters + perda_conectores + 
                   perda_emendas + BEND_LOSS_DB + margem_seguranca;
  const margem_db = budget_olt_db - total_db;

  // Status
  let status, cor;
  if (margem_db >= 5) { status = 'excelente'; cor = '#00C851'; }
  else if (margem_db >= 3) { status = 'ok'; cor = '#ffbb33'; }
  else if (margem_db >= 0) { status = 'limite'; cor = '#ff8800'; }
  else { status = 'inviavel'; cor = '#ff4444'; }

  return {
    total_db: total_db.toFixed(2),
    margem_db: margem_db.toFixed(2),
    status,
    cor,
    detalhes: {
      cabo: perda_cabo.toFixed(2),
      splitters: perda_splitters.toFixed(2),
      conectores: perda_conectores.toFixed(2),
      emendas: perda_emendas.toFixed(2),
      bend: BEND_LOSS_DB,
      margem_seg: margem_seguranca
    }
  };
}

// Exemplo de uso:
const resultado = sdrCalcularPowerBudget({
  distancia_km: 3.5,
  splitters: [
    { razao: '1:4', perda: 7.0 },   // CEO
    { razao: '1:8', perda: 10.5 }   // CTO
  ],
  n_conectores: 4,
  n_emendas: 6,
  budget_olt_db: 28
});
// → { total_db: '24.83', margem_db: '3.17', status: 'ok', ... }
```

### Tabela de Perdas — Constantes para SDR

```javascript
const SDR_PERDAS = {
  cabo_db_km: 0.35,           // monomodo 1310nm
  cabo_db_km_1490: 0.25,      // monomodo 1490nm downstream
  
  splitters: {
    '1:2': 3.5,
    '1:4': 7.0,
    '1:8': 10.5,
    '1:16': 13.5,
    '1:32': 17.0,
    '1:64': 20.5
  },
  
  conector_db: 0.5,           // SC/APC par
  emenda_fusao_db: 0.1,
  bend_loss_db: 0.5,
  margem_seguranca_db: 3.0,
  
  budget_classe_b_plus: 28,
  budget_classe_c_plus: 32,
  budget_classe_c_plus_plus: 35,
  
  // Limites de sinal na ONU (dBm)
  sinal_excelente_min: -15,
  sinal_bom_min: -22,
  sinal_aceitavel_min: -26,
  sinal_fraco_min: -28,
  sinal_critico: -28         // abaixo disso = offline
};
```

---

## 9. Referências

- ITU-T G.984: itu.int/rec/T-REC-G.984
- Broadband Forum TR-156: broadband-forum.org
- ABNT Catálogo: abnt.org.br
- APNIC Blog GPON Power Budget: blog.apnic.net/2024/11/14/gpon-power-budget-calculations/
- PON Power Budget Calculator: netsense-nms.com/tools/pon-power-budget-calculator
- FOA (Fiber Optic Association): thefoa.org

---

*Criado em: 2026-04-18*  
*Tags: #ftth #gpon #atenuacao #powerbudget #normas #abnt #sdr*  
*Relacionado: [[FTTH_PLATAFORMAS_MAPEAMENTO]], [[TR069_ACS_PLATAFORMAS]], [[GEOSITE_ANALISE]], [[FERRAMENTAS_MAPA_MONITOR]], [[SDR_MODULE_MAPA_CODIGO]]*  
*Índice: [[SDR_INDEX]]*
