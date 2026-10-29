# Design: Conversão para Venda em Ganho e Kanban Arrastável no Painel com Sincronização Bidirecional

## 1. Contexto e Objetivo

1. **Conversão de Proposta para Venda:**
   - Propostas aceitas offline (por exemplo, via PDF impresso ou enviado externamente) e convertidas em venda através do botão "Converter para Venda" devem automaticamente transicionar o cliente e a negociação vinculada (`Deal`) para o estágio `WON` ("Ganho / Fechado"), com status da proposta atualizado para `ACCEPTED`.
   - Registro de atividade no histórico do Lead (`LeadActivityLog`) e efetivação de reservas de estoque pertinentes.

2. **Cards Kanban Arrastáveis no Painel (`/painel`):**
   - Na tela do Painel (`/painel`, correspondente a `apps/web/src/app/(authenticated)/dashboard/page.tsx`), a seção "Funil — Todas as Negociações" deve permitir que os cards sejam arrastados entre as colunas (_Novo_, _Contato_, _Proposta_, _Negociação_, _Fechado_), assim como funciona na tela de Negociações (`/pipeline`).
   - Implementado com motor `@dnd-kit/core` e `@dnd-kit/sortable`, mantendo interações fluidas a 60fps sem engasgos.

3. **Sincronização Bidirecional em Tempo Real:**
   - O Painel e a tela de Negociações devem "se conversar": qualquer alteração de estágio realizada em um deve refletir instantaneamente no outro sem necessidade de recarregar a página manualmente.
   - Utilização de barramento de eventos unificado (`BroadcastChannel` para abas diferentes + `window.dispatchEvent` para a mesma aba) e invalidação inteligente do cache do React Query.

---

## 2. Arquitetura e Especificação Técnica

### 2.1 Backend: `SalesService.convertToSale`

- **Arquivo:** `apps/api/src/modules/sales/sales.service.ts`
- **Ações ao converter proposta:**
  1. Se `proposal.status !== "ACCEPTED"`, atualizar `status: "ACCEPTED"`, `clientDecision: "ACCEPT"`, `clientDecisionAt: new Date()`.
  2. Se `proposal.dealId` existir:
     - Atualizar o `Deal` para `stage: "WON"`, `temperature: "HOT"`, `lastContactAt: new Date()`.
     - Chamar `this.stockReservationService.commitForDeal(tenantId, proposal.dealId)` (se o serviço estiver injetado / disponível, ou tratar com gracefully fallback).
     - Criar `LeadActivityLog` com `kind: "PROPOSAL_ACCEPTED"`, `label: "Proposta convertida em venda (Fechado / Ganho)"`.
  3. Se `proposal.dealId` for nulo mas houver `lead`:
     - Criar `Deal` no estágio `WON` associado ao `lead.id` e vincular à `proposal.id` e `sale.id`.

### 2.2 Frontend: Barramento de Sincronização (`pipeline-sync.ts`)

- **Arquivo:** `apps/web/src/lib/pipeline-sync.ts`
- **Funções:**
  - `notifyPipelineUpdated(detail?: { dealId?: string; stage?: DealStage })`: emite CustomEvent local `"pipeline-updated"` e posta mensagem no `BroadcastChannel("energivia_pipeline_sync")`.
  - `usePipelineSync(onUpdate: () => void)`: hook React que escuta tanto o evento de janela quanto mensagens do canal de broadcast e executa o callback de recarregamento/invalidação.

### 2.3 Frontend: Kanban Arrastável no Painel (`DashboardKanban.tsx` ou integrado em `dashboard/page.tsx`)

- **Componente:** `apps/web/src/components/dashboard/DashboardKanban.tsx`
- **Funcionalidades:**
  - Utiliza `DndContext`, `PointerSensor`, `useDroppable` para cada coluna e `useSortable` para cada card de negócio/lead.
  - Colunas: Novo (`NEW`), Contato (`CONTACTED`), Proposta (`PROPOSAL`), Negociação (`NEGOTIATION`), Fechado (`WON`).
  - Cards com indicação visual de hover, cursor grab/grabbing e drag overlay sutil.
  - Ao soltar um card em outra coluna:
    - Atualização otimista imediata no estado local do Painel.
    - Chamada assíncrona para `patchDeal(organizationId, dealId, { stage: apiStage, lostReason: null })`.
    - Disparo de `notifyPipelineUpdated({ dealId, stage: apiStage })`.
    - Notificação toast de confirmação.
  - Ao receber evento `pipeline-updated`: invalidação imediata das queries `dashboard-leads` e `dashboard-stats` do React Query.

### 2.4 Frontend: Conexão na tela de Negociações (`pipeline/page.tsx`)

- Em `apps/web/src/app/(authenticated)/pipeline/page.tsx`:
  - Após `commitDnDDrop`, disparar `notifyPipelineUpdated(...)`.
  - Integrar `usePipelineSync` chamando `loadDeals()`.

---

## 3. Critérios de Aceite

1. Proposta convertida para venda atualiza o `Deal` para `WON` e `proposal` para `ACCEPTED`.
2. Cards do Kanban no Painel são arrastáveis entre todas as 5 colunas e persistem no banco.
3. Arrastar um card no Painel reflete na tela de Negociações sem reload.
4. Arrastar um card na tela de Negociações reflete no Painel sem reload.
5. Todos os testes unitários passam e builds compilam sem erro.
