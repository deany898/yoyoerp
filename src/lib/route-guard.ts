import type { UserRoleType } from "@/lib/roles";

const ALL_STAFF: UserRoleType[] = [
  "admin", "manager", "supervisor", "sales", "dispatch", "worker", "requestor",
];
const OPS: UserRoleType[] = ["admin", "manager", "supervisor", "worker", "dispatch"];
const COMMERCIAL: UserRoleType[] = ["admin", "manager", "sales"];

/** Maps route paths to the roles allowed */
const ROUTE_ACCESS: Record<string, UserRoleType[]> = {
  "/app/dashboard": ALL_STAFF,
  // ERP master data
  "/app/products": ALL_STAFF,
  "/app/warehouses": ALL_STAFF,
  // Legacy modules
  "/app/catalog": ALL_STAFF,
  "/app/requests": ALL_STAFF,
  "/app/locations": ALL_STAFF,
  "/app/movements": OPS,
  "/app/suppliers": COMMERCIAL,
  "/app/purchase-orders": COMMERCIAL,
  "/app/analytics": ["admin", "manager", "sales"],
  "/app/ai-insights": ["admin", "manager"],
  "/app/help": ALL_STAFF,
  "/app/settings": ["admin"],
};

/**
 * Returns true if the given role can access the path.
 * Unknown paths default to admin-only.
 */
export function canAccessRoute(path: string, role: UserRoleType): boolean {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return role === "admin";
  return allowed.includes(role);
}
