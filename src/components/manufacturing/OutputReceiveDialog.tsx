import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { postMoOutput } from "@/lib/mfg-posting";

interface ZoneOpt { id: string; name: string; code: string; kind: string; warehouse_id: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moId: string;
  variantId?: string;
  variantLabel?: string;
  warehouseId?: string | null;
  onPosted: () => void;
}

export function OutputReceiveDialog({ open, onOpenChange, moId, variantId, variantLabel, warehouseId, onPosted }: Props) {
  const [zones, setZones] = useState<ZoneOpt[]>([]);
  const [toZone, setToZone] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQty(""); setNotes("");
    (async () => {
      const { data } = await supabase
        .from("warehouse_zones")
        .select("id, name, code, kind, warehouse_id")
        .eq("is_active", true)
        .order("name");
      const all = data ?? [];
      setZones(all);
      const fg = all.find((z) => z.kind === "finished_good" && (!warehouseId || z.warehouse_id === warehouseId))
        ?? all.find((z) => z.kind === "finished_good");
      if (fg) setToZone(fg.id);
    })();
  }, [open, warehouseId]);

  const submit = async () => {
    if (!variantId) { notify.warning("Missing variant"); return; }
    if (!toZone) { notify.warning("Pick a destination zone"); return; }
    const q = Number(qty);
    if (!q || q <= 0) { notify.warning("Enter a quantity"); return; }
    setSaving(true);
    try {
      await postMoOutput({ mo_id: moId, variant_id: variantId, qty: q, to_zone_id: toZone, notes: notes || null });
      notify.success("Output received");
      onPosted();
      onOpenChange(false);
    } catch (e) {
      notify.error("Could not receive output", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive output</DialogTitle>
          <DialogDescription>{variantLabel ?? "Finished good"} → finished stock</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quantity *</Label>
            <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Destination zone *</Label>
            <SmartSelect
              options={zones.map((z) => ({ value: z.id, label: z.name, hint: `${z.code} · ${z.kind}` }))}
              value={toZone}
              onChange={(v) => setToZone(v)}
              placeholder="Select zone"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Posting…" : "Receive"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}