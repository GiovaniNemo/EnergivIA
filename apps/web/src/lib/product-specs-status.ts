export interface SpecsCompletenessStatus {
  isComplete: boolean;
  missingFields: string[];
  filledCount: number;
  totalRequired: number;
  tooltipText: string;
  badgeLabel: string;
  color: "success" | "error" | "default";
}

function isValidValue(val: unknown): boolean {
  if (val === undefined || val === null || val === "") return false;
  if (typeof val === "number") return !isNaN(val) && val > 0;
  if (typeof val === "string") {
    const num = Number(val.replace(",", "."));
    return !isNaN(num) && num > 0;
  }
  return true;
}

export function getProductSpecsStatus(
  categoryName?: string | null,
  specs?: Record<string, unknown> | null
): SpecsCompletenessStatus {
  const normCategory = (categoryName || "").trim().toLowerCase();
  const safeSpecs = specs || {};

  // Requisitos essenciais de engenharia por categoria
  const rulesByCategory: Record<string, Array<{ key: string; label: string }>> = {
    inverter: [
      { key: "nominal_power_w", label: "Potência Nominal CA" },
      { key: "max_dc_voltage", label: "Tensão DC Máx" },
      { key: "mppt_count", label: "Nº de MPPTs" },
      { key: "mppt_voltage_min", label: "Tensão MPPT Mín" },
      { key: "mppt_voltage_max", label: "Tensão MPPT Máx" },
      { key: "max_input_current", label: "Corrente Entrada Máx" },
    ],
    hybrid_inverter: [
      { key: "nominal_power_w", label: "Potência Nominal CA" },
      { key: "max_dc_voltage", label: "Tensão DC Máx" },
      { key: "mppt_count", label: "Nº de MPPTs" },
      { key: "mppt_voltage_min", label: "Tensão MPPT Mín" },
      { key: "mppt_voltage_max", label: "Tensão MPPT Máx" },
      { key: "max_input_current", label: "Corrente Entrada Máx" },
    ],
    off_grid_inverter: [
      { key: "nominal_power_w", label: "Potência Nominal CA" },
      { key: "battery_nominal_voltage_v", label: "Tensão da Bateria" },
    ],
    microinverter: [
      { key: "channels", label: "Canais / MPPTs" },
      { key: "max_input_voltage", label: "Tensão Entrada Máx" },
      { key: "max_input_current", label: "Corrente Entrada Máx" },
      { key: "max_module_power", label: "Potência Máx do Módulo" },
    ],
    module: [
      { key: "power_w", label: "Potência (Wp)" },
      { key: "voc", label: "Tensão Aberta (Voc)" },
      { key: "vmp", label: "Tensão Máx Potência (Vmp)" },
      { key: "isc", label: "Corrente Curto (Isc)" },
      { key: "imp", label: "Corrente Máx Potência (Imp)" },
    ],
    battery: [{ key: "capacity_kwh", label: "Capacidade (kWh)" }],
  };

  const requiredFields = rulesByCategory[normCategory];

  // Se a categoria não possui parâmetros críticos de dimensionamento elétrico (ex: estrutura, cabo)
  if (!requiredFields || requiredFields.length === 0) {
    return {
      isComplete: true,
      missingFields: [],
      filledCount: 0,
      totalRequired: 0,
      tooltipText: "Ficha Técnica Sem Parâmetros Críticos",
      badgeLabel: "Completa",
      color: "success",
    };
  }

  const missingFields: string[] = [];
  let filledCount = 0;

  for (const field of requiredFields) {
    if (isValidValue(safeSpecs[field.key])) {
      filledCount++;
    } else {
      missingFields.push(field.label);
    }
  }

  const isComplete = missingFields.length === 0;

  return {
    isComplete,
    missingFields,
    filledCount,
    totalRequired: requiredFields.length,
    tooltipText: isComplete
      ? `Ficha Técnica Completa (${filledCount}/${requiredFields.length} parâmetros preenchidos)`
      : `Ficha Técnica Incompleta (Faltando ${missingFields.length}: ${missingFields.join(", ")})`,
    badgeLabel: isComplete ? "Completa" : `Incompleta (${filledCount}/${requiredFields.length})`,
    color: isComplete ? "success" : "error",
  };
}
