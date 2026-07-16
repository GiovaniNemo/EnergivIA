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

export type DealStage = "NEW" | "CONTACTED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export type DealLostReason = "PRICE" | "NO_RESPONSE" | "COMPETITOR" | "NOT_INTERESTED" | "OTHER";

export interface LeadListItem {
  id: string;
  name: string;
  whatsapp: string;
  cpfCnpj?: string | null;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
  latestDealStage: DealStage | null;
  latestDealValue?: string | null;
  latestDealProposalCount?: number;
  latestDealProposalId?: string | null;
  latestDealProposalStatus?: string | null;
  latestDealProposalSentAt?: string | null;
  latestDealProposalClientViewedAt?: string | null;
  latestDealProposalClientViewCount?: number;
  latestDealAssignedUserId?: string | null;
  latestDealAssignedUserName?: string | null;
  latestDealUpdatedAt?: string | null;
  latestDealTemperature?: "HOT" | "WARM" | "COLD" | null;
  latestDealId?: string | null;
  nextActionAt: string | null;
  nextActionType: string | null;
}

export interface LeadsDashboardStats {
  totalLeads: number;
  dealsInProposal: number;
  dealsInNegotiation: number;
  dealsWon: number;
}

export interface ProposalSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  validUntil: string;
  sentAt?: string | null;
  pdfUrl?: string | null;
  clientViewCount?: number;
  clientFirstViewedAt?: string | null;
  clientLastViewedAt?: string | null;
  renderedData?: unknown | null;
  simulation?: { input?: unknown; result?: unknown } | null;
}

export interface DealWithProposals {
  id: string;
  leadId: string;
  title: string;
  value: string | null;
  stage: DealStage;
  temperature: string | null;
  lastContactAt: string | null;
  nextActionAt: string | null;
  nextActionType: string | null;
  lostReason: DealLostReason | null;
  createdAt: string;
  updatedAt: string;
  proposals: ProposalSummary[];
}

export interface LeadDetail {
  id: string;
  name: string;
  whatsapp: string;
  cpfCnpj?: string | null;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
  deals: DealWithProposals[];
  energyBills?: EnergyBillRecord[];
}

export interface PaginatedLeads {
  data: LeadListItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GeoState {
  id: string;
  uf: string;
  name: string;
  ibgeCode: string;
}

export interface GeoCity {
  id: string;
  stateId: string;
  name: string;
  ibgeCode: string;
  solarResource?: unknown;
}

export async function getLeadsDashboardStats(organizationId: string): Promise<LeadsDashboardStats> {
  const res = await apiProxy("GET", "/leads/stats", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<LeadsDashboardStats>;
}

export async function listLeads(
  organizationId: string,
  params?: { page?: number; pageSize?: number; search?: string }
): Promise<PaginatedLeads> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  if (params?.search) q.set("search", params.search);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiProxy("GET", `/leads${suffix}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<PaginatedLeads>;
}

export async function listGeoStates(organizationId: string): Promise<GeoState[]> {
  const res = await apiProxy("GET", "/geo/states", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<GeoState[]>;
}

export async function listGeoCities(organizationId: string, stateId: string): Promise<GeoCity[]> {
  const q = new URLSearchParams();
  q.set("stateId", stateId);
  const res = await apiProxy("GET", `/geo/cities?${q.toString()}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<GeoCity[]>;
}

export async function getLead(organizationId: string, id: string): Promise<LeadDetail> {
  const res = await apiProxy("GET", `/leads/${id}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<LeadDetail>;
}

export type LeadActivityRow = {
  id: string;
  kind: string;
  label: string;
  occurredAt: string;
};

export async function listLeadActivity(
  organizationId: string,
  leadId: string
): Promise<LeadActivityRow[]> {
  const res = await apiProxy("GET", `/leads/${leadId}/activity`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<LeadActivityRow[]>;
}

export async function appendLeadActivity(
  organizationId: string,
  leadId: string,
  body: { kind: "NOTE" | "CALL"; text: string }
): Promise<{ id: string }> {
  const res = await apiProxy("POST", `/leads/${leadId}/activity`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string }>;
}

export async function createLead(
  organizationId: string,
  body: {
    name: string;
    whatsapp: string;
    cpfCnpj?: string;
    email?: string;
    company?: string;
    source?: string;
  }
): Promise<{ id: string }> {
  const res = await apiProxy("POST", "/leads", body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string }>;
}

export async function updateLead(
  organizationId: string,
  id: string,
  body: {
    name?: string;
    whatsapp?: string;
    cpfCnpj?: string | null;
    email?: string | null;
    company?: string | null;
    source?: string | null;
  }
): Promise<void> {
  const res = await apiProxy("PUT", `/leads/${id}`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export async function createDeal(
  organizationId: string,
  leadId: string,
  body: {
    title: string;
    value?: number;
    stage?: DealStage;
    temperature?: string | null;
    assignedUserId?: string;
  }
): Promise<{ id: string }> {
  const res = await apiProxy("POST", `/leads/${leadId}/deals`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string }>;
}

export async function patchDeal(
  organizationId: string,
  dealId: string,
  body: {
    title?: string;
    value?: number | null;
    stage?: DealStage;
    temperature?: string | null;
    assignedUserId?: string | null;
    nextActionAt?: string | null;
    nextActionType?: string | null;
    lostReason?: DealLostReason | null;
  }
): Promise<void> {
  const res = await apiProxy("PATCH", `/deals/${dealId}`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export type SystemSizingInputJson = {
  monthlyConsumptionKwh: number;
  roofAreaSqm?: number;
  panelEfficiency?: number;
  includeBattery?: boolean;
  autonomyHours?: number;
  billConsumptionHistoryKwh?: number[];
  billConsumptionHistoryLabeled?: Array<{ month: string; consumptionKwh: number }>;
  billReferenceMonth?: string;
};

export type SystemSizingResultJson = {
  recommendedPowerKw: number;
  panelCount: number;
  inverterCount: number;
  estimatedProductionKwhMonth: number;
  batteryCapacityKwh?: number;
  batteryCount?: number;
  components?: Array<{ type: string; quantity: number; spec?: string }>;
};

export type FinancialSimulationInputJson = {
  systemSizeKw: number;
  investmentAmount: number;
  financingType: "CASH" | "FINANCED";
  interestRate?: number;
  installments?: number;
  energyPriceKwh?: number;
  annualIncreasePercent?: number;
  sizing?: SystemSizingInputJson;
  solarResource?: unknown;
};

export type FinancialSimulationResultJson = {
  paybackYears: number;
  totalSavings25y: number;
  monthlySavings: number;
  irr?: number;
  npv?: number;
  annualSavings: number[];
  sizing?: SystemSizingResultJson;
};

export interface ProposalDetail {
  id: string;
  title: string;
  status: string;
  validUntil: string;
  pdfUrl: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  renderedData: unknown;
  discountBrl?: number | null;
  publicToken?: string | null;
  deal: {
    id: string;
    title: string;
    value: unknown;
    leadId: string;
    stage: string;
    lead: {
      id: string;
      name: string;
      whatsapp: string;
      email?: string | null;
    };
  };
  simulation: {
    id: string;
    name: string | null;
    input: FinancialSimulationInputJson;
    result: FinancialSimulationResultJson;
  };
  proposalTemplate: { id: string; name: string } | null;
}

export interface ProposalListItem {
  id: string;
  title: string;
  status: string;
  validUntil: string;
  pdfUrl: string | null;
  createdAt: string;
  deal: {
    id: string;
    title: string;
    stage: string;
    lead: {
      id: string;
      name: string;
      whatsapp: string;
    };
  };
  quotedValueBrl: number | null;
  equipmentSubtotalBrl: number | null;
  marginBrl: number | null;
  kitLineCount: number;
}

export async function listProposals(organizationId: string): Promise<ProposalListItem[]> {
  const res = await apiProxy("GET", "/proposals", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProposalListItem[]>;
}

export async function getProposal(
  organizationId: string,
  proposalId: string
): Promise<ProposalDetail> {
  const res = await apiProxy("GET", `/proposals/${proposalId}`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProposalDetail>;
}

export async function sendProposalWithPdf(
  organizationId: string,
  proposalId: string,
  pdfUrl: string
): Promise<void> {
  const res = await apiProxy("POST", `/proposals/${proposalId}/send`, { pdfUrl }, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export async function updateProposalDiscount(
  organizationId: string,
  proposalId: string,
  discountBrl: number | null
): Promise<{ discountBrl: number | null; publicToken: string }> {
  const res = await apiProxy(
    "PATCH",
    `/proposals/${proposalId}/discount`,
    { discountBrl },
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ discountBrl: number | null; publicToken: string }>;
}

export async function setProposalTemplate(
  organizationId: string,
  proposalId: string,
  proposalTemplateId: string | null
): Promise<void> {
  const res = await apiProxy(
    "POST",
    `/proposals/${proposalId}/template`,
    { proposalTemplateId },
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export interface ProposalEquipmentContextItem {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ProposalEquipmentContext {
  proposalId: string;
  sourceType: "distributor" | "own_stock";
  distributorId: string | null;
  distributorName: string | null;
  alternateDistributors: Array<{ id: string; name: string }>;
  items: ProposalEquipmentContextItem[];
  equipmentSubtotalBrl: number;
  quotedSaleBrl: number;
  systemPowerKw?: number | null;
  freightState?: string | null;
  freightBrl?: number | null;
}

export interface ProposalEquipmentOption {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string;
  unitPrice: number;
  stockQuantity: number;
  imageUrl: string | null;
}

export async function getProposalEquipment(
  organizationId: string,
  proposalId: string
): Promise<ProposalEquipmentContext> {
  const res = await apiProxy(
    "GET",
    `/proposals/${proposalId}/equipment`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProposalEquipmentContext>;
}

export async function listProposalFreightRules(
  organizationId: string,
  proposalId: string,
  distributorId: string
): Promise<Array<{ state: string; value: number }>> {
  const q = new URLSearchParams({ distributorId });
  const res = await apiProxy(
    "GET",
    `/proposals/${proposalId}/equipment/freight?${q.toString()}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listProposalEquipmentOptions(
  organizationId: string,
  proposalId: string,
  params: { distributorId: string; categoryName: string; search?: string }
): Promise<ProposalEquipmentOption[]> {
  const q = new URLSearchParams({
    distributorId: params.distributorId,
    category: params.categoryName,
  });
  if (params.search?.trim()) q.set("search", params.search.trim());
  const res = await apiProxy(
    "GET",
    `/proposals/${proposalId}/equipment/options?${q.toString()}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProposalEquipmentOption[]>;
}

export interface ProposalDistributorAvailability {
  id: string;
  name: string;
  matchedCount: number;
  totalCount: number;
  hasAllItems: boolean;
  total?: number | null;
}

export interface ProposalItemAvailability {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string | null;
  quantity: number;
  available: boolean;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface ProposalItemsAvailabilitySummary {
  distributorId: string;
  distributorName: string;
  rows: ProposalItemAvailability[];
}

export async function listProposalDistributors(
  organizationId: string,
  proposalId: string
): Promise<ProposalDistributorAvailability[]> {
  const res = await apiProxy(
    "GET",
    `/proposals/${proposalId}/equipment/distributors`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProposalDistributorAvailability[]>;
}

export async function getProposalItemsAvailability(
  organizationId: string,
  proposalId: string,
  distributorId: string
): Promise<ProposalItemsAvailabilitySummary> {
  const q = new URLSearchParams({ distributorId });
  const res = await apiProxy(
    "GET",
    `/proposals/${proposalId}/equipment/availability?${q.toString()}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProposalItemsAvailabilitySummary>;
}

export async function updateProposalKitItems(
  organizationId: string,
  proposalId: string,
  body: {
    distributorId: string;
    items: Array<{ productId: string; quantity: number }>;
    freightState?: string | null;
  }
): Promise<ProposalEquipmentContext & { publicToken: string }> {
  const res = await apiProxy("PATCH", `/proposals/${proposalId}/kit-items`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ProposalEquipmentContext & { publicToken: string }>;
}

export async function createProposalForDeal(
  organizationId: string,
  dealId: string,
  body: {
    simulationId: string;
    title: string;
    validUntil: string;
    proposalTemplateId?: string;
    renderedData?: Record<string, unknown>;
    discountBrl?: number;
  }
): Promise<{ id: string }> {
  const res = await apiProxy("POST", `/deals/${dealId}/proposals`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string }>;
}

export type SimulationListItem = {
  id: string;
  name?: string | null;
  input?: unknown;
  result?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export function simulationHasEmbeddedSizing(s: { result?: unknown }): boolean {
  const res = s.result;
  if (!res || typeof res !== "object") return false;
  const sz = (res as Record<string, unknown>)["sizing"];
  return (
    sz != null &&
    typeof sz === "object" &&
    typeof (sz as Record<string, unknown>)["recommendedPowerKw"] === "number"
  );
}

export async function listSimulationsForLead(
  organizationId: string,
  leadId: string
): Promise<SimulationListItem[]> {
  const res = await apiProxy("GET", `/leads/${leadId}/simulations`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<SimulationListItem[]>;
}

export async function listSizingsForLead(
  organizationId: string,
  leadId: string
): Promise<{ id: string; name?: string | null }[]> {
  const res = await apiProxy("GET", `/leads/${leadId}/sizing`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string; name?: string | null }[]>;
}

export type LeadFinancialSimulationInput = {
  systemSizeKw: number;
  investmentAmount: number;
  financingType: "CASH" | "FINANCED";
  interestRate?: number;
  installments?: number;
  energyPriceKwh?: number;
  annualIncreasePercent?: number;
  sizing?: SystemSizingInputJson;
  solarResource?: unknown;
};

export type LeadSystemSizingInput = {
  monthlyConsumptionKwh: number;
  roofAreaSqm?: number;
  panelEfficiency?: number;
  includeBattery?: boolean;
  autonomyHours?: number;
};

export async function createLeadFinancialSimulation(
  organizationId: string,
  leadId: string,
  body: { input: LeadFinancialSimulationInput; name?: string }
): Promise<{ id: string }> {
  const res = await apiProxy("POST", `/leads/${leadId}/simulations`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

export async function createLeadSystemSizing(
  organizationId: string,
  leadId: string,
  body: { input: LeadSystemSizingInput; energyBillId?: string; name?: string }
): Promise<{ id: string }> {
  const res = await apiProxy("POST", `/leads/${leadId}/sizing`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id };
}

export function waMeUrl(whatsappDigits: string, message: string): string {
  const d = whatsappDigits.replace(/\D/g, "");
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

export type EnergyBillContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf"
  | "text/plain";

export function guessEnergyBillContentType(file: File): EnergyBillContentType {
  const t = file.type?.toLowerCase();
  if (
    t === "image/jpeg" ||
    t === "image/png" ||
    t === "image/webp" ||
    t === "application/pdf" ||
    t === "text/plain"
  ) {
    return t;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".txt")) return "text/plain";
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "application/pdf";
}

export async function presignEnergyBillUpload(
  organizationId: string,
  leadId: string,
  input: { fileName: string; contentType: EnergyBillContentType }
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const res = await apiProxy(
    "POST",
    `/leads/${leadId}/energy-bills/presign`,
    input,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ uploadUrl: string; fileUrl: string; key: string }>;
}

export async function uploadEnergyBillFileToS3(
  organizationId: string,
  leadId: string,
  file: File,
  contentType: EnergyBillContentType
): Promise<{ fileUrl: string; fileName: string; mimeType: string; fileSize: number }> {
  const presign = await presignEnergyBillUpload(organizationId, leadId, {
    fileName: file.name,
    contentType,
  });
  const uploadRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    const s3Message = body.match(/<Message>([^<]*)<\/Message>/)?.[1];
    const hint =
      uploadRes.status === 403
        ? " Verifique CORS do bucket (PUT desde o origin do app) e se a política/IAM permitem PutObject neste prefixo."
        : "";
    throw new Error(
      s3Message ? `S3: ${s3Message}${hint}` : `Falha no upload (${uploadRes.status}).${hint}`
    );
  }
  return {
    fileUrl: presign.fileUrl,
    fileName: file.name,
    mimeType: contentType,
    fileSize: file.size,
  };
}

export type EnergyBillExtractionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface EnergyBillExtractedPayload {
  referenceMonth?: string;
  consumptionKwh?: number;
  totalAmount?: number;
  rawData?: Record<string, unknown>;
}

export interface EnergyBillRecord {
  id: string;
  tenantId: string;
  leadId: string;
  fileUrl: string;
  fileName: string;
  provider: string;
  extractionStatus: EnergyBillExtractionStatus;
  extractionError?: string | null;
  extractedData: EnergyBillExtractedPayload | null;
  createdAt: string;
  updatedAt: string;
}

export async function createEnergyBill(
  organizationId: string,
  leadId: string,
  body: { fileUrl: string; fileName: string; provider?: "COPEL" | "OTHER" }
): Promise<EnergyBillRecord> {
  const res = await apiProxy("POST", `/leads/${leadId}/energy-bills`, body, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<EnergyBillRecord>;
}

export async function getEnergyBill(
  organizationId: string,
  leadId: string,
  billId: string
): Promise<EnergyBillRecord> {
  const res = await apiProxy(
    "GET",
    `/leads/${leadId}/energy-bills/${billId}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<EnergyBillRecord>;
}

const ENERGY_BILL_POLL_MS = 750;
const ENERGY_BILL_WAIT_MS = 120_000;

export async function waitForEnergyBillExtraction(
  organizationId: string,
  leadId: string,
  billId: string
): Promise<EnergyBillRecord> {
  const deadline = Date.now() + ENERGY_BILL_WAIT_MS;
  for (;;) {
    const bill = await getEnergyBill(organizationId, leadId, billId);
    if (bill.extractionStatus === "COMPLETED" || bill.extractionStatus === "FAILED") {
      return bill;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        "Tempo esgotado ao ler a conta de luz. Verifique a API (OpenAI) e tente de novo."
      );
    }
    await new Promise((r) => setTimeout(r, ENERGY_BILL_POLL_MS));
  }
}
