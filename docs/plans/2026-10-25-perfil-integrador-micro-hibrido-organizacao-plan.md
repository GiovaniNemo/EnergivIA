# Reorganização do Perfil do Integrador e Preferências de Microinversores e Híbridos - Plano de Implementação

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Reorganizar a tela do Perfil do Integrador em uma arquitetura ergonômica de Abas e Pílulas Segmentadas, adicionando suporte completo a preferências de marcas para Microinversores e Inversores Híbridos tanto na interface quanto no motor de dimensionamento e no WhatsApp Bot.

**Architecture:** Frontend modernizado com abas de topo (_Regras Comerciais_ vs _Catálogo de Preferências_) e seletor segmentado em pílulas para as 4 tecnologias (Módulos, Inversores String, Microinversores e Inversores Híbridos). Backend atualizado para expor marcas ativas de microinversores e híbridos, persistir os tiers no `Tenant.settings` e calibrar o `KitGenerationService` para nunca duplicar GoodWe quando houver opções de microinversores no catálogo.

**Tech Stack:** Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons, NestJS, Prisma ORM, Vitest.

---

### Task 1: Expor Microinversores e Inversores Híbridos em `BrandsService`

**Files:**

- Modify: `apps/api/src/modules/brands/brands.service.ts`
- Test: `apps/api/src/modules/brands/__tests__/brands-available.spec.ts`

**Step 1: Escrever teste unitário para `getDistributorAvailable` cobrindo microinversores e híbridos**

```typescript
it("should return distinct active brands for modules, inverters, microInverters, and hybridInverters", async () => {
  // valida que microinversores (ex: DEYE, NEP, SAJ, GoodWe, Growatt) e híbridos (DEYE) aparecem nas suas chaves específicas
});
```

**Step 2: Executar teste e verificar falha**
Run: `pnpm --filter @energivia/api test brands-available.spec.ts`
Expected: FAIL com propriedades ausentes (`microInverters`, `hybridInverters`)

**Step 3: Implementar coleta de `microinverter` e `hybrid_inverter` em `brands.service.ts`**

- Remover filtro excludente `isMicroInverterBrand` para a categoria geral.
- Criar sets dedicados: `modulesSet`, `invertersSet`, `microInvertersSet`, `hybridInvertersSet`.
- Mapear categorias correspondentes de `distributorProduct` e `product`.
- Retornar `{ modules, inverters, microInverters, hybridInverters }`.

**Step 4: Executar teste e verificar aprovação**
Run: `pnpm --filter @energivia/api test brands-available.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/brands/
git commit -m "feat(api): incluir marcas ativas de microinversores e hibridos em getDistributorAvailable"
```

---

### Task 2: Persistência de `microInverterBrandTiers` e `hybridInverterBrandTiers` no Backend

**Files:**

- Modify: `apps/api/src/modules/organizations/dto/update-organization.dto.ts`
- Modify: `apps/api/src/modules/organizations/organizations.service.ts`
- Test: `apps/api/src/modules/organizations/__tests__/organizations-brand-tiers.spec.ts`

**Step 1: Escrever teste unitário para persistência de tiers de micro e híbridos**

```typescript
it("should save and return microInverterBrandTiers and hybridInverterBrandTiers in organization settings", async () => {
  // testa updateOrganization com microInverterBrandTiers e hybridInverterBrandTiers
});
```

**Step 2: Executar teste e verificar falha**
Run: `pnpm --filter @energivia/api test organizations-brand-tiers.spec.ts`

**Step 3: Implementar atualização em `organizations.service.ts` e DTOs**

- Adicionar propriedades nos DTOs de `UpdateOrganizationDto` e `CreateOrganizationDto`.
- Atualizar a gravação de `settings` no Tenant com `microInverterBrandTiers`, `hybridInverterBrandTiers`, `preferredMicroInverterBrands` e `preferredHybridInverterBrands`.

**Step 4: Executar teste e verificar aprovação**
Run: `pnpm --filter @energivia/api test organizations-brand-tiers.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/organizations/
git commit -m "feat(api): suporte a persistencia de tiers de microinversores e hibridos no tenant"
```

---

### Task 3: Inteligência de Tiers de Microinversores e Híbridos em `KitGenerationService`

**Files:**

- Modify: `apps/api/src/modules/kit/kit-generation.service.ts`
- Test: `apps/api/src/modules/kit/__tests__/kit-generation-micro-tiers.spec.ts`

**Step 1: Escrever teste unitário comprovando que cotações de microinversor geram marcas variadas nos 3 tiers**

```typescript
it("should distribute distinct microinverter brands across Standard, Elite and Premium without repeating GoodWe in all options", async () => {
  // testa generateDistributorTiers com inverter_type: 'microinverter'
});
```

**Step 2: Executar teste e verificar falha**
Run: `pnpm --filter @energivia/api test kit-generation-micro-tiers.spec.ts`
Expected: FAIL (pois hoje cai em GoodWe nos três tiers)

**Step 3: Implementar no `KitGenerationService`:**

- Definir `DEFAULT_TIER_MICRO_BRANDS` (Standard: NEP, SAJ, Deye Micro; Elite: Growatt, Deye, Hoymiles; Premium: GoodWe, Hoymiles, APsystems, Enphase).
- Definir `DEFAULT_TIER_HYBRID_BRANDS` (Standard: Deye, Growatt; Elite: GoodWe, Solis, Deye; Premium: Huawei, Fronius, Sungrow).
- Carregar `microInverterBrandTiers` e `hybridInverterBrandTiers` do tenant se configurados.
- Ao gerar tiers para `input.inverter_type === "microinverter"`, aplicar os tiers de microinversor para `buildTier`.
- Ao gerar tiers para `input.inverter_type === "hybrid"`, aplicar os tiers de híbrido para `buildTier`.
- Garantir fallback de candidatos sem duplicar marca única em todos os tiers quando houver mais de uma marca compatível.

**Step 4: Executar teste e verificar aprovação**
Run: `pnpm --filter @energivia/api test kit-generation-micro-tiers.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/kit/
git commit -m "feat(api): selecao inteligente e diversificada de marcas para microinversores e hibridos nos tiers"
```

---

### Task 4: Sincronização no WhatsApp Bot (`whatsapp-bot.service.ts`)

**Files:**

- Modify: `apps/api/src/modules/whatsapp/whatsapp-bot.service.ts`
- Test: `apps/api/src/modules/whatsapp/__tests__/whatsapp-micro-hybrid-kit-calc.spec.ts`

**Step 1: Adicionar caso de teste para preferências de microinversor do tenant no bot**

```typescript
it("should use tenant microinverter brand preferences during whatsapp micro quote calculation", async () => { ... });
```

**Step 2: Executar teste e verificar status**
Run: `pnpm --filter @energivia/api test whatsapp-micro-hybrid-kit-calc.spec.ts`

**Step 3: Atualizar `whatsapp-bot.service.ts`**

- Em `calculateDistributorKits`, repassar `inverterType` ("microinverter" | "hybrid") para o `KitGenerationService`.
- No fallback de contingência, ler `preferredMicroInverterBrands` e `preferredHybridInverterBrands` do tenant em vez de fixar `Growatt`.

**Step 4: Executar testes de integração do bot**
Run: `pnpm --filter @energivia/api test whatsapp-micro-hybrid-kit-calc.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/whatsapp/
git commit -m "feat(whatsapp): sincronizar preferencias de microinversores e hibridos nas cotacoes do bot"
```

---

### Task 5: Extensão dos Tipos e Client API no Frontend

**Files:**

- Modify: `apps/web/src/lib/organizations-api.ts`
- Modify: `packages/shared-types/src/index.ts` (se aplicável)

**Step 1: Atualizar `DistributorAvailableBrands` e `Organization` em `organizations-api.ts`**

- Adicionar `microInverters: string[]` e `hybridInverters: string[]` em `DistributorAvailableBrands`.
- Adicionar `microInverterBrandTiers?: BrandTierSelection | null` e `hybridInverterBrandTiers?: BrandTierSelection | null` em `Organization`.
- Adicionar campos no payload de `updateOrganization` e `createOrganization`.

**Step 2: Validar compilação dos tipos**
Run: `pnpm --filter @energivia/web exec tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/web/src/lib/organizations-api.ts
git commit -m "feat(web): tipagens e client API para microinversores e inversores hibridos"
```

---

### Task 6: Aprimoramento do Componente `BrandTierSelector`

**Files:**

- Modify: `apps/web/src/components/ui/brand-tier-selector.tsx`

**Step 1: Atualizar props de categoria e sugestões inteligentes no seletor**

- Permitir `categoryLabel: "módulos" | "inversores" | "microinversores" | "inversores híbridos"`.
- Implementar `handleAutoSuggest` inteligente por categoria:
  - Microinversores prioriza NEP/SAJ/Deye em Standard, Growatt/Deye/Hoymiles em Elite, GoodWe/Enphase/APsystems em Premium.
  - Híbridos prioriza Deye/Growatt em Standard, GoodWe/Solis em Elite, Huawei/Fronius em Premium.
- Ajustar labels contextuais e mensagens informativas.

**Step 2: Commit**

```bash
git add apps/web/src/components/ui/brand-tier-selector.tsx
git commit -m "feat(web): suporte a microinversores e hibridos com sugestao inteligente em BrandTierSelector"
```

---

### Task 7: Redesign da Página `PerfilIntegradorPage` (Abas & Segmented Hub)

**Files:**

- Modify: `apps/web/src/app/(authenticated)/gestao/perfil-integrador/page.tsx`

**Step 1: Implementar sistema de Abas Principais**

- Aba 1: **Regras Comerciais & kWp**
  - Grid de 2 colunas:
    - Coluna 1: Preço Base por kWp + Presets Rápidos + Simulação ao Vivo de Impacto Comercial (3.5, 7, 15, 40 kWp).
    - Coluna 2: Taxas da Maquininha / Cartão + Simulador ao Vivo de R$ 20.000,00.
- Aba 2: **Catálogo & Preferências de Marcas**
  - Barra de Pílulas Segmentadas:
    - `[ ☀️ Módulos Fotovoltaicos (N) ]`
    - `[ ⚡ Inversores Tradicionais (N) ]`
    - `[ 🔌 Microinversores (N) ]`
    - `[ 🔋 Inversores Híbridos & Armazenamento (N) ]`
  - Alternância fluida com renderização do seletor da tecnologia ativa.
- Estado e hooks para carregar e salvar `microInverterTiers` e `hybridInverterTiers`.
- Botão "Salvar Alterações" no topo e na base com feedback visual moderno.

**Step 2: Verificar comportamento visual e ergonomia**

- Design responsivo para mobile e desktop.
- Ausência de emojis de WhatsApp (seguindo diretrizes do projeto).
- Estilo consistente e moderno.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(authenticated\)/gestao/perfil-integrador/page.tsx
git commit -m "feat(web): redesign do perfil do integrador em abas ergonômicas com suporte a 4 tecnologias"
```

---

### Task 8: Validação Global, Testes Automatizados, Build e Sincronização

**Files:**

- Review: Todos os arquivos alterados
- Update: `docs/plans/task.md`

**Step 1: Executar suíte de testes unitários do backend**
Run: `pnpm --filter @energivia/api test`
Expected: 100% dos testes aprovados

**Step 2: Executar build de produção do backend e frontend**
Run: `pnpm --filter @energivia/api build && pnpm --filter @energivia/web build`
Expected: Compilação com zero erros

**Step 3: Atualizar tracker `docs/plans/task.md`**

**Step 4: Commit e push para `origin/main`**
Run: `git push origin main`
