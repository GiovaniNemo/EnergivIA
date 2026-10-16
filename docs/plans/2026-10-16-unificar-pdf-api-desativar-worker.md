# Unificar Geração de PDF na API NestJS e Desativar Worker Ocioso Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Centralizar todo o processamento de PDF e captura de thumbnail no `PdfRendererService` da API NestJS, transformando as rotas da Web em proxies leves de streaming, removendo Puppeteer/Chromium do `apps/web` e desativando o loop ocioso do `apps/worker`.

**Architecture:** A API NestJS passa a expor endpoints para geração de PDF a partir de URL ou HTML e captura de thumbnail sob concorrência controlada. O frontend Next.js despacha essas requisições via proxy HTTP de streaming sem carregar instâncias de Chromium na Vercel. O `apps/worker` é desativado para eliminar custos no Railway.

**Tech Stack:** NestJS, Puppeteer-core, Next.js 14 App Router, TypeScript, Vitest.

---

### Task 1: Expandir `PdfRendererService` com `renderHtmlToPdf` e `renderScreenshot`

**Files:**

- Modify: `apps/api/src/modules/proposals/pdf-renderer.service.ts`
- Test: `apps/api/src/modules/proposals/__tests__/pdf-renderer.service.spec.ts`

**Step 1: Escrever testes unitários para os novos métodos**
Adicionar testes em `apps/api/src/modules/proposals/__tests__/pdf-renderer.service.spec.ts` testando `renderHtmlToPdf` e `renderScreenshot` com semáforo de concorrência.

**Step 2: Executar testes para verificar falha inicial**
Comando: `pnpm --filter=@energivia/api test pdf-renderer.service.spec`

**Step 3: Implementar `renderHtmlToPdf` e `renderScreenshot` em `PdfRendererService`**
Adicionar os métodos reutilizando `acquirePermit()`, `releasePermit()` e gerenciando o ciclo de vida do browser.

**Step 4: Executar testes para verificar aprovação**
Comando: `pnpm --filter=@energivia/api test pdf-renderer.service.spec`

**Step 5: Commit**
`git add apps/api/src/modules/proposals/`
`git commit -m "feat(api): add renderHtmlToPdf and renderScreenshot to PdfRendererService"`

---

### Task 2: Expor Endpoints na API NestJS (`ProposalOperationsController`)

**Files:**

- Modify: `apps/api/src/modules/proposals/proposal-operations.controller.ts`
- Modify: `apps/api/src/modules/proposals/proposals.service.ts`
- Test: `apps/api/src/modules/proposals/__tests__/proposal-operations.controller.spec.ts`

**Step 1: Escrever testes para os novos endpoints de controller**
Adicionar testes para `POST /proposals/render-html-pdf` e `POST /proposals/render-thumbnail`.

**Step 2: Executar testes para verificar falha**
Comando: `pnpm --filter=@energivia/api test proposal-operations.controller.spec`

**Step 3: Implementar endpoints no controller e métodos no service**
Expor `renderHtmlPdf` e `renderThumbnail` com validação de payload e retorno de `StreamableFile` e JSON respectivamente.

**Step 4: Executar testes para verificar aprovação**
Comando: `pnpm --filter=@energivia/api test`

**Step 5: Commit**
`git commit -am "feat(api): expose render-html-pdf and render-thumbnail endpoints"`

---

### Task 3: Refatorar `GET /api/proposals/[id]/pdf` no Next.js como Proxy de Streaming

**Files:**

- Modify: `apps/web/src/app/api/proposals/[id]/pdf/route.ts`

**Step 1: Substituir Puppeteer local por stream proxy para `${BACKEND_URL}/proposals/${id}/generate-pdf`**
Autenticar com Auth0 session, validar proposta e fazer pipe do stream HTTP retornado pela API NestJS com headers `application/pdf`.

**Step 2: Verificar sintaxe e lint da rota**
Comando: `pnpm --filter=@energivia/web lint`

**Step 3: Commit**
`git commit -am "refactor(web): stream proposal pdf directly from nestjs api"`

---

### Task 4: Refatorar `POST /api/proposals/pdf` no Next.js para Despachar para a API

**Files:**

- Modify: `apps/web/src/app/api/proposals/pdf/route.ts`

**Step 1: Substituir Puppeteer local por chamada à API NestJS**
Formatar o HTML com `wrapProposalHtmlForPuppeteer` e enviar para `${BACKEND_URL}/proposals/render-html-pdf`, devolvendo o stream de PDF diretamente para o cliente.

**Step 2: Verificar lint e types**
Comando: `pnpm --filter=@energivia/web lint`

**Step 3: Commit**
`git commit -am "refactor(web): delegate custom html pdf generation to nestjs api"`

---

### Task 5: Refatorar Thumbnail e Remover Dependências de Chromium do `apps/web`

**Files:**

- Modify: `apps/web/src/app/api/proposals/thumbnail/route.ts`
- Modify: `apps/web/package.json`

**Step 1: Refatorar `apps/web/src/app/api/proposals/thumbnail/route.ts` para chamar endpoint da API NestJS sem Chromium local**

**Step 2: Remover `@sparticuz/chromium`, `puppeteer`, `puppeteer-core` de `apps/web/package.json`**

**Step 3: Executar `pnpm install` para atualizar `pnpm-lock.yaml`**

**Step 4: Commit**
`git commit -am "chore(web): remove puppeteer and sparticuz chromium dependencies"`

---

### Task 6: Desativar Loop Ocioso do `apps/worker`

**Files:**

- Modify: `apps/worker/src/main.ts`
- Modify: `apps/worker/railway.toml`
- Modify: `turbo.json`

**Step 1: Parar o setInterval ocioso em `apps/worker/src/main.ts` e adicionar mensagem informativa sobre desativação**

**Step 2: Adicionar aviso no `apps/worker/railway.toml` instruindo desativação no Railway para corte de custos**

**Step 3: Commit**
`git commit -am "chore(worker): suspend idle worker polling loop"`

---

### Task 7: Validação Completa (Testes Unitários, Build Next.js e Verificação Final)

**Files:**

- Test all

**Step 1: Executar suite de testes Vitest no backend e packages**
Comando: `pnpm --filter=@energivia/api test`

**Step 2: Executar build de produção do Next.js**
Comando: `pnpm --filter=@energivia/web build`

**Step 3: Validar que 0 instâncias de Chromium rodam na Web**

**Step 4: Atualizar `docs/plans/task.md` com status de conclusão**

**Step 5: Commit final e push**
`git push origin main`
