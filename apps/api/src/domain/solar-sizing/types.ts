import type { ModuleSpec, StringInverterSpec, MicroInverterSpec } from "../product-specs";

export interface SizingInput {
  system_kw: number;
  preferred_module_brand?: string;
  preferred_module_id?: string;
}

export interface ProductWithSpecs<T = unknown> {
  id: string;
  name: string;
  brandName: string;
  price: number;
  specs: T;
}

export interface StringConfiguration {
  modules_per_string: number;
  string_count: number;
  total_modules: number;
  dc_power_w: number;
  dc_ac_ratio: number;
}

export interface StringSizingResult {
  module: ProductWithSpecs<ModuleSpec>;
  inverter: ProductWithSpecs<StringInverterSpec>;
  module_quantity: number;
  string_configuration: StringConfiguration;
  validated: {
    voltage: boolean;
    current: boolean;
    dc_ac_ratio: boolean;
  };
}

export interface MicroSizingResult {
  module: ProductWithSpecs<ModuleSpec>;
  inverter: ProductWithSpecs<MicroInverterSpec>;
  module_quantity: number;
  microinverter_quantity: number;
  validated: {
    voltage: boolean;
    current: boolean;
    power: boolean;
  };
}

export type SizingResult = StringSizingResult | MicroSizingResult;

export function isStringSizingResult(result: SizingResult): result is StringSizingResult {
  return "string_configuration" in result;
}

export function isMicroSizingResult(result: SizingResult): result is MicroSizingResult {
  return "microinverter_quantity" in result;
}
