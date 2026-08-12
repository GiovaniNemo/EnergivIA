export type KitLabel = "Melhor Custo-Benefício" | "Menor Preço" | "Premium";

export interface KitSuggestion {
  label: KitLabel;
  systemSize: string;
  modules: number;
  modulePowerW?: number;
  moduleBrand: string;
  inverter: string;
  estimatedGeneration: string;
  estimatedPrice: number;
  citySolarIndexKwhM2Day?: number;
  performanceRatio?: number;
  indexSource?: string;
  targetKWp?: number;
  netConsumption?: number;
}

export interface KitPreferences {
  moduleBrand?: string;
  inverterBrand?: string;
  cheaper?: boolean;
  moreGeneration?: boolean;
}

export type RoofType = "ceramic" | "metal" | "fibromadeira" | "fibrometal" | "ground" | "laje";

export interface GenerateSolarKitsInput {
  monthlyConsumption: number;
  location: string;
  roofType: RoofType;
  history?: number[];
  connectionType?: string;
  preferences?: KitPreferences;
  pinned_module_id?: string;
  pinned_inverter_id?: string;
  inverter_type?: string;
  string_box_id?: string;
  supplier_id?: string;
  stock_owner_org_id?: string;
}

export interface GenerateSolarKitsOutput {
  kits: KitSuggestion[];
}
