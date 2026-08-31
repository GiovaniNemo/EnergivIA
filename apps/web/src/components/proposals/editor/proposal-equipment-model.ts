import type { ProposalEquipmentLine } from "@energivia/shared-types";

export type { ProposalEquipmentLine };

export interface ProposalEquipmentProductSnapshot {
  id: string;
  name: string;
  imageUrl?: string | null;
  datasheetUrl?: string | null;
  specs: Record<string, unknown>;
  brand: { id: string; name: string; imageUrl?: string | null };
  category: { id: string; name: string };
}

export interface ProposalEquipmentSpec {
  label: string;
  value: string;
  icon: string;
}

export interface ProposalEquipmentItem {
  id: string;
  productId: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  specs: ProposalEquipmentSpec[];
  categoryName?: string;
  datasheetUrl?: string | null;
}

export const PROPOSAL_EQUIPMENT_SPEC_SLOTS = 4;

const CATEGORY_LABELS: Record<string, string> = {
  module: "Módulo",
  inverter: "Inversor",
  microinverter: "Microinversor",
  hybrid_inverter: "Inversor Híbrido",
  off_grid_inverter: "Inversor Off-Grid",
  battery: "Bateria",
  bms: "BMS",
  structure_kit: "Estrutura",
  dc_cable: "Cabo CC",
  connector: "Conector",
  profile: "Perfil",
  string_box: "String Box",
};

export function equipmentCategoryLucideIcon(categoryName: string | undefined): string {
  const c = (categoryName ?? "").trim().toLowerCase();
  switch (c) {
    case "module":
      return "sun";
    case "inverter":
      return "zap";
    case "microinverter":
      return "cpu";
    case "hybrid_inverter":
      return "battery-charging";
    case "off_grid_inverter":
      return "zap";
    case "battery":
      return "battery";
    case "bms":
      return "shield-check";
    case "structure_kit":
      return "construction";
    case "dc_cable":
      return "link-2";
    case "connector":
      return "plug";
    case "string_box":
      return "shield";
    default:
      return "package";
  }
}

const CATEGORY_TITLE_PREFIXES: Array<[string, string]> = [
  ["microinverter", "Microinversor"],
  ["hybrid_inverter", "Inversor Híbrido"],
  ["off_grid_inverter", "Inversor Off-Grid"],
  ["battery", "Bateria"],
  ["bms", "BMS"],
  ["structure_kit", "Estrutura"],
  ["dc_cable", "Cabo CC"],
  ["module", "Módulo"],
  ["inverter", "Inversor"],
  ["connector", "Conector"],
  ["profile", "Perfil"],
  ["string_box", "String Box"],
];

function inferCategorySlugFromTitle(title: string): string | undefined {
  const t = title.trim();
  for (const [slug, label] of CATEGORY_TITLE_PREFIXES) {
    if (t.startsWith(label)) return slug;
  }
  return undefined;
}

export function emptyProposalEquipmentSpec(): ProposalEquipmentSpec {
  return { label: "", value: "", icon: "circle-dot" };
}

export function newProposalEquipmentItemId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `eq_${Math.random().toString(36).slice(2, 12)}`;
}

export function createEmptyProposalEquipmentItem(): ProposalEquipmentItem {
  return {
    id: newProposalEquipmentItemId(),
    productId: "",
    imageUrl: "",
    title: "",
    subtitle: "",
    categoryName: undefined,
    datasheetUrl: undefined,
    specs: [
      emptyProposalEquipmentSpec(),
      emptyProposalEquipmentSpec(),
      emptyProposalEquipmentSpec(),
      emptyProposalEquipmentSpec(),
    ],
  };
}

function normalizeSpec(raw: unknown): ProposalEquipmentSpec {
  if (!raw || typeof raw !== "object") return emptyProposalEquipmentSpec();
  const o = raw as Record<string, unknown>;
  return {
    label: String(o["label"] ?? "").trim(),
    value: String(o["value"] ?? "").trim(),
    icon:
      String(o["icon"] ?? "circle-dot")
        .trim()
        .toLowerCase() || "circle-dot",
  };
}

function quantitySpec(quantity: number): ProposalEquipmentSpec {
  const q = Math.max(1, Math.floor(quantity));
  return {
    label: "Quantidade",
    value: q === 1 ? "1 unidade" : `${q} unidades`,
    icon: "hash",
  };
}

function num(specs: Record<string, unknown>, key: string): number | undefined {
  const v = specs[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(specs: Record<string, unknown>, key: string): string | undefined {
  const v = specs[key];
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function formatGridTopology(specs: Record<string, unknown>): string | undefined {
  const top = str(specs, "grid_topology");
  const std = str(specs, "grid_standard");
  const volt = str(specs, "output_voltage_v") ?? str(specs, "ac_output_voltage");
  if (top === "mono_220" || std === "EU") return "Mono 220V (EU)";
  if (top === "biphasic_127_220" || std === "US") return "Bifásico 127/220V (US)";
  if (top === "tri_220" || std === "TRI_220") return "Trifásico 220V";
  if (top === "tri_380" || std === "TRI_380") return "Trifásico 380V";
  if (top === "mono_127") return "Mono 127V";
  if (volt) return `${volt}`;
  return undefined;
}

export function buildEquipmentDisplaySpecs(
  categoryName: string,
  specs: Record<string, unknown>,
  quantity: number
): ProposalEquipmentSpec[] {
  const cat = categoryName.trim().toLowerCase();
  const qSpec = quantitySpec(quantity);
  let a = emptyProposalEquipmentSpec();
  let b = emptyProposalEquipmentSpec();
  let c = emptyProposalEquipmentSpec();
  const gridLabel = formatGridTopology(specs);

  if (cat === "module") {
    const power = num(specs, "power_w");
    const eff = num(specs, "efficiency");
    const voc = num(specs, "voc");
    const warranty =
      num(specs, "warranty_years") ?? str(specs, "warranty") ?? str(specs, "warranty_description");
    if (power != null) a = { label: "Potência", value: `${power} Wp`, icon: "zap" };
    if (warranty != null) {
      b = {
        label: "Garantia",
        value:
          typeof warranty === "number" || /^\d+$/.test(String(warranty))
            ? `${warranty} anos`
            : String(warranty),
        icon: "shield",
      };
    } else {
      b = { label: "Garantia", value: "25 anos", icon: "shield" };
    }
    if (eff != null) c = { label: "Eficiência", value: `${eff}%`, icon: "percent" };
    else if (voc != null) c = { label: "Voc", value: `${voc} V`, icon: "plug" };
  } else if (cat === "inverter") {
    const maxDc = num(specs, "max_dc_power") ?? num(specs, "nominal_power_w");
    const mppt = num(specs, "mppt_count");
    const warranty =
      num(specs, "warranty_years") ?? str(specs, "warranty") ?? str(specs, "warranty_description");
    if (maxDc != null) {
      a = {
        label: "Potência máx.",
        value:
          maxDc >= 1000
            ? `${(maxDc / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW`
            : `${maxDc} W`,
        icon: "zap",
      };
    }
    if (gridLabel) {
      b = { label: "Padrão CA", value: gridLabel, icon: "plug" };
    } else if (warranty != null) {
      b = {
        label: "Garantia",
        value:
          typeof warranty === "number" || /^\d+$/.test(String(warranty))
            ? `${warranty} anos`
            : String(warranty),
        icon: "shield",
      };
    } else {
      b = { label: "Garantia", value: "10 anos", icon: "shield" };
    }
    if (mppt != null) c = { label: "MPPTs", value: `${mppt} trackers`, icon: "layers" };
  } else if (cat === "hybrid_inverter") {
    const p = num(specs, "nominal_power_w");
    const eps = num(specs, "eps_nominal_power_w");
    const warranty =
      num(specs, "warranty_years") ?? str(specs, "warranty") ?? str(specs, "warranty_description");
    if (p != null) {
      a = {
        label: "Potência Nominal",
        value:
          p >= 1000
            ? `${(p / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW`
            : `${p} W`,
        icon: "zap",
      };
    }
    if (gridLabel) {
      b = { label: "Padrão CA", value: gridLabel, icon: "plug" };
    } else if (warranty != null) {
      b = {
        label: "Garantia",
        value: `${warranty} anos`,
        icon: "shield",
      };
    } else {
      b = { label: "Garantia", value: "10 anos", icon: "shield" };
    }
    if (eps != null) {
      c = {
        label: "Backup EPS",
        value: `${(eps / 1000).toFixed(1)} kW`,
        icon: "battery-charging",
      };
    } else {
      c = { label: "Função", value: "Híbrido + Backup", icon: "battery-charging" };
    }
  } else if (cat === "off_grid_inverter") {
    const p = num(specs, "nominal_power_w");
    const vBat = num(specs, "battery_nominal_voltage_v");
    const warranty = num(specs, "warranty_years") ?? 2;
    if (p != null) a = { label: "Potência", value: `${p} W`, icon: "zap" };
    if (gridLabel) {
      b = { label: "Saída CA", value: gridLabel, icon: "plug" };
    } else {
      b = { label: "Garantia", value: `${warranty} anos`, icon: "shield" };
    }
    if (vBat != null) c = { label: "Tensão Bateria", value: `${vBat} V`, icon: "battery" };
  } else if (cat === "battery") {
    const kwh = num(specs, "capacity_kwh");
    const ah = num(specs, "capacity_ah");
    const v = num(specs, "nominal_voltage_v");
    const warranty = num(specs, "warranty_years") ?? 10;
    if (kwh != null) a = { label: "Capacidade", value: `${kwh} kWh`, icon: "battery" };
    else if (ah != null && v != null)
      a = { label: "Capacidade", value: `${ah}Ah (${v}V)`, icon: "battery" };
    b = { label: "Garantia", value: `${warranty} anos`, icon: "shield" };
    const cycles = num(specs, "cycles");
    if (cycles != null) c = { label: "Vida útil", value: `${cycles} ciclos`, icon: "refresh-cw" };
    else c = { label: "Tecnologia", value: "LiFePO4 Lítio", icon: "zap" };
  } else if (cat === "bms") {
    const v = num(specs, "nominal_voltage_v") ?? num(specs, "max_voltage_v");
    const i = num(specs, "max_current_a");
    const warranty = num(specs, "warranty_years") ?? 5;
    if (v != null) a = { label: "Tensão de Trab.", value: `${v} V`, icon: "zap" };
    b = { label: "Garantia", value: `${warranty} anos`, icon: "shield" };
    if (i != null) c = { label: "Corrente Máx.", value: `${i} A`, icon: "shield-check" };
  } else if (cat === "string_box") {
    const inputs = num(specs, "inputs_count");
    const outputs = num(specs, "outputs_count");
    const vMax = num(specs, "max_voltage_v");
    const warranty = num(specs, "warranty_years") ?? 2;
    if (inputs != null && outputs != null) {
      a = { label: "Configuração", value: `${inputs}E / ${outputs}S`, icon: "shield" };
    } else if (inputs != null) {
      a = { label: "Entradas", value: `${inputs} strings`, icon: "shield" };
    }
    b = { label: "Garantia", value: `${warranty} anos`, icon: "shield" };
    if (vMax != null) c = { label: "Tensão Máx.", value: `${vMax} V CC`, icon: "zap" };
    else c = { label: "Proteção", value: "DPS + Chave CC", icon: "shield-check" };
  } else if (cat === "microinverter") {
    const ch = num(specs, "channels");
    const maxP = num(specs, "max_module_power");
    const warranty =
      num(specs, "warranty_years") ?? str(specs, "warranty") ?? str(specs, "warranty_description");
    if (maxP != null) a = { label: "Módulo máx.", value: `${maxP} W`, icon: "zap" };
    if (warranty != null) {
      b = {
        label: "Garantia",
        value:
          typeof warranty === "number" || /^\d+$/.test(String(warranty))
            ? `${warranty} anos`
            : String(warranty),
        icon: "shield",
      };
    } else {
      b = { label: "Garantia", value: "12 anos", icon: "shield" };
    }
    if (ch != null) c = { label: "Canais", value: `${ch} módulos`, icon: "layers" };
  } else if (cat === "structure_kit") {
    const roof = str(specs, "roof_type");
    const maxM = num(specs, "max_modules");
    if (roof) a = { label: "Telhado", value: roof, icon: "home" };
    if (maxM != null) b = { label: "Até módulos", value: String(maxM), icon: "layout-grid" };
    c = { label: "Garantia", value: "10 anos", icon: "shield" };
  } else if (cat === "dc_cable") {
    const sec = num(specs, "section_mm2");
    const v = num(specs, "max_voltage");
    if (sec != null) a = { label: "Seção", value: `${sec} mm²`, icon: "minus" };
    if (v != null) b = { label: "Tensão máx.", value: `${v} V`, icon: "zap" };
  } else if (cat === "connector") {
    const t = str(specs, "type");
    if (t) a = { label: "Tipo", value: t.toUpperCase(), icon: "plug" };
    b = { label: "Garantia", value: "5 anos", icon: "shield" };
  }

  const out = [a, b, qSpec, c].filter((s) => s.label.trim() !== "");
  while (out.length < PROPOSAL_EQUIPMENT_SPEC_SLOTS) {
    out.push(emptyProposalEquipmentSpec());
  }
  return out.slice(0, PROPOSAL_EQUIPMENT_SPEC_SLOTS);
}

export function proposalEquipmentItemFromProduct(
  product: ProposalEquipmentProductSnapshot,
  quantity: number,
  rowId: string
): ProposalEquipmentItem {
  const cat = product.category.name.trim().toLowerCase();
  const catLabel = CATEGORY_LABELS[cat] ?? product.category.name;
  return {
    id: rowId,
    productId: product.id,
    imageUrl: String(product.imageUrl ?? "").trim(),
    datasheetUrl: product.datasheetUrl ?? undefined,
    title: `${catLabel} — ${product.brand.name}`,
    subtitle: product.name,
    categoryName: cat,
    specs: buildEquipmentDisplaySpecs(cat, product.specs as Record<string, unknown>, quantity),
  };
}

function missingProductItem(line: ProposalEquipmentLine, index: number): ProposalEquipmentItem {
  return {
    id: `eq-missing-${line.productId}-${index}`,
    productId: line.productId,
    imageUrl: "",
    title: "Produto não encontrado no catálogo",
    subtitle: `ID: ${line.productId}`,
    categoryName: undefined,
    specs: [
      quantitySpec(line.quantity),
      emptyProposalEquipmentSpec(),
      emptyProposalEquipmentSpec(),
    ],
  };
}

export function parseProposalEquipmentLines(raw: unknown): ProposalEquipmentLine[] {
  if (!Array.isArray(raw)) return [];
  const out: ProposalEquipmentLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const productId = String(o["productId"] ?? "").trim();
    if (!productId) continue;
    const q = Number(o["quantity"]);
    const quantity = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
    out.push({ productId, quantity });
  }
  return out;
}

export function parseProposalEquipmentItems(raw: unknown): ProposalEquipmentItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    if (!row || typeof row !== "object") {
      return createEmptyProposalEquipmentItem();
    }
    const o = row as Record<string, unknown>;
    const rawSpecs = Array.isArray(o["specs"]) ? o["specs"] : [];
    const specs: ProposalEquipmentSpec[] = [];
    for (let i = 0; i < PROPOSAL_EQUIPMENT_SPEC_SLOTS; i++) {
      specs.push(normalizeSpec((rawSpecs as unknown[])[i]));
    }
    const id =
      typeof o["id"] === "string" && o["id"].trim()
        ? o["id"].trim()
        : `eq-row-${index}-${newProposalEquipmentItemId()}`;
    const title = String(o["title"] ?? "").trim();
    const rawCat = o["categoryName"];
    const categoryName =
      typeof rawCat === "string" && rawCat.trim()
        ? rawCat.trim().toLowerCase()
        : inferCategorySlugFromTitle(title);
    return {
      id,
      productId: String(o["productId"] ?? "").trim(),
      imageUrl: String(o["imageUrl"] ?? "").trim(),
      title,
      subtitle: String(o["subtitle"] ?? "").trim(),
      categoryName,
      specs,
    };
  });
}

export function inferSpecsFromProductDetails(
  cat: string,
  productName: string,
  quantity: number
): ProposalEquipmentSpec[] {
  const qSpec = quantitySpec(quantity);
  let a = emptyProposalEquipmentSpec();
  let b = emptyProposalEquipmentSpec();
  let c = emptyProposalEquipmentSpec();

  if (cat === "module") {
    const match = productName.match(/(\d+)\s*W(?:p)?\b/i);
    const powerW = match ? match[1] : undefined;
    if (powerW) {
      a = { label: "Potência", value: `${powerW} Wp`, icon: "zap" };
    }
    b = { label: "Garantia", value: "25 anos", icon: "shield" };
    c = { label: "Eficiência", value: "Alta eficiência", icon: "percent" };
  } else if (cat === "inverter" || cat === "microinverter") {
    const matchKw = productName.match(/(\d+(?:[.,]\d+)?)\s*KW\b/i);
    const matchW = productName.match(/(\d{3,5})\s*W\b/i);
    if (matchKw) {
      const kwVal = matchKw[1].replace(",", ".");
      a = { label: "Potência", value: `${kwVal} kW`, icon: "zap" };
    } else if (matchW) {
      a = { label: "Potência", value: `${matchW[1]} W`, icon: "zap" };
    }
    b = {
      label: "Garantia",
      value: cat === "microinverter" ? "12 anos" : "10 anos",
      icon: "shield",
    };
    c = { label: "Monitoramento", value: "Wi-Fi integrado", icon: "activity" };
  }

  const out = [a, b, qSpec, c].filter((s) => s.label.trim() !== "");
  while (out.length < PROPOSAL_EQUIPMENT_SPEC_SLOTS) {
    out.push(emptyProposalEquipmentSpec());
  }
  return out.slice(0, PROPOSAL_EQUIPMENT_SPEC_SLOTS);
}

export function buildEquipmentItemFromKitLine(
  line: {
    productId?: string;
    productName: string;
    brandName?: string;
    quantity: number;
    categoryName?: string;
    imageUrl?: string;
    specs?: Record<string, unknown>;
  },
  index: number
): ProposalEquipmentItem {
  const rawCat = (line.categoryName ?? "").trim().toLowerCase();
  let cat = rawCat;
  if (
    cat === "modulo" ||
    cat === "módulo" ||
    cat === "painel" ||
    cat === "painéis" ||
    cat === "paineis" ||
    cat === "module" ||
    cat === "modules"
  ) {
    cat = "module";
  } else if (
    cat === "inversor" ||
    cat === "inversores" ||
    cat === "inverter" ||
    cat === "inverters"
  ) {
    cat = "inverter";
  } else if (
    cat === "microinversor" ||
    cat === "microinversores" ||
    cat === "microinverter" ||
    cat === "microinverters"
  ) {
    cat = "microinverter";
  } else if (
    cat === "estrutura" ||
    cat === "estruturas" ||
    cat === "estrutura_fixacao" ||
    cat === "structure_kit" ||
    cat === "structure"
  ) {
    cat = "structure_kit";
  } else if (
    cat === "cabo" ||
    cat === "cabos" ||
    cat === "cabo_cc" ||
    cat === "cabos_cc" ||
    cat === "dc_cable" ||
    cat === "cable"
  ) {
    cat = "dc_cable";
  } else if (
    cat === "conector" ||
    cat === "conectores" ||
    cat === "mc4" ||
    cat === "connector" ||
    cat === "connectors"
  ) {
    cat = "connector";
  } else if (
    cat === "perfil" ||
    cat === "perfis" ||
    cat === "trilho" ||
    cat === "trilhos" ||
    cat === "profile"
  ) {
    cat = "profile";
  } else {
    const rawName = (line.productName || "").trim();
    const lowerName = rawName.toLowerCase();
    if (
      lowerName.includes("modulo") ||
      lowerName.includes("módulo") ||
      lowerName.includes("painel")
    ) {
      cat = "module";
    } else if (lowerName.includes("microinversor")) {
      cat = "microinverter";
    } else if (lowerName.includes("inversor")) {
      cat = "inverter";
    } else if (lowerName.includes("estrutura")) {
      cat = "structure_kit";
    } else if (lowerName.includes("perfil") || lowerName.includes("trilho")) {
      cat = "profile";
    } else if (lowerName.includes("cabo")) {
      cat = "dc_cable";
    } else if (lowerName.includes("conector") || lowerName.includes("mc4")) {
      cat = "connector";
    }
  }

  const catLabel =
    cat === "module"
      ? "Módulo fotovoltaico"
      : cat === "inverter"
        ? "Inversor"
        : cat === "microinverter"
          ? "Microinversor"
          : (CATEGORY_LABELS[cat] ?? "Equipamento");

  let rawName = (line.productName || "").trim();
  let quantity = Math.max(1, Math.floor(line.quantity || 1));

  // Remove prefixes like "- Inversor: ", "- Módulos: 10x " if present in raw string data
  const prefixMatch = rawName.match(/^-\s*[^:]+:\s*(?:(\d+)x\s*)?(.*)$/i);
  if (prefixMatch) {
    if (prefixMatch[1] && (!line.quantity || line.quantity <= 1)) {
      quantity = parseInt(prefixMatch[1], 10);
    }
    if (prefixMatch[2]) {
      rawName = prefixMatch[2].trim();
    }
  }

  const brand = (line.brandName ?? "").trim();
  const title = brand ? `${catLabel} — ${brand}` : catLabel;
  const subtitle = rawName;

  let specs: ProposalEquipmentSpec[] = [];
  if (line.specs && typeof line.specs === "object" && Object.keys(line.specs).length > 0) {
    specs = buildEquipmentDisplaySpecs(cat, line.specs, quantity);
  } else {
    specs = inferSpecsFromProductDetails(cat, rawName, quantity);
  }

  return {
    id: line.productId ? `eq-kit-${line.productId}-${index}` : `eq-kit-${index}`,
    productId: line.productId ?? "",
    imageUrl: String(line.imageUrl ?? "").trim(),
    title,
    subtitle,
    categoryName: cat || undefined,
    specs,
  };
}

export function buildProposalEquipmentItemsFromKit(
  kitItems: Array<{
    productId?: string;
    productName: string;
    brandName?: string;
    quantity: number;
    categoryName?: string;
    imageUrl?: string;
    specs?: Record<string, unknown>;
  }>
): ProposalEquipmentItem[] {
  if (!Array.isArray(kitItems) || kitItems.length === 0) return [];

  const categoryRank: Record<string, number> = {
    module: 1,
    inverter: 2,
    microinverter: 2,
    battery: 3,
    structure_kit: 4,
    profile: 5,
    string_box: 6,
    dc_cable: 7,
    connector: 8,
  };

  const sorted = [...kitItems].sort((x, y) => {
    const cx = (x.categoryName ?? "").toLowerCase();
    const cy = (y.categoryName ?? "").toLowerCase();
    const rx = categoryRank[cx] ?? 50;
    const ry = categoryRank[cy] ?? 50;
    return rx - ry;
  });

  return sorted.map((line, idx) => buildEquipmentItemFromKitLine(line, idx));
}

export function resolveProposalEquipmentItemsForPreview(
  fields: Record<string, unknown>,
  catalog: Record<string, ProposalEquipmentProductSnapshot> | undefined
): ProposalEquipmentItem[] {
  const manualItems = parseProposalEquipmentItems(fields["equipmentItems"]);
  if (manualItems.length > 0 && manualItems.some((it) => it.title.trim() || it.subtitle.trim())) {
    return manualItems;
  }
  const lines = parseProposalEquipmentLines(fields["equipmentLines"]);
  if (lines.length > 0) {
    return lines.map((line, index) => {
      const p = catalog?.[line.productId];
      if (p)
        return proposalEquipmentItemFromProduct(p, line.quantity, `eq-${line.productId}-${index}`);
      return missingProductItem(line, index);
    });
  }
  return manualItems;
}

export const DEMO_PROPOSAL_EQUIPMENT_ITEMS: ProposalEquipmentItem[] = [
  {
    id: "demo-eq-1",
    productId: "",
    imageUrl: "",
    categoryName: "module",
    title: "Módulo fotovoltaico — ERA SOLAR",
    subtitle: "RC66HD-620M Bifacial 620W",
    specs: [
      { label: "Potência", value: "620 Wp", icon: "zap" },
      { label: "Garantia", value: "25 anos", icon: "shield" },
      { label: "Quantidade", value: "9 unidades", icon: "hash" },
      { label: "Eficiência", value: "21.8%", icon: "percent" },
    ],
  },
  {
    id: "demo-eq-2",
    productId: "",
    imageUrl: "",
    categoryName: "inverter",
    title: "Inversor — SUNGROW",
    subtitle: "String 5 kW",
    specs: [
      { label: "Potência", value: "5.000 W", icon: "zap" },
      { label: "Garantia", value: "10 anos", icon: "shield" },
      { label: "Quantidade", value: "1 unidade", icon: "hash" },
      { label: "MPPTs", value: "2 trackers", icon: "layers" },
    ],
  },
];
