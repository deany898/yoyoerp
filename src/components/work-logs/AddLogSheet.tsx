import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { nextWorkLogNumber, WORK_TYPE_LABEL, type WorkLogType, type ShiftCode } from "@/hooks/useWorkLogs";
import { ProductionFields, productionDefaults, type ProductionFieldsValue } from "./dynamic/ProductionFields";
import { PackingFields, packingDefaults, type PackingFieldsValue } from "./dynamic/PackingFields";
import { DispatchFields, dispatchDefaults, type DispatchFieldsValue } from "./dynamic/DispatchFields";
import { DeliveryFields, deliveryDefaults, type DeliveryFieldsValue } from "./dynamic/DeliveryFields";
import { HelperFields, helperDefaults, type HelperFieldsValue } from "./dynamic/HelperFields";
import { MouldingFields, mouldingDefaults, type MouldingFieldsValue } from "./dynamic/MouldingFields";

const TYPES: WorkLogType[] = ["production", "packing", "dispatch", "delivery", "helper", "moulding"];
const SHIFTS: { value: ShiftCode; label: string }[] = [
  { value: "general", label: "General" }, { value: "day", label: "Day" }, { value: "night", label: "Night" }, { value: "split", label: "Split" },
];

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AddLogSheet({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: (id: string) => void }) {
  const [workers, setWorkers] = useState<{ id: string; name: string; code: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [stations, setStations] = useState<{ id: string; name: string; code: string }[]>([]);

  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workType, setWorkType] = useState<WorkLogType>("production");
  const [shift, setShift] = useState<ShiftCode>("general");
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [stationId, setStationId] = useState<string | null>(null);
  const [logIn, setLogIn] = useState<string>(nowLocalInput());
  const [logOut, setLogOut] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [prod, setProd] = useState<ProductionFieldsValue>(productionDefaults);
  const [pack, setPack] = useState<PackingFieldsValue>(packingDefaults);
  const [disp, setDisp] = useState<DispatchFieldsValue>(dispatchDefaults);
  const [del, setDel] = useState<DeliveryFieldsValue>(deliveryDefaults);
  const [help, setHelp] = useState<HelperFieldsValue>(helperDefaults);
  const [mou, setMou] = useState<MouldingFieldsValue>(mouldingDefaults);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [w, wh, st] = await Promise.all([
        supabase.from("workers").select("id, name, code").eq("is_active", true).order("name"),
        supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
        supabase.from("stations").select("id, name, code").order("name"),
      ]);
      setWorkers(w.data ?? []);
      setWarehouses(wh.data ?? []);
      setStations(st.data ?? []);
    })();
  }, [open]);

  const reset = () => {
    setWorkerId(null); setWorkType("production"); setShift("general"); setWarehouseId(null); setStationId(null);
    setLogIn(nowLocalInput()); setLogOut(""); setNotes("");
    setProd(productionDefaults); setPack(packingDefaults); setDisp(dispatchDefaults); setDel(deliveryDefaults); setHelp(helperDefaults); setMou(mouldingDefaults);
  };

  const save = async () => {
    if (!workerId) { notify.warning("Select a worker"); return; }
    setSaving(true);
    const number = await nextWorkLogNumber();
    if (!number) { setSaving(false); return; }
    const { data: u } = await supabase.auth.getUser();
    const status = logOut ? "closed" : "open";

    const { data: header, error } = await supabase
      .from("work_logs")
      .insert({
        wl_number: number, worker_id: workerId, work_type: workType, shift,
        warehouse_id: warehouseId, station_id: stationId,
        log_in_at: new Date(logIn).toISOString(),
        log_out_at: logOut ? new Date(logOut).toISOString() : null,
        status, notes: notes || null,
        supervisor_id: u.user?.id ?? null, created_by: u.user?.id ?? null,
      })
      .select("id").maybeSingle();

    if (error || !header) { setSaving(false); notify.error("Could not create log", { description: error?.message }); return; }

    // detail row
    let detailErr: string | null = null;
    const wlId = header.id;
    try {
      if (workType === "production") {
        const { error: e } = await supabase.from("wl_production_details").insert({
          work_log_id: wlId, stage_kind: prod.stage_kind, product_id: prod.product_id, variant_id: prod.variant_id,
          qty_received: Number(prod.qty_received) || 0, qty_produced: Number(prod.qty_produced) || 0,
          qty_rejected: Number(prod.qty_rejected) || 0, uom: prod.uom || "pcs",
        }); if (e) detailErr = e.message;
      } else if (workType === "packing") {
        const { error: e } = await supabase.from("wl_packing_details").insert({
          work_log_id: wlId, variant_id: pack.variant_id, packaging_variant_id: pack.packaging_variant_id,
          qty_packed: Number(pack.qty_packed) || 0, cartons_used: Number(pack.cartons_used) || 0,
          labels_used: Number(pack.labels_used) || 0, output_uom: pack.output_uom || "pcs",
        }); if (e) detailErr = e.message;
      } else if (workType === "dispatch") {
        const { error: e } = await supabase.from("wl_dispatch_details").insert({
          work_log_id: wlId, dispatch_zone: disp.dispatch_zone, dispatch_order_id: disp.dispatch_order_id,
          orders_handled: Number(disp.orders_handled) || 0, cartons: Number(disp.cartons) || 0,
          lr_number: disp.lr_number || null, qty_dispatched: Number(disp.qty_dispatched) || 0,
        }); if (e) detailErr = e.message;
      } else if (workType === "delivery") {
        const { error: e } = await supabase.from("wl_delivery_details").insert({
          work_log_id: wlId, delivery_role: del.delivery_role, vehicle_number: del.vehicle_number || null,
          route: del.route || null, delivery_batch: del.delivery_batch || null,
          qty_delivered: Number(del.qty_delivered) || 0, fuel_notes: del.fuel_notes || null,
        }); if (e) detailErr = e.message;
      } else if (workType === "helper") {
        const { error: e } = await supabase.from("wl_helper_details").insert({
          work_log_id: wlId, helper_zone: help.helper_zone, support_area: help.support_area || null,
          qty_handled: Number(help.qty_handled) || 0,
        }); if (e) detailErr = e.message;
      } else if (workType === "moulding") {
        const { error: e } = await supabase.from("wl_moulding_details").insert({
          work_log_id: wlId, machine_id: mou.machine_id, mould_id: mou.mould_id,
          material_variant_id: mou.material_variant_id, variant_id: mou.variant_id,
          start_shot_count: Number(mou.start_shot_count) || 0, end_shot_count: Number(mou.end_shot_count) || 0,
          cavity_count: Number(mou.cavity_count) || 1, cavity_weight_grams: Number(mou.cavity_weight_grams) || 0,
          qty_produced_actual: Number(mou.qty_produced_actual) || 0, qty_rejected: Number(mou.qty_rejected) || 0,
          material_used_grams: Number(mou.material_used_grams) || 0,
        }); if (e) detailErr = e.message;
      }
    } catch (err) { detailErr = (err as Error).message; }

    setSaving(false);
    if (detailErr) { notify.error("Log saved but details failed", { description: detailErr }); }
    else notify.success(`Work log ${number} created`);
    onCreated?.(wlId); reset(); onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add work log</SheetTitle>
          <SheetDescription>Log worker activity · attendance and payroll auto-update on close.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Worker *</Label>
            <SmartSelect options={workers.map((w) => ({ value: w.id, label: w.name, hint: w.code }))} value={workerId} onChange={setWorkerId} placeholder="Select worker" emptyText="No active workers" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Work type *</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setWorkType(t)}
                  className={`min-h-[48px] rounded-xl border px-2 py-2 text-xs font-semibold transition ${workType === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted/40"}`}>
                  {WORK_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Shift</Label>
              <SmartSelect options={SHIFTS} value={shift} onChange={(v) => setShift((v as ShiftCode) ?? "general")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Warehouse</Label>
              <SmartSelect options={warehouses.map((w) => ({ value: w.id, label: w.name, hint: w.code }))} value={warehouseId} onChange={setWarehouseId} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Station</Label>
            <SmartSelect options={stations.map((s) => ({ value: s.id, label: s.name, hint: s.code }))} value={stationId} onChange={setStationId} placeholder="Optional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Log in</Label>
              <Input type="datetime-local" value={logIn} onChange={(e) => setLogIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Log out</Label>
              <Input type="datetime-local" value={logOut} onChange={(e) => setLogOut(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{WORK_TYPE_LABEL[workType]} details</div>
            {workType === "production" && <ProductionFields value={prod} onChange={setProd} />}
            {workType === "packing" && <PackingFields value={pack} onChange={setPack} />}
            {workType === "dispatch" && <DispatchFields value={disp} onChange={setDisp} />}
            {workType === "delivery" && <DeliveryFields value={del} onChange={setDel} />}
            {workType === "helper" && <HelperFields value={help} onChange={setHelp} />}
            {workType === "moulding" && <MouldingFields value={mou} onChange={setMou} />}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row justify-end gap-2 sticky bottom-0 bg-background pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="min-h-[44px]">{saving ? "Saving…" : (logOut ? "Save & close" : "Save log")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}