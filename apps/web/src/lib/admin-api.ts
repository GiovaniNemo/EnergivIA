import { getBackendProxyBase } from "./backend-base-url";

const getApiUrl = () => getBackendProxyBase();

export interface Brand {
  id: string;
  name: string;
  country: string | null;
  imageUrl?: string | null;
  createdAt?: string;
  _count?: { products: number };
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  imageUrl?: string | null;
  active: boolean;
  specs: Record<string, unknown>;
  brand: { id: string; name: string; imageUrl?: string | null };
  category: { id: string; name: string };
}

export interface ProductsResponse {
  data: Product[];
  total: number;
}

export interface QueryProductsParams {
  category?: string;
  brand?: string;
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch(`${getApiUrl()}/brands`);
  if (!res.ok) throw new Error("Falha ao carregar marcas.");
  return res.json();
}

export async function fetchBrand(id: string): Promise<Brand> {
  const res = await fetch(`${getApiUrl()}/brands/${id}`);
  if (!res.ok) throw new Error("Falha ao carregar marca.");
  return res.json();
}

export async function createBrand(data: {
  name: string;
  country?: string;
  image_url?: string;
}): Promise<Brand> {
  const res = await fetch(`${getApiUrl()}/brands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao criar marca.");
  }
  return res.json();
}

export async function updateBrand(
  id: string,
  data: { name?: string; country?: string; image_url?: string }
): Promise<Brand> {
  const res = await fetch(`${getApiUrl()}/brands/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao atualizar marca.");
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${getApiUrl()}/categories`);
  if (!res.ok) throw new Error("Falha ao carregar categorias.");
  return res.json();
}

export async function fetchProducts(params: QueryProductsParams = {}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set("category", params.category);
  if (params.brand) searchParams.set("brand", params.brand);
  if (params.search) searchParams.set("search", params.search);
  if (params.active !== undefined) searchParams.set("active", String(params.active));
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  const url = `${getApiUrl()}/products?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao carregar produtos.");
  return res.json();
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${getApiUrl()}/products/${id}`);
  if (!res.ok) throw new Error("Falha ao carregar produto.");
  return res.json();
}

export async function createProduct(data: {
  name: string;
  brand_id: string;
  category_id: string;
  active?: boolean;
  specs: Record<string, unknown>;
  image_url?: string;
}): Promise<Product> {
  const res = await fetch(`${getApiUrl()}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao criar produto.");
  }
  return res.json();
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    brand_id?: string;
    category_id?: string;
    active?: boolean;
    specs?: Record<string, unknown>;
    image_url?: string;
  }
): Promise<Product> {
  const res = await fetch(`${getApiUrl()}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao atualizar produto.");
  }
  return res.json();
}

export type UploadFolder = "products" | "brands" | "distributors";

export async function createPresignedUploadUrl(data: {
  fileName: string;
  contentType: string;
  folder: UploadFolder;
  productCategory?: string;
}): Promise<{ uploadUrl: string; fileUrl: string }> {
  const res = await fetch(`${getApiUrl()}/uploads/presigned-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao gerar URL de upload.");
  }
  return res.json();
}

export interface Distributor {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { distributorProducts: number };
}

export interface DistributorProduct {
  id: string;
  distributorSku: string | null;
  price: number;
  stockQuantity: number;
  leadTimeDays: number | null;
  minimumOrderQuantity: number;
  lastPriceUpdate: string | null;
  updatedAt: string;
  isCheapestOffer?: boolean;
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
    brand: { id: string; name: string; imageUrl?: string | null };
    category: { id: string; name: string };
  };
}

export interface DistributorProductsResponse {
  data: DistributorProduct[];
  total: number;
}

export interface QueryDistributorProductsParams {
  page?: number;
  limit?: number;
  category_id?: string;
  search?: string;
}

export interface ProductDistributorOffer {
  id: string;
  distributor_sku: string | null;
  price: number;
  stock_quantity: number;
  lead_time_days: number | null;
  minimum_order_quantity: number;
  last_price_update: string | null;
  distributor: {
    id: string;
    name: string;
    cnpj: string | null;
    city: string | null;
    state: string | null;
    email: string | null;
    phone: string | null;
  };
}

export async function fetchDistributors(): Promise<Distributor[]> {
  const res = await fetch(`${getApiUrl()}/distributors`);
  if (!res.ok) throw new Error("Falha ao carregar distribuidores.");
  return res.json();
}

export async function fetchDistributor(id: string): Promise<Distributor> {
  const res = await fetch(`${getApiUrl()}/distributors/${id}`);
  if (!res.ok) throw new Error("Falha ao carregar distribuidor.");
  return res.json();
}

export interface FreightRuleRow {
  state: string;
  value: number;
}

export async function fetchDistributorFreight(id: string): Promise<FreightRuleRow[]> {
  const res = await fetch(`${getApiUrl()}/distributors/${id}/freight`);
  if (!res.ok) throw new Error("Falha ao carregar o frete da distribuidora.");
  return res.json();
}

export async function saveDistributorFreight(
  id: string,
  rules: FreightRuleRow[]
): Promise<FreightRuleRow[]> {
  const res = await fetch(`${getApiUrl()}/distributors/${id}/freight`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rules }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Falha ao salvar o frete.");
  }
  return res.json();
}

export async function createDistributor(data: {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
}): Promise<Distributor> {
  const res = await fetch(`${getApiUrl()}/distributors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao criar distribuidor.");
  }
  return res.json();
}

export async function updateDistributor(
  id: string,
  data: {
    name?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
    state?: string;
  }
): Promise<Distributor> {
  const res = await fetch(`${getApiUrl()}/distributors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao atualizar distribuidor.");
  }
  return res.json();
}

export async function deleteDistributor(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/distributors/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao excluir distribuidor.");
  }
}

export async function fetchDistributorProducts(
  distributorId: string,
  params: QueryDistributorProductsParams = {}
): Promise<DistributorProductsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.category_id) searchParams.set("category_id", params.category_id);
  if (params.search) searchParams.set("search", params.search);
  const url = `${getApiUrl()}/distributors/${distributorId}/products?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao carregar produtos do distribuidor.");
  const json = await res.json();
  return {
    data: json.data.map((row: { price: unknown; [k: string]: unknown }) => ({
      ...row,
      price: typeof row.price === "number" ? row.price : Number(row.price),
    })),
    total: json.total,
  };
}

export async function addDistributorProduct(
  distributorId: string,
  data: {
    product_id: string;
    distributor_sku?: string;
    price: number;
    stock_quantity?: number;
    lead_time_days?: number;
    minimum_order_quantity?: number;
  }
): Promise<DistributorProduct> {
  const res = await fetch(`${getApiUrl()}/distributors/${distributorId}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao adicionar produto ao distribuidor.");
  }
  const json = await res.json();
  return { ...json, price: typeof json.price === "number" ? json.price : Number(json.price) };
}

export async function updateDistributorProduct(
  id: string,
  data: {
    distributor_sku?: string;
    price?: number;
    stock_quantity?: number;
    lead_time_days?: number;
    minimum_order_quantity?: number;
  }
): Promise<DistributorProduct> {
  const res = await fetch(`${getApiUrl()}/distributor-products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao atualizar produto do distribuidor.");
  }
  const json = await res.json();
  return { ...json, price: typeof json.price === "number" ? json.price : Number(json.price) };
}

export async function deleteDistributorProduct(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/distributor-products/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao excluir produto do distribuidor.");
  }
}

export async function fetchDistributorsByProduct(
  productId: string
): Promise<ProductDistributorOffer[]> {
  const res = await fetch(`${getApiUrl()}/products/${productId}/distributors`);
  if (!res.ok) throw new Error("Falha ao carregar distribuidores do produto.");
  return res.json();
}

export interface BulkDistributorProductRow {
  product_name: string;
  brand: string;
  distributor_sku?: string;
  price: number;
  stock?: number;
  lead_time_days?: number;
  moq?: number;
}

export interface BulkDistributorProductsResult {
  created: number;
  updated: number;
  skipped: { index: number; reason: string }[];
}

export async function bulkUpsertDistributorProducts(
  distributorId: string,
  rows: BulkDistributorProductRow[]
): Promise<BulkDistributorProductsResult> {
  const res = await fetch(`${getApiUrl()}/distributors/${distributorId}/products/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao importar CSV");
  }
  return res.json();
}
