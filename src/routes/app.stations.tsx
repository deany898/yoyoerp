import { createFileRoute } from "@tanstack/react-router";
import { Factory } from "lucide-react";
import { MasterListPage } from "@/components/manufacturing/MasterListPage";
import { useStations } from "@/hooks/useMfgData";

export const Route = createFileRoute("/app/stations")({
  head: () => ({
    meta: [
      { title: "Stations · YOYO ERP" },
      { name: "description", content: "Production stations and work centers." },
    ],
  }),
  component: StationsPage,
});

function StationsPage() {
  const { stations, loading, refresh } = useStations();
  return (
    <MasterListPage
      title="Stations"
      entityLabel="Station"
      entityLabelPlural="Stations"
      description="Work centers and shop-floor locations."
      table="stations"
      icon={Factory}
      rows={stations}
      loading={loading}
      refresh={refresh}
      fields={[
        { key: "code", label: "Code", kind: "auto-code" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Injection moulding bay" },
        { key: "location", label: "Location", placeholder: "e.g. Plant A · Floor 1" },
        { key: "is_active", label: "Status", kind: "switch" },
      ]}
      columns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Name" },
        { key: "location", label: "Location" },
        { key: "is_active", label: "Status" },
      ]}
    />
  );
}