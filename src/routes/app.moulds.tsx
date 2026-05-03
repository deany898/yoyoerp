import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useMoulds, useMachines } from "@/hooks/useMfgData";
import { MouldEditSheet, type MouldFormValue } from "@/components/moulds/MouldEditSheet";
import { useRole } from "@/hooks/useRole";

export const Route = createFileRoute("/app/moulds")({
  head: () => ({
    meta: [
      { title: "Moulds · साँचे · Yoyo" },
      { name: "description", content: "Mould registry with cavities, weights, and connected products." },
    ],
  }),
  component: MouldsPage,
});

type Status = "available" | "in_use" | "maintenance";

function statusFromUsed(usage: number): Status {
  if (usage === 0) return "available";
  return "in_use";
}

function MouldsPage() {
  const { role } = useRole();
  const canEdit = role === "admin" || role === "manager";
  const { moulds, loading, refresh } = useMoulds();
  const { machines } = useMachines();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MouldFormValue | null>(null);
  const [machineLinks, setMachineLinks] = useState<Record<string, string[]>>({});
  const [variantCounts, setVariantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    void (async () => {
      const [m, v] = await Promise.all([
        supabase.from("mould_machine_compat").select("mould_id, machine_id"),
        supabase.from("mould_compatible_variants").select("mould_id"),
      ]);
      const ml: Record<string, string[]> = {};
      (m.data ?? []).forEach((r: { mould_id: string; machine_id: string }) => {
        (ml[r.mould_id] ||= []).push(r.machine_id);
      });
      const vc: Record<string, number> = {};
      (v.data ?? []).forEach((r: { mould_id: string }) => { vc[r.mould_id] = (vc[r.mould_id] || 0) + 1; });
      setMachineLinks(ml);
      setVariantCounts(vc);
    })();
  }, [moulds]);

  const machineMap = new Map(machines.map((m) => [m.id, m.name]));

  function openAdd() { setEditing(null); setOpen(true); }
  function openEdit(m: typeof moulds[number]) {
    setEditing({
      id: m.id, name: m.name, cavity_count: m.cavity_count,
      cavity_weight_g: (m as { cavity_weight_g?: number | null }).cavity_weight_g ?? null,
      runner_weight_g: (m as { runner_weight_g?: number | null }).runner_weight_g ?? null,
      est_shots_per_day: (m as { est_shots_per_day?: number | null }).est_shots_per_day ?? null,
      is_active: m.is_active,
    });
    setOpen(true);
  }

  return (
    <div className="px-3 py-3 md:px-6 md:py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moulds · साँचे</h1>
          <p className="text-sm text-muted-foreground">{moulds.length} mould{moulds.length === 1 ? "" : "s"}</p>
        </div>
        {canEdit && (
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add mould</Button>
        )}
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {moulds.map((m) => {
          const status: Status = statusFromUsed(m.used_cycles);
          const tone = status === "available" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : status === "in_use" ? "bg-amber-100 text-amber-800 border-amber-200"
            : "bg-red-100 text-red-700 border-red-200";
          const linkedMachines = machineLinks[m.id] ?? [];
          const cw = (m as { cavity_weight_g?: number | null }).cavity_weight_g;
          const rw = (m as { runner_weight_g?: number | null }).runner_weight_g;
          const eps = (m as { est_shots_per_day?: number | null }).est_shots_per_day;
          return (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-tight">{m.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{m.code}</div>
                </div>
                <Badge className={`border ${tone}`} variant="outline">
                  {status === "available" ? "Available" : status === "in_use" ? "In use" : "Maintenance"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <Spec label="Cavity count" value={m.cavity_count} />
                <Spec label="Cavity wt (g)" value={cw ?? "—"} />
                <Spec label="Runner wt (g)" value={rw ?? "—"} />
                <Spec label="Est. shots/day" value={eps ?? "—"} />
              </div>
              <div className="mt-3">
                <div className="text-[11px] uppercase text-muted-foreground mb-1">Connected machines</div>
                <div className="flex flex-wrap gap-1">
                  {linkedMachines.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                  {linkedMachines.map((id) => (
                    <Badge key={id} variant="secondary" className="text-[10px]">{machineMap.get(id) ?? id.slice(0, 6)}</Badge>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {variantCounts[m.id] ?? 0} product{(variantCounts[m.id] ?? 0) === 1 ? "" : "s"}
              </div>
              {canEdit && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <MouldEditSheet open={open} mould={editing} onClose={() => setOpen(false)} onSaved={refresh} />
    </div>
  );
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}