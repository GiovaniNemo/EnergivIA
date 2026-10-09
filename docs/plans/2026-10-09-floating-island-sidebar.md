# Sidebar Ilha Flutuante (Floating Island Dock) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transformar a barra lateral em uma ilha flutuante desprendida da topbar e das bordas da tela, com bordas arredondadas pronunciadas (`rounded-3xl`), vidro translúcido em todo o perímetro e auto-esconder fluido.

**Architecture:** Atualização dos tokens de vidro e sombra em `globals.css` para suporte 360°, reconfiguração do posicionamento e cantos em `Sidebar.tsx` (`fixed top-20 bottom-3 left-3 rounded-3xl`), calibração do espaçador estrutural do layout para compensar a margem esquerda e polimento dos itens em formato de cápsula (pill).

**Tech Stack:** Next.js 14, Tailwind CSS, Lucide React, Framer Motion / CSS Glassmorphism tokens.

---

### Task 1: Estilização de Vidro 360° e Sombreamento Elevado em globals.css

**Files:**

- Modify: `apps/web/src/app/globals.css:745-775`

**Step 1: Inspecionar regras atuais de `.glass-nav-sidebar` e `.glass-nav-sidebar-floating`**
Verificar que a borda atual é apenas `border-right` e precisa se tornar contínua com chanfros internos simétricos.

**Step 2: Aplicar borda perimetral, sombras de elevação e brilhos internos de vidro**
Substituir a borda unilateral por contorno total translúcido, sombras profundas e chanfros especulares no topo, laterais e base.

**Step 3: Validar que não há quebras no build ou linter de CSS**
Executar validação de tipos ou build do Next.js.

---

### Task 2: Geometria Flutuante, Cantos Arredondados e Espaçador Estrutural em Sidebar.tsx

**Files:**

- Modify: `apps/web/src/components/layout/Sidebar.tsx:145-185, 240-260`

**Step 1: Ajustar o espaçador estrutural da página**
Alterar a largura do espaçador de `w-[4.5rem]` para `w-[5.25rem]` quando recolhido e de `w-[16rem]` para `w-[17rem]` quando fixado para acomodar a folga `left-3`.

**Step 2: Configurar o elemento `<aside>` como Ilha Flutuante Desprendida**
Substituir `fixed top-16 left-0 bottom-0` por `fixed top-20 bottom-3 left-3 rounded-3xl overflow-hidden border border-black/[0.08] dark:border-white/15`.

**Step 3: Ajustar posicionamento do botão de fixar/desafixar**
Posicionar o botão toggle suavemente alinhado à borda do novo dock arredondado com efeito de microinteração.

---

### Task 3: Refinamento dos Itens de Menu (Pills Arredondados) e Seções

**Files:**

- Modify: `apps/web/src/components/layout/SidebarItem.tsx`
- Modify: `apps/web/src/components/layout/SidebarSection.tsx`

**Step 1: Harmonizar paddings laterais e cantos arredondados dos links**
Garantir que os links internos respeitem a curvatura `rounded-3xl` da ilha e mantenham raio `rounded-xl` em formato de cápsula.

---

### Task 4: Validação, Testes Automatizados e Commit

**Files:**

- Test: Vitest unit tests suite (`cmd /c pnpm test:unit --run`)
- Build: Next.js production build (`cmd /c pnpm --filter @energivia/web build`)

**Step 1: Executar suite de testes unitários**
Garantir que os 174 testes continuam passando sem regressão.

**Step 2: Executar build de produção do Next.js**
Garantir que todas as 81 rotas compilam sem erros de TypeScript ou CSS.

**Step 3: Commit e Push para origin/main**
Enviar as alterações com mensagem atômica seguindo as regras do repositório.
