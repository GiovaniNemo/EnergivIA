# Design Doc: Refatoração da Máquina de Estados do WhatsApp Bot

- **Data:** 14/10/2026
- **Status:** Aprovado pelo usuário
- **Autor:** Antigravity & Giovani

---

## 1. Objetivo e Escopo

Refatorar o motor de conversação do WhatsApp Bot (`WhatsappBotService`) para operar como uma **Máquina de Estados Finita (FSM) Determinística**, persistindo explicitamente:

1. `metadata.step`: O estado atual do fluxo (Enum/Union type `WhatsappBotStep`).
2. `metadata.sessionData`: Os dados acumulados da simulação (cidade, UF, HSP, consumo, padrão, telhado, kit, preço, cliente, template, etc.).

Essa mudança elimina a fragilidade de inferência por substrings no `lastBotMsg` e o custo de regex sobre mensagens anteriores (`rebuildContextFromHistory`), tornando o bot imune a alterações de texto, mais rápido e resiliente.

---

## 2. Tipagem dos Estados e Dados de Sessão

Criar um arquivo dedicado `apps/api/src/modules/whatsapp/whatsapp-state.types.ts`:

```typescript
export type WhatsappBotStep =
  | "IDLE" // Aguardando fatura, consumo, potência ou saudação
  | "AWAITING_CITY" // Aguardando município e estado (ex: "Maringá/PR")
  | "AWAITING_GRID_TYPE" // Aguardando padrão da rede (Mono, Bi, Tri)
  | "AWAITING_ROOF_TYPE" // Aguardando estrutura do telhado (Cerâmica, Fibro, etc.)
  | "AWAITING_KIT_SELECTION" // Aguardando escolha do kit (1-Standard, 2-Elite, 3-Premium)
  | "AWAITING_PRICE_CONFIRMATION" // Confirmar preço padrão ou digitar outro
  | "AWAITING_CUSTOM_PRICE" // Digitação manual de R$/kWp ou valor total
  | "AWAITING_CLIENT_NAME" // Nome do cliente final
  | "AWAITING_CLIENT_PHONE" // WhatsApp com DDD do cliente final (ou "0" para pular)
  | "AWAITING_TEMPLATE_SELECTION" // Escolha do modelo de proposta
  | "PROPOSAL_COMPLETED"; // Proposta concluída; aceita "PDF" ou "novo"

export interface WhatsappSessionData {
  cidade?: string;
  uf?: string;
  hsp?: number;
  consumptionKwh?: number;
  kwp?: number;
  moduleCount?: number;
  gridType?: string;
  roofType?: string;
  quotesList?: Array<{
    distributorName: string;
    kwp: number;
    estimatedGeneration: number;
    items: string[];
    priceBrl?: number;
    inverterModel?: string;
    moduleModel?: string;
    inverterQty?: number;
  }>;
  selectedQuoteIndex?: number;
  selectedTierName?: string;
  kwpRate?: number;
  quotedSaleBrl?: number;
  clientName?: string;
  clientPhone?: string;
  selectedTemplateId?: string;
  lastProposalId?: string;
  lastProposalNumber?: string;
}
```

---

## 3. Arquitetura e Fluxo de Execução

### 3.1 Roteamento por Estado

Em `generateBotResponse`:

1. **Comandos Globais:**
   - `"novo"`, `"reiniciar"`, `"nova cotação"` -> Limpa mensagens e redefine para `step = "IDLE"`.
   - `"0"` -> Retrocesso controlado:
     - `AWAITING_TEMPLATE_SELECTION` -> `AWAITING_CLIENT_PHONE`
     - `AWAITING_CLIENT_PHONE` -> `AWAITING_CLIENT_NAME`
     - `AWAITING_CLIENT_NAME` -> `AWAITING_KIT_SELECTION`
     - `AWAITING_PRICE_CONFIRMATION` -> `AWAITING_KIT_SELECTION`
     - `AWAITING_KIT_SELECTION` -> `AWAITING_ROOF_TYPE`
     - `AWAITING_ROOF_TYPE` -> `AWAITING_GRID_TYPE`
     - `AWAITING_GRID_TYPE` -> `AWAITING_CITY`
2. **Leitura do Estado:**
   - Obtém `step = conversation.metadata?.step || "IDLE"`.
   - Se `conversation.metadata?.step` não existir (sessões antigas/legadas), usa o resolvedor legado como fallback.
3. **Execução do Handler Específico do Estado:**
   - Cada estado possui uma função focada `handleStep<Name>(input, sessionData, conversation)` que:
     - Valida a entrada do usuário.
     - Atualiza os campos relevantes em `sessionData`.
     - Retorna `{ replyText, nextStep, updatedSessionData }`.
4. **Persistência Atômica:**
   - Atualiza `conversation.metadata` com `{ step: nextStep, sessionData: updatedSessionData }` em uma única operação.

---

## 4. Plano de Tarefas

1. **Task 317:** Criar `whatsapp-state.types.ts` com enums, tipos e utilitários de transição.
2. **Task 318:** Implementar migrador/recuperador que sincroniza `conversation.metadata.sessionData` e `metadata.step`.
3. **Task 319:** Refatorar os handlers de etapas (`AWAITING_CITY`, `AWAITING_GRID_TYPE`, `AWAITING_ROOF_TYPE`, `AWAITING_KIT_SELECTION`, `AWAITING_PRICE_CONFIRMATION`, `AWAITING_CUSTOM_PRICE`, `AWAITING_CLIENT_NAME`, `AWAITING_CLIENT_PHONE`, `AWAITING_TEMPLATE_SELECTION`, `PROPOSAL_COMPLETED`).
4. **Task 320:** Atualizar testes unitários existentes e criar `whatsapp-state-machine.spec.ts` cobrindo todas as transições e o comando "0".
5. **Task 321:** Validar compilação (`@energivia/api build`), lint e rodar todos os testes.
6. **Task 322:** Commit e push para `origin/main`.
