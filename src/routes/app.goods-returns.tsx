import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Undo2, Pencil, Trash2, X } from "lucide-react";
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
import { GRStatusStepper, type GRStatus } from "@/components/goods-returns/GRStatusStepper";
import { GRLifecycleActions, type GRTransition } from "@/components/goods-returns/GRLifecycleActions";
import { GRMovementsTimeline } from "@/components/goods-returns/GRMovementsTimeline";
import { GRLineImpacts } from "@/components/goods-returns/GRLineImpacts";
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
import { ExportButton } from "@/components/shared/ExportButton";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FLAGS } from "@/lib/feature-flags";

export const Route = createFileRoute("/app/goods-returns")({
  component: GoodsReturnsPage,
  head: () => ({ meta: [{ title: "Goods returns · YOYO ERP" }] }),
});

type GRReason = "damaged" | "wrong_item" | "excess" | "quality_issue" | "expired" | "other";
type GRCondition = "resaleable" | "repairable" | "scrap";

const STATUS_TONE: Record<GRStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/10 text-amber-700",
  approved: "bg-blue-500/10 text-blue-700",
  received: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
};

const REASONS: GRReason[] = ["damaged", "wrong_item", "excess", "quality_issue", "expired", "other"];
const CONDITIONS: GRCondition[] = ["resaleable", "repairable", "scrap"];

interface DraftLine {
  variant_id: string;
  qty: number;
  unit_price: number;
  reason: GRReason;
  condition: GRCondition;
  restock_zone_id: string;
  notes: string;
}
interface DraftGR {
  id?: string;
  gr_number: string;
  customer_id: string;
  dispatch_order_id: string;
  warehouse_id: string;
  status: GRStatus;
  return_date: string;
  reason: GRReason | "";
  refund_amount: number;
  notes: string;
  lines: DraftLine[];
}

function emptyDraft(): DraftGR {
  return {
    gr_number: "", customer_id: "", dispatch_order_id: "",
    warehouse_id: "", status: "draft",
    return_date: new Date().toISOString().slice(0, 10),
    reason: "", refund_amount: 0, notes: "", lines: [],
  };
}

interface CustomerLite { id: string; code: string; name: string; }
interface DOLite { id: string; do_number: string; customer_id: string; }
interface GRRow {
  id: string; gr_number: string; status: GRStatus;
  return_date: string; refund_amount: number;
  customer: { id: string; name: string } | null;
  dispatch_order: { id: string; do_number: string } | null;
}

function GoodsReturnsPage() {
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  const { role } = useRole();
  const canEdit = ["admin", "manager", "sales", "dispatch"].includes(role);
  const { isEnabled } = useAppConfig();
  const showFinance = isEnabled(FLAGS.customers.showFinanceFields, true);

  const [returns, setReturns] = useState<GRRow[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [dispatchOrders, setDispatchOrders] = useState<DOLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftGR | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyTransition, setBusyTransition] = useState<GRTransition | null>(null);
  const [deleting, setDeleting] = useState<GRRow | null>(null);

  async function refresh() {
    setLoading(true);
    const [grRes, custRes, doRes] = await Promise.all([
      supabase.from("goods_returns")
        .select("id, gr_number, status, return_date, refund_amount, customer:customers(id,name), dispatch_order:dispatch_orders(id,do_number)")
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id,code,name").order("name"),
      supabase.from("dispatch_orders").select("id,do_number,customer_id").order("created_at", { ascending: false }).limit(200),
    ]);
    if (grRes.error) toast.error("Failed to load goods returns", { description: grRes.error.message });
    setReturns((grRes.data ?? []) as unknown as GRRow[]);
    setCustomers((custRes.data ?? []) as CustomerLite[]);
    setDispatchOrders((doRes.data ?? []) as DOLite[]);
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  const variantOptions = useMemo(() =>
    products.flatMap((p) => p.variants.map((v) => ({
      value: v.id,
      label: `${p.name} · ${v.variant_name}`,
      hint: `Avg ₹${Number(v.avg_cost).toFixed(2)}`,
    }))), [products]);
  const customerOptions = useMemo(() =>
    customers.map((c) => ({ value: c.id, label: c.name, hint: c.code })), [customers]);

  const allZones = useMemo(() =>
    warehouses.flatMap((w) => w.zones.map((z) => ({
      value: z.id, label: `${w.name} · ${z.name}`, kind: z.kind, warehouse_id: w.id,
    }))), [warehouses]);

  async function openCreate() {
    const d = emptyDraft();
    const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "GR" });
    if (error || !data) { toast.error("Could not generate GR number", { description: error?.message }); return; }
    d.gr_number = data as string;
    setDraft(d); setOpen(true);
  }

  async function openEdit(row: GRRow) {
    const { data, error } = await supabase
      .from("goods_returns")
      .select("*, lines:goods_return_lines(*)")
      .eq("id", row.id).maybeSingle();
    if (error || !data) { toast.error("Failed to load return"); return; }
    setDraft({
      id: data.id, gr_number: data.gr_number, customer_id: data.customer_id,
      dispatch_order_id: data.dispatch_order_id ?? "",
      warehouse_id: data.warehouse_id ?? "",
      status: data.status as GRStatus,
      return_date: data.return_date ?? new Date().toISOString().slice(0, 10),
      reason: (data.reason as GRReason) ?? "",
      refund_amount: Number(data.refund_amount ?? 0),
      notes: data.notes ?? "",
      lines: (data.lines ?? []).map((l: { variant_id: string; qty: number; unit_price: number; reason: GRReason; condition: GRCondition; restock_zone_id: string | null; notes: string | null }) => ({
        variant_id: l.variant_id, qty: Number(l.qty),
        unit_price: Number(l.unit_price),
        reason: l.reason, condition: l.condition,
        restock_zone_id: l.restock_zone_id ?? "",
        notes: l.notes ?? "",
      })),
    });
    setOpen(true);
  }

  function patchDraft(p: Partial<DraftGR>) { setDraft((d) => d ? { ...d, ...p } : d); }
  function addLine() {
    patchDraft({ lines: [...(draft?.lines ?? []), {
      variant_id: "", qty: 1, unit_price: 0,
      reason: "damaged", condition: "resaleable", restock_zone_id: "", notes: "",
    }] });
  }
  function updateLine(i: number, p: Partial<DraftLine>) {
    if (!draft) return;
    const lines = [...draft.lines]; lines[i] = { ...lines[i], ...p };
    patchDraft({ lines });
  }
  function removeLine(i: number) {
    if (!draft) return;
    patchDraft({ lines: draft.lines.filter((_, idx) => idx !== i) });
  }

  const refundAuto = useMemo(() => {
    if (!draft) return 0;
    return draft.lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
  }, [draft]);

  const filteredDOs = useMemo(() => {
    if (!draft?.customer_id) return dispatchOrders;
    return dispatchOrders.filter((d) => d.customer_id === draft.customer_id);
  }, [dispatchOrders, draft?.customer_id]);

  async function persist(override?: DraftGR): Promise<string | null> {
    const src = override ?? draft;
    if (!src) return null;
    if (!src.customer_id) { toast.error("Pick a customer"); return null; }
    if (src.lines.length === 0) { toast.error("Add at least one line"); return null; }
    if (src.lines.some((l) => !l.variant_id || l.qty <= 0)) {
      toast.error("Each line needs a product and qty > 0"); return null;
    }
    let grNumber = src.gr_number;
    if (!grNumber) {
      const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "GR" });
      if (error || !data) { toast.error("Could not generate GR number"); return null; }
      grNumber = data as string;
    }
    const header = {
      gr_number: grNumber, customer_id: src.customer_id,
      dispatch_order_id: src.dispatch_order_id || null,
      warehouse_id: src.warehouse_id || null,
      status: src.status,
      return_date: src.return_date,
      reason: src.reason || null,
      refund_amount: src.refund_amount || src.lines.reduce((s, l) => s + l.qty * l.unit_price, 0),
      notes: src.notes || null,
    };
    let id = src.id;
    if (id) {
      const { error } = await supabase.from("goods_returns").update(header).eq("id", id);
      if (error) { toast.error("Save failed", { description: error.message }); return null; }
      await supabase.from("goods_return_lines").delete().eq("goods_return_id", id);
    } else {
      const { data, error } = await supabase.from("goods_returns").insert(header).select("id").single();
      if (error || !data) { toast.error("Save failed", { description: error?.message }); return null; }
      id = data.id;
    }
    const lines = src.lines.map((l) => ({
      goods_return_id: id!, variant_id: l.variant_id, qty: l.qty,
      unit_price: l.unit_price, line_total: l.qty * l.unit_price,
      reason: l.reason, condition: l.condition,
      restock_zone_id: l.restock_zone_id || null, notes: l.notes || null,
    }));
    const { error: lErr } = await supabase.from("goods_return_lines").insert(lines);
    if (lErr) { toast.error("Lines failed", { description: lErr.message }); return null; }
    setDraft({ ...src, id });
    return id!;
  }

  async function save() {
    setSaving(true);
    const id = await persist();
    setSaving(false);
    if (!id) return;
    toast.success(draft?.id ? "Return updated" : "Return created");
    setOpen(false); setDraft(null); void refresh();
  }

  const NEXT_STATUS: Record<GRTransition, GRStatus> = {
    submit: "pending_approval",
    approve: "approved",
    receive: "received",
    cancel: "cancelled",
    reopen: "draft",
  };

  /**
   * Move the return to its next status. The "receive" transition also posts
   * stock movements (reason=return for resaleable, reason=scrap for the rest)
   * and bumps inventory_stock.on_hand for restocked zones.
   */
  async function transitionTo(t: GRTransition) {
    if (!draft) return;
    const nextStatus = NEXT_STATUS[t];
    if (t === "receive") {
      const missing = draft.lines.find((l) => l.condition === "resaleable" && !l.restock_zone_id);
      if (missing) { toast.error("Pick a restock zone for every resaleable line"); return; }
    }
    setBusyTransition(t);
    const updated = { ...draft, status: nextStatus };
    setDraft(updated);
    const id = await persist(updated);
    if (!id) { setBusyTransition(null); return; }

    if (t === "receive") {
      const { data: { user } } = await supabase.auth.getUser();
      const movements = updated.lines.map((l) => ({
        variant_id: l.variant_id,
        qty: l.qty,
        to_zone_id: l.condition === "resaleable" ? l.restock_zone_id : null,
        from_zone_id: null,
        reason: (l.condition === "resaleable" ? "return" : "scrap") as "return" | "scrap",
        reference_type: "goods_return",
        reference_id: id,
        unit_cost: l.unit_price,
        performed_by: user?.id ?? null,
        notes: `GR ${updated.gr_number} · ${l.condition}`,
      })).filter((m) => m.qty > 0);
      const { error: mErr } = await supabase.from("stock_movements").insert(movements);
      if (mErr) { setBusyTransition(null); toast.error("Stock movement failed", { description: mErr.message }); return; }
      for (const m of movements.filter((x) => x.to_zone_id)) {
        const { data: stock } = await supabase
          .from("inventory_stock")
          .select("id, on_hand")
          .eq("variant_id", m.variant_id).eq("zone_id", m.to_zone_id!).maybeSingle();
        if (stock) {
          await supabase.from("inventory_stock")
            .update({ on_hand: Number(stock.on_hand) + m.qty })
            .eq("id", stock.id);
        } else {
          await supabase.from("inventory_stock").insert({
            variant_id: m.variant_id, zone_id: m.to_zone_id!, on_hand: m.qty,
          });
        }
      }
      toast.success(`Return received · ${movements.length} item(s) processed`);
    } else {
      toast.success(`Return ${nextStatus.replace(/_/g, " ")}`);
    }
    setBusyTransition(null);
    void refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("goods_returns").delete().eq("id", deleting.id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Goods return deleted");
    setDeleting(null); void refresh();
  }

  const isReceived = draft?.status === "received";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sales · Reverse logistics</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Goods returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${returns.length} return${returns.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="goods_returns"
            capability="returns.export"
            rows={returns as unknown as Record<string, unknown>[]}
            columns={[
              { key: "gr_number", label: "GR #" },
              { key: "customer", label: "Customer", format: (v) => (v as { name?: string } | null)?.name ?? "" },
              { key: "dispatch_order", label: "Linked DO", format: (v) => (v as { do_number?: string } | null)?.do_number ?? "" },
              { key: "status", label: "Status" },
              { key: "return_date", label: "Return date" },
              { key: "refund_amount", label: "Refund" },
            ]}
          />
          {canEdit && <Button onClick={openCreate} className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"><Plus className="h-4 w-4" /> New goods return</Button>}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {returns.length === 0 ? (
          <EmptyState icon={Undo2} title="No goods returns yet"
            description="Log a customer return to restock or scrap items."
            actionLabel={canEdit ? "New goods return" : undefined}
            onAction={canEdit ? openCreate : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GR #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Linked DO</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Return date</TableHead>
                {showFinance && <TableHead className="text-right font-mono">Refund ₹</TableHead>}
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.gr_number}</TableCell>
                  <TableCell className="font-medium">{r.customer?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.dispatch_order?.do_number ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_TONE[r.status]}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.return_date}</TableCell>
                  {showFinance && <TableCell className="text-right font-mono">{Number(r.refund_amount).toLocaleString("en-IN")}</TableCell>}
                  <TableCell>
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(r)}>
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
            <SheetTitle>{draft?.id ? "Edit goods return" : "New goods return"}</SheetTitle>
            <SheetDescription>Customer, returned items, condition and restock destination.</SheetDescription>
          </SheetHeader>
          {draft && (
            <div className="mt-6 space-y-5">
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <GRStatusStepper status={draft.status} />
                <GRLifecycleActions
                  status={draft.status}
                  busy={busyTransition}
                  canEdit={canEdit}
                  onTransition={transitionTo}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>GR number</Label><Input value={draft.gr_number} onChange={(e) => patchDraft({ gr_number: e.target.value })} disabled={isReceived} /></div>
                <div>
                  <Label>Status</Label>
                  <SmartSelect
                    options={(["draft","pending_approval","approved","received","cancelled"] as GRStatus[]).map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
                    value={draft.status}
                    onChange={(v) => v && patchDraft({ status: v as GRStatus })}
                    disabled={isReceived}
                    searchPlaceholder="Search status…"
                  />
                </div>
              </div>

              <div>
                <Label>Customer</Label>
                <SmartSelect
                  options={customerOptions}
                  value={draft.customer_id || null}
                  onChange={(v) => patchDraft({ customer_id: v ?? "", dispatch_order_id: "" })}
                  placeholder="Search customer…"
                  searchPlaceholder="Type customer name or code"
                  emptyText="No customers found."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Linked dispatch order</Label>
                  <SmartSelect
                    options={[{ value: "none", label: "— None —" }, ...filteredDOs.map((d) => ({ value: d.id, label: d.do_number }))]}
                    value={draft.dispatch_order_id || "none"}
                    onChange={(v) => patchDraft({ dispatch_order_id: !v || v === "none" ? "" : v })}
                    placeholder="Optional"
                    searchPlaceholder="Search dispatch order…"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Return date</Label><Input type="date" value={draft.return_date} onChange={(e) => patchDraft({ return_date: e.target.value })} /></div>
                <div>
                  <Label>Primary reason</Label>
                  <SmartSelect
                    options={[{ value: "unset", label: "— Not specified —" }, ...REASONS.map((r) => ({ value: r, label: r.replace(/_/g, " ") }))]}
                    value={draft.reason || "unset"}
                    onChange={(v) => patchDraft({ reason: !v || v === "unset" ? "" : v as GRReason })}
                    placeholder="Optional"
                    searchPlaceholder="Search reason…"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Returned items</Label>
                  <Button size="sm" variant="outline" onClick={addLine} disabled={isReceived}><Plus className="mr-1 h-3.5 w-3.5" /> Add line</Button>
                </div>
                {draft.lines.length === 0 ? (
                  <p className="rounded border border-dashed border-border py-4 text-center text-xs text-muted-foreground">No lines yet</p>
                ) : (
                  <div className="space-y-2">
                    {draft.lines.map((l, i) => {
                      const zoneOpts = draft.warehouse_id
                        ? allZones.filter((z) => z.warehouse_id === draft.warehouse_id)
                        : allZones;
                      return (
                        <div key={i} className="space-y-1.5 rounded-md border border-border p-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <SmartSelect
                                options={variantOptions}
                                value={l.variant_id || null}
                                onChange={(v) => updateLine(i, { variant_id: v ?? "" })}
                                placeholder="Pick a product"
                              />
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeLine(i)} disabled={isReceived}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Qty</Label>
                              <Input type="number" min={0} step="any" value={l.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} disabled={isReceived} />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Unit price ₹</Label>
                              <Input type="number" min={0} step="any" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} disabled={isReceived} />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Reason</Label>
                              <SmartSelect
                                options={REASONS.map((r) => ({ value: r, label: r.replace(/_/g, " ") }))}
                                value={l.reason}
                                onChange={(v) => v && updateLine(i, { reason: v as GRReason })}
                                disabled={isReceived}
                                size="sm"
                                searchPlaceholder="Search reason…"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Condition</Label>
                              <SmartSelect
                                options={CONDITIONS.map((c) => ({ value: c, label: c }))}
                                value={l.condition}
                                onChange={(v) => v && updateLine(i, { condition: v as GRCondition })}
                                disabled={isReceived}
                                size="sm"
                                searchPlaceholder="Search condition…"
                              />
                            </div>
                          </div>
                          {l.condition === "resaleable" && (
                            <div>
                              <Label className="text-[10px] uppercase text-muted-foreground">Restock zone</Label>
                              <SmartSelect
                                options={[{ value: "unset", label: "— Pick zone —" }, ...zoneOpts.map((z) => ({ value: z.value, label: z.label }))]}
                                value={l.restock_zone_id || "unset"}
                                onChange={(v) => updateLine(i, { restock_zone_id: !v || v === "unset" ? "" : v })}
                                disabled={isReceived}
                                size="sm"
                                placeholder="Pick zone"
                                searchPlaceholder="Search zone…"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`grid ${showFinance ? "grid-cols-2" : "grid-cols-1"} gap-3 border-t border-border pt-3`}>
                {showFinance && (
                  <div>
                    <Label>Refund amount ₹</Label>
                    <Input type="number" min={0} step="any" value={draft.refund_amount || refundAuto}
                      onChange={(e) => patchDraft({ refund_amount: Number(e.target.value) })} disabled={isReceived} />
                    <p className="mt-1 text-[11px] text-muted-foreground">Auto from line totals · ₹{refundAuto.toLocaleString("en-IN")}</p>
                  </div>
                )}
                <div><Label>Notes</Label><Textarea rows={2} value={draft.notes} onChange={(e) => patchDraft({ notes: e.target.value })} disabled={isReceived} /></div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving || busyTransition !== null}>
                  {saving ? "Saving…" : isReceived ? "Save changes" : "Save draft"}
                </Button>
              </div>

              {draft.id && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Inventory impact per line</Label>
                    <span className="text-[11px] text-muted-foreground">
                      {draft.status === "received" ? "Posted to inventory" : "Will post on receive"}
                    </span>
                  </div>
                  <GRLineImpacts goodsReturnId={draft.id} />
                  <div className="flex items-center justify-between">
                    <Label>Posted stock movements</Label>
                    <span className="text-[11px] text-muted-foreground">Audit trail · linked to this GR</span>
                  </div>
                  <GRMovementsTimeline goodsReturnId={draft.id} />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goods return?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.gr_number} · this will not reverse stock movements that were already posted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}