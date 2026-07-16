export const COST_RULE_NAME_PRESET_GROUPS = [
  {
    label: "💰 Financeiro",
    names: ["Margem", "Comissão / representante"] as const,
  },
  {
    label: "⚡ Equipamentos",
    names: ["Equipamento CC", "Equipamento CA"] as const,
  },
  {
    label: "👷 Instalação",
    names: ["Mão de obra"] as const,
  },
  {
    label: "🧾 Operacional",
    names: [
      "Projeto / engenharia",
      "Homologação / conexão",
      "Logística / frete",
      "Despesas operacionais",
    ] as const,
  },
] as const;

export type CostRuleNamePreset = (typeof COST_RULE_NAME_PRESET_GROUPS)[number]["names"][number];

export const COST_RULE_NAME_PRESETS = COST_RULE_NAME_PRESET_GROUPS.flatMap((g) => [
  ...g.names,
]) as unknown as readonly [CostRuleNamePreset, ...CostRuleNamePreset[]];

export const COST_RULE_NAME_OTHER = "__OTHER__" as const;

export function isCanonicalCostRuleName(name: string): name is CostRuleNamePreset {
  return (COST_RULE_NAME_PRESETS as readonly string[]).includes(name);
}

export const COST_RULE_NAME_PRESET_ENUM_TUPLE = COST_RULE_NAME_PRESETS as unknown as [
  string,
  ...string[],
];

export const CALCULATION_LABELS: Record<"FIXED" | "PERCENTAGE" | "PER_KWP", string> = {
  FIXED: "Valor fixo (R$)",
  PERCENTAGE: "Percentual (%)",
  PER_KWP: "Valor por kWp (R$/kWp)",
};

export type CostRulePercentageBaseUi = "SALE_PRICE" | "PROJECT_COST" | "PROFIT";

export const PERCENTAGE_BASE_OPTIONS: {
  value: CostRulePercentageBaseUi;
  title: string;
  description: string;
  hint: string;
  advanced?: boolean;
}[] = [
  {
    value: "SALE_PRICE",
    title: "💰 Sobre o valor da venda",
    description: "O percentual incide sobre o valor final da proposta (preço ao cliente).",
    hint: "Indicado para margem comercial ou comissão de vendas.",
  },
  {
    value: "PROJECT_COST",
    title: "🧾 Sobre o custo do projeto",
    description:
      "O percentual incide sobre equipamentos e custos diretos (fixos e por kWp), antes da margem sobre o preço de venda.",
    hint: "Indicado para despesas operacionais ou taxas sobre a base de custo.",
  },
  {
    value: "PROFIT",
    title: "📈 Sobre o lucro (avançado)",
    advanced: true,
    description:
      "O percentual incide sobre o lucro bruto estimado (preço de venda calculado menos custos até então). O valor entra no total da proposta.",
    hint: "Uso avançado; confira o impacto no valor final antes de guardar.",
  },
];

export function isMarginOrCommissionName(name: string): boolean {
  const t = name.trim();
  return t === "Margem" || t === "Comissão / representante";
}

export function isLaborCostName(name: string): boolean {
  return name.trim() === "Mão de obra";
}

export function autoPercentSaleContextLine(name: string): string | null {
  const t = name.trim();
  if (t === "Margem") return "Aplicado sobre o preço final da proposta.";
  if (t === "Comissão / representante")
    return "Aplicado sobre o valor da venda (preço ao cliente).";
  return null;
}

export function suggestPercentageBaseForCostName(name: string): CostRulePercentageBaseUi {
  const t = name.trim();
  if (t === "Margem" || t === "Comissão / representante") return "SALE_PRICE";
  if (t === "Despesas operacionais") return "PROJECT_COST";
  return "PROJECT_COST";
}

export function percentageBaseShortLabel(
  base: CostRulePercentageBaseUi | null | undefined
): string {
  if (base === "SALE_PRICE") return "Preço de venda";
  if (base === "PROFIT") return "Lucro";
  return "Custo do projeto";
}
