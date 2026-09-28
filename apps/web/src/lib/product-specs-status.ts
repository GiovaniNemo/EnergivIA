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
    n.includes("GANCHO")
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
  const rulesByCategory: Record<
    string,
    Array<{ key: string; label: string; aliases?: string[] }>
  > = {
    inverter: [
      { key: "nominal_power_w", label: "Potência Nominal CA" },
      { key: "max_dc_voltage", label: "Tensão DC Máx", aliases: ["max_input_voltage"] },
      { key: "mppt_count", label: "Nº de MPPTs", aliases: ["channels"] },
      { key: "mppt_voltage_min", label: "Tensão MPPT Mín" },
      { key: "mppt_voltage_max", label: "Tensão MPPT Máx" },
      { key: "max_input_current", label: "Corrente Entrada Máx" },
    ],
    hybrid_inverter: [
      { key: "nominal_power_w", label: "Potência Nominal CA" },
      { key: "max_dc_voltage", label: "Tensão DC Máx", aliases: ["max_input_voltage"] },
      { key: "mppt_count", label: "Nº de MPPTs", aliases: ["channels"] },
      { key: "mppt_voltage_min", label: "Tensão MPPT Mín" },
      { key: "mppt_voltage_max", label: "Tensão MPPT Máx" },
      { key: "max_input_current", label: "Corrente Entrada Máx" },
    ],
    off_grid_inverter: [
      { key: "nominal_power_w", label: "Potência Nominal CA" },
      { key: "battery_nominal_voltage_v", label: "Tensão da Bateria" },
    ],
    microinverter: [
      { key: "channels", label: "Canais / MPPTs", aliases: ["mppt_count"] },
      { key: "max_input_voltage", label: "Tensão Entrada Máx", aliases: ["max_dc_voltage"] },
      { key: "max_input_current", label: "Corrente Entrada Máx" },
      {
        key: "max_module_power",
        label: "Potência Máx do Módulo",
        aliases: ["nominal_power_w", "max_dc_power"],
      },
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
    const hasMain = isValidValue(safeSpecs[field.key]);
    const hasAlias = field.aliases?.some((aliasKey) => isValidValue(safeSpecs[aliasKey]));
    if (hasMain || hasAlias) {
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

export interface EquipmentHighlights {
  voltageLabel?: string | null;
  overloadLabel?: string | null;
  mpptLabel?: string | null;
  powerLabel?: string | null;
  mpptRangeLabel?: string | null;
}

export function getEquipmentHighlights(
  categoryName?: string | null,
  specs?: Record<string, unknown> | null,
  productName?: string | null
): EquipmentHighlights | null {
  const normCat = normalizeCategory(categoryName);
  const s = (specs || {}) as Record<string, unknown>;
  const nameUpper = (productName || "").toUpperCase();

  const isInv =
    normCat === "inverter" ||
    normCat === "hybrid_inverter" ||
    normCat === "off_grid_inverter" ||
    normCat === "microinverter";

  const isModule = normCat === "module";

  if (isInv) {
    // 1. Tensão / Padrão de Rede (220V ou 380V)
    let voltageLabel: string | null = null;
    const top = String(s["grid_topology"] || s["grid_standard"] || "").toLowerCase();
    const outV = String(s["output_voltage_v"] || "").toUpperCase();

    // Prioridade máxima: o que está salvo na Ficha Técnica (grid_topology / output_voltage_v)
    if (top === "tri_220" || (top.includes("220") && top.includes("tri"))) {
      voltageLabel = "Trifásico 220V";
    } else if (top === "tri_380" || (top.includes("380") && top.includes("tri"))) {
      voltageLabel = "Trifásico 380V";
    } else if (top === "mono_220" || (top.includes("220") && top.includes("mono"))) {
      voltageLabel = "Monofásico 220V";
    } else if (outV === "380V" || outV === "380V/220V") {
      voltageLabel = "Trifásico 380V";
    } else if (outV === "220V") {
      voltageLabel = Number(s["nominal_power_w"]) > 10000 ? "Trifásico 220V" : "Monofásico 220V";
    } else if (outV) {
      voltageLabel = outV;
    } else if (nameUpper) {
      // Fallback: somente quando a ficha técnica NÃO tiver topologia nem tensão preenchidas
      if (nameUpper.includes("380V") || nameUpper.includes("380 V")) {
        voltageLabel = "Trifásico 380V";
      } else if (
        nameUpper.includes("TRIFAS") &&
        (nameUpper.includes("220V") || nameUpper.includes("220 V"))
      ) {
        voltageLabel = "Trifásico 220V";
      } else if (nameUpper.includes("MONOFAS") || nameUpper.includes("MONO")) {
        voltageLabel = "Monofásico 220V";
      } else if (nameUpper.includes("220V") || nameUpper.includes("220 V")) {
        voltageLabel = Number(s["nominal_power_w"]) > 10000 ? "Trifásico 220V" : "220V";
      }
    }

    // 2. Overload / Ratio DC/AC
    let overloadLabel: string | null = null;
    const maxRatio = Number(s["recommended_dc_ac_ratio_max"]);
    if (!isNaN(maxRatio) && maxRatio > 1) {
      overloadLabel = `Overload ${Math.round(maxRatio * 100)}%`;
    } else if (s["max_dc_power"] && s["nominal_power_w"]) {
      const nom = Number(s["nominal_power_w"]);
      const maxDc = Number(s["max_dc_power"]);
      if (nom > 0 && maxDc > nom) {
        overloadLabel = `Overload ${Math.round((maxDc / nom) * 100)}%`;
      }
    }

    // 3. MPPTs
    let mpptLabel: string | null = null;
    if (s["mppt_count"]) {
      mpptLabel = `${s["mppt_count"]} MPPT${Number(s["mppt_count"]) > 1 ? "s" : ""}`;
    } else if (s["channels"]) {
      mpptLabel = `${s["channels"]} Canais`;
    }

    // 4. Faixa MPPT
    let mpptRangeLabel: string | null = null;
    if (s["mppt_voltage_min"] && s["mppt_voltage_max"]) {
      mpptRangeLabel = `${s["mppt_voltage_min"]}-${s["mppt_voltage_max"]}V`;
    }

    // 5. Potência Nominal
    let powerLabel: string | null = null;
    if (s["nominal_power_w"]) {
      const kw = Number(s["nominal_power_w"]) / 1000;
      powerLabel = `${kw % 1 === 0 ? kw : kw.toFixed(1)} kW`;
    }

    if (!voltageLabel && !overloadLabel && !mpptLabel && !powerLabel && !mpptRangeLabel) {
      return null;
    }
    return { voltageLabel, overloadLabel, mpptLabel, powerLabel, mpptRangeLabel };
  }

  if (isModule) {
    let powerLabel: string | null = null;
    if (s["power_w"]) {
      powerLabel = `${s["power_w"]} Wp`;
    }
    let vocLabel: string | null = null;
    if (s["voc"]) {
      vocLabel = `Voc ${s["voc"]}V`;
    }
    return { powerLabel, voltageLabel: vocLabel };
  }

  return null;
}
