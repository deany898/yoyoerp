import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
// AnimatePresence removed: the wait-mode exit fade was the main source of
// perceived nav lag; PageTransition now cross-fades in place without it.
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { RoleSimulatorBar } from "@/components/layout/RoleSimulatorBar";
import { ShortcutsHelpDialog } from "@/components/command/ShortcutsHelpDialog";
import { GlobalSearchPalette } from "@/components/command/GlobalSearchPalette";
import { PageTransition } from "@/components/shared/PageTransition";
import { RouteProgressBar } from "@/components/shared/RouteProgressBar";
import { RouteSkeleton } from "@/components/shared/RouteSkeleton";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { canAccessRoute } from "@/lib/route-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { role, rolesLoading } = useRole();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const hasResolvedOnceRef = useRef(false);
  if (!authLoading && user) {
    hasResolvedOnceRef.current = true;
  }

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
    if (!canAccessRoute(location.pathname, role)) {
      toast.error("You don't have permission to access that page.");
      navigate({ to: role === "customer" ? "/app/quick-order" : "/app/dashboard", replace: true });
    }
  }, [location.pathname, role, rolesLoading, authLoading, user, navigate]);

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
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }
  // After logout, user becomes null. Show the spinner while we navigate to
  // /auth instead of leaving the stale layout (with stale role) on screen.
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[264px] shrink-0 border-r border-border bg-sidebar md:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="hidden md:block">
            <Header />
          </div>
          <main className="relative flex-1 overflow-y-auto p-3 pb-24 md:p-8 md:pb-8">
            <RouteProgressBar />
            <PageTransition routeKey={location.pathname}>
              <Suspense fallback={<RouteSkeleton />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </main>
        </div>
      </div>
      <BottomNav />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <RoleSimulatorBar />
      <GlobalSearchPalette open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
    </div>
  );
}
