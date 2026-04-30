import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Pencil, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";

/**
 * InlineEditField · click-to-edit single value with tick/cross.
 *
 * Standard YOYO pattern for single editable values in tables, cards, and
 * detail panels:
 *   - click the value → it becomes an input
 *   - tick (✔) or Enter → confirm, run onSave
 *   - cross (✖) or Esc → cancel, restore original
 *   - shows loading + success/error toast automatically
 */

type Props = {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  /** Field label used in success/error toasts (e.g. "Phone"). */
  label?: string;
  type?: "text" | "number" | "email" | "tel";
  placeholder?: string;
  /** Render value as monospace (good for SKUs, codes, prices). */
  mono?: boolean;
  /** Optional client-side validation. Return string error or null. */
  validate?: (next: string) => string | null;
  /** Disable editing entirely. Renders read-only value. */
  readOnly?: boolean;
  /** Format the displayed value (currency, units, etc.). */
  format?: (v: string) => string;
  className?: string;
  inputClassName?: string;
  /** Show the pencil affordance even when not hovering. */
  alwaysShowEdit?: boolean;
};

export function InlineEditField({
  value,
  onSave,
  label,
  type = "text",
  placeholder,
  mono,
  validate,
  readOnly,
  format,
  className,
  inputClassName,
  alwaysShowEdit,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const start = () => {
    if (readOnly || saving) return;
    setDraft(value);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        notify.warning(err);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      notify.success(label ? `${label} updated` : "Saved");
      setEditing(false);
    } catch (err) {
      notify.error(label ? `Could not update ${label.toLowerCase()}` : "Save failed", {
        description: err instanceof Error ? err.message : undefined,
        retry: () => void commit(),
      });
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <div className={cn("inline-flex items-center gap-1", className)}>
        <Input
          ref={inputRef}
          type={type}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          disabled={saving}
          className={cn("h-8 w-auto min-w-[8rem] text-sm", mono && "font-mono", inputClassName)}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={() => void commit()}
          disabled={saving}
          aria-label="Confirm"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={cancel}
          disabled={saving}
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const display = format ? format(value) : value;
  return (
    <button
      type="button"
      onClick={start}
      disabled={readOnly}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition",
        !readOnly && "hover:bg-muted/60",
        readOnly && "cursor-default",
        className,
      )}
    >
      <span className={cn("text-sm", mono && "font-mono", !value && "text-muted-foreground")}>
        {display || placeholder || "—"}
      </span>
      {!readOnly && (
        <Pencil
          className={cn(
            "h-3 w-3 text-muted-foreground transition-opacity",
            alwaysShowEdit ? "opacity-60" : "opacity-0 group-hover:opacity-60",
          )}
        />
      )}
    </button>
  );
}