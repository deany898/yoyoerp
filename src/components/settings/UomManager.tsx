import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Check, Search, Ruler, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUoms } from "@/hooks/useErpData";
import type { UomDef } from "@/lib/uom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

interface DraftRow { code: string; label: string; factor: string; base_uom: string; is_active: boolean }
const emptyDraft = (): DraftRow => ({ code: "", label: "", factor: "1", base_uom: "", is_active: true });

export function UomManager() {
  const { uoms, loading, refresh } = useUoms({ activeOnly: false });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UomDef | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uoms;
    return uoms.filter((u) =>
      u.code.toLowerCase().includes(q) ||
      u.label.toLowerCase().includes(q) ||
      u.base_uom.toLowerCase().includes(q),
    );
  }, [uoms, search]);

  const validate = (d: DraftRow, isNew: boolean): string | null => {
    if (!d.code.trim()) return "Code is required";
    if (!d.label.trim()) return "Label is required";
    if (!d.base_uom.trim()) return "Base UOM is required";
    const f = Number(d.factor);
    if (!Number.isFinite(f) || f <= 0) return "Factor must be a positive number";
    if (isNew && uoms.some((u) => u.code.toLowerCase() === d.code.trim().toLowerCase()))
      return "This code already exists";
    return null;
  };

  const upsert = async (d: DraftRow, isNew: boolean) => {
    const err = validate(d, isNew);
    if (err) { toast.error(err); return false; }
    setBusy(true);
    const payload = {
      code: d.code.trim(), label: d.label.trim(), factor: Number(d.factor),
      base_uom: d.base_uom.trim(), is_active: d.is_active,
    };
    const { error } = await sb.from("uoms").upsert(payload, { onConflict: "code" });
    setBusy(false);
    if (error) { toast.error("Save failed", { description: error.message }); return false; }
    toast.success(isNew ? "UOM added" : "UOM updated");
    await refresh();
    return true;
  };

  const startEdit = (u: UomDef) => {
    setEditing(u.code);
    setDraft({ code: u.code, label: u.label, factor: String(u.factor), base_uom: u.base_uom, is_active: u.is_active ?? true });
  };

  const toggleActive = async (u: UomDef, next: boolean) => {
    const { error } = await sb.from("uoms").update({ is_active: next }).eq("code", u.code);
    if (error) { toast.error("Update failed", { description: error.message }); return; }
    toast.success(next ? "Activated" : "Deactivated");
    refresh();
  };

  const checkReferences = async (code: string): Promise<string[]> => {
    const checks = [
      { table: "bom_lines", label: "BOM lines", col: "uom" },
      { table: "dispatch_order_lines", label: "dispatch lines", col: "uom" },
      { table: "vendor_quotes", label: "vendor quotes", col: "uom" },
    ];
    const refs: string[] = [];
    for (const c of checks) {
      const { count, error } = await sb.from(c.table).select("*", { count: "exact", head: true }).eq(c.col, code);
      if (!error && (count ?? 0) > 0) refs.push(`${count} ${c.label}`);
    }
    return refs;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const refs = await checkReferences(deleteTarget.code);
    if (refs.length > 0) {
      setBusy(false);
      toast.error(`In use by ${refs.join(", ")}`, { description: "Deactivate it instead to keep historical data intact." });
      return;
    }
    const { error } = await sb.from("uoms").delete().eq("code", deleteTarget.code);
    setBusy(false);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("UOM deleted");
    setDeleteTarget(null);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Units of measure</h2>
          <p className="text-xs text-muted-foreground">Conversion factors used across costing, BOM, and quotes.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-9 w-44 pl-8" />
          </div>
          <Button size="sm" onClick={() => { setDraft(emptyDraft()); setAdding(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add UOM
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Ruler} title={search ? "No matches" : "No UOMs yet"} description={search ? "Try a different search." : "Add your first unit of measure."} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-right font-mono">Factor</th>
                <th className="px-3 py-2 text-left">Base UOM</th>
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isEdit = editing === u.code;
                return (
                  <tr key={u.code} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs">
                      {isEdit ? <Input value={draft.code} disabled className="h-8 w-24" /> : <Badge variant="outline">{u.code}</Badge>}
                    </td>
                    <td className="px-3 py-2">
                      {isEdit ? <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="h-8" />
                        : u.label}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEdit ? <Input type="number" step="any" value={draft.factor} onChange={(e) => setDraft({ ...draft, factor: e.target.value })} className="h-8 w-24 text-right" />
                        : Number(u.factor).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {isEdit ? <Input value={draft.base_uom} onChange={(e) => setDraft({ ...draft, base_uom: e.target.value })} className="h-8 w-24" />
                        : u.base_uom}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={u.is_active ?? true} onCheckedChange={(v) => toggleActive(u, v)} disabled={isEdit} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEdit ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy}
                            onClick={async () => { if (await upsert(draft, false)) setEditing(null); }}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(u)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Factor = how many <span className="font-mono">base UOM</span> are in 1 of <span className="font-mono">code</span>.
        Example: <span className="font-mono">Kg → 1000 gm</span> means a quote per Kg is divided by 1000 to get price per gram.
      </p>

      <Dialog open={adding} onOpenChange={(o) => !o && setAdding(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add unit of measure</DialogTitle>
            <DialogDescription>Conversion factor must be positive. Code must be unique.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code"><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="e.g. Litre" /></Field>
              <Field label="Label"><Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Litre" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Factor"><Input type="number" step="any" value={draft.factor} onChange={(e) => setDraft({ ...draft, factor: e.target.value })} /></Field>
              <Field label="Base UOM"><Input value={draft.base_uom} onChange={(e) => setDraft({ ...draft, base_uom: e.target.value })} placeholder="e.g. ml" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button disabled={busy} onClick={async () => { if (await upsert(draft, true)) setAdding(false); }}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete UOM "{deleteTarget?.code}"?</AlertDialogTitle>
            <AlertDialogDescription>
              If this UOM is used by any BOM line, vendor quote, or dispatch line, deletion will be blocked.
              Use the active toggle to retire it without losing history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      <div>{label}</div>
      {children}
    </label>
  );
}
