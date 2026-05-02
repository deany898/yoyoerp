import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, Plus, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { AddLogSheet } from "@/components/work-logs/AddLogSheet";
import { ExportButton } from "@/components/shared/ExportButton";
import {
  useWorkLogs,
  WORK_TYPE_LABEL,
  WORK_TYPE_TONE,
  SHIFT_LABEL,
  type WorkLogType,
} from "@/hooks/useWorkLogs";

export const Route = createFileRoute("/app/work-logs")({
  head: () => ({
    meta: [
      { title: "Work logs · Yoyo" },
      { name: "description", content: "Daily workforce and production logs across all shifts." },
    ],
  }),
  component: WorkLogsPage,
});

function todayStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(mins: number | null) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function WorkLogsPage() {
  const [date, setDate] = useState<string>(todayStr());
  const [type, setType] = useState<WorkLogType | "all">("all");
  const [status, setStatus] = useState<"open" | "closed" | "all">("all");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { logs, loading, refresh } = useWorkLogs({ date, type, status });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((l) =>
      [l.wl_number, l.worker?.name, l.worker?.code, l.warehouse?.name, l.station?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [logs, q]);

  const stats = useMemo(() => {
    const open = logs.filter((l) => l.status === "open").length;
    const closed = logs.filter((l) => l.status === "closed").length;
    return { total: logs.length, open, closed };
  }, [logs]);

  return (
    <div className="space-y-4 pb-24">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work logs</h1>
          <p className="text-sm text-muted-foreground">
            Attendance, production, packing, dispatch, delivery, helpers and moulding · all in one feed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <ExportButton
            filename="work_logs"
            capability="work_logs.export"
            rows={filtered as unknown as Record<string, unknown>[]}
            columns={[
              { key: "wl_number", label: "Log #" },
              { key: "work_type", label: "Type" },
              { key: "status", label: "Status" },
              { key: "worker", label: "Worker", format: (v) => (v as { name?: string } | null)?.name ?? "" },
              { key: "warehouse", label: "Warehouse", format: (v) => (v as { name?: string } | null)?.name ?? "" },
              { key: "station", label: "Station", format: (v) => (v as { name?: string } | null)?.name ?? "" },
              { key: "started_at", label: "Started" },
              { key: "ended_at", label: "Ended" },
              { key: "duration_minutes", label: "Duration (min)" },
            ]}
          />
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add log
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        <StatTile label="Total" value={stats.total} />
        <StatTile label="Open" value={stats.open} tone="amber" />
        <StatTile label="Closed" value={stats.closed} tone="emerald" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="pl-8"
          />
        </div>
        <SmartSelect
          options={[
            { value: "all", label: "All types" },
            ...(["production", "packing", "dispatch", "delivery", "helper", "moulding"] as WorkLogType[]).map((t) => ({
              value: t,
              label: WORK_TYPE_LABEL[t],
            })),
          ]}
          value={type}
          onChange={(v) => setType((v as WorkLogType | "all") ?? "all")}
          placeholder="Type"
        />
        <SmartSelect
          options={[
            { value: "all", label: "All status" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
          value={status}
          onChange={(v) => setStatus((v as "open" | "closed" | "all") ?? "all")}
          placeholder="Status"
        />
        <Input placeholder="Search log #, worker…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No work logs yet"
          description="Tap Add log to record production, packing, dispatch, delivery, helpers or moulding for this shift."
          actionLabel="Add log"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="space-y-2 sm:hidden">
          {filtered.map((l) => (
            <Link
              key={l.id}
              to="/app/work-logs"
              className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${WORK_TYPE_TONE[l.work_type]}`}>
                      {WORK_TYPE_LABEL[l.work_type]}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{l.wl_number}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-medium">
                    {l.worker?.name ?? "Unassigned"} <span className="text-xs text-muted-foreground">· {l.worker?.code ?? ""}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {SHIFT_LABEL[l.shift]} · {fmtTime(l.log_in_at)} → {fmtTime(l.log_out_at)} · {fmtDuration(l.duration_min)}
                  </div>
                </div>
                <Badge variant={l.status === "open" ? "secondary" : "outline"} className="shrink-0 text-[10px] uppercase">
                  {l.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Log #</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Worker</th>
                <th className="px-3 py-2">Shift</th>
                <th className="px-3 py-2">In · Out</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Station / Warehouse</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-xs">{l.wl_number}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${WORK_TYPE_TONE[l.work_type]}`}>
                      {WORK_TYPE_LABEL[l.work_type]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {l.worker?.name ?? "—"}
                    <div className="text-[10px] font-mono text-muted-foreground">{l.worker?.code ?? ""}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{SHIFT_LABEL[l.shift]}</td>
                  <td className="px-3 py-2 text-xs tabular-nums">
                    {fmtTime(l.log_in_at)} → {fmtTime(l.log_out_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs tabular-nums">{fmtDuration(l.duration_min)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[l.station?.name, l.warehouse?.name].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={l.status === "open" ? "secondary" : "outline"} className="text-[10px] uppercase">
                      {l.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddLogSheet open={addOpen} onOpenChange={setAddOpen} onCreated={() => refresh()} />
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "amber" | "emerald" }) {
  const toneCls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-white text-foreground";
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-0.5 font-mono text-2xl tabular-nums">{value}</div>
    </div>
  );
}