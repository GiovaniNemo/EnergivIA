# Modal de Avaliação Central com Backdrop Blur e Bloqueio Pós-Resposta Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Centralizar o modal de avaliação no meio da tela com fundo embaçado (`backdrop-blur`), tamanho confortável (`max-w-xl`) e bloqueio permanente e duplo (frontend + backend) para nunca mais reaparecer após ser respondido.

**Architecture:** O modal `FeedbackPromptCard.tsx` passa a ser um diálogo modal em tela cheia com overlay escuro e desfoque (`backdrop-blur-md`). No carregamento, ele consulta tanto o `localStorage` quanto um endpoint leve no backend (`GET /api/feedbacks/status`) para checar se o usuário ou organização já enviou avaliação. Ao enviar, grava o status e oculta também o atalho de avaliação no `EnergiviaFloatingHub.tsx`.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, Lucide Icons, NestJS, Prisma, Vitest.

---

### Task 1: Backend - Endpoint e Método de Verificação de Status de Feedback (`GET /feedbacks/status`)

**Files:**

- Modify: `apps/api/src/modules/feedbacks/feedbacks.service.ts`
- Modify: `apps/api/src/modules/feedbacks/feedbacks.controller.ts`
- Test: `apps/api/src/modules/feedbacks/feedbacks.service.spec.ts`

**Step 1: Escrever teste unitário para verificação de feedback do usuário**
Verificar se o service retorna `{ hasSubmitted: true }` quando o usuário já registrou feedback e `false` caso contrário.

**Step 2: Rodar teste para verificar falha inicial**
Executar Vitest no backend.

**Step 3: Implementar método `getUserFeedbackStatus` no service e endpoint no controller**
Implementar consulta ao Prisma filtrando por `userId`, `tenantId` ou `userEmail`.

**Step 4: Rodar teste para verificar aprovação**
Executar Vitest e garantir aprovação.

---

### Task 2: Frontend - Rota de API Proxy `GET /api/feedbacks/status`

**Files:**

- Create: `apps/web/src/app/api/feedbacks/status/route.ts`

**Step 1: Criar rota `GET /api/feedbacks/status` com headers de autenticação**
Repassa a requisição ao backend com cabeçalho de tenant/usuário para obter `{ hasSubmitted: boolean }`.

---

### Task 3: Frontend - Refatorar `FeedbackPromptCard.tsx` para Modal Central com Backdrop Blur

**Files:**

- Modify: `apps/web/src/components/feedback/FeedbackPromptCard.tsx`

**Step 1: Atualizar layout e posicionamento**
Substituir o card flutuante no canto inferior direito por um modal centralizado:

- Container: `fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto`
- Backdrop: `fixed inset-0 bg-[#02040a]/80 backdrop-blur-md transition-opacity`
- Card: `w-full max-w-xl bg-neutral-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl`
- Elementos ampliados: estrelas maiores com escala suave, tags organizadas, textarea ampliada e botões confortáveis.

**Step 2: Implementar bloqueio permanente e verificação de status**

- Ao montar, verificar `hasSubmitted` no `localStorage` e via `/api/feedbacks/status`.
- Se já respondeu, não exibir em nenhuma hipótese.
- Ao responder com sucesso, salvar no `localStorage` (`energivia_feedback_submitted`, `energivia_feedback_submitted_${user.id}`) e emitir evento `feedback-submitted-changed`.

---

### Task 4: Frontend - Sincronizar Hub Flutuante (`EnergiviaFloatingHub.tsx`)

**Files:**

- Modify: `apps/web/src/components/layout/EnergiviaFloatingHub.tsx`

**Step 1: Ocultar botão "Avaliar EnergivIA" se já respondido**
Verificar se o feedback já foi enviado para remover a bolinha de avaliação do menu orbital, mantendo apenas o Assistente IA.

---

### Task 5: Validação, Testes Automatizados e Build

**Files:**

- Testes: Vitest backend
- Build: Next.js frontend

**Step 1: Rodar testes unitários do backend**
Verificar aprovação de todos os testes.

**Step 2: Rodar checagem de tipos/build do Next.js**
Garantir que a compilação passe sem erros.

---

### Task 6: Commit e Push

**Step 1: Git commit e push para origin/main**
Comitar todas as alterações e sincronizar com o repositório remoto.
