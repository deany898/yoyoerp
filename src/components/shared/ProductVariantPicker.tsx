import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductWithVariants } from "@/hooks/useErpData";

export interface PickedVariant {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  uom: string;
}

interface Props {
  products: ProductWithVariants[];
  value: PickedVariant | null;
  onChange: (v: PickedVariant | null) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  excludeVariantIds?: Set<string>;
}

/**
 * Shared product+variant picker.
 * Searches by product name, code, SKU, or variant name.
 * Click any row to select; selected row stays pinned.
 */
export function ProductVariantPicker({
  products,
  value,
  onChange,
  onCreateNew,
  placeholder = "Search product or SKU…",
  excludeVariantIds,
}: Props) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out: PickedVariant[] = [];
    for (const p of products) {
      for (const v of p.variants ?? []) {
        if (excludeVariantIds?.has(v.id)) continue;
        const hay = `${p.name} ${p.code} ${v.sku} ${v.variant_name}`.toLowerCase();
        if (term && !hay.includes(term)) continue;
        out.push({
          productId: p.id,
          variantId: v.id,
          productName: p.name,
          variantName: v.variant_name,
          sku: v.sku,
          uom: p.uom,
        });
        if (out.length >= 60) break;
      }
      if (out.length >= 60) break;
    }
    return out;
  }, [products, q, excludeVariantIds]);

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{value.productName}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {value.sku} · {value.variantName} · {value.uom}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Change</Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="h-9 pl-8"
            />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-xs text-muted-foreground">No matches.</p>
                {onCreateNew && (
                  <Button size="sm" variant="outline" onClick={onCreateNew} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> New product
                  </Button>
                )}
              </div>
            ) : (
              rows.map((r) => (
                <button
                  key={r.variantId}
                  type="button"
                  onClick={() => onChange(r)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-accent"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{r.productName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {r.sku} · {r.variantName}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2 text-[10px]">{r.uom}</Badge>
                </button>
              ))
            )}
          </div>
          {onCreateNew && rows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={onCreateNew} className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" /> Create new product
            </Button>
          )}
        </>
      )}
    </div>
  );
}