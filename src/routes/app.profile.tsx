import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, Loader2, ShieldCheck, Mail, Phone, AtSign, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useDevMode } from "@/hooks/useDevMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { notify } from "@/lib/notify";
import { LockSettingsCard } from "@/components/lock/LockSettingsCard";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile · Yoyo" }] }),
});

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", manager: "Manager", supervisor: "Supervisor",
  worker: "Worker", dispatch: "Dispatch", sales: "Sales",
  customer: "Customer", requestor: "Requestor",
};

const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/, "Letters, digits, . _ - only").nullable(),
  mobile: z.string().trim().min(7).max(20).regex(/^[+0-9 ()-]+$/, "Invalid mobile").nullable(),
});

function ProfilePage() {
  const { user } = useAuth();
  const { role, realRole } = useRole();
  const { devMode, setDevMode } = useDevMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminLocked, setAdminLocked] = useState(false);
  const [createdByAdmin, setCreatedByAdmin] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    username: "",
    mobile: "",
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, mobile, admin_locked, created_by_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          username: data.username ?? "",
          mobile: data.mobile ?? "",
        });
        setAdminLocked(!!data.admin_locked);
        setCreatedByAdmin(!!data.created_by_admin);
      }
      setLoading(false);
    })();
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse({
      display_name: form.display_name,
      username: form.username || null,
      mobile: form.mobile || null,
    });
    if (!parsed.success) {
      notify.warning(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name,
        username: parsed.data.username,
        mobile: parsed.data.mobile,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      notify.error(error.message);
      return;
    }
    notify.success("Profile updated");
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match · पासवर्ड मेल नहीं खाता')
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    setChangingPassword(false)

    if (error) {
      toast.error('Failed: ' + error.message)
      return
    }

    toast.success('Password updated · पासवर्ड बदल गया')
    setNewPassword('')
    setConfirmPassword('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      {adminLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Account is admin-locked</div>
            <div className="text-xs text-amber-800/80">
              Identity fields (name, username, mobile) cannot be changed. Contact an administrator.
            </div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Identity</h2>
        <Separator className="my-4" />
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                disabled={adminLocked}
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  disabled={adminLocked}
                  placeholder="yourname"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  disabled={adminLocked}
                  placeholder="+91 98765 43210"
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={user?.email ?? ""} disabled />
            </div>
            <p className="text-[11px] text-muted-foreground">Email is managed by your sign-in method.</p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || adminLocked}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Security</h2>
        <Separator className="my-4" />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleChangePassword();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={changingPassword}>
              {changingPassword ? "Updating…" : "Change password"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Account</h2>
        <Separator className="my-4" />
        <div className="space-y-3 text-sm">
          <Row label="Role" value={<Badge variant="secondary">{ROLE_LABEL[role] ?? role}</Badge>} />
          <Row
            label="Account source"
            value={
              role === "admin"
                ? "Administrator account"
                : createdByAdmin
                  ? "Created by admin"
                  : "Self-registered"
            }
          />
          <Row
            label="Identity locked"
            value={
              adminLocked ? (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Lock className="h-3.5 w-3.5" /> Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Editable
                </span>
              )
            }
          />
        </div>
      </section>

      {user && (
        <LockSettingsCard userId={user.id} userName={form.display_name || user.email || user.id} />
      )}

      {realRole === "admin" && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Developer</h2>
          <Separator className="my-4" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">Developer mode</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Show role simulator in the sidebar so you can preview the app as other roles.
              </p>
            </div>
            <Switch checked={devMode} onCheckedChange={setDevMode} aria-label="Developer mode" />
          </div>
        </section>
      )}

      <div className="text-center text-xs text-muted-foreground">
        Need to switch accounts? <Link to="/auth" className="font-semibold text-primary">Sign in to another account</Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}