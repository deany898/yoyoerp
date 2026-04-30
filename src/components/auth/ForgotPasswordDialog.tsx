import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthIconInput } from "@/components/auth/AuthIconInput";
import { notify, friendlyAuthError } from "@/lib/notify";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
};

export function ForgotPasswordDialog({ open, onOpenChange, defaultEmail = "" }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      notify.warning("Enter a valid email");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setSending(false);
    if (error) {
      notify.error(friendlyAuthError(error.message));
      return;
    }
    notify.success("Reset link sent. Check your inbox.");
    onOpenChange(false);
    setEmail("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setEmail(defaultEmail);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            We'll email you a link to set a new password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <AuthIconInput
            id="forgot-email"
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send reset link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}