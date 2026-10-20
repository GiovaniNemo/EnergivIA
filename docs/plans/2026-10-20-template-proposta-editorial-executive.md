# Template de Proposta Comercial Completa "Editorial Solar Executive" Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Criar e disponibilizar dentro da EnergivIA o modelo de proposta completo "Editorial Solar Executive" com 16 seções ativas, identidade visual institucional (branco e esmeralda), imagens reais em alta definição de instalações fotovoltaicas e registro oficial no banco de dados.

**Architecture:** O template é gerado a partir de uma estrutura JSON tipada `ProposalEditorDocument` em conformidade com as regras de renderização do editor e PDF da EnergivIA. Um script dedicado de semeadura registra o Blueprint Oficial no Prisma (`ProposalTemplateBlueprint`) e cria/atualiza o template padrão na organização ativa do usuário (`cmru2xi440002229w24hdusch`), permitindo uso imediato.

**Tech Stack:** TypeScript, NestJS, Prisma ORM, PostgreSQL, Vitest.

---

### Task 1: Estruturar o documento JSON do template com 16 seções e fotos reais

**Files:**

- Create: `apps/api/src/modules/proposal-template-blueprints/seeds/editorial-solar-executive-blueprint.ts`
- Test: `apps/api/src/modules/proposal-template-blueprints/__tests__/editorial-solar-executive-blueprint.spec.ts`

**Step 1: Escrever teste automatizado de validação da estrutura do blueprint**
Garantir que o documento possui exatamente as 16 seções esperadas (`cover`, `introduction`, `about_company`, `diagnostic_energy`, `solution`, `generation_consumption`, `proposal_equipment`, `gallery`, `economy_purchases`, `pricing`, `financing`, `guarantees`, `process_steps`, `testimonials`, `faq`, `signature`), estilos válidos e referências a imagens reais sem IA.

**Step 2: Executar teste para verificar falha inicial**
Run: `pnpm --filter @energivia/api test editorial-solar-executive-blueprint.spec.ts`
Expected: FAIL (módulo não encontrado)

**Step 3: Implementar o blueprint completo**
Criar `editorial-solar-executive-blueprint.ts` com o objeto completo `EDITORIAL_SOLAR_EXECUTIVE_DOCUMENT` contendo textos comerciais de alto impacto, dados fotovoltaicos realistas, fotos reais de alta definição de instalações solares e configurações de estilo.

**Step 4: Executar teste para verificar aprovação**
Run: `pnpm --filter @energivia/api test editorial-solar-executive-blueprint.spec.ts`
Expected: PASS

**Step 5: Commit**
`git add apps/api/src/modules/proposal-template-blueprints/seeds/ apps/api/src/modules/proposal-template-blueprints/__tests__/`
`git commit -m "feat: criar definicao do blueprint Editorial Solar Executive"`

---

### Task 2: Criar serviço/script de persistência do Blueprint e ativação no Tenant

**Files:**

- Create: `apps/api/prisma/scripts/seed-editorial-executive-template.ts`
- Modify: `apps/api/src/modules/proposal-template-blueprints/proposal-template-blueprints.service.ts`

**Step 1: Implementar o script de inserção/upsert seguro**
O script deve:

1. Conectar ao PrismaClient.
2. Inserir ou atualizar na tabela `ProposalTemplateBlueprint` o modelo com slug `editorial-solar-executive`, nome `Template Oficial Editorial Solar Executive`, published: true e sortOrder: 0.
3. Criar ou atualizar o template na organização do usuário (`cmru2xi440002229w24hdusch`) com `isDefault: true`, publicando também uma revisão `ProposalTemplateRevision`.

**Step 2: Executar o script no banco de dados**
Run: `pnpm --filter @energivia/api exec tsx prisma/scripts/seed-editorial-executive-template.ts`
Expected: Success log com IDs do Blueprint e do ProposalTemplate gerados.

**Step 3: Commit**
`git add apps/api/prisma/scripts/seed-editorial-executive-template.ts apps/api/src/modules/proposal-template-blueprints/`
`git commit -m "feat: script de seed e persistencia do template Editorial Solar Executive"`

---

### Task 3: Verificação de ponta a ponta e testes de regressão

**Files:**

- Test: Suíte de testes do backend `apps/api` e frontend `apps/web`.

**Step 1: Rodar suíte de testes do backend**
Run: `pnpm --filter @energivia/api test`
Expected: Todos os testes passando sem erros.

**Step 2: Rodar verificação de lint do projeto**
Run: `pnpm lint`
Expected: Código 0 sem violações.

**Step 3: Commit e push final**
`git commit -m "feat: template completo Editorial Solar Executive integrado"`
`git push origin main`
