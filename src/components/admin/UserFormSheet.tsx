import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SmartSelect } from "@/components/forms/SmartSelect";
import { ROLE_LABEL } from "@/lib/role-permissions";
import {
  adminCreateUser,
  adminUpdateUser,
  adminResetPassword,
} from "@/server/admin-users.functions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Roles selectable from this UI. "driver" is an alias for dispatch.
const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "manager", label: ROLE_LABEL.manager },
  { value: "supervisor", label: ROLE_LABEL.supervisor },
  { value: "accountant", label: ROLE_LABEL.accountant },
  { value: "sales", label: ROLE_LABEL.sales },
  { value: "dispatch", label: "Driver / Dispatch" },
  { value: "worker", label: ROLE_LABEL.worker },
];

export interface UserFormValues {
  user_id?: string;
  display_name: string;
  mobile: string;
  role: AppRole;
  active: boolean;
  isSelf?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: UserFormValues | null;
  onSaved: () => void;
}

export function UserFormSheet({ open, onOpenChange, initial, onSaved }: Props) {
  const isEdit = Boolean(initial?.user_id);
  const createFn = useServerFn(adminCreateUser);
  const updateFn = useServerFn(adminUpdateUser);
  const resetPwFn = useServerFn(adminResetPassword);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<AppRole>("worker");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.display_name ?? "");
    setMobile(initial?.mobile ?? "");
    setRole(initial?.role ?? "worker");
    setActive(initial?.active ?? true);
    setPassword("");
    setNewPw("");
    setMobileError(null);
    setShowPw(false);
    setShowNewPw(false);
  }, [open, initial]);

  async function handleSave() {
    setMobileError(null);
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter a full name");
      return;
    }
    if (!/^[+0-9 ()-]{4,20}$/.test(mobile.trim())) {
      toast.error("Enter a valid mobile number");
      return;
    }
    if (!isEdit && password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && initial?.user_id) {
        await updateFn({
          data: {
            user_id: initial.user_id,
            display_name: name.trim(),
            mobile: mobile.trim(),
            role: initial.isSelf ? undefined : role,
            active,
          },
        });
        toast.success("User updated");
      } else {
        await createFn({
          data: {
            display_name: name.trim(),
            mobile: mobile.trim(),
            password,
            role,
            active,
            email: "",
            username: "",
          },
        });
        toast.success("User added. Share their mobile number and password with them directly.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      if (msg.toLowerCase().includes("mobile already")) {
        setMobileError("Mobile already registered");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!initial?.user_id) return;
    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setResetting(true);
    try {
      await resetPwFn({ data: { user_id: initial.user_id, password: newPw } });
      toast.success("Password updated");
      setNewPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit user" : "Add user"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update profile, role, and active status."
              : "Create a staff account. They sign in with their mobile and password."}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mobile number</Label>
            <Input
              type="tel"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setMobileError(null);
              }}
              placeholder="+91 98xxxxxxxx"
              className={mobileError ? "border-destructive" : undefined}
            />
            {mobileError && (
              <p className="text-xs text-destructive">{mobileError}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <SmartSelect
              options={ROLE_OPTIONS}
              value={role}
              onChange={(v) => v && setRole(v as AppRole)}
              size="sm"
              disabled={initial?.isSelf}
            />
            {initial?.isSelf && (
              <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
            )}
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs">Temporary password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive users cannot sign in.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {isEdit && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label className="text-xs font-semibold">Set new password</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNewPw ? "Hide password" : "Show password"}
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleResetPassword}
                disabled={resetting || newPw.length < 8}
              >
                {resetting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Update password
              </Button>
            </div>
          )}
        </div>
        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add user"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}