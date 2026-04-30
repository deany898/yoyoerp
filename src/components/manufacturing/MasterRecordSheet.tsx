import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type FieldKind = "text" | "number" | "switch";

export interface MasterField {
  key: string;
  label: string;
  kind?: FieldKind;
  placeholder?: string;
  required?: boolean;
  step?: string;
  /** Render a custom control. Receives current value + setter. */
  render?: (value: unknown, setValue: (v: unknown) => void) => React.ReactNode;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: string;
  /** Friendly singular label e.g. "Station" */
  entityLabel: string;
  fields: MasterField[];
  /** Existing row to edit, or null to create */
  record: Record<string, unknown> | null;
  onSaved: () => void;
}

export function MasterRecordSheet({ open, onOpenChange, table, entityLabel, fields, record, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!record?.id;

  useEffect(() => {
    if (!open) return;
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      if (record && f.key in record) init[f.key] = record[f.key];
      else if (f.kind === "switch") init[f.key] = true;
      else if (f.kind === "number") init[f.key] = 0;
      else init[f.key] = "";
    }
    setValues(init);
  }, [open, record, fields]);

  const setField = (key: string, v: unknown) => setValues((s) => ({ ...s, [key]: v }));

  const save = async () => {
    for (const f of fields) {
      if (f.required && (values[f.key] === "" || values[f.key] == null)) {
        notify.warning(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (f.kind === "number") payload[f.key] = Number(v) || 0;
      else if (f.kind === "switch") payload[f.key] = !!v;
      else payload[f.key] = v === "" ? null : v;
    }
    const q = isEdit
      ? supabase.from(table as never).update(payload as never).eq("id", record!.id as string)
      : supabase.from(table as never).insert(payload as never);
    const { error } = await q;
    setSaving(false);
    if (error) {
      notify.error(`Could not save ${entityLabel.toLowerCase()}`, { description: error.message });
      return;
    }
    notify.success(`${entityLabel} ${isEdit ? "updated" : "created"}`);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Edit ${entityLabel.toLowerCase()}` : `New ${entityLabel.toLowerCase()}`}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Update ${entityLabel.toLowerCase()} details.` : `Add a new ${entityLabel.toLowerCase()} to your master data.`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {f.label}{f.required && <span className="text-destructive"> *</span>}
              </Label>
              {f.render ? (
                f.render(values[f.key], (v) => setField(f.key, v))
              ) : f.kind === "switch" ? (
                <div className="flex items-center gap-3 pt-1">
                  <Switch id={f.key} checked={!!values[f.key]} onCheckedChange={(v) => setField(f.key, v)} />
                  <span className="text-sm text-muted-foreground">{values[f.key] ? "Active" : "Inactive"}</span>
                </div>
              ) : (
                <Input
                  id={f.key}
                  type={f.kind === "number" ? "number" : "text"}
                  step={f.step}
                  value={(values[f.key] as string | number | undefined) ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6 flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : `Create ${entityLabel.toLowerCase()}`}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}