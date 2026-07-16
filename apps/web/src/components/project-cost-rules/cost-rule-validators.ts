import type { CostRulePercentageBase, CostRuleRow } from "@/lib/cost-rules-api";

function isFinancialSalePriceRule(r: CostRuleRow): boolean {
  if (r.name !== "Margem" && r.name !== "Comissão / representante") return false;
  if (r.calculationType !== "PERCENTAGE") return false;
  const base = r.percentageBase ?? "SALE_PRICE";
  return base === "SALE_PRICE";
}

type KwpInterval = { min: number | null; max: number | null };

function toNumericRange(m: KwpInterval): { lo: number; hi: number } {
  if (m.min === null && m.max === null) {
    return { lo: 0, hi: Number.POSITIVE_INFINITY };
  }
  const lo = m.min ?? 0;
  const hi = m.max === null ? Number.POSITIVE_INFINITY : m.max;
  return { lo, hi };
}

function intervalsOverlap(a: KwpInterval, b: KwpInterval): boolean {
  const A = toNumericRange(a);
  const B = toNumericRange(b);
  return Math.max(A.lo, B.lo) < Math.min(A.hi, B.hi);
}

export function sumOverlappingMarginCommissionSalePercents(
  rules: CostRuleRow[],
  excludeRuleId: string | undefined,
  candidate: {
    name: string;
    calculationType: string;
    value: number;
    percentageBase: CostRulePercentageBase | null;
    minKwp: number | null;
    maxKwp: number | null;
  }
): number {
  if (candidate.name !== "Margem" && candidate.name !== "Comissão / representante") {
    return 0;
  }
  if (candidate.calculationType !== "PERCENTAGE") return 0;
  const cBase = candidate.percentageBase ?? "SALE_PRICE";
  if (cBase !== "SALE_PRICE") return 0;

  const candidateIv: KwpInterval = {
    min: candidate.minKwp,
    max: candidate.maxKwp,
  };

  let sum = 0;
  for (const r of rules) {
    if (excludeRuleId && r.id === excludeRuleId) continue;
    if (!isFinancialSalePriceRule(r)) continue;
    const ruleIv: KwpInterval = { min: r.minKwp, max: r.maxKwp };
    if (intervalsOverlap(candidateIv, ruleIv)) {
      sum += r.value;
    }
  }
  sum += candidate.value;
  return sum;
}

export function marginCommissionSalePercentExceededMessage(
  rules: CostRuleRow[],
  excludeRuleId: string | undefined,
  candidate: Parameters<typeof sumOverlappingMarginCommissionSalePercents>[2]
): string | null {
  const sum = sumOverlappingMarginCommissionSalePercents(rules, excludeRuleId, candidate);
  if (sum > 100 + 1e-6) {
    return "Margem e comissão somadas não podem ultrapassar 100% sobre o valor da venda (na mesma faixa de potência).";
  }
  return null;
}
