import { formatCurrency, formatNumber } from "@energivia/utils";
import type { CostCalculationType, CostRulePercentageBase } from "@/lib/cost-rules-api";
import { percentageBaseShortLabel } from "./cost-rule-presets";

export function formatRuleValue(calculationType: CostCalculationType, value: number): string {
  if (calculationType === "PERCENTAGE") {
    return `${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  }
  if (calculationType === "PER_KWP") {
    return `${formatCurrency(value)} / kWp`;
  }
  return formatCurrency(value);
}

export function previewKwpCondition(
  minKwp: number | null,
  maxKwp: number | null
): { short: string; detail: string } {
  if (minKwp === null && maxKwp === null) {
    return {
      short: "Todos os projetos",
      detail: "Esta regra vale para qualquer potência (kWp).",
    };
  }
  if (minKwp !== null && maxKwp === null) {
    return {
      short: `A partir de ${formatNumber(minKwp)} kWp`,
      detail: `Aplica quando a potência for maior ou igual a ${formatNumber(minKwp)} kWp (sem limite superior).`,
    };
  }
  if (minKwp !== null && maxKwp !== null) {
    return {
      short: `${formatNumber(minKwp)}–${formatNumber(maxKwp)} kWp`,
      detail: `Aplica quando a potência for ≥ ${formatNumber(minKwp)} kWp e < ${formatNumber(maxKwp)} kWp (o limite superior não entra nesta faixa).`,
    };
  }
  return { short: "—", detail: "" };
}

const EXAMPLE_KWP = 5;

function formatKwpSpan(minKwp: number | null, maxKwp: number | null): string {
  if (minKwp === null && maxKwp === null) {
    return "qualquer potência";
  }
  if (minKwp !== null && maxKwp === null) {
    return `potência ≥ ${formatNumber(minKwp)} kWp`;
  }
  if (minKwp !== null && maxKwp !== null) {
    return `projetos entre ${formatNumber(minKwp)} e ${formatNumber(maxKwp)} kWp (o limite superior não entra na faixa)`;
  }
  return "—";
}

export function buildRuleApplicationSummary(args: {
  costName: string;
  calculationType: CostCalculationType;
  value: number;
  percentageBase: CostRulePercentageBase | null | undefined;
  minKwp: number | null;
  maxKwp: number | null;
}): { title: string; primaryLine: string; exampleLine?: string } {
  const { costName, calculationType, value, percentageBase, minKwp, maxKwp } = args;
  const span = formatKwpSpan(minKwp, maxKwp);
  const title = "Como essa regra será aplicada";

  if (calculationType === "PERCENTAGE") {
    const base = percentageBaseShortLabel(percentageBase ?? "PROJECT_COST");
    const pct = formatRuleValue("PERCENTAGE", value);
    const primaryLine = `${costName} de ${pct} sobre ${base.toLowerCase()} (${span}).`;
    const exampleLine = `Exemplo (projeto de ${EXAMPLE_KWP} kWp): o valor em reais depende do preço/custo da proposta; a regra acrescenta ${pct} sobre ${base.toLowerCase()}.`;
    return { title, primaryLine, exampleLine };
  }

  if (calculationType === "PER_KWP") {
    const unit = formatRuleValue("PER_KWP", value);
    const approx = value * EXAMPLE_KWP;
    const primaryLine = `${costName} a ${unit}, para ${span}.`;
    const exampleLine = `Exemplo (${EXAMPLE_KWP} kWp): custo aproximado de ${formatCurrency(approx)} (antes de outros custos da proposta).`;
    return { title, primaryLine, exampleLine };
  }

  const money = formatRuleValue("FIXED", value);
  const primaryLine = `${costName} de ${money} (${span}).`;
  const lo = minKwp ?? 0;
  const inBand =
    minKwp === null && maxKwp === null
      ? true
      : maxKwp === null
        ? EXAMPLE_KWP >= lo
        : EXAMPLE_KWP >= lo && EXAMPLE_KWP < maxKwp;
  const exampleLine = inBand
    ? `Exemplo (${EXAMPLE_KWP} kWp): custo adicionado de ${money} (esta faixa inclui ${EXAMPLE_KWP} kWp).`
    : `Exemplo (${EXAMPLE_KWP} kWp): só há custo se a potência do projeto cair na faixa definida acima.`;
  return { title, primaryLine, exampleLine };
}
