# Design: Reformulação Visual das Telas do Admin · Catálogo

**Data:** 2026-10-20  
**Status:** Aprovado  
**Objetivo:** Elevar as telas do Admin (Catálogo, Modelos de Template, Produtos, Marcas e Fornecedores) para o padrão visual moderno, elegante e editorial implementado na tela de templates de proposta (`template-list-page.tsx`), eliminando as tabelas cinzas cruas do MUI DataGrid e trazendo uma experiência rica, fluida e visual.

---

## 1. Princípios de Design & Estética

- **Dark Glass & Slate Neutro:** Fundo escuro coeso com a plataforma (`var(--color-card)` e `var(--color-background)`), bordas refinadas `border-[var(--color-border)]`, sem neon nem efeitos exagerados de glow.
- **Tipografia Editorial Solar:** Títulos imponentes com pesos equilibrados, hierarquia tipográfica legível e sem desconforto visual.
- **Badges Vivas & Refinadas:** Status com cores semânticas atenuadas (ex.: verde esmeralda com ponto de pulso discreto para "Publicado", cinza ardósia para "Rascunho").
- **Cards Visuais Proporcionais:** Miniaturas em 16:10 com cantos arredondados, fotos solares reais em alta resolução (sem marca d'água) e mini-mockups vetoriais elegantes para itens sem imagem cadastrada.
- **Micro-interações:** Hover suave com transição de borda, botões com feedback tátil e alternâncias rápidas.

---

## 2. Componentes e Estrutura Arquitetural

### 2.1. Novo Cabeçalho e Navegação (`admin/layout.tsx`)

- Topo com badge editorial: `Admin · Catálogo Central`.
- Título principal com ícone discreto e descrição concisa.
- Barra de navegação por abas estilo pílulas interativas (`pill tabs`) com suporte a ícones Lucide modernos e contadores em tempo real para:
  - **Modelos de Template** (`/admin/modelos-template`)
  - **Produtos** (`/admin/produtos`)
  - **Marcas** (`/admin/marcas`)
  - **Fornecedores** (`/admin/distribuidores`)

### 2.2. Modelos de Template (`admin/template-models/page.tsx`)

- Grid de cards visuais 16:10 com preview da capa do template.
- Badge flutuante de status (`Publicado` / `Rascunho`) e badge de ordem no catálogo.
- Indicador de data de criação / versão e contagem de seções.
- Barra de busca instantânea por nome ou descrição do template.
- Botões de ação em cada card: `Editar modelo` (leva ao editor) e `Excluir` (com confirmação segura).
- Botão no topo: `+ Novo modelo` em estilo verde esmeralda primário.

### 2.3. Marcas (`admin/brands/page.tsx`)

- Cards de marcas modernos com logotipo limpo sobre fundo contrastante, nome em destaque, país de origem e chips de categorias atendidas.
- Ações rápidas de edição, exclusão e importação em massa.
- Barra de busca instantânea e filtros por categoria.

### 2.4. Distribuidores / Fornecedores (`admin/distributors/page.tsx`)

- Cards com logotipo do distribuidor, status de integração ativa, cotação automática e histórico de sincronização.
- Ações de upload de planilha, sincronização manual e configurações.

### 2.5. Produtos (`admin/products/page.tsx`)

- Barra de filtros modernos com contadores métricos (Total, Ativos, Categorias).
- Tabela e cards modernos com fotos dos equipamentos, potência em destaque (`Wp` para módulos, `kW` para inversores), marca com avatar e switch elegante de ativação.

---

## 3. Validação e Qualidade

- `pnpm --filter @energivia/web lint` com código 0.
- Testes unitários do Vitest aprovados.
- Commit e push automático para `origin/main`.
