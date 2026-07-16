import type { TenantId } from "./tenant";
import type { LeadId } from "./lead";

export type EnergyBillId = string;

export type UtilityProvider = "COPEL" | "OTHER";

export interface EnergyBillExtractedData {
  consumerNumber?: string;
  referenceMonth: string;
  consumptionKwh: number;
  demandKw?: number;
  totalAmount: number;
  tariffGroup?: string;
  peakConsumption?: number;
  offPeakConsumption?: number;
  rawData?: Record<string, unknown>;
}

export interface EnergyBillBase {
  tenantId: TenantId;
  leadId: LeadId;
  provider: UtilityProvider;
  fileUrl: string;
  fileName: string;
  extractedData?: EnergyBillExtractedData | null;
  extractionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  extractionError?: string | null;
}

export interface EnergyBill extends EnergyBillBase {
  id: EnergyBillId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
