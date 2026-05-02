import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { navForRole } from "./shellNav";

/**
 * Mobile bottom nav · fixed 64px white bar, role-based, max 4 slots.
 * Active slot uses a filled icon tile.
 */
export function BottomNav() {
  const location = useLocation();
  const { role } = useRole();
  const path = location.pathname;

  const slots = navForRole(role).slice(0, 4);

  if (slots.length === 0) return null;

  const isActive = (href: string) =>
    path === href || (href !== "/app/dashboard" && path.startsWith(href + "/"));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border/60 bg-white md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      aria-label="Primary"
    >
      {slots.map((s) => {
        const Icon = s.icon;
        const active = isActive(s.href);
        return (
          <Link
            key={`${s.label}-${s.href}`}
            to={s.href}
            preload="intent"
            aria-label={s.label}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground active:bg-muted/40",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active && "fill-current")} strokeWidth={active ? 2.25 : 1.75} />
            </span>
            <span className="leading-none">{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
