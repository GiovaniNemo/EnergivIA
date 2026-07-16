import type {
  FinancingApplicationStatus,
  FinancingOfferEligibility,
  FinancingPersonType,
  FinancingProvider,
} from "@prisma/client";

export interface AdapterSimulationInput {
  personType: FinancingPersonType;
  cpfCnpj?: string | null;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  projectAmount: number;
  downPayment: number;
  financedAmount: number;
  requestedTerm: number;
  effectiveApiConfig?: Record<string, unknown> | null;
}

export interface AdapterOffer {
  rateTableId?: string | null;
  financedAmount: number;
  term: number;
  monthlyRate: number;
  cet: number;
  installmentValue: number;
  totalAmount: number;
  eligibilityStatus: FinancingOfferEligibility;
  notes?: string | null;
  rawResponse?: Record<string, unknown> | null;
}

export type AdapterSimulationResult =
  | { ok: true; offers: AdapterOffer[] }
  | { ok: false; reason: string };

export interface AdapterApplicationInput {
  applicationId: string;
  externalReference?: string | null;
  offer: AdapterOffer;
  customer: {
    name: string;
    cpfCnpj?: string | null;
    email?: string | null;
    phone?: string | null;
    personType: FinancingPersonType;
  };
}

export interface AdapterApplicationStatusResult {
  status: FinancingApplicationStatus;
  externalReference?: string | null;
  approvedAmount?: number | null;
  approvedTerm?: number | null;
  approvedRate?: number | null;
  approvedCet?: number | null;
  notes?: string | null;
}

export interface FinancingProviderAdapter {
  mode: FinancingProvider["mode"];

  simulate(
    provider: FinancingProvider,
    input: AdapterSimulationInput,
    tenantId?: string | null
  ): Promise<AdapterSimulationResult>;

  submitApplication(
    provider: FinancingProvider,
    input: AdapterApplicationInput
  ): Promise<{ externalReference: string | null; status: FinancingApplicationStatus }>;

  getApplicationStatus(
    provider: FinancingProvider,
    externalReference: string
  ): Promise<AdapterApplicationStatusResult>;
}
