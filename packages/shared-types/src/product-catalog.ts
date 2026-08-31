export const PRODUCT_CATEGORY_NAMES = [
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

export type ProductCategoryName = (typeof PRODUCT_CATEGORY_NAMES)[number];

export function isProductCategoryName(value: string): value is ProductCategoryName {
  return (PRODUCT_CATEGORY_NAMES as readonly string[]).includes(value);
}

export interface ProposalEquipmentLine {
  productId: string;
  quantity: number;
}
