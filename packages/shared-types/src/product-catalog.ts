export const PRODUCT_CATEGORY_NAMES = [
  "module",
  "inverter",
  "microinverter",
  "structure_kit",
  "dc_cable",
  "connector",
] as const;

export type ProductCategoryName = (typeof PRODUCT_CATEGORY_NAMES)[number];

export function isProductCategoryName(value: string): value is ProductCategoryName {
  return (PRODUCT_CATEGORY_NAMES as readonly string[]).includes(value);
}

export interface ProposalEquipmentLine {
  productId: string;
  quantity: number;
}
