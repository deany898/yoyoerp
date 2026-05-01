import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductVariantPicker, type PickedVariant } from "@/components/shared/ProductVariantPicker";
import { useProducts, useUoms } from "@/hooks/useErpData";
import { pricePerBase, formatBasePrice } from "@/lib/uom";

interface Props {
  supplierId: string;
  existingVariantIds: Set<string>;
  onSaved: () => void;
  onCancel: () => void;
  onCreateProduct: () => void;
}

/**
 * Inline form to add a supplier quote against any product/variant.
 * Live preview shows the derived price-per-base-unit using the UOM table.
 */
export function VendorAddQuoteForm({
  supplierId, existingVariantIds, onSaved, onCancel, onCreateProduct,
}: Props) {
  const { products } = useProducts();
  const { uoms } = useUoms();
  const [picked, setPicked] = useState<PickedVariant | null>(null);
  const [unitPrice, setUnitPrice] = useState("");
  const [freight, setFreight] = useState("0");
  const [moq, setMoq] = useState("1");
  const [leadTime, setLeadTime] = useState("7");
  const [saving, setSaving] = useState(false);

  const baseInfo = useMemo(() => {
    const n = Number(unitPrice);
    if (!picked || !Number.isFinite(n) || n <= 0) return null;
    return pricePerBase(n, picked.uom, uoms);
  }, [picked, unitPrice, uoms]);

  async function handleSave() {
    if (!picked) { toast.error("Pick a product first"); return; }
    const price = Number(unitPrice);
    if (!Number.isFinite(price) || price <= 0) { toast.error("Enter a valid unit price"); return; }
    setSaving(true);
    const { error } = await supabase.from("supplier_product_quotes").insert({
      supplier_id: supplierId,
      variant_id: picked.variantId,
      unit_price: price,
      freight_cost: Number(freight) || 0,
      moq: Number(moq) || 1,
      lead_time_days: Number(leadTime) || 7,
      is_active: true,
      is_approved: true,
    });
    setSaving(false);
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success("Quote saved");
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Product</Label>
        <ProductVariantPicker
          products={products}
          value={picked}
          onChange={setPicked}
          excludeVariantIds={existingVariantIds}
          onCreateNew={onCreateProduct}
          placeholder="Search product, SKU, or code…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Unit price (₹{picked ? ` per ${picked.uom}` : ""})</Label>
          <Input
            type="number" step="0.01" inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Freight (₹)</Label>
          <Input
            type="number" step="0.01"
            value={freight}
            onChange={(e) => setFreight(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">MOQ</Label>
          <Input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Lead time (days)</Label>
          <Input type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
        </div>
      </div>

      {baseInfo && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
          Base price · <span className="font-mono font-semibold">
            ₹{formatBasePrice(baseInfo.price)}/{baseInfo.base}
          </span> <span className="text-emerald-700/80">
            (from ₹{Number(unitPrice).toFixed(2)}/{baseInfo.from.code})
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !picked}>
          {saving ? "Saving…" : "Save quote"}
        </Button>
      </div>
    </div>
  );
}