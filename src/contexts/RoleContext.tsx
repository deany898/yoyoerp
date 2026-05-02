import { createContext, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useRoleSimulator } from "@/contexts/RoleSimulatorContext";
import { notify } from "@/lib/notify";

export interface RoleContextValue {
  role: UserRoleType;
  realRole: UserRoleType;
  isSimulating: boolean;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
  /** True while the user_roles query is in flight. Components should render
   *  a skeleton instead of role-conditional UI when this is true. */
  rolesLoading: boolean;
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
  // While roles are loading OR no user is signed in, fall back to the LEAST-
  // privileged real role ("customer") so we never silently grant write access.
  // Components gate role-dependent UI with `rolesLoading` instead of relying
  // on the fallback. We never default to "worker" because it has stock-write
  // permissions and would silently elevate unassigned users.
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
      isRequestor: role === "requestor",
      rolesLoading: rolesLoading || (!!user && !matchedRole && authRoles.length === 0),
    };
  }, [role, realRole, rolesLoading, user, matchedRole, authRoles.length]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
