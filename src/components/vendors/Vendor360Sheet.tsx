import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { categoryLabel } from "./vendor-constants";
import type { SupplierRow } from "@/hooks/useErpData";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FLAGS } from "@/lib/feature-flags";
import { DynamicField } from "@/components/shared/DynamicField";

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
  const { isEnabled } = useAppConfig();
  const showFinance = isEnabled(FLAGS.suppliers.showFinanceFields, true);

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
          <DynamicField module="suppliers" fieldKey="contact_name">
            <Field label="Contact" value={supplier.contact_name || "—"} />
          </DynamicField>
          <DynamicField module="suppliers" fieldKey="phone">
            <Field label="Phone" value={supplier.phone || "—"} />
          </DynamicField>
          <DynamicField module="suppliers" fieldKey="email">
            <Field label="Email" value={supplier.email || "—"} />
          </DynamicField>
          {showFinance && (
            <DynamicField module="suppliers" fieldKey="gst_number">
              <Field label="GST" value={supplier.gst_number || "—"} />
            </DynamicField>
          )}
          <DynamicField module="suppliers" fieldKey="address">
            <Field
              label="Address"
              value={[supplier.address, supplier.city, supplier.state].filter(Boolean).join(", ") || "—"}
            />
          </DynamicField>
          {showFinance && (
            <DynamicField module="suppliers" fieldKey="payment_terms">
              <Field label="Payment terms" value={supplier.payment_terms || "—"} />
            </DynamicField>
          )}
          {supplier.notes && (
            <DynamicField module="suppliers" fieldKey="notes">
              <Field label="Notes" value={supplier.notes} />
            </DynamicField>
          )}
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
