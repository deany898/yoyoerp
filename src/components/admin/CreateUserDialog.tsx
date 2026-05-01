import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { ROLE_ORDER, ROLE_LABEL } from "@/lib/role-permissions";
import { adminCreateUser } from "@/server/admin-users.functions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Props {
  onCreated: () => void;
}

export function CreateUserDialog({ onCreated }: Props) {
  const createFn = useServerFn(adminCreateUser);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    username: "",
    mobile: "",
    password: "",
    role: "worker" as AppRole,
  });

  const reset = () =>
    setForm({ display_name: "", email: "", username: "", mobile: "", password: "", role: "worker" });

  const submit = async () => {
    if (!form.display_name || !form.email || form.password.length < 8) {
      toast.error("Fill in name, email, and a password (8+ characters)");
      return;
    }
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(`${form.display_name} added`);
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create user";
      toast.error("Create failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Create a locked account. The user can sign in immediately and change only their password from Profile.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Display name</Label>
            <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Username</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mobile</Label>
              <Input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Temporary password</Label>
            <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <SmartSelect
              options={ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              value={form.role}
              onChange={(v) => v && setForm((f) => ({ ...f, role: v as AppRole }))}
              size="sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}