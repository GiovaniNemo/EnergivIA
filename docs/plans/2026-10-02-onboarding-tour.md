# Onboarding Tour dos Integradores Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar um tutorial interativo de primeiro acesso para integradores com spotlight visual na tela, guiando desde a visão geral do painel até a geração da primeira proposta, com opção clara de pular ("Já conheço a EnergivIA") e restrito aos administradores nesta fase inicial.

**Architecture:** Provider global (`OnboardingTourProvider`) gerenciando o fluxo contínuo em várias etapas (Painel ➔ Modal Nova Proposta ➔ Modal Estudo Solar ➔ Botão Gerar Proposta). Componente visual (`OnboardingTourSpotlight`) em Framer Motion com recorte dinâmico sobre os elementos marcados com `data-tour`.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind CSS, Framer Motion, Lucide Icons, TypeScript.

---

### Task 1: Definição dos Passos do Tour (`tour-steps.ts`)

**Files:**

- Create: `apps/web/src/components/onboarding/tour-steps.ts`

**Step 1: Criar o arquivo com os passos detalhados e tipagens**

- Configurar cada etapa com `id`, `title`, `description`, `targetSelector`, `preferredPlacement`, `nextLabel`, `skipLabel`.
- Passos:
  1. `dashboard-overview`: Apresentação geral do Painel e métricas operacionais.
  2. `proposal-shortcuts`: Destaque conjunto para o upload de conta de luz por IA e botão "+ Nova proposta".
  3. `new-proposal-client`: No modal de proposta, explicando seleção de cliente e WhatsApp.
  4. `proposal-study-simulation`: No modal de dimensionamento, explicando consumo e kit solar pela IA.
  5. `proposal-generate-action`: Destaque no botão final de gerar a proposta interativa.

**Step 2: Verificar types e compilação de `tour-steps.ts`**

---

### Task 2: Criação do Contexto e Provider (`onboarding-tour-provider.tsx`)

**Files:**

- Create: `apps/web/src/components/onboarding/onboarding-tour-provider.tsx`

**Step 1: Criar o Provider com controle de estado, admin-only e persistência**

- Verificar se `user` ou `currentOrganization.role` é `ADMIN` ou `OWNER` (`isOwnerOrAdmin`). Se não for, desativa o tour.
- Verificar `localStorage.getItem("energivia_integrator_tour_completed_${userId}")`. Se existir e não for reinício manual, não inicia automaticamente.
- Fornecer métodos: `startTour()`, `skipTour()`, `nextStep()`, `prevStep()`, `goToStep(index)`.
- Gerenciar abertura coordenada de modais quando o usuário avança os passos (ex.: abrir o modal de nova proposta ao passar do passo 2 para o passo 3).

---

### Task 3: Criação da Camada Visual com Spotlight e Framer Motion (`onboarding-tour-spotlight.tsx`)

**Files:**

- Create: `apps/web/src/components/onboarding/onboarding-tour-spotlight.tsx`

**Step 1: Criar o componente de Spotlight animado**

- Calcular retângulo do alvo (`targetSelector`) via `getBoundingClientRect()`.
- Criar overlay escuro semi-transparente recortado ao redor do elemento alvo com borda suave.
- Card flutuante responsivo animado via `framer-motion` (`AnimatePresence`).
- Cabeçalho com indicador "Passo X de Y" e botão discreto de fechar.
- Textos informativos sem emojis de WhatsApp.
- Botões: "Já conheço / Pular tour" e "Próximo passo" / "Avançar".

---

### Task 4: Inserção dos Atributos `data-tour` e Integração nos Modais

**Files:**

- Modify: `apps/web/src/app/(authenticated)/dashboard/page.tsx`
  - Adicionar `data-tour="dashboard-overview"` no cabeçalho e métricas.
  - Adicionar `data-tour="proposal-shortcuts"` ou `data-tour="btn-new-proposal"` e `data-tour="bill-upload-hero"`.
- Modify: `apps/web/src/components/dashboard/new-proposal-dialog.tsx`
  - Adicionar `data-tour="new-proposal-dialog"`.
- Modify: `apps/web/src/components/pipeline/proposal-economics-modal.tsx`
  - Adicionar `data-tour="proposal-study-simulation"` e `data-tour="btn-generate-proposal"`.
- Modify: `apps/web/src/components/layout/authenticated-shell.tsx`
  - Envolver com `OnboardingTourProvider` e renderizar `<OnboardingTourSpotlight />`.
- Modify: `apps/web/src/components/layout/topbar.tsx`
  - Adicionar opção "Tutorial da plataforma" no menu do usuário para reiniciar o tour quando desejar.

---

### Task 5: Validação, Testes e Verificação Visual

**Files:**

- Executar lint e verificação de tipagem TypeScript (`pnpm run build` ou `tsc --noEmit`).
- Usar `browser_subagent` para gravar a navegação e validar a renderização do spotlight, cliques nos botões de avançar e opção de pular.
- Confirmar que usuários comuns não veem o tour e apenas administradores têm acesso nesta fase.

---

### Task 6: Commit e Push

- Executar `git add`, `git commit` e `git push` conforme as diretrizes do projeto.
