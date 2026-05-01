import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Boxes,
  Warehouse,
  Layers,
  ArrowLeftRight,
  Truck,
  ClipboardList,
  Inbox,
  BarChart3,
  Sparkles,
  Settings,
  HelpCircle,
  Send,
  Users,
  Factory,
} from "lucide-react";
import { ClipboardCheck } from "lucide-react";
import { Layers as LayersIcon } from "lucide-react";

export interface RouteMeta {
  label: string;
  parent?: string;
  icon?: ComponentType<{ className?: string }>;
  group?: string;
}

/**
 * Single source of truth for breadcrumbs, page titles, and sidebar/bottom-nav.
 * Add a route here once and every shell surface picks it up.
 */
export const ROUTE_META: Record<string, RouteMeta> = {
  "/app/dashboard": { label: "Dashboard", icon: LayoutDashboard, group: "Operations" },
  "/app/products": { label: "Products", icon: Boxes, group: "Operations" },
  "/app/warehouses": { label: "Warehouses", icon: Warehouse, group: "Operations" },
  "/app/inventory": { label: "Inventory", icon: Layers, group: "Operations" },
  "/app/movements": { label: "Movements", icon: ArrowLeftRight, group: "Operations", parent: "/app/inventory" },
  "/app/requests": { label: "Requests", icon: Inbox, group: "Operations" },
  "/app/suppliers": { label: "Suppliers", icon: Truck, group: "Procurement" },
  "/app/purchase-orders": { label: "Purchase orders", icon: ClipboardList, group: "Procurement" },
  "/app/customers": { label: "Customers", icon: Users, group: "Sales" },
  "/app/dispatch-orders": { label: "Dispatch orders", icon: Send, group: "Sales" },
  "/app/manufacturing": { label: "Production", icon: Factory, group: "Manufacturing" },
  "/app/work-logs": { label: "Work logs", icon: ClipboardCheck, group: "Manufacturing" },
  "/app/wip": { label: "Stage WIP", icon: LayersIcon, group: "Manufacturing" },
  "/app/analytics": { label: "Analytics", icon: BarChart3, group: "Intelligence" },
  "/app/ai-insights": { label: "AI insights", icon: Sparkles, group: "Intelligence" },
  "/app/command-center": { label: "Command center", icon: Sparkles, group: "Intelligence" },
  "/app/admin": { label: "Admin", icon: Settings, group: "Admin" },
  "/app/admin/system": { label: "System config", icon: Settings, group: "Admin" },
  "/app/admin/presets": { label: "Presets", icon: Settings, group: "Admin" },
  "/app/admin/inventory-settings": { label: "Inventory settings", icon: Settings, group: "Admin" },
  "/app/admin/audit": { label: "Audit log", icon: Settings, group: "Admin" },
  "/app/help": { label: "Help", icon: HelpCircle, group: "Support" },
};

export function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [];
  let current: string | undefined = pathname;
  const seen = new Set<string>();
  while (current && ROUTE_META[current] && !seen.has(current)) {
    seen.add(current);
    const meta: RouteMeta = ROUTE_META[current];
    crumbs.unshift({ label: meta.label, href: current });
    current = meta.parent;
  }
  if (crumbs.length === 0) return crumbs;
  // Last crumb is the current page — no link.
  crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
  return crumbs;
}

export function getPageTitle(pathname: string): string {
  return ROUTE_META[pathname]?.label ?? "";
}