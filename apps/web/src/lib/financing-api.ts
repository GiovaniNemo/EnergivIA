async function apiProxy(
  method: string,
  path: string,
  body?: unknown,
  organizationId?: string | null
): Promise<Response> {
  const url = `/api/proxy${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (organizationId) headers["x-organization-id"] = organizationId;
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
}

export type FinancingProviderMode = "API" | "ASSISTED" | "MANUAL";
export type FinancingPersonType = "PF" | "PJ";
export type FinancingSimulationStatus = "DRAFT" | "PROCESSING" | "COMPLETED" | "ERROR";
export type FinancingOfferEligibility = "ESTIMATED" | "PRE_APPROVED" | "APPROVED" | "REJECTED";

export interface FinancingProvider {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  mode: FinancingProviderMode;
  active: boolean;
  supportsPF: boolean;
  supportsPJ: boolean;
  enabledForTenant?: boolean;
  hasTenantOverride?: boolean;
}

export interface FinancingOffer {
  id: string;
  simulationId: string;
  providerId: string;
  rateTableId: string | null;
  financedAmount: string;
  term: number;
  monthlyRate: string;
  cet: string;
  installmentValue: string;
  totalAmount: string;
  eligibilityStatus: FinancingOfferEligibility;
  score: string;
  notes: string | null;
  provider: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    mode: FinancingProviderMode;
  };
}

export interface FinancingSimulationDetail {
  id: string;
  tenantId: string;
  leadId: string;
  dealId: string | null;
  customerName: string;
  cpfCnpj: string | null;
  email: string | null;
  phone: string | null;
  personType: FinancingPersonType;
  projectAmount: string;
  downPayment: string;
  financedAmount: string;
  requestedTerm: number;
  status: FinancingSimulationStatus;
  errorMessage: string | null;
  createdAt: string;
  offers: FinancingOffer[];
}

export interface CreateFinancingSimulationBody {
  leadId: string;
  dealId?: string;
  customerName: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  personType?: FinancingPersonType;
  projectAmount: number;
  downPayment?: number;
  requestedTerm: number;
}

export async function createFinancingSimulation(
  organizationId: string,
  body: CreateFinancingSimulationBody
): Promise<FinancingSimulationDetail> {
  const res = await apiProxy("POST", "/financing/simulations", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<FinancingSimulationDetail>;
}

export async function getFinancingSimulation(
  organizationId: string,
  id: string
): Promise<FinancingSimulationDetail> {
  const res = await apiProxy("GET", `/financing/simulations/${id}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<FinancingSimulationDetail>;
}

export async function listFinancingSimulations(
  organizationId: string,
  params?: { leadId?: string; dealId?: string; status?: FinancingSimulationStatus }
): Promise<
  Array<
    Pick<
      FinancingSimulationDetail,
      | "id"
      | "customerName"
      | "projectAmount"
      | "financedAmount"
      | "requestedTerm"
      | "status"
      | "createdAt"
    > & {
      offers: Array<{ id: string; providerId: string; installmentValue: string; score: string }>;
    }
  >
> {
  const q = new URLSearchParams();
  if (params?.leadId) q.set("leadId", params.leadId);
  if (params?.dealId) q.set("dealId", params.dealId);
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiProxy("GET", `/financing/simulations${suffix}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export type FinancingApplicationStatus =
  | "CREATED"
  | "AWAITING_DOCUMENTS"
  | "DOCUMENTS_RECEIVED"
  | "SUBMITTED_TO_BANK"
  | "UNDER_REVIEW"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CONTRACT_SIGNED"
  | "CREDIT_RELEASED"
  | "COMPLETED";

export type FinancingDocumentStatus = "REQUIRED" | "UPLOADED" | "APPROVED" | "REJECTED";

export type FinancingTimelineEventType =
  | "SIMULATION_CREATED"
  | "OFFER_SELECTED"
  | "APPLICATION_CREATED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_REJECTED"
  | "SUBMITTED_TO_BANK"
  | "STATUS_CHANGED"
  | "PENDENCY_OPENED"
  | "APPROVED"
  | "REJECTED"
  | "CONTRACT_SIGNED"
  | "CREDIT_RELEASED"
  | "NOTE_ADDED";

export interface FinancingDocument {
  id: string;
  applicationId: string;
  name: string;
  type: string;
  status: FinancingDocumentStatus;
  fileUrl: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancingTimelineEvent {
  id: string;
  applicationId: string;
  type: FinancingTimelineEventType;
  description: string;
  userId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface FinancingApplicationListItem {
  id: string;
  tenantId: string;
  simulationId: string;
  selectedOfferId: string;
  providerId: string;
  assignedUserId: string | null;
  status: FinancingApplicationStatus;
  externalReference: string | null;
  approvedAmount: string | null;
  approvedTerm: number | null;
  approvedRate: string | null;
  approvedCet: string | null;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  provider: { id: string; name: string; slug: string; logoUrl: string | null; mode: string };
  selectedOffer: {
    installmentValue: string;
    term: number;
    financedAmount: string;
    monthlyRate: string;
    cet: string;
  };
  simulation: {
    customerName: string;
    cpfCnpj: string | null;
    personType: "PF" | "PJ";
    leadId: string;
  };
  _count: { documents: number };
}

export interface FinancingApplicationDetail extends FinancingApplicationListItem {
  documents: FinancingDocument[];
  timelineEvents: FinancingTimelineEvent[];
  selectedOffer: FinancingApplicationListItem["selectedOffer"] & {
    id: string;
    providerId: string;
    rateTableId: string | null;
    eligibilityStatus: FinancingOfferEligibility;
    notes: string | null;
    totalAmount: string;
  };
  provider: FinancingApplicationListItem["provider"] & {
    docsRequired: Record<"PF" | "PJ", string[]> | null;
  };
  simulation: FinancingApplicationListItem["simulation"] & {
    id: string;
    dealId: string | null;
    email: string | null;
    phone: string | null;
    projectAmount: string;
    downPayment: string;
    financedAmount: string;
    requestedTerm: number;
    status: FinancingSimulationStatus;
  };
}

export type FinancingKanbanBoard = Record<
  FinancingApplicationStatus,
  FinancingApplicationListItem[]
>;

export async function createFinancingApplication(
  organizationId: string,
  body: { selectedOfferId: string; notes?: string }
): Promise<FinancingApplicationDetail> {
  const res = await apiProxy("POST", "/financing/applications", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getFinancingApplication(
  organizationId: string,
  id: string
): Promise<FinancingApplicationDetail> {
  const res = await apiProxy("GET", `/financing/applications/${id}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getFinancingKanban(organizationId: string): Promise<FinancingKanbanBoard> {
  const res = await apiProxy("GET", "/financing/applications/kanban", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function transitionFinancingApplication(
  organizationId: string,
  id: string,
  body: { to: FinancingApplicationStatus; reason?: string }
): Promise<FinancingApplicationDetail> {
  const res = await apiProxy(
    "POST",
    `/financing/applications/${id}/transition`,
    body,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateFinancingApplication(
  organizationId: string,
  id: string,
  body: {
    assignedUserId?: string | null;
    notes?: string;
    externalReference?: string;
    approvedAmount?: number;
    approvedTerm?: number;
    approvedRate?: number;
    approvedCet?: number;
  }
): Promise<FinancingApplicationDetail> {
  const res = await apiProxy("PATCH", `/financing/applications/${id}`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadFinancingDocumentFile(
  organizationId: string,
  file: File
): Promise<string> {
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error(
      `Arquivo grande demais (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: 10 MB.`
    );
  }
  const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  const contentType = file.type.toLowerCase();
  if (!allowed.has(contentType)) {
    throw new Error("Tipo de arquivo não suportado. Envie PDF, JPG, PNG ou WEBP.");
  }

  const presignRes = await apiProxy(
    "POST",
    "/uploads/presigned-url",
    {
      fileName: file.name,
      contentType: file.type,
      folder: "financing_documents",
    },
    organizationId
  );
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Falha ao obter URL de upload.");
  }
  const presign = (await presignRes.json()) as { uploadUrl: string; fileUrl: string };

  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Falha no upload S3 (HTTP ${uploadRes.status}).`);
  }
  return presign.fileUrl;
}

export async function updateFinancingDocument(
  organizationId: string,
  documentId: string,
  body: {
    name?: string;
    fileUrl?: string;
    status?: FinancingDocumentStatus;
    reviewerNotes?: string;
  }
): Promise<FinancingDocument> {
  const res = await apiProxy(
    "PATCH",
    `/financing/applications/documents/${documentId}`,
    body,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface FinancingDashboardSummary {
  totalSimulations: number;
  totalApplications: number;
  totalApproved: number;
  totalReleased: number;
  totalFinancedBrl: number;
  approvalRate: number;
  avgApprovalDays: number | null;
  byProvider: Array<{
    providerId: string;
    providerName: string;
    simulations: number;
    applications: number;
    approved: number;
    released: number;
    totalFinancedBrl: number;
  }>;
  bySeller: Array<{
    userId: string;
    userName: string | null;
    userEmail: string | null;
    applications: number;
    approved: number;
    totalFinancedBrl: number;
  }>;
  byStatus: Record<string, number>;
}

export async function getFinancingDashboardSummary(
  organizationId: string
): Promise<FinancingDashboardSummary> {
  const res = await apiProxy("GET", "/financing/dashboard", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export type CommissionStatus = "PENDING" | "CONFIRMED" | "RECEIVED" | "CANCELLED";
export type CommissionCalculationType = "PERCENTAGE" | "FIXED";
export type CommissionBase = "FINANCED_AMOUNT" | "TOTAL_AMOUNT";

export interface PlatformApplicationRow extends Omit<FinancingApplicationListItem, "simulation"> {
  tenant: { id: string; name: string; slug: string };
  simulation: {
    customerName: string;
    cpfCnpj: string | null;
    personType: "PF" | "PJ";
    leadId: string;
  };
  commission: { id: string; status: CommissionStatus; grossCommissionBrl: string } | null;
}

export interface PlatformCommission {
  id: string;
  applicationId: string;
  providerId: string;
  tenantId: string;
  ruleId: string | null;
  calculationType: CommissionCalculationType;
  appliedValue: string;
  baseAmount: CommissionBase;
  baseAmountBrl: string;
  grossCommissionBrl: string;
  status: CommissionStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  provider: { id: string; name: string; slug: string };
  application: {
    id: string;
    status: FinancingApplicationStatus;
    createdAt: string;
    approvedAt: string | null;
    simulation: { customerName: string; leadId: string };
  };
}

export interface PlatformRevenueSummary {
  total: number;
  pending: number;
  confirmed: number;
  received: number;
  cancelled: number;
  byProvider: Array<{
    providerId: string;
    providerName: string;
    pending: number;
    confirmed: number;
    received: number;
    count: number;
  }>;
  byTenant: Array<{ tenantId: string; total: number; count: number }>;
}

export interface PlatformCommissionRule {
  id: string;
  providerId: string;
  personType: "PF" | "PJ" | null;
  calculationType: CommissionCalculationType;
  value: string;
  baseAmount: CommissionBase;
  minAmount: string | null;
  maxAmount: string | null;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  notes: string | null;
  provider: { id: string; name: string; slug: string };
}

export async function getPlatformApplications(
  organizationId: string,
  params?: { status?: FinancingApplicationStatus; providerId?: string; tenantId?: string }
): Promise<PlatformApplicationRow[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.providerId) q.set("providerId", params.providerId);
  if (params?.tenantId) q.set("tenantId", params.tenantId);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiProxy(
    "GET",
    `/financing/platform/applications${suffix}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getPlatformKanban(
  organizationId: string
): Promise<Record<FinancingApplicationStatus, PlatformApplicationRow[]>> {
  const res = await apiProxy("GET", "/financing/platform/kanban", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listPlatformCommissions(
  organizationId: string,
  params?: { status?: CommissionStatus; providerId?: string; tenantId?: string }
): Promise<PlatformCommission[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.providerId) q.set("providerId", params.providerId);
  if (params?.tenantId) q.set("tenantId", params.tenantId);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiProxy(
    "GET",
    `/financing/platform/commissions${suffix}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getPlatformRevenue(organizationId: string): Promise<PlatformRevenueSummary> {
  const res = await apiProxy(
    "GET",
    "/financing/platform/commissions/revenue",
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updatePlatformCommission(
  organizationId: string,
  id: string,
  body: {
    status?: CommissionStatus;
    grossCommissionBrl?: number;
    paidAt?: string | null;
    notes?: string;
  }
): Promise<PlatformCommission> {
  const res = await apiProxy(
    "PATCH",
    `/financing/platform/commissions/${id}`,
    body,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listPlatformCommissionRules(
  organizationId: string,
  providerId?: string
): Promise<PlatformCommissionRule[]> {
  const q = providerId ? `?providerId=${providerId}` : "";
  const res = await apiProxy(
    "GET",
    `/financing/platform/commission-rules${q}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface CreateProviderBody {
  name: string;
  slug: string;
  logoUrl?: string;
  mode: FinancingProviderMode;
  active?: boolean;
  supportsPF?: boolean;
  supportsPJ?: boolean;
  apiConfig?: Record<string, unknown>;
  docsRequired?: Record<"PF" | "PJ", string[]>;
}

export type UpdateProviderBody = Partial<CreateProviderBody>;

export async function createFinancingProvider(
  organizationId: string,
  body: CreateProviderBody
): Promise<FinancingProvider> {
  const res = await apiProxy("POST", "/financing/providers", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateFinancingProvider(
  organizationId: string,
  id: string,
  body: UpdateProviderBody
): Promise<FinancingProvider> {
  const res = await apiProxy("PATCH", `/financing/providers/${id}`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function toggleProviderAvailability(
  organizationId: string,
  providerId: string,
  active: boolean
): Promise<void> {
  const res = await apiProxy(
    "POST",
    `/financing/providers/${providerId}/availability`,
    { active },
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export interface RateTable {
  id: string;
  providerId: string;
  tenantId: string | null;
  personType: "PF" | "PJ";
  minAmount: string;
  maxAmount: string;
  minTerm: number;
  maxTerm: number;
  monthlyRate: string;
  feeRate: string;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
}

export interface CreateRateTableBody {
  providerId: string;
  personType?: "PF" | "PJ";
  minAmount: number;
  maxAmount: number;
  minTerm: number;
  maxTerm: number;
  monthlyRate: number;
  feeRate?: number;
  validFrom?: string;
  validUntil?: string;
  active?: boolean;
  global?: boolean;
}

export type UpdateRateTableBody = Partial<Omit<CreateRateTableBody, "providerId" | "global">>;

export async function listRateTables(
  organizationId: string,
  providerId: string
): Promise<RateTable[]> {
  const res = await apiProxy(
    "GET",
    `/financing/providers/${providerId}/rate-tables`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createRateTable(
  organizationId: string,
  body: CreateRateTableBody
): Promise<RateTable> {
  const res = await apiProxy("POST", "/financing/providers/rate-tables", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateRateTable(
  organizationId: string,
  id: string,
  body: UpdateRateTableBody
): Promise<RateTable> {
  const res = await apiProxy(
    "PATCH",
    `/financing/providers/rate-tables/${id}`,
    body,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteRateTable(organizationId: string, id: string): Promise<void> {
  const res = await apiProxy(
    "DELETE",
    `/financing/providers/rate-tables/${id}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export interface CreateCommissionRuleBody {
  providerId: string;
  personType?: "PF" | "PJ";
  calculationType: "PERCENTAGE" | "FIXED";
  value: number;
  baseAmount?: "FINANCED_AMOUNT" | "TOTAL_AMOUNT";
  minAmount?: number;
  maxAmount?: number;
  validFrom?: string;
  validUntil?: string;
  active?: boolean;
  notes?: string;
}

export type UpdateCommissionRuleBody = Partial<Omit<CreateCommissionRuleBody, "providerId">>;

export async function createCommissionRule(
  organizationId: string,
  body: CreateCommissionRuleBody
): Promise<PlatformCommissionRule> {
  const res = await apiProxy("POST", "/financing/platform/commission-rules", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateCommissionRule(
  organizationId: string,
  id: string,
  body: UpdateCommissionRuleBody
): Promise<PlatformCommissionRule> {
  const res = await apiProxy(
    "PATCH",
    `/financing/platform/commission-rules/${id}`,
    body,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteCommissionRule(organizationId: string, id: string): Promise<void> {
  const res = await apiProxy(
    "DELETE",
    `/financing/platform/commission-rules/${id}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export async function listFinancingProviders(organizationId: string): Promise<FinancingProvider[]> {
  const res = await apiProxy("GET", "/financing/providers", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<FinancingProvider[]>;
}
