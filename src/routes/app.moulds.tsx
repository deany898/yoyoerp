import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { MasterListPage } from "@/components/manufacturing/MasterListPage";
import { useMoulds } from "@/hooks/useMfgData";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/moulds")({
  head: () => ({
    meta: [
      { title: "Moulds · YOYO ERP" },
      { name: "description", content: "Tooling registry with cavity count and life cycles." },
    ],
  }),
  component: MouldsPage,
});

function MouldsPage() {
  const { moulds, loading, refresh } = useMoulds();
  return (
    <MasterListPage
      title="Moulds"
      entityLabel="Mould"
      entityLabelPlural="Moulds"
      description="Tooling, cavities and remaining life."
      table="moulds"
      icon={Hammer}
      rows={moulds}
      loading={loading}
      refresh={refresh}
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. MLD-001" },
        { key: "name", label: "Name", required: true },
        { key: "cavity_count", label: "Cavity count", kind: "number" },
        { key: "life_cycles", label: "Total life (cycles)", kind: "number" },
        { key: "used_cycles", label: "Used cycles", kind: "number" },
        { key: "notes", label: "Notes" },
        { key: "is_active", label: "Active", kind: "switch" },
      ]}
      columns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Name" },
        { key: "cavity_count", label: "Cavities", className: "text-right tabular-nums" },
        {
          key: "life",
          label: "Life used",
          render: (r) => {
            const total = Number(r.life_cycles) || 0;
            const used = Number(r.used_cycles) || 0;
            const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
            return (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{used}/{total || "∞"}</span>
              </div>
            );
          },
        },
        { key: "is_active", label: "", render: (r) => <Badge variant={r.is_active ? "secondary" : "outline"} className="text-[10px]">{r.is_active ? "Active" : "Inactive"}</Badge> },
      ]}
    />
  );
}