import { useEffect, useState, useCallback } from "react";
import { TrendingUp, RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { recomputeVariantCost } from "@/server/costing.functions";

interface Snapshot {
  effective_cost: number;
  manufacture_cost: number;
  purchase_cost: number;
  breakdown: Record<string, number | string | boolean | null>;
  snapshot_at: string;
}
interface PriceHistoryRow { received_at: string; landed_cost: number; unit_cost: number; qty: number }

interface Props { variantId: string; productUom?: string }

export function CostEnginePanel({ variantId, productUom }: Props) {
  const { role } = useRole();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const recompute = useServerFn(recomputeVariantCost);

  const load = useCallback(async () => {
    if (!variantId) return;
    setLoading(true);
    const [{ data: s }, { data: h }] = await Promise.all([
      supabase
        .from("product_cost_snapshots")
        .select("effective_cost, manufacture_cost, purchase_cost, breakdown, snapshot_at")
        .eq("variant_id", variantId)
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("purchase_cost_history")
        .select("received_at, landed_cost, unit_cost, qty")
        .eq("variant_id", variantId)
        .order("received_at", { ascending: false })
        .limit(5),
    ]);
    setSnap(s as Snapshot | null);
    setHistory((h ?? []) as PriceHistoryRow[]);
    setLoading(false);
  }, [variantId]);

  useEffect(() => { void load(); }, [load]);

  const onRecompute = async () => {
    if (!variantId) return;
    setBusy(true);
    try {
      await recompute({ data: { variantId } });
      toast.success("Cost recomputed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recompute failed");
    } finally {
      setBusy(false);
    }
  };

  // Role gating
  const isAdminLike = role === "admin" || role === "manager";
  const isSupervisor = role === "supervisor" || role === "sales";
  const isDispatch = role === "dispatch" || role === "worker";

  if (!variantId) {
    return <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Save the product first to see costing.</div>;
  }
  if (loading) return <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading cost…</div>;
  if (!snap) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm text-muted-foreground">No cost snapshot yet. Add a BOM, production stage, or supplier quote, then recompute.</p>
        {isAdminLike && (
          <Button size="sm" onClick={onRecompute} disabled={busy} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> {busy ? "Recomputing…" : "Recompute now"}
          </Button>
        )}
      </div>
    );
  }

  const b = snap.breakdown as Record<string, number | string | boolean | null>;
  const isVariation = b.kind === "variation";

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cost engine</h3>
          <Badge variant="outline" className="ml-2 font-mono text-[10px]">As of {new Date(snap.snapshot_at).toLocaleString()}</Badge>
        </div>
        {isAdminLike && (
          <Button size="sm" variant="outline" onClick={onRecompute} disabled={busy} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Recompute
          </Button>
        )}
      </header>

      {/* Headline · always visible */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isDispatch ? "Sale price" : "Effective cost"} · per {b.product_uom ?? productUom ?? "unit"}
        </p>
        <p className="font-mono text-2xl font-semibold tabular-nums">
          ₹{Number(snap.effective_cost).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}
        </p>
      </div>

      {/* Supplier landed breakdown · admin only */}
      {isAdminLike && !isVariation && Number(b.quote_unit_price) > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier landed cost</p>
          <Row label={`Unit price · per ${b.product_uom ?? "unit"}`} value={String(b.quote_unit_price ?? 0)} />
          {Number(b.quote_freight) > 0 && <Row label="Freight" value={String(b.quote_freight)} />}
          {Number(b.quote_transport) > 0 && <Row label="Transport" value={String(b.quote_transport)} />}
          {Number(b.quote_pickup) > 0 && <Row label="Pickup" value={String(b.quote_pickup)} />}
          {Number(b.quote_landing_other) > 0 && <Row label="Other landing" value={String(b.quote_landing_other)} />}
          <Row label={`Landed per ${b.product_uom ?? "unit"} (÷ MOQ ${b.quote_moq ?? 1})`} value={String(b.quote_landed_per_uom ?? 0)} bold />
          {Number(b.uom_factor) > 1 && (
            <p className="pt-1 font-mono text-[11px] text-muted-foreground">
              ÷ UOM factor {String(b.uom_factor)} → ₹{Number(b.purchase).toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}/base
            </p>
          )}
        </div>
      )}

      {/* Manufacturing waterfall · admin + supervisor */}
      {(isAdminLike || isSupervisor) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isVariation ? `Pack of ${b.units_per_pack ?? "—"}` : "Manufacturing"}
          </p>
          {isVariation
            ? <RenderVariation b={b} total={Number(snap.effective_cost)} />
            : <RenderBase b={b} total={Number(snap.manufacture_cost ?? 0)} purchase={Number(snap.purchase_cost ?? 0)} effective={Number(snap.effective_cost)} />}
        </div>
      )}

      {/* Last 5 supplier prices · admin only */}
      {isAdminLike && history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last 5 supplier receipts</p>
          </div>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/40 py-1 text-xs last:border-0">
                <span className="text-muted-foreground">{new Date(h.received_at).toLocaleDateString()}</span>
                <span className="font-mono tabular-nums">{Number(h.qty).toFixed(2)} × ₹{Number(h.landed_cost).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-border/50 py-1.5 text-sm last:border-0 ${bold ? "mt-1 border-t border-foreground/30 pt-2 font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-mono tabular-nums">₹{Number(value).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}</span>
    </div>
  );
}

function RenderBase({ b, total, purchase, effective }: { b: Record<string, number | string | boolean | null>; total: number; purchase: number; effective: number }) {
  return (
    <>
      {purchase > 0 && <Row label="Purchase cost (per base)" value={String(purchase)} />}
      {Number(b.manufacture) > 0 && <Row label="BOM material build-up" value={String(b.manufacture)} />}
      {Number(b.stage_total) > 0 && (
        <Row label={`Production stages · scrap burden ${Number(b.max_rejection_pct ?? 0).toFixed(1)}%`} value={String(b.stage_total)} />
      )}
      <Row label="Effective cost" value={String(effective)} bold />
    </>
  );
}

function RenderVariation({ b, total }: { b: Record<string, number | string | boolean | null>; total: number }) {
  const upp = Number(b.units_per_pack ?? 1);
  const baseCost = Number(b.base_cost ?? 0);
  return (
    <>
      <Row label={`Base × ${upp}`} value={String(baseCost * upp)} />
      {Number(b.pack_material) > 0 && <Row label="Pack material" value={String(b.pack_material)} />}
      {Number(b.pack_labour) > 0 && <Row label="Pack labour" value={String(b.pack_labour)} />}
      {Number(b.pack_overhead) > 0 && <Row label="Pack overhead" value={String(b.pack_overhead)} />}
      {Number(b.packing_stage_total) > 0 && <Row label="Packing stages" value={String(b.packing_stage_total)} />}
      <Row label="Final pack cost" value={String(total)} bold />
    </>
  );
}