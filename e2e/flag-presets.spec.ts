import { test, expect } from "../playwright-fixture";
import {
  PRESET_TEMPLATES,
  applyPresetToFlags,
  getPreset,
} from "../src/lib/preset-templates";
import { ROUTE_FLAGS, FLAGS } from "../src/lib/feature-flags";

/**
 * Pure-logic tests for the dynamic ERP flag engine.
 * These run in the Playwright runner without a browser context so they
 * stay fast and deterministic — they validate the contract that the
 * Settings UI and runtime gating depend on.
 */

test.describe("Preset templates · contract", () => {
  test("every preset has a unique id, label, and at least one flag", () => {
    const ids = new Set<string>();
    for (const p of PRESET_TEMPLATES) {
      expect(ids.has(p.id), `duplicate preset id ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.label.length).toBeGreaterThan(0);
      expect(Object.keys(p.flags).length).toBeGreaterThan(0);
    }
  });

  test("preset flag values are strictly boolean", () => {
    for (const p of PRESET_TEMPLATES) {
      for (const [k, v] of Object.entries(p.flags)) {
        expect(typeof v, `${p.id} · ${k}`).toBe("boolean");
      }
    }
  });

  test("preset flag keys reference well-known flag namespaces", () => {
    const validPrefixes = [
      "modules.", "suppliers.", "products.", "dispatch.",
      "manufacturing.", "workforce.", "customers.", "nav.",
    ];
    for (const p of PRESET_TEMPLATES) {
      for (const key of Object.keys(p.flags)) {
        const ok = validPrefixes.some((pre) => key.startsWith(pre));
        expect(ok, `${p.id} · unknown flag namespace: ${key}`).toBe(true);
      }
    }
  });

  test("applyPresetToFlags overrides only listed keys", () => {
    const baseline: Record<string, boolean> = {
      "modules.suppliers": true,
      "modules.dispatch": true,
      "products.bom": true,
      "untouched.flag": true,
    };
    const lite = getPreset("lite")!;
    const next = applyPresetToFlags(baseline, lite);
    expect(next["untouched.flag"]).toBe(true);
    expect(next["products.bom"]).toBe(false); // lite turns this off
    expect(next["modules.suppliers"]).toBe(true);
  });
});

test.describe("Preset semantics · business profiles", () => {
  test("Lite wholesale disables manufacturing & payroll", () => {
    const f = getPreset("lite")!.flags;
    expect(f["modules.manufacturing"]).toBe(false);
    expect(f["modules.payroll"]).toBe(false);
    expect(f["workforce.payroll"]).toBe(false);
    expect(f["products.bom"]).toBe(false);
  });

  test("Procurement only keeps suppliers + POs and hides dispatch", () => {
    const f = getPreset("procurement")!.flags;
    expect(f["modules.suppliers"]).toBe(true);
    expect(f["modules.purchase_orders"]).toBe(true);
    expect(f["suppliers.quote_history"]).toBe(true);
    expect(f["modules.dispatch"]).toBe(false);
    expect(f["modules.manufacturing"]).toBe(false);
  });

  test("Sales + Dispatch keeps customers/dispatch and hides manufacturing", () => {
    const f = getPreset("sales_dispatch")!.flags;
    expect(f["modules.customers"]).toBe(true);
    expect(f["modules.dispatch"]).toBe(true);
    expect(f["modules.manufacturing"]).toBe(false);
    expect(f["modules.payroll"]).toBe(false);
  });

  test("Full industrial enables every major module + finance", () => {
    const f = getPreset("full")!.flags;
    expect(f["modules.manufacturing"]).toBe(true);
    expect(f["modules.payroll"]).toBe(true);
    expect(f["suppliers.show_ledger"]).toBe(true);
    expect(f["customers.show_finance_fields"]).toBe(true);
    expect(f["workforce.advances"]).toBe(true);
  });

  test("Admin minimal collapses everything except suppliers", () => {
    const f = getPreset("admin_minimal")!.flags;
    expect(f["modules.suppliers"]).toBe(true);
    const offCount = Object.values(f).filter((v) => v === false).length;
    expect(offCount).toBeGreaterThan(10);
  });
});

test.describe("Route flag mapping", () => {
  test("every gated route uses a known flag key", () => {
    const knownKeys = new Set<string>([
      ...Object.values(FLAGS.modules),
      ...Object.values(FLAGS.suppliers),
      ...Object.values(FLAGS.products),
      ...Object.values(FLAGS.dispatch),
      ...Object.values(FLAGS.manufacturing),
      ...Object.values(FLAGS.workforce),
      ...Object.values(FLAGS.customers),
      ...Object.values(FLAGS.nav),
    ]);
    for (const [path, flag] of Object.entries(ROUTE_FLAGS)) {
      expect(knownKeys.has(flag), `${path} → ${flag} not in registry`).toBe(true);
    }
  });

  test("module routes are mapped to module-namespaced flags", () => {
    const moduleRoutes = [
      "/app/suppliers", "/app/purchase-orders", "/app/manufacturing",
      "/app/dispatch-orders", "/app/customers", "/app/work-logs",
      "/app/analytics", "/app/ai-insights",
    ];
    for (const path of moduleRoutes) {
      expect(ROUTE_FLAGS[path], `missing route flag for ${path}`).toBeTruthy();
    }
  });
});