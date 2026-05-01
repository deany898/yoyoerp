import { Send, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  itemCount: number;
  unitsTotal: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  otherCharges: number;
  onOtherChargesChange: (n: number) => void;
  saving: boolean;
  canEdit: boolean;
  onSubmit: () => void;
  onSaveDraft: () => void;
}

export function StickyTotals(p: Props) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:flex md:items-center md:gap-6">
          <Stat label="Items" value={`${p.itemCount}`} />
          <Stat label="Units" value={`${p.unitsTotal}`} />
          <Stat label="Subtotal" value={`₹${p.subtotal.toFixed(0)}`} />
          {p.discount > 0 && <Stat label="Disc" value={`−₹${p.discount.toFixed(0)}`} className="text-amber-600" />}
          <Stat label="Tax" value={`₹${p.tax.toFixed(0)}`} />
          <Stat label="Ship" value={p.shipping === 0 ? "Free" : `₹${p.shipping.toFixed(0)}`} />
          <label className="flex items-baseline gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Plus className="h-3 w-3" /> Other
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={p.otherCharges || ""}
              onChange={(e) => p.onOtherChargesChange(Number(e.target.value) || 0)}
              placeholder="0"
              disabled={!p.canEdit}
              className="h-7 w-20 px-2 text-right font-mono text-xs tabular-nums"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total</div>
            <div className="font-mono text-xl font-bold tabular-nums text-primary">₹{p.total.toFixed(2)}</div>
          </div>
          <Button onClick={p.onSaveDraft} disabled={p.saving || !p.canEdit} variant="outline" size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Draft
          </Button>
          <Button onClick={p.onSubmit} disabled={p.saving || !p.canEdit} size="sm" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> {p.saving ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${className ?? ""}`}>{value}</span>
    </div>
  );
}