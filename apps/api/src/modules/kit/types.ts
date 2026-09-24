export interface GenerateKitInput {
  system_kw: number;
  roof_type: string;
  preferred_brand?: string;
  supplier_id?: string;
  stock_owner_org_id?: string;
  pinned_module_id?: string;
  pinned_inverter_id?: string;
  inverter_type?: "string" | "microinverter" | "hybrid" | "off_grid";
  grid_topology?: string;
  string_box_id?: string;
}

export type KitSwapCategory = "module" | "inverter";

export interface KitAlternativeOption {
  product_id: string;
  product_name: string;
  brand_name: string;
  unit_price: number;
  compatible: boolean;
  reason?: string;
  quantity?: number;
  kit_total?: number;
  system_power_kw?: number;
  string_summary?: string;
  datasheet_url?: string | null;
  is_tier_1?: boolean;
}

export interface KitCrossSourceAlternative extends KitAlternativeOption {
  source_type: "own_stock" | "supplier";
  supplier_id?: string;
  supplier_name?: string;
}

export interface KitAlternativesResult {
  category: KitSwapCategory;
  alternatives: KitAlternativeOption[];
  other_sources?: KitCrossSourceAlternative[];
}

export interface KitItemLine {
  product_id: string;
  product_name: string;
  brand_name: string;
  quantity: number;
  unit_price: number;
  datasheet_url?: string | null;
}

export interface KitSourceOption {
  type: "own_stock" | "supplier";
  supplier_id?: string;
  supplier_name?: string;
  available: boolean;
  complete: boolean;
  total: number | null;
  item_count: number | null;
  covered_categories?: number;
  required_categories?: number;
}

export interface KitSourceOptionsResult {
  sources: KitSourceOption[];
}

export interface StringConfigurationOutput {
  modules_per_string: number;
  string_count: number;
  total_modules: number;
  dc_power_w: number;
  dc_ac_ratio: number;
}

export interface GenerateKitResult {
  kit_id: string;
  system_power_kw: number;
  own_stock_used?: boolean;
  modules: {
    product_id: string;
    product_name: string;
    brand_name: string;
    quantity: number;
    unit_price: number;
    datasheet_url?: string | null;
    is_tier_1?: boolean;
  };
  inverter: {
    product_id: string;
    product_name: string;
    brand_name: string;
    quantity: number;
    unit_price: number;
    datasheet_url?: string | null;
  };
  string_configuration?: StringConfigurationOutput;
  kit_items: KitItemLine[];
}

export interface DistributorTierKit {
  tier_id: "economic" | "cost_benefit" | "premium";
  name: string;
  tagline: string;
  badge: string;
  kit_result: GenerateKitResult;
  equipment_total: number;
  rate_per_kwp: number;
  inverter_brand: string;
  inverter_model: string;
  inverter_power_kw: number;
  module_brand: string;
  module_model: string;
  module_qty: number;
  module_power_w: number;
  module_is_tier_1?: boolean;
  estimated_monthly_generation_kwh: number;
}

export interface DistributorTiersResult {
  tiers: DistributorTierKit[];
}
