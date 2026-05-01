import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

interface Props {
  /** Field label, e.g. "Code", "PO number". */
  label?: string;
  /** Existing value when editing an already-saved record. */
  value?: string | null;
  /** Optional preview of the next code to be assigned, shown on create. */
  pendingCode?: string | null;
  /** Render in a compact one-line variant. */
  compact?: boolean;
}

/**
 * Read-only display for system-generated identifiers (codes, document numbers).
 * Users never type or edit these · the database trigger or a client helper assigns them on save.
 */
export function AutoCodeField({ label = "Code", value, pendingCode, compact }: Props) {
  const display = value && value.trim().length > 0
    ? value
    : pendingCode && pendingCode.trim().length > 0
      ? pendingCode
      : "Auto-generated on save";

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{display}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold normal-case text-muted-foreground">
          <Sparkles className="h-2.5 w-2.5" /> auto
        </span>
      </Label>
      <Input value={display} disabled readOnly tabIndex={-1} className="bg-muted/40 font-mono" />
    </div>
  );
}