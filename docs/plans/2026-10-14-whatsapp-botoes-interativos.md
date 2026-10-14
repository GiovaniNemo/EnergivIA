# WhatsApp Interactive Buttons & Lists Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar suporte nativo a Quick Reply Buttons (botões de clique rápido) e Interactive Lists (menus suspensos) no bot de WhatsApp da EnergivIA (Meta Cloud API e Evolution API), com fallback resiliente para texto e normalização de cliques em webhooks.

**Architecture:** O `WhatsappCloudService` ganha métodos dedicados para despacho de mensagens interativas (`sendInteractiveButtons` e `sendInteractiveList`) com fallback automático para texto caso o endpoint retorne erro. O `WhatsappBotService` normaliza os cliques de botões recebidos via Webhook (Meta e Evolution API) para IDs/títulos textuais compatíveis com a máquina de estados existente, e passa a despachar botões e listas nas etapas de menu, telhado, padrão elétrico, kits, preço e templates.

**Tech Stack:** NestJS, TypeScript, Meta WhatsApp Cloud API (v21.0), Evolution API v1/v2, Vitest.

---

### Task 302: Criar tipos interativos e testes unitários para `WhatsappCloudService`

**Files:**

- Create: `apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-send.spec.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-cloud.service.ts:35-55`

**Step 1: Write the failing test**
Criar teste unitário em `apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-send.spec.ts` verificando:

1. `sendInteractiveButtons` formata payload da Meta com `type: "interactive"` e `action.buttons`.
2. `sendInteractiveList` formata payload da Meta com `type: "interactive"` e `action.sections`.
3. Executa fallback para `sendTextMessage` se a chamada interativa falhar (ex: HTTP 400/500).

**Step 2: Run test to verify it fails**
Run: `pnpm --filter @energivia/api test whatsapp-interactive-send`
Expected: FAIL with "sendInteractiveButtons is not a function"

**Step 3: Write minimal implementation in `whatsapp-cloud.service.ts`**
Definir interfaces de botões e listas:

```ts
export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}
```

Implementar `sendInteractiveButtons` e `sendInteractiveList` com detecção de provedor (Meta e Evolution) e fallback automático para texto.

**Step 4: Run test to verify it passes**
Run: `pnpm --filter @energivia/api test whatsapp-interactive-send`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-cloud.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-send.spec.ts
git commit -m "feat(whatsapp): add interactive buttons and list sending with automatic fallback"
```

---

### Task 303: Normalizar cliques de botões e listas nos webhooks (Meta e Evolution)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:540-685`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-webhook-interactive.spec.ts`

**Step 1: Write the failing test**
Criar teste em `apps/api/src/modules/whatsapp/__tests__/whatsapp-webhook-interactive.spec.ts` simulando:

1. Webhook da Meta com `message.type === "interactive"` e `button_reply: { id: "1", title: "Standard" }`.
2. Webhook da Meta com `message.type === "interactive"` e `list_reply: { id: "ceramica", title: "Cerâmica" }`.
3. Webhook da Evolution API com `buttonsResponseMessage: { selectedButtonId: "1" }`.
4. Webhook da Evolution API com `listResponseMessage: { singleSelectReply: { selectedRowId: "2" } }`.
   Verificar se `incomingText` é preenchido com o ID selecionado.

**Step 2: Run test to verify it fails**
Run: `pnpm --filter @energivia/api test whatsapp-webhook-interactive`
Expected: FAIL (interactive messages not parsed to incomingText)

**Step 3: Implement normalization in `whatsapp-bot.service.ts`**
Atualizar `handleWebhookPayload` e `handleEvolutionWebhookPayload`:

- Se `type === "interactive"`: mapeia `button_reply?.id || button_reply?.title` ou `list_reply?.id || list_reply?.title` para `mappedMessage.text = { body: id }`.
- Se `buttonsResponseMessage` ou `listResponseMessage`: mapeia `selectedButtonId` ou `selectedRowId` para `mappedMessage.text = { body: id }`.

**Step 4: Run test to verify it passes**
Run: `pnpm --filter @energivia/api test whatsapp-webhook-interactive`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-webhook-interactive.spec.ts
git commit -m "feat(whatsapp): normalize interactive button and list clicks in webhook handlers"
```

---

### Task 304: Integrar botões e listas interativas nas etapas do fluxo do Bot

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:1100-1145, 2200-2350, 3900-4100`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-flow.spec.ts`

**Step 1: Write the failing test**
Criar teste em `apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-flow.spec.ts`:

1. Quando o bot solicita estrutura do telhado, chama `sendInteractiveList` com as 7 opções.
2. Quando o bot apresenta os kits dimensionados, chama `sendInteractiveButtons` com até 3 opções (`Standard`, `Elite`, `Premium`).
3. Quando o bot pergunta sobre preço padrão, chama `sendInteractiveButtons` com 2 opções (`Preço Padrão`, `Outro Valor`).
4. Quando o bot solicita padrão elétrico, chama `sendInteractiveList` com as 4 opções de rede.

**Step 2: Run test to verify it fails**
Run: `pnpm --filter @energivia/api test whatsapp-interactive-flow`
Expected: FAIL

**Step 3: Implement interactive dispatch in `whatsapp-bot.service.ts`**
Em `processSingleMessage`:

- Detectar se a resposta gerada corresponde a uma etapa interativa (Menu Inicial, Padrão Elétrico, Estrutura do Telhado, Kits, Preço, Templates).
- Despachar via `whatsappCloud.sendInteractiveButtons` ou `sendInteractiveList` para o canal WhatsApp.
- Preservar compatibilidade total com o Web Chat (`processWebChatMessage`).

**Step 4: Run test to verify it passes**
Run: `pnpm --filter @energivia/api test whatsapp-interactive-flow`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-flow.spec.ts
git commit -m "feat(whatsapp): dispatch interactive buttons and lists across sizing stages"
```

---

### Task 305: Executar validação completa, testes de regressão, lint e push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Run all tests in `@energivia/api` and `@energivia/web`**
Run: `pnpm --filter @energivia/api test`
Expected: ALL PASS

**Step 2: Run lint check**
Run: `pnpm --filter @energivia/api lint`
Expected: 0 errors

**Step 3: Update `docs/plans/task.md`**
Marcar todas as tarefas de Task 302 a Task 305 como `completed`.

**Step 4: Commit and push**

```bash
git add docs/plans/task.md
git commit -m "chore(whatsapp): complete interactive buttons and lists implementation"
git push origin main
```
