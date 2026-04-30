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
    "/app/purchase-orders",
    "/app/dispatch-orders",
    "/app/customers",
    "/app/analytics",
    "/app/ai-insights",
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
    "/app/purchase-orders",
    "/app/dispatch-orders",
    "/app/customers",
    "/app/analytics",
    "/app/ai-insights",
    "/app/help",
  ],
  supervisor: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/requests",
    "/app/dispatch-orders",
    "/app/analytics",
    "/app/help",
  ],
  worker: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/help",
  ],
  dispatch: [
    "/app/dashboard",
    "/app/inventory",
    "/app/movements",
    "/app/requests",
    "/app/dispatch-orders",
    "/app/help",
  ],
  sales: [
    "/app/dashboard",
    "/app/products",
    "/app/inventory",
    "/app/dispatch-orders",
    "/app/customers",
    "/app/analytics",
    "/app/help",
  ],
  customer: ["/app/dashboard", "/app/help"],
  requestor: ["/app/dashboard", "/app/requests", "/app/help"],
};

export function isRouteVisibleToRole(href: string, role: UserRoleType): boolean {
  return ROLE_ROUTES[role]?.includes(href) ?? false;
}

/** Top items shown in the mobile bottom nav (max 4 + More). */
const ROLE_BOTTOM_NAV: Record<UserRoleType, string[]> = {
  admin: ["/app/dashboard", "/app/inventory", "/app/products", "/app/movements"],
  manager: ["/app/dashboard", "/app/inventory", "/app/dispatch-orders", "/app/purchase-orders"],
  supervisor: ["/app/dashboard", "/app/inventory", "/app/movements", "/app/requests"],
  worker: ["/app/dashboard", "/app/inventory", "/app/movements"],
  dispatch: ["/app/dashboard", "/app/dispatch-orders", "/app/movements", "/app/inventory"],
  sales: ["/app/dashboard", "/app/dispatch-orders", "/app/customers", "/app/products"],
  customer: ["/app/dashboard", "/app/help"],
  requestor: ["/app/dashboard", "/app/requests", "/app/help"],
};

export function getBottomNavRoutes(role: UserRoleType): string[] {
  return ROLE_BOTTOM_NAV[role] ?? ROLE_BOTTOM_NAV.worker;
}