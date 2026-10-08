# Acessos Especiais (Whitelist) & Revogação Unificada Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Permitir a concessão profissional e ágil de plano Plus ilimitado via variável de ambiente (`COMPLIMENTARY_ACCESS_EMAILS`) e disponibilizar um kill-switch unificado no painel de administração que derruba a plataforma Web e o bot do WhatsApp simultaneamente em 1 clique, redirecionando o usuário revogado para a contratação de planos via Stripe.

**Architecture:** O backend NestJS gerencia a detecção da variável `COMPLIMENTARY_ACCESS_EMAILS` combinada com o estado de revogação prioritário persistido em banco de dados (`SystemSetting`). O serviço de limites (`plan-limits.ts`) e o bot do WhatsApp (`whatsapp-bot.service.ts`) respeitam a autorização e o bloqueio em tempo real. Uma tela administrativa dedicada no Next.js (`/admin/acessos-especiais`) permite visualizar o status, o número pareado no WhatsApp e acionar a revogação unificada imediata.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Next.js 15 (App Router), Tailwind CSS, Lucide Icons, Vitest.

---

### Task 1: Módulo e Serviço de Acessos Especiais no Backend

**Files:**

- Create: `apps/api/src/modules/admin/special-access/special-access.service.ts`
- Create: `apps/api/src/modules/admin/special-access/__tests__/special-access.service.spec.ts`
- Modify: `apps/api/src/common/utils/plan-limits.ts`

**Step 1: Escrever teste unitário para detecção e revogação de acessos especiais**
Testar:

1. E-mail configurado na variável recebe plano Plus sem limite de trial;
2. E-mail não configurado mantém fluxo padrão de plano;
3. E-mail configurado na variável que foi revogado no banco é rebaixado a trial expirado/bloqueado.

**Step 2: Executar teste e validar falha**
Run: `pnpm --filter @energivia/api test special-access.service.spec.ts`
Expected: FAIL

**Step 3: Implementar o serviço de Acessos Especiais e integrar em `plan-limits.ts`**
Criar `SpecialAccessService` com:

- Leitura de `COMPLIMENTARY_ACCESS_EMAILS`;
- Cache/leitura de e-mails revogados em `SystemSetting` (`special_access_revoked`);
- Métodos `isEmailComplimentary(email)`, `isTenantComplimentary(tenantId)`, `revokeAccess(email, tenantId)`, `restoreAccess(email, tenantId)`.

**Step 4: Executar testes unitários e validar sucesso**
Run: `pnpm --filter @energivia/api test special-access.service.spec.ts`
Expected: PASS

**Step 5: Commit das alterações**
Run:

```bash
git add apps/api/src/modules/admin/special-access apps/api/src/common/utils/plan-limits.ts
git commit -m "feat(api): implementar serviço de acessos especiais e integração com limites de plano"
```

---

### Task 2: Blindagem e Derrubada do WhatsApp Bot

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-pairing.service.ts`
- Create: `apps/api/src/modules/whatsapp/__tests__/whatsapp-special-access-revocation.spec.ts`

**Step 1: Escrever teste unitário de revogação de WhatsApp**
Testar:

1. Número de WhatsApp vinculado a tenant com acesso especial ativo responde normalmente;
2. Ao ocorrer a revogação unificada, o número é desvinculado de `TenantWhatsappInboundPhone`;
3. Mensagens enviadas após a revogação recebem a resposta do bot exigindo plano ativo.

**Step 2: Executar teste e validar falha**
Run: `pnpm --filter @energivia/api test whatsapp-special-access-revocation.spec.ts`
Expected: FAIL

**Step 3: Implementar checagem e expurgo de WhatsApp na revogação**

- Em `whatsapp-bot.service.ts`, injetar `SpecialAccessService` e verificar status de revogação em `resolveAuthorizedTenant` e `isTenantPlanActive`;
- Em `SpecialAccessService.revokeAccess`, executar `deleteMany` em `tenantWhatsappInboundPhone` para o `tenantId` correspondente.

**Step 4: Executar testes unitários e validar aprovação**
Run: `pnpm --filter @energivia/api test whatsapp-special-access-revocation.spec.ts`
Expected: PASS

**Step 5: Commit das alterações**
Run:

```bash
git add apps/api/src/modules/whatsapp
git commit -m "feat(whatsapp): integrar revogação unificada com expurgo de número e bloqueio do bot"
```

---

### Task 3: Controladores e Endpoints Administrativos

**Files:**

- Create: `apps/api/src/modules/admin/special-access/special-access.controller.ts`
- Create: `apps/api/src/modules/admin/special-access/special-access.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Implementar endpoints no controller**

- `GET /admin/special-access`: Lista contas especiais, status (Ativo / Revogado), organização vinculada e número de WhatsApp conectado.
- `POST /admin/special-access/revoke`: Executa a derrubada unificada (Web + WhatsApp).
- `POST /admin/special-access/restore`: Restaura a permissão caso necessário.

**Step 2: Proteger endpoints com `RolesGuard` e `isPlatformAdmin`**
Garantir que apenas administradores da plataforma possam listar ou revogar contas especiais.

**Step 3: Registrar módulo em `app.module.ts` e testar compilação**
Run: `pnpm --filter @energivia/api build`
Expected: Compilação sem erros.

**Step 4: Commit das alterações**
Run:

```bash
git add apps/api/src/modules/admin/special-access apps/api/src/app.module.ts
git commit -m "feat(api): adicionar endpoints administrativos para gestão e revogação unificada"
```

---

### Task 4: Interface do Painel Administrativo no Frontend (`/admin/acessos-especiais`)

**Files:**

- Create: `apps/web/src/app/(authenticated)/admin/acessos-especiais/page.tsx`
- Modify: `apps/web/src/app/(authenticated)/admin/layout.tsx` (adicionar link de navegação na aba do admin)
- Modify: `apps/web/src/lib/organizations-api.ts` (ou client api dedicado)

**Step 1: Criar página administrativa com design corporativo de alta fidelidade**

- Header com título "Acessos Especiais (Whitelist)" e descrição institucional;
- Card de instrução rápida: _"Como adicionar novas contas via `COMPLIMENTARY_ACCESS_EMAILS` no Railway"_;
- Tabela de contas:
  - E-mail e Nome do Usuário / Organização;
  * Badge de status: 🟢 **Autorizado** ou 🔴 **Acesso Revogado**;
  * Status do WhatsApp: Ícone com número conectado ou badge "Não vinculado";
  * Botão de Ação Única: 🔴 **"Revogar Acesso (Web + WhatsApp)"** com diálogo de confirmação;
  * Botão 🟢 **"Reativar"** para contas revogadas.

**Step 2: Integrar chamadas de API e feedback visual com toasts/alertas**

- Ao clicar em revogar, disparar feedback instantâneo e atualizar a tabela em tempo real sem reload.

**Step 3: Validar fidelidade visual (sem emojis de WhatsApp, layout limpo)**
Conferir tipografia, contrastes dark/light e consistência do design system.

**Step 4: Commit das alterações**
Run:

```bash
git add apps/web/src/app/(authenticated)/admin/acessos-especiais apps/web/src/app/(authenticated)/admin/layout.tsx
git commit -m "feat(web): criar interface de gestão e revogação de acessos especiais no admin"
```

---

### Task 5: Validação Completa de Testes, Build, Commit e Push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar suite de testes do backend**
Run: `pnpm --filter @energivia/api test`
Expected: Todos os testes aprovados com 100% de sucesso.

**Step 2: Executar build de produção do Next.js**
Run: `pnpm --filter @energivia/web build`
Expected: Build concluído com sucesso e todas as rotas estáticas/dinâmicas geradas.

**Step 3: Atualizar rastreador em `docs/plans/task.md`**
Registrar as novas tarefas e marcar status de conclusão.

**Step 4: Commit e push final para `origin/main`**
Run:

```bash
git add .
git commit -m "feat: concluir sistema de acessos especiais e revogação unificada de web e whatsapp"
git push origin main
```
