import { Minus, Plus, Copy, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProductInlinePicker } from "./ProductInlinePicker";
import { UOM_OPTIONS, uomFactor, type PickerVariant } from "./types";
import { lineMath } from "@/lib/quick-order-pricing";
import type { DraftLine } from "@/lib/quick-order-store";

interface Props {
  index: number;
  line: DraftLine;
  variants: PickerVariant[];
  variantsById: Map<string, PickerVariant>;
  recentIds: string[];
  frequentIds: string[];
  showCost: boolean;
  onChange: (patch: Partial<DraftLine>) => void;
  onPick: (v: PickerVariant) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function ProductGridRow({
  index, line, variants, variantsById, recentIds, frequentIds, showCost,
  onChange, onPick, onDuplicate, onRemove,
}: Props) {
  const v = line.variant_id ? variantsById.get(line.variant_id) ?? null : null;
  const factor = uomFactor(line.uom, line.units_per_pack);
  const m = lineMath({
    qty: line.qty, unitPrice: line.unit_price, factor,
    discountPct: line.discount_pct, taxRate: line.tax_rate,
  });
  const cost = v?.cost ?? 0;
  const margin = line.unit_price > 0 ? ((line.unit_price - cost) / line.unit_price) * 100 : 0;
  const marginColor = margin < 0
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : margin < 8
    ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-muted/30">
      <td className="w-8 py-1.5 pl-2 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</td>

      {/* Product */}
      <td className="px-1.5 py-1.5 min-w-[260px]">
        <ProductInlinePicker
          variants={variants}
          recentIds={recentIds}
          frequentIds={frequentIds}
          selected={v}
          onPick={onPick}
          compact
        />
        {v && (
          <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
            {v.sku}{v.units_per_pack > 1 && <> · {v.units_per_pack}/pack</>}
            {showCost && cost > 0 && <> · cost ₹{cost.toFixed(2)}</>}
          </div>
        )}
      </td>

      {/* Qty */}
      <td className="w-[110px] px-1.5 py-1.5">
        <div className="flex h-8 items-center rounded-md border border-input">
          <button type="button" onClick={() => onChange({ qty: Math.max(1, line.qty - 1) })} className="flex h-full w-7 items-center justify-center text-muted-foreground hover:text-foreground"><Minus className="h-3 w-3" /></button>
          <Input
            type="number" inputMode="decimal" min={1} value={line.qty}
            onChange={(e) => onChange({ qty: Math.max(1, Number(e.target.value) || 1) })}
            className="h-7 w-full border-0 px-0 text-center text-sm shadow-none focus-visible:ring-0"
          />
          <button type="button" onClick={() => onChange({ qty: line.qty + 1 })} className="flex h-full w-7 items-center justify-center text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></button>
        </div>
      </td>

      {/* UOM */}
      <td className="w-[110px] px-1.5 py-1.5">
        <Select value={line.uom} onValueChange={(val) => onChange({ uom: val })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {UOM_OPTIONS.map((u) => (
              <SelectItem key={u.value} value={u.value} className="text-xs">{u.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Price */}
      <td className="w-[110px] px-1.5 py-1.5">
        <Input
          type="number" step="0.01" inputMode="decimal" value={line.unit_price}
          onChange={(e) => onChange({ unit_price: Number(e.target.value) || 0 })}
          className="h-8 text-right font-mono text-xs tabular-nums"
        />
      </td>

      {/* Discount */}
      <td className="w-[80px] px-1.5 py-1.5">
        <div className="relative">
          <Input
            type="number" step="0.5" min={0} max={100} inputMode="decimal" value={line.discount_pct}
            onChange={(e) => onChange({ discount_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            className="h-8 pr-5 text-right font-mono text-xs tabular-nums"
          />
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
        </div>
      </td>

      {/* Tax */}
      <td className="w-[80px] px-1.5 py-1.5">
        <div className="relative">
          <Input
            type="number" step="0.5" min={0} max={50} inputMode="decimal" value={line.tax_rate}
            onChange={(e) => onChange({ tax_rate: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })}
            className="h-8 pr-5 text-right font-mono text-xs tabular-nums"
          />
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
        </div>
      </td>

      {/* Total */}
      <td className="w-[120px] px-1.5 py-1.5 text-right">
        <div className="font-mono text-sm font-semibold tabular-nums">₹{m.total.toFixed(0)}</div>
        {showCost && cost > 0 && line.variant_id && (
          <Badge variant="outline" className={cn("mt-0.5 inline-flex h-4 items-center gap-1 px-1 text-[9px]", marginColor)}>
            {margin < 0 && <AlertTriangle className="h-2.5 w-2.5" />} {margin.toFixed(0)}%
          </Badge>
        )}
      </td>

      {/* Actions */}
      <td className="w-[60px] px-1.5 py-1.5">
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={onDuplicate}
            disabled={!line.variant_id}
            title="Duplicate row (Ctrl+D)"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          ><Copy className="h-3.5 w-3.5" /></button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove row"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          ><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}