import { useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Truck,
  ClipboardList,
  Inbox,
  BarChart3,
  Sparkles,
  Settings,
  ChevronRight,
  HelpCircle,
  Boxes,
  Warehouse,
  Layers,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { Logo } from "@/components/brand/Logo";
import { isRouteVisibleToRole } from "@/lib/role-nav";

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
    label: "Procurement",
    items: [
      { label: "Suppliers", href: "/app/suppliers", icon: Truck },
      { label: "Purchase orders", href: "/app/purchase-orders", icon: ClipboardList },
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
      { label: "Settings", href: "/app/settings", icon: Settings },
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
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <Logo size={36} variant="light" showWordmark={false} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
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

      <div className="border-t border-sidebar-border px-3 py-3">
        <Link
          to="/app/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </nav>
  );
}
