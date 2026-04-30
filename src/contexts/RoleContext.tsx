import { createContext, useMemo, useState, type ReactNode } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/hooks/useAuth";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
  /** Demo-only: override the current role */
  setDemoRole: (role: UserRoleType) => void;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useDemo();
  const { roles: authRoles } = useAuth();
  const [demoRole, setDemoRole] = useState<UserRoleType>("admin");

  // Real-auth: pick the highest privilege role the user holds (admin > manager > requestor)
  const realRole: UserRoleType = authRoles.includes("admin")
    ? "admin"
    : authRoles.includes("manager")
      ? "manager"
      : "requestor";

  const role: UserRoleType = isDemo ? demoRole : realRole;

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isRequestor: role === "requestor",
      setDemoRole,
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
