# Design: Captura do Valor da Conta de Luz no WhatsApp e Sincronização com Templates de Propostas

## Contexto & Objetivo

No fluxo de cotação via WhatsApp, o bot solicitava o consumo em kWh ou a potência em kWp, mas não solicitava o valor médio em R$ da conta de luz do cliente, e descartava o valor extraído quando uma fatura em PDF/foto era enviada. Como consequência:

1. A simulação gerada no backend não gravava a tarifa (`energyPriceKwh`).
2. A economia mensal era calculada multiplicando o consumo por um valor arbitrário de R$ 0,90/kWh.
3. No template da proposta (`public-proposal-variables.ts`), variáveis fundamentais como `conta_mensal_energia`, `comparacao_antes` ("Antes da Energia Solar"), `comparacao_depois` ("Depois da Energia Solar") e `cobertura_consumo_pct` ficavam sem preenchimento e acabavam exibindo valores de exemplo/placeholders do blueprint (ex: R$ 850,00 antes / R$ 95,00 depois), distorcendo a apresentação comercial.

O objetivo deste projeto é introduzir a captura do valor da conta de luz no WhatsApp, com fast-forward se já extraído da fatura ou do texto, calcular a tarifa real (`energyPriceKwh`), persistir na simulação e integrar 100% com as variáveis dos templates de propostas.

---

## 1. Fluxo na Máquina de Estados (FSM) do WhatsApp

### 1.1 Novo Estado: `AWAITING_BILL_VALUE`

A máquina de estados recebe o novo passo `AWAITING_BILL_VALUE`, posicionado logo após a definição da Cidade/UF e antes da escolha do Padrão da Rede / Telhado.

```
[IDLE / Entrada de Consumo/Fatura]
             ↓
     [AWAITING_CITY]
             ↓
   [AWAITING_BILL_VALUE]  <-- NOVO PASSO
             ↓ (se valor informado, pulado ou extraído)
   [AWAITING_GRID_TYPE]
             ↓
   [AWAITING_ROOF_TYPE]
             ↓
 [AWAITING_INVERTER_TYPE]
             ↓
  [AWAITING_KIT_SELECTION]
             ↓
[AWAITING_PRICE_CONFIRMATION]
             ↓
  [AWAITING_CLIENT_NAME]
             ↓
  [AWAITING_CLIENT_PHONE]
             ↓
[AWAITING_TEMPLATE_SELECTION]
             ↓
   [PROPOSAL_COMPLETED]
```

### 1.2 Regras de Transição e Fast-Forward (Pulo Automático)

1. **Fatura Enviada (PDF/Imagem)**:
   - Ao processar a fatura com `BillExtractorService`, o valor `valor_total_fatura_reais` é capturado e gravado em `sessionData.billValue`.
   - Se a fatura continha o valor e o consumo, o bot **pula automaticamente** o estado `AWAITING_BILL_VALUE` diretamente para `AWAITING_GRID_TYPE`.
2. **Valor Informado no Texto Inicial**:
   - Um novo parser `parseBillValueInput(text)` reconhece expressões monetárias associadas à fatura (ex: `"conta de 800 reais"`, `"fatura de R$ 750"`, `"gasto 900 reais"`).
   - Se identificado no texto inicial juntamente com o consumo, `billValue` é armazenado e o passo `AWAITING_BILL_VALUE` é pulado.
3. **Pergunta Explícita**:
   - Quando não informado previamente, o bot envia:

     ```text
     💡 *Qual é o valor médio da conta de luz atual em R$?*

     > Digite o valor (ex: *850* ou *850,00*).
     > Ou digite *0* para estimar automaticamente pela tarifa média da sua região.
     ```
4. **Tratamento da Resposta em `AWAITING_BILL_VALUE`**:
   - Se o usuário digitar um valor monetário válido (ex: `850`, `R$ 850,00`, `920 reais`), armazena `sessionData.billValue = 850`.
   - Se digitar `0`, `estimar`, `pular` ou `não sei`, define `sessionData.billValue = undefined` e ativa o cálculo por tarifa regional padrão.
   - Se digitar `voltar` ou `0` em contexto de navegação, retorna para `AWAITING_CITY` conforme `STEP_PREVIOUS_MAP`.
   - Avança para `AWAITING_GRID_TYPE`.

---

## 2. Cálculo de Tarifas e Persistência da Simulação

### 2.1 Mapeamento de Tarifas Médias por UF

Fallback regional por estado para casos em que o valor em R$ não for informado:

- SP: R$ 0,86 / kWh
- RJ: R$ 1,08 / kWh
- MG: R$ 0,95 / kWh
- PR: R$ 0,84 / kWh
- SC: R$ 0,78 / kWh
- RS: R$ 0,92 / kWh
- BA: R$ 0,94 / kWh
- GO: R$ 0,88 / kWh
- Padrão Nacional: R$ 0,88 / kWh

### 2.2 Cálculo Efetivo da Tarifa (`energyPriceKwh`)

- Se `billValue > 0` e `effectiveConsumption > 0`:
  $$\text{energyPriceKwh} = \text{round}\left(\frac{\text{billValue}}{\text{effectiveConsumption}}, 4\right)$$
  Limitado a um intervalo de segurança de R$ 0,40 a R$ 2,50/kWh.
- Caso contrário:
  $$\text{energyPriceKwh} = \text{tariffByUf}(\text{uf})$$
  $$\text{effectiveBillValue} = \text{round}(\text{effectiveConsumption} \times \text{energyPriceKwh})$$

### 2.3 Gravação no Prisma (`simulation.create`)

Ao criar a simulação comercial no fechamento da proposta via WhatsApp:

```typescript
await this.prisma.simulation.create({
  data: {
    tenantId: conversation.organizationId,
    leadId: lead.id,
    name: "Simulação Comercial IA",
    input: {
      systemSizeKw: selectedQuote.kwp,
      investmentAmount: quotedSaleBrl,
      financingType: "CASH",
      energyPriceKwh: energyPriceKwh, // <-- Persistido com a tarifa real
      sizing: {
        monthlyConsumptionKwh: effectiveConsumption,
        cidade: sessionCtx.cidade || "São Paulo",
        estado: sessionCtx.estado || "SP",
        recommendedPowerKw: selectedQuote.kwp,
        estimatedGeneration: selectedQuote.estimatedGeneration,
      },
    },
    result: {
      paybackYears: calculatedPayback,
      monthlySavings: monthlySavingsVal,
      monthlySavingsBrl: monthlySavingsVal,
      annualSavings: [monthlySavingsVal * 12],
      sizing: {
        recommendedPowerKw: selectedQuote.kwp,
        estimatedGeneration: selectedQuote.estimatedGeneration,
        estimatedProductionKwhMonth: selectedQuote.estimatedGeneration,
      },
    },
  },
});
```

---

## 3. Conexão Total com os Templates de Proposta

### 3.1 `public-proposal-variables.ts`

1. **`conta_mensal_energia`**:
   $$\text{conta\_mensal\_energia} = \text{monthlyConsumptionKwh} \times \text{energyPriceKwh}$$
2. **`comparacao_antes`**:
   Recebe o valor da conta atual formatado em reais (ex: `R$ 850,00`).
3. **`comparacao_depois`**:
   Recebe o valor residual estimado após a compensação solar:
   $$\text{comparacao\_depois} = \max(0, \text{conta\_mensal\_energia} - \text{monthlySavings})$$
4. **`cobertura_consumo_pct`**:
   Percentual calculado da geração/economia sobre a fatura original:
   $$\text{cobertura\_consumo\_pct} = \min\left(100, \text{round}\left(\frac{\text{monthlySavings}}{\text{conta\_mensal\_energia}} \times 100\right)\right)$$
5. **Salvaguarda Retroativa**:
   Se `input.energyPriceKwh` for nulo ou indefinido (propostas antigas):
   - Estimar `energyPrice = result.monthlySavings / (sizingIn.monthlyConsumptionKwh || 1)`.
   - Se ainda inválido, aplicar tarifa padrão de R$ 0,88/kWh.
   - Isso garante que nenhum template em produção exiba dados fictícios do blueprint.

---

## 4. Testes e Validação

1. **Testes Unitários de Parsing**:
   - `parseBillValueInput`: extração de valores monetários em múltiplos formatos (ex: "850", "R$ 850,00", "850 reais", "conta de R$ 1.200,50").
2. **Testes da Máquina de Estados**:
   - Fluxo com pergunta explícita do valor da conta de luz.
   - Fluxo com pulo automático se fatura em PDF/imagem for enviada.
   - Fluxo com pulo se valor já presente na mensagem inicial.
   - Navegação reversa (voltar de `AWAITING_GRID_TYPE` para `AWAITING_BILL_VALUE` e deste para `AWAITING_CITY`).
3. **Testes de Integração com Variáveis do Template**:
   - Verificar que `mergePublicProposalVariables` gera corretamente `conta_mensal_energia`, `comparacao_antes`, `comparacao_depois` e `cobertura_consumo_pct`.
4. **Compilação e Verificação**:
   - Execução de `vitest` no backend e frontend.
   - Build de produção NestJS e Next.js.
