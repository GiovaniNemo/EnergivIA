# Formas de Pagamento: Evolução da Seção nos Templates de Proposta Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transformar as opções de pagamento em uma seção oficial e reordenável nos templates de proposta comercial ("Condições & Formas de Pagamento"), desacoplando-a do rodapé da seção de preços e substituindo o bloco simples legado de financiamento.

**Architecture:** Desacopla `ProposalPaymentCards` de `PricingSectionPreview.tsx`. Registra a seção `financing` com rótulo "Condições & Formas de Pagamento" no catálogo de seções (`section-fields.ts` e `AddSectionModal.tsx`), e renderiza o componente de cartões de pagamento completos dentro de `section-registry.tsx` no caso `case "financing":`, respeitando os títulos/textos configuráveis e opções de pagamento do cliente.

**Tech Stack:** Next.js, React 19, Tailwind CSS, TypeScript, Vitest.

---

### Task 1: Desacoplar `ProposalPaymentCards` da Seção de Preços (`pricing-section-preview.tsx`)

**Files:**

- Modify: `apps/web/src/components/proposals/sections/pricing/pricing-section-preview.tsx`

**Step 1: Remover o import e bloco de ProposalPaymentCards**

- Remover `<ProposalPaymentCards ... />` e o import correspondente.
- Manter exclusivamente a renderização dos tiers de preços, comparativos e escopo.

**Step 2: Verificar ausência de erros de tipagem/lint**

- Executar lint no arquivo modificado.

---

### Task 2: Atualizar `ProposalPaymentCards` para Aceitar Título, Descrição e Branding Customizados

**Files:**

- Modify: `apps/web/src/components/proposals/sections/pricing/proposal-payment-cards.tsx`

**Step 1: Adicionar propriedades opcionais**

- Adicionar `sectionTitle?: string`, `sectionDescription?: string`, e `branding?: { primaryColor?: string }`.
- Utilizar como fallback os textos padrão atuais ("CONDIÇÕES & FORMAS DE PAGAMENTO", "Escolha a modalidade que melhor se adapta ao seu planejamento financeiro.").

**Step 2: Executar testes de utilitários e renderização**

- Executar testes existentes para verificar compatibilidade.

---

### Task 3: Atualizar Rótulos e Metadados da Seção no Editor de Templates

**Files:**

- Modify: `apps/web/src/components/proposals/editor/section-fields.ts`
- Modify: `apps/web/src/components/proposals/editor/AddSectionModal.tsx`

**Step 1: Atualizar labels e descrições de `financing`**

- Em `SECTION_TYPE_LABELS`: definir `financing: "Condições & Formas de Pagamento"`.
- Em `SECTION_META`: atualizar descrição para destacar opções à vista com desconto, cartão até 12x/21x e financiamento bancário.

**Step 2: Verificar lint e compilação**

- Rodar lint no editor de templates.

---

### Task 4: Integrar `ProposalPaymentCards` em `section-registry.tsx`

**Files:**

- Modify: `apps/web/src/components/proposals/editor/section-render/section-registry.tsx`

**Step 1: Implementar o caso `case "financing":`**

- Substituir o bloco rudimentar antigo por `<ProposalPaymentCards />`.
- Passar `paymentOptions={options?.paymentOptions}`, valores de investimento e economia a partir de `vars`, `mode={options?.mode}`, e títulos customizados (`f.title`, `f.text`).

**Step 2: Executar testes automatizados**

- Rodar suite de testes vitest.

---

### Task 5: Validação Completa, Testes, Build e Push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar suite de testes do Vitest**

- Rodar `pnpm vitest run`.

**Step 2: Executar verificação de lint**

- Rodar `pnpm --filter @energivia/web lint`.

**Step 3: Compilar build de produção**

- Rodar `pnpm --filter @energivia/web build`.

**Step 4: Commit e push para origin/main**

- Enviar alterações finalizadas para o repositório remoto.
