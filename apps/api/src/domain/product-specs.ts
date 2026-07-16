export interface ModuleSpec {
  power_w: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  efficiency: number;
  max_system_voltage: number;
  width_mm: number;
  height_mm: number;
}

export interface StringInverterSpec {
  type: "string";
  max_dc_voltage: number;
  mppt_count: number;
  max_strings_per_mppt: number;
  mppt_voltage_min: number;
  mppt_voltage_max: number;
  max_input_current: number;
  max_dc_power: number;
  recommended_dc_ac_ratio_min: number;
  recommended_dc_ac_ratio_max: number;
}

export interface MicroInverterSpec {
  type: "micro";
  channels: number;
  max_input_voltage: number;
  max_input_current: number;
  max_module_power: number;
  min_module_power: number;
}

export type InverterSpec = StringInverterSpec | MicroInverterSpec;

export interface StructureKitSpec {
  roof_type: string;
  max_modules: number;
}

export interface DcCableSpec {
  section_mm2: number;
  max_voltage: number;
}

export interface ConnectorSpec {
  type: string;
}

export type ProductSpecs =
  | ModuleSpec
  | StringInverterSpec
  | MicroInverterSpec
  | StructureKitSpec
  | DcCableSpec
  | ConnectorSpec;

export function isModuleSpec(specs: unknown): specs is ModuleSpec {
  return (
    typeof specs === "object" &&
    specs !== null &&
    "power_w" in specs &&
    "voc" in specs &&
    "vmp" in specs
  );
}

export function isStringInverterSpec(specs: unknown): specs is StringInverterSpec {
  return (
    typeof specs === "object" &&
    specs !== null &&
    "type" in specs &&
    (specs as { type: string }).type === "string" &&
    "max_dc_voltage" in specs &&
    "max_dc_power" in specs
  );
}

export function isMicroInverterSpec(specs: unknown): specs is MicroInverterSpec {
  return (
    typeof specs === "object" &&
    specs !== null &&
    "type" in specs &&
    (specs as { type: string }).type === "micro" &&
    "channels" in specs &&
    "max_module_power" in specs
  );
}

export function isInverterSpec(specs: unknown): specs is InverterSpec {
  return isStringInverterSpec(specs) || isMicroInverterSpec(specs);
}
