import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ClipboardList, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers, usePurchaseOrders, useProducts, type POWithLines, type POStatus } from "@/hooks/useErpData";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/purchase-orders")({
  component: POPage,
  head: () => ({ meta: [{ title: "Purchase orders · YOYO ERP" }] }),
});

const STATUS_COLORS: Record<POStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-sky-500/10 text-sky-700",
  approved: "bg-blue-500/10 text-blue-700",
  partial: "bg-amber-500/10 text-amber-700",
  received: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
  closed: "bg-slate-500/10 text-slate-700",
};

interface DraftLine { variant_id: string; qty_ordered: number; unit_cost: number; }

interface DraftPO {
  id?: string;
  po_number: string;
  supplier_id: string;
  status: POStatus;
  expected_date: string;
  notes: string;
  lines: DraftLine[];
}

function emptyDraft(): DraftPO {
  const yymm = new Date().toISOString().slice(2, 7).replace("-", "");
  return {
    po_number: `PO-${yymm}-${Math.floor(Math.random() * 9000 + 1000)}`,
    supplier_id: "", status: "draft", expected_date: "", notes: "",
    lines: [],
  };
}

function POPage() {
  const { purchaseOrders, loading, refresh } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  const { can } = usePermissions();
  const canManage = can("create_po");

  const variantOptions = useMemo(() =>
    products.flatMap((p) => p.variants.map((v) => ({
      id: v.id, label: `${p.name} · ${v.variant_name} (${v.sku})`, cost: Number(v.last_cost ?? 0),
    }))), [products]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPO | null>(null);
  const [deleting, setDeleting] = useState<POWithLines | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() { setDraft(emptyDraft()); setOpen(true); }
  function openEdit(po: POWithLines) {
    setDraft({
      id: po.id, po_number: po.po_number, supplier_id: po.supplier_id,
      status: po.status, expected_date: po.expected_date ?? "", notes: po.notes ?? "",
      lines: po.lines.map((l) => ({
        variant_id: l.variant_id, qty_ordered: Number(l.qty_ordered), unit_cost: Number(l.unit_cost),
      })),
    });
    setOpen(true);
  }

  function addLine() {
    if (!draft) return;
    setDraft({ ...draft, lines: [...draft.lines, { variant_id: "", qty_ordered: 1, unit_cost: 0 }] });
  }
  function updateLine(i: number, patch: Partial<DraftLine>) {
    if (!draft) return;
    const lines = [...draft.lines]; lines[i] = { ...lines[i], ...patch };
    setDraft({ ...draft, lines });
  }
  function removeLine(i: number) {
    if (!draft) return;
    setDraft({ ...draft, lines: draft.lines.filter((_, idx) => idx !== i) });
  }

  const totals = useMemo(() => {
    if (!draft) return { subtotal: 0 };
    const subtotal = draft.lines.reduce((s, l) => s + l.qty_ordered * l.unit_cost, 0);
    return { subtotal };
  }, [draft]);

  async function handleSave() {
    if (!draft) return;
    if (!draft.supplier_id) { toast.error("Pick a supplier"); return; }
    if (draft.lines.length === 0) { toast.error("Add at least one line"); return; }
    if (draft.lines.some((l) => !l.variant_id || l.qty_ordered <= 0)) {
      toast.error("Each line needs a variant and qty > 0"); return;
    }
    setSaving(true);
    const subtotal = draft.lines.reduce((s, l) => s + l.qty_ordered * l.unit_cost, 0);
    const headerPayload = {
      po_number: draft.po_number, supplier_id: draft.supplier_id, status: draft.status,
      expected_date: draft.expected_date || null, notes: draft.notes || null,
      subtotal, total: subtotal,
    };

    let poId = draft.id;
    if (poId) {
      const { error } = await supabase.from("purchase_orders").update(headerPayload).eq("id", poId);
      if (error) { setSaving(false); toast.error("Save failed", { description: error.message }); return; }
      await supabase.from("purchase_order_lines").delete().eq("po_id", poId);
    } else {
      const { data, error } = await supabase.from("purchase_orders").insert(headerPayload).select("id").single();
      if (error || !data) { setSaving(false); toast.error("Save failed", { description: error?.message }); return; }
      poId = data.id;
    }
    const linesPayload = draft.lines.map((l) => ({
      po_id: poId!, variant_id: l.variant_id,
      qty_ordered: l.qty_ordered, unit_cost: l.unit_cost,
      line_total: l.qty_ordered * l.unit_cost,
    }));
    const { error: lErr } = await supabase.from("purchase_order_lines").insert(linesPayload);
    setSaving(false);
    if (lErr) { toast.error("Lines failed", { description: lErr.message }); return; }
    toast.success(draft.id ? "PO updated" : "PO created");
    setOpen(false); setDraft(null); await refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("purchase_orders").delete().eq("id", deleting.id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("PO deleted");
    setDeleting(null); await refresh();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Purchase orders</h1>
          <p className="text-sm text-muted-foreground">{purchaseOrders.length} POs</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New PO
          </Button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white p-8 text-sm text-muted-foreground">Loading…</div>
      ) : purchaseOrders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No purchase orders"
          description="Create your first PO to track procurement from your suppliers."
          actionLabel={canManage ? "Create PO" : undefined}
          onAction={canManage ? openCreate : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-right font-mono">Total ₹</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                  <TableCell className="font-medium">{po.supplier?.name ?? "—"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[po.status]} variant="outline">{po.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{po.order_date}</TableCell>
                  <TableCell className="text-muted-foreground">{po.expected_date ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(po.total).toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(po)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(po)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{draft?.id ? "Edit PO" : "New purchase order"}</SheetTitle>
            <SheetDescription>Header + line items.</SheetDescription>
          </SheetHeader>
          {draft && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>PO number</Label><Input value={draft.po_number} onChange={(e) => setDraft({ ...draft, po_number: e.target.value })} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as POStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["draft","submitted","approved","partial","received","cancelled","closed"] as POStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Supplier</Label>
                <Select value={draft.supplier_id} onValueChange={(v) => setDraft({ ...draft, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} · {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected delivery</Label>
                <Input type="date" value={draft.expected_date} onChange={(e) => setDraft({ ...draft, expected_date: e.target.value })} />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Line items</Label>
                  <Button size="sm" variant="outline" onClick={addLine}><Plus className="mr-1 h-3.5 w-3.5" /> Add line</Button>
                </div>
                {draft.lines.length === 0 ? (
                  <p className="rounded border border-dashed border-border py-4 text-center text-xs text-muted-foreground">No lines yet</p>
                ) : (
                  <div className="space-y-2">
                    {draft.lines.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-center">
                        <Select value={l.variant_id} onValueChange={(v) => {
                          const opt = variantOptions.find((o) => o.id === v);
                          updateLine(i, { variant_id: v, unit_cost: l.unit_cost || (opt?.cost ?? 0) });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Pick variant" /></SelectTrigger>
                          <SelectContent>
                            {variantOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" min={0} step="0.01" value={l.qty_ordered} onChange={(e) => updateLine(i, { qty_ordered: Number(e.target.value) })} />
                        <Input type="number" min={0} step="0.01" value={l.unit_cost} onChange={(e) => updateLine(i, { unit_cost: Number(e.target.value) })} />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeLine(i)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end pt-2 text-sm">
                  <span className="text-muted-foreground">Subtotal:&nbsp;</span>
                  <span className="font-mono">₹{totals.subtotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div><Label>Notes</Label><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save PO"}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.po_number}?</AlertDialogTitle>
            <AlertDialogDescription>This deletes the PO and all its line items. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}