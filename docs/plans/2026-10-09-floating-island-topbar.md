# Topbar Ilha Flutuante (Floating Header Island) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transformar a barra de navegação superior (Topbar) em uma ilha flutuante desprendida do topo e bordas da tela (`top-3 left-3 right-3`), com cantos arredondados (`rounded-2xl` / `rounded-3xl`), vidro translúcido em 360° e espaçamento perfeitamente alinhado com a Sidebar.

**Architecture:** Atualização dos tokens de `.glass-nav-topbar` em `globals.css` para contorno perimetral e sombras elevadas, reposicionamento da `<header>` em `topbar.tsx`, calibração do topo da Sidebar em `Sidebar.tsx` para `top-[5.5rem]` (respiro de 12px) e ajuste de padding superior em `authenticated-shell.tsx` (`pt-24 sm:pt-28 md:pt-28`).

**Tech Stack:** Next.js 14, Tailwind CSS, Lucide React, Glassmorphism CSS design tokens.

---

### Task 1: Estilização de Vidro 360° e Sombreamento Elevado em globals.css

**Files:**

- Modify: `apps/web/src/app/globals.css:720-745`

**Step 1: Inspecionar e atualizar .glass-nav-topbar e .dark .glass-nav-topbar**
Substituir a borda inferior (`border-bottom`) por borda perimetral 360° (`border: 1px solid ...`), adicionar sombras elevadas de cápsula suspensa e chanfros especulares no perímetro completo.

---

### Task 2: Geometria Flutuante e Cantos Arredondados em topbar.tsx

**Files:**

- Modify: `apps/web/src/components/layout/topbar.tsx:174`

**Step 1: Aplicar posicionamento desprendido na tag <header>**
Substituir `fixed top-0 left-0 right-0` por `fixed top-3 left-3 right-3 rounded-2xl md:rounded-3xl overflow-hidden`.

---

### Task 3: Coordenação de Espaçamento com Sidebar e Conteúdo da Página

**Files:**

- Modify: `apps/web/src/components/layout/Sidebar.tsx:163`
- Modify: `apps/web/src/components/layout/authenticated-shell.tsx:67`

**Step 1: Ajustar o topo da Sidebar em Sidebar.tsx**
Alterar de `top-20` (80px) para `top-[5.5rem]` (88px) para criar uma folga uniforme de 12px em relação ao fundo da Topbar suspensa em 76px.

**Step 2: Ajustar o padding superior do <main> em authenticated-shell.tsx**
Atualizar para `pt-24 sm:pt-28 md:pt-28` para garantir rolagem suave e desobstruída sob as duas ilhas de vidro.

---

### Task 4: Validação, Testes Automatizados e Commit

**Files:**

- Test: Vitest unit tests suite (`cmd /c pnpm test:unit --run`)
- Build: Next.js production build (`cmd /c pnpm --filter @energivia/web build`)

**Step 1: Executar suite de testes unitários**
Verificar que os 174 testes continuam passando.

**Step 2: Executar build de produção do Next.js**
Verificar que as 81 rotas compilam sem erros.

**Step 3: Commit e Push para origin/main**
Enviar as alterações com mensagem atômica seguindo as regras do repositório.
