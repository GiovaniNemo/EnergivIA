# Novo Design Executivo do PDF de Propostas: Fundo Orbital e Anti-Corte Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transformar o layout e a paginação dos PDFs de propostas em um padrão editorial executivo de alto impacto, com fundo vetorial de arcos orbitais reativo às cores, Capa inspirada na referência fornecida, paginação inteligente para zero corte de cards e molduras anti-distorção de imagens.

**Architecture:** Componente SVG puro `PdfOrbitalBackground` calcula arcos concêntricos nas cores pré-definidas da marca; `EditorialPoster.tsx` recria a hierarquia gráfica da imagem; `pdf-pagination.ts` calcula pesos dinâmicos por densidade de itens evitando overflow na folha A4 física (297mm); e wrappers geométricos com `object-fit: contain/cover` impedem qualquer distorção visual.

**Tech Stack:** Next.js (App Router), React 18, TypeScript, Tailwind CSS, SVG Vetorial Nativo, Vitest para testes unitários.

---

### Task 1: Componente Vetorial `PdfOrbitalBackground` com Arcos Concêntricos Reativos

**Files:**

- Create: `apps/web/src/components/proposals/editor/pdf-orbital-background.tsx`
- Test: `apps/web/src/components/proposals/editor/__tests__/pdf-orbital-background.spec.tsx`

**Step 1: Write the failing test**
Criar teste unitário verificando que `PdfOrbitalBackground` renderiza um SVG com traços proporcionais, aplica a cor primária informada e aceita opacidades customizadas para capa vs páginas internas.

**Step 2: Run test to verify it fails**
Run: `pnpm --filter @energivia/web test apps/web/src/components/proposals/editor/__tests__/pdf-orbital-background.spec.tsx`
Expected: FAIL (módulo inexistente).

**Step 3: Write minimal implementation**
Criar `apps/web/src/components/proposals/editor/pdf-orbital-background.tsx` contendo o renderizador SVG geométrico com círculos concêntricos e elipses orbitais elegantes (simulando a referência visual).

**Step 4: Run test to verify it passes**
Run: `pnpm --filter @energivia/web test apps/web/src/components/proposals/editor/__tests__/pdf-orbital-background.spec.tsx`
Expected: PASS.

**Step 5: Commit**
`git add apps/web/src/components/proposals/editor/pdf-orbital-background.tsx apps/web/src/components/proposals/editor/__tests__/pdf-orbital-background.spec.tsx`
`git commit -m "feat(proposals): adicionar componente vetorial PdfOrbitalBackground com arcos concêntricos reativos"`

---

### Task 2: Nova Capa Editorial Executiva Baseada na Referência Visual

**Files:**

- Modify: `apps/web/src/components/sections/Cover/variants/EditorialPoster.tsx`
- Modify: `apps/web/src/components/sections/Cover/Cover.tsx`
- Modify: `apps/web/src/components/sections/Cover/cover-utils.ts`

**Step 1: Escrever teste de especificação visual da capa**
Verificar que `EditorialPoster` renderiza:

- Ano/Data com barra de acento (`—`) no canto superior esquerdo
- Badge `PROJETO Nº` no topo direito
- Título principal com tipografia de destaque
- Metadados agrupados `PROPOSTO A:` e `ORGANIZADO POR:` na base
- SVG `PdfOrbitalBackground` inserido no plano de fundo absoluto

**Step 2: Executar teste e validar falha**
Run: `pnpm --filter @energivia/web test apps/web/src/components/sections/Cover/__tests__/cover.spec.ts`
Expected: FAIL ou pendente de novos elementos.

**Step 3: Implementar layout executivo em `EditorialPoster.tsx` e `Cover.tsx`**
Atualizar `EditorialPoster.tsx` com a estrutura da imagem de referência, integrando `PdfOrbitalBackground`, barras de acento estéticas e alinhamentos tipográficos.

**Step 4: Executar testes de validação**
Run: `pnpm --filter @energivia/web test apps/web/src/components/sections/Cover/__tests__/cover.spec.ts`
Expected: PASS.

**Step 5: Commit**
`git add apps/web/src/components/sections/Cover/`
`git commit -m "feat(proposals): refatorar Capa Editorial Executiva inspirada na referência visual"`

---

### Task 3: Algoritmo de Paginação Inteligente Anti-Corte de Cards (`pdf-pagination.ts`)

**Files:**

- Modify: `apps/web/src/components/proposals/editor/pdf-pagination.ts`
- Modify: `apps/web/src/components/proposals/editor/__tests__/pdf-pagination.spec.ts`

**Step 1: Escrever testes unitários para particionamento de listas longas e orçamentação dinâmica**
Adicionar testes em `pdf-pagination.spec.ts` cobrindo:

- Seção de equipamentos com mais de 4 itens recebe peso 1.0 (página dedicada)
- Seção de equipamentos com mais de 8 itens é particionada em sub-seções de páginas consecutivas
- Seções compactas somam peso e não estouram o limite de 0.8 por folha

**Step 2: Executar teste e verificar falha**
Run: `pnpm --filter @energivia/web test apps/web/src/components/proposals/editor/__tests__/pdf-pagination.spec.ts`
Expected: FAIL com novos cenários de densidade.

**Step 3: Implementar cálculo dinâmico em `pdf-pagination.ts`**
Atualizar `getSectionPdfWeight` e `distributeSectionsIntoPdfPages` para inspecionar `fields` (como `equipmentItems`, textos longos, opções de pagamento) e alocar páginas A4 sem corte.

**Step 4: Executar teste e verificar sucesso**
Run: `pnpm --filter @energivia/web test apps/web/src/components/proposals/editor/__tests__/pdf-pagination.spec.ts`
Expected: PASS (todos os testes de paginação aprovados).

**Step 5: Commit**
`git add apps/web/src/components/proposals/editor/pdf-pagination.ts apps/web/src/components/proposals/editor/__tests__/pdf-pagination.spec.ts`
`git commit -m "feat(proposals): implementar paginador A4 dinâmico com orçamento visual anti-corte"`

---

### Task 4: Atualização do Chrome da Página A4 e Marca d'Água Orbital nas Páginas de Conteúdo

**Files:**

- Modify: `apps/web/src/components/proposals/editor/pdf-page-chrome.tsx`
- Modify: `apps/web/src/components/proposals/editor/preview-document.tsx`

**Step 1: Atualizar `PdfPageContainer` com `PdfOrbitalBackground` em baixa opacidade**
Integrar os arcos orbitais discretos (opacidade ~5%) no fundo de `PdfPageContainer` para páginas internas, garantindo unidade estética do primeiro ao último slide.

**Step 2: Ajustar containers de conteúdo para encaixe perfeito em 297mm**
Calibrar `proposal-pdf-page-body` com `gap-4`, padding vertical equilibrado e `breakInside: "avoid"`.

**Step 3: Validar visualmente e por testes unitários**
Run: `pnpm --filter @energivia/web test`
Expected: PASS.

**Step 4: Commit**
`git add apps/web/src/components/proposals/editor/pdf-page-chrome.tsx apps/web/src/components/proposals/editor/preview-document.tsx`
`git commit -m "feat(proposals): adicionar arcos orbitais em páginas internas e otimizar chrome A4"`

---

### Task 5: Molduras Anti-Distorção de Imagens e Estilização de Impressão Puppeteer

**Files:**

- Modify: `apps/web/src/lib/proposal-puppeteer-html.ts`
- Modify: `apps/web/src/components/proposals/editor/section-render/section-registry.tsx`
- Modify: `apps/web/src/lib/__tests__/proposal-puppeteer-html.spec.ts`

**Step 1: Atualizar testes de CSS e marcação Puppeteer**
Garantir que as regras `@media print` e o CSS base do documento Puppeteer possuam regras explícitas para `.proposal-pdf-page`, `break-inside: avoid`, e proteção anti-distorção para imagens (`object-fit: contain` em logos, `object-fit: cover` em fotos).

**Step 2: Implementar classes e propriedades CSS em `proposal-puppeteer-html.ts` e renderizadores**
Atualizar `proposal-puppeteer-html.ts` e `section-registry.tsx` garantindo que nenhuma imagem seja deformada e que cards tenham bordas e paddings unificados.

**Step 3: Executar testes de regressão**
Run: `pnpm --filter @energivia/web test apps/web/src/lib/__tests__/proposal-puppeteer-html.spec.ts`
Expected: PASS.

**Step 4: Commit**
`git add apps/web/src/lib/proposal-puppeteer-html.ts apps/web/src/components/proposals/editor/section-render/section-registry.tsx apps/web/src/lib/__tests__/proposal-puppeteer-html.spec.ts`
`git commit -m "feat(proposals): blindagem anti-distorção de imagens e estilos de impressão no Puppeteer"`

---

### Task 6: Validação Completa, Testes Automatizados, Build, Commit e Push

**Files:**

- Workspace geral

**Step 1: Executar suite de testes do Web e da API**
Run: `pnpm --filter @energivia/web test`
Run: `pnpm --filter @energivia/api test`

**Step 2: Validar compilação do Next.js de produção**
Run: `pnpm --filter @energivia/web build`

**Step 3: Atualizar rastreador `docs/plans/task.md`**
Marcar todas as tarefas concluídas com notas detalhadas.

**Step 4: Commit e Push final para origin/main**
Run: `git push origin main`
