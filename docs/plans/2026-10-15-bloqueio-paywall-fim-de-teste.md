# Bloqueio Total de Tela (Paywall) ao Fim dos 5 Dias de Teste Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Ativar o bloqueio total de tela (paywall com `TrialLockOverlay`) ao fim dos 5 dias úteis de teste gratuito, impedindo qualquer acesso, navegação ou ação no CRM e demais módulos até a assinatura de um plano.

**Architecture:** O endpoint `/auth/me` calculará `isTrialLocked: Boolean(user.role !== "ADMIN" && user.role !== "PLATFORM" && isTrial && trialExpired)` no backend. No frontend, o componente `TrialLockOverlay.tsx` detectará o bloqueio e exibirá o modal de tela cheia (`fixed inset-0 z-[2147483647] bg-black/85 backdrop-blur-md`) sem botão de fechar, bloqueando qualquer clique no CRM, propostas e configurações. O backend `TrialLockGuard` continuará bloqueando requisições de escrita com `403 Forbidden`.

**Tech Stack:** NestJS, TypeScript, Next.js (App Router), Tailwind CSS, Stripe, Vitest.

---

### Task 1: Escrever testes unitários para cálculo de isTrialLocked e expiração de trial no backend

**Files:**

- Create: `apps/api/src/common/__tests__/trial-lock-rules.spec.ts`

**Step 1: Write the failing test**
Criar teste unitário cobrindo:

1. Usuário normal com tenant cujo trial expirou (`isTrial = true`, `trialExpired = true`) deve ter `isTrialLocked = true`.
2. Usuário normal durante os 5 dias de teste (`isTrial = true`, `trialExpired = false`) deve ter `isTrialLocked = false`.
3. Usuário com plano pago ativo (`isTrial = false`, `trialExpired = false`) deve ter `isTrialLocked = false`.
4. Usuário Administrador da plataforma (`role = "ADMIN"` ou `role = "PLATFORM"`) deve ter `isTrialLocked = false` mesmo se o tenant estiver com trial expirado.
5. Organização com Acesso Especial ativo (`specialAccessActive = true`) deve ter `isTrialLocked = false`.

**Step 2: Run test to verify it fails**
Run: `pnpm.cmd --filter @energivia/api test -- trial-lock-rules.spec.ts`
Expected: FAIL se as funções auxiliares ou regras não estiverem integradas.

**Step 3: Commit**

```bash
git add apps/api/src/common/__tests__/trial-lock-rules.spec.ts
git commit -m "test: adicionar testes unitarios para regras de isTrialLocked no backend"
```

---

### Task 2: Implementar cálculo dinâmico de isTrialLocked no AuthController

**Files:**

- Modify: `apps/api/src/modules/auth/auth.controller.ts:150-178`

**Step 1: Implementar minimal code**
No método `me()` de `AuthController`:
Substituir a linha estática `isTrialLocked: false,` por:

```typescript
const isTrialLocked = Boolean(
  user.role !== "ADMIN" && user.role !== "PLATFORM" && isTrial && trialExpired
);
```

E retornar `isTrialLocked` no payload de resposta do perfil.

**Step 2: Run tests to verify they pass**
Run: `pnpm.cmd --filter @energivia/api test -- trial-lock-rules.spec.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.controller.ts
git commit -m "feat(auth): ativar calculo dinamico de isTrialLocked ao expirar 5 dias de teste"
```

---

### Task 3: Atualizar e blindar TrialLockOverlay no frontend

**Files:**

- Modify: `apps/web/src/components/TrialLockOverlay.tsx:25-55,115-145`

**Step 1: Implementar robustez de bloqueio defensivo**

1. Atualizar detecção de bloqueio para:

```typescript
const isLocked = Boolean(
  !isSpecialAccess && (user?.isTrialLocked || (user?.isTrial && user?.trialExpired))
);
const showModal = Boolean(isLocked || modalOpen);
```

2. Garantir que o botão `✕ Fechar` não seja renderizado quando `isLocked === true`.
3. Garantir que o link `Sair da conta` continue disponível e funcional no canto superior direito.

**Step 2: Verificar lint e tipos no frontend**
Run: `pnpm.cmd --filter @energivia/web lint`
Expected: PASS sem erros.

**Step 3: Commit**

```bash
git add apps/web/src/components/TrialLockOverlay.tsx
git commit -m "feat(web): blindar TrialLockOverlay para paywall total no fim do periodo de teste"
```

---

### Task 4: Validação completa de testes, build e envio ao repositório remoto

**Files:**

- Verification: Todo o repositório

**Step 1: Executar testes automatizados no backend**
Run: `pnpm.cmd --filter @energivia/api test`
Expected: Todos os testes aprovados com 100% de sucesso.

**Step 2: Executar build de produção do frontend**
Run: `pnpm.cmd --filter @energivia/web build`
Expected: Build do Next.js compilado com código 0.

**Step 3: Commit e push para origin/main**
Run: `git push origin main`
Expected: Alterações sincronizadas com o repositório remoto conforme regra obrigatória do projeto.
