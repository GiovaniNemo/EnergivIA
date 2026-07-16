function formatApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const m = (body as { message?: unknown }).message;
  if (typeof m === "string" && m.trim()) return m;
  if (Array.isArray(m)) return m.map(String).join(" ");
  return fallback;
}

async function apiProxy(
  method: string,
  path: string,
  body?: unknown,
  organizationId?: string
): Promise<Response> {
  const url = `/api/proxy${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (organizationId) headers["x-organization-id"] = organizationId;
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
}

export type CostCalculationType = "FIXED" | "PERCENTAGE" | "PER_KWP";

export type CostRulePercentageBase = "SALE_PRICE" | "PROJECT_COST" | "PROFIT";

export type CostRuleRow = {
  id: string;
  organizationId: string;
  name: string;
  calculationType: CostCalculationType;
  value: number;
  minKwp: number | null;
  maxKwp: number | null;
  percentageBase: CostRulePercentageBase | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCostRuleBody = {
  name: string;
  calculationType: CostCalculationType;
  value: number;
  minKwp?: number | null;
  maxKwp?: number | null;
  percentageBase?: CostRulePercentageBase | null;
};

export type UpdateCostRuleBody = Partial<CreateCostRuleBody>;

export async function listCostRules(organizationId: string): Promise<CostRuleRow[]> {
  const res = await apiProxy("GET", "/cost-rules", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível carregar as regras de custo."));
  }
  return res.json();
}

export async function createCostRule(
  organizationId: string,
  body: CreateCostRuleBody
): Promise<CostRuleRow> {
  const res = await apiProxy("POST", "/cost-rules", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível criar a regra."));
  }
  return res.json();
}

export async function updateCostRule(
  organizationId: string,
  id: string,
  body: UpdateCostRuleBody
): Promise<CostRuleRow> {
  const res = await apiProxy("PUT", `/cost-rules/${id}`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível salvar a regra."));
  }
  return res.json();
}

export async function deleteCostRule(organizationId: string, id: string): Promise<void> {
  const res = await apiProxy("DELETE", `/cost-rules/${id}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível remover a regra."));
  }
}
