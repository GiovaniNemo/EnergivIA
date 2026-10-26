# Templates de Propostas Híbridas & Baterias (Editor & WhatsApp) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar o suporte completo a sistemas Híbridos e Off-Grid nos templates de proposta comercial com cards de bateria no editor web contendo badge de exclusividade (`⚡ Exclusivo Híbrido / Off-Grid`), variáveis dinâmicas de bateria, e filtragem inteligente no WhatsApp bot riscando (`~...~`) templates puramente On-Grid incompatíveis.

**Architecture:** No frontend web, adicionamos o novo SectionType `storage_backup`, enriquecemos os cards de equipamentos (`proposal_equipment`) e a listagem de seções com badges visuais modernos de exclusividade, e mapeamos as variáveis de bateria (`bateria_sistema`, `capacidade_bateria_kwh`, `modo_backup`). No backend (WhatsApp bot), atualizamos `getAvailableTemplates` e `AWAITING_TEMPLATE_SELECTION` para detectar cotações híbridas, formatar templates on-grid com strikethrough do WhatsApp (`~`), impedir seleção incompatível e garantir disponibilidade do blueprint híbrido.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, NestJS, Prisma, Vitest.

---

### Task 743: Variáveis Dinâmicas de Bateria em `public-proposal-variables.ts` e Testes Unitários

**Files:**

- Modify: `apps/web/src/lib/public-proposal-variables.ts`
- Modify: `apps/web/src/lib/__tests__/public-proposal-variables.spec.ts`

**Step 1: Write the failing test**
Adicionar casos de teste em `apps/web/src/lib/__tests__/public-proposal-variables.spec.ts` validando que, ao fornecer itens de kit contendo baterias (`categoryName: "battery"`) e inversor híbrido (`categoryName: "hybrid_inverter"`), o método `mergePublicProposalVariables` preenche corretamente:

- `bateria_sistema`: Ex: `"2x Bateria Lítio LiFePO4 5.12 kWh (Dyness)"`
- `capacidade_bateria_kwh`: `"10.24 kWh"`
- `quantidade_baterias`: `2`
- `inversor_hibrido`: Ex: `"1x Inversor Híbrido 8kW Monofásico (Deye)"`
- `modo_backup`: `"Backup Automático EPS (< 10ms)"`

**Step 2: Run test to verify it fails**
Run: `pnpm --filter @energivia/web test src/lib/__tests__/public-proposal-variables.spec.ts`
Expected: FAIL (variáveis de bateria ausentes no resultado)

**Step 3: Write minimal implementation**
Em `apps/web/src/lib/public-proposal-variables.ts`:

- Localizar itens de categoria `battery`, `bms` e `hybrid_inverter` no array `integrator.kitItems` e `payload.simulation.result.sizing.components`.
- Extrair specs ou capacidade a partir do nome/specs do produto.
- Injetar no objeto `merged` as variáveis de bateria formatadas.

**Step 4: Run test to verify it passes**
Run: `pnpm --filter @energivia/web test src/lib/__tests__/public-proposal-variables.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/public-proposal-variables.ts apps/web/src/lib/__tests__/public-proposal-variables.spec.ts
git commit -m "feat(proposals): adicionar variáveis de bateria e inversor híbrido nos templates"
```

---

### Task 744: Seção `storage_backup`, Cards de Bateria e Badge Exclusivo no Editor

**Files:**

- Modify: `apps/web/src/components/proposals/editor/types.ts`
- Modify: `apps/web/src/components/proposals/editor/section-fields.ts`
- Modify: `apps/web/src/components/proposals/editor/AddSectionModal.tsx`
- Modify: `apps/web/src/components/proposals/editor/field-renderers/renderers.tsx`
- Modify: `apps/web/src/components/proposals/editor/section-render/section-registry.tsx`

**Step 1: Expandir tipos e definições de seção**

- Adicionar `"storage_backup"` em `SectionType` em `types.ts`.
- Em `section-fields.ts`:
  - Adicionar `"storage_backup"` em `SECTION_TYPES`, `SECTION_CATEGORY_BY_TYPE` ("Essenciais"), `SECTION_TYPE_LABELS` ("Armazenamento & Backup (BESS)"), `SECTION_VARIANTS` e campos padrão (título, subtítulo, capacidade_kwh, autonomia_horas, modo_backup, itens de bateria).

**Step 2: Adicionar badge de exclusividade e mockup no `AddSectionModal.tsx`**

- Adicionar `storage_backup` em `SECTION_META` com descrição clara.
- No `AddSectionModal.tsx`:
  - Exibir badge elegante `⚡ Exclusivo Híbrido / Off-Grid` nos cards de seções específicas de bateria/híbrido.
  - Incluir mockup visual de bateria/armazenamento.

**Step 3: Adicionar badge de exclusividade nos cards de equipamentos**

- Em `renderers.tsx` (`ProposalEquipmentLinesField`):
  - Ao listar os equipamentos adicionados na edição da seção, verificar se a categoria do produto é `battery`, `bms`, `hybrid_inverter` ou `off_grid_inverter`.
  - Exibir badge `⚡ Exclusivo Híbrido / Off-Grid` no topo do item.
- Em `section-registry.tsx`:
  - Em `renderProposalEquipmentCards`, se o item for de categoria `battery`, `bms`, `hybrid_inverter` ou `off_grid_inverter`, renderizar badge no card:
    ```tsx
    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
      ⚡ Exclusivo Híbrido / Off-Grid
    </span>
    ```
  - Adicionar o renderizador da seção `storage_backup` com visual moderno dos módulos de bateria, autonomia e no-break.

**Step 4: Executar testes e typecheck**
Run: `pnpm --filter @energivia/web test`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/proposals/editor/
git commit -m "feat(proposals): implementar seção storage_backup e badges exclusivos para híbrido e off-grid"
```

---

### Task 745: Filtragem de Templates, Riscado (`~...~`) e Salvaguarda Híbrida no WhatsApp Bot

**Files:**

- Create: `apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-templates.spec.ts`
- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`

**Step 1: Write the failing test**
Criar teste unitário em `apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-templates.spec.ts`:

- Cenário A: Cotação Híbrida com integrador tendo templates híbridos e on-grid.
  - Verificar que templates híbridos aparecem ativos com número para seleção (`1️⃣ *Template Híbrido*`).
  - Verificar que templates on-grid aparecem riscados (`~2️⃣ Template On-Grid (Incompatível com Bateria)~`).
  - Verificar que se o usuário responder `"2"`, o bot envia mensagem explicando que o modelo é incompatível com o sistema híbrido cotado.
- Cenário B: Cotação Híbrida quando o integrador só possui templates on-grid.
  - Verificar que o bot oferece o Blueprint oficial (_Modelo Híbrido & Backup Solar EnergivIA_).
- Cenário C: Cotação On-Grid (string ou microinversor).
  - Verificar que os templates normais são exibidos normalmente sem riscado.

**Step 2: Run test to verify it fails**
Run: `pnpm --filter @energivia/api test whatsapp-hybrid-templates.spec.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Em `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`:

- Atualizar `getAvailableTemplates` para receber parâmetro opcional `options?: { isHybrid?: boolean }`.
- Inspecionar cada template:
  - Verificar se o nome contém "híbrido", "hibrido", "bateria", "bess", "backup", se `config` possui seção `storage_backup` ou equipamentos de bateria.
- Na listagem de templates em `formatTemplateList` / `AWAITING_TEMPLATE_SELECTION`:
  - Se for híbrido, separar compatíveis e incompatíveis.
  - Riscados são formatados com `~` e sufixo explicativo.
  - Interceptar escolha de opção riscada para orientar a escolha do modelo compatível.

**Step 4: Run test to verify it passes**
Run: `pnpm --filter @energivia/api test whatsapp-hybrid-templates.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/whatsapp-bot.service.ts apps/api/src/modules/whatsapp/__tests__/whatsapp-hybrid-templates.spec.ts
git commit -m "feat(whatsapp): implementar filtragem e riscado de templates on-grid para cotações híbridas"
```

---

### Task 746: Validação Completa, Testes Automatizados (Vitest), Build e Push

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar suite completa de testes**
Run: `pnpm --filter @energivia/api test`
Run: `pnpm --filter @energivia/web test src/lib/__tests__/public-proposal-variables.spec.ts`
Expected: Todos os testes passando com 100% de sucesso.

**Step 2: Executar build e lint**
Run: `pnpm --filter @energivia/api build`
Run: `pnpm --filter @energivia/web lint`
Expected: Build compilado e lint sem erros.

**Step 3: Atualizar rastreador `docs/plans/task.md`**
Registrar `task-743`, `task-744`, `task-745` e `task-746` como completed.

**Step 4: Commit e push final**

```bash
git add docs/plans/task.md
git commit -m "chore: atualizar task tracker e finalizar implementação de templates híbridos"
git push origin main
```
