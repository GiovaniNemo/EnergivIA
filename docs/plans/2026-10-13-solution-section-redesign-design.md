# Documento de Design - Redesign Editorial CleanTech da Seção de Solução

**Data:** 13/10/2026  
**Status:** Aprovado  
**Objetivo:** Modernizar visualmente e estruturalmente a seção "Solução" (`solution`) do gerador de propostas, elevando seu padrão estético para o estilo Editorial CleanTech com total compatibilidade e refinamento em Desktop (PC), Mobile e PDF.

---

## 1. Problema Atual

A seção atual de "Solução" apresenta:

- Título e subtítulo crus, sem hierarquia moderna ou sensação de projeto sob medida.
- Na variante `topics`, benefícios dispostos como lista simples de texto com pequenos ícones, parecendo uma lista não estilizada de documento de texto.
- Na variante `cards`, caixas genéricas com bordas de cor sólida e espaçamento básico.
- O bloco "Como funciona" é apenas um parágrafo jogado sob um texto em caixa alta ("COMO FUNCIONA"), sem separação visual ou identidade.
- No Mobile e no PDF, o layout carecia de regras de container e quebras de página controladas.

---

## 2. Direção de Design Aprovada: Editorial CleanTech

### 2.1 Cabeçalho & Badge

- **Badge de Engenharia:** Mini-badge translúcido com ícone (`Sparkles` ou `Zap`) e texto de destaque contextual ("Solução Sob Medida" ou similar), usando micro-borda com `color-mix(in srgb, var(--preview-primary-color) 25%, transparent)`.
- **Título (`solutionName`):** Tipografia ampla com escala responsiva, peso `font-bold` e contraste impecável tanto no tema claro quanto no escuro da proposta.
- **Texto Descritivo (`text`):** Entrelinha relaxada (`leading-relaxed`), cor harmoniosa (`opacity: 0.88` a `0.92`), sem aspecto de bloco denso.

### 2.2 Cards de Benefícios

- **Estrutura Visual:**
  - Fundo sofisticado com transparência e mesclagem calculada com a cor primária (`color-mix(in srgb, var(--preview-primary-color) 6%, transparent)` ou superfície de cartão com leve relevo).
  - Borda sutil de precisão (`border border-[var(--preview-primary-color)]/20` ou `border-white/10`).
  - Container do ícone: caixa quadrada com cantos arredondados (`p-2 rounded-lg` ou `rounded-xl`), fundo contrastante suave e ícone com a cor primária.
  - Texto do benefício com peso `font-medium` e espaçamento equilibrado.
- **Variante `cards`:** Grade dinâmica de 2 a 3 colunas no desktop, 1 coluna no mobile e 2 colunas proporcionais no PDF.
- **Variante `topics`:** Linhas executivas refinadas com ícone em pílula e acabamento sofisticado, abandonando a lista crua de HTML.

### 2.3 Box "Como Funciona" (Callout Arquitetural)

- Estruturado em um card dedicado de alto valor:
  - Mini-cabeçalho com ícone técnico (`Workflow` / `Compass` / `Layers`) e etiqueta em tracking amplo.
  - Borda lateral de destaque (_accent bar_) ou contorno com cantos suaves.
  - No PDF: proteção explícita contra quebra de página (`page-break-inside: avoid` / `break-inside-avoid`).
  - No Mobile: preenchimento de largura com respiro e tipografia proporcional.

---

## 3. Comportamento Multiplataforma

| Plataforma          | Comportamento do Cabeçalho                                              | Grid de Benefícios                                         | Box "Como Funciona"                                 |
| :------------------ | :---------------------------------------------------------------------- | :--------------------------------------------------------- | :-------------------------------------------------- |
| **PC (Desktop)**    | Título amplo, badge alinhado à esquerda/centro conforme estilo da seção | 2 a 3 colunas com hover suave e leitura dinâmica           | Painel largo com acento lateral e padding generoso  |
| **Mobile**          | Título proporcional (`text-lg sm:text-xl`), margem compacta             | 1 coluna fluida com toque espaçoso e leitura confortável   | Card em 100% da largura com padding interno de 14px |
| **PDF (Impressão)** | Alinhamento vetorial, fontes em pt/rem proporcionais                    | 2 colunas equilibradas, `break-inside: avoid` em cada card | Container completo com `break-inside: avoid`        |

---

## 4. Arquivos Impactados

- `apps/web/src/components/proposals/editor/section-render/section-registry.tsx`: Renderizador da seção `case "solution"`.
- `apps/web/src/app/globals.css`: Classes responsivas e container queries para `.solution-benefits-grid`, `.solution-topics-list`, `.solution-how-it-works-box`.
- `apps/web/src/components/proposals/editor/__tests__/section-render.spec.ts` (ou spec existente de PDF/render): Validação de renderização sem regressões.
