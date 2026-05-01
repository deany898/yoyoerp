import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ShortcutsHelpDialog } from "@/components/command/ShortcutsHelpDialog";
import { PageTransition } from "@/components/shared/PageTransition";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { canAccessRoute } from "@/lib/route-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { role } = useRole();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts({ onHelpOpen: () => setHelpOpen(true) });

  // Role-based route guard
  useEffect(() => {
    if (!canAccessRoute(location.pathname, role)) {
      toast.error("You don't have permission to access that page.");
      navigate({ to: "/app/dashboard" });
    }
  }, [location.pathname, role, navigate]);

  // Access guard — must be signed in
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
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
          <main className="flex-1 overflow-y-auto p-3 pb-24 md:p-8 md:pb-8">
            <AnimatePresence mode="wait">
              <PageTransition routeKey={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <BottomNav />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
