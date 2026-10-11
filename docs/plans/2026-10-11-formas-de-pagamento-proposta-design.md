# Design de Funcionalidade: Formas de Pagamento na Proposta Solar (À Vista, Cartão até 12x-21x e Financiamento)

**Data:** 11/10/2026  
**Status:** Aprovado pelo Usuário  
**Referência:** Cockpit da Proposta, Visualização Pública (`/proposta/[token]`) e Exportação PDF (`/api/proposals/[id]/pdf`)

---

## 1. Visão Geral & Problema

Na venda de sistemas fotovoltaicos, as condições de pagamento são o fator decisivo para o fechamento. Atualmente, as propostas do EnergivIA exibiam o valor total do investimento sem uma estrutura interativa e completa para as 3 formas essenciais do mercado solar:

1. **À Vista:** com desconto comercial ou valor integral (Pix, TED, Boleto à vista);
2. **Cartão de Crédito:** parcelado em até 12x (e com flexibilidade para estender até 21x) com taxa/juros reais da maquininha;
3. **Financiamento Solar:** parcelado em prazos longos (ex: 36x até 120x) com parcela real obtida junto aos bancos parceiros (BV, Santander, Solfácil, etc.).

O integrador calcula os juros e parcelas fora da plataforma (na maquininha dele ou no portal do banco parceiro) e precisa informar esses valores reais de forma rápida no cockpit da proposta, com cards profissionais apresentados ao cliente na web pública e no PDF.

---

## 2. Requisitos e Diretrizes

### 2.1. Regras de Negócio & Flexibilidade

- **Zero juros mockados/engessados:** O integrador tem autonomia para digitar o valor exato da parcela ou prazo calculado fora na maquininha ou banco.
- **Toggles por modalidade:** O integrador pode ligar ou desligar qualquer uma das modalidades (À Vista, Cartão de Crédito, Financiamento). Pelo menos 1 deve estar ativa.
- **Cartão de Crédito:** Padrão 12x, com suporte seletor até 21x (12x, 14x, 15x, 18x, 21x) e exibição do total a prazo com encargos.
- **Financiamento:** Prazos bancários comuns (24x, 36x, 48x, 60x, 72x, 84x, 96x, 120x), valor da parcela, entrada opcional (R$) e carência opcional (dias).
- **Padrões da Empresa:** Capacidade de salvar os prazos e condições padrão nas configurações da organização para agilizar a criação de novas propostas.

### 2.2. Diretrizes de Design & UX

- **Sem emojis de WhatsApp:** Uso estrito de ícones vetoriais Lucide (`Wallet`, `CreditCard`, `Landmark`, `CheckCircle2`, `Clock`, etc.).
- **Sem neons ou glows excessivos:** Paleta sóbria, elegante, modo escuro/claro nativo com acabamento de alta fidelidade.
- **Cards Lado a Lado:** Grid responsivo (1 a 3 colunas) tanto na visualização web da proposta quanto no PDF A4 Puppeteer (sem overflow e sem quebras indesejadas de página).

---

## 3. Arquitetura e Modelo de Dados

### 3.1. Tipagem Compartilhada (`@energivia/shared-types` e `@energivia/types`)

```typescript
export interface ProposalPaymentCashOption {
  enabled: boolean;
  discountPct?: number; // Ex: 5 (5% de desconto à vista)
  discountBrl?: number; // Ex: 1000 (R$ 1.000 de desconto)
  finalAmount: number; // Valor líquido à vista
  methods: string[]; // Ex: ["Pix", "Boleto", "TED"]
  notes?: string;
}

export interface ProposalPaymentCardOption {
  enabled: boolean;
  maxInstallments: number; // Padrão 12, até 21
  installmentAmount: number; // Valor real da parcela (calculado fora)
  totalAmount?: number; // Total a prazo com acréscimo
  taxDescription?: string; // Ex: "Taxa da maquininha inclusa"
  notes?: string;
}

export interface ProposalPaymentFinancingOption {
  enabled: boolean;
  installments: number; // Ex: 36, 60, 72, 84, 96, 120
  installmentAmount: number; // Valor real da parcela bancária
  downPaymentBrl?: number; // Entrada opcional (R$)
  graceDays?: number; // Carência em dias (ex: 90 ou 120 dias)
  bankName?: string; // Ex: "BV Financeira", "Santander", etc.
  notes?: string;
}

export interface ProposalPaymentOptions {
  cash: ProposalPaymentCashOption;
  creditCard: ProposalPaymentCardOption;
  financing: ProposalPaymentFinancingOption;
}
```

### 3.2. Persistência

- Salvo em `Proposal.renderedData.paymentOptions` (campo JSON da proposta).
- Não exige migração de banco de dados e mantém total compatibilidade com propostas antigas (fallback automático para geração de defaults).

### 3.3. Endpoints da API

- `PATCH /proposals/:id/payment-options`: Atualiza as opções de pagamento da proposta, valida permissões (integrador/admin), atualiza `renderedData.paymentOptions`, regenera `publicToken` e emite evento de log.
- `GET /organizations/:id/default-payment-options` & `PATCH /organizations/:id/default-payment-options`: Permite persistir os defaults da empresa.

---

## 4. Interfaces e Componentes

### 4.1. Cockpit da Proposta (`proposal-internal-view.tsx`)

- Componente `ProposalPaymentOptionsCard`:
  - Card dedicado com header refinado e 3 seções interativas com switch individual liga/desliga.
  - Seletor de parcelamento do cartão (1x a 21x) com entrada rápida do valor da parcela real e cálculo de total a prazo.
  - Seletor de financiamento (24x a 120x), entrada da parcela, entrada opcional em R$, carência e comparativo em tempo real com a economia na conta de luz.
  - Botões de ação: "Salvar condições de pagamento" e "Salvar como padrão da empresa".

### 4.2. Visualização Pública e PDF (`pricing-section-preview.tsx` / `proposal-payment-cards.tsx`)

- Componente `ProposalPaymentCards`:
  - Grid de 1 a 3 cards balanceados lado a lado.
  - **À Vista:** Valor líquido com destaque, economia informada e badges dos meios aceitos.
  - **Cartão de Crédito:** Número de parcelas e valor da parcela em evidência, total a prazo detalhado e observações.
  - **Financiamento:** Parcela do banco em evidência com badge de economia: _"Sua economia estimada cobre esta parcela"_, com detalhes de entrada e carência.
  - Suporte completo ao tema claro e escuro e estilização para A4 físico (sem quebra de linha de tabelas, sem cortes de margem).

---

## 5. Estratégia de Verificação e Testes

1. **Testes Unitários Backend:**
   - Validação de entrada do DTO de `ProposalPaymentOptions`.
   - Atualização correta de `renderedData.paymentOptions` e rotação de `publicToken`.
2. **Testes de Integração Frontend:**
   - Renderização correta dos cards no cockpit com valores reais.
   - Sincronização em tempo real na tela pública `/proposta/[token]`.
   - Renderização no endpoint Puppeteer de PDF (`/api/proposals/[id]/pdf`).
3. **Validação de Build e Lint:**
   - Garantir 0 erros de linting e compilação de produção sem avisos.
