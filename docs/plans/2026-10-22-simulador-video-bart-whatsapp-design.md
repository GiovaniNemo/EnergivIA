# Arquitetura & Design: Player/Simulador de Vídeo Interativo BART WhatsApp (EnergivIA)

## 1. Visão Geral do Projeto

Desenvolver um **Player/Simulador de Vídeo Interativo em Next.js (App Router) + Framer Motion (60fps)** dedicado a demonstrar ao integrador solar como o bot **BART** reduz o tempo de dimensionamento e proposta de 1 hora para menos de 2 minutos via WhatsApp (por áudio ou texto).

O simulador é projetado para:

1. **Gravação de Vídeo em Alta Resolução (1080p / 4K):** Com modo apresentação sem bordas e controles de velocidade/pausa para dublagem perfeita.
2. **Demonstração Interativa ao Vivo:** O próprio integrador ou a equipe de vendas pode usar o simulador em tempo real, testando os passos.
3. **Estética Visual Premium:** Iluminação de estúdio clean, fundo neutro sólido/gradiente sutil de luz suave, zero neon, acabamentos em titânio e vidro fosco (_frosted glass_).

---

## 2. Especificação Técnica da Interface

### Rota e Componentes

- **Rota:** `/demo/bart-video` (Pública, sem necessidade de autenticação).
- **Componentes Modulares:**
  1. `BartVideoSimulatorPage`: Controlador de estado da timeline, modo de exibição (9:16 mobile ou 16:9 estúdio), play/pause e velocidade.
  2. `BartMascotVisual`: Renderização do mascote BART com o Model Sheet oficial, visor facial animado reativo (Feliz, Pensativo, Animado, Determinado, Alegre) e micro-interações de respiração/flutuação.
  3. `WhatsappPhoneMockup`: Mockup ultra-realista de smartphone com interface oficial do WhatsApp Business:
     - Header com avatar do BART e status "Online • Respondendo em segundos";
     - Balões de conversa nativos com carimbo de hora e tique duplo azul;
     - Player de áudio interativo com waveform animada;
     - Efeito de digitação dinâmica em tempo real ("Digitando...").
  4. `ProposalInteractiveModal`: Prévia editorial de alta fidelidade da proposta comercial gerada pela EnergivIA (Dashboard, Payback, Módulos e Alerta de Visualização em tempo real).
  5. `WebAudioFxEngine`: Gerador nativo de efeitos sonoros com a Web Audio API (bip de áudio, whoosh de mensagem, cliques táteis e chime de sucesso) sem dependências externas.
  6. `VideoControlBar`: Barra de transporte de vídeo (Play/Pause, Slider de Progresso, 8 Marcos de Tempo, Seletor de Formato 9:16 vs 16:9, e Botão de Gravação/Fullscreen).

---

## 3. Timeline de Cenas (55 Segundos)

| Cena                   | Segundo   | Estado             | Conteúdo Visual                                                                                                | Expressão BART   |
| :--------------------- | :-------- | :----------------- | :------------------------------------------------------------------------------------------------------------- | :--------------- |
| **1. Hook**            | 0s - 7s   | `HOOK_PAIN`        | Mensagem do cliente: "Consegue me mandar a proposta hoje?". Notificação pulsando.                              | Pensativo        |
| **2. Gravação**        | 7s - 15s  | `AUDIO_RECORDING`  | Botão de microfone acionado, onda sonora verde e contador de gravação.                                         | Animado          |
| **3. Áudio Enviado**   | 15s - 23s | `AUDIO_SENT`       | Player de áudio reproduzindo: "Bart, cliente consome 950 kWh em Ribeirão Preto, telhado cerâmico, bifásico."   | Focado / Ouvindo |
| **4. Dimensionamento** | 23s - 34s | `BOT_CALCULATION`  | BART calcula em 3s: HSP 5.12, 7.42 kWp e apresenta 3 kits reais dos distribuidores com potências e inversores. | Determinado      |
| **5. Seleção & Nome**  | 34s - 42s | `SELECTION_NAME`   | Integrador seleciona "1" e digita "Dr. Marcos Rocha".                                                          | Confiante        |
| **6. Proposta Gerada** | 42s - 48s | `PROPOSAL_READY`   | Entrega do resumo técnico comercial, link seguro e texto pronto de encaminhamento.                             | Feliz            |
| **7. Proposta Web**    | 48s - 52s | `PROPOSAL_PREVIEW` | Zoom na tela: proposta interativa com gráficos e alerta: "Dr. Marcos acabou de abrir a proposta!".             | Alegre 👍        |
| **8. CTA Final**       | 52s - 55s | `FINAL_CTA`        | Packshot oficial EnergivIA: "Teste 3 Propostas Gratuitas Agora no WhatsApp".                                   | Piscando 😉      |

---

## 4. Paleta de Cores & Regras Visuais Estritas

- **Zero Neon:** Proibidos brilhos excessivos, roxo neon e saturação artificial.
- **Fundo Sólido Corporativo:** Estúdio fotográfico com gradiente de luz direcional suave (#F1F5F9 a #E2E8F0 no modo clean, ou #0B1120 a #020617 no modo dark corporativo).
- **Cores Oficiais do BART:**
  - Carcaça: #FFFFFF com acabamento esmaltado.
  - Juntas e Headphones: #0E2650 (Azul Marinho Sólido).
  - Luz do Visor: #00D1FF (Azul Ciano suave, apenas no rosto e detalhe lateral).
  - Acentos: #10B981 (Verde Esmeralda suave para dados financeiros).
