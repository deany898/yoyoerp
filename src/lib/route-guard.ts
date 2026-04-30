import type { UserRoleType } from "@/lib/roles";
import { isRouteVisibleToRole } from "@/lib/role-nav";

/**
 * Returns true if the given role can access the path.
 * Single source of truth · delegates to role-nav.ts so the sidebar,
 * bottom nav, and deep-link guard never drift apart.
 * Unknown paths default to admin-only.
 */
export function canAccessRoute(path: string, role: UserRoleType): boolean {
  if (role === "admin") return true;
  return isRouteVisibleToRole(path, role);
}
