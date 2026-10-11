# Design: Evolução da Seção de Formas de Pagamento nos Templates de Proposta

## Contexto & Motivação

Na implementação anterior, o componente `ProposalPaymentCards` (À Vista, Cartão de Crédito e Financiamento Solar) foi renderizado embutido no rodapé da seção de Preços (`pricing-section-preview.tsx`). Isso gerava dois problemas:

1. **Posicionamento Rígido e Inadequado ("local aleatório"):** O integrador não podia escolher a ordem, nem decidir em qual página colocar as formas de pagamento, aparecendo colado abaixo da tabela de preços.
2. **Duplicidade e Disparidade com a Seção Antiga de Financiamento:** Nos templates de proposta já existia um tipo de seção `financing` cadastrado, mas sua renderização era rudimentar (um par de caixas simples com "Parcela" e "Prazo"), sem suporte a cartão de crédito, à vista ou dados detalhados.

## Objetivos do Design

1. **Desacoplar de `PricingSectionPreview`:** A seção de preços volta a ser responsável exclusivamente pelo investimento, kits/tiers e linhas de desconto.
2. **Evoluir a Seção `financing` para "Condições & Formas de Pagamento":**
   - No catálogo de seções e editor de templates, renomear de "Financiamento" para "Condições & Formas de Pagamento" (ou "Formas de Pagamento").
   - Atualizar descrições, metadados e campos configuráveis (título, descrição, etc.).
   - No motor de renderização `section-registry.tsx`, o caso `case "financing":` renderiza diretamente o `ProposalPaymentCards` de alta fidelidade com os dados reais de `paymentOptions` da proposta (e fallback inteligente com simulação para o editor de templates).
3. **Controle Total no Template Builder:**
   - O integrador pode ativar/desativar a seção de pagamento quando desejar.
   - O integrador pode arrastar a seção para a posição desejada no documento (ex: página dedicada, antes ou depois do investimento).
4. **Preservar Compatibilidade:**
   - Templates existentes com `type === "financing"` passam a renderizar imediatamente a nova interface rica e elegante, sem quebras de banco de dados ou schemas legados.
5. **PDF A4:**
   - Como seção independente, a quebra de página A4 é tratada individualmente pelo orquestrador de impressão, sem cortes ou sobreposição na folha de preços.

## Arquitetura & Componentes

### 1. `apps/web/src/components/proposals/sections/pricing/pricing-section-preview.tsx`

- Remover o bloco `<ProposalPaymentCards ... />` e imports associados.
- Manter apenas a tabela de preços, tiers, itens de escopo e notas comerciais.

### 2. `apps/web/src/components/proposals/editor/section-fields.ts` & `AddSectionModal.tsx`

- Atualizar rótulo `SECTION_TYPE_LABELS.financing` para `"Condições & Formas de Pagamento"`.
- Atualizar descrição e metadados no modal de adição de seções.
- Garantir que campos base (`title`, `text`) sejam propagados para o componente.

### 3. `apps/web/src/components/proposals/editor/section-render/section-registry.tsx`

- Atualizar o bloco `case "financing":`:
  ```tsx
  case "financing": {
    return (
      <ProposalPaymentCards
        paymentOptions={options?.paymentOptions}
        investment={Number(vars.investimento_total || vars.investimento_com_desconto || 0)}
        monthlySavings={Number(vars.economia_mensal || 0)}
        mode={options?.mode}
        sectionTitle={f.title ? tpl(f.title, vars) : undefined}
        sectionDescription={f.text ? tpl(f.text, vars) : undefined}
      />
    );
  }
  ```
- Atualizar `ProposalPaymentCards` para aceitar `sectionTitle` e `sectionDescription` customizados do template.

### 4. Validação & Testes

- Testes unitários para garantir renderização correta tanto em modo web quanto em modo PDF.
- Verificação de build de produção (`pnpm build`).
- Verificação de linting e ausência de regressões.
