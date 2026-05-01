import { useEffect, useState, useMemo } from "react";
import { Loader2, RotateCcw, Search, Pencil, Check as CheckIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { type UserRoleType } from "@/lib/roles";
import { ALL_CAPABILITIES, MODULE_LABEL, type Capability } from "@/lib/capabilities";
import { notify } from "@/lib/notify";

const ROLES: UserRoleType[] = ["admin", "manager", "supervisor", "sales", "dispatch", "worker", "customer"];

type RoleRow = { role: UserRoleType; capability: string; granted: boolean };
type OverrideRow = { user_id: string; capability: string; granted: boolean };
type ProfileRow = { user_id: string; display_name: string | null };
type UserRoleRow = { user_id: string; role: UserRoleType };

function moduleOf(cap: string): string {
  return cap.split(".")[0];
}

export function PermissionMatrix() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<RoleRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"roles" | "users">("roles");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [d, o, p, r] = await Promise.all([
      supabase.from("role_permissions").select("role,capability,granted"),
      supabase.from("user_permission_overrides").select("user_id,capability,granted"),
      supabase.from("profiles").select("user_id,display_name").order("display_name"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setDefaults((d.data ?? []) as RoleRow[]);
    setOverrides((o.data ?? []) as OverrideRow[]);
    setProfiles((p.data ?? []) as ProfileRow[]);
    setUserRoles((r.data ?? []) as UserRoleRow[]);
    setLoading(false);
  };

  useEffect(() => { void reload(); }, []);

  const grouped = useMemo(() => {
    const f = filter.toLowerCase().trim();
    const list = ALL_CAPABILITIES.filter((c) =>
      !f || c.toLowerCase().includes(f) || (MODULE_LABEL[moduleOf(c) as keyof typeof MODULE_LABEL] ?? "").toLowerCase().includes(f)
    );
    return list.reduce<Record<string, Capability[]>>((acc, c) => {
      const m = moduleOf(c);
      (acc[m] ||= []).push(c);
      return acc;
    }, {});
  }, [filter]);

  const isGranted = (role: UserRoleType, cap: string) =>
    defaults.find((d) => d.role === role && d.capability === cap)?.granted ?? false;

  const toggleRole = async (role: UserRoleType, cap: string) => {
    const next = !isGranted(role, cap);
    setSaving(`${role}:${cap}`);
    const { error } = await supabase
      .from("role_permissions")
      .upsert({ role, capability: cap, granted: next }, { onConflict: "role,capability" });
    setSaving(null);
    if (error) { notify.error("Could not save permission"); return; }
    setDefaults((prev) => {
      const i = prev.findIndex((d) => d.role === role && d.capability === cap);
      if (i === -1) return [...prev, { role, capability: cap, granted: next }];
      const copy = [...prev]; copy[i] = { ...copy[i], granted: next }; return copy;
    });
  };

  // user override helpers
  const userOverride = (cap: string) =>
    overrides.find((o) => o.user_id === selectedUser && o.capability === cap);

  const userRoleFor = (uid: string) => userRoles.find((r) => r.user_id === uid)?.role ?? "customer";

  const setOverride = async (cap: string, granted: boolean | null) => {
    if (!selectedUser) return;
    setSaving(`u:${cap}`);
    if (granted === null) {
      const { error } = await supabase.from("user_permission_overrides")
        .delete().eq("user_id", selectedUser).eq("capability", cap);
      setSaving(null);
      if (error) { notify.error("Could not reset override"); return; }
      setOverrides((p) => p.filter((o) => !(o.user_id === selectedUser && o.capability === cap)));
    } else {
      const { error } = await supabase.from("user_permission_overrides")
        .upsert({ user_id: selectedUser, capability: cap, granted }, { onConflict: "user_id,capability" });
      setSaving(null);
      if (error) { notify.error("Could not save override"); return; }
      setOverrides((p) => {
        const i = p.findIndex((o) => o.user_id === selectedUser && o.capability === cap);
        if (i === -1) return [...p, { user_id: selectedUser, capability: cap, granted }];
        const c = [...p]; c[i] = { ...c[i], granted }; return c;
      });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const visibleRoles: UserRoleType[] = ROLES.filter((r: UserRoleType) => r !== "customer");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Permissions</h2>
          <p className="text-xs text-muted-foreground">Role defaults · per-user overrides</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter capabilities…" className="h-9 pl-7 text-sm" />
          </div>
          <Button
            size="sm"
            variant={editing ? "default" : "outline"}
            onClick={() => setEditing((v) => !v)}
            className="h-9 gap-1.5"
          >
            {editing ? <><CheckIcon className="h-3.5 w-3.5" /> Done</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "roles" | "users")}>
        <TabsList>
          <TabsTrigger value="roles">Role defaults</TabsTrigger>
          <TabsTrigger value="users">User overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/50 p-2 text-left">Capability</th>
                  {visibleRoles.map((r) => <th key={r} className="p-2 text-center font-medium">{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([mod, caps]) => (
                  <>
                    <tr key={`h-${mod}`} className="bg-muted/30">
                      <td colSpan={visibleRoles.length + 1} className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                        {MODULE_LABEL[mod as keyof typeof MODULE_LABEL] ?? mod}
                      </td>
                    </tr>
                    {caps.map((cap) => (
                      <tr key={cap} className="border-t border-border">
                        <td className="sticky left-0 z-10 bg-card p-2 font-mono text-xs">{cap}</td>
                        {visibleRoles.map((role) => {
                          const granted = isGranted(role, cap);
                          const isSaving = saving === `${role}:${cap}`;
                          return (
                                <td key={role} className="p-1.5 text-center">
                                  {isSaving ? (
                                    <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                  ) : editing ? (
                                    <Switch
                                      checked={granted}
                                      onCheckedChange={() => toggleRole(role, cap)}
                                      className="mx-auto data-[state=checked]:bg-emerald-500"
                                    />
                                  ) : (
                                    <span
                                      className={`mx-auto inline-block h-2.5 w-2.5 rounded-full ${granted ? "bg-emerald-500" : "bg-muted-foreground/20"}`}
                                      title={granted ? "Granted" : "Denied"}
                                    />
                                  )}
                                </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">User:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">Select a user…</option>
              {profiles.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.display_name ?? p.user_id.slice(0, 8)} · {userRoleFor(p.user_id)}
                </option>
              ))}
            </select>
          </div>

          {!selectedUser ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Pick a user to view and override their effective capabilities.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Capability</th>
                    <th className="p-2 text-center">Role default</th>
                    <th className="p-2 text-center">Override</th>
                    <th className="p-2 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([mod, caps]) => (
                    <>
                      <tr key={`uh-${mod}`} className="bg-muted/30">
                        <td colSpan={4} className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                          {MODULE_LABEL[mod as keyof typeof MODULE_LABEL] ?? mod}
                        </td>
                      </tr>
                      {caps.map((cap) => {
                        const role = userRoleFor(selectedUser);
                        const def = isGranted(role, cap);
                        const ov = userOverride(cap);
                        return (
                          <tr key={cap} className="border-t border-border">
                            <td className="p-2 font-mono text-xs">{cap}</td>
                            <td className="p-2 text-center">
                              <Badge variant={def ? "default" : "secondary"} className="text-[10px]">
                                {def ? "granted" : "denied"}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              <div className="inline-flex gap-1">
                                <Button size="sm" variant={ov?.granted === true ? "default" : "outline"} className="h-6 px-2 text-[10px]" onClick={() => setOverride(cap, true)}>Grant</Button>
                                <Button size="sm" variant={ov?.granted === false ? "destructive" : "outline"} className="h-6 px-2 text-[10px]" onClick={() => setOverride(cap, false)}>Deny</Button>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              {ov && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setOverride(cap, null)}>
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}