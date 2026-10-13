# Design: Configuração e Cálculo Automático de Taxas de Maquininha de Cartão de Crédito

**Data:** 13 de Outubro de 2026  
**Status:** Aprovado pelo usuário

---

## 1. Contexto & Problema

Atualmente, ao gerar propostas no EnergivIA, o integrador solar precisa sair do sistema, abrir o aplicativo ou a maquininha física de cartão (Stone, PagBank, InfinitePay, Mercado Pago, Ton, etc.), simular manualmente o valor das parcelas com acréscimo de juros e depois digitar manualmente o "Valor da parcela real (R$)" no card de condições de pagamento da proposta.

Esse fluxo é repetitivo, lento e sujeito a erros de cálculo. Além disso, as taxas e prazos configurados não ficavam gravados como padrão da empresa para as próximas propostas.

---

## 2. Modelagem Financeira & Fórmulas de Cálculo

Nas operadoras e maquininhas de cartão brasileiras, ao repassar a taxa de parcelamento ao comprador (cliente final), utilizam-se dois métodos principais:

### 2.1. Repasse Integral da Taxa da Maquininha (Gross-up — Padrão Recomendado)

A maquininha desconta sua taxa percentual sobre o valor total transacionado na máquina. Para que o integrador receba exatamente o valor à vista líquido da proposta ($V_{base}$), sem perder 1 centavo da sua margem de lucro:

$$V_{total} = \frac{V_{base}}{1 - \left(\frac{\text{taxa}}{100}\right)}$$

$$\text{Parcela} = \frac{V_{total}}{n}$$

_Exemplo:_ Proposta de R$ 20.493,00 com taxa de 10% da maquininha em 12x:

- $V_{total} = \frac{20.493,00}{1 - 0,10} = \text{R\$\ } 22.770,00$
- $\text{Parcela} = \frac{22.770,00}{12} = \text{R\$\ } 1.897,50$
- Ao passar na maquininha, a operadora retém 10% (R$ 2.277,00) e liquida exatamente R$ 20.493,00 na conta do integrador.

### 2.2. Juros ao Mês (Tabela Price)

Quando a maquininha do integrador trabalha com juros compostos mensais informados (ex: 1,49% ao mês):

$$\text{Parcela} = V_{base} \times \left[ \frac{i}{1 - (1 + i)^{-n}} \right]$$

$$V_{total} = \text{Parcela} \times n$$

onde $i = \frac{\text{taxaMensal}}{100}$ e $n$ é o número de parcelas.

### 2.3. Modo Manual (R$)

Permite que o integrador continue digitando diretamente o valor da parcela em reais, caso prefira conferir ou digitar o valor exato da tela da maquininha.

---

## 3. Arquitetura de Dados & Retrocompatibilidade

### 3.1. Shared Types (`@energivia/shared-types`)

Na interface `ProposalPaymentCardOption`:

```typescript
export type CardRateMode = "total_pct" | "monthly_pct" | "manual";

export interface ProposalPaymentCardOption {
  enabled: boolean;
  maxInstallments: number; // 1 a 21
  installmentAmount: number;
  totalAmount?: number | null;
  taxDescription?: string | null;
  notes?: string | null;
  rateMode?: CardRateMode; // "total_pct" | "monthly_pct" | "manual"
  rateValue?: number | null; // ex: 10 para 10% ou 1.49 para 1.49% a.m.
  saveAsDefault?: boolean; // flag de conveniência no salvamento
}
```

### 3.2. Configurações da Organização (`Tenant.settings`)

Em `Tenant.settings.cardPaymentDefaults`:

```typescript
export interface OrganizationCardPaymentDefaults {
  maxInstallments: number; // default: 12
  rateMode: CardRateMode; // default: "total_pct"
  rateValue: number; // default: 10
  taxDescription: string; // default: "Taxa de parcelamento inclusa"
}
```

---

## 4. Experiência do Usuário (UI/UX)

### 4.1. Card de Condições de Pagamento da Proposta (`ProposalPaymentOptionsCard`)

- Adição de seletor visual de modo de taxa:
  - Botões segmentados: `[% Total]` (Gross-up), `[% a.m.]` (Juros Price), `[R$ Manual]`.
- Input de taxa em `%`:
  - Atalhos rápidos de clique (ex: `8%`, `10%`, `12%`, `15%`).
  - Ao digitar ou alterar parcelas (1x a 21x), a parcela e o total são recalculados instantaneamente.
- Checkbox de fixação padrão:
  - `☑️ Salvar essas taxas como padrão da empresa para novas propostas`
  - Ao clicar em "Salvar condições", salva a proposta e atualiza as preferências da organização.

### 4.2. Gestão > Perfil do Integrador (`/gestao/perfil-integrador`)

- Card dedicado: **Taxas Padrão de Maquininha / Cartão de Crédito**.
- Permite configurar previamente o prazo máximo (ex: 12x), a taxa padrão em % e a nota descritiva para que novas propostas já nasçam configuradas.

---

## 5. Validação & Testes

- Testes unitários para as fórmulas matemáticas em `@energivia/utils` ou `proposal-payment-utils.spec.ts`.
- Validação de que propostas sem `rateMode` ou com valores legados continuam normalizando perfeitamente sem quebras.
- ESLint e suite de testes executados sem erros.
