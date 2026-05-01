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
    "/app/manufacturing",
    "/app/work-logs",
    "/app/stations",
    "/app/stages",
    "/app/machines",
    "/app/moulds",
    "/app/workers",
    "/app/command-center",
    "/app/analytics",
    "/app/ai-insights",
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
    "/app/manufacturing",
    "/app/work-logs",
    "/app/stations",
    "/app/stages",
    "/app/machines",
    "/app/moulds",
    "/app/workers",
    "/app/command-center",
    "/app/analytics",
    "/app/ai-insights",
    "/app/settings",
    "/app/help",
  ],
  supervisor: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/requests",
    "/app/dispatch-orders",
    "/app/manufacturing",
    "/app/work-logs",
    "/app/workers",
    "/app/command-center",
    "/app/analytics",
    "/app/help",
  ],
  worker: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/manufacturing",
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
    "/app/command-center",
    "/app/analytics",
    "/app/help",
  ],
  customer: ["/app/dashboard", "/app/help"],
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
  admin: ["/app/dashboard", "/app/work-logs", "/app/inventory", "/app/manufacturing"],
  manager: ["/app/dashboard", "/app/work-logs", "/app/dispatch-orders", "/app/manufacturing"],
  supervisor: ["/app/dashboard", "/app/work-logs", "/app/manufacturing", "/app/movements"],
  worker: ["/app/dashboard", "/app/work-logs", "/app/manufacturing"],
  dispatch: ["/app/dashboard", "/app/dispatch-orders", "/app/movements", "/app/inventory"],
  sales: ["/app/dashboard", "/app/dispatch-orders", "/app/customers", "/app/products"],
  customer: ["/app/dashboard", "/app/help"],
  requestor: ["/app/dashboard", "/app/requests", "/app/help"],
};

export function getBottomNavRoutes(role: UserRoleType): string[] {
  return ROLE_BOTTOM_NAV[role] ?? ROLE_BOTTOM_NAV.worker;
}