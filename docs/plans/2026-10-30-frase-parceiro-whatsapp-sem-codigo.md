# Frase Humanizada e Boas-Vindas Exclusiva para Parceiros no WhatsApp Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Substituir o código técnico visível `(ref: energivia-sakp)` por frases naturais destacando a marca do parceiro (ex: _"Olá! Vim pela SolZap e quero testar o assistente de IA da EnergivIA"_), com resposta VIP de boas-vindas do robô e atribuição automática do lead no WhatsApp.

**Architecture:**

1. Adição dos campos `partnerBrandName`, `referralPhrase` e `customWelcomeMsg` no modelo `User` do Prisma.
2. Endpoint público `GET /public/referral-info/:code` para fornecer a frase configurada à página `/w/:code`.
3. Expansão semântica do `whatsapp-referral-parser.ts` para detectar intenções naturais em português ("Vim pela SolZap", "Vi no grupo da SolZap", etc.) e disparar boas-vindas exclusivas da parceria no `WhatsappBotService`.
4. Atualização da página web `/w/[code]/page.tsx` para direcionar ao WhatsApp com mensagem 100% limpa e humana, mantendo o cookie de 30 dias.
5. Edição e preview interativo dos balões de WhatsApp na interface do vendedor (`SalesRepLinkCard.tsx`).

**Tech Stack:** Next.js (App Router), NestJS, Prisma ORM, PostgreSQL (Neon), Vitest, Tailwind CSS, Lucide Icons.

---

### Task 1: Prisma Schema & Migration (Campos de Personalização de Parceiro)

**Files:**

- Modify: `apps/api/prisma/schema.prisma:195-215`
- Migration: `apps/api/prisma/migrations/*`

**Step 1: Adicionar novos campos no modelo User**

No modelo `User`:

```prisma
  partnerBrandName      String?              @map("partner_brand_name")
  referralPhrase        String?              @map("referral_phrase") @db.Text
  customWelcomeMsg      String?              @map("custom_welcome_msg") @db.Text
```

**Step 2: Executar migração do Prisma e gerar cliente**

Run: `pnpm --filter @energivia/api prisma db push` (ou `prisma migrate dev`)
Expected: Schema sincronizado com sucesso e Prisma Client gerado.

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(api): campos de personalização de marca e frase de parceiro no prisma"
```

---

### Task 2: Parser Semântico de WhatsApp Bot (TDD)

**Files:**

- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-referral-parser.spec.ts`
- Modify: `apps/api/src/modules/whatsapp/services/whatsapp-referral-parser.ts`

**Step 1: Escrever testes unitários falhando (RED)**

No arquivo `whatsapp-referral-parser.spec.ts`, adicionar cenários para:

1. `"Olá! Vim pela SolZap e quero testar o assistente de IA da EnergivIA"` -> extrai `"solzap"`.
2. `"Vim pelo Carlos Vendas e quero conhecer o robô"` -> extrai `"carlos-vendas"`.
3. `"Vi no grupo da SolZap"` -> extrai `"solzap"`.
4. `"Indicação da SolZap"` -> extrai `"solzap"`.
5. Retrocompatibilidade: `"Olá! Quero testar (ref: energivia-sakp)"` -> extrai `"energivia-sakp"`.

**Step 2: Executar teste para verificar que falha**

Run: `pnpm --filter @energivia/api test whatsapp-referral-parser.spec.ts`
Expected: FAIL nos novos padrões de linguagem natural.

**Step 3: Implementar expressões regulares semânticas e normalização de slug**

Em `whatsapp-referral-parser.ts`:
Adicionar suporte a:

```ts
const naturalMatch = trimmed.match(
  /(?:vim pela?|vim por|vi no grupo da?|indica[çc][ãa]o da?|parceria com a?)\s+([a-zA-Z0-9_\s-]{2,40})/i
);
```

Normalizar o resultado para slug limpo (`solzap`).

**Step 4: Executar testes para confirmar aprovação (GREEN)**

Run: `pnpm --filter @energivia/api test whatsapp-referral-parser.spec.ts`
Expected: Todos os testes passando com 100% de sucesso.

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/services/whatsapp-referral-parser.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-referral-parser.spec.ts
git commit -m "feat(whatsapp): parser semântico de indicações naturais em português"
```

---

### Task 3: Endpoint Público `GET /public/referral-info/:code` no Backend

**Files:**

- Create/Modify: `apps/api/src/modules/sales-rep/controllers/public-referral.controller.ts` (ou no controller público correspondente)
- Test: `apps/api/src/modules/sales-rep/__tests__/public-referral.spec.ts`
- Modify: `apps/api/src/modules/sales-rep/sales-rep.service.ts`

**Step 1: Escrever teste unitário para o serviço e endpoint público**

Validar que para um parceiro com `referralCode: "solzap"` e `partnerBrandName: "SolZap"`:

- Retorna a frase customizada se existir.
- Retorna a frase gerada automaticamente: `"Olá! Vim pela SolZap e quero testar o assistente de IA da EnergivIA"` se `referralPhrase` for nula.
- Retorna 404 seguro ou fallback caso o código não exista.

**Step 2: Executar teste e verificar que falha**

Run: `pnpm --filter @energivia/api test public-referral.spec.ts`

**Step 3: Implementar método `getPublicReferralInfo(code: string)`**

Em `sales-rep.service.ts`:
Buscar usuário ativo por `referralCode` (case-insensitive).
Retornar DTO formatado com fallbacks amigáveis.

**Step 4: Registrar endpoint público sem autenticação obrigatória**

Configurar rota `GET /public/referral-info/:code` com rate limit de proteção.

**Step 5: Executar testes para confirmar aprovação**

Run: `pnpm --filter @energivia/api test public-referral.spec.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/modules/sales-rep/
git commit -m "feat(sales-rep): endpoint público de informações e frase do parceiro"
```

---

### Task 4: Webhook do WhatsApp Bot: Boas-Vindas Exclusiva da Parceria

**Files:**

- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-bot-welcome.spec.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`

**Step 1: Escrever teste para detecção e saudação de parceria**

Verificar que quando uma mensagem com indicação de parceiro (ex: SolZap) chega em uma nova conversa:

- Registra `InboundLeadAttribution` com o `salesRepId` e `referralCode`.
- A mensagem inicial enviada ao cliente contém o reconhecimento da parceria (ex: `"Identificamos sua chegada através da parceria com a SolZap..."`).

**Step 2: Implementar montagem dinâmica da saudação de boas-vindas**

Em `whatsapp-bot.service.ts`:
Se detectado parceiro e houver `customWelcomeMsg`, prioriza o texto personalizado.
Caso contrário, utiliza a mensagem padrão institucional:

> _"Olá! Seja muito bem-vindo à EnergivIA! ☀️\n\nIdentificamos sua chegada através da parceria com a **{partnerBrandName}**! Liberamos uma condição exclusiva com 3 propostas completas de cortesia para você testar.\n\nComo posso te chamar?"_

**Step 3: Executar testes para garantir ausência de regressão**

Run: `pnpm --filter @energivia/api test`
Expected: Todos os testes aprovados.

**Step 4: Commit**

```bash
git add apps/api/src/modules/whatsapp/
git commit -m "feat(whatsapp): resposta VIP de boas-vindas para leads de parceiros"
```

---

### Task 5: Frontend: Atualizar Ponte Web `/w/[code]/page.tsx`

**Files:**

- Modify: `apps/web/src/app/w/[code]/page.tsx`

**Step 1: Consultar informações do parceiro na inicialização**

- Ao carregar a página `/w/[code]`, requisita `/public/referral-info/${code}`.
- Constrói o link `wa.me/554491585309?text=${encodeURIComponent(phrase)}` com a frase 100% natural.
- Fallback instantâneo inteligente caso a requisição demore: formata o código sem parênteses (ex: `"Olá! Vim pela SolZap e quero testar o assistente de IA da EnergivIA"`).
- Persiste o cookie de 30 dias `energivia_ref` no navegador.

**Step 2: Testar e verificar compilação Next.js**

Run: `pnpm --filter @energivia/web build`
Expected: Rota `/w/[code]` compilada com sucesso.

**Step 3: Commit**

```bash
git add apps/web/src/app/w/[code]/page.tsx
git commit -m "feat(web): redirecionamento do whatsapp com frase humanizada sem código mecânico"
```

---

### Task 6: Painel Comercial do Vendedor: Edição de Frase e Preview de WhatsApp

**Files:**

- Modify: `apps/web/src/components/sales-rep/SalesRepLinkCard.tsx`
- Modify: `apps/web/src/app/(authenticated)/admin/comercial/page.tsx`

**Step 1: Adicionar campos de Nome da Marca e Frase do WhatsApp**

- Permitir que o parceiro/admin defina o `partnerBrandName` (ex: "SOLZAP") e a frase inicial.
- Adicionar componente de **Preview Visual dos Balões do WhatsApp**:
  - Balão verde à direita: `"Olá! Vim pela SolZap e quero testar o assistente de IA da EnergivIA"`
  - Balão cinza à esquerda: `"Olá! Seja muito bem-vindo à EnergivIA! Identificamos sua chegada pela parceria com a SolZap..."`

**Step 2: Validar UX e Ausência de Emojis do WhatsApp na Web (Seguindo user_rules)**

- Utilizar ícones do Lucide (como `<MessageSquare />`, `<Sparkles />`, `<Check />`).
- Garantir visual sóbrio, moderno e sem gradientes neon exagerados.

**Step 3: Commit**

```bash
git add apps/web/src/components/sales-rep/ apps/web/src/app/(authenticated)/admin/comercial/
git commit -m "feat(web): preview visual e customização de frase de parceiro no painel"
```

---

### Task 7: Validação Completa, Testes Automatizados e Deploy

**Files:**

- Todos os arquivos alterados

**Step 1: Executar suite de testes do Backend**

Run: `pnpm --filter @energivia/api test`
Expected: 100% dos testes aprovados.

**Step 2: Executar build de produção do Next.js e NestJS**

Run: `pnpm build`
Expected: 0 erros de TypeScript e rotas compiladas.

**Step 3: Commit e Push**

```bash
git push origin main
```
