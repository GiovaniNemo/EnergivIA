# Plano de Implementação: Suíte de Seções Híbridas de Alto Impacto e Redesign Visual

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transformar as propostas híbridas em apresentações comerciais extremamente vendáveis e persuasivas, eliminando os mockups feios do modal e criando uma suíte de 3 seções especializadas: 1) Visão do Banco BESS LiFePO4, 2) Modos de Operação Dia/Noite/Apagão, e 3) Matriz de Cargas Protegidas vs Gerador a Combustível.

**Architecture:** Extensão do motor de propostas com duas novas seções nativas (`hybrid_flow` e `critical_loads_autonomy`) combinadas à reformulação estética da seção `storage_backup` e dos mockups do modal `AddSectionModal.tsx`.

**Tech Stack:** Next.js (React), Tailwind CSS moderno, TypeScript estrito, Vitest.

---

### Task 747: Redesign dos Mockups e Remoção dos Elementos Feios em `AddSectionModal.tsx`

- **Arquivos:**
  - `apps/web/src/components/proposals/editor/AddSectionModal.tsx`
- **Ações:**
  - Remover os botões feios `[🔋 BESS]` e `[⚡ EPS]` do mockup `battery`.
  - Criar mockups wireframe profissionais usando a linguagem visual `MockBar` para `battery`, `hybrid_flow` e `critical_loads_autonomy`.
  - Posicionar o badge `⚡ Exclusivo Híbrido` de forma limpa e discreta, sem sobrepor linhas.
- **Verificação:** Lint limpo e inspeção estática do componente.

---

### Task 748: Tipagens e Configuração de Campos em `types.ts` e `section-fields.ts`

- **Arquivos:**
  - `apps/web/src/components/proposals/editor/types.ts`
  - `apps/web/src/components/proposals/editor/section-fields.ts`
- **Ações:**
  - Adicionar `"hybrid_flow"` e `"critical_loads_autonomy"` ao `SectionType`.
  - Definir campos editáveis (dia/noite/apagão, cargas críticas, horas de autonomia, comparativo vs gerador).
  - Definir defaults completos e profissionais em `SECTION_DEFAULT_FIELDS`.
- **Verificação:** TypeScript compile check sem erros.

---

### Task 749: Renderizadores das 3 Seções em `section-registry.tsx`

- **Arquivos:**
  - `apps/web/src/components/proposals/editor/section-render/section-registry.tsx`
- **Ações:**
  - Refinar `storage_backup`: remover caixinhas amadoras, aplicar design sofisticado de banco de baterias LiFePO4, autonomia e 10 anos de garantia.
  - Implementar `hybrid_flow`: infográfico moderno dos 3 ciclos (Dia, Noite, Apagão) com alta conversão comercial.
  - Implementar `critical_loads_autonomy`: matriz de eletrodomésticos essenciais + comparativo visual "Bateria Solar vs Gerador a Combustível".
- **Verificação:** Testes de renderização e ESLint.

---

### Task 750: Blueprint Oficial Híbrido e Suporte no WhatsApp Bot

- **Arquivos:**
  - `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- **Ações:**
  - Atualizar o fallback de templates híbridos para incluir a suíte completa (`hero_cover`, `storage_backup`, `hybrid_flow`, `critical_loads_autonomy`, `proposal_equipment`, `financial_summary`).
  - Reconhecer templates híbridos pelas novas seções.
- **Verificação:** Executar `pnpm --filter @energivia/api test whatsapp-hybrid-templates.spec.ts`.

---

### Task 751: Validação Completa, Testes e Git Push

- **Ações:**
  - `pnpm --filter @energivia/web lint`
  - `pnpm --filter @energivia/api build`
  - Atualizar `task.md`
  - Commit e `git push origin main`
