# Módulo de Conversão para Venda, Geração de Contratos e Assinatura Eletrônica Nativa Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar o fluxo comercial e jurídico completo para integradores solares: conversão com 1 clique de propostas em vendas, ficha cadastral com auto-preenchimento, motor de modelos de contratos e procurações ANEEL com tags dinâmicas, assinatura eletrônica nativa mobile-first (com OTP por e-mail, rubrica em canvas e relatório de auditoria jurídica com duplo hash SHA-256) com custo zero de API externa e documentos ilimitados.

**Architecture:** Módulo NestJS `SalesModule` integrado ao Prisma (`Sale`, `SaleDocument`) com geração de PDFs via `PdfRendererService`, disparo de OTP via `EmailService` e assinatura pública sem autenticação sob token UUID único. Frontend Next.js com novo item "Vendas" no menu de Operação, botão de conversão rápida na listagem e na proposta, ficha cadastral moderna e tela pública `/assinar/:token`.

**Tech Stack:** NestJS, Prisma (PostgreSQL), Puppeteer / Chromium (`PdfRendererService`), Nodemailer/Resend (`EmailService`), Next.js (App Router), React, Tailwind CSS, Lucide Icons, Vitest.

---

### Task 1: Prisma Schema & Database Migration (Sale & SaleDocument)

**Files:**

- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Write schema updates**
Add `model Sale`, `model SaleDocument`, and enums `SaleStatus`, `CustomerType`, `DocumentType`, `DocumentSignStatus` to `apps/api/prisma/schema.prisma`:

- Add `sales Sale[]` to `Tenant`
- Add `sale Sale?` to `Proposal`
- Add `sales Sale[]` to `Deal`

```prisma
model Sale {
  id                      String       @id @default(cuid())
  tenantId                String
  proposalId              String       @unique
  dealId                  String?
  saleNumber              Int?
  status                  SaleStatus   @default(AWAITING_ANALYSIS)

  customerType            CustomerType @default(PF)
  documentNumber          String?
  rgNumber                String?
  rgIssuer                String?
  birthDate               DateTime?
  maritalStatus           String?
  profession              String?
  legalRepresentativeName String?
  legalRepresentativeCpf  String?

  installationAddress     String?
  installationCity        String?
  installationState       String?
  installationZip         String?
  distributionCompany     String?
  consumerUnitNumber      String?

  systemPowerKwp          Float
  investmentAmount        Float
  paymentMethod           String?
  sellerName              String?

  notes                   String?      @db.Text
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt

  tenant                  Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  proposal                Proposal     @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  deal                    Deal?        @relation(fields: [dealId], references: [id])
  documents               SaleDocument[]

  @@index([tenantId, status])
  @@index([proposalId])
}

model SaleDocument {
  id                String             @id @default(cuid())
  saleId            String
  tenantId          String
  templateType      DocumentType
  title             String
  originalPdfUrl    String?
  originalPdfHash   String?
  signedPdfUrl      String?
  signedPdfHash     String?
  status            DocumentSignStatus @default(PENDING)
  publicToken       String             @unique @default(uuid())

  otpCode           String?
  otpExpiresAt      DateTime?
  otpVerifiedAt     DateTime?

  signedAt          DateTime?
  signerName        String?
  signerCpf         String?
  signerEmail       String?
  signerIp          String?
  signerUserAgent   String?
  signatureImage    String?            @db.Text
  signatureHash     String?

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  sale              Sale               @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@index([publicToken])
  @@index([saleId])
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

**Step 2: Generate client and push schema**
Run: `pnpm.cmd --filter @energivia/api db:generate`
Run: `pnpm.cmd --filter @energivia/api db:push`
Expected: Database schema synchronized successfully.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(database): adicionar modelos Sale e SaleDocument para gestao de vendas e contratos"
```

---

### Task 2: Sales Module Backend Core - DTOs, Service & Controller

**Files:**

- Create: `apps/api/src/modules/sales/dto/convert-proposal-to-sale.dto.ts`
- Create: `apps/api/src/modules/sales/dto/update-sale.dto.ts`
- Create: `apps/api/src/modules/sales/dto/query-sales.dto.ts`
- Create: `apps/api/src/modules/sales/sales.service.ts`
- Create: `apps/api/src/modules/sales/sales.controller.ts`
- Create: `apps/api/src/modules/sales/sales.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/modules/sales/__tests__/sales.service.spec.ts`

**Step 1: Write the failing test**
Create `apps/api/src/modules/sales/__tests__/sales.service.spec.ts` testing:

- `convertToSale`: clones proposal, lead, sizing snapshot into `Sale`, returns sale.
- `listSales`: lists sales with filters and pagination.
- `getSaleById`: returns sale with documents and proposal data.
- `updateSale`: updates customer legal qualification and installation fields.

**Step 2: Run test to verify it fails**
Run: `pnpm.cmd --filter @energivia/api test src/modules/sales/__tests__/sales.service.spec.ts`
Expected: FAIL (module/service not found).

**Step 3: Implement DTOs, SalesService and SalesController**

- `convertProposalToSale`: reads proposal with `deal.lead` and `simulation`, extracts `systemPowerKw`, `quotedValueBrl`, customer name/whatsapp/email/cpf, creates `Sale` if not already created, or returns existing sale.
- `updateSale`: updates fields with validation.
- Register `SalesModule` in `AppModule`.

**Step 4: Run test to verify it passes**
Run: `pnpm.cmd --filter @energivia/api test src/modules/sales/__tests__/sales.service.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/sales/
git commit -m "feat(api): implementar modulo de vendas com conversao de proposta e gestao cadastral"
```

---

### Task 3: Document Template Engine & Dynamic Tag Generator

**Files:**

- Create: `apps/api/src/modules/sales/document-template.service.ts`
- Create: `apps/api/src/modules/sales/templates/contract-pf.template.ts`
- Create: `apps/api/src/modules/sales/templates/power-of-attorney-pf.template.ts`
- Modify: `apps/api/src/modules/sales/sales.service.ts`
- Test: `apps/api/src/modules/sales/__tests__/document-template.service.spec.ts`

**Step 1: Write the failing test**
Create `apps/api/src/modules/sales/__tests__/document-template.service.spec.ts` testing:

- Dynamic tag substitution (`{{nome_cliente}}`, `{{cpf_cliente}}`, `{{potencia_kwp}}`, `{{valor_total}}`, `{{endereco_instalacao}}`, `{{concessionaria}}`, `{{numero_uc}}`, `{{nome_empresa}}`).
- HTML generation for `CONTRATO_PF` and `PROCURACAO_PF`.
- PDF generation and SHA-256 hash generation for the original PDF.

**Step 2: Run test to verify it fails**
Run: `pnpm.cmd --filter @energivia/api test src/modules/sales/__tests__/document-template.service.spec.ts`
Expected: FAIL (service not found).

**Step 3: Implement templates and DocumentTemplateService**

- Clean HTML templates with inline styles suitable for Puppeteer A4 print.
- Substitute tags safely with escaping.
- Call `PdfRendererService.renderHtmlPdf(html)`.
- Compute SHA-256 hash (`crypto.createHash('sha256').update(buffer).digest('hex')`).
- Create/update `SaleDocument` record.

**Step 4: Run test to verify it passes**
Run: `pnpm.cmd --filter @energivia/api test src/modules/sales/__tests__/document-template.service.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/sales/
git commit -m "feat(api): implementar motor de templates de contratos e procuracao com tags dinamicas e SHA-256"
```

---

### Task 4: Native Electronic Signature & Audit Trail Backend

**Files:**

- Create: `apps/api/src/modules/sales/dto/request-otp.dto.ts`
- Create: `apps/api/src/modules/sales/dto/sign-document.dto.ts`
- Create: `apps/api/src/modules/sales/public-signature.controller.ts`
- Create: `apps/api/src/modules/sales/signature-audit.service.ts`
- Modify: `apps/api/src/modules/sales/sales.module.ts`
- Test: `apps/api/src/modules/sales/__tests__/public-signature.controller.spec.ts`

**Step 1: Write the failing test**
Create `apps/api/src/modules/sales/__tests__/public-signature.controller.spec.ts` testing:

- `GET /public/documents/:token`: returns public document preview metadata.
- `POST /public/documents/:token/request-otp`: checks CPF, generates 5-digit code, dispatches email via `EmailService`.
- `POST /public/documents/:token/verify-otp`: verifies code within expiry.
- `POST /public/documents/:token/sign`: validates signature image base64, appends audit trail sheet, computes signed hash, marks document `SIGNED`.

**Step 2: Run test to verify it fails**
Run: `pnpm.cmd --filter @energivia/api test src/modules/sales/__tests__/public-signature.controller.spec.ts`
Expected: FAIL.

**Step 3: Implement PublicSignatureController & SignatureAuditService**

- Add `@Public()` endpoints.
- Generate OTP code with `crypto.randomInt(10000, 99999).toString()`.
- Send OTP email with clear, professional template.
- Render Audit Trail sheet HTML with timestamp, IP, User-Agent, signature PNG, SHA-256 hashes, legal basis: Medida Provisória 2.200-2/2001 e Lei 14.063/2020.
- Merge/append to document and update `Sale` to `SIGNED`.

**Step 4: Run test to verify it passes**
Run: `pnpm.cmd --filter @energivia/api test src/modules/sales/__tests__/public-signature.controller.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/sales/
git commit -m "feat(api): implementar endpoints publicos de assinatura eletronica, OTP e trilha de auditoria"
```

---

### Task 5: Frontend - Sidebar Navigation & Conversion Trigger

**Files:**

- Modify: `apps/web/src/config/menu.config.ts`
- Modify: `apps/web/src/app/(authenticated)/proposals/page.tsx`
- Modify: `apps/web/src/components/proposals/proposal-internal-view.tsx`

**Step 1: Add "Vendas" to menu.config.ts**

- Add under `section: "operation"`, right below "Propostas":
  `{ label: "Vendas", icon: FileCheck, path: "/vendas", section: "operation", tooltip: "Vendas: fechamento comercial, contratos e assinaturas", highlight: true }`

**Step 2: Add "Converter para Venda" Action**

- In `proposals/page.tsx`: add primary action button "Converter para Venda" (or inside actions menu) with confirmation modal.
- In `proposal-internal-view.tsx`: add action button "Converter para Venda" in the top bar.
- On click, calls `POST /api/sales/convert/:proposalId` and navigates smoothly to `/vendas/:saleId`.

**Step 3: Validate linting and types**
Run: `pnpm.cmd --filter @energivia/web lint`
Expected: 0 errors.

**Step 4: Commit**

```bash
git add apps/web/src/config/menu.config.ts apps/web/src/app/\(authenticated\)/proposals/ apps/web/src/components/proposals/
git commit -m "feat(web): adicionar item Vendas no menu e acao Converter para Venda em propostas"
```

---

### Task 6: Frontend - Sales Management (`/vendas` & `/vendas/[id]`)

**Files:**

- Create: `apps/web/src/app/(authenticated)/vendas/page.tsx`
- Create: `apps/web/src/app/(authenticated)/vendas/[id]/page.tsx`
- Create: `apps/web/src/components/sales/SaleCustomerTab.tsx`
- Create: `apps/web/src/components/sales/SaleDocumentsTab.tsx`
- Create: `apps/web/src/components/sales/SaleAuditTab.tsx`

**Step 1: Implement `/vendas/page.tsx`**

- Professional table/grid of sales.
- Columns: Venda #, Cliente, Cidade/UF, Potência (kWp), Valor (R$), Status Badge, Ações.
- Filter by status (`AWAITING_ANALYSIS`, `DOCUMENTS_PENDING`, `SIGNATURE_PENDING`, `SIGNED`, `COMPLETED`).
- Quick search by client name or proposal number.

**Step 2: Implement `/vendas/[id]/page.tsx`**

- Clean, intuitive header with Sale Number, Status badge, and quick stats (kWp, R$).
- Tab 1: **"Ficha Cadastral"** (Customer PF/PJ, CPF/CNPJ, RG, Address, Concessionária, UC number) with "Salvar Dados" button.
- Tab 2: **"Documentos & Contratos"**:
  - Buttons: "Gerar Contrato de Venda", "Gerar Procuração ANEEL".
  - Cards showing generated documents, status (`Pendente`, `Assinado`), direct PDF download, and "Copiar Link para WhatsApp" button.
- Tab 3: **"Trilha de Auditoria"**:
  - Live timeline of events (criado, OTP enviado, assinado), signer IP, timestamps, SHA-256 hashes.

**Step 3: Validate linting and types**
Run: `pnpm.cmd --filter @energivia/web lint`
Expected: 0 errors.

**Step 4: Commit**

```bash
git add apps/web/src/app/\(authenticated\)/vendas/ apps/web/src/components/sales/
git commit -m "feat(web): implementar telas de listagem de vendas e ficha cadastral com gerador de contratos"
```

---

### Task 7: Frontend - Native Public Signature Experience (`/assinar/[token]`)

**Files:**

- Create: `apps/web/src/app/assinar/[token]/page.tsx`
- Create: `apps/web/src/components/signature/SignatureCanvas.tsx`

**Step 1: Implement `/assinar/[token]/page.tsx`**

- Clean, trustworthy, legal-tech styling (slate, emerald accents, security badges).
- Progress steps indicator:
  1. `Conferir Documento`: PDF preview embedded/scrolling with clear zoom.
  2. `Verificação de Identidade`: Input for CPF digits to confirm identity.
  3. `Código de Segurança OTP`: Input for 5-digit code with "Reenviar código" option.
  4. `Rubrica / Assinatura`: HTML5 Canvas responsive for touch/mouse with "Limpar" and "Confirmar Assinatura".
  5. `Concluído`: Success check, confirmation timestamp, button to download signed PDF with audit sheet.

**Step 2: Validate linting and types**
Run: `pnpm.cmd --filter @energivia/web lint`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add apps/web/src/app/assinar/ apps/web/src/components/signature/
git commit -m "feat(web): implementar experiencia publica de assinatura eletronica nativa mobile-first com OTP e canvas"
```

---

### Task 8: Full End-to-End Verification & User Testing Guide

**Files:**

- Test execution across all affected modules.
- Update `docs/plans/task.md` with table entries.

**Step 1: Run backend tests**
Run: `pnpm.cmd --filter @energivia/api test`
Expected: All tests pass.

**Step 2: Run web and api linting**
Run: `pnpm.cmd --filter @energivia/web lint`
Run: `pnpm.cmd --filter @energivia/api lint`
Expected: 0 errors.

**Step 3: Commit and Push**

```bash
git add .
git commit -m "chore: validar suite completa de testes e linters do modulo de vendas"
git push origin main
```
