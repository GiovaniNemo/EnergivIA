# Sidebar & Topbar com Glassmorphism Translúcido e Auto-Collapse Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar efeito de vidro translúcido de alta fidelidade (Glassmorphism) na Sidebar e Topbar, e sistema de auto-collapse com expansão flutuante suave por hover (e grace period de 250ms), liberando a largura da tela para os conteúdos do sistema.

**Architecture:** A Topbar e a Sidebar adotam classes utilitárias de vidro fumê fosco com `backdrop-filter: blur(24px)` e chanfro especular. A Sidebar opera com slot fixo de layout reduzido (`4.5rem` / 72px) para expandir as páginas, enquanto o painel visual se projeta como overlay flutuante de vidro translúcido (`16rem` / 256px) sob demanda ao passar o cursor do mouse, com controle de _grace period_ e botão de fixação permanente (_pin toggle_).

**Tech Stack:** Next.js (App Router), React 18, Tailwind CSS, Lucide React, TypeScript, Vitest.

---

### Task 1: Tokens e Estilos CSS de Glassmorphism para Navegação (`globals.css`)

**Files:**

- Modify: `apps/web/src/app/globals.css`

**Step 1: Implementar classes de vidro translúcido para barras de navegação**
Adicionar classes utilitárias de navegação translúcida:

- `.glass-nav-topbar`: vidro fumê translúcido com `backdrop-filter: blur(24px) saturate(190%)`, borda sutil `border-white/[0.08]` e chanfro `inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`.
- `.glass-nav-sidebar`: vidro fosco translúcido `rgba(18, 24, 27, 0.75)` com desfoque de 28px, borda especular e sombra difusa `0 20px 50px -10px rgba(0, 0, 0, 0.75)`.
- Suporte a tema claro com `rgba(255, 255, 255, 0.8)` e saturação óptica.

**Step 2: Validar sintaxe CSS**
Executar validação rápida de CSS / lint.

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: adicionar utilitarios de glassmorphism translúcido para sidebar e topbar"
```

---

### Task 2: Suporte a Hover, Grace Period e Pin Toggle no `SidebarProvider` (`sidebar-inset.tsx`)

**Files:**

- Modify: `apps/web/src/components/layout/sidebar-inset.tsx`

**Step 1: Atualizar contexto para expor estado de hover, pin e grace period**
Expandir `useSidebar` com:

- `isPinned: boolean`: define se a sidebar está travada aberta (16rem no layout) ou em auto-collapse (4.5rem).
- `isHovered: boolean`: define se o mouse está sobre a sidebar flutuante.
- `onHoverStart: () => void`: ativa hover e cancela timeout pendente.
- `onHoverEnd: () => void`: dispara grace period de 250ms antes de fechar.
- `togglePinned: () => void`: alterna entre fixado e auto-esconder.

**Step 2: Commit**

```bash
git add apps/web/src/components/layout/sidebar-inset.tsx
git commit -m "feat(layout): adicionar controle de hover, grace period e pin no SidebarProvider"
```

---

### Task 3: Atualizar Topbar com Acabamento Glassmorphism e Sincronização (`topbar.tsx`)

**Files:**

- Modify: `apps/web/src/components/layout/topbar.tsx`

**Step 1: Aplicar classe `.glass-nav-topbar` e acabamento refinado**

- Substituir estilo sólido pela nova classe de vidro translúcido de alta densidade.
- Ajustar container da BrandLogo para alinhar perfeitamente com o mini-rail de 4.5rem em repouso.
- Adicionar transições suaves e acabamento translúcido nos botões de pesquisa e ações.

**Step 2: Commit**

```bash
git add apps/web/src/components/layout/topbar.tsx
git commit -m "feat(ui): aplicar glassmorphism translúcido na topbar com alinhamento ao mini-rail"
```

---

### Task 4: Atualizar Sidebar com Mini-Rail, Hover Flutuante e Glassmorphism (`Sidebar.tsx`, `SidebarItem.tsx`, `SidebarSection.tsx`)

**Files:**

- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/SidebarItem.tsx`
- Modify: `apps/web/src/components/layout/SidebarSection.tsx`

**Step 1: Atualizar `Sidebar.tsx` com lógica de slot fixo + overlay flutuante**

- Em desktop (não mobile):
  - Slot estrutural na página fica fixo em `4.5rem` (quando em auto-collapse), permitindo que o conteúdo da tela se expanda.
  - Painel visual flutuante com `.glass-nav-sidebar` projeta-se sobre a página para `16rem` com `z-40` ao passar o mouse.
  - Adicionar listeners `onMouseEnter={onHoverStart}` e `onMouseLeave={onHoverEnd}`.
  - Botão chevron no topo para alternar entre fixar aberto e modo auto-collapse por hover.

**Step 2: Atualizar `SidebarItem.tsx` com visual de vidro e transição de labels**

- Itens de menu com efeito translúcido no hover.
- Estado ativo com vidro esmeralda sutil (`bg-emerald-500/15 text-emerald-300 border-l-emerald-400`).
- Textos e badges aparecem suavemente ao expandir.

**Step 3: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx apps/web/src/components/layout/SidebarItem.tsx apps/web/src/components/layout/SidebarSection.tsx
git commit -m "feat(ui): implementar sidebar de vidro translúcido com mini-rail e hover overlay"
```

---

### Task 5: Ajustar `AuthenticatedShell.tsx` para Maximização da Área de Tela

**Files:**

- Modify: `apps/web/src/components/layout/authenticated-shell.tsx`

**Step 1: Expandir largura útil do container principal**

- Atualizar container `max-w-[1400px]` para `max-w-[1600px]` (ou fluida), permitindo que telas como Painel, Pipeline de Negociações e Propostas respirem com os 184px extras liberados pela sidebar recolhida.

**Step 2: Commit**

```bash
git add apps/web/src/components/layout/authenticated-shell.tsx
git commit -m "refactor(layout): ampliar largura horizontal máxima no AuthenticatedShell"
```

---

### Task 6: Validação com Testes Automatizados e Build de Produção

**Files:**

- Execute: `pnpm --filter @energivia/web test:run`
- Execute: `pnpm --filter @energivia/web build`

**Step 1: Executar suite de testes do Vitest**
Garantir que 100% dos testes passem sem regressão.

**Step 2: Validar compilação do Next.js**
Garantir que todas as páginas e rotas compilem sem erros de tipagem.

---

### Task 7: Validação Visual com Browser Subagent, Commit Final e Push

**Files:**

- Execute: Browser Subagent em ambiente local
- Git: Commit e Push para `origin/main`

**Step 1: Testar no navegador com gravação**

- Navegar para a aplicação autenticada.
- Simular hover sobre a sidebar e verificar expansão fluida sem trancos.
- Verificar fechamento após saída do mouse com tolerância de 250ms.
- Verificar aparência de vidro translúcido da Topbar e Sidebar.

**Step 2: Enviar alterações ao repositório remoto**

```bash
git push origin main
```
