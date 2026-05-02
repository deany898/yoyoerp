import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Pencil, Plus, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { UserFormSheet, type UserFormValues } from "@/components/admin/UserFormSheet";
import { ROLE_LABEL, ROLE_PERMISSION_MATRIX } from "@/lib/role-permissions";
import {
  adminListUsers,
  adminUpdateUser,
} from "@/server/admin-users.functions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRow {
  user_id: string;
  display_name: string | null;
  mobile: string | null;
  role: AppRole;
  active: boolean;
  last_sign_in_at: string | null;
}

const MATRIX_ROLES: AppRole[] = [
  "admin",
  "manager",
  "supervisor",
  "accountant",
  "sales",
  "dispatch",
  "worker",
  "customer",
];

export const Route = createFileRoute("/app/settings/users")({
  component: SettingsUsersPage,
  head: () => ({ meta: [{ title: "User management · YOYO ERP" }] }),
});

function SettingsUsersPage() {
  const { role } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<UserFormValues | null>(null);
  const [pendingToggle, setPendingToggle] = useState<UserRow | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const listFn = useServerFn(adminListUsers);
  const updateFn = useServerFn(adminUpdateUser);

  useEffect(() => {
    if (role && role !== "admin") {
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
      setRows(res.users as UserRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
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
      isSelf: row.user_id === user?.id,
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

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? "")),
    [rows],
  );

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
              Add staff, assign roles, and manage access.
            </p>
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add user
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center rounded-xl border border-border bg-card py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading users…
              </div>
            ) : sorted.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No users yet" description="Add your first team member." />
            ) : (
              <UserList rows={sorted} currentUserId={user?.id ?? null} savingId={savingId} onEdit={openEdit} onToggle={(r) => setPendingToggle(r)} />
            )}
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsMatrix />
          </TabsContent>
        </Tabs>
      </div>

      <UserFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing}
        onSaved={load}
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

function UserList({
  rows,
  currentUserId,
  savingId,
  onEdit,
  onToggle,
}: {
  rows: UserRow[];
  currentUserId: string | null;
  savingId: string | null;
  onEdit: (r: UserRow) => void;
  onToggle: (r: UserRow) => void;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.user_id}>
                <TableCell className="font-medium">
                  {r.display_name ?? "—"}
                  {r.user_id === currentUserId && (
                    <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.mobile ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABEL[r.role] ?? r.role}</Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge active={r.active} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.last_sign_in_at ? format(new Date(r.last_sign_in_at), "MMM d, HH:mm") : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(r)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggle(r)}
                      disabled={savingId === r.user_id || r.user_id === currentUserId}
                      className="gap-1"
                    >
                      {r.active ? (
                        <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                      ) : (
                        <><UserCheck className="h-3.5 w-3.5" /> Activate</>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <div key={r.user_id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-foreground truncate">
                  {r.display_name ?? "—"}
                  {r.user_id === currentUserId && (
                    <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                  )}
                </div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5">{r.mobile ?? "—"}</div>
              </div>
              <StatusBadge active={r.active} />
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <Badge variant="secondary" className="text-[11px]">{ROLE_LABEL[r.role] ?? r.role}</Badge>
              <span className="text-[11px] text-muted-foreground">
                {r.last_sign_in_at ? format(new Date(r.last_sign_in_at), "MMM d") : "Never"}
              </span>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              <Button size="sm" variant="outline" onClick={() => onEdit(r)} className="flex-1 gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggle(r)}
                disabled={savingId === r.user_id || r.user_id === currentUserId}
                className="flex-1 gap-1"
              >
                {r.active ? (
                  <><UserX className="h-3.5 w-3.5" /> Off</>
                ) : (
                  <><UserCheck className="h-3.5 w-3.5" /> On</>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-200">
      Active
    </Badge>
  ) : (
    <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 ring-1 ring-rose-200">
      Inactive
    </Badge>
  );
}

function PermissionsMatrix() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border p-4">
        <h2 className="font-display text-base font-semibold text-foreground">
          Role · permission matrix
        </h2>
        <p className="text-xs text-muted-foreground">
          Reference of what each role can access. Enforced server-side via RLS.
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Capability</TableHead>
              {MATRIX_ROLES.map((r) => (
                <TableHead key={r} className="text-center">
                  {ROLE_LABEL[r] ?? r}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLE_PERMISSION_MATRIX.map((row) => (
              <TableRow key={row.capability}>
                <TableCell className="font-medium text-sm">{row.capability}</TableCell>
                {MATRIX_ROLES.map((r) => (
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
    </div>
  );
}