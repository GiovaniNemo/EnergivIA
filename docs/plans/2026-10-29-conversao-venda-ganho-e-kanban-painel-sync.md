# Conversão para Venda em Ganho e Kanban Arrastável no Painel com Sincronização Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Mover o lead/deal automaticamente para o estágio "WON" (Ganho) ao converter uma proposta em venda (inclusive propostas aceitas offline/PDF) e tornar os cards Kanban do Painel arrastáveis com sincronização bidirecional em tempo real com a tela de Negociações.

**Architecture:**

1. No backend, `SalesService.convertToSale` avança a proposta para `ACCEPTED` e a negociação vinculada (`deal`) para `WON`, garantindo criação/atualização de histórico e reserva de estoque.
2. No frontend, cria-se o barramento `pipeline-sync.ts` unindo `BroadcastChannel` e `CustomEvents`.
3. No Painel (`/painel`), as colunas do funil passam a utilizar `@dnd-kit/core` e `@dnd-kit/sortable` para arrasto interativo dos cards de negócios com atualização otimista e `patchDeal`.
4. Em `/pipeline`, escuta-se o barramento para atualização reativa instantânea ao mover cards no Painel ou converter vendas.

**Tech Stack:** Next.js 14 (App Router), React 18, @dnd-kit/core, @dnd-kit/sortable, NestJS, Prisma, PostgreSQL.

---

### Task 1: Backend - Atualização de Deal para WON e registro de aceite em `SalesService.convertToSale`

**Files:**

- Modify: `apps/api/src/modules/sales/sales.service.ts`
- Test: `apps/api/src/modules/sales/__tests__/sales.service.spec.ts`

**Step 1: Escrever teste unitário para garantir que `deal.stage` torna-se `WON`**

- Verificar que ao invocar `convertToSale`, `deal.update` é chamado com `stage: "WON"`, `temperature: "HOT"` e `proposal.update` com `status: "ACCEPTED"`.

**Step 2: Executar teste para verificar falha/comportamento**

- Comando: `pnpm.cmd test:unit sales`

**Step 3: Implementar atualização de Deal e registro de atividade em `sales.service.ts`**

- Adicionar transição para `stage: "WON"` na negociação vinculada e log de atividade.

**Step 4: Executar testes unitários**

- Comando: `pnpm.cmd test:unit sales`

---

### Task 2: Frontend - Barramento de Sincronização Bidirecional (`pipeline-sync.ts`)

**Files:**

- Create: `apps/web/src/lib/pipeline-sync.ts`

**Step 1: Implementar `pipeline-sync.ts`**

- Criar `notifyPipelineUpdated({ dealId, stage })` disparando `CustomEvent` e `BroadcastChannel`.
- Criar hook `usePipelineSync(onSync)` para escutar os eventos e revalidar dados.

---

### Task 3: Frontend - Kanban Arrastável no Painel (`DashboardKanban.tsx` e `dashboard/page.tsx`)

**Files:**

- Create: `apps/web/src/components/dashboard/DashboardKanban.tsx`
- Modify: `apps/web/src/app/(authenticated)/dashboard/page.tsx`

**Step 1: Criar `DashboardKanban.tsx` com `@dnd-kit`**

- Suporte a arrasto entre as colunas Novo, Contato, Proposta, Negociação e Fechado.
- Atualização otimista local imediata.
- Chamada assíncrona a `patchDeal`.
- Disparo de `notifyPipelineUpdated`.

**Step 2: Integrar `DashboardKanban` em `dashboard/page.tsx`**

- Substituir a lista estática pelo novo componente interativo.
- Conectar com `usePipelineSync` para invalidar `dashboard-leads` e `dashboard-stats` quando houver mudanças externas.

---

### Task 4: Frontend - Integração na tela de Negociações (`pipeline/page.tsx`) e Conversão em Venda

**Files:**

- Modify: `apps/web/src/app/(authenticated)/pipeline/page.tsx`
- Modify: `apps/web/src/components/proposals/proposal-internal-view.tsx`
- Modify: `apps/web/src/app/(authenticated)/proposals/page.tsx`

**Step 1: Conectar `notifyPipelineUpdated` e `usePipelineSync` em `pipeline/page.tsx`**

- Escutar atualizações do Painel chamando `loadDeals()`.
- Emitir `notifyPipelineUpdated` ao concluir `commitDnDDrop`.

**Step 2: Emitir `notifyPipelineUpdated` após `convertProposalToSale`**

- Garantir que a conversão reflita no Kanban imediatamente.

---

### Task 5: Validação Completa, Testes Automatizados, Build e Push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar testes unitários de vendas e frontend**

- `pnpm.cmd test:unit sales`
- `pnpm.cmd --filter @energivia/web lint`

**Step 2: Executar build da API e Web**

- `pnpm.cmd --filter @energivia/api build`
- `pnpm.cmd --filter @energivia/web build`

**Step 3: Commit e push das alterações**

- `git commit` e `git push origin main`
