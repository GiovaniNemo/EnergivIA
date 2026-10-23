# Cotações de Microinversor e Inversor Híbrido no WhatsApp - Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar o suporte completo a cotações solares com Microinversores e Inversores Híbridos (com baterias e regras técnicas HV/LV Deye) no bot do WhatsApp sem adicionar atrito ou perguntas obrigatórias ao fluxo convencional de inversores String.

**Architecture:** Adicionar detecção inteligente de entidades de inversores e baterias no WhatsApp, estender a persistência de contexto da sessão (sessionCtx/sessionData), criar o passo conversacional aberto de baterias `AWAITING_BATTERY_STORAGE` para sistemas híbridos, aplicar travas de segurança técnicas de Alta Tensão (HV: mínimo 4 baterias + BMS incluso) e conectar esses parâmetros ao motor de kits existente ([KitGenerationService](file:///c:/Users/Giovani/EnergivIA/apps/api/src/modules/kit/kit-generation.service.ts)).

**Tech Stack:** NestJS, TypeScript, Vitest, Prisma, WhatsApp Cloud API FSM.

---

### Task 1: Extensão de Tipagens e DTOs da Sessão WhatsApp

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-state.types.ts:6-60`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:600-630`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts`

**Step 1: Escrever teste unitário para validar novas tipagens e transições de estado**
Adicionar em `apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts` testes garantindo que o novo estado `AWAITING_BATTERY_STORAGE` esteja mapeado em `STEP_PREVIOUS_MAP` e seja reconhecido pela FSM.

**Step 2: Executar teste e verificar falha esperada**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts`
Expected: FAIL com tipo ou chave desconhecida.

**Step 3: Implementar as extensões de tipos**
Em `whatsapp-state.types.ts`:

- Adicionar `"AWAITING_BATTERY_STORAGE"` em `WhatsappBotStep`.
- Adicionar em `WhatsappSessionData`:
  ```typescript
  inverterType?: "string" | "microinverter" | "hybrid" | "off_grid";
  batteryKwh?: number;
  batteryQty?: number;
  batteryVoltageType?: "LV" | "HV";
  hasBms?: boolean;
  ```
- Em `STEP_PREVIOUS_MAP`, mapear `AWAITING_BATTERY_STORAGE: "AWAITING_GRID_TYPE"`.

Em `whatsapp-bot.service.ts`:

- Atualizar `ExtractedIntegratorQuote` com `inverterType`, `batteryKwh`, `batteryQty`.

**Step 4: Executar testes e verificar aprovação**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-state.types.ts apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-state-machine.spec.ts
git commit -m "feat(whatsapp): add battery storage step and hybrid inverter session types"
```

---

### Task 2: Parser de Entidades de Microinversor, Inversor Híbrido e Baterias (kWh e Unidades)

**Files:**

- Create: `apps/api/src/modules/whatsapp/__tests__/whatsapp-micro-hybrid-parsing.spec.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:620-730`

**Step 1: Escrever testes unitários para extração de entidades**
Cobrir cenários:

- "Quero cotar 10 placas com microinversor em Maringá/PR" -> `inverterType: "microinverter"`
- "Cotação 8 placas hoymiles 585w" -> `inverterType: "microinverter"`
- "Sistema 800 kwh inversor híbrido com 10 kwh de bateria em Campinas/SP" -> `inverterType: "hybrid"`, `batteryKwh: 10`
- "Kit 5kw híbrido deye com 2 baterias" -> `inverterType: "hybrid"`, `batteryQty: 2`
- "Híbrido sem bateria" -> `inverterType: "hybrid"`, `batteryQty: 0`

**Step 2: Executar teste e verificar falha**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-micro-hybrid-parsing.spec.ts`
Expected: FAIL porque `parseIntegratorQuoteEntities` ainda não extrai esses campos.

**Step 3: Implementar regex e lógica de extração em `parseIntegratorQuoteEntities`**

- Detectar termos de microinversor e marcas associadas (`hoymiles`, `apsystems`, `tsun`, `delsolar micro`).
- Detectar termos de híbrido (`híbrido`, `hibrido`, `hybrid`, `deye híbrido`, `offgrid`).
- Detectar baterias em kWh e quantidade de unidades.

**Step 4: Executar testes e verificar aprovação**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-micro-hybrid-parsing.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-micro-hybrid-parsing.spec.ts
git commit -m "feat(whatsapp): implement entity parsing for microinverters and hybrid batteries"
```

---

### Task 3: Estado Conversacional Aberto de Baterias e Trava Técnica Deye HV/LV

**Files:**

- Create: `apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-flow.spec.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:5100-5300, 6800-7000`

**Step 1: Escrever testes unitários para a FSM do fluxo híbrido**

- Testar transição para `AWAITING_BATTERY_STORAGE` quando for híbrido sem bateria definida.
- Testar resposta em aberto com kWh (ex: "10 kWh").
- Testar resposta em aberto com quantidade (ex: "2 baterias").
- Testar resposta "sem bateria" ou "0".
- Testar trava técnica de Alta Tensão (HV): se for Deye HV ou usina comercial trifásica de alta tensão, garantir mínimo de 4 baterias + BMS incluso automaticamente.
- Testar validação de tensão Monofásico 220V vs Bifásico 127/220V.

**Step 2: Executar teste e verificar falha**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-flow.spec.ts`
Expected: FAIL.

**Step 3: Implementar o handler do passo `AWAITING_BATTERY_STORAGE` e as regras de HV/LV**

- Adicionar o bloco de tratamento no loop de estados do bot.
- Implementar as validações de barramento CC (HV: mínimo 4 baterias + BMS flag; LV: livre a partir de 1 unidade).
- Persistir em `sessionCtx` e `sessionData`.

**Step 4: Executar testes e verificar aprovação**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-flow.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-flow.spec.ts
git commit -m "feat(whatsapp): add open battery sizing step and Deye HV technical safety rules"
```

---

### Task 4: Integração de Microinversor e Híbrido com Cálculo de Kits (`KitGenerationService`)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:3230-3370, 5025-5040, 5965-5985`
- Test: `apps/api/src/modules/kit/__tests__/kit-generation-tiers.spec.ts`

**Step 1: Escrever testes unitários de integração garantindo repasse de tecnologia**

- Verificar que `calculateDistributorKits` respeita `inverterType: "microinverter"` e monta kits com múltiplos microinversores.
- Verificar que para `inverterType: "hybrid"` com baterias, inclui os itens de baterias e BMS em `kit_items` / `structuredItems`.

**Step 2: Executar teste e verificar falha ou comportamento atual**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/kit/__tests__/kit-generation-tiers.spec.ts`

**Step 3: Implementar o repasse de parâmetros em `kitsFor` e `calculateDistributorKits`**

- Passar `inverterType: sessionCtx.inverterType` em todos os pontos de chamada (`kitsFor`, `calculateDistributorKits`).
- Se for híbrido com bateria, consultar baterias ativas via `productRepo.findActiveBatteries` e BMS via `productRepo.findActiveBms`.
- Incorporar as linhas de bateria e BMS no total do kit e nos itens estruturados.

**Step 4: Executar testes e validar aprovação**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-flow.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/kit/kit-generation.service.ts
git commit -m "feat(whatsapp): connect microinverter and hybrid battery kit generation"
```

---

### Task 5: Apresentação no WhatsApp e Comando Rápido de Alternância (`formatQuotesListText`)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:3770-3840, 5800-5900`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-web-chat-sync.spec.ts`

**Step 1: Escrever teste unitário para apresentação de itens e troca rápida**

- Verificar que na listagem de kits, para microinversores exibe `${qty}x Microinversores...`.
- Verificar que para híbrido com baterias, exibe `${qty}x Baterias de Lítio...` e `BMS...`.
- Verificar que ao enviar `micro`, `hibrido` ou `string` na tela de kits, o bot recalcula a mesma usina com a nova tecnologia.

**Step 2: Executar teste e verificar falha**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-web-chat-sync.spec.ts`

**Step 3: Implementar formatação visual e interceptador de troca rápida**

- Em `formatQuotesListText`, refinar a descrição dos itens.
- Adicionar linha discreta de rodapé com dica de troca de tecnologia.
- Na interceptação de mensagens na etapa `AWAITING_KIT_SELECTION`, se a mensagem for `micro`, `hibrido` ou `string`, alternar `sessionCtx.inverterType` e disparar o recálculo imediato.

**Step 4: Executar testes e validar**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/__tests__/whatsapp-web-chat-sync.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-web-chat-sync.spec.ts
git commit -m "feat(whatsapp): format microinverter and hybrid kit items and add quick switch command"
```

---

### Task 6: Validação Completa da Suíte de Testes e Compilação

**Files:**

- All touched files

**Step 1: Executar suíte completa de testes no backend**
Run: `pnpm --filter @energivia/api test`
Expected: 100% dos testes aprovados, sem nenhuma regressão.

**Step 2: Executar lint e verificação de tipos**
Run: `pnpm --filter @energivia/api build`
Expected: Código de saída 0.

**Step 3: Commit e Push**

```bash
git push origin main
```
