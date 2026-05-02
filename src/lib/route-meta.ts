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
} from "lucide-react";
import { ClipboardCheck } from "lucide-react";
import { Layers as LayersIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";

export interface RouteMeta {
  label: string;
  titleKey?: TranslationKey;
  parent?: string;
  icon?: ComponentType<{ className?: string }>;
  group?: string;
}

/**
 * Single source of truth for breadcrumbs, page titles, and sidebar/bottom-nav.
 * Add a route here once and every shell surface picks it up.
 */
export const ROUTE_META: Record<string, RouteMeta> = {
  "/app/dashboard": { label: "Dashboard", titleKey: "nav_dashboard", icon: LayoutDashboard, group: "Operations" },
  "/app/products": { label: "Products", titleKey: "nav_products", icon: Boxes, group: "Operations" },
  "/app/warehouses": { label: "Warehouses", titleKey: "page_warehouses", icon: Warehouse, group: "Operations" },
  "/app/inventory": { label: "Inventory", titleKey: "nav_inventory", icon: Layers, group: "Operations" },
  "/app/movements": { label: "Movements", titleKey: "page_movements", icon: ArrowLeftRight, group: "Operations", parent: "/app/inventory" },
  "/app/requests": { label: "Requests", titleKey: "page_requests", icon: Inbox, group: "Operations" },
  "/app/suppliers": { label: "Suppliers", titleKey: "nav_suppliers", icon: Truck, group: "Procurement" },
  "/app/purchase-orders": { label: "Purchase orders", titleKey: "page_purchase_orders", icon: ClipboardList, group: "Procurement" },
  "/app/customers": { label: "Customers", titleKey: "nav_customers", icon: Users, group: "Sales" },
  "/app/dispatch-orders": { label: "Dispatch orders", titleKey: "do_title", icon: Send, group: "Sales" },
  "/app/work-logs": { label: "Work logs", titleKey: "page_work_logs", icon: ClipboardCheck, group: "Manufacturing" },
  "/app/wip": { label: "Stage WIP", titleKey: "page_wip", icon: LayersIcon, group: "Manufacturing" },
  "/app/analytics": { label: "Analytics", titleKey: "page_analytics", icon: BarChart3, group: "Intelligence" },
  "/app/ai-insights": { label: "AI insights", titleKey: "page_ai_insights", icon: Sparkles, group: "Intelligence" },
  "/app/command-center": { label: "Command center", titleKey: "page_command_center", icon: Sparkles, group: "Intelligence" },
  "/app/admin": { label: "Admin", titleKey: "page_admin", icon: Settings, group: "Admin" },
  "/app/admin/system": { label: "System config", titleKey: "page_admin_system", icon: Settings, group: "Admin" },
  "/app/admin/presets": { label: "Presets", titleKey: "page_admin_presets", icon: Settings, group: "Admin" },
  "/app/admin/inventory-settings": { label: "Inventory settings", titleKey: "page_admin_inventory_settings", icon: Settings, group: "Admin" },
  "/app/admin/audit": { label: "Audit log", titleKey: "page_admin_audit", icon: Settings, group: "Admin" },
  "/app/admin/staffing": { label: "Staffing rules", titleKey: "page_admin_staffing", icon: Users, group: "Admin" },
  "/app/staffing/daily": { label: "Daily staffing", titleKey: "page_daily_staffing", icon: Users, group: "Operations" },
  "/app/vehicles": { label: "Vehicles", titleKey: "nav_vehicles", icon: Truck, group: "Operations" },
  "/app/rate-card": { label: "Rate card", titleKey: "nav_rate_card", icon: ClipboardList, group: "Admin" },
  "/app/workers/attendance": { label: "Attendance", titleKey: "attendance_title", icon: ClipboardCheck, group: "Operations" },
  "/app/help": { label: "Help", titleKey: "nav_help", icon: HelpCircle, group: "Support" },
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

export function getPageTitleKey(pathname: string): TranslationKey | undefined {
  return ROUTE_META[pathname]?.titleKey;
}

export function getBreadcrumbsWithKeys(
  pathname: string,
): { label: string; titleKey?: TranslationKey; href?: string }[] {
  const crumbs: { label: string; titleKey?: TranslationKey; href?: string }[] = [];
  let current: string | undefined = pathname;
  const seen = new Set<string>();
  while (current && ROUTE_META[current] && !seen.has(current)) {
    seen.add(current);
    const meta: RouteMeta = ROUTE_META[current];
    crumbs.unshift({ label: meta.label, titleKey: meta.titleKey, href: current });
    current = meta.parent;
  }
  if (crumbs.length === 0) return crumbs;
  crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], href: undefined };
  return crumbs;
}