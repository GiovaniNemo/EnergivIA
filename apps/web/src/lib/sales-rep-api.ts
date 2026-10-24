export interface SalesRepSummary {
  totalTenants: number;
  trialTenants: number;
  activeTenants: number;
  totalProposals: number;
  commissionRate: number;
  estimatedCommission: number;
  referralCode: string;
  referralLink: string;
}

export interface SalesRepTenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  subscriptionPlan: string;
  salesRepId: string | null;
  referralCode: string | null;
  isTrial: boolean;
  trialDaysLeft: number;
  hasActiveSubscription: boolean;
  proposalsCount: number;
  billsCount: number;
  hasWhatsappConnected: boolean;
  primaryContact: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
  lastNote: {
    id: string;
    content: string;
    stage: string;
    createdAt: string;
  } | null;
}

export interface SalesActivityNote {
  id: string;
  tenantId: string;
  salesRepId: string;
  content: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
  salesRep?: {
    id: string;
    name: string;
    email: string;
  };
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Erro na requisição (${res.status})`);
  }

  return res.json();
}

export async function getSalesRepSummary(): Promise<SalesRepSummary> {
  return apiRequest<SalesRepSummary>("/sales-rep/summary");
}

export async function getSalesRepReferralLink(): Promise<{
  referralCode: string;
  referralLink: string;
}> {
  return apiRequest<{ referralCode: string; referralLink: string }>("/sales-rep/referral-link");
}

export async function listSalesRepTenants(
  filter?: "all" | "trial" | "active" | "churn_risk",
  search?: string
): Promise<SalesRepTenant[]> {
  const params = new URLSearchParams();
  if (filter && filter !== "all") params.set("filter", filter);
  if (search?.trim()) params.set("search", search.trim());
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<SalesRepTenant[]>(`/sales-rep/tenants${query}`);
}

export async function listSalesRepNotes(tenantId: string): Promise<SalesActivityNote[]> {
  return apiRequest<SalesActivityNote[]>(`/sales-rep/tenants/${tenantId}/notes`);
}

export async function createSalesRepNote(
  tenantId: string,
  data: { content: string; stage?: string }
): Promise<SalesActivityNote> {
  return apiRequest<SalesActivityNote>(`/sales-rep/tenants/${tenantId}/notes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
