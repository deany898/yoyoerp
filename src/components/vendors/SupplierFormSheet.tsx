import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VENDOR_CATEGORIES, type VendorCategory } from "./vendor-constants";
import type { SupplierRow } from "@/hooks/useErpData";

type Editable = Partial<SupplierRow>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Editable | null;
  setEditing: (e: Editable | null) => void;
  onSave: () => void;
  saving: boolean;
}

export function SupplierFormSheet({ open, onOpenChange, editing, setEditing, onSave, saving }: Props) {
  if (!editing) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg" />
      </Sheet>
    );
  }
  const e = editing;
  const set = (patch: Partial<Editable>) => setEditing({ ...e, ...patch });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{e.id ? "Edit supplier" : "New supplier"}</SheetTitle>
          <SheetDescription>Vendor master record.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input value={e.code ?? ""} onChange={(ev) => set({ code: ev.target.value })} placeholder="SUP-001" /></div>
            <div><Label>Lead time (days)</Label><Input type="number" min={0} value={e.lead_time_days ?? 7} onChange={(ev) => set({ lead_time_days: Number(ev.target.value) })} /></div>
          </div>
          <div><Label>Name *</Label><Input value={e.name ?? ""} onChange={(ev) => set({ name: ev.target.value })} placeholder="Acme Industries Pvt Ltd" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={e.category || "other"} onValueChange={(v) => set({ category: v as VendorCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit days</Label>
              <Input type="number" min={0} value={e.credit_days ?? 0}
                onChange={(ev) => set({ credit_days: Number(ev.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Opening balance (INR)</Label>
            <Input type="number" min={0} step="0.01" value={e.opening_balance ?? 0}
              onChange={(ev) => set({ opening_balance: Number(ev.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact name</Label><Input value={e.contact_name ?? ""} onChange={(ev) => set({ contact_name: ev.target.value })} /></div>
            <div><Label>Phone</Label><Input value={e.phone ?? ""} onChange={(ev) => set({ phone: ev.target.value })} /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={e.email ?? ""} onChange={(ev) => set({ email: ev.target.value })} /></div>
          <div><Label>Address</Label><Textarea rows={2} value={e.address ?? ""} onChange={(ev) => set({ address: ev.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={e.city ?? ""} onChange={(ev) => set({ city: ev.target.value })} /></div>
            <div><Label>State</Label><Input value={e.state ?? ""} onChange={(ev) => set({ state: ev.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>GST number</Label><Input value={e.gst_number ?? ""} onChange={(ev) => set({ gst_number: ev.target.value })} /></div>
            <div><Label>Payment terms</Label><Input value={e.payment_terms ?? ""} onChange={(ev) => set({ payment_terms: ev.target.value })} placeholder="Net 30" /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={e.notes ?? ""} onChange={(ev) => set({ notes: ev.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save supplier"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}