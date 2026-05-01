import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToCsv, type CsvColumn } from "@/lib/csv-export";
import { notify } from "@/lib/notify";

interface Props<T extends Record<string, unknown>> {
  filename: string;
  /** Capability required to export · defaults to a generic catch-all */
  capability?: string;
  /** Rows can be a sync array or a function (sync / async) for lazy fetching */
  rows: T[] | (() => T[] | Promise<T[]>);
  columns: CsvColumn<T>[];
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
}

export function ExportButton<T extends Record<string, unknown>>({
  filename,
  capability,
  rows,
  columns,
  label = "Export CSV",
  size = "sm",
  variant = "outline",
  disabled,
}: Props<T>) {
  const { cap } = usePermissions();
  const [busy, setBusy] = useState(false);

  // If a capability is supplied, hide the button when the user lacks it.
  if (capability && !cap(capability)) return null;

  const onClick = async () => {
    setBusy(true);
    try {
      const list = typeof rows === "function" ? await rows() : rows;
      if (!list || list.length === 0) {
        notify.warning("Nothing to export");
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      exportToCsv(`${filename}_${stamp}`, list, columns);
      notify.success(`Exported ${list.length} rows`);
    } catch (e) {
      notify.error("Export failed");
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={disabled || busy} size={size} variant={variant} className="gap-1.5">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}