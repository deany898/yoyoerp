/**
 * Typed registry of well-known feature flag keys.
 * Mirrors the seed in the price-history + app-config migration.
 * Use these constants from app code; admins can toggle from Settings.
 */
export const FLAGS = {
  // Modules
  modules: {
    suppliers: "modules.suppliers",
    purchaseOrders: "modules.purchase_orders",
    manufacturing: "modules.manufacturing",
    dispatch: "modules.dispatch",
    customers: "modules.customers",
    payroll: "modules.payroll",
    workLogs: "modules.work_logs",
    analytics: "modules.analytics",
    aiInsights: "modules.ai_insights",
    commandCenter: "modules.command_center",
    goodsReturns: "modules.goods_returns",
    machines: "modules.machines",
    moulds: "modules.moulds",
    stations: "modules.stations",
    stages: "modules.stages",
  },
  suppliers: {
    showLedger: "suppliers.show_ledger",
    showPayments: "suppliers.show_payments",
    showFinanceFields: "suppliers.show_finance_fields",
    showVendor360: "suppliers.show_vendor360",
    quoteHistory: "suppliers.quote_history",
  },
  products: {
    tierPricing: "products.tier_pricing",
    bom: "products.bom",
    costing: "products.costing",
    variants: "products.variants",
    packaging: "products.packaging",
    productionStages: "products.production_stages",
  },
  dispatch: {
    discount: "dispatch.discount",
    tax: "dispatch.tax",
    shipping: "dispatch.shipping",
    margin: "dispatch.margin",
  },
  manufacturing: {
    machines: "manufacturing.machines",
    moulds: "manufacturing.moulds",
    stageCosting: "manufacturing.stage_costing",
    materialIssues: "manufacturing.material_issues",
  },
  workforce: {
    payroll: "workforce.payroll",
    advances: "workforce.advances",
    attendance: "workforce.attendance",
  },
  customers: {
    showFinanceFields: "customers.show_finance_fields",
  },
  inventory: {
    trackStock: "inventory.track_stock",
  },
  nav: {
    showQuickOrder: "nav.show_quick_order",
    showCommandCenter: "nav.show_command_center",
  },
} as const;

/** Map of route path → flag key. Routes appear only when their flag is on. */
export const ROUTE_FLAGS: Record<string, string> = {
  "/app/suppliers": FLAGS.modules.suppliers,
  "/app/purchase-orders": FLAGS.modules.purchaseOrders,
  "/app/manufacturing": FLAGS.modules.manufacturing,
  "/app/dispatch-orders": FLAGS.modules.dispatch,
  "/app/customers": FLAGS.modules.customers,
  "/app/work-logs": FLAGS.modules.workLogs,
  "/app/analytics": FLAGS.modules.analytics,
  "/app/ai-insights": FLAGS.modules.aiInsights,
  "/app/command-center": FLAGS.modules.commandCenter,
  "/app/goods-returns": FLAGS.modules.goodsReturns,
  "/app/machines": FLAGS.modules.machines,
  "/app/moulds": FLAGS.modules.moulds,
  "/app/stations": FLAGS.modules.stations,
  "/app/stages": FLAGS.modules.stages,
  "/app/quick-order": FLAGS.nav.showQuickOrder,
  "/app/inventory": FLAGS.inventory.trackStock,
  "/app/movements": FLAGS.inventory.trackStock,
  "/app/requests": FLAGS.inventory.trackStock,
};