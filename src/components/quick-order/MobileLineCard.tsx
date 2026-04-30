import { useState } from "react";
import { Minus, Plus, Trash2, ChevronDown, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { uomFactor, UOM_OPTIONS, type PickerVariant } from "./types";
import { lineMath } from "@/lib/quick-order-pricing";
import type { DraftLine } from "@/lib/quick-order-store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  index: number;
  line: DraftLine;
  variant: PickerVariant | null;
  showCost: boolean;
  onChange: (p: Partial<DraftLine>) => void;
  onRemove: () => void;
}

export function MobileLineCard({ index, line, variant, showCost, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const factor = uomFactor(line.uom, line.units_per_pack);
  const m = lineMath({
    qty: line.qty, unitPrice: line.unit_price, factor,
    discountPct: line.discount_pct, taxRate: line.tax_rate,
  });
  const cost = variant?.cost ?? 0;
  const margin = line.unit_price > 0 ? ((line.unit_price - cost) / line.unit_price) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 p-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{variant?.product_name ?? "—"}</div>
          <div className="truncate text-[11px] text-muted-foreground">{variant?.variant_name} · <span className="font-mono">{variant?.sku}</span></div>
        </div>
        <div className="flex items-center rounded-md border border-input">
          <button onClick={() => onChange({ qty: Math.max(1, line.qty - 1) })} className="flex h-7 w-7 items-center justify-center"><Minus className="h-3 w-3" /></button>
          <Input
            type="number" inputMode="decimal" min={1} value={line.qty}
            onChange={(e) => onChange({ qty: Math.max(1, Number(e.target.value) || 1) })}
            className="h-7 w-10 border-0 px-0 text-center text-sm shadow-none focus-visible:ring-0"
          />
          <button onClick={() => onChange({ qty: line.qty + 1 })} className="flex h-7 w-7 items-center justify-center"><Plus className="h-3 w-3" /></button>
        </div>
        <button
          type="button" onClick={() => setOpen((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-2.5 py-1.5 text-xs">
        <span className="text-muted-foreground">{line.qty} × {factor} = <span className="font-mono">{line.qty * factor}</span> units</span>
        <span className="font-mono text-sm font-semibold tabular-nums">₹{m.total.toFixed(0)}</span>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-2 border-t border-border p-2.5 text-xs">
          <Field label="Price">
            <Input type="number" step="0.01" inputMode="decimal" value={line.unit_price}
              onChange={(e) => onChange({ unit_price: Number(e.target.value) || 0 })}
              className="h-8 text-right font-mono text-xs" />
          </Field>
          <Field label="UOM">
            <Select value={line.uom} onValueChange={(v) => onChange({ uom: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UOM_OPTIONS.map((u) => <SelectItem key={u.value} value={u.value} className="text-xs">{u.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Discount %">
            <Input type="number" step="0.5" inputMode="decimal" value={line.discount_pct}
              onChange={(e) => onChange({ discount_pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              className="h-8 text-right font-mono text-xs" />
          </Field>
          <Field label="Tax %">
            <Input type="number" step="0.5" inputMode="decimal" value={line.tax_rate}
              onChange={(e) => onChange({ tax_rate: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })}
              className="h-8 text-right font-mono text-xs" />
          </Field>
          <div className="col-span-2 flex items-center justify-between pt-1">
            {showCost && cost > 0 ? (
              <Badge variant="outline" className={cn(
                "h-5 px-1.5 text-[10px]",
                margin < 0 ? "border-destructive/30 text-destructive" :
                margin < 8 ? "border-amber-500/30 text-amber-700" :
                "border-emerald-500/30 text-emerald-700",
              )}>
                {margin < 0 && <AlertTriangle className="mr-1 h-2.5 w-2.5" />} Margin {margin.toFixed(0)}%
              </Badge>
            ) : <span />}
            <button onClick={onRemove} className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}