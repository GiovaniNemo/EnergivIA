# Modelos Pré-Prontos de 1-Clique para Depoimentos e FAQ Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implementar um seletor popover de modelos pré-prontos fotovoltaicos de 1-clique para as seções de Depoimentos e Perguntas Frequentes (FAQ) no editor de templates de proposta.

**Architecture:** Módulo de presets tipados (`template-section-presets.ts`), componente popover categorizado (`SectionPresetsMenu.tsx`) integrado diretamente ao `renderTableField` em `renderers.tsx`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide Icons, Vitest.

---

### Task 1: Catálogo de Presets Fotovoltaicos Tipados e Testes Unitários

**Files:**

- Create: `apps/web/src/components/proposals/editor/presets/template-section-presets.ts`
- Create: `apps/web/src/components/proposals/editor/presets/__tests__/template-section-presets.spec.ts`

**Step 1: Write failing test**
Criar teste unitário verificando que os presets para `testimonials` e `faq` existem, possuem categorias bem definidas e todos os campos obrigatórios (nome, subtítulo, texto para depoimentos; pergunta, resposta para FAQ).

**Step 2: Run test to verify it fails**
`cmd /c "pnpm test:unit apps/web/src/components/proposals/editor/presets/__tests__/template-section-presets.spec.ts"`

**Step 3: Implement minimal code**
Criar `template-section-presets.ts` com:

- `SECTION_PRESETS` contendo depoimentos (Residencial, Comercial, Rural, Industrial) e FAQs (Funcionamento, Garantias, Economia).
- Funções auxiliares `getSectionPresets(sectionType)`.

**Step 4: Run test to verify it passes**
`cmd /c "pnpm test:unit apps/web/src/components/proposals/editor/presets/__tests__/template-section-presets.spec.ts"`

**Step 5: Commit**
`git add apps/web/src/components/proposals/editor/presets/; git commit -m "feat(proposals): add typed presets catalog for testimonials and faq"`

---

### Task 2: Componente Popover de Seleção Rápida (`SectionPresetsMenu.tsx`)

**Files:**

- Create: `apps/web/src/components/proposals/editor/presets/SectionPresetsMenu.tsx`

**Step 1: Implement SectionPresetsMenu**

- Botão compacto com ícone `Sparkles` ("Modelos prontos").
- Dropdown/Popover flutuante com abas de categoria (ex.: Todos, Residencial, Comercial, Rural).
- Lista com título e prévia do texto de cada modelo.
- Ao clicar no item, dispara `onSelectPreset(row)` e fecha o menu.
- Acessibilidade e fechamento suave ao clicar fora ou pressionar Escape.

**Step 2: Commit**
`git add apps/web/src/components/proposals/editor/presets/SectionPresetsMenu.tsx; git commit -m "feat(proposals): create SectionPresetsMenu component"`

---

### Task 3: Integração no Editor de Tabela de Campos (`renderers.tsx`)

**Files:**

- Modify: `apps/web/src/components/proposals/editor/field-renderers/renderers.tsx`

**Step 1: Integrar SectionPresetsMenu no renderTableField**

- Verificar se `section.type === "testimonials"` ou `"faq"` e se `field.name === "items"`.
- Renderizar `<SectionPresetsMenu />` logo ao lado do botão tradicional `field.tableAddRowLabel`.
- No `onSelectPreset`, adicionar a nova linha pré-preenchida ao array `rows` com ID único via `onSectionFieldChange(field.name, [...rows, newRow])`.

**Step 2: Commit**
`git add apps/web/src/components/proposals/editor/field-renderers/renderers.tsx; git commit -m "feat(proposals): integrate section presets menu into table field renderer"`

---

### Task 4: Validação Completa, Testes e Sincronização Remota

**Files:**

- Modify: `docs/plans/task.md`

**Step 1: Executar suite de testes vitest**
`cmd /c "pnpm test:unit"`

**Step 2: Executar lint no @energivia/web**
`cmd /c "pnpm --filter @energivia/web lint"`

**Step 3: Commit e push para origin/main**
`git add -A; git commit -m "feat(proposals): 1-click presets for testimonials and faq in template editor"; git push origin main`
