# Design: Partículas Cinéticas Estilo Google Antigravity no Card de Upload

**Data:** 19/10/2026  
**Status:** Aprovado pelo Usuário  
**Alvo:** `apps/web/src/components/dashboard/AntigravityParticlesCanvas.tsx` e `apps/web/src/app/(authenticated)/dashboard/page.tsx`

---

## 1. Visão Geral e Objetivo

Implementar um sistema de partículas dinâmico e responsivo ao cursor no fundo do card principal de upload de faturas (`upload-hero` no Dashboard), inspirado visualmente e cineticamente no hero do **Google Antigravity**.

O efeito deve reagir ao movimento e velocidade do mouse, gerando repulsão, impulso e rotação elástica nas partículas, criando um destaque visual ultra-moderno e premium, mantendo 100% da usabilidade da área de arrastar/soltar arquivos.

---

## 2. Decisões de Design e Preferências Alinhadas

1. **Tecnologia de Renderização:**
   - **Canvas 2D Nativo**: 60fps cravados, zero bibliotecas externas de grande porte, baixíssimo consumo de memória e CPU.
   - Suporte a displays de alta densidade (Retina/4K) através da normalização por `window.devicePixelRatio`.
2. **Paleta Cromática (EnergivIA Solar-Tech):**
   - Esmeralda (#10B981, #34D399) - ~40%
   - Ciano / Teal (#06B6D4, #14B8A6) - ~30%
   - Ouro Solar / Âmbar (#F59E0B) - ~15%
   - Violeta / Índigo Elétrico (#818CF8) - ~15%
   - Opacidade calibrada (0.25 a 0.70) para excelente legibilidade e visibilidade refinada tanto no modo escuro quanto claro.
3. **Geometria das Partículas (Fiel à referência Antigravity):**
   - 75% **Traços/dashes orientados**: comprimento de 5px a 11px, largura de 1.5px a 2px com pontas arredondadas (`lineCap = "round"`), cada um com ângulo de rotação $\theta$ dinâmico.
   - 25% **Micro-pontos estelares**: raio de 1px a 1.6px para conferir profundidade de campo tridimensional.
   - Total de partículas: ~65 a 85 partículas (escaladas dinamicamente com base na largura do container).

---

## 3. Física Cinética Vetorial (Spring-Damping + Repulsão)

1. **Flutuação Serena (Modo Repouso):**
   - Partículas flutuam com deriva sutil usando funções trigonométricas suaves (`Math.sin` / `Math.cos`), com velocidades entre 0.2 e 0.5 px/frame e micro-rotação gradual.
2. **Reação Interativa ao Mouse:**
   - **Raio de ativação:** ~140px.
   - **Força de Repulsão:** $F_{rep} = (1 - d/R)^{1.5} \cdot F_{max}$, empurrando a partícula para fora do ponto do cursor.
   - **Vetor de Velocidade do Mouse:** A velocidade e direção do cursor transmitem momentum vetorial às partículas ("vento dinâmico").
   - **Giro e Alinhamento:** Partículas orientadas giram para se alinhar com a direção da força sofrida.
3. **Retorno Elástico com Amortecimento (Spring):**
   - Aceleração de retorno à posição de ancoragem flutuante: $a = -k \cdot (pos - target) - c \cdot vel$.
   - Fator de amortecimento $c \approx 0.90$, garantindo que a desaceleração ocorra de forma fluida e sem oscilações bruscas.

---

## 4. Integração no Layout e Acessibilidade

- **Camadas (Z-Index):**
  - Container `.upload-hero`: `position: relative; overflow: hidden;`
  - Canvas: `position: absolute; inset: 0; pointer-events: none; z-index: 1;`
  - Conteúdo do Card (dropzone, textos, tags de formato, step aside): `position: relative; z-index: 10;`
  - Ações de clique, seleção de arquivo no input invisível e `dragover/drop` permanecem intactas sem qualquer interceptação.
- **Rastreamento de Posição:**
  - Ouvintes `pointermove` e `pointerleave` com `passive: true` no elemento container.
- **Eficiência de Recursos:**
  - `IntersectionObserver`: Pausa o loop `requestAnimationFrame` quando o card está fora do viewport.
  - `ResizeObserver`: Redimensiona o buffer do canvas automaticamente quando a janela muda de tamanho.
  - `prefers-reduced-motion`: Desativa animações contínuas caso o usuário prefira movimentos reduzidos.
