import type { GenerateSolarKitsInput, GenerateSolarKitsOutput, KitPreferences } from "./kits";

export interface ExtractBillDataInput {
  fileUrl: string;
}

export type BillFieldConfidence = "high" | "medium" | "low";

export interface BillFieldEvidence {
  value: string;
  sourceSnippet: string;
  confidence: BillFieldConfidence;
}

export interface ExtractBillDataOutput {
  monthlyConsumption: number;
  simulationMonthlyConsumptionKwh?: number;
  billTotalBrl?: number;
  location: string;
  provider?: string;
  referenceMonth?: string;
  qualityStatus?: "ok" | "insufficient";
  consumptionHistoryKwh?: number[];
  consumptionHistoryLabeled?: Array<{ month: string; consumptionKwh: number }>;
  debug?: {
    extractionPath?: "vision_image" | "vision_pdf" | "plain_text";
    consumptionBasis?: "history_average" | "current_month";
    consumptionHistoryMonthCount?: number;
    referenceMonthConsumptionKwh?: number;
    kitSizingUsesHistoryAverage?: boolean;
    distributedGeneration?: {
      detected: boolean;
      injectedKwhMonth?: number;
    };
    gdSimulationCombined?: boolean;
    gdGridDrawKwhBeforeSimulation?: number;
  };
  evidence?: {
    monthlyConsumption?: BillFieldEvidence;
    location?: BillFieldEvidence;
    provider?: BillFieldEvidence;
    referenceMonth?: BillFieldEvidence;
  };
}

export type UpdateKitPreferencesInput = KitPreferences;

export interface UpdateKitPreferencesOutput {
  preferences: KitPreferences;
}

export interface GenerateProposalInput {
  conversationId: string;
  kitLabel: string;
}

export interface GenerateProposalOutput {
  proposalId: string;
  proposalUrl: string;
}

export interface ComputeQuickEconomiaInput {
  roofType: "ceramic" | "metal" | "fibromadeira" | "fibrometal" | "ground" | "laje";
  consumoKwh?: number;
  valorContaBrl?: number;
  tarifaKwh?: number;
  irradiacaoManual?: number;
  geoCityId?: string;
  useExtractedBill?: boolean;
  billSnapshot?: ExtractBillDataOutput;
}

export interface ComputeQuickEconomiaOutput {
  economiaMensal?: number;
  valorSistema?: number;
  payback?: number;
  tamanhoSistema?: number;
  monthlyConsumptionKwh?: number;
  irradiacaoUsada?: number;
  estimateNote?: string;
  error?: string;
}

export interface ListGeoStatesOutputItem {
  id: string;
  uf: string;
  name: string;
}

export interface ListGeoStatesOutput {
  states: ListGeoStatesOutputItem[];
}

export interface ListGeoCitiesInput {
  stateId: string;
}

export interface ListGeoCitiesOutputItem {
  id: string;
  name: string;
  hasSolarResource: boolean;
}

export interface ListGeoCitiesOutput {
  cities: ListGeoCitiesOutputItem[];
}

export interface CommitCrmProposalInput {
  conversationId: string;
  lead: {
    name: string;
    whatsapp: string;
    email?: string;
    company?: string;
    cpfCnpj?: string;
    source?: string;
  };
  dealTitle?: string;
  proposalTitle?: string;
  energyBill?: {
    fileUrl: string;
    fileName: string;
    provider?: "COPEL" | "OTHER";
  };
}

export interface CommitCrmProposalOutput {
  leadId?: string;
  dealId?: string;
  simulationId?: string;
  proposalId?: string;
  proposalUrl?: string;
  error?: string;
}

export interface ListSupportedBrandsInput {
  organizationId?: string;
}

export interface ListSupportedBrandsOutput {
  moduleBrands: string[];
  inverterBrands: string[];
}

export interface ListProductPricesInput {
  query?: string;
  brand?: string;
  powerW?: number;
  category?: "module" | "inverter" | "microinverter";
  limit?: number;
}

export interface ProductPriceItem {
  productName: string;
  brand: string;
  category: string;
  powerW?: number;
  minPrice: number;
  maxPrice: number;
  distributorCount: number;
  currency: "BRL";
}

export interface ListProductPricesOutput {
  items: ProductPriceItem[];
  note?: string;
}

export interface SearchLeadsInput {
  query: string;
  limit?: number;
  organizationId?: string;
}

export interface SearchLeadsOutputLeadRow {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  company: string | null;
  source: string | null;
  latestDealId: string | null;
  latestDealStage: string | null;
  latestDealValue: string | null;
  updatedAt: string;
}

export interface SearchLeadsOutput {
  leads: SearchLeadsOutputLeadRow[];
  error?: string;
}

export interface GetLeadSummaryInput {
  leadId: string;
  organizationId?: string;
}

export type GetLeadSummaryOutput =
  | { error: string }
  | {
      lead: {
        id: string;
        name: string;
        whatsapp: string;
        email: string | null;
        company: string | null;
        source: string | null;
        createdAt: string;
        updatedAt: string;
      };
      deals: Array<{
        id: string;
        title: string;
        stage: string;
        value: string | null;
        temperature: string | null;
        proposalCount: number;
        updatedAt: string;
      }>;
    };

export interface ListOpenDealsForLeadInput {
  leadId: string;
  organizationId?: string;
}

export interface ListOpenDealsForLeadOutputDealRow {
  id: string;
  title: string;
  stage: string;
  value: string | null;
  temperature: string | null;
  proposalCount: number;
  nextActionAt: string | null;
  nextActionType: string | null;
  updatedAt: string;
}

export type ListOpenDealsForLeadOutput =
  | { error: string }
  | { deals: ListOpenDealsForLeadOutputDealRow[] };

export interface GetDealSummaryInput {
  dealId: string;
  organizationId?: string;
}

export type GetDealSummaryOutput =
  | { error: string }
  | {
      deal: {
        id: string;
        title: string;
        stage: string;
        value: string | null;
        temperature: string | null;
        nextActionAt: string | null;
        nextActionType: string | null;
        lostReason: string | null;
        createdAt: string;
        updatedAt: string;
        lead: { id: string; name: string; whatsapp: string; email: string | null };
      };
      proposals: Array<{
        id: string;
        title: string;
        status: string;
        validUntil: string;
        createdAt: string;
        hasPdf: boolean;
        internalUrl: string;
      }>;
    };

export interface GetProposalSummaryInput {
  proposalId: string;
  organizationId?: string;
}

export type GetProposalSummaryOutput =
  | { error: string }
  | {
      id: string;
      title: string;
      status: string;
      validUntil: string;
      createdAt: string;
      sentAt: string | null;
      hasPdf: boolean;
      internalUrl: string;
      deal: {
        id: string;
        title: string;
        stage: string;
        lead: { id: string; name: string; whatsapp: string };
      } | null;
    };

export interface AgentToolRegistry {
  extract_bill_data: (input: ExtractBillDataInput) => Promise<ExtractBillDataOutput>;
  generate_solar_kits: (input: GenerateSolarKitsInput) => Promise<GenerateSolarKitsOutput>;
  update_kit_preferences: (input: UpdateKitPreferencesInput) => Promise<UpdateKitPreferencesOutput>;
  compute_quick_economia: (input: ComputeQuickEconomiaInput) => Promise<ComputeQuickEconomiaOutput>;
  list_geo_states: () => Promise<ListGeoStatesOutput>;
  list_geo_cities: (input: ListGeoCitiesInput) => Promise<ListGeoCitiesOutput>;
  commit_crm_proposal: (input: CommitCrmProposalInput) => Promise<CommitCrmProposalOutput>;
  list_supported_brands: (input: ListSupportedBrandsInput) => Promise<ListSupportedBrandsOutput>;
  list_product_prices: (input: ListProductPricesInput) => Promise<ListProductPricesOutput>;
  search_leads: (input: SearchLeadsInput) => Promise<SearchLeadsOutput>;
  get_lead_summary: (input: GetLeadSummaryInput) => Promise<GetLeadSummaryOutput>;
  list_open_deals_for_lead: (
    input: ListOpenDealsForLeadInput
  ) => Promise<ListOpenDealsForLeadOutput>;
  get_deal_summary: (input: GetDealSummaryInput) => Promise<GetDealSummaryOutput>;
  get_proposal_summary: (input: GetProposalSummaryInput) => Promise<GetProposalSummaryOutput>;
}
