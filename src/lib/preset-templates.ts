/**
 * Module preset templates · centralized so both the Settings UI and
 * automated tests share one source of truth.
 *
 * Each preset is a partial flag map · keys not listed are left untouched.
 */
export type PresetId =
  | "lite"
  | "standard"
  | "full"
  | "procurement"
  | "sales_dispatch"
  | "admin_minimal";

export interface PresetTemplate {
  id: PresetId;
  label: string;
  tagline: string;
  description: string;
  iconKey: "layers" | "sparkles" | "factory" | "truck" | "clipboard" | "shield";
  flags: Record<string, boolean>;
}

const off = (...keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, false]));
const on = (...keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, true]));

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "lite",
    label: "Lite wholesale",
    tagline: "Inventory · Suppliers · Dispatch",
    description:
      "Core inventory, suppliers, dispatch. No manufacturing, payroll, or finance fields.",
    iconKey: "layers",
    flags: {
      ...off(
        "modules.manufacturing", "modules.work_logs", "modules.payroll",
        "modules.machines", "modules.moulds", "modules.stations", "modules.stages",
        "modules.command_center", "modules.ai_insights",
        "suppliers.show_ledger", "suppliers.show_payments", "suppliers.show_finance_fields",
        "suppliers.show_vendor360",
        "products.bom", "products.production_stages",
        "workforce.payroll", "workforce.advances", "workforce.attendance",
        "customers.show_finance_fields",
      ),
      ...on(
        "modules.suppliers", "modules.dispatch", "modules.customers",
        "suppliers.quote_history", "products.tier_pricing",
        "dispatch.discount", "dispatch.tax", "dispatch.shipping",
      ),
    },
  },
  {
    id: "standard",
    label: "Standard ERP",
    tagline: "Manufacturing essentials · no finance depth",
    description:
      "Inventory + suppliers + manufacturing essentials. Quote history on, finance fields off.",
    iconKey: "sparkles",
    flags: {
      ...on(
        "modules.suppliers", "modules.dispatch", "modules.customers",
        "modules.manufacturing", "modules.work_logs", "modules.payroll",
        "modules.machines", "modules.moulds", "modules.command_center",
        "suppliers.show_vendor360", "suppliers.quote_history",
        "products.bom", "products.production_stages", "products.tier_pricing",
        "manufacturing.machines", "manufacturing.moulds", "manufacturing.stage_costing",
        "workforce.payroll", "workforce.attendance",
      ),
      ...off(
        "suppliers.show_ledger", "suppliers.show_payments", "suppliers.show_finance_fields",
        "workforce.advances", "customers.show_finance_fields",
      ),
    },
  },
  {
    id: "full",
    label: "Full industrial",
    tagline: "Everything on · finance · payroll · BOM",
    description:
      "All modules · finance, ledger, payments, advances, full manufacturing depth.",
    iconKey: "factory",
    flags: on(
      "modules.suppliers", "modules.dispatch", "modules.customers",
      "modules.manufacturing", "modules.work_logs", "modules.payroll",
      "modules.machines", "modules.moulds", "modules.command_center", "modules.ai_insights",
      "modules.goods_returns", "modules.stations", "modules.stages",
      "suppliers.show_ledger", "suppliers.show_payments", "suppliers.show_finance_fields",
      "suppliers.show_vendor360", "suppliers.quote_history",
      "products.bom", "products.production_stages", "products.tier_pricing",
      "products.packaging", "products.variants", "products.costing",
      "manufacturing.machines", "manufacturing.moulds", "manufacturing.stage_costing",
      "manufacturing.material_issues",
      "workforce.payroll", "workforce.attendance", "workforce.advances",
      "customers.show_finance_fields",
      "dispatch.discount", "dispatch.tax", "dispatch.shipping", "dispatch.margin",
    ),
  },
  {
    id: "procurement",
    label: "Procurement only",
    tagline: "Supplier price intelligence",
    description:
      "Suppliers + purchase orders + price history. Sales, manufacturing, and payroll hidden.",
    iconKey: "clipboard",
    flags: {
      ...on(
        "modules.suppliers", "modules.purchase_orders",
        "suppliers.quote_history", "suppliers.show_vendor360",
        "suppliers.show_finance_fields",
        "products.costing", "products.tier_pricing",
      ),
      ...off(
        "modules.dispatch", "modules.customers",
        "modules.manufacturing", "modules.work_logs", "modules.payroll",
        "modules.machines", "modules.moulds", "modules.stations", "modules.stages",
        "modules.goods_returns", "modules.ai_insights", "modules.command_center",
        "workforce.payroll", "workforce.advances", "workforce.attendance",
      ),
    },
  },
  {
    id: "sales_dispatch",
    label: "Sales + Dispatch",
    tagline: "Order taking and fulfilment",
    description:
      "Customers, dispatch orders, and inventory. Procurement and manufacturing collapsed.",
    iconKey: "truck",
    flags: {
      ...on(
        "modules.customers", "modules.dispatch", "modules.suppliers",
        "products.tier_pricing", "products.variants",
        "dispatch.discount", "dispatch.tax", "dispatch.shipping",
        "nav.show_quick_order",
      ),
      ...off(
        "modules.manufacturing", "modules.work_logs", "modules.payroll",
        "modules.machines", "modules.moulds", "modules.stations", "modules.stages",
        "modules.goods_returns", "modules.purchase_orders",
        "suppliers.show_ledger", "suppliers.show_payments",
        "products.bom", "products.production_stages",
        "workforce.payroll", "workforce.advances", "workforce.attendance",
      ),
    },
  },
  {
    id: "admin_minimal",
    label: "Admin minimal",
    tagline: "Bare bones · build up from here",
    description:
      "Only inventory and suppliers stay on. Use as a clean slate before enabling features.",
    iconKey: "shield",
    flags: {
      ...on("modules.suppliers"),
      ...off(
        "modules.dispatch", "modules.customers",
        "modules.manufacturing", "modules.work_logs", "modules.payroll",
        "modules.purchase_orders", "modules.machines", "modules.moulds",
        "modules.stations", "modules.stages", "modules.goods_returns",
        "modules.ai_insights", "modules.command_center",
        "suppliers.show_ledger", "suppliers.show_payments", "suppliers.show_finance_fields",
        "products.bom", "products.production_stages", "products.packaging",
        "products.variants", "products.costing",
        "workforce.payroll", "workforce.advances", "workforce.attendance",
        "customers.show_finance_fields",
        "dispatch.discount", "dispatch.tax", "dispatch.shipping", "dispatch.margin",
        "nav.show_quick_order",
      ),
    },
  },
];

export function getPreset(id: PresetId): PresetTemplate | undefined {
  return PRESET_TEMPLATES.find((p) => p.id === id);
}

/** Pure helper · simulate applying a preset over a current flag map. */
export function applyPresetToFlags(
  current: Record<string, boolean>,
  preset: PresetTemplate,
): Record<string, boolean> {
  return { ...current, ...preset.flags };
}