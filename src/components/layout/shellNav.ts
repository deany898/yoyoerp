import {
  LayoutDashboard,
  Factory,
  ShoppingCart,
  Send,
  ShieldCheck,
  Settings,
  Layers,
  ArrowLeftRight,
  Zap,
  ClipboardList,
  Users,
  Boxes,
  Truck,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import type { UserRoleType } from "@/lib/roles";

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Strict per-role navigation for the AppShell.
 * Sidebar (desktop) shows the full list; bottom nav (mobile) shows the first 4.
 */
export const ROLE_NAV: Record<UserRoleType, ShellNavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Manufacturing", href: "/app/manufacturing", icon: Factory },
    { label: "Dispatch", href: "/app/dispatch-orders", icon: Send },
    { label: "Users", href: "/app/settings/users", icon: ShieldCheck },
    { label: "Settings", href: "/app/admin/system", icon: Settings },
  ],
  manager: [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Manufacturing", href: "/app/manufacturing", icon: Factory },
    { label: "Dispatch", href: "/app/dispatch-orders", icon: Send },
  ],
  supervisor: [
    { label: "My floor", href: "/app/floor", icon: Layers },
    { label: "My MOs", href: "/app/manufacturing", icon: Factory },
    { label: "Handoffs", href: "/app/handoffs", icon: ArrowLeftRight },
  ],
  sales: [
    { label: "New order", href: "/app/quick-order", icon: Zap },
    { label: "My orders", href: "/app/dispatch-orders", icon: ClipboardList },
    { label: "Customers", href: "/app/customers", icon: Users },
    { label: "Products", href: "/app/products", icon: Boxes },
  ],
  dispatch: [
    { label: "Today", href: "/app/driver", icon: Truck },
    { label: "Dispatch orders", href: "/app/dispatch-orders", icon: Send },
    { label: "Delivered", href: "/app/delivered", icon: CheckCircle2 },
  ],
  worker: [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "My MOs", href: "/app/manufacturing", icon: Factory },
    { label: "Inventory", href: "/app/inventory", icon: Layers },
  ],
  customer: [],
  requestor: [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Requests", href: "/app/requests", icon: ClipboardList },
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  supervisor: "Supervisor",
  worker: "Worker",
  dispatch: "Driver",
  sales: "Sales",
  customer: "Customer",
  requestor: "Requestor",
};

export function navForRole(role: UserRoleType): ShellNavItem[] {
  return ROLE_NAV[role] ?? [];
}