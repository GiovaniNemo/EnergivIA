# Plano de Implementação: Suporte Prioritário no Card do Plano Plus

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Adicionar uma linha divisória horizontal e um bloco visual profissional destacando o acesso a Suporte Prioritário Exclusivo no card do Plano Plus no painel de assinaturas.

**Architecture:** Inserir um bloco de destaque executivo responsivo entre a lista de recursos e os botões de ação em `meus-planos/page.tsx` e `TrialLockOverlay.tsx`, com tipografia refinada, ícone Lucide `Headphones`, cores temáticas adaptativas para Light/Dark mode e total aderência às diretrizes do design system sem efeitos neon.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Lucide React, TypeScript.

---

### Task 1: Adicionar Divisória e Bloco de Suporte Prioritário em `meus-planos/page.tsx`

**Files:**

- Modify: `apps/web/src/app/(authenticated)/gestao/meus-planos/page.tsx:25-30`
- Modify: `apps/web/src/app/(authenticated)/gestao/meus-planos/page.tsx:690-710`

**Step 1: Importar ícone Headphones**
Importar `Headphones` de `lucide-react`.

**Step 2: Renderizar divisória horizontal e bloco de destaque no Plano Plus**
Adicionar condicional `isPlus` entre a lista de features e o botão de ação inferior, com linha horizontal divisória e box refinado de Suporte Prioritário com cores harmônicas de acordo com o plano atual / upgrade.

---

### Task 2: Atualizar Card do Plano Plus no `TrialLockOverlay.tsx`

**Files:**

- Modify: `apps/web/src/components/TrialLockOverlay.tsx:6-10`
- Modify: `apps/web/src/components/TrialLockOverlay.tsx:315-330`

**Step 1: Importar ícone Headphones em TrialLockOverlay**
Adicionar `Headphones` nas importações de `lucide-react`.

**Step 2: Adicionar linha horizontal e badge de Suporte Prioritário no card do Plus**
Inserir divisor horizontal e destaque compacto de atendimento prioritário antes do botão de pagamento.

---

### Task 3: Validação Automatizada e Build

**Files:**

- Test: executar `npm test` ou `vitest run` nos testes relevantes
- Lint: verificar integridade TypeScript (`tsc --noEmit`)

**Step 1: Executar testes de tipos e regressão**
Garantir que a compilação passe sem erros de sintaxe ou lint.

---

### Task 4: Commit e Push das Alterações

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Atualizar o live tracker task.md**
Marcar as tarefas como concluídas com as notas técnicas.

**Step 2: Realizar commit e git push**
Enviar alterações para o repositório remoto conforme a regra obrigatória.
