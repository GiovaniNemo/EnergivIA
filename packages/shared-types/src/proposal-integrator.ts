export const PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION = 1 as const;

export interface ProposalIntegratorKitLine {
  productId: string;
  productName: string;
  brandName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  categoryName?: string;
}

export type ProposalProjectCostLineSource = "organization" | "system_default";

export type ProposalProjectCostCalculationType = "FIXED" | "PERCENTAGE" | "PER_KWP";

export type ProposalProjectCostPercentageBase = "SALE_PRICE" | "PROJECT_COST" | "PROFIT";

export interface ProposalProjectCostLine {
  ruleId?: string | null;
  name: string;
  calculationType: ProposalProjectCostCalculationType;
  value: number;
  appliedAmountBrl: number;
  minKwp?: number | null;
  maxKwp?: number | null;
  source: ProposalProjectCostLineSource;
  percentageBase?: ProposalProjectCostPercentageBase;
}

export type ProposalIntegratorSourceType = "distributor" | "own_stock";

export interface ProposalIntegratorSnapshot {
  version: typeof PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION;
  kitItems: ProposalIntegratorKitLine[];
  equipmentSubtotalBrl: number;
  quotedSaleBrl: number;
  systemPowerKw?: number;
  sourceType?: ProposalIntegratorSourceType;
  distributorId?: string;
  notes?: string;
  projectCostLines?: ProposalProjectCostLine[];
  defaultEssentialCostNames?: string[];
  computedSaleFromCostRulesBrl?: number;
  freightBrl?: number;
  freightState?: string;
}

export interface ProposalRenderedDataShape {
  integrator?: ProposalIntegratorSnapshot;
}

function isOptionalProjectCostLineArray(v: unknown): boolean {
  if (v === undefined) return true;
  if (!Array.isArray(v)) return false;
  for (const item of v) {
    if (!item || typeof item !== "object") return false;
    const x = item as Record<string, unknown>;
    if (typeof x["name"] !== "string") return false;
    const ct = x["calculationType"];
    if (ct !== "FIXED" && ct !== "PERCENTAGE" && ct !== "PER_KWP") return false;
    if (typeof x["value"] !== "number" || !Number.isFinite(x["value"] as number)) return false;
    if (
      typeof x["appliedAmountBrl"] !== "number" ||
      !Number.isFinite(x["appliedAmountBrl"] as number)
    )
      return false;
    const src = x["source"];
    if (src !== "organization" && src !== "system_default") return false;
    const pb = x["percentageBase"];
    if (pb !== undefined && pb !== "SALE_PRICE" && pb !== "PROJECT_COST" && pb !== "PROFIT") {
      return false;
    }
  }
  return true;
}

export function isProposalIntegratorSnapshot(v: unknown): v is ProposalIntegratorSnapshot {
  if (!v || typeof v !== "object") return false;
  const o = v as ProposalIntegratorSnapshot;
  return (
    o.version === PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION &&
    Array.isArray(o.kitItems) &&
    typeof o.equipmentSubtotalBrl === "number" &&
    typeof o.quotedSaleBrl === "number" &&
    (o.defaultEssentialCostNames === undefined || Array.isArray(o.defaultEssentialCostNames)) &&
    (o.computedSaleFromCostRulesBrl === undefined ||
      (typeof o.computedSaleFromCostRulesBrl === "number" &&
        Number.isFinite(o.computedSaleFromCostRulesBrl))) &&
    isOptionalProjectCostLineArray(o.projectCostLines)
  );
}
