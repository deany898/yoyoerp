import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  Boxes,
  Building2,
  FileText,
  Warehouse,
  Calculator,
  Factory,
  Workflow,
  HardHat,
  Box,
  Cog,
  UserCog,
  Receipt,
  Bell,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/hooks/useDemo";
import { isRouteVisibleToRole } from "@/lib/role-nav";
import yoyoLogo from "@/assets/yoyo-logo.png";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      { label: "Orders", href: "/app/orders", icon: ShoppingCart },
      { label: "Customers", href: "/app/customers", icon: Users },
      { label: "Dispatch", href: "/app/dispatch", icon: Truck },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { label: "Products", href: "/app/products", icon: Boxes },
      { label: "Vendors", href: "/app/vendors", icon: Building2 },
      { label: "Purchases", href: "/app/purchases", icon: FileText },
      { label: "Inventory", href: "/app/inventory", icon: Warehouse },
      { label: "Costing", href: "/app/costing", icon: Calculator },
    ],
  },
  {
    label: "ERP",
    items: [
      { label: "Production", href: "/app/production", icon: Factory },
      { label: "Production Stage", href: "/app/production-stage", icon: Workflow },
      { label: "Workers", href: "/app/workers", icon: HardHat },
      { label: "Moulds", href: "/app/moulds", icon: Box },
      { label: "Machines", href: "/app/machines", icon: Cog },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "User Management", href: "/app/user-management", icon: UserCog },
      { label: "Expenses", href: "/app/expenses", icon: Receipt },
      { label: "Notifications", href: "/app/notifications", icon: Bell },
      { label: "Reports", href: "/app/reports", icon: BarChart3 },
      { label: "Settings", href: "/app/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useRole();
  const { user, displayName: authDisplayName, signOut } = useAuth();
  const { isDemo, exitDemoMode } = useDemo();

  const displayName = isDemo ? "Deany" : (authDisplayName ?? user?.email ?? "Account");
  const roleLabel = role === "admin" ? "Administrator" : role.charAt(0).toUpperCase() + role.slice(1);
  const initial = displayName.charAt(0).toUpperCase();

  const isActive = (href: string) => location.pathname === href;

  const handleLogout = async () => {
    if (isDemo) {
      await navigate({ to: "/" });
      exitDemoMode();
      return;
    }
    await signOut();
    await navigate({ to: "/auth" });
  };

  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        // Show stub routes to admin/manager always; gate real ones via role-nav.
        const realRoute = isRouteVisibleToRole(i.href, role);
        const isStub = !["/app/dashboard","/app/products","/app/inventory","/app/movements","/app/requests","/app/customers","/app/dispatch-orders","/app/suppliers","/app/purchase-orders","/app/warehouses","/app/analytics","/app/ai-insights","/app/settings","/app/help"].includes(i.href);
        if (isStub) return role === "admin" || role === "manager";
        return realRoute;
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav data-tour="sidebar" className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5">
          <img src={yoyoLogo} alt="YOYO" className="h-7 w-7 object-contain" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">YOYO</span>
          <span className="text-base font-semibold tracking-tight text-sidebar-foreground">ERP Platform</span>
        </div>
      </div>

      {/* User card */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/40 px-3 py-2.5 ring-1 ring-white/5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</div>
            <div className="truncate text-xs text-sidebar-foreground/60">{roleLabel}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label={isDemo ? "Exit demo" : "Sign out"}
            title={isDemo ? "Exit demo" : "Sign out"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    preload="intent"
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-gradient-to-r from-primary/30 via-primary/15 to-transparent font-medium text-sidebar-foreground shadow-[inset_0_0_0_1px] shadow-primary/30"
                        : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                    )}
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
