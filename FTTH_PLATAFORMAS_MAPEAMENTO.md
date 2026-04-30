# Plataformas de Mapeamento FTTH — Análise Completa

> **Objetivo**: Estudar as principais soluções do mercado de mapeamento, documentação e gestão de infraestrutura de fibra óptica para construir uma aplicação superior, combinando o melhor de cada plataforma.  
> **Contexto SDR**: ISP FTTH, clientes MK Solutions, redes com OLTs ZTE/Huawei, campo com técnicos Android.

---

## Visão Geral do Mercado

O mercado de software de mapeamento FTTH se divide em três categorias:

| Categoria | Plataformas | Foco |
|-----------|-------------|------|
| **GIS Especializado FTTH** | OZmap, GeoSite, Tomodat, GeoGridMaps, Fiberworks | Documentação + gestão ativa da rede |
| **Planejamento e Automação** | Comsof Fiber, FTTH Planner, IQGeo | Projeto e otimização de custo |
| **Enterprise / Internacional** | VETRO FiberMap, IQGeo OSPInsight, Geolantis.360 | Grandes operadoras, redes complexas |

---

## 1. OZmap — Referência Brasileira

**Site**: ozmap.com | ozmap.com.br  
**Empresa**: DevOZ  
**Tipo**: SaaS Cloud  
**Posição**: Líder de mercado no Brasil para ISPs médios e grandes  

### Funcionalidades Completas

#### Cadastro de Rede
- Postes georeferenciados com fotos, altura, proprietário
- Cabos ópticos (aéreo, subterrâneo, duto) com metragem real
- **CEOs** (Caixa de Emenda Óptica) com rastreio de splices
- **CTOs** (Caixa de Terminação Óptica) com portas e splitters
- **POPs** e DGOs (Distribuidor Geral Óptico)
- Splitters 1:4, 1:8, 1:16, 1:32 e **2xN** (para topologias de proteção)
- Reservas técnicas de cabo
- Hierarquia backbone / acesso (redes separadas com segurança e clareza visual)

#### Mapa Interativo
- Visualização em **Google Maps / Satélite**
- Iluminação bidirecional de sinal (rastreamento do caminho óptico)
- Status dos elementos: **Projeto, Implantado, Certificado**
- Zoom por hierarquia (backbone vs. acesso)
- Layers configuráveis por tipo de elemento

#### Viabilidade Comercial
- Pesquisa de viabilidade por **raio configurável**
- Envia coordenadas do cliente → busca caixas com portas disponíveis
- Retorna CTO mais próxima com porta livre
- Integração com ERP para reserva e ativação de porta

#### OTDR e Óptica
- Representação de OTDR no mapa (localização de quebras de fibra)
- **Power Budget** — extração de atenuação total da rota
  - Conta: cabo (dB/km) + splitters (dB) + conectores + emendas
- Informações de ocupação do cabo (fibras ativas/disponíveis por tubo)

#### Gestão de Clientes
- Clientes vinculados à porta física da CTO
- Status de ativação, suspensão, cancelamento
- Sincronização com ERP (ativação/cancelamento automático)

#### Relatórios e Análise
- Relatórios de área (KPIs por região)
- Diagramas lógicos da rede
- Dashboard NOC integrado
- Exportação de dados

#### App Mobile — OZmob
- Técnico em campo visualiza e atualiza a rede em tempo real
- Mudança de status de elementos
- Registro de observações e fotos
- Funciona offline com sincronização posterior

#### App de Levantamento — OZsurvey
- **Gratuito** e independente do OZmap
- Levantamento de postes, caixas, cabos, clientes em campo
- GPS automático + fotos geotagueadas
- Exporta para o OZmap

### Integrações Confirmadas

| Sistema | Tipo | Funcionalidade |
|---------|------|----------------|
| **MK Solutions** | Ativa (leitura DB do ERP) | Ativação, atualização e cancelamento de clientes |
| **Hubsoft** | Passiva (API calls do Hubsoft) | Viabilidade, reserva de porta, ativação |
| **Voalle / Elleven** | Ativa | Viabilidade, reserva, ativação, cancelamento |
| **ISPBox 2** | Confirmada | Gestão de clientes |
| **INT6 AutoISP** | Confirmada | Provisioning GPON integrado |
| **OZneutral** | Confirmada | Viabilidade, reserva, ativação, cancelamento |
| **API REST** | 100% aberta | Integração com qualquer sistema |

> **OZmap + MK Solutions**: Integração **ativa** — OZmap lê o banco de dados do MK para sincronizar ativações, atualizações e cancelamentos de clientes automaticamente.

### Modelo de Negócio
- SaaS Cloud com planos por tamanho de rede
- Suporte especializado incluído
- API 100% aberta e documentada
- Contato comercial para preços (não público)

### Diferenciais Únicos
- Maior base instalada de ISPs no Brasil
- Iluminação bidirecional de sinal (ver o caminho da luz)
- Integração nativa com MK Solutions
- OZsurvey gratuito para levantamento de campo
- Hierarquia backbone/acesso com controle de acesso separado

---

## 2. Tomodat — Completo e Acessível

**Site**: tomodat.com.br | tomodatlatam.com  
**Tipo**: SaaS Cloud  
**Fundação**: 2015  
**Posição**: Muito popular em ISPs pequenos e médios pelo custo-benefício  

### Funcionalidades

- Projeto de redes FTTH (draw na tela)
- Documentação de pontos: OLTs, PONs, CEOs, CTOs, splitters
- Google Maps integrado com imagens de satélite
- Controle de execução de obras
- Análise de viabilidade de novas redes
- Gestão de OLTs de clientes
- **OTDR**: localização imediata de pontos de quebra de fibra
- Identificação de fibras ativas/inativas por caixa
- App mobile Android para técnicos de campo
- API disponível para integração

### Preços (públicos)

| Plano | Rede | Preço/mês |
|-------|------|-----------|
| Starter | Até 20 km | R$ 180,00 |
| Standard | Até 50 km | Consultar |
| Pro | Acima de 50 km | R$ 350,00 |

Inclui: usuários ilimitados, integração OLT, hospedagem cloud.

### Integrações
- OLTs (gestão integrada)
- API REST para ERP
- MK-Auth (pedido de integração registrado no fórum)
- Google Maps

### Diferenciais
- Preço público e acessível
- Usuários ilimitados em todos os planos
- OTDR integrado
- Fácil de usar, curva de aprendizado baixa
- Expansão para LATAM (tomodatlatam.com)

---

## 3. GeoGridMaps — Documentação Focada

**Site**: geogridmaps.com.br  
**Tipo**: SaaS Cloud  
**Posição**: Alternativa ao OZmap, integrado com Hubsoft  

### Funcionalidades
- Documentação completa da rede: estação → cliente
- Mapas georeferenciados
- Consulta e análise de utilização da rede
- Postes, cabos subterrâneos, caixas, reservas técnicas, dutos
- Distribuidores ópticos (DIO)
- **GIIROMaps**: detalha extensão total por fibra e status ativo/inativo

### Integrações
- **Hubsoft** (integração nativa como parceiro)
- API para outros ERPs

---

## 4. Fiberworks Quantum — Geoprocessamento Independente

**Site**: fiberworks.com.br  
**Tipo**: Sistema desktop/web  
**Diferencial**: Independente de API de fornecedores de mapas (não depende do Google Maps)  

### Funcionalidades
- Geoprocessamento para mapeamento FTTH
- Gestão de ativos e passivos de rede óptica
- Simulação e entendimento da estrutura da rede
- CEOs, splitters, DIO, cabos ópticos
- **Tracers gráficos** de análise de conectividade
- Diagramas inteligentes de rede

### Diferenciais
- Independente de APIs pagas de mapeamento
- Tracer gráfico de conectividade (visualizar o caminho da fibra)
- Sistema próprio de cartografia

---

## 5. GeoSite Telecom — Referência Técnica

**Site**: geositetelecom.com.br  
**Login**: telecom.digicade.com.br  
**Empresa**: Geosite Tecnologia  
**Tipo**: SaaS Cloud (Oracle Cloud + Google Maps API)  

> ⚠️ Análise completa disponível em: [[GEOSITE_ANALISE]]

### Funcionalidades Resumidas (13 módulos)
1. Cadastro de elementos (postes, caixas, cabos, POPs)
2. Análise geográfica e viabilidade
3. Gestão de elementos (apagar, mover, modificar)
4. Modificação em massa
5. Visualizações (planta baixa, schematic)
6. Gestão de clientes (ativação por porta)
7. Mobile (técnicos em campo)
8. Projetos FTTH (workflow completo)
9. Integrações (Zabbix, OLTCloud, OTDR, CRM)
10. Conta e usuários
11. Exportação/importação de dados
12. Indicadores e filtros
13. Gestão de perda de sinal

### Diferenciais
- Módulo de projetos com workflow completo (do POP ao cliente)
- Integração nativa com OLTCloud e Zabbix
- Cálculo automático de perda de sinal (power budget)
- Gestão multi-empresa (para projetos de expansão)

---

## 6. FTTH Planner — Planejamento Especializado

**Site**: ftthplanner.com.br  
**Tipo**: Software focado em planejamento  

### Funcionalidades
- Planejamento de projetos de fibra
- Organização de CTO/CEO e rotas
- Análise de viabilidade técnica
- Gestão de expansão de rede
- Documentação de infraestrutura

---

## 7. VETRO FiberMap — Enterprise Cloud

**Site**: vetrofibermap.com  
**Tipo**: SaaS Cloud Enterprise  
**Mercado**: EUA/Internacional, ISPs médios/grandes  

### Funcionalidades
- Plataforma GIS cloud para redes FTTx
- Stack tecnológico aberto (open technology stack)
- Validação de conexões no design (detecta erros antes de construir)
- Mobile para envio direto de desenhos para revisão
- **Sincronização a cada 10 minutos** com GIS e OSS
- Dados sincronizados: rotas de fibra, endereços, premissas
- API aberta para integração com complementares
- Colaboração em tempo real

### Integrações
- Sonar Software (integração nativa)
- GIS/OSS via API
- Exportação para sistemas externos

### Diferenciais
- Sincronização automática a cada 10 minutos
- Validação de design antes da construção
- Colaboração em tempo real para equipes distribuídas

---

## 8. IQGeo / OSPInsight — Líder Outside Plant

**Site**: iqgeo.com/products/ospinsight  
**Tipo**: Enterprise SaaS  
**Usuários**: 100.000+ usuários ativos  
**Mercado**: Grandes operadoras, telecom, utilities  

### Funcionalidades
- Planejamento completo de Outside Plant (rede externa)
- Design, construção e manutenção — ciclo completo de rede
- Mobilidade de campo (melhor da indústria, segundo a empresa)
- Documentação de outside plant e inside plant
- **Schematics dinâmicos** de rede
- Importação/exportação de dados flexível
- Gestão de custo de mão de obra

### Evolução — Comsof Fiber (IQGeo)
Em 2025, a IQGeo adquiriu o Comsof Fiber, integrando automação de planejamento à plataforma.

> ⚠️ OSPInsight será descontinuado — usuários migram para **Network Manager Telecom** (IQGeo).

### Diferenciais
- 30+ anos de mercado
- Suporte a fibra, cobre e coaxial (rede convergente)
- Schematics dinâmicos automáticos
- Melhor mobilidade de campo do segmento enterprise

---

## 9. Comsof Fiber — Automação de Planejamento

**Site**: iqgeo.com/products/comsof-fiber  
**Tipo**: Software de planejamento automático (agora parte da IQGeo)  

### Funcionalidades
- **Automação de planejamento**: redução de 90% no tempo de projeto
- **Otimização de custo**: redução de até 10% no custo de construção
- Usa GIS + dados de mercado para decisões estratégicas
- Suporte a múltiplas arquiteturas: FTTH, FTTN, híbrido
- Análise de cenários simultâneos (comparar arquiteturas)
- **Design engine**: algoritmo que conecta cada ponto de serviço ao menor custo possível
- Templates de workflow para engenheiros novatos
- Conformidade com arquitetura desejada (regras de negócio)

### Algoritmo de Otimização
Entrada: dados geográficos da área (GIS)  
Saída: design completo de rede conectando todos os pontos de serviço ao menor custo, respeitando a arquitetura definida.

### Diferenciais
- 90% de redução no tempo de projeto vs. design manual
- Suporte a design de rede FTTN para upgrade de cabo para fibra
- Análise de custo por área para decisão de expansão

---

## 10. Geolantis.360 — Levantamento de Campo Profissional

**Site**: geolantis.com  
**Tipo**: App mobile + plataforma GIS  
**Foco**: Levantamento subterrâneo e aéreo em campo  

### Funcionalidades
- Coleta de dados GIS em campo (pontos, linhas, polígonos)
- Aquisição manual ou via **GNSS** (GPS de alta precisão)
- Visualização de ativos subterrâneos em mapas vetoriais customizáveis
- Geração de arquivos **CAD e GIS-ready** instantâneos
- Documentação de redes de fibra (instalação, upgrade, inspeção)
- As-built automático (documentação pós-obra)
- Gestão de workforce (equipes em campo)

### Performance
- Redução de até **90% no custo de documentação**
- **3x mais rápido** na coleta de dados em campo
- Workflows padronizados reduzem erros

### Integrações
- API aberta → GIS, CAD, ERP
- Exporta para Google Earth, GIS, CAD
- Sem duplicação de entrada de dados

### Diferenciais
- Especializado em utilities subterrâneas (não só fibra)
- Integração com localizadores EM (electromagnetic locators)
- Dispositivos GNSS de alta precisão (GPS profissional)
- Eliminação de documentação manual pós-campo

---

## 11. Comparativo Completo

### Funcionalidades por Plataforma

| Funcionalidade | OZmap | GeoSite | Tomodat | VETRO | IQGeo | Comsof |
|----------------|-------|---------|---------|-------|-------|--------|
| Mapa interativo Google Maps | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cadastro postes/cabos/caixas | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Viabilidade comercial | ✅ | ✅ | ⚠️ | ✅ | ✅ | ❌ |
| Power budget / atenuação | ✅ | ✅ | ❌ | ❌ | ⚠️ | ❌ |
| OTDR integrado | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| App mobile técnico | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| App levantamento campo | ✅ (OZsurvey) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Automação de planejamento | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| Integração MK Solutions | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| Integração OLT | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| API aberta | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Diagramas lógicos | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Gestão de projetos | ⚠️ | ✅ | ⚠️ | ❌ | ✅ | ✅ |
| Multi-empresa | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Preço público | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Open source | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Posicionamento por Porte de ISP

| Porte | Melhor opção | Alternativa |
|-------|-------------|-------------|
| Pequeno (< 500 clientes) | Tomodat | GeoGridMaps |
| Médio (500–5.000) | OZmap | GeoSite |
| Grande (5.000–50.000) | OZmap | GeoSite |
| Enterprise (50.000+) | IQGeo / VETRO | — |
| Planejamento expansão | Comsof Fiber | — |
| Levantamento campo | Geolantis.360 | OZsurvey |

---

## 12. Análise de Features para o SDR

> Cruzamento do que cada plataforma tem de melhor × o que faz sentido implementar no SDR.

### Features Prioritárias (Alto valor, diferencial claro)

```
TIER 1 — Implementar no SDR
├── Mapa interativo com Google Maps/Leaflet
│   ├── Postes, cabos, CEOs, CTOs georreferenciados
│   ├── Status visual: projeto / implantado / certificado
│   └── Layers on/off por tipo de elemento
│
├── Viabilidade comercial
│   ├── Input: endereço do cliente
│   ├── Output: CTOs próximas com portas disponíveis
│   └── Reserva automática de porta
│
├── Power Budget automático
│   ├── Somar atenuação da rota: cabo + splitters + conectores
│   ├── Alertar quando sinal está fora do range aceitável
│   └── Referência: splitter 1:8 = 10.5dB, cabo = 0.35dB/km
│
├── App mobile técnico
│   ├── Visualizar rede em campo
│   ├── Atualizar status de elementos
│   └── Registrar fotos geotagueadas
│
└── Integração MK Solutions
    ├── Ativação automática no mapa quando cliente é ativado no MK
    ├── Cancela porta quando cliente cancela no MK
    └── Sincronização bidirecional
```

### Features Secundárias (Alto valor, complexidade alta)

```
TIER 2 — Implementar nas próximas Sprints
├── Diagrama lógico da rede (schematic view)
├── Gestão de projetos de expansão
│   ├── Workflow: POP → projeto → execução → cliente → ativação
│   └── Controle de status por etapa
├── Relatórios de área (KPIs por região)
└── OTDR (localização de quebra no mapa)
```

### Features Avançadas (Futuro)

```
TIER 3 — Fase avançada
├── Automação de planejamento (inspirado no Comsof Fiber)
│   ├── Input: área de expansão
│   └── Output: design otimizado de rede
├── Análise de cenários (qual arquitetura custa menos)
└── Multi-empresa (revenda da plataforma para outros ISPs)
```

---

## 13. Stack Técnica Sugerida para SDR Map

```javascript
// Frontend (já existe no SDR)
Leaflet.js          → mapas interativos (alternativa gratuita ao Google Maps)
Google Maps API     → se quiser satélite de alta qualidade
GeoJSON             → formato padrão para dados geoespaciais
Turf.js             → cálculos geoespaciais (distância, raio, intersecção)

// Backend (Firebase já em uso no SDR)
Firebase Firestore  → dados dos elementos de rede
Firebase Functions  → API de viabilidade + power budget
Firebase Storage    → fotos de campo

// Estrutura de dados sugerida (GeoJSON + Firebase)
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-43.1729, -22.9068]  // [lng, lat]
  },
  "properties": {
    "tipo": "CTO",
    "nome": "CTO-001-BV",
    "portas_total": 16,
    "portas_livres": 4,
    "status": "implantado",
    "splitter": "1:16",
    "perda_splitter_db": 13.5,
    "foto_url": "...",
    "ultima_atualizacao": "2026-04-18T10:00:00Z"
  }
}
```

---

## 14. Referências e Links

### Plataformas Brasileiras
- OZmap: [ozmap.com](https://ozmap.com) | Integrações: [ozmap.atlassian.net](https://ozmap.atlassian.net/wiki/spaces/OZINTEGRATIONS)
- Tomodat: [tomodat.com.br](https://tomodat.com.br) | Planos: [tomodat.com.br/planos](https://www.tomodat.com.br/planos/)
- GeoGridMaps: [geogridmaps.com.br](https://geogridmaps.com.br)
- Fiberworks Quantum: [fiberworks.com.br](https://fiberworks.com.br)
- FTTH Planner: [ftthplanner.com.br](https://ftthplanner.com.br)
- GeoSite Telecom: [geositetelecom.com.br](https://geositetelecom.com.br) → ver [[GEOSITE_ANALISE]]

### Plataformas Internacionais
- VETRO FiberMap: [vetrofibermap.com](https://vetrofibermap.com)
- IQGeo / OSPInsight: [iqgeo.com/products/ospinsight](https://www.iqgeo.com/products/ospinsight)
- Comsof Fiber: [iqgeo.com/products/comsof-fiber](https://www.iqgeo.com/products/comsof-fiber)
- Geolantis.360: [geolantis.com](https://geolantis.com)

### Documentação Técnica SDR
- GeoSite análise completa: [[GEOSITE_ANALISE]]
- TR-069 / ACS Plataformas: [[TR069_ACS_PLATAFORMAS]]
- MK Solutions sistema: [[MK_SISTEMA_COLETADO]]
- Normas e atenuação: [[FTTH_NORMAS_ATENUACAO]]
- ERPs brasileiros: [[ISP_ERPS_BRASILEIROS]]
- Ferramentas técnicas: [[FERRAMENTAS_MAPA_MONITOR]]
- Código SDR: [[SDR_MODULE_MAPA_CODIGO]]
- Regras do projeto SDR: [[CLAUDE]]
- Índice central: [[SDR_INDEX]]

---

*Criado em: 2026-04-18*  
*Pesquisa: OZmap, Tomodat, GeoGridMaps, Fiberworks, GeoSite, FTTH Planner, VETRO FiberMap, IQGeo, Comsof Fiber, Geolantis.360*  
*Tags: #ftth #mapeamento #fibra #gis #sdr #infra*
