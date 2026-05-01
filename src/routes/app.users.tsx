import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, Search, Users as UsersIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { ROLE_PERMISSION_MATRIX, ROLE_ORDER, ROLE_LABEL } from "@/lib/role-permissions";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { adminSetLock, adminResetPassword } from "@/server/admin-users.functions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  user_id: string;
  display_name: string | null;
  created_at: string;
  role: AppRole;
  admin_locked: boolean;
}

export const Route = createFileRoute("/app/users")({
  component: UserManagementPage,
  head: () => ({ meta: [{ title: "User management · YOYO ERP" }] }),
});

function UserManagementPage() {
  const { role } = useRole();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const setLockFn = useServerFn(adminSetLock);
  const resetPwFn = useServerFn(adminResetPassword);

  useEffect(() => {
    if (role !== "admin") {
      toast.error("Admins only");
      navigate({ to: "/app/dashboard" });
    }
  }, [role, navigate]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, created_at, admin_locked"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr || rErr) {
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }
    const roleMap = new Map<string, AppRole>();
    (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));
    const list: UserRow[] = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      created_at: p.created_at,
      role: roleMap.get(p.user_id) ?? "customer",
      admin_locked: p.admin_locked ?? false,
    }));
    list.sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
    setRows(list);
    setLoading(false);
  }

  const adminCount = rows.filter((r) => r.role === "admin").length;

  async function changeRole(target: UserRow, newRole: AppRole) {
    if (newRole === target.role) return;
    if (target.role === "admin" && newRole !== "admin" && adminCount <= 1) {
      toast.error("Cannot demote the last admin");
      return;
    }
    if (target.user_id === currentUser?.id && newRole !== "admin") {
      toast.error("You cannot remove your own admin access");
      return;
    }
    setSavingId(target.user_id);
    // Replace role: delete old + insert new (user_roles has unique(user_id,role))
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", target.user_id);
    if (delErr) {
      toast.error("Update failed");
      setSavingId(null);
      return;
    }
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: target.user_id, role: newRole });
    if (insErr) {
      toast.error("Update failed");
      setSavingId(null);
      return;
    }
    setRows((prev) => prev.map((r) => (r.user_id === target.user_id ? { ...r, role: newRole } : r)));
    toast.success(`${target.display_name ?? "User"} is now ${ROLE_LABEL[newRole]}`);
    setSavingId(null);
  }

  async function toggleLock(target: UserRow) {
    setSavingId(target.user_id);
    try {
      await setLockFn({ data: { user_id: target.user_id, locked: !target.admin_locked } });
      setRows((prev) =>
        prev.map((r) => (r.user_id === target.user_id ? { ...r, admin_locked: !r.admin_locked } : r)),
      );
      toast.success(target.admin_locked ? "Profile unlocked" : "Profile locked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function resetPassword(target: UserRow) {
    const pwd = window.prompt(`Set a new password for ${target.display_name ?? "user"} (min 8 chars):`);
    if (!pwd || pwd.length < 8) {
      if (pwd !== null) toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingId(target.user_id);
    try {
      await resetPwFn({ data: { user_id: target.user_id, password: pwd } });
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => (r.display_name ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  if (role !== "admin") return null;

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              User management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage team roles and permissions across the platform.
            </p>
          </div>
          <CreateUserDialog onCreated={load} />
        </div>

        {/* Users table */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="font-display text-base font-semibold text-foreground">Team members</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No users found" description="Invite your team to get started." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isSelf = u.user_id === currentUser?.id;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">
                        {u.display_name ?? "—"}
                        {isSelf && (
                          <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                        )}
                        {u.admin_locked && (
                          <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-[10px]">
                            Locked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <SmartSelect
                          options={ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                          value={u.role}
                          onChange={(v) => v && changeRole(u, v as AppRole)}
                          disabled={savingId === u.user_id}
                          searchPlaceholder="Search role…"
                          size="sm"
                          triggerClassName="w-[200px]"
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(u.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserRowActions
                          locked={u.admin_locked}
                          isSelf={isSelf}
                          saving={savingId === u.user_id}
                          onToggleLock={() => toggleLock(u)}
                          onResetPassword={() => resetPassword(u)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Permissions matrix */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-base font-semibold text-foreground">Role · permission matrix</h2>
            <p className="text-xs text-muted-foreground">
              Reference of what each role can access. Enforced server-side via RLS.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Capability</TableHead>
                  {ROLE_ORDER.map((r) => (
                    <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROLE_PERMISSION_MATRIX.map((row) => (
                  <TableRow key={row.capability}>
                    <TableCell className="font-medium text-sm">{row.capability}</TableCell>
                    {ROLE_ORDER.map((r) => (
                      <TableCell key={r} className="text-center text-sm">
                        {row.roles[r] ? (
                          <span className="text-emerald-600">●</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}