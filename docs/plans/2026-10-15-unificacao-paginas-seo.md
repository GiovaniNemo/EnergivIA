# Unificação Visual das Páginas de SEO e Institucionais Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Unificar o design de todas as páginas públicas de SEO (/proposta-energia-solar, /simulacao-energia-solar, /software-integrador-solar, /crm-energia-solar) e institucionais (/privacidade, /termos-de-uso) com o padrão dark obsidian (#02040a) e glassmorphism da landing page oficial.

**Architecture:** Extrair e padronizar componentes de cabeçalho (`LandingSubpageHeader`) e rodapé (`LandingFooter`) reutilizáveis compartilhados com a landing page; refatorar integralmente o componente `SeoIntentPage` com a classe `landing-page dark`, tokens `.glass-card`, `.glass-panel`, `.glass-pill` e iluminação ambiente esmeralda/teal; e atualizar as páginas `/privacidade` e `/termos-de-uso` para a mesma identidade visual sem quebra de experiência.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Lucide React, Glassmorphism Tokens CSS.

---

### Task 1: Extrair e criar `LandingFooter` compartilhado e integrá-lo na Landing Page (`page.tsx`)

**Files:**

- Create: `apps/web/src/components/landing/landing-footer.tsx`
- Modify: `apps/web/src/app/page.tsx:327-385`

**Step 1: Criar o componente `LandingFooter`**
Extrair o rodapé com `/logo-dark.png`, navegação completa institucional, links para termos e privacidade, e direitos autorais com CNPJ.

**Step 2: Substituir o rodapé inline na landing page `page.tsx` pelo componente `LandingFooter`**
Importar e utilizar `<LandingFooter />` ao final da página.

**Step 3: Validar lint no `@energivia/web`**
Executar lint e garantir que não há erros.

---

### Task 2: Criar o componente `LandingSubpageHeader` compartilhado

**Files:**

- Create: `apps/web/src/components/landing/landing-subpage-header.tsx`

**Step 1: Implementar `LandingSubpageHeader`**
Cabeçalho fixo com `bg-[#02040a]/75 backdrop-blur-xl border-b border-white/10`, `/logo-dark.png`, links para "Início", "Diferenciais", "Entrar" e botão com `.glass-pill` "Começar Agora &rarr;". Inclui drawer responsivo mobile com toggle de Menu/X.

**Step 2: Validar lint no `@energivia/web`**

---

### Task 3: Refatorar `SeoIntentPage` para o design escuro e glassmorphism

**Files:**

- Modify: `apps/web/src/components/landing/seo-intent-page.tsx`

**Step 1: Atualizar container raiz e ambientação**
Definir `className="landing-page dark min-h-screen flex flex-col bg-[#02040a] text-white font-plus-jakarta selection:bg-[#10b981]/30 selection:text-white"` com `colorScheme: "dark"`.

**Step 2: Integrar `LandingSubpageHeader` e `LandingFooter`**
Substituir o cabeçalho antigo claro pelo `LandingSubpageHeader` e adicionar o `LandingFooter`.

**Step 3: Refatorar as seções Hero, Diagnóstico, Fluxo e Aplicações**
Aplicar `.glass-panel` no Hero, `.glass-pill` nas tags e `.glass-card` nos passos e exemplos práticos, com tipografia `text-white` e `text-slate-400`.

**Step 4: Refatorar a Tabela Comparativa, FAQ e Banner CTA**
Tabela moderna com contraste e realce da coluna EnergivIA em esmeralda; acordeão FAQ com `.glass-card`; banner CTA em `.glass-panel` com botões estilizados.

---

### Task 4: Atualizar `/privacidade/page.tsx` com a identidade visual dark e glassmorphic

**Files:**

- Modify: `apps/web/src/app/privacidade/page.tsx`

**Step 1: Aplicar tema dark obsidian e cabeçalho/rodapé institucionais**
Adicionar `className="landing-page dark min-h-screen flex flex-col bg-[#02040a] text-white font-plus-jakarta"` com `LandingSubpageHeader` e `LandingFooter`.

**Step 2: Estilizar o conteúdo jurídico em `.glass-panel`**
Cartão de leitura translúcido com badge LGPD em `.glass-pill`, cabeçalhos com ícones esmeralda e texto nítido em `text-slate-300`.

---

### Task 5: Atualizar `/termos-de-uso/page.tsx` com a identidade visual dark e glassmorphic

**Files:**

- Modify: `apps/web/src/app/termos-de-uso/page.tsx`

**Step 1: Aplicar tema dark obsidian e cabeçalho/rodapé institucionais**
Adicionar `className="landing-page dark min-h-screen flex flex-col bg-[#02040a] text-white font-plus-jakarta"` com `LandingSubpageHeader` e `LandingFooter`.

**Step 2: Estilizar o conteúdo jurídico em `.glass-panel`**
Cartão de leitura translúcido com badge de Responsabilidade Técnica em `.glass-pill`, cabeçalhos com ícones esmeralda e texto em `text-slate-300`.

---

### Task 6: Validação de Build, Lint e Ausência de Regressões

**Files:**

- Nenhum arquivo modificado diretamente.

**Step 1: Executar `pnpm build` no `@energivia/web`**
Garantir que todas as páginas compilam com sucesso sem erros de tipo ou de renderização.

**Step 2: Executar lint no projeto**
Garantir zero erros no ESLint.

---

### Task 7: Commit e Push das alterações

**Step 1: Atualizar `docs/plans/task.md`**
Registrar conclusão de todas as etapas.

**Step 2: Commit e push para `origin/main`**
Sincronizar com o repositório remoto conforme regra estrita do projeto.
