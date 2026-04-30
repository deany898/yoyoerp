import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  VENDOR_PAYMENT_MODES, type VendorPaymentMode,
} from "./vendor-constants";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  supplierId: string;
  supplierName: string;
  onSaved?: () => void;
}

export function VendorPaymentDialog({ open, onOpenChange, supplierId, supplierName, onSaved }: Props) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<VendorPaymentMode>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAmount(""); setMode("bank_transfer"); setReference(""); setNotes("");
  }

  async function handleSave() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Amount must be greater than 0"); return; }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("vendor_payments").insert({
      supplier_id: supplierId,
      payment_date: paymentDate,
      amount: amt,
      mode,
      reference: reference || null,
      notes: notes || null,
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) { toast.error("Payment failed", { description: error.message }); return; }
    toast.success("Payment recorded");
    reset();
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>Logging payment to {supplierName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label>Amount (INR)</Label>
              <Input type="number" min={0} step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as VendorPaymentMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VENDOR_PAYMENT_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="UTR / cheque no / txn id" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}