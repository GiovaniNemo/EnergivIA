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
  preferences?: KitPreferences;
}

export interface GenerateSolarKitsOutput {
  kits: KitSuggestion[];
}
