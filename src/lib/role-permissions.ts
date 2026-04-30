import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_ORDER: AppRole[] = [
  "admin",
  "manager",
  "supervisor",
  "sales",
  "dispatch",
  "worker",
  "customer",
];

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  manager: "Manager",
  supervisor: "Supervisor",
  sales: "Sales",
  dispatch: "Dispatch",
  worker: "Worker",
  customer: "Customer",
  requestor: "Requestor",
};

export interface PermissionRow {
  capability: string;
  roles: Record<AppRole, boolean>;
}

const f = (admin = false, manager = false, supervisor = false, sales = false, dispatch = false, worker = false, customer = false): Record<AppRole, boolean> => ({
  admin, manager, supervisor, sales, dispatch, worker, customer, requestor: false,
});

export const ROLE_PERMISSION_MATRIX: PermissionRow[] = [
  { capability: "View dashboard",        roles: f(true, true, true, true, true, true, true) },
  { capability: "Manage products & BOM", roles: f(true, true) },
  { capability: "Manage warehouses",     roles: f(true, true) },
  { capability: "View inventory",        roles: f(true, true, true, true, true, true) },
  { capability: "Log stock movements",   roles: f(true, true, true, true, true, true) },
  { capability: "Approve requests",      roles: f(true, true, true) },
  { capability: "Manage suppliers & PO", roles: f(true, true) },
  { capability: "Manage customers & DO", roles: f(true, true, false, true, true) },
  { capability: "View analytics",        roles: f(true, true, true, true) },
  { capability: "Manage users & roles",  roles: f(true) },
];