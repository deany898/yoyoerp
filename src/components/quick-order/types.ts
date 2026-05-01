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

export interface PackagingRow {
  product_id: string;
  kind: string;          // "pack" | "case" | "pallet" | custom
  name: string;          // user label, e.g. "Case 12", "Pallet 100"
  units_per_pack: number;
}

export interface UomOption {
  value: string;         // stable id stored on the line
  label: string;
  factor: number;        // base units per 1 of this UOM
}

/**
 * Build the UOM list a given product/variant actually supports.
 * - "each" is always present (the base unit).
 * - "pack" appears only if the variant's units_per_pack > 1.
 * - Anything in product_packaging for the same product is appended.
 */
export function getUomOptions(
  variant: PickerVariant | null,
  packaging: PackagingRow[],
): UomOption[] {
  const out: UomOption[] = [{ value: "each", label: "Each", factor: 1 }];
  if (!variant) return out;
  if (variant.units_per_pack > 1) {
    out.push({
      value: "pack",
      label: `Pack (× ${variant.units_per_pack})`,
      factor: variant.units_per_pack,
    });
  }
  for (const p of packaging.filter((r) => r.product_id === variant.product_id)) {
    if (!p.units_per_pack || p.units_per_pack < 1) continue;
    const value = `pkg:${p.name}`;
    if (out.some((o) => o.value === value)) continue;
    out.push({ value, label: p.name, factor: Number(p.units_per_pack) });
  }
  return out;
}

export function uomFactor(
  uom: string,
  unitsPerPack: number,
  options?: UomOption[],
): number {
  if (uom === "each") return 1;
  if (uom === "pack") return unitsPerPack || 1;
  if (options) {
    const opt = options.find((o) => o.value === uom);
    if (opt) return opt.factor;
  }
  // Legacy fallbacks for old drafts saved before dynamic UOM
  if (uom === "case_12") return 12;
  if (uom === "case_24") return 24;
  if (uom === "pallet") return 100;
  return 1;
}