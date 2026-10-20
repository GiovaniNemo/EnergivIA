# Central de Ajuda & Atendimento Enterprise - Design Document

> **Data:** 2026-10-20  
> **Status:** Aprovado  
> **Objetivo:** Criar uma Central de Ajuda, Suporte e Atendimento corporativa para clientes do EnergivIA reportarem dificuldades técnicas, sugestões de melhorias e reclamações/ouvidoria, com geração de protocolo formal e distribuição automatizada por e-mail para `contato@energivia.com.br` e confirmação ao cliente.

---

## 1. Contexto e Motivação

Integradores e clientes utilizam o EnergivIA diariamente para gerar propostas solares, gerenciar funil comercial, conectar IA no WhatsApp e analisar viabilidade técnica/financeira. Quando enfrentam uma dificuldade, têm uma ideia inovadora de melhoria ou precisam registrar uma insatisfação/reclamação, necessitam de um canal estruturado, confiável e com padrão corporativo idêntico ao de grandes empresas de software (SaaS enterprise).

A Central de Ajuda centraliza esse atendimento com:

1. **Triagem por Categoria:**
   - 🚨 **Dificuldade Técnica / Erro / Bug** (com seletor de severidade: Baixa, Média, Alta, Sistema Inoperante).
   - 💡 **Sugestão de Melhoria / Nova Ideia** (solicitação de novas funcionalidades para o sistema).
   - ⚖️ **Reclamação & Ouvidoria** (atendimento direto e prioritário com os sócios/diretoria).
   - ❓ **Dúvida Operacional / Como Usar** (orientações de uso da plataforma).
   - 💳 **Financeiro & Faturamento** (planos, faturas, notas fiscais e upgrades).
2. **Identificação e Contexto Automático:**
   - Pré-preenchimento dos dados do usuário logado: Nome, E-mail, Telefone, Organização/Empresa e Plano ativo.
   - Diagnóstico técnico do ambiente anexado discretamente (navegador, OS, rota onde ocorreu o problema e data/hora).
3. **Upload de Evidências:**
   - Anexo de capturas de tela, fotos ou documentos (PNG, JPG, PDF) para acelerar a resolução.
4. **Protocolo Corporativo e SLA:**
   - Geração de protocolo único `#TKT-YYYYMMDD-XXXX` (ex: `#TKT-20261020-7412`).
   - Exibição de comprovante e tempo estimado de resposta de acordo com a severidade.
5. **Fluxo Duplo de E-mails:**
   - E-mail corporativo em HTML rico para `contato@energivia.com.br` (notificando sócios e equipe de atendimento).
   - E-mail de confirmação ao cliente contendo o protocolo, cópia da mensagem e prazos.
6. **Base de Conhecimento Rápida (FAQ):**
   - Respostas imediatas para as dúvidas mais frequentes sobre WhatsApp IA, propostas e planos.

---

## 2. Arquitetura da Solução

```
[ Frontend: /ajuda ]
       │
       ├──> Identifica Usuário Logado (useOrganization, useUser)
       ├──> Seleciona Categoria & Preenche Formulário
       ├──> Anexa Arquivos (Print / PDF)
       │
       ▼
[ POST /api/support/tickets (Web Proxy ou API Route) ]
       │
       ▼
[ Backend NestJS: SupportTicketService (/support/tickets) ]
       │
       ├── 1. Gera Protocolo Corporativo (#TKT-XXXX)
       ├── 2. Registra Log & Armazena no Banco de Dados
       ├── 3. Envia E-mail Team -> contato@energivia.com.br (HTML estruturado)
       └── 4. Envia E-mail Confirmação -> cliente (HTML com protocolo e SLA)
```

---

## 3. Especificação dos Componentes de Frontend

### 3.1 Página `/ajuda` (`apps/web/src/app/(authenticated)/ajuda/page.tsx`)

- **Header:** Título "Central de Atendimento & Suporte", badge de status do sistema ("Todos os serviços operacionais"), campo de busca rápida.
- **Tabs / Seções:**
  - `Abrir Chamado`: Formulário completo com seletor interativo de categorias (cards visuais), assunto, severidade, descrição, upload de anexos e botão de envio com estado de loading.
  - `Perguntas Frequentes (FAQ)`: Acordeão com busca para autoatendimento rápido de dúvidas sobre IA, propostas, dimensionamento e financeiro.
  - `Canais Diretos`: Cards informando o e-mail oficial `contato@energivia.com.br`, WhatsApp oficial de suporte e horários de atendimento.
- **Tela de Sucesso / Protocolo:**
  - Card corporativo destacando o número do protocolo com botão de copiar.
  - Resumo dos dados enviados e indicação de confirmação enviada para o e-mail do cliente.
  - Botão de atalho para enviar mensagem no WhatsApp referenciando o protocolo se o caso for urgente.

### 3.2 Integração no Menu e Navegação

- **`Sidebar.tsx` / `menu.config.ts`:**
  - Adicionado item `Central de Ajuda` na seção `management` (ou grupo de suporte), acessível a todos os usuários da organização com ícone `HelpCircle` / `LifeBuoy`.
- **`Topbar.tsx` (Menu do Perfil):**
  - Item "Central de Ajuda" ao lado de "Editar Perfil".

---

## 4. Especificação do Backend

### 4.1 Módulo `support` em `apps/api`

- **`SupportModule`:** Registrado no `app.module.ts`.
- **`SupportController`:**
  - `POST /support/tickets` (rota pública ou com `@SkipTrialLock()` para que até clientes em trial ou com plano bloqueado possam pedir suporte).
- **`SupportService`:**
  - Valida dados do DTO.
  - Formata protocolo único.
  - Envia e-mail formatado para `contato@energivia.com.br` usando `EmailService`.
  - Envia e-mail de confirmação para o solicitante.
  - Salva o ticket para rastreabilidade e histórico.

---

## 5. Templates de E-mail

1. **E-mail para `contato@energivia.com.br`:**
   - Assunto: `[Suporte EnergivIA #{protocol}] [{category}] {subject} - {name} ({companyName})`
   - Design: Header corporativo EnergivIA, banner de severidade (ex: Alta em vermelho, Média em âmbar), tabela com dados completos do cliente, descrição em destaque, anexo e metadados técnicos (URL, navegador).
2. **E-mail para o Cliente:**
   - Assunto: `[EnergivIA] Recebemos sua solicitação - Protocolo #{protocol}`
   - Design: Confirmação cordial, protocolo em destaque, cópia do chamado e SLA previsto de atendimento.

---

## 6. Verificação e Critérios de Aceite

- Build do backend (`apps/api`) e frontend (`apps/web`) sem erros de TypeScript ou lint.
- Testes unitários para o serviço de suporte cobrindo envio de tickets, formatação de protocolo e envio de e-mails.
- Interface responsiva, com suporte a tema claro e escuro, acessibilidade e mensagens de validação claras.
