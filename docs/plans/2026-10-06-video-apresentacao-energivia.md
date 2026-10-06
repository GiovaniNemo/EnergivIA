# Vídeo de Apresentação Comercial EnergivIA Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Criar o pacote de vídeo programático `@energivia/video-demo` em Remotion com áudio neural feminino (pt-BR), renderizando um vídeo MP4 Full HD de 75 segundos no estilo tech/Claude Code demonstrando o ecossistema completo da EnergivIA (WhatsApp com IA + Editor de Propostas com Opcionais + CRM Solar).

**Architecture:** Pacote isolado no monorepo pnpm utilizando Remotion (React, Tailwind CSS, Lucide Icons) com cenas modulares sequenciadas por timeline em 30fps. Script autônomo em Python/Node gera áudios de locução neural em português brasileiro sincronizados cena a cena. Renderização via CLI para gerar o arquivo MP4 final.

**Tech Stack:** Remotion 4.x, React 19, Tailwind CSS, Lucide React, Python edge-tts (voz `pt-BR-FranciscaNeural`), pnpm monorepo.

---

### Task 1: Setup da Estrutura do Pacote `@energivia/video-demo`

**Files:**

- Create: `packages/video-demo/package.json`
- Create: `packages/video-demo/tsconfig.json`
- Create: `packages/video-demo/remotion.config.ts`
- Create: `packages/video-demo/src/index.ts`
- Create: `packages/video-demo/src/Root.tsx`
- Create: `packages/video-demo/src/styles/global.css`

**Step 1: Criar o manifesto `package.json` e configurações do Remotion**
Definir scripts `dev` (Remotion Studio), `render` (CLI MP4) e dependências (`remotion`, `@remotion/cli`, `react`, `react-dom`, `lucide-react`, `tailwindcss`).

**Step 2: Configurar TypeScript e Tailwind**
Garantir resolução de paths, suporte a JSX moderno e paleta de cores (Slate, Emerald, Amber, Cyan).

**Step 3: Criar ponto de entrada `src/index.ts` e `src/Root.tsx`**
Registrar a composição `EnergiviaShowcase` com 1920x1080, 30fps e duração de 2250 frames (75 segundos).

**Step 4: Verificar compilação com `pnpm install` e teste de tipos**
Run: `pnpm --filter @energivia/video-demo exec tsc --noEmit`
Expected: 0 erros de tipo.

**Step 5: Commit**
`git add packages/video-demo`
`git commit -m "feat(video): setup do pacote remotion video-demo"`

---

### Task 2: Pipeline de Locução Neural Feminina (Edge-TTS) & Áudios

**Files:**

- Create: `packages/video-demo/scripts/generate-voiceover.py`
- Output: `packages/video-demo/public/audio/scene-1.mp3`
- Output: `packages/video-demo/public/audio/scene-2.mp3`
- Output: `packages/video-demo/public/audio/scene-3.mp3`
- Output: `packages/video-demo/public/audio/scene-4.mp3`
- Output: `packages/video-demo/public/audio/scene-5.mp3`

**Step 1: Escrever script de geração de áudio em Python**
Script configurado com a voz neural `pt-BR-FranciscaNeural` e taxa de fala levemente calibrada (+5%) para um ritmo dinâmico e comercial.

**Step 2: Executar a geração dos arquivos de áudio**
Run: `python packages/video-demo/scripts/generate-voiceover.py`
Expected: Todos os 5 arquivos de áudio `.mp3` gerados na pasta `public/audio/`.

**Step 3: Validar a existência e integridade dos arquivos gerados**
Verificar que cada arquivo de áudio possui tamanho > 0 bytes.

**Step 4: Commit**
`git add packages/video-demo/scripts packages/video-demo/public/audio`
`git commit -m "feat(video): pipeline de locucao neural feminina pt-BR"`

---

### Task 3: Componentes Visuais Reutilizáveis & Design System do Vídeo

**Files:**

- Create: `packages/video-demo/src/components/TerminalPrompt.tsx`
- Create: `packages/video-demo/src/components/PhoneChatMockup.tsx`
- Create: `packages/video-demo/src/components/ProposalEditorMockup.tsx`
- Create: `packages/video-demo/src/components/CrmKanbanMockup.tsx`
- Create: `packages/video-demo/src/components/BrandBadge.tsx`

**Step 1: Criar `TerminalPrompt.tsx`**
Efeito de digitação suave por caractere (`useCurrentFrame`), barra de status e cores de console tech minimalista.

**Step 2: Criar `PhoneChatMockup.tsx`**
Card de celular estilizado com mensagens de WhatsApp da EnergivIA: envio de fatura, leitura com scanner animado e confirmação de dados extraídos.

**Step 3: Criar `ProposalEditorMockup.tsx`**
Interface do editor de propostas com seleção de templates (Modern/Split), toggles de opcionais (Seguro, Bateria, Monitoramento) e gráfico de retorno financeiro.

**Step 4: Criar `CrmKanbanMockup.tsx`**
Funil de vendas solar em colunas com card animado de notificação: `⚡ Cliente abriu a proposta agora!`.

**Step 5: Testar tipagem dos componentes**
Run: `pnpm --filter @energivia/video-demo exec tsc --noEmit`
Expected: PASS sem erros.

**Step 6: Commit**
`git add packages/video-demo/src/components`
`git commit -m "feat(video): componentes visuais reutilizaveis estilo claude code"`

---

### Task 4: Implementação das Cenas 1 e 2 (Problema & WhatsApp com IA)

**Files:**

- Create: `packages/video-demo/src/scenes/Scene1Problem.tsx`
- Create: `packages/video-demo/src/scenes/Scene2WhatsApp.tsx`

**Step 1: Implementar `Scene1Problem.tsx` (0s - 12s / 360 frames)**

- Hook de abertura com digitação rápida: `> Planilhas manuais + CRM avulso + PDF estático = Vendas perdidas.`
- Transição cinematográfica com spring easing revelando o logo da EnergivIA.
- Integração da tag `<Audio src={staticFile("audio/scene-1.mp3")} />`.

**Step 2: Implementar `Scene2WhatsApp.tsx` (12s - 27s / 450 frames)**

- Entrada do chat do WhatsApp.
- Animação do upload da fatura pelo lead e barra de progresso do scanner de IA.
- Exibição dos dados técnicos extraídos (Consumo, Potência sugerida, Módulos).
- Integração de `<Audio src={staticFile("audio/scene-2.mp3")} />`.

**Step 3: Validar montagem e tipos**
Run: `pnpm --filter @energivia/video-demo exec tsc --noEmit`
Expected: PASS.

**Step 4: Commit**
`git add packages/video-demo/src/scenes`
`git commit -m "feat(video): cenas 1 e 2 - hook e whatsapp bot com IA"`

---

### Task 5: Implementação das Cenas 3 e 4 (Editor de Propostas com Opcionais & CRM Solar)

**Files:**

- Create: `packages/video-demo/src/scenes/Scene3ProposalStudio.tsx`
- Create: `packages/video-demo/src/scenes/Scene4Crm.tsx`

**Step 1: Implementar `Scene3ProposalStudio.tsx` (27s - 45s / 540 frames)**

- Zoom in no editor de propostas: alternância visual de modelos e capas.
- Efeito de clique e ativação de itens opcionais (Seguro, Monitoramento 24h, Bateria).
- Apresentação da proposta final gerada com botão de aceite digital.
- Integração de áudio da cena 3.

**Step 2: Implementar `Scene4Crm.tsx` (45s - 60s / 450 frames)**

- Entrada do painel de CRM com funil em Kanban.
- Card flutuante dinâmico com badge de alerta em tempo real de visualização da proposta.
- Métricas e taxa de fechamento subindo.
- Integração de áudio da cena 4.

**Step 3: Validar montagem e tipos**
Run: `pnpm --filter @energivia/video-demo exec tsc --noEmit`
Expected: PASS.

**Step 4: Commit**
`git add packages/video-demo/src/scenes`
`git commit -m "feat(video): cenas 3 e 4 - editor de propostas e CRM solar"`

---

### Task 6: Cena 5 (Fechamento Comercial & CTA) e Orquestração Geral (`EnergiviaShowcase.tsx`)

**Files:**

- Create: `packages/video-demo/src/scenes/Scene5ClosingCTA.tsx`
- Create: `packages/video-demo/src/EnergiviaShowcase.tsx`

**Step 1: Implementar `Scene5ClosingCTA.tsx` (60s - 75s / 450 frames)**

- Composição harmônica com os 3 pilares (WhatsApp + Proposta + CRM).
- Slogan de alta conversão: _O ecossistema definitivo para a sua integradora solar._
- Chamada para ação clara: `energivia.com.br • Inicie seu teste gratuito agora`.
- Integração de áudio da cena 5 e fade out de áudio.

**Step 2: Implementar `EnergiviaShowcase.tsx`**
Orquestrar as 5 cenas em `<Sequence>` com duração exata calculada para 2250 frames (75s).
Adicionar trilha sonora instrumental ambiente em volume sutil (sidechain / background).

**Step 3: Validar integridade e compilação**
Run: `pnpm --filter @energivia/video-demo exec tsc --noEmit`
Expected: 0 erros de TypeScript.

**Step 4: Commit**
`git add packages/video-demo/src`
`git commit -m "feat(video): cena 5 de fechamento e orquestracao principal"`

---

### Task 7: Renderização do Vídeo MP4 & Validação de Qualidade

**Files:**

- Output: `packages/video-demo/out/energivia-apresentacao.mp4`

**Step 1: Executar renderização pelo CLI do Remotion**
Run: `pnpm --filter @energivia/video-demo exec remotion render src/index.ts EnergiviaShowcase out/energivia-apresentacao.mp4`
Expected: Renderização concluída com sucesso com arquivo MP4 gerado em 1080p.

**Step 2: Verificar tamanho e existência do vídeo gerado**
Confirmar arquivo `out/energivia-apresentacao.mp4` gerado e não vazio.

**Step 3: Validar visualmente com Browser Subagent**
Abrir o Remotion Studio / preview e validar a fluidez da animação, sincronia da voz e ausência de travamentos.

**Step 4: Commit e Push para origin/main**
`git add packages/video-demo docs/plans/task.md`
`git commit -m "feat(video): video final de apresentacao comercial da energivia gerado com sucesso"`
`git push origin main`
