import { useEffect, useState } from "react";
import { History, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface HistoryRow {
  id: string;
  previous_price: number;
  new_price: number;
  effective_at: string;
  lead_time_days: number;
  note: string | null;
}

interface Props {
  supplierId: string;
  variantId: string;
}

/**
 * Shows the last 5 price changes for a supplier-product pair.
 * Trigger is a small "History" button; opens a popover.
 */
export function PriceHistoryPopover({ supplierId, variantId }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    supabase
      .from("supplier_price_history")
      .select("id, previous_price, new_price, effective_at, lead_time_days, note")
      .eq("supplier_id", supplierId)
      .eq("variant_id", variantId)
      .order("effective_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (cancel) return;
        setRows((data ?? []) as HistoryRow[]);
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [open, supplierId, variantId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" title="Price history" className="h-8 w-8">
          <History className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Last 5 price changes</p>
          <p className="text-[10px] text-muted-foreground">Older entries are auto-trimmed.</p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">
              No prior price changes logged.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const delta = Number(r.new_price) - Number(r.previous_price);
                const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                const tone = delta > 0 ? "text-amber-600" : delta < 0 ? "text-emerald-600" : "text-muted-foreground";
                return (
                  <li key={r.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-muted-foreground">₹{Number(r.previous_price).toFixed(2)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-foreground">₹{Number(r.new_price).toFixed(2)}</span>
                        <Icon className={`h-3 w-3 ${tone}`} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(r.effective_at), "d MMM yy")}
                      </span>
                    </div>
                    {r.note && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{r.note}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}