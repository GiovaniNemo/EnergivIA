import type { TenantId } from "./tenant";
import type { LeadId } from "./lead";

export type DealId = string;

export type DealStage = "NEW" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export type DealTemperature = "HOT" | "WARM" | "COLD";

export type DealLostReason = "PRICE" | "NO_RESPONSE" | "COMPETITOR" | "NOT_INTERESTED" | "OTHER";

export interface DealBase {
  tenantId: TenantId;
  leadId: LeadId;
  title: string;
  value?: string | null;
  stage: DealStage;
  temperature?: DealTemperature | null;
  lastContactAt?: Date | null;
  nextActionAt?: Date | null;
  nextActionType?: string | null;
  lostReason?: DealLostReason | null;
}

export interface Deal extends DealBase {
  id: DealId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
