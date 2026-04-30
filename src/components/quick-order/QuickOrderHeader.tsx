import { useMemo, useState } from "react";
import { User as UserIcon, MapPin, Warehouse, Hash, CreditCard } from "lucide-react";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface CustomerLite {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  delivery_address: string | null;
  billing_address: string | null;
  payment_terms: string | null;
  pricing_tier: string;
}

interface Props {
  customers: CustomerLite[];
  warehouses: Array<{ id: string; name: string }>;
  customerId: string;
  warehouseId: string;
  shippingAddress: string;
  paymentTerms: string;
  orderNumber: string;
  onCustomer: (id: string) => void;
  onWarehouse: (id: string) => void;
  onShipping: (s: string) => void;
  onPaymentTerms: (s: string) => void;
}

export function QuickOrderHeader(props: Props) {
  const customer = useMemo(
    () => props.customers.find((c) => c.id === props.customerId) ?? null,
    [props.customers, props.customerId],
  );
  const [addrOpen, setAddrOpen] = useState(false);

  return (
    <header className="rounded-xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-12 md:items-center">
        {/* Customer */}
        <Field icon={<UserIcon className="h-3.5 w-3.5" />} label="Customer" cols="md:col-span-4">
          <SmartSelect
            options={props.customers.map((c) => ({ value: c.id, label: c.name, hint: c.code }))}
            value={props.customerId || null}
            onChange={(v) => props.onCustomer(v ?? "")}
            placeholder="Search customer or code…"
            searchPlaceholder="Type customer name"
            emptyText="No customers"
          />
          {customer && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-mono">{customer.code}</span>
              {customer.contact_name && <span>· {customer.contact_name}</span>}
              {customer.phone && <span>· {customer.phone}</span>}
              <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px] uppercase">
                {customer.pricing_tier}
              </Badge>
            </div>
          )}
        </Field>

        {/* Warehouse */}
        <Field icon={<Warehouse className="h-3.5 w-3.5" />} label="Warehouse" cols="md:col-span-2">
          <Select value={props.warehouseId} onValueChange={props.onWarehouse}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Pick" /></SelectTrigger>
            <SelectContent>
              {props.warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Shipping address (popover) */}
        <Field icon={<MapPin className="h-3.5 w-3.5" />} label="Ship to" cols="md:col-span-3">
          <Popover open={addrOpen} onOpenChange={setAddrOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-left text-sm hover:border-primary/50"
              >
                <span className="flex-1 truncate text-muted-foreground">
                  {props.shippingAddress
                    ? props.shippingAddress.split("\n")[0]
                    : "Add shipping address…"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-3" align="start">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shipping address</Label>
              <textarea
                rows={4}
                value={props.shippingAddress}
                onChange={(e) => props.onShipping(e.target.value)}
                placeholder="Street, city, state, PIN"
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {customer?.delivery_address && customer.delivery_address !== props.shippingAddress && (
                <button
                  type="button"
                  onClick={() => props.onShipping(customer.delivery_address ?? "")}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  Use customer default
                </button>
              )}
            </PopoverContent>
          </Popover>
        </Field>

        {/* Payment terms */}
        <Field icon={<CreditCard className="h-3.5 w-3.5" />} label="Terms" cols="md:col-span-2">
          <Input
            value={props.paymentTerms}
            onChange={(e) => props.onPaymentTerms(e.target.value)}
            placeholder="Net 30"
            className="h-9"
          />
        </Field>

        {/* DO number */}
        <div className="md:col-span-1 flex flex-col items-end justify-center gap-0.5 md:pr-1">
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Hash className="h-3 w-3" /> DO
          </span>
          <span className="font-mono text-xs font-semibold">{props.orderNumber || "…"}</span>
        </div>
      </div>
    </header>
  );
}

function Field({ icon, label, cols, children }: { icon: React.ReactNode; label: string; cols: string; children: React.ReactNode }) {
  return (
    <div className={cols}>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}