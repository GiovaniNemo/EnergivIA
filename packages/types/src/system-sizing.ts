import type { TenantId } from "./tenant";
import type { LeadId } from "./lead";
import type { EnergyBillId } from "./energy-bill";

export type SystemSizingId = string;

export interface SystemSizingInput {
  monthlyConsumptionKwh: number;
  roofAreaSqm?: number;
  panelEfficiency?: number;
  location?: { lat: number; lng: number };
  includeBattery?: boolean;
  autonomyHours?: number;
}

export interface SystemSizingResult {
  recommendedPowerKw: number;
  panelCount: number;
  inverterCount: number;
  estimatedProductionKwhMonth: number;
  batteryCapacityKwh?: number;
  batteryCount?: number;
  components?: Array<{ type: string; quantity: number; spec?: string }>;
}

export interface SystemSizingBase {
  tenantId: TenantId;
  leadId: LeadId;
  energyBillId?: EnergyBillId | null;
  input: SystemSizingInput;
  result: SystemSizingResult;
  name?: string;
}

export interface SystemSizing extends SystemSizingBase {
  id: SystemSizingId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
