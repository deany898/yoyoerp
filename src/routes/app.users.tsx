import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, Search, Users as UsersIcon, Loader2, Pencil, KeyRound, UserCheck, UserX, Plus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { ROLE_PERMISSION_MATRIX, ROLE_ORDER, ROLE_LABEL } from "@/lib/role-permissions";
import { UserFormSheet, type UserFormValues } from "@/components/admin/UserFormSheet";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";
import { adminListUsers, adminUpdateUser } from "@/server/admin-users.functions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  user_id: string;
  display_name: string | null;
  mobile: string | null;
  created_at: string;
  role: AppRole;
  active: boolean;
  last_sign_in_at: string | null;
}

export const Route = createFileRoute("/app/users")({
  component: UserManagementPage,
  head: () => ({ meta: [{ title: "User management · Yoyo" }] }),
});

function UserManagementPage() {
  const { role } = useRole();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<UserFormValues | null>(null);
  const [pendingToggle, setPendingToggle] = useState<UserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const listFn = useServerFn(adminListUsers);
  const updateFn = useServerFn(adminUpdateUser);

  useEffect(() => {
    if (role !== "admin") {
      toast.error("Admins only");
      navigate({ to: "/app/dashboard" });
    }
  }, [role, navigate]);

  useEffect(() => {
    if (role === "admin") void load();
  }, [role]);

  async function load() {
    setLoading(true);
    try {
      const res = await listFn();
      const list = Array.isArray(res?.users) ? (res.users as UserRow[]) : [];
      list.sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""));
      setRows(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing({
      user_id: row.user_id,
      display_name: row.display_name ?? "",
      mobile: row.mobile ?? "",
      role: row.role,
      active: row.active,
      isSelf: row.user_id === currentUser?.id,
    });
    setSheetOpen(true);
  }

  async function confirmToggleActive() {
    if (!pendingToggle) return;
    const target = pendingToggle;
    setSavingId(target.user_id);
    try {
      await updateFn({ data: { user_id: target.user_id, active: !target.active } });
      setRows((prev) =>
        prev.map((r) => (r.user_id === target.user_id ? { ...r, active: !r.active } : r)),
      );
      toast.success(target.active ? "User deactivated" : "User activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
      setPendingToggle(null);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.display_name ?? "").toLowerCase().includes(q) ||
        (r.mobile ?? "").toLowerCase().includes(q),
    );
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
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add user
          </Button>
        </div>

        {/* Users table */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="font-display text-base font-semibold text-foreground">Team members</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or mobile…"
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
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date added</TableHead>
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
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.mobile ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-200">Active</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 ring-1 ring-rose-200">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(u.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)} className="gap-1">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setResetTarget(u)} className="gap-1">
                            <KeyRound className="h-3.5 w-3.5" /> Reset password
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingToggle(u)}
                            disabled={savingId === u.user_id || isSelf}
                            className="gap-1"
                          >
                            {u.active ? (
                              <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                            ) : (
                              <><UserCheck className="h-3.5 w-3.5" /> Activate</>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Editable role defaults + per-user overrides */}
        <section className="rounded-xl border border-border bg-card shadow-sm p-4">
          <ErrorBoundary><PermissionMatrix /></ErrorBoundary>
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

      <UserFormSheet open={sheetOpen} onOpenChange={setSheetOpen} initial={editing} onSaved={load} />

      <ResetPasswordDialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
        userId={resetTarget?.user_id ?? null}
        userName={resetTarget?.display_name ?? null}
      />

      <AlertDialog open={!!pendingToggle} onOpenChange={(o) => !o && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.active ? "Deactivate user?" : "Activate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.active
                ? `${pendingToggle?.display_name ?? "This user"} will no longer be able to sign in.`
                : `${pendingToggle?.display_name ?? "This user"} will regain access to the app.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive}>
              {pendingToggle?.active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
}