import { listLeads, listProposals } from "./leads-api";

export interface GlobalSearchLeadItem {
  id: string;
  name: string;
  whatsapp: string;
  email?: string | null;
  company?: string | null;
  cpfCnpj?: string | null;
  latestDealStage?: string | null;
  latestDealValue?: string | null;
  latestDealId?: string | null;
  latestDealTitle?: string | null;
  latestDealProposalCount?: number;
  updatedAt?: string;
}

export interface GlobalSearchProposalItem {
  id: string;
  proposalNumber?: number | null;
  title: string;
  status: string;
  validUntil?: string | null;
  quotedValueBrl?: number | null;
  createdAt?: string;
  deal?: {
    id: string;
    title: string;
    stage: string;
    lead?: {
      id: string;
      name: string;
      whatsapp: string;
    };
  };
}

export interface GlobalSearchDealItem {
  id: string;
  title: string;
  stage: string;
  value?: string | null;
  temperature?: string | null;
  updatedAt?: string;
  lead?: {
    id: string;
    name: string;
    whatsapp: string;
    company?: string | null;
  };
}

export interface GlobalSearchResults {
  leads: GlobalSearchLeadItem[];
  proposals: GlobalSearchProposalItem[];
  deals: GlobalSearchDealItem[];
}

export async function fetchGlobalSearch(
  organizationId: string,
  query: string
): Promise<GlobalSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { leads: [], proposals: [], deals: [] };
  }

  try {
    const res = await fetch(`/api/proxy/search?q=${encodeURIComponent(trimmed)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      return {
        leads: Array.isArray(data?.leads) ? data.leads : [],
        proposals: Array.isArray(data?.proposals) ? data.proposals : [],
        deals: Array.isArray(data?.deals) ? data.deals : [],
      };
    }
  } catch {
    // Graceful fallback to individual endpoints
  }

  // Fallback: parallel fetch from leads and proposals
  try {
    const [leadsRes, proposalsRes] = await Promise.allSettled([
      listLeads(organizationId, { page: 1, pageSize: 6, search: trimmed }),
      listProposals(organizationId, { search: trimmed }),
    ]);

    const leads: GlobalSearchLeadItem[] =
      leadsRes.status === "fulfilled"
        ? leadsRes.value.data.map((l) => ({
            id: l.id,
            name: l.name,
            whatsapp: l.whatsapp,
            email: l.email,
            company: l.company,
            cpfCnpj: l.cpfCnpj,
            latestDealStage: l.latestDealStage,
            latestDealValue: l.latestDealValue,
            latestDealId: l.latestDealId,
            latestDealProposalCount: l.latestDealProposalCount,
            updatedAt: l.updatedAt,
          }))
        : [];

    const proposals: GlobalSearchProposalItem[] =
      proposalsRes.status === "fulfilled"
        ? proposalsRes.value.slice(0, 6).map((p) => ({
            id: p.id,
            proposalNumber: p.proposalNumber,
            title: p.title,
            status: p.status,
            validUntil: p.validUntil,
            quotedValueBrl: p.quotedValueBrl,
            createdAt: p.createdAt,
            deal: p.deal
              ? {
                  id: p.deal.id,
                  title: p.deal.title,
                  stage: p.deal.stage,
                  lead: p.deal.lead,
                }
              : undefined,
          }))
        : [];

    return { leads, proposals, deals: [] };
  } catch {
    return { leads: [], proposals: [], deals: [] };
  }
}
