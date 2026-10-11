# Formas de Pagamento na Proposta Solar (À Vista, Cartão e Financiamento) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Permitir que o integrador configure formas de pagamento (À Vista, Cartão de Crédito em até 12x/21x com valor real de parcela e Financiamento com prazos de 24x a 120x) no cockpit da proposta, com cards modernos lado a lado na visualização pública da proposta e no PDF.

**Architecture:** Estrutura tipada `ProposalPaymentOptions` persistida em `Proposal.renderedData.paymentOptions` via endpoint `PATCH /proposals/:id/payment-options` com rotação de `publicToken`. Card dedicado de alta fidelidade no cockpit com switches e inputs para valores reais calculados pelo integrador. Componente `ProposalPaymentCards` renderizado em grid de 1 a 3 colunas responsivo e otimizado para o PDF A4 da Puppeteer.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React, NestJS, Prisma, Vitest, Puppeteer.

---

### Task 1: Modelagem de Dados e Utilitários de Formas de Pagamento

**Files:**

- Create: `packages/shared-types/src/proposal-payment-options.ts`
- Modify: `packages/shared-types/src/index.ts`
- Create: `apps/web/src/lib/proposal-payment-utils.ts`
- Test: `apps/web/src/lib/__tests__/proposal-payment-utils.spec.ts`

**Step 1: Write the failing test**
Criar teste unitário para validar fallback de payment options, normalização de valores e cálculo de totais.

**Step 2: Run test to verify it fails**
Executar Vitest no web app e verificar que falha por ausência do módulo.

**Step 3: Implement minimal code**
Criar a tipagem em `@energivia/shared-types` e os utilitários de normalização `createDefaultPaymentOptions`, `normalizePaymentOptions`.

**Step 4: Run test to verify it passes**
Executar Vitest e garantir aprovação.

**Step 5: Commit**
`git commit -m "feat: adicionar tipos e utilitarios de formas de pagamento"`

---

### Task 2: Endpoint e Serviço Backend para Atualização de Payment Options

**Files:**

- Create: `apps/api/src/modules/proposals/dto/update-proposal-payment-options.dto.ts`
- Modify: `apps/api/src/modules/proposals/proposal-operations.controller.ts`
- Modify: `apps/api/src/modules/proposals/proposals.service.ts`
- Test: `apps/api/src/modules/proposals/__tests__/proposal-payment-options.spec.ts`

**Step 1: Write the failing test**
Escrever teste em `proposal-payment-options.spec.ts` cobrindo o método `updatePaymentOptions` que atualiza `renderedData.paymentOptions`, regenera `publicToken` e registra log.

**Step 2: Run test to verify it fails**
Executar `pnpm --filter @energivia/api test` e verificar que falha.

**Step 3: Implement minimal code**
Implementar o DTO com validação de class-validator, adicionar o método `updatePaymentOptions` no `proposals.service.ts` e a rota `PATCH :id/payment-options` no `proposal-operations.controller.ts`.

**Step 4: Run test to verify it passes**
Executar `pnpm --filter @energivia/api test` e garantir 100% de aprovação.

**Step 5: Commit**
`git commit -m "feat(api): adicionar endpoint para salvar formas de pagamento da proposta"`

---

### Task 3: Cliente API no Frontend Web (`leads-api.ts`)

**Files:**

- Modify: `apps/web/src/lib/leads-api.ts`

**Step 1: Write function signature and call**
Adicionar a função `updateProposalPaymentOptions(organizationId, proposalId, paymentOptions)` e atualizar a interface `ProposalDetail` para tipar `renderedData`.

**Step 2: Typecheck & lint validation**
Garantir compilação limpa do TypeScript no web app.

**Step 3: Commit**
`git commit -m "feat(web): adicionar cliente api para formas de pagamento"`

---

### Task 4: Card de Configuração no Cockpit da Proposta (`ProposalPaymentOptionsCard`)

**Files:**

- Create: `apps/web/src/components/proposals/proposal-payment-options-card.tsx`
- Modify: `apps/web/src/components/proposals/proposal-internal-view.tsx`

**Step 1: Create Component**
Criar `ProposalPaymentOptionsCard` com:

- Header com ícone `WalletCards` e descrição clara.
- 3 abas/blocos com switch liga/desliga:
  - **À Vista:** Desconto (% ou R$), valor líquido, checkboxes para Pix, TED, Boleto.
  - **Cartão de Crédito:** Seletor de parcelas (1x até 21x), input para valor da parcela real (R$), cálculo do total parcelado e campo de observação.
  - **Financiamento Solar:** Seletor de parcelas (24x até 120x), input para parcela do banco (R$), entrada opcional, carência e comparativo em tempo real com a economia estimada.
- Ações: botão "Salvar formas de pagamento" com estado de loading e feedback toast.

**Step 2: Integrar em `proposal-internal-view.tsx`**
Posicionar o card logo após os blocos de negócio/desconto na tela de gestão interna.

**Step 3: Validate in Browser / Types**
Verificar ausência de erros de build e tipagem.

**Step 4: Commit**
`git commit -m "feat(web): implementar card de gestao de formas de pagamento no cockpit"`

---

### Task 5: Componente de Exibição na Proposta do Cliente e PDF (`ProposalPaymentCards`)

**Files:**

- Create: `apps/web/src/components/proposals/sections/pricing/proposal-payment-cards.tsx`
- Modify: `apps/web/src/components/proposals/sections/pricing/pricing-section-preview.tsx`
- Modify: `apps/web/src/lib/public-proposal-variables.ts`

**Step 1: Create Component**
Criar `ProposalPaymentCards` renderizando:

- Grid responsivo de 1 a 3 colunas (1 col no mobile, 2 ou 3 colunas no desktop e PDF A4).
- Cards sóbrios, sem emojis de WhatsApp, com ícones vetoriais Lucide.
- Card À Vista (destaque no valor líquido e meios aceitos).
- Card Cartão (parcelas de 1x a 21x, valor da parcela e total a prazo).
- Card Financiamento (parcela bancária e contraste com a economia mensal).

**Step 2: Integrar na `PricingSectionPreview`**
Acoplar os cards logo abaixo do valor comercial na visualização pública.

**Step 3: Validate in Browser / Tests**
Executar testes unitários do frontend.

**Step 4: Commit**
`git commit -m "feat(web): exibir cards de formas de pagamento na proposta publica"`

---

### Task 6: Adaptação de Impressão e PDF Puppeteer

**Files:**

- Modify: `apps/web/src/lib/proposal-puppeteer-html.ts`
- Modify: `apps/web/src/app/api/proposals/[id]/pdf/route.ts`

**Step 1: Check Print Styles**
Garantir que a classe do grid em modo PDF (`mode === "pdf"`) utilize largura estável sem sobreposição e com quebra de página protegida (`break-inside-avoid`).

**Step 2: Commit**
`git commit -m "feat(pdf): ajustar estilizacao para impressao a4 das formas de pagamento"`

---

### Task 7: Validação Geral com Testes, Lint, Build e Push

**Files:**

- Full test suites, ESLint, TypeScript check e Next.js build.

**Step 1: Run vitest**
Rodar vitest nos módulos alterados.

**Step 2: Run eslint & typecheck**
`pnpm --filter @energivia/web lint` e `pnpm --filter @energivia/api lint`.

**Step 3: Run production build**
`pnpm --filter @energivia/web build`.

**Step 4: Commit and Push**
Submeter as alterações consolidadas para `origin/main`.
