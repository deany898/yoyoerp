import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierPricesTab } from "./SupplierPricesTab";
import { toast } from "sonner";
import type { CategoryRow, ProductWithVariants } from "@/hooks/useErpData";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FLAGS } from "@/lib/feature-flags";

const PRODUCT_TYPES = [
  { value: "raw_material", label: "Raw material" },
  { value: "packaging", label: "Packaging" },
  { value: "wip", label: "Work in progress" },
  { value: "finished_good", label: "Finished good" },
] as const;

const schema = z.object({
  code: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(200),
  description: z.string().max(2000).optional(),
  product_type: z.enum(["raw_material", "packaging", "wip", "finished_good"]),
  category_id: z.string().nullable(),
  uom: z.string().trim().min(1).max(16),
  hsn_code: z.string().max(20).optional(),
  sku: z.string().trim().min(2).max(64),
  variant_name: z.string().trim().min(1).max(120),
  reorder_point: z.coerce.number().min(0),
  safety_stock: z.coerce.number().min(0),
  reorder_qty: z.coerce.number().min(0),
  manual_purchase_cost: z.coerce.number().min(0).optional(),
});

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
  const { isEnabled } = useAppConfig();
  const showCosting = isEnabled(FLAGS.products.costing, true);
  const showSupplierPrices = isEnabled(FLAGS.suppliers.quoteHistory, true) && isEnabled(FLAGS.modules.suppliers, true);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    product_type: "finished_good" as (typeof PRODUCT_TYPES)[number]["value"],
    category_id: null as string | null,
    uom: "pcs",
    hsn_code: "",
    sku: "",
    variant_name: "Default",
    reorder_point: 0,
    safety_stock: 0,
    reorder_qty: 0,
    manual_purchase_cost: "" as string,
  });

  useEffect(() => {
    if (open) {
      setForm({
        code: product?.code ?? "",
        name: product?.name ?? "",
        description: product?.description ?? "",
        product_type: (product?.product_type ?? "finished_good") as typeof form.product_type,
        category_id: product?.category_id ?? null,
        uom: product?.uom ?? "pcs",
        hsn_code: product?.hsn_code ?? "",
        sku: firstVariant?.sku ?? "",
        variant_name: firstVariant?.variant_name ?? "Default",
        reorder_point: Number(firstVariant?.reorder_point ?? 0),
        safety_stock: Number(firstVariant?.safety_stock ?? 0),
        reorder_qty: Number(firstVariant?.reorder_qty ?? 0),
        manual_purchase_cost:
          firstVariant?.manual_purchase_cost == null
            ? ""
            : String(firstVariant.manual_purchase_cost),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Check the form", { description: parsed.error.issues[0]?.message });
      return;
    }
    setSubmitting(true);
    try {
      let productId = product?.id;
      const productPayload = {
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description || null,
        product_type: parsed.data.product_type,
        category_id: parsed.data.category_id,
        uom: parsed.data.uom,
        hsn_code: parsed.data.hsn_code || null,
      };

      if (isEdit && productId) {
        const { error } = await supabase.from("products").update(productPayload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(productPayload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      const variantPayload = {
        product_id: productId!,
        sku: parsed.data.sku,
        variant_name: parsed.data.variant_name,
        reorder_point: parsed.data.reorder_point,
        safety_stock: parsed.data.safety_stock,
        reorder_qty: parsed.data.reorder_qty,
        manual_purchase_cost:
          form.manual_purchase_cost === "" ? null : Number(form.manual_purchase_cost),
        manual_cost_updated_at:
          form.manual_purchase_cost === "" ? null : new Date().toISOString(),
      };
      if (isEdit && firstVariant) {
        const { error } = await supabase.from("product_variants").update(variantPayload).eq("id", firstVariant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_variants").insert(variantPayload);
        if (error) throw error;
      }

      toast.success(isEdit ? "Product updated" : "Product created");
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit product" : "New product"}</SheetTitle>
          <SheetDescription>
            Create a product with its first variant (SKU). Add more variants from the product detail page.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className={`grid w-full ${showSupplierPrices ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {showSupplierPrices && (
              <TabsTrigger value="prices" disabled={!firstVariant}>
                Supplier prices
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="overview" className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Product code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="YOY-1001" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.product_type} onValueChange={(v) => setForm((f) => ({ ...f, product_type: v as typeof f.product_type }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Industrial yo-yo · classic" />
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
                <SelectContent>
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
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First variant (SKU)</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="YOY-1001-DEFAULT" />
            </div>
            <div className="space-y-1.5">
              <Label>Variant name</Label>
              <Input value={form.variant_name} onChange={(e) => setForm((f) => ({ ...f, variant_name: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Reorder point</Label>
              <Input type="number" min={0} value={form.reorder_point} onChange={(e) => setForm((f) => ({ ...f, reorder_point: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Safety stock</Label>
              <Input type="number" min={0} value={form.safety_stock} onChange={(e) => setForm((f) => ({ ...f, safety_stock: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder qty</Label>
              <Input type="number" min={0} value={form.reorder_qty} onChange={(e) => setForm((f) => ({ ...f, reorder_qty: Number(e.target.value) }))} />
            </div>
          </div>

          {showCosting && (
            <>
              <Separator />
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Purchase price
              </div>
              <div className="space-y-1.5">
                <Label>Manual purchase cost (₹) · overrides supplier quote</Label>
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
              <SupplierPricesTab variantId={firstVariant?.id ?? ""} />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}