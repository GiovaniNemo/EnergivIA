# Dimensionamento com Múltiplos Inversores e Seleção Flexível Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Permitir o dimensionamento automático de kits solares de grande porte com múltiplos inversores idênticos (mesmo fabricante/modelo) quando a usina exceder a capacidade técnica do maior inversor cadastrado, além de oferecer ao integrador na plataforma a opção de selecionar e ajustar manualmente a quantidade de inversores.

**Architecture:** O motor de dimensionamento (`solar-sizing.service.ts`) prioriza estritamente 1 único inversor enquanto a potência e overload estiverem dentro dos limites dos equipamentos cadastrados; caso a potência ultrapasse a capacidade unitária máxima ou o integrador defina manualmente `target_inverter_qty`, o motor divide a usina de forma simétrica entre $N$ inversores obrigatoriamente idênticos da mesma marca e modelo. As camadas superiores (`KitGenerationService`, WhatsApp Bot e UI da Proposta) passam a honrar `inverter_quantity` no cálculo do valor dos equipamentos, nos itens estruturados e nos textos gerados.

**Tech Stack:** TypeScript, NestJS, Prisma, Vitest, Next.js 15 (React 19), Tailwind CSS.

---

### Task 1: Testes Unitários do Motor de Dimensionamento para Múltiplos Inversores

**Files:**

- Create: `apps/api/src/domain/solar-sizing/__tests__/solar-sizing.multi-inverter.spec.ts`
- Modify: `apps/api/src/domain/solar-sizing/types.ts`

**Step 1: Escrever teste falhando para seleção de inversor único quando couber e múltiplos idênticos quando exceder**

Criar `apps/api/src/domain/solar-sizing/__tests__/solar-sizing.multi-inverter.spec.ts` cobrindo:

1. Usina de 40 kWp com inversor de 40 kW/50 kW disponível $\rightarrow$ escolhe **1 único inversor**.
2. Usina de 120 kWp onde o maior inversor tem 60 kW $\rightarrow$ escolhe **2 inversores idênticos do mesmo modelo e fabricante**.
3. Garantia de que os inversores são estritamente do mesmo modelo/marca (sem misturar fabricantes).
4. Sobrescrita manual com `target_inverter_qty = 2` para um kit menor de 10 kWp $\rightarrow$ dimensiona com 2 inversores de 5 kW da mesma marca.

**Step 2: Executar teste para verificar que falha**

Run: `pnpm --filter @energivia/api test solar-sizing.multi-inverter.spec.ts`
Expected: FAIL (inverter_quantity indefinido / falha ao retornar kit quando excede).

**Step 3: Commit do teste**

```bash
git add apps/api/src/domain/solar-sizing/__tests__/solar-sizing.multi-inverter.spec.ts
git commit -m "test(solar-sizing): add multi-inverter unit test suite"
```

---

### Task 2: Implementar Suporte a Múltiplos Inversores Idênticos no Motor de Dimensionamento

**Files:**

- Modify: `apps/api/src/domain/solar-sizing/types.ts:20-60`
- Modify: `apps/api/src/domain/solar-sizing/solar-sizing.service.ts:10-246`

**Step 1: Atualizar tipos em `types.ts`**

- Adicionar `inverter_quantity: number` em `StringSizingResult`.
- Adicionar `target_inverter_qty?: number` em `SolarSizingInput`.

**Step 2: Implementar algoritmo no `solar-sizing.service.ts`**

- Se `target_inverter_qty` estiver definido ($N \ge 1$), busca o melhor inversor para $P_{inversor} \approx P_{usina} / N$ e valida o arranjo de strings proporcional ($\lfloor Q_{módulos} / N \rfloor$).
- Se não estiver definido (modo automático):
  1. Tenta primeiramente $N = 1$ em todos os inversores candidatos disponíveis no catálogo.
  2. Se nenhum inversor unitário suportar a potência por excesso de overload, calcula o multiplicador $N = \lceil P_{usina} / P_{inversor\_max} \rceil$ e busca $N$ inversores **idênticos** (mesmo `id` / modelo), validando strings e limites elétricos por unidade.

**Step 3: Executar testes unitários**

Run: `pnpm --filter @energivia/api test solar-sizing.multi-inverter.spec.ts`
Expected: PASS (todos os casos de teste passando).

**Step 4: Commit**

```bash
git add apps/api/src/domain/solar-sizing/
git commit -m "feat(solar-sizing): implement multi-inverter scaling with single-inverter priority and identical brand validation"
```

---

### Task 3: Atualizar DTOs e `KitGenerationService` para Integrar Múltiplos Inversores

**Files:**

- Modify: `apps/api/src/modules/kit/dto/generate-kit.dto.ts:1-44`
- Modify: `apps/api/src/modules/kit/types.ts:1-128`
- Modify: `apps/api/src/modules/kit/kit-generation.service.ts:240-285,1235-1260`

**Step 1: Atualizar DTO e Interfaces**

- Em `GenerateKitDto`, adicionar `@IsOptional() @IsNumber() @Min(1) @Max(10) target_inverter_qty?: number;`.
- Em `GenerateKitInput`, adicionar `target_inverter_qty?: number;`.
- Em `DistributorTierKit`, adicionar `inverter_qty: number;`.

**Step 2: Atualizar `KitGenerationService`**

- Repassar `target_inverter_qty` para o `sizeSolarSystem`.
- Em `persistKitResult` e `kitItems`, definir a quantidade do item inversor como `inverterQuantity` (para string/híbrido) ou `microinverter_quantity` (para micro).
- No cálculo do custo total de equipamentos (`equipmentTotal`), o custo da linha de inversor deve ser `unit_price * inverter_quantity`.
- Preencher `inverter_qty: inverterQuantity` nos tiers gerados em `generateDistributorTiers`.

**Step 3: Testar e verificar compilação**

Run: `pnpm --filter @energivia/api build`
Expected: Build concluído sem erros de tipagem.

**Step 4: Commit**

```bash
git add apps/api/src/modules/kit/
git commit -m "feat(kit): support target_inverter_qty and dynamic inverter quantity in KitGenerationService"
```

---

### Task 4: Atualizar Apresentação no WhatsApp Bot e Formatador

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts:1820-1865`
- Modify: `apps/api/src/modules/kit/whatsapp-formatter.service.ts:1-38`

**Step 1: Atualizar formatação de texto em `whatsapp-bot.service.ts`**

- Substituir a string fixa:
  ```typescript
  const invQty = t.inverter_qty || t.kit_result.inverter.quantity || 1;
  const invLabel = invQty > 1 ? `${invQty}x Inversores` : `1x Inversor`;
  const kitItems = [
    `• ${t.module_qty}x Módulos ${t.module_brand} ${t.module_power_w}W`,
    `• ${invLabel} ${t.inverter_brand} ${t.inverter_power_kw}kW`,
  ];
  ```
- No item estruturado (`structuredItems`), garantir que a quantidade do inversor reflita `invQty` e o `lineTotal` considere `unitPrice * invQty`.

**Step 2: Atualizar `whatsapp-formatter.service.ts`**

- Garantir que a linha do inversor exiba plural e quantidade quando `kit.inverter.quantity > 1`.

**Step 3: Executar testes de integração ou regressão no módulo WhatsApp**

Run: `pnpm --filter @energivia/api test`
Expected: PASS.

**Step 4: Commit**

```bash
git add apps/api/src/modules/whatsapp/ apps/api/src/modules/kit/whatsapp-formatter.service.ts
git commit -m "feat(whatsapp): display correct inverter quantity and calculate total with multiple inverters"
```

---

### Task 5: Implementar Seleção e Ajuste de Múltiplos Inversores no Frontend

**Files:**

- Modify: `apps/web/src/lib/kit-api.ts:5-40`
- Modify: `apps/web/src/components/proposals/proposal-equipment-editor-card.tsx:59-70,350-375,1015-1045,1315-1340`

**Step 1: Atualizar contratos no frontend em `kit-api.ts`**

- Adicionar `target_inverter_qty?: number;` em `GenerateKitRequest`.

**Step 2: Atualizar `ProposalEquipmentEditorCard`**

- Em `KitDraftState`, adicionar `targetInverterQty: "auto" | "1" | "2" | "3" | "4"`.
- No formulário de especificações do kit, adicionar o campo:
  - Label: **"Quantidade de Inversores"**
  - Opções: `Automático (recomendado)`, `1 Inversor`, `2 Inversores`, `3 Inversores`, `4 Inversores`.
- Repassar `target_inverter_qty` para a chamada de `generateDistributorTiers`.
- Na tabela de itens, destravar a edição de quantidade para o inversor ou permitir incrementar/decrementar, mantendo a consistência dos equipamentos.

**Step 3: Validar build e lint no frontend**

Run: `pnpm --filter @energivia/web build`
Expected: PASS (build concluído sem erros).

**Step 4: Commit**

```bash
git add apps/web/src/lib/kit-api.ts apps/web/src/components/proposals/proposal-equipment-editor-card.tsx
git commit -m "feat(proposals): add multi-inverter quantity selector and editor controls for integrators"
```

---

### Task 6: Validação de Ponta a Ponta, Testes e Verificação Final

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar suite completa de testes do backend e frontend**

Run: `pnpm --filter @energivia/api test`
Run: `pnpm --filter @energivia/web lint`
Run: `pnpm --filter @energivia/web build`
Expected: Todos aprovados com status 0.

**Step 2: Atualizar `docs/plans/task.md` com o checklist de tarefas**

**Step 3: Commit e push final para o repositório remoto**

Run: `git push origin main`
Expected: Sincronizado com sucesso.
