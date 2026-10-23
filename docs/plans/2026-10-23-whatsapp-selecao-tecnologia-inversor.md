# Seleção Evidente de Tecnologia de Inversor no WhatsApp (String, Micro e Híbrido) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Tornar a escolha entre Inversor Tradicional (String), Microinversor e Inversor Híbrido com baterias totalmente evidente no fluxo de cotações do WhatsApp da EnergivIA, adicionando uma etapa conversacional dedicada (`AWAITING_INVERTER_TYPE`) com _fast-forward_ inteligente e retrocesso limpo.

**Architecture:** A Máquina de Estados Finita (FSM) do WhatsApp recebe o estado `AWAITING_INVERTER_TYPE` posicionado entre a definição do telhado (`AWAITING_ROOF_TYPE`) e a seleção de kits (`AWAITING_KIT_SELECTION`) ou armazenamento (`AWAITING_BATTERY_STORAGE`). O menu inicial ganha visibilidade explícita de tecnologias suportadas e a recuperação de contexto em histórico é blindada contra bugs de caracteres residuais.

**Tech Stack:** NestJS, TypeScript, Vitest, Prisma.

---

### Task 687: Tipagem e FSM para `AWAITING_INVERTER_TYPE`

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-state.types.ts:6-20,73-85`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts`

**Step 1: Escrever teste unitário falhando para o novo estado e retrocesso**
Adicionar em `whatsapp-state-machine.spec.ts` testes validando que `STEP_PREVIOUS_MAP.AWAITING_INVERTER_TYPE === "AWAITING_ROOF_TYPE"`, `STEP_PREVIOUS_MAP.AWAITING_BATTERY_STORAGE === "AWAITING_INVERTER_TYPE"` e `STEP_PREVIOUS_MAP.AWAITING_KIT_SELECTION === "AWAITING_INVERTER_TYPE"`.

**Step 2: Executar teste para verificar que falha**
Run: `pnpm --filter @energivia/api test whatsapp-state-machine.spec.ts`
Expected: FAIL

**Step 3: Implementar tipos e mapa de transição**
Atualizar `WhatsappBotStep` e `STEP_PREVIOUS_MAP` em `whatsapp-state.types.ts`.

**Step 4: Executar teste para verificar que passa**
Run: `pnpm --filter @energivia/api test whatsapp-state-machine.spec.ts`
Expected: PASS

**Step 5: Atualizar task.md e commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-state.types.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts docs/plans/task.md
git commit -m "feat(whatsapp): add AWAITING_INVERTER_TYPE state and step mapping (task-687)"
```

---

### Task 688: Mensagem de Tecnologia e Transição de Telhado (`AWAITING_ROOF_TYPE -> AWAITING_INVERTER_TYPE`)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-inverter-type-flow.spec.ts`

**Step 1: Escrever testes unitários para a transição de telhado**
Criar teste verificando que, ao responder a estrutura do telhado, o bot transiciona para `AWAITING_INVERTER_TYPE` e envia as opções de tecnologia caso o inversor ainda não esteja pré-definido, ou executa _fast-forward_ se já estiver definido.

**Step 2: Executar teste para verificar que falha**
Run: `pnpm --filter @energivia/api test whatsapp-inverter-type-flow.spec.ts`
Expected: FAIL

**Step 3: Implementar `INVERTER_TYPE_OPTIONS_TEXT` e transição**
Em `whatsapp-bot.service.ts`:

- Adicionar constante `INVERTER_TYPE_OPTIONS_TEXT`.
- Na resposta de telhado (e no atalho onde telhado já era conhecido após padrão), direcionar para `AWAITING_INVERTER_TYPE` com `INVERTER_TYPE_OPTIONS_TEXT` se `sessionCtx.inverterType` não estiver definido.

**Step 4: Executar teste para verificar que passa**
Run: `pnpm --filter @energivia/api test whatsapp-inverter-type-flow.spec.ts`
Expected: PASS

**Step 5: Atualizar task.md e commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-inverter-type-flow.spec.ts docs/plans/task.md
git commit -m "feat(whatsapp): prompt inverter technology after roof structure (task-688)"
```

---

### Task 689: Handler do Estado `AWAITING_INVERTER_TYPE` (Opções 1, 2, 3 e Voltar 0)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-inverter-type-flow.spec.ts`

**Step 1: Escrever testes unitários para escolha de cada tecnologia**
Testar:

- `1` / `string` -> vai para `AWAITING_KIT_SELECTION` com kits string.
- `2` / `micro` -> vai para `AWAITING_KIT_SELECTION` com kits microinversor.
- `3` / `híbrido` -> vai para `AWAITING_BATTERY_STORAGE`.
- `0` / `voltar` -> volta para `AWAITING_ROOF_TYPE`.

**Step 2: Executar teste para verificar que falha**
Run: `pnpm --filter @energivia/api test whatsapp-inverter-type-flow.spec.ts`
Expected: FAIL

**Step 3: Implementar handler de `AWAITING_INVERTER_TYPE`**
Processar as opções com aliases semânticos e tratamento de erro com reapresentação das opções.

**Step 4: Executar teste para verificar que passa**
Run: `pnpm --filter @energivia/api test whatsapp-inverter-type-flow.spec.ts`
Expected: PASS

**Step 5: Atualizar task.md e commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-inverter-type-flow.spec.ts docs/plans/task.md
git commit -m "feat(whatsapp): handle inverter technology selection and transitions (task-689)"
```

---

### Task 690: Atualização do Menu Inicial (`buildGreetingMenu`) e Correção do Regex Residual de Telhado (`)_`)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-greeting-redundancy.spec.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-inverter-type-flow.spec.ts`

**Step 1: Escrever testes unitários**

- Teste verificando que o menu inicial menciona suporte a String, Micro e Híbrido sem quebrar mensagens institucionais.
- Teste verificando que a extração de histórico de `roofType` ignora caracteres soltos como `)_` e preserva o tipo real.

**Step 2: Executar testes para verificar que falha**
Run: `pnpm --filter @energivia/api test whatsapp-greeting-redundancy.spec.ts`
Expected: FAIL/PASS conforme o caso

**Step 3: Implementar atualização no menu e sanitização no regex de telhado**
Em `whatsapp-bot.service.ts`:

- Atualizar `buildGreetingMenu` e `buildGuestGreetingMenu`.
- Ajustar regex de extração de telhado com whitelist estrita de estruturas válidas.

**Step 4: Executar testes para verificar que passa**
Run: `pnpm --filter @energivia/api test whatsapp-greeting-redundancy.spec.ts`
Expected: PASS

**Step 5: Atualizar task.md e commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-greeting-redundancy.spec.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-inverter-type-flow.spec.ts docs/plans/task.md
git commit -m "fix(whatsapp): clarify tech options in greeting menu and fix roof extraction regex (task-690)"
```

---

### Task 691: Validação Completa de Testes, Compilação NestJS/NextJS, Commit e Push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Rodar a suíte completa de testes do WhatsApp e backend**
Run: `pnpm --filter @energivia/api test`
Expected: 100% de sucesso (480+ testes passando).

**Step 2: Rodar build de compilação da API**
Run: `pnpm --filter @energivia/api build`
Expected: Código de saída 0 sem erros de TypeScript.

**Step 3: Atualizar task.md com status completed para todas as tarefas**

**Step 4: Commit e push final**

```bash
git add .
git commit -m "feat(whatsapp): complete explicit inverter technology selection flow (task-691)"
git push origin main
```
