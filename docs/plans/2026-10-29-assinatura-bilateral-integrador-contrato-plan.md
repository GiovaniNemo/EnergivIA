# Assinatura Bilateral de Contratos - Plano de Implementação

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar o fluxo de assinatura bilateral onde o integrador assina o contrato primeiro no painel de vendas (com rubrica salva/canvas via 1-clique), gerando a via intermediária assinada pela empresa para que o cliente receba o link já com a chancela do integrador, culminando em uma folha de auditoria forense completa com ambos os signatários.

**Architecture:**

1. `Prisma Schema`: Novos campos de auditoria da empresa em `SaleDocument` (`companySignedAt`, `companySignerName`, `companySignerEmail`, `companySignerIp`, `companySignerUserAgent`, `companySignatureImage`, `companySignatureHash`) e rubrica do representante legal em `Tenant`.
2. `Backend Services`: `sales.service.ts` e `signature-audit.service.ts` processando o carimbo da empresa, gerando o PDF com a chancela e montando a folha de auditoria bilateral com Signatário 1 (Contratada) e Signatário 2 (Contratante).
3. `Frontend`: `CompanySignModal` e integração na aba de documentos de `/vendas/[id]` com trava preventiva nos botões de envio ao cliente (WhatsApp / Copiar Link) caso a empresa ainda não tenha assinado.

**Tech Stack:** NestJS, Prisma, Next.js 14 (App Router), Tailwind CSS, Lucide React, Vitest.

---

### Task 901: Prisma Schema - Campos de Assinatura da Empresa em SaleDocument e Tenant

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
  **Steps:**

1. Adicionar campos em `Tenant` (`representativeName`, `representativeCpf`, `representativeSignature`).
2. Adicionar campos em `SaleDocument` (`companySignedAt`, `companySignerName`, `companySignerEmail`, `companySignerCpf`, `companySignerIp`, `companySignerUserAgent`, `companySignatureImage`, `companySignatureHash`).
3. Executar `pnpm --filter @energivia/api prisma generate`.
4. Validar tipos gerados.

### Task 902: Backend Templates - Marcador de Assinatura da Empresa em contract-pf.template.ts

**Files:**

- Modify: `apps/api/src/modules/sales/templates/contract-pf.template.ts`
- Modify: `apps/api/src/modules/sales/document-template.service.ts`
  **Steps:**

1. Substituir o bloco fixo de assinatura da CONTRATADA por `{{bloco_assinatura_empresa}}`.
2. Em `document-template.service.ts`, renderizar o bloco pendente (se não assinado) ou o bloco oficial com imagem, data/hora e hash de autenticação corporativa (se assinado).

### Task 903: Backend Services - Lógica de Assinatura da Empresa e Trilha de Auditoria Bilateral

**Files:**

- Modify: `apps/api/src/modules/sales/signature-audit.service.ts`
- Modify: `apps/api/src/modules/sales/sales.service.ts`
- Test: `apps/api/src/modules/sales/__tests__/signature-audit.service.spec.ts`
  **Steps:**

1. Adicionar método `signCompanyDocument(tenantId, saleId, docId, signerMeta, req)`.
2. Atualizar montagem da Folha de Auditoria para incluir Seção do Signatário 1 (Contratada) e Signatário 2 (Contratante).
3. Atualizar e criar testes em `signature-audit.service.spec.ts`.

### Task 904: Backend API - Rota de Assinatura da Empresa e Salvar Rubrica Padrão

**Files:**

- Modify: `apps/api/src/modules/sales/sales.controller.ts`
- Modify: `apps/api/src/modules/sales/dto/sign-company-document.dto.ts`
  **Steps:**

1. Criar DTO para assinatura da empresa.
2. Criar endpoint `POST /sales/:id/documents/:docId/sign-company`.
3. Criar endpoint `GET /sales/company-signature` e `PATCH /sales/company-signature`.

### Task 905: Frontend API e Modal de Assinatura da Empresa (CompanySignModal)

**Files:**

- Modify: `apps/web/src/lib/sales-api.ts`
- Create: `apps/web/src/components/sales/company-sign-modal.tsx`
  **Steps:**

1. Adicionar `signCompanyDocument` e endpoints de assinatura da empresa em `sales-api.ts`.
2. Desenvolver `CompanySignModal` com prévia de rubrica salva, canvas para nova assinatura e confirmação rápida de 1 clique.

### Task 906: Frontend Vendas - Integração na aba de documentos e Trava de Envio

**Files:**

- Modify: `apps/web/src/app/(authenticated)/vendas/[id]/page.tsx`
  **Steps:**

1. Exibir badge "Pendente Assinatura do Integrador" e botão "Assinar como Integrador" na linha de cada contrato.
2. Adicionar trava nos botões "Copiar Link" e "Enviar via WhatsApp" quando o contrato não tiver sido assinado pelo integrador, sugerindo a assinatura prévia imediata.

### Task 907: Frontend Assinatura Pública - Exibição no Preview de /assinar/[token]

**Files:**

- Modify: `apps/web/src/app/assinar/[token]/page.tsx`
  **Steps:**

1. Garantir que a visualização do contrato mostre com perfeição a rubrica da empresa e dados do integrador.

### Task 908: Validação Completa, Testes Automatizados, Build, Commit e Push

**Files:**

- Todas as alterações
  **Steps:**

1. Executar testes automatizados do Vitest (`pnpm --filter @energivia/api test`).
2. Executar build do NestJS e Next.js.
3. Commit e push para `origin/main`.
