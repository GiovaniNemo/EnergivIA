import type {
  ProposalPaymentOptions,
  ProposalPaymentCashOption,
  ProposalPaymentCardOption,
  ProposalPaymentFinancingOption,
  CardRateMode,
  OrganizationCardPaymentDefaults,
} from "@energivia/shared-types";

export interface CalculateCardInstallmentsInput {
  totalInvestment: number;
  installments: number;
  rateMode?: CardRateMode;
  rateValue?: number | null;
  manualInstallmentAmount?: number | null;
}

export interface CalculateCardInstallmentsResult {
  installmentAmount: number;
  totalAmount: number;
  totalInterestAmount: number;
  effectiveRatePct: number;
}

export function calculateCardInstallments(
  input: CalculateCardInstallmentsInput
): CalculateCardInstallmentsResult {
  const {
    totalInvestment,
    installments,
    rateMode = "total_pct",
    rateValue,
    manualInstallmentAmount,
  } = input;
  const safeInvestment =
    Number.isFinite(totalInvestment) && totalInvestment > 0 ? totalInvestment : 0;
  const safeInstallments = Math.max(1, Math.min(24, Math.round(installments || 1)));

  if (safeInvestment <= 0) {
    return {
      installmentAmount: 0,
      totalAmount: 0,
      totalInterestAmount: 0,
      effectiveRatePct: 0,
    };
  }

  if (rateMode === "manual") {
    const manualAmt =
      typeof manualInstallmentAmount === "number" && manualInstallmentAmount > 0
        ? Math.round(manualInstallmentAmount * 100) / 100
        : Math.round((safeInvestment / safeInstallments) * 100) / 100;
    const totalAmt = Math.round(manualAmt * safeInstallments * 100) / 100;
    const interest = Math.max(0, Math.round((totalAmt - safeInvestment) * 100) / 100);
    return {
      installmentAmount: manualAmt,
      totalAmount: totalAmt,
      totalInterestAmount: interest,
      effectiveRatePct: 0,
    };
  }

  const numericRate = typeof rateValue === "number" && !isNaN(rateValue) ? rateValue : 0;

  if (rateMode === "monthly_pct") {
    if (numericRate <= 0) {
      const baseAmt = Math.round((safeInvestment / safeInstallments) * 100) / 100;
      const totalAmt = Math.round(baseAmt * safeInstallments * 100) / 100;
      return {
        installmentAmount: baseAmt,
        totalAmount: totalAmt,
        totalInterestAmount: 0,
        effectiveRatePct: 0,
      };
    }

    const i = numericRate / 100;
    const factor = i / (1 - Math.pow(1 + i, -safeInstallments));
    const instAmt = Math.round(safeInvestment * factor * 100) / 100;
    const totalAmt = Math.round(instAmt * safeInstallments * 100) / 100;
    const interest = Math.max(0, Math.round((totalAmt - safeInvestment) * 100) / 100);

    return {
      installmentAmount: instAmt,
      totalAmount: totalAmt,
      totalInterestAmount: interest,
      effectiveRatePct: numericRate,
    };
  }

  // Padrão: "total_pct" (Gross-up de maquininha)
  if (numericRate <= 0) {
    const baseAmt = Math.round((safeInvestment / safeInstallments) * 100) / 100;
    const totalAmt = Math.round(baseAmt * safeInstallments * 100) / 100;
    return {
      installmentAmount: baseAmt,
      totalAmount: totalAmt,
      totalInterestAmount: 0,
      effectiveRatePct: 0,
    };
  }

  const cappedRate = Math.min(99.9, numericRate);
  const grossUpTotal = Math.round((safeInvestment / (1 - cappedRate / 100)) * 100) / 100;
  const instAmt = Math.round((grossUpTotal / safeInstallments) * 100) / 100;
  const finalTotal = Math.round(instAmt * safeInstallments * 100) / 100;
  const interest = Math.max(0, Math.round((finalTotal - safeInvestment) * 100) / 100);

  return {
    installmentAmount: instAmt,
    totalAmount: finalTotal,
    totalInterestAmount: interest,
    effectiveRatePct: numericRate,
  };
}

export function calculateCashFinalAmount(
  totalInvestment: number,
  discountBrl?: number | null,
  discountPct?: number | null
): number {
  if (!Number.isFinite(totalInvestment) || totalInvestment <= 0) return 0;

  if (typeof discountBrl === "number" && discountBrl > 0) {
    return Math.max(0, Math.round((totalInvestment - discountBrl) * 100) / 100);
  }

  if (typeof discountPct === "number" && discountPct > 0) {
    const discountValue = (totalInvestment * discountPct) / 100;
    return Math.max(0, Math.round((totalInvestment - discountValue) * 100) / 100);
  }

  return Math.round(totalInvestment * 100) / 100;
}

export function getDefaultPaymentOptions(
  totalInvestment: number,
  defaults?: OrganizationCardPaymentDefaults | null
): ProposalPaymentOptions {
  const safeInvestment =
    Number.isFinite(totalInvestment) && totalInvestment > 0 ? totalInvestment : 0;

  // À Vista default
  const cash: ProposalPaymentCashOption = {
    enabled: true,
    discountPct: 0,
    discountBrl: 0,
    finalAmount: safeInvestment,
    methods: ["Pix", "Boleto", "TED"],
    notes: null,
  };

  // Cartão 12x default com cálculo de maquininha
  const cardInstallments = defaults?.maxInstallments || 12;
  const cardRateMode: CardRateMode = defaults?.rateMode || "total_pct";
  const cardRateValue = typeof defaults?.rateValue === "number" ? defaults.rateValue : 10;
  const cardTaxDesc = defaults?.taxDescription || "Taxa de parcelamento inclusa";

  const cardCalc = calculateCardInstallments({
    totalInvestment: safeInvestment,
    installments: cardInstallments,
    rateMode: cardRateMode,
    rateValue: cardRateValue,
  });

  const creditCard: ProposalPaymentCardOption = {
    enabled: true,
    maxInstallments: cardInstallments,
    installmentAmount: cardCalc.installmentAmount,
    totalAmount: cardCalc.totalAmount,
    taxDescription: cardTaxDesc,
    rateMode: cardRateMode,
    rateValue: cardRateValue,
    notes: null,
  };

  // Financiamento default (84x comum no mercado solar)
  const financingInstallments = 84;
  const financingInstallmentAmount =
    financingInstallments > 0
      ? Math.round(((safeInvestment * 1.35) / financingInstallments) * 100) / 100
      : 0;
  const financing: ProposalPaymentFinancingOption = {
    enabled: true,
    installments: financingInstallments,
    installmentAmount: financingInstallmentAmount,
    downPaymentBrl: 0,
    graceDays: 90,
    bankName: "Banco Parceiro Solar",
    notes: null,
  };

  return {
    cash,
    creditCard,
    financing,
  };
}

export function normalizePaymentOptions(
  raw: unknown,
  totalInvestment: number,
  defaults?: OrganizationCardPaymentDefaults | null
): ProposalPaymentOptions {
  const fallback = getDefaultPaymentOptions(totalInvestment, defaults);

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const obj = raw as Record<string, unknown>;
  const rawCash = (
    typeof obj["cash"] === "object" && obj["cash"] !== null ? obj["cash"] : {}
  ) as Record<string, unknown>;
  const rawCard = (
    typeof obj["creditCard"] === "object" && obj["creditCard"] !== null ? obj["creditCard"] : {}
  ) as Record<string, unknown>;
  const rawFinancing = (
    typeof obj["financing"] === "object" && obj["financing"] !== null ? obj["financing"] : {}
  ) as Record<string, unknown>;

  const cashEnabled =
    typeof rawCash["enabled"] === "boolean" ? rawCash["enabled"] : fallback.cash.enabled;
  const cashDiscountBrl =
    typeof rawCash["discountBrl"] === "number" ? rawCash["discountBrl"] : null;
  const cashDiscountPct =
    typeof rawCash["discountPct"] === "number" ? rawCash["discountPct"] : null;
  const cashFinal =
    typeof rawCash["finalAmount"] === "number" && rawCash["finalAmount"] > 0
      ? rawCash["finalAmount"]
      : calculateCashFinalAmount(totalInvestment, cashDiscountBrl, cashDiscountPct);

  const cash: ProposalPaymentCashOption = {
    enabled: cashEnabled,
    discountBrl: cashDiscountBrl,
    discountPct: cashDiscountPct,
    finalAmount: cashFinal,
    methods: Array.isArray(rawCash["methods"])
      ? (rawCash["methods"] as string[])
      : fallback.cash.methods,
    notes: typeof rawCash["notes"] === "string" ? rawCash["notes"] : null,
  };

  const cardEnabled =
    typeof rawCard["enabled"] === "boolean" ? rawCard["enabled"] : fallback.creditCard.enabled;
  const maxInst =
    typeof rawCard["maxInstallments"] === "number" && rawCard["maxInstallments"] > 0
      ? Math.min(24, Math.max(1, rawCard["maxInstallments"]))
      : fallback.creditCard.maxInstallments;

  const cardRateMode: CardRateMode =
    rawCard["rateMode"] === "monthly_pct" ||
    rawCard["rateMode"] === "manual" ||
    rawCard["rateMode"] === "total_pct"
      ? (rawCard["rateMode"] as CardRateMode)
      : (fallback.creditCard.rateMode ?? "total_pct");

  const cardRateValue =
    typeof rawCard["rateValue"] === "number"
      ? rawCard["rateValue"]
      : (fallback.creditCard.rateValue ?? 10);

  const cardInstAmt =
    typeof rawCard["installmentAmount"] === "number" && rawCard["installmentAmount"] > 0
      ? rawCard["installmentAmount"]
      : calculateCardInstallments({
          totalInvestment,
          installments: maxInst,
          rateMode: cardRateMode,
          rateValue: cardRateValue,
        }).installmentAmount;

  const cardTotal =
    typeof rawCard["totalAmount"] === "number" && rawCard["totalAmount"] > 0
      ? rawCard["totalAmount"]
      : Math.round(cardInstAmt * maxInst * 100) / 100;

  const creditCard: ProposalPaymentCardOption = {
    enabled: cardEnabled,
    maxInstallments: maxInst,
    installmentAmount: cardInstAmt,
    totalAmount: cardTotal,
    taxDescription:
      typeof rawCard["taxDescription"] === "string"
        ? rawCard["taxDescription"]
        : fallback.creditCard.taxDescription,
    rateMode: cardRateMode,
    rateValue: cardRateValue,
    notes: typeof rawCard["notes"] === "string" ? rawCard["notes"] : null,
  };

  const finEnabled =
    typeof rawFinancing["enabled"] === "boolean"
      ? rawFinancing["enabled"]
      : fallback.financing.enabled;
  const finInst =
    typeof rawFinancing["installments"] === "number" && rawFinancing["installments"] > 0
      ? rawFinancing["installments"]
      : fallback.financing.installments;
  const finInstAmt =
    typeof rawFinancing["installmentAmount"] === "number" && rawFinancing["installmentAmount"] > 0
      ? rawFinancing["installmentAmount"]
      : fallback.financing.installmentAmount;

  const financing: ProposalPaymentFinancingOption = {
    enabled: finEnabled,
    installments: finInst,
    installmentAmount: finInstAmt,
    downPaymentBrl:
      typeof rawFinancing["downPaymentBrl"] === "number" ? rawFinancing["downPaymentBrl"] : 0,
    graceDays:
      typeof rawFinancing["graceDays"] === "number"
        ? rawFinancing["graceDays"]
        : fallback.financing.graceDays,
    bankName:
      typeof rawFinancing["bankName"] === "string"
        ? rawFinancing["bankName"]
        : fallback.financing.bankName,
    notes: typeof rawFinancing["notes"] === "string" ? rawFinancing["notes"] : null,
  };

  return {
    cash,
    creditCard,
    financing,
  };
}
