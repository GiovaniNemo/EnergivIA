# Design: Módulo de Conversão para Venda, Geração de Contratos e Assinatura Eletrônica Nativa

> **Data:** 27/10/2026  
> **Status:** Aprovado para Implementação  
> **Objetivo:** Fornecer aos integradores de energia solar um fluxo completo de fechamento comercial e jurídico: conversão de propostas em vendas, complementação automática de dados cadastrais, geração de contratos e procurações a partir de templates com variáveis dinâmicas, e assinatura eletrônica nativa (com OTP de e-mail, canvas de rubrica e trilha de auditoria jurídica), com custo zero de API externa e documentos ilimitados.

---

## 1. Contexto & Problema

Hoje, o integrador solar gera uma proposta comercial bonita na EnergivIA, mas quando o cliente aceita, o fechamento jurídico empaca:

1. O integrador precisa abrir o Word manualmente para montar contratos de prestação de serviço e procurações da concessionária.
2. A tentativa anterior de usar a ZapSign esbarrava no custo de API externa (R$ 69,90/mês para apenas 20 envelopes), gerando limites de volume e atrito comercial.
3. Não havia uma entidade formal de "Venda / Obra" que separasse propostas em negociação de projetos fechados prontos para instalação e homologação.

---

## 2. Visão Geral da Solução

O novo ecossistema adiciona 4 pilares intuitivos e automatizados:

```
[ Propostas (/propostas) ] ──▶ [ Converter para Venda ] (1 clique)
                                        │
                                        ▼
[ Módulo de Vendas (/vendas) ] ◀────────┘
       ├── Ficha da Venda: Auto-preenchimento de dados da proposta
       ├── Documentos Dinâmicos: Contrato PF/PJ e Procuração ANEEL
       └── Assinatura Nativa (/assinar/:token):
             ├── Confirmação de CPF
             ├── OTP de 5 dígitos enviado por e-mail
             ├── Canvas para desenhar a rubrica com o dedo
             └── Relatório de Auditoria Jurídica com duplo Hash (SHA-256)
```

---

## 3. Modelo de Dados (Prisma Schema)

### 3.1. Entidade `Sale` (Venda)

```prisma
model Sale {
  id                String       @id @default(uuid())
  tenantId          String
  proposalId        String       @unique
  dealId            String?
  saleNumber        Int?         // Sequencial por tenant (ex: V-001)
  status            SaleStatus   @default(AWAITING_ANALYSIS)

  // Qualificação Jurídica do Cliente (PF / PJ)
  customerType      CustomerType @default(PF) // PF | PJ
  documentNumber    String?      // CPF ou CNPJ
  rgNumber          String?      // RG ou IE
  rgIssuer          String?      // Órgão Expedidor (ex: SSP/SP)
  birthDate         DateTime?
  maritalStatus     String?      // Solteiro, Casado, etc.
  profession        String?
  legalRepresentativeName String? // Para PJ
  legalRepresentativeCpf  String?

  // Dados da Instalação Solar
  installationAddress String?
  installationCity    String?
  installationState   String?
  installationZip     String?
  distributionCompany String?    // CPFL, Enel, Cemig, etc.
  consumerUnitNumber  String?    // Número da UC / Conta de Luz

  // Dados Financeiros & Técnicos (Copiados da proposta como snapshot)
  systemPowerKwp    Float
  investmentAmount  Float
  paymentMethod     String?
  sellerName        String?

  notes             String?      @db.Text
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  tenant            Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  proposal          Proposal     @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  deal              Deal?        @relation(fields: [dealId], references: [id])
  documents         SaleDocument[]

  @@index([tenantId, status])
}

enum SaleStatus {
  AWAITING_ANALYSIS
  DOCUMENTS_PENDING
  SIGNATURE_PENDING
  SIGNED
  IN_HOMOLOGATION
  COMPLETED
  CANCELED
}

enum CustomerType {
  PF
  PJ
}
```

### 3.2. Entidade `SaleDocument` (Documentos da Venda)

```prisma
model SaleDocument {
  id                String             @id @default(uuid())
  saleId            String
  tenantId          String
  templateType      DocumentType       // CONTRATO_PF | CONTRATO_PJ | PROCURACAO_PF | PROCURACAO_PJ
  title             String
  originalPdfUrl    String?
  originalPdfHash   String?            // SHA-256 do PDF original
  signedPdfUrl      String?
  signedPdfHash     String?            // SHA-256 do PDF após assinado
  status            DocumentSignStatus @default(PENDING)
  publicToken       String             @unique @default(uuid()) // Token da URL pública /assinar/:token

  // OTP e Autenticação
  otpCode           String?
  otpExpiresAt      DateTime?
  otpVerifiedAt     DateTime?

  // Dados da Assinatura
  signedAt          DateTime?
  signerName        String?
  signerCpf         String?
  signerEmail       String?
  signerIp          String?
  signerUserAgent   String?
  signatureImage    String?            @db.Text // Base64 do traço desenhado no canvas
  signatureHash     String?            // UUID / Hash único da assinatura

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  sale              Sale               @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@index([publicToken])
  @@index([saleId])
}

enum DocumentType {
  CONTRATO_PF
  CONTRATO_PJ
  PROCURACAO_PF
  PROCURACAO_PJ
}

enum DocumentSignStatus {
  PENDING
  OTP_SENT
  SIGNED
  REFUSED
}
```

---

## 4. Experiência do Usuário & Automações Intuitivas

### A. Conversão com 1 Clique (Zero Digitação Redundante)

Ao clicar em **"Converter para Venda"** em `/propostas`:

- O sistema copia automaticamente:
  - Nome do cliente, WhatsApp e E-mail cadastrados no Lead.
  - Potência da usina (`systemPowerKwp`), Quantidade de módulos e inversores.
  - Cidade, Estado e Endereço conhecidos.
  - Valor total acordado e vendedor responsável.
- O integrador é levado para a venda já criada e só preenche o que falta (CPF e número da UC).

### B. Seletor de Documentos Dinâmicos com Tags Pré-Configuradas

O sistema inclui modelos prontos de fábrica:

- **Contrato PF:** Cláusulas de fornecimento, prazos de montagem, garantia e termos da Lei 14.300/2022.
- **Procuração PF:** Autorização expressa para homologação do projeto junto à concessionária.
- Tags substituídas instantaneamente:
  - `{{nome_cliente}}`, `{{cpf_cliente}}`, `{{rg_cliente}}`
  - `{{endereco_instalacao}}`, `{{numero_uc}}`, `{{concessionaria}}`
  - `{{potencia_kwp}}`, `{{valor_total}}`, `{{nome_vendedor}}`, `{{nome_empresa}}`

### C. Link de Assinatura Rápido para WhatsApp

Na aba de documentos da venda, além de mostrar o status em tempo real, há o botão:

- **"Copiar Mensagem para WhatsApp"**:
  > _"Olá Sr. João! Segue o link para conferência e assinatura eletrônica do contrato da sua usina solar EnergivIA: https://app.energivia.com.br/assinar/uuid-123"_

---

## 5. Fluxo de Assinatura Eletrônica Nativa (`/assinar/:token`)

1. **Acesso Público Responsivo:**
   - Interface limpa e otimizada para celular.
   - O cliente visualiza a prévia do contrato/procuração gerado.
2. **Passo 1: Confirmação de Identidade:**
   - O cliente digita os dígitos do seu CPF cadastrado.
3. **Passo 2: Verificação OTP por E-mail:**
   - O sistema gera um código de 5 dígitos numéricos (expiração em 15 minutos) e envia via `EmailService`.
   - O cliente insere o código na tela.
4. **Passo 3: Coleta da Assinatura (Canvas):**
   - Campo para o cliente desenhar a rubrica com o dedo ou mouse.
   - Botão de "Limpar" e "Confirmar Assinatura".
5. **Passo 4: Finalização e Trilha de Auditoria:**
   - O sistema renderiza o PDF final anexando o carimbo visual e uma folha oficial de **"Termo de Assinatura Eletrônica & Trilha de Auditoria"** contendo:
     - Dados do signatário (Nome, CPF, E-mail)
     - Imagem da assinatura capturada
     - Hash SHA-256 do PDF original e Hash da assinatura
     - Endereço IP público e User-Agent do navegador
     - Data e hora exatas com carimbo de tempo
     - Enquadramento legal (MP 2.200-2/2001 e Lei 14.063/2020)
   - A venda é atualizada para `SIGNED` automaticamente.

---

## 6. Plano de Teste de Ponta a Ponta para o Usuário

1. **Teste de Conversão:** Acessar `/propostas`, clicar em "Converter para Venda" e verificar a criação da venda em `/vendas`.
2. **Teste de Complemento:** Preencher CPF e Unidade Consumidora (UC) na ficha da venda e salvar.
3. **Teste de Geração de Contrato:** Gerar o Contrato PF e conferir que as tags foram substituídas com os dados reais.
4. **Teste de Assinatura Externa:** Abrir o link público `/assinar/[token]` em aba anônima, validar CPF, receber o OTP no e-mail, desenhar a assinatura e confirmar.
5. **Teste de Auditoria e Downloads:** Conferir que a venda ficou com status "Assinado" e baixar o "PDF Assinado" verificando a folha de auditoria e hashes no final.
