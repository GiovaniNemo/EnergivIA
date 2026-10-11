# Plano de Implementação: Paginação, Sangria e Alinhamento Perfeito de PDFs de Proposta

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Eliminar cortes no meio de cartões, remover bordas brancas indesejadas e garantir paginação perfeita (padrão pitch deck A4 comercial) nos PDFs de propostas gerados pela EnergivIA.

**Architecture:**

1. Eliminar a margem física de 10mm no `@media print` (`@page { size: A4 portrait; margin: 0; }`) e unificar o background do `body` com o tema escuro (`--proposal-bg`), viabilizando capa e páginas 100% sangradas (_full-bleed_).
2. No componente `PreviewDocument` (modo `pdf`), estruturar cada seção como uma página A4 dedicada (`.proposal-pdf-page`) com `break-after: page`, `page-break-inside: avoid` e altura controlada (`height: 297mm`), eliminando o empilhamento desordenado que causava fatiamento de conteúdo.
3. Adequar a seção de _Dados de Geração e Consumo_ para que métricas e gráfico caibam harmoniosamente em 1 página A4 sem transbordar.
4. Isolar o _Termo de Aceite e Assinaturas_ como página final exclusiva de fechamento contratual, separada dos _Depoimentos_.

**Tech Stack:** Next.js (App Router), Tailwind CSS, CSS Paged Media (`@page`, `break-after`, `break-inside`), Puppeteer Core, Vitest.

---

### Task 1: Reset de Impressão e Sangria Full-Bleed em `globals.css` e `proposal-puppeteer-html.ts`

**Files:**

- Modify: `apps/web/src/app/globals.css:646-733`
- Modify: `apps/web/src/lib/proposal-puppeteer-html.ts:17-141`
- Test: `apps/web/src/lib/proposal-puppeteer-html.spec.ts` (ou teste unitário equivalente)

**Step 1: Escrever teste unitário para validar regras CSS de exportação do Puppeteer**
Verificar que `proposalPuppeteerDocumentCss` contém `@page { size: A4; margin: 0; }` e classe `.proposal-pdf-page` com quebra de página controlada.

**Step 2: Rodar teste para verificar falha**
Run: `pnpm --filter=@energivia/web test -- proposal-puppeteer-html.spec.ts`
Expected: FAIL

**Step 3: Ajustar regras CSS em `globals.css` e `proposal-puppeteer-html.ts`**

- Configurar `@page { size: A4 portrait; margin: 0; }`.
- No `@media print`: atribuir `background: var(--proposal-bg, #060b16) !important;` ao `html` e `body`.
- Definir classe `.proposal-pdf-page` com `page-break-after: always !important; break-after: page !important; page-break-inside: avoid !important; break-inside: avoid !important; height: 297mm !important; min-height: 297mm !important; max-height: 297mm !important; width: 100% !important; overflow: hidden !important; box-sizing: border-box !important;`.
- Assegurar que a capa `.proposal-cover-page` tenha `height: 297mm !important; min-height: 297mm !important; width: 100% !important; margin: 0 !important; padding: 0 !important;` sem bordas brancas.

**Step 4: Rodar teste para verificar aprovação**
Run: `pnpm --filter=@energivia/web test -- proposal-puppeteer-html.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/lib/proposal-puppeteer-html.ts
git commit -m "style(pdf): aplicar sangria full-bleed sem margem branca e classes de paginação A4"
```

---

### Task 2: Estruturar Seções Dedicadas por Página A4 em `PreviewDocument` (Modo PDF)

**Files:**

- Modify: `apps/web/src/components/proposals/editor/preview-document.tsx:545-625`
- Test: `apps/web/src/components/proposals/editor/preview-document.spec.tsx`

**Step 1: Escrever teste para o modo PDF de PreviewDocument**
Verificar que quando `mode === "pdf"`, cada seção visível é encapsulada em seu próprio container de página (`proposal-pdf-page`), sem agrupar todas em um único `article.overflow-hidden`.

**Step 2: Rodar teste para verificar falha**
Run: `pnpm --filter=@energivia/web test -- preview-document.spec.tsx`
Expected: FAIL

**Step 3: Refatorar renderização de seções em `mode === "pdf"`**

- Remover o container único `<article className="proposal-content-document ... overflow-hidden">` que envolvia todas as seções e quebrava o motor de fragmentação do Chromium.
- Cada seção da lista `visibleSections` é renderizada como um `<article className="proposal-pdf-page ...">` independente.
- Centralizar verticalmente o conteúdo de cada página e aplicar padding interno proporcional (ex: `px-12 py-10`).
- Manter o background herdado de `styles.branding.backgroundColor`.

**Step 4: Rodar teste para verificar aprovação**
Run: `pnpm --filter=@energivia/web test -- preview-document.spec.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/proposals/editor/preview-document.tsx
git commit -m "feat(pdf): paginar cada seção de proposta em página A4 dedicada"
```

---

### Task 3: Adequar a Seção de Geração e Consumo para Encaixe Perfeito no A4

**Files:**

- Modify: `apps/web/src/components/proposals/sections/system-performance/SystemPerformanceModernDashboardSection.tsx:165-256`
- Modify: `apps/web/src/components/proposals/sections/system-performance/ConsumptionProductionChart.tsx`

**Step 1: Escrever teste de renderização de SystemPerformance em modo compacto/print**
Garantir que a altura máxima do gráfico e da seção no modo PDF seja respeitada sem estourar 297mm.

**Step 2: Rodar teste para verificar falha**
Run: `pnpm --filter=@energivia/web test -- SystemPerformance.spec.tsx`
Expected: FAIL

**Step 3: Ajustar proporção de cards e altura do gráfico em print/pdf**

- No `SystemPerformanceModernDashboardSection`:
  - No modo PDF / print, dispor o card de capacidade hero e as métricas em grid compacto balanceado (ou 2 colunas: capacidade à esquerda, 3 métricas empilhadas ou grid à direita).
  - Reduzir a altura do gráfico de consumo vs produção no modo PDF de 340px para 240px, garantindo que toda a seção ocupe ~720px a 780px de altura total.
  - Remover `overflow-hidden` do container principal no print para não quebrar contextos de renderização.

**Step 4: Rodar teste para verificar aprovação**
Run: `pnpm --filter=@energivia/web test -- SystemPerformance.spec.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/proposals/sections/system-performance/
git commit -m "fix(pdf): compactar painel de desempenho e gráfico para encaixe perfeito em 1 folha A4"
```

---

### Task 4: Isolar Termo de Aceite e Depoimentos com Quebras de Página Formais

**Files:**

- Modify: `apps/web/src/components/proposals/sections/testimonials/testimonials-preview.tsx`
- Modify: `apps/web/src/components/proposals/editor/preview-document.tsx`

**Step 1: Testar ordem e isolamento de páginas finais**
Validar que a seção de `testimonials` e a seção de assinatura/formalização nunca compartilham a mesma página e nunca são cortadas.

**Step 2: Rodar teste e verificar comportamento**
Run: `pnpm --filter=@energivia/web test`

**Step 3: Ajustar estilos de página de depoimentos e aceite**

- Garantir que a seção de depoimentos ocupe sua página com grid simétrico (2 a 4 depoimentos) e margens limpas.
- Garantir que a seção formal de Aceite e Assinaturas ocupe sua própria página final exclusiva, centralizada, com os blocos de Contratante e Contratada intactos.

**Step 4: Commit**

```bash
git add apps/web/src/components/proposals/sections/testimonials/ apps/web/src/components/proposals/editor/preview-document.tsx
git commit -m "fix(pdf): isolar depoimentos e termo de aceite em páginas exclusivas"
```

---

### Task 5: Validação Visual com Browser Subagent, Execução de Testes e Push

**Files:**

- Testes: Vitest de web e api
- Build: `pnpm --filter=@energivia/web run build`

**Step 1: Testar visualmente com Browser Subagent**
Abrir a rota pública de proposta com `?pdf=true` em resolução A4 (794x1123) no navegador e inspecionar a quebra de página de cada seção.

**Step 2: Rodar suite completa de testes e build do Next.js**
Run: `pnpm --filter=@energivia/web test`
Run: `pnpm --filter=@energivia/web run build`
Expected: Todos os testes aprovados e 78 rotas compiladas com sucesso.

**Step 3: Commit e Push para origin/main**

```bash
git push origin main
```
