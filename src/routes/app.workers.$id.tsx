import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HardHat, ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { AddLogSheet } from "@/components/work-logs/AddLogSheet";
import { AdvancesTab } from "@/components/workers/AdvancesTab";
import { WORK_TYPE_LABEL, WORK_TYPE_TONE, SHIFT_LABEL } from "@/hooks/useWorkLogs";
import { useRole } from "@/hooks/useRole";
import type { Database } from "@/integrations/supabase/types";

type Worker = Database["public"]["Tables"]["workers"]["Row"];
type WorkLog = Database["public"]["Tables"]["work_logs"]["Row"];

export const Route = createFileRoute("/app/workers/$id")({
  head: () => ({ meta: [{ title: "Team member · Yoyo" }] }),
  component: WorkerDetailPage,
});

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}
function fmtDur(m: number | null) {
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

function WorkerDetailPage() {
  const { id } = Route.useParams();
  const { role } = useRole();
  const isAdmin = role === "admin";
  const [worker, setWorker] = useState<Worker | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    const [w, l] = await Promise.all([
      supabase.from("workers").select("*").eq("id", id).maybeSingle(),
      supabase.from("work_logs").select("*").eq("worker_id", id).order("log_in_at", { ascending: false }).limit(50),
    ]);
    if (w.error) notify.error("Failed to load worker", { description: w.error.message });
    if (l.error) notify.error("Failed to load logs", { description: l.error.message });
    setWorker((w.data as Worker) ?? null);
    setLogs((l.data as WorkLog[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const stats = useMemo(() => {
    const totalMin = logs.reduce((s, l) => s + (l.duration_min ?? 0), 0);
    const open = logs.filter((l) => l.status === "open").length;
    const hours = totalMin / 60;
    const rate = Number(worker?.hourly_rate ?? 0);
    const gross = hours * rate;
    return { count: logs.length, hours: hours.toFixed(1), open, gross };
  }, [logs, worker?.hourly_rate]);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/app/workers"><ArrowLeft className="h-4 w-4" /> Team</Link>
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Log work
        </Button>
      </div>

      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <HardHat className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight truncate">{worker?.name ?? "Team member"}</h1>
              {worker && (
                <Badge variant={worker.is_active ? "secondary" : "outline"} className="text-[10px] uppercase">
                  {worker.is_active ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{worker?.code}</span>
              {worker?.job_role ? ` · ${worker.job_role}` : ""}
              {worker?.phone ? ` · ${worker.phone}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Logs (50)" value={String(stats.count)} />
          <Stat label="Hours" value={stats.hours} />
          <Stat label="Open" value={String(stats.open)} tone="amber" />
        </div>
      </header>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="advances">Advances</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-3">
          <section className="rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <h2 className="text-sm font-semibold">Recent work logs</h2>
            </header>
            {loading ? (
              <div className="p-3"><TableSkeleton rows={4} /></div>
            ) : logs.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No work logs yet"
                description="Tap Log work to record a shift."
                actionLabel="Log work"
                onAction={() => setAddOpen(true)}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${WORK_TYPE_TONE[l.work_type]}`}>
                          {WORK_TYPE_LABEL[l.work_type]}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{l.wl_number}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {SHIFT_LABEL[l.shift]} · {fmtTime(l.log_in_at)} · {fmtDur(l.duration_min)}
                      </div>
                    </div>
                    <Badge variant={l.status === "open" ? "secondary" : "outline"} className="text-[10px] uppercase">
                      {l.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="payroll" className="mt-3">
          {isAdmin ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Payroll snapshot</h2>
              <p className="text-[11px] text-muted-foreground">Hourly basis · last 50 logs</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stat label="Hours" value={stats.hours} />
                <Stat label="₹/hr" value={Number(worker?.hourly_rate ?? 0).toFixed(2)} />
                <Stat label="Gross" value={`₹${stats.gross.toFixed(0)}`} />
                <Stat label="Open shifts" value={String(stats.open)} tone="amber" />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Net payable = Gross − Advances. Settle via the Advances tab.
              </p>
            </section>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-muted-foreground">
              Payroll is visible to admins only.
            </div>
          )}
        </TabsContent>

        <TabsContent value="advances" className="mt-3">
          <AdvancesTab workerId={id} canEdit={isAdmin} />
        </TabsContent>
      </Tabs>

      <AddLogSheet open={addOpen} onOpenChange={setAddOpen} onCreated={() => refresh()} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  const cls = tone === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-slate-200 bg-slate-50 text-foreground";
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-0.5 font-mono text-lg tabular-nums">{value}</div>
    </div>
  );
}