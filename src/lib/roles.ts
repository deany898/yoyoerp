export type UserRoleType =
  | "admin"
  | "manager"
  | "supervisor"
  | "sales"
  | "dispatch"
  | "worker"
  | "customer";

export interface RolePermissions {
  canManageItems: boolean;
  canLogMovements: boolean;
  canManagePOs: boolean;
  canManageSuppliers: boolean;
  canApproveRequests: boolean;
  canViewAnalytics: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
}

const ROLE_PERMISSIONS: Record<UserRoleType, RolePermissions> = {
  admin: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: true,
  },
  manager: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: false,
    canManageUsers: false,
  },
  supervisor: {
    canManageItems: false,
    canLogMovements: true,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: true,
    canViewAnalytics: true,
    canAccessSettings: false,
    canManageUsers: false,
  },
  sales: {
    canManageItems: false,
    canLogMovements: false,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: true,
    canAccessSettings: false,
    canManageUsers: false,
  },
  dispatch: {
    canManageItems: false,
    canLogMovements: true,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
  },
  worker: {
    canManageItems: false,
    canLogMovements: true,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
  },
  customer: {
    canManageItems: false,
    canLogMovements: false,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
  },
};

export function getPermissionsForRole(role: UserRoleType): RolePermissions {
  return ROLE_PERMISSIONS[role];
}
