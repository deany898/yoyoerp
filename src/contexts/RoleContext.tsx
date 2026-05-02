import { createContext, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useRoleSimulator } from "@/contexts/RoleSimulatorContext";
import { notify } from "@/lib/notify";

export interface RoleContextValue {
  /** Resolved role. `null` only when roles finished loading and the user has
   *  no recognised role row — UI should show an error / refresh state. */
  role: UserRoleType | null;
  realRole: UserRoleType | null;
  isSimulating: boolean;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
  /** True while the user_roles query is in flight. Components should render
   *  a skeleton instead of role-conditional UI when this is true. */
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
  // Order: admin > manager > supervisor > sales > dispatch > worker > customer > requestor (legacy).
  const ROLE_PRIORITY: UserRoleType[] = [
    "admin",
    "manager",
    "supervisor",
    "sales",
    "dispatch",
    "worker",
    "customer",
    "requestor",
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
  const realRole: UserRoleType | null = matchedRole ?? null;
  const roleResolutionFailed = !!user && !rolesLoading && !matchedRole;

  // Only admins are allowed to simulate other roles. For everyone else the
  // simulated value is ignored on the client (and the server never trusts it).
  const role: UserRoleType | null =
    realRole === "admin" && simulatedRole ? (simulatedRole as UserRoleType) : realRole;

  const value = useMemo<RoleContextValue>(() => {
    // While role is unresolved, hand out the most restrictive permission set
    // ("customer") so no privileged action is accidentally allowed; the UI
    // gates the actual screens on `rolesLoading` / `roleResolutionFailed`.
    const permissions = getPermissionsForRole(role ?? "customer");
    return {
      role,
      realRole,
      isSimulating: role !== realRole,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isRequestor: role === "requestor",
      rolesLoading,
      roleResolutionFailed,
    };
  }, [role, realRole, rolesLoading, roleResolutionFailed, user, matchedRole, authRoles.length]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
