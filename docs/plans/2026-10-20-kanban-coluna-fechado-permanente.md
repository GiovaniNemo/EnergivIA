# Coluna Fechado Permanente no Kanban Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Tornar a coluna "Fechado" permanentemente visível no Kanban de Negociações, removendo o estado minimizado de 52px e unificando o cabeçalho com valor total em R$ e barra de progresso.

**Architecture:** Atualização da grade do Kanban em `KanbanBoard.tsx` para `grid-cols-5` fixo, remoção do modo colapsado em `ClosedColumnWithRows.tsx`, e padronização do `renderColumnHeader` e remoção do estado `fechadoExpanded` em `pipeline/page.tsx`.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, @dnd-kit/core.

---

### Task 1: Remover modo colapsado em ClosedColumnWithRows.tsx

**Files:**

- Modify: `apps/web/src/app/(authenticated)/pipeline/ClosedColumnWithRows.tsx`

**Step 1: Inspecionar e atualizar props e renderização**

- Remover ramo `if (columnCollapsed)` e props desnecessárias (`columnCollapsed`, `onExpand`).
- Manter o suporte às sub-raias e drag-and-drop.

**Step 2: Verificar integridade de tipos**

- Garantir que `ClosedColumnWithRows` compile sem erros de TypeScript.

---

### Task 2: Fixar grade de 5 colunas em KanbanBoard.tsx

**Files:**

- Modify: `apps/web/src/app/(authenticated)/pipeline/KanbanBoard.tsx`

**Step 1: Ajustar layout de colunas**

- Substituir a classe condicional `closedCollapsed ? "grid-cols-[1fr_1fr_1fr_1fr_52px]" : "grid-cols-5"` por `grid-cols-5`.
- Tornar opcionais / remover props `closedCollapsed` e `onExpandClosed` da interface `KanbanBoardProps`.

**Step 2: Verificar tipos e build local**

- Verificar que `KanbanBoard.tsx` compila sem erros.

---

### Task 3: Padronizar cabeçalho da coluna Fechado e remover estado fechadoExpanded em page.tsx

**Files:**

- Modify: `apps/web/src/app/(authenticated)/pipeline/page.tsx`

**Step 1: Atualizar renderColumnHeader e estados**

- Remover `fechadoExpanded` e `setFechadoExpanded`.
- Em `renderColumnHeader`: para a etapa `fechado`, renderizar a mesma estrutura que as demais etapas, contendo:
  - Título ("Fechado")
  - Contador de itens
  - Total acumulado formatado em moeda (`formatCurrency(stageTotal)`)
  - Barra de progresso com `STAGE_BAR_WIDTH[stage]` (100%) e cor `STAGE_BAR_COLOR[stage]` (ou cor de fechamento refinada)
  - Remover botão `‹ Recolher`.
- Remover passagem de `closedCollapsed` e `onExpandClosed` para `<KanbanBoard>`.

---

### Task 4: Executar validação automatizada, testes e compilação do frontend

**Files:**

- Verify: `apps/web`

**Step 1: Rodar ESLint e TypeScript check**

- Executar lint no web.

**Step 2: Rodar testes do frontend**

- Executar `npm run test` ou testes relevantes de pipeline.

---

### Task 5: Commit e push para o repositório remoto

**Step 1: Git add, commit e push**

- Commitar as modificações com mensagem semântica e enviar para origin/main.
