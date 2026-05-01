import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/app/settings/audit")({
  component: AuditPage,
  head: () => ({ meta: [{ title: "Audit log · YOYO ERP" }, { name: "robots", content: "noindex" }] }),
});

interface AuditRow {
  id: string;
  table_name: string;
  row_id: string | null;
  action: string;
  actor_id: string | null;
  notes: string | null;
  created_at: string;
}

function AuditPage() {
  const { cap } = usePermissions();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorMap, setActorMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!cap("settings.view")) {
      notify.error("Access denied");
      navigate({ to: "/app/dashboard" });
    }
  }, [cap, navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_log")
        .select("id,table_name,row_id,action,actor_id,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) { notify.error("Could not load audit log"); setLoading(false); return; }
      const list = (data ?? []) as AuditRow[];
      setRows(list);

      const ids = Array.from(new Set(list.map((r) => r.actor_id).filter(Boolean) as string[]));
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id,display_name").in("user_id", ids);
        const map: Record<string, string> = {};
        (profiles ?? []).forEach((p: { user_id: string; display_name: string | null }) => {
          map[p.user_id] = p.display_name ?? p.user_id.slice(0, 8);
        });
        setActorMap(map);
      }
      setLoading(false);
    })();
  }, []);

  const f = filter.toLowerCase().trim();
  const filtered = rows.filter((r) =>
    !f || r.table_name.toLowerCase().includes(f) || r.action.toLowerCase().includes(f) || (r.notes ?? "").toLowerCase().includes(f)
  );

  const actionTone = (a: string) => {
    if (a.includes("delete")) return "destructive" as const;
    if (a.includes("create") || a.includes("insert")) return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Shield className="h-5 w-5 text-primary" /> Audit log</h1>
          <p className="text-sm text-muted-foreground">Last 200 sensitive system events · admin-only</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by table, action, notes…" className="h-9 pl-7 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center text-sm text-muted-foreground">No audit events</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-2 text-left">When</th>
                <th className="p-2 text-left">Actor</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Table</th>
                <th className="p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-2 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 text-xs">{r.actor_id ? actorMap[r.actor_id] ?? r.actor_id.slice(0, 8) : <span className="text-muted-foreground">system</span>}</td>
                  <td className="p-2"><Badge variant={actionTone(r.action)} className="text-[10px]">{r.action}</Badge></td>
                  <td className="p-2 font-mono text-xs">{r.table_name}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.notes ?? <span className="opacity-40">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}