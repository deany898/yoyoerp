import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { HardHat, Plus, Pencil, Search, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/EmptyState";
import { ImportButton } from "@/components/shared/ImportButton";
import { ExportButton } from "@/components/shared/ExportButton";
import { PermissionGate, usePermissions } from "@/hooks/usePermissions";
import { useWorkers, type WorkerRow } from "@/hooks/useMfgData";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FLAGS } from "@/lib/feature-flags";
import { WorkerFormSheet } from "@/components/workers/WorkerFormSheet";

export const Route = createFileRoute("/app/workers")({
  head: () => ({
    meta: [
      { title: "Team · Yoyo" },
      { name: "description", content: "Team registry · attendance, payroll, advances." },
    ],
  }),
  component: WorkersPage,
});

function normalizeMobile(p?: string | null) {
  if (!p) return null;
  const digits = p.replace(/[^\d]/g, "");
  return digits.length >= 10 ? digits : null;
}

function WorkersPage() {
  const { workers, loading, refresh } = useWorkers();
  const { isEnabled } = useAppConfig();
  const showPayroll = isEnabled(FLAGS.workforce.payroll, true);
  const { can } = usePermissions();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkerRow | null>(null);

  const filtered = useMemo(() => {
    const n = q.toLowerCase().trim();
    if (!n) return workers;
    return workers.filter((w) =>
      [w.code, w.name, w.phone].some((v) => typeof v === "string" && v.toLowerCase().includes(n)),
    );
  }, [workers, q]);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: WorkerRow) => { setEditing(row); setOpen(true); };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workforce</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading…" : `${workers.length} ${workers.length === 1 ? "member" : "members"}`} · Attendance · Payroll · Advances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton
            table="workers"
            entityName="team"
            capability="workers.import"
            onImported={refresh}
            fields={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name", required: true },
              { key: "phone", label: "Mobile" },
              { key: "hourly_rate", label: "Hourly rate" },
            ]}
          />
          <ExportButton
            filename="team"
            capability="workers.export"
            rows={filtered as unknown as Record<string, unknown>[]}
            columns={[
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "phone", label: "Mobile" },
              { key: "hourly_rate", label: "Hourly rate" },
              { key: "is_active", label: "Active" },
            ]}
          />
          <PermissionGate permission="create_item">
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New member</Button>
          </PermissionGate>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team…" className="pl-9" />
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden"><TableSkeleton rows={5} columns={5} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={HardHat}
            title={workers.length === 0 ? "No team members" : "No matches"}
            description={workers.length === 0 ? "Add your first team member to start tracking." : "Try a different search."}
            actionLabel={workers.length === 0 && can("create_item") ? "New member" : undefined}
            onAction={workers.length === 0 && can("create_item") ? openCreate : undefined}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Mobile</th>
                  {showPayroll && <th className="px-4 py-3 text-right font-medium">₹/hr</th>}
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const m = normalizeMobile(w.phone);
                  return (
                    <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                      <td className="px-4 py-3">{w.name}</td>
                      <td className="px-4 py-3">
                        {m ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{w.phone}</span>
                            <a href={`tel:${m}`} className="rounded p-1 text-sky-700 hover:bg-sky-50" aria-label="Call">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a href={`https://wa.me/${m}`} target="_blank" rel="noreferrer" className="rounded p-1 text-emerald-700 hover:bg-emerald-50" aria-label="WhatsApp">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {showPayroll && (
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{Number(w.hourly_rate).toFixed(2)}</td>
                      )}
                      <td className="px-4 py-3">
                        <Badge variant={w.is_active ? "secondary" : "outline"} className="text-[10px]">
                          {w.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {can("edit_item") && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(w)} aria-label={`Edit ${w.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <WorkerFormSheet
        open={open}
        onOpenChange={setOpen}
        worker={editing}
        showPayroll={showPayroll}
        onSaved={refresh}
      />
    </div>
  );
}