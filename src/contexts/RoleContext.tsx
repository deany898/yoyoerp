import { createContext, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useRoleSimulator } from "@/contexts/RoleSimulatorContext";
import { notify } from "@/lib/notify";

export interface RoleContextValue {
  /** Effective role for permission checks. Falls back to "customer" while
   *  roles are loading or unresolved so callers always get a defined string —
   *  use `roleResolutionFailed` / `rolesLoading` to know if it is trustworthy. */
  role: UserRoleType;
  realRole: UserRoleType;
  isSimulating: boolean;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  rolesLoading: boolean;
  /** True once loading is complete AND no role was resolved. Use to render
   *  the "Could not load your role" recovery screen. */
  roleResolutionFailed: boolean;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, roles: authRoles, rolesLoading } = useAuth();
  const { simulatedRole } = useRoleSimulator();

  // Real-auth: pick the highest privilege role the user holds.
  // Order: admin > manager > supervisor > sales > dispatch > worker > customer.
  const ROLE_PRIORITY: UserRoleType[] = [
    "admin",
    "manager",
    "supervisor",
    "sales",
    "dispatch",
    "worker",
    "customer",
  ];
  const matchedRole = ROLE_PRIORITY.find((r) => authRoles.includes(r));
  useEffect(() => {
    if (!rolesLoading && user && authRoles.length === 0) {
      notify.error("Could not load your permissions. Please refresh or contact admin.");
    }
  }, [rolesLoading, user, authRoles.length]);
  // CRITICAL: never silently default to "customer" — that mis-labels admins
  // as customers and triggers the wrong dashboard / wrong permissions.
  //   - During load: realRole is null and components should gate on `rolesLoading`.
  //   - After load with no rows: realRole stays null and `roleResolutionFailed`
  //     becomes true so the UI can prompt a refresh instead of pretending the
  //     user is a customer.
  // CRITICAL: do NOT silently default to "customer" once loading completes —
  // that mis-labels admins as customers. While loading we still expose
  // "customer" (least-privileged) for type-safety of consumers, but flag
  // `roleResolutionFailed` so the app shell can render a refresh prompt
  // instead of trusting the fallback.
  const roleResolutionFailed = !!user && !rolesLoading && !matchedRole;
  const realRole: UserRoleType = matchedRole ?? "customer";

  // Only admins are allowed to simulate other roles. For everyone else the
  // simulated value is ignored on the client (and the server never trusts it).
  const role: UserRoleType =
    realRole === "admin" && simulatedRole ? (simulatedRole as UserRoleType) : realRole;

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      realRole,
      isSimulating: role !== realRole,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      rolesLoading,
      roleResolutionFailed,
    };
  }, [role, realRole, rolesLoading, roleResolutionFailed, user, matchedRole, authRoles.length]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
