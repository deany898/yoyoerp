import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Truck, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers, type SupplierRow } from "@/hooks/useErpData";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/suppliers")({
  component: SuppliersPage,
  head: () => ({ meta: [{ title: "Suppliers · YOYO ERP" }] }),
});

const EMPTY: Partial<SupplierRow> = {
  code: "", name: "", contact_name: "", email: "", phone: "",
  address: "", city: "", state: "", country: "IN", gst_number: "",
  payment_terms: "", lead_time_days: 7, notes: "", is_active: true,
};

function SuppliersPage() {
  const { suppliers, loading, refresh } = useSuppliers();
  const { can } = usePermissions();
  const canManage = can("manage_suppliers");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<SupplierRow> | null>(null);
  const [deleting, setDeleting] = useState<SupplierRow | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() { setEditing({ ...EMPTY }); setOpen(true); }
  function openEdit(s: SupplierRow) { setEditing(s); setOpen(true); }

  async function handleSave() {
    if (!editing?.name || !editing?.code) {
      toast.error("Code and Name are required");
      return;
    }
    setSaving(true);
    const payload = {
      code: editing.code, name: editing.name,
      contact_name: editing.contact_name || null,
      email: editing.email || null, phone: editing.phone || null,
      address: editing.address || null, city: editing.city || null,
      state: editing.state || null, country: editing.country || "IN",
      gst_number: editing.gst_number || null,
      payment_terms: editing.payment_terms || null,
      lead_time_days: Number(editing.lead_time_days) || 7,
      notes: editing.notes || null,
      is_active: editing.is_active ?? true,
    };
    const op = editing.id
      ? supabase.from("suppliers").update(payload).eq("id", editing.id)
      : supabase.from("suppliers").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast.error("Save failed", { description: error.message }); return; }
    toast.success(editing.id ? "Supplier updated" : "Supplier created");
    setOpen(false); setEditing(null); await refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", deleting.id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    toast.success("Supplier deleted");
    setDeleting(null); await refresh();
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground">{suppliers.length} vendors</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New supplier
          </Button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white p-8 text-sm text-muted-foreground">Loading…</div>
      ) : suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="No suppliers yet"
          description="Add your first vendor to start tracking POs and lead times."
          actionLabel={canManage ? "Add supplier" : undefined}
          onAction={canManage ? openCreate : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="font-mono">Lead time</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.contact_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.city || "—"}</TableCell>
                  <TableCell className="font-mono">{s.lead_time_days}d</TableCell>
                  <TableCell>
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(s)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "Edit supplier" : "New supplier"}</SheetTitle>
            <SheetDescription>Vendor master record.</SheetDescription>
          </SheetHeader>
          {editing && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code *</Label><Input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="SUP-001" /></div>
                <div><Label>Lead time (days)</Label><Input type="number" min={0} value={editing.lead_time_days ?? 7} onChange={(e) => setEditing({ ...editing, lead_time_days: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Name *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Acme Industries Pvt Ltd" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact name</Label><Input value={editing.contact_name ?? ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>Address</Label><Textarea rows={2} value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>City</Label><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
                <div><Label>State</Label><Input value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>GST number</Label><Input value={editing.gst_number ?? ""} onChange={(e) => setEditing({ ...editing, gst_number: e.target.value })} /></div>
                <div><Label>Payment terms</Label><Input value={editing.payment_terms ?? ""} onChange={(e) => setEditing({ ...editing, payment_terms: e.target.value })} placeholder="Net 30" /></div>
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save supplier"}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. POs referencing this supplier will block deletion.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}