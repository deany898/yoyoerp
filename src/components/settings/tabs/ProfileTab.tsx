import { useEffect, useState, type FormEvent } from "react";
import { Lock, Mail, Phone, AtSign, User as UserIcon } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { notify } from "@/lib/notify";

const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Letters, digits, . _ - only")
    .nullable(),
  mobile: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Invalid mobile")
    .nullable(),
});

export function ProfileTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminLocked, setAdminLocked] = useState(false);
  const [form, setForm] = useState({ display_name: "", username: "", mobile: "" });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, mobile, admin_locked")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          username: data.username ?? "",
          mobile: data.mobile ?? "",
        });
        setAdminLocked(!!data.admin_locked);
      }
      setLoading(false);
    })();
  }, [user]);

  async function save(e: FormEvent) {
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
    if (error) return notify.error(error.message);
    notify.success("Profile updated");
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      {adminLocked && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Account is admin-locked</div>
            <div className="text-xs">Identity fields cannot be changed. Contact an administrator.</div>
          </div>
        </div>
      )}
      <h2 className="text-base font-semibold">Identity</h2>
      <Separator className="my-4" />
      <form onSubmit={save} className="space-y-4">
        <Field label="Display name" Icon={UserIcon}>
          <Input
            disabled={adminLocked}
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            className="pl-9"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username" Icon={AtSign}>
            <Input
              disabled={adminLocked}
              placeholder="yourname"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="pl-9"
            />
          </Field>
          <Field label="Mobile" Icon={Phone}>
            <Input
              disabled={adminLocked}
              placeholder="+91 98765 43210"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              className="pl-9"
            />
          </Field>
        </div>
        <Field label="Email" Icon={Mail}>
          <Input value={user?.email ?? ""} disabled className="pl-9" />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || adminLocked}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  Icon,
  children,
}: {
  label: string;
  Icon: typeof UserIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}