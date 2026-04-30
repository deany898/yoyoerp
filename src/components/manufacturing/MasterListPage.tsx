import { useMemo, useState } from "react";
import { Plus, Pencil, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGate, usePermissions } from "@/hooks/usePermissions";
import { MasterRecordSheet, type MasterField } from "./MasterRecordSheet";

export interface MasterColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T extends { id: string; code?: string | null; name?: string | null; is_active?: boolean | null }> {
  title: string;
  entityLabel: string;
  entityLabelPlural: string;
  description: string;
  table: string;
  icon: LucideIcon;
  rows: T[];
  loading: boolean;
  refresh: () => void;
  fields: MasterField[];
  columns: MasterColumn<T>[];
  searchKeys?: (keyof T)[];
}

export function MasterListPage<T extends { id: string; code?: string | null; name?: string | null; is_active?: boolean | null }>(
  props: Props<T>,
) {
  const { title, entityLabel, entityLabelPlural, description, table, icon: Icon, rows, loading, refresh, fields, columns, searchKeys } = props;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const { can } = usePermissions();

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    const keys = searchKeys ?? (["code", "name"] as (keyof T)[]);
    return rows.filter((r) =>
      keys.some((k) => {
        const v = r[k];
        return typeof v === "string" && v.toLowerCase().includes(needle);
      }),
    );
  }, [rows, q, searchKeys]);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: T) => { setEditing(row); setOpen(true); };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Manufacturing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${rows.length} ${rows.length === 1 ? entityLabel.toLowerCase() : entityLabelPlural.toLowerCase()}`} · {description}
          </p>
        </div>
        <PermissionGate permission="create_item">
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New {entityLabel.toLowerCase()}</Button>
        </PermissionGate>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${entityLabelPlural.toLowerCase()}…`} className="pl-9" />
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden"><TableSkeleton rows={5} columns={columns.length + 1} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Icon}
            title={rows.length === 0 ? `No ${entityLabelPlural.toLowerCase()}` : "No matches"}
            description={rows.length === 0 ? `Add your first ${entityLabel.toLowerCase()} to start tracking.` : "Try a different search."}
            actionLabel={rows.length === 0 && can("create_item") ? `New ${entityLabel.toLowerCase()}` : undefined}
            onAction={rows.length === 0 && can("create_item") ? openCreate : undefined}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={String(c.key)} className={`px-4 py-3 text-left font-medium ${c.className ?? ""}`}>{c.label}</th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                    {columns.map((c) => (
                      <td key={String(c.key)} className={`px-4 py-3 ${c.className ?? ""}`}>
                        {c.render
                          ? c.render(row)
                          : c.key === "is_active"
                            ? <Badge variant={row.is_active ? "secondary" : "outline"} className="text-[10px]">{row.is_active ? "Active" : "Inactive"}</Badge>
                            : (row[c.key as keyof T] as React.ReactNode) ?? <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      {can("edit_item") && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label={`Edit ${row.name ?? row.code ?? entityLabel}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MasterRecordSheet
        open={open}
        onOpenChange={setOpen}
        table={table}
        entityLabel={entityLabel}
        fields={fields}
        record={editing as Record<string, unknown> | null}
        onSaved={refresh}
      />
    </div>
  );
}