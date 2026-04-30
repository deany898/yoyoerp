import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Minus, X, Search, Save, Send, Package, User as UserIcon, MapPin, Hash } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, useWarehouses } from "@/hooks/useErpData";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SmartSelect } from "@/components/forms/SmartSelect";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/app/quick-order")({
  component: QuickOrderPage,
  head: () => ({ meta: [{ title: "Quick Wholesale Order · YOYO ERP" }] }),
});

interface CustomerLite {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  delivery_address: string | null;
  pricing_tier: string;
}

interface OrderLine {
  uid: string;
  variant_id: string;
  qty: number;
  uom: string;
  unit_price: number;
  units_per_pack: number;
}

const UOM_OPTIONS = [
  { value: "each", label: "Each", factor: 1 },
  { value: "pack", label: "Pack", factor: 1 },
  { value: "case_12", label: "Case (12 ct)", factor: 12 },
  { value: "case_24", label: "Case (24 ct)", factor: 24 },
  { value: "pallet", label: "Pallet (100 ct)", factor: 100 },
];

function uomFactor(uom: string, unitsPerPack: number): number {
  if (uom === "each") return 1;
  if (uom === "pack") return unitsPerPack || 1;
  return UOM_OPTIONS.find((u) => u.value === uom)?.factor ?? 1;
}

function newLine(): OrderLine {
  return {
    uid: crypto.randomUUID(),
    variant_id: "",
    qty: 1,
    uom: "each",
    unit_price: 0,
    units_per_pack: 1,
  };
}

function QuickOrderPage() {
  const navigate = useNavigate();
  const { products } = useProducts();
  const { warehouses } = useWarehouses();
  const { role } = useRole();
  const canEdit = ["admin", "manager", "sales", "dispatch"].includes(role);

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [shippingAddress, setShippingAddress] = useState<string>("");
  const [lines, setLines] = useState<OrderLine[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  // Bootstrap: load customers + draft DO number
  useEffect(() => {
    (async () => {
      const [custRes, numRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id,code,name,contact_name,email,phone,delivery_address,pricing_tier")
          .eq("is_active", true)
          .order("name"),
        supabase.rpc("next_doc_number", { _doc_type: "DO" }),
      ]);
      if (custRes.error) toast.error("Failed to load customers", { description: custRes.error.message });
      setCustomers((custRes.data ?? []) as CustomerLite[]);
      if (!numRes.error && numRes.data) setOrderNumber(numRes.data as string);
    })();
  }, []);

  const customer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  // When customer changes, prefill shipping
  useEffect(() => {
    if (customer && !shippingAddress) setShippingAddress(customer.delivery_address ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const variantOptions = useMemo(
    () =>
      products.flatMap((p) =>
        (p.variants ?? [])
          .filter((v) => v.is_active)
          .map((v) => ({
            value: v.id,
            label: `${p.name} · ${v.variant_name}`,
            hint: v.sku,
            cost: Number(v.effective_cost ?? v.avg_cost ?? 0),
            ups: Number(v.units_per_pack ?? 1),
          })),
      ),
    [products],
  );

  const variantById = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; cost: number; ups: number }>();
    products.forEach((p) =>
      (p.variants ?? []).forEach((v) =>
        map.set(v.id, {
          sku: v.sku,
          name: `${p.name} · ${v.variant_name}`,
          cost: Number(v.effective_cost ?? v.avg_cost ?? 0),
          ups: Number(v.units_per_pack ?? 1),
        }),
      ),
    );
    return map;
  }, [products]);

  function patchLine(uid: string, p: Partial<OrderLine>) {
    setLines((prev) => {
      const next = prev.map((l) => (l.uid === uid ? { ...l, ...p } : l));
      // Auto-append blank row if last filled row got a product
      const last = next[next.length - 1];
      if (last?.variant_id) next.push(newLine());
      return next;
    });
  }

  function removeLine(uid: string) {
    setLines((prev) => {
      const next = prev.filter((l) => l.uid !== uid);
      if (next.length === 0 || next[next.length - 1].variant_id) next.push(newLine());
      return next;
    });
  }

  function lineSubtotal(l: OrderLine): number {
    const factor = uomFactor(l.uom, l.units_per_pack);
    return l.qty * l.unit_price * factor;
  }

  const filledLines = lines.filter((l) => l.variant_id && l.qty > 0);
  const subtotal = filledLines.reduce((sum, l) => sum + lineSubtotal(l), 0);
  const shipping = subtotal > 5000 ? 0 : subtotal > 0 ? 90 : 0;
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + shipping + tax;

  async function submitOrder(asDraft: boolean) {
    if (!canEdit) {
      toast.error("You don't have permission to create dispatch orders");
      return;
    }
    if (!customerId) {
      toast.error("Pick a customer first");
      return;
    }
    if (filledLines.length === 0) {
      toast.error("Add at least one product");
      return;
    }
    setSaving(true);

    let doNumber = orderNumber;
    if (!doNumber) {
      const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "DO" });
      if (error || !data) {
        setSaving(false);
        toast.error("Could not generate order number", { description: error?.message });
        return;
      }
      doNumber = data as string;
    }

    const header = {
      do_number: doNumber,
      customer_id: customerId,
      warehouse_id: warehouseId || null,
      status: asDraft ? ("draft" as const) : ("pending_approval" as const),
      delivery_address: shippingAddress || null,
      subtotal,
      discount_total: 0,
      tax_total: tax,
      grand_total: grandTotal,
      freight_cost: shipping,
      packing_cost: 0,
      other_charges: 0,
    };

    const { data: insertRes, error: insErr } = await supabase
      .from("dispatch_orders")
      .insert(header)
      .select("id")
      .single();
    if (insErr || !insertRes) {
      setSaving(false);
      toast.error("Save failed", { description: insErr?.message });
      return;
    }

    const linePayload = filledLines.map((l) => {
      const factor = uomFactor(l.uom, l.units_per_pack);
      const totalUnits = l.qty * factor;
      const lineTotal = lineSubtotal(l);
      return {
        dispatch_order_id: insertRes.id,
        variant_id: l.variant_id,
        qty: totalUnits,
        uom: l.uom,
        unit_price: l.unit_price,
        wholesale_price: l.unit_price,
        discount_value: 0,
        tax_rate: 5,
        line_total: lineTotal,
      };
    });

    const { error: linesErr } = await supabase.from("dispatch_order_lines").insert(linePayload);
    setSaving(false);
    if (linesErr) {
      toast.error("Failed to save lines", { description: linesErr.message });
      return;
    }

    toast.success(asDraft ? "Draft saved" : "Order submitted");
    navigate({ to: "/app/dispatch-orders" });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Logo className="h-10 w-10 rounded-lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sales · Outbound</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">Quick Wholesale Order</h1>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 text-sm md:items-end">
          <div className="flex items-center gap-2 font-mono text-xs">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Order</span>
            <span className="font-semibold">{orderNumber || "…"}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* LEFT: Customer + product entry */}
        <div className="space-y-5">
          {/* Customer block */}
          <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/95 to-primary p-5 text-primary-foreground shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-80">
                  <UserIcon className="h-3.5 w-3.5" /> Customer details
                </div>
                <SmartSelect
                  options={customers.map((c) => ({ value: c.id, label: c.name, hint: c.code }))}
                  value={customerId || null}
                  onChange={(v) => setCustomerId(v ?? "")}
                  placeholder="Search customer name or account…"
                  searchPlaceholder="Type customer name or code"
                  emptyText="No customers found"
                />
                {customer && (
                  <div className="mt-3 space-y-1 text-sm leading-relaxed">
                    <div className="text-base font-semibold">{customer.name}</div>
                    <div className="opacity-90">Account: <span className="font-mono">{customer.code}</span></div>
                    {customer.contact_name && <div className="opacity-90">Contact: {customer.contact_name}</div>}
                    {customer.email && <div className="opacity-90">Email: {customer.email}</div>}
                    {customer.phone && <div className="opacity-90">Phone: {customer.phone}</div>}
                    <Badge variant="outline" className="mt-1 border-white/30 bg-white/10 text-primary-foreground">
                      {customer.pricing_tier} tier
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-80">
                  <MapPin className="h-3.5 w-3.5" /> Shipping address
                </div>
                <textarea
                  rows={5}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Street, city, state, PIN"
                  className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-sm text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <div className="mt-3">
                  <Label className="text-xs font-semibold uppercase tracking-widest opacity-80">Warehouse</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className="mt-1 border-white/20 bg-white/10 text-primary-foreground">
                      <SelectValue placeholder="Pick warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          {/* Product entry rows */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Products</h2>
              <span className="text-xs text-muted-foreground">
                {filledLines.length} {filledLines.length === 1 ? "item" : "items"}
              </span>
            </div>

            {lines.map((line, idx) => {
              const v = line.variant_id ? variantById.get(line.variant_id) : null;
              const factor = uomFactor(line.uom, line.units_per_pack);
              const sub = lineSubtotal(line);
              const isBlank = !line.variant_id;
              return (
                <div
                  key={line.uid}
                  className={`group relative rounded-xl border bg-card p-4 shadow-sm transition-all ${
                    isBlank ? "border-dashed border-primary/40" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 grid gap-3 md:grid-cols-12 md:items-end">
                      {/* Search */}
                      <div className="md:col-span-5">
                        <Label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <Search className="h-3 w-3" /> Search product
                        </Label>
                        <SmartSelect
                          options={variantOptions}
                          value={line.variant_id || null}
                          onChange={(val) => {
                            const opt = variantOptions.find((o) => o.value === val);
                            patchLine(line.uid, {
                              variant_id: val ?? "",
                              unit_price: opt?.cost ?? 0,
                              units_per_pack: opt?.ups ?? 1,
                            });
                          }}
                          placeholder="Type product name or SKU…"
                          searchPlaceholder="Search products"
                          emptyText="No products found"
                        />
                      </div>

                      {/* SKU */}
                      <div className="md:col-span-2">
                        <Label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SKU</Label>
                        <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-xs text-muted-foreground">
                          {v?.sku ?? "—"}
                        </div>
                      </div>

                      {/* Qty */}
                      <div className="md:col-span-2">
                        <Label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qty</Label>
                        <div className="flex items-center rounded-md border border-input">
                          <button
                            type="button"
                            disabled={isBlank}
                            onClick={() => patchLine(line.uid, { qty: Math.max(1, line.qty - 1) })}
                            className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <Input
                            type="number"
                            min={1}
                            disabled={isBlank}
                            value={line.qty}
                            onChange={(e) => patchLine(line.uid, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-9 w-full border-0 text-center text-sm shadow-none focus-visible:ring-0"
                          />
                          <button
                            type="button"
                            disabled={isBlank}
                            onClick={() => patchLine(line.uid, { qty: line.qty + 1 })}
                            className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* UOM */}
                      <div className="md:col-span-2">
                        <Label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">UOM</Label>
                        <Select
                          value={line.uom}
                          onValueChange={(val) => patchLine(line.uid, { uom: val })}
                          disabled={isBlank}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UOM_OPTIONS.map((u) => (
                              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                            ))}
                            {line.units_per_pack > 1 && (
                              <SelectItem value="pack">Pack ({line.units_per_pack} ct)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subtotal */}
                      <div className="md:col-span-1">
                        <Label className="mb-1 block text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subtotal</Label>
                        <div className="flex h-9 items-center justify-end rounded-md bg-muted/30 px-3 font-mono text-sm font-semibold tabular-nums">
                          ₹{sub.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLine(line.uid)}
                      className="mt-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      aria-label="Remove row"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Editable wholesale price hint */}
                  {!isBlank && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{v?.name}</span>
                      <span className="opacity-60">·</span>
                      <label className="flex items-center gap-2">
                        Wholesale price ₹
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => patchLine(line.uid, { unit_price: Number(e.target.value) || 0 })}
                          className="h-7 w-24 text-xs"
                        />
                      </label>
                      <span className="opacity-60">·</span>
                      <span>{line.qty} × {factor} = <span className="font-mono">{line.qty * factor}</span> units</span>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        {/* RIGHT: Order summary */}
        <aside className="lg:sticky lg:top-4 h-fit space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-widest">Order Summary</h2>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-mono tabular-nums">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="font-mono tabular-nums">
                  {shipping === 0 ? <span className="text-emerald-600">Free</span> : `₹${shipping.toLocaleString("en-IN")}`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax (5%)</dt>
                <dd className="font-mono tabular-nums">₹{tax.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</dd>
              </div>
              <div className="my-3 h-px bg-border" />
              <div className="flex items-baseline justify-between">
                <dt className="text-base font-semibold">Order Total</dt>
                <dd className="font-mono text-xl font-bold tabular-nums text-primary">
                  ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2">
              <Button
                onClick={() => submitOrder(false)}
                disabled={saving || !canEdit}
                className="w-full gap-2"
                size="lg"
              >
                <Send className="h-4 w-4" /> {saving ? "Submitting…" : "Submit Order"}
              </Button>
              <Button
                onClick={() => submitOrder(true)}
                disabled={saving || !canEdit}
                variant="outline"
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" /> Save Draft
              </Button>
            </div>
          </section>

          <p className="px-2 text-center text-xs text-muted-foreground">
            Free shipping on orders above ₹5,000.
          </p>
        </aside>
      </div>
    </div>
  );
}