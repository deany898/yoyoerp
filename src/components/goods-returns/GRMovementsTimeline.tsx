import { useEffect, useState } from "react";
import { ArrowDownToLine, Trash2, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface MovementRow {
  id: string;
  qty: number;
  reason: string;
  performed_at: string;
  notes: string | null;
  variant: { variant_name: string; product: { name: string } | null } | null;
  to_zone: { name: string; warehouse: { name: string } | null } | null;
}

interface Props { goodsReturnId: string }

/**
 * Lists every stock_movement posted as a side-effect of a goods return.
 * Rendered inside the GR detail sheet so users can verify what was restocked
 * or scrapped after the lifecycle reached "Received".
 */
export function GRMovementsTimeline({ goodsReturnId }: Props) {
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id, qty, reason, performed_at, notes,
          variant:product_variants(variant_name, product:products(name)),
          to_zone:warehouse_zones!stock_movements_to_zone_id_fkey(name, warehouse:warehouses(name))
        `)
        .eq("reference_type", "goods_return")
        .eq("reference_id", goodsReturnId)
        .order("performed_at", { ascending: false });
      if (cancelled) return;
      if (!error) setRows((data ?? []) as unknown as MovementRow[]);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [goodsReturnId]);

  if (loading) {
    return <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        <Inbox className="h-4 w-4" />
        No stock movements posted yet · receive the return to restock.
      </div>
    );
  }

  return (
    <ol className="space-y-1">
      {rows.map((m) => {
        const isScrap = m.reason === "scrap";
        const Icon = isScrap ? Trash2 : ArrowDownToLine;
        const tone = isScrap
          ? "text-destructive bg-destructive/10"
          : "text-emerald-600 bg-emerald-500/10";
        return (
          <li key={m.id} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {m.variant?.product?.name ?? "Unknown"} · {m.variant?.variant_name ?? ""}
                </span>
                <span className={`font-mono text-sm font-semibold ${isScrap ? "text-destructive" : "text-emerald-600"}`}>
                  {isScrap ? "" : "+"}{Number(m.qty).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{m.reason}</span>
                {m.to_zone && (
                  <>
                    <span>·</span>
                    <span>{m.to_zone.warehouse?.name} · {m.to_zone.name}</span>
                  </>
                )}
              </div>
              {m.notes && <p className="mt-0.5 text-xs text-muted-foreground">{m.notes}</p>}
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(m.performed_at), { addSuffix: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}