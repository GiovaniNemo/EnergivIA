# Design: Animações Dinâmicas de Métricas (KPIs) e Gráfico de Propostas no Painel

## 1. Visão Geral e Contexto

Ao acessar o Painel da EnergivIA, os números dos cartões de métricas (Leads, Propostas, Taxa de Conversão e Receita Prevista) e as barras do gráfico dos últimos 14 dias devem iniciar no valor zero e crescer dinamicamente até os valores consolidados. Essa transição confere uma sensação imediata de sofisticação, fluidez e processamento em tempo real dos dados comerciais.

## 2. Requisitos de Experiência e Movimento

1. **Curva de Animação (Easing):** Curva de desaceleração suave (`easeOutExpo` / `cubic-bezier(0.16, 1, 0.3, 1)`), garantindo que os números e barras subam com agilidade inicial e desacelerem com precisão no valor final.
2. **Duração:** ~1200ms sincronizados entre os cartões de métricas e as barras do gráfico.
3. **Formatação Inteligente de Valores:**
   - **Leads:** Inteiro simples (`0` → `20`).
   - **Propostas:** Inteiro simples (`0` → `30`).
   - **Taxa de Conversão:** Inteiro percentual (`0%` → `9%`).
   - **Receita Prevista:** Formatação de moeda BRL contínua (`R$ 0` → `R$ 3,3M`), respeitando as regras de exibição existentes (`M`, `k` ou `R$ 0`).
   - **Subtítulo do Gráfico:** Total de propostas do período (`0` → `12`).
4. **Desempenho (60 FPS):** Interpolação via `requestAnimationFrame` com limpeza estrita de callbacks e cancelamento para prevenir memory leaks ou renderizações desnecessárias.

## 3. Arquitetura Técnica

### 3.1. Utilitário e Componente `AnimatedNumber`

- Arquivo: `apps/web/src/components/dashboard/animated-number.tsx`
- Propriedades:
  - `value: number`: valor numérico final de destino.
  - `duration?: number`: tempo total da transição em milissegundos (padrão: 1200ms).
  - `formatter?: (value: number) => string`: função customizada de formatação (ex: `formatBRL`, percentual, ou separador de milhar).
  - `initialValue?: number`: valor inicial (padrão: 0).
  - `disabled?: boolean`: caso o usuário prefira `prefers-reduced-motion`.

### 3.2. Sincronização do Gráfico no `page.tsx`

- O gráfico utiliza `Recharts` (`<BarChart>` e `<Bar>`).
- Recharts suporta animação de barras através de `isAnimationActive={true}`, `animationDuration={1200}` e `animationEasing="ease-out"`.
- Para assegurar que o gráfico comece zerado e suba mesmo após a chegada assíncrona dos dados via React Query (`proposalsQuery`), definimos uma chave reativa vinculada ao estado de dados (`key={hasLoadedData ? "chart-ready" : "chart-loading"}`). Isso aciona a animação de elevação das barras exatamente em sincronia com os números dos KPIs.

## 4. Testes e Validação

1. **Testes Unitários:**
   - Testar o motor matemático de interpolação e as funções de formatação em `animated-number.spec.ts`.
   - Garantir que o valor inicial seja 0, os passos intermediários sejam crescentes e o valor final coincida exatamente com o target.
2. **Validação de Build:**
   - Executar `npm run build` ou `next lint` para garantir ausência de erros de tipagem TypeScript e sintaxe.
