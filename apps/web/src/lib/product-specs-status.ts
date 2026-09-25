export interface SpecsCompletenessStatus {
  isComplete: boolean;
  missingFields: string[];
  filledCount: number;
  totalRequired: number;
  tooltipText: string;
  badgeLabel: string;
  color: "success" | "error" | "default";
}

export function normalizeCategory(categoryName?: string | null): string {
  const norm = (categoryName || "").trim().toLowerCase();
  if (!norm) return "";
  if (norm.includes("struct") || norm.includes("estrutur")) return "structure_kit";
  if (norm.includes("micro")) return "microinverter";
  if (norm.includes("hybrid") || norm.includes("hibrid")) return "hybrid_inverter";
  if (norm.includes("off_grid") || norm.includes("offgrid")) return "off_grid_inverter";
  if (norm.includes("inv")) return "inverter";
  if (norm.includes("mod") || norm.includes("pain") || norm.includes("placa")) return "module";
  if (norm.includes("cabo") || norm.includes("cable")) return "dc_cable";
  if (norm.includes("conec") || norm.includes("connect")) return "connector";
  if (norm.includes("string") || norm.includes("box")) return "string_box";
  if (norm.includes("perfil") || norm.includes("profile")) return "profile";
  if (norm.includes("bms")) return "bms";
  if (norm.includes("bat") || norm.includes("acumulad")) return "battery";
  return norm;
}

function isValidValue(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "boolean") return true;
  if (typeof val === "number") return !isNaN(val) && val > 0;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return false;
    const num = Number(trimmed.replace(",", "."));
    // Se for representação numérica, valida se é número positivo
    if (!isNaN(num)) return num > 0;
    // Se for string textual (ex: "ceramic", "mc4", "metal", etc.), é válida se não for vazia
    return true;
  }
  return false;
}

/**
 * Tenta inferir especificações básicas de estrutura a partir do nome do produto.
 */
export function inferStructureSpecsFromName(name: string): {
  roof_type?: "ceramic" | "metal" | "fibromadeira" | "fibrometal" | "ground" | "laje";
  max_modules?: number;
} {
  const n = (name || "").toUpperCase();
  const result: {
    roof_type?: "ceramic" | "metal" | "fibromadeira" | "fibrometal" | "ground" | "laje";
    max_modules?: number;
  } = {};

  // Inferência de número de módulos
  const modMatch = n.match(/(\d+)\s*(?:PAINEIS|PAINÉIS|MODULOS|MÓDULOS|PLACAS)/);
  if (modMatch && modMatch[1]) {
    const parsed = parseInt(modMatch[1], 10);
    if (parsed > 0) result.max_modules = parsed;
  }

  // Inferência de tipo de telhado
  if (n.includes("FIBROMADEIRA") || (n.includes("FIBRO") && n.includes("MADEIRA"))) {
    result.roof_type = "fibromadeira";
  } else if (n.includes("FIBROMETAL") || (n.includes("FIBRO") && n.includes("METAL"))) {
    result.roof_type = "fibrometal";
  } else if (
    n.includes("TELHA METALICA") ||
    n.includes("METÁLICA") ||
    n.includes("MINI TRILHO") ||
    n.includes("ZINCO") ||
    n.includes("ONDULADA")
  ) {
    result.roof_type = "metal";
  } else if (n.includes("SOLO") || n.includes("TERRESTRE")) {
    result.roof_type = "ground";
  } else if (n.includes("LAJE")) {
    result.roof_type = "laje";
  } else if (
    n.includes("COLONIAL") ||
    n.includes("CERAMIC") ||
    n.includes("CERÂMIC") ||
    n.includes("GANCHO") ||
    n.includes("HÍBRIDO") ||
    n.includes("HIBRIDO") ||
    n.includes("PERFIL")
  ) {
    result.roof_type = "ceramic";
  }

  return result;
}

export function getProductSpecsStatus(
  categoryName?: string | null,
  specs?: Record<string, unknown> | null
): SpecsCompletenessStatus {
  const normCategory = normalizeCategory(categoryName);
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
    bms: [
      { key: "nominal_voltage_v", label: "Tensão Nominal" },
      { key: "max_current_a", label: "Corrente Máx" },
    ],
    structure_kit: [
      { key: "roof_type", label: "Tipo de telhado" },
      { key: "max_modules", label: "Máx. módulos" },
    ],
    dc_cable: [
      { key: "section_mm2", label: "Seção (mm²)" },
      { key: "max_voltage", label: "Tensão Máx" },
    ],
    connector: [{ key: "type", label: "Tipo de conector" }],
    profile: [{ key: "length_m", label: "Comprimento (m)" }],
    string_box: [
      { key: "inputs_count", label: "Nº de Entradas" },
      { key: "outputs_count", label: "Nº de Saídas" },
      { key: "max_voltage_v", label: "Tensão Máx CC" },
    ],
  };

  const requiredFields = rulesByCategory[normCategory];

  // Se a categoria não possui lista pré-fixada de parâmetros essenciais (ex: other/acessórios)
  if (!requiredFields || requiredFields.length === 0) {
    const filledKeys = Object.keys(safeSpecs).filter((k) => isValidValue(safeSpecs[k]));
    if (filledKeys.length === 0) {
      return {
        isComplete: false,
        missingFields: ["Especificações Técnicas"],
        filledCount: 0,
        totalRequired: 1,
        tooltipText: "Ficha técnica não preenchida",
        badgeLabel: "Incompleta",
        color: "error",
      };
    }
    return {
      isComplete: true,
      missingFields: [],
      filledCount: filledKeys.length,
      totalRequired: filledKeys.length,
      tooltipText: "Ficha técnica preenchida",
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
