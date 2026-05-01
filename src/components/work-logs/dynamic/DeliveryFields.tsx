import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import type { Database } from "@/integrations/supabase/types";

type Role = Database["public"]["Enums"]["delivery_role"];

export interface DeliveryFieldsValue {
  delivery_role: Role;
  vehicle_number: string;
  route: string;
  delivery_batch: string;
  qty_delivered: string;
  fuel_notes: string;
}

export const deliveryDefaults: DeliveryFieldsValue = {
  delivery_role: "driver", vehicle_number: "", route: "", delivery_batch: "", qty_delivered: "0", fuel_notes: "",
};

export function DeliveryFields({ value, onChange }: { value: DeliveryFieldsValue; onChange: (v: DeliveryFieldsValue) => void }) {
  const set = <K extends keyof DeliveryFieldsValue>(k: K, v: DeliveryFieldsValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</Label>
        <SmartSelect options={[{ value: "driver", label: "Driver" }, { value: "helper", label: "Helper" }]}
          value={value.delivery_role} onChange={(v) => set("delivery_role", (v as Role) ?? "driver")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vehicle</Label>
          <Input value={value.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value)} placeholder="GJ01-XXXX" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Batch</Label>
          <Input value={value.delivery_batch} onChange={(e) => set("delivery_batch", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Route</Label>
        <Input value={value.route} onChange={(e) => set("route", e.target.value)} placeholder="Surat → Vapi → Mumbai" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty delivered</Label>
        <Input inputMode="decimal" type="number" value={value.qty_delivered} onChange={(e) => set("qty_delivered", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fuel / logistics notes</Label>
        <Input value={value.fuel_notes} onChange={(e) => set("fuel_notes", e.target.value)} />
      </div>
    </div>
  );
}