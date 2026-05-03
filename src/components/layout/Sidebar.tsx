import { LogOut, HelpCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SidebarRoleSimulator } from "@/components/layout/SidebarRoleSimulator";
import { navForRole, ROLE_LABELS } from "./shellNav";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_LABEL_KEY: Record<string, string> = {
  Dashboard: "nav_dashboard",
  Manufacturing: "nav_manufacturing",
  Orders: "nav_orders",
  Dispatch: "nav_dispatch",
  Users: "nav_users",
  Settings: "nav_settings",
  "My floor": "nav_floor",
  "My MOs": "nav_my_mos",
  Handoffs: "nav_handoffs",
  "New order": "nav_new_order",
  "My orders": "nav_my_orders",
  Customers: "nav_customers",
  Products: "nav_products",
  Today: "nav_today",
  "Dispatch orders": "nav_dispatch_orders",
  Delivered: "nav_delivered",
  Inventory: "nav_inventory",
  Requests: "nav_dispatch_orders",
  "Daily staffing": "nav_daily_staffing",
  "Staffing rules": "nav_staffing_rules",
};

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const { role } = useRole();
  const { user, displayName: authDisplayName, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

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
      className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      {/* Logo / app name */}
      <div className="flex items-center gap-3 border-b border-sidebar-border/60 px-5 py-5">
        <img
          src="/LOGO.png"
          alt="Yoyo"
          style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }}
        />
        <span className="text-sidebar-foreground font-bold text-lg tracking-tight">
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
                    "relative flex items-center gap-3 rounded-lg pl-3 pr-3 py-2.5 text-[14px] font-medium transition-all duration-200",
                    active
                      ? "shadow-sm"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  style={
                    active
                      ? {
                          background: "#1E3A6E",
                          color: "#FFFFFF",
                          borderLeft: "3px solid #3B82F6",
                          paddingLeft: 9,
                        }
                      : { color: "#CBD5E1" }
                  }
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                    )}
                    style={{ color: active ? "#FFFFFF" : "#CBD5E1" }}
                  />
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
        {/* Language toggle pill */}
        <div className="mb-2 flex items-center justify-end px-1">
          <div
            role="group"
            aria-label="Toggle language"
            className="inline-flex items-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold"
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={cn(
                "h-7 px-3 transition-colors",
                lang === "en" ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              aria-pressed={lang === "hi"}
              className={cn(
                "h-7 px-3 transition-colors",
                lang === "hi" ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
            >
              हिं
            </button>
          </div>
        </div>
        <Link
          to="/app/help"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-3 rounded-lg pl-3 pr-3 py-2 text-[13.5px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <HelpCircle className="h-[18px] w-[18px] shrink-0" />
          <span>{t("nav_help")}</span>
        </Link>
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
