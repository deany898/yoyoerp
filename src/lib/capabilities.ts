/**
 * Capability identifiers for the Yoyo permissions system.
 * Format: `<module>.<verb>` (e.g. `products.view`).
 * Mirrors the seed data in the 20260501 permissions migration.
 */

export const MODULES = [
  "products",
  "customers",
  "suppliers",
  "inventory",
  "movements",
  "manufacturing",
  "dispatch",
  "returns",
  "purchase_orders",
  "payroll",
  "work_logs",
  "analytics",
  "settings",
  "users",
] as const;

export type Module = (typeof MODULES)[number];

export const VERBS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "import",
  "bulk_edit",
] as const;

export type Verb = (typeof VERBS)[number];

export const FINANCIAL_CAPS = [
  "financial.view_costs",
  "financial.view_margins",
  "financial.view_pricing",
  "financial.view_payroll",
] as const;

export type Capability = `${Module}.${Verb}` | (typeof FINANCIAL_CAPS)[number];

export const ALL_CAPABILITIES: Capability[] = [
  ...MODULES.flatMap((m) => VERBS.map((v) => `${m}.${v}` as Capability)),
  ...FINANCIAL_CAPS,
];

export const MODULE_LABEL: Record<Module, string> = {
  products: "Products",
  customers: "Customers",
  suppliers: "Suppliers",
  inventory: "Inventory",
  movements: "Stock movements",
  manufacturing: "Manufacturing",
  dispatch: "Dispatch",
  returns: "Returns",
  purchase_orders: "Purchase orders",
  payroll: "Payroll",
  work_logs: "Work logs",
  analytics: "Analytics",
  settings: "Settings",
  users: "Users",
};

export const VERB_LABEL: Record<Verb, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  import: "Import",
  bulk_edit: "Bulk edit",
};