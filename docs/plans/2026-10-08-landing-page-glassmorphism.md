# Landing Page Glassmorphism Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar efeitos refinados de glassmorphism em toda a landing page da EnergivIA, garantindo estética executiva, alta legibilidade e performance de 60fps sem neons excessivos.

**Architecture:** Criar tokens e utilitários CSS universais em `globals.css` (`.glass-card`, `.glass-panel`, `.glass-pill`) com desfoque óptico, bordas de refração de luz e aceleração gráfica por hardware; aplicar de forma orquestrada na Navbar, seção de demonstração, métricas, diferenciais, FAQ e CTA; verificar com testes Vitest, build de produção e subagente de navegador com gravação visual.

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS, Vanilla CSS Moderno, Framer Motion, Vitest, Playwright/Browser Subagent.

---

### Task 1: Criar Utilitários de Glassmorphism em globals.css

**Files:**

- Modify: `apps/web/src/app/globals.css`

**Step 1: Adicionar classes utilitárias de glassmorphism**
Adicionar `.glass-card`, `.glass-panel`, `.glass-pill` e seus estados de hover e compatibilidade WebKit em `@layer utilities`.

**Step 2: Verificar sintaxe e ausência de regressões**
Run: `pnpm --filter @energivia/web lint`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style(css): adicionar utilitarios de glassmorphism em globals.css"
```

---

### Task 2: Aplicar Glassmorphism no Header / Navbar

**Files:**

- Modify: `apps/web/src/components/landing/beamq-hero-section.tsx`

**Step 1: Atualizar o elemento `<header>`**
Substituir classes estáticas de fundo por `.glass-panel` refinado com `backdrop-blur-xl bg-[#02040a]/70 border-b border-white/10`.

**Step 2: Verificar build e tipagem**
Run: `pnpm --filter @energivia/web build`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/landing/beamq-hero-section.tsx
git commit -m "style(landing): aplicar vidro translucido no header da hero section"
```

---

### Task 3: Aplicar Glassmorphism na Seção "Como Funciona na Prática"

**Files:**

- Modify: `apps/web/src/components/landing/how-it-works-tabs.tsx`

**Step 1: Atualizar container principal e abas**

- Atualizar o seletor de abas para utilizar visual de pílulas translúcidas.
- Aplicar `.glass-panel` com borda especular no container mestre do simulador e no cabeçalho da janela de visualização.

**Step 2: Validar visual e lint**
Run: `pnpm --filter @energivia/web lint`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/landing/how-it-works-tabs.tsx
git commit -m "style(landing): aplicar glassmorphism no container de demonstracao e abas"
```

---

### Task 4: Aplicar Glassmorphism nos Cards de Métricas e Resultados

**Files:**

- Modify: `apps/web/src/components/landing/impact-results-section.tsx`

**Step 1: Atualizar cards de métricas e container de depoimentos**

- Atualizar os cards de métricas numéricas para `.glass-card` com friso interno de luz e bordas translúcidas.
- Harmonizar o container do carrossel/depoimentos com fundo translúcido acetinado.

**Step 2: Validar lint**
Run: `pnpm --filter @energivia/web lint`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/landing/impact-results-section.tsx
git commit -m "style(landing): aplicar glass-card nas metricas de impacto e depoimentos"
```

---

### Task 5: Aplicar Glassmorphism nos Painéis Convergentes de Segmentos

**Files:**

- Modify: `apps/web/src/components/landing/converging-panels-section.tsx`

**Step 1: Atualizar cards de segmentos solares**

- Aplicar `.glass-card` nos cards interativos de Residencial, Comercial, Usinas e WhatsApp.

**Step 2: Validar lint**
Run: `pnpm --filter @energivia/web lint`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/landing/converging-panels-section.tsx
git commit -m "style(landing): aplicar glass-card nos paineis de segmentos solares"
```

---

### Task 6: Aplicar Glassmorphism em Diferenciais, FAQ, CTA e Artigos SEO

**Files:**

- Modify: `apps/web/src/app/page.tsx`

**Step 1: Atualizar Diferenciais, FAQ, Banner CTA e Artigos**

- Atualizar os cards de diferenciais para `.glass-card`.
- Atualizar os acordeões do FAQ para `.glass-card`.
- Atualizar o banner do CTA final para `.glass-panel` com botão de demonstração em `.glass-pill`.
- Atualizar container de artigos para `.glass-panel`.

**Step 2: Validar lint**
Run: `pnpm --filter @energivia/web lint`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "style(landing): harmonizar diferenciais, faq, cta e artigos com glassmorphism"
```

---

### Task 7: Executar Testes Automatizados e Build Completo de Produção

**Files:**

- Validação transversal

**Step 1: Executar suite de testes do Vitest**
Run: `pnpm vitest run`
Expected: PASS (todos os testes passando sem erros)

**Step 2: Executar build completo do Next.js**
Run: `pnpm --filter @energivia/web build`
Expected: PASS (todas as rotas compiladas com sucesso)

**Step 3: Commit de eventuais ajustes**

```bash
git add .
git commit -m "test(landing): validar suite vitest e build de producao com glassmorphism"
```

---

### Task 8: Auditoria Visual e Gravação com Browser Subagent, Commit e Push Final

**Files:**

- Validação no navegador em tempo de execução

**Step 1: Iniciar servidor local se necessário e abrir navegador via subagente**

- Navegar na landing page com `browser_subagent`.
- Simular scroll suave da página inteira gravando interação (`landing_glassmorphism_flow`).
- Confirmar fluidez dos 60fps, contraste dos textos e ausência de glitches visuais.

**Step 2: Sincronizar alterações com origin/main**

```bash
git push origin main
```
