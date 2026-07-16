import type { ProposalTemplateConfig } from "@energivia/shared-types";
import type { FinancialSimulationInputJson, FinancialSimulationResultJson } from "@/lib/leads-api";

function getPublicApiBase(): string {
  return process.env["NEXT_PUBLIC_API_URL"] ?? "/api";
}

export interface PublicProposalPayload {
  id: string;
  title: string;
  validUntil: string;
  createdAt: string;
  discountBrl?: number | null;
  companyName?: string | null;
  deal: {
    lead: {
      name: string;
    };
  };
  simulation: {
    input: FinancialSimulationInputJson;
    result: FinancialSimulationResultJson;
  };
  proposalTemplate: {
    id: string;
    name: string;
    config: ProposalTemplateConfig;
  } | null;
}

export async function getPublicProposal(id: string): Promise<PublicProposalPayload> {
  const res = await fetch(`${getPublicApiBase()}/public/proposals/${id}`, {
    method: "GET",
    credentials: "omit",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<PublicProposalPayload>;
}
