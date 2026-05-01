import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";

export interface MouldingFieldsValue {
  machine_id: string | null;
  mould_id: string | null;
  material_variant_id: string | null;
  variant_id: string | null;
  start_shot_count: string;
  end_shot_count: string;
  cavity_count: string;
  cavity_weight_grams: string;
  qty_produced_actual: string;
  qty_rejected: string;
  material_used_grams: string;
}

export const mouldingDefaults: MouldingFieldsValue = {
  machine_id: null, mould_id: null, material_variant_id: null, variant_id: null,
  start_shot_count: "0", end_shot_count: "0", cavity_count: "1", cavity_weight_grams: "0",
  qty_produced_actual: "0", qty_rejected: "0", material_used_grams: "0",
};

export function MouldingFields({ value, onChange }: { value: MouldingFieldsValue; onChange: (v: MouldingFieldsValue) => void }) {
  const [machines, setMachines] = useState<{ id: string; name: string; code: string }[]>([]);
  const [moulds, setMoulds] = useState<{ id: string; name: string; code: string; cavity_count: number }[]>([]);
  const [variants, setVariants] = useState<{ id: string; sku: string; variant_name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [m, md, v] = await Promise.all([
        supabase.from("machines").select("id, name, code").eq("is_active", true).order("name"),
        supabase.from("moulds").select("id, name, code, cavity_count").eq("is_active", true).order("name"),
        supabase.from("product_variants").select("id, sku, variant_name").eq("is_active", true).order("variant_name").limit(500),
      ]);
      setMachines(m.data ?? []);
      setMoulds(md.data ?? []);
      setVariants(v.data ?? []);
    })();
  }, []);

  const set = <K extends keyof MouldingFieldsValue>(k: K, val: MouldingFieldsValue[K]) => onChange({ ...value, [k]: val });

  const calc = useMemo(() => {
    const start = Number(value.start_shot_count) || 0;
    const end = Number(value.end_shot_count) || 0;
    const cav = Number(value.cavity_count) || 1;
    const cavW = Number(value.cavity_weight_grams) || 0;
    const actual = Number(value.qty_produced_actual) || 0;
    const used = Number(value.material_used_grams) || 0;
    const shots = Math.max(0, end - start);
    const expected = shots * cav;
    const eff = expected > 0 ? Math.round((actual / expected) * 1000) / 10 : 0;
    const expectedMat = cavW * actual;
    const waste = Math.max(0, used - expectedMat);
    return { shots, expected, eff, waste };
  }, [value]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Machine</Label>
          <SmartSelect options={machines.map((m) => ({ value: m.id, label: m.name, hint: m.code }))} value={value.machine_id} onChange={(v) => set("machine_id", v)} placeholder="Select machine" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mould</Label>
          <SmartSelect options={moulds.map((m) => ({ value: m.id, label: m.name, hint: `${m.code} · ${m.cavity_count} cav` }))} value={value.mould_id}
            onChange={(v) => {
              const found = moulds.find((x) => x.id === v);
              onChange({ ...value, mould_id: v, cavity_count: found ? String(found.cavity_count) : value.cavity_count });
            }} placeholder="Select mould" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Material</Label>
          <SmartSelect options={variants.map((v) => ({ value: v.id, label: v.variant_name, hint: v.sku }))} value={value.material_variant_id} onChange={(v) => set("material_variant_id", v)} placeholder="Material batch" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Output product</Label>
          <SmartSelect options={variants.map((v) => ({ value: v.id, label: v.variant_name, hint: v.sku }))} value={value.variant_id} onChange={(v) => set("variant_id", v)} placeholder="Variant produced" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Start shot</Label>
          <Input inputMode="numeric" type="number" value={value.start_shot_count} onChange={(e) => set("start_shot_count", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last shot</Label>
          <Input inputMode="numeric" type="number" value={value.end_shot_count} onChange={(e) => set("end_shot_count", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cavity count</Label>
          <Input inputMode="numeric" type="number" value={value.cavity_count} onChange={(e) => set("cavity_count", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cavity weight (g)</Label>
          <Input inputMode="decimal" type="number" step="0.01" value={value.cavity_weight_grams} onChange={(e) => set("cavity_weight_grams", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Actual qty</Label>
          <Input inputMode="decimal" type="number" value={value.qty_produced_actual} onChange={(e) => set("qty_produced_actual", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rejected</Label>
          <Input inputMode="decimal" type="number" value={value.qty_rejected} onChange={(e) => set("qty_rejected", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Material used (g)</Label>
        <Input inputMode="decimal" type="number" step="0.01" value={value.material_used_grams} onChange={(e) => set("material_used_grams", e.target.value)} />
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-3 grid grid-cols-2 gap-3 text-sm">
        <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Shot count</div><div className="font-mono">{calc.shots}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected output</div><div className="font-mono">{calc.expected}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Efficiency</div><div className="font-mono">{calc.eff}%</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Material waste (g)</div><div className="font-mono">{calc.waste.toFixed(2)}</div></div>
      </div>
    </div>
  );
}