# Design: Reorganização Semântica da Navegação Lateral (Admin, Plataforma e Gestão)

## 1. Contexto e Problema

A navegação lateral para os usuários administradores e superadmins apresentava desorganização perceptível, especialmente na seção **ADMIN**:

- Mistura aleatória de catálogo técnico de hardware (`Fornecedores`, `Marcas`, `Produtos Globais`), templates de propostas (`Modelos de template`), segurança/whitelist (`Acessos Especiais`) e clientes da plataforma (`Integradores & Ativação`).
- Dispersão de itens chave: `Métricas` e `Gestão de Planos` estavam isoladas no bloco `PLATAFORMA`, quando na verdade são parte essencial da gestão do SaaS EnergivIA.
- Nomenclatura com redundância ("Modelos de template").
- Ordem em `GESTÃO` com `Perfil do Integrador` separando `Organização` e `Equipe`.

## 2. Nova Estrutura da Navegação

### A. ADMIN (Gestão do Negócio SaaS & Ecossistema Solar)

1. **Métricas** (`/admin/metricas`) — Painel executivo e KPIs no topo.
2. **Integradores & Ativação** (`/admin/integradores`) — Gestão de clientes e funil de ativação.
3. **Acessos Especiais** (`/admin/acessos-especiais`) — Whitelist e permissões especiais.
4. **Comercial** (`/admin/comercial`) — Afiliados, vendedores e comissões da equipe.
5. **Gestão de Planos** (`/admin/planos`) — Tiers de assinatura, precificação e limites.
6. **Templates Globais** (`/admin/modelos-template`) — Modelos padrão de propostas solares disponibilizados pela plataforma.
7. **Fornecedores** (`/admin/distribuidores`) — Distribuidores fotovoltaicos parceiros.
8. **Marcas** (`/admin/marcas`) — Fabricantes de módulos e inversores.
9. **Produtos Globais** (`/admin/produtos`) — Catálogo global de componentes.

### B. PLATAFORMA (Financiamento Bancário & Infraestrutura Técnica)

1. **Financiadores** (`/plataforma/financiadores`) — Bancos parceiros cadastrados.
2. **Fila de Financiamentos** (`/plataforma/financiamentos`) — Esteira de propostas e aprovação de crédito.
3. **Comissões** (`/plataforma/comissoes`) — Repasses e receita de intermediação bancária.
4. **Sistema** (`/admin/sistema`) — Logs, monitoramento e integridade do sistema.

### C. GESTÃO (Visão do Integrador)

1. **Organização** (`/configuracoes/organizacao`)
2. **Equipe** (`/configuracoes/equipe`)
3. **Perfil do Integrador** (`/gestao/perfil-integrador`)
4. **Templates de Proposta** (`/propostas/templates`)
5. **Modelos de Contratos** (`/configuracoes/documentos`)
6. **Meus Planos** (`/gestao/meus-planos`)
7. **Configurações** (`/configuracoes`)
8. **Central de Ajuda** (`/ajuda`)

## 3. Impacto e Compatibilidade

- **Rotas:** Nenhuma rota de URL é alterada, garantindo total compatibilidade com bookmarks, links internos e histórico.
- **Permissões (RBAC):** Os requisitos de `requiresRole: "platform"`, `requiresRole: "platform_sales"` e `requiresRole: "admin"` são rigorosamente preservados.
- **Componentes:** Alterações centralizadas em `apps/web/src/config/menu.config.ts`.
