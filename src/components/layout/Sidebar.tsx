import { LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SidebarRoleSimulator } from "@/components/layout/SidebarRoleSimulator";
import { navForRole, ROLE_LABELS } from "./shellNav";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_LABEL_KEY: Record<string, string> = {
  Dashboard: "nav.dashboard",
  Manufacturing: "nav.manufacturing",
  Orders: "nav.orders",
  Dispatch: "nav.dispatch",
  Users: "nav.users",
  Settings: "nav.settings",
  "My floor": "nav.my_floor",
  "My MOs": "nav.my_mos",
  Handoffs: "nav.handoffs",
  "New order": "nav.new_order",
  "My orders": "nav.my_orders",
  Customers: "nav.customers",
  Products: "nav.products",
  Today: "nav.today",
  "Dispatch orders": "nav.dispatch_orders",
  Delivered: "nav.delivered",
  Inventory: "nav.inventory",
  Requests: "nav.requests",
};

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { role } = useRole();
  const { user, displayName: authDisplayName, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const displayName = authDisplayName ?? user?.email?.split("@")[0] ?? "Account";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = ROLE_LABELS[role] ?? role;
  const items = navForRole(role);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
      toast.error("Could not sign out. Please try again.");
    }
    try {
      await navigate({ to: "/auth", replace: true });
    } catch {
      if (typeof window !== "undefined") window.location.assign("/auth");
    }
  };

  const isActive = (href: string) => {
    const path = location.pathname;
    if (path === href) return true;
    // Treat nested routes as active (e.g. /app/manufacturing/$moId).
    return href !== "/app/dashboard" && path.startsWith(href + "/");
  };

  return (
    <nav
      data-tour="sidebar"
      className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground"
    >
      {/* Logo / app name */}
      <div className="flex items-center gap-3 border-b border-sidebar-border/60 px-5 py-5">
        <img
          src="/LOGO.png"
          alt="Yoyo"
          style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }}
        />
        <span
          className="text-white"
          style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}
        >
          Yoyo
        </span>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  preload="intent"
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg pl-4 pr-3 py-2.5 text-[13.5px] font-medium transition-colors",
                    active
                      ? "bg-[#1E3A6E] text-white border-l-[3px] border-[#3B82F6]"
                      : "text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white border-l-[3px] border-transparent",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">
                    {t(NAV_LABEL_KEY[item.label] ?? "", item.label)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User block at bottom */}
      <div className="border-t border-sidebar-border/60 px-3 py-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-2">
          <Link
            to="/app/profile"
            onClick={onNavigate}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-white/5"
            aria-label="Open profile"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground shadow-sm">
              {initial}
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
                {displayName}
              </span>
              <span className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-accent">
                {roleLabel}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <SidebarRoleSimulator />
      </div>
    </nav>
  );
}
