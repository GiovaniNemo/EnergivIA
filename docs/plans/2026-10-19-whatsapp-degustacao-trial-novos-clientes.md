# WhatsApp Degustação Trial (3 Cotações para Novos Clientes) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Permitir que novos integradores e prospects sem cadastro prévio experimentem o assistente de IA no WhatsApp realizando até 3 cotações solares completas com modelo e taxa de referência padrão da EnergivIA, sem bloqueio inicial e com mensagens no padrão institucional.

**Architecture:**

1. Organização de Sistema Compartilhada (`slug: degustacao-whatsapp`) que fornece contexto relacional válido para criação de `Conversation`, `Deal`, `Simulation` e `Proposal`.
2. Interceptador de número não autorizado em `whatsapp-bot.service.ts`: ao invés de barrar com mensagem comercial, verifica se o número já consumiu as 3 cotações de teste.
3. Rastreamento persistente de cota no `metadata` da conversa (`trialQuotesUsed`, `trialMaxQuotes: 3`).
4. Saudação e menus verticais formatados em cards, menção a EnergivIA (sem Solar), aplicação automática do Modelo Oficial EnergivIA e mensagem comemorativa de progresso a cada cotação entregue até o encerramento da degustação.

**Tech Stack:** NestJS, Prisma ORM, WhatsApp Cloud API (Evolution), Vitest.

---

### Task 1: Serviço de Resolução e Garantia da Organização Demonstração

**Files:**

- Create/Modify: `apps/api/src/modules/whatsapp/services/whatsapp-guest-trial.service.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-core.module.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-guest-trial.spec.ts`

**Step 1: Escrever teste unitário para o serviço de degustação**

- Verificar se `getOrCreateDemoTenant()` busca ou cria a organização `degustacao-whatsapp` com plano ativo e configurações adequadas.
- Verificar se `getGuestTrialStatus(phone)` retorna status de cota (`used`, `remaining: 3`, `allowed: true/false`).
- Verificar se `recordGuestProposalCompleted(conversationId, proposalId)` incrementa a cota corretamente.

**Step 2: Executar teste e verificar que falha**

- Rodar: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-guest-trial.spec.ts`

**Step 3: Implementar `WhatsappGuestTrialService`**

- Injetar PrismaService.
- Implementar `getOrCreateDemoTenant()`.
- Implementar `getGuestTrialInfo(conversation)`.
- Implementar `consumeTrialQuote(conversationId, proposalId)`.

**Step 4: Registrar `WhatsappGuestTrialService` no `whatsapp-core.module.ts`**

- Exportar o serviço para injeção no `WhatsappBotService`.

**Step 5: Executar teste e verificar aprovação**

- Rodar: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-guest-trial.spec.ts`
- Esperado: PASS.

**Step 6: Commit**

- Mensagem: `feat(whatsapp): servico de resolucao da organizacao demonstracao e cotas de degustacao`

---

### Task 2: Atualização do Roteamento no WhatsAppBotService

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:1008-1065`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-guest-trial.spec.ts`

**Step 1: Escrever teste para o roteamento de número não cadastrado**

- Verificar que número novo entra no fluxo de degustação vinculado à organização demo.
- Verificar que se o número já usou 3 cotações, recebe a mensagem amigável de encerramento da degustação com link de planos.

**Step 2: Executar teste e verificar falha**

**Step 3: Implementar o desvio de rota em `whatsapp-bot.service.ts`**

- Em `processSingleMessage`: se `!tenant`, consultar `guestTrialService`.
- Se `trialInfo.allowed === false`: responder com mensagem educada de encerramento da degustação.
- Se `trialInfo.allowed === true`: assumir o `tenant` da organização demo e marcar a conversa como `isGuestTrial: true`.

**Step 4: Executar testes e verificar aprovação**

- Rodar: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-guest-trial.spec.ts`

**Step 5: Commit**

- Mensagem: `feat(whatsapp): roteamento de novos prospects para modo degustacao trial`

---

### Task 3: Padronização das Mensagens de Saudação e Menu Vertical

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts`

**Step 1: Escrever teste para a saudação de degustação**

- Validar formato com menção a "EnergivIA" (sem Solar).
- Validar que opções de menu aparecem estritamente uma abaixo da outra com `> 1️⃣`, `> 2️⃣`, `> 3️⃣`, `> 4️⃣`.
- Validar exibição do saldo de cotações restantes.

**Step 2: Executar teste e verificar falha**

**Step 3: Implementar `buildGuestGreetingMenu(trialQuotesRemaining: number)`**

- Implementar o método gerador do menu respeitando a diagramação aprovada.
- Aplicar nas saudações e comandos de reinício quando `isGuestTrial: true`.

**Step 4: Executar testes e verificar aprovação**

**Step 5: Commit**

- Mensagem: `feat(whatsapp): formatacao de saudacao e menu vertical para degustacao`

---

### Task 4: Fluxo de Cotação em Degustação (Template Padrão Direto e Incremento de Cota)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-guest-trial.spec.ts`

**Step 1: Escrever teste para proposta em degustação**

- Validar que em `isGuestTrial`, pula seleção de template e aplica direto o Modelo Oficial Padrão.
- Validar que pergunta do nome do cliente final permanece ativa.
- Validar que ao concluir a proposta (`PROPOSAL_COMPLETED`), incrementa `trialQuotesUsed` e envia o contador `[1 de 3]`.

**Step 2: Executar teste e verificar falha**

**Step 3: Implementar regras de degustação no passo de proposta**

- Em `AWAITING_CLIENT_NAME` / `AWAITING_TEMPLATE_CHOICE`: se `isGuestTrial`, resolver automaticamente `defaultTemplate` oficial e disparar criação de proposta.
- Na entrega da proposta: anexar mensagem comemorativa com indicador de cotações utilizadas `[X de 3]` e dica sobre a plataforma web.

**Step 4: Executar testes e verificar aprovação**

**Step 5: Commit**

- Mensagem: `feat(whatsapp): aplicacao de modelo padrao e debito de cota na proposta de degustacao`

---

### Task 5: Validação Completa, Testes de Regressão e Verificação Final

**Files:**

- Testes: `apps/api/src/modules/whatsapp/__tests__/*.spec.ts`

**Step 1: Rodar todos os testes de WhatsApp**

- Rodar: `pnpm --filter @energivia/api test`

**Step 2: Rodar linting e validação de types**

- Rodar: `pnpm --filter @energivia/web lint`

**Step 3: Commit e push final para origin/main**

- Enviar as melhorias com segurança e sem erros.
