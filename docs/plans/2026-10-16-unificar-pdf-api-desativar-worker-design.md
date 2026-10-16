# Design: Centralização do Motor de PDF na API NestJS e Desativação do Worker Ocioso

**Data:** 2026-10-16  
**Status:** Aprovado  
**Objetivo:** Eliminar o Puppeteer e o Chromium headless do frontend Next.js (`apps/web`), delegar toda geração de PDF e thumbnail para o `PdfRendererService` na API NestJS (`apps/api`), e desativar o serviço ocioso `apps/worker` para reduzir custos de infraestrutura no Railway e evitar travamentos serverless na Vercel.

---

## 1. Contexto e Motivação

Atualmente, o monorepo da EnergivIA possui:

1. **`apps/worker` rodando ocioso no Railway**: Possui um loop de 30 segundos chamando `processNext() { return Promise.resolve(); }`. Consome recursos de infraestrutura sem executar tarefas reais.
2. **`apps/web` executando Puppeteer/Chromium localmente**: Três rotas de API do Next.js (`/api/proposals/[id]/pdf`, `/api/proposals/pdf`, `/api/proposals/thumbnail`) instanciam `@sparticuz/chromium` e `puppeteer-core`. Isso infla o bundle de deploy da Vercel em mais de 100MB e acarreta riscos severos de timeout serverless (10s-15s) e estouro de memória (50MB-250MB).
3. **`apps/api` já possuindo infraestrutura pronta**: O serviço `PdfRendererService` no NestJS já implementa controle de semáforo de concorrência (`PDF_MAX_CONCURRENT_RENDERS = 2`), fila de espera, suporte a Chromium no Linux do Railway e destruição segura de processos.

---

## 2. Arquitetura da Solução

```
                    ┌────────────────────────────┐
                    │      Cliente / Navegador   │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
               ┌───────────────────────────────────────┐
               │         apps/web (Next.js)            │
               │  - Sem @sparticuz/chromium           │
               │  - Sem puppeteer / puppeteer-core    │
               │  - Rotas /api/proposals/* viram      │
               │    proxies HTTP leves com streaming   │
               └──────────────────┬────────────────────┘
                                  │
                       Proxy HTTP │ Streaming
                                  ▼
               ┌───────────────────────────────────────┐
               │         apps/api (NestJS)             │
               │  - PdfRendererService centralizado    │
               │  - Semáforo de concorrência ativa     │
               │  - Endpoints:                         │
               │    * GET /proposals/:id/generate-pdf  │
               │    * POST /proposals/render-html-pdf  │
               │    * POST /proposals/render-thumbnail │
               └───────────────────────────────────────┘
```

---

## 3. Especificação Técnica por Módulo

### 3.1. Backend (`apps/api`)

1. **`PdfRendererService` (`apps/api/src/modules/proposals/pdf-renderer.service.ts`)**:
   - Manter o controle de concorrência com semáforo/fila.
   - Adicionar método `renderHtmlToPdf(html: string, options?: PDFOptions): Promise<Buffer>`.
   - Adicionar método `renderThumbnail(url: string, selector: string): Promise<string>` (retorna dataUrl JPEG ou Buffer).
2. **Endpoints em `ProposalOperationsController` (`apps/api/src/modules/proposals/proposal-operations.controller.ts`)**:
   - `GET /proposals/:id/generate-pdf`: já existente, ajustado para retornar stream de PDF com headers de attachment e cache-control.
   - `POST /proposals/render-html-pdf`: aceita `{ html: string, title?: string }`, valida autorização e retorna `StreamableFile`.
   - `POST /proposals/render-thumbnail`: aceita `{ url: string, selector?: string }` ou payload de render e retorna `{ dataUrl: string }`.

### 3.2. Frontend (`apps/web`)

1. **Rotas de API no Next.js**:
   - `apps/web/src/app/api/proposals/[id]/pdf/route.ts`:
     - Remove `puppeteerCore` e `@sparticuz/chromium`.
     - Faz proxy autenticado para `${BACKEND_URL}/proposals/${id}/generate-pdf`.
     - Faz pipe do stream de resposta para o cliente mantendo os cabeçalhos `Content-Type: application/pdf` e `Content-Disposition`.
   - `apps/web/src/app/api/proposals/pdf/route.ts`:
     - Remove `puppeteerCore` e `@sparticuz/chromium`.
     - Monta o HTML com `wrapProposalHtmlForPuppeteer` e despacha para `${BACKEND_URL}/proposals/render-html-pdf`.
   - `apps/web/src/app/api/proposals/thumbnail/route.ts`:
     - Delega a captura para a API ou usa fallback visual sem instanciar Chromium serverless.
2. **Remoção de Dependências**:
   - Desinstalar `@sparticuz/chromium`, `puppeteer`, `puppeteer-core` de `apps/web/package.json`.

### 3.3. Worker (`apps/worker`)

1. **Desativação**:
   - Remover `apps/worker` do script de dev/build ativo no `turbo.json` (ou marcar como inativo).
   - Documentar que o serviço no Railway associado ao `apps/worker/railway.toml` pode ser pausado/deletado no dashboard do Railway, economizando custos mensais.

---

## 4. Plano de Validação e Testes

1. **Testes Unitários no Backend**:
   - Testar `PdfRendererService.renderHtmlToPdf` e `renderUrlToPdf`.
   - Testar novos endpoints em `proposal-operations.controller.spec.ts`.
2. **Testes de Integração e Build no Frontend**:
   - Validar que `apps/web` compila (`pnpm --filter=@energivia/web build`) sem dependências do Chromium.
   - Verificar ausência de `@sparticuz/chromium` e `puppeteer` no bundle da Web.
   - Testar o download de PDF de propostas via proxy da API.
