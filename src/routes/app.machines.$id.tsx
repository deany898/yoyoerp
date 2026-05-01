import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cpu, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { Database } from "@/integrations/supabase/types";

type Machine = Database["public"]["Tables"]["machines"]["Row"];
type MouldingRow = Database["public"]["Tables"]["wl_moulding_details"]["Row"] & {
  work_log?: { id: string; wl_number: string; log_in_at: string; log_out_at: string | null; status: string; worker?: { name: string; code: string } | null } | null;
};

const STATUS_TONE: Record<string, string> = {
  idle: "bg-slate-100 text-slate-900",
  running: "bg-emerald-100 text-emerald-900",
  maintenance: "bg-amber-100 text-amber-900",
  offline: "bg-red-100 text-red-900",
};

export const Route = createFileRoute("/app/machines/$id")({
  head: () => ({ meta: [{ title: "Machine · YOYO ERP" }] }),
  component: MachineDetailPage,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function MachineDetailPage() {
  const { id } = Route.useParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [rows, setRows] = useState<MouldingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [m, r] = await Promise.all([
        supabase.from("machines").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("wl_moulding_details")
          .select(`*, work_log:work_logs!inner(id, wl_number, log_in_at, log_out_at, status, worker:workers(name, code))`)
          .eq("machine_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (m.error) notify.error("Failed to load machine", { description: m.error.message });
      if (r.error) notify.error("Failed to load runs", { description: r.error.message });
      setMachine((m.data as Machine) ?? null);
      setRows((r.data as unknown as MouldingRow[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const stats = useMemo(() => {
    const shots = rows.reduce((s, r) => s + Math.max(0, (r.end_shot_count ?? 0) - (r.start_shot_count ?? 0)), 0);
    const produced = rows.reduce((s, r) => s + (r.qty_produced_actual ?? 0), 0);
    const rejected = rows.reduce((s, r) => s + (r.qty_rejected ?? 0), 0);
    const waste = rows.reduce((s, r) => s + (r.material_waste_grams ?? 0), 0);
    const effs = rows.map((r) => r.efficiency_pct ?? null).filter((x): x is number => typeof x === "number");
    const avgEff = effs.length ? (effs.reduce((s, x) => s + x, 0) / effs.length).toFixed(1) : "—";
    return { shots, produced, rejected, waste: (waste / 1000).toFixed(2), avgEff, runs: rows.length };
  }, [rows]);

  return (
    <div className="space-y-4 pb-24">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link to="/app/machines"><ArrowLeft className="h-4 w-4" /> Machines</Link>
      </Button>

      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
            <Cpu className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight truncate">{machine?.name ?? "Machine"}</h1>
              {machine && (
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[machine.status] ?? ""}`}>
                  {machine.status}
                </span>
              )}
              {machine && (
                <Badge variant={machine.is_active ? "secondary" : "outline"} className="text-[10px] uppercase">
                  {machine.is_active ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{machine?.code}</span>
              {machine?.hourly_rate ? ` · ₹${Number(machine.hourly_rate).toFixed(2)}/hr` : ""}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Runs (50)" value={String(stats.runs)} />
          <Stat label="Total shots" value={String(stats.shots)} />
          <Stat label="Produced" value={String(stats.produced)} tone="emerald" />
          <Stat label="Rejected" value={String(stats.rejected)} tone="amber" />
          <Stat label="Waste (kg)" value={stats.waste} tone="amber" />
          <Stat label="Avg eff %" value={stats.avgEff} />
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-3 py-2">
          <h2 className="text-sm font-semibold">Recent moulding runs</h2>
        </header>
        {loading ? (
          <div className="p-3"><TableSkeleton rows={4} /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No moulding runs yet"
            description="Moulding work logs assigned to this machine will appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const shots = Math.max(0, (r.end_shot_count ?? 0) - (r.start_shot_count ?? 0));
              return (
                <li key={r.work_log_id} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{r.work_log?.wl_number}</span>
                        <span className="text-xs text-muted-foreground">{r.work_log?.worker?.name ?? "—"}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{fmtDate(r.work_log?.log_in_at ?? null)}</div>
                    </div>
                    <Badge variant={r.work_log?.status === "open" ? "secondary" : "outline"} className="text-[10px] uppercase">
                      {r.work_log?.status}
                    </Badge>
                  </div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 text-[11px] tabular-nums">
                    <Mini label="Shots" value={String(shots)} />
                    <Mini label="OK" value={String(r.qty_produced_actual ?? 0)} />
                    <Mini label="Rej" value={String(r.qty_rejected ?? 0)} />
                    <Mini label="Eff%" value={r.efficiency_pct ? r.efficiency_pct.toFixed(0) : "—"} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "emerald" }) {
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-slate-50 text-foreground";
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-0.5 font-mono text-lg tabular-nums">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono">{value}</div>
    </div>
  );
}