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
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const Icon = item.icon!;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              preload="intent"
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors min-h-[60px]",
                active ? "text-primary" : "text-muted-foreground active:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_oklch(0.55_0.20_261/0.55)]"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground active:bg-muted/60 min-h-[60px]"
          aria-label="More navigation"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl">
            <MoreHorizontal className="h-5 w-5" />
          </span>
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
