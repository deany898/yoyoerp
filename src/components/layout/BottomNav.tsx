import { Link, useLocation } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useRole } from "@/hooks/useRole";
import { getBottomNavRoutes } from "@/lib/role-nav";
import { ROUTE_META } from "@/lib/route-meta";

/**
 * Mobile bottom nav · role-aware. Pulls items from getBottomNavRoutes(role)
 * so each role only sees the modules they actually use.
 */
export function BottomNav() {
  const location = useLocation();
  const { role } = useRole();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href;
  const items = getBottomNavRoutes(role)
    .map((href) => ({ href, ...ROUTE_META[href] }))
    .filter((i) => i.label && i.icon)
    .slice(0, 4);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-card md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const Icon = item.icon!;
          return (
            <Link
              key={item.href}
              to={item.href}
              preload="intent"
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-h-[56px]",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground active:bg-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground active:bg-muted min-h-[56px]"
          aria-label="More navigation"
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">More navigation</SheetTitle>
          <Sidebar onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
