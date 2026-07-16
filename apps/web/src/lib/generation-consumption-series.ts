import { consumptionSeriesFromSizing } from "@/lib/bill-consumption-calendar-series";
import type { FinancialSimulationInputJson, FinancialSimulationResultJson } from "@/lib/leads-api";

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function parseSolarMonthlyWhM2Day(solar: unknown): number[] | null {
  if (!solar || typeof solar !== "object") return null;
  const monthly = (solar as { monthly?: unknown }).monthly;
  if (!Array.isArray(monthly) || monthly.length !== 12) return null;
  const nums = monthly.map((v) => Number(v));
  return nums.every((n) => Number.isFinite(n)) ? nums : null;
}

export function distributeAnnualKwhByMonthlyIrradiance(
  annualKwh: number,
  monthlyWhM2Day: number[]
): number[] {
  const weights = monthlyWhM2Day.map((g, i) => Math.max(0, g) * DAYS_PER_MONTH[i]!);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return Array.from({ length: 12 }, () => Math.max(0, Math.round(annualKwh / 12)));
  return weights.map((w) => Math.max(0, Math.round((annualKwh * w) / sum)));
}

export type GenerationConsumptionChartSeries = {
  consumoMensal: number[];
  producaoMensal: number[];
};

export function buildGenerationConsumptionChartFromSimulation(
  simulation:
    | {
        input: FinancialSimulationInputJson;
        result: FinancialSimulationResultJson;
      }
    | null
    | undefined
): GenerationConsumptionChartSeries | null {
  if (!simulation?.input || !simulation.result) return null;
  const sizingIn = simulation.input.sizing;
  const monthlyConsumption = sizingIn?.monthlyConsumptionKwh;
  if (
    monthlyConsumption == null ||
    !Number.isFinite(monthlyConsumption) ||
    monthlyConsumption <= 0
  ) {
    return null;
  }

  const systemKw = simulation.input.systemSizeKw;
  const sizingRes = simulation.result.sizing;
  const estMonthRaw = sizingRes?.estimatedProductionKwhMonth;
  const estMonth =
    estMonthRaw != null && Number.isFinite(estMonthRaw) && estMonthRaw > 0
      ? estMonthRaw
      : Number.isFinite(systemKw) && systemKw > 0
        ? systemKw * 150
        : NaN;
  if (!Number.isFinite(estMonth) || estMonth <= 0) return null;

  const annualProd = estMonth * 12;
  const solarMonthly = parseSolarMonthlyWhM2Day(simulation.input.solarResource);
  const producaoMensal = solarMonthly
    ? distributeAnnualKwhByMonthlyIrradiance(annualProd, solarMonthly)
    : Array.from({ length: 12 }, () => Math.round(estMonth));

  const roundedConsumption = Math.max(1, Math.round(monthlyConsumption));
  const fromBill = consumptionSeriesFromSizing(sizingIn);
  const consumoMensal = fromBill ?? Array.from({ length: 12 }, () => roundedConsumption);

  return { consumoMensal, producaoMensal };
}
