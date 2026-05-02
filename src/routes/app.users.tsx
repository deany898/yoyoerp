import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, Search, Users as UsersIcon, Loader2, Pencil, KeyRound, UserCheck, UserX, Plus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
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
      toast.error(t("err_access_denied"));
      navigate({ to: "/app/dashboard" });
    }
  }, [role, navigate, t]);

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
      toast.error(err instanceof Error ? err.message : t("err_load_failed"));
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
      toast.success(target.active ? t("um_deactivate") : t("um_activate"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("err_load_failed"));
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
              {t("um_title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("um_subtitle")}
            </p>
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("um_add_user")}
          </Button>
        </div>

        {/* Users table */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="font-display text-base font-semibold text-foreground">{t("um_team_members")}</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("um_search_ph")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("um_loading")}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={UsersIcon} title={t("um_empty_title")} description={t("um_empty_desc")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("um_col_name")}</TableHead>
                  <TableHead>{t("um_col_mobile")}</TableHead>
                  <TableHead>{t("um_col_role")}</TableHead>
                  <TableHead>{t("um_col_status")}</TableHead>
                  <TableHead>{t("um_col_date_added")}</TableHead>
                  <TableHead className="text-right">{t("um_col_actions")}</TableHead>
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
                          <Badge variant="outline" className="ml-2 text-[10px]">{t("um_you")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.mobile ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 ring-1 ring-emerald-200">{t("um_active")}</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 ring-1 ring-rose-200">{t("um_inactive")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(u.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)} className="gap-1">
                            <Pencil className="h-3.5 w-3.5" /> {t("um_edit")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setResetTarget(u)} className="gap-1">
                            <KeyRound className="h-3.5 w-3.5" /> {t("um_reset_password")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingToggle(u)}
                            disabled={savingId === u.user_id || isSelf}
                            className="gap-1"
                          >
                            {u.active ? (
                              <><UserX className="h-3.5 w-3.5" /> {t("um_deactivate")}</>
                            ) : (
                              <><UserCheck className="h-3.5 w-3.5" /> {t("um_activate")}</>
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
            <h2 className="font-display text-base font-semibold text-foreground">{t("um_perm_matrix")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("um_perm_matrix_desc")}
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">{t("um_capability")}</TableHead>
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
              {pendingToggle?.active ? t("um_deactivate_q") : t("um_activate_q")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`${pendingToggle?.display_name ?? t("um_this_user")} ${
                pendingToggle?.active ? t("um_deactivate_desc") : t("um_activate_desc")
              }`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn_cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleActive}>
              {pendingToggle?.active ? t("um_deactivate") : t("um_activate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
}