import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VariantCard, type VariantDraft } from "./VariantCard";

interface Props {
  variants: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
}

/**
 * List of editable variants under one parent product.
 * Each variant card holds: name, prices, bulk slabs, inventory defaults, note.
 */
export function VariantsEditor({ variants, onChange }: Props) {
  const addVariant = () => {
    onChange([
      ...variants,
      {
        key: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        variant_name: "",
        is_active: true,
        standard_price: 0,
        dealer_price: 0,
        reorder_point: 0,
        safety_stock: 0,
        reorder_qty: 0,
        slabs: [],
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variants</div>
          <div className="text-[11px] text-muted-foreground">Each variant is one buyable version with its own price, DP, and bulk slabs.</div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addVariant} className="gap-1">
          <Plus className="h-4 w-4" /> Add variant
        </Button>
      </div>
      <div className="space-y-3">
        {variants.map((v, i) => (
          <VariantCard
            key={v.key}
            variant={v}
            defaultOpen={i === 0}
            canRemove={variants.length > 1}
            onChange={(next) => onChange(variants.map((x) => (x.key === v.key ? next : x)))}
            onRemove={() => onChange(variants.filter((x) => x.key !== v.key))}
          />
        ))}
      </div>
      {variants.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No variants yet · click "Add variant" to start (e.g. Regular, Premium, Box, Carton).
        </div>
      )}
    </div>
  );
}