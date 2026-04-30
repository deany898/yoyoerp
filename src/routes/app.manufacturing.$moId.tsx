import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Package, PlayCircle, CheckCircle2, XCircle, Send, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { MORow, MORunRow, MOIssueRow, MOOutputRow, MOStatus } from "@/hooks/useMfgData";
import { MaterialIssueDialog } from "@/components/manufacturing/MaterialIssueDialog";
import { OutputReceiveDialog } from "@/components/manufacturing/OutputReceiveDialog";
import { useConfirm } from "@/components/forms/ConfirmDialog";

export const Route = createFileRoute("/app/manufacturing/$moId")({
  head: () => ({ meta: [{ title: "Manufacturing order · YOYO ERP" }] }),
  component: MoDetailPage,
});

interface MOFull extends MORow {
  variant: { id: string; sku: string; variant_name: string; product_id: string } | null;
  warehouse: { id: string; name: string; code: string } | null;
  source_do: { id: string; do_number: string } | null;
}

interface BomLineRow {
  id: string;
  qty_per: number;
  scrap_pct: number;
  uom: string;
  variant: { id: string; sku: string; variant_name: string; product_id: string } | null;
  product_name?: string;
}

const STATUS_TONE: Record<MOStatus, string> = {
  draft: "bg-slate-100 text-slate-900",
  released: "bg-sky-100 text-sky-900",
  in_progress: "bg-amber-100 text-amber-900",
  done: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-red-100 text-red-900",
};

function MoDetailPage() {
  const { moId } = Route.useParams();
  const navigate = useNavigate();
  const [mo, setMo] = useState<MOFull | null>(null);
  const [bom, setBom] = useState<BomLineRow[]>([]);
  const [issues, setIssues] = useState<MOIssueRow[]>([]);
  const [outputs, setOutputs] = useState<MOOutputRow[]>([]);
  const [runs, setRuns] = useState<MORunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueComponent, setIssueComponent] = useState<BomLineRow | null>(null);
  const [outputOpen, setOutputOpen] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    const moRes = await supabase
      .from("manufacturing_orders")
      .select(`
        *,
        variant:product_variants(id, sku, variant_name, product_id),
        warehouse:warehouses(id, name, code),
        source_do:dispatch_orders(id, do_number)
      `)
      .eq("id", moId)
      .maybeSingle();
    if (moRes.error || !moRes.data) {
      notify.error("Could not load manufacturing order", { description: moRes.error?.message });
      setLoading(false);
      return;
    }
    const moData = moRes.data as unknown as MOFull;
    setMo(moData);

    if (moData.variant) {
      const bomRes = await supabase
        .from("bom_master")
        .select("id, lines:bom_lines(id, qty_per, scrap_pct, uom, variant:product_variants(id, sku, variant_name, product_id))")
        .eq("variant_id", moData.variant.id)
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lines = (bomRes.data?.lines ?? []) as unknown as BomLineRow[];
      // load product names for components
      const pids = Array.from(new Set(lines.map((l) => l.variant?.product_id).filter(Boolean) as string[]));
      let productMap = new Map<string, string>();
      if (pids.length) {
        const pRes = await supabase.from("products").select("id, name").in("id", pids);
        productMap = new Map((pRes.data ?? []).map((p) => [p.id, p.name]));
      }
      setBom(lines.map((l) => ({ ...l, product_name: l.variant ? productMap.get(l.variant.product_id) : "—" })));
    }

    const [issuesRes, outputsRes, runsRes] = await Promise.all([
      supabase.from("mo_material_issues").select("*").eq("mo_id", moId).order("posted_at", { ascending: false }),
      supabase.from("mo_outputs").select("*").eq("mo_id", moId).order("posted_at", { ascending: false }),
      supabase.from("mo_stage_runs").select("*").eq("mo_id", moId).order("created_at", { ascending: false }),
    ]);
    setIssues(issuesRes.data ?? []);
    setOutputs(outputsRes.data ?? []);
    setRuns(runsRes.data ?? []);
    setLoading(false);
  }, [moId]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (status: MOStatus) => {
    if (!mo) return;
    const patch: Partial<MORow> = { status };
    if (status === "in_progress" && !mo.actual_start) patch.actual_start = new Date().toISOString();
    if (status === "done" && !mo.actual_end) patch.actual_end = new Date().toISOString();
    const { error } = await supabase.from("manufacturing_orders").update(patch).eq("id", mo.id);
    if (error) { notify.error("Could not update status", { description: error.message }); return; }
    notify.success(`Marked as ${status.replace("_"," ")}`);
    load();
  };

  const tryCancel = async () => {
    const ok = await confirm({
      title: "Cancel this manufacturing order?",
      description: "This will mark the order as cancelled. Material issues and outputs already posted are kept for audit.",
      confirmLabel: "Cancel order",
      variant: "destructive",
    });
    if (ok) setStatus("cancelled");
  };

  const totalIssued = (variantId: string) =>
    issues.filter((i) => i.variant_id === variantId).reduce((s, i) => s + Number(i.qty), 0);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!mo) return <div className="p-6 text-sm text-muted-foreground">Not found.</div>;

  const planned = Number(mo.qty_planned);
  const produced = Number(mo.qty_produced);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/app/manufacturing" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to manufacturing
        </Link>
      </div>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Manufacturing order</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl font-mono">{mo.mo_number}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge className={STATUS_TONE[mo.status]}>{mo.status.replace("_"," ")}</Badge>
            <span>·</span>
            <span>{mo.variant?.variant_name ?? "—"} <span className="font-mono text-xs">({mo.variant?.sku})</span></span>
            {mo.warehouse && (<><span>·</span><span>{mo.warehouse.name}</span></>)}
            {mo.source_do && (<><span>·</span><span>From DO {mo.source_do.do_number}</span></>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mo.status === "draft" && (
            <Button onClick={() => setStatus("released")} className="gap-2"><Send className="h-4 w-4" /> Release</Button>
          )}
          {mo.status === "released" && (
            <Button onClick={() => setStatus("in_progress")} className="gap-2"><PlayCircle className="h-4 w-4" /> Start</Button>
          )}
          {(mo.status === "released" || mo.status === "in_progress") && (
            <Button onClick={() => setStatus("done")} variant="secondary" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Mark done</Button>
          )}
          {mo.status !== "cancelled" && mo.status !== "done" && (
            <Button onClick={tryCancel} variant="ghost" className="gap-2 text-destructive"><XCircle className="h-4 w-4" /> Cancel</Button>
          )}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Planned" value={planned.toFixed(0)} />
        <Stat label="Produced" value={produced.toFixed(0)} sub={`${planned > 0 ? Math.round((produced / planned) * 100) : 0}%`} />
        <Stat label="Scrapped" value={Number(mo.qty_scrapped).toFixed(0)} />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bill of materials</h2>
            <p className="text-xs text-muted-foreground">Required vs issued · scaled to planned qty</p>
          </div>
          <Button onClick={() => setOutputOpen(true)} variant="secondary" className="gap-2" disabled={mo.status === "draft" || mo.status === "cancelled"}>
            <Inbox className="h-4 w-4" /> Receive output
          </Button>
        </div>
        {bom.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No active BOM for {mo.variant?.variant_name}. Add one in Products to enable component issuing.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Component</th>
                  <th className="px-3 py-2 text-right font-medium">Required</th>
                  <th className="px-3 py-2 text-right font-medium">Issued</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {bom.map((line) => {
                  const required = Number(line.qty_per) * planned * (1 + Number(line.scrap_pct) / 100);
                  const issued = line.variant ? totalIssued(line.variant.id) : 0;
                  const pct = required > 0 ? Math.min(100, Math.round((issued / required) * 100)) : 0;
                  return (
                    <tr key={line.id} className="border-t border-border">
                      <td className="px-3 py-3">
                        <div className="font-medium">{line.product_name} · {line.variant?.variant_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{line.variant?.sku}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{required.toFixed(2)} {line.uom}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${pct >= 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono tabular-nums text-xs">{issued.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={mo.status === "draft" || mo.status === "cancelled" || mo.status === "done"}
                          onClick={() => { setIssueComponent(line); setIssueOpen(true); }}
                        >
                          <Package className="h-3.5 w-3.5" /> Issue
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Material issues</h2>
          {issues.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">No materials issued yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {issues.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">{new Date(i.posted_at).toLocaleString()}</span>
                  <span className="font-mono tabular-nums">{Number(i.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outputs received</h2>
          {outputs.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">No output received yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {outputs.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">{new Date(o.posted_at).toLocaleString()}</span>
                  <span className="font-mono tabular-nums">{Number(o.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {issueComponent && (
        <MaterialIssueDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          moId={mo.id}
          defaultVariantId={issueComponent.variant?.id}
          defaultQty={Number(issueComponent.qty_per) * planned * (1 + Number(issueComponent.scrap_pct) / 100)}
          variantLabel={`${issueComponent.product_name} · ${issueComponent.variant?.variant_name}`}
          onPosted={load}
        />
      )}

      <OutputReceiveDialog
        open={outputOpen}
        onOpenChange={setOutputOpen}
        moId={mo.id}
        variantId={mo.variant?.id}
        variantLabel={mo.variant?.variant_name}
        warehouseId={mo.warehouse_id}
        onPosted={load}
      />

      {/* Used vars (silence unused warnings) */}
      <span className="hidden">{runs.length}{navigate.length}</span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}