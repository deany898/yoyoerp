import { supabase } from "@/integrations/supabase/client";

export interface TierPriceMap {
  /** key = `${variant_id}:${tier_name}` -> price */
  [key: string]: number;
}

export interface TierRow {
  variant_id: string;
  tier_name: string;
  price: number;
  min_qty: number;
  valid_from: string | null;
  valid_until: string | null;
}

/** Reserved tier names — every variant gets one of each for Standard / Dealer. */
export const RESERVED_TIERS = { standard: "standard", dealer: "dealer" } as const;

export function isBulkTier(tier: string) {
  return tier !== RESERVED_TIERS.standard && tier !== RESERVED_TIERS.dealer;
}

/** Loads every active pricing tier row (used by editors and the bulk-buy table). */
export async function loadTierRows(): Promise<TierRow[]> {
  const { data, error } = await supabase
    .from("product_pricing_tiers")
    .select("variant_id,tier_name,price,min_qty,valid_from,valid_until");
  if (error || !data) return [];
  const today = new Date().toISOString().slice(0, 10);
  return (data as TierRow[]).filter((r) => {
    if (r.valid_from && r.valid_from > today) return false;
    if (r.valid_until && r.valid_until < today) return false;
    return true;
  });
}

export async function loadTierPrices(): Promise<TierPriceMap> {
  const rows = await loadTierRows();
  const map: TierPriceMap = {};
  for (const r of rows) map[`${r.variant_id}:${r.tier_name}`] = Number(r.price);
  return map;
}

export function resolvePrice(
  variantId: string,
  tier: string,
  cost: number,
  tierMap: TierPriceMap,
  fallbackMarkup = 1.25,
): number {
  const tiered = tierMap[`${variantId}:${tier}`] ?? tierMap[`${variantId}:standard`];
  if (tiered && tiered > 0) return tiered;
  return Number((cost * fallbackMarkup).toFixed(2));
}

export function lineMath(opts: {
  qty: number;
  unitPrice: number;
  factor: number;
  discountPct: number;
  taxRate: number;
  discountMode?: "pct" | "amt";
  discountAmt?: number;
}) {
  const gross = opts.qty * opts.unitPrice * opts.factor;
  const mode = opts.discountMode ?? "pct";
  const discount = mode === "amt"
    ? Math.min(Math.max(0, (opts.discountAmt ?? 0) * opts.qty), gross)
    : gross * (opts.discountPct / 100);
  const net = gross - discount;
  const tax = net * (opts.taxRate / 100);
  return { gross, discount, net, tax, total: net + tax };
}