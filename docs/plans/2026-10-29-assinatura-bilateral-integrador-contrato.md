# Design da Assinatura Bilateral de Contratos

**Data:** 29 de Outubro de 2026  
**Status:** Aprovado para Implementação  
**Escopo:** Módulo de Vendas, Assinatura Eletrônica, Templates de Contrato e Folha de Auditoria

---

## 1. Contexto e Objetivo

Anteriormente, ao gerar um contrato de venda de usina solar (`CONTRATO_PF` ou `CONTRATO_PJ`), a minuta continha um carimbo institucional genérico para a Contratada e direcionava todo o fluxo de assinatura exclusivamente para o cliente final.

Embora isso seja o padrão para **Procurações** (onde apenas o cliente é o Outorgante perante a concessionária de energia), em um **Contrato de Prestação de Serviços e Compra e Venda de Usina Solar** a relação é bilateral e sinalagmática.

O objetivo deste projeto é implementar o fluxo de **Assinatura Bilateral em Duas Etapas**:

1. O **Integrador assina primeiro** diretamente na tela de detalhes da venda (`/vendas/[id]`) usando sua rubrica salva ou desenhando uma nova via 1-clique;
2. O contrato é atualizado instantaneamente com a assinatura real, carimbo de data/hora e hash da empresa no bloco da CONTRATADA;
3. O botão de disparo para o cliente (WhatsApp / Copiar Link) só é habilitado após a assinatura do integrador (com trava preventiva);
4. O cliente abre o link de assinatura (`/assinar/[token]`) e já visualiza a via oficial assinada pela empresa integradora;
5. O cliente conclui a assinatura dele (OTP + Rubrica);
6. O PDF final arquivado inclui a **Folha de Auditoria Forense com ambos os signatários** (Contratada e Contratante), garantindo plena eficácia de Título Executivo Extrajudicial (Art. 784, III do CPC) e conformidade com o Marco Legal da Assinatura Digital (Lei Federal nº 14.063/2020 e MP nº 2.200-2/2001).

---

## 2. Arquitetura de Dados

### 2.1. Prisma Schema (`schema.prisma`)

#### Modelo `Tenant`

Campos adicionais para parametrização do representante legal e rubrica corporativa:

- `representativeName`: `String?`
- `representativeCpf`: `String?`
- `representativeSignature`: `String?` (`@db.Text`) — Imagem PNG Base64 da rubrica oficial salva da empresa.

#### Modelo `SaleDocument`

Campos dedicados para a auditoria e evidência probatória da assinatura da Contratada:

- `companySignedAt`: `DateTime?`
- `companySignerName`: `String?`
- `companySignerEmail`: `String?`
- `companySignerCpf`: `String?`
- `companySignerIp`: `String?`
- `companySignerUserAgent`: `String?`
- `companySignatureImage`: `String?` (`@db.Text`)
- `companySignatureHash`: `String?`

---

## 3. Endpoints da API

### `POST /sales/:saleId/documents/:docId/sign-company`

- **Autenticação:** JWT Bearer (Integrador autenticado).
- **Payload:**
  ```json
  {
    "signatureImage": "data:image/png;base64,...",
    "useSavedSignature": true,
    "signerName": "Nome do Representante",
    "signerCpf": "123.456.789-00"
  }
  ```
- **Processamento:**
  1. Valida permissões e existência do documento da venda.
  2. Obtém IP e User-Agent do integrador a partir dos headers HTTP da requisição.
  3. Gera hash SHA-256 e UUID para a assinatura da empresa.
  4. Atualiza o HTML da minuta (`contentHtml`), substituindo o marcador `{{bloco_assinatura_empresa}}` pelo bloco assinado da CONTRATADA.
  5. Gera o novo PDF intermediário com a assinatura da empresa e atualiza `originalPdfUrl` e `originalPdfHash`.
  6. Se o usuário marcar "Salvar como padrão da empresa", salva a rubrica no `Tenant`.

### `GET /sales/tenant-signature` & `PATCH /sales/tenant-signature`

- Permite consultar e cadastrar/atualizar a rubrica padrão do representante da empresa.

---

## 4. Atualização dos Templates de Documentos

### 4.1. `contract-pf.template.ts` (e PJ)

- Substituição do selo institucional estático pelo marcador:
  `{{bloco_assinatura_empresa}}`
- **Antes da assinatura da empresa:**
  Exibe caixa elegante: `⏳ Aguardando Assinatura do Integrador`.
- **Após a assinatura da empresa:**
  Exibe a rubrica renderizada com carimbo:
  `✓ Assinado pela Empresa em DD/MM/AAAA às HH:MM:SS` com o hash de autenticação corporativa.

### 4.2. `power-of-attorney-pf.template.ts`

- Permanece inalterado no fluxo de assinatura: exclusivamente para o cliente (Outorgante), garantindo total aderência às exigências das concessionárias e ANEEL.

### 4.3. Folha de Auditoria (`signature-audit.service.ts`)

- A folha de auditoria final gerada passa a conter:
  - **Seção 1:** Identificação do Documento e Objeto.
  - **Seção 2:** Signatário 1 — CONTRATADA (Empresa Integradora): Nome, CPF, E-mail, IP, Dispositivo, Data/Hora, Hash.
  - **Seção 3:** Signatário 2 — CONTRATANTE (Cliente Titular): Nome, CPF, E-mail, IP, Código OTP, Data/Hora, Hash.
  - **Declaração de Enquadramento Legal Bilateral**.

---

## 5. Interface do Usuário (Frontend)

### 5.1. Tela da Venda (`apps/web/src/app/(authenticated)/vendas/[id]/page.tsx`)

1. **Cards/Linhas de Documentos:**
   - Para Contratos: se `!doc.companySignedAt`, exibe badge âmbar: `Pendente Assinatura do Integrador` e botão **"Assinar como Integrador"**.
   - Se já assinado: exibe badge verde `Assinado pelo Integrador em DD/MM/AAAA`.
2. **Modal de Assinatura do Integrador (`CompanySignModal`):**
   - Exibe prévia da rubrica salva da empresa ou tela de desenho (canvas).
   - Mostra os dados do representante legal.
   - Botão de 1 clique: **"Confirmar e Assinar Contrato"**.
3. **Trava de Envio para o Cliente:**
   - Botões "Copiar Link de Assinatura" e "Enviar via WhatsApp":
     - Se o contrato ainda não estiver assinado pelo integrador, um modal/alerta orienta: _"Assine o contrato como integrador antes de enviar para o cliente, garantindo que ele receba a via já chancelada pela sua empresa"_, com atalho direto para assinar.

### 5.2. Tela Pública de Assinatura (`apps/web/src/app/assinar/[token]/page.tsx`)

- Ao visualizar o contrato, o cliente já vê no preview o bloco da CONTRATADA assinado e datado com a rubrica da empresa.
- Ao assinar sua via (CONTRATANTE), o fluxo conclui com sucesso gerando o PDF final assinado por ambos.
