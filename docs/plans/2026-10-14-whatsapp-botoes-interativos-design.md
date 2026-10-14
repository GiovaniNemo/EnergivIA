# Design da Arquitetura: Botões e Listas Interativas no WhatsApp Bot

**Data:** 2026-10-14  
**Status:** Aprovado  
**Objetivo:** Modernizar a experiência conversacional do assistente EnergivIA no WhatsApp, substituindo menus puramente textuais por **Quick Reply Buttons** (botões de clique direto) e **Interactive Lists** (menus suspensos) nativos do WhatsApp, reduzindo a fricção e eliminando erros de digitação durante o dimensionamento e cotação de energia solar.

---

## 1. Contexto & Desafios Atuais

Atualmente, o fluxo do WhatsApp (`whatsapp-bot.service.ts` e `whatsapp-cloud.service.ts`) funciona exclusivamente via texto puro numerado. O usuário precisa ler a mensagem e digitar manualmente `1`, `2`, `3` ou termos como `mono`, `tri`, `cerâmica`.

Principais dores:

- **Digitação repetitiva:** O integrador precisa digitar várias opções consecutivas no celular durante visitas ou em trânsito.
- **Erros de digitação:** Palavras com grafia diferente ou números inválidos geram repetição de perguntas.
- **Ausência de suporte nativo a eventos interativos:** Cliques em botões recebidos via Webhook Meta ou Evolution API não eram mapeados como intenções textuais válidas.

---

## 2. Arquitetura da Solução

### 2.1. Abordagem Híbrida (Botões vs. Listas)

A API do WhatsApp impõe limites rígidos para elementos interativos:

- **Quick Reply Buttons:** Limite estrito de no máximo **3 botões** por mensagem (texto de cada botão até 20 caracteres).
- **Interactive Lists:** Suporte de até **10 itens**, organizados em seções com título e descrição opcional.

Portanto, a solução adota o modelo híbrido:

1. **Até 3 opções:** Usa **Quick Reply Buttons** (ex.: Escolha de Kits, Decisão de Preço).
2. **Mais de 3 opções:** Usa **Interactive List** (ex.: Menu Inicial, Padrão Elétrico, Estrutura do Telhado, Modelos de Proposta).

### 2.2. Fluxo de Envio e Fallback Automático (Resiliente)

```
[WhatsappBotService]
        │
        ▼ Decide envio (Botão / Lista / Texto)
[WhatsappCloudService]
   ├── Provider = "evolution" ──▶ POST /message/sendButtons ou /message/sendList
   │                                     │ (se falhar)
   │                                     ▼ Fallback automático para sendTextMessage
   └── Provider = "meta"      ──▶ POST graph.facebook.com/.../messages (type: "interactive")
                                         │ (se falhar ou erro de formato)
                                         ▼ Fallback automático para sendTextMessage
```

Se o envio interativo falhar por qualquer razão (ex.: restrição da WABA, aparelho do cliente sem suporte, indisponibilidade temporária de endpoint), o serviço executa fallback transparente para `sendTextMessage`, garantindo que nenhuma mensagem seja perdida.

### 2.3. Normalização de Entrada (Webhooks Meta & Evolution API)

Para manter compatibilidade absoluta com o motor de estados existente e garantir que tanto o clique quanto a digitação manual funcionem de forma idêntica:

1. **Meta Cloud API (`handleWebhookPayload`):**
   - Intercepta `message.type === "interactive"`.
   - Se `interactive.type === "button_reply"`: extrai `button_reply.id` ou `button_reply.title`.
   - Se `interactive.type === "list_reply"`: extrai `list_reply.id` ou `list_reply.title`.
   - Mapeia para `incomingText = button_reply.id || button_reply.title`.

2. **Evolution API (`handleEvolutionWebhookPayload`):**
   - Intercepta `buttonsResponseMessage`, `listResponseMessage` e `templateButtonReplyMessage`.
   - Extrai o identificador ou título selecionado (`selectedButtonId`, `selectedRowId` ou `selectedDisplayText`).
   - Mapeia para `incomingText`.

---

## 3. Mapeamento Detalhado por Etapa Conversacional

| Etapa                    | Tipo de Componente                            | Botões / Linhas da Lista                                                                                                                 | ID de Retorno Mapeado                           |
| :----------------------- | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| **Menu Inicial**         | **Lista Interativa** (`sendInteractiveList`)  | 1. 📄 Enviar fatura de energia<br>2. ⚡ Simular por consumo mensal<br>3. ☀️ Simular por potência de pico<br>4. 🔌 Simular por placas     | `"1"`, `"2"`, `"3"`, `"4"`                      |
| **Padrão Elétrico**      | **Lista Interativa** (`sendInteractiveList`)  | 1. ⚡ Monofásico 220V<br>2. ⚡ Bifásico 127V/220V<br>3. ⚡ Trifásico 220V<br>4. ⚡ Trifásico 380V                                        | `"1"`, `"2"`, `"3"`, `"4"`                      |
| **Estrutura do Telhado** | **Lista Interativa** (`sendInteractiveList`)  | 1. 🏠 Cerâmica (Colonial)<br>2. 🏠 Fibrocimento<br>3. 🏠 Metálico<br>4. 🏠 Solo<br>5. 🏠 Laje<br>6. 🏠 Fibrometal<br>7. 🏠 Sem estrutura | `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`, `"7"` |
| **Escolha do Kit**       | **Botões Rápidos** (`sendInteractiveButtons`) | `[1️⃣ Standard]` `[2️⃣ Elite]` `[3️⃣ Premium]`                                                                                              | `"1"`, `"2"`, `"3"`                             |
| **Decisão de Preço**     | **Botões Rápidos** (`sendInteractiveButtons`) | `[1️⃣ Preço Padrão]` `[2️⃣ Outro Preço]`                                                                                                   | `"1"`, `"2"`                                    |
| **Modelo de Proposta**   | **Lista Interativa** (`sendInteractiveList`)  | Modelos configurados na organização (ex: Moderno, Executivo, Minimalista)                                                                | `"1"`, `"2"`, `"3"`                             |

---

## 4. Estratégia de Testes e Validação

1. **Testes Unitários:**
   - Adicionar suíte de testes em `apps/api/src/modules/whatsapp/__tests__/whatsapp-interactive-buttons.spec.ts`.
   - Simular payloads de webhook interativos da Meta Cloud API e Evolution API.
   - Validar se o clique no botão `1️⃣ Standard` avança para a etapa de precificação com o mesmo comportamento da digitação manual `"1"`.
   - Validar fallback para texto caso a chamada de botões retorne erro HTTP.

2. **Testes de Regressão:**
   - Executar os testes existentes (`whatsapp-web-chat-sync.spec.ts`, `whatsapp-special-access-revocation.spec.ts`) para garantir 100% de integridade.
