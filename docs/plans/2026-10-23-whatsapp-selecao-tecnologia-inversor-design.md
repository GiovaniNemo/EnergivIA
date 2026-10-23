# Design da Solução: Seleção Evidente de Tecnologia de Inversor no WhatsApp (String, Micro e Híbrido)

## 1. Contexto & Motivação

Anteriormente, o assistente WhatsApp da EnergivIA gerava kits com inversor String tradicional por padrão e apenas ativava Microinversor ou Inversor Híbrido se o usuário enviasse palavras-chave específicas como "micro" ou "híbrido".
Nos testes práticos, observou-se que a existência dessas opções não ficava evidente para os integradores, gerando a necessidade de "adivinhar" o comando "híbrido".

Este documento especifica a introdução de uma etapa explícita de seleção de tecnologia (`AWAITING_INVERTER_TYPE`) no fluxo conversacional, com suporte a _fast-forward_ inteligente e navegação determinística de retrocesso.

---

## 2. Arquitetura da Máquina de Estados (FSM)

### 2.1 Novo Estado: `AWAITING_INVERTER_TYPE`

Inserido na FSM do WhatsApp:

```
AWAITING_CITY -> AWAITING_GRID_TYPE -> AWAITING_ROOF_TYPE -> AWAITING_INVERTER_TYPE -> (se híbrido: AWAITING_BATTERY_STORAGE) -> AWAITING_KIT_SELECTION
```

### 2.2 Mapeamento de Retrocesso (`STEP_PREVIOUS_MAP`)

- `AWAITING_INVERTER_TYPE`: volta para `AWAITING_ROOF_TYPE`.
- `AWAITING_BATTERY_STORAGE`: volta para `AWAITING_INVERTER_TYPE`.
- `AWAITING_KIT_SELECTION`: volta para `AWAITING_INVERTER_TYPE`.
- `AWAITING_ROOF_TYPE`: volta para `AWAITING_GRID_TYPE`.

---

## 3. Mensagens e Comportamento Conversacional

### 3.1 Pergunta de Tecnologia (`INVERTER_TYPE_OPTIONS_TEXT`)

```text
*_Qual tecnologia de inversor você prefere para esta cotação?_* ⚡

> 1️⃣ *Inversor Tradicional (String)* (Mais comum para telhados convencionais)
> 2️⃣ *Microinversor* (Ideal para múltiplas águas ou sombreamentos)
> 3️⃣ *Inversor Híbrido* (Com suporte a baterias para backup/armazenamento)
> 0️⃣ *Voltar / Corrigir estrutura*

_(Responda com o número da opção desejada)_
```

### 3.2 Transições e Fast-Forward

- Se a mensagem original do integrador já continha a tecnologia (ex: _"8 kWp micro"_, _"cotação híbrida 10 kWh"_, _"microinversor 12 módulos"_):
  - Se for `hybrid` e ainda não tiver armazenamento definido: transiciona direto para `AWAITING_BATTERY_STORAGE`.
  - Se for `microinverter` ou `string` (ou `hybrid` com baterias já definidas): transiciona direto para `AWAITING_KIT_SELECTION` gerando os kits.
- Se o integrador responder:
  - `1`, `1️⃣`, `string`, `tradicional`: define `inverterType = "string"` e avança para `AWAITING_KIT_SELECTION`.
  - `2`, `2️⃣`, `micro`, `microinversor`: define `inverterType = "microinverter"` e avança para `AWAITING_KIT_SELECTION`.
  - `3`, `3️⃣`, `hibrido`, `híbrido`: define `inverterType = "hybrid"` e avança para `AWAITING_BATTERY_STORAGE`.
  - `0`, `0️⃣`, `voltar`: retorna para `AWAITING_ROOF_TYPE`.

### 3.3 Menu Inicial (`buildGreetingMenu`)

Adiciona nota informativa no menu inicial destacando que a EnergivIA dimensiona Inversores String, Microinversores e Inversores Híbridos com baterias.

### 3.4 Correção do Bug de Regex de Telhado (`| 🏠 Estrutura: )_`)

Ajusta a regex de extração de `roofType` a partir de confirmações anteriores do bot para validar apenas nomes de estruturas reais válidas (`Cerâmica (Colonial)`, `Fibrocimento`, `Metálico`, `Solo`, `Laje`, `Fibrometal`, `Sem estrutura`), evitando capturar caracteres residuais como `)` ou `_`.

---

## 4. Testes & Critérios de Aceite

1. **Transição de Telhado para Tecnologia:** Ao responder a estrutura do telhado (1 a 7), o bot pergunta a tecnologia do inversor.
2. **Seleção de String:** Ao escolher opção 1, kits tradicionais são exibidos.
3. **Seleção de Microinversor:** Ao escolher opção 2, kits com microinversores são calculados e exibidos.
4. **Seleção de Híbrido:** Ao escolher opção 3, o bot pergunta a capacidade de bateria e, após resposta, exibe kits híbridos com baterias.
5. **Fast-forward:** Se a cotação inicial disser _"8 kwp micro"_, o bot não pergunta a tecnologia e vai direto aos kits.
6. **Comando Voltar (0):** Em kits ou bateria, enviar "0" retorna à escolha de tecnologia; em tecnologia, enviar "0" retorna ao telhado.
7. **Sem Emojis de WhatsApp:** Nenhum emoji restrito é utilizado na plataforma web.
