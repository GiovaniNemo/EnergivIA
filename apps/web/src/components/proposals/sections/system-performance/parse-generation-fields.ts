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

function parseMonthLabel(item: unknown, fallback: string): string {
  if (item == null) return fallback;
  if (typeof item === "string") {
    const trimmed = item.trim();
    return trimmed || fallback;
  }
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const val = obj["mes"] ?? obj["month"] ?? obj["name"] ?? obj["label"];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return fallback;
}

function parseStringArray(raw: unknown, fallback: string[]): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const out = raw.map((v, i) => parseMonthLabel(v, fallback[i] ?? ""));
  return out.length ? out : [...fallback];
}

function num(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function parseNumericVariable(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const clean = raw.trim().replace(/\s/g, "");

    // Padrão pt-BR com milhar e decimal (ex: "1.050,50" ou "12.300,00")
    if (/^\D*\d{1,3}(?:\.\d{3})+,\d+/.test(clean)) {
      const sanitized = clean.replace(/[^\d,]/g, "").replace(",", ".");
      const n = Number(sanitized);
      if (Number.isFinite(n)) return n;
    }

    // Padrão pt-BR apenas com separador de milhar (ex: "1.050" ou "12.500" seguido ou não de unidade)
    if (/^\D*(\d{1,3})\.(\d{3})(?:\D.*)?$/.test(clean)) {
      const m = clean.match(/^(\D*)(\d{1,3})\.(\d{3})(.*)$/);
      if (m?.[2] && m?.[3]) {
        const n = Number(`${m[2]}${m[3]}`);
        if (Number.isFinite(n)) return n;
      }
    }

    // Padrão com vírgula decimal (ex: "8,40" ou "3,1")
    if (/^\D*-?\d+,\d+/.test(clean)) {
      const sanitized = clean.replace(",", ".");
      const m = sanitized.match(/-?\d+(?:\.\d+)?/);
      if (m?.[0]) {
        const n = Number(m[0]);
        if (Number.isFinite(n)) return n;
      }
    }

    // Padrão numérico decimal com ponto ou inteiro direto (ex: "8.40", "1050")
    const m = clean.match(/-?\d+(?:\.\d+)?/);
    if (m?.[0]) {
      const n = Number(m[0]);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function resolveGenerationScalars(
  fields: Record<string, unknown>,
  vars?: PreviewRenderVariables | null,
  fallbackFromSeries?: number
): Pick<
  SystemPerformanceSectionProps,
  "potencia" | "geracaoMensal" | "cobertura" | "equivalenteAmbiental"
> {
  const potenciaField = num(fields["potencia"], NaN);
  const potencia =
    parseNumericVariable(vars?.potencia_sistema_kwp) ??
    parseNumericVariable(vars?.tamanho_sistema_kw) ??
    (Number.isFinite(potenciaField) ? potenciaField : undefined);

  let geracaoMensal =
    parseNumericVariable(vars?.geracao_mensal_kwh) ??
    parseNumericVariable(fields["geracaoMensal"]) ??
    parseNumericVariable(fields["producaoMensal"]) ??
    (fallbackFromSeries && fallbackFromSeries > 0 ? fallbackFromSeries : 872);

  // Salvaguarda contra anomalia de truncamento/float (ex: "1.050" que virou 1.05 e foi arredondado para 1)
  if (geracaoMensal <= 10 && potencia && potencia > 1) {
    geracaoMensal =
      fallbackFromSeries && fallbackFromSeries > 10
        ? fallbackFromSeries
        : Math.round(potencia * 125);
  }

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
  const rawMeses = fields["meses"];
  const meses = parseStringArray(rawMeses, [...DEFAULT_GENERATION_MESES]);

  // Se fields["meses"] for um array de objetos contendo { mes, consumo, producao }
  let extractedConsumoFromMeses: number[] | null = null;
  let extractedProducaoFromMeses: number[] | null = null;
  if (
    Array.isArray(rawMeses) &&
    rawMeses.length >= 12 &&
    typeof rawMeses[0] === "object" &&
    rawMeses[0] !== null
  ) {
    const cList = rawMeses.map((it) => Number((it as Record<string, unknown>)["consumo"]));
    const pList = rawMeses.map((it) =>
      Number(
        (it as Record<string, unknown>)["producao"] ?? (it as Record<string, unknown>)["geracao"]
      )
    );
    if (cList.every((n) => Number.isFinite(n) && n > 0)) extractedConsumoFromMeses = cList;
    if (pList.every((n) => Number.isFinite(n) && n > 0)) extractedProducaoFromMeses = pList;
  }

  const consumoOverride = chartOverride?.consumoMensal;
  const producaoOverride = chartOverride?.producaoMensal;

  const consumoMensal = isTwelveNumberSeries(consumoOverride)
    ? consumoOverride.map((v) => Number(v))
    : isTwelveNumberSeries(fields["consumoMensal"])
      ? parseNumberArray(fields["consumoMensal"], DEFAULT_CONSUMO)
      : (extractedConsumoFromMeses ?? parseNumberArray(fields["consumoMensal"], DEFAULT_CONSUMO));

  const producaoMensal = isTwelveNumberSeries(producaoOverride)
    ? producaoOverride.map((v) => Number(v))
    : isTwelveNumberSeries(fields["producaoMensal"])
      ? parseNumberArray(fields["producaoMensal"], DEFAULT_PRODUCAO)
      : (extractedProducaoFromMeses ??
        parseNumberArray(fields["producaoMensal"], DEFAULT_PRODUCAO));

  const avgProducao = Math.round(producaoMensal.reduce((a, b) => a + b, 0) / producaoMensal.length);
  const scalars = resolveGenerationScalars(fields, vars, avgProducao);

  return {
    ...scalars,
    consumoMensal,
    producaoMensal,
    meses,
    theme,
  };
}
