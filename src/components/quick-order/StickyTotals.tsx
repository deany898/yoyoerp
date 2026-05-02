import { useState } from "react";
import { Send, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
}

interface Props {
  subtotal: number;
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
  const { t } = useLanguage();
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <AddChargePopover onAdd={p.onAddCharge} disabled={!p.canEdit} subtotal={p.subtotal} />
          {p.charges.map((c) => (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                c.amount < 0
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-border bg-muted/50"
              }`}
            >
              <span>{c.label}</span>
              <span className="font-mono tabular-nums">
                {c.amount < 0 ? "−" : "+"}₹{Math.abs(c.amount).toFixed(2)}
              </span>
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
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("qo_subtotal")} · ₹{p.subtotal.toFixed(2)}
            </div>
            <div className="font-mono text-xl font-bold tabular-nums text-primary">
              {t("qo_total")} ₹{p.total.toFixed(2)}
            </div>
          </div>
          <Button onClick={p.onSaveDraft} disabled={p.saving || !p.canEdit} variant="outline" size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> {t("qo_draft")}
          </Button>
          <Button onClick={p.onSubmit} disabled={p.saving || !p.canEdit} size="sm" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> {p.saving ? t("qo_submitting") : t("qo_submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type ChargeKind = "discount" | "gst" | "custom";
type DiscountUnit = "pct" | "amt";

function AddChargePopover({
  onAdd,
  disabled,
  subtotal,
}: {
  onAdd: (label: string, amount: number) => void;
  disabled?: boolean;
  subtotal?: number;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ChargeKind>("discount");
  const [unit, setUnit] = useState<DiscountUnit>("pct");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const reset = () => { setKind("discount"); setUnit("pct"); setLabel(""); setAmount(""); };

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    if (kind === "discount") {
      const base = subtotal ?? 0;
      const rupees = unit === "pct" ? base * (value / 100) : value;
      const display = unit === "pct" ? `Discount ${value}%` : `Discount ₹${value.toFixed(2)}`;
      onAdd(display, -rupees); // negative -> subtract
    } else if (kind === "gst") {
      const base = subtotal ?? 0;
      const rupees = base * (value / 100);
      onAdd(`GST ${value}%`, rupees);
    } else {
      const trimmed = label.trim();
      if (!trimmed) return;
      onAdd(trimmed, value);
    }
    reset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> {t("qo_add_charge")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t("qo_type")}</label>
          <Select value={kind} onValueChange={(v) => setKind(v as ChargeKind)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="discount">{t("qo_discount_kind")}</SelectItem>
              <SelectItem value="gst">{t("qo_gst_kind")}</SelectItem>
              <SelectItem value="custom">{t("qo_custom_kind")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {kind === "custom" && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t("qo_label")}</label>
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("qo_custom_ph")}
              className="h-9"
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {kind === "gst" ? t("qo_gst_rate") : kind === "discount" ? t("do_discount") : t("qo_amount")}
          </label>
          <div className="flex h-9 items-stretch rounded-md border border-input">
            <Input
              autoFocus={kind !== "custom"}
              type="number" inputMode="decimal" min={0} step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-full flex-1 border-0 px-2 text-right font-mono text-sm tabular-nums shadow-none focus-visible:ring-0"
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
            {kind === "discount" ? (
              <Select value={unit} onValueChange={(v) => setUnit(v as DiscountUnit)}>
                <SelectTrigger className="h-full w-12 rounded-l-none border-0 border-l border-input bg-muted/40 px-2 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pct">%</SelectItem>
                  <SelectItem value="amt">₹</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className="flex w-10 items-center justify-center border-l border-input bg-muted/40 text-xs text-muted-foreground">
                {kind === "gst" ? "%" : "₹"}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("btn_cancel")}</Button>
          <Button type="button" size="sm" onClick={submit}>{t("qo_add")}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
