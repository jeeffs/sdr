# MK Solutions API — Referência para SDR Comercial

> Fonte: https://mkloud.atlassian.net/wiki/spaces/MK30/overview
> Mapeado em: 2026-04-13

---

## Autenticação

Toda chamada requer um token obtido via autenticação.

### Para serviços gerais
```
GET http://IP:PORTA/mk/WSAutenticacao.rule?sys=MK0
  &token=tokenDoUsuário
  &password=contrasenhaPerfil
  &cd_servico=codigoServico
```

| Param | Obrigatório | Descrição |
|-------|-------------|-----------|
| token | Sim | Token do cadastro de usuário no MK |
| password | Sim | Contra-senha do perfil de Webservice |
| cd_servico | Sim | Código do serviço (ou 9999 para todos) |

**Retorno:** `tokenRetornoAutenticacao` — usado em todas as chamadas subsequentes.

### Para serviços específicos (operador)
```
GET http://IP:PORTA/mk/WSAutenticacaoOperador.rule?sys=MK0
  &username=Usuário
  &password=senhaUsuario
```

### Tabela de Serviços (cd_servico)
| Código | Serviço |
|--------|---------|
| 1 | Segunda via de boleto |
| 4 | Validar user/senha SAC |
| 6 | Consultar documento |
| 7 | Consulta de faturas pendentes |
| 8 | Contratos por cliente |
| 9 | Conexões por cliente |
| 10 | Classificações de atendimento |
| 11 | Processos de atendimentos |
| 16 | Estrutura de endereços |
| 17 | Consultar pessoa pelo nome |
| 20 | Consulta de fatura por código de barras |
| 21 | Linha digitável por fatura via SMS |
| 9999 | Todos os serviços |

---

## APIs Gerais (relevantes para SDR Comercial)

### 1. Consulta de Cliente por CPF/CNPJ
```
GET /mk/WSMKConsultaDoc.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &doc={cpf_ou_cnpj}
```
**Uso SDR:** Vincular cliente do MK ao cadastro SDR Comercial pelo documento.

### 2. Consulta de Cliente por Nome
```
GET /mk/WSMKConsultaNome.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &nome={nomeCliente}
```
**Uso SDR:** Busca textual de clientes no MK.

### 3. Listar Clientes (com filtros)
```
GET /mk/WSMKConsultaClientes.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &doc=
  &codigo_bairro=
  &nome_cliente=
  &data_alteracao_inicio=
  &cd_cliente_inicio=
  &cd_cliente_fim=
  &cd_cliente=
  &data_alteracao_fim=
```
**Uso SDR:** Sync em massa de clientes MK → Firebase. Filtrar por data_alteracao para sync incremental.

### 4. Conexões por Cliente ⭐ (CRÍTICO)
```
GET /mk/WSMKConexoesPorCliente.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &cd_cliente={codigoCliente}
```
**Uso SDR:** Dados de conexão PPPoE/IPoE, status online/offline, velocidade, IP. Alimenta a página de ONUs e Dashboard de Rede.

### 5. Contratos por Cliente
```
GET /mk/WSMKContratosPorCliente.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &cd_cliente={codigoCliente}
```
**Uso SDR:** Mostrar plano contratado, status do contrato, valores na ficha do cliente.

### 6. Faturas Pendentes
```
GET /mk/WSMKFaturasPendentes.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &cd_cliente={codigoCliente}
```
**Uso SDR:** Indicador financeiro na ficha do cliente (adimplente/inadimplente).

### 7. Estrutura de Endereços
```
GET /mk/WSMKListaEstruturaEnderecos.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
```
**Uso SDR:** Mapear estrutura de bairros/logradouros para importação e geocodificação.

---

## APIs Especiais (relevantes para SDR Comercial)

### 8. Listar Faturas (detalhado)
```
GET /mk/WSMKFaturas.rule?sys=MK0
  &token={token}
  &codigo_cliente={cod}
  &liquidado=S/N
  &codigo_fatura_inicio=
  &codigo_fatura_fim=
  &data_emissao=
  &data_vencimento=
  &data_pagamento=
  &codigo_contrato=
  &quantidade_meses=
```
**Uso SDR:** Histórico financeiro completo do cliente.

### 9. Criar Ordem de Serviço ⭐ (CRÍTICO)
```
GET /mk/WSMKCriarOrdemServico.rule?sys=MK0
  &token={token}
  &CodigoCliente={cod}
  &CodigoConexao=
  &CodigoContrato=
  &DescricaoProblema={texto}
  &CodigoTipoOS={tipo}
  &CodigoTecnico={tecnico}
  &CodigoGrupoServico={equipe}
  &categoria=1|2  (1=cliente, 2=provedor)
```
**Uso SDR:** Abrir OS diretamente da ficha do cliente ou do alerta de ONU offline.
- Categoria 1 = OS do cliente
- Categoria 2 = OS do provedor (manutenção infra)

**Parâmetros de endereço (opcional):** cidade, bairro, logradouro, complemento, numero

### 10. Consulta Ponto Imobilizado ⭐
```
GET /mk/WSMKConsultaPontoImobilizado.rule?sys=MK0
  &token={token}
```
**Uso SDR:** Listar infraestrutura física (POPs, armários, CTOs) do MK para sync com SDR.

### 11. Consulta Local de Manutenção ⭐
```
GET /mk/WSMKConsultaLocalManutencao.rule?sys=MK0
  &token={token}
  &local={tipo}
```
| Código | Tipo |
|--------|------|
| 1 | POP |
| 2 | Armário |
| 3 | Ponto de acesso |
| 4 | OLT |
| 5 | Servidor |
| 6 | Nap/Hub |
| 7 | Caixa de emenda |
| 99 | Outros |

**Uso SDR:** Sync de OLTs (local=4), POPs (local=1), CTOs/Nap (local=6) do MK para Firebase.

### 12. Alterar OS
```
PUT /os
  token, id, defeitoReclamado, defeitoConstatado, operador, tipo, items, encerrarOs...
```
**Uso SDR:** Atualizar/encerrar OS a partir do SDR Comercial.

### 13. Auto-Desbloqueio
```
GET /mk/WSMKAutoDesbloqueio.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &cd_conexao={codigoConexao}
  &diasexcecao=
```
**Uso SDR:** Botão de desbloqueio rápido na ficha do cliente.

### 14. Criar Novo Contrato
```
GET /mk/WSMKNovoContrato.rule?sys=MK0
  &token={token}
  &CodigoCliente={cod}
  &CodigoTipoPlano={tipo}
  &CodigoPlanoAcesso={plano}
  &CodigoRegraVencimento={vcto}
  ... (muitos params)
```
**Uso SDR:** Ativar contrato diretamente do SDR (fluxo de vendas em campo).

### 15. Abertura de Lead
```
GET /mk/WSMKNovaLead.rule?sys=MK0
  &token={tokenRetornoAutenticacao}
  &cd_cliente={codigoCliente}
  &info={informacaoAtendimento}
```
**Uso SDR:** Registrar lead/atendimento a partir de visita em campo.

---

## Fluxo de Integração SDR → MK

```
1. Autenticação
   WSAutenticacao → tokenRetornoAutenticacao

2. Sync de Clientes (periódico)
   WSMKConsultaClientes → Firebase sdr_comercial/{tenant}/clients/
   Filtrar por data_alteracao para sync incremental

3. Sync de Infraestrutura
   WSMKConsultaLocalManutencao(local=4) → OLTs
   WSMKConsultaLocalManutencao(local=1) → POPs
   WSMKConsultaLocalManutencao(local=6) → CTOs/NAPs
   WSMKConsultaPontoImobilizado → Pontos físicos

4. Dados em Tempo Real (por cliente)
   WSMKConexoesPorCliente → Status conexão, IP, velocidade
   WSMKContratosPorCliente → Plano, status contrato
   WSMKFaturasPendentes → Situação financeira

5. Ações do SDR → MK
   WSMKCriarOrdemServico → Abrir OS
   WSMKAutoDesbloqueio → Desbloquear conexão
   WSMKNovaLead → Registrar atendimento
```

---

## Configuração Necessária no MK

1. **Módulo Integradores → Gerenciador de Webservices**
2. Criar perfil com contra-senha (mín. 8 dígitos)
3. Restringir por IP do servidor SDR
4. Autorizar os webservices necessários
5. **Importante:** Usar HTTPS em produção
6. Token expira conforme configurado no perfil

---

## Próximos Passos (Sprint 5)

- [ ] Obter IP:PORTA do servidor MK do provedor
- [ ] Criar perfil de Webservice no MK com os serviços: 6, 7, 8, 9, 16, 17
- [ ] Implementar proxy Firebase Functions para chamadas MK (evitar CORS)
- [ ] Implementar sync incremental de clientes
- [ ] Implementar sync de infraestrutura (OLTs, POPs, CTOs)
- [ ] Adicionar dados de conexão na ficha do cliente
- [ ] Botão "Abrir OS" na ficha do cliente e nos alertas
- [ ] Botão "Desbloquear" na ficha do cliente
