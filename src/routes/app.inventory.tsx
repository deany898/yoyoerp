import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, AlertTriangle, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { useInventory, useWarehouses } from "@/hooks/useErpData";
import { StockMovementSheet } from "@/components/inventory/StockMovementSheet";
import { PermissionGate } from "@/hooks/usePermissions";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · YOYO ERP" },
      { name: "description", content: "Real-time stock balances by zone with cost and reorder signals." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { lines, loading, refresh } = useInventory();
  const { warehouses } = useWarehouses();
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [moveOpen, setMoveOpen] = useState(false);

  const zones = useMemo(() => {
    if (warehouseFilter === "all") return warehouses.flatMap((w) => w.zones);
    return warehouses.find((w) => w.id === warehouseFilter)?.zones ?? [];
  }, [warehouses, warehouseFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((l) => {
      if (warehouseFilter !== "all" && l.warehouse_id !== warehouseFilter) return false;
      if (zoneFilter !== "all" && l.zone_id !== zoneFilter) return false;
      if (!q) return true;
      return (
        l.product_name.toLowerCase().includes(q) ||
        l.sku.toLowerCase().includes(q) ||
        l.variant_name.toLowerCase().includes(q)
      );
    });
  }, [lines, search, warehouseFilter, zoneFilter]);

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((s, l) => s + l.on_hand * l.avg_cost, 0);
    const totalUnits = filtered.reduce((s, l) => s + l.on_hand, 0);
    const lowStock = filtered.filter((l) => l.reorder_point > 0 && l.on_hand <= l.reorder_point).length;
    return { totalValue, totalUnits, lowStock, lines: filtered.length };
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Live stock by warehouse zone · weighted-average costing</p>
        </div>
        <PermissionGate permission="log_movement">
          <Button onClick={() => setMoveOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Post movement
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Stock value</div>
          <div className="mt-1 font-mono text-2xl font-semibold">₹{stats.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">On hand units</div>
          <div className="mt-1 font-mono text-2xl font-semibold">{stats.totalUnits.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Stock lines</div>
          <div className="mt-1 font-mono text-2xl font-semibold">{stats.lines}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Below reorder</div>
          <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-semibold text-amber-600">
            {stats.lowStock > 0 && <AlertTriangle className="h-5 w-5" />}
            {stats.lowStock}
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product, SKU, or variant…" className="pl-9" />
        </div>
        <div className="w-full md:w-56">
          <SmartSelect
            options={[{ value: "all", label: "All warehouses" }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]}
            value={warehouseFilter}
            onChange={(v) => { setWarehouseFilter(v ?? "all"); setZoneFilter("all"); }}
            searchPlaceholder="Search warehouse…"
          />
        </div>
        <div className="w-full md:w-56">
          <SmartSelect
            options={[{ value: "all", label: "All zones" }, ...zones.map((z) => ({ value: z.id, label: z.name }))]}
            value={zoneFilter}
            onChange={(v) => setZoneFilter(v ?? "all")}
            searchPlaceholder="Search zone…"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package2}
          title="No stock yet"
          description="Post a receipt or opening balance movement to seed inventory in a zone."
          actionLabel="Post movement"
          onAction={() => setMoveOpen(true)}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product · variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse · zone</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const low = l.reorder_point > 0 && l.on_hand <= l.reorder_point;
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.product_name}</div>
                      <div className="text-xs text-muted-foreground">{l.variant_name}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.sku}</TableCell>
                    <TableCell className="text-sm">
                      <div>{l.warehouse_name}</div>
                      <div className="text-xs text-muted-foreground">{l.zone_name}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{l.on_hand.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{l.reserved.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-mono">{l.available.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">₹{l.avg_cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">₹{(l.on_hand * l.avg_cost).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell>{low && <Badge className="bg-amber-100 text-amber-900 ring-1 ring-amber-200">Low</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <StockMovementSheet open={moveOpen} onOpenChange={setMoveOpen} onPosted={refresh} />
    </div>
  );
}
