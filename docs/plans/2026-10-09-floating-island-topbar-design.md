# Design: Topbar Ilha Flutuante (Floating Header Island)

**Data:** 2026-10-09  
**Status:** Aprovado pelo Usuário

---

## 1. Visão Geral e Objetivo

Transformar a barra de navegação superior (`Topbar`) em uma **Ilha Flutuante Desprendida** (Floating Header Island), desprendendo-a do topo e das bordas laterais da tela (`top-3 left-3 right-3`), com cantos arredondados (`rounded-2xl` / `rounded-3xl`), acabamento de vidro translúcido em 360° e espaçamento perfeitamente coordenado com a Sidebar (ilha flutuante vertical).

---

## 2. Geometria e Posicionamento

- **Posicionamento Flutuante da Topbar:**
  - `fixed top-3 left-3 right-3 z-50 h-16`: 12px de distância do topo, margem esquerda e margem direita da janela.
  - Cantos arredondados: `rounded-2xl` com `overflow-hidden`.
  - Borda e Vidro 360°: `border border-black/[0.08] dark:border-white/14`.
  - Sombra e Brilho Especular: `.glass-nav-topbar` com elevação suspensa e chanfro de luz bilateral.
- **Coordenação com a Sidebar:**
  - Topbar inferior em 76px (`top-3` + `h-16`).
  - Sidebar ajustada para `top-[5.5rem]` (88px), estabelecendo uma folga uniforme de 12px entre o fundo da Topbar e o topo da Sidebar.
  - Ambas as ilhas compartilham o mesmo alinhamento de 12px (`left-3`) da margem esquerda da janela.

---

## 3. Fluxo e Espaçamento da Página (`<main>`)

- `authenticated-shell.tsx`:
  - Padding superior de `<main>` ajustado para `pt-24 sm:pt-28 md:pt-28` (112px).
  - Conteúdo da página rola fluidamente por baixo da Topbar, revelando o efeito óptico de refração de vidro sem colidir com cabeçalhos e títulos.

---

## 4. Validação e Qualidade

- Testes unitários (`pnpm test:unit` - 174 testes passando).
- Build do Next.js sem regressões (`pnpm --filter @energivia/web build`).
- Cumprimento de regras do projeto (sem emojis de WhatsApp, commits atômicos e push para origin/main, sem uso de browser subagent para testes visuais).
