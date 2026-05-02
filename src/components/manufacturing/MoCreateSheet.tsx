import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { nextMoNumber } from "@/hooks/useMfgData";
import { AutoCodeField } from "@/components/shared/AutoCodeField";
import { useLanguage } from "@/contexts/LanguageContext";

interface VariantOpt { id: string; sku: string; variant_name: string; product_name: string }
interface WhOpt { id: string; name: string; code: string }
interface SupOpt { id: string; display_name: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pre-filled values when "Create from DO" is used. */
  prefill?: { variant_id?: string; qty?: number; source_do_id?: string };
  onCreated: (moId: string) => void;
}

export function MoCreateSheet({ open, onOpenChange, prefill, onCreated }: Props) {
  const { t } = useLanguage();
  const [variants, setVariants] = useState<VariantOpt[]>([]);
  const [warehouses, setWarehouses] = useState<WhOpt[]>([]);
  const [supervisors, setSupervisors] = useState<SupOpt[]>([]);
  const [moNumber, setMoNumber] = useState("");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [plannedStart, setPlannedStart] = useState<string>("");
  const [plannedEnd, setPlannedEnd] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [vRes, wRes, rolesRes, n] = await Promise.all([
        supabase.from("product_variants")
          .select("id, sku, variant_name, product:products(name)")
          .eq("is_active", true)
          .order("variant_name"),
        supabase.from("warehouses").select("id, name, code").eq("is_active", true).order("name"),
        supabase.from("user_roles").select("user_id").eq("role", "supervisor"),
        nextMoNumber(),
      ]);
      setVariants(((vRes.data ?? []) as unknown as Array<{ id: string; sku: string; variant_name: string; product: { name: string } | null }>).map((v) => ({
        id: v.id,
        sku: v.sku,
        variant_name: v.variant_name,
        product_name: v.product?.name ?? "—",
      })));
      setWarehouses(wRes.data ?? []);
      const supUserIds = Array.from(new Set((rolesRes.data ?? []).map((r) => r.user_id)));
      if (supUserIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("user_id", supUserIds)
          .order("display_name");
        setSupervisors((profs ?? []).map((p) => ({ id: p.id, display_name: p.display_name ?? "Unnamed" })));
      } else {
        setSupervisors([]);
      }
      if (n) setMoNumber(n);
      if (prefill?.variant_id) setVariantId(prefill.variant_id);
      if (prefill?.qty) setQty(String(prefill.qty));
    })();
  }, [open, prefill?.variant_id, prefill?.qty]);

  const reset = () => {
    setVariantId(null); setQty(""); setWarehouseId(null);
    setSupervisorId(null);
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
        supervisor_id: supervisorId,
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
          <SheetTitle>{t("mfg_new_log_title")}</SheetTitle>
          <SheetDescription>{t("mfg_new_log_desc")}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <AutoCodeField label={t("mfg_log_number")} pendingCode={moNumber} />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_product_variant")} *</Label>
            <SmartSelect
              options={variants.map((v) => ({ value: v.id, label: `${v.product_name} · ${v.variant_name}`, hint: v.sku }))}
              value={variantId}
              onChange={(v) => setVariantId(v)}
              placeholder={t("mfg_search_products")}
              searchPlaceholder={t("mfg_type_sku_or_name")}
              emptyText={t("mfg_no_active_variants")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_planned_qty")} *</Label>
            <Input type="number" inputMode="numeric" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_warehouse")}</Label>
            <SmartSelect
              options={warehouses.map((w) => ({ value: w.id, label: w.name, hint: w.code }))}
              value={warehouseId}
              onChange={(v) => setWarehouseId(v)}
              placeholder={t("mfg_select_warehouse")}
              emptyText={t("mfg_no_warehouses")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_assign_supervisor")}</Label>
            <SmartSelect
              options={supervisors.map((s) => ({ value: s.id, label: s.display_name }))}
              value={supervisorId}
              onChange={(v) => setSupervisorId(v)}
              placeholder={t("mfg_unassigned")}
              emptyText={t("mfg_no_supervisors")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_planned_start")}</Label>
              <Input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_planned_end")}</Label>
              <Input type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("mfg_notes_placeholder")} />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("btn_cancel")}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t("mfg_creating") : t("mfg_create_order")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}