import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notify";
import { resolveLoginEmail } from "@/server/auth-resolve.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Staff sign in — YOYO Industries" },
      { name: "description", content: "Authorised staff access only." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const ACCESS_DENIED = "Access denied. Contact your administrator.";

type Role =
  | "admin"
  | "manager"
  | "accountant"
  | "supervisor"
  | "sales"
  | "dispatch"
  | "driver"
  | "customer"
  | string;

function destinationForRole(role: Role | null): string {
  switch (role) {
    case "admin":
    case "manager":
    case "accountant":
      return "/app/dashboard";
    case "supervisor":
      return "/app/floor";
    case "sales":
      return "/app/quick-order";
    case "dispatch":
    case "driver":
      return "/app/driver";
    case "customer":
      return "/store";
    default:
      return "/app/dashboard";
  }
}

function AuthPage() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const role = roles?.[0] ?? null;
      navigate({ to: destinationForRole(role) });
    }
  }, [user, loading, roles, navigate]);

  const fail = async (signOut = false) => {
    if (signOut) {
      try { await supabase.auth.signOut(); } catch { /* noop */ }
    }
    notify.error(ACCESS_DENIED);
    setSubmitting(false);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleaned = mobile.trim();
    if (!cleaned || !password) {
      notify.error(ACCESS_DENIED);
      return;
    }

    setSubmitting(true);

    // Step 1-3: resolve real auth email from mobile via service-role server fn.
    let realEmail: string | null = null;
    try {
      const res = await resolveLoginEmail({ data: { mobile: cleaned } });
      realEmail = res?.email ?? null;
    } catch {
      realEmail = null;
    }

    // Fallback: if the user typed an actual email address into the mobile
    // field, use it directly. Lets staff with real-email auth records
    // (e.g. Gmail) sign in even if mobile-→-email resolution fails.
    if (!realEmail && cleaned.includes("@")) {
      realEmail = cleaned;
    }

    if (!realEmail) {
      await fail(false);
      return;
    }

    // Step 4: actually sign in.
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: realEmail,
      password,
    });

    if (error || !authData.user) {
      await fail(false);
      return;
    }

    const userId = authData.user.id;

    // Step 5: check active status. profiles row keyed by user_id.
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("admin_locked")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr || !profile || profile.admin_locked === true) {
      await fail(true);
      return;
    }

    // Step 6: resolve role with priority order.
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleList = (roleRows ?? []).map((r) => r.role as Role);
    const priority: Role[] = [
      "admin",
      "manager",
      "accountant",
      "supervisor",
      "sales",
      "dispatch",
      "driver",
      "customer",
    ];
    const role = priority.find((p) => roleList.includes(p)) ?? roleList[0] ?? null;

    setSubmitting(false);
    notify.success("Welcome back");
    navigate({ to: destinationForRole(role) });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-background to-cyan-50/40 px-4 py-10">
      <main className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-foreground" style={{ fontWeight: 500 }}>
            YOYO Industries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff portal · authorised access only
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.15)] md:p-8">
          <form onSubmit={handleSignIn} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="mobile-number" className="text-sm font-medium">
                Mobile number
              </Label>
              <Input
                id="mobile-number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="Enter your mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                disabled={submitting}
                className="h-[52px] w-full text-base"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="h-[52px] w-full pr-12 text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-[52px] w-full bg-teal-600 text-base font-semibold text-white shadow-sm hover:bg-teal-700 focus-visible:ring-teal-500"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Login"
              )}
            </Button>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              Access is for authorised staff only. Contact your administrator for access.
            </p>
          </form>
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} YOYO Industries · All rights reserved.
        </footer>
      </main>
    </div>
  );
}
