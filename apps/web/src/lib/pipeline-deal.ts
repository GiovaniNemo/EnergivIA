export type DealStage = "novo" | "contato" | "proposta" | "negociacao" | "fechado";
export type ClosedDealStatus = "won" | "lost" | "disqualified" | "postponed" | "cancelled";

export type Deal = {
  id: string;
  leadId: string;
  dealId: string | null;
  clientName: string;
  contact: string;
  whatsapp: string | null;
  dealName?: string;
  stage: DealStage;
  status?: ClosedDealStatus;
  order: number;
  value: number;
  nextStepDate: Date | null;
  recentAt: Date;
  hasProposal: boolean;
  latestProposalId?: string | null;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  originFromSimulation?: boolean;
  proposalFollowUpStatus?: "none" | "sent" | "viewed" | "waiting";
};
