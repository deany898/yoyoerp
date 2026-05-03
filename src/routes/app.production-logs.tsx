import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/production-logs")({
  head: () => ({
    meta: [
      { title: "Production logs · Yoyo" },
      { name: "description", content: "Daily machine production logs." },
    ],
  }),
  component: ProductionLogsPage,
});

type LogRow = Database["public"]["Tables"]["machine_daily_log"]["Row"] & {
  machine?: { id: string; name: string; code: string } | null;
  mould?: { id: string; name: string } | null;
  mo?: { id: string; mo_number: string } | null;
  supervisor?: { id: string; name: string; code: string } | null;
  qty_good?: number;
  qty_rej?: number;
  rej_reasons?: string | null;
};

const STATUS_TONE: Record<string, string> = {
  idle: "bg-slate-100 text-slate-900",
  running: "bg-emerald-100 text-emerald-900",
  paused: "bg-amber-100 text-amber-900",
  maintenance: "bg-orange-100 text-orange-900",
  ended: "bg-slate-200 text-slate-700",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function ProductionLogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("machine_daily_log")
        .select(`*,
          machine:machines!machine_daily_log_machine_id_fkey(id, name, code),
          mould:moulds!machine_daily_log_mould_id_fkey(id, name),
          mo:manufacturing_orders!machine_daily_log_mo_id_fkey(id, mo_number),
          supervisor:workers!machine_daily_log_supervisor_id_fkey(id, name, code)
        `)
        .order("log_date", { ascending: false })
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) notify.error("Failed to load logs", { description: error.message });
      const base = (data as unknown as LogRow[]) ?? [];

      // Aggregate qty_good / qty_rej / reasons from mo_stage_runs matching each log
      const machineIds = Array.from(new Set(base.map((r) => r.machine_id))).filter(Boolean);
      let runs: Array<{ machine_id: string | null; mo_id: string | null; started_at: string | null; shots_good: number | null; shots_scrap: number | null; notes: string | null }> = [];
      if (machineIds.length > 0) {
        const { data: rs } = await supabase
          .from("mo_stage_runs")
          .select("machine_id, mo_id, started_at, shots_good, shots_scrap, notes")
          .in("machine_id", machineIds)
          .eq("stage_kind", "moulding");
        runs = rs ?? [];
      }
      const enriched = base.map((r) => {
        const matches = runs.filter(
          (x) => x.machine_id === r.machine_id && x.mo_id === r.mo_id && x.started_at === r.started_at,
        );
        const qty_good = matches.reduce((s, x) => s + (x.shots_good ?? 0), 0);
        const qty_rej = matches.reduce((s, x) => s + (x.shots_scrap ?? 0), 0);
        const reasons = matches
          .map((x) => (x.notes ?? "").trim())
          .filter((n) => n.length > 0)
          .join(" · ");
        return { ...r, qty_good, qty_rej, rej_reasons: reasons || null };
      });
      setRows(enriched);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const totals = useMemo(() => {
    const good = filtered.reduce((s, r) => s + (r.qty_good ?? 0), 0);
    const rej = filtered.reduce((s, r) => s + (r.qty_rej ?? 0), 0);
    const shots = filtered.reduce((s, r) => s + Math.max(0, (r.end_shot_count ?? 0) - (r.start_shot_count ?? 0)), 0);
    return { good, rej, shots, count: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-4 pb-24">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Production logs</h1>
            <p className="text-xs text-muted-foreground">Daily moulding entries across machines.</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Entries" value={String(totals.count)} />
          <Stat label="Total shots" value={String(totals.shots)} />
          <Stat label="Good qty" value={String(totals.good)} tone="emerald" />
          <Stat label="Rejected" value={String(totals.rej)} tone="amber" />
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "running", "ended", "paused", "maintenance", "idle"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition ${
              statusFilter === s
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-3"><TableSkeleton rows={5} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No production logs"
            description="Daily machine logs will appear here once supervisors start production."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const shots = Math.max(0, (r.end_shot_count ?? 0) - (r.start_shot_count ?? 0));
              return (
                <li key={r.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5 text-slate-500" />
                        {r.machine ? (
                          <Link
                            to="/app/machines/$id"
                            params={{ id: r.machine.id }}
                            className="text-sm font-semibold hover:underline truncate"
                          >
                            {r.machine.name}
                          </Link>
                        ) : (
                          <span className="text-sm font-semibold">—</span>
                        )}
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[r.status] ?? ""}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {r.log_date} · {r.mo?.mo_number ?? "—"} · {r.mould?.name ?? "—"}
                        {r.supervisor ? ` · ${r.supervisor.name}` : ""}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        Start {fmt(r.started_at)}{r.ended_at ? ` · End ${fmt(r.ended_at)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 text-[11px] tabular-nums">
                    <Mini label="Shots" value={String(shots)} />
                    <Mini label="Good" value={String(r.qty_good ?? 0)} />
                    <Mini label="Rej" value={String(r.qty_rej ?? 0)} />
                    <Mini label="End" value={String(r.end_shot_count ?? 0)} />
                  </div>
                  {r.rej_reasons ? (
                    <div className="mt-1 text-[10px] text-amber-800">
                      <span className="font-semibold">Reasons:</span> {r.rej_reasons}
                    </div>
                  ) : null}
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