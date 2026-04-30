import { useEffect, useState } from "react";
import { ArrowDownToLine, Trash2, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface LineRow {
  id: string;
  qty: number;
  condition: "resaleable" | "repairable" | "scrap";
  variant: { variant_name: string; product: { name: string } | null } | null;
  restock_zone: { name: string; warehouse: { name: string } | null } | null;
}

interface MovementRow {
  qty: number;
  reason: string;
  variant_id: string;
  to_zone_id: string | null;
}

interface Props { goodsReturnId: string }

/**
 * Per-line inventory impact summary shown after a goods return is received.
 * Resaleable lines list the zone they restocked into, others are marked as scrapped.
 * Also reconciles against posted stock_movements so users can see what actually
 * landed in inventory vs what was planned.
 */
export function GRLineImpacts({ goodsReturnId }: Props) {
  const [lines, setLines] = useState<LineRow[]>([]);
  const [moves, setMoves] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [lRes, mRes] = await Promise.all([
        supabase.from("goods_return_lines").select(`
          id, qty, condition,
          variant:product_variants(variant_name, product:products(name)),
          restock_zone:warehouse_zones!goods_return_lines_restock_zone_id_fkey(name, warehouse:warehouses(name))
        `).eq("goods_return_id", goodsReturnId),
        supabase.from("stock_movements")
          .select("qty, reason, variant_id, to_zone_id")
          .eq("reference_type", "goods_return")
          .eq("reference_id", goodsReturnId),
      ]);
      if (cancelled) return;
      setLines((lRes.data ?? []) as unknown as LineRow[]);
      setMoves((mRes.data ?? []) as unknown as MovementRow[]);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [goodsReturnId]);

  if (loading) return <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  if (lines.length === 0) {
    return <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">No lines on this return.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((l) => {
        const isResale = l.condition === "resaleable";
        const Icon = isResale ? ArrowDownToLine : Trash2;
        const tone = isResale ? "text-emerald-600 bg-emerald-500/10" : "text-destructive bg-destructive/10";
        const posted = moves.some((m) =>
          m.variant_id && m.qty === Number(l.qty) &&
          (isResale ? m.reason === "return" : m.reason === "scrap")
        );
        return (
          <li key={l.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {l.variant?.product?.name ?? "Unknown"} · {l.variant?.variant_name ?? ""}
                </span>
                <span className={`font-mono text-sm font-semibold ${isResale ? "text-emerald-600" : "text-destructive"}`}>
                  {isResale ? "+" : "−"}{Number(l.qty).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {isResale ? (
                  l.restock_zone ? (
                    <span>Restocked into · {l.restock_zone.warehouse?.name} · {l.restock_zone.name}</span>
                  ) : (
                    <span className="text-amber-700">No restock zone recorded</span>
                  )
                ) : (
                  <span>Scrapped · {l.condition}</span>
                )}
                {posted ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                    <PackageCheck className="mr-1 h-3 w-3" /> Posted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">Pending</Badge>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}