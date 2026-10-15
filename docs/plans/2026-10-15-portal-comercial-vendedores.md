# Portal Comercial e Gestão de Vendedores Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Construir o Portal Comercial da EnergivIA com controle de vendedores internos (SDR/Closer), atribuição automática de clientes por link exclusivo, visualização em tempo real de ativação/uso (propostas, WhatsApp, faturas OCR) e isolamento de segurança RBAC.

**Architecture:** Módulo nativo no monorepo composto por extensões de modelo no Prisma (`User`, `Tenant`, `SalesActivityNote`), módulo de backend NestJS (`SalesRepModule`) com guard de segurança `PlatformSalesGuard`, e interface web em Next.js no padrão Obsidian Dark/Glassmorphism com cards de KPIs, termômetro de ativação (Product-Led Sales) e drawer de histórico comercial.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React, NestJS, Prisma ORM, PostgreSQL (Neon), Vitest.

---

### Task 1: Atualização do Modelo de Dados (Prisma Schema)

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Test: `apps/api/src/modules/sales-rep/__tests__/sales-rep.schema.spec.ts`

**Step 1: Escrever teste de verificação de tipos e campos do Prisma**
Criar `apps/api/src/modules/sales-rep/__tests__/sales-rep.schema.spec.ts` validando que as propriedades `salesRepId`, `referralCode` e a entidade `SalesActivityNote` existem nos tipos gerados pelo Prisma.

**Step 2: Adicionar campos no schema.prisma**

- Em `enum UserRole`: adicionar `PLATFORM_SALES`.
- Em `model User`:
  ```prisma
  referralCode   String?             @unique @map("referral_code")
  commissionRate Decimal?            @default(0.10) @db.Decimal(5, 4) @map("commission_rate")
  assignedTenants Tenant[]           @relation("TenantSalesRep")
  salesNotes     SalesActivityNote[]
  ```
- Em `model Tenant`:

  ```prisma
  salesRepId   String?             @map("sales_rep_id")
  referralCode String?             @map("referral_code")
  salesRep     User?               @relation("TenantSalesRep", fields: [salesRepId], references: [id], onDelete: SetNull)
  salesNotes   SalesActivityNote[]

  @@index([salesRepId])
  @@index([referralCode])
  ```

- Adicionar `model SalesActivityNote`:

  ```prisma
  model SalesActivityNote {
    id         String   @id @default(cuid())
    tenantId   String   @map("tenant_id")
    salesRepId String   @map("sales_rep_id")
    content    String   @db.Text
    stage      String   @default("TRIAL_ONBOARDING")
    createdAt  DateTime @default(now()) @map("created_at")
    updatedAt  DateTime @updatedAt @map("updated_at")

    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
    salesRep User   @relation(fields: [salesRepId], references: [id], onDelete: Cascade)

    @@index([tenantId])
    @@index([salesRepId])
    @@map("sales_activity_notes")
  }
  ```

**Step 3: Gerar cliente Prisma e validar build**
Executar: `pnpm --filter @energivia/api prisma generate` e rodar os testes.

---

### Task 2: Guard de Segurança e Autorização no Backend (`PlatformSalesGuard`)

**Files:**

- Create: `apps/api/src/common/guards/platform-sales.guard.ts`
- Test: `apps/api/src/common/guards/__tests__/platform-sales.guard.spec.ts`

**Step 1: Escrever teste unitário do guard**
Validar que:

- Usuários com `role === 'PLATFORM_SALES'` têm acesso permitido.
- Usuários com `role === 'PLATFORM'` ou e-mails em `PLATFORM_ADMIN_EMAILS` (Super Admin) têm acesso permitido.
- Usuários normais (integradores com role `SALES`, `ADMIN` de tenant) recebem `ForbiddenException (403)`.

**Step 2: Implementar `PlatformSalesGuard`**
Criar classe Injectable compatível com `UnifiedAuthGuard` que verifica se `user.role === 'PLATFORM_SALES'` ou se é Super Admin.

**Step 3: Executar testes**
Executar: `pnpm --filter @energivia/api test apps/api/src/common/guards/__tests__/platform-sales.guard.spec.ts`
Garantir 100% de aprovação.

---

### Task 3: Backend: Módulo e Serviço de Vendedores (`SalesRepService`)

**Files:**

- Create: `apps/api/src/modules/sales-rep/sales-rep.service.ts`
- Create: `apps/api/src/modules/sales-rep/sales-rep.controller.ts`
- Create: `apps/api/src/modules/sales-rep/sales-rep.module.ts`
- Create: `apps/api/src/modules/sales-rep/dto/sales-rep.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/modules/sales-rep/__tests__/sales-rep.service.spec.ts`

**Step 1: Escrever testes unitários para o serviço**
Testar:

1. `getDashboardSummary(userId)`: calcula métricas agregadas da carteira (total de empresas, trials ativos, clientes pagantes, total de propostas emitidas, comissão estimada).
2. `listTenants(userId, filters)`: retorna a lista de empresas com contagem real de propostas, status do WhatsApp (`tenant_whatsapp_inbound_phones`), faturas analisadas e dias restantes de trial.
3. `addNote(userId, tenantId, dto)`: insere anotação de histórico comercial e atualiza o estágio do funil.
4. `getReferralLink(userId)`: gera link exclusivo com base no `referralCode` do vendedor.

**Step 2: Implementar DTOs e `SalesRepService`**
Escrever queries eficientes no Prisma utilizando agregações `_count` de propostas e faturas para resposta em sub-100ms.

**Step 3: Implementar `SalesRepController`**
Controlador com prefixo `sales-rep` protegido com `@UseGuards(UnifiedAuthGuard, PlatformSalesGuard)` e `@SkipTrialLock()`.

**Step 4: Registrar `SalesRepModule` em `app.module.ts`**
Importar o novo módulo e rodar suite de testes do Vitest.

---

### Task 4: Backend: Atribuição Automática de Cadastro (`?ref=codigo`)

**Files:**

- Modify: `apps/api/src/modules/organizations/organizations.service.ts` (ou controlador de criação de organização)
- Test: `apps/api/src/modules/organizations/__tests__/organizations-referral.spec.ts`

**Step 1: Escrever teste de criação de organização com código de indicação**
Garantir que ao criar organização com `{ referralCode: 'giovani' }`, a organização criada tem `salesRepId` apontando para o ID do usuário cujo `referralCode === 'giovani'`. Se o código for inválido ou omitido, cria normalmente com `salesRepId: null`.

**Step 2: Atualizar o fluxo de criação de organização**
Buscar o vendedor pelo `referralCode` e associar `salesRepId` e `referralCode` no `Tenant.create()`.

**Step 3: Executar testes de regressão**
Garantir que os testes de criação de organização existentes continuem passando 100%.

---

### Task 5: Frontend: Captura e Persistência do Link do Vendedor (`?ref=...`)

**Files:**

- Create: `apps/web/src/lib/referral-tracker.ts`
- Modify: `apps/web/src/app/(auth)/login/page.tsx` ou layout raiz `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/auth/register-form.tsx` (ou tela de criação de conta/organização)

**Step 1: Criar utilitário `referral-tracker.ts`**
Captura o query param `?ref=...` da URL, sanitiza e persiste em `localStorage` e cookie seguro (`energivia_ref`) com validade de 30 dias.

**Step 2: Integrar envio no payload de criação de organização**
Ao submeter o formulário de onboarding/organização, lê `getStoredReferralCode()` e envia para a API.

---

### Task 6: Frontend: Portal Comercial do Vendedor (`/admin/comercial`)

**Files:**

- Create: `apps/web/src/app/(authenticated)/admin/comercial/page.tsx`
- Create: `apps/web/src/components/sales-rep/SalesRepKpiCards.tsx`
- Create: `apps/web/src/components/sales-rep/SalesRepTenantsTable.tsx`
- Create: `apps/web/src/components/sales-rep/SalesRepTenantDrawer.tsx`
- Create: `apps/web/src/components/sales-rep/SalesRepLinkCard.tsx`
- Modify: `apps/web/src/app/(authenticated)/admin/layout.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

**Step 1: Criar componentes visuais no padrão Obsidian Dark / Glassmorphism**

1. `SalesRepLinkCard`: Banner minimalista com link exclusivo `app.energivia.com.br/cadastro?ref=xyz`, botão de copiar com feedback sonoro/visual e botão direto "Compartilhar no WhatsApp".
2. `SalesRepKpiCards`: 4 cards executivos (Empresas na Carteira, Trials em Andamento, Propostas Geradas pelos Clientes, Comissão Estimada).
3. `SalesRepTenantsTable`:
   - Colunas: Empresa / Contato, Plano / Vencimento do Trial, Termômetro de Ativação (Badge de Propostas, Badge de WhatsApp, Faturas OCR), Estágio do Funil, Ações.
   - Filtros rápidos por abas: _Todos_, _Em Teste (Trial)_, _Ativos (Pagantes)_, _Risco de Churn_.
4. `SalesRepTenantDrawer`: Gaveta lateral (Framer Motion) para registrar anotações de contato e histórico de reuniões.

**Step 2: Atualizar Sidebar e AdminLayout**

- Adicionar link "Comercial EnergivIA" na navegação para usuários com papel `PLATFORM_SALES` ou `PLATFORM`.
- Permitir acesso a `/admin/comercial` sem redirecionamento para o `/painel`.

---

### Task 7: Validação Completa, Testes e Verificação

**Files:**

- Run test suites: `apps/api` e `apps/web`
- Run lint e build: `pnpm build`

**Step 1: Executar suite de testes do backend**
Garantir que todos os testes passem (vitest).

**Step 2: Executar build de produção do Next.js**
Confirmar compilação limpa de todas as rotas sem erros de TypeScript ou lint.

**Step 3: Documentar guia de uso para novos vendedores**
Atualizar documentação interna com instruções de como cadastrar um novo vendedor, atribuir a role `PLATFORM_SALES` e definir seu `referralCode`.
