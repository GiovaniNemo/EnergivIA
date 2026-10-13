# Configuração e Cálculo Automático de Taxas de Maquininha de Cartão de Crédito Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar cálculo automático de parcelas de cartão de crédito (% total gross-up, % ao mês Price e manual R$) com persistência das taxas padrão da empresa na proposta e no Perfil do Integrador.

**Architecture:** Adicionar tipagens em `@energivia/shared-types`, utilitários de cálculo financeiro com cobertura TDD em `proposal-payment-utils.ts`, suporte a `cardPaymentDefaults` em `Tenant.settings` via API de organizações, e componentes de UI no card de pagamento da proposta e na página Perfil do Integrador.

**Tech Stack:** Next.js 14, React, Tailwind CSS, TypeScript, Vitest, NestJS, Prisma.

---

### Task 1: Tipagem em Shared Types (`@energivia/shared-types`)

**Files:**

- Modify: `packages/shared-types/src/proposal-payment-options.ts`
- Modify: `packages/shared-types/src/organization.ts` (ou similar)

**Step 1:** Adicionar tipo `CardRateMode` e campos opcionais em `ProposalPaymentCardOption` e `OrganizationCardPaymentDefaults`.
**Step 2:** Compilar shared-types e verificar tipos.
**Step 3:** Commit.

---

### Task 2: Utilitários Financeiros e Testes Unitários TDD

**Files:**

- Modify: `apps/web/src/lib/proposal-payment-utils.ts`
- Modify: `apps/web/src/lib/__tests__/proposal-payment-utils.spec.ts`

**Step 1:** Escrever testes unitários para:

- `calculateCardInstallments` com modo `total_pct` (gross-up).
- `calculateCardInstallments` com modo `monthly_pct` (Price).
- `calculateCardInstallments` com modo `manual`.
- Normalização retrocompatível em `normalizePaymentOptions`.
  **Step 2:** Implementar as funções em `proposal-payment-utils.ts`.
  **Step 3:** Executar Vitest e garantir aprovação de 100% dos testes.
  **Step 4:** Commit.

---

### Task 3: Suporte a `cardPaymentDefaults` no Backend (`apps/api`)

**Files:**

- Modify: `apps/api/src/modules/organizations/dto/update-organization.dto.ts`
- Modify: `apps/api/src/modules/organizations/organizations.service.ts`

**Step 1:** Adicionar `cardPaymentDefaults` no DTO de atualização da organização.
**Step 2:** Persistir e retornar `cardPaymentDefaults` dentro de `settings` do Tenant.
**Step 3:** Testar endpoints e validar build.
**Step 4:** Commit.

---

### Task 4: UI no Card de Proposta (`ProposalPaymentOptionsCard.tsx`)

**Files:**

- Modify: `apps/web/src/components/proposals/proposal-payment-options-card.tsx`

**Step 1:** Adicionar botões segmentados `% Total`, `% a.m.`, `R$ Manual`.
**Step 2:** Integrar recálculo em tempo real ao alterar taxa ou número de parcelas.
**Step 3:** Adicionar checkbox `[x] Salvar como padrão da empresa para novas propostas` e disparar atualização de organização quando marcado.
**Step 4:** Commit.

---

### Task 5: UI no Perfil do Integrador (`perfil-integrador/page.tsx`)

**Files:**

- Modify: `apps/web/src/app/(authenticated)/gestao/perfil-integrador/page.tsx`

**Step 1:** Adicionar card "Taxas Padrão de Maquininha / Cartão de Crédito".
**Step 2:** Permitir configurar parcelamento padrão, modo de taxa, valor padrão e nota da maquininha.
**Step 3:** Persistir via `updateOrganization`.
**Step 4:** Commit.

---

### Task 6: Validação Completa, Testes e Sincronização Remota

**Files:**

- Run Vitest suite (`pnpm test:unit`).
- Run ESLint (`pnpm --filter @energivia/web lint`).
- Update `docs/plans/task.md`.
- Git commit e push para `origin main`.
