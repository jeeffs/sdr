# GeoSite Telecom — Análise Completa e Mapeamento para SDR
> Varredura completa realizada em: 2026-04-18
> Fontes: FAQ oficial, site principal, blog, YouTube, busca web
> YouTube referência: https://www.youtube.com/watch?v=-jDEII8562I

---

## 1. Identidade do Produto

| Campo | Valor |
|---|---|
| **Nome** | Geosite Telecom |
| **Empresa** | Geosite Tecnologia |
| **Site principal** | https://geosite.com.br |
| **Landing page** | https://geositetelecom.com.br |
| **Login web** | https://telecom.digicade.com.br/geosite-telecom/autenticacao/login.jsp |
| **API** | https://telecom.digicade.com.br/geosite-telecom-api/ |
| **Documentação** | https://telecom.geosite.com.br/faq/ |
| **Infraestrutura** | Google Maps API + Oracle Cloud Storage |
| **Parceiros** | Google Cloud Partner + Oracle Partner |
| **Suporte** | Ticket (todos), Omnichannel/chat (VIPs), WhatsApp (dúvidas pontuais) |
| **Modelo** | SaaS — acesso web sem instalação, teste grátis disponível |

**Slogan:** *"Cadastre, projete e monitore sua rede de fibra óptica em uma única plataforma"*

**Proposta de valor:** Solução completa para gestão e documentação de ativos, passivos, infraestrutura e rede de fibra óptica — reduz custos, elimina visitas improdutivas, dá controle total ao provedor.

---

## 2. Arquitetura Geral do Sistema

### 2.1 Tipo de plataforma
- **Web app** (browser, sem instalação) — acesso online e offline possível no mobile
- **App mobile** — iOS (App Store id6581480812) e Android
- Dados em nuvem: **Oracle Cloud**
- Mapas: **Google Maps API**
- Multiusuário com perfis de acesso por nível

### 2.2 Produtos da Geosite Tecnologia
1. **Geosite Telecom** ← foco desta análise
2. Geosite Gestão de Equipes de Campo
3. Geosite Arborização Urbana
4. Geosite CTM (Cadastro Técnico Multifinalitário)

---

## 3. Mapa Completo de Funcionalidades (FAQ Oficial)

> Extraído da documentação oficial em telecom.geosite.com.br/faq/
> Esta é a estrutura de menus completa do sistema

### 📁 Módulo 1: Cadastro dos Elementos da Rede

| Elemento | O que é | URL doc |
|---|---|---|
| **Estação (POP)** | Ponto de presença principal — origem da rede | /cadastro-de-estacao/ |
| **Rack** | Armário físico de equipamentos dentro da estação | /cadastro-de-rack/ |
| **Caixas** | CTOs, NAPs, caixas de emenda, derivação | /cadastrar-caixas-e-elementos/ |
| **Lance de cabo** | Trecho de cabo com metragem, tipo e traçado georreferenciado | /Cadastro-lance-cabo/ |
| **Poste** | Postes da rede aérea com geolocalização | /cadastrar-um-novo-poste/ |
| **Splitter** | Divisor de sinal óptico 1:N (passivo) | /cadastrar-splitter/ |
| **Conexões (dentro da caixa/estação)** | Ligações internas entre fibras — esquemático de fusões | /cadastrar-nova-conexao-dentro-da-caixa/ |
| **Equipamentos no rack** | OLTs, switches, roteadores dentro do rack | /cadastro-equipamentos-rack/ |
| **Componente** | Peças individuais (conectores, transceivers, etc.) | /cadastro-componente/ |
| **Modelo OLT** | Template por fabricante/modelo de OLT | /cadastro-modelo-olt/ |
| **OLT** | Equipamento OLT ativo com portas PON | /cadastro-OLT/ |

**Total de tipos de elementos cadastráveis: 11**

---

### 📁 Módulo 2: Análise Geográfica

| Funcionalidade | Descrição |
|---|---|
| **Cadastro de análise geográfica** | Configurar uma área geográfica para análise |
| **Quadrantes** | Divisão da cidade em setores — identifica demanda e saturação por região |
| → O que são quadrantes? | Conceitual |
| → Gerar um Quadrante | Criar setorização no mapa |
| **Filtro de gestão** | Filtrar o mapa por critérios (ocupação, status, tipo, etc.) |
| → Usar a função Filtro de Gestão | Aplicação prática |

**Casos de uso:**
- Identificar áreas com baixa ocupação → direcionar equipe de vendas
- Identificar áreas saturadas → acionar equipe de projetos para expandir
- Detectar demanda pré-existente → planejar expansão rentável
- Ver onde a concorrência é fraca → oportunidade de mercado

---

### 📁 Módulo 3: Apagar Elementos e Equipamentos

| Ação | Descrição |
|---|---|
| Apagar conexões entre equipamentos | Remove links de fibra entre elementos |
| Apagar elementos de rede | Remove caixas, postes, lances de cabo do mapa |
| Apagar equipamentos dentro do rack | Remove OLTs e equipamentos do rack |

---

### 📁 Módulo 4: Modificação de Elementos da Rede

| Ação | Descrição |
|---|---|
| **Alterar uma caixa da rede** | Editar dados de CTO, NAP, emenda |
| **Alterar o modelo de lance de cabo** | Trocar tipo/modelo de cabo |
| **Alterar geometria e/ou vértice do lance de cabo** | Redesenhar o traçado no mapa |
| **Alterar a cor do lance de cabo no mapa** | Código de cores por tipo de cabo/status |
| **Alterar a cor da fibra no esquemático** | Cor da fibra individual no diagrama de fusão |
| **Copiar um elemento da rede** | Duplicar elemento existente |

---

### 📁 Módulo 5: Visualizações da Tela (Mapa)

| Funcionalidade | Descrição |
|---|---|
| **Ativar/desativar camadas de visualização** | Ligar/desligar tipos de elementos no mapa |
| **Elementos sumiram do mapa** | Troubleshooting de visibilidade |
| **Selecionar elementos no mapa** | Seleção múltipla ou individual |
| **Ver conexões dos equipamentos** | Visualizar links de fibra entre elementos |
| **Diagrama topológico** | Árvore hierárquica dinâmica da rede completa |
| **Percurso da fibra — Estação até o Cliente** | ⭐ Traça a rota física completa da fibra até o endereço do cliente |
| **Localizar uma feição no mapa** | Busca e zoom em qualquer elemento cadastrado |
| **Informar um erro no mapa** | Reportar problema de dados |
| **Modelo de nomenclatura** | Padrão de nomes para elementos |
| **Criar anotações / observações** | Notas georreferenciadas no mapa |

**Destaque — Percurso da Fibra:**
Esta funcionalidade mostra no mapa a rota exata que a fibra percorre desde a estação (POP/OLT) até o endereço do cliente final. É extremamente útil para diagnóstico de falhas, cálculo de atenuação e manutenção.

---

### 📁 Módulo 6: Gestão de Clientes

| Funcionalidade | Descrição |
|---|---|
| **Cadastrar um cliente no sistema** | Incluir cliente com endereço geolocalizado |
| **Cadastrar mais de um cliente no mesmo endereço** | Suporte a múltiplos contratos no mesmo ponto (prédios) |
| **Incluir um cliente em uma caixa** | Vincular cliente a uma porta específica da CTO |

**Fluxo completo:**
1. Cadastra o cliente com endereço → geocodifica automaticamente no mapa
2. Vincula a uma CTO → reserva a porta
3. Vincula a ONU → monitora sinal em tempo real
4. Gera percurso de fibra → OLT → splitters → CTO → cliente

---

### 📁 Módulo 7: Telecom Mobile

**App disponível em:** iOS App Store (id6581480812)

| Funcionalidade | Descrição |
|---|---|
| **Consultar mapa de rede** | Ver toda a rede no smartphone |
| **Registrar infraestrutura em campo** | Cadastrar caixas, postes, lances direto no local |
| **Validar viabilidade** | Verificar se há porta disponível antes de vender |
| **Atualizar informações no campo** | Editar dados de elementos em campo |
| **Integração Google Maps** | Navegação e localização no mapa real |
| **Funciona offline** | Dados sincronizados quando há conexão |

**Uso típico por técnico:**
- Chega no local → abre app → vê a CTO no mapa → verifica portas disponíveis → registra nova ONU → tira foto → salva → sincroniza

---

### 📁 Módulo 8: Projetos

| Funcionalidade | Descrição |
|---|---|
| **Utilizar a função projeto** | Conceito e uso geral |
| **Criar um projeto** | Novo projeto de expansão ou construção de rede |
| **Ativar o meu projeto** | Colocar projeto em execução |
| **Converter elementos projetados → existentes** | Após execução, marcar elementos como reais/instalados |
| **Projetista com acesso limitado** | Usuário com acesso apenas ao seu projeto |

**Fluxo de projeto:**
1. Cria projeto de expansão (elementos ficam como "projetados" no mapa, cor diferente)
2. Simula quilometragem de cabos e quantidade de caixas
3. Aprova o projeto
4. Executa (técnico em campo)
5. Converte elementos projetados → existentes cadastrados

**Casos de uso:**
- Planejar novo bairro antes de lançar cabo
- Comparar projeto planejado vs. rede executada
- Dar acesso limitado a projetistas externos

---

### 📁 Módulo 9: Integrações

| Sistema | Tipo | Função |
|---|---|---|
| **Zabbix** | NMS/Monitoramento | Importar status de equipamentos, alertas de rede, UP/DOWN |
| **OLTCloud** | Gerenciamento de OLT | Provisionar ONUs, monitorar sinal, ver status em tempo real |
| **OTDR** | Refletometria | Importar medições, localizar rompimentos com distância exata |
| **CRM/ERP** | Gestão comercial | Sincronizar clientes, contratos (ex: MK Solutions, HubSoft, IXC, SGP) |

**Integração com CRM/ERP** — compatível com os principais sistemas do mercado brasileiro (HubSoft, SGP, IXC Soft, etc.). Para MK Solutions, exigiria integração via API.

---

### 📁 Módulo 10: Minha Conta, Usuários e Perfis

| Funcionalidade | Descrição |
|---|---|
| **Funções por perfil** | Diferentes permissões por tipo de usuário |
| **Criar um usuário** | Adicionar colaborador ao sistema |

**Tipos de perfil (inferidos):**
- Administrador — acesso total
- Técnico de campo — cadastro e edição via mobile
- Projetista — acesso limitado a projetos específicos
- Vendas — consulta de viabilidade e clientes
- Somente leitura — visualização do mapa

---

### 📁 Módulo 11: Exportação e Importação de Dados

| Funcionalidade | Descrição |
|---|---|
| **Observação sobre importação** | Regras e limitações |
| **Realizar importação (carga) de elementos** | Importar infraestrutura via arquivo |
| **Exportar relatórios do Geosite** | Relatórios em PDF/Excel |
| **Exportar elementos de toda a rede** | Exportar todos os dados cadastrados |

**Formatos suportados (inferidos):** CSV, XLSX, KML (Google Earth), Shapefile (GIS)

---

### 📁 Módulo 12: Indicadores e Filtros

| Funcionalidade | Descrição |
|---|---|
| **Criar um indicador** | Definir KPI personalizado |
| **Inserir filtro via análise geográfica** | Combinar filtros com análise de área |

**KPIs disponíveis:**
- Tempo médio de atendimento
- Perda de sinal por área/OLT
- Índice de retrabalho
- % tarefas dentro do SLA
- Ocupação de CTO (portas usadas vs. disponíveis)
- Saturação de splitter por região
- Crescimento de clientes por período
- Clientes online vs. offline

---

### 📁 Módulo 13: Perda de Sinal

| Funcionalidade | Descrição |
|---|---|
| **Alterar valores de perda de sinal** | Configurar os parâmetros de atenuação por elemento |

**Como funciona:**
O sistema calcula a perda óptica acumulada no percurso OLT → ONU com base nos elementos cadastrados. Os valores de perda por tipo (splitter, emenda, cabo por km) são configuráveis pelo administrador e comparados com o RX medido pela OLT via integração.

**Valores típicos configurados:**
| Elemento | Perda típica |
|---|---|
| Splitter 1:8 | 10,5 dB |
| Splitter 1:4 | 6,5 dB |
| Splitter 1:2 | 3,5 dB |
| Emenda mecânica | 0,1 dB |
| Conector | 0,5 dB |
| Cabo G.652D (por km) | 0,35 dB/km |

---

## 4. Componentes FTTH Suportados

(Baseado no Guia FTTH oficial da Geosite)

| Componente | Descrição | Cadastrado no Geosite |
|---|---|---|
| **Backbone óptico** | Estrutura principal de transporte | Via lances de cabo |
| **OLT** | Equipamento ativo de cabeceira | ✅ Módulo específico |
| **Splitter óptico** | Divisor passivo 1:N | ✅ Módulo específico |
| **CTO / DIO** | Caixa de distribuição e terminação | ✅ Como "caixas" |
| **Drop cable** | Trecho final até o cliente | ✅ Lance de cabo |
| **ONT / ONU** | Equipamento na casa do cliente | ✅ Via integração OLTCloud |
| **Postes** | Estrutura da rede aérea | ✅ Módulo específico |
| **Rack** | Armário de equipamentos no POP | ✅ Módulo específico |
| **Emendas** | Fusões de fibra | ✅ Esquemático de fusões |

---

## 5. Fluxo de Uso Típico — Do POP ao Cliente

```
1. CADASTRO DO POP
   Admin → Cadastrar Estação → POP_Jundiai_Centro
   → Adicionar Rack → Rack_01
   → Adicionar OLT → OLT_HUAWEI_MA5800 (modelo)
   → Configurar portas PON (slots/portas)

2. PROJETO DE REDE
   Admin/Projetista → Criar Projeto → "Expansão Jardim Morumbi Q3/2026"
   → Desenhar no mapa:
     - Lances de cabo (traçado + metragem + tipo)
     - Postes
     - Caixas (CTOs, splitters, emendas)
   → Simular km de cabo e nº de caixas
   → Aprovar projeto

3. EXECUÇÃO EM CAMPO
   Técnico (mobile) → Abre app → Vê elementos "projetados"
   → Instala e cadastra cada elemento como "existente"
   → Tira fotos, preenche serial, localização GPS
   → Sistema converte projetado → existente

4. CADASTRO DE CLIENTE
   Atendimento → Cadastrar Cliente → informa endereço
   → Sistema geocodifica e plota no mapa
   → Verificar CTO mais próxima com porta disponível
   → Vincular cliente à porta da CTO

5. ATIVAÇÃO E MONITORAMENTO
   Via integração OLTCloud → ONU provisionada
   → Sinal RX capturado automaticamente
   → Sistema compara com perda calculada
   → Dashboard mostra status (bom/atenção/crítico/offline)

6. MANUTENÇÃO / FALHA
   Alerta via Zabbix → OLT_PON_01_SLOT2_PORTA4 offline
   → Geosite mostra todas as ONUs afetadas
   → Técnico abre app → vê percurso da fibra → identifica trecho
   → OTDR mede distância do rompimento
   → Técnico repara → sistema atualizado
```

---

## 6. Análise Geográfica — Quadrantes em Detalhe

**O que são quadrantes?**
Setorização do mapa em áreas geográficas definidas pelo administrador. Cada quadrante agrega métricas de todos os elementos dentro dele.

**Dados por quadrante:**
- Total de clientes
- Ocupação média das CTOs (%)
- Saturação dos splitters (%)
- Clientes offline
- Demanda potencial (casas sem cobertura)
- Receita estimada por área

**Caso de uso estratégico:**
- Quadrante com 30% ocupação → vendas faz campanha nessa área
- Quadrante com 95% ocupação → projetos expande a rede
- Quadrante sem cobertura + alta densidade → prioridade de expansão

---

## 7. Módulo de Projetos — Detalhe

**Estados de um elemento:**
- `PROJETADO` — planejado, ainda não instalado (aparece em cor diferente no mapa)
- `EXISTENTE` — instalado e cadastrado como real
- `INATIVO` — desativado mas mantido no banco

**Controle de acesso em projetos:**
- Projetista externo pode ter acesso APENAS ao seu projeto específico
- Não vê outros projetos, não vê clientes, não vê dados operacionais

**Workflow de aprovação (inferido):**
1. Projetista cria elementos projetados
2. Gestor revisa
3. Gestor ativa o projeto
4. Técnico executa e converte para existente
5. Gestor valida a conversão

---

## 8. Integrações — Como Funcionam

### 8.1 Integração com Zabbix
- Zabbix monitora OLTs e equipamentos de rede
- Geosite recebe alertas de UP/DOWN das portas PON
- Mapa mostra em tempo real quais CTOs/ONUs estão afetadas
- Técnico vê no mapa qual trecho da rede está com problema

### 8.2 Integração com OLTCloud
- OLTCloud gerencia provisionamento de ONUs
- Geosite recebe: serial ONU, RX power, status (online/offline), IP
- Dados aparecem na ficha do cliente e no mapa
- Alertas automáticos quando ONU cai

### 8.3 Integração com OTDR
- Técnico mede a fibra com equipamento OTDR
- Resultado importado no Geosite
- Sistema compara com percurso cadastrado
- Localiza exatamente onde está o rompimento (distância em metros)

### 8.4 Integração com CRM/ERP
- Sincronização bidirecional de clientes
- Cliente ativado no ERP → aparece no Geosite
- Porta reservada no Geosite → bloqueada no ERP

---

## 9. Documentação de Rede — Filosofia do Sistema

Extraído do artigo oficial da Geosite Tecnologia:

**Por que documentar?**
- Orienta expansão futura
- Facilita compartilhamento entre equipes
- Permite estudo de viabilidade de atendimento
- Essencial para aquisição/valuation da empresa
- Evita dependência de conhecimento individual ("o técnico que sabe de tudo")

**Riscos de não documentar:**
- Funcionário chave sai da empresa → conhecimento perdido
- Perda de dados (incêndio, roubo, falha de hardware)
- Impossibilidade de ser adquirido ou captar investimento
- Visitas desnecessárias ao campo (custo alto)

**Geosite resolve:**
- Armazenamento na nuvem (Oracle Cloud)
- Acesso de qualquer lugar (web + mobile)
- Perfis de acesso controlados
- Histórico de alterações
- Integração com todos os sistemas do provedor

---

## 10. Comparação Detalhada: GeoSite × SDR Comercial

### ✅ SDR já tem equivalente funcional

| GeoSite | SDR Equivalente | Qualidade |
|---|---|---|
| Mapa interativo Leaflet/Google | Google Maps no SDR Mapa | ✅ Boa |
| OLT com slots e portas | `olt_connections/{id}/pons/` | ✅ Boa |
| ONUs com RX power e status | `onus/{serial}/rx_power, status` | ✅ Boa |
| Diagrama topológico hierárquico | `sdrTopologiaRender()` | ✅ Boa |
| Cadastro de clientes | `sdrClientesRender()` | ✅ Boa |
| Vincular ONU ao cliente | `sdrAutoLinkCTO()` | ✅ Parcial |
| Filtros de camadas no mapa | Botões de camadas | ✅ Boa |
| Heatmap de densidade | `sdrRenderHeatmap()` | ✅ Boa |
| DGO / Splitters hierárquicos | `infrastructure/{id}` | ✅ Boa |
| Demo sem servidor MK | `sdrMkDemoTopologia()` | ✅ Boa |
| CTO com portas | `infrastructure/type:cto` | ✅ Parcial |

### ❌ GeoSite tem, SDR não implementou

| Feature GeoSite | Prioridade SDR | Sprint |
|---|---|---|
| **Percurso de fibra OLT→cliente no mapa** | 🔴 Alta | Sprint 7 |
| **Cálculo de perda óptica acumulada** | 🔴 Alta | Sprint 7 |
| **Alertas automáticos de ONU offline** | 🔴 Alta | Sprint 7 |
| **Ocupação visual de CTO (portas usadas/livres)** | 🔴 Alta | Sprint 7 |
| **Esquemático de fusões por caixa** | 🟡 Média | Sprint 8 |
| **Gestão de postes (rede aérea)** | 🟡 Média | Sprint 8 |
| **Lances de cabo com metragem e traçado** | 🟡 Média | Sprint 8 |
| **Histórico de sinal RX ao longo do tempo** | 🟡 Média | Sprint 8 |
| **Módulo de projetos de expansão** | 🟡 Média | Sprint 9 |
| **Análise de quadrantes por saturação** | 🟡 Média | Sprint 9 |
| **Projetista com acesso limitado** | 🟢 Baixa | Sprint 9 |
| **App mobile com mapa** | 🟢 Baixa | Sprint 10 |
| **Importar/exportar KML** | 🟢 Baixa | Sprint 10 |
| **Fotos geolocalizadas por técnico** | 🟢 Baixa | Sprint 10 |
| **Integração Zabbix** | 🟢 Baixa | Sprint 10 |
| **Análise OTDR integrada** | 🟢 Baixa | Sprint 11 |

---

## 11. Implementação Proposta no SDR — Sprint 7

### 11.1 Percurso de Fibra até o Cliente

```javascript
// Traça a rota física completa no mapa: OLT → PON → DGO → Splitters → CTO → ONU → cliente
window.sdrTracarPerfilFibra = async function(clienteId) {
  const cliente = sdrClientesCache[clienteId];
  if (!cliente || !cliente.onu_serial) return toast('Cliente sem ONU vinculada', 'warn');

  // 1. Buscar ONU
  const onu = sdrOnusCache[cliente.onu_serial];
  if (!onu) return;

  // 2. Buscar CTO da ONU
  const cto = sdrInfraCache[onu.cto_id];

  // 3. Buscar cadeia de parents até a OLT
  const chain = [];
  let current = cto;
  while (current) {
    chain.push(current);
    current = current.parent_id ? sdrInfraCache[current.parent_id] : null;
  }

  // 4. Buscar OLT
  const oltPon = sdrOltsCache[onu.olt_pon_id];

  // 5. Montar polyline no mapa: OLT → ... → endereço do cliente
  const coords = [];
  if (oltPon) coords.push([oltPon.lat, oltPon.lng]);
  chain.reverse().forEach(el => { if (el.lat) coords.push([el.lat, el.lng]); });
  if (cliente.lat) coords.push([cliente.lat, cliente.lng]);

  // 6. Calcular perda acumulada
  const perda = sdrCalcularPerda(chain);

  // 7. Desenhar no mapa
  L.polyline(coords, {color:'#7c3aed', weight:3, dashArray:'6,4'})
   .addTo(sdrMap)
   .bindPopup(`Percurso de fibra<br>Perda calculada: <b>${perda.toFixed(1)} dB</b>`);
};
```

### 11.2 Cálculo de Perda Óptica

```javascript
// Valores configuráveis (Firebase: sdr_comercial/default_tenant/config/perda_sinal/)
const SDR_PERDA_DB = {
  splitter_1_8: 10.5,
  splitter_1_4: 6.5,
  splitter_1_2: 3.5,
  splitter_1_16: 13.5,
  emenda: 0.1,
  conector: 0.5,
  cabo_por_km: 0.35,
  cto: 0.5  // perda média na caixa
};

function sdrCalcularPerda(chain) {
  let total = 0;
  chain.forEach(el => {
    const tipo = el.type;
    if (tipo === 'splitter_1') total += SDR_PERDA_DB.splitter_1_8;
    else if (tipo === 'splitter_2') total += SDR_PERDA_DB.splitter_1_4;
    else if (tipo === 'splitter_3') total += SDR_PERDA_DB.splitter_1_2;
    else if (tipo === 'cto') total += SDR_PERDA_DB.cto;
    if (el.distance_km) total += el.distance_km * SDR_PERDA_DB.cabo_por_km;
  });
  return total;
}
```

### 11.3 Ocupação Visual de CTO

```javascript
// Renderiza grade de portas da CTO (estilo patch panel)
// Verde = livre, Azul = ativa, Vermelho = com problema, Cinza = bloqueada
window.sdrCtoPortasVisual = function(ctoId) {
  const cto = sdrInfraCache[ctoId];
  const portCount = cto.port_count || 16;
  const usedPorts = {}; // {porta: {onu_serial, client_name, rx_power}}

  // Buscar ONUs vinculadas a esta CTO
  Object.values(sdrOnusCache).forEach(onu => {
    if (onu.cto_id === ctoId && onu.port_num) {
      usedPorts[onu.port_num] = onu;
    }
  });

  let html = `<div class="cto-grid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px">`;
  for (let p = 1; p <= portCount; p++) {
    const onu = usedPorts[p];
    const cor = onu
      ? (onu.rx_power > -27 ? '#16a34a' : onu.rx_power > -30 ? '#d97706' : '#dc2626')
      : '#e5e7eb';
    const title = onu ? `Porta ${p}: ${onu.client_name || onu.serial_number}` : `Porta ${p}: Livre`;
    html += `<div title="${title}" style="background:${cor};height:24px;border-radius:3px;cursor:pointer"
             onclick="sdrOnuDetail('${onu ? onu.serial_number : ''}')"></div>`;
  }
  html += '</div>';
  return html;
};
```

---

## 12. Estrutura de Dados GeoSite (Inferida para Referência)

```
tenant/
├── stations/              ← Estações / POPs
│   └── {id}/
│       ├── name, address, lat, lng
│       ├── created_at, updated_at
│       └── racks/
│           └── {id}/
│               ├── name, u_size
│               └── equipments/    ← OLTs, switches
│                   └── {id}/
│                       ├── model_id, serial, ip
│                       └── ports/
│                           └── {slot}_{port}/
│                               ├── speed, vlan, status
│                               └── onu_count
│
├── cables/                ← Lances de cabo
│   └── {id}/
│       ├── from_element_id, to_element_id
│       ├── length_m
│       ├── fiber_count       ← nº de fibras
│       ├── cable_type        ← "OPGW"|"ADSS"|"Drop"
│       ├── color             ← cor no mapa
│       └── path[]            ← coordenadas do traçado
│
├── poles/                 ← Postes
│   └── {id}/
│       ├── lat, lng, code
│       ├── height_m
│       └── cable_ids[]    ← cabos passando pelo poste
│
├── boxes/                 ← Caixas (CTO, NAP, emenda)
│   └── {id}/
│       ├── type: "cto"|"nap"|"emenda"|"derivacao"
│       ├── lat, lng, address
│       ├── port_count
│       ├── parent_id      ← splitter ou cabo que alimenta
│       └── ports/
│           └── {n}/
│               ├── occupied: bool
│               ├── onu_serial
│               └── client_id
│
├── splitters/             ← Splitters
│   └── {id}/
│       ├── ratio: "1:2"|"1:4"|"1:8"|"1:16"
│       ├── parent_id      ← caixa onde está instalado
│       ├── loss_db        ← perda configurada
│       └── location: inside_box | inside_rack
│
├── clients/               ← Clientes
│   └── {id}/
│       ├── erp_id         ← ID no CRM/ERP externo
│       ├── name, cpf, phone
│       ├── address, lat, lng
│       ├── box_id, port_num  ← CTO e porta
│       ├── onu_serial
│       └── contract_status
│
├── projects/              ← Projetos de expansão
│   └── {id}/
│       ├── name, status: "draft"|"active"|"completed"
│       ├── user_id        ← projetista responsável
│       └── elements/      ← elementos projetados
│           └── {id}/
│               └── type, lat, lng, status: "projected"|"existing"
│
└── indicators/            ← KPIs configurados
    └── {id}/
        ├── name, formula
        ├── threshold_warn, threshold_critical
        └── geographic_filter_id
```

---

## 13. Diferenciais SDR vs GeoSite (Por que o SDR não precisa do GeoSite)

| Aspecto | GeoSite Telecom | SDR Comercial |
|---|---|---|
| **Foco** | Somente ISPs/provedores FTTH | ISPs + Técnicos + EPI + Financeiro |
| **Custo** | SaaS pago (mensalidade) | Gratuito — código próprio |
| **Módulo financeiro** | ❌ Não | ✅ Comissões, planilhas, impostos |
| **Gestão de técnicos** | ❌ Não (produto separado) | ✅ Módulo completo |
| **EPI / Segurança** | ❌ Não | ✅ Módulo dedicado |
| **Integração MK Solutions** | Via CRM genérico | ✅ Integração nativa (Sprint 6) |
| **Offline PWA** | App mobile apenas | ✅ PWA completo + Service Worker |
| **Customização** | Limitada (SaaS) | ✅ Total (código próprio) |
| **Multi-tenant** | Sim | ✅ Sim (Firebase paths) |
| **Suporte OTDR** | ✅ Via integração | ❌ Não (Sprint 11) |
| **Zabbix** | ✅ Nativo | ❌ Não (Sprint 10) |
| **App iOS nativo** | ✅ Sim | ❌ PWA apenas |

---

## 14. Recursos de Vídeo e Material de Referência

| Material | URL |
|---|---|
| Vídeo principal (YouTube) | https://www.youtube.com/watch?v=-jDEII8562I |
| Canal YouTube | https://www.youtube.com/@GeositeTelecom |
| Vídeo: Visão Geral | https://www.youtube.com/watch?v=sPRup5YNX3o |
| Vídeo: Todas as Funcionalidades | https://www.youtube.com/watch?v=HT2EL904l8M |
| FAQ / Documentação oficial | https://telecom.geosite.com.br/faq/ |
| Site principal | https://geositetelecom.com.br |
| Blog técnico | https://geosite.com.br/blog/ |
| Guia FTTH completo | https://geosite.com.br/ftth-guia-completo-gestao-monitoramento-telecom/ |
| Software de documentação | https://geosite.com.br/software-de-documentacao-de-rede-geosite-telecom/ |
| Planejamento de projetos | https://materiais.geosite.com.br/planejamento-de-projeto-de-fibra-optica |

---

## 15. Próximas Implementações Inspiradas no GeoSite (Sprint 7)

- [ ] **`sdrTracarPerfilFibra(clienteId)`** — percurso OLT→ONU no mapa com polyline
- [ ] **`sdrCalcularPerda(chain)`** — cálculo de atenuação óptica acumulada
- [ ] **`sdrCtoPortasVisual(ctoId)`** — grade de portas da CTO (patch panel visual)
- [ ] **`sdrAlertasONUOffline()`** — polling e alertas automáticos de ONU offline
- [ ] **`sdrIndicadores()`** — dashboard de KPIs operacionais
- [ ] **`sdrQuadrantes()`** — análise de ocupação por área geográfica

---

## 16. Links Internos (Obsidian)

- [[MK_SISTEMA_COLETADO]] — Sistema MK Solutions mapeado
- [[MK_API_REFERENCE]] — Endpoints MK para integração
- [[SDR_MODULE_MAPA_CODIGO]] — Mapa de código do sdr-module.js
- [[PLAN_SDR_COMERCIAL_v3_FINAL]] — Plano de desenvolvimento
- [[SPRINT_LOG]] — Log de sprints do projeto SDR
- [[FTTH_PLATAFORMAS_MAPEAMENTO]] — Análise comparativa de plataformas
- [[TR069_ACS_PLATAFORMAS]] — Gestão remota de CPE
- [[FTTH_NORMAS_ATENUACAO]] — Normas e power budget
- [[SDR_INDEX]] — Índice central do projeto
