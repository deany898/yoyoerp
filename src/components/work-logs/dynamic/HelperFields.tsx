import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import type { Database } from "@/integrations/supabase/types";

type Zone = Database["public"]["Enums"]["helper_zone"];

export interface HelperFieldsValue {
  helper_zone: Zone;
  support_area: string;
  qty_handled: string;
}

export const helperDefaults: HelperFieldsValue = { helper_zone: "warehouse", support_area: "", qty_handled: "0" };

const ZONES: { value: Zone; label: string }[] = [
  { value: "sr1_upper", label: "SR1 Upper" },
  { value: "sr1_ground", label: "SR1 Ground" },
  { value: "sr2", label: "SR2" },
  { value: "warehouse", label: "Warehouse" },
  { value: "loading", label: "Loading" },
  { value: "packing_support", label: "Packing support" },
];

export function HelperFields({ value, onChange }: { value: HelperFieldsValue; onChange: (v: HelperFieldsValue) => void }) {
  const set = <K extends keyof HelperFieldsValue>(k: K, v: HelperFieldsValue[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Zone</Label>
        <SmartSelect options={ZONES.map((z) => ({ value: z.value, label: z.label }))} value={value.helper_zone} onChange={(v) => set("helper_zone", (v as Zone) ?? "warehouse")} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Support area</Label>
        <Input value={value.support_area} onChange={(e) => set("support_area", e.target.value)} placeholder="e.g. line 2 packing" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty handled</Label>
        <Input inputMode="decimal" type="number" value={value.qty_handled} onChange={(e) => set("qty_handled", e.target.value)} />
      </div>
    </div>
  );
}