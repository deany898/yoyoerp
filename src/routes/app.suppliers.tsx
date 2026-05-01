import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Truck, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSuppliers, type SupplierRow } from "@/hooks/useErpData";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/shared/ExportButton";
import { Vendor360Sheet } from "@/components/vendors/Vendor360Sheet";
import { SupplierFormSheet } from "@/components/vendors/SupplierFormSheet";
import {
  VENDOR_CATEGORIES, categoryLabel, type VendorCategory,
} from "@/components/vendors/vendor-constants";
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
  const [viewing, setViewing] = useState<SupplierRow | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | "all">("all");

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
      category: (editing.category as VendorCategory) || "other",
      credit_days: Number(editing.credit_days) || 0,
      opening_balance: Number(editing.opening_balance) || 0,
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

  const filtered = categoryFilter === "all"
    ? suppliers
    : suppliers.filter((s) => s.category === categoryFilter);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {suppliers.length} vendors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="suppliers"
            capability="suppliers.export"
            rows={filtered as unknown as Record<string, unknown>[]}
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "category", label: "Category", format: (v) => (v ? categoryLabel(v as VendorCategory) : "Other") },
              { key: "contact_name", label: "Contact" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "gst_number", label: "GST" },
              { key: "lead_time_days", label: "Lead time (days)" },
              { key: "credit_days", label: "Credit (days)" },
              { key: "is_active", label: "Active", format: (v) => (v ? "yes" : "no") },
            ]}
          />
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New supplier
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            categoryFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-white text-muted-foreground hover:border-primary/50"
          }`}
        >All</button>
        {VENDOR_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(c.value)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              categoryFilter === c.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-white text-muted-foreground hover:border-primary/50"
            }`}
          >{c.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-white p-8 text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
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
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="font-mono">Lead time</TableHead>
                <TableHead className="font-mono">Credit</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewing(s)}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {s.category ? categoryLabel(s.category) : "Other"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.contact_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                  <TableCell className="font-mono">{s.lead_time_days}d</TableCell>
                  <TableCell className="font-mono">{s.credit_days ?? 0}d</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(s)} title="Vendor 360">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canManage && (<>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleting(s)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierFormSheet
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        setEditing={setEditing}
        onSave={handleSave}
        saving={saving}
      />

      <Vendor360Sheet
        supplier={viewing}
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        canManage={canManage}
        onChanged={refresh}
      />

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