import { z } from "zod";

const positiveNumber = z.coerce
  .number({ invalid_type_error: "Informe um número válido" })
  .finite("Informe um número válido")
  .positive("Deve ser positivo");
const percentNumber = positiveNumber.max(100, "Máximo 100%");
const nonNegativeNumber = z.number().min(0, "Deve ser ≥ 0");

export const brandSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  country: z.string().optional(),
  image_url: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
  categories: z.array(z.string()).optional(),
});

export const distributorSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().optional(),
});
export type DistributorFormValues = z.infer<typeof distributorSchema>;

export const distributorProductSchema = z.object({
  product_id: z.string().min(1, "Selecione um produto"),
  distributor_sku: z.string().optional(),
  price: nonNegativeNumber,
  stock_quantity: nonNegativeNumber.optional(),
  lead_time_days: nonNegativeNumber.optional(),
  minimum_order_quantity: z.number().int().min(1).optional(),
});
export type DistributorProductFormValues = z.infer<typeof distributorProductSchema>;

export const categoryNames = [
  "module",
  "inverter",
  "microinverter",
  "hybrid_inverter",
  "off_grid_inverter",
  "battery",
  "bms",
  "structure_kit",
  "dc_cable",
  "connector",
  "profile",
  "string_box",
] as const;
export type CategoryName = (typeof categoryNames)[number];

export const specsModuleSchema = z.object({
  power_w: positiveNumber,
  warranty_years: positiveNumber.optional(),
  voc: positiveNumber,
  vmp: positiveNumber,
  isc: positiveNumber,
  imp: positiveNumber,
  efficiency: percentNumber,
  max_system_voltage: positiveNumber,
  width_mm: positiveNumber,
  height_mm: positiveNumber,
});

export const specsInverterSchema = z.object({
  type: z.literal("string"),
  nominal_power_w: positiveNumber,
  warranty_years: positiveNumber.optional(),
  max_dc_voltage: positiveNumber,
  mppt_count: z.coerce.number().int().positive(),
  max_strings_per_mppt: z.coerce.number().int().positive(),
  mppt_voltage_min: positiveNumber,
  mppt_voltage_max: positiveNumber,
  max_input_current: positiveNumber,
  max_dc_power: positiveNumber,
  recommended_dc_ac_ratio_min: positiveNumber,
  recommended_dc_ac_ratio_max: positiveNumber,
});

export const specsMicroInverterSchema = z.object({
  type: z.literal("micro"),
  channels: z.coerce.number().int().positive(),
  warranty_years: positiveNumber.optional(),
  max_input_voltage: positiveNumber,
  max_input_current: positiveNumber,
  max_module_power: positiveNumber,
  min_module_power: positiveNumber,
});

export const specsHybridInverterSchema = z.object({
  type: z.literal("hybrid").default("hybrid"),
  nominal_power_w: positiveNumber,
  warranty_years: positiveNumber.optional(),
  max_dc_voltage: positiveNumber,
  mppt_count: z.coerce.number().int().positive(),
  max_strings_per_mppt: z.coerce.number().int().positive().optional(),
  mppt_voltage_min: positiveNumber,
  mppt_voltage_max: positiveNumber,
  max_input_current: positiveNumber,
  max_dc_power: positiveNumber,
  battery_voltage_type: z.enum(["low_voltage", "high_voltage"]).optional(),
  battery_nominal_voltage_v: positiveNumber.optional(),
  max_charge_current_a: positiveNumber.optional(),
  max_discharge_current_a: positiveNumber.optional(),
  eps_nominal_power_w: positiveNumber.optional(),
});

export const specsOffGridInverterSchema = z.object({
  type: z.literal("off_grid").default("off_grid"),
  nominal_power_w: positiveNumber,
  peak_power_w: positiveNumber.optional(),
  battery_nominal_voltage_v: positiveNumber,
  max_dc_voltage: positiveNumber.optional(),
  mppt_voltage_min: positiveNumber.optional(),
  mppt_voltage_max: positiveNumber.optional(),
  max_pv_power_w: positiveNumber.optional(),
  ac_output_voltage: positiveNumber.optional(),
  waveform: z.enum(["pure_sine", "modified_sine"]).optional(),
  warranty_years: positiveNumber.optional(),
});

export const specsBatterySchema = z.object({
  capacity_kwh: positiveNumber,
  capacity_ah: positiveNumber.optional(),
  nominal_voltage_v: positiveNumber,
  voltage_type: z.enum(["low_voltage", "high_voltage"]).optional(),
  chemistry: z.enum(["lifepo4", "lead_carbon", "lithium_ion", "other"]).optional(),
  dod_percent: percentNumber.optional(),
  cycles: z.coerce.number().int().positive().optional(),
  max_charge_current_a: positiveNumber.optional(),
  max_discharge_current_a: positiveNumber.optional(),
  warranty_years: positiveNumber.optional(),
});

export const specsBmsSchema = z.object({
  nominal_voltage_v: positiveNumber.optional(),
  max_voltage_v: positiveNumber.optional(),
  max_current_a: positiveNumber.optional(),
  communication_protocol: z.string().optional(),
  supported_batteries_count: z.coerce.number().int().positive().optional(),
  warranty_years: positiveNumber.optional(),
});

export const roofTypeOptions = [
  "ceramic",
  "metal",
  "fibromadeira",
  "fibrometal",
  "ground",
  "laje",
] as const;
export const specsStructureSchema = z.object({
  roof_type: z.enum(roofTypeOptions),
  max_modules: z.coerce.number().int().positive(),
});

export const specsDcCableSchema = z.object({
  section_mm2: positiveNumber,
  max_voltage: positiveNumber,
  color: z.string().optional(),
  roll_length_m: positiveNumber.optional(),
});

export const connectorTypeOptions = ["mc4"] as const;
export const specsConnectorSchema = z.object({
  type: z.enum(connectorTypeOptions),
});

export const specsProfileSchema = z.object({
  length_m: positiveNumber,
  structure_type: z.string().optional(),
  profile_type: z.string().optional(),
});

export const specsStringBoxSchema = z.object({
  inputs_count: z.coerce.number().int().positive().optional(),
  outputs_count: z.coerce.number().int().positive().optional(),
  max_voltage_v: positiveNumber.optional(),
  max_current_a: positiveNumber.optional(),
  dps_included: z.boolean().optional(),
  switch_included: z.boolean().optional(),
  fuses_included: z.boolean().optional(),
  warranty_years: positiveNumber.optional(),
});

const specsSchemaByCategory: Record<CategoryName, z.ZodType<Record<string, unknown>>> = {
  module: specsModuleSchema,
  inverter: specsInverterSchema,
  microinverter: specsMicroInverterSchema,
  hybrid_inverter: specsHybridInverterSchema,
  off_grid_inverter: specsOffGridInverterSchema,
  battery: specsBatterySchema,
  bms: specsBmsSchema,
  structure_kit: specsStructureSchema,
  dc_cable: specsDcCableSchema,
  connector: specsConnectorSchema,
  profile: specsProfileSchema,
  string_box: specsStringBoxSchema,
};

export const productBaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").toUpperCase(),
  brand_id: z.string().min(1, "Selecione a marca"),
  category_id: z.string().min(1, "Selecione a categoria"),
  image_url: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
  datasheet_url: z.string().url("URL do datasheet inválida").optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export function buildProductSchema(categoryName: CategoryName | null) {
  if (!categoryName) return productBaseSchema.extend({ specs: z.record(z.unknown()).optional() });
  const specsSchema = specsSchemaByCategory[categoryName];
  if (!specsSchema) return productBaseSchema.extend({ specs: z.record(z.unknown()).optional() });
  return productBaseSchema.extend({
    specs: specsSchema,
  });
}

export type BrandFormValues = z.infer<typeof brandSchema>;
export type SpecsModule = z.infer<typeof specsModuleSchema>;
export type SpecsInverter = z.infer<typeof specsInverterSchema>;
export type SpecsMicroInverter = z.infer<typeof specsMicroInverterSchema>;
export type SpecsHybridInverter = z.infer<typeof specsHybridInverterSchema>;
export type SpecsOffGridInverter = z.infer<typeof specsOffGridInverterSchema>;
export type SpecsBattery = z.infer<typeof specsBatterySchema>;
export type SpecsBms = z.infer<typeof specsBmsSchema>;
export type SpecsStructure = z.infer<typeof specsStructureSchema>;
export type SpecsDcCable = z.infer<typeof specsDcCableSchema>;
export type SpecsConnector = z.infer<typeof specsConnectorSchema>;
export type SpecsProfile = z.infer<typeof specsProfileSchema>;
export type SpecsStringBox = z.infer<typeof specsStringBoxSchema>;
