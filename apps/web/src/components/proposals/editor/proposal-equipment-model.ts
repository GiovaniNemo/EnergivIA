import type { ProposalEquipmentLine } from "@energivia/shared-types";

export type { ProposalEquipmentLine };

export interface ProposalEquipmentProductSnapshot {
  id: string;
  name: string;
  imageUrl?: string | null;
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
}

export const PROPOSAL_EQUIPMENT_SPEC_SLOTS = 3;

const CATEGORY_LABELS: Record<string, string> = {
  module: "Módulo",
  inverter: "Inversor",
  microinverter: "Microinversor",
  structure_kit: "Estrutura",
  dc_cable: "Cabo CC",
  connector: "Conector",
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
    case "structure_kit":
      return "construction";
    case "dc_cable":
      return "link-2";
    case "connector":
      return "plug";
    default:
      return "package";
  }
}

const CATEGORY_TITLE_PREFIXES: Array<[string, string]> = [
  ["microinverter", "Microinversor"],
  ["structure_kit", "Estrutura"],
  ["dc_cable", "Cabo CC"],
  ["module", "Módulo"],
  ["inverter", "Inversor"],
  ["connector", "Conector"],
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
    specs: [
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

export function buildEquipmentDisplaySpecs(
  categoryName: string,
  specs: Record<string, unknown>,
  quantity: number
): ProposalEquipmentSpec[] {
  const cat = categoryName.trim().toLowerCase();
  const qSpec = quantitySpec(quantity);
  let a = emptyProposalEquipmentSpec();
  let b = emptyProposalEquipmentSpec();

  if (cat === "module") {
    const power = num(specs, "power_w");
    const eff = num(specs, "efficiency");
    const voc = num(specs, "voc");
    if (power != null) a = { label: "Potência", value: `${power} Wp`, icon: "zap" };
    if (eff != null) b = { label: "Eficiência", value: `${eff}%`, icon: "percent" };
    else if (voc != null) b = { label: "Voc", value: `${voc} V`, icon: "plug" };
  } else if (cat === "inverter") {
    const maxDc = num(specs, "max_dc_power");
    const mppt = num(specs, "mppt_count");
    if (maxDc != null) a = { label: "Potência DC máx.", value: `${maxDc} W`, icon: "zap" };
    if (mppt != null) b = { label: "MPPTs", value: String(mppt), icon: "layers" };
  } else if (cat === "microinverter") {
    const ch = num(specs, "channels");
    const maxP = num(specs, "max_module_power");
    if (ch != null) a = { label: "Canais", value: String(ch), icon: "layers" };
    if (maxP != null) b = { label: "Módulo máx.", value: `${maxP} W`, icon: "zap" };
  } else if (cat === "structure_kit") {
    const roof = str(specs, "roof_type");
    const maxM = num(specs, "max_modules");
    if (roof) a = { label: "Telhado", value: roof, icon: "home" };
    if (maxM != null) b = { label: "Até módulos", value: String(maxM), icon: "layout-grid" };
  } else if (cat === "dc_cable") {
    const sec = num(specs, "section_mm2");
    const v = num(specs, "max_voltage");
    if (sec != null) a = { label: "Seção", value: `${sec} mm²`, icon: "minus" };
    if (v != null) b = { label: "Tensão máx.", value: `${v} V`, icon: "zap" };
  } else if (cat === "connector") {
    const t = str(specs, "type");
    if (t) a = { label: "Tipo", value: t.toUpperCase(), icon: "plug" };
    b = { label: "Categoria", value: "Conector", icon: "circle-dot" };
  }

  const out = [a, b, qSpec];
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

export function resolveProposalEquipmentItemsForPreview(
  fields: Record<string, unknown>,
  catalog: Record<string, ProposalEquipmentProductSnapshot> | undefined
): ProposalEquipmentItem[] {
  const lines = parseProposalEquipmentLines(fields["equipmentLines"]);
  if (lines.length > 0) {
    return lines.map((line, index) => {
      const p = catalog?.[line.productId];
      if (p)
        return proposalEquipmentItemFromProduct(p, line.quantity, `eq-${line.productId}-${index}`);
      return missingProductItem(line, index);
    });
  }
  return parseProposalEquipmentItems(fields["equipmentItems"]);
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
      { label: "Garantia", value: "15 anos", icon: "shield" },
      { label: "Quantidade", value: "1 unidade", icon: "hash" },
    ],
  },
];
