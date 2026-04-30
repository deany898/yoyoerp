import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Package, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PickerVariant } from "./types";

interface Props {
  variants: PickerVariant[];
  recentIds: string[];
  frequentIds: string[];
  selected: PickerVariant | null;
  onPick: (v: PickerVariant) => void;
  autoFocus?: boolean;
  compact?: boolean;
}

export function ProductInlinePicker({
  variants, recentIds, frequentIds, selected, onPick, autoFocus, compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => { if (autoFocus) setOpen(true); }, [autoFocus]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const list = q
      ? variants.filter((v) =>
          v.product_name.toLowerCase().includes(q) ||
          v.variant_name.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q))
      : variants.slice(0, 60);
    return list.slice(0, 80);
  }, [variants, debounced]);

  const recent = useMemo(
    () => recentIds.map((id) => variants.find((v) => v.id === id)).filter(Boolean) as PickerVariant[],
    [variants, recentIds],
  );
  const frequent = useMemo(
    () => frequentIds.map((id) => variants.find((v) => v.id === id)).filter(Boolean) as PickerVariant[],
    [variants, frequentIds],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm hover:border-primary/50",
            compact ? "h-8" : "h-9",
          )}
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          {selected ? (
            <span className="flex-1 truncate font-medium">
              {selected.product_name} <span className="text-muted-foreground">· {selected.variant_name}</span>
            </span>
          ) : (
            <span className="flex-1 truncate text-muted-foreground">Search product or SKU…</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[480px] p-0" sideOffset={4}>
        <div className="border-b border-border p-2">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type product, variant, or SKU…"
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {!debounced && (recent.length > 0 || frequent.length > 0) && (
            <Section title="Recent" items={recent.slice(0, 6)} onPick={(v) => { onPick(v); setOpen(false); }} />
          )}
          {!debounced && frequent.length > 0 && (
            <Section title="Frequent" items={frequent.slice(0, 6)} onPick={(v) => { onPick(v); setOpen(false); }} />
          )}
          <Section
            title={debounced ? "Results" : "All products"}
            items={filtered}
            onPick={(v) => { onPick(v); setOpen(false); }}
          />
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No products match "{debounced}"</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, items, onPick }: { title: string; items: PickerVariant[]; onPick: (v: PickerVariant) => void }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <ul>
        {items.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onPick(v)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                {v.image_url ? (
                  <img src={v.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{v.product_name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {v.variant_name} · <span className="font-mono">{v.sku}</span>
                  {v.units_per_pack > 1 && <span> · {v.units_per_pack}/pack</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold tabular-nums">₹{v.tier_price.toFixed(0)}</div>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-0.5 h-4 px-1 text-[10px]",
                    v.stock > 0 ? "border-emerald-500/30 text-emerald-600" : "border-destructive/30 text-destructive",
                  )}
                >
                  {v.stock > 0 ? `${v.stock} in stock` : "OOS"}
                </Badge>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}