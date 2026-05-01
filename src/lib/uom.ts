/**
 * UOM helpers · convert any quoted price into a price-per-base-unit.
 *
 * Example: a kg quote of ₹78.50 with factor 1000 → ₹0.0785/gm.
 */

export interface UomDef {
  code: string;
  label: string;
  factor: number;
  base_uom: string;
  is_active?: boolean;
}

/** Find a UOM def by code (case-insensitive). Returns null when missing. */
export function findUom(uoms: UomDef[] | null | undefined, code: string | null | undefined): UomDef | null {
  if (!uoms || !code) return null;
  const lc = code.trim().toLowerCase();
  return uoms.find((u) => u.code.toLowerCase() === lc) ?? null;
}

/** Convert a quantity in `code` units to its base unit. */
export function toBase(qty: number, code: string, uoms: UomDef[]): { qty: number; base: string } | null {
  const u = findUom(uoms, code);
  if (!u) return null;
  return { qty: qty * Number(u.factor || 1), base: u.base_uom };
}

/** Compute price per base unit. Returns null when the UOM is unknown or already the base. */
export function pricePerBase(
  unitPrice: number,
  code: string | null | undefined,
  uoms: UomDef[],
): { price: number; base: string; from: UomDef } | null {
  const u = findUom(uoms, code);
  if (!u) return null;
  const factor = Number(u.factor || 1);
  if (!Number.isFinite(factor) || factor <= 0) return null;
  if (u.code === u.base_uom || factor === 1) return null;
  return { price: unitPrice / factor, base: u.base_uom, from: u };
}

/** Trim trailing zeros for tiny derived prices. */
export function formatBasePrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}