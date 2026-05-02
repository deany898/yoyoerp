import { Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductWithVariants } from "@/hooks/useErpData";

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
  onClick?: () => void;
}

/**
 * Mobile-first product card · used at <md.
 * Public fields always visible; cost + margin only when showCost (admin/manager).
 */
export function ProductCard({ product, showCost, onClick }: Props) {
  const v = product.variants[0];
  const purchase = v ? Number(v.manual_purchase_cost ?? v.purchase_cost ?? v.avg_cost ?? 0) : 0;
  // Sale/Dealer prices come from product_pricing_tiers (wired in a follow-up).
  // For now we surface placeholders so the layout is finalised.
  const sale = v ? Number(v.last_cost ?? 0) : 0;
  const dealer = sale > 0 ? sale * 0.9 : 0;
  const margin = sale > 0 && purchase > 0 ? ((sale - purchase) / sale) * 100 : null;
  const lowMargin = margin !== null && margin < 15;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition active:scale-[0.99] hover:shadow-[0_4px_16px_-8px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight text-foreground">
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

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sale</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            {sale > 0 ? `₹${sale.toFixed(2)}` : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Dealer</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
            {dealer > 0 ? `₹${dealer.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Boxes className="h-3 w-3" />
          {product.variants.length} SKU{product.variants.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          {showCost && margin !== null && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                lowMargin ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900",
              )}
            >
              {margin.toFixed(0)}%
            </span>
          )}
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground",
            )}
          >
            {product.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </button>
  );
}