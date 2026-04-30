import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layers, Package, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGate, usePermissions } from "@/hooks/usePermissions";
import { MasterListPage } from "@/components/manufacturing/MasterListPage";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/forms/ConfirmDialog";

export const Route = createFileRoute("/app/stages")({
  head: () => ({
    meta: [
      { title: "Stages · YOYO ERP" },
      { name: "description", content: "Define product-specific stages and reusable stage groups." },
    ],
  }),
  component: StagesPage,
});

type ProductStageRow = {
  id: string;
  variant_id: string;
  stage_name: string;
  sequence: number;
  labour_cost: number;
  machine_cost: number;
  utility_cost: number;
  mould_cost: number;
  overhead_cost: number;
  qc_cost: number;
  rejection_pct: number;
  variant?: { sku: string; variant_name: string } | null;
};

type GroupRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  line_count?: number;
};

function StagesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">ERP · Manufacturing</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Stages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure per-product stages or reusable stage groups.</p>
      </header>

      <Tabs defaultValue="product" className="space-y-4">
        <TabsList>
          <TabsTrigger value="product" className="gap-2"><Package className="h-4 w-4" /> Product</TabsTrigger>
          <TabsTrigger value="group" className="gap-2"><Layers className="h-4 w-4" /> Group</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="space-y-4">
          <ProductStagesPanel />
        </TabsContent>
        <TabsContent value="group" className="space-y-4">
          <GroupStagesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Product tab ---------------- */
function ProductStagesPanel() {
  const [rows, setRows] = useState<ProductStageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { can } = usePermissions();
  const confirm = useConfirm();

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("production_stages")
      .select("*, variant:product_variants(sku, variant_name)")
      .order("variant_id", { ascending: true })
      .order("sequence", { ascending: true });
    if (error) notify.error("Failed to load product stages", { description: error.message });
    setRows((data ?? []) as unknown as ProductStageRow[]);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const n = q.toLowerCase();
    return rows.filter((r) =>
      r.stage_name.toLowerCase().includes(n) ||
      r.variant?.sku?.toLowerCase().includes(n) ||
      r.variant?.variant_name?.toLowerCase().includes(n),
    );
  }, [rows, q]);

  const onDelete = async (row: ProductStageRow) => {
    const ok = await confirm({
      title: "Delete this stage?",
      description: `Stage "${row.stage_name}" will be removed from this product.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("production_stages").delete().eq("id", row.id);
    if (error) return notify.error("Could not delete stage", { description: error.message });
    notify.success("Stage deleted");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by stage, SKU or product…" className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground">
          Add or edit product stages from the product detail page.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden"><TableSkeleton rows={5} columns={6} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Package}
            title={rows.length === 0 ? "No product stages yet" : "No matches"}
            description={rows.length === 0 ? "Open a product to define its production stages." : "Try a different search."}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Seq</th>
                  <th className="px-4 py-3 text-left font-medium">Stage</th>
                  <th className="px-4 py-3 text-right font-medium">Labour</th>
                  <th className="px-4 py-3 text-right font-medium">Machine</th>
                  <th className="px-4 py-3 text-right font-medium">Reject %</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.variant?.variant_name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.variant?.sku ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.sequence}</td>
                    <td className="px-4 py-3">{r.stage_name}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(r.labour_cost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(r.machine_cost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(r.rejection_pct).toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">
                      {can("delete_item") && (
                        <Button variant="ghost" size="icon" onClick={() => onDelete(r)} aria-label="Delete stage">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Group tab ---------------- */
function GroupStagesPanel() {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stage_groups")
      .select("*, stage_group_lines(count)")
      .order("name", { ascending: true });
    if (error) notify.error("Failed to load stage groups", { description: error.message });
    const mapped = (data ?? []).map((g: { id: string; code: string; name: string; description: string | null; is_active: boolean; stage_group_lines: { count: number }[] }) => ({
      id: g.id, code: g.code, name: g.name, description: g.description, is_active: g.is_active,
      line_count: g.stage_group_lines?.[0]?.count ?? 0,
    }));
    setRows(mapped);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  return (
    <MasterListPage
      title="Stage groups"
      entityLabel="Group"
      entityLabelPlural="Groups"
      description="Reusable templates of production stages."
      table="stage_groups"
      icon={Layers}
      rows={rows}
      loading={loading}
      refresh={refresh}
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. INJ-STD" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Standard injection moulding" },
        { key: "description", label: "Description", placeholder: "Optional notes about this template" },
        { key: "is_active", label: "Status", kind: "switch" },
      ]}
      columns={[
        { key: "code", label: "Code", className: "font-mono text-xs" },
        { key: "name", label: "Name" },
        {
          key: "line_count",
          label: "Stages",
          render: (r) => <Badge variant="outline" className="text-[10px]">{(r as GroupRow).line_count ?? 0}</Badge>,
        },
        { key: "description", label: "Description" },
        { key: "is_active", label: "Status" },
      ]}
    />
  );
}