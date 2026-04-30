import { createFileRoute } from "@tanstack/react-router";
import { Cpu } from "lucide-react";
import { MasterListPage } from "@/components/manufacturing/MasterListPage";
import { useMachines, useStations } from "@/hooks/useMfgData";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/machines")({
  head: () => ({
    meta: [
      { title: "Machines · YOYO ERP" },
      { name: "description", content: "Production machines and equipment." },
    ],
  }),
  component: MachinesPage,
});

const STATUS_TONE: Record<string, string> = {
  idle: "bg-slate-100 text-slate-900",
  running: "bg-emerald-100 text-emerald-900",
  maintenance: "bg-amber-100 text-amber-900",
  offline: "bg-red-100 text-red-900",
};

function MachinesPage() {
  const { machines, loading, refresh } = useMachines();
  const { stations } = useStations();
  const stationOpts = stations.map((s) => ({ value: s.id, label: s.name, hint: s.code }));
  const stationName = (id: string | null) => stations.find((s) => s.id === id)?.name ?? "—";

  return (
    <MasterListPage
      title="Machines"
      entityLabel="Machine"
      entityLabelPlural="Machines"
      description="Equipment registry with hourly cost and status."
      table="machines"
      icon={Cpu}
      rows={machines}
      loading={loading}
      refresh={refresh}
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. MCH-01" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Press 200T" },
        {
          key: "station_id",
          label: "Station",
          render: (v, set) => (
            <SmartSelect
              options={stationOpts}
              value={v as string | null}
              onChange={(val) => set(val)}
              placeholder="Select station"
              emptyText="No stations yet"
            />
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (v, set) => (
            <SmartSelect
              options={[
                { value: "idle", label: "Idle" },
                { value: "running", label: "Running" },
                { value: "maintenance", label: "Maintenance" },
                { value: "offline", label: "Offline" },
              ]}
              value={(v as string) ?? "idle"}
              onChange={(val) => set(val ?? "idle")}
              placeholder="Status"
            />
          ),
        },
        { key: "hourly_rate", label: "Hourly rate (₹/hr)", kind: "number", step: "0.01" },
        { key: "notes", label: "Notes" },
        { key: "is_active", label: "Active", kind: "switch" },
      ]}
      columns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Name" },
        { key: "station_id", label: "Station", render: (r) => stationName(r.station_id) },
        {
          key: "status",
          label: "Status",
          render: (r) => (
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[r.status] ?? ""}`}>
              {r.status}
            </span>
          ),
        },
        { key: "hourly_rate", label: "₹/hr", className: "font-mono text-right tabular-nums", render: (r) => Number(r.hourly_rate).toFixed(2) },
        { key: "is_active", label: "", render: (r) => <Badge variant={r.is_active ? "secondary" : "outline"} className="text-[10px]">{r.is_active ? "Active" : "Inactive"}</Badge> },
      ]}
    />
  );
}