export interface ProposalPaymentCashOption {
  enabled: boolean;
  discountPct?: number | null;
  discountBrl?: number | null;
  finalAmount: number;
  methods?: string[];
  notes?: string | null;
}

export interface ProposalPaymentCardOption {
  enabled: boolean;
  maxInstallments: number; // 1 to 21
  installmentAmount: number;
  totalAmount?: number | null;
  taxDescription?: string | null;
  notes?: string | null;
}

export interface ProposalPaymentFinancingOption {
  enabled: boolean;
  installments: number; // e.g. 24, 36, 48, 60, 72, 84, 96, 120
  installmentAmount: number;
  downPaymentBrl?: number | null;
  graceDays?: number | null;
  bankName?: string | null;
  notes?: string | null;
}

export interface ProposalPaymentOptions {
  cash: ProposalPaymentCashOption;
  creditCard: ProposalPaymentCardOption;
  financing: ProposalPaymentFinancingOption;
}

export function isProposalPaymentOptions(v: unknown): v is ProposalPaymentOptions {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<ProposalPaymentOptions>;
  return (
    typeof o.cash === "object" &&
    o.cash !== null &&
    typeof o.cash.enabled === "boolean" &&
    typeof o.creditCard === "object" &&
    o.creditCard !== null &&
    typeof o.creditCard.enabled === "boolean" &&
    typeof o.financing === "object" &&
    o.financing !== null &&
    typeof o.financing.enabled === "boolean"
  );
}
