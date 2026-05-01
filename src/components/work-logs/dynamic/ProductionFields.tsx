import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StageKind = Database["public"]["Enums"]["stage_kind"];

const STAGES: { value: StageKind; label: string }[] = [
  { value: "material_prep", label: "Material prep" },
  { value: "assembly", label: "Assembly" },
  { value: "circuit", label: "Circuit" },
  { value: "printing", label: "Printing" },
  { value: "qc", label: "QC" },
  { value: "packing_prep", label: "Packing prep" },
  { value: "semi_finished", label: "Semi-finished" },
  { value: "final_assembly", label: "Final assembly" },
  { value: "moulding", label: "Moulding" },
  { value: "packing", label: "Packing" },
  { value: "other", label: "Other" },
];

export interface ProductionFieldsValue {
  stage_kind: StageKind;
  product_id: string | null;
  variant_id: string | null;
  qty_received: string;
  qty_produced: string;
  qty_rejected: string;
  uom: string;
}

export const productionDefaults: ProductionFieldsValue = {
  stage_kind: "assembly",
  product_id: null,
  variant_id: null,
  qty_received: "",
  qty_produced: "",
  qty_rejected: "0",
  uom: "pcs",
};

interface VariantOpt { id: string; sku: string; variant_name: string; product_id: string; product_name: string }

export function ProductionFields({ value, onChange }: { value: ProductionFieldsValue; onChange: (v: ProductionFieldsValue) => void }) {
  const [variants, setVariants] = useState<VariantOpt[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, sku, variant_name, product_id, product:products(name)")
        .eq("is_active", true)
        .order("variant_name")
        .limit(500);
      setVariants(((data ?? []) as unknown as Array<{ id: string; sku: string; variant_name: string; product_id: string; product: { name: string } | null }>).map((v) => ({
        id: v.id, sku: v.sku, variant_name: v.variant_name, product_id: v.product_id, product_name: v.product?.name ?? "—",
      })));
    })();
  }, []);

  const set = <K extends keyof ProductionFieldsValue>(k: K, v: ProductionFieldsValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stage</Label>
        <SmartSelect
          options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
          value={value.stage_kind}
          onChange={(v) => set("stage_kind", (v as StageKind) ?? "assembly")}
          placeholder="Select stage"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Product / variant</Label>
        <SmartSelect
          options={variants.map((v) => ({ value: v.id, label: `${v.product_name} · ${v.variant_name}`, hint: v.sku }))}
          value={value.variant_id}
          onChange={(v) => {
            const found = variants.find((x) => x.id === v);
            onChange({ ...value, variant_id: v, product_id: found?.product_id ?? null });
          }}
          placeholder="Search products…"
          emptyText="No active variants"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty received</Label>
          <Input inputMode="decimal" type="number" step="0.001" value={value.qty_received} onChange={(e) => set("qty_received", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Produced</Label>
          <Input inputMode="decimal" type="number" step="0.001" value={value.qty_produced} onChange={(e) => set("qty_produced", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rejected</Label>
          <Input inputMode="decimal" type="number" step="0.001" value={value.qty_rejected} onChange={(e) => set("qty_rejected", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">UOM</Label>
        <Input value={value.uom} onChange={(e) => set("uom", e.target.value)} placeholder="pcs" />
      </div>
    </div>
  );
}