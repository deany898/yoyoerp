import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Check, X, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUoms } from "@/hooks/useErpData";
import { pricePerBase, formatBasePrice } from "@/lib/uom";
import { VendorAddQuoteForm } from "./VendorAddQuoteForm";
import { ProductFormSheet } from "@/components/products/ProductFormSheet";
import { useCategories } from "@/hooks/useErpData";

interface QuoteRow {
  id: string;
  variant_id: string;
  unit_price: number;
  freight_cost: number;
  transport_cost: number;
  pickup_cost: number;
  landing_other: number;
  moq: number;
  lead_time_days: number;
  is_active: boolean;
  variant?: {
    sku: string;
    variant_name: string;
    product?: { id: string; name: string; uom: string } | null;
  } | null;
}

interface Props {
  supplierId: string;
  canManage: boolean;
}

export function VendorQuotesTab({ supplierId, canManage }: Props) {
  const { uoms } = useUoms();
  const { categories } = useCategories();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("supplier_product_quotes")
      .select("id, variant_id, unit_price, freight_cost, transport_cost, pickup_cost, landing_other, moq, lead_time_days, is_active, variant:product_variants(sku, variant_name, product:products(id, name, uom))")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load quotes", { description: error.message });
    setRows((data ?? []) as unknown as QuoteRow[]);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => { void load(); }, [load]);

  const existingIds = useMemo(() => new Set(rows.map((r) => r.variant_id)), [rows]);

  async function toggleActive(q: QuoteRow) {
    const { error } = await supabase
      .from("supplier_product_quotes")
      .update({ is_active: !q.is_active })
      .eq("id", q.id);
    if (error) return toast.error("Update failed");
    void load();
  }

  async function remove(q: QuoteRow) {
    if (!confirm("Delete this quote?")) return;
    const { error } = await supabase.from("supplier_product_quotes").delete().eq("id", q.id);
    if (error) return toast.error("Delete failed");
    toast.success("Deleted");
    void load();
  }

  async function saveEdit(q: QuoteRow) {
    const next = Number(editPrice);
    if (!Number.isFinite(next) || next < 0) return toast.error("Invalid price");
    if (next === Number(q.unit_price)) { setEditingId(null); return; }
    const { error } = await supabase
      .from("supplier_product_quotes")
      .update({ unit_price: next })
      .eq("id", q.id);
    if (error) return toast.error("Update failed", { description: error.message });
    toast.success("Price updated · history logged");
    setEditingId(null); setEditPrice("");
    void load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Quotes you've recorded for this supplier · base price auto-derives from UOM.
        </p>
        {canManage && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add quote
          </Button>
        )}
      </div>

      {adding && (
        <VendorAddQuoteForm
          supplierId={supplierId}
          existingVariantIds={existingIds}
          onSaved={() => { setAdding(false); void load(); }}
          onCancel={() => setAdding(false)}
          onCreateProduct={() => setProductSheetOpen(true)}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          No quotes yet. Add the first one to remember this vendor's pricing.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((q) => {
            const uomCode = q.variant?.product?.uom ?? "";
            const landed =
              Number(q.unit_price) + Number(q.freight_cost) +
              Number(q.transport_cost) + Number(q.pickup_cost) +
              Number(q.landing_other);
            const base = pricePerBase(Number(q.unit_price), uomCode, uoms);
            return (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{q.variant?.product?.name ?? "Unknown product"}</p>
                    {q.is_active
                      ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-[10px]">Active</Badge>
                      : <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {q.variant?.sku} · {q.variant?.variant_name} · MOQ {q.moq} · {q.lead_time_days}d
                  </p>
                </div>
                <div className="text-right">
                  {editingId === q.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" step="0.01" autoFocus
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="h-8 w-24 text-right font-mono text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveEdit(q);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(q)} title="Save">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} title="Cancel">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="font-mono text-sm font-semibold">
                        ₹{landed.toFixed(2)}<span className="text-muted-foreground">/{uomCode}</span>
                      </p>
                      {base ? (
                        <p className="text-[11px] text-emerald-700">
                          ≈ ₹{formatBasePrice(base.price)}/{base.base}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          base ₹{Number(q.unit_price).toFixed(2)} + frt ₹{Number(q.freight_cost).toFixed(2)}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    {editingId !== q.id && (
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => { setEditingId(q.id); setEditPrice(String(q.unit_price)); }}
                        title="Edit price">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(q)} title={q.is_active ? "Deactivate" : "Activate"}>
                      {q.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(q)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ProductFormSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        categories={categories}
        onSaved={() => { setProductSheetOpen(false); void load(); }}
      />
    </div>
  );
}