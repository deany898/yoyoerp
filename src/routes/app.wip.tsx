import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Layers, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGate } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { HandoffSheet } from "@/components/manufacturing/HandoffSheet";

export const Route = createFileRoute("/app/wip")({
  head: () => ({
    meta: [
      { title: "Stage WIP · YOYO ERP" },
      { name: "description", content: "Track semi-finished stock and stage handoffs." },
    ],
  }),
  component: WipPage,
});

interface WipRow {
  id: string;
  qty: number;
  unit_cost: number;
  quality_status: string;
  variant: { sku: string; variant_name: string; product: { name: string } | null } | null;
  stage: { stage_name: string; sequence: number } | null;
  zone: { name: string } | null;
}

interface HandoffRow {
  id: string;
  ho_number: string;
  qty_in: number;
  qty_good: number;
  qty_scrap: number;
  qty_rework: number;
  is_first_stage: boolean;
  is_final_stage: boolean;
  created_at: string;
  variant: { sku: string; variant_name: string } | null;
  from_stage: { stage_name: string } | null;
  to_stage: { stage_name: string } | null;
}

const QUALITY_TONE: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-900 border-emerald-200",
  hold: "bg-amber-100 text-amber-900 border-amber-200",
  rework: "bg-sky-100 text-sky-900 border-sky-200",
  scrap: "bg-red-100 text-red-900 border-red-200",
};

function WipPage() {
  const [tab, setTab] = useState<"wip" | "history">("wip");
  const [wip, setWip] = useState<WipRow[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [wRes, hRes] = await Promise.all([
      supabase
        .from("semi_finished_inventory")
        .select(
          "id, qty, unit_cost, quality_status, variant:product_variants(sku, variant_name, product:products(name)), stage:production_stages(stage_name, sequence), zone:warehouse_zones(name)"
        )
        .gt("qty", 0)
        .order("last_movement_at", { ascending: false })
        .limit(500),
      supabase
        .from("stage_handoffs")
        .select(
          "id, ho_number, qty_in, qty_good, qty_scrap, qty_rework, is_first_stage, is_final_stage, created_at, variant:product_variants(sku, variant_name), from_stage:production_stages!stage_handoffs_from_stage_id_fkey(stage_name), to_stage:production_stages!stage_handoffs_to_stage_id_fkey(stage_name)"
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setWip((wRes.data ?? []) as unknown as WipRow[]);
    setHandoffs((hRes.data ?? []) as unknown as HandoffRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredWip = useMemo(() => {
    if (!q.trim()) return wip;
    const n = q.toLowerCase();
    return wip.filter(
      (r) =>
        r.variant?.sku?.toLowerCase().includes(n) ||
        r.variant?.variant_name?.toLowerCase().includes(n) ||
        r.stage?.stage_name?.toLowerCase().includes(n)
    );
  }, [wip, q]);

  const filteredHandoffs = useMemo(() => {
    if (!q.trim()) return handoffs;
    const n = q.toLowerCase();
    return handoffs.filter(
      (h) =>
        h.ho_number.toLowerCase().includes(n) ||
        h.variant?.sku?.toLowerCase().includes(n) ||
        h.variant?.variant_name?.toLowerCase().includes(n)
    );
  }, [handoffs, q]);

  const totalUnits = useMemo(() => wip.reduce((s, r) => s + Number(r.qty || 0), 0), [wip]);
  const totalValue = useMemo(
    () => wip.reduce((s, r) => s + Number(r.qty || 0) * Number(r.unit_cost || 0), 0),
    [wip]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Manufacturing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Stage WIP &amp; handoffs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${wip.length} WIP line${wip.length === 1 ? "" : "s"} · ${handoffs.length} recent handoff${
                  handoffs.length === 1 ? "" : "s"
                }`}
          </p>
        </div>
        <PermissionGate permission="log_movement">
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New handoff
          </Button>
        </PermissionGate>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">WIP units</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{totalUnits.toFixed(0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">WIP value</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">₹{totalValue.toFixed(0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">WIP lines</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{wip.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Handoffs (recent)</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{handoffs.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab("wip")}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
            tab === "wip" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          On hand
        </button>
        <button
          onClick={() => setTab("history")}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
            tab === "history" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          Handoff history
        </button>
        <div className="relative ml-auto w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU, stage, HO #…" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <TableSkeleton rows={5} columns={6} />
        </div>
      ) : tab === "wip" ? (
        filteredWip.length === 0 ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState
              icon={Layers}
              title={wip.length === 0 ? "No semi-finished stock" : "No matches"}
              description={
                wip.length === 0
                  ? "Post a stage handoff to receive WIP into a production stage."
                  : "Try a different search term."
              }
              actionLabel={wip.length === 0 ? "New handoff" : undefined}
              onAction={wip.length === 0 ? () => setOpen(true) : undefined}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-left font-medium">Zone</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Unit ₹</th>
                    <th className="px-4 py-3 text-right font-medium">Value ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWip.map((r) => {
                    const qty = Number(r.qty);
                    const cost = Number(r.unit_cost);
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.variant?.variant_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.variant?.sku ?? ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{r.stage?.stage_name ?? "—"}</span>
                          <span className="ml-1 text-xs text-muted-foreground">#{r.stage?.sequence ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.zone?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] ${QUALITY_TONE[r.quality_status] ?? ""}`}>
                            {r.quality_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{qty.toFixed(0)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{cost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{(qty * cost).toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredHandoffs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={ArrowRight}
            title="No handoffs yet"
            description="Stage handoffs will appear here once posted."
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">HO #</th>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Flow</th>
                  <th className="px-4 py-3 text-right font-medium">In</th>
                  <th className="px-4 py-3 text-right font-medium">Good</th>
                  <th className="px-4 py-3 text-right font-medium">Scrap</th>
                  <th className="px-4 py-3 text-right font-medium">Rework</th>
                  <th className="px-4 py-3 text-left font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {filteredHandoffs.map((h) => (
                  <tr key={h.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{h.ho_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{h.variant?.variant_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{h.variant?.sku ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-muted-foreground">
                        {h.is_first_stage ? "Raws" : h.from_stage?.stage_name ?? "—"}
                      </span>{" "}
                      <ArrowRight className="inline h-3 w-3" />{" "}
                      <span className="font-medium">
                        {h.is_final_stage ? "Finished" : h.to_stage?.stage_name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(h.qty_in).toFixed(0)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700">
                      {Number(h.qty_good).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-red-700">
                      {Number(h.qty_scrap).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-sky-700">
                      {Number(h.qty_rework).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <HandoffSheet open={open} onOpenChange={setOpen} onPosted={refresh} />
    </div>
  );
}