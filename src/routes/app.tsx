import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
// AnimatePresence removed: the wait-mode exit fade was the main source of
// perceived nav lag; PageTransition now cross-fades in place without it.
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { DevRolePill } from "@/components/layout/DevRolePill";
import { ShortcutsHelpDialog } from "@/components/command/ShortcutsHelpDialog";
import { GlobalSearchPalette } from "@/components/command/GlobalSearchPalette";
import { PageTransition } from "@/components/shared/PageTransition";
import { RouteProgressBar } from "@/components/shared/RouteProgressBar";
import { RouteSkeleton } from "@/components/shared/RouteSkeleton";
import { BackButton } from "@/components/shared/BackButton";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { InstallBanner } from "@/components/shared/InstallBanner";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { canAccessRoute } from "@/lib/route-guard";
import { toast } from "sonner";
import { useAppLock } from "@/hooks/useAppLock";
import { LockScreen } from "@/components/lock/LockScreen";
import { useRealtimeInvalidator } from "@/hooks/useRealtimeInvalidator";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { role, realRole, rolesLoading, roleResolutionFailed } = useRole();
  const { user, loading: authLoading, displayName, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const hasResolvedOnceRef = useRef(false);
  if (!authLoading && user) {
    hasResolvedOnceRef.current = true;
  }

  const { locked, unlock, isLockConfigured, idleTooLong } = useAppLock(user?.id ?? null);

  // Tier B · Live sync: one global Supabase channel invalidates relevant
  // React Query caches when teammates change inventory/production/sales/procurement data.
  useRealtimeInvalidator(!!user && !locked);

  // Force sign-out if idle longer than 15 days.
  useEffect(() => {
    if (!user) return;
    if (idleTooLong()) {
      void signOut();
      toast.message("Signed out after 15 days of inactivity");
    }
  }, [user, idleTooLong, signOut]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({ onHelpOpen: () => setHelpOpen(true) });

  // ⌘⇧K opens the authorized global search palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        setGlobalSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Role-based route guard. Skip while:
  //  · auth is still resolving,
  //  · user is signed out (auth-guard below handles redirect to /auth),
  //  · roles are still loading (don't kick admins off admin pages while their
  //    role array is briefly empty).
  useEffect(() => {
    if (authLoading || !user || rolesLoading) return;
    if (roles.length === 0) return;
    if (!canAccessRoute(location.pathname, role)) {
      toast.error("You don't have permission to access that page.");
      navigate({ to: role === "customer" ? "/app/quick-order" : "/app/dashboard", replace: true });
    }
  }, [location.pathname, role, rolesLoading, authLoading, user, roles.length, navigate]);

  // Customers should never see internal /app shell — push them to /store.
  useEffect(() => {
    if (authLoading || !user || rolesLoading) return;
    if (roles.length === 0) return;
    if (realRole === "customer" && location.pathname.startsWith("/app")) {
      if (typeof window !== "undefined") window.location.assign("/store");
    }
  }, [authLoading, user, rolesLoading, realRole, roles.length, location.pathname]);

  // Initial-page-load default: non-customer users who reload directly onto
  // /app/quick-order should land on the dashboard instead. Only fires once
  // on the very first auth resolution, so client-side navigation to
  // quick-order during the session is preserved.
  const initialRedirectDoneRef = useRef(false);
  useEffect(() => {
    if (authLoading || !user || rolesLoading) return;
    if (roles.length === 0) return;
    if (initialRedirectDoneRef.current) return;
    initialRedirectDoneRef.current = true;
    if (role !== "customer" && location.pathname === "/app/quick-order") {
      navigate({ to: "/app/dashboard", replace: true });
    }
  }, [authLoading, user, rolesLoading, role, roles.length, location.pathname, navigate]);

  // Access guard — must be signed in. Use replace so back button doesn't
  // re-enter the (now unauthenticated) app shell.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [user, authLoading, navigate]);

  // Initial-mount spinner: only before the first successful auth resolution.
  if (!hasResolvedOnceRef.current && (authLoading || !user)) {
    return <SplashScreen />;
  }
  // After logout, user becomes null. Show the spinner while we navigate to
  // /auth instead of leaving the stale layout (with stale role) on screen.
  if (!user) {
    return <SplashScreen />;
  }

  // Role resolution recovery: signed in, roles loading finished, but no role
  // row was returned (RLS hiccup, dropped request, etc). DO NOT redirect to
  // /store and DO NOT trust the "customer" fallback — show a refresh prompt.
  if (roleResolutionFailed) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>Could not load your role</div>
        <div style={{ fontSize: 14, color: "#6B7280" }}>
          Please refresh the page · पेज रिफ्रेश करें
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 24px",
            background: "#2454A4",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Refresh · रिफ्रेश करें
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          style={{
            padding: "8px 20px",
            background: "transparent",
            color: "#6B7280",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {locked && isLockConfigured() && (
        <LockScreen
          userId={user.id}
          userLabel={displayName ?? user.email ?? ""}
          onUnlock={unlock}
          onSignOut={() => void signOut()}
        />
      )}

      {/* Desktop sidebar · fixed 240px, md+ only */}
      <aside className="hidden w-[240px] shrink-0 border-r border-sidebar-border/60 bg-sidebar md:block">
        <Sidebar />
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopBar onSearchOpen={() => setGlobalSearchOpen(true)} />
        <main className="relative flex-1 overflow-y-auto px-4 pt-3 pb-20 md:px-6 md:pt-6 md:pb-4">
          <RouteProgressBar />
          <PageTransition routeKey={location.pathname}>
            <Suspense fallback={<RouteSkeleton />}>
              <BackButton />
              <Outlet />
            </Suspense>
          </PageTransition>
        </main>
      </div>

      <BottomNav />
      <DevRolePill />
      <InstallBanner />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <GlobalSearchPalette open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
    </div>
  );
}
