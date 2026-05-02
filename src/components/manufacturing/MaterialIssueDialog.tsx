import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { postMaterialIssue } from "@/lib/mfg-posting";
import { useLanguage } from "@/contexts/LanguageContext";

interface ZoneOpt { id: string; name: string; code: string; kind: string; warehouse_id: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moId: string;
  defaultVariantId?: string;
  defaultQty?: number;
  variantLabel?: string;
  onPosted: () => void;
}

export function MaterialIssueDialog({ open, onOpenChange, moId, defaultVariantId, defaultQty, variantLabel, onPosted }: Props) {
  const { t } = useLanguage();
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [fromZone, setFromZone] = useState<string | null>(null);
  const [wipZone, setWipZone] = useState<string | null>(null);
  const [qty, setQty] = useState<string>(defaultQty ? String(defaultQty) : "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQty(defaultQty ? String(defaultQty) : "");
    setNotes("");
    (async () => {
      const { data } = await supabase
        .from("warehouse_zones")
        .select("id, name, code, kind, warehouse_id")
        .eq("is_active", true)
        .order("name");
      setZones(data ?? []);
      const wip = (data ?? []).find((z) => z.kind === "wip");
      if (wip) setWipZone(wip.id);
    })();
  }, [open, defaultQty]);

  const submit = async () => {
    if (!defaultVariantId) { notify.warning("No component selected"); return; }
    if (!fromZone) { notify.warning("Pick a source zone"); return; }
    const q = Number(qty);
    if (!q || q <= 0) { notify.warning("Enter a quantity"); return; }
    setSaving(true);
    try {
      await postMaterialIssue({
        mo_id: moId,
        variant_id: defaultVariantId,
        qty: q,
        from_zone_id: fromZone,
        to_wip_zone_id: wipZone,
        notes: notes || null,
      });
      notify.success("Material issued to WIP");
      onPosted();
      onOpenChange(false);
    } catch (e) {
      notify.error("Could not issue material", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("mfg_issue_material")}</DialogTitle>
          <DialogDescription>{variantLabel ?? t("mfg_component")} → WIP</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_quantity")} *</Label>
            <Input type="number" inputMode="decimal" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_from_zone")} *</Label>
            <SmartSelect
              options={zones.filter((z) => z.kind !== "wip").map((z) => ({ value: z.id, label: `${z.name}`, hint: `${z.code} · ${z.kind}` }))}
              value={fromZone}
              onChange={(v) => setFromZone(v)}
              placeholder={t("mfg_select_source_zone")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_wip_zone")}</Label>
            <SmartSelect
              options={zones.filter((z) => z.kind === "wip").map((z) => ({ value: z.id, label: z.name, hint: z.code }))}
              value={wipZone}
              onChange={(v) => setWipZone(v)}
              placeholder={t("mfg_pick_wip_zone")}
              emptyText={t("mfg_no_wip_zones")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("mfg_notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t("btn_cancel")}</Button>
          <Button onClick={submit} disabled={saving}>{saving ? t("mfg_posting") : t("mfg_issue_to_wip")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}