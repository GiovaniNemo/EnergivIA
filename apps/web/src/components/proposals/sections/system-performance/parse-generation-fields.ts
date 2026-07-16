import type { PreviewRenderVariables } from "@/components/proposals/editor/section-render/types";
import type { SystemPerformanceSectionProps, SystemPerformanceTheme } from "./types";

export const DEFAULT_GENERATION_MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export const DEFAULT_CONSUMO_SERIES = [820, 780, 760, 720, 710, 750, 800, 820, 954, 900, 860, 840];
export const DEFAULT_PRODUCAO_SERIES = [720, 740, 780, 800, 820, 780, 760, 800, 872, 850, 780, 720];

const DEFAULT_CONSUMO = DEFAULT_CONSUMO_SERIES;
const DEFAULT_PRODUCAO = DEFAULT_PRODUCAO_SERIES;

function parseNumberArray(raw: unknown, fallback: number[]): number[] {
  if (!Array.isArray(raw)) return [...fallback];
  const out = raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  return out.length ? out : [...fallback];
}

function parseStringArray(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const out = raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  return out.length ? out : [...fallback];
}

function num(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function parseNumericVariable(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const compact = raw.replace(/\s/g, "").replace(",", ".");
    const m = compact.match(/-?\d+(?:\.\d+)?/);
    if (m?.[0]) {
      const n = Number(m[0]);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function resolveGenerationScalars(
  fields: Record<string, unknown>,
  vars?: PreviewRenderVariables | null
): Pick<
  SystemPerformanceSectionProps,
  "potencia" | "geracaoMensal" | "cobertura" | "equivalenteAmbiental"
> {
  const potenciaField = num(fields["potencia"], NaN);
  const potencia =
    parseNumericVariable(vars?.potencia_sistema_kwp) ??
    parseNumericVariable(vars?.tamanho_sistema_kw) ??
    (Number.isFinite(potenciaField) ? potenciaField : undefined);

  const geracaoMensal =
    parseNumericVariable(vars?.geracao_mensal_kwh) ?? num(fields["geracaoMensal"], 872);

  const coberturaPctRaw =
    parseNumericVariable(vars?.cobertura_consumo_pct) ?? num(fields["coberturaPercent"], 80);

  const equivalenteAmbiental =
    parseNumericVariable(vars?.equivalente_arvores_ano) ??
    Math.round(num(fields["equivalenteAmbiental"], 240));

  return {
    potencia: potencia ?? 8,
    geracaoMensal,
    cobertura: Math.max(0, Math.min(1, coberturaPctRaw / 100)),
    equivalenteAmbiental: Math.round(equivalenteAmbiental),
  };
}

function isTwelveNumberSeries(raw: unknown): raw is number[] {
  return Array.isArray(raw) && raw.length === 12 && raw.every((v) => Number.isFinite(Number(v)));
}

export function parseGenerationConsumptionFields(
  fields: Record<string, unknown>,
  theme: SystemPerformanceTheme,
  vars?: PreviewRenderVariables | null,
  chartOverride?: { consumoMensal: number[]; producaoMensal: number[] } | null
): SystemPerformanceSectionProps {
  const meses = parseStringArray(fields["meses"], [...DEFAULT_GENERATION_MESES]);
  const consumoOverride = chartOverride?.consumoMensal;
  const producaoOverride = chartOverride?.producaoMensal;
  const consumoMensal = isTwelveNumberSeries(consumoOverride)
    ? consumoOverride.map((v) => Number(v))
    : parseNumberArray(fields["consumoMensal"], DEFAULT_CONSUMO);
  const producaoMensal = isTwelveNumberSeries(producaoOverride)
    ? producaoOverride.map((v) => Number(v))
    : parseNumberArray(fields["producaoMensal"], DEFAULT_PRODUCAO);
  const scalars = resolveGenerationScalars(fields, vars);

  return {
    ...scalars,
    consumoMensal,
    producaoMensal,
    meses,
    theme,
  };
}
