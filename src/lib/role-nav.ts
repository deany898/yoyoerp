import type { UserRoleType } from "./roles";

/**
 * Strict per-role navigation visibility.
 * Worker / dispatch / sales see only what they operate on.
 * Admin / manager see everything.
 */
const ROLE_ROUTES: Record<UserRoleType, string[]> = {
  admin: [
    "/app/dashboard",
    "/app/products",
    "/app/warehouses",
    "/app/inventory",
    "/app/movements",
    "/app/requests",
    "/app/suppliers",
    "/app/dispatch-orders",
    "/app/quick-order",
    "/app/customers",
    "/app/goods-returns",
    "/app/work-logs",
    "/app/stages",
    "/app/machines",
    "/app/moulds",
    "/app/workers",
    "/app/users",
    "/app/settings",
    "/app/help",
  ],
  manager: [
    "/app/dashboard",
    "/app/products",
    "/app/warehouses",
    "/app/inventory",
    "/app/movements",
    "/app/requests",
    "/app/suppliers",
    "/app/dispatch-orders",
    "/app/quick-order",
    "/app/customers",
    "/app/goods-returns",
    "/app/work-logs",
    "/app/stages",
    "/app/machines",
    "/app/moulds",
    "/app/workers",
    "/app/settings",
    "/app/help",
  ],
  supervisor: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/requests",
    "/app/dispatch-orders",
    "/app/work-logs",
    "/app/workers",
    "/app/help",
  ],
  worker: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/work-logs",
    "/app/help",
  ],
  dispatch: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/requests",
    "/app/dispatch-orders",
    "/app/quick-order",
    "/app/goods-returns",
    "/app/help",
  ],
  sales: [
    "/app/dashboard",
    "/app/products",
    "/app/inventory",
    "/app/dispatch-orders",
    "/app/quick-order",
    "/app/customers",
    "/app/goods-returns",
    "/app/help",
  ],
  customer: ["/app/quick-order", "/app/products", "/app/help"],
  requestor: ["/app/dashboard", "/app/requests", "/app/help"],
};

export function isRouteVisibleToRole(href: string, role: UserRoleType): boolean {
  const allowed = ROLE_ROUTES[role];
  if (!allowed) return false;
  // Exact match OR sub-route (e.g. /app/products/123 under /app/products).
  return allowed.some((base) => href === base || href.startsWith(base + "/"));
}

/** Top items shown in the mobile bottom nav (max 4 + More). */
const ROLE_BOTTOM_NAV: Record<UserRoleType, string[]> = {
  admin: ["/app/dashboard", "/app/work-logs", "/app/inventory", "/app/dispatch-orders"],
  manager: ["/app/dashboard", "/app/work-logs", "/app/dispatch-orders", "/app/inventory"],
  supervisor: ["/app/dashboard", "/app/work-logs", "/app/movements", "/app/inventory"],
  worker: ["/app/dashboard", "/app/work-logs", "/app/inventory"],
  dispatch: ["/app/dashboard", "/app/dispatch-orders", "/app/movements", "/app/inventory"],
  sales: ["/app/dashboard", "/app/dispatch-orders", "/app/customers", "/app/products"],
  customer: ["/app/quick-order", "/app/products", "/app/help"],
  requestor: ["/app/dashboard", "/app/requests", "/app/help"],
};

export function getBottomNavRoutes(role: UserRoleType): string[] {
  return ROLE_BOTTOM_NAV[role] ?? ROLE_BOTTOM_NAV.worker;
}