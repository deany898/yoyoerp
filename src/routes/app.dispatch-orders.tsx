import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Send, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, useWarehouses } from "@/hooks/useErpData";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { SmartSelect } from "@/components/forms/SmartSelect";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/dispatch-orders")({
  component: DispatchOrdersPage,
  head: () => ({ meta: [{ title: "Dispatch orders · YOYO ERP" }] }),
});

type DispatchStatus =
  | "draft" | "pending_approval" | "approved" | "ready_for_dispatch"
  | "dispatched" | "delivered" | "cancelled";

const STATUS_TONE: Record<DispatchStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/10 text-amber-700",
  approved: "bg-blue-500/10 text-blue-700",
  ready_for_dispatch: "bg-cyan-500/10 text-cyan-700",
  dispatched: "bg-violet-500/10 text-violet-700",
  delivered: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
};

interface DraftLine {
  variant_id: string; qty: number; unit_price: number;
  discount_value: number; tax_rate: number;
}
interface DraftDO {
  id?: string;
  do_number: string;
  customer_id: string;
  warehouse_id: string;
  status: DispatchStatus;
  expected_dispatch_date: string;
  delivery_address: string;
  transporter: string;
  vehicle_number: string;
  lr_number: string;
  freight_cost: number;
  packing_cost: number;
  other_charges: number;
  notes: string;
  lines: DraftLine[];
}

function emptyDraft(): DraftDO {
  return {
    do_number: "",
    customer_id: "", warehouse_id: "", status: "draft",
    expected_dispatch_date: "", delivery_address: "", transporter: "",
    vehicle_number: "", lr_number: "",
    freight_cost: 0, packing_cost: 0, other_charges: 0,
    notes: "", lines: [],
  };
}

interface CustomerLite { id: string; code: string; name: string; pricing_tier: string; delivery_address: string | null; }
interface DORow {
  id: string; do_number: string; status: DispatchStatus;
  order_date: string; expected_dispatch_date: string | null;
  grand_total: number; customer: { id: string; name: string } | null;
}

function DispatchOrdersPage() {
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  const { role } = useRole();
  const canEdit = ["admin", "manager", "sales", "dispatch"].includes(role);

  const [orders, setOrders] = useState<DORow[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftDO | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DORow | null>(null);

  async function refresh() {
    setLoading(true);
    const [ordRes, custRes] = await Promise.all([
      supabase.from("dispatch_orders")
        .select("id, do_number, status, order_date, expected_dispatch_date, grand_total, customer:customers(id,name)")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id,code,name,pricing_tier,delivery_address").order("name"),
    ]);
    if (ordRes.error) toast.error("Failed to load dispatch orders", { description: ordRes.error.message });
    if (custRes.error) toast.error("Failed to load customers", { description: custRes.error.message });
    setOrders((ordRes.data ?? []) as unknown as DORow[]);
    setCustomers((custRes.data ?? []) as CustomerLite[]);
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  const variantOptions = useMemo(() =>
    products.flatMap((p) =>
      p.variants.map((v) => ({
        value: v.id,
        label: `${p.name} · ${v.variant_name}`,
        hint: `Avg ₹${Number(v.avg_cost).toFixed(2)}`,
        cost: Number(v.avg_cost ?? 0),
      }))
    ), [products]);

  const customerOptions = useMemo(() =>
    customers.map((c) => ({ value: c.id, label: c.name, hint: c.code })),
  [customers]);

  async function openCreate() {
    const draft = emptyDraft();
    const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "DO" });
    if (error || !data) {
      toast.error("Could not generate DO number", { description: error?.message });
      return;
    }
    draft.do_number = data as string;
    setDraft(draft);
    setOpen(true);
  }

  async function openEdit(row: DORow) {
    const { data, error } = await supabase
      .from("dispatch_orders")
      .select("*, lines:dispatch_order_lines(*)")
      .eq("id", row.id).maybeSingle();
    if (error || !data) { toast.error("Failed to load DO"); return; }
    setDraft({
      id: data.id, do_number: data.do_number, customer_id: data.customer_id,
      warehouse_id: data.warehouse_id ?? "", status: data.status as DispatchStatus,
      expected_dispatch_date: data.expected_dispatch_date ?? "",
      delivery_address: data.delivery_address ?? "",
      transporter: data.transporter ?? "",
      vehicle_number: data.vehicle_number ?? "",
      lr_number: data.lr_number ?? "",
      freight_cost: Number(data.freight_cost ?? 0),
      packing_cost: Number(data.packing_cost ?? 0),
      other_charges: Number(data.other_charges ?? 0),
      notes: data.notes ?? "",
      lines: (data.lines ?? []).map((l: { variant_id: string; qty: number; unit_price: number; discount_value: number; tax_rate: number }) => ({
        variant_id: l.variant_id, qty: Number(l.qty),
        unit_price: Number(l.unit_price), discount_value: Number(l.discount_value),
        tax_rate: Number(l.tax_rate),
      })),
    });
    setOpen(true);
  }

  function patchDraft(p: Partial<DraftDO>) { setDraft((d) => d ? { ...d, ...p } : d); }
  function addLine() { patchDraft({ lines: [...(draft?.lines ?? []), { variant_id: "", qty: 1, unit_price: 0, discount_value: 0, tax_rate: 0 }] }); }
  function updateLine(i: number, p: Partial<DraftLine>) {
    if (!draft) return;
    const lines = [...draft.lines]; lines[i] = { ...lines[i], ...p };
    patchDraft({ lines });
  }
  function removeLine(i: number) {
    if (!draft) return;
    patchDraft({ lines: draft.lines.filter((_, idx) => idx !== i) });
  }

  const totals = useMemo(() => {
    if (!draft) return { subtotal: 0, discount: 0, tax: 0, grand: 0 };
    let subtotal = 0, discount = 0, tax = 0;
    for (const l of draft.lines) {
      const gross = l.qty * l.unit_price;
      subtotal += gross;
      discount += l.discount_value;
      tax += ((gross - l.discount_value) * l.tax_rate) / 100;
    }
    const grand = subtotal - discount + tax + draft.freight_cost + draft.packing_cost + draft.other_charges;
    return { subtotal, discount, tax, grand };
  }, [draft]);

  async function save() {
    if (!draft) return;
    if (!draft.customer_id) { toast.error("Pick a customer"); return; }
    if (draft.lines.length === 0) { toast.error("Add at least one line"); return; }
    if (draft.lines.some((l) => !l.variant_id || l.qty <= 0)) { toast.error("Each line needs a product and qty > 0"); return; }
    setSaving(true);
    let doNumber = draft.do_number;
    if (!doNumber) {
      const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "DO" });
      if (error || !data) { setSaving(false); toast.error("Could not generate DO number", { description: error?.message }); return; }
      doNumber = data as string;
    }
    const header = {
      do_number: doNumber, customer_id: draft.customer_id,
      warehouse_id: draft.warehouse_id || null, status: draft.status,
      expected_dispatch_date: draft.expected_dispatch_date || null,
      delivery_address: draft.delivery_address || null,
      transporter: draft.transporter || null,
      vehicle_number: draft.vehicle_number || null,
      lr_number: draft.lr_number || null,
      freight_cost: draft.freight_cost, packing_cost: draft.packing_cost,
      other_charges: draft.other_charges,
      subtotal: totals.subtotal, discount_total: totals.discount,
      tax_total: totals.tax, grand_total: totals.grand,
      notes: draft.notes || null,
    };
    let id = draft.id;
    if (id) {
      const { error } = await supabase.from("dispatch_orders").update(header).eq("id", id);
      if (error) { setSaving(false); toast.error("Save failed", { description: error.message }); return; }
      await supabase.from("dispatch_order_lines").delete().eq("dispatch_order_id", id);
    } else {
      const { data, error } = await supabase.from("dispatch_orders").insert(header).select("id").single();
      if (error || !data) { setSaving(false); toast.error("Save failed", { description: error?.message }); return; }
      id = data.id;
    }
    const lines = draft.lines.map((l) => ({
      dispatch_order_id: id!, variant_id: l.variant_id, qty: l.qty,
      unit_price: l.unit_price, discount_value: l.discount_value, tax_rate: l.tax_rate,
      line_total: l.qty * l.unit_price - l.discount_value + ((l.qty * l.unit_price - l.discount_value) * l.tax_rate) / 100,
    }));
    const { error: lErr } = await supabase.from("dispatch_order_lines").insert(lines);
    setSaving(false);
    if (lErr) { toast.error("Lines failed", { description: lErr.message }); return; }
    toast.success(draft.id ? "DO updated" : "DO created");
    setOpen(false); setDraft(null); void refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("dispatch_orders").delete().eq("id", deleting.id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Dispatch order deleted");
    setDeleting(null); void refresh();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sales · Outbound</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Dispatch orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {canEdit && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New dispatch order</Button>}
      </header>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {orders.length === 0 ? (
          <EmptyState icon={Send} title="No dispatch orders yet"
            description="Create a customer dispatch order to begin fulfillment."
            actionLabel={canEdit ? "New dispatch order" : undefined}
            onAction={canEdit ? openCreate : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DO #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Expected dispatch</TableHead>
                <TableHead className="text-right font-mono">Total ₹</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.do_number}</TableCell>
                  <TableCell className="font-medium">{o.customer?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_TONE[o.status]}>{o.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.order_date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.expected_dispatch_date ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(o.grand_total).toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(o)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(o)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{draft?.id ? "Edit dispatch order" : "New dispatch order"}</SheetTitle>
            <SheetDescription>Customer, line items, logistics, and totals.</SheetDescription>
          </SheetHeader>
          {draft && (
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>DO number</Label><Input value={draft.do_number} onChange={(e) => patchDraft({ do_number: e.target.value })} /></div>
                <div>
                  <Label>Status</Label>
                  <SmartSelect
                    options={(["draft","pending_approval","approved","ready_for_dispatch","dispatched","delivered","cancelled"] as DispatchStatus[]).map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
                    value={draft.status}
                    onChange={(v) => v && patchDraft({ status: v as DispatchStatus })}
                    searchPlaceholder="Search status…"
                  />
                </div>
              </div>

              <div>
                <Label>Customer</Label>
                <SmartSelect
                  options={customerOptions}
                  value={draft.customer_id || null}
                  onChange={(v) => {
                    const c = customers.find((x) => x.id === v);
                    patchDraft({
                      customer_id: v ?? "",
                      delivery_address: draft.delivery_address || (c?.delivery_address ?? ""),
                    });
                  }}
                  placeholder="Search customer…"
                  searchPlaceholder="Type customer name or code"
                  emptyText="No customers found. Add via Customers page."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Warehouse</Label>
                  <SmartSelect
                    options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                    value={draft.warehouse_id || null}
                    onChange={(v) => patchDraft({ warehouse_id: v ?? "" })}
                    placeholder="Pick warehouse"
                    searchPlaceholder="Search warehouse…"
                  />
                </div>
                <div><Label>Expected dispatch date</Label><Input type="date" value={draft.expected_dispatch_date} onChange={(e) => patchDraft({ expected_dispatch_date: e.target.value })} /></div>
              </div>

              <div><Label>Delivery address</Label><Textarea rows={2} value={draft.delivery_address} onChange={(e) => patchDraft({ delivery_address: e.target.value })} /></div>

              <div className="grid grid-cols-3 gap-3">
                <div><Label>Transporter</Label><Input value={draft.transporter} onChange={(e) => patchDraft({ transporter: e.target.value })} /></div>
                <div><Label>Vehicle no.</Label><Input value={draft.vehicle_number} onChange={(e) => patchDraft({ vehicle_number: e.target.value })} /></div>
                <div><Label>LR number</Label><Input value={draft.lr_number} onChange={(e) => patchDraft({ lr_number: e.target.value })} /></div>
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
                      <div key={i} className="space-y-1.5 rounded-md border border-border p-2">
                        <SmartSelect
                          options={variantOptions}
                          value={l.variant_id || null}
                          onChange={(v) => {
                            const opt = variantOptions.find((o) => o.value === v);
                            updateLine(i, { variant_id: v ?? "", unit_price: l.unit_price || (opt?.cost ?? 0) });
                          }}
                          placeholder="Search product…"
                        />
                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_36px] gap-2">
                          <Input type="number" min={0} step="0.01" placeholder="Qty" value={l.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} />
                          <Input type="number" min={0} step="0.01" placeholder="Unit price" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} />
                          <Input type="number" min={0} step="0.01" placeholder="Discount" value={l.discount_value} onChange={(e) => updateLine(i, { discount_value: Number(e.target.value) })} />
                          <Input type="number" min={0} step="0.01" placeholder="Tax %" value={l.tax_rate} onChange={(e) => updateLine(i, { tax_rate: Number(e.target.value) })} />
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeLine(i)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div><Label>Freight</Label><Input type="number" min={0} step="0.01" value={draft.freight_cost} onChange={(e) => patchDraft({ freight_cost: Number(e.target.value) })} /></div>
                <div><Label>Packing</Label><Input type="number" min={0} step="0.01" value={draft.packing_cost} onChange={(e) => patchDraft({ packing_cost: Number(e.target.value) })} /></div>
                <div><Label>Other charges</Label><Input type="number" min={0} step="0.01" value={draft.other_charges} onChange={(e) => patchDraft({ other_charges: Number(e.target.value) })} /></div>
              </div>

              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1 font-mono">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-₹{totals.discount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>₹{totals.tax.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Freight + packing + other</span><span>₹{(draft.freight_cost + draft.packing_cost + draft.other_charges).toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Grand total</span><span>₹{totals.grand.toFixed(2)}</span></div>
              </div>

              <div><Label>Notes</Label><Textarea rows={2} value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} /></div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save dispatch order"}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.do_number}?</AlertDialogTitle>
            <AlertDialogDescription>This deletes the order and all line items.</AlertDialogDescription>
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