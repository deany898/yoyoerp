import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductWithVariants } from "@/hooks/useErpData";
import type { TierPriceMap } from "@/lib/quick-order-pricing";
import type { TierRow } from "@/lib/quick-order-pricing";
import { isBulkTier, RESERVED_TIERS } from "@/lib/quick-order-pricing";

const TYPE_LABEL: Record<string, string> = {
  raw_material: "Raw",
  packaging: "Pack",
  wip: "Semi",
  finished_good: "FG",
};

const TYPE_TONE: Record<string, string> = {
  raw_material: "bg-amber-100 text-amber-900",
  packaging: "bg-cyan-100 text-cyan-900",
  wip: "bg-violet-100 text-violet-900",
  finished_good: "bg-emerald-100 text-emerald-900",
};

interface Props {
  product: ProductWithVariants;
  showCost: boolean;
  tierMap: TierPriceMap;
  tierRows?: TierRow[];
  imageUrl?: string;
  onClick?: () => void;
}

interface BulkRow {
  minQty: number;
  label: string;
  price: number;
}

function variantLabel(v: ProductWithVariants["variants"][number]) {
  // Wholesale model: variant_name is THE label ("Regular", "Premium", "Box", "Carton", …).
  return v.variant_name?.trim() || "Default";
}

/**
 * Wholesale product card · 1-col mobile, 2-col desktop.
 *   IMG · (Title + Variant select + Price + DP) · BULK BUY table
 * No SKU, no product code — wholesale buyers don't need them on the card.
 */
export function ProductCard({ product, showCost, tierMap, tierRows, imageUrl, onClick }: Props) {
  const [variantId, setVariantId] = useState<string>(() => product.variants[0]?.id ?? "");
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  const { price, dp, bulk, margin } = useMemo(() => {
    if (!variant) return { price: 0, dp: 0, bulk: [] as BulkRow[], margin: null as number | null };
    const v = variant;
    const cost = Number(v.manual_purchase_cost ?? v.purchase_cost ?? v.avg_cost ?? 0);
    const standard = tierMap[`${v.id}:${RESERVED_TIERS.standard}`] ?? Number(v.last_cost ?? 0) ?? 0;
    const dealer = tierMap[`${v.id}:${RESERVED_TIERS.dealer}`] ?? (standard > 0 ? standard * 0.9 : 0);

    // Build bulk slabs from raw rows when available — preserves the admin's label ("10 Box (100 unit)").
    let rows: BulkRow[] = [];
    if (tierRows && tierRows.length > 0) {
      rows = tierRows
        .filter((r) => r.variant_id === v.id && isBulkTier(r.tier_name))
        .map((r) => ({ minQty: Number(r.min_qty || 0), label: r.tier_name, price: Number(r.price) }));
    } else {
      // Fallback: derive from tierMap (no labels, parse digits).
      for (const key of Object.keys(tierMap)) {
        if (!key.startsWith(`${v.id}:`)) continue;
        const tierName = key.slice(v.id.length + 1);
        if (!isBulkTier(tierName)) continue;
        const m = /(\d+)/.exec(tierName);
        const qty = m ? Number(m[1]) : 0;
        rows.push({ minQty: qty, label: tierName, price: tierMap[key] });
      }
    }
    rows.sort((a, b) => a.minQty - b.minQty);

    const m = standard > 0 && cost > 0 ? ((standard - cost) / standard) * 100 : null;
    return { price: standard, dp: dealer, bulk: rows.slice(0, 4), margin: m };
  }, [variant, tierMap, tierRows]);

  const lowMargin = margin !== null && margin < 15;
  const variants = product.variants;
  const useChips = variants.length > 1 && variants.length <= 3;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group flex w-full cursor-pointer flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.22)] sm:flex-row sm:items-stretch"
    >
      {/* Image */}
      <div className="flex aspect-square h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 sm:h-36 sm:w-36">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-10 w-10 text-muted-foreground/60" />
        )}
      </div>

      {/* Middle: title, variant, prices */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold leading-tight text-primary">
              {product.name}
            </div>
            {product.category?.name && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {product.category.name}
              </div>
            )}
          </div>
          {product.product_type !== "raw_material" && (
            <Badge className={cn("shrink-0 text-[10px]", TYPE_TONE[product.product_type] ?? "")}>
              {TYPE_LABEL[product.product_type] ?? product.product_type}
            </Badge>
          )}
        </div>

        <div className="mt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Variant
          </div>
          {variants.length <= 1 ? (
            <div className="mt-1 inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium">
              {variant ? variantLabel(variant) : "Default"}
            </div>
          ) : useChips ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {variants.map((v) => {
                const isActive = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVariantId(v.id);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/50",
                    )}
                  >
                    {variantLabel(v)}
                  </button>
                );
              })}
            </div>
          ) : (
            <select
              value={variantId}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                setVariantId(e.target.value);
              }}
              className="mt-1 h-9 w-full max-w-[200px] rounded-md border border-border bg-background px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {variantLabel(v)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-3 space-y-0.5 text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-mono font-semibold text-foreground">
              {price > 0 ? `₹${price.toFixed(2)}` : "—"}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">DP:</span>
            <span className="font-mono font-semibold text-foreground">
              {dp > 0 ? `₹${dp.toFixed(2)}` : "—"}
            </span>
          </div>
        </div>

        {showCost && margin !== null && (
          <div className="mt-2">
            <span
              className={cn(
                "inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                lowMargin ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900",
              )}
            >
              {margin.toFixed(0)}% margin
            </span>
          </div>
        )}
      </div>

      {/* Right: BULK BUY */}
      <div className="w-full shrink-0 overflow-hidden rounded-xl border border-border sm:w-56">
        <div className="border-b border-border bg-muted/40 px-3 py-2 text-center text-[12px] font-bold uppercase tracking-[0.22em] text-primary">
          Bulk buy
        </div>
        {bulk.length === 0 ? (
          <div className="flex min-h-[88px] items-center justify-center px-2 py-3 text-center text-[11px] text-muted-foreground">
            No bulk pricing
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <tbody>
              {bulk.map((b) => (
                <tr key={b.label} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-1.5 text-foreground">
                    <span className="font-semibold">{b.label}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono font-semibold text-foreground">
                    ₹{b.price.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}