# 🎬 Prompt & Script de Produção para Google Flow (Veo AI Video)

> **Ferramenta:** Google Flow (`flow.google`) / Google DeepMind Veo  
> **Tema:** EnergivIA WhatsApp AI – Dimensionamento Solar e Propostas em < 2 min  
> **Personagem Principal:** BART (Mascote 3D Oficial EnergivIA)  
> **Direção de Fotografia:** High-End Commercial, Luz Natural de Estúdio, **Zero Neon**, Profissional e Clean.  
> **Proporção Recomendada:** 9:16 (Vertical Reels/WhatsApp) ou 16:9 (Widescreen 4K).

---

## 1. Preparação no Google Flow (Setup de Ingredientes)

Antes de colar os prompts, configure o projeto no Google Flow:

1. **Ingrediente Visual (Character Reference / Asset):**
   - Faça upload do **Model Sheet do BART** (`bart-sheet.jpg`) como imagem de referência de personagem (_Character Ingredient_).
   - Nomeie o ingrediente como: `@BART_Robot`.
2. **Aspect Ratio:** Selecione **9:16** (para envio nativo em tela cheia no WhatsApp e Reels) ou **16:9**.
3. **Negative Prompt Geral (Obrigatório para evitar Neon e distorções):**
   ```text
   neon lights, cyberpunk, purple glow, dark sci-fi, harsh strobe, oversaturated colors, distorted robot hands, watermark, cartoonish 2D, blurry textures, cheap CGI
   ```

---

## 2. Prompt Único Completo (Master One-Shot Prompt)

_Use este prompt se você quiser gerar um vídeo contínuo em uma única geração ou estender a partir do primeiro frame:_

```text
Cinematic 4K commercial advertisement for a B2B solar energy software. Clean, bright high-end architectural studio background with soft natural daylight, smooth diffused shadows, matte slate gray and deep navy blue tones, elegant engineering aesthetic. ZERO NEON, ZERO GLOW.

The main character is @BART_Robot: a polished, friendly, state-of-the-art white robot mascot with glossy ceramic finish, solid deep navy blue joints and headphones, and an expressive black OLED visor face with gentle cyan smiling eyes.

The video shows a seamless fast-paced sequence:
A modern smartphone rests on a bright blonde-wood desk. An urgent WhatsApp notification pops up from a customer: "Can you send me the solar quote today?".
Next cut: POV of a solar integrator holding the phone at a sunlit job site, pressing the green WhatsApp microphone button to record a quick voice message: "Bart, client consumes 950 kWh in Ribeirão Preto, ceramic roof, two-phase."
@BART_Robot appears alongside the phone, confidently crunching numbers as subtle clean telemetry data floats beside him (HSP 5.12, 7.42 kWp). Within 2 seconds, the WhatsApp chat receives the automated solar sizing with 2 top distributor kit options.
The integrator quickly types "1" and the client name "Dr. Marcos Rocha".
Instantly, a full commercial solar proposal is delivered with a secure link. The camera fluidly zooms into the smartphone screen displaying the modern editorial solar proposal dashboard with monthly savings and equipment badges. A real-time toast alert drops down: "Dr. Marcos just opened your proposal on WhatsApp!".
Closing shot: @BART_Robot stands proudly in 3/4 pose giving a confident thumbs-up next to the official clean EnergivIA logo and a WhatsApp call-to-action banner: "Test 3 Free Proposals Today".
Camera motion: dynamic cinematic push-in, shallow depth of field, 60fps fluid motion, hyper-realistic physics, Apple-commercial aesthetic.
```

---

## 3. Roteiro Cena a Cena (Shot List para a Timeline do Google Flow)

_Para máxima fidelidade, crie cena por cena na linha do tempo do Google Flow utilizando os prompts abaixo:_

### 📍 Cena 1: O Gancho & A Dor do Integrador (0s - 5s)

- **Prompt:**
  ```text
  Macro cinematic close-up shot of an iPhone 16 Pro resting on a clean, sunlit minimalist architectural desk. Natural daylight streams through large windows, creating soft diffused shadows. On the phone screen, a realistic WhatsApp notification slides in: "Dr. Marcos (Client): Consegue me mandar o orçamento ainda hoje?". Camera slowly dollies forward. In the background, @BART_Robot, a sleek white and navy blue robot mascot, looks thoughtfully at the screen with an inquisitive visor expression. Pristine 4K, photorealistic, clean commercial lighting, zero neon, corporate elegance.
  ```
- **Áudio Nativo / SFX Prompt (Veo Audio):**
  ```text
  Gentle subtle WhatsApp message pop, quiet office ambiance, ticking clock in distance.
  ```

---

### 📍 Cena 2: A Solução – Áudio pelo WhatsApp (5s - 11s)

- **Prompt:**
  ```text
  First-person POV shot of a solar contractor wearing a professional clean polo shirt, holding a smartphone inside a brightly lit vehicle or at a modern solar roof installation site during daytime. His thumb presses the green WhatsApp microphone button. A smooth animated green audio waveform expands on screen with a clean recording counter "0:05". Next second, the audio bubble sends into the chat with a crisp transcription below: "Bart, cliente consome 950 kWh em Ribeirão Preto, telhado cerâmico, bifásico." Fluid camera handheld motion, natural sunlight, crisp 60fps.
  ```
- **Áudio Nativo / SFX Prompt (Veo Audio):**
  ```text
  Clear WhatsApp audio recording start beep, authentic voiceover in Portuguese saying "Bart, cliente consome 950 kWh em Ribeirão Preto, telhado cerâmico bifásico", smooth message sent whoosh.
  ```

---

### 📍 Cena 3: O Cálculo da IA & Kits de Distribuidores (11s - 17s)

- **Prompt:**
  ```text
  Dynamic split-focus shot in a bright studio environment. On the left, @BART_Robot stands with a focused, determined facial expression on his dark OLED visor as clean white floating telemetry badges show: "HSP: 5.12 kWh/m²" and "Potência: 7.42 kWp". On the right, the WhatsApp phone screen instantly receives the AI response: a formatted card with "☀️ Dimensionamento Solar Concluído" and 2 distributor kit options with 575W modules and inverters. High-tech fintech aesthetic, clean white background with soft shadows, zero neon, snappy UI micro-animations.
  ```
- **Áudio Nativo / SFX Prompt (Veo Audio):**
  ```text
  Subtle modern digital data calculation sound, crisp WhatsApp incoming message pop.
  ```

---

### 📍 Cena 4: Seleção do Kit e Entrega em Menos de 2 Minutos (17s - 23s)

- **Prompt:**
  ```text
  Smooth cinematic push-in on the WhatsApp chat interface. The user quickly taps "1", the bot politely asks "Qual o nome do seu cliente final?", and the user types "Dr. Marcos Rocha". Immediately, a green verified checkmark appears and @BART_Robot smiles cheerfully. The bot delivers a polished message: "Proposta Comercial Gerada com Sucesso! 📋" featuring the project summary (7.42 kWp, R$ 26.800,00), a secure preview link, and a forwardable message ready for the client. Clean typography, fast responsive interaction, 4K rendering.
  ```
- **Áudio Nativo / SFX Prompt (Veo Audio):**
  ```text
  Light tactile phone typing sounds, harmonic major chord chime representing successful proposal generation.
  ```

---

### 📍 Cena 5: Proposta Web & Alerta de Visualização em Tempo Real (23s - 28s)

- **Prompt:**
  ```text
  The camera fluidly glides into the smartphone screen as it opens the web browser displaying the EnergivIA interactive solar proposal. Clean editorial layout with solar panels, dynamic ROI payback chart, and monthly savings of R$ 910/mês. Suddenly, a sleek dark green toast notification drops from the top of the screen: "🔔 Alerta WhatsApp: Dr. Marcos acabou de abrir a sua proposta comercial!". Camera smoothly tilts to show @BART_Robot celebrating in background with a happy joyful visor expression. Premium architectural aesthetic, soft reflections.
  ```
- **Áudio Nativo / SFX Prompt (Veo Audio):**
  ```text
  Smooth web page open sound, subtle pleasant notification chime, soft celebratory digital tone.
  ```

---

### 📍 Cena 6: Fechamento & Call to Action (28s - 32s)

- **Prompt:**
  ```text
  Wide studio packshot with soft overhead studio lighting and pristine white-to-slate gradient background. In the center, @BART_Robot stands in three-quarters view proudly giving a confident thumbs-up gesture with a friendly blinking visor eye. Next to him, the official navy blue EnergivIA logo ("EnergivIA - O sol que potencia sua vida") and a bold, elegant action banner: "TESTE 3 PROPOSTAS GRATUITAS AGORA - Mande um Oi no WhatsApp". A clean smartphone displays the WhatsApp conversation. Premium corporate finish, 4K UHD, 60fps.
  ```
- **Áudio Nativo / SFX Prompt (Veo Audio):**
  ```text
  Inspiring, confident modern corporate musical crescendo, subtle friendly robotic beep signature at the end.
  ```

---

## 4. Dicas de Ouro para o Prompt no Google Flow

1. **Manter o Robô Idêntico em Todos os Shots:**
   - Sempre mencione o identificador `@BART_Robot` em cada cena para que o Veo utilize os pesos da imagem do Model Sheet.
2. **Evitar Iluminação Sci-Fi/Neon:**
   - Termos como `soft natural daylight`, `high-key studio lighting`, `matte ceramic finish` e `architectural photography` garantem que o Google Flow nunca gere estética neon ou roxa.
3. **Pacing:**
   - Se o Google Flow gerar cenas muito lentas, use o comando: `fast-paced dynamic motion, snappy commercial cut`.
