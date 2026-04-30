import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PickerVariant } from "./types";

interface Props {
  variants: PickerVariant[];
  recentIds: string[];
  onPick: (v: PickerVariant) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ProductSearchBox({ variants, recentIds, onPick, placeholder = "Search product or SKU…", autoFocus }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recent = recentIds.map((id) => variants.find((v) => v.id === id)).filter(Boolean) as PickerVariant[];
      const seen = new Set<string>();
      return [...recent, ...variants].filter((v) => {
        if (seen.has(v.id)) return false; seen.add(v.id); return true;
      }).slice(0, 30);
    }
    return variants.filter((v) =>
      v.product_name.toLowerCase().includes(q) ||
      v.variant_name.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q),
    ).slice(0, 30);
  }, [variants, recentIds, query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative rounded-xl border border-border bg-card p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Search className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          <ul>
            {list.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onPick(v); setQuery(""); setOpen(false); }}
                  className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left active:bg-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                    {v.image_url ? <img src={v.image_url} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{v.product_name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{v.variant_name} · <span className="font-mono">{v.sku}</span></div>
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
            {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}