# Implementação de Opções Interativas (Botões e Listas) no WhatsApp EnergivIA

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Substituir a seleção por digitação de números no WhatsApp por mensagens interativas oficiais (Botões de Resposta Rápida e Menus de Lista / Gaveta Suspensa) em todas as etapas de opções do bot, mantendo fallback resiliente para texto.

**Architecture:**

1. Adicionar métodos de envio interativo (`sendInteractiveListMessage` e `sendInteractiveButtonMessage`) em `WhatsappCloudService` com suporte tanto para a Meta Cloud API oficial quanto para Evolution API, com fallback automático para texto caso o provedor recuse.
2. Atualizar o webhook (`WhatsappWebhookController` e `WhatsappBotService`) para extrair e normalizar eventos do tipo `interactive` (`list_reply` e `button_reply` da Meta e `listResponseMessage` / `buttonsResponseMessage` da Evolution API).
3. Atualizar o `WhatsappBotService` para retornar objetos de resposta ricos (texto + dados interativos de botões/listas opcionais) em vez de apenas strings puras, cobrindo:
   - Menu Principal / Saudação (Lista: Fatura, Consumo, Potência, Módulos, Catálogo)
   - Padrão Elétrico / Tensão (Lista: Monofásico, Bifásico, Trifásico 220V, Trifásico 380V)
   - Estrutura do Telhado (Lista: Cerâmica, Fibrocimento, Metálico, Solo, Laje, Fibrometal, Sem estrutura)
   - Decisão de Taxa por kWp (Botões: Seguir com taxa padrão, Informar outro valor)
   - Seleção de Kits / Distribuidores (Lista ou Botões com os kits cotados)
   - Seleção de Modelo de Proposta Comercial (Lista com os templates disponíveis)
   - Menu de Correção / Alterar Dados (Lista com as opções de ajuste)

**Tech Stack:** NestJS, TypeScript, Meta Graph API v21.0, Evolution API v2, Prisma.

---

### Task 1: Interfaces e Estruturas de Dados Interativas no WhatsApp

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-cloud.service.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`

**Step 1:** Definir interfaces para opções de lista (`InteractiveListSection`, `InteractiveListRow`) e botões (`InteractiveButtonOption`).
**Step 2:** Adicionar tipo `interactive` e campos `interactive` na interface `WebhookMessage`.
**Step 3:** Validar com TypeScript (`npx tsc --noEmit` em `apps/api`).

---

### Task 2: Implementação de Envio Interativo no `WhatsappCloudService`

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-cloud.service.ts`

**Step 1:** Implementar `sendInteractiveListMessage` para Meta Cloud API (payload `type: "interactive"`, `interactive.type: "list"`).
**Step 2:** Implementar envio de lista via Evolution API (`/message/sendList/{instance}`) com fallback para texto se houver erro.
**Step 3:** Implementar `sendInteractiveButtonMessage` para Meta Cloud API (`interactive.type: "button"`) e Evolution API (`/message/sendButtons/{instance}`).
**Step 4:** Adicionar tratamento defensivo para nunca quebrar o fluxo caso a API do WhatsApp recuse o formato interativo.

---

### Task 3: Suporte a Webhooks Interativos (`list_reply` e `button_reply`)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`

**Step 1:** No processamento da Meta Cloud API em `processSingleMessage`, capturar `message.type === "interactive"` e extrair `list_reply` ou `button_reply` (armazenando `id` e `title`).
**Step 2:** No processamento da Evolution API em `handleEvolutionWebhookPayload`, extrair `listResponseMessage` e `buttonsResponseMessage` para `mappedMessage.interactive`.
**Step 3:** Mapear a resposta clicada para `incomingText` e metadados da mensagem.

---

### Task 4: Converter Menus e Etapas para Mensagens Interativas no `WhatsappBotService`

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`

**Step 1:** Refatorar `generateBotResponse` para retornar `{ text: string; interactive?: InteractiveMenuPayload }`.
**Step 2:** Configurar Menu Inicial com lista interativa de 5 opções.
**Step 3:** Configurar Padrão Elétrico com lista interativa de 4 opções.
**Step 4:** Configurar Estrutura do Telhado com lista interativa de 7 opções.
**Step 5:** Configurar Taxa por kWp com botões de resposta rápida (Taxa Padrão vs Outro Valor).
**Step 6:** Configurar Escolha de Kit / Distribuidor com lista interativa.
**Step 7:** Configurar Escolha de Modelo de Proposta com lista interativa de templates.
**Step 8:** Configurar Menu de Alterar / Corrigir Dados com lista interativa.

---

### Task 5: Validação, Testes e Verificação

**Files:**

- Testes unitários do módulo WhatsApp ou script de verificação
- Executar lint e verificação de tipagem TypeScript

**Step 1:** Executar `pnpm --filter @energivia/api build` ou verificação de tipos.
**Step 2:** Executar testes existentes para garantir que não houve regressão.
**Step 3:** Atualizar `docs/plans/task.md`.
**Step 4:** Fazer commit e push das alterações para o repositório.
