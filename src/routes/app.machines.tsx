import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import { MasterListPage } from "@/components/manufacturing/MasterListPage";
import { useMachines } from "@/hooks/useMfgData";
import { useWarehouses } from "@/hooks/useErpData";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/machines")({
  head: () => ({
    meta: [
      { title: "Machines · Yoyo" },
      { name: "description", content: "Production machines and equipment." },
    ],
  }),
  component: MachinesPage,
});

const STATUS_TONE: Record<string, string> = {
  online: "bg-emerald-100 text-emerald-900",
  offline: "bg-red-100 text-red-900",
};

function MachinesPage() {
  const { machines, loading, refresh } = useMachines();
  const { warehouses } = useWarehouses();
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

  // Live status: machine is "online" if any open work_log references its station_id today.
  const [liveOnline, setLiveOnline] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("work_logs")
        .select("station_id, log_in_at, log_out_at")
        .is("log_out_at", null)
        .gte("log_in_at", today.toISOString());
      if (cancelled) return;
      const stationIds = new Set<string>();
      (data ?? []).forEach((r) => { if (r.station_id) stationIds.add(r.station_id); });
      // Map station -> machine via shared station_id field on machines
      const onMach = new Set<string>();
      machines.forEach((m) => {
        if (m.station_id && stationIds.has(m.station_id)) onMach.add(m.id);
      });
      setLiveOnline(onMach);
    })();
    return () => { cancelled = true; };
  }, [machines]);

  const liveStatus = (id: string) => (liveOnline.has(id) ? "online" : "offline");

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
  );
}