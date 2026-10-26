# Design Document: Cards com Fundo Sólido e Respeito às Cores da Proposta

## 1. Contexto e Problema Identificado

O usuário apontou dois problemas críticos com imagens de comprovação:

1. **Cards Translúcidos vazando o fundo no PDF e Web (Imagem 2):**
   - Na seção de Assinatura (`signature`), os cards de Contratante, Contratada e Aviso Legal estavam definidos com `cardBg: color-mix(in srgb, ${text} 3%, transparent)`. Com 97% de transparência, as órbitas e elipses verdes do `PdfOrbitalBackground` vazam por trás de todo o texto e campos, poluindo visualmente a assinatura.
   - O mesmo comportamento ocorre em `.solution-benefit-card`, `economy-purchases-item-card`, `diagnostic_energy`, e nos cards de equipamentos (`proposal_equipment`).
2. **Cards não respeitando as cores e contraste (Imagem 1):**
   - Na seção `hybrid_flow` ("Como Funciona o Seu Sistema Solar Híbrido"), o título `<h3>` e subtítulos estavam com classe de cor inconsistente (`text-[var(--color-foreground)]` herdando valor claro em fundo claro), tornando o título quase invisível sobre o fundo branco.
   - Em `storage_backup`, os fundos estavam hardcoded escuros com mini-cards em `bg-slate-50/50` translúcidos, sem harmonia com a cor primária e o esquema de cores configurado no template da proposta.
   - Os 3 cards de operação 24h (01. Dia, 02. Noite, 03. Queda de Rede) tinham fundos discrepantes (dois pretos e um cinza translúcido) e textos com baixo contraste.

## 2. Diretrizes de Resolução

### A. Fundo 100% Sólido para Todos os Cards

- **Tema Claro (Padrão):** O fundo dos cards DEVE SER `#ffffff` 100% sólido e opaco (ou uma tonalidade neutra sólida como `#f8fafc`), com borda sutil sólida (`border-slate-200` ou `color-mix(in srgb, currentColor 14%, #e2e8f0)`). NUNCA usar `transparent` no fundo de cards onde haja texto a ser lido.
- **Tema Escuro:** Se o documento for configurado com fundo escuro (`isDark`), o fundo do card deve ser uma cor sólida escura (ex: `#1e293b` ou `color-mix(in srgb, ${text} 8%, ${bg})`), mantendo 100% de opacidade sobre os vetores de fundo.
- **Aviso Legal e Badges:** Devem possuir fundos sólidos protegidos contra sobreposição de linhas e curvas orbitais.

### B. Respeito Rigoroso às Cores do Tema da Proposta

- **Títulos e Subtítulos:** Devem herdar `color: "currentColor"` ou `var(--preview-text-color)` com contraste forte (`text-slate-900` no tema claro).
- **Acentos e Destaques:** Devem utilizar estritamente `var(--preview-primary-color)` (a cor primária oficial da empresa/proposta).
- **Consistência Visual:**
  - `storage_backup`: Hero card limpo com fundo sólido `#ffffff`, borda sutil na cor da proposta, medidores na cor primária, e 4 sub-cards sólidos em `#f8fafc`.
  - `hybrid_flow`: 3 cards uniformes em fundo sólido `#ffffff`, bordas sólidas, chips com a cor primária ou cores harmônicas nítidas, e títulos em `text-slate-900`.
  - `critical_loads_autonomy`: Cards de circuitos em fundo sólido `#ffffff`, tabela comparativa de alta solidez.
  - `signature`: Cards Contratante e Contratada com `cardBg: isDark ? "#1e293b" : "#ffffff"`, `canvasBg: isDark ? "#0f172a" : "#f8fafc"`, e `legalBg: isDark ? "#1e293b" : "#ffffff"`.

## 3. Arquivos Alvo

1. `apps/web/src/components/proposals/sections/signature/signature-section-preview.tsx`
2. `apps/web/src/components/proposals/editor/section-render/section-registry.tsx`
3. `apps/web/src/app/globals.css`
4. `apps/web/src/components/proposals/sections/economy-purchases/EconomyPurchasesSection.tsx`
5. `apps/web/src/components/proposals/sections/system-performance/SystemPerformanceModernSection.tsx` e `SystemPerformanceModernDashboardSection.tsx`
