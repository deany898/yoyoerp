import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductWithVariants } from "@/hooks/useErpData";
import type { TierPriceMap } from "@/lib/quick-order-pricing";

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
  imageUrl?: string;
  onClick?: () => void;
}

interface BulkRow {
  minQty: number;
  tierName: string;
  price: number;
}

function variantLabel(v: ProductWithVariants["variants"][number]) {
  const vl = (v as unknown as { variant_label?: string }).variant_label;
  return vl?.trim() || v.sku || "Default";
}

/**
 * Wide product card · 1-col mobile, 2-col desktop.
 * Image · Variant select · Price/DP on the left, BULK BUY tier table on the right.
 */
export function ProductCard({ product, showCost, tierMap, imageUrl, onClick }: Props) {
  const [variantId, setVariantId] = useState<string>(() => product.variants[0]?.id ?? "");
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  const { price, dp, bulk, margin } = useMemo(() => {
    if (!variant) return { price: 0, dp: 0, bulk: [] as BulkRow[], margin: null as number | null };
    const v = variant;
    const cost = Number(v.manual_purchase_cost ?? v.purchase_cost ?? v.avg_cost ?? 0);
    const standard = tierMap[`${v.id}:standard`] ?? Number(v.last_cost ?? 0) ?? 0;
    const dealer = tierMap[`${v.id}:dealer`] ?? (standard > 0 ? standard * 0.9 : 0);
    // Bulk rows: every tier where min_qty > 1
    const rows: BulkRow[] = [];
    for (const key of Object.keys(tierMap)) {
      if (!key.startsWith(`${v.id}:`)) continue;
      const tierName = key.slice(v.id.length + 1);
      if (tierName === "standard" || tierName === "dealer") continue;
      // We can't read min_qty from map directly; tier_name encodes the bulk break.
      // Convention: bulk tiers named like "bulk_10", "bulk_20" or numeric.
      const m = /(\d+)/.exec(tierName);
      if (!m) continue;
      rows.push({ minQty: Number(m[1]), tierName, price: tierMap[key] });
    }
    rows.sort((a, b) => a.minQty - b.minQty);
    const m =
      standard > 0 && cost > 0 ? ((standard - cost) / standard) * 100 : null;
    return { price: standard, dp: dealer, bulk: rows.slice(0, 3), margin: m };
  }, [variant, tierMap]);

  const lowMargin = margin !== null && margin < 15;

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
      className="group flex w-full cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-[0_6px_20px_-10px_rgba(15,23,42,0.22)] sm:flex-row sm:items-stretch sm:gap-4"
    >
      {/* Image */}
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 sm:h-28 sm:w-28">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground/60" />
        )}
      </div>

      {/* Middle: title, variant, prices */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-base font-bold leading-tight text-primary">
              {product.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-mono">{product.code}</span>
              {product.category?.name && <span>· {product.category.name}</span>}
            </div>
          </div>
          {product.product_type !== "raw_material" && (
            <Badge className={cn("shrink-0 text-[10px]", TYPE_TONE[product.product_type] ?? "")}>
              {TYPE_LABEL[product.product_type] ?? product.product_type}
            </Badge>
          )}
        </div>

        {product.variants.length > 1 ? (
          <div className="mt-2">
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Variant
            </label>
            <select
              value={variantId}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                setVariantId(e.target.value);
              }}
              className="w-full max-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {variantLabel(v)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">
            Variant: <span className="font-medium text-foreground">{variant ? variantLabel(variant) : "—"}</span>
          </div>
        )}

        <div className="mt-2 space-y-0.5 text-sm">
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
      <div className="hidden w-48 shrink-0 overflow-hidden rounded-lg border border-border sm:block">
        <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
          Bulk buy
        </div>
        {bulk.length === 0 ? (
          <div className="flex h-[calc(100%-30px)] min-h-[80px] items-center justify-center px-2 py-3 text-center text-[11px] text-muted-foreground">
            No bulk pricing
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <tbody>
              {bulk.map((b) => (
                <tr key={b.tierName} className="border-b border-border last:border-b-0">
                  <td className="px-2 py-1.5">
                    <span className="font-semibold text-foreground">{b.minQty}</span>
                    <span className="ml-1 text-muted-foreground">{b.tierName.replace(/[_\d]+/g, " ").trim() || "qty"}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-foreground">
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