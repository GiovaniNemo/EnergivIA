export {
  computeProjectCostSection,
  effectivePercentageBase,
  getDefaultEssentialRulesForSeeding,
  mergeOrganizationRulesWithEssentialDefaults,
  projectCostRuleMatchesKwp,
  PROJECT_COST_ESSENTIAL_LABOR_NAME,
  PROJECT_COST_ESSENTIAL_MARGIN_NAME,
} from "./project-cost-rules";
export type {
  ProjectCostCalculationType,
  ProjectCostPercentageBase,
  ProjectCostRuleInput,
} from "./project-cost-rules";

export type QuickEconomiaRoofType =
  | "ceramic"
  | "metal"
  | "fibromadeira"
  | "fibrometal"
  | "ground"
  | "laje";

export const ROOF_SOLAR_FACTOR: Record<QuickEconomiaRoofType, number> = {
  ceramic: 1,
  metal: 0.94,
  fibromadeira: 0.96,
  fibrometal: 0.96,
  ground: 1,
  laje: 1,
};

export interface QuickEconomiaSimulationInput {
  consumo?: number;
  valorConta?: number;
  tarifa?: number;
  irradiacao?: number;
  roofType?: QuickEconomiaRoofType;
  systemKw?: number;
}

export interface QuickEconomiaSimulationResult {
  economiaMensal: number;
  valorSistema: number;
  payback: number;
  tamanhoSistema: number;
  monthlyConsumptionKwh: number;
}

export function parseExtractedNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const raw = value.trim().replace(/\s/g, "");
    if (!raw) return 0;
    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");
    let norm = raw;
    if (hasComma && hasDot) norm = raw.replace(/\./g, "").replace(",", ".");
    else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(raw)) norm = raw.replace(/\./g, "");
    else if (hasComma) norm = raw.replace(",", ".");
    const n = Number(norm);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function applyLegacyGdSimulationKwh(
  kwhFromPayload: number,
  rawTop: Record<string, unknown> | undefined
): { kwh: number; note?: string } {
  if (kwhFromPayload <= 0 || !rawTop) return { kwh: kwhFromPayload };
  const debug = rawTop["debug"];
  if (!debug || typeof debug !== "object") return { kwh: kwhFromPayload };
  const d = debug as Record<string, unknown>;

  const dg = d["distributedGeneration"];
  if (!dg || typeof dg !== "object") return { kwh: kwhFromPayload };
  if ((dg as Record<string, unknown>)["detected"] !== true) return { kwh: kwhFromPayload };
  const injRaw = (dg as Record<string, unknown>)["injectedKwhMonth"];
  const injected =
    typeof injRaw === "number" && Number.isFinite(injRaw) && injRaw > 0 ? Math.round(injRaw) : 0;
  if (injected <= 0) return { kwh: kwhFromPayload };

  if (
    d["gdSimulationCombined"] === true &&
    typeof d["gdGridDrawKwhBeforeSimulation"] === "number"
  ) {
    const grid = Math.round(d["gdGridDrawKwhBeforeSimulation"] as number);
    const storedSim = parseExtractedNumber(rawTop["simulationMonthlyConsumptionKwh"]);
    const lookedLikeOldSum = storedSim > 0 && Math.abs(storedSim - (grid + injected)) <= 2;
    if (lookedLikeOldSum) {
      const net = Math.max(0, grid - injected);
      return {
        kwh: net,
        note: `Conta com GD: dimensionamento corrigido para rede (${grid} kWh) − gerado/injetado (${injected} kWh) ≈ ${net} kWh/mês.`,
      };
    }
    return { kwh: kwhFromPayload };
  }

  const grid = Math.round(kwhFromPayload);
  const net = Math.max(0, grid - injected);
  return {
    kwh: net,
    note: `Conta com GD: dimensionamento usa consumo da rede (${grid} kWh) menos energia injetada/gerada no período (${injected} kWh) ≈ ${net} kWh/mês.`,
  };
}

export type BillExtractedLike = {
  consumptionKwh?: number;
  totalAmount?: number;
  rawData?: Record<string, unknown>;
};

export function getBillGdSimulationSummary(
  extracted: BillExtractedLike | null | undefined
): { grid: number; injected: number; combined: number } | null {
  if (!extracted?.rawData || typeof extracted.rawData !== "object") return null;
  const raw = extracted.rawData as Record<string, unknown>;
  const debug = raw["debug"];
  if (!debug || typeof debug !== "object") return null;
  const d = debug as Record<string, unknown>;
  const dg = d["distributedGeneration"];
  if (!dg || typeof dg !== "object") return null;
  if ((dg as Record<string, unknown>)["detected"] !== true) return null;
  const injRaw = (dg as Record<string, unknown>)["injectedKwhMonth"];
  const injected =
    typeof injRaw === "number" && Number.isFinite(injRaw) && injRaw > 0 ? Math.round(injRaw) : 0;
  if (injected <= 0) return null;

  const simFromRaw = parseExtractedNumber(raw["simulationMonthlyConsumptionKwh"]);
  const refGrid =
    typeof extracted.consumptionKwh === "number" && Number.isFinite(extracted.consumptionKwh)
      ? Math.round(extracted.consumptionKwh)
      : 0;

  if (
    d["gdSimulationCombined"] === true &&
    typeof d["gdGridDrawKwhBeforeSimulation"] === "number"
  ) {
    const grid = Math.round(d["gdGridDrawKwhBeforeSimulation"] as number);
    const lookedLikeOldSum = simFromRaw > 0 && Math.abs(simFromRaw - (grid + injected)) <= 2;
    const combined = lookedLikeOldSum
      ? Math.max(0, grid - injected)
      : Math.max(0, simFromRaw > 0 ? Math.round(simFromRaw) : grid - injected);
    return { grid, injected, combined };
  }

  const grid = simFromRaw > 0 ? Math.round(simFromRaw) : refGrid > 0 ? refGrid : 0;
  if (grid <= 0) return null;
  return { grid, injected, combined: Math.max(0, grid - injected) };
}

export function normalizeGeoName(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const noDiacritics = trimmed.normalize("NFD").replace(/\p{M}/gu, "");
  return noDiacritics.toUpperCase();
}

export function parseBillLocation(raw: string): { cityName?: string; uf?: string } {
  const t = raw.trim();
  if (!t) return {};

  const labeled = t.match(/cidade\s*:\s*(.+?)\s*-\s*estado\s*:\s*([A-Za-z]{2})\b/i);
  if (labeled) {
    const cityName = labeled[1]!.replace(/\s+/g, " ").trim();
    const uf = labeled[2]!.toUpperCase();
    if (cityName && uf.length === 2) return { cityName, uf };
  }

  const dashParts = t.split(/\s*-\s*/).map((p) => p.trim());
  if (dashParts.length === 2) {
    const a = dashParts[0]!.trim();
    const b = dashParts[1]!.trim();
    const bUfFromLabel = b.match(/^estado\s*:\s*([A-Za-z]{2})$/i);
    if (bUfFromLabel) {
      const cityFromA = a.replace(/^\s*cidade\s*:\s*/i, "").trim();
      const uf = bUfFromLabel[1]!.toUpperCase();
      if (cityFromA && uf.length === 2) return { cityName: cityFromA, uf };
    }
    const aUf = /^[A-Za-z]{2}$/.test(a) ? a.toUpperCase() : null;
    const bUf = /^[A-Za-z]{2}$/.test(b) ? b.toUpperCase() : null;
    if (bUf) return { cityName: a, uf: bUf };
    if (aUf) return { cityName: b, uf: aUf };
  }
  const commaParts = t.split(/\s*,\s*/);
  if (commaParts.length >= 2) {
    const last = commaParts[commaParts.length - 1]!.trim().toUpperCase();
    const cityPart = commaParts.slice(0, -1).join(", ").trim();
    if (/^[A-Z]{2}$/.test(last)) return { cityName: cityPart, uf: last };
  }
  return {};
}

export function resolveBillLocationString(
  rawData: Record<string, unknown> | undefined
): string | undefined {
  if (!rawData) return undefined;
  const top = rawData["location"];
  if (typeof top === "string" && top.trim()) return top.trim();

  const evidence = rawData["evidence"];
  if (evidence && typeof evidence === "object" && !Array.isArray(evidence)) {
    const evLoc = (evidence as Record<string, unknown>)["location"];
    if (evLoc && typeof evLoc === "object" && !Array.isArray(evLoc)) {
      const o = evLoc as Record<string, unknown>;
      const val = typeof o["value"] === "string" ? o["value"].trim() : "";
      const snip = typeof o["sourceSnippet"] === "string" ? o["sourceSnippet"].trim() : "";
      const pick = val || snip;
      if (pick && pick !== "(sem valor)" && !pick.startsWith("(trecho") && pick.length > 2) {
        return pick;
      }
    }
  }
  return undefined;
}

export function irradiacaoFromSolarResource(solarResource: unknown): number | undefined {
  if (!solarResource || typeof solarResource !== "object") return undefined;
  const annual = (solarResource as { annual?: unknown }).annual;
  if (typeof annual !== "number" || !Number.isFinite(annual) || annual <= 0) return undefined;
  const scaled = annual / 30;
  return Math.min(260, Math.max(95, Math.round(scaled * 10) / 10));
}

export function simulateProposal(
  input: QuickEconomiaSimulationInput
): QuickEconomiaSimulationResult {
  const { consumo, valorConta, tarifa, irradiacao, roofType = "ceramic" } = input;
  let consumoFinal = consumo;
  if (!consumoFinal && valorConta) {
    consumoFinal = valorConta / 0.8;
  }

  const safeConsumption = consumoFinal && consumoFinal > 0 ? consumoFinal : 350;
  const tarifaFinal =
    tarifa || (valorConta && safeConsumption ? valorConta / safeConsumption : 0.8) || 0.8;
  const compensavel = valorConta ? valorConta * 0.85 : safeConsumption * tarifaFinal;
  const geracaoNecessaria = safeConsumption * 1.2;
  const roofF = ROOF_SOLAR_FACTOR[roofType] ?? 1;
  const geracaoBase = Math.max(40, (irradiacao || 140) * roofF);
  const tamanhoSistema =
    input.systemKw && input.systemKw > 0 ? input.systemKw : geracaoNecessaria / geracaoBase;
  const valorSistema = tamanhoSistema * 5000;
  const economiaMensal = compensavel;
  const economiaAnual = economiaMensal * 12;
  const payback = economiaAnual > 0 ? valorSistema / economiaAnual : 0;

  return {
    economiaMensal,
    valorSistema,
    payback,
    tamanhoSistema,
    monthlyConsumptionKwh: safeConsumption,
  };
}

export type PrepareQuickEconomiaFromExtractedResult =
  | {
      ok: true;
      input: QuickEconomiaSimulationInput;
      estimateNote?: string;
    }
  | { ok: false; error: string };

export function prepareQuickEconomiaFromExtracted(
  extracted: BillExtractedLike | null | undefined,
  base: { irradiacao?: number; roofType: QuickEconomiaRoofType }
): PrepareQuickEconomiaFromExtractedResult {
  const ex = extracted ?? null;
  const debugRaw =
    ex?.rawData && typeof ex.rawData === "object"
      ? (ex.rawData as Record<string, unknown>)
      : undefined;
  const simKwh = debugRaw ? parseExtractedNumber(debugRaw["simulationMonthlyConsumptionKwh"]) : 0;
  const refKwh = parseExtractedNumber(ex?.consumptionKwh);
  const kwhBase = simKwh > 0 ? simKwh : refKwh;
  const gdAdj = applyLegacyGdSimulationKwh(kwhBase, debugRaw);
  const kwh = gdAdj.kwh;
  let estimateNote = gdAdj.note;
  const totalRaw = parseExtractedNumber(ex?.totalAmount);
  const total = totalRaw > 0 ? totalRaw : undefined;
  const roof = base.roofType;

  if (kwh > 0) {
    return {
      ok: true,
      input: {
        consumo: kwh,
        valorConta: total,
        irradiacao: base.irradiacao,
        roofType: roof,
      },
      ...(estimateNote ? { estimateNote } : {}),
    };
  }
  if (total !== undefined) {
    const note =
      "O consumo em kWh não foi lido na conta; usamos o valor da fatura (R$) para estimar a simulação (mesma lógica do modo manual só com valor). Confira no modo manual se quiser informar o kWh exato.";
    estimateNote = estimateNote ? `${estimateNote}\n${note}` : note;
    return {
      ok: true,
      input: {
        consumo: undefined,
        valorConta: total,
        irradiacao: base.irradiacao,
        roofType: roof,
      },
      estimateNote,
    };
  }
  return {
    ok: false,
    error:
      "Não encontramos o consumo em kWh nem o valor total da fatura na leitura automática. Use o modo manual ou envie uma cópia mais nítida.",
  };
}

export interface PersistedSimulationInputDraft {
  systemSizeKw: number;
  investmentAmount: number;
  financingType: "CASH";
  energyPriceKwh: number;
  sizing: { monthlyConsumptionKwh: number; [key: string]: unknown };
  solarResource?: unknown;
}

export type BillSizingSource = BillExtractedLike & { referenceMonth?: string };

export function sizingBillHistoryFromExtracted(extracted: BillSizingSource | null | undefined): {
  billConsumptionHistoryKwh?: number[];
  billConsumptionHistoryLabeled?: Array<{ month: string; consumptionKwh: number }>;
  billReferenceMonth?: string;
} {
  if (!extracted) return {};
  const ref = typeof extracted.referenceMonth === "string" ? extracted.referenceMonth.trim() : "";
  const raw =
    extracted.rawData && typeof extracted.rawData === "object" && !Array.isArray(extracted.rawData)
      ? (extracted.rawData as Record<string, unknown>)
      : null;

  const out: {
    billConsumptionHistoryKwh?: number[];
    billConsumptionHistoryLabeled?: Array<{ month: string; consumptionKwh: number }>;
    billReferenceMonth?: string;
  } = {};
  if (ref) out.billReferenceMonth = ref;

  const labeledRaw = raw?.["consumptionHistoryLabeled"];
  if (Array.isArray(labeledRaw) && labeledRaw.length > 0) {
    const rows: Array<{ month: string; consumptionKwh: number }> = [];
    for (const item of labeledRaw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const o = item as Record<string, unknown>;
      const m = String(o["month"] ?? o["monthLabel"] ?? o["label"] ?? "").trim();
      const k = Number(o["consumptionKwh"] ?? o["kwh"] ?? o["consumption_kwh"]);
      if (m && Number.isFinite(k) && k > 0 && k < 200_000) {
        rows.push({ month: m, consumptionKwh: Math.round(k) });
      }
    }
    if (rows.length) {
      out.billConsumptionHistoryLabeled = rows;
      return out;
    }
  }

  const hist = raw?.["consumptionHistoryKwh"];
  if (Array.isArray(hist) && hist.length > 0) {
    const nums = hist
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 200_000)
      .map((n) => Math.round(n));
    if (nums.length) out.billConsumptionHistoryKwh = nums;
  }

  return out;
}

export function quickResultToPersistedSimulationDraft(
  quick: QuickEconomiaSimulationResult,
  opts?: { sizingExtras?: Record<string, unknown>; solarResource?: unknown }
): PersistedSimulationInputDraft {
  const monthlyKwh = Math.max(1, Math.round(quick.monthlyConsumptionKwh));
  const energyPrice =
    monthlyKwh > 0 && quick.economiaMensal > 0
      ? Math.min(2.5, Math.max(0.25, quick.economiaMensal / monthlyKwh))
      : 0.85;
  const sizing: { monthlyConsumptionKwh: number; [key: string]: unknown } = {
    monthlyConsumptionKwh: monthlyKwh,
    ...(opts?.sizingExtras ?? {}),
  };
  return {
    systemSizeKw: Math.max(0.5, quick.tamanhoSistema),
    investmentAmount: Math.max(1000, Math.round(quick.valorSistema)),
    financingType: "CASH",
    energyPriceKwh: energyPrice,
    sizing,
    ...(opts?.solarResource != null ? { solarResource: opts.solarResource } : {}),
  };
}
