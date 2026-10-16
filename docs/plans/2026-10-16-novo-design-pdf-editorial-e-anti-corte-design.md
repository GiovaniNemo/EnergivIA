# Documento de Design: Novo Design Executivo do PDF de Propostas

**Data:** 16 de Outubro de 2026  
**Status:** Aprovado pelo Usuário  
**Autor:** Antigravity AI

---

## 1. Visão Geral e Objetivos

O objetivo deste projeto é elevar o design dos PDFs baixados de propostas comerciais para um patamar de alto nível editorial executivo, garantindo que:

1. **Padrão Gráfico Sofisticado:** Um fundo com linhas e curvas orbitais concêntricas em SVG dinâmico, baseado na referência visual apresentada, reagindo de forma 100% harmoniosa às cores pré-definidas da organização (primária, secundária, fundo e texto).
2. **Capa Editorial Executiva:** Layout de impacto baseado na referência:
   - Ano/Data e badge de projeto no topo.
   - Título central imponente em caixa alta com a fonte configurada.
   - Blocos organizados de metadados na base (`PROPOSTO A:` e `ORGANIZADO POR:`).
3. **Zero Cortes Grotescos de Cards:** Sistema de paginação dinâmica A4 (`pdf-pagination.ts`) que avalia a densidade real dos itens (como listas de equipamentos, tabelas financeiras e gráficos). Seções extensas recebem folhas A4 dedicadas e listas longas são quebradas suavemente entre páginas consecutivas sem fatiar nenhum card no meio.
4. **Uniformidade e Anti-Distorção de Imagens:** Todas as imagens (logos, fotos de portfólio, certificados e selos) utilizam wrappers travados com proporções geométricas consistentes (`aspect-ratio`), `object-fit: contain` (logos) ou `object-fit: cover` (fotos), eliminando qualquer estiramento ou deformação.
5. **Harmonia Tipográfica e Respeito às Cores:** Suporte integral às 4 famílias tipográficas do sistema (Inter, Roboto, Open Sans, Montserrat) e uso de `color-mix` para preservar legibilidade e elegância em qualquer paleta.

---

## 2. Arquitetura e Componentes

### 2.1. Componente de Fundo Vetorial: `PdfOrbitalBackground`

- **Arquivo:** `apps/web/src/components/proposals/editor/pdf-orbital-background.tsx`
- **Características:**
  - Renderiza SVG em tela cheia (`preserveAspectRatio="xMidYMid slice" viewBox="0 0 794 1123"`).
  - Traços concêntricos e arcos parabólicos/orbitais inspirados no pôster editorial.
  - Cores dinâmicas: `stroke` calculado com base na cor primária da marca (`branding.primaryColor`), com opacidade sutil de 8% a 18% na capa e 4% a 7% nas páginas internas de conteúdo.
  - Performance máxima de renderização pelo Puppeteer sem imagens rasterizadas pesadas.

### 2.2. Nova Capa Executiva: Variante `editorial-poster` e `minimal`

- **Arquivo:** `apps/web/src/components/sections/Cover/variants/EditorialPoster.tsx` e `apps/web/src/components/sections/Cover/Cover.tsx`
- **Hierarquia:**
  - **Topo:** Ano corrente / data da proposta à esquerda com traço horizontal acentuado (`—`); no canto direito, `PROJETO Nº {{proposalNumber}}`.
  - **Centro:** Título da proposta em caixa alta, tipografia precisa com tracking ajustado, na cor do tema.
  - **Base:** Grade em duas colunas:
    - Esquerda: `PROPOSTO A:` (cliente) e `ORGANIZADO POR:` (empresa integradora).
    - Direita: Logo institucional da integradora (com `object-contain` travado) e dados de contato/cidade.

### 2.3. Paginador A4 Inteligente: `pdf-pagination.ts`

- **Arquivo:** `apps/web/src/components/proposals/editor/pdf-pagination.ts`
- **Melhorias:**
  - Função `getSectionPdfWeight` aprimorada para calcular peso visual dinâmico com base na densidade de dados:
    - Lista de equipamentos (`proposal_equipment`): se > 4 itens, peso = 1.0 (página inteira); se > 8 itens, particiona os itens em 2 páginas A4 dedicadas sequenciais.
    - Consumo e geração (`generation_consumption`): peso = 1.0 (página executiva com gráfico e métricas).
    - Opções de pagamento (`pricing`): peso = 1.0 (página dedicada para os cards de formas de pagamento).
    - Seções compactas (`diagnostic_energy`, `solution`, `guarantees`): peso = 0.5, agrupadas apenas se o somatório real de altura for seguro (< 80% do A4 útil).
  - Cada card individual é estilizado com:
    ```css
    break-inside: avoid;
    page-break-inside: avoid;
    ```

### 2.4. Molduras Anti-Distorção de Imagens

- **Arquivo:** `apps/web/src/components/proposals/editor/section-render/` e `pdf-page-chrome.tsx`
- **Regras:**
  - Logos: `<img ... style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain' }} />`
  - Fotos de Portfólio/Equipe: `<img ... className="aspect-[16/9] object-cover rounded-xl" />`
  - Cards de Equipamentos: ícone/imagem com container flex centralizado e proporção bloqueada.

---

## 3. Estratégia de Testes e Validação

1. **Testes Unitários:**
   - Atualizar e expandir `apps/web/src/components/proposals/editor/__tests__/pdf-pagination.spec.ts` com casos de teste para seções com listas longas e particionamento inteligente.
   - Atualizar `apps/web/src/lib/__tests__/proposal-puppeteer-html.spec.ts` validando o CSS de quebra e as classes dos arcos orbitais.
2. **Validação de Build:**
   - Executar `pnpm --filter @energivia/web build` e `pnpm --filter @energivia/api build` garantindo zero erros de tipagem.
3. **Commit e Push:**
   - Realizar commit estruturado e envio para a branch remota `origin/main` conforme regras do projeto.
