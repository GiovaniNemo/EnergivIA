import type { TenantId } from "./tenant";
import type { DealId } from "./deal";
import type { SimulationId } from "./simulation";

export type ProposalId = string;

export type ProposalStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED";

export interface ProposalBase {
  tenantId: TenantId;
  dealId: DealId;
  simulationId: SimulationId;
  title: string;
  status: ProposalStatus;
  validUntil: Date;
  pdfUrl?: string | null;
  sentAt?: Date | null;
}

export interface Proposal extends ProposalBase {
  id: ProposalId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
