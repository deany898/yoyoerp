import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { postMovement, useInventory, useProducts, useWarehouses, type PostMovementInput } from "@/hooks/useErpData";
import type { Database } from "@/integrations/supabase/types";

type Reason = Database["public"]["Enums"]["movement_reason"];

const REASONS: { value: Reason; label: string; needsFrom: boolean; needsTo: boolean }[] = [
  { value: "receipt", label: "Receipt (purchase IN)", needsFrom: false, needsTo: true },
  { value: "production_output", label: "Production output", needsFrom: false, needsTo: true },
  { value: "return", label: "Customer return", needsFrom: false, needsTo: true },
  { value: "consumption", label: "Consumption (issue to production)", needsFrom: true, needsTo: false },
  { value: "dispatch", label: "Dispatch (sales OUT)", needsFrom: true, needsTo: false },
  { value: "transfer", label: "Transfer between zones", needsFrom: true, needsTo: true },
  { value: "adjustment", label: "Stock adjustment", needsFrom: false, needsTo: true },
  { value: "scrap", label: "Scrap / wastage", needsFrom: true, needsTo: false },
  { value: "opening_balance", label: "Opening balance", needsFrom: false, needsTo: true },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPosted?: () => void;
  defaultVariantId?: string;
}

export function StockMovementSheet({ open, onOpenChange, onPosted, defaultVariantId }: Props) {
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  const { refresh: refreshInv } = useInventory();

  const [reason, setReason] = useState<Reason>("receipt");
  const [variantId, setVariantId] = useState(defaultVariantId ?? "");
  const [fromZone, setFromZone] = useState<string>("");
  const [toZone, setToZone] = useState<string>("");
  const [qty, setQty] = useState<string>("");
  const [unitCost, setUnitCost] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasonDef = REASONS.find((r) => r.value === reason)!;

  const variantOptions = useMemo(
    () => products.flatMap((p) => p.variants.map((v) => ({ id: v.id, label: `${p.name} · ${v.variant_name} (${v.sku})` }))),
    [products]
  );
  const zoneOptions = useMemo(
    () => warehouses.flatMap((w) => w.zones.map((z) => ({ id: z.id, label: `${w.name} · ${z.name}` }))),
    [warehouses]
  );

  const reset = () => {
    setReason("receipt"); setVariantId(defaultVariantId ?? "");
    setFromZone(""); setToZone(""); setQty(""); setUnitCost(""); setNotes("");
  };

  const handleSubmit = async () => {
    if (!variantId) return toast.error("Pick a product variant");
    const q = Number(qty);
    if (!q || q <= 0) return toast.error("Quantity must be greater than zero");
    if (reasonDef.needsFrom && !fromZone) return toast.error("Pick a source zone");
    if (reasonDef.needsTo && !toZone) return toast.error("Pick a destination zone");

    const payload: PostMovementInput = {
      variant_id: variantId, reason, qty: q,
      from_zone_id: reasonDef.needsFrom ? fromZone : null,
      to_zone_id: reasonDef.needsTo ? toZone : null,
      unit_cost: unitCost ? Number(unitCost) : null,
      notes: notes || null,
    };

    // Optimistic: close the sheet immediately, show a pending toast.
    // Realtime invalidator (Tier B) will refresh the inventory grid
    // when the server row lands. No spinner round-trip in the sheet.
    setSubmitting(true);
    const toastId = toast.loading("Posting movement…");
    reset();
    onOpenChange(false);

    try {
      await postMovement(payload);
      toast.success("Movement posted", { id: toastId });
      refreshInv();
      onPosted?.();
    } catch (e) {
      toast.error("Failed to post movement", {
        id: toastId,
        description: (e as Error).message,
        duration: 12000,
        action: {
          label: "Retry",
          onClick: () => {
            void (async () => {
              const retryId = toast.loading("Retrying…");
              try {
                await postMovement(payload);
                toast.success("Movement posted", { id: retryId });
                refreshInv();
                onPosted?.();
              } catch (err) {
                toast.error("Retry failed", {
                  id: retryId,
                  description: (err as Error).message,
                });
              }
            })();
          },
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Post stock movement</SheetTitle>
          <SheetDescription>Records a movement, updates zone balances, and writes an audit entry.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as Reason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Product variant</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger><SelectValue placeholder="Pick a variant" /></SelectTrigger>
              <SelectContent className="max-h-64">{variantOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {reasonDef.needsFrom && (
            <div>
              <Label>From zone</Label>
              <Select value={fromZone} onValueChange={setFromZone}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{zoneOptions.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {reasonDef.needsTo && (
            <div>
              <Label>To zone</Label>
              <Select value={toZone} onValueChange={setToZone}>
                <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>{zoneOptions.map((z) => <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>Unit cost (₹)</Label>
              <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Reference, PO number, batch ID…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Posting…" : "Post movement"}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
