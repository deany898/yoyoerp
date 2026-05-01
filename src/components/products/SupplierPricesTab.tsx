import { useEffect, useState } from "react";
import { Plus, Check, X, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { useSuppliers } from "@/hooks/useErpData";

interface QuoteRow {
  id: string;
  supplier_id: string;
  unit_price: number;
  freight_cost: number;
  transport_cost: number;
  pickup_cost: number;
  landing_other: number;
  moq: number;
  lead_time_days: number;
  is_active: boolean;
  is_approved: boolean;
  valid_from: string;
  valid_until: string | null;
  supplier?: { name: string; code: string } | null;
}

interface Props {
  variantId: string;
}

export function SupplierPricesTab({ variantId }: Props) {
  const { suppliers } = useSuppliers();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    unit_price: "",
    freight_cost: "0",
    moq: "1",
    lead_time_days: "7",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("supplier_product_quotes")
      .select("*, supplier:suppliers(name, code)")
      .eq("variant_id", variantId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load supplier prices");
    setRows((data ?? []) as QuoteRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (variantId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId]);

  const addQuote = async () => {
    if (!form.supplier_id || !form.unit_price) {
      toast.error("Pick a supplier and enter a price");
      return;
    }
    const { error } = await supabase.from("supplier_product_quotes").insert({
      variant_id: variantId,
      supplier_id: form.supplier_id,
      unit_price: Number(form.unit_price),
      freight_cost: Number(form.freight_cost || 0),
      moq: Number(form.moq || 1),
      lead_time_days: Number(form.lead_time_days || 7),
      is_active: true,
      is_approved: true,
    });
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success("Supplier price saved");
    setForm({ supplier_id: "", unit_price: "", freight_cost: "0", moq: "1", lead_time_days: "7" });
    setAdding(false);
    void load();
  };

  const toggleActive = async (q: QuoteRow) => {
    const { error } = await supabase
      .from("supplier_product_quotes")
      .update({ is_active: !q.is_active })
      .eq("id", q.id);
    if (error) return toast.error("Update failed");
    void load();
  };

  const remove = async (q: QuoteRow) => {
    if (!confirm("Delete this supplier price?")) return;
    const { error } = await supabase.from("supplier_product_quotes").delete().eq("id", q.id);
    if (error) return toast.error("Delete failed");
    toast.success("Deleted");
    void load();
  };

  if (!variantId) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Save the product first to manage supplier prices.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Active quotes feed the effective purchase cost (unless a manual override is set).
        </p>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add quote
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Supplier</Label>
              <SmartSelect
                options={suppliers.map((s) => ({ value: s.id, label: `${s.name} · ${s.code}` }))}
                value={form.supplier_id}
                onChange={(v) => setForm((f) => ({ ...f, supplier_id: v ?? "" }))}
                searchPlaceholder="Search supplier…"
                size="sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit price (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Freight (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.freight_cost}
                onChange={(e) => setForm((f) => ({ ...f, freight_cost: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">MOQ</Label>
              <Input
                type="number"
                value={form.moq}
                onChange={(e) => setForm((f) => ({ ...f, moq: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lead time (days)</Label>
              <Input
                type="number"
                value={form.lead_time_days}
                onChange={(e) => setForm((f) => ({ ...f, lead_time_days: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={addQuote}>Save quote</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No supplier prices yet. Add a quote to remember what each vendor charges.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((q) => {
            const landed =
              Number(q.unit_price) +
              Number(q.freight_cost) +
              Number(q.transport_cost) +
              Number(q.pickup_cost) +
              Number(q.landing_other);
            return (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{q.supplier?.name ?? "Unknown supplier"}</p>
                    {q.is_active ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {q.supplier?.code} · MOQ {q.moq} · {q.lead_time_days}d
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">₹{landed.toFixed(2)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    base ₹{Number(q.unit_price).toFixed(2)} + frt ₹{Number(q.freight_cost).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => toggleActive(q)} title={q.is_active ? "Deactivate" : "Activate"}>
                    {q.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(q)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}