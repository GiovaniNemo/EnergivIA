# Disposição Minimalista de Recursos dos Planos (Check & X) e Gestão no Admin Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Reformular a disposição dos itens nos cards de planos para exibir 7 itens minimalistas e reais da plataforma com ícones de Check (✓) e X (✕), e permitir controle total (toggle incluso/não incluso) na gestão de planos do Admin.

**Architecture:** Expandir `PlanFeaturesConfig` em `@energivia/shared-types` com tipo `PlanFeatureItem { text: string, included: boolean }` e normalizador retrocompatível; atualizar modal de planos em `apps/web/src/app/(authenticated)/admin/planos/page.tsx` com toggle de 1 clique; atualizar renderização de cards em `/gestao/meus-planos` e `TrialLockOverlay.tsx`.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Prisma / NestJS API.

---

### Task 1: Modelo de Dados & Tipagem em `@energivia/shared-types`

**Files:**

- Modify: `packages/shared-types/src/plans.ts`
- Test: `packages/shared-types/src/plans.spec.ts` (ou testes unitários existentes)

**Step 1: Escrever teste para validação de PlanFeatureItem e normalização**
Verificar se `normalizePlanFeatures` converte strings com prefixo `[x] ` para `included: false`, strings normais para `included: true`, e mantém objetos `{ text, included }`.

**Step 2: Executar teste e verificar falha inicial**
Run: `npm test -w @energivia/shared-types` ou script de teste.

**Step 3: Implementar `PlanFeatureItem` e defaults minimalistas**

- Adicionar interface `PlanFeatureItem { text: string; included: boolean }`.
- Atualizar `DEFAULT_ESSENCIAL_PLAN_FEATURES`, `DEFAULT_PRO_PLAN_FEATURES`, `DEFAULT_PLUS_PLAN_FEATURES` com a matriz minimalista de 7 itens reais:
  1. Volume de propostas comerciais
  2. Usuários / equipe
  3. WhatsApp com IA 24/7
  4. Templates personalizados
  5. CRM Solar & funil
  6. Radar Solar ANEEL (✕ no Essencial, ✓ no Pro e Plus)
  7. Alertas ao abrir propostas (✕ no Essencial, ✓ no Pro e Plus)
- Remover qualquer referência a whitelabel.
- Atualizar `normalizePlanFeatures` para processar e exportar itens estruturados.

**Step 4: Executar testes de tipos e unidade**
Run: `npm run build -w @energivia/shared-types`

---

### Task 2: Gestão de Planos no Admin (`apps/web/src/app/(authenticated)/admin/planos/page.tsx`)

**Files:**

- Modify: `apps/web/src/app/(authenticated)/admin/planos/page.tsx`

**Step 1: Atualizar estado do formulário de planos**

- Armazenar `features: PlanFeatureItem[]` no `planForm`.
- Suportar conversão transparente ao carregar plano existente.

**Step 2: Implementar botão de Toggle [✓ Incluso] / [✕ Não incluso]**

- Em cada linha da lista de benefícios:
  - Botão interativo que alterna entre `included: true` e `included: false`.
  - Estilo visual claro e elegante: verde suave quando incluso, neutro/vermelho sutil quando não incluso.
- Permitir adicionar novo item já marcando se é incluso ou não.
- Preservar edição inline de texto, remoção e ordenação (arraste e botões up/down).

**Step 3: Atualizar sugestões pré-definidas (chips)**

- Substituir itens legados (remover menções de whitelabel) pelas opções reais da plataforma:
  - Radar Solar ANEEL
  - Alertas em tempo real de visualização
  - Múltiplos bots de WhatsApp
  - Templates personalizados
  - CRM Solar & pipeline

**Step 4: Persistência**

- Garantir que `handleSavePlan` envie o payload estruturado com `featuresConfig.bulletPoints` contendo os objetos `{ text, included }`.

---

### Task 3: Renderização nos Cards de Planos (`/gestao/meus-planos` e `TrialLockOverlay`)

**Files:**

- Modify: `apps/web/src/app/(authenticated)/gestao/meus-planos/page.tsx`
- Modify: `apps/web/src/components/TrialLockOverlay.tsx`

**Step 1: Atualizar função `parseFeatures` para retornar `PlanFeatureItem[]`**

- Ler itens estruturados do plano.

**Step 2: Renderizar lista de itens com ícones Check e X**

- Se `feat.included === true`:
  - Exibir ícone `CheckCircle2` com cor do tema do card.
  - Texto principal em `text-[var(--color-foreground)]`.
- Se `feat.included === false`:
  - Exibir ícone `XCircle` em tom neutro sutil (`text-[var(--color-muted-foreground)]/60`).
  - Texto atenuado em `text-[var(--color-muted-foreground)]`.

**Step 3: Ajustar espaçamento e alinhamento vertical**

- Garantir que todos os 3 cards tenham altura perfeitamente nivelada e proporcional.

---

### Task 4: Verificação, Testes e Browser Subagent

**Files:**

- N/A

**Step 1: Executar build e typecheck**
Run: `npm run build` ou `npx tsc --noEmit` nos pacotes afetados.

**Step 2: Validar visualmente com Browser Subagent**
Navegar para `/gestao/meus-planos` e `/admin/planos` para verificar layout, gravação de tela e fidelidade estética sem quebra.

---

### Task 5: Commit e Push para o Repositório

**Step 1: Commit das alterações**
`git add .`
`git commit -m "feat: reformular cards de planos com itens reais minimalistas (check e x) e gestao no admin"`

**Step 2: Push para o branch remoto**
`git push origin main`
