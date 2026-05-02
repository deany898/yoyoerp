import { useState } from "react";
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** One bulk-buy slab row inside a variant. */
export interface BulkSlabDraft {
  /** Stable client-side key. Real DB id when persisted. */
  key: string;
  id?: string;
  label: string; // e.g. "10 Box (100 unit)" — saved as tier_name
  min_qty: number;
  price: number;
}

/** A draft variant being edited in the form (not yet persisted). */
export interface VariantDraft {
  key: string;
  id?: string; // existing variant id if editing
  variant_name: string;
  is_active: boolean;
  note?: string;
  standard_price: number; // tier_name='standard', min_qty=1
  dealer_price: number;   // tier_name='dealer',   min_qty=1
  reorder_point: number;
  safety_stock: number;
  reorder_qty: number;
  slabs: BulkSlabDraft[];
}

interface Props {
  variant: VariantDraft;
  onChange: (next: VariantDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
  defaultOpen?: boolean;
}

/** Atomic editor for one variant + its bulk slabs. */
export function VariantCard({ variant, onChange, onRemove, canRemove, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? !variant.id);
  const update = (patch: Partial<VariantDraft>) => onChange({ ...variant, ...patch });

  const addSlab = () => {
    const nextQty = (variant.slabs.at(-1)?.min_qty ?? 0) + 10 || 10;
    update({
      slabs: [
        ...variant.slabs,
        { key: `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: `${nextQty} Box`, min_qty: nextQty, price: 0 },
      ],
    });
  };
  const updateSlab = (key: string, patch: Partial<BulkSlabDraft>) =>
    update({ slabs: variant.slabs.map((s) => (s.key === key ? { ...s, ...patch } : s)) });
  const removeSlab = (key: string) => update({ slabs: variant.slabs.filter((s) => s.key !== key) });

  return (
    <div className={cn(
      "rounded-xl border bg-card transition",
      variant.is_active ? "border-border" : "border-dashed border-muted-foreground/40 opacity-70",
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Input
          value={variant.variant_name}
          onChange={(e) => update({ variant_name: e.target.value })}
          placeholder="Variant name · e.g. Regular, Premium, Box, Carton"
          className="h-8 max-w-[260px] font-semibold"
        />
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch checked={variant.is_active} onCheckedChange={(v) => update({ is_active: v })} />
            <span>{variant.is_active ? "Active" : "Inactive"}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            disabled={!canRemove}
            title={canRemove ? "Remove variant" : "At least one variant is required"}
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-3">
          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Standard price (₹)</Label>
              <Input type="number" min={0} step="0.01" value={variant.standard_price}
                onChange={(e) => update({ standard_price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Dealer price · DP (₹)</Label>
              <Input type="number" min={0} step="0.01" value={variant.dealer_price}
                onChange={(e) => update({ dealer_price: Number(e.target.value) })} />
            </div>
          </div>

          {/* Bulk slabs */}
          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Bulk buy slabs</span>
              <Button type="button" size="sm" variant="ghost" onClick={addSlab} className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add slab
              </Button>
            </div>
            {variant.slabs.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                No bulk slabs yet · click "Add slab" to add quantity-based pricing.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Header row · desktop */}
                <div className="hidden grid-cols-[1fr_90px_110px_36px] gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                  <div>Label</div>
                  <div>Min qty</div>
                  <div>Price (₹)</div>
                  <div></div>
                </div>
                {variant.slabs.map((s) => (
                  <div key={s.key} className="grid grid-cols-2 gap-2 px-3 py-2 sm:grid-cols-[1fr_90px_110px_36px] sm:items-center sm:gap-2">
                    <Input
                      value={s.label}
                      onChange={(e) => updateSlab(s.key, { label: e.target.value })}
                      placeholder="10 Box (100 unit)"
                      className="h-8 col-span-2 sm:col-span-1"
                    />
                    <Input
                      type="number" min={1} step="1" value={s.min_qty}
                      onChange={(e) => updateSlab(s.key, { min_qty: Number(e.target.value) })}
                      className="h-8" placeholder="Min qty"
                    />
                    <Input
                      type="number" min={0} step="0.01" value={s.price}
                      onChange={(e) => updateSlab(s.key, { price: Number(e.target.value) })}
                      className="h-8" placeholder="Price"
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      onClick={() => removeSlab(s.key)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory defaults */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Reorder point</Label>
              <Input type="number" min={0} value={variant.reorder_point}
                onChange={(e) => update({ reorder_point: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Safety stock</Label>
              <Input type="number" min={0} value={variant.safety_stock}
                onChange={(e) => update({ safety_stock: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Reorder qty</Label>
              <Input type="number" min={0} value={variant.reorder_qty}
                onChange={(e) => update({ reorder_qty: Number(e.target.value) })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Note · optional</Label>
            <Input value={variant.note ?? ""}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="Internal note for this variant" />
          </div>
        </div>
      )}
    </div>
  );
}