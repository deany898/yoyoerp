import { useState } from "react";
import { Send, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
}

interface Props {
  total: number;
  charges: ExtraCharge[];
  onAddCharge: (label: string, amount: number) => void;
  onRemoveCharge: (id: string) => void;
  saving: boolean;
  canEdit: boolean;
  onSubmit: () => void;
  onSaveDraft: () => void;
}

export function StickyTotals(p: Props) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <AddChargePopover onAdd={p.onAddCharge} disabled={!p.canEdit} />
          {p.charges.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium"
            >
              <span>{c.label}</span>
              <span className="font-mono tabular-nums text-foreground">₹{c.amount.toFixed(2)}</span>
              {p.canEdit && (
                <button
                  type="button"
                  aria-label={`Remove ${c.label}`}
                  onClick={() => p.onRemoveCharge(c.id)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
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

function AddChargePopover({ onAdd, disabled }: { onAdd: (label: string, amount: number) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const submit = () => {
    const trimmed = label.trim();
    const value = Number(amount);
    if (!trimmed || !Number.isFinite(value) || value <= 0) return;
    onAdd(trimmed, value);
    setLabel(""); setAmount(""); setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add charge
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="start">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Label</label>
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Shipping, Tax, Packing…"
            className="h-9"
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Amount (₹)</label>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-9 font-mono tabular-nums"
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" size="sm" onClick={submit}>Add</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
