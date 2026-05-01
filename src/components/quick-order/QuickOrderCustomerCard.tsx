import { useEffect, useMemo, useRef, useState } from "react";
import { User as UserIcon, Phone, Truck, MapPin, StickyNote, Hash, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CustomerLite } from "./QuickOrderHeader";

interface Props {
  customers: CustomerLite[];
  customerId: string;
  customerName: string;
  phone: string;
  transporter: string;
  city: string;
  note: string;
  shippingAddress: string;
  orderNumber: string;
  onPickCustomer: (c: CustomerLite | null) => void;
  onName: (s: string) => void;
  onPhone: (s: string) => void;
  onTransporter: (s: string) => void;
  onCity: (s: string) => void;
  onNote: (s: string) => void;
  onShipping: (s: string) => void;
}

export function QuickOrderCustomerCard(p: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = p.customerName.trim().toLowerCase();
    if (!q) return p.customers.slice(0, 6);
    return p.customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q),
    ).slice(0, 8);
  }, [p.customers, p.customerName]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = p.customers.find((c) => c.id === p.customerId) ?? null;

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      {/* DO header strip */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          New order
        </span>
        <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-foreground">
          <Hash className="h-3 w-3" /> {p.orderNumber || "…"}
        </span>
      </div>

      {/* Customer name with autocomplete */}
      <div ref={wrapRef} className="relative">
        <FieldLabel icon={<UserIcon className="h-3 w-3" />}>Customer</FieldLabel>
        <div className="relative">
          <Input
            value={p.customerName}
            onChange={(e) => { p.onName(e.target.value); setOpen(true); if (selected) p.onPickCustomer(null); }}
            onFocus={() => setOpen(true)}
            placeholder="Type customer name…"
            className="h-10 pr-8"
            autoComplete="off"
          />
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {selected && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
            <Check className="h-3 w-3" /> Saved customer · <span className="font-mono">{selected.code}</span>
          </div>
        )}
        {open && matches.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); p.onPickCustomer(c); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    c.id === p.customerId && "bg-accent",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{c.name}</span>
                    {c.phone && <span className="ml-1 text-xs text-muted-foreground">· {c.phone}</span>}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Field icon={<Phone className="h-3 w-3" />} label="Mobile">
          <Input
            value={p.phone}
            onChange={(e) => p.onPhone(e.target.value)}
            inputMode="tel"
            placeholder="98xxxxxxxx"
            className="h-10"
          />
        </Field>
        <Field icon={<MapPin className="h-3 w-3" />} label="City">
          <Input
            value={p.city}
            onChange={(e) => p.onCity(e.target.value)}
            placeholder="City"
            className="h-10"
          />
        </Field>
        <Field icon={<Truck className="h-3 w-3" />} label="Transport">
          <Input
            value={p.transporter}
            onChange={(e) => p.onTransporter(e.target.value)}
            placeholder="Transporter / vehicle"
            className="h-10"
          />
        </Field>
        <Field icon={<StickyNote className="h-3 w-3" />} label="Note">
          <Input
            value={p.note}
            onChange={(e) => p.onNote(e.target.value)}
            placeholder="Order note (optional)"
            className="h-10"
          />
        </Field>
      </div>
    </section>
  );
}

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {icon} {children}
    </div>
  );
}
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel icon={icon}>{label}</FieldLabel>
      {children}
    </div>
  );
}