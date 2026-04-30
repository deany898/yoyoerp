import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Snapshot {
  effective_cost: number;
  manufacture_cost: number;
  purchase_cost: number;
  breakdown: Record<string, unknown>;
  snapshot_at: string;
}

interface Props { variantId: string }

export function CostWaterfall({ variantId }: Props) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [baseSnap, setBaseSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("product_cost_snapshots")
        .select("effective_cost, manufacture_cost, purchase_cost, breakdown, snapshot_at")
        .eq("variant_id", variantId)
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSnap(data as Snapshot | null);
      const kind = (data?.breakdown as { kind?: string } | null)?.kind;
      if (kind === "variation") {
        const { data: v } = await supabase
          .from("product_variants")
          .select("base_variant_id")
          .eq("id", variantId)
          .maybeSingle();
        if (v?.base_variant_id) {
          const { data: bs } = await supabase
            .from("product_cost_snapshots")
            .select("effective_cost, manufacture_cost, purchase_cost, breakdown, snapshot_at")
            .eq("variant_id", v.base_variant_id)
            .order("snapshot_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          setBaseSnap(bs as Snapshot | null);
        }
      }
      setLoading(false);
    })();
  }, [variantId]);

  if (loading) return <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading cost…</div>;
  if (!snap) return <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No cost snapshot yet. Add a BOM, stages, or supplier quote to compute cost.</div>;

  const b = snap.breakdown as Record<string, number | string | boolean>;
  const isVariation = b.kind === "variation";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cost waterfall</h2>
        </div>
        <span className="text-xs text-muted-foreground">As of {new Date(snap.snapshot_at).toLocaleString()}</span>
      </header>

      {isVariation && baseSnap && (
        <div className="mb-4 space-y-1 rounded-lg border border-dashed border-border bg-muted/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Base manufacturing</p>
          {renderBase(baseSnap.breakdown as Record<string, number>, baseSnap.effective_cost)}
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {isVariation ? `Pack of ${b.units_per_pack ?? "—"}` : "Manufacturing"}
        </p>
        {isVariation ? renderVariation(b, snap.effective_cost) : renderBase(b as Record<string, number>, snap.effective_cost)}
      </div>
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-border/50 py-1.5 text-sm last:border-0 ${bold ? "font-semibold border-t border-foreground/30 pt-2 mt-1" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-mono tabular-nums">₹{Number(value).toFixed(2)}</span>
    </div>
  );
}

function renderBase(b: Record<string, number | string | boolean>, total: number) {
  return (
    <>
      {Number(b.purchase) > 0 && <Row label="Purchase cost" value={String(b.purchase)} />}
      {Number(b.manufacture) > 0 && <Row label="Manufacture build-up" value={String(b.manufacture)} />}
      {Number(b.stage_total) > 0 && <Row label="Production stages (with rejection)" value={String(b.stage_total)} />}
      <Row label="Effective cost" value={String(total)} bold />
    </>
  );
}

function renderVariation(b: Record<string, number | string | boolean>, total: number) {
  const upp = Number(b.units_per_pack ?? 1);
  const baseCost = Number(b.base_cost ?? 0);
  return (
    <>
      <Row label={`Base × ${upp}`} value={String(baseCost * upp)} />
      {Number(b.pack_material) > 0 && <Row label="Pack material (poly/box/label)" value={String(b.pack_material)} />}
      {Number(b.pack_labour) > 0 && <Row label="Packing labour" value={String(b.pack_labour)} />}
      {Number(b.pack_overhead) > 0 && <Row label="Packing overhead" value={String(b.pack_overhead)} />}
      {Number(b.packing_stage_total) > 0 && <Row label="Packing stages" value={String(b.packing_stage_total)} />}
      <Row label="Final pack cost" value={String(total)} bold />
    </>
  );
}