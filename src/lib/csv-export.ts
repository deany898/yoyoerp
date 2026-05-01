/**
 * Universal CSV exporter · capability-aware.
 * Pass an array of records and a column spec; downloads a CSV in the browser.
 */

export interface CsvColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: unknown, row: T) => string | number | null | undefined;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const raw = (row as Record<string, unknown>)[c.key as string];
        const formatted = c.format ? c.format(raw, row) : raw;
        return escapeCsvCell(formatted);
      })
      .join(","),
  );
  return [header, ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safe = filename.replace(/[^a-z0-9._-]+/gi, "_");
  link.download = safe.endsWith(".csv") ? safe : `${safe}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const csv = buildCsv(rows, columns);
  downloadCsv(filename, csv);
}