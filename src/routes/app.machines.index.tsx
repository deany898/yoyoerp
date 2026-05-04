import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Cpu, Replace } from "lucide-react";
import { MasterListPage } from "@/components/manufacturing/MasterListPage";
import { useMachines } from "@/hooks/useMfgData";
import { useWarehouses } from "@/hooks/useErpData";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AssignMouldSheet } from "@/components/machines/AssignMouldSheet";
import { useRole } from "@/hooks/useRole";

export const Route = createFileRoute("/app/machines/")({
  head: () => ({
    meta: [
      { title: "Machines · Yoyo" },
      { name: "description", content: "Production machines and equipment." },
    ],
  }),
  component: MachinesPage,
});

const STATUS_TONE: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-900 animate-pulse",
  off: "bg-slate-100 text-slate-700",
};

function MachinesPage() {
  const { machines, loading, refresh } = useMachines();
  const { warehouses } = useWarehouses();
  const { role } = useRole();
  const canAssign = role === "admin" || role === "manager";
  const [assignFor, setAssignFor] = useState<{ id: string; name: string } | null>(null);
  const [todayMoulds, setTodayMoulds] = useState<Record<string, { id: string; name: string }>>({});
  const [liveMachines, setLiveMachines] = useState<Set<string>>(new Set());

  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    .toISOString().slice(0, 10);

  const loadTodayMoulds = async () => {
    const { data } = await supabase.from("machine_daily_log")
      .select("machine_id, status, mould:moulds(id, name)").eq("log_date", todayStr);
    const map: Record<string, { id: string; name: string }> = {};
    const live = new Set<string>();
    (data ?? []).forEach((r) => {
      const row = r as { machine_id: string; status: string; mould: { id: string; name: string } | null };
      const m = row.mould;
      if (m) map[r.machine_id] = m;
      if (row.status === "running") live.add(row.machine_id);
    });
    setTodayMoulds(map);
    setLiveMachines(live);
  };
  useEffect(() => { loadTodayMoulds(); }, [machines.length, todayStr]);

  const warehouseOpts = warehouses.map((w) => ({ value: w.id, label: w.name, hint: w.code }));
  const warehouseName = (id: string | null | undefined) =>
    warehouses.find((w) => w.id === id)?.name ?? "—";

  // Distinct machine types for autocomplete suggestions
  const knownTypes = useMemo(() => {
    const set = new Set<string>();
    for (const m of machines) {
      const t = (m as { type?: string | null }).type;
      if (t && t.trim()) set.add(t.trim());
    }
    return Array.from(set).sort();
  }, [machines]);

  const liveStatus = (id: string) => (liveMachines.has(id) ? "live" : "off");

  // Hourly ₹/h derived from warehouse utilities (last 30d) apportioned by usage_volume.
  const [hourly, setHourly] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        machines.map(async (m) => {
          const { data } = await supabase.rpc("machine_hourly_rate", { _machine_id: m.id });
          return [m.id, Number(data ?? 0)] as const;
        }),
      );
      if (cancelled) return;
      setHourly(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [machines]);

  return (
    <>
    {assignFor && (
      <AssignMouldSheet
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        machineId={assignFor.id}
        machineName={assignFor.name}
        onAssigned={loadTodayMoulds}
      />
    )}
    <MasterListPage
      title="Machines"
      entityLabel="Machine"
      entityLabelPlural="Machines"
      description="Equipment registry. Status is live based on today's open work logs. Hourly rate is derived from warehouse utilities and machine usage volume."
      table="machines"
      icon={Cpu}
      rows={machines}
      loading={loading}
      refresh={refresh}
      fields={[
        { key: "name", label: "Name", required: true, placeholder: "e.g. Press 200T" },
        {
          key: "type",
          label: "Type",
          render: (v, set) => (
            <SmartSelect
              options={knownTypes.map((t) => ({ value: t, label: t }))}
              value={(v as string) ?? null}
              onChange={(val) => set(val ?? "")}
              onCreate={(q) => set(q.trim())}
              placeholder="Pick or type a machine type"
              emptyText="No types yet · type to add"
            />
          ),
        },
        {
          key: "warehouse_id",
          label: "Warehouse",
          render: (v, set) => (
            <SmartSelect
              options={warehouseOpts}
              value={v as string | null}
              onChange={(val) => set(val)}
              placeholder="Assign warehouse"
              emptyText="No warehouses"
            />
          ),
        },
        { key: "usage_volume", label: "Usage volume (share of warehouse cost)", kind: "number", step: "0.1" },
        { key: "notes", label: "Notes" },
        { key: "is_active", label: "Active", kind: "switch" },
      ]}
      columns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Name" },
        { key: "type", label: "Type", render: (r) => (r as { type?: string | null }).type ?? "—" },
        { key: "warehouse_id", label: "Warehouse", render: (r) => warehouseName(r.warehouse_id) },
        {
          key: "today_mould",
          label: "Today's mould",
          render: (r) => {
            const m = todayMoulds[r.id];
            return (
              <div className="flex items-center gap-2">
                <span className={m ? "text-xs font-medium" : "text-xs text-muted-foreground"}>
                  {m ? m.name : "No mould assigned"}
                </span>
                {canAssign && (
                  <Button size="sm" variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setAssignFor({ id: r.id, name: r.name }); }}
                    className="h-7 px-2 text-[11px] gap-1">
                    <Replace className="h-3 w-3" /> Change
                  </Button>
                )}
              </div>
            );
          },
        },
        {
          key: "live_status",
          label: "Status",
          render: (r) => {
            const s = liveStatus(r.id);
            return (
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[s]}`}>
                {s}
              </span>
            );
          },
        },
        {
          key: "hourly_rate",
          label: "₹/h",
          className: "font-mono text-right tabular-nums",
          render: (r) => {
            const h = hourly[r.id];
            if (h === undefined) return <span className="text-muted-foreground">…</span>;
            return h > 0 ? `₹${h.toFixed(2)}` : <span className="text-muted-foreground">—</span>;
          },
        },
        { key: "is_active", label: "", render: (r) => <Badge variant={r.is_active ? "secondary" : "outline"} className="text-[10px]">{r.is_active ? "Active" : "Inactive"}</Badge> },
      ]}
    />
    </>
  );
}