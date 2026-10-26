# Design Doc: Templates de Proposta Comercial para Sistemas Híbridos e Off-Grid

**Data:** 26 de Outubro de 2026  
**Status:** Aprovado  
**Objetivo:** Permitir a criação e edição de templates com seções e cards específicos para inversores Híbridos/Off-Grid e bancos de bateria (BESS), identificando-os visualmente com selo de exclusividade no editor web e priorizando-os no bot do WhatsApp via filtragem inteligente e cancelamento com riscado (`~...~`) de templates incompatíveis.

---

## 1. Contexto & Motivação

Atualmente, propostas de energia solar comercial são predominantemente desenhadas para sistemas On-Grid (módulos fotovoltaicos e inversores string/microinversores conectados à rede da concessionária). Ao cotar sistemas híbridos com armazenamento de energia por baterias:

1. Não haviam cards no editor de templates para exibir informações críticas de baterias (capacidade kWh, tensão nominal, modo de backup EPS e autonomia).
2. No editor, o integrador não tinha uma indicação visual clara de quais blocos eram exclusivos de sistemas híbridos ou off-grid.
3. No WhatsApp, durante o fechamento de cotações de sistemas híbridos, todos os templates eram listados indiferenciadamente, permitindo a seleção de modelos puramente On-Grid sem dados de baterias.

---

## 2. Requisitos

### 2.1 Editor Web (Propostas)

- **Seção e Cards Dedicados:** Adicionar a seção `storage_backup` (_Armazenamento & Backup (BESS)_) e suportar cards de baterias no editor.
- **Badge de Exclusividade:** Indicar com destaque visual limpo e elegante (`⚡ Exclusivo Híbrido / Off-Grid`) tanto no catálogo de seções ([AddSectionModal.tsx](file:///c:/Users/Edeltec/EnergivIA/apps/web/src/components/proposals/editor/AddSectionModal.tsx)), nos itens de equipamentos editáveis ([renderers.tsx](file:///c:/Users/Edeltec/EnergivIA/apps/web/src/components/proposals/editor/field-renderers/renderers.tsx)) quanto na renderização visual do card ([section-registry.tsx](file:///c:/Users/Edeltec/EnergivIA/apps/web/src/components/proposals/editor/section-render/section-registry.tsx)).
- **Variáveis Dinâmicas de Bateria:** Expor variáveis como `{{bateria_sistema}}`, `{{capacidade_bateria_kwh}}`, `{{quantidade_baterias}}`, `{{modo_backup}}` e `{{autonomia_estimada_horas}}`.

### 2.2 WhatsApp Bot (API)

- **Identificação de Híbridos:** Durante o fluxo de cotação via WhatsApp, se o tipo de inversor for híbrido (`sessionCtx.inverterType === "hybrid"`) ou possuir capacidade/quantidade de baterias preenchida:
  - Recuperar os templates do integrador e analisar sua compatibilidade híbrida (via seção `storage_backup`, linhas de equipamento `battery` ou palavras-chave no nome do template).
- **Riscado de Modelos On-Grid:**
  - Se o integrador possuir templates híbridos:
    - Listar os templates híbridos como opções ativas e numeradas.
    - Riscar os modelos puramente On-Grid com a sintaxe oficial do WhatsApp (`~Opção On-Grid (Exclusivo On-Grid / Sem Bateria)~`).
    - Impedir a seleção de templates riscados, orientando a escolha da opção compatível.
  - Se o integrador não possuir templates híbridos criados:
    - Oferecer o Blueprint oficial da plataforma (_Modelo Híbrido & Backup Solar_), garantindo que o PDF e a proposta gerada contenham as informações corretas.

---

## 3. Arquitetura Detalhada

### 3.1 Frontend: Seções & Cards de Bateria

- **Novo SectionType:** `"storage_backup"` em `types.ts`, `section-fields.ts` e `AddSectionModal.tsx`.
- **Badge Exclusivo:** Componente ou marcação visual:
  ```tsx
  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
    ⚡ Exclusivo Híbrido / Off-Grid
  </span>
  ```
- **Equipamentos Híbridos em `section-registry.tsx`:** No `renderProposalEquipmentCards`, se o item for de categoria `battery`, `bms`, `hybrid_inverter` ou `off_grid_inverter`, incluir badge de exclusividade no cabeçalho do card.
- **Variáveis em `public-proposal-variables.ts`:**
  - Conectar kitItems e simulation sizing:
    - `bateria_sistema`: nome e marca da bateria.
    - `capacidade_bateria_kwh`: capacidade acumulada (kWh).
    - `quantidade_baterias`: número de baterias do kit.
    - `modo_backup`: modo EPS / no-break.

### 3.2 Backend: WhatsApp Template Filtering & Strikethrough

- Em `whatsapp-bot.service.ts`:
  - Método `getAvailableTemplates(tenantId, options?: { isHybrid?: boolean })`:
    - Carrega templates da organização e blueprint.
    - Classifica cada template com `isHybridCompatible`.
    - Formata o texto de opções:
      - Templates compatíveis recebem emoji numérico (`1️⃣`, `2️⃣`, etc.) e rótulo ativo.
      - Templates incompatíveis recebem formatação riscada: `~{nome} (Incompatível com Baterias)~` e não são selecionáveis.
    - Se o usuário digitar o índice de uma opção riscada, o bot intercepta e explica:
      `O modelo selecionado foi projetado para sistemas On-Grid e não possui exibição de baterias. Para este sistema híbrido, utilize o modelo: ...`

---

## 4. Plano de Verificação e Testes

1. **Testes Unitários no Frontend:**
   - Teste em `public-proposal-variables.spec.ts` validando injeção correta de `bateria_sistema`, `capacidade_bateria_kwh` e `quantidade_baterias`.
2. **Testes Unitários no Backend:**
   - Teste em `whatsapp-bot.service.spec.ts` validando a formatação riscada de templates on-grid e seleção prioritária de templates híbridos quando `sessionCtx.inverterType === "hybrid"`.
3. **Build & Lint:**
   - `pnpm --filter @energivia/api build`
   - `pnpm --filter @energivia/web lint`
