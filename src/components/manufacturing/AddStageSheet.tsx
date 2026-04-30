import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import type { Database } from "@/integrations/supabase/types";

type StageKind = Database["public"]["Enums"]["stage_kind"];
type PayMode = "salary" | "per_unit";

type Product = { id: string; code: string; name: string };
type Variant = { id: string; product_id: string; sku: string; variant_name: string };

interface Props {
  open: boolean;
  onClose: () => void;
  /** "product" → write to production_stages · "group" → write to stage_group_lines */
  mode: "product" | "group";
  /** When mode="group", the target group id. */
  groupId?: string;
  /** Pre-selected product id (optional). */
  defaultProductId?: string;
  onSaved?: () => void;
}

const STAGE_KINDS: { value: StageKind; label: string }[] = [
  { value: "moulding", label: "Moulding" },
  { value: "assembly", label: "Assembly" },
  { value: "packing", label: "Packing" },
  { value: "qc", label: "Quality check" },
  { value: "other", label: "Other" },
];

export function AddStageSheet({ open, onClose, mode, groupId, defaultProductId, onSaved }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [productId, setProductId] = useState<string | null>(defaultProductId ?? null);
  const [variantIds, setVariantIds] = useState<string[]>([]);
  const [stageName, setStageName] = useState("");
  const [stageKind, setStageKind] = useState<StageKind>("moulding");
  const [payMode, setPayMode] = useState<PayMode>("per_unit");
  const [unitCost, setUnitCost] = useState<string>("");
  const [labourCost, setLabourCost] = useState<string>("");
  const [machineCost, setMachineCost] = useState<string>("");
  const [overheadCost, setOverheadCost] = useState<string>("");
  const [rejectionPct, setRejectionPct] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Load products & variants once when sheet opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from("products").select("id, code, name").eq("is_active", true).order("name"),
        supabase.from("product_variants").select("id, product_id, sku, variant_name").eq("is_active", true).order("variant_name"),
      ]);
      setProducts((p ?? []) as Product[]);
      setVariants((v ?? []) as Variant[]);
    })();
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setProductId(defaultProductId ?? null);
    setVariantIds([]);
    setStageName("");
    setStageKind("moulding");
    setPayMode("per_unit");
    setUnitCost("");
    setLabourCost("");
    setMachineCost("");
    setOverheadCost("");
    setRejectionPct("");
  }, [open, defaultProductId]);

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.name, hint: p.code })),
    [products],
  );
  const productVariants = useMemo(
    () => (productId ? variants.filter((v) => v.product_id === productId) : []),
    [variants, productId],
  );

  const toggleVariant = (id: string) => {
    setVariantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canSubmit =
    !!stageName.trim() &&
    (mode === "group" ? !!groupId : !!productId && variantIds.length > 0) &&
    (payMode === "per_unit" ? Number(unitCost) >= 0 && unitCost !== "" : Number(labourCost) >= 0);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const base = {
        stage_name: stageName.trim(),
        stage_kind: stageKind,
        pay_mode: payMode,
        unit_cost: payMode === "per_unit" ? Number(unitCost || 0) : 0,
        labour_cost: payMode === "salary" ? Number(labourCost || 0) : Number(unitCost || 0),
        machine_cost: Number(machineCost || 0),
        overhead_cost: Number(overheadCost || 0),
        rejection_pct: Number(rejectionPct || 0),
      };

      if (mode === "group") {
        // Find next sequence
        const { data: last } = await supabase
          .from("stage_group_lines")
          .select("sequence")
          .eq("group_id", groupId!)
          .order("sequence", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextSeq = (last?.sequence ?? 0) + 1;
        const { error } = await supabase.from("stage_group_lines").insert({
          ...base,
          group_id: groupId!,
          sequence: nextSeq,
        });
        if (error) throw error;
      } else {
        // Insert one row per selected variant, sequence per variant
        const rows = await Promise.all(
          variantIds.map(async (vid) => {
            const { data: last } = await supabase
              .from("production_stages")
              .select("sequence")
              .eq("variant_id", vid)
              .order("sequence", { ascending: false })
              .limit(1)
              .maybeSingle();
            return { ...base, variant_id: vid, sequence: (last?.sequence ?? 0) + 1 };
          }),
        );
        const { error } = await supabase.from("production_stages").insert(rows);
        if (error) throw error;
      }
      notify.success("Stage added");
      onSaved?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save stage";
      notify.error("Could not add stage", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Add stage</SheetTitle>
          <SheetDescription>
            {mode === "group"
              ? "This stage will auto-apply to every product linked to the group."
              : "Pick a product, then choose the variations this stage applies to."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {mode === "product" && (
            <section className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1 · Product</Label>
              <SmartSelect
                options={productOptions}
                value={productId}
                onChange={(v) => { setProductId(v); setVariantIds([]); }}
                placeholder="Search and select a product…"
                searchPlaceholder="Type product name or code"
              />
              {productId && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Apply to variations</p>
                  {productVariants.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active variations for this product.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {productVariants.map((v) => {
                        const active = variantIds.includes(v.id);
                        return (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => toggleVariant(v.id)}
                            className={
                              "rounded-full border px-3 py-1 text-xs transition " +
                              (active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:bg-muted")
                            }
                          >
                            {v.variant_name}
                            <span className="ml-1.5 font-mono opacity-70">{v.sku}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setVariantIds(productVariants.map((v) => v.id))}
                        className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        Select all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {mode === "product" ? "2" : "1"} · Stage
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="stage-name" className="text-xs">Stage name</Label>
                <Input id="stage-name" value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="e.g. Injection moulding" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={stageKind} onValueChange={(v) => setStageKind(v as StageKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {mode === "product" ? "3" : "2"} · Pay mode
            </Label>
            <RadioGroup value={payMode} onValueChange={(v) => setPayMode(v as PayMode)} className="grid gap-2 sm:grid-cols-2">
              <label className={"flex cursor-pointer items-start gap-3 rounded-lg border p-3 " + (payMode === "salary" ? "border-primary bg-primary/5" : "border-border")}>
                <RadioGroupItem value="salary" id="pm-salary" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pay by salary</p>
                  <p className="text-xs text-muted-foreground">Fixed labour cost per run, regardless of units.</p>
                </div>
              </label>
              <label className={"flex cursor-pointer items-start gap-3 rounded-lg border p-3 " + (payMode === "per_unit" ? "border-primary bg-primary/5" : "border-border")}>
                <RadioGroupItem value="per_unit" id="pm-unit" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pay per unit</p>
                  <p className="text-xs text-muted-foreground">Cost charged for each produced unit.</p>
                </div>
              </label>
            </RadioGroup>

            <div className="grid gap-3 sm:grid-cols-2">
              {payMode === "per_unit" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="unit-cost" className="text-xs">Unit cost (₹)</Label>
                  <Input id="unit-cost" type="number" step="0.01" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0.00" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="labour-cost" className="text-xs">Labour cost (₹ / unit avg)</Label>
                  <Input id="labour-cost" type="number" step="0.01" min="0" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} placeholder="0.00" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="machine-cost" className="text-xs">Machine cost (₹)</Label>
                <Input id="machine-cost" type="number" step="0.01" min="0" value={machineCost} onChange={(e) => setMachineCost(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="overhead-cost" className="text-xs">Overhead (₹)</Label>
                <Input id="overhead-cost" type="number" step="0.01" min="0" value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rej" className="text-xs">Rejection %</Label>
                <Input id="rej" type="number" step="0.1" min="0" value={rejectionPct} onChange={(e) => setRejectionPct(e.target.value)} placeholder="0.0" />
              </div>
            </div>
          </section>

          {mode === "product" && variantIds.length > 0 && (
            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              This stage will be added to <Badge variant="outline" className="mx-1">{variantIds.length}</Badge> variation{variantIds.length > 1 ? "s" : ""}.
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || saving}>{saving ? "Saving…" : "Add stage"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}