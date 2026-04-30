import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Package, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PickerVariant } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variants: PickerVariant[];
  recentIds: string[];
  frequentIds: string[];
  onPick: (v: PickerVariant) => void;
}

export function ProductPickerSheet({ open, onOpenChange, variants, recentIds, frequentIds, onPick }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
    else setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recent = recentIds.map((id) => variants.find((v) => v.id === id)).filter(Boolean) as PickerVariant[];
      const freq = frequentIds.map((id) => variants.find((v) => v.id === id)).filter(Boolean) as PickerVariant[];
      const seen = new Set<string>();
      return [...recent, ...freq, ...variants].filter((v) => {
        if (seen.has(v.id)) return false; seen.add(v.id); return true;
      }).slice(0, 100);
    }
    return variants
      .filter((v) => v.product_name.toLowerCase().includes(q) || v.variant_name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q))
      .slice(0, 100);
  }, [variants, recentIds, frequentIds, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or SKU…"
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <button onClick={() => onOpenChange(false)} className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul>
            {filtered.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => { onPick(v); onOpenChange(false); }}
                  className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left active:bg-accent"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                    {v.image_url ? <img src={v.image_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{v.product_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{v.variant_name} · <span className="font-mono">{v.sku}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold tabular-nums">₹{v.tier_price.toFixed(0)}</div>
                    <Badge variant="outline" className={cn("mt-0.5 h-4 px-1 text-[10px]", v.stock > 0 ? "border-emerald-500/30 text-emerald-600" : "border-destructive/30 text-destructive")}>
                      {v.stock > 0 ? `${v.stock}` : "OOS"}
                    </Badge>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">No products match "{query}"</li>}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}