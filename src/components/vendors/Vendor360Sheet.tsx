import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { categoryLabel } from "./vendor-constants";
import type { SupplierRow } from "@/hooks/useErpData";

interface Props {
  supplier: SupplierRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  canManage: boolean;
  onChanged?: () => void;
}

/**
 * Simplified supplier detail · YOYO ERP V1 is a price-memory + sales ERP,
 * not a procurement accounting system. Payments + scorecard removed.
 */
export function Vendor360Sheet({ supplier, open, onOpenChange }: Props) {
  if (!supplier) return null;
  const cat = supplier.category;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{supplier.name}</SheetTitle>
            {cat && <Badge variant="secondary">{categoryLabel(cat)}</Badge>}
          </div>
          <SheetDescription className="font-mono text-xs">
            {supplier.code} · lead {supplier.lead_time_days ?? "—"}d
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          <Field label="Contact" value={supplier.contact_name || "—"} />
          <Field label="Phone" value={supplier.phone || "—"} />
          <Field label="Email" value={supplier.email || "—"} />
          <Field label="GST" value={supplier.gst_number || "—"} />
          <Field
            label="Address"
            value={[supplier.address, supplier.city, supplier.state].filter(Boolean).join(", ") || "—"}
          />
          <Field label="Payment terms" value={supplier.payment_terms || "—"} />
          {supplier.notes && <Field label="Notes" value={supplier.notes} />}
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          Supplier price memory · update product quotes from the product detail.
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground text-right">{value}</div>
    </div>
  );
}
