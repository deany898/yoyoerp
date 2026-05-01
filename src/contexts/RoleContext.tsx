import { createContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { roles: authRoles } = useAuth();

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
  const role: UserRoleType =
    ROLE_PRIORITY.find((r) => authRoles.includes(r)) ?? "worker";

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isRequestor: role === "requestor",
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
