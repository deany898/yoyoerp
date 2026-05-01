import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Users, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { useRole } from "@/hooks/useRole";
import { ExportButton } from "@/components/shared/ExportButton";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers · YOYO ERP" }] }),
});

interface CustomerRow {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  pan_number: string | null;
  pricing_tier: string;
  payment_terms: string | null;
  billing_address: string | null;
  delivery_address: string | null;
  city: string | null;
  state: string | null;
  transporter: string | null;
  notes: string | null;
  is_active: boolean;
}

function emptyDraft(): Partial<CustomerRow> {
  return {
    code: `C-${Math.floor(Math.random() * 9000 + 1000)}`,
    name: "", pricing_tier: "standard", is_active: true,
  };
}

function CustomersPage() {
  const { role } = useRole();
  const canEdit = ["admin", "manager", "sales"].includes(role);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<CustomerRow> | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name");
    if (error) toast.error("Failed to load", { description: error.message });
    setRows((data ?? []) as CustomerRow[]);
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.name} ${r.code} ${r.phone ?? ""} ${r.email ?? ""} ${r.city ?? ""}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  function openCreate() { setDraft(emptyDraft()); setOpen(true); }
  function openEdit(r: CustomerRow) { setDraft(r); setOpen(true); }

  async function save() {
    if (!draft?.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload = {
      code: draft.code!, name: draft.name!, contact_name: draft.contact_name ?? null,
      phone: draft.phone ?? null, email: draft.email ?? null,
      gst_number: draft.gst_number ?? null, pan_number: draft.pan_number ?? null,
      pricing_tier: draft.pricing_tier ?? "standard",
      payment_terms: draft.payment_terms ?? null,
      billing_address: draft.billing_address ?? null,
      delivery_address: draft.delivery_address ?? null,
      city: draft.city ?? null, state: draft.state ?? null,
      transporter: draft.transporter ?? null, notes: draft.notes ?? null,
      is_active: draft.is_active ?? true,
    };
    const res = draft.id
      ? await supabase.from("customers").update(payload).eq("id", draft.id)
      : await supabase.from("customers").insert(payload);
    setSaving(false);
    if (res.error) { toast.error("Save failed", { description: res.error.message }); return; }
    toast.success(draft.id ? "Customer updated" : "Customer created");
    setOpen(false); setDraft(null); void refresh();
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sales</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${rows.length} customer${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            filename="customers"
            capability="customers.export"
            rows={filtered as unknown as Record<string, unknown>[]}
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "contact_name", label: "Contact" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              { key: "pricing_tier", label: "Tier" },
              { key: "gst_number", label: "GST" },
              { key: "pan_number", label: "PAN" },
              { key: "payment_terms", label: "Payment terms" },
              { key: "is_active", label: "Active", format: (v) => (v ? "yes" : "no") },
            ]}
          />
          {canEdit && (
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New customer</Button>
          )}
        </div>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone, city" className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title={rows.length === 0 ? "No customers yet" : "No matches"}
            description={rows.length === 0 ? "Add your first wholesale customer." : "Try a different search."}
            actionLabel={rows.length === 0 && canEdit ? "New customer" : undefined}
            onAction={rows.length === 0 && canEdit ? openCreate : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>GST</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => canEdit && openEdit(r)}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.contact_name ?? "—"} {r.phone ? `· ${r.phone}` : ""}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.city ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.pricing_tier}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.gst_number ?? "—"}</TableCell>
                  <TableCell>{canEdit && <Pencil className="h-3.5 w-3.5 text-muted-foreground" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{draft?.id ? "Edit customer" : "New customer"}</SheetTitle>
            <SheetDescription>Wholesale customer master data.</SheetDescription>
          </SheetHeader>
          {draft && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                <div><Label>Code</Label><Input value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></div>
                <div><Label>Contact name</Label><Input value={draft.contact_name ?? ""} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
                <div>
                  <Label>Pricing tier</Label>
                  <SmartSelect
                    options={[
                      { value: "standard", label: "Standard" },
                      { value: "silver", label: "Silver" },
                      { value: "gold", label: "Gold" },
                      { value: "platinum", label: "Platinum" },
                    ]}
                    value={draft.pricing_tier ?? "standard"}
                    onChange={(v) => setDraft({ ...draft, pricing_tier: v ?? "standard" })}
                    searchPlaceholder="Search tier…"
                  />
                </div>
                <div><Label>GST number</Label><Input value={draft.gst_number ?? ""} onChange={(e) => setDraft({ ...draft, gst_number: e.target.value })} /></div>
                <div><Label>PAN</Label><Input value={draft.pan_number ?? ""} onChange={(e) => setDraft({ ...draft, pan_number: e.target.value })} /></div>
                <div><Label>Payment terms</Label><Input value={draft.payment_terms ?? ""} onChange={(e) => setDraft({ ...draft, payment_terms: e.target.value })} placeholder="e.g. Net 30" /></div>
                <div><Label>Transporter</Label><Input value={draft.transporter ?? ""} onChange={(e) => setDraft({ ...draft, transporter: e.target.value })} /></div>
                <div><Label>City</Label><Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div>
                <div><Label>State</Label><Input value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value })} /></div>
              </div>
              <div><Label>Billing address</Label><Textarea rows={2} value={draft.billing_address ?? ""} onChange={(e) => setDraft({ ...draft, billing_address: e.target.value })} /></div>
              <div><Label>Delivery address</Label><Textarea rows={2} value={draft.delivery_address ?? ""} onChange={(e) => setDraft({ ...draft, delivery_address: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save customer"}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}