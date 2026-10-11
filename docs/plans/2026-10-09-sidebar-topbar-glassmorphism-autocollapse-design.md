# Documento de Design: Sidebar & Topbar com Glassmorphism Translúcido e Auto-Collapse por Hover

**Data:** 09 de Outubro de 2026  
**Status:** Aprovado pelo Usuário  
**Autor:** Antigravity (Frontend & Motion Engineer)

---

## 1. Visão Geral & Objetivo

Transformar a barra de navegação lateral (**Sidebar**) e a barra superior (**Topbar**) da EnergivIA em componentes de alto padrão estético utilizando **Glassmorphism translúcido de alta fidelidade** (vidro fumê fosco, blur de profundidade, reflexos especulares e chanfro sutil de luz), inspirados no modelo de referência de interfaces modernas.

Além disso, implementar a mecânica de **Auto-Collapse Inteligente**:

- Em repouso (Desktop), a sidebar ocupa apenas um mini-rail fino com ícones centralizados (`4.5rem` / 72px), liberando espaço horizontal significativo para que o Painel, Kanban, tabelas e gráficos aproveitem a tela inteira.
- Ao passar o cursor do mouse sobre ela (`onMouseEnter`), a sidebar expande suavemente como um painel flutuante de vidro translúcido (`16rem` / 256px) sobrepondo o conteúdo sem gerar trancos no layout.
- Possui tolerância de saída (_grace period_ de 250ms) ao retirar o mouse (`onMouseLeave`) para prevenir fechamento acidental durante a navegação.
- Permite fixar o menu aberto (_pin toggle_) através do botão chevron.

---

## 2. Especificação Visual: Glassmorphism Translúcido

### 2.1 Tokens e Classes de Estilo

1. **Topbar de Vidro Translúcido:**
   - Fundo escuro translúcido: `background: rgba(18, 24, 27, 0.70)` (tema escuro) e `rgba(255, 255, 255, 0.75)` (tema claro).
   - Efeito de desfoque ótico: `backdrop-filter: blur(24px) saturate(190%)`.
   - Borda divisória especular: `border-b border-white/[0.08]` (dark) e `border-black/[0.08]` (light).
   - Reflexo de chanfro superior: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.12)`.

2. **Sidebar de Vidro Fosco Flutuante:**
   - Fundo em repouso e expandido: `background: rgba(18, 24, 27, 0.72)` com `backdrop-filter: blur(28px) saturate(200%)`.
   - Chanfro de luz especular na borda: `border-r border-white/[0.08]`.
   - Sombra difusa de profundidade: `box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.75), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)`.
   - Destaque do item ativo (`SidebarItem`):
     - Fundo suave de vidro esmeralda: `rgba(16, 185, 129, 0.14)`.
     - Borda lateral esquerda iluminada com verde esmeralda: `rgba(45, 212, 191, 0.9)`.
     - Texto em alto contraste e ícone esmeralda iluminado.

3. **Harmonia Sem Excessos (Regras do Projeto):**
   - Sem gradientes neon estridentes.
   - Sem efeitos de glow excessivos ou desconforto visual.
   - 100% de conformidade com performance de 60fps (apenas propriedades aceleradas por hardware `transform`, `opacity`, `backdrop-filter`).

---

## 3. Arquitetura de Interação & Auto-Collapse

### 3.1 Estados da Sidebar

| Estado                          | Largura no Layout da Página | Largura Visual da Sidebar | Comportamento                                                                                                |
| :------------------------------ | :-------------------------- | :------------------------ | :----------------------------------------------------------------------------------------------------------- |
| **Repouso (Auto-Hide ativo)**   | `4.5rem` (72px)             | `4.5rem` (72px)           | Mini-rail fino com ícones centralizados; conteúdo do dashboard ganha ~184px de largura útil.                 |
| **Hover (Mouse sobre a barra)** | `4.5rem` (72px)             | `16rem` (256px)           | Expande suavemente em camada flutuante (`absolute/fixed`, z-index 40) sobre o conteúdo, sem empurrar a tela. |
| **Fixada Aberta (Pinned)**      | `16rem` (256px)             | `16rem` (256px)           | Modo tradicional fixo para usuários que preferem o menu sempre expandido.                                    |
| **Mobile (< 768px)**            | `0px`                       | `100%`                    | Drawer lateral clássico acionado pelo botão de menu hambúrguer.                                              |

### 3.2 Lógica de Hover e Grace Period

- **Entrada (`onMouseEnter`):**
  - Cancela qualquer temporizador de fechamento pendente.
  - Altera imediatamente o estado de hover para expandido (`isHovered = true`).
  - Animação com curva cúbica `cubic-bezier(0.16, 1, 0.3, 1)` de 300ms.
- **Saída (`onMouseLeave`):**
  - Dispara um _timeout_ de **250ms**.
  - Se o usuário reentrar na barra antes de 250ms, o fechamento é abortado.
  - Ao expirar o tempo, recolhe a barra suavemente de volta para o mini-rail de 4.5rem.

### 3.3 Persistência de Preferência

- A chave `energivia-sidebar-mode` ou `energivia-sidebar-open` no `localStorage` guarda a preferência do usuário:
  - `auto-collapse` (padrão recomendado): mini-rail com expansão por hover.
  - `pinned`: fixada aberta em 16rem.

---

## 4. Otimização do Espaço Útil das Telas

1. **Ajuste em `AuthenticatedShell`:**
   - O container principal das telas (`main`) terá sua largura máxima ampliada para acomodar a visualização expandida (até `1600px` ou `max-w-7xl` / fluida), permitindo que Kanban de negociações, gráficos de 14 dias do Painel e tabelas de clientes ocupem mais área útil horizontal.
2. **Sincronização do Logo na Topbar:**
   - O bloco de logo na `Topbar` se ajusta em repouso ao mini-rail (`4.5rem`), exibindo o isotipo estilizado perfeitamente alinhado com os ícones da barra lateral.

---

## 5. Plano de Testes & Verificação

1. **Testes Unitários:**
   - Executar suite do Vitest em `@energivia/web` e pacotes para assegurar 100% de aprovação e zero quebras.
2. **Validação de Build:**
   - Executar compilação do Next.js sem erros de tipagem TypeScript ou de estilos CSS.
3. **Validação Visual com Browser Subagent:**
   - Gravar e validar sessão com o navegador:
     - Testar abertura no hover e fechamento automático com grace period.
     - Testar botão de fixar/desfixar.
     - Verificar aparência de vidro translúcido na Topbar e Sidebar nos temas escuro e claro.
     - Verificar expansão do espaço de tela no Painel e Pipeline.
