import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { postPackingRun } from "@/lib/mfg-posting";
import { useLanguage } from "@/contexts/LanguageContext";

interface VariationOpt { id: string; sku: string; variant_name: string; units_per_pack: number }
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

export function PackingRunDialog({ open, onOpenChange, moId, baseVariantId, baseVariantLabel, warehouseId, onPosted }: Props) {
  const { t } = useLanguage();
  const [variations, setVariations] = useState<VariationOpt[]>([]);
  const [workers, setWorkers] = useState<Array<{ id: string; label: string; hint: string }>>([]);
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [variationId, setVariationId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [packs, setPacks] = useState("");
  const [baseZone, setBaseZone] = useState<string | null>(null);
  const [fgZone, setFgZone] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPacks(""); setNotes(""); setVariationId(null); setWorkerId(null);
    (async () => {
      const [vRes, wRes, zRes] = await Promise.all([
        supabase.from("product_variants")
          .select("id, sku, variant_name, units_per_pack")
          .eq("base_variant_id", baseVariantId)
          .eq("is_active", true)
          .order("variant_name"),
        supabase.from("workers").select("id, code, name").eq("is_active", true).order("name"),
        supabase.from("warehouse_zones").select("id, name, code, kind, warehouse_id").eq("is_active", true).order("name"),
      ]);
      setVariations(vRes.data ?? []);
      setWorkers((wRes.data ?? []).map((w) => ({ id: w.id, label: w.name, hint: w.code })));
      setZones(zRes.data ?? []);
      const fg = (zRes.data ?? []).find((z) => z.kind === "finished_good" && (!warehouseId || z.warehouse_id === warehouseId));
      if (fg) { setBaseZone(fg.id); setFgZone(fg.id); }
    })();
  }, [open, baseVariantId, warehouseId]);

  const variation = useMemo(() => variations.find((v) => v.id === variationId), [variations, variationId]);
  const upp = Number(variation?.units_per_pack ?? 0);
  const baseUnits = (Number(packs) || 0) * upp;

  const submit = async () => {
    if (!variationId || !variation) { notify.warning("Select a variation"); return; }
    const p = Number(packs);
    if (!p || p <= 0) { notify.warning("Enter packs to make"); return; }
    if (!baseZone || !fgZone) { notify.warning("Set base + FG zones"); return; }
    setSaving(true);
    try {
      await postPackingRun({
        mo_id: moId,
        base_variant_id: baseVariantId,
        variation_variant_id: variationId,
        packs: p,
        units_per_pack: upp,
        base_zone_id: baseZone,
        fg_zone_id: fgZone,
        worker_id: workerId,
        notes: notes || null,
      });
      notify.success(`Packing posted · ${p} packs (${baseUnits} base units consumed)`);
      onPosted();
      onOpenChange(false);
    } catch (e) {
      notify.error("Could not post packing run", { description: (e as Error).message });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("mfg_packing_run")}</DialogTitle>
          <DialogDescription><span className="font-medium">{baseVariantLabel}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_variation")} *</Label>
            <SmartSelect
              options={variations.map((v) => ({ value: v.id, label: `${v.variant_name} · pack of ${v.units_per_pack}`, hint: v.sku }))}
              value={variationId}
              onChange={setVariationId}
              placeholder={variations.length === 0 ? t("mfg_no_variations") : t("mfg_select_variation")}
              emptyText={t("mfg_no_variations")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_packs")} *</Label>
              <Input type="number" inputMode="numeric" value={packs} onChange={(e) => setPacks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_units_per_pack")}</Label>
              <Input value={upp || "—"} readOnly className="bg-muted/30 font-mono" />
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
            {t("mfg_base_units_consumed")} · <span className="font-mono font-semibold">{baseUnits.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_from_base_zone")} *</Label>
              <SmartSelect options={zones.filter((z) => z.kind === "finished_good" || z.kind === "wip").map((z) => ({ value: z.id, label: z.name, hint: `${z.code} · ${z.kind}` }))} value={baseZone} onChange={setBaseZone} placeholder={t("mfg_pick_base_zone")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_to_fg_zone")} *</Label>
              <SmartSelect options={zones.filter((z) => z.kind === "finished_good").map((z) => ({ value: z.id, label: z.name, hint: z.code }))} value={fgZone} onChange={setFgZone} placeholder={t("mfg_pick_fg_zone")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_worker")}</Label>
            <SmartSelect options={workers.map((w) => ({ value: w.id, label: w.label, hint: w.hint }))} value={workerId} onChange={setWorkerId} placeholder={t("mfg_optional")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("btn_cancel")}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t("mfg_posting") : t("mfg_post_packing")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}