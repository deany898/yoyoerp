import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useErpData";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { QuickOrderHeader, type CustomerLite } from "@/components/quick-order/QuickOrderHeader";
import { QuickActionsBar } from "@/components/quick-order/QuickActionsBar";
import { ProductGridRow } from "@/components/quick-order/ProductGridRow";
import { MobileLineCard } from "@/components/quick-order/MobileLineCard";
import { QuickOrderCustomerCard } from "@/components/quick-order/QuickOrderCustomerCard";
import { ProductSearchBox } from "@/components/quick-order/ProductSearchBox";
import { StickyTotals } from "@/components/quick-order/StickyTotals";
import type { ExtraCharge } from "@/components/quick-order/StickyTotals";
import { uomFactor, type PickerVariant } from "@/components/quick-order/types";
import { lineMath, loadTierPrices, resolvePrice, type TierPriceMap } from "@/lib/quick-order-pricing";
import {
  saveDraft, loadDraft, clearDraft, trackPick, getRecent, getFrequent,
  saveLastCustomer, loadLastCustomer,
  type DraftLine,
} from "@/lib/quick-order-store";

export const Route = createFileRoute("/app/quick-order")({
  component: QuickOrderPage,
  head: () => ({ meta: [{ title: "Quick Order · YOYO ERP" }] }),
});

function newLine(): DraftLine {
  return {
    uid: crypto.randomUUID(),
    variant_id: "", qty: 1, uom: "each",
    unit_price: 0, units_per_pack: 1,
    discount_pct: 0, tax_rate: 5,
  };
}

function QuickOrderPage() {
  const navigate = useNavigate();
  const { products } = useProducts();
  const { role } = useRole();
  const isCustomer = role === "customer";
  const canEdit = ["admin", "manager", "sales", "supervisor", "dispatch"].includes(role);
  const showCost = ["admin", "manager"].includes(role);

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [transporter, setTransporter] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [tierMap, setTierMap] = useState<TierPriceMap>({});
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecent());
  const [frequentIds, setFrequentIds] = useState<string[]>(() => getFrequent());
  const [saving, setSaving] = useState(false);

  // Bootstrap
  useEffect(() => {
    (async () => {
      const [custRes, numRes, tiers, imgs, stocks] = await Promise.all([
        supabase.from("customers")
          .select("id,code,name,contact_name,phone,city,delivery_address,billing_address,payment_terms,pricing_tier")
          .eq("is_active", true).order("name"),
        supabase.rpc("next_doc_number", { _doc_type: "DO" }),
        loadTierPrices(),
        supabase.from("product_images").select("product_id,url,is_primary,sort_order"),
        supabase.from("inventory_stock").select("variant_id,available,on_hand"),
      ]);
      if (custRes.error) toast.error("Failed to load customers", { description: custRes.error.message });
      setCustomers((custRes.data ?? []) as CustomerLite[]);
      if (!numRes.error && numRes.data) setOrderNumber(numRes.data as string);
      setTierMap(tiers);

      const im: Record<string, string> = {};
      ((imgs.data ?? []) as Array<{ product_id: string; url: string; is_primary: boolean; sort_order: number }>)
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
        .forEach((r) => { if (!im[r.product_id]) im[r.product_id] = r.url; });
      setImageMap(im);

      const sm: Record<string, number> = {};
      ((stocks.data ?? []) as Array<{ variant_id: string; available: number | null; on_hand: number }>)
        .forEach((r) => { sm[r.variant_id] = (sm[r.variant_id] ?? 0) + Number(r.available ?? r.on_hand ?? 0); });
      setStockMap(sm);

      // Restore draft
      const draft = loadDraft();
      if (draft && draft.lines.length > 0) {
        const fresh = Date.now() - draft.saved_at < 24 * 60 * 60 * 1000;
        if (fresh) {
          setCustomerId(draft.customer_id);
          setShippingAddress(draft.shipping_address);
          setPaymentTerms(draft.payment_terms);
          setLines(draft.lines.length ? [...draft.lines, newLine()] : [newLine()]);
          toast.info("Restored draft", { description: "Continuing your last unsaved order" });
        }
      }

      // Prefill last-used customer details (for repeat orders)
      const last = loadLastCustomer();
      if (last) {
        setCustomerId((prev) => prev || last.customer_id || "");
        setCustomerName((prev) => prev || last.name || "");
        setPhone((prev) => prev || last.phone || "");
        setTransporter((prev) => prev || last.transporter || "");
        setCity((prev) => prev || last.city || "");
        setNote((prev) => prev || last.note || "");
        setShippingAddress((prev) => prev || last.shipping_address || "");
        setPaymentTerms((prev) => prev || last.payment_terms || "");
      }
    })();
  }, []);

  const customer = useMemo(() => customers.find((c) => c.id === customerId) ?? null, [customers, customerId]);
  const tier = customer?.pricing_tier ?? "standard";

  // When customer changes, prefill shipping/terms/name/phone/etc.
  useEffect(() => {
    if (!customer) return;
    setCustomerName(customer.name);
    if (customer.phone) setPhone(customer.phone);
    if (!shippingAddress) setShippingAddress(customer.delivery_address ?? "");
    if (!paymentTerms && customer.payment_terms) setPaymentTerms(customer.payment_terms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  // Build picker variants
  const variants: PickerVariant[] = useMemo(() => {
    return products.flatMap((p) =>
      (p.variants ?? [])
        .filter((v) => v.is_active)
        .map((v) => {
          const cost = Number(v.effective_cost ?? v.avg_cost ?? 0);
          return {
            id: v.id,
            product_id: p.id,
            product_name: p.name,
            variant_name: v.variant_name,
            sku: v.sku,
            cost,
            units_per_pack: Number(v.units_per_pack ?? 1),
            image_url: imageMap[p.id] ?? null,
            stock: stockMap[v.id] ?? 0,
            tier_price: resolvePrice(v.id, tier, cost, tierMap),
          };
        }),
    );
  }, [products, imageMap, stockMap, tierMap, tier]);

  const variantsById = useMemo(() => {
    const m = new Map<string, PickerVariant>();
    variants.forEach((v) => m.set(v.id, v));
    return m;
  }, [variants]);

  // Auto-save draft
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const filled = lines.filter((l) => l.variant_id);
      if (customerId || filled.length > 0) {
        saveDraft({
          customer_id: customerId, warehouse_id: "",
          shipping_address: shippingAddress, payment_terms: paymentTerms,
          lines: filled, saved_at: Date.now(),
        });
      }
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [customerId, shippingAddress, paymentTerms, lines]);

  function patchLine(uid: string, p: Partial<DraftLine>) {
    setLines((prev) => {
      const next = prev.map((l) => (l.uid === uid ? { ...l, ...p } : l));
      const last = next[next.length - 1];
      if (last?.variant_id) next.push(newLine());
      return next;
    });
  }
  function pickInRow(uid: string, v: PickerVariant) {
    trackPick(v.id);
    setRecentIds(getRecent()); setFrequentIds(getFrequent());
    patchLine(uid, {
      variant_id: v.id, unit_price: v.tier_price,
      units_per_pack: v.units_per_pack, uom: "each",
    });
  }
  function appendVariant(v: PickerVariant) {
    trackPick(v.id);
    setRecentIds(getRecent()); setFrequentIds(getFrequent());
    setLines((prev) => {
      const blankIdx = prev.findIndex((l) => !l.variant_id);
      const filled: DraftLine = {
        ...newLine(),
        variant_id: v.id, unit_price: v.tier_price,
        units_per_pack: v.units_per_pack,
      };
      if (blankIdx >= 0) {
        const next = [...prev];
        next[blankIdx] = { ...filled, uid: prev[blankIdx].uid };
        if (!next.some((l) => !l.variant_id)) next.push(newLine());
        return next;
      }
      return [...prev, filled, newLine()];
    });
  }
  function duplicateLine(uid: string) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.uid === uid);
      if (idx < 0 || !prev[idx].variant_id) return prev;
      const dup: DraftLine = { ...prev[idx], uid: crypto.randomUUID() };
      const next = [...prev.slice(0, idx + 1), dup, ...prev.slice(idx + 1)];
      if (!next.some((l) => !l.variant_id)) next.push(newLine());
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

  // Totals
  const filled = lines.filter((l) => l.variant_id && l.qty > 0);
  const totals = useMemo(() => {
    let subtotal = 0, discount = 0, tax = 0, units = 0;
    for (const l of filled) {
      const factor = uomFactor(l.uom, l.units_per_pack);
      const m = lineMath({ qty: l.qty, unitPrice: l.unit_price, factor, discountPct: l.discount_pct, taxRate: l.tax_rate });
      subtotal += m.gross; discount += m.discount; tax += m.tax;
      units += l.qty * factor;
    }
    const net = subtotal - discount;
    const chargesTotal = extraCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    return {
      subtotal,
      discount,
      tax,
      shipping: 0,
      units,
      total: net + tax + chargesTotal,
      chargesTotal,
    };
  }, [filled, extraCharges]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") { e.preventDefault(); submit(true); }
      else if (meta && e.key === "Enter") { e.preventDefault(); submit(false); }
      else if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const last = filled[filled.length - 1];
        if (last) duplicateLine(last.uid);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled]);

  async function submit(asDraft: boolean) {
    if (!canEdit) { toast.error("You don't have permission"); return; }
    if (!customerId && !customerName.trim()) { toast.error("Enter a customer name"); return; }
    if (filled.length === 0) { toast.error("Add at least one product"); return; }
    setSaving(true);

    // If no saved customer chosen, create a new one with the entered details
    let effectiveCustomerId = customerId;
    if (!effectiveCustomerId) {
      const code = "C" + Date.now().toString(36).toUpperCase().slice(-6);
      const { data: newCust, error: custErr } = await supabase
        .from("customers")
        .insert({
          code,
          name: customerName.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          transporter: transporter.trim() || null,
          notes: note.trim() || null,
          delivery_address: shippingAddress.trim() || null,
          payment_terms: paymentTerms.trim() || null,
        })
        .select("id")
        .single();
      if (custErr || !newCust) {
        setSaving(false);
        toast.error("Could not save customer", { description: custErr?.message });
        return;
      }
      effectiveCustomerId = newCust.id;
    }

    let doNumber = orderNumber;
    if (!doNumber) {
      const { data, error } = await supabase.rpc("next_doc_number", { _doc_type: "DO" });
      if (error || !data) { setSaving(false); toast.error("Number gen failed", { description: error?.message }); return; }
      doNumber = data as string;
    }
    const header = {
      do_number: doNumber, customer_id: effectiveCustomerId,
      warehouse_id: null,
      status: asDraft ? "draft" as const : "pending_approval" as const,
      delivery_address: shippingAddress || null,
      pricing_tier: tier,
      subtotal: totals.subtotal, discount_total: totals.discount,
      tax_total: totals.tax, freight_cost: totals.shipping,
      grand_total: totals.total,
      packing_cost: 0,
      other_charges: totals.chargesTotal,
      extra_charges: extraCharges,
    };
    const { data: ins, error: insErr } = await supabase
      .from("dispatch_orders").insert(header).select("id").single();
    if (insErr || !ins) { setSaving(false); toast.error("Save failed", { description: insErr?.message }); return; }

    const linePayload = filled.map((l) => {
      const factor = uomFactor(l.uom, l.units_per_pack);
      const m = lineMath({ qty: l.qty, unitPrice: l.unit_price, factor, discountPct: l.discount_pct, taxRate: l.tax_rate });
      const v = variantsById.get(l.variant_id);
      return {
        dispatch_order_id: ins.id, variant_id: l.variant_id,
        qty: l.qty * factor, uom: l.uom,
        unit_price: l.unit_price, wholesale_price: v?.tier_price ?? l.unit_price,
        unit_cost: v?.cost ?? 0,
        discount_type: "percent" as const, discount_value: l.discount_pct,
        tax_rate: l.tax_rate, line_total: m.total,
      };
    });
    const { error: linesErr } = await supabase.from("dispatch_order_lines").insert(linePayload);
    setSaving(false);
    if (linesErr) { toast.error("Failed to save lines", { description: linesErr.message }); return; }
    clearDraft();
    // Persist last-used customer details for next visit
    saveLastCustomer({
      customer_id: effectiveCustomerId,
      name: customerName.trim(),
      phone: phone.trim(),
      transporter: transporter.trim(),
      city: city.trim(),
      note: note.trim(),
      shipping_address: shippingAddress.trim(),
      payment_terms: paymentTerms.trim(),
    });
    toast.success(asDraft ? "Draft saved" : "Order submitted");
    navigate({ to: "/app/dispatch-orders" });
  }

  const recentVariants = recentIds.map((id) => variantsById.get(id)).filter(Boolean) as PickerVariant[];
  const frequentVariants = frequentIds.map((id) => variantsById.get(id)).filter(Boolean) as PickerVariant[];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] flex-col gap-3 pb-24">
      {/* Desktop: light header with shipping + terms + DO number (no customer field — captured below) */}
      <div className="hidden md:block">
        <QuickOrderHeader
          customers={customers}
          customerId={customerId}
          shippingAddress={shippingAddress} paymentTerms={paymentTerms}
          orderNumber={orderNumber}
          hideCustomer
          onCustomer={setCustomerId}
          onShipping={setShippingAddress} onPaymentTerms={setPaymentTerms}
        />
      </div>

      {/* Customer capture card · works on every screen, saves a new customer on submit if not picked */}
      {!isCustomer && (
        <QuickOrderCustomerCard
          customers={customers}
          customerId={customerId}
          customerName={customerName}
          phone={phone}
          transporter={transporter}
          city={city}
          note={note}
          shippingAddress={shippingAddress}
          orderNumber={orderNumber}
          onPickCustomer={(c) => {
            setCustomerId(c?.id ?? "");
            if (c) {
              setCustomerName(c.name);
              if (c.phone) setPhone(c.phone);
              if (c.city) setCity(c.city);
              if (c.delivery_address) setShippingAddress(c.delivery_address);
              if (c.payment_terms) setPaymentTerms(c.payment_terms);
            }
          }}
          onName={setCustomerName}
          onPhone={setPhone}
          onTransporter={setTransporter}
          onCity={setCity}
          onNote={setNote}
          onShipping={setShippingAddress}
        />
      )}

      <QuickActionsBar
        recent={recentVariants} frequent={frequentVariants}
        onAdd={appendVariant} hasLastOrder={false}
      />

      {/* Desktop spreadsheet */}
      <section className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-[110px]" />
            <col className="w-[110px]" />
            <col className="w-[110px]" />
            <col className="w-[80px]" />
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <col className="w-[60px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <th className="py-2 text-center">#</th>
              <th className="px-1.5 text-left">Product</th>
              <th className="px-1.5 text-center">Qty</th>
              <th className="px-1.5 text-left">UOM</th>
              <th className="px-1.5 text-right">Price ₹</th>
              <th className="px-1.5 text-right">Disc</th>
              <th className="px-1.5 text-right">Tax</th>
              <th className="px-1.5 text-right">Total</th>
              <th className="px-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <ProductGridRow
                key={line.uid} index={idx} line={line}
                variants={variants} variantsById={variantsById}
                recentIds={recentIds} frequentIds={frequentIds}
                showCost={showCost}
                onChange={(p) => patchLine(line.uid, p)}
                onPick={(v) => pickInRow(line.uid, v)}
                onDuplicate={() => duplicateLine(line.uid)}
                onRemove={() => removeLine(line.uid)}
              />
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {filled.length} {filled.length === 1 ? "item" : "items"} · keyboard · Enter to add row · Cmd/Ctrl+D duplicate · Cmd/Ctrl+S draft · Cmd/Ctrl+Enter submit
          </span>
          <Button
            size="sm" variant="ghost"
            onClick={() => setLines((p) => [...p, newLine()])}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </Button>
        </div>
      </section>

      {/* Mobile dense cards */}
      <section className="flex flex-col gap-2 md:hidden">
        {filled.map((line, idx) => (
          <MobileLineCard
            key={line.uid} index={idx} line={line}
            variant={variantsById.get(line.variant_id) ?? null}
            showCost={showCost}
            onChange={(p) => patchLine(line.uid, p)}
            onRemove={() => removeLine(line.uid)}
          />
        ))}
        {/* Always-visible inline product search to add the next product */}
        <ProductSearchBox
          variants={variants}
          recentIds={recentIds}
          onPick={appendVariant}
          placeholder={filled.length === 0 ? "Search & add first product…" : "Add another product…"}
        />
      </section>

      <StickyTotals
        total={totals.total}
        charges={extraCharges}
        onAddCharge={(label, amount) =>
          setExtraCharges((prev) => [...prev, { id: crypto.randomUUID(), label, amount }])
        }
        onRemoveCharge={(id) => setExtraCharges((prev) => prev.filter((c) => c.id !== id))}
        saving={saving} canEdit={canEdit}
        onSubmit={() => submit(false)} onSaveDraft={() => submit(true)}
      />
    </div>
  );
}