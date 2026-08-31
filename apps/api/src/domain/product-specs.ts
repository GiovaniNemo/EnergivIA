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

export type GridTopology = "mono_220" | "biphasic_127_220" | "tri_220" | "tri_380" | "mono_127";

export type GridStandard = "EU" | "US" | "TRI_220" | "TRI_380";

export interface StringInverterSpec {
  type: "string";
  nominal_power_w?: number;
  max_dc_voltage: number;
  mppt_count: number;
  max_strings_per_mppt: number;
  mppt_voltage_min: number;
  mppt_voltage_max: number;
  max_input_current: number;
  max_dc_power: number;
  recommended_dc_ac_ratio_min: number;
  recommended_dc_ac_ratio_max: number;
  grid_topology?: GridTopology;
  grid_standard?: GridStandard;
  output_voltage_v?: string | number;
  warranty_years?: number;
}

export interface MicroInverterSpec {
  type: "micro";
  channels: number;
  max_input_voltage: number;
  max_input_current: number;
  max_module_power: number;
  min_module_power: number;
  grid_topology?: GridTopology;
  grid_standard?: GridStandard;
  output_voltage_v?: string | number;
  warranty_years?: number;
}

export interface HybridInverterSpec {
  type: "hybrid";
  nominal_power_w: number;
  max_dc_voltage: number;
  mppt_count: number;
  max_strings_per_mppt?: number;
  mppt_voltage_min: number;
  mppt_voltage_max: number;
  max_input_current: number;
  max_dc_power: number;
  grid_topology?: GridTopology;
  grid_standard?: GridStandard;
  output_voltage_v?: string | number;
  battery_voltage_type?: "low_voltage" | "high_voltage";
  battery_nominal_voltage_v?: number;
  battery_voltage_min?: number;
  battery_voltage_max?: number;
  max_charge_current_a?: number;
  max_discharge_current_a?: number;
  eps_nominal_power_w?: number;
  eps_peak_power_w?: number;
  warranty_years?: number;
}

export interface OffGridInverterSpec {
  type: "off_grid";
  nominal_power_w: number;
  peak_power_w?: number;
  battery_nominal_voltage_v: number;
  max_dc_voltage?: number;
  mppt_voltage_min?: number;
  mppt_voltage_max?: number;
  max_pv_power_w?: number;
  ac_output_voltage?: number;
  grid_topology?: GridTopology;
  grid_standard?: GridStandard;
  output_voltage_v?: string | number;
  waveform?: "pure_sine" | "modified_sine";
  warranty_years?: number;
}

export interface BatterySpec {
  capacity_kwh: number;
  capacity_ah?: number;
  nominal_voltage_v: number;
  voltage_type?: "low_voltage" | "high_voltage";
  chemistry?: "lifepo4" | "lead_carbon" | "lithium_ion" | "other";
  dod_percent?: number;
  cycles?: number;
  max_charge_current_a?: number;
  max_discharge_current_a?: number;
  warranty_years?: number;
}

export interface BmsSpec {
  nominal_voltage_v?: number;
  max_voltage_v?: number;
  max_current_a?: number;
  communication_protocol?: string;
  supported_batteries_count?: number;
  warranty_years?: number;
}

export interface StringBoxSpec {
  inputs_count: number;
  outputs_count: number;
  max_voltage_v: number;
  max_current_a?: number;
  dps_included?: boolean;
  switch_included?: boolean;
  fuses_included?: boolean;
  warranty_years?: number;
}

export type InverterSpec =
  | StringInverterSpec
  | MicroInverterSpec
  | HybridInverterSpec
  | OffGridInverterSpec;

export interface StructureKitSpec {
  roof_type: string;
  max_modules: number;
}

export interface DcCableSpec {
  section_mm2: number;
  max_voltage: number;
  roll_length_m?: number;
}

export interface ConnectorSpec {
  type: string;
}

export interface ProfileSpec {
  length_m: number;
  structure_type?: string;
  profile_type?: string;
}

export type ProductSpecs =
  | ModuleSpec
  | StringInverterSpec
  | MicroInverterSpec
  | HybridInverterSpec
  | OffGridInverterSpec
  | BatterySpec
  | BmsSpec
  | StringBoxSpec
  | StructureKitSpec
  | DcCableSpec
  | ConnectorSpec
  | ProfileSpec;

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

export function isHybridInverterSpec(specs: unknown): specs is HybridInverterSpec {
  return (
    typeof specs === "object" &&
    specs !== null &&
    "type" in specs &&
    (specs as { type: string }).type === "hybrid" &&
    "nominal_power_w" in specs
  );
}

export function isOffGridInverterSpec(specs: unknown): specs is OffGridInverterSpec {
  return (
    typeof specs === "object" &&
    specs !== null &&
    "type" in specs &&
    (specs as { type: string }).type === "off_grid" &&
    "nominal_power_w" in specs
  );
}

export function isBatterySpec(specs: unknown): specs is BatterySpec {
  return (
    typeof specs === "object" &&
    specs !== null &&
    "capacity_kwh" in specs &&
    "nominal_voltage_v" in specs
  );
}

export function isBmsSpec(specs: unknown): specs is BmsSpec {
  return typeof specs === "object" && specs !== null;
}

export function isStringBoxSpec(specs: unknown): specs is StringBoxSpec {
  return (
    typeof specs === "object" &&
    specs !== null &&
    ("inputs_count" in specs || "outputs_count" in specs || "max_voltage_v" in specs)
  );
}

export function isInverterSpec(specs: unknown): specs is InverterSpec {
  return (
    isStringInverterSpec(specs) ||
    isMicroInverterSpec(specs) ||
    isHybridInverterSpec(specs) ||
    isOffGridInverterSpec(specs)
  );
}
