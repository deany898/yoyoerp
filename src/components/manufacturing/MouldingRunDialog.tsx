import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { postMouldingRun } from "@/lib/mfg-posting";
import { useLanguage } from "@/contexts/LanguageContext";

interface Opt { id: string; label: string; hint?: string; cavity?: number }
interface ZoneOpt { id: string; name: string; code: string; kind: string; warehouse_id: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moId: string;
  baseVariantId: string;
  baseVariantLabel: string;
  warehouseId?: string | null;
  onPosted: () => void;
}

export function MouldingRunDialog({ open, onOpenChange, moId, baseVariantId, baseVariantLabel, warehouseId, onPosted }: Props) {
  const { t } = useLanguage();
  const [machines, setMachines] = useState<Opt[]>([]);
  const [moulds, setMoulds] = useState<Opt[]>([]);
  const [workers, setWorkers] = useState<Opt[]>([]);
  const [materials, setMaterials] = useState<Opt[]>([]);
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [compat, setCompat] = useState<Record<string, string[]>>({});

  const [machineId, setMachineId] = useState<string | null>(null);
  const [mouldId, setMouldId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [materialQty, setMaterialQty] = useState("");
  const [shotsGood, setShotsGood] = useState("");
  const [shotsScrap, setShotsScrap] = useState("0");
  const [rawZone, setRawZone] = useState<string | null>(null);
  const [fgZone, setFgZone] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMachineId(null); setMouldId(null); setWorkerId(null); setMaterialId(null);
    setMaterialQty(""); setShotsGood(""); setShotsScrap("0"); setNotes("");
    (async () => {
      const [mRes, mldRes, wRes, matRes, zRes, cRes] = await Promise.all([
        supabase.from("machines").select("id, code, name").eq("is_active", true).order("name"),
        supabase.from("moulds").select("id, code, name, cavity_count").eq("is_active", true).order("name"),
        supabase.from("workers").select("id, code, name").eq("is_active", true).order("name"),
        supabase.from("product_variants")
          .select("id, sku, variant_name, product:products!inner(name, product_type)")
          .eq("is_active", true)
          .eq("product.product_type", "raw_material")
          .order("variant_name"),
        supabase.from("warehouse_zones").select("id, name, code, kind, warehouse_id").eq("is_active", true).order("name"),
        supabase.from("mould_machine_compat").select("mould_id, machine_id"),
      ]);
      setMachines((mRes.data ?? []).map((m) => ({ id: m.id, label: m.name, hint: m.code })));
      setMoulds((mldRes.data ?? []).map((m) => ({ id: m.id, label: m.name, hint: `${m.code} · ${m.cavity_count} cav`, cavity: m.cavity_count })));
      setWorkers((wRes.data ?? []).map((w) => ({ id: w.id, label: w.name, hint: w.code })));
      const mats = (matRes.data ?? []) as unknown as Array<{ id: string; sku: string; variant_name: string; product: { name: string } | null }>;
      setMaterials(mats.map((v) => ({ id: v.id, label: `${v.product?.name ?? ""} · ${v.variant_name}`, hint: v.sku })));
      setZones(zRes.data ?? []);
      const map: Record<string, string[]> = {};
      (cRes.data ?? []).forEach((c: { mould_id: string; machine_id: string }) => {
        map[c.machine_id] = map[c.machine_id] ?? [];
        map[c.machine_id].push(c.mould_id);
      });
      setCompat(map);
      const raw = (zRes.data ?? []).find((z) => z.kind === "raw_material" && (!warehouseId || z.warehouse_id === warehouseId));
      const fg = (zRes.data ?? []).find((z) => z.kind === "finished_good" && (!warehouseId || z.warehouse_id === warehouseId));
      if (raw) setRawZone(raw.id);
      if (fg) setFgZone(fg.id);
    })();
  }, [open, warehouseId]);

  const filteredMoulds = useMemo(() => {
    if (!machineId) return moulds;
    const allowed = compat[machineId];
    if (!allowed || allowed.length === 0) return moulds;
    return moulds.filter((m) => allowed.includes(m.id));
  }, [moulds, machineId, compat]);

  const cavity = moulds.find((m) => m.id === mouldId)?.cavity ?? 0;
  const units = (Number(shotsGood) || 0) * cavity;

  const submit = async () => {
    if (!machineId || !mouldId) { notify.warning("Pick machine + mould"); return; }
    if (!materialId) { notify.warning("Pick raw material"); return; }
    const sg = Number(shotsGood);
    if (!sg || sg <= 0) { notify.warning("Enter good shots"); return; }
    if (!rawZone || !fgZone) { notify.warning("Set raw + FG zones"); return; }
    setSaving(true);
    try {
      await postMouldingRun({
        mo_id: moId,
        base_variant_id: baseVariantId,
        machine_id: machineId,
        mould_id: mouldId,
        worker_id: workerId,
        cavity_used: cavity,
        shots_good: sg,
        shots_scrap: Number(shotsScrap) || 0,
        material_variant_id: materialId,
        material_qty: Number(materialQty) || 0,
        raw_zone_id: rawZone,
        fg_zone_id: fgZone,
        notes: notes || null,
      });
      notify.success(`Moulding run posted · ${units} units to FG`);
      onPosted();
      onOpenChange(false);
    } catch (e) {
      notify.error("Could not post moulding run", { description: (e as Error).message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("mfg_moulding_run")}</DialogTitle>
          <DialogDescription><span className="font-medium">{baseVariantLabel}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("mfg_machine")} *`}>
              <SmartSelect options={machines.map((m) => ({ value: m.id, label: m.label, hint: m.hint }))} value={machineId} onChange={setMachineId} placeholder={t("mfg_select_machine")} />
            </Field>
            <Field label={`${t("mfg_mould")} *`}>
              <SmartSelect options={filteredMoulds.map((m) => ({ value: m.id, label: m.label, hint: m.hint }))} value={mouldId} onChange={setMouldId} placeholder={machineId && filteredMoulds.length === 0 ? t("mfg_no_compatible_moulds") : t("mfg_select_mould")} />
            </Field>
          </div>
          <Field label={t("mfg_worker")}>
            <SmartSelect options={workers.map((w) => ({ value: w.id, label: w.label, hint: w.hint }))} value={workerId} onChange={setWorkerId} placeholder={t("mfg_optional")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("mfg_raw_material")} *`}>
              <SmartSelect options={materials.map((m) => ({ value: m.id, label: m.label, hint: m.hint }))} value={materialId} onChange={setMaterialId} placeholder={t("mfg_select_material")} />
            </Field>
            <Field label={t("mfg_material_qty")}>
              <Input type="number" inputMode="decimal" step="0.001" value={materialQty} onChange={(e) => setMaterialQty(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={`${t("mfg_good_shots")} *`}>
              <Input type="number" inputMode="numeric" value={shotsGood} onChange={(e) => setShotsGood(e.target.value)} />
            </Field>
            <Field label={t("mfg_scrap_shots")}>
              <Input type="number" inputMode="numeric" value={shotsScrap} onChange={(e) => setShotsScrap(e.target.value)} />
            </Field>
            <Field label={t("mfg_cavity")}>
              <Input value={cavity || "—"} readOnly className="bg-muted/30 font-mono" />
            </Field>
          </div>
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
            {t("mfg_units_produced")} · <span className="font-mono font-semibold">{units.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("mfg_from_raw_zone")} *`}>
              <SmartSelect options={zones.filter((z) => z.kind === "raw_material").map((z) => ({ value: z.id, label: z.name, hint: z.code }))} value={rawZone} onChange={setRawZone} placeholder={t("mfg_pick_raw_zone")} />
            </Field>
            <Field label={`${t("mfg_to_fg_zone")} *`}>
              <SmartSelect options={zones.filter((z) => z.kind === "finished_good" || z.kind === "wip").map((z) => ({ value: z.id, label: z.name, hint: `${z.code} · ${z.kind}` }))} value={fgZone} onChange={setFgZone} placeholder={t("mfg_pick_fg_zone")} />
            </Field>
          </div>
          <Field label={t("mfg_notes")}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("btn_cancel")}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t("mfg_posting") : t("mfg_post_run")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}