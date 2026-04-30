import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, TrendingUp, Calendar, Wallet, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { categoryLabel, formatINR } from "./vendor-constants";
import { VendorPaymentDialog } from "./VendorPaymentDialog";
import type { SupplierRow } from "@/hooks/useErpData";

type PaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  mode: string;
  reference: string | null;
  notes: string | null;
};

type Scorecard = {
  delivered_pos: number;
  on_time_pos: number;
  on_time_pct: number | null;
  avg_lead_time_actual: number;
  lifetime_spend: number;
  billed_total: number;
  paid_total: number;
  outstanding_balance: number;
  planned_lead_time: number;
  last_received_date: string | null;
};

interface Props {
  supplier: SupplierRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canManage: boolean;
  onChanged?: () => void;
}

export function Vendor360Sheet({ supplier, open, onOpenChange, canManage, onChanged }: Props) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [score, setScore] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!supplier) return;
    setLoading(true);
    const [{ data: pays }, { data: sc }] = await Promise.all([
      supabase.from("vendor_payments").select("id,payment_date,amount,mode,reference,notes")
        .eq("supplier_id", supplier.id).order("payment_date", { ascending: false }),
      supabase.from("vendor_scorecard").select("*").eq("supplier_id", supplier.id).maybeSingle(),
    ]);
    setPayments((pays ?? []) as PaymentRow[]);
    setScore((sc ?? null) as Scorecard | null);
    setLoading(false);
  }, [supplier]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  async function deletePayment(id: string) {
    const { error } = await supabase.from("vendor_payments").delete().eq("id", id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Payment removed");
    await refresh();
    onChanged?.();
  }

  if (!supplier) return null;
  const cat = supplier.category;
  const credit = supplier.credit_days ?? 0;
  const opening = Number(supplier.opening_balance ?? 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle>{supplier.name}</SheetTitle>
              {cat && <Badge variant="secondary">{categoryLabel(cat)}</Badge>}
            </div>
            <SheetDescription className="font-mono text-xs">
              {supplier.code} · lead {supplier.lead_time_days}d · credit {credit}d
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-3">
              <Field label="Contact" value={supplier.contact_name || "—"} />
              <Field label="Phone" value={supplier.phone || "—"} />
              <Field label="Email" value={supplier.email || "—"} />
              <Field label="GST" value={supplier.gst_number || "—"} />
              <Field label="Address" value={[supplier.address, supplier.city, supplier.state].filter(Boolean).join(", ") || "—"} />
              <Field label="Payment terms" value={supplier.payment_terms || "—"} />
              <Field label="Opening balance" value={formatINR(opening)} mono />
              {supplier.notes && <Field label="Notes" value={supplier.notes} />}
            </TabsContent>

            <TabsContent value="payments" className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {payments.length} payment{payments.length === 1 ? "" : "s"}
                </div>
                {canManage && (
                  <Button size="sm" onClick={() => setPayOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> Record payment
                  </Button>
                )}
              </div>
              {loading ? (
                <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Loading…</div>
              ) : payments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.payment_date}</TableCell>
                          <TableCell className="text-xs uppercase">{p.mode.replace("_", " ")}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{p.reference || "—"}</TableCell>
                          <TableCell className="text-right font-mono">{formatINR(p.amount)}</TableCell>
                          <TableCell>
                            {canManage && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                onClick={() => deletePayment(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="scorecard" className="mt-4 space-y-3">
              {!score ? (
                <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                  No PO history yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Stat icon={TrendingUp} label="On-time delivery"
                    value={score.on_time_pct == null ? "—" : `${score.on_time_pct}%`}
                    sub={`${score.on_time_pos}/${score.delivered_pos} POs`} />
                  <Stat icon={Calendar} label="Lead time (actual)"
                    value={`${score.avg_lead_time_actual || 0}d`}
                    sub={`vs planned ${score.planned_lead_time}d`} />
                  <Stat icon={Wallet} label="Lifetime spend"
                    value={formatINR(score.lifetime_spend)} sub="Across all POs" mono />
                  <Stat icon={Truck} label="Outstanding"
                    value={formatINR(score.outstanding_balance)}
                    sub={`Billed ${formatINR(score.billed_total)} · paid ${formatINR(score.paid_total)}`}
                    mono highlight={score.outstanding_balance > 0} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <VendorPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        supplierId={supplier.id}
        supplierName={supplier.name}
        onSaved={() => { refresh(); onChanged?.(); }}
      />
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm text-foreground text-right ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, mono, highlight }: {
  icon: typeof TrendingUp; label: string; value: string; sub?: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-orange-200 bg-orange-50" : "border-border bg-white"}`}>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-lg font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}