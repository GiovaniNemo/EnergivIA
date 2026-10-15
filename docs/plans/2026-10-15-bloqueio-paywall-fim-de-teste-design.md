# Design Doc: Bloqueio Total de Tela (Paywall) ao Fim dos 5 Dias de Teste

## 1. Contexto e Motivação

A plataforma EnergivIA oferece um período de degustação de 5 dias úteis (Plano Start / Trial) para novos integradores solares.
Anteriormente, o backend calculava a expiração do período de teste (`trialExpired`), e o `TrialLockGuard` rejeitava operações de mutação (`POST`, `PUT`, `PATCH`, `DELETE`).
No entanto, no endpoint `/auth/me`, a flag `isTrialLocked` estava temporariamente fixada como `false` (`// Sem trava agressiva de tela cheia`), o que fazia com que o frontend exibisse apenas uma barra amarela de aviso no topo da tela.

Como resultado:

- O integrador conseguia continuar navegando pelo CRM (`/pipeline`, `/leads`, Deal 360).
- Os botões `+ Novo cliente`, `Criar cliente`, movimentação de cards no funil e edição de dados ficavam clicáveis e digitáveis na interface, gerando frustração quando o salvamento falhava com erro 403.
- Módulos de propostas, dimensionamento, templates e configurações permaneciam acessíveis visualmente.

O objetivo deste projeto é ativar a regra de **Bloqueio Geral de Tela (Paywall Total)** via `TrialLockOverlay` assim que os 5 dias de teste se esgotarem, eliminando qualquer interação ou navegação até que o integrador assine um plano pago.

---

## 2. Decisões Arquiteturais e Comportamentais

### 2.1 Backend (`apps/api`)

1. **Cálculo de `isTrialLocked` em `auth.controller.ts`**:
   - `isTrialLocked` passa a ser calculado dinamicamente:
     ```ts
     const isTrialLocked = Boolean(
       user.role !== "ADMIN" && user.role !== "PLATFORM" && isTrial && trialExpired
     );
     ```
   - Admins da plataforma (`ADMIN`, `PLATFORM`) e organizações com Acesso Especial ativo (`specialAccessActive`) continuam isentos do bloqueio.
2. **Defesa em Profundidade (`TrialLockGuard`)**:
   - Continua rejeitando qualquer tentativa de mutação (POST/PUT/PATCH/DELETE) originada de chamadas diretas de API de tenants com teste expirado.

### 2.2 Frontend (`apps/web`)

1. **Ativação do Paywall Total (`TrialLockOverlay.tsx`)**:
   - Detecta o bloqueio através de `user?.isTrialLocked` e fallback defensivo `(user?.isTrial && user?.trialExpired)`.
   - Renderiza a sobreposição em tela cheia com alta prioridade visual (`fixed inset-0 z-[2147483647] bg-black/85 backdrop-blur-md`).
   - O botão `✕ Fechar` é suprimido durante o bloqueio definitivo.
   - Apresenta os cards dos planos ativos (Essencial, Pro, Plus) com tabela de benefícios, precificação oficial e botões de checkout do Stripe via `PaymentWrapper`.
   - Permite apenas o botão de saída de conta: `Sair da conta` (`/auth/logout`).
2. **Harmonização de Notificações e Modais**:
   - O modal de avaliação (`FeedbackPromptCard`) verifica `user?.isTrialLocked` e se mantém oculto quando o paywall estiver bloqueando a tela, evitando poluição visual.

---

## 3. Matriz de Permissões Após os 5 Dias de Teste

| Área / Módulo                           | Comportamento com Teste Expirado                        |
| :-------------------------------------- | :------------------------------------------------------ |
| **CRM / Funil de Vendas**               | Bloqueado completamente pela tela cheia do Paywall      |
| **Cadastro de Novo Cliente**            | Bloqueado (inacessível)                                 |
| **Edição de Clientes e Deals**          | Bloqueado (inacessível)                                 |
| **Criação de Propostas**                | Bloqueado (inacessível)                                 |
| **Dimensionamento Solar / Faturas**     | Bloqueado (inacessível)                                 |
| **Chat de Inteligência Artificial**     | Bloqueado (responde com aviso de contratação)           |
| **WhatsApp Bot Automático**             | Bloqueado (responde com aviso comercial de contratação) |
| **Visualização / Assinatura de Planos** | Liberado interativamente no Paywall                     |
| **Logout da Conta**                     | Liberado (`/auth/logout`)                               |

---

## 4. Plano de Validação

1. **Testes Automatizados (Backend)**:
   - Validar testes unitários em `auth.controller.spec.ts` (ou testes de autenticação/planos) garantindo que `isTrialLocked` retorne `true` quando `isTrial === true && trialExpired === true`.
   - Garantir que administradores e tenants com `specialAccessActive` mantenham `isTrialLocked === false`.
2. **Testes do Frontend (Build & Tipos)**:
   - Validar compilação do Next.js e integridade de tipos em `@energivia/web`.
3. **Verificação de Regressão**:
   - Executar suíte completa de testes (`pnpm test`) e lint.
