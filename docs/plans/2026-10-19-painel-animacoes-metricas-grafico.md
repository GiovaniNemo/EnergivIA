# Painel: Animações Dinâmicas de Métricas e Gráfico Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Fazer com que os números de destaque dos KPIs e as barras do gráfico de propostas no painel comecem em zero e cresçam de forma dinâmica e fluida (~1.2s ease-out) ao abrir a tela.

**Architecture:** Componente e hook modular de interpolação `AnimatedNumber` com `requestAnimationFrame` e curva de aceleração `easeOutExpo` para transição numérica sem reflow, combinado com sincronização do Recharts BarChart (`isAnimationActive`, `animationDuration` e chave de montagem baseada na disponibilidade dos dados).

**Tech Stack:** Next.js 14 (App Router), React 18, Recharts 2.15, Vitest, TypeScript, Tailwind CSS.

---

### Task 1: Criar motor de interpolação e componente `AnimatedNumber` com testes unitários

**Files:**

- Create: `apps/web/src/components/dashboard/animated-number.tsx`
- Test: `apps/web/src/components/dashboard/animated-number.spec.ts`

**Step 1: Escrever os testes unitários**
Criar testes cobrindo a função de easing (`easeOutExpo`), formatação de números inteiros, percentuais e moeda BRL compacta/expandida, e garantindo que o valor final seja alcançado.

**Step 2: Executar testes para verificar falha inicial**
Run: `npx vitest run apps/web/src/components/dashboard/animated-number.spec.ts`
Expected: FAIL (módulo não encontrado)

**Step 3: Implementar `AnimatedNumber` e `interpolateNumber`**
Implementar o hook `useCountUp` e o componente `<AnimatedNumber />` com `requestAnimationFrame`, curva de interpolação suave, suporte a prefixos/sufixos e funções de formatação flexíveis.

**Step 4: Executar testes para verificar aprovação**
Run: `npx vitest run apps/web/src/components/dashboard/animated-number.spec.ts`
Expected: PASS

**Step 5: Commit parcial da Task 1**

---

### Task 2: Integrar `AnimatedNumber` nos cartões de KPI e total do gráfico no Dashboard

**Files:**

- Modify: `apps/web/src/app/(authenticated)/dashboard/page.tsx`

**Step 1: Aplicar `<AnimatedNumber />` nos cartões de métricas**

- Leads da empresa / mês: número inteiro crescendo de 0 até o valor real.
- Propostas enviadas: número inteiro crescendo de 0 até o valor real.
- Taxa de conversão: percentual crescendo de 0% até o valor real (`X%`).
- Receita prevista: valor monetário crescendo de R$ 0 até o valor formatado (`R$ 3,3M`).
- Subtítulo do gráfico: total no período crescendo de 0 até o valor real (`Volume diário · X no período`).

**Step 2: Verificar visualmente e sintaticamente sem quebrar renderização**
Verificar ausência de erros de hidratação ou tipos.

**Step 3: Commit parcial da Task 2**

---

### Task 3: Configurar animação de subida e sincronização do gráfico Recharts

**Files:**

- Modify: `apps/web/src/app/(authenticated)/dashboard/page.tsx`

**Step 1: Configurar `<Bar>` com `isAnimationActive`, `animationDuration={1200}` e `animationEasing="ease-out"`**
Adicionar suporte explícito à animação do Recharts no componente `<Bar>`.

**Step 2: Adicionar chave de sincronização no gráfico**
Garantir que quando a query assíncrona de propostas (`proposalsQuery`) carregar, a chave reativa do gráfico acione a subida fluida das barras do 0 até o topo.

**Step 3: Commit parcial da Task 3**

---

### Task 4: Validação automatizada completa, build e push para repositório remoto

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar suíte de testes Vitest no frontend e backend**
Run: `npm run lint` ou testes do Vitest

**Step 2: Validar compilação de produção Next.js**
Run: `npx next build` em `apps/web`

**Step 3: Commit e push para origin/main**
Sincronizar as alterações com o repositório remoto conforme regras obrigatórias do projeto.
