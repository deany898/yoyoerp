import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

interface VariantOpt {
  id: string;
  sku: string;
  variant_name: string;
  product_name: string;
}
interface StageOpt {
  id: string;
  stage_name: string;
  sequence: number;
  stage_kind: string;
}
interface ZoneOpt {
  id: string;
  name: string;
  warehouse_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: { variant_id?: string; from_stage_id?: string; to_stage_id?: string };
  onPosted: () => void;
}

/**
 * Stage handoff: move WIP from one production stage to the next.
 * The DB trigger handles inventory effects; this sheet only collects intent.
 */
export function HandoffSheet({ open, onOpenChange, prefill, onPosted }: Props) {
  const [variants, setVariants] = useState<VariantOpt[]>([]);
  const [stages, setStages] = useState<StageOpt[]>([]);
  const [zones, setZones] = useState<ZoneOpt[]>([]);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [fromStageId, setFromStageId] = useState<string | null>(null);
  const [toStageId, setToStageId] = useState<string | null>(null);
  const [fromZoneId, setFromZoneId] = useState<string | null>(null);
  const [toZoneId, setToZoneId] = useState<string | null>(null);
  const [qtyIn, setQtyIn] = useState("");
  const [qtyGood, setQtyGood] = useState("");
  const [qtyScrap, setQtyScrap] = useState("");
  const [qtyRework, setQtyRework] = useState("");
  const [qtyHold, setQtyHold] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [vRes, zRes] = await Promise.all([
        supabase
          .from("product_variants")
          .select("id, sku, variant_name, product:products(name)")
          .eq("is_active", true)
          .order("variant_name"),
        supabase
          .from("warehouse_zones")
          .select("id, name, warehouse:warehouses(name)")
          .order("name"),
      ]);
      type VRow = { id: string; sku: string; variant_name: string; product: { name: string } | null };
      type ZRow = { id: string; name: string; warehouse: { name: string } | null };
      setVariants(((vRes.data ?? []) as unknown as VRow[]).map((v) => ({
        id: v.id,
        sku: v.sku,
        variant_name: v.variant_name,
        product_name: v.product?.name ?? "—",
      })));
      setZones(((zRes.data ?? []) as unknown as ZRow[]).map((z) => ({
        id: z.id,
        name: z.name,
        warehouse_name: z.warehouse?.name ?? "—",
      })));
      if (prefill?.variant_id) setVariantId(prefill.variant_id);
      if (prefill?.from_stage_id) setFromStageId(prefill.from_stage_id);
      if (prefill?.to_stage_id) setToStageId(prefill.to_stage_id);
    })();
  }, [open, prefill?.variant_id, prefill?.from_stage_id, prefill?.to_stage_id]);

  // Load stages for the selected variant
  useEffect(() => {
    if (!variantId) {
      setStages([]);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("production_stages")
        .select("id, stage_name, sequence, stage_kind")
        .eq("variant_id", variantId)
        .order("sequence");
      setStages(data ?? []);
    })();
  }, [variantId]);

  const fromStage = useMemo(() => stages.find((s) => s.id === fromStageId), [stages, fromStageId]);
  const toStage = useMemo(() => stages.find((s) => s.id === toStageId), [stages, toStageId]);
  const isFirstStage = !fromStageId;
  const isFinalStage = !toStageId;

  const reset = () => {
    setVariantId(null);
    setFromStageId(null);
    setToStageId(null);
    setFromZoneId(null);
    setToZoneId(null);
    setQtyIn("");
    setQtyGood("");
    setQtyScrap("");
    setQtyRework("");
    setQtyHold("");
    setUnitCost("");
    setNotes("");
  };

  const save = async () => {
    if (!variantId) {
      notify.warning("Select a product variant");
      return;
    }
    if (isFirstStage && isFinalStage) {
      notify.warning("Pick a from-stage, to-stage, or both");
      return;
    }
    const good = Number(qtyGood) || 0;
    const inQty = Number(qtyIn) || good;
    if (good <= 0 && Number(qtyScrap) <= 0 && Number(qtyRework) <= 0 && Number(qtyHold) <= 0) {
      notify.warning("Enter at least one quantity");
      return;
    }
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("stage_handoffs").insert({
      variant_id: variantId,
      from_stage_id: fromStageId,
      to_stage_id: toStageId,
      is_first_stage: isFirstStage,
      is_final_stage: isFinalStage,
      qty_in: inQty,
      qty_good: good,
      qty_scrap: Number(qtyScrap) || 0,
      qty_rework: Number(qtyRework) || 0,
      qty_hold: Number(qtyHold) || 0,
      from_zone_id: fromZoneId,
      to_zone_id: toZoneId,
      unit_cost: Number(unitCost) || 0,
      notes: notes || null,
      created_by: user.user?.id ?? null,
      ho_number: "PENDING", // trigger reassigns; satisfies NOT NULL
    });
    setSaving(false);
    if (error) {
      notify.error("Could not post handoff", { description: error.message });
      return;
    }
    notify.success("Stage handoff posted");
    reset();
    onOpenChange(false);
    onPosted();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New stage handoff</SheetTitle>
          <SheetDescription>
            Move WIP between stages. Inventory updates automatically.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Product variant *
            </Label>
            <SmartSelect
              options={variants.map((v) => ({
                value: v.id,
                label: `${v.product_name} · ${v.variant_name}`,
                hint: v.sku,
              }))}
              value={variantId}
              onChange={setVariantId}
              placeholder="Search products…"
              searchPlaceholder="Type SKU or name…"
              emptyText="No active variants"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                From stage
              </Label>
              <SmartSelect
                options={stages.map((s) => ({
                  value: s.id,
                  label: `${s.sequence}. ${s.stage_name}`,
                  hint: s.stage_kind,
                }))}
                value={fromStageId}
                onChange={setFromStageId}
                placeholder="— first stage (raws)"
                emptyText={variantId ? "No stages defined" : "Pick a variant first"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                To stage
              </Label>
              <SmartSelect
                options={stages.map((s) => ({
                  value: s.id,
                  label: `${s.sequence}. ${s.stage_name}`,
                  hint: s.stage_kind,
                }))}
                value={toStageId}
                onChange={setToStageId}
                placeholder="— final stage (FG)"
                emptyText={variantId ? "No stages defined" : "Pick a variant first"}
              />
            </div>
          </div>

          {(fromStage || toStage) && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {isFirstStage ? (
                <>First-stage entry · raw components consumed via lines (optional)</>
              ) : isFinalStage ? (
                <>Final-stage exit · good qty becomes finished goods stock</>
              ) : (
                <>WIP transfer · {fromStage?.stage_name ?? "—"} → {toStage?.stage_name ?? "—"}</>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Qty consumed (in)
              </Label>
              <Input
                type="number"
                step="0.001"
                value={qtyIn}
                onChange={(e) => setQtyIn(e.target.value)}
                placeholder="Defaults to good qty"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Qty good *
              </Label>
              <Input
                type="number"
                step="0.001"
                value={qtyGood}
                onChange={(e) => setQtyGood(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Scrap
              </Label>
              <Input type="number" step="0.001" value={qtyScrap} onChange={(e) => setQtyScrap(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Rework
              </Label>
              <Input type="number" step="0.001" value={qtyRework} onChange={(e) => setQtyRework(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Hold
              </Label>
              <Input type="number" step="0.001" value={qtyHold} onChange={(e) => setQtyHold(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                From zone
              </Label>
              <SmartSelect
                options={zones.map((z) => ({ value: z.id, label: z.name, hint: z.warehouse_name }))}
                value={fromZoneId}
                onChange={setFromZoneId}
                placeholder="Optional"
                emptyText="No zones"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                To zone
              </Label>
              <SmartSelect
                options={zones.map((z) => ({ value: z.id, label: z.name, hint: z.warehouse_name }))}
                value={toZoneId}
                onChange={setToZoneId}
                placeholder="Optional"
                emptyText="No zones"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Unit cost (₹)
            </Label>
            <Input
              type="number"
              step="0.0001"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.0000"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notes
            </Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={2} />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Posting…" : "Post handoff"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}