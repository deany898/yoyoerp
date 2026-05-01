import { Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { CSVImportSheet, type ImportField } from "@/components/data/CSVImportSheet";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

interface Props {
  /** Supabase table name to insert rows into. */
  table: string;
  /** Import column schema (keys must match the destination DB columns). */
  fields: ImportField[];
  /** Capability required to import · hides the button when the user lacks it. */
  capability?: string;
  /** Friendly label for the import sheet (e.g. "customers"). */
  entityName?: string;
  /** Optional row transform · runs after CSV parsing, before insert. */
  transform?: (row: Record<string, string>) => Record<string, unknown>;
  /** Refresh the parent list after a successful import. */
  onImported?: () => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
}

export function ImportButton({
  table,
  fields,
  capability,
  entityName,
  transform,
  onImported,
  size = "sm",
  variant = "outline",
  label = "Import CSV",
}: Props) {
  const { cap } = usePermissions();
  const [open, setOpen] = useState(false);

  if (capability && !cap(capability)) return null;

  const handleImport = async (rows: Record<string, string>[]) => {
    let created = 0;
    let failed = 0;
    const payload = rows.map((r) => {
      if (transform) return transform(r);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) out[k] = v === "" ? null : v;
      return out;
    });
    // Insert in chunks of 100 to keep payloads small.
    for (let i = 0; i < payload.length; i += 100) {
      const slice = payload.slice(i, i + 100);
      const { error, count } = await supabase
        .from(table as never)
        .insert(slice as never, { count: "exact" });
      if (error) {
        failed += slice.length;
      } else {
        created += count ?? slice.length;
      }
    }
    if (failed > 0) notify.warning(`${created} imported · ${failed} failed`);
    else notify.success(`${created} ${entityName ?? "rows"} imported`);
    onImported?.();
    return { created, failed };
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size={size} variant={variant} className="gap-1.5">
        <Upload className="h-3.5 w-3.5" />
        {label}
      </Button>
      <CSVImportSheet
        open={open}
        onOpenChange={setOpen}
        fields={fields}
        entityName={entityName}
        onImport={handleImport}
      />
    </>
  );
}