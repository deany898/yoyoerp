import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { bottomNavForRole } from "./shellNav";
import { useLanguage } from "@/contexts/LanguageContext";

const BOTTOM_NAV_KEY: Record<string, string> = {
  Home: "nav_home",
  Factory: "nav_factory",
  Orders: "nav_orders",
  Dispatch: "nav_dispatch",
  More: "nav_more",
  Floor: "nav_floor",
  "My MOs": "nav_my_mos",
  Handoffs: "nav_handoffs",
  "New order": "nav_new_order",
  "My orders": "nav_my_orders",
  Customers: "nav_customers",
  Today: "nav_today",
  Done: "nav_done",
  MOs: "nav_my_mos",
  Inventory: "nav_inventory",
  Products: "nav_products",
  Users: "nav_users",
  Settings: "nav_settings",
  Workers: "nav_users",
  Log: "nav_work_logs",
  Pack: "nav_dispatch",
  Ready: "nav_dispatch",
  History: "nav_dispatch",
  "My Loads": "nav_dispatch",
  Delivered: "nav_delivered",
};

/**
 * Mobile bottom nav · 60px + safe-area, role-based, max 5 slots.
 * Last slot may be a "More" trigger that opens an overflow sheet.
 */
export function BottomNav() {
  const location = useLocation();
  const { role } = useRole();
  const { t } = useLanguage();
  const path = location.pathname;

  const slots = bottomNavForRole(role).slice(0, 4);
  if (slots.length === 0) return null;

  const isActive = (href: string) =>
    path === href || (href !== "/app/dashboard" && path.startsWith(href + "/"));

  return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border/60 bg-white md:hidden"
        style={{ height: 60, paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        aria-label="Primary"
      >
        {slots.map((s) => {
          const Icon = s.icon;
          const active = isActive(s.href);
          const label = t(BOTTOM_NAV_KEY[s.label] ?? "", s.label);

          const inner = (
            <>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-transparent text-slate-400",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span className={cn("leading-none", active ? "text-primary" : "text-slate-500")}>{label}</span>
            </>
          );

          return (
            <Link
              key={`${s.label}-${s.href}`}
              to={s.href}
              preload="intent"
              aria-label={label}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors"
            >
              {inner}
            </Link>
          );
        })}
      </nav>
  );
}
