import { Clock, Star, RotateCcw } from "lucide-react";
import type { PickerVariant } from "./types";

interface Props {
  recent: PickerVariant[];
  frequent: PickerVariant[];
  onAdd: (v: PickerVariant) => void;
  onRepeatLast?: () => void;
  hasLastOrder: boolean;
}

export function QuickActionsBar({ recent, frequent, onAdd, onRepeatLast, hasLastOrder }: Props) {
  if (recent.length === 0 && frequent.length === 0 && !hasLastOrder) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 px-2.5 py-2 text-xs">
      {hasLastOrder && (
        <button
          type="button"
          onClick={onRepeatLast}
          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 font-medium text-primary hover:bg-primary/10"
        >
          <RotateCcw className="h-3 w-3" /> Repeat last order
        </button>
      )}
      {recent.length > 0 && (
        <>
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Clock className="h-3 w-3" /> Recent
          </span>
          {recent.slice(0, 5).map((v) => (
            <button
              key={`r-${v.id}`}
              type="button"
              onClick={() => onAdd(v)}
              className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-md border border-border bg-background px-2 py-1 hover:border-primary/40 hover:bg-primary/5"
              title={`${v.product_name} · ${v.variant_name}`}
            >
              <span className="truncate">{v.product_name}</span>
            </button>
          ))}
        </>
      )}
      {frequent.length > 0 && (
        <>
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Star className="h-3 w-3" /> Frequent
          </span>
          {frequent.slice(0, 5).map((v) => (
            <button
              key={`f-${v.id}`}
              type="button"
              onClick={() => onAdd(v)}
              className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-md border border-border bg-background px-2 py-1 hover:border-primary/40 hover:bg-primary/5"
              title={`${v.product_name} · ${v.variant_name}`}
            >
              <span className="truncate">{v.product_name}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}