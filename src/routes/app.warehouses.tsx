import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Warehouse, Pencil, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { useWarehouses, type WarehouseWithZones, type ZoneRow } from "@/hooks/useErpData";
import { WarehouseFormDialog } from "@/components/warehouses/WarehouseFormDialog";
import { ZoneFormDialog } from "@/components/warehouses/ZoneFormDialog";
import { usePermissions, PermissionGate } from "@/hooks/usePermissions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/warehouses")({
  head: () => ({
    meta: [
      { title: "Warehouses · YOYO ERP" },
      { name: "description", content: "Multi-warehouse and zone configuration." },
    ],
  }),
  component: WarehousesPage,
});

const ZONE_TONE: Record<string, string> = {
  raw_material: "bg-amber-100 text-amber-900",
  wip: "bg-violet-100 text-violet-900",
  finished_good: "bg-emerald-100 text-emerald-900",
  packaging: "bg-cyan-100 text-cyan-900",
  dispatch: "bg-orange-100 text-orange-900",
  quarantine: "bg-red-100 text-red-900",
  returns: "bg-slate-100 text-slate-900",
  other: "bg-slate-100 text-slate-900",
};

function WarehousesPage() {
  const { warehouses, loading, refresh } = useWarehouses();
  const { can } = usePermissions();
  const [whFormOpen, setWhFormOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<WarehouseWithZones | null>(null);
  const [zoneFormOpen, setZoneFormOpen] = useState(false);
  const [zoneCtx, setZoneCtx] = useState<{ warehouseId: string; zone: ZoneRow | null } | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<ZoneRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateWh = () => { setEditingWh(null); setWhFormOpen(true); };
  const openEditWh = (w: WarehouseWithZones) => { setEditingWh(w); setWhFormOpen(true); };
  const openCreateZone = (warehouseId: string) => { setZoneCtx({ warehouseId, zone: null }); setZoneFormOpen(true); };
  const openEditZone = (warehouseId: string, zone: ZoneRow) => { setZoneCtx({ warehouseId, zone }); setZoneFormOpen(true); };

  const confirmDeleteZone = async () => {
    if (!zoneToDelete) return;
    setDeleting(true);
    try {
      // Guard: block if stock or movements reference this zone
      const [stockRes, movFromRes, movToRes] = await Promise.all([
        supabase.from("inventory_stock").select("id", { count: "exact", head: true }).eq("zone_id", zoneToDelete.id),
        supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("from_zone_id", zoneToDelete.id),
        supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("to_zone_id", zoneToDelete.id),
      ]);
      const stockCount = stockRes.count ?? 0;
      const movCount = (movFromRes.count ?? 0) + (movToRes.count ?? 0);
      if (stockCount > 0 || movCount > 0) {
        toast.error("Zone in use", {
          description: `${stockCount} stock row(s), ${movCount} movement(s) reference this zone.`,
        });
        return;
      }
      const { error } = await supabase.from("warehouse_zones").delete().eq("id", zoneToDelete.id);
      if (error) throw error;
      toast.success("Zone deleted");
      setZoneToDelete(null);
      refresh();
    } catch (err) {
      toast.error("Delete failed", { description: err instanceof Error ? err.message : "Unknown" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Master data</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Warehouses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${warehouses.length} warehouse${warehouses.length === 1 ? "" : "s"} · ${warehouses.reduce((s, w) => s + w.zones.length, 0)} zones`}
          </p>
        </div>
        <PermissionGate permission="create_item">
          <Button onClick={openCreateWh} className="gap-2"><Plus className="h-4 w-4" /> New warehouse</Button>
        </PermissionGate>
      </header>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden"><TableSkeleton rows={3} columns={3} /></div>
      ) : warehouses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Warehouse}
            title="No warehouses"
            description="Create your first warehouse and add zones (RM, WIP, FG, packaging, dispatch)."
            actionLabel={can("create_item") ? "New warehouse" : undefined}
            onAction={can("create_item") ? openCreateWh : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {warehouses.map((w) => (
            <article key={w.id} className="rounded-xl border border-border bg-card p-5">
              <header className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">{w.name}</h2>
                    {w.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{w.code}</p>
                  {(w.city || w.state) && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{[w.city, w.state, w.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {can("edit_item") && (
                  <Button variant="ghost" size="icon" onClick={() => openEditWh(w)}><Pencil className="h-4 w-4" /></Button>
                )}
              </header>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zones</h3>
                  {can("create_item") && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openCreateZone(w.id)}>
                      <Plus className="h-3 w-3" /> Add zone
                    </Button>
                  )}
                </div>
                {w.zones.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">No zones yet</p>
                ) : (
                  <ul className="space-y-1.5">
                    {w.zones.map((z) => (
                      <li
                        key={z.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`inline-flex h-6 w-12 items-center justify-center rounded font-mono text-[10px] font-semibold ${ZONE_TONE[z.kind] ?? "bg-slate-100 text-slate-900"}`}>
                            {z.code}
                          </span>
                          <span className="truncate">{z.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {can("edit_item") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditZone(w.id, z)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {can("edit_item") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setZoneToDelete(z)}
                              aria-label={`Delete zone ${z.code}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <WarehouseFormDialog open={whFormOpen} onOpenChange={setWhFormOpen} warehouse={editingWh} onSaved={refresh} />
      {zoneCtx && (
        <ZoneFormDialog
          open={zoneFormOpen}
          onOpenChange={setZoneFormOpen}
          warehouseId={zoneCtx.warehouseId}
          zone={zoneCtx.zone}
          onSaved={refresh}
        />
      )}

      <AlertDialog open={!!zoneToDelete} onOpenChange={(o) => !o && !deleting && setZoneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete zone {zoneToDelete?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{zoneToDelete?.name}". Zones with existing stock or movement history cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDeleteZone(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}