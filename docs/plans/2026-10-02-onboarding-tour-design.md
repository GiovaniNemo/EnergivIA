# Design Doc: Tutorial de Primeiro Acesso (Onboarding Tour) para Integradores

## 1. Contexto e Objetivo

O objetivo é fornecer um tour interativo guiado (com foco/spotlight nos elementos da tela) para novos integradores da plataforma EnergivIA. O tour deve:

- Ensinar como funciona a plataforma de forma visual e fluida.
- Mostrar claramente onde o integrador deve seguir para gerar a sua primeira proposta solar (destacando o fluxo de envio da conta de luz e o botão "+ Nova proposta").
- Continuar guiando o integrador pelos passos de seleção do cliente e estudo/dimensionamento solar até a geração final da proposta.
- Disponibilizar em todas as etapas uma opção clara de recusa/pular ("Já conheço a EnergivIA / Pular tour").
- **Restrição de Fase Inicial:** Liberado exclusivamente para usuários administradores (`isAdmin` / `isOwnerOrAdmin`), permitindo validação e refinamento antes de liberar para todos os usuários.

---

## 2. Arquitetura da Solução

### 2.1 Gestão de Estado Global (`OnboardingTourProvider`)

- Localização: `apps/web/src/components/onboarding/onboarding-tour-provider.tsx`
- Inserido dentro de `AuthenticatedShell`, logo abaixo de `ProposalStudyProvider` para poder interagir com os fluxos de propostas.
- Responsabilidades:
  - Verificar permissão: verificar se o usuário ativo é administrador (`isOwnerOrAdmin`). Se não for, desativar tour automaticamente.
  - Verificar histórico: checar `localStorage.getItem("energivia_tour_completed_${userId}")`. Se já tiver completado ou recusado, não exibe por padrão.
  - Disponibilizar função `restartTour()` para permitir acionar manualmente via menu de perfil/ajuda.
  - Controlar o passo atual (`currentStepIndex`), elemento em foco (`targetSelector`), modal aberto e transições.

### 2.2 Camada Visual (`OnboardingTourSpotlight`)

- Localização: `apps/web/src/components/onboarding/onboarding-tour-spotlight.tsx`
- Renderização:
  - Fundo escuro com backdrop recortado dinâmico (calculado a partir de `getBoundingClientRect` do elemento com `data-tour="id"`), com borda sutil iluminada no elemento ativo e rolagem suave da tela para o elemento (`scrollIntoView`).
  - Card explicativo posicionado de forma inteligente (top, bottom, left ou right do elemento alvo), animado com `framer-motion`.
  - Cabeçalho do card com tag indicadora de passo (ex.: "Passo 1 de 4") e botão discreto de fechar ("X" ou "Pular").
  - Conteúdo explicativo claro, sem jargões desnecessários e sem emojis de WhatsApp.
  - Barra de ações inferior: botão "Pular tour / Já conheço", botão "Voltar" (quando aplicável) e botão de ação principal "Próximo" ou "Criar Proposta Agora".

### 2.3 Passos do Tour (`tour-steps.ts`)

1. **Passo 1: Boas-vindas ao Painel EnergivIA**
   - _Alvo:_ Cabeçalho do Painel / Métricas centrais (`[data-tour="dashboard-overview"]`).
   - _Mensagem:_ Apresenta o painel central onde o integrador monitora leads, propostas ativas e conversões em tempo real.
2. **Passo 2: Atalhos para a Primeira Proposta**
   - _Alvo:_ Hero de Arrastar Fatura (`[data-tour="bill-upload-hero"]`) e Botão Nova Proposta (`[data-tour="btn-new-proposal"]`).
   - _Mensagem:_ Explica que a IA lê a conta de luz automaticamente (PDF ou imagem) ou que ele pode clicar em "+ Nova proposta" para iniciar uma simulação manual.
3. **Passo 3: Dados do Cliente & WhatsApp**
   - _Alvo:_ Modal de Nova Proposta (`[data-tour="new-proposal-modal-content"]`).
   - _Mensagem:_ Mostra onde selecionar um cliente existente ou cadastrar nome e WhatsApp para envio direto do link interativo.
4. **Passo 4: Estudo Solar & Dimensionamento IA**
   - _Alvo:_ Modal de Estudo Econômico (`[data-tour="proposal-study-simulation"]`).
   - _Mensagem:_ Mostra o consumo médio identificado, potência estimada do gerador e kits de distribuidores homologados calculados pela IA.
5. **Passo 5: Geração e Envio da Proposta Comercial**
   - _Alvo:_ Botão de ação de Gerar Proposta (`[data-tour="btn-generate-proposal"]`).
   - _Mensagem:_ Finaliza o tour mostrando como a proposta interativa de alta conversão fica pronta para ser compartilhada com o cliente.

---

## 3. Critérios de Aceite & Validação

1. Somente administradores (`isOwnerOrAdmin`) veem o tutorial.
2. Integrador que clicar em "Já conheço / Pular" tem o tour encerrado imediatamente e não vê novamente ao atualizar a página.
3. Possibilidade de reiniciar o tour pelo menu de perfil.
4. Testes visuais com Browser Subagent gravando o fluxo completo.
5. Respeito às regras de estilo (sem emojis de WhatsApp, sem neon exagerado, animações suaves a 60fps).
