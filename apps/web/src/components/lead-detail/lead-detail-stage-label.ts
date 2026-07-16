import type { DealWithProposals } from "@/lib/leads-api";

export function headerStageLabel(deal: DealWithProposals): string | undefined {
  if (deal.stage === "WON" || deal.stage === "LOST") return undefined;
  const sent = deal.proposals.some((p) => Boolean(p.sentAt) || p.status === "SENT");
  return sent && deal.stage === "PROPOSAL" ? "Proposta enviada" : undefined;
}
