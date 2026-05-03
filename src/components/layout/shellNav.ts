import {
  LayoutDashboard,
  Factory,
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
  FileText,
  ClipboardCheck,
  History,
  type LucideIcon,
} from "lucide-react";
import type { UserRoleType } from "@/lib/roles";

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Sidebar (desktop) — full per-role nav. */
export const ROLE_NAV: Record<UserRoleType, ShellNavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Manufacturing", href: "/app/manufacturing", icon: Factory },
    { label: "Daily staffing", href: "/app/staffing/daily", icon: Users },
    { label: "Staffing rules", href: "/app/admin/staffing", icon: ShieldCheck },
    { label: "Rate card", href: "/app/rate-card", icon: FileText },
    { label: "Vehicles", href: "/app/vehicles", icon: Truck },
    { label: "Orders", href: "/app/quick-order", icon: ClipboardList },
    { label: "Dispatch", href: "/app/dispatch-orders", icon: Send },
    { label: "Users", href: "/app/settings/users", icon: ShieldCheck },
    { label: "Settings", href: "/app/admin/system", icon: Settings },
  ],
  manager: [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Manufacturing", href: "/app/manufacturing", icon: Factory },
    { label: "Daily staffing", href: "/app/staffing/daily", icon: Users },
    { label: "Vehicles", href: "/app/vehicles", icon: Truck },
    { label: "Dispatch", href: "/app/dispatch-orders", icon: Send },
  ],
  supervisor: [
    { label: "My floor", href: "/app/manufacturing", icon: Layers },
    { label: "My MOs", href: "/app/manufacturing", icon: Factory },
    { label: "Handoffs", href: "/app/wip", icon: ArrowLeftRight },
    { label: "Daily staffing", href: "/app/staffing/daily", icon: Users },
  ],
  sales: [
    { label: "New order", href: "/app/quick-order", icon: Zap },
    { label: "My orders", href: "/app/dispatch-orders", icon: ClipboardList },
    { label: "Customers", href: "/app/customers", icon: Users },
    { label: "Products", href: "/app/products", icon: Boxes },
  ],
  dispatch: [
    { label: "Today", href: "/app/dispatch-orders", icon: Truck },
    { label: "Dispatch orders", href: "/app/dispatch-orders", icon: Send },
    { label: "Delivered", href: "/app/dispatch-orders", icon: CheckCircle2 },
  ],
  worker: [
    { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "My MOs", href: "/app/manufacturing", icon: Factory },
    { label: "Inventory", href: "/app/inventory", icon: Layers },
  ],
  customer: [],
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  supervisor: "Supervisor",
  worker: "Worker",
  dispatch: "Driver",
  sales: "Sales",
  customer: "Customer",
};

export function navForRole(role: UserRoleType): ShellNavItem[] {
  return ROLE_NAV[role] ?? [];
}

/** Bottom nav (mobile) — role-tuned, max 5 slots; last slot may be More. */
export const BOTTOM_NAV: Record<UserRoleType, ShellNavItem[]> = {
  admin: [
    { label: "Home", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Factory", href: "/app/manufacturing", icon: Factory },
    { label: "Orders", href: "/app/quick-order", icon: ClipboardList },
    { label: "Dispatch", href: "/app/dispatch-orders", icon: Send },
  ],
  manager: [
    { label: "Home", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Factory", href: "/app/manufacturing", icon: Factory },
    { label: "Orders", href: "/app/quick-order", icon: ClipboardList },
    { label: "Dispatch", href: "/app/dispatch-orders", icon: Send },
  ],
  supervisor: [
    { label: "Home", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "Factory", href: "/app/manufacturing", icon: Factory },
    { label: "Workers", href: "/app/staffing/daily", icon: Users },
    { label: "Log", href: "/app/work-logs", icon: ClipboardList },
  ],
  sales: [
    { label: "Home", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "New order", href: "/app/quick-order", icon: Zap },
    { label: "My orders", href: "/app/dispatch-orders", icon: ClipboardList },
    { label: "Customers", href: "/app/customers", icon: Users },
  ],
  dispatch: [
    { label: "Home", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "My Loads", href: "/app/dispatch-orders", icon: Truck },
    { label: "Delivered", href: "/app/dispatch-orders", icon: ClipboardCheck },
    { label: "History", href: "/app/dispatch-orders", icon: History },
  ],
  worker: [
    { label: "Home", href: "/app/dashboard", icon: LayoutDashboard },
    { label: "MOs", href: "/app/manufacturing", icon: Factory },
    { label: "Inventory", href: "/app/inventory", icon: Layers },
  ],
  customer: [],
};

export function bottomNavForRole(role: UserRoleType): ShellNavItem[] {
  return BOTTOM_NAV[role] ?? [];
}

/** "More" overflow contents — admin/manager extras that don't fit the bottom bar. */
export const MORE_OVERFLOW: Record<UserRoleType, ShellNavItem[]> = {
  admin: [
    { label: "Inventory", href: "/app/inventory", icon: Boxes },
    { label: "Customers", href: "/app/customers", icon: Users },
    { label: "Products", href: "/app/products", icon: Layers },
    { label: "Users", href: "/app/settings/users", icon: ShieldCheck },
    { label: "Settings", href: "/app/admin/system", icon: Settings },
  ],
  manager: [
    { label: "Inventory", href: "/app/inventory", icon: Boxes },
    { label: "Customers", href: "/app/customers", icon: Users },
    { label: "Products", href: "/app/products", icon: Layers },
    { label: "Settings", href: "/app/admin/system", icon: Settings },
  ],
  supervisor: [],
  sales: [],
  dispatch: [],
  worker: [],
  customer: [],
};
