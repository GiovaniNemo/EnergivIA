# Design Doc: Abertura por Hover no Botão Flutuante EnergivIA

**Data:** 2026-10-09  
**Status:** Aprovado  
**Componente:** `apps/web/src/components/layout/EnergiviaFloatingHub.tsx`

---

## 1. Visão Geral e Objetivo

Atualmente, o botão flutuante central da EnergivIA (com o ícone neural/circuitos e as opções de Assistente IA e Avaliar) exige um clique explícito do usuário para expandir as opções orbitais. O objetivo desta mudança é permitir que o menu orbital seja acionado suavemente ao passar o cursor do mouse por cima (`hover`), mantendo uma experiência sem engasgos e sem fechamento prematuro durante o deslocamento do cursor para os botões satélite.

---

## 2. Requisitos e Critérios de Sucesso

- **Abertura ao passar o mouse:** O menu deve se expandir automaticamente quando o cursor passar sobre o botão principal ou qualquer área do container do hub.
- **Tolerância de saída (Debounce / Grace Period):** Ao retirar o cursor do menu, é aplicado um temporizador de 250ms antes de recolher. Se o usuário retornar o cursor para o hub dentro desse intervalo, o fechamento é cancelado imediatamente.
- **Transição fluida entre opções:** Como as opções satélite estão posicionadas verticalmente acima do botão principal, a escuta de eventos no container raiz encapsula tanto o gatilho quanto os botões secundários, eliminando oscilações de hover ("flickering").
- **Compatibilidade com Touch / Mobile:** O evento de clique (`onClick`) é preservado no botão para permitir alternância (toggle) em telas sensíveis ao toque (smartphones e tablets) onde eventos de hover não ocorrem.
- **Acessibilidade e Fechamento:** Tecla `Escape` e cliques fora continuam fechando o menu imediatamente.

---

## 3. Arquitetura e Implementação

### 3.1 Gestão de Estado e Refs

- Adição de `closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)` para armazenar o ID do temporizador.
- Funções auxiliares:
  - `handleMouseEnter`: limpa `closeTimeoutRef` pendente e executa `setIsExpanded(true)`.
  - `handleMouseLeave`: inicia um `setTimeout` de 250ms chamando `setIsExpanded(false)`.
- Efeito de desmontagem (`useEffect`) assegura a limpeza de qualquer timeout pendente ao desmontar o componente.

### 3.2 Estrutura de Eventos no JSX

- No container raiz `<div ref={hubRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} ...>`:
  - Centraliza a captura de hover tanto do botão principal quanto dos botões de ação (Assistente EnergivIA e Avaliar).
- O botão do cérebro preserva o `onClick` para alternância manual e suporte mobile.

---

## 4. Testes e Validação

1. **Compilação e Tipagem:** `npm run build` ou verificação TypeScript do app web.
2. **Testes Unitários:** Executar suite Vitest para assegurar não-regressão.
3. **Validação Visual / Interação:** Validar abertura fluida com subagente e manter padrão sem flickering.
