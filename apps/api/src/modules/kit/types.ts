export interface GenerateKitInput {
  system_kw: number;
  roof_type: string;
  preferred_brand?: string;
  supplier_id?: string;
  stock_owner_org_id?: string;
  pinned_module_id?: string;
  pinned_inverter_id?: string;
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
  };
  inverter: {
    product_id: string;
    product_name: string;
    brand_name: string;
    quantity: number;
    unit_price: number;
  };
  string_configuration?: StringConfigurationOutput;
  kit_items: KitItemLine[];
}
