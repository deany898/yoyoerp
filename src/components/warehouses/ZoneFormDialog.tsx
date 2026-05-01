import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { ZoneRow } from "@/hooks/useErpData";

const KINDS = [
  { v: "raw_material", l: "Raw material" },
  { v: "wip", l: "Work in progress" },
  { v: "finished_good", l: "Finished good" },
  { v: "packaging", l: "Packaging" },
  { v: "dispatch", l: "Dispatch" },
  { v: "quarantine", l: "Quarantine" },
  { v: "returns", l: "Returns" },
  { v: "other", l: "Other" },
] as const;
type Kind = (typeof KINDS)[number]["v"];

const schema = z.object({
  code: z.string().trim().max(20).optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["raw_material","wip","finished_good","packaging","dispatch","quarantine","returns","other"]),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  warehouseId: string;
  zone?: ZoneRow | null;
  onSaved: () => void;
}

export function ZoneFormDialog({ open, onOpenChange, warehouseId, zone, onSaved }: Props) {
  const isEdit = !!zone;
  const [form, setForm] = useState({ code: "", name: "", kind: "finished_good" as Kind });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        code: zone?.code ?? "",
        name: zone?.name ?? "",
        kind: (zone?.kind ?? "finished_good") as Kind,
      });
    }
  }, [open, zone]);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setBusy(true);
    try {
      const payload: { warehouse_id: string; name: string; kind: Kind; code?: string } = {
        warehouse_id: warehouseId, name: parsed.data.name, kind: parsed.data.kind,
      };
      if (parsed.data.code) payload.code = parsed.data.code.toUpperCase();
      if (isEdit && zone) {
        const { error } = await supabase.from("warehouse_zones").update(payload).eq("id", zone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouse_zones").insert(payload);
        if (error) throw error;
      }
      toast.success(isEdit ? "Zone updated" : "Zone added");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : "Unknown" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Edit zone" : "Add zone"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Code</Label><Input value={isEdit ? form.code : "Auto-generated on save"} disabled className="bg-muted/40" /></div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v as Kind }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : isEdit ? "Save" : "Add zone"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}