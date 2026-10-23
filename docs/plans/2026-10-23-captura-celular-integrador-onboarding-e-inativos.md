# Captura de Celular do Integrador no Onboarding, Rastreamento de Abandono e Monitoramento de Inativos Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar a captura do celular/WhatsApp do integrador no primeiro passo do onboarding (`/create-organization`), rastreamento resiliente de saída/abandono de cadastro com alerta imediato aos administradores no WhatsApp e exibição de status de ativação (Abandonou Cadastro, Sem Uso, Ativo) no painel administrativo.

**Architecture:** Módulo composto por campos dedicados no modelo `User` do Prisma (`phone`, `onboardingStatus`, `onboardingAbandonedAt`), endpoints no NestJS com integração ao `AdminAlertsService` (disparando alertas no grupo de WhatsApp com link direto `wa.me`), rotas de proxy no Next.js App Router, campo com máscara reativa e detecção de saída com `navigator.sendBeacon` em `/create-organization`, e visualização de ativação na área administrativa.

**Tech Stack:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Lucide React, NestJS, Prisma ORM, PostgreSQL (Neon), Vitest.

---

### Task 1: Atualização do Modelo Prisma (`User`) e Regeneração de Client

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/modules/users/__tests__/user-phone-onboarding.spec.ts`

**Step 1: Escrever teste de tipos e campos do Prisma**
Criar teste unitário verificando que os campos `phone`, `onboardingStatus`, `onboardingAbandonedAt` e `lastActiveAt` existem no schema e podem ser manipulados.

**Step 2: Adicionar campos no schema.prisma**
No model `User`:

```prisma
  phone                  String?
  onboardingStatus       String?   @default("IN_PROGRESS") @map("onboarding_status")
  onboardingAbandonedAt  DateTime? @map("onboarding_abandoned_at")
  lastActiveAt           DateTime? @map("last_active_at")

  @@index([onboardingStatus])
```

**Step 3: Regenerar Prisma Client**
Run: `pnpm --filter @energivia/api prisma generate`

**Step 4: Rodar teste para verificar aprovação**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/users/__tests__/user-phone-onboarding.spec.ts`

**Step 5: Commit**
`git add apps/api/prisma/schema.prisma apps/api/src/modules/users/__tests__/`
`git commit -m "feat(api): add phone and onboarding status fields to User schema"`

---

### Task 2: Endpoints de Sincronização, Abandono e Alertas no Backend (NestJS)

**Files:**

- Modify: `apps/api/src/modules/users/users.service.ts`
- Modify: `apps/api/src/modules/users/users.controller.ts`
- Modify: `apps/api/src/modules/notifications/admin-alerts.service.ts`
- Modify: `apps/api/src/modules/organizations/organizations.service.ts`
- Create/Modify: `apps/api/src/modules/notifications/__tests__/admin-alerts.service.spec.ts`

**Step 1: Escrever testes unitários para os novos métodos**
Cobrir `notifyOnboardingAbandoned` e inclusão de telefone formatado com `wa.me` em `notifyNewUserRegistration`.

**Step 2: Implementar métodos no AdminAlertsService**
Adicionar `notifyOnboardingAbandoned(data: { name: string; email: string; phone?: string | null; step?: string | number })`.
Formatar número limpo e gerar link `https://wa.me/55...`.

**Step 3: Implementar endpoints no UsersController e UsersService**

- `PATCH /users/me/onboarding-contact`: atualiza `phone`.
- `POST /users/me/onboarding-abandoned`: marca `onboardingStatus = "ABANDONED"` e dispara o alerta.
- `GET /users/admin/activation-status`: lista integradores com status e métricas de propostas.

**Step 4: Atualizar OrganizationsService**
Na criação da organização, propagar `dto.phone` (se fornecido) para o usuário, atualizar `onboardingStatus = "COMPLETED"` e repassar para `notifyNewUserRegistration`.

**Step 5: Executar testes unitários**
Run: `pnpm --filter @energivia/api test`

**Step 6: Commit**
`git add apps/api/src/modules/`
`git commit -m "feat(api): implement onboarding contact sync, abandonment alert and activation status"`

---

### Task 3: Rotas de Proxy no Frontend (Next.js App Router)

**Files:**

- Create: `apps/web/src/app/api/me/onboarding-contact/route.ts`
- Create: `apps/web/src/app/api/me/onboarding-abandoned/route.ts`
- Create: `apps/web/src/app/api/admin/activation-status/route.ts`

**Step 1: Implementar route handlers do Next.js**
Encaminhar as requisições autenticadas para os respectivos endpoints da API backend com tratamento de erro e respostas JSON tipadas.

**Step 2: Validar compilação**
Run: `pnpm --filter @energivia/web exec tsc --noEmit`

**Step 3: Commit**
`git add apps/web/src/app/api/`
`git commit -m "feat(web): add API proxy routes for onboarding contact, abandonment and activation status"`

---

### Task 4: Campo de Celular com Máscara e Rastreamento de Saída no Onboarding

**Files:**

- Modify: `apps/web/src/app/(authenticated)/create-organization/page.tsx`
- Modify: `apps/web/src/lib/organizations-api.ts`

**Step 1: Adicionar campo no Passo 1 com máscara brasileira**

- Label: `Celular / WhatsApp do Integrador`
- Formatação em tempo real `(DD) 9XXXX-XXXX`.
- Validação de 10 ou 11 dígitos para habilitar botão de próximo.

**Step 2: Sincronização automática e rastreamento de abandono**

- No `onBlur` do campo de telefone: disparar `PATCH /api/me/onboarding-contact`.
- Adicionar hook de ciclo de vida com `beforeunload` e `visibilitychange`:
  Se o status for ainda incompleto (`step < 3` ou empresa não enviada) e o usuário tiver preenchido telefone, enviar beacon para `/api/me/onboarding-abandoned`.
- No envio de criação da empresa: repassar `phone` no payload de `createOrganization`.

**Step 3: Validar build e tipos**
Run: `pnpm --filter @energivia/web exec tsc --noEmit`

**Step 4: Commit**
`git add apps/web/src/app/\(authenticated\)/create-organization/page.tsx apps/web/src/lib/organizations-api.ts`
`git commit -m "feat(web): add phone field with BR mask and page-exit abandonment beacon in onboarding"`

---

### Task 5: Monitoramento de Ativação de Integradores no Painel Admin

**Files:**

- Modify: `apps/web/src/app/(authenticated)/admin/acessos-especiais/page.tsx` (ou nova aba dedicada de Ativação de Integradores)

**Step 1: Integrar visualização com filtros por status**

- Filtros: `Todos`, `Abandonaram Cadastro`, `Cadastrados Sem Uso (0 Propostas)`, `Ativos`.
- Exibir Nome, E-mail, Celular/WhatsApp, Status com Badge semântico e Data.
- Botão "Chamar no WhatsApp" que abre direto `https://wa.me/55...` com mensagem personalizada de boas-vindas/ajuda.

**Step 2: Validar interface e compilação**
Run: `pnpm --filter @energivia/web exec tsc --noEmit`

**Step 3: Commit**
`git add apps/web/src/app/\(authenticated\)/admin/`
`git commit -m "feat(web): add integrator activation thermometer and whatsapp reachout in admin"`

---

### Task 6: Validação Completa, Testes Automatizados e Build de Produção

**Step 1: Executar testes unitários do backend e frontend**
Run: `pnpm test`

**Step 2: Executar lint em todo o repositório**
Run: `pnpm lint`

**Step 3: Testar compilação do NestJS e Next.js**
Run: `pnpm build`

---

### Task 7: Sincronização Final com Repositório Remoto

**Step 1: Commit e Push**
`git push origin main`
