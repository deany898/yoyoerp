import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Zone = Database["public"]["Enums"]["dispatch_zone"];

export interface DispatchFieldsValue {
  dispatch_zone: Zone;
  dispatch_order_id: string | null;
  orders_handled: string;
  cartons: string;
  lr_number: string;
  qty_dispatched: string;
}

export const dispatchDefaults: DispatchFieldsValue = {
  dispatch_zone: "warehouse", dispatch_order_id: null,
  orders_handled: "0", cartons: "0", lr_number: "", qty_dispatched: "0",
};

const ZONES: { value: Zone; label: string }[] = [
  { value: "sr1", label: "SR1" }, { value: "sr2", label: "SR2" }, { value: "warehouse", label: "Warehouse dispatch" },
];

export function DispatchFields({ value, onChange }: { value: DispatchFieldsValue; onChange: (v: DispatchFieldsValue) => void }) {
  const [orders, setOrders] = useState<{ id: string; do_number: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("dispatch_orders")
        .select("id, do_number")
        .order("created_at", { ascending: false }).limit(50);
      setOrders(data ?? []);
    })();
  }, []);
  const set = <K extends keyof DispatchFieldsValue>(k: K, v: DispatchFieldsValue[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dispatch zone</Label>
        <SmartSelect options={ZONES.map((z) => ({ value: z.value, label: z.label }))} value={value.dispatch_zone} onChange={(v) => set("dispatch_zone", (v as Zone) ?? "warehouse")} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Linked DO (optional)</Label>
        <SmartSelect options={orders.map((o) => ({ value: o.id, label: o.do_number }))} value={value.dispatch_order_id} onChange={(v) => set("dispatch_order_id", v)} placeholder="Select dispatch order" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Orders</Label>
          <Input inputMode="numeric" type="number" value={value.orders_handled} onChange={(e) => set("orders_handled", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cartons</Label>
          <Input inputMode="decimal" type="number" value={value.cartons} onChange={(e) => set("cartons", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Qty</Label>
          <Input inputMode="decimal" type="number" value={value.qty_dispatched} onChange={(e) => set("qty_dispatched", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">LR number</Label>
        <Input value={value.lr_number} onChange={(e) => set("lr_number", e.target.value)} placeholder="LR / waybill" />
      </div>
    </div>
  );
}