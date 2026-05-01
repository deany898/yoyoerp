import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layers, Package, Plus, Search, Trash2, Link2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGate, usePermissions } from "@/hooks/usePermissions";
import { AddStageSheet } from "@/components/manufacturing/AddStageSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SmartSelect } from "@/components/forms/SmartSelect";
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
  pay_mode?: "salary" | "per_unit";
  unit_cost?: number;
  variant?: { sku: string; variant_name: string } | null;
};

type GroupRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  line_count?: number;
  product_count?: number;
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
  const [addOpen, setAddOpen] = useState(false);
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
        <PermissionGate permission="edit_item">
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add stage
          </Button>
        </PermissionGate>
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
                    <td className="px-4 py-3">
                      <div>{r.stage_name}</div>
                      <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                        {r.pay_mode === "per_unit" ? `Per unit · ₹${Number(r.unit_cost ?? 0).toFixed(2)}` : "Salary"}
                      </Badge>
                    </td>
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

      <AddStageSheet open={addOpen} onClose={() => setAddOpen(false)} mode="product" onSaved={refresh} />
    </div>
  );
}

/* ---------------- Group tab ---------------- */
function GroupStagesPanel() {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<GroupRow | null>(null);
  const { can } = usePermissions();
  const confirm = useConfirm();

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stage_groups")
      .select("*, stage_group_lines(count), stage_group_products(count)")
      .order("name", { ascending: true });
    if (error) notify.error("Failed to load stage groups", { description: error.message });
    const mapped = (data ?? []).map((g: { id: string; code: string; name: string; description: string | null; is_active: boolean; stage_group_lines: { count: number }[]; stage_group_products: { count: number }[] }) => ({
      id: g.id, code: g.code, name: g.name, description: g.description, is_active: g.is_active,
      line_count: g.stage_group_lines?.[0]?.count ?? 0,
      product_count: g.stage_group_products?.[0]?.count ?? 0,
    }));
    setRows(mapped);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const onDeleteGroup = async (g: GroupRow) => {
    const ok = await confirm({
      title: `Delete group "${g.name}"?`,
      description: "Its stages and product links will be removed.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("stage_groups").delete().eq("id", g.id);
    if (error) return notify.error("Could not delete group", { description: error.message });
    notify.success("Group deleted");
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Reusable stage templates · auto-applies to all linked products.</p>
        <PermissionGate permission="edit_item">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New group
          </Button>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden"><TableSkeleton rows={3} columns={5} /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState icon={Layers} title="No stage groups" description="Create a group to share stages across multiple products." />
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((g) => (
            <div key={g.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{g.name}</h3>
                    <Badge variant="outline" className="font-mono text-[10px]">{g.code}</Badge>
                  </div>
                  {g.description && <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{g.line_count ?? 0} stages</Badge>
                    <Badge variant="outline" className="text-[10px]">{g.product_count ?? 0} products linked</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  {can("edit_item") && (
                    <Button variant="outline" size="sm" onClick={() => setActiveGroup(g)} className="gap-1.5">
                      <Layers className="h-3.5 w-3.5" /> Manage
                    </Button>
                  )}
                  {can("delete_item") && (
                    <Button variant="ghost" size="icon" onClick={() => onDeleteGroup(g)} aria-label="Delete group">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewGroupDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refresh} />
      {activeGroup && (
        <GroupDetailSheet
          group={activeGroup}
          onClose={() => { setActiveGroup(null); refresh(); }}
        />
      )}
    </div>
  );
}

/* ---------------- New group dialog ---------------- */
function NewGroupDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(""); setDescription(""); } }, [open]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    // Auto-generate stage group code · SG-<short-uuid>
    const autoCode = `SG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error } = await supabase.from("stage_groups").insert({ code: autoCode, name: name.trim(), description: description.trim() || null });
    setSaving(false);
    if (error) return notify.error("Could not create group", { description: error.message });
    notify.success("Group created");
    onCreated();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New stage group</SheetTitle>
          <SheetDescription>Reusable template · add stages and link products after creating.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <AutoCodeField label="Code" />
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard injection moulding" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !code.trim() || !name.trim()}>{saving ? "Saving…" : "Create"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- Group detail · stages + linked products ---------------- */
type GroupLine = { id: string; sequence: number; stage_name: string; stage_kind: string; pay_mode: "salary" | "per_unit"; unit_cost: number; labour_cost: number; machine_cost: number; rejection_pct: number };
type LinkedProduct = { id: string; product_id: string; product?: { code: string; name: string } | null };

function GroupDetailSheet({ group, onClose }: { group: GroupRow; onClose: () => void }) {
  const [lines, setLines] = useState<GroupLine[]>([]);
  const [linked, setLinked] = useState<LinkedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [productPick, setProductPick] = useState<string | null>(null);
  const confirm = useConfirm();

  const refresh = async () => {
    const [{ data: l }, { data: lp }, { data: p }] = await Promise.all([
      supabase.from("stage_group_lines").select("*").eq("group_id", group.id).order("sequence"),
      supabase.from("stage_group_products").select("id, product_id, product:products(code, name)").eq("group_id", group.id),
      supabase.from("products").select("id, code, name").eq("is_active", true).order("name"),
    ]);
    setLines((l ?? []) as unknown as GroupLine[]);
    setLinked((lp ?? []) as unknown as LinkedProduct[]);
    setAllProducts((p ?? []) as { id: string; code: string; name: string }[]);
  };
  useEffect(() => { refresh(); }, [group.id]);

  const linkedIds = useMemo(() => new Set(linked.map((l) => l.product_id)), [linked]);
  const productOptions = useMemo(
    () => allProducts.filter((p) => !linkedIds.has(p.id)).map((p) => ({ value: p.id, label: p.name, hint: p.code })),
    [allProducts, linkedIds],
  );

  const linkProduct = async () => {
    if (!productPick) return;
    const { error } = await supabase.from("stage_group_products").insert({ group_id: group.id, product_id: productPick });
    if (error) return notify.error("Could not link product", { description: error.message });
    notify.success("Product linked · group stages now apply");
    setProductPick(null);
    refresh();
  };

  const unlinkProduct = async (id: string) => {
    const { error } = await supabase.from("stage_group_products").delete().eq("id", id);
    if (error) return notify.error("Could not unlink", { description: error.message });
    refresh();
  };

  const deleteLine = async (id: string) => {
    const ok = await confirm({ title: "Delete stage?", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    const { error } = await supabase.from("stage_group_lines").delete().eq("id", id);
    if (error) return notify.error("Could not delete", { description: error.message });
    refresh();
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">{group.name} <Badge variant="outline" className="font-mono text-[10px]">{group.code}</Badge></SheetTitle>
          <SheetDescription>Stages defined here apply automatically to every linked product.</SheetDescription>
        </SheetHeader>

        {/* Linked products */}
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Linked products · {linked.length}</h3>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <SmartSelect
                options={productOptions}
                value={productPick}
                onChange={setProductPick}
                placeholder="Select a product to link…"
                searchPlaceholder="Type product name or code"
              />
            </div>
            <Button onClick={linkProduct} disabled={!productPick} className="gap-1.5"><Link2 className="h-4 w-4" /> Link</Button>
          </div>
          {linked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {linked.map((lp) => (
                <div key={lp.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  <span>{lp.product?.name ?? "—"}</span>
                  <button onClick={() => unlinkProduct(lp.id)} className="text-muted-foreground hover:text-destructive" aria-label="Unlink">×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Stages */}
        <section className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Stages · {lines.length}</h3>
            <Button size="sm" onClick={() => setAddStageOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add stage</Button>
          </div>
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No stages yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Seq</th>
                    <th className="px-3 py-2 text-left font-medium">Stage</th>
                    <th className="px-3 py-2 text-left font-medium">Pay</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{l.sequence}</td>
                      <td className="px-3 py-2">
                        <div>{l.stage_name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l.stage_kind}</div>
                      </td>
                      <td className="px-3 py-2 text-xs capitalize">{l.pay_mode === "per_unit" ? "Per unit" : "Salary"}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {l.pay_mode === "per_unit" ? Number(l.unit_cost).toFixed(2) : Number(l.labour_cost).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteLine(l.id)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <AddStageSheet open={addStageOpen} onClose={() => setAddStageOpen(false)} mode="group" groupId={group.id} onSaved={refresh} />
      </SheetContent>
    </Sheet>
  );
}