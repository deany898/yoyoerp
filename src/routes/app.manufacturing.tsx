import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Factory, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGate } from "@/hooks/usePermissions";
import { useManufacturingOrders, type MOStatus } from "@/hooks/useMfgData";
import { MoCreateSheet } from "@/components/manufacturing/MoCreateSheet";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/manufacturing")({
  head: () => ({
    meta: [
      { title: "Manufacturing · YOYO ERP" },
      { name: "description", content: "Plan, release and track manufacturing orders." },
    ],
  }),
  component: ManufacturingPage,
});

const STATUS_TONE: Record<MOStatus, string> = {
  draft: "bg-slate-100 text-slate-900 border-slate-200",
  released: "bg-sky-100 text-sky-900 border-sky-200",
  in_progress: "bg-amber-100 text-amber-900 border-amber-200",
  done: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-red-100 text-red-900 border-red-200",
};

const STATUS_LABEL: Record<MOStatus, string> = {
  draft: "Draft",
  released: "Released",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

function ManufacturingPage() {
  const { orders, loading, refresh } = useManufacturingOrders();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<MOStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        o.mo_number.toLowerCase().includes(needle) ||
        o.variant?.sku?.toLowerCase().includes(needle) ||
        o.variant?.variant_name?.toLowerCase().includes(needle)
      );
    });
  }, [orders, q, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length, draft: 0, released: 0, in_progress: 0, done: 0, cancelled: 0 };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Manufacturing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Manufacturing orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${orders.length} order${orders.length === 1 ? "" : "s"} · plan, issue materials and receive output.`}
          </p>
        </div>
        <PermissionGate permission="create_item">
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New MO</Button>
        </PermissionGate>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["all","draft","released","in_progress","done","cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]} <span className="ml-1 opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search MO number or SKU…" className="pl-9" />
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden"><TableSkeleton rows={5} columns={6} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Factory}
            title={orders.length === 0 ? "No manufacturing orders" : "No matches"}
            description={orders.length === 0 ? "Create your first MO to plan a production run." : "Try a different filter or search."}
            actionLabel={orders.length === 0 ? "New MO" : undefined}
            onAction={orders.length === 0 ? () => setCreateOpen(true) : undefined}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">MO #</th>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-right font-medium">Planned</th>
                  <th className="px-4 py-3 text-right font-medium">Produced</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Source DO</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const planned = Number(o.qty_planned);
                  const produced = Number(o.qty_produced);
                  const pct = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;
                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer border-t border-border hover:bg-muted/30"
                      onClick={() => navigate({ to: "/app/manufacturing/$moId", params: { moId: o.id } })}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{o.mo_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{o.variant?.variant_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.variant?.sku ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{planned.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono tabular-nums text-xs">{produced.toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {o.source_do ? (
                          <Link to="/app/dispatch-orders" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {o.source_do.do_number}
                          </Link>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MoCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => { refresh(); navigate({ to: "/app/manufacturing/$moId", params: { moId: id } }); }}
      />
    </div>
  );
}