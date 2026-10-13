# Redesign Editorial CleanTech da Seção de Solução Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transformar a seção de Solução (`solution`) do gerador de propostas em um template moderno, elegante e de alto valor (estilo Editorial CleanTech) com renderização impecável no PC, Mobile e PDF.

**Architecture:** Aprimorar o renderizador da seção em `section-registry.tsx` adicionando cabeçalho com badge de projeto customizado, cards de benefícios com superfícies de transparência calculada (`color-mix`), ícones em caixas com cantos arredondados e box arquitetural estruturado para o "Como Funciona". Adicionar classes responsivas e regras de container query / PDF print em `globals.css`.

**Tech Stack:** React 18, Next.js App Router, Tailwind CSS, Container Queries CSS, Lucide Icons, Vitest.

---

### Task 1: Classes responsivas e regras multiplataforma em globals.css

**Files:**

- Modify: `apps/web/src/app/globals.css`

**Step 1: Escrever classes CSS para o design Editorial CleanTech de Solução**
Adicionar classes para:

- `.solution-benefits-grid` (container query com 1 col mobile, 2 col sm/pdf e 3 col telas amplas)
- `.solution-benefit-card` (superfície translúcida com `break-inside: avoid` para PDF, padding responsivo)
- `.solution-benefit-icon-box` (caixa quadrada com cantos suaves para o ícone)
- `.solution-topics-list` e `.solution-topic-item` (lista executiva com separador suave)
- `.solution-how-it-works-card` (callout arquitetural com acento lateral e proteção contra quebra no PDF)
- Regras sob `[data-preview-viewport="mobile"]` para simulação fiel no editor

**Step 2: Verificar sintaxe CSS e conformidade**
Executar lint ou verificação de sintaxe CSS para confirmar que não há erros.

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style(proposals): add responsive classes for solution section redesign"
```

---

### Task 2: Refatorar o renderizador da seção Solution em section-registry.tsx

**Files:**

- Modify: `apps/web/src/components/proposals/editor/section-render/section-registry.tsx:1592-1698`

**Step 1: Implementar o layout Editorial CleanTech**

- Badge no cabeçalho com ícone e texto de destaque técnico
- Título `solutionName` com tipografia destacada e responsiva
- Bloco de texto rico com respiro e legibilidade aprimorada
- Variante `cards`: grade de cartões com ícones em caixas de acento e textos estruturados
- Variante `topics`: linhas executivas refinadas com ícone em pílula
- Box "Como Funciona": painel estruturado com mini-cabeçalho, ícone de fluxo (`Compass`/`Workflow`) e texto em destaque
- Preservar todos os atributos `data-editor-field-path` para foco e edição no editor

**Step 2: Testes unitários com Vitest**

- Criar teste unitário em `apps/web/src/components/proposals/editor/section-render/__tests__/solution-section.spec.ts` validando a renderização das variantes `topics` e `cards`, badge, benefícios e box de funcionamento.

**Step 3: Executar vitest para validar aprovação**

```bash
pnpm test:unit apps/web/src/components/proposals/editor/section-render/__tests__/solution-section.spec.ts
```

**Step 4: Commit**

```bash
git add apps/web/src/components/proposals/editor/section-render/section-registry.tsx apps/web/src/components/proposals/editor/section-render/__tests__/solution-section.spec.ts
git commit -m "feat(proposals): redesign solution section with Editorial CleanTech layout"
```

---

### Task 3: Validação completa, rastreamento em task.md, commit e push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Rodar suite de testes e linter**

```bash
pnpm test:unit
pnpm --filter @energivia/web lint
```

**Step 2: Atualizar docs/plans/task.md**
Registrar as novas tarefas como completed com as evidências de validação.

**Step 3: Commit e push para origin/main**

```bash
git add -A
git commit -m "feat(proposals): modern solution section template for pc mobile and pdf"
git push origin main
```
