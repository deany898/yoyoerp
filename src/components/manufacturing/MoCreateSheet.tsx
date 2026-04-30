import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { nextMoNumber } from "@/hooks/useMfgData";

interface VariantOpt { id: string; sku: string; variant_name: string; product_name: string }
interface WhOpt { id: string; name: string; code: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pre-filled values when "Create from DO" is used. */
  prefill?: { variant_id?: string; qty?: number; source_do_id?: string };
  onCreated: (moId: string) => void;
}

export function MoCreateSheet({ open, onOpenChange, prefill, onCreated }: Props) {
  const [variants, setVariants] = useState<VariantOpt[]>([]);
  const [warehouses, setWarehouses] = useState<WhOpt[]>([]);
  const [moNumber, setMoNumber] = useState("");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [plannedStart, setPlannedStart] = useState<string>("");
  const [plannedEnd, setPlannedEnd] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [vRes, wRes, n] = await Promise.all([
        supabase.from("product_variants")
          .select("id, sku, variant_name, product:products(name)")
          .eq("is_active", true)
          .order("variant_name"),
        supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
        nextMoNumber(),
      ]);
      setVariants(((vRes.data ?? []) as unknown as Array<{ id: string; sku: string; variant_name: string; product: { name: string } | null }>).map((v) => ({
        id: v.id,
        sku: v.sku,
        variant_name: v.variant_name,
        product_name: v.product?.name ?? "—",
      })));
      setWarehouses(wRes.data ?? []);
      if (n) setMoNumber(n);
      if (prefill?.variant_id) setVariantId(prefill.variant_id);
      if (prefill?.qty) setQty(String(prefill.qty));
    })();
  }, [open, prefill?.variant_id, prefill?.qty]);

  const reset = () => {
    setVariantId(null); setQty(""); setWarehouseId(null);
    setPlannedStart(""); setPlannedEnd(""); setNotes("");
  };

  const save = async () => {
    if (!variantId) { notify.warning("Select a product variant"); return; }
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) { notify.warning("Enter a planned quantity"); return; }
    setSaving(true);
    let number = moNumber;
    if (!number) {
      const n = await nextMoNumber();
      if (!n) { setSaving(false); return; }
      number = n;
    }
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("manufacturing_orders")
      .insert({
        mo_number: number,
        variant_id: variantId,
        qty_planned: qtyNum,
        warehouse_id: warehouseId,
        source_do_id: prefill?.source_do_id ?? null,
        planned_start: plannedStart || null,
        planned_end: plannedEnd || null,
        notes: notes || null,
        created_by: user.user?.id ?? null,
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error || !data) {
      notify.error("Could not create production log", { description: error?.message });
      return;
    }
    notify.success(`Production log ${number} created`);
    onCreated(data.id);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New production log</SheetTitle>
          <SheetDescription>Plan production for a finished or semi-finished variant.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Log number</Label>
            <Input value={moNumber} onChange={(e) => setMoNumber(e.target.value)} placeholder="Auto-generated" className="font-mono" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Product variant *</Label>
            <SmartSelect
              options={variants.map((v) => ({ value: v.id, label: `${v.product_name} · ${v.variant_name}`, hint: v.sku }))}
              value={variantId}
              onChange={(v) => setVariantId(v)}
              placeholder="Search products…"
              searchPlaceholder="Type SKU or name…"
              emptyText="No active variants"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planned quantity *</Label>
            <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Warehouse</Label>
            <SmartSelect
              options={warehouses.map((w) => ({ value: w.id, label: w.name, hint: w.code }))}
              value={warehouseId}
              onChange={(v) => setWarehouseId(v)}
              placeholder="Select warehouse"
              emptyText="No warehouses"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planned start</Label>
              <Input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planned end</Label>
              <Input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional production notes" />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Creating…" : "Create order"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}