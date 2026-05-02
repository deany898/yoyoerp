import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierPricesTab } from "./SupplierPricesTab";
import { CostEnginePanel } from "./CostEnginePanel";
import { VariantsEditor } from "./VariantsEditor";
import type { VariantDraft } from "./VariantCard";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CategoryRow, ProductWithVariants } from "@/hooks/useErpData";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FLAGS } from "@/lib/feature-flags";

const TYPE_LABEL: Record<string, string> = {
  raw_material: "Raw",
  packaging: "Packaging",
  wip: "Semi-finished",
  finished_good: "Finished good",
};

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  category_id: z.string().nullable(),
  uom: z.string().trim().min(1).max(16),
  hsn_code: z.string().max(20).optional(),
});

function newVariantKey() {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function emptyVariant(): VariantDraft {
  return {
    key: newVariantKey(),
    variant_name: "Regular",
    is_active: true,
    standard_price: 0,
    dealer_price: 0,
    reorder_point: 0,
    safety_stock: 0,
    reorder_qty: 0,
    slabs: [],
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
  product?: ProductWithVariants | null;
  onSaved: () => void;
}

export function ProductFormSheet({ open, onOpenChange, categories, product, onSaved }: Props) {
  const isEdit = !!product;
  const firstVariant = product?.variants?.[0];
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();
  const { isEnabled } = useAppConfig();
  const showCosting = isEnabled(FLAGS.products.costing, true);
  const showSupplierPrices = isEnabled(FLAGS.suppliers.quoteHistory, true) && isEnabled(FLAGS.modules.suppliers, true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: null as string | null,
    uom: "pcs",
    hsn_code: "",
    manual_purchase_cost: "" as string,
  });
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [activeVariantKey, setActiveVariantKey] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setForm({
      name: product?.name ?? "",
      description: product?.description ?? "",
      category_id: product?.category_id ?? null,
      uom: product?.uom ?? "pcs",
      hsn_code: product?.hsn_code ?? "",
      manual_purchase_cost:
        firstVariant?.manual_purchase_cost == null
          ? ""
          : String(firstVariant.manual_purchase_cost),
    });

    // Hydrate variants + their pricing tiers in one go
    void (async () => {
      if (!product) {
        const v = emptyVariant();
        setVariants([v]);
        setActiveVariantKey(v.key);
        return;
      }
      const variantIds = product.variants.map((v) => v.id);
      let tiers: Array<{ id: string; variant_id: string; tier_name: string; min_qty: number; price: number }> = [];
      if (variantIds.length > 0) {
        const { data } = await supabase
          .from("product_pricing_tiers")
          .select("id,variant_id,tier_name,min_qty,price")
          .in("variant_id", variantIds);
        tiers = (data ?? []) as typeof tiers;
      }
      const drafts: VariantDraft[] = product.variants.map((v) => {
        const mine = tiers.filter((t) => t.variant_id === v.id);
        const std = mine.find((t) => t.tier_name === "standard");
        const dlr = mine.find((t) => t.tier_name === "dealer");
        const slabs = mine
          .filter((t) => t.tier_name !== "standard" && t.tier_name !== "dealer")
          .sort((a, b) => Number(a.min_qty) - Number(b.min_qty))
          .map((t) => ({
            key: t.id,
            id: t.id,
            label: t.tier_name,
            min_qty: Number(t.min_qty || 1),
            price: Number(t.price || 0),
          }));
        const note = (v.attributes && typeof v.attributes === "object" && !Array.isArray(v.attributes)
          ? (v.attributes as { note?: string }).note
          : undefined) as string | undefined;
        return {
          key: v.id,
          id: v.id,
          variant_name: v.variant_name || "Default",
          is_active: v.is_active,
          note,
          standard_price: Number(std?.price ?? 0),
          dealer_price: Number(dlr?.price ?? 0),
          reorder_point: Number(v.reorder_point ?? 0),
          safety_stock: Number(v.safety_stock ?? 0),
          reorder_qty: Number(v.reorder_qty ?? 0),
          slabs,
        };
      });
      const final = drafts.length > 0 ? drafts : [emptyVariant()];
      setVariants(final);
      setActiveVariantKey(final[0].key);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const activeVariant = variants.find((v) => v.key === activeVariantKey) ?? variants[0];

  const submit = async () => {
    const parsed = productSchema.safeParse(form);
    if (!parsed.success) {
      toast.error("Check the form", { description: parsed.error.issues[0]?.message });
      return;
    }
    // Variant validation
    if (variants.length === 0) {
      toast.error("Add at least one variant");
      return;
    }
    const badVariant = variants.find((v) => !v.variant_name.trim());
    if (badVariant) {
      toast.error("Every variant needs a name");
      return;
    }
    for (const v of variants) {
      for (const s of v.slabs) {
        if (!s.label.trim()) { toast.error(`Slab in "${v.variant_name}" needs a label`); return; }
        if (!Number.isFinite(s.min_qty) || s.min_qty < 1) { toast.error(`Slab "${s.label}" needs a min qty ≥ 1`); return; }
      }
    }

    setSubmitting(true);
    try {
      let productId = product?.id;
      const productPayload = {
        name: parsed.data.name,
        description: parsed.data.description || null,
        category_id: parsed.data.category_id,
        uom: parsed.data.uom,
        hsn_code: parsed.data.hsn_code || null,
      };

      if (isEdit && productId) {
        const { error } = await supabase.from("products").update(productPayload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          // `code` is auto-generated by DB trigger; cast to satisfy the typed insert.
          .insert(productPayload as unknown as { code: string; name: string })
          .select("id,code")
          .single();
        if (error) throw error;
        productId = data.id;
      }

      // Persist variants + tiers
      const { data: prodRow } = await supabase.from("products").select("code").eq("id", productId!).single();
      const productCode = prodRow?.code ?? "P";
      let slabCount = 0;

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const variantPayload = {
          product_id: productId!,
          variant_name: v.variant_name.trim(),
          is_active: v.is_active,
          reorder_point: v.reorder_point,
          safety_stock: v.safety_stock,
          reorder_qty: v.reorder_qty,
          attributes: v.note ? { note: v.note } : {},
          // Manual cost only applies to the first variant for backward-compat with the cost engine.
          manual_purchase_cost:
            i === 0 && form.manual_purchase_cost !== "" ? Number(form.manual_purchase_cost) : null,
          manual_cost_updated_at:
            i === 0 && form.manual_purchase_cost !== "" ? new Date().toISOString() : null,
        };

        let variantId = v.id;
        if (variantId) {
          const { error } = await supabase.from("product_variants").update(variantPayload).eq("id", variantId);
          if (error) throw error;
        } else {
          // SKU is required by schema but never shown to the user — auto-generate from product code.
          const sku = `${productCode}-${(i + 1).toString().padStart(2, "0")}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
          const { data, error } = await supabase
            .from("product_variants")
            .insert({ ...variantPayload, sku })
            .select("id")
            .single();
          if (error) throw error;
          variantId = data.id;
        }

        // Replace tier rows for this variant: standard, dealer, and all bulk slabs.
        const { error: delErr } = await supabase
          .from("product_pricing_tiers")
          .delete()
          .eq("variant_id", variantId!);
        if (delErr) throw delErr;

        const tierRows: Array<{ variant_id: string; tier_name: string; min_qty: number; price: number }> = [];
        if (v.standard_price > 0) tierRows.push({ variant_id: variantId!, tier_name: "standard", min_qty: 1, price: v.standard_price });
        if (v.dealer_price > 0)   tierRows.push({ variant_id: variantId!, tier_name: "dealer",   min_qty: 1, price: v.dealer_price });
        for (const s of v.slabs) {
          tierRows.push({ variant_id: variantId!, tier_name: s.label.trim(), min_qty: s.min_qty, price: s.price });
        }
        slabCount += v.slabs.length;
        if (tierRows.length > 0) {
          const { error: insErr } = await supabase.from("product_pricing_tiers").insert(tierRows);
          if (insErr) throw insErr;
        }
      }

      // Remove variants the user deleted from the form
      if (isEdit && product) {
        const keptIds = new Set(variants.map((v) => v.id).filter(Boolean) as string[]);
        const removedIds = product.variants.filter((v) => !keptIds.has(v.id)).map((v) => v.id);
        for (const rid of removedIds) {
          const { error } = await supabase.from("product_variants").delete().eq("id", rid);
          if (error) {
            toast.error("Could not remove a variant", { description: error.message });
            // Continue — caller will see the partial save.
          }
        }
      }

      toast.success(isEdit ? "Product saved" : "Product created", {
        description: `${variants.length} variant${variants.length === 1 ? "" : "s"} · ${slabCount} bulk slab${slabCount === 1 ? "" : "s"}`,
      });
      void qc.invalidateQueries({ queryKey: ["erp", "products"] });
      void qc.invalidateQueries({ queryKey: ["erp", "tiers"] });
      void qc.invalidateQueries({ queryKey: ["erp", "tier-rows"] });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit product" : "New product"}</SheetTitle>
          <SheetDescription>
            One product · many variants · per-variant standard price, dealer price, and bulk-buy slabs.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className={`grid w-full ${showSupplierPrices ? (showCosting ? "grid-cols-3" : "grid-cols-2") : (showCosting ? "grid-cols-2" : "grid-cols-1")}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {showSupplierPrices && (
              <TabsTrigger value="prices" disabled={!activeVariant?.id}>
                Supplier prices
              </TabsTrigger>
            )}
            {showCosting && (
              <TabsTrigger value="cost" disabled={!activeVariant?.id}>
                Cost engine
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="overview" className="mt-5 space-y-5">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex h-9 w-fit items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm">
              <Badge variant="outline" className="font-normal">
                {TYPE_LABEL[product?.product_type ?? "raw_material"] ?? "Auto"}
              </Badge>
              <span className="text-xs text-muted-foreground">Auto from BOM</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Cooler Blade" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id ?? "__none"} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "__none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none">None</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>UoM</Label>
              <Input value={form.uom} onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>HSN code</Label>
              <Input value={form.hsn_code} onChange={(e) => setForm((f) => ({ ...f, hsn_code: e.target.value }))} />
            </div>
          </div>

          <Separator />
          <VariantsEditor variants={variants} onChange={setVariants} />

          {showCosting && (
            <>
              <Separator />
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Purchase price
              </div>
              <div className="space-y-1.5">
                <Label>Manual purchase cost (₹) · overrides supplier quote · applies to first variant</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Leave blank to use latest supplier quote"
                  value={form.manual_purchase_cost}
                  onChange={(e) => setForm((f) => ({ ...f, manual_purchase_cost: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  When set, this value is used as the effective purchase cost instead of the latest supplier quote.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Create product"}</Button>
          </div>
          </TabsContent>
          {showSupplierPrices && (
            <TabsContent value="prices" className="mt-5">
              <VariantPicker variants={variants} value={activeVariantKey} onChange={setActiveVariantKey} />
              <SupplierPricesTab variantId={activeVariant?.id ?? ""} uom={form.uom} />
            </TabsContent>
          )}
          {showCosting && (
            <TabsContent value="cost" className="mt-5">
              <VariantPicker variants={variants} value={activeVariantKey} onChange={setActiveVariantKey} />
              <CostEnginePanel variantId={activeVariant?.id ?? ""} productUom={form.uom} />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/** Small picker shown above per-variant tabs (Supplier prices / Cost engine). */
function VariantPicker({
  variants,
  value,
  onChange,
}: {
  variants: VariantDraft[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (variants.length <= 1) return null;
  return (
    <div className="mb-3 flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Variant</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          {variants.map((v) => (
            <SelectItem key={v.key} value={v.key} disabled={!v.id}>
              {v.variant_name || "Untitled"}{!v.id ? " · save first" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}