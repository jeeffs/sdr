# TR-069 / CWMP — Protocolo e Plataformas ACS

> **Objetivo**: Montar servidor ACS TR-069 para gestão remota de CPEs (ONUs/ONTs/roteadores).  
> **Contexto SDR**: ISP FTTH com OLTs ZTE/Huawei, clientes MK Solutions, interesse em provisioning automático e gestão remota de CPE.

---

## 1. O Protocolo TR-069 / CWMP

### O que é?

**TR-069** (Technical Report 069) é um padrão de protocolo publicado pelo **Broadband Forum** (BBF) que define o **CWMP — CPE WAN Management Protocol**.

Permite que um **ACS (Auto Configuration Server)** gerencie remotamente **CPEs (Customer Premises Equipment)** como ONUs, ONTs, roteadores e modems.

### Arquitetura

```
ACS Server (seu servidor TR-069)
    │
    │  SOAP/HTTP(S) — porta 7547
    │
    ▼
CPE (ONU/ONT/Roteador)
  ├── ONU ZTE F670L
  ├── ONU Huawei HG8546M
  ├── Roteador TP-Link / D-Link
  └── ...
```

### Como funciona (fluxo)

1. **CPE inicia a sessão** (NUNCA o ACS — regra fundamental)
2. CPE envia `Inform` ao ACS com dados do dispositivo
3. ACS responde com `InformResponse` e inicia fila de comandos
4. ACS pode enviar: `GetParameterValues`, `SetParameterValues`, `Download` (firmware), etc.
5. CPE executa os comandos e responde
6. Sessão encerrada com `SessionTerminate`

> ⚠️ **Crítico**: A sessão é sempre iniciada pelo CPE. O ACS apenas aguarda e responde. Para forçar uma sessão, o ACS usa **Connection Request** (HTTP GET para porta do CPE) — mas só funciona se o CPE estiver acessível (sem CG-NAT).

### Capacidades do ACS sobre o CPE

| Função | Descrição |
|--------|-----------|
| Configuração WiFi | SSID, senha, canal, modo 2.4/5GHz |
| Configuração WAN | PPPoE, DHCP, IPoE |
| Reboot remoto | Reset/reinicialização |
| Atualização de firmware | Download automático |
| Diagnósticos | Ping, traceroute, speed test, PING loop |
| Monitoramento | Uptime, sinal, throughput, erros |
| Port Forwarding | Abertura de portas remotas |
| VoIP | SIP config, ramal, codec |
| CWMP Parameters | Leitura/escrita de qualquer parâmetro do datamodel |

### Integração com GPON (OLT → ONU)

Em redes FTTH, o ACS precisa que o ONU já esteja configurado com o endereço do servidor ACS. Isso é feito via **OMCI (ONU Management and Control Interface)**:

```
OLT (SSH/Telnet)
    │  OMCI commands
    ▼
ONU (recebe parâmetros ACS via OMCI)
    │  TR-069 (CWMP) SOAP/HTTP
    ▼
ACS Server
```

Parâmetros OMCI enviados pelo OLT para ONU:
- URL do ACS: `http://acs.seudominio.com.br:7547/`
- Username ACS
- Password ACS
- Interval de Inform (em segundos)

### Datamodel

O TR-069 usa **datamodels padronizados** pelo Broadband Forum:
- **TR-098**: Internet Gateway Device (roteadores legados)
- **TR-181**: Device:2 (padrão atual para ONUs e roteadores modernos)
- **TR-104**: VoIP services
- **TR-135**: STB management

---

## 2. Comparativo de Plataformas ACS

| Plataforma | Tipo | Stack | Licença | Origem | Foco |
|------------|------|-------|---------|--------|------|
| **GenieACS** | Open Source | Node.js + MongoDB | AGPLv3 | Internacional | ACS puro, altamente configurável |
| **FreeACS** | Open Source | Java 17 + MySQL | MIT | Internacional | ACS puro, mais simples |
| **Anlix Flashman** | Comercial | Proprietário | Pago | Brasil | TR-069 + firmware + app campo |
| **Made4Graph** | Comercial | Proprietário | Pago | Brasil | ACS + RADIUS + NOC integrado |
| **Int6Tech RemoteISP** | Comercial | Proprietário | Pago | Brasil | SNMP + HTTP + TR-069/369 |
| **SmartOLT** | Cloud SaaS | Proprietário | Assinatura | Internacional | OLT management (não ACS puro) |
| **OLTCloud** | Cloud SaaS | Proprietário | Assinatura | Brasil | OLT + provisioning + TR-069 wiki |

---

## 3. Plataformas Detalhadas

---

### 3.1 GenieACS — Referência Open Source

**Site**: genieacs.com  
**GitHub**: github.com/genieacs/genieacs  
**Licença**: AGPLv3  

#### Stack Técnica

```
GenieACS Stack:
├── genieacs-cwmp    → Porta 7547 (interface com CPEs)
├── genieacs-ui      → Porta 3000 (interface web admin)
├── genieacs-nbi     → Porta 7557 (northbound interface / API REST)
└── genieacs-fs      → Porta 7567 (file server para firmware)

Dependências:
├── Node.js 14+
├── MongoDB 4.4+
└── Redis (opcional, para performance)
```

#### Funcionalidades

- **Provisions**: Scripts JavaScript para configurar CPEs automaticamente
- **Presets**: Regras condicionais para aplicar provisions por grupo de CPEs
- **Tasks**: Fila de tarefas agendadas ou imediatas
- **Faults**: Registro de erros e falhas de CPEs
- **API REST (NBI)**: Integração com sistemas externos (ERP, CRM, OSS/BSS)
- **Virtual Parameters**: Parâmetros calculados/derivados
- **Bulk operations**: Operações em massa em múltiplos CPEs
- **Multi-tenant**: Suporte a múltiplos ISPs (via configuração)

#### Instalação Rápida (Ubuntu/Debian)

```bash
# 1. Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update && apt-get install -y mongodb-org
systemctl enable mongod && systemctl start mongod

# 2. Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 3. Instalar GenieACS
npm install -g genieacs

# 4. Criar usuário e diretórios
useradd --system --no-create-home --user-group genieacs
mkdir -p /opt/genieacs/ext /var/log/genieacs
chown genieacs:genieacs /opt/genieacs /var/log/genieacs

# 5. Criar config
cat > /opt/genieacs/genieacs.env << 'EOF'
GENIEACS_CWMP_ACCESS_LOG_FILE=/var/log/genieacs/cwmp-access.log
GENIEACS_NBI_ACCESS_LOG_FILE=/var/log/genieacs/nbi-access.log
GENIEACS_FS_ACCESS_LOG_FILE=/var/log/genieacs/fs-access.log
GENIEACS_UI_ACCESS_LOG_FILE=/var/log/genieacs/ui-access.log
GENIEACS_DEBUG_FILE=/var/log/genieacs/debug.yaml
GENIEACS_EXT_DIR=/opt/genieacs/ext
GENIEACS_UI_JWT_SECRET=sua_chave_secreta_aqui
GENIEACS_MONGODB_CONNECTION_URL=mongodb://localhost/genieacs
EOF

# 6. Criar serviços systemd
for service in cwmp nbi fs ui; do
cat > /etc/systemd/system/genieacs-$service.service << EOF
[Unit]
Description=GenieACS $service
After=network.target

[Service]
User=genieacs
EnvironmentFile=/opt/genieacs/genieacs.env
ExecStart=$(which genieacs-$service)
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
done

# 7. Iniciar serviços
systemctl daemon-reload
systemctl enable genieacs-{cwmp,nbi,fs,ui}
systemctl start genieacs-{cwmp,nbi,fs,ui}

# Acessar UI: http://IP:3000
# Login padrão: admin / admin (trocar imediatamente!)
```

#### Configuração de ONU no GenieACS

Após ONU se conectar ao ACS, criar um **Preset** para configuração automática:

```javascript
// Exemplo de Provision Script — GenieACS
// Configurar WiFi automaticamente
const ssid = declare("Device.WiFi.SSID.1.SSID", { value: 1 });
const pass = declare("Device.WiFi.AccessPoint.1.Security.KeyPassphrase", { value: 1 });

// Ler parâmetros atuais
const serialNumber = declare("Device.DeviceInfo.SerialNumber", { value: 1 });

// Definir SSID baseado no serial
if (ssid.value[0] !== "SDR-" + serialNumber.value[0].slice(-6)) {
  ssid.value = "SDR-" + serialNumber.value[0].slice(-6);
}
```

#### API REST (NBI) — Exemplos

```bash
# Listar todos os dispositivos
curl http://localhost:7557/devices

# Buscar dispositivo por serial
curl "http://localhost:7557/devices?query=%7B%22DeviceID.SerialNumber%22%3A%22ZTEG12345678%22%7D"

# Executar task (reboot) em dispositivo
curl -X POST http://localhost:7557/devices/DEVICE_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "reboot"}'

# GetParameterValues
curl -X POST http://localhost:7557/devices/DEVICE_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "getParameterValues", "parameterNames": ["Device.DeviceInfo.SoftwareVersion"]}'

# Aplicar preset
curl -X POST http://localhost:7557/presets \
  -H "Content-Type: application/json" \
  -d '{"_id": "default", "weight": 0, "precondition": "{}", "provisions": [["meu_script"]]}'
```

#### Portas e Firewall

```bash
# Portas necessárias:
# 7547/tcp  → CPEs se conectam aqui (CWMP)
# 7557/tcp  → API REST (NBI) — manter apenas interno
# 7567/tcp  → File server (firmware) — CPEs e admin
# 3000/tcp  → Interface web (admin)

ufw allow 7547/tcp    # CPEs externos
ufw allow 3000/tcp    # Admin web (opcional: restringir por IP)
```

---

### 3.2 Anlix — Solução Brasileira Integrada

**Site**: anlix.io  
**Wiki**: wiki.anlix.io  
**Tipo**: Plataforma comercial com firmware proprietário  

#### Produtos

| Produto | Função |
|---------|--------|
| **Flashman ACS** | Servidor TR-069 principal |
| **Flashbox** | Gestão remota de CPE (alternativa TR-069 para roteadores sem TR-069 nativo) |
| **Flashboard** | Dashboard de monitoramento |
| **Firmware Anlix** | Firmware OpenWRT modificado para roteadores |
| **App Cliente** | App para clientes finais |
| **App Técnicos** | App para técnicos de campo |

#### Capacidades TR-069 (Flashman)

- Configuração WiFi remota (SSID, senha, canal)
- Configuração WAN: PPPoE, DHCP, IPoE
- Port Forwarding remoto
- Reboot remoto
- Atualização de firmware
- Diagnósticos (Ping, Speed Test)

#### Integração OLT → ONU (OMCI)

OLTs suportadas para push de parâmetros ACS via OMCI:

| Fabricante OLT | Suporte OMCI Anlix |
|----------------|-------------------|
| DZS | ✅ |
| DATACOM | ✅ |
| Fiberhome | ✅ |
| Huawei | ✅ |
| Nokia | ✅ |
| Parks | ✅ |
| ZTE | ✅ |

#### ⚠️ Aviso Crítico

> **Não é possível migrar de Firmware Anlix para TR-069 nativo.**  
> Se instalar o firmware Anlix em um CPE, ele deixa de funcionar como CPE TR-069 padrão.  
> Escolha: usar Flashman ACS (TR-069 padrão) **ou** Flashbox (com firmware Anlix) — não misture.

#### Instalação

Suporta instalação **on-premise** (servidor próprio) ou cloud Anlix.  
Contato necessário para licença.

---

### 3.3 Made4Graph — NOC + ACS Integrado

**Site**: made4it.com.br  
**Wiki**: wiki.made4it.com.br  
**Tipo**: Suite completa de gestão para ISP  

#### Produtos

| Produto | Função |
|---------|--------|
| **Made4Flow** | Gestão de rede / NOC |
| **Made4Graph** | ACS TR-069 + RADIUS + Dashboard |
| **Made4OLT** | Gestão de OLTs |

#### Made4Graph — Funcionalidades Completas

```
Made4Graph Features:
├── TR-069 ACS
│   ├── 20+ templates de configuração
│   ├── 40+ modelos de CPE suportados
│   └── Bot de apontamento automático (webscrapper)
├── RADIUS
│   ├── Logs em tempo real
│   └── Integração com NAS
├── Dashboard
│   ├── Mapa de dispositivos
│   ├── Top 10 desconectados
│   ├── Realtime monitoring
│   └── Dashboard analítica (Made4Intelligence)
├── CGNAT
├── VoIP
├── API REST
├── Libre Speed (speed test integrado)
└── SSH/Telnet direto para Huawei, Cisco, Juniper
```

#### Bot de Apontamento TR-069

Funcionalidade única: **automação via webscrapper** para apontar CPEs para o ACS sem intervenção manual. O bot acessa a interface web do CPE (ou do ERP) e configura automaticamente o endereço do servidor ACS.

> Ideal para migrar parque de CPEs legados que não têm suporte OMCI.

---

### 3.4 Int6Tech — Automação GPON

**Site**: int6tech.com.br  
**Email**: atendimento@int6tech.com.br / sales@int6tech.com  
**YouTube**: Canal Int6Tech (séries EasyOLT e AutoISP)  

#### Produtos

| Produto | Função | Escala |
|---------|--------|--------|
| **AutoISP** | Provisioning GPON integrado com ERP/CRM | 5.000–700.000+ assinantes |
| **EasyOLT** | Gestão OLT independente de ERP | Qualquer escala |
| **RemoteISP** | Gestão remota CPE (SNMP/HTTP/TR-069/TR-369) | — |
| **DiagISP** | Diagnósticos de rede | — |
| **NetISP** | Gestão de rede | — |

#### Diferenciais

- **Interoperabilidade**: ONUs Huawei em OLTs ZTE (e vice-versa) — sem necessidade de equipamento do mesmo fabricante
- **TR-369 (USP)**: Suporte ao protocolo de nova geração além do TR-069
- Integração direta com ERPs brasileiros (MK Solutions, Voalle, Ispfy, etc.)

#### Videos de Referência

- EasyOLT Parte 0: Instalação
- EasyOLT Parte 1-4: Configuração e uso
- AutoISP: Provisioning automático

---

### 3.5 SmartOLT — Cloud para ZTE e Huawei

**Site**: smartolt.com / smartolt.com.br  
**Tipo**: SaaS Cloud  

#### Funcionalidades

- Provisioning em < 10 segundos
- Suporte: ZTE e Huawei OLTs
- Interface mobile para técnicos de campo
- Histórico de sinal com alertas (variação ±3dB)
- API para integração com ERP
- 1-click automation

#### Infraestrutura

- Amazon Web Services
- Digital Ocean
- LeaseWeb

#### Planos

3 planos pré-pagos disponíveis (consultar site para preços atualizados).

> ⚠️ SmartOLT é focado em **gestão de OLT**, não em ACS TR-069 puro. Complementa o ACS, não substitui.

---

### 3.6 OLTCloud — Cloud OLT Brasileira

**Site**: oltcloud.co  
**Wiki TR-069**: wiki.oltcloud.co/pt-br/TR069  
**Tipo**: SaaS Cloud  

#### Funcionalidades

- Fabricantes suportados: Huawei, Fiberhome, ZTE, Datacom
- Templates de provisioning configuráveis
- App para técnicos de campo
- Alertas: e-mail + WhatsApp
- Documentação TR-069 própria

---

### 3.7 FreeACS — Open Source Java

**GitHub**: github.com/freeacs/freeacs  
**Licença**: MIT  
**Stack**: Java 17 + MySQL  

Alternativa open source ao GenieACS. Mais simples de manter para quem tem background Java. Menos popular no Brasil do que GenieACS.

---

## 4. Arquitetura Recomendada para SDR

### Cenário: ISP com OLTs ZTE/Huawei + MK Solutions + SDR

```
┌─────────────────────────────────────────────────────┐
│                  SERVIDOR SDR                       │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐                │
│  │  GenieACS   │    │  SDR App    │                │
│  │  (ACS)      │◄───│  (Firebase) │                │
│  │  porta 7547 │    │             │                │
│  └──────┬──────┘    └──────┬──────┘                │
│         │                  │                        │
└─────────┼──────────────────┼────────────────────────┘
          │                  │
          │ SOAP/HTTP(S)     │ API REST (NBI)
          │                  │
     ┌────▼────┐        ┌────▼────────┐
     │  CPEs   │        │ MK Solutions│
     │  ONUs   │        │  ERP        │
     │  Roteador│        └─────────────┘
     └─────────┘
          ▲
          │ OMCI (via OLT)
          │
     ┌────┴────┐
     │  OLTs   │
     │ ZTE     │
     │ Huawei  │
     └─────────┘
```

### Fluxo de Ativação Automática

```
1. Técnico instala ONU no cliente
2. SDR → Firebase → dispara ativação
3. SDR faz SSH na OLT → cadastra ONU (serial)
4. OLT → OMCI → ONU recebe URL do ACS
5. ONU → GenieACS (Inform message)
6. GenieACS → aplica preset (WiFi, WAN, etc.)
7. SDR → GenieACS API → confirma ativação
8. SDR → MK Solutions → ativa contrato
9. Cliente → ONU online ✅
```

### Integração GenieACS ↔ SDR (Firebase Functions)

```javascript
// Firebase Function — Ativar CPE via GenieACS API
const GENIEACS_NBI = "http://seu-servidor:7557";

async function ativarCPE(serialNumber, ssid, senha, pppoeUser, pppoePass) {
  // 1. Buscar dispositivo no GenieACS
  const res = await fetch(`${GENIEACS_NBI}/devices?query={"DeviceID.SerialNumber":"${serialNumber}"}`);
  const devices = await res.json();
  
  if (devices.length === 0) {
    throw new Error("CPE não encontrado no ACS");
  }
  
  const deviceId = devices[0]._id;
  
  // 2. Configurar PPPoE
  await fetch(`${GENIEACS_NBI}/devices/${encodeURIComponent(deviceId)}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "setParameterValues",
      parameterValues: [
        ["Device.PPP.Interface.1.Username", pppoeUser, "xsd:string"],
        ["Device.PPP.Interface.1.Password", pppoePass, "xsd:string"]
      ]
    })
  });
  
  // 3. Configurar WiFi
  await fetch(`${GENIEACS_NBI}/devices/${encodeURIComponent(deviceId)}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "setParameterValues",
      parameterValues: [
        ["Device.WiFi.SSID.1.SSID", ssid, "xsd:string"],
        ["Device.WiFi.AccessPoint.1.Security.KeyPassphrase", senha, "xsd:string"]
      ]
    })
  });
  
  // 4. Reboot para aplicar
  await fetch(`${GENIEACS_NBI}/devices/${encodeURIComponent(deviceId)}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "reboot" })
  });
  
  return { success: true, deviceId };
}
```

---

## 5. Decisão: Qual Plataforma Escolher?

### Matriz de Decisão

| Critério | GenieACS | FreeACS | Anlix | Made4Graph |
|----------|----------|---------|-------|------------|
| Custo | Gratuito | Gratuito | Pago | Pago |
| Controle total | ✅ Máximo | ✅ Alto | ⚠️ Limitado | ⚠️ Limitado |
| Integração API | ✅ REST | ✅ REST | ✅ | ✅ |
| Suporte Brasil | ⚠️ Comunidade | ❌ | ✅ | ✅ |
| App técnicos | ❌ (custom) | ❌ | ✅ | ✅ |
| RADIUS integrado | ❌ | ❌ | ❌ | ✅ |
| Bot apontamento | ❌ | ❌ | ❌ | ✅ |
| Setup complexity | Médio | Alto | Baixo | Baixo |

### Recomendação para SDR

**Fase 1 — MVP**: **GenieACS**
- Gratuito, open source, API completa
- Integra perfeitamente com Firebase Functions
- Comunidade ativa, muita documentação
- Controle total sobre os dados

**Fase 2 — Escala**: Avaliar Made4Graph ou Anlix
- Se precisar de RADIUS integrado → **Made4Graph**
- Se precisar de app de técnicos nativo → **Anlix**
- Se tiver muitas OLTs ZTE/Huawei → **SmartOLT + GenieACS** (paralelos)

---

## 6. Configuração da OLT para Apontar ONU para o ACS

### ZTE C300/C600 (SSH)

```bash
# Entrar na OLT
ssh admin@IP_OLT

# Acessar modo de configuração da ONU
interface gpon-olt_1/1/1
  onu 1 type ZTEG-F670L sn-auth ZTEG12345678

# Configurar TR-069 via OMCI
interface gpon-onu_1/1/1:1
  tcont 1 name "1G" profile "1G"
  gemport 1 name "internet" traffic-limit upstream "1G" downstream "1G"

# Profile TR-069 (configurar URL do ACS)
pon-onu-mng gpon-onu_1/1/1:1
  tr069 acs url http://acs.seudominio.com.br:7547/
  tr069 acs username acs_user
  tr069 acs password acs_pass
  tr069 inform enable
  tr069 inform interval 86400
```

### Huawei MA5800 (SSH)

```bash
# Entrar na OLT
ssh admin@IP_OLT

# Configurar parâmetros TR-069 no perfil do serviço
ont tr069-server-info add 0 0 acs-url http://acs.seudominio.com.br:7547/ acs-usr acs_user acs-pwd acs_pass
```

---

## 7. Modelos de CPE Suportados (Referência)

### ONUs GPON com TR-069

| Modelo | Fabricante | Datamodel | Observações |
|--------|------------|-----------|-------------|
| F670L | ZTE | TR-181 | Muito comum no Brasil |
| F601 | ZTE | TR-098/181 | Popular |
| HG8346R | Huawei | TR-181 | |
| HG8546M | Huawei | TR-181 | Muito usado |
| AN5506-04-F | Fiberhome | TR-181 | |
| DM986 | DATACOM | TR-181 | |

### Roteadores com TR-069

| Modelo | Fabricante | Observações |
|--------|------------|-------------|
| TL-WR840N | TP-Link | Popular Brasil |
| Archer C6 | TP-Link | Dual-band |
| DIR-809 | D-Link | |
| EX220 | Intelbras | Muito usado ISPs |

---

## 8. Referências e Links Úteis

### Documentação Oficial
- Broadband Forum: broadband-forum.org
- TR-069 Spec: broadband-forum.org/pdfs/tr-069-1-6-0.pdf
- TR-181 Datamodel: cwmp-datamodel.broadband-forum.org

### GenieACS
- Site: genieacs.com
- GitHub: github.com/genieacs/genieacs
- Docs: docs.genieacs.com
- Forum: forum.genieacs.com

### Plataformas Comerciais
- Anlix: anlix.io | Wiki: wiki.anlix.io
- Made4Graph: made4it.com.br | Wiki: wiki.made4it.com.br
- Int6Tech: int6tech.com.br | Email: atendimento@int6tech.com.br
- SmartOLT: smartolt.com.br
- OLTCloud: oltcloud.co | Wiki TR-069: wiki.oltcloud.co/pt-br/TR069

### Videos YouTube
- GenieACS instalação Debian 12 (PT-BR): buscar "GenieACS Debian 12 português"
- Int6Tech EasyOLT Parte 0-4: Canal Int6Tech
- Int6Tech AutoISP: Canal Int6Tech
- GeoSite Telecom: youtube.com/watch?v=-jDEII8562I

---

## 9. Checklist para Implementação

### Pré-requisitos
- [ ] Servidor Linux (Ubuntu 22.04 recomendado) com IP fixo
- [ ] Domínio ou IP público para o ACS (CPEs externos precisam alcançar)
- [ ] Certificado SSL (Let's Encrypt) para HTTPS
- [ ] Portas abertas: 7547/tcp no firewall/NAT

### Instalação GenieACS
- [ ] Instalar MongoDB 6.x
- [ ] Instalar Node.js 18+
- [ ] Instalar GenieACS via npm
- [ ] Configurar serviços systemd
- [ ] Trocar senha padrão admin
- [ ] Configurar HTTPS (nginx reverse proxy)
- [ ] Testar com CPE de homologação

### Integração SDR
- [ ] Mapear datamodel dos CPEs em uso (ZTE F670L, Huawei HG8546M, etc.)
- [ ] Criar provision scripts no GenieACS
- [ ] Criar presets para configuração automática
- [ ] Implementar Firebase Function para chamar NBI API
- [ ] Testar fluxo completo: SDR → GenieACS → CPE
- [ ] Integrar status ACS no painel SDR (cliente online/offline)

### Configuração OLTs
- [ ] Criar template TR-069 nas OLTs ZTE (URL do ACS)
- [ ] Criar template TR-069 nas OLTs Huawei (URL do ACS)
- [ ] Testar provisioning: cadastrar ONU → ONU conecta ao ACS automaticamente
- [ ] Documentar comandos SSH por modelo de OLT

---

*Criado em: 2026-04-18*  
*Baseado em pesquisa de: Int6Tech, Anlix, Made4Graph, SmartOLT, OLTCloud, GenieACS, FreeACS*  
*Relacionado: [[GEOSITE_ANALISE]], [[MK_SISTEMA_COLETADO]], [[MK_API_REFERENCE]], [[FTTH_PLATAFORMAS_MAPEAMENTO]], [[FTTH_NORMAS_ATENUACAO]], [[ISP_ERPS_BRASILEIROS]], [[CLAUDE]]*  
*Índice: [[SDR_INDEX]]*
