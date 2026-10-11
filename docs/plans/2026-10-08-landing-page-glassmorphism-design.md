# Design Doc: Efeitos de Glassmorphism na Landing Page da EnergivIA

**Data:** 2026-10-08  
**Autor:** Antigravity  
**Status:** Aprovado

---

## 1. Visão Geral e Contexto

A landing page da EnergivIA possui uma identidade visual escura, moderna e executiva (`#02040a` com acentos em tons esmeralda `#10b981`). O objetivo deste design é implementar efeitos de **glassmorphism** (vidro fosco acetinado translúcido com profundidade óptica e reflexo especular de luz) de forma harmonizada por toda a página, sem poluição visual ou neons estridentes, elevando a percepção de valor e modernidade ao nível do Google Antigravity e Linear.

---

## 2. Requisitos e Diretrizes Estéticas

1. **Sem Neons Excessivos:** Gradientes e iluminações sutis, apenas onde necessário para guiar a atenção visual.
2. **Sem Efeitos de Glow Desnecessários:** Manter sombras profundas e reflexos internos refinados sem dispersão luminosa ofuscante.
3. **Alto Contraste e Legibilidade:** Manter legibilidade perfeita do texto sobre os fundos translúcidos em monitores e dispositivos móveis.
4. **Performance de 60fps:** Aceleração por hardware (`translateZ(0)`), otimização de `backdrop-filter` para evitar travamentos ou engasgos na rolagem (smooth scroll).
5. **Responsividade Total:** Manter comportamento idêntico e consistente em desktop, tablets e smartphones (iOS/Safari e Android/Chrome).

---

## 3. Tokens CSS & Classes Utilitárias (globals.css)

Criaremos um conjunto consistente e reutilizável de classes em `@layer utilities` ou `@layer components`:

### 3.1 `.glass-card` (Cards padrão de conteúdo)

- **Superfície:** `background: rgba(7, 13, 24, 0.65)` (base escura com 65% de opacidade).
- **Desfoque óptico:** `backdrop-filter: blur(16px) saturate(160%)` com suporte WebKit `-webkit-backdrop-filter`.
- **Borda e Refração:** `border: 1px solid rgba(255, 255, 255, 0.08)`.
- **Friso Especular:** `box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`.
- **Hover:** Transição com curva `cubic-bezier(0.16, 1, 0.3, 1)` alterando borda para `rgba(16, 185, 129, 0.35)` e leve elevação `translate-y-[-2px]`.

### 3.2 `.glass-panel` (Grandes containers estruturais)

- **Superfície:** `background: rgba(4, 9, 18, 0.75)` com `backdrop-filter: blur(24px) saturate(150%)`.
- **Borda:** `border: 1px solid rgba(255, 255, 255, 0.07)`.
- **Sombra de Profundidade:** `box-shadow: 0 20px 70px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`.

### 3.3 `.glass-pill` (Badges, abas e botões secundários)

- **Superfície:** `background: rgba(255, 255, 255, 0.04)` com `backdrop-filter: blur(12px)`.
- **Borda:** `border: 1px solid rgba(255, 255, 255, 0.12)`.
- **Friso Especular:** `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`.

---

## 4. Mapeamento de Aplicação nos Componentes

| Componente               | Arquivo                         | Aplicação do Glassmorphism                                                                                         |
| :----------------------- | :------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| **Header / Navbar**      | `beamq-hero-section.tsx`        | Barra fixa em vidro translúcido com `backdrop-blur-xl bg-[#02040a]/70 border-b border-white/10`.                   |
| **Demonstração Prática** | `how-it-works-tabs.tsx`         | Seletor de abas com `.glass-pill` e container mestre com `.glass-panel` e cabeçalho da janela em vidro acetinado.  |
| **Métricas de Impacto**  | `impact-results-section.tsx`    | Os 4 cards de métricas recebem `.glass-card`, realçando números e etiquetas sobre vidro fosco.                     |
| **Painéis de Segmentos** | `converging-panels-section.tsx` | Cards de segmentos recebem `.glass-card` com relevo especular no hover.                                            |
| **Diferenciais Reais**   | `page.tsx`                      | Substituição do fundo opaco `#070b14]/80` por `.glass-card` com borda de luz e hover dinâmico.                     |
| **FAQ (Acordeão)**       | `page.tsx`                      | Tags `<details>` atualizadas para `.glass-card`, cantos `rounded-2xl` e expansão suave.                            |
| **CTA Final**            | `page.tsx`                      | Painel mestre em `.glass-panel` com gradiente interno sutil `emerald-950/20` e botão secundário com `.glass-pill`. |
| **Artigos & SEO**        | `page.tsx`                      | Container de artigos e links atualizado para `.glass-panel` mantendo leitura fluida.                               |

---

## 5. Estratégia de Verificação e Rollout

1. **Testes Unitários:** Execução do Vitest para assegurar que nenhuma funcionalidade ou teste existente sofra regressão.
2. **Build de Produção:** Compilação com Next.js para garantir que não haja erros de sintaxe ou CSS inválido.
3. **Auditoria Visual com Browser Agent:**
   - Abrir a página renderizada no navegador local.
   - Rolar pelas seções verificando fluidez de rolagem, legibilidade dos textos e efeitos de hover.
   - Capturar gravações e screenshots para validação de fidelidade visual.
4. **Git:** Commit com mensagem semântica e push para a branch `main`.
