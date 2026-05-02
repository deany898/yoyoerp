import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notify";
import { resolveLoginEmail } from "@/server/auth-resolve.functions";
import { getUserRole } from "@/server/get-user-role.functions";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useLanguage } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Staff sign in — Yoyo" },
      { name: "description", content: "Authorised staff access only." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const ACCESS_DENIED = "Access denied. Contact your administrator.";

type Role = "admin" | "manager" | "accountant" | "supervisor" | "sales" | "dispatch" | "driver" | "customer" | string;

function destinationForRole(role: Role | null | undefined): string {
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

function resolveHighestRole(roleRows: { role: string }[] | null | undefined): Role | null {
  const roleList = (roleRows ?? []).map((r) => r.role as Role);
  const priority: Role[] = ["admin", "manager", "accountant", "supervisor", "sales", "dispatch", "driver", "customer"];
  return priority.find((p) => roleList.includes(p)) ?? roleList[0] ?? null;
}

function AuthPage() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("yoyo_theme") === "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("yoyo_theme", darkMode ? "dark" : "light");
    }
  }, [darkMode]);

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

    const input = mobile.trim();
    if (!input || !password) {
      notify.error(ACCESS_DENIED);
      return;
    }

    setSubmitting(true);

    if (input.includes("@")) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input,
        password,
      });

      if (data?.user && !error) {
        const roleRows = await getUserRole({ data: { userId: data.user.id } });
        const role = resolveHighestRole(roleRows);
        setSubmitting(false);
        notify.success("Welcome back");
        navigate({ to: destinationForRole(role) });
        return;
      }

      notify.error(ACCESS_DENIED);
      setSubmitting(false);
      return;
    }

    let realEmail: string | null = null;
    try {
      const res = await resolveLoginEmail({ data: { mobile: input } });
      realEmail = res?.email ?? null;
    } catch {
      realEmail = null;
    }

    if (!realEmail) {
      await fail(false);
      return;
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: realEmail,
      password,
    });

    if (error || !authData.user) {
      await fail(false);
      return;
    }

    const userId = authData.user.id;

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("admin_locked")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileErr || !profile || profile.admin_locked === true) {
      await fail(true);
      return;
    }

    const roleRows = await getUserRole({ data: { userId } });
    const role = resolveHighestRole(roleRows);

    setSubmitting(false);
    notify.success("Welcome back");
    navigate({ to: destinationForRole(role) });
  };

  const signInWithGoogle = async () => {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/app/dashboard` : undefined,
      },
    });
    if (error) {
      notify.error(error.message);
      setSubmitting(false);
    }
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
      {/* Top-right toggles */}
      <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
        <div className="inline-flex items-center overflow-hidden rounded-full border border-border bg-card text-[11px] font-semibold shadow-sm">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`px-3 py-1 transition-colors ${lang === "en" ? "bg-[#1E3A6E] text-white" : "text-muted-foreground hover:bg-muted"}`}
            aria-pressed={lang === "en"}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("hi")}
            className={`px-3 py-1 transition-colors ${lang === "hi" ? "bg-[#1E3A6E] text-white" : "text-muted-foreground hover:bg-muted"}`}
            aria-pressed={lang === "hi"}
          >
            हिं
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <main className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/LOGO.png"
            alt="Yoyo"
            style={{ width: 72, height: 72, borderRadius: 8, objectFit: "contain" }}
          />
          <h1
            className="mt-3 tracking-tight text-foreground"
            style={{ fontWeight: 800, fontSize: 28, lineHeight: 1.1 }}
          >
            Yoyo
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Staff portal · केवल अधिकृत कर्मचारी
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.15)] md:p-8">
          <form onSubmit={handleSignIn} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="mobile-number" className="text-sm font-medium">
                Mobile or Email · मोबाइल या ईमेल
              </Label>
              <Input
                id="mobile-number"
                type="text"
                autoComplete="username"
                placeholder="98765 43210 or email@example.com"
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

            <div className="relative my-1 flex items-center">
              <div className="h-px flex-1 bg-border" />
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={signInWithGoogle}
              disabled={submitting}
              className="h-11 w-full justify-center gap-2 text-sm font-medium"
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </Button>
          </form>
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Yoyo · All rights reserved.
        </footer>
      </main>
    </div>
  );
}
