# Plano de Implementação: Captura do Valor da Conta de Luz no WhatsApp e Sincronização com Templates

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Capturar o valor médio em R$ da conta de luz no fluxo do WhatsApp (com fast-forward se já extraído de fatura/texto), calcular a tarifa real por kWh e sincronizar 100% com os templates de proposta (eliminando valores fictícios de exemplo/mock nos cards de antes/depois e economia).

**Architecture:**

1. Adicionar o estado `AWAITING_BILL_VALUE` na FSM do WhatsApp com pulo automático inteligente caso o valor já tenha sido lido via OCR/IA de fatura ou fornecido no texto inicial.
2. Calcular deterministicamente a tarifa da energia (`energyPriceKwh`) por divisão do valor da conta pelo consumo (ou tarifa regional da UF da cidade) e persistir na `Simulation`.
3. Atualizar `public-proposal-variables.ts` para renderizar `comparacao_antes`, `comparacao_depois`, `conta_mensal_energia` e `cobertura_consumo_pct` com os dados reais calculados, com salvaguarda retroativa para propostas legadas.

**Tech Stack:** TypeScript, NestJS, Prisma, Next.js, Vitest.

---

### Task 1: Parser de Valor Monetário de Conta de Luz (`parseBillValueInput`) e Testes

**Files:**

- Create: `apps/api/src/modules/whatsapp/__tests__/whatsapp-bill-value-parsing.spec.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`

**Step 1: Escrever teste unitário falhando**
Criar `apps/api/src/modules/whatsapp/__tests__/whatsapp-bill-value-parsing.spec.ts` com testes para:

- Formatos numéricos: "850", "850,00", "850.00", "1.250,50"
- Expressões em texto: "conta de 750 reais", "gasto R$ 900", "fatura de 1200", "pago 650 por mês"
- Ignorar números de telefone, CEPs ou potências kWp/kWh
- Identificar comandos de estimar/pular: "0", "pular", "estimar", "não sei"

**Step 2: Executar teste para verificar falha**
`pnpm --filter @energivia/api test whatsapp-bill-value-parsing.spec.ts`

**Step 3: Implementar função `parseBillValueInput`**
Em `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`, exportar `parseBillValueInput(text: string): number | null` e `isSkipBillValueInput(text: string): boolean`.

**Step 4: Executar teste para verificar aprovação**
`pnpm --filter @energivia/api test whatsapp-bill-value-parsing.spec.ts`

**Step 5: Commit**
`git add apps/api/src/modules/whatsapp; git commit -m "feat(whatsapp): parser de valor de conta de luz parseBillValueInput"`

---

### Task 2: Tipagem e FSM para `AWAITING_BILL_VALUE` e Navegação Retroativa

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-state.types.ts`
- Create/Modify: `apps/api/src/modules/whatsapp/__tests__/whatsapp-bill-value-flow.spec.ts`

**Step 1: Atualizar `whatsapp-state.types.ts`**

- Adicionar `| "AWAITING_BILL_VALUE"` ao tipo `WhatsappBotStep`.
- Adicionar `billValue?: number;` em `WhatsappSessionData`.
- Atualizar `STEP_PREVIOUS_MAP`:
  - `AWAITING_GRID_TYPE: "AWAITING_BILL_VALUE"`
  - `AWAITING_BILL_VALUE: "AWAITING_CITY"`
- Atualizar limpeza do `setStep("IDLE")` para deletar `billValue`.

**Step 2: Escrever testes da máquina de estados para o novo passo**
Testar transição entre Cidade -> Valor da Conta -> Padrão de Rede e retrocesso com "0" / "voltar".

**Step 3: Executar testes**
`pnpm --filter @energivia/api test whatsapp-bill-value-flow.spec.ts`

**Step 4: Commit**
`git add apps/api/src/modules/whatsapp/whatsapp-state.types.ts apps/api/src/modules/whatsapp/__tests__; git commit -m "feat(whatsapp): adicionar estado AWAITING_BILL_VALUE e navegacao retroativa"`

---

### Task 3: Fast-Forward da Fatura, Pergunta do Valor e Handler do Estado

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-bill-value-flow.spec.ts`

**Step 1: Captura na extração de fatura e no texto inicial**

- Em `whatsapp-bot.service.ts`, quando `extractionResult.data.valor_total_fatura_reais` existir, salvar em `sessionCtx.billValue`.
- No início do processamento de mensagens em `IDLE`, se o texto trouxer valor da fatura (`parseBillValueInput`), salvar em `sessionCtx.billValue`.

**Step 2: Transição de `AWAITING_CITY` para `AWAITING_BILL_VALUE` com Fast-Forward**

- Ao concluir a definição de Cidade/UF:
  - Se `sessionCtx.billValue` já estiver preenchido (vindo da fatura ou texto inicial), **pula automaticamente** para `AWAITING_GRID_TYPE`.
  - Se não estiver preenchido, transiciona para `AWAITING_BILL_VALUE` e envia a mensagem elegante:

    ```
    💡 *Qual é o valor médio da conta de luz atual em R$?*

    > Digite o valor (ex: *850* ou *850,00*).
    > Ou digite *0* para estimar automaticamente pela tarifa da sua região.
    ```

**Step 3: Handler do Estado `AWAITING_BILL_VALUE`**

- Processar resposta do usuário:
  - Se for valor numérico válido (> R$ 30 e < R$ 500.000): salvar `billValue` e avançar para `AWAITING_GRID_TYPE`.
  - Se for "0", "estimar", "pular" ou "não sei": avançar para `AWAITING_GRID_TYPE` mantendo `billValue` vazio (ativa tarifa regional).
  - Se for comando de voltar: retornar a `AWAITING_CITY`.

**Step 4: Executar testes de integração do fluxo**
`pnpm --filter @energivia/api test whatsapp-bill-value-flow.spec.ts`

**Step 5: Commit**
`git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts; git commit -m "feat(whatsapp): fluxo e handler de captura do valor da conta com fast-forward"`

---

### Task 4: Cálculo da Tarifa (`energyPriceKwh`) e Persistência na Simulação

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-bill-value-flow.spec.ts`

**Step 1: Adicionar tabela de tarifas médias regionais por UF**
Em `whatsapp-bot.service.ts`, definir mapa de tarifas médias para concessionárias brasileiras por UF com fallback seguro (R$ 0,88/kWh).

**Step 2: Calcular `energyPriceKwh` e economia real**

- Se `billValue` informado:
  `energyPriceKwh = Math.min(2.5, Math.max(0.4, Math.round((billValue / effectiveConsumption) * 10000) / 10000))`
- Se não informado:
  `energyPriceKwh = getUfAverageTariff(sessionCtx.estado)`
- Calcular economia mensal baseada na tarifa real:
  `const monthlySavingsVal = Math.round(effectiveConsumption * energyPriceKwh * 0.95);`
- Calcular payback real baseado nessa economia.

**Step 3: Persistir `energyPriceKwh` em `this.prisma.simulation.create`**
Passar `energyPriceKwh` dentro do objeto `input` da Simulação criada no passo 5 do fechamento de proposta.

**Step 4: Executar testes e validar persistência**
`pnpm --filter @energivia/api test whatsapp-bill-value-flow.spec.ts`

**Step 5: Commit**
`git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts; git commit -m "feat(whatsapp): calculo de tarifa real e persistencia de energyPriceKwh na simulacao"`

---

### Task 5: Sincronização 100% com Templates de Propostas e Salvaguarda Anti-Mock

**Files:**

- Modify: `apps/web/src/lib/public-proposal-variables.ts`
- Create/Modify: `apps/web/src/lib/__tests__/public-proposal-variables.spec.ts`

**Step 1: Escrever teste unitário para preenchimento de variáveis**

- Testar que quando `energyPriceKwh` e `monthlyConsumptionKwh` existem:
  - `conta_mensal_energia` é calculado corretamente.
  - `comparacao_antes` recebe `formatBRL(monthlyBill)`.
  - `comparacao_depois` recebe `formatBRL(monthlyBill - monthlySavings)`.
  - `cobertura_consumo_pct` é percentual exato da economia sobre a conta.
- Testar salvaguarda quando `energyPriceKwh` está ausente (propostas antigas):
  - Infere tarifa por `monthlySavings / monthlyConsumption` ou 0.88.
  - Sobrescreve placeholders de exemplo (como "R$ 850,00") com o valor calculado.

**Step 2: Implementar melhorias em `public-proposal-variables.ts`**

- Resolver `energyPrice = input.energyPriceKwh || (sizingIn?.monthlyConsumptionKwh && result.monthlySavings ? result.monthlySavings / sizingIn.monthlyConsumptionKwh : 0.88)`.
- Preencher com segurança `conta_mensal_energia`, `comparacao_antes`, `comparacao_depois` e `cobertura_consumo_pct`.

**Step 3: Executar testes no frontend**
`pnpm --filter @energivia/web test public-proposal-variables.spec.ts`

**Step 4: Commit**
`git add apps/web/src/lib; git commit -m "feat(proposals): sincronizacao de valores reais de conta e salvaguarda anti-mock em templates"`

---

### Task 6: Validação Completa, Testes Automatizados, Build e Push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar suite de testes do backend**
`pnpm --filter @energivia/api test`

**Step 2: Executar suite de testes do frontend**
`pnpm --filter @energivia/web test`

**Step 3: Executar build de produção**
`pnpm build`

**Step 4: Atualizar `docs/plans/task.md` com status de conclusão**

**Step 5: Git commit e push**
`git add .; git commit -m "feat: captura de valor da conta de luz no WhatsApp e integracao completa com templates de proposta"; git push origin main`
