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
  "structure_kit",
  "dc_cable",
  "connector",
] as const;
export type CategoryName = (typeof categoryNames)[number];

export const specsModuleSchema = z.object({
  power_w: positiveNumber,
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
  max_input_voltage: positiveNumber,
  max_input_current: positiveNumber,
  max_module_power: positiveNumber,
  min_module_power: positiveNumber,
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
});

export const connectorTypeOptions = ["mc4"] as const;
export const specsConnectorSchema = z.object({
  type: z.enum(connectorTypeOptions),
});

const specsSchemaByCategory: Record<CategoryName, z.ZodType<Record<string, unknown>>> = {
  module: specsModuleSchema,
  inverter: specsInverterSchema,
  microinverter: specsMicroInverterSchema,
  structure_kit: specsStructureSchema,
  dc_cable: specsDcCableSchema,
  connector: specsConnectorSchema,
};

export const productBaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  brand_id: z.string().min(1, "Selecione a marca"),
  category_id: z.string().min(1, "Selecione a categoria"),
  image_url: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
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
export type SpecsStructure = z.infer<typeof specsStructureSchema>;
export type SpecsDcCable = z.infer<typeof specsDcCableSchema>;
export type SpecsConnector = z.infer<typeof specsConnectorSchema>;
