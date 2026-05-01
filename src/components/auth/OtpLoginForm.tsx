import { useState, type FormEvent } from "react";
import { Loader2, Mail, KeyRound, MessageSquare } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthIconInput } from "@/components/auth/AuthIconInput";
import { notify, friendlyAuthError } from "@/lib/notify";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

type Step = "email" | "verify";

interface Props {
  onSuccess?: () => void;
}

export function OtpLoginForm({ onSuccess }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { notify.warning(parsed.error.issues[0]?.message ?? "Invalid email"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/app/dashboard` },
    });
    setSubmitting(false);
    if (error) { notify.error(friendlyAuthError(error.message)); return; }
    notify.success("Code sent · check your email");
    setStep("verify");
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) { notify.warning(parsed.error.issues[0]?.message ?? "Invalid code"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: parsed.data,
      type: "email",
    });
    setSubmitting(false);
    if (error) { notify.error(friendlyAuthError(error.message)); return; }
    notify.success("Signed in");
    onSuccess?.();
  };

  return (
    <div className="space-y-4">
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <AuthIconInput
            id="otp-email"
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={submitting} className="h-11 w-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90">
            {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending code…</span> : <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Send 6-digit code</span>}
          </Button>
          <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <MessageSquare className="mr-1 inline h-3 w-3" /> SMS / WhatsApp OTP coming soon · for now use email or password.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Code sent to <span className="font-medium text-foreground">{email}</span>
          </div>
          <AuthIconInput
            id="otp-code"
            label="6-digit code"
            icon={KeyRound}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <Button type="submit" disabled={submitting} className="h-11 w-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90">
            {submitting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</span> : <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Verify & sign in</span>}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); }}
            className="block w-full text-center text-xs font-medium text-primary hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}