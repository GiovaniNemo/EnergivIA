# Add-on Opcional ZapSign (R$ 59,90/mês) no Stripe & Integração de Assinatura Digital Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar o Add-on opcional recorrente do ZapSign (R$ 59,90/mês) nos cards de planos (pré-marcado como Order Bump) e no Stripe Checkout (`line_items` / `optional_items`), permitir ativar/desativar na assinatura atual, remover ícones `Sparkles` das telas de planos e integrar a API do ZapSign nas propostas comerciais.

**Architecture:** Extensão de `Subscription` e `Proposal` no Prisma; suporte no `StripeService` para provisionar o preço de R$ 59,90/mês do ZapSign, enviar em `line_items` (quando marcado) ou `optional_items` (quando desmarcado), gerenciar o item recorrente via `subscriptionItems` e sincronizar webhooks; criação do `ZapSignService` no módulo `proposals` para envio de PDF e webhook `doc_signed`; atualização de `PaymentForm.tsx`, `meus-planos/page.tsx` e `TrialLockOverlay.tsx` (incluindo remoção de `Sparkles`).

**Tech Stack:** NestJS, Prisma, Stripe SDK, Next.js (App Router), React, Tailwind CSS, Vitest.

---

### Task 1: Atualizar Schema Prisma e Gerar Cliente (`Subscription` e `Proposal`)

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261026230000_add_zapsign_addon_and_proposal_fields/migration.sql`

**Step 1: Adicionar campos de ZapSign em `Subscription` e `Proposal` e gerar Prisma Client**

---

### Task 2: Suporte ao Add-on ZapSign (R$ 59,90/mês) no `StripeService` e `StripeController` com Testes Unitários

**Files:**

- Create: `apps/api/src/modules/stripe/__tests__/stripe-zapsign-addon.spec.ts`
- Modify: `apps/api/src/modules/stripe/stripe.service.ts`
- Modify: `apps/api/src/modules/stripe/stripe.controller.ts`

**Step 1: Escrever testes unitários cobrindo `createCheckoutSession` com `includeZapSignAddon: true` (`line_items`), `includeZapSignAddon: false` (`optional_items`), sincronização de webhook e `toggleZapSignAddon`**
**Step 2: Implementar métodos no `StripeService` e endpoints no `StripeController`**
**Step 3: Executar Vitest para validar que todos os testes passam**

---

### Task 3: Criar `ZapSignService` e Endpoints em `ProposalsModule` com Testes Unitários

**Files:**

- Create: `apps/api/src/modules/proposals/zapsign.service.ts`
- Create: `apps/api/src/modules/proposals/__tests__/zapsign.service.spec.ts`
- Modify: `apps/api/src/modules/proposals/proposals.module.ts`
- Modify: `apps/api/src/modules/proposals/proposal-operations.controller.ts`
- Modify: `apps/api/src/modules/proposals/public-proposals.controller.ts`

**Step 1: Escrever testes unitários para `ZapSignService` (verificação de permissão do Add-on, criação de documento no ZapSign e processamento do webhook `doc_signed`)**
**Step 2: Implementar `ZapSignService` e registrar rotas em `ProposalOperationsController` (`POST :id/zapsign`, `GET zapsign/status`) e `PublicProposalsController` (`POST webhooks/zapsign`)**
**Step 3: Executar Vitest para validar que todos os testes passam**

---

### Task 4: Atualizar `PaymentForm.tsx`, `meus-planos/page.tsx` e `TrialLockOverlay.tsx` (Seletor Pré-marcado R$ 59,90/mês + Remoção de `Sparkles`)

**Files:**

- Modify: `apps/web/src/components/PaymentForm.tsx`
- Modify: `apps/web/src/app/(authenticated)/gestao/meus-planos/page.tsx`
- Modify: `apps/web/src/components/TrialLockOverlay.tsx`

**Step 1: Remover todos os ícones `Sparkles` das telas de planos (`meus-planos/page.tsx` e `TrialLockOverlay.tsx`)**
**Step 2: Adicionar o seletor pré-marcado (`includeZapSignAddon = true` por padrão, + R$ 59,90/mês) em `PaymentForm.tsx` com atualização dinâmica do resumo de preço e envio de `includeZapSignAddon` para `/api/proxy/stripe/create-checkout-session`**
**Step 3: Adicionar controle e status do Add-on ZapSign no banner de assinatura ativa em `meus-planos/page.tsx` para permitir ativar/desativar com 1 clique**

---

### Task 5: Integrar Botão/Modal de Assinatura Digital ZapSign na Visualização de Propostas

**Files:**

- Modify: `apps/web/src/app/proposta/[id]/public-proposal-view.tsx` (ou componente de operações da proposta)

**Step 1: Exibir badge/link de assinatura jurídica via ZapSign quando `zapsignSignUrl` estiver presente ou botão para gerar link ZapSign nas propostas**

---

### Task 6: Validação Completa (Testes Unitários, Build, Lint, Commit e Push)

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Rodar Vitest, ESLint e Build**
**Step 2: Atualizar `docs/plans/task.md`, fazer commit e push para `origin/main`**
