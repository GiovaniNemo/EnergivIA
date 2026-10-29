# Rastreamento de Parceiro via WhatsApp Bot ("Coleira Dupla") Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar sistema de rastreamento e atribuição automática de parceiros comerciais quando novos integradores entram pelo Bot de WhatsApp, garantindo a amarração da carteira na plataforma web mesmo sem cookies de navegador.

**Architecture:**

1. Tabela dedicada `InboundLeadAttribution` no Prisma (Neon PostgreSQL) vinculando `phoneDigits` ao `salesRepId` e `referralCode`.
2. Página ultrarrápida `/w/[code]` em Next.js gravando cookie/localStorage de 30 dias e saltando para o WhatsApp com tag pré-preenchida.
3. Webhook do bot de WhatsApp capturando a tag na primeira mensagem, gravando o telefone do integrador e injetando o código nos links enviados.
4. Cruzamento por telefone normalizado em `OrganizationsService.create()` para auto-atribuição de `salesRepId` no cadastro de empresas.
5. Painel comercial (`SalesRepLinkCard.tsx`) com link exclusivo do bot e botão de compartilhar em grupos.

**Tech Stack:** Next.js 14, NestJS, Prisma ORM, PostgreSQL (Neon), Vitest, Tailwind CSS, Lucide Icons.

---

### Task 1: Prisma Schema & Banco de Dados (`InboundLeadAttribution`)

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Test: `pnpm --filter @energivia/api prisma validate`

**Step 1: Adicionar modelo InboundLeadAttribution e relações no schema.prisma**
Adicionar modelo indexado com `phoneDigits`, `referralCode`, `salesRepId`, `convertedTenantId` e timestamps.
Adicionar relações nos modelos `User` e `Tenant`.

**Step 2: Gerar cliente Prisma e aplicar push no Neon**
Run: `pnpm --filter @energivia/api prisma db push`
Expected: Database schema in sync.

---

### Task 2: Utilitário de Normalização de Telefones e Parser de Tag de Afiliado

**Files:**

- Create: `apps/api/src/modules/whatsapp/services/whatsapp-referral-parser.ts`
- Create: `apps/api/src/modules/whatsapp/__tests__/whatsapp-referral-parser.spec.ts`

**Step 1: Escrever testes unitários para extração de tag e normalização de telefone**
Testar:

- `extractReferralCodeFromText("Olá! Quero testar a EnergivIA (ref: giovani)")` -> `"giovani"`
- `extractReferralCodeFromText("Olá vim indicado pelo #carlos-solar")` -> `"carlos-solar"`
- `extractReferralCodeFromText("ref=parceiro123")` -> `"parceiro123"`
- `extractReferralCodeFromText("Boa tarde gostaria de uma cotação")` -> `null`
- `normalizePhoneForMatching("5534996851400")` -> `["5534996851400", "34996851400", "996851400"]`
- `normalizePhoneForMatching("(34) 99685-1400")` -> `["5534996851400", "34996851400", "996851400"]`

**Step 2: Implementar funções em `whatsapp-referral-parser.ts`**
Passar todos os testes com 100% de cobertura.

---

### Task 3: Backend WhatsApp Bot: Captura e Injeção de Links com Referral

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Modify: `apps/api/src/modules/whatsapp/services/whatsapp-guest-trial.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-guest-trial.spec.ts`

**Step 1: Interceptar tag na primeira mensagem do usuário**

- Extrair tag de referral do texto inicial.
- Se vendedor existir e estiver ativo, salvar em `InboundLeadAttribution` com `fromWaId` e anexo em `conversation.metadata`.

**Step 2: Propagar `?ref=` nas URLs geradas pelo Bot**

- No `buildGuestTrialExceededMessage(referralCode)`: `https://www.energivia.com.br/gestao/meus-planos?ref=${referralCode}`.
- Na mensagem de cotação gerada: `https://www.energivia.com.br/cadastro?ref=${referralCode}`.

**Step 3: Executar testes do módulo WhatsApp**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/whatsapp/`
Expected: Todos os testes aprovados.

---

### Task 4: Backend OrganizationsService: Cruzamento por Telefone no Cadastro

**Files:**

- Modify: `apps/api/src/modules/organizations/organizations.service.ts`
- Modify: `apps/api/src/modules/organizations/__tests__/organizations-referral.spec.ts`

**Step 1: Escrever teste de atribuição por telefone**

- Criar caso de teste: usuário se cadastra sem `referralCode` na URL, mas com telefone que chamou o bot previamente.
- Verificar se `tenant.salesRepId` e `tenant.referralCode` foram vinculados com sucesso.
- Verificar se `inboundLeadAttribution.convertedTenantId` foi preenchido.

**Step 2: Implementar lógica de fallback por telefone em `OrganizationsService.create()`**

- Se `!assignedSalesRepId`, consultar `InboundLeadAttribution` buscando os dígitos de `dto.phone` ou `user.phone`.
- Conectar `salesRepId` e `referralCode` e atualizar conversão.

**Step 3: Rodar testes de organizações**
Run: `pnpm --filter @energivia/api test apps/api/src/modules/organizations/`
Expected: PASS.

---

### Task 5: Frontend Web: Rota `/w/[code]` de Redirecionamento com Cookie

**Files:**

- Create: `apps/web/src/app/w/[code]/page.tsx`
- Modify: `apps/web/src/lib/referral-tracker.ts` (exportar helper se necessário)

**Step 1: Implementar página de ponte rápida `/w/[code]`**

- Extrair `params.code`.
- Salvar cookie e localStorage imediatamente.
- Disparar `window.location.replace` para deep link wa.me com mensagem inicial contendo `(ref: code)`.
- UI minimalista e segura com spinner, logo oficial e botão fallback _"Abrir WhatsApp"_.

---

### Task 6: Frontend Comercial: Links no `SalesRepLinkCard.tsx`

**Files:**

- Modify: `apps/web/src/components/sales-rep/SalesRepLinkCard.tsx`
- Modify: `apps/web/src/lib/sales-rep-api.ts` (se necessário para URLs do bot)

**Step 1: Adicionar abas ou dois links claros no card do parceiro**

- Link 1: Cadastro no Site (`energivia.com.br/cadastro?ref=codigo`)
- Link 2: Bot no WhatsApp (`energivia.com.br/w/codigo`)
- Botão "Compartilhar no WhatsApp" com texto pronto de recomendação para grupos de energia solar.

---

### Task 7: Validação Completa, Linters e Compilação

**Files:** Todos modificados

- Executar testes Vitest no backend.
- Executar `pnpm --filter @energivia/api build`.
- Executar `pnpm --filter @energivia/web lint`.
- Executar `pnpm --filter @energivia/web build`.

---

### Task 8: Commit e Push das Alterações

- Commit padronizado e push para `origin/main`.
