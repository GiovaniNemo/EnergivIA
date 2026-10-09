# Design: Sidebar Ilha Flutuante (Floating Island Dock)

**Data:** 2026-10-09  
**Status:** Aprovado pelo Usuário

---

## 1. Visão Geral e Objetivo

Transformar a barra lateral (`Sidebar`) em uma **Ilha Flutuante Desprendida** (estilo cápsula/dock macOS/iPadOS moderno inspirado na referência visual do Code.xr), desprendendo-a da Topbar e das margens da tela, com bordas arredondadas pronunciadas (`rounded-3xl`), vidro translúcido em todo o perímetro (360°) e preservando a funcionalidade de auto-esconder no hover e fixação com botão toggle.

---

## 2. Geometria e Posicionamento

- **Posicionamento Flutuante (Desktop `md:`):**
  - `top-20` (80px): 16px de respiro abaixo da Topbar fixa de 64px (`h-16`).
  - `left-3` (12px): 12px de distância da margem esquerda da janela.
  - `bottom-3` (12px): 12px de distância da base da janela.
  - `z-40`: nível de elevação flutuante sob a Topbar (`z-50`).
- **Bordas e Cantos Arredondados:**
  - Raio de curvatura: `rounded-3xl` (24px) com `overflow-hidden`.
  - Contorno total 360° com borda de vidro: `border border-black/[0.08] dark:border-white/15`.
  - Sombra e Especular: `.glass-nav-sidebar` atualizado para aplicar sombreamento e destaque especular em todas as 4 faces, não apenas borda direita.
  - No hover expandido: `.glass-nav-sidebar-floating` adiciona profundidade extra (`shadow-2xl` e anel sutil `ring-1 ring-white/10`).

---

## 3. Fluxo e Espaçamento da Página

- **Espaçador Estrutural (`Sidebar.tsx`):**
  - Modo recolhido: `w-[5.25rem]` (compensa o espaçamento `left-3` de 0.75rem + largura da ilha de 4.5rem).
  - Modo fixado aberto: `w-[17rem]` (0.75rem + 16.25rem).
  - Modo hover (quando não fixado): expande para `16rem` flutuando sobre o conteúdo sem empurrar bruscamente a página.

---

## 4. Itens Internos e Controles

- Itens de navegação em formato pill com cantos arredondados (`rounded-xl` / `rounded-2xl`).
- Botão de fixação posicionado na lateral superior com bordas circulares translúcidas.
- No mobile: mantém drawer responsivo deslizando suavemente com cantos arredondados.

---

## 5. Validação e Qualidade

- Testes unitários (`pnpm test:unit` - 174 testes passando).
- Build do Next.js sem regressões de tipagem ou bundling (`pnpm --filter @energivia/web build`).
- Cumprimento de regras do usuário (sem emojis de whatsapp, commits atômicos e push para origin/main, sem uso de browser subagent para testes visuais).
