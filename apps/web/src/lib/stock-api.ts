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

export type StockItemRow = {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string;
  imageUrl: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  sku: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockProductOption = {
  id: string;
  name: string;
  brandName: string;
  categoryName: string;
  imageUrl: string | null;
  alreadyInStock: boolean;
};

export type StockMovementRow = {
  id: string;
  type: "INBOUND" | "ADJUSTMENT" | "RESERVE" | "RELEASE" | "OUTBOUND";
  quantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};

export type CreateStockItemBody = {
  productId: string;
  quantity: number;
  unitCost: number;
  sku?: string | null;
  notes?: string | null;
};

export type UpdateStockItemBody = Partial<Omit<CreateStockItemBody, "productId">>;

export interface StockFreightRuleRow {
  state: string;
  value: number;
}

export async function getStockFreightRules(organizationId: string): Promise<StockFreightRuleRow[]> {
  const res = await apiProxy("GET", "/stock/freight", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível carregar o frete do estoque."));
  }
  return res.json();
}

export async function setStockFreightRules(
  organizationId: string,
  rules: StockFreightRuleRow[]
): Promise<StockFreightRuleRow[]> {
  const res = await apiProxy("PUT", "/stock/freight", { rules }, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível salvar o frete do estoque."));
  }
  return res.json();
}

export async function listStock(organizationId: string): Promise<StockItemRow[]> {
  const res = await apiProxy("GET", "/stock", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível carregar o estoque."));
  }
  return res.json();
}

export async function searchStockProducts(
  organizationId: string,
  params: { search?: string; category?: string }
): Promise<StockProductOption[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.category) qs.set("category", params.category);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiProxy("GET", `/stock/products${suffix}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível buscar produtos."));
  }
  return res.json();
}

export async function createStockItem(
  organizationId: string,
  body: CreateStockItemBody
): Promise<StockItemRow> {
  const res = await apiProxy("POST", "/stock", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível adicionar ao estoque."));
  }
  return res.json();
}

export async function updateStockItem(
  organizationId: string,
  id: string,
  body: UpdateStockItemBody
): Promise<StockItemRow> {
  const res = await apiProxy("PUT", `/stock/${id}`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível salvar o item."));
  }
  return res.json();
}

export async function deleteStockItem(organizationId: string, id: string): Promise<void> {
  const res = await apiProxy("DELETE", `/stock/${id}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível remover o item."));
  }
}

export async function listStockMovements(
  organizationId: string,
  id: string
): Promise<StockMovementRow[]> {
  const res = await apiProxy("GET", `/stock/${id}/movements`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiErrorMessage(err, "Não foi possível carregar o histórico."));
  }
  return res.json();
}
