import { useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Truck,
  ClipboardList,
  Inbox,
  BarChart3,
  Sparkles,
  ChevronRight,
  HelpCircle,
  Boxes,
  Warehouse,
  Layers,
  Send,
  Users,
  ShieldCheck,
  Undo2,
  LogOut,
  Settings,
} from "lucide-react";
import { Factory, Cpu, Hammer, HardHat, Wrench, Zap } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { Logo } from "@/components/brand/Logo";
import { isRouteVisibleToRole } from "@/lib/role-nav";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/hooks/useDemo";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  supervisor: "Supervisor",
  worker: "Worker",
  dispatch: "Dispatch",
  sales: "Sales",
  customer: "Customer",
  requestor: "Requestor",
};

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
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      { label: "Products", href: "/app/products", icon: Boxes },
      { label: "Warehouses", href: "/app/warehouses", icon: Warehouse },
      { label: "Inventory", href: "/app/inventory", icon: Layers },
      { label: "Movements", href: "/app/movements", icon: ArrowLeftRight },
      { label: "Requests", href: "/app/requests", icon: Inbox },
    ],
  },
  {
    label: "Suppliers",
    items: [
      { label: "Suppliers", href: "/app/suppliers", icon: Truck },
      { label: "Purchase orders", href: "/app/purchase-orders", icon: ClipboardList },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Customers", href: "/app/customers", icon: Users },
      { label: "Quick order", href: "/app/quick-order", icon: Zap },
      { label: "Dispatch orders", href: "/app/dispatch-orders", icon: Send },
      { label: "Goods returns", href: "/app/goods-returns", icon: Undo2 },
    ],
  },
  {
    label: "Manufacturing",
    items: [
      { label: "Production logs", href: "/app/manufacturing", icon: Factory },
      { label: "Stations", href: "/app/stations", icon: Wrench },
      { label: "Stages", href: "/app/stages", icon: Layers },
      { label: "Machines", href: "/app/machines", icon: Cpu },
      { label: "Moulds", href: "/app/moulds", icon: Hammer },
      { label: "Workers", href: "/app/workers", icon: HardHat },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
      { label: "AI insights", href: "/app/ai-insights", icon: Sparkles },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "User management", href: "/app/users", icon: ShieldCheck },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Settings", href: "/app/settings", icon: Settings },
      { label: "Help", href: "/app/help", icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { role } = useRole();
  const { user, displayName: authDisplayName, signOut } = useAuth();
  const { isDemo, exitDemoMode } = useDemo();
  const navigate = useNavigate();

  const displayName = isDemo
    ? "Demo Admin"
    : (authDisplayName ?? user?.email?.split("@")[0] ?? "Account");
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = ROLE_LABELS[role] ?? role;

  const handleSignOut = async () => {
    if (isDemo) {
      await navigate({ to: "/" });
      exitDemoMode();
      return;
    }
    await signOut();
    await navigate({ to: "/auth" });
  };

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location.pathname === href;

  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => isRouteVisibleToRole(i.href, role)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav data-tour="sidebar" className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-4 border-b border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
            <Logo size={28} showWordmark={false} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              YOYO
            </span>
            <span className="text-[15px] font-semibold text-foreground">
              ERP Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-2 py-2">
          <Link
            to="/app/profile"
            onClick={onNavigate}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-background"
            aria-label="Open profile"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground shadow-sm">
              {initial}
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[13px] font-semibold text-foreground">
                {displayName}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {roleLabel}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={isDemo ? "Exit demo" : "Sign out"}
            title={isDemo ? "Exit demo" : "Sign out"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {visibleGroups.map((group, idx) => {
          const isCollapsed = collapsed[group.label] ?? false;
          return (
            <div key={group.label}>
              {idx > 0 && <div className="mx-3 my-3 border-t border-sidebar-border" />}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", !isCollapsed && "rotate-90")} />
                {group.label}
              </button>

              {!isCollapsed && (
                <div className="mt-1 space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      preload="intent"
                      onClick={onNavigate}
                      className={cn(
                        "group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-all",
                        isActive(item.href)
                          ? "bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_oklch(0.55_0.20_261/0.35)]"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                      )}
                    >
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                        isActive(item.href)
                          ? "bg-white/15 text-primary-foreground"
                          : "bg-muted/60 text-muted-foreground group-hover/nav:bg-primary/10 group-hover/nav:text-primary",
                      )}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </nav>
  );
}
