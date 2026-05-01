import type { UserRoleType } from "@/lib/roles";

/**
 * Role-based flag constraints.
 * Defines which roles may toggle which flag categories, and which
 * individual flag keys are admin-only regardless of category.
 */
export const CATEGORY_ROLES: Record<string, UserRoleType[]> = {
  modules: ["admin"],
  suppliers: ["admin", "manager"],
  products: ["admin", "manager"],
  dispatch: ["admin", "manager"],
  manufacturing: ["admin", "manager"],
  workforce: ["admin"],
  customers: ["admin", "manager"],
  navigation: ["admin", "manager"],
  general: ["admin"],
};

/** Flag keys that are always admin-only, even if the category is broader. */
export const ADMIN_ONLY_FLAGS = new Set<string>([
  "modules.payroll",
  "modules.ai_insights",
  "modules.command_center",
  "suppliers.show_finance_fields",
  "customers.show_finance_fields",
  "workforce.payroll",
  "workforce.advances",
]);

/** Presets are destructive · only admin + manager may apply. */
export const PRESET_ROLES: UserRoleType[] = ["admin", "manager"];

export function canToggleFlag(
  role: UserRoleType,
  category: string,
  key: string,
): boolean {
  if (ADMIN_ONLY_FLAGS.has(key)) return role === "admin";
  const allowed = CATEGORY_ROLES[category] ?? ["admin"];
  return allowed.includes(role);
}

export function canApplyPresets(role: UserRoleType): boolean {
  return PRESET_ROLES.includes(role);
}
