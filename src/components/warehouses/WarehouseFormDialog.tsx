import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { WarehouseRow } from "@/hooks/useErpData";

const schema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().trim().min(2).max(2),
  is_default: z.boolean(),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  warehouse?: WarehouseRow | null;
  onSaved: () => void;
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse, onSaved }: Props) {
  const isEdit = !!warehouse;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "", name: "", city: "", state: "", country: "IN", is_default: false,
  });

  useEffect(() => {
    if (open) {
      setForm({
        code: warehouse?.code ?? "",
        name: warehouse?.name ?? "",
        city: warehouse?.city ?? "",
        state: warehouse?.state ?? "",
        country: warehouse?.country ?? "IN",
        is_default: warehouse?.is_default ?? false,
      });
    }
  }, [open, warehouse]);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Check the form", { description: parsed.error.issues[0]?.message });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code: parsed.data.code,
        name: parsed.data.name,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        country: parsed.data.country.toUpperCase(),
        is_default: parsed.data.is_default,
      };
      if (isEdit && warehouse) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", warehouse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
      }
      toast.success(isEdit ? "Warehouse updated" : "Warehouse created");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error("Save failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit warehouse" : "New warehouse"}</DialogTitle>
          <DialogDescription>Warehouses hold zones (RM, WIP, FG, packaging, dispatch).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MAIN" /></div>
            <div className="space-y-1.5"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} maxLength={2} /></div>
          </div>
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Main Plant" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div><Label className="text-sm">Default warehouse</Label><p className="text-xs text-muted-foreground">Used when none is specified.</p></div>
            <Switch checked={form.is_default} onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}