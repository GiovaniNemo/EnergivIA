# Design Doc: Vídeo de Apresentação Comercial da EnergivIA (Estilo Claude Code)

- **Data:** 2026-10-06
- **Status:** Aprovado
- **Autor:** Antigravity & GiovaniNemo
- **Duração:** 75 segundos (2.250 frames @ 30fps)
- **Formato:** Vídeo MP4 Full HD (1920x1080) gerado programaticamente via Remotion + Áudio Neural Feminino pt-BR

---

## 1. Objetivo e Posicionamento Comercial

Criar um vídeo de apresentação vendável, de alto impacto e com estética inspirada nos vídeos de lançamento da Anthropic (_Claude Code_): dinâmico, direto ao ponto, com tipografia sofisticada, transições sem engasgos e demonstrações práticas da plataforma real.

### Proposta de Valor

Apresentar a **EnergivIA não apenas como um bot de WhatsApp, mas como o Ecossistema Completo de Vendas e Gestão Solar** para integradores:

1. **WhatsApp com IA:** Entrada veloz de faturas e pré-dimensionamento em segundos.
2. **Editor de Propostas Flexível:** Múltiplos templates modernos, capas personalizadas com a marca do integrador e inclusão de opcionais de alto valor (seguro, garantias estendidas, baterias, etc.).
3. **CRM Solar Completo:** Funil de vendas, acompanhamento de clientes e notificações de visualização de propostas em tempo real.
4. **Fechamento e Conversão:** Proposta interativa web e PDF pronta para aceite instantâneo.

---

## 2. Storyboard e Roteiro de Locução (75 Segundos)

### Cena 1: O Problema das Ferramentas Fragmentadas (0s - 12s | 360 frames)

- **Visual:** Fundo escuro premium (`#0B0F19`), tipografia nítida (Inter/Geist), digitação dinâmica no estilo console de comando tech:
  ```text
  > Planilhas manuais + CRM avulso + PDF estático = Vendas perdidas.
  ```
  Transição fluida revelando a marca e logotipo minimalista da **EnergivIA** com o subtítulo: _O Ecossistema Completo de Vendas Solares_.
- **Locução Feminina:**
  > _"Quantas ferramentas a sua integradora solar usa hoje? Planilhas complexas, CRMs isolados e propostas demoradas fazem você perder clientes antes mesmo de apresentar o preço."_

---

### Cena 2: O Diferencial — IA no WhatsApp em Tempo Real (12s - 27s | 450 frames)

- **Visual:** Mockup minimalista e elegante de chat. O lead envia a foto ou PDF da conta de luz.
  Barra de leitura com animação de scanner rápido e feedback de dados extraídos:
  ```text
  [✓] Fatura processada com sucesso
  • Concessionária: Cemig • Grupo B3
  • Consumo médio: 920 kWh/mês
  • Sistema sugerido: 7,4 kWp (13 módulos 570W)
  ```
  O lead é cadastrado e o projeto pré-dimensionado instantaneamente no sistema.
- **Locução Feminina:**
  > _"A EnergivIA muda esse jogo. Pelo WhatsApp, sua inteligência artificial atende o cliente, extrai os dados da fatura na hora e dimensiona o sistema ideal em segundos. Mas isso é só o ponto de partida."_

---

### Cena 3: Editor de Propostas com Templates & Opcionais (27s - 45s | 540 frames)

- **Visual:** Demonstração do estúdio visual de propostas da EnergivIA:
  - Alternância rápida entre variantes de Capas (Modern, Split, Card Overlay).
  - Identidade visual e logotipo do integrador aplicados na proposta.
  - Seleção de opcionais modulares interativos:
    - `[✓] Seguro contra vendaval e granizo (1 ano)`
    - `[✓] Monitoramento ativo 24/7 de geração`
    - `[✓] Opção de Inversor Híbrido com Bateria`
  - Pré-visualização da proposta interativa com curva de economia e tempo de retorno (payback).
- **Locução Feminina:**
  > _"Você tem em mãos um estúdio completo de propostas. Escolha entre modelos modernos e editáveis, personalize com a identidade da sua empresa e inclua opcionais de alto valor com poucos cliques, gerando propostas interativas e irresistíveis."_

---

### Cena 4: CRM Dedicado ao Mercado Solar (45s - 60s | 450 frames)

- **Visual:** Painel do CRM da EnergivIA com funil em Kanban:
  - Colunas: _Novos Leads_, _Proposta Enviada_, _Em Negociação_, _Contrato Fechado_.
  - Notificação de destaque ao vivo:
    ```text
    ⚡ Cliente João Silva acabou de abrir a Proposta #2041!
    ```
  - Métricas de desempenho: taxa de conversão da equipe, valor total em negociação e tempo médio de fechamento.
- **Locução Feminina:**
  > _"Gerencie todo o seu fluxo com nosso CRM dedicado ao mercado solar. Acompanhe cada etapa da negociação, saiba o momento exato em que o cliente abriu a proposta e mantenha sua equipe focada em fechar contratos."_

---

### Cena 5: Fechamento Comercial & Call to Action (60s - 75s | 450 frames)

- **Visual:** Telas do WhatsApp, Editor de Propostas e CRM convergindo em uma visão panorâmica fluida.
  Encerramento com visual hero de alta autoridade:
  - Logo EnergivIA iluminado com sutileza.
  - Título: _Mais velocidade. Menos burocracia. Muito mais vendas fechadas._
  - Ação: `Acesse energivia.com.br e inicie seu teste gratuito agora.`
- **Locução Feminina:**
  > _"Do primeiro contato no WhatsApp à assinatura do contrato: tudo em um só ecossistema. Acelere suas vendas e profissionalize sua operação. Conheça a EnergivIA e comece seu teste gratuito hoje mesmo."_

---

## 3. Arquitetura Técnica

### 3.1 Subpacote `packages/video-demo`

- Estrutura isolada no monorepo para não sobrecarregar as rotas do Next.js nem afetar o build de produção do app web.
- Dependências principais:
  - `remotion`: Framework de vídeo em React.
  - `@remotion/cli`: Ferramenta para renderizar MP4 e abrir o Studio no navegador.
  - `@remotion/player`: Player interativo.
  - `tailwindcss`: Estilização consistente com o design system da EnergivIA.
  - `lucide-react`: Ícones vetoriais modernos.

### 3.2 Pipeline de Locução de Áudio (Edge-TTS)

- Script Python / Node `scripts/generate-voiceover.py` que gera os 5 blocos de áudio MP3 utilizando a voz neural da Microsoft `pt-BR-FranciscaNeural` (tom corporativo amigável, dicção nítida e natural).
- Arquivos gerados em `packages/video-demo/public/audio/`:
  - `scene-1-problem.mp3`
  - `scene-2-whatsapp.mp3`
  - `scene-3-templates.mp3`
  - `scene-4-crm.mp3`
  - `scene-5-cta.mp3`
- Trilha sonora instrumental de fundo (música corporativa tech minimalista com volume regulado a 8% para manter a voz em primeiro plano).

### 3.3 Componentes de Cena do Remotion

1. `<SceneProblem />`: Typing effect, badges de dor, logo animado.
2. `<SceneWhatsApp />`: Chat bubble animado, fatura de luz, scanner de IA e dados extraídos.
3. `<SceneProposalStudio />`: Seletor de templates, toggle de opcionais, preview da proposta comercial com gráfico de payback.
4. `<SceneSolarCRM />`: Pipeline Kanban, card de notificação em tempo real (cliente visualizou proposta), métricas de vendas.
5. `<SceneClosingCTA />`: Visão unificada dos 3 módulos, slogan e chamada para teste gratuito.

---

## 4. Diretrizes Visuais Estritas

- **Sem emojis de WhatsApp** no vídeo (apenas ícones SVG profissionais e badges limpos).
- **Sem excessos de gradientes neon**; paleta balanceada em Slate escuro (`#090D16`), Verde Solar sóbrio (`#10B981` / `#059669`) e Dourado/Âmbar para métricas financeiras.
- **Tipografia limpa e geométrica** (Inter/Geist) com hierarquia de peso e legibilidade total em telas Full HD e mobile.
- **Movimento orgânico**: Curvas de aceleração `cubic-bezier(0.16, 1, 0.3, 1)` para zooms e entradas em stagger.

---

## 5. Como Executar e Renderizar

```bash
# 1. Gerar os áudios neurais da locutora
python packages/video-demo/scripts/generate-voiceover.py

# 2. Abrir o estúdio do Remotion para pré-visualizar no navegador
pnpm --filter @energivia/video-demo dev

# 3. Renderizar o arquivo final em MP4
pnpm --filter @energivia/video-demo render
# Saída gerada em: packages/video-demo/out/energivia-apresentacao.mp4
```
