# Design Arquitetural: Visão 360° do Negócio e Unificação Comercial

## 1. Visão Geral e Objetivo
Eliminar a fricção operacional e a fragmentação de telas entre as áreas de **Negociações (Kanban)**, **Clientes** e **Propostas** no SaaS da EnergivIA. 

A experiência comercial é unificada tendo o **Kanban de Negociações** como o hub operacional central do integrador/vendedor solar. Ao interagir com qualquer oportunidade, o usuário acessa uma **Visão 360°** em um painel lateral deslizante (*Drawer*) ultra-moderno, sem recarregar a página e sem perder seu contexto de trabalho.

---

## 2. Diagnóstico do Estado Atual vs. Novo Modelo

| Ponto de Contato | Estado Atual | Novo Modelo Unificado (Visão 360°) |
| :--- | :--- | :--- |
| **Abertura de Oportunidade** | `DealDetailDialog.tsx` abre um Drawer restrito apenas a campos básicos (título, valor, estágio). Para ver a ficha do cliente, possui um `<Link>` que descarrega a página. | `Deal360Drawer` abre instantaneamente no Kanban com sincronização de URL (`?dealId=...`), mantendo filtros e posição do Kanban. |
| **Dados do Cliente** | Exige navegar para `/clientes/[id]`, abandonando o fluxo do Kanban. | **Sub-aba 1 (Cliente)** integrada no Drawer com dados rápidos (Nome, WhatsApp com atalho, Cidade/UF, Concessionária, Telhado, CPF/CNPJ) e edição inline rápida. |
| **Propostas e Estudos** | Exige trocar de rota para `/propostas` ou sair do contexto para simular. | **Sub-aba 2 (Propostas)** exibe histórico de orçamentos, simulações salvas e botão de ação direta de 1 clique **"Nova Proposta com IA"** (disparando o estudo solar instantaneamente). |
| **Follow-up & Negociação** | Informações dispersas entre o Kanban e a página de leads. | **Sub-aba 3 (Negociação)** consolida estágio visual, valor, temperatura (Frio/Morno/Quente), responsável, agendamento de próxima ação e anotações cronológicas de follow-up. |
| **Vínculo Automático** | Clientes ou simulações podiam ficar órfãos sem deal visível no funil. | Toda nova simulação ou cliente cadastrado gera/vincula automaticamente um deal na etapa inicial (`NEW` / "Novo") do funil. |
| **Menu de Navegação** | Menus com itens fragmentados e níveis de profundidade dispersos. | Hierarquia enxuta e direta na seção **OPERAÇÃO**, destacando Negociações como cockpit central. |

---

## 3. Arquitetura dos Componentes

### 3.1 Componente Central: `<Deal360Drawer />`
Localização: `apps/web/src/components/deal-360/Deal360Drawer.tsx` (compartilhado e consumido em `/pipeline`, `/clientes` e `/propostas`).

Estrutura interna:
1. **Cabeçalho Fixo do Drawer:**
   - Avatar com iniciais e nome do cliente / oportunidade.
   - Badge com o Estágio atual do Kanban (com seletor rápido para avançar de fase com 1 clique).
   - Indicador de temperatura comercial (Frio / Morno / Quente).
   - Botões de atalho rápido: WhatsApp direto (sem emojis), Ligar, e menu de ações secundárias (marcar como ganho/perdido).
2. **Navegação por Sub-abas com Transição Fluida:**
   - **Aba 1: Cliente**
     - Card de identificação e contato (WhatsApp, Telefone, E-mail, CPF/CNPJ).
     - Card técnico de energia (Distribuidora/Concessionária, Cidade/UF, Tipo de telhado, Tensão/Conexão).
     - Edição inline ágil dos campos sem sair do Drawer.
   - **Aba 2: Propostas & Simulações**
     - Botão primário de destaque: **"Nova Proposta com IA"** (aciona o modal de estudo solar mantendo o drawer aberto).
     - Lista de propostas geradas: número, título, valor em R$, potência (kWp), status (Pendente, Enviada, Visualizada, Aceita), data de validade.
     - Ações por proposta: Copiar link público, abrir visualização rápida, reenviar via WhatsApp.
     - Histórico de simulações solares vinculadas.
   - **Aba 3: Negociação & Follow-up**
     - Valor do negócio (editável com `CurrencyInput`).
     - Responsável (atribuição para membros da equipe).
     - Próxima ação programada (data, horário e tipo: Ligação, Reunião, WhatsApp, Visita).
     - Timeline de notas e interações de follow-up (adicionar anotação rápida com 1 clique).
3. **Rodapé de Ações Rápidas:**
   - Status de salvamento automático / botão Salvar.
   - Ação rápida para gerar proposta ou marcar perda/ganho.

### 3.2 Persistência e Navegação sem Page Reload (Shallow URL Sync)
- Ao clicar em um card no Kanban: a URL é atualizada para `/pipeline?dealId=[id]` via `window.history.replaceState` ou router shallow, abrindo o Drawer sem recarregar a tela.
- Ao fechar o Drawer: o parâmetro `dealId` é removido da URL suavemente.
- Suporta deep-link direto: se o vendedor enviar o link ou recarregar a página com `?dealId=[id]`, o Kanban carrega e abre o Drawer focado imediatamente.

### 3.3 Ações Rápidas Globais (1 Clique)
- No cadastro e ficha do cliente (`/clientes`): botão de 1 clique para "Gerar Proposta com IA", abrindo o assistente e garantindo que o deal seja criado ou atualizado no Kanban.
- No assistente de proposta/estudo solar (`proposal-study-provider`): garantia de vínculo do negócio ao estágio `NEW` (Novo) para manter a rastreabilidade total no Kanban.

### 3.4 Higienização e Otimização do Menu (`menu.config.ts`)
- Agrupamento refinado na seção **OPERAÇÃO**:
  1. **Painel** (Visão geral de métricas)
  2. **Negociações** (Cockpit comercial e Kanban 360°)
  3. **Clientes** (Gestão de base e contatos)
  4. **Propostas** (Biblioteca de propostas)
  5. **Radar Solar** (Prospecção inteligente)
- Remoção de itens duplicados ou que criam desvios no fluxo do vendedor.

---

## 4. Diretrizes Visuais & Motion (Regras do Projeto)
- **Zero emojis de WhatsApp:** Ícones limpos com Lucide Icons e React Icons (`FaWhatsapp`).
- **Glow e gradientes estritamente dosados:** Sem excessos neon, paleta sóbria de alta fidelidade visual (estética Google Antigravity / Clean Tech).
- **Transições refinadas:** Animações com Framer Motion utilizando curvas suaves (`cubic-bezier(0.16, 1, 0.3, 1)`), com `AnimatePresence` nas trocas de abas para sensação de continuidade.
- **Scroll fluido e responsivo:** Drawer com rolagem interna contínua, isolamento de scroll para não rolar o Kanban por trás.

---

## 5. Roteiro de Execução
1. **Fase 1 (Plano):** Aprovação deste plano arquitetônico pelo usuário.
2. **Fase 2 (Desenvolvimento Modular):**
   - Implementação do componente unificado `<Deal360Drawer />` com as 3 abas.
   - Integração do Drawer no Kanban de Negociações (`/pipeline`) com sincronização de query param.
   - Integração do botão de 1 clique e criação de deal automático no fluxo de clientes/propostas.
   - Refinamento do menu lateral e superior.
3. **Fase 3 (Validação Visual com Browser Subagent):**
   - Teste automatizado de navegação no navegador.
   - Simulação de cliques, rolagem fluida e abertura das abas.
   - Verificação de ausência de reload de página e conferência estética.
4. **Fase 4 (Verificação, Build, Commit & Push):**
   - Verificação de tipos TypeScript e build do Next.js.
   - Execução de testes unitários.
   - Commit e push para o repositório remoto conforme diretriz do projeto.
