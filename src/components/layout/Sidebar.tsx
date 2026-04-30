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
} from "lucide-react";
import { Factory, Cpu, Hammer, HardHat, Wrench } from "lucide-react";
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
      { label: "Dispatch orders", href: "/app/dispatch-orders", icon: Send },
      { label: "Goods returns", href: "/app/goods-returns", icon: Undo2 },
    ],
  },
  {
    label: "Manufacturing",
    items: [
      { label: "Production logs", href: "/app/manufacturing", icon: Factory },
      { label: "Stations", href: "/app/stations", icon: Wrench },
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
      <div className="flex flex-col gap-3 border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Logo size={36} variant="light" showWordmark={false} />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-primary">
              YOYO
            </span>
            <span className="text-sm font-semibold text-sidebar-foreground">
              ERP Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {displayName}
            </span>
            <span className="truncate text-[11px] text-sidebar-foreground/60">
              {roleLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={isDemo ? "Exit demo" : "Sign out"}
            title={isDemo ? "Exit demo" : "Sign out"}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {visibleGroups.map((group, idx) => {
          const isCollapsed = collapsed[group.label] ?? false;
          return (
            <div key={group.label}>
              {idx > 0 && <div className="mx-2 my-2 border-t border-sidebar-border" />}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
              >
                <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", !isCollapsed && "rotate-90")} />
                {group.label}
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      preload="intent"
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-sidebar-accent font-medium text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
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
