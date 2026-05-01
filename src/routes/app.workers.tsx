import { createFileRoute } from "@tanstack/react-router";
import { HardHat } from "lucide-react";
import { MasterListPage } from "@/components/manufacturing/MasterListPage";
import { useStations, useWorkers } from "@/hooks/useMfgData";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FLAGS } from "@/lib/feature-flags";

export const Route = createFileRoute("/app/workers")({
  head: () => ({
    meta: [
      { title: "Workers · YOYO ERP" },
      { name: "description", content: "Shop-floor worker registry." },
    ],
  }),
  component: WorkersPage,
});

function WorkersPage() {
  const { workers, loading, refresh } = useWorkers();
  const { stations } = useStations();
  const { isEnabled } = useAppConfig();
  const showPayroll = isEnabled(FLAGS.workforce.payroll, true);
  const stationOpts = stations.map((s) => ({ value: s.id, label: s.name, hint: s.code }));
  const stationName = (id: string | null) => stations.find((s) => s.id === id)?.name ?? "—";

  return (
    <MasterListPage
      title="Workers"
      entityLabel="Worker"
      entityLabelPlural="Workers"
      description="Shop-floor staff records · supervisors log production on their behalf."
      table="workers"
      icon={HardHat}
      rows={workers}
      loading={loading}
      refresh={refresh}
      fields={[
        { key: "code", label: "Employee code", required: true, placeholder: "e.g. EMP-101" },
        { key: "name", label: "Name", required: true },
        { key: "job_role", label: "Role", placeholder: "e.g. Operator, Helper, QC" },
        {
          key: "station_id",
          label: "Primary station",
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
        ...(showPayroll
          ? [{ key: "hourly_rate", label: "Hourly rate (₹/hr)", kind: "number" as const, step: "0.01" }]
          : []),
        { key: "phone", label: "Phone" },
        { key: "is_active", label: "Active", kind: "switch" },
      ]}
      columns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Name" },
        { key: "job_role", label: "Role" },
        { key: "station_id", label: "Station", render: (r) => stationName(r.station_id) },
        ...(showPayroll
          ? [{ key: "hourly_rate", label: "₹/hr", className: "font-mono text-right tabular-nums", render: (r: { hourly_rate: number }) => Number(r.hourly_rate).toFixed(2) }]
          : []),
        { key: "is_active", label: "Status" },
      ]}
    />
  );
}