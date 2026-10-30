# NOTE: EnergivIA Launch Film (22s)

## 1. The One Idea and Why

- **Idea:** "O Feixe de Laser & Conversão em 2 Minutos" (The Laser Core Delivery).
- **Why:** EnergivIA resolve o maior gargalo comercial de empresas de energia solar: a demora de dias entre receber uma conta de luz e entregar a proposta comercial técnica. O feixe vertical de laser esmeralda (`#10b981`) funciona como carreador óptico e condutor de energia que escaneia a fatura física, calcula a engenharia instantaneamente e projeta a proposta pronta no WhatsApp do cliente em tempo recorde.

---

## 2. Beats & Beliefs ("Buys")

1. **Beat 1 (0.0s – 3.5s):** _Buys that solar integrators are losing hot leads while stuck in manual spreadsheets._
2. **Beat 2 (3.5s – 7.0s):** _Buys that EnergivIA's AI extracts complex bill data (kWh, tariff, utility, historical average) in seconds without manual entry._
3. **Beat 3 (7.0s – 12.0s):** _Buys that the engine performs real engineering calculations (system power, modules, inverter, generation, financial savings) automatically._
4. **Beat 4 (12.0s – 17.5s):** _Buys that the client receives a gorgeous, interactive proposal on WhatsApp in under 2 minutes._
5. **Beat 5 (17.5s – 22.0s):** _Buys that EnergivIA is the definitive growth tool to scale solar sales today._

---

## 3. What is Real vs. Illustrative

- **Real:**
  - Logotipo oficial, paleta de cores e tipografia da EnergivIA.
  - Regras de dimensionamento fotovoltaico (kWp, irradiação kWh/m², cálculo de geração e economia mensal).
  - Fluxo real do bot conversacional no WhatsApp com cards de proposta interativa.
  - URL institucional `energivia.com.br`.
- **Illustrative:**
  - Mockup de conta de energia estilizador em vidro dark mode para efeito de varredura cinematográfica.
  - O feixe laser volumétrico central simbolizando processamento neural acelerado.

---

## 4. Frame Descriptions (Contact Sheet)

1. **0.33s:** Fundo escuro Deep Obsidian cortado pelo feixe laser vertical iluminando a pergunta inicial.
2. **2.33s:** Texto de dor do integrador se expande e acelera em direção ao corte.
3. **4.33s:** Fatura de energia entra inclinada com o feixe de escaneamento varrendo de cima a baixo.
4. **6.33s:** Pílulas de métricas extraídas (Consumo, Tarifa, Irradiação) flutuam em perspectiva à direita.
5. **8.33s:** Card de dimensionamento técnico surge com contagem de potência fotovoltaica (12.8 kWp).
6. **10.33s:** Geração estimada (1.720 kWh) e economia líquida (R$ 1.340) alcançam seus valores finais.
7. **13.33s:** Smartphone escuro exibe notificação recebida do WhatsApp com avatar e bot oficial.
8. **15.33s:** Card da proposta comercial interativa pronta e cronômetro cravando 01m:48s.
9. **18.33s:** Feixe laser converge para o centro, revelando o logotipo oficial EnergivIA.
10. **20.33s:** Slogan e endereço `energivia.com.br` assentam com brilho de borda esmeralda.

---

## 5. Audit Numbers (Gates G0–G5)

- **Gate G0 (Render exists):** **PASS** — Duração exata de 22.00s (660 quadros a 30fps), 1920x1080 H.264.
- **Gate G1 (Proof readable):** **PASS** — Tipografia de UI >= 0.04H e números de engenharia ocupando posições dominantes no enquadramento.
- **Gate G2 (No empty frames):** **PASS** — Nenhum intervalo de quadros planos consecutivos > 3 quadros.
- **Gate G3 (End card & CTA share):** **PASS / NOTE** — A tomada final dura 4.50s (20% do filme, respeitando o teto de <= 25%).
- **Gate G4 (One hero per frame):** **PASS** — Hierarquia clara em cada cena (Pergunta -> Fatura -> Kit Solar -> Smartphone -> Marca).
- **Gate G5 (No page chrome):** **PASS** — Zero contadores genéricos, barras de progresso ou caixas falsas de slide (15/15 regras aprovadas no `lint.mjs`).

---

## 6. What to Improve in Future Versions

- Integrar uma trilha sonora com sincronia de beat nos cortes e sound effects de laser (`mix.py`) assim que uma chave de áudio/ElevenLabs estiver disponível.
- Adicionar renders 3D em WebGL (`hero3d`) do inversor solar e dos módulos fotovoltaicos em órbita física ao redor do feixe central.
