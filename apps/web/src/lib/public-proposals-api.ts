import type { ProposalTemplateConfig } from "@energivia/shared-types";
import type { FinancialSimulationInputJson, FinancialSimulationResultJson } from "@/lib/leads-api";

function getPublicProposalFetchUrl(id: string): string {
  const cleanId = encodeURIComponent(id.trim());
  if (typeof window !== "undefined") {
    return `/api/proxy/public/proposals/${cleanId}`;
  }
  const apiBase = (process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4000/api").replace(
    /\/$/,
    ""
  );
  return `${apiBase}/public/proposals/${cleanId}`;
}

export interface PublicProposalPayload {
  id: string;
  title: string;
  validUntil: string;
  createdAt: string;
  publicToken?: string | null;
  discountBrl?: number | null;
  companyName?: string | null;
  renderedData?: {
    integrator?: {
      version: number;
      kitItems: Array<{
        productId?: string;
        productName: string;
        brandName?: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        categoryName?: string;
        imageUrl?: string;
        specs?: Record<string, unknown>;
      }>;
      equipmentSubtotalBrl: number;
      quotedSaleBrl: number;
      systemPowerKw?: number;
      projectCostLines?: Array<{
        name: string;
        calculationType: string;
        value: number;
        appliedAmountBrl: number;
        source: string;
      }>;
      computedSaleFromCostRulesBrl?: number;
    };
  } | null;
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
  const url = getPublicProposalFetchUrl(id);
  const res = await fetch(url, {
    method: "GET",
    credentials: "omit",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<PublicProposalPayload>;
}
