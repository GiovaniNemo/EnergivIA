# Unificação de Geração Estimada e Exibição por Kit (WhatsApp, Web Bot e Modal)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Eliminar a confusão na apresentação dos kits no WhatsApp e Web Bot (removendo a potência/geração fixa de cabeçalho que puxava apenas do Kit 1 e exibindo os valores específicos dentro de cada opção de kit) e unificar a fórmula de dimensionamento com perdas de engenharia (PR 0.85) entre o Modal Web e o motor do Bot.

**Architecture:**

1. Em `whatsapp-bot.service.ts`: refatorar `formatQuotesListText` para remover o cabeçalho global com potência/geração fixa do `quotes[0]`. Inserir potência e geração estimada calculadas individualmente dentro de cada opção de kit (`Opção 1`, `Opção 2`, `Opção 3`).
2. Em `apps/web/src/app/api/chat/route.ts`: assegurar a persistência e propagação dos metadados de localidade (`cidade`, `uf`) no histórico de mensagens do chat web para o motor unificado.
3. Em `packages/proposal-economia`: ajustar `irradiacaoFromSolarResource` / `simulateProposal` para aplicar o fator de perdas de engenharia do sistema (PR = 0.85) de forma consistente com o HSP regional.
4. Escrever e atualizar testes no Vitest cobrindo toda a nova formatação e cálculo, validar build e sincronizar com commit e push.

**Tech Stack:** TypeScript, NestJS, Next.js, Vitest, `@energivia/proposal-economia`.

---

### Task 1: Refatorar formatação de kits no bot para exibir potência e geração por opção individual

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-web-chat-sync.spec.ts`

**Step 1:** Atualizar os testes para esperar a potência e geração em cada item da lista em vez de cabeçalho unificado.
**Step 2:** Rodar o teste para verificar a falha com a nova expectativa.
**Step 3:** Implementar a alteração em `formatQuotesListText`.
**Step 4:** Rodar os testes para verificar aprovação.

---

### Task 2: Harmonizar o fator de rendimento solar com perdas de engenharia (PR 0.85) em proposal-economia

**Files:**

- Modify: `packages/proposal-economia/src/index.ts`
- Test: `packages/proposal-economia/src/__tests__/proposal-economia.spec.ts`

**Step 1:** Atualizar os testes de `proposal-economia` para refletir o fator com perdas de engenharia fotovoltaica (PR 0.85).
**Step 2:** Rodar os testes do pacote.
**Step 3:** Ajustar a lógica de geração base em `packages/proposal-economia/src/index.ts`.
**Step 4:** Rodar os testes para validar aprovação.

---

### Task 3: Sincronização de localidade no Web Chat (/api/chat)

**Files:**

- Modify: `apps/web/src/app/api/chat/route.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-web-chat-sync.spec.ts`

**Step 1:** Garantir injeção de metadata de cidade/UF nas mensagens enviadas ao endpoint `web-chat`.
**Step 2:** Validar a integração ponta a ponta com testes automatizados.

---

### Task 4: Verificação completa, build, commit e push

**Files:**

- Repository-wide verification
- Git sync to origin/main
