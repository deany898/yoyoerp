import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notify, friendlyAuthError } from "@/lib/notify";
import { AuthIconInput } from "@/components/auth/AuthIconInput";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — YOYO ERP" },
      { name: "description", content: "Sign in to YOYO ERP to manage your operations." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const signupSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/app/dashboard" });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email: signinEmail, password: signinPassword });
    if (!parsed.success) {
      notify.warning(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (error) {
      notify.error(friendlyAuthError(error.message), { retry: () => void handleSignIn(e) });
      return;
    }
    notify.success("Welcome back");
    navigate({ to: "/app/dashboard" });
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({
      displayName: signupName,
      email: signupEmail,
      password: signupPassword,
    });
    if (!parsed.success) {
      notify.warning(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/dashboard`,
        data: { display_name: parsed.data.displayName },
      },
    });
    setSubmitting(false);
    if (error) {
      notify.error(friendlyAuthError(error.message));
      return;
    }
    notify.success("Check your email to confirm your account");
    setTab("signin");
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app/dashboard`,
    });
    if (result.error) {
      setSubmitting(false);
      notify.error("Could not sign in with Google", { retry: () => void handleGoogle() });
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app/dashboard" });
  };

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(forgotEmail);
    if (!parsed.success) {
      notify.warning("Enter a valid email");
      return;
    }
    setForgotSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setForgotSending(false);
    if (error) {
      notify.error(friendlyAuthError(error.message));
      return;
    }
    notify.success("Reset link sent. Check your inbox.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <Loader2 className="h-6 w-6 animate-spin text-sidebar-foreground/60" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-gradient-to-br from-sky-50 via-background to-cyan-50/60 px-4 py-10 text-foreground">
      {/* soft ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" />

      <main className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={88} showWordmark={false} />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">YOYO ERP</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">YOYO Internal Operations Platform</p>
        </div>

        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.15)] md:p-8">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="w-full">
                <div className="mb-5 text-center">
                  <h2 className="text-xl font-semibold text-foreground">
                    {tab === "signin" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tab === "signin"
                      ? "Sign in to continue to YOYO"
                      : "Set up your YOYO ERP workspace access"}
                  </p>
                </div>

                <TabsList className="mb-6 grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <AuthIconInput
                      id="signin-email"
                      label="Email"
                      icon={Mail}
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={signinEmail}
                      onChange={(e) => setSigninEmail(e.target.value)}
                      required
                    />
                    <AuthIconInput
                      id="signin-password"
                      label="Password"
                      icon={Lock}
                      password
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={signinPassword}
                      onChange={(e) => setSigninPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="submit"
                      className="h-11 w-full bg-primary text-primary-foreground text-base font-semibold shadow-sm hover:bg-primary/90"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Opening dashboard…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Lock className="h-4 w-4" /> Sign in
                        </span>
                      )}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(signinEmail); setForgotOpen(true); }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <AuthIconInput
                      id="signup-name"
                      label="Name"
                      icon={UserIcon}
                      autoComplete="name"
                      placeholder="Jane Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                    <AuthIconInput
                      id="signup-email"
                      label="Email"
                      icon={Mail}
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                    <AuthIconInput
                      id="signup-password"
                      label="Password"
                      icon={Lock}
                      password
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="-mt-2 text-xs text-muted-foreground">Minimum 8 characters.</p>
                    <Button
                      type="submit"
                      className="h-11 w-full bg-primary text-primary-foreground text-base font-semibold shadow-sm hover:bg-primary/90"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                        </span>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>OR</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={handleGoogle}
                  disabled={submitting}
                >
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Authorized personnel only · Accounts are managed by administrators.
                </p>
              </Tabs>
        </div>
      </main>

      <footer className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} YOYO · All rights reserved.
      </footer>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              We'll email you a link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)} disabled={forgotSending}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotSending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {forgotSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
