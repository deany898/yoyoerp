export interface PickerVariant {
  id: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  cost: number;
  units_per_pack: number;
  image_url: string | null;
  stock: number;
  tier_price: number;
}

export const UOM_OPTIONS = [
  { value: "each", label: "Each", factor: 1 },
  { value: "pack", label: "Pack", factor: 1 },
  { value: "case_12", label: "Case 12", factor: 12 },
  { value: "case_24", label: "Case 24", factor: 24 },
  { value: "pallet", label: "Pallet 100", factor: 100 },
] as const;

export function uomFactor(uom: string, unitsPerPack: number): number {
  if (uom === "each") return 1;
  if (uom === "pack") return unitsPerPack || 1;
  return UOM_OPTIONS.find((u) => u.value === uom)?.factor ?? 1;
}