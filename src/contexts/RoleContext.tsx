import { createContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useRoleSimulator } from "@/contexts/RoleSimulatorContext";

export interface RoleContextValue {
  role: UserRoleType;
  realRole: UserRoleType;
  isSimulating: boolean;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { roles: authRoles } = useAuth();
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
  const realRole: UserRoleType =
    ROLE_PRIORITY.find((r) => authRoles.includes(r)) ?? "worker";

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
    };
  }, [role, realRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
