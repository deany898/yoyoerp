import { supabase } from "@/integrations/supabase/client";

export interface TierPriceMap {
  /** key = `${variant_id}:${tier_name}` -> price */
  [key: string]: number;
}

export async function loadTierPrices(): Promise<TierPriceMap> {
  const { data, error } = await supabase
    .from("product_pricing_tiers")
    .select("variant_id,tier_name,price,valid_from,valid_until,min_qty");
  if (error || !data) return {};
  const today = new Date().toISOString().slice(0, 10);
  const map: TierPriceMap = {};
  for (const r of data as Array<{ variant_id: string; tier_name: string; price: number; valid_from: string | null; valid_until: string | null }>) {
    if (r.valid_from && r.valid_from > today) continue;
    if (r.valid_until && r.valid_until < today) continue;
    map[`${r.variant_id}:${r.tier_name}`] = Number(r.price);
  }
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