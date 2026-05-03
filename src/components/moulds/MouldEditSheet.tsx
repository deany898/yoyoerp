import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useMachines } from "@/hooks/useMfgData";
import { useProducts } from "@/hooks/useErpData";

export interface MouldFormValue {
  id?: string;
  name: string;
  cavity_count: number;
  cavity_weight_g: number | null;
  runner_weight_g: number | null;
  est_shots_per_day: number | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mould: MouldFormValue | null;
  onSaved: () => void;
}

export function MouldEditSheet({ open, onClose, mould, onSaved }: Props) {
  const { machines } = useMachines();
  const { products } = useProducts();
  const [form, setForm] = useState<MouldFormValue>({
    name: "", cavity_count: 1, cavity_weight_g: null, runner_weight_g: null,
    est_shots_per_day: null, is_active: true,
  });
  const [machineIds, setMachineIds] = useState<Set<string>>(new Set());
  const [variantIds, setVariantIds] = useState<Set<string>>(new Set());
  const [variantSearch, setVariantSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mould) {
      setForm(mould);
      void loadLinks(mould.id!);
    } else {
      setForm({ name: "", cavity_count: 1, cavity_weight_g: null, runner_weight_g: null, est_shots_per_day: null, is_active: true });
      setMachineIds(new Set());
      setVariantIds(new Set());
    }
    setVariantSearch("");
  }, [open, mould]);

  async function loadLinks(id: string) {
    const [m, v] = await Promise.all([
      supabase.from("mould_machine_compat").select("machine_id").eq("mould_id", id),
      supabase.from("mould_compatible_variants").select("variant_id").eq("mould_id", id),
    ]);
    setMachineIds(new Set((m.data ?? []).map((r: { machine_id: string }) => r.machine_id)));
    setVariantIds(new Set((v.data ?? []).map((r: { variant_id: string }) => r.variant_id)));
  }

  function toggleMachine(id: string) {
    setMachineIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleVariant(id: string) {
    setVariantIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function save() {
    if (!form.name.trim()) { notify.error("Mould name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        cavity_count: form.cavity_count || 1,
        cavity_weight_g: form.cavity_weight_g,
        runner_weight_g: form.runner_weight_g,
        est_shots_per_day: form.est_shots_per_day,
        is_active: form.is_active,
      };
      let mid = form.id;
      if (mid) {
        const { error } = await supabase.from("moulds").update(payload).eq("id", mid);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("moulds").insert(payload as never).select("id").single();
        if (error) throw error;
        mid = data.id;
      }
      // sync machines
      await supabase.from("mould_machine_compat").delete().eq("mould_id", mid!);
      if (machineIds.size > 0) {
        await supabase.from("mould_machine_compat").insert(
          Array.from(machineIds).map((machine_id) => ({ mould_id: mid!, machine_id }))
        );
      }
      // sync variants
      await supabase.from("mould_compatible_variants").delete().eq("mould_id", mid!);
      if (variantIds.size > 0) {
        await supabase.from("mould_compatible_variants").insert(
          Array.from(variantIds).map((variant_id) => ({ mould_id: mid!, variant_id }))
        );
      }
      notify.success(mould ? "Mould updated" : "Mould created");
      onSaved();
      onClose();
    } catch (e) {
      notify.error("Save failed", { description: (e as Error).message });
    } finally { setSaving(false); }
  }

  const allVariants = products.flatMap((p) =>
    p.variants.map((v) => ({ id: v.id, label: `${p.name} · ${v.variant_name}`, sku: v.sku })),
  );
  const filteredVariants = allVariants.filter((v) => {
    const q = variantSearch.toLowerCase().trim();
    if (!q) return true;
    return v.label.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q);
  });
  const selectedVariants = allVariants.filter((v) => variantIds.has(v.id));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 bg-background z-10 border-b px-4 py-3">
          <SheetTitle>{mould ? "Edit mould" : "Add mould"}</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-4 space-y-5 pb-28">
          <div className="space-y-2">
            <Label>Mould name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Cavity count (C3)</Label>
              <Input type="number" inputMode="numeric" min={1} value={form.cavity_count} onChange={(e) => setForm({ ...form, cavity_count: Number(e.target.value) })} />
            </div>
            <div className="space-y-2"><Label>Est. shots/day</Label>
              <Input type="number" inputMode="numeric" value={form.est_shots_per_day ?? ""} onChange={(e) => setForm({ ...form, est_shots_per_day: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="space-y-2"><Label>Cavity weight (g) C4</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={form.cavity_weight_g ?? ""} onChange={(e) => setForm({ ...form, cavity_weight_g: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="space-y-2"><Label>Runner weight (g) C5</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={form.runner_weight_g ?? ""} onChange={(e) => setForm({ ...form, runner_weight_g: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label className="m-0">Active</Label></div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>

          <div className="space-y-2">
            <Label>Connected machines</Label>
            <div className="flex flex-wrap gap-2">
              {machines.map((m) => {
                const sel = machineIds.has(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => toggleMachine(m.id)}
                    className={`text-xs rounded-full border px-3 py-1.5 ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                    {m.name}{m.status ? <span className="opacity-60 ml-1">· {m.status}</span> : null}
                  </button>
                );
              })}
              {machines.length === 0 && <span className="text-xs text-muted-foreground">No machines yet.</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Connected products</Label>
            <p className="text-xs text-muted-foreground">Only these products can be selected when this mould is running on a machine.</p>
            <Input placeholder="Search product or SKU…" value={variantSearch} onChange={(e) => setVariantSearch(e.target.value)} />
            {selectedVariants.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedVariants.map((v) => (
                  <Badge key={v.id} variant="secondary" className="gap-1 pr-1">
                    {v.label} <span className="opacity-60 font-mono">{v.sku}</span>
                    <button type="button" onClick={() => toggleVariant(v.id)} className="ml-1 rounded hover:bg-background/50">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {variantSearch && (
              <div className="rounded-lg border max-h-56 overflow-y-auto divide-y">
                {filteredVariants.slice(0, 30).map((v) => (
                  <button key={v.id} type="button" onClick={() => toggleVariant(v.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between">
                    <span>{v.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>
                  </button>
                ))}
                {filteredVariants.length === 0 && <div className="p-3 text-xs text-muted-foreground">No matches.</div>}
              </div>
            )}
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}