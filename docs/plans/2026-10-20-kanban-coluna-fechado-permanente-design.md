# Design: Coluna Fechado Permanente no Funil de Negociações (Kanban)

## Contexto e Motivação

No Funil de Negociações (`/pipeline`), a coluna **Fechado** ficava colapsada por padrão em uma barra lateral minimizada de 52px de largura com visual vertical e botão `<< Fechado`. O usuário precisava expandi-la manualmente a cada navegação e solicitou que ela nunca fique escondida e permaneça sempre à mostra.

## Requisitos

1. A coluna **Fechado** deve ser uma coluna permanente do Kanban, disposta no mesmo nível de destaque e estrutura que as etapas _Novo_, _Contato_, _Proposta_ e _Negociação_.
2. A grade do Kanban deve utilizar de forma permanente `grid-cols-5` (com rolagem horizontal suave em telas menores), removendo o layout condicional com barra de 52px.
3. O cabeçalho da coluna deve ser padronizado para exibir:
   - Título: **Fechado**
   - Contador de negócios fechados (badge)
   - Valor monetário acumulado (`stageTotal`) formatado em `R$`
   - Barra de progresso indicadora no rodapé (100% de largura) com cor de fechamento
   - Remoção do botão de recolher (`‹ Recolher`).
4. Manter o funcionamento das sub-raias internas (Ganho, Perdido, Desqualificado, Adiado, Cancelado) com DnD Kit para permitir soltar negócios diretamente no status fechado apropriado.
5. Limpar o estado residual `fechadoExpanded` e a prop `closedCollapsed` / `onExpandClosed`.

## Arquitetura e Componentes Impactados

- `apps/web/src/app/(authenticated)/pipeline/page.tsx`:
  - Remover estado `fechadoExpanded` e callbacks de recolhimento.
  - Atualizar `renderColumnHeader` para a etapa `fechado`, unificando a estrutura do cabeçalho com valor total em R$ e barra de progresso.
  - Remover passagem de `closedCollapsed` e `onExpandClosed` para `KanbanBoard`.
- `apps/web/src/app/(authenticated)/pipeline/KanbanBoard.tsx`:
  - Fixar a classe de grid em `grid-cols-5` (ou dinâmica por responsável quando agrupado).
  - Tornar opcionais / remover as props `closedCollapsed` e `onExpandClosed`.
- `apps/web/src/app/(authenticated)/pipeline/ClosedColumnWithRows.tsx`:
  - Remover o bloco condicional de botão minimizado (`if (columnCollapsed)`).
  - Renderizar diretamente a coluna padrão com seu cabeçalho e sub-raias.
