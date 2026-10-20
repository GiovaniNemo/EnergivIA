# Central de Ajuda & Atendimento Enterprise Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Criar uma Central de Ajuda, Suporte e Atendimento corporativa completa e profissional (`/ajuda`), com triagem por categorias (dificuldade técnica, ideias de melhorias, reclamações/ouvidoria), geração automática de protocolo, pré-preenchimento de dados de cliente/empresa/plano, envio duplo de e-mails para `contato@energivia.com.br` e confirmação ao cliente, além de base de conhecimento com FAQ.

**Architecture:** Módulo NestJS `SupportModule` no backend com `SupportController` e `SupportService` acoplado ao `EmailService` já configurado com Resend/Zoho SMTP; templates de e-mail corporativos em HTML; rota de proxy em Next.js `/api/support/tickets`; e interface de usuário no frontend com design moderno, sem excessos de animação ou gradientes exagerados, responsiva, integrada ao `Sidebar.tsx` e `Topbar.tsx`.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, Lucide Icons, NestJS, Nodemailer/Resend, Vitest.

---

### Task 1: Criar DTOs e Templates de E-mail Corporativo de Suporte no Backend

**Files:**

- Create: `apps/api/src/modules/support/dto/create-support-ticket.dto.ts`
- Create: `apps/api/src/modules/support/templates/support-ticket-team.template.ts`
- Create: `apps/api/src/modules/support/templates/support-ticket-client.template.ts`

**Step 1: Criar DTO com validações**
Definir `CreateSupportTicketDto` com os campos: `category`, `severity`, `subject`, `message`, `name`, `email`, `phone`, `companyName`, `userPlan`, `attachments`, `metadata`.

**Step 2: Criar template de e-mail para a equipe (contato@energivia.com.br)**
Design HTML corporativo em tons de slate escuro com detalhes em esmeralda/primário, badge de severidade colorido, tabela com dados do cliente e mensagem destacada.

**Step 3: Criar template de e-mail de confirmação ao cliente**
Design com confirmação de protocolo, resumo do chamado, prazo estimado de resposta (SLA) e canal direto para urgências.

---

### Task 2: Implementar SupportService e SupportController no Backend

**Files:**

- Create: `apps/api/src/modules/support/support.service.ts`
- Create: `apps/api/src/modules/support/support.controller.ts`
- Create: `apps/api/src/modules/support/support.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Implementar o SupportService**

- Método `createTicket(dto, user, tenantId)`:
  - Gera protocolo único: `#TKT-YYYYMMDD-XXXX`.
  - Resolve dados do usuário (se autenticado via token/tenant ou fornecido no DTO).
  - Envia e-mail para `contato@energivia.com.br` através do `EmailService.sendEmail`.
  - Envia e-mail de confirmação para o e-mail do solicitante.
  - Retorna `{ success: true, protocol: string, message: string }`.

**Step 2: Implementar o SupportController**

- Endpoint `POST /support/tickets` com `@Public()` e `@SkipTrialLock()`.

**Step 3: Registrar no AppModule**

- Adicionar `SupportModule` no `app.module.ts`.

---

### Task 3: Escrever Testes Unitários do Backend para o SupportService

**Files:**

- Create: `apps/api/src/modules/support/__tests__/support.service.spec.ts`

**Step 1: Criar testes cobrindo:**

- Geração correta do protocolo no padrão `#TKT-...`.
- Chamada do `EmailService.sendEmail` com destino `contato@energivia.com.br`.
- Chamada do envio de confirmação ao cliente.
- Tratamento gracioso quando parâmetros opcionais não são fornecidos.

**Step 2: Executar vitest no backend**
Run: `npm run test` em `apps/api` para garantir 100% de aprovação.

---

### Task 4: Criar Rota de API no Frontend (`/api/support/tickets`)

**Files:**

- Create: `apps/web/src/app/api/support/tickets/route.ts`

**Step 1: Implementar a rota Next.js App Router POST**

- Extrair sessão do Auth0 (se logado), preencher dados ausentes do usuário e organização.
- Encaminhar requisição para o backend (`${BACKEND_URL}/support/tickets`).
- Tratar respostas de erro e sucesso com fallback seguro.

---

### Task 5: Implementar a Página Completa da Central de Ajuda (`/ajuda`)

**Files:**

- Create: `apps/web/src/app/(authenticated)/ajuda/page.tsx`
- Create: `apps/web/src/app/(authenticated)/ajuda/components/TicketForm.tsx`
- Create: `apps/web/src/app/(authenticated)/ajuda/components/FaqSection.tsx`
- Create: `apps/web/src/app/(authenticated)/ajuda/components/ChannelsSection.tsx`
- Create: `apps/web/src/app/(authenticated)/ajuda/components/TicketSuccessModal.tsx`

**Step 1: Criar componentes modulares e de alto acabamento visual**

- `TicketForm`: Seletor de categorias em cards visuais com ícones corporativos, badges de severidade, campos pré-preenchidos, upload de prints/arquivos, botão de submissão com animação sutil de loading.
- `FaqSection`: Acordeão categorizado e pesquisável cobrindo geração de propostas, conexão do WhatsApp IA, faturas e limites de plano.
- `ChannelsSection`: Informações oficiais de contato (`contato@energivia.com.br`, WhatsApp oficial de suporte comercial/técnico, horário de atendimento).
- `TicketSuccessModal`: Exibição do protocolo oficial, resumo, aviso de envio por e-mail e atalho direto para WhatsApp com mensagem pré-formatada.
- Página principal `/ajuda` orquestrando o layout, abas de navegação rápida e estado global.

---

### Task 6: Integrar Central de Ajuda no Menu Lateral e Topbar

**Files:**

- Modify: `apps/web/src/config/menu.config.ts`
- Modify: `apps/web/src/components/layout/topbar.tsx`

**Step 1: Adicionar item no `menu.config.ts`**

- Inserir "Central de Ajuda" com ícone `HelpCircle` ou `LifeBuoy`, apontando para `/ajuda`, visível a todos os usuários da organização.

**Step 2: Adicionar link no `UserMenu` do `Topbar.tsx`**

- Adicionar opção "Central de Ajuda" com ícone amigável logo acima de "Editar perfil" ou "Deslogar".

---

### Task 7: Validar Lints, Testes Automatizados e Fazer Commit & Push

**Step 1: Executar linters no frontend e backend**

- `pnpm --filter @energivia/api lint` ou `npm run lint` em `apps/api`.
- `pnpm --filter @energivia/web lint` ou verificação no `apps/web`.

**Step 2: Executar suítes de testes unitários**

- Executar Vitest em `apps/api` e `apps/web`.

**Step 3: Commit e push para o repositório remoto**

- `git add . && git commit -m "feat(support): implementar central de ajuda e atendimento corporativa" && git push`
