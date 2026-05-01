import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Menu, LayoutDashboard, Send, ClipboardCheck, Search } from "lucide-react";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { useRole } from "@/hooks/useRole";
import type { UserRoleType } from "@/lib/roles";

/**
 * Mobile floating bottom nav · 5 slots: Menu · Dashboard · Orders · Worklog · Search.
 * Role-aware route targets. Notch-safe, thumb-optimised.
 */

function ordersTargetFor(role: UserRoleType): string {
  if (role === "worker") return "/app/requests";
  if (role === "customer") return "/app/dashboard";
  return "/app/dispatch-orders";
}

function worklogTargetFor(role: UserRoleType): string {
  if (role === "customer") return "/app/dashboard";
  if (role === "sales") return "/app/dispatch-orders";
  return "/app/work-logs";
}

interface Slot {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  ariaLabel?: string;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const ordersHref = ordersTargetFor(role);
  const worklogHref = worklogTargetFor(role);
  const path = location.pathname;

  const slots: Slot[] = [
    { key: "menu", label: "Menu", icon: Menu, onClick: () => setMenuOpen(true), ariaLabel: "Open menu" },
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/app/dashboard", active: path === "/app/dashboard" },
    { key: "orders", label: "Orders", icon: Send, href: ordersHref, active: path.startsWith(ordersHref) },
    { key: "worklog", label: "Worklog", icon: ClipboardCheck, href: worklogHref, active: path.startsWith(worklogHref) },
    { key: "search", label: "Search", icon: Search, onClick: () => setSearchOpen(true), ariaLabel: "Open search" },
  ];

  return (
    <>
      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex items-stretch gap-1 rounded-2xl border border-border bg-card/95 px-1.5 py-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden"
        style={{ marginBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        aria-label="Primary"
      >
        {slots.map((s) => {
          const Icon = s.icon;
          const active = s.active === true;
          const className = cn(
            "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors min-h-[52px]",
            active ? "text-primary" : "text-muted-foreground active:bg-muted/60",
          );
          const inner = (
            <>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_oklch(0.55_0.20_261/0.55)]"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="truncate leading-none">{s.label}</span>
            </>
          );
          if (s.href) {
            return (
              <Link key={s.key} to={s.href} preload="intent" className={className} aria-label={s.ariaLabel ?? s.label}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={s.key} type="button" onClick={s.onClick} className={className} aria-label={s.ariaLabel ?? s.label}>
              {inner}
            </button>
          );
        })}
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[284px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            onNavigate={() => setMenuOpen(false)}
            onProfileClick={() => {
              setMenuOpen(false);
              navigate({ to: "/app/profile" });
            }}
          />
        </SheetContent>
      </Sheet>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
