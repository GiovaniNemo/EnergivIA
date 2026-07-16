import type { ProposalProjectCostLine } from "@energivia/shared-types";

export const PROJECT_COST_ESSENTIAL_LABOR_NAME = "Mão de obra" as const;
export const PROJECT_COST_ESSENTIAL_MARGIN_NAME = "Margem" as const;

export type ProjectCostCalculationType = "FIXED" | "PERCENTAGE" | "PER_KWP";

export type ProjectCostPercentageBase = "SALE_PRICE" | "PROJECT_COST" | "PROFIT";

export type ProjectCostRuleInput = {
  id: string;
  name: string;
  calculationType: ProjectCostCalculationType;
  value: number;
  minKwp: number | null;
  maxKwp: number | null;
  percentageBase?: ProjectCostPercentageBase | null;
};

const DEFAULT_LABOR_RULES: ProjectCostRuleInput[] = [
  {
    id: "__system_default_labor_0_5",
    name: PROJECT_COST_ESSENTIAL_LABOR_NAME,
    calculationType: "FIXED",
    value: 1500,
    minKwp: 0,
    maxKwp: 5,
  },
  {
    id: "__system_default_labor_5_10",
    name: PROJECT_COST_ESSENTIAL_LABOR_NAME,
    calculationType: "FIXED",
    value: 2500,
    minKwp: 5,
    maxKwp: 10,
  },
  {
    id: "__system_default_labor_10_inf",
    name: PROJECT_COST_ESSENTIAL_LABOR_NAME,
    calculationType: "FIXED",
    value: 4000,
    minKwp: 10,
    maxKwp: null,
  },
];

const DEFAULT_MARGIN_RULE: ProjectCostRuleInput = {
  id: "__system_default_margin",
  name: PROJECT_COST_ESSENTIAL_MARGIN_NAME,
  calculationType: "PERCENTAGE",
  value: 20,
  minKwp: null,
  maxKwp: null,
  percentageBase: "SALE_PRICE",
};

function organizationHasRuleName(rules: readonly ProjectCostRuleInput[], name: string): boolean {
  return rules.some((r) => r.name === name);
}

export function getDefaultEssentialRulesForSeeding(): ProjectCostRuleInput[] {
  return [...DEFAULT_LABOR_RULES, DEFAULT_MARGIN_RULE];
}

export function mergeOrganizationRulesWithEssentialDefaults(
  organizationRules: readonly ProjectCostRuleInput[]
): {
  merged: Array<{ rule: ProjectCostRuleInput; source: "organization" | "system_default" }>;
  defaultEssentialCostNames: string[];
} {
  const defaultEssentialCostNames: string[] = [];
  const merged: Array<{ rule: ProjectCostRuleInput; source: "organization" | "system_default" }> =
    [];

  for (const r of organizationRules) {
    merged.push({ rule: r, source: "organization" });
  }

  if (!organizationHasRuleName(organizationRules, PROJECT_COST_ESSENTIAL_LABOR_NAME)) {
    defaultEssentialCostNames.push(PROJECT_COST_ESSENTIAL_LABOR_NAME);
    for (const r of DEFAULT_LABOR_RULES) {
      merged.push({ rule: r, source: "system_default" });
    }
  }
  if (!organizationHasRuleName(organizationRules, PROJECT_COST_ESSENTIAL_MARGIN_NAME)) {
    defaultEssentialCostNames.push(PROJECT_COST_ESSENTIAL_MARGIN_NAME);
    merged.push({ rule: DEFAULT_MARGIN_RULE, source: "system_default" });
  }

  return { merged, defaultEssentialCostNames };
}

export function effectivePercentageBase(rule: ProjectCostRuleInput): ProjectCostPercentageBase {
  if (rule.calculationType !== "PERCENTAGE") return "PROJECT_COST";
  const b = rule.percentageBase;
  if (b === "SALE_PRICE" || b === "PROJECT_COST" || b === "PROFIT") return b;
  return "PROJECT_COST";
}

export function projectCostRuleMatchesKwp(
  rule: Pick<ProjectCostRuleInput, "minKwp" | "maxKwp">,
  systemKwp: number
): boolean {
  const minNull = rule.minKwp === null || rule.minKwp === undefined;
  const maxNull = rule.maxKwp === null || rule.maxKwp === undefined;
  if (minNull && maxNull) return true;
  const lo = minNull ? 0 : Number(rule.minKwp);
  if (!Number.isFinite(lo) || lo < 0) return false;
  if (maxNull) {
    return systemKwp >= lo;
  }
  const hi = Number(rule.maxKwp);
  if (!Number.isFinite(hi)) return false;
  return systemKwp >= lo && systemKwp < hi;
}

function pickApplicableMergedRules(
  merged: readonly { rule: ProjectCostRuleInput; source: "organization" | "system_default" }[],
  systemKwp: number
): Array<{ rule: ProjectCostRuleInput; source: "organization" | "system_default" }> {
  const matched = merged.filter((m) => projectCostRuleMatchesKwp(m.rule, systemKwp));
  const byName = new Map<
    string,
    Array<{ rule: ProjectCostRuleInput; source: "organization" | "system_default" }>
  >();
  for (const m of matched) {
    const arr = byName.get(m.rule.name) ?? [];
    arr.push(m);
    byName.set(m.rule.name, arr);
  }
  const picked: Array<{ rule: ProjectCostRuleInput; source: "organization" | "system_default" }> =
    [];
  for (const [, arr] of byName) {
    const org = arr.find((x) => x.source === "organization");
    picked.push(org ?? arr[0]!);
  }
  return picked;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function pushLine(
  lines: ProposalProjectCostLine[],
  rule: ProjectCostRuleInput,
  source: "organization" | "system_default",
  applied: number,
  pctBase?: ProjectCostPercentageBase
): void {
  lines.push({
    ruleId: rule.id.startsWith("__system_") ? null : rule.id,
    name: rule.name,
    calculationType: rule.calculationType,
    value: rule.value,
    appliedAmountBrl: applied,
    minKwp: rule.minKwp,
    maxKwp: rule.maxKwp,
    source,
    ...(pctBase ? { percentageBase: pctBase } : {}),
  });
}

function lineSortOrder(line: ProposalProjectCostLine): number {
  if (line.calculationType !== "PERCENTAGE") return 0;
  const b = line.percentageBase ?? "PROJECT_COST";
  if (b === "PROJECT_COST") return 1;
  if (b === "SALE_PRICE") return 2;
  return 3;
}

export function computeProjectCostSection(
  equipmentSubtotalBrl: number,
  systemKwp: number,
  organizationRules: readonly ProjectCostRuleInput[]
): {
  projectCostLines: ProposalProjectCostLine[];
  defaultEssentialCostNames: string[];
  computedSaleFromCostRulesBrl: number;
} {
  const safeKw = Number.isFinite(systemKwp) && systemKwp > 0 ? systemKwp : 0.5;
  const equip = Math.max(0, roundMoney(equipmentSubtotalBrl));

  const { merged, defaultEssentialCostNames } =
    mergeOrganizationRulesWithEssentialDefaults(organizationRules);
  const picked = pickApplicableMergedRules(merged, safeKw);

  const nonPct = picked.filter((p) => p.rule.calculationType !== "PERCENTAGE");
  const pctPicked = picked.filter((p) => p.rule.calculationType === "PERCENTAGE");

  const projectCostLines: ProposalProjectCostLine[] = [];
  let directExtra = 0;

  for (const { rule, source } of nonPct) {
    let applied = 0;
    if (rule.calculationType === "FIXED") {
      applied = rule.value;
    } else if (rule.calculationType === "PER_KWP") {
      applied = rule.value * safeKw;
    }
    applied = roundMoney(applied);
    directExtra += applied;
    pushLine(projectCostLines, rule, source, applied);
  }

  const base0 = roundMoney(equip + directExtra);

  const pCost: typeof pctPicked = [];
  const pSale: typeof pctPicked = [];
  const pProfit: typeof pctPicked = [];
  for (const x of pctPicked) {
    const b = effectivePercentageBase(x.rule);
    if (b === "PROJECT_COST") pCost.push(x);
    else if (b === "SALE_PRICE") pSale.push(x);
    else pProfit.push(x);
  }

  let sumCostPctAmt = 0;
  for (const { rule, source } of pCost) {
    const applied = roundMoney(base0 * (rule.value / 100));
    sumCostPctAmt += applied;
    pushLine(projectCostLines, rule, source, applied, "PROJECT_COST");
  }
  const cAfter = roundMoney(base0 + sumCostPctAmt);

  const sumSaleRates = pSale.reduce((s, { rule }) => s + rule.value / 100, 0);
  const S = roundMoney(cAfter / (1 - sumSaleRates));

  for (const { rule, source } of pSale) {
    const applied = roundMoney(S * (rule.value / 100));
    pushLine(projectCostLines, rule, source, applied, "SALE_PRICE");
  }

  const grossProfit = Math.max(0, roundMoney(S - cAfter));
  let profitExtra = 0;
  for (const { rule, source } of pProfit) {
    const applied = roundMoney(grossProfit * (rule.value / 100));
    profitExtra += applied;
    pushLine(projectCostLines, rule, source, applied, "PROFIT");
  }

  const computedSaleFromCostRulesBrl = roundMoney(S + profitExtra);

  projectCostLines.sort((a, b) => {
    const oa = lineSortOrder(a);
    const ob = lineSortOrder(b);
    if (oa !== ob) return oa - ob;
    const na = a.name.localeCompare(b.name, "pt-BR");
    if (na !== 0) return na;
    return (a.minKwp ?? 0) - (b.minKwp ?? 0);
  });

  return {
    projectCostLines,
    defaultEssentialCostNames,
    computedSaleFromCostRulesBrl,
  };
}
