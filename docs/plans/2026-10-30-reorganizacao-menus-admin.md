# Reorganização Semântica dos Menus Admin, Plataforma e Gestão Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Reestruturar semanticamente a ordenação e rótulos dos itens de menu em Admin, Plataforma e Gestão para eliminar ruído cognitivo e garantir fluidez profissional de navegação.

**Architecture:** Modificação centralizada em `apps/web/src/config/menu.config.ts`, reordenando `MENU_ITEMS` de acordo com a semântica executiva aprovada, mantendo rotas e RBAC intactos, e integrando testes unitários automatizados para garantir que a ordem e as seções permaneçam consistentes.

**Tech Stack:** Next.js 14, TypeScript, Vitest, Lucide React.

---

### Task 1: Testes Unitários de Regressão e Ordem do Menu

**Files:**

- Create: `apps/web/src/config/menu.config.spec.ts`

**Step 1: Escrever teste unitário esperando a nova ordem e seções**
Verificar:

- Seção GESTÃO: Organização, Equipe, Perfil do Integrador, Templates de Proposta, Modelos de Contratos, Meus Planos, Configurações, Central de Ajuda.
- Seção ADMIN: Métricas, Integradores & Ativação, Acessos Especiais, Comercial, Gestão de Planos, Templates Globais, Fornecedores, Marcas, Produtos Globais.
- Seção PLATAFORMA: Financiadores, Fila de Financiamentos, Comissões, Sistema.
- Rótulos e rotas associadas.

**Step 2: Executar teste para verificar falha (RED)**
Run: `pnpm test:unit apps/web/src/config/menu.config.spec.ts`
Expected: FAIL com discrepância de ordem em ADMIN e PLATAFORMA.

---

### Task 2: Implementar Reorganização em `menu.config.ts`

**Files:**

- Modify: `apps/web/src/config/menu.config.ts`

**Step 1: Reordenar itens de `MENU_ITEMS`**

- Ajustar seção `management` para colocar `Equipe` imediatamente após `Organização`.
- Transferir `Métricas` e `Gestão de Planos` para a seção `admin` no topo executivo.
- Posicionar `Integradores & Ativação`, `Acessos Especiais` e `Comercial` após `Métricas`.
- Renomear rótulo de "Modelos de template" para "Templates Globais".
- Posicionar bloco de catálogo fotovoltaico: `Templates Globais`, `Fornecedores`, `Marcas`, `Produtos Globais`.
- Ajustar seção `platform` com foco financeiro e infra: `Financiadores`, `Fila de Financiamentos`, `Comissões` e `Sistema`.

**Step 2: Executar teste unitário para verificar aprovação (GREEN)**
Run: `pnpm test:unit apps/web/src/config/menu.config.spec.ts`
Expected: PASS com 100% de sucesso.

---

### Task 3: Validação Completa de Lint e Build

**Files:**

- N/A

**Step 1: Executar lint no workspace web**
Run: `pnpm --filter @energivia/web lint`
Expected: 0 erros.

**Step 2: Executar build de produção Next.js**
Run: `pnpm --filter @energivia/web build`
Expected: Compilação bem-sucedida de todas as rotas.

---

### Task 4: Sincronização, Commit e Push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Atualizar rastreador task.md**
Marcar todas as tarefas como concluídas.

**Step 2: Commit e push para origin/main**
Run:
`git add apps/web/src/config/menu.config.ts apps/web/src/config/menu.config.spec.ts docs/plans/2026-10-30-reorganizacao-menus-admin.md docs/plans/task.md`
`git commit -m "feat(navigation): reorganizacao semantica dos menus admin, plataforma e gestao"`
`git push origin main`
