import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";

export interface PackingFieldsValue {
  variant_id: string | null;
  packaging_variant_id: string | null;
  qty_packed: string;
  cartons_used: string;
  labels_used: string;
  output_uom: string;
}

export const packingDefaults: PackingFieldsValue = {
  variant_id: null, packaging_variant_id: null,
  qty_packed: "", cartons_used: "0", labels_used: "0", output_uom: "pcs",
};

interface VOpt { id: string; sku: string; variant_name: string; product_name: string; kind: string }

export function PackingFields({ value, onChange }: { value: PackingFieldsValue; onChange: (v: PackingFieldsValue) => void }) {
  const [variants, setVariants] = useState<VOpt[]>([]);
  const [packs, setPacks] = useState<VOpt[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, sku, variant_name, variant_kind, product:products(name)")
        .eq("is_active", true).order("variant_name").limit(500);
      const all = ((data ?? []) as unknown as Array<{ id: string; sku: string; variant_name: string; variant_kind: string; product: { name: string } | null }>).map((v) => ({
        id: v.id, sku: v.sku, variant_name: v.variant_name, kind: v.variant_kind, product_name: v.product?.name ?? "—",
      }));
      // Variations are the packaged versions; fall back to all
      const packaged = all.filter((v) => v.kind === "variation");
      setVariants(packaged.length ? packaged : all);
      setPacks(all.filter((v) => v.kind === "component" || v.kind === "base"));
    })();
  }, []);

  const set = <K extends keyof PackingFieldsValue>(k: K, v: PackingFieldsValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Packed product · variant</Label>
        <SmartSelect
          options={variants.map((v) => ({ value: v.id, label: `${v.product_name} · ${v.variant_name}`, hint: v.sku }))}
          value={value.variant_id} onChange={(v) => set("variant_id", v)}
          placeholder="Search products to pack…"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Packaging material</Label>
        <SmartSelect
          options={packs.map((v) => ({ value: v.id, label: `${v.product_name} · ${v.variant_name}`, hint: v.sku }))}
          value={value.packaging_variant_id} onChange={(v) => set("packaging_variant_id", v)}
          placeholder="Carton / box / pouch…"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty packed</Label>
          <Input inputMode="decimal" type="number" step="0.001" value={value.qty_packed} onChange={(e) => set("qty_packed", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cartons</Label>
          <Input inputMode="decimal" type="number" value={value.cartons_used} onChange={(e) => set("cartons_used", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Labels</Label>
          <Input inputMode="decimal" type="number" value={value.labels_used} onChange={(e) => set("labels_used", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Output UOM</Label>
        <Input value={value.output_uom} onChange={(e) => set("output_uom", e.target.value)} placeholder="pcs / cartons" />
      </div>
    </div>
  );
}