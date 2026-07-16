import type { TenantId } from "./tenant";
import type { LeadId } from "./lead";

export type SimulationId = string;

export interface FinancialSimulationInput {
  systemSizeKw: number;
  investmentAmount: number;
  financingType: "CASH" | "FINANCED";
  interestRate?: number;
  installments?: number;
  energyPriceKwh?: number;
  annualIncreasePercent?: number;
}

export interface FinancialSimulationResult {
  paybackYears: number;
  totalSavings25y: number;
  monthlySavings: number;
  irr?: number;
  npv?: number;
  annualSavings: number[];
}

export interface SimulationBase {
  tenantId: TenantId;
  leadId: LeadId;
  input: FinancialSimulationInput;
  result: FinancialSimulationResult;
  name?: string;
}

export interface Simulation extends SimulationBase {
  id: SimulationId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
